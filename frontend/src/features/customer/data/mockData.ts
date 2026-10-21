import type {
  CurrentTrip,
  CustomerNotification,
  RecentRequest,
  TransportRequestItem,
  DemoScenario,
  IncidentDetail,
  CustomerHorse,
  TrackingCheckpoint,
  TrackingTimelineEvent,
  DemoControlStep,
  HistoryRequestItem,
  HistoryScenario,
} from '../types';

export const mockCurrentTrip: CurrentTrip = {
  id: 'TRP-8923',
  requestId: 'TRN-8923',
  horse: 'Thunderbolt',
  origin: 'Ho Chi Minh City',
  destination: 'Bangkok',
  departedDate: '4/10, 07:00',
  eta: '6/10, 16:00',
  lastMilestone: 'Đã đến tại checkpoint – Moc Bai Border Gate',
  milestoneTime: '4/10, 10:00',
  progress: 58,
  status: 'in_transit',
  statusText: 'Đang vận chuyển',
  checkpoints: [
    {
      id: 'CP-01',
      name: 'Trại nuôi xuất phát (TP. Hồ Chí Minh)',
      location: 'Quận 9, TP.HCM',
      time: '4/10, 07:00',
      status: 'completed',
      description: 'Hoàn tất kiểm tra thể trạng ban đầu và bốc xếp ngựa lên xe chuyên dụng.'
    },
    {
      id: 'CP-02',
      name: 'Moc Bai Border Gate (Cửa khẩu Mộc Bài)',
      location: 'Tây Ninh, Việt Nam',
      time: '4/10, 10:00',
      status: 'current',
      description: 'Đã hoàn thành kiểm dịch xuất cảnh. Đang tiến hành thủ tục hải quan xuất biên.'
    },
    {
      id: 'CP-03',
      name: 'Bavet International Border Checkpoint',
      location: 'Svay Rieng, Campuchia',
      expectedTime: '4/10, 13:00',
      status: 'upcoming',
      description: 'Kiểm dịch nhập cảnh phía Campuchia và đổi tổ lái chặng 2.'
    },
    {
      id: 'CP-04',
      name: 'Phnom Penh Quarantine Rest Station',
      location: 'Phnom Penh, Campuchia',
      expectedTime: '5/10, 08:30',
      status: 'upcoming',
      description: 'Nghỉ dưỡng bắt buộc 8 giờ, cho ngựa ăn uống và bác sĩ thú y đo nhịp tim.'
    },
    {
      id: 'CP-05',
      name: 'Bangkok Racecourse Quarantine (Điểm đến)',
      location: 'Bangkok, Thái Lan',
      expectedTime: '6/10, 16:00',
      status: 'upcoming',
      description: 'Bàn giao ngựa an toàn cho đại diện chủ nuôi tại Thái Lan.'
    }
  ],
  telemetry: {
    temperature: '38.2°C (Bình thường)',
    heartRate: '36 bpm',
    waterIntake: '18 lít / ngày',
    lat: 11.0825,
    lng: 106.1772
  }
};

export const mockCustomerNotifications: CustomerNotification[] = [
  {
    id: 'notif-1',
    title: '• Đã xác minh tiền cọc cho TRN-8942',
    body: '$570 đã được xác minh đủ cọc. Xác nhận nội dung hiện hành rồi ký OTP trước 5/10, 09:30 để kích hoạt.',
    time: '4/10, 11:30',
    read: false,
    type: 'urgent',
    actionable: true
  },
  {
    id: 'notif-2',
    title: '• E-mail: Mã OTP ký CT-8942 v1 được gửi tới alex.equine@example.com (Demo)',
    body: 'Đã gửi tới alex.equine@example.com (e-mail mô phỏng)',
    time: '4/10, 11:30',
    read: false,
    type: 'email'
  },
  {
    id: 'notif-3',
    title: '• Đã ký hợp đồng CT-8944 v1 – TRN-8944 activated',
    body: 'Hợp đồng của bạn đã có hiệu lực. Việc lập kế hoạch và chuẩn bị vận chuyển đã bắt đầu.',
    time: '4/10, 11:30',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-4',
    title: '• Chuyến đi TRN-8923 đã khởi hành đúng lịch trình',
    body: 'Ngựa Thunderbolt đã rời trại TP.HCM lúc 07:00 ngày 4/10 trên xe chuyên dụng CBN-02.',
    time: '4/10, 07:15',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-5',
    title: '• Cập nhật kiểm tra sức khỏe tại trạm Mộc Bài',
    body: 'Bác sĩ thú y báo cáo sức khỏe ngựa ổn định, sẵn sàng thông quan.',
    time: '4/10, 10:15',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-6',
    title: '• Hóa đơn thanh toán đợt 1 cho TRN-8928',
    body: 'Đã xuất hóa đơn điện tử cho khoản đặt cọc vận chuyển Đà Nẵng → Tokyo.',
    time: '3/10, 16:40',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-7',
    title: '• Nhắc nhở: Kiểm tra hộ chiếu FEI của ngựa Shadowfax',
    body: 'Vui lòng xác nhận bản chụp hộ chiếu trước ngày xét duyệt hồ sơ 5/10.',
    time: '3/10, 09:00',
    read: false,
    type: 'urgent'
  },
  {
    id: 'notif-8',
    title: '• Hồ sơ xuất cảnh cho TRN-8924 đã được cơ quan kiểm dịch tiếp nhận',
    body: 'Thời gian xét duyệt dự kiến: 2 ngày làm việc.',
    time: '2/10, 14:20',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-9',
    title: '• Báo giá vận chuyển mới cho tuyến TP.HCM → Tokyo (TRN-8930)',
    body: 'Hệ thống đã cập nhật biểu phí vận chuyển đường hàng không quốc tế.',
    time: '2/10, 10:00',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-10',
    title: '• Xác nhận hoàn tất khử trùng chuồng ngựa trước bốc xếp',
    body: 'Đội ngũ CBN Transport đã tiến hành khử khuẩn tiêu chuẩn quốc tế ISO-22000.',
    time: '1/10, 17:30',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-11',
    title: '• E-mail: Xác nhận lịch tiêm phòng bổ sung',
    body: 'Gửi tới alex.equine@example.com (hệ thống mô phỏng)',
    time: '1/10, 08:00',
    read: false,
    type: 'email'
  },
  {
    id: 'notif-12',
    title: '• Thông báo nghiệm thu GPS chặng Hồ Chí Minh',
    body: 'Thiết bị định vị vệ tinh và cảm biến nhiệt độ trên xe CBN-02 hoạt động tốt.',
    time: '30/9, 15:45',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-13',
    title: '• Hợp đồng CT-8928 đã được tạo thành công',
    body: 'Bạn có thể xem chi tiết điều khoản bảo hiểm vận tải đua ngựa quốc tế.',
    time: '29/9, 11:20',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-14',
    title: '• Chào mừng bạn đến với hệ thống CBN Transport',
    body: 'Tài khoản Alex Equine đã được kích hoạt đầy đủ các quyền vận chuyển xuyên biên giới.',
    time: '28/9, 08:00',
    read: false,
    type: 'info'
  }
];

export const mockRecentRequests: RecentRequest[] = [
  {
    id: 'TRN-8923',
    origin: 'HCMC',
    destination: 'Bangkok',
    horses: 'Thunderbolt',
    requestedDate: '28/9/2026',
    status: 'in_transit',
    statusText: 'Đang vận chuyển'
  },
  {
    id: 'TRN-8924',
    origin: 'Hanoi',
    destination: 'Singapore',
    horses: 'Shadowfax',
    requestedDate: '2/10/2026',
    status: 'reviewing',
    statusText: 'Đang xét duyệt hồ sơ'
  },
  {
    id: 'TRN-8928',
    origin: 'Da Nang',
    destination: 'Tokyo',
    horses: 'Thunderbolt',
    requestedDate: '2/10/2026',
    status: 'contract_ready',
    statusText: 'Hợp đồng sẵn sàng'
  },
  {
    id: 'TRN-8930',
    origin: 'HCMC',
    destination: 'Tokyo',
    horses: 'Apollo',
    requestedDate: '4/10/2026',
    status: 'waiting_manager',
    statusText: 'Chờ quản lý xét duyệt'
  }
];

export const mockDemoScenarios: DemoScenario[] = [
  {
    id: 'TRN-8930',
    title: 'Chờ Manager xét duyệt',
    description: 'Đăng nhập vai trò Logistics Manager để chấp nhận, yêu cầu sửa hoặc từ chối (phải nhập lý do).',
    statusText: 'Chờ quản lý xét duyệt',
    statusKey: 'waiting_manager'
  },
  {
    id: 'TRN-8926',
    title: 'Manager yêu cầu sửa yêu cầu',
    description: 'Sửa thông tin chuyến theo góp ý rồi gửi lại để xét duyệt.',
    statusText: 'Yêu cầu chỉnh sửa',
    statusKey: 'revision_requested'
  },
  {
    id: 'TRN-8928',
    title: 'Hợp đồng sẵn sàng – còn hạn 24 giờ',
    description: 'Đọc hợp đồng, xem đồng hồ đếm ngược, yêu cầu thay đổi hoặc đồng ý điều khoản rồi thanh toán cọc bằng QR Sandbox.',
    statusText: 'Hợp đồng sẵn sàng',
    statusKey: 'contract_ready'
  },
  {
    id: 'TRN-8925',
    title: 'Đã gửi yêu cầu sửa hợp đồng',
    description: 'Manager phát hành phiên bản v2 hoặc từ chối sửa; cả hai cách đều cấp lại đủ 24 giờ.',
    statusText: 'Yêu cầu sửa hợp đồng',
    statusKey: 'contract_revision_requested'
  },
  {
    id: 'TRN-8927',
    title: 'Hợp đồng quá hạn',
    description: 'Không ký được nữa; yêu cầu phiên bản cập nhật hoặc để Manager gia hạn. Quá hạn không tự hủy yêu cầu.',
    statusText: 'Hợp đồng sẵn sàng',
    statusKey: 'contract_ready'
  },
  {
    id: 'TRN-8941',
    title: 'Đã thanh toán cọc – chờ Sandbox xác minh',
    description: 'Trong trang Thanh toán / Đặt cọc bấm kết quả Sandbox thành công hoặc thất bại.',
    statusText: 'Hợp đồng sẵn sàng',
    statusKey: 'contract_ready'
  },
  {
    id: 'TRN-8942',
    title: 'Đã xác minh cọc – chờ ký OTP',
    description: 'Ký hợp đồng bằng OTP (mã demo 123456): hợp đồng có hiệu lực, yêu cầu được kích hoạt và tạo đúng một Trip.',
    statusText: 'Đã xác minh cọc – Chờ ký',
    statusKey: 'deposit_verified'
  }
];

export const mockTransportRequests: TransportRequestItem[] = [
  {
    id: 'TRN-8923',
    origin: 'HCMC',
    destination: 'Bangkok',
    horse: 'Thunderbolt',
    requestedDate: '28/9/2026',
    expectedDate: '4/10/2026',
    contractStatus: 'active',
    contractStatusText: 'Có hiệu lực',
    status: 'in_transit',
    statusText: 'Đang vận chuyển'
  },
  {
    id: 'TRN-8924',
    origin: 'Hanoi',
    destination: 'Singapore',
    horse: 'Shadowfax',
    requestedDate: '2/10/2026',
    expectedDate: '18/10/2026',
    contractStatus: 'active',
    contractStatusText: 'Có hiệu lực',
    status: 'reviewing',
    statusText: 'Đang xét duyệt hồ sơ'
  },
  {
    id: 'TRN-8928',
    origin: 'Da Nang',
    destination: 'Tokyo',
    horse: 'Thunderbolt',
    requestedDate: '2/10/2026',
    expectedDate: '25/10/2026',
    contractStatus: 'ready',
    contractStatusText: 'Sẵn sàng',
    status: 'contract_ready',
    statusText: 'Hợp đồng sẵn sàng'
  },
  {
    id: 'TRN-8930',
    origin: 'HCMC',
    destination: 'Tokyo',
    horse: 'Apollo',
    requestedDate: '4/10/2026',
    expectedDate: '10/10/2026',
    contractStatus: 'none',
    contractStatusText: '—',
    status: 'waiting_manager',
    statusText: 'Chờ quản lý xét duyệt'
  },
  {
    id: 'TRN-8810',
    origin: 'Sydney',
    destination: 'HCMC',
    horse: 'Starboy',
    requestedDate: '18/9/2026',
    expectedDate: '28/9/2026',
    contractStatus: 'active',
    contractStatusText: 'Có hiệu lực',
    status: 'delivered',
    statusText: 'Đã giao'
  },
  {
    id: 'TRN-8925',
    origin: 'HCMC',
    destination: 'Tokyo',
    horse: 'Starboy',
    requestedDate: '29/9/2026',
    expectedDate: '12/11/2026',
    contractStatus: 'ready',
    contractStatusText: 'Sẵn sàng',
    status: 'contract_revision_requested',
    statusText: 'Yêu cầu sửa hợp đồng'
  },
  {
    id: 'TRN-8926',
    origin: 'Hanoi',
    destination: 'Bangkok',
    horse: 'Pegasus',
    requestedDate: '30/9/2026',
    expectedDate: '15/10/2026',
    contractStatus: 'none',
    contractStatusText: '—',
    status: 'revision_requested',
    statusText: 'Yêu cầu chỉnh sửa'
  },
  {
    id: 'TRN-8941',
    origin: 'HCMC',
    destination: 'Singapore',
    horse: 'Thunderbolt',
    requestedDate: '3/10/2026',
    expectedDate: '20/10/2026',
    contractStatus: 'ready',
    contractStatusText: 'Sẵn sàng',
    status: 'contract_ready',
    statusText: 'Hợp đồng sẵn sàng'
  },
  {
    id: 'TRN-8942',
    origin: 'Da Nang',
    destination: 'Bangkok',
    horse: 'Shadowfax',
    requestedDate: '4/10/2026',
    expectedDate: '22/10/2026',
    contractStatus: 'ready',
    contractStatusText: 'Sẵn sàng',
    status: 'deposit_verified',
    statusText: 'Đã xác minh cọc – Chờ ký'
  }
];

export const mockIncidentDetail: IncidentDetail = {
  incidentId: 'INC-FLOW5-001',
  tripId: 'TRN-8923',
  horseName: 'Thunderbolt',
  checkpointName: 'Trạm kiểm dịch Cửa khẩu Mộc Bài',
  title: 'Phát hiện chỉ số thân nhiệt bất thường tại trạm kiểm dịch (Flow 5)',
  description: 'Trong quá trình kiểm tra dịch tễ trước khi qua biên giới, cơ quan kiểm dịch ghi nhận ngựa có biểu hiện mệt do thời tiết và sốt nhẹ (39.1°C). Theo quy chuẩn an toàn thú y quốc tế, cần thực hiện quy trình xử lý sự cố cách ly theo dõi 24 giờ.',
  symptoms: [
    'Thân nhiệt tăng lên 39.1°C sau chặng đường đầu',
    'Nhịp thở nhanh hơn bình thường (24 nhịp/phút)',
    'Chưa phát hiện mầm bệnh truyền nhiễm theo test nhanh kháng nguyên'
  ],
  quarantineHours: 24,
  estimatedFee: 120,
  status: 'pending'
};

export const mockCustomerHorses: CustomerHorse[] = [
  {
    id: 'HOR-1029',
    name: 'Thunderbolt',
    breed: 'Thoroughbred',
    gender: 'Đực',
    age: 6,
    microchip: '985112004571029',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 3,
    latestRoute: 'Ho Chi Minh City → Bangkok',
    imageUrl: ''
  },
  {
    id: 'HOR-1035',
    name: 'Shadowfax',
    breed: 'Andalusian',
    gender: 'Ngựa thiến',
    age: 10,
    microchip: '985112004571035',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 2,
    latestRoute: 'Hanoi → Singapore',
    imageUrl: ''
  },
  {
    id: 'HOR-1092',
    name: 'Apollo',
    breed: 'Thoroughbred',
    gender: 'Ngựa đực giống',
    age: 5,
    microchip: '985112004571092',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 1,
    latestRoute: 'Ho Chi Minh City → Tokyo',
    imageUrl: ''
  },
  {
    id: 'HOR-1101',
    name: 'Starboy',
    breed: 'Warmblood',
    gender: 'Ngựa thiến',
    age: 8,
    microchip: '985112004571101',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 2,
    latestRoute: 'Ho Chi Minh City → Tokyo',
    imageUrl: ''
  },
  {
    id: 'HOR-1108',
    name: 'Bella',
    breed: 'Arabian',
    gender: 'Ngựa cái',
    age: 7,
    microchip: 'Chưa cung cấp',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 2,
    latestRoute: 'Ho Chi Minh City → Hanoi',
    imageUrl: ''
  },
  {
    id: 'HOR-1115',
    name: 'Pegasus',
    breed: 'Thoroughbred',
    gender: 'Đực',
    age: 4,
    microchip: '985112004571115',
    submissionStatus: 'unsubmitted',
    submissionBadgeText: 'Chưa nộp',
    profileStatus: 'Chưa nộp',
    passportScanStatus: 'Chờ bổ sung',
    medicalRecordStatus: 'Chờ bổ sung',
    usageCount: 0,
    imageUrl: ''
  }
];

export const mockTrackingCheckpoints: TrackingCheckpoint[] = [
  {
    number: 1,
    id: 'CKP-01',
    name: 'Saigon Riding Club',
    typeText: 'Điểm đi',
    type: 'origin',
    scheduledTime: '4/10, 06:00',
    confirmedTime: '4/10, 07:00',
    status: 'confirmed',
    statusBadgeText: 'Đã xác nhận',
    x: 10,
    y: 70
  },
  {
    number: 2,
    id: 'CKP-02',
    name: 'Trang Bang rest area',
    typeText: 'Điểm nghỉ',
    type: 'rest',
    scheduledTime: '4/10, 08:00',
    confirmedTime: '4/10, 08:10',
    status: 'confirmed',
    statusBadgeText: 'Đã xác nhận',
    x: 23,
    y: 80
  },
  {
    number: 3,
    id: 'CKP-03',
    name: 'Moc Bai Border Gate',
    typeText: 'Cửa khẩu',
    type: 'border',
    scheduledTime: '4/10, 10:00',
    confirmedTime: '4/10, 10:00',
    confirmedBy: 'Nguyen Van Hung',
    status: 'latest_confirmed',
    statusBadgeText: 'Đã xác nhận gần nhất',
    x: 37,
    y: 65
  },
  {
    number: 4,
    id: 'CKP-04',
    name: 'Bavet Border Gate',
    typeText: 'Cửa khẩu',
    type: 'border',
    scheduledTime: '4/10, 11:00',
    status: 'next',
    statusBadgeText: 'Tiếp theo',
    x: 50,
    y: 42
  },
  {
    number: 5,
    id: 'CKP-05',
    name: 'Phnom Penh overnight stable',
    typeText: 'Điểm nghỉ',
    type: 'rest',
    scheduledTime: '4/10, 18:00',
    status: 'planned',
    statusBadgeText: 'Dự kiến',
    x: 64,
    y: 50
  },
  {
    number: 6,
    id: 'CKP-06',
    name: 'Poipet – Aranyaprathet',
    typeText: 'Cửa khẩu',
    type: 'border',
    scheduledTime: '5/10, 13:00',
    status: 'planned',
    statusBadgeText: 'Dự kiến',
    x: 75,
    y: 72
  },
  {
    number: 7,
    id: 'CKP-07',
    name: 'Sa Kaeo fuel station',
    typeText: 'Điểm đổ nhiên liệu',
    type: 'fuel',
    scheduledTime: '5/10, 15:00',
    status: 'planned',
    statusBadgeText: 'Dự kiến',
    x: 85,
    y: 78
  },
  {
    number: 8,
    id: 'CKP-08',
    name: 'Bangkok Polo Club',
    typeText: 'Điểm đến',
    type: 'destination',
    scheduledTime: '6/10, 16:00',
    status: 'planned',
    statusBadgeText: 'Dự kiến',
    x: 94,
    y: 60
  }
];

export const mockTrackingEvents: TrackingTimelineEvent[] = [
  {
    id: 'EVT-04',
    title: 'Đã đến tại checkpoint – Moc Bai Border Gate',
    time: '4/10, 10:00',
    detail: 'Queue at the export lane.'
  },
  {
    id: 'EVT-03',
    title: 'Rời điểm dừng – Trang Bang rest area',
    time: '4/10, 08:40'
  },
  {
    id: 'EVT-02',
    title: 'Đến điểm dừng – Trang Bang rest area',
    time: '4/10, 08:10'
  },
  {
    id: 'EVT-01',
    title: 'Rời điểm đi – Saigon Riding Club',
    time: '4/10, 07:00',
    detail: 'Ngựa loaded calmly.'
  }
];

export const mockDemoControlSteps: DemoControlStep[] = [
  { stepNumber: 1, title: 'Vào giai đoạn lập kế hoạch', status: 'completed' },
  { stepNumber: 2, title: 'Quản lý xác nhận triển khai', status: 'completed' },
  { stepNumber: 3, title: 'Vào giai đoạn chuẩn bị', status: 'completed' },
  { stepNumber: 4, title: 'Hồ sơ được duyệt', status: 'completed' },
  { stepNumber: 5, title: 'Tuyến & nguồn lực sẵn sàng', status: 'completed' },
  { stepNumber: 6, title: 'Quản lý duyệt khởi hành', status: 'completed' },
  { stepNumber: 7, title: 'Vào giai đoạn vận chuyển', status: 'completed' },
  { stepNumber: 8, title: 'Tài xế tới mốc tiếp theo', status: 'active' },
  { stepNumber: 9, title: 'Tài xế tới nơi giao', status: 'pending' },
  { stepNumber: 10, title: 'Bàn giao hoàn tất', status: 'pending' },
  { stepNumber: 11, title: 'Người nhận từ chối bàn giao', status: 'pending' },
  { stepNumber: 12, title: 'Xác minh thanh toán cuối', status: 'pending' },
  { stepNumber: 13, title: 'Khách hàng xác nhận nghiệm thu', status: 'pending' },
  { stepNumber: 14, title: 'Đóng yêu cầu', status: 'pending' }
];

export const mockHistoryScenarios: HistoryScenario[] = [
  {
    id: 'TRN-8750',
    title: 'Đã đóng – hợp đồng đã hoàn thành',
    description: 'Mẫu yêu cầu đã giao, thanh toán đủ và hết 24 giờ phản hồi; hợp đồng không còn hiệu lực, chỉ xem.',
    statusText: 'Đã đóng',
    statusKey: 'closed'
  },
  {
    id: 'TRN-8943',
    title: 'Đã hủy trước khi ký – hoàn cọc',
    description: 'Đăng nhập Logistics Manager để bắt đầu xử lý hoàn tiền rồi ghi nhận đã hoàn tiền kèm mã giao dịch.',
    statusText: 'Đã hủy',
    statusKey: 'cancelled'
  },
  {
    id: 'TRN-8602',
    title: 'Đã hủy',
    description: 'Yêu cầu bị hủy, chưa có hợp đồng.',
    statusText: 'Đã hủy',
    statusKey: 'cancelled'
  },
  {
    id: 'TRN-8511',
    title: 'Bị từ chối',
    description: 'Manager từ chối kèm lý do.',
    statusText: 'Bị từ chối',
    statusKey: 'rejected'
  }
];

export const mockHistoryRequests: HistoryRequestItem[] = [
  {
    id: 'TRN-8943',
    origin: 'Da Nang',
    destination: 'Tokyo',
    horse: 'Thunderbolt',
    requestedDate: '29/9/2026',
    expectedDate: '25/10/2026',
    contractStatusText: 'Đã hủy',
    contractStatusKey: 'cancelled',
    statusText: 'Đã hủy',
    statusKey: 'cancelled',
    year: '2026'
  },
  {
    id: 'TRN-8750',
    origin: 'London',
    destination: 'Dubai',
    horse: 'Bella',
    requestedDate: '1/8/2026',
    expectedDate: '15/8/2026',
    contractStatusText: 'Đã hoàn thành – Không còn hiệu lực thực hiện',
    contractStatusKey: 'completed',
    statusText: 'Đã đóng',
    statusKey: 'closed',
    year: '2026'
  },
  {
    id: 'TRN-8602',
    origin: 'HCMC',
    destination: 'Hanoi',
    horse: 'Thunderbolt',
    requestedDate: '28/6/2026',
    expectedDate: '10/7/2026',
    contractStatusText: '—',
    contractStatusKey: 'none',
    statusText: 'Đã hủy',
    statusKey: 'cancelled',
    year: '2026'
  },
  {
    id: 'TRN-8511',
    origin: 'Bangkok',
    destination: 'HCMC',
    horse: 'Apollo',
    requestedDate: '22/5/2026',
    expectedDate: '5/6/2026',
    contractStatusText: '—',
    contractStatusKey: 'none',
    statusText: 'Bị từ chối',
    statusKey: 'rejected',
    year: '2026'
  }
];



