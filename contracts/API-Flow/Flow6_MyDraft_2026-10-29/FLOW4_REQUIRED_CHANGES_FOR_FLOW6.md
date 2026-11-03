# Yêu cầu chỉnh hợp đồng Flow4 để bàn giao đúng sang Flow6

Ngày rà soát: **30/10/2026**.

Đối tượng: hợp đồng Flow4 phiên bản **1.1.0**, trên nhánh `main`, commit **983c28e114a11339887a0157582858b09b3ef7b6**.

[Bản Flow4 đã kiểm tra trên GitHub](https://github.com/maidinhquan/Racehorse-Transport-System/blob/983c28e114a11339887a0157582858b09b3ef7b6/contracts/API-Flow/Flow4/FLOW4.md).

## 1. Chuẩn áp dụng và phạm vi sửa

**`ID_NAME_RULE_Reviewed.md` và `DATABASE_STATUS_CONVENTION.md` là chuẩn. Hợp đồng các flow phải theo hai file này; không tự thêm enum hoặc đổi luồng Flow6 để hợp thức hóa bản hợp đồng khác.**

Luồng Flow6 đã thống nhất:

```text
Kiểm người nhận, quyền nhận, ngựa, tài sản và giấy tờ
→ Biên bản DRAFT
→ Gửi mã xác thực: AWAITING_OTP
→ Xác minh OTP đúng phiên bản: CONFIRMED
→ Trip COMPLETED / Request DELIVERED / Contract vẫn EFFECTIVE
→ Thu số dư qua VNPay, backend xác minh tiền
→ Người quản lý kiểm tra kết quả và hoàn tất tất toán: SETTLED
→ Mở một thời hạn phản hồi hiện hành theo policy
→ Hết hạn, không còn khiếu nại hoặc nghĩa vụ tiền chưa giải quyết
→ Hồ sơ tất toán, Request và Contract CLOSED
```

SETTLED không phải khách hàng từ bỏ quyền khiếu nại. Không có bước Customer bấm nghiệm thu riêng để mở thanh toán. Khiếu nại: OPEN → IN_PROGRESS → Manager phản hồi và RESOLVED, không chờ Customer đồng ý kết quả. Không có proposal/dispute riêng hoặc status Request UNDER_RESOLUTION. Hỗ trợ SUPPORT sau đóng không tự mở lại đơn.

Tài liệu này yêu cầu sửa **hợp đồng và điểm nối**, không yêu cầu Flow4 triển khai thay nghiệp vụ Flow6. Chỉ các mục xác định sai mới là lỗi đã có bằng chứng; các mục thiếu mapping/baseline bên dưới là khoảng trống cần làm rõ, không kết luận backend đang mất dữ liệu.

## 2. Phần Flow4 hiện đã đúng — cần giữ

- Có mốc **FINAL_ARRIVED**, hoàn tất qua **F4-J06**; không lấy ETA/giờ dự kiến làm bằng chứng đã đến.
- Đến điểm cuối chưa đồng nghĩa giao xong: **Trip vẫn IN_TRANSIT**.
- Chỉ Flow6 xác nhận bàn giao hợp lệ mới chuyển **Trip COMPLETED, Request DELIVERED**.
- Có TripID, RequestID, danh sách ngựa/mã vi mạch, địa điểm nhận/giao, mốc thực tế và phân công để tham chiếu.
- Sức khỏe, kết luận bác sĩ và sự cố là dữ liệu tham chiếu; guard phải kiểm lại khi thao tác, không tin kết quả GET cũ.
- Chi phí phát sinh trên đường là chi phí nội bộ, không tự thay cước phí Customer.

Không cần viết lại toàn bộ Flow4. Cần chỉnh các điểm cụ thể sau.

## 3. Lỗi bắt buộc sửa

### 3.1. Request đang vận chuyển dùng sai status

**Vị trí:** FLOW4.md mục 1, bảng sự kiện; schema `TripSummary.requestStatus`; mô tả F4-J06 và các ví dụ/đầu ra liên quan xuất phát, đang chạy và FINAL_ARRIVED.

Hiện tại:

```text
Trip IN_TRANSIT / Request IN_TRANSIT
```

Đúng theo rule:

```text
Trip IN_TRANSIT / Request IN_PROGRESS
```

| Sự kiện | Trip đúng | Request đúng |
|---|---|---|
| Duyệt cho khởi hành | READY_TO_DEPART | SCHEDULED |
| Xuất phát thực tế | IN_TRANSIT | IN_PROGRESS |
| Các mốc giữa hành trình | IN_TRANSIT | IN_PROGRESS |
| Đến điểm cuối FINAL_ARRIVED | IN_TRANSIT | IN_PROGRESS |
| Flow6 xác nhận OTP bàn giao thành công | COMPLETED | DELIVERED |

**Ảnh hưởng:** Flow6 kiểm Request IN_PROGRESS. Nếu Flow4 ghi IN_TRANSIT vào Request, Flow6 có thể trả lỗi trạng thái và không tiếp nhận dù xe đã đến đúng nơi.

**Cách sửa:** sửa riêng enum/giá trị **Request** trong nguồn generator, Markdown, OpenAPI và fixture. Không tìm-thay toàn bộ IN_TRANSIT vì đó vẫn là giá trị đúng của Trip. `phase = IN_PROGRESS` cũng là projection riêng, không được lẫn với tên cột.

**Nghiệm thu:** sau J05 và J06 FINAL_ARRIVED, mọi response liên quan đều trả Trip IN_TRANSIT, Request IN_PROGRESS; schema Request không còn cho IN_TRANSIT.

### 3.2. Loại UNDER_RESOLUTION khỏi Request

**Vị trí:** FLOW4.md mục 1, đoạn mô tả phase; `TripSummary.requestStatus` có UNDER_RESOLUTION.

**Vấn đề:** enum Request chuẩn không có UNDER_RESOLUTION. Quy trình Flow6 đã thống nhất không dùng dispute riêng làm thay đổi Request sang trạng thái này.

**Cách sửa:** bỏ UNDER_RESOLUTION khỏi enum Request và ví dụ. Sau giao Request giữ DELIVERED trong giai đoạn thu tiền, tất toán, phản hồi/khiếu nại; khi đủ điều kiện mới CLOSED. Không dùng giải quyết một phiếu để tự chuyển Request CLOSED.

**Nghiệm thu:** schema Request từ chối UNDER_RESOLUTION; khiếu nại mở không làm mất Request khỏi nhóm DELIVERED.

### 3.3. Sửa tham chiếu tới luồng Flow6 cũ

**Vị trí:**

- Đầu FLOW4.md có câu: “Không dùng phần Flow 6 cũ về tự đóng đơn/cửa sổ feedback để triển khai”.
- Mục 8, dòng “Đến điểm giao cuối” còn ghi “bàn giao/chữ ký/nghiệm thu/thanh toán/nhả xe theo Flow 6”.
- Các mô tả hoặc ví dụ còn phụ thuộc Customer nghiệm thu riêng, tranh chấp hoặc trạng thái của Flow6 cũ nếu có.

**Vấn đề:** cách dẫn này hướng người triển khai sang bộ teammate dùng ảnh chữ ký, acceptance riêng và Manager-only close, khác quyết định hiện hành.

**Cách sửa:** dẫn tới hợp đồng Flow6 đã thống nhất, ghi rõ:

> Flow4 ghi nhận FINAL_ARRIVED, giữ Trip IN_TRANSIT và Request IN_PROGRESS. Flow6 thực hiện kiểm người nhận/ngựa/tài sản/giấy tờ và xác nhận bàn giao bằng OTP đúng revision. Flow4 không tự xác nhận giao xong, không mở thời hạn phản hồi, không yêu cầu ảnh chữ ký hoặc Customer nghiệm thu riêng. Thời hạn phản hồi bắt đầu sau tất toán; đóng theo điều kiện của Flow6, không chỉ vì quá hạn.

**Nghiệm thu:** mốc đến cuối không tạo CONFIRMED DELIVERY, SETTLED hoặc feedback deadline. Không còn chỉ dẫn dùng ảnh chữ ký thay OTP.

### 3.4. Không gán hoàn ứng tổ xe vào tất toán Customer khi chưa có hợp đồng tiếp nhận

**Vị trí:** FLOW4.md mục 7 và 8; **F4-J36** POST `/driver/trips/{tripId}/expenses`, **F4-J37** GET `/trips/{tripId}/execution/expenses`; schema ExpenseRecord có RECORDED/SUBMITTED_TO_FLOW6.

Hiện tài liệu nói các chi phí này “chuyển giao sang Flow6 để kế toán duyệt quyết toán hoàn ứng (`TRIP_SETTLEMENT`)”.

**Vấn đề:** Flow6 hiện tại quản lý nghĩa vụ tài chính giữa Customer và đơn vị vận chuyển. `TRIP_SETTLEMENT` không có khoản ứng/tạm ứng, người được hoàn ứng, số đã chi trả cho tổ xe hoặc trạng thái quyết toán nhân viên. Refund Flow6 là hoàn tiền Customer theo SETTLEMENT_ADJUSTMENT, không phải trả tiền tài xế.

Nếu dùng chung tùy ý, có thể dẫn tới:

- Chi phí tổ xe tự biến thành khoản Customer phải trả.
- Hoàn tiền tài xế bị ghi nhầm là hoàn tiền Customer.
- SUBMITTED_TO_FLOW6 được hiển thị dù chưa có bên nhận lưu bền vững.

**Cách sửa trong phạm vi hiện hành:** giữ J36/J37 là ghi nhận/tra cứu chi phí nội bộ. Bỏ cam kết đã có luồng hoàn ứng bằng TRIP_SETTLEMENT. Muốn tính một khoản vào nghĩa vụ Customer phải có quyết định CHARGE của Manager đúng hợp đồng/nguồn theo Flow6, không tự động cộng expense. Chỉ dùng SUBMITTED_TO_FLOW6 khi có hợp đồng tiếp nhận thực sự và xác nhận nhận bền vững; chưa có thì ghi rõ capability chưa hỗ trợ, không trả thành công giả.

Nếu team muốn triển khai hoàn ứng nhân viên, cần thiết kế riêng trước; không thêm vào baseline Flow6 hiện hành bằng một câu mô tả.

**Nghiệm thu:** tạo expense không tự sửa invoice/giá hợp đồng/PaidAmount; không tạo Customer REFUND. Không báo đã chuyển thành công khi chưa có nơi tiếp nhận.

## 4. Các khoảng trống cần làm rõ để tích hợp

### 4.1. Phân công cấp chặng và cấp Trip chưa có mapping chung

Flow4 có `legs`, `assignedUserIds`, `crew.duty = MAIN_DRIVER/CO_DRIVER/VETERINARIAN` và kiểm đúng chặng. Flow6 hiện kiểm UserID trong DriverID/EscortID của TRIP_VEHICLE_ASSIGNMENT đúng Trip.

Không kết luận hai mô hình tự tương thích. Với AIR phải xác định tổ đầu đến có quyền bàn giao, không cho tổ đầu đi thao tác thay. Cần ghi rõ nguồn phân công cuối cùng, mapping vào UserID/Trip và cách thu hồi quyền khi assignment thay đổi. Không dùng AssignedSpecialistId/AssignedCoordinatorId để cấp quyền giao ngựa.

**Nghiệm thu:** tổ sai đầu vận chuyển không confirm OTP bàn giao; thay assignment thì quyền cũ hết hiệu lực ở mutation tiếp theo.

### 4.2. Baseline PICKUP cần đường truy xuất rõ

Flow6 cần HANDOVER Type=PICKUP Status=CONFIRMED và item đúng từng ngựa để so tình trạng, tài sản, giấy tờ trước/sau chuyến. Contract Flow4 mới chưa cam kết đầy đủ đầu ra cho bộ này.

Không bắt Flow4 tạo lại API nếu dữ liệu chung đã lưu. Cần chỉ rõ flow nào tạo baseline, FK theo Trip/Horse, nơi Flow6 đọc và cách biểu diễn thiếu. Không lấy HEALTH_LOG thay hoàn toàn baseline tài sản/giấy tờ. Không sao chép chip/ủy quyền PICKUP thành kết quả DELIVERY mới.

**Nghiệm thu:** có baseline thì Flow6 đọc đúng; thiếu trả cảnh báo/thiếu dữ liệu, không dựng bản confirmed hoặc OTP giả.

### 4.3. Health/blocker cần phân biệt vận chuyển với bàn giao

Flow4 có blockers, HealthLog và VetAssessment. Nhưng `handoverAvailable` hoặc context từng đọc là gợi ý tại thời điểm GET, không thay guard lúc confirm Flow6.

Cần quy định cách Flow6 đọc tình trạng hiện hành và vấn đề thật sự ảnh hưởng giao nhận. Không yêu cầu mọi INCIDENT RESOLVED mới được mở màn giao; không so chuỗi HealthStatus = HEALTHY; cũng không coi thiếu tích hợp blocker là không có vấn đề. Kết luận FIT không tự xóa các blocker pháp lý/sự cố độc lập.

**Nghiệm thu:** có vấn đề mới sau GET thì mutation kiểm lại; dữ liệu tham chiếu không tự tạo status mới trong Request.

### 4.4. Thời gian và khóa phiên bản

Flow4 trả giờ Việt Nam `YYYY-MM-DD HH:mm`; Flow6 2.0 trả UTC ISO có Z. Phải chuyển đổi bằng adapter rõ múi giờ, không parse theo timezone máy.

`executionVersion`, `approvedPlanVersion`, `assignmentVersion` là các dependency của vận hành; revision OTP thuộc biên bản. Không lấy executionVersion làm RevisionNo hoặc dùng nó thay bằng chứng phiên bản đã được người nhận xác nhận.

## 5. Đầu vào Flow6: lấy từ đâu?

Không yêu cầu Flow4 trả lại toàn bộ Contract/Payment trong một payload khổng lồ. Flow6 được kiểm trực tiếp nguồn dữ liệu dùng chung, nhưng các liên kết phải được giữ đúng.

| Dữ liệu | Yêu cầu tại lúc tiếp nhận | Nguồn trách nhiệm |
|---|---|---|
| Trip và mốc đến | Trip IN_TRANSIT; FINAL_ARRIVED đã ghi theo contract vận hành | Flow4 |
| Request | IN_PROGRESS, đúng Trip.RequestID | Flow4 giữ đúng status; nguồn Request dùng chung |
| Deployment | CONFIRMED và metadata/phân công đúng | Flow1/3 và dữ liệu dùng chung; Flow4 không làm mất |
| Contract/version | EFFECTIVE, CurrentVersionNo trỏ đúng SIGNED | Dữ liệu hợp đồng dùng chung; không lấy MAX version |
| Cọc | DEPOSIT invoice PAID, đủ tiền verified đúng version, không đòi mọi attempt SUCCESS | Module tiền dùng chung; không cần Flow4 xác minh lại |
| Danh sách ngựa | Đúng REQUEST_HORSE_MAPPING, mã vi mạch nhận diện | Request/horse data và snapshot tham chiếu Flow4 |
| Người nhận chỉ định | Name/phone trên Request; người thực nhận vẫn phải kiểm tại DELIVERY | Request và bước kiểm của Flow6 |
| Baseline | PICKUP confirmed và item để đối chiếu | Flow tạo PICKUP/data dùng chung, phải xác định rõ |
| Sức khỏe/sự cố | Tình trạng thực, nguồn và phạm vi ảnh hưởng | Flow4/5, Flow6 kiểm phần liên quan |
| DELIVERY/settlement | Chưa có hoặc DRAFT; final invoice có thể chưa có/chưa PAID | Flow6; không yêu cầu hoàn thành trước khi bắt đầu giao |

## 6. Các file phải sửa đồng bộ

Trong `contracts/API-Flow/Flow4`:

1. `FLOW4.md`: sửa bảng trạng thái, nguồn Flow6, ranh giới chi phí và phần handoff.
2. `build_contract.py`: sửa Request enum, mô tả guard và nguồn ví dụ. Không chỉ sửa generated JSON.
3. Sinh lại `FLOW4-API-JSON.md`, `flow4.openapi.json`, `flow4.examples.json`.
4. `validate_contract.mjs`: thêm ca âm Request IN_TRANSIT/UNDER_RESOLUTION, kiểm FINAL_ARRIVED chưa hoàn thành Trip, kiểm expense không tự thành tiền Customer.
5. Nếu SDK/mirror/DTO được sinh từ contract Flow4 thì đồng bộ ở lượt tích hợp tương ứng; không tự coi frontend cũ tương thích.

Không cần đổi tên toàn bộ API Flow4; tập trung các field/guard và ranh giới nêu trên.

## 7. Danh sách nghiệm thu gửi lại

- [ ] Xuất phát và FINAL_ARRIVED: Trip IN_TRANSIT, Request IN_PROGRESS.
- [ ] Request enum không có IN_TRANSIT hoặc UNDER_RESOLUTION; Trip vẫn có IN_TRANSIT.
- [ ] FINAL_ARRIVED không tự COMPLETED, CONFIRMED DELIVERY, SETTLED hoặc mở feedback deadline.
- [ ] Mô tả Flow6 xác nhận OTP đúng revision; không ảnh chữ ký/Customer acceptance riêng.
- [ ] Phân công đúng chặng cuối có mapping/quyền rõ, đặc biệt tổ đầu đến của AIR.
- [ ] Baseline PICKUP có nguồn truy xuất hoặc cảnh báo thiếu, không dữ liệu giả.
- [ ] Mutation Flow6 kiểm lại dependency/blocker hiện hành; GET không cấp quyền vĩnh viễn.
- [ ] Expense nội bộ không tự sửa tiền Customer; không báo handoff hoàn ứng thành công khi chưa có bên nhận.
- [ ] Ví dụ Markdown/OpenAPI/schema/generator cùng bộ status và cùng luồng.
- [ ] Nêu rõ schema tests đã chạy và integration chưa chạy; không gọi contract là backend hoàn tất.

## 8. Giới hạn kết luận

Đã đọc Flow4 trên đúng commit main nêu ở đầu, đối chiếu với rule và Flow6 thống nhất. 37 API/480 mẫu JSON của bản Flow4 đó hợp lệ theo schema hiện tại, nhưng schema tự nhất quán vẫn có thể dùng sai status chuẩn. Chưa chạy backend, database migration, OTP/email, VNPay hoặc kiểm thử liên flow thực tế.

Đây là tài liệu yêu cầu sửa để teammate review; không khẳng định các khoảng trống mapping/baseline là lỗi runtime đã tái hiện.
