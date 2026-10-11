# Racehorse-Transport-System
Cross-Border Racehorse Transport Management System - React frontend and ASP.NET Core backend.
# Nhật ký Cập nhật Dự án (RaceHorse Transport System)

Dưới đây là bảng tổng hợp toàn bộ các công việc và sửa đổi mới nhất của hệ thống:

---

### 1. Phân hệ Backend (`RaceHorse_Transport_Backend`)

- **Tạo mới `AdminController.cs`:**
  * Viết API **`GET /api/admin/dashboard`** kết nối trực tiếp đến cơ sở dữ liệu `HorseTransportDB`.
  * Truy vấn số liệu thực tế thời gian thực: đếm số lượng người dùng (`USER`), ngựa đua (`HORSE`), yêu cầu vận chuyển (`TRANSPORT_REQUEST`), phương tiện xe (`VEHICLE`).
  * Trả về danh sách toàn bộ 11 tài khoản thực tế trong database phục vụ bảng quản trị.
- **Cập nhật `AuthController.cs`:**
  * **Bổ sung API `POST /api/auth/google-login`:** Tiếp nhận `idToken` từ Google, gọi sang Google API để xác thực danh tính.
  * **Cơ chế tự động cấp tài khoản:** Nếu email Google đã tồn tại trong database thì đăng nhập ngay; nếu là người dùng mới thì tự động chèn tài khoản vào bảng `[USER]` với vai trò `Customer` (`IsActive = 1`) và cấp JWT Token.
  * Bổ sung các DTO: `GoogleLoginRequest`, `GoogleTokenInfo`.
- **Cấu hình & Vận hành:**
  * Kích hoạt và duy trì server Backend ASP.NET Core chạy tại `http://localhost:5129` (Swagger: `http://localhost:5129/swagger`).

---

### 2. Phân hệ Frontend (`frontend`)

- **Tạo mới giao diện Admin Dashboard:**
  * `AdminDashboard.tsx`: Xây dựng giao diện bảng điều khiển quản trị, gọi API `apiClient.get('/admin/dashboard')` để tải dữ liệu thật từ SQL Server (không dùng mock data), tích hợp thanh tìm kiếm trực tiếp và bộ lọc theo vai trò.
  * `AdminDashboard.css`: Tạo phong cách thiết kế hiện đại, responsive cho dashboard, thẻ thống kê, thanh trạng thái DB và bảng người dùng.
- **Định tuyến & Phân quyền (Routing & Types):**
  * `AppRouter.tsx`: Khai báo tuyến đường `<Route path="/admin/dashboard" element={<AdminDashboard />} />`.
  * `auth.types.ts`: Thêm vai trò `"ADMIN"` vào union type `UserRole`.
- **Cập nhật trang Đăng nhập (`LoginPage.tsx`):**
  * Thêm case `"ADMIN"` trong hàm `redirectByRole` để điều hướng tài khoản quản trị viên vào `/admin/dashboard`.
  * Bổ sung nút bấm test "Admin" trong mục *Demo theo vai trò*.
- **Cấu hình môi trường (`.env`):**
  * Tích hợp mã `VITE_GOOGLE_CLIENT_ID` để kích hoạt widget đăng nhập Google trên trình duyệt.

---

### 3. Cơ sở dữ liệu & Tài khoản kiểm thử (`HorseTransportDB`)

- **Kiểm tra và xác thực kết nối:**
  * Dịch vụ SQL Server `SQLEXPRESS` kết nối thông suốt với tài khoản `sa`.
- **Tìm kiếm & xác thực các tài khoản mẫu có sẵn:**
  * **Super Admin:** `admin@cbntransport.com` | Mật khẩu: `HASH_SECURE_00`
  * **Customer:** `vana.horse@gmail.com` | Mật khẩu: `HASH_SECURE_01`
  * **Coordinator:** `hai.coord@cbntransport.com` | Mật khẩu: `HASH_SECURE_06`
  * **Driver:** `hung.driver@cbntransport.com` | Mật khẩu: `HASH_SECURE_07`

---

### 4. Kết quả commit Git
Toàn bộ các thay đổi trên đã được commit thành công vào nhánh `Tuan`:
- **Commit:** `[Tuan f30b61d] Co the dang nhap bang google va kem theo co tai khoan super Admin` (9 files changed, 958 insertions).
```eof

Bạn có thể copy trực tiếp nội dung trên và dán vào file `README.md` (hoặc `CHANGELOG.md`) trên repository của dự án nhé! Cấu trúc này khi render trên GitHub/GitLab sẽ hiển thị rất rõ ràng và mạch lạc.
