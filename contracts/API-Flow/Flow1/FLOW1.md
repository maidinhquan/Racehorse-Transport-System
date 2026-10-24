# API Contract — Flow 1

## Quyết định Flow 1 hiện hành — 24/10/2026

- Chỉ thu tiền qua VNPAY. Tạo phiên → Customer thanh toán → backend xác minh IPN → cập nhật PAYMENT/INVOICE trong transaction → đủ cọc đúng version mới mở OTP. Return không xác nhận tiền. Không có API Manager confirm/reject thanh toán thủ công.
- Theo dõi tiến độ bằng status hiện tại; không xây timeline history hoặc audit riêng. Chỉ giữ metadata nghiệp vụ cần thiết: feedback gần nhất, trạng thái trước hủy, xác nhận điều khoản, metadata phát hành/ký/gia hạn/triển khai. Collection history/revisions/deadlineHistory/extensions cũ được bỏ khỏi DTO Flow 1.
- ContentSnapshot lưu đầy đủ một hợp đồng hoàn chỉnh: số hợp đồng/version, ngày phát hành, bên cung cấp và Customer, thông tin liên hệ, danh sách ngựa, nơi nhận/giao và người nhận, tuyến/mode/lịch trình, chăm sóc, toàn bộ khoản giá/thuế/phí nếu áp dụng, tổng giá, tiền/tỷ lệ cọc, nghĩa vụ thanh toán, thời hạn, mọi điều khoản/phụ lục và giá trị policy đã áp dụng. Không bỏ trường thuộc hợp đồng; dữ liệu không áp dụng thể hiện rõ. PDF thể hiện cùng nội dung và được giữ theo version. Không dựng lại bản cũ từ master hiện tại. Bản phát hành/ký bất biến; sửa nội dung tạo version mới. Giá vốn nội bộ và OTP/hash không thuộc bản hợp đồng Customer.
- fileType dùng chung photo/passport/ownership/value-proof. Không coi đây là mã ID. Hồ sơ y tế theo đơn dùng API documents.
- Refund Flow 1 chỉ ghi nhận status thủ công; không thực hiện chuyển tiền hoặc tuyên bố hệ thống đã hoàn tiền. Không yêu cầu audit/chứng từ mới.
- Đây là thiết kế đích và SQL mẫu Reviewed, không xác nhận backend/FE hoặc database đang chạy đã được cập nhật.


## Quy ước trạng thái thống nhất với database

Nguồn NAME đích: [DATABASE_STATUS_CONVENTION.md](../../../data/DATABASE_STATUS_CONVENTION.md), mục 12. Request dùng cùng enum DB/API: DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, CONTRACT_PREPARATION, CONTRACT_READY, CONTRACT_CHANGES_REQUESTED, DEPOSIT_VERIFIED, CANCELLATION_REQUESTED, ACTIVATED, SCHEDULED, IN_PROGRESS, DELIVERED, CLOSED, REJECTED, CANCELLED.

Sau ký: ACTIVATED. Gate 1 đã duyệt và phân công xác nhận: SCHEDULED. Khởi hành thực tế: Request IN_PROGRESS, Trip IN_TRANSIT. Bàn giao hợp lệ: Request DELIVERED, Trip COMPLETED. Tất toán xong: Contract SETTLED, Request vẫn DELIVERED trong cửa sổ feedback/khiếu nại. Hết cửa sổ và không khiếu nại mở: Request CLOSED, Contract CLOSED. SCHEDULED không thay Gate 2; nếu Gate 1 bị thu hồi trước khởi hành, Request trở lại ACTIVATED để duyệt lại.

Contract tổng dùng EFFECTIVE sau ký; CONTRACT_VERSION vẫn SIGNED. State UI của phiên bản là projection, không phải enum DB. Payment UI PENDING_CONFIRMATION/PROCESSING/REJECTED, refund UI REFUNDED, deployment UI NOT_CONFIRMED được đối chiếu ở mục 12; không lưu trực tiếp các nhãn này vào cột có enum khác.

Chưa ký và chưa nhận cọc đã xác minh: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã ký/kích hoạt Trip không dùng quy trình hủy trước ký này.

SQL Reviewed đã cho DeploymentStatus PENDING/CONFIRMED/ON_HOLD. Hold/resume là hợp đồng đích cần kiểm chứng backend; không còn bị chặn bởi enum SQL.

ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/metadata do backend thực hiện.

Các quy tắc trên là hợp đồng đích, không xác nhận backend/FE đã triển khai hoặc seed đã được chuyển đổi.


| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.1 — frontend và contract đồng bộ |
| Ngày | 22/10/2026 |
| Cập nhật JSON | 23/10/2026 — nhúng đầy đủ mẫu theo từng endpoint |
| Dự án | Racehorse Transport System |
| Phạm vi | Tạo đơn → xét duyệt → hợp đồng → cọc → OTP → kích hoạt → phân công; sửa/hủy liên quan |
| Căn cứ | Màn hình, form, thao tác frontend; [CONVENTIONS.md](../../CONVENTIONS.md); [HorseTransportDB.sql](../../../data/HorseTransportDB_Reviewed.sql) |
| Trạng thái | Giao thức mục tiêu; chưa chứng nhận tích hợp backend |

**Schema máy đọc:** [flow1.openapi.json](flow1.openapi.json) quy định required/nullable/enum/giới hạn. Xem thêm quy tắc triển khai ở cuối file JSON.

**JSON đã được nhúng trực tiếp:** Mục 4–13 của file này có đầy đủ request, response thành công/lỗi và các nhánh dữ liệu theo từng API. [FLOW1-API-JSON.md](FLOW1-API-JSON.md) giữ cùng bộ mẫu để tra cứu riêng; không bắt buộc mở file khác mới xem được payload. API trả PDF/ảnh có mẫu HTTP binary thay cho JSON thành công.

Nguồn SQL hiện hành: data/HorseTransportDB_Reviewed.sql; chưa áp dụng database đang chạy.

Nguồn đối chiếu: [CONVENTIONS.md](../../CONVENTIONS.md) (Quy ước chung & Quy chuẩn mã ID), [HorseTransportDB.sql](../../../data/HorseTransportDB_Reviewed.sql), `frontend/src/features/customer` và `frontend/src/features/manager`.

## 1. Luồng chính thức

~~~text
Customer nhập thông tin chuyến
→ Nhập nơi nhận/giao
→ Chọn hoặc thêm ngựa, bổ sung hồ sơ
→ Xem lại và gửi đơn

Manager:
  ├─ Yêu cầu sửa → Customer sửa và gửi lại
  ├─ Từ chối → Kết thúc
  └─ Chấp nhận → Soạn hợp đồng

Manager lưu và phát hành hợp đồng
→ Customer xem, yêu cầu sửa hoặc đồng ý điều khoản
→ Customer thanh toán cọc
→ Xác minh đủ cọc
→ Customer ký OTP
→ Backend kích hoạt Request, tạo một Trip PLANNING
→ Manager phân công Specialist và Coordinator
~~~

- Không có dự toán giá cho Customer hoặc bước chấp nhận Quote riêng.
- Customer nhập ngựa trước khi gửi đơn; không đợi Manager chấp nhận mới khai báo.
- Xác minh đủ cọc trước khi ký OTP; không dùng guard ký trước/cọc sau của bản cũ.
- Chi phí nội bộ trong trình soạn phục vụ Manager lập giá, không hiển thị cho Customer.
- Phân công không đồng nghĩa đủ điều kiện khởi hành. Hồ sơ chuyên môn, route, nguồn lực và vận hành thuộc các flow sau.

### Page → API

| Giao diện/chức năng | Nhóm API |
|---|---|
| Customer home/layout | Profile, notifications, Request/Horse list |
| Create Request và wizard nơi nhận/giao | Tạo/lưu DRAFT, tìm địa chỉ, form options |
| Wizard ngựa và hồ sơ | Horse CRUD, selectable, upload, checklist |
| Review & Submit | Submit Request hoàn chỉnh |
| Manager list/detail/review | Đọc đơn, accept, request-changes, reject |
| Manager contract editor | Editor data, draft, publish, lịch sử version |
| Customer contract | Xem, PDF, accept-terms, feedback |
| Deposit và Manager payments | Invoice DEPOSIT, session, trạng thái, đối soát |
| Review & Sign | Gửi/xác minh OTP đúng ContractID/VersionNo |
| Manager trip assignment | Nhân sự, Trip, assignment, hold/resume có điều kiện schema |
| Hủy và đối soát | Cancel, quyết định hủy, hoàn tiền |

## 2. Quy ước chung

### 2.1. Base URL và quyền

Base URL: /api. Mọi path bên dưới nằm sau /api.

~~~http
Authorization: Bearer <accessToken>
Content-Type: application/json
~~~

- Customer chỉ truy cập tài nguyên thuộc mình; khác chủ trả 404 NOT_FOUND.
- Manager cần role LOGISTICS_MANAGER.
- Actor/owner lấy từ token; không tin customerId, trạng thái tiền hoặc history Customer gửi.
- Endpoint file vẫn kiểm tra quyền. Biết ID/URL không có nghĩa được đọc.
- Multipart để trình duyệt tự đặt boundary, không ép application/json.

### 2.2. Response

Thành công:

~~~json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {}
}
~~~

Lỗi:

~~~json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "date": ["Ngày vận chuyển không hợp lệ"]
  }
}
~~~

- success/message/data luôn xuất hiện.
- errorCode bắt buộc khi lỗi; FE không phân nhánh theo message.
- errors là dictionary chứa string[] theo field, chỉ xuất hiện khi cần.
- GET danh sách trả data là mảng; không đổi thành items wrapper nếu chưa thay caller.
- GET chi tiết không thấy trả 404, không trả object rỗng giả thành công.
- Mutation trả entity hoặc kết quả mới để FE đồng bộ, không chỉ boolean rồi tự dựng state.

| HTTP | Khi dùng |
|---|---|
| 200 | Đọc/cập nhật/thực hiện thao tác |
| 201 | Tạo tài nguyên |
| 400 | Sai dữ liệu |
| 401 | Chưa xác thực |
| 403 | Sai quyền |
| 404 | Không thấy/không thuộc quyền truy cập |
| 409 | Xung đột trạng thái/phiên bản |
| 429 | Giới hạn tần suất |
| 500 | Lỗi nội bộ/cấu hình backend |

### 2.3. ID

| Đối tượng | Ví dụ |
|---|---|
| User, Customer, Manager, nhân sự | USER_001 |
| Horse | HORSE_001 |
| Request | REQUEST_001 |
| Contract | CONTRACT_001 |
| Trip | TRIP_001 |
| Invoice | INVOICE_001 |
| Payment | PAYMENT_001 |
| Supported route | ROUTE_001 |

Backend cấp theo PREFIX_<số tối thiểu 3 chữ số>, không giới hạn 999, không tái sử dụng và không COUNT(*) + 1. Không dùng lại TRN-9001, CT-9001-V1, CUS-001, STAFF-001.

~~~json
{
  "contractId": "CONTRACT_001",
  "versionNo": 2
}
~~~

- Một ContractID giữ qua các bản sửa; tăng VersionNo trong cùng hợp đồng.
- Không tạo ContractVersionID hoặc thêm lại ContractCode.
- Mapping Request/Horse dùng khóa ghép (RequestID, HorseID), không có ID mapping riêng.
- FK actor người dùng dùng USER_*. SYSTEM phải phân biệt, không ghi vào FK USER bắt buộc.
- Ngoại lệ FLIGHT_BOOKING vẫn INT IDENTITY; không áp quy tắc ID chuỗi lên booking.

### 2.4. Tiền và thời gian

- 100% VND. Giá hợp đồng/tiền thu nguyên đồng, backend tính decimal.
- depositPct = 40 nghĩa là 40%, không phải 0.40. Tỷ lệ bảo hiểm COST_RATE có đơn vị khác, không tự hiểu theo phần trăm cọc.
- Date: YYYY-MM-DD.
- DTO phục vụ hàm xử lý thời gian FE hiện tại dùng YYYY-MM-DD HH:mm, múi giờ Asia/Ho_Chi_Minh cho issuedAt/validUntil/createdAt/departAt và các timestamp hiển thị tương tự.
- Cột ...Utc SQL vẫn lưu UTC; BE chuyển khi tạo DTO. Deadline kiểm tra theo server clock.
- Số tiền và thời lượng ví dụ không phải policy production.

### 2.5. Không dùng RowVersion

Không yêu cầu rowVersion, pdfSha256, revision token hoặc contractVersion dạng base64. VersionNo là version nghiệp vụ, không phải RowVersion.

Vẫn kiểm tra state trong transaction, chống trùng và dùng unique constraint cho tiền/Trip. Bỏ RowVersion không đồng nghĩa bỏ locking/transaction/idempotency.

### 2.6. BUSINESS_POLICY

Resolve cùng một Code theo thứ tự: COUNTRY (nước đến) → TRANSPORT_MODE → GLOBAL.

- Không có ở mức hiện tại: thử mức sau.
- Có nhưng sai kiểu/đơn vị/miền giá trị: báo lỗi cấu hình, không âm thầm fallback.
- Không cộng các mức hoặc lấy MAX.
- Code bắt buộc không có ở mọi mức: báo thiếu cấu hình, không lấy hằng số FE.
- Scope ROUTE trong ảnh cũ không hợp lệ theo SQL/ID rule hiện tại.

| Code | Đơn vị/chức năng |
|---|---|
| MIN_PREPARATION_DAYS | DAY; ngày chuẩn bị |
| CONTRACT_DEADLINE_HOURS | HOUR; hạn chung cọc/xác minh/ký |
| DEFAULT_DEPOSIT_PERCENT | PERCENT; tỷ lệ mặc định |
| SIGN_OTP_TTL_MINUTES | MINUTE; hiệu lực OTP |
| SIGN_OTP_RESEND_SECONDS | SECOND; chờ gửi lại |
| SIGN_OTP_MAX_ATTEMPTS | ATTEMPT; số lần sai |
| FEEDBACK_WINDOW_HOURS | HOUR; cửa sổ phản hồi |

Tiền cọc/preparation/deadline đã áp dụng phải lưu theo Request/Contract/Version/Invoice. Đổi policy không tự đổi thỏa thuận cũ.

## 3. DTO phục vụ frontend

### 3.1. Place

~~~json
{
  "name": "Trại ngựa A",
  "address": "Địa chỉ nhận ngựa",
  "postal": "700000",
  "contact": "Nguyen Van A",
  "phone": "+84901234567",
  "notes": "",
  "latitude": 10.8231,
  "longitude": 106.6297
}
~~~

Chuỗi luôn có; DRAFT được rỗng. Latitude/longitude cùng có hoặc cùng bỏ, lần lượt trong [-90,90] và [-180,180]. Submit bắt buộc name/address/contact/phone.

### 3.2. FileRef

~~~json
{
  "name": "passport.pdf",
  "url": "/api/customer/horses/HORSE_001/files/passport"
}
~~~

Giữ name/url như FE đang đọc. URL là endpoint có quyền, không trả đường dẫn ổ đĩa/private/... để đọc trực tiếp. Không sinh FILE_001 rồi coi đó là bảng đã có. Blob URL không thay file backend.

### 3.3. ContractVersion FE

~~~json
{
  "contractId": "CONTRACT_001",
  "v": 1,
  "number": "CONTRACT_001",
  "issuedAt": "2026-10-22 14:00",
  "validUntil": "2026-10-23 14:00",
  "currency": "VND",
  "items": [
    { "desc": "Vận chuyển", "amount": 20000000, "required": true }
  ],
  "total": 20000000,
  "depositPct": 40,
  "depositAmount": 8000000,
  "state": "ISSUED",
  "note": "",
  "termsAcceptedAt": null,
  "signedAt": null
}
~~~

| DTO | Nguồn |
|---|---|
| contractId | CONTRACT.ContractID |
| v | CONTRACT_VERSION.VersionNo |
| number | Alias hiển thị ContractID, không có cột mã thứ hai |
| total | Tổng giá snapshot |
| depositPct | Phần trăm cọc |
| validUntil | Hạn đang áp dụng đúng phiên bản |
| state | Trạng thái UI suy ra từ dữ liệu liên quan |

Không ghi state FE trực tiếp vào CONTRACT_VERSION.VersionStatus. SQL chỉ cho DRAFT/ISSUED/SUPERSEDED/SIGNED/CANCELLED. EXPIRED suy từ deadline; CHANGES_REQUESTED từ feedback; EFFECTIVE từ vòng đời hợp đồng đủ điều kiện.

Manager version có thêm mode/departAt/arriveAt/budget/exception/terms/extensions. Customer không nhận budget/exception nội bộ; phải nhận đủ nội dung điều khoản để đọc. Hình thức null trong DTO mới cần FE xử lý cùng adapter.

### 3.4. Hai projection Request

Customer Request:

~~~text
id, origin, destination, date, horseCount,
requestedAt, submittedAt, status,
feedback, reason,
careNotes, pickup, delivery,
horses, horseNotes, wizardStep,
revisions, versions, payments, docs,
supplements, companyDocs, trip,
complaints
~~~

Manager Request:

~~~text
id, customerId, origin, destination, date,
status, horses, pickup, delivery, careNotes,
submittedAt, feedback, reason,
versions, draft, dossier, cancellation,
collection, contractId, tripId
~~~

- Hai projection cùng dữ liệu canonical, không phải hai store riêng.
- Collection chưa có trả []; optional chưa có được bỏ.
- horseCount thực tính từ mapping, không phải số slot chưa chọn.
- Theo dõi tiến độ bằng status; không trả timeline lịch sử/audit riêng.
- Field chưa có nơi lưu SQL được nêu ở mục 14, không tự bịa dữ liệu.
- Không dựng fake READY/hoàn thành cho phần hậu vận chuyển chưa phát sinh.

### 3.5. RequestStatus Flow 1

~~~text
DRAFT → PENDING_REVIEW
PENDING_REVIEW → CHANGES_REQUESTED → PENDING_REVIEW
PENDING_REVIEW / CHANGES_REQUESTED → REJECTED
PENDING_REVIEW → CONTRACT_PREPARATION
CONTRACT_PREPARATION → CONTRACT_READY
CONTRACT_READY → CONTRACT_CHANGES_REQUESTED → CONTRACT_READY
CONTRACT_READY → DEPOSIT_VERIFIED → ACTIVATED
ACTIVATED → SCHEDULED → IN_PROGRESS → DELIVERED → CLOSED
Hủy hợp lệ → CANCELLED hoặc CANCELLATION_REQUESTED chờ xử lý
~~~

Đây là state machine API/UI mới. Seed có trạng thái lịch sử khác không tự thành transition cho đơn mới. Không dùng một enum cho mọi cột Status.

## 4. API form và layout

| Method | Endpoint | Kết quả |
|---|---|---|
| GET | /customer/profile | CustomerProfile |
| GET | /customer/horses | Horse[] |
| GET | /customer/notifications | CustomerNotification[] |
| GET | /manager/customers | CustomerInfo[] |
| GET | /manager/horses | HorseRef[] |
| GET | /manager/staff | Staff[] |
| GET | /manager/notifications | ManagerNotification[] |
| GET | /master/supported-routes | Tuyến hoạt động |
| GET | /customer/request-form-options | Cấu hình theo nước đến/mode |
| GET | /locations/search?q=...&country=VN | Gợi ý địa chỉ |

Supported routes seed:

~~~json
[
  { "id": "ROUTE_001", "originCountry": "VN", "destinationCountry": "VN", "mode": "ROAD" },
  { "id": "ROUTE_002", "originCountry": "VN", "destinationCountry": "VN", "mode": "AIR" },
  { "id": "ROUTE_003", "originCountry": "VN", "destinationCountry": "JP", "mode": "AIR" }
]
~~~

API lọc IsActive. COUNTRY không có nghĩa mọi cặp quốc gia đều được hỗ trợ.

Location suggestion:

~~~json
[
  { "label": "Địa chỉ đầy đủ", "point": { "latitude": 10.8231, "longitude": 106.6297 } }
]
~~~

Form-options query: originCountry/destinationCountry/mode khi đã chọn; chưa chọn chỉ trả danh mục chung, không khẳng định policy theo tuyến chưa xác định.

~~~json
{
  "currency": "VND",
  "preparationDays": 7,
  "defaultDepositPct": 40,
  "contractDeadlineHours": 24
}
~~~

Giá trị từ policy; không hardcode ở FE. Nhắc/đánh dấu đã đọc thông báo cần endpoint ghi có quyền và persistence, không chỉ sửa state layout.

<!-- FLOW1_JSON_4_START -->

### F1-J01 — GET /customer/profile

Thông tin Customer. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "USER_001",
    "name": "Nguyen Van A",
    "initials": "NA",
    "email": "customer@example.com",
    "phone": "+84901234567",
    "company": "Trang trại A"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J02 — GET /customer/horses

Danh sách ngựa. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "breed": "Thoroughbred",
      "sex": "STALLION",
      "dob": "2020-03-14",
      "microchip": "985112004571029",
      "value": "120000000",
      "currency": "VND",
      "passport": {
        "number": "VN-EQ-2020-1029",
        "authority": "Cơ quan cấp",
        "issueDate": "2023-04-10",
        "expiryDate": "2028-04-09",
        "scan": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      },
      "conditions": "",
      "photo": {
        "name": "horse.png",
        "url": "/api/customer/horses/HORSE_001/files/photo"
      },
      "ownership": {
        "name": "ownership.pdf",
        "url": "/api/customer/horses/HORSE_001/files/ownership"
      },
      "color": null,
      "fluDate": null,
      "vetName": null,
      "vetPhone": null,
      "unsupportedFields": [
        "color",
        "fluDate",
        "vetName",
        "vetPhone"
      ]
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### F1-J03 — GET /customer/notifications

Thông báo Customer. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "NOTIFICATION_001",
      "title": "Hợp đồng đã phát hành",
      "body": "Vui lòng xem hợp đồng CONTRACT_001 phiên bản 1.",
      "at": "2026-10-23 09:00",
      "read": false,
      "link": "/customer/requests/REQUEST_001/contract"
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### F1-J04 — GET /manager/customers

Danh sách Customer. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_001",
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J05 — GET /manager/horses

Danh sách ngựa cho Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "breed": "Thoroughbred",
      "microchip": "985112004571029",
      "passportNo": "VN-EQ-2020-1029"
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J06 — GET /manager/staff

Nhân sự phân công. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_005",
      "name": "Nguyen Thi B",
      "role": "TRANSPORT_SPECIALIST",
      "load": 1
    },
    {
      "id": "USER_006",
      "name": "Tran Van C",
      "role": "FLEET_ROUTE_COORDINATOR",
      "load": 2
    }
  ]
}
```

**Quy tắc:** role Coordinator trong DTO và USER.Role thống nhất FLEET_ROUTE_COORDINATOR. Không tạo hai user/role để né mapping.

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J07 — GET /manager/notifications

Thông báo Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "NOTIFICATION_002",
      "at": "2026-10-23 08:00",
      "title": "Đơn mới",
      "text": "REQUEST_001 đang chờ xét duyệt.",
      "link": "/manager/requests/REQUEST_001",
      "read": false
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J08 — GET /master/supported-routes

Tuyến hoạt động. Role: **Người dùng đã đăng nhập theo phạm vi dữ liệu**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "ROUTE_001",
      "originCountry": "VN",
      "destinationCountry": "VN",
      "mode": "ROAD"
    },
    {
      "id": "ROUTE_002",
      "originCountry": "VN",
      "destinationCountry": "VN",
      "mode": "AIR"
    },
    {
      "id": "ROUTE_003",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR"
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### F1-J09 — GET /customer/request-form-options

Cấu hình form đã resolve. Role: **CUSTOMER**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| originCountry | VN |
| destinationCountry | JP |
| mode | AIR |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "currency": "VND",
    "preparationDays": 7,
    "defaultDepositPct": 40,
    "contractDeadlineHours": 24,
    "supportedRoutes": [
      {
        "id": "ROUTE_001",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "ROAD"
      },
      {
        "id": "ROUTE_002",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "AIR"
      },
      {
        "id": "ROUTE_003",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "mode": "AIR"
      }
    ]
  }
}
```

**Response nhánh: 200 khi chưa chọn tuyến**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "currency": "VND",
    "supportedRoutes": [
      {
        "id": "ROUTE_001",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "ROAD"
      },
      {
        "id": "ROUTE_002",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "AIR"
      },
      {
        "id": "ROUTE_003",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "mode": "AIR"
      }
    ],
    "preparationDays": 7,
    "defaultDepositPct": 40,
    "contractDeadlineHours": 24
  }
}
```

**Quy tắc:** Query chỉ là tham số URL. Chưa có nước/mode thì trả danh mục, không khẳng định preparationDays cho một tuyến chưa xác định.

**Response lỗi 500 — BUSINESS_POLICY_CONFIGURATION_ERROR**

```json
{
  "success": false,
  "message": "Cấu hình policy bị thiếu hoặc không hợp lệ",
  "errorCode": "BUSINESS_POLICY_CONFIGURATION_ERROR",
  "data": null
}
```

### F1-J10 — GET /locations/search

Gợi ý địa chỉ. Role: **Người dùng đã đăng nhập theo phạm vi dữ liệu**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| q | Trại ngựa |
| country | VN |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "label": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "point": {
        "latitude": 10.8231,
        "longitude": 106.6297,
        "countryCode": "VN"
      }
    }
  ]
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "q": [
      "Từ khóa tìm kiếm không hợp lệ"
    ]
  }
}
```

<!-- FLOW1_JSON_4_END -->

## 5. Ngựa và hồ sơ

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /customer/horses/{horseId} | Xem ngựa |
| POST | /customer/horses | Thêm |
| PUT | /customer/horses/{horseId} | Sửa |
| GET | /customer/horses/selectable?date=... | Khả dụng |
| POST | /customer/horses/{horseId}/files/{fileType} | Upload/thay |
| GET | /customer/horses/{horseId}/files/{fileType} | Đọc có quyền |

date chỉ phục vụ kiểm tra sơ bộ tại ngày chọn, không bảo đảm toàn bộ khoảng lịch của đơn mới. Chuyến đã ký giữ lịch theo departAt → arriveAt trong CONTRACT_VERSION.ContentSnapshot của đúng version SIGNED; arriveAt là thời điểm giao ngựa dự kiến. Chuyến chưa bàn giao thực tế vẫn bị coi là đang bận khi quá arriveAt. Khi Manager chốt/phát hành lịch và trước ký, backend kiểm tra lại xung đột cả khoảng trong transaction; submit chỉ kiểm tra sơ bộ khi đơn chưa có ngày giao dự kiến. Không thêm trường ngày kết thúc riêng.

Create:

~~~json
{
  "name": "Thunderbolt",
  "breed": "Thoroughbred",
  "sex": "STALLION",
  "dob": "2020-03-14",
  "microchip": "985112004571029",
  "value": "120000000",
  "currency": "VND",
  "passport": {
    "number": "VN-EQ-2020-1029",
    "authority": "Cơ quan cấp",
    "issueDate": "2023-04-10",
    "expiryDate": "2028-04-09"
  },
  "conditions": ""
}
~~~

201 trả Horse có id HORSE_*.

- value giữ string theo input FE; BE parse DeclaredValueVnd, dương/nguyên đồng/không vượt giới hạn SQL.
- sex chuẩn STALLION/MARE/GELDING; không tự hiểu Male là Stallion.
- Passport expiryDate sau issueDate; kiểm tra microchip trùng; không lấy OwnerID từ body.
- Field form chưa có nơi lưu xử lý theo mục 14, không âm thầm bỏ dữ liệu.

Upload POST multipart:

~~~text
file = <binary>
~~~

fileType: photo/passport/ownership/value-proof. Trả FileRef, lưu private/gắn cột tương ứng. MIME/kích thước theo cấu hình upload thống nhất FE–BE.

Hồ sơ y tế theo Request dùng LEGAL_MEDICAL_RECORD:

~~~http
POST /customer/requests/{requestId}/horses/{horseId}/documents
Content-Type: multipart/form-data
~~~

~~~text
documentType = <mã được hỗ trợ>
expiryDate   = YYYY-MM-DD hoặc bỏ
file         = <binary>
~~~

Kiểm tra owner của Horse và Request. Upload không tự APPROVED; Manager chỉ xem, Specialist duyệt ở flow chuyên môn.

<!-- FLOW1_JSON_5_START -->

### F1-J11 — GET /customer/horses/{horseId}

Chi tiết ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09",
      "scan": {
        "name": "passport.pdf",
        "url": "/api/customer/horses/HORSE_001/files/passport"
      }
    },
    "conditions": "",
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
    ]
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J12 — POST /customer/horses

Thêm ngựa. Role: **CUSTOMER**.

**Request JSON**

```json
{
  "name": "Thunderbolt",
  "breed": "Thoroughbred",
  "sex": "STALLION",
  "dob": "2020-03-14",
  "microchip": "985112004571029",
  "value": "120000000",
  "currency": "VND",
  "passport": {
    "number": "VN-EQ-2020-1029",
    "authority": "Cơ quan cấp",
    "issueDate": "2023-04-10",
    "expiryDate": "2028-04-09"
  },
  "conditions": ""
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "conditions": "",
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
    ]
  }
}
```

**Quy tắc:** value là string theo input FE nhưng lưu DeclaredValueVnd numeric. sex dùng mã chuẩn. Response chỉ thể hiện field có nơi lưu đã xác định, không giả lập color/fluDate/vetName/vetPhone chưa có persistence. Ngay sau create chưa upload thì không có property file; gọi upload riêng rồi GET để lấy FileRef.

**Response lỗi 409 — HORSE_MICROCHIP_DUPLICATE**

```json
{
  "success": false,
  "message": "Microchip đã tồn tại",
  "errorCode": "HORSE_MICROCHIP_DUPLICATE",
  "data": null
}
```

### F1-J13 — PUT /customer/horses/{horseId}

Sửa hồ sơ ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |

**Request JSON**

```json
{
  "name": "Thunderbolt",
  "breed": "Thoroughbred",
  "sex": "STALLION",
  "dob": "2020-03-14",
  "microchip": "985112004571029",
  "value": "120000000",
  "currency": "VND",
  "passport": {
    "number": "VN-EQ-2020-1029",
    "authority": "Cơ quan cấp",
    "issueDate": "2023-04-10",
    "expiryDate": "2028-04-09"
  },
  "conditions": "Cần theo dõi khẩu phần"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09",
      "scan": {
        "name": "passport.pdf",
        "url": "/api/customer/horses/HORSE_001/files/passport"
      }
    },
    "conditions": "Cần theo dõi khẩu phần",
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
    ]
  }
}
```

**Response lỗi 409 — HORSE_NOT_EDITABLE**

```json
{
  "success": false,
  "message": "Thông tin ngựa đang bị khóa theo nghiệp vụ",
  "errorCode": "HORSE_NOT_EDITABLE",
  "data": null
}
```

### F1-J14 — GET /customer/horses/selectable

Ngựa có thể chọn. Role: **CUSTOMER**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| date | 2026-11-20 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "selectable": true,
      "conflict": null,
      "documentWarnings": []
    }
  ]
}
```

**Quy tắc:** date chỉ phục vụ kiểm tra sơ bộ tại ngày chọn, không bảo đảm toàn bộ khoảng lịch của đơn mới. Chuyến đã ký giữ lịch theo departAt → arriveAt trong CONTRACT_VERSION.ContentSnapshot của đúng version SIGNED; arriveAt là thời điểm giao ngựa dự kiến. Chuyến chưa bàn giao thực tế vẫn bị coi là đang bận khi quá arriveAt. Khi Manager chốt/phát hành lịch và trước ký, backend kiểm tra lại xung đột cả khoảng trong transaction; submit chỉ kiểm tra sơ bộ khi đơn chưa có ngày giao dự kiến. Không thêm trường ngày kết thúc riêng.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "date": [
      "Ngày không hợp lệ"
    ]
  }
}
```

### F1-J15 — POST /customer/horses/{horseId}/files/{fileType}

Upload file ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| fileType | passport |

**Request: multipart/form-data, không có JSON body.**

| Field | Kiểu | Bắt buộc | Ví dụ |
|---|---|---|---|
| file | binary | Có | passport.pdf |

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "name": "passport.pdf",
    "url": "/api/customer/horses/HORSE_001/files/passport"
  }
}
```

**Quy tắc:** fileType: photo/passport/ownership/value-proof. Đây là multipart, không gửi JSON chứa tên file thay bytes. Giới hạn MIME/kích thước từ cấu hình, không tự tạo FILE_* ID.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "file": [
      "Nội dung file không hợp lệ"
    ]
  }
}
```

### F1-J16 — GET /customer/horses/{horseId}/files/{fileType}

Đọc file private. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| fileType | passport |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="passport.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Quy tắc:** Ví dụ fileType=passport; photo có thể trả image/png hoặc image/jpeg.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J17 — POST /customer/requests/{requestId}/horses/{horseId}/documents

Nộp hồ sơ theo đơn. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |
| horseId | HORSE_001 |

**Request: multipart/form-data, không có JSON body.**

| Field | Kiểu | Bắt buộc | Ví dụ |
|---|---|---|---|
| documentType | string | Có | PASSPORT |
| expiryDate | date | Không | 2028-04-09 |
| file | binary | Có | passport.pdf |

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "key": "passport",
    "scope": "HORSE_001",
    "status": "SUBMITTED",
    "file": {
      "name": "passport.pdf",
      "url": "/api/customer/horses/HORSE_001/files/passport"
    },
    "updatedAt": "2026-10-23 07:50"
  }
}
```

**Quy tắc:** documentType PASSPORT chỉ minh họa; dùng catalog đã chốt. DocRecord là projection UI từ LEGAL_MEDICAL_RECORD, không tự đánh dấu APPROVED.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "file": [
      "Nội dung file không hợp lệ"
    ]
  }
}
```

<!-- FLOW1_JSON_5_END -->

## 6. Tạo, hoàn thiện và gửi đơn

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | /customer/requests | Tạo DRAFT |
| PUT | /customer/requests/{requestId} | Lưu field Customer được sửa |
| POST | /customer/requests/{requestId}/submit | Gửi/gửi lại |
| GET | /customer/requests | Danh sách aggregate |
| GET | /customer/requests/{requestId} | Chi tiết aggregate |
| GET | /customer/requests/{requestId}/document-checklist | Hồ sơ thiếu/cần nộp |

Create DRAFT:

~~~json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "date": "2026-11-20",
  "careNotes": ""
}
~~~

201 trả Customer Request DRAFT với id REQUEST_*. Số slot mong muốn trong wizard là state FE; horseCount thực từ horses. Không dùng local draft key làm ID backend được tin cậy.

Update:

~~~json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "date": "2026-11-20",
  "pickup": {
    "name": "Trại ngựa A", "address": "Địa chỉ nhận", "postal": "",
    "contact": "Nguyen Van A", "phone": "+84901234567", "notes": "",
    "latitude": 10.8231, "longitude": 106.6297
  },
  "delivery": {
    "name": "Tokyo Racecourse", "address": "Địa chỉ giao", "postal": "",
    "contact": "Yuki Tanaka", "phone": "+81312345678", "notes": ""
  },
  "horses": ["HORSE_001", "HORSE_002"],
  "horseNotes": { "HORSE_001": "Lưu ý khẩu phần" },
  "careNotes": ""
}
~~~

- Chỉ DRAFT/CHANGES_REQUESTED. Lưu không tự submit.
- Không ghi status/versions/payments/trip/history từ body; không mass-assign aggregate.
- Không ngựa khác chủ/ID trùng/rỗng; horseNotes chỉ chứa ngựa đã chọn.
- horseNotes → REQUEST_HORSE_MAPPING.CareInstructions, mapping lưu nguyên tử.
- Không tin DistanceKm tùy ý của FE để tính tiền.
- DRAFT được thiếu thông tin; submit phải đầy đủ.

Submit không body. BE kiểm tra địa điểm/contact/ngựa, tuyến/mode hoạt động, preparation policy, hồ sơ Customer và lịch ngựa sơ bộ theo ngày trong transaction; chưa có arriveAt thì không cam kết toàn bộ khoảng lịch. Khi phát hành hợp đồng và trước ký phải kiểm tra lại departAt → arriveAt. Hồ sơ công ty chưa hoàn thiện không tự chặn. Không chỉ tin kết quả GET trước đó.

200 trả PENDING_REVIEW, status và notification Manager sau commit; không Contract/Trip.

POST create nhận Idempotency-Key: UUID. BE băm phục vụ SubmissionKeyHash, retry trả cùng Request. Đây không phải RowVersion hoặc lời hứa idempotency cho mọi mutation chưa có persistence tương ứng.

<!-- FLOW1_JSON_6_START -->

### F1-J18 — POST /customer/requests

Tạo DRAFT. Role: **CUSTOMER**.

**Request JSON**

```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "date": "2026-11-20",
  "careNotes": ""
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 0,
    "requestedAt": "2026-10-23 07:30",
    "status": "DRAFT",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "",
      "address": "",
      "postal": "",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": ""
    },
    "delivery": {
      "name": "",
      "address": "",
      "postal": "",
      "contact": "",
      "phone": "",
      "notes": ""
    },
    "horses": [],
    "horseNotes": {},
    "wizardStep": 1,
    "versions": [],
    "payments": [],
    "docs": [],
    "supplements": [],
    "companyDocs": [],
    "complaints": []
  }
}
```

**Quy tắc:** Header Idempotency-Key bắt buộc cho create theo baseline. ID backend; số slot mong muốn trong wizard thuộc state FE, response horseCount là số mapping thực hiện có.

**Response lỗi 400 — UNSUPPORTED_ROUTE**

```json
{
  "success": false,
  "message": "Tuyến hoặc phương thức không được hỗ trợ",
  "errorCode": "UNSUPPORTED_ROUTE",
  "data": null
}
```

### F1-J19 — PUT /customer/requests/{requestId}

Lưu dữ liệu Customer. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "date": "2026-11-20",
  "careNotes": "Chăm sóc theo hồ sơ ngựa",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyen Van A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
    "latitude": 10.8231,
    "longitude": 106.6297
  },
  "delivery": {
    "name": "Tokyo Racecourse",
    "address": "Địa chỉ giao tại Tokyo",
    "postal": "1830024",
    "contact": "Yuki Tanaka",
    "phone": "+81312345678",
    "notes": "",
    "latitude": 35.668,
    "longitude": 139.484
  },
  "horses": [
    "HORSE_001"
  ],
  "horseNotes": {
    "HORSE_001": "Lưu ý khẩu phần"
  }
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "DRAFT",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": []
  }
}
```

**Quy tắc:** Chỉ DRAFT/CHANGES_REQUESTED; không gửi state, history, versions, payments hoặc trip. Response draft hoàn chỉnh vẫn chưa tự submit.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J20 — POST /customer/requests/{requestId}/submit

Gửi/gửi lại. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "PENDING_REVIEW",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": []
  }
}
```

**Quy tắc:** Body không có. Backend kiểm tra mapping/tuyến/hồ sơ và lịch sơ bộ theo ngày, không chỉ dùng validation FE. Đơn chưa có arriveAt không được coi đã giữ lịch toàn khoảng; phải kiểm tra lại khi chốt hợp đồng và trước ký. Chưa tạo Contract/Trip.

**Response lỗi 400 — REQUIRED_DOCUMENT_MISSING**

```json
{
  "success": false,
  "message": "Thiếu hồ sơ Customer phải nộp",
  "errorCode": "REQUIRED_DOCUMENT_MISSING",
  "data": null,
  "errors": {
    "horses.HORSE_001.passport.scan": [
      "Chưa nộp scan hộ chiếu"
    ]
  }
}
```

### F1-J21 — GET /customer/requests

Danh sách Customer Request. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "REQUEST_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "horseCount": 1,
      "requestedAt": "2026-10-23 07:30",
      "submittedAt": "2026-10-23 08:00",
      "status": "PENDING_REVIEW",
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
        "latitude": 10.8231,
        "longitude": 106.6297
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": "",
        "latitude": 35.668,
        "longitude": 139.484
      },
      "horses": [
        "HORSE_001"
      ],
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "wizardStep": 3,
      "versions": [],
      "payments": [],
      "docs": [
        {
          "key": "passport",
          "scope": "HORSE_001",
          "status": "SUBMITTED",
          "file": {
            "name": "passport.pdf",
            "url": "/api/customer/horses/HORSE_001/files/passport"
          },
          "updatedAt": "2026-10-23 07:50"
        }
      ],
      "supplements": [],
      "companyDocs": [],
      "complaints": []
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### F1-J22 — GET /customer/requests/{requestId}

Chi tiết Customer Request. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "PENDING_REVIEW",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J23 — GET /customer/requests/{requestId}/document-checklist

Checklist tài liệu. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "canSubmit": true,
    "items": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "name": "Hộ chiếu ngựa",
        "kind": "file",
        "status": "SUBMITTED",
        "optional": false,
        "note": "Đã nộp, chưa Specialist duyệt",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "issues": [],
    "warnings": []
  }
}
```

**Response nhánh: 200 thiếu hồ sơ, chưa được submit**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "canSubmit": false,
    "items": [],
    "issues": [
      {
        "field": "horses.HORSE_001.passport.scan",
        "code": "REQUIRED_DOCUMENT_MISSING",
        "message": "Chưa nộp scan hộ chiếu"
      }
    ],
    "warnings": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

<!-- FLOW1_JSON_6_END -->

## 7. Manager xét duyệt

| Method | Endpoint | Body |
|---|---|---|
| GET | /manager/requests | — |
| GET | /manager/requests/{requestId} | — |
| POST | /manager/requests/{requestId}/accept | Không |
| POST | /manager/requests/{requestId}/request-changes | feedback |
| POST | /manager/requests/{requestId}/reject | reason |

Accept: PENDING_REVIEW → CONTRACT_PREPARATION; ghi quyết định, thông báo Customer, không Trip.

Request changes:

~~~json
{
  "feedback": "Vui lòng xác nhận lại địa điểm nhận"
}
~~~

Chỉ nhận feedback (10–2000 ký tự), lưu TRANSPORT_REQUEST.RevisionFeedback và chuyển PENDING_REVIEW → CHANGES_REQUESTED. Customer được sửa toàn bộ các trường Customer được phép sửa trước duyệt; không có fields/revisionFields và không khóa theo nhóm. Gửi lại → PENDING_REVIEW, giữ lời nhắn gần nhất; lịch sử nhiều vòng chưa thuộc phạm vi lần này.

Reject:

~~~json
{ "reason": "Không thể đáp ứng lịch vận chuyển" }
~~~

PENDING_REVIEW/CHANGES_REQUESTED → REJECTED. Không submit lại, không xóa Horse/tài liệu. Các quyết định kiểm tra state/ghi trong transaction để một quyết định đồng thời thắng.

<!-- FLOW1_JSON_7_START -->

### F1-J24 — GET /manager/requests

Danh sách Manager Request. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "status": "PENDING_REVIEW",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": []
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J25 — GET /manager/requests/{requestId}

Chi tiết Manager Request. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "status": "PENDING_REVIEW",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J26 — POST /manager/requests/{requestId}/accept

Tiếp nhận đơn. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "status": "CONTRACT_PREPARATION",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": []
  }
}
```

**Quy tắc:** PENDING_REVIEW → CONTRACT_PREPARATION, chưa Trip.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J27 — POST /manager/requests/{requestId}/request-changes

Yêu cầu sửa. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "feedback": "Vui lòng xác nhận lại nơi nhận."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "status": "CHANGES_REQUESTED",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "feedback": "Vui lòng xác nhận lại nơi nhận."
  }
}
```

**Quy tắc:** Chỉ nhận feedback (10–2000 ký tự), lưu TRANSPORT_REQUEST.RevisionFeedback và chuyển PENDING_REVIEW → CHANGES_REQUESTED. Customer được sửa toàn bộ các trường Customer được phép sửa trước duyệt; không có fields/revisionFields và không khóa theo nhóm. Gửi lại → PENDING_REVIEW, giữ lời nhắn gần nhất; lịch sử nhiều vòng chưa thuộc phạm vi lần này.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J28 — POST /manager/requests/{requestId}/reject

Từ chối. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không đáp ứng được lịch vận chuyển."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "status": "REJECTED",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "reason": "Không đáp ứng được lịch vận chuyển."
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

<!-- FLOW1_JSON_7_END -->

## 8. Manager soạn hợp đồng

| Bước FE | API |
|---|---|
| Mở editor | GET /manager/requests/{requestId}/contract-editor |
| Lưu draft | PUT /manager/requests/{requestId}/contract-draft |
| Bỏ draft | DELETE /manager/requests/{requestId}/contract-draft |
| Phát hành | POST /manager/requests/{requestId}/contract/publish |
| Xem version cũ | GET /manager/contracts/{contractId}/versions/{versionNo} |

Editor data: request/customer/horses/draft/currentContract/versions/defaults. Defaults từ policy; mẫu điều khoản CONTRACT_TEMPLATE. Không báo giá Customer.

Draft body theo cấu trúc UI:

~~~json
{
  "mode": "AIR",
  "departAt": "2026-11-20 08:00",
  "arriveAt": "2026-11-21 18:00",
  "budget": {
    "TRANSPORT": 12000000,
    "PROCEDURE": 2000000,
    "VET": 1000000,
    "INSURANCE": 1000000,
    "STAFF": 1000000
  },
  "items": [
    { "desc": "Dịch vụ vận chuyển", "amount": 20000000, "required": true }
  ],
  "depositPct": 40,
  "note": "",
  "exception": "",
  "terms": [
    { "title": "Phạm vi dịch vụ", "text": "Vận chuyển và chăm sóc theo nội dung đã thống nhất." }
  ]
}
~~~

- Draft lưu version DRAFT với cấu trúc editor đầy đủ trong ContentSnapshot.
- Không sửa snapshot ISSUED/SIGNED; bản sửa tạo version kế tiếp.
- Phân biệt draft đang soạn với bản phát hành hiện hành/CurrentVersionNo; không cho Customer đọc draft hoặc trả tiền/ký nhầm.
- Không thay bản nếu có tiền đang xử lý/đã nhận cần đối soát.
- DELETE chỉ bỏ draft chưa phát hành, không xóa version cũ.

| UI | CostGroup DB |
|---|---|
| TRANSPORT | TRANSPORT |
| PROCEDURE | PERMIT |
| VET | VET |
| INSURANCE | INSURANCE |
| STAFF | CREW |

FUEL optional là chi tiết vận chuyển nếu dùng, không thêm CostGroup SQL. Giá sàn/margin chưa được policy seed định nghĩa đủ; cần chốt pricing, không coi hệ số FE là policy đã duyệt.

Publish:

~~~json
{ "versionNo": 1 }
~~~

BE dùng draft đã lưu, kiểm tra ngày đi/đến/preparation khả thi, tuyến/mode, items/terms đầy đủ, total dương/nguyên đồng, cọc theo phần trăm và rounding SQL. Không cho bỏ chi phí cần thiết chỉ vì required=false. Kiểm tra exception theo pricing policy khi có. Không tự đổi lịch Customer để hợp thức hóa kế hoạch.

Snapshot Request/Horse/plan/items/terms, sinh PDF private, VersionStatus ISSUED, CurrentVersionNo tương ứng, Request CONTRACT_READY, một Invoice DEPOSIT đúng version. Deadline từ policy được lưu thực tế, policy mới không tự sửa bản cũ.

201 data:

~~~json
{
  "requestId": "REQUEST_001",
  "contractId": "CONTRACT_001",
  "versionNo": 1,
  "invoiceId": "INVOICE_001",
  "requestStatus": "CONTRACT_READY",
  "total": 20000000,
  "depositPct": 40,
  "depositAmount": 8000000,
  "currency": "VND",
  "validUntil": "2026-10-23 14:00"
}
~~~

Không cấp ContractID mới cho mỗi version. Không yêu cầu PdfSha256 đã bỏ.

<!-- FLOW1_JSON_8_START -->

### F1-J29 — GET /manager/requests/{requestId}/contract-editor

Dữ liệu editor. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

Query `mode` (ROAD/AIR, optional) chọn phương thức để resolve defaults; không đổi draft khi GET. Role vẫn LOGISTICS_MANAGER.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "request": {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "status": "CONTRACT_PREPARATION",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": []
    },
    "customer": {
      "id": "USER_001",
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
      }
    ],
    "draft": null,
    "currentContract": null,
    "versions": [],
    "defaults": {
      "currency": "VND",
      "preparationDays": 7,
      "defaultDepositPct": 40,
      "contractDeadlineHours": 24,
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ]
    }
  }
}
```

**Response nhánh: 200 đã có draft**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "request": {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "status": "CONTRACT_PREPARATION",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": []
    },
    "customer": {
      "id": "USER_001",
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
      }
    ],
    "draft": {
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "budget": {
        "TRANSPORT": 12000000,
        "PROCEDURE": 2000000,
        "VET": 1000000,
        "INSURANCE": 1000000,
        "STAFF": 1000000
      },
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "depositPct": 40,
      "note": "",
      "exception": "",
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "savedAt": "2026-10-23 08:30"
    },
    "currentContract": null,
    "versions": [],
    "defaults": {
      "currency": "VND",
      "preparationDays": 7,
      "defaultDepositPct": 40,
      "contractDeadlineHours": 24,
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ]
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J30 — PUT /manager/requests/{requestId}/contract-draft

Lưu draft. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "mode": "AIR",
  "departAt": "2026-11-20 08:00",
  "arriveAt": "2026-11-21 18:00",
  "budget": {
    "TRANSPORT": 12000000,
    "PROCEDURE": 2000000,
    "VET": 1000000,
    "INSURANCE": 1000000,
    "STAFF": 1000000
  },
  "items": [
    {
      "desc": "Vận chuyển",
      "amount": 16000000,
      "required": true
    },
    {
      "desc": "Thủ tục",
      "amount": 2000000,
      "required": true
    },
    {
      "desc": "Chăm sóc thú y",
      "amount": 1000000,
      "required": true
    },
    {
      "desc": "Bảo hiểm",
      "amount": 1000000,
      "required": true
    }
  ],
  "depositPct": 40,
  "note": "",
  "exception": "",
  "terms": [
    {
      "title": "Phạm vi dịch vụ",
      "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
    },
    {
      "title": "Thanh toán",
      "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
    }
  ]
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "draft": {
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "budget": {
        "TRANSPORT": 12000000,
        "PROCEDURE": 2000000,
        "VET": 1000000,
        "INSURANCE": 1000000,
        "STAFF": 1000000
      },
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "depositPct": 40,
      "note": "",
      "exception": "",
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "savedAt": "2026-10-23 08:30"
    }
  }
}
```

**Quy tắc:** contractId/versionNo response do backend cấp; không gửi rowVersion. Không ghi đè snapshot ISSUED/SIGNED.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J31 — DELETE /manager/requests/{requestId}/contract-draft

Bỏ draft. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "discarded": true,
    "draft": null
  }
}
```

**Quy tắc:** Chỉ bỏ bản nháp, không xóa version đã phát hành/ký. DELETE vẫn trả JSON envelope 200, không 204.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J32 — POST /manager/requests/{requestId}/contract/publish

Phát hành. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "requestStatus": "CONTRACT_READY",
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "currency": "VND",
    "validUntil": "2026-10-24 09:00"
  }
}
```

**Response nhánh: 201 bản sửa v2 chưa có tiền ngăn thay bản**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 2,
    "invoiceId": "INVOICE_002",
    "requestStatus": "CONTRACT_READY",
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "currency": "VND",
    "validUntil": "2026-10-24 09:00"
  }
}
```

**Quy tắc:** Tạo PDF/snapshot/Invoice đúng version; tiền và deadline backend tính từ policy. Không tạo Trip.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J33 — GET /manager/contracts/{contractId}/versions/{versionNo}

Version cho Manager. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
    "items": [
      {
        "desc": "Vận chuyển",
        "amount": 16000000,
        "required": true
      },
      {
        "desc": "Thủ tục",
        "amount": 2000000,
        "required": true
      },
      {
        "desc": "Chăm sóc thú y",
        "amount": 1000000,
        "required": true
      },
      {
        "desc": "Bảo hiểm",
        "amount": 1000000,
        "required": true
      }
    ],
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "state": "ISSUED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
    "terms": [
      {
        "title": "Phạm vi dịch vụ",
        "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
      },
      {
        "title": "Thanh toán",
        "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
      }
    ],
    "mode": "AIR",
    "departAt": "2026-11-20 08:00",
    "arriveAt": "2026-11-21 18:00",
    "budget": {
      "TRANSPORT": 12000000,
      "PROCEDURE": 2000000,
      "VET": 1000000,
      "INSURANCE": 1000000,
      "STAFF": 1000000
    },
    "exception": "",
    "snapshot": {
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      },
      "supplier": {
        "legalName": "Đơn vị vận chuyển ngựa (dữ liệu minh họa)",
        "address": "Địa chỉ pháp lý đơn vị vận chuyển",
        "taxCode": "DEMO-TAX",
        "representative": "Đại diện bên cung cấp",
        "email": "transport@example.com",
        "phone": "+84900000000"
      },
      "contractId": "CONTRACT_001",
      "v": 1,
      "number": "CONTRACT_001",
      "issuedAt": "2026-10-23 09:00",
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "total": 20000000,
      "depositPct": 40,
      "validUntil": "2026-10-24 09:00",
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "currency": "VND"
    }
  }
}
```

**Quy tắc:** Bao gồm budget/exception/terms, không có contractVersion dạng base64.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

<!-- FLOW1_JSON_8_END -->

## 9. Customer xem, đồng ý hoặc phản hồi hợp đồng

| Method | Endpoint | Body |
|---|---|---|
| GET | /customer/requests/{requestId}/contract | — |
| GET | /customer/contracts/{contractId}/versions/{versionNo} | — |
| GET | /customer/contracts/{contractId}/versions/{versionNo}/pdf | — |
| POST | /customer/contracts/{contractId}/accept-terms | versionNo |
| POST | /customer/contracts/{contractId}/feedback | versionNo, text |

GET bản cũ trả đúng snapshot, không dựng từ giá/ngựa hiện tại. Customer không thấy draft/giá vốn. PDF binary, lỗi JSON.

Accept terms:

~~~json
{ "versionNo": 1 }
~~~

Đúng owner/version hiện hành còn hạn, không feedback chờ. Lưu acknowledgement theo version; chưa ký/xác nhận tiền/tạo Trip. Nơi lưu acknowledgement cần chốt mục 14, không giả định SQL đã có cột.

Feedback:

~~~json
{
  "versionNo": 1,
  "text": "Đề nghị điều chỉnh ngày và nội dung vận chuyển."
}
~~~

Text tự do lưu CustomerFeedback, FeedbackStatus PENDING; không FeedbackFields. Không tự sửa canonical từ text. Request UI CONTRACT_CHANGES_REQUESTED, khóa thanh toán mới. Chưa ký/chưa có tiền ngăn việc sửa thông thường.

Manager decision:

~~~http
POST /manager/contracts/{contractId}/feedback/decision
~~~

~~~json
{
  "versionNo": 1,
  "decision": "REJECTED",
  "text": "Giải thích phản hồi của Manager"
}
~~~

- REJECTED: từ chối sửa, giữ nội dung.
- ACCEPTED: chấp nhận xử lý; soạn/phát hành bản mới nếu thay nội dung.
- Nhãn Giữ bản/Phát hành bản sửa không phải enum SQL.
- Trả lời không tự gia hạn; version mới cần Customer đồng ý lại.
- Trả đơn về sửa đi qua request-changes đúng quyền/nội dung; text không tự thay Request.

Gia hạn:

~~~http
POST /manager/contracts/{contractId}/extend-deadline
~~~

~~~json
{
  "versionNo": 1,
  "reason": "Khách cần thêm thời gian hoàn tất"
}
~~~

Resolve thời lượng theo policy triển khai, lưu deadline/reason/actor/time; không hardcode FE. Không gia hạn đã ký/kết thúc/lịch không khả thi. Chỉ giữ deadline và metadata lần gia hạn gần nhất; không xây lịch sử nhiều lần.

Nhắc Customer:

~~~http
POST /manager/contracts/{contractId}/reminder
~~~

Không body. BE chọn đúng người, kiểm tra state/deadline/rate limit, ghi metadata nghiệp vụ; không nhận email tùy ý.

<!-- FLOW1_JSON_9_START -->

### F1-J34 — GET /customer/requests/{requestId}/contract

Hợp đồng hiện hành. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "currentVersion": {
      "contractId": "CONTRACT_001",
      "v": 1,
      "number": "CONTRACT_001",
      "issuedAt": "2026-10-23 09:00",
      "validUntil": "2026-10-24 09:00",
      "currency": "VND",
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "total": 20000000,
      "depositPct": 40,
      "depositAmount": 8000000,
      "state": "ISSUED",
      "note": "",
      "termsAcceptedAt": null,
      "signedAt": null,
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "snapshot": {
        "origin": "Ho Chi Minh City",
        "destination": "Tokyo",
        "date": "2026-11-20",
        "careNotes": "Chăm sóc theo hồ sơ đã chốt",
        "pickup": {
          "name": "Trại ngựa A",
          "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
          "postal": "700000",
          "contact": "Nguyen Van A",
          "phone": "+84901234567",
          "notes": "Gọi trước khi đến"
        },
        "delivery": {
          "name": "Tokyo Racecourse",
          "address": "Địa chỉ giao tại Tokyo",
          "postal": "1830024",
          "contact": "Yuki Tanaka",
          "phone": "+81312345678",
          "notes": ""
        },
        "horses": [
          {
            "id": "HORSE_001",
            "name": "Thunderbolt",
            "breed": "Thoroughbred",
            "microchip": "985112004571029",
            "passportNo": "VN-EQ-2020-1029"
          }
        ],
        "customer": {
          "id": "USER_001",
          "name": "Nguyen Van A",
          "company": "Trang trại A",
          "email": "customer@example.com",
          "phone": "+84901234567"
        },
        "supplier": {
          "legalName": "Đơn vị vận chuyển ngựa (dữ liệu minh họa)",
          "address": "Địa chỉ pháp lý đơn vị vận chuyển",
          "taxCode": "DEMO-TAX",
          "representative": "Đại diện bên cung cấp",
          "email": "transport@example.com",
          "phone": "+84900000000"
        },
        "contractId": "CONTRACT_001",
        "v": 1,
        "number": "CONTRACT_001",
        "issuedAt": "2026-10-23 09:00",
        "mode": "AIR",
        "departAt": "2026-11-20 08:00",
        "arriveAt": "2026-11-21 18:00",
        "total": 20000000,
        "depositPct": 40,
        "validUntil": "2026-10-24 09:00",
        "terms": [
          {
            "title": "Phạm vi dịch vụ",
            "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
          },
          {
            "title": "Thanh toán",
            "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
          }
        ],
        "items": [
          {
            "desc": "Vận chuyển",
            "amount": 16000000,
            "required": true
          },
          {
            "desc": "Thủ tục",
            "amount": 2000000,
            "required": true
          },
          {
            "desc": "Chăm sóc thú y",
            "amount": 1000000,
            "required": true
          },
          {
            "desc": "Bảo hiểm",
            "amount": 1000000,
            "required": true
          }
        ],
        "currency": "VND"
      }
    }
  }
}
```

**Response nhánh: 200 chưa có bản được phát hành**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "currentVersion": null
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J35 — GET /customer/contracts/{contractId}/versions/{versionNo}

Đọc snapshot phiên bản. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
    "items": [
      {
        "desc": "Vận chuyển",
        "amount": 16000000,
        "required": true
      },
      {
        "desc": "Thủ tục",
        "amount": 2000000,
        "required": true
      },
      {
        "desc": "Chăm sóc thú y",
        "amount": 1000000,
        "required": true
      },
      {
        "desc": "Bảo hiểm",
        "amount": 1000000,
        "required": true
      }
    ],
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "state": "ISSUED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
    "terms": [
      {
        "title": "Phạm vi dịch vụ",
        "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
      },
      {
        "title": "Thanh toán",
        "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
      }
    ],
    "mode": "AIR",
    "departAt": "2026-11-20 08:00",
    "arriveAt": "2026-11-21 18:00",
    "snapshot": {
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      },
      "supplier": {
        "legalName": "Đơn vị vận chuyển ngựa (dữ liệu minh họa)",
        "address": "Địa chỉ pháp lý đơn vị vận chuyển",
        "taxCode": "DEMO-TAX",
        "representative": "Đại diện bên cung cấp",
        "email": "transport@example.com",
        "phone": "+84900000000"
      },
      "contractId": "CONTRACT_001",
      "v": 1,
      "number": "CONTRACT_001",
      "issuedAt": "2026-10-23 09:00",
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "total": 20000000,
      "depositPct": 40,
      "validUntil": "2026-10-24 09:00",
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "currency": "VND"
    }
  }
}
```

**Response nhánh: 200 version cũ chỉ đọc**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
    "items": [
      {
        "desc": "Vận chuyển",
        "amount": 16000000,
        "required": true
      },
      {
        "desc": "Thủ tục",
        "amount": 2000000,
        "required": true
      },
      {
        "desc": "Chăm sóc thú y",
        "amount": 1000000,
        "required": true
      },
      {
        "desc": "Bảo hiểm",
        "amount": 1000000,
        "required": true
      }
    ],
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "state": "SUPERSEDED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
    "terms": [
      {
        "title": "Phạm vi dịch vụ",
        "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
      },
      {
        "title": "Thanh toán",
        "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
      }
    ],
    "mode": "AIR",
    "departAt": "2026-11-20 08:00",
    "arriveAt": "2026-11-21 18:00",
    "snapshot": {
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      },
      "supplier": {
        "legalName": "Đơn vị vận chuyển ngựa (dữ liệu minh họa)",
        "address": "Địa chỉ pháp lý đơn vị vận chuyển",
        "taxCode": "DEMO-TAX",
        "representative": "Đại diện bên cung cấp",
        "email": "transport@example.com",
        "phone": "+84900000000"
      },
      "contractId": "CONTRACT_001",
      "v": 1,
      "number": "CONTRACT_001",
      "issuedAt": "2026-10-23 09:00",
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "total": 20000000,
      "depositPct": 40,
      "validUntil": "2026-10-24 09:00",
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "currency": "VND"
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J36 — GET /customer/contracts/{contractId}/versions/{versionNo}/pdf

PDF hợp đồng. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="CONTRACT_001-V01.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J37 — POST /customer/contracts/{contractId}/accept-terms

Đồng ý điều khoản. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "termsAcceptedAt": "2026-10-23 09:10",
    "requestStatus": "CONTRACT_READY"
  }
}
```

**Quy tắc:** Lưu lần đồng ý đầu tiên bằng UTC vào CONTRACT_VERSION.TermsAcceptedAtUtc của đúng ContractID/VersionNo; Customer lấy từ CONTRACT.CustomerID và đối chiếu token. NULL là chưa đồng ý; retry giữ nguyên thời điểm đã ghi. Version mới mặc định NULL. Không sửa ContentSnapshot và không lưu lặp CustomerID/RequestID.

**Response lỗi 409 — CONTRACT_EXPIRED**

```json
{
  "success": false,
  "message": "Hợp đồng đã hết hạn hoàn tất",
  "errorCode": "CONTRACT_EXPIRED",
  "data": null
}
```

### F1-J38 — POST /customer/contracts/{contractId}/feedback

Yêu cầu sửa tự do. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "text": "Đề nghị xem lại khoản phí vận chuyển"
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "requestStatus": "CONTRACT_CHANGES_REQUESTED",
    "feedbackStatus": "PENDING",
    "change": {
      "at": "2026-10-23 09:05",
      "text": "Đề nghị xem lại khoản phí vận chuyển"
    }
  }
}
```

**Quy tắc:** Không thêm FeedbackFields. Text không tự thay canonical ngày/giá.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J39 — POST /manager/contracts/{contractId}/feedback/decision

Quyết định feedback. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "decision": "REJECTED",
  "text": "Giữ nội dung hiện tại theo thỏa thuận."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "decision": "REJECTED",
    "feedbackStatus": "REJECTED",
    "requestStatus": "CONTRACT_READY",
    "managerFeedback": "Giữ nội dung hiện tại theo thỏa thuận."
  }
}
```

**Response nhánh: 200 chấp nhận xử lý, chưa phát hành bản mới**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "decision": "ACCEPTED",
    "feedbackStatus": "ACCEPTED",
    "requestStatus": "CONTRACT_CHANGES_REQUESTED",
    "managerFeedback": "Sẽ soạn phiên bản mới."
  }
}
```

**Quy tắc:** ACCEPTED chưa phải bản mới đã phát hành; không mở thanh toán nhầm. Publish mới chuyển CONTRACT_READY.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J40 — POST /manager/contracts/{contractId}/extend-deadline

Gia hạn. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "reason": "Khách cần thêm thời gian hoàn tất."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "previousValidUntil": "2026-10-24 09:00",
    "validUntil": "2026-10-25 09:00",
    "reason": "Khách cần thêm thời gian hoàn tất.",
    "by": "USER_004",
    "at": "2026-10-24 08:30"
  }
}
```


**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J41 — POST /manager/contracts/{contractId}/reminder

Nhắc hoàn tất. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "notificationId": "NOTIFICATION_003",
    "queued": true
  }
}
```

**Quy tắc:** queued không có nghĩa email đã giao; đích nhận từ backend, không nhận email tùy ý.

**Response lỗi 429 — RATE_LIMITED**

```json
{
  "success": false,
  "message": "Thao tác vượt giới hạn, vui lòng thử lại",
  "errorCode": "RATE_LIMITED",
  "data": null
}
```

<!-- FLOW1_JSON_9_END -->

## 10. Cọc và xác minh

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /customer/requests/{requestId}/deposit | Nghĩa vụ cọc/giao dịch |
| POST | /customer/invoices/{invoiceId}/payment-session | Tạo giao dịch |
| GET | /customer/payments/{paymentId} | Trạng thái |
| GET | /manager/payments | Trang thanh toán |
| GET | /manager/payments/{paymentId} | Chi tiết |
| GET | /customer/payments/{paymentId}/receipt | Biên nhận xác minh |

Deposit data:

~~~json
{
  "requestId": "REQUEST_001",
  "contractId": "CONTRACT_001",
  "versionNo": 1,
  "invoiceId": "INVOICE_001",
  "currency": "VND",
  "requiredAmount": 8000000,
  "paidAmount": 0,
  "remainingAmount": 8000000,
  "validUntil": "2026-10-23 14:00",
  "canPay": true,
  "transactions": []
}
~~~

canPay cần bản đã đồng ý, còn hạn, chưa hủy/ký/kết thúc, còn phải thu. remainingAmount = max(0,requiredAmount - paidAmount đã xác minh). Pending chưa là tiền nhận.

Session body:

~~~json
{ "method": "VNPAY" }
~~~

BE lấy amount/currency/version/return URL từ Invoice/cấu hình, không nhận FE tùy ý; chống session song song trái quy tắc.

201 data:

~~~json
{
  "id": "PAYMENT_001",
  "invoiceId": "INVOICE_001",
  "amount": 8000000,
  "currency": "VND",
  "method": "VNPAY",
  "status": "PENDING_GATEWAY",
  "paymentUrl": "https://provider.example/payment-session",
  "expiresAt": "2026-10-22 14:15"
}
~~~


| DB nhánh VNPay | UI Customer |
|---|---|
| PENDING_GATEWAY | PROCESSING |
| REVIEW_REQUIRED | PROCESSING kèm cảnh báo đối soát |
| SUCCESS | SUCCESS |
| FAILED | FAILED |






Không có thao tác Manager confirm/reject; kết quả thu tiền chỉ do IPN đã xác minh cập nhật.

Đủ cọc → Request DEPOSIT_VERIFIED; version chưa SIGNED, chưa Trip. Invoice gắn đúng ContractID/ContractVersionNo; không dùng tiền bản khác mở ký bản hiện hành.

Callback/IPN VNPay xác thực merchant/reference/amount/signature/kết quả theo module provider. Browser Return URL không xác nhận tiền, FE refetch REST sau quay về. Callback trùng không cộng lặp; sandbox store độc lập chưa phải giao dịch nghiệp vụ Invoice.

<!-- FLOW1_JSON_10_START -->

### F1-J42 — GET /customer/requests/{requestId}/deposit

Nghĩa vụ tiền cọc. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "currency": "VND",
    "requiredAmount": 8000000,
    "paidAmount": 0,
    "remainingAmount": 8000000,
    "validUntil": "2026-10-24 09:00",
    "canPay": true,
    "transactions": []
  }
}
```

**Response nhánh: 200 đang chờ provider**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "currency": "VND",
    "requiredAmount": 8000000,
    "paidAmount": 0,
    "remainingAmount": 8000000,
    "validUntil": "2026-10-24 09:00",
    "canPay": false,
    "transactions": [
      {
        "id": "PAYMENT_001",
        "type": "DEPOSIT",
        "method": "VNPAY",
        "amount": 8000000,
        "status": "PROCESSING",
        "createdAt": "2026-10-23 09:15",
        "invoiceId": "INVOICE_001",
        "contractId": "CONTRACT_001",
        "versionNo": 1,
        "currency": "VND",
        "providerStatus": "PENDING_GATEWAY"
      }
    ]
  }
}
```

**Response nhánh: 200 đã nhận một phần**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "currency": "VND",
    "requiredAmount": 8000000,
    "paidAmount": 4000000,
    "remainingAmount": 4000000,
    "validUntil": "2026-10-24 09:00",
    "canPay": true,
    "transactions": []
  }
}
```

**Response nhánh: 200 quá hạn, chưa đủ cọc**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "currency": "VND",
    "requiredAmount": 8000000,
    "paidAmount": 0,
    "remainingAmount": 8000000,
    "validUntil": "2026-10-24 09:00",
    "canPay": false,
    "transactions": []
  }
}
```

**Quy tắc:** canPay=false khi chưa đồng ý/còn payment chờ/quá hạn/hủy hoặc không còn phải thu; tính ở backend.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J43 — POST /customer/invoices/{invoiceId}/payment-session

Tạo session. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| invoiceId | INVOICE_001 |

**Request JSON**

```json
{
  "method": "VNPAY"
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "invoiceId": "INVOICE_001",
    "amount": 8000000,
    "currency": "VND",
    "method": "VNPAY",
    "status": "PENDING_GATEWAY",
    "paymentUrl": "https://sandbox.example.test/pay/PAYMENT_001",
    "expiresAt": "2026-10-23 09:30"
  }
}
```


**Response lỗi 409 — CONTRACT_EXPIRED**

```json
{
  "success": false,
  "message": "Hợp đồng đã hết hạn hoàn tất",
  "errorCode": "CONTRACT_EXPIRED",
  "data": null
}
```

### F1-J44 — GET /customer/payments/{paymentId}

Trạng thái cho Customer. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "PROCESSING",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "PENDING_GATEWAY"
  }
}
```

**Response nhánh: 200 provider đã xác minh**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "SUCCESS",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "SUCCESS",
    "confirmedAt": "2026-10-23 09:20"
  }
}
```

**Response nhánh: 200 cần đối soát**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "PROCESSING",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "REVIEW_REQUIRED",
    "reason": "Cần đối chiếu kết quả provider"
  }
}
```

**Quy tắc:** status UI PROCESSING, providerStatus trạng thái canonical; không ghi PROCESSING vào nhánh SQL chỉ cho PENDING_GATEWAY/SUCCESS/FAILED/REVIEW_REQUIRED.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J45 — GET /manager/payments

Danh sách giao dịch Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PAYMENT_002",
      "requestId": "REQUEST_001",
      "type": "DEPOSIT",
      "method": "VNPAY",
      "amount": 8000000,
      "status": "PROCESSING",
      "createdAt": "2026-10-23 09:15",
      "invoiceId": "INVOICE_001",
      "contractId": "CONTRACT_001",
      "versionNo": 1,
      "currency": "VND",
      "providerStatus": "PENDING_GATEWAY"
    },
    {
      "id": "CONTRACT_002",
      "contractId": "CONTRACT_002",
      "requestId": "REQUEST_002",
      "versionNo": 1,
      "type": "REFUND",
      "status": "PENDING_CONFIRMATION",
      "currency": "VND",
      "rowKind": "CONTRACT_REFUND",
      "refundStatus": "REQUESTED"
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```




**Projection hoàn tiền:** rowKind=CONTRACT_REFUND lấy từ CONTRACT.Refund*, id bằng ContractID; đây là khóa dòng UI, không PaymentID và không phải một Payment REFUND tự sinh. Nút ghi nhận status gọi F1-J55 qua contractId, không chuyển tiền. refundStatus đọc trực tiếp CONTRACT.RefundStatus; status=PENDING_CONFIRMATION chỉ là nhãn tương thích danh sách UI khi REQUESTED/PROCESSING, COMPLETED hiển thị SUCCESS. Amount/time/reference không bắt buộc và không được bịa nếu chưa lưu. GET payment detail/receipt không nhận dòng projection này. Nếu backend không cung cấp projection thì không dựng hàng đợi từ dữ liệu giả.

### F1-J46 — GET /manager/payments/{paymentId}

Chi tiết giao dịch. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_002",
    "requestId": "REQUEST_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "PROCESSING",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "PENDING_GATEWAY"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J49 — GET /customer/payments/{paymentId}/receipt

Biên nhận đã xác minh. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="PAYMENT_001-receipt.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Quy tắc:** Không có biên nhận xác minh thì 404, không lấy proof upload làm receipt tự động.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

<!-- FLOW1_JSON_10_END -->

## 11. OTP và ký

Gửi:

~~~http
POST /customer/contracts/{contractId}/sign-otp
~~~

~~~json
{ "versionNo": 1 }
~~~

200 data:

~~~json
{
  "contractId": "CONTRACT_001",
  "versionNo": 1,
  "sentTo": "a***@example.com",
  "expiresInSeconds": 120,
  "resendAfterSeconds": 60
}
~~~

Thời lượng ví dụ; resolve policy. Không nhận pdfSha256/rowVersion. Chỉ BE sinh OTP/lưu SignOtpHash; không dùng DEMO_OTP làm secret thật.

Ký:

~~~http
POST /customer/contracts/{contractId}/sign
~~~

~~~json
{
  "versionNo": 1,
  "otp": "482913"
}
~~~

Kiểm tra owner/version ISSUED hiện hành/đã đồng ý/đủ cọc đúng Invoice-version/còn hạn/OTP hợp lệ/chưa vượt attempts/không hủy hoặc feedback chờ.

Cùng transaction:

1. VersionStatus SIGNED, signer/time.
2. Xóa OTP hash sau dùng; giữ metadata ký cần thiết.
3. Cập nhật vòng đời hợp đồng tổng.
4. Request ACTIVATED.
5. Một Trip PLANNING, unique RequestID.
6. Gắn TripID vào Contract, commit rồi notification.

200 data:

~~~json
{
  "requestId": "REQUEST_001",
  "contractId": "CONTRACT_001",
  "versionNo": 1,
  "requestStatus": "ACTIVATED",
  "versionStatus": "SIGNED",
  "tripId": "TRIP_001",
  "tripStatus": "PLANNING",
  "signedAt": "2026-10-22 14:20"
}
~~~

Retry trả hiện trạng hoặc conflict có thể GET lại, không tạo Trip/chữ ký/tiền thứ hai. Không API FE tự activate. Quá hạn khóa thao tác mới, không tự xóa tiền/chữ ký hoặc auto-cancel.

<!-- FLOW1_JSON_11_START -->

### F1-J50 — POST /customer/contracts/{contractId}/sign-otp

Gửi OTP ký. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "sentTo": "c***@example.com",
    "expiresInSeconds": 120,
    "resendAfterSeconds": 60
  }
}
```

**Quy tắc:** Chỉ sau đủ cọc đúng version, còn hạn và đã đồng ý. TTL/resend/attempts từ policy; không mã demo cố định.

**Response lỗi 409 — DEPOSIT_NOT_VERIFIED**

```json
{
  "success": false,
  "message": "Chưa xác minh đủ cọc của phiên bản hiện hành",
  "errorCode": "DEPOSIT_NOT_VERIFIED",
  "data": null
}
```

### F1-J51 — POST /customer/contracts/{contractId}/sign

Ký và tạo một Trip. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "otp": "482913"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "requestStatus": "ACTIVATED",
    "versionStatus": "SIGNED",
    "tripId": "TRIP_001",
    "tripStatus": "PLANNING",
    "signedAt": "2026-10-23 09:25"
  }
}
```

**Quy tắc:** VersionNo là integer, không RowVersion/base64; không gửi pdfSha256. Atomic signature/Request/Trip; không cộng tiền ở bước ký.

**Response lỗi 400 — OTP_INVALID_OR_EXPIRED**

```json
{
  "success": false,
  "message": "OTP không đúng hoặc đã hết hạn",
  "errorCode": "OTP_INVALID_OR_EXPIRED",
  "data": null
}
```

<!-- FLOW1_JSON_11_END -->

## 12. Hủy và hoàn tiền Flow 1

| Method | Endpoint | Body |
|---|---|---|
| POST | /customer/requests/{requestId}/cancel | reason |
| POST | /manager/requests/{requestId}/cancel | reason |
| POST | /manager/contracts/{contractId}/cancellation/decision | decision, reason |
| POST | /manager/contracts/{contractId}/refund/complete | Không body; cập nhật status |

- Chưa ký và chưa nhận cọc đã xác minh: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã ký/kích hoạt Trip không dùng quy trình hủy trước ký này.
- Có tiền chờ/đã nhận: đối soát và giữ nghĩa vụ tài chính, không xóa Payment.
- Cancellation SQL PENDING/APPROVED/REJECTED; decision APPROVED/REJECTED khi pending.
- Refund SQL REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED.
- Phạm vi Flow 1 chỉ theo dõi RefundStatus trên CONTRACT: REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED. Không gọi API hoàn tiền VNPay, không xây quy trình chuyển tiền/chứng từ. COMPLETED là trạng thái do Manager ghi nhận thủ công, không phải chứng minh hệ thống đã chuyển tiền. Amount/reference nếu có chỉ là metadata tùy chọn; duyệt hủy không tự chuyển COMPLETED.
- Không tự đặt phí hủy/hoàn bằng 0 khi chưa có chính sách.
- Không xóa Invoice/Payment/ContractVersion; callback sau hủy không tự kích hoạt lại.
- Đã triển khai/đang chạy không hủy Flow 1 mà bỏ qua an toàn/flow vận hành.
- Không thêm bảng/luồng hoàn tiền Flow 1; J55 chỉ ghi nhận status trên CONTRACT, không phải lệnh chuyển tiền.

<!-- FLOW1_JSON_12_START -->

### F1-J52 — POST /customer/requests/{requestId}/cancel

Customer hủy/đề nghị hủy. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không còn nhu cầu vận chuyển."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "status": "CANCELLED",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Response nhánh: 200 đã nhận cọc đã xác minh, chờ Manager duyệt**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "requestStatus": "CANCELLATION_REQUESTED",
    "cancellationStatus": "PENDING",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Quy tắc:** Chưa ký và chưa nhận cọc đã xác minh: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã ký/kích hoạt Trip không dùng quy trình hủy trước ký này. Lưu lý do/người yêu cầu/thời điểm tại Request cho cả hai nhánh; nhánh hủy ngay để CancellationPreviousStatus NULL và không tạo Contract giả. Tiền cọc lấy từ PAYMENT đã xác minh, không tin FE; pending gateway không tính là đã nhận. Chặn phiên thanh toán mới và ký khi đang chờ hủy; callback trong lúc chờ hủy đưa đối soát, không ghi đè trạng thái chờ. Quyết định và tiền được kiểm tra trong transaction, retry không ghi đè prevStatus. Metadata lý do/thời điểm yêu cầu trên Contract là bản đồng bộ từ Request cho nhánh PENDING, không phải nguồn thứ hai; khi yêu cầu mới sau lần từ chối, reset metadata quyết định cũ và ghi prevStatus mới trong cùng transaction.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J53 — POST /manager/requests/{requestId}/cancel

Manager hủy. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không còn nhu cầu vận chuyển."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "status": "CANCELLED",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Quy tắc:** Lưu lý do/actor/thời điểm ở Request; chỉ hủy trực tiếp trước ký khi chưa có cọc đã xác minh. Nếu đã nhận cọc thì xử lý yêu cầu PENDING qua J54, không dùng J53 để bỏ qua bước quyết định. Tiền đang chờ không phải cọc đã nhận; callback đến sau hủy phải đối soát.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J54 — POST /manager/contracts/{contractId}/cancellation/decision

Quyết định hủy. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "decision": "APPROVED",
  "reason": "Đã đối soát và chấp thuận hủy."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "cancellationStatus": "APPROVED",
    "requestStatus": "CANCELLED",
    "decisionReason": "Đã đối soát và chấp thuận hủy."
  }
}
```

**Response nhánh: 200 từ chối, phục hồi trạng thái trước đề nghị**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "cancellationStatus": "REJECTED",
    "requestStatus": "DEPOSIT_VERIFIED",
    "decisionReason": "Chưa đủ điều kiện hủy."
  }
}
```

**Quy tắc:** Chỉ xử lý yêu cầu hủy đang PENDING có cọc đã xác minh. Giá trị phục hồi lấy TRANSPORT_REQUEST.CancellationPreviousStatus, không luôn DEPOSIT_VERIFIED. Actor/thời điểm/lý do quyết định lưu ở CONTRACT.CancellationDecidedBy/AtUtc/DecisionReason; cập nhật Request và Contract trong một transaction. Nếu có tiền mới đến trong lúc chờ thì giữ cờ đối soát và không ghi đè prevStatus. Duyệt hủy chỉ đánh dấu RefundStatus REQUESTED khi có nghĩa vụ hoàn; không tự COMPLETED và không tự tính khoản hoàn chưa thỏa thuận.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J55 — POST /manager/contracts/{contractId}/refund/complete

Ghi nhận trạng thái hoàn tiền (không chuyển tiền). Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "Đã cập nhật trạng thái hoàn tiền",
  "data": {
    "contractId": "CONTRACT_001",
    "refundStatus": "COMPLETED"
  }
}
```

**Quy tắc:** Phạm vi Flow 1 chỉ theo dõi RefundStatus trên CONTRACT: REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED. Không gọi API hoàn tiền VNPay, không xây quy trình chuyển tiền/chứng từ. COMPLETED là trạng thái do Manager ghi nhận thủ công, không phải chứng minh hệ thống đã chuyển tiền. Amount/reference nếu có chỉ là metadata tùy chọn; duyệt hủy không tự chuyển COMPLETED. Chỉ cập nhật sau duyệt hủy và khi RefundStatus đang REQUESTED/PROCESSING; retry COMPLETED trả trạng thái hiện tại, không tạo giao dịch hoặc Payment mới. Giữ path cũ để tương thích.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

<!-- FLOW1_JSON_12_END -->

## 13. Phân công triển khai

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /manager/trips | Danh sách |
| GET | /manager/trips/{tripId} | Chi tiết |
| POST | /manager/trips/{tripId}/assignment | Chọn người |
| POST | /manager/trips/{tripId}/hold | Theo guard hold/resume; cần kiểm chứng backend |
| POST | /manager/trips/{tripId}/resume | Theo guard hold/resume; cần kiểm chứng backend |

Assignment:

~~~json
{
  "specialistId": "USER_005",
  "coordinatorId": "USER_006"
}
~~~

Kiểm tra PLANNING/đã ký/đủ cọc/nhân sự hoạt động đúng role và khả năng nhận việc. Lưu USER_* FK, tạo handoff/task sau commit, chống giao việc trùng.

| SQL | FE |
|---|---|
| PENDING hoặc chưa khởi tạo | NOT_CONFIRMED |
| CONFIRMED | CONFIRMED |
| ON_HOLD | ON_HOLD |

Canonical role và DTO cùng dùng FLEET_ROUTE_COORDINATOR; không tạo role thứ hai để né tên. Specialist TRANSPORT_SPECIALIST.

Trip Manager: id/requestId/mode/status/deployment/plannedDepart/eta/readiness/milestones. route/flight/handover chưa có thì bỏ, không fake. Mới tạo PLANNING không mặc định readiness đủ.

**Quy tắc hold/resume:** ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/metadata do backend thực hiện.

Hold body reason, resume không body; chỉ trước khởi hành. Không dùng Flow 1 đưa IN_TRANSIT về PLANNING. Assignment/resume không tự READY_TO_DEPART.

<!-- FLOW1_JSON_13_START -->

### F1-J56 — GET /manager/trips

Danh sách Trip. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": {
        "status": "NOT_CONFIRMED"
      },
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "readiness": {
        "docsReady": 0,
        "docsTotal": 0,
        "insurance": "MISSING",
        "quarantineOk": false
      },
      "milestones": []
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J57 — GET /manager/trips/{tripId}

Chi tiết Trip. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "NOT_CONFIRMED"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 0,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "milestones": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J58 — POST /manager/trips/{tripId}/assignment

Giao việc. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request JSON**

```json
{
  "specialistId": "USER_005",
  "coordinatorId": "USER_006"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "at": "2026-10-23 09:40"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 0,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "milestones": []
  }
}
```

**Quy tắc:** DTO/UI role mapping rõ; FK USER_*. Sau commit mới task/handoff, không tự READY_TO_DEPART.

**Response lỗi 409 — TRIP_ALREADY_ASSIGNED**

```json
{
  "success": false,
  "message": "Trip đã được phân công",
  "errorCode": "TRIP_ALREADY_ASSIGNED",
  "data": null
}
```

### F1-J59 — POST /manager/trips/{tripId}/hold

Tạm dừng. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Điều kiện thực hiện:** ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/metadata do backend thực hiện.

**Request JSON**

```json
{
  "reason": "Chờ xác nhận lịch triển khai."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "status": "PLANNING",
    "deployment": {
      "status": "ON_HOLD"
    }
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng tạm dừng/tiếp tục chưa được hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J60 — POST /manager/trips/{tripId}/resume

Tiếp tục. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Điều kiện thực hiện:** ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/metadata do backend thực hiện.

**Request body:** Không gửi body.

**Quy tắc:** Body không có. Không force READY_TO_DEPART, không rollback IN_TRANSIT.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED"
    }
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng tạm dừng/tiếp tục chưa được hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

<!-- FLOW1_JSON_13_END -->

## 14. Khoảng trống phải chốt trước implementation

Đây là giới hạn thực tế UI–SQL, không phải tuyên bố đã có persistence/API chạy được.

| Điểm | Cách xử lý |
|---|---|
| FE còn rowVersion/pdfSha256/token giả | Bỏ request/type liên quan |
| FE tự cấp ID | Dùng ID BE trả; local draft key khác ID thật |
| FE tự xác minh tiền/ký/tạo Trip | Dùng response backend |
| FE còn USD/default cũ | VND gồm declared value, không FX suy đoán |
| FE còn dự toán Customer | Bỏ UI/công thức/caller |
| Role/enum UI khác DB | Mapping DTO rõ, không ghi tùy ý vào CHECK |
| Yêu cầu sửa đơn | Chỉ feedback → TRANSPORT_REQUEST.RevisionFeedback; không giới hạn nhóm field |
| Version hợp đồng | Một ContractID/tăng VersionNo, Invoice đúng bản |
| Mutation báo ok trước API | async/await, lỗi/refetch; không nuốt lỗi thành mock/empty real mode |
| ON_HOLD | SQL cho phép; kiểm tra quyền/guard, giữ event/phân công; không khởi hành |
| Color/ngày tiêm/bác sĩ và một số field Horse chưa có cột | Trả null + unsupportedFields, khóa field; không sửa DB |
| Accept terms | CONTRACT_VERSION.TermsAcceptedAtUtc nullable, UTC, đúng version; Customer suy từ Contract |
| Refund Flow 1 | Chỉ CONTRACT.RefundStatus; không chuyển tiền, không bắt buộc chứng từ |
| Mark-read/nhắc/đồng bộ hai role | NOTIFICATION/API có quyền và refresh phù hợp, không local state đơn lẻ |

Giữ snapshot phát hành/ký bất biến, không sửa chỉ để đổi mã/đổi nội dung hiện tại. Không tự áp dụng SQL vào database đang chạy; backend cần triển khai theo hợp đồng. Frontend chỉ dùng chức năng được API xác nhận, các phần thiếu được liệt kê để theo dõi.

## 15. Lỗi và nghiệm thu

| HTTP | errorCode tiêu biểu |
|---|---|
| 400 | VALIDATION_ERROR, UNSUPPORTED_ROUTE, REQUIRED_DOCUMENT_MISSING |
| 401 | UNAUTHORIZED, TOKEN_EXPIRED |
| 403 | FORBIDDEN_ROLE |
| 404 | NOT_FOUND |
| 409 | INVALID_STATE, HORSE_SCHEDULE_CONFLICT, CONTRACT_NOT_CURRENT |
| 409 | PAYMENT_RECONCILIATION_REQUIRED, CONTRACT_EXPIRED, DEPOSIT_NOT_VERIFIED |
| 409 | PAYMENT_ALREADY_PROCESSED, TRIP_ALREADY_ASSIGNED |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_ERROR, BUSINESS_POLICY_CONFIGURATION_ERROR |

Không biến thiếu/sai policy thành lỗi Customer; BE log cấu hình. Không trả OTP hash/provider secret/đường dẫn server trong lỗi.

| Kịch bản | Kết quả cần có |
|---|---|
| Wizard | Không dự toán giá; chuyến/địa điểm/ngựa trước gửi |
| Create/retry | Một Request, ID BE, không trùng |
| Ngựa khác chủ/trùng mapping | Chặn |
| Thiếu hồ sơ Customer | Chặn; thiếu hồ sơ công ty không tự chặn |
| Manager accept | CONTRACT_PREPARATION, chưa Trip |
| Quyết định đồng thời | Chỉ một kết quả hợp lệ |
| Draft hợp đồng | Customer chưa đọc được |
| Publish | Snapshot/PDF + ISSUED + Invoice DEPOSIT đúng version |
| Sửa version | Bản cũ bất biến, tăng VersionNo |
| Xem cũ | Đúng snapshot, Customer không giá vốn |
| Policy đổi sau phát hành | Tiền/deadline đã chốt không tự đổi |
| Feedback | Text tự do, không FeedbackFields; không tự sửa canonical |
| Return URL/proof giả success | Chưa tiền/chưa mở ký |
| Cọc một phần | Chưa DEPOSIT_VERIFIED |
| Đủ cọc | DEPOSIT_VERIFIED, chưa Trip |
| OTP sai/hết hạn/vượt attempts | Chặn theo policy |
| Ký/retry | SIGNED + ACTIVATED + một Trip PLANNING |
| Quá hạn | Khóa mới, không auto-cancel/xóa |
| Callback sau hủy | Đối soát, không tự kích hoạt |
| Assignment | USER_* đúng role, task/handoff không trùng |
| Hold/resume | Kiểm tra ON_HOLD, metadata, resume CONFIRMED và cấm hold sau khởi hành |
| Refresh/reconnect/đổi tài khoản | Dữ liệu server đúng quyền, không dựa mock/local |

**Phạm vi xác minh:** đọc SQL/ID rule và source frontend; chưa chạy SQL/backend/provider/UAT. Các dependency ở mục 14 phải giải quyết trước khi coi contract đủ cho hai bên code độc lập hoàn toàn.

## 16. Bổ sung để khớp frontend

### F1-J61 — POST /manager/requests/{requestId}/cost-estimate

Dự toán chi phí nội bộ theo lịch trình đang soạn. Role: **LOGISTICS_MANAGER**.

**Request JSON**

```json
{
  "transportMode": "AIR",
  "departureAt": "2026-11-20 08:00",
  "deliveryAt": "2026-11-21 18:00"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "costs": {
      "transport": 12000000,
      "crew": 1000000,
      "permit": 2000000,
      "vet": 1000000,
      "insurance": 1000000,
      "total": 17000000
    },
    "days": 2,
    "stableNights": 1,
    "crewCount": 2,
    "doctorCount": 1,
    "vehicleCount": 1,
    "roadDistanceKm": 150,
    "insuredValueVnd": 120000000,
    "minimumInsuranceAssumed": false,
    "currency": "VND"
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J62 — POST /customer/notifications/{notificationId}/read

Đánh dấu một thông báo đã đọc. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "NOTIFICATION_001",
    "read": true
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J63 — POST /customer/notifications/read-all

Đánh dấu toàn bộ thông báo đã đọc. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updatedCount": 2,
    "readAt": "2026-10-23 10:00"
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J64 — POST /manager/notifications/{notificationId}/read

Đánh dấu một thông báo đã đọc. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "NOTIFICATION_001",
    "read": true
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J65 — POST /manager/notifications/read-all

Đánh dấu toàn bộ thông báo đã đọc. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updatedCount": 2,
    "readAt": "2026-10-23 10:00"
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

## 17. Giới hạn và nghiệm thu tích hợp

Xem quy tắc triển khai và giới hạn được chốt tại [FLOW1-API-JSON.md, mục 15](FLOW1-API-JSON.md#15-quy-tắc-triển-khai-đã-chốt). Các khoảng trống ở mục 14 không phải yêu cầu sửa DB/backend trong công việc này.


### Ma trận bàn giao sau chỉnh sửa frontend

| Màn hình / thao tác | API và dữ liệu chuẩn | Hành vi khi chưa hỗ trợ |
|---|---|---|
| Tạo đơn | J09 options; J18 tạo DRAFT; J19 lưu field được phép | Hiện lỗi, không tự tạo RequestID hoặc ước tính giá |
| Chọn ngựa | J02 hồ sơ đầy đủ; J14 khả dụng theo ngày và excludeRequestId | Không tự trộn ngựa mẫu hoặc cho ngựa chưa xác nhận khả dụng |
| Hồ sơ ngựa | J12/J13 core JSON; J15 file thật; J17 hồ sơ gắn Request–Horse | Không giả file đã lưu; color/fluDate/vetName/vetPhone trả null + unsupportedFields và khóa ô |
| Xem lại/gửi | J19 lưu; J23 checklist; J20 submit | Checklist chặn gửi khi thiếu giấy tờ; dùng Request response thật |
| Manager xét duyệt | J24/J25 đọc; J26/J27/J28 quyết định | Chỉ báo thành công sau API; sửa đơn chỉ dùng feedback, không khóa nhóm field |
| Soạn hợp đồng | J29 dữ liệu editor và policy; J61 tính chi phí; J30 draft; J32 publish | Không sửa lịch âm thầm hoặc tự điền chi phí giả; versionNo/deadline lấy BE |
| Xem phiên bản hợp đồng | J34/J35/J33 snapshot; J36 PDF có quyền | Thiếu snapshot thì khóa chấp thuận/ký; tải PDF lỗi không thay bằng bản in hiện tại |
| Điều khoản/phản hồi/gia hạn | J37/J38/J39/J40/J41 | Không tự gia hạn khi giữ bản cũ; gia hạn có lý do riêng |
| Cọc | J42 nghĩa vụ; J43 session VNPAY; J44 trạng thái | Return không xác nhận tiền; bỏ QR minh họa và mock-deposit khỏi flow |
| Hoàn tiền | Projection CONTRACT_REFUND tại J45; J55 theo contractId, không body; cập nhật status | Không tạo Payment REFUND giả; API chỉ ghi nhận status, không chuyển tiền |
| OTP | J50 TTL/resend từ API; J51 ký đúng version | Không mã bypass; không tự tạo Trip hoặc giả trạng thái ACTIVATED |
| Phân công | J56/J57 Trip thật; J06 role chuẩn; J58 assignment | Không thay nhân viên bằng USER cố định; hold/resume theo guard ON_HOLD; cần kiểm chứng backend |
| Thông báo | J03/J07; J62–J65 mark-read | Chờ API, không chỉ sửa read trong bộ nhớ |


## 18. Tệp hồ sơ cho quản lý

### F1-J66 — GET /manager/requests/{requestId}/horses/{horseId}/documents/{documentType}/file

Đọc hồ sơ ngựa trong đơn để xét duyệt. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |
| horseId | HORSE_001 |
| documentType | PASSPORT |

**Request body:** Không gửi body.

**Response 200 — binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="passport.pdf"

<bytes của tài liệu thực đã lưu>
```

Content-Type có thể application/pdf, image/jpeg hoặc image/png theo tệp đã kiểm tra. BE kiểm tra role và mapping Request–Horse; đọc đúng LEGAL_MEDICAL_RECORD hoặc hồ sơ ngựa được tham chiếu. Không tạo bản ghi khi GET. DossierItem.file trả URL này; FE tải blob bằng Bearer token, không mở trang minh họa thay tài liệu thật.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hồ sơ trong đơn hoặc không có quyền xem",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

## 19. Quy tắc tính và đối soát

Quy tắc tính dự toán và cộng cọc đúng phiên bản: [FLOW1-API-JSON.md, mục 17](FLOW1-API-JSON.md#17-công-thức-dự-toán-nội-bộ).

## 20. Thông báo thanh toán VNPay

### F1-J67 — GET /payments/vnpay/ipn

Nhận thông báo server-to-server từ VNPay. Không dùng Bearer token Customer; xác thực bằng chữ ký provider. Path thống nhất endpoint sandbox hiện có, phần tích hợp Invoice/Contract là thiết kế đích.

**Request body:** Không gửi body. Query nhận nguyên bộ tham số vnp_* do VNPay ký, gồm vnp_TmnCode, vnp_TxnRef, vnp_Amount, vnp_ResponseCode, vnp_TransactionStatus, vnp_TransactionNo, vnp_SecureHash và các tham số provider khác. Không cắt bỏ tham số trước khi kiểm tra chữ ký, từ chối query trùng khóa. vnp_Amount theo đơn vị provider, quy đổi đúng về VND để so khớp PAYMENT.Amount.

**Response 200 — JSON provider, không dùng success/message/data**

```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

**Quy tắc:** Kiểm tra chữ ký, merchant, TxnRef đã lưu, amount/currency, Invoice và ContractVersion. Chỉ SUCCESS khi responseCode và transactionStatus cùng 00. Khóa giao dịch khi cập nhật PAYMENT và tính lại INVOICE.PaidAmount từ PAYMENT SUCCESS của đúng invoice/version; callback lặp không cộng tiền hai lần. Chỉ DEPOSIT_VERIFIED khi đủ cọc và Request còn hợp lệ; không tự tạo Trip. Callback sau hủy, trong lúc chờ hủy hoặc quá hạn phải giữ bằng chứng tiền, bật FinancialReviewRequired và không mở ký/kích hoạt. Payload không hợp lệ không được ghi SUCCESS; lỗi lưu trữ không trả xác nhận thành công. RspCode dùng hợp đồng adapter VNPay: 00 đã xử lý, 01 không thấy giao dịch, 02 đã xử lý, 04 sai số tiền, 97 sai xác thực, 99 lỗi khác. Các mã provider là chuỗi, không phải HTTP status. Browser Return chỉ đọc kết quả đã lưu; Customer kiểm tra bằng J44.

## Kiểm tra bộ hợp đồng hiện hành

Chạy `python contracts/API-Flow/Flow1/build_openapi.py` rồi `python contracts/API-Flow/Flow1/validate_contract.py`. Có 65 operation: bỏ J47/J48 thủ công, thêm J67 IPN; giữ số J cũ để không làm sai tham chiếu. Bộ kiểm tra frontend cũ có thể còn kỳ vọng 66 operation/J47 và phải được cập nhật khi tích hợp frontend; không dùng kết quả đó để xác nhận backend đã hỗ trợ.
