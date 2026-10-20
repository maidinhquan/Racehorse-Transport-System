# Hướng dẫn chạy và kiểm tra Flow 1

Đối chiếu source working tree ngày 20/10/2026. Tài liệu đi cùng `FLOW1_FLOW23_INTEGRATION.md` ở root. Các đường dẫn trong tài liệu tính từ repository root. Đây là hướng dẫn backend hiện có, không khẳng định frontend đã tích hợp đủ.

## 1. Phạm vi và luồng đã chốt

Customer xem estimate → tạo request → Logistics Manager xét duyệt → lập kế hoạch sơ bộ và phát hành hợp đồng PDF → Customer xem/feedback → thanh toán cọc 40% và hệ thống xác minh → ký OTP → kích hoạt request, tạo Trip → Manager chỉ định một Specialist và một Coordinator → hai người nhận bàn giao, làm Flow 2/3 song song.

- Mọi Manager hợp lệ đều được xử lý request; không có claim hoặc Manager phụ trách cố định.
- Cọc trước, ký sau. Chỉ redirect về trang thanh toán thành công không đủ chứng minh đã thu tiền.
- Không có hold/resume hay Customer decline. Customer muốn sửa dùng feedback; muốn dừng trước ký dùng cancellation.
- Hợp đồng đã ký không được chỉnh sửa. Không có lịch sử phiên bản hợp đồng cho người dùng xem lại.
- `version` trong API là token rowversion chống ghi đè đồng thời, không phải số phiên bản nghiệp vụ.
- Phân công đích danh, không tự nhận việc. Ack là xác nhận đã nhận bàn giao, không phải chọn người nhận.

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

## 3. Khởi tạo/nâng cấp database trước khi mở web

Chạy PowerShell từ root. Các lệnh dưới dùng SQL instance ví dụ `.\SQLEXPRESS` bằng Windows authentication; thay server nếu khác. Kiểm tra `$LASTEXITCODE` sau mỗi lệnh, lỗi thì dừng, không chạy tiếp.

### Máy mới, chưa có database

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -Q "IF DB_ID(N'HorseTransportDB') IS NULL CREATE DATABASE [HorseTransportDB];"
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d HorseTransportDB -f 65001 -i backend/database/000_legacy_schema.sql
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d HorseTransportDB -f 65001 -i backend/database/001_registration_unique_indexes.sql
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d HorseTransportDB -f 65001 -i backend/database/002_flow1.sql
```

`000` chỉ dành cho database trống; câu tạo DB có kiểm tra tồn tại không làm cho `000` an toàn trên DB đã có bảng. Không dùng script tổng hợp cũ để reset dữ liệu.

### Đã có database

1. Dừng backend đang ghi dữ liệu.
2. Backup database, kiểm tra khả năng restore; giữ cả private files nếu đã có hợp đồng/tệp ngựa.
3. Kiểm tra đúng DB/server và dữ liệu xung đột, đọc `backend/database/README.md`.
4. Chạy `001` nếu chưa áp dụng phần đăng ký; chạy **`002_flow1.sql`** để đưa Flow 1 về schema hiện hành. Không chạy lại `000`.
5. Script báo lỗi thì xử lý nguyên nhân trước khi mở ứng dụng. Không tự xóa constraint hoặc dữ liệu để ép chạy.

`002` tự chứa, có transaction/guard/khóa migration; chạy lại được với schema tương thích và giữ nội dung đã sửa của 12 điều khoản bắt buộc. Không cần các script 003–009. Script có thay đổi schema nên vẫn phải review/backup, không xem khả năng chạy lại là bảo đảm cho mọi schema của các nhánh khác.

**Hiện chưa có bước `db-init` tự động.** Backend có guard schema và có thể trả 503 `FLOW1_SQL_SCHEMA_REQUIRED` nếu thiếu schema; guard không tự nâng cấp DB. Đừng hướng dẫn đồng đội rằng chỉ `docker compose up` là tự cập nhật SQL.

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
| 1 | Customer | `POST /api/customer/horses` multipart: payload JSON, photo, passportScan. Mỗi file 16 bytes–5MB, nội dung tệp hợp lệ. GET `horses/selectable` để lấy horseId/version. |
| 2 | Customer | GET `locations/search`, POST `estimates`; chọn lịch còn đủ thời gian chuẩn bị. Gửi datetime có offset, ví dụ `+07:00`; không nhầm ngày theo UTC với ngày Việt Nam. |
| 3 | Customer | POST `requests` hoặc `requests/with-documents`. JSON theo FlowRequestInput/Swagger; multipart hồ sơ tối đa 10 file, files khớp horseIds. Lưu requestId/version. |
| 4 | Manager | GET `/api/manager/requests/{id}` rồi POST `accept` với request.version và reason phù hợp. Có thể reject/request-changes theo nhánh thử riêng. |
| 5 | Manager | POST `/api/manager/requests/{id}/contracts`: request.version hiện hành, price VND nguyên và preparationDays. Lấy contractId/version. |
| 6 | Manager | GET `clauses`; POST `/api/manager/contracts/{id}/publish` với contract.version, clauseIds tùy chọn, additionalClauses tùy chọn. PDF được dựng bởi backend. |
| 7 | Customer | GET `/api/customer/contracts/{id}`, `/pdf`, `/terms`. Kiểm tra đủ 12 điều khoản và khoản cọc; chưa ký ngay. |
| 8 | Customer | POST `/api/customer/contracts/{id}/vnpay`, mở paymentUrl trả về. Theo dõi `/api/customer/payments/{paymentId}/status` và GET contract. |
| 9 | Hệ thống | IPN VNPay hợp lệ/đối soát cập nhật tiền. Chỉ tiếp tục khi backend cho trạng thái `PENDING_SIGNATURE`; chưa có Trip trước ký. |
| 10 | Customer | POST `/otp` với contract.version/pdfSha256 hiện hành; nhận email; GET lại contract; POST `/sign` với version mới, pdfSha256 và otp. Kết quả `EFFECTIVE`, request `ACTIVATED`, trip `PLANNING`. |
| 11 | Manager | GET `/api/manager/staff/operational`; POST `/api/manager/contracts/{id}/deployment/confirm` với **trip.version**, reason bắt buộc và hai ID đúng role. |
| 12 | Nhân sự | GET `/api/operations/flow1/trips`, tải PDF/hồ sơ và POST `/{tripId}/ack` với trip.version/eventId. Chi tiết ở tài liệu kết nối. |

Thời hạn cọc/xác minh/ký dùng hạn hiện hành backend trả; luồng mới mặc định có hạn chung 24 giờ và giới hạn thời gian chuẩn bị. Gửi lại OTP không tự gia hạn. Không hardcode trên frontend trạng thái/giờ theo tài liệu ví dụ cũ.

### Điều khoản và PDF

- SQL seed 12 ID `flow1-required-clause-01` … `12`, nội dung tạm A…L. Cần sửa thành nội dung nghiệp vụ trước khi dùng thực tế.
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
- SQL: `backend/database/000_legacy_schema.sql`, `001_registration_unique_indexes.sql`, `002_flow1.sql`.
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
giá đề xuất = tổng năm nhóm; cọc = làm tròn(giá Manager chốt × 40%)
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

Omit price: giá hợp đồng mặc định bằng tổng costs. Manager có thể gửi price để chốt giá khác. Omit costs: backend tính với số lượng mặc định theo request và bảo hiểm tối thiểu. Reissue nhận costs tương tự; nếu bỏ costs thì tính lại theo lịch mới/định mức hiện tại. Hợp đồng đã ký hoặc còn giao dịch chưa giải quyết vẫn bị chặn sửa như trước.

Các tên cũ demoTransportCost/estimatedTransportCost được giữ tương thích API nhưng nay biểu thị tổng kế hoạch, không còn chỉ riêng tiền vận chuyển. estimatedTransportCost của request lưu từ lúc gửi request, không bị giá Manager chốt ghi đè. Frontend chưa được sửa để gọi các API mới: bảng/form cũ không tự có thêm chức năng sau khi backend cập nhật.

Nếu test host trên máy không có SMTP registration local, chạy test với biến chỉ dành cho tiến trình thử:

```powershell
$env:RegistrationEmail__Mode = 'Development'
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/Backend.slnx
```
