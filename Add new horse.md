
## 🏇 MODULE 1: QUẢN LÝ THÔNG TIN NGỰA (Thêm Ngựa)
*Dành cho Khách hàng cung cấp các thông tin cơ sở để lưu trữ vào hệ thống.*

### 1. Thông tin Định danh & Sinh học (Identity & Biological Info)
- **Tên ngựa (Registered Name):** Tên đăng ký chính thức trên giấy tờ (`Bắt buộc`).
- **Mã số Vi mạch (Microchip Number):** Dãy số ISO (`Bắt buộc`, validate định dạng chuẩn ISO).
- **Thông tin sinh học cơ bản:** Giống ngựa (Breed), Giới tính (Sex), Trạng thái sinh sản (Reproductive Status), Cân nặng (Weight), Ngày sinh (DOB).

### 2. Hồ sơ Hộ chiếu & Giấy tờ pháp lý (Passport & Legal Documents)

**Thông tin Hộ chiếu (Nhập liệu tay):**
- **Số hộ chiếu (FEI Passport No / National No):** (`Bắt buộc`).
- **Cơ quan cấp (Issuing Authority).**
- **Ngày cấp (Issue Date).**
- **Ngày hết hạn (Expiry Date):** (`Rất quan trọng` - Sử dụng để hệ thống chạy Job cảnh báo hộ chiếu sắp hết hạn).

**Tài liệu chứng minh (Upload):**
- **Bản scan Hộ chiếu ngựa (Equine Passport):** Upload file PDF/Ảnh rõ nét các trang có sơ đồ nhận dạng (Marking diagram) và lịch sử y tế (`Bắt buộc`).
- **Giấy chứng nhận sở hữu (Certificate of Ownership/Bill of Sale):** Upload file chứng minh nguồn gốc hợp pháp, hệ thống lưu trữ URL (`Bắt buộc`).

### 3. Thông tin Y tế cơ sở (Medical Baseline)
- **Lịch sử tiêm vắc-xin Cúm (Equine Influenza):** Nhập ngày tiêm mũi gần nhất (`Bắt buộc` - Dùng để tự động validate chuẩn 6 tháng khi tạo chuyến đi mới).
- **Tình trạng sức khỏe đặc biệt:** Ghi chú (Textbox) ngựa có đang mang thai, dị ứng thuốc an thần, hoặc tiền sử bệnh lý.
- **Thông tin Bác sĩ thú y riêng:** Tên và SĐT của bác sĩ đang chăm sóc hiện tại để đối tác y tế liên hệ trích xuất hồ sơ khi cần.

---

## ✈️ MODULE 2: QUẢN LÝ CHUYẾN ĐI / VẬN CHUYỂN
**Table:** `TRANSPORT_BOOKING`  
**Chức năng:** Book a Transport / Create Booking

> ⚠️ **Điều kiện:** Yêu cầu phải chọn 1 `HorseID` đã tồn tại trong hệ thống.

### 4. Hồ sơ Thương mại & Mục đích chuyến đi (Commercial & Purpose)
- **Định giá thương mại (Commercial Value):** Nhập số tiền và chọn Loại tiền tệ (Currency - VD: USD, EUR) (`Bắt buộc`). 
  *Mục đích: Dùng để đại lý khai báo hải quan, mở sổ ATA Carnet và mua bảo hiểm chuyến bay.*
- **Thư mời giải đua (Invitation Letter):** Upload file từ Ban tổ chức giải đua hoặc sự kiện. 
  *Mục đích: Chứng minh mục đích chuyến đi phi mậu dịch, giúp thủ tục hải quan diễn ra thuận lợi hơn.*
