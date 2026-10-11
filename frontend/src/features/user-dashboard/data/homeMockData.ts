export type DocumentStatus =
  | "Approved"
  | "Action Required"
  | "Pending Review"
  | "Processing";

export type RequestStatus =
  | "In Transit"
  | "Scheduled"
  | "Documents Under Review"
  | "Waiting for Manager Review";

export interface CurrentTrip {
  id: string;
  horse: string;
  origin: string;
  destination: string;
  departedDate: string;
  eta: string;
  currentLocation: string;
  progress: number;
}

export interface DocumentItem {
  id: number;
  name: string;
  horseName: string;
  requestId: string;
  status: DocumentStatus;
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
  id: "TR-2026-0148",
  horse: "Thunderbolt",
  origin: "Ho Chi Minh City",
  destination: "Bangkok",
  departedDate: "2026-10-05",
  eta: "2026-10-08",
  currentLocation: "Phnom Penh, Cambodia",
  progress: 64,
};

export const documents: DocumentItem[] = [
  {
    id: 1,
    name: "Health Certificate",
    horseName: "Thunderbolt",
    requestId: "TR-2026-0148",
    status: "Approved",
  },
  {
    id: 2,
    name: "Import Permit",
    horseName: "Thunderbolt",
    requestId: "TR-2026-0148",
    status: "Pending Review",
  },
  {
    id: 3,
    name: "Vaccination Record",
    horseName: "Shadowfax",
    requestId: "TR-2026-0152",
    status: "Action Required",
  },
];

export const recentRequests: RecentRequest[] = [
  {
    id: "TR-2026-0148",
    origin: "Ho Chi Minh City",
    destination: "Bangkok",
    horses: "Thunderbolt",
    requestedDate: "2026-09-28",
    status: "In Transit",
  },
  {
    id: "TR-2026-0152",
    origin: "Hanoi",
    destination: "Singapore",
    horses: "Shadowfax",
    requestedDate: "2026-10-01",
    status: "Documents Under Review",
  },
  {
    id: "TR-2026-0156",
    origin: "Da Nang",
    destination: "Kuala Lumpur",
    horses: "Apollo",
    requestedDate: "2026-10-03",
    status: "Scheduled",
  },
  {
    id: "TR-2026-0160",
    origin: "Ho Chi Minh City",
    destination: "Phnom Penh",
    horses: "Thunderbolt, Apollo",
    requestedDate: "2026-10-05",
    status: "Waiting for Manager Review",
  },
];