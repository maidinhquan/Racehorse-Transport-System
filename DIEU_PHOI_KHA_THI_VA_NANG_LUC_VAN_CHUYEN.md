# ĐÁNH GIÁ TÍNH KHẢ THI VÀ NĂNG LỰC VẬN CHUYỂN TRONG LẬP LỘ TRÌNH (FLOW 3)
*Tài liệu nghiệp vụ & kỹ thuật hệ thống Racehorse Transport System – Nhánh `main`*

---

## 1. Tổng quan vai trò Điều phối viên (Coordinator)
Trong hệ thống quản lý vận chuyển ngựa đua, Điều phối viên phụ trách:
- Khảo sát và thiết lập lộ trình di chuyển đường bộ tối ưu, an toàn, tuân thủ nghiêm ngặt quy chuẩn bảo vệ và phúc lợi động vật.
- Phân bổ phương tiện xe tải chuyên dụng (**Horsebox / Horse Truck**) đạt chuẩn tải trọng và sức chứa.
- Phân bổ tổ nhân sự vận hành chuyên trách (Tài xế chính, Phụ xe, Bác sĩ thú y).
- Giám sát các điều kiện kỹ thuật, thời gian nghỉ ngơi, tiếp cận điểm nhận/giao để chốt trạng thái **Operations READY (Ops READY)** trước khi đội xe khởi hành.

---

## 2. Cách Điều phối viên biết chuyến đi khả thi trong lúc lập lộ trình

Hệ thống cung cấp cơ chế tính toán và phản hồi tức thì (Real-time Validation Engine) trên giao diện tab **Tuyến đường (`RouteTab`)**:

### 2.1. Tự động tính toán cự ly, thời lượng và ETA thời gian thực
- **Routing Engine:** Hệ thống tự động kết nối dịch vụ định tuyến đường bộ (OSRM / Geoapify) để lấy cự ly chính xác ($\text{km}$) và thời gian lái xe cơ sở.
- **Dự báo tiến độ:** Tự động cộng dồn thời gian lái xe thực tế, thời gian dừng nghỉ chăm sóc ngựa tại từng trạm để tính ra thời gian đến dự kiến ($\text{ETA}$) tại từng điểm dừng và điểm giao cuối cùng.

---

### 2.2. Giải thích chuyên sâu: Hệ số tải chuyên dụng (`truckFactor`) là gì?

Trong code hệ thống (`routePlanner.tsx` dòng 400 và `seed.json` dòng 5032), hệ số này có tên biến là **`truckFactor`** (trên giao diện gọi là *"Hệ số thời gian xe chở ngựa"*), được mặc định cài đặt ở mức **`1.2`** (tăng thêm 20% thời gian di chuyển).

#### a. Bản chất nghiệp vụ: Tại sao phải nhân thêm hệ số này?
Các dịch vụ bản đồ thông thường (như OSRM, Google Maps) luôn tính toán thời gian dựa trên tốc độ di chuyển của **xe ô tô con (Passenger Car)** chạy ở tốc độ tối đa cho phép. Tuy nhiên, xe chở ngựa đua là loại phương tiện hoàn toàn khác biệt:
1. **Bảo vệ sinh mạng và thể lực của ngựa đua:**
   * Ngựa đua đứng suốt chặng đường. Chúng có giá trị rất cao (từ hàng trăm nghìn đến hàng triệu USD) nhưng hệ cơ xương khớp cực kỳ nhạy cảm.
   * Tài xế xe chở ngựa bắt buộc phải chạy thật đầm, tăng tốc từ từ, vào cua chậm rãi và giữ khoảng cách phanh rất dài. Tuyệt đối không được phanh gấp, không được vào cua ẩu vì lực quán tính sẽ làm ngựa mất thăng bằng, ngã, rạn xương hoặc hoảng loạn.
2. **Đặc tính xe tải nặng cồng kềnh (7 – 16 tấn):**
   * Xe chuyên dụng chở từ 1 đến 4 con ngựa kèm thùng xe gia cố, bồn nước, thức ăn và trang thiết bị thú y có tổng tải trọng rất lớn và trọng tâm cao.
   * Khi đi qua các gờ giảm tốc, cầu cống, khúc cua gấp hoặc đường đèo dốc, xe bắt buộc phải giảm tốc độ sâu hơn nhiều so với xe con.
3. **Quy định pháp luật về tốc độ xe tải:**
   * Luật giao thông đường bộ luôn quy định tốc độ tối đa cho phép của xe tải nặng thấp hơn xe con từ 10 đến 20 km/h trên cả quốc lộ lẫn cao tốc.

#### b. Công thức tính toán cụ thể trong Code
Tại file `frontend/src/features/coordinator/workflows/routePlanner.tsx` (dòng 400):
$$\text{duration (thời gian lái xe thực tế)} = l.\text{min} \times \text{pol.truckFactor}$$

* Trong đó:
  * $l.\text{min}$: Thời gian di chuyển cho xe con do OSRM/Geoapify tính toán.
  * $\text{pol.truckFactor}$: Hệ số xe tải chở ngựa (mặc định là $1.2$).

#### c. Ví dụ minh họa thực tế
* Giả sử OSRM tính một chặng đường từ Trang trại Củ Chi về Trung tâm kiểm dịch mất **60 phút** (đối với xe con chạy bình thường).
* Khi đưa vào hệ thống của Điều phối viên:
  $$\text{Thời gian chạy xe thực tế} = 60 \text{ phút} \times 1.2 = 72 \text{ phút} \text{ (1 giờ 12 phút)}$$
* Hệ thống tự động bù thêm **12 phút an toàn** vào lịch trình di chuyển.

#### d. Tác động của `truckFactor` đến việc đánh giá tính khả thi
1. **Dự báo ETA chuẩn xác:** Tránh việc lập lịch quá lạc quan theo xe con, dẫn đến xe tải chạy không kịp và bị trễ hẹn giao hoặc lỡ giờ làm việc của trạm kiểm dịch.
2. **Tính đúng chu kỳ nghỉ chăm sóc ngựa:** Quy định phúc lợi yêu cầu cứ sau tối đa 4 tiếng lái xe liên tục là phải dừng nghỉ. Nhờ có `truckFactor`, hệ thống tính đúng thời điểm xe thực tế chạm mốc 4 tiếng để cảnh báo Điều phối viên chọn trạm nghỉ kịp thời.
3. **Cấu hình linh hoạt:** Điều phối viên có thể bấm vào nút cấu hình trên bản đồ để tùy chỉnh hệ số này (ví dụ: tăng lên $1.25$ hoặc $1.30$ nếu đi vào mùa mưa bão hoặc cung đường đèo dốc khó đi).

---

### 2.3. Cơ chế tự động phát hiện vi phạm biên giới và nắn tuyến (Self-healing Corridor)
- **Cảnh báo lọt tuyến quốc tế:** Đối với các chặng vận chuyển nội địa (ví dụ: TP. Hồ Chí Minh đi Hà Nội), thuật toán OSRM mặc định có thể đi tắt qua lãnh thổ Lào hoặc Campuchia. Hệ thống liên tục quét tọa độ tim đường (`isPointOutsideVietnam`). Nếu phát hiện điểm nằm ngoài biên giới Việt Nam, hệ thống báo lỗi vi phạm chủ quyền/pháp lý hải quan.
- **Nắn tuyến một chạm:** Cung cấp chức năng *"Nắn tuyến qua QL1A"*, tự động chèn điểm hành lang ven biển (`VN_CORRIDOR_WAYPOINT` tại Bình Định) để ép lộ trình lưu thông 100% trong nước.

### 2.4. Rà soát lỗi tức thì trên từng cung đường và điểm dừng
- Hệ thống rà soát song song hai cấp độ:
  - **Lỗi chặng đường (`segIssue`):** Quá thời gian lái xe liên tục giữa 2 lần nghỉ, quá tổng thời gian lái xe của đợt đường bộ, tuyến đường bị cắt qua biên giới.
  - **Lỗi điểm dừng (`stopIssue`):** Địa điểm ngừng hoạt động, đến ngoài giờ mở cửa, thiếu bãi đỗ xe tải, thiếu nước/thức ăn, thời gian dừng không đủ mức tối thiểu.
- Đếm tổng số lỗi và hiển thị trực quan ở đầu trang: *"Còn X lỗi cần xử lý trước khi gửi duyệt"*.

### 2.5. So khớp hạn chót giao ngựa cam kết (Delivery Deadline)
- Hệ thống tự động lấy hạn chót giao ngựa từ hợp đồng của khách hàng (`rpDeadline`).
- So sánh: Nếu $\text{ETA} > \text{Deadline}$, hệ thống cảnh báo đỏ trễ hẹn và bắt buộc phải có giải trình lý do (`DeadlineJustification`).

### 2.6. Hỗ trợ tìm kiếm & gợi ý trạm dừng đạt chuẩn
- Khi cần bổ sung điểm nghỉ, hệ thống hiển thị danh bạ trạm dừng theo bán kính xung quanh cung đường, tự động lọc các trạm thỏa mãn điều kiện chăm sóc ngựa để Điều phối viên chèn vào lộ trình chỉ với một cú nhấp chuột.

---

## 3. Cách biết chuyến đi đạt đủ khả năng vận chuyển (Transport Capacity & Capability)

Khả năng vận chuyển được đối soát tự động giữa **yêu cầu của đàn ngựa** và **năng lực thực tế của hạ tầng/phương tiện xe tải**:

### 3.1. Đối chiếu số lượng ngựa với sức chứa xe tải (Stall Capacity)
- Mỗi yêu cầu vận chuyển có số lượng ngựa cụ thể: $N$ (từ 1 đến 4 con).
- Xe tải chuyên dụng đường bộ phải có số ngăn ngựa (`stalls`) thỏa mãn:
  $$\text{Vehicle.Stalls} \ge N$$
- Hệ thống tự động lọc danh sách xe trong bãi (Fleet), chỉ hiển thị những xe có số ngăn đủ chở đàn ngựa của chuyến đi.

### 3.2. Giới hạn tiếp cận điểm nhận/giao và tĩnh không cầu đường (Access & Specs)
- **Lối vào trang trại:** Hệ thống đối chiếu 4 thông số kỹ thuật của xe (`spec`: chiều cao `heightM`, chiều rộng `widthM`, chiều dài `lengthM`, tổng tải trọng `grossT`) với giới hạn lối vào tại điểm nhận và điểm giao (`access`: `maxHeightM`, `maxWidthM`, `maxLengthM`, `maxWeightT`).
- Nếu xe quá khổ so với đường nông thôn hoặc cổng trang trại, hàm `vehicleAccessIssue` báo lỗi không thể tiếp cận và yêu cầu đổi loại xe nhỏ hơn.
- **Tĩnh không cầu hầm:** Khi gửi lộ trình sang backend, hệ thống truyền thông số tải trọng và chiều cao xe (`weightTons`, `heightMeters`) vào dịch vụ bản đồ để định tuyến tránh các cầu cấm tải hoặc hầm hạn chế chiều cao.

### 3.3. Năng lực và tiện ích tại các trạm nghỉ chân (Rest Stops)
Một trạm dừng chỉ được hệ thống chấp nhận là trạm nghỉ chăm sóc hợp lệ khi đạt đủ:
- Có chức năng đăng ký: `REST`.
- Trạng thái: Đang hoạt động (`ACTIVE`).
- Bãi đỗ xe: Đủ diện tích cho xe tải chuyên dụng hạng nặng (`truckParking = true`).
- Hậu cần: Có sẵn nguồn nước sạch và thức ăn (`waterFeed = true`).
- Sức chứa: Sức chứa lưu trú của trạm $\ge N$ (số ngựa của chuyến).
- Hình thức chăm sóc:
  - Nếu nghỉ ngoài xe (`unload = true`): Bắt buộc có khu lên/xuống an toàn (`loadingArea = true`) và chuồng lưu trú đạt chuẩn (`stabling = true`).
  - Nếu chăm sóc trên xe (`unload = false`): Trạm phải hỗ trợ vị trí đỗ chăm sóc trên thùng xe (`onboardCare = true`).
- Khung giờ hoạt động: Giờ xe ghé thăm phải nằm trong khoảng thời gian mở cửa của trạm (`openDuring`).

---

## 4. Bốn nhóm điều kiện xác định chuyến đi khả thi & đạt chuẩn khởi hành

| Nhóm điều kiện | Tiêu chí chi tiết | Quy tắc kiểm tra hệ thống |
| :--- | :--- | :--- |
| **Nhóm 1: Quản trị & Triển khai** | • Quản lý đã xác nhận triển khai<br>• Chuyến ở trạng thái lập kế hoạch<br>• Đúng điều phối viên phụ trách | • `deployment.status === 'CONFIRMED'`<br>• `trip.status === 'PLANNING'`<br>• `assignedOperator(t, 'coordinator') === true`<br>• Không bị hoãn (`!ON_HOLD` / `!HALTED`) |
| **Nhóm 2: Lộ trình & Hạ tầng đường bộ** | • Điểm đầu là điểm nhận, điểm cuối là điểm giao<br>• Tiến trình thời gian tăng dần liên tục<br>• Tuyến đường bộ thông suốt<br>• Tuyến nội địa không cắt qua biên giới nước ngoài | • `stops[0].type === 'ORIGIN'` & `stops[last].type === 'DESTINATION'`<br>• `plannedAt[i] > plannedAt[i-1]`<br>• `routing.status === 'ok'` (tính được km và thời gian)<br>• Tuyến nội địa giữ trọn vẹn trong lãnh thổ VN |
| **Nhóm 3: Phúc lợi ngựa & Nghỉ ngơi** | • Giới hạn lái xe liên tục giữa 2 lần nghỉ<br>• Giới hạn tổng đợt lái xe đường bộ<br>• Thời gian dừng nghỉ tối thiểu<br>• Không trễ hạn giao cam kết | • Thời gian lái xe giữa 2 lần chăm sóc $\le 4-6$ giờ (`careIntervalH`)<br>• Tổng đợt đường bộ liên tục $\le 12-14$ giờ (`roadEpisodeH`)<br>• Nghỉ chăm sóc tối thiểu $\ge 45-60$ phút (`shortRestMin`)<br>• Nghỉ hồi phục qua đêm ngoài xe $\ge 6-8$ giờ (`recoveryRestH`)<br>• $\text{ETA} \le \text{CommittedDeadline}$ |
| **Nhóm 4: Nguồn lực Đội xe & Tổ nhân sự** | • Xe sẵn sàng và đủ ngăn chứa<br>• Xe vào được cổng điểm nhận/giao<br>• Đủ 3 nhân sự độc lập<br>• Bác sĩ thú y có chứng chỉ hành nghề còn hạn<br>• Không bị trùng lịch chuyến khác | • `vehicle.status === 'READY'` & `vehicle.stalls >= N`<br>• Kích thước xe $\le$ giới hạn lối vào trang trại<br>• Bắt buộc đủ 3 vị trí: Tài xế chính + Phụ xe + Bác sĩ thú y<br>• Không một ai kiêm nhiệm 2 vị trí trong cùng chuyến<br>• `vet.certExpiry >= ETA`<br>• Nhân sự & phương tiện không thuộc chuyến đang chạy khác (`!vehicleConflict`, `!crewConflict`) |

---

## 5. Luận cứ kinh tế & pháp lý: Tại sao công ty KHÔNG thuê hay sở hữu máy bay riêng?

Khi phân tích nghiệp vụ và bảo vệ đồ án, một câu hỏi rất phổ biến được đặt ra: *"Tại sao công ty không thuê đứt hoặc sở hữu một chiếc máy bay riêng để hoàn toàn chủ động lịch trình?"*

Dưới đây là **5 lý do cốt lõi** giải thích tại sao việc thuê hay sở hữu máy bay riêng là hoàn toàn bất khả thi và phi thực tế:

### 5.1. Gánh nặng tài chính khổng lồ & Lãng phí nguồn lực (Unrealistic Financial Burden)
* **Chi phí duy trì quá lớn:** Chi phí thuê ướt (Wet-lease: gồm máy bay, phi công, bảo dưỡng kỹ thuật, bảo hiểm hàng không) một chiếc chuyên cơ vận tải hàng hóa (Boeing 777F hoặc Airbus A330F) dao động từ **1,5 đến 3 triệu USD mỗi tháng**, bất kể có bay hay không.
* **Tần suất đơn hàng không liên tục:** Nhu cầu vận chuyển ngựa đua không diễn ra đều đặn 24/7 mỗi ngày. Nếu mỗi tháng chỉ có 4 – 5 chuyến bay, máy bay sẽ phải nằm đất từ 20 – 25 ngày. Tiền thuê bến bãi và khấu hao hàng triệu USD sẽ khiến công ty phá sản nhanh chóng, hoặc giá cước bị đội lên mức phi lý mà không khách hàng nào chấp nhận chi trả.

### 5.2. Ràng buộc khắt khe của Luật Hàng không Quốc tế & Slot bay (Aviation Slot Restrictions)
* **Bầu trời không phải là đường giao thông tự do:** Dù sở hữu máy bay riêng, doanh nghiệp **tuyệt đối không thể tự do cất cánh theo ý muốn**.
* **Quy chế Slot sân bay quốc tế (IATA WASG):** Các sân bay quốc tế lớn (Tân Sơn Nhất - SGN, Narita - NRT) luôn quá tải đường băng. Mọi chuyến bay bắt buộc phải đăng ký và được Cục Hàng không cùng Ban Điều phối Slot cấp khung giờ cất/hạ cánh chính xác trước nhiều tuần hoặc nhiều tháng.
* **Giấy phép vùng trời (Overflight Permits):** Chuyến bay quốc tế phải xin phép bay qua không phận của các quốc gia nằm trên đường bay theo Kế hoạch bay ICAO. Không thể tự ý thay đổi giờ bay khi chưa được các nước phê duyệt.

### 5.3. Rủi ro đứt gãy chuỗi cung ứng khi máy bay gặp sự cố (Single Point of Failure / AOG)
* Nếu công ty chỉ thuê hoặc sở hữu 1 – 2 chiếc máy bay: Khi chiếc máy bay đó gặp trục trặc kỹ thuật đột xuất (AOG - Aircraft On Ground), phải vào xưởng kiểm tra định kỳ (C-Check/D-Check), hoặc phi công bị ốm/hết giờ bay theo luật an toàn $\rightarrow$ **Toàn bộ hoạt động vận chuyển quốc tế bị tê liệt hoàn toàn** vì không có máy bay thay thế.
* Ngược lại, nếu hợp tác với các hãng hàng không/đối tác logistics bên ngoài: Khi hãng A gặp sự cố, công ty có thể lập tức chuyển đơn hàng sang chuyến bay của hãng B hoặc C mà không làm trễ hẹn của khách.

### 5.4. Tổn thất từ các chuyến bay rỗng (Empty Leg / Ferry Flight Loss)
* Vận chuyển ngựa thường là hành trình một chiều (ví dụ: chở ngựa thi đấu từ Việt Nam sang Nhật Bản).
* Sau khi dỡ ngựa tại sân bay Tokyo, nếu công ty sở hữu máy bay riêng, chiếc máy bay đó buộc phải **bay rỗng (Ferry Flight)** quay về Việt Nam. Mỗi chuyến bay rỗng tiêu tốn hàng trăm nghìn USD tiền nhiên liệu, phí hạ cánh và điều hành bay mà hoàn toàn không có doanh thu bù đắp.

### 5.5. Quá tải và lạc đề phạm vi đồ án phần mềm (Scope Creep)
* Đồ án là **Hệ thống Quản lý Vận chuyển Ngựa (Racehorse Transport System)**, trọng tâm là quản lý thể trạng ngựa, quy trình chăm sóc thú y, lập lộ trình xe tải và quản lý hồ sơ kiểm dịch.
* Nếu tự nhận là sở hữu máy bay, hệ thống phần mềm bắt buộc phải xây dựng thêm các phân hệ hàng không cực kỳ phức tạp: Quản lý giờ bay phi công (Crew Rostering), quản lý bảo trì động cơ máy bay, nộp kế hoạch bay không lưu $\rightarrow$ Gây loãng đề tài và làm sai lệch trọng tâm nghiệp vụ của dự án.

> [!NOTE]
> **Mô hình chuẩn mực được áp dụng:** Công ty đóng vai trò là **Đơn vị giao nhận vận tải chuyên biệt (Specialized Equine Freight Forwarder)** giống như các tập đoàn vận chuyển ngựa hàng đầu thế giới (như *IRT, Peden Bloodstock, BBA Shipping*): Sở hữu và vận hành đội xe tải đường bộ chuyên dụng, còn chặng bay quốc tế thì hợp tác dịch vụ với các đối tác hàng không uy tín theo từng đơn hàng.

---

## 6. Bảng đối chiếu hiện trạng mã nguồn trong dự án (Nhánh `main`)

Toàn bộ các quy tắc trên đã được hiện thực hóa đầy đủ trong cấu trúc Clean Architecture của dự án:

### 6.1. Phía Frontend (`frontend/src/features/coordinator/`)

| Nghiệp vụ / Quy tắc | Tệp mã nguồn | Hàm / Thành phần đảm nhiệm |
| :--- | :--- | :--- |
| **Quy tắc triển khai, phân quyền & khóa** | `domain/coordinatorRules.ts` | `opsBlock()`, `canPlan()`, `assignedOperator()` |
| **Kiểm tra sức chứa xe & xung đột lịch** | `domain/coordinatorRules.ts` | `vehicleConflict()`, `crewConflict()`, `usable()` |
| **Kiểm tra thông số xe vs lối vào trang trại** | `domain/coordinatorRules.ts` | `vehicleAccessIssue()` (so sánh chiều cao, chiều rộng, chiều dài, tải trọng) |
| **Kiểm tra chứng chỉ Bác sĩ thú y** | `domain/coordinatorRules.ts` | `vetOk()`, `isVet()`, kiểm tra `certExpiry >= ETA` |
| **Danh sách điều kiện khởi hành tổng hợp** | `domain/coordinatorRules.ts` | `readiness()` (trả về danh sách tiêu chí Đạt / Chưa đạt của chuyến) |
| **Tính cự ly, thời gian & áp dụng truckFactor** | `workflows/routePlanner.tsx` | `routeVia()`, `rpRoute()`, `rpSchedule()` (dòng 400: `duration = l.min * pol.truckFactor`) |
| **Phát hiện vượt biên giới & Nắn tuyến QL1A** | `workflows/routePlanner.tsx` | `isPointOutsideVietnam()`, `needsVietnamDomesticCorridor()`, `VN_CORRIDOR_WAYPOINT` |
| **Kiểm tra điều kiện nghỉ ngơi & trạm dừng** | `workflows/routePlanner.tsx` | `rpSchedule()`, `rpRestErrors()`, `openDuring()`, `rpHours()` |
| **Xác thực cấu trúc lộ trình trước khi gửi** | `workflows/routePlanner.tsx` | `validateRoute()`, `submitRoadRoute()` |
| **Giao diện hiển thị lỗi tuyến & cảnh báo trễ** | `pages/trip-detail/tabs/RouteTab.tsx` | Khối cảnh báo `.rp-issues`, nút nắn tuyến qua QL1A, bản đồ Leaflet |
| **Giao diện phân bổ xe & 3 vị trí nhân sự** | `pages/trip-detail/tabs/ResourcesTab.tsx` | Component `RoadResources` (lọc xe sẵn sàng, kiểm tra xung đột lịch và chứng chỉ) |

### 6.2. Phía Backend (`backend/`)

| Nghiệp vụ / Quy tắc | Tệp mã nguồn | Hàm / Điểm cuối API |
| :--- | :--- | :--- |
| **API điều phối lộ trình & nguồn lực** | `backend/WebApi/Controllers/CoordinatorController.cs` | Các endpoint: `/api/coordinator/trips/{id}/plan-draft`, `/plan/validate`, `/plan/submit`, `/resources/confirm`, `/ops-ready` |
| **Đánh giá tổng thể tính sẵn sàng (Readiness Engine)** | `Infrastructure/Services/Coordinator/CoordinatorService.Readiness.cs` | `GetOperationsReadinessAsync()`: đối soát đầy đủ tuyến, xe, tài xế, hộ tống, chứng chỉ thú y |
| **Kiểm tra sức chứa ngăn ngựa (Stalls)** | `Infrastructure/Services/Coordinator/CoordinatorService.Readiness.cs` | Mã kiểm tra `STALL_CAPACITY_EXCEEDED` (`stallsSufficient = vehicle.CapacityStalls >= horseCount`) |
| **Kiểm tra vai trò độc lập & không kiêm nhiệm** | `Infrastructure/Services/Coordinator/CoordinatorService.Readiness.cs` | Kiểm tra tài xế chính và bác sĩ thú y phải là 2 người khác nhau (`DriverId != EscortId`) |
| **Tính toán lộ trình có kiểm soát tải trọng/chiều cao** | `Infrastructure/Services/Coordinator/CoordinatorService.RoutePlanning.cs` | `CalculateRouteAsync()`: tự động gắn tải trọng (`weightTons`) và chiều cao xe (`heightMeters`) vào `MapRoutingService` |
| **Quy tắc phúc lợi ngựa lái liên tục quá 6 giờ** | `Infrastructure/Services/Coordinator/CoordinatorService.RoutePlanning.cs` | Quy tắc F03-BR-16: cảnh báo bắt buộc chèn trạm nghỉ nếu lái xe liên tục $> 6$ giờ |
| **Kiểm tra trễ hạn giao & yêu cầu giải trình** | `Infrastructure/Services/Coordinator/CoordinatorService.RoutePlanning.cs` | Kiểm tra `CommittedDeadline` và yêu cầu `DeadlineJustification` nếu ETA trễ hơn hạn giao |
| **Chốt trạng thái nguồn lực Operations READY** | `Infrastructure/Services/Coordinator/CoordinatorService.Readiness.cs` | `ConfirmOperationsReadinessAsync()`: ghi nhận mốc xác nhận nguồn lực và chuyển chuyến sang trạng thái `READY` |

---

## 7. Hướng dẫn kiểm chứng thực tế trong hệ thống

1. **Kiểm tra lỗi lộ trình trên giao diện:**
   - Đăng nhập tài khoản Điều phối viên (`USER_006` / `coord@rts.com`).
   - Vào chi tiết chuyến đang ở trạng thái `PLANNING` $\rightarrow$ chọn tab **Tuyến đường**.
   - Kéo dài thời gian giữa hai trạm dừng $> 4$ tiếng hoặc xóa bớt điểm nghỉ: Hệ thống sẽ hiển thị cảnh báo đỏ và liệt kê chi tiết số lỗi cần khắc phục.
   - Khi có điểm dừng ngoài giờ hoạt động hoặc sức chứa trạm $< N$, hệ thống sẽ hiển thị lỗi ngay dưới thẻ điểm dừng.

2. **Kiểm tra khả năng vận chuyển tại tab Xe & Nhân sự:**
   - Vào tab **Xe & nhân sự**: Hệ thống chỉ hiển thị những xe có số ngăn $\ge$ số ngựa và có kích thước chui lọt cổng trang trại.
   - Danh sách nhân sự: Bác sĩ thú y có chứng chỉ hết hạn hoặc nhân sự đang bận chuyến khác sẽ bị làm mờ kèm dòng chú thích lý do cụ thể.

3. **Kiểm tra điểm chốt chặn trước khi khởi hành:**
   - Vào tab **Tổng quan**: Kiểm tra bảng điều kiện khởi hành (Readiness Checklist).
   - Nút *"Xác nhận nguồn lực"* chỉ có hiệu lực khi toàn bộ các điều kiện từ Lộ trình, Xe và Tổ nhân sự đều chuyển sang màu xanh lá (Đạt chuẩn).
