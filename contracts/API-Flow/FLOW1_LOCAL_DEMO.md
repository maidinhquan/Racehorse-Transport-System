# Flow 1 — demo localhost có thể thao tác

Chạy từ worktree `codex/flow1-relational-mvp`. Primary chưa merge, không dùng source
Flow1 JSON cũ. Demo này dùng DB mới riêng và fixture; không deploy hoặc nghiệm thu
VNPay công khai. DB nghiệp vụ không được dùng để thêm/sửa dữ liệu demo.

## Khởi chạy

Từ repo root:
```powershell
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1
```

Yêu cầu SQL local `.\SQLEXPRESS`, Chrome, Node/Playwright, frontend/node_modules và
LibreOffice headless đã có. Script nhận `-SqlServer`, `-LibreOfficePath`, `-NodePath`,
`-PlaywrightModule` nếu máy khác đường dẫn. Thiếu runtime hoặc cổng5173/5129 đang dùng
thì dừng, không kill app khác. Harness chỉ tạo `RaceHorseFlow1Browser_<GUID>`, áp
000→003→006 và seed4tài khoản test; không startup migration DB chính.

Tool mở **cửa sổ Chrome riêng có bảng “Flow 1 trên localhost”**. Các trang mô phỏng
và chặn chuyển hướng provider chỉ hoạt động trong cửa sổ do tool mở. Dùng bảng đó
để mở từng vai trò ở cửa sổ riêng; không cần nhập credential thật. Giao diện app
chạy `http://127.0.0.1:5173`, backend loopback5129. `127.0.0.1` là loopback của máy.
Không thêm endpoint demo hay chế độ tin tiền từ frontend vào WebApi.

## Thao tác

1. Mở Customer: thêm ngựa cùng ảnh và passport scan thử nghiệm; tạo đơn. Có thể tìm
   “Điểm lấy demo”/“Điểm giao demo”. Maps là fixture300km, không phải giá/khoảng cách
   đường thực. Chọn ngày khởi hành còn đủ thời gian chuẩn bị.
2. Mở Manager: accept/reject/request-changes; chốt giá và hạn ký, phát hành PDF thật
   bằng LibreOffice. Có thể gia hạn theo policy hiện hành.
3. Customer tải PDF rồi gửi OTP. Mở “Hộp thư OTP tạm” ở bảng điều khiển để xem mã mới
   nhất, nhập vào trang hợp đồng. SMTP chỉ giữ mã trong RAM, không gửi mail thật và
   không ghi code ra file/log. Đóng demo thì mất hộp thư; không dùng credential thật.
4. Bấm “Thanh toán qua VNPay”. Browser chặn URL Sandbox đã ký bằng merchant fixture,
   kiểm chữ ký/amount/reference/return binding rồi đưa về trang thanh toán mô phỏng.
   Chọn gửi IPN thành công, khách hủy hoặc chỉ quay về chưa có IPN.
5. Chỉ callback test có chữ ký được backend xác minh mới ghi tiền; ReturnURL không
   tự cập nhật. Có nút gửi lặp callback để kiểm dedupe. UI vẫn hiển thị Paid/Trip từ
   API/SQL thật trong DB test. Manager querydr bị chặn trong browser demo, không gọi
   provider đang hoãn. Không đổi kết quả một session mô phỏng đã gửi.
6. Manager confirm/hold/resume; Coordinator/Specialist nhận current-event handoff.

## Dừng và dữ liệu

Dùng nút “Dừng demo và dọn DB test”, đóng toàn bộ cửa sổ Chrome demo, hoặc:
```powershell
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1 -Action Status
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1 -Action Stop
```

Host dừng API/Vite/Chrome do nó tạo, drop đúng DB test có name guard. Dữ liệu demo
trong SQL chỉ tồn tại trong phiên đó. Private files/PDF/evidence để trong ignored
`backend/WebApi/App_Data/flow1/local-demo-<GUID>/`, không tự xóa/move business bytes.
Stop script dùng cờ graceful-stop ở đúng directory/host; không force-kill process
lạ. Metadata active-local-demo.json không chứa token/OTP/provider credentials.
Không chạy build WebApi khi demo đang giữ DLL; dừng demo trước khi sửa/build backend.

## Giới hạn

Đây là **demo local với payment/IPN/SMTP/maps fixtures**. Không chứng minh VNPay đã
thu tiền/gọi IPN từ Internet hay querydr hoạt động (probe trước đó HTTP403). Mã OTP
hiện trên hộp thư test chỉ phục vụ thao tác demo. Không dùng ở production, không
merge primary/push/deploy theo bước này. Không thay acceptance của provider thật.
