export type RequestStatus =
  | "Waiting for Manager Review"
  | "Changes Requested"
  | "Accepted – Contract Preparation"
  | "Contract Ready"
  | "Awaiting Deposit"
  | "Information Required"
  | "Information Submitted"
  | "Documents Under Review"
  | "Scheduled"
  | "In Transit"
  | "Completed"
  | "Cancelled"
  | "Rejected";

export type ContractStatus =
  | "Not Available"
  | "Preparing"
  | "Ready"
  | "Signed";

export interface TransportRequest {
  id: string;
  origin: string;
  destination: string;
  horses: string[];
  requestedDate: string;
  preferredDate: string;
  contractStatus: ContractStatus;
  status: RequestStatus;
}

export const requestStatuses: RequestStatus[] = [
  "Waiting for Manager Review",
  "Changes Requested",
  "Accepted – Contract Preparation",
  "Contract Ready",
  "Awaiting Deposit",
  "Information Required",
  "Information Submitted",
  "Documents Under Review",
  "Scheduled",
  "In Transit",
];

export const transportRequests: TransportRequest[] = [
  {
    id: "TR-2026-0148",
    origin: "Ho Chi Minh City",
    destination: "Bangkok",
    horses: ["Thunderbolt"],
    requestedDate: "2026-09-28",
    preferredDate: "2026-10-05",
    contractStatus: "Signed",
    status: "In Transit",
  },
  {
    id: "TR-2026-0152",
    origin: "Hanoi",
    destination: "Singapore",
    horses: ["Shadowfax"],
    requestedDate: "2026-10-01",
    preferredDate: "2026-10-12",
    contractStatus: "Signed",
    status: "Documents Under Review",
  },
  {
    id: "TR-2026-0156",
    origin: "Da Nang",
    destination: "Kuala Lumpur",
    horses: ["Apollo"],
    requestedDate: "2026-10-03",
    preferredDate: "2026-10-18",
    contractStatus: "Ready",
    status: "Contract Ready",
  },
  {
    id: "TR-2026-0160",
    origin: "Ho Chi Minh City",
    destination: "Phnom Penh",
    horses: ["Thunderbolt", "Apollo"],
    requestedDate: "2026-10-05",
    preferredDate: "2026-10-22",
    contractStatus: "Not Available",
    status: "Waiting for Manager Review",
  },
];