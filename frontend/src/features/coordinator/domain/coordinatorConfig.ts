/**
 * Cấu hình mặc định cho Điều phối viên (Coordinator)
 * Bao gồm các thông số lộ trình OSRM, quy chuẩn nghỉ ngơi cho ngựa, danh mục thành phố & trạm thú y.
 */

export interface CoordinatorPolicy {
  careIntervalH: number;
  shortRestMin: number;
  roadEpisodeH: number;
  recoveryRestH: number;
  truckFactor: number;
  airportHandoverH: number;
  airportReceiveH: number;
  label: string;
}

export const DEFAULT_POLICY: CoordinatorPolicy = {
  careIntervalH: 4,
  shortRestMin: 45,
  roadEpisodeH: 12,
  recoveryRestH: 8,
  truckFactor: 1.2,
  airportHandoverH: 3,
  airportReceiveH: 2,
  label: 'Đề xuất tiêu chuẩn vận chuyển ngựa – có thể cấu hình',
};

export interface CoordinatorRouting {
  provider: string;
  url: string;
  timeoutMs: number;
}

export const DEFAULT_ROUTING: CoordinatorRouting = {
  provider: 'OSRM',
  url: 'https://router.project-osrm.org/route/v1/driving/',
  timeoutMs: 15000,
};

export const COORDINATOR_DEFAULT_USERS = {
  coordinator: {
    id: 'USER_006',
    name: 'Phạm Hải',
    initials: 'PH',
    sub: 'Fleet & Route Coordinator',
    email: 'hai.coord@cbntransport.com',
  },
  manager: {
    id: 'MGR-01',
    name: 'Linh Pham',
    initials: 'LP',
    sub: 'Logistics Manager',
    email: 'linh.pham@cbntransport.example',
  },
  specialist: {
    id: 'SPC-01',
    name: 'Hoang Thu Ha',
    initials: 'HH',
    sub: 'Transport Specialist',
    email: 'ha.hoang@cbntransport.example',
  },
};

export const DEFAULT_CITIES: [string, string, string][] = [
  ['Ho Chi Minh City', 'VN', 'HCMC'],
  ['Hanoi', 'VN', 'HAN'],
  ['Da Nang', 'VN', 'DAD'],
  ['Bangkok', 'TH', 'BKK'],
  ['Singapore', 'SG', 'SIN'],
  ['Sydney', 'AU', 'SYD'],
  ['Tokyo', 'JP', 'TYO'],
  ['Dubai', 'AE', 'DXB'],
  ['London', 'UK', 'LON'],
];

export interface VetStation {
  id: string;
  name: string;
  near: string[];
  country: string;
  address: string;
  phone: string;
  hours: string;
  km: number;
}

export const DEFAULT_VET_STATIONS: VetStation[] = [
  {
    id: 'VS-JP-MIHO',
    name: 'JRA Miho Training Center Equine Hospital (Bệnh viện Thú y Miho – JRA)',
    near: ['Narita International Airport', 'Tokyo', 'Ibaraki'],
    country: 'JP',
    address: '2500-2 Mikoma, Miho-mura, Inashiki-gun, Ibaraki 300-0493, Japan',
    phone: '+81 29 885 2111',
    hours: '24/7',
    km: 8,
  },
  {
    id: 'VS-JP-RITTO',
    name: 'JRA Ritto Training Center Equine Hospital (Bệnh viện Thú y Ritto – JRA)',
    near: ['Kansai International Airport', 'Osaka', 'Kyoto', 'Shiga'],
    country: 'JP',
    address: '1028 Mikogawa, Ritto-shi, Shiga 520-3085, Japan',
    phone: '+81 77 558 1111',
    hours: '24/7',
    km: 10,
  },
  {
    id: 'VS-JP-SHADAI',
    name: 'Shadai Horse Clinic (Bệnh viện Thú y Ngựa Shadai – Hokkaido)',
    near: ['New Chitose Airport', 'Tomakomai', 'Hokkaido'],
    country: 'JP',
    address: '100-12 Uenae, Tomakomai-shi, Hokkaido 059-1365, Japan',
    phone: '+81 144 58 2211',
    hours: '24/7',
    km: 6,
  },
  {
    id: 'VS-VN-VNUA',
    name: 'Bệnh viện Thú y – Học viện Nông nghiệp Việt Nam (VNUA)',
    near: ['Soc Son', 'Noi Bai International Airport', 'Hanoi', 'Gia Lam'],
    country: 'VN',
    address: 'Ngô Xuân Quảng, TT. Trâu Quỳ, H. Gia Lâm, Hà Nội',
    phone: '+84 24 3876 9621',
    hours: '24/7',
    km: 12,
  },
  {
    id: 'VS-VN-NLU',
    name: 'Bệnh viện Thú y – Trường Đại học Nông Lâm TP.HCM',
    near: ['Ho Chi Minh City', 'Tan Son Nhat International Airport', 'Thu Duc'],
    country: 'VN',
    address: 'Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    phone: '+84 28 3896 6780',
    hours: '24/7',
    km: 14,
  },
  {
    id: 'VS-VN-MOCBAI',
    name: 'Trạm Kiểm dịch Động vật Cửa khẩu Quốc tế Mộc Bài',
    near: ['Moc Bai Border Gate', 'Tay Ninh', 'Bavet Border Gate'],
    country: 'VN',
    address: 'Khu kinh tế Cửa khẩu Mộc Bài, Xã Lợi Thuận, H. Bến Cầu, Tây Ninh',
    phone: '+84 276 3876 123',
    hours: '24/7',
    km: 5,
  },
  {
    id: 'VS-TH-KASETSART',
    name: 'Kasetsart University Large Animal Teaching Hospital',
    near: ['Bangkok', 'Suvarnabhumi Airport', 'Nakhon Pathom'],
    country: 'TH',
    address: '1 Malaiman Road, Kamphaeng Saen, Nakhon Pathom 73140, Thailand',
    phone: '+66 34 351 901',
    hours: '24/7',
    km: 16,
  },
];

export const DEFAULT_AIR = {
  partners: [] as any[],
  routes: [] as any[],
  schedules: [] as any[],
};
