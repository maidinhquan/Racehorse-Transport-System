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
  FULFILL_DOC_REQUEST: (ref: string) => `/specialist/document-requests/${ref}/fulfill`,

  DOCUMENTS: '/specialist/documents',
  DOCUMENT_DETAIL: (docId: string) => `/specialist/documents/${docId}`,
  DOCUMENT_VERSIONS: (docRef: string) => `/specialist/documents/${docRef}/versions`,
  DOCUMENT_PHYSICAL_COPY: (docRef: string) => `/specialist/documents/${docRef}/physical-copy`,
  REVIEW_DOCUMENT: (docId: string) => `/specialist/documents/${docId}/review`,

  QUARANTINE_BOOKINGS: '/specialist/quarantine-bookings',
  CONFIRM_QUARANTINE_BOOKING: (bookingId: string) => `/specialist/quarantine-bookings/${bookingId}/confirm`,

  DOC_TYPES: '/specialist/document-types',
  REGULATIONS: '/specialist/regulations',
  REQUIREMENT_SETS: '/specialist/requirement-sets',
  AUDIT: '/specialist/audit',

  // Flow 3 (F3-J02, F3-J03)
  PLANNING_CONTEXT: (tripId: string) => `/specialist/trips/${tripId}/planning-context`,
  PLANNING_FEASIBILITY: (tripId: string) => `/specialist/trips/${tripId}/planning-feasibility`,

  // Flow 2 Checklist & Preview
  CHECKLIST: (tripId: string) => `/specialist/trips/${tripId}/checklist`,
  REQUIREMENT_SET_PREVIEW: (tripId: string) => `/specialist/trips/${tripId}/requirement-set-preview`,
} as const;

