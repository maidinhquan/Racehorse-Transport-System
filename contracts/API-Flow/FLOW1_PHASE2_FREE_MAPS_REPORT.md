# Phase 2 — điều chỉnh Maps cho tài khoản free

Ngày 16/10/2026, Asia/Ho_Chi_Minh. Commit trước lượt này: `1038fc03841711773101ed02dbc8a914a02fafa2`.

**Cập nhật sau commit `9aa4ed6`:** đại ca đã điền Geoapify key; live smoke và Customer browser
với cả provider thật đã đạt, phase 2 đã đóng trong phạm vi local/test. Xem
[báo cáo live](FLOW1_PHASE2_LIVE_REPORT.md). Các trạng thái chờ key bên dưới là snapshot
lịch sử tại commit triển khai adapter, không phải blocker hiện hành.

## Quyết định và phạm vi

Đại ca đã điền Mapbox token, xác nhận tài khoản free không có Permanent và đồng ý tách nguồn
dữ liệu được lưu. Đại ca chốt **1 ngựa/xe** làm policy sức chứa MVP; chưa phải thông số đội xe
đã được xác minh ngoài thực tế. Không đổi SQL/schema, không seed/migrate DB nghiệp vụ.

Điều khoản Mapbox Product Terms 2026-07 mục 2.10.1 hạn chế lưu Navigation API results;
không thể chỉ thay geocoding rồi tiếp tục lưu Directions km như code trước. Vì vậy:

- `Provider=MAPBOX`: Static Images hiển thị bản đồ, không lưu ảnh vào metadata.
- `DataProvider=GEOAPIFY`: forward/reverse và routing cho tọa độ/km lưu trong snapshot.
- `MayPersistResults=true` xác nhận quyền lưu dữ liệu Geoapify kèm attribution.
- `Mapbox.PermanentGeocodingEnabled=false`; không gọi Mapbox Geocoding trong cấu hình mới.
- Mapbox Directions còn là adapter display-only, trả `MayPersist=false`; guard submit đã có
  chặn lưu kết quả này. Không dùng cờ để giả quyền lưu.

Geoapify Free có key không cần thẻ và cho lưu kết quả kèm ghi nguồn; quota dùng chung các API,
không mặc định mọi routing request chỉ tốn một credit. Không tự đăng ký tài khoản, nâng gói hoặc
bật dịch vụ trả tiền. [Nguồn và hướng dẫn cấu hình](../../backend/tools/FLOW1_MAPBOX_SETUP.md).
Không tự dùng public Nominatim, public OSRM demo hoặc gọi chúng làm fallback.

## File/layer và hợp đồng bàn giao

| File / layer | Thay đổi |
|---|---|
| Application/Common/Flow1/Flow1MapOptions.cs | DataProvider tách renderer; Geoapify key/base URL backend |
| Application/Interfaces/Flow1/IntegrationContracts.cs | Candidate giữ nguồn GEOAPIFY và PreviewProvider=MAPBOX riêng |
| Application/Interfaces/Flow1/ICustomerTransportRepository.cs | Location verifier trả attribution mặc định nullable, tương thích doubles cũ |
| Application/DTOs/Flow1/CustomerTransportDtos.cs | EstimateView thêm optional LocationAttribution; snapshot cũ vẫn đọc được |
| Application/Services/Flow1/TransportEstimateService.cs | Attribution từ verifier phía server, cả AIR không có road route |
| Infrastructure/ExternalServices/Flow1/GeoapifyTransportMaps.cs | Search/reverse/routing thật qua API khi có key; encode input, country/units validation, quota/timeout/response cap/error sanitization |
| Infrastructure/ExternalServices/Flow1/MapboxTransportMaps.cs | Preview/Directions không cần Permanent; geocoding vẫn cần; Directions không được persist |
| WebApi/Extensions/Flow1CustomerExtensions.cs | DI theo DataProvider; Geoapify HttpClient không log URI/key, không redirect |
| WebApi/appsettings.Local.example.json | Key rỗng, free hybrid config và capacity=1 |
| frontend/src/features/flow1/api.ts, TripFields.tsx | Tách nguồn dữ liệu/renderer; attribution link ở search và selected point; xóa provenance khi sửa địa chỉ |
| frontend/src/features/flow1/CustomerPages.tsx | Geoapify/OSM attribution tại list và detail sau reload |
| backend/tests/Flow1.Tests/GeoapifyTransportMapsTests.cs | Contract VN/JP, filter/injection, không tin country client, meters/seconds, no route, quyền/key/host, response cap, error/log sanitization, capacity=1, AIR attribution |
| backend/tests/Flow1.Tests/MapboxTransportMapsTests.cs | Không persist Directions; preview chạy với Permanent=false |
| frontend/src/features/flow1/CustomerPages.test.tsx | Attribution/link sau chọn địa điểm, Mapbox preview, edit invalidation, AIR attribution |
| backend/tools/Flow1BrowserHarness/, flow1-browser.cjs | HTTP hybrid fixtures, reject Mapbox data calls, snapshot provider/capacity/attribution, private SQL test DB |
| backend/tools/Flow1MapsSmoke/ | Smoke live Maps độc lập; không chạm SQL/mail/payment, evidence private, không raw key/URL |

`appsettings.Local.json` local đã sửa cú pháp dư wrapper, giữ Mapbox token và toàn bộ credentials
khác; thêm Geoapify key rỗng, DataProvider, capacity=1. File này **đã track từ trước dù có ignore**;
không được đưa vào commit. Giữ nguyên nội dung và index blob staged `frontend/vite.config.ts`
`d6e57f3207f3f416abf0251b54d202825f36c9b4`, không đưa vào commit lượt này.

## Kiểm chứng

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
# frontend working directory:
npm run test:run
npm run build
npx eslint src/features/flow1
# repo root:
$env:FLOW1_BROWSER_MAP_PROVIDER = 'GEOAPIFY'
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
dotnet run --project backend/tools/Flow1MapsSmoke -- --preview-only
```

- Flow1.Tests **89 pass**, Registration.Tests **47 pass**: tổng **136**, 0 fail/skip.
- Frontend **7 pass**, production build và lint feature pass.
- Lượt test đầu có lỗi compile thiếu `using WebApi.Extensions` trong test mới; đã sửa,
  chạy lại toàn solution và đạt số liệu trên.
- Chrome connected **PASS**: thực hiện upload, estimate, submit PENDING, reload/list và tải
  passport private. DB riêng `RaceHorseFlow1Browser_<GUID>` đã cleanup trong finally;
  xác nhận một Horse/Request, không Contract/Trip.
- Evidence private `backend/WebApi/App_Data/flow1/browser-697545ec005f451fb881837995d3e32c/`:
  2 Geoapify search, 4 reverse, 2 routing, 2 Mapbox preview, **0 Mapbox Geocoding/Directions**.
  Snapshot nguồn GEOAPIFY, vehicleCount=1 và LocationAttribution; link Geoapify sau reload.
  Không page error hoặc credential fixture trong API log. Đã xem screenshot review/detail.
- Mapbox live Static Images **PASS** với token local, Permanent=false; PNG 600×300,
  **66.557 bytes**, đã xem marker/nhãn và logo/attribution. Evidence partial đầu tiên:
  `backend/WebApi/App_Data/flow1/maps-smoke-44eed96812b84a4bb631c6609806cc7f/`.
  Không xem ảnh live này là nghiệm thu Geoapify hoặc toàn bộ Flow 1.
- Chạy tiếp `Flow1MapsSmoke -- --live` sau sửa fingerprint ảnh sang SHA-256 bytes:
  `backend/WebApi/App_Data/flow1/maps-smoke-d059732263d74a328118427bc94bc6c1/maps-smoke-result.json`.
  Mapbox preview PASS; Geoapify NOT_CONFIGURED; tổng **PARTIAL**, tool trả nonzero đúng dự kiến.
  PNG SHA-256 `cc7bbfffd0de8348806083560faf100ca7fcf0ec998430412b486b6620749bf1`.

## Trạng thái tại commit 9aa4ed6 — đã được giải quyết ở lượt live

**Phase 2 chưa đóng:** Geoapify key còn rỗng tại thời điểm triển khai; search/reverse/routing
Geoapify thật và connected flow với live data chưa được xác minh. HTTP fixtures chỉ chứng minh
luồng ứng dụng và protocol; không thay nghiệm thu chất lượng/coverage/quota của provider.

Đại ca đã thực hiện bước lấy/điền key và lượt live đã nghiệm thu trên DB test riêng.
**Lượt lịch tiếp theo triển khai phase 3**, giữ capacity=1, không yêu cầu lại Mapbox Permanent
hoặc key Geoapify. Toàn Flow 1 vẫn chưa hoàn tất; không pause lịch.

Chỉ commit code/docs đã kiểm chứng; không commit credentials/runtime/PNG/generated PDF,
không push/deploy hoặc mở PR. Quy tắc SQL/file recovery của phase 4/5 vẫn giữ nguyên.
