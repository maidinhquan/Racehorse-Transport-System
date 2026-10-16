# Flow 1 — local UAT và bàn giao operator

## Ranh giới dữ liệu

Không có migration/import tự động khi WebApi khởi động. Các test/harness chỉ
tạo DB disposable `RaceHorseFlow1Test_*` hoặc `RaceHorseFlow1Browser_*` trên SQL
Server local được kiểm soát, rồi cleanup đúng DB đó. Không chạy script/CLI apply
với HorseTransportDB theo quyền scheduler hiện tại.

Đối với dữ liệu thật, operator phải đọc trước:

1. FLOW1_PHASE4_SQL_IMPORT_REPORT.md và FLOW1_SQL_STATE_TRANSITION_PLAN.md.
2. `backend/tools/Flow1StateImport` dry-run inventory, conflict/parity/fingerprint.
3. Quy trình offline/backup/target review và quyền apply riêng. Không đoán source
   root, tạo JSON rỗng hoặc coi thiếu private bytes là import thành công.

## Routes thực tế của phần cuối

Mục API trong plan có ví dụ thiết kế cũ; FE hiện nối các route sau (đều có prefix `/api`):

| Use case | Route |
| --- | --- |
| Customer/Manager payment detail | GET `/{customer,manager}/contracts/{id}/payments` |
| Customer bank proof | POST `/customer/contracts/{id}/payments/bank-proofs` |
| Manager actual bank confirm/reject | POST `/manager/contracts/{id}/payments/{paymentId}/{confirm,reject}` |
| Customer VNPay session | POST `/customer/contracts/{id}/payments/vnpay-sessions` |
| Customer gateway SQL status | GET `/customer/payments/{paymentId}` |
| Manager financial history/ack | GET/POST `/manager/contracts/{id}/payments/financial-review` |
| Manager overdue cancellation | POST `/manager/contracts/{id}/payments/cancel-overdue` |
| Cancellation request/history | GET/POST `/customer/contracts/{id}/cancellation-requests` |
| Manager cancellation history | GET `/manager/contracts/{id}/cancellation-requests` |
| Manager cancellation decision | POST `/manager/contracts/{id}/cancellation-requests/{cancellationId}/{approve,reject}` |
| Deployment detail | GET `/{customer,manager}/contracts/{id}/deployment` |
| Manager deployment action | POST `/manager/contracts/{id}/deployment/{confirm,hold,resume}` |
| Operations inbox | GET `/operations/flow1-work` |
| Frozen handoff/ack | GET `/operations/trips/{tripId}/flow1-handoff`; POST suffix `/acknowledgements` |

Các tên trong `{...,...}` là lựa chọn route, không phải ký tự literal trong URL.
Mutation phải có JWT/role phù hợp, `Idempotency-Key` và version input đúng use case.
Customer Return chỉ đọc SQL; callback IPN dùng chữ ký provider, không cần Customer JWT.
Cancellation yêu cầu `expectedVersion`; quyết định còn có `expectedLedgerVersion`,
`expectedDeadlineVersion`, reason và cờ reconciliation cho approve. Hợp đồng vẫn SIGNED
sau hủy để giữ chứng cứ; Request CANCELLED chặn payment mới/activation.

## VNPay active configuration

Active WebApi đọc `Flow1:Vnpay`, không tự đọc/copy secret ở project sandbox cũ.
Đặt trong user secrets hoặc environment của process; không ghi secret vào Git,
chat, CLI output hoặc browser fixture files.

| Key | Giá trị |
| --- | --- |
| Flow1__Vnpay__Enabled | true chỉ khi operator đã cấu hình Sandbox |
| Flow1__Vnpay__TmnCode | Merchant Sandbox được provider cấp |
| Flow1__Vnpay__HashSecret | Secret của chính merchant đó |
| Flow1__Vnpay__PaymentUrl | https://sandbox.vnpayment.vn/paymentv2/vpcpay.html |
| Flow1__Vnpay__ReturnUrl | origin FE + /customer/payments/return; https, hoặc http loopback cho local; không query/fragment |

Backend public IPN route: **GET /api/payments/vnpay/ipn**. Operator đăng ký đúng
public HTTPS endpoint với provider theo quyền hạ tầng riêng; không cấu hình
Return URL thành IPN. Dùng IP thật ở Connection.RemoteIpAddress; nếu qua proxy,
cần cấu hình trusted forwarded headers ở hạ tầng, không tin X-Forwarded-For do
client tự gửi.

Không đổi merchant/secret khi còn session chưa đối soát mà chưa có quy trình
provider reconciliation; merchant của mỗi session được cố định và callback phải
khớp cả cấu hình xác thực lẫn session gốc.

[Tài liệu provider chính thức](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
Current harness `FLOW1_BROWSER_GATEWAY=1` dùng fixture merchant/secret và ký local;
không dùng nó làm bằng chứng provider credential, giao dịch hay public IPN thật.

## Chạy kiểm tra local

Từ repo root, PowerShell:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE = (Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

Từ frontend: `npm run test:run -- --maxWorkers=1`, `npm run build`, scoped ESLint.
Không coi lint của các dashboard legacy khác là đã sạch chỉ vì scoped lint pass.

Connected browser: build `backend/tools/Flow1BrowserHarness`, đặt
FLOW1_BROWSER_SIGNING=1, BANK=1, GATEWAY=1, DEPLOYMENT=1, LIVE_MAPS=0,
MAP_PROVIDER=GEOAPIFY, IMPORT/LIFECYCLE/DEADLINES=0 và chạy DLL với absolute Node
executable + Playwright module directory. Các biến ở đây có prefix
`FLOW1_BROWSER_` đầy đủ. Native phase 5–6 mode không trộn với legacy import mode.

Harness dùng Chrome/Chromium headless, real LibreOffice, real SQL/private bytes,
loopback SMTP RAM sink, Maps HTTP fixtures và local signed IPN. Có các khoảng
60 giây dành cho real rate-limit windows, không vô hiệu limiter. Không build
WebApi trong khi process harness đang chạy do Windows có thể khóa DLL.

Cancellation browser riêng: `FLOW1_BROWSER_CANCELLATION=1`, SIGNING=1;
BANK/GATEWAY/DEPLOYMENT/IMPORT/LIFECYCLE/DEADLINES=0. Cùng runtime native SQL/LO,
Customer đề nghị → Manager từ chối → payment mở lại → đề nghị mới → Manager duyệt
zero-money, reload PDF/receipt. Không trộn với payment/deployment browser mode.

VN→JP MVP đã chốt sân bay → sân bay; FE/Estimate/plan phải ghi rõ chưa gồm
đường bộ hai đầu. Đường bộ hai đầu không còn là gate nghiệm thu MVP; provider
public IPN và dữ liệu gateway thật vẫn cần kiểm theo đúng môi trường.

## UAT cần nhìn đúng

| Nhánh | Kết quả phải có |
| --- | --- |
| Pending bank proof | Amount/PaidAmount không tăng, không Trip |
| Bank actual < declared | Chỉ actual vào ledger; PARTIALLY_PAID nếu chưa đủ |
| Hai nguồn bank/VNPay | Callback so session amount; tổng thực nhận đầy đủ, không cộng trùng |
| Đủ cọc + chữ ký | 1 invoice, 1 Trip PLANNING, EFFECTIVE/ACTIVATED; PDF/receipt cũ giữ nguyên |
| SQL failure/retry | Không có tiền/Trip/state commit nửa chừng; retry cùng input không trùng |
| Hết hạn | Chặn proof/session mới; không tự hủy; khoản nhận thật vẫn vào đối soát |
| Tiền dư/muộn | Flag review, acknowledgement đúng ledger; không tự hoàn tiền |
| Customer cancellation | Chờ Manager; khóa proof/session mới nhưng ghi nhận tiền đến; duyệt zero-money/không pending; từ chối xét kích hoạt với tiền đã đủ; giữ PDF/chữ ký/invoice/history |
| Cancel overdue | Manager/đúng effective version/đã đối soát/không tiền/không pending |
| Deployment | Confirm riêng; giữ ngựa/hồ sơ/plan guard; Hold chặn downstream |
| Resume | PENDING + PLANNING, confirm lại; event cũ không dùng ghi tác vụ |
| Coordinator/Specialist | Chỉ đúng stream; tải frozen docs; acknowledgement không phải APPROVED |

Nhà cung cấp callback mâu thuẫn/sai amount phải đối soát thật; API ghi audit và
không cho button acknowledgement tự cộng hoặc xóa tiền. Không có endpoint ép
SUCCESS từ Return URL hay giả refund để vượt guard.

## Điều kiện trước nghiệm thu vận hành thật

- Business DB cutover/import riêng đã được duyệt và xác minh parity/private files.
- Operator kiểm thông tin ngân hàng/issuer trong production template và runtime,
  không dùng các nhãn DEMO FIXTURE của test.
- VNPay Sandbox merchant + public HTTPS IPN nhận giao dịch thật từ provider,
  retry/return/amount được xác minh; chưa làm trong harness local.
- Maps/SMTP/runtime đích, backup SQL + immutable private bytes, recovery và các
  tác vụ thực của Flow 2/3 được nghiệm thu trong đúng môi trường.

Không cần apply business DB để kiểm source/test độc lập. Không tự đổi những
điều kiện trên thành pass hoặc chạy lại migration chỉ để tạo một commit.
