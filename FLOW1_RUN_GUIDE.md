> Các phần mô tả UI/harness cũ phía dưới là lịch sử. Contract API hiện hành: contracts/API-Flow/Flow1/RequestSubmission.md; schema duy nhất: HorseTransportDB/HorseTransportDB_Reviewed.sql.

# Hướng dẫn chạy và kiểm tra Flow 1

Đối chiếu source working tree ngày 21/10/2026. Tài liệu đi cùng `FLOW1_FLOW23_INTEGRATION.md` ở root. Các đường dẫn trong tài liệu tính từ repository root. Đây là hướng dẫn backend hiện có, không khẳng định frontend đã tích hợp đủ.

## 1. Phạm vi và luồng đã chốt

Customer xem estimate → tạo request → Logistics Manager xét duyệt → lập kế hoạch sơ bộ và phát hành hợp đồng PDF → Customer xem/feedback → thanh toán cọc theo hợp đồng (mặc định 40%) và hệ thống xác minh → ký OTP → kích hoạt request, tạo Trip → Manager chỉ định một Specialist và một Coordinator → hai người nhận bàn giao, làm Flow 2/3 song song.

- Mọi Manager hợp lệ đều được xử lý request; không có claim hoặc Manager phụ trách cố định.
- Cọc trước, ký sau. Chỉ redirect về trang thanh toán thành công không đủ chứng minh đã thu tiền.
- Không có hold/resume hay Customer decline. Customer muốn sửa dùng feedback; muốn dừng trước ký dùng cancellation.
- Hợp đồng đã ký không được chỉnh sửa. Không có lịch sử phiên bản hợp đồng cho người dùng xem lại.
- `version` trong API là token rowversion chống ghi đè đồng thời, không phải số phiên bản nghiệp vụ.
- Phân công đích danh, không tự nhận việc. Manager xác nhận phân công thì task tự thuộc về hai nhân sự; không có bước xác nhận nhận việc.

## 2. Chuẩn bị máy

### Docker (cách chạy theo compose hiện tại)

1. Cài Git và Docker Desktop, bật engine Linux containers.
2. Có SQL Server và database `HorseTransportDB`. **Compose hiện không tạo container SQL Server và không tự chạy SQL.**
3. SQL Server phải cho phép SQL authentication, kết nối TCP cổng 1433 từ container; account SQL có quyền đọc/ghi cần thiết. Khi nâng cấp schema cần account có quyền DDL phù hợp.
4. Có cấu hình SMTP gửi OTP, khóa JWT, khóa OTP HMAC, dịch vụ maps và thông tin VNPay sandbox nếu muốn thử toàn bộ luồng thật.
5. Pull đủ source backend và hai tài liệu root. `data/` đang bị Git ignore; không phụ thuộc việc đồng đội có các file trong đó để khởi động.

Compose hiện hardcode SQL host `host.docker.internal,1433`, DB `HorseTransportDB`. Đây là SQL trên máy chạy Docker, không phải DB của người viết code. Nếu máy dùng cổng/server khác phải điều chỉnh connection string tương ứng. Chạy được native bằng Windows authentication không có nghĩa Docker đã kết nối được SQL bằng SQL authentication.

### Native (phương án thay thế)

Cần .NET SDK 8 và SQL Server. Script `backend/tools/start-flow1-local.ps1` dùng server `.\SQLEXPRESS`, Windows integrated authentication và cổng backend 5129. Script không tự tạo DB/chạy SQL. Chỉ chạy một backend tại cổng này. PDF native cần browser/renderer được cấu hình; các đường dẫn Linux trong `.env.example` không dùng trực tiếp cho Windows.

## 3. Tạo lại database test

Schema hiện hành nằm trong `HorseTransportDB/HorseTransportDB_Reviewed.sql`. Chạy từ root:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -i HorseTransportDB/HorseTransportDB_Reviewed.sql
```

File reset/recreate HorseTransportDB_Reviewed và dữ liệu mẫu. Cấu hình backend trỏ tới database này. Không có migration đánh số; khi sửa schema, sửa file Reviewed rồi tạo lại dữ liệu test. Các script cũ đã được loại bỏ.

Kiểm tra runtime hiện hành bằng `dotnet test backend/tests/Flow1.Rebuild.Tests/Flow1.Rebuild.Tests.csproj`. Bộ test tự tạo database GUID riêng từ đúng file schema này. Các harness/test RowVersion đời cũ đã nghỉ dùng; Swagger fixture vẫn dùng schema Reviewed.

## 4. Cấu hình riêng, không push secrets

Nếu chưa có `.env`:

```powershell
Copy-Item .env.example .env
```

Không ghi đè `.env` đã cấu hình. Điền tối thiểu các nhóm sau; lấy tên đầy đủ từ `.env.example`:

| Nhóm | Nội dung |
|---|---|
| SQL | `SQL_USER`, `SQL_PASSWORD`; account phải đăng nhập TCP được |
| JWT | `Jwt__Key`, issuer, audience; khóa ngẫu nhiên đủ mạnh |
| OTP | `Flow1__Contracts__OtpHmacKey`; khóa riêng độc lập JWT |
| SMTP | Host/port/username/password/from và SSL; email Customer phải nhận được OTP |
| Maps | Provider và API keys theo `.env.example`, quyền lưu kết quả nếu provider yêu cầu |
| VNPay | Enabled, TmnCode, HashSecret, PaymentUrl, ReturnUrl đúng môi trường sandbox |
| Issuer | Các trường `Flow1__Contracts__Issuer__...` của doanh nghiệp để dựng PDF |
| Tệp/PDF | PrivateFiles root, WorkRoot, LibreOfficePath theo môi trường |

Không commit `.env`, appsettings local, backup hoặc tệp private. Compose inject cấu hình từ `.env`; ứng dụng native không mặc nhiên đọc file `.env` của Docker. Native cần cấu hình qua biến môi trường/appsettings local được Program.cs nạp.

## 5. Khởi động

Sau khi SQL và cấu hình đã xong:

```powershell
docker compose up -d --build backend
docker compose logs --tail 100 backend
```

Swagger: `http://localhost:5129/swagger/index.html`.

Chạy cả frontend có sẵn khi cần:

```powershell
docker compose up -d --build
```

Frontend compose ở `http://localhost:5173`. Việc trang mở được không chứng minh các UI Flow 1 đã nối đủ.

Chạy native thay thế Docker backend:

```powershell
docker compose stop backend
./backend/tools/start-flow1-local.ps1
```

Giữ volume `backend_app_data`: chứa PDF/tệp private đã được DB tham chiếu. Không dùng `docker compose down -v` nếu cần giữ các tệp. Backup DB đơn lẻ không mang theo bytes PDF. Chuyển máy phải chuyển DB và kho private files tương ứng.

## 6. Tài khoản và thao tác Swagger

Schema SQL không seed tài khoản demo/mật khẩu. Cần tài khoản active đúng role, có password hash hợp lệ; dùng cơ chế đăng ký hiện có cho Customer và nguồn tài khoản thử đã thống nhất cho nhân sự. Không chèn mật khẩu plain text vào PasswordHash. Phần quản lý tài khoản không thuộc đợt Flow 1 này.

Role chuẩn: `CUSTOMER`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`.

Đăng nhập `POST /api/Auth/login`, lấy `data.accessToken`, Authorize JWT trên Swagger. Đổi token khi đổi vai. Dùng ID thật từ response, không copy nguyên ID minh họa. Mỗi mutation lấy lại `version` mới; nếu 409 do dữ liệu đổi, GET lại và kiểm tra trước khi gửi tiếp. Khi retry thao tác có `Idempotency-Key`, giữ cùng key cho cùng thao tác/payload; thao tác mới dùng key mới. Đừng dựa vào key ngẫu nhiên fallback của Swagger để chống trùng khi retry.

## 7. Kịch bản thành công từ đầu đến bàn giao

| Bước | Vai trò | API/thao tác và kết quả cần kiểm tra |
|---|---|---|
| 1 | Customer | `POST /api/customer/horses` multipart: payload JSON, photo, passportScan, ownershipCertificate; valuationDocument tùy chọn. Mỗi file 16 bytes–5MB, nội dung tệp hợp lệ. GET `horses/selectable` để lấy horseId/version. |
| 2 | Customer | GET `locations/search`, POST `estimates`; chọn lịch còn đủ thời gian chuẩn bị. Gửi datetime có offset, ví dụ `+07:00`; không nhầm ngày theo UTC với ngày Việt Nam. |
| 3 | Customer | POST `requests` hoặc `requests/with-documents`. JSON theo FlowRequestInput/Swagger; multipart hồ sơ tối đa 10 file, files khớp horseIds. Lưu requestId/version. |
| 4 | Manager | GET `/api/manager/requests/{id}` rồi POST `accept` với request.version và reason phù hợp. Có thể reject/request-changes theo nhánh thử riêng. |
| 5 | Manager | POST `/api/manager/requests/{id}/contracts`: request.version hiện hành; costs gồm 5 khoản VND, depositRate tùy chọn, phương thức/lịch và commercialNotes. price nếu gửi phải bằng costs.total. Lấy contractId/version; có thể PUT /contracts/{id}/draft để sửa nháp. |
| 6 | Manager | GET `clauses`; POST `/api/manager/contracts/{id}/publish` với contract.version, clauseIds tùy chọn, additionalClauses tùy chọn. PDF được dựng bởi backend. |
| 7 | Customer | GET `/api/customer/contracts/{id}`, `/pdf`, `/terms`. Kiểm tra đủ 12 điều khoản và khoản cọc; chưa ký ngay. |
| 8 | Customer | POST `/api/customer/contracts/{id}/vnpay`, mở paymentUrl trả về. Theo dõi `/api/customer/payments/{paymentId}/status` và GET contract. |
| 9 | Hệ thống | IPN VNPay hợp lệ/đối soát cập nhật tiền. Chỉ tiếp tục khi backend cho trạng thái `PENDING_SIGNATURE`; chưa có Trip trước ký. |
| 10 | Customer | POST `/otp` với contract.version/pdfSha256 hiện hành; nhận email; GET lại contract; POST `/sign` với version mới, pdfSha256 và otp. Kết quả `EFFECTIVE`, request `ACTIVATED`, trip `PLANNING`. |
| 11 | Manager | GET `/api/manager/staff/operational`; POST `/api/manager/contracts/{id}/deployment/confirm` với **trip.version**, reason bắt buộc và hai ID đúng role. |
| 12 | Nhân sự | GET `/api/operations/flow1/trips` để thấy ngay task được giao; không gọi ack. UI nghiệp vụ tiếp theo thuộc Flow 2/3. Chi tiết ở tài liệu kết nối. |

Thời hạn cọc/xác minh/ký dùng hạn hiện hành backend trả; luồng mới mặc định có hạn chung 24 giờ và giới hạn thời gian chuẩn bị. Gửi lại OTP không tự gia hạn. Không hardcode trên frontend trạng thái/giờ theo tài liệu ví dụ cũ.

### Điều khoản và PDF

- SQL seed 12 ID `flow1-required-clause-01` … `12`, nội dung theo 12 điều khoản trong wizard đã chốt ngày 21/10/2026. Cần sửa thành nội dung nghiệp vụ trước khi dùng thực tế.
- GET/POST `/api/manager/clauses`, PUT `/api/manager/clauses/{id}` còn giữ. 12 mục bắt buộc không được deactivate.
- Publish/reissue tự ghép đủ 12 dù clauseIds rỗng. AdditionalClauses là chuỗi nhập thêm, tối đa 20 mục, mỗi mục 1–2000 ký tự, tổng tối đa 20000.
- Điều khoản thêm chỉ nằm trong PDF, không lưu thêm bảng/cột. `/terms` đọc nội dung đã đóng băng trong PDF, không lấy catalogue mới để giả lập hợp đồng cũ.
- Reissue bỏ/null additionalClauses: giữ phần thêm cũ; `[]`: xóa phần thêm nếu được phép đổi điều khoản; mảng mới: thay phần thêm.
- Sửa catalogue không thay PDF đã phát hành. Không cần file Word trong data để dựng bố cục.

## 8. Các nhánh cần thử riêng

| Nhánh | Cách thử/điều kiện |
|---|---|
| Reject request | Manager POST requests/{id}/reject, Customer xem lý do trong notifications |
| Yêu cầu sửa request | Manager request-changes; Customer revision hoặc revision-with-documents, không sửa request đã đóng tùy ý |
| Feedback | Customer POST contracts/{id}/feedback trước thanh toán; fields chỉ rõ PRICE/PREPARATION_DAYS/DEPARTURE_AT/DELIVERY_AT/CLAUSES/DEADLINE |
| Xử lý feedback | Manager feedback/reject với lý do hoặc reissue; reissue kiểm tra lại lịch/ngựa/thời gian chuẩn bị |
| Reissue chủ động | Manager được sửa/phát hành lại trước ký dù chưa có feedback, khi không có tiền/giao dịch chưa giải quyết. Cùng ContractID, PDF/hash/OTP thay đổi |
| Thu hồi/hết hạn | Manager withdraw/expire kèm reason, trước ký; expire chỉ khi quá hạn. Đọc điều kiện backend, không bypass tiền |
| Hủy trước ký | Customer cancellation/request; Manager cancellation/approve hoặc reject. Nếu có cọc, tiếp tục refund-start rồi refund-complete với bằng chứng tham chiếu đã kiểm chứng |
| Hoàn tiền | Backend ghi nhận quy trình hoàn thực tế; không tự gọi ngân hàng chuyển tiền. Không đánh dấu hoàn xong chỉ để demo |
| Thông báo | GET /api/flow1/notifications, POST /{notificationId}/read; dữ liệu theo người đang đăng nhập |

## 9. Lỗi hay gặp

| Hiện tượng | Kiểm tra |
|---|---|
| SQL connection fail | SQL Server/TCP1433/auth/firewall, Docker host; account Windows của host không tự thành account trong container |
| 503 FLOW1_SQL_SCHEMA_REQUIRED | Đúng DB chưa, đã chạy source 002 hiện hành chưa, constraint có trusted/enabled đúng không |
| 401/403 | JWT hết hạn, sai issuer/audience/role, user inactive, tải tệp không thuộc quyền |
| 409 sau mutation | Dùng nhầm request/contract/trip.version hoặc bản cũ; GET lại. Cũng có thể lỗi điều kiện nghiệp vụ: đọc message/errorCode |
| Không gửi OTP | Chưa xác minh cọc, quá hạn, SMTP/recipient sai, hash/version sai |
| PDF lỗi | Issuer thiếu, renderer/private-files path/quyền ghi sai; không sửa PdfSha256 bằng tay |
| Return thanh toán nhưng chưa ghi nhận | ReturnUrl không phải IPN. Localhost không nhận callback từ internet; cấu hình callback sandbox công khai và đối soát theo cấu hình thực tế |
| Nhân sự không thấy chuyến | Chưa ký/chưa phân công, sai assigned ID/role hoặc Trip đã rời PLANNING/READY_TO_DEPART |

## 10. Kiểm thử tự động và giới hạn bằng chứng

```powershell
dotnet build backend/Backend.slnx
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx
```

Kiểm chứng lượt COST_RATE ngày 20/10/2026: 141 Flow1.Tests + 47 Registration.Tests passed, không skipped; 86 connected API checks và Swagger Try-it-out qua SQL/JWT/PDF/SMTP fixture. Docker backend đã cập nhật và kiểm tra demo trực tiếp tại localhost:5129. Không thay đổi frontend. Đây không phải xác nhận ngân hàng/SMTP internet thật.

Backup trước nâng cấp: `A:\SQL2019\MSSQL15.SQLEXPRESS\MSSQL\Backup\HorseTransportDB_before_cost_rate_20261020_1700.bak`. Đã CHECKSUM/VERIFYONLY, restore sang DB kiểm tra riêng và so sánh SHA-256 JSON toàn bộ bảng cũ theo khóa chính: khớp dữ liệu, bao gồm rowversion/tham chiếu tệp. DB kiểm tra đã dọn; backup được giữ. Bằng chứng local nằm trong `backend/WebApi/App_Data/flow1/cost-rate-qa/` (Git ignore).

Cần account SQL của runner có quyền tạo/xóa database test. LocalSqlFactAttribute có thể skip các bài cần SQL khi thiếu biến môi trường; phải kiểm tra số skipped, không chỉ nhìn màu xanh. Test dùng DB tạm, không đưa fixture vào DB nghiệp vụ.

Connected harness: `backend/tools/Flow1SwaggerHarness` và `backend/tools/flow1-swagger-e2e.cjs`. Đọc tham số/cách chuẩn bị fixture trong source trước chạy; không trỏ fixture vào DB nghiệp vụ. Kiểm thử callback ký bằng khóa test/SMTP trong RAM không thay thế giao dịch ngân hàng, email hoặc callback công khai thật.

## 11. Source cần đọc khi thay đổi

- API: `backend/WebApi/Controllers/Flow1/Relational/Flow1Controllers.cs`.
- Payload/response: `backend/Application/DTOs/Flow1/RelationalDtos.cs`, Swagger examples trong `backend/WebApi/Extensions/Flow1SwaggerExamples.cs`.
- Nghiệp vụ: `backend/Application/Services/Flow1/Relational/`.
- Entity/mapping: `backend/Domain/Flow1/FlowRows.cs`, `backend/Infrastructure/Data/Context/Flow1RelationalContext.cs`.
- Schema test hiện hành: `HorseTransportDB/HorseTransportDB_Reviewed.sql`; tạo lại DB test trực tiếp, không chạy migration đánh số.
- PDF: `backend/Infrastructure/ExternalServices/Flow1/CodeContractDocumentGenerator.cs`.

Nếu tài liệu ví dụ trong contracts khác trạng thái/role/payload hiện hành, đối chiếu source trên và xác nhận nghiệp vụ trước sửa. Không tự bật lại decline/hold, thêm owner Manager hoặc đổi về ký trước cọc chỉ để khớp ví dụ cũ.

## 12. Giá theo COST_RATE — cập nhật 20/10/2026

Chỉ thêm một bảng `COST_RATE` bằng SQL 002. Không thêm cột CONTRACT/COST_ITEM và không lưu bảng giá demo/tuyến demo. COST_ITEM giữ tám cột; năm dòng kế hoạch của hợp đồng dùng CategoryName là TRANSPORT/CREW/PERMIT/VET/INSURANCE và SubcodeName tương ứng PLANNED_TRANSPORT/PLANNED_CREW/PLANNED_PERMIT/PLANNED_VET/PLANNED_INSURANCE. Không cộng lẫn các dòng phát sinh hoặc sửa các dòng lịch sử có mã khác.

| Code | Nhóm | Định mức VND |
|---|---|---|
| ROAD_KM | TRANSPORT | 200.000/km/xe, gộp nhiên liệu và phí đường |
| AIR_HORSE | TRANSPORT | 3.000.000/ngựa, gói chuồng bay |
| STABLE_NIGHT | TRANSPORT | 250.000/ngựa/đêm |
| CREW_DAY | CREW | 300.000/người/ngày, tài xế và áp tải cùng mức |
| PERMIT_TRIP | PERMIT | 1.000.000/chuyến |
| PERMIT_HORSE | PERMIT | 5.000.000/ngựa |
| VET_DAY | VET | 500.000/bác sĩ/ngày |
| CARE_DAY | VET | 300.000/ngựa/ngày |
| INSURANCE_MIN | INSURANCE | 2.000.000/chuyến |
| INSURANCE_RATE | INSURANCE | 0,005 = 0,5% tổng giá trị ngựa theo VND; giả định đồ án |

```text
transport = km × số xe × ROAD_KM + (AIR ? số ngựa × AIR_HORSE : 0)
            + số ngựa × số đêm × STABLE_NIGHT
crew      = số người × số ngày × CREW_DAY
permit    = PERMIT_TRIP + số ngựa × PERMIT_HORSE
vet       = số bác sĩ × số ngày × VET_DAY + số ngựa × số ngày × CARE_DAY
insurance = max(INSURANCE_MIN, tổng giá trị ngựa VND × INSURANCE_RATE)
giá đề xuất = tổng năm nhóm; cọc = làm tròn(giá Manager chốt × depositRate / 100)
```

Không margin, dự phòng, khấu hao, overhead hoặc TNDS cộng riêng. Từng nhóm làm tròn đến đồng trước cộng. Sửa định mức không tự đổi chi phí đã lưu hoặc PDF đã phát hành. Migration chạy lại chỉ seed mã còn thiếu, giữ đơn giá Manager đã sửa.

### Các API mới, chỉ backend

| Method/path | Công dụng |
|---|---|
| POST /api/public/estimates/demo | Không cần đăng nhập; origin/destination là tên thành phố cấu hình và horseCount. Không gọi maps, không lưu demo, chỉ trả tổng giá/cọc và giả định |
| GET /api/manager/cost-rates | Manager xem 10 định mức và version |
| PUT /api/manager/cost-rates/{id} | Manager sửa rate bằng version hiện hành; không cho ngừng dùng định mức bắt buộc |
| POST /api/manager/requests/{id}/cost-estimate | Manager nhận năm khoản đề xuất, chưa lưu |
| GET /api/manager/contracts/{id}/costs | Manager xem năm khoản đã lưu; hợp đồng cũ chưa có dữ liệu trả DATA_REVIEW_REQUIRED |

Demo dùng tọa độ trung tâm các thành phố trong appsettings.json, khoảng cách đường chim bay nhân hệ số đường bộ 1,3. Đây là xấp xỉ phục vụ demo, không phải quãng đường đã khảo sát. Số ngày demo ROAD = làm tròn lên(km/60/8), tối thiểu một ngày; đêm = ngày-1. AIR tạm một ngày, không tự bịa chặng xe sân bay. Cùng thành phố/ngoài danh sách bị từ chối. Có thể đổi tọa độ/hệ số/số giờ trong cấu hình mà không sửa code.

Số xe mặc định = làm tròn lên(số ngựa/sức chứa); nhân sự mặc định hai người mỗi xe (AIR không có chặng bộ: hai người), một bác sĩ cho đoàn. Dự toán hợp đồng lấy số ngày từ lịch đón/giao, làm tròn lên theo mỗi 24 giờ; Manager có thể nhập days/stableNights/crewCount/doctorCount/vehicleCount/roadDistanceKm trong cost-estimate để thay giả định. Đây là số lượng dự toán, không phân công nhân sự trước bước bàn giao.

```json
POST /api/public/estimates/demo
{"origin":"Ho Chi Minh City","destination":"Tokyo","horseCount":1}

POST /api/manager/requests/{id}/cost-estimate
{"days":2,"stableNights":1,"crewCount":2,"doctorCount":1,"insuredValueVnd":1000000000}
```

Không có insuredValueVnd thì dùng bảo hiểm tối thiểu và trả minimumInsuranceAssumed=true. DeclaredValueUsd của hồ sơ cũ không được tự coi là VND hay tự đổi bằng tỷ giá bịa; Manager nhập giá trị VND đã thống nhất vào cost-estimate. Lấy `costs` trả về và gửi nguyên hoặc sửa các nhóm vào draft/reissue để lưu.

```json
POST /api/manager/requests/{id}/contracts
{
  "version":"<request.version>",
  "preparationDays":2,
  "costs":{"transport":20000000,"crew":600000,"permit":6000000,"vet":800000,"insurance":2000000}
}
```

Omit price: giá hợp đồng mặc định bằng tổng costs. Manager chỉnh năm khoản; price nếu gửi phải bằng tổng costs, không có giá bán độc lập. Omit costs: backend tính với số lượng mặc định theo request và bảo hiểm tối thiểu. Reissue nhận costs tương tự; nếu không đổi phương thức/lịch thì giữ các dòng đã lưu, đổi phương thức/lịch thì tính lại nếu không gửi costs. Hợp đồng đã ký hoặc còn giao dịch chưa giải quyết vẫn bị chặn sửa như trước.

Các tên cũ demoTransportCost/estimatedTransportCost được giữ tương thích API nhưng nay biểu thị tổng kế hoạch, không còn chỉ riêng tiền vận chuyển. estimatedTransportCost của request lưu từ lúc gửi request, không bị giá Manager chốt ghi đè. Frontend chưa được sửa để gọi các API mới: bảng/form cũ không tự có thêm chức năng sau khi backend cập nhật.

Nếu test host trên máy không có SMTP registration local, chạy test với biến chỉ dành cho tiến trình thử:

```powershell
$env:RegistrationEmail__Mode = 'Development'
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx
```

Cập nhật bỏ ack: SQL 002 bỏ RoutingAcknowledgedBy/AtUtc và DocumentsAcknowledgedBy/AtUtc cùng hai CHECK tương ứng. Giữ AssignedSpecialistId/AssignedCoordinatorId, DeploymentStatus và HandoffEventId. Không tự ghi xác nhận giả cho nhân sự.

Kiểm chứng bỏ ack ngày 20/10/2026: 142 Flow1.Tests + 47 Registration.Tests passed, không skipped; 85 connected API checks và Swagger Try-it-out passed. Test nâng cấp với dữ liệu ack cũ có giá trị đã chạy riêng và giữ nguyên ID/phân công/event/rowversion của chuyến. Backend Docker/DB localhost đã cập nhật; API cũ trả 404, Swagger không còn route hoặc trường response ack. Backup trước nâng cấp: `A:\SQL2019\MSSQL15.SQLEXPRESS\MSSQL\Backup\HorseTransportDB_before_remove_ack_20261020_1726.bak` (COPY_ONLY, CHECKSUM, VERIFYONLY). Bằng chứng local: `backend/WebApi/App_Data/flow1/remove-ack-qa/`.

### Tỷ lệ cọc do Manager chọn

- Tạo draft: `POST /api/manager/requests/{id}/contracts`, thêm `depositRate` (ví dụ `30` = 30%). Bỏ trống mặc định 40%.
- Phát hành lại: `POST /api/manager/contracts/{id}/reissue`, bỏ trống `depositRate` thì giữ tỷ lệ hiện tại. Chỉ đổi trước khi có tiền/giao dịch chưa giải quyết; feedback giới hạn mục sửa thì đổi tỷ lệ thuộc nhóm `PRICE`.
- Tỷ lệ phải lớn hơn 0, không quá 100%, tối đa hai chữ số thập phân; tiền cọc làm tròn VND phải dương. Response hợp đồng trả `depositRate` và `depositAmount`. PDF và hóa đơn dùng cùng số tiền.
- Giá demo vẫn dùng tỷ lệ tham khảo mặc định 40%. Flow 2/3 lấy tiền cọc thực tế từ CONTRACT/INVOICE, không tự nhân 40%.
- Schema test hiện hành: `HorseTransportDB/HorseTransportDB_Reviewed.sql`; tạo lại DB test trực tiếp, không chạy migration đánh số.

### Tinh gọn schema Flow 1

- Schema test hiện hành: `HorseTransportDB/HorseTransportDB_Reviewed.sql`; tạo lại DB test trực tiếp, không chạy migration đánh số.

Giữ nguyên `USER.ResetOtpCode`/`ResetOtpExpiry` của luồng tài khoản và chỉ lưu một `CONTRACT.CompletionDeadline` cho cọc, xác minh và ký OTP. Khi nâng cấp database có dữ liệu, backup trước, chạy lại 002, rồi dùng backend cùng phiên bản. Không chạy file database mẫu xóa/tạo mới lên DB đang dùng.

### Schema cuối: một hợp đồng và một hạn chung

- Mỗi Request có tối đa một CONTRACT, được bảo vệ bởi unique index trên `RequestID`; cập nhật/phát hành lại cùng bản ghi. Không có cột `IsCurrent`; dùng `ContractStatus` để chặn bản đã hủy.
- Chỉ lưu `CONTRACT.CompletionDeadline`. Bỏ `EffectiveSignDeadline`, `DepositDeadline`, `SignedDepositDeadline`. Hai trường response `signDeadline`/`depositDeadline` cùng suy ra từ hạn chung để giữ tương thích client. `INVOICE.DueDate` vẫn là hạn từng hóa đơn.
- Schema test hiện hành: `HorseTransportDB/HorseTransportDB_Reviewed.sql`; tạo lại DB test trực tiếp, không chạy migration đánh số.
- Cấu trúc hoàn chỉnh cũng có trong `HorseTransportDB/HorseTransportDB.sql`; file đó dùng để tạo mới database mẫu. `USER.ResetOtpCode` giữ nguyên.

## Wizard tạo yêu cầu: hồ sơ ngựa và giấy tờ chung (21/10/2026)

- Schema test hiện hành: `HorseTransportDB/HorseTransportDB_Reviewed.sql`; tạo lại DB test trực tiếp, không chạy migration đánh số.

### Tạo/cập nhật hồ sơ ngựa

- `POST /api/customer/horses`: multipart `payload` (JSON), `photo`, `passportScan`, `ownershipCertificate` bắt buộc; `valuationDocument` tùy chọn. Mỗi tệp 16 byte–5 MB, PNG/JPEG/PDF thật; ảnh chỉ PNG/JPEG.
- `PUT /api/customer/horses/{id}`: cùng form, thêm `version`; chỉ sửa ngựa của mình chưa bị request đang hoạt động khóa. Dùng để hoàn thiện hồ sơ cũ; backend không tự bịa dữ liệu cho hồ sơ cũ.
- JSON giữ name/microchipIso/feiPassportNo/breed/sex/weight/dob; thêm passportIssuedBy, passportIssuedDate, passportExpiryDate, declaredValueVnd, specialHealthNotes. Thông tin hộ chiếu và giá trị thương mại bắt buộc khi tạo/cập nhật đầy đủ; ghi chú sức khỏe tùy chọn, tối đa 2000 ký tự. Ngày cấp từ ngày sinh đến hôm nay; hộ chiếu còn hạn. declaredValueVnd là số nguyên VND từ 1 đến 9,999,999,999.
- Đọc `GET /api/customer/horses/selectable`; response thêm các trường trên, weight, documents. `documents` chỉ mô tả ảnh, hộ chiếu, sở hữu và định giá: UPLOADED/MISSING; bằng chứng định giá tùy chọn dùng NOT_PROVIDED. Không phải trạng thái Specialist phê duyệt.
- Đọc tệp qua `/api/customer/horses/{id}/files/{kind}`, kind = photo/passport/ownership/valuation; không trả đường dẫn lưu trữ riêng tư. Manager dùng `/api/manager/requests/{requestId}/horses/{horseId}/files/{kind}`.

### Dữ liệu đón/giao và chăm sóc

`FlowRequestInput.pickupContact` và `receiver` có name/phone, thêm stableName (200 ký tự), postalCode (20), instructions (1000). Địa chỉ/tọa độ vẫn ở trip.pickup/trip.delivery. Các trường mới để trống được nhằm tương thích client hiện tại.

`careInstructions` cấp request là hướng dẫn chung; `horses[].careInstructions` là hướng dẫn riêng cho chuyến (2000 ký tự). `specialHealthNotes` là thuộc tính HORSE, chỉ nhập/sửa cùng hồ sơ ngựa, không nằm trên request hay bảng nối.

Backend tính tổng declaredValueVnd từ ngựa được chọn, lưu trên request để lập kế hoạch bảo hiểm. Không tin trip.insuredValueVnd do Customer gửi khi nộp request. Hồ sơ cũ thiếu giá trị thì tổng là null và dùng bảo hiểm tối thiểu; Manager có thể xác định insuredValueVnd khi lập kế hoạch. declaredValueUsd cũ vẫn tương thích dữ liệu cũ, không quy đổi ngầm và không dùng làm VND.

### Ba tệp chung của request

`POST /api/customer/requests` và `PUT /api/customer/requests/{requestId}` nhận JSON trực tiếp theo RequestUpdateInput. Không đính kèm tệp tại bước gửi yêu cầu. PUT chỉ nhận yêu cầu CHANGES_REQUESTED và gửi lại PENDING_REVIEW.

Chi tiết yêu cầu chỉ liệt kê hồ sơ ngựa và medical record hiện có; không còn danh sách giấy tờ chung theo yêu cầu.

Sổ tiêm, ngày tiêm, giấy chứng nhận sức khỏe và bác sĩ thú y riêng được xử lý sau ký bởi Flow 3. Không yêu cầu nộp trước ký, không tạo trạng thái đã duyệt giả. Checkbox xác nhận và nút tiếp tục giữa các bước do frontend giữ; chưa có API lưu nháp từng bước. Gửi cuối dùng Idempotency-Key ổn định để retry không tạo trùng request.

## Wizard hợp đồng: nháp → phát hành (21/10/2026)

- POST `/api/manager/requests/{id}/contracts` tạo DRAFT; dùng request.version. Nháp nằm trong CONTRACT, năm dòng tiền nằm trong COST_ITEM. Chưa có PDF, hóa đơn, thông báo phát hành hoặc hạn cọc/ký chính thức. Customer không xem được nháp.
- PUT `/api/manager/contracts/{id}/draft` cập nhật nháp chưa từng phát hành; dùng contract.version. Cho sửa transportMode, departureAt/deliveryAt, preparationDays, costs, depositRate và commercialNotes. Không dùng reissue để lưu nháp. GET contract trả lại các trường này, contractCode, costs.total và publishedAtUtc.
- VN→VN hỗ trợ ROAD/AIR; VN→JP chỉ AIR. AIR cần chuẩn bị tối thiểu 7 ngày; ROAD 2 ngày khi ≤500 km, 3 ngày khi >500 km. Cần thêm trọn 24 giờ trước thời gian chuẩn bị. Khi đổi phương thức/lịch phải kiểm tra lại lịch bận và lộ trình; số ngựa/địa điểm vẫn lấy từ request duyệt. Lưu nháp cập nhật phương án hiện hành trên request, không tạo cột lịch/phương thức trùng lặp trong CONTRACT.
- POST `/api/manager/requests/{id}/cost-estimate` có thêm transportMode/departureAt/deliveryAt để tính thử phương án; không lưu thay đổi. Năm giá mặc định lấy COST_RATE; Manager có thể sửa từng khoản. Tổng hợp đồng luôn bằng tổng năm khoản, VND; không margin/dự phòng. price là tùy chọn và chỉ được dùng để xác nhận cùng tổng. Một giá độc lập khác tổng bị từ chối.
- costs có transport/crew/permit/vet/insurance; vet và insurance phải dương, các khoản là số nguyên VND. Khi cập nhật nháp, bỏ costs thì giữ số đã chốt nếu phương thức/lịch không đổi; nếu đổi phương thức/lịch thì lấy dự toán mới. depositRate mặc định 40% khi tạo, giữ mức hiện tại khi sửa nếu không gửi.
- CommercialNotes là cột mới duy nhất trong CONTRACT, nvarchar(2000), nhận qua commercialNotes. Bỏ trường khi sửa để giữ cũ, gửi chuỗi rỗng để xóa. Nội dung được trả cho Customer và đưa vào PDF.
- 12 điều bắt buộc lấy nguyên văn danh mục; không sửa riêng từng điều trong hợp đồng và không được bỏ. SQL 002 thay A–L bằng nội dung đã duyệt; chạy lại không ghi đè danh mục đã được Manager sửa. API quản lý danh mục cũ vẫn giữ.
- AdditionalClauses chỉ gửi tại publish/reissue và chỉ lưu trong PDF, không có DraftTermsJson hoặc bảng điều khoản. API lưu nháp từ chối additionalClauses có nội dung để tránh báo lưu thành công nhưng mất dữ liệu; frontend giữ phần đang nhập.
- POST `/api/manager/contracts/{id}/publish` phát hành nháp với version và additionalClauses tùy chọn. PDF cố định năm dòng giá, lịch/phương thức, liên hệ/hướng dẫn nhận giao, chăm sóc, ghi chú thương mại và điều khoản. Hạn chung 24 giờ bắt đầu khi phát hành; tạo hóa đơn cọc và thông báo sau khi PDF thành công. Render lỗi thì nháp vẫn còn, chưa có hóa đơn hoặc thông báo.
- Reissue dùng cho hợp đồng đã phát hành nhưng chưa ký và chưa có tiền/giao dịch chưa giải quyết. Feedback có thể chọn thêm TRANSPORT_MODE hoặc COMMERCIAL_NOTES; giá, tỷ lệ cọc hoặc năm dòng tiền thuộc PRICE. Nội dung đã ký và PDF đã phát hành không tự đổi theo danh mục.
- GET contract trả contractCode/publishedAtUtc/commercialNotes/costs/transportMode/departureAt/deliveryAt/preparationDays. Không có phiên bản nghiệp vụ; version vẫn là token chống ghi đè. Bản hợp đồng cũ có các dòng chi phí nội bộ không khớp giá bán sẽ không trả chúng như costs chính thức; không viết lại PDF hoặc tiền đã thu để chuyển đổi.
- Không có API PDF xem trước. Frontend tự tổng hợp bước 4, rồi xem PDF thật sau phát hành. Không có thay đổi frontend trong đợt backend này.
- Bố cục PDF do code tạo. Docker dùng tài liệu ODT dạng XML trung gian để tránh lỗi bộ nhập HTML của LibreOffice; không dùng Word mẫu từ data và không lưu nội dung trung gian vào database. Windows dùng browser được cấu hình nếu có.
- Kiểm chứng lượt wizard hợp đồng: 164 Flow1.Tests và 47 Registration.Tests passed, không skipped; test hồi quy XML/tiêu đề PDF passed. Đã thử API thật trên Docker từ request ROAD đến nháp AIR, cập nhật/mở lại nháp, phát hành/phát hành lại PDF và chặn sửa khi có giao dịch VNPay chờ. Không khẳng định các luồng sau bàn giao đã được kiểm thử trong lượt này.
