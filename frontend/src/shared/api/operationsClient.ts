import Ajv from 'ajv';
import specification from '../../contracts/operations.openapi.json';
import { apiClient } from './apiClient';
import { Flow1ApiError } from './contractClient';

type Schema = object;
type Operation = { parameters: Array<{ name: string; schema: Schema }>; requestBody?: { content: Record<string, { schema: Schema }> }; responses: Record<string, { content?: Record<string, { schema: Schema }> }> };
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
ajv.addSchema({ $id: 'operations', components: specification.components }, 'operations');
const entries = Object.entries(specification.paths).flatMap(([path, methods]) => Object.entries(methods).map(([method, operation]) => ({
  path, method, expression: new RegExp(`^${path.replace(/\{[^}]+\}/g, '([^/]+)')}$`), operation: operation as Operation,
}))).sort((a, b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0));
function validate(schema: Schema, value: unknown) {
  const reference = (schema as { $ref?: string }).$ref;
  const check = reference ? ajv.getSchema('operations' + reference) ?? ajv.compile({ $ref: 'operations' + reference }) : ajv.compile(schema);
  if (!check(value)) throw new Error(`Dữ liệu không khớp contract nghiệp vụ: ${ajv.errorsText(check.errors)}`);
}
const pending = new Set<string>();
export async function operationsClient<T>(method: 'get' | 'post' | 'put', path: string, body?: unknown): Promise<T> {
  const entry = entries.find(item => item.method === method && item.expression.test(path));
  if (!entry) throw new Error(`Endpoint ${method.toUpperCase()} ${path} chưa có trong contract nghiệp vụ.`);
  const matches = entry.expression.exec(path)!;
  entry.operation.parameters.forEach((param, i) => validate(param.schema, decodeURIComponent(matches[i + 1])));
  const schema = entry.operation.requestBody?.content['application/json']?.schema;
  if (schema) validate(schema, body); else if (body !== undefined) throw new Error('Endpoint không nhận request body.');
  const key = method + ':' + path;
  if (method !== 'get' && pending.has(key)) throw new Error('Thao tác đang được xử lý.');
  if (method !== 'get') pending.add(key);
  try {
    const result = await apiClient.request<{ success: boolean; message: string; errorCode?: string; data: T }>({ method, url: path, data: body });
    if (!result.data?.success) throw new Flow1ApiError(result.data?.message || 'Máy chủ chưa xác nhận thành công.', result.data?.errorCode);
    const response = entry.operation.responses[String(result.status)]?.content?.['application/json']?.schema;
    if (!response) throw new Error('HTTP status không khớp contract nghiệp vụ.');
    validate(response, result.data); return result.data.data;
  } finally { pending.delete(key); }
}
