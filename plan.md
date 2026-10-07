# QUY TRÌNH LẬP KẾ HOẠCH LỘ TRÌNH VÀ ĐIỀU PHỐI (ROUTING & PLANNING WORKFLOW)

Tài liệu này mô tả logic hệ thống trong việc phân tích khoảng cách, tự động hóa lộ trình, chọn phương tiện và xử lý sự cố. Quy trình do Logistics Manager (LM) và Điều phối viên thực hiện.

---

## 1. LOGIC XÂY DỰNG LỘ TRÌNH & TRẠM DỪNG (ROUTING LOGIC)

### a. Vận chuyển Nội địa (Đường bộ)
1. **Tìm đường ngắn nhất:** Khách hàng nhập điểm Đi & Đến. Hệ thống gọi API Bản đồ để lấy Khoảng cách (km) và Thời gian (giờ).
2. **Quy tắc Sinh học (Tối đa 6 tiếng):** Ngựa không được đứng trên xe liên tục quá 6 tiếng.
   * Nếu Tổng thời gian ≤ 5 tiếng: Đi thẳng, không cần trạm nghỉ.
   * Nếu Tổng thời gian > 5 tiếng: Hệ thống tự động cắt nhỏ chặng đường và chèn Trạm dừng nghỉ (Rest Stops) vào giữa.
3. **Quy tắc Chọn Trạm & Chuyển đổi Hàng không:**
   * Danh mục trạm lưu sẵn trong Database (`PARTNER_FACILITY`), định tuyến mỗi tỉnh/thành chỉ lấy **1 trạm duy nhất** để tối ưu hóa truy vấn. Mặc định các trạm đều mở cửa phục vụ chung.
   * **Giới hạn số trạm:** Tối đa 3 trạm nghỉ cho một chuyến đường bộ. Nếu API tính toán lộ trình dài đòi hỏi **nhiều hơn 3 trạm nghỉ**, hệ thống sẽ tự động đề xuất đổi phương thức sang **Đường hàng không (Máy bay)** để đảm bảo sức khỏe ngựa.

### b. Vận chuyển Quốc tế (Multimodal)
1. **Chặng Nội địa đến Sân bay:** Áp dụng logic đường bộ như trên (ưu tiên chọn sân bay đủ hạ tầng và quy định pháp lý cho động vật sống, không bắt buộc là sân bay gần nhất).
2. **Chặng Hàng không:** Vận chuyển từ Sân bay xuất phát đến Sân bay quốc gia đích.
3. **Chặng tại Quốc gia đích:** Khi ngựa hạ cánh và thông quan tại sân bay đích, lộ trình từ sân bay về trường đua/trang trại sẽ do **Bên thứ 3 (Local Partner)** tiếp nhận và xử lý. Hệ thống phần mềm của chúng ta chỉ hiển thị trạng thái Bàn giao (Handover), không đi sâu vào điều hướng đường phố nước ngoài để giới hạn phạm vi rủi ro.

---

## 2. LỰA CHỌN PHƯƠNG TIỆN & NHÂN SỰ (FLEET & CREW)

### a. Chọn Xe tải & Chỗ chứa
* Dữ liệu bốc từ bảng `VEHICLE`.
* Căn cứ vào số lượng và tính khí ngựa, LM chọn Xe 1-2 Stalls (ngựa hung dữ, cần cách ly) hoặc Xe Multi-horse (4-9 con, có vách ngăn).
* Bắt buộc phải là xe chuyên dụng: có hệ thống giảm xóc khí nén (Air-ride), thông gió tự động và camera khoang sau.

### b. Phân công Nhân sự 
* Dữ liệu lưu tại bảng `TRIP_VEHICLE_ASSIGNMENT`.
* Quy tắc an toàn: Mỗi chuyến xe luôn có tối thiểu **2 nhân sự**: `Driver` (Tài xế chính) và `Escort/Groom` (Phụ xe/Nhân viên chăm sóc y tế). Mục đích để có người hỗ trợ y tế cho ngựa và báo cáo khẩn cấp nếu tài xế chính gặp sự cố sức khỏe.

---

## 3. QUY TRÌNH PHÊ DUYỆT CỦA ĐIỀU PHỐI VIÊN
Sau khi hệ thống auto-generate lộ trình:
1. **Approve:** Nếu hợp lý, LM duyệt chốt sổ, dữ liệu được ghi vào bảng `TRIP_PLAN` và `ROUTE_SEGMENT`.
2. **Edit/Reject:** LM có quyền can thiệp thủ công: thêm/bớt điểm dừng, đổi trạm thay thế từ danh mục. Sau đó ấn "Re-approve".
3. **Song song (Flow 2):** Ngay khi chốt lộ trình, bộ phận Pháp lý lấy thông tin để tiến hành xin Giấy phép/Kiểm dịch cho đúng cửa khẩu/sân bay sẽ đi qua.

---

## 4. XỬ LÝ SỰ CỐ GIAO THÔNG & HẠ TẦNG (FLOW 5)

* **Phía Tài xế (Chủ động):** Sử dụng Mobile App nhấn "Báo cáo sự cố", chọn loại sự cố (Kẹt xe, Xe hỏng, Ngựa stress). Dữ liệu đẩy về bảng `INCIDENT`.
* **Phía Hệ thống (Bị động - GPS Failsafe):** Nếu tài xế/phụ xe bất tỉnh (tai nạn). Hệ thống backend quét định vị GPS định kỳ, nếu phát hiện xe đứng im quá lâu mà không có báo cáo sự cố, hệ thống tự động phát Alert (Cảnh báo SOS) lên màn hình của LM.
* **Phía LM (Dashboard):** Xem chi tiết sự cố, cập nhật lại ETA, hoặc chọn tính năng "Đổi trạm nghỉ thay thế" trên hệ thống. Dữ liệu chặng mới sẽ đè lên `ROUTE_SEGMENT` và thông báo tự động (Flow 1) sẽ đẩy về cho khách hàng.
