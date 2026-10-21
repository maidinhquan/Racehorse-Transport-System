export type DetailRequestStatus =
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

export interface RequestHorse {
  id: string;
  name: string;
  breed: string;
  sex: string;
}

export interface RequestDocument {
  id: number;
  name: string;
  status:
    | "Approved"
    | "Pending Review"
    | "Action Required"
    | "Completed";
}

export interface RequestProgress {
  id: number;
  label: string;
  status: "completed" | "current" | "upcoming";
}

export interface TransportRequestDetail {
  id: string;

  status: DetailRequestStatus;

  origin: string;
  destination: string;

  requestedDate: string;
  preferredDate: string;

  estimatedPrice: number;

  horseCount: number;

  horses: RequestHorse[];

  contract?: {
    number: string;
    status: "Preparing" | "Ready" | "Signed";
    finalPrice?: number;
  };

  documents: RequestDocument[];

  progress: RequestProgress[];

  managerFeedback?: string;

  pickupWindow?: string;

  eta?: string;
}

export const transportRequestDetails: TransportRequestDetail[] = [
  {
    id: "TR-2026-0148",

    status: "In Transit",

    origin: "Ho Chi Minh City",
    destination: "Bangkok",

    requestedDate: "2026-09-28",
    preferredDate: "2026-10-05",

    estimatedPrice: 2450,

    horseCount: 1,

    horses: [
      {
        id: "HOR-1029",
        name: "Thunderbolt",
        breed: "Thoroughbred",
        sex: "Male",
      },
    ],

    contract: {
      number: "CTR-2026-0148",
      status: "Signed",
      finalPrice: 2600,
    },

    documents: [
      {
        id: 1,
        name: "Equine Passport",
        status: "Approved",
      },
      {
        id: 2,
        name: "Health Certificate",
        status: "Approved",
      },
      {
        id: 3,
        name: "Vaccination Record",
        status: "Approved",
      },
      {
        id: 4,
        name: "Import Permit",
        status: "Completed",
      },
    ],

    progress: [
      {
        id: 1,
        label: "Request Submitted",
        status: "completed",
      },
      {
        id: 2,
        label: "Request Accepted",
        status: "completed",
      },
      {
        id: 3,
        label: "Contract Signed",
        status: "completed",
      },
      {
        id: 4,
        label: "Deposit Paid",
        status: "completed",
      },
      {
        id: 5,
        label: "Information Submitted",
        status: "completed",
      },
      {
        id: 6,
        label: "Scheduled",
        status: "completed",
      },
      {
        id: 7,
        label: "In Transit",
        status: "current",
      },
      {
        id: 8,
        label: "Completed",
        status: "upcoming",
      },
    ],

    pickupWindow: "05 Oct 2026 • 06:00 – 08:00",

    eta: "08 Oct 2026",
  },

  {
    id: "TR-2026-0152",

    status: "Documents Under Review",

    origin: "Hanoi",
    destination: "Singapore",

    requestedDate: "2026-10-01",
    preferredDate: "2026-10-12",

    estimatedPrice: 3100,

    horseCount: 1,

    horses: [
      {
        id: "HOR-1035",
        name: "Shadowfax",
        breed: "Andalusian",
        sex: "Gelding",
      },
    ],

    contract: {
      number: "CTR-2026-0152",
      status: "Signed",
      finalPrice: 3250,
    },

    documents: [
      {
        id: 1,
        name: "Equine Passport",
        status: "Approved",
      },
      {
        id: 2,
        name: "Medical Record",
        status: "Action Required",
      },
      {
        id: 3,
        name: "Import Permit",
        status: "Pending Review",
      },
    ],

    progress: [
      {
        id: 1,
        label: "Request Submitted",
        status: "completed",
      },
      {
        id: 2,
        label: "Request Accepted",
        status: "completed",
      },
      {
        id: 3,
        label: "Contract Signed",
        status: "completed",
      },
      {
        id: 4,
        label: "Deposit Paid",
        status: "completed",
      },
      {
        id: 5,
        label: "Information Submitted",
        status: "completed",
      },
      {
        id: 6,
        label: "Documents Under Review",
        status: "current",
      },
      {
        id: 7,
        label: "Scheduled",
        status: "upcoming",
      },
      {
        id: 8,
        label: "In Transit",
        status: "upcoming",
      },
    ],
  },

  {
    id: "TR-2026-0156",

    status: "Contract Ready",

    origin: "Da Nang",
    destination: "Kuala Lumpur",

    requestedDate: "2026-10-03",
    preferredDate: "2026-10-18",

    estimatedPrice: 2900,

    horseCount: 1,

    horses: [],

    contract: {
      number: "CTR-2026-0156",
      status: "Ready",
      finalPrice: 3050,
    },

    documents: [],

    progress: [
      {
        id: 1,
        label: "Request Submitted",
        status: "completed",
      },
      {
        id: 2,
        label: "Request Accepted",
        status: "completed",
      },
      {
        id: 3,
        label: "Contract Ready",
        status: "current",
      },
      {
        id: 4,
        label: "Contract Signed",
        status: "upcoming",
      },
      {
        id: 5,
        label: "Information Submitted",
        status: "upcoming",
      },
    ],
  },

  {
    id: "TR-2026-0160",

    status: "Waiting for Manager Review",

    origin: "Ho Chi Minh City",
    destination: "Phnom Penh",

    requestedDate: "2026-10-05",
    preferredDate: "2026-10-22",

    estimatedPrice: 3100,

    horseCount: 2,

    horses: [],

    documents: [],

    progress: [
      {
        id: 1,
        label: "Request Submitted",
        status: "current",
      },
      {
        id: 2,
        label: "Request Accepted",
        status: "upcoming",
      },
      {
        id: 3,
        label: "Contract Ready",
        status: "upcoming",
      },
      {
        id: 4,
        label: "Information Submitted",
        status: "upcoming",
      },
    ],
  },

  {
    id: "TR-2026-JP01",

    status: "Information Required",

    origin: "Ho Chi Minh City",
    destination: "Tokyo (Japan)",

    requestedDate: "2026-10-10",
    preferredDate: "2026-10-28",

    estimatedPrice: 5800,

    horseCount: 1,

    horses: [
      {
        id: "HOR-1029",
        name: "Thunderbolt",
        breed: "Thoroughbred",
        sex: "Male",
      },
    ],

    contract: {
      number: "CTR-2026-JP01",
      status: "Signed",
      finalPrice: 6200,
    },

    documents: [
      {
        id: 1,
        name: "Equine Passport",
        status: "Approved",
      },
      {
        id: 2,
        name: "Phiếu yêu cầu xét nghiệm y tế & 4 bệnh máu",
        status: "Action Required",
      },
      {
        id: 3,
        name: "Giấy chứng nhận cách ly tại VN (>= 7 ngày)",
        status: "Pending Review",
      },
      {
        id: 4,
        name: "AQS Japan Quarantine Confirmation",
        status: "Pending Review",
      },
    ],

    progress: [
      {
        id: 1,
        label: "Request Submitted",
        status: "completed",
      },
      {
        id: 2,
        label: "Request Accepted",
        status: "completed",
      },
      {
        id: 3,
        label: "Contract Signed",
        status: "completed",
      },
      {
        id: 4,
        label: "Deposit Paid",
        status: "completed",
      },
      {
        id: 5,
        label: "Information Required",
        status: "current",
      },
      {
        id: 6,
        label: "Documents Under Review",
        status: "upcoming",
      },
      {
        id: 7,
        label: "Scheduled",
        status: "upcoming",
      },
      {
        id: 8,
        label: "In Transit",
        status: "upcoming",
      },
    ],
  },
];