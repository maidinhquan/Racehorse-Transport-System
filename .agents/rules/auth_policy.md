# Authentication & Password Verification Rule

## Quy tắc bắt buộc:
1. **KHÔNG** đổi logic đăng nhập sang bắt buộc mã băm thuần (strict hash/BCrypt only).
2. Phải luôn giữ cơ chế hỗ trợ mật khẩu gốc (plain text), seed data (`HASH_SECURE_...`, `GOOGLE_OAUTH`) và các mật khẩu dev thông dụng (`123456`, `admin123`, `Password123!`).
3. Cho phép đăng nhập bằng cả **Email** và **Username**.
4. **MỌI THAY ĐỔI** liên quan đến phần xác thực mật khẩu trong `AuthController.cs` / `VerifyPassword` **BẮT BUỘC PHẢI HỎI Ý KIẾN VÀ ĐƯỢC USER ĐỒNG Ý TRƯỚC**.
