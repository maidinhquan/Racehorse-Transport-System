# Flow 1 — mapping quan hệ A1/B1/C1 và thứ tự chuyển đổi

**Scope hiện hành chốt 17/10/2026:** đại ca chọn hồ sơ ngựa mới nhất (không versioning),
Manager chốt giá trực tiếp trong Contract (bỏ plan/budget bốn nhóm), chỉ VNPay
(bỏ bank-proofs/manual transfer), **vẫn giữ gia hạn, khách đề nghị hủy và
confirm/hold/resume**. Không thêm bảng, không JSON persistence; chỉ current/last
state, giữ PDF/chữ ký/từng Payment. [Mapping scope mới](FLOW1_SIMPLE_RELATIONAL_MAPPING.md)
và foundation006 thay mapping 166 cột/005 bên dưới. 005 là tài liệu/migration lịch
sử, **không phải bước phải chạy trước006**. 006 không tự chuyển runtime/drop dữ
liệu; source hiện vẫn dùng JSON tới khi toàn chuỗi typed được kiểm đủ và cutover.
Không áp migration/import/drop trên DB nghiệp vụ trong các lượt tự động.

Ngày 16/10/2026. Scope đã được đại ca chọn: **A1 + B1 + C1**; cho phép hơn 7 cột,
không thêm bảng vì cần bảo vệ công việc/quan hệ của teammate. Baseline `2ba80f2`.
Worktree độc lập từ Truong; primary D:/Racehorse-Transport-System hiện là main.
Không switch/reset/merge/push primary. Đây là foundation; runtime hiện vẫn dùng
provider SQL JSON cũ cho tới khi các use case typed đã kiểm đủ và cutover source.

## 1. Quy tắc schema và số cột thực tế

005 là additive explicit script trên 003, không phụ thuộc 004, không startup.
Không tạo bảng persistent, không sửa/xóa/retarget khóa ngoại hay cột hiện hữu.
Không sửa COST_ITEM.ContractID/quan hệ của B2. Chỉ thêm cột nullable/default an toàn
và index/CHECK; không đặt RelationalReady=true cho dữ liệu cũ, không copy/drop JSON.
Default không có nghĩa là dữ liệu cũ đã được import. CHECK dùng extended-property
fingerprint của spec và định nghĩa SQL canonical để phát hiện drift khi chạy lại;
đó là schema metadata, không chứa state nghiệp vụ. USER không cần cột mới.

| Bảng hiện có | Cột bổ sung |
| --- | ---: |
| HORSE | 9 |
| REQUEST_HORSE_MAPPING | 13 |
| TRANSPORT_REQUEST | 38 |
| CONTRACT | 57 |
| INVOICE | 6 |
| PAYMENT | 25 |
| TRIP_PLAN | 16 |
| NOTIFICATION | 2 |
| **Tổng** | **166** |

Số lượng này phản ánh A1/B1/C1 còn giữ ký/tiền/counters/concurrency. JSON cho HTTP request/response và appsettings vẫn dùng bình thường; quyết định này
bỏ JSON làm persistence nghiệp vụ, không cấm giao thức API. Không hứa
schema chỉ 7 cột hoặc backend giảm một nửa. Các cột không phải bảng/event store
ẩn; mỗi cột có một ý nghĩa và kiểu dữ liệu. Existing scalar fields được tận dụng:
HORSE identity; Request dates/addresses/status/receiver; Contract RequestID,
CompletionDeadline/SignedAt/status/price; INVOICE balances; PAYMENT amount/method/
status/reference/actor; TRIP_PLAN relation/status; NOTIFICATION recipient/type/channel/time.

## 2. Mapping cột mới (N = nullable; default 0 = NOT NULL)

### HORSE

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| PhotoFileKey | `varchar(100)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| PhotoSha256 | `char(64)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| PassportFileKey | `varchar(100)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| PassportSha256 | `char(64)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| DocumentRevision | `int` | default 0 | Hồ sơ hiện hành; private refs/hash và retry |
| CreationInputHash | `char(64)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| LastDocumentOperationKey | `varchar(100)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| LastDocumentInputHash | `char(64)` | N | Hồ sơ hiện hành; private refs/hash và retry |
| RelationalReady | `bit` | default 0 | Hồ sơ hiện hành; private refs/hash và retry |

### REQUEST_HORSE_MAPPING

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| SnapshotName | `nvarchar(100)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotMicrochip | `varchar(50)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotPassportNo | `varchar(50)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotBreed | `nvarchar(100)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotSex | `varchar(20)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotWeight | `decimal(10,2)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| SnapshotDob | `date` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| PhotoFileKey | `varchar(100)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| PhotoSha256 | `char(64)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| PassportFileKey | `varchar(100)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| PassportSha256 | `char(64)` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| DocumentRevision | `int` | N | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |
| RelationalReady | `bit` | default 0 | Hồ sơ chốt theo request-horse; không nối về file hiện hành để thay snapshot |

### TRANSPORT_REQUEST

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| PickupLatitude | `decimal(9,6)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PickupLongitude | `decimal(9,6)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| DeliveryLatitude | `decimal(9,6)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| DeliveryLongitude | `decimal(9,6)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| OriginCountry | `varchar(3)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| DestinationCountry | `varchar(3)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PickupContactName | `nvarchar(100)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PickupContactPhone | `varchar(20)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| IsProxyReceiver | `bit` | default 0 | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| RoadDistanceKm | `decimal(12,3)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| MapProvider | `varchar(50)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| MapAttribution | `nvarchar(2000)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PricingPolicyVersion | `varchar(50)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| EstimatedPrice | `decimal(12,0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| EstimatedAtUtc | `datetime2(0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| ManagerNotes | `nvarchar(2000)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| ReviewedBy | `varchar(50)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| ReviewedAtUtc | `datetime2(0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| RequestRevision | `int` | default 0 | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PlanRevision | `int` | default 0 | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| Revision | `int` | default 0 | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PlannedDepartureAtUtc | `datetime2(0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| MinimumPreparationDays | `int` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PreparationDays | `int` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| VehicleCount | `int` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| StallsRequired | `int` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| PlannedResources | `nvarchar(100)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| DepartureGateway | `char(3)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| ArrivalGateway | `char(3)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| TransportCost | `decimal(12,0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| ProcedureCost | `decimal(12,0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| VeterinaryCareCost | `decimal(12,0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| InsuranceCost | `decimal(12,0)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| CreationInputHash | `char(64)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| LastOperationKey | `varchar(100)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| LastOperationInputHash | `char(64)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| LastOperationAction | `varchar(30)` | N | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |
| RelationalReady | `bit` | default 0 | A1 canonical/plan hiện hành; B1 bốn cost groups; không hỏi/đáp/change/timeline |

### CONTRACT

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| VersionNumber | `int` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| IsCurrent | `bit` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| Revision | `int` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| RequestRevision | `int` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PlanRevision | `int` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CreationOperationKey | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CreationInputHash | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PdfFileKey | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PdfSha256 | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| TemplateVersion | `varchar(30)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PublishedAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PublishedBy | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PublicationOperationKey | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| PublicationInputHash | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| BankName | `nvarchar(200)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| BankAccount | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| BankBeneficiary | `nvarchar(200)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| BelowFloorReason | `nvarchar(2000)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| EffectiveDeadline | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| DeadlineRevision | `int` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastExtensionFrom | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastExtendedAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastExtendedBy | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastExtensionReason | `nvarchar(2000)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpChallengeId | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpCodeDigest | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpEmailDigest | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpSentAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpExpiresAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpDeliveryStatus | `varchar(20)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpAttempts | `int` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpConsumed | `bit` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpRevoked | `bit` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpDeadlineRevision | `int` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| OtpNotificationID | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignOperationKey | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignInputHmac | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignedDeadline | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignedDeadlineRevision | `int` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignedChallengeId | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| SignatureMethod | `varchar(30)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastLifecycleAction | `varchar(30)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastLifecycleReason | `nvarchar(2000)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastLifecycleBy | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastLifecycleAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationId | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationStatus | `varchar(20)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationReason | `nvarchar(2000)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationRequestedAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationDecisionReason | `nvarchar(2000)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationDecidedBy | `varchar(50)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationDecidedAtUtc | `datetime2(0)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| CancellationRevision | `int` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastOperationKey | `varchar(100)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastOperationInputHash | `char(64)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| LastOperationAction | `varchar(30)` | N | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |
| RelationalReady | `bit` | default 0 | C1 current lifecycle/OTP/extension/cancellation; immutable published PDF and signed evidence |

### INVOICE

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| PaymentRevision | `int` | default 0 | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |
| FinancialReviewedPaymentRevision | `int` | N | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |
| FinancialReviewedDeadlineRevision | `int` | N | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |
| FinancialReviewedBy | `varchar(50)` | N | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |
| FinancialReviewedAtUtc | `datetime2(0)` | N | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |
| FinancialReviewReason | `nvarchar(2000)` | N | Số tiền/status hiện có; acknowledgement chỉ đúng payment/deadline revision |

### PAYMENT

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| Revision | `int` | default 0 | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| DeclaredAmount | `decimal(12,0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProofFileKey | `varchar(100)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProofSha256 | `char(64)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| Memo | `nvarchar(1000)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| DecisionReason | `nvarchar(2000)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ReceivedAtUtc | `datetime2(0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| NormalizedBankReference | `varchar(100)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| CreationOperationKey | `varchar(100)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| CreationInputHash | `char(64)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| DecisionOperationKey | `varchar(100)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| DecisionInputHash | `char(64)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| SessionCreatedAtUtc | `datetime2(0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| SessionExpiresAtUtc | `datetime2(0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| RequestedAmount | `decimal(12,0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| MerchantID | `varchar(50)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| GatewayPaymentUrl | `varchar(2048)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderTransactionID | `varchar(100)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderResponseCode | `varchar(10)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderTransactionStatus | `varchar(10)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| VerifiedCallbackDigest | `char(64)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderConflictKind | `varchar(50)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderConflictDigest | `char(64)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| ProviderConflictAtUtc | `datetime2(0)` | N | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |
| RelationalReady | `bit` | default 0 | Mỗi khoản/phiên một row; giữ proof, idempotency, signed callback binding, conflict hiện hành |

### TRIP_PLAN

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| ActivationContractID | `varchar(50)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| ActivatedAtUtc | `datetime2(0)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| VerifiedDepositAtActivation | `decimal(12,0)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| ScheduleNeedsReview | `bit` | default 0 | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentStatus | `varchar(20)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentRevision | `int` | default 0 | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| HandoffEventID | `varchar(50)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentReason | `nvarchar(2000)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentBy | `varchar(50)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentAtUtc | `datetime2(0)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentOperationKey | `varchar(100)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DeploymentInputHash | `char(64)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| RoutingAcknowledgedBy | `varchar(50)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| RoutingAcknowledgedAtUtc | `datetime2(0)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DocumentsAcknowledgedBy | `varchar(50)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |
| DocumentsAcknowledgedAtUtc | `datetime2(0)` | N | Activation one trip; C1 deployment và hai acknowledgement hiện hành, reset theo event |

### NOTIFICATION

| Cột | SQL type | Null/default | Nguồn/ý nghĩa |
| --- | --- | --- | --- |
| DeliveryStatus | `varchar(20)` | N | Chỉ trạng thái gửi email thật; rolling OTP budget đọc Type/Channel/UserID/SentAt có sẵn, không chứa OTP |
| DeliveredAtUtc | `datetime2(0)` | N | Chỉ trạng thái gửi email thật; rolling OTP budget đọc Type/Channel/UserID/SentAt có sẵn, không chứa OTP |

## 3. Dữ liệu tái sử dụng không cần cột mới

- **COST_ITEM:** đúng bốn dòng quote cho mỗi Contract, CategoryName cố định,
  SubcodeName=FLOW1_QUOTE, Bearer=CUSTOMER, TotalMoney là selling total nhóm,
  CurrencyCode=VND. Quantity=1, nhãn từ enum. Index mới chỉ giới hạn FLOW1_QUOTE;
  không thay FK/nullable hoặc cấm dòng chi phí của module khác. Bốn cost groups
  của preliminary plan ở Request, quote groups ở COST_ITEM của Contract.
- **CONTRACT:** BaseContractPrice_P giữ tổng cost lúc Draft; TotalQuotedPrice là
  tổng bốn selling groups; các Contract đã phát hành và PDF bất biến vẫn là row/file
  riêng. Không phục hồi full structured request/plan cũ cho Contract unsigned đã
  đóng; lịch sử chỉ summary/giá/status/PDF. Hợp đồng signed giữ receipt có typed
  fields, lịch sử PDF không phụ thuộc request hiện hành.
- **INVOICE/PAYMENT:** Amount/PaidAmount/Status/Method/TransactionCode/ConfirmedBy
  dùng đúng semantics hiện có. Tính derived deposit/outstanding/excess từ tiền,
  không thêm nhiều bản sao số dư hoặc lưu tổng từ client.
- **USER:** không thêm counter JSON hoặc dùng reset-password OTP cho hợp đồng.
  Dùng SQL account lock + COUNT NOTIFICATION gửi OTP EMAIL trong rolling 15 phút;
  mỗi lần gửi/reservation là một notification delivery thật, kể cả FAILED vẫn tính
  slot. Type=CONTRACT_OTP, Channel=EMAIL, SentAt giữ thời điểm reservation; chỉ thêm
  DeliveryStatus/DeliveredAtUtc. Không chứa OTP code, digest, body gửi email hay
  workflow payload trong Message. Chỉ cần giữ records của cửa sổ rate-limit; không
  khôi phục timeline mọi lần thử OTP. Test boundary/concurrency/restart bắt buộc ở R3.

## 4. Invariants và semantics sau khi bỏ timeline

1. Chỉ row RelationalReady=true, dữ liệu typed đầy đủ mới phục vụ use case mới.
   005 không tự đặt flag cho row cũ. Runtime sau cutover chỉ đọc typed; thiếu dữ liệu
   thì fail closed, không fallback JSON hoặc đọc trộn từng field từ hai nguồn.
2. Horse identity immutable sau onboarding; sửa identity legacy phải không có
   active request. RequestHorseMapping lưu identity/file snapshot hiện hành theo
   request. Khi phát hành PDF, khóa sửa request/plan/mapping; muốn sửa phải đóng
   unsigned Contract trước. Signed/activated/cancelled Request không mở sửa lại.
   Các file đã tham chiếu không bị ghi đè/xóa; đổi Horse hiện hành không đổi snapshot.
3. RequestRevision/PlanRevision/Contract.VersionNumber là các phiên bản nghiệp vụ
   riêng; Revision/PaymentRevision/DeadlineRevision/CancellationRevision/
   DeploymentRevision dùng CAS/expectedVersion dưới transaction/horse/request lock.
   Không dùng version cũ để sửa state mới. Existing FK được giữ nguyên; actor IDs
   mới cần được service kiểm với account/role, foundation không thêm FK actor làm
   thay đổi quy tắc xóa dữ liệu của module khác.
4. Bỏ full replay history của thao tác chỉnh sửa thông thường: key thuộc resource +
   base revision, chỉ key/digest operation gần nhất được lưu. Retry cùng input khi
   operation còn hiện hành trả lại kết quả; retry cũ sau thay đổi khác trả STALE_VERSION,
   không chạy lại. Không hứa replay mọi key từ mọi thời điểm như state event cũ.
5. **Riêng tiền/ký/create:** CreationKey/InputHash theo mỗi PAYMENT/CONTRACT/Horse,
   SignKey/HMAC trên Contract, Payment decision key/hash, callback digest/reference
   và unique bank/provider transaction, invoice/Trip uniqueness được giữ để chống
   trùng bền vững. Không thay bằng bộ nhớ process hoặc last-key dùng chung dễ mất.
6. Contract original CompletionDeadline chỉ set lúc phát hành. EffectiveDeadline
   thay đổi khi gia hạn; SignedDeadline/SignedDeadlineRevision giữ due lúc ký,
   INVOICE.DueDate theo effective hiện tại. Sau khi bỏ extension chain, đọc thẳng
   SignedDeadline để verify receipt; không truy vấn AtVersion trên history đã bỏ.
7. OTP gắn owner/Contract/version/PdfSha256/email/deadline revision. Delivery phải
   DELIVERED; HMAC digest, attempt/cooldown/account rolling budget, consumed/revoked
   vẫn giữ. SMTP ngoài SQL: crash DELIVERING/RESERVED fail closed; không tự đoán gửi
   thành công. Phát hành PDF ngoài SQL: Put immutable bytes rồi commit manifest;
   file mồ côi chưa commit không coi là publication, retry không phát hành hai bản.
8. Pending cancellation chặn proof/session mới, giữ activation nhưng vẫn ghi tiền
   đến. Approve chỉ zero verified/no pending/no unresolved provider conflict. Reject
   xét activation với tiền đã đủ. Quyết định và trạng thái request/invoice/Trip cùng tx.
9. Verified total từ SUM PAYMENT SUCCESS. IPN xác thực merchant/session/amount/
   currency/posting/reference/signature; Return chỉ đọc SQL. Callback conflict giữ
   kind/digest/time và flag review, không chứa serialized provider payload, không
   cộng/xóa tiền chỉ để làm review pass. Không sửa/xóa receipt SUCCESS. Index filtered typed không thay query đối soát
   reference với PAYMENT legacy chưa Ready; preflight phải xử lý các reference cũ
   thiếu/không chuẩn hóa được trước khi nhận tiền theo source mới.
10. TRIP_PLAN chỉ sinh sau ký + đủ cọc xác minh. Deployment là release vận hành,
    không deploy phần mềm. Confirm tạo current event; hold/resume revoke event/clear
    hai ack; chỉ Coordinator/Specialist đúng stream/event mới ghi được. Old event
    bị reject kể cả khi đã bỏ full history.

## 5. API/FE bị thu gọn và UAT phải thay

- Bỏ ASK_INFO/RESPOND_INFO và PROPOSE_CHANGE/approve/reject-change routes/UI;
  không để các endpoint này trả success rỗng. A1 giữ accept/reject/request-revision/
  resubmit; RevisionFields list thay bằng ManagerNotes chỉ dẫn bằng plain text.
- PlanInput.AdditionalCosts và SellingLine[] tùy ý được thay DTO bốn nhóm cố định;
  backend validate totals/cost/floor/override. Các giá trị 0 hợp lệ cho nhóm không
  áp dụng, toàn quote phải dương; không nhân lại per-trip fee theo số ngựa/chặng.
- Timeline request/plan/questions/change/OTP/deadline/cancellation/deployment chuyển
  UI sang current state + last actor/time/reason; không trả empty history giả như
  không có lịch sử thật. Contract/PDF list và mỗi Payment vẫn được hiển thị.
- Retire phần reviewChecks của browser cũ về hỏi/đáp/change proposal và test lookup
  arbitrary extension/history. Thay bằng A1 revision, current plan, original/effective/
  signed deadline, latest cancellation, stale operation and current handoff guards.
- Chạy hai case use thật: ROAD + bank, AIR sân bay→sân bay EXCLUDED ground legs +
  signed local VNPay fixture; provider public IPN vẫn là gate riêng, không gọi mock live.

## 6. Thứ tự triển khai, mỗi increment có kiểm chứng

| Bước | Deliverable | Điều kiện hoàn thành |
| --- | --- | --- |
| R0 foundation (lượt hiện tại) | Mapping này, scope đã chọn, 005 additive schema, SQL integrity tests | Không bảng/FK/cột cũ bị sửa; fresh003 và coexist004; drift rollback; chưa runtime cutover |
| R1 Customer + A1 | Typed repository/entities/config cho Horse/Request/Mapping; actual Customer routes/UI/revision; bỏ Q&A/change | Native SQL/API test giữ ownership/files/schedule/stale/retry; browser A1 |
| R2 B1 plan + quote/Draft | Typed plan 4 cost columns + COST_ITEM 4 quote rows + Contract revisions | Không Trip/Contract trước thời điểm đúng, floor/prep/air scope/Customer cost privacy |
| R3 PDF + OTP + C1 | Typed publication/sign/decline/expire/reissue/deadline/latest cancellation | Immutable hash/receipt; sliding budget; sign+invoice tx; current state retries |
| R4 payment + deployment | Typed PAYMENT/INVOICE/Trip fields, bank/VNPay/IPN/activation/handoff | money/idempotency/late/partial/excess/cancel/race/fault; exactly once; role/current event |
| R5 conversion + source cutover + cleanup | Offline source→typed mapping/parity; switch all Flow1 DI/routes; remove old runtime store/revision DTO/history UI | Connected browser scoped UAT; no runtime IFlow1StateStore/SQL JSON read/write; migration drop chỉ sau quyền operator riêng |

R1–R4 có thể phát triển typed services/repositories qua test-host DI trước; không
đấu một nửa endpoint vào typed rồi để endpoint còn lại đọc JSON stale. Process
runtime chọn một source duy nhất; source cutover thực hiện khi chuỗi typed đã chạy
đủ, không fallback từng owner. Không cần chờ quyền DB nghiệp vụ để làm source/test.
Cập nhật API/FE dùng current-state DTO trước khi swap DI; giữ source baseline chạy
được cho tới cutover. Không cần giữ test chỉ mirror IFlow1StateStore implementation;
chuyển các acceptance guard sang integration tests typed trước khi xóa tests cũ.

## 7. Chuyển đổi dữ liệu và bảo vệ teammate

- Inventory/dry-run riêng; không tự chạy 004 hoặc import cũ lên business DB. Fresh
  install đích là 000→003→005 và các script cutover được kiểm chứng sau này.
- Nếu 004 đã có dữ liệu: offline reader chỉ đọc legacy JSON để chuyển, không dùng
  làm runtime fallback. Chỉ project current request/plan, frozen request-horse,
  mỗi Contract/PDF/signed evidence và mỗi Payment; history không được nhét vào cột
  khác. Các nguồn cũ/bytes giữ nguyên để operator archive/review; bỏ timeline trong
  sản phẩm không cấp quyền xóa dữ liệu thật ngay.
- Pending change không tự approve/reject theo phỏng đoán; inventory báo cần operator
  giải quyết trước khi chuyển A1. Unknown policy/budget không phân bổ bừa vào nhóm;
  aggregate dòng theo category khi dữ liệu đủ, tổng phải khớp cost/quote cũ.
- Financial conflicts/PREPARED/signature/hash mismatch dừng rõ, không đánh dấu Ready.
  Không clamp/truncate reason/file refs/country/number để import pass.
- Dry-run ghi counts, semantic digest và parity report ra artifact riêng của operator;
  hash report là chứng cứ, không là kho business payload mới. Apply cần exact target,
  offline confirmation và reviewed fingerprint. Request/Contract/Invoice/Payment/
  Trip changes liên quan dùng cùng transaction; crash không để flag Ready nửa vời.
- Drop Flow1StateJson/Flow1StateVersion trên bốn bảng chỉ trong script retirement
  riêng sau khi source typed đã được kiểm và có quyền DB riêng. 005 không drop.
- Existing public IDs/FKs/status/tiền/Trip untouched trong foundation. Teammate INSERT có danh sách tên
  cột hiện hữu vẫn có nullable/default; INSERT không chỉ rõ tên cột, SELECT * theo ordinal,
  bulk mapping và shared routes phải audit trước merge/cutover; tất cả new unique constraints lọc typed
  rows hoặc FLOW1_QUOTE. Các team routes sửa shared entity cần audit khi R1–R4
  tích hợp; không tuyên bố hoàn toàn không ảnh hưởng chỉ vì không thêm bảng.
- Không push/merge main, deploy, thêm bảng persistent, đổi COST_ITEM.ContractID
  nullable, public private bytes, gửi OTP người thật hoặc tạo tiền thật.
