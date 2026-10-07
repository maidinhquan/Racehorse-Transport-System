# TÀI LIỆU CHUẨN CHI PHÍ, DÒNG TIỀN & ĐIỀU PHỐI (FINANCIAL & ROUTING MODEL)
**Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Quốc gia | Mô hình 3 Đợt Thanh toán**

---

## PHẦN I: CHI PHÍ KẾ HOẠCH (PLANNED COSTS — PC)
Chi phí kế hoạch là toàn bộ các khoản mục chi phí được dự toán khoa học ngay từ ban đầu. Các chi phí này làm nền tảng tính toán Báo giá lần 1 (Q1) và cấu thành nên Giá hợp đồng (P) bất biến sau khi ký kết.

| STT | Khoản mục Chi phí | Mã ID | Đơn vị tính | Cơ chế khi hủy chuyến (M1 - M4) | Ghi chú nghiệp vụ |
|:---:|:---|:---|:---|:---|:---|
| 01 | **Nhiên liệu & Phí đường bộ** | `PC_FUEL_TOLL` | km / lít / trạm | Hủy trước giờ G: Hoàn 100%. | Tính theo cự ly thực tế × Định mức phương tiện + Biểu phí BOT. |
| 02 | **Khấu hao phương tiện** | `PC_VEH_DEPR` | km / ngày | Hủy M1-M2: Miễn phí; M3-M4: Phạt theo tỷ lệ. | Xe thùng chuyên dụng (có điều hòa, chống sốc). |
| 03 | **Công tác phí tổ vận hành** | `PC_CREW_ALLOW` | chuyến / ngày | Hủy M1-M2: Miễn phí; M3-M4: Phạt 30-70%. | Lương/phụ cấp tài xế & điều phối đường dài. |
| 04 | **Phí trạm dừng & Lưu chuồng** | `PC_REST_STABLE` | đêm / đầu ngựa | Chưa đi: Hoàn 100%. Đang đi (M5): Hoàn 100% đêm chưa tới. | Bắt buộc nghỉ 8-12h sau mỗi 8-10h chạy xe liên tục. |
| 05 | **Bảo hiểm vận chuyển & TNDS** | `PC_INS_TRANS` | chuyến / giá trị | TNDS: Không hoàn. BH chuyến: Hoàn 80-90%. | Bảo hiểm trách nhiệm & tổn thất hành trình. |
| 06 | **Slot bay & Xếp dỡ (Air Freight)**| `PC_AIR_FREIGHT`| Stall / Ngựa | M1: phạt 10%, M2: 30%, M3-M4: 70-100%. | Thuê chuồng Jet Stall IATA & phí apron. |
| 07 | **Dịch vụ Thú y & Y tế** | `PC_VET_ESCORT` | chuyến / km | Hủy M1-M2: Miễn phí; M3-M4: Trả phí bồi dưỡng. | Bác sĩ theo sát đo nhịp tim, bù điện giải, stress. |
| 08 | **Kiểm dịch & Thông quan** | `PC_QUAR_PERMIT`| bộ hồ sơ | **Sunk Costs (Chi phí chìm)**: Không hoàn. | Lệ phí hải quan, trạm kiểm dịch (Khách chuẩn bị giấy tờ). |
| 09 | **Phí quản lý (Overhead)** | `PC_OVERHEAD` | % chi phí | Không hoàn lại từ M2 trở đi. | Chi phí GPS, cảm biến IoT, điều hành 24/7. |

---

## PHẦN II: CHI PHÍ PHÁT SINH (INCURRED COSTS — IC)
Chi phí xuất hiện ngoài dự toán ban đầu do sự cố, thiên tai hoặc yêu cầu từ khách. 

### ★ QUY TẮC PHÂN BỔ TRÁCH NHIỆM (BEARER) - GÓI ALL-INCLUSIVE
1. **BM (Bảo hiểm chi trả 100%):** Thiên tai (bão lũ, sạt lở), Tai nạn giao thông, Cấp cứu thú y khẩn cấp, Lưu trú cứu nạn. Khách KHÔNG mất tiền.
2. **CT (Công ty tự hấp thụ):** Hỏng hóc cơ học (thủng lốp, hỏng điều hòa), phụ phí BOT kẹt xe, tạm trú bão ngắn hạn. Khách KHÔNG mất tiền.
3. **KH (Khách hàng chi trả):** CHỈ trả trong 2 trường hợp: (a) Khách chủ động đổi lộ trình/điểm đến; (b) Lỗi giấy tờ/chậm thuế từ phía khách làm lưu xe tại cửa khẩu.

| STT | Khoản mục Phát sinh | Mã ID | Bearer | Ghi chú & Xử lý |
|:---:|:---|:---|:---:|:---|
| 01 | Lệ phí cầu đường/bến bãi phát sinh | `IC_TOLL_EXTRA` | **CT** | Phụ phí kẹt xe/đi vòng tránh sạt lở (Quỹ dự phòng CT chịu). |
| 02 | Sửa chữa & Cứu hộ phương tiện | `IC_VEH_REPAIR` | **CT** | Xe hỏng, thủng lốp (Trách nhiệm bảo dưỡng CT). |
| 03 | Lưu chuồng kéo dài ngoài dự kiến | `IC_REST_EXTEND`| **BM/CT** | Bão lũ (BM chịu); Trú bão ngắn (CT chịu). Khách chỉ chịu nếu do đại lý hải quan của khách gây chậm. |
| 04 | Cấp cứu thú y khẩn cấp | `IC_VET_EMERG_` | **BM** | Gói All-Inclusive chi trả 100% viện phí trên đường. |
| 05 | Cách ly y tế & Xét nghiệm PCR thêm | `IC_QUAR_EXTRA` | **BM** | Dịch bệnh bùng phát bất khả kháng tại biên giới. |
| 06 | Tổn thất ngựa (Thương tật/Tử vong) | `IC_HORSE_LOSS` | **BM** | Bảo hiểm bồi thường 100% giá trị khai báo ngựa & xe. |
| 07 | Đổi lộ trình do KH yêu cầu | `IC_ROUTE_CHANGE`| **KH** | KH đồng ý trả phụ phí ➔ Rẽ nhánh. KH từ chối ➔ Giữ tuyến cũ. |

---

## PHẦN III: LUỒNG TIỀN 4 GIAI ĐOẠN & MÔ HÌNH 3 ĐỢT THANH TOÁN

### 3.1. Giai đoạn 1: Khảo sát & Báo giá Sơ bộ (Q1)
* Hệ thống xuất Báo giá 1 (Q1) dựa trên Database định mức.
* **Dung sai cam kết:** "Báo giá có dung sai ±5% khi khảo sát thực tế".

### 3.2. Giai đoạn 2: Lập Kế Hoạch, Ký Hợp Đồng & Thanh Toán Đợt 1 (Cọc 40%)
* **Công thức Sai số:** `ε = (Chi phí Kế hoạch thực tế - Q1) / Q1`
* **Nhánh 1 (|ε| ≤ 5%):** Chốt Hợp đồng `P = Q1`.
* **Nhánh 2 (ε > +5%):** Hệ thống ra Q1' (Re-quote). Khách có 5 ngày để: Chấp nhận giá Q1' / Yêu cầu cắt giảm dịch vụ / Hủy chuyến. Quá 5 ngày không phản hồi ➔ Tự động Hủy.
* **Nhánh 3 (ε < -5%):** Tự động giảm giá bán P cho khách hàng.
* **Thanh toán Đợt 1:** Thu cọc chuẩn **40% Giá trị HĐ (P)**. Bác sĩ thú y tiến hành khám sức khỏe tiền khởi hành.

### 3.3. Giai đoạn 3: Khởi Hành & Thanh Toán Đợt 2 (Mốc 50%)
* **Thanh toán Đợt 2:** Tại mốc 50% quãng đường, xuất Hóa đơn = **30% P + Phí phát sinh đã duyệt (nếu có)**.
* **Safety Gate (Cửa an toàn):** Khách thanh toán xong ➔ Mở chốt cho xe lăn bánh tiếp. Không thanh toán ➔ Xe nằm chờ (PAUSED).

### 3.4. Giai đoạn 4: Đích đến & Bàn Giao (Quyền Lien)
* **Thanh toán Đợt 3 (Đợt cuối):** Xuất Hóa đơn = **30% P còn lại + Phí chặng cuối - Bồi thường trễ hạn (nếu có)**. Thanh toán đủ ➔ Bàn giao ngựa.
* **Cửa sổ bảo vệ 72h:** Sau 72h nhận ngựa không có phản hồi ➔ Chuyển trạng thái `CLOSED`.
* **Quyền giữ ngựa (Lien):** Khách không thanh toán Đợt 3 ➔ Công ty giữ ngựa tại trạm chuyên dụng (tính phí lưu chuồng theo ngày). Sau **7 ngày** nợ ➔ Chuyển trạng thái `BREACH_OF_CONTRACT` (Phát mại tài sản qua Tòa án).

### 3.5. Quy chế Tiền cọc 40% (Lá chắn bảo toàn vốn)
* **Công thức hoàn cọc:** `Hoàn trả = max(0, 40% P - Mức phạt - Chi phí chìm (Sunk Costs))`
* **M1 (>14 ngày):** Phạt 5% P ➔ Hoàn 35% P.
* **M2 (7-14 ngày):** Phạt 15% P ➔ Hoàn 25% P.
* **M3 (3-7 ngày):** Phạt 30% P + Sunk Costs ➔ Trừ vào 40% cọc (CT hòa vốn/lãi).
* **M4 (<3 ngày):** Phạt tối đa 40% P (Mất trọn cọc). CT không ghi nợ xấu khách hàng.
* **M5 (Giữa đường):** Khách trả 100% phí đến trạm an toàn mới được nhận ngựa.

---

## PHẦN IV: MA TRẬN 15 SỰ KIỆN VẬN HÀNH (OPERATIONAL MATRIX)

| Mã | Kịch bản Vận hành Thực tế | Bearer | Luồng tiền & Xử lý Dứt điểm |
|:---|:---|:---:|:---|
| EV-01 | Khách hủy chuyến xa (> 14 ngày) mốc M1 | KH | Phạt 5% P; Hoàn cọc = 35% P. Giải phóng xe. |
| EV-02 | Khách hủy chuyến từ 7 đến 14 ngày mốc M2 | KH | Phạt 15% P; Hoàn cọc = 25% P. Đóng hồ sơ. |
| EV-03 | Khách hủy chuyến từ 3 đến 7 ngày mốc M3 | KH | Phạt 30% P + Sunk Costs thực tế. Trừ vào 40% cọc. |
| EV-04 | Khách hủy chuyến sát giờ G (< 3 ngày) mốc M4| KH | Mất trọn 40% cọc. CT giữ cọc bù chi phí, đóng trip. |
| EV-05 | Khách yêu cầu dừng/cắt ngắn giữa đường (M5)| KH | KH trả 100% phí chặng đã đi. Xe vào trạm an toàn. |
| EV-06 | Xe hỏng hóc máy móc trên cao tốc | CT | CT chi trả sửa chữa, cứu hộ. Bật máy phát dự phòng. |
| EV-07 | Khách yêu cầu đổi lộ trình cự ly xa hơn | KH | KH trả phụ phí xăng/BOT. Duyệt realtime mới rẽ. |
| EV-08 | Cấp cứu thú y bệnh cấp tính (Colic, sốc nhiệt)| BM | BH chi trả 100% viện phí. KH không mất tiền. |
| EV-09 | Cấp cứu thú y do xe tai nạn / phanh gấp | CT/BM| CT ứng trước, Claim BM. Bồi thường sức khỏe ngựa. |
| EV-10 | Lưu chuồng kéo dài do thiên tai, bão lũ | BM/CT| BM đền bù. Bắn tin báo an toàn cho khách (App). |
| EV-11 | Lưu chuồng do xe hỏng chờ phụ tùng | CT | CT chịu tiền bãi & cỏ. Bồi thường giao trễ hạn. |
| EV-12 | Ách tắc cửa khẩu do nợ thuế/giấy tờ của KH | KH | KH trả 100% phí lưu bãi hải quan. Trả xong mới đi. |
| EV-13 | KH không thanh toán Hóa đơn Đợt 2 (mốc 50%)| KH | Tạm dừng xe tại trạm. Quá 24h ➔ Kích hoạt M5. |
| EV-14 | KH không trả Hóa đơn Đợt 3 (tại điểm đến) | KH | Kích hoạt Lien (Giữ ngựa). Quá 7 ngày ➔ Phát mại. |
| EV-15 | Ngựa chết do tai nạn bất khả kháng | BM | Bảo hiểm All-Risk đền bù 100% khai báo giá trị. |

---

## PHẦN V: DATABASE ENTITIES TÀI CHÍNH (FINANCIAL DB)

| STT | Table Name | Chức năng cốt lõi (Nghiệp vụ) |
|:-:|:---|:---|
| 01 | `CostCategory` | Bảng Master phân loại vĩ mô chi phí (Cost Parent). Phục vụ Dashboard tỷ trọng. |
| 02 | `CostSubItem` | Danh mục định mức mã con (Nhiên liệu, BOT). Cầu nối so sánh Dự toán và Thực tế. |
| 03 | `IncurredCost` | Ghi nhận mọi phát sinh thực tế dọc đường (Sửa xe, cứu hộ, y tế). Cần phê duyệt. |
| 04 | `PlannedCostItem` | Lưu chi tiết từng dòng dự toán cấu thành nên Báo giá Q1. |
| 05 | `Quote` | Quản lý vòng đời Báo giá (Q1, Q1'). Tự động tính toán Sai số ε để Re-quote. |
| 06 | `Contract` | Xác lập Giá Hợp đồng (P) bất biến. Quy định mức Cọc 40% và chi phí Lien. |
| 07 | `Invoice` | Phát hành Hóa đơn 3 Đợt Vàng, Hóa đơn M5 và Hóa đơn hoàn cọc hủy chuyến. |
| 08 | `PaymentTransaction` | Lưu vết dòng tiền (VNPay, Stripe, Tiền mặt). Kích hoạt "Mở chốt an toàn 50%". |
| 09 | `LienAndStorageRecord`| Hồ sơ Cầm giữ ngựa (Lien). Đồng hồ tự động tính phí lưu giữ. Quản lý hạn 7 ngày. |
| 10 | `TripFinancialSettlement`| Báo cáo đóng sổ Quyết toán. Lưu trữ Lợi nhuận gộp thực tế (AGP) của toàn bộ Trip. |
| 11 | `TripCancellation` | Lưu vết quá trình khách hủy chuyến, tính toán Sunk Costs, tiền phạt và tiền hoàn cọc. |

---

## PHẦN VI: NGHIỆP VỤ ĐIỀU PHỐI & LỘ TRÌNH (COORDINATOR & ROUTING MATH)

### 1. Trách nhiệm của Fleet & Route Coordinator
* Quản lý trạng thái phương tiện (Xe tải, Khoang máy bay, Stalls).
* Lập lộ trình tối ưu, xác định trạm dừng nghỉ, kiểm dịch và nhiên liệu.
* Theo dõi tiến độ chặng và điều chỉnh lộ trình khi phát sinh ngoại lệ.

### 2. Công thức Toán học Vận hành
**A. Tính toán Thời gian (T_total):**
> `T_total = T_drive + T_rest + T_customs`
* `T_drive`: Quãng đường (km) / Vận tốc trung bình. Tích hợp từ Google Maps API.
* `T_rest`: Tổng thời gian nghỉ tại trạm (cho ngựa uống nước, giảm stress).
* `T_customs`: Ước lượng thời gian chờ hải quan & thú y.

**B. Tính toán Chi phí (Cost_total):**
> `Cost_total = Cost_fixed + (Distance * Cost_fuel) + Cost_customs + Cost_care + Cost_contingency`
* `Cost_fixed`: Khấu hao, lương tài xế.
* `Distance * Cost_fuel`: Phí nhiên liệu biến đổi theo cự ly thực.

### 3. Quy tắc Lựa chọn Phương tiện & Định tuyến
* **Xe tải chuyên dụng:** Áp dụng khi Khoảng cách lộ trình ≤ Max Range của xe và Thời gian lái xe đảm bảo quy tắc sinh học của ngựa.
* **Khoang máy bay (Stalls):** Áp dụng khi vượt Max Range, xuyên biển hoặc xuyên quốc gia cự ly xa.
* **Điều kiện chéo:** Phương tiện phải `Available` (không trùng lịch) và đủ `Capacity` tải trọng số lượng ngựa của đơn.

### 4. Sơ đồ Ngữ cảnh Giao tiếp (Context Diagram Flows)
* **Luồng IN (Từ Coordinator gửi vào Hệ thống):** Khai báo tài nguyên (Xe, Stalls); Chốt tọa độ lộ trình; Phân công Tài xế/Escort; Push lệnh điều chỉnh lộ trình khi có sự cố.
* **Luồng OUT (Hệ thống trả ra cho Coordinator):** Đơn đặt hàng từ LM; Cập nhật pháp lý từ Transport Specialist; Tín hiệu SOS/Tọa độ GPS từ Driver App; Dữ liệu API Giao thông/Thời tiết.
