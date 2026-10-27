# TÀI LIỆU HƯỚNG DẪN KIỂM THỬ & PHÁT TRIỂN TÍNH NĂNG MỚI
> **Dự án:** RaceHorse Transport System (SWP391)  
> **Kiến trúc:** Clean Architecture (.NET 8 Web API + Entity Framework Core + SQL Server)

---

## MỤC LỤC
1. [Khởi động Hệ thống](#1-khởi-động-hệ-thống)
2. [Bộ Test Case Kiểm tra Kết nối (Dành cho Tester / Developer)](#2-bộ-test-case-kiểm-tra-kết-nối)
3. [Dữ liệu Test có sẵn trong Database](#3-dữ-liệu-test-có-sẵn-trong-database)
4. [Hướng dẫn Thành viên Nhóm Code Thêm Tính năng Mới](#4-hướng-dẫn-thành-viên-nhóm-code-thêm-tính-năng-mới)
5. [Hướng dẫn Phía Frontend Kết nối](#5-hướng-dẫn-phía-frontend-kết-nối)

---

## 1. KHỞI ĐỘNG HỆ THỐNG

### Điều kiện tiên quyết:
- Đã cài đặt **.NET 8 SDK**
- Dịch vụ **SQL Server** đang chạy trên máy (database `HorseTransportDB`).
- Kiểm tra chuỗi kết nối trong `RaceHorse_Transport_WebApi/appsettings.json`:
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=HorseTransportDB;uid=sa;Password=12345;TrustServerCertificate=True;"
  }
  ```

### Lệnh chạy Backend:
Mở terminal tại thư mục gốc của Backend và chạy:
```powershell
dotnet run --project .\RaceHorse_Transport_WebApi
```
- **Địa chỉ API Backend:** `http://localhost:5129`
- **Giao diện Swagger UI:** [http://localhost:5129/swagger](http://localhost:5129/swagger)

---

## 2. BỘ TEST CASE KIỂM TRA KẾT NỐI

Mở trình duyệt vào [http://localhost:5129/swagger](http://localhost:5129/swagger) và thực hiện các test case dưới đây:

### TEST CASE 1: Kiểm tra kết nối Mạng & CORS (Ping Test)
* **Mục đích:** Xác định Backend đang hoạt động và sẵn sàng đón nhận request từ Frontend (không phụ thuộc Database).
* **API:** `GET /api/connection/ping`
* **Thao tác:** Bấm **Try it out** -> **Execute**.
* **Kết quả mong đợi (Status 200 OK):**
  ```json
  {
    "success": true,
    "status": "Connected",
    "message": "Kết nối giữa Frontend và Backend .NET thành công 100%!",
    "cors": "Enabled (Mọi origin, method, header đều được cho phép)"
  }
  ```

---

### TEST CASE 2: Kiểm tra kết nối SQL Server (Database Health)
* **Mục đích:** Xác định Backend đã thông tuyến tới Database `HorseTransportDB` và đếm được số bản ghi.
* **API:** `GET /api/connection/database`
* **Thao tác:** Bấm **Try it out** -> **Execute**.
* **Kết quả mong đợi (Status 200 OK):**
  ```json
  {
    "success": true,
    "status": "Database Connected",
    "databaseName": "HorseTransportDB",
    "userCount": 11,
    "message": "Kết nối Database thành công và sẵn sàng phục vụ dữ liệu!"
  }
  ```

---

### TEST CASE 3: Kiểm tra gửi nhận dữ liệu 2 chiều (Echo Test)
* **Mục đích:** Kiểm tra việc Frontend gửi dữ liệu lên (Request Body) và Backend nhận, phân tích, phản hồi lại dữ liệu đó.
* **API:** `POST /api/connection/echo`
* **Request Body:**
  ```json
  {
    "client": "React Frontend",
    "message": "Hello Backend .NET"
  }
  ```
* **Kết quả mong đợi (Status 200 OK):**
  ```json
  {
    "success": true,
    "message": "Backend đã nhận dữ liệu từ Frontend thành công!",
    "receivedData": {
      "client": "React Frontend",
      "message": "Hello Backend .NET"
    }
  }
  ```

---

### TEST CASE 4: Lấy dữ liệu thực tế từ Database theo Email
* **Mục đích:** Kiểm tra câu lệnh truy vấn dữ liệu Entity Framework Core vào bảng `[USER]` và trả dữ liệu ra ngoài.
* **API:** `GET /api/users/by-email/{email}`
* **Giá trị nhập (Parameter):** `vana.horse@gmail.com`
* **Kết quả mong đợi (Status 200 OK):**
  ```json
  {
    "userId": "USR_CUST_01",
    "username": "nguyenvana",
    "role": "Customer",
    "fullName": "Nguyễn Văn A (CLB Hà Nội)",
    "email": "vana.horse@gmail.com",
    "phone": "0901234567",
    "isActive": true
  }
  ```

---

### TEST CASE 5: Kiểm tra Đăng nhập & Cấp phát JWT Token
* **Mục đích:** Kiểm tra logic so sánh mật khẩu và cấp Token định danh cho Frontend.
* **API:** `POST /api/auth/login`
* **Request Body:**
  ```json
  {
    "email": "vana.horse@gmail.com",
    "password": "Password123!"
  }
  ```
* **Kết quả mong đợi (Status 200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "userId": "USR_CUST_01",
      "fullName": "Nguyễn Văn A (CLB Hà Nội)",
      "email": "vana.horse@gmail.com",
      "role": "CUSTOMER",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    }
  }
  ```

---

## 3. DỮ LIỆU TEST CÓ SẴN TRONG DATABASE

Tất cả các tài khoản dưới đây đều dùng chung mật khẩu: **`Password123!`**

| Email | Họ và tên | Vai trò (Role) | Ghi chú |
| :--- | :--- | :--- | :--- |
| `user@example.com` | Nguyen Van A | CUSTOMER | Tài khoản chuẩn hợp đồng Frontend |
| `vana.horse@gmail.com` | Nguyễn Văn A | CUSTOMER | Khách hàng sở hữu ngựa (CLB Hà Nội) |
| `tranb.racing@gmail.com` | Trần Văn B | CUSTOMER | Khách hàng trang trại (Trang trại Sài Gòn) |
| `linh.manager@cbntransport.com`| Trần Thị Linh | LOGISTICS_MANAGER | Quản lý điều phối |
| `tuan.specialist@cbntransport.com`| Lê Tuấn | TRANSPORT_SPECIALIST | Chuyên viên thẩm định/thú y |
| `hai.coord@cbntransport.com` | Phạm Hải | FLEET_ROUTE_COORDINATOR | Điều phối tuyến |
| `hung.driver@cbntransport.com`| Hoàng Hùng | DRIVER_ESCORT | Tài xế vận chuyển |
| `hoa.escort@cbntransport.com` | Đỗ Hoa | DRIVER_ESCORT | Bác sĩ thú y áp tải |

---

## 4. HƯỚNG DẪN THÀNH VIÊN NHÓM CODE THÊM TÍNH NĂNG MỚI
*(Quy trình chuẩn 4 bước – Không cần sửa code cấu hình kết nối)*

Khi bất kỳ ai trong nhóm muốn làm tính năng mới (Ví dụ: **Quản lý ngựa - HORSE**), chỉ cần thực hiện 4 bước sau:

### Bước 1: Tạo Entity trong project `RaceHorse_Transport_Domain`
Tạo file `Entities/Horse.cs`:
```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RaceHorse_Transport_Domain.Entities
{
    [Table("HORSE")]
    public class Horse
    {
        [Key]
        public string HorseId { get; set; } = null!;
        public string OwnerId { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Breed { get; set; } = null!;
    }
}
```

### Bước 2: Khai báo bảng vào `HorseTransportDbContext.cs`
Trong project `RaceHorse_Transport_Infrastructure`:
```csharp
public DbSet<Horse> Horses { get; set; } = null!;
```

### Bước 3: Tạo DTO trong project `RaceHorse_Transport_Application`
Tạo file `DTOs/HorseDtos.cs`:
```csharp
namespace RaceHorse_Transport_Application.DTOs
{
    public class HorseDto
    {
        public string HorseId { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Breed { get; set; } = null!;
    }
}
```

### Bước 4: Tạo Controller kế thừa `BaseApiController` trong `RaceHorse_Transport_WebApi`
Tạo file `Controllers/HorsesController.cs`:
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RaceHorse_Transport_Infrastructure.Data.Context;

namespace RaceHorse_Transport_WebApi.Controllers
{
    public class HorsesController : BaseApiController
    {
        private readonly HorseTransportDbContext _context;

        public HorsesController(HorseTransportDbContext context)
        {
            _context = context;
        }

        // GET: api/horses
        [HttpGet]
        public async Task<IActionResult> GetAllHorses()
        {
            var horses = await _context.Horses.ToListAsync();
            return Success(horses, "Lấy danh sách ngựa thành công");
        }
    }
}
```
🎉 **Xong!** Bấm chạy lại dự án:
- Endpoint `GET /api/horses` sẽ tự động xuất hiện trên Swagger.
- CORS, JSON serialization, xử lý lỗi tự động áp dụng 100%.

---

## 5. HƯỚNG DẪN PHÍA FRONTEND KẾT NỐI

Cung cấp đoạn cấu hình này cho thành viên làm Frontend (React / Vue / Vite):

```typescript
// apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:5129/api', // URL Backend .NET
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm Token đăng nhập vào Header nếu có
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 1. Kiểm tra kết nối
export const checkConnection = () => apiClient.get('/connection/ping');

// 2. Đăng nhập
export const login = (email, password) => apiClient.post('/auth/login', { email, password });

// 3. Lấy thông tin user hiện tại
export const getMyProfile = () => apiClient.get('/auth/me');
```

