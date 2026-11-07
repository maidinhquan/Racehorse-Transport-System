# Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)

## Docker runtime configuration

Copy `.env.example` to `.env` and fill the SQL/SMTP credentials, `Jwt__Key`,
`Flow1__Contracts__OtpHmacKey`, maps keys, VNPay configuration and contract issuer.
JWT and contract OTP require independent random keys of at least 32 bytes.
`docker compose` reads `.env` through `env_file`; ASP.NET keys use `__` between levels.
Run `docker compose config --quiet` to validate without printing resolved credentials,
then `docker compose up --build -d` when ready to restart services.

`.env`, private local appsettings and `App_Data` stay outside Git and Docker build
contexts. Shared `appsettings.json` contains no credentials. Direct Windows runs can
use ignored `backend/WebApi/appsettings.Local.json`; Docker receives secrets at runtime.
Existing App_Data volume is retained. Do not delete it when rebuilding.
Removing tracked secrets does not remove them from older commits; rotate credentials
that were previously committed. No history rewrite is performed by this change.


Cross-Border Racehorse Transport Management System - React frontend and ASP.NET Core backend.

Đây là hệ thống quản lý vận chuyển ngựa đua xuyên biên giới, bao gồm giao diện người dùng (Frontend) xây dựng bằng **React** và máy chủ (Backend) xây dựng bằng **ASP.NET Core**.

## 🚀 Công nghệ sử dụng

- **Frontend:** React (Vite), Node.js
- **Backend:** ASP.NET Core
- **Database:** Microsoft SQL Server (MSSQL 2022)
- **Deployment & Containerization:** Docker, Docker Compose

## 📁 Cấu trúc dự án

- `/frontend/` - Chứa mã nguồn của ứng dụng React.
- `/backend/` - Chứa mã nguồn của API ASP.NET Core.
- `/HorseTransportDB/` - Các tài nguyên hoặc kịch bản liên quan đến Database (nếu có).
- `compose.yaml` - File cấu hình Docker Compose để khởi chạy toàn bộ hệ thống.
- `CONTRIBUTING.md` - Hướng dẫn đóng góp cho dự án.
- `backend_coding_rules.md` - Các quy chuẩn khi viết code backend.

## 🛠 Hướng dẫn cài đặt và chạy dự án

Bạn có thể chạy dự án theo 2 cách:
1. **Chạy độc lập từng phần (Khuyến nghị cho việc lập trình & phát triển)**.
2. **Khởi chạy toàn bộ hệ thống bằng Docker Compose**.

---

### Yêu cầu môi trường (Prerequisites)
- **Node.js** (phiên bản 18+ hoặc 20+) và **npm**
- **.NET 8.0 SDK**
- **SQL Server 2022** (cài đặt trực tiếp trên máy - SQL Server Express hoặc Developer)
- **Docker Desktop** (tùy chọn: chỉ cần khi muốn chạy thử qua Docker Compose)

---

### Cấu hình Database (Bắt buộc cho cả 2 cách)
Hệ thống sử dụng **SQL Server cài trực tiếp trên máy host** (không sử dụng container SQL Server để tránh nặng máy và tránh mất dữ liệu khi xoá container).

1. Khởi động SQL Server trên máy bạn, đảm bảo đã bật **SQL Server Authentication** (tài khoản `sa` hoặc tài khoản có quyền) và bật giao thức **TCP/IP** (port mặc định `1433`).
2. Mở file [HorseTransportDB/HorseTransportDB.sql](HorseTransportDB/HorseTransportDB.sql) bằng SSMS hoặc Azure Data Studio và chạy toàn bộ script để tạo database `HorseTransportDB` kèm dữ liệu mẫu.
3. Kiểm tra file `.env` ở thư mục gốc để cấu hình thông tin đăng nhập SQL cho Docker Backend:
   ```env
   SQL_USER=sa
   SQL_PASSWORD=your_password_here
   ```

---

### CÁCH 1: Chạy độc lập từng phần (Local Development - Khuyên dùng)

Mở các cửa sổ Terminal riêng biệt:

#### Bước 1: Khởi động Backend (ASP.NET Core Web API)
Mở terminal tại thư mục backend:
```bash
cd backend/WebApi
dotnet run
```
*(Hoặc đứng từ thư mục gốc gõ: `dotnet run --project backend/WebApi/WebApi.csproj`)*

- **Backend API:** [http://localhost:5129](http://localhost:5129)
- **Swagger UI (tài liệu API):** [http://localhost:5129/swagger](http://localhost:5129/swagger)

> **Mẹo:** Chuỗi kết nối mặc định trong `backend/WebApi/appsettings.json` là `Server=.\\SQLEXPRESS;Database=HorseTransportDB;Trusted_Connection=True;...`. Bạn có thể tạo file `backend/WebApi/appsettings.Local.json` để ghi đè chuỗi kết nối riêng trên máy mình mà không làm ảnh hưởng đến git commit của nhóm.

#### Bước 2: Khởi động Frontend (React Vite)
Mở một cửa sổ terminal khác:
```bash
cd frontend
npm install
npm run dev
```
- **Frontend App:** [http://localhost:5173](http://localhost:5173)

---

### CÁCH 2: Khởi chạy bằng Docker Compose

> ⚠️ **LƯU Ý QUAN TRỌNG:**
> - Docker Compose hiện tại **CHỈ build và chạy 2 dịch vụ: Backend & Frontend**.
> - **KHÔNG CÓ service Database trong Docker Compose**. Không chạy `docker compose up -d db` và không cần tải image MSSQL về.
> - Backend trong Docker sẽ tự động kết nối tới SQL Server trên máy bạn qua `host.docker.internal,1433` (sử dụng `SQL_USER` và `SQL_PASSWORD` khai báo trong `.env`).

1. Đảm bảo **SQL Server** trên máy bạn đang chạy (port 1433) và file `.env` đã có đúng thông tin tài khoản.
2. Mở **Docker Desktop**.
3. Tại thư mục gốc của dự án, chạy lệnh:
   ```bash
   docker compose up -d --build
   ```
4. Truy cập các dịch vụ:
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5129](http://localhost:5129)
   - **Swagger UI:** [http://localhost:5129/swagger](http://localhost:5129/swagger)

5. **Dừng toàn bộ hệ thống Docker:**
   ```bash
   docker compose down
   ```

## 💳 VNPAY Sandbox

Xem [hướng dẫn chạy API, trang thanh toán thử và cấu hình IPN](backend/README.md).

## 🤝 Đóng góp

Vui lòng đọc kỹ file [CONTRIBUTING.md](./CONTRIBUTING.md) để biết thêm về quy trình và các nguyên tắc trước khi tạo Pull Request.
Đồng thời tuân thủ các quy tắc viết code backend trong [backend_coding_rules.md](./backend_coding_rules.md).

