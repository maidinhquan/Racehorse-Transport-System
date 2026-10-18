# Flow 1 — lấy frontend từ feature/quan, giữ backend binding

Yêu cầu trực tiếp ngày 19/10/2026: frontend mới nhất nằm ở nhánh của Quân,
không tiếp tục lấy main làm nguồn giao diện. Đây là thay đổi nguồn UI, không
phải merge toàn bộ branch backend của teammate.

- Source đã fetch: `origin/feature/quan@17687eedd40ec02ced54bf45df826fa5916e977c`.
- Baseline trước lượt: `acfba75ecf450483013246c556c7764cae7452f6`, branch `Truong`.
- Nơi làm việc: `D:\Racehorse-Transport-System`.

## Thay đổi

Lấy các thay đổi frontend trực tiếp từ Git Quân so với nguồn main cũ, ghép
ba chiều với phần gọi API hiện hành. Landing và chi tiết yêu cầu được xử lý
xung đột rõ ràng: giữ markup Quân, giữ dữ liệu owned từ backend và guard đăng nhập.
Không khôi phục localStorage làm nguồn trạng thái của Customer Flow1.

- Landing: các giá trị ban đầu rỗng, kiểm đủ tuyến/số ngựa, chặn cùng địa điểm,
  placeholder/disabled và thông báo đúng source Quân. Giá hardcode chỉ tham khảo;
  giữ VND/40%/VNPay theo nghiệp vụ, route hints đi qua đăng nhập.
- Chi tiết đơn: bỏ Demo Controls theo source Quân; status/notes/horses/Contract
  vẫn lấy API owned, không lấy request mẫu từ localStorage.
- Coordinator: lấy nguyên thay đổi của Quân, bỏ các nút giả Manager, cập nhật
  views/CSS và localStorage prototype của module đó. Đây vẫn là prototype
  downstream, không phải tích hợp handoff/ack backend hay full Flow2/3.
- App/theme/auth layout và fallback route: lấy thay đổi Quân. Guard Customer
  `/auth/me` hiện hành được giữ; không dùng role local làm quyền truy cập.
- Lấy nguyên package/lockfile, Playwright config, sáu file test/helper và nested
  workflow từ branch Quân. `npm ci --ignore-scripts --no-audit --no-fund` đạt.
- Không ghi đè `frontend/vite.config.ts` đang staged của đại ca. Các pattern
  include/exclude Vitest của Quân được đưa vào test config riêng đã có; không
  đổi proxy/dev server. Không bật polling bằng cách sửa file riêng của user.
- Tool kiểm source đổi reference sang đúng SHA Quân; browser harness chọn đủ
  landing fields mới và kiểm Demo Controls vắng mặt, thay thao tác demo cũ.

## Kiểm chứng lượt này

- `node backend/tools/flow1-main-ui-source.cjs`: PASS **33 CSS trùng byte**,
  **64 TSX giữ JSX tags/className/style**, không tạo trang UI thay thế. Router
  ngoại lệ vì guard; dynamic content/handlers/disabled theo nghiệp vụ backend.
  Đây không phải pixel-diff toàn bộ viewport.
- `npm run test:run -- --maxWorkers=1`: **18 pass/2 files**. Thêm test landing
  rỗng/cùng địa điểm/40% VND/guest role hint/không gửi quote từ client; giữ các
  test ownership/login/sign/payment/version/retry đã có.
- `npm run build`: TypeScript + Vite PASS; vẫn warning bundle >500kB.
- ESLint scoped các file mới nối/landing/detail/auth/App: PASS. Không tuyên bố
  toàn repo hoặc nguyên bộ coordinator prototype lint sạch.
- Playwright branch Quân được collect đủ **19 tests/4 files**. Chạy smoke +
  coordinator + storage helper: **12 pass**, dùng Chrome có sẵn, config tạm
  trong ignored `App_Data`. Không gọi bộ customer localStorage là backend E2E;
  nó chưa phù hợp guard/dữ liệu owned hiện tại và không được chạy để giả đạt.
- Cấu hình mặc định của Quân yêu cầu Chromium headless shell1248 chưa cài trên
  máy; lần chạy đầu dừng ở launch, chưa kiểm application. Chrome override chỉ
  cho lần QA, không sửa cấu hình upstream để che dependency.
- Lần Chrome trên Docker đầu tiên thấy asset cũ do dev-server cache/watch; restart
  **riêng** container frontend và chạy lại toàn bộ 12 test đạt. Backend không
  restart, không seed/migrate/ghi business DB trong lượt này. Runtime frontend
  hiện ở `http://localhost:5173`; browser user có thể cần Ctrl+F5.
- Connected Chrome ROAD: `browser-5ee7e8b3fbe84ef898bcf49eb1095599` trong ignored
  `backend/WebApi/App_Data/flow1`. Native disposable SQL000→003→006, actual login,
  owned horse fixture API, guest guard, wizard, Manager accept/Draft/publish,
  LibreOffice PDF/private download, absent OTP UI blocked, ReturnURL read-only.
  Final SQL:1request/1PENDING_SIGNATURE Contract,0signature/invoice/payment/Trip.
- Connected AIR VN→JP: `browser-6bcd6baa8c3b4f5290700d38584fca0b`, cùng
  chuỗi thao tác native và giới hạn UI như ROAD; final SQL không có chữ ký,
  invoice, payment hoặc Trip. Cả hai disposable DB được harness dọn sau kiểm.
- Maps/SMTP là fixture/loopback; không kiểm lại VNPay provider/IPN công khai.
  Không sửa backend runtime, không chạy lại toàn bộ backend tests để gọi đó là
  bằng chứng mới. Không gửi email/SMS người thật hoặc phát sinh thanh toán.

## Giới hạn và bảo toàn

Danh sách UI thiếu trong `FLOW1_MAIN_FRONTEND_HANDOFF.md` vẫn áp dụng: tạo/sửa
ngựa, PDF/OTP ký, revision/resubmit, lifecycle/cancellation, deployment/handoff
cần teammate frontend bổ sung. Lấy branch mới không tự tạo đủ UI Flow1.
Giữ nguyên giao diện gốc dù có các điểm prototype chưa phù hợp backend;
không bật mock status/checkbox signature/payOS/manual bank để demo thành công.

Nội dung/index Vite được đối chiếu SHA trước/sau, giữ nguyên. Không đưa staged
Vite hoặc dirty root .gitignore/settings/migrations/retained controllers/scope
choices/.dockerignore của user vào commit. Không merge toàn branch Quân,
không lấy backend của teammate, không push/PR/deploy hoặc thay schema.

CSS detail dùng CRLF nguyên byte upstream; trailing spaces có sẵn ở landing
Quân cũng được giữ. `git diff --check` mặc định có cảnh báo các dòng nguồn này;
không format lại CSS/JSX để làm đẹp diff và phá yêu cầu source nguyên gốc.
Scan own paths: không merge marker, private key hoặc token pattern phát hiện;
không đưa runtime/config/ảnh QA/PDF/node_modules/test output vào Git.
Một lệnh kiểm runtime đã in nhầm cấu hình Docker có credential tồn tại từ trước;
đã thông báo ngay cho user cần rotation. Không lưu các giá trị vào report/Git,
không tự rotate khi chưa có quyền.

## Các path của lượt này

- `frontend/.github/workflows/playwright.yml`
- `frontend/.gitignore`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/playwright.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/app/router/AppRouter.tsx`
- `frontend/src/features/coordinator/pages/dashboard/CoordinatorPortal.css`
- `frontend/src/features/coordinator/pages/dashboard/CoordinatorPortal.tsx`
- `frontend/src/features/coordinator/pages/dashboard/views/RenderActiveTripsPage.tsx`
- `frontend/src/features/coordinator/pages/dashboard/views/RenderDashboardPage.tsx`
- `frontend/src/features/coordinator/pages/dashboard/views/RenderTripStudioPage.tsx`
- `frontend/src/features/landing/LandingPage.tsx`
- `frontend/src/features/user-dashboard/page/transport-request-page/detail/TransportRequestDetailPage.css`
- `frontend/src/features/user-dashboard/page/transport-request-page/detail/TransportRequestDetailPage.tsx`
- `frontend/src/shared/context/ThemeContext.tsx`
- `frontend/src/shared/layouts/AuthLayout/AuthLayout.tsx`
- `frontend/tests/coordinator-planning.spec.ts`
- `frontend/tests/customer-request-detail.spec.ts`
- `frontend/tests/example.spec.ts`
- `frontend/tests/helpers/isolated-test.ts`
- `frontend/tests/helpers/storage.ts`
- `frontend/tests/storage-helpers.spec.ts`
- `frontend/vitest.config.ts`
- `frontend/src/features/flow1/relational/MainSource.test.tsx`
- `backend/tools/flow1-main-ui-browser.cjs`
- `backend/tools/flow1-main-ui-source.cjs`

PDF evidence `browser-5ee7e8b3fbe84ef898bcf49eb1095599`: SHA256 `5f962fdb67c4298d43ff4703e4636d438d23af0523601c01abe7f04987b6b791`.

PDF evidence `browser-6bcd6baa8c3b4f5290700d38584fca0b`: SHA256 `1e8a7e54c6d99e0801bc1c533575bfc21b4fb2c9c795e43ffbc448bcc37d7889`.
