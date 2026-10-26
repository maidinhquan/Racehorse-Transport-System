# Backend Flow 1 — bản tái cấu trúc

Nhánh `Refactor-Flow1`, nền `Truong` tại `cacc5be`. Cập nhật 24/10/2026.

## Điểm bắt đầu đọc code

| Đường dẫn tính từ backend | Vai trò |
|---|---|
| `WebApi/Controllers/Flow1/` | Action theo tài nguyên, nhận DTO/principal, gọi service, trả HTTP; không tính giá hoặc đổi trạng thái trực tiếp. |
| `Application/Flow1/Dtos/` | Một input/form nghiệp vụ mỗi file; từ chối thuộc tính JSON không khai báo. |
| `Application/Flow1/Services/` | Quyền, nghiệp vụ, điều kiện chuyển trạng thái và ranh giới transaction. |
| `Application/Flow1/Mapping/` | Chiếu response từ dữ liệu lưu; không tự cấp ID, giả thời điểm hoặc dựng lại hợp đồng cũ. |
| `Application/Flow1/Interfaces/` | Cổng persistence, maps, OTP, PDF, private files và VNPAY; mỗi type riêng file. |
| `Application/Flow1/Rules/BusinessRules.cs` | Lỗi nghiệp vụ có HTTP status/errorCode và kiểm tra invariant. |
| `Application/Flow1/Settings/CostSettings.cs` | Giả định nhân sự/sức chứa phải cấu hình rõ; không mặc định ngầm 2 người/1 bác sĩ. |
| `Domain/Flow1/Entities/` | 17 entity phục vụ Flow 1, mỗi bảng một file, không sửa entity auth dùng chung. |
| `Infrastructure/Flow1/Configurations/` | 17 mapping riêng: tên bảng/cột, kiểu SQL, NULL, default và khóa. |
| `Infrastructure/Flow1/Data/RequestContext.cs` | Nạp mapping và quan hệ/unique index của module. |
| `Infrastructure/Flow1/Data/SqlSession.cs` | Transaction Serializable và khóa ghi ngắn của module; không gọi SMTP/maps/PDF khi giữ transaction. |
| `Infrastructure/Flow1/Data/SchemaCheck.cs` | Kiểm tra schema Reviewed, constraint/FK, sequence và unique index trước lần dùng đầu tiên; không tự migration. |
| `Infrastructure/Flow1/Files/LocalFileStore.cs` | Private bytes, kiểm chữ ký file, kích thước và tính toàn vẹn; không phục vụ đường dẫn tùy ý. |
| `Infrastructure/Flow1/Documents/ContractRenderer.cs` | HTML từ snapshot đã chốt, escape nội dung, chuyển PDF bằng browser và lưu private bytes. |
| `WebApi/Extensions/Flow1/ServiceRegistration.cs` | Wiring duy nhất cho runtime mới: `AddRequestModule`. |
| `WebApi/Extensions/Flow1/ProviderRegistration.cs` | Adapter bản đồ/VNPAY/SMTP hiện có, được tái sử dụng qua các port mới. |
| `tests/Flow1.Rebuild.Tests/` | SQL Reviewed thật trong database tạm riêng + HTTP integration và kiểm thử PDF thật. |

`IDataSession` là cổng query/write chung; service giữ điều kiện nghiệp vụ. Chưa tách thêm repository riêng từng aggregate vì các truy vấn hiện tại ngắn và dùng cùng một context/transaction. Các danh sách chưa có phân trang; không có query phân trang trong 65 operations nguồn.

## Các service chính

| File trong Services | Trách nhiệm |
|---|---|
| AccessService | Tài khoản active/role và quyền sở hữu; tài nguyên khác chủ trả 404. |
| CatalogService, PolicyService, LocationService | Danh mục hoạt động, policy có kiểu/đơn vị/phạm vi, tìm địa điểm theo COUNTRY. |
| DirectoryService | Profile, khách hàng và nhân sự; không trả credential. |
| HorseService, HorseAvailabilityService, HorseFilesService | Hồ sơ ngựa, xung đột lịch, quyền sửa và file riêng. |
| RequestService | Gửi đầy đủ request và hồ sơ một lần; gửi lại CHANGES_REQUESTED; khóa chống trùng toàn bộ nội dung/file. |
| RequestDetailsService | Dữ liệu chi tiết từ request, version, payment và giấy tờ thật. |
| RequestDocumentsService, ChecklistService | Đọc hồ sơ chung/từng ngựa theo request; nhận hồ sơ qua POST/PUT request không đồng nghĩa VERIFIED. |
| RequestReviewService | Manager nhận queue chung: chấp nhận, yêu cầu sửa, từ chối. |
| SnapshotBuilder | Chốt đầy đủ nội dung thương mại/hai bên/ngựa/lịch/điều khoản/policy; không chứa giá vốn hoặc OTP. |
| ContractService | Soạn, lưu, phát hành, đọc version/PDF, chấp nhận điều khoản và phản hồi tự do. |
| ContractLifecycleService | Gia hạn metadata, nhắc việc, xóa draft; không sửa snapshot đã phát hành. |
| PaymentService | Session VNPAY, kiểm IPN, ghi bằng chứng tiền và cập nhật đúng invoice/version. |
| ContractSigningService | OTP gắn đúng version, giới hạn động, ký và tạo một Trip trong cùng transaction. |
| CancellationService | Hủy trước ký, quyết định hủy có tiền, lưu trạng thái trước hủy; cập nhật trạng thái hoàn tiền thủ công. |
| TripAssignmentService | Phân công, hold/resume trước khởi hành; giữ event/phân công, không tự duyệt Gate. |
| HandoffService | Bốn endpoint bàn giao cho nhân sự đúng phân công/event; không thực hiện nghiệp vụ Flow 2/3. |
| CostService | Dự toán Manager từ COST_RATE, tọa độ thật và giả định được cấu hình; không có giá demo Customer. |
| NotificationService | Thông báo IN_APP thật, đọc từng cái/đọc tất cả. |

## Quy tắc đang thực thi

- Request mới: PENDING_REVIEW → CONTRACT_PREPARATION → CONTRACT_READY → DEPOSIT_VERIFIED → ACTIVATED, cùng các nhánh sửa/từ chối/hủy.
- Ký hợp lệ: CONTRACT EFFECTIVE, CONTRACT_VERSION SIGNED, đúng một TRIP_PLAN PLANNING. Retry ký không tạo chuyến thứ hai.
- Chính sách: COUNTRY nước đến → TRANSPORT_MODE → GLOBAL. Cấu hình hiện hữu nhưng sai kiểu, đơn vị, miền giá trị phải báo lỗi; không bỏ qua để dùng mức thấp hơn.
- COUNTRY/SUPPORTED_ROUTE/COST_RATE/CONTRACT_TEMPLATE đọc từ SQL. Adapter bản đồ không khóa danh mục ở VN/JP; service kiểm nước/tuyến hoạt động.
- ID do DEFAULT + Sequence SQL cấp, cho phép khoảng trống. Không dùng MAX+1/hash làm khóa chính, không reset/cấp lại số. REQUEST_HORSE_MAPPING và CONTRACT_VERSION dùng khóa ghép.
- Toàn bộ tiền VND nguyên. Không cột RowVersion, DeclaredValueUsd, ContractCode, PdfSha256 hay FeedbackFields trong entity/mapping runtime mới.
- PDF và nội dung bản phát hành đọc từ version đã lưu. Gia hạn lưu ở metadata/currentDeadline, không sửa điều khoản/snapshot lịch sử. Bản seed SQL cũ được đọc nguyên trạng, không bù nội dung từ master hiện tại.
- Chấp nhận điều khoản lưu TermsAcceptedAtUtc của đúng version. Sai OTP vẫn commit tăng số lần thử. Không mã OTP cố định/bypass hay mock-sign/mock-deposit.
- Chỉ IPN đã kiểm chữ ký/merchant/tiền/reference được ghi nhận. Callback trùng không cộng tiền lại. Tiền đến sau hủy/hết hạn/khác phiên bản hoặc sau thông báo FAILED được giữ REVIEW_REQUIRED, không tự kích hoạt request.
- Không endpoint Manager xác nhận tiền thủ công. Hoàn tiền chỉ cập nhật RefundStatus; không gọi ngân hàng/chuyển tiền.
- File theo request/ngựa và quyền người dùng; có thêm GET customer/manager `/requests/{requestId}/documents/{recordId}` để tải chính xác giấy tờ upload, kể cả cùng loại có nhiều bản.

## Tên hướng dẫn chăm sóc và lưu ý sức khỏe

- API hồ sơ ngựa dùng `healthNotes` (thay `conditions`), lưu vào `HORSE.SpecialHealthNotes`.
- API tạo/cập nhật/đọc yêu cầu dùng `careInstructions` (thay `careNotes`), lưu vào `TRANSPORT_REQUEST.CareInstructions`.
- `horseNotes` vẫn là dictionary ghi hướng dẫn riêng cho từng HorseID trong yêu cầu, lưu vào `REQUEST_HORSE_MAPPING.CareInstructions`.
- Các field JSON cũ không còn được nhận bởi DTO runtime mới. Khi nối frontend cần dùng tên mới; endpoint và cột SQL giữ nguyên. Snapshot hợp đồng đã lưu không được sửa; snapshot mới dùng `healthNotes` cho ngựa.

## Hợp đồng API và giới hạn dữ liệu

65 method/path trong `data/Flow1/flow1.openapi.json` đều có đúng một action runtime, đã kiểm bằng EndpointDataSource. Có thêm hai đường tải medical record và bốn đường bàn giao integration được giữ lại. Các response chi tiết trả dữ liệu lưu thực tế; đây không phải chứng nhận toàn bộ payload khớp tuyệt đối schema ví dụ cũ.

- createdAt là UTC thực khi tạo; bản ghi cũ không rõ trả null. submittedAt chưa lưu riêng và vẫn thuộc unsupportedFields. Không lấy ExpectedDate giả làm ngày tạo/gửi.
- Horse color/fluDate/vetName/vetPhone không có cột tương ứng: null + unsupportedFields.
- Readiness của Gate/insurance/quarantine không do module Flow 1 triển khai: response trip trả null + unsupportedFields. Không bịa trạng thái đã sẵn sàng. Timeline/milestones và audit collections cũ không được dựng giả.
- Một số dữ liệu minh họa như company/supplements/companyDocs/complaints không có projection trong module này. Không đưa mảng rỗng giả để coi như đã triển khai Flow 2–6.
- Download payment receipt trả 501 PAYMENT_RECEIPT_UNAVAILABLE sau khi kiểm quyền: SQL Reviewed không lưu file biên nhận, IPN cũng không cung cấp PDF. GET payment vẫn có bằng chứng gateway. Không trả JSON detail giả làm file PDF.
- Create request dùng UUID Idempotency-Key, hash ở SubmissionKeyHash, scope theo customer. Cùng key không tạo request thứ hai. Việc so payload retry dựa các trường request đang lưu: nếu draft đã được sửa thì retry payload create ban đầu có thể trả 409. Schema không lưu fingerprint/payload create ban đầu; không lưu lén vào cột nghiệp vụ khác.
- Form/editor/contract response bổ sung trường phiên bản và snapshot đầy đủ; bản snapshot seed cũ có unsupportedFields khi thiếu cấu trúc thương mại mới. Frontend chưa được chỉnh/bind trong phạm vi này.

## Cấu hình và chạy

Không chạy migration cũ 000/001/002 để bổ sung lại cột đã bỏ. Trỏ `ConnectionStrings:Flow1` (hoặc DefaultConnection) vào database đã khởi tạo bằng Reviewed SQL. Ứng dụng không drop/recreate database.

| Cấu hình | Yêu cầu |
|---|---|
| Flow1:PrivateFiles:Root | Thư mục private ngoài web root; mặc định App_Data/flow1/private-bytes. Giữ bytes hiện có. |
| Flow1:Contracts:BrowserExecutablePath | Đường dẫn Chrome/Edge headless thật để phát hành PDF. |
| Flow1:Contracts:WorkRoot, TimeoutSeconds | Thư mục chuyển PDF riêng và timeout. |
| Flow1:Contracts:Issuer | legalName/address/taxCode/representative/email/phone, đủ cả sáu giá trị. |
| Flow1:Contracts:OtpHmacKey, Email | Secret riêng và SMTP gửi OTP ký; không đổi OTP đăng ký. |
| Flow1:Vnpay | Enabled/TmnCode/HashSecret/ReturnUrl cho Sandbox. |
| Flow1:Maps | Provider, endpoint, key/token và xác nhận quyền lưu tọa độ theo adapter. |
| Flow1:Estimate | StandardVehicleCapacityStalls, DefaultCrewCount, DefaultDoctorCount đều phải được cấu hình dương. Không dùng mặc định ngầm từ calculator cũ. |

Các policy cần tồn tại, đúng đơn vị/kiểu: MIN_PREPARATION_DAYS, DEFAULT_DEPOSIT_PERCENT, CONTRACT_DEADLINE_HOURS, SIGN_OTP_TTL_MINUTES, SIGN_OTP_RESEND_SECONDS, SIGN_OTP_MAX_ATTEMPTS. Secret và đường dẫn ở cấu hình server; đây không phải dữ liệu cho BUSINESS_POLICY.

## Kiểm chứng và phạm vi giữ nguyên

Đã chạy:

```powershell
dotnet build backend/WebApi/WebApi.csproj --no-restore -v quiet
dotnet test backend/tests/Flow1.Rebuild.Tests/Flow1.Rebuild.Tests.csproj -v quiet
dotnet test backend/tests/Flow1.Tests/Flow1.Tests.csproj -v quiet
dotnet test backend/tests/Registration.Tests/Registration.Tests.csproj -v quiet
```

Kết quả gần nhất: Rebuild **24 qua, 0 bỏ qua**; Flow1.Tests **76 qua, 88 bỏ qua**; Registration.Tests **42 qua, 5 bỏ qua**. Build WebApi không warning/error. Các test bỏ qua không được tính là đã xác minh.

Bộ Rebuild chạy SQL thật trên `.\SQLEXPRESS` (hoặc FLOW1_TEST_SQL), tự tạo/xóa chỉ database `Flow1Rebuild_<GUID>`. Database đang dùng không bị reset. Test auth/SMTP/maps trong HTTP fixture là adapter test; IPN dùng thuật toán HMAC thật của gateway với merchant/secret test. Một test riêng chạy Chrome/Edge thật để chuyển PDF và kiểm private-file integrity; máy khác thiếu browser thì test đó skip có lý do (FLOW1_TEST_BROWSER để cấu hình).

Đã kiểm hash 22 file auth/registration và sáu nguồn data theo fingerprint kế hoạch: không thay đổi. Không đổi frontend, SQL, rule nguồn hay dữ liệu của flow khác. Chưa thử email SMTP thật, phiên thanh toán ngân hàng thật/public IPN, địa chỉ/maps thật hoặc E2E frontend; không suy các phần đó từ test doubles.

## Code cũ

`Application/Flow1/Legacy` và scalar context/models cũ chỉ phục vụ fixture/direct-service test/harness lịch sử. Không đăng ký vào host mới, không có controller cũ song song. Các cổng tích hợp cũ được đổi tên và cập nhật caller để build được. Chưa xóa toàn bộ fixture cũ; 88 test legacy cần môi trường/đặc tả cũ đang skip, không được tính là đã qua trên Reviewed schema.

## Khoảng ngày khách hàng yêu cầu

POST/PUT customer/requests nhận expectedTransportDate (ngày bắt đầu) và expectedDeliveryDate (ngày giao/kết thúc), yyyy-MM-dd; kết thúc phải bằng hoặc sau bắt đầu. Không nhận date cũ. Hai trường lưu vào ExpectedDate và CommittedDeadline có sẵn. Khi lập hợp đồng, Manager giữ hai ngày khách đã chọn, bổ sung giờ UTC cụ thể.

GET customer/horses/selectable nhận cùng hai tham số để kiểm tra giao nhau trên toàn khoảng, tính cả ngày đầu/cuối. Kết quả không giữ chỗ. Submit kiểm tra lại trong transaction; hộ chiếu phải còn hạn qua ngày giao. Đây là kiểm tra lịch dự kiến trong dữ liệu request, không xác nhận ngựa đã được bàn giao thực tế.

createdAt do server ghi UTC khi tạo, không phải trường khách nhập. Chạy backend/database/003_request_created_at.sql cho database hiện có trước khi cập nhật runtime; đơn cũ giữ null nếu không biết thời điểm tạo. 002_flow1.sql cũng bao gồm cột này cho cài đặt mới.

## Gửi yêu cầu một bước

POST /api/customer/requests và PUT /api/customer/requests/{requestId} dùng multipart/form-data: trường data là chuỗi JSON đầy đủ theo RequestUpdateInput; files là danh sách tệp. Xem contracts/API-Flow/Flow1/RequestSubmission.md. POST tạo thẳng PENDING_REVIEW; PUT chỉ CHANGES_REQUESTED và gửi lại PENDING_REVIEW. Không có API submit hay API upload hồ sơ từng ngựa theo request riêng. Hồ sơ ngựa dùng chung vẫn có API riêng.

Mỗi data.documents[] khai báo fileName, documentType, horseId (chỉ với hồ sơ từng ngựa), expiryDate nếu có. File phải được đính kèm và khớp duy nhất theo tên. PUT giữ hồ sơ cũ không được thay thế; hồ sơ của ngựa bỏ khỏi đơn bị bỏ khỏi liên kết theo đơn. Thông tin/files khác nhau không được dùng lại Idempotency-Key; chữ ký nội dung lưu tại SubmissionContentHash, không đặt vào hợp đồng khách.

Thực hiện migration 005_request_submission_content.sql cho database đang có trước khi triển khai. 002_flow1.sql cũng bổ sung cột này. Các bản ghi được kiểm tra và lưu trong transaction; tệp lưu riêng theo hash trước transaction, nên lỗi DB có thể để lại bytes riêng tư chưa được tham chiếu (không có đơn thiếu trong queue). Không xóa tự động tệp hash có thể đang dùng chung.
