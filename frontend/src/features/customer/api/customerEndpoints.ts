// Routes for flows after Flow 1. Flow 1 callers are defined in customerApi.ts.
export const CUSTOMER_ENDPOINTS = {
  BALANCE_PAYMENT: (id: string) => `/customer/contracts/${id}/vnpay`,
  ACCEPTANCE: (id: string) => `/customer/contracts/${id}/acceptance`,
  COMPLAINTS: '/customer/complaints',

  // Flow 2 (Hồ sơ bổ sung & Kiểm dịch)
  SUPPLEMENTS: (requestId: string) => `/customer/requests/${requestId}/supplements`,
  SUPPLEMENT_DOCUMENT: (requestId: string, supplementId: string) => `/customer/requests/${requestId}/supplements/${supplementId}/documents`,
  SUPPLEMENT_SUBMIT: (requestId: string, supplementId: string) => `/customer/requests/${requestId}/supplements/${supplementId}/submit`,
  QUARANTINE_OPTIONS: (requestId: string) => `/customer/requests/${requestId}/quarantine/options`,
  QUARANTINE_SELECTION: (requestId: string) => `/customer/requests/${requestId}/quarantine/selection`,
} as const;

