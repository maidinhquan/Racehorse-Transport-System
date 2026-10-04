# Racehorse-Transport-System
Cross-Border Racehorse Transport Management System - React frontend and ASP.NET Core backend.
1. Quy tắc về cấu trúc folder
Toàn bộ frontend phải nằm trong:
frontend/
└── src/

Cấu trúc chuẩn:
src/
├── app/
├── assets/
├── features/
├── shared/
├── App.tsx
└── main.tsx

Không tự ý tạo thêm folder cấp cao như:
src/pages/
src/services/
src/models/
src/common/

nếu chưa thống nhất với team.
2. Quy tắc cho features/
Mỗi nghiệp vụ là một feature riêng.
Ví dụ:
features/
├── auth/
├── horse-management/
├── transport-request/
├── document-management/
├── quarantine-customs/
├── route-planning/
├── trip-tracking/
├── incident-management/
├── payment/
└── dashboard/

Trong mỗi feature, chỉ tạo các folder cần thiết:
feature-name/
├── pages/
├── components/
├── api/
├── hooks/
├── types/
└── validation/

Không bắt buộc feature nào cũng phải có đủ tất cả folder.