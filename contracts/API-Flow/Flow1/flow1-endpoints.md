# Flow 1 — Danh mục endpoint

> Thiết kế 2.5.1-draft, ngày 22/10/2026. Tất cả endpoint dưới đây chưa được implement trong WebApi hiện tại. Xem [hướng dẫn tích hợp](FLOW1-INTEGRATION.md) và [OpenAPI](flow1.openapi.json). Danh mục chỉ bao gồm API cốt lõi Flow 1; Auth/Horse/File/Notification là phụ thuộc được liệt kê trong hướng dẫn.

| ID | Method | Endpoint (sau `/api`) | Vai trò | Thành công |
|---|---|---|---|---|
| F01-P01 | GET | `/public/estimates/transport-modes` | PUBLIC | 200 |
| F01-P02 | POST | `/public/estimates` | PUBLIC | 200 |
| F01-C01 | GET | `/customer/estimates/transport-modes` | CUSTOMER | 200 |
| F01-C02 | POST | `/customer/estimates` | CUSTOMER | 200 |
| F01-C03 | POST | `/customer/estimates/pdf` | CUSTOMER | 200 |
| F01-C04 | GET | `/customer/requests/form-options` | CUSTOMER | 200 |
| F01-C05 | GET | `/customer/horses/selectable` | CUSTOMER | 200 |
| F01-C05E | GET | `/customer/requests/document-requirements` | CUSTOMER | 200 |
| F01-C06 | POST | `/customer/requests` | CUSTOMER | 201 |
| F01-C07 | GET | `/customer/requests` | CUSTOMER | 200 |
| F01-C07 | GET | `/customer/requests/{requestId}` | CUSTOMER | 200 |
| F01-M01 | GET | `/manager/requests` | LOGISTICS_MANAGER | 200 |
| F01-M01 | GET | `/manager/requests/{requestId}` | LOGISTICS_MANAGER | 200 |
| F01-M02 | POST | `/manager/requests/{requestId}/accept` | LOGISTICS_MANAGER | 200 |
| F01-M03 | POST | `/manager/requests/{requestId}/reject` | LOGISTICS_MANAGER | 200 |
| F01-M04 | POST | `/manager/requests/{requestId}/request-revision` | LOGISTICS_MANAGER | 201 |
| F01-C08 | GET | `/customer/requests/{requestId}/revision-requests` | CUSTOMER | 200 |
| F01-C09 | PUT | `/customer/requests/{requestId}/revision` | CUSTOMER | 200 |
| F01-M05 | GET | `/manager/requests/{requestId}/revisions` | LOGISTICS_MANAGER | 200 |
| F01-C10 | GET | `/customer/requests/{requestId}/info-requests` | CUSTOMER | 200 |
| F01-M06 | GET | `/manager/requests/{requestId}/info-requests` | LOGISTICS_MANAGER | 200 |
| F01-M06 | POST | `/manager/requests/{requestId}/info-requests` | LOGISTICS_MANAGER | 201 |
| F01-C10 | POST | `/customer/requests/{requestId}/info-responses` | CUSTOMER | 201 |
| F01-C11 | POST | `/customer/requests/{requestId}/change-requests` | CUSTOMER | 201 |
| F01-C12 | GET | `/customer/requests/{requestId}/change-requests` | CUSTOMER | 200 |
| F01-M07 | GET | `/manager/requests/{requestId}/change-requests` | LOGISTICS_MANAGER | 200 |
| F01-M08 | POST | `/manager/requests/{requestId}/change-requests/{changeRequestId}/approve` | LOGISTICS_MANAGER | 200 |
| F01-M09 | POST | `/manager/requests/{requestId}/change-requests/{changeRequestId}/reject` | LOGISTICS_MANAGER | 200 |
| F01-C13 | POST | `/customer/requests/{requestId}/cancel` | CUSTOMER | 200 |
| F01-C14 | POST | `/customer/requests/{requestId}/cancellation-requests` | CUSTOMER | 201 |
| F01-C14 | GET | `/customer/requests/{requestId}/cancellation-requests` | CUSTOMER | 200 |
| F01-M10 | GET | `/manager/requests/{requestId}/cancellation-requests` | LOGISTICS_MANAGER | 200 |
| F01-M10 | POST | `/manager/requests/{requestId}/cancellation-requests/{cancellationRequestId}/approve` | LOGISTICS_MANAGER | 200 |
| F01-M10 | POST | `/manager/requests/{requestId}/cancellation-requests/{cancellationRequestId}/reject` | LOGISTICS_MANAGER | 200 |
| F01-M11 | GET | `/manager/requests/{requestId}/preliminary-plan` | LOGISTICS_MANAGER | 200 |
| F01-M11 | PUT | `/manager/requests/{requestId}/preliminary-plan` | LOGISTICS_MANAGER | 200 |
| F01-M12 | GET | `/manager/requests/{requestId}/quote-suggestion` | LOGISTICS_MANAGER | 200 |
| F01-M13 | POST | `/manager/requests/{requestId}/contracts` | LOGISTICS_MANAGER | 201 |
| F01-C20 dependency | GET | `/customer/requests/{requestId}/contract` | CUSTOMER | 200 |
| F01-M14 | GET | `/manager/requests/{requestId}/contract` | LOGISTICS_MANAGER | 200 |
| F01-M15 | PUT | `/manager/contracts/{contractId}` | LOGISTICS_MANAGER | 200 |
| F01-M16 | POST | `/manager/contracts/{contractId}/send` | LOGISTICS_MANAGER | 200 |
| F01-M17 | POST | `/manager/requests/{requestId}/contract-versions` | LOGISTICS_MANAGER | 201 |
| F01-C20 | POST | `/customer/contracts/{contractId}/otp` | CUSTOMER | 200 |
| F01-C21 | POST | `/customer/contracts/{contractId}/sign` | CUSTOMER | 200 |
| F01-C22 | POST | `/customer/contracts/{contractId}/decline` | CUSTOMER | 200 |
| F01-C23 | GET | `/customer/requests/{requestId}/payments` | CUSTOMER | 200 |
| F01-M18 | GET | `/manager/requests/{requestId}/payments` | LOGISTICS_MANAGER | 200 |
| F01-C24 | GET | `/customer/payments/bank-info` | CUSTOMER | 200 |
| F01-C25 | POST | `/customer/payments/online` | CUSTOMER | 200 |
| F01-C26 | POST | `/customer/payments/manual` | CUSTOMER | 201 |
| F01-C27 | GET | `/customer/payments/transactions/{transactionId}` | CUSTOMER | 200 |
| F01-M19 | GET | `/manager/payments/transactions/{transactionId}` | LOGISTICS_MANAGER | 200 |
| F01-C27 | GET | `/customer/payments/transactions/{transactionId}/receipt` | CUSTOMER | 200 |
| F01-M19 | GET | `/manager/payments/pending` | LOGISTICS_MANAGER | 200 |
| F01-M20 | POST | `/manager/payments/transactions/{transactionId}/confirm` | LOGISTICS_MANAGER | 200 |
| F01-M21 | POST | `/manager/payments/transactions/{transactionId}/reject` | LOGISTICS_MANAGER | 200 |
| F01-M23 | POST | `/manager/requests/{requestId}/deposit-extensions` | LOGISTICS_MANAGER | 201 |
| F01-M24 | POST | `/manager/requests/{requestId}/cancel-overdue-deposit` | LOGISTICS_MANAGER | 200 |
| F01-M25 | GET | `/manager/trips/{tripId}` | LOGISTICS_MANAGER | 200 |
| F01-M26 | POST | `/manager/trips/{tripId}/confirm-deployment` | LOGISTICS_MANAGER | 200 |
| F01-M27 | POST | `/manager/trips/{tripId}/hold-deployment` | LOGISTICS_MANAGER | 200 |
| F01-M27 | POST | `/manager/trips/{tripId}/resume-deployment` | LOGISTICS_MANAGER | 200 |
