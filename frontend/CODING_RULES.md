# FRONTEND CODING RULES
**Project:** Racehorse Transport System

**Architecture:** Role-based & Domain-driven Architecture

**Technology:** React 19, Vite, TypeScript, React Router 7, Vitest

---

## 1. Mục đích (Purpose)

Tất cả thành viên tham gia phát triển Frontend phải tuân thủ thống nhất các quy tắc trong tài liệu này nhằm:

- Đảm bảo tính nhất quán của source code và trải nghiệm người dùng (UX/UI).
- Phân định rõ trách nhiệm giữa các vai trò (Roles) và các module dùng chung.
- Đảm bảo tuân thủ nghiêm ngặt **API Contract** và chuẩn hóa dữ liệu Wire Model từ Backend.
- Đồng bộ mượt mà dữ liệu giữa các vai trò (Điều phối, Quản lý, Chuyên viên, Khách hàng, Tài xế).
- Giữ code dễ bảo trì, dễ mở rộng và kiểm thử tự động với TypeScript và Vitest.

---

## 2. Cấu trúc thư mục (Project Structure)

Toàn bộ mã nguồn Frontend nằm trong thư mục `frontend/src/`.

### 2.1. Cấu trúc thư mục cấp cao (`src/`)

```text
src/
├── app/          # Cấu hình toàn bộ ứng dụng (Router, Context providers tổng)
├── assets/       # Tài nguyên tĩnh (SVG icons, hình ảnh)
├── contracts/    # OpenAPI specs JSON của các Flow (API Contract-first)
├── features/     # Nghiệp vụ chính tổ chức theo Vai trò và Domain
├── shared/       # Thành phần dùng chung toàn hệ thống
├── App.tsx
├── main.tsx
└── index.css     # CSS Variables, Design Tokens và Utility classes dùng chung
```

> [!IMPORTANT]
> Tuyệt đối không tự ý tạo thêm các thư mục cấp cao trong `src/` (như `pages/`, `services/`, `models/`...). Mọi màn hình và logic phải nằm đúng trong `features/` hoặc `shared/`.

---

### 2.2. Tổ chức thư mục `features/` (Role-based & Domains)

Mã nguồn nghiệp vụ được phân chia theo **Vai trò người dùng (Roles)** và một số **Domain hỗ trợ**:

1. **Nhóm Vai trò (Roles):**
   - `features/coordinator/`: Dành cho Điều phối viên (quản lý tuyến đường, phân xe, nhân sự, chuyến bay).
   - `features/manager/`: Dành cho Quản lý (duyệt đơn, hợp đồng, báo cáo, điều phối tổng thể).
   - `features/customer/`: Dành cho Khách hàng (tạo yêu cầu, quản lý ngựa, theo dõi, thanh toán).
   - `features/specialist/`: Dành cho Bác sĩ thú y / Chuyên viên (kiểm dịch, hồ sơ sức khỏe ngựa, phê duyệt giấy tờ).
   - `features/driver/`: Dành cho Tài xế (nhận chuyến, cập nhật hành trình, báo cáo sự cố dọc đường).
   - `features/admin/`: Dành cho Quản trị viên hệ thống.

2. **Nhóm Domain & Hỗ trợ:**
   - `features/auth/`: Đăng nhập, phân quyền, xác thực Google/OAuth.
   - `features/tracking/`: Bản đồ theo dõi thời gian thực chuyến đi (GPS/Leaflet).
   - `features/incidents/`: Báo cáo và xử lý sự cố.
   - `features/payment/`: Tích hợp thanh toán (VNPay sandbox / cổng thanh toán).
   - `features/aftercare/`: Chăm sóc và theo dõi ngựa sau vận chuyển.
   - `features/landing/`: Trang giới thiệu công khai.
   - `features/demo/`: Bộ điều khiển kịch bản thử nghiệm / trình diễn luồng.

---

### 2.3. Cấu trúc bên trong mỗi Feature (`src/features/<feature-name>/`)

Một feature lớn được tổ chức theo các thư mục chuyên biệt (chỉ tạo khi có nhu cầu sử dụng):

```text
features/<vai-trò>/
├── api/          # Gọi API Backend và mapper chuẩn hóa (...FromWire, ...ToWire)
├── components/   # UI components dùng riêng trong vai trò này
├── domain/       # Business rules, validation logic, quy tắc nghiệp vụ (ví dụ: coordinatorRules.ts)
├── hooks/        # Custom React Hooks của feature (ví dụ: useManager.ts, managerRules.ts)
├── pages/        # Các trang màn hình hoàn chỉnh gắn với Router
├── store/        # Quản lý state/context nội bộ của feature (ví dụ: coordinatorStore.tsx)
├── styles/       # CSS modules hoặc stylesheet riêng cho feature
├── types/        # TypeScript interfaces và types riêng của feature
└── workflows/    # Luồng thao tác người dùng phức tạp (form wizard, action handlers)
```

---

### 2.4. Thư mục dùng chung (`src/shared/`)

Dành cho các thành phần dùng lại ở từ 2 vai trò trở lên:
- `shared/components/`: Nút bấm, Card, Modal, Input, Badge trạng thái (`StatusBadge`).
- `shared/layouts/`: Bố cục chung (Header, Sidebar, Navigation).
- `shared/maps/`: Bản đồ Leaflet, tính toán tọa độ, trạm dừng.
- `shared/utils/`: Tiện ích chung, đặc biệt là các công cụ đồng bộ: `sharedTrips.ts`, `sharedRequests.ts`, `syncChannel.ts`.
- `shared/context/`: Context chia sẻ đa vai trò (AuthContext, NotificationContext).
- `shared/types/`: Types dùng chung toàn ứng dụng.

---

## 3. Quy chuẩn giao tiếp API & Wire Data Model

1. **Tuyệt đối không gọi `fetch` trực tiếp trong component:**
   - Tất cả request HTTP phải đi qua client API riêng của từng feature (ví dụ `flow3Api.ts`, `managerApi.ts`, `customerApi.ts`, `driverApi.ts`).
2. **Chuẩn hóa dữ liệu Wire Model (`...FromWire` / `...ToWire`):**
   - Dữ liệu Backend trả về (Wire DTO) có thể có cấu trúc, kiểu dữ liệu hoặc quy ước đặt tên khác với UI model.
   - **Bắt buộc** viết hàm chuyển đổi (`fromWire` / `toWire`) ngay tại tầng `api/` của feature.
   - Không được rải rác logic parse JSON, định dạng ngày tháng, hoặc chuyển đổi enum trong component.
3. **API Contract-first:**
   - Hợp đồng API được lưu tại `src/contracts/*.openapi.json`.
   - Trước khi tích hợp hoặc khi có thay đổi contract từ Backend, chạy:
     ```bash
     npm run contract:check
     npm run contract:sync
     ```

---

## 4. Quản lý trạng thái & Đồng bộ liên vai trò (Cross-Role Sync)

Hệ thống vận chuyển ngựa có sự phối hợp giữa nhiều bên (Khách hàng tạo đơn $\rightarrow$ Quản lý duyệt $\rightarrow$ Chuyên viên thẩm định $\rightarrow$ Điều phối xếp tuyến $\rightarrow$ Tài xế chạy).

1. **State nội bộ vai trò:**
   - Sử dụng Store / Context riêng của feature (ví dụ `coordinatorStore.tsx`).
   - Cập nhật state và gọi `commit()` để tự động lưu vào local state / localStorage.
2. **Đồng bộ giữa các vai trò trên cùng trình duyệt:**
   - Khi một vai trò thay đổi trạng thái (duyệt đơn, đổi tuyến, báo sự cố), phải gọi các tiện ích đồng bộ: `saveSharedTrip` / `saveSharedRequest`.
   - Tận dụng `syncChannel.ts` (sử dụng `BroadcastChannel` của trình duyệt) để các tab khác tự động cập nhật ngay mà không cần tải lại trang.

---

## 5. Quy chuẩn Giao diện (UI/UX) & Styling

### 5.1. Màu sắc và CSS Variables
- **Bắt buộc dùng biến CSS** trong `src/index.css` (`--bg-page`, `--bg-surface`, `--text-primary`, `--border-color`, `--accent-primary`...).
- **Tuyệt đối không hardcode mã màu hex** (ví dụ `#f97316`, `#1e293b`) trực tiếp trong inline-style hay component.
- Màu cam (`--accent-primary`) chỉ dành cho thao tác chính (Primary Action) và điểm nhấn quan trọng; mỗi khu vực chỉ có 1 nút chính.

### 5.2. Bảng màu trạng thái thống nhất toàn hệ thống
Luôn sử dụng component huy hiệu dùng chung (`StatusBadge` hoặc `TripStatusBadge`):
* 🟢 **Xanh lá (Success):** Đã duyệt, Hoàn tất, Đạt yêu cầu.
* 🟡 **Vàng (Warning/Pending):** Đang chờ xử lý, Chờ duyệt, Tạm dừng.
* 🔴 **Đỏ (Danger/Error):** Bị từ chối, Sự cố khẩn cấp, Thất bại, Hủy.
* 🔵 **Xanh dương (Info):** Đã gửi, Đang vận chuyển, Thông tin mới.
* ⚪ **Xám (Neutral):** Nháp, Chưa đến lượt, Không bắt buộc.

### 5.3. Ngôn ngữ & Nội dung
- **100% tiếng Việt chuyên nghiệp:** Giọng văn trung tính, rõ ràng, không pha trộn tiếng Anh tùy tiện trên UI.
- **Không dùng emoji trang trí** (tránh 📍 🗺️ ⚠️ 💡 ⚡ 📞 ✉️). Sử dụng chữ kèm nhãn ("SĐT:", "Địa chỉ:") hoặc icon SVG từ `src/assets/`. Được giữ các ký hiệu chức năng: `→`, nút `✕`, `↑ ↓`.
- **Không đưa ghi chú nghiệp vụ kỹ thuật vào UI:** Không hiển thị các câu kiểu "Phương án B...", "dữ liệu demo", "Chủ dự án chưa chốt".
- **Không bịa đặt dữ liệu:** Khi chưa có giá trị thật (ngày, tiền, hạn giấy tờ), hiển thị "Chưa có" hoặc để trống, không tự điền giá trị ngẫu nhiên.

### 5.4. Bố cục & Trải nghiệm
- **Bố cục Thẻ (Card Layout):** Mỗi khối thông tin là một thẻ có tiêu đề rõ ràng. Thứ tự: Tiêu đề & Trạng thái $\rightarrow$ Nội dung $\rightarrow$ Ghi chú $\rightarrow$ Hàng nút thao tác ở cuối thẻ.
- **Nút bị khóa (Disabled):** Phải kèm chú thích lý do khóa (tooltip hoặc dòng text nhỏ), không để nút "chết" gây khó hiểu cho người dùng.
- **Responsive:** Bố cục co giãn mượt mà, không làm vỡ giao diện trên màn hình nhỏ. Bảng dữ liệu dài phải có cuộn ngang nội bộ trong thẻ, không làm toàn trang bị cuộn ngang.

---

## 6. Quy tắc Kiểm thử & Đảm bảo chất lượng (Quality Gate)

Trước khi tạo Pull Request hoặc bàn giao tính năng, Developer **bắt buộc** chạy 2 lệnh sau tại thư mục `frontend/`:

1. **Kiểm tra kiểu dữ liệu TypeScript (Không được có bất kỳ lỗi nào):**
   ```bash
   npx tsc -p tsconfig.app.json --noEmit
   ```
2. **Chạy Unit/Integration Tests (Vitest):**
   ```bash
   npm run test:run
   ```

---

## 7. Checklist trước khi tạo Pull Request

- [ ] Toàn bộ code đặt đúng thư mục vai trò trong `src/features/<vai-trò>/`.
- [ ] Không import thừa, không còn biến rác hoặc `console.log` thử nghiệm.
- [ ] Gọi API qua API client của feature, đã map dữ liệu qua hàm `...FromWire`.
- [ ] Logic nghiệp vụ dùng lại được đặt trong `domain/` hoặc `...Rules.ts`.
- [ ] Giao diện dùng đúng biến CSS (`--bg-page`, `--text-primary`...) và không dùng emoji trang trí.
- [ ] Màu trạng thái khớp với quy chuẩn chung và dùng `StatusBadge`.
- [ ] Text 100% tiếng Việt, đúng giọng văn hệ thống.
- [ ] `npx tsc -p tsconfig.app.json --noEmit` chạy thành công không có lỗi.
- [ ] `npm run test:run` chạy pass toàn bộ test case liên quan.
- [ ] Đã kiểm tra giao diện không bị vỡ trên các độ phân giải khác nhau.
