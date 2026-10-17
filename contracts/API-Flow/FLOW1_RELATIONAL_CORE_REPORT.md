# Flow1 typed core — checkpoint trước cutover API

Ngày 17/10/2026 Asia/Saigon. Baseline c060d06b6d17e7c2b953417169de856356de9ead.
Worktree codex/flow1-relational-mvp; chưa merge primary, chưa áp DB nghiệp vụ.

## Phần đã làm

- Domain/Flow1/FlowRows.cs: scalar entities cho 9 bảng sẵn có; không JSON state.
- Application/Interfaces/Flow1/IFlow1Data.cs: port data/transaction và current files.
- Application/DTOs/Flow1/RelationalDtos.cs: DTO chỉ xuất dữ liệu cần thiết, không OTP hash.
- Application/Services/Flow1/Relational/: latest horse files, submit/A1 review,
  direct quote, immutable publication, OTP reserve/send/enable, sign/invoice,
  signing/deposit extension, latest cancellation, verified VNPay allocation,
  exactly-once activation và current deployment/event acknowledgements.
- Infrastructure/Data/Context/Flow1RelationalContext.cs: ánh xạ độc lập, giữ model
  teammate; mirror FK có sẵn cho EF order, không tạo/migrate DB. SQL transaction
  và global Flow1 application lock bảo vệ cross-request money/horse dedupe ở MVP;
  đổi lại writes được serialize. PDF/SMTP ngoài transaction. RowVersion chặn stale.
- Infrastructure/Storage/Flow1CurrentFiles.cs: private content-addressed latest refs,
  hash/signature/size kiểm khi đọc; dùng bytes store cũ, không state sidecar.
- Gateway contract bổ sung typed callback codes/bank và thời gian create frozen
  của session. Không persist raw callback hoặc URL mang chữ ký.
- Template patch v3 tách signing deadline và quy tắc cọc sau ký/cap chuẩn bị;
  bỏ plan/history/bank-proof claims. Renderer hỗ trợ v3; CHƯA render/QA v3 ở checkpoint.

## Kiểm chứng

RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS; LibreOffice path theo foundation report.
`dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'`
PASS270 =223 Flow1 +47 Registration, 0 fail/skip. Flow1 49s, Registration24s.
Bảy native relational tests dùng000→003→006, không004, kiểm chain sign/pay/activate/
hold/resume/ack, stale event và ownership; delivery failure không enable code;
wrong OTP phải commit attempts; extension giữ PDF/SignedAt/signedDue và invoice due;
SMTP race với extension không enable OTP đã revoke; cancellation pending nhận tiền
nhưng giữ Trip, reject xét activation, approve zero-money giữ signature/invoice;
mismatch/tampered callback không cấp cọc; parallel duplicate IPN; Trip insert fault
rollback invoice/payment rồi retry đúng một Trip. Maps/PDF/SMTP dùng fixtures trong
nhóm test này; không nói provider/browser/real v3 PDF đã kiểm.

Trong native test phát hiện EF scalar model chưa biết FK nên update Contract.TripID
trước insert Trip. Đã mirror các FK có sẵn trong EF model và rerun qua; không đổi SQL
quan hệ. Fail-closed OTP race test giữ delivery budget và không lưu mã thô.

## Chưa hoàn thành ở checkpoint

Runtime DI/API/FE vẫn source JSON cũ. Chưa đổi/xóa state store, chưa conversion/drop
JSON, chưa UI/browser typed acceptance, chưa runtime006 schema/import gate, chưa
querydr reconciliation cho attempt không nhận IPN. Chưa tuyên bố kết thúc Flow1.
Bước kế tiếp: API/FE typed cùng cả chuỗi, native HTTP/browser, render/QA v3 từng
trang, offline converter/parity/operator guide và gỡ runtime JSON cũ. Không nối
nửa typed/nửa JSON, không migrate HorseTransportDB, không push/merge primary.
