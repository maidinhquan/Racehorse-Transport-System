export const DRIVER_ENDPOINTS = {
  MY_TRIPS: '/driver/trips',
  TRIP_DETAIL: (tripId: string) => `/driver/trips/${tripId}`,
  MILESTONES: (tripId: string) => `/driver/trips/${tripId}/milestones`,
  DEPARTURE_DELAY: (tripId: string) => `/driver/trips/${tripId}/departure-delay`,
  CLEARANCE_REMINDER: (tripId: string) => `/driver/trips/${tripId}/clearance-reminder`,
  HEALTH_LOGS: (tripId: string) => `/driver/trips/${tripId}/health-logs`,
  INCIDENTS: '/driver/incidents',
  REPORT_INCIDENT: (tripId: string) => `/driver/trips/${tripId}/incidents`,
  HANDOVER: (tripId: string) => `/driver/trips/${tripId}/handover`,
  HANDOVER_REFUSAL: (tripId: string) => `/driver/trips/${tripId}/handover/refusal`,
  CREW: '/driver/crew',
  HORSES: '/driver/horses',
} as const;
