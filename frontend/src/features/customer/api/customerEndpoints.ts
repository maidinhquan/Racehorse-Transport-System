// Endpoint Backend cho Customer (đường dẫn tương đối với baseURL của apiClient)
export const CUSTOMER_ENDPOINTS = {
  PROFILE: '/customer/profile',
  NOTIFICATIONS: '/customer/notifications',

  HORSES: '/customer/horses',
  HORSE_DETAIL: (horseId: string) => `/customer/horses/${horseId}`,

  REQUESTS: '/customer/transport-requests',
  REQUEST_DETAIL: (requestId: string) => `/customer/transport-requests/${requestId}`,
  SUBMIT_REQUEST: (requestId: string) => `/customer/transport-requests/${requestId}/submit`,
  CANCEL_REQUEST: (requestId: string) => `/customer/transport-requests/${requestId}/cancel`,
  REQUEST_DOCUMENTS: (requestId: string) => `/customer/transport-requests/${requestId}/documents`,

  ACCEPT_TERMS: (requestId: string) => `/customer/transport-requests/${requestId}/contract/accept-terms`,
  CONTRACT_CHANGE: (requestId: string) => `/customer/transport-requests/${requestId}/contract/change-requests`,
  SEND_SIGN_OTP: (requestId: string) => `/customer/transport-requests/${requestId}/contract/otp`,
  SIGN_CONTRACT: (requestId: string) => `/customer/transport-requests/${requestId}/contract/sign`,

  DEPOSIT_PAYMENT: (requestId: string) => `/customer/transport-requests/${requestId}/payments/deposit`,
  BALANCE_PAYMENT: (requestId: string) => `/customer/transport-requests/${requestId}/payments/balance`,

  ACCEPTANCE: (requestId: string) => `/customer/transport-requests/${requestId}/acceptance`,
  COMPLAINTS: (requestId: string) => `/customer/transport-requests/${requestId}/complaints`,
} as const;
