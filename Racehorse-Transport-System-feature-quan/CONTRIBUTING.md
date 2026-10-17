# Hướng dẫn đóng góp (Contributing Guidelines)

Chào mừng bạn đến với dự án **Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)**. Dưới đây là các quy chuẩn để đảm bảo sự đồng bộ khi làm việc nhóm.

---

## 1. Frontend Coding Rules

Toàn bộ code frontend phải nằm trong thư mục `frontend/src/`.

### 1.1. Folder Structure (Cấu trúc thư mục chính)

Cấu trúc chuẩn:
```text
src/
├── app/        # Code cấu hình toàn bộ ứng dụng (Store, Router, v.v.)
├── assets/     # Hình ảnh, icon, CSS và tài nguyên tĩnh
├── features/   # Các nghiệp vụ chính của hệ thống
├── shared/     # Code dùng chung cho nhiều feature (UI components, utils, v.v.)
├── App.tsx
└── main.tsx
```

**Quy tắc:** Không tự ý tạo thêm các folder cấp cao trong `src/` (như `pages/`, `services/`, `models/`,...). Nếu thực sự cần thêm, phải thống nhất với team.

### 1.2. Feature Structure (Cấu trúc nghiệp vụ)

Mỗi nghiệp vụ chính của hệ thống phải được tổ chức thành một feature riêng trong `src/features/`.
Mỗi feature chỉ chứa code liên quan trực tiếp đến nghiệp vụ đó.

Ví dụ các features hiện tại:
- `auth/`
- `horse-management/`
- `transport-request/`
- `document-management/`
- `quarantine-customs/`
- `route-planning/`
- `trip-tracking/`
- `incident-management/`
- `payment/`
- `dashboard/`

*(Tuyệt đối không đặt code của nghiệp vụ này vào trong thư mục nghiệp vụ khác).*

### 1.3. Structure Inside Each Feature (Cấu trúc trong mỗi feature)

Cấu trúc tiêu chuẩn của một feature (Chỉ tạo khi cần, không tạo folder rỗng):
```text
feature-name/
├── pages/       # Các màn hình hoàn chỉnh của feature.
├── components/  # Các UI component chỉ dùng riêng trong feature này.
├── api/         # Function dùng để gọi Backend API.
├── hooks/       # Custom React Hooks của feature.
├── types/       # Interface và type TypeScript.
└── validation/  # Schema và logic validate form.
```

---

## 2. Backend Coding Rules

Các quy chuẩn và luật khi viết code backend (ASP.NET Core) được lưu trữ tại file riêng biệt:
👉 **[backend_coding_rules.md](./backend_coding_rules.md)**

---

## 3. Quy trình làm việc với Git & GitHub

### 3.1. Phân nhánh (Branching)

- **`main`**: Nhánh chứa code ổn định, có thể deploy lên production. Tuyệt đối không commit trực tiếp vào nhánh này.
- **`develop`**: Nhánh chứa code mới nhất đang trong quá trình phát triển (tích hợp các tính năng).
- **Nhánh tính năng (Feature branches)**: Tạo từ nhánh `develop`.
  - Cú pháp: `feature/<tên-tính-năng-ngắn-gọn>`
  - Ví dụ: `feature/login-page`, `feature/horse-crud`
- **Nhánh sửa lỗi (Bugfix/Hotfix)**:
  - Cú pháp: `bugfix/<tên-lỗi>` (nếu rẽ từ `develop`)
  - Cú pháp: `hotfix/<tên-lỗi>` (nếu rẽ từ `main` để sửa lỗi gấp)



### 3.2. Quy trình Pull Request (PR)

1. Mọi code mới đều phải được đẩy lên một nhánh riêng và tạo Pull Request (PR) gộp vào nhánh `develop`.
2. PR cần được đặt tên rõ ràng, mô tả chi tiết những gì đã làm.
3. Chờ ít nhất 1 thành viên khác (hoặc Tech Lead) review và Approve (chấp thuận) trước khi Merge.
4. Xóa nhánh feature sau khi đã merge thành công để dọn dẹp kho lưu trữ.