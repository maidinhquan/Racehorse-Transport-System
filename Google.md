# Quy tắc dự án Racehorse Transport System

## 1. QUY TẮC BẮT BUỘC VỀ ĐĂNG NHẬP VÀ MẬT KHẨU (AUTH POLICY)

> **CẢNH BÁO:** TUYỆT ĐỐI KHÔNG TỰ Ý ĐỔI CƠ CHẾ XÁC THỰC MẬT KHẨU SANG MÃ BĂM THUẦN (STRICT HASH / BCRYPT ONLY).

- **Lý do:** Database hiện tại và quá trình kiểm thử phụ thuộc vào dữ liệu mẫu seed data (`HASH_SECURE_xx`, `GOOGLE_OAUTH`) và các mật khẩu dev thông dụng. Việc áp đặt mã băm cứng sẽ làm toàn bộ hệ thống frontend và tester không đăng nhập được.
- **Quy chuẩn xác thực trong `AuthController.cs`:**
  1. Phải luôn duy trì hàm `VerifyPassword` hỗ trợ:
     - So khớp chuỗi gốc (`plain text comparison` cho seed data `HASH_SECURE_xx`).
     - Cho phép các mật khẩu dev thông dụng: `123456`, `admin123`, `Password123!`, `password`.
     - Cho phép đăng nhập bằng cả **Email** và **Username**.
     - Vẫn hỗ trợ `BCrypt.Verify` nếu chuỗi trong database là hash BCrypt hợp lệ.
  2. **YÊU CẦU BẮT BUỘC ĐỐI VỚI AI ASSISTANT:**
     - Nếu có bất kỳ chỉnh sửa nào liên quan đến logic đăng nhập, xác thực mật khẩu hoặc hàm `VerifyPassword` trong `AuthController.cs`, **BẮT BUỘC PHẢI HỎI Ý KIẾN VÀ ĐƯỢC USER XÁC NHẬN TRƯỚC KHI THỰC HIỆN**.
