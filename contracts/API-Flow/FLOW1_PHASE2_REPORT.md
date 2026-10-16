# Giai đoạn 2 Flow 1 — Estimate và Customer Wizard

Ngày 16/10/2026, Asia/Ho_Chi_Minh. Baseline: commit phase 1 `aa90791` trên nhánh `Truong`.

**Trạng thái: code và kiểm thử tích hợp local đã đạt; chưa đóng nghiệm thu toàn giai đoạn 2.**
Chưa nghiệm thu Maps live đầy đủ. Không chuyển giai đoạn 3 chỉ vì mock pass.
Đại ca đã cho phép lịch mỗi hai tiếng implement và commit giai đoạn 2–6, chỉ local, không push/deploy.

**Cập nhật mới nhất — tài khoản free:** đại ca đã điền Mapbox token, xác nhận không có Permanent,
đồng ý tách nguồn dữ liệu và chốt **1 ngựa/xe** cho MVP. Cấu hình mới dùng
`Provider=MAPBOX` (ảnh bản đồ), `DataProvider=GEOAPIFY` (search/reverse/routing được lưu),
`MayPersistResults=true` cho dữ liệu Geoapify, `Mapbox.PermanentGeocodingEnabled=false`.
Mapbox Navigation API không dùng làm nguồn lưu km; adapter Directions trả MayPersist=false.
Chờ **Geoapify.ApiKey và live acceptance**, không còn chờ sức chứa hoặc quyền Mapbox Permanent.
Xem [báo cáo thay đổi free Maps](FLOW1_PHASE2_FREE_MAPS_REPORT.md) và
[cách lấy key/cấu hình](../../backend/tools/FLOW1_MAPBOX_SETUP.md).
Các số liệu/kiến trúc Mapbox-only bên dưới là baseline lịch sử của commit `1038fc0`.

**Cập nhật lựa chọn:** đại ca đã chọn **Mapbox** và sẽ cấu hình token/quyền lưu/sức chứa.
Đã bổ sung `MapboxTransportMaps`, provider selector (mặc định MAPBOX), cấu hình mẫu và
[hướng dẫn Mapbox](../../backend/tools/FLOW1_MAPBOX_SETUP.md). Không còn chờ chọn provider.
Adapter dùng Geocoding v6 permanent và Directions v5 driving; không fallback OSM, không gửi
token tới FE hoặc ghi URI chứa token qua HttpClientFactory. Kiểm thử sau bổ sung:
**Flow1 66 + Registration 47 = 113 backend pass**, không fail/skip; frontend **5 pass**, build/lint đạt. Số 45/47 bên dưới là
baseline commit `82ef620`; Maps live vẫn chưa được nghiệm thu.
UI có ảnh bản đồ Mapbox qua backend cho điểm đã chọn (Static Images, giữ logo/attribution,
token không nằm trong URL browser); search Nhật gửi `language=ja&country=jp`.
Backend thêm `GET /api/public/maps/mapbox-preview`, rate limit/no-store, response ảnh tối đa 4 MB.
Connected Chromium với HTTP Mapbox fixture đã pass, bao gồm tải cả hai ảnh preview qua API
và kiểm API log không chứa token fixture. Evidence:
`backend/WebApi/App_Data/flow1/browser-96bc6ed57d2f4afea87519444b023c8b/browser-result.json`.
Ảnh preview trong fixture là PNG test, không phải dữ liệu bản đồ live hoặc kiểm chứng chất lượng ảnh Mapbox thật.

## Những phần đã triển khai

| File / lớp | Mục đích và hợp đồng bàn giao |
|---|---|
| `backend/Application/DTOs/Flow1/CustomerTransportDtos.cs` | Input/output thật cho estimate, Horse, hồ sơ và Request; Customer không nhận estimated cost/floor |
| `Application/Common/Flow1/Flow1PricingPolicy.cs` | Policy có version, VND, markup 20%, cọc dự kiến 40%, làm tròn, ceil số xe, preparation 2/3/7 theo ngày Việt Nam |
| `Application/Services/Flow1/TransportEstimateService.cs` | Kiểm tra tuyến/mode, xác minh quốc gia tọa độ, gọi routing; không nhận km/tiền client làm nguồn tính |
| `Application/Services/Flow1/CustomerTransportService.cs` | Owner, upload, version hồ sơ, lịch ngựa, idempotency, prepare/retry và submit PENDING |
| `Application/Interfaces/Flow1/ICustomerTransportRepository.cs` | Contract DAO, xác minh tọa độ và private file store; Application không phụ thuộc EF |
| `Infrastructure/DAOs/Flow1/CustomerTransportRepository.cs` | Query/stage SQL trong UoW có sẵn; lịch giao nhận tính bao gồm cả ngày cuối; không save sớm |
| `Infrastructure/Storage/LocalFlow1PrivateFileStore.cs` | Bytes private bất biến, tối đa 5 MB/file, kiểm đuôi/signature/hash; không dùng tên upload làm đường dẫn |
| `Infrastructure/ExternalServices/Flow1/OsmTransportMaps.cs` | OSRM routing + Nominatim search/reverse qua endpoint cấu hình; timeout, response cap, quota/error, User-Agent, attribution; search chủ động, không autocomplete |
| `WebApi/Controllers/Flow1/CustomerTransportController.cs` | Endpoint Public/Customer, role JWT, 401/403/404, multipart, download attachment/no-store/nosniff |
| `WebApi/Extensions/Flow1CustomerExtensions.cs`, `Program.cs` | DI riêng và rate limit; giữ handler limiter Registration; không startup migration |
| `frontend/src/features/flow1/` | Estimate công khai, Wizard bốn bước, thêm Horse tại chỗ, danh sách/chi tiết/My Horses lấy API; retry cùng key nếu chưa sửa input |
| `frontend/vitest.config.ts` | Cấu hình test riêng, không phụ thuộc Vite config staged ngoài scope |
| `frontend/src/app/router/AppRouter.tsx` | Chuyển route Customer tương ứng sang trang API thật; sửa casing import Manager để build được |
| `frontend/src/features/auth/pages/login/LoginPage.tsx` | Tiếp tục Wizard sau login bằng đường dẫn cố định/estimate seed; không nhận URL redirect tùy ý |
| `backend/tests/Flow1.Tests/CustomerTransportTests.cs`, `MapAndFileTests.cs` | SQL/API/security/concurrency/recovery và adapter/file tests |
| `backend/tools/Flow1BrowserHarness/`, `flow1-browser.cjs` | DB và process riêng, Chrome headless nối FE → API → SQL → private storage; provider HTTP fixture rõ nguồn |

Không thêm cột/bảng/index trong lượt này. Không áp migration hoặc seed `HorseTransportDB`.
`frontend/vite.config.ts` có thay đổi staged từ trước được giữ riêng, không thuộc commit phase 2.
Harness tạo config Vite riêng để không phụ thuộc thay đổi staged đó khi tái hiện từ checkout sạch.
Khi dev từ checkout sạch chưa chỉnh proxy, đặt `VITE_API_URL=http://localhost:5129/api` cho frontend
(hoặc URL WebApi riêng của môi trường). Không dùng proxy VNPAY sandbox port 5080 cho Customer API.

## API đã có

- `GET /api/public/estimates/transport-modes`, `POST /api/public/estimates`.
- `GET /api/public/estimates/locations/search?address=...&country=VN|JP` (search chủ động).
- `POST /api/customer/estimates`, `GET /api/customer/locations/search`.
- `GET /api/customer/requests/form-options` — sàn chuẩn bị, ngày sớm nhất, policy và giới hạn file.
- `GET /api/customer/horses/selectable?departure=YYYY-MM-DD&deadline=YYYY-MM-DD`.
- `POST /api/customer/horses` — multipart `payload` JSON `HorseInput`, `photo`, `passportScan`; `Idempotency-Key`.
- `GET/POST /api/customer/horses/{id}/documents`; POST cần `expectedVersion`, hai file và key.
- `GET /api/customer/horses/{id}/documents/{version}/photo|passport` — ownership trước khi đọc bytes.
- `POST /api/customer/requests` — key + payload dưới đây; `GET /requests`, `GET /requests/{id}`.

Estimate input gồm `pickup`/`delivery` với `address, lat, lng, country`, `preferredTransportMode`,
`horseCount`, `desiredDepartureDate`. Customer submit có dạng **đã implement** (sample plan cũ
phẳng là mục tiêu thiết kế, không phải payload mà controller này nhận):

```json
{
  "trip": {
    "pickup": {"address": "Điểm lấy", "lat": 10.8, "lng": 106.6, "country": "VN"},
    "delivery": {"address": "Điểm giao", "lat": 11.5, "lng": 107.5, "country": "VN"},
    "preferredTransportMode": "ROAD", "horseCount": 1, "desiredDepartureDate": "2026-11-20"
  },
  "deliveryDeadline": "2026-11-25", "purpose": "COMPETITION",
  "pickupContact": {"name": "Người giao", "phone": "0901234567"},
  "receiver": {"name": "Người nhận", "phone": "0907654321", "isProxy": true},
  "horses": [{"horseId": "ID do server cấp", "documentVersion": 1}]
}
```

Một version hồ sơ chứa cả ảnh và scan passport; hai file được frozen cùng version, không nhận
version tự khai khác với metadata. Horse legacy không có metadata là NEEDS_DOCUMENTS, không
tự coi ACTIVE. Onboard bằng POST documents với `expectedVersion=0`, `payload` HorseInput đầy đủ,
giữ microchip gốc, hai file; chỉ khi không có request còn hoạt động. Hồ sơ mới có lịch sử và CAS.

Request mới có Status PENDING, không tạo Contract/Trip/Invoice. Receiver proxy được ghi
REQUIRED_NOT_VERIFIED. `allowedActions` tạm rỗng vì các mutation review/change/cancel thuộc
giai đoạn sau chưa implement; không cung cấp nút local tự đổi status. List phân trang cố định
theo RequestID, chưa hỗ trợ filter/sort bổ sung. Detail legacy có thể `snapshot=null`, không bịa lại.

## Tính nhất quán và giới hạn

SQL transaction/request lock + sorted horse locks recheck ownership, current documents và lịch
trước insert. Chuẩn bị metadata/file trước SQL: nếu SQL rollback, prepared artifact vẫn tồn tại,
không trở thành Request nếu SQL chưa có. Retry cùng key/payload hoàn thiện một Request; retry
khác input trả 409. Prepared submission chưa commit hết hạn sau 30 phút và phải dùng key mới.
Request đã commit retry không bị phụ thuộc vào provider hoặc việc hồ sơ ngựa đã đổi sau đó.

Metadata snapshot và SQL không có transaction chung. Cơ chế này kiểm chứng create/submit, chưa
thay thế receipt/reconciliation cho OTP/thanh toán phase 4/5. Orphan private bytes/prepare không
được public nhưng có thể còn trên đĩa; retention/đối chiếu storage cần bổ sung trước production.
Hash và file signature không phải quét malware hay thẩm định tính thật của hồ sơ; Flow 2 làm
thẩm định. Public Nominatim có gate 1 request/giây trong một process; nhiều process cần quota
gateway/self-hosting. Chưa có lựa chọn endpoint tùy ý từ client.

VN→JP estimate ghi rõ chỉ airport-to-airport và chưa gồm ground legs. Gateway/ground-leg budget
thuộc preliminary plan phase 3; không gọi road routing xuyên Việt Nam–Nhật. Các mục Manager,
OTP, tiền và điều phối chưa implement; không dùng trang mock cũ để làm bằng chứng chúng đã chạy.

## Kết quả kiểm chứng

Các lệnh chính:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
# Workdir frontend:
npm ci --no-audit --no-fund
npm run test:run
npm run build
npx eslint src/features/flow1 src/app/router/AppRouter.tsx src/features/auth/pages/login/LoginPage.tsx
```

- Flow1.Tests: **45 pass, 0 fail, 0 skip**.
- Registration.Tests: **47 pass, 0 fail, 0 skip**; tổng backend **92 pass**.
- Frontend: 4 test pass; build và lint các file thay đổi pass.
- Browser connected: **PASS**, không page runtime error; HTTP map fixture, SQL và private files thật.
  Evidence private: `backend/WebApi/App_Data/flow1/browser-3c9aefecd1db4d789204aade1a18915b/`:
  `browser-result.json`, logs, screenshot review/reload (đã xem), passport download fixture.
- SQL checks xác nhận một Request/horse, không Contract/Trip trong DB browser test.
- Fault injection sau request metadata prepare/trước SQL: không insert mapping dở; retry thành công.
- Upload signature/size, hash corruption, traversal, private ownership, legacy onboarding/version,
  concurrent booking, retry/key reuse, sàn ngày VN và mốc 500 km đã có kiểm thử.
- Test doubles HTTP/Maps/FE không được xem là bằng chứng provider live hay full Flow 1 E2E.
- GitNexus chưa có index repo này; dùng source/diff và test làm kiểm tra ảnh hưởng, không có graph coverage.

## Điều kiện để đóng giai đoạn 2 và lượt tiếp theo

`appsettings.Local.example.json` đã có keys nhưng cố ý không bật public demo endpoint hoặc
điền sức chứa xe tùy đoán:

1. `Provider=MAPBOX`, token có sẵn; `DataProvider=GEOAPIFY` và `Geoapify.ApiKey` local/env.
2. `Mapbox:PermanentGeocodingEnabled=false`; không gọi Mapbox Geocoding hoặc persist Directions.
3. `MayPersistResults=true` cho Geoapify, giữ attribution/quota đúng provider.
4. `StandardVehicleCapacityStalls=1` đã được chủ dự án chốt làm policy MVP, chưa phải thông số đội xe thật.
5. Không dùng Temporary để lưu snapshot hoặc tự kích hoạt gói/tài khoản có phí.
6. Chạy smoke VN→VN + xác minh country VN→JP với Geoapify thật và preview Mapbox, kiểm tra lỗi/quota/quyền lưu,
   và ghi evidence. Không dùng HTTP fixture để tick mục này.

Đại ca đã đồng ý cấu hình free kết hợp Geoapify/Mapbox. Lượt lịch tiếp theo đọc báo cáo này
và báo cáo free Maps, kiểm tra key Geoapify mới và live evidence; không hỏi lại sức chứa hoặc
yêu cầu Mapbox Permanent. Nếu key vẫn thiếu thì giữ nguyên trạng thái giai đoạn 2,
không lặp sửa/commit rỗng, không chuyển phase 3.
Các phần đã kiểm chứng được commit local; không push, deploy, thay hạ tầng hoặc gửi email thật.

Bàn giao metadata cho phase 3: mỗi revision của `request/{id}` hiện chứa **RequestSnapshot đầy đủ**,
`horse/{id}` chứa HorseSnapshot đầy đủ. Khi thêm review/action phải giữ full snapshot hoặc nâng
schema/reader có kiểm chứng; không append một JSON event khác shape rồi để Customer đọc nhầm.
