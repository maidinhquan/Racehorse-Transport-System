# Kế hoạch tích hợp Flow 1 theo hướng cải tiến

> Dự án: Racehorse Transport System — SWP391
> Lập ngày 15/10/2026; điều chỉnh ngày 16/10/2026, Asia/Ho_Chi_Minh
> Phiên bản 3.0 — **state trong SQL qua cột mới ở bảng hiện hữu, tuyệt đối không thêm bảng**
> Tình trạng thực thi từng giai đoạn được ghi trong báo cáo riêng; không coi API được liệt kê là đã implement.

**Quyết định mới nhất 16/10/2026:** đại ca đã chọn chuyển metadata vào SQL và giữ
đầy đủ Flow 1. [Plan chuyển đổi S1–S3](FLOW1_SQL_STATE_TRANSITION_PLAN.md) là nguồn
chuẩn cho storage/transaction/import, thay giới hạn hai cột và thiết kế sidecar
file của bản 2.0. S1 có schema/SQL adapter; S2 đã chuyển source endpoint sang SQL
và gộp business/state/receipt chung transaction. S3 có inventory/import/parity tool
offline và đã gỡ file provider/interface/options/tests cũ; DB nghiệp vụ chưa được
áp migration/import. Xem [S2](FLOW1_PHASE4_SQL_CUTOVER_REPORT.md), [S3](FLOW1_PHASE4_SQL_IMPORT_REPORT.md).

[Phase 4 increment C](FLOW1_PHASE4_LIFECYCLE_REPORT.md) bổ sung Customer decline,
Manager explicit expire/reissue thành ContractID mới và lịch sử private PDF bằng SQL.
Phase 4 còn effective-deadline extension/history và thay Contract FE legacy trước
khi sang phase 5; không coi các use case đã có là hoàn thành toàn Flow 1.

## 1. Quyết định đã chốt

Luồng giữ nguyên: Estimate -> Wizard -> PENDING -> Manager Review -> Preliminary Plan -> Draft Contract/PDF -> OTP -> SIGNED -> cọc 40% -> EFFECTIVE/ACTIVATED + một Trip PLANNING -> Confirm Deployment -> Flow 2/3.

| Nội dung | Quyết định |
|---|---|
| SQL | Giữ migration 003; bổ sung migration 004 với Flow1StateJson + Flow1StateVersion trên HORSE, TRANSPORT_REQUEST, CONTRACT và USER (8 cột) |
| Bảng mới | Tuyệt đối không thêm bảng; snapshot/audit/OTP/history nằm trong cột SQL mới có cấu trúc |
| Trip | Không tạo Trip sơ bộ để vượt FK. Chỉ tạo sau ký và đủ cọc xác minh |
| Cọc | Cố định 40%, BE tính; Manager không thay tỷ lệ |
| Chuẩn bị | VN->VN <=500km: 2 ngày; >500km: 3 ngày; VN->JP: 7 ngày; Manager chỉ được tăng khi thẩm định |
| Tuyến/mode | Demo VN->VN/ROAD, VN->JP/AIR và ground legs nếu có |
| Bản đồ | Tài khoản Mapbox free: Mapbox chỉ hiển thị bản đồ; Geoapify Geocoding/Reverse/Routing cho dữ liệu lưu trong hồ sơ. Sức chứa MVP 1 ngựa/xe do đại ca chốt ngày 16/10/2026. Live smoke và Customer browser với provider thật đã đạt; xem báo cáo phase 2 live |
| Wizard | Ảnh + scan passport là hai loại file bắt buộc; basic fields vẫn theo schema; không upload Customer PER_TRIP hoặc giấy ủy quyền |
| PDF/OTP | PDF sinh từ mẫu hiện có, bản phát hành bất biến; OTP gắn đúng khách/Contract/version/hash |
| Tiền | SQL là nguồn chuẩn cho Invoice/Payment/số thực nhận; không chuyển ledger sang file |
| Metadata | Chuyển kế hoạch/snapshot/version/hash/history/OTP/receipt sang SQL; file store chỉ giữ ảnh/passport/PDF/proof bytes private |
| Hết hạn | Khóa thao tác mới; không auto-cancel; gia hạn/hủy bởi Manager, giữ lịch sử và chữ ký |

OTP là xác nhận hợp đồng của MVP, không phải chữ ký số có chứng thư. Bảng giá và 2/3/7 ngày là policy demo, không phải kết luận về quy định vận chuyển thực tế. Hai file Wizard không thay việc Specialist thẩm định pháp lý ở Flow 2.

Nguồn: [Flow 1](FLOW1.md), [Flow 2](FLOW2.md), [Flow 3](FLOW3.md), [Conventions](../CONVENTIONS.md), [solution](../../backend/Backend.slnx), [schema baseline an toàn](../../backend/database/000_legacy_schema.sql), [hướng dẫn migration](../../backend/database/README.md).

## 2. Hiện trạng và nguyên nhân chọn schema này

- Active projects nằm trực tiếp trong backend/Domain, Application, Infrastructure, WebApi. Context là class HorseTransportDbContext trong file RaceHorseTransportDbContext.cs. Không đưa code mới vào backend/DAO hoặc sandbox backend/backend.csproj do nhầm cấu trúc.
- CONTRACT.TripID hiện bắt buộc: nếu không làm nullable thì phải có Trip trước Contract, trái flow đã chốt.
- RequestID mới giúp Draft/Contract liên kết trực tiếp Request. Legacy Contract backfill qua Trip.RequestID; không bịa relation khi dữ liệu mâu thuẫn.
- INVOICE và PAYMENT đã đủ làm ledger cơ bản. CompletionDeadline dùng chung ký/cọc; không dùng CommittedDeadline (hạn giao hàng) thay thế.
- Nguồn data/HorseTransportDB.sql bị Git ignore. File HorseTransportDB/HorseTransportDB.sql được track nhưng chứa lệnh reset database và seed; không dùng làm upgrade. Hai bản khác USER fields; baseline mới lấy từ nguồn tracked để giữ các trường auth đang chạy.
- Baseline trước phase 1 chưa có controller Flow 1. Hiện phase 2–3 và phase 4 increment A/B đã có use case thật; storage đang chuyển theo S1–S3, không coi foundation SQL mới là đã cutover.

## 3. Database tối thiểu và migration

| Đối tượng | Thay đổi |
|---|---|
| CONTRACT.CompletionDeadline | Thêm datetime2 NULL; UTC cho dữ liệu mới; DRAFT/legacy có thể null |
| CONTRACT.RequestID | Thêm varchar(50), backfill qua Trip, sau xác minh NOT NULL và FK tới TRANSPORT_REQUEST |
| CONTRACT.TripID | Giữ varchar(50)/FK cũ; cho NULL trước activation |
| CONTRACT(RequestID) | Index phục vụ tra cứu các phiên bản hợp đồng thuộc Request |
| TRIP_PLAN(RequestID) | Unique index: một Request chỉ có một Trip |
| INVOICE(ContractID), InvoiceType=DEPOSIT | Filtered unique index: không tạo hai invoice cọc cho cùng Contract |

**Không có cột hay bảng bổ sung khác trong giai đoạn 1.** Index/FK là thay đổi schema không tăng số cột; có nhu cầu cụ thể và test chống trùng tương ứng. Không đổi USD của bản ghi cũ thành VND bằng cách sửa nhãn. Contract mới dùng VND/DepositRateStandard=40.00 rõ ràng.

| File | Vai trò |
|---|---|
| backend/database/000_legacy_schema.sql | Chỉ 26 CREATE TABLE legacy; không reset DB, không seed; dành cho DB mới rỗng/test |
| backend/database/002_flow1_preflight.sql | Read-only: kiểm tra duplicate Trip/invoice, relation/customer và schema |
| backend/database/003_flow1_minimal_schema.sql | Migration transactional/repeatable; hai cột mới, backfill, nullable Trip và index/FK |
| backend/database/README.md | Quy trình áp dụng, bảo toàn legacy, test DB và rollback |

Trình tự: backup DB mục tiêu -> preflight -> giải quyết conflict có thẩm quyền -> apply 003 -> kiểm tra số dòng, relation, legacy fields và regression auth. Migration không tự chạy ở startup. Nếu có duplicate hoặc không suy ra RequestID an toàn, dừng và rollback, không xóa tùy tiện.

Test chỉ tạo RaceHorseFlow1Test_<GUID> trên SQL Server local và drop đúng tên đã validate. Không chạy file reset HorseTransportDB, không áp migration lên DB nghiệp vụ trong nghiệm thu tự động. Khi đã có Contract mới TripID null, rollback schema về NOT NULL phải có kế hoạch restore/forward-fix, không ALTER mù.

## 4. State trong SQL và ranh giới nhất quán

### 4.1. Ánh xạ được duyệt ngày 16/10/2026

| Dữ liệu | Nơi lưu sau cutover |
|---|---|
| Horse identity/status/document versions, private file key/hash/size | HORSE.Flow1StateJson (horse) |
| Request snapshot/estimate/coordinates/proxy/contacts/horse snapshots | TRANSPORT_REQUEST.Flow1StateJson (request) |
| Review/revision/questions/changes/audit/currentContractId | TRANSPORT_REQUEST.Flow1StateJson (review) |
| Preliminary plan, budget/quote, preparation days/resources | TRANSPORT_REQUEST.Flow1StateJson (plan) |
| Contract lines/frozen snapshot/PDF manifest/version/hash | CONTRACT.Flow1StateJson (contract/publication) |
| OTP digests/TTL/attempts/delivery, acceptance/operation receipts | CONTRACT.Flow1StateJson (contract-otp/acceptance) |
| Account OTP rate budget xuyên contracts | USER.Flow1StateJson (otp-account, UserID) |
| Extension history, payment evidence/refs, deployment/handoff | CONTRACT.Flow1StateJson; gắn PaymentID/InvoiceID/TripID khi cần |
| Owner/status/money/SignedAt/deadline/RequestID/TripID | Giữ cột nghiệp vụ và INVOICE/PAYMENT/TRIP_PLAN hiện hữu |
| Ảnh/passport/PDF/proof bytes | Private immutable file store, tải qua API có quyền; không metadata JSON files |

Không nhét JSON vào Status, ContractTemplate.BodyContent hoặc cột mang nghĩa khác.
Mỗi bảng trong bốn bảng trên thêm Flow1StateJson nvarchar(max) NULL và counter
Flow1StateVersion bigint NOT NULL DEFAULT(0). Không thêm bảng mới hoặc typed URL
columns trùng nguồn chuẩn. Xem mapping, limits và migration trong
[plan S1–S3](FLOW1_SQL_STATE_TRANSITION_PLAN.md).

### 4.2. Storage và transaction mục tiêu

IFlow1StateStore / SqlFlow1StateStore giữ typed document revisions có owner/type/
version/key/hash/actor/action/time; SQL UPDATE compare-and-swap whole owner bundle.
Append bắt buộc current SQL transaction, không Commit/SaveChanges thay UoW.
Owner row cần tồn tại trong transaction trước append; tạo row + flush trong cùng
transaction không phải commit sớm. Giữ lock Request/horses/account theo scope.

Business status/amount/Invoice/Trip và state/audit/receipt commit hoặc rollback chung.
Gỡ PREPARED/finalize/recovery dành riêng split SQL/JSON file sau khi use case đã
cutover và có replacement SQL fault tests. Giữ idempotency, role/owner/status guards,
immutable PDF/hash và unique invoice/Trip. Expected review/document version vẫn
độc lập với counter owner SQL; không đổi API version thành counter một cách ngầm.

### 4.3. File bytes, SMTP/provider và chuyển dữ liệu cũ

PDF conversion/file bytes và SMTP/provider network calls vẫn ngoài SQL transaction.
Chuẩn bị immutable bytes trước khi publish SQL; rollback có thể để orphan bytes,
không xóa bytes đang có reference. SMTP delivery cần DELIVERING/DELIVERED/FAILED,
resend sau crash không chắc chắn. Không tuyên bố file/email có SQL atomicity.

Import phải có inventory/dry-run/parity, giữ version/hash/time/actor/history/OTP
budget, xử lý pending legacy rõ và không fallback file để che state thiếu/hỏng.
Không tự apply migration/import lên DB nghiệp vụ. Backup SQL và private file bytes
cùng manifest; không xóa file metadata cũ trước xác minh import và cutover.

**Hiện trạng S1:** SQL adapter/schema/tests đã có; runtime cũ còn dùng
IFlow1MetadataStore/LocalFlow1MetadataStore cho đến S2/S3. Đây là trạng thái chuyển
đổi có chủ đích, không phải thiết kế đích hoặc tuyên bố đã bỏ toàn bộ nhóm MetadataStore.

## 5. Kiến trúc, transaction và version

FE -> WebApi controller -> Application use case -> Domain DAO/UoW contracts -> Infrastructure SQL/file/provider adapters. Application không reference concrete Infrastructure/EF.

- IFlow1Repository chỉ stage writes trong transaction; không dùng BaseDAO tự SaveChanges cho nghiệp vụ Flow 1.
- IFlow1UnitOfWork.ExecuteAsync(requestId, action) lấy SQL transaction Serializable + sp_getapplock theo Request; Commit một lần; khi tạo owner row mới có thể cần flush SQL trong cùng transaction trước khi append state, tuyệt đối không commit sớm. Lỗi rollback và clear tracker; không nhận tracked mutations đã được sửa ngoài transaction.
- LockHorsesAsync chỉ chạy trong transaction, normalize/sort IDs để giảm deadlock và trùng lịch đồng thời.
- Unique Trip.RequestID và invoice DEPOSIT là hàng rào cuối, kể cả đường code bỏ qua UoW.
- expectedVersion là document/review version trong SQL state, độc lập Flow1StateVersion của owner row. Recheck status/relation/tiền/quyền sở hữu trong lock SQL.
- ContractID mới cho mỗi Contract Version; request SQL review state chọn currentContractId, xác minh nó thuộc Request và status SQL phù hợp. Không có IsCurrent/Version mới trong SQL.
- Request revision phải giữ snapshot cũ; chưa ký mới được đổi. Contract đã gửi/ký không sửa PDF/terms âm thầm; không có Quote acceptance riêng.
- API errors bổ sung ErrorCode optional, giữ Fail(message, errors) và dictionary errors hiện có để không phá register/login.

Request states: PENDING -> ACCEPTED -> AWAITING_CONTRACT -> AWAITING_DEPOSIT -> ACTIVATED. CHANGES_REQUESTED -> resubmit -> PENDING; REJECTED/CANCELLED kết thúc theo guard. Không thêm Request DRAFT/EXPIRED/OVERDUE.

Contract states: DRAFT -> PENDING_SIGNATURE -> SIGNED -> EFFECTIVE. SIGN_DECLINED/SUPERSEDED/EXPIRED trước ký theo version. Quá hạn cọc không xóa SignedAt hoặc chuyển Request thành EXPIRED. Trip tạo PLANNING, deployment metadata PENDING; không dùng Trip.Status=CONFIRMED.

Ngày Customer là YYYY-MM-DD theo Asia/Ho_Chi_Minh. Timestamp mới UTC; legacy không tự đổi múi giờ. BE kiểm tra todayVN, khoảng lịch departure..deliveryDeadline, minLeadDays theo route và plan preparationDays đã chốt. Send/gia hạn chỉ khi effectiveDeadline > serverNow và effectiveDeadline + preparationDays*24h <= plannedDepartureAt. Hạn giao hàng độc lập hạn ký/cọc/hồ sơ.

Change pending không ghi đè canonical Request và chặn accept/send/sign. Approve validate lại lịch/ngựa/docs/route; tạo version, vô hiệu plan/Contract chưa ký bị ảnh hưởng. Info response không sửa field canonical. Hủy sau ký có tiền cần review tài chính, không tự hoàn tiền/phạt hoặc xóa lịch sử.

## 6. Bản đồ và hợp đồng tích hợp với người phụ trách API

### 6.1. Ba chức năng cần tách

| Chức năng | Input | Output | Nơi dùng |
|---|---|---|---|
| Geocoding | Địa chỉ, country filter | Danh sách địa điểm, tọa độ, country, metadata quyền lưu | Chọn điểm lấy/giao |
| Routing | Tọa độ và profile đường bộ | DistanceMeters, DurationSeconds, geometry nếu được phép | Estimate và Preliminary Plan |
| Map display | Điểm/đường và lớp nền | Bản đồ tương tác | Wizard/chi tiết, không quyết định giá |

Không dùng bản đồ hiển thị thay routing engine. Ngày 16/10/2026 đại ca xác nhận Mapbox free và đồng ý tách nguồn được lưu: Geoapify cho Geocoding/Reverse/Routing, Mapbox cho ảnh bản đồ. Xem [cấu hình và nghiệm thu](../../backend/tools/FLOW1_MAPBOX_SETUP.md). Adapter OSM còn phục vụ cấu hình explicit/fixture; không fallback âm thầm. Các yêu cầu interface bên dưới giữ nguyên.

### 6.2. Interface dự kiến

```csharp
// Application interface; không tham chiếu SDK/provider concrete.
Task<GeocodeResult> SearchAsync(GeocodeQuery query, CancellationToken ct);
Task<RoadRouteResult> CalculateRoadRouteAsync(RoadRouteQuery query, CancellationToken ct);

// RoadRouteResult tối thiểu:
// Provider, Profile, DistanceMeters, DurationSeconds, CalculatedAtUtc,
// InputFingerprint, Geometry? và metadata StoragePermission/Attribution.
```

- FE chỉ gửi lựa chọn/tọa độ và dữ liệu nhập; BE validate lat/lng, country, route và gọi adapter để lấy số liệu giá.
- Nếu nhận reference kết quả từ FE, reference phải do BE cấp, còn hạn và khớp fingerprint các điểm/mode; không nhận `distanceKm` tự khai làm dữ liệu quyết định giá.
- Country không chỉ tin text do FE gửi: đối chiếu vị trí bằng provider hoặc nguồn ranh giới phù hợp; route vẫn chỉ VN->VN/VN->JP.
- Bảo vệ public endpoints bằng input limit, rate limit và timeout; secret nằm ở BE. Public browser token nếu cần dùng token ít quyền và giới hạn origin theo provider.
- Không nhận URL endpoint tùy ý từ FE để BE fetch; provider base URL do server cấu hình.
- Cache chỉ khi điều khoản provider cho phép. Không đưa kết quả geocoding Temporary vào DB, snapshot hoặc log để né hạn chế lưu.
- Chưa có tuyến/hết quota/provider lỗi: trả `ROUTE_NOT_FOUND`, `MAP_PROVIDER_RATE_LIMITED` hoặc `MAP_PROVIDER_UNAVAILABLE`; không lấy 0 km hoặc khoảng cách đường chim bay làm đường bộ.
- Estimate có metadata nguồn/thời điểm; khi đổi địa chỉ/tọa độ/mode phải tính lại. Không gọi lại mỗi lần render.

### 6.3. Tuyến hàng không VN->JP

```text
Pickup tại VN -> sân bay đi   : routing đường bộ nếu được tính trong gói
Sân bay VN -> sân bay JP      : định mức chặng bay / stall
Sân bay JP -> Delivery tại JP : routing đường bộ nếu được tính trong gói
```

Không gọi road routing từ Việt Nam tới Nhật Bản để tính toàn chuyến. Preliminary Plan phải chọn gateway và xác định ground legs đã bao gồm hay tính riêng; nếu không đủ dữ liệu ground leg thì Estimate nói rõ phạm vi dự toán, không giả vờ đã tính door-to-door.

### 6.4. Hạn mức và quyền lưu cần kiểm tra khi tích hợp

Kiểm tra nguồn chính thức ngày 15/10/2026; kiểm tra lại với tài khoản/gói thực tế trước khi chạy live:

- Mapbox Directions đang công bố 100.000 request/tháng miễn phí; map display và geocoding có cách tính riêng. [Pricing](https://www.mapbox.com/pricing).
- Mapbox Temporary geocoding không cho cache; Permanent cho lưu và cần điều kiện tài khoản phù hợp. Không xem free Temporary là quyền lưu tọa độ/địa chỉ đã chuẩn hóa vào Request. [Storage rules](https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results).
- Quyết định free MVP thay phần lưu bằng Geoapify; Mapbox Product Terms 2026-07 mục 2.10.1 cũng hạn chế lưu Navigation API results. Directions cũ trả MayPersist=false, không được persist vào báo giá. Geoapify cho lưu với attribution theo [FAQ](https://www.geoapify.com/) và [Free plan](https://www.geoapify.com/pricing/). Mapbox chỉ hiển thị map, không lưu ảnh.
- Public Nominatim giới hạn tổng ứng dụng tối đa 1 request/giây, phải nhận diện ứng dụng và attribution; không dùng cho autocomplete. Chỉ cân nhắc nếu chủ dự án chủ động chọn và thực hiện policy. [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/).
- Nếu dùng tiles công cộng OSM, tuân thủ attribution/cache, không tải hàng loạt/offline. [Tile policy](https://operations.osmfoundation.org/policies/tiles/).
- Có thể dùng routing engine dựa OSM như OSRM qua một nhà cung cấp hoặc tự host; phải bàn giao URL, khả năng hỗ trợ tuyến, quota và quyền lưu, không coi public demo endpoint là dịch vụ không giới hạn. [OSRM](https://project-osrm.org/).

**Đầu ra bàn giao bản đồ:** provider từng chức năng, config không chứa secret trong Git, request/response mẫu VN->VN và ground legs VN->JP, lỗi/timeout/quota, quyền lưu, attribution, live smoke test. Bộ fake adapter chỉ đủ cho test nghiệp vụ, không đủ nghiệm thu bản đồ thật.

## 7. API contract mục tiêu

### 7.1. Quy ước chung

- Base `/api`; ID string; role Customer/Manager lấy từ JWT và hằng UserRoles.
- Customer truy cập tài nguyên người khác trả 404; sai role trả 403; hết đăng nhập trả 401.
- Thành công giữ `{success,message,data}`. Thêm `errorCode` dạng optional để tương thích API cũ.
- `ApiResponse.Errors` hiện là dictionary: giữ hình dạng hiện có cho endpoint đang chạy; Flow 1 dùng cùng dictionary, đồng bộ example conventions về một định dạng thay vì âm thầm đổi tất cả sang array.
- Mutation có khả năng retry dùng `Idempotency-Key`; lưu actor/operation/hash và tham chiếu kết quả. Dùng lại key với payload khác trả `IDEMPOTENCY_KEY_REUSED`.
- Mutations sửa dữ liệu gửi `expectedVersion` của metadata tương ứng; BE trả `STALE_VERSION` khi dữ liệu đã thay đổi. Không thêm cột SQL rowversion; mọi mutation phải recheck SQL trong request lock.
- Detail trả `allowedActions`; FE dùng hiển thị, BE recheck ở mutation.
- File private trả binary sau auth/ownership; không expose StorageKey như URL public. FormData do browser thiết lập boundary.
- Danh sách phân trang theo conventions; filter và sort có whitelist.

### 7.2. Public và Customer

| Method | Endpoint | Nội dung / guard chính |
|---|---|---|
| GET | `/public/estimates/transport-modes` | Chỉ cặp VN->VN/ROAD hoặc VN->JP/AIR |
| POST | `/public/estimates` | Dự toán; không tạo Request/Quote/Contract/Trip; rate limit |
| POST | `/customer/estimates` | Dự toán authenticated, cùng PricingService |
| GET | `/customer/requests/form-options` | Route/mode, mức sàn chuẩn bị, earliest date, giới hạn có cấu hình |
| GET | `/customer/horses/selectable` | Owner + ACTIVE + availability theo departure/deadline |
| POST | `/customer/horses` | Multipart payload + photo + passportScan; tạo độc lập Request |
| GET | `/customer/horses/{horseId}/documents` | Hồ sơ Customer sở hữu, version hiện hành/lịch sử phù hợp |
| POST | `/customer/horses/{horseId}/documents` | Cập nhật hồ sơ bằng version mới trước revision; tái sử dụng route tương đương nếu đã có |
| POST | `/customer/requests` | JSON đầy đủ, horseIds/document versions, validation và khóa lịch; 201 |
| GET | `/customer/requests` | Danh sách của Customer |
| GET | `/customer/requests/{requestId}` | Detail, canonical version, hợp đồng hiện hành, payment summary, allowedActions |
| PUT | `/customer/requests/{requestId}/revision` | Chỉ CHANGES_REQUESTED; full payload; về PENDING |
| GET/POST | `/customer/requests/{requestId}/change-requests` | Đề xuất thay đổi trước ký; canonical chưa đổi |
| POST | `/customer/requests/{requestId}/cancel` | Trước ký, reason bắt buộc |
| GET/POST | `/customer/requests/{requestId}/cancellation-requests` | Sau ký theo scope mục 7.3; không hoàn tiền tự động |
| GET | `/customer/requests/{requestId}/info-requests` | Hỏi đáp thuộc đơn |
| POST | `/customer/requests/{requestId}/info-responses` | JSON/multipart, gắn đúng infoRequestId |
| GET | `/customer/contracts/{contractId}` | DTO Customer, không lộ cost/floor/audit nội bộ |
| GET | `/customer/contracts/{contractId}/document` | PDF bất biến của đúng version; hash trong metadata/header phù hợp |
| POST | `/customer/contracts/{contractId}/otp` | Current version, pending signature, còn hạn, không pending change |
| POST | `/customer/contracts/{contractId}/sign` | ChallengeID + OTP + version/hash; một lần, idempotent |
| POST | `/customer/contracts/{contractId}/decline` | Trước ký, reason, lưu SIGN_DECLINED |
| GET | `/customer/requests/{requestId}/payments` | Cọc phải thu, đã nhận, còn thiếu, paymentLocked, transactions |
| GET | `/customer/payments/bank-info?requestId=...` | Bank config, nội dung định danh riêng Request/invoice |
| POST | `/customer/payments/manual` | Proof + khai báo; chỉ tạo PENDING_CONFIRMATION |
| POST | `/customer/payments/online` | Tạo phiên VNPay cho receivable còn thiếu; khóa/rate limit session |
| GET | `/customer/payments/transactions/{transactionId}` | Trạng thái từ BE; dùng sau Return URL |
| GET | `/customer/payments/transactions/{transactionId}/receipt` | Biên nhận xác nhận nếu có; không coi ảnh tự upload là xác nhận |

Route document/file mới là phần bổ sung đề xuất; trước code đối chiếu route dùng chung `/files/*` và API Customer hiện có để tái sử dụng, không tạo hai endpoint khác nghĩa cùng URL.

### 7.3. Manager và provider

| Method | Endpoint | Nội dung / guard chính |
|---|---|---|
| GET | `/manager/requests` và `/{requestId}` | Danh sách/chi tiết theo role, lọc trạng thái |
| POST | `/manager/requests/{requestId}/accept` | PENDING, không pending change |
| POST | `/manager/requests/{requestId}/reject` | Trước ký theo allowedActions, reasonGroup/reason |
| POST | `/manager/requests/{requestId}/request-revision` | PENDING, reason + fields |
| GET | `/manager/requests/{requestId}/revisions` | Lịch sử version/sửa đổi |
| GET/POST | `/manager/requests/{requestId}/info-requests` | Hỏi bổ sung, không sửa canonical |
| GET | `/manager/requests/{requestId}/change-requests` | Hàng đợi thay đổi |
| POST | `/manager/requests/{requestId}/change-requests/{actionId}/approve` hoặc `/reject` | Version, khóa, validate lại |
| GET | `/manager/requests/{requestId}/cancellation-requests` | Hàng đợi hủy sau ký |
| POST | `/manager/requests/{requestId}/cancellation-requests/{actionId}/approve` hoặc `/reject` | Guard tài chính, thẩm quyền, trạng thái |
| GET/PUT | `/manager/requests/{requestId}/preliminary-plan` | Tạo version plan; ACCEPTED; không tạo Trip |
| GET | `/manager/requests/{requestId}/quote-suggestion` | Cost/floor/suggested; Customer bị chặn |
| POST | `/manager/requests/{requestId}/contracts` | DRAFT version đầu từ plan/request đã chốt |
| POST | `/manager/requests/{requestId}/contract-versions` | Version mới từ dữ liệu hiện hành trước ký |
| GET/PUT | `/manager/contracts/{contractId}` | Detail / chỉ sửa DRAFT; expectedVersion |
| GET | `/manager/contracts/{contractId}/document` | Preview DRAFT hoặc PDF phát hành; phân biệt watermark |
| POST | `/manager/contracts/{contractId}/send` | CompletionDeadline + version; PDF ready; chuyển AWAITING_CONTRACT |
| POST | `/manager/requests/{requestId}/deposit-extensions` | Gia hạn deadline chung, reason, feasibility |
| POST | `/manager/requests/{requestId}/cancel-overdue-deposit` | Quá hạn, không đủ cọc, không pending đối soát |
| GET | `/manager/requests/{requestId}/payments` | Payment summary nội bộ |
| GET | `/manager/payments/pending` và `/transactions/{transactionId}` | BANK_TRANSFER chờ đối soát |
| POST | `/manager/payments/transactions/{transactionId}/confirm` hoặc `/reject` | Chỉ bank, số thực nhận/reference/receivedAt |
| GET | `/manager/trips/{tripId}` | PLANNING + deployment + feasibility |
| POST | `/manager/trips/{tripId}/confirm-deployment` | EFFECTIVE/ACTIVATED, đủ cọc, lịch khả thi |
| POST | `/manager/trips/{tripId}/hold-deployment` hoặc `/resume-deployment` | Chưa khởi hành, revalidate readiness |
| Provider callback | URL IPN được module VNPay công bố | Xác thực provider, không lấy Customer JWT làm chứng cứ |

Không có FE API `POST /activate`; không có Manager confirm VNPay giả lập tại endpoint bank.

### 7.4. Payload mẫu cần đưa vào OpenAPI

```json
{
  "desiredDepartureDate": "2026-11-20",
  "deliveryDeadline": "2026-11-25",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "preferredTransportMode": "AIR",
  "pickup": {
    "address": "Địa chỉ do khách cung cấp",
    "lat": 10.8,
    "lng": 106.6,
    "contact": {"name": "Người giao", "phone": "Số điện thoại hợp lệ"}
  },
  "delivery": {"address": "Địa chỉ nhận", "lat": 35.6, "lng": 139.7},
  "receiver": {"name": "Người nhận", "phone": "Số điện thoại hợp lệ", "isProxy": true},
  "horseIds": ["horse-001"],
  "documentVersionReferences": [{"horseId": "horse-001", "photoVersion": 1, "passportVersion": 1}]
}
```

Tọa độ và ngày trên chỉ minh họa hình dạng payload, không phải tuyến đã kiểm tra. Backend không nhận price, ownerId hoặc trạng thái đã xác nhận từ payload này.

```json
{
  "completionDeadline": "2026-11-10T10:00:00Z",
  "expectedVersion": 1,
  "note": "Hoàn tất xác nhận OTP và tiền cọc trước hạn"
}
```

```json
{
  "challengeId": "challenge-001",
  "otp": "123456",
  "contractVersion": 1,
  "documentHash": "SHA256_OF_ISSUED_PDF"
}
```

```json
{
  "success": true,
  "message": "Payment summary",
  "data": {
    "currency": "VND",
    "depositPercent": 40,
    "depositRequiredAmount": 46000000,
    "depositConfirmedAmount": 20000000,
    "depositOutstandingAmount": 26000000,
    "paymentLocked": false,
    "contractStatus": "SIGNED",
    "requestStatus": "AWAITING_DEPOSIT",
    "trip": null,
    "allowedActions": ["PAY_DEPOSIT", "VIEW_CONTRACT"]
  }
}
```

## 8. Pricing và số tiền cọc

### 8.1. Policy MVP

Đặt tại `Application/Common/Flow1/Flow1PricingPolicy.cs`, có `PricingPolicyVersion`. Đây là định mức demo được lấy từ plan ban đầu, không phải báo giá thị trường đã kiểm chứng.

| Khoản | Định mức |
|---|---|
| Road | 35.000 VND / km / xe chuyên dụng |
| Air VN->JP | 70.000.000 VND / stall |
| Thủ tục | 15.000.000 VND / chuyến |
| Thú y | 10.000.000 VND / chuyến |
| Bảo hiểm | 5.000.000 VND / ngựa |
| Giá sàn | EstimatedCost * 1.05 |
| Giá đề xuất | EstimatedCost * 1.20 |
| Cọc | ContractTotal * 0.40 |

`CostCategory`: TRANSPORT, PROCEDURE, VETERINARY_CARE, INSURANCE. Phí thủ tục/thú y tính một lần cho toàn chuyến theo policy MVP, không nhân lặp theo từng ground leg. Khi cần phân biệt nội địa/quốc tế, thay bằng version policy đã thống nhất và sửa fixture, không tự thay số minh họa trong code.

### 8.2. Số xe và stall

- `vehicleCount = ceil(horseCount / standardVehicleCapacityStalls)` trong Estimate.
- Sức chứa chuẩn phải lấy từ config fixture/đội xe được kiểm chứng; không mặc định một xe chở mọi số ngựa. Không bịa số chỗ thật trong plan.
- Preliminary Plan có thể chọn số xe/phương án khác dự toán; budget và gợi ý giá phải phản ánh phương án Manager chọn.
- MVP dùng một ngựa một stall cho dự toán nếu cấu hình không có quy tắc khác; lưu cả horseCount và stallsRequired. Thay đổi sức chứa/chiếm stall phải có policy version, không suy ra từ hãng bay chưa tích hợp.
- Sức chứa chuẩn MVP đã được đại ca chốt 1 ngựa/xe ngày 16/10/2026; đây là policy MVP, chưa xác minh đội xe thực tế. Thiếu gateway cần thiết vẫn báo cấu hình chưa đủ; không suy ra từ fixture.

### 8.3. Tiền tệ, làm tròn và dữ liệu tin cậy

1. Flow 1 mới chỉ VND; BE đặt currency trên Contract/Line/Invoice/Payment.
2. Dùng C# decimal cho tiền; không float/double, không nhận total/deposit do FE tính.
3. Thiết kế MVP làm tròn từng line về VND nguyên bằng `MidpointRounding.AwayFromZero`, sum các line đã làm tròn; floor/suggested/deposit cũng làm tròn về VND nguyên bằng cùng quy tắc.
4. `TotalQuotedPrice` là sum Contract lines; `depositAmount` là 40% sau làm tròn; snapshot giữ giá trị cuối.
5. Kiểm tra overflow và giới hạn schema `decimal(12,2)` hiện có; nếu nhu cầu thực tế vượt thì migration mở rộng đồng bộ FK/value fields, không bỏ kiểm tra.
6. `+20%` là markup trên cost, không gọi là 20% profit margin trên doanh thu.
7. Manager được sửa selling price trong DRAFT; BE tính lại. Dưới floor bắt buộc reason và audit; không thêm tầng duyệt mới.
8. Customer chỉ nhận selling lines/total; estimated cost, floor, profit và override note là dữ liệu Manager.

Ví dụ theo policy MVP đã chốt: 300 km, 2 ngựa, sức chứa 1 ngựa/xe nên cần 2 xe,
áp dụng đầy đủ phí bảng MVP, không có phụ phí. Fixture cũ 2 ngựa/1 xe chỉ dùng kiểm thử
thuật toán với capacity=2, không phải sức chứa vận hành hiện tại.

```text
Road cost       = 300 * 35.000 * 2          = 21.000.000
Procedure       =                           15.000.000
Veterinary      =                           10.000.000
Insurance       = 2 * 5.000.000             = 10.000.000
EstimatedCost   =                           56.000.000
Floor           = EstimatedCost * 1.05      = 58.800.000
Suggested       = EstimatedCost * 1.20      = 67.200.000
Deposit nếu bán bằng Suggested             = 26.880.000
```

Fixture Contract 115.000.000 VND cho khoản cọc 46.000.000 VND. Đây là hai fixture độc lập, không phải một hợp đồng buộc phải có giá đề xuất bằng 115 triệu.

## 9. PDF và OTP

Nguồn runtime versioned: backend/WebApi/Resources/Contracts/v1/contract-template.docx, có manifest SHA-256 và danh sách placeholder. Nguồn tham chiếu giữ nguyên bytes. Spike không phải hợp đồng production.

1. Plan/request hiện hành, selling lines, cọc 40%, template version và deadline được đóng thành snapshot trong metadata Contract.
2. Sinh PDF vào staging, xác minh bytes/hash/font/layout, chuyển sang private key immutable; lỗi converter giữ DRAFT.
3. Mở SQL request transaction, recheck status/version/plan/pending change, lưu CompletionDeadline, PENDING_SIGNATURE/AWAITING_CONTRACT; không tạo Trip.
4. Customer xem/tải PDF đúng ContractID/version/hash. Sau send không ghi đè file đó.
5. OTP 6 số dùng RNG mật mã, HMAC server, TTL tối đa 5 phút và deadline, cooldown 60s, tối đa 5 lần sai, rate limit account/contract/IP; resend vô hiệu mã cũ. Challenge và attempt metadata tách OTP đăng ký, không lưu mã thô.
6. Sign kiểm tra owner/current version/hash/deadline/pending change. Chuẩn bị acceptance evidence, commit SIGNED/SignedAt/AWAITING_DEPOSIT + invoice DEPOSIT + acceptance/consumed challenge/receipt trong cùng SQL transaction sau S2; không finalize file sau commit. Hai sign chỉ một kết quả tài chính.
7. Không re-render PDF gốc để in OTP/SignedAt rồi vẫn dùng hash cũ. Nếu cần, tạo receipt xác nhận riêng tham chiếu hash gốc.
8. Email OTP gửi theo transport được cấu hình; không để raw OTP trong outbox metadata/log. Quay lại/reload đọc SQL, không ký lại vì mất local state.

Template hiện có cả placeholder chữ ký số, mã OTP thô, TripID và dữ liệu bàn giao thực tế; phải chỉnh semantics ở giai đoạn 4. Chưa có Trip thì dùng Request/plan reference, không bịa Trip. Bàn giao chưa phát sinh không điền như đã thực hiện. Bổ sung completionDeadline vào bản template dùng phát hành, vì nguồn hiện tại chưa có placeholder riêng cho trường này.

Converter phải ở sau IFlow1ContractDocumentGenerator. Thử trên đúng runtime deploy, có timeout/concurrency/fonts. Giai đoạn 1 đã kiểm chứng LibreOffice 26.8.1.1 headless ở private App_Data: bind 109 lần xuất hiện của 67 placeholder, render PDF 12 trang và QA đủ 12 ảnh trang. Script backend/tools/Invoke-ContractPdfSpike.ps1 dùng executable rõ ràng, profile riêng và timeout; chuẩn bị bằng Install-Flow1LibreOffice.ps1, hướng dẫn tại backend/tools/PDF_SPIKE.md. Không dùng Word/WPS COM. Bản sinh giữ nguyên hash template gốc, chỉ chống tách hàng bảng và bổ sung PAGE field trong footer. Giai đoạn 4 vẫn phải kiểm chứng runtime deploy và .NET adapter; sửa các nhãn chữ ký/OTP, USD, tự hủy 24 giờ và bàn giao cố định trước phát hành. Chi tiết bằng chứng tại FLOW1_PHASE1_REPORT.md.

## 10. Invoice, thanh toán và activation

- Một invoice DEPOSIT/Contract, requiredAmount = round(total*40%). InvoiceType và CurrencyCode BE đặt rõ; tiền cũ/currency cũ giữ nguyên.
- PAYMENT.Amount là tiền thực nhận đã xác minh; pending proof không cộng. Requested/declared amount và provider details không có cột phù hợp thì giữ metadata payment, không đổi nghĩa Amount.
- PaidAmount là projection đối chiếu ledger Payment SUCCESS; outstanding=max(required-confirmed,0), tiền dư ghi đủ và flag review.
- Bank proof chỉ PENDING_CONFIRMATION. Manager nhập số thực nhận, bank reference và receivedAt; confirm/reject lưu lịch sử; không cho endpoint bank xác nhận VNPay.
- VNPay adapter tái sử dụng module hiện có; không lấy SandboxPaymentStore làm ledger. BE tạo session theo outstanding, reference ổn định; IPN đối chiếu signature/merchant/reference/amount/currency/result. So amount với requested amount của payment đó, không với outstanding hiện tại.
- Return URL không ghi SUCCESS; FE đọc REST. Public HTTPS IPN phải test riêng, local signed callback chưa đủ.
- SQL state hỗ trợ idempotency; SQL request lock, ledger/status recheck và receipt cùng transaction là hàng rào ghi tiền. Callback retry sau crash không cộng hai lần.

```text
Verify provider ngoài SQL transaction khi cần
BEGIN SQL TRANSACTION + Request lock
  Re-read current Contract, Invoice, Payment, Request
  Chống duplicate theo PaymentID/TransactionCode và metadata operation đã kiểm chứng
  Ghi tiền thực nhận hợp lệ đúng một lần; cập nhật invoice
  Nếu SIGNED + AWAITING_DEPOSIT + đủ cọc:
      Contract EFFECTIVE, Request ACTIVATED
      INSERT Trip PLANNING (unique RequestID), link Contract.TripID
COMMIT
Receipt/evidence SQL đã commit cùng tiền; notification gửi ngoài transaction có retry riêng
```

Callback đến muộn vẫn phải đối soát tiền thực nhận. Request CANCELLED không tự hồi sinh. Nếu đủ tiền hợp lệ nhưng lịch không khả thi, Trip có thể PLANNING để xử lý nghiệp vụ, deployment chưa được confirm. Không sửa ngày/PDF đã ký để làm lịch pass. Partial/overpayment và mọi nhánh crash phải được test trước nghiệm thu phase 5.

## 11. Deadline, gia hạn và hủy

- CONTRACT.CompletionDeadline là hạn gốc lúc send. effectiveCompletionDeadline lấy extension metadata hợp lệ mới nhất hoặc hạn gốc; API trả cả hai khi cần.
- Gia hạn lưu old/new deadline + actor/reason/time; không ghi đè PDF/deadline gốc. New deadline sau hạn cũ và serverNow, vẫn đủ preparationDays trước departure.
- Chưa ký đã EXPIRED thì phát hành version mới; đã SIGNED thì giữ chữ ký, mở payment lại khi gia hạn hợp lệ.
- Quá hạn khóa sign/payment/proof mới; không tự CANCELLED hoặc giải phóng lịch ngựa chỉ do job chạy.
- Cancel overdue chỉ Manager, chưa activated/kết thúc, đã đối soát, không còn pending proof/transaction hoặc gia hạn hợp lệ. Có tiền một phần thì FINANCIAL_REVIEW_REQUIRED; không tự tính phạt/hoàn tiền.
- Cancel giữ tất cả Contract/PDF/payment/history; metadata/challenge được vô hiệu đúng scope, SQL status là nguồn chuẩn.

## 12. Deployment và ranh giới Flow 2/3

Confirm chỉ khi Request ACTIVATED, Contract EFFECTIVE, đủ cọc, Trip PLANNING, current plan/snapshot đúng và lịch còn khả thi. Deployment lưu trong CONTRACT SQL state, gắn TripID: PENDING -> CONFIRMED hoặc ON_HOLD, có actor/time/reason/history.

Flow 2/3 lấy Request/Trip/Contract IDs, versions metadata, preliminary plan, horse/document references, gateway, dates và deliveryDeadline. Tác vụ chính thức chỉ sau deployment CONFIRMED, BE recheck khi ghi. Không chỉ ẩn nút FE.

Hold/resume chỉ trước milestone xuất phát. Hold từ READY_TO_DEPART yêu cầu engine re-evaluate về PLANNING; resume không tự READY. Không rollback IN_TRANSIT bằng Flow 1. Upload passport không tự APPROVED, thu phí bảo hiểm không tự đánh đã mua; Specialist vẫn xác nhận checklist. Điều phối Route và Documents/Operations READY thuộc Flow 2/3.

Sự kiện/handoff có EventID/schemaVersion/requestId/tripId/contractId/planVersion để dedupe. Phương án metadata cần retry/reconcile, không tuyên bố durable SQL outbox. Nếu Flow 2/3 chưa có implementation thì chỉ nghiệm thu contract handoff, chưa tuyên bố connected E2E.

## 13. File cần tạo/sửa theo lớp

| Đường dẫn | Trách nhiệm |
|---|---|
| backend/Domain/Entities/Contract.cs | Chỉ hai cột mới và nullable Trip; Request navigation |
| backend/Domain/Interfaces/IFlow1UnitOfWork.cs | Transaction/horse lock contract, không EF |
| backend/Domain/Interfaces/DAOs/IFlow1Repository.cs | DAO stage/query; không tự SaveChanges |
| backend/Application/Common/Flow1/Flow1ContractFactory.cs | Draft chuẩn VND/40%, chưa Trip |
| backend/Application/Common/Flow1/Flow1PrivateFileOptions.cs | Private byte root và retained legacy source root; config cũ chỉ tương thích đường dẫn |
| backend/Application/Interfaces/Flow1/IFlow1StateStore.cs | SQL state document/revision port, S1 có implementation/test |
| backend/Application/Interfaces/Flow1/IntegrationContracts.cs | Maps/PDF/VNPay adapter contracts, chưa giả implementation |
| backend/Infrastructure/Data/Configurations/Flow1/*.cs | EF mapping Contract, Trip unique, invoice cọc unique |
| backend/Infrastructure/Transactions/Flow1UnitOfWork.cs | SQL Serializable, request/horse applocks, commit/rollback |
| backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs | DAO dùng cùng scoped DbContext/UoW |
| backend/Infrastructure/Storage/SqlFlow1StateStore.cs | SQL transaction/CAS/replay/owner validation, không filesystem |
| backend/Infrastructure/Storage/Flow1LegacyStateImporter.cs | Offline inventory/import/parity; không đăng ký endpoint/DI, không tự migration hoặc xóa source |
| backend/Application/DTOs/ApiResponse.cs và Common/Exceptions/BusinessRuleException.cs | ErrorCode optional; giữ callers cũ |
| backend/WebApi/Middlewares/GlobalExceptionMiddleware.cs | ErrorCode + status từ business exception |
| backend/WebApi/Extensions/Flow1ServiceExtensions.cs và Program.cs | DI foundation; không auto-migrate hoặc tạo workflow/background jobs |
| backend/WebApi/Resources/Contracts/v1/* | Template reference và manifest; không chứa dữ liệu Customer |
| backend/tools/Invoke-ContractPdfSpike.ps1 | Thử converter local trên fixture rõ là demo |
| backend/database/000,002,003 *.sql và README.md | Baseline an toàn, preflight, migration tối thiểu và vận hành |
| backend/tests/Flow1.Tests/* | SQL thật disposable, metadata concurrency, errors và factory |

Các giai đoạn sau thêm DTO/services/controllers cho Estimates/Horses/Requests/Contracts/Payments/Trips vào active projects, adapter thật ở Infrastructure/ExternalServices. Chưa tạo các controller rỗng để làm như API đã xong.

Frontend dùng frontend/src/shared/api/apiClient.ts và router hiện có. API/types và các trang Flow 1 thực tế ở frontend/src/features/flow1/; ManagerPages.tsx nối list/detail/review/plan/Draft, CustomerPages.tsx và CustomerReviewPanel.tsx nối Wizard/revision/proposal/feedback. Router Manager dashboard dùng list thật; module mock cũ không còn là entry point của flow này. Từ phase 2, FE nối từng use case và test cùng BE; không đợi cuối mới làm toàn bộ FE.

## 14. Sáu giai đoạn thực thi

| Giai đoạn | Công việc | Điều kiện nghiệm thu |
|---|---|---|
| 1. Nền tảng | Chốt thiết kế tối thiểu; migration/entity/DAO/UoW; metadata version/audit; ErrorCode tương thích; adapter contracts; spike PDF | DB mới/legacy nâng cấp đúng, Contract trước Trip, rollback/concurrency đúng, auth regression; converter xuất sample và QA font/bố cục từng trang |
| 2. Estimate + Wizard | Routing/pricing có version, Horse/files, selectable, Submit/list/detail, Customer FE | Khách thực sự tạo PENDING; đúng quyền/lịch; chưa Contract/Trip |
| 3. Review + Plan | Manager accept/reject/revision/info/change; plan metadata, budget, suggestion, Draft core | Có plan và selling total/cọc BE tính; canonical snapshot/version đúng |
| 4. PDF + OTP | Template production, immutable PDF/hash, send/sign/decline, challenge/rate limit, deadline/extension, receipt | Sau SQL cutover: SIGNED/AWAITING_DEPOSIT + invoice + receipt cùng transaction; reload/retry đúng, không sửa PDF; S1–S3 phải hoàn tất trước nghiệm thu storage mới |
| 5. Payment + Activation | Bank trước, rồi VNPay vào cùng ledger; partial/excess/late/cancel guards, recovery/notifications | Đủ tiền đã xác minh -> EFFECTIVE/ACTIVATED + đúng một Trip PLANNING; retry không cộng trùng |
| 6. Deployment + E2E | Confirm/hold/resume, connected handoff Flow 2/3, UAT/reload/ownership, docs cuối | Bàn giao đúng quyền/version; toàn chuỗi có evidence; nêu rõ live dependency thiếu |

Sau phase 1 có thể giao adapter Maps/VNPay/PDF cho người phụ trách theo interface. Mỗi task ghi file exact path, input/output, status guards, metadata/SQL boundary và test IDs. Không tự sửa legacy DAO hoặc module đồng đội ngoài hợp đồng bàn giao.

Ngày 16/10/2026, đại ca đã cho phép lịch mỗi hai tiếng triển khai một giai đoạn kế tiếp, kiểm thử và commit local cho phase 2–6; không push/deploy hoặc áp migration lên DB nghiệp vụ. Xem [phase 1](FLOW1_PHASE1_REPORT.md), [phase 2](FLOW1_PHASE2_REPORT.md), [điều chỉnh Maps free](FLOW1_PHASE2_FREE_MAPS_REPORT.md), [nghiệm thu live phase 2](FLOW1_PHASE2_LIVE_REPORT.md) và [phase 3 Review/Plan/Quote/Draft](FLOW1_PHASE3_REPORT.md). **Phase 1–3 hoàn thành trong phạm vi local/test đã cấp**: phase 2 có live Geoapify/Mapbox; phase 3 có Customer/Manager browser nối SQL/file riêng, Maps fixture, SQL/file receipt recovery cho review/Draft. **Phase 4 PDF/OTP/deadline/recovery đang thực hiện**; tiếp tục phần còn lại theo [increment C](FLOW1_PHASE4_LIFECYCLE_REPORT.md), không hỏi lại Maps key hay capacity=1. Chưa nghiệm thu thanh toán/Trip hoặc full Flow 1 UAT. Payload/API thực tế được ghi trong báo cáo từng phase để phân biệt với ví dụ thiết kế ở mục 7.

## 15. Ma trận kiểm thử và bằng chứng nghiệm thu

**Storage decision mới nhất:** [S1 SQL foundation](FLOW1_PHASE4_SQL_STATE_REPORT.md)
có migration 004/SQL state port. [S2](FLOW1_PHASE4_SQL_CUTOVER_REPORT.md) đã chuyển
Customer/review/publication/OTP/sign sang SQL transaction chung, gỡ recovery route/UI
dành file saga. [S3](FLOW1_PHASE4_SQL_IMPORT_REPORT.md) đã có offline importer/parity,
gỡ file provider và kiểm Chrome sau import. [Increment C](FLOW1_PHASE4_LIFECYCLE_REPORT.md)
có decline/explicit expire/reissue và lịch sử PDF. Tiếp theo effective-deadline
extension và legacy Contract FE. DB nghiệp vụ
chưa áp 004/import; không coi test import là xác minh live/production.

**Cập nhật phase 4, 16/10/2026:** [increment A](FLOW1_PHASE4_REPORT.md) có PDF v2/private
immutable publication/deadline gốc/recovery, real LibreOffice 13-page QA và Chrome
download hash. [Increment B](FLOW1_PHASE4_ACCEPTANCE_REPORT.md) bổ sung Customer
email OTP gắn version/hash, ký tạo đúng một hóa đơn cọc 40%, receipt/recovery giữa
SQL và file, giao diện và kiểm thử; S2 đã thay bằng SQL transaction chung.
Increment C thêm decline/explicit expire/reissue bằng SQL. **Phase 4 vẫn IN_PROGRESS**:
tiếp tục effective-deadline extensions và thay contract route legacy;
chưa bắt đầu phase 5 và chưa tuyên bố full Flow 1 UAT. SMTP registration hiện có;
dedicated OTP HMAC key cần điền private trước nghiệm thu cấu hình vận hành.

### 15.1. Loại kiểm thử

| Loại | Phạm vi | Giới hạn phải ghi rõ |
|---|---|---|
| Unit | Giá, làm tròn, thời gian, state guards, OTP policy, DTO mapping | Không chứng minh FK/unique/SQL locks |
| SQL integration | Migration, transaction, metadata expectedVersion, duplicate/parallel payment, lịch ngựa | Dùng SQL Server test instance; EF InMemory/SQLite không thay được các semantics SQL Server |
| Adapter contract | Fake routing/mail/payment/converter, failure/timeouts | Không chứng minh dịch vụ ngoài đã hoạt động |
| Live smoke | Maps, SMTP, PDF runtime, VNPay public IPN | Dùng môi trường test/Sandbox; giữ evidence không chứa secret |
| Browser E2E | Customer + Manager + reload + downstream handoff | Mock API chỉ là UI test, không gọi E2E thật |

### 15.2. Test cases bắt buộc

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| F1-01 | Estimate 300 km/2 ngựa/capacity=1 → 2 xe | Cost 56.000.000; suggested 67.200.000; floor 58.800.000 |
| F1-02 | Đúng 500 km / trên 500 km | Mức sàn chuẩn bị 2 / 3 ngày |
| F1-03 | VN->TH, JP->VN hoặc mode sai | UNSUPPORTED_ROUTE / UNSUPPORTED_TRANSPORT_MODE |
| F1-04 | Provider lỗi/quota/no route | Lỗi có mã, không dự toán dựa 0 km |
| F1-05 | Sửa distance/price/currency từ FE | BE không tin; tính lại hoặc reject |
| F1-06 | VN->JP có ground legs | Phí road/air tách đúng, phí per-trip không nhân lặp |
| F1-07 | Guest tạo Horse/Request | 401, không ghi dữ liệu riêng tư |
| F1-08 | Upload thiếu file/sai loại/quá dung lượng | Reject, không để Horse dở được coi hợp lệ |
| F1-09 | Thêm Horse rồi quay lại Wizard | Giữ địa chỉ/ngày, có ngựa mới, không tạo lại khi Back/Next |
| F1-10 | Horse khác chủ hoặc không ACTIVE | 404/validation phù hợp, không Submit được |
| F1-11 | Hai Submit cùng Horse trùng khoảng | Chỉ một thành công; không double booking |
| F1-12 | Ngựa đã đi lịch khác không overlap | Cho phép theo availability, không chặn vĩnh viễn |
| F1-13 | Departure quá sớm; timezone sát nửa đêm VN | Chặn đúng ngày; không lệch do UTC/FE clock |
| F1-14 | Submit hợp lệ, isProxy=true | PENDING/version1; verification required chưa confirmed; chưa Contract/Trip |
| F1-15 | Idempotency Submit retry / key cùng payload khác | Trả cùng Request / 409 |
| F1-16 | Manager accept/reject/revision | Đúng guard, reason, audit và notification |
| F1-17 | Revision khi không CHANGES_REQUESTED | 409; canonical không bị đổi |
| F1-18 | Change pending rồi sign/send | Bị chặn; Request chưa bị ghi đè |
| F1-19 | Approve change làm đổi giá/lịch | Version mới, plan/Contract cũ bị vô hiệu phù hợp |
| F1-20 | Approve đồng thời action/stale version | Một quyết định; request còn nhất quán |
| F1-21 | Info response | Lưu hỏi đáp; address/date/horse/price không tự đổi |
| F1-22 | Chưa Preliminary Plan đã tạo Contract | PRELIMINARY_PLAN_REQUIRED |
| F1-23 | Manager giảm preparation dưới sàn | Reject; không gửi hợp đồng để lách lịch |
| F1-24 | Giá dưới floor thiếu/có reason | Reject / cho phép với audit |
| F1-25 | Contract total 115 triệu, FE gửi cọc 30% | Không chấp nhận override; cọc BE là 46 triệu |
| F1-26 | Sinh PDF tiếng Việt, bảng dài, placeholder | Font/bố cục đúng; không thiếu dữ liệu bắt buộc |
| F1-27 | Converter/file/DB lỗi lúc send | Không có PENDING_SIGNATURE trỏ PDF mất; staging được phục hồi/cleanup |
| F1-28 | Send/gia hạn deadline không đủ chuẩn bị | DEPARTURE_SCHEDULE_NOT_FEASIBLE |
| F1-29 | OTP sai, quá 5 lần, TTL, resend quá sớm | Attempt/cooldown/expiry đúng; 429 khi rate limit |
| F1-30 | OTP của user/version/hash cũ | Không ký được version hiện tại |
| F1-31 | Hai sign đồng thời / retry sau success | Một acceptance, một invoice cọc, SIGNED/AWAITING_DEPOSIT |
| F1-32 | Reload/back sau sign | Vẫn SIGNED; không yêu cầu ký lại |
| F1-33 | Sửa Contract sau send/sign | Reject hoặc version mới hợp lệ trước ký; PDF/hash gốc không đổi |
| F1-34 | Decline hợp đồng | SIGN_DECLINED; Request không tự CANCELLED; Manager tạo version tiếp |
| F1-35 | Payment trước sign / sau hạn | CONTRACT_NOT_SIGNED / PAYMENT_DEADLINE_EXPIRED |
| F1-36 | Upload proof | Pending; confirmed amount không tăng |
| F1-37 | Manager reject proof | Lưu reason; Request không tự hủy |
| F1-38 | Confirm bank thực nhận khác khai báo | Ledger dùng confirmedAmount, audit giữ khai báo |
| F1-39 | Cọc một phần rồi online | Online chỉ tạo số còn thiếu; chưa Trip khi thiếu |
| F1-40 | Bank confirm + IPN đồng thời đủ cọc | Một Trip, không mất tiền, tiền dư được ghi rõ |
| F1-41 | IPN sai signature/merchant/reference/amount | Không SUCCESS/activation; response theo adapter |
| F1-42 | Return URL giả success | UI vẫn đọc REST, không tự ghi SUCCESS |
| F1-43 | Duplicate IPN/bank confirm | Không cộng tiền hai lần, không sinh Trip thứ hai |
| F1-44 | Callback đến muộn từ session hợp lệ | Đối soát và lưu đúng; deployment guard vẫn xét lịch |
| F1-45 | Callback sau Request CANCELLED | Không hồi sinh Request; lưu tiền hợp lệ và flag review |
| F1-46 | Lỗi giữa cập nhật tiền và tạo Trip | Transaction rollback nhất quán; retry xử lý được |
| F1-47 | SignalR/mail lỗi sau commit | DB vẫn thành công; metadata receipt/reconciliation hỗ trợ retry, không nhân đôi notification; không giả định SQL outbox |
| F1-48 | Hết hạn sau sign | Giữ SIGNED/AWAITING_DEPOSIT, khóa thao tác mới |
| F1-49 | Gia hạn hợp lệ | History old/new/actor/reason; không sửa PDF; mở payment khi hợp lệ |
| F1-50 | Cancel overdue có proof/IPN pending/tiền một phần | Chặn và yêu cầu đối soát/tài chính, không xóa lịch sử |
| F1-51 | Cancellation sau ký không tiền, chưa activated | Manager review theo quyền, terminate/cancel atomically |
| F1-52 | Activation bình thường | EFFECTIVE + ACTIVATED + một Trip PLANNING/deployment PENDING |
| F1-53 | Confirm deployment lịch không khả thi | Reject; không tự sửa Contract date |
| F1-54 | Confirm deployment hợp lệ | CONFIRMED; downstream có task đúng scope, dedupe EventID |
| F1-55 | Hold/resume trước đi và sau IN_TRANSIT | Trước đi revalidate readiness; sau đi từ chối Flow 1 action |
| F1-56 | Flow 2/3 ghi khi deployment chưa confirmed/đang hold | BE chặn; không chỉ ẩn nút |
| F1-57 | Customer xem request/PDF/proof của người khác | 404; không lộ storage key/chi phí nội bộ |
| F1-58 | Customer gọi quote-suggestion/Manager endpoint | 403 |
| F1-59 | Migration DB mới + DB legacy + chạy lại | Không mất dữ liệu, không unique lỗi âm thầm, báo conflict rõ |
| F1-60 | Regression register/login và Sandbox độc lập | Luồng đang có vẫn chạy trong phạm vi checks |

### 15.3. Hai happy paths và một đường thất bại

- **HP-A:** VN->VN, ngựa đã có, Manager accept, plan, PDF/OTP, bank đủ cọc, activation, confirm deployment, Flow 2/3 thấy tác vụ.
- **HP-B:** VN->JP, thêm Horse trong Wizard, plan có gateway/ground legs, PDF/OTP, VNPay Sandbox public IPN, activation, confirm deployment.
- **NP-A:** request-revision -> resubmit -> change được duyệt -> Contract version mới -> sai OTP rồi đúng -> cọc một phần -> quá hạn -> gia hạn -> đủ cọc; snapshot/chữ ký/ledger giữ đúng.

Mỗi run ghi commit/worktree, cấu hình môi trường không secret, timestamp, dữ liệu fixture, test IDs, kết quả DB và screenshot cần thiết. Không dùng test pass đơn lẻ để tuyên bố cả hệ thống hết lỗi.

## 16. Cấu hình, vận hành và lệnh kiểm tra

| Nhóm | Yêu cầu |
|---|---|
| SQL | Explicit target, backup/preflight, 003/004 + inventory/import có kiểm chứng; không startup migration hoặc tự apply DB nghiệp vụ |
| SQL state | Bốn owner tables, JSON có kiểu/version/actor/audit + SQL counter; 2 MiB/document, 8 MiB/owner, không tự trim history |
| Private files | Ảnh/passport/PDF/proof bytes ngoài wwwroot/Git; legacy metadata root giữ để inventory/import S3 rồi gỡ provider file |
| Tiền/giá | VND/40%; policy version; sức chứa xe/gateway có nguồn, không bịa dữ liệu test thành policy thật |
| Maps | Provider từng chức năng, quota/token/attribution/quyền lưu; không commit secret |
| PDF | Converter thực tế, font/timeout/concurrency; template version/hash; bản tham chiếu chưa production-ready |
| OTP/email | HMAC secret/SMTP từ local config hoặc env; không log/print/store OTP thô |
| Payment | Bank config; VNPay Sandbox merchant/secret, ReturnURL, public HTTPS IPN; ledger trong SQL |
| Backup | SQL state/ledger + private file bytes/manifests; có quy trình đối chiếu sau restore |

```powershell
dotnet build backend/Backend.slnx
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/tests/Flow1.Tests/Flow1.Tests.csproj
dotnet test backend/tests/Registration.Tests/Registration.Tests.csproj
```

Frontend khi tới use case tương ứng: npm run test:run và npm run build ở workdir frontend. Browser E2E/live provider có cấu hình riêng; mock không được ghi là full E2E.

## 17. Điều kiện hoàn thành và giới hạn

- [x] Quyết định mới cho thêm cột SQL, giữ đầy đủ flow, không bảng mới. 003 giữ hai cột/nullable Trip; S1 thêm 004 với tám cột có mapping rõ.
- [x] S1 SQL foundation/migration/transaction/CAS: 179 backend tests pass tại commit S1.
- [x] S2 source endpoint dùng SQL, business + state + receipt commit chung; SQL rollback/retry/concurrency và connected browser trong báo cáo S2. Không đồng nghĩa đã migrate/import DB nghiệp vụ.
- [x] S3 tool inventory/import/parity và gỡ MetadataStore file/test cũ có replacement, giữ bytes/source; kiểm trên DB test và Chrome, chưa migrate/import DB nghiệp vụ.
- [x] Phase 4 increment C: decline/explicit expire/reissue + PDF history, SQL receipt/status/review/OTP atomic, giữ request booking; kiểm local/test theo báo cáo C.
- [x] Migration DB sạch + legacy + chạy lại trên DB test; không mất tiền/currency/signature, không bịa deadline. Chưa áp lên DB nghiệp vụ.
- [x] Foundation lưu Contract trước Trip; repository stage invoice/ledger SQL và request transaction dùng chung, đã test rollback. API activation thuộc phase sau.
- [x] Baseline file provider giữ version/history; SQL port mới giữ document revisions/owner binding/replay/limits. Không public storage.
- [x] Auth/register regression pass; ErrorCode mở rộng tương thích.
- [x] Converter render mẫu thật 12 trang, đã QA đủ ảnh trang/font/bảng; hoàn thành PDF spike giai đoạn 1.
- [ ] Sau S2/S3: receipt/evidence SQL cùng transaction cho ký/tiền; SMTP/provider/file bytes có fault/retry riêng.
- [ ] Flow đầy đủ và connected handoff qua UAT; live Maps/SMTP/IPN có bằng chứng riêng.

Thiết kế đích đã chuyển state vào SQL theo quyết định mới. Không tuyên bố SQL,
filesystem và SMTP/provider cùng một transaction. Giữ private bytes bất biến và
import/backup rõ; không mặc định filesystem nhiều server tự đồng bộ.

## 18. Lịch sử quyết định

- 15/10/2026: plan 1.0 mở rộng schema với 12 bảng để lưu version/audit/outbox.
- 16/10/2026: chủ dự án yêu cầu giảm thay DB; đã chọn hai cột mới và nullable Trip, giữ đúng flow tạo Trip sau cọc. **Thiết kế 12 bảng không còn được triển khai.**
- Sau đó phase 2–3 và phase 4 increment A/B có use case thật trên file provider;
  payment activation chưa implement. Xem báo cáo từng phase thay vì coi baseline
  foundation là toàn bộ trạng thái hiện tại.
- 16/10/2026, quyết định mới nhất: chuyển metadata vào SQL, giữ đủ Flow 1, không
  bảng mới. Bản 3.0/S1–S3 thay giới hạn hai cột và kiến trúc sidecar file; S1 SQL
  foundation được kiểm chứng. S2 source cutover đã thực hiện theo yêu cầu trực tiếp,
  S3 import/parity/cleanup đã được kiểm trong local/test. Tiếp tục phase 4; không
  tự migrate/import DB nghiệp vụ.
