# Hướng dẫn đóng góp cho dự án

Chào mừng bạn đến với dự án **Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)**. Dưới đây là các quy chuẩn để đảm bảo sự đồng bộ khi làm việc nhóm.

---

## 1. Quy chuẩn lập trình

Dự án phân tách quy chuẩn kỹ thuật rõ ràng theo từng phần:
* **Giao diện (Frontend):** Xem chi tiết tại [frontend/CODING_RULES.md](./frontend/CODING_RULES.md)
* **Máy chủ (Backend):** Xem chi tiết tại [backend/CODING_RULES.md](./backend/CODING_RULES.md)

---

## 2. Quy trình làm việc với Git và GitHub

### 2.1. Quy tắc phân nhánh

- **`main`**: Nhánh chứa mã nguồn ổn định, dùng để nộp bài, báo cáo hoặc triển khai. Tuyệt đối không đẩy mã nguồn trực tiếp vào nhánh này.
- **`develop`**: Nhánh chứa mã nguồn mới nhất đang trong quá trình phát triển (nơi tích hợp các tính năng từ các thành viên).
- **Nhánh tính năng**: Tạo từ nhánh `develop`.
  - Cú pháp: `feature/<tên-tính-năng-ngắn-gọn>`
  - Ví dụ: `feature/login-page`, `feature/horse-booking`
- **Nhánh sửa lỗi**:
  - Cú pháp: `bugfix/<tên-lỗi>` (nếu tách từ `develop` để sửa lỗi trong quá trình phát triển)
  - Cú pháp: `hotfix/<tên-lỗi>` (nếu tách từ `main` để sửa lỗi khẩn cấp)

### 2.2. Quy trình gửi và duyệt yêu cầu gộp mã (Pull Request)

1. Mọi tính năng mới đều phải được đẩy lên nhánh riêng và tạo Pull Request (PR) gộp vào nhánh `develop`.
2. PR cần được đặt tên rõ ràng, mô tả chi tiết những gì đã làm, kèm ảnh chụp màn hình kiểm thử (Swagger/Postman hoặc giao diện).
3. Chờ ít nhất 1 thành viên khác (hoặc Trưởng nhóm) xem xét và chấp thuận (Approve) trước khi gộp (Merge).
4. **Quy tắc gộp PR:**
   - Ưu tiên chọn **"Create a merge commit"** (hoặc "Rebase and merge") khi gộp vào `develop` và `main` để giữ nguyên toàn bộ lịch sử commit và điểm đóng góp (contribution) của từng thành viên.
   - Hạn chế dùng "Squash and merge" đối với các nhánh có nhiều người cùng tham gia đóng góp.
5. Sau khi đợt phát triển hoặc Sprint hoàn tất và nhánh `develop` đã được kiểm thử ổn định, tạo PR từ `develop` vào `main`.

