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
} as const;
