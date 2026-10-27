// Endpoint Backend cho Transport Specialist (đường dẫn tương đối với baseURL của apiClient)
export const SPECIALIST_ENDPOINTS = {
  TRIPS: '/specialist/trips',
  TRIP_DETAIL: (tripId: string) => `/specialist/trips/${tripId}`,
  APPLY_REQUIREMENT_SET: (tripId: string) => `/specialist/trips/${tripId}/requirement-set`,
  DOCS_READY: (tripId: string) => `/specialist/trips/${tripId}/docs-ready`,
  INSURANCE: (tripId: string) => `/specialist/trips/${tripId}/insurance`,
  VERIFY_INSURANCE: (tripId: string) => `/specialist/trips/${tripId}/insurance/verify`,
  CLEARANCE: (tripId: string) => `/specialist/trips/${tripId}/clearances`,

  CUSTOMER_DOCS: '/specialist/customer-documents',
  REVIEW_CUSTOMER_DOC: (tripId: string) => `/specialist/trips/${tripId}/customer-documents/review`,
  DOC_REQUESTS: '/specialist/document-requests',

  DOCUMENTS: '/specialist/documents',
  DOCUMENT_DETAIL: (docId: string) => `/specialist/documents/${docId}`,
  REVIEW_DOCUMENT: (docId: string) => `/specialist/documents/${docId}/review`,

  QUARANTINE_BOOKINGS: '/specialist/quarantine-bookings',

  DOC_TYPES: '/specialist/document-types',
  REGULATIONS: '/specialist/regulations',
  REQUIREMENT_SETS: '/specialist/requirement-sets',
  AUDIT: '/specialist/audit',
} as const;
