/**
 * Flow 2 Endpoints Registry — Transport Specialist (Legal, Medical, Quarantine & Insurance)
 * Maps operationId → { method, path }
 * Compliant with contracts/API-Flow/Flow2/FLOW2.md and specialist.openapi.json
 */
export const flow2Endpoints = {
  'F2-J01': { method: 'GET', path: '/master/flow2-capabilities' },
  'F2-J02': { method: 'GET', path: '/specialist/trips' },
  'F2-J11': { method: 'GET', path: '/specialist/trips/{tripId}' },
  'F2-J03': { method: 'GET', path: '/specialist/customer-documents' },
  'F2-J15': { method: 'POST', path: '/specialist/trips/{tripId}/customer-documents/review' },
  'F2-J05': { method: 'GET', path: '/specialist/document-requests' },
  'F2-J16': { method: 'POST', path: '/specialist/document-requests' },
  'F2-J04': { method: 'GET', path: '/specialist/documents' },
  'F2-J19': { method: 'POST', path: '/specialist/documents' },
  'F2-J23': { method: 'GET', path: '/specialist/trips/{tripId}/insurance' },
  'F2-J24': { method: 'PUT', path: '/specialist/trips/{tripId}/insurance' },
  'F2-J25': { method: 'POST', path: '/specialist/trips/{tripId}/insurance/verify' },
  'F2-J06': { method: 'GET', path: '/specialist/quarantine-bookings' },
  'F2-J26': { method: 'POST', path: '/specialist/quarantine-bookings' },
  'F2-J14': { method: 'PUT', path: '/specialist/trips/{tripId}/requirement-set' },
  'F2-J28': { method: 'POST', path: '/specialist/trips/{tripId}/docs-ready' },
  'F2-J17': { method: 'POST', path: '/specialist/trips/{tripId}/clearances' },
  'F2-J07': { method: 'GET', path: '/specialist/document-types' },
  'F2-J30': { method: 'PUT', path: '/specialist/document-types' },
  'F2-J08': { method: 'GET', path: '/specialist/regulations' },
  'F2-J32': { method: 'PUT', path: '/specialist/regulations' },
  'F2-J09': { method: 'GET', path: '/specialist/requirement-sets' },
  'F2-J34': { method: 'PUT', path: '/specialist/requirement-sets' },
  'F2-J10': { method: 'GET', path: '/specialist/audit' },
} as const;

export type Flow2OperationId = keyof typeof flow2Endpoints;

