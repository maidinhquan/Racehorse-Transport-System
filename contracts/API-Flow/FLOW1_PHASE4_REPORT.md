# Flow 1 phase 4 — PDF publication increment A

Ngày: **16/10/2026**. Nhánh `Truong`. Commit trước lượt này:
`d226a59f965203749ae27464dd1b0808b781ce37` (phase 3).

**PHASE 4 ĐANG THỰC HIỆN, CHƯA HOÀN THÀNH.** Lượt này triển khai phần phát hành PDF
bất biến, deadline gốc và recovery của publication. OTP/sign/decline, receipt ký +
Invoice và extension vẫn là phần tiếp theo của **chính phase 4**, chưa chuyển phase 5.
Không tạo endpoint hoặc nút ký giả để đánh dấu hoàn tất.

## Phần đã triển khai

- Manager phát hành current Draft với `expectedReviewVersion`, `Idempotency-Key` và
  completion deadline. Backend kiểm lại request/plan/Draft, pending change/review,
  hồ sơ, lịch ngựa, giá VND/cọc 40% và khoảng chuẩn bị trước departure.
- Converter chạy **trước SQL mutation transaction**. Khi lỗi, request giữ ACCEPTED,
  contract giữ DRAFT. Sau render, lấy request + horse locks và kiểm lại toàn bộ version
  trước PREPARED và SQL commit; kết quả render cũ không được âm thầm phát hành.
- SQL chuyển `PENDING_SIGNATURE` / `AWAITING_CONTRACT`, lưu CompletionDeadline UTC;
  **SignedAt và TripID vẫn NULL**, không có Invoice/Trip trong increment này.
- File PDF content-addressed nằm trong private file store; hash/size được kiểm khi
  tải. Metadata publication giữ frozen public model, Draft hash, source/template
  version, patch hash, PDF hash, actor/key/input hash và outcome.
- Customer và Manager xem/tải cùng PDF qua API có role/ownership và `no-store`;
  Customer không nhận storage key, model nội bộ hoặc cost/floor.
- Giao diện Manager có deadline (giờ Việt Nam UTC+7), phát hành, recover/discard.
  Customer xem deadline/hash, mở PDF qua authenticated blob và tải đúng bản đó.
  Reload đọc trạng thái từ backend. Quá hạn hiển thị khóa thao tác mới, không tự hủy.
- Issuer profile lấy từ cấu hình server; thiếu trường bắt buộc trả 503, không tự bịa
  công ty/tài khoản ngân hàng. Harness dùng thông tin hư cấu có nhãn DEMO.

## Template và adapter

`backend/WebApi/Resources/Contracts/v1/contract-template.docx` giữ nguyên SHA-256
`b2deebd4d0dafebc7e5b46332e76bd2935b4679390b0c5a167bafcac5960818c`.
Version mới là **bản vá OOXML dạng text** `Resources/Contracts/v2/template-patch.json`,
không commit DOCX/PDF sinh ra. Source checksum ngăn áp patch theo paragraph index lên
một nguồn không đúng. JSON patch được publish cùng app theo Content rule hiện có.

Đã bổ sung CompletionDeadline và selling lines; dùng Request/plan thay Trip chưa tồn
tại; bỏ mã OTP thô, nhãn đã ký số/OTP VERIFIED, trạng thái thú y/microchip/bàn giao
đã hoàn thành; đổi nhãn USD và clause tự hủy 24h. Annex 1 lặp đủ từng ngựa, STT 01/02;
thông tin sức khỏe ghi rõ cần thẩm định riêng. PDF không thay sau khi phát hành.
Các điều khoản song ngữ còn lại của template tham chiếu được giữ; việc render không
phải phê duyệt pháp lý/vận hành của các điều khoản đó hoặc triển khai các đợt 30/30.

.NET `IFlow1ContractDocumentGenerator` dùng ZIP/XDocument, không có Python runtime
dependency trong ứng dụng. LibreOffice path explicit, Windows dùng `soffice.com` theo
[CLI chính thức](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).
Mỗi process chỉ chuyển đổi một job tại một thời điểm; mỗi job có profile riêng,
timeout tối đa 120 giây (default 90), kiểm file PDF và hash, chặn work root wwwroot.
Đây là giới hạn **mỗi process**, không phải distributed conversion queue.

Đã tái hiện CLI exit 0 nhưng không xuất PDF khi profile lồng dưới path dài; ngay cả
spike v1 cũ cũng thất bại với output path dài đó. Profile ngắn trong user temp khắc
phục được. Cả adapter .NET và Python spike dùng profile ngắn và cleanup; failed jobs
giữ private để chẩn đoán, cleanup có retry giới hạn và private pending log. Không đưa
log/docx/profile/binary/PDF/PNG vào Git hoặc publish output.

## SQL/file recovery

1. PDF private được chuẩn bị và kiểm hash trước transaction; chưa công bố cho Customer.
2. Trong request lock: recheck canonical/plan/Draft/review versions, frozen Draft hash,
   status, pending changes, price, deadline và hồ sơ/lịch; append publication PREPARED.
3. Một SQL transaction cập nhật Contract deadline/status và Request status.
4. Read/retry/recover đối chiếu SQL After và PDF, append COMPLETED receipt. Khi SQL đã
   commit, không rollback giả hoặc render lại PDF. Nếu SQL còn Before, Manager recover
   phải validate lại thời gian/hồ sơ/lịch; hoặc discard PREPARED với lý do lưu audit.
5. Review/Draft mutations bị chặn khi còn publication PREPARED. Discard không được
   dùng sau SQL commit. Retry key bị ABORTED vẫn bị chặn sau nhiều lần discard khác,
   không chỉ kiểm key của revision cuối.

SQL vẫn là nguồn status/deadline, file không có distributed transaction với SQL.
Render bị bỏ dở trước PREPARED có thể để lại private orphan bytes; chưa có garbage
collector và không được xóa theo tuổi đơn thuần vì PDF đã phát hành phải giữ bất biến.
Metadata thiếu/hỏng, giá/terms mismatch hoặc PDF hash sai sẽ fail closed.
Recovery trên đây **chỉ cho publication**, chưa phải acceptance/invoice/payment recovery.

## API thực tế

Prefix `/api`; role Manager là `LOGISTICS_MANAGER`. Publication version trong response
là version tài liệu/Draft, khác review version và revision count của publication sidecar.

| Quyền | API | Kết quả |
|---|---|---|
| Manager | POST `/manager/contracts/{id}/send` | `{expectedReviewVersion, completionDeadline}` + Idempotency-Key; issued public view |
| Manager | GET `/manager/contracts/{id}/publication` | Null khi chưa chuẩn bị/đã discard; recoveryRequired khi PREPARED chưa commit |
| Manager | POST `/manager/contracts/{id}/publication/recover` | Tiếp tục đúng immutable prepare, không tạo PDF mới |
| Manager | POST `/manager/contracts/{id}/publication/discard` | `{reason}`, chỉ SQL Before; reason được audit |
| Manager | GET `/manager/contracts/{id}/pdf` | Private PDF đúng hash, no-store |
| Customer | GET `/customer/contracts/{id}/publication` | Chỉ own contract; PREPARED chưa commit nhận 409 |
| Customer | GET `/customer/contracts/{id}/pdf` | Chỉ PDF đã issue; owner khác 404 |

`send` hiện có nghĩa **phát hành vào tài khoản Customer trên ứng dụng**; chưa gửi email
hay OTP. Không gọi email sender đăng ký vì sender Development cũ log OTP thô, trái
policy OTP hợp đồng. Không có raw OTP/challenge trong increment này.

## File và layer

| Đường dẫn từ gốc repository | Trách nhiệm |
|---|---|
| `backend/Application/Common/Flow1/Flow1ContractOptions.cs` | Runtime và issuer config |
| `backend/Application/DTOs/Flow1/ContractPublicationDtos.cs` | Publication/frozen model/public view |
| `backend/Application/Interfaces/Flow1/IntegrationContracts.cs` | Document result thêm patch hash optional, giữ tương thích adapter contract |
| `backend/Application/Services/Flow1/ContractPdfModelBuilder.cs` | Chỉ bind dữ liệu thực từ User/request/Draft; số tiền backend, đủ ngựa, không cost nội bộ |
| `backend/Application/Services/Flow1/ContractPublicationService.cs` | Publish/recover/discard/read/hash guards |
| `backend/Application/Services/Flow1/RequestReviewService.cs` | Chặn sửa review/Draft khi publication PREPARED |
| `backend/Domain/Interfaces/DAOs/IFlow1Repository.cs` và `backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs` | Read Customer profile để bind PDF, không thêm SQL field |
| `backend/Infrastructure/ExternalServices/Flow1/LibreOfficeContractDocumentGenerator.cs` | Bind retained DOCX + patch, convert, private content-addressed PDF |
| `backend/WebApi/Controllers/Flow1/ContractPublicationController.cs` | Role/owner-scoped API và private download |
| `backend/WebApi/Extensions/Flow1CustomerExtensions.cs` | DI options/service/adapter |
| `backend/WebApi/Resources/Contracts/v2/*` | Patch và semantics/ops notes |
| `backend/WebApi/appsettings.Local.example.json` | Keys config mẫu trống; không sửa local config thật |
| `frontend/src/features/flow1/ContractPublicationPanel.tsx`, `publicationApi.ts` | Manager publication/recovery, Customer PDF reader |
| `frontend/src/features/flow1/ManagerPages.tsx`, `CustomerReviewPanel.tsx` | Tích hợp vào request detail thật, status-aware labels |
| `backend/tests/Flow1.Tests/ContractPublicationTests.cs` | 6 SQL/API tests + 1 real LibreOffice test |
| `frontend/src/features/flow1/ContractPublicationPanel.test.tsx` | 3 test version/key/timezone, overdue read-only, recover |
| `backend/tools/Flow1BrowserHarness/Program.cs`, `flow1-browser.cjs` | Opt-in phase 4 PDF acceptance bằng converter thật, DB/files riêng |
| `backend/tools/contract_pdf_spike.py`, `PDF_SPIKE.md` | Sửa profile path cho spike và ghi nhận runtime đã xác minh |

## Kiểm chứng

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE = (Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

Kết quả bản cuối: **152 pass = Flow1 105 + Registration 47; 0 fail/skip**.
SQL tests chỉ dùng controlled disposable DB local; không migrate/seed/reset HorseTransportDB.
Bao gồm quyền/owner, stale version, deadline bảo toàn prep, issuer thiếu, converter lỗi,
parallel issue, replay/key misuse, PREPARED-before-SQL, SQL-before-receipt, SQL CHECK
rollback cả status/deadline, multiple aborted keys, revalidation sau quá hạn và PDF corrupt.

Tại frontend: `npm run test:run` **14 pass**, `npm run build` **PASS**,
`npx eslint src/features/flow1 src/app/router/AppRouter.tsx` **PASS**.

Real .NET/LibreOffice two-horse PDF:
`backend/WebApi/App_Data/flow1/phase4-pdf-qa-d92fc247b16245cfb61ff72d148948e4/`.
Đã render PNG 110 DPI và xem **đủ 13 trang**: không thấy text/table bị cắt, font Việt
đọc được, STT 01/02 và cả hai microchip có đủ, footer PAGE 1–13. Đúng tổng 115 triệu,
cọc 46 triệu và deadline 10/11/2026; không còn placeholders/USD/OTP VERIFIED/
DIGITALLY SIGNED/MATCHED. Fixture này độc lập với browser, không có Customer thật.

Chrome nối FE/API/SQL/private files + converter thật **PASS** tại:
`backend/WebApi/App_Data/flow1/browser-da883478056948fc8e51b72bf76aaa8d/`.
Manager phát hành Draft sau chuỗi review/revision/change phase 3; Customer mở PDF và
tải file có SHA-256 trùng metadata, reload giữ AWAITING_CONTRACT. SQL có 1 published
contract chưa ký + 1 superseded, đúng deadline, 0 Invoice/Trip. 0 page errors, 0 browser
direct provider calls. Maps trong lượt này là HTTP fixtures có nhãn, không live.
Đã xem screenshots Manager/Customer sau phát hành. PDF browser cũng qua pypdf content
check tổng 100 triệu/cọc 40 triệu, đúng fictional owner/issuer, không placeholders hoặc
nhãn hoàn thành giả. JWT fixture và DB/files riêng không kiểm login/production.
Guard bổ sung sau browser đối chiếu owner giữa publication/Contract/Request được kiểm
bằng API/SQL test, gồm cả dữ liệu SQL bị đổi owner sai quan hệ; UI/renderer không đổi.

Python v1 spike sau fix profile cũng **PASS** (12 trang, 109 binding, source hash giữ
nguyên) tại `backend/WebApi/App_Data/flow1/phase4-spike-fixed-ebad38fe4f9c432f9590d4d6dad7d839/`;
đây là regression kỹ thuật v1, không thay visual QA của template v2 nêu trên.

Lượt Chrome đầu hết waitForResponse mặc định 30 giây khi converter
đang chạy; timeout riêng của harness được nâng lên 120 giây, vẫn giữ timeout converter
90 giây và rate limit production. Một lượt build đồng thời API browser đang chạy gặp
DLL copy retry trên Windows; các lượt cuối chạy nối tiếp để kiểm đúng binary mới.

## Việc còn lại của phase 4 — bắt đầu ở lượt kế tiếp

1. Email OTP riêng: RNG 6 số, HMAC server secret, challenge gắn owner/Contract/version/
   PDF hash; TTL <=5 phút/deadline, resend 60s, 5 attempts, account/contract/IP limits.
   Không reuse Development registration sender có log OTP, không raw code trong
   metadata/outbox/log. Dùng test sink in-memory/sandbox; SMTP live chưa được kiểm ở lượt này.
2. Sign với request lock/current version/hash/deadline/pending-change checks; prepare
   acceptance evidence, SIGNED/SignedAt/AWAITING_DEPOSIT + đúng một DEPOSIT Invoice trong
   SQL; receipt/reconciliation/fault tests trước nghiệm thu. Chưa tạo Trip ở phase 4.
3. Decline và expired-before-sign/new version; Manager extension history old/new/actor/
   reason/time. Effective deadline đọc extension, giữ original deadline/PDF/SignedAt;
   signed overdue không tự CANCELLED. Public `Overdue` hiện tính hạn gốc, cần mở rộng
   khi có extension, chưa công bố extension đã hoạt động.
4. Thay route contract mock cũ bằng page PDF/OTP thật; hiện reader thật nằm inline
   trong request detail. Bổ sung Customer/Manager browser cho sign/decline/extension,
   wrong/stale/expired OTP, retry/reload và crash trước/sau SQL ký/invoice.
5. Trước dùng ngoài harness: cấu hình `Flow1:Contracts:LibreOfficePath` và issuer profile
   theo file example; không đưa placeholder DEMO của harness vào hợp đồng người thật.
   Kiểm runtime deploy/fonts/SMTP và nội dung điều khoản vận hành riêng trước production.

Không đổi schema, không push/deploy/PR, không gửi email/SMS hoặc giao dịch tiền thật.
Local Maps config và staged Vite entry của đại ca giữ nguyên, không vào commit này.
Lịch hai tiếng vẫn cần tiếp tục **phase 4**, không pause và không chuyển phase 5.

Cleanup riêng hai profile tạm do chẩn đoán/cancel tạo ra đã bị automatic approval review
chặn với lý do `blocked by policy`; giữ nguyên, không thử cách xóa thay thế. Hai folder
trong user temp: `rhpdf-786213f7676f4c20b593c262a8852a0a` và
`rhpdf-e7dd1c6ebbeb4b03a281049749b3c860`. Đây không phải blocker chức năng publication.
