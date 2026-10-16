# Flow 1 — Phase 4 increment C: decline, explicit expire, reissue

Ngày 16/10/2026, branch `Truong`. Commit trước lượt:
`2a6f758d0dd66b3d1861e4e12665dbbdeaf0eb9b` (S3 import/parity/cleanup).

## Phạm vi và trạng thái

Customer từ chối bản đã phát hành chưa ký; Manager chủ động đánh dấu bản chưa ký
hết hạn sau deadline và tạo Draft mới để phát hành lại. Giao diện Customer/Manager
trên request thật có thao tác tương ứng và lịch sử PDF. Đây là increment C;
**phase 4 vẫn IN_PROGRESS**, chưa implement effective-deadline extension hoặc
thay các route Contract legacy riêng. Chưa bắt đầu payment/activation hoặc
operational deployment/handoff của phase 5–6.

Không thêm bảng/cột/migration. Typed document `lifecycle` dùng state columns
CONTRACT đã có từ 004. Không chạy migration/import trên `HorseTransportDB` hoặc
DB nghiệp vụ. Không push/deploy/PR, không ghi đè local config/Vite index của đại ca.

## Hành vi và transaction

| Thao tác | Điều kiện | Kết quả |
|---|---|---|
| Customer decline | Owner, current issued PDF, đúng version/hash, chưa ký/cọc/Trip, trước deadline | Contract `SIGN_DECLINED`, Request `ACCEPTED`, reason/audit, OTP revoked |
| Manager expire | Logistics Manager, cùng guards, tại/sau deadline | Contract `EXPIRED`, Request `ACCEPTED`, reason/audit, OTP revoked |
| Manager reissue | Current Contract `SIGN_DECLINED`/`EXPIRED`, closing receipt gắn đúng PDF, reason, expected review version, current plan hợp lệ | ContractID mới `DRAFT`, giữ nguyên Contract/PDF cũ; lifecycle link tới Draft mới |

Chỉ thời gian trôi qua không đổi SQL status, không hủy request hoặc giải phóng
lịch ngựa. Sau khi đóng phiên bản, quản lý/khách có thể tiếp tục review/change hoặc
hủy request bằng use case có sẵn và quyền tương ứng. Nếu lịch không còn đủ thời
gian chuẩn bị, phải điều chỉnh yêu cầu/kế hoạch trước khi tạo Draft mới. Reissue
không tự publish; API send kiểm deadline tương lai và preparation như bình thường.

Close gộp Contract status, Request status, review receipt/notice, OTP revocation
và lifecycle receipt trong một request transaction SQL. Reissue gộp new owner row,
Draft snapshot, review pointer/receipt và lifecycle replacement link cùng transaction.
Idempotency key + actor/action/input hash cho exact retry; stale version hoặc key
khác input bị chặn. Ký và decline cạnh tranh dưới cùng request lock: chỉ một kết quả
hợp lệ; bản từ chối không có invoice. Exact close replay vẫn đọc được sau reissue.

`Revoked` giữ nguyên consumed/attempts/delivery và account send budget, không reset
hạn mức. SMTP đang gửi có thể hoàn tất ở ngoài SQL, nhưng callback không được xóa
revocation hoặc làm mã đó ký được. Không lưu/log OTP thô. Customer DTO không chứa
Manager expire/reissue reason, actor nội bộ, floor/cost/override reason.

PDF cũ vẫn private, có kiểm quyền và hash, tải lại được bằng ID cũ. Draft mới có
snapshot/ContractID riêng; document version thuộc từng ContractID. FE không dùng
preview/hash của bản cũ làm bằng chứng đã xem bản mới, kể cả khi chuyển sang Draft
chưa phát hành. Lịch sử chỉ lazy-load PDF đã phát hành; màn hình history không có
close/publish controls. Không render/sửa lại bytes PDF cũ.

## File/layer và hợp đồng API

Các đường dẫn dưới đây tương đối với `D:\Racehorse-Transport-System`.

| Layer | File | Mục đích |
|---|---|---|
| Application DTO | `backend/Application/DTOs/Flow1/ContractLifecycleDtos.cs` | Command/receipt/history/customer-safe view |
| Application DTO | `ContractAcceptanceDtos.cs`, `RequestReviewDtos.cs` cùng thư mục | Revoked flag và history của các ContractID trước |
| Application service | `backend/Application/Services/Flow1/ContractLifecycleService.cs` | Close guards, owner check, transaction, replay, role-safe history |
| Application service | `RequestReviewService.cs`, `ContractAcceptanceService.cs` cùng thư mục | New Draft reissue/link, history, revoke delivery/sign guards |
| Infrastructure | `backend/Infrastructure/Storage/SqlFlow1StateStore.cs` | Map lifecycle vào CONTRACT owner, giữ nguyên SQL schema |
| WebApi | `backend/WebApi/Controllers/Flow1/ContractLifecycleController.cs`, `RequestReviewController.cs` | Customer/Manager authenticated lifecycle và reissue endpoints |
| WebApi DI | `backend/WebApi/Extensions/Flow1CustomerExtensions.cs` | Scoped lifecycle service |
| Frontend contract | `frontend/src/features/flow1/lifecycleApi.ts`, `reviewApi.ts` | Typed get/close/reissue/history payloads |
| Frontend UI | `ContractLifecyclePanel.tsx`, `ContractVersionsPanel.tsx`, `ContractPublicationPanel.tsx`, `CustomerReviewPanel.tsx`, `ManagerPages.tsx` cùng thư mục | Controls, history/private PDF, stable retry, clear stale publication |
| Tests | `backend/tests/Flow1.Tests/ContractLifecycleTests.cs`, `ContractPublicationTests.cs` | Real disposable SQL/API guards/race/rollback; renderer test double binds bytes to ContractID/version |
| Tests | `frontend/src/features/flow1/*Panel.test.tsx`, `ReviewPages.test.tsx` | Role/read-only/exact hash/stable retry/new Draft state |
| Browser tools | `backend/tools/Flow1BrowserHarness/Program.cs`, `backend/tools/flow1-browser.cjs` | Native SQL connected lifecycle mode, real LibreOffice, loopback SMTP, SQL invariants |

Không sửa Domain entities/schema hoặc legacy `backend/DAO`. Các writes đi qua
repositories/UoW hiện hữu; state adapter dùng chung connection/transaction.

Endpoints mới:

- GET `/api/customer/contracts/{id}/lifecycle` (owner).
- POST `/api/customer/contracts/{id}/decline` (owner).
- GET `/api/manager/contracts/{id}/lifecycle` (Logistics Manager).
- POST `/api/manager/contracts/{id}/expire` (Logistics Manager).
- POST `/api/manager/contracts/{id}/reissue` (Logistics Manager).

Close body: `{ contractVersion, documentHash, expectedLifecycleVersion, reason }`.
Reissue body: `{ expectedVersion, reason, lines }`, selling lines như Draft API;
backend tính tổng/cọc 40% VND và kiểm lý do dưới sàn. POST cần `Idempotency-Key`.
Lifecycle view có `status`, lifecycle `version`, `canDecline/canExpire/canReissue`
và history đã lọc theo quyền. Review/detail bổ sung `contractHistory`, không trả
raw SQL state hoặc private storage keys. Reissue trả ManagerReviewView mới.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'` với `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS` và `RACEHORSE_TEST_LIBREOFFICE` trỏ runtime `.com` | **202 pass** = 155 Flow1 + 47 Registration, 0 fail/skip; gồm converter thật |
| `npm run test:run` tại frontend | **29 pass**, 7 files |
| `npm run build` tại frontend | TypeScript/Vite pass |
| `npx eslint` danh sách 13 file FE đã đổi/thêm | Pass, không tuyên bố full-repo lint |
| Node `--check backend/tools/flow1-browser.cjs` | Pass |
| Native SQL Chromium lifecycle mode | **PASS**, real LibreOffice, loopback SMTP, không page error |

11 test SQL/API lifecycle mới kiểm owner/role/version/hash/reason, không auto-expire,
exact deadline boundary, booking giữ nguyên, duplicate close/reissue, lỗi SQL CHECK,
fault sau state/save, new owner row rollback, ký-vs-decline race, in-flight SMTP
không khôi phục OTP revoked, deadline mới và chỉ ký bản mới, Customer không thấy
internal reason/floor/cost. Test cũ tiếp tục kiểm migration/import/parity/auth và
publication/OTP/sign retry/rollback. Test DB đều là disposable GUID được kiểm soát.

Browser chạy từ repository root:

~~~powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE=(Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
$env:FLOW1_BROWSER_MAP_PROVIDER='GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS='0'
$env:FLOW1_BROWSER_SIGNING='1'
$env:FLOW1_BROWSER_IMPORT='0'
$env:FLOW1_BROWSER_LIFECYCLE='1'
dotnet run --project backend/tools/Flow1BrowserHarness -- '<absolute node.exe>' '<absolute playwright module>'
~~~

Lifecycle mode không được kết hợp legacy import mode: legacy importer xử lý dữ
liệu typed sidecar cũ, không giả định có lifecycle sidecar mới. Harness chặn sai
flags trước khi tạo DB. S3 import evidence giữ riêng trong báo cáo S3.

Chrome chạy luồng horse/upload/estimate/submit, question/answer/revision/change,
accept/plan/quote/Draft như trước rồi thêm decline → Request ACCEPTED → reissue
Draft ID mới → mở lại/tải PDF lịch sử → phát hành PDF mới → sai OTP bị chặn → đúng
OTP ký → reload. SQL xác nhận 3 Contract: một SUPERSEDED, một SIGN_DECLINED với
DECLINED/REISSUED receipt trỏ đúng replacement SIGNED; Request AWAITING_DEPOSIT;
đúng một invoice UNPAID 40.000.000 VND, 0 Trip. Không tạo metadata sidecar mới.

Evidence local ignored:
`backend/WebApi/App_Data/flow1/browser-85d9f360ec42485dbd4093da849ac28c/`.
`browser-result.json`, `lifecycle-result.json`, `acceptance-result.json` và
`browser.log` ghi kết quả. Đã xem ảnh Customer declined và historical PDF.
PDF cũ trước/sau reissue cùng SHA-256
`db0a82960632cca8489ba23f4b3d57a21e3d50dbddd7e431f9cf12d434b86f21`.
PDF replacement tải sau ký khớp publication và receipt:
`38f99bba0508501dda0a940f1dc96edd80ebe295b8470be9d8b9177090cdc523`.
Không đưa evidence/PDF/runtime/binary vào Git. Đây là connected coverage của
use cases hiện có và increment C, không phải full Flow 1 E2E/UAT.

## Giới hạn và bước tiếp theo

Expire sau deadline được kiểm bằng real SQL/API với TimeProvider test, không đổi
đồng hồ hệ điều hành. Maps browser dùng HTTP fixtures rõ nhãn; SMTP loopback RAM
không forward email. Không nghiệm thu live SMTP, VNPay/public IPN, business DB
cutover/import, production vận hành hoặc full Flow 1 E2E/UAT trong lượt này.

Tiếp theo phase 4 increment D: effective deadline/extension history trong SQL,
không sửa deadline gốc/PDF; nối guards ký và payment tương lai với effective
deadline, kiểm preparation/race/retry; thay generic Contract FE legacy. Sau khi
phase 4 đủ tiêu chí mới triển khai phase 5 payment ledger/activation và phase 6
deployment readiness/handoff. Lịch hai tiếng giữ ACTIVE, tiếp tục đúng phần còn lại.
