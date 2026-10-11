# Backend Coding Rules

## 1. Solution & Project Structure

Toàn bộ mã nguồn Backend được xây dựng bằng C# ASP.NET Core theo mô hình Clean Architecture (N-Tier RESTful Web API), nằm trong thư mục:

```text
backend/
└── src/

```

Cấu trúc chuẩn của Solution gồm 4 Projects độc lập:

```text
src/
├── CBN.Transport.Domain/
├── CBN.Transport.Application/
├── CBN.Transport.Infrastructure/
└── CBN.Transport.WebApi/

```

### Nguyên tắc phụ thuộc (Dependency Rules)

Tuân thủ nguyên tắc phụ thuộc một chiều, tuyệt đối không tạo vòng lặp tham chiếu:

```text
CBN.Transport.WebApi ──► CBN.Transport.Application & CBN.Transport.Infrastructure
CBN.Transport.Infrastructure ──► CBN.Transport.Application & CBN.Transport.Domain
CBN.Transport.Application ──► CBN.Transport.Domain
CBN.Transport.Domain ──► (Độc lập hoàn toàn, không tham chiếu project nào)

```

### Quy tắc

* Không tự ý tạo thêm project mới ở cấp `src/` khi chưa thống nhất với cả nhóm.
* Mọi logic nghiệp vụ bắt buộc nằm tại `Application`, không viết nghiệp vụ trong `WebApi` (Controllers) hay `Infrastructure`.

---

## 2. Feature & Module Mapping

Cấu trúc nghiệp vụ tại Backend được tổ chức đồng bộ trực tiếp với các features ở Frontend:

```text
Modules:
├── auth/                   # Xác thực, tài khoản & phân quyền (5 Actors)
├── horses/                 # Quản lý lý lịch, microchip, passport ngựa
├── transport-requests/     # Tạo đơn, duyệt đơn, gán nhân sự (Flow 1)
├── documents/              # Thẩm định hồ sơ y tế, checklist xuất nhập cảnh (Flow 2)
├── facilities/             # Quản lý đối tác, trạm nghỉ, trạm kiểm dịch
├── dispatch/               # Điều phối đội xe, nhân sự, kiểm tra chống trùng lịch (Flow 3)
├── trips/                  # Lộ trình, chia chặng đa phương thức (Road/Air/Sea)
├── operations/             # Check-in mốc hành trình, nhật ký sinh hiệu (Flow 4)
├── incidents/              # Cảnh báo SOS, điều chỉnh lộ trình khẩn cấp (Flow 5)
├── handover/               # Biên bản giao nhận 2 đầu, đối soát mã chip (Flow 6)
└── billing/                # Hợp đồng, hóa đơn 3 đợt, đa tiền tệ & cổng thanh toán

```

---

## 3. Structure Inside Each Project

### 3.1. CBN.Transport.Domain (Core Business & Entities)

Chứa thực thể ánh xạ CSDL và định nghĩa trừu tượng cốt lõi. Tương ứng tầng `Model` / `@Entity` trong Java Web:

```text
CBN.Transport.Domain/
├── Entities/
│   ├── Identity/         # User.cs, StaffDocument.cs
│   ├── Equine/           # Horse.cs, LegalMedicalRecord.cs
│   ├── Facility/         # PartnerFacility.cs, FacilityContract.cs, FacilityCertification.cs
│   ├── Shipment/         # TransportRequest.cs, RequestHorseMapping.cs, QuarantineBooking.cs
│   ├── Operations/       # TripPlan.cs, Vehicle.cs, TripVehicleAssignment.cs,
│   │                     # RouteSegment.cs, CustomsClearance.cs, HealthLog.cs,
│   │                     # Incident.cs, Handover.cs, HandoverItem.cs
│   ├── Finance/          # Contract.cs, CostItem.cs, Invoice.cs, Payment.cs
│   └── System/           # Notification.cs
├── Enums/                # UserRole.cs, TransportStatus.cs, DocumentStatus.cs, IncidentStatus...
├── Common/               # BaseEntity.cs (Id, CreatedAt, UpdatedAt, IsDeleted)
└── Interfaces/
    └── DAOs/             # Khai báo các Interface DAO cho từng bảng
        ├── IBaseDAO.cs   # Interface CRUD chung (GetAllAsync, GetByIdAsync, AddAsync...)
        ├── IUserDAO.cs
        ├── IHorseDAO.cs
        ├── ITransportRequestDAO.cs
        ├── ITripPlanDAO.cs
        ├── IHealthLogDAO.cs
        └── IInvoiceDAO.cs

```

### 3.2. CBN.Transport.Application (Business Logic & Use Cases)

Chứa toàn bộ logic kiểm tra, tính toán nghiệp vụ và DTOs. Tương ứng tầng `Service` & `DTO` trong Java Web:

```text
CBN.Transport.Application/
├── DTOs/                 # Request/Response objects phân theo nghiệp vụ
│   ├── Auth/             # LoginRequestDto.cs, TokenResponseDto.cs
│   ├── Horses/           # CreateHorseDto.cs, HorseDetailDto.cs
│   ├── Shipments/        # CreateTransportRequestDto.cs, ApproveRequestDto.cs
│   ├── Trips/            # TripPlanDto.cs, AssignVehicleDto.cs
│   ├── Operations/       # CheckInMilestoneDto.cs, AddHealthLogDto.cs
│   ├── Incidents/        # CreateIncidentDto.cs, ResolveIncidentDto.cs
│   └── Billing/          # InvoiceDto.cs, PaymentCallbackDto.cs
├── Interfaces/           # IAuthService.cs, IHorseService.cs, ITransportRequestService.cs...
├── Services/             # Triển khai logic nghiệp vụ (HorseService.cs, TransportRequestService.cs...)
├── Common/
│   ├── Exceptions/       # BusinessRuleException.cs, NotFoundException.cs, UnauthorizedException.cs
│   ├── Mappings/         # Cấu hình ánh xạ DTO <-> Entity (AutoMapper / Mapster)
│   └── Models/           # ApiResponse.cs, PagedResult.cs
└── Validators/           # Schema kiểm tra hợp lệ dữ liệu đầu vào (FluentValidation)

```

### 3.3. CBN.Transport.Infrastructure (Database Access & External Integrations)

Hiện thực hóa việc lưu trữ dữ liệu và tích hợp hệ thống ngoại vi. Tương ứng tầng `Data/DAO` trong Java Web:

```text
CBN.Transport.Infrastructure/
├── Data/
│   ├── Context/          # HorseTransportDbContext.cs (kế thừa từ DbContext)
│   ├── Configurations/   # Cấu hình Fluent API cho các bảng (VARCHAR(50), DECIMAL(12,2), Unique)
│   ├── Migrations/       # Các file migration do EF Core tự sinh (Code-First)
│   └── Seeders/          # DbInitializer.cs (nạp dữ liệu mẫu ban đầu cho 5 Actor, xe, trạm)
├── DAOs/                 # Triển khai code truy vấn CSDL cho từng bảng
│   ├── BaseDAO.cs        # Class BaseDAO<T> dùng chung kế thừa IBaseDAO<T>
│   ├── UserDAO.cs        # Kế thừa BaseDAO<User>, implements IUserDAO
│   ├── HorseDAO.cs       # Kế thừa BaseDAO<Horse>, implements IHorseDAO
│   ├── TransportRequestDAO.cs # Kế thừa BaseDAO<TransportRequest>, implements ITransportRequestDAO
│   ├── TripPlanDAO.cs    # Kế thừa BaseDAO<TripPlan>, implements ITripPlanDAO
│   ├── HealthLogDAO.cs   # Kế thừa BaseDAO<HealthLog>, implements IHealthLogDAO
│   └── InvoiceDAO.cs     # Kế thừa BaseDAO<Invoice>, implements IInvoiceDAO
└── ExternalServices/
    ├── Maps/             # GoogleMapsService.cs (tính khoảng cách, ETA, vẽ lộ trình)
    ├── Payments/         # VnPayService.cs, StripeService.cs
    └── Storage/          # CloudinaryService.cs (upload bản scan hộ chiếu, ảnh hiện trường SOS)

```

### 3.4. CBN.Transport.WebApi (Controllers & Entry Point)

Cổng tiếp nhận HTTP request và điều hướng hệ thống. Tương ứng `@RestController` trong Java Web:

```text
CBN.Transport.WebApi/
├── Controllers/          # AuthController.cs, HorsesController.cs, TransportRequestsController.cs,
│                         # TripsController.cs, FieldOperationsController.cs, BillingController.cs...
├── Hubs/                 # SignalR Hubs: TrackingHub.cs (GPS realtime), NotificationHub.cs (SOS Red Alert)
├── Middlewares/          # ExceptionHandlingMiddleware.cs (Global catch lỗi), JwtMiddleware.cs
├── Extensions/           # ServiceExtensions.cs (đăng ký Dependency Injection gọn cho DbContext, DAOs, Services)
├── appsettings.json      # Chuỗi kết nối SQL Server, Secret Key JWT, API Keys
└── Program.cs            # Entry point cấu hình pipeline và middleware của ứng dụng

```

---

## 4. Coding & Architecture Rules

1. **Zero-Trust Logic (Không tin tưởng Client):**
* Không dựa vào việc Frontend đã validate form. Toàn bộ logic (kiểm tra quyền Actor, ngày khởi hành, sức chứa xe, tính trùng lịch) bắt buộc phải kiểm tra lại tại Service của Backend.
<<<<<<< HEAD




2. **Chuẩn hóa API Response:**
* Mọi Endpoint phải trả về định dạng JSON bọc thống nhất `ApiResponse<T>`:
=======
>>>>>>> 2cfb285ec7be4b1c48d56c0c85f3e054d3296134

2. **Chuẩn hóa API Response:**
* Mọi Endpoint phải trả về định dạng JSON bọc thống nhất `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... }
}
```

3. **Xử lý Ngoại lệ tập trung (Global Exception Handling):**
* Ném ngoại lệ nghiệp vụ trực tiếp trong tầng Service (`throw new BusinessRuleException(...)`, `throw new NotFoundException(...)`).
* Sử dụng `ExceptionHandlingMiddleware` để chuyển đổi ngoại lệ thành HTTP Status Code tương ứng (400, 404, 500), không viết `try-catch` tràn lan trong Controllers.

4. **Quy chuẩn Định danh & Dữ liệu CSDL:**
* Tất cả Khóa chính (PK) và Khóa ngoại (FK) dùng chuỗi `VARCHAR(50)`.
* Tất cả dữ liệu tiền tệ và cước phí bắt buộc dùng `DECIMAL(12, 2)` để tránh sai số làm tròn.
* Các trường file/hình ảnh chỉ lưu chuỗi URL (`VARCHAR(500)`), tệp nhị phân lưu trữ qua Cloud/Storage Service.

5. **Bảo toàn Dữ liệu:**
* Áp dụng Xóa mềm (Soft Delete) qua cờ `IsDeleted` / `IsActive` cho danh mục tài khoản, phương tiện và lịch sử chuyến đi; tuyệt đối cấm dùng Hard Delete.
* Bảng `HEALTH_LOG` (nhật ký sức khỏe) và `INCIDENT` (sự cố) tuân thủ cơ chế **Insert-Only** (chỉ cho phép ghi thêm, cấm sửa và cấm xóa).

6. **Quy tắc Git:**
* Không commit các thư mục build (`bin/`, `obj/`, `.vs/`) hoặc file CSDL vật lý (`.mdf`, `.ldf`).
* Mọi thay đổi cấu trúc bảng phải thực hiện qua EF Core Migrations hoặc đồng bộ vào `database/init_database.sql`.

7. **Không "nhìn giao diện rồi đoán cách code":** 
* Với Frontend hiện tại, Backend nên dựa vào 4 thứ theo thứ tự ưu tiên:
  - `auth-api.md` (hoặc các tài liệu API tương đương) — nguồn chính để biết FE và BE giao tiếp thế nào.
  - SRS / Use Case — để biết nghiệp vụ phải xử lý ra sao.
  - Database/Entity design — để biết dữ liệu thật nằm ở đâu.
  - Code FE như `authApi.ts`, `auth.types.ts` — để kiểm tra việc tích hợp có khớp contract hay không.ng commit các thư mục build (`bin/`, `obj/`, `.vs/`) hoặc file CSDL vật lý (`.mdf`, `.ldf`).


* Mọi thay đổi cấu trúc bảng phải thực hiện qua EF Core Migrations hoặc đồng bộ vào `database/init_database.sql`.





```

<<<<<<< HEAD



3. **Xử lý Ngoại lệ tập trung (Global Exception Handling):**
* Ném ngoại lệ nghiệp vụ trực tiếp trong tầng Service (`throw new BusinessRuleException(...)`, `throw new NotFoundException(...)`).


* Sử dụng `ExceptionHandlingMiddleware` để chuyển đổi ngoại lệ thành HTTP Status Code tương ứng (400, 404, 500), không viết `try-catch` tràn lan trong Controllers.




4. **Quy chuẩn Định danh & Dữ liệu CSDL:**
* Tất cả Khóa chính (PK) và Khóa ngoại (FK) dùng chuỗi `VARCHAR(50)`.


* Tất cả dữ liệu tiền tệ và cước phí bắt buộc dùng `DECIMAL(12, 2)` để tránh sai số làm tròn.


* Các trường file/hình ảnh chỉ lưu chuỗi URL (`VARCHAR(500)`), tệp nhị phân lưu trữ qua Cloud/Storage Service.




5. **Bảo toàn Dữ liệu:**
* Áp dụng Xóa mềm (Soft Delete) qua cờ `IsDeleted` / `IsActive` cho danh mục tài khoản, phương tiện và lịch sử chuyến đi; tuyệt đối cấm dùng Hard Delete.


* Bảng `HEALTH_LOG` (nhật ký sức khỏe) và `INCIDENT` (sự cố) tuân thủ cơ chế **Insert-Only** (chỉ cho phép ghi thêm, cấm sửa và cấm xóa).




6. **Quy tắc Git:**
* Không commit các thư mục build (`bin/`, `obj/`, `.vs/`) hoặc file CSDL vật lý (`.mdf`, `.ldf`).


* Mọi thay đổi cấu trúc bảng phải thực hiện qua EF Core Migrations hoặc đồng bộ vào `database/init_database.sql`.



5. **Không "nhìn giao diện rồi đoán cách code":** Với Frontend hiện tại, Backend nên dựa vào 4 thứ theo thứ tự ưu tiên:
* `auth-api.md` — nguồn chính để biết FE và BE giao tiếp thế nào.
* SRS / Use Case — để biết nghiệp vụ phải xử lý ra sao.
* Database/Entity design — để biết dữ liệu thật nằm ở đâu.
* Code FE như `authApi.ts`, `auth.types.ts` — để kiểm tra việc tích hợp có khớp contract hay không.
=======
```
>>>>>>> 2cfb285ec7be4b1c48d56c0c85f3e054d3296134
