# Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)

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

### CÁCH 2: Khởi chạy toàn bộ hệ thống bằng Docker (Khuyên dùng - Chỉ 1 lệnh)

Hệ thống đã được tích hợp Docker toàn diện bao gồm:
- **Database:** Microsoft SQL Server 2022 (`db` container, port `14333`, volume dữ liệu `mssql_data` bền vững).
- **Auto-Init:** Tự động tạo và nạp dữ liệu mẫu từ `HorseTransportDB/HorseTransportDB.sql` (`db-init` container).
- **Backend API:** ASP.NET Core 8 Web API (`backend` container, port `5129`).
- **Frontend UI:** React + Vite + TypeScript (`frontend` container, port `5173`).

#### Cách A: Chạy bằng file 1-Click (Tiện nhất cho Windows)
Chỉ cần nhấp đúp chuột vào file:
- **`start.bat`** (hoặc mở PowerShell gõ `.\start.ps1`): Hệ thống sẽ tự kiểm tra Docker Desktop, build container, khởi động toàn bộ và tự mở trình duyệt.
- **`stop.bat`** (hoặc `.\stop.ps1`): Dừng toàn bộ hệ thống an toàn.

#### Cách B: Chạy bằng lệnh dòng lệnh (Terminal / PowerShell)
Tại thư mục gốc dự án, chạy đúng 1 lệnh duy nhất:
```bash
docker compose up -d --build
```

#### Truy cập các cổng dịch vụ sau khi khởi động:
- **Giao diện người dùng (Frontend):** [http://localhost:5173](http://localhost:5173)
- **Hồ sơ Tuyến Việt Nam - Nhật Bản (AQS MAFF):** [http://localhost:5173/japan-route](http://localhost:5173/japan-route)
- **Tài liệu API (Swagger UI):** [http://localhost:5129/swagger](http://localhost:5129/swagger)
- **Cơ sở dữ liệu (MSSQL):** `localhost,14333` (Tài khoản: `sa` / Mật khẩu: `RaceHorse@2026!Db`)

#### Các lệnh quản lý hữu ích:
```bash
# Xem log thời gian thực của toàn bộ hệ thống
docker compose logs -f

# Xem log riêng của Backend
docker compose logs -f backend

# Dừng toàn bộ hệ thống
docker compose down
```

## 💳 VNPAY Sandbox

Xem [hướng dẫn chạy API, trang thanh toán thử và cấu hình IPN](backend/README.md).

## 🤝 Đóng góp

Vui lòng đọc kỹ file [CONTRIBUTING.md](./CONTRIBUTING.md) để biết thêm về quy trình và các nguyên tắc trước khi tạo Pull Request.
Đồng thời tuân thủ các quy tắc viết code backend trong [backend_coding_rules.md](./backend_coding_rules.md).

