# Flow1 — khôi phục giao diện frontend main

> **Đã được thay thế về frontend theo quyết định trực tiếp19/10/2026:** lấy source main gốc, chỉ nối dữ liệu/thao tác có sẵn, không giữ page/modal tự tạo. Xem [FLOW1_MAIN_FRONTEND_HANDOFF.md](FLOW1_MAIN_FRONTEND_HANDOFF.md). Kết quả E2E trong báo cáo này là lịch sử của UI trước, không phải nghiệm thu UI main hiện hành.

Ngày18/10/2026, nhánh `Truong`, thư mục chính `D:\Racehorse-Transport-System`.
Baseline trước sửa: `46e1371d5570ffd96c16d81d508894ac61b17779`.
Nguồn thiết kế: `origin/main@ed520cad5b7ad4b975e79c3b4830bcdf733ec2d4`.

## Yêu cầu và kết quả

Đại ca yêu cầu giữ giao diện frontend. Lượt tích hợp46e1371 đã thay nội dung nhiều
màn hình bằng các form/bảng tối giản; đó không phải yêu cầu thiết kế của đại ca.
Lượt này khôi phục bố cục/card/table/sidebar/icon/modal của main, gắn dữ liệu và
mutation API vào các vị trí đó. Không quay lại mock arrays/localStorage đổi status,
không bỏ guards để giao diện trông như đã thanh toán hoặc đã ký.

| Màn hình | Thiết kế giữ / dữ liệu nối |
| --- | --- |
| Customer Home | Welcome banner;2cột Current Trip/Notifications; recent-request table; tracking modal. Owned SQL request/Trip/notice; thiếu thông tin hiện“—”/empty, không bịa checkpoint/xe/ETA thực tế |
| Customer request list/detail | Bộ lọc, bảng nhiều cột, status banner, detail2cột, hồ sơ và progress card. API thật; nút đi Contract/Payment hoặc wizard sửa; bỏ panel demo tự chuyển status |
| Horse profiles | Grid thẻ, ảnh, trạng thái, search/filter,2nút/card. Private photo fetch; thêm/sửa2file trong modal cùng design; không suy scan thành y tế đã duyệt |
| Wizard | Form-grid2cột, estimate banner, horse-item/badge, upload box, footer4bước của main. Dates/contacts/geocoding/owned horses/version/revision thật; bước chọn ngựa chờ kiểm lịch trước khi cho qua |
| Customer Contract | Header/info-grid/terms/agreement/footer của main. Tải đúng PDF; agreement chưa đủ để ký, mở OTP modal sau email API; receipt lấy backend |
| Customer Payment | Header/badge, summary/info-grid/deposit-box/payment-note/nút thanh toán của main. VNPay thay payOS theo scope đã chốt; Return không ghi tiền; lịch sử cũ giữ currency và không mở thu cọc |
| Manager Portal/Overview | Khôi phục shell/icons/language/profile/nav và overview cards/tables từ main; data dùng API và current verified Trip |
| Manager Requests | Dùng lại RenderRequestsPage của main: tab/filter/search/table/review modal/decision subforms; await server thành công rồi mới đóng, stale lỗi giữ modal; private photo/passport download |
| Manager Contracts | Giữ contract-layout-grid, queue/sidebar/policy, studio header, pricing table/summary, deposit/deadline cards, terms và PDF preview modal. Chốt giá trọn gói; save Draft/publish API; PDF preview dùng private blob thật |
| Manager Payments | Giữ module header/tabs/table/card/reconciliation modal; dữ liệu từng PAYMENT, query/review/gia hạn/hủy qua API; không có manual bank confirmation giả |
| Operations handoff | Inbox API/ack/private documents hiển thị trong shell Coordinator/Specialist của main; không còn trang trắng tối giản riêng cho bàn giao |

Giữ các CSS gốc chính của main cho Home, Horses, request list/detail,
Contract/Payment, Manager/Coordinator/Specialist. Bổ sung ít CSS cho popup thật,
form fields, file/image controls và ID dài; không dựng theme/layout khác.

Khác biệt nghiệp vụ bắt buộc so với prototype: VND/cọc40% cố định; chỉ VNPay;
VNJP airport→airport; không làm preliminary plan/budget/line-items tùy ý hoặc
định giá thương mại chưa có nơi lưu. Các vị trí đó hiện trạng thái chỉ đọc/trống
phù hợp, không giả lưu. Giá/hạn/tiền/status/PDF/chữ ký do backend quyết định.
Giữ gia hạn/cancellation/confirm-hold-resume bằng các nút và modal cùng kiểu UI.

## Các file và layer

- Frontend pages trong `frontend/src/features/user-dashboard/page/{home-page,
  my-horses,transport-request-page/{list,detail,contract,payment}}`: giữ markup của
  main, thay mock/localStorage bằng typed API. CustomerLayout vẫn giữ shell main.
- `frontend/src/features/customer/pages/create-request/CreateRequestWizard.*`:
  markup4step main + validation/availability/submit/revision; không gửi giá demo.
- `frontend/src/features/Manager/pages/dashboard/ManagerPortal.tsx`,
  `managerPresentation.ts` và `views/Render{Requests,Contracts,Payments}Page.tsx`:
  shell/queue/table/modal; chỉ server result đổi trạng thái.
- `frontend/src/features/flow1/relational/{presentation,LifecycleActions,
  HorseProfileModal,Notifications,api,PortalPages,Pages}.*`: adapter/hook,
  private blob preview và các modal mutation; routing quay lại page main.
- `frontend/src/features/{coordinator,specialist}/pages/dashboard/*Portal.tsx`:
  thêm tùy chọn current handoff trong shell có sẵn; giữ module downstream khác.
- Backend Application `DTOs/Flow1/RelationalDtos.cs` và
  `Services/Flow1/Relational/RelationalFlow1Service.cs`: bổ sung **read model**
  tên/email khách, breed/sex/DOB ngựa lấy từ cột đã có. Không sửa Domain/schema,
  DAO, quan hệ hoặc persistence. Quyền owner/manager hiện hữu bảo vệ dữ liệu.
- `backend/tools/flow1-relational-browser.cjs`: thao tác UI gốc, chờ modal/API,
  chia sẻ pacing theo actor qua các context để giữ limiter thật; chờ hoàn tất
  navigation mô phỏng trước kiểm Return-only. Không mở provider/network thật.

## Kiểm chứng

- Full `dotnet test backend/Backend.slnx --no-restore` với SQL Express test và
  LibreOffice đã cấu hình: **307pass =260Flow1+47Registration,0fail/skip**.
- FE full `node node_modules/vitest/vitest.mjs run --maxWorkers=1`: **60pass/18files**;
  gồm guard Customer/Manager legacy currency/history, không mở thu cọc từ hồ sơ cũ.
- Build đạt; vẫn có warning bundle>500kB, không tuyên bố đã tối ưu toàn portal.
- Scoped ESLint **27file TypeScript/TSX thay đổi: PASS**. Sửa một unused callback
  parameter trong portal Specialist đang chạm; không claim full-repository lint.
- Test UI bổ sung giữ shell/card/modal, reject stale không fake success, chỉ dữ
  liệu owned, y tế unknown,4steprevision giữ RowVersion/exclude own booking,
  ký phải tải PDF và agreement; lịch sử chưa xác minh không mở VNPay.
- Chrome ROAD và AIR đều PASS trên giao diện khôi phục. Kiểm cả
  tạo hồ sơ trong modal →landing/login→4step→Manager review/revision/quote→PDF/OTP
  →cọc fixture/Return-readonly/IPN retry→notice/oneTrip→hold/resume→bothacks.
  Các lỗi timing/pacing ban đầu được giữ đúng là failure, không giả nghiệm thu:
  availability chưa về thì không qua bước ngựa; không tranh navigation Return
  với provider redirect; timeout UI phải đủ cho pacing của limiter thật.

## Giữ nguyên phạm vi an toàn

Chỉ test disposable DB `RaceHorseFlow1Browser_*`/`RaceHorseFlow1Test_*`, maps/SMTP/
IPN fixture; LibreOffice tạo PDF thật. Chưa nghiệm thu provider VNPay công khai,
chưa full downstream Flow2/3, không deploy/push/DDL/seed/POST trên DB nghiệp vụ.
Phiên demo cũ của đại ca được giữ, không stop/reset/restart. Config/003/004,
user controller patches tại retained path, scope choices, staged Vite và file
`backend/.dockerignore` ngoài scope được giữ, không đưa vào commit này.

## Evidence Chrome cuối lượt

- ROAD: `backend/WebApi/App_Data/flow1/browser-ba86c39e13434444b02f52ba4c3c4d76`;
  PDF SHA256 `bb887a7a7b082cca1750fa497ac22fe47c6a3789f9ffbaa30a296653598ab572`.
- AIR VN→JP airport→airport: `backend/WebApi/App_Data/flow1/browser-fd952ed15a5d4961b54d56019b9c2282`;
  PDF SHA256 `1557937b732d3a4d07e3e2eb39aa202e70f0c2b3bef27dfcde242b168699d6b9`.
- Cả hai: final typed-result.json/SQL assertions đạt, một invoice cọc40M/một Trip,
  notice sau activation, PDF ops cùng hash, current event có đủ2ack. Browser logs
  ghi các bước, screenshots giữ ngoài Git; không đưa test data/PDF/private bytes
  vào commit. Các process/testDB riêng được harness kết thúc đúng guard.
- Đã xem ảnh Customer Home và Manager Contract Studio: shell/card/table/grid,
  màu cam và bố cục main, ID dài không tràn queue. Không gọi đây là pixel-diff
  tự động hoặc đã kiểm mọi viewport; chưa kiểm mobile riêng.
- Sau Chrome: gỡ adapter trang tối giản không còn route, bỏ override màu wizard
  khỏi main, thêm guard hiển thị currency/status lịch sử Manager chỉ đọc. Test
  FE cuối lượt bao gồm các thay đổi này; không đổi luồng native đã kiểm Chrome.

**Final verification:** 307BE +60FE PASS; tsc-build/Vite production build PASS;
27file scoped ESLint PASS; ROAD/AIR Chrome connected PASS với các giới hạn nêu trên.
Build CLI: `node node_modules/typescript/bin/tsc -b`, sau đó
`node node_modules/vite/bin/vite.js build`. Lần gọi đường dẫn npm.cmd không tồn
tại đã fail trước khi chạy build; hai lệnh Node thực tế trên đã chạy thành công.
Không build API của phiên demo đang mở. Diff whitespace/artifact/secret pattern
checks chỉ trên own paths; local commit chọn rõ path, giữ staged Vite ngoài commit.
