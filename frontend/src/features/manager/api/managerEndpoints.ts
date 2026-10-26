// Routes for flows after Flow 1. Flow 1 is defined in managerApi.ts.
export const MANAGER_ENDPOINTS = {
  CLOSE_REQUEST: (id: string) => `/manager/requests/${id}/close`,
  COLLECTION_NOTE: (id: string) => `/manager/requests/${id}/collection-notes`,
  ROUTE_DECISION: (id: string) => `/manager/trips/${id}/route/decision`,
  FLIGHT_DECISION: (id: string) => `/manager/trips/${id}/flight/decision`,
  APPROVE_DEPARTURE: (id: string) => `/manager/trips/${id}/approve-departure`,
  HANDOVER_RESOLUTION: (id: string) => `/manager/trips/${id}/handover-resolution`,
  ACTUAL_COSTS: (id: string) => `/manager/trips/${id}/actual-costs`,
  INCIDENTS: '/manager/incidents',
  INCIDENT_STATUS: (id: string) => `/manager/incidents/${id}/status`,
  PLAN_DECISION: (id: string, planId: string) => `/manager/incidents/${id}/plans/${planId}/decision`,
  COMPLAINTS: '/manager/complaints',
  COMPLAINT_REPLY: (id: string) => `/manager/complaints/${id}/replies`,
  COMPLAINT_RESOLVE: (id: string) => `/manager/complaints/${id}/resolve`,
  COMPLAINT_ESCALATE: (id: string) => `/manager/complaints/${id}/escalate`,
  ACTUAL_COST_LIST: '/manager/actual-costs',

  // Flow 3 (F3-J10, F3-J11, F3-J17, F3-J18)
  TRIP_PREPARATION: (tripId: string) => `/manager/trips/${tripId}/preparation`,
  FLOW3_PLAN_DECISION: (tripId: string) => `/manager/trips/${tripId}/plan/decision`,
  TRIP_READINESS: (tripId: string) => `/manager/trips/${tripId}/readiness`,
  FLOW3_DEPARTURE_APPROVE: (tripId: string) => `/manager/trips/${tripId}/departure/approve`,
} as const;

