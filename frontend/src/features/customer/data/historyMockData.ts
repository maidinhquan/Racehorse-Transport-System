export type HistoryStatus =
  | "Completed"
  | "Cancelled"
  | "Rejected";

export interface TransportHistory {
  id: string;

  horses: string[];

  origin: string;
  destination: string;

  departureDate: string;
  arrivalDate?: string;

  status: HistoryStatus;
}

export const transportHistory: TransportHistory[] = [
  {
    id: "TR-2026-0102",

    horses: ["Thunderbolt"],

    origin: "Ho Chi Minh City",
    destination: "Bangkok",

    departureDate: "2026-07-12",
    arrivalDate: "2026-07-14",

    status: "Completed",
  },

  {
    id: "TR-2026-0087",

    horses: ["Apollo"],

    origin: "Sydney",
    destination: "Ho Chi Minh City",

    departureDate: "2026-05-20",
    arrivalDate: "2026-05-22",

    status: "Completed",
  },

  {
    id: "TR-2026-0064",

    horses: ["Shadowfax"],

    origin: "Hanoi",
    destination: "Ho Chi Minh City",

    departureDate: "2026-03-08",
    arrivalDate: "2026-03-10",

    status: "Completed",
  },

  {
    id: "TR-2026-0041",

    horses: ["Thunderbolt", "Apollo"],

    origin: "Da Nang",
    destination: "Singapore",

    departureDate: "2026-01-18",

    status: "Cancelled",
  },

  {
    id: "TR-2025-0218",

    horses: ["Shadowfax"],

    origin: "Ho Chi Minh City",
    destination: "Kuala Lumpur",

    departureDate: "2025-11-22",
    arrivalDate: "2025-11-25",

    status: "Completed",
  },

  {
    id: "TR-2025-0175",

    horses: ["Apollo"],

    origin: "Hanoi",
    destination: "Bangkok",

    departureDate: "2025-08-14",

    status: "Rejected",
  },
];