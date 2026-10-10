
# Backend Coding Rules (Phiên bản Tinh gọn - Dễ học & Dễ Code)

Tài liệu này chuẩn hóa cấu trúc thư mục và quy tắc lập trình Backend ASP.NET Core Web API cho dự án **Hệ thống Quản lý Vận chuyển Ngựa đua (Racehorse Transport System)**.

---

## 1. Solution & Project Structure

Toàn bộ Backend được xây dựng bằng C# ASP.NET Core theo mô hình Clean Architecture phân tầng, nằm trong thư mục:

```text
backend/
└── src/

```

Cấu trúc gồm 4 Projects độc lập:

```text
src/
├── CBN.Transport.Domain/           # Entities (Models) và Enums
├── CBN.Transport.Application/      # DTOs, Services (Nghiệp vụ)
├── CBN.Transport.Infrastructure/   # DbContext, DAOs (Truy vấn CSDL) và Dịch vụ ngoài
└── CBN.Transport.WebApi/           # Controllers (Endpoints tiếp nhận API)

```

### Nguyên tắc phụ thuộc (Dependency Rules)

Tuân thủ nguyên tắc phụ thuộc 1 chiều:

```text
CBN.Transport.WebApi ──► CBN.Transport.Application & CBN.Transport.Infrastructure
CBN.Transport.Infrastructure ──► CBN.Transport.Application & CBN.Transport.Domain
CBN.Transport.Application ──► CBN.Transport.Domain
CBN.Transport.Domain ──► (Độc lập hoàn toàn, không tham chiếu project nào)

```

---

## 2. Chi tiết cấu trúc từng Project (Đã tinh giản tối đa)

### 2.1. CBN.Transport.Domain (Thực thể CSDL & Danh mục)

*Tương ứng tầng `@Entity` / Models trong Java Web.*

* **Không chia folder con phức tạp**: Đặt toàn bộ các class Entity ngang hàng trong thư mục `Entities/`.
* **Bỏ `BaseEntity**`: Bảng có cột nào thì khai báo đúng cột đó theo ERD, tránh lỗi ép kiểu thừa kế.

```text
CBN.Transport.Domain/
├── Entities/             # Mỗi bảng CSDL = 1 file .cs độc lập
│   ├── User.cs
│   ├── StaffDocument.cs
│   ├── Horse.cs
│   ├── LegalMedicalRecord.cs
│   ├── PartnerFacility.cs
│   ├── TransportRequest.cs
│   ├── RequestHorseMapping.cs
│   ├── TripPlan.cs
│   ├── Vehicle.cs
│   ├── RouteSegment.cs
│   ├── HealthLog.cs
│   ├── Incident.cs
│   ├── Handover.cs
│   ├── Contract.cs
│   ├── Invoice.cs
│   ├── Payment.cs
│   └── Notification.cs
└── Enums/                # Các danh mục trạng thái cố định (tránh lỗi chính tả)
    ├── UserRole.cs       # Customer, LogisticsManager, Driver...
    ├── TransportStatus.cs# Draft, Submitted, Approved, Rejected...
    ├── IncidentStatus.cs # Reported, InProgress, Resolved...
    └── DocumentStatus.cs # Pending, Valid, Expired...

```

---

### 2.2. CBN.Transport.Infrastructure (Truy xuất Database & Multi-DAO)

*Tương ứng tầng `Data/DAO` trong Java Web.*

* **Bỏ Interface DAO (`IBaseDAO`, `IHorseDAO`)**: Tạo trực tiếp các class `DAO.cs`, tiêm thẳng `HorseTransportDbContext` vào để truy vấn LINQ.
* Giữ lại `BaseDAO.cs` nếu muốn tái sử dụng các hàm CRUD chung (Add, Update, Delete, GetById).

```text
CBN.Transport.Infrastructure/
├── Data/
│   ├── Context/          # HorseTransportDbContext.cs (Khai báo DbSet<T> cho các bảng)
│   ├── Configurations/   # Cấu hình Fluent API (độ dài chuỗi VARCHAR, kiểu DECIMAL)
│   ├── Migrations/       # Các file migration do EF Core tự sinh
│   └── Seeders/          # DbInitializer.cs (Nạp dữ liệu mẫu ban đầu: tài khoản, xe...)
├── DAOs/                 # Class truy vấn CSDL cho từng bảng (gọi trực tiếp DbContext)
│   ├── BaseDAO.cs        # (Tùy chọn) Chứa các hàm CRUD cơ bản dùng chung
│   ├── UserDAO.cs        # Các hàm tìm user theo username, check email...
│   ├── HorseDAO.cs       # Các hàm tìm ngựa theo chip ISO, lấy danh sách theo chủ...
│   ├── TransportRequestDAO.cs
│   ├── TripPlanDAO.cs
│   ├── HealthLogDAO.cs
│   └── InvoiceDAO.cs
└── ExternalServices/     # Code gọi các API đối tác bên thứ 3
    ├── Maps/             # GoogleMapsService.cs (tính khoảng cách, ETA)
    ├── Payments/         # VnPayService.cs (tạo link thanh toán, callback)
    └── Storage/          # CloudinaryService.cs (upload ảnh, scan giấy tờ)

```

---

### 2.3. CBN.Transport.Application (Xử lý nghiệp vụ & Logic)

*Tương ứng tầng `@Service` và `DTO` trong Java Web.*

* **Bỏ thư viện `AutoMapper**`: Gán dữ liệu thủ công giữa DTO và Entity (`new HorseDto { ... }`) để code rõ ràng, dễ bắt lỗi.
* **Bỏ thư viện `FluentValidation**`: Dùng trực tiếp các thẻ thuộc tính Data Annotations (`[Required]`, `[MaxLength]`) trên DTO giống hệt Java Validation.

```text
CBN.Transport.Application/
├── DTOs/                 # Các object nhận dữ liệu từ request hoặc trả kết quả
│   ├── Auth/             # LoginRequestDto.cs, TokenResponseDto.cs...
│   ├── Horses/           # CreateHorseDto.cs, HorseDetailDto.cs...
│   ├── Shipments/        # CreateTransportRequestDto.cs, ApproveRequestDto.cs...
│   ├── Trips/            # TripPlanDto.cs, AssignVehicleDto.cs...
│   ├── Operations/       # CheckInMilestoneDto.cs, AddHealthLogDto.cs...
│   ├── Incidents/        # CreateIncidentDto.cs, ResolveIncidentDto.cs...
│   └── Billing/          # InvoiceDto.cs, PaymentCallbackDto.cs...
├── Services/             # Chứa code logic nghiệp vụ (tiêm DAO vào để lấy dữ liệu)
│   ├── AuthService.cs
│   ├── HorseService.cs
│   ├── TransportRequestService.cs
│   ├── TripPlanService.cs
│   ├── HealthLogService.cs
│   └── InvoiceService.cs
└── Common/
    ├── Exceptions/       # BusinessRuleException.cs, NotFoundException.cs
    └── Models/           # ApiResponse.cs (Khuôn mẫu JSON trả về thống nhất)

```

---

### 2.4. CBN.Transport.WebApi (Controllers & Cổng chạy ứng dụng)

*Tương ứng tầng `@RestController` trong Java Web.*

* Tiếp nhận HTTP Request (GET, POST, PUT, DELETE), chuyển dữ liệu xuống tầng Service và trả về kết quả JSON.

```text
CBN.Transport.WebApi/
├── Controllers/          # Đón URL và gọi Service tương ứng
│   ├── AuthController.cs
│   ├── HorsesController.cs
│   ├── TransportRequestsController.cs
│   ├── TripsController.cs
│   ├── FieldOperationsController.cs
│   └── BillingController.cs
├── Hubs/                 # SignalR Hubs phục vụ Realtime
│   ├── TrackingHub.cs    # Đẩy tọa độ GPS trực tiếp
│   └── NotificationHub.cs# Bắn thông báo và cảnh báo SOS khẩn cấp
├── Middlewares/
│   ├── ExceptionHandlingMiddleware.cs # Bắt lỗi toàn cục (Global try-catch)
│   └── JwtMiddleware.cs  # Xác thực đăng nhập qua token
├── appsettings.json      # Lưu chuỗi kết nối SQL Server, Secret Key JWT
└── Program.cs            # Khởi động ứng dụng và đăng ký DbContext, DAOs, Services

```

---

## 3. Quy tắc cốt lõi cần nhớ khi code (Dành cho thành viên nhóm)

1. **Một chức năng đi qua đúng 3 file:**
* `Controller` (WebApi) đón URL và DTO.


* `Service` (Application) kiểm tra điều kiện đúng/sai.


* `DAO` (Infrastructure) gọi `DbContext` để lưu hoặc lấy dữ liệu từ SQL Server.




2. **Chuẩn hóa phản hồi API (`ApiResponse<T>`):**
* Mọi endpoint trả về định dạng bọc thống nhất để Frontend dễ xử lý:


```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... }
}

```




3. **Bảo toàn dữ liệu nghiệp vụ:**
* Sử dụng xóa mềm (`IsActive = false` hoặc `IsDeleted = true`), không dùng Hard Delete.


* Dữ liệu nhật ký sức khỏe (`HealthLog`) và sự cố (`Incident`) áp dụng cơ chế **Insert-Only** (chỉ thêm mới, không sửa/xóa).




4. **Không commit rác:** Tuyệt đối không commit các thư mục `bin/`, `obj/`, `.vs/` hoặc các file dữ liệu SQL vật lý (`.mdf`, `.ldf`) lên GitHub.

5. **Không "nhìn giao diện rồi đoán cách code":** Với Frontend hiện tại, Backend nên dựa vào 4 thứ theo thứ tự ưu tiên:
* `auth-api.md` — nguồn chính để biết FE và BE giao tiếp thế nào.
* SRS / Use Case — để biết nghiệp vụ phải xử lý ra sao.
* Database/Entity design — để biết dữ liệu thật nằm ở đâu.
* Code FE như `authApi.ts`, `auth.types.ts` — để kiểm tra việc tích hợp có khớp contract hay không.


```