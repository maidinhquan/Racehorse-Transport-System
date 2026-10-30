# Bộ hợp đồng API Flow 6

Ngày 27/10/2026 — thiết kế đích dựa SQL/rule hiện hành và HANDOFF được cung cấp. Chưa triển khai backend/FE, chưa commit/push.

1. Đọc [FLOW6.md](FLOW6.md) để hiểu luồng, quyền, trạng thái và công thức tiền.
2. Tra [FLOW6-API-JSON.md](FLOW6-API-JSON.md) cho 47 API và payload đầy đủ.
3. Tra [FIELD-DICTIONARY.md](FIELD-DICTIONARY.md) để biết field dùng làm gì, lưu ở đâu hoặc tính thế nào.
4. Dùng [flow6.openapi.json](flow6.openapi.json) cho schema máy đọc; không suy kiểu từ ví dụ.
5. Đọc [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md) trước code, đặc biệt OTP cho người nhận không account và giới hạn thay hóa đơn có tiền.
6. Nghiệm thu theo [ACCEPTANCE.md](ACCEPTANCE.md).

[FLOW4_TO_FLOW6_HANDOFF.md](FLOW4_TO_FLOW6_HANDOFF.md) được giữ nguyên. Nó là đầu vào nghiệp vụ, không phải cam kết Flow4 đã có API hoặc bằng chứng xe đã đến.

Nguồn schema là `build_openapi.py` khai báo rõ required/nullable/enum/giới hạn. Script sinh OpenAPI, JSON examples và dictionary; không có hai bản payload độc lập như Flow1 trước đây. Sửa nghiệp vụ thì cập nhật FLOW6.md và metadata operation; sửa field thì cập nhật explicit schema, regenerate, chạy validator. Không regenerate source-manifest để bỏ qua source drift chưa được review.

Không có history/audit riêng; chỉ status hiện tại và metadata nghiệp vụ. Snapshot giao nhận và bản hợp đồng đã ký vẫn giữ nguyên để xem đúng nội dung. Phiếu không có chat/Customer accept-result. Thu tiền chỉ VNPay; hoàn Flow6 ghi bằng chứng thực hoàn theo SQL, không tự chuyển tiền.
