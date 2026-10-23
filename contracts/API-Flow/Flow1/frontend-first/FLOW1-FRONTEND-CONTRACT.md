# Flow 1 — API contract theo frontend hiện tại

| Thuộc tính | Giá trị |
|---|---|
| Profile | `frontend-first` |
| Version | `1.0.0-draft`, 22/10/2026 |
| Trạng thái | Contract để BE implement theo FE; **chưa có backend tương ứng** |
| OpenAPI | [flow1.frontend.openapi.json](flow1.frontend.openapi.json), OpenAPI 3.1.0 |
| Danh mục đầy đủ | [ENDPOINTS.md](ENDPOINTS.md): 43 thao tác, 40 path |
| Schema Customer | [customer.types.snapshot.ts](customer.types.snapshot.ts) |
| Schema Manager | [manager.types.snapshot.ts](manager.types.snapshot.ts) |

## 1. Cơ sở và phạm vi

Bản này lấy **method, route và request thực tế của FE** làm nguồn: `customerApi.ts`, `customerEndpoints.ts`, `managerApi.ts`, `managerEndpoints.ts`; dùng types và hooks để mô tả dữ liệu và hành vi. Không đổi tên endpoint sang bộ thiết kế trước đó.

Đây là profile khác với [FLOW1.md v2.5](../FLOW1.md): FE hiện có server DRAFT/submit, cọc trước ký OTP và hạn chung minh họa 24 giờ. Bản này mô tả các khác biệt đó để đáp ứng yêu cầu viết theo frontend; không tuyên bố hai profile có cùng nghiệp vụ. Khi BE triển khai phải chọn rõ profile, tránh ghép guard của hai flow vào cùng endpoint.

Luồng FE đang thể hiện:

```text
Customer tạo DRAFT → lưu từng bước → submit PENDING_REVIEW
→ Manager accept CONTRACT_PREPARATION
→ Manager lưu draft/phát hành Contract ISSUED, Request CONTRACT_READY
→ Customer accept-terms → thanh toán cọc
→ Giao dịch được xác minh đủ: DEPOSIT_VERIFIED
→ Customer nhận OTP/ký → EFFECTIVE + ACTIVATED + Trip PLANNING
→ Manager chọn Specialist/Coordinator và giao việc
```

Bao gồm các nhánh sửa/từ chối/hủy, sửa hợp đồng/gia hạn/nhắc ký, đối soát/hoàn tiền liên quan hủy và handoff. Có cả các GET dependency mà `loadAll()` hiện luôn gọi. Mutation số dư, nghiệm thu, xử lý khiếu nại, route/flight/departure và chi phí thực tế thuộc flow sau, không được thêm vào phạm vi Flow 1 chỉ vì cùng API module.

## 2. Quy ước để backend trả đúng thứ FE đọc

### Base URL, header và response

```env
VITE_API_URL=http://localhost:5129/api
```

Đây là cấu hình local đích; FE hiện lấy base URL từ env. Tất cả path trong danh mục nằm sau `/api`.

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Customer yêu cầu role CUSTOMER và ownership từ token; Manager yêu cầu LOGISTICS_MANAGER. Resource khách khác trả 404, không tin customerId hoặc role từ body. Các route trong bộ này không phải public.

GET thành công:

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

GET danh sách phải trả **mảng trực tiếp trong data**, không đổi thành `{items,...}`. List Request hiện cần aggregate đầy đủ vì FE tính nhiều phần từ cùng list, chưa fetch chi tiết riêng đầy đủ. Các mảng chưa có dữ liệu phải là `[]`, không thiếu field bắt buộc hoặc trả null. Field optional có thể bỏ qua; không đổi tên id thành requestId trong DTO FE này.

Mutation thành công được đề xuất:

```json
{
  "success": true,
  "message": "Đã xử lý",
  "data": null
}
```

API client hiện chỉ đọc `success` từ POST/PUT; **chưa dùng response data**. OpenAPI đề xuất trả entity đã cập nhật cho các mutation để FE có thể chuyển sang đồng bộ server sau này. Phần request/GET có bằng chứng từ source; phần mutation response data là thiết kế bổ sung, không phải response backend đã tồn tại.

OpenAPI dùng `200` cho success để thống nhất profile. Client hiện chấp nhận 2xx, nên BE có thể công bố `201` cho create khi hoàn thiện implementation; không dùng `204` nếu vẫn yêu cầu JSON envelope.

Lỗi:

```json
{
  "success": false,
  "message": "Không thể xử lý ở trạng thái hiện tại",
  "data": null
}
```

HTTP: 400 dữ liệu sai; 401 token không hợp lệ; 403 role sai; 404 không thấy/khác owner; 409 state/concurrency; 429 giới hạn OTP/nhắc; 500 lỗi nội bộ. Không bắt FE gửi errorCode hoặc errors vì types hiện chưa có hai field này. Backend có thể bổ sung lỗi máy đọc được trong phiên bản sau cùng client; hiện client vẫn cần sửa để hiển thị message lỗi thay vì nuốt lỗi.

### ID, thời gian và tiền

- ID là string, ví dụ `TRN-9001`, `HOR-1029`, `PAY-5201`, `TRP-4001`; version hợp đồng là number `v`.
- Date theo FE: `YYYY-MM-DD`; datetime hiện là `YYYY-MM-DD HH:mm`, giờ Việt Nam. Schema phản ánh string thực tế, chưa ép ISO UTC. BE parse theo Asia/Ho_Chi_Minh; nếu đổi ISO phải cập nhật FE đồng bộ.
- Màn hình thương mại hiện hiển thị USD; BE phải công bố đơn vị tiền theo profile, không gửi VND rồi để FE gắn nhãn USD. VNPay sandbox VND là module riêng, cần mapping khoản thu và FX được xác minh trước khi nối.
- BE dùng decimal, tính lại tổng và cọc theo dữ liệu hợp đồng; không tin total/status/payments do Customer PUT lên.
- Giá dự toán Landing/CreateRequest, giá sàn, tỷ lệ mặc định và thời hạn ở FE hiện là demo/local. Profile giữ hình thức UI; các con số demo không tự trở thành chính sách production.

## 3. Page → API

| Page/chức năng | Các hàm API FE đang gọi | Dữ liệu cần |
|---|---|---|
| Customer layout/home | getProfile, getNotifications, getRequests, getHorses | Profile và các mảng aggregate |
| Create Request → wizard | createRequest, saveRequest, submitRequest | Toàn bộ Customer.TransportRequest, cả DRAFT |
| Add/edit Horse trong wizard | createHorse, updateHorse | Customer.HorseInput JSON |
| Giấy tờ | uploadDocument | key/scope/fileName; hiện chỉ metadata |
| Contract/ReviewSign | acceptTerms, requestContractChange, sendSignOtp, signContract | Request chứa versions[], termsAcceptedAt, signedAt và trạng thái cọc |
| Deposit | payDeposit | Không body; Request chứa payments[] |
| Manager layout/list/detail | getCustomers, getHorses, getStaff, getRequests, getTrips, getTransactions, getNotifications | Các projection Manager, không dùng nguyên DTO Customer |
| Review Request | acceptRequest, requestRevision, rejectRequest, cancelRequest, decideCancellation | Góp ý/lý do/quyết định và state hiện hành |
| Contract editor | saveContractDraft, issueContract, respondContractChange, extendContract, remindSign | ContractDraft gồm plan/budget/items/terms |
| Payments | verifyTransaction, rejectTransaction, confirmRefund | Transaction và lịch sử đối soát |
| Trip handoff | deployTrip, holdTrip, resumeTrip | Trip + staff list có role/load |

Manager `loadAll()` còn gọi getIncidents/getComplaints/getActualCosts: phải có GET trả đúng mảng nếu giữ bootstrap hiện tại. CRUD của ba module này nằm ngoài profile Flow 1.

## 4. Customer — request/response cụ thể

### 4.1. Đọc dữ liệu

| Method | Endpoint | data |
|---|---|---|
| GET | `/customer/profile` | CustomerProfile |
| GET | `/customer/notifications` | CustomerNotification[] |
| GET | `/customer/horses` | Horse[] |
| GET | `/customer/transport-requests` | Customer.TransportRequest[] |
| GET | `/customer/transport-requests/{id}` | Customer.TransportRequest |

Customer.TransportRequest **phải có**: `id, origin, destination, date, horseCount, requestedAt, status, careNotes, pickup, delivery, horses, horseNotes, wizardStep, revisions, versions, payments, docs, supplements, companyDocs, complaints, history`.

Các field optional gồm `submittedAt, feedback, revisionFields, reason, trip, acceptance, cancelRequest, refund, closedAt`. Xem snapshot/OpenAPI để biết đầy đủ nested schema và enum; không trả Customer request như Manager request vì hai type khác nhau.

Ví dụ DRAFT gửi ở bước đầu:

```json
{
  "id": "TRN-9001",
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "date": "2026-11-20",
  "horseCount": 1,
  "requestedAt": "2026-10-22",
  "status": "DRAFT",
  "careNotes": "Chăm sóc theo hồ sơ ngựa",
  "pickup": { "name": "", "address": "", "postal": "", "contact": "Alex Equine", "phone": "+849055500110", "notes": "" },
  "delivery": { "name": "", "address": "", "postal": "", "contact": "", "phone": "", "notes": "" },
  "horses": [""],
  "horseNotes": {},
  "wizardStep": 1,
  "revisions": [],
  "versions": [],
  "payments": [],
  "docs": [],
  "supplements": [],
  "companyDocs": [],
  "complaints": [],
  "history": []
}
```

### 4.2. Tạo, sửa và gửi đơn

| Method + endpoint | Body FE thực gửi | Xử lý đích |
|---|---|---|
| POST `/customer/transport-requests` | Customer.TransportRequest ở DRAFT | Tạo bản nháp thuộc JWT Customer |
| PUT `/customer/transport-requests/{id}` | Customer.TransportRequest toàn bộ | Lưu field Customer được phép sửa ở giai đoạn hiện tại |
| POST `/customer/transport-requests/{id}/submit` | Không body | Validate đủ dữ liệu → PENDING_REVIEW |
| POST `/customer/transport-requests/{id}/cancel` | `{reason}` | Chưa có tiền: hủy; có tiền chờ/đã nhận: đề nghị hủy để đối soát |

ID ở POST hiện do FE tự sinh và FE chưa dùng ID trong response. Để giữ route đang mở, BE có thể nhận ID đề xuất nếu chưa trùng và gắn owner; trùng trả 409. Đây là đề xuất tương thích, không bảo đảm tránh collision. Hướng triển khai lâu dài là BE cấp ID và FE nhận response trước điều hướng.

PUT phải chấp nhận wire shape đầy đủ nhưng **không mass-assign aggregate**. Chỉ cập nhật field được Customer sửa như origin/destination/date/horseCount/careNotes/pickup/delivery/horses/horseNotes/wizardStep theo guard. status, versions, payments, history, trip, refunds và ownership là server-owned: giữ giá trị canonical, không lấy giá trị FE làm bằng chứng. Client hiện tự thay các field đó trước khi gọi endpoint nghiệp vụ nên backend không thể tin body PUT.

Submit kiểm tra tuyến hỗ trợ, ngày, địa điểm/contact, số ngựa, ngựa đúng chủ/không trùng, hồ sơ bắt buộc. Chấp nhận DRAFT/CHANGES_REQUESTED, lưu revision khi gửi lại; không sửa REJECTED/CANCELLED tùy ý. Quy tắc sửa field mà Manager yêu cầu phải được kiểm tra lại tại BE.

### 4.3. Horse và metadata hồ sơ

| Method + endpoint | Body |
|---|---|
| POST `/customer/horses` | Customer.HorseInput |
| PUT `/customer/horses/{id}` | Customer.HorseInput |
| POST `/customer/transport-requests/{id}/documents` | `{ "key":"passport", "scope":"HOR-1029", "fileName":"passport.pdf" }` |

HorseInput là Horse bỏ id: name/breed/sex/dob/color/microchip/value/currency/passport/fluDate/conditions/vetName/vetPhone, cùng các FileRef optional. `value` hiện là **string**, không tự đổi sang number. Passport dùng number/authority/issueDate/expiryDate/scan. FileRef hiện chỉ `{name,url?}`.

Endpoint documents chỉ ghi metadata theo wire hiện tại. Không có bytes trong body; blob URL không truy cập được từ server. Để lưu file thật cần bổ sung upload multipart hoặc shared upload có fileId cùng thay đổi FE. Contract này không giả định tên tệp đủ thay thế giấy tờ thật, không đánh dấu APPROVED chỉ từ metadata.

### 4.4. Hợp đồng và đặt cọc

Prefix dưới đây: `/customer/transport-requests/{id}`.

| Method + suffix | Body FE thực gửi | Điều kiện/kết quả |
|---|---|---|
| POST `/contract/accept-terms` | Không body | Contract ISSUED còn hạn; lưu termsAcceptedAt |
| POST `/contract/change-requests` | ContractChangeInput | Chưa ký/chưa có tiền; lưu nội dung yêu cầu sửa |
| POST `/payments/deposit` | Không body | Đã accept terms, còn hạn; tạo giao dịch chờ, chưa xác nhận thành công |
| POST `/contract/otp` | Không body | Theo FE chỉ sau cọc đã VERIFIED; gửi OTP thật |
| POST `/contract/sign` | `{ "otp":"482913" }` | Xác minh BE, đủ cọc, đúng version; ký và kích hoạt nguyên tử |

ContractChangeInput:

```json
{
  "text": "Đề nghị đổi ngày và điều chỉnh nội dung chăm sóc",
  "proposedDate": "2026-11-22",
  "proposedNotes": "Ghi chú chăm sóc mới",
  "commercial": "Đề nghị xem lại khoản phí",
  "other": "Nội dung khác"
}
```

Chỉ text bắt buộc về schema; hook còn kiểm tra text tối thiểu 10 ký tự, ngày không quá khứ. Backend xác minh lại thay vì chỉ dựa validation UI.

ContractVersion Customer dùng `v, number, issuedAt, validUntil, items[{desc,amount,required?}], total, depositPct, state` và các field optional `note, termsAcceptedAt, signedAt, change, deadlineHistory`. Không đổi thành `contractId/version/status/items[].unitPrice` nếu chưa sửa FE.

Payment Customer dùng `id,type,method,amount,status,createdAt`, optional confirmedAt/reason/qrExpiresAtMs. method hiện QR_SANDBOX hoặc VNPAY; status PROCESSING/SUCCESS/FAILED. Bank transfer của Manager phải được chiếu sang kiểu Customer thích hợp hoặc mở rộng FE enum có chủ đích; không trả BANK_TRANSFER vào client type hiện chưa nhận.

**Khoảng trống tích hợp thật:** FE chưa gửi method, bank proof, bank reference hoặc session/receivable; cũng chưa dùng paymentUrl response. Endpoint no-body chỉ đủ tạo nghĩa vụ/session chờ theo server configuration, không đủ để nhận biết một chuyển khoản cụ thể. Backend chỉ ghi SUCCESS từ nguồn xác minh tin cậy, không từ nút “đã chuyển” hay OTP demo.

## 5. Manager — request/response cụ thể

### 5.1. Bootstrap và aggregate

| GET endpoint | data |
|---|---|
| `/manager/customers` | CustomerInfo[]: id/name/company/email/phone |
| `/manager/horses` | HorseRef[]: id/name/breed/microchip/passportNo |
| `/manager/staff` | Staff[]: id/name/role/load |
| `/manager/requests` | Manager.TransportRequest[] |
| `/manager/trips` | Manager.Trip[] |
| `/manager/transactions` | Transaction[] |
| `/manager/notifications` | ManagerNotification[] |
| `/manager/incidents` | Incident[] — bootstrap ngoài Flow 1 |
| `/manager/complaints` | Complaint[] — bootstrap ngoài Flow 1 |
| `/manager/actual-costs` | ActualCost[] — bootstrap ngoài Flow 1 |

Manager.TransportRequest bắt buộc: `id,customerId,origin,destination,date,status,horses,pickup,delivery,careNotes,submittedAt,versions,dossier,collection,history`; draft/cancellation/reason/feedback/revisionFields và phần hậu bàn giao là optional. Place của Manager không có postal/notes như Customer; cần hai projection cùng dữ liệu canonical.

GET `/manager/requests/{id}` có constant nhưng **managerApi hiện chưa gọi**; không tính là operation đã được FE sử dụng. Có thể bổ sung khi refactor detail fetching.

### 5.2. Xét duyệt và hủy

Prefix: `/manager/requests/{id}`.

| Method + suffix | Body | Kết quả |
|---|---|---|
| POST `/accept` | Không body | PENDING_REVIEW → CONTRACT_PREPARATION |
| POST `/request-revision` | `{feedback,fields}` | PENDING_REVIEW → CHANGES_REQUESTED |
| POST `/reject` | `{reason}` | PENDING_REVIEW/CHANGES_REQUESTED → REJECTED |
| POST `/cancel` | `{reason}` | Hủy trước activation theo guard, đối soát tiền |
| POST `/cancellation` | `{approve,note}` | Quyết định đề nghị hủy; từ chối trả trạng thái trước |

Revision fields Manager: `date | places | horses | notes`. Customer đang dùng `route | date | count | notes`, chưa đồng nhất. BE cần projection theo role; places/horses không có ánh xạ một-một sang field Customer nên vẫn phải chỉnh UI/guard nếu muốn giới hạn sửa chính xác. Không tuyên bố vấn đề được giải quyết chỉ bằng rename.

Body mẫu request-revision:

```json
{
  "feedback": "Cần xác nhận lại ngày và địa điểm nhận ngựa",
  "fields": ["date", "places"]
}
```

Hook yêu cầu feedback/reason Manager tối thiểu 10 ký tự, fields không rỗng; quyết định hủy note tối thiểu 5 ký tự. Schema nguồn chỉ biết kiểu string/array, nên các ràng buộc này phải thêm ở validation service theo nội dung tại đây.

### 5.3. Soạn, phát hành và sửa hợp đồng

| Method + endpoint | Body |
|---|---|
| PUT `/manager/requests/{id}/contract/draft` | Manager.ContractDraft |
| POST `/manager/requests/{id}/contract/issue` | Manager.ContractDraft |
| POST `/manager/requests/{id}/contract/change-response` | `{decision:"KEPT"|"RETURNED",text}` |
| POST `/manager/requests/{id}/contract/extend` | Không body |
| POST `/manager/requests/{id}/contract/remind` | Không body |

ContractDraft:

```json
{
  "mode": "AIR",
  "departAt": "2026-11-20 06:00",
  "arriveAt": "2026-11-21 06:00",
  "budget": { "TRANSPORT":950, "PROCEDURE":220, "VET":110, "INSURANCE":70, "STAFF":120, "FUEL":60 },
  "items": [
    { "desc":"Vận chuyển", "amount":1400, "required":true },
    { "desc":"Thủ tục", "amount":300, "required":true },
    { "desc":"Chăm sóc thú y", "amount":150 },
    { "desc":"Bảo hiểm", "amount":100 }
  ],
  "depositPct": 30,
  "note": "Ghi chú thương mại",
  "exception": "",
  "terms": [ { "title":"Phạm vi dịch vụ", "text":"Vận chuyển và chăm sóc theo nội dung đã thống nhất." } ]
}
```

Ví dụ rút gọn số điều khoản, không áp đặt chỉ có một điều khoản. Editor thực có 12 điều khoản nền và có thể thêm. Phải lưu title/text riêng để mở lại editor; không gom mất cấu trúc vào customTerms string.

FE draftError: ngày đến sau đi; budget VET/INSURANCE có giá trị; khoản bắt buộc >0; khoản tiền không âm; depositPct 1–100; dưới floor cần exception tối thiểu 10 ký tự; mọi terms có title và text tối thiểu 10 ký tự. BE tính lại total/cọc và xác thực chính sách giá sàn. Budget/exception không được lộ trong projection Customer.

Issue tạo version tiếp theo, bản cũ SUPERSEDED, Request CONTRACT_READY. Manager version có mode/departAt/arriveAt/budget/exception/terms/extensions, khác Customer version. Cùng phiên bản canonical được chiếu thành hai DTO; không để hai aggregate tự mâu thuẫn.

Theo hook FE, phát hành và giữ bản sau phản hồi cấp hạn 24 giờ; extend cộng 24 giờ từ max(now,validUntil), chỉ chưa ký. Đây là hành vi profile FE hiện tại; khác baseline Manager tự chọn deadline. Trước khi áp dụng production cần policy cấu hình và kiểm tra khả thi lịch, không dùng số minh họa làm nghĩa vụ thương mại mặc định.

### 5.4. Đối soát và hoàn tiền

| Method + endpoint | Body | Xử lý |
|---|---|---|
| POST `/manager/transactions/{id}/verify` | Không body | BANK_TRANSFER/PENDING_CONFIRMATION; xác minh tiền thực nhận; đủ cọc → DEPOSIT_VERIFIED |
| POST `/manager/transactions/{id}/reject` | `{reason}` | Từ chối giao dịch đang chờ |
| POST `/manager/transactions/{id}/refund-paid` | Không body | Chỉ xác nhận hoàn tiền sau bằng chứng thực tế |

Transaction: `id,requestId,type,method,amount,status,createdAt`; optional `ref,receipt,confirmedAt,rejectReason`. Type DEPOSIT/BALANCE/REFUND; method QR_SANDBOX/BANK_TRANSFER/VNPAY. Xem enum status chính xác trong schema Manager.

Body verify không có số tiền/reference/time: BE phải có dữ liệu đối soát tin cậy trước khi cho phép xác nhận, hoặc UI cần bổ sung chúng. Không coi thao tác click là chứng cứ tiền đã vào tài khoản. Giao dịch provider không được xác minh thủ công qua endpoint này. Retry không cộng tiền lần hai.

### 5.5. Handoff

| Method + endpoint | Body | Kết quả |
|---|---|---|
| POST `/manager/trips/{id}/deployment` | `{specialistId,coordinatorId}` | PLANNING + NOT_CONFIRMED → CONFIRMED |
| POST `/manager/trips/{id}/hold` | `{reason}` | Theo FE chỉ PLANNING, deployment ON_HOLD |
| POST `/manager/trips/{id}/resume` | Không body | ON_HOLD → CONFIRMED nếu đủ hai người, ngược lại NOT_CONFIRMED |

BE kiểm tra role nhân sự, khả năng nhận việc và thay đổi workload atomically. Không chỉ kiểm tra ID không rỗng. Phát task sau commit và chống giao việc lặp. TripStatus độc lập với deployment.status; không thêm TripStatus.ON_HOLD.

Trip Manager cần đầy đủ `id,requestId,mode,status,deployment,plannedDepart,eta,readiness,milestones,etaHistory`; readiness có docsReady/docsTotal/insurance/quarantineOk. Khi mới kích hoạt có thể là 0/0, MISSING, false theo dữ liệu thật; không giả vờ READY. route/flight/handover optional thuộc flow sau.

## 6. Nhất quán dữ liệu, retry và giới hạn tương thích

Backend phải có một dữ liệu canonical, hai projection Customer/Manager, cập nhật audit và đọc nhất quán. Customer versions không chứa giá vốn; Customer history không lộ ghi chú nội bộ. Không chạy hai store demo độc lập như thể hai backend thật.

Chống race/duplicate ở submit, issue version, payment verify, OTP/sign, tạo Trip và giao việc bằng transaction/unique constraints/locking. Không giả định Idempotency-Key đã có trong FE. FE chưa gửi concurrency token; BE ít nhất kiểm tra state tại lúc mutation. Việc chống lost update chính xác khi hai Manager sửa draft vẫn cần version token hoặc locking có semantics rõ.

Những chỗ **không thể sửa chỉ bằng contract/backend**:

1. loadAll hiện bỏ dữ liệu thật khi tắt demo; phải giữ dữ liệu backend trả về.
2. Action hiện mutate local và báo ok trước khi API hoàn tất; phải await và xử lý lỗi/refetch.
3. FE tự sinh ID/OTP/Trip; backend không tin chúng. Cần dùng ID và state response để tránh lệch sau refresh.
4. Upload chỉ có metadata, QR chỉ minh họa; cần upload/session thật để vận hành.
5. Không có polling/refetch/event subscription Flow 1 trong các hook hiện tại để đồng bộ Customer–Manager; cần bổ sung cơ chế refresh phù hợp.

Bản API này đáp ứng hình thức request/GET mà FE đang kỳ vọng, không khẳng định FE hiện tại sẽ tự chạy end-to-end chỉ bằng triển khai các route.

## 7. Sinh lại và kiểm tra

Từ repo root, sau khi đã có dependencies frontend:

```powershell
node contracts/tools/generate_frontend_flow1.cjs
```

Generator đọc TypeScript bằng compiler của frontend; sinh snapshot types, OpenAPI, operations.json và danh mục endpoint. Schemas Customer/Manager giữ nguyên khác biệt của source. Không sinh server hoặc gọi backend. Source DTO không mang validation length/date/business rule, nên phải đọc phần guard ở contract này.

Kiểm tra generator: TypeScript DTO diagnostics; hàm client tồn tại; method POST/PUT khớp source; route lấy trực tiếp từ endpoint constants; refs schema hợp lệ; operation không trùng. Chưa phải full OpenAPI validator hoặc kiểm thử HTTP/provider. Các fixture dates và số tiền trong tài liệu chỉ minh họa, không phải transaction thật.
