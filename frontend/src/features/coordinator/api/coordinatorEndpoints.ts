export const COORDINATOR_ENDPOINTS = {
  TRIPS: '/coordinator/trips',
  TRIP_DETAIL: (tripId: string) => `/coordinator/trips/${tripId}`,
  SUBMIT_ROUTE: (tripId: string) => `/coordinator/trips/${tripId}/route/submit`,
  ASSIGN_RESOURCES: (tripId: string) => `/coordinator/trips/${tripId}/assignments`,
  CONFIRM_RESOURCES: (tripId: string) => `/coordinator/trips/${tripId}/operations-readiness/confirm`,
  UPDATE_ETA: (tripId: string) => `/coordinator/trips/${tripId}/eta`,
  MILESTONES: (tripId: string) => `/coordinator/trips/${tripId}/milestones`,
  FLIGHT: (tripId: string) => `/coordinator/trips/${tripId}/flight`,
  FLIGHT_BOOKING: (tripId: string) => `/coordinator/trips/${tripId}/flight/booking`,
  VEHICLES: '/coordinator/vehicles',
  STAFF: '/coordinator/staff',
  INCIDENTS: '/coordinator/incidents',

  // Flow 3 (F3-J04 -> F3-J20)
  PLANNING_CONTEXT: (tripId: string) => `/coordinator/trips/${tripId}/planning-context`,
  FLIGHTS: '/coordinator/flights',
  PLAN_DRAFT: (tripId: string) => `/coordinator/trips/${tripId}/plan-draft`,
  PLAN_VALIDATE: (tripId: string) => `/coordinator/trips/${tripId}/plan/validate`,
  PLAN_SUBMIT: (tripId: string) => `/coordinator/trips/${tripId}/plan/submit`,
  PLAN_WITHDRAW: (tripId: string) => `/coordinator/trips/${tripId}/plan/withdraw`,
  PLAN_CHANGES: (tripId: string) => `/coordinator/trips/${tripId}/plan/changes`,
  FLOW3_RESOURCES_CONFIRM: (tripId: string) => `/coordinator/trips/${tripId}/resources/confirm`,
  OPS_READY: (tripId: string) => `/coordinator/trips/${tripId}/ops-ready`,
  CANCEL_BOOKING: (tripId: string) => `/coordinator/trips/${tripId}/flight/booking/cancel`,

  // Flow 2
  CHECKPOINTS: '/coordinator/checkpoints',
  ROUTE_DRAFT: (tripId: string) => `/coordinator/trips/${tripId}/route-draft`,
  ROUTE_REOPEN: (tripId: string) => `/coordinator/trips/${tripId}/route/reopen`,
} as const;
