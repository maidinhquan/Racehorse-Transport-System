# TỔNG HỢP CÁC TRƯỜNG HỢP FLOW 3 KHÔNG ĐẠT ĐIỀU KIỆN KHỞI HÀNH
## (DEPARTURE READINESS & SAFETY GATE BLOCKERS)

> **Tài liệu chuẩn hóa nghiệp vụ & kiến trúc kỹ thuật hệ thống Racehorse Transport System**  
> **Phân vùng:** Flow 3 (Fleet & Route Operations) ➔ Gate 2 (Departure Approval) ➔ Flow 4 (Live Execution)  
> **Nguyên tắc vận hành:** Cơ chế Hai bên cùng sẵn sàng (**Two-Party Readiness**) & Cổng an toàn đa tầng (**Multi-Tier Safety Gates**).

---

## 1. TỔNG QUAN KIẾN TRÚC CỔNG DUYỆT KHỞI HÀNH

Để một chuyến đi (`TRIP_PLAN`) chuyển từ giai đoạn **Lập kế hoạch (`PLANNING`)** sang **Sẵn sàng khởi hành (`READY_TO_DEPART`)** và chính thức **Đang vận chuyển (`IN_TRANSIT`)**, hệ thống bắt buộc phải thỏa mãn đồng thời 2 cổng kiểm soát độc lập:

1. **Gate 1 – Phê duyệt Kế hoạch & Lộ trình (Plan Approval):**
   - Điều phối viên (Coordinator) xây dựng phương án tuyến đường, trạm dừng, xe tải và tổ nhân sự.
   - Quản lý vận hành (Logistics Manager) thẩm định tính khả thi, phúc lợi động vật và duyệt phương án (`RouteStatus = 'APPROVED'`).
2. **Gate 2 – Phê duyệt Khởi hành (Departure Approval - Two-Party Readiness):**
   - **Nhánh Điều phối (Ops READY):** Xe, tổ kíp lái, trạm dừng, chuyến bay và lịch trình sẵn sàng 100%.
   - **Nhánh Pháp lý (Docs READY):** Chuyên viên (Specialist) xác nhận toàn bộ hồ sơ kiểm dịch, hộ chiếu ngựa, bảo hiểm và trạm cách ly đã hoàn tất.
   - **Quyết định của Manager:** Duyệt lệnh xuất phát, cấp quyền cho đội xe chuyển sang trạng thái `READY_TO_DEPART`.

Chỉ khi vượt qua Gate 2 và hoàn tất kiểm tra quét vi mạch an toàn tại hiện trường (Flow 4), chuyến đi mới được phép lăn bánh và chuyển trạng thái sang `IN_TRANSIT`.

```
[PLANNING] ──(Gate 1: Duyệt Lộ trình)──> [PLAN_APPROVED / PLANNED]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
            [Operations READY]                                               [Documents READY]
       (Xe + Kíp lái + Lịch trình)                                    (Kiểm dịch + Bảo hiểm + Hồ sơ)
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      ▼
                                       (Gate 2: Manager Duyệt Khởi hành)
                                                      ▼
                                            [READY_TO_DEPART]
                                                      │
                                        (Tài xế xác nhận xuất phát)
                                                      ▼
                                              [IN_TRANSIT]
```

---

## 2. MA TRẬN CÁC TRƯỜNG HỢP CHẶN KHỞI HÀNH CHI TIẾT

Dưới đây là bảng tổng hợp toàn bộ các trường hợp vi phạm nghiệp vụ khiến chuyến đi **không đạt điều kiện khởi hành**, được phân loại theo từng nhóm thực thể:

---

### NHÓM I: LỖI TUYẾN ĐƯỜNG & KHẢ THI LỘ TRÌNH (ROUTE & NETWORK FEASIBILITY)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **1** | `ROUTE_REQUIRED` / `NO_ROUTE` | Chưa tạo chuỗi chặng lộ trình (`RouteSegments` rỗng, chưa thiết kế các điểm đón, trạm dừng và điểm giao). | Chặn duyệt phương án Gate 1 và chặn khởi hành Gate 2. | `CoordinatorService.Readiness.cs` (L38)<br>`coordinatorRules.ts` (L374) |
| **2** | `INVALID_ROUTE_POINTS` | Lộ trình ít hơn 2 điểm hoặc điểm đầu không phải `ORIGIN`, điểm cuối không phải `DESTINATION`. | Không thể nộp phương án (`submitRoadRoute` bị chặn). | `routePlanner.tsx` (L1318)<br>`CoordinatorService.RoutePlanning.cs` (L20) |
| **3** | `INVALID_POINT_CHRONOLOGY` | Thời gian dự kiến đến (`plannedAt`) của điểm sau sớm hơn hoặc bằng điểm trước. | Báo lỗi dữ liệu thời gian phi logic; chặn nộp duyệt. | `routePlanner.tsx` (L1321) |
| **4** | `EQUINE_WELFARE_CARE_OVERDUE` | **Lái xe liên tục quá 4 giờ không nghỉ:** Khoảng thời gian chạy xe giữa 2 lần nghỉ chăm sóc vượt quá 4h (`pol.careIntervalH = 4.0h`, trần tối đa 6.0h). | Báo lỗi vi phạm luật bảo vệ ngựa F03-BR-16. Chặn nộp duyệt Gate 1. | `routePlanner.tsx` (L403)<br>`CoordinatorService.RoutePlanning.cs` (L120) |
| **5** | `EQUINE_WELFARE_EPISODE_EXCEEDED` | **Đợt đường bộ vượt quá 12 giờ:** Tổng thời gian xe chạy tích lũy vượt quá 12h mà không có trạm nghỉ hồi phục hạ ngựa ngoài xe (`unload = true`, nghỉ qua đêm $\ge 6\text{h}-8\text{h}$). | Báo lỗi kiệt sức ngựa. Bắt buộc phải chèn trạm lưu chuồng qua đêm (`stabling`). | `routePlanner.tsx` (L404, L432)<br>`DIEU_PHOI_KHA_THI...md` (L68) |
| **6** | `DOMESTIC_BORDER_VIOLATION` | **Tuyến nội địa cắt qua biên giới:** Xe chạy tuyến Bắc – Nam tại Việt Nam bị định tuyến OSRM cắt qua địa phận Lào hoặc Campuchia do thiếu trạm ven biển QL1A. | Báo lỗi chủ quyền & hải quan. Chặn nộp cho đến khi bấm "Nắn tuyến qua QL1A". | `routePlanner.tsx` (L410-L415) |
| **7** | `INVALID_REST_STOP` | Điểm dừng được chọn làm trạm nghỉ chăm sóc nhưng không đạt chuẩn: thời gian dừng $< 45$ phút (`dwellMin < 45`), hoặc trạm thiếu nguồn nước/thức ăn (`waterFeed = false`). | Không được tính là lần nghỉ hợp lệ; thời gian mệt mỏi tiếp tục cộng dồn gây lỗi dây chuyền. | `routePlanner.tsx` (L423-L432) |
| **8** | `FACILITY_INACTIVE` | Trạm dừng, trạm thú y hoặc bãi đỗ đang bị đóng cửa, tạm ngưng hoặc bảo trì (`status != 'ACTIVE'`). | Báo lỗi địa điểm không hoạt động; chặn chốt tuyến. | `routePlanner.tsx` (L448)<br>`CoordinatorService.Flow3Core.cs` |
| **9** | `FACILITY_OUT_OF_HOURS` | Thời gian đoàn xe dự kiến ghé thăm trạm nằm ngoài khung giờ mở cửa của cơ sở (`openDuring = false`). | Báo lỗi trạm đóng cửa; yêu cầu dời giờ chạy hoặc đổi trạm. | `routePlanner.tsx` (L451) |
| **10** | `DEADLINE_OVERDUE_UNJUSTIFIED` | Thời gian đến nơi dự kiến trễ hơn Hạn cam kết với khách hàng (`calc.eta > CommittedDeadline`) nhưng không nhập giải trình lý do. | Chặn gửi duyệt lộ trình lên Quản lý. | `routePlanner.tsx` (L1359)<br>`CoordinatorService.RoutePlanning.cs` (L164) |
| **11** | `ROUTE_NOT_APPROVED` | Lộ trình còn ở trạng thái nháp (`DRAFT`), đang chờ duyệt (`PENDING_APPROVAL`) hoặc bị Quản lý trả về (`RETURNED`). | Cổng Gate 2 từ chối duyệt khởi hành. | `CoordinatorService.Readiness.cs` (L48)<br>`managerRules.ts` (L443) |
| **12** | `OPEN_CHANGE_EXISTS` | Chuyến đi đang mở một phiên bản sửa đổi dở dang (`OpenChange = true`) chưa được phê duyệt hoặc hủy bỏ. | Khóa toàn bộ cổng khởi hành Gate 2. | `CoordinatorService.Readiness.cs` (L561, L747)<br>`flow3_flow4...test.ts` (L195) |

---

### NHÓM II: LỖI PHƯƠNG TIỆN CHUYÊN DỤNG (VEHICLE & FLEET FEASIBILITY)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **13** | `VEHICLE_REQUIRED` | Chưa gán phương tiện xe tải chuyên dụng (`Horsebox`) cho chuyến đi. | Không đủ điều kiện hoàn tất nguồn lực (`Ops NOT READY`). | `CoordinatorService.Readiness.cs` (L197)<br>`coordinatorRules.ts` (L384) |
| **14** | `VEHICLE_STATUS_INVALID` | Xe tải được phân công không ở trạng thái sẵn sàng (xe đang hỏng, nằm xưởng `MAINTENANCE` hoặc ngừng hoạt động). | Chặn xác nhận tài nguyên vận hành. | `coordinatorRules.ts` (L305, L339)<br>`HorseTransportDB.sql` |
| **15** | `STALL_CAPACITY_EXCEEDED` | **Thiếu sức chứa ô chuồng:** Số ngăn ngựa của xe nhỏ hơn số lượng ngựa cần chở (`Vehicle.CapacityStalls < horseCount`). | Chặn phân công xe; báo lỗi quá tải ô chuồng. | `CoordinatorService.Readiness.cs` (L201)<br>`coordinatorRules.ts` (L305) |
| **16** | `VEHICLE_SCHEDULE_CONFLICT` | Phương tiện đang được gán cho một chuyến đi khác có khoảng thời gian hoạt động trùng lặp hoặc chưa hoàn tất bàn giao. | Báo lỗi xung đột lịch trình phương tiện. | `coordinatorRules.ts` (L262, L337)<br>`CoordinatorService.Assignments.cs` |
| **17** | `VEHICLE_ACCESS_INACCESSIBLE` | **Quá khổ giới hạn tiếp cận:** Chiều cao, chiều rộng, chiều dài hoặc tải trọng xe (`spec`) vượt quá giới hạn đường hầm, cầu hoặc cổng trang trại (`access`) tại điểm đón/giao. | Báo lỗi xe không vào được điểm lấy/giao; yêu cầu đổi xe nhỏ hơn hoặc kích hoạt đề xuất đổi điểm tập kết (`Relocation Proposal`). | `coordinatorRules.ts` (L326-L330)<br>`PickupAccessCard.tsx` |
| **18** | `CROSS_LEG_VEHICLE_CONFLICT` | **Xung đột xe chặng quốc tế (Chuyến AIR):** Phân công cùng 1 xe tải cho cả chặng đón tại Việt Nam và chặng giao tại Nhật Bản (xe không thể bay cùng lúc). | Chặn nộp kế hoạch bay đa phương thức. | `CoordinatorService.Flow3Core.cs` (L580-L589)<br>`CoordinatorService.Readiness.cs` (L132) |
| **19** | `VEHICLE_FOREIGN_COUNTRY_MISMATCH` | Xe tải phân công cho chặng giao ở nước ngoài (chặng Inbound của AIR) không đăng ký hoạt động tại nước sở tại (`fleetCountry != destinationCountry`). | Báo lỗi phương tiện không hợp pháp tại quốc gia đến. | `coordinatorRules.ts` (L305) |

---

### NHÓM III: LỖI TỔ NHÂN SỰ TÁC NGHIỆP (CREW & STAFFING FEASIBILITY)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **20** | `MAIN_DRIVER_MISSING` | Chưa phân công Tài xế chính cho chuyến đi hoặc chặng đón/giao. | Thiếu vị trí lái chính; chặn duyệt `Ops READY`. | `CoordinatorService.Readiness.cs` (L198)<br>`coordinatorRules.ts` (L385) |
| **21** | `CO_DRIVER_MISSING` | Chưa phân công Tài xế phụ (áp dụng bắt buộc cho tuyến đường bộ đường dài trên 8 tiếng hoặc trên 500 km). | Thiếu phụ xe đảm bảo an toàn đổi ca lái; chặn duyệt. | `coordinatorRules.ts` (L364, L386) |
| **22** | `VETERINARIAN_MISSING` | Chưa phân công Bác sĩ thú y / Hộ tống viên chuyên môn có chứng chỉ đi cùng xe. | Vi phạm quy chuẩn vận chuyển động vật có giá trị cao; chặn khởi hành. | `CoordinatorService.Readiness.cs` (L199)<br>`coordinatorRules.ts` (L365, L387) |
| **23** | `INDEPENDENT_ROLES_VIOLATION` | **Vi phạm độc lập vai trò:**<br>- Tài xế chính kiêm Bác sĩ thú y.<br>- Tài xế chính trùng với Tài xế phụ.<br>- Tài xế phụ kiêm Bác sĩ thú y. | Báo lỗi mâu thuẫn vai trò; kíp xe bắt buộc phải gồm 3 con người riêng biệt. | `CoordinatorService.Readiness.cs` (L200)<br>`flow3_flow4...test.ts` (L84-L108) |
| **24** | `STAFF_BUSY_ON_ACTIVE_TRIP` | Nhân sự được gán đang làm nhiệm vụ trên một chuyến đi khác chưa hoàn tất biên bản bàn giao (`status != 'COMPLETED'`). | Chặn phân công; mỗi nhân viên CBN chỉ thuộc 1 chuyến đi đang hoạt động. | `coordinatorRules.ts` (L270-L281)<br>`CoordinatorService.Readiness.cs` (L447) |
| **25** | `STAFF_ON_LEAVE_OR_SICK` | Nhân sự đang trong thời gian nghỉ phép (`ON_LEAVE`), nghỉ ốm (`SICK`) hoặc tạm ngưng tác nghiệp (`SUSPENDED`). | Loại khỏi danh sách khả dụng; báo lỗi trùng lịch nghỉ. | `coordinatorRules.ts` (L264-L267)<br>`StaffDirectoryLinks.cs` |
| **26** | `VET_CERTIFICATE_EXPIRED` | Chứng chỉ hành nghề thú y quốc tế của bác sĩ thú y hết hạn trước ngày chuyến đi kết thúc (`certExpiry < trip.eta`). | Báo lỗi chứng chỉ hết hiệu lực; từ chối chuyên môn. | `coordinatorRules.ts` (L285, L366) |
| **27** | `CROSS_LEG_CREW_CONFLICT` | **Xung đột nhân sự liên quốc gia (Chuyến AIR):** Lấy tài xế hoặc bác sĩ thú y ở Việt Nam phân công tiếp cho chặng xe tải đón tại Nhật Bản khi không đi cùng chuyến bay. | Báo lỗi nhân sự không thể phân thân giữa hai quốc gia. | `CoordinatorService.Readiness.cs` (L133-L141) |

---

### NHÓM IV: LỖI CHUYẾN BAY HÀNG KHÔNG (AIR TRANSPORT FEASIBILITY)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **28** | `AIRPORT_PAIR_NOT_SELECTED` | Phương thức vận chuyển là Hàng không (`AIR`) nhưng chưa chọn sân bay cất cánh (Origin Airport) và sân bay hạ cánh (Destination Airport). | Khóa lộ trình; hiển thị banner vàng yêu cầu chọn cặp sân bay. | `RouteTab.tsx` (L480-L495)<br>`airOperations.tsx` (L386) |
| **29** | `AIRPORT_NO_HORSE_HANDLING` | Sân bay được chọn không có phân khu hoặc chứng chỉ xử lý hàng hóa động vật sống (`horseHandling = false`). | Báo lỗi sân bay không đủ điều kiện tiếp nhận ngựa đua. | `routePlanner.tsx` (L454) |
| **30** | `AIR_FLIGHT_BUDGET_PENDING` | Ngân sách thuê tải chuyến bay chuyên dụng chưa được Logistics Manager phê duyệt (`f.status != 'BUDGET_APPROVED'`). | Chặn đặt chỗ và chặn xác nhận nguồn lực chặng bay. | `CoordinatorService.Readiness.cs` (L435)<br>`coordinatorRules.ts` (L351) |
| **31** | `FLIGHT_NOT_BOOKED` | **Chưa có vé máy bay:** Chưa có xác nhận đặt chỗ chính thức và mã tham chiếu từ hãng hàng không (`BookingConfirmed = false` hoặc `f.status != 'BOOKED'`). | Chặn hoàn tất điều kiện vận hành chặng bay (`Flight Booking PENDING`). | `CoordinatorService.Readiness.cs` (L114, L440)<br>`coordinatorRules.ts` (L352) |
| **32** | `AIRPORT_LEAD_TIME_INSUFFICIENT` | **Đến sân bay trễ (Lead-time $< 4\text{h}$):** Thời gian xe tải đến ga hàng hóa sân bay trước giờ máy bay cất cánh nhỏ hơn 4 tiếng. | Vi phạm quy định IATA LAR về thời gian tối thiểu làm thủ tục hải quan và thú y cửa khẩu; backend chặn lỗi. | `CoordinatorService.RoutePlanning.cs` (L195, L209)<br>`RouteTab.tsx` (L28) |
| **33** | `AIR_CARE_UNCONFIRMED` | Chưa xác nhận phương án chăm sóc ngựa trong suốt thời gian bàn giao, chờ tại sân bay và trên máy bay (`airCareConfirmation == null`). | Chặn gửi duyệt phương án hàng không. | `routePlanner.tsx` (L394)<br>`RouteTab.tsx` (L641) |

---

### NHÓM V: LỖI CỔNG THẨM ĐỊNH HAI BÊN & QUẢN LÝ (TWO-PARTY READY & GATE 2)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **34** | `OPERATIONS_NOT_CONFIRMED` | Điều phối viên chưa bấm nút **"Xác nhận nguồn lực (Operations READY)"** trên hệ thống sau khi đã đủ xe, người và tuyến. | Thiếu chữ ký xác nhận của Coordinator; cổng Gate 2 không mở. | `CoordinatorService.Readiness.cs` (L292, L345)<br>`RouteTab.tsx` |
| **35** | `DOCUMENTS_NOT_READY` | **Chuyên viên giấy tờ chưa chốt Docs READY (Flow 2):**<br>- Hồ sơ kiểm dịch xuất nhập cảnh chưa hoàn tất.<br>- Hộ chiếu hoặc sổ tiêm ngừa bị thiếu/từ chối.<br>- Khách hàng chưa nộp đủ giấy tờ bổ sung (`DocumentRequest OPEN`). | Cổng Gate 2 khóa chặt. Không bao giờ được phép khởi hành khi thiếu giấy phép thú y. | `CoordinatorService.Readiness.cs` (L301, L323)<br>`managerRules.ts` (L440) |
| **36** | `INSURANCE_NOT_VERIFIED` | Hợp đồng bảo hiểm vận chuyển hàng hóa đặc biệt cho đàn ngựa chưa được kích hoạt hoặc chưa nộp phí bảo hiểm (`Insurance != 'VERIFIED'`). | Quản lý không được phép duyệt xuất phát theo quy chế tài chính. | `managerRules.ts` (L441)<br>`TripInsurance.cs` |
| **37** | `QUARANTINE_BOOKING_UNCONFIRMED` | Lịch đặt trạm cách ly kiểm dịch động vật tại nước đến chưa được đối tác trạm xác nhận slot đón ngựa (`QuarantineBooking != 'CONFIRMED'`). | Ngựa sẽ bị kẹt tại cửa khẩu không có nơi lưu trú; chặn duyệt khởi hành. | `managerRules.ts` (L442)<br>`QuarantineBooking.cs` |
| **38** | `PLANNED_DEPARTURE_EXPIRED` | **Giờ xuất phát dự kiến đã quá hạn:** Thời gian dự kiến xuất phát trên hợp đồng đã trôi qua so với giờ thực tế của máy chủ (`plannedDepart < Now`). | Lịch trình bị xem là lỗi thời; hệ thống yêu cầu Điều phối viên lập lại mốc giờ mới trước khi duyệt. | `CoordinatorService.Readiness.cs` (L541, L597) |
| **39** | `MANAGER_DEPARTURE_UNAPPROVED` | Chuyến đi chưa được Logistics Manager bấm phê duyệt lệnh xuất phát tại màn hình Quản lý (`DepartureApprovedAt == null`). | Chuyến đi vẫn nằm ở trạng thái `PLANNING`; tổ lái chưa được nhận lệnh xuất phát. | `CoordinatorService.Readiness.cs` (L394)<br>`useManager.ts` (L846) |

---

### NHÓM VI: LỖI HIỆN TRƯỜNG TRƯỚC LĂN BÁNH (FLOW 4 PRE-DEPARTURE GATE)

| STT | Mã lỗi nghiệp vụ / Technical Code | Tình huống vi phạm | Hậu quả & Chốt chặn | File & Dòng Code kiểm soát |
|:---:|:---|:---|:---|:---|
| **40** | `NOT_IN_READY_TO_DEPART` | Tài xế cố gắng bấm xuất phát (`StartTripAsync`) khi chuyến đi chưa được chuyển sang trạng thái `READY_TO_DEPART`. | Hệ thống từ chối ghi nhận mốc hành trình; báo lỗi trạng thái không hợp lệ. | `Flow4DriverService.cs` (L24-L35)<br>`flow3_flow4...test.ts` (L245) |
| **41** | `SAFETY_BLOCKER_ACTIVE` | Chuyến đi đang bị gắn cờ khóa an toàn khẩn cấp (`SafetyBlockerActive = true`) do sự cố phát sinh tại điểm đón hoặc lệnh hoãn từ Quản lý. | Toàn bộ thao tác ghi nhận mốc bị vô hiệu hóa; xe không được phép lăn bánh. | `Flow4DriverService.cs`<br>`Flow5IncidentService.cs` |
| **42** | `MICROCHIP_SCAN_UNVERIFIED` | **Chưa đối soát vi mạch:** Tài xế không quét và đối chiếu đúng mã vi mạch ISO 15 chữ số của từng con ngựa trước khi đưa lên thùng xe. | Chặn xác nhận mốc xuất phát; vi phạm an ninh giao nhận ngựa. | `Flow4DriverService.cs`<br>`flow3_flow4...test.ts` (L224-L242) |
| **43** | `VEHICLE_CHECK_UNCONFIRMED` | Tài xế chưa tích cam kết kiểm tra cơ học xe tải (chốt khóa thùng, hệ thống thông gió, camera giám sát và bồn nước). | Chặn xuất phát; bắt buộc xác nhận an toàn phương tiện (`VEHICLE_VERIFIED`). | `flow3_flow4...test.ts` (L230-L241) |
| **44** | `VET_ASSESSMENT_UNFIT` | **Ngựa không đủ thể trạng:** Bác sĩ thú y khám lâm sàng trước giờ khởi hành và kết luận ngựa bị sốt, đau chân hoặc hoảng loạn (`TransportFitness = 'UNFIT'`). | Lệnh xuất phát bị hủy ngay lập tức; chuyển sang quy trình xử lý y tế khẩn cấp Flow 5. | `Flow4HealthService.cs`<br>`VetAssessment.cs` |

---

## 3. CHECKLIST KIỂM TOÁN NHANH TRƯỚC KHI BẤM "DUYỆT KHỞI HÀNH" (GATE 2)

Dành cho **Logistics Manager** trước khi ký duyệt lệnh xuất phát trên màn hình quản trị:

- [ ] **Lộ trình:** Đã có chữ ký duyệt của Manager (`RouteStatus = APPROVED`), không còn cảnh báo lái xe liên tục quá 4h, không cắt biên giới trái phép.
- [ ] **Nguồn lực (Ops):** Điều phối viên đã bấm "Xác nhận nguồn lực" (`OperationsStatus = READY`), xe tải đủ ngăn, kíp lái đủ 3 người độc lập (Lái chính, Phụ lái, Bác sĩ thú y) không bị trùng lịch.
- [ ] **Pháp lý (Docs):** Chuyên viên kiểm dịch đã bấm "Xác nhận hồ sơ" (`DocumentsStatus = READY`), giấy kiểm dịch còn hạn sau ngày đến dự kiến (`DocumentExpiryDate >= ETA`).
- [ ] **Bảo hiểm:** Đã đối soát thanh toán và xác minh gói bảo hiểm vận chuyển hợp lệ.
- [ ] **Hàng không (nếu có chặng bay):** Đã duyệt ngân sách bay, đã có mã vé và chỗ chuồng xác nhận (`BOOKED`), thời gian xe đến ga hàng hóa trước giờ bay từ 4 đến 6 tiếng.
- [ ] **Phiên bản:** Không có yêu cầu sửa đổi kế hoạch dở dang (`OpenChange = false`).

---
*Tài liệu được trích xuất tự động từ quy tắc nghiệp vụ và mã nguồn dự án Racehorse Transport System.*
