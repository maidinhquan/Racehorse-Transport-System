# Flow 1 phase 5 — payment ledger and activation

Ngày: 16/10/2026. Baseline: `bf2ac7d8321c2faba8a92c45610dae621546d428` trên `Truong`.
Phạm vi được đại ca mở rộng trực tiếp trong lượt này: tích hợp liên tục các phần
còn lại của Flow 1, không chờ lượt lịch tiếp theo. Không push/deploy/PR hoặc tác
động DB nghiệp vụ.

## Hành vi đã triển khai

- Customer nộp PDF/PNG/JPEG ngân hàng vào private immutable byte store, tối đa
  5 MB. Manifest ở CONTRACT SQL state, không nhận URL từ client và không public
  file. Owner hoặc Logistics Manager mới tải được; hash/size được kiểm khi đọc.
- Pending/rejected PAYMENT.Amount bằng **0**. DeclaredAmount chỉ là số khách
  khai; chỉ số quản lý xác minh hoặc IPN hợp lệ mới vào Amount/PaidAmount.
- Manager nhập số nguyên VND thực nhận, thời điểm nhận và mã ngân hàng riêng.
  Chuẩn hóa mã, chống ghi trùng trên các hợp đồng, không xác nhận VNPay bằng
  endpoint ngân hàng. Rejection có lý do khách đọc được; quyết định tài chính
  nội bộ không được đưa vào Customer DTO.
- Một ledger SQL dùng chung bank/VNPay: UNPAID / PARTIALLY_PAID / PAID; so khớp
  SQL PAYMENT, invoice projection và receipt trước thao tác. Unknown/corrupt
  rows dừng để đối soát, không tự sửa projection để che mất sai lệch.
- SQL request/horse locks và transaction; mutation tài chính có application lock
  `PaymentReference:ledger` dùng chung, thêm lock mã bank đã hash. Chọn serialize
  các mutation tài chính cho MVP vì schema cũ chưa có unique reference index;
  đổi lại throughput thấp hơn. Không thêm bảng/cột/index trong lượt này.
- Retry/idempotency gắn actor + nội dung. Version mỗi payment chống stale review;
  full ledger revision gắn quyết định rà soát. Retry không cộng tiền hai lần.
- Mọi thao tác đọc effective deadline bằng ContractDeadlinePolicy dưới request
  transaction. Hết hạn chặn proof/session mới; khoản thực nhận đến muộn vẫn
  ghi nhận. Giữ nguyên deadline/PDF/receipt ký gốc.
- Đủ cọc 40% đã xác minh + SIGNED/AWAITING_DEPOSIT tạo đúng một Trip PLANNING,
  link Contract.TripID, EFFECTIVE/ACTIVATED cùng receipt activation và deployment
  PENDING trong cùng transaction. Flush Trip trước FK vẫn nằm trong transaction;
  lỗi bất kỳ bước nào rollback cả tiền, invoice, Trip và receipt.
- Tiền dư được ghi đầy đủ. Tiền muộn/dư, cọc một phần quá hạn và tiền của yêu cầu
  đã hủy được flag tài chính. Có thể ghi quyết định rà soát đúng ledger/deadline
  hiện hành; không tạo hoàn tiền hay thay số tiền. Callback mâu thuẫn có audit,
  không cho một acknowledgement bỏ qua đối soát provider.
- Hủy overdue chỉ Manager sau đối soát, chưa kích hoạt, đúng effective deadline
  version, không có tiền xác minh và không còn giao dịch chờ. Không tự hủy do
  timer. Khoản callback của request đã hủy không làm request sống lại.
- Thông báo trong ứng dụng ghi vào review notices cùng SQL transaction; reload
  đọc được sau restart. Không gửi email/SMS người thật; không triển khai một
  SMTP outbox thanh toán rồi coi đã gửi.

## VNPay

Adapter Infrastructure dùng PAY 2.1.0, sandbox-only, HMAC-SHA512 và constant-time
signature comparison; kế thừa cách canonical/sign của module cũ
`backend/Payments/VnpayGateway.cs`, không dùng SandboxPaymentStore làm ledger.
[Tài liệu PAY chính thức](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
được đối chiếu trong lượt này.

- Session là outstanding do backend tính, cố định amount/currency/reference/
  expiry. Expiry tối đa 15 phút và không vượt effective deadline. Retry hoặc
  mất state trình duyệt khôi phục session còn hạn, không tạo session trùng.
- IPN kiểm chữ ký, merchant, reference, amount của **session**, VND, result code,
  transaction status, provider transaction id và posting time. Không so với
  outstanding đã thay đổi bởi một bank receipt khác.
- Merchant được cố định trên session, kiểm cả khi cấu hình merchant hiện hành
  đã đổi. Session hết hạn không tự giả FAILED: callback ký hợp lệ vẫn được đối
  soát và không tạo Trip thứ hai.
- Provider retry trả `02` sau một lần commit; invalid signature/payload `97`,
  unknown reference `01`, sai amount `04`, chưa commit/conflict `99`. Trả `00`
  chỉ sau khi transaction đã commit. Duplicate query parameters bị từ chối.
- Sai lệch có bằng chứng an toàn trong financial-review; không lưu raw callback,
  thẻ, hash secret hoặc chữ ký vào ledger. Thiếu cấu hình fail closed.
- Return page chỉ gọi API owner-scoped để đọc SQL. `vnp_ResponseCode` trên URL
  không có quyền thay đổi số tiền hoặc kích hoạt Trip.

## File và layer

| Đường dẫn | Trách nhiệm |
| --- | --- |
| backend/Application/DTOs/Flow1/DepositPaymentDtos.cs | Contract API, receipt, ledger events, balance, financial review |
| backend/Application/Services/Flow1/DepositPaymentService.cs | Bank proof/review, ledger validation, atomic activation |
| backend/Application/Services/Flow1/DepositGatewayService.cs | Cùng service qua partial class: session/IPN, notices, financial review, cancellation |
| backend/Application/Interfaces/Flow1/IntegrationContracts.cs | Gateway port, capability và IP session input |
| backend/Domain/Interfaces/DAOs/IFlow1Repository.cs | Query/stage contract/invoice/payment/trip, không SaveChanges |
| backend/Domain/Interfaces/IFlow1UnitOfWork.cs | Payment application lock trong transaction |
| backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs | EF queries, toàn hệ thống chống duplicate verified refs |
| backend/Infrastructure/Transactions/Flow1UnitOfWork.cs | SQL transaction lock, không migration startup |
| backend/Infrastructure/Storage/SqlFlow1StateStore.cs | Map payment-ledger/sessions/financial-review/activation vào CONTRACT hiện hữu |
| backend/Infrastructure/ExternalServices/Flow1/VnpaySandboxGateway.cs | Provider encoding/signature/config validation |
| backend/WebApi/Controllers/Flow1/DepositPaymentsController.cs | Customer/Manager endpoints và public IPN protocol |
| backend/WebApi/Extensions/Flow1CustomerExtensions.cs | DI và Flow1:Vnpay options |
| frontend/src/features/flow1/DepositPaymentsPanel.tsx | Proof form, actual-money review, sessions, financial review, overdue cancel |
| frontend/src/features/flow1/CustomerPaymentPage.tsx | Owned request/contract, không fixture hoặc local fake status |
| frontend/src/features/flow1/CustomerVnpayReturnPage.tsx | Read-only return status từ SQL |
| frontend/src/features/flow1/paymentApi.ts | Authenticated real API adapter/private download |
| frontend/src/features/user-dashboard/page/transport-request-page/payment/PaymentPage.tsx | Legacy route re-export sang page thật |
| backend/tests/Flow1.Tests/DepositPaymentTests.cs, DepositGatewayTests.cs, VnpaySandboxGatewayTests.cs | Real SQL endpoint tests và provider validation |

## Kiểm chứng

- `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS` và explicit LibreOffice path;
  `dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'`:
  **195 Flow1 + 47 Registration = 242 pass, 0 fail/skip** tại checkpoint cuối.
- `npm run test:run -- --maxWorkers=1`: **44 pass** tại checkpoint cuối FE.
- `npm run build`: pass. Scoped lint các file Flow1/router/payment thay đổi:
  pass sau thay client Date.now guard bằng server-provided overdue.
- Covered: role/ownership/private proof, pending zero, reject/retry, partial,
  excess, same/different-contract bank dedupe, concurrent receipts, effective
  extension, late/cancelled money, projection corruption, SQL fault sau ledger,
  flush/Trip/activation/notices và callback retry.
- Giữ mount của Manager work theo ContractID bất biến khi SIGNED/EFFECTIVE;
  notices/activation refresh không remount hàng loạt panel. Có regression test
  cho stale invoice refresh/activation và request burst; review/Draft editable
  vẫn reset form theo review version như trước.
- Browser nối liền phase 5–6 **PASS** trên bộ source cuối: real Chrome → FE →
  WebApi → disposable SQL/private bytes; real LibreOffice + SMTP loopback, Maps
  HTTP fixtures, bank 20 triệu + local signed VNPay 20 triệu, 1 invoice/1 Trip.
  Return đọc SQL, callback retry `02`, reject proof còn lại không cộng tiền,
  original PDF/receipt giữ nguyên, 0 page errors; tiếp tục release/hold/resume và
  hai consumer nhận bàn giao. Không lấy baseline phase 4 thay kiểm chứng mới.
- Evidence ignored: `backend/WebApi/App_Data/flow1/browser-c1880d15126f48e1b7a4c2c8cd430830`.
  PDF SHA-256: `09ffcfe27bcbc4b3f402479ffe60a6fc9bd027c760868a5338e4847019c8a159`.
  Đã xem screenshot Customer payment và Specialist nhận bàn giao.

## Ranh giới chưa nghiệm thu thật

1. Không migrate/import HorseTransportDB; DB nghiệp vụ chưa áp 004/import như
   báo cáo S3. File local riêng của đại ca và staged Vite config được giữ nguyên.
2. WebApi chưa có Flow1:Vnpay merchant/secret. Có cấu hình Sandbox ở project cũ
   cần operator kiểm tra rồi map sang active process; không in hoặc copy secret
   vào source/Git. Hướng dẫn tại FLOW1_LOCAL_UAT_AND_OPERATIONS.md.
3. Callback browser là local signed fixture, **không phải provider/live IPN**.
   Chưa đăng ký public HTTPS IPN hoặc xác minh giao dịch từ VNPay Sandbox thật.
4. Chưa có production bank reconciliation, refund execution, load testing hoặc
   operational backup verification. Financial-review acknowledgement không
   thay thế xác nhận tiền/hoàn tiền thực tế.
5. Nhánh Customer gửi yêu cầu hủy sau ký → Manager duyệt/từ chối của mục 7/F1-51
   cần increment tiếp trong chính lượt này. Core hiện có Manager overdue cancel;
   không coi hai use case là tương đương hoặc đánh dấu toàn Flow 1 hoàn tất.
