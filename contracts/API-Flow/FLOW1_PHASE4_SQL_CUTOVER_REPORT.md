# Flow 1 — S2 chuyển use case sang SQL

Ngày **16/10/2026, Asia/Ho_Chi_Minh**, branch `Truong`.
Commit trước lượt: **`42e32dc465a5bd28cf7a956f3cee72bf7a2a7308` (S1).
Yêu cầu trực tiếp: **“Chuyển đi. Ko cần đợi 2 tiếng nữa.”**

**Cập nhật kế tiếp:** [S3](FLOW1_PHASE4_SQL_IMPORT_REPORT.md) đã có offline importer,
SQL receipts/parity, gỡ file provider/interface/options và regression Chrome sau
import. Các mục “S3 còn lại” dưới đây ghi trạng thái tại commit S2.

**S2 hoàn thành trong source và local/test.** Customer/review/publication/OTP/sign
dùng SQL state; state + status + receipt/invoice commit chung. Giữ đủ hỏi/đáp/
revision/change/plan/budget/quote/Draft và quyền/version/hash guards.
**S3 import/parity/cleanup còn lại; DB nghiệp vụ chưa áp migration/import.**

## File/layer thay đổi

Các đường dẫn dưới đây tính từ repo root.

| File | Layer / mục đích |
|---|---|
| backend/Domain/Interfaces/IFlow1UnitOfWork.cs | Domain port: FlushAsync persist owner mới trong transaction đang mở, không commit |
| backend/Infrastructure/Transactions/Flow1UnitOfWork.cs | Infrastructure: flush trên cùng EF context/connection/transaction; từ chối ngoài transaction |
| backend/Infrastructure/Storage/SqlFlow1StateStore.cs | SQL adapter: lỗi schema rõ; presence-only guard legacy JSON, không parse/fallback/dual-write; chặn latest PREPARED chưa reconcile |
| backend/Infrastructure/Storage/Flow1PrivateStoragePath.cs | Infrastructure: validate private root ngoài public web root; giữ đường dẫn private-bytes |
| backend/Application/Services/Flow1/Flow1RequestTransaction.cs | Application: discovery ngoài transaction; khóa horse trước SQL reads; reread dưới request lock, từ chối resource mới xuất hiện |
| backend/Application/Services/Flow1/CustomerTransportService.cs | Application: horse/request owner + state commit chung; documents/selectable/history/list/detail đọc SQL; bỏ file prepare của submit |
| backend/Application/Services/Flow1/RequestReviewService.cs | Application: canonical/review/plan/Draft/superseded contracts/receipt commit chung; bỏ PendingReview/EnsureFile/Finish/discard/replay saga |
| backend/Application/Services/Flow1/ContractPublicationService.cs | Application: render private PDF trước; revalidate rồi COMMITTED manifest + deadline/status cùng commit; bỏ recover/discard |
| backend/Application/Services/Flow1/ContractAcceptanceService.cs | Application: USER budget theo UserID; consumed OTP + SIGNED/SignedAt + AWAITING_DEPOSIT + invoice + receipt commit chung; GET chỉ validate |
| backend/Application/DTOs/Flow1/RequestReviewDtos.cs | DTO: bỏ PendingReview/pending field; giữ full review/change và cost isolation |
| backend/Application/DTOs/Flow1/ContractPublicationDtos.cs, backend/Application/DTOs/Flow1/ContractAcceptanceDtos.cs | DTO: mặc định outcome COMMITTED cho writes mới; lịch sử ABORTED được giữ |
| backend/WebApi/Extensions/Flow1ServiceExtensions.cs | DI: scoped SQL provider/helper; không đăng ký IFlow1MetadataStore; không migration startup |
| backend/WebApi/Extensions/Flow1CustomerExtensions.cs | DI: private bytes dùng validator độc lập, không resolve file metadata provider |
| backend/WebApi/Controllers/Flow1/RequestReviewController.cs | Controller: bỏ discard-prepared, giữ review use cases |
| backend/WebApi/Controllers/Flow1/ContractPublicationController.cs, backend/WebApi/Controllers/Flow1/ContractAcceptanceController.cs | Controller: bỏ publication/acceptance recover/discard routes |
| frontend/src/features/flow1/ManagerPages.tsx, frontend/src/features/flow1/CustomerReviewPanel.tsx, frontend/src/features/flow1/reviewApi.ts | FE contract/UI: bỏ pending saga/recovery controls; giữ hỏi/đáp/revision/change/plan/quote/Draft |
| frontend/src/features/flow1/ContractPublicationPanel.tsx, frontend/src/features/flow1/publicationApi.ts | FE: stable-key publish và PDF preview/download; bỏ recover/discard |
| frontend/src/features/flow1/ContractAcceptancePanel.tsx, frontend/src/features/flow1/acceptanceApi.ts | FE: Customer consent/OTP/sign, Manager receipt/refresh; bỏ file saga recovery |
| frontend/src/features/flow1/api.ts, frontend/src/features/flow1/api.test.ts | FE: schema/import/reconcile errors hiện thông báo bảo trì, không lộ hướng dẫn migration vào product flow |
| frontend/src/features/flow1/ContractPublicationPanel.test.tsx, frontend/src/features/flow1/ContractAcceptancePanel.test.tsx, frontend/src/features/flow1/ReviewPages.test.tsx | FE tests: committed fixtures thay recovery fixtures; giữ retry/timezone/PDF consent/role |
| backend/tests/Flow1.Tests/CustomerTransportTests.cs, backend/tests/Flow1.Tests/RequestReviewTests.cs | API/SQL fixtures dùng SQL scoped; rollback canonical/status/version/Draft + retry/parallel |
| backend/tests/Flow1.Tests/ContractPublicationTests.cs, backend/tests/Flow1.Tests/ContractAcceptanceTests.cs | SQL manifest/sign/invoice/consumed-OTP rollback, exact replay, restart/parallel |
| backend/tests/Flow1.Tests/SqlStateFaults.cs | Test-only adapter/interceptor: throw sau actual state write hoặc SaveChanges, trước commit |
| backend/tests/Flow1.Tests/SqlCutoverTests.cs | Missing schema/legacy source/pending-state guards và new-owner flush rollback |
| backend/tests/Flow1.Tests/RequestTransactionTests.cs | Resource race/lock ordering; canonical + pending proposal + input horse resources |
| backend/tests/Flow1.Tests/SqlFoundationTests.cs, backend/tests/Flow1.Tests/SqlStateStoreTests.cs, backend/tests/Flow1.Tests/FoundationTests.cs | Default disposable DB áp 004; migration-specific baseline riêng; giữ custom public-root guard |
| backend/tools/Flow1BrowserHarness/Program.cs | Browser harness: 004 trên DB test mới, SQL state bốn owner tables, COMMITTED receipt/account budget và không metadata sidecars |

Không sửa legacy backend/DAO, sandbox hoặc business EF entities. Không thêm
schema ngoài 004 đã có từ S1; tám cột vào bốn bảng hiện hữu, **không thêm bảng**.
Transient projections trong review chỉ còn tính thay đổi trong RAM, không phải
persisted saga trước/sau. Không đưa private config/runtime/PDF/log/PNG vào Git.

## Transaction và giới hạn thực tế

- Tạo horse/request/Draft: stage owner → flush trong transaction → append SQL
  state → commit chung. Throw sau flush/append/save rollback cả owner và state.
- Review/canonical/plan/Draft/receipt cùng SQL transaction. Không còn JSON receipt
  phải finalize sau SQL commit. Same-key retry giữ kết quả, khác input bị chặn.
- PDF bytes bất biến/private được render trước transaction; rollback có thể để
  lại private file chưa được tham chiếu. Manifest không publish, Customer không
  tải được qua Contract chưa phát hành. Retry có thể render lại; chỉ bản commit
  được phát hành. Không tự xóa orphan trong S2.
- SMTP vẫn ngoài SQL transaction, giữ DELIVERING/DELIVERED/FAILED, TTL/cooldown/
  attempts/USER account budget và HMAC digests. Delivery crash fail closed; không
  lưu/log raw OTP. Không tuyên bố filesystem/SMTP/SQL chung một transaction.
- Thiếu 004 trả **503 FLOW1_SQL_SCHEMA_REQUIRED**. Còn typed legacy JSON trả
  **503 FLOW1_STATE_IMPORT_REQUIRED**, không đọc/fallback/ghi đè nguồn. Latest
  review.pending/publication PREPARED/acceptance PREPARED trả
  **409 FLOW1_STATE_RECONCILIATION_REQUIRED** trước khi dùng. Không xóa nguồn để vượt guard.
- Các response recoveryRequired còn false cho tương thích; không còn routes/UI
  phục hồi split-storage. Legacy ABORTED được giữ, không đoán success.

## Kiểm thử

Lệnh backend chạy từ repo root (LibreOffice executable Windows .com):

~~~powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE=(Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
~~~

Kết quả cuối: **185 backend tests pass = 138 Flow1 + 47 Registration, 0 fail/skip**,
real LibreOffice regression bật. Frontend **22 tests pass**, TypeScript/Vite
build **PASS**, eslint các file FE thay đổi **PASS**:

~~~powershell
# workdir frontend
npm run test:run
npm run build
npx eslint src/features/flow1/ContractPublicationPanel.tsx src/features/flow1/ContractPublicationPanel.test.tsx src/features/flow1/ContractAcceptancePanel.tsx src/features/flow1/ContractAcceptancePanel.test.tsx src/features/flow1/ManagerPages.tsx src/features/flow1/CustomerReviewPanel.tsx src/features/flow1/ReviewPages.test.tsx src/features/flow1/reviewApi.ts src/features/flow1/publicationApi.ts src/features/flow1/acceptanceApi.ts src/features/flow1/api.ts src/features/flow1/api.test.ts
~~~

Focused API run trước đó đạt 33 pass/1 skip vì chưa bật LO; full run cuối thay
số liệu đó. SQL CHECK/injected errors sau actual state append hoặc SaveChanges
chứng minh rollback canonical/status/deadline/signature/invoice/consumed OTP.
Exact retry sau lỗi, kể cả host/context mới, tạo đúng một invoice. Sign song song,
wrong OTP persistent attempts, TTL/cooldown/account budget, stale/hash/owner/role,
PDF tamper, không leak giá nội bộ/raw OTP đều có coverage. Chưa commit mà OTP hết
hạn phải xin mã mới; receipt đã commit có thể replay sau deadline.

## Connected Chrome acceptance

~~~powershell
# SQL/LibreOffice env như trên; từ repo root
$env:FLOW1_BROWSER_MAP_PROVIDER='GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS='0'
$env:FLOW1_BROWSER_SIGNING='1'
dotnet run --project backend/tools/Flow1BrowserHarness -- '<absolute-node.exe>' '<absolute-playwright-module-directory>'
~~~

**PASS** Chromium → FE → API → SQL/private bytes, real LibreOffice và SMTP sink
chỉ loopback/RAM. Maps là **LOCAL GEOAPIFY DATA + MAPBOX MAP HTTP FIXTURES, NOT LIVE**,
capacity=1. Không gửi mail tới người thật, không giao dịch thanh toán.

Evidence local ignored:
backend/WebApi/App_Data/flow1/browser-4b4a550eeb294588bd0bada1ed4d1ed1/.
Đã xem customer-confirmed-contract.png và manager-confirmed-contract.png.
browser-result.json, acceptance-result.json và browser.log lưu kết quả kiểm chứng.

Luồng gồm horse/upload, wizard/submit/reload/list/documents; Manager hỏi/Customer
trả lời, revision/resubmit, accept/plan/quote/Draft; pending proposal giữ canonical
và chặn Draft; approve supersede Draft cũ, replan/newDraft; PDF phát hành/tải đúng
hash; OTP sai bị chặn, mã đúng ký, reload giữ receipt. SQL xác minh **SIGNED /
AWAITING_DEPOSIT / đúng một invoice UNPAID 40.000.000 VND (40% của 100.000.000) /
không Trip**; đủ SQL state trên HORSE/REQUEST/CONTRACT/USER; acceptance COMMITTED,
USER account budget và không tạo typed metadata sidecar directories mới.
PDF trước/sau ký cùng SHA-256:
3d4c6211662d128ca499a5ad36a43757e6b3881c3972319f38d4a491ac552dd0.
Không page errors; không credential/raw OTP trong browser/test evidence.
Harness tạo/drop DB GUID được kiểm soát, không dùng HorseTransportDB.
Đây là connected acceptance của use cases hiện có, **không phải full Flow 1 E2E/UAT**.

## Còn lại và bàn giao

1. **S3:** tool inventory/dry-run/import/parity, giữ history/actors/times/keys/hashes/
   OTP counters; map synthetic otp-account owner cũ, xử lý PREPARED, interruption/
   rollback/retry import. Không coi 004 tự chuyển dữ liệu.
2. Sau parity gỡ LocalFlow1MetadataStore/IFlow1MetadataStore và tests cũ có
   replacement; tách private storage options khỏi legacy MetadataRoot. S2 đã gỡ
   runtime consumers/DI/saga, chưa xóa provider/interface nguồn.
3. **DB nghiệp vụ chưa áp 004/import**. Runtime trên DB chưa chuẩn bị sẽ trả lỗi
   maintenance rõ. S3 phải có kết quả/tool có thể review trước khi xin quyền apply
   vào business DB; scheduler không tự thực hiện.
4. Sau S3 tiếp tục phase 4 decline/explicit expire/reissue/effective-deadline
   extension/thay legacy Contract FE, rồi phase 5 payment/activation và phase 6
   operational handoff. Chưa nghiệm thu live SMTP/VNPay public IPN/runtime deploy.
5. Lịch hai tiếng giữ ACTIVE, ưu tiên S3 qua plan/reports/git hiện hành; không hỏi
   lại kiến trúc, không mở rộng file saga hoặc lặp commit rỗng khi điều kiện không đổi.

Giữ nguyên private backend/WebApi/appsettings.Local.json và staged
frontend/vite.config.ts ngoài scope. Chỉ commit local path S2; không push/deploy/PR
hoặc apply migration/import DB nghiệp vụ.
