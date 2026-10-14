# Đăng ký tài khoản bằng OTP

Phạm vi: ba API Register và hai trang Register/Verify OTP. Tận dụng `backend/Backend.slnx` và tên projects sau merge. Không tạo lại solution, không chuyển thư mục, không sửa Login/Google Login/Forgot Password/Users CRUD hay tích hợp VNPAY.

## Cách chạy

Từ thư mục gốc repo:

**Cấu hình DB trước lần chạy đầu tiên.** File `appsettings.json` của nhóm dùng `localhost` với tài khoản `sa`; cấu hình này không tự khớp SQL Server trên máy khác. Với SQL Express và Windows Authentication:

```powershell
# Chỉ sao chép nếu chưa có file local; nếu đã có thì chỉnh connection string trong file đó.
if (!(Test-Path backend/WebApi/appsettings.Local.json)) {
    Copy-Item backend/WebApi/appsettings.Local.example.json backend/WebApi/appsettings.Local.json
}
```

Kiểm tra `ConnectionStrings:DefaultConnection` trong file local:

```text
Server=.\SQLEXPRESS;Database=HorseTransportDB;Trusted_Connection=True;TrustServerCertificate=True
```

Đổi tên instance/database nếu máy dùng tên khác. Windows đang đăng nhập phải có quyền truy cập database. File local được Git ignore; không đưa mật khẩu vào file tracked. Nếu dùng SQL Authentication thì cần tài khoản và mật khẩu hợp lệ của instance đó. Không sao chép config VNPAY ở `backend/appsettings.Local.json` vào đây. Biến môi trường `ConnectionStrings__DefaultConnection`, nếu có, sẽ ưu tiên hơn file local.

Sau đó chạy:

```powershell
dotnet build backend/Backend.slnx
dotnet run --project backend/WebApi/WebApi.csproj --launch-profile http
```

WebApi chạy tại `http://localhost:5129`; Swagger tại `/swagger`. Sau khi đổi cấu hình, dừng backend bằng Ctrl+C và chạy lại lệnh trên. Build thành công hoặc mở được Swagger chưa chứng minh kết nối DB thành công: EF chỉ kết nối khi API truy vấn.

Nếu log có `Login failed for user 'sa'` / SQL error `18456`, SQL Server đã từ chối tài khoản đăng nhập. Kiểm tra instance và thông tin xác thực; không phải lỗi OTP. Cảnh báo `Failed to determine the https port for redirect` khi chạy profile HTTP không phải nguyên nhân của lỗi SQL này. Chi tiết lỗi đăng ký nằm trong terminal backend; trang đăng ký chỉ hiển thị thông báo ngắn.

Chạy frontend:

```powershell
cd frontend
npm run dev
```

Mở `http://localhost:5173/register`. Vite định tuyến riêng `/api/auth/register` tới WebApi `5129`; proxy `/api` cũ giữ nguyên `5080`. Nếu cấu hình `VITE_API_URL`, nó phải là base URL có `/api`, ví dụ `http://localhost:5129/api`. Khi deploy phải cấu hình base URL/proxy thực tế.

Development mặc định ghi OTP ngẫu nhiên vào terminal backend với nhãn `[DEVELOPMENT ONLY]`. Đây là cách test cục bộ, chưa phải gửi thư đến hộp mail. Không có mã cố định `123456`.

Để gửi thư thật, đặt `RegistrationEmail:Mode=Smtp` và cấu hình `RegistrationEmail:Smtp` trong file local hoặc các biến môi trường:

```text
RegistrationEmail__Mode=Smtp
RegistrationEmail__Smtp__Host=YOUR_SMTP_HOST
RegistrationEmail__Smtp__Port=587
RegistrationEmail__Smtp__EnableSsl=true
RegistrationEmail__Smtp__From=YOUR_SENDER_EMAIL
RegistrationEmail__Smtp__Username=YOUR_SMTP_USERNAME
RegistrationEmail__Smtp__Password=YOUR_SMTP_PASSWORD
```

Ngoài Development, sender ghi OTP bị từ chối. SMTP phải được cấu hình. SMTP thực tế cần được kiểm tra với nhà cung cấp của nhóm; không có credential được tạo hoặc commit trong thay đổi này.

## Phân biệt các phần cho người phụ trách DAO

| Phần | Chức năng |
|---|---|
| Frontend | Thu thập thông tin, gọi API, hiển thị lỗi/đếm ngược |
| DTO (`Application/DTOs/AuthDtos.cs`) | Hợp đồng JSON frontend/backend; không phải bảng database |
| Controller | Nhận DTO, gọi RegistrationService, trả ApiResponse |
| RegistrationService | Validate, chuẩn hóa, kiểm tra trùng, tạo phiên, xác minh OTP, quyết định Customer |
| IUserDAO (`Domain/Interfaces/DAOs`) | Khai báo các truy vấn mà service được phép gọi |
| UserDAO (`Infrastructure/DAOs/Identity`) | EF Core truy vấn và lưu User; transaction bảo vệ lần ghi cuối |
| PendingRegistration | Hồ sơ tạm nội bộ, chứa password hash và OTP hash, không phải DTO công khai |
| RegistrationStore | Cache hồ sơ, khóa riêng từng phiên để verify/resend không chạy chồng nhau |
| EmailSender | Gửi OTP qua SMTP hoặc ghi log riêng trong Development |

DAO User mới dùng namespace `Infrastructure.DAOs.Identity`. Folder `backend/DAO` cũ giữ nguyên để tránh chuyển cả những module không thuộc Register. `BaseDAO.AddAsync` lưu ngay bằng `SaveChangesAsync`; service không gọi lưu lần thứ hai. Interface chung chỉ bổ sung các thao tác Register cần, không thêm chức năng hard delete.

`Infrastructure` tham chiếu `Application` để triển khai interfaces cache/email/hash. Chiều phụ thuộc vẫn là WebApi → Application/Infrastructure → Domain, không có vòng lặp. EF Core SqlServer/Tools được đồng bộ phiên bản 8.0.26 với Design hiện có để tránh xung đột assembly khi test.

## Contract API

### 1. Yêu cầu gửi OTP

`POST /api/auth/register/request-otp`

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "customer@example.com",
  "phoneNumber": "0901234567",
  "password": "YourPassword123!"
}
```

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "registrationToken": "32 hexadecimal characters",
    "expiresIn": 300,
    "resendAfterSeconds": 60
  }
}
```

Lúc này chưa có bản ghi USER. Backend hash mật khẩu trước khi lưu hồ sơ tạm. Không trim mật khẩu. Chính sách hiện có tối thiểu 6 ký tự được giữ; giới hạn tối đa 72 byte UTF-8 của BCrypt được kiểm tra để tránh cắt mật khẩu ngầm.

Email được trim và chuyển chữ thường; chỉ nhận email ASCII tối đa 100 ký tự theo cột varchar hiện tại. SĐT bỏ khoảng trắng/dấu gạch/ngoặc, còn 8–15 chữ số với dấu `+` tùy chọn. Không tự suy đoán mã quốc gia: `090...` và `+8490...` chưa được coi là cùng số. Họ tên được trim, tối đa 100 ký tự.

### 2. Xác minh và hoàn tất

`POST /api/auth/register/verify-otp`

```json
{
  "registrationToken": "TOKEN_FROM_STEP_1",
  "otp": "CODE_FROM_EMAIL_OR_DEVELOPMENT_LOG"
}
```

Thành công giữ response hiện có: `success=true`, message đăng ký hoàn tất, không trả access token. `data` null có thể được serializer hiện tại bỏ khỏi JSON. Người dùng được đưa về Login.

Chỉ lúc này backend tạo User với `Role=UserRoles.Customer` (`CUSTOMER`), `IsActive=true`, Username null và UserId `USR_CUST_` + GUID đủ 32 ký tự (41 ký tự tổng, phù hợp varchar(50)). Không nhận role từ client. Mật khẩu/OTP/hash không xuất hiện trong response.

### 3. Gửi lại

`POST /api/auth/register/resend-otp`

```json
{ "registrationToken": "TOKEN_FROM_STEP_1" }
```

Trả `data.expiresIn` và `data.resendAfterSeconds`. Chỉ reset countdown khi API thành công. Mã mới khác mã cũ; nếu gửi thư lỗi thì mã cũ giữ nguyên.

### Trạng thái lỗi

| HTTP | Ý nghĩa |
|---|---|
| 400 | Dữ liệu sai, OTP sai/hết hạn hoặc phiên không hợp lệ |
| 409 | Email/SĐT đã tồn tại |
| 429 | Nhập sai quá giới hạn, gửi lại quá sớm, giới hạn email/IP |
| 500 | Lỗi DB hoặc gửi email không mong muốn |
| 503 | Cache hồ sơ/bộ đếm đã đầy |

Sử dụng ApiResponse hiện có (`success`, `message`, `data` nếu có, `errors` khi validation). Frontend hiển thị lỗi từ backend.

## Bảo đảm và giới hạn

- OTP hết hạn sau 300 giây; hồ sơ đăng ký hết hạn tuyệt đối sau 900 giây, resend không kéo dài mốc này.
- Nhập sai tối đa 5 lần/mã; resend sau 60 giây có thể cấp mã mới và reset số lần sai.
- Tổng request gửi/resend tối đa 5 lần/email/900 giây, kể cả khi tạo token mới.
- Ba API Register có giới hạn chung 20 request/IP/phút; Login/Google/Users không được thay đổi bởi policy này.
- Cache phiên giới hạn 2.000 entries; bộ đếm email giới hạn 5.000 entries. Đầy thì từ chối, không bỏ qua giới hạn.
- Memory cache chỉ phù hợp một instance; restart mất phiên/bộ đếm. Muốn nhiều instances cần kho phiên/bộ đếm dùng chung và thao tác atomic.
- Trong một instance, khóa phiên bao phủ verify và ghi DB. Trong SQL Server, khóa transaction `sp_getapplock` bảo vệ lần kiểm tra trùng + insert giữa các instances Register. Lỗi lưu trước commit không tiêu thụ OTP.
- `database/001_registration_unique_indexes.sql` bổ sung unique indexes để DB bảo vệ cả những luồng ghi khác. Script được chuẩn bị, không tự áp dụng lên HorseTransportDB. Nó dừng khi phát hiện dữ liệu cũ trùng hoặc chưa chuẩn hóa; không xóa DB, không tự sửa dữ liệu người khác.
- Các endpoint Users CRUD và Google Login hiện hữu vẫn nằm ngoài phạm vi này. Chúng chưa được sửa; không coi thay đổi Register là xác nhận toàn bộ Auth đã an toàn. Những luồng không dùng UserDAO mới không tham gia khóa registration, vì vậy cần xử lý riêng và áp dụng constraints sau khi nhóm duyệt dữ liệu.

## Frontend

`RegisterPage` map `phone` của form sang `phoneNumber` của DTO. Nó chỉ chuyển sang OTP khi request thành công, xóa password khỏi state và không log dữ liệu đăng ký.

`VerifyOtpPage` lưu email/token/mốc thời gian trong sessionStorage của tab, không lưu mật khẩu hoặc OTP. Refresh giữ countdown theo deadline thay vì bắt đầu lại. Mở trực tiếp trang OTP khi không có phiên thì quay về Register. Bấm thay đổi email xóa phiên phía trình duyệt; hồ sơ backend cũ tự hết hạn. Các nút có trạng thái đang xử lý và chặn bấm lặp. Backend vẫn là nơi quyết định thời hạn và giới hạn thực tế.

## Kiểm thử

### Unit test RegistrationService

`tests/Registration.Tests/RegistrationServiceTests.cs` có 24 trường hợp gọi trực tiếp service với DAO, store, limiter, hasher và email sender giả; đồng hồ cố định có thể tiến thời gian. Không khởi động WebApi, không kết nối SQL/SMTP và không dùng BCrypt thật. Test kiểm tra quy tắc của service; kiểm tra BCrypt, HTTP pipeline, khóa đồng thời và SQL thật thuộc bộ tích hợp bên dưới.

```powershell
dotnet test backend/tests/Registration.Tests/Registration.Tests.csproj --filter FullyQualifiedName~RegistrationServiceTests
```

Các trường hợp unit: chuẩn hóa thông tin và giữ nguyên mật khẩu khi hash; dữ liệu không hợp lệ không tạo tác động bên ngoài; email/SĐT trùng; limiter từ chối; gửi email thất bại; xác minh tạo Customer và không dùng lại phiên; kiểm tra trùng lần cuối và lỗi unique từ DAO; lưu thất bại rồi thử lại; khóa sau 5 OTP sai; ranh giới hết hạn OTP/phiên; ranh giới cooldown; resend thay mã, reset lượt sai và giữ hạn phiên tuyệt đối; gửi lại thất bại giữ mã cũ.

Lần bổ sung unit test đã chạy toàn bộ: **47/47 qua, không skip**, gồm 24 unit, 18 API và 5 SQL tests trên database tạm.

### Chạy toàn bộ

```powershell
dotnet test backend/tests/Registration.Tests/Registration.Tests.csproj
```

Mặc định chạy 24 unit tests và 18 API tests với DAO giả, SMTP giả; không truy cập DB nghiệp vụ. 5 SQL tests được skip nếu không có cấu hình instance test. Khi cấu hình SQL test hợp lệ, tổng cộng 47 trường hợp.

Để chạy thêm SQL tests trên instance LOCAL có quyền tạo DB tạm:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet test backend/tests/Registration.Tests/Registration.Tests.csproj
Remove-Item Env:RACEHORSE_TEST_SQL_SERVER
```

SQL tests tạo database tên `RaceHorseRegisterTest_<GUID>`, chỉ lấy định nghĩa CREATE TABLE USER từ schema nguồn, kiểm tra API và DAO thật, rồi xóa đúng database tạm. Không chạy script reset HorseTransportDB và không sửa dữ liệu nghiệp vụ.

Các trường hợp: validation/malformed JSON, BCrypt, giới hạn 72 byte, OTP sai/hết hạn/dùng lại, resend/cooldown, hết hạn tuyệt đối, request đồng thời, trùng email/SĐT, giới hạn email/IP, lỗi DB/gửi thư và rollback.

Frontend: `npm run build`, `npm run lint` trong `frontend`. Gửi email SMTP thực tế chỉ được xác nhận sau khi nhóm cung cấp và thử cấu hình nhà cung cấp.

## Kết quả xác minh lần triển khai này

- Solution build: 0 warning, 0 error.
- 23/23 tests qua, không skip; gồm 5 tests SQL Server trên database tạm riêng.
- Frontend build và lint qua.
- Browser đã kiểm tra form → API request OTP → lỗi khi nhập sai → refresh giữ phiên/đếm ngược → OTP đúng → về Login; SQL tạm có đúng một Customer với BCrypt hash.
- Sau thành công, sessionStorage được xóa; truy cập trực tiếp `/verify-otp` quay về Register.
- Database tạm và hai server kiểm thử đã được dọn. Chưa áp script index lên DB nghiệp vụ, chưa kiểm tra SMTP thật, chưa commit/push.
