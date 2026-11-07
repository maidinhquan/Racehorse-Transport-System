# Flow 6 — Từ điển field / nguồn dữ liệu

Sinh từ explicit schemas. Required=property phải hiện diện; nullable=được nhận null. Optional thiếu thì bỏ, không giả giá trị. Mọi object từ chối property ngoài schema.

ID chỉ ở URL khi mutation định danh resource. Không có alias code/number/id trùng nghĩa: number chỉ RevisionNo. Không history/audit/timeline riêng.

## Receiver

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `name` | string; minLength=1; maxLength=100 | Có | Người nhận thực tế; có thể khác Customer. | `HANDOVER.ReceiverName` |
| `phone` | string; minLength=1; maxLength=20 | Có | Liên hệ người nhận. | `HANDOVER.ReceiverPhone` |
| `authorized` | boolean;  | Có | Đã kiểm quyền tại DELIVERY; không sao chép PICKUP. | `HANDOVER.IsAuthorized` |
| `otpEmail` | string; maxLength=254; format=email | Có | Email actual đã đối chiếu quyền; không nhận email khác ở lệnh gửi mã. | `HANDOVER_REVISION.ContentSnapshot.receiver.otpEmail → OtpEmail` |

## DeliveryItem

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `horseId` | string; maxLength=50 | Có | Ngựa đúng Request; mỗi ngựa một dòng. | `HANDOVER_ITEM.HorseID` |
| `microchipVerified` | boolean;  | Có | Kiểm chip tại DELIVERY; draft mới phải false cho đến khi kiểm. | `HANDOVER_ITEM.MicrochipVerified` |
| `condition` | string; minLength=1; maxLength=100 | Có | Tình trạng thực tế, không phải enum đạt/trượt. | `HANDOVER_ITEM.ConditionStatus` |
| `assets` | string; minLength=1; maxLength=2000 | Có | Tài sản đã đối chiếu, không có phải ghi rõ. | `HANDOVER_ITEM.AssetCheck` |
| `documents` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Giấy từng ngựa; không lặp giấy chung. | `HANDOVER_ITEM.DocumentsHandedOver` |
| `documentsReceivedAtUtc` | ['string', 'null']; format=date-time | Có | Null nếu không có nhận giấy. | `HANDOVER_ITEM.DocumentsReceivedAtUtc` |

## DeliveryContent

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `location` | string; minLength=1; maxLength=255 | Có | Điểm giao thực tế. | `HANDOVER.LocationName` |
| `receiver` | Receiver;  | Có | Người nhận lần giao này. | `HANDOVER + ContentSnapshot` |
| `commonDocuments` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Chỉ giấy chung thực giao. | `HANDOVER.DocumentsHandedOver` |
| `items` | array;  | Có | Đủ tập ngựa Request, không trùng horseId. | `HANDOVER_ITEM` |

## Delivery

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Biên bản DELIVERY, khác HandoffEventId. | `HANDOVER.HandoverID` |
| `tripId` | string; maxLength=50 | Có | Trip cha. | `HANDOVER.TripID` |
| `status` | string; enum=['DRAFT', 'AWAITING_OTP', 'CONFIRMED', 'REFUSED'] | Có | Đồng bộ latest revision. | `HANDOVER.Status` |
| `currentRevisionId` | string; maxLength=50 | Có | Suy ra latest RevisionNo; không có cột current revision mới. | `HANDOVER_REVISION ORDER BY RevisionNo DESC` |

## Revision

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | ID bản được xác nhận, không phải ContractVersionID. | `HANDOVER_REVISION.HandoverRevisionID` |
| `handoverId` | string; maxLength=50 | Có | Biên bản cha. | `HANDOVER_REVISION.HandoverID` |
| `number` | integer; minimum=1; maximum=2147483647 | Có | Thứ tự nghiệp vụ trong biên bản, không rowVersion. | `HANDOVER_REVISION.RevisionNo` |
| `status` | string; enum=['DRAFT', 'AWAITING_OTP', 'CONFIRMED', 'REFUSED'] | Có | Vòng đời bản. | `HANDOVER_REVISION.Status` |
| `content` | FrozenContent;  | Có | Toàn bộ bản trình người nhận; danh tính ngựa BE đóng băng, input không tự cấp. | `HANDOVER_REVISION.ContentSnapshot` |
| `createdAtUtc` | string; format=date-time | Có | Server ghi. | `HANDOVER_REVISION.CreatedAtUtc` |
| `confirmedAtUtc` | ['string', 'null']; format=date-time | Có | Null trước OTP đúng. | `HANDOVER_REVISION.ConfirmedAtUtc` |
| `refusalReason` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Chỉ có khi từ chối. | `HANDOVER_REVISION.RefusalReason` |
| `refusedAtUtc` | ['string', 'null']; format=date-time | Có | Null trước từ chối. | `HANDOVER_REVISION.RefusedAtUtc` |

## Lifecycle

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `tripStatus` | string; enum=['IN_TRANSIT', 'COMPLETED'] | Có | Trạng thái Trip khác Request. | `TRIP_PLAN.Status` |
| `requestStatus` | string; enum=['IN_PROGRESS', 'DELIVERED', 'CLOSED'] | Có | Tiến độ đơn. | `TRANSPORT_REQUEST.Status` |
| `contractStatus` | string; enum=['EFFECTIVE', 'SETTLED', 'CLOSED'] | Có | Vòng đời tổng; version vẫn SIGNED. | `CONTRACT.ContractStatus` |

## TripSummary

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `tripId` | string; maxLength=50 | Có | Chuyến được giao. | `TRIP_PLAN.TripID` |
| `requestId` | string; maxLength=50 | Có | Đơn cha. | `TRIP_PLAN.RequestID` |
| `status` | string; enum=['IN_TRANSIT', 'COMPLETED'] | Có | Tiến độ chuyến. | `TRIP_PLAN.Status` |

## Context

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `tripId` | string; maxLength=50 | Có | Chuyến tiếp nhận. | `TRIP_PLAN.TripID` |
| `requestId` | string; maxLength=50 | Có | Nguồn ngựa/người nhận. | `TRIP_PLAN.RequestID` |
| `contractId` | string; maxLength=50 | Có | Đúng Trip/Request/Customer. | `CONTRACT.ContractID` |
| `contractVersionNo` | integer; minimum=1; maximum=2147483647 | Có | CurrentVersionNo trỏ SIGNED; không MAX. | `CONTRACT.CurrentVersionNo` |
| `lifecycle` | Lifecycle;  | Có | Các status khác nghĩa được gom rõ. | `TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT` |
| `pickupHandoverIds` | array;  | Có | PICKUP CONFIRMED; thiếu trả [] + warnings. | `HANDOVER Type=PICKUP` |
| `horseIds` | array;  | Có | Tập ngựa Request. | `REQUEST_HORSE_MAPPING` |
| `designatedReceiverName` | ['string', 'null']; minLength=1; maxLength=100 | Có | Người chỉ định, không phải actual receiver snapshot. | `TRANSPORT_REQUEST.DesignatedReceiverName` |
| `designatedReceiverPhone` | ['string', 'null']; minLength=1; maxLength=20 | Có | Liên hệ chỉ định. | `TRANSPORT_REQUEST.DesignatedReceiverPhone` |
| `deliveryId` | nullable reference;  | Có | Null khi chưa tạo DELIVERY. | `HANDOVER Type=DELIVERY` |
| `warnings` | array;  | Có | Thiếu baseline/hồ sơ/ngoại lệ; không tự chặn mọi incident mở. | `Derived read-only` |

## OtpState

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `revisionId` | string; maxLength=50 | Có | Bản được gửi mã. | `HANDOVER_REVISION.HandoverRevisionID` |
| `expiresAtUtc` | string; format=date-time | Có | Hạn server. | `HANDOVER_REVISION.OtpExpiresAtUtc` |
| `resendAfterUtc` | string; format=date-time | Có | Giờ được gửi lại. | `Derived sentAt + HANDOVER_OTP_RESEND_SECONDS` |
| `attemptsRemaining` | integer; minimum=0; maximum=2147483647 | Có | Không trả hash/mã. | `HANDOVER_OTP_MAX_ATTEMPTS - OtpFailedAttempts` |

## OtpInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `otp` | string;  | Có | Mã người nhận cung cấp cho nhân sự tại chỗ; không log. | `Transient verification` |

## ReasonInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `reason` | string; minLength=1; maxLength=2000 | Có | Lý do từ chối thực tế. | `HANDOVER_REVISION.RefusalReason` |

## ConfirmedDelivery

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `revision` | Revision;  | Có | Bản confirmed. | `HANDOVER_REVISION` |
| `lifecycle` | Lifecycle;  | Có | Kết quả transaction. | `TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT` |

## Settlement

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Một hồ sơ/Contract và Trip. | `TRIP_SETTLEMENT.SettlementID` |
| `contractId` | string; maxLength=50 | Có | Hợp đồng giá. | `TRIP_SETTLEMENT.ContractID` |
| `tripId` | string; maxLength=50 | Có | Chuyến giao. | `TRIP_SETTLEMENT.TripID` |
| `contractVersionNo` | integer; minimum=1; maximum=2147483647 | Có | Bản đã ký. | `TRIP_SETTLEMENT.ContractVersionNo` |
| `status` | string; enum=['DRAFT', 'AWAITING_PAYMENT', 'SETTLED', 'CLOSED'] | Có | Tiến độ tất toán. | `TRIP_SETTLEMENT.Status` |
| `handoverRevisionId` | nullable reference;  | Có | Chỉ DELIVERY CONFIRMED; null khi chuẩn bị. | `TRIP_SETTLEMENT.HandoverRevisionID` |
| `finalInvoiceId` | nullable reference;  | Có | Invoice cuối hiện hành. | `TRIP_SETTLEMENT.FinalInvoiceID` |
| `settledAtUtc` | ['string', 'null']; format=date-time | Có | Null trước tất toán. | `TRIP_SETTLEMENT.SettledAtUtc` |
| `closedAtUtc` | ['string', 'null']; format=date-time | Có | Null trước đóng. | `TRIP_SETTLEMENT.ClosedAtUtc` |
| `feedbackStartsAtUtc` | ['string', 'null']; format=date-time | Có | Window hiện hành, không history. | `TRIP_SETTLEMENT.FeedbackStartedAtUtc` |
| `feedbackEndsAtUtc` | ['string', 'null']; format=date-time | Có | Hạn BE tính theo policy. | `TRIP_SETTLEMENT.FeedbackEndsAtUtc` |

## Balance

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `signedPriceVnd` | integer; minimum=0; maximum=9999999999 | Có | Giá bán đã ký, không giá vốn. | `CONTRACT_VERSION.ContentSnapshot` |
| `chargesVnd` | integer; minimum=0; maximum=9999999999 | Có | Tổng CHARGE đã quyết định. | `SUM SETTLEMENT_ADJUSTMENT.Amount WHERE CHARGE` |
| `discountsVnd` | integer; minimum=0; maximum=9999999999 | Có | Tổng DISCOUNT; không tự lấy Incident cost. | `SUM SETTLEMENT_ADJUSTMENT.Amount WHERE DISCOUNT` |
| `depositPaidVnd` | integer; minimum=0; maximum=9999999999 | Có | Cọc verified đúng version. | `DEPOSIT INVOICE + SUCCESS PAYMENT` |
| `finalDueVnd` | integer; minimum=0; maximum=9999999999 | Có | Giá sau điều chỉnh trừ cọc, không trừ finalPaid. | `Derived formula` |
| `finalPaidVnd` | integer; minimum=0; maximum=9999999999 | Có | Thu verified trên final invoice hiện hành. | `SUCCESS PAYMENT` |
| `remainingVnd` | integer; minimum=0; maximum=9999999999 | Có | Còn phải thu, khác giá hợp đồng. | `Derived finalDue-finalPaid` |
| `financialReviewRequired` | boolean;  | Có | Có ngoại lệ đối soát. | `PAYMENT.FinancialReviewRequired + billing validation` |

## Invoice

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Hóa đơn cuối. | `INVOICE.InvoiceID` |
| `settlementId` | string; maxLength=50 | Có | Suy từ FinalInvoiceID, không thêm cột. | `TRIP_SETTLEMENT.FinalInvoiceID` |
| `totalVnd` | integer; minimum=0; maximum=9999999999 | Có | Nghĩa vụ sau trừ cọc lúc phát hành. | `INVOICE.TotalPayableAmount` |
| `paidVnd` | integer; minimum=0; maximum=9999999999 | Có | Tiền verified invoice này. | `INVOICE.PaidAmount` |
| `status` | string; enum=['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] | Có | Không dùng VOID. | `INVOICE.PaymentStatus` |
| `dueAtUtc` | ['string', 'null']; format=date-time | Có | Hạn thu; quá hạn không tự PAID. | `INVOICE.DueDate` |

## InvoiceInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `dueAtUtc` | string; format=date-time | Có | Hạn Manager chọn, phải tương lai. | `INVOICE.DueDate` |

## PaymentSession

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `paymentId` | string; maxLength=50 | Có | Attempt lưu trước redirect. | `PAYMENT.PaymentID` |
| `paymentUrl` | string; format=uri | Có | URL adapter, không chứng cứ tiền. | `Provider URL` |
| `expiresAtUtc` | string; format=date-time | Có | Hạn attempt. | `PAYMENT.VnpayExpiresAtUtc` |

## Payment

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Attempt, không invoice. | `PAYMENT.PaymentID` |
| `invoiceId` | string; maxLength=50 | Có | Invoice cuối của attempt. | `PAYMENT.InvoiceID` |
| `amountVnd` | integer; minimum=1; maximum=9999999999 | Có | Tiền attempt. | `PAYMENT.Amount` |
| `status` | string; enum=['PENDING_GATEWAY', 'SUCCESS', 'FAILED', 'REVIEW_REQUIRED'] | Có | Giữ enum DB; không thêm PROCESSING. | `PAYMENT.Status` |
| `financialReviewRequired` | boolean;  | Có | Ngoại lệ cần đối soát. | `PAYMENT.FinancialReviewRequired` |

## AdjustmentInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `type` | string; enum=['CHARGE', 'DISCOUNT', 'REFUND'] | Có | Manager quyết định trực tiếp; không có Status/Bearer. | `SETTLEMENT_ADJUSTMENT.AdjustmentType` |
| `amountVnd` | integer; minimum=1; maximum=9999999999 | Có | VND nguyên dương. | `SETTLEMENT_ADJUSTMENT.Amount` |
| `reason` | string; minLength=1; maxLength=2000 | Có | Lý do phát sinh. | `SETTLEMENT_ADJUSTMENT.Reason` |
| `decisionReason` | string; minLength=1; maxLength=2000 | Có | Căn cứ Manager xác nhận, khác lý do phát sinh. | `SETTLEMENT_ADJUSTMENT.DecisionReason` |
| `incidentId` | string; maxLength=50 | Không | Nguồn tùy chọn cùng Trip. | `SETTLEMENT_ADJUSTMENT.IncidentID` |
| `costItemId` | string; maxLength=50 | Không | Nguồn tùy chọn cùng Contract, không dùng lại. | `SETTLEMENT_ADJUSTMENT.CostItemID` |

## Adjustment

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `type` | string; enum=['CHARGE', 'DISCOUNT', 'REFUND'] | Có | Manager quyết định trực tiếp; không có Status/Bearer. | `SETTLEMENT_ADJUSTMENT.AdjustmentType` |
| `amountVnd` | integer; minimum=1; maximum=9999999999 | Có | VND nguyên dương. | `SETTLEMENT_ADJUSTMENT.Amount` |
| `reason` | string; minLength=1; maxLength=2000 | Có | Lý do phát sinh. | `SETTLEMENT_ADJUSTMENT.Reason` |
| `decisionReason` | string; minLength=1; maxLength=2000 | Có | Căn cứ Manager xác nhận, khác lý do phát sinh. | `SETTLEMENT_ADJUSTMENT.DecisionReason` |
| `incidentId` | string; maxLength=50 | Không | Nguồn tùy chọn cùng Trip. | `SETTLEMENT_ADJUSTMENT.IncidentID` |
| `costItemId` | string; maxLength=50 | Không | Nguồn tùy chọn cùng Contract, không dùng lại. | `SETTLEMENT_ADJUSTMENT.CostItemID` |
| `id` | string; maxLength=50 | Có | Khoản đã quyết định, bất biến. | `SETTLEMENT_ADJUSTMENT.AdjustmentID` |
| `settlementId` | string; maxLength=50 | Có | Hồ sơ cha. | `SETTLEMENT_ADJUSTMENT.SettlementID` |
| `originalInvoiceId` | string; maxLength=50 | Có | API mới bắt buộc invoice cơ sở trước quyết định; null SQL chỉ dành dữ liệu cũ chưa tương thích. | `SETTLEMENT_ADJUSTMENT.OriginalInvoiceID` |
| `adjustedInvoiceId` | nullable reference;  | Có | Invoice thay thế; null trước áp hoặc REFUND. | `SETTLEMENT_ADJUSTMENT.AdjustedInvoiceID` |
| `refundStatus` | ['string', 'null']; enum=['REQUESTED', 'PROCESSING', 'COMPLETED', None] | Có | Chỉ REFUND, loại khác null. | `SETTLEMENT_ADJUSTMENT.RefundStatus` |
| `decidedAtUtc` | string; format=date-time | Có | Server ghi quyết định. | `SETTLEMENT_ADJUSTMENT.DecidedAtUtc` |

## RefundInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `reference` | string; minLength=1; maxLength=100 | Có | Mã hoàn thực tế; Flow6 bắt buộc, khác Flow1 status-only. | `SETTLEMENT_ADJUSTMENT.RefundReference` |
| `refundedAtUtc` | string; format=date-time | Có | Thực hoàn, từ lúc quyết định đến server now. | `SETTLEMENT_ADJUSTMENT.RefundedAtUtc` |

## Refund

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `adjustmentId` | string; maxLength=50 | Có | Khoản hoàn. | `SETTLEMENT_ADJUSTMENT.AdjustmentID` |
| `status` | string; enum=['REQUESTED', 'PROCESSING', 'COMPLETED'] | Có | Giữ DB enum. | `SETTLEMENT_ADJUSTMENT.RefundStatus` |
| `reference` | ['string', 'null']; minLength=1; maxLength=100 | Có | Null trước hoàn; hoàn xong bất biến. | `SETTLEMENT_ADJUSTMENT.RefundReference` |
| `refundedAtUtc` | ['string', 'null']; format=date-time | Có | Null trước hoàn. | `SETTLEMENT_ADJUSTMENT.RefundedAtUtc` |

## CaseInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `type` | string; enum=['COMPLAINT', 'SUPPORT'] | Có | Complaint giữ đơn mở; support sau đóng không mở lại. | `CUSTOMER_CASE.CaseType` |
| `subject` | string; minLength=1; maxLength=200 | Có | Tiêu đề. | `CUSTOMER_CASE.Subject` |
| `description` | string; minLength=1; maxLength=2000 | Có | Nội dung Customer báo, không hội thoại. | `CUSTOMER_CASE.Description` |

## Case

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `type` | string; enum=['COMPLAINT', 'SUPPORT'] | Có | Complaint giữ đơn mở; support sau đóng không mở lại. | `CUSTOMER_CASE.CaseType` |
| `subject` | string; minLength=1; maxLength=200 | Có | Tiêu đề. | `CUSTOMER_CASE.Subject` |
| `description` | string; minLength=1; maxLength=2000 | Có | Nội dung Customer báo, không hội thoại. | `CUSTOMER_CASE.Description` |
| `id` | string; maxLength=50 | Có | Phiếu khác INCIDENT. | `CUSTOMER_CASE.CaseID` |
| `settlementId` | string; maxLength=50 | Có | Chủ lấy qua settlement. | `CUSTOMER_CASE.SettlementID` |
| `status` | string; enum=['OPEN', 'IN_PROGRESS', 'RESOLVED'] | Có | Manager phản hồi rồi đóng, không chờ accept. | `CUSTOMER_CASE.Status` |
| `resolution` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Kết quả hiện tại. | `CUSTOMER_CASE.ResolutionText` |
| `openedAtUtc` | string; format=date-time | Có | Server ghi lúc tiếp nhận. | `CUSTOMER_CASE.OpenedAtUtc` |
| `resolvedAtUtc` | ['string', 'null']; format=date-time | Có | Null trước đóng phiếu. | `CUSTOMER_CASE.ResolvedAtUtc` |

## ResolveInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `resolution` | string; minLength=1; maxLength=2000 | Có | Phản hồi cuối Manager. | `CUSTOMER_CASE.ResolutionText` |

## FeedbackInput

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `rating` | integer; minimum=1; maximum=5 | Có | Số sao 1..5, không complaint. | `CUSTOMER_FEEDBACK.Rating` |
| `comment` | ['string', 'null']; minLength=1; maxLength=2000 | Không | Lời đánh giá tùy chọn. | `CUSTOMER_FEEDBACK.Comment` |

## Feedback

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `rating` | integer; minimum=1; maximum=5 | Có | Số sao 1..5, không complaint. | `CUSTOMER_FEEDBACK.Rating` |
| `comment` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Lời đánh giá tùy chọn. | `CUSTOMER_FEEDBACK.Comment` |
| `id` | string; maxLength=50 | Có | Một đánh giá/settlement kể cả reset. | `CUSTOMER_FEEDBACK.FeedbackID` |
| `createdAtUtc` | string; format=date-time | Có | Server ghi. | `CUSTOMER_FEEDBACK.CreatedAtUtc` |

## CloseResult

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `settlementId` | string; maxLength=50 | Có | Hồ sơ đã đóng. | `TRIP_SETTLEMENT.SettlementID` |
| `closedAtUtc` | string; format=date-time | Có | Mốc server. | `TRIP_SETTLEMENT.ClosedAtUtc` |
| `lifecycle` | Lifecycle;  | Có | Request/Contract CLOSED, Trip COMPLETED. | `TRIP_PLAN/TRANSPORT_REQUEST/CONTRACT` |

## Error

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `success` | const;  | Có | Lỗi. | `Envelope` |
| `message` | string; minLength=1; maxLength=2000 | Có | Hiển thị; không phân nhánh theo message. | `Envelope` |
| `data` | null;  | Có | Không có dữ liệu. | `Envelope` |
| `errorCode` | string; minLength=1; maxLength=100 | Có | Mã ổn định. | `Validation` |
| `errors` | object;  | Không | Chỉ khi validation theo field. | `Validation` |

## PickupReference

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `handoverId` | string; maxLength=50 | Có | PICKUP được dùng đối chiếu, không bản DELIVERY. | `HANDOVER.HandoverID` |
| `receiverName` | ['string', 'null']; minLength=1; maxLength=100 | Có | Người đã nhận lúc đầu chuyến. | `HANDOVER.ReceiverName` |
| `items` | array;  | Có | Dữ liệu lúc PICKUP; chỉ đọc, không sao chép flag sang DELIVERY. | `HANDOVER_ITEM` |

## HealthReference

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Nguồn sức khỏe đọc từ Flow4. | `HEALTH_LOG.LogID` |
| `horseId` | string; maxLength=50 | Có | Ngựa cùng Request. | `HEALTH_LOG.HorseID` |
| `recordedAtUtc` | string; format=date-time | Có | LogTime được adapter chuẩn hóa UTC. | `HEALTH_LOG.LogTime` |
| `description` | ['string', 'null']; minLength=1 | Có | Mô tả, không enum HEALTHY. | `HEALTH_LOG.Description` |
| `healthStatus` | ['string', 'null']; minLength=1; maxLength=100 | Có | Văn bản, không tự coi null là tốt. | `HEALTH_LOG.HealthStatus` |

## IncidentReference

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `id` | string; maxLength=50 | Có | Nguồn sự cố, không CUSTOMER_CASE. | `INCIDENT.IncidentID` |
| `status` | ['string', 'null']; enum=['OPEN', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'RESOLVED', None] | Có | Null legacy vẫn chưa xác định; không tự chặn mở giao. | `INCIDENT.Status` |
| `description` | ['string', 'null']; minLength=1 | Có | Nội dung tham chiếu; không tự thành phí. | `INCIDENT.Description` |

## HorseIdentity

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `name` | string; minLength=1; maxLength=100 | Có | Tên ngựa đóng băng lúc lập bản, không đọc master khi xem cũ. | `HANDOVER_REVISION.ContentSnapshot.items.identity.name ← HORSE.Name` |
| `microchip` | string; minLength=1; maxLength=50 | Có | Mã chip đã dùng đối chiếu tại lần giao. | `HANDOVER_REVISION.ContentSnapshot.items.identity.microchip ← HORSE.Microchip_ISO` |

## SnapshotItem

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `horseId` | string; maxLength=50 | Có | Ngựa đúng Request; mỗi ngựa một dòng. | `HANDOVER_ITEM.HorseID` |
| `microchipVerified` | boolean;  | Có | Kiểm chip tại DELIVERY; draft mới phải false cho đến khi kiểm. | `HANDOVER_ITEM.MicrochipVerified` |
| `condition` | string; minLength=1; maxLength=100 | Có | Tình trạng thực tế, không phải enum đạt/trượt. | `HANDOVER_ITEM.ConditionStatus` |
| `assets` | string; minLength=1; maxLength=2000 | Có | Tài sản đã đối chiếu, không có phải ghi rõ. | `HANDOVER_ITEM.AssetCheck` |
| `documents` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Giấy từng ngựa; không lặp giấy chung. | `HANDOVER_ITEM.DocumentsHandedOver` |
| `documentsReceivedAtUtc` | ['string', 'null']; format=date-time | Có | Null nếu không có nhận giấy. | `HANDOVER_ITEM.DocumentsReceivedAtUtc` |
| `identity` | HorseIdentity;  | Có | Danh tính BE lấy từ hồ sơ và lưu vào snapshot; caller không được sửa. | `HANDOVER_REVISION.ContentSnapshot.items.identity` |

## FrozenContent

| Field | Kiểu / ràng buộc | Bắt buộc | Tác dụng | Nguồn lưu / tính |
|---|---|---|---|---|
| `location` | string; minLength=1; maxLength=255 | Có | Điểm giao thực tế. | `HANDOVER.LocationName` |
| `receiver` | Receiver;  | Có | Người nhận lần giao này. | `HANDOVER + ContentSnapshot` |
| `commonDocuments` | ['string', 'null']; minLength=1; maxLength=2000 | Có | Chỉ giấy chung thực giao. | `HANDOVER.DocumentsHandedOver` |
| `items` | array;  | Có | Kiểm tra thực tế cùng danh tính đóng băng; không dựng master khi đọc lại. | `HANDOVER_REVISION.ContentSnapshot.items` |

