# Nhật ký Cập nhật Dự án: RaceHorse Transport System

Dưới đây là bảng tổng hợp toàn bộ các công việc, sửa đổi và danh sách file chi tiết mới nhất của hệ thống:

---

## I. Tổng quan Công việc & Tính năng mới

### 1. Phân hệ Backend (`RaceHorse_Transport_Backend`)
- **Tạo mới Admin Dashboard API:** Viết API `GET /api/admin/dashboard` kết nối trực tiếp đến cơ sở dữ liệu `HorseTransportDB`. Truy vấn số liệu thực tế thời gian thực (đếm số lượng người dùng, ngựa đua, yêu cầu vận chuyển, phương tiện xe) và trả về danh sách tài khoản phục vụ bảng quản trị.
- **Tích hợp Đăng nhập Google:** Bổ sung API `POST /api/auth/google-login` tiếp nhận và xác thực `idToken`. Tự động cấp tài khoản `Customer` và JWT Token cho người dùng mới.
- **Vận hành:** Kích hoạt server ASP.NET Core tại `http://localhost:5129`.

### 2. Phân hệ Frontend (`frontend`)
- **Giao diện Admin Dashboard:** Xây dựng bảng điều khiển quản trị gọi API lấy dữ liệu thật từ SQL Server, tích hợp thanh tìm kiếm và bộ lọc theo vai trò. Giao diện responsive, hiện đại.
- **Định tuyến & Phân quyền:** Khai báo tuyến đường `/admin/dashboard` và bổ sung vai trò `"ADMIN"` vào hệ thống type.
- **Trang Đăng nhập:** Điều hướng tài khoản quản trị viên vào dashboard và bổ sung nút test "Admin". Tích hợp widget đăng nhập Google qua `.env`.

### 3. Cơ sở dữ liệu & Kiểm thử (`HorseTransportDB`)
- **Kết nối:** Dịch vụ SQL Server `SQLEXPRESS` kết nối thông suốt với tài khoản `sa`.
- **Tài khoản mẫu có sẵn:**
  * **Super Admin:** `admin@cbntransport.com` | Pass: `HASH_SECURE_00`
  * **Customer:** `vana.horse@gmail.com` | Pass: `HASH_SECURE_01`
  * **Coordinator:** `hai.coord@cbntransport.com` | Pass: `HASH_SECURE_06`
  * **Driver:** `hung.driver@cbntransport.com` | Pass: `HASH_SECURE_07`

### 4. Git Commit
- **Nhánh:** `Tuan`
- **Commit:** `[Tuan f30b61d] Co the dang nhap bang google va kem theo co tai khoan super Admin` (9 files changed, 958 insertions).

---

## II. Danh sách Chi tiết File Thay đổi

### 1. Phía Backend (`RaceHorse_Transport_Backend`)

| File | Trạng thái | Nội dung thay đổi cụ thể |
| :--- | :---: | :--- |
| `AdminController.cs` | **Tạo mới** | Tạo controller quản trị với endpoint `GET /api/admin/dashboard`: kết nối CSDL, thống kê số lượng bảng `USER`, `HORSE`, `TRANSPORT_REQUEST`, `VEHICLE` và lấy danh sách tài khoản. |
| `AuthController.cs` | **Chỉnh sửa** | • Thêm endpoint `POST /api/auth/google-login` xác thực `idToken`.<br>• Tự động tạo tài khoản `Customer` vào `[USER]` khi đăng nhập lần đầu.<br>• Thêm DTO `GoogleLoginRequest` và `GoogleTokenInfo`. |

### 2. Phía Frontend (`frontend`)

| File | Trạng thái | Nội dung thay đổi cụ thể |
| :--- | :---: | :--- |
| `AdminDashboard.tsx` | **Tạo mới** | Xây dựng component bảng điều khiển: gọi API `GET /admin/dashboard`, hiển thị 4 thẻ thống kê thời gian thực, thanh tìm kiếm người dùng, bộ lọc vai trò và nút đăng xuất. |
| `AdminDashboard.css` | **Tạo mới** | Viết CSS cho trang Admin: layout responsive, thẻ thống kê, badge trạng thái vai trò, hiệu ứng hover, loading spinner và bảng dữ liệu. |
| `AppRouter.tsx` | **Chỉnh sửa** | Import `AdminDashboard` và khai báo tuyến đường: `<Route path="/admin/dashboard" element={<AdminDashboard />} />`. |
| `LoginPage.tsx` | **Chỉnh sửa** | • Thêm `case "ADMIN": navigate("/admin/dashboard");` trong `redirectByRole`.<br>• Thêm nút bấm test vai trò **Admin**. |
| `auth.types.ts` | **Chỉnh sửa** | Bổ sung vai trò `"ADMIN"` vào kiểu `UserRole`. |
| `.env` | **Chỉnh sửa** | Bổ sung biến môi trường `VITE_GOOGLE_CLIENT_ID`. |

### 3. File Database & Cấu hình khác

| File | Trạng thái | Nội dung thay đổi cụ thể |
| :--- | :---: | :--- |
| `HorseTransportDB.sql` | **Chỉnh sửa** | Cập nhật định dạng / nội dung truy vấn script cơ sở dữ liệu. |
| `package-lock.json` | **Tạo mới** | File lock sinh ra ở thư mục gốc repo do cài đặt thêm package phụ thuộc mới. |
```eof

Bạn chỉ cần nhấn nút Copy ở góc trên bên phải của khối code này và dán trực tiếp vào file `.md` trên GitHub là giao diện sẽ hiển thị các bảng biểu và danh sách rất đẹp mắt.
