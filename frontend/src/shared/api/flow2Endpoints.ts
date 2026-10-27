// ============================================================================
// FLOW 2 ENDPOINTS
// Nguồn chuẩn: contracts/API-Flow/Flow2/FLOW2-API-JSON.md
// ============================================================================

export const FLOW2_ENDPOINTS = {
  /** F2-J01: Khả năng Flow 2 được triển khai */
  CAPABILITIES: '/master/flow2-capabilities',

  // ----- Specialist APIs -----
  SPECIALIST_TRIPS: '/specialist/trips',
  SPECIALIST_TRIP_DETAIL: (tripId: string) => `/specialist/trips/${tripId}`,
  SPECIALIST_CHECKLIST: (tripId: string) => `/specialist/trips/${tripId}/checklist`,
  REQUIREMENT_SET_PREVIEW: (tripId: string) => `/specialist/trips/${tripId}/requirement-set-preview`,
  APPLY_REQUIREMENT_SET: (tripId: string) => `/specialist/trips/${tripId}/requirement-set`,
  
  CUSTOMER_DOCS: '/specialist/customer-documents',
  REVIEW_CUSTOMER_DOC: (tripId: string) => `/specialist/trips/${tripId}/customer-documents/review`,
  CUSTOMER_DOC_FILE: (tripId: string, scope: string, key: string) => `/specialist/trips/${tripId}/customer-documents/${scope}/${key}/file`,
  
  DOC_REQUESTS: '/specialist/document-requests',
  FULFILL_DOC_REQUEST: (supplementRef: string) => `/specialist/document-requests/${supplementRef}/fulfill`,
  
  DOCUMENTS: '/specialist/documents',
  DOCUMENT_DETAIL: (docId: string) => `/specialist/documents/${docId}`,
  DOCUMENT_VERSIONS: (docRef: string) => `/specialist/documents/${docRef}/versions`,
  DOCUMENT_VERSION_FILE: (docRef: string, versionNo: number) => `/specialist/documents/${docRef}/versions/${versionNo}/file`,
  REVIEW_DOCUMENT: (docRef: string) => `/specialist/documents/${docRef}/review`,
  DOCUMENT_PHYSICAL_COPY: (docRef: string) => `/specialist/documents/${docRef}/physical-copy`,
  
  INSURANCE: (tripId: string) => `/specialist/trips/${tripId}/insurance`,
  VERIFY_INSURANCE: (tripId: string) => `/specialist/trips/${tripId}/insurance/verify`,
  
  QUARANTINE_BOOKINGS: '/specialist/quarantine-bookings',
  CONFIRM_QUARANTINE_BOOKING: (bookingId: string) => `/specialist/quarantine-bookings/${bookingId}/confirm`,
  CLEARANCES: (tripId: string) => `/specialist/trips/${tripId}/clearances`,
  
  DOC_TYPES: '/specialist/document-types',
  DOC_TYPE_DETAIL: (configKey: string) => `/specialist/document-types/${configKey}`,
  REGULATIONS: '/specialist/regulations',
  REGULATION_DETAIL: (configKey: string) => `/specialist/regulations/${configKey}`,
  REQUIREMENT_SETS: '/specialist/requirement-sets',
  REQUIREMENT_SET_DETAIL: (configKey: string) => `/specialist/requirement-sets/${configKey}`,
  AUDIT: '/specialist/audit',

  // ----- Coordinator APIs (Flow 2) -----
  COORDINATOR_TRIPS: '/coordinator/trips',
  COORDINATOR_TRIP_DETAIL: (tripId: string) => `/coordinator/trips/${tripId}`,
  VEHICLES: '/coordinator/vehicles',
  STAFF: '/coordinator/staff',
  CHECKPOINTS: '/coordinator/checkpoints',
  ROUTE_DRAFT: (tripId: string) => `/coordinator/trips/${tripId}/route-draft`,
  ROUTE_SUBMIT: (tripId: string) => `/coordinator/trips/${tripId}/route/submit`,
  ROUTE_REOPEN: (tripId: string) => `/coordinator/trips/${tripId}/route/reopen`,
  RESOURCES: (tripId: string) => `/coordinator/trips/${tripId}/resources`,
  RESOURCES_CONFIRM: (tripId: string) => `/coordinator/trips/${tripId}/resources/confirm`,
  FLIGHT_PROPOSALS: (tripId: string) => `/coordinator/trips/${tripId}/flight/proposals`,
  FLIGHT_BOOKING: (tripId: string) => `/coordinator/trips/${tripId}/flight/booking`,

  // ----- Customer APIs (Flow 2) -----
  CUSTOMER_SUPPLEMENTS: (requestId: string) => `/customer/requests/${requestId}/supplements`,
} as const;
