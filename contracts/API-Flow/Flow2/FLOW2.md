# API Contract — Flow 2

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 — hợp đồng đích theo SRS và Reviewed |
| Ngày | 24/10/2026 |
| Phạm vi | Hồ sơ, kiểm dịch, thông quan, bảo hiểm |
| Trạng thái | Chưa chứng nhận backend/frontend đã triển khai; từng API ghi dependency |
| Căn cứ | [SRS](../../../data/SE2040_Group2_ASM2%20(1).docx), [SQL Reviewed](../../../data/HorseTransportDB_Reviewed.sql), [NAME](../../../data/DATABASE_STATUS_CONVENTION.md), [ID](../../../data/ID_NAME_RULE_Reviewed.md), [Flow 1](../Flow1/FLOW1.md), [Convention nền](../../CONVENTIONS.md) |

File tự chứa luồng, quyền, DTO, request/response thành công/lỗi, mapping SQL và kiểm tra bàn giao; theo mẫu FLOW1.md. Các API và trường chưa có persistence được đánh dấu rõ, không coi ví dụ là dữ liệu đã tồn tại. Chỉ tạo hai file Markdown trong lần này, không tạo OpenAPI riêng.

## 1. Luồng chính thức

Flow 1: đủ cọc, ký OTP, Request ACTIVATED, Contract EFFECTIVE, version SIGNED, tạo Trip PLANNING; Manager giao Specialist/Coordinator và CONFIRMED triển khai. Specialist xác định checklist → reuse hồ sơ baseline → yêu cầu bổ sung → thẩm định → đánh giá khả thi theo lịch cho Gate 1 → chuẩn bị hồ sơ công ty/bảo hiểm → xác nhận Documents READY đúng bản đã duyệt → phối hợp Gate 2. Trong hành trình vẫn ghi kết quả kiểm dịch/thông quan thực và chặn phần tiếp nếu chưa đạt.

Main-flow 02 là khung; BR-48–62 là chi tiết. Mũi tên sang Flow 4 không bỏ qua Gate 2 ở Flow 3. Feasibility đạt chưa Documents READY; hồ sơ khách upload chưa VERIFIED; phí bảo hiểm chưa chứng minh đã mua. Specialist không tự hủy hợp đồng ký vì quá hạn giấy tờ. Flow 2 và 3 chuẩn bị song song.

| Màn hình SRS | API |
|---|---|
| Customer Documents/Upload | J04/J07 |
| Specialist Dashboard/Assigned Trips | J01–03 |
| Checklist/Review Queue/Detail | J05–11 |
| Document Requests/CBN/Insurance | J12–16 |
| Feasibility/Readiness | J14/J17–18 |
| Quarantine/Customs/Impact/Manager summary | J19–23; package J24–25; quy định/audit J26–27 |

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
| F2-J01 | `GET /specialist/dashboard` | Dashboard hồ sơ |
| F2-J02 | `GET /specialist/trips?status=PLANNING` | Danh sách Trip được giao |
| F2-J03 | `GET /specialist/trips/{tripId}/dossier` | Chi tiết hồ sơ Trip |
| F2-J04 | `GET /customer/trips/{tripId}/documents` | Customer xem hồ sơ |
| F2-J05 | `GET /specialist/trips/{tripId}/document-checklist` | Checklist áp dụng |
| F2-J06 | `GET /master/document-options?tripId=TRIP_003` | Catalog hồ sơ theo scope |
| F2-J07 | `POST /customer/trips/{tripId}/horses/{horseId}/documents` | Upload bổ sung |
| F2-J08 | `GET /specialist/document-reviews?status=PENDING_REVIEW` | Hàng đợi thẩm định |
| F2-J09 | `GET /specialist/document-reviews/{recordId}` | Chi tiết thẩm định |
| F2-J10 | `GET /specialist/document-reviews/{recordId}/file` | Tải file có quyền |
| F2-J11 | `POST /specialist/document-reviews/{recordId}/decision` | Thẩm định tài liệu |
| F2-J12 | `POST /specialist/trips/{tripId}/document-requests` | Tạo yêu cầu bổ sung |
| F2-J13 | `POST /specialist/trips/{tripId}/company-documents` | Upload hồ sơ công ty |
| F2-J14 | `POST /specialist/trips/{tripId}/document-feasibility` | Đánh giá khả thi hồ sơ |
| F2-J15 | `GET /specialist/trips/{tripId}/insurance` | Xem bảo hiểm |
| F2-J16 | `PUT /specialist/trips/{tripId}/insurance` | Ghi mua/xác minh bảo hiểm |
| F2-J17 | `GET /specialist/trips/{tripId}/documents-readiness` | Kiểm tra Documents readiness |
| F2-J18 | `POST /specialist/trips/{tripId}/documents-readiness/confirm` | Xác nhận Documents READY |
| F2-J19 | `POST /specialist/trips/{tripId}/quarantine-bookings` | Ghi nhận booking kiểm dịch |
| F2-J20 | `POST /specialist/quarantine-bookings/{bookingId}/result` | Ghi kết quả kiểm dịch |
| F2-J21 | `POST /specialist/trips/{tripId}/customs-clearances` | Ghi kết quả thông quan |
| F2-J22 | `POST /specialist/trips/{tripId}/document-impact-assessments` | Đánh giá ảnh hưởng thay đổi |
| F2-J23 | `GET /manager/trips/{tripId}/document-summary` | Manager xem tổng hợp hồ sơ |
| F2-J24 | `GET /specialist/trips/{tripId}/document-package` | Đọc bộ hồ sơ đi đường |
| F2-J25 | `POST /specialist/trips/{tripId}/document-package/export` | Tạo bộ hồ sơ xuất |
| F2-J26 | `GET /specialist/regulations?tripId=TRIP_003` | Tra cứu quy định |
| F2-J27 | `GET /specialist/trips/{tripId}/document-audit` | Tra cứu audit hồ sơ |

### F2-J01 — GET /specialist/dashboard

Dashboard hồ sơ. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** TRIP_PLAN/LMR theo assignment.

**Side effect và retry:** Đếm từ dữ liệu thực, không thay state khi mở trang.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "assignedTripCount": 2,
    "pendingReviewCount": 3
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


### F2-J02 — GET /specialist/trips?status=PLANNING

Danh sách Trip được giao. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** Trip join Request/Contract, filter AssignedSpecialistId.

**Side effect và retry:** Đọc được ON_HOLD đúng quyền, action ghi bị khóa.

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


### F2-J03 — GET /specialist/trips/{tripId}/dossier

Chi tiết hồ sơ Trip. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** LMR theo Request, ngựa từ REQUEST_HORSE_MAPPING.

**Side effect và retry:** Thiếu sections thì null/capability=false; không fake READY.

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
    "documents": [],
    "insurance": null,
    "documentsReadiness": null,
    "capabilities": {
      "insurance": false,
      "readiness": false
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


### F2-J04 — GET /customer/trips/{tripId}/documents

Customer xem hồ sơ. Role **CUSTOMER**.

**Điều kiện:** Customer JWT là owner của Request/Trip.

**Dữ liệu SQL:** LMR theo Request, reuse hồ sơ baseline Flow 1.

**Side effect và retry:** Ẩn ghi chú nội bộ, không quyền sửa hồ sơ công ty.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "recordId": "LEGAL_MEDICAL_RECORD_007",
      "horseId": "HORSE_001",
      "documentType": "COGGINS_TEST",
      "documentStatus": "PENDING_REVIEW",
      "expiryDate": "2026-11-30"
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


### F2-J05 — GET /specialist/trips/{tripId}/document-checklist

Checklist áp dụng. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** LMR chỉ đại diện record đã nộp, không đủ mục chưa nộp.

**Side effect và retry:** Sinh yêu cầu theo tuyến/mode/ngựa/điểm kiểm soát, không cố định mọi giấy cho mọi Trip. key là DTO key, không PK mới.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "items": [
      {
        "key": "HORSE_001:COGGINS_TEST:PRE_DEPARTURE",
        "horseId": "HORSE_001",
        "responsibleParty": "CUSTOMER",
        "scope": "HORSE",
        "phase": "PRE_DEPARTURE",
        "documentType": "COGGINS_TEST",
        "requirementStatus": "MANDATORY",
        "recordId": null,
        "satisfied": false
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
  "errorCode": "CHECKLIST_NOT_CONFIGURED",
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


### F2-J06 — GET /master/document-options?tripId=TRIP_003

Catalog hồ sơ theo scope. Role **USER đăng nhập đúng scope**.

**Điều kiện:** Đúng scope Customer/assignment nghiệp vụ.

**Dữ liệu SQL:** POLICY_AND_TERM là text; chưa có catalog rule có cấu trúc.

**Side effect và retry:** Ví dụ catalog không phải danh sách pháp lý đầy đủ; scope TRIP/SEGMENT/HORSE và responsibleParty CUSTOMER/COMPANY là DTO đích.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "documentTypes": [
      "COGGINS_TEST",
      "DOMESTIC_VET_PASS",
      "EQUINE_FLU_VAX"
    ],
    "requirementStatuses": [
      "MANDATORY",
      "OPTIONAL",
      "NOT_APPLICABLE"
    ],
    "phases": [
      "PRE_DEPARTURE",
      "AT_CONTROL",
      "AT_HANDOVER"
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


### F2-J07 — POST /customer/trips/{tripId}/horses/{horseId}/documents

Upload bổ sung. Role **CUSTOMER**.

**Điều kiện:** Ngựa thuộc Request của Customer, đang được phép bổ sung theo checklist/yêu cầu. Không nhận VerifiedBy/DocumentStatus từ client.

**Dữ liệu SQL:** LMR.HorseID/RequestID/DocumentType/UploadedFileUrl/ExpiryDate; thiếu lịch sử thay thế.

**Side effect và retry:** Upload không tự VERIFIED. Giữ bản cũ nếu thay thế, notify Specialist sau commit. Reuse handler F1-J17, không tạo hai record cho hai URL.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request multipart/form-data**

```json
{
  "documentType": "COGGINS_TEST",
  "expiryDate": "2026-11-30",
  "file": "<binary>"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `documentType` | string | Có |
| `expiryDate` | string | Có |
| `file` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 201** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "recordId": "LEGAL_MEDICAL_RECORD_007",
    "documentStatus": "PENDING_REVIEW"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DOCUMENT_UPDATE_NOT_ALLOWED",
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


### F2-J08 — GET /specialist/document-reviews?status=PENDING_REVIEW

Hàng đợi thẩm định. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** LMR join Trip qua RequestID và AssignedSpecialistId.

**Side effect và retry:** Không tự mở quyền duyệt mọi Request chưa được giao chỉ vì endpoint là queue.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "recordId": "LEGAL_MEDICAL_RECORD_007",
      "requestId": "REQUEST_003",
      "horseId": "HORSE_001",
      "documentStatus": "PENDING_REVIEW"
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


### F2-J09 — GET /specialist/document-reviews/{recordId}

Chi tiết thẩm định. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** LMR và HORSE identity.

**Side effect và retry:** Không có history thì bỏ optional history, không fake actor/time.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "recordId": "LEGAL_MEDICAL_RECORD_007",
    "documentType": "COGGINS_TEST",
    "documentStatus": "PENDING_REVIEW",
    "expiryDate": "2026-11-30",
    "file": {
      "name": "test.pdf",
      "url": "/api/specialist/document-reviews/LEGAL_MEDICAL_RECORD_007/file"
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


### F2-J10 — GET /specialist/document-reviews/{recordId}/file

Tải file có quyền. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** Resolve UploadedFileUrl từ record, kiểm scope rồi đọc storage.

**Side effect và retry:** Stream đúng MIME; tải không được không dùng blob/mock thay tệp backend.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200 — binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="document.pdf"

<bytes thật>
```

**Response lỗi 404**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "FILE_NOT_AVAILABLE",
  "data": null
}
```


### F2-J11 — POST /specialist/document-reviews/{recordId}/decision

Thẩm định tài liệu. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Chỉ bản hiện hành đang chờ xét; decision chỉ VERIFIED/REJECTED; từ chối bắt buộc reason.

**Dữ liệu SQL:** LMR.DocumentStatus/VerifiedBy có; reason/reviewedAt/version/history không có.

**Side effect và retry:** Kiểm giấy phù hợp ngựa/nước và hạn tại điểm dùng. Invalid readiness mục bị ảnh hưởng, không reset mọi hồ sơ.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request JSON**

```json
{
  "decision": "VERIFIED",
  "reason": "Đã đối chiếu đúng ngựa và hiệu lực",
  "expectedPlanVersionNo": 1
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `decision` | string | Có |
| `reason` | string | Có |
| `expectedPlanVersionNo` | integer | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "recordId": "LEGAL_MEDICAL_RECORD_007",
    "documentStatus": "VERIFIED",
    "verifiedBy": "USER_005",
    "reviewedAt": "2026-10-25 09:00"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DOCUMENT_NOT_VALID_FOR_USE",
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


### F2-J12 — POST /specialist/trips/{tripId}/document-requests

Tạo yêu cầu bổ sung. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** NOTIFICATION có message, không đủ để lưu lifecycle document request.

**Side effect và retry:** Lưu yêu cầu rồi notify; quá hạn không tự hủy hợp đồng ký hoặc tự hoàn tất Trip.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request JSON**

```json
{
  "horseIds": [
    "HORSE_001"
  ],
  "documentType": "COGGINS_TEST",
  "reason": "Bổ sung bản còn hạn tại thời điểm sử dụng",
  "dueAt": "2026-10-28 17:00"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `horseIds` | array | Có |
| `documentType` | string | Có |
| `reason` | string | Có |
| `dueAt` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 201** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "requested": true,
    "dueAt": "2026-10-28 17:00"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DEADLINE_NOT_FEASIBLE",
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


### F2-J13 — POST /specialist/trips/{tripId}/company-documents

Upload hồ sơ công ty. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. EXPORT_PERMIT là ví dụ catalog đích, chỉ dùng nếu rule thực sự áp dụng.

**Dữ liệu SQL:** Chưa có document model cấp Trip/Segment và owner company.

**Side effect và retry:** Customer không tự duyệt/chỉnh hồ sơ công ty. Không gán HorseID giả vào LMR NOT NULL.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request multipart/form-data**

```json
{
  "documentType": "EXPORT_PERMIT",
  "scope": "TRIP",
  "expiryDate": "2026-12-01",
  "file": "<binary>"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `documentType` | string | Có |
| `scope` | string | Có |
| `expiryDate` | string | Có |
| `file` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 201** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "scope": "TRIP",
    "recorded": true
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


### F2-J14 — POST /specialist/trips/{tripId}/document-feasibility

Đánh giá khả thi hồ sơ. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Đọc lịch đề xuất đúng bản.

**Dữ liệu SQL:** Chưa có feasibility theo version với actor/time/reason.

**Side effect và retry:** Feasible chỉ phục vụ Gate 1, không Documents READY; không thay quyền Manager.

**Persistence:** CẦN BỔ SUNG — Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "feasible": true,
  "note": "Có thể hoàn tất trước thời điểm sử dụng"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `feasible` | boolean | Có |
| `note` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "feasible": true,
    "documentsReadiness": "NOT_READY"
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


### F2-J15 — GET /specialist/trips/{tripId}/insurance

Xem bảo hiểm. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** COST_ITEM/COST_RATE chỉ chi phí.

**Side effect và retry:** Có phí trong hợp đồng chưa chứng minh mua/còn hiệu lực; không tự ACTIVE.

**Persistence:** CẦN BỔ SUNG — Chưa có policy insurer/coverage/evidence/history bảo hiểm. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "policyNumber": "DEMO-INS-001",
    "status": "ACTIVE",
    "horseIds": [
      "HORSE_001"
    ],
    "coverageFrom": "2026-11-05 06:00",
    "coverageUntil": "2026-11-10 20:00"
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


### F2-J16 — PUT /specialist/trips/{tripId}/insurance

Ghi mua/xác minh bảo hiểm. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Coverage end > start, bao phủ đủ ngựa/phần vận chuyển và thời điểm dùng.

**Dữ liệu SQL:** Chưa có model insurance/upload binding.

**Side effect và retry:** Giữ policy cũ khi gia hạn/thay; chi phí phát sinh công ty trình Manager; không tự thu phí sự cố Customer.

**Persistence:** CẦN BỔ SUNG — Cần policy version, insurer, scope, thời hạn và bằng chứng mua thật. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 1,
  "policyNumber": "DEMO-INS-001",
  "insurer": "Demo insurer",
  "horseIds": [
    "HORSE_001"
  ],
  "coverageFrom": "2026-11-05 06:00",
  "coverageUntil": "2026-11-10 20:00",
  "evidenceUrl": "/api/specialist/trips/TRIP_003/insurance/file"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `expectedPlanVersionNo` | integer | Có |
| `policyNumber` | string | Có |
| `insurer` | string | Có |
| `horseIds` | array | Có |
| `coverageFrom` | string | Có |
| `coverageUntil` | string | Có |
| `evidenceUrl` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "planVersionNo": 1,
    "status": "ACTIVE"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "INSURANCE_COVERAGE_INSUFFICIENT",
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


### F2-J17 — GET /specialist/trips/{tripId}/documents-readiness

Kiểm tra Documents readiness. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** Checklist + insurance + phương án đã duyệt.

**Side effect và retry:** Chỉ kiểm điều kiện; không xác nhận thay Specialist/Manager.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

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
        "code": "INSURANCE_NOT_ACTIVE",
        "message": "Chưa có bảo hiểm được xác minh"
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


### F2-J18 — POST /specialist/trips/{tripId}/documents-readiness/confirm

Xác nhận Documents READY. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Gate 1 đã duyệt, mọi mục PRE_DEPARTURE áp dụng và bảo hiểm đủ hiệu lực.

**Dữ liệu SQL:** Không có Documents readiness snapshot/version/confirmation.

**Side effect và retry:** Lưu readiness theo bản, notify Coordinator/Manager. Không đổi Trip READY_TO_DEPART, không yêu cầu customs tại mốc tương lai đã CLEARED.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

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
    "confirmedBy": "USER_005",
    "confirmedAt": "2026-11-04 09:00"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DOCUMENTS_NOT_READY",
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


### F2-J19 — POST /specialist/trips/{tripId}/quarantine-bookings

Ghi nhận booking kiểm dịch. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. End > start, cơ sở active/phù hợp quy định và có xác nhận.

**Dữ liệu SQL:** QUARANTINE_BOOKING; derive RequestID, StationName và Country tên hiển thị, không ISO trong cột Country.

**Side effect và retry:** Chỉ booking, không tự hoàn tất theo lịch. Actor/history nghiệp vụ đầy đủ cần bổ sung nếu đi kèm quyết định, không hứa đã lưu các field thiếu.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request JSON**

```json
{
  "facilityId": "FACILITY_003",
  "expectedStartDate": "2026-11-03 08:00",
  "expectedEndDate": "2026-11-04 08:00",
  "confirmationNumber": "DEMO-QUARANTINE-1"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `facilityId` | string | Có |
| `expectedStartDate` | string | Có |
| `expectedEndDate` | string | Có |
| `confirmationNumber` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "bookingId": "QUARANTINE_BOOKING_003",
    "status": "CONFIRMED"
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


### F2-J20 — POST /specialist/quarantine-bookings/{bookingId}/result

Ghi kết quả kiểm dịch. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Dựa kết quả thực và loại thủ tục áp dụng.

**Dữ liệu SQL:** Booking có status/lịch dự kiến, thiếu actual/evidence/kết luận/reason/history.

**Side effect và retry:** Booking COMPLETED không tự là customs CLEARED hay đủ khả năng đi tiếp.

**Persistence:** CẦN BỔ SUNG — Cần kết quả thực tế và cơ chế giữ/chặn, không chỉ cập nhật Status. Chưa có thì trả 501.

**Request JSON**

```json
{
  "status": "COMPLETED",
  "actualAt": "2026-11-04 08:00",
  "reason": "Có kết quả kiểm dịch đạt",
  "evidenceUrl": "/api/specialist/quarantine-bookings/QUARANTINE_BOOKING_003/file"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `status` | string | Có |
| `actualAt` | string | Có |
| `reason` | string | Có |
| `evidenceUrl` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "bookingId": "QUARANTINE_BOOKING_003",
    "status": "COMPLETED"
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "CONTROL_RESULT_INCOMPLETE",
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


### F2-J21 — POST /specialist/trips/{tripId}/customs-clearances

Ghi kết quả thông quan. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Cho tác nghiệp IN_TRANSIT nếu đúng phân công. Segment cùng Trip; status PENDING/ON_HOLD/CLEARED/REJECTED. CLEARED cần chứng cứ/thời điểm.

**Dữ liệu SQL:** CUSTOMS_CLEARANCE status/ClearedAt có, thiếu actual nhập/reason/evidence/history và link blocker.

**Side effect và retry:** Chưa hoàn thành/hold/reject chặn đúng phần tiếp; Driver đến trạm không tự CLEARED.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request JSON**

```json
{
  "segmentId": "ROUTE_SEGMENT_007",
  "documentType": "EXPORT",
  "declarationNumber": "DEMO-CUSTOMS-3",
  "status": "ON_HOLD",
  "actualAt": "2026-11-05 08:00",
  "reason": "Cần bổ sung chứng từ",
  "evidenceUrl": "/api/specialist/trips/TRIP_003/customs/file"
}
```

| Field | Kiểu | Bắt buộc |
|---|---|---|
| `segmentId` | string | Có |
| `documentType` | string | Có |
| `declarationNumber` | string | Có |
| `status` | string | Có |
| `actualAt` | string | Có |
| `reason` | string | Có |
| `evidenceUrl` | string | Có |

Body chỉ gồm keys trên; text trim không rỗng (reason/note <=2000), ID thuộc scope, integer version >=1, date/time đúng mục 2. File trong ví dụ là placeholder binary multipart thật, không phải chuỗi được lưu. Arrays không rỗng khi thao tác yêu cầu có ngựa/chặng. Các enum và validation nghiệp vụ theo điều kiện endpoint, không suy từ một giá trị mẫu.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "clearanceId": "CUSTOMS_CLEARANCE_003",
    "status": "ON_HOLD",
    "clearedAt": null,
    "blocksNextLeg": true
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "CLEARANCE_EVIDENCE_REQUIRED",
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


### F2-J22 — POST /specialist/trips/{tripId}/document-impact-assessments

Đánh giá ảnh hưởng thay đổi. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** Cần liên kết record/insurance/checklist với plan version.

**Side effect và retry:** Giữ kết quả không ảnh hưởng, không kéo dài expiry; bất khả thi/chi phí/dời lịch đã duyệt báo Coordinator/Manager.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Thiếu phiên bản phương án và readiness/feasibility có actor/time tham chiếu version. Chưa có thì trả 501.

**Request JSON**

```json
{
  "expectedPlanVersionNo": 2,
  "reason": "Đổi lịch cần kiểm lại bảo hiểm"
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
    "planVersionNo": 2,
    "affectedItems": [
      "INSURANCE"
    ],
    "unchangedItems": [
      "HORSE_001:COGGINS_TEST"
    ],
    "documentsReadiness": "NOT_READY"
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


### F2-J23 — GET /manager/trips/{tripId}/document-summary

Manager xem tổng hợp hồ sơ. Role **LOGISTICS_MANAGER**.

**Điều kiện:** Manager đúng role; chỉ xem, không duyệt chuyên môn thay Specialist.

**Dữ liệu SQL:** Trip/Request/LMR có nền, readiness/insurance chỉ trả khi có dependency.

**Side effect và retry:** Projection thiếu section null, không giả READY.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "documents": [],
    "insurance": null,
    "documentsReadiness": null,
    "capabilities": {
      "readiness": false
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


### F2-J24 — GET /specialist/trips/{tripId}/document-package

Đọc bộ hồ sơ đi đường. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** LMR có file nền; package đầy đủ cần company documents/checklist/insurance.

**Side effect và retry:** Manifest gồm record thật; trạng thái đạt cần checklist đã tính đúng. Không tự tạo tài liệu đã duyệt hoặc giấy tờ gốc.

**Persistence:** CẦN BỔ SUNG — Thiếu checklist có scope/phase, review reason/time/revision/history, document requests và hồ sơ công ty cấp Trip. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "documents": [
      {
        "recordId": "LEGAL_MEDICAL_RECORD_007",
        "horseId": "HORSE_001",
        "documentStatus": "VERIFIED"
      }
    ],
    "missingItems": [],
    "canExport": false
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DOCUMENT_PACKAGE_INCOMPLETE",
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


### F2-J25 — POST /specialist/trips/{tripId}/document-package/export

Tạo bộ hồ sơ xuất. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip. Chỉ xuất các file hợp lệ đúng scope và quyền.

**Dữ liệu SQL:** Chưa có package manifest/version/storage binding.

**Side effect và retry:** Sinh ZIP thật và lưu manifest/bản dùng; endpoint download phải kiểm quyền, trả application/zip, lỗi envelope. Không dùng link giả.

**Persistence:** CẦN BỔ SUNG — Cần package export, immutable manifest và authorized download; canExport chỉ true sau implement. Chưa có thì trả 501.

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

**Response 201** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_003",
    "file": {
      "name": "documents.zip",
      "url": "/api/specialist/trips/TRIP_003/document-package/file"
    }
  }
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "DOCUMENT_PACKAGE_INCOMPLETE",
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


### F2-J26 — GET /specialist/regulations?tripId=TRIP_003

Tra cứu quy định. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** POLICY_AND_TERM theo loại, ngày hiệu lực/IsActive; thiếu mapping rule có cấu trúc nên không tự sinh nghĩa vụ từ mọi dòng.

**Side effect và retry:** Đọc nội dung POLICY_AND_TERM thật; metadata không chứng minh rule checklist đã được mô hình hóa. Tạo/sửa chính sách là quyền quản trị cần phân công riêng, không tự cấp cho Customer.

**Persistence:** BASE — có bảng nền cho phần mô tả; vẫn phải triển khai backend và kiểm điều kiện.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "policyId": "POLICY_TERM_001",
      "policyType": "CUSTOMS_GUIDE",
      "version": "v1.0",
      "effectiveDate": "2026-10-01",
      "isActive": true
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


### F2-J27 — GET /specialist/trips/{tripId}/document-audit

Tra cứu audit hồ sơ. Role **TRANSPORT_SPECIALIST**.

**Điều kiện:** Đúng Specialist được giao; mutation chuẩn bị cần Deployment CONFIRMED; record/ngựa/Request cùng Trip.

**Dữ liệu SQL:** Không có audit chuyên môn Flow 2 đầy đủ trong Reviewed.

**Side effect và retry:** Chỉ trả event đã lưu; không suy lịch sử từ trạng thái cuối hoặc NOTIFICATION.SentAt.

**Persistence:** CẦN BỔ SUNG — Cần audit bền vững theo BR-62, đính chính giữ bản cũ; không dùng bảng Flow 6 đã bỏ. Chưa có thì trả 501.

**Request body:** Không gửi body.

**Response 200** — sau bổ sung persistence

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_003",
      "recordId": "LEGAL_MEDICAL_RECORD_007",
      "action": "VERIFIED",
      "actorId": "USER_005",
      "at": "2026-10-25 09:00",
      "reason": "Đã đối chiếu hồ sơ"
    }
  ]
}
```

**Response lỗi 409**

```json
{
  "success": false,
  "message": "Điều kiện xử lý chưa đạt",
  "errorCode": "AUDIT_NOT_AVAILABLE",
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

| Nhóm | Hiện có | Thiếu |
|---|---|---|
| Record ngựa | LMR RequestID/HorseID/DocumentStatus/RequirementStatus/VerifiedBy/ExpiryDate | review reason/time, lịch sử bản nộp/thẩm định và stage |
| Checklist | Không có checklist có cấu trúc | Mục chưa nộp, scope, owner CUSTOMER/COMPANY, phase, rule/plan version |
| Company documents | Không có model Trip-document | Không dùng HorseID giả hoặc Notification JSON |
| Insurance | Chi phí có ở COST_ITEM/COST_RATE | policy/insurer/coverage/evidence/history |
| Feasibility/Documents READY | Trip có status/deployment/assignment | Xác nhận đúng plan version, actor/time, invalidation |
| Quarantine/customs | Có booking/status/ClearedAt | Kết quả/bằng chứng/reason/correction và blocker phần liên quan |
| Nhắc/audit/quy định | POLICY_AND_TERM, NOTIFICATION có nền | Rule áp dụng cấu trúc, scheduler và audit chuyên môn BR-62 |

Tên key checklist/planVersionNo là DTO đích, không tự tạo PK hoặc chứng minh schema đã tồn tại. Endpoint cần dependency không được triển khai bằng việc ghi vào field text khác nghĩa. Chưa đề xuất tên bảng mới ràng buộc nhóm; schema mở rộng phải chốt riêng.

## 6. Checklist nghiệm thu và bàn giao

| Căn cứ | Nghiệm thu |
|---|---|
| BR-48/49 | VN/VN ROAD khác VN/JP AIR; phân biệt scope/người chịu trách nhiệm/giai đoạn |
| BR-50 | Reuse hồ sơ còn phù hợp, không bắt nộp lại sau kích hoạt |
| BR-51/52 | Upload không tự duyệt; reject có lý do; Customer không sửa company/decision |
| BR-53/54 | Khả thi khác READY; PRE_DEPARTURE đủ, không đòi customs tương lai |
| BR-55/56 | Bảo hiểm thực mua; Docs/Operations riêng, cùng plan version |
| BR-57–59 | Kiểm hiệu lực tại thời điểm dùng; đổi lịch chỉ invalidate phần ảnh hưởng; chi phí/dời lịch trình Manager |
| BR-60–62/47 | Driver đến không CLEARED; blocker đúng phần; actor/time/evidence/history/quyền dùng cùng object |

Test âm: khác Customer, Specialist không được giao, ON_HOLD ghi mới, record sai ngựa/Request, file sai MIME/quá cỡ, review bản bị thay, reject thiếu reason, tài liệu hết hạn tại điểm sử dụng, insurance sai ngựa/coverage, clearance sai Trip. Thiếu persistence kiểm 501/UI không mock hoặc READY.

Flow 1 bàn giao ID/owner/ngựa/hợp đồng ký/cọc/assignment. Flow 3 bàn giao lịch/tuyến/điểm kiểm soát và version. Flow 2 bàn giao feasibility trước Gate 1, Documents READY/bảo hiểm trước Gate 2, kết quả thủ tục/blocker trong chuyến và giấy tờ cần giao cuối.

Worker đích nhắc thiếu/hết hạn theo thời điểm dùng, invalidate phần ảnh hưởng, notify đúng người; không tự approve/gia hạn giấy/hủy hoặc hoàn tất Trip. Có SentAt không đủ chứng minh scheduler/audit đã triển khai. Việc tạo file này chưa kiểm runtime/API/E2E.
