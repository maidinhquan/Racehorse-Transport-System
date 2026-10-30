import { apiClient } from './apiClient';

/** Private files need the same bearer token as JSON endpoints. */
export async function downloadFile(url: string, name = 'document.pdf') {
  const apiPath = url.startsWith('/api/') ? url.slice(4) : url;
  if (!apiPath.startsWith('/') || apiPath.startsWith('//')) throw new Error('Đường dẫn tài liệu không hợp lệ.');
  const response = await apiClient.get(apiPath, { responseType: 'blob' });
  const mime = String(response.headers['content-type'] ?? '').split(';')[0];
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime)) throw new Error('Máy chủ chưa trả nội dung tài liệu hợp lệ.');
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(response.data);
  link.href = objectUrl; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
