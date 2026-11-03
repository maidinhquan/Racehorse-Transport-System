# API Contract & Triển khai thực tế — Flow 5: Xử lý sự cố vận chuyển (Bản cập nhật)

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 1.1.0 — Cập nhật ngày 03/11/2026 |
| **Trạng thái** | **ĐÃ TRIỂN KHAI THỰC TẾ**: Backend .NET API, Entity CSDL, Thông báo thời gian thực & Tích hợp giao diện Tài xế/Điều phối |
| **Tài liệu gốc** | Kế thừa và chuẩn hóa từ `FLOW5.md` (v1.0.0 — 29/10/2026) |
| **Đầu vào** | Chuyến đi (`TripId`) đang thực hiện hoặc chuẩn bị khởi hành phát sinh sự cố khẩn cấp |
| **Kết quả** | Ghi nhận sự cố vào CSDL, kích hoạt khóa an toàn (`SafetyBlockerActive`), tự động thông báo cho Điều phối viên, và hỗ trợ điều phối/khắc phục |

---

## 1. Các nhóm lý do báo cáo sự cố (Categories & Incident Reasons)

Hệ thống Flow 5 chuẩn hóa thành **4 nhóm danh mục chính (`Category`)** tại tầng Backend và ánh xạ tương ứng lên giao diện Tài xế:

| Mã Category | Tên hiển thị (Tiếng Việt) | Chi tiết sự cố áp dụng | Ràng buộc nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **`VEHICLE_RESOURCE`** | **Hỏng xe / Phương tiện & Tài xế** | Sự cố cơ khí, nổ lốp, hỏng động cơ, hỏng điều hòa; hoặc tài xế/người hộ tống gặp vấn đề sức khỏe không thể tiếp tục. | Được chọn nhanh qua thẻ gợi ý. |
| **`DELAY_AIR`** | **Kẹt xe kéo dài / Lịch trình & Chuyến bay** | Ùn tắc nghiêm trọng, đường bị chặn/sạt lở; hoãn, chậm, hủy hoặc đổi chuyến bay tại chặng hàng không. | Được chọn nhanh qua thẻ gợi ý. |
| **`HORSE_HEALTH`** | **Sự cố y tế của ngựa** | Ngựa bị sốt, đau bụng (*colic*), chấn thương, mất nước, kiệt sức, bất thường sinh hiệu. | Có thể kèm ghi chú sơ cứu hiện trường. |
| **`OTHER`** | **Khác** | Các trường hợp bất khả kháng hoặc tình huống phát sinh đặc thù khác. | **Bắt buộc**: Nhân viên phải nhập mô tả chi tiết tối thiểu 10 ký tự. |

> **Quy tắc nghiệp vụ**: 
> - Trường hợp *thiếu giấy tờ kiểm dịch/hồ sơ trước khởi hành* không thuộc Flow 5 vì đã được phát hiện và ngăn chặn sớm từ Flow 2.
> - Khách hàng không phải chi trả thêm bất kỳ chi phí phát sinh nào do sự cố (`customerAdditionalChargeVnd` luôn bằng 0).

---

## 2. Quy trình trạng thái sự cố (Incident Lifecycle)

Vòng đời sự cố gồm 3 trạng thái chuẩn:
`REPORTED → IN_PROGRESS → RESOLVED`

1. **`REPORTED` (Đã báo cáo)**:
   - Tài xế/Hộ tống gửi báo cáo từ hiện trường qua ứng dụng di động kèm xác nhận sơ cứu/an toàn ban đầu.
   - Server lập tức kích hoạt cờ khóa an toàn: `SafetyBlockerActive = true`.
   - Hệ thống tự động tạo thông báo khẩn cấp (`Notification`) gửi trực tiếp đến Điều phối viên phụ trách chuyến đi.
2. **`IN_PROGRESS` (Đang tiếp nhận & xử lý)**:
   - Điều phối viên (`FLEET_ROUTE_COORDINATOR`) tiếp nhận sự cố qua nút thao tác trên màn hình điều phối hoặc API `/accept`.
   - Tiến hành đánh giá 8 phạm vi tác động (Tài nguyên xe, Lịch trình, Booking bay, Hồ sơ, Bảo hiểm, Sức khỏe ngựa, Hạn giao, Chi phí).
3. **`RESOLVED` (Đã khắc phục / Hoàn tất)**:
   - Khi phương án thay thế xe/người, điều trị y tế hoặc điều chỉnh hành trình đã hoàn thành và đạt tiêu chuẩn an toàn.
   - Điều phối viên gỡ cờ khóa an toàn và đóng sự cố (`RECOVERED` hoặc chuyển xử lý theo thủ tục kết thúc sớm).

---

## 3. Phân quyền vai trò (Role Responsibilities)

| Vai trò (Role) | Trách nhiệm & Quyền hạn trong Flow 5 |
| :--- | :--- |
| **Tài xế / Người hộ tống** (`DRIVER`, `DRIVER_ESCORT`) | Báo cáo sự cố tại hiện trường, gửi ảnh minh chứng, tọa độ và xác nhận sơ cứu khẩn cấp ban đầu. |
| **Bác sĩ thú y** (`VETERINARIAN`) | Khám y tế, ghi chép nhật ký sức khỏe ngựa, kết luận khả năng tiếp tục di chuyển (`FIT` / `NOT_FIT`). |
| **Điều phối viên** (`FLEET_ROUTE_COORDINATOR`) | Nhận cảnh báo tức thời, tiếp nhận sự cố, đánh giá tác động, lập phương án khôi phục (đổi xe/người), đóng sự cố. |
| **Quản lý vận hành** (`LOGISTICS_MANAGER`) | Phê duyệt phương án phát sinh chi phí nội bộ hoặc thay đổi lịch trình cam kết, gửi thông báo chính thức cho khách hàng. |
| **Khách hàng** (`CUSTOMER`) | Xem tóm tắt sự cố công khai (`PublicIncident`) và phản hồi đồng thuận/từ chối khi có thay đổi lịch giao nhận. |

---

## 4. Kiến trúc Backend API đã triển khai thực tế (.NET)

### 4.1. Các DTOs (`Application/DTOs/Flow5/IncidentDtos.cs`)
- `ReportIncidentInputDto`:
  - `TripId`: Mã chuyến đi.
  - `Category`: Thuộc 1 trong 4 mã (`VEHICLE_RESOURCE`, `DELAY_AIR`, `HORSE_HEALTH`, `OTHER`).
  - `Description`: Mô tả diễn biến.
  - `ImmediateCare`: Hành động sơ cứu hoặc chăm sóc ngay tại chỗ.
  - `LocationCoordinates`: Tọa độ vị trí xảy ra sự cố.
  - `ImageUrl`: Đường dẫn ảnh bằng chứng hiện trường.
  - `OccurredAt`: Thời điểm xảy ra sự cố thực tế.
- `IncidentResponseDto`:
  - Trả về đầy đủ thông tin: `IncidentId`, `TripId`, `Category`, `Status`, `Description`, `LocationCoordinates`, `ImageUrl`, `CoordinatorId`, `ReportedByUserId`, `ReportedByUserName`, `ReportedAt`, `SafetyBlockerActive`.

### 4.2. Danh sách Endpoints (`Controllers/Flow5/IncidentsController.cs`)
- `POST /api/incidents` hoặc `POST /api/driver/trips/{tripId}/incidents`: Báo sự cố hiện trường từ ứng dụng tài xế.
- `GET /api/incidents`: Điều phối viên tra cứu danh sách sự cố (lọc theo `tripId`, `status`).
- `GET /api/incidents/{incidentId}`: Xem chi tiết sự cố.
- `POST /api/incidents/{incidentId}/accept`: Điều phối viên xác nhận tiếp nhận xử lý sự cố.

### 4.3. Quy tắc tự động hóa trong Service (`Flow5IncidentService.cs`)
1. **Sinh mã theo chuẩn**: `INC_{yyyyMMdd}_{6 ký tự ngẫu nhiên}` (ví dụ: `INC_20261103_AB12CD`).
2. **Kích hoạt Safety Blocker**: Gán `SafetyBlockerActive = true` ngăn chặn việc tiếp tục chặng đi khi chưa có giải pháp an toàn.
3. **Bắn thông báo thời gian thực**: Tạo bản ghi `Notification` loại `INCIDENT_REPORTED` gửi đích danh tới Coordinator được phân công trên chuyến đi.

---

## 5. Tích hợp giao diện Frontend đã hoàn tất

1. **Màn hình Tài xế (`features/driver/pages/incidents/IncidentsPage.tsx`)**:
   - Giao diện trực quan với 4 thẻ lựa chọn lý do: Hỏng xe, Kẹt xe kéo dài, Sự cố y tế của ngựa, Khác.
   - Checkbox xác nhận: *"Người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu"*.
   - Kết nối trực tiếp API `POST /api/incidents`, hiển thị phản hồi thành công và thông báo tình trạng đến điều phối.
2. **Thanh thông báo Điều phối (`CoordinatorLayout.tsx` & `coordinatorStore.tsx`)**:
   - Tự động hiển thị chuông thông báo màu đỏ khẩn cấp kèm thông tin chi tiết sự cố mới được báo.

---

## 6. Bảng đối soát giữa Contract thiết kế và Hiện thực hóa

| Nội dung | Bản thiết kế `FLOW5.md` gốc | Hiện thực hóa mã nguồn hiện tại | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Nhóm lý do** | 4 nhóm (`VEHICLE_RESOURCE`, `HORSE_HEALTH`, `DELAY_AIR`, `OTHER`) | Khớp 100% cả DTO, Service lẫn giao diện Tài xế | Hoàn toàn tương thích |
| **Trạng thái** | `REPORTED → IN_PROGRESS → RESOLVED` | Khớp 100% trong DB, Service và Controller | Hoàn toàn tương thích |
| **Khóa an toàn** | Đặt Safety Blocker ngay khi REPORTED | Tự động đặt `SafetyBlockerActive = true` khi lưu DB | Đã chạy thực tế |
| **Quy tắc "Khác"** | Bắt buộc nhập mô tả cụ thể | Validate tối thiểu 10 ký tự ở cả FE và BE | Hoàn thành |
| **Thông báo** | Báo tức thì cho Điều phối viên | Tự động tạo bản ghi Notification trong CSDL | Đã tích hợp |

