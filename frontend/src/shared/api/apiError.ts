export const apiMessage = (error: unknown): string => {
  const e = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }; message?: string; errors?: Record<string, string[]> };
  if (e.response?.status === 429) {
    return 'Hệ thống đang tạm khóa do gửi quá nhiều yêu cầu trong 1 phút (Rate Limit). Vui lòng đợi khoảng 30–60 giây để hệ thống tự mở lại rồi bấm tiếp tục.';
  }
  const details = Object.entries(e.response?.data?.errors ?? e.errors ?? {}).flatMap(([field, messages]) =>
    Array.isArray(messages) ? messages.map(message => `${field}: ${message}`) : []);
  if (details.length) return `Dữ liệu chưa hợp lệ: ${details.join('; ')}`;
  return e.response?.data?.message || e.message || 'Không kết nối được máy chủ. Dữ liệu chưa được lưu.';
};
