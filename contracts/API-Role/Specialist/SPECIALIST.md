# Chỉ dẫn API — Role: Transport Specialist (Chuyên viên Hồ sơ & Kiểm dịch)

> **Flow 3 đã thay thế ngày 27/10/2026:** [quy trình v2](../../API-Flow/Flow3/FLOW3.md) và [API/JSON chuẩn](../../API-Flow/Flow3/FLOW3-API-JSON.md) là nguồn hiện hành cho planning/nguồn lực/bay/READY/khởi hành. Bảng và quy tắc planning cũ bên dưới chỉ tra cứu lịch sử khi khác v2: hai nhánh song song, ba người mỗi ROAD; ROAD confirm trước submit, AIR approve rồi book/confirm; không feasibility/timed-documents gate. API role JSON cũ không thay schema v2.


| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 2.1 — Bản đồ Tra cứu & Điều hướng Role (Navigation & Integration Matrix) |
| Ngày cập nhật | 26/10/2026 |
| Dự án | Racehorse Transport System |
| Định hướng kiến trúc | Phương án 2: Tinh gọn Role Index — Tham chiếu trực tiếp nguồn chuẩn Flow 2 & Flow 3 |
| Phạm vi | Toàn bộ giao diện cổng Chuyên viên (`frontend/src/features/specialist`) |
| Schema máy đọc | [specialist.openapi.json](specialist.openapi.json) |
| Role code trong JWT | `TRANSPORT_SPECIALIST` |
| URL Prefix | `/specialist/*` |

---

## 1. Hành trình Nghiệp vụ của Transport Specialist

Chuyên viên hồ sơ chịu trách nhiệm về tính hợp pháp y tế, hồ sơ tiêm chủng, giấy phép kiểm dịch vùng, cơ sở cách ly, bảo hiểm và thông quan:

```text
[1. Tiếp nhận Hồ sơ Chuyến đi]
   Manager phân công Specialist phụ trách Chuyến đi (TRIP_* ở trạng thái PLANNING)
   → Specialist kiểm tra tuyến đường (nội địa VN hay quốc tế Nhật Bản) để áp dụng Bộ quy định kiểm dịch (REQUIREMENT_SET)

[2. Kiểm duyệt Hồ sơ Khách hàng nộp (Customer Documents Review)]
   Xem danh sách hồ sơ ngựa khách hàng tải lên (Hộ chiếu, Tiêm phòng cúm Equine Influenza, Sức khỏe tổng quát, Giấy tờ sở hữu)
   ├─ Nếu hợp lệ: Phê duyệt (APPROVED)
   └─ Nếu thiếu/mờ/hết hạn: Từ chối (ACTION_REQUIRED) hoặc Tạo yêu cầu bổ sung gửi khách hàng (DOC_REQUEST)

[3. Đặt chỗ Cơ sở Cách ly & Lập Hồ sơ Cơ quan Chức năng]
   Đối với các tuyến quốc tế hoặc kiểm dịch liên vùng:
   → Specialist thực hiện đặt chỗ cơ sở cách ly kiểm dịch (Quarantine Booking)
   → Nộp hồ sơ xin cấp Giấy chứng nhận kiểm dịch động vật vận chuyển (Cục Thú y / Chi cục Thú y vùng)
   → Ghi nhận giấy phép thông quan và số chứng thư kiểm dịch (Clearance Record)

[4. Quản lý & Xác minh Bảo hiểm (Insurance)]
   Thiết lập hợp đồng bảo hiểm vận chuyển ngựa đua giá trị cao theo khai báo của khách
   → Xác minh hiệu lực hợp đồng bảo hiểm (Verify Insurance)

[5. Xác nhận Sẵn sàng Hồ sơ (Documents READY)]
   Khi toàn bộ hồ sơ khách hàng, chứng thư kiểm dịch, cơ sở cách ly và bảo hiểm đã đầy đủ và còn hiệu lực
   → Specialist ấn nút Xác nhận Sẵn sàng Hồ sơ (CONFIRM Documents READY)
   → Hệ thống ghi nhận stamp sẵn sàng; kết hợp với Ops READY của Coordinator để cho phép Manager duyệt khởi hành
```

---

## 2. Bảng ánh xạ Màn hình Giao diện → API & Mã Endpoint chuẩn

| Màn hình / Component | Route UI | Thao tác chuyên viên | Method & URL | Chức năng chi tiết |
|---|---|---|---|---|
| **Bảng điều khiển (Dashboard)** | `/specialist` | Xem hồ sơ chờ duyệt, cảnh báo hạn giấy tờ | `GET /specialist/trips`<br>`GET /specialist/customer-documents`<br>`GET /specialist/document-requests` | Tổng quan tiến độ giấy tờ các chuyến, hồ sơ cần duyệt gấp |
| **Danh sách Chuyến đi** | `/specialist/trips` | Danh sách các chuyến được phân công | `GET /specialist/trips` | Lọc chuyến theo tiến độ hồ sơ (`DOCS_PENDING`, `DOCS_READY`) |
| **Chi tiết Hồ sơ Chuyến đi** | `/specialist/trips/:id` | Xem toàn bộ hồ sơ pháp lý & y tế của chuyến | `GET /specialist/trips/{tripId}` | Danh mục checklist giấy tờ ngựa, kiểm dịch và bảo hiểm |
| | | Áp dụng Bộ quy định kiểm dịch theo tuyến | `PUT /specialist/trips/{tripId}/requirement-set` | Gán gói quy định (Ví dụ: Tuyến nội địa VN hoặc Xuất khẩu Nhật Bản) |
| | | Xác nhận Sẵn sàng Hồ sơ (Docs READY) | `POST /specialist/trips/{tripId}/docs-ready` | Đóng dấu hoàn tất pháp lý y tế để mở cổng duyệt khởi hành |
| **Kiểm duyệt Giấy tờ Khách nộp** | `/specialist/documents/customer` | Duyệt hoặc từ chối hồ sơ khách hàng nộp | `POST /specialist/trips/{tripId}/customer-documents/review` | Duyệt (`APPROVED`) hoặc yêu cầu nộp lại (`ACTION_REQUIRED`) |
| **Yêu cầu Bổ sung Giấy tờ** | `/specialist/document-requests` | Danh sách và tạo yêu cầu bổ sung | `GET /specialist/document-requests`<br>`POST /specialist/document-requests` | Gửi thông báo yêu cầu khách nộp thêm tài liệu còn thiếu |
| **Bảo hiểm Vận chuyển** | `/specialist/trips/:id/insurance` | Nhập và xác minh hợp đồng bảo hiểm | `PUT /specialist/trips/{tripId}/insurance`<br>`POST /specialist/trips/{tripId}/insurance/verify` | Quản lý mức bồi thường, số hợp đồng bảo hiểm và ngày hiệu lực |
| **Thông quan & Kiểm dịch Vùng** | `/specialist/trips/:id/clearances` | Ghi nhận chứng thư kiểm dịch / thông quan | `POST /specialist/trips/{tripId}/clearances` | Lưu số chứng thư kiểm dịch động vật và ngày cấp |
| **Đặt chỗ Cơ sở Cách ly** | `/specialist/quarantine-bookings` | Quản lý đặt chỗ trạm kiểm dịch cách ly | `GET /specialist/quarantine-bookings`<br>`POST /specialist/quarantine-bookings` | Trạm cách ly xuất khẩu / nhập khẩu ngựa đua |
| **Hồ sơ Pháp lý CBN Transport** | `/specialist/documents` | Quản lý giấy phép vận chuyển của công ty | `GET /specialist/documents`<br>`POST /specialist/documents` | Lưu trữ giấy phép lưu hành động vật, vệ sinh thú y xe |
| **Danh mục Quy định & Mẫu** | `/specialist/regulations` | Quản lý quy định kiểm dịch và loại giấy tờ | `GET /specialist/regulations`<br>`PUT /specialist/regulations`<br>`GET/PUT /specialist/document-types`<br>`GET/PUT /specialist/requirement-sets` | Cập nhật quy định thú y theo luật mới, mẫu giấy tờ |
| **Nhật ký Kiểm toán (Audit Log)** | `/specialist/audit` | Xem lịch sử duyệt, từ chối và sửa hồ sơ | `GET /specialist/audit` | Audit trail minh bạch cho cơ quan quản lý nhà nước |

---

## 3. Quy tắc Nghiệp vụ Dành riêng cho Chuyên viên Hồ sơ

### 3.1. Quy chuẩn Y tế & Tiêm chủng (Equine Health Rules)
- **Hộ chiếu ngựa (Passport):** Bắt buộc còn hạn tối thiểu **30 ngày** tính từ ngày khởi hành dự kiến. Mã số vi mạch microchip trên hộ chiếu phải trùng khớp 100% với chip cấy thực tế trên thân ngựa (15 chữ số chuẩn ISO 11784/11785).
- **Tiêm phòng cúm (Equine Influenza):** Mũi tiêm nhắc lại bắt buộc thực hiện trong vòng **6 tháng đến không quá 12 tháng** trước ngày vận chuyển. Không chấp nhận ngựa tiêm trong vòng 14 ngày trước khi xuất phát để tránh phản ứng sau tiêm.

### 3.2. Quy tắc Kiểm duyệt Hồ sơ Khách nộp
- Khi từ chối một giấy tờ (`reviewCustomerDoc` với kết quả từ chối), Specialist bắt buộc phải nhập lý do chi tiết (`>= 10 ký tự`) chỉ rõ lỗi (ví dụ: "Ảnh scan bị mờ trang 2", "Chưa có dấu xác nhận của bác sĩ thú y").
- Mục giấy tờ bị từ chối sẽ tự động kích hoạt trạng thái `ACTION_REQUIRED` trên màn hình của Khách hàng để khách nộp lại tệp mới.

### 3.3. Điều kiện Đóng dấu Sẵn sàng Hồ sơ (Documents READY)
- Nút xác nhận `confirmDocsReady` chỉ mở khi:
  1. 100% giấy tờ của từng con ngựa trong đơn đã được duyệt (`APPROVED`).
  2. Đã có chứng nhận bảo hiểm vận chuyển còn hiệu lực (`insurance.verified === true`).
  3. Nếu là tuyến có kiểm dịch liên tỉnh hoặc xuất khẩu: Đã có mã chứng thư kiểm dịch (`clearance.certNumber != null`) và đặt chỗ cơ sở cách ly thành công (`quarantineBooking.status === 'CONFIRMED'`).
  4. Ngày hết hạn của tất cả giấy tờ phải lớn hơn ngày dự kiến đến nơi (`expiryDate > trip.eta`).

---

## 4. Quy ước Kỹ thuật, Phân quyền & Mã Lỗi

- **Header bắt buộc:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  Accept: application/json
  ```
- **Phân quyền Role:** Claim `role: "TRANSPORT_SPECIALIST"` trong JWT token.
- **Mã lỗi thông dụng cần xử lý:**
  * `DOC_EXPIRED` (400): Giấy tờ đã hết hạn trước ngày hoàn thành vận chuyển.
  * `MICROCHIP_MISMATCH` (400): Mã số microchip không khớp giữa hộ chiếu và khai báo.
  * `INVALID_STATE` (409): Không thể xác nhận Docs READY khi còn giấy tờ đang chờ duyệt hoặc bị từ chối.
