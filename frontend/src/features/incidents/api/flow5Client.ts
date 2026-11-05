/**
 * Flow 5 HTTP client — Xử lý sự cố vận chuyển (Incident Management & Recovery).
 * Validates path params, query params, request body and response envelope
 * against contracts/flow5.openapi.json using Ajv.
 *
 * Prevents duplicate concurrent mutations with an in-flight request lock.
 */
import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow5.openapi.json';
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
  file?: File;
  idempotencyKey?: string;
};

export class Flow5ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;
  readonly blockers?: Array<{ code: string; field: string; message: string }>;

  constructor(
    message: string,
    errorCode: string,
    status?: number,
    blockers?: Array<{ code: string; field: string; message: string }>,
  ) {
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

  try {
    validate({ $ref: '#/components/schemas/Error' }, value);
  } catch {
    // Fall back to general server error if envelope validation fails
  }

  const error = value as { message?: string; errorCode?: string; blockers?: Array<{ code: string; field: string; message: string }> };
  throw new Flow5ApiError(
    error.message || 'Lỗi xử lý yêu cầu Flow 5 trên máy chủ.',
    error.errorCode || 'SERVER_ERROR',
    status,
    error.blockers,
  );
}

// Prevents duplicate concurrent UI mutations.
const pending = new Set<string>();

export async function flow5Request<T>(operationId: string, options: Options = {}): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow5ApiError('Endpoint chưa có trong contract Flow 5.', 'UNKNOWN_OPERATION');

  const { op, method } = entry;
  const opParams = op.parameters || [];

  // 1. Resolve & validate path parameters
  const pathParameters = opParams.filter(p => p.in === 'path');
  const pathOpts = options.path || {};
  for (const name of Object.keys(pathOpts)) {
    if (!pathParameters.some(p => p.name === name)) {
      throw new Flow5ApiError(`Tham số đường dẫn thừa: ${name}.`, 'CONTRACT_VALIDATION_ERROR');
    }
  }
  let url = entry.path;
  for (const parameter of pathParameters) {
    const value = pathOpts[parameter.name];
    if (value === undefined) {
      throw new Flow5ApiError(`Thiếu tham số đường dẫn: ${parameter.name}.`, 'CONTRACT_VALIDATION_ERROR');
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
          throw new Flow5ApiError(`Query param không hợp lệ: ${key}.`, 'CONTRACT_VALIDATION_ERROR');
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

  // 4. Determine if upload or download
  const isUpload = !!op.requestBody?.content?.['multipart/form-data'] || !!options.file;
  const isDownload =
    !op.responses['200']?.content?.['application/json'] &&
    (!!op.responses['200']?.content?.['image/jpeg'] || !!op.responses['200']?.content?.['application/pdf']);

  let data: unknown = options.body;
  if (isUpload && options.file) {
    const file = options.file;
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 10 * 1024 * 1024 ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
    ) {
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
    const bodySchema = op.requestBody?.content?.['application/json']?.schema;
    if (bodySchema) {
      validate(bodySchema, data);
    } else if (data !== undefined && method.toLowerCase() === 'get') {
      throw new Flow5ApiError('Endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
    }
  }

  // 5. Concurrency lock
  const lock = method.toLowerCase() === 'get' ? null : `${method.toUpperCase()}:${url}`;
  if (lock && pending.has(lock)) {
    throw new Flow5ApiError('Thao tác đang được xử lý, vui lòng chờ.', 'REQUEST_IN_PROGRESS');
  }
  if (lock) pending.add(lock);

  try {
    const result = await apiClient.request<unknown>({
      method: method.toUpperCase(),
      url,
      params: Object.keys(params).length ? params : undefined,
      data,
      headers,
      ...(isDownload ? { responseType: 'blob' as const } : {}),
    });

    if (result.status >= 400) return await serverError(result.data, result.status);

    const expectedResponse = op.responses[String(result.status)];
    if (!expectedResponse) {
      throw new Flow5ApiError('HTTP status không khớp contract Flow 5.', 'INVALID_RESPONSE_STATUS', result.status);
    }

    if (isDownload) {
      if (
        !(result.data instanceof Blob) ||
        !['application/pdf', 'image/jpeg', 'image/png'].includes(result.data.type) ||
        !result.data.size
      ) {
        throw new Flow5ApiError('Máy chủ chưa trả tệp bằng chứng hợp lệ.', 'INVALID_FILE_RESPONSE');
      }
      return result.data as T;
    }

    const envelope = result.data as { success?: boolean; message?: string; data?: unknown } | null;
    if (envelope?.success === false) return await serverError(envelope, result.status);

    const jsonSchema = expectedResponse.content?.['application/json']?.schema;
    if (jsonSchema) validate(jsonSchema, result.data);

    return (result.data as { data: T })?.data !== undefined ? (result.data as { data: T }).data : (result.data as T);
  } catch (error) {
    if (error instanceof Flow5ApiError) throw error;
    if (isAxiosError(error) && error.response) {
      return await serverError(error.response.data, error.response.status);
    }
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}
