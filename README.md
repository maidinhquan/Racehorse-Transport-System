# Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)

Đây là hệ thống quản lý vận chuyển ngựa đua xuyên biên giới, bao gồm giao diện người dùng (Frontend) xây dựng bằng **React** và máy chủ (Backend) xây dựng bằng **ASP.NET Core**.

## 🚀 Công nghệ sử dụng

- **Frontend:** React (Vite), Node.js
- **Backend:** ASP.NET Core
- **Database:** Microsoft SQL Server (MSSQL 2022)
- **Deployment & Containerization:** Docker, Docker Compose

## 📁 Cấu trúc dự án

- `/frontend/` - Chứa mã nguồn của ứng dụng React.
- `/RaceHorse_Transport_Backend/` - Chứa mã nguồn của API ASP.NET Core.
- `/HorseTransportDB/` - Các tài nguyên hoặc kịch bản liên quan đến Database (nếu có).
- `compose.yaml` - File cấu hình Docker Compose để khởi chạy toàn bộ hệ thống.
- `CONTRIBUTING.md` - Hướng dẫn đóng góp cho dự án.
- `backend_coding_rules.md` - Các quy chuẩn khi viết code backend.

## 🛠 Hướng dẫn cài đặt và chạy dự án

Dự án này đã được cấu hình với Docker Compose, giúp việc khởi chạy trở nên dễ dàng và đồng bộ.

### Yêu cầu trước khi cài đặt:
- [Docker](https://www.docker.com/products/docker-desktop/) và Docker Compose đã được cài đặt và đang hoạt động.
- (Tùy chọn) Node.js và .NET SDK nếu bạn muốn chạy các thành phần độc lập trên máy local mà không dùng Docker.

### Khởi chạy toàn bộ hệ thống bằng Docker Compose:

1. Clone dự án về máy:
   ```bash
   git clone <url-repository>
   cd Racehorse-Transport-System
   ```

2. Khởi chạy các container bằng lệnh:
   ```bash
   docker-compose up -d --build
   ```
   *(Thêm cờ `--build` để đảm bảo các image được build lại từ source code mới nhất).*

3. Sau khi Docker khởi chạy xong, bạn có thể truy cập hệ thống qua các địa chỉ sau:
   - **Frontend (React):** [http://localhost:5173](http://localhost:5173)
   - **Backend API (ASP.NET Core):** [http://localhost:5129](http://localhost:5129)
   - **Database (MSSQL):** Truy cập qua port `1433` (Server: `localhost,1433` | User: `sa` | Password: `12345`)

### Dừng hệ thống:
Để tắt các dịch vụ đang chạy, sử dụng lệnh:
```bash
docker-compose down
```

## 🔗 Chạy thủ công từng thành phần (Không dùng Docker)

Nếu bạn không muốn sử dụng Docker, bạn có thể chạy riêng lẻ frontend và backend.

**1. Chạy Backend:**
- Cần có .NET SDK và thiết lập chuỗi kết nối (Connection String) trong `appsettings.json` trỏ tới Database cục bộ của bạn.
- Di chuyển vào thư mục backend và chạy lệnh:
  ```bash
  cd RaceHorse_Transport_Backend
  dotnet run
  ```

**2. Chạy Frontend:**
- Cần cài đặt Node.js.
- Di chuyển vào thư mục frontend, cài đặt dependencies và chạy:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

## 🤝 Đóng góp

Vui lòng đọc kỹ file [CONTRIBUTING.md](./CONTRIBUTING.md) để biết thêm về quy trình và các nguyên tắc trước khi tạo Pull Request.
Đồng thời tuân thủ các quy tắc viết code backend trong [backend_coding_rules.md](./backend_coding_rules.md).
