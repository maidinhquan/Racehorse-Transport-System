// Routes for flows after Flow 1. Flow 1 callers are defined in customerApi.ts.
export const CUSTOMER_ENDPOINTS = {
  BALANCE_PAYMENT: (id: string) => `/customer/contracts/${id}/vnpay`,
  ACCEPTANCE: (id: string) => `/customer/contracts/${id}/acceptance`,
  COMPLAINTS: '/customer/complaints',
} as const;
