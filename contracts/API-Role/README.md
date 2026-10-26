# Quy ước & Đặc tả API theo Vai trò (API-Role)

Tài liệu đặc tả API của hệ thống **Racehorse Transport System** theo từng Vai trò người dùng (Role-based API Contracts).

## 1. Mục đích

Khác với cách tiếp cận theo Luồng nghiệp vụ (`API-Flow/Flow1`, `API-Flow/Flow2`, `API-Flow/Flow3` mô tả sự phối hợp chéo giữa nhiều vai trò trong một chu trình), thư mục `API-Role/` tập trung quy tụ **toàn bộ API dành riêng cho từng vai trò người dùng cụ thể**. 

Mỗi thư mục vai trò cung cấp tài liệu tự thân đầy đủ, giúp:
- **Frontend Developer** phụ trách vai trò đó biết chính xác mọi API cần tích hợp trên tất cả các trang của vai trò mình.
- **Backend Developer** dễ dàng xây dựng Controller, Authorization middleware (RBAC) và DTO chuyên biệt cho từng actor.

---

## 2. Danh mục Vai trò trong Hệ thống

| Thư mục | Vai trò | Role Code (JWT) | URL Prefix | Trạng thái |
|---|---|---|---|---|
| [`Customer/`](Customer/CUSTOMER.md) | Khách hàng đặt dịch vụ | `CUSTOMER` | `/customer/*`, `/locations/*` | Đã hoàn thiện |
| [`Manager/`](Manager/MANAGER.md) | Quản lý vận hành | `LOGISTICS_MANAGER` | `/manager/*` | Đã hoàn thiện |
| [`Specialist/`](Specialist/SPECIALIST.md) | Chuyên viên hồ sơ y tế & kiểm dịch | `TRANSPORT_SPECIALIST` | `/specialist/*` | Đã hoàn thiện |
| [`Coordinator/`](Coordinator/COORDINATOR.md) | Điều phối viên phương tiện & tuyến | `FLEET_ROUTE_COORDINATOR` | `/coordinator/*` | Đã hoàn thiện |
| `Driver/` | Tài xế & Áp tải ngựa | `DRIVER_ESCORT` | `/driver/*` | Dự kiến |
| `Admin/` | Quản trị hệ thống | `ADMIN` | `/admin/*` | Dự kiến |

---

## 3. Cấu trúc tài liệu của mỗi Vai trò (Chuẩn Phương án 2)

Để tránh trùng lặp mã wire JSON với các luồng nghiệp vụ chung ([`FLOW1.md`](../API-Flow/Flow1/FLOW1.md)), mỗi vai trò được tinh gọn thành 2 tệp cốt lõi:
1. **`<ROLE>.md`**: Bản đồ tra cứu & Chỉ dẫn kỹ thuật (Navigation & Integration Matrix). Đối chiếu từng màn hình frontend với API và liên kết trực tiếp sang endpoint tương ứng trong `FLOW1.md`, đồng thời quy định các Business Rules và Permissions của riêng vai trò đó.
2. **`<role>.openapi.json`**: File đặc tả OpenAPI 3.0.3 machine-readable riêng cho vai trò đó (dùng cho Swagger UI, Postman, test tự động).

