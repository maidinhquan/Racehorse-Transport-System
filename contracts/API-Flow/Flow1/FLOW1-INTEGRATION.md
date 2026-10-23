# Flow 1 — API contract để tích hợp FE–BE

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | `2.5.1-draft` |
| Ngày cập nhật | 22/10/2026 |
| Trạng thái | **Thiết kế để review và implement**, chưa phải API đang chạy |
| Nguồn nghiệp vụ | [FLOW1.md v2.5](FLOW1.md), đặc biệt Business Rules và UAT |
| Danh mục API | [63 thao tác / 58 đường dẫn](flow1-endpoints.md) |
| Schema import | [flow1.openapi.json](flow1.openapi.json), OpenAPI 3.0.3 |
| Quy ước thiết kế chung | [CONVENTIONS.md](../CONVENTIONS.md) |

## 1. Page → API

Endpoint trong tài liệu được viết **sau `/api`**. Ví dụ `POST /customer/requests` có URL đầy đủ `http://localhost:5129/api/customer/requests` trong cấu hình local của WebApi.

| Page / chức năng | Method và endpoint chính | Role | Điều kiện / kết quả |
|---|---|---|---|
| Public Estimate từ Landing | `GET /public/estimates/transport-modes`, `POST /public/estimates` | Public | Chỉ dự toán, chưa tạo đơn |
| Wizard: thông tin chuyến | `GET /customer/requests/form-options`, `POST /customer/estimates` | CUSTOMER | Mode, lịch và giới hạn do BE cấu hình |
| Wizard: chọn ngựa và hồ sơ | `GET /customer/horses/selectable`, `GET /customer/requests/document-requirements` | CUSTOMER | Kiểm tra lịch, hồ sơ bắt buộc theo ngựa |
| Wizard: Review & Submit | `POST /customer/requests` | CUSTOMER | Đơn hoàn chỉnh → `PENDING` |
| Danh sách / chi tiết đơn | `GET /customer/requests`, `GET /customer/requests/{requestId}` | CUSTOMER | Chỉ tài nguyên thuộc khách hiện tại |
| Manager: xét duyệt | `GET /manager/requests`, `GET /manager/requests/{requestId}`, `POST .../accept`, `POST .../reject`, `POST .../request-revision` | LOGISTICS_MANAGER | Tiếp nhận, từ chối hoặc yêu cầu sửa |
| Customer: sửa theo yêu cầu | `GET .../revision-requests`, `PUT .../revision` dưới `/customer/requests/{requestId}` | CUSTOMER | `CHANGES_REQUESTED → PENDING` |
| Hỏi đáp / đề xuất thay đổi | Các endpoint `info-requests`, `info-responses`, `change-requests` trong danh mục | CUSTOMER / LOGISTICS_MANAGER | Hỏi đáp không sửa dữ liệu chuẩn; đề xuất phải được duyệt |
| Manager: kế hoạch và giá | `GET/PUT /manager/requests/{requestId}/preliminary-plan`, `GET .../quote-suggestion` | LOGISTICS_MANAGER | Giá vốn / giá sàn chỉ dành cho Manager |
| Manager: soạn hợp đồng | `POST /manager/requests/{requestId}/contracts`, `PUT /manager/contracts/{contractId}`, `POST .../send` | LOGISTICS_MANAGER | Giá chính thức nằm trong hợp đồng |
| Customer: xem / ký / từ chối | `GET /customer/requests/{requestId}/contract`, `POST /customer/contracts/{contractId}/otp`, `POST .../sign`, `POST .../decline` | CUSTOMER | Ký xong → `AWAITING_DEPOSIT` |
| Thanh toán cọc | `GET /customer/requests/{requestId}/payments`, `GET /customer/payments/bank-info`, `POST .../online`, `POST .../manual` | CUSTOMER | Chỉ sau ký, trong hạn; proof chưa phải tiền đã nhận |
| Manager: đối soát | `GET /manager/payments/pending`, `POST /manager/payments/transactions/{transactionId}/confirm`, `POST .../reject` | LOGISTICS_MANAGER | Chỉ đối soát BANK_TRANSFER; đủ cọc mới kích hoạt |
| Manager: quá hạn / hủy | `POST /manager/requests/{requestId}/deposit-extensions`, `POST .../cancel-overdue-deposit` và cancellation-requests | LOGISTICS_MANAGER | Kiểm tra tiền và lịch trước khi quyết định |
| Manager: bàn giao Flow 2/3 | `GET /manager/trips/{tripId}`, `POST .../confirm-deployment`, `POST .../hold-deployment`, `POST .../resume-deployment` | LOGISTICS_MANAGER | Xác nhận triển khai khác với sẵn sàng khởi hành |

Các dấu `...` trong bảng chỉ để đọc nhanh. [Danh mục endpoint](flow1-endpoints.md) và OpenAPI ghi đầy đủ từng method/path, không dùng dấu rút gọn.

## 2. Phạm vi và nguồn sự thật

Luồng chính:

```text
Public Estimate (tùy điểm vào)
→ Customer gửi Request PENDING
→ Manager ACCEPTED
→ Kế hoạch sơ bộ + Pricing Suggestion
→ Contract DRAFT → PENDING_SIGNATURE
→ Customer ký OTP: SIGNED + AWAITING_DEPOSIT
→ Cọc thực nhận được xác minh đủ
→ Contract EFFECTIVE + Request ACTIVATED + đúng một Trip PLANNING
→ Manager confirm-deployment → Specialist và Coordinator làm việc song song
```

Giữ nguyên nghiệp vụ Flow 1 v2.5:

- Demo chỉ `VN→VN`, `VN→JP`; mode được lấy từ BE theo cấu hình.
- Không có bước Customer Accept Quote, không có Request `DRAFT` trên server. Wizard giữ dữ liệu bước ở FE.
- Customer nộp đủ tài liệu `CUSTOMER / PER_HORSE / REQUEST_SUBMISSION`. Tài liệu đã `SUBMITTED` chờ Specialist duyệt không tự chặn gửi đơn. Hồ sơ COMPANY/PER_TRIP thuộc Flow 2.
- Manager chọn tỷ lệ cọc theo mỗi Contract Version và một hạn chung cho ký/cọc. Không mặc định 30%, 7 ngày hoặc grace period.
- Giá dưới sàn cần `priceOverrideReason`, không thêm người duyệt ngoại lệ khác.
- Quá hạn khóa ký/thanh toán mới, không tự hủy; giao dịch đã khởi tạo hợp lệ trước hạn vẫn phải đối soát.
- Bằng chứng chuyển khoản và browser Return URL không xác nhận tiền đã nhận. Không dùng CASH trong Flow 1.
- Hết Flow 1 chỉ tạo Trip `PLANNING`; readiness/khởi hành thực tế thuộc các Flow tiếp theo.
- Hạn ký/cọc, hạn hồ sơ và hạn bàn giao là ba loại độc lập. Đổi ETA không sửa cam kết trong hợp đồng đã ký. Thay đổi thỏa thuận sau ký vẫn là phụ thuộc chưa có API trong baseline v2.5.

Nếu nghiệp vụ trong bản này khác `FLOW1.md`, áp dụng Business Rules của `FLOW1.md` và sửa bản tích hợp trước khi code. Những điểm chuẩn hóa kỹ thuật ở mục 3 là **đề xuất của bản draft**, chưa phải tuyên bố code hoặc toàn nhóm đã đồng bộ. Bản sao tại `../Flow1/FLOW1.md` được giữ nguyên; không dùng hai bản sao làm hai contract khác nhau.

## 3. Quy ước kỹ thuật và khác biệt với code

### 3.1. ID, ngày, số tiền

| Nội dung | Contract draft này | Lý do / giới hạn |
|---|---|---|
| Tất cả ID tài nguyên | Chuỗi opaque, ví dụ `REQ_015`, `HORSE_031`, `TRIP_009`; không ép về số | `TransportRequest`, `Horse`, `Contract`, `TripPlan` hiện dùng `string`; JSON số trong baseline là mẫu cũ. Đây là thay đổi kiểu cần FE–BE đồng bộ |
| Version | Integer ≥ 1; mỗi loại version độc lập | Không nhầm `requestVersion`, `preliminaryPlanVersion`, Contract `version` và `pricingVersion` |
| Date | `YYYY-MM-DD` | Ngày dự kiến khởi hành / hạn giao theo lịch nghiệp vụ. BE phải quy đổi date thành mốc vận hành theo múi giờ của địa điểm, không tự coi là UTC midnight |
| Timestamp | ISO 8601 UTC, ví dụ `2026-11-15T16:59:59Z` | FE hiển thị theo múi giờ; BE kiểm tra bằng server clock |
| Money | JSON number, BE dùng `decimal`, tiền tệ thống nhất theo khoản phải thu | `format: double` trong OpenAPI chỉ biểu diễn wire number. Không quy định công thức FX, VAT hoặc làm tròn mới |
| Null | Các field bắt buộc có `nullable: true` phải xuất hiện với `null` nếu chưa có | Cần DTO/serializer thực hiện đúng; code hiện bỏ nhiều field null ngoài `data` |
| Payload ghi | Schema đóng: không nhận field ngoài định nghĩa | Không nhận `customerId`, `status`, tổng tiền hoặc `returnUrl` tùy ý từ Customer |
| Chính sách cấu hình | Pricing, lead time, limits, OTP TTL/attempts, ngân hàng, FX | Không suy ra giá trị policy từ ví dụ |

Các chuẩn hóa schema còn thiếu trong baseline, được ghi rõ là đề xuất kỹ thuật:

- Danh sách Request: sắp xếp mới nhất trước, dùng `requestId` làm tie-breaker. Query Customer `from`/`to` lọc `desiredDepartureDate`, bao gồm hai đầu; BE kiểm tra `from ≤ to`.
- Các GET lịch sử không phân trang trả mảng, mới nhất trước. Hỏi đáp nhóm theo `infoRequestId`, phản hồi trong nhóm theo thời gian tăng dần.
- `SelectableHorse.conflict` và `documentWarning`: text hoặc null. Nếu FE cần chi tiết xung đột theo cấu trúc, phải version schema thay vì tự trả object khác kiểu.
- `DeploymentStatus`: `PENDING_CONFIRMATION`, `CONFIRMED`, `ON_HOLD`; không thêm `TripStatus.ON_HOLD`.
- Revision thành công: field `revisionVersion` kế thừa baseline chính là `requestVersion` mới. Không tạo bộ đếm revision thứ hai.
- `GET .../payments` khi chưa có hợp đồng đã phát hành trả `409 INVALID_STATE`. Khi đã phát hành nhưng chưa ký vẫn đọc được overview với `paymentLocked=true`.
- GET hợp đồng Customer: chưa có phiên bản phát hành → `data:null`. Không lộ DRAFT. Customer xem summary trong Request cũng áp dụng nguyên tắc này.
- `ManagerContract.history` trả summary phiên bản. API sửa chỉ dùng cho DRAFT; phiên bản đã phát hành/ký bất biến.

### 3.2. Headers và quyền

```http
Authorization: Bearer <accessToken>
Accept: application/json
Content-Type: application/json
```

Public Estimate không cần JWT. Mọi endpoint Customer lấy danh tính từ JWT và kiểm tra owner trên Request, Horse, Contract, Receivable, Transaction và File. Tài nguyên Customer khác trả `404 NOT_FOUND`. Endpoint Manager yêu cầu `LOGISTICS_MANAGER`; prefix URL không tự cấp quyền.

Với multipart, trình duyệt tự đặt `Content-Type` kèm boundary. `payload` là JSON string theo schema tương ứng trong OpenAPI; file `receipt` là PDF/JPEG/PNG, tối đa 10 MB. Hỏi đáp có thể gửi JSON khi không có file; multipart dùng `attachments` lặp lại, tối đa 10 file. BE kiểm tra nội dung MIME, kích thước và quyền sở hữu, không chỉ extension.

OpenAPI dùng `/api` trong `servers`; **không thêm `/api` lần nữa** vào path. Server mẫu là WebApi port `5129`. Sandbox payment chạy riêng port `5080`, không phải server triển khai Flow 1.

### 3.3. Response và lỗi

Thành công:

```json
{
  "success": true,
  "message": "Transport request created",
  "data": {
    "requestId": "REQ_015",
    "requestCode": "REQ-20261022-0001",
    "status": "PENDING",
    "requestVersion": 1,
    "documentWarnings": [],
    "createdAt": "2026-10-22T03:00:00Z",
    "allowedActions": ["VIEW", "CANCEL", "REQUEST_CHANGE"]
  }
}
```

Lỗi thiết kế theo `CONVENTIONS.md`:

```json
{
  "success": false,
  "message": "Thiếu tài liệu bắt buộc của ngựa",
  "errorCode": "REQUIRED_CUSTOMER_DOCUMENT_MISSING",
  "data": null,
  "errors": [
    {
      "field": "horseIds[0].documents",
      "message": "Chưa nộp tài liệu bắt buộc theo checklist hiện hành"
    }
  ]
}
```

FE xử lý bằng `errorCode`, không dựa `message`. Không có lỗi theo field thì bỏ `errors`. File/PDF thành công trả binary, lỗi vẫn trả JSON.

| HTTP | Ý nghĩa | Mã tiêu biểu |
|---|---|---|
| 200 / 201 | Truy vấn/thao tác hoặc tạo mới | Theo từng operation |
| 400 | Dữ liệu sai / thiếu / sai loại tệp | `VALIDATION_ERROR`, `REQUIRED_CUSTOMER_DOCUMENT_MISSING`, `PRICE_OVERRIDE_REASON_REQUIRED`, `OTP_INVALID_OR_EXPIRED` |
| 401 / 403 | Xác thực / phân quyền | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN_ROLE`, `ACCOUNT_INACTIVE` |
| 404 | Không thấy / khác owner / thiếu bảng giá | `NOT_FOUND`, `PRICE_TABLE_NOT_FOUND` |
| 409 | Xung đột trạng thái, version hoặc nghiệp vụ | `INVALID_STATE`, `REQUEST_STATE_CHANGED`, `HORSE_SCHEDULE_CONFLICT`, `CONTRACT_NOT_LATEST`, `PAYMENT_DEADLINE_EXPIRED` |
| 429 / 500 | Giới hạn tần suất / lỗi server | `RATE_LIMITED`, `INTERNAL_ERROR` |

`x-business-errors` trong từng operation liệt kê lỗi đặc thù; lỗi chung áp dụng theo HTTP ở trên. Có thể xem đầy đủ lỗi baseline tại mục 17 của `FLOW1.md`.

**Khác biệt hiện tại:** `backend/Application/DTOs/ApiResponse.cs` chưa có `errorCode`, `errors` là dictionary thay vì array; `Program.cs` trả validation theo dictionary. OpenAPI mô tả **đích thiết kế**. Cần đồng bộ DTO, validation factory, exception middleware và handler auth trước khi FE coi schema lỗi này là đã có.

### 3.4. Concurrency và chống gửi trùng

Không coi `Idempotency-Key` là header bắt buộc hoặc đã được hỗ trợ: baseline mới nêu cơ chế tùy triển khai. Client chỉ dùng header đó sau khi BE công bố semantics/retention/scope. BE vẫn bắt buộc bảo đảm các bất biến sau:

| Thao tác | Điều kiện và cách xử lý lặp |
|---|---|
| Submit Request | Chống double submit; không dùng nội dung giống nhau để cấm hai đơn hợp lệ. BE phải lựa chọn và công bố khóa retry trước tích hợp; hiện chưa có public retry token trong schema |
| Manager accept/reject/request-revision | Kiểm tra state và cập nhật cùng transaction; chỉ một quyết định thắng. Lệnh thua trả `409 REQUEST_STATE_CHANGED`/`INVALID_STATE` |
| Plan / Draft Contract | So sánh `requestVersion`, `preliminaryPlanVersion` với snapshot hiện hành; transaction/locking khi ghi |
| Hai người sửa cùng DRAFT | Baseline chưa có field optimistic version riêng cho draft. Cần BE chọn locking hoặc token version và đồng bộ schema nếu thêm token; không tuyên bố draft đã chống lost update chỉ nhờ requestVersion |
| OTP / sign | OTP gắn owner + contractId + version + content hash, dùng một lần. Retry sau commit không tạo chữ ký mới; trả kết quả đã ký tương ứng hoặc conflict rồi FE GET lại |
| Khởi tạo payment | Kiểm tra session đang chờ; tái sử dụng session hợp lệ hoặc `409 PAYMENT_PENDING_CONFIRMATION` |
| Confirm ngân hàng / IPN | Unique provider/bank reference theo phạm vi tài khoản/provider và ledger; transaction khóa khoản phải thu. Không cộng một giao dịch hai lần |
| Activation | Unique Request→Trip; cùng transaction cập nhật ledger/Contract/Request/Trip, lưu outbox. Retry trả trạng thái hiện hành hoặc conflict có thể refetch, không tạo Trip thứ hai |
| Event / task | Phát sau commit; retry outbox/task không sinh thông báo hoặc handoff trùng |

Các endpoint khác không cho FE ghi thẳng `status`. BE luôn kiểm tra guard lại khi mutation, dù FE có `allowedActions` từ lần GET trước.

## 4. Ví dụ tích hợp luồng chính

### 4.1. Gửi đơn

`POST /api/customer/requests`, JWT CUSTOMER:

```json
{
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "destinationCountry": "JP",
  "destinationCity": "Tokyo",
  "pickupAddress": "Địa chỉ nhận tại Việt Nam",
  "deliveryAddress": "Địa chỉ giao tại Tokyo",
  "pickupContact": { "fullName": "Nguyen Van A", "phone": "+84901234567" },
  "receiver": { "fullName": "Yuki Tanaka", "phone": "+81312345678", "isProxy": true },
  "desiredDepartureDate": "2026-11-20",
  "deliveryDeadline": "2026-11-25",
  "preferredTransportMode": "AIR",
  "horseIds": ["HORSE_031", "HORSE_032"],
  "specialRequirements": "Chăm sóc theo hồ sơ ngựa"
}
```

BE kiểm tra lịch và checklist; trả `201` như mục 3.3. `receiver.isProxy=true` chỉ đánh dấu cần công ty xác nhận sau, không tự xác minh người nhận. Chưa tạo Trip.

### 4.2. Soạn và gửi hợp đồng

Manager `POST /api/manager/requests/REQ_015/accept`, sau đó lưu kế hoạch sơ bộ, lấy pricing suggestion và tạo DRAFT. Schema chính xác ở OpenAPI; ví dụ body tạo DRAFT:

```json
{
  "requestVersion": 1,
  "preliminaryPlanId": "PLAN_030",
  "preliminaryPlanVersion": 1,
  "currency": "VND",
  "items": [
    { "category": "TRANSPORT", "description": "Vận chuyển", "quantity": 1, "unitPrice": 85000000 },
    { "category": "PROCEDURE", "description": "Thủ tục", "quantity": 1, "unitPrice": 15000000 },
    { "category": "VETERINARY_CARE", "description": "Chăm sóc thú y", "quantity": 1, "unitPrice": 10000000 },
    { "category": "INSURANCE", "description": "Bảo hiểm", "quantity": 1, "unitPrice": 5000000 }
  ],
  "depositPercent": 40,
  "included": ["Dịch vụ theo phạm vi hợp đồng"],
  "excluded": [],
  "possibleExtraCosts": [],
  "customTerms": "Điều khoản đã thống nhất"
}
```

BE tính tổng minh họa `115000000`, tiền cọc `46000000` theo chính sách làm tròn cấu hình. 40% chỉ là lựa chọn trong ví dụ. Nếu tổng dưới giá sàn, cần thêm `priceOverrideReason`. Customer không thấy giá vốn hoặc giá sàn.

`POST /api/manager/contracts/CONTRACT_040/send`:

```json
{
  "completionDeadline": "2026-11-15T16:59:59Z",
  "note": "Mời ký và hoàn tất tiền cọc trong hạn chung"
}
```

BE kiểm tra deadline và thời gian chuẩn bị còn khả thi với kế hoạch khởi hành. Không tự áp lead time cố định.

### 4.3. Ký OTP rồi thanh toán

Customer gọi `POST /api/customer/contracts/CONTRACT_040/otp` không có body, rồi `POST .../sign`:

```json
{ "otp": "482913" }
```

BE lưu `SIGNED` + `AWAITING_DEPOSIT`, trả `nextAction: PAY_DEPOSIT`; refresh không làm mất chữ ký.

Customer đọc `GET /api/customer/requests/REQ_015/payments` để lấy `receivableId`, hạn và `allowedActions`. Tạo session VNPay bằng `POST /api/customer/payments/online`:

```json
{ "receivableId": "RCV_201" }
```

Hoặc `POST /api/customer/payments/manual` dạng multipart:

```text
payload = {"receivableId":"RCV_201","method":"BANK_TRANSFER","declaredAmount":46000000,"paidAt":"2026-11-14T08:20:00Z","note":"Đã chuyển khoản"}
receipt = <file PDF/JPG/PNG>
```

BE lưu proof `PENDING_CONFIRMATION`, chưa cộng cọc. Manager kiểm tra tiền thực nhận rồi `POST /api/manager/payments/transactions/TXN_504/confirm`:

```json
{
  "confirmedAmount": 46000000,
  "bankReference": "BANK-VERIFIED-001",
  "receivedAt": "2026-11-14T08:21:00Z",
  "note": "Đã đối chiếu sao kê"
}
```

Nếu đủ cọc và thỏa guard, cùng transaction BE chuyển `EFFECTIVE`, `ACTIVATED`, tạo đúng một Trip `PLANNING`. Nếu mới nhận một phần, giữ `SIGNED` / `AWAITING_DEPOSIT`, `trip:null`. Manager sau đó kiểm tra lịch và confirm deployment.

## 5. Phụ thuộc được tham chiếu, không định nghĩa lặp trong OpenAPI

OpenAPI này bao phủ API cốt lõi Flow 1, không phải toàn hệ thống. Các dependency dưới đây phải được cung cấp hoặc đồng bộ khi tích hợp:

| Dependency | API / tài liệu | Vai trò trong Flow 1 |
|---|---|---|
| Auth | [Authentication-API-Contract.md](../API-Role/Authentication-API-Contract.md) | Login/registration OTP để vào wizard; OTP ký hợp đồng là nghiệp vụ riêng |
| Public countries | `GET /public/countries` | Danh mục quốc gia; vẫn phải kiểm tra cặp tuyến được hỗ trợ |
| Horse CRUD | `GET/POST /customer/horses`, `GET/PUT /customer/horses/{horseId}`; [Customer-API](../API-Role/Customer-API) | Thêm ngựa ngay trong wizard bằng API chung; không tạo endpoint wizard riêng |
| Horse documents | `GET/POST /customer/horses/{horseId}/documents`, `GET /customer/documents/{documentId}` | Nộp đủ tài liệu PER_HORSE trước submit/revision |
| Private files | `GET /files/{fileId}` | Xem ảnh, passport, Contract PDF, proof theo quyền; không public file riêng tư |
| Dashboard / inbox | `GET /customer/dashboard`, `GET /manager/dashboard`, `GET /notifications`, `GET /notifications/unread-count` | Công việc chờ xử lý và thông báo |
| SignalR | `/api/hubs/updates` theo baseline | `RequestUpdated`, `PaymentUpdated`, `TripUpdated`, `NotificationCreated`; nhận event thì GET lại REST |
| Flow 2/3 | [Flow 2](../Flow1/FLOW2.md), [Flow 3](../Flow1/FLOW3.md) | Hoàn thiện hồ sơ, bảo hiểm, route, nguồn lực và readiness sau handoff |

Không tạo lại ảnh/passport scan đã lưu khi thêm Horse, không gửi toàn bộ hồ sơ Horse cùng `POST /customer/requests`; chỉ gửi `horseIds`.

Payload SignalR tối thiểu kế thừa baseline: `{ "entityId": "REQ_015", "occurredAt": "2026-10-22T03:00:00Z", "version": 1 }`. Event chỉ là tín hiệu refetch, không cấp quyền, không thay REST; reconnect phải tải lại dữ liệu.

## 6. Đối chiếu implementation ngày 22/10/2026

Đây là kiểm tra source trong workspace, chưa chạy endpoint thật:

| Thành phần | Bằng chứng trong repo | Hệ quả tích hợp |
|---|---|---|
| API cốt lõi Flow 1 | `backend/WebApi/Controllers` chưa có Customer/Public Estimate/Request/Contract/payment nghiệp vụ; ManagerController mới có planning/route/departure-conditions của Flow 3 | Tất cả 63 thao tác trong OpenAPI đánh dấu `NOT_IMPLEMENTED`; không coi mock frontend là endpoint backend |
| Auth | `AuthController`, `AuthDtos` có login/registration | Là dependency có code, không đồng nghĩa mọi chi tiết contract Auth đã khớp |
| ID | Domain resource ID hiện là string | Chuẩn hóa chuỗi trong bản draft, thay JSON số cũ |
| Contract liên kết Trip | `Domain/Entities/Contract.cs` hiện yêu cầu `TripId` và liên kết TripPlan | Không khớp việc lập Contract trước Trip. Cần migration/model quan hệ Contract→Request/Version và Trip chỉ sau cọc; không tạo Trip sớm để né ràng buộc |
| DTO/snapshot | TransportRequest hiện chưa có đầy đủ contacts, receiver verification, requestVersion và lịch sử; Contract chưa có version/deadline/OTP snapshot như thiết kế | Cần persistence và migration cho nghiệp vụ trước khi dựng controller |
| Response lỗi | `ApiResponse.cs`, `Program.cs`, `GlobalExceptionMiddleware.cs` chưa theo schema lỗi đích | Đồng bộ errorCode/errors array và null trước FE integration |
| VNPay sandbox | `backend/backend.csproj` + `backend/Program.cs`, `Payments/*`; [backend README](../../backend/README.md) | Project độc lập, store sandbox, chưa gắn receivable/owner/Contract thật |

VNPay sandbox hiện có `POST /api/payments/vnpay`, `GET /api/payments/vnpay/ipn`, `GET /api/payments/vnpay/return`, `GET /api/payments/{id}`. Các route này **không thay thế** `/customer/payments/*`. Adapter production phải gắn khoản phải thu đã xác thực và transaction DB; không đưa API sandbox nhận số tiền tùy ý vào luồng kích hoạt đơn. Bản contract không thay callback hoặc thuật toán provider đang có.

Chênh lệch tài liệu cũ: `Customer-API`, `CONVENTIONS.md` và `REAME.md` còn dẫn tới một số file không có trong repo, và phần Customer còn mô tả Quote acceptance. Khi implement Flow 1 mới, dùng baseline `API-Flow/FLOW1.md` cùng bộ schema này; không triển khai cả luồng Quote cũ. Không sửa hàng loạt role contract ngoài phạm vi ở lần bổ sung này.

## 7. Cách dùng và kiểm tra bàn giao

1. Đọc bảng Page→API và Business Rules trước.
2. Import `flow1.openapi.json` dưới dạng OpenAPI vào công cụ API của nhóm; server mẫu có thể đổi theo môi trường. Import không tạo backend thật.
3. Mỗi operation có `operationId`, role, request/response schema, HTTP status, `x-source-id` liên kết mã F01, `x-business-errors` và trạng thái implement.
4. FE dựng mock theo schema và hiển thị nút theo `allowedActions`; BE dựng DTO/validation/auth/transaction theo guard. Không sửa schema âm thầm để khớp mock cũ.
5. Chạy kiểm tra cấu trúc bằng `python contracts/tools/validate_flow1_contract.py` từ repo root.
6. Khi endpoint được triển khai và kiểm thử, cập nhật `x-implementation-status` và bảng evidence tương ứng.

Các kịch bản phải kiểm thử khi có backend:

| Kịch bản | Kết quả cần có |
|---|---|
| Khách A đọc/sửa Contract, Request, file, payment khách B | `404`, không lộ dữ liệu |
| Thiếu Customer PER_HORSE; chỉ thiếu Company PER_TRIP | Trường hợp đầu bị chặn, trường hợp sau không tự chặn submit |
| Hai Manager xử lý cùng đơn / cùng giao dịch | Chỉ một quyết định hợp lệ, không mất audit hoặc cộng tiền trùng |
| Change Request còn pending / Contract version cũ | Không ký hoặc phát hành bản không còn phù hợp |
| Giá dưới sàn không có lý do; tỷ lệ cọc do Manager chọn | Lỗi đúng field; BE tính tổng/cọc theo snapshot |
| Ký OTP rồi thoát và quay lại | Contract vẫn SIGNED, không ký lại, chưa tạo Trip |
| Quá hạn / gia hạn sau ký | Khóa thao tác mới / mở lại hợp lệ, chữ ký giữ nguyên |
| Proof hoặc Return URL giả thành công | Chưa ghi nhận tiền, chưa kích hoạt |
| Cọc một phần / đủ cọc / callback lặp | Chưa tạo Trip / một Trip PLANNING / không cộng hoặc tạo trùng |
| Callback hợp lệ tới muộn sau hủy | Đối soát tiền, không tự kích hoạt lại |
| Confirm deployment với lịch không khả thi; hold khi IN_TRANSIT | `409`, không tự dời lịch hoặc rollback chuyến |
| Thay lịch làm ETA vượt hạn hợp đồng | Cảnh báo Manager, không tự sửa cam kết đã ký |

UAT đầy đủ vẫn là F01-T01…F01-T54 trong `FLOW1.md`. Kiểm tra JSON/schema không thay thế test auth, database, provider hoặc UAT.
