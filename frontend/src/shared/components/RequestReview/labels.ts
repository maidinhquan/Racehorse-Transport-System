export const reviewStatus: Record<string, string> = {
  COORDINATOR_PENDING: 'Chờ Điều phối', SPECIALIST_PENDING: 'Chờ Chuyên viên kiểm dịch',
  MANAGER_PENDING: 'Chờ Quản lý quyết định', CUSTOMER_SCHEDULE_PENDING: 'Chờ khách xác nhận lịch',
  CUSTOMER_CHANGES_PENDING: 'Chờ khách bổ sung', CUSTOMER_ACCEPTED: 'Khách đã đồng ý lịch',
  CUSTOMER_REJECTED: 'Khách đã từ chối lịch', APPROVED: 'Đã chấp thuận',
};
export const reviewResult: Record<string, string> = {
  FEASIBLE: 'Khả thi', NOT_FEASIBLE: 'Không khả thi', NEEDS_SUPPLEMENT: 'Cần bổ sung',
};
export const documentName: Record<string, string> = {
  PASSPORT: 'Hộ chiếu FEI', PHOTO: 'Ảnh nhận dạng', OWNERSHIP: 'Giấy chứng nhận sở hữu',
  VALUATION: 'Chứng từ giá trị', HEALTH_CERTIFICATE: 'Giấy kiểm dịch / sức khỏe', VACCINATION: 'Sổ tiêm chủng',
};
export const documentStage: Record<string, string> = {
  BEFORE_CONTRACT: 'Trước hợp đồng', BEFORE_DEPARTURE: 'Trước khởi hành', OPTIONAL: 'Không bắt buộc',
};
export const itemStatus: Record<string, string> = {
  VERIFIED: 'Đã xác minh', MISSING: 'Còn thiếu', INVALID: 'Không hợp lệ', NEEDS_FOLLOW_UP: 'Bổ sung chậm nhất ngày đi',
};
export const reviewDay = (value: string) => value.split('-').reverse().join('/');
export const reviewMode = (mode: string) => mode === 'AIR' ? 'Hàng không' : 'Đường bộ';
