/**
 * Flow 5 HTTP client — mirrors flow3Client & flow6Client.
 * Validates path params, query params, request body and response envelope
 * against the OpenAPI contract.
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * Refetch on STALE_VERSION before retrying mutations.
 */
import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow5.openapi.json';
import { apiClient } from '../../../shared/api/apiClient';

type Schema = Record<string, unknown>;
type Content = Record<string, { schema: Schema }>;
type Operation = {
  operationId: string;
  parameters: Array<{ name: string; in: 'path' | 'query' | 'header'; required?: boolean; schema: Schema }>;
  requestBody?: { content: Content };
  responses: Record<string, { content?: Content }>;
};

export type Options = {
  path: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  file?: File;
  idempotencyKey?: string;
};

export class Flow5ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;
  readonly blockers?: Array<{ code: string; field: string; message: string }>;

  constructor(message: string, errorCode: string, status?: number, blockers?: Array<{ code: string; field: string; message: string }>) {
    super(message);
    this.name = 'Flow5ApiError';
    this.errorCode = errorCode;
    this.status = status;
    this.blockers = blockers;
  }
}

const root = 'flow5.schema.json';
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
    throw new Flow5ApiError(
      `Dữ liệu không khớp contract Flow 5: ${ajv.errorsText(validator.errors)}`,
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
      throw new Flow5ApiError('Máy chủ trả lỗi không đúng contract Flow 5.', 'INVALID_ERROR_RESPONSE', status);
    }
  }
  validate({ $ref: '#/components/schemas/Error' }, value);
  const error = value as { message: string; errorCode: string; blockers?: Array<{ code: string; field: string; message: string }> };
  throw new Flow5ApiError(error.message, error.errorCode, status, error.blockers);
}

// Prevents duplicate concurrent UI mutations.
const pending = new Set<string>();

export async function flow5Request<T>(operationId: string, options: Options): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow5ApiError('Endpoint chưa có trong contract Flow 5.', 'UNKNOWN_OPERATION');

  const { op, method } = entry;

  // Resolve path parameters
  const pathParameters = op.parameters.filter(p => p.in === 'path');
  for (const name of Object.keys(options.path)) {
    if (!pathParameters.some(p => p.name === name)) {
      throw new Flow5ApiError(`Tham số đường dẫn thừa: ${name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
  }
  let url = entry.path;
  for (const parameter of pathParameters) {
    const value = options.path[parameter.name];
    if (value === undefined) {
      throw new Flow5ApiError(`Thiếu tham số đường dẫn: ${parameter.name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
    validate(parameter.schema, value);
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(value));
  }

  // Validate query parameters
  const queryParameters = op.parameters.filter(p => p.in === 'query');
  const params: Record<string, string | number | boolean> = {};
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        const paramDef = queryParameters.find(p => p.name === key);
        if (!paramDef) {
          throw new Flow5ApiError(`Query param không hợp lệ: ${key}.`, 'CONTRACT_VALIDATION_ERROR');
        }
        validate(paramDef.schema, value);
        params[key] = value;
      }
    }
  }

  const headers: Record<string, string | undefined> = { Accept: 'application/json' };

  // Handle Idempotency-Key
  if (method !== 'get') {
    const keyParam = op.parameters.find(p => p.name === 'Idempotency-Key');
    if (keyParam) {
      if (!options.idempotencyKey) {
        throw new Flow5ApiError('Thao tác ghi yêu cầu header Idempotency-Key.', 'CONTRACT_VALIDATION_ERROR');
      }
      validate(keyParam.schema, options.idempotencyKey);
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
  }

  // Determine if upload or download
  const isUpload = !!op.requestBody?.content?.['multipart/form-data'];
  const isDownload = !op.responses['200']?.content?.['application/json'] &&
    (!!op.responses['200']?.content?.['image/jpeg'] || !!op.responses['200']?.content?.['application/pdf']);

  let data: unknown = options.body;
  if (isUpload) {
    const file = options.file;
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 ||
        !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      throw new Flow5ApiError('Chọn tệp PDF, JPEG hoặc PNG thật, dung lượng từ 1 byte đến 10 MiB.', 'INVALID_FILE');
    }
    const form = new FormData();
    form.append('file', file);
    if (options.body && typeof options.body === 'object') {
      for (const [k, v] of Object.entries(options.body as Record<string, unknown>)) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
    }
    data = form;
  } else {
    if (options.file) throw new Flow5ApiError('Endpoint này không nhận tệp.', 'CONTRACT_VALIDATION_ERROR');
    const bodySchema = op.requestBody?.content?.['application/json']?.schema;
    if (bodySchema) validate(bodySchema, data);
    else if (data !== undefined) throw new Flow5ApiError('Endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
  }

  const lock = method === 'get' ? null : `${method}:${url}`;
  if (lock && pending.has(lock)) throw new Flow5ApiError('Thao tác đang được xử lý.', 'REQUEST_IN_PROGRESS');
  if (lock) pending.add(lock);

  try {
    const result = await apiClient.request<unknown>({
      method,
      url,
      params: Object.keys(params).length ? params : undefined,
      data,
      headers,
      ...(isDownload ? { responseType: 'blob' as const } : {}),
    });

    if (result.status >= 400) return await serverError(result.data, result.status);

    const expectedResponse = op.responses[String(result.status)];
    if (!expectedResponse) throw new Flow5ApiError('HTTP status không khớp contract Flow 5.', 'INVALID_RESPONSE_STATUS', result.status);

    if (isDownload) {
      if (!(result.data instanceof Blob) || !['application/pdf', 'image/jpeg', 'image/png'].includes(result.data.type) || !result.data.size) {
        throw new Flow5ApiError('Máy chủ chưa trả tệp bằng chứng hợp lệ.', 'INVALID_FILE_RESPONSE');
      }
      return result.data as T;
    }

    const envelope = result.data as { success?: boolean; data?: unknown } | null;
    if (envelope?.success === false) return await serverError(envelope, result.status);

    const jsonSchema = expectedResponse.content?.['application/json']?.schema;
    if (jsonSchema) validate(jsonSchema, result.data);

    return (result.data as { data: T }).data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return await serverError(error.response.data, error.response.status);
    }
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}

