# TEST DATA FLOW 6: AFTERCARE, DELIVERY, SETTLEMENT & BILLING

Thư mục này chứa các kịch bản và script dữ liệu mẫu để kiểm thử chức năng **Flow 6 (Giao nhận ngựa, Tất toán, Khiếu nại và Đóng hồ sơ)**.

---

## 1. Danh sách file dữ liệu

- **`test-data/reset_flow6_data.sql`**: Script reset toàn bộ dữ liệu Flow 6 về trạng thái baseline chuẩn (chuẩn bị sẵn chuyến `TRIP_003` để bàn giao từ bước đầu).
- **`test-data/seed_e2e_flow1_flow6.sql`**: Script tạo bộ dữ liệu độc lập E2E (`TRIP_806` / `REQUEST_806`).

---

## 2. Thông tin cấu hình Test E2E Flow 6

- **Chuyến đi dùng để test**: `TRIP_003` (Đơn hàng `REQUEST_003`, Hợp đồng `CONTRACT_003`).
- **Người nhận ngựa (Designated Receiver)**:
  - **Họ và tên**: Nguyễn Quang Trường
  - **Số điện thoại**: `0903334455`
  - **Email nhận mã OTP**: **`quangtruong1922@gmail.com`**
- **Tài khoản Tài xế phụ trách**:
  - Mã: `USER_007` (Hoàng Hùng)
  - Email: `hung.driver@cbntransport.com`
  - Mật khẩu: `Password123!` (hoặc chọn Quick Login: Tài xế 1)
- **Tài khoản Khách hàng**:
  - Mã: `USER_001` (Nguyễn Văn A)
  - Email: `vana.horse@gmail.com`
  - Mật khẩu: `Password123!`
- **Tài khoản Quản lý**:
  - Mã: `USER_004` (Trần Thị Linh)
  - Email: `linh.manager@cbntransport.com`
  - Mật khẩu: `Password123!`

---

## 3. Các bước kiểm thử (E2E Walkthrough)

### Bước 1: Tài xế lập biên bản và gửi OTP giao nhận
1. Đăng nhập với vai trò **Tài xế** (`hung.driver@cbntransport.com` / `Password123!`).
2. Vào mục **Chuyến đi** -> Chọn chuyến **`TRIP_003`**.
3. Chuyển sang tab **Bàn giao (Delivery)**:
   - Hệ thống hiển thị thông tin người nhận: `Nguyễn Quang Trường` - Email: `quangtruong1922@gmail.com`.
   - Kiểm tra mã chip ngựa `HORSE_001`, tình trạng sức khỏe, tài sản và giấy tờ bàn giao.
   - Bấm **"Gửi mã OTP cho người nhận"**.
4. **Kiểm tra Email**:
   - Mở hòm thư **`quangtruong1922@gmail.com`**.
   - Email từ hệ thống sẽ gửi mã xác thực OTP 6 chữ số kèm thông tin biên bản đối chiếu.
5. **Xác nhận giao ngựa**:
   - Nhập mã OTP nhận được từ email vào ô xác thực trên giao diện tài xế và bấm **Xác nhận bàn giao**.
   - Biên bản bàn giao chuyển sang trạng thái **CONFIRMED**.

### Bước 2: Quản lý thẩm định & Lập quyết toán (Settlement)
1. Đăng nhập với vai trò **Quản lý** (`linh.manager@cbntransport.com` / `Password123!`).
2. Vào chi tiết đơn hoặc chuyến `TRIP_003` mục **Quyết toán (Settlement)**.
3. Xem thông tin:
   - Tổng giá trị hợp đồng: `145.000.000 VND`
   - Đã cọc: `58.000.000 VND`
   - Số dư còn lại cần thanh toán: `87.000.000 VND`
   - Có thể thêm chi phí phát sinh/giảm trừ nếu có.
4. Bấm **Phát hành bảng quyết toán (Issue Settlement)**. Hóa đơn tất toán (`FINAL_SETTLEMENT`) được tạo với trạng thái `UNPAID`.

### Bước 3: Khách hàng thanh toán số dư còn lại
1. Đăng nhập với vai trò **Khách hàng** (`vana.horse@gmail.com` / `Password123!`).
2. Vào chi tiết đơn hàng `REQUEST_003` -> Tab **Thanh toán / Quyết toán**.
3. Tiến hành thanh toán số dư qua cổng giả lập VNPAY Sandbox:
   - Bấm **Thanh toán số dư**.
   - Nhập thông tin test thẻ sandbox hoặc bấm xác nhận thành công.
   - Trạng thái quyết toán chuyển sang **SETTLED** và hóa đơn chuyển sang `PAID`.

### Bước 4: Khiếu nại (nếu có) hoặc Đánh giá phản hồi & Đóng hồ sơ
1. **Đánh giá phản hồi**: Khách hàng chấm điểm dịch vụ (1 - 5 sao) và để lại nhận xét.
2. **Đóng hồ sơ (Closure)**: Sau khi hết thời gian chờ hoặc Quản lý bấm hoàn tất, hồ sơ hợp đồng chuyển sang `CLOSED`.

---

## 4. Cách chạy lại script reset bất kỳ lúc nào

Mỗi khi muốn test lại luồng từ đầu:
```bash
sqlcmd -S localhost -U sa -P 123456 -d HorseTransportDB -i test-data/reset_flow6_data.sql
```
Script sẽ tự động dọn dẹp các biên bản, hóa đơn, thanh toán test cũ và đưa `TRIP_003` trở lại trạng thái sẵn sàng bàn giao với email người nhận là `quangtruong1922@gmail.com`.
