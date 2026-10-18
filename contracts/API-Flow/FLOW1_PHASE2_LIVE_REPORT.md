# Phase 2 — nghiệm thu Maps live và Customer browser

Ngày 16/10/2026, Asia/Ho_Chi_Minh. Commit trước lượt này: `9aa4ed687ed2a011318b6d54d6640995f72ecfcf`.

**Phase 2 hoàn thành trong phạm vi local/test đã được đại ca cho phép.**
Đại ca xác nhận đã điền key; kiểm tra kín đáo thấy JSON hợp lệ, Geoapify/Mapbox credentials
đều hiện diện, DataProvider=GEOAPIFY, renderer MAPBOX, MayPersistResults=true,
Mapbox Permanent=false, sức chứa MVP 1 ngựa/xe. Không in token/key hoặc commit file local.

## Live smoke độc lập — PASS

```powershell
dotnet run --project backend/tools/Flow1MapsSmoke -- --live
```

Evidence private:
`backend/WebApi/App_Data/flow1/maps-smoke-f7c72f7dfbff42a2b751ffc4b8041eb9/maps-smoke-result.json`.
CheckedAtUtc `2026-10-16T03:13:49Z` (10:13:49 Việt Nam). Dùng địa danh công khai, không gửi
contact/hồ sơ khách/ngựa. Có forward, reverse country và hai routing call thật.

| Tuyến kiểm tra | Km provider | Chuẩn bị tối thiểu | Giá tham khảo / cọc 40% (VND) |
|---|---:|---:|---:|
| Hồ Chí Minh → Vũng Tàu | 96,236 | 2 ngày | 40.041.912 / 16.016.765 |
| Hồ Chí Minh → Hà Nội | 1.564,650 | 3 ngày | 101.715.300 / 40.686.120 |
| VN → Tokyo, AIR | Không gọi road | 7 ngày | 120.000.000 / 48.000.000 |

Km là kết quả cho tọa độ do provider trả về tại thời điểm chạy, không phải danh mục khoảng
cách cố định hoặc xác nhận tuyến phù hợp xe/ngựa thực tế. Route provider GEOAPIFY;
attribution được lưu. AIR chỉ kiểm country và airport-to-airport estimate, chưa gồm ground legs.
Mapbox Static Images PNG 600×300, 66.557 bytes, logo/attribution giữ nguyên và Permanent=false.
Không cache/lưu Mapbox Geocoding/Directions, không bật gói trả tiền.

## Chrome với provider thật — PASS

Đã mở rộng hai file harness (không đổi Application/Domain/DAO/FE runtime):

- `backend/tools/Flow1BrowserHarness/Program.cs`: opt-in `FLOW1_BROWSER_LIVE_MAPS=1`,
  đọc cấu hình theo thứ tự backend, xác minh config trước CREATE DB. Chỉ process backend
  nhận credentials thật; Node/browser không nhận. Override provider về official HTTPS hosts.
- `backend/tools/flow1-browser.cjs`: live mode không mở HTTP fixture, search địa danh công khai,
  chọn candidate thật, chờ ảnh Mapbox và API; kiểm snapshot/attribution/reload, không request
  thẳng tới provider từ browser hoặc URL chứa key. Screenshot scroll về đầu trang trước chụp.
- `backend/tools/FLOW1_BROWSER_TEST.md`: lệnh chạy, quyền và giới hạn live mode rõ ràng.

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAP_PROVIDER = 'GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS = '1'
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

Evidence lượt đầu:
`backend/WebApi/App_Data/flow1/browser-7fd95692f1e2427db0964067938ab26e/`.
Lượt sau sửa screenshot/timeout của harness cũng PASS:
`backend/WebApi/App_Data/flow1/browser-c130db2ed6bc4d7bac806b345f8eead6/`.

- Real Chrome → FE → API → Geoapify/Mapbox thật → SQL/private files test riêng.
- Tìm/chọn địa điểm, cả hai ảnh Mapbox tải thành công; source data GEOAPIFY.
- Upload thật multipart ảnh/passport fixture; Wizard giữ ngày/contact khi thêm Horse.
- Estimate và submit đều backend tính lại; 96,236 km, 40.041.912 VND, capacity=1.
- Request `PENDING`, proxy receiver `REQUIRED_NOT_VERIFIED`, reload còn dữ liệu.
- SQL-backed list và private authenticated passport download thành công.
- Một Horse/Request, **không Contract/Trip**. Có snapshot provider/attribution chính xác.
- **0 fixture calls**, **0 browser direct provider requests**, **0 page errors**.
- API/browser logs không chứa cả hai real credentials; không có token trong browser map URL.
- API/Vite/browser process do harness sở hữu đã dừng; DB `RaceHorseFlow1Browser_<GUID>`
  riêng đã drop trong finally. Không seed/migrate/reset `HorseTransportDB`.
- Đã xem screenshot bản đồ/địa chỉ/attribution, review và detail sau reload.

## Regression và ranh giới nghiệm thu

Chạy lại `dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'`
với `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS`: **Flow1 89 + Registration 47 = 136 pass**,
0 fail/skip. Các SQL integration test dùng DB riêng, gồm owner/status, idempotency,
concurrent booking, rollback/retry, hồ sơ legacy/file integrity và guard lưu provider.

FE runtime không đổi trong lượt này; 7 unit test/build/lint đã đạt tại commit `9aa4ed6`.
Chrome live kiểm lại use case Customer thật. Không dùng kết quả unit hoặc browser phase 2
để tuyên bố full Flow 1 E2E. Lỗi auth/quota/malformed của provider có contract tests;
không cố tình tiêu hết quota hoặc tạo giao dịch trả tiền để kiểm lỗi live.

Fixture-mode harness cũng được kiểm lại để bảo đảm opt-in live không đổi chế độ mặc định.
Kết quả **PASS** tại `backend/WebApi/App_Data/flow1/browser-8b748df3e4394171a28fe8e2a85b08c3/`:
2 search, 4 reverse, 2 routing, 2 preview fixture; 0 Mapbox data call, 0 browser provider request
và 0 page error. Live mode không được dùng trong lượt fixture này.
Một lượt đầu sai đường dẫn thư viện Playwright gây MODULE_NOT_FOUND, DB đã cleanup;
chạy lại với đường dẫn runtime đúng, không thay package/dependency của ứng dụng.

## Bàn giao lượt lịch tiếp theo

> Cập nhật sau lượt bàn giao: phase 3 đã được triển khai và kiểm chứng local/test;
> xem [FLOW1_PHASE3_REPORT.md](FLOW1_PHASE3_REPORT.md). Các ghi chú dưới đây là
> bàn giao lịch sử tại thời điểm kết thúc phase 2; bước tiếp theo hiện là phase 4.

Không còn blocker Maps/key/capacity của phase 2. **Bắt đầu phase 3 Manager Review +
Preliminary Plan/Budget/Quote/Draft**, mỗi lượt tối đa một phase theo lịch đã cấp quyền.
Giữ SQL tối thiểu, cọc 40%, chưa tạo Trip, chưa áp migration vào DB nghiệp vụ.
RequestSnapshot/HorseSnapshot là full snapshot mỗi revision: phải bảo toàn reader Customer
khi thêm action/review, không append payload event khác shape làm vỡ detail.

Policy và ví dụ trong plan được thống nhất 1 ngựa/xe: 300 km/2 ngựa → 2 xe,
cost 56 triệu, floor 58,8 triệu, suggested 67,2 triệu; cọc suggested 26,88 triệu.
Fixture cũ capacity=2 vẫn là test cấu hình khác, không phải default vận hành.

Không push/deploy/PR hoặc pause lịch: phase 3–6 chưa triển khai, chưa nghiệm thu Manager,
PDF phát hành/OTP, ledger/activation và connected downstream handoff. Deployment của phase 6
là xác nhận vận hành, không phải quyền deploy phần mềm. Snapshot/PDF/OTP/tiền vẫn phải có
receipt/reconciliation/crash recovery đúng plan trước nghiệm thu các phase tương ứng.
