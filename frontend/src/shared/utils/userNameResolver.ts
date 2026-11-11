/**
 * Bộ giải quyết tên người dùng dùng chung toàn hệ thống:
 * Chuyển đổi mã người dùng (USER_..., EMP-..., USR_...) và username sang họ và tên đầy đủ.
 */

export const KNOWN_USER_NAMES: Record<string, string> = {
  USER_001: 'Nguyễn Văn A',
  USER_002: 'Trần Văn B',
  USER_003: 'Lê Thị C',
  USER_004: 'Trần Thị Linh',
  USER_005: 'Lê Tuấn',
  USER_006: 'Phạm Hải',
  USER_007: 'Hoàng Hùng',
  USER_008: 'Vũ Thành',
  USER_009: 'BS. Đỗ Hoa',
  USER_010: 'BS. Phan Nam',
  USER_011: 'Nguyễn Văn A',
  USER_012: 'Nguyễn Văn Hùng',
  USER_013: 'Lê Quốc Tuấn',
  USER_014: 'Dr. Lê Thu Trang',
  USER_015: 'Phạm Thanh Sơn',
  USER_016: 'Bùi Văn Long',
  USER_017: 'Đặng Văn Khoa',
  USER_018: 'BS. Nguyễn Minh Anh',
  USER_019: 'BS. Trần Quốc Bảo',
  USER_020: 'Hoàng Thu Hà',
  USER_021: 'Vũ Minh Châu',
  USER_022: 'Trần Bảo Ngọc',
  USER_023: 'Trần Văn B',
  USER_024: 'Quản trị viên Hệ thống',

  // Mock / demo legacy codes
  'EMP-11': 'Hoàng Thu Hà',
  'EMP-12': 'Vũ Minh Châu',
  'EMP-15': 'Phạm Hải',
  'EMP-16': 'Trần Bảo Ngọc',
  'EMP-21': 'Nguyễn Văn Hùng',
  'EMP-22': 'Lê Quốc Tuấn',
  'EMP-23': 'Phạm Thanh Sơn',
  'EMP-24': 'Somsak Wongsa',
  'EMP-25': 'Bùi Văn Long',
  'EMP-31': 'BS. Nguyễn Minh Anh',
  'EMP-32': 'BS. Trần Quốc Bảo',
  'EMP-33': 'Võ Thị Mai',
  'USR_SPEC_01': 'Lê Tuấn',
  'USR_COORD_01': 'Phạm Hải',
  'CUS-001': 'Alex Equine',
  'CUS-002': 'Nguyễn Hoài Nam',

  // Usernames
  coord_hai: 'Phạm Hải',
  spec_hha: 'Hoàng Thu Hà',
  spec_tuan: 'Lê Tuấn',
  driver_hung: 'Hoàng Hùng',
  driver_thanh: 'Vũ Thành',
  driver_nvhung: 'Nguyễn Văn Hùng',
  driver_lqtuan: 'Lê Quốc Tuấn',
  escort_hoa: 'BS. Đỗ Hoa',
  escort_nam: 'BS. Phan Nam',
  escort_lttrang: 'Dr. Lê Thu Trang',
  escort_nmanh: 'BS. Nguyễn Minh Anh',
  manager_linh: 'Trần Thị Linh',
  nguyenvana: 'Nguyễn Văn A',
  tranvanb: 'Trần Văn B',
};

/**
 * Xóa bỏ các chú thích chức vụ trong dấu ngoặc đơn (ví dụ: "Phạm Hải (Điều phối xe & tuyến)" -> "Phạm Hải")
 */
export function cleanStaffName(name = ''): string {
  return name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Lấy họ và tên đầy đủ từ ID hoặc tên người dùng
 */
export function getUserFullName(idOrName?: string | null, fallback = ''): string {
  if (!idOrName) return fallback;
  const trimmed = idOrName.trim();
  if (!trimmed) return fallback;

  if (KNOWN_USER_NAMES[trimmed]) {
    return KNOWN_USER_NAMES[trimmed];
  }

  // Khớp không phân biệt hoa thường với ID dạng USER_006
  const upper = trimmed.toUpperCase();
  if (KNOWN_USER_NAMES[upper]) {
    return KNOWN_USER_NAMES[upper];
  }

  // Nếu đã là tên người có khoảng trắng và không phải mã dạng USER_...
  const isIdLike = /^(USER_\d+|EMP-\d+|USR_[A-Z0-9_]+|CUS-\d+)$/i.test(trimmed);
  if (!isIdLike && trimmed.includes(' ')) {
    return cleanStaffName(trimmed);
  }

  return cleanStaffName(trimmed) || fallback;
}
