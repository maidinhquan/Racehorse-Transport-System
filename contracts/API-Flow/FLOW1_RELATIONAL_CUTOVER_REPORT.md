# Flow1 — typed relational source cutover và local acceptance

> Cập nhật18/10/2026: DB chính đã backup/restore-check, áp006, conversion/parity và bỏ8cột JSON theo phê duyệt trực tiếp. [Business cutover report](FLOW1_BUSINESS_CUTOVER_REPORT.md) thay trạng thái business-pending trong các mốc cũ bên dưới; chưa merge primary hoặc nghiệm thu VNPay công khai.

Ngày 18/10/2026, Asia/Ho_Chi_Minh. Branch `codex/flow1-relational-mvp`.
Baseline trước increment: `86e4dc7` (typed core), foundation `c060d06`.
Chỉ sửa worktree riêng; chưa merge/push primary, chưa migrate/import/drop DB nghiệp vụ.

## Kết quả source

Runtime Domain/Application/Infrastructure/WebApi và router FE đã chuyển cả chuỗi
sang typed006. Không có runtime JSON store, serialized workflow sidecar hoặc fallback
đọc từng field. Profile native mới là 000 → 003 → 006; không005/004.
006 vẫn 63 cột trên 5 bảng hiện hữu, không thêm bảng/FK hoặc đổi quan hệ.
Các report JSON/R0/005 trước đây là lịch sử, không phải chỉ thị triển khai hiện hành.

Giữ scope đã chốt: latest horse files; advisory estimate; A1 sửa/gửi lại; Manager
chốt giá Contract; immutable PDF v3 trước OTP; cọc40% VND; VNPay duy nhất; gia hạn
ký/cọc; latest cancellation; one Trip; confirm/hold/resume và current-event handoff.
Bỏ Q&A/change proposal/plan/budget/COST_ITEM quote rows, horse document timeline,
bank-proofs/manual allocation và detailed audit timeline.

## File/layer và trách nhiệm

| File | Layer / tác dụng |
| --- | --- |
| `backend/Application/DTOs/Flow1/RelationalDtos.cs` | DTO tường minh; token RowVersion; current decisions; currency/method và evidence flags cho hồ sơ cũ; không OTP hash |
| `backend/Application/Common/Flow1/Flow1Hash.cs` | Hash transient query, tách maps khỏi service JSON cũ |
| `backend/Application/Interfaces/Flow1/IFlow1GatewayQuery.cs` | Port querydr read-only, typed result; không refund |
| `backend/Application/Services/Flow1/Relational/RelationalFlow1Service.cs` | Latest horse, canonical request/A1, private file quyền; không diễn giải legacy thiếu dữ liệu thành workflow mới |
| `backend/Application/Services/Flow1/Relational/RelationalContracts.cs` | Direct quote, publication two-step/revalidation, OTP, sign/invoice, original/effective deadlines, decline/withdraw/expire |
| `backend/Application/Services/Flow1/Relational/RelationalPayments.cs` | Pending attempts, verified allocation/review, querydr, cancellation/overdue close, exactly-one activation |
| `backend/Application/Services/Flow1/Relational/RelationalDeployment.cs` | Confirm/hold/resume, revoke event/acks, current inbox/ack/private downloads |
| `backend/Infrastructure/Data/Context/Flow1RelationalContext.cs` | Separate EF model, existing FK mappings for insert order; SQL transaction/global Flow1 application lock; schema/source gates |
| `backend/Infrastructure/Data/Context/Flow1RelationalSchema.cs` | Check trusted25 CHECK fingerprints and critical indexes; fail closed on drift/005/missing006 |
| `backend/Infrastructure/Storage/Flow1RetainedSources.cs` | Inventory hash of retained files only; no parsing/serving payload fallback |
| `backend/Infrastructure/ExternalServices/Flow1/VnpayQueryGateway.cs` | Sandbox querydr signature/merchant/ref/transaction checks; no raw payload persistence/logger |
| `backend/Infrastructure/ExternalServices/Flow1/VnpaySandboxGateway.cs` | Frozen create time, typed codes/bank, provider-valid equivalent loopback address |
| `backend/Infrastructure/ExternalServices/Flow1/GeoapifyTransportMaps.cs` / `MapboxTransportMaps.cs` / `OsmTransportMaps.cs` | Same provider boundaries; stateless hash dependency |
| `backend/WebApi/Controllers/Flow1/Relational/Flow1Controllers.cs` | Customer/Manager/ops/IPN APIs, roles, private no-store downloads; literal review/lifecycle routes |
| `backend/WebApi/Controllers/AuthController.cs` | Remove unconditional common-password fallback discovered during connected login; BCrypt and exact stored-password compatibility remain; not a full authentication audit |
| `backend/WebApi/Controllers/Flow1/PublicEstimatesController.cs` | Pure guest estimate/search, independent of retired Customer controller |
| `backend/WebApi/Extensions/Flow1RelationalExtensions.cs` | Single typed DI/API generation; legacy feature provider only explicit regression host |
| `backend/WebApi/Extensions/Flow1CustomerExtensions.cs` | Pure provider/OTP/PDF/rate limiter registrations |
| `backend/WebApi/Program.cs` | Select typed source; Development-only ignored Sandbox bridge; env last; no startup migration |
| `backend/WebApi/WebApi.csproj` / `.gitignore` | Do not ship/commit the new local secret bridge; retain App_Data exclusion |
| `backend/WebApi/Resources/Contracts/v3/template-patch.json` | Separate sign/deposit terms, final quote, VNPay-only wording; no invented signature/OTP/handover |
| `frontend/src/features/flow1/relational/api.ts` / `Pages.tsx` | Typed horse/request/review/Contract/VNPay/return/current handoff use cases; legacy data cannot become a fabricated OTP receipt |
| `frontend/src/features/flow1/TripFields.tsx` | Controlled departure and selected horse count in typed wizard; historical/guest defaults retained |
| `backend/Application/Services/Flow1/TransportEstimateService.cs` | Expose configured provider attribution for current request view, no persisted provider history |
| `frontend/src/features/flow1/PublicEstimatePage.tsx` | Active guest screen extracted from historical UI module |
| `frontend/src/features/flow1/CustomerPages.tsx` | Historical regression components; re-export guest screen for existing tests, not routed |
| `frontend/src/app/router/AppRouter.tsx` | All active Flow1 paths use typed screens; old fabricated payment success/cancel screens redirect |
| `frontend/vite.config.ts` | Default `/api` to active WebApi5129; override `API_PROXY_TARGET` for another local port |
| `backend/tools/Flow1RelationalHarness/Program.cs` / `.csproj` | Native SQL/real API/Chrome harness; only guarded disposable DB creation/drop |
| `backend/tools/flow1-relational-browser.cjs` | Connected ROAD/AIR fixture acceptance, RAM SMTP, real PDF, signed local IPN; real rate limiter retained and traffic paced |
| `backend/tools/Flow1RelationalConvert/Program.cs` / `RelationalConverter.cs` / `ShadowInventory.cs` / `.csproj` | Read-only inventory/shadow preview; exact-target offline fingerprint apply; atomic typed conversion/parity/optional guarded004 removal |
| `backend/tools/Configure-Flow1Sandbox.ps1` | Dry-run default; bridge existing legacy merchant/map settings to ignored isolated Development file, never SQL/provider requests |
| `backend/tools/Flow1LegacySupport/OfflineStateReader.cs` / `LegacyFlow1TestExtensions.cs` / `.csproj` / `README.md` | Offline/regression interpretation only; never referenced/shipped by active assemblies |

Retained implementation manifest is below. This moves code, not business legacy
source files/private bytes. The old004 importer remains historical tooling; it is
not a step toward006. `Flow1StateImport.csproj` and the old browser harness now
reference the support library explicitly; active WebApi does not.

## Integrity decisions verified

- Horse selection checks the selected date range, excluding the owned request on revision. Returned requests may correct latest files while keeping the booking reservation; another active request or issued Contract still locks files. Manager can reject an abandoned returned request explicitly.
- RowVersion is a base64 DTO token on decisions/mutations. It is not a history store.
- Global SQL application lock serializes Flow1 transactions across instances for MVP.
  Reads/list DTO assembly also hold it: correctness tradeoff, not a scale benchmark.
- Publication renders outside SQL, then rechecks Contract/Request/horse tokens and
  customer details. Immutable orphan bytes may remain after rollback; no state sidecar.
- Issued email is bound to PDF; profile email change requires reissue. SMTP reserve/send/
  enable is fail-closed on delivery failure, expiry, extension and cancellation races.
  No raw OTP written/logged. Genuine EMAIL notices retain the rolling account budget.
- Wrong OTP attempts commit before returning the rejection; resend/extension/reissue
  does not erase account budget. Codes revoke on changed deadline; original PDF stays.
- Signing invoice/current deadline are atomic SQL updates. Original sign limit,
  SignedAt and SignedDepositDeadline remain; only current/latest extension persists.
- Session expected amount/merchant/create/expiry is SQL state before redirect response.
  IPN alone allocates verified money once; ReturnURL only reads ownership-protected SQL.
- Late/excess/contradictory/mismatch money remains visible for review. Existing SUCCESS
  receipt is not overwritten. Financial problems after confirm revoke handoff and hold
  an unstarted Trip; a departed Trip is never rolled back.
- Changes to invoice/preparation by other modules cannot create an early Trip or lose
  a verified receipt. No automatic refund or manual bank allocation path is exposed.
- Cancellation pending still accepts IPN money but blocks sessions/activation; approve
  requires zero money/no unresolved attempts/no Trip. Reject reevaluates activation.
- Legacy SignedAt alone does not assert OTP acceptance or VND quote/deposit terms.
  Original payment method/currency/identifiers are retained in the read model.

## Validation

- Full solution: **305 backend tests** =258 Flow1+47 Registration, 0 fail/skip.
- FE: **52 tests /16 files**, production build and scoped lint pass.
- Native HTTP chain + actual BCrypt login/invalid-password rejection, roles/ownership/no-store/removed routes and schema/import gates. Owner state with a nonzero version but missing payload blocks conversion/runtime instead of disappearing silently.
- Real LibreOffice v3 conversion; **13 A4 pages** inspected visually after final tests, no unresolved tokens or clipping. SHA256 `8eb7c8be6f598228d0940314842aaa91840645ff8ba26b547aee8bb5818f1278`; sparse signature/final handover pages remain from template page breaks.
- ROAD and VN→JP AIR connected Chrome acceptance; provider/maps/SMTP/callbacks are
  labeled fixtures. No live provider payment/public IPN acceptance is claimed.
- Release publish smoke: active WebApi present, no Flow1LegacySupport.dll, no ignored
  Sandbox file, no App_Data/private runtime in output. This is local packaging, not deploy.

Commands:
```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE='D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\runtime\libreoffice-26.8.1\extracted\program\soffice.com'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
# frontend/
npm run build
npx eslint src/features/flow1/relational src/features/flow1/TripFields.tsx src/features/flow1/PublicEstimatePage.tsx src/app/router/AppRouter.tsx vite.config.ts
npm run test:run -- --maxWorkers=1
# repo root; run once for ROAD (0), once for AIR (1)
$env:FLOW1_RELATIONAL_AIR='0'
dotnet run --project backend/tools/Flow1RelationalHarness -- '<Node executable>' '<Playwright module directory>'
```

Connected evidence from final ROAD/AIR runs uses actual BCrypt login on native003+006,
rejects the development password bypass, and exercises A1/resubmit, publication,
sign/deposit extensions, OTP/sign/invoice, cancellation/reject, ReturnURL read-only,
IPN retry, one Trip, hold/resume/reconfirm and both current acknowledgements.
- ROAD: `browser-e642945f186c4a4c9ec19aa9677b3f32`, PDF SHA256
  `1a2851a0c30de92a34859bceb5a7368c54980564f20e4865218592b73a338872`.
- AIR VN→JP: `browser-3ae4f96a07134d43a757b201c7f18103`, PDF SHA256
  `622fe3dcc0b3ef3486310ebba6516f52951e6d94b3f5836b2ac033eefa2a045a`.
Evidence directories are ignored under `backend/WebApi/App_Data/flow1/`.

Querydr/PAY protocol references used: [official PAY/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html),
[official querydr](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html).
PAY client address is bounded by the provider schema; loopback IPv6 maps to the
same127.0.0.1 address before signing, including querydr. No arbitrary replacement
of a public client address or untrusted forwarded-header input is introduced.

## Shared-code/teammate handoff

Active `HorseTransportDbContext`/legacy DAO and existing SQL FK relationships remain.
Separate typed model mirrors existing relations; full solution/Registration regression
and connected native tests pass. Source search for SELECT*, unnamed target INSERT,
ordinal readers and bulk consumers found no active application SELECT*/ordinal path
requiring a changed column order; historical importer readers name/select their own
fields. New shadow bulk copy maps columns by name. This is not proof about external
SQL/scripts or unshared teammate branches. Review their DTO consumers before merge.
The common-password login bypass was removed because it accepted unrelated accounts during real login acceptance; exact stored-password compatibility remains and teammate seed credentials may need correction.
The old request list/review/plan/history/bank-proof API shapes are intentionally retired;
new FE consumes typed array/card endpoints and version tokens. Request lists currently
show at most100 recent rows; global-lock/N+1 list performance is an MVP limit.

## Business data and external gates — not applied

Read-only schema inventory of `.\SQLEXPRESS/HorseTransportDB`:003/004 exist,006 absent.
Rows:5 HORSE,4 requests,3 Contracts,4 payments,5 invoices,3 Trips,5 horse mappings,
13 USER,4 NOTIFICATION. Primary configured metadata/private roots do not exist.
A consistent SELECT-only source snapshot was copied into a guarded disposable shadow;
source schema/data was not migrated or updated, shadow was removed in finally.
Source snapshot fingerprint:
`B495657D46EB5516879F664433F6081DE03DC36E05899FF8CB7B378D88FF8415`.
Preview read0 state documents and stopped on:
- `CTR_2026_001: CONTRACT_EVIDENCE_MISSING`
- `CTR_2026_002: CONTRACT_EVIDENCE_MISSING`
- `CTR_2026_003: CONTRACT_EVIDENCE_MISSING`

Default preview still blocks on these missing receipts. A second SELECT-only shadow
preview with `--retain-unverified-history 'CTR_2026_001,CTR_2026_002,CTR_2026_003'`
returned **0 blockers, Applied=false**, with the same source snapshot fingerprint.
This is a concrete proposed policy, not approval or business conversion. It preserves
original money/status/SignedAt/Trip and labels evidence as unverified; it does not
manufacture an OTP receipt, free old reservations, or certify old Trips completed.
The exact Contract allowlist is included in the conversion fingerprint; unknown,
PREPARED, active or partially typed evidence still blocks. Six conversion tests
cover dry-run/apply/retry/drop, missing/corrupt owner state, conflicts, private bytes,
read-only shadow and explicit-history policy/money preservation.

Operator must choose preserved unverified history versus restored evidence before
business cutover, then separately authorize backup/restore verification and exact
business006/parity/drop. No such write was performed. A shadow preview fingerprint
is never a business apply token.

Remaining gates: reviewed legacy policy/backup/offline business006 conversion;
provider Sandbox/public HTTPS IPN and querydr against the actual merchant;
target issuer/SMTP/HMAC/private bytes/backup and operational acceptance. Existing
merchant credentials were mapped privately, not absent. No infrastructure/paid
service/real money/real recipient email was used. Retained sources/private bytes
were not deleted/moved. No primary merge/push/PR/deploy occurred.

The local Sandbox bridge is ignored/Development-only and excluded from publish.
Existing tracked settings are outside this diff. A verification command printed
pre-existing sensitive settings during this run; do not repeat them in artifacts,
rotate the exposed values before using that configuration operationally.

## Retained code manifest

- `backend/Application/Interfaces/Flow1/IFlow1StateStore.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Interfaces/Flow1/IFlow1StateStore.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractAcceptanceService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractAcceptanceService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractDeadlinePolicy.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractDeadlinePolicy.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractDeadlineService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractDeadlineService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractLifecycleService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractLifecycleService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractPdfModelBuilder.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractPdfModelBuilder.cs` (regression/operator only).
- `backend/Application/Services/Flow1/ContractPublicationService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/ContractPublicationService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/CustomerTransportService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/CustomerTransportService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/DeploymentService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/DeploymentService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/DepositCancellationService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/DepositCancellationService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/DepositGatewayService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/DepositGatewayService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/DepositPaymentService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/DepositPaymentService.cs` (regression/operator only).
- `backend/Application/Services/Flow1/Flow1RequestTransaction.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/Flow1RequestTransaction.cs` (regression/operator only).
- `backend/Application/Services/Flow1/RequestReviewService.cs` → `backend/tools/Flow1LegacySupport/Retained/Application/Services/Flow1/RequestReviewService.cs` (regression/operator only).
- `backend/Infrastructure/DAOs/Flow1/CustomerTransportRepository.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/DAOs/Flow1/CustomerTransportRepository.cs` (regression/operator only).
- `backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/DAOs/Flow1/Flow1Repository.cs` (regression/operator only).
- `backend/Infrastructure/DAOs/Flow1/RequestReviewRepository.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/DAOs/Flow1/RequestReviewRepository.cs` (regression/operator only).
- `backend/Infrastructure/Storage/Flow1LegacyStateImporter.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/Storage/Flow1LegacyStateImporter.cs` (regression/operator only).
- `backend/Infrastructure/Storage/LegacyFlow1Parity.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/Storage/LegacyFlow1Parity.cs` (regression/operator only).
- `backend/Infrastructure/Storage/LegacyFlow1Sources.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/Storage/LegacyFlow1Sources.cs` (regression/operator only).
- `backend/Infrastructure/Storage/SqlFlow1StateStore.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/Storage/SqlFlow1StateStore.cs` (regression/operator only).
- `backend/Infrastructure/Transactions/Flow1UnitOfWork.cs` → `backend/tools/Flow1LegacySupport/Retained/Infrastructure/Transactions/Flow1UnitOfWork.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/CancellationController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/CancellationController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/ContractAcceptanceController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/ContractAcceptanceController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/ContractDeadlineController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/ContractDeadlineController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/ContractLifecycleController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/ContractLifecycleController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/ContractPublicationController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/ContractPublicationController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/CustomerTransportController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/CustomerTransportController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/DeploymentController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/DeploymentController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/DepositPaymentsController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/DepositPaymentsController.cs` (regression/operator only).
- `backend/WebApi/Controllers/Flow1/RequestReviewController.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Controllers/Flow1/RequestReviewController.cs` (regression/operator only).
- `backend/WebApi/Extensions/Flow1ServiceExtensions.cs` → `backend/tools/Flow1LegacySupport/Retained/WebApi/Extensions/Flow1ServiceExtensions.cs` (regression/operator only).
