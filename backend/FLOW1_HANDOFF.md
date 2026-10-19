# Bàn giao Flow 1 — 19/10/2026

Backend thực hiện: yêu cầu → manager nhận xử lý cố định → xét duyệt → phát hành PDF → xác minh cọc 40% → ký OTP → tạo đúng một Trip → phân công Specialist và Coordinator. Một hạn chung 24 giờ cho cọc, xác minh và ký; gửi lại OTP không gia hạn.

## Chạy và kiểm tra Swagger

Mở `http://localhost:5129/swagger/index.html`. Backend hiện chạy trực tiếp từ checkout này, dùng `HorseTransportDB` trên `.\SQLEXPRESS`. Container backend cũ đã dừng để tránh chiếm cổng 5129. Không chạy đồng thời hai backend trên cùng cổng.

Khi cần khởi động lại, mở PowerShell tại repository:

```powershell
./backend/tools/start-flow1-local.ps1
```

Script chạy ở terminal hiện tại; Ctrl+C để dừng. Cấu hình riêng SMTP/VNPay/issuer/private files vẫn lấy từ cấu hình local hiện có; không đưa bí mật vào source. Layout PDF được code dựng, không cần Word trong `data`. Windows dùng Chrome/Edge; môi trường khác cần cấu hình browser hoặc LibreOffice.

Đăng nhập bằng `POST /api/Auth/login`, lấy `data.accessToken`, rồi **Authorize** trong Swagger. Đổi token khi đổi vai trò. Các ID trong ví dụ Swagger là chỗ cần thay bằng ID thật.

| Thứ tự | Vai trò | Thao tác |
|---|---|---|
| 1 | Customer | Tạo ngựa bằng multipart, lấy danh sách ngựa selectable; tra địa điểm và tính estimate. Tạo request với lịch đón/giao còn đủ thời gian chuẩn bị. |
| 2 | Manager | GET requests; POST `requests/{id}/claim`. Manager đầu tiên nhận xử lý sẽ phụ trách cố định. Accept/reject/request-changes đều lưu lý do phù hợp và gửi thông báo. Customer có thể gửi revision khi cần sửa. |
| 3 | Manager | GET/POST/PUT `clauses`: mỗi `clauseId` là một điều khoản nguyên văn; `isActive=false` để ngừng sử dụng. Không xóa nội dung hợp đồng đã phát hành. |
| 4 | Manager | Accept request; POST `requests/{id}/contracts` với giá VND nguyên và preparationDays; POST `contracts/{id}/publish` kèm clauseIds đang hoạt động. |
| 5 | Customer | GET contract và PDF. Có thể POST feedback trước khi bắt đầu thanh toán, chỉ rõ fields cần sửa: PRICE, PREPARATION_DAYS, DEPARTURE_AT, DELIVERY_AT, CLAUSES, DEADLINE. |
| 6 | Manager | Có thể reject feedback kèm lý do hoặc reissue. Reissue cập nhật cùng ContractID, kiểm tra lại lịch/ngựa/thời gian chuẩn bị, tính lại cọc, phát hành PDF mới và vô hiệu OTP cũ. Feedback mới nhất được lưu tại contract. |
| 7 | Customer | POST `contracts/{id}/vnpay`, mở paymentUrl. Return URL không xác nhận đã thu tiền; IPN hợp lệ/đối soát mới cập nhật tiền. GET contract/payment status cho đến PENDING_SIGNATURE. Chưa tạo Trip ở bước này. |
| 8 | Customer | POST OTP với version và pdfSha256 hiện hành; GET lại contract; POST sign với version mới, pdfSha256 và mã trong email. Hợp lệ thì EFFECTIVE, request ACTIVATED và có Trip PLANNING. |
| 9 | Manager | GET staff/operational; POST `contracts/{id}/deployment/{operation}` chọn operation=confirm và hai ID nhân sự đúng vai trò. Dùng **trip.version**. |
| 10 | Nhân sự được gán | GET operations/flow1/trips; xem hồ sơ/PDF và ack bằng trip.version + eventId. Nhân sự khác không thấy chuyến và không tải được tệp. Flow 2/3 xử lý tiếp ngoài phạm vi này. |

`version` trong API là token chống ghi đè dữ liệu đồng thời, **không phải phiên bản hợp đồng để lưu lịch sử**. Mỗi lần thao tác thành công hãy dùng token mới trả về hoặc GET lại. Draft dùng request.version; feedback/publish/sign dùng contract.version; deployment/ack dùng trip.version.

Khi feedback chỉ đề nghị sửa giá/lịch, phải giữ nguyên các điều khoản đã phát hành. Nếu catalogue đã sửa nguyên văn điều khoản đó, cần đề nghị thay CLAUSES; hệ thống không âm thầm thay điều khoản của PDF cũ. Hợp đồng cũ không có metadata chọn điều khoản sẽ trả DATA_REVIEW_REQUIRED thay vì tự suy đoán.

Manager extend thay hạn chung cho cả cọc và ký, trong giới hạn chuẩn bị; hạn hiện hành đọc từ API. PDF đã phát hành vẫn giữ nguyên bytes. Muốn thay điều khoản phải thu hồi và phát hành lại khi chưa có tiền/giao dịch chưa xử lý. Hợp đồng đã ký không được sửa.

## Hủy và hoàn cọc trước ký

Customer gọi cancellation/request; Manager dùng cancellation/{operation}: approve hoặc reject. Nếu đã thu tiền, approve chỉ tạo RefundStatus=REQUESTED. Sau đó refund-start → PROCESSING; refund-complete cần `target` là mã tham chiếu hoàn tiền đã được kiểm chứng → COMPLETED/CANCELLED. Đây là ghi nhận hoàn tiền do người phụ trách thực hiện riêng, **không gọi ngân hàng để chuyển tiền**. Tiền/giao dịch chưa đối soát phải được xử lý trước. Dữ liệu tiền đã nhận không bị xóa.

## Database và tài liệu

Đã áp dụng `backend/database/009_flow1_final_workflow.sql` vào HorseTransportDB sau khi backup, VERIFYONLY, khôi phục thử và chạy thử migration.

| Bảng | Bổ sung |
|---|---|
| TRANSPORT_REQUEST | AssignedManagerId (FK USER), ReviewedAtUtc |
| CONTRACT | CustomerFeedback, FeedbackFields, FeedbackStatus, FeedbackAtUtc, ManagerFeedback, FeedbackHandledAtUtc; RefundAmount, RefundStatus, RefundReference |
| TRIP_PLAN | AssignedSpecialistId và AssignedCoordinatorId, mỗi cột là một FK riêng đến USER |

Không thêm bảng; không thêm cột nội dung hợp đồng; không CONTRACT_CLAUSE/audit/history. Có ba FK mới và các CHECK cho feedback/refund. Version cũ của CONTRACT_TEMPLATE được giữ tương thích schema, không dùng quản lý lịch sử. Không chuyển đổi hoặc xóa các dòng điều khoản/hợp đồng cũ.

Đối chiếu trước/sau: **27 bảng, 305 cột gốc khớp dữ liệu**, số bảng giữ nguyên; DBCC CHECKDB sạch. 27 gồm bảng kỹ thuật SQL diagram. Đã kiểm tra và khôi phục đủ **10/10 tệp private đúng SHA-256** cho tham chiếu dữ liệu hiện tại.

Backup: `A:\SQL2019\MSSQL15.SQLEXPRESS\MSSQL\Backup\HorseTransportDB_flow1_675fc1349f6445af8aad36f11ce42fa7.bak`. Bản khôi phục kiểm tra vẫn giữ tại `RaceHorseFlow1BackupCheck_675fc1349f6445af8aad36f11ce42fa7`. Không tự restore đè database hiện tại.

SRS cập nhật: `data/SE2040_Group2_ASM2_Flow1_Updated.docx`; ERD: `data/Database_design.drawio`. File SRS gốc đang bị ứng dụng khác khóa nên giữ nguyên và tạo bản cập nhật riêng. Hai tài liệu có trong workspace nhưng thư mục data đang được Git ignore. SRS cập nhật Flow 1, business rules, chức năng và mô tả cột/FK; các luồng khác giữ nguyên phạm vi.

Các hợp đồng cũ SIGNED/EFFECTIVE/EXECUTING/... được giữ nguyên, không tự chuyển thứ tự ký/cọc hoặc tự tạo chuyến. Kiểm thử luồng mới bắt đầu từ request mới; trường hợp cũ thiếu bằng chứng cần xử lý nghiệp vụ riêng.

## Kiểm thử và bằng chứng

```powershell
dotnet build backend/Backend.slnx
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx
```

Build: **0 warning, 0 error**. Flow1: **125 passed, 0 failed, 0 skipped**; Registration: **47 passed, 0 failed, 0 skipped**. Test database là các database tạm có tên riêng, không chạy dữ liệu giả vào HorseTransportDB. `LocalSqlFactAttribute.cs` chỉ bỏ qua test cần SQL khi chưa đặt biến RACEHORSE_TEST_SQL_SERVER; đặt biến như trên để thực sự chạy đủ test.

Kiểm thử kết nối thật Kestrel/SQL/JWT/Swagger: **77 HTTP checks** và thao tác Try-it-out trên giao diện Swagger đã qua. Bao gồm chuỗi cọc → OTP → Trip, callback lặp, phân quyền manager/nhân sự, request revision/reject, feedback/reissue/reject, tải private files, notification/read và hủy/hoàn cọc trước ký. Các lỗi nghiệp vụ 401/403/409 dự kiến được kiểm tra đúng; không có HTTP 500 trong các bước đã kiểm thử. PDF đã parse strict và render kiểm tra bố cục/tiếng Việt.

Bằng chứng: `backend/WebApi/App_Data/flow1/final-swagger-qa/results.json`, ảnh Swagger và PDF trong cùng folder; log/trx và đối chiếu DB tại `C:\Users\admin\AppData\Local\Temp\racehorse-flow1-audit`. Test kết nối dùng SMTP nhận trong RAM, maps fixture và IPN VNPay ký bằng khóa test; chưa xác nhận callback VNPay công khai hoặc giao dịch/hoàn tiền thật.

Để chạy lại kiểm thử kết nối (cần Node + Playwright, xem args đầu file): `backend/tools/Flow1SwaggerHarness` tạo/xóa SQL fixture, `backend/tools/flow1-swagger-e2e.cjs` chạy backend thật và browser. Không dùng DB nghiệp vụ cho fixture.

## Phạm vi giữ lại

Không sửa frontend; các thay đổi frontend vốn có trước phiên vẫn giữ nguyên. Không commit/push. Phần tài khoản/thống kê chưa thay đổi theo yêu cầu. Không triển khai nghiệp vụ Flow 2/3 ngoài phần bàn giao phân công của Flow 1.

Các file chính để review: Domain/Flow1/FlowRows.cs (cột); Application/DTOs/Flow1/RelationalDtos.cs (payload); Application/Services/Flow1/Relational (nghiệp vụ); Infrastructure/Data/Context (mapping/guard schema); Infrastructure/ExternalServices/Flow1/CodeContractDocumentGenerator.cs (PDF); WebApi/Controllers/Flow1/Relational/Flow1Controllers.cs và WebApi/Extensions/Flow1SwaggerExamples.cs (API/Swagger); tests/Flow1.Tests (kiểm thử).
