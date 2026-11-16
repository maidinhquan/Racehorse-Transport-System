import { apiClient } from './apiClient';

/** APIs belonging to other flows have separate contracts; never claim Flow 1 validation for them. */
export async function apiRequest<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: unknown) {
  const response = await apiClient.request<{ success: boolean; message: string; data: T }>({ method, url, data });
  if (response.data?.success !== true || response.data.data === undefined) throw new Error(response.data?.message || 'Máy chủ chưa xác nhận thành công.');
  return response.data.data;
}
