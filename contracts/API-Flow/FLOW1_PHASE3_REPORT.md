# Flow 1 — Giai đoạn 3: Review, Preliminary Plan, Quote và Draft

Ngày thực hiện: **16/10/2026**. Nhánh: `Truong`. Commit trước lượt này:
`0695fe7e9c329521f52292427fbd05a8a21566cf` (nghiệm thu phase 2).

**Hoàn thành trong phạm vi local/test:** Manager và Customer dùng giao diện nối API,
SQL Server và private file store để thẩm định, sửa yêu cầu, lập kế hoạch, tính ngân sách
và tạo/thay Draft. Chưa phát hành PDF, ký OTP, thu tiền hay tạo Trip.
Không thêm migration/schema trong phase 3; không tác động DB nghiệp vụ.

## 1. Hành vi đã triển khai

| Use case | Kết quả thực tế |
|---|---|
| Manager list/detail | Phân trang/lọc trạng thái từ SQL; xem canonical snapshot, liên hệ, lịch, ngựa và tải hồ sơ riêng đúng request/version |
| Accept / reject | Accept kiểm lại hồ sơ, lịch và preparation floor; reject cần lý do; quyền `LOGISTICS_MANAGER` |
| Request revision | Chọn các nhóm trường cần sửa, lưu lý do; Customer sửa bằng Wizard và resubmit; full canonical snapshot tăng version, trở về `PENDING` |
| Hỏi thông tin | Hỏi/đáp văn bản theo question ID và version yêu cầu; trả lời không tự sửa canonical request |
| Customer đề xuất thay đổi | Lưu đầy đủ proposal và base request version; canonical giữ nguyên đến khi Manager duyệt; đề xuất đang chờ chặn accept/plan/Draft |
| Manager duyệt thay đổi | Xem đầy đủ tuyến/lịch/phương thức/mục đích/liên hệ và từng ngựa đề xuất, tải hồ sơ trước duyệt; kiểm lại ownership/version/file/lịch/estimate; thay canonical, vô hiệu plan/Draft cũ; phải accept/replan lại |
| Customer hủy | Cần lý do; chỉ trước khi hợp đồng bị đóng băng bởi send/sign; supersede Draft và giải phóng lịch request |
| Preliminary plan | Lưu ngày, thời điểm khởi hành UTC, preparation days, số xe/stall, nguồn lực dự kiến, ngân sách bổ sung và attribution riêng tư |
| Quote nội bộ | Backend tính cost/floor/suggested theo policy version và dữ liệu route; fixed cost mỗi chuyến không nhân lặp; FE không gửi tổng tiền đáng tin cậy |
| Draft | Backend cộng selling lines, làm tròn VND, cọc 40%; dưới sàn bắt buộc lý do nội bộ; SQL `DRAFT`, `TripID=NULL`, chưa Invoice |
| Thay Draft | Tạo ContractID mới, giữ snapshot cũ và đánh dấu `SUPERSEDED`; sửa plan cũng vô hiệu Draft hiện hành |
| Customer xem Draft | Chỉ selling lines, tổng, cọc, currency, trạng thái; không trả cost/floor/plan nội bộ/lý do bán dưới sàn |
| Thông báo | Notices bền vững trong review metadata và hiển thị lại trên trang Customer; chưa gửi email/SMS hoặc tích hợp chuông realtime |

Preparation floor giữ **2/3/7 ngày**; Manager chỉ tăng trong cùng canonical request version.
Capacity nghiệp vụ đã chốt vẫn **1 ngựa/xe**. AIR preliminary plan yêu cầu mã gateway
3 chữ hoa và `GroundLegScope=EXCLUDED`: chỉ dự toán airport-to-airport, chưa nhận thêm
ground legs hay xác nhận chuyến bay. Nguồn lực là kế hoạch sơ bộ, chưa gán xe/nhân sự thật.
Thay lịch phải qua proposal/revision do Customer xác nhận; Manager không âm thầm đổi ngày.

## 2. File và layer

Các đường dẫn dưới đây tính từ gốc repository `D:\Racehorse-Transport-System`.

| File | Layer / trách nhiệm |
|---|---|
| `backend/Application/DTOs/Flow1/RequestReviewDtos.cs` | Command, review/plan/Draft snapshots, projections, receipt và DTO riêng Manager/Customer |
| `backend/Application/DTOs/Flow1/CustomerTransportDtos.cs` | Request detail thêm review projection tương thích reader phase 2 |
| `backend/Application/Interfaces/Flow1/IRequestReviewRepository.cs` | Hợp đồng truy cập request/contract/list và thay mapping ngựa trong UoW |
| `backend/Application/Interfaces/Flow1/ICustomerTransportRepository.cs` | Kiểm tra overlap loại chính request đang sửa |
| `backend/Application/Services/Flow1/RequestReviewService.cs` | State guards, version, plan/pricing, Draft, idempotency và recovery |
| `backend/Application/Services/Flow1/CustomerTransportService.cs` | Dùng chung validation hồ sơ/request; selectable khi sửa; giữ hash submit ban đầu để retry sau revision |
| `backend/Infrastructure/DAOs/Flow1/RequestReviewRepository.cs` | Active EF repository; Include mappings, list SQL, stage mapping trong transaction |
| `backend/Infrastructure/DAOs/Flow1/CustomerTransportRepository.cs` | SQL overlap loại request đang sửa |
| `backend/WebApi/Controllers/Flow1/RequestReviewController.cs` | 4 controller Manager/Customer request review và Draft contracts; role/owner checks, private download |
| `backend/WebApi/Controllers/Flow1/CustomerTransportController.cs` | Customer detail reconciliation + sanitized projection; selectable nhận requestId có kiểm owner |
| `backend/WebApi/Extensions/Flow1CustomerExtensions.cs` | DI repository/service |
| `frontend/src/features/flow1/reviewApi.ts` | API/types và giữ idempotency key trên retry cùng body/version |
| `frontend/src/features/flow1/ManagerPages.tsx` | Manager list/detail, câu hỏi/revision/change, plan/budget/selling lines và Draft thật |
| `frontend/src/features/flow1/CustomerReviewPanel.tsx` | Phản hồi, hỏi đáp, notices, hủy, Draft public |
| `frontend/src/features/flow1/CustomerPages.tsx`, `api.ts` | Wizard sửa/proposal, bảo toàn dữ liệu đã nhập, chọn chính ngựa đang được request giữ lịch |
| `frontend/src/app/router/AppRouter.tsx` | Manager dashboard/list/detail thật; Customer revision/change routes |
| `backend/tests/Flow1.Tests/RequestReviewTests.cs` | 9 SQL integration tests gồm quyền, version, concurrency, retry, rollback và lỗi SQL/file |
| `backend/tests/Flow1.Tests/CustomerTransportTests.cs` | Factory cho phép inject fault store riêng test, giữ regression phase 2 |
| `frontend/src/features/flow1/ReviewPages.test.tsx` | 4 UI/API component tests mới |
| `frontend/src/features/flow1/CustomerPages.test.tsx` | Timeout riêng test Wizard dài tăng lên 15 giây khi chạy cùng SQL/Chrome; giữ nguyên assertions |
| `backend/tools/Flow1BrowserHarness/Program.cs`, `.csproj` | Opt-in phase 3, fictional Manager/test JWT, disposable DB, hậu kiểm Contract/no Trip/no Invoice; reference WebApi để build đúng API mới |
| `backend/tools/flow1-browser.cjs` | Chrome Customer + Manager nối use case và SQL, screenshot; chờ cửa sổ rate limit thay vì giảm guard production |

Không sửa legacy `backend/DAO`, không thêm dependency ứng dụng. Trang Manager dashboard
được nối vào Manager request list thật; trang mock cũ không còn là entry point của flow này.

## 3. API thực tế và version

Prefix chung `/api`. POST/PUT ghi nhận nghiệp vụ cần header `Idempotency-Key` và body
`expectedVersion` là **review metadata version** từ GET detail/review; không nhầm với
canonical request version hoặc contract file version. Thành công trả aggregate mới.
Version tăng theo append prepare/receipt nên không mặc định mỗi action chỉ tăng 1.

| Quyền | Method / path | Dữ liệu |
|---|---|---|
| Manager | GET `/manager/requests?status&page&pageSize` | SQL list, không kèm private snapshot |
| Manager | GET `/manager/requests/{id}` | `{request, version, review, plan, contract, allowedActions, belowFloorReason}` |
| Manager | GET `/{id}/info-requests`, `/{id}/change-requests` dưới request prefix | Cùng Manager aggregate, không phải array riêng |
| Manager | POST `/{id}/accept`, `/reject`, `/request-revision`, `/info-requests` | `reason`, `fields` khi revision, `expectedVersion` |
| Manager | GET `/{id}/revisions` | Lịch sử full canonical snapshots |
| Manager | POST `/{id}/change-requests/{changeId}/approve` hoặc `/reject` | Reject cần reason; approve kiểm base request version |
| Manager | GET/POST/PUT `/{id}/preliminary-plan` | GET trả plan nội bộ; ghi nhận `plan` trong ReviewCommand |
| Manager | GET `/{id}/quote-suggestion` | Plan/quote nội bộ hiện hành; chưa plan trả 409 |
| Manager | POST `/{id}/contracts`, `/{id}/contract-versions` | `lines`, lý do nếu dưới sàn; tạo Draft hoặc thay Draft |
| Manager | POST `/{id}/discard-prepared` | Bỏ prepare chưa commit SQL, cần version/lý do |
| Manager | GET `/{id}/horses/{horse}/documents/{version}/{kind}` | Download riêng, scope canonical hoặc proposal đang PENDING + đúng owner/horse/version; no-store |
| Manager | GET `/manager/contracts/{id}` | Private snapshot + `reviewVersion`, `editable` |
| Manager | PUT `/manager/contracts/{id}` | Thay Draft hiện hành bằng ID mới; dùng `expectedVersion=reviewVersion`, không sửa snapshot cũ |
| Customer | GET `/customer/requests/{id}` | Canonical request + review đã lọc nội bộ |
| Customer | GET `/{id}/review`, `/info-requests`, `/change-requests` dưới Customer request prefix | Cùng sanitized review aggregate |
| Customer | POST/PUT `/{id}/revision` | Full `request` snapshot, resubmit |
| Customer | POST `/{id}/info-responses` | `questionId`, `reason` chứa câu trả lời |
| Customer | POST `/{id}/change-requests` | `reason`, full `request` proposal |
| Customer | POST `/{id}/cancel` | `reason` |
| Customer | GET `/customer/contracts/{id}` | Public selling summary, owner khác nhận 404 |

Ví dụ selling lines: `{category:"TRANSPORT", description:"Vận chuyển theo kế hoạch",
quantity:1, unitPrice:115000000}`. Backend trả total **115.000.000 VND**, deposit
**46.000.000 VND**. Loại line: TRANSPORT/PROCEDURE/VETERINARY_CARE/INSURANCE.
Không có endpoint PDF/send/sign giả trong phase này. Hỏi thông tin hiện là văn bản,
không nhận attachment ở action hỏi đáp; hồ sơ ngựa vẫn upload/download qua API riêng.

## 4. SQL/file boundary và phục hồi

1. Giữ request application lock và serializable transaction bằng UoW hiện có;
   khóa hợp nhất ngựa cũ/mới/prepared/proposal trước SQL reads để tránh đặt chỗ trùng.
2. Append `review` PREPARED chứa before/after SQL projection, contract markers,
   receipt hash/actor/key và next full snapshots. Phần committed cũ vẫn đọc được.
3. Stage request/mappings/contract trong SQL và commit. SQL thất bại không công bố
   canonical mới hay Draft mới cho Customer; prepare còn lại cho retry/discard.
4. Một transaction giữ request lock tiếp theo đối chiếu SQL After, hoàn tất các
   file request/plan/contract rồi append COMPLETED receipt. GET cũng chạy reconciliation.
   Nếu một file đã append trước crash, so version và payload rồi tiếp tục file còn thiếu.
5. Retry cùng actor/key/body không lặp effect; khác body trả conflict. Nếu SQL vẫn Before,
   đúng retry kiểm lại schedule/hồ sơ trước Apply; Manager có thể discard với audit reason.
   Khi SQL đã After, chỉ finalize, không cho discard hoặc ghi đè SQL nghiệp vụ đã commit.

Metadata-only actions dùng private store làm nguồn authoritative, không tuyên bố có
distributed transaction với SQL. Ghi file cần private persistent storage/backup chung
với SQL như plan phase 1; mất/corrupt file hoặc projection bất nhất sẽ fail closed,
không tự tạo dữ liệu thay thế. Cần reconciliation có can thiệp nếu SQL bị sửa ngoài flow.

Canonical `RequestSnapshot` giữ nguyên shape đầy đủ và **InputHash submit ban đầu**:
retry submit cũ sau khi Customer sửa không tạo request khác. Request version và plan
file version riêng; plan file tăng đơn điệu sau invalidation. Draft đóng băng đúng
request version + plan version, snapshot cũ không bị sửa. Không có secret/OTP/PDF ở metadata mới.
Customer detail lấy canonical, SQL status, review và public Draft trong cùng request lock,
không ghép snapshot mới với review cũ khi có revision đồng thời.

Đây là recovery cho review/plan/Draft; **chưa thay thế** receipt/reconciliation cần cho
send/PDF/sign/Invoice/payment/Trip ở phase 4–5.

## 5. Kiểm chứng

### Backend

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

**145 pass = Flow1 98 + Registration 47; 0 fail/skip** trên bản code cuối phase 3.
9 test mới dùng SQL Server thật, mỗi fixture DB `RaceHorseFlow1Test_<GUID>` riêng:

- Selling total/cọc 40%, dưới sàn cần lý do, GET/PUT Draft thật, replacement/supersede,
  no Trip/Invoice, replan invalidation và preparation không giảm trong request version.
- Hỏi/đáp không sửa canonical, resubmit/revisions full snapshot, original submit retry.
- Pending proposal chặn Draft; approval invalidates plan/Draft; request cần reaccept.
- Role 401/403, owner 404, private file scope; accept/reject đồng thời chỉ một effect.
- Lỗi sau PREPARED trước SQL; retry/discard và aborted key không thể tái sử dụng.
- SQL đã commit nhưng thiếu receipt/contract file; đọc/retry tự hoàn tất đúng một lần.
- Lỗi sau canonical file append trước completed receipt; phục hồi phần metadata còn lại.
- SQL CHECK fault rollback Draft insert; Customer không thấy Draft chưa commit;
  discard và tạo lại; sent/signed guard đóng băng cancel/plan.
- Ngựa mới bị request khác đặt trước lúc duyệt change: revalidate và từ chối, canonical giữ nguyên.
- Hồ sơ ngựa proposal chỉ đọc được trong scope pending change; trước proposal/sau reject nhận 404 nếu không thuộc canonical.
- AIR gateway/scope 7 ngày, không bịa road distance; có UTC planned departure timestamp.

### Frontend

Tại `frontend`: `npm run test:run` **11 pass**; `npm run build` **PASS**;
`npx eslint src/features/flow1 src/app/router/AppRouter.tsx` **PASS**.
Lint chỉ xác nhận các surface đã đổi, không tuyên bố toàn repository lint sạch.

### Chrome nối API/SQL/private files

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAP_PROVIDER = 'GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS = '0'
$env:FLOW1_BROWSER_PHASE3 = '1'
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

Lượt kiểm chứng đã PASS tại private ignored evidence folder:
`backend/WebApi/App_Data/flow1/browser-2ac1ab0eb06f4fa5b07ff1961daec1c7/`.
Lượt sau khi harness reference WebApi để build/copy API mới cũng **PASS** tại:
`backend/WebApi/App_Data/flow1/browser-c61fe2defc074fe489b776a19b265697/`.
Sau bổ sung review hồ sơ proposal: **PASS** tại
`backend/WebApi/App_Data/flow1/browser-ef01ebfbee7a4e39816a7d3960050a78/`.
Lượt cuối trên API có Customer detail đọc đồng bộ cùng request lock: **PASS** tại
`backend/WebApi/App_Data/flow1/browser-49822f86fd194323b830f04549eec78f/`.
Kết quả: 2 search, 16 reverse, 8 route, 2 map preview fixture; 0 Mapbox data calls,
0 browser direct provider request và 0 page errors. Đã xem lại cả ba ảnh Manager
plan/Draft, Customer Draft và Customer Draft hiện hành sau duyệt proposal.

Browser thực sự upload multipart, tạo request, hỏi/đáp, request revision, sửa bằng Wizard
với chính ngựa đang đặt lịch, resubmit, accept, save plan, tạo Draft 115 triệu/cọc 46 triệu,
kiểm Customer DTO không lộ nội bộ; proposal giữ canonical cũ, Manager approve khiến Draft
cũ superseded và plan invalid; reaccept/replan/Draft mới tồn tại sau reload.
Hậu kiểm SQL có 2 Contract (1 DRAFT, 1 SUPERSEDED), **0 Trip/Invoice**; 0 page errors.

**Maps trong lượt phase 3 này là HTTP fixtures có nhãn**, không gọi live provider;
live Geoapify/Mapbox đã kiểm riêng trong phase 2. Auth dùng JWT fixture cho users hư cấu
trong DB test, không kiểm lại quy trình đăng nhập production. Harness giữ nguyên owner
rate limit, chờ cửa sổ kế tiếp giữa Customer wizard và review; process/DB test cleanup
trong finally. Screenshot Manager plan/Draft và Customer selling-only summary đã xem.
Hai lượt browser ban đầu lỗi selector do nhiều heading hoặc lịch sử đề xuất trùng text;
đã scope selector vào đúng status/canonical field và chạy lại đạt; không giảm acceptance.

## 6. Bàn giao phase 4 và các giới hạn

- Tiếp theo **phase 4 PDF bất biến/hash + OTP/send/sign/decline + CompletionDeadline/
  extension + crash recovery**. Mỗi lượt tối đa một phase, không bắt đầu payment sớm.
- Reader canonical phải tiếp tục dùng full `RequestSnapshot`; review/plan/Draft có type
  riêng. `contract` metadata hiện chứa `DraftSnapshot`: adapter phát hành PDF phải mở rộng
  tương thích, kiểm request/plan versions và current ContractID, không append event khác
  shape vào reader snapshot hiện tại.
- Trước send/sign phải giữ cùng request lock, xử lý Pending review/recovery, chặn pending
  change và revalidate schedule/plan. Không chỉ dựa vào nút FE ẩn.
- Template reference v1 chưa production-ready: sửa CompletionDeadline, nhãn chữ ký/OTP/
  microchip cố định, USD và tự hủy 24 giờ; render và QA từng trang. Chưa chuyển template
  này thành bản được phép ký trong phase 3.
- Cần thay trang contract mock cũ bằng use case PDF/OTP thật ở phase 4; phase 3 chỉ hiển
  thị Draft summary thật ngay trong request detail, chưa có nút ký/tải PDF giả.
- AIR ground legs, xe/nhân sự cụ thể và xác minh receiver proxy thuộc các bước sau;
  phase 3 không tự ghi receiver đã xác minh.
- Không gửi email/SMS, không test giao dịch tiền, không deploy, không push/PR, không áp
  migration lên `HorseTransportDB`. Các endpoint mới đã kiểm trên schema test tối thiểu
  phase 1; DB nghiệp vụ cần quy trình migration riêng được cho phép trước khi vận hành.
- Local Maps config và staged `frontend/vite.config.ts` của đại ca được giữ nguyên và
  không đưa vào commit phase 3. Runtime/log/private metadata/screenshots không đưa Git.
- Lịch hai tiếng tiếp tục ACTIVE cho phase 4–6; chưa đủ điều kiện dừng hoặc tuyên bố
  full Flow 1 E2E/UAT hoàn tất.
