# Báo cáo giai đoạn 1 Flow 1

> Cập nhật 16/10/2026, Asia/Ho_Chi_Minh. Phạm vi: nền tảng theo quyết định schema tối thiểu.
> **Hoàn thành giai đoạn 1 trong phạm vi nền tảng: backend đã kiểm chứng và PDF spike đã render/QA đủ 12 trang.**

## 1. Phạm vi database thực tế

Không tạo bảng mới. Migration chỉ:

1. Thêm `CONTRACT.RequestID varchar(50) NOT NULL`, backfill từ `Trip.RequestID`, thêm FK.
2. Thêm `CONTRACT.CompletionDeadline datetime2 NULL`; không bịa deadline legacy.
3. Cho `CONTRACT.TripID` nullable để Draft/Contract tồn tại trước Trip.
4. Thêm index RequestID, unique Trip.RequestID và unique invoice DEPOSIT/Contract.

Đã kiểm tra trên DB tạm: số bảng không đổi, số cột toàn DB chỉ tăng hai. Script có transaction,
chạy lại được, dừng khi duplicate/mismatch/type/index sai, không tự xóa dữ liệu.

DB nghiệp vụ local `HorseTransportDB` chỉ chạy preflight **read-only**; không áp migration,
không reset, không đổi tiền/currency/status/signature. Preflight chưa phát hiện duplicate Trip,
deposit invoice hoặc customer/relation conflict theo các kiểm tra hiện tại. Đây không phải
kiểm toán toàn bộ nghiệp vụ hoặc xác nhận DB đã nâng cấp.

## 2. Các phần đã làm

| Lớp / file | Kết quả |
|---|---|
| `backend/database/000_legacy_schema.sql` | Baseline 26 bảng chỉ DDL, không reset/seed; lấy từ schema tracked |
| `backend/database/002_flow1_preflight.sql` | Báo cáo đọc-only trước migration |
| `backend/database/003_flow1_minimal_schema.sql` | Migration tối thiểu, backfill + FK/index |
| `backend/Domain/Entities/Contract.cs` | Hai property mới, Trip nullable, Request navigation |
| `backend/Infrastructure/Data/Configurations/Flow1/` | EF mapping và index tương ứng; không entity/table mới |
| `IFlow1Repository` / `Flow1Repository` | Query/stage Contract/Trip/Invoice/Payment; không tự SaveChanges |
| `IFlow1UnitOfWork` / `Flow1UnitOfWork` | Một SQL transaction + request applock; horse locks theo thứ tự; rollback/clear tracker |
| `Flow1ContractFactory` | Draft mới VND, tỷ lệ 40%, chưa Trip; bảo toàn default/giá trị legacy ở entity |
| `IFlow1MetadataStore` / `LocalFlow1MetadataStore` | Private JSON revision/audit, expectedVersion, operation idempotency, cross-instance lock và atomic rename |
| `IntegrationContracts.cs` | Hợp đồng đầu vào/ra cho geocode/routing, PDF và payment gateway; chưa giả lập provider thật |
| `ApiResponse`, `BusinessRuleException`, middleware | ErrorCode optional, HTTP status và dictionary errors; không phá caller cũ |
| `Flow1ServiceExtensions`, `Program.cs` | DI foundation; không startup migration, không tạo API nghiệp vụ chưa hoàn thành |
| `WebApi.csproj`, `.gitignore` | Giữ template runtime; private App_Data không đưa vào Git/publish |
| `contracts/API-Flow/FLOW1_IMPLEMENTATION_PLAN.md` | Plan 2.0: bỏ 12 bảng, chia 6 giai đoạn, ghi rõ SQL/file recovery |
| `FLOW1.md`, `CONVENTIONS.md` | Đồng bộ policy cọc 40%, preparation sàn, scope hồ sơ và error shape hiện có |

## 3. Kiểm chứng đã chạy

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

| Bộ kiểm tra | Kết quả |
|---|---|
| Flow1.Tests | **32 passed, 0 failed, 0 skipped** |
| Registration.Tests | **47 passed, 0 failed, 0 skipped** |
| Tổng | **79 passed, 0 failed, 0 skipped** |
| Build active projects qua test command | Thành công |
| Publish smoke | Có DOCX/manifest trong output; không có private App_Data |

SQL tests dùng DB mới `RaceHorseFlow1Test_<GUID>`; registration dùng DB test riêng của bộ
registration. Test helper chỉ cho SQL Server local, xác minh tên generated trước khi DROP.
Không sửa `HorseTransportDB` để làm test pass.

Các bằng chứng nghiệp vụ nền chính:

- Draft lưu được với RequestID và TripID null; chưa có Trip.
- Legacy Contract giữ USD, total và SignedAt sau backfill; deadline vẫn null.
- DAO stage không commit sớm; lỗi giữa cập nhật Request/Contract/Payment/Trip rollback tất cả.
- Hai DbContext cùng tạo Trip cho một Request được request lock tuần tự hóa; chỉ một Trip.
- Unique index vẫn chặn duplicate Trip/invoice cọc khi không đi qua UoW.
- File store giữ history qua instance mới, không mất payload sau dispose JSON, chặn traversal,
  chống stale/concurrent write và key reuse khác payload; file quá lớn không phá bản trước.
- Error envelope cũ giữ shape; middleware trả đúng mã lỗi và HTTP business status.
- Registration API/service/SQL regression qua toàn bộ 47 test; không suy từ build đơn thuần.

Đây là kiểm chứng foundation, chưa phải E2E Flow 1, chưa có live Maps/VNPay/OTP hợp đồng.

## 4. PDF spike: đạt tiêu chí kỹ thuật giai đoạn 1

Đã giữ nguyên mẫu DOCX runtime trong `backend/WebApi/Resources/Contracts/v1/`, tạo manifest
SHA-256 và 67 placeholder; đã thêm `backend/tools/Invoke-ContractPdfSpike.ps1` với fixture demo.

Theo lựa chọn của đại ca, đã chuẩn bị **LibreOffice 26.8.1.1** bằng administrative extraction
trong private App_Data của dự án. Không cài ứng dụng desktop hoặc đổi file association.
Installer được pin phiên bản và kiểm SHA-256 theo manifest chính thức. Không còn dùng Word/WPS COM.
Hướng dẫn tái hiện: `backend/tools/PDF_SPIKE.md`; provisioner: `Install-Flow1LibreOffice.ps1`.

Kết quả tại `backend/WebApi/App_Data/flow1/pdf-spike-libreoffice-qa/`:

- PDF **12 trang, 673.695 byte**, đã render PNG và kiểm tra trực quan đủ 12 trang.
- Thay **109 lần xuất hiện của 67 placeholder**; không còn placeholder chưa bind.
- Font tiếng Việt, bảng và số trang đọc được; không thấy chữ chồng hoặc bảng bị cắt ngang ô.
- Bản sinh thêm `cantSplit` cho hàng bảng và PAGE field vào footer có sẵn; template gốc không đổi.
- Template SHA-256: `b2deebd4d0dafebc7e5b46332e76bd2935b4679390b0c5a167bafcac5960818c`.
- PDF SHA-256: `8fdce76e7f76a0b712d41d3e08108204642d730ed56e83ae95523b7004858b0c`.
- Log, DOCX đã bind, extracted text và `spike-result.json` được giữ cùng thư mục private.

Đây là **bản render thử kỹ thuật**, không phải hợp đồng đã ký hoặc được phép phát hành.
Đã kiểm chứng runtime Windows local; runtime deploy, .NET adapter, giới hạn concurrency và
vòng đời file bất biến vẫn thuộc giai đoạn 4.

Template còn cần chỉnh ở giai đoạn 4: bổ sung CompletionDeadline; bỏ mã OTP thô và các nhãn
đã ký số/OTP VERIFIED đang cố định; dùng Request/plan khi chưa Trip; không đánh dấu đã bàn giao
hoặc đối soát microchip trước sự kiện. Phụ lục hiện còn nhãn USD và tự hủy sau 24 giờ không
đúng policy deadline đã chốt. `productionReady` tiếp tục là `false` cho tới khi version hóa
và sửa nội dung này. Spike không xác nhận nội dung pháp lý/nghiệp vụ của template.

## 5. Đánh đổi cần giữ khi làm tiếp

- Metadata và SQL không cùng transaction. File store có atomic write riêng, **không phải**
  SQL transactional outbox. Các giai đoạn ký/tiền phải có immutable prepare + receipt/recovery
  và test crash tại các khoảng chuyển trước khi được nghiệm thu.
- SQL giữ SignedAt/status, tiền và Trip. Không dùng metadata để tự đánh Payment SUCCESS.
- Local file storage chỉ hỗ trợ filesystem chung có locking; chưa hỗ trợ nhiều server ổ riêng.
- Backup/restore phải bao gồm SQL, metadata, PDF và templates; API file phải có ownership.
- Chưa áp migration lên DB nghiệp vụ. Khi triển khai API Contract cần chọn DB mục tiêu,
  backup và áp script có kiểm soát theo `backend/database/README.md`.

## 6. Trạng thái bàn giao

- [x] Chốt thiết kế hai cột mới + nullable Trip; không thêm bảng.
- [x] Migration/entity/DAO/UoW và metadata version/audit có kiểm chứng.
- [x] Auth regression và test SQL thật pass.
- [x] Plan/API docs chuyển sang phương án tối thiểu.
- [x] Có converter xuất PDF mẫu thành công và QA font/bố cục đủ 12 trang.
- [x] Đóng giai đoạn 1 trong phạm vi nền tảng đã chốt.

Chưa implement giai đoạn 2–6, chưa commit/push/deploy. Thay đổi có sẵn ở
`frontend/vite.config.ts` được giữ nguyên.
