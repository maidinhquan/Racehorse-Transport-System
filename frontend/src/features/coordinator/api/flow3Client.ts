/**
 * Flow 3 HTTP client — mirrors the pattern of flow6Client.
 * Validates path params, request body and response envelope
 * against the OpenAPI contract at compile-time-equivalent depth.
 *
 * Keep the same idempotencyKey for a retry of an unchanged command.
 * Refetch on STALE_VERSION before retrying mutations.
 */
import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow3.openapi.json';
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

export class Flow3ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;

  constructor(message: string, errorCode: string, status?: number) {
    super(message);
    this.name = 'Flow3ApiError';
    this.errorCode = errorCode;
    this.status = status;
  }
}

const root = 'flow3.schema.json';
const ajv = new Ajv({ allErrors: true, logger: false, unknownFormats: 'ignore' });
ajv.addSchema({ $id: root, components: specification.components }, root);

const entries = Object.entries(specification.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({ path, method, op: op as unknown as Operation })),
);

const validators = new Map<string, ReturnType<typeof ajv.compile>>();

function absoluteRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(absoluteRefs);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key,
      key === '$ref' && typeof child === 'string' && child.startsWith('#/')
        ? root + child : absoluteRefs(child),
    ]));
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
    throw new Flow3ApiError(
      `Dữ liệu không khớp contract Flow 3: ${ajv.errorsText(validator.errors)}`,
      'CONTRACT_VALIDATION_ERROR',
    );
  }
}

async function serverError(data: unknown, status: number): Promise<never> {
  let value = data;
  if (data instanceof Blob) {
    try { value = JSON.parse(await data.text()); }
    catch { throw new Flow3ApiError('Máy chủ trả lỗi không đúng contract Flow 3.', 'INVALID_ERROR_RESPONSE', status); }
  }
  validate({ $ref: '#/components/schemas/Error' }, value);
  const error = value as { message: string; errorCode: string };
  throw new Flow3ApiError(error.message, error.errorCode, status);
}

// Prevents duplicate concurrent UI mutations. Backend must also enforce idempotency.
const pending = new Set<string>();

export async function flow3Request<T>(operationId: string, options: Options): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow3ApiError('Endpoint chưa có trong contract Flow 3.', 'UNKNOWN_OPERATION');

  const { op, method } = entry;

  // Resolve path parameters
  const pathParameters = op.parameters.filter(p => p.in === 'path');
  for (const name of Object.keys(options.path)) {
    if (!pathParameters.some(p => p.name === name)) {
      throw new Flow3ApiError(`Path param không có trong contract: ${name}`, 'CONTRACT_VALIDATION_ERROR');
    }
  }
  let url = entry.path;
  for (const parameter of pathParameters) {
    const value = options.path[parameter.name];
    if (value === undefined) {
      throw new Flow3ApiError(`Thiếu path param: ${parameter.name}`, 'CONTRACT_VALIDATION_ERROR');
    }
    validate(parameter.schema, value);
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(value));
  }

  // Build query string
  const queryParameters = op.parameters.filter(p => p.in === 'query');
  const queryObj: Record<string, string | number | boolean> = {};
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined) continue;
      if (!queryParameters.some(p => p.name === k)) {
        throw new Flow3ApiError(`Query không có trong contract: ${k}`, 'CONTRACT_VALIDATION_ERROR');
      }
      queryObj[k] = v;
    }
  }
  for (const parameter of queryParameters) {
    const value = queryObj[parameter.name];
    if (value === undefined) {
      if (parameter.required) throw new Flow3ApiError(`Thiếu query: ${parameter.name}`, 'CONTRACT_VALIDATION_ERROR');
    } else validate(parameter.schema, value);
  }

  const headers: Record<string, string | undefined> = { Accept: 'application/json' };
  const binaryTypes = [...new Set(Object.entries(op.responses)
    .filter(([status]) => status.startsWith('2'))
    .flatMap(([, response]) => Object.entries(response.content ?? {})
      .filter(([, media]) => media.schema.type === 'string' && media.schema.format === 'binary')
      .map(([mime]) => mime)))];
  const isDownload = binaryTypes.length > 0;
  if (isDownload) headers.Accept = binaryTypes.join(', ');

  // Idempotency key for mutations
  if (method !== 'get') {
    const keyParam = op.parameters.find(p => p.name === 'Idempotency-Key');
    if (keyParam) {
      validate(keyParam.schema, options.idempotencyKey);
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
  }

  let data: unknown = options.body;

  const multipartSchema = op.requestBody?.content['multipart/form-data']?.schema;
  if (multipartSchema) {
    const file = options.file;
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 10 * 1024 * 1024 ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
    ) {
      throw new Flow3ApiError(
        'Chọn tệp PDF, JPEG hoặc PNG thật, dung lượng từ 1 byte đến 10 MiB.',
        'INVALID_FILE',
      );
    }
    const fields = options.body ?? {};
    if (typeof fields !== 'object' || fields === null || Array.isArray(fields) || fields instanceof FormData || Object.hasOwn(fields, 'file')) {
      throw new Flow3ApiError('Trường multipart không hợp lệ.', 'CONTRACT_VALIDATION_ERROR');
    }
    validate(multipartSchema, { ...fields, file: file.name });
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, String(value));
    form.append('file', file);
    data = form;
    headers['Content-Type'] = undefined; // Browser sets multipart boundary
  } else {
    if (options.file) throw new Flow3ApiError('Endpoint này không nhận tệp.', 'CONTRACT_VALIDATION_ERROR');
    const bodySchema = op.requestBody?.content['application/json']?.schema;
    if (bodySchema) validate(bodySchema, data);
    else if (data !== undefined) throw new Flow3ApiError('Endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
  }

  const lock = method === 'get' ? null : `${method}:${url}`;
  if (lock && pending.has(lock)) throw new Flow3ApiError('Thao tác đang được xử lý.', 'REQUEST_IN_PROGRESS');
  if (lock) pending.add(lock);

  try {
    const result = await apiClient.request<unknown>({
      method,
      url,
      data,
      headers,
      params: Object.keys(queryObj).length > 0 ? queryObj : undefined,
      ...(isDownload ? { responseType: 'blob' as const } : {}),
    });

    if (result.status >= 400) return await serverError(result.data, result.status);

    const response = op.responses[String(result.status)];
    if (!response) throw new Flow3ApiError('HTTP status không khớp contract Flow 3.', 'INVALID_RESPONSE_STATUS', result.status);

    if (isDownload) {
      const contentType = result.data instanceof Blob ? result.data.type.split(';')[0].trim().toLowerCase() : '';
      if (
        !(result.data instanceof Blob) ||
        !binaryTypes.includes(contentType) ||
        !response.content?.[contentType] ||
        !result.data.size
      ) {
        throw new Flow3ApiError('Máy chủ chưa trả tệp hợp lệ.', 'INVALID_FILE_RESPONSE');
      }
      return result.data as T;
    }

    const envelope = result.data as { success?: boolean; data?: unknown } | null;
    if (envelope?.success === false) return await serverError(envelope, result.status);

    const contentSchema = response.content?.['application/json']?.schema;
    if (!contentSchema) throw new Flow3ApiError('Máy chủ chưa trả JSON theo contract Flow 3.', 'INVALID_RESPONSE_TYPE', result.status);
    validate(contentSchema, result.data);

    return (result.data as { data: T }).data;
  } catch (error) {
    if (isAxiosError(error) && error.response) return await serverError(error.response.data, error.response.status);
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}
