# API Contract — Flow 1

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 Draft — baseline thống nhất trong cuộc trao đổi |
| Ngày | 22/10/2026 |
| Dự án | Racehorse Transport System |
| Phạm vi | Tạo đơn → xét duyệt → hợp đồng → cọc → OTP → kích hoạt → phân công; sửa/hủy liên quan |
| Căn cứ | Màn hình, form, thao tác và types frontend; ID_NAME_RULE.md; HorseTransportDB.sql |
| Trạng thái | Thiết kế API mới; chưa xác nhận endpoint đã implement hoặc kiểm thử |

Nguồn đối chiếu: [ID_NAME_RULE.md](D:/Shared/ID_NAME_RULE.md), [HorseTransportDB.sql](D:/Shared/HorseTransportDB.sql), frontend/src/features/customer và frontend/src/features/manager.

**Bản này thay baseline Flow 1 v2.5 cũ trong file này.** Các tài liệu FLOW1-INTEGRATION.md, flow1-endpoints.md và FLOW1-FRONTEND-AUDIT.md ở cùng thư mục được viết trước khi chốt flow và DB mới, có thể còn mô tả khác. Không ghép định nghĩa mâu thuẫn vào bản này. API hiện có trong dự án không phải nguồn chuẩn để thiết kế lại API.

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
feedback, revisionFields, reason,
careNotes, pickup, delivery,
horses, horseNotes, wizardStep,
revisions, versions, payments, docs,
supplements, companyDocs, trip,
complaints, history
~~~

Manager Request:

~~~text
id, customerId, origin, destination, date,
status, horses, pickup, delivery, careNotes,
submittedAt, feedback, revisionFields, reason,
versions, draft, dossier, cancellation,
collection, history, contractId, tripId
~~~

- Hai projection cùng dữ liệu canonical, không phải hai store riêng.
- Collection chưa có trả []; optional chưa có được bỏ.
- horseCount thực tính từ mapping, không phải số slot chưa chọn.
- history gồm at/actor/role/action/detail, BE ghi actor/time và lọc ghi chú nội bộ cho Customer.
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

## 5. Ngựa và hồ sơ

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /customer/horses/{horseId} | Xem ngựa |
| POST | /customer/horses | Thêm |
| PUT | /customer/horses/{horseId} | Sửa |
| GET | /customer/horses/selectable?date=... | Khả dụng |
| POST | /customer/horses/{horseId}/files/{kind} | Upload/thay |
| GET | /customer/horses/{horseId}/files/{kind} | Đọc có quyền |

Khoảng lịch kết thúc khi kiểm tra selectable phải xác định từ đơn/kế hoạch, không chỉ nhìn ngày bắt đầu.

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

kind: photo/passport/ownership/value-proof. Trả FileRef, lưu private/gắn cột tương ứng. MIME/kích thước theo cấu hình upload thống nhất FE–BE.

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

Submit không body. BE kiểm tra địa điểm/contact/ngựa, tuyến/mode hoạt động, preparation policy, hồ sơ Customer và lịch ngựa trong transaction. Hồ sơ công ty chưa hoàn thiện không tự chặn. Không chỉ tin kết quả GET trước đó.

200 trả PENDING_REVIEW, snapshot/audit và notification Manager sau commit; không Contract/Trip.

POST create nhận Idempotency-Key: UUID. BE băm phục vụ SubmissionKeyHash, retry trả cùng Request. Đây không phải RowVersion hoặc lời hứa idempotency cho mọi mutation chưa có persistence tương ứng.

## 7. Manager xét duyệt

| Method | Endpoint | Body |
|---|---|---|
| GET | /manager/requests | — |
| GET | /manager/requests/{requestId} | — |
| POST | /manager/requests/{requestId}/accept | Không |
| POST | /manager/requests/{requestId}/request-changes | feedback, fields |
| POST | /manager/requests/{requestId}/reject | reason |

Accept: PENDING_REVIEW → CONTRACT_PREPARATION; ghi quyết định, thông báo Customer, không Trip.

Request changes:

~~~json
{
  "feedback": "Vui lòng xác nhận lại địa điểm nhận",
  "fields": ["places"]
}
~~~

Thống nhất RevisionField: route/date/places/horses/notes. BE kiểm tra field thực thay đổi theo nhóm được phép, không chỉ ẩn input FE. PENDING_REVIEW → CHANGES_REQUESTED; Customer sửa/submit lại → PENDING_REVIEW. History bền vững cần nơi lưu mục 14.

Reject:

~~~json
{ "reason": "Không thể đáp ứng lịch vận chuyển" }
~~~

PENDING_REVIEW/CHANGES_REQUESTED → REJECTED. Không submit lại, không xóa Horse/tài liệu. Các quyết định kiểm tra state/ghi trong transaction để một quyết định đồng thời thắng.

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
- DELETE chỉ bỏ draft chưa phát hành, không xóa audit version cũ.

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

Resolve thời lượng theo policy triển khai, lưu deadline/reason/actor/time; không hardcode FE. Không gia hạn đã ký/kết thúc/lịch không khả thi. SQL chỉ giữ lần gần nhất; history nhiều lần cần mục 14.

Nhắc Customer:

~~~http
POST /manager/contracts/{contractId}/reminder
~~~

Không body. BE chọn đúng người, kiểm tra state/deadline/rate limit, ghi audit; không nhận email tùy ý.

## 10. Cọc và xác minh

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /customer/requests/{requestId}/deposit | Nghĩa vụ cọc/giao dịch |
| POST | /customer/invoices/{invoiceId}/payment-session | Tạo giao dịch |
| GET | /customer/payments/{paymentId} | Trạng thái |
| GET | /manager/payments | Trang thanh toán |
| GET | /manager/payments/{paymentId} | Chi tiết |
| POST | /manager/payments/{paymentId}/confirm | Xác minh chuyển khoản |
| POST | /manager/payments/{paymentId}/reject | Từ chối |
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

URL/thời lượng minh họa. QR_SANDBOX chỉ demo, không chứng cứ tiền. BANK_TRANSFER cần tài khoản/content/QR cấu hình và persistence proof/reference theo mục 14, không tự dựng số tài khoản.

| DB nhánh VNPay | UI Customer |
|---|---|
| PENDING_GATEWAY | PROCESSING |
| REVIEW_REQUIRED | PROCESSING kèm cảnh báo đối soát |
| SUCCESS | SUCCESS |
| FAILED | FAILED |

Thủ công cần tập trạng thái riêng được nhóm chốt, không áp CHECK VNPay mọi payment. UI Customer chưa có cùng enum BANK_TRANSFER như Manager, cần adapter/type update có chủ đích.

Confirm chuyển khoản:

~~~json
{
  "confirmedAmount": 8000000,
  "transactionCode": "BANK-REFERENCE",
  "receivedAt": "2026-10-22 14:10",
  "note": "Đã đối chiếu tiền thực nhận"
}
~~~

Chỉ BANK_TRANSFER đang chờ, đối chiếu nguồn tiền thật; không xác nhận VNPay bằng endpoint này. Phải có nơi lưu amount/reference/time/audit. Click/proof không phải tiền. Retry không cộng hai lần; partial payment chưa mở ký.

Reject: reason; chỉ giao dịch chờ, giữ audit, không xóa tiền đã xác minh.

Đủ cọc → Request DEPOSIT_VERIFIED; version chưa SIGNED, chưa Trip. Invoice gắn đúng ContractID/ContractVersionNo; không dùng tiền bản khác mở ký bản hiện hành.

Callback/IPN VNPay xác thực merchant/reference/amount/signature/kết quả theo module provider. Browser Return URL không xác nhận tiền, FE refetch REST sau quay về. Callback trùng không cộng lặp; sandbox store độc lập chưa phải giao dịch nghiệp vụ Invoice.

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
2. Xóa OTP hash sau dùng; giữ audit phù hợp.
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

## 12. Hủy và hoàn tiền Flow 1

| Method | Endpoint | Body |
|---|---|---|
| POST | /customer/requests/{requestId}/cancel | reason |
| POST | /manager/requests/{requestId}/cancel | reason |
| POST | /manager/contracts/{contractId}/cancellation/decision | decision, reason |
| POST | /manager/contracts/{contractId}/refund/complete | reference, note |

- Chưa tiền/chưa ký: hủy theo state hợp lệ.
- Có tiền chờ/đã nhận: đối soát và giữ nghĩa vụ tài chính, không xóa Payment.
- Cancellation SQL PENDING/APPROVED/REJECTED; decision APPROVED/REJECTED khi pending.
- Refund SQL REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED.
- Hoàn xong phải có reference và xác minh tiền thực đã hoàn.
- Không tự đặt phí hủy/hoàn bằng 0 khi chưa có chính sách.
- Không xóa Invoice/Payment/ContractVersion; callback sau hủy không tự kích hoạt lại.
- Đã triển khai/đang chạy không hủy Flow 1 mà bỏ qua an toàn/flow vận hành.
- SQL không có bảng refund riêng; API cần rõ cập nhật CONTRACT.Refund* và bằng chứng, không giả định Payment REFUND đã có nơi lưu phù hợp.

## 13. Phân công triển khai

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | /manager/trips | Danh sách |
| GET | /manager/trips/{tripId} | Chi tiết |
| POST | /manager/trips/{tripId}/assignment | Chọn người |
| POST | /manager/trips/{tripId}/hold | Phụ thuộc sửa CHECK |
| POST | /manager/trips/{tripId}/resume | Phụ thuộc sửa CHECK |

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

Canonical role FLEET_ROUTE_COORDINATOR chiếu sang type/nhãn FLEET_COORDINATOR nếu giữ UI; không tạo role thứ hai để né tên. Specialist TRANSPORT_SPECIALIST.

Trip Manager: id/requestId/mode/status/deployment/plannedDepart/eta/readiness/milestones/etaHistory. route/flight/handover chưa có thì bỏ, không fake. Mới tạo PLANNING không mặc định readiness đủ.

**Blocker hold/resume:** CK_F1S_TRIP_PLAN_Deployment có ON_HOLD nhưng CK_F1Final_Handoff chỉ cho PENDING/CONFIRMED. Hai CHECK cùng áp nên ON_HOLD không lưu được. Phải chỉnh schema được nhóm chốt trước code; không map giả ON_HOLD về PENDING.

Hold body reason, resume không body; chỉ trước khởi hành. Không dùng Flow 1 đưa IN_TRANSIT về PLANNING. Assignment/resume không tự READY_TO_DEPART.

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
| Hai bộ revisionFields | Thống nhất route/date/places/horses/notes |
| Version hợp đồng | Một ContractID/tăng VersionNo, Invoice đúng bản |
| Mutation báo ok trước API | async/await, lỗi/refetch; không nuốt lỗi thành mock/empty real mode |
| ON_HOLD bị SQL chặn | Chỉnh CHECK trước implement |
| Color/ngày tiêm/bác sĩ và một số field Horse chưa có cột | Chốt nơi lưu/bổ sung schema, không âm thầm bỏ |
| wizardStep/requestedAt/submittedAt/feedback theo field/lịch sử Request chưa đủ persistence | Chốt lưu trữ/audit hoặc phân biệt state UI |
| Gia hạn chỉ lưu lần gần nhất | History nhiều lần cần cơ chế bền vững |
| Accept terms chưa có cột riêng | Chốt acknowledgement đúng version trong JSON ứng dụng hoặc bổ sung nơi lưu |
| Giá sàn/margin/custom items/Bearer CT chưa thống nhất | Chốt pricing/mapping, không tự thêm CONFIG_VERSION hoặc đoán CT |
| Chuyển khoản/proof/confirmedAmount/receivedAt/enum thủ công chưa đủ schema | Chốt audit/nơi lưu trước code |
| Refund UI riêng nhưng SQL chủ yếu CONTRACT.Refund* | Chốt projection/bằng chứng, không giả định bảng refund |
| Mark-read/nhắc/đồng bộ hai role | NOTIFICATION/API có quyền và refresh phù hợp, không local state đơn lẻ |

Giữ snapshot phát hành/ký bất biến, không sửa chỉ để đổi mã/đổi nội dung hiện tại. DB changes bàn giao riêng; tài liệu này không tự chạy SQL hoặc sửa source ứng dụng.

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
| Hold/resume | Chỉ test sau sửa CHECK; không rollback IN_TRANSIT |
| Refresh/reconnect/đổi tài khoản | Dữ liệu server đúng quyền, không dựa mock/local |

**Phạm vi xác minh:** đọc SQL/ID rule và source frontend; chưa chạy SQL/backend/provider/UAT. Các dependency ở mục 14 phải giải quyết trước khi coi contract đủ cho hai bên code độc lập hoàn toàn.
