export type OperationsRole = 'manager' | 'specialist' | 'coordinator' | 'driver';
export interface TimedDocuments {
  tripId: string; version: number; required: boolean; status: 'DRAFT' | 'SENT' | 'SCHEDULED';
  items: Array<{ typeId: string; name: string; horseId: string; leadDays: number; validityDays: number }>;
  earliestDeparture: string; plannedDepart: string; sentAt: string; scheduledAt: string;
}
export interface IncidentPlan { id: string; kind: string; desc: string; cost: number; payer: 'COMPANY' | 'CUSTOMER' | 'INSURANCE'; status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; at: string }
export interface OperationsIncident {
  id: string; tripId: string; requestId: string; type: 'VEHICLE_BREAKDOWN' | 'BORDER_DELAY' | 'BAD_WEATHER' | 'TRAFFIC_ACCIDENT' | 'HORSE_HEALTH' | 'CUSTOMS_HOLD' | 'ROAD_CLOSURE' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; status: 'NEW' | 'IN_PROGRESS' | 'PLAN_APPROVED' | 'CLOSED'; at: string; by: string;
  location: string; description: string; safety: string; plans: IncidentPlan[];
}
export type IncidentReport = Pick<OperationsIncident, 'tripId' | 'type' | 'severity' | 'location' | 'description' | 'safety'> & { safetyConfirmed: true };
export interface OperationsComplaint {
  id: string; requestId: string; horseId?: string; type: 'HORSE_CONDITION' | 'DELAY' | 'SERVICE' | 'BILLING'; title: string; description: string;
  status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'PROPOSED' | 'ESCALATED' | 'PENDING_CUSTOMER_CONFIRMATION' | 'RESOLVED' | 'CLOSED'; createdAt: string;
  messages: Array<{ from: 'CUSTOMER' | 'MANAGER'; name: string; at: string; text: string }>;
  resolution?: { proposal: string; amount: number };
  settlement?: { status: 'PENDING' | 'APPLIED'; amount: number; note?: string; appliedAt?: string };
}
export interface SettlementSummary {
  requestId: string; invoiceId: string; currency: 'VND'; contractTotal: number; depositPaid: number; balancePaid: number;
  adjustments: Array<{ complaintId: string; amount: number; note: string; appliedAt: string }>;
  pendingAdjustments: Array<{ complaintId: string; amount: number }>; outstanding: number; canPay: boolean;
}
export interface RequestCases { requestId: string; incidents: OperationsIncident[]; complaints: OperationsComplaint[] }
export interface ServerAcceptance { status: 'PENDING' | 'ACCEPTED'; openedAt: string; dueAt: string; decidedAt?: string }
