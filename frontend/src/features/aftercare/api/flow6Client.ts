/**
 * Flow 6 HTTP client — mirrors flow4Client and canonical OpenAPI contract.
 * Validates path params, query params, request body and response envelope
 * against the OpenAPI contract.
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * Refetch on STALE_VERSION before retrying mutations.
 */
import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow6.openapi.json';
import { apiClient } from '../../../shared/api/apiClient';
import type { Flow6OperationId } from './flow6Endpoints';

type Schema = Record<string, unknown>;
type Content = Record<string, { schema: Schema }>;
type Operation = {
  operationId: string;
  parameters?: Array<{ name: string; in: 'path' | 'query' | 'header'; required?: boolean; schema?: Schema }>;
  requestBody?: { content: Content };
  responses: Record<string, { content?: Content }>;
};

export type Flow6RequestOptions = {
  path?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  responseType?: 'json' | 'blob';
};

export class Flow6ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;
  readonly errors?: Record<string, string[]>;

  constructor(message: string, errorCode: string, status?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'Flow6ApiError';
    this.errorCode = errorCode;
    this.status = status;
    this.errors = errors;
  }
}

const root = 'flow6.schema.json';
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
    throw new Flow6ApiError(
      `Dữ liệu không khớp contract Flow 6: ${ajv.errorsText(validator.errors)}`,
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
      throw new Flow6ApiError('Máy chủ trả lỗi không đúng contract Flow 6.', 'INVALID_ERROR_RESPONSE', status);
    }
  }
  validate({ $ref: '#/components/schemas/Error' }, value);
  const error = value as { message: string; errorCode: string; errors?: Record<string, string[]> };
  throw new Flow6ApiError(error.message, error.errorCode, status, error.errors);
}

// Prevents duplicate concurrent UI mutations.
const pending = new Set<string>();

export async function flow6Request<T>(operationId: Flow6OperationId, options: Flow6RequestOptions = {}): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow6ApiError('Endpoint chưa có trong contract Flow 6.', 'UNKNOWN_OPERATION');

  const { op, method } = entry;
  const parameters = op.parameters ?? [];

  // Resolve path parameters
  const pathParameters = parameters.filter(p => p.in === 'path');
  const pathObj = options.path || {};
  for (const name of Object.keys(pathObj)) {
    if (!pathParameters.some(p => p.name === name)) {
      throw new Flow6ApiError(`Tham số đường dẫn thừa: ${name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
  }
  let url = entry.path;
  for (const parameter of pathParameters) {
    const value = pathObj[parameter.name];
    if (value === undefined) {
      throw new Flow6ApiError(`Thiếu tham số đường dẫn: ${parameter.name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
  }

  // Validate query parameters
  const queryParameters = parameters.filter(p => p.in === 'query');
  if (options.query) {
    for (const key of Object.keys(options.query)) {
      if (!queryParameters.some(p => p.name === key)) {
        throw new Flow6ApiError(`Query param không hợp lệ: ${key}.`, 'CONTRACT_VALIDATION_ERROR');
      }
    }
  }

  // Validate Idempotency-Key
  const requiresIdempotency = parameters.some(p => p.name === 'Idempotency-Key' && p.required);
  if (requiresIdempotency && !options.idempotencyKey) {
    throw new Flow6ApiError('Thao tác ghi yêu cầu header Idempotency-Key.', 'CONTRACT_VALIDATION_ERROR');
  }

  if (options.idempotencyKey) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(options.idempotencyKey)) {
      throw new Flow6ApiError('Idempotency-Key phải đúng định dạng UUID v4.', 'CONTRACT_VALIDATION_ERROR');
    }
  }

  // Validate request body
  const bodySchema = op.requestBody?.content['application/json']?.schema;
  if (bodySchema) {
    validate(bodySchema, options.body);
  } else if (options.body !== undefined) {
    throw new Flow6ApiError('Endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
  }

  // Request lock
  let lock: string | null = null;
  if (method !== 'get') {
    lock = `${operationId}:${options.idempotencyKey || url}`;
    if (pending.has(lock)) throw new Flow6ApiError('Thao tác đang được xử lý, vui lòng chờ.', 'REQUEST_IN_PROGRESS');
    pending.add(lock);
  }

  try {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const queryParams: Record<string, unknown> = {};
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) queryParams[k] = v;
      }
    }

    const result = await apiClient.request({
      url,
      method: method.toUpperCase(),
      params: Object.keys(queryParams).length ? queryParams : undefined,
      data: options.body,
      headers,
      responseType: options.responseType === 'blob' ? 'blob' : 'json',
    });

    if (result.status >= 400) return await serverError(result.data, result.status);

    const envelope = result.data as { success?: boolean; data?: unknown } | null;
    if (envelope?.success === false) return await serverError(envelope, result.status);

    const statusStr = String(result.status);
    const expectedResponse = op.responses[statusStr];
    if (!expectedResponse) throw new Flow6ApiError('HTTP status không khớp contract Flow 6.', 'INVALID_RESPONSE_STATUS', result.status);

    if (options.responseType === 'blob') {
      if (!(result.data instanceof Blob)) {
        throw new Flow6ApiError('Máy chủ chưa trả tệp hợp lệ.', 'INVALID_FILE_RESPONSE');
      }
      return result.data as T;
    }

    const responseSchema = expectedResponse.content?.['application/json']?.schema;
    if (responseSchema) {
      validate(responseSchema, result.data);
    }

    return (result.data as { data: T }).data;
  } catch (error: unknown) {
    if (error instanceof Flow6ApiError) throw error;
    if (isAxiosError(error) && error.response) {
      return await serverError(error.response.data, error.response.status);
    }
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}
