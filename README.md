# Hệ thống quản lý vận chuyển ngựa đua xuyên biên giới (Racehorse-Transport-System)

> **Dự án SWP391** – Hệ thống quản lý và điều phối vận chuyển ngựa đua xuyên quốc gia, hỗ trợ theo dõi hành trình theo từng mốc kiểm soát, quản lý kiểm dịch y tế, xử lý sự cố đường bộ và hàng không, tự động hóa quy trình ký hợp đồng điện tử.

---

## 🌟 Các luồng nghiệp vụ chính

Hệ thống được thiết kế theo quy trình vận hành khép kín gồm 6 luồng nghiệp vụ lớn:

* **Luồng 1 – Đặt chuyến và Ký hợp đồng:** Khách hàng đăng ký vận chuyển, kiểm tra tình trạng ngựa, nhận báo giá tự động, ký số hợp đồng điện tử qua mã OTP gửi về email và thanh toán đặt cọc qua VNPay.
* **Luồng 2 – Kiểm dịch và Hồ sơ y tế:** Bác sĩ thú y thẩm định sức khỏe ngựa, chứng nhận tiêm phòng và phê duyệt hồ sơ kiểm dịch hải quan xuyên biên giới.
* **Luồng 3 – Lập kế hoạch và Điều phối:** Điều phối viên thiết kế tuyến đường (đường bộ hoặc chuyến bay trung chuyển), phân bổ đoàn xe chuyên dụng, tài xế và nhân sự đi kèm.
* **Luồng 4 – Thực hiện và Cập nhật tiến độ hành trình:** Quản lý thực hiện chuyến đi theo từng mốc hành trình (không dùng GPS liên tục), xác nhận xuất phát, ghi nhận kết quả tại các trạm kiểm soát/chặng bay, cập nhật thời gian dự kiến đến (ETA), cảnh báo trễ mốc, ghi nhật ký chăm sóc sức khỏe ngựa dọc đường và tải lên bằng chứng hình ảnh thực tế.
* **Luồng 5 – Xử lý sự cố và Chuyển tuyến cứu hộ:** Xử lý các tình huống khẩn cấp (xe hỏng, thời tiết xấu, điểm đón bị chặn) theo quy trình chuẩn, đề xuất phương án đổi điểm đón và điều xe thay thế.
* **Luồng 6 – Nghiệm thu và Bàn giao:** Kiểm tra bàn giao ngựa tại điểm đến, ký biên bản nghiệm thu, tất toán hợp đồng và xuất báo cáo tổng kết chuyến đi.

---

## 🚀 Công nghệ sử dụng

* **Giao diện (Frontend):** React 19, TypeScript, Vite, React Router 7, Leaflet (bản đồ định vị), biến CSS theo hệ màu chuẩn, Vitest.
* **Máy chủ (Backend):** ASP.NET Core 8 Web API, C#, Clean Architecture (4 tầng: Domain, Application, Infrastructure, WebApi), Entity Framework Core.
* **Cơ sở dữ liệu:** Microsoft SQL Server 2022.
* **Tích hợp và Vận hành:** Hợp đồng giao tiếp API Contract-first (OpenAPI JSON specs), Docker, Docker Compose, cổng thanh toán VNPay.

---

## 📁 Cấu trúc thư mục và Tài liệu quy chuẩn

```text
Racehorse-Transport-System/
├── frontend/                  # Mã nguồn giao diện React 19 (chia theo vai trò)
│   └── CODING_RULES.md        # 👉 Quy chuẩn lập trình Frontend
├── backend/                   # Mã nguồn API ASP.NET Core 8 (Clean Architecture)
│   └── CODING_RULES.md        # 👉 Quy chuẩn lập trình Backend
├── contracts/                 # Hợp đồng API chuẩn giữa Frontend và Backend
├── HorseTransportDB/          # Kịch bản khởi tạo cơ sở dữ liệu (HorseTransportDB.sql)
├── compose.yaml               # Cấu hình khởi chạy toàn bộ hệ thống bằng Docker
├── CONTRIBUTING.md            # 👉 Quy trình làm việc nhóm với Git/GitHub và Docker
└── README.md                  # Hướng dẫn tổng quan và khởi chạy dự án
```

---

## 🛠 Yêu cầu môi trường cài đặt

- **Node.js** (phiên bản 18 hoặc 20 trở lên) và **npm**
- **.NET 8.0 SDK**
- **SQL Server 2022** (cài đặt trực tiếp trên máy tính - bản SQL Server Express hoặc Developer)
- **Docker Desktop** (tùy chọn: chỉ cần khi muốn chạy thử qua Docker Compose)

---

## 💾 Cấu hình cơ sở dữ liệu

Hệ thống sử dụng **SQL Server cài trực tiếp trên máy tính** (không dùng container SQL Server để đảm bảo hiệu năng và tránh mất mát dữ liệu).

1. Khởi động SQL Server trên máy bạn, đảm bảo đã bật chế độ xác thực **SQL Server Authentication** (tài khoản `sa` hoặc tài khoản có quyền quản trị) và bật giao thức **TCP/IP** (cổng mặc định `1433`).
2. Mở file [HorseTransportDB/HorseTransportDB.sql](HorseTransportDB/HorseTransportDB.sql) bằng SSMS hoặc Azure Data Studio và chạy toàn bộ kịch bản để tạo cơ sở dữ liệu `HorseTransportDB` cùng dữ liệu mẫu.
3. Khai báo thông tin tài khoản SQL trong file `.env` ở thư mục gốc:
   ```env
   SQL_USER=sa
   SQL_PASSWORD=mat_khau_sql_cua_ban
   ```

---

## ✅ Chạy lần đầu cho người mới (checklist)

Làm lần lượt, sau đó mới chạy theo "Hướng dẫn chạy dự án" bên dưới:

1. **Cài công cụ:** Git, Docker Desktop (nếu chạy bằng Docker) hoặc .NET 8 SDK và Node.js (nếu chạy từng phần).
2. **Cài SQL Server trên máy**, bật đăng nhập SQL Server Authentication và giao thức TCP/IP (cổng 1433). Docker **không** tạo CSDL giúp bạn.
3. **Tạo CSDL:** chạy toàn bộ file [HorseTransportDB/HorseTransportDB.sql](HorseTransportDB/HorseTransportDB.sql) bằng SSMS hoặc Azure Data Studio.
4. **Tạo file `.env`:** sao chép `.env.example` thành `.env` ở thư mục gốc, rồi điền ít nhất `SQL_PASSWORD`. Thiếu biến này `docker compose` sẽ báo lỗi ngay.
5. **Các giá trị còn để mẫu** (`your_..._here`) chỉ ảnh hưởng chức năng tương ứng: SMTP (gửi email OTP khi đăng ký), `VITE_GOOGLE_CLIENT_ID` (nút Google), Mapbox/Geoapify (bản đồ), VNPay (thanh toán). Hãy xin giá trị thật từ trưởng nhóm nếu bạn cần thử các chức năng đó.
6. **Chạy:** `docker compose up -d --build` (lần đầu lâu vì phải tải image), rồi mở http://localhost:5173.

> [!NOTE]
> Hợp đồng (Flow 1) **không còn tạo file PDF**: khách xem hợp đồng ngay trên trang web, nên Docker không cần Chromium. Riêng **PDF bàn giao của Flow 6** vẫn cần LibreOffice; công cụ này hiện **chưa được cài sẵn** trong Docker để build nhanh, nên bước xuất PDF bàn giao sẽ báo lỗi 501. Muốn dùng, hãy chạy Backend trực tiếp trên máy (Cách 1) và cài LibreOffice, xem [backend/README.md](backend/README.md).
>
> **CSDL đã tạo từ bản cũ:** chạy thêm [HorseTransportDB/migrate_contract_pdf_optional.sql](HorseTransportDB/migrate_contract_pdf_optional.sql) một lần để hợp đồng phát hành được khi không có PDF. Người tạo CSDL mới từ `HorseTransportDB.sql` hiện tại không cần chạy.

## 🏃 Hướng dẫn chạy dự án

Bạn có thể chạy dự án theo 2 cách:

### CÁCH 1: Chạy độc lập từng phần trên máy (Khuyên dùng khi lập trình)

Mở 2 cửa sổ dòng lệnh riêng biệt:

#### 1. Khởi động máy chủ Backend (ASP.NET Core Web API)
```powershell
cd backend/WebApi
dotnet run
```
*(Hoặc đứng từ thư mục gốc gõ: `dotnet run --project backend/WebApi/WebApi.csproj`)*

* **Địa chỉ API:** [http://localhost:5129](http://localhost:5129)
* **Giao diện Swagger (kiểm thử API):** [http://localhost:5129/swagger](http://localhost:5129/swagger)

> [!TIP]
> Bạn có thể tạo file `backend/WebApi/appsettings.Local.json` để cấu hình chuỗi kết nối riêng trên máy mình mà không làm ảnh hưởng đến mã nguồn chung của nhóm.

#### 2. Khởi động giao diện Frontend (React 19 Vite)
```powershell
cd frontend
npm install
npm run dev
```

* **Địa chỉ trang web:** [http://localhost:5173](http://localhost:5173)

---

### CÁCH 2: Khởi chạy bằng Docker Compose

> [!IMPORTANT]
> Docker Compose chạy **Backend** và **Frontend** (dịch vụ `tunnel` của ngrok chỉ để VNPay gọi về máy, tự thoát nếu không có `NGROK_AUTHTOKEN`). Backend trong Docker kết nối SQL Server trên máy tính của bạn qua địa chỉ `host.docker.internal,1433`; địa chỉ này dùng được trên Windows và macOS, còn Linux cần thêm `extra_hosts` trong `compose.yaml`.

1. Đảm bảo SQL Server trên máy tính đang chạy và file `.env` đã được điền đúng thông tin tài khoản.
2. Mở phần mềm Docker Desktop.
3. Tại thư mục gốc của dự án, chạy lệnh:
   ```bash
   docker compose up -d --build
   ```
4. Truy cập hệ thống:
   - **Giao diện trang web:** [http://localhost:5173](http://localhost:5173)
   - **Địa chỉ API Backend:** [http://localhost:5129](http://localhost:5129)
   - **Giao diện Swagger:** [http://localhost:5129/swagger](http://localhost:5129/swagger)
5. Dừng toàn bộ dịch vụ Docker:
   ```bash
   docker compose down
   ```

---

## 🔐 Cấu hình biến môi trường và bảo mật (.env)

Tạo file `.env` tại thư mục gốc từ bản mẫu `.env.example` và điền các thông tin:
* Khóa bảo mật JWT: `Jwt__Key` (chuỗi ký tự ngẫu nhiên tối thiểu 32 ký tự).
* Khóa ký hợp đồng và gửi OTP: `Flow1__Contracts__OtpHmacKey`, thông tin tài khoản gửi email SMTP.
* Cấu hình cổng thanh toán VNPay: `Vnpay__TmnCode`, `Vnpay__HashSecret`, và `VNPAY_ALLOWED_ORIGINS` (danh sách địa chỉ web được nhận kết quả thanh toán, cách nhau bằng dấu phẩy).
* Đăng nhập Google: điền `VITE_GOOGLE_CLIENT_ID` (xin Client ID từ trưởng nhóm). Địa chỉ bạn chạy web (ví dụ `http://localhost:5173`) phải được thêm vào danh sách "Authorized JavaScript origins" của Client ID đó, nếu không nút Google sẽ không hoạt động.
* Frontend dùng chung file `.env` này (không còn `frontend/.env`). Chỉ biến bắt đầu bằng `VITE_` được đưa vào trình duyệt, nên không đặt secret vào các biến đó. Sau khi sửa `.env`, hãy khởi động lại `npm run dev` hoặc `docker compose up`.
* Tunnel nhận webhook VNPay (tùy chọn): xem `COMPOSE_PROFILES` trong [backend/README.md](backend/README.md).
* Kiểm tra tính hợp lệ của cấu hình Docker: `docker compose config --quiet`.

Hướng dẫn chi tiết về cổng thanh toán VNPay thử nghiệm xem tại file [backend/README.md](backend/README.md).

---

## 🤝 Quy trình đóng góp và làm việc nhóm

Mọi thành viên trước khi viết code hoặc tạo Pull Request vui lòng đọc kỹ:
* [CONTRIBUTING.md](./CONTRIBUTING.md) – Quy trình phân nhánh Git, cách tạo PR và bảo toàn điểm đóng góp.
* [frontend/CODING_RULES.md](./frontend/CODING_RULES.md) – Quy chuẩn viết mã nguồn Frontend.
* [backend/CODING_RULES.md](./backend/CODING_RULES.md) – Quy chuẩn viết mã nguồn Backend.
