# Flow 6 — Hướng dẫn review cho backend/frontend

Cập nhật 29/10/2026, contract 1.1.0. [flow6.examples.json](flow6.examples.json) bổ sung 40 kịch bản máy đọc và snapshot độc lập. Các con số thời hạn trong mẫu là policy minh họa; client lấy giá trị thật từ server.

Đọc [FLOW6.md](FLOW6.md), sau đó import [flow6.openapi.json](flow6.openapi.json) vào Postman hoặc Swagger Editor. Base `/api`, token Bearer theo role; mọi POST cần Idempotency-Key mới cho thao tác mới. **Hiện chưa có server Flow 6 triển khai.** Không gửi ví dụ vào production. Các mẫu trong [FLOW6-API-JSON.md](FLOW6-API-JSON.md) là snapshot độc lập; dùng version thực sau mỗi response.

## Thứ tự kiểm thử khi backend sẵn sàng

1. Driver đọc handover context, upload ảnh/chữ ký bằng File thật, hoàn thành bàn giao. Kiểm đúng một Trip COMPLETED, Request DELIVERED, một thời hạn nghiệm thu.
2. Customer GET aftercare, xem policy/statement/version, gửi acceptance với consent và Idempotency-Key. Đọc invoiceVersion rồi tạo payment session; giao dịch sandbox và webhook phải xác minh phía server. Manager close NORMAL sau khi đủ tiền.
3. Request khác: Customer reportIssue → Manager proposeResolution → Customer decideProposal ACCEPTED → Manager applyComplaintResolution. Kiểm tiền chỉ giảm một lần, nghiệm thu chỉ mở lại khi hết mọi vụ.
4. Request khác: hết hạn → cảnh báo Manager → extendAcceptance. Kiểm old dueAt và new dueAt cùng được lưu; khách không tự gia hạn.
5. Request khác: Manager openDispute NO_RESPONSE → recordDisputeDecision với bằng chứng thật → applyDisputeDecision. Nhánh RESUME_ACCEPTANCE phải trở về nghiệm thu; nhánh CLOSE_AFTER_DISPUTE phải có căn cứ và hết nghĩa vụ tài chính trước close AFTER_DISPUTE.

## Ma trận nghiệm thu bắt buộc cho server (chưa được chạy)

| Trường hợp | Kết quả mong đợi |
|---|---|
| Driver khác chuyến / khách khác chủ / file của request khác | 404, không thay đổi dữ liệu |
| Đến giờ ETA nhưng chưa có FINAL_ARRIVED từ Flow 4 | HANDOVER_NOT_READY, không mở đồng hồ |
| Context xanh rồi incident Flow 5 mới chặn bàn giao | POST recheck transaction, không bàn giao theo GET cũ |
| Đổi nội dung biên bản sau lấy chữ ký hoặc tái dùng signature cho bản khác | Yêu cầu ký lại, giữ đúng snapshot liên kết |
| Kết thúc sớm Flow 5 chưa có bàn giao hợp lệ | Không dùng handover giả; handoff cần pre-handover settlement extension thực có |
| Bàn giao sai người, thiếu một ngựa, trùng ngựa hoặc thiếu chữ ký | Bị chặn, không mở đồng hồ |
| Bàn giao thất bại | Lưu attempt, không COMPLETED/không deadline |
| Hai POST bàn giao đồng thời | Một biên bản, một deadline |
| Retry cùng key/body dù version hiện tại đã tăng | Replay đúng response cũ, không thêm audit/notification/payment |
| Cùng key khác payload | 409 IDEMPOTENCY_CONFLICT |
| Client giả actor/status/amount/acceptedAt | 400; schema cấm field ngoài contract |
| Customer chưa đọc đúng statementVersion | 409 STALE_VERSION hoặc lỗi statement tương ứng |
| Nghiệm thu và gửi khiếu nại đồng thời | Chỉ một thành công; không trạng thái ACCEPTED + complaint mới |
| Đã ACCEPTED gửi khiếu nại mới dù còn 48h | 409 ALREADY_ACCEPTED |
| Quá hạn chưa nghiệm thu | Cảnh báo Manager một lần; không tự chấp nhận/đóng |
| Gia hạn về quá khứ/không tăng/ngoài policy | 400 hoặc 409, không mất lịch sử |
| Manager yêu cầu xử lý sau khách im lặng | Request UNDER_RESOLUTION, không gắn nhãn gian lận |
| Có 2 complaint, chỉ xử lý xong 1 | Vẫn PAUSED; không mở nghiệm thu/thanh toán |
| Khách đồng ý proposal nhưng Manager chưa apply | AGREED + pendingAdjustment; chưa trừ tiền, còn khóa |
| Khách từ chối hoặc proposal version cũ | Giữ/chuyển OPEN; không ghi đồng ý |
| Manager giả CUSTOMER_AGREEMENT không có quyết định khách | INVALID_DECISION_BASIS |
| COMPANY_WAIVER còn khiếu nại bồi thường chưa xử lý | Không được dùng để kết thúc tranh chấp |
| Apply cùng proposal/decision nhiều lần bằng key khác | Không nhân đôi adjustment, không mở lại deadline lần nữa |
| Giảm tiền vượt giá trị còn lại / miễn vượt nợ | Bị chặn; không tạo số âm |
| Sau ACCEPTED còn nợ | AWATING_PAYMENT (enum đúng: AWAITING_PAYMENT), đồng hồ trả tiền riêng |
| Browser Return giả thành công | Không ghi VERIFIED |
| IPN sai checksum/merchant/amount/ref | Không ghi tiền vào invoice; log đối soát phù hợp |
| IPN lặp / hai IPN đồng thời | Chỉ ghi nhận tiền một lần |
| Phiên cũ trả tiền sau gia hạn/dispute/invoice đổi/đóng | Ghi nhận và đối soát; không mất tiền, không tự đóng/mở lại |
| Phiên pending khi apply/close | Chặn cho tới đối soát hoặc provider xác nhận hủy |
| Hoàn tiền PENDING/FAILED hoặc thiếu bằng chứng | Không close; không giả VERIFIED |
| NORMAL chưa ACCEPTED dù hết 48h | CLOSURE_BLOCKED |
| AFTER_DISPUTE không có quyết định đã apply | CLOSURE_BLOCKED |
| AFTER_DISPUTE còn nợ chưa có quyết định miễn | OUTSTANDING_BALANCE |
| Đóng sau miễn nợ hợp lệ | Giữ adjustment WAIVER, không tăng verifiedBalance |
| Khách nghiệm thu và đã đủ tiền sớm | Manager được đóng ngay, không đợi hết 48h |
| Job định kỳ khi đủ điều kiện đóng | Chỉ cập nhật readiness/cảnh báo; không tự đóng |

## Hạng mục backend cần review trước implement

- Mapping UNDER_RESOLUTION, phase, acceptance, window histories, proposal/decision revisions vào schema hiện có; không giả định đã có cột/bảng.
- Lưu idempotency, immutable evidence/version, constraint mỗi handover và mỗi source adjustment một lần.
- Transaction boundary chung với payment/IPN, lock request + invoice theo thứ tự nhất quán và outbox notifications.
- Cấu hình quyền tài chính cho ghi nhận hoàn tiền; nguồn kiểm chứng chứng từ và reference.
- Mở rộng handler VNPay hiện có cho BALANCE và đối soát callback muộn; không tạo endpoint xác minh từ frontend.
- Quyết định cấu hình production: 24/48 giờ nghiệm thu, hạn thanh toán riêng, giới hạn gia hạn. Mẫu hiện dùng 48h/24h/168h; frontend luôn đọc policy server.
- Migrate các màn/hook cũ chỉ cập nhật sau HTTP success; không dùng fallback mock hoặc nút demo trong chế độ thật.

Chỉ tick các ca server sau khi chạy trên môi trường test có persistence. Schema/SDK tests trong repo không thay thế các ca này.
