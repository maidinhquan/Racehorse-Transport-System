// Endpoint Backend cho Customer (đường dẫn tương đối với baseURL của apiClient)
export const CUSTOMER_ENDPOINTS = {
  PROFILE: '/customer/profile',
  NOTIFICATIONS: '/flow1/notifications',

  HORSES: '/customer/horses',
  SELECTABLE_HORSES: '/customer/horses/selectable',
  HORSE_DETAIL: (horseId: string) => `/customer/horses/${horseId}`,

  REQUESTS: '/customer/requests',
  REQUEST_DETAIL: (requestId: string) => `/customer/requests/${requestId}`,
  SUBMIT_REQUEST: (requestId: string) => `/customer/requests/${requestId}/submit`,
  CANCEL_REQUEST: (contractId: string) => `/customer/contracts/${contractId}/cancellation/request`,
  CONTRACT_CANCEL_REQUEST: (contractId: string) => `/customer/contracts/${contractId}/cancellation/request`,
  REQUEST_DOCUMENTS: (requestId: string) => `/customer/requests/${requestId}/documents`,

  ACCEPT_TERMS: (contractId: string) => `/customer/contracts/${contractId}/terms`,
  CONTRACT_DETAIL: (contractId: string) => `/customer/contracts/${contractId}`,
  CONTRACT_TERMS: (contractId: string) => `/customer/contracts/${contractId}/terms`,
  CONTRACT_PDF: (contractId: string) => `/customer/contracts/${contractId}/pdf`,
  CONTRACT_CHANGE: (contractId: string) => `/customer/contracts/${contractId}/feedback`,
  SEND_SIGN_OTP: (contractId: string) => `/customer/contracts/${contractId}/otp`,
  SIGN_CONTRACT: (contractId: string) => `/customer/contracts/${contractId}/sign`,
  MOCK_SIGN: (contractId: string) => `/customer/contracts/${contractId}/mock-sign`,

  DEPOSIT_PAYMENT: (contractId: string) => `/customer/contracts/${contractId}/vnpay`,
  MOCK_DEPOSIT: (contractId: string) => `/customer/contracts/${contractId}/mock-deposit`,
  BALANCE_PAYMENT: (contractId: string) => `/customer/contracts/${contractId}/vnpay`,

  ACCEPTANCE: (contractId: string) => `/customer/contracts/${contractId}/acceptance`,
  COMPLAINTS: '/customer/complaints',
} as const;

export const PUBLIC_ENDPOINTS = {
  ESTIMATES_DEMO: '/public/estimates/demo',
  LOCATIONS_SEARCH: '/public/estimates/locations/search',
} as const;
