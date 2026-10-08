export interface JourneyStep {
  id: number;
  name: string;
  status: "completed" | "current" | "upcoming";
}

export interface TrackingUpdate {
  id: number;
  title: string;
  description: string;
  time: string;
  status: "completed" | "current" | "warning";
}

export interface TripTracking {
  id: string;

  horseName: string;

  origin: string;
  destination: string;

  status: "In Transit";

  currentStatus: string;
  currentPlace: string;
  currentLocation: string;

  departureDate: string;
  estimatedArrival: string;

  lastUpdate: string;

  progress: number;

  journeySteps: JourneyStep[];

  updates: TrackingUpdate[];
}

export const trackingTrips: TripTracking[] = [
  {
    id: "TR-2026-0148",

    horseName: "Thunderbolt",

    origin: "Ho Chi Minh City",
    destination: "Bangkok",

    status: "In Transit",

    currentStatus: "Border Transit",
    currentPlace: "Poipet Border Checkpoint",
    currentLocation: "Poipet, Cambodia",

    departureDate: "2026-10-05",
    estimatedArrival: "2026-10-08",

    lastUpdate: "15 minutes ago",

    progress: 68,

    journeySteps: [
      {
        id: 1,
        name: "Horse Pickup",
        status: "completed",
      },
      {
        id: 2,
        name: "Vet Inspection",
        status: "completed",
      },
      {
        id: 3,
        name: "Export Customs",
        status: "completed",
      },
      {
        id: 4,
        name: "Border Transit",
        status: "current",
      },
      {
        id: 5,
        name: "Import Customs",
        status: "upcoming",
      },
      {
        id: 6,
        name: "Final Delivery",
        status: "upcoming",
      },
    ],

    updates: [
      {
        id: 1,
        title: "Arrived at border checkpoint",
        description:
          "Vehicle arrived at Poipet Border Checkpoint.",
        time: "07 Oct 2026 • 14:45",
        status: "current",
      },
      {
        id: 2,
        title: "Export customs completed",
        description:
          "Export documents were cleared successfully.",
        time: "07 Oct 2026 • 11:30",
        status: "completed",
      },
      {
        id: 3,
        title: "Veterinary inspection completed",
        description:
          "Horse health inspection completed successfully.",
        time: "06 Oct 2026 • 16:20",
        status: "completed",
      },
      {
        id: 4,
        title: "Horse picked up",
        description:
          "Thunderbolt was picked up successfully.",
        time: "05 Oct 2026 • 07:15",
        status: "completed",
      },
    ],
  },

  {
    id: "TR-2026-0172",

    horseName: "Apollo",

    origin: "Hanoi",
    destination: "Singapore",

    status: "In Transit",

    currentStatus: "International Transit",
    currentPlace: "Noi Bai Cargo Terminal",
    currentLocation: "Hanoi, Vietnam",

    departureDate: "2026-10-07",
    estimatedArrival: "2026-10-09",

    lastUpdate: "40 minutes ago",

    progress: 35,

    journeySteps: [
      {
        id: 1,
        name: "Horse Pickup",
        status: "completed",
      },
      {
        id: 2,
        name: "Vet Inspection",
        status: "completed",
      },
      {
        id: 3,
        name: "Export Customs",
        status: "current",
      },
      {
        id: 4,
        name: "International Transit",
        status: "upcoming",
      },
      {
        id: 5,
        name: "Import Customs",
        status: "upcoming",
      },
      {
        id: 6,
        name: "Final Delivery",
        status: "upcoming",
      },
    ],

    updates: [
      {
        id: 1,
        title: "Export customs processing",
        description:
          "Export customs documents are being reviewed.",
        time: "07 Oct 2026 • 15:10",
        status: "current",
      },
      {
        id: 2,
        title: "Veterinary inspection completed",
        description:
          "Health check completed successfully.",
        time: "07 Oct 2026 • 12:20",
        status: "completed",
      },
      {
        id: 3,
        title: "Horse picked up",
        description:
          "Apollo was transported to the cargo terminal.",
        time: "07 Oct 2026 • 08:00",
        status: "completed",
      },
    ],
  },
];