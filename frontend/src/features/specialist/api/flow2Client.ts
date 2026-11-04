/**
 * Flow 2 HTTP client — Transport Specialist (Legal, Medical, Quarantine & Insurance).
 * Validates path params, query params, request body and response envelope
 * against contracts/flow2.openapi.json using Ajv.
 *
 * Prevents concurrent duplicate mutations with an in-flight request lock.
 */
import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow2.openapi.json';
import { apiClient } from '../../../shared/api/apiClient';

type Schema = Record<string, unknown>;
type Content = Record<string, { schema: Schema }>;
type Operation = {
  operationId: string;
  parameters?: Array<{ name: string; in: 'path' | 'query' | 'header'; required?: boolean; schema: Schema }>;
  requestBody?: { content: Content };
  responses: Record<string, { content?: Content }>;
};

export type Options = {
  path?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
};

export class Flow2ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;
  readonly blockers?: Array<{ code: string; field: string; message: string }>;

  constructor(
    message: string,
    errorCode: string,
    status?: number,
    blockers?: Array<{ code: string; field: string; message: string }>
  ) {
    super(message);
    this.name = 'Flow2ApiError';
    this.errorCode = errorCode;
    this.status = status;
    this.blockers = blockers;
  }
}

const root = 'flow2.schema.json';
const ajv = new Ajv({ allErrors: true, logger: false, unknownFormats: 'ignore' });
ajv.addSchema({ $id: root, components: specification.components }, root);

const entries = Object.entries(specification.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({ path, method, op: op as unknown as Operation })),
);

const validators = new Map<string, ReturnType<typeof ajv.compile>>();

function absoluteRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(absoluteRefs);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === '$ref' && typeof child === 'string' && child.startsWith('#/')
          ? root + child
          : absoluteRefs(child),
      ]),
    );
  }
  return value;
}

function validate(schema: Schema, data: unknown) {
  const key = JSON.stringify(schema);
  let validator = validators.get(key);
  if (!validator) {
    validator = ajv.compile(absoluteRefs(schema) as Schema);
    validators.set(key, validator);
  }
  if (!validator(data)) {
    throw new Flow2ApiError(
      `Dữ liệu không khớp contract Flow 2: ${ajv.errorsText(validator.errors)}`,
      'CONTRACT_VALIDATION_ERROR',
    );
  }
}

async function serverError(data: unknown, status: number): Promise<never> {
  let value = data;
  if (data instanceof Blob) {
    try {
      value = JSON.parse(await data.text());
    } catch {
      throw new Flow2ApiError('Máy chủ trả lỗi không đúng contract Flow 2.', 'INVALID_ERROR_RESPONSE', status);
    }
  }

  // Validate error envelope against schema if available
  try {
    validate({ $ref: '#/components/schemas/Error' }, value);
  } catch {
    // Fall back to general error if envelope validation fails
  }

  const error = value as { message?: string; errorCode?: string; blockers?: Array<{ code: string; field: string; message: string }> };
  throw new Flow2ApiError(
    error.message || 'Lỗi xử lý yêu cầu Flow 2 trên máy chủ.',
    error.errorCode || 'SERVER_ERROR',
    status,
    error.blockers,
  );
}

// In-flight mutation lock
const pending = new Set<string>();

export async function flow2Request<T>(operationId: string, options: Options = {}): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow2ApiError('Endpoint chưa có trong contract Flow 2.', 'UNKNOWN_OPERATION');

  const { op, method } = entry;
  const opParams = op.parameters || [];

  // 1. Resolve & validate path parameters
  const pathParameters = opParams.filter(p => p.in === 'path');
  const pathOpts = options.path || {};
  for (const name of Object.keys(pathOpts)) {
    if (!pathParameters.some(p => p.name === name)) {
      throw new Flow2ApiError(`Tham số đường dẫn thừa: ${name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
  }

  let url = entry.path;
  for (const parameter of pathParameters) {
    const value = pathOpts[parameter.name];
    if (value === undefined) {
      throw new Flow2ApiError(`Thiếu tham số đường dẫn: ${parameter.name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
    validate(parameter.schema, value);
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(value));
  }

  // 2. Validate query parameters
  const queryParameters = opParams.filter(p => p.in === 'query');
  const params: Record<string, string | number | boolean> = {};
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        const paramDef = queryParameters.find(p => p.name === key);
        if (!paramDef) {
          throw new Flow2ApiError(`Query param không hợp lệ: ${key}.`, 'CONTRACT_VALIDATION_ERROR');
        }
        validate(paramDef.schema, value);
        params[key] = value;
      }
    }
  }

  // 3. Headers
  const headers: Record<string, string | undefined> = { Accept: 'application/json' };
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  // 4. Request Body
  const data = options.body;
  const bodySchema = op.requestBody?.content?.['application/json']?.schema;
  if (bodySchema) {
    validate(bodySchema, data);
  } else if (data !== undefined && method.toLowerCase() === 'get') {
    throw new Flow2ApiError('GET endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
  }

  // 5. Concurrency lock for mutations
  const lock = method.toLowerCase() === 'get' ? null : `${method.toUpperCase()}:${url}`;
  if (lock && pending.has(lock)) {
    throw new Flow2ApiError('Thao tác đang được xử lý, vui lòng chờ.', 'REQUEST_IN_PROGRESS');
  }
  if (lock) pending.add(lock);

  try {
    const result = await apiClient.request<unknown>({
      method: method.toUpperCase(),
      url,
      params: Object.keys(params).length ? params : undefined,
      data,
      headers,
    });

    if (result.status >= 400) return await serverError(result.data, result.status);

    const expectedResponse = op.responses[String(result.status)];
    if (!expectedResponse) {
      throw new Flow2ApiError('HTTP status không khớp contract Flow 2.', 'INVALID_RESPONSE_STATUS', result.status);
    }

    const envelope = result.data as { success?: boolean; message?: string; data?: unknown } | null;
    if (envelope?.success === false) {
      return await serverError(envelope, result.status);
    }

    const jsonSchema = expectedResponse.content?.['application/json']?.schema;
    if (jsonSchema) {
      validate(jsonSchema, result.data);
    }

    return (result.data as { data: T }).data;
  } catch (error) {
    if (error instanceof Flow2ApiError) throw error;
    if (isAxiosError(error) && error.response) {
      return await serverError(error.response.data, error.response.status);
    }
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}
