# Flow 1 — primary merge và frontend main, 18/10/2026

> Cập nhật UI: đại ca yêu cầu giữ thiết kế frontend main. Xem [báo cáo khôi phục UI](FLOW1_UI_RESTORATION_REPORT.md); các màn hình tối giản ở mốc46e1371 được thay bằng bố cục/card/table/modal của main nối API thật.

## Kết quả và phạm vi

Theo yêu cầu trực tiếp của đại ca, thư mục `D:\Racehorse-Transport-System`, nhánh
`Truong`, đã fast-forward từ `2ba80f273fa238c6eb3974ceb79ae766516a2fd5` đến
`1d3bbe8d9aa19560dec23ef53bb8d06bcc0467ad` của `codex/flow1-relational-mvp`.
Source typed006, công cụ chuyển đổi và demo localhost hiện có trong primary.

Đã fetch và lấy **phần frontend** từ `origin/main` tại
`ed520cad5b7ad4b975e79c3b4830bcdf733ec2d4`. Không merge backend của main hoặc
đánh dấu toàn bộ main đã merge. Giữ typed Flow1 API/components/tests cần thiết;
thay các điểm vào Flow1 của giao diện main bằng API thật. Các trang downstream
main được mang về, nhưng nghiệp vụ đầy đủ Flow2/3 vẫn thuộc module của teammate.

Không push/deploy/tunnel; không migration/seed/POST vào DB nghiệp vụ; không dùng
giao dịch tiền thật, provider VNPay hoặc gửi email tới người thật trong lượt này.

## Đối chiếu hành trình

| Bước người dùng | Trước tích hợp ở frontend main | Hiện tại |
| --- | --- | --- |
| Landing chọn đi/đến | Giá USD demo, cọc30%; session preliminaryQuote không được wizard đọc | Giá VND hardcode ghi rõ demo, cọc40%; chỉ lưu gợi ý tuyến; giữ qua đăng nhập Customer |
| Wizard4bước | Ngựa hardcode, ngày cố định, submit bằng alert mã REQ giả | Route/date/purpose → geocoding/contacts → owned selectable horses → xem hồ sơ/xác nhận; POST API thật với RowVersion và Idempotency-Key |
| Manager | Mock arrays và đổi React state, kể cả xác nhận chuyển khoản | Sidebar mới; list/overview/contracts/payments đọc SQL, mở detail để accept/reject/request-changes, quote Draft/publish PDF |
| Khách duyệt/ký | Trang hợp đồng tĩnh / ký frontend | Tải đúng PDF, gửi OTP, backend xác nhận; invoice cọc40% VND do backend tạo |
| Cọc | Giao diện thủ công/mẫu có thể khác backend | Chỉ VNPay; Return chỉ đọc, verified IPN mới ghi tiền; giữ đối soát/concurrency/retry guards |
| Thông báo/kích hoạt | Chuông số cố định; typed activation chưa tạo thông báo app | Thông báo hợp đồng/activation thật trong bảng NOTIFICATION hiện có; owned list/read; activation cùng transaction với one Trip |
| Flow2/3 | Portal mẫu, không có current Flow1 handoff | Sau Manager confirm, hai vai trò nhận notification và mở inbox/ack/PDF/hồ sơ thật; hold/resume thu hồi event như cũ |

Các gợi ý landing **không** chứa giá hợp đồng, số cọc, mã ngựa hay phiên bản đã
xác nhận. Khi gửi, backend kiểm lại quyền, hồ sơ/lịch ngựa, tuyến và thời gian
chuẩn bị. VN→JP vẫn sân bay→sân bay, không bao gồm đường bộ hai đầu. Giá demo
không thay công thức/giá chốt backend. Các legacy URL contract/payment hiện trỏ
đến detail thật; không dùng query `ResponseCode=00` làm chứng cứ thanh toán.

Thông báo là nội dung người dùng đọc, không chứa serialized workflow, OTP hoặc
private storage key. Notification EMAIL reservation/OTP không xuất hiện ở inbox
IN_APP. Không thêm bảng, cột, FK hoặc đổi schema006.

## File/layer chính

| Path | Layer / trách nhiệm |
| --- | --- |
| `frontend/src/features/landing/LandingPage.tsx`, `features/flow1/landingDraft.ts` | Frontend landing, giá demo, hint tuyến |
| `frontend/src/features/auth/pages/login/LoginPage.tsx` | Giữ tuyến qua login; redirect cố định theo role, không open redirect |
| `frontend/src/features/customer/pages/create-request/CreateRequestWizard.tsx` | Wizard4bước thật; UTC+07 input, availability, hồ sơ, submit/retry |
| `frontend/src/features/flow1/TripFields.tsx` | LocationField dùng chung provider adapter; không bịa tọa độ |
| `frontend/src/features/Manager/pages/dashboard/ManagerPortal.tsx`, `features/flow1/relational/PortalPages.tsx` | Shell main + danh sách SQL, bỏ mock actions khỏi Flow1 routes |
| `frontend/src/features/flow1/relational/Pages.tsx` | Giữ PDF/OTP/deadline/payment/cancellation/deployment guards và legacy URL aliases |
| `frontend/src/features/flow1/relational/Notifications.tsx`, `shared/layouts/CustomerLayout/CustomerLayout.tsx` | Chuông/count/read thật; thông tin tài khoản hiện hành; logout xóa session token |
| `frontend/src/app/router/AppRouter.tsx` | Điểm vào customer/manager/operations nối typed API; giữ route module main |
| `backend/Application/Services/Flow1/Relational/RelationalNotifications.cs` | Application: notice dedupe, list/read ownership; không gửi SMTP |
| `backend/Application/Services/Flow1/Relational/RelationalContracts.cs`, `RelationalPayments.cs`, `RelationalDeployment.cs` | Notice sau publication/activation/confirm, cùng SQL transaction nghiệp vụ |
| `backend/WebApi/Controllers/Flow1/Relational/Flow1Controllers.cs` | Controller notice APIs, multipart form DTO; không thêm bank-proof route |
| `backend/tests/Flow1.Tests/RelationalNotificationTests.cs` | SQL/HTTP ownership, IPN retry dedupe, handoff hold/resume |
| `frontend/src/features/flow1/relational/BookingJourney.test.tsx` | Landing/4step guards, version/payload không tiền demo, retry key |
| `backend/tools/flow1-relational-browser.cjs` | Connected Chromium: guest landing/login/wizard/Manager + toàn chuỗi typed hiện có |

Backend active vẫn Domain → Application → Infrastructure → WebApi; không sửa
legacy DAO. Notification dùng entity/EF model NOTIFICATION đã có.

## Bảo toàn sửa đổi local

Trước merge đã lưu exact working/index patches và bản sao từng file vào ignored
App_Data riêng ở worktree. Patch chứa cấu hình riêng chỉ ở máy, không đưa Git/chat.
`appsettings.Local.json`, migrations003/004 và bytes/index của staged Vite được
giữ. Hai controller cũ đã chuyển sang `tools/Flow1LegacySupport/Retained/...`;
multipart fixes của user được giữ ở đó dưới dạng thay đổi local chưa commit.
Active typed controller cũng dùng form DTO/Consumes tương ứng, đã qua HTTP upload.
File scope choices local cũ được giữ byte nguyên trạng, không dùng nó thay scope006.
Commit tích hợp không chứa các thay đổi riêng kể trên hoặc toàn bộ index.

## Kiểm chứng

- `dotnet test backend/Backend.slnx` với `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS`
  và `RACEHORSE_TEST_LIBREOFFICE=...\soffice.com`: build/restore được. Lượt đầu
  306 pass/1 SQL bulk shadow timeout; test đó chạy riêng pass. Lượt full chạy lại
  `--no-build --no-restore`: **307 pass =260Flow1+47Registration,0fail/skip**.
- `npm run test:run -- --maxWorkers=1`: **54pass/17files**, gồm 2 test journey mới.
  Ban đầu thấy upstream ghi đè legacy Contract bridge thành trang tĩnh; đã giữ
  bridge thật, kiểm lại toàn bộ đạt. Không xóa test để bỏ lỗi.
- `npm run build`: đạt; còn warning chunk >500kB của bundle portal main. Không
  tuyên bố đã tối ưu bundle hoặc full-repo lint sạch.
- ESLint các file nối Flow1/router/login/layout/landing/Manager và test mới: đạt.
- `node --test backend/tools/flow1-local-demo.test.cjs`: **6pass**.
- Connected Chrome ROAD trên disposable `RaceHorseFlow1Browser_*`: landing chọn
  tuyến → login BCrypt bằng UI giữ hint →4step → SQL request →Manager list/A1
  revision/accept →quote →LibreOffice PDF →gia hạn ký →SMTP RAM/OTP/sign →gia hạn
  cọc/cancel/reject →Return chưa có tiền →signed local IPN/retry →activation
  notification →one invoice40M/oneTrip →confirm/hold/resume/reconfirm →hai ack.
  SQL invariants kiểm trực tiếp; native003+006 không có JSON columns/COST_ITEM rows.
  Evidence ignored `browser-75120de425d644f985bbb3e79b76fcc1`, PDF
  `d57edb4b4ead856cd8653d6df5bb5e1496045530a327b9ec14e272ba4df076c0`.
  Screenshot landing/wizard đã xem; ảnh detail cuối lượt ROAD chụp khi còn loading,
  không dùng ảnh đó làm evidence visual của detail đã tải. Runner đã thêm wait
  đúng dữ liệu cho lượt kế tiếp.
- Connected Chrome AIR VN→JP cùng chuỗi thật trên test DB riêng: **đạt**; PreparationDays=7,
  DistanceKm=NULL, đúng airport→airport. Evidence ignored
  `browser-45b8fab0ca6a4e8182ce79b5c19ce78e`, PDF
  `cca47555cc2114091bdebe953f6cb1a60e186b3e7b4baf31c3e08b011f256018`.
  Ảnh Manager/detail/handoff sau khi chờ dữ liệu thật đã được xem; có invoice PAID,
  Trip CONFIRMED và hai acknowledgement. Không dùng ảnh loading để kết luận UI.

Maps/SMTP/IPN trong harness là fixtures/loopback, PDF thật bằng LibreOffice.
Các test DB do harness tạo được cleanup đúng guard. Không gọi đây là full live
provider E2E hoặc full Flow2/3 acceptance.

## Vận hành / giới hạn

Chạy demo theo [FLOW1_LOCAL_DEMO.md](FLOW1_LOCAL_DEMO.md) từ primary. Phiên demo
worktree cũ có thể vẫn đang được đại ca dùng; lượt tích hợp không tự stop/restart,
reset dữ liệu hoặc đổi cổng của phiên đó. Không tự chạy primary trên DB nghiệp vụ
để tạo dữ liệu demo. Đã mang riêng section VNPay Sandbox có sẵn sang ignored Development bridge ở primary (file mới, không ghi đè). Không copy Maps snapshot cũ đè cấu hình user; không in secrets hoặc đưa credentials/runtime vào Git. Bridge bị loại khỏi publish; chưa gọi provider.

VNPay Sandbox công khai/HTTPS IPN/querydr vẫn hoãn theo quyết định trực tiếp.
Provider/public IPN, cấu hình issuer/SMTP/HMAC/private bytes/backup/runtime đích
và operational UAT trên môi trường vận hành thật vẫn cần nghiệm thu tương ứng.
Giữ lịch ACTIVE chờ điều kiện mới, không tạo vòng sửa/commit rỗng.
