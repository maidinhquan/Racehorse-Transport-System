export type ManagerNav =
  | 'overview'
  | 'requests'
  | 'contracts'
  | 'payments';

export type RequestStatus =
  | 'PENDING'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'AWAITING_CONTRACT'
  | 'AWAITING_DEPOSIT'
  | 'ACTIVATED'
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
  id: number | string;
  name: string;
  breed: string;
  age: number | null;
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
  declaredValueUsd?: number | null;
  baselineDocuments?: { documentId: string; horseId: string; documentType: string; status: string }[];
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
  id: string; // e.g. 'CTR-8932'
  version: number | string;
  requestId: string;
  customerName: string;
  routeDisplay: string;
  currency: 'VND' | 'USD';
  items: PricingLineItem[];
  totalAmount: number;
  suggestedTotal: number;
  floorPrice: number;
  isBelowFloor: boolean;
  priceOverrideReason?: string;
  depositPercent: number; // e.g. 40
  depositAmount: number;
  completionDeadline: string; // ISO date string or formatted
  status: ContractStatus;
  statusLabel: string;
  includedServices: string[];
  excludedServices: string[];
  customTerms: string;
  createdAt: string;
}

export interface BankTransferTransaction {
  transactionId: string; // 'TXN-504'
  requestId: string; // 'TRN-8932'
  contractId: string;
  customerName: string;
  method: 'BANK_TRANSFER' | 'VNPAY';
  declaredAmount: number;
  expectedDepositAmount: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  bankReference: string;
  receiptUrl?: string;
  paidAt: string;
  createdAt: string;
  status: 'PENDING_CONFIRMATION' | 'SUCCESS' | 'REJECTED' | 'PENDING' | 'FAILED';
  statusLabel?: string;
  confirmedAmount?: number;
  confirmedAt?: string;
  rejectReason?: string;
}

export interface DeadlineOverdueItem {
  requestId: string;
  customerName: string;
  routeDisplay: string;
  contractStatus: ContractStatus;
  completionDeadline: string;
  daysExpired: number;
  isGracePeriodEnded: boolean;
  depositOutstanding: number;
  currency: string;
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
}

export interface ActiveTripItem {
  id: string; // 'TRP-2026'
  route: string;
  status: string;
  statusClass: string;
  eta: string;
  lastUpdated: string;
  driverEscort: string;
}
