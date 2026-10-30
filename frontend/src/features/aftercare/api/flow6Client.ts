import Ajv from 'ajv';
import { isAxiosError } from 'axios';
import specification from '../../../contracts/flow6.openapi.json';
import { apiClient } from '../../../shared/api/apiClient';

type Schema = Record<string, unknown>;
type Content = Record<string, { schema: Schema }>;
type Operation = {
  operationId: string;
  'x-kind': 'json' | 'upload' | 'download';
  parameters: Array<{ name: string; in: 'path' | 'header'; schema: Schema }>;
  requestBody?: { content: Content };
  responses: Record<string, { content: Content }>;
};
type Options = {
  path: Record<string, string>;
  body?: unknown;
  file?: File;
  idempotencyKey?: string;
};

export class Flow6ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;

  constructor(message: string, errorCode: string, status?: number) {
    super(message);
    this.name = 'Flow6ApiError';
    this.errorCode = errorCode;
    this.status = status;
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
    throw new Flow6ApiError(`Dữ liệu không khớp contract Flow 6: ${ajv.errorsText(validator.errors)}`, 'CONTRACT_VALIDATION_ERROR');
  }
}

async function serverError(data: unknown, status: number): Promise<never> {
  let value = data;
  if (data instanceof Blob) {
    try { value = JSON.parse(await data.text()); }
    catch { throw new Flow6ApiError('Máy chủ trả lỗi không đúng contract Flow 6.', 'INVALID_ERROR_RESPONSE', status); }
  }
  validate({ $ref: '#/components/schemas/Error' }, value);
  const error = value as { message: string; errorCode: string };
  throw new Flow6ApiError(error.message, error.errorCode, status);
}

// Caller owns a stable key for retries. This lock only prevents duplicate concurrent UI commands;
// the backend must persist idempotency and serialize changes to the same request/invoice.
const pending = new Set<string>();

export async function flow6Request<T>(operationId: string, options: Options): Promise<T> {
  const entry = entries.find(({ op }) => op.operationId === operationId);
  if (!entry) throw new Flow6ApiError('Endpoint chưa có trong contract Flow 6.', 'UNKNOWN_OPERATION');
  const { op, method } = entry;
  const pathParameters = op.parameters.filter(parameter => parameter.in === 'path');
  if (Object.keys(options.path).some(key => !pathParameters.some(parameter => parameter.name === key))) {
    throw new Flow6ApiError('Tham số đường dẫn không đúng contract Flow 6.', 'CONTRACT_VALIDATION_ERROR');
  }
  let url = entry.path;
  for (const parameter of pathParameters) {
    validate(parameter.schema, options.path[parameter.name]);
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(options.path[parameter.name]));
  }
  const headers: Record<string, string | undefined> = { Accept: 'application/json' };
  if (method !== 'get') {
    const keySchema = op.parameters.find(parameter => parameter.name === 'Idempotency-Key')!;
    validate(keySchema.schema, options.idempotencyKey);
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  let data: unknown = options.body;
  if (op['x-kind'] === 'upload') {
    const file = options.file;
    if (options.body !== undefined || !(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 ||
        !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      throw new Flow6ApiError('Chọn tệp PDF, JPEG hoặc PNG thật, dung lượng từ 1 byte đến 10 MiB.', 'INVALID_FILE');
    }
    const form = new FormData();
    form.append('file', file);
    data = form;
    headers['Content-Type'] = undefined; // Let the browser supply the multipart boundary.
  } else {
    if (options.file) throw new Flow6ApiError('Endpoint này không nhận tệp.', 'CONTRACT_VALIDATION_ERROR');
    const bodySchema = op.requestBody?.content['application/json']?.schema;
    if (bodySchema) validate(bodySchema, data);
    else if (data !== undefined) throw new Flow6ApiError('Endpoint không nhận request body.', 'CONTRACT_VALIDATION_ERROR');
  }
  const lock = method === 'get' ? null : `${method}:${url}`;
  if (lock && pending.has(lock)) throw new Flow6ApiError('Thao tác đang được xử lý.', 'REQUEST_IN_PROGRESS');
  if (lock) pending.add(lock);
  try {
    const result = await apiClient.request<unknown>({
      method, url, data, headers,
      ...(op['x-kind'] === 'download' ? { responseType: 'blob' as const } : {}),
    });
    if (result.status >= 400) return await serverError(result.data, result.status);
    const response = op.responses[String(result.status)];
    if (!response) throw new Flow6ApiError('HTTP status không khớp contract Flow 6.', 'INVALID_RESPONSE_STATUS', result.status);
    if (op['x-kind'] === 'download') {
      if (!(result.data instanceof Blob) || !['application/pdf', 'image/jpeg', 'image/png'].includes(result.data.type) || !result.data.size) {
        throw new Flow6ApiError('Máy chủ chưa trả tệp bằng chứng hợp lệ.', 'INVALID_FILE_RESPONSE');
      }
      return result.data as T;
    }
    const envelope = result.data as { success?: boolean; data?: unknown } | null;
    if (envelope?.success === false) return await serverError(envelope, result.status);
    validate(response.content['application/json'].schema, result.data);
    return (result.data as { data: T }).data;
  } catch (error) {
    if (isAxiosError(error) && error.response) return await serverError(error.response.data, error.response.status);
    throw error;
  } finally {
    if (lock) pending.delete(lock);
  }
}
