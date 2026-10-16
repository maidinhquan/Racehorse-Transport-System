# Flow 1 phase 4 — increment B: OTP và receipt xác nhận

**Cập nhật sau increment B:** đại ca đã chọn chuyển metadata vào SQL, giữ đầy đủ
Flow 1, không bảng mới. Ưu tiên [S1–S3](FLOW1_SQL_STATE_TRANSITION_PLAN.md) và
[báo cáo SQL foundation](FLOW1_PHASE4_SQL_STATE_REPORT.md); các receipt/file-saga
bên dưới mô tả baseline trước cutover, không dùng để mở rộng file provider thêm.

Ngày: **16/10/2026**, branch `Truong`. Commit nền trước lượt này:
`01e98d2f96fe91834887ba44e96ba0a55d66f284` (PDF publication increment A).

**Phase 4 vẫn IN_PROGRESS.** Increment này nối PDF đã phát hành tới email OTP,
xác nhận hợp đồng, hóa đơn cọc và recovery. Chưa chuyển phase 5; phần decline,
explicit expiry/reissue và gia hạn deadline còn tiếp tục trong phase 4.

## Hành vi và phạm vi

- Customer mở PDF, xác nhận đã đọc/đồng ý, yêu cầu mã qua email tài khoản và nhập
  sáu chữ số. Backend ràng buộc owner, current Contract/version, PDF SHA-256,
  email hiện tại và publication/request/plan/review; không tin tổng tiền từ FE.
- RNG tạo mã; file chỉ lưu HMAC theo purpose riêng, không hash thường của mã sáu
  số. Digest cho replay input ký cũng là HMAC, tránh brute force mã từ receipt.
- TTL tối đa 5 phút và không vượt CompletionDeadline; resend tối thiểu 60 giây,
  tối đa 5 lần nhập sai/challenge, 5 lần yêu cầu/15 phút/account xuyên contracts
  và restart. Cả gửi lỗi/cooldown/stale requests đều có thể tiêu hao account budget.
  Endpoint OTP/sign thêm giới hạn IP 25 request/15 phút, không thay giới hạn đọc
  thông thường 30 request/phút/user. Shared IP có thể chạm giới hạn sớm.
- Gửi mail ngoài SQL transaction. Challenge có DELIVERING/DELIVERED/FAILED;
  chỉ DELIVERED được dùng. Crash sau SMTP nhưng trước delivery receipt phải gửi
  mã mới sau cooldown; không suy đoán giao mail thành công.
- Ký kiểm consent, thời hạn, hồ sơ/lịch ngựa, pending changes và đúng PDF. Transaction
  chuyển Contract SIGNED/SignedAt + Request AWAITING_DEPOSIT, tạo đúng một Invoice
  DEPOSIT/VND/UNPAID/PaidAmount=0/cọc 40%. InvoiceID deterministic + unique index
  sẵn có bảo vệ retry; **TripID vẫn NULL, không tạo Trip**.
- PDF gốc không đổi sau ký. Receipt JSON riêng chứa owner, document version/hash,
  challenge ID, EMAIL_OTP, SignedAt và invoice; không coi đây là chữ ký số chuyên dụng.
- Quá hạn khóa ký/gửi mã, vẫn đọc PDF/receipt; không tự hủy hoặc giải phóng lịch.
  Increment này sử dụng deadline gốc; effective deadline/extension là phần còn lại.
- FE giữ mã và retry input trong RAM của component; không localStorage/sessionStorage,
  không console log mã. Preview/consent gắn đúng Contract/version/hash; chuyển tài
  liệu phải mở lại PDF và xác nhận lại. Reload đọc SQL/receipt qua API thật.

## SQL / file recovery

1. Trong request lock và horse locks: kiểm current version, PDF private bytes/hash,
   mã đã giao/đúng/hợp lệ, owner/email, consent và SQL before state.
2. Append acceptance PREPARED chứa bằng chứng mã đã được xác minh và keyed input
   digest; không chứa mã thô. Khóa việc gửi mã mới cho đến khi giải quyết pending.
3. Đánh dấu challenge consumed trong file rồi commit Contract/Request/Invoice cùng
   một SQL transaction. Lỗi SQL rollback cả ba; file PREPARED/consumed được giữ.
4. GET/retry đối chiếu SQL after + invoice amount/currency/due/status/SignedAt và
   PDF trước khi append COMMITTED receipt. SQL đã commit vẫn reconcile được khi
   mã/deadline đã hết hạn; không áp lại mutation hoặc tạo hóa đơn thứ hai.
5. SQL còn before: exact customer retry hoặc Manager recover kiểm lại current
   request/plan/review/horses, email, OTP TTL và deadline, rồi thực hiện transaction.
   Recovery không sinh mã mới hoặc bỏ qua challenge đã hết hạn.
6. Manager chỉ discard trước SQL commit, phải nhập lý do. Challenge được vô hiệu
   trước ABORTED receipt; mã cũ và mọi key ABORTED không được dùng lại. Thiếu/hỏng
   metadata hoặc dữ liệu SQL/PDF lệch thì fail closed, không đoán legacy đã ký.

SignedAt và Invoice.DueDate là SQL `datetime` có sẵn. Receipt dùng UTC nguyên giây
để so sánh chính xác khi reopen SQL; DueDate là projection làm tròn xuống nguyên
giây của CompletionDeadline. CompletionDeadline gốc (datetime2) không bị sửa.
Các đọc receipt sau khi phase 5 ghi nhận tiền phải giữ liên kết invoice/amount/VND;
phase 5 cần chặn payment/activation khi acceptance còn PREPARED.

## File / layer / handoff

| File tính từ repo root | Layer và mục đích |
|---|---|
| `backend/Application/DTOs/Flow1/ContractAcceptanceDtos.cs` | DTO public challenge/receipt/invoice; private keyed OTP/operation snapshots |
| `backend/Application/Interfaces/Flow1/IContractOtp.cs` | Application ports security và delivery, không logging/output mã |
| `backend/Application/Services/Flow1/ContractAcceptanceService.cs` | Application orchestration, guards, locks, preparation/SQL/reconciliation |
| `backend/Domain/Interfaces/DAOs/IFlow1Repository.cs` | Domain repository contract thêm lookup deposit invoice |
| `backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs` | EF tracked lookup, staging Invoice trong UoW có sẵn |
| `backend/Infrastructure/ExternalServices/Flow1/ContractOtp.cs` | RNG/HMAC constant-time + SMTP TLS, bounded timeout, sanitized errors |
| `backend/WebApi/Extensions/Flow1CustomerExtensions.cs` | DI/options và IP rate policy, không Development registration sender |
| `backend/WebApi/Controllers/Flow1/ContractAcceptanceController.cs` | Customer/Manager role, owner tại service, no-store responses |
| `frontend/src/features/flow1/acceptanceApi.ts` | FE contract cho OTP/sign/receipt/recovery |
| `frontend/src/features/flow1/ContractAcceptancePanel.tsx` | Customer consent/OTP/retry/receipt, Manager recovery/discard |
| `frontend/src/features/flow1/ContractPublicationPanel.tsx` | Mount acceptance sau publication, preview gắn đúng document |
| `backend/tests/Flow1.Tests/ContractAcceptanceTests.cs` | SQL/API concurrency, security, fault và restart tests |
| `backend/tests/Flow1.Tests/ContractPublicationTests.cs` | Chia sẻ fixture nội bộ, thêm acceptance fault injection |
| `frontend/src/features/flow1/*Panel.test.tsx` | Consent/retry/receipt/recovery controls và publication regression |
| `backend/tools/Flow1BrowserHarness/Program.cs`, `backend/tools/flow1-browser.cjs` | Chromium + API/SQL/file/real PDF + SMTP RAM sink, SQL invariants |

Không đổi migration/schema, không sửa legacy `backend/DAO` hoặc payment sandbox.
Giữ nguyên nội dung và trạng thái của `frontend/vite.config.ts` staged trước đó;
không sửa/commit `backend/WebApi/appsettings.Local.json` của đại ca.

## API thực tế

Prefix `/api`. POST sign cần `Idempotency-Key`.

| Quyền | Route | Input / kết quả |
|---|---|---|
| Customer | POST `/customer/contracts/{id}/otp` | `{contractVersion,documentHash}` → `{challengeId,expiresAt,resendAt}` |
| Customer | POST `/customer/contracts/{id}/sign` | `{contractVersion,documentHash,challengeId,otp,acceptedTerms:true}` → acceptance view |
| Customer | GET `/customer/contracts/{id}/acceptance` | Receipt + SQL deposit summary; không digest/storage key/email |
| Manager | GET `/manager/contracts/{id}/acceptance` | Receipt/recovery state |
| Manager | POST `/manager/contracts/{id}/acceptance/recover` | Không render PDF/gửi email lại; revalidate SQL before hoặc reconcile after |
| Manager | POST `/manager/contracts/{id}/acceptance/discard` | `{reason}`; chỉ SQL before |

## Cấu hình local/private và vận hành

- Bắt buộc **`Flow1:Contracts:OtpHmacKey`**: secret ngẫu nhiên riêng ít nhất 32 byte,
  giữ ổn định trong cấu hình private/environment/secret store qua restart. Không
  dùng JWT default/key public trong source; không điền secret vào report/Git/chat.
  Thiếu key trả 503 `CONTRACT_OTP_NOT_CONFIGURED`; không dùng code giả.
- SMTP ưu tiên `Flow1:Contracts:Email:Smtp` với Host/Port/EnableSsl/From/Username/
  Password. Nếu section đó không có, dùng cấu hình `RegistrationEmail:Smtp` hiện
  hữu qua sender riêng, không dùng `RegistrationEmail:Mode=Development` logger.
- Production yêu cầu TLS. Chỉ Development + flag
  `Flow1:Contracts:Email:AllowDevelopmentLoopback=true` cho phép SMTP không TLS
  tới localhost/loopback. Timeout 20 giây; lỗi trả thông báo đã loại chi tiết nhạy cảm.
- Kiểm tra **presence** trong local config ngày 16/10: SMTP registration có sẵn;
  chưa có dedicated OTP HMAC key hoặc contract SMTP override. Không in giá trị,
  không sửa file private, chưa gọi SMTP live. Không thể khẳng định giao thư thật.
- Rotate key làm mất hiệu lực challenge/retry digest cũ; receipt đã commit vẫn
  đọc/reconcile được. Discard PREPARED nếu cần và yêu cầu mã mới; không xóa receipt
  để đổi key. Metadata/history vẫn chịu giới hạn 2 MB của private store hiện có;
  chưa có archival/compaction tự động, không được xóa audit tùy tiện.

## Kiểm thử và bằng chứng

```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE=(Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

**162 pass = Flow1 115 + Registration 47; 0 fail/skip.** Có chạy real LibreOffice
regression; không chỉ lấy số liệu cũ của increment A. Chỉ disposable SQL test DBs.
10 test mới bao gồm quyền/owner/version/hash/consent, wrong OTP/5 attempts/resend/
TTL/cooldown, email đổi/delivery lỗi, budget xuyên contracts và fresh host, ký song
song/idempotency/one invoice/no Trip, SQL invoice rollback, PREPARED trước SQL,
recovery bằng host mới, SQL đã commit thiếu receipt sau hết OTP/deadline,
discard/key ABORTED, PDF corrupt, TLS/key configuration guards. Dùng email
`example.invalid` và RAM sink trong test; không gọi provider giao email thật.

Frontend: `npm run test:run` **18 pass**; `npm run build` **PASS**;
`npx eslint src/features/flow1/ContractAcceptancePanel.tsx src/features/flow1/ContractAcceptancePanel.test.tsx src/features/flow1/acceptanceApi.ts src/features/flow1/ContractPublicationPanel.tsx src/features/flow1/ContractPublicationPanel.test.tsx`
**PASS**. Gồm consent trước OTP, stable retry key, receipt/clear code, Manager-only
recovery, và không dùng preview tài liệu cũ để xác nhận replacement.
`node --check backend/tools/flow1-browser.cjs` và `git diff --check` **PASS**.

Chromium connected acceptance **PASS**:
`backend/WebApi/App_Data/flow1/browser-f1289076780e43b6889b7581339dcbc1/`.

```powershell
$env:FLOW1_BROWSER_MAP_PROVIDER='GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS='0'
$env:FLOW1_BROWSER_SIGNING='1'
# Giữ RACEHORSE_TEST_SQL_SERVER / RACEHORSE_TEST_LIBREOFFICE như trên.
dotnet run --project backend/tools/Flow1BrowserHarness -- '<absolute Node executable>' '<absolute Playwright module directory>'
```

Chrome chạy Customer/Manager review/revision/change/Draft → real LibreOffice v2 PDF
→ tải PDF/hash → loopback SMTP → nhập sai bị 409 → nhập đúng → reload receipt ở
cả Customer/Manager → tải lại PDF sau ký, hash giữ nguyên
`393170c16ae148318eff6747dcf55993592eb1310ce0b9cfbf394581dc79e085`.
SQL invariant kiểm 1 SIGNED contract + 1 SUPERSEDED, request AWAITING_DEPOSIT,
1 DEPOSIT 40 triệu VND/UNPAID/PaidAmount=0 cho tổng 100 triệu, 0 Trip.
Browser có **0 page errors, 0 direct provider requests**. Đã xem hai screenshot
Customer/Manager đã ký: receipt/version/hash/40% đúng, không có ô nhập mã còn lại.
Không chỉnh template/PDF source trong increment B nên không thay visual QA 13 trang
của increment A; test PDF regression vẫn chạy trong bộ backend cuối.

Mail dùng SMTP TCP thật tới sink loopback của harness, payload chỉ ở RAM, không
forward, không raw OTP trong outbox/file/API log/browser result. Script che mã nếu
Playwright đưa giá trị fill vào diagnostic và mask inputs khi chụp failure screenshot.
Test scan metadata/logs không phát hiện raw code; scan source theo private credentials
đang cấu hình cũng đạt. Evidence/PDF/log/runtime đều ignored, không vào commit.
Maps là HTTP fixtures có nhãn; JWT fixture và DB/accounts/files dùng riêng, không
kiểm login thật, live SMTP, live Maps hoặc thanh toán/provider production.

Lượt Chrome đầu hoàn tất ký nhưng harness bắt lỗi auth init chạy vào opaque PDF
frames (`localStorage` null). Đã giới hạn auth init vào origin ứng dụng. Một lượt
sau timeout đợi response OTP; thêm await đồng thời click/response, masked failure
diagnostic và chạy lại toàn chuỗi đạt kết quả trên. Không disable limiter, force
click, thay endpoint ký bằng mock hoặc coi các lượt thất bại là PASS. Nếu lỗi timing
trở lại, giữ failure evidence và kiểm tương tác browser, không tự nới acceptance.

## Phần tiếp theo của chính phase 4

1. Customer decline có lý do + Manager explicit expire/reissue đúng version/status,
   giữ PDF cũ và giải quyết recovery khi Contract/Request đổi trạng thái.
2. Extension append old/new effective deadline, reason/actor/time và preparation
   feasibility; không sửa original CompletionDeadline/PDF/SignedAt. Khi đã ký,
   cập nhật DueDate projection qua prepare/reconcile, chặn invoice đang xử lý.
3. API/FE route contract legacy còn dùng mock cần nối current Contract/receipt thật;
   kiểm browser cho decline/reissue/extension, overdue và recovery của các nhánh đó.
4. Điền private OTP key trước nghiệm thu gửi mã bằng cấu hình vận hành. Live SMTP
   delivery chưa được kiểm chứng; test chỉ dùng in-memory/loopback không chuyển tiếp.
5. Chưa triển khai/kiểm ledger thanh toán, VNPay IPN, đủ cọc → Trip (phase 5),
   operational deployment và connected Flow 2/3 (phase 6). Không gọi full Flow 1 E2E.

Lịch hai tiếng tiếp tục **phase 4**, không có push/deploy/PR hay migration DB nghiệp vụ.
