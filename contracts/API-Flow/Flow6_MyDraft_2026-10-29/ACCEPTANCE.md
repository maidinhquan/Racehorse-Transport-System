# Flow 6 — Ma trận nghiệm thu

Các tình huống dưới đây là yêu cầu kiểm thử khi implement. Tạo tài liệu không có nghĩa đã chạy các tình huống E2E này.

| Nhóm | Kịch bản | Kết quả cần có |
|---|---|---|
| Handoff | Trip IN_TRANSIT nhưng xe chưa đến | Không hiển thị “đã đến” chỉ từ status; nhân sự phải có bối cảnh giao thực tế |
| Handoff | Sai liên kết current signed version/cọc | Mutation trả 409 HANDOFF_INCONSISTENT, không tạo biên bản xác nhận |
| Handoff | Có pending/failed attempt nhưng tổng cọc verified đủ | Không đòi mọi Payment SUCCESS; ngoại lệ tài chính hiển thị riêng |
| Quyền | Nhân sự không có DriverID/EscortID được gán | Không đọc/sửa Trip bằng cách đoán ID |
| Quyền | Customer khác chủ settlement | 404 ở cả read, feedback, case, payment và PDF |
| Baseline | PICKUP thiếu/legacy không revision | Trả []/warnings; không tự ghi đã OTP |
| Baseline | PICKUP có chip=true/authorized=true | DELIVERY mới không sao chép thành đã kiểm |
| Draft | Hai create đồng thời cùng Trip | Một DELIVERY logic; lần còn lại 409 có ID, không hai bản |
| Draft | Thiếu/trùng/ngựa khác Request | Reject HORSE_SET_MISMATCH; không ghi một phần |
| Snapshot | Đổi tên/chip trong master sau freeze | Bản giao/PDF cũ giữ danh tính và nội dung snapshot |
| Snapshot | Gửi identity/actor/status tự cấp | Reject unknown field, không mass assign |
| OTP | Thiếu quyền người nhận/chip/tài liệu còn cần dùng | Không gửi mã mở xác nhận |
| OTP | Gửi lại quá sớm/sai policy | 429 / lỗi cấu hình; không fallback hằng FE |
| OTP | Resend | Mã cũ vô hiệu, failed attempts không tự về 0 |
| OTP | Hai confirm/confirm-vs-refuse | Chỉ một kết quả hợp lệ dưới khóa; không status chéo |
| OTP | Sai/hết hạn/vượt attempts | Không COMPLETED, tăng attempts đúng khi sai, không lộ mã/hash |
| OTP | Thu hồi để đổi email/content | Clear metadata trước sửa, bản cũ không ký được; rate limit không bypass attempts |
| Refuse | Từ chối rồi giao lại | REFUSED bất biến; tạo revision kế tiếp trước sửa ITEM theo trigger |
| Confirm | OTP đúng trước khi trả đủ final invoice | DELIVERY CONFIRMED, Trip COMPLETED, Request DELIVERED; không yêu cầu final PAID |
| Confirm | Retry | Không tạo Trip/settlement/payment hoặc mốc confirmed mới |
| PDF | GET đúng bản / GET draft chưa freeze | PDF từ snapshot có quyền / 409; thiếu renderer 501, không file minh họa |
| Tiền | 20 triệu giá ký, 8 triệu cọc | Invoice cơ sở 12 triệu; không invoice 20 triệu thu lại cọc |
| Tiền | FinalDue=0 | Invoice 0 PAID, không Payment giả; vẫn cần Manager nghiệm thu |
| Tiền | Discount làm finalDue âm | Chặn đối soát; không cắt về 0 làm mất nghĩa vụ hoàn |
| Điều chỉnh | Cùng CostItemID / nguồn sai Trip/version | Unique/scope reject; không áp phí hai lần |
| Retry tạo | J11/J19/J29/J34 timeout rồi cùng Idempotency-Key | Trả cùng bản ghi; key khác payload 409; chưa có store bền vững thì 501, không tạo trùng khoản |
| Điều chỉnh | Tạo trước invoice cơ sở | 409, không dùng null OriginalInvoiceID rồi suy đã áp bằng timestamp không tồn tại |
| Điều chỉnh | Thay invoice chưa thu | Cancel cũ trước insert mới, giữ pair/source/version, một invoice active |
| Điều chỉnh | Cũ đã có tiền/pending attempt | 409 PAYMENT_RECONCILIATION_REQUIRED; không chuyển PaidAmount ngầm |
| VNPay | Tạo session đồng thời | Một attempt đang chờ, không lấy amount từ FE |
| VNPay | Browser return giả success | Invoice chưa PAID, settlement chưa SETTLED |
| VNPay | IPN trùng/sai chữ ký/TMN/amount | Không cộng tiền lặp; payload sai không SUCCESS |
| VNPay | Callback invoice đã hủy/cũ/ngoại lệ | Giữ chứng cứ tiền, review flag, không mở/đóng hồ sơ sai |
| Tất toán | Invoice PAID nhưng chưa Manager nghiệm thu | Không tự SettledBy=SYSTEM vì IPN; J26 quyết định |
| Refund | Không reference/time/khác nguồn | Không COMPLETED; không trả tiền cọc qua final refund |
| Refund | Hai khoản hoàn vượt tiền nguồn | Chặn dưới khóa ngay từ giữ chỗ nghĩa vụ refund |
| Refund | Retry hoàn cùng/khác bằng chứng | Cùng trả cũ; khác 409, không ghi đè trigger |
| Complaint | Sau giao còn nợ, chưa có window | Được gửi khi có settlement, không bắt Customer trả tiền mới được báo vấn đề |
| Complaint | Manager resolve | Có phản hồi/actor/time, RESOLVED ngay; không chờ accept-result |
| Window | Complaint mở quá hạn | Không close dù đã quá feedbackEndsAt |
| Window | Complaint cuối giải quyết nhưng refund chưa xong | Chưa reset; khi mọi nghĩa vụ xong J36 mở đủ thời lượng |
| Window | Retry resolve/restart/refresh | Không đẩy hạn liên tục |
| Feedback | Rating thấp | Không tự complaint, không chặn close hoặc kéo dài window |
| Feedback | Window reset rồi gửi lần hai | 409 FEEDBACK_EXISTS theo unique một feedback/settlement |
| Close | Complaint/callback/close đồng thời | Serialize resource cha; không CLOSED khi còn nghĩa vụ |
| Close | Đủ điều kiện | Settlement/Request/Contract CLOSED, Trip COMPLETED/version SIGNED |
| Support | Phiếu sau CLOSED | Nhận SUPPORT, không reopen |

## Kiểm tra tài liệu chạy được ngay

```powershell
python contracts/API-Flow/Flow6/build_openapi.py
python contracts/API-Flow/Flow6/validate_contract.py
```

Validator cần package Python `jsonschema`. Kiểm 47 operation, required/nullable/enum, cấm field lạ, JSON không trùng key, request/success/error parity, test âm theo phase/giới hạn, tham chiếu field SQL và fingerprint nguồn. Không gọi provider, không gửi mail, không thực thi SQL.

Kiểm schema thành công không chứng minh authorization, arrival, giao dịch tiền, tính bất biến runtime, worker close hay PDF render đã chạy đúng. Nghiệm thu triển khai cần chạy bảng trên với backend thật và môi trường VNPay sandbox phù hợp.
