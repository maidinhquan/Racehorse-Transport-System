export type DocumentStatus =
  | "Approved"
  | "Action Required"
  | "Pending Review"
  | "Processing";

export type RequestStatus =
  | "In Transit"
  | "Scheduled"
  | "Documents Under Review"
  | "Waiting for Manager Review"
  | "Completed"
  | "Rejected";

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
}

export interface CustomerNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type?: "urgent" | "email" | "info";
}

export interface RecentRequest {
  id: string;
  origin: string;
  destination: string;
  horses: string;
  requestedDate: string;
  status: RequestStatus;
}

export const currentTrip: CurrentTrip = {
  id: "TRIP-8810",
  requestId: "TRN-8810",
  horse: "Thunderbolt",
  origin: "Ho Chi Minh City",
  destination: "Bangkok",
  departedDate: "4/10, 07:00",
  eta: "6/10, 16:00",
  lastMilestone: "Đã đến tại checkpoint – Moc Bai Border Gate",
  milestoneTime: "4/10, 10:00",
  progress: 58,
};

export const customerNotifications: CustomerNotification[] = [
  {
    id: "notif-1",
    title: "Flow 4 common 24-hour window overdue • TRN-8810",
    body: "$1,295 was due by 2/10, 14:30. Please pay with VNPay or contact CBN Transport.",
    time: "4/10, 11:30",
    read: false,
    type: "urgent",
  },
  {
    id: "notif-2",
    title: "E-mail: Unpaid deposit after shared deadline – workday 1/3 for CT-8927 v1. Contact CBN Transport; no automatic cancellation",
    body: "Đã gửi tới alex.equine@example.com (email mô phỏng)",
    time: "4/10, 11:30",
    read: false,
    type: "email",
  },
  {
    id: "notif-3",
    title: "E-mail: Unpaid deposit after shared deadline – workday 2/3 for CT-8927 v1. Contact CBN Transport; no automatic cancellation",
    body: "Đã gửi tới alex.equine@example.com (email mô phỏng)",
    time: "4/10, 11:30",
    read: false,
    type: "email",
  },
  {
    id: "notif-4",
    title: "Yêu cầu TRN-8890 đã được tiếp nhận",
    body: "Quản lý logistics đang xem xét yêu cầu vận chuyển từ Hanoi đi Da Nang.",
    time: "3/10, 15:00",
    read: true,
    type: "info",
  },
  {
    id: "notif-5",
    title: "Hợp đồng dịch vụ TRN-8927 đã sẵn sàng",
    body: "Vui lòng xem và ký hợp đồng vận chuyển cho ngựa Shadowfax.",
    time: "2/10, 09:20",
    read: true,
    type: "info",
  },
];

export const recentRequests: RecentRequest[] = [
  {
    id: "TRN-8810",
    origin: "Ho Chi Minh City",
    destination: "Bangkok",
    horses: "Thunderbolt",
    requestedDate: "2026-10-01",
    status: "In Transit",
  },
  {
    id: "TRN-8927",
    origin: "Hanoi",
    destination: "Singapore",
    horses: "Shadowfax",
    requestedDate: "2026-10-02",
    status: "Documents Under Review",
  },
  {
    id: "TRN-8890",
    origin: "Da Nang",
    destination: "Kuala Lumpur",
    horses: "Apollo",
    requestedDate: "2026-10-03",
    status: "Scheduled",
  },
  {
    id: "TRN-8750",
    origin: "Ho Chi Minh City",
    destination: "Phnom Penh",
    horses: "Thunderbolt, Apollo",
    requestedDate: "2026-09-15",
    status: "Completed",
  },
];