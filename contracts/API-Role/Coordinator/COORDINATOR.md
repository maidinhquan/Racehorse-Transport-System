# Chỉ dẫn API — Role: Fleet & Route Coordinator (Điều phối viên)

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 2.1 — Bản đồ Tra cứu & Điều hướng Role (Navigation & Integration Matrix) |
| Ngày cập nhật | 26/10/2026 |
| Dự án | Racehorse Transport System |
| Định hướng kiến trúc | Phương án 2: Tinh gọn Role Index — Tham chiếu trực tiếp nguồn chuẩn Flow 2 & Flow 3 |
| Phạm vi | Toàn bộ giao diện cổng Điều phối (`frontend/src/features/coordinator`) |
| Schema máy đọc | [coordinator.openapi.json](coordinator.openapi.json) |
| Role code trong JWT | `FLEET_ROUTE_COORDINATOR` |
| URL Prefix | `/coordinator/*` |

---

## 1. Hành trình Nghiệp vụ của Fleet & Route Coordinator

Điều phối viên chịu trách nhiệm về phương tiện, tài xế, trạm dừng nghỉ, lộ trình đường bộ và đặt chỗ chuyến bay:

```text
[1. Tiếp nhận Chuyến đi từ Manager]
   Manager phân công Coordinator phụ trách Chuyến đi (TRIP_* ở trạng thái PLANNING)
   → Coordinator kiểm tra thông tin số lượng ngựa, nơi nhận/giao và yêu cầu thời gian

[2. Khảo sát & Lập Phương án Tuyến đường (Route Planning)]
   Thiết kế lộ trình: điểm xuất phát, các trạm dừng nghỉ theo quy chuẩn an toàn sinh học, trạm kiểm tra thú y
   → Đệ trình phương án tuyến đường cho Manager phê duyệt (SUBMIT_ROUTE)
   ├─ Nếu Manager yêu cầu làm lại: Điều chỉnh lại lộ trình và đệ trình lại
   └─ Nếu Manager duyệt: Phương án tuyến chuyển sang APPROVED

[3. Đề xuất Ngân sách Chuyến bay (Đối với phương thức AIR)]
   Chọn hãng hàng không, chuyến bay, báo giá cước gửi Manager duyệt ngân sách (FLIGHT_PROPOSAL)
   → Manager phê duyệt ngân sách → Coordinator tiến hành đặt chỗ và nhập mã vận đơn (FLIGHT_BOOKING)

[4. Bố trí Phương tiện & Tổ xe (Resource Assignments)]
   Chọn xe chuyên dụng (Horse Van / Float có vách ngăn và điều hòa)
   → Bố trí tổ xe: Tài xế chính, tài xế phụ, nhân viên áp tải ngựa (Escort), bác sĩ thú y (Vet)
   → Kiểm tra xe không trùng lịch bảo dưỡng và tài xế có bằng lái phù hợp

[5. Xác nhận Sẵn sàng Vận hành (Operations READY) & Theo dõi]
   Sau khi phương án tuyến được duyệt và nguồn lực đã bố trí đầy đủ
   → Coordinator ấn nút Xác nhận Sẵn sàng Vận hành (CONFIRM Operations READY)
   → Khi cả Docs READY và Ops READY hoàn tất: Manager phê duyệt khởi hành
   → Giám sát tiến độ trên đường, cập nhật ETA, tiếp nhận và hỗ trợ xử lý sự cố phát sinh (Incidents)
```

---

## 2. Bảng ánh xạ Màn hình Giao diện → API & Mã Endpoint chuẩn

| Màn hình / Component | Route UI | Thao tác điều phối | Method & URL | Chức năng chi tiết |
|---|---|---|---|---|
| **Bảng điều khiển (Dashboard)** | `/coordinator` | Xem tổng quan chuyến cần lập kế hoạch, đội xe, sự cố | `GET /coordinator/trips`<br>`GET /coordinator/vehicles`<br>`GET /coordinator/incidents` | KPI trạng thái chuyến, tỷ lệ xe khả dụng, cảnh báo sự cố |
| **Danh sách Chuyến đi** | `/coordinator/trips` | Danh sách các chuyến được phân công | `GET /coordinator/trips` | Lọc theo trạng thái `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT` |
| **Chi tiết Chuyến đi** | `/coordinator/trips/:id` | Xem chi tiết chuyến, lịch trình, trạng thái sẵn sàng | `GET /coordinator/trips/{tripId}` | Xem thông tin ngựa, điểm nhận/giao, checklist sẵn sàng |
| **Lập Phương án Tuyến đường** | `/coordinator/trips/:id/route` | Thiết kế trạm dừng, trạm thú y và đệ trình duyệt | `POST /coordinator/trips/{tripId}/route/submit` | Gửi phương án tuyến cho Manager phê duyệt |
| **Phân công Nguồn lực (Tổ xe & Xe)** | `/coordinator/trips/:id/resources` | Chọn xe chuyên dụng và phân công tài xế, áp tải | `POST /coordinator/trips/{tripId}/assignments` | Gán xe (Vehicle) và nhân sự (Staff) vào chuyến |
| **Xác nhận Sẵn sàng (Ops READY)** | `/coordinator/trips/:id` | Xác nhận phương tiện & nhân sự đã sẵn sàng | `POST /coordinator/trips/{tripId}/operations-readiness/confirm` | Đóng dấu sẵn sàng vận hành để mở cổng duyệt khởi hành |
| **Phương án Hàng không (AIR)** | `/coordinator/trips/:id/flight` | Đề xuất chuyến bay & ngân sách cước bay | `POST /coordinator/trips/{tripId}/flight` | Trình Manager phê duyệt ngân sách chuyến bay |
| | | Nhập mã đặt chỗ/booking hãng bay | `POST /coordinator/trips/{tripId}/flight/booking` | Ghi nhận mã vận đơn hàng không (AWB / Booking Ref) |
| **Quản lý Đội xe (Fleet)** | `/coordinator/fleet` | Danh sách phương tiện chuyên dụng | `GET /coordinator/vehicles` | Trạng thái xe, tải trọng số ngựa, hạn đăng kiểm |
| **Quản lý Tổ xe (Crew/Staff)** | `/coordinator/crew` | Danh sách tài xế, áp tải, thú y | `GET /coordinator/staff` | Bằng lái, lịch rảnh, trạng thái phân công |
| **Giám sát & Cập nhật ETA** | `/coordinator/trips/:id` | Cập nhật thời gian dự kiến đến nơi (ETA) | `PUT /coordinator/trips/{tripId}/eta` | Điều chỉnh ETA khi có chậm trễ hoặc thời tiết xấu |
| | | Ghi nhận mốc hành trình | `POST /coordinator/trips/{tripId}/milestones` | Hỗ trợ ghi nhận mốc khi tổ xe mất kết nối mạng |
| **Giám sát Sự cố (Incidents)** | `/coordinator/incidents` | Danh sách sự cố phương tiện và giao thông | `GET /coordinator/incidents` | Xem cảnh báo hỏng xe, tắc đường, sự cố sức khỏe ngựa |

---

## 3. Quy tắc Nghiệp vụ Dành riêng cho Điều phối viên

### 3.1. Ràng buộc Phương án Tuyến đường (Route Planning Rules)
- Tuyến đường phải có trạm dừng nghỉ theo quy định: Tối đa **4 giờ** chạy xe liên tục phải có 1 trạm dừng nghỉ tối thiểu 30–45 phút để kiểm tra nước uống và thông gió cho ngựa.
- Phải xác định rõ trạm kiểm dịch động vật dọc đường đối với các tuyến liên tỉnh.
- Phương án tuyến sau khi đệ trình chuyển sang `PENDING_APPROVAL`. Nếu Manager từ chối (`CHANGES_REQUESTED`), Coordinator bắt buộc phải sửa đổi theo góp ý và nộp lại phiên bản mới (`v+1`).

### 3.2. Quy tắc Phân công Nguồn lực (Resource Assignment Rules)
- **Phương tiện:** Số lượng ngựa trong đơn không được vượt quá sức chứa tối đa của thùng xe (`vehicle.capacity >= trip.horseCount`). Xe phải còn hạn đăng kiểm và chứng nhận vệ sinh tiêu độc khử trùng.
- **Tổ xe:** 
  - Tuyến trên 300 km bắt buộc bố trí tối thiểu **2 tài xế** để đổi lái.
  - Tuyến có ngựa giá trị cao hoặc ngựa có lưu ý đặc biệt bắt buộc có **Bác sĩ thú y** hoặc nhân viên áp tải chuyên môn cao.
  - Nhân sự và xe được chọn không được trùng lịch với chuyến đi khác đang hoạt động.

### 3.3. Điều kiện Đóng dấu Sẵn sàng Vận hành (Operations READY)
- Nút xác nhận `confirmResources` chỉ có hiệu lực khi:
  1. Phương án tuyến đã được Manager duyệt (`route.status === 'APPROVED'`).
  2. Đã phân công đủ xe và nhân sự (`route.resourcesConfirmed === true`).
  3. Nếu là chuyến hàng không (AIR): Chuyến bay đã được duyệt ngân sách và đã có mã đặt chỗ xác nhận (`flight.bookingRef != null`).

---

## 4. Quy ước Kỹ thuật, Phân quyền & Mã Lỗi

- **Header bắt buộc:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  Accept: application/json
  ```
- **Phân quyền Role:** Claim `role: "FLEET_ROUTE_COORDINATOR"` trong JWT token.
- **Mã lỗi thông dụng cần xử lý:**
  * `RESOURCE_CONFLICT` (409): Xe hoặc nhân sự đã bị trùng lịch với chuyến khác.
  * `CAPACITY_EXCEEDED` (400): Sức chứa của xe nhỏ hơn số lượng ngựa cần vận chuyển.
  * `INVALID_STATE` (409): Không thể xác nhận sẵn sàng khi phương án tuyến chưa được duyệt.
