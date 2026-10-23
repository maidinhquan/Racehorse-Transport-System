# Flow 1 — endpoint theo frontend

> `frontend-first` 1.0.0-draft, 22/10/2026. Base `/api`. Request lấy từ API client và hook; schema GET lấy từ types hiện tại. Response data của mutation là đề xuất vì FE chỉ đọc success. Xem [contract](FLOW1-FRONTEND-CONTRACT.md).

| Hàm frontend | Method | Endpoint | Body | data | Nhóm |
|---|---|---|---|---|---|
| customerApi.getProfile | GET | `/customer/profile` | Không body | customer.CustomerProfile | Bootstrap |
| customerApi.getNotifications | GET | `/customer/notifications` | Không body | customer.CustomerNotification[] | Bootstrap |
| customerApi.getHorses | GET | `/customer/horses` | Không body | customer.Horse[] | Bootstrap |
| customerApi.createHorse | POST | `/customer/horses` | customer.HorseInput | customer.Horse | Flow 1 |
| customerApi.updateHorse | PUT | `/customer/horses/{id}` | customer.HorseInput | customer.Horse | Flow 1 |
| customerApi.getRequests | GET | `/customer/transport-requests` | Không body | customer.TransportRequest[] | Flow 1 |
| customerApi.getRequest | GET | `/customer/transport-requests/{id}` | Không body | customer.TransportRequest | Flow 1 |
| customerApi.createRequest | POST | `/customer/transport-requests` | customer.TransportRequest | customer.TransportRequest | Flow 1 |
| customerApi.saveRequest | PUT | `/customer/transport-requests/{id}` | customer.TransportRequest | customer.TransportRequest | Flow 1 |
| customerApi.submitRequest | POST | `/customer/transport-requests/{id}/submit` | Không body | customer.TransportRequest | Flow 1 |
| customerApi.cancelRequest | POST | `/customer/transport-requests/{id}/cancel` | ReasonInput | customer.TransportRequest | Flow 1 |
| customerApi.uploadDocument | POST | `/customer/transport-requests/{id}/documents` | DocumentMetadataInput | null (đề xuất) | Flow 1 |
| customerApi.acceptTerms | POST | `/customer/transport-requests/{id}/contract/accept-terms` | Không body | customer.TransportRequest | Flow 1 |
| customerApi.requestContractChange | POST | `/customer/transport-requests/{id}/contract/change-requests` | customer.ContractChangeInput | customer.TransportRequest | Flow 1 |
| customerApi.sendSignOtp | POST | `/customer/transport-requests/{id}/contract/otp` | Không body | null (đề xuất) | Flow 1 |
| customerApi.signContract | POST | `/customer/transport-requests/{id}/contract/sign` | SignInput | customer.TransportRequest | Flow 1 |
| customerApi.payDeposit | POST | `/customer/transport-requests/{id}/payments/deposit` | Không body | customer.Payment | Flow 1 |
| managerApi.getCustomers | GET | `/manager/customers` | Không body | manager.CustomerInfo[] | Bootstrap |
| managerApi.getHorses | GET | `/manager/horses` | Không body | manager.HorseRef[] | Bootstrap |
| managerApi.getStaff | GET | `/manager/staff` | Không body | manager.Staff[] | Bootstrap |
| managerApi.getRequests | GET | `/manager/requests` | Không body | manager.TransportRequest[] | Flow 1 |
| managerApi.getTrips | GET | `/manager/trips` | Không body | manager.Trip[] | Bootstrap |
| managerApi.getTransactions | GET | `/manager/transactions` | Không body | manager.Transaction[] | Flow 1 |
| managerApi.getNotifications | GET | `/manager/notifications` | Không body | manager.ManagerNotification[] | Bootstrap |
| managerApi.getIncidents | GET | `/manager/incidents` | Không body | manager.Incident[] | Bootstrap ngoài Flow 1 |
| managerApi.getComplaints | GET | `/manager/complaints` | Không body | manager.Complaint[] | Bootstrap ngoài Flow 1 |
| managerApi.getActualCosts | GET | `/manager/actual-costs` | Không body | manager.ActualCost[] | Bootstrap ngoài Flow 1 |
| managerApi.acceptRequest | POST | `/manager/requests/{id}/accept` | Không body | manager.TransportRequest | Flow 1 |
| managerApi.requestRevision | POST | `/manager/requests/{id}/request-revision` | RevisionInput | manager.TransportRequest | Flow 1 |
| managerApi.rejectRequest | POST | `/manager/requests/{id}/reject` | ReasonInput | manager.TransportRequest | Flow 1 |
| managerApi.cancelRequest | POST | `/manager/requests/{id}/cancel` | ReasonInput | manager.TransportRequest | Flow 1 |
| managerApi.decideCancellation | POST | `/manager/requests/{id}/cancellation` | CancellationDecisionInput | manager.TransportRequest | Flow 1 |
| managerApi.saveContractDraft | PUT | `/manager/requests/{id}/contract/draft` | manager.ContractDraft | manager.ContractDraft | Flow 1 |
| managerApi.issueContract | POST | `/manager/requests/{id}/contract/issue` | manager.ContractDraft | manager.ContractVersion | Flow 1 |
| managerApi.respondContractChange | POST | `/manager/requests/{id}/contract/change-response` | ContractResponseInput | manager.TransportRequest | Flow 1 |
| managerApi.extendContract | POST | `/manager/requests/{id}/contract/extend` | Không body | manager.ContractVersion | Flow 1 |
| managerApi.remindSign | POST | `/manager/requests/{id}/contract/remind` | Không body | null (đề xuất) | Flow 1 |
| managerApi.verifyTransaction | POST | `/manager/transactions/{id}/verify` | Không body | manager.Transaction | Flow 1 |
| managerApi.rejectTransaction | POST | `/manager/transactions/{id}/reject` | ReasonInput | manager.Transaction | Flow 1 |
| managerApi.confirmRefund | POST | `/manager/transactions/{id}/refund-paid` | Không body | manager.Transaction | Flow 1 |
| managerApi.deployTrip | POST | `/manager/trips/{id}/deployment` | DeploymentInput | manager.Trip | Flow 1 |
| managerApi.holdTrip | POST | `/manager/trips/{id}/hold` | ReasonInput | manager.Trip | Flow 1 |
| managerApi.resumeTrip | POST | `/manager/trips/{id}/resume` | Không body | manager.Trip | Flow 1 |
