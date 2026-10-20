export const CUSTOMER_ENDPOINTS = {
  CURRENT_TRIP: '/customer/trips/current',
  RECENT_REQUESTS: '/customer/requests/recent',
  ALL_REQUESTS: '/customer/requests',
  HORSES: '/customer/horses',
  DEMO_SCENARIOS: '/customer/demo-scenarios',
  NOTIFICATIONS: '/customer/notifications',
  MARK_NOTIFICATION_READ: (id: string) => `/customer/notifications/${id}/read`,
  TRIP_TRACKING: (tripId: string) => `/customer/trips/${tripId}/tracking`,
  INCIDENT_FLOW5: (incidentId: string) => `/customer/incidents/${incidentId}`,
  RESOLVE_INCIDENT: (incidentId: string) => `/customer/incidents/${incidentId}/resolve`,
} as const;
