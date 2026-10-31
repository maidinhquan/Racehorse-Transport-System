/**
 * flow6Endpoints endpoint registry — maps operationId → { method, path }
 */
export const flow6Endpoints = {
  'F6-J01':    { method: 'GET',    path: '/master/flow6-policy' },
  'F6-J02':    { method: 'GET',    path: '/manager/aftercare' },
  'F6-J03':    { method: 'GET',    path: '/driver/trips/{tripId}/handover' },
  'F6-J04':    { method: 'POST',   path: '/driver/trips/{tripId}/handover-attempts' },
  'F6-J05':    { method: 'POST',   path: '/driver/trips/{tripId}/handover' },
  'F6-J06':    { method: 'POST',   path: '/manager/trips/{tripId}/receiver-authorizations' },
  'F6-J07':    { method: 'GET',    path: '/customer/requests/{requestId}/aftercare' },
  'F6-J08':    { method: 'GET',    path: '/manager/requests/{requestId}/aftercare' },
  'F6-J09':    { method: 'GET',    path: '/coordinator/requests/{requestId}/aftercare' },
  'F6-J10':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/acceptance' },
  'F6-J11':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/complaints' },
  'F6-J12':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/complaints/{complaintId}/messages' },
  'F6-J13':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/complaints/{complaintId}/messages' },
  'F6-J14':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/complaints/{complaintId}/proposals' },
  'F6-J15':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/complaints/{complaintId}/proposals/{proposalId}/decision' },
  'F6-J16':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/complaints/{complaintId}/resolution/apply' },
  'F6-J17':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/acceptance-window/extensions' },
  'F6-J18':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/dispute' },
  'F6-J19':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/dispute/updates' },
  'F6-J20':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/dispute/decisions' },
  'F6-J21':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/dispute/decisions/{decisionId}/apply' },
  'F6-J22':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/payment-sessions' },
  'F6-J23':    { method: 'GET',    path: '/customer/requests/{requestId}/aftercare/payments/{paymentId}' },
  'F6-J24':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/refunds/{refundId}/confirmation' },
  'F6-J25':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/closure' },
  'F6-J26':    { method: 'POST',   path: '/driver/requests/{requestId}/aftercare/files' },
  'F6-J27':    { method: 'GET',    path: '/driver/requests/{requestId}/aftercare/files/{fileId}' },
  'F6-J28':    { method: 'POST',   path: '/customer/requests/{requestId}/aftercare/files' },
  'F6-J29':    { method: 'GET',    path: '/customer/requests/{requestId}/aftercare/files/{fileId}' },
  'F6-J30':    { method: 'POST',   path: '/manager/requests/{requestId}/aftercare/files' },
  'F6-J31':    { method: 'GET',    path: '/manager/requests/{requestId}/aftercare/files/{fileId}' },
} as const;

export type Flow6OperationId = keyof typeof flow6Endpoints;
