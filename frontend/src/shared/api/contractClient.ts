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
}

export interface PaymentConfirmation {
  confirmedAmount: number;
  transactionCode: string;
  receivedAt: string;
  note: string;
}

type Operation = { operationId: string; requestBody?: { content?: Record<string, { schema: object }> }; responses: Record<string, { content?: Record<string, { schema: object }> }> };
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
ajv.addSchema({ components: specification.components, $id: 'flow1' }, 'flow1');
const operations = Object.entries(specification.paths).flatMap(([path, methods]) => Object.entries(methods).map(([method, operation]) => ({
  method, parameters: (path.match(/\{/g) ?? []).length, pattern: new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`), operation: operation as Operation,
}))).sort((a, b) => a.parameters - b.parameters);

function validate(schema: object, value: unknown, context: string) {
  const reference = (schema as { $ref?: string }).$ref;
  const validator = reference ? ajv.getSchema('flow1' + reference) ?? ajv.compile({ $ref: 'flow1' + reference }) : ajv.compile(schema);
  if (!validator(value)) throw new Error(`${context} không khớp contract Flow 1: ${ajv.errorsText(validator.errors, { separator: '; ' })}`);
}

const pending = new Set<string>();

/** Client executing verified requests against OpenAPI contract. */
export async function contractClient<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: unknown, params?: object): Promise<T> {
  const operation = operations.find(item => item.method === method && item.pattern.test(url))?.operation;
  const bodySchema = operation?.requestBody?.content?.['application/json']?.schema;
  if (bodySchema) validate(bodySchema, data, 'Dữ liệu gửi lên');
  const key = `${method}:${url}`;
  if (method !== 'get' && pending.has(key)) throw new Error('Thao tác đang được xử lý.');
  if (method !== 'get') pending.add(key);
  try {
    const response = await apiClient.request<{ success: boolean; message: string; data: T }>({
      method, url, data, params,
      ...(data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    });
    const body = response.data;
    if (body?.success !== true) throw new Error(body?.message || 'API chưa xác nhận thành công.');
    if (body.data === undefined) throw new Error('Phản hồi API thiếu data, không khớp contract Flow 1.');
    const responseSchema = operation?.responses[String(response.status)]?.content?.['application/json']?.schema;
    if (operation && !responseSchema) throw new Error('HTTP status không khớp contract Flow 1.');
    if (responseSchema) validate(responseSchema, body, 'Phản hồi máy chủ');
    return body.data;
  } finally { pending.delete(key); }
}

/** Backward compatibility alias */
export const flow1 = contractClient;
