# DANH SÁCH TÀI KHOẢN HỆ THỐNG RACEHORSE TRANSPORT SYSTEM
# (ACCOUNT / PASSWORD DIRECTORY)

> Tài liệu tổng hợp toàn bộ tài khoản đăng nhập (Database, Quick Login, Google Auth) và danh bạ nhân sự vận hành trong hệ thống Quản lý Vận chuyển Ngựa đua Xuyên quốc gia (Racehorse Transport System - RTS).

---

## 1. Danh sách tài khoản đăng nhập chính trong Cơ sở dữ liệu (Authentication & Database)

Các tài khoản dưới đây được lưu trữ trực tiếp trong bảng `[USER]` của cơ sở dữ liệu `HorseTransportDB` và được sử dụng để đăng nhập vào các phân hệ nghiệp vụ tương ứng.

### Hướng dẫn đăng nhập:
- **Đăng nhập thường (Form đăng nhập):** Nhập **Email** (hoặc Username) và **Password** theo bảng bên dưới. Các tài khoản seed đều hỗ trợ mật khẩu chuẩn `Password123!` hoặc `123456` bên cạnh mã hash mặc định.
- **Đăng nhập nhanh (Quick Login):** Tại màn hình Đăng nhập (`/login`), hệ thống hỗ trợ mở danh sách tài khoản theo từng vai trò (Khách hàng, Chuyên viên, Điều phối, Quản lý, Tài xế/Áp tải, Quản trị viên) trực tiếp từ Database để kiểm thử phân quyền tiện lợi.

| STT | Mã User (ID) | Account / Username | Email đăng nhập | Password | Họ và tên | Vai trò (Role) | Trạng thái |
|---|---|---|---|---|---|---|---|
| 1 | `USER_001` | `nguyenvana` | `vana.horse@gmail.com` | `HASH_SECURE_01` | Nguyễn Văn A (CLB Hà Nội) | CUSTOMER (Khách hàng) | Hoạt động |
| 2 | `USER_002` | `tranvanb` | `tranb.racing@gmail.com` | `HASH_SECURE_02` | Trần Văn B (Trang trại Sài Gòn) | CUSTOMER (Khách hàng) | Hoạt động |
| 3 | `USER_003` | `lethic_locked` | `lethic.locked@gmail.com` | `HASH_SECURE_03` | Lê Thị C (Khách vi phạm) | CUSTOMER (Khách hàng) | Đã khóa (`IsActive = 0`) |
| 4 | `USER_004` | `manager_linh` | `linh.manager@cbntransport.com` | `HASH_SECURE_04` | Trần Thị Linh (Logistics Manager) | LOGISTICS_MANAGER (Quản lý) | Hoạt động |
| 5 | `USER_005` | `spec_tuan` | `tuan.specialist@cbntransport.com` | `HASH_SECURE_05` | Lê Tuấn (Thẩm định pháp lý/thú y) | TRANSPORT_SPECIALIST (Chuyên viên) | Hoạt động |
| 6 | `USER_006` | `coord_hai` | `hai.coord@cbntransport.com` | `HASH_SECURE_06` | Phạm Hải (Điều phối xe & tuyến) | FLEET_ROUTE_COORDINATOR (Điều phối) | Hoạt động |
| 7 | `USER_007` | `driver_hung` | `hung.driver@cbntransport.com` | `HASH_SECURE_07` | Hoàng Hùng (Tài xế quốc tế 1) | DRIVER_ESCORT (Tài xế) | Hoạt động |
| 8 | `USER_008` | `driver_thanh` | `thanh.driver@cbntransport.com` | `HASH_SECURE_08` | Vũ Thành (Tài xế quốc tế 2) | DRIVER_ESCORT (Tài xế) | Hoạt động |
| 9 | `USER_009` | `escort_hoa` | `hoa.escort@cbntransport.com` | `HASH_SECURE_09` | BS. Đỗ Hoa (Bác sĩ thú y áp tải) | DRIVER_ESCORT (Bác sĩ thú y) | Hoạt động |
| 10 | `USER_010` | `escort_nam` | `nam.escort@cbntransport.com` | `HASH_SECURE_10` | BS. Phan Nam (Kỹ thuật viên ngựa) | DRIVER_ESCORT (Kỹ thuật viên) | Hoạt động |
| 11 | `USER_012` | `driver_nvhung` | `nguyenvanhung.driver@cbntransport.com` | `Password123!` / `HASH_SECURE_12` | Nguyễn Văn Hùng (Tài xế chính) | DRIVER_ESCORT (Tài xế chính) | Hoạt động |
| 12 | `USER_013` | `driver_lqtuan` | `lequoctuan.driver@cbntransport.com` | `Password123!` / `HASH_SECURE_13` | Lê Quốc Tuấn (Phụ lái) | DRIVER_ESCORT (Phụ lái) | Hoạt động |
| 13 | `USER_014` | `escort_lttrang` | `lethutrang.escort@cbntransport.com` | `Password123!` / `HASH_SECURE_14` | Dr. Lê Thu Trang (Bác sĩ thú y) | DRIVER_ESCORT (Bác sĩ thú y) | Hoạt động |
| 14 | `USER_015` | `driver_ptson` | `phamthanhson.driver@cbntransport.com` | `HASH_SECURE_15` | Phạm Thanh Sơn (Tài xế) | DRIVER_ESCORT (Tài xế) | Hoạt động |
| 15 | `USER_016` | `driver_blong` | `buivanlong.driver@cbntransport.com` | `HASH_SECURE_16` | Bùi Văn Long (Tài xế) | DRIVER_ESCORT (Tài xế) | Hoạt động |
| 16 | `USER_017` | `driver_dvkhoa` | `dangvankhoa.driver@cbntransport.com` | `HASH_SECURE_17` | Đặng Văn Khoa (Phụ lái) | DRIVER_ESCORT (Phụ lái) | Hoạt động |
| 17 | `USER_018` | `escort_nmanh` | `nguyenminhanh.escort@cbntransport.com` | `HASH_SECURE_18` | BS. Nguyễn Minh Anh (Bác sĩ thú y) | DRIVER_ESCORT (Bác sĩ thú y) | Hoạt động |
| 18 | `USER_019` | `escort_tqbao` | `tranquocbao.escort@cbntransport.com` | `HASH_SECURE_19` | BS. Trần Quốc Bảo (Bác sĩ thú y) | DRIVER_ESCORT (Bác sĩ thú y) | Hoạt động |
| 19 | `USER_020` | `spec_hha` | `ha.specialist@cbntransport.com` | `Password123!` / `HASH_SECURE_20` | Hoàng Thu Hà (Chuyên viên thẩm định) | TRANSPORT_SPECIALIST (Chuyên viên B) | Hoạt động |
| 20 | `USER_021` | `spec_vmchau` | `chau.specialist@cbntransport.com` | `Password123!` / `HASH_SECURE_21` | Vũ Minh Châu (Chuyên viên kiểm dịch) | TRANSPORT_SPECIALIST (Chuyên viên C) | Hoạt động |
| 21 | `USER_022` | `coord_tbngoc` | `ngoc.coord@cbntransport.com` | `Password123!` / `HASH_SECURE_22` | Trần Bảo Ngọc (Điều phối xe & lịch) | FLEET_ROUTE_COORDINATOR (Điều phối B) | Hoạt động |
| 22 | `USER_024` | `admin_system` | `admin@cbntransport.com` | `Password123!` / `HASH_SECURE_24` | Quản trị viên Hệ thống (System Admin) | ADMIN (Quản trị viên) | Hoạt động |

---

## 2. Tài khoản đăng nhập qua Google OAuth

Các tài khoản được tạo tự động khi người dùng đăng nhập bằng nút **Đăng nhập bằng Google**:

| STT | Mã User (ID) | Account / Username | Email | Phương thức xác thực | Họ và tên | Vai trò (Role) | Trạng thái |
|---|---|---|---|---|---|---|---|
| 11 | `USER_011` | `maidinhquan06` | `maidinhquan06@gmail.com` | Google OAuth (Token) | MAI ĐÌNH QUÂN | CUSTOMER (Khách hàng) | Hoạt động |
| 12 | `USER_012` | `google_user` | `google_user@example.com` | Google OAuth (Test) | Google User | CUSTOMER (Khách hàng) | Hoạt động |

---

## 3. Tài khoản hạt giống mở rộng (Seed Data Mock Quốc tế)

Từ kịch bản seed kiểm thử mở rộng (`HorseTransportDB/modules/08_SeedData_Mock.sql`):

| STT | Mã User (ID) | Account / Username | Email đăng nhập | Password | Họ và tên | Vai trò (Role) | Khu vực |
|---|---|---|---|---|---|---|---|
| 13 | `USR_DRV_JP_01` | `driver_kenji` | `kenji.driver@cbntransport.jp` | `HASH_SECURE_11` | Kenji Sato | Driver (Tài xế) | Tokyo, Nhật Bản |
| 14 | `USR_DRV_JP_02` | `driver_daiki` | `daiki.driver@cbntransport.jp` | `HASH_SECURE_12` | Daiki Tanaka | Driver (Phụ lái) | Nhật Bản |
| 15 | `USR_ESC_JP_01` | `vet_yumi` | `yumi.vet@cbntransport.jp` | `HASH_SECURE_13` | BS. Yumi Mori | Escort (Bác sĩ thú y) | Tokyo, Nhật Bản |

---

## 4. Danh bạ nhân sự vận hành mở rộng (Điều phối & Phân công nhiệm vụ)

Được cấu hình trong module Quản lý (`mockStaff`) và Điều phối (`seed.json`) phục vụ việc lập kế hoạch, phân bổ tuyến và chỉ định nhân sự vận hành:

### 4.1. Bộ phận Chuyên viên Pháp lý & Kiểm dịch (Transport Specialist)
| Mã nhân sự | Họ và tên | Vai trò (Role) | Tải công việc mẫu |
|---|---|---|---|
| `USR_SPEC_01` / `USER_005` | Lê Tuấn | TRANSPORT_SPECIALIST | 1 chuyến |
| `EMP-11` | Hoàng Thu Hà (Hoang Thu Ha) | TRANSPORT_SPECIALIST | 5 chuyến |
| `EMP-12` | Vũ Minh Châu (Vu Minh Chau) | TRANSPORT_SPECIALIST | 1 chuyến |

### 4.2. Bộ phận Điều phối Lộ trình & Phương tiện (Fleet Route Coordinator)
| Mã nhân sự | Họ và tên | Vai trò (Role) | Tải công việc mẫu |
|---|---|---|---|
| `USR_COORD_01` / `USER_006` / `EMP-15` | Phạm Hải | FLEET_ROUTE_COORDINATOR | 1 - 5 chuyến |
| `EMP-16` | Trần Bảo Ngọc (Tran Bao Ngoc) | FLEET_ROUTE_COORDINATOR | 2 chuyến |

### 4.3. Đội ngũ Tài xế chuyên dụng (Drivers)
| Mã nhân sự | Họ và tên | Khu vực / Quốc gia | Số điện thoại | Ghi chú phương tiện |
|---|---|---|---|---|
| `EMP-21` / `USER_012` | Nguyễn Văn Hùng | Việt Nam (VN) | +84 90 5551 0021 | Tài xế chính (Xe thùng chuyên dụng) |
| `EMP-22` / `USER_013` | Lê Quốc Tuấn | Việt Nam (VN) | +84 90 5551 0022 | Phụ lái (Xe thùng chuyên dụng) |
| `EMP-23` | Phạm Thanh Sơn | Việt Nam (VN) | +84 90 5551 0023 | Xe thùng chuyên dụng ngựa |
| `EMP-24` | Somsak Wongsa | Thái Lan (TH) | +66 81 555 0024 | Tài xế chặng quốc tế |
| `EMP-25` | Bùi Văn Long | Việt Nam (VN) | +84 90 5551 0025 | Xe thùng chuyên dụng ngựa |
| `EMP-26` | Đặng Văn Khoa | Việt Nam (VN) | +84 90 5551 0026 | Xe thùng chuyên dụng ngựa |
| `EMP-27` | Trần Minh Trí | Việt Nam (VN) | +84 90 5551 0027 | Xe thùng chuyên dụng ngựa |
| `EMP-28` | Ngô Đức Anh | Việt Nam (VN) | +84 90 5551 0028 | Xe thùng chuyên dụng ngựa |
| `EMP-29` | Prasert Boonmee | Thái Lan (TH) | +66 81 555 0029 | Tài xế chặng quốc tế |
| `EMP-JP-01` | Kenji Sato | Nhật Bản (JP) | +81 90 0000 1001 | Tài xế chặng Tokyo |
| `EMP-JP-02` | Yuki Tanaka | Nhật Bản (JP) | +81 90 0000 1002 | Tài xế chặng Nhật Bản |
| `EMP-SG-01` | Wei Ming | Singapore (SG) | +65 8000 1001 | Tài xế chặng Singapore |
| `EMP-SG-02` | Jia Chen | Singapore (SG) | +65 8000 1002 | Tài xế chặng Singapore |

### 4.4. Đội ngũ Bác sĩ Thú y & Nhân viên Hộ tống (Escort / Veterinarians)
| Mã nhân sự | Họ và tên | Khu vực / Quốc gia | Số điện thoại | Chức danh / Vai trò |
|---|---|---|---|---|
| `EMP-31` | BS. Nguyễn Minh Anh | Việt Nam (VN) | +84 28 5550 0142 | Bác sĩ thú y |
| `EMP-32` | BS. Trần Quốc Bảo | Việt Nam (VN) | +84 24 5550 0177 | Bác sĩ thú y |
| `EMP-33` | Võ Thị Mai | Việt Nam (VN) | +84 90 5551 0033 | Kỹ thuật viên áp tải |
| `EMP-34` | BS. Arthit Chaiyo | Thái Lan (TH) | +66 81 555 0034 | Bác sĩ thú y quốc tế |
| `EMP-35` / `USER_014` | Dr. Lê Thu Trang | Việt Nam (VN) | +84 28 5550 0135 | Bác sĩ thú y (FEI) |
| `EMP-36` | BS. Hoàng Gia Huy | Việt Nam (VN) | +84 24 5550 0136 | Bác sĩ thú y |
| `EMP-37` | BS. Somchai Rattana | Thái Lan (TH) | +66 81 555 0037 | Bác sĩ thú y quốc tế |
| `EMP-JP-03` | BS. Aiko Mori / Yumi Mori | Nhật Bản (JP) | +81 90 0000 1003 | Bác sĩ thú y Nhật Bản |
| `EMP-SG-03` | BS. Li Wen | Singapore (SG) | +65 8000 1003 | Bác sĩ thú y Singapore |

---

## 5. Danh bạ Khách hàng & Tổ chức Đua ngựa (Customer Entities)
| Mã KH | Tên người đại diện / Tài khoản | Doanh nghiệp / Câu lạc bộ | Email liên hệ | Số điện thoại |
|---|---|---|---|---|
| `CUS-001` | Nguyễn Văn A (`USER_001` / Alex Equine) | CLB Cưỡi ngựa Hà Nội / Equine Racing Stable | `vana.horse@gmail.com` / `alex.equine@example.com` | 0901234567 / +84 90 5550 0110 |
| `CUS-002` | Trần Văn B (`USER_002` / Trần Minh Khoa) | Trang trại Sài Gòn / Saigon Thoroughbred JSC | `tranb.racing@gmail.com` / `khoa.tran@saigonracing.example` | 0908889999 / +84 90 5550 0222 |
| `CUS-003` | Somchai Prasert | CLB Đua ngựa Hoàng Gia Bangkok (Royal Turf Club) | `somchai@royalturf.example` | +66 2 5550 0193 |
