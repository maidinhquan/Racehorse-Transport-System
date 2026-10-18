# Flow 1 phase 5 — Customer cancellation after signing

Ngày 16/10/2026. Baseline core payment/deployment commit:
`109c77f7f54c2f0b7b7eb46656487f15cb240332` trên `Truong`.
Đại ca yêu cầu tích hợp liên tục phần còn lại và chốt VN→JP chỉ sân bay → sân bay
cho MVP; không chờ lịch hai tiếng và không bổ sung ground legs.

## Hành vi

- Customer sở hữu hợp đồng SIGNED, Request AWAITING_DEPOSIT, chưa activation có
  thể đề nghị hủy với lý do. Request vẫn AWAITING_DEPOSIT cho tới quyết định Manager;
  không phải auto-cancel và không cần chờ quá hạn.
- Mỗi đề nghị có ID, reason, actor/time và quyết định công khai. Event audit nằm
  trong CONTRACT.Flow1StateJson dưới document `cancellation`, không thêm schema.
- Trong khi chờ duyệt: khóa proof/session mới và replay URL thanh toán cũ. Tiền
  thực nhận từ bank confirmation/IPN vẫn ghi ledger/invoice; tạm dừng activation,
  yêu cầu Manager xét đề nghị thay vì làm mất tiền hoặc tự tạo chuyến.
- Manager quyết định theo cancellation version + ledger version + effective
  deadline version; request/horse transaction và payment ledger lock serialize
  quyết định với receipt/callback. Lý do bắt buộc, key retry gắn actor/payload.
- Approve chỉ khi đã đối soát, số tiền verified bằng 0, không pending bank/gateway
  hoặc provider conflict. Request → CANCELLED cùng event/notice trong một SQL tx.
  Contract vẫn SIGNED; giữ PDF, chữ ký, invoice và toàn bộ history. Không có refund.
- Reject giữ chứng cứ, mở lại payment khi còn hạn, xét activation với tiền đã nhận;
  nếu đã đủ cọc thì tạo đúng một Trip mà không bắt khách nộp thêm tiền.
- Sau activation không nhận đề nghị mới ở endpoint này; cần operational review.
  Manager overdue-cancel không được đi vòng đề nghị Customer đang pending.
- FE trong trang payment Customer và chi tiết Manager dùng API thật, lazy load
  lịch sử và số tiền mới nhất, reason/checkbox/version, giữ key khi lỗi mạng.

## File và layer

| File | Layer / mục đích |
| --- | --- |
| backend/Application/DTOs/Flow1/CancellationDtos.cs | Input/version, event audit, public history |
| backend/Application/Services/Flow1/DepositCancellationService.cs | Application, cùng partial payment service; request/approve/reject |
| backend/Application/Services/Flow1/DepositPaymentService.cs | Application; pending cancellation/payment/activation guard |
| backend/Application/Services/Flow1/DepositGatewayService.cs | Application; session/replay và overdue-cancel guard |
| backend/Infrastructure/Storage/SqlFlow1StateStore.cs | Infrastructure; document cancellation cùng CONTRACT owner |
| backend/WebApi/Controllers/Flow1/CancellationController.cs | Customer owner / Manager role endpoints, no-store, rate limit |
| frontend/src/features/flow1/cancellationApi.ts | FE DTO/API mapping |
| frontend/src/features/flow1/CancellationPanel.tsx | Customer request / Manager review / history |
| frontend/src/features/flow1/DepositPaymentsPanel.tsx | Nối panel vào payment use cases thật |
| backend/tests/Flow1.Tests/CancellationTests.cs | Native SQL HTTP quyền/tiền/retry/rollback/race/IPN tests |
| frontend/src/features/flow1/CancellationPanel.test.tsx | FE retry key, role, financial guard và version payload |
| backend/tools/Flow1BrowserHarness/Program.cs; backend/tools/flow1-browser.cjs | Connected native cancellation acceptance riêng |

Routes thực tế và payload version có trong [operator guide](FLOW1_LOCAL_UAT_AND_OPERATIONS.md).
Không sửa legacy DAO, không đổi bảng/cột/migration, không apply/import business DB.

## Kiểm chứng

- `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS`, real LibreOffice path;
  `dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'`:
  **248 PASS = 201 Flow1 + 47 Registration; 0 fail/skip**.
- Sáu native cancellation tests: owner/role, retry, approve trước deadline giữ
  PDF/receipt/invoice, pending proof/money blocks approval, reject sau đủ tiền
  activates một lần, stale version, second request, SQL fault rollback, bank race,
  signed local IPN khi pending và session replay bị khóa.
- `npm run test:run -- --maxWorkers=1`: **46 PASS**, gồm 2 cancellation FE tests.
- `npm run build`: PASS. Scoped ESLint cho CancellationPanel/test/API và
  DepositPaymentsPanel: PASS. Không suy ra full legacy FE lint sạch.
- Connected real Chrome → FE → API → native SQL/private bytes → real LibreOffice
  + loopback SMTP RAM sink: **PASS**, `pageErrors=[]`.
  Evidence (ignored, không Git):
  `backend/WebApi/App_Data/flow1/browser-cedf5109b9364bb6801e537af91f7b46`.
  Customer request → Manager reject → payment reopen → second request → Manager
  approve sau zero-money reconciliation → reload Request CANCELLED, Contract SIGNED,
  1 invoice UNPAID, 0 Payment/Trip. SQL kiểm bốn event REQUESTED/REJECTED/REQUESTED/APPROVED.
  Customer tải lại PDF sau hủy; SHA256 khớp trước ký/sau ký/sau hủy:
  `7cd6cb8816ba109d1d69a61e2247d5352d1bc873dcd29ecfd4e6bb20ba47b028`.
  Đã xem screenshot `customer-cancellation-approved.png` và
  `manager-cancellation-approved.png`; quyết định/reason/history hiển thị đúng.
- Hai lượt harness trước chưa đạt: timeout 5 phút trước nhánh hủy, sau đó 429 khi
  dev StrictMode + hai full Manager reload vượt limiter. Harness cuối giữ limiter
  thật, dùng nút load hiện có thay reload không cần thiết, thêm bounded window trước
  final PDF read, timeout tối đa 8 phút. Không sửa rate/security acceptance để đạt.
- `dotnet build backend/tools/Flow1BrowserHarness/Flow1BrowserHarness.csproj --nologo`:
  PASS 0 warning/error; không build API trong khi browser đang giữ DLL.
- Diff/secret/artifact review: không cấu hình private trong own files, không PDF/
  runtime/binary/new migration; user local config và staged Vite giữ nguyên.

## Giới hạn còn lại

Giữ các gate đã ghi trong [phase 5 core](FLOW1_PHASE5_PAYMENT_REPORT.md),
[phase 6](FLOW1_PHASE6_DEPLOYMENT_REPORT.md) và operator guide: chưa business DB
cutover, chưa VNPay provider/public HTTPS IPN, chưa bank/refund vận hành thật,
chưa nghiệm thu toàn workflow Flow 2/3. Credentials Sandbox legacy đã có; active
WebApi cần operator mapping và public-IPN verification, không phải lý do tạo mock
rồi công bố live. Airport-only MVP là quyết định nghiệp vụ đã được đại ca chốt,
không phải acceptance ground legs bị bỏ qua ngầm.
