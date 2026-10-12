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
- **SQL Server 2022** (hoặc cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) để chạy container database)

---

### CÁCH 1: Chạy độc lập từng phần (Local Development)

Mở các cửa sổ Terminal riêng biệt để khởi chạy từng dịch vụ:

#### Bước 1: Khởi động Database (SQL Server)
Bạn chọn 1 trong 2 cách sau:
- **Cách A (Khuyên dùng - Dùng Docker chỉ để chạy DB):**
  Đứng tại thư mục gốc dự án và chạy lệnh sau để bật duy nhất container SQL Server:
  ```bash
  docker-compose up -d db
  ```
  *(Database sẽ sẵn sàng tại `localhost:1433`, User: `sa`, Password: `12345`)*.
- **Cách B (Dùng SQL Server cài sẵn trên máy):**
  Chạy script tạo bảng và dữ liệu mẫu trong file `HorseTransportDB/HorseTransportDB.sql`. Cập nhật chuỗi kết nối trong `backend/WebApi/appsettings.json` nếu cần.

#### Bước 2: Khởi động Backend (ASP.NET Core Web API)
Mở một cửa sổ Terminal mới:
```bash
cd backend/WebApi
dotnet run
```
*(Hoặc đứng từ thư mục gốc gõ: `dotnet run --project backend/WebApi/WebApi.csproj`)*

- **Backend API:** [http://localhost:5129](http://localhost:5129)
- **Swagger UI (tài liệu API):** [http://localhost:5129/swagger](http://localhost:5129/swagger)

#### Bước 3: Khởi động Frontend (React Vite)
Mở một cửa sổ Terminal khác:
```bash
cd frontend
npm install
npm run dev
```
- **Frontend App:** [http://localhost:5173](http://localhost:5173)

---

### CÁCH 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose

Nếu bạn muốn khởi chạy đồng bộ toàn bộ (Database, Backend, Frontend) chỉ bằng một lệnh:

1. Đảm bảo **Docker Desktop** đã được mở và đang chạy.
2. Tại thư mục gốc của dự án, chạy lệnh:
   ```bash
   docker-compose up -d --build
   ```
   *(Cờ `--build` giúp build lại image từ mã nguồn mới nhất).*

3. Truy cập các dịch vụ sau khi Docker khởi chạy xong:
   - **Frontend (React):** [http://localhost:5173](http://localhost:5173)
   - **Backend API (ASP.NET Core):** [http://localhost:5129](http://localhost:5129)
   - **Database (MSSQL):** `localhost:1433` (User: `sa`, Password: `12345`)

4. **Dừng toàn bộ hệ thống Docker:**
   ```bash
   docker-compose down
   ```

## 💳 VNPAY Sandbox

Xem [hướng dẫn chạy API, trang thanh toán thử và cấu hình IPN](backend/README.md).

## 🤝 Đóng góp

Vui lòng đọc kỹ file [CONTRIBUTING.md](./CONTRIBUTING.md) để biết thêm về quy trình và các nguyên tắc trước khi tạo Pull Request.
Đồng thời tuân thủ các quy tắc viết code backend trong [backend_coding_rules.md](./backend_coding_rules.md).

