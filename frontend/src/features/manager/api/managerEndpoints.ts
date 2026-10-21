// Endpoint Backend cho Logistics Manager (đường dẫn tương đối với baseURL của apiClient)
export const MANAGER_ENDPOINTS = {
  CUSTOMERS: '/manager/customers',
  HORSES: '/manager/horses',
  STAFF: '/manager/staff',

  REQUESTS: '/manager/requests',
  REQUEST_DETAIL: (id: string) => `/manager/requests/${id}`,
  ACCEPT_REQUEST: (id: string) => `/manager/requests/${id}/accept`,
  REQUEST_REVISION: (id: string) => `/manager/requests/${id}/request-revision`,
  REJECT_REQUEST: (id: string) => `/manager/requests/${id}/reject`,
  CANCEL_REQUEST: (id: string) => `/manager/requests/${id}/cancel`,
  CANCELLATION_DECISION: (id: string) => `/manager/requests/${id}/cancellation`,
  CLOSE_REQUEST: (id: string) => `/manager/requests/${id}/close`,
  COLLECTION_NOTE: (id: string) => `/manager/requests/${id}/collection-notes`,

  CONTRACT_DRAFT: (id: string) => `/manager/requests/${id}/contract/draft`,
  ISSUE_CONTRACT: (id: string) => `/manager/requests/${id}/contract/issue`,
  CONTRACT_CHANGE_RESPONSE: (id: string) => `/manager/requests/${id}/contract/change-response`,
  EXTEND_CONTRACT: (id: string) => `/manager/requests/${id}/contract/extend`,
  REMIND_SIGN: (id: string) => `/manager/requests/${id}/contract/remind`,

  TRANSACTIONS: '/manager/transactions',
  VERIFY_TRANSACTION: (id: string) => `/manager/transactions/${id}/verify`,
  REJECT_TRANSACTION: (id: string) => `/manager/transactions/${id}/reject`,
  CONFIRM_REFUND: (id: string) => `/manager/transactions/${id}/refund-paid`,

  TRIPS: '/manager/trips',
  DEPLOY_TRIP: (id: string) => `/manager/trips/${id}/deployment`,
  HOLD_TRIP: (id: string) => `/manager/trips/${id}/hold`,
  RESUME_TRIP: (id: string) => `/manager/trips/${id}/resume`,
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
  NOTIFICATIONS: '/manager/notifications',
} as const;
