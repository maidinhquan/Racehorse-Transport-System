export type ManagerNav =
  | 'overview'
  | 'requests'
  | 'contracts'
  | 'payments'
  | 'trips'
  | 'reports';

export type RequestStatus =
  | 'PENDING'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'AWAITING_CONTRACT'
  | 'AWAITING_DEPOSIT'
  | 'ACTIVATED'
  | 'IN_TRANSIT'
  | 'REVIEWING'
  | 'CONTRACT_READY'
  | 'DELIVERED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED';

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'SIGN_DECLINED'
  | 'SIGNED'
  | 'EFFECTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

export type TransportMode = 'AIR' | 'ROAD' | 'COMBINED';

export interface HorseItem {
  id: number;
  name: string;
  breed: string;
  age: number;
  microchipId: string;
  documents: {
    passport: boolean;
    quarantineCert: boolean;
    bloodTest: boolean;
    ownershipCert: boolean;
  };
}

export interface TransportRequestItem {
  id: string; // e.g., 'TRN-8930'
  customerName: string;
  contactPerson: string;
  phone: string;
  email: string;
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  routeDisplay: string; // e.g. "HCMC → Tokyo"
  departureDate: string; // '10/10/2026'
  departureDateRaw: string; // '2026-10-10'
  daysRemainingText: string; // 'in 6 ngày'
  daysRemaining: number;
  deliveryDeadline: string;
  transportMode: TransportMode;
  horses: HorseItem[];
  status: RequestStatus;
  statusLabel: string;
  createdAt: string;
  specialRequirements?: string;
  contractId?: string;
  totalEstimatedCost?: number;
}

export interface PricingLineItem {
  id: string;
  category: 'TRANSPORT' | 'PROCEDURE' | 'VETERINARY_CARE' | 'INSURANCE' | 'OTHER';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  mandatory?: boolean;
}

export interface ContractItem {
  id: string; // e.g. 'CT-8923 v1'
  version: number;
  requestId: string;
  customerName: string;
  contactPerson?: string;
  routeDisplay?: string;
  currency?: 'VND' | 'USD';
  items?: PricingLineItem[];
  totalAmount?: number;
  price?: number;
  suggestedTotal?: number;
  floorPrice?: number;
  isBelowFloor?: boolean;
  priceOverrideReason?: string;
  depositPercent?: number; // e.g. 40
  depositAmount?: number;
  completionDeadline?: string; // ISO date string or formatted
  depositDeadline?: string; // '5/10, 09:00'
  depositDeadlineRemaining?: string; // 'còn 20 giờ 37 phút' or 'Hết hạn'
  status: ContractStatus;
  statusLabel: string;
  depositStatusLabel?: string;
  includedServices?: string[];
  excludedServices?: string[];
  customTerms?: string;
  createdAt?: string;
}

export interface BankTransferTransaction {
  transactionId: string; // 'TX-741'
  requestId: string; // 'TRN-8937'
  contractId: string;
  contractVersion?: string; // 'v1'
  customerName: string;
  contactPerson?: string;
  paymentType?: string; // 'Tiền cọc' | 'Thanh toán cuối'
  method: 'BANK_TRANSFER' | 'VNPAY';
  declaredAmount: number;
  expectedDepositAmount: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  bankReference: string;
  receiptUrl?: string;
  attachmentName?: string;
  paidAt: string;
  createdAt: string;
  status: 'PENDING_CONFIRMATION' | 'SUCCESS' | 'REJECTED' | 'PROCESSING';
  confirmedAmount?: number;
  confirmedAt?: string;
  rejectReason?: string;
  statusSubtext?: string;
}

export interface DeadlineOverdueItem {
  requestId: string;
  customerName: string;
  contactPerson?: string;
  routeDisplay?: string;
  contractStatus?: ContractStatus;
  completionDeadline: string;
  daysExpired?: number;
  isGracePeriodEnded?: boolean;
  depositOutstanding: number;
  currency: string;
  reminderStatus?: string; // e.g. '0 of 3 post-expiry reminders', 'Đã gửi 3/3'
  verificationStatus?: string; // e.g. 'Đang xác minh', '—'
  expirySubtext?: string; // e.g. '1 working days since expiry'
}

export interface AlertItem {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  bulletColor: 'orange' | 'red' | 'blue';
  title: string;
  subtitle: string;
  requestId?: string;
  linkNav?: ManagerNav;
  dateBadge?: string;
  highlighted?: boolean;
}

export interface ManagerNotificationItem {
  id: string;
  title: string;
  subtitle: string;
  timeText: string;
  read: boolean;
  bulletColor: 'blue' | 'orange' | 'red' | 'green';
  requestId?: string;
  tripId?: string;
}

export interface ActiveTripItem {
  id: string; // 'TRP-901'
  associatedRequestId?: string; // 'TRN-8923'
  route: string;
  status: string;
  statusClass: string;
  eta?: string;
  lastUpdated: string;
  driverEscort?: string;
}

export interface ManagerTripItem {
  id: string; // 'TRP-905'
  requestId: string; // 'TRN-8939'
  customerName: string;
  contactPerson?: string;
  route: string;
  transportMode: 'Đường bộ' | 'Hàng không' | 'Kết hợp';
  horsesCount: number;
  departureTime: string;
  eta: string;
  routeApprovalStatus: 'NOT_STARTED' | 'APPROVED' | 'DRAFT';
  routeApprovalLabel: string; // 'Chưa bắt đầu', 'v1 Đã duyệt', 'v1 Bản nháp', 'v2 Đã duyệt'
  resourceStatus: string; // '6 việc còn mở', '9 việc còn mở', '—'
  deploymentStatus: 'PENDING' | 'CONFIRMED' | 'PAUSED';
  tripStatus: string;
  driverName?: string;
  vehiclePlate?: string;
  vetName?: string;
}

export interface TripCostReportItem {
  tripId: string; // 'TRP-901'
  requestId: string; // 'TRN-8923'
  status: string; // 'Đang vận chuyển' | 'Đã hoàn tất'
  revenue: number; // 1850
  budget: number; // 1480
  actualCost: number; // 1028
  variance: number; // -452
  incidentalCostText?: string; // 'Flat tyre repair: $35 (Công ty)'
}

export interface ManagerMetrics {
  pendingReviewCount: number;
  pendingReviewSubtext: string;
  pendingContractCount: number;
  pendingContractSubtext: string;
  awaitingSignatureCount: number;
  awaitingSignatureSubtext: string;
  verifyDepositCount: number;
  verifyDepositSubtext: string;
  preparationCount: number;
  preparationSubtext: string;
  activeTripsCount: number;
  activeTripsSubtext: string;
  incidentsCount: number;
  incidentsSubtext: string;
  handoverCount: number;
  handoverSubtext: string;
}
