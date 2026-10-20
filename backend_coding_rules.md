# BACKEND CODING RULES
**Project:** Racehorse Transport System

**Architecture:** Clean Architecture – 4 Layers

**Technology:** ASP.NET Core Web API, C#, Entity Framework Core, SQL Server

## 1. Mục đích (Purpose)

Tất cả thành viên tham gia phát triển Backend phải tuân thủ thống nhất các quy tắc trong tài liệu này nhằm:

- Đảm bảo tính nhất quán của source code.
- Phân chia rõ trách nhiệm giữa các tầng.
- Hạn chế merge conflict khi làm việc nhóm.
- Đảm bảo Frontend và Backend tuân thủ API Contract.
- Giúp hệ thống dễ mở rộng, kiểm thử và bảo trì.
- Tránh lỗi thiếu Interface, thiếu Dependency Injection hoặc không đồng bộ Database.

**Nguyên tắc bắt buộc:** Mỗi function phải được đặt đúng tầng theo trách nhiệm của nó. Không được đưa toàn bộ logic của một tính năng vào Controller.

---

## 2. Cấu trúc Backend (Project Structure)

Backend được chia thành 4 project chính.

### 2.1. Domain Layer

**Thư mục:** `backend/Domain/`

Chịu trách nhiệm định nghĩa các thành phần cốt lõi của hệ thống.

Bao gồm:

- `Entities/`: Các thực thể nghiệp vụ.
- `Enums/`: Các giá trị liệt kê.
- `Interfaces/DAOs/`: Các interface truy cập dữ liệu.
- Các quy tắc và đối tượng nghiệp vụ thuộc Domain nếu cần.

**Quy tắc:**

- Không viết SQL hoặc Entity Framework query trong Domain.
- Không phụ thuộc vào Application, Infrastructure hoặc WebApi.
- Không chứa Controller hoặc logic xử lý HTTP.
- Khi cần một thao tác truy xuất dữ liệu mới, phải kiểm tra và khai báo phương thức trong DAO Interface tương ứng.

### 2.2. Application Layer

**Thư mục:** `backend/Application/`

Chịu trách nhiệm thực hiện các use case và xử lý Business Logic.

Bao gồm:

- `DTOs/`: Các đối tượng dữ liệu Request/Response.
- `Services/`: Các service xử lý nghiệp vụ.
- `Interfaces/`: Các interface service hoặc abstraction cần thiết.
- Validation và các thành phần ứng dụng khác khi cần.

**Quy tắc:**

- Xử lý business rules, workflow và validation nghiệp vụ.
- Gọi DAO thông qua Interface, không phụ thuộc trực tiếp vào DAO Implementation.
- Không viết SQL trực tiếp trong Service.
- Không xử lý HTTP Request/Response trực tiếp.
- Không trả Entity chứa dữ liệu nhạy cảm nếu API chỉ cần một số trường nhất định.
- Không được gọi phương thức DAO chưa khai báo trong Interface.

### 2.3. Infrastructure Layer

**Thư mục:** `backend/Infrastructure/`

Chịu trách nhiệm triển khai các thao tác kỹ thuật và kết nối hệ thống bên ngoài.

Bao gồm:

- `DAOs/`: Các DAO Implementation.
- `Data/` hoặc thư mục DbContext hiện có.
- `Migrations/`: EF Core Migration.
- Các dịch vụ tích hợp ngoài như Email, Storage và các thành phần hạ tầng khác.

**Quy tắc:**

- DAO phải triển khai đầy đủ các phương thức của Interface.
- Mỗi phương thức DAO phải có trách nhiệm truy vấn hoặc cập nhật dữ liệu rõ ràng.
- Sử dụng EF Core đúng quy ước của dự án.
- Không đưa business workflow phức tạp vào DAO.
- Không tạo DAO trùng chức năng nếu có thể mở rộng implementation hiện tại.
- Không tự ý thay đổi Database Schema mà không đồng bộ Entity, DbContext và Migration.

### 2.4. WebApi Layer

**Thư mục:** `backend/WebApi/`

Chịu trách nhiệm giao tiếp với Frontend thông qua HTTP API.

Bao gồm:

- `Controllers/`: Các API Controller.
- `Program.cs`: Khởi tạo ứng dụng và cấu hình Dependency Injection.
- Middleware, Authentication, Authorization và cấu hình API.

**Quy tắc:**

- Controller chỉ tiếp nhận Request, gọi Service và trả Response.
- Không viết SQL hoặc truy cập DbContext trực tiếp trong Controller.
- Không đặt business logic dài dòng trong Controller.
- Sử dụng đúng HTTP Methods và HTTP Status Codes.
- Đăng ký Service/DAO với Dependency Injection.
- API Endpoint phải tuân thủ API Contract đã thống nhất.

---

## 3. Nguyên tắc phụ thuộc (Dependency Rules)

Các project phải tuân thủ nguyên tắc phụ thuộc một chiều.

| Project | Được phép phụ thuộc |
|---|---|
| Domain | Không phụ thuộc project khác |
| Application | Domain |
| Infrastructure | Domain, Application |
| WebApi | Application, Infrastructure |

**Không được thực hiện:**

- Domain tham chiếu Infrastructure.
- Domain tham chiếu Application hoặc WebApi.
- Application gọi trực tiếp lớp DAO Implementation của Infrastructure.
- Infrastructure phụ thuộc WebApi.
- Service khởi tạo trực tiếp DAO bằng `new UserDAO(...)` thay vì sử dụng Dependency Injection.

**Nguyên tắc cốt lõi:** Các tầng chứa nghiệp vụ không được phụ thuộc vào chi tiết triển khai của các tầng bên ngoài.

---

## 4. Quy trình viết một Function mới

Khi nhận một chức năng mới, Developer phải thực hiện theo trình tự sau.

### Bước 1: Phân tích Requirement và API Contract

Trước khi viết code:

1. Xác định Actor được phép thực hiện chức năng.
2. Xác định Use Case và Business Rules.
3. Xác định API Endpoint, HTTP Method.
4. Xác định Request DTO và Response DTO.
5. Xác định các bảng và Entity liên quan.
6. Xác định Status Codes và các trường hợp lỗi.

API Contract phải được thống nhất với Frontend trước khi tích hợp.

Nếu tính năng thay đổi sau này, Developer được phép cập nhật API Contract nhưng phải thông báo và thống nhất với các thành viên liên quan.

### Bước 2: Domain – Khai báo Interface và Entity

Developer cần kiểm tra:

- Entity đã tồn tại chưa?
- Có cần bổ sung thuộc tính không?
- DAO Interface đã có phương thức cần sử dụng chưa?

Nếu chưa có, bổ sung các thành phần cần thiết.

Không tạo Interface hoặc Entity mới nếu đã có thành phần đáp ứng cùng trách nhiệm.

### Bước 3: Infrastructure – Triển khai DAO

Developer triển khai phương thức truy cập dữ liệu tương ứng.

Yêu cầu:

- Tên phương thức và kiểu trả về phải khớp với DAO Interface.
- Truy vấn phải đáp ứng đúng yêu cầu của Service.
- Áp dụng xử lý bất đồng bộ khi thích hợp.
- Xác định rõ điều kiện tìm kiếm, cập nhật và lưu dữ liệu.
- Nếu thay đổi cấu trúc Database, phải tạo và kiểm tra Migration.

### Bước 4: Application – DTO và Business Service

Developer:

1. Tạo hoặc cập nhật Request/Response DTO.
2. Khai báo hoặc cập nhật Service Interface.
3. Triển khai Business Logic.
4. Gọi DAO thông qua Interface.
5. Xử lý các trường hợp nghiệp vụ thành công và thất bại.

Service không được truy cập trực tiếp SQL Server.

### Bước 5: WebApi – Controller và Dependency Injection

Developer:

1. Tạo hoặc bổ sung API Endpoint trong Controller phù hợp.
2. Inject Service thông qua constructor.
3. Nhận và kiểm tra dữ liệu Request.
4. Gọi Service.
5. Trả HTTP Response theo API Contract.
6. Đăng ký các Service/DAO mới trong Dependency Injection hoặc module registration tương ứng.

Không đăng ký lại Service đã được cấu hình đầy đủ.

### Bước 6: Kiểm thử

Tối thiểu phải kiểm tra:

- Build không có lỗi biên dịch.
- API nhận đúng Request.
- API trả đúng Response và Status Code.
- Các trường hợp validation và xử lý lỗi.
- Phân quyền và quyền truy cập.
- Dữ liệu được truy xuất hoặc cập nhật chính xác.
- Những chức năng liên quan không bị ảnh hưởng.

Ưu tiên viết Unit Test cho Business Logic và Integration Test cho các luồng quan trọng.

### Bước 7: Commit và Pull Request

Sau khi hoàn thành:

1. Kiểm tra các file đã thay đổi.
2. Chạy build và các test liên quan.
3. Đảm bảo không commit mật khẩu hoặc thông tin bí mật.
4. Commit với nội dung rõ ràng.
5. Push lên branch của mình.
6. Tạo Pull Request và xử lý review trước khi merge vào branch chung.

---

## 5. Quy tắc khai báo Interface và Implementation

Khi thêm một phương thức mới vào DAO, phải đảm bảo:

- Phương thức được khai báo trong đúng Interface.
- DAO Implementation triển khai đúng chữ ký.
- Service gọi thông qua Interface.
- Các tham số và kiểu trả về thống nhất.
- Các implementation khác của cùng Interface cũng được cập nhật nếu cần.

**Ví dụ:**

Nếu `AuthService` cần sử dụng `GetByResetTokenAsync`, phương thức này phải được khai báo trong `IUserDAO` và triển khai bởi `UserDAO`.

Không được chỉ thêm lời gọi trong `AuthService` rồi commit mà chưa cập nhật Interface và Implementation.

---

## 6. Quy tắc API Contract

API Contract là thỏa thuận chính thức giữa Frontend và Backend.

Mỗi API cần xác định:

- API ID và chức năng.
- HTTP Method.
- Endpoint.
- Authorization và Role được phép sử dụng.
- Request Parameters/Body.
- Success Response.
- Error Response.
- HTTP Status Codes.
- Validation Rules.

**Quy định:**

- Không tự ý thay đổi tên field trong Request hoặc Response khi Frontend đang sử dụng.
- Không tự ý đổi Endpoint.
- Không thay đổi kiểu dữ liệu nếu chưa thống nhất.
- Không xóa API đang được sử dụng mà chưa có kế hoạch thay thế.
- Thay đổi API Contract phải được cập nhật trong tài liệu tương ứng.

---

## 7. Quy tắc Database và Migration

- Không tự ý xóa bảng hoặc cột của hệ thống.
- Không tự ý thay đổi quan hệ khóa ngoại.
- Khi thay đổi Entity, phải kiểm tra EF Core Mapping.
- Nếu thay đổi Database Schema, phải tạo Migration phù hợp.
- Không chỉnh sửa hoặc xóa Migration đã được áp dụng trên Database chung nếu chưa thống nhất.
- Không xóa dữ liệu thật để xử lý lỗi thử nghiệm.
- Phải kiểm tra Migration trên môi trường phát triển trước khi tích hợp.

Database trên máy mỗi thành viên có thể khác nhau, vì vậy nhóm phải thống nhất quy trình cập nhật Migration.

---

## 8. Quy tắc bảo mật (Security Rules)

- Không lưu mật khẩu dưới dạng Plain Text.
- Không trả PasswordHash, OTP hoặc Secret trong API Response.
- Không ghi OTP hoặc thông tin xác thực nhạy cảm vào log.
- Không hard-code Database Password, JWT Secret hoặc API Key.
- Sử dụng biến môi trường hoặc cơ chế Secret Management.
- Xác thực và phân quyền các API yêu cầu đăng nhập.
- OTP/Reset Token phải có thời gian hết hạn và được vô hiệu hóa sau khi sử dụng.
- Không tin tưởng dữ liệu từ Frontend nếu chưa được kiểm tra ở Backend.
- Không đưa thông tin kết nối nhạy cảm vào GitHub.

---

## 9. Quy tắc xử lý lỗi (Error Handling)

- Phân biệt lỗi Validation, lỗi nghiệp vụ và lỗi hệ thống.
- Không trả Stack Trace trực tiếp cho người dùng.
- Ghi log lỗi kỹ thuật có đủ ngữ cảnh cần thiết nhưng không làm lộ dữ liệu nhạy cảm.
- Sử dụng Exception Handling Middleware hoặc cơ chế xử lý lỗi thống nhất.
- Trả HTTP Status Code theo bản chất của lỗi.
- Không dùng `try-catch` tràn lan để che giấu lỗi.
- Không trả thành công giả khi thao tác dữ liệu thất bại, trừ trường hợp phản hồi chung có chủ đích vì bảo mật.

---

## 10. Quy tắc đặt tên và tổ chức code

- Class, Interface, Method, Property: `PascalCase`.
- Parameter và Local Variable: `camelCase`.
- Private Field: `_camelCase`.
- Interface phải có tiền tố `I`.
- Phương thức bất đồng bộ sử dụng hậu tố `Async`.
- Sử dụng đúng namespace của project.
- Không tạo nhiều class trùng tên và trùng trách nhiệm một cách không cần thiết.
- Không đưa toàn bộ chức năng vào một file lớn.
- Ưu tiên phương thức ngắn, dễ hiểu và có trách nhiệm rõ ràng.
- Chỉ tạo abstraction mới khi có nhu cầu rõ ràng.
- Ưu tiên tái sử dụng Service/DAO hiện có trước khi tạo mới.

---

## 11. Quy tắc làm việc nhóm (Team Collaboration)

- Mỗi Developer làm việc trên branch cá nhân hoặc feature branch được phân công.
- Không trực tiếp push lên branch chính nếu quy trình nhóm yêu cầu Pull Request.
- Không thay đổi code của module khác khi không cần thiết (Nếu có thì phải có trách nhiệm. hỏi thì phải biết trả lời).
- Khi phải sửa Interface, Entity, DbContext hoặc cấu hình dùng chung, cần thông báo thành viên liên quan.
- Không commit file cấu hình cá nhân chứa thông tin nhạy cảm.
- Không sử dụng `git push --force` trên branch chung khi chưa được thống nhất.
- Phải giải quyết conflict và kiểm thử lại trước khi merge.
- Không merge code Backend nếu build hoặc test bắt buộc đang thất bại.

Việc chia module giúp giảm xung đột khi làm việc nhóm, nhưng không đảm bảo loại bỏ hoàn toàn merge conflict.

---

## 12. Checklist trước khi hoàn thành Function

Developer phải kiểm tra:

- [ ] Function đáp ứng Requirement và Use Case.
- [ ] API tuân thủ API Contract.
- [ ] Entity và DAO Interface chính xác.
- [ ] DAO Implementation đầy đủ.
- [ ] Business Logic nằm trong Application Service.
- [ ] Controller không chứa Business Logic phức tạp.
- [ ] Dependency Injection được đăng ký chính xác.
- [ ] Authorization và Validation được xử lý.
- [ ] Database Migration được tạo nếu cần.
- [ ] Không có dữ liệu nhạy cảm trong source code hoặc log.
- [ ] Backend build thành công.
- [ ] API được kiểm thử với Swagger hoặc công cụ tương đương.
- [ ] Unit/Integration Tests liên quan chạy thành công.
- [ ] Không phát sinh lỗi ở các chức năng liên quan.
- [ ] Code đã được commit vào đúng branch.

**Quy tắc cuối cùng:**

Một function chỉ được xem là hoàn thành khi nó hoạt động đúng nghiệp vụ, tuân thủ Clean Architecture, không phá vỡ API Contract, vượt qua các bước kiểm thử bắt buộc và sẵn sàng để review hoặc merge.