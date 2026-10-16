# Flow 1 — Phase 4 increment D: effective deadline và Contract FE

Ngày 16/10/2026, Asia/Ho_Chi_Minh, branch `Truong`.
Commit trước lượt: `1140e6b7a93a9e8140c0595ccac3adb7b82a6d89` (increment C).

## Phạm vi

Gia hạn deadline ký/cọc qua SQL, lịch sử bất biến, guards dùng cùng hạn hiệu lực;
thay trang Contract dùng fixture/local signing bằng dữ liệu API thật. Không thêm
bảng, cột hoặc migration; document `extensions` dùng state columns CONTRACT của
004. Không migrate/import `HorseTransportDB`, không push/deploy/PR hoặc gửi email
người thật. Private local config và staged `frontend/vite.config.ts` được giữ nguyên.

## Hành vi

- Hạn gốc `CONTRACT.CompletionDeadline`, publication manifest và PDF giữ nguyên.
  Hạn hiệu lực lấy từ extension chain hợp lệ mới nhất hoặc hạn gốc. Mỗi lần gia hạn
  lưu previous/new/original deadline, exact Contract/version/PDF hash, reason,
  actor, server time và idempotency input hash trong SQL.
- Khi reissue, xóa feedback hiện hành "đang chờ quản lý xử lý" của bản vừa đóng;
  giữ nguyên lifecycle/history/notices. Trang hợp đồng mới không hiển thị phản hồi
  chờ xử lý như một trạng thái hiện hành sau khi đã tạo/ký bản thay thế.
- Chỉ Manager được gia hạn current `PENDING_SIGNATURE/AWAITING_CONTRACT` hoặc
  `SIGNED/AWAITING_DEPOSIT`, chưa Trip/activation, không pending change, chưa đủ
  cọc. Invoice UNPAID/PARTIALLY_PAID có số tiền hợp lệ được giữ nguyên tiền/status.
- Hạn mới phải lớn hơn hạn hiệu lực cũ và serverNow, đồng thời không vượt
  `frozen plannedDepartureAt - preparationDays*24h`. Mốc chuẩn bị lấy từ plan đã
  chốt, không nhận override từ command gia hạn.
- Quá hạn nhưng chưa đóng phiên bản vẫn có thể được gia hạn hợp lệ. `EXPIRED`
  hoặc `SIGN_DECLINED` không được hồi sinh; dùng reissue của increment C. Thời gian
  trôi qua không tự hủy request hoặc giải phóng lịch ngựa.
- Gia hạn trước ký thu hồi OTP chưa dùng, giữ attempts/TTL/cooldown/account budget;
  khách phải yêu cầu mã mới. Challenge mới gắn thêm deadline version. Callback
  SMTP đang chạy không thể xóa revocation. Code digest version 0 giữ format cũ
  để không làm hỏng challenge legacy; từ extension version >0 bind thêm version.
- Gia hạn sau ký giữ nguyên SignedAt, consumed challenge, receipt, số tiền và PDF;
  chỉ cập nhật Invoice.DueDate với extension receipt trong cùng SQL transaction.
  Không sửa biên nhận ký để làm nó giống deadline mới.
- Receipt mới ghi `DeadlineVersion` tại thời điểm ký. `InvoiceDueAtUtc` trong
  receipt được kiểm với deadline ở version đó, còn SQL Invoice.DueDate được kiểm
  với effective deadline hiện tại. Receipt cũ mặc định version 0/hạn gốc. Ký lại
  cùng idempotency key sau gia hạn trả receipt cũ và invoice hiện tại, không tạo
  invoice thứ hai. SQL datetime due được chuẩn hóa tới giây như acceptance cũ.
- PDF/publication API, OTP TTL, sign, overdue, Customer decline và Manager expire
  đều dùng `ContractDeadlinePolicy` trong request transaction. History sai binding,
  không liên tục hoặc vi phạm frozen preparation interval bị chặn rõ.

Retry cùng key/actor/input không thêm revision. Khác input cùng key, stale extension
version hoặc sai PDF bị chặn. Ký-vs-gia hạn: ký trước thì gia hạn cập nhật invoice;
gia hạn trước thì OTP cũ bị thu hồi. Expire-vs-gia hạn có đúng một kết quả hợp lệ.
Các writes dùng request/horse locks và UoW hiện hữu, state/Invoice rollback cùng nhau.
Không tuyên bố SMTP hoặc filesystem nằm trong SQL transaction.

## API và giao diện

| API thực tế | Quyền / payload |
|---|---|
| GET `/api/customer/contracts/{id}/deadlines` | Customer owner; original/effective/version/history, không Manager reason/actor |
| GET `/api/manager/contracts/{id}/deadlines` | Logistics Manager; đầy đủ reason/actor và CanExtend |
| POST `/api/manager/contracts/{id}/extensions` | Logistics Manager; `Idempotency-Key`; `{ contractVersion, documentHash, expectedExtensionVersion, newDeadline, reason }` |

Đây là endpoint contract-scoped đã implement, thay ví dụ request-scoped
`/requests/{id}/deposit-extensions` trong bản thiết kế cũ. Publication và acceptance
DTO bổ sung `effectiveCompletionDeadline`, `deadlineVersion`; publication vẫn trả
`originalCompletionDeadline`. Version extension không thay document/review version.

FE hiển thị hạn gốc, hạn hiệu lực, lịch sử và refresh; giờ nhập Manager là UTC+7,
timestamp gửi API là UTC. Form gia hạn chỉ hiện khi server cho phép; history read-only
không có form. Thay deadline version reset consent/challenge UI, không dùng mã cũ.
Sau API commit nhưng refresh lỗi, form đã xóa và refresh có thể retry bằng GET.

Route hiện có `/customer/requests/:requestId/contract` giữ URL, load owned request
qua API rồi dùng CustomerReviewPanel với publication/PDF/OTP/lifecycle/deadline/history
thật. Không còn Contract CT-8931/650 USD/cọc 30% hoặc nút local signing đổi status.
Request detail có link tới trang này. Generic payment route cũ thuộc phần cần thay
ở phase 5; chưa cung cấp nút thanh toán giả tại Contract page mới.

## File/layer

Đường dẫn dưới đây tương đối với `D:\Racehorse-Transport-System`.

| Layer | File | Vai trò |
|---|---|---|
| Application DTO | `backend/Application/DTOs/Flow1/ContractDeadlineDtos.cs` | Typed extension command/receipt/view |
| Application DTO | `ContractPublicationDtos.cs`, `ContractAcceptanceDtos.cs` cùng thư mục | Effective deadline/version, frozen acceptance deadline version, challenge version |
| Application policy | `backend/Application/Services/Flow1/ContractDeadlinePolicy.cs` | Resolve/validate chain, AtVersion, normalize SQL due |
| Application service | `ContractDeadlineService.cs` cùng thư mục | Ownership/status/feasibility/retry, SQL transaction + invoice/OTP writes |
| Application consumers | `ContractPublicationService.cs`, `ContractAcceptanceService.cs`, `ContractLifecycleService.cs` cùng thư mục | Dùng cùng effective deadline và validate receipt/invoice |
| Application review | `RequestReviewService.cs` cùng thư mục | Clear pending-close feedback khi reissue, giữ audit notices |
| WebApi | `backend/WebApi/Controllers/Flow1/ContractDeadlineController.cs`, `Extensions/Flow1CustomerExtensions.cs` | Role-scoped API, no-store, rate limit, DI |
| Frontend API | `frontend/src/features/flow1/deadlineApi.ts`, `publicationApi.ts`, `acceptanceApi.ts` | Typed deadline contract và view fields |
| Frontend UI | `ContractDeadlinePanel.tsx`, `ContractPublicationPanel.tsx`, `ContractAcceptancePanel.tsx`, `ContractLifecyclePanel.tsx`, `CustomerContractPage.tsx`, `CustomerPages.tsx` cùng thư mục | Gia hạn/refresh/history, reset OTP UI, real Contract page và navigation |
| Legacy entry | `frontend/src/features/user-dashboard/page/transport-request-page/contract/ContractPage.tsx` | Re-export trang API thật; bỏ fixture/local status mutation |
| SQL/API tests | `backend/tests/Flow1.Tests/ContractDeadlineTests.cs` | 12 test cases gồm real SQL guards/race/fault/retry/tamper |
| SQL/API regression | `backend/tests/Flow1.Tests/ContractLifecycleTests.cs` | Reissue không giữ pending feedback làm phản hồi hiện hành |
| FE tests | `frontend/src/features/flow1/ContractDeadlinePanel.test.tsx`, `CustomerContractPage.test.tsx`, `ContractPublicationPanel.test.tsx` | Role/history/time conversion/stable key/refresh error, route thật, isolated mocks |
| Browser tooling | `backend/tools/Flow1BrowserHarness/Program.cs`, `backend/tools/flow1-browser.cjs` | Native SQL deadlines mode, Contract route, trước/sau ký, SQL invariants |

Không sửa Domain/entity/DAO legacy, không thêm infrastructure store. SQL adapter
đã có mapping extensions từ foundation. State owner columns vẫn không map EF nên
ADO state writes không bị EF update entity ghi đè.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'` | **214 pass** = 167 Flow1 + 47 Registration, 0 fail/skip; SQL Express thật và converter LibreOffice thật |
| `npm run test:run -- --maxWorkers=1` tại frontend | **35 pass**, 9 files; giữ timeout/assertions hiện hữu |
| `npm run build` tại frontend | TypeScript/Vite pass |
| `npx eslint` 13 FE files đã đổi/thêm | Pass; không tuyên bố full-repo lint |
| Node `--check backend/tools/flow1-browser.cjs` | Pass |
| Chromium native SQL lifecycle + deadlines mode | **PASS**, real LibreOffice + loopback SMTP, không page errors; biên nhận hiển thị cả Customer và Manager sau gia hạn lần hai |

Backend chạy với `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS` và
`RACEHORSE_TEST_LIBREOFFICE` trỏ runtime `soffice.com` riêng. 12 test SQL/API mới
kiểm ownership/role/version/hash/reason, exact preparation boundary, gia hạn sau
hạn gốc, sign dùng deadline version mới, revoked OTP/counters/cooldown/account
budget, partial money giữ nguyên, signed receipt immutable, duplicate/race keys,
expire-vs-extension và sign-vs-extension, closed/paid/activated guards, malformed
chain và invoice due mismatch. Inject lỗi sau ADO state cho unsigned extension;
signed extension còn có EF after-save và SQL CHECK lỗi ở Invoice.DueDate, chứng
minh rollback chung invoice/state và exact retry. C regression kiểm feedback sau
reissue. Các DB đều disposable GUID, không dùng DB nghiệp vụ.

Lượt frontend chạy đồng thời với backend build ban đầu bị timeout/typing spillover;
chạy riêng với một worker cho kết quả 35/35. Không sửa global timeout hoặc bỏ
assertion để làm pass. Browser giữ nguyên limiter 30 request/phút; automation có
cửa sổ chờ 60 giây giữa các nhóm thao tác, kể cả trước gia hạn sau ký. Không nâng
rate limit/đổi đồng hồ hoặc ghi SQL để giả deadline live.

Browser flags ngoài cấu hình SQL/LibreOffice:

~~~powershell
$env:FLOW1_BROWSER_MAP_PROVIDER='GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS='0'
$env:FLOW1_BROWSER_SIGNING='1'
$env:FLOW1_BROWSER_IMPORT='0'
$env:FLOW1_BROWSER_LIFECYCLE='1'
$env:FLOW1_BROWSER_DEADLINES='1'
dotnet run --project backend/tools/Flow1BrowserHarness -- '<absolute node.exe>' '<absolute playwright module>'
~~~

Lượt cuối đi qua horse/upload/estimate/submit, Manager info/revision/change/plan/
quote/Draft, decline/reissue/history PDF, rồi gia hạn trước ký → Contract route
API → sai OTP bị chặn → ký đúng → gia hạn sau ký → Customer refresh. SQL invariants:
3 Contract (SUPERSEDED, SIGN_DECLINED, SIGNED), một invoice UNPAID 40.000.000 VND,
0 Trip; acceptance deadline version 1, extension version 2, SQL invoice due theo
extension thứ hai, original CompletionDeadline giữ nguyên. Không có page error;
không có raw OTP hoặc provider credential trong evidence được scanner kiểm.

Evidence ignored:
`backend/WebApi/App_Data/flow1/browser-15edbb8433e34fe981f61a7e4e1d9dec/`.
`browser-result.json`, `deadline-result.json`, `acceptance-result.json` và
`browser.log` ghi kết quả. Đã xem ảnh Customer cuối: receipt và hai lần gia hạn
hiển thị, phản hồi chờ xử lý cũ chỉ còn trong lịch sử. Các ảnh Manager ở lượt cuối
được browser kiểm receipt visible; ảnh Manager lượt trước cũng đã xem trực tiếp.
PDF replacement tải sau ký khớp publication/receipt và không đổi bởi gia hạn:
`dd0cf5c6c2b8581cd4f02f4b5c613c315b1992d51014e3549a1767914e752ef8`.
Hạn gốc `2026-10-31T10:00:00Z`; ký ở deadline version 1 (`2026-11-01T10:00:00Z`);
invoice due/effective version 2 (`2026-11-02T10:00:00Z`). Đây là dữ liệu demo/test.

Browser Maps dùng HTTP fixtures rõ nhãn, SMTP chỉ loopback/RAM, không gửi email
người thật. Lượt đầu timeout ở Manager reload; bản harness cuối ghi status lỗi
rõ, giữ native limiter và bắt đầu bước sau ký trong cửa sổ mới. Không dùng kết quả
lượt lỗi để nghiệm thu. Không đưa PDFs/screenshots/runtime/generated artifacts vào
Git. Đây là connected coverage cho các use case hiện có, không phải full Flow 1 UAT.

## Bàn giao

Increment D đã qua các kiểm tra trên. Phase 4 A/B/C/D và SQL
S1–S3 có source/use cases trong local/test; chưa phải full Flow 1 UAT hoặc chứng
cứ cutover DB nghiệp vụ, live SMTP/provider hay production deployment.

Tiếp theo **phase 5**: bank proof/verified ledger trước, VNPay sandbox adapter/IPN
vào cùng ledger, partial/excess/late/cancel review và exactly-once activation/Trip;
thay payment FE legacy. Payment/proof mới phải lấy `Resolved.Effective` từ
`ContractDeadlinePolicy.ReadAsync` dưới request transaction, không dùng hạn gốc hoặc receipt due cũ để mở cửa thanh
toán. Provider callback muộn vẫn cần ghi nhận/đối soát tiền thật, không giả activation
từ ReturnURL hay hủy request chỉ do deadline. Receipt ký không bị sửa khi thu tiền.

Sau phase 5 mới phase 6 readiness/hold/resume/operational handoff, connected UAT.
DB nghiệp vụ chưa được apply 004/import; scheduler chỉ làm source/test và commit
local. Tool/operator guide đã có S3, apply trên target nghiệp vụ cần quyền riêng.
Không coi SMTP loopback hoặc provider fixtures là live verification.
