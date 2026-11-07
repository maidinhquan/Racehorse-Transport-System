export const apiMessage = (error: unknown): string => {
  const e = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }; message?: string; errors?: Record<string, string[]> };
  if (e.response?.status === 429) {
    return 'Hệ thống đang tạm khóa do gửi quá nhiều yêu cầu trong 1 phút (Rate Limit). Vui lòng đợi khoảng 30–60 giây để hệ thống tự mở lại rồi bấm tiếp tục.';
  }
  const rawErrors = e.response?.data?.errors ?? e.errors ?? {};
  const details = Object.entries(rawErrors)
    .filter(([field]) => field !== 'exceptionType' && field !== 'stackTrace')
    .flatMap(([field, messages]) =>
      Array.isArray(messages) ? messages.map(message => `${field}: ${message}`) : []);
  if (details.length) return `Dữ liệu chưa hợp lệ: ${details.join('; ')}`;

  const serverMsg = e.response?.data?.message;
  if (serverMsg) {
    if (serverMsg === 'Microchip is already registered.') {
      return 'Số Microchip này đã được đăng ký trong hệ thống. Mỗi con ngựa phải có một mã Microchip (15 chữ số) riêng biệt.';
    }
    if (serverMsg === 'Passport must be valid.') {
      return 'Hộ chiếu không hợp lệ: ngày cấp phải sau ngày sinh và ngày hết hạn phải sau ngày cấp và ngày hiện tại.';
    }
    if (serverMsg === 'Invalid passport dates.') {
      return 'Ngày cấp hoặc ngày hết hạn hộ chiếu không hợp lệ.';
    }
    if (serverMsg === 'Invalid date of birth.') {
      return 'Ngày sinh không hợp lệ (không được lớn hơn ngày hiện tại).';
    }
    if (serverMsg === 'Declared value must be whole VND.') {
      return 'Giá trị khai báo phải là số nguyên (VND) lớn hơn 0.';
    }
    return serverMsg;
  }
  return e.message || 'Không kết nối được máy chủ. Dữ liệu chưa được lưu.';
};
