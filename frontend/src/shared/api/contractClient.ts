import { apiClient } from './apiClient';
import Ajv from 'ajv';
import specification from '../../contracts/flow1.openapi.json';
import { apiMessage } from './apiError';

export { apiMessage };

export interface FormOptions {
  currency: 'VND';
  preparationDays: number;
  defaultDepositPct: number;
  contractDeadlineHours: number;
  supportedRoutes: Array<{ id: string; originCountry: string; destinationCountry: string; mode: 'ROAD' | 'AIR' }>;
  /** Returned instead of `supportedRoutes` when origin, destination and mode are all given. */
  selectedRoute?: FormOptions['supportedRoutes'][number];
}

/** Normalizes both response shapes of `/customer/request-form-options` to always include `supportedRoutes`. */
export const withRouteList = (o: FormOptions): FormOptions =>
  o.supportedRoutes ? o : { ...o, supportedRoutes: o.selectedRoute ? [o.selectedRoute] : [] };

type Parameter = { name: string; in: 'path' | 'query' | 'header'; required?: boolean; schema: { type?: string } & Record<string, unknown> };
type Media = { schema: object };
type Operation = { operationId: string; parameters?: Parameter[]; requestBody?: { required?: boolean; content?: Record<string, Media> }; responses: Record<string, { content?: Record<string, Media> }> };
export interface ContractRequestOptions { headers?: Record<string, string> }
export class Flow1ApiError extends Error {
  readonly errorCode?: string;
  readonly errors?: Record<string, string[]>;
  constructor(message: string, errorCode?: string, errors?: Record<string, string[]>) { super(message); this.name = 'Flow1ApiError'; this.errorCode = errorCode; this.errors = errors; }
}
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
// Register schemas only: OpenAPI examples contain business `id` fields, not JSON Schema identifiers.
ajv.addSchema({ components: specification.components, $id: 'flow1' }, 'flow1');
const operations = Object.entries(specification.paths).flatMap(([path, methods]) => Object.entries(methods).map(([method, operation]) => ({
  method, path, parameters: (path.match(/\{/g) ?? []).length,
  pattern: new RegExp(`^${path.replace(/\{[^}]+\}/g, '([^/]+)')}$`), operation: operation as Operation,
}))).sort((a, b) => a.parameters - b.parameters);

export function validateFlow1Schema(schema: object, value: unknown, context: string) {
  const reference = (schema as { $ref?: string }).$ref;
  const validator = reference ? ajv.getSchema('flow1' + reference) ?? ajv.compile({ $ref: 'flow1' + reference }) : ajv.compile(schema);
  if (!validator(value)) {
    const isServerResponse = context.includes('Phản hồi');
    const errors = isServerResponse ? validator.errors?.filter(e => e.keyword !== 'additionalProperties') ?? [] : validator.errors;
    if (errors && errors.length > 0) {
      throw new Flow1ApiError(`${context} không khớp contract Flow 1: ${ajv.errorsText(errors, { separator: '; ' })}`, 'CLIENT_CONTRACT_ERROR');
    }
  }
}

export function matchFlow1Operation(method: string, url: string) {
  const match = operations.find(item => item.method === method && item.pattern.test(url));
  if (!match) throw new Flow1ApiError(`Endpoint ${method.toUpperCase()} ${url} không có trong contract Flow 1.`, 'UNDECLARED_ENDPOINT');
  return match;
}

function validateParameters(match: ReturnType<typeof matchFlow1Operation>, url: string, params: object | undefined, headers: Record<string, string | undefined>) {
  const values = match.pattern.exec(url)!;
  const names = [...match.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  const query = params as Record<string, unknown> | undefined;
  for (const parameter of match.operation.parameters ?? []) {
    let value: unknown = parameter.in === 'path' ? decodeURIComponent(values[names.indexOf(parameter.name) + 1])
      : parameter.in === 'query' ? query?.[parameter.name]
        : Object.entries(headers).find(([name]) => name.toLowerCase() === parameter.name.toLowerCase())?.[1];
    if (value === undefined || value === null) {
      if (parameter.required) throw new Flow1ApiError(`Thiếu ${parameter.in} ${parameter.name} theo contract Flow 1.`, 'CLIENT_CONTRACT_ERROR');
      continue;
    }
    if (parameter.schema.type === 'integer' && typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
    validateFlow1Schema(parameter.schema, value, `Tham số ${parameter.name}`);
  }
  const declaredQuery = new Set((match.operation.parameters ?? []).filter(p => p.in === 'query').map(p => p.name));
  for (const [name, value] of Object.entries(query ?? {})) if (value !== undefined && !declaredQuery.has(name)) throw new Flow1ApiError(`Query ${name} không có trong contract Flow 1.`, 'CLIENT_CONTRACT_ERROR');
}

function validateMultipart(schema: object, data: unknown, photoOnly: boolean) {
  if (!(data instanceof FormData)) throw new Flow1ApiError('Endpoint yêu cầu multipart/form-data.', 'CLIENT_CONTRACT_ERROR');
  const fields: Record<string, string> = {};
  for (const [name, value] of data.entries()) {
    if (Object.hasOwn(fields, name)) throw new Flow1ApiError(`Trường upload ${name} bị lặp.`, 'CLIENT_CONTRACT_ERROR');
    if (value instanceof File) {
      if (name !== 'file' || value.size === 0 || value.size > 10 * 1024 * 1024) throw new Flow1ApiError('Chọn tệp thật, tối đa 10 MiB.', 'CLIENT_CONTRACT_ERROR');
      const allowed = photoOnly ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg', 'image/png'];
      const inferred = value.type || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>)[value.name.split('.').pop()?.toLowerCase() ?? ''];
      if (!allowed.includes(inferred)) throw new Flow1ApiError(photoOnly ? 'Ảnh ngựa phải là JPEG hoặc PNG.' : 'Chỉ nhận PDF, JPEG hoặc PNG.', 'CLIENT_CONTRACT_ERROR');
      fields[name] = value.name;
    } else fields[name] = value;
  }
  if (!(data.get('file') instanceof File)) throw new Flow1ApiError('Chọn tệp thật trước khi tải lên.', 'CLIENT_CONTRACT_ERROR');
  validateFlow1Schema(schema, fields, 'Dữ liệu upload');
}

const pending = new Set<string>();

export function normalizeContractUrl(url: string): string {
  return url.replace(/\/([A-Z_]+)-(\d+)(?=[/?#]|$)/g, (_, p, n) => `/${p}_${n.padStart(3, '0')}`);
}

/** Flow 1 only: exact endpoints, parameter/body validation, authenticated transport and validated responses. */
export async function contractClient<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: unknown, params?: object, options: ContractRequestOptions = {}): Promise<T> {
  const normalizedUrl = normalizeContractUrl(url);
  const normalizedParams = params ? { ...(params as Record<string, unknown>) } : undefined;
  if (normalizedParams) {
    for (const [k, v] of Object.entries(normalizedParams)) {
      if (typeof v === 'string' && /^[A-Z_]+-\d+$/.test(v)) {
        normalizedParams[k] = v.replace(/^([A-Z_]+)-(\d+)$/, (_, p, n) => `${p}_${n.padStart(3, '0')}`);
      }
    }
  }
  const match = matchFlow1Operation(method, normalizedUrl), operation = match.operation;
  const headers: Record<string, string | undefined> = { ...options.headers };
  validateParameters(match, normalizedUrl, normalizedParams, headers);
  const content = operation.requestBody?.content;
  if (content?.['application/json']) validateFlow1Schema(content['application/json'].schema, data, 'Dữ liệu gửi lên');
  else if (content?.['multipart/form-data']) { validateMultipart(content['multipart/form-data'].schema, data, normalizedUrl.endsWith('/files/photo')); headers['Content-Type'] = undefined; }
  else if (data !== undefined) throw new Flow1ApiError('Endpoint không nhận request body theo contract Flow 1.', 'CLIENT_CONTRACT_ERROR');
  const key = `${method}:${normalizedUrl}`;
  if (method !== 'get' && pending.has(key)) throw new Flow1ApiError('Thao tác đang được xử lý.', 'REQUEST_PENDING');
  if (method !== 'get') pending.add(key);
  try {
    const response = await apiClient.request<{ success: boolean; message: string; errorCode?: string; errors?: Record<string, string[]>; data: T }>({ method, url: normalizedUrl, data, params: normalizedParams, headers });
    const body = response.data;
    if (body?.success !== true) throw new Flow1ApiError(body?.message || 'API chưa xác nhận thành công.', body?.errorCode, body?.errors);
    if (body.data === undefined) throw new Flow1ApiError('Phản hồi API thiếu data, không khớp contract Flow 1.', 'SERVER_CONTRACT_ERROR');
    const responseSchema = operation.responses[String(response.status)]?.content?.['application/json']?.schema;
    if (responseSchema) validateFlow1Schema(responseSchema, body, 'Phản hồi máy chủ');
    return body.data;
  } catch (error) {
    if (error instanceof Flow1ApiError) throw error;
    const response = (error as { response?: { status: number; data?: { message?: string; errorCode?: string; errors?: Record<string, string[]> } } }).response;
    if (response?.data) {
      const schema = operation.responses[String(response.status)]?.content?.['application/json']?.schema;
      if (schema) validateFlow1Schema(schema, response.data, 'Phản hồi lỗi máy chủ');
      throw new Flow1ApiError(response.data.message || 'Máy chủ từ chối thao tác.', response.data.errorCode, response.data.errors);
    }
    throw error;
  } finally { pending.delete(key); }
}

export const flow1 = contractClient;
