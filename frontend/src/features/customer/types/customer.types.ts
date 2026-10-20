export type TripStatus =
  | 'in_transit'
  | 'reviewing'
  | 'contract_ready'
  | 'waiting_manager'
  | 'scheduled'
  | 'completed'
  | 'delivered'
  | 'incident'
  | 'rejected'
  | 'revision_requested'
  | 'contract_revision_requested'
  | 'deposit_verified';

export type StatusDisplayType =
  | 'Đang vận chuyển'
  | 'Đang xét duyệt hồ sơ'
  | 'Hợp đồng sẵn sàng'
  | 'Chờ quản lý xét duyệt'
  | 'Đã lên lịch'
  | 'Đã hoàn thành'
  | 'Đã giao'
  | 'Yêu cầu chỉnh sửa'
  | 'Yêu cầu sửa hợp đồng'
  | 'Đã xác minh cọc – Chờ ký'
  | 'Sự cố kiểm dịch';

export interface CheckpointInfo {
  id: string;
  name: string;
  location: string;
  time?: string;
  expectedTime?: string;
  status: 'completed' | 'current' | 'upcoming';
  description?: string;
}

export interface CurrentTrip {
  id: string;
  requestId: string;
  horse: string;
  origin: string;
  destination: string;
  departedDate: string;
  eta: string;
  lastMilestone: string;
  milestoneTime: string;
  progress: number;
  status: TripStatus;
  statusText: string;
  checkpoints?: CheckpointInfo[];
  telemetry?: {
    temperature: string;
    heartRate: string;
    waterIntake: string;
    lat: number;
    lng: number;
  };
}

export interface CustomerNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type?: 'urgent' | 'email' | 'info' | 'incident';
  actionable?: boolean;
  incidentFlow?: boolean;
}

export interface RecentRequest {
  id: string;
  origin: string;
  destination: string;
  horses: string;
  requestedDate: string;
  status: TripStatus;
  statusText: StatusDisplayType;
}

export interface TransportRequestItem {
  id: string;
  origin: string;
  destination: string;
  horse: string;
  requestedDate: string;
  expectedDate: string;
  contractStatus: 'active' | 'ready' | 'none';
  contractStatusText: 'Có hiệu lực' | 'Sẵn sàng' | '—';
  status: TripStatus | string;
  statusText: StatusDisplayType | string;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  statusText: string;
  statusKey: string;
}

export interface IncidentDetail {
  incidentId: string;
  tripId: string;
  horseName: string;
  checkpointName: string;
  title: string;
  description: string;
  symptoms: string[];
  quarantineHours: number;
  estimatedFee: number;
  status: 'pending' | 'resolved' | 'escalated';
}

export interface CustomerHorse {
  id: string;
  name: string;
  breed: string;
  gender: string;
  age: number;
  microchip: string;
  submissionStatus: 'submitted' | 'unsubmitted';
  submissionBadgeText: string;
  profileStatus: string;
  passportScanStatus: string;
  medicalRecordStatus: string;
  usageCount: number;
  latestRoute?: string;
  imageUrl?: string;
}

export interface TrackingCheckpoint {
  number: number;
  id: string;
  name: string;
  typeText: string;
  type: 'origin' | 'rest' | 'border' | 'fuel' | 'destination';
  scheduledTime: string;
  confirmedTime?: string;
  confirmedBy?: string;
  status: 'confirmed' | 'latest_confirmed' | 'next' | 'planned';
  statusBadgeText: string;
  x: number;
  y: number;
}

export interface TrackingTimelineEvent {
  id: string;
  title: string;
  time: string;
  detail?: string;
}

export interface DemoControlStep {
  stepNumber: number;
  title: string;
  status: 'completed' | 'active' | 'pending';
}

export interface HistoryRequestItem {
  id: string;
  origin: string;
  destination: string;
  horse: string;
  requestedDate: string;
  expectedDate: string;
  contractStatusText: string;
  contractStatusKey?: string;
  statusText: string;
  statusKey: string;
  year?: string;
}

export interface HistoryScenario {
  id: string;
  title: string;
  description: string;
  statusText: string;
  statusKey: string;
}



