import type { UserRole } from './types/auth.types';

/** Existing seeded demo accounts, shared by login and assignment recommendations. */
export const QUICK_LOGIN_ACCOUNTS: ReadonlyArray<{
  id: string; role: UserRole; label: string; email: string; password: string;
}> = [
  { id: 'USER_001', role: 'CUSTOMER', label: 'Khách hàng 1: Nguyễn Văn A (Hà Nội)', email: 'vana.horse@gmail.com', password: 'HASH_SECURE_01' },
  { id: 'USER_002', role: 'CUSTOMER', label: 'Khách hàng 2: Trần Văn B (Sài Gòn)', email: 'tranb.racing@gmail.com', password: 'HASH_SECURE_02' },
  { id: 'USER_004', role: 'LOGISTICS_MANAGER', label: 'Trần Thị Linh · Quản lý vận tải', email: 'linh.manager@cbntransport.com', password: 'HASH_SECURE_04' },
  { id: 'USER_005', role: 'TRANSPORT_SPECIALIST', label: 'Lê Tuấn · Chuyên viên thẩm định A', email: 'tuan.specialist@cbntransport.com', password: 'HASH_SECURE_05' },
  { id: 'USER_020', role: 'TRANSPORT_SPECIALIST', label: 'Hoàng Thu Hà · Chuyên viên thẩm định B', email: 'ha.specialist@cbntransport.com', password: 'HASH_SECURE_20' },
  { id: 'USER_021', role: 'TRANSPORT_SPECIALIST', label: 'Vũ Minh Châu · Chuyên viên kiểm dịch C', email: 'chau.specialist@cbntransport.com', password: 'HASH_SECURE_21' },
  { id: 'USER_006', role: 'FLEET_ROUTE_COORDINATOR', label: 'Phạm Hải · Điều phối viên A', email: 'hai.coord@cbntransport.com', password: 'HASH_SECURE_06' },
  { id: 'USER_022', role: 'FLEET_ROUTE_COORDINATOR', label: 'Trần Bảo Ngọc · Điều phối viên B', email: 'ngoc.coord@cbntransport.com', password: 'HASH_SECURE_22' },
  { id: 'USER_007', role: 'DRIVER_ESCORT', label: 'Hoàng Hùng · Tài xế quốc tế 1', email: 'hung.driver@cbntransport.com', password: 'HASH_SECURE_07' },
  { id: 'USER_008', role: 'DRIVER_ESCORT', label: 'Vũ Thành · Tài xế quốc tế 2', email: 'thanh.driver@cbntransport.com', password: 'HASH_SECURE_08' },
  { id: 'USER_009', role: 'DRIVER_ESCORT', label: 'BS. Đỗ Hoa · Bác sĩ thú y áp tải', email: 'hoa.escort@cbntransport.com', password: 'HASH_SECURE_09' },
  { id: 'USER_010', role: 'DRIVER_ESCORT', label: 'BS. Phan Nam · Kỹ thuật viên ngựa', email: 'nam.escort@cbntransport.com', password: 'HASH_SECURE_10' },
  { id: 'USER_012', role: 'DRIVER_ESCORT', label: 'Nguyễn Văn Hùng · Tài xế chính', email: 'nguyenvanhung.driver@cbntransport.com', password: 'HASH_SECURE_12' },
  { id: 'USER_013', role: 'DRIVER_ESCORT', label: 'Lê Quốc Tuấn · Phụ lái', email: 'lequoctuan.driver@cbntransport.com', password: 'HASH_SECURE_13' },
  { id: 'USER_014', role: 'DRIVER_ESCORT', label: 'Dr. Lê Thu Trang · Bác sĩ thú y', email: 'lethutrang.escort@cbntransport.com', password: 'HASH_SECURE_14' },
  { id: 'USER_016', role: 'DRIVER_ESCORT', label: 'Bùi Văn Long · Tài xế', email: 'buivanlong.driver@cbntransport.com', password: 'HASH_SECURE_16' },
  { id: 'USER_030', role: 'DRIVER_ESCORT', label: 'Ngô Đức Anh · Tài xế chính', email: 'ngoducanh.driver@cbntransport.com', password: 'HASH_SECURE_30' },
  { id: 'USER_031', role: 'DRIVER_ESCORT', label: 'Dr. Hoàng Gia Huy · Bác sĩ thú y', email: 'hoanggiahuy.escort@cbntransport.com', password: 'HASH_SECURE_31' },
  { id: 'USER_024', role: 'ADMIN', label: 'Quản trị viên Hệ thống (System Admin)', email: 'admin@cbntransport.com', password: 'HASH_SECURE_24' },
];

export const isQuickLoginAccount = (id: string, role: string) =>
  QUICK_LOGIN_ACCOUNTS.some(account => account.id === id && account.role === role);
