# API additions — cập nhật điểm nối Flow 3 ngày 27/10/2026

This contract defines the reference changes for frontend integration. It does not
claim that backend endpoints or the current database implement them. Existing
Flow 1 signing/payment rules are version 2.0.0 in that flow's canonical contract.
All money is integer VND, preserving the project's currency contract rather than
the HTML demo's illustrative USD amounts.

## Business rules

- Required pickup and desired-arrival dates are distinct. No guessed pickup dates.
- Accept terms → OTP signature → SIGNED / AWAITING_DEPOSIT → verified VNPAY IPN →
  EFFECTIVE / ACTIVATED and exactly one Trip. No Trip is created by frontend/sign API.
- Flow 3 planning is superseded by [Flow 3 v2](../Flow3/FLOW3.md), based on
  Final_Flow3.html. Document preparation and coordination run in parallel after deployment.
  F2-J53/J54 and F3-J21/J22 below are historical timed-document operations, not planning gates.
  Retired commands return 409 CONTRACT_SUPERSEDED. The project assumes document validity
  throughout the trip; insurance, completeness and staff qualifications still require checks.
- Every list, detail, file and mutation is authorized by resource ownership or staff
  assignment. Customer cases remain within their request; staff use a combined hub.
- Emergency care happens immediately; commercial/operational proposals require
  Manager approval. Specialist/Coordinator only read related customer complaints.
- Customer acceptance or an agreed resolution creates a pending compensation.
  Manager applies it once to the final invoice. Pending adjustment blocks payment.
  The frontend never subtracts a proposal from the balance, creates payment success,
  executes IPN, or declares money refunded without a server result.
- Binary files use the existing authenticated download mechanism.
- Do not write fixtures to a real API; tests use mocked transports.

## Endpoints

| ID | Method | Path | Role |
|---|---|---|---|
| F2-J53 (retired) | GET | `/specialist/trips/{tripId}/timed-documents` | TRANSPORT_SPECIALIST |
| F2-J54 (retired) | POST | `/specialist/trips/{tripId}/timed-documents/send` | TRANSPORT_SPECIALIST |
| F3-J21 (retired) | GET | `/coordinator/trips/{tripId}/timed-documents` | FLEET_ROUTE_COORDINATOR |
| F3-J22 (retired) | POST | `/coordinator/trips/{tripId}/timed-documents/schedule` | FLEET_ROUTE_COORDINATOR |
| F5-M01 | GET | `/manager/incidents` | LOGISTICS_MANAGER |
| F5-M02 | POST | `/manager/incidents` | LOGISTICS_MANAGER |
| F5-M03 | GET | `/manager/incidents/{incidentId}` | LOGISTICS_MANAGER |
| F5-M04 | GET | `/manager/complaints` | LOGISTICS_MANAGER |
| F5-S01 | GET | `/specialist/incidents` | TRANSPORT_SPECIALIST |
| F5-S02 | POST | `/specialist/incidents` | TRANSPORT_SPECIALIST |
| F5-S03 | GET | `/specialist/incidents/{incidentId}` | TRANSPORT_SPECIALIST |
| F5-S04 | GET | `/specialist/complaints` | TRANSPORT_SPECIALIST |
| F5-S05 | POST | `/specialist/incidents/{incidentId}/plans` | TRANSPORT_SPECIALIST |
| F5-C01 | GET | `/coordinator/incidents` | FLEET_ROUTE_COORDINATOR |
| F5-C02 | POST | `/coordinator/incidents` | FLEET_ROUTE_COORDINATOR |
| F5-C03 | GET | `/coordinator/incidents/{incidentId}` | FLEET_ROUTE_COORDINATOR |
| F5-C04 | GET | `/coordinator/complaints` | FLEET_ROUTE_COORDINATOR |
| F5-C05 | POST | `/coordinator/incidents/{incidentId}/plans` | FLEET_ROUTE_COORDINATOR |
| F5-D01 | GET | `/driver/incidents` | DRIVER_ESCORT |
| F5-D02 | POST | `/driver/incidents` | DRIVER_ESCORT |
| F5-D03 | GET | `/driver/incidents/{incidentId}` | DRIVER_ESCORT |
| F5-M05 | POST | `/manager/incidents/{incidentId}/plans/{planId}/decision` | LOGISTICS_MANAGER |
| F5-M06 | PUT | `/manager/incidents/{incidentId}/status` | LOGISTICS_MANAGER |
| F5-M07 | POST | `/manager/complaints/{complaintId}/reply` | LOGISTICS_MANAGER |
| F5-M08 | POST | `/manager/complaints/{complaintId}/resolution` | LOGISTICS_MANAGER |
| F5-M09 | POST | `/manager/complaints/{complaintId}/settlement` | LOGISTICS_MANAGER |
| F5-U01 | GET | `/customer/requests/{requestId}/cases` | CUSTOMER |
| F5-U02 | POST | `/customer/complaints` | CUSTOMER |
| F5-U03 | POST | `/customer/complaints/{complaintId}/resolution` | CUSTOMER |
| F4-U01 | GET | `/customer/requests/{requestId}/settlement` | CUSTOMER |
| F4-U02 | POST | `/customer/requests/{requestId}/acceptance` | CUSTOMER |

Machine-readable payloads and guards: [operations.openapi.json](operations.openapi.json).
