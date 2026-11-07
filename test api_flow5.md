# BỘ DỮ LIỆU VÀ KỊCH BẢN TEST SWAGGER TOÀN BỘ 43 API FLOW 5
> **Dự án:** RaceHorse Transport System  
> **Flow 5:** Xử lý sự cố, khôi phục hành trình & Thỏa thuận khách hàng (Incidents & Recovery)  
> **Địa chỉ Swagger UI:** [http://localhost:5129/swagger/index.html](http://localhost:5129/swagger/index.html)  
> **Tên nhóm trên Swagger:** `Flow 5 — Quản lý sự cố & Khôi phục (Incidents & Recovery)`

---

## 1. DANH SÁCH TOKEN TEST NHANH (SẴN SÀNG COPY)

Bấm vào nút **`Authorize`** (hình ổ khóa màu xanh lá ở góc trên bên phải màn hình Swagger), dán Token tương ứng với vai trò của API muốn test:

### Quản lý (LOGISTICS_MANAGER) - Dùng cho các API F5-J17, J31, J33, J37, J39, J42:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSXzAwNCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiVVNFUl8wMDQiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJsaW5oLm1hbmFnZXJAY2JudHJhbnNwb3J0LmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJUcuG6p24gVGjhu4sgTGluaCAoTG9naXN0aWNzIE1hbmFnZXIpIiwiaHR0cDovL3NjaEMtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiTE9HSVNUSUNTX01BTkFHRVIiLCJyb2xlIjoiTE9HSVNUSUNTX01BTkFHRVIiLCJqdGkiOiI5MjhmZDJmNy1iOGQxLTRkM2EtODM0Yi01YTFiYTYzNWI5NDkiLCJleHAiOjE3OTM4Njk4ODAsImlzcyI6IlJhY2VIb3JzZVRyYW5zcG9ydEJhY2tlbmQiLCJhdWQiOiJSYWNlSG9yc2VUcmFuc3BvcnRGcm9udGVuZCJ9.8GLgrPcfPZ3kGtGzWAcRB0cJ7AwdJmflk2JaVHfngOg
```

### Điều phối viên (FLEET_ROUTE_COORDINATOR) - Dùng cho các API F5-J06, J07, J10, J13-J16, J18, J20, J23, J24, J26-J28, J43:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSXzAwNiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiVVNFUl8wMDYiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJoYWkuY29vcmRAY2JudHJhbnNwb3J0LmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJQaOG6oW0gSOG6o2kgKMSQaeG7gXUgcGjhu5FpIHhlICYgdHV54bq_bikiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJGTEVFVF9ST1VURV9DT09SRElOQVRPUiIsInJvbGUiOiJGTEVFVF9ST1VURV9DT09SRElOQVRPUiIsImp0aSI6IjY3MWYxMGQ3LTA2Y2QtNDJiMy1iZmY1LTVmNmUwOGRlZmM2NSIsImV4cCI6MTc5Mzg2OTg4MCwiaXNzIjoiUmFjZUhvcnNlVHJhbnNwb3J0QmFja2VuZCIsImF1ZCI6IlJhY2VIb3JzZVRyYW5zcG9ydEZyb250ZW5kIn0.SegFj_AaUhqU5iLbEuLeW9ggvM-H9nqvae19m3H_KNU
```

### Tài xế / Bác sĩ thú y (DRIVER_ESCORT) - Dùng cho các API F5-J03, J22, J34:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSXzAwNyIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiVVNFUl8wMDciLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJodW5nLmRyaXZlckBjYm50cmFuc3BvcnQuY29tIiwiaHR0cDovL3NjaEMtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiSG/DoG5nIEjDuW5nIChUw6BpIHjhur8gcXXhu5FjIHThur8gMSkiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJEUklWRVJfRVNDT1JUIiwicm9sZSI6IkRSSVZFUl9FU0NPUlQiLCJqdGkiOiI1MDdkOTNjOC0xZDI2LTQzZDEtYWVmMS01ZDgzOTg0OGYzOWIiLCJleHAiOjE3OTM4Njk4ODAsImlzcyI6IlJhY2VIb3JzZVRyYW5zcG9ydEJhY2tlbmQiLCJhdWQiOiJSYWNlSG9yc2VUcmFuc3BvcnRGcm9udGVuZCJ9.sF0H0b64gc91xSFc5A4cRnr3sLdZMoPjHtTfvT5QWd8
```

### Chuyên viên pháp lý (TRANSPORT_SPECIALIST) - Dùng cho API F5-J21:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSXzAwNSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiVVNFUl8wMDUiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJ0dWFuLnNwZWNpYWxpc3RAY2JudHJhbnNwb3J0LmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJMw6ogVHXhuqVuIChUaOG6qW0gxJHhu4tuaCBwaMOhcCBsw70vdGjDuiB5KSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlRSQU5TUE9SVF9TUEVDSUFMSVNUIiwicm9sZSI6IlRSQU5TUE9SVF9TUEVDSUFMSVNUIiwianRpIjoiNDI4ZGYwMmQtMjdmZi00ZmU1LTgzOWQtYzYwNjJlOWY0NjJkIiwiZXhwIjoxNzkzODY5ODgwLCJpc3MiOiJSYWNlSG9yc2VUcmFuc3BvcnRCYWNrZW5kIiwiYXVkIjoiUmFjZUhvcnNlVHJhbnNwb3J0RnJvbnRlbmQifQ.aCsQsXXohhi10nGgkfQ-ZptDJqpW34G_q5rfvDiZfgc
```

### Khách hàng (CUSTOMER) - Dùng cho các API F5-J29, J30, J32, J36, J38, J41:
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU0VSXzAwMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiVVNFUl8wMDEiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJ2YW5hLmhvcnNlQGdtYWlsLmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJOZ3V54buFbiBWxINuIEEgKENMQiBIw6AgTuG7mWkpIiwiaHR0cDovL3NjaEMtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiQ1VTVE9NRVIiLCJyb2xlIjoiQ1VTVE9NRVIiLCJqdGkiOiJhMTk1NzMwZi1lNmY0LTQ3ZmQtODU4Ni1kMDc5ZDE0NDhmODUiLCJleHAiOjE3OTM4Njk4ODAsImlzcyI6IlJhY2VIb3JzZVRyYW5zcG9ydEJhY2tlbmQiLCJhdWQiOiJSYWNlSG9yc2VUcmFuc3BvcnRGcm9udGVuZCJ9.0T0UCTL1pRihe5M6_ZQ4GrHmiDgI_qdWdUALtR_9Njg
```

---

## 2. CHI TIẾT DỮ LIỆU TEST TỪNG API (F5-J01 ĐẾN F5-J43)

### F5-J01: Năng lực xử lý sự cố (Capabilities)
* **Method:** `GET`
* **URL:** `/api/master/flow5-capabilities`
* **Quyền:** Mọi tài khoản đăng nhập
* **Body:** Không có. Bấm **Execute**.
* **Kết quả:** Status 200 OK trả về danh sách danh mục sự cố, loại giải pháp và vai trò xử lý.

---

### F5-J02: Lấy danh sách sự cố
* **Method:** `GET`
* **URL:** `/api/incidents`
* **Quyền:** Mọi tài khoản nội bộ
* **Query Parameters:** Để trống hoặc nhập `status = REPORTED`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J03: Báo cáo sự cố khẩn cấp
* **Method:** `POST`
* **URL:** `/api/incidents`
* **Quyền:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER
* **Request Body:**
```json
{
  "tripId": "TRIP_20261104_001",
  "category": "VEHICLE_BREAKDOWN",
  "description": "Xe bị nổ lốp tại cao tốc Long Thành - Dầu Giây, cần xe dự phòng",
  "immediateCare": "Đã hạ nhiệt cho ngựa, đưa vào lề an toàn",
  "locationCoordinates": "10.7769,106.7009",
  "imageUrl": "https://racehorse.blob.core.windows.net/incidents/breakdown.jpg"
}
```

---

### F5-J04: Chi tiết sự cố
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J05: Danh sách sự cố theo chuyến đi
* **Method:** `GET`
* **URL:** `/api/trips/{tripId}/incidents`
* **Path Parameter:** `tripId` = `TRIP_20261104_001`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J06: Điều phối viên tiếp nhận sự cố
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/accept`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J07: Đánh giá 8 vùng ảnh hưởng của sự cố
* **Method:** `PUT`
* **URL:** `/api/coordinator/incidents/{incidentId}/impact-assessment`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "affectedVehicle": true,
  "affectedSchedule": true,
  "affectedFlight": false,
  "affectedPaperwork": false,
  "affectedInsurance": false,
  "affectedHorseHealth": false,
  "affectedDeadlines": true,
  "estimatedExtraCost": 2500000,
  "summary": "Cần thay thế xe cứu hộ, trễ lịch trình dự kiến 2 tiếng"
}
```

---

### F5-J08: Ghi nhận diễn biến hiện trường / sơ cứu khẩn
* **Method:** `POST`
* **URL:** `/api/incidents/{incidentId}/updates`
* **Quyền:** Mọi tài khoản nội bộ
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "updateType": "FIELD_LOG",
  "notes": "Đội cứu hộ giao thông đã tiếp cận hiện trường lúc 16:15",
  "immediateCare": "Đã cho ngựa uống nước điện giải",
  "imageUrl": "https://racehorse.blob.core.windows.net/incidents/rescue_arrived.jpg",
  "locationCoordinates": "10.7769,106.7009"
}
```

---

### F5-J09: Đọc nhật ký diễn biến sự cố
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/updates`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J10: Điều phối giao việc khắc phục song song
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/tasks`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "title": "Kiểm tra kỹ thuật xe cứu hộ số 51B-987.65",
  "taskType": "TECHNICAL_REPAIR",
  "assignedToUserId": "USR_DRIVER_02",
  "priority": "HIGH",
  "notes": "Kiểm tra hệ thống điều hòa và sàn chống trượt trước khi đón ngựa",
  "dueAt": "2026-11-04T18:00:00Z"
}
```

---

### F5-J11: Danh sách công việc khắc phục
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/tasks`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J12: Cập nhật tiến độ hoàn thành công việc
* **Method:** `POST`
* **URL:** `/api/incidents/{incidentId}/tasks/{taskId}/progress`
* **Quyền:** Người được giao việc / Coordinator
* **Path Parameters:** `incidentId` = `INC_TEST_01`, `taskId` = `TSK_01`
* **Request Body:**
```json
{
  "status": "COMPLETED",
  "notes": "Xe dự phòng đã kiểm tra đầy đủ, đạt tiêu chuẩn an toàn",
  "completionProofUrl": "https://racehorse.blob.core.windows.net/incidents/vehicle_ready.jpg"
}
```

---

### F5-J13: Đọc dữ liệu phụ thuộc để lập phương án (Recovery Context)
* **Method:** `GET`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery-context`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J14: Lưu nháp phương án khôi phục
* **Method:** `PUT`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery-draft`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "planType": "REPLACE_VEHICLE",
  "summary": "Điều xe dự phòng 51B-987.65 từ trạm Bình Dương sang đón ngựa",
  "newVehicleId": "VEH_RESERVE_01",
  "newDriverUserId": "USR_DRIVER_02",
  "newRouteSummary": "Cao tốc Long Thành -> Sân bay Tân Sơn Nhất",
  "estimatedDelayHours": 1.5,
  "costEstimate": 3500000
}
```

---

### F5-J15: Kiểm tra tính hợp lệ của phương án (Validate)
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery/validate`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:** (dán nội dung giống F5-J14).

---

### F5-J16: Gửi phương án trình Quản lý phê duyệt
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery/submit`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "planType": "REPLACE_VEHICLE",
  "summary": "Trình phương án thay xe 51B-987.65 để kịp chuyến bay VN123",
  "newVehicleId": "VEH_RESERVE_01",
  "newDriverUserId": "USR_DRIVER_02",
  "estimatedDelayHours": 1.5,
  "costEstimate": 3500000
}
```

---

### F5-J17: Quản lý phê duyệt hoặc trả lại phương án
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/recovery/decision`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "decision": "APPROVED",
  "reason": "Phương án hợp lý, chi phí trong hạn mức sự cố",
  "managerNotes": "Đã duyệt. Yêu cầu báo cáo ngay sau khi sang xe xong"
}
```

---

### F5-J18: Mở bản sửa đổi phương án khôi phục
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery/revisions`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "revisionNotes": "Điều chỉnh tăng thời gian chuẩn bị tại trạm trung chuyển thêm 30 phút"
}
```

---

### F5-J19: Xem lịch sử quyết định & áp dụng
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/history`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J20: Tìm xe và tài xế thay thế phù hợp
* **Method:** `GET`
* **URL:** `/api/coordinator/incidents/{incidentId}/resource-options`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J21: Rà soát pháp lý / kiểm dịch / bảo hiểm
* **Method:** `POST`
* **URL:** `/api/specialist/incidents/{incidentId}/compliance-reviews`
* **Quyền:** TRANSPORT_SPECIALIST
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "status": "VALID",
  "findings": "Giấy phép kiểm dịch số KD_2026_09 vẫn còn hiệu lực 48 giờ",
  "requiresPermitReissue": false,
  "notes": "Hồ sơ bảo hiểm đã ghi nhận thông báo sự cố"
}
```

---

### F5-J22: Khám sức khỏe thú y (Vet Assessment)
* **Method:** `POST`
* **URL:** `/api/driver/incidents/{incidentId}/vet-assessments`
* **Quyền:** DRIVER_ESCORT (Bác sĩ thú y)
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "fitnessStatus": "FIT",
  "assessmentNotes": "Ngựa đua thể trạng tốt, không bị chấn thương hay hoảng loạn",
  "temperature": 38.2,
  "heartRate": 42,
  "recommendation": "Đủ điều kiện tiếp tục hành trình ngay",
  "reportUrl": "https://racehorse.blob.core.windows.net/incidents/vet_report.pdf"
}
```

---

### F5-J23: Ghi nhận xác nhận đối tác ngoài (xe cứu hộ / chuyến bay)
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/external-actions`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "actionType": "RESCUE_TOWING",
  "partnerName": "Công ty Cứu hộ Giao thông 118",
  "referenceCode": "CH_20261104_88",
  "confirmedCost": 1800000,
  "notes": "Đã điều xe kéo xe hỏng về garage"
}
```

---

### F5-J24: Áp dụng phương án khôi phục vào thực tế
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery/apply`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J25: Kiểm tra điều kiện gỡ SafetyBlocker
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/continuation-readiness`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J26: Cho phép xe tiếp tục hành trình (Gỡ Blocker)
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/continue`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "clearedSafetyBlocker": true,
  "notes": "Đã hoàn tất sang xe và bác sĩ thú y kết luận ngựa đủ điều kiện đi tiếp"
}
```

---

### F5-J27: Đóng sự cố (Resolved)
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/resolve`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "resolutionType": "RESOLVED_REPLACED_VEHICLE",
  "notes": "Đã đổi sang xe dự phòng thành công, xe tiếp tục di chuyển về sân bay",
  "finalCost": 3200000
}
```

---

### F5-J28: Mở lại sự cố
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/reopen`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "reopenReason": "Phát sinh kiểm tra đột xuất tại trạm kiểm dịch liên tỉnh"
}
```

---

### F5-J29: Khách hàng xem danh sách sự cố
* **Method:** `GET`
* **URL:** `/api/customer/requests/{requestId}/incidents`
* **Quyền:** CUSTOMER
* **Path Parameter:** `requestId` = `REQ_20261104_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J30: Khách hàng xem chi tiết thông báo sự cố
* **Method:** `GET`
* **URL:** `/api/customer/requests/{requestId}/incidents/{incidentId}`
* **Quyền:** CUSTOMER
* **Path Parameters:** `requestId` = `REQ_20261104_01`, `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J31: Quản lý gửi thông báo thỏa thuận cho khách
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/communications`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "title": "Thông báo điều chỉnh giờ giao ngựa tại Sân bay",
  "content": "Do sự cố nổ lốp đã được xử lý sang xe dự phòng, giờ giao dự kiến dời sang 20:30",
  "requiresCustomerApproval": true,
  "proposedNewEta": "2026-11-04T20:30:00Z",
  "proposedCostAdjustment": 0
}
```

---

### F5-J32: Khách hàng phản hồi thỏa thuận (Đồng ý / Từ chối)
* **Method:** `POST`
* **URL:** `/api/customer/requests/{requestId}/incidents/{incidentId}/communications/{messageId}/reply`
* **Quyền:** CUSTOMER
* **Path Parameters:** `requestId` = `REQ_01`, `incidentId` = `INC_TEST_01`, `messageId` = `MSG_01`
* **Request Body:**
```json
{
  "approved": true,
  "customerNotes": "Tôi đồng ý với mốc giờ giao mới này"
}
```

---

### F5-J33: Ghi nhận thỏa thuận ngoài hệ thống
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/customer-agreements/external`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "contactChannel": "PHONE",
  "agreedSummary": "Đã gọi điện cho chủ ngựa qua số 0901234567, khách xác nhận đồng ý",
  "evidenceUrl": "https://racehorse.blob.core.windows.net/incidents/call_recording.mp3",
  "agreedAt": "2026-11-04T16:30:00Z"
}
```

---

### F5-J34: Tải lên tài liệu / file bằng chứng sự cố
* **Method:** `POST`
* **URL:** `/api/trips/{tripId}/incident-files`
* **Quyền:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `tripId` = `TRIP_20261104_001`
* **Request Body:**
```json
{
  "fileName": "anh_hien_truong.jpg",
  "fileUrl": "https://racehorse.blob.core.windows.net/incidents/anh_hien_truong.jpg",
  "fileType": "SCENE_PHOTO",
  "description": "Ảnh chụp xe hỏng lốp bên lề cao tốc"
}
```

---

### F5-J35: Tải hoặc xem file bằng chứng (Nội bộ)
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/files/{fileId}`
* **Path Parameters:** `incidentId` = `INC_TEST_01`, `fileId` = `FIL_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J36: Khách hàng tải file được chia sẻ
* **Method:** `GET`
* **URL:** `/api/customer/requests/{requestId}/incidents/{incidentId}/files/{fileId}`
* **Quyền:** CUSTOMER
* **Path Parameters:** `requestId` = `REQ_01`, `incidentId` = `INC_TEST_01`, `fileId` = `FIL_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J37: Quản lý đề xuất dừng chuyến sớm (Termination Proposal)
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/termination-proposals`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Request Body:**
```json
{
  "reason": "Hãng hàng không hủy toàn bộ các chuyến bay vận tải động vật do bão lớn",
  "proposedAction": "CANCEL_AND_RETURN",
  "horseCareArrangement": "Chuyển ngựa về chuồng trạm nghỉ Bình Dương để theo dõi chăm sóc",
  "estimatedRefundOrFee": 15000000
}
```

---

### F5-J38: Khách phản hồi đề xuất dừng chuyến sớm
* **Method:** `POST`
* **URL:** `/api/customer/requests/{requestId}/incidents/{incidentId}/termination-proposals/{proposalId}/reply`
* **Quyền:** CUSTOMER
* **Path Parameters:** `requestId` = `REQ_01`, `incidentId` = `INC_TEST_01`, `proposalId` = `TRM_01`
* **Request Body:**
```json
{
  "accepted": true,
  "customerNotes": "Đồng ý hủy chuyến do bão bất khả kháng, đề nghị chuyển ngựa về trang trại an toàn"
}
```

---

### F5-J39: Chuyển giao hồ sơ hủy chuyến sang bộ phận nghĩa vụ
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/termination-proposals/{proposalId}/refer`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameters:** `incidentId` = `INC_TEST_01`, `proposalId` = `TRM_01`
* **Request Body:**
```json
{
  "referralDepartment": "LEGAL_INSURANCE",
  "handoffNotes": "Chuyển phòng pháp lý và bảo hiểm làm thủ tục bồi hoàn theo điều khoản bất khả kháng"
}
```

---

### F5-J40: Đọc lịch sử đề xuất kết thúc sự cố
* **Method:** `GET`
* **URL:** `/api/incidents/{incidentId}/termination-proposals`
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J41: Khách hàng xem các đề xuất kết thúc cần phản hồi
* **Method:** `GET`
* **URL:** `/api/customer/requests/{requestId}/incidents/{incidentId}/termination-proposals`
* **Quyền:** CUSTOMER
* **Path Parameters:** `requestId` = `REQ_01`, `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

---

### F5-J42: Quản lý cấp quyền chia sẻ file cho khách hàng
* **Method:** `POST`
* **URL:** `/api/manager/incidents/{incidentId}/files/{fileId}/share`
* **Quyền:** LOGISTICS_MANAGER
* **Path Parameters:** `incidentId` = `INC_TEST_01`, `fileId` = `FIL_01`
* **Request Body:**
```json
{
  "isSharedWithCustomer": true,
  "displayName": "Bien_ban_kham_suc_khoe_ngua_sau_su_co.pdf"
}
```

---

### F5-J43: Điều phối viên rút lại phương án đang chờ duyệt
* **Method:** `POST`
* **URL:** `/api/coordinator/incidents/{incidentId}/recovery/withdraw`
* **Quyền:** FLEET_ROUTE_COORDINATOR
* **Path Parameter:** `incidentId` = `INC_TEST_01`
* **Body:** Không có. Bấm **Execute**.

