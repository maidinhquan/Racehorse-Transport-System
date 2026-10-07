# QUY TRÌNH NGHIỆP VỤ THÔNG BÁO (NOTIFICATION WORKFLOW)

Tài liệu này mô tả các luồng nghiệp vụ gửi thông báo tự động cho khách hàng trong suốt vòng đời của một chuyến vận chuyển, cũng như cách thức dữ liệu được lưu trữ vào hệ thống Cơ sở dữ liệu.

---

## I. CÁC GIAI ĐOẠN GỬI THÔNG BÁO TỰ ĐỘNG

### 1. Giai đoạn Khởi tạo & Phê duyệt
* **Thời điểm kích hoạt (Trigger):** Ngay sau khi Quản lý Điều hành (Logistics Manager) chốt và phê duyệt yêu cầu đặt dịch vụ trên hệ thống.
* **Hành động:** Hệ thống tự động gửi thông báo đầu tiên đến Khách hàng.
* **Mục đích:** Yêu cầu khách hàng truy cập vào Customer Portal để tiến hành tải lên các hồ sơ pháp lý, giấy tờ lý lịch (Equine Passport, Microchip) và hồ sơ y tế sơ bộ của ngựa, giúp bộ phận thủ tục bắt đầu làm việc.

### 2. Giai đoạn Giám sát Hành trình
* **Thời điểm kích hoạt (Trigger):** Bất cứ khi nào Tài xế (Driver) cập nhật trạng thái tại các mốc lộ trình quan trọng thông qua Mobile App (Ví dụ: *"Đã xuất phát"*, *"Đã tới điểm dừng nghỉ"*, hoặc *"Hoàn tất thông quan"*).
* **Hành động:** Hệ thống ngay lập tức ghi nhận và đẩy thông báo đa kênh (Push Notification / SMS / Email) về thiết bị của Khách hàng.
* **Mục đích:** Giúp khách hàng nắm bắt chính xác vị trí và tiến độ chuyến đi của ngựa theo từng chặng theo thời gian thực (Real-time tracking), loại bỏ nhu cầu phải gọi điện thoại hỏi thăm liên tục.

### 3. Giai đoạn Xử lý Sự cố
* **Thời điểm kích hoạt (Trigger):** Xảy ra sự kiện ngoại lệ trên đường (hỏng xe, kẹt xe, thời tiết xấu hoặc ngựa gặp vấn đề y tế) dẫn đến thay đổi lộ trình.
* **Hành động:** Sau khi bộ phận Điều hành chốt phương án giải quyết và cập nhật lịch trình mới (ETA mới), hệ thống tự động phát thông báo khẩn.
* **Mục đích:** Đảm bảo tính minh bạch, giúp Khách hàng nắm bắt được tình hình sự cố thực tế và thời gian dự kiến đến đích mới nhất.

### 4. Giai đoạn Bàn giao & Nghiệm thu
* **Thời điểm kích hoạt (Trigger):** Khi xe đến đích, nhân viên hoàn tất việc quét kiểm tra mã Microchip và các bên ký số thành công vào biên bản bàn giao điện tử.
* **Hành động:** Hệ thống gửi thông báo cuối cùng khép lại chuyến đi đến Khách hàng.
* **Mục đích:** Xác nhận chính thức ngựa đã hoàn tất quá trình thông quan, tới địa điểm bàn giao an toàn và kết thúc trách nhiệm bảo quản, chăm sóc của đơn vị vận chuyển.

---

## II. THIẾT KẾ KỸ THUẬT: ÁNH XẠ VÀO DATABASE (Bảng `NOTIFICATION`)

Để thực thi trơn tru các luồng nghiệp vụ trên, hệ thống lưu trữ toàn bộ lịch sử giao tiếp tại bảng `NOTIFICATION` với các trường dữ liệu cốt lõi sau:

* **`Channel` (Kênh gửi tin):** Phân loại phương thức tiếp cận (Ví dụ: `PUSH` cho thông báo App, `SMS` cho tin nhắn văn bản, `EMAIL` cho thông báo chi tiết).
* **`Type` (Phân loại sự kiện):** Gắn nhãn hệ thống để App/Web render UI tương ứng (Ví dụ: `DOCUMENT_UPLOAD_REQUEST`, `TRIP_UPDATE`, `INCIDENT_ALERT`, `HANDOVER_CONFIRMED`).
* **`Title` & `Message` (Nội dung):** Lưu trữ tiêu đề và nội dung chi tiết của thông báo (Ví dụ: *"Ngựa đã hoàn tất thông quan biên giới"*).
* **`ReferenceID` (Khóa ngoại mềm):** Mã định danh liên kết trực tiếp với nghiệp vụ phát sinh. Khi khách hàng bấm vào thông báo:
  * Trỏ về `RequestID`: Mở màn hình upload hồ sơ.
  * Trỏ về `TripID` / `SegmentID`: Mở bản đồ Tracking.
  * Trỏ về `IncidentID`: Mở biên bản sự cố.
  * Trỏ về `HandoverID`: Mở biên bản bàn giao.
* **`IsRead` (Trạng thái đọc):** Quản lý trạng thái tương tác của người dùng (`0` = Chưa đọc, `1` = Đã đọc) để cập nhật bộ đếm (badge count) trên ứng dụng.
* **`SentAt` (Thời gian gửi):** Ghi nhận chính xác mốc thời gian hệ thống phát đi thông báo để sắp xếp Timeline theo thứ tự (Timestamp).
