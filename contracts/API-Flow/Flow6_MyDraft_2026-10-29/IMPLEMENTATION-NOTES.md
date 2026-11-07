# Flow 6 — Ranh giới triển khai

Ngày 27/10/2026. Chỉ hợp đồng đích; các path mới trong OpenAPI không phải bằng chứng backend đã có endpoint.

## 1. Quyết định đã có căn cứ

- HANDOFF xác định tổ hợp đầu vào, không khẳng định xe đã đến bằng status. Không thêm ARRIVED, BlocksHandover, checklist aggregate hoặc INSURANCE.Status chưa có SQL.
- Năm bảng mới dùng nguyên tên, PK/prefix/enum SQL; không có adjustment Status/Bearer, complaint accept-result, bảng chat/audit/window/refund riêng.
- Theo dõi hiện trạng; snapshot biên bản là bằng chứng revision, không phải timeline thao tác.
- VNPay-only thu tiền, không API Manager xác nhận tiền thủ công.

## 2. Lựa chọn API trong bản đề xuất này

Các lựa chọn sau cần reviewer hiểu khi implement; không phải quyết định người dùng đã nói rõ trước đó:

| Lựa chọn | Lý do / giới hạn |
|---|---|
| `/operations/flow6` cho DRIVER_ESCORT được gán trên Trip | SQL không có role riêng người nhận hoặc nhân sự giao hàng; không dùng nhầm Specialist/Coordinator assignment |
| Nhân sự nhập OTP người nhận cung cấp tại chỗ | Người nhận có thể khác Customer và không có account. Không mở endpoint confirm công khai hoặc coi Customer login thay người nhận |
| Nhân sự ghi lại từ chối | SQL có lý do/thời gian, không có session public của người nhận. Đây là ghi nhận thực tế, không chứng minh receiver login |
| DTO dùng UTC ISO Z | Mới, không phụ thuộc hàm parse giờ của FE Flow1; client phải dùng adapter riêng |
| Mỗi Trip một DELIVERY logic | SQL chưa unique Type=DELIVERY; backend khóa Trip và create-or-conflict, không chỉ COUNT trước insert |
| Revision number là latest concurrency guard | Không rowVersion mới; mutation khóa latest row/parent, thao tác từ bản cũ trả 409. PUT cùng revision DRAFT vẫn là last committed write, không hứa phát hiện hai editor cùng bản |
| CHARGE/DISCOUNT chỉ trước tất toán | Thiếu phân bổ tiền giữa hóa đơn; có tiền cũ hoặc pending attempt thì chặn để đối soát, không chuyển paidAmount ngầm |
| Một feedback/settlement | Theo unique SQL dù tài liệu cũ nói “mỗi cửa sổ” |

## 3. Nguồn lưu đã có và phần BE phải làm

| Dữ liệu | Nơi lưu | Điều SQL không tự làm |
|---|---|---|
| Người nhận/kiểm tra/giấy tờ | HANDOVER, HANDOVER_ITEM | Đúng phân công/ngựa/ủy quyền; validate đầy đủ trước OTP |
| Bản và OTP | HANDOVER_REVISION | Gửi email, HMAC/hash theo secret, xác minh mã, rate limit, chống resend race |
| Hồ sơ tất toán/window hiện hành | TRIP_SETTLEMENT | Nghiệm thu, tính đủ tiền, reset và worker close |
| Giá gốc | CONTRACT_VERSION.ContentSnapshot | Parse đầy đủ signed snapshot; thiếu dữ liệu không đọc master thay thế |
| Nợ/thu tiền | INVOICE, PAYMENT | Adapter VNPay/IPN dùng chung, tính lại tổng verified, xử lý ngoại lệ |
| Điều chỉnh/hoàn | SETTLEMENT_ADJUSTMENT | Kiểm quyết định, cặp invoice, tổng refund không vượt nguồn, xác minh bằng chứng |
| Phiếu/đánh giá | CUSTOMER_CASE, CUSTOMER_FEEDBACK | Quyền, window và lock chống close race |

Các trường x-source trong FIELD-DICTIONARY là nguồn mapping; field tính toán không đòi thêm cột. Body không chứa actor/status/amount đã thu. SQL nullable không có nghĩa API phải nhận null khi nghiệp vụ cần đủ.

## 4. Không giả đã hỗ trợ các tình huống sau

1. **Đã đến đích:** HANDOFF chỉ nêu bối cảnh. Flow4 chưa có mốc persisted đến được chốt; Flow6 không tự suy ARRIVED hoặc yêu cầu kiểm từng ROUTE_SEGMENT. Nếu sản phẩm đòi chống thao tác từ xa, phải chốt cách chứng minh arrival/phân công thực tế riêng.
2. **Ủy quyền người nhận:** flag/name/phone và email snapshot có thể lưu. Chưa có schema bằng chứng ủy quyền riêng; không thiết kế chữ ký ảnh, file giả hoặc tự coi email Customer là email receiver.
3. **Email delivery và rate limit bền vững:** chưa có outbox/rate-limit persistence trong năm bảng. Phải tích hợp email/rate-limit runtime dùng chung; không trả thành công “đã nhận email” chỉ vì queue. Không tự thêm bảng trong tác vụ tài liệu này.
4. **Tệp/ảnh:** HANDOVER_ITEM.PhotoUrl và Adjustment.EvidenceUrl có thể đã có dữ liệu, nhưng chưa có hợp đồng storage upload/version/owner dùng chung đủ rõ. Bản v1 không có upload giả/tên file trong JSON. Mô tả ngựa/tài sản/giấy tờ là nội dung; ảnh tùy chọn không bị mô tả là bằng chứng đã upload. Nếu muốn chức năng ảnh, cần chốt upload/read có quyền trước, không trả private/... trực tiếp.
5. **PDF:** J45–J47 quy định render PDF từ đúng ContentSnapshot bất biến, trả bytes có quyền, không cần PdfUrl mới. Đây là hợp đồng đích của renderer, chưa chứng minh đã có thư viện render/runtime. Chưa có renderer trả 501, không trả trang minh họa hoặc private path thay file. DRAFT chưa freeze không được tải bản coi là đã trình OTP.
6. **Thay invoice có tiền:** không có ledger phân bổ/chuyển khoản thu sang invoice thay thế. 409 PAYMENT_RECONCILIATION_REQUIRED là giới hạn thật; cần module đối soát nếu mở tự động. Callback muộn giữ tiền và review flag, không sửa giá để khớp.
7. **Hoàn VNPay tự động/hoàn nhiều lần:** ngoài bản v1. J28 ghi xác nhận hoàn thực tế đủ khoản, không chuyển tiền. Refund tiền cọc không dùng OriginalInvoiceID final của Flow6.
8. **Draft settlement khi chưa giao:** được phép nhưng không được phát hành invoice/settle trước DELIVERY confirmed. Complaint sau giao khi chưa có settlement cần Manager chuẩn bị J15; không tự ghi CustomerID/ContractID giả ở Customer create case.
9. **Tự động close:** cần worker runtime gọi cùng domain service guard; docs/OpenAPI không triển khai scheduler. Tick trễ chỉ làm đóng trễ, không rút ngắn window.
10. **Retry tạo nhiều bản ghi:** J11/J19/J29/J34 bắt buộc Idempotency-Key. Năm bảng không có nơi lưu key/kết quả. Cần module idempotency dùng chung có persistence bền vững ngoài audit; chỉ cache RAM hoặc kiểm payload giống nhau không đủ. Chưa tích hợp module trả 501 cho capability, không hứa một timeout/retry không nhân đôi khoản thu. Không tự thêm bảng hoặc đụng schema trong tác vụ tài liệu.

## 5. Tương thích và thay đổi source

`source-manifest.json` ghi fingerprint của SQL/rule/HANDOFF đang đọc. Chạy validator sẽ báo fail nếu chúng đổi; phải đọc diff, đánh giá lại nghiệp vụ rồi mới regenerate. Không regenerate manifest chỉ để che drift.

Không sửa file HANDOFF do user cung cấp. Hai SQL bản Reviewed đang khác ngoài nhóm Flow6; giữ nguồn SQL trong HorseTransportDB làm mốc cấu trúc của contract này. Rule và thiết kế database vẫn được đọc cho nghiệp vụ, không chép các câu mô tả cũ mâu thuẫn CHECK vào schema.

Không có migration/backend/FE thay đổi, không thay nhánh Database đã push, không commit/push trong yêu cầu tạo tài liệu này.
