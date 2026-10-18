> **Mã đơn và giá demo —19/10/2026:** mã mới do backend cấp tuần tự dạng
> REQ_2026_004; mã cũ/quan hệ giữ nguyên. Source cần migration008 đã được duyệt riêng.
> Estimated Transport Cost dùng estimatedTransportCost từ backend, không lấy giá
> Contract và không gán thiếu dữ liệu thành0. Banner wizard lấy demoTransportCost
> từ API estimate sau khi chọn địa điểm/ngày; chưa đủ dữ liệu hiển thị “—”.
> Không thay bố cục, không thêm UI; không push theo yêu cầu trực tiếp mới nhất.

> **Địa chỉ có gợi ý —19/10/2026:** đại ca đã cho phép thay UI riêng hai ô địa chỉ.
> Wizard dùng AddressAutocomplete: gõ từ3ký tự, chờ450ms, chọn địa điểm trong danh
> sách trả về từ API hiện hữu. Chọn bằng chuột hoặc ↑/↓/Enter, Escape để đóng.
> Sửa nội dung/đổi quốc gia phải chọn lại; gửi label/tọa độ đã chọn, không tìm lại
> khi submit và không tự lấy kết quả đầu tiên. Các phần UI khác giữ nguyên.
> Frontend30tests/build/scopedlint đạt; API thật VN/JP và module Vite localhost200.
> Dữ liệu gợi ý phụ thuộc Geoapify; không đảm bảo mọi trại/trường đua đều có trong
> dữ liệu bản đồ. Không có browser/pixel acceptance mới do Work tắt browser use.

> Cập nhật baseline 19/10/2026: giá trị tổngUSD + upload bổ sung theo ngựa đã có
> source/test trong [schema007](../../backend/database/README.md).
> Hai mục đó thay cho phần disabled trong báo cáo lịch sử bên dưới; **đã apply007 và
> cập nhật Docker localhost theo quyền riêng ngày19/10/2026**. API multipart mới và
> wizard mới được phục vụ thật;5tài khoản Flow1 login200, GET/401/403 và dữ liệu cũ
> giữ nguyên đã kiểm. Admin quick-login401 được ghi riêng, không tự reset mật khẩu.
> Browser automation hiện bị tắt trong Work settings, chưa chạy lại UI sau release;
> evidence browser/disposable trước release không thay cho business E2E. Docker
> hiện chưa có LibreOffice/cấu hình converter; chưa xác nhận bước xuất PDF trong
> container. Các UI thiếu khác vẫn giữ nguyên.

> Cập nhật 19/10/2026: đại ca đổi nguồn UI sang **feature/quan@17687ee**.
> Phần mô tả main và evidence bên dưới là lịch sử của `acfba75`; kết quả hiện hành
> ở [FLOW1_QUAN_FRONTEND_INTEGRATION_REPORT.md](FLOW1_QUAN_FRONTEND_INTEGRATION_REPORT.md).
> Danh sách chức năng thiếu UI vẫn áp dụng; không tự tạo page/modal mới.

# Flow 1 — giữ source frontend main, chỉ nối dữ liệu

Quyết định trực tiếp của đại ca: khôi phục toàn bộ frontend từ main; không tự
tạo lại page/modal/layout. Chỉ nối các thao tác đã có. Phần thiếu UI giao teammate
frontend. Đây là scope mới, thay cách dựng UI ở `46e1371` và `8456d1b`.

Nguồn đã fetch: `origin/main@ed520cad5b7ad4b975e79c3b4830bcdf733ec2d4`.
Thư mục làm việc: `D:\Racehorse-Transport-System`, branch `Truong`.
Baseline trước lượt: `8456d1b01963ff896fea3cde72882c82e5a165d9`.

## Nguyên tắc thực hiện

- Lấy file gốc từ Git main, rồi thay imports/mock state/callback xử lý; giữ JSX
  tags, className và inline style. Không tự viết lại một page tương tự bằng mắt.
- Toàn bộ 33 CSS gốc trùng byte main; 64 TSX gốc (trừ router) giữ cấu trúc JSX
  tag/className/style qua kiểm AST. Đây không phải pixel-diff mọi viewport.
- Gỡ các page/modal/style tự tạo ngoài main; không route đến UI Flow1 thay thế.
  Chỉ thêm guard không có UI và các module hook/API/test không dựng page.
- Dữ liệu động, đơn vị tiền, cọc40%, tên provider VNPay, quyền/trạng thái enabled,
  loading/error và callback phải theo backend. Giữ bố cục không có nghĩa là
  khôi phục fake success, tiền giả, hardcoded người dùng hoặc quyền đổi status.
- `frontend/vite.config.ts` staged của đại ca giữ nguyên, không đưa commit.

## Những thao tác đã nối trên giao diện sẵn có

| Trang main | Xử lý thật bên dưới |
| --- | --- |
| Landing | Giữ calculator/CTA gốc. Giá hardcode tham khảo bằng VND, cọc40%; chỉ lưu route hints qua login, không gửi tiền từ client |
| Login / Customer routes | Chưa có token chuyển login. Có token phải GET `/api/auth/me` xác nhận CUSTOMER trước khi mount page; local role hint không đủ. Login từ CTA trở về wizard gốc |
| Create Transport Request ngắn | Giữ form gốc; dữ liệu thiếu được chuyển thành hint sang wizard đầy đủ, không tạo SQL request chưa đủ hồ sơ |
| Wizard4bước | Giữ controls/step labels/horse-item/upload-box. Ngựa owned + availability/RowVersion thật; unique geocoding result; gửi request backend, idempotency retry giữ key; không gửi demo price |
| Home / request list/detail / history | Owned API data, request/contract/Trip status và thông báo IN_APP thật; thiếu dữ liệu để trống/“—”; không fabricate telemetry |
| My Horses | Grid/search/filter gốc dùng ngựa owned và private photo blob; ảnh/scan không đồng nghĩa bác sĩ đã duyệt |
| Manager overview/review | Dữ liệu API vào props cũ; accept/reject/request-changes chờ mutation thành công rồi mới đóng modal; lỗi giữ modal và báo bằng alert sẵn có của trình duyệt |
| Manager Contract studio | Table/cards/queue/deposit/terms gốc. Một dòng giá trọn gói, VND40%, không dựng COST_ITEM; save Draft/publish thật, preview button tải private PDF đã phát hành |
| Customer Contract | Thông tin owned Contract. Agreement không thay chữ ký; nút Sign bị chặn khi chưa có UI PDF/OTP. Không bật lại `setIsSigned(true)` |
| Customer Payment / Return | Nút VNPay gọi payment session thật khi đủ receipt/current status; không fake redirect thành success. Return chỉ GET trạng thái owned; không ghi tiền, không tạo Trip |
| Manager Payments | Dữ liệu PAYMENT/status/due thật; pending IPN không bị gọi là đã thu. Modal gia hạn/hủy quá hạn sẵn có gọi API với version. Không dùng modal bank transfer để tự xác nhận tiền VNPay |

Wizard gốc không có người bàn giao riêng: dùng tên/SĐT tài khoản từ `/auth/me`
làm người bàn giao. Backend bổ sung **read-only `phoneNumber`** cho endpoint này
từ cột USER.Phone có sẵn, không đổi schema. Thiếu SĐT thì chặn submit và báo rõ.
Ngày gốc chỉ có date: quy ước khởi hành00:00, hạn giao23:59 theo giờ Việt Nam.
Nếu cần người giao khác hoặc chọn giờ cụ thể, teammate phải bổ sung UI; không
âm thầm thêm controls vào wizard.

Geocoder trả 0 hoặc nhiều kết quả: không tự chọn tọa độ đầu tiên; báo nhập địa chỉ
cụ thể hơn. Hiện chưa có UI chọn kết quả, attribution được đưa vào dòng mô tả
có sẵn. Upload bổ sung/thương mại chưa có nơi lưu theo scope006 nên controls
gốc được giữ nhưng disabled, không giả lưu.

## Việc giao teammate frontend

| Thiếu / chưa nối | Backend đang có / yêu cầu cần giữ |
| --- | --- |
| Tạo/sửa hồ sơ ngựa | Main chỉ có alert hoặc route chưa có page. Cần form2file PHOTO/PASSPORT_SCAN và identity; POST `/api/customer/horses`, update `/horses/{id}/files` với version/idempotency. Không tái tạo form mới trong lượt này |
| Xem PDF và nhập OTP ký | GET `/customer/contracts/{id}/pdf`, POST `.../otp` với version/hash, POST `.../sign` với version/hash/otp. Chỉ enable signing sau đúng PDF; không dùng OTP đăng ký để ký; không lưu/log OTP |
| Customer sửa đơn/resubmit | Main detail chưa có action/form revision hoàn chỉnh. POST `/customer/requests/{id}/revision` có input + version + key; exclude own booking khi kiểm selectable |
| Customer decline / đề nghị hủy | POST contract `/decline`, `/cancellation/request`; giữ lý do và version. Không hủy đơn có tiền/Trip bằng frontend |
| Manager xử lý latest cancellation | POST `/manager/contracts/{id}/cancellation/{approve|reject}` với version/cancellationId/reason; không tự hoàn tiền |
| Chỉnh hợp đồng đã lưu / reissue | Cần UX withdraw/expire/reissue rõ ràng; không sửa PDF/hạn gốc hoặc nhầm Draft đã lưu vẫn edit được. Backend có lifecycle guards |
| Gia hạn trước ký ngoài tab quá hạn; tăng prep | Modal Manager Payments có thể gia hạn trường hợp đang quá hạn; thiếu action các trường hợp còn lại và trường prepDays khi thẩm định. Backend giữ floor2/3/7 ngày |
| Confirm / hold / resume | POST `/manager/contracts/{id}/deployment/{confirm|hold|resume}` dùng Trip version + reason. Không khôi phục UI riêng do GPT tạo |
| Coordinator/Specialist nhận/ack Flow1 | GET `/operations/flow1/trips`, private PDF/horse files, POST ack với current eventId/Trip version. Portal main được khôi phục; **chưa nối current handoff vào portal này** |
| Bank/manual reconciliation prototype | Scope VNPay-only. Không bật manual confirm; cần teammate quyết định lại nhãn và UX query/review của provider. API query/read-only không thay IPN |
| CommercialValue/y tế bổ sung, route ngoài VN-VN/VN-JP, line-items/floor/customTerms | Backend scope006 không lưu các nghiệp vụ này. Giữ controls gốc readonly/disabled hoặc chặn submit rõ, không ngầm mở schema hoặc hứa lưu |
| Tracking/checkpoint/xe/vet/medical approval | Chưa có dữ liệu thật tương ứng trong Flow1. Home tracking opener bị chặn; không lấy mock timeline làm chứng cứ vận hành |

Các route downstream, profile và transport-information của main được giữ nguyên
source; ngoài các màn nối nêu trên, chúng chưa trở thành nghiệm thu backend chỉ
vì giao diện render. Không coi portal main mock data là full Flow2/3.

## File/layer bàn giao

- `frontend/src/features/auth/RequireCustomer.tsx`: guard `/auth/me`, không tạo
  page loading/login khác. Router vẫn dùng các page main.
- `frontend/src/features/flow1/relational/mainBindings.ts`: query hooks và read
  model mapping cho component main; không persist business state ở localStorage.
- `frontend/src/features/Manager/pages/dashboard/useManagerBackend.ts`: callbacks
  từ main sang API, guards cho quote hiện hành/40%/review; không chứa markup.
- `frontend/src/features/Manager/pages/dashboard/managerPresentation.ts`: map
  DTO sang types props main, giữ unknown fields không tự bịa.
- Page/layout gốc: sửa data sources và event handlers; CSS nguồn giữ nguyên.
- `backend/Application/DTOs/AuthDtos.cs`,
  `backend/WebApi/Controllers/AuthController.cs`: chỉ bổ sung current-user phone.
  Không sửa Domain/DAO/schema hoặc dữ liệu USER.
- `backend/tools/flow1-main-ui-source.cjs`: kiểm cấu trúc JSX/CSS từ Git reference;
  không đổi ref để che diff.
  Các API adapters legacy của page đã gỡ không còn caller cũng được gỡ; chỉ giữ
  typed API/helpers phục vụ các màn main và hợp đồng bàn giao hiện hành.
- `backend/tools/flow1-main-ui-browser.cjs` và opt-in
  `FLOW1_BROWSER_MAIN_SOURCE=1` của RelationalHarness: kiểm đúng scope UI mới;
  fixture ngựa tạo bằng API vì main không có form. Không gọi đó là UI tạo ngựa.

## Kiểm chứng và giới hạn

- Full backend `dotnet test backend/Backend.slnx --no-build --no-restore`:
  **307pass =260Flow1+47Registration,0fail/skip**. Lượt đầu có1 SqlBulkCopy timeout
  trong shadow conversion test; test đó chạy riêng pass, sau đó full solution
  chạy lại pass. Không bỏ test hoặc tăng timeout để giả đạt.
- FE `vitest run --maxWorkers=1`: **17pass/2files** cho data bindings/guards mới,
  gồm chặn guest/token hết hạn/sai role, wizard versions+retry, OTP không bypass,
  payment host/Return-only, stale Manager mutation và pending/review read model.
  Test UI riêng của các page đã gỡ cũng được gỡ theo; không gọi17 là coverage
  đầy đủ mọi component main hoặc dùng lại số60 của UI cũ.
- TypeScript/Vite production build PASS; có warning bundle>500kB (không thay
  chunking hoặc tối ưu UI ngoài yêu cầu). Hook/guard/test mới scoped lint PASS.
- Chrome ROAD: `browser-3d5a3f617be74d63aaf4e201f6e768e6`; AIR VN-JP:
  `browser-638cae7b6f634b2099d877836a4924de` trong ignored
  `backend/WebApi/App_Data/flow1`. Cả2 đạt SQL:1horse/1request/1Contract
  PENDING_SIGNATURE với PDF hash, **0SignedAt/0invoice/0payment/0Trip**. Các phần
  chưa có UI không được backend-fixture giả lập rồi gọi đó là nghiệm thu UI.
- Đã xem screenshots main wizard và Manager Contract: UI source gốc được giữ;
  mã SQL dài có thể wrap/tràn các vùng vốn thiết kế cho mã demo ngắn. Không tự
  sửa CSS để che khác biệt, teammate có thể xử lý khi được yêu cầu.
- Browser lần đầu không tìm đúng implicit label gốc (selector test), lượt sau
  accept thiếu ghi chú bắt buộc bị backend từ chối. Đã sửa selector/fill ghi chú
  bằng input main có sẵn và thêm guard báo thiếu ghi chú; cả2 tuyến chạy lại đạt.
  Không làm yếu backend guards hoặc bỏ assertions.
- `node backend/tools/flow1-main-ui-source.cjs`: **33CSS byte-identical +64TSX
  giữ tag/className/style**, không replacement UI component ngoài main. Guard
  không tạo trang được cho phép; router chỉ thay bảo vệ/redirect cần thiết.
- ESLint bound main pages hiện có3errors (Manager state-in-effect, unused
  `_onNavigate`, `any` trong Contract items) và4warnings hooks. Đây là các vị trí
  có sẵn main, không tự refactor UI/logic khác để “làm sạch”. Hook/guard/test mới
  được lint riêng; không tuyên bố full-repo lint sạch.

Không lấy baseline307BE/60FE/ROAD-AIR của
`8456d1b` làm bằng chứng cho UI main hiện tại: các modal ở đó đã được gỡ theo yêu
cầu mới. Đây là khôi phục frontend + tích hợp có giới hạn, **chưa full Flow1 UI
E2E vì phần OTP/payment/handoff UI còn chờ teammate**.

Không migrate/seed/POST HorseTransportDB; chỉ disposable DB test. Không provider
VNPay công khai/tunnel/deploy/push, không mail/SMS người thật. Không dừng phiên
demo cũ ở worktree. Demo/harness old UI chỉ còn phù hợp revision trước; chạy
profile main-source để kiểm các màn được phép hiện hành.

## Kiểm diff và bảo toàn

- Không sửa file config riêng, migration003/004,2controller legacy retained,
  scope choices cũ, `.dockerignore` của đại ca; staged Vite giữ nguyên cả bytes
  và blob trong index. Các file drawio/ảnh/template/temp ngoài scope giữ nguyên.
- Gỡ các API legacy không còn caller của các page GPT đã gỡ. Chỉ giữ typed
  API/helpers/hook đang nối main; không để endpoint JSON/history cũ lẫn vào UI.
- ESLint của chính source main được đối chiếu lại bằng `--stdin`:3error hiện
  hành nêu trên cũng có sẵn ở main. Không che lỗi bằng disable rule/skip tests.
- `git diff --check` so với HEAD trước khôi phục còn báo whitespace nguyên gốc
  main tại coordinatorApi.ts/vite-env.d.ts (EOF), Landing và request detail.
  Giữ nguyên các dòng nguồn này; không tự format main ngoài nghiệp vụ.
- Kiểm artifact/known credential patterns chỉ trên own paths trước commit;
  không đưa App_Data, snapshot ZIP, binary, PDF, screenshots hoặc secret vào Git.

Lệnh kiểm lại tại root:

```powershell
node backend/tools/flow1-main-ui-source.cjs
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAIN_SOURCE = '1'
# RACEHORSE_TEST_LIBREOFFICE: runtime soffice.com local đã có.
dotnet run --project backend/tools/Flow1RelationalHarness -- <node.exe> <playwright_module>
# Thêm FLOW1_RELATIONAL_AIR=1 cho VN→JP, không đổi sang provider thật.
```

FE: `node node_modules/vitest/vitest.mjs run --maxWorkers=1`,
`node node_modules/typescript/bin/tsc -b`,
`node node_modules/vite/bin/vite.js build` trong frontend. Sau cleanup adapters,
17test/build đã chạy lại đạt; không dùng kết quả trước cleanup để thay thế.

### Localhost runtime update (19 October 2026)
Approved schema008 has now been applied after fresh SQL backup, actual isolated restore/CHECKDB and all-original-data/FK parity. The Docker backend now serves readable IDs for new requests and `estimatedTransportCost`; existing IDs are intentionally retained. Customer estimate and Manager suggested price both bind this backend transport-only amount, independently of Contract quote. PC budget/floor remain absent under the agreed simplified scope. Sandbox runtime configuration has been privately mapped and the actual gateway preflight passes; public IPN acceptance remains deferred. Do not credit money from ReturnURL. No push performed.
