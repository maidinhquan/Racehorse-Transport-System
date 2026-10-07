# QUẢN LÝ THỜI GIAN & HIỆU SUẤT VẬN HÀNH (TIME BUSINESS)

Tài liệu này quy định các nghiệp vụ tính toán thời gian, quản lý độ trễ, theo dõi hiệu lực giấy tờ và cách thức ánh xạ dữ liệu trực tiếp vào hệ thống cơ sở dữ liệu `HorseTransportDB`.

---

## I. CÁC GIAI ĐOẠN TÍNH TOÁN VÀ ÁNH XẠ DATABASE

### 1. Giai đoạn 1: Khởi tạo & Phê duyệt (Flow 1)
Quản lý yêu cầu thời gian từ khách, tính toán và chốt cam kết.
* **`TRANSPORT_REQUEST.ExpectedDate`:** Thời gian khách hàng *mong muốn* ngay từ ban đầu.
* **`TRANSPORT_REQUEST.CommittedDeadline`:** Thời gian chốt hạ *sau khi* Điều phối viên đã tính toán kĩ lưỡng và cam kết với khách. Đây là mốc dùng để tính KPI On-time delivery.

### 2. Giai đoạn 2: Pháp lý & Kiểm dịch (Flow 2)
Quản lý thời gian lưu bãi, cách ly và hạn sử dụng của giấy tờ thú y (Coggins Test, Vaccine).
* **Thời gian cách ly:** Khóa cứng mốc thời gian 14-30 ngày thông qua `QUARANTINE_BOOKING.ExpectedStartDate` và `ExpectedEndDate`.
* **Hiệu lực giấy tờ:** So sánh `LEGAL_MEDICAL_RECORD.ExpiryDate` (ngày hết hạn của giấy) với `ROUTE_SEGMENT.ExpectedETA` (ngày dự kiến tại chặng cần dùng).

### 3. Giai đoạn 3: Lập kế hoạch lộ trình (Flow 3)
Chốt phương tiện, lộ trình và phân bổ thời gian dự kiến (ETA) cho từng chặng.
* **Tổng thời gian chuyến đi:** Ghi nhận tại `TRIP_PLAN.T_Total_Hours`.
* **Lịch trình chi tiết:** Mỗi mốc trên lộ trình được gán một mốc thời gian tại `ROUTE_SEGMENT.ExpectedETA`.

### 4. Giai đoạn 4 & 6: Vận chuyển thực tế & Bàn giao (Flow 4 & 6)
Theo dõi thời gian thực (real-time) và tính toán chỉ số hoàn thành đúng hạn.
* **Thời gian thực:** Khi tài xế cập nhật trạng thái, hệ thống ghi nhận vào `ROUTE_SEGMENT.ActualTime`.
* **KPI Đúng hạn (On-time Delivery):** Hệ thống lấy thời gian lập biên bản `HANDOVER` so sánh với `TRANSPORT_REQUEST.CommittedDeadline`. Nếu `Handover Time ≤ CommittedDeadline`, chuyến đi được tính là đúng hạn.

---

## II. THUẬT TOÁN & CƠ CHẾ KIỂM SOÁT

### 1. Đếm lùi và Cảnh báo hiệu lực giấy tờ (Expiry Alerts)
* **Quy tắc cốt lõi:** Giấy tờ phải còn hiệu lực vào **ngày của chặng cần dùng nó**, không phải ngày nộp cũng không phải ngày cuối chuyến.
* **Cơ chế:** Hệ thống liên tục quét đối chiếu. Nếu `ExpectedETA` của chặng bị lùi lại và vượt quá `ExpiryDate` của giấy tờ (hoặc rơi vào khoảng thời gian không hợp lệ), Job tự động sẽ đẩy cảnh báo về bảng `NOTIFICATION` cho Chuyên viên thủ tục.

### 2. Tính toán Khoảng dự phòng (Slack)
* Hệ thống tính xuôi từ hôm nay để ra ngày sớm nhất có thể xong chuyến. Hiệu số giữa (Ngày cam kết - Ngày dự kiến sớm nhất) gọi là **Slack**.
  * **Slack lớn:** An toàn.
  * **Slack gần 0:** Nguy cơ trễ, kích hoạt cảnh báo sớm.
  * **Slack âm:** Không thể kịp hạn chót, chặn báo giá ở Flow 1.

### 3. Theo dõi và Lan truyền độ trễ (Delay Propagation)
* **Tính độ trễ:** `Độ trễ = ROUTE_SEGMENT.ActualTime - ROUTE_SEGMENT.ExpectedETA`.
* **Phân loại cảnh báo:**
  * Trễ < 30 phút: Bỏ qua.
  * Trễ 30 phút - 2 giờ: Thông báo cho Điều phối viên (Coordinator).
  * Trễ > 2 giờ: Đề xuất mở biên bản sự cố (`INCIDENT`).
* **Lan truyền:** Trễ ở chặng trước sẽ đẩy lùi các chặng sau. Hệ thống tự động UPDATE cộng dồn số phút trễ này vào `ExpectedETA` của tất cả các `ROUTE_SEGMENT` tiếp theo.

---

## III. XỬ LÝ 3 "BẪY" THỜI GIAN THỰC TẾ

### Bẫy 1: Chênh lệch Múi giờ (Timezone)
* **Vấn đề:** Phép tính thời gian bay sẽ sai lệch nếu không xử lý khác biệt múi giờ (VD: VN là UTC+7, Nhật Bản là UTC+9).
* **Giải pháp DB:** Toàn bộ cột thời gian (`ExpectedETA`, `ActualTime`, `LogTime`) được lưu bằng chuẩn **UTC**. Bảng `PARTNER_FACILITY` có cột `TimeZone`. Tầng Backend (UI) sẽ tự động cộng trừ giờ dựa theo `TimeZone` của trạm sở tại để hiển thị chính xác.

### Bẫy 2: Ngày làm việc vs Ngày lịch (Holiday Trap)
* **Vấn đề:** Cách ly tính theo ngày lịch, nhưng cơ quan nhà nước xử lý giấy tờ theo ngày làm việc (nghỉ Lễ, Tết).
* **Giải pháp:** Khi tính toán Slack và ETA cấp giấy tờ, hệ thống tích hợp API Lịch quốc gia để nhận diện ngày nghỉ. Nếu hạn chót xử lý rơi vào ngày nghỉ của Hải quan/Thú y, hệ thống sẽ tự động trừ đi số ngày nghỉ vào quỹ Slack và phát cảnh báo.

### Bẫy 3: Thời điểm xảy ra vs Thời điểm ghi nhận (Offline Sync)
* **Vấn đề:** Tài xế đi qua vùng mất sóng, cập nhật trạng thái muộn.
* **Giải pháp DB:** Tách biệt 2 mốc thời gian:
  * **Lúc sự kiện xảy ra:** App lấy giờ offline của thiết bị lưu vào `ROUTE_SEGMENT.ActualTime` (dùng để tính toán độ trễ chính xác).
  * **Lúc hệ thống ghi nhận:** Dùng cột `CreatedAt`/`UpdatedAt` mặc định của Database ghi lại thời điểm Server nhận được dữ liệu khi có mạng (dùng để lưu vết Audit).
