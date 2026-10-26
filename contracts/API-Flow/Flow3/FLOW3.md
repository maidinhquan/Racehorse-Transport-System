# API Contract — Flow 3

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 — hợp đồng đích theo SRS và Reviewed |
| Ngày | 24/10/2026 |
| Phạm vi | Lập phương án, nguồn lực, booking, phê duyệt hai mốc |
| Trạng thái | Chưa chứng nhận backend/frontend đã triển khai; từng API ghi dependency |
| Căn cứ | [SRS](../../../data/SE2040_Group2_ASM2%20(1).docx), [SQL Reviewed](../../../data/HorseTransportDB_Reviewed.sql), [NAME](../../../data/DATABASE_STATUS_CONVENTION.md), [ID](../../../data/ID_NAME_RULE_Reviewed.md), [Flow 1](../Flow1/FLOW1.md), [Convention nền](../../CONVENTIONS.md) |

File tự chứa luồng, quyền, DTO, request/response thành công/lỗi, mapping SQL và kiểm tra bàn giao; theo mẫu FLOW1.md. Các API và trường chưa có persistence được đánh dấu rõ, không coi ví dụ là dữ liệu đã tồn tại. Chỉ tạo hai file Markdown trong lần này, không tạo OpenAPI riêng.

## 1. Luồng chính thức

Flow 1 bàn giao Trip PLANNING/Request ACTIVATED, hợp đồng EFFECTIVE/bản SIGNED/cọc đủ và Manager giao Specialist/Coordinator. Coordinator lập route/lịch/phân công nháp → phối hợp Specialist feasibility → gửi duyệt, kiểm conflict và giữ lịch tạm → Manager Gate 1 → duyệt thì assignments CONFIRMED, Request SCHEDULED → xác nhận AIR booking sau Gate 1 → Specialist Documents READY + Coordinator Operations READY → Manager Gate 2 → Trip READY_TO_DEPART → Flow 4 xác nhận xuất phát thực tế mới Trip IN_TRANSIT/Request IN_PROGRESS.

Main-flow 03 là khung; BR-21–28 bổ sung hai mốc duyệt. Không hiểu duyệt phương án là quyền tự xuất phát. Mỗi ROAD có ba người độc lập; AIR gồm ROAD_ORIGIN → AIR → ROAD_DESTINATION, hai ROAD phân công riêng; đối tác AIR chăm sóc trọn gói, không bắt buộc Vet CBN bay cùng.

| Màn hình SRS | API |
|---|---|
| Dashboard/Planning | J01–03 |
| Route/Stops/Crew/Fleet | J04–09 |
| Flight catalog/proposal | J10–11 |
| Validate/Submit/Withdraw/Gate 1 | J12–17 |
| Booking/Change proposal | J18–20 |
| Operations READY/Gate 2 | J21–25 |
| Execution package | J26 |

Trip state khác plan state và reservation state. Draft không giữ lịch; submit mới HELD; rút/trả RELEASED; duyệt CONFIRMED. Không ghi PENDING_APPROVAL/PLAN_APPROVED/RETURNED vào Trip.Status. Gate 1 mất hiệu lực trước khởi hành: Request SCHEDULED → ACTIVATED; nếu chỉ Gate 2 thu hồi mà Gate 1 còn đúng, Request giữ SCHEDULED. Sau xuất phát, thay đổi qua phối hợp Flow 5, không quay Trip về PLANNING.

Thay đổi đã duyệt: change-proposals tạo draft kế tiếp (ví dụ v2); chỉnh/validate/submit/decision dùng lại J07–17 với expectedPlanVersionNo của bản mới. GET plan có thể nhận query planVersionNo để đọc bản cụ thể, mặc định bản đang làm việc; Manager phải đọc đúng bản submitted. Gate 1 của bản mới không tự ghi đè bản hiện hành trước khi duyệt; khi duyệt mới thay bản hiện hành và thay reservations trong transaction, nhả đúng phần lịch cũ không còn dùng. Booking cũ cần xử lý supersession/cancel theo đối tác trước booking mới; nếu chưa có workflow này thì 501.


## 2. Quy ước chung

### 2.1 Base URL và quyền

Base URL /api. Mọi path dưới đây nằm sau /api. Header JSON: Authorization: Bearer <token>, Accept: application/json, Content-Type: application/json. Upload dùng FormData, không tự đặt boundary. GET và command ghi không body phải không gửi body.

Customer chỉ xem/sửa tài nguyên thuộc mình. Specialist phải đúng TRIP_PLAN.AssignedSpecialistId; Coordinator phải đúng AssignedCoordinatorId. Manager role LOGISTICS_MANAGER, hàng đợi chung, không AssignedManagerId/claim. Sai role 403; ngoài scope/không tồn tại 404. Actor/owner/time lấy từ JWT/server, không tin client. ADMIN không tự được làm quyết định nghiệp vụ nếu chưa có policy.

Mutation chuẩn bị mới yêu cầu DeploymentStatus CONFIRMED; ON_HOLD khóa ghi triển khai mới nhưng vẫn cho đọc đúng quyền. Trong chuyến IN_TRANSIT, Specialist còn nhiệm vụ thủ tục thực tế; không dùng hold trước khởi hành để quay Trip về PLANNING. File/download cũng kiểm quyền, biết ID không có nghĩa được xem.

### 2.2 Envelope, HTTP và nullable

```json
{"success":true,"message":"OK","data":{}}
```

```json
{"success":false,"message":"Dữ liệu không hợp lệ","errorCode":"VALIDATION_ERROR","data":null,"errors":{"field":["Lý do"]}}
```

200 đọc/cập nhật; 201 tạo; 400 validation; 401 chưa đăng nhập; 403 sai role; 404 ngoài scope; 409 sai state/stale version/conflict; 429 rate limit; 500 lỗi server; 501 FEATURE_NOT_SUPPORTED khi thiếu capability/persistence. Lỗi có data:null; errors optional khi có lỗi field. Lists trả data:[] theo Flow 1, không đổi sang wrapper phân trang. Query filter optional trừ khi endpoint ghi khác; path params bắt buộc. Không trả mock khi GET rỗng hoặc server lỗi.

Field optional chưa có được bỏ; field explicit nullable trả null. Arrays luôn là arrays. Null readiness/insurance khi thiếu dependency không có nghĩa đã đạt. blockers:[] chỉ dùng khi đã kiểm và không có blocker, không dùng để che chưa kiểm. Binary PDF/ảnh trả HTTP đúng MIME, lỗi vẫn envelope JSON, không envelope binary thành công.

### 2.3 ID, tiền, thời gian, file

ID backend theo ID_NAME_RULE_Reviewed: USER_*, HORSE_*, REQUEST_*, TRIP_*, CONTRACT_*. Hồ sơ LEGAL_MEDICAL_RECORD_*, booking QUARANTINE_BOOKING_*, clearance CUSTOMS_CLEARANCE_*, route ROUTE_SEGMENT_*, assignment TRIP_ASSIGNMENT_* do Sequence cấp, không COUNT/MAX+1. FlightBookingID là INT IDENTITY, không FLIGHT_BOOKING_001. planVersionNo/expectedPlanVersionNo là phiên bản nghiệp vụ đích >=1, cần schema, không RowVersion và không tự bằng RouteVersionID INT của booking.

Tiền VND nguyên đồng; giữ giá hợp đồng ký, không tự tính lại từ rate mới. Date YYYY-MM-DD. Timestamp DTO theo Flow 1: YYYY-MM-DD HH:mm, chuẩn hóa Asia/Ho_Chi_Minh; DB UTC. Lịch sân bay theo timezone nguồn phải chuyển đúng trước so sánh, không gắn Z vào giờ địa phương. Ví dụ là dữ liệu minh họa, không phản ánh giờ hiện tại.

PDF/JPG/JPEG/PNG <=10 MiB; server kiểm MIME/nội dung/quyền. FileRef gồm name/url endpoint có quyền, không private storage key/đường dẫn ổ đĩa. URL bằng chứng trong body phải resolve tới tệp đã upload đúng scope; không fetch URL tùy ý. Catalog mã mới trong ví dụ phải được chốt trước implement, không coi mọi giấy tờ là bắt buộc cho mọi tuyến.

### 2.4 Version, retry và persistence

Mutations chỉ nhận fields mô tả, reject mass assignment status/actor/owner/history/ready từ client. Kiểm scope/state/version trong transaction; expectedPlanVersionNo khác hiện hành trả 409 PLAN_VERSION_CONFLICT. Retry không tạo trùng record/booking/giữ lịch hoặc gửi notification lặp. Nếu dùng Idempotency-Key cần persistence bền vững theo actor/resource/action, không chỉ FE disable nút.

Persistence BASE nghĩa có bảng/cột nền, không khẳng định endpoint đã implement. CẦN BỔ SUNG nghĩa ví dụ 200/201 chỉ là shape đích sau khi có schema/capability; hiện thiếu thì trả 501/data:null. Không dùng Notification JSON/localStorage/memory để giả lưu đủ thông tin hoặc giả READY. Endpoint BASE vẫn cần quyền, validation, transaction và backend thật.

### 2.5 Nguồn ưu tiên

SRS quyết định hành vi; SQL Reviewed quyết định cột có thật; NAME/ID Reviewed quyết định mã. CONVENTIONS.md là nền Flow 1; các link D:/Shared, enum Request IN_TRANSIT và giới hạn hold cũ trong đó không ghi đè rule mới: Request IN_PROGRESS, Trip IN_TRANSIT; SQL DeploymentStatus có ON_HOLD. Không sửa SQL/backend/FE trong lần viết contract này. Các quyết định mới của nhóm về khiếu nại/OTP bàn giao Flow 6 không mở rộng tùy tiện quyền sửa hợp đồng đã ký.

## 3. DTO và state machine

| Field | Kiểu / quy tắc |
|---|---|
| tripId/requestId/horseId | string ID chuẩn; kiểm liên kết, không chỉ tiền tố |
| tripStatus | PLANNING / READY_TO_DEPART / IN_TRANSIT / COMPLETED |
| requestStatus | ACTIVATED sau ký; SCHEDULED sau Gate 1; IN_PROGRESS lúc xuất phát |
| deploymentStatus | PENDING / CONFIRMED / ON_HOLD; null khi chưa ghi triển khai |
| planVersionNo/expectedPlanVersionNo | integer >=1, phiên bản nghiệp vụ đích; không field SQL đã có |
| plan.status | DRAFT / SUBMITTED / APPROVED / CHANGES_REQUESTED / WITHDRAWN, tách Trip.Status |
| documentStatus | PENDING_REVIEW / VERIFIED / REJECTED / EXPIRED; không APPROVED thay VERIFIED |
| requirementStatus | MANDATORY / OPTIONAL / NOT_APPLICABLE; null chưa phân loại, không tự đạt |
| readiness.status | NOT_READY / READY theo version; object null khi không có persistence |
| file | FileRef name/url có quyền; binary tải qua endpoint riêng |
| capabilities | boolean từng nhóm theo backend thật; false không dùng để giấu lỗi HTTP |
| issues/blockers | array code/message, scope/field nếu có; không coi chưa kiểm là [] |

## 4. API và payload

| Mã | Method/path | Mục đích |
|---|---|---|
| F3-J01 | `GET /coordinator/dashboard` | Dashboard điều phối |
| F3-J02 | `GET /coordinator/trips?status=PLANNING` | Trip được giao |
| F3-J03 | `GET /coordinator/trips/{tripId}/planning` | Chi tiết planning |
| F3-J04 | `GET /coordinator/facilities?tripId=TRIP_003` | Danh mục cơ sở phù hợp |
| F3-J05 | `GET /coordinator/vehicles/availability?tripId=TRIP_003&from=2026-11-05%2006:00&to=2026-11-05%2012:00` | Xe khả dụng theo khoảng thời gian |
| F3-J06 | `GET /coordinator/staff/availability?tripId=TRIP_003&countryCode=VN&duty=VET&from=2026-11-05%2006:00&to=2026-11-05%2012:00` | Nhân sự theo chặng/nhiệm vụ |
| F3-J07 | `GET /coordinator/trips/{tripId}/plan` | Đọc phương án nháp |
| F3-J08 | `PUT /coordinator/trips/{tripId}/plan` | Lưu nháp route/lịch |
| F3-J09 | `PUT /coordinator/trips/{tripId}/plan/road-assignments` | Lưu phân công nháp ROAD |
| F3-J10 | `GET /coordinator/flights?tripId=TRIP_003&directOnly=true` | Danh mục bay thẳng demo |
| F3-J11 | `PUT /coordinator/trips/{tripId}/plan/flight-proposal` | Chọn chuyến bay đề xuất |
| F3-J12 | `POST /coordinator/trips/{tripId}/plan/validate` | Validate trước gửi |
| F3-J13 | `POST /coordinator/trips/{tripId}/plan/submit` | Gửi duyệt Gate 1 |
| F3-J14 | `POST /coordinator/trips/{tripId}/plan/withdraw` | Rút phương án chờ duyệt |
| F3-J15 | `GET /manager/plans?status=SUBMITTED` | Manager queue Gate 1 |
| F3-J16 | `GET /manager/trips/{tripId}/plan` | Manager đọc bản được trình |
| F3-J17 | `POST /manager/trips/{tripId}/plan/decision` | Manager quyết định Gate 1 |
| F3-J18 | `POST /coordinator/trips/{tripId}/flight-booking/confirm` | Xác nhận booking AIR |
| F3-J19 | `GET /coordinator/trips/{tripId}/flight-booking` | Đọc booking Trip |
| F3-J20 | `POST /coordinator/trips/{tripId}/plan/change-proposals` | Đề xuất đổi bản đã duyệt |
| F3-J21 | `GET /coordinator/trips/{tripId}/operations-readiness` | Kiểm Operations readiness |
| F3-J22 | `POST /coordinator/trips/{tripId}/operations-readiness/confirm` | Xác nhận Operations READY |
| F3-J23 | `GET /manager/trips/{tripId}/departure-gate` | Manager kiểm Gate 2 |
| F3-J24 | `POST /manager/trips/{tripId}/departure-gate/approve` | Duyệt khởi hành Gate 2 |
| F3-J25 | `POST /manager/trips/{tripId}/departure-gate/revoke` | Thu hồi Gate 2 trước xuất phát |
| F3-J26 | `GET /coordinator/trips/{tripId}/execution-package` | Bàn giao dữ liệu cho vận hành |

### F3-J01 — GET /coordinator/dashboard

Dashboard điều phối. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** TRIP_PLAN.AssignedCoordinatorId/Status và Request.

**Side effect và retry:** Chỉ tổng hợp scope được giao.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "assignedTripCount": 2,
    "planningTripCount": 2
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F3-J02 — GET /coordinator/trips?status=PLANNING

Trip được giao. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** Trip/Request/Contract/version.

**Side effect và retry:** Hiển thị hold, không mutate triển khai khi ON_HOLD.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_003",
      "requestId": "REQUEST_003",
      "tripStatus": "PLANNING",
      "requestStatus": "ACTIVATED",
      "contractStatus": "EFFECTIVE",
      "versionStatus": "SIGNED",
      "deploymentStatus": "CONFIRMED",
      "assignedSpecialistId": "USER_005",
      "assignedCoordinatorId": "USER_006"
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F3-J03 — GET /coordinator/trips/{tripId}/planning

Chi tiết planning. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** ROUTE_SEGMENT/assignment/FLIGHT_BOOKING có nền.

**Side effect và retry:** Route seed không chứng minh là phương án đã duyệt; thiếu section null/capability=false.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "requestId": "REQUEST_003",
    "tripStatus": "PLANNING",
    "requestStatus": "ACTIVATED",
    "contractStatus": "EFFECTIVE",
    "versionStatus": "SIGNED",
    "deploymentStatus": "CONFIRMED",
    "assignedSpecialistId": "USER_005",
    "assignedCoordinatorId": "USER_006",
    "plan": null,
    "operationsReadiness": null,
    "capabilities": {
      "versionedPlanning": false,
      "resourceHolds": false
    }
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F3-J04 — GET /coordinator/facilities?tripId=TRIP_003

Danh mục cơ sở phù hợp. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** PARTNER_FACILITY/FACILITY_CONTRACT/FACILITY_CERTIFICATION.

**Side effect và retry:** Kiểm country, sức chứa, chứng nhận và hợp đồng tại ngày dùng; không hardcode địa danh.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "facilityId": "FACILITY_003",
      "countryCode": "VN",
      "status": "ACTIVE",
      "capacityStalls": 10
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F3-J05 — GET /coordinator/vehicles/availability?tripId=TRIP_003&from=2026-11-05%2006:00&to=2026-11-05%2012:00

Xe khả dụng theo khoảng thời gian. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. from/to bắt buộc, to>from.

**Dữ liệu SQL:** VEHICLE thuộc tính có, thiếu calendar/interval reservations.

**Side effect và retry:** Tra cứu không giữ lịch. AVAILABLE không đồng nghĩa không có reservation tương lai.

**Persistence:** CẦN BỔ SUNG — Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "vehicleId": "VEHICLE_001",
      "capacityStalls": 2,
      "status": "AVAILABLE",
      "available": true
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J06 — GET /coordinator/staff/availability?tripId=TRIP_003&countryCode=VN&duty=VET&from=2026-11-05%2006:00&to=2026-11-05%2012:00

Nhân sự theo chặng/nhiệm vụ. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Cần from/to khi tính available; quốc gia lấy từ chặng.

**Dữ liệu SQL:** USER/STAFF_DOCUMENT chưa đủ duty/qualification/calendar.

**Side effect và retry:** VET là duty đích, không tự thêm USER.Role=VET vào một client.

**Persistence:** CẦN BỔ SUNG — Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "userId": "USER_009",
      "duty": "VET",
      "available": true,
      "eligible": true
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J07 — GET /coordinator/trips/{tripId}/plan

Đọc phương án nháp. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** Chưa có plan aggregate/version/order liên kết route/crew.

**Side effect và retry:** Không gán plan.status vào Trip.Status.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "DRAFT",
    "segments": [],
    "assignments": [],
    "flightProposal": null
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J08 — PUT /coordinator/trips/{tripId}/plan

Lưu nháp route/lịch. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. sequence liên tục, lịch tăng hợp lý, location theo Trip/route.

**Dữ liệu SQL:** ROUTE_SEGMENT thiếu sequence/plan version và planned start/end.

**Side effect và retry:** Draft không giữ lịch; bản đã APPROVED không sửa đè. Nghỉ theo quy định/policy thực, không tự chốt 4 hay 6 giờ từ mô tả chung.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "segments": [
    {
      "sequence": 1,
      "segmentType": "REST_STOP",
      "transportMode": "ROAD",
      "locationName": "Điểm nghỉ theo tuyến",
      "expectedEta": "2026-11-05 10:00"
    },
    {
      "sequence": 2,
      "segmentType": "DESTINATION",
      "transportMode": "ROAD",
      "locationName": "Điểm giao theo Request",
      "expectedEta": "2026-11-05 18:00"
    }
  ]
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `segments` | array | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "DRAFT",
    "resourcesHeld": false
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "PLAN_VERSION_CONFLICT",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J09 — PUT /coordinator/trips/{tripId}/plan/road-assignments

Lưu phân công nháp ROAD. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Mỗi ROAD có ba USER độc lập; xe đủ stalls theo số ngựa thực; người/xe đủ điều kiện quốc gia và lịch.

**Dữ liệu SQL:** Không giả TRIP_VEHICLE_ASSIGNMENT hiện tại đủ ba người theo chặng.

**Side effect và retry:** Không giữ lịch draft; hai ROAD của AIR có assignment riêng; Vet CBN không bắt buộc bay cùng.

**Persistence:** CẦN BỔ SUNG — Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "assignments": [
    {
      "segmentSequence": 1,
      "vehicleId": "VEHICLE_001",
      "driverId": "USER_007",
      "escortId": "USER_009",
      "veterinarianId": "USER_010",
      "from": "2026-11-05 06:00",
      "to": "2026-11-05 12:00"
    }
  ]
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `assignments` | array | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "saved": true,
    "resourcesHeld": false
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "RESOURCE_NOT_ELIGIBLE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J10 — GET /coordinator/flights?tripId=TRIP_003&directOnly=true

Danh mục bay thẳng demo. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Chỉ Trip AIR.

**Dữ liệu SQL:** FLIGHT_BOOKING không phải catalog chuyến khả dụng.

**Side effect và retry:** Catalog demo cấu hình, không hãng thật; flightOptionKey là khóa nguồn, không FlightBookingID. Sân bay theo route, ví dụ không hardcode.

**Persistence:** CẦN BỔ SUNG — Cần demo catalog cấu hình/availability; không tái dùng một booking làm catalog. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "flightOptionKey": "DEMO-HAN-NRT-20261105",
      "airline": "Demo carrier",
      "flightNumber": "DEMO-102",
      "departureAirport": "HAN",
      "arrivalAirport": "NRT",
      "directFlight": true,
      "departureAt": "2026-11-05 12:00",
      "arrivalAt": "2026-11-05 18:00"
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "AIR_NOT_APPLICABLE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J11 — PUT /coordinator/trips/{tripId}/plan/flight-proposal

Chọn chuyến bay đề xuất. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. AIR có ROAD_ORIGIN → AIR → ROAD_DESTINATION, lịch ROAD phù hợp thời gian handoff/tiếp nhận.

**Dữ liệu SQL:** Cần flight proposal theo version và policy buffer.

**Side effect và retry:** Chỉ chọn, chưa booking. SQL BookingConfirmed DEFAULT 1 không cho phép confirm sớm; backend ghi rõ nếu có bản chưa confirm.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "flightOptionKey": "DEMO-HAN-NRT-20261105"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `flightOptionKey` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "flightSelected": true,
    "bookingConfirmed": false
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "FLIGHT_SCHEDULE_MISMATCH",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J12 — POST /coordinator/trips/{tripId}/plan/validate

Validate trước gửi. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** Versioned plan/resource và Flow 2 feasibility.

**Side effect và retry:** Chỉ kiểm, chưa submit/giữ lịch; feasibility phải đúng bản.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "valid": false,
    "issues": [
      {
        "code": "DOCUMENT_FEASIBILITY_REQUIRED",
        "field": "plan",
        "message": "Chưa có đánh giá khả thi hồ sơ"
      }
    ]
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "PLAN_VERSION_CONFLICT",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J13 — POST /coordinator/trips/{tripId}/plan/submit

Gửi duyệt Gate 1. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Đủ phương án, feasibility đạt và nguồn lực phù hợp; chưa bắt Documents READY.

**Dữ liệu SQL:** Không có plan status/version/interval holds trong Reviewed.

**Side effect và retry:** Trong transaction kiểm conflict rồi HELD và SUBMITTED. Lỗi rollback toàn bộ, notify Manager sau commit.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "tripStatus": "PLANNING",
    "planVersionNo": 1,
    "planStatus": "SUBMITTED",
    "resourceReservationStatus": "HELD"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "RESOURCE_CONFLICT",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J14 — POST /coordinator/trips/{tripId}/plan/withdraw

Rút phương án chờ duyệt. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Chỉ SUBMITTED và chưa có quyết định thắng trước.

**Dữ liệu SQL:** Chưa có transition/holds.

**Side effect và retry:** Giải phóng đúng hold của bản đó, giữ lịch sử. Muốn sửa thì draft; không giải phóng bản khác.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "reason": "Cần chỉnh lịch"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `reason` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planStatus": "WITHDRAWN",
    "resourceReservationStatus": "RELEASED"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "PLAN_ALREADY_DECIDED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J15 — GET /manager/plans?status=SUBMITTED

Manager queue Gate 1. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Manager đúng role, kế hoạch đã submit thật.

**Dữ liệu SQL:** Chưa có plan status/version.

**Side effect và retry:** Không dùng Trip.Status để suy SUBMITTED.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_003",
      "planVersionNo": 1,
      "planStatus": "SUBMITTED"
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J16 — GET /manager/trips/{tripId}/plan

Manager đọc bản được trình. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Đọc bản được trình bất biến, không draft đang sửa.

**Dữ liệu SQL:** Cần version snapshot/holds/feasibility.

**Side effect và retry:** Flight là proposal, không fake booking confirmed.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "SUBMITTED",
    "segments": [
      {
        "segmentId": "ROUTE_SEGMENT_008",
        "sequence": 1,
        "segmentType": "DESTINATION",
        "transportMode": "ROAD",
        "locationName": "Điểm giao theo Request",
        "expectedEta": "2026-11-05 18:00"
      }
    ],
    "assignments": [
      {
        "segmentSequence": 1,
        "vehicleId": "VEHICLE_001",
        "driverId": "USER_007",
        "escortId": "USER_009",
        "veterinarianId": "USER_010",
        "from": "2026-11-05 06:00",
        "to": "2026-11-05 18:00"
      }
    ],
    "documentFeasibility": {
      "feasible": true
    }
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J17 — POST /manager/trips/{tripId}/plan/decision

Manager quyết định Gate 1. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Chỉ SUBMITTED đúng version; hold còn hiệu lực, nguồn lực còn đủ; feasibility Specialist đạt. decision APPROVED hoặc CHANGES_REQUESTED.

**Dữ liệu SQL:** Cần approval/version/holds/actor/time/reason.

**Side effect và retry:** Duyệt xác nhận assignments và Request SCHEDULED; trả cần reason và nhả hold; Trip vẫn PLANNING. Hai quyết định đồng thời chỉ một thắng.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "decision": "APPROVED",
  "reason": "Phương án và tính khả thi hồ sơ đạt"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `decision` | string | Có |
| `reason` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "planStatus": "APPROVED",
    "tripStatus": "PLANNING",
    "requestStatus": "SCHEDULED",
    "resourceReservationStatus": "CONFIRMED"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "RESOURCE_CONFLICT",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J18 — POST /coordinator/trips/{tripId}/flight-booking/confirm

Xác nhận booking AIR. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Chỉ AIR, Gate 1 APPROVED hiện hành và flight proposal phù hợp.

**Dữ liệu SQL:** FLIGHT_BOOKING có nền, thiếu current/version binding/catalog/checkpoint/unique nghiệp vụ.

**Side effect và retry:** Demo sinh mã duy nhất, retry trả booking cũ, không gọi hãng thật. ROAD-only không tạo booking giả.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Cần idempotency, active booking và history supersession. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "flightBookingId": 301,
    "tripId": "TRIP_003",
    "bookingVersion": 1,
    "bookingReference": "DEMO-BOOKING-301",
    "bookingConfirmed": true
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "PLAN_NOT_APPROVED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J19 — GET /coordinator/trips/{tripId}/flight-booking

Đọc booking Trip. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng assignment Trip, chỉ trả booking đúng Trip.

**Dữ liệu SQL:** FLIGHT_BOOKING rows có; model active/replaced history chưa có.

**Side effect và retry:** Không suy active từ MAX ID. Endpoint trả một active booking cần dependency current; không tự chọn tùy ý nhiều bản.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "flightBookingId": 301,
    "tripId": "TRIP_003",
    "bookingVersion": 1,
    "bookingReference": "DEMO-BOOKING-301",
    "bookingConfirmed": true
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "BOOKING_NOT_FOUND",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J20 — POST /coordinator/trips/{tripId}/plan/change-proposals

Đề xuất đổi bản đã duyệt. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng assignment và bản APPROVED; nếu IN_TRANSIT phối hợp Flow 5, không reset Trip.

**Dữ liệu SQL:** Thiếu change/version/booking history.

**Side effect và retry:** Giữ bản1, bản2 chưa thành hiện hành; Flow 2 đánh giá impact, Manager duyệt đổi lịch đã duyệt/chi phí; xử lý booking cũ trước thay.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "reason": "Hãng báo đổi lịch",
  "changes": {
    "departureAt": "2026-11-06 12:00"
  }
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `reason` | string | Có |
| `changes` | object | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "proposedPlanVersionNo": 2,
    "currentApprovedPlanVersionNo": 1,
    "requiresApproval": true
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "PLAN_CHANGE_NOT_ALLOWED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J21 — GET /coordinator/trips/{tripId}/operations-readiness

Kiểm Operations readiness. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ.

**Dữ liệu SQL:** Plan/resources/active booking theo version.

**Side effect và retry:** Tách Documents READY, không thay bằng deployment CONFIRMED.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "NOT_READY",
    "blockers": [
      {
        "code": "RESOURCE_CONFIRMATION_REQUIRED",
        "message": "Chưa đủ xác nhận nguồn lực"
      }
    ]
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J22 — POST /coordinator/trips/{tripId}/operations-readiness/confirm

Xác nhận Operations READY. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng Coordinator được giao; mutation chuẩn bị cần deployment CONFIRMED, Trip PLANNING trừ guard nói rõ. Gate 1 approved, resources confirmed/còn khả dụng, AIR booking confirmed nếu áp dụng.

**Dữ liệu SQL:** Thiếu Operations readiness snapshot/version.

**Side effect và retry:** Ghi riêng actor/time/version; chưa đổi READY_TO_DEPART.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "READY",
    "confirmedBy": "USER_006"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "OPERATIONS_NOT_READY",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J23 — GET /manager/trips/{tripId}/departure-gate

Manager kiểm Gate 2. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Tính lại điều kiện thực từ bản hiện hành, đúng role.

**Dữ liệu SQL:** Hai readiness, plan approval, resources và booking hiện hành.

**Side effect và retry:** Chỉ true sau kiểm đầy đủ; không suy từ một status.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "tripStatus": "PLANNING",
    "documentsReadiness": "READY",
    "operationsReadiness": "READY",
    "canApprove": true,
    "blockers": []
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J24 — POST /manager/trips/{tripId}/departure-gate/approve

Duyệt khởi hành Gate 2. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Deployment CONFIRMED; plan APPROVED; hai readiness READY cùng version; nguồn lực, booking, giấy tờ/bảo hiểm còn hiệu lực.

**Dữ liệu SQL:** Trip.Status có, các dữ liệu chứng minh Gate 2 chưa có.

**Side effect và retry:** Lưu phê duyệt và đổi Trip trong transaction; thực tế start thuộc Flow 4.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "reason": "Đủ phương án, nguồn lực, hồ sơ và bảo hiểm"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `reason` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "tripStatus": "READY_TO_DEPART",
    "requestStatus": "SCHEDULED"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DEPARTURE_BLOCKED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J25 — POST /manager/trips/{tripId}/departure-gate/revoke

Thu hồi Gate 2 trước xuất phát. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Chỉ READY_TO_DEPART, chưa xuất phát.

**Dữ liệu SQL:** Cần revoke/gate metadata, không chỉ Status.

**Side effect và retry:** Giữ plan nếu không đổi; invalidate đúng phần; Request giữ SCHEDULED nếu Gate 1 còn hợp lệ.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "reason": "Nguồn lực mất khả dụng"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `reason` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "tripStatus": "PLANNING",
    "departureApproval": "REVOKED"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "TRIP_ALREADY_DEPARTED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```


### F3-J26 — GET /coordinator/trips/{tripId}/execution-package

Bàn giao dữ liệu cho vận hành. Role **FLEET_ROUTE_COORDINATOR**.

**Điều kiện:** Đúng assignment, Gate 2 còn hiệu lực.

**Dữ liệu SQL:** Cần execution snapshot đúng plan/readiness/gate.

**Side effect và retry:** Chỉ package thật; Flow 4 revalidate lúc start, không tự GPS/milestone/Trip completed.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Assignment hiện chỉ cấp Trip với Driver/Escort/Vehicle, thiếu segment/Vet/interval, giữ lịch/xác nhận/giải phóng và kiểm xung đột bền vững. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "tripStatus": "READY_TO_DEPART",
    "horseIds": [
      "HORSE_001"
    ],
    "segments": [
      {
        "segmentId": "ROUTE_SEGMENT_008",
        "sequence": 1,
        "segmentType": "DESTINATION",
        "transportMode": "ROAD",
        "locationName": "Điểm giao theo Request",
        "expectedEta": "2026-11-05 18:00"
      }
    ],
    "documentsReadiness": "READY",
    "operationsReadiness": "READY",
    "departureApproved": true,
    "assignments": [
      {
        "segmentSequence": 1,
        "vehicleId": "VEHICLE_001",
        "driverId": "USER_007",
        "escortId": "USER_009",
        "veterinarianId": "USER_010",
        "from": "2026-11-05 06:00",
        "to": "2026-11-05 18:00"
      }
    ]
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DEPARTURE_BLOCKED",
  "data": null
}
```

**Response lỗi 501 khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chưa đủ persistence/capability",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

## 5. Mapping database và dependency chưa có

| Nhóm | Có trong Reviewed | Thiếu |
|---|---|---|
| Route | ROUTE_SEGMENT location/type/mode/ETA/ActualTime/status | version, sequence, start/end, catalog airport/checkpoint và bản duyệt bất biến |
| Crew | TRIP_VEHICLE_ASSIGNMENT Trip/Vehicle/Driver/Escort | segment, Vet, interval, hold/confirm/release và concurrent conflict locks |
| Fleet | VEHICLE capacity/status, STAFF_DOCUMENT | calendar eligibility theo khoảng; không suy stalls từ chuỗi Type |
| Gate 1 | Trip/deployment không phải plan approval | plan version/submit/decision/actor/time/reason và feasibility reference |
| AIR | FLIGHT_BOOKING INT ID/BookingVersion/Confirmed/reference | flight catalog/proposal, current/superseded/cancel history, idempotency/version FK |
| Gate 2 | Trip có READY_TO_DEPART | Docs/Operations readiness riêng và departure approve/revoke cùng version |
| Change | Không có plan-change aggregate | bản đề xuất/hiện hành và impact/invalidation/lịch sử |

RouteVersionID/checkpoint INT trong FLIGHT_BOOKING chưa có catalog FK; không tự bịa prefix/đồng nhất planVersionNo với RouteVersionID. Không dùng Note/Notification JSON để giả dữ liệu nghiệp vụ. BookingConfirmed DEFAULT 1 không cấp quyền đặt bay trước Gate 1.

SRS cần Vet độc lập nhưng USER.Role hiện không có VET. veterinarianId là USER được xác minh nhiệm vụ chuyên môn; cần chốt task/qualification và quyền trước implement, không dùng ADMIN hoặc tạo role ở một client để né thiếu model. Không sửa SQL/backend trong lần tạo tài liệu này.

## 6. Checklist nghiệm thu và bàn giao

| Căn cứ | Nghiệm thu |
|---|---|
| BR-21 | Assignment, Gate 1, Gate 2 tách; Manager queue chung, không claim |
| BR-22 | Draft không hold, submit giữ tạm, trả/rút giải phóng, approve confirmed; transaction conflict chỉ một thắng |
| BR-23 | Thiếu Vet/trùng ba người/thiếu stalls/sai quốc gia/hết giấy/đụng lịch bị chặn |
| BR-24/26 | AIR có hai ROAD riêng và lịch nối phù hợp, không hardcode sân bay; ROAD không booking giả |
| BR-25/27 | Chọn không booking; confirm trước Gate 1 bị chặn; retry không trùng; thay booking giữ lịch sử |
| BR-28/56 | Thiếu một readiness, khác version, insurance hết hạn, ON_HOLD, nguồn lực mất khả dụng đều chặn Gate 2/start |
| BR-29–33/47 | Bàn giao bản hiện hành; ETA đề xuất khác ETA xác nhận; không GPS tự hoàn tất |

Test 404 khác assignment, 403 sai role, 409 stale version/conflict, 501 thiếu dependency; lỗi giữ draft và không fake success. Hold trước xuất phát giữ event/phân công, thu hồi Gate 2 khi cần; resume không tự READY_TO_DEPART. Thời gian handoff/buffer/nghỉ lấy từ rule/policy thực, không tự chốt hằng số chưa có cấu hình.

Flow 1 cung cấp owner/ngựa/cọc/hợp đồng/version và assignment. Flow 2 cung cấp feasibility rồi Documents READY/bảo hiểm theo version. Flow 3 cung cấp route/sequence/lịch, ba người từng ROAD, ngựa, booking nếu AIR, điểm kiểm soát và Gate 2 còn hiệu lực cho Flow 4. Flow 4 kiểm lại khi start, cập nhật actual; Flow 3 không tự bàn giao/hoàn tất Flow 6.

Worker đích cảnh báo nguồn lực mất khả dụng/hold/lịch hãng, invalidate điều kiện và notify. Không tự duyệt, đặt bay, khởi hành hoặc đặt TTL hold khi chưa chốt/lưu policy. Chưa có persistence thì API cần dependency trả 501; chưa có runtime/API/E2E được chứng minh bằng việc tạo tài liệu này.
