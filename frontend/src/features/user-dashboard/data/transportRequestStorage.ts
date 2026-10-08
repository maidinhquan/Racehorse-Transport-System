export type FakeRequestStatus =
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
  | "Rejected";

export interface FakeTransportRequest {
  id: string;

  origin: string;
  destination: string;

  requestedDate: string;
  preferredDate: string;

  horseCount: number;

  estimatedPrice: number;

  status: FakeRequestStatus;
}

const STORAGE_KEY =
  "cbn_transport_requests";

const defaultRequests: FakeTransportRequest[] = [
  {
    id: "TR-2026-0148",

    origin: "Ho Chi Minh City",
    destination: "Bangkok",

    requestedDate: "2026-09-28",
    preferredDate: "2026-10-05",

    horseCount: 1,

    estimatedPrice: 2450,

    status: "In Transit",
  },

  {
    id: "TR-2026-0152",

    origin: "Hanoi",
    destination: "Singapore",

    requestedDate: "2026-10-01",
    preferredDate: "2026-10-12",

    horseCount: 1,

    estimatedPrice: 3100,

    status: "Documents Under Review",
  },
];

export function getRequests(): FakeTransportRequest[] {
  const saved =
    localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(defaultRequests)
    );

    return defaultRequests;
  }

  return JSON.parse(saved);
}

export function getRequestById(
  id: string
) {
  return getRequests().find(
    (request) => request.id === id
  );
}

export function saveRequests(
  requests: FakeTransportRequest[]
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(requests)
  );
}

export function createRequest(
  data: Omit<
    FakeTransportRequest,
    "id" | "requestedDate" | "status"
  >
) {
  const requests = getRequests();

  const id =
    "TR-DEMO-" +
    Date.now()
      .toString()
      .slice(-6);

  const newRequest: FakeTransportRequest = {
    ...data,

    id,

    requestedDate: new Date()
      .toISOString()
      .slice(0, 10),

    status:
      "Waiting for Manager Review",
  };

  saveRequests([
    newRequest,
    ...requests,
  ]);

  return newRequest;
}

export function updateRequestStatus(
  id: string,
  status: FakeRequestStatus
) {
  const requests = getRequests();

  const updated = requests.map(
    (request) =>
      request.id === id
        ? {
            ...request,
            status,
          }
        : request
  );

  saveRequests(updated);
}

export function resetDemoRequests() {
  localStorage.removeItem(
    STORAGE_KEY
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      defaultRequests
    )
  );
}