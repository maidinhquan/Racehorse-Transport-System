import type { UserRole } from './types/auth.types';

/** Existing seeded demo accounts, shared by login and assignment recommendations. */
export const QUICK_LOGIN_ACCOUNTS: ReadonlyArray<{
  id: string; role: UserRole; label: string; email: string; password: string;
}> = [
  { id: 'USER_001', role: 'CUSTOMER', label: '🐴 KH 1: Nguyễn Văn A', email: 'vana.horse@gmail.com', password: 'HASH_SECURE_01' },
  { id: 'USER_002', role: 'CUSTOMER', label: '🐴 KH 2: Trần Văn B', email: 'tranb.racing@gmail.com', password: 'HASH_SECURE_02' },
  { id: 'USER_004', role: 'LOGISTICS_MANAGER', label: '📋 Linh Pham · Logistics Manager', email: 'linh.manager@cbntransport.com', password: 'HASH_SECURE_04' },
  { id: 'USER_005', role: 'TRANSPORT_SPECIALIST', label: '🩺 Lê Tuấn · Transport Specialist', email: 'tuan.specialist@cbntransport.com', password: 'HASH_SECURE_05' },
  { id: 'USER_006', role: 'FLEET_ROUTE_COORDINATOR', label: '🗺️ Phạm Hải · Fleet Coordinator', email: 'hai.coord@cbntransport.com', password: 'HASH_SECURE_06' },
  { id: 'USER_007', role: 'DRIVER_ESCORT', label: '🚚 Driver / Escort', email: 'hung.driver@cbntransport.com', password: 'HASH_SECURE_07' },
];

export const isQuickLoginAccount = (id: string, role: string) =>
  QUICK_LOGIN_ACCOUNTS.some(account => account.id === id && account.role === role);
