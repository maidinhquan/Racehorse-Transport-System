export const apiMessage = (error: unknown): string => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message || e.message || 'Không kết nối được máy chủ. Dữ liệu chưa được lưu.';
};
