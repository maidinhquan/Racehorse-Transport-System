# Flow6 — Các khác biệt của teammate so với chuẩn ID/STATUS

Ngày 30/10/2026. Theo quyết định của người dùng: **ID_NAME_RULE_Reviewed.md và DATABASE_STATUS_CONVENTION.md là chuẩn, hợp đồng API phải tuân theo; không đổi rule để hợp thức hóa một workflow khác.**

Nguồn chuẩn: [ID_NAME_RULE](../../data/ID_NAME_RULE_Reviewed.md), [STATUS](../../data/DATABASE_STATUS_CONVENTION.md). Đối chiếu bản mình trong Flow6_MyDraft_2026-10-29 và bản teammate 1.1.0, commit d0b13a6, trong Flow6. Không sửa hai bộ hợp đồng ở lượt tổng hợp này.

## 1. Luồng đúng theo chuẩn

```text
Trip IN_TRANSIT / Request IN_PROGRESS / Contract EFFECTIVE / version SIGNED
→ Kiểm người nhận, từng ngựa, tài sản và giấy tờ DELIVERY
→ Biên bản DRAFT → AWAITING_OTP
→ Người nhận xác nhận OTP đúng revision → CONFIRMED
→ Trip COMPLETED / Request DELIVERED, Contract vẫn EFFECTIVE
→ Thu số dư qua VNPay; Invoice cuối PAID
→ Hoàn tất nghiệm thu/tất toán: Settlement SETTLED / Contract SETTLED
→ Bắt đầu feedback window theo FEEDBACK_WINDOW_HOURS
→ Không complaint mở, không nợ/hoàn/đối soát treo và hết window
→ Settlement / Request / Contract CLOSED; Trip vẫn COMPLETED, version vẫn SIGNED
```

Phiếu: Customer gửi → OPEN → Manager xử lý IN_PROGRESS → phản hồi và RESOLVED; không có bước Customer đồng ý kết quả. Còn ý kiến tạo phiếu mới. Khi xử lý hết complaint và nghĩa vụ tiền hoàn thành, reset đủ feedback window hiện hành. Rating không complaint; SUPPORT sau CLOSED không tự mở lại đơn.

Đóng theo điều kiện không có nghĩa cứ quá hạn là đóng: thiếu tiền hoặc còn complaint thì không đóng dù hết giờ. Rule phân biệt đóng sau window đủ điều kiện với tự hủy/tự xác nhận thanh toán vì quá hạn.

## 2. Luồng teammate đang mô tả

```text
FINAL_ARRIVED và blockers Flow5 hợp lệ
→ Người nhận ký ảnh + Driver POST hoàn thành bàn giao
→ Trip COMPLETED / Request DELIVERED
→ Mở acceptance window ngay lúc giao, đề xuất 48h
→ Customer ACCEPTED (khóa complaint mới)
→ Mở payment window riêng và cho thanh toán số dư
→ Manager đóng NORMAL khi đủ tiền, không cần chờ hết 48h
```

Nhánh khiếu nại: Customer báo → Manager PROPOSED → Customer chấp nhận thành AGREED → Manager apply → RESOLVED → mở lại acceptance. Nhánh dispute có UNDER_RESOLUTION, RESUME_ACCEPTANCE/CLOSE_AFTER_DISPUTE và có thể COMPANY_WAIVER. Đây là thay đổi nghiệp vụ, không chỉ alias UI.

## 3. Các khác biệt làm đổi luồng

| # | Chỗ khác | Chuẩn và bản mình | Bản teammate | Luồng sẽ thay đổi thế nào nếu giữ teammate? | Kết luận theo chuẩn |
|---|---|---|---|---|---|
| 1 | Xác nhận bàn giao | DRAFT → AWAITING_OTP → CONFIRMED, OTP gắn đúng revision; từ chối REFUSED | Ảnh signatureFileId, POST bàn giao trực tiếp | Không gửi/kiểm OTP; file chữ ký trở thành điều kiện hoàn tất Trip | Phải sửa teammate về OTP; ảnh không thay OTP |
| 2 | Bước Customer nghiệm thu | Rule không đặt một Customer ACCEPTED độc lập làm gate thu tiền; tất toán đủ tiền mở feedback | Customer phải ACCEPTED trước thanh toán thông thường | Đã giao nhưng khách không bấm nghiệm thu thì vẫn chưa được trả số dư | Bỏ gate mới, bám Settlement hiện hành |
| 3 | Thời điểm mở window | Sau xác minh đủ tiền và hoàn tất nghiệm thu/tất toán | Ngay khi bàn giao xong | Khách còn nợ nhưng acceptance clock đã chạy; hai mục đích bị đổi | Giữ FeedbackStartedAtUtc/EndsAtUtc sau SETTLED |
| 4 | Loại/số đồng hồ | Một feedback window hiện hành, thời lượng đọc policy | Acceptance và Payment window riêng; cấu hình đề xuất 48h/24h | Có pause, overdue, gia hạn riêng trước/sau acceptance | Không thay feedback bằng hai window mới |
| 5 | Complaint cần ai quyết định? | Manager phản hồi rồi RESOLVED, không chờ Customer đồng ý | PROPOSED → Customer AGREED → Manager apply → RESOLVED | Khách chưa đồng ý hoặc Manager chưa apply thì phiếu tiếp tục treo | Trái rule mục 13; quay về OPEN/IN_PROGRESS/RESOLVED |
| 6 | Quyền complaint sau xác nhận | Không có Customer ACCEPTED để khóa complaint; xét giao hàng/window/đóng | ACCEPTED khóa complaint mới dù còn thời gian | Customer kiểm nhận sớm rồi phát hiện vấn đề không dùng complaint thông thường được | Không thêm khóa này |
| 7 | Khiếu nại khi còn nợ | Được báo sau giao dù chưa tất toán/chưa mở feedback window | Báo trong acceptance window; quá hạn cần gia hạn theo luồng mới | Quyền gửi vấn đề bị gắn với hạn nghiệm thu thay vì trạng thái sau giao/feedback | Giữ rule cho phép báo khi chưa trả đủ |
| 8 | Reset sau complaint | Hết complaint + tiền xong → reset đủ feedback window | Hết vụ và apply adjustment → mở lại acceptance, sau đó mới trả tiền | Vòng sửa quay về Customer nghiệm thu lần nữa, khác theo dõi sau tất toán | Reset feedback, không tạo vòng ACCEPTED |
| 9 | Đóng sớm | CLOSED sau tất toán, hết feedback window và không complaint mở | Có thể Manager đóng ngay sau ACCEPTED và đủ tiền | Cửa sổ phản hồi chưa hết nhưng đơn đã CLOSED | Trái định nghĩa CLOSED hiện hành; không đóng sớm |
| 10 | Ai thực hiện đóng? | Backend/worker thực hiện đóng theo đủ điều kiện; Manager có thể gọi cùng guard | Chỉ Manager, job chỉ cảnh báo | Hồ sơ đủ điều kiện vẫn treo nếu Manager không thao tác | Không loại bỏ cơ chế đóng theo rule |
| 11 | Dispute | Không có workflow dispute riêng trong năm bảng | Manager mở dispute, ghi quyết định và apply | Thêm nhánh kết thúc không cần Customer ACCEPTED hoặc quay lại nghiệm thu | Ngoài chuẩn, không đưa vào baseline hiện tại |
| 12 | Request status | Vận chuyển IN_PROGRESS, giao xong DELIVERED, kết thúc CLOSED | Thêm UNDER_RESOLUTION; mô tả đầu vào cùng Flow4 là Request IN_TRANSIT | Consumer phải xử lý status chưa có trong rule; có thể mất đơn khỏi filter cũ | Bỏ status Request ngoài chuẩn; Trip vẫn IN_TRANSIT hợp lệ |
| 13 | Chat/history | Chỉ kết quả/metadata hiện hành, không hội thoại/audit/window history riêng | messages, dispute updates, deadlineHistory | Nghiệp vụ phải lưu và phát lại nhiều lần trao đổi/gia hạn | Bỏ phần lưu riêng theo phạm vi đã chốt |
| 14 | Tăng/giảm/hoàn | AdjustmentType CHARGE/DISCOUNT/REFUND, Manager quyết định trực tiếp | REDUCTION/WAIVER phát sinh qua proposal/dispute | Mất đường CHARGE tương đương, thêm miễn nợ và phụ thuộc Customer proposal | Dùng đúng loại đã chốt; không coi miễn nợ là tiền nhận |
| 15 | Đánh giá sao | CUSTOMER_FEEDBACK, rating 1..5, không kéo dài hạn/không tự thành complaint | Không có endpoint tương đương | Customer không có thao tác rating sau chuyến | Bổ sung theo bảng/rule hiện có |
| 16 | Hỗ trợ sau đóng | CUSTOMER_CASE SUPPORT, không tự reopen | CLOSED chỉ đọc; chưa có API SUPPORT tương đương | Thiếu đường báo hỗ trợ sau khi đóng | Bổ sung SUPPORT, giữ CLOSED |
| 17 | Tài sản và giấy tờ giao nhận | HANDOVER_ITEM.AssetCheck, DocumentsHandedOver/ReceivedAtUtc; giấy chung ở HANDOVER | HorseHandover chỉ horseId/chip/condition/note/photo; Handover chưa có trường tương đương giấy/tài sản | Có thể ký nhận ngựa mà thiếu nội dung đối chiếu tài sản/giấy được giao | Bổ sung mapping/nội dung biên bản, không chỉ ảnh và note chung |
| 18 | Mốc arrival và phân công chặng | HANDOFF cũ không đặt thêm persisted arrival gate, assignment Trip hiện có | Bắt FINAL_ARRIVED và tổ chặng cuối theo contract Flow4 mới | Flow6 phụ thuộc execution model/phân công mới, có thể bị chặn nếu Flow4 chưa cung cấp | Có thể là integration context, nhưng không tự thêm status DB/đổi Request enum; chưa có capability không giả đã ready |

Tham chiếu chuẩn: ID rule mục 5.4–5.5 và phần năm bảng; STATUS mục 3.6, 3.19–3.24, mục 6, mục 12–13. Bản teammate: FLOW6.md mục 1, 3–7 và schema HandoverInput/HorseHandover/Aftercare.

## 4. ID_NAME_RULE: khác tên nào, ảnh hưởng gì?

| Resource | Rule | Bản teammate | Ảnh hưởng / sửa theo chuẩn |
|---|---|---|---|
| Request/Trip/Invoice/Payment | REQUEST/TRIP/INVOICE/PAYMENT + số tối thiểu 3 chữ số, tối đa cột 50 | Pattern đúng ở các ID này | Giữ được; không cần đổi |
| Handover | HANDOVER_001 | opaque 1..80 ký tự | Cho phép mã ngoài rule hoặc vượt cột 50; bắt đúng prefix/length |
| Handover revision | HANDOVER_REVISION_001; RevisionNo integer | Không có resource OTP revision tương đương | Khó bind OTP/xem lại đúng bản; thêm revision theo chuẩn, không lấy aggregate version thay |
| Settlement | SETTLEMENT_001 | DTO Settlement không có SettlementID | Không nhất thiết cấm DTO, nhưng cần mapping rõ hồ sơ cha; không coi InvoiceID là SettlementID |
| Adjustment | SETTLEMENT_ADJUSTMENT_001 | opaque, ví dụ adjustment_001 | Ví dụ không theo ID rule; dùng ID backend cấp đúng tiền tố |
| Case | CUSTOMER_CASE_001 | Complaint ID opaque | Nếu cùng bảng Case thì dùng nguyên CaseID; không tự tạo bảng Complaint khác |
| Feedback | CUSTOMER_FEEDBACK_001 | Chưa có endpoint | Bổ sung đúng ID và unique một dòng/settlement |
| File/message/proposal/dispute | Chưa có resource tương ứng được chốt | Có nhiều opaque ID | ID file bên storage có thể là token riêng, không ép prefix bảng chưa tồn tại. Các resource mới không được giả có PK/FK hợp lệ trong mô hình hiện hành |

Bản mình dùng prefix cụ thể và field source mapping cho các resource DB. Tuy nhiên không vì vậy coi mọi lựa chọn trong bản mình là rule bắt buộc: namespace /operations/flow6, cách tách GET, UTC ISO và header idempotency một số API là thiết kế API đề xuất, không phải điều ID_NAME_RULE tự quy định.

## 5. Status nào sai luồng, status nào chỉ là projection?

| Teammate | Chuẩn | Phân loại và cách xử lý |
|---|---|---|
| Request UNDER_RESOLUTION | Không thuộc enum Request mục 12.1 | Ngoài chuẩn; không ghi vào Request.Status hoặc giả là đã chuẩn hóa |
| Complaint PROPOSED/AGREED | CUSTOMER_CASE OPEN/IN_PROGRESS/RESOLVED | Không chỉ đổi tên: tạo thêm vòng Customer đồng ý; bỏ workflow thừa để theo rule |
| Acceptance PENDING/ACCEPTED/NOT_REQUIRED_BY_DISPUTE | Không có resource acceptance độc lập trong mô hình đích | Không ghi vào Settlement.Status; không dùng làm gate thay tất toán/feedback |
| Phase AWAITING_ACCEPTANCE/COMPLAINT_OPEN/... | Phase có thể là projection UI | Chỉ giữ projection nếu suy ra từ rule đúng; không tạo status DB hay dùng projection để thay nghiệp vụ |
| Payment PROCESSING | DB PENDING_GATEWAY hoặc REVIEW_REQUIRED | Mapping UI đã có tiền lệ, không tự sai; phải giữ phân biệt provider/review |
| Payment VERIFIED | DB SUCCESS | Có thể alias UI nhưng chưa theo bảng mapping hiện hành; nên dùng SUCCESS hoặc mapping ghi rõ |
| Payment RECONCILIATION_REQUIRED | DB REVIEW_REQUIRED hoặc flag FinancialReviewRequired theo tình huống | Cần mapping cụ thể; không cho nhãn này vào cột DB |
| Payment EXPIRED | Không có canonical Payment EXPIRED | Có thể trạng thái session suy từ hạn; không biến hết hạn thành FAILED hoặc xác nhận tiền thất bại khi chưa có kết quả provider |
| Refund PENDING/VERIFIED | REQUESTED/COMPLETED | Có thể alias UI nếu đủ bằng chứng; API nội bộ nên dùng đúng chuẩn để khỏi thêm adapter |
| Refund FAILED | Không thuộc enum RefundStatus | Không lưu thẳng; giữ trạng thái nghĩa vụ còn mở và kết quả đối soát phù hợp, không tự bỏ nghĩa vụ hoàn |
| Adjustment REDUCTION | DISCOUNT | Chỉ mapping nếu cùng nghĩa; không mang cả proposal workflow mới theo |
| Adjustment WAIVER | Chưa có loại riêng | Ngoài danh mục hiện hành; không tự tăng tiền đã nhận hoặc đưa vào enum mới |

Nguyên tắc: **khác tên DTO chưa chắc sai; đổi chủ thể quyết định, thứ tự thu tiền, thời điểm mở window hoặc điều kiện CLOSED là đổi nghiệp vụ thật.**

## 6. Ví dụ nhìn thấy khác luồng

### A. Giao xong, Customer chưa đăng nhập

- Theo chuẩn: người nhận OTP xong → Request DELIVERED → thu số dư theo invoice, không cần Customer ACCEPTED trước.
- Teammate: người nhận ký xong → chờ Customer nghiệm thu → Customer chưa bấm thì thường chưa được mở thanh toán; quá hạn cần Manager gia hạn/dispute.

### B. Customer đã trả đủ ngay trong ngày giao

- Theo chuẩn: hoàn tất tất toán → mở feedback window; chưa hết hạn vẫn DELIVERED/SETTLED.
- Teammate: nếu ACCEPTED và đủ tiền thì Manager có thể CLOSED ngay, dù chưa hết 48h.

### C. Có vấn đề về tình trạng ngựa

- Theo chuẩn: OPEN → Manager xử lý/phản hồi → RESOLVED; tiền điều chỉnh qua adjustment đã chốt; đủ tiền và hết complaint thì reset feedback.
- Teammate: OPEN → proposal → chờ Customer đồng ý → AGREED → chờ Manager apply → RESOLVED → quay lại nghiệm thu → thanh toán.

### D. Sau CLOSED Customer cần hỗ trợ

- Theo chuẩn: tạo SUPPORT, xử lý phiếu, Request/Contract vẫn CLOSED.
- Teammate: hiện bộ 31 API chưa có đường tương đương, hồ sơ sau đóng chỉ đọc.

## 7. Thứ tự sửa teammate để theo chuẩn

1. Khôi phục OTP revision và đúng nội dung kiểm ngựa/tài sản/giấy tờ; không thay bằng ảnh chữ ký.
2. Đưa luồng tiền về giao xong → trả số dư → tất toán → feedback; bỏ Customer acceptance gate và hai window mới.
3. Đưa case về OPEN/IN_PROGRESS/RESOLVED, Manager phản hồi rồi đóng; bỏ proposal/customer decision/dispute/history riêng khỏi baseline.
4. Dùng đúng Request/Settlement/Adjustment/Refund enums; chỉ giữ projection UI có mapping rõ.
5. Bổ sung rating/SUPPORT sau đóng và điều kiện đóng sau feedback theo rule.
6. Chuẩn hóa ID prefix, giới hạn cột và dictionary mapping; không đổi rule để hợp thức hóa payload.

Không phải bỏ mọi điểm tốt của teammate: upload/download có quyền, replay idempotency, recheck guard trong transaction, SDK coverage và scenario tests có thể giữ nếu không làm đổi rule. Chưa sửa contract/code trong lượt báo cáo này, chưa commit/push.
