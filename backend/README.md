# VNPAY Sandbox

Đây là API Sandbox thử nghiệm **độc lập** ở `backend/backend.csproj`, không phải
ledger Flow 1. Số tiền nhập ở trang thử là VND; không lấy hóa đơn USD rồi gửi trực
tiếp sang VNPAY.

Flow 1 hiện nằm trong active layers Domain/Application/Infrastructure/WebApi và
dùng SQL invoice/payment cùng contract state. Chạy `backend/WebApi/WebApi.csproj`
cho flow tích hợp; cấu hình `Flow1:Vnpay`, không trỏ IPN của Flow 1 vào
SandboxPaymentStore. Xem [hướng dẫn cấu hình và UAT](../contracts/API-Flow/FLOW1_LOCAL_UAT_AND_OPERATIONS.md)
và [báo cáo phase 5](../contracts/API-Flow/FLOW1_PHASE5_PAYMENT_REPORT.md).

## Chạy tại máy

Đã tạo `appsettings.Local.json` trên máy với secret Sandbox được cung cấp. File này bị Git bỏ qua. Trên máy khác tạo file:

```json
{ "Vnpay": { "HashSecret": "YOUR_SANDBOX_SECRET" } }
```

Hoặc đặt biến môi trường `Vnpay__HashSecret`. Không đặt secret vào frontend. Tài khoản/mật khẩu Merchant Admin và SIT không cần cho API và không lưu trong repo.

Chạy hai terminal từ thư mục repo:

```powershell
dotnet run --project backend/backend.csproj --urls http://localhost:5080
```

```powershell
cd frontend
npm ci
npm run dev
```

Mở http://localhost:5173/payment/sandbox và tạo giao dịch 10.000 VND. Chọn ngân hàng NCB, thẻ 9704198526191432198, tên NGUYEN VAN A, phát hành 07/15, OTP 123456.

## IPN công khai

Cách nhanh với Docker (tự bật đường hầm khi chạy `docker compose up`):

1. Tạo tài khoản miễn phí tại https://dashboard.ngrok.com, lấy **authtoken** và nhận **tên miền tĩnh miễn phí** (Domains).
2. Trong `.env` ở thư mục gốc: `COMPOSE_PROFILES=tunnel`, `NGROK_AUTHTOKEN=...`, `NGROK_DOMAIN=<tên-miền>.ngrok-free.app`.
3. Đăng ký **một lần** với VNPAY (merchant sandbox của `Flow1__Vnpay__TmnCode`) IPN URL: `https://<NGROK_DOMAIN>/api/payments/vnpay/ipn`.
4. `docker compose up -d`. Xem các lần VNPAY gọi IPN tại http://localhost:4040.

Không muốn tạo tài khoản: đặt `COMPOSE_PROFILES=quicktunnel` (Cloudflare Quick Tunnel). Địa chỉ công khai xem tại http://localhost:2000/quicktunnel; địa chỉ này đổi sau mỗi lần khởi động nên phải cập nhật IPN URL bên VNPAY mỗi lần.

Người không cần thanh toán thật để trống các biến trên; dịch vụ `tunnel` sẽ không chạy. Mỗi tên miền ngrok chỉ chạy ở một máy tại một thời điểm, và VNPAY chỉ gửi IPN tới đúng một URL đã đăng ký.

Cách thủ công:

VNPAY không gọi được localhost. Dùng HTTPS tunnel hoặc server thử nghiệm để công khai frontend và backend. Định tuyến `/api` tới backend và các đường dẫn frontend tới SPA. Cấu hình `Vnpay__ReturnUrl=https://YOUR_TEST_HOST/payment/return` trước khi khởi động backend. Với Vite qua tunnel, thêm đúng hostname vào `server.allowedHosts` nếu Vite chặn host.

Đăng ký với VNPAY URL:

```text
https://YOUR_TEST_HOST/api/payments/vnpay/ipn
```

Return URL chỉ xác minh chữ ký, terminal và số tiền rồi hiển thị; không cập nhật trạng thái. IPN xác minh HMAC SHA512, terminal, giao dịch, số tiền và trạng thái trước khi lưu. Chỉ cả `vnp_ResponseCode` và `vnp_TransactionStatus` bằng `00` mới là Paid. Callback trùng trả `02`. Trang kết quả chờ tối đa 60 giây rồi hướng dẫn kiểm tra IPN/tải lại.

Giao dịch thử lưu tại `backend/App_Data/sandbox-payments`, tồn tại qua lần khởi động lại. Store dùng ghi file nguyên tử và khóa trong một process; chỉ chạy một instance. Các endpoint thử không có xác thực và không dùng để xác nhận hóa đơn thật. Khi có backend nghiệp vụ, thay store bằng DB transaction và số tiền/ownership lấy từ hóa đơn đã xác thực, không từ trình duyệt.

## Kiểm tra cục bộ

Khi API đang chạy:

```powershell
pwsh -File backend/test-sandbox.ps1
```

Script dùng callback tự ký để kiểm tra URL, GMT+7, số tiền, checksum sai, terminal sai, giao dịch không tồn tại, query trùng, Return không ghi trạng thái, IPN thành công/thất bại và gửi lặp. Script tạo giao dịch thử mới trong local store, không gửi giao dịch tới VNPAY. Đây không thay thế kiểm thử thanh toán thật trên Sandbox hoặc SIT của VNPAY.

Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
