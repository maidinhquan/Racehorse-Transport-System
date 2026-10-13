# FLOW 03 – API CONTRACT v1.2: Lộ trình, phương tiện, nhân sự và Operations READY

> **Dự án:** SWP391 – Cross-Border Racehorse Transport System (CBN Transport).  
> **Phạm vi demo:** Chỉ `VN → VN` và `VN → JP`; không phục vụ `JP → VN`, `VN → TH`, hoặc quá cảnh qua quốc gia thứ ba trong bản demo.  
> **Vai trò chính:** `FLEET_COORDINATOR`; phê duyệt bởi `LOGISTICS_MANAGER`; phối hợp `TRANSPORT_SPECIALIST`, `DRIVER`, `ESCORT` (bao gồm người được phân công vị trí `VETERINARIAN`), `CUSTOMER`.  
> **UC:** `UC-FRC-01`, `UC-FRC-02`, `UC-FRC-03`, `UC-LM-04`; tham chiếu Flow 2 (checklist), Flow 4 (vận hành), Flow 5 (sự cố).  
> **Nguồn đối chiếu:** `00-conventions.md`, `01-shared-api.md`, `04-manager-api.md`, tài liệu Coordinator hiện lưu `Markdown đã dán (3).md`, Flow 1 v2.3, `flow-02-legal-quarantine-customs-api.md`.  
> **Tính chất:** Hợp đồng API thiết kế cho FE/BE; không khẳng định endpoint đã implement. Các API được ghi `[BỔ SUNG]` là phần còn thiếu của bộ Role API và cần đồng bộ trước triển khai.  
> **Route prefix:** Tất cả đường dẫn trong file là đường dẫn **sau** `/api`. Không tạo namespace `/flow3/*`.  
> **Lưu ý:** Ví dụ ngày, xe, bảng giá, thời gian, chuyến bay và tọa độ chỉ là minh họa; không phải cam kết lịch vận hành hay quy tắc pháp lý.

---

## 1. Mục đích, đầu vào, đầu ra và ranh giới Flow 3

Flow 3 tiếp nhận một Trip đã được kích hoạt ở Flow 1 và được Manager xác nhận deployment, để Coordinator lập lộ trình vận hành chi tiết theo chặng; lựa chọn phương tiện, lái xe, người chăm sóc, bác sĩ thú y; ghi nhận dịch vụ bay thuê ngoài nếu có; quản lý tình trạng sẵn sàng của đội xe; phối hợp với Specialist để hoàn thiện checklist pháp lý; gửi tuyến để Manager phê duyệt và xác nhận hoàn tất phần điều phối bằng `Operations READY`. Hồ sơ chuyên môn và bảo hiểm thực tế do Specialist quản lý tại Flow 2.

**Điểm bắt đầu:** `RequestStatus = ACTIVATED`, `ContractStatus = EFFECTIVE`, `TripStatus = PLANNING`, `deploymentStatus = CONFIRMED`. Bất kỳ Trip `ON_HOLD` không được coi là đã được phép triển khai tiếp. Không có Trip thì không có Route Version vận hành.

**Điểm kết thúc thành công:** Route Version hiện hành được Manager `APPROVED`; Coordinator xác nhận `Operations READY`, Specialist xác nhận `Documents READY` (bao gồm chứng từ bảo hiểm đã được kiểm tra ở Flow 2), Route Version hiện hành được Manager phê duyệt và Backend kiểm tra lại mọi điều kiện; `TripStatus` chuyển từ `PLANNING` sang `READY_TO_DEPART` khi các điều kiện cùng đạt. Route được bàn giao cho Flow 4 dưới dạng polyline + marker + lịch mốc dự kiến, **không phát GPS**.

**Không thuộc Flow 3:** Quotation/Pricing/Payment (Flow 1), phê duyệt hồ sơ y tế và clearance của cơ quan chức năng (Flow 2), cập nhật đến/rời điểm và ETA phát sinh khi đang vận chuyển (Flow 4), thay đổi tuyến sau khởi hành vì sự cố (Flow 5). Không cung cấp chức năng đặt máy bay trực tiếp trên website hãng bay.

### 1.1. Luồng nghiệp vụ chính thức

```text
Request ACTIVATED + Contract EFFECTIVE + Trip PLANNING
    ↓ Manager CONFIRMS deployment (Flow 1)
    ├──────────────────────────────────────────────────┐
    ↓                                                  ↓
COORDINATOR – FLOW 3                            SPECIALIST – FLOW 2
- Soạn Route Version                             - Rà checklist FINAL theo Route Version
- Phân xe và tài xế theo từng ROAD leg VN/JP      - Chuẩn bị/xác minh hồ sơ y tế/pháp lý
- Phân người chăm sóc, bác sĩ thú y              - Công ty mua bảo hiểm ngoài hệ thống
- Đặt dịch vụ AIR + gán nhân sự đi kèm            - Lưu và xác minh policy thực tế
- Kiểm tra lịch, phương tiện, nhân sự             - Xác nhận DOCUMENTS READY
- Xác nhận OPERATIONS READY                       ↓
    ↓                                                  ↓
    └────────────────┬─────────────────────────────────┘
                     ↓
     MANAGER phê duyệt Route Version hiện hành
     (có thể xử lý song song, không phải chờ hai bên OK)
                     ↓
   Backend recheck Route APPROVED + Operations READY
       + Documents READY + điều kiện Flow 1 còn hiệu lực
       ├─ Thiếu/sai/version thay đổi → Trip PLANNING
       └─ Đủ → Trip READY_TO_DEPART
                     ↓
   Driver/Escort ghi milestone khởi hành thực tế (Flow 4)
                     ↓
                Trip IN_TRANSIT
```

- Hai nhóm chuẩn bị **có thể diễn ra song song**. Không bắt Specialist chờ Coordinator xác nhận xong hoặc ngược lại.
- `Operations READY` và `Documents READY` là **hai kết quả xác nhận theo nghiệp vụ và snapshot** của hai nhóm, không là giá trị mới của `TripStatus`.
- Manager phê duyệt Route là điều kiện thứ ba độc lập; không bắt Manager xác nhận lại chứng từ bảo hiểm mà Specialist đã kiểm tra.
- Chuyển `READY_TO_DEPART` chỉ có nghĩa đủ điều kiện chuẩn bị; **không tự xác nhận xe đã chạy**.

### 1.2. Phân công trách nhiệm

| Actor | Quyền / trách nhiệm trong Flow 3 |
|---|---|
| `FLEET_COORDINATOR` | Lập/chỉnh/gửi duyệt Route Version; quản lý xe/lịch xe; kiểm tra nhân sự/chứng chỉ; **chọn và phân công** xe, tài xế, bác sĩ thú y, ngựa/stall cho từng chặng ROAD tại cả VN và JP; ghi booking AIR; kiểm tra điều kiện vận hành và **xác nhận Operations READY**. Không upload, mua, duyệt hoặc đánh giá chứng từ bảo hiểm. |
| `LOGISTICS_MANAGER` | Phê duyệt/trả Route Version; quyết định phương án/ngân sách thuê bay; giám sát tình trạng chuẩn bị qua read-only readiness. Chi phí bảo hiểm nằm trong giá dịch vụ Flow 1; không phải phê duyệt policy lần hai. |
| `TRANSPORT_SPECIALIST` | Flow 2: quản lý checklist pháp lý, kiểm dịch, thông quan, **lưu và xác minh chứng từ bảo hiểm do công ty mua ngoài hệ thống**, xác nhận `Documents READY` khi toàn bộ nghĩa vụ hồ sơ đến hạn trước khởi hành đã đạt. Không phê duyệt Route. |
| `DRIVER`, `ESCORT` | Đọc phân công đã chốt, chuẩn bị nhiệm vụ; thực tế khởi hành, đến/rời điểm ghi bằng milestone thủ công ở Flow 4. Bác sĩ thú y là vị trí `VETERINARIAN` của account role `ESCORT`, không có auth role riêng. |
| `CUSTOMER` | Xem kế hoạch/trạng thái được phép công bố; không sửa route, xe, nhân sự hoặc booking. Không tự mua/đăng tải policy bảo hiểm theo quy trình demo. |

**Giả định nguồn lực:** demo có sẵn phương tiện và nhân sự đủ điều kiện tại VN và JP; **không** suy ra rằng hệ thống đã tự phân công. Mọi leg ROAD vẫn phải có assignment được Coordinator lựa chọn và lưu. Trạng thái AVAILABLE chỉ là điều kiện để chọn, không phải Operations READY.

---


---

## 2. Business Rules và invariants

| Mã | Quy tắc bắt buộc |
|---|---|
| `F03-BR-01` | Flow 3 chỉ nhận Trip thuộc Request đã `ACTIVATED`, Contract `EFFECTIVE`, deployment `CONFIRMED`; BE recheck khi ghi. |
| `F03-BR-02` | Demo chỉ `VN→VN` và `VN→JP`; route không qua/đến nước thứ ba; mode theo tuyến do BE cấu hình, FE không đoán. |
| `F03-BR-03` | Route Version có `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RETURNED` đúng conventions. Không sửa tại chỗ bản đã gửi/được duyệt. |
| `F03-BR-04` | Coordinator soạn và submit; chỉ Manager approve/return phiên bản Route hiện hành. Return bắt buộc lý do; bản sửa giữ lịch sử. |
| `F03-BR-05` | Điểm tuyến có thứ tự, kiểu hợp lệ; chặng nối liên tục; chặng ROAD theo đường bộ, chặng AIR hai đầu tại sân bay; số chuyến AIR được cấu hình hợp lệ. |
| `F03-BR-06` | Demo đường bay quốc tế VN→JP chỉ **trực tiếp**, do hãng/bên thứ ba vận hành; không coi phương tiện `AIR` là xe trong fleet nội bộ. |
| `F03-BR-07` | Coordinator ghi nhận lịch bay và xác nhận booking thủ công theo chứng từ; không giả lập API cấp vé/đặt chỗ của hãng bay. |
| `F03-BR-08` | Manager phê duyệt phương án/ngân sách thuê dịch vụ bay trước khi Coordinator xác nhận đặt dịch vụ. |
| `F03-BR-09` | Chặng ROAD do công ty bố trí phải có tài xế chính `MAIN_DRIVER`, tài xế phụ `CO_DRIVER`, và bác sĩ `VETERINARIAN` độc lập theo conventions; account `ESCORT` có chứng chỉ hợp lệ khi làm vet. |
| `F03-BR-10` | Chặng AIR có nhân sự `VETERINARIAN` đi theo ngựa theo điều kiện được xác nhận của hãng bay; không tạo account role `VETERINARIAN`. |
| `F03-BR-11` | Một người không được đếm thành hai vị trí bắt buộc độc lập trong cùng chặng; không tự nhân bản cùng `userId` để qua validate. |
| `F03-BR-12` | Xe phải `READY`, giấy đăng kiểm còn hiệu lực trong phạm vi chặng, đủ stall/tải trọng, không trùng lịch và không ở giai đoạn bảo dưỡng. |
| `F03-BR-13` | Tất cả Horse có trong Trip được phân vào vị trí vận chuyển phù hợp đúng chặng, không trùng stall và không vượt sức chứa. |
| `F03-BR-14` | Nhân sự phải có quyền/điều kiện chuyên môn phù hợp, không trùng lịch chặng khác, bằng lái/chứng chỉ còn hạn khi tác nghiệp. |
| `F03-BR-15` | Dịch vụ tính tuyến cung cấp quãng đường, thời gian, ETA và polyline nếu có; trường hợp thất bại có thể nhập giá trị thủ công theo kiểm soát BE, phải ghi nguồn và audit; không dựng GPS hiện tại. |
| `F03-BR-16` | Thời gian lái liên tục, nghỉ ngơi và thời gian dừng theo **cấu hình vận hành**; không tự chốt số giờ/phút từ ví dụ cũ. |
| `F03-BR-17` | Nếu ETA dự kiến vượt hạn giao, hiển thị cảnh báo và bắt buộc có `deadlineJustification` khi submit; không tự thay hợp đồng/hạn giao. |
| `F03-BR-18` | Khi route/mode/checkpoint/ETA đổi, Specialist phải re-evaluate checklist; không xóa lịch sử checklist/route cũ. |
| `F03-BR-19` | Checklist `PRELIMINARY` không thay `FINAL` theo Route Version; `CHECKLIST_READY` đòi điều kiện Flow 2 thực sự đạt. |
| `F03-BR-20` | Hồ sơ bảo hiểm bắt buộc do công ty thu xếp ngoài hệ thống và `TRANSPORT_SPECIALIST` xác minh tại Flow 2. Flow 3 **chỉ đọc** kết quả `INSURANCE_VERIFIED` từ Flow 2 khi tổng hợp readiness; Coordinator không kiểm tra chứng từ bảo hiểm. |
| `F03-BR-21` | Chi phí bảo hiểm đã nằm trong giá dịch vụ/Contract do Manager chuẩn bị tại Flow 1, nhưng **chỉ policy thực tế** do Specialist kiểm tra mới đạt `INSURANCE_VERIFIED`; phí trong hợp đồng không phải bằng chứng bảo hiểm. Không xử lý mua hay bồi thường bảo hiểm trong Flow 3. |
| `F03-BR-22` | Readiness tổng hợp yêu cầu **hai xác nhận độc lập**: Coordinator `Operations READY` và Specialist `Documents READY`, thêm Route hiện hành được Manager `APPROVED`, Flow 1/deployment hợp lệ và Backend revalidate tất cả dữ liệu. FE không có API tự set `READY_TO_DEPART`. |
| `F03-BR-23` | Sau khi `READY_TO_DEPART`, nếu mất điều kiện **trước khởi hành**, Backend đưa về `PLANNING` với audit/notification; sau `IN_TRANSIT` không tự lùi `PLANNING`. |
| `F03-BR-24` | `originalApprovedEta` gắn thời điểm ETA của lần duyệt Route đầu tiên, giữ nguyên cho KPI; không ghi đè khi sửa Route/ETA. |
| `F03-BR-25` | Sau khi khởi hành, mọi điều chỉnh tuyến/xe/nhân sự đột xuất phải đi qua Flow 5, không sửa Route Version đã duyệt bằng PUT thường. |
| `F03-BR-26` | SignalR thông báo sự kiện sau DB commit, REST là nguồn sự thật; FE tải lại thông tin và `allowedActions`. |
| `F03-BR-27` | BE kiểm tra phân quyền, deployment/trip status và optimistic concurrency; không tin field FE để đặt actor/approvedAt/isReady. |
| `F03-BR-28` | Không có GPS polling hay lưu `lastPosition` để suy diễn vị trí. Map kế hoạch vẽ polyline + marker từ Route đã lưu; Flow 4 cập nhật mốc đến/rời thủ công. |
| `F03-BR-29` | Giả định nguồn lực đường bộ và nhân sự đáp ứng tuyến demo VN→VN, VN→JP đã có trong danh mục quản lý, **nhưng Coordinator phải chủ động chọn và phân công xe/người cho từng ROAD leg tại VN hoặc JP**. Chỉ AIR leg sử dụng booking dịch vụ hàng không bên thứ ba; có nguồn lực không có nghĩa đã hoàn tất assignment. |
| `F03-BR-30` | Khi Route/Assignments/flight/xe/người thay đổi ảnh hưởng điều phối, `Operations READY` của snapshot cũ không còn hiệu lực; khi checklist/giấy tờ/bảo hiểm thay đổi ảnh hưởng chuyên môn, `Documents READY` của snapshot cũ không còn hiệu lực. Backend cập nhật readiness, audit, thông báo; người chịu trách nhiệm xác nhận lại sau khi khắc phục. |

| `F03-BR-31` | Mỗi confirmation lưu `tripId`, `routeVersionId`, version dữ liệu nguồn, người xác nhận, thời điểm và kiểm tra bằng Backend; không chấp nhận cờ `ready=true` từ FE để vượt validation. |
| `F03-BR-32` | `Operations READY` **không bao gồm bảo hiểm hoặc hồ sơ**. `Documents READY` thuộc Specialist và phải bao gồm bảo hiểm phù hợp, nhưng không thay thế kiểm tra lại tài liệu ở thời điểm khởi hành. |
| `F03-BR-33` | Thao tác xác nhận lặp với cùng snapshot không tạo hai quyết định/trip; snapshot stale hoặc quá trình khởi hành đã bắt đầu phải trả xung đột phù hợp. |
| `F03-BR-34` | Flight booking có `bookingVersion`/ETag và optimistic concurrency khi tạo/sửa; Coordinator confirm Operations lưu cả ID **và version** của booking. Chỉ giữ confirmation nếu phiên bản và nội dung vận hành còn hợp lệ. |
| `F03-BR-35` | Manager Hold Deployment trước milestone khởi hành làm readiness tổng mất hiệu lực; khi Trip đã READY_TO_DEPART phải re-evaluate về PLANNING. Không thực hiện Flow 1 Hold/Resume để rollback `IN_TRANSIT`; xử lý Flow 4/5. |

### 2.1. Không thêm Business Rule chưa chốt

- `MaxContinuousDriveHours`, thời lượng nghỉ tối thiểu, buffer ETA, capacity, lead time cho đặt vé và lịch bảo dưỡng đều là giá trị **cấu hình/chính sách vận hành**, không cố định 6 giờ hoặc 30 phút vì có ví dụ cũ.
- Không tự đặt hãng bay, nhà cung cấp, giá vận chuyển, tuyến JP nội địa, phương án nhận ngựa tại điểm cuối nếu hợp đồng không có.
- Trạng thái booking nội bộ nếu bổ sung không được tùy tiện thêm `TripStatus` hay `RouteStatus` toàn hệ thống.

---

## 3. Quy ước API, enums và dữ liệu chung

**Base:** `/api`; **JWT Bearer**; `Content-Type: application/json` với JSON; upload chứng từ theo `multipart/form-data`, phần `payload` JSON string + `files` như `00-conventions.md`; FE không tự set multipart boundary. Timestamp dùng ISO 8601 kèm timezone (thông thường UTC `Z`); date-only `YYYY-MM-DD`; lat/lng là số có độ chính xác phù hợp nguồn geocoding.

**200/201 JSON:**

```json
{ "success": true, "message": "OK", "data": {} }
```

**4xx/5xx JSON:**

```json
{
  "success": false,
  "message": "Requested resource conflicts with another trip",
  "errorCode": "RESOURCE_SCHEDULE_CONFLICT",
  "data": null
}
```

`errors: [{field,message}]` chỉ khi validation từng trường. Danh sách phân trang dùng `data: {items,page,pageSize,totalItems,totalPages}`. Lỗi ownership private → `404 NOT_FOUND`; sai role → `403 FORBIDDEN_ROLE`; trạng thái/version bất hợp lệ → `409`.

| Enum chuẩn | Giá trị |
|---|---|
| `RequestStatus` | `ACTIVATED` là trạng thái Request cần khi tạo kế hoạch Trip; không dùng làm trạng thái lộ trình. |
| `TripStatus` | `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT`, `COMPLETED` |
| `RouteStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RETURNED` |
| `TransportMode` | `ROAD`, `AIR` |
| `RoutePointType` | `ORIGIN`, `REST_STOP`, `FUEL_STOP`, `CHECKPOINT`, `AIRPORT`, `QUARANTINE_STATION`, `DESTINATION` |
| `VehicleStatus` | `READY`, `MAINTENANCE`, `INACTIVE` |
| `AssignmentRole` | `MAIN_DRIVER`, `CO_DRIVER`, `ESCORT`, `VETERINARIAN` |
| `InsuranceVerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED` |
| `ChecklistStatus` | `NOT_READY`, `READY` |

**Readiness confirmations (không thêm enum toàn cục):** `operationsReadiness.confirmed` (Coordinator), `documentsReadiness.confirmed` (Specialist). `ready` là kết quả **Backend evaluate**; `confirmed` là hành động xác nhận của người phụ trách cho đúng snapshot. Cả hai phải đúng và còn hiệu lực; không gộp chúng thành `TripStatus`.

**Metadata Flow 3 (không là enum toàn cục):** `deploymentStatus` (`PENDING_CONFIRMATION`, `CONFIRMED`, `ON_HOLD`); `stage` của planning là nhãn FE/BE tính toán (`NEED_ROUTE`, `ROUTE_DRAFT`, `ROUTE_RETURNED`, `ROUTE_PENDING`, `NEED_ASSIGNMENT`, `READY`). Booking bên thứ ba có lifecycle riêng không làm thay RouteStatus.

### 3.1. Concurrency

- Route Create: chỉ một Route Version `DRAFT` hiện hành/trip được sửa bởi Coordinator; idempotency chống POST lặp.
- Route Update/Submit: bắt buộc `expectedVersion` hoặc cơ chế concurrency tương đương (ETag/rowversion) để ngăn hai màn hình ghi đè.
- Manager Approve/Return: routeVersionId phải là version hiện hành `PENDING_APPROVAL` và có expectedVersion; lần phê duyệt hai không tạo hai quyết định.
- Assignments Update: kiểm tra lịch xe/lịch người/tải trọng **tại transaction commit**, không chỉ dựa trên `validate` trước đó.

---

## 4. Page → API Matrix và danh sách module

| Role/Page | Chức năng | Endpoint |
|---|---|---|
| Coordinator `/coordinator/dashboard` | Tổng quan tuyến, xe, cảnh báo | `GET /coordinator/dashboard` |
| Coordinator `/coordinator/planning` | Trip chờ lập kế hoạch | `GET /coordinator/planning-trips` |
| Coordinator `/coordinator/trips/:id` | Trip Detail | `GET /coordinator/trips/{tripId}` |
| Coordinator `/coordinator/trips/:id/route` | Xem/tính/soạn/gửi Route | `GET /coordinator/checkpoints`, `POST /coordinator/routes/calculate`, `GET/POST /coordinator/trips/{tripId}/routes`, `GET/PUT /coordinator/routes/{routeVersionId}`, `POST /coordinator/routes/{routeVersionId}/submit` |
| Coordinator `/coordinator/vehicles` | Quản lý xe | `GET/POST /coordinator/vehicles` |
| Coordinator `/coordinator/vehicles/:id` | Xe, bảo dưỡng, lịch | `GET/PUT /coordinator/vehicles/{vehicleId}`, `PATCH .../status`, `GET .../schedule` |
| Coordinator `/coordinator/trips/:id/assignments` | Xe/người/ngựa theo chặng | `GET /coordinator/vehicles/available`, `GET /coordinator/staff`, `GET /coordinator/staff/{userId}/schedule`, `GET/PUT /coordinator/trips/{tripId}/assignments`, `POST .../assignments/validate` |
| Coordinator `/coordinator/trips/:id/flight` | Dịch vụ bay thuê ngoài | `GET/PUT /coordinator/trips/{tripId}/flight-booking` **[BỔ SUNG]** |
| Coordinator `/coordinator/trips/:id/operations` | Xem điều kiện vận hành, xác nhận phần Coordinator | `GET /coordinator/trips/{tripId}/operations-readiness`, `POST /coordinator/trips/{tripId}/operations-readiness/confirm` **[BỔ SUNG]** |
| Manager `/manager/planning` | Danh sách kế hoạch chờ duyệt | `GET /manager/planning` |
| Manager `/manager/trips/:id/route` | Xem và duyệt/trả tuyến | `GET /manager/trips/{tripId}/route`, `POST /manager/trips/{tripId}/routes/{routeVersionId}/approve`, `POST .../return` |
| Manager `/manager/trips/:id/insurance` | Chỉ xem policy và tình trạng Specialist xác minh | `GET /manager/trips/{tripId}/insurance` (read-only, tham chiếu Flow 2) |
| Manager `/manager/trips/:id` | Điều kiện khởi hành | `GET /manager/trips/{tripId}/departure-conditions` |
| Specialist `/specialist/trips/:id/checklist` | Checklist và tài liệu/bảo hiểm | Flow 2 `GET /specialist/trips/{tripId}/checklist`, quản lý insurance và xác nhận `Documents READY` (API thuộc Flow 2) |
| Driver/Escort assigned trip | Đọc phân công đã chốt | `GET /driver/trips`, `GET /driver/trips/{tripId}` (role contract, xem Flow 4) |

**Thứ tự triển khai gợi ý:** Read-only Trip → Route Calculation & Versions → Vehicle CRUD/Schedules → Staff/Assignments → Air booking → Manager route approval → Coordinator Operations confirmation + Specialist Documents confirmation → Readiness engine → SignalR/tests. Đây là ưu tiên kỹ thuật, không bắt buộc trình tự nghiệp vụ cứng; các tác vụ chuẩn bị có thể chạy song song.

---

## 5. Coordinator – Dashboard và Planning Queue

### F03-C01. `GET /coordinator/dashboard`

**Role:** `FLEET_COORDINATOR`.

**200 data:**

```json
{
  "planning": {"needRoute": 2, "routeReturned": 1, "routePendingApproval": 1, "needAssignment": 2, "needReassignment": 0},
  "departures": [{"tripId": 9, "tripCode": "TRP-20261120-0003", "plannedDepartureAt": "2026-11-20T01:00:00Z", "status": "PLANNING", "missing": ["CHECKLIST_READY", "ROUTE_APPROVED"]}],
  "fleet": {"ready": 6, "maintenance": 1, "inactive": 1, "registrationExpiringIn30Days": 1, "busyToday": 3},
  "incidents": {"new": 0, "inProgress": 0},
  "alerts": [{"type": "STALL_CAPACITY_CHANGED", "title": "Sức chứa xe thay đổi, cần phân công lại", "tripId": 9}]
}
```

- Các đếm số dựa scope Coordinator và dữ liệu hiện tại; không giả lập GPS/signal lost.
- `departures[].missing` lấy từ Readiness Engine, không tự tính ở FE.
- `alerts` chỉ cảnh báo hành động cần làm, không đồng nghĩa Incident đã được tạo.

### F03-C02. `GET /coordinator/planning-trips`

**Query:** `stage` tùy chọn; `departureBefore` ISO date; `page`, `pageSize`; `sort` nếu có. Trả phân trang theo `00-conventions.md`.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [{
      "tripId": 9, "tripCode": "TRP-20261120-0003", "requestId": 15,
      "originCountry": "VN", "destinationCountry": "JP", "horseCount": 2,
      "tripStatus": "PLANNING", "deploymentStatus": "CONFIRMED",
      "plannedDepartureAt": "2026-11-20T01:00:00Z",
      "stage": "NEED_ROUTE", "routeStatus": null,
      "assignmentComplete": false, "missingConditions": ["ROUTE_APPROVED", "CHECKLIST_READY"]
    }],
    "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

- Trip `ON_HOLD` có thể hiện để đọc nhưng `allowedActions` không cho chỉnh/sent planning khi bị giữ; BE kiểm tra lại.
- Không lọc Trips của Customer khác bằng cách tin ownerId do FE cung cấp; role Manager/Coordinator theo quyền nghiệp vụ.

### F03-C03. `GET /coordinator/trips/{tripId}`

**200 data:**

```json
{
  "tripId": 9,
  "requestId": 15,
  "tripCode": "TRP-20261120-0003",
  "status": "PLANNING",
  "deploymentStatus": "CONFIRMED",
  "customer": {"customerId": 100, "displayName": "Saigon Racing Club"},
  "origin": {"country": "VN", "city": "Ho Chi Minh City", "address": "Điểm đón theo Request"},
  "destination": {"country": "JP", "city": "Tokyo", "address": "Điểm giao theo Request"},
  "deliveryDeadline": "2026-11-22T09:00:00Z",
  "preliminaryPlan": {"planId": 30, "transportMode": "AIR", "stallsRequired": 2, "plannedDepartureAt": "2026-11-20T01:00:00Z"},
  "horses": [{"horseId": 31, "name": "Thunder Bolt", "microchipId": "985141000123456", "specialRequirements": "Không dùng cỏ linh lăng"}],
  "currentRoute": null,
  "assignmentSummary": {"complete": false, "missing": ["ROUTE_REQUIRED"]},
  "checklist": {"stage": "PRELIMINARY", "status": "NOT_READY"},
  "documentsReadiness": {"ready": false, "confirmed": false, "source": "FLOW_2", "blockingConditions": ["INSURANCE_VERIFIED"]},
  "operationsReadiness": {"ready": false, "confirmed": false, "blockingConditions": ["ROUTE_REQUIRED", "STAFF_ASSIGNED"]},
  "departureConditions": {"allMet": false, "missingConditions": ["ROUTE_APPROVED", "OPERATIONS_CONFIRMED", "DOCUMENTS_CONFIRMED"]},
  "allowedActions": ["CREATE_ROUTE", "VIEW_ASSIGNMENTS"]
}
```

Errors: `404 NOT_FOUND`, `403 FORBIDDEN_ROLE`; `409 DEPLOYMENT_NOT_CONFIRMED` cho thao tác ghi, không nhất thiết cho xem.

---

## 6. Route model – điểm, chặng, version, ETA và bản đồ

### 6.1. RouteVersion (shared read model)

```json
{
  "routeVersionId": 120, "tripId": 9, "version": 3, "status": "PENDING_APPROVAL",
  "source": "PLANNING", "createdBy": 20,
  "plannedDepartureAt": "2026-11-20T01:00:00Z",
  "deliveryDeadline": "2026-11-22T09:00:00Z",
  "points": [
    {"pointId": 1, "sequence": 1, "type": "ORIGIN", "name": "Điểm đón Việt Nam", "country": "VN", "lat": 10.8, "lng": 106.7, "plannedStopMinutes": 0},
    {"pointId": 2, "sequence": 2, "type": "AIRPORT", "checkpointId": 101, "name": "Sân bay xuất phát", "country": "VN", "plannedStopMinutes": 120},
    {"pointId": 3, "sequence": 3, "type": "AIRPORT", "checkpointId": 201, "name": "Sân bay đến", "country": "JP", "plannedStopMinutes": 120},
    {"pointId": 4, "sequence": 4, "type": "DESTINATION", "name": "Điểm bàn giao Nhật Bản", "country": "JP", "lat": 35.6, "lng": 139.7, "plannedStopMinutes": 0}
  ],
  "legs": [
    {"legId": 51, "fromSequence": 1, "toSequence": 2, "mode": "ROAD", "distanceKm": 30, "durationMinutes": 80, "distanceSource": "MAP_SERVICE", "path": [[10.8,106.7],[10.9,106.8]]},
    {"legId": 52, "fromSequence": 2, "toSequence": 3, "mode": "AIR", "distanceKm": null, "durationMinutes": 360, "distanceSource": "FLIGHT_SCHEDULE", "path": null},
    {"legId": 53, "fromSequence": 3, "toSequence": 4, "mode": "ROAD", "distanceKm": 40, "durationMinutes": 90, "distanceSource": "MAP_SERVICE", "path": [[35.6,139.7],[35.7,139.8]]}
  ],
  "etaDestination": "2026-11-21T08:00:00Z",
  "totals": {"roadDistanceKm": 70, "elapsedMinutes": 1860},
  "deadlineCheck": {"meetsDeadline": true, "requiresJustification": false},
  "plannedPath": {"roadLegs": [51,53], "airLegs": [52]},
  "submittedAt": "2026-11-10T07:00:00Z",
  "approvedAt": null,
  "returnReason": null,
  "allowedActions": ["VIEW"]
}
```

`pointId` và `legId` trong GET là ID đã lưu; trong POST/PUT để tạo bản draft dùng `sequence` và `fromSequence/toSequence`. Tọa độ ví dụ không phải route đo thực tế. `plannedPath` không phải last-known vehicle position. Polyline từng chặng ROAD là dữ liệu hình học kế hoạch; FE không di chuyển marker xe dựa trên thời gian khi không có milestone.

### 6.2. Route Point – cấu trúc dữ liệu

| Field | Kiểu | Quy tắc |
|---|---|---|
| `sequence` | int | Dãy nguyên bắt đầu 1, tăng liên tục và không lặp |
| `type` | `RoutePointType` | `ORIGIN/DESTINATION/...` từ conventions |
| `name` | string | Bắt buộc với điểm nhập tay, không trống |
| `address` | string/null | Địa chỉ hiển thị; điểm thực tế phải có thông tin định vị đủ dùng |
| `lat`,`lng` | decimal/null | Khi map geocode khả dụng; nếu checkpoint catalog có tọa độ thì lấy từ catalog |
| `checkpointId` | int/null | Bắt buộc khi `CHECKPOINT`, `AIRPORT`, `QUARANTINE_STATION` tham chiếu danh mục |
| `country` | ISO code | BE xác định từ catalog/hồ sơ tuyến, không tin FE để tạo tuyến VN→TH |
| `plannedStopMinutes` | int | >=0; yêu cầu nghỉ theo cấu hình |
| `plannedArrivalAt`,`plannedDepartureAt` | timestamp/null | Calculated/planned; không phải milestone đã xảy ra |

**Validation cấu trúc:** `ORIGIN` đầu, `DESTINATION` cuối, không có hai điểm cùng sequence; legs nối điểm liền kề; nếu có chặng `AIR` thì hai đầu phải là `AIRPORT`; checkpoint pháp lý lấy từ Catalog do Specialist quản lý; không nhập tay checkpoint giả.

### 6.3. Route Leg

| Field | Kiểu | Quy tắc |
|---|---|---|
| `fromSequence`, `toSequence` | int | Liền kề theo points (không bỏ chặng) |
| `mode` | `ROAD` hoặc `AIR` | Phải khả dụng theo tuyến |
| `manualDistanceKm` | decimal/null | Chỉ dùng khi dịch vụ bản đồ không trả kết quả phù hợp và được phép nhập tay |
| `manualDurationMinutes` | int/null | Tương tự, phải >0 khi nhập |
| `flight` | object/null | Chỉ với AIR; mã, lịch, sân bay, tài liệu xác nhận nếu có |
| `distanceKm`,`durationMinutes` | number/null | BE trả dự kiến; không là số thực tế của trip |
| `distanceSource` | string | `MAP_SERVICE`, `MANUAL`, `FLIGHT_SCHEDULE`, `UNAVAILABLE` – metadata, không là enum toàn cục |
| `path` | array/null | Polyline ROAD theo thứ tự `[lat,lng]`; AIR null và FE vẽ chặng bay theo thiết kế |

### 6.4. Ranh giới địa lý

- `VN→VN`: các địa điểm/cửa khẩu không vượt khỏi VN; Route có thể gồm nhiều ROAD legs, điểm dừng/phúc lợi ngựa do vận hành lựa chọn.
- `VN→JP`: từ điểm đón VN → chặng ROAD đến sân bay VN → AIR **bay thẳng** đến sân bay JP → chặng ROAD giao ngựa tại JP nếu địa điểm bàn giao nằm ngoài sân bay. **Coordinator phải phân công phương tiện và nhân sự riêng cho cả chặng ROAD tại VN và chặng ROAD tại JP**, lấy từ danh mục nguồn lực có thể điều phối. Giả định nguồn lực sẵn có, nhưng phải kiểm tra lịch, sức chứa, bằng lái/chứng chỉ, địa bàn vận hành và hoàn tất assignment; không dùng xe đăng ký VN tại JP nếu không đủ điều kiện pháp lý.
- Không được tái sử dụng mẫu Route KH/TH của tài liệu Coordinator cũ trong demo.

---

## 7. Coordinator – Catalog checkpoint và Route Calculate

### F03-C04. `GET /coordinator/checkpoints`

**Role:** `FLEET_COORDINATOR`; **query** `country=VN|JP`, `type=AIRPORT|QUARANTINE_STATION|LAND_BORDER`, `q`, `page`, `pageSize` tùy danh mục. Dùng **cùng nguồn** checkpoint catalog do Specialist quản lý trong Flow 2 (`F02-S25`); không có database checkpoint riêng cho Coordinator.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [{"checkpointId": 101, "name": "Sân bay xuất phát", "country": "VN", "type": "AIRPORT", "lat": 10.8, "lng": 106.6, "active": true}],
    "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

BE trả các checkpoint thực tế đang áp dụng theo route, không bắt nhập `LAND_BORDER` vào VN→JP nếu dùng AIR; không giả lập thủ tục cảng cạn. Danh mục checkpoint không đồng nghĩa mọi điểm đều phát sinh nghĩa vụ kiểm dịch.

### F03-C05. `POST /coordinator/routes/calculate`

**Không lưu Route**; dùng khi Coordinator thao tác bản đồ, reorder marker và khi thay đổi chặng/flight. Có thể debounce ở FE nhưng không đặt tần suất gọi cố định. `tripId` bắt buộc; BE kiểm tra quyền và trip. Body theo `RouteDraftPayload`.

```json
{
  "tripId": 9,
  "plannedDepartureAt": "2026-11-20T01:00:00Z",
  "points": [
    {"sequence":1,"type":"ORIGIN","name":"Điểm đón tại VN","lat":10.8,"lng":106.7,"plannedStopMinutes":0},
    {"sequence":2,"type":"AIRPORT","checkpointId":101,"plannedStopMinutes":120},
    {"sequence":3,"type":"AIRPORT","checkpointId":201,"plannedStopMinutes":120},
    {"sequence":4,"type":"DESTINATION","name":"Địa điểm giao JP","lat":35.6,"lng":139.7,"plannedStopMinutes":0}
  ],
  "legs": [
    {"fromSequence":1,"toSequence":2,"mode":"ROAD"},
    {"fromSequence":2,"toSequence":3,"mode":"AIR","flight":{"airline":"Example carrier","flightNumber":"EX123","departureAt":"2026-11-20T05:00:00Z","arrivalAt":"2026-11-20T11:00:00Z"}},
    {"fromSequence":3,"toSequence":4,"mode":"ROAD"}
  ],
  "deadlineJustification": null
}
```

**200:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "points": [
      {"sequence":1,"plannedArrivalAt":null,"plannedDepartureAt":"2026-11-20T01:00:00Z"},
      {"sequence":2,"plannedArrivalAt":"2026-11-20T02:20:00Z","plannedDepartureAt":"2026-11-20T04:20:00Z"}
    ],
    "legs": [
      {"fromSequence":1,"toSequence":2,"mode":"ROAD","distanceKm":30,"durationMinutes":80,"distanceSource":"MAP_SERVICE","path":[[10.8,106.7],[10.9,106.8]]},
      {"fromSequence":2,"toSequence":3,"mode":"AIR","distanceKm":null,"durationMinutes":360,"distanceSource":"FLIGHT_SCHEDULE","path":null}
    ],
    "totals": {"roadDistanceKm":70,"elapsedMinutes":1860},
    "etaDestination": "2026-11-21T08:00:00Z",
    "deliveryDeadline": "2026-11-22T09:00:00Z",
    "validation": {"canSubmit":true,"errors":[],"warnings":[]},
    "comparisonWithPreliminaryPlan": {"differs":false,"fields":[]}
  }
}
```

**Validation errors vs warnings:**

| Code | Tác động |
|---|---|
| `UNSUPPORTED_ROUTE` | Error: route đi/đến nước không hỗ trợ |
| `MISSING_ROUTE_POINT` | Error: thiếu điểm xuất phát/đích/điểm trung chuyển hợp lệ |
| `LEG_MODE_INVALID` | Error: AIR không nối hai sân bay, mode không khả dụng, legs không liên tục |
| `INVALID_DIRECT_FLIGHT` | Error: VN→JP có hành trình AIR quá cảnh trong demo |
| `CHECKPOINT_NOT_FOUND` | Error: catalog reference sai/đã khóa |
| `MANUAL_DISTANCE_REQUIRED` | Error: map service không đáp ứng, bắt buộc sửa/điền tay theo quyền |
| `CONTINUOUS_DRIVE_EXCEEDED` | Error: vượt ngưỡng nghỉ/ngày lái xe cấu hình |
| `ARRIVAL_AFTER_DEADLINE` | Warning: ETA dự kiến sau deadline hợp đồng; phải giải trình trước submit |
| `DIFFERS_FROM_PRELIMINARY_PLAN` | Warning: khác mode/điểm quan trọng so với plan sơ bộ; cần Manager kiểm tra |

`validation.errors` và `validation.warnings` là **kết quả mô phỏng để FE highlight**, không phải HTTP error trừ khi cấu trúc input sai khiến không tính được. FE không quyết định cho phép submit chỉ theo `validation.canSubmit`; BE tính lại tại endpoint submit.

### 7.1. Dịch vụ bản đồ thất bại

Nếu map provider không trả đường đi/quãng đường: Backend trả leg `distanceSource = UNAVAILABLE`, `path = null`, code `MANUAL_DISTANCE_REQUIRED`; Coordinator được nhập `manualDistanceKm` và `manualDurationMinutes` với audit nguồn. Phải mô tả rõ đây là **kế hoạch ước lượng**, không phải kết quả đo GPS, và hiển thị cảnh báo cho Manager khi duyệt.

---

## 8. Coordinator – Route Version CRUD và workflow

### F03-C06. `GET /coordinator/trips/{tripId}/routes`

**200 data:** mảng các Route Version mới nhất trước. Mỗi phần tử `{routeVersionId,version,status,source,createdAt,submittedAt,approvedAt,returnReason,etaDestination,allowedActions}`. Khách không có quyền dùng prefix Coordinator. Lịch sử trả đầy đủ, không xóa bản `RETURNED`.

### F03-C07. `GET /coordinator/routes/{routeVersionId}`

**200 data:** `RouteVersion` đầy đủ ở Chương 6; bao gồm points/legs/paths, `currentVersion`, `comparisonWithPreliminaryPlan`, readiness summary, `allowedActions`. Nếu route không thuộc trip scope → `404 NOT_FOUND`.

### F03-C08. `POST /coordinator/trips/{tripId}/routes`

**Tạo Route DRAFT** từ payload 6.2/6.3, không tạo checkpoint catalog, không tự sinh Trip. Không cần phần tử `tripId` trùng trong body vì có path.

**201:**

```json
{
  "success": true,
  "message": "Route draft created",
  "data": {"routeVersionId":120,"tripId":9,"version":1,"status":"DRAFT","etag":"v1","requiresChecklistRefresh":false}
}
```

- Chỉ Trip `PLANNING`, deployment `CONFIRMED`; chống 2 Draft song song trong cùng Trip; idempotency xử lý retry.
- `409 ROUTE_DRAFT_EXISTS` nếu đã có Draft hiện hành, FE chuyển sang GET/PUT draft; không cho tạo bản thứ hai ngầm.
- Cho lưu nháp chưa đủ điều kiện gửi duyệt nhưng bắt buộc JSON có cấu trúc hợp lệ; `validate` ở calculate/submit.

### F03-C09. `PUT /coordinator/routes/{routeVersionId}`

**Body:** `RouteDraftPayload` và `expectedVersion`/ETag. Chỉ sửa `DRAFT`. Với `RETURNED`, endpoint thực hiện nhánh **tạo phiên bản mới** theo bản trả, giữ bản cũ bất biến. Backend trả ID mới, không giả định FE tiếp tục PUT ID cũ.

```json
{
  "expectedVersion": 1,
  "plannedDepartureAt": "2026-11-20T01:00:00Z",
  "points": [
    {"sequence":1,"type":"ORIGIN","name":"Điểm đón VN","lat":10.8,"lng":106.7,"plannedStopMinutes":0},
    {"sequence":2,"type":"AIRPORT","checkpointId":101,"plannedStopMinutes":120},
    {"sequence":3,"type":"AIRPORT","checkpointId":201,"plannedStopMinutes":120},
    {"sequence":4,"type":"DESTINATION","name":"Điểm giao JP","lat":35.6,"lng":139.7,"plannedStopMinutes":0}
  ],
  "legs": [
    {"fromSequence":1,"toSequence":2,"mode":"ROAD"},
    {"fromSequence":2,"toSequence":3,"mode":"AIR","flight":{"airline":"Example carrier","flightNumber":"EX123","departureAt":"2026-11-20T05:00:00Z","arrivalAt":"2026-11-20T11:00:00Z"}},
    {"fromSequence":3,"toSequence":4,"mode":"ROAD"}
  ],
  "deadlineJustification": null
}
```

**200 data:** `{routeVersionId,version,status,etag,changedFields,checklistNeedsRefresh}`. Nếu cập nhật `RETURNED`, `newRouteVersionId` và `version` thay đổi; `previousRouteVersionId` lưu để audit. Không cho PUT `PENDING_APPROVAL` hoặc `APPROVED`: `409 ROUTE_NOT_EDITABLE`.

**Quan trọng:** không tự đổi `originalApprovedEta` trong bất kỳ PUT nào.

### F03-C10. `POST /coordinator/routes/{routeVersionId}/submit`

**Body:**

```json
{ "expectedVersion": 3, "deadlineJustification": "Dự kiến đến trễ hạn, đã báo Manager thẩm định kế hoạch" }
```

**200:**

```json
{
  "success": true,
  "message": "Route submitted for approval",
  "data": {
    "routeVersionId":120,"version":3,"status":"PENDING_APPROVAL",
    "submittedAt":"2026-11-10T08:00:00Z",
    "checklistSync": {"requested":true,"stage":"FINAL","routeVersionId":120},
    "managerNotified":true
  }
}
```

- BE re-calculate/re-validate server-side (mode, points, flight/direct, deadline, driving limits). Nếu lỗi cấu trúc nghiệp vụ → `409 ROUTE_VALIDATION_FAILED` với `data:null`; chi tiết validation trả vào `errors[]` khi lỗi theo field hoặc response error metadata theo conventions (không đặt `data.errors` trong envelope lỗi).
- Khi submit: Route `PENDING_APPROVAL`, phát sự kiện đồng bộ checklist Flow 2; **không tự đánh dấu checklist READY** hoặc giả lập chuyên viên đã duyệt.
- Manager nhận thông báo sau commit; không sửa lại bản đang chờ duyệt.

### 8.1. Route versions và thay đổi quan trọng

- Return → Coordinator soạn version mới, bản đã return vẫn đọc được, lưu `returnReason`, actor/time.
- Approved Route còn hiệu lực là `currentApprovedRouteVersionId` trên Trip; bản cũ không biến mất.
- Route được Coordinator thay trước khởi hành → Manager phải duyệt lại bản mới; checklist gắn version phải được đánh giá lại; không tự chuyển readiness nếu bất kỳ điều kiện nào mất.
- Đổi route khi `IN_TRANSIT` không dùng PUT trên Route, mà Flow 5 với Incident + Manager decision.

---

## 9. Manager – Review / Approve / Return Route

### F03-M01. `GET /manager/planning`

**Query:** `condition=ROUTE|STAFF|VEHICLE|CHECKLIST|INSURANCE|VET_QUALIFICATION`, `deploymentStatus`, `departureBefore`, `page`, `pageSize`. Dữ liệu trả dạng phân trang.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [{
      "tripId":9,"tripCode":"TRP-20261120-0003","status":"PLANNING",
      "routeStatus":"PENDING_APPROVAL","currentRouteVersionId":120,
      "deploymentStatus":"CONFIRMED","plannedDepartureAt":"2026-11-20T01:00:00Z",
      "conditions":{"routeApproved":false,"operationsConfirmed":false,"documentsConfirmed":false,"staffAssigned":true,"vehicleReady":true,"checklistReady":false,"insuranceVerified":false,"veterinarianQualified":true}
    }],
    "page":1,"pageSize":20,"totalItems":1,"totalPages":1
  }
}
```

### F03-M02. `GET /manager/trips/{tripId}/route`

**200 data:** current RouteVersion và lịch sử: `routeVersionId,version,status,points,legs,plannedPath,etaDestination,deliveryDeadline,deadlineCheck,comparisonWithPreliminaryPlan,previousVersions,allowedActions`. Nếu chưa có tuyến `data:null`, không phải `404` với Trip hợp lệ.

### F03-M03. `POST /manager/trips/{tripId}/routes/{routeVersionId}/approve`

**Body:**

```json
{ "expectedVersion": 3, "note": "Lộ trình phù hợp kế hoạch vận chuyển" }
```

**200:**

```json
{
  "success": true,
  "message": "Route approved",
  "data": {
    "tripId":9,"routeVersionId":120,"routeStatus":"APPROVED",
    "approvedAt":"2026-11-11T08:00:00Z",
    "tripStatus":"PLANNING","originalApprovedEta":"2026-11-21T08:00:00Z",
    "missingConditions":["DOCUMENTS_CONFIRMED","OPERATIONS_CONFIRMED"]
  }
}
```

BE chỉ duyệt Route Version mới nhất `PENDING_APPROVAL`, có quyền role Manager, kiểm tra version. Lưu approvedBy/At và originalApprovedEta lần duyệt đầu, mọi phê duyệt sau chỉ làm thay đổi current route + revised ETA, không xóa original. Trigger readiness recheck; **Manager approve không trực tiếp set READY_TO_DEPART**.

### F03-M04. `POST /manager/trips/{tripId}/routes/{routeVersionId}/return`

```json
{ "expectedVersion":3, "reason":"Chưa có điểm nghỉ và lịch chăm sóc ngựa phù hợp" }
```

**200 data:** `{routeVersionId:120,version:3,status:"RETURNED",returnedAt:"2026-11-11T08:00:00Z",returnReason:"...",tripStatus:"PLANNING"}`. Reason bắt buộc, audit. Không tự sửa Route thay Coordinator; Manager cũng không tạo fake checkpoint.

**Errors chung:** `403 FORBIDDEN_ROLE`, `404 NOT_FOUND`, `409 ROUTE_NOT_PENDING`, `409 ROUTE_VERSION_CONFLICT`, `409 INVALID_STATE`.

---

## 10. Coordinator – Fleet & Vehicle Management (UC-FRC-01)

### 10.1. Vehicle object

```json
{
  "vehicleId":4,"plateNumber":"51C-123.45","vehicleType":"Xe vận chuyển ngựa","registrationCountry":"VN",
  "totalStalls":6,"availableStalls":4,"payloadKg":8000,
  "registrationExpiry":"2027-03-01","status":"READY","maintenanceFrom":null,"maintenanceUntil":null,
  "statusNote":null,"currentTrip":null,"nextTrip":{"tripId":9,"tripCode":"TRP-20261120-0003"},
  "allowedActions":["EDIT","CHANGE_STATUS","VIEW_SCHEDULE"]
}
```

- `totalStalls` là sức chứa thiết kế, `availableStalls` là sức chứa sử dụng hiện tại; không cho `availableStalls > totalStalls`.
- `registrationExpiry` và các giấy tờ bắt buộc khác phải hợp lệ tại thời điểm chặng ROAD; không có việc nhập ngày tùy ý để qua validate.
- Không đồng nhất `vehicleId` xe nội bộ với dịch vụ máy bay thuê ngoài; `AIR` không yêu cầu vehicleId nội bộ.
- `currentTrip`/`nextTrip` suy ra từ phân công thật, không từ GPS.

### F03-C11. `GET /coordinator/vehicles`

Query `status`, `registrationCountry`, `minAvailableStalls`, `q`, `page`, `pageSize`. **200 data:** list phân trang Vehicle objects. Chỉ `FLEET_COORDINATOR`.

### F03-C12. `GET /coordinator/vehicles/{vehicleId}`

**200 data:** Vehicle object + `maintenanceHistory` và `scheduleSummary` theo quyền. Nếu không thấy xe → `404 NOT_FOUND`.

### F03-C13. `POST /coordinator/vehicles`

```json
{
  "plateNumber":"51C-123.45","vehicleType":"Xe vận chuyển ngựa", "registrationCountry":"VN",
  "totalStalls":6,"availableStalls":6,"payloadKg":8000,"registrationExpiry":"2027-03-01"
}
```

**201 data:** Vehicle object (status `READY` chỉ khi dữ liệu/phân loại thực tế đạt điều kiện; nếu chưa xác minh đủ thì không tuyên bố đã sẵn sàng). `409 PLATE_NUMBER_DUPLICATE`; `400 VALIDATION_ERROR`/`STALLS_OUT_OF_RANGE`.

### F03-C14. `PUT /coordinator/vehicles/{vehicleId}`

**Body:** các trường được phép sửa của Vehicle, tối thiểu `availableStalls`, `vehicleType`, `payloadKg`, `registrationExpiry`, `expectedVersion` nếu dùng optimistic locking. Không sửa `plateNumber` nếu đang gắn với Trip mà không theo chính sách quản trị phương tiện.

**200 data:** `{vehicleId,availableStalls,status,version,warnings:[{code:"TRIP_NEEDS_REASSIGNMENT",tripId:9}]}`. Nếu đổi sức chứa làm thiếu stall, gắn cảnh báo/bắt reassign và readiness false ngay; không để Trip tiếp tục READY trên phân công không hợp lệ.

### F03-C15. `PATCH /coordinator/vehicles/{vehicleId}/status`

```json
{
  "status":"MAINTENANCE", "maintenanceFrom":"2026-11-18T00:00:00Z",
  "maintenanceUntil":"2026-11-21T00:00:00Z", "note":"Bảo dưỡng phanh"
}
```

**200 data:** `{vehicleId,status,maintenanceFrom,maintenanceUntil,conflictingTrips:[{tripId:9,requiresReassignment:true}]}`. Trạng thái được phép: `READY`, `MAINTENANCE`, `INACTIVE`. BE không cho thay đổi làm lịch xe sai mà không phát hiện; nếu ảnh hưởng Trip đã phân công, báo Coordinator/Manager và đánh giá lại readiness. Trip đang di chuyển phải xử lý thay xe bằng Flow 5, không sửa ngầm danh sách xe chặng đã chạy.

### F03-C16. `GET /coordinator/vehicles/{vehicleId}/schedule`

Query `from`/`to` timestamps hoặc date theo quy ước API. **200 data:**

```json
[
  {"kind":"TRIP","tripId":9,"tripCode":"TRP-20261120-0003","legIds":[51],"from":"2026-11-20T01:00:00Z","to":"2026-11-20T04:00:00Z"},
  {"kind":"MAINTENANCE","from":"2026-11-21T00:00:00Z","to":"2026-11-22T00:00:00Z","note":"Kiểm tra định kỳ"}
]
```

Đây là `data` của envelope. Dùng khoảng thời gian `[from,to)` thống nhất để tránh lệch overlap; cùng xe không được bị chiếm dụng ở hai lịch xung đột không giải quyết.

### F03-C17. `GET /coordinator/vehicles/available`

Query `from`, `to`, `minStalls`, `country=VN|JP` hoặc `tripId`, `legId` để tính theo chặng; BE chỉ trả xe có thể được điều phối hợp lệ tại quốc gia thực hiện chặng.  **200 data:** `{items:[{vehicleId,plateNumber,availableStalls,selectable,conflict:null}],page,pageSize,totalItems,totalPages}`. BE kiểm tra lại vào lúc `PUT assignments`; không đặt cược vào kết quả query trước đó.

---

## 11. Coordinator – Staff Availability, Licenses & Schedule

### F03-C18. `GET /coordinator/staff`

**Query:** `role=DRIVER|ESCORT`, `availableFrom`, `availableTo`, `country=VN|JP` (quốc gia thực hiện chặng, nếu cần), `q`, `page`, `pageSize`. Backend lọc khả năng hành nghề/vận hành hợp lệ tại quốc gia chặng, không chỉ availability lịch. **200:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {"userId":20,"fullName":"Tài xế A","role":"DRIVER","licenseClass":"FC","licenseExpiry":"2028-01-01","canDriveCountries":["VN"],"isAvailable":true,"conflict":null},
      {"userId":21,"fullName":"Bác sĩ B","role":"ESCORT","qualification":{"type":"VETERINARIAN","verified":true,"validUntil":"2027-12-31"},"isAvailable":true,"conflict":null}
    ],
    "page":1,"pageSize":20,"totalItems":2,"totalPages":1
  }
}
```

Không suy luận một Escort bất kỳ đủ chứng chỉ vet; không cho `DRIVER` tự đóng vai `VETERINARIAN` nếu account/qualification không đúng.

### F03-C19. `GET /coordinator/staff/{userId}/schedule`

**Query:** `from`, `to`. **200 data:** array `{kind,tripId,legIds,from,to,assignmentRole,conflict}`. Không trả dữ liệu cá nhân ngoài phạm vi Coordinator. Nếu staff không có quyền hiển thị → `404 NOT_FOUND`.

### 11.1. Ràng buộc lịch nhân sự

- Khoảng thời gian bao gồm chuẩn bị, đi chặng và giao nhận nếu cần; cùng một người không xuất hiện trong hai nhiệm vụ xung đột.
- Chứng chỉ/bằng lái phải còn hạn ở thời gian chặng; `role` chỉ phản ánh loại account, `assignmentRole` mới phản ánh vai trò cụ thể trên chặng.
- Một người có thể tham gia nhiều chặng không trùng thời gian; không bắt buộc tạo user mới cho từng chặng.
- Nếu thông tin chứng chỉ chưa có/không hợp lệ, `validate` trả rõ condition, không cho FE tự bật `isQualified`.

---

## 12. Coordinator – Assignment per Leg (UC-FRC-03)

### 12.1. Assignment payload chuẩn

**Phân công ROAD (phương tiện nội bộ):**

```json
{
  "legId":51,
  "mode":"ROAD",
  "vehicles":[{
    "vehicleId":4,
    "mainDriverId":20,
    "coDriverId":22,
    "escortIds":[],
    "veterinarianId":21,
    "horses":[{"horseId":31,"stallNumber":1},{"horseId":32,"stallNumber":2}]
  }]
}
```

Bác sĩ thú y là vị trí `VETERINARIAN` do `ESCORT` qualified đảm nhiệm, phải là user độc lập với `MAIN_DRIVER` và `CO_DRIVER` trong cùng chặng. Trường `escortIds` dùng khi có người chăm sóc bổ sung, không thay cho bắt buộc có bác sĩ. Nếu cùng một người được gán ở các vai trò không độc lập, BE từ chối.

**Phân công AIR (dịch vụ thuê ngoài):**

```json
{
  "legId":52,
  "mode":"AIR",
  "flightBookingId":300,
  "veterinarianIds":[21],
  "horseIds":[31,32]
}
```

Không gán `vehicleId` của fleet nội bộ cho máy bay. Số người vet, chứng chỉ hoặc điều kiện của hãng bay phải lấy từ booking/hồ sơ được kiểm tra; không hardcode một số cố định nếu quy định áp dụng thay đổi (nhưng luôn đáp ứng quy tắc có vet trong chặng AIR).

**Chặng ROAD giao tại Nhật Bản (JP):** tuân theo **cùng schema `vehicles[]` và `staff[]`** như chặng ROAD tại Việt Nam. Coordinator phải chọn `vehicleId`, `mainDriverId`, `coDriverId`, `veterinarianId`, phân chỗ cho toàn bộ `horseIds` và kiểm tra nguồn lực đủ điều kiện hoạt động ở `JP`. Giả định demo có sẵn xe/người phù hợp trong danh mục được điều phối; **không được bỏ bước phân công hoặc chỉ điền `providerReference` để coi là hoàn tất**. Chỉ chặng AIR lấy `flightBookingId` từ hãng/bên vận tải hàng không.

### F03-C20. `GET /coordinator/trips/{tripId}/assignments`

**200 data:**

```json
{
  "tripId":9,"routeVersionId":120,"routeVersion":3,"editable":true,
  "horses":[{"horseId":31,"name":"Thunder Bolt"},{"horseId":32,"name":"Silver Wind"}],
  "legs":[
    {"legId":51,"sequence":1,"mode":"ROAD","vehicles":[{"vehicleId":4,"plateNumber":"51C-123.45","horses":[{"horseId":31,"stallNumber":1},{"horseId":32,"stallNumber":2}],"staff":[{"userId":20,"assignmentRole":"MAIN_DRIVER"},{"userId":22,"assignmentRole":"CO_DRIVER"},{"userId":21,"assignmentRole":"VETERINARIAN"}]}]},
    {"legId":52,"sequence":2,"mode":"AIR","flightBookingId":300,"veterinarianIds":[21],"horseIds":[31,32]},
    {"legId":53,"sequence":3,"mode":"ROAD","country":"JP","vehicles":[],"staff":[],"horses":[]}
  ],
  "isComplete":false,"missing":["Leg 3 (JP ROAD) has no vehicle/staff assignment"],"allowedActions":["VALIDATE","EDIT"]
}
```

BE chỉ cung cấp sửa assignment nếu Trip chưa `IN_TRANSIT` và deployment hợp lệ. `editable` không thay authorization.

### F03-C21. `POST /coordinator/trips/{tripId}/assignments/validate`

**Không lưu.** Body giống `PUT assignments` ở 12.2 (gồm `routeVersionId`, `legs[]`). `200 data`: 

```json
{
  "valid":false,
  "errors":[
    {"code":"MISSING_VETERINARIAN","legId":51,"message":"ROAD leg requires an eligible veterinarian"},
    {"code":"RESOURCE_SCHEDULE_CONFLICT","legId":51,"resourceType":"VEHICLE","resourceId":4,"conflictTripCode":"TRP-OTHER"}
  ],
  "warnings":[],
  "isComplete":false
}
```

Trả `200` với `valid=false` cho dự xem xét; `PUT` phải tự validate lại. `errors[]` trong **data** ở endpoint preview hợp lệ, phân biệt `errors[]` thuộc error envelope chỉ khi HTTP thất bại.

### F03-C22. `PUT /coordinator/trips/{tripId}/assignments`

**Body:**

```json
{
  "routeVersionId":120,
  "expectedAssignmentVersion":2,
  "legs":[
    {"legId":51,"mode":"ROAD","vehicles":[{"vehicleId":4,"mainDriverId":20,"coDriverId":22,"veterinarianId":21,"escortIds":[],"horses":[{"horseId":31,"stallNumber":1},{"horseId":32,"stallNumber":2}]}]},
    {"legId":52,"mode":"AIR","flightBookingId":300,"veterinarianIds":[21],"horseIds":[31,32]},
    {"legId":53,"mode":"ROAD","vehicles":[{"vehicleId":7,"mainDriverId":30,"coDriverId":31,"veterinarianId":32,"escortIds":[],"horses":[{"horseId":31,"stallNumber":1},{"horseId":32,"stallNumber":2}]}]}
  ],
  "applyToAllRoadLegs":false
}
```

**200:**

```json
{
  "success":true,"message":"Assignments saved",
  "data":{"tripId":9,"routeVersionId":120,"assignmentVersion":3,"isComplete":true,"missing":[],"notified":{"assigned":[20,21,22,30,31,32],"unassigned":[]},"departureConditions":{"staffAssigned":true,"vehicleReady":true}}
}
```

- `applyToAllRoadLegs=true` chỉ là FE shortcut khi xe/người đủ điều kiện cho **tất cả** ROAD legs; với chuyến VN→JP có ROAD legs tại hai quốc gia, **không mặc định sao chép tài xế hoặc xe từ VN sang JP**. Mỗi leg phải có assignment hợp lệ và được Backend validate riêng.
- Nếu định nghĩa vehicle/driver chỉ phù hợp một chặng, BE trả `409 ASSIGNMENT_INVALID` thay vì tự bỏ phần đó.
- Khi phân công thay đổi trước khởi hành, BE tạo audit, cảnh báo người bị đổi, cập nhật lịch staff/xe, re-evaluate readiness.
- Nếu chuyển sang routeVersion mới, BE yêu cầu Coordinator xác nhận/rebind assignments theo các legId mới, không mặc định mọi phân công của route cũ vẫn hợp lệ.
- Mọi Horse phải được phân công nhất quán trên các chặng phù hợp, không làm mất con ngựa trên leg.

### 12.3. Assignment validation codes

| errorCode | Khi nào |
|---|---|
| `RESOURCE_SCHEDULE_CONFLICT` | Xe hoặc nhân sự trùng thời gian với nhiệm vụ khác |
| `STALL_CAPACITY_EXCEEDED` | Không đủ vị trí trong xe |
| `DUPLICATE_STALL` | Hai ngựa trên một vị trí |
| `HORSE_NOT_ASSIGNED` | Ngựa chưa được bố trí ở chặng thích hợp |
| `VEHICLE_NOT_READY` | Xe không ở trạng thái `READY` |
| `VEHICLE_REGISTRATION_EXPIRES` | Hết đăng kiểm trong kỳ tác nghiệp |
| `MISSING_MAIN_DRIVER` | Thiếu tài xế chính |
| `MISSING_CO_DRIVER` | Thiếu tài xế phụ |
| `MISSING_VETERINARIAN` | Thiếu bác sĩ thú y độc lập/đủ điều kiện |
| `QUALIFICATION_REQUIRED` | Account vet/driver không đủ hoặc đã hết hạn giấy tờ |
| `ASSIGNMENT_ROUTE_MISMATCH` | Phân công không ứng với routeVersion hiện hành |
| `RESOURCE_COUNTRY_NOT_ELIGIBLE` | Xe/tài xế không đủ điều kiện hoặc không được phân công hoạt động ở quốc gia của ROAD leg (đặc biệt JP) |
| `ROAD_LEG_UNASSIGNED` | Một ROAD leg bất kỳ tại VN hoặc JP chưa có xe và nhân sự đầy đủ |

---

## 13. AIR – Third-party Flight Booking & Budget (VN→JP)

Đường hàng không là dịch vụ thuê bên thứ ba. Coordinator ghi nhận booking/schedule **thủ công** sau khi đã có quyết định Manager về phương án/ngân sách; không tích hợp đặt vé trực tiếp. Trạng thái booking là đối tượng phụ, **không** là `TripStatus` hay `RouteStatus`.

### 13.1. Flight booking read model `[BỔ SUNG]`

```json
{
  "flightBookingId":300,"bookingVersion":2,"tripId":9,"routeVersionId":120,"airLegId":52,
  "providerName":"Example air cargo provider","airline":"Example carrier","flightNumber":"EX123",
  "departureAirportCheckpointId":101,"arrivalAirportCheckpointId":201,
  "departureAt":"2026-11-20T05:00:00Z","arrivalAt":"2026-11-20T11:00:00Z",
  "directFlight":true,"horses":[31,32],
  "budgetApproval":{"approved":true,"approvedBy":5,"approvedAt":"2026-11-09T09:00:00Z","approvedCurrency":"VND","approvedAmount":100000000},
  "bookingReference":"EXAMPLE-BOOKING-001","bookingConfirmed":true,
  "evidenceFileIds":[901],"recordedBy":20,"recordedAt":"2026-11-10T08:00:00Z",
  "requiresSpecialistReview":true
}
```

Số tiền chỉ là ví dụ; approval record phải có thật, không để FE tự gửi `budgetApproval.approved = true`. `directFlight` được xác minh theo schedule/booking chứ không chỉ dựa vào boolean của FE.

### F03-C23. `GET /coordinator/trips/{tripId}/flight-booking` **[BỔ SUNG]**

**200 data:** booking hiện hành gồm **`flightBookingId` và `bookingVersion`** (hoặc ETag tương đương) nếu có, `null` nếu chưa có. Chỉ dùng khi Trip có AIR leg; nếu không có thì trả `data:null` cùng metadata `applicable:false` tại Trip Detail.

### F03-C24. `PUT /coordinator/trips/{tripId}/flight-booking` **[BỔ SUNG]**

**Purpose:** Ghi lịch bay/đặt dịch vụ thực tế sau khi Manager xác nhận ngân sách. Hỗ trợ tạo/lưu lại booking cho Trip duy nhất (version lịch sử khi đổi schedule); không gọi cổng hãng bay.

**Content-Type:** multipart khi có bằng chứng. `payload`:

```json
{
  "routeVersionId":120,"airLegId":52,"expectedBookingVersion":1,"providerName":"Example air cargo provider",
  "airline":"Example carrier","flightNumber":"EX123",
  "departureAirportCheckpointId":101,"arrivalAirportCheckpointId":201,
  "departureAt":"2026-11-20T05:00:00Z","arrivalAt":"2026-11-20T11:00:00Z",
  "bookingReference":"EXAMPLE-BOOKING-001",
  "horseIds":[31,32],"note":"Carrier confirmation attached"
}
```

Files: booking confirmation, service agreement/evidence theo giới hạn `00-conventions.md`. **200 data:** `{flightBookingId,bookingVersion,bookingConfirmed,recordedAt,routeVersionId,readinessReevaluationRequired}`. Khi tạo booking mới, `expectedBookingVersion` là `null` và BE xác nhận chưa có bản hiện hành; khi sửa phải gửi đúng version/ETag hiện tại. Mọi cập nhật thành công tăng `bookingVersion` và giữ lịch sử.

**Validation:** Trip/Route/AIR leg hợp lệ; hai đầu airport VN và JP; direct flight; hãng/bên thứ ba tồn tại theo xác nhận; giờ bay hợp lệ; ngân sách/phương án đã được Manager duyệt; bằng chứng booking; số ngựa đúng Trip; một booking hiện hành cho cùng service leg. Nếu thay lịch bay làm Route ETA đổi, phải cập nhật Route Version và báo Specialist (Flow 2) rồi Manager duyệt lại khi cần; không âm thầm sửa route đã approve.

**Errors:** `409 FLIGHT_BUDGET_NOT_APPROVED`, `409 FLIGHT_BOOKING_CONFLICT`, `409 FLIGHT_BOOKING_VERSION_CONFLICT`, `409 ROUTE_VERSION_CONFLICT`, `400 VALIDATION_ERROR`, `409 INVALID_DIRECT_FLIGHT`. Cập nhật cùng booking ID nhưng khác `bookingVersion` cũng phải khiến Operations confirmation cũ mất hiệu lực nếu dữ liệu mới ảnh hưởng vận hành.

**Chống stale booking:** Backend lưu `(flightBookingId, bookingVersion)` trong confirmation snapshot. Tất cả mutation của booking phải kiểm tra `expectedBookingVersion`, tương đương ETag concurrency; một booking ID không đại diện cho cùng lịch bay mãi mãi. Khi booking đổi giờ bay/chặng/danh sách ngựa/bằng chứng xác nhận, Backend rút hiệu lực Operations READY cũ và đánh giá ảnh hưởng Route/checklist.

### 13.2. Budget approval liên kết Flow 1/Manager

- Booking tham chiếu `preliminaryPlanId` + `preliminaryPlanVersion` hoặc tham chiếu bản ghi quyết định phê duyệt ngân sách tương đương **do Backend quản lý**, thể hiện phương án và mức chi đã được Manager chấp thuận ở Flow 1. Không tin cờ approved do FE tự gửi; không tạo một API phê duyệt thứ hai nếu nguồn phê duyệt hiện có đã đủ.
- Nếu hệ thống lưu quyết định ngân sách bay tách khỏi preliminaryPlan, cần thống nhất hình thức biểu diễn trước khi phát triển; **không giả định một bước duyệt thứ hai**.
- Specialist nhận thông báo để bổ sung/yêu cầu hồ sơ vận chuyển hàng không và kiểm dịch theo Flow 2; không được coi booking là giấy phép.

---

## 14. Ranh giới với bảo hiểm và hồ sơ (Flow 2 – chỉ đọc ở Flow 3)

### 14.1. Trách nhiệm thu xếp bảo hiểm

- **Flow 1:** Manager đã đưa khoản bảo hiểm vào giá dịch vụ trong Draft Contract; đây **không phải** chứng minh bảo hiểm đã phát hành hoặc đã hiệu lực.
- **Ngoài hệ thống:** CBN Transport thu xếp mua bảo hiểm vận chuyển ngựa từ doanh nghiệp bảo hiểm sau khi Trip được kích hoạt, với phạm vi phù hợp theo hành trình thực tế. **Không** triển khai API mua bảo hiểm trực tiếp hoặc bồi thường bảo hiểm trong demo.
- **Flow 2 – Specialist:** nhận tài liệu doanh nghiệp bảo hiểm cấp, lưu policy/số hợp đồng/doanh nghiệp bảo hiểm/danh sách ngựa được bảo hiểm/thời hạn/phạm vi và đối chiếu phù hợp; xác minh hồ sơ bảo hiểm. Phần bảo hiểm là **một điều kiện của Documents READY**. Quyền ký/phát hành hợp đồng bảo hiểm thực tế thuộc doanh nghiệp bảo hiểm, không thuộc hệ thống CBN.
- **Flow 3 – Coordinator:** **không** có endpoint `POST /coordinator/trips/{tripId}/insurance`, không bấm `VERIFY`, không phải đọc file bảo hiểm để tự kiểm tra. Coordinator chỉ hoàn tất điều phối; BE lấy trạng thái hồ sơ từ Flow 2 khi tính readiness tổng.
- **Manager:** giám sát policy read-only và phê duyệt Route Version. Không thêm một lớp Manager insurance verify gây trùng trách nhiệm với Specialist.

### 14.2. Dữ liệu tối thiểu Flow 3 nhận từ Flow 2

Đây là **read model nội bộ**, không yêu cầu Coordinator nhập hoặc chỉnh sửa:

```json
{
  "tripId": 9,
  "routeVersionId": 120,
  "documentsReady": false,
  "documentsConfirmed": false,
  "specialistConfirmation": null,
  "checklist": {"stage":"FINAL","status":"NOT_READY","version":4},
  "insurance": {
    "verificationStatus":"PENDING",
    "insuredHorseIds":[31,32],
    "coverageAdequate":false,
    "documentVersion":2
  },
  "blockingConditions":["INSURANCE_VERIFIED"],
  "evaluatedAt":"2026-11-11T09:00:00Z"
}
```

Các trường summary chỉ phản ánh dữ liệu thật do Flow 2 sở hữu. Không gửi nguyên tài liệu bảo hiểm, thông tin riêng tư hay `policyFileId` cho Coordinator chỉ để hiển thị badge.

### 14.3. Tham chiếu API Flow 2 và Manager

| Role | API / trách nhiệm | Ghi chú |
|---|---|---|
| Specialist | `GET /specialist/trips/{tripId}/checklist` | API hiện có Flow 2; kiểm tra checklist FINAL |
| Specialist | `GET /specialist/trips/{tripId}/insurance` | **Cần bổ sung tại Flow 2**: xem chứng từ công ty đã thu xếp |
| Specialist | `POST /specialist/trips/{tripId}/insurance` | **Cần bổ sung tại Flow 2**: upload policy + metadata, không phải giao dịch mua bảo hiểm |
| Specialist | `POST /specialist/trips/{tripId}/insurance/{policyId}/verify` | **Cần bổ sung tại Flow 2**: Specialist đối chiếu policy hợp lệ/không hợp lệ và lưu audit |
| Specialist | `POST /specialist/trips/{tripId}/documents-readiness/confirm` | **Cần bổ sung tại Flow 2**: xác nhận Documents READY cho snapshot checklist/policy hiện hành |
| Manager | `GET /manager/trips/{tripId}/insurance` | Read-only giám sát; được cung cấp bởi service Flow 2 hiện hữu |

### F03-M05. `GET /manager/trips/{tripId}/insurance` – Read-only, tham chiếu Flow 2

**Role:** `LOGISTICS_MANAGER`. Endpoint giữ lại để Manager theo dõi chứng từ/policy đã được Specialist xác minh; **không** cung cấp `VERIFY` cho Manager. Nếu chưa có policy thì `data:null`, không tự tạo trạng thái phê duyệt. Nếu đã có, trả summary (`policyId`, `tripId`, `verificationStatus`, `insuredHorseIds`, `coverageStartAt`, `coverageEndAt`, `verifiedBy`, `verifiedAt`, `allowedActions:["VIEW"]`) theo quyền; tệp chứng từ chỉ tải qua `GET /files/{fileId}` sau authorization.

**200 example:**

```json
{
  "success":true,
  "message":"OK",
  "data":{
    "policyId":8,
    "tripId":9,
    "verificationStatus":"VERIFIED",
    "insuredHorseIds":[31,32],
    "coverageStartAt":"2026-11-20T00:00:00Z",
    "coverageEndAt":"2026-11-23T23:59:59Z",
    "verifiedBy":18,
    "verifiedAt":"2026-11-11T09:00:00Z",
    "allowedActions":["VIEW"]
  }
}
```

**Không còn trong Flow 3:** `GET/POST /coordinator/trips/{tripId}/insurance` và `POST /manager/trips/{tripId}/insurance/verify`. Endpoint Specialist là hợp đồng **đề xuất để đồng bộ khi sửa Flow 2**, chưa được coi là đã implement; Flow 3 chỉ phụ thuộc kết quả và không định nghĩa lại logic Specialist.

### 14.4. Khi bảo hiểm thay đổi

Nếu policy không còn phù hợp vì route/ETA/horses/điểm dừng thay đổi, **Flow 2** phải đánh giá lại và có thể rút `Documents READY`. Backend đồng thời đánh giá lại Departure Readiness; **không** đặt Coordinator vào luồng duyệt bảo hiểm.

---

## 15. Operations READY, Documents READY và Departure Readiness Engine

### 15.1. Hai xác nhận độc lập

| Confirmation | Người xác nhận | Nội dung được đánh giá bởi BE | Không bao gồm |
|---|---|---|---|
| `Operations READY` | `FLEET_COORDINATOR` | Route có cấu trúc vận hành hợp lệ, mọi ROAD leg VN/JP có xe/người/ngựa/stall đúng, staff/vet đủ chuyên môn, không trùng lịch, AIR booking được xác nhận nếu áp dụng | Hồ sơ pháp lý và bảo hiểm |
| `Documents READY` | `TRANSPORT_SPECIALIST` (Flow 2) | Checklist FINAL cho Route Version tương ứng, hồ sơ bắt buộc đến mốc khởi hành đầy đủ/hợp lệ, chứng từ bảo hiểm thực tế được xác minh | Phân công xe và nhân sự |

`ready` là đánh giá từ Backend, `confirmed` là quyết định của role phụ trách cho đúng version. **Chỉ một bên bấm OK không làm Trip READY.** Route Version phải được Manager `APPROVED`; `Request=ACTIVATED`, `Contract=EFFECTIVE`, deployment `CONFIRMED` vẫn phải đúng.

Coordinator và Specialist không thể sửa hoặc xác nhận thay dữ liệu của nhau. Cả hai có thể chuẩn bị và xác nhận song song; một phía hoàn tất trước thì trạng thái đó được lưu, chờ phía còn lại và route approval.

### F03-C25. `GET /coordinator/trips/{tripId}/operations-readiness` **[BỔ SUNG]**

**Role:** `FLEET_COORDINATOR`; chỉ đọc điều kiện vận hành thuộc trách nhiệm Coordinator.

**200 OK:**

```json
{
  "success":true,
  "message":"OK",
  "data":{
    "tripId":9,
    "routeVersionId":120,
    "assignmentVersion":3,
    "flightBookingId":300,
    "flightBookingVersion":2,
    "eligibleToConfirm":true,
    "ready":true,
    "confirmed":false,
    "confirmedBy":null,
    "confirmedAt":null,
    "confirmedSnapshot":null,
    "conditions":[
      {"code":"ROUTE_STRUCTURALLY_VALID","met":true},
      {"code":"STAFF_ASSIGNED","met":true},
      {"code":"VEHICLE_READY","met":true},
      {"code":"VETERINARIAN_QUALIFIED","met":true},
      {"code":"FLIGHT_BOOKING_CONFIRMED","met":true,"applicable":true}
    ],
    "missingConditions":[],
    "allowedActions":["CONFIRM_OPERATIONS_READY"]
  }
}
```

Nếu là Trip ROAD thuần, `FLIGHT_BOOKING_CONFIRMED` trả `met:true, applicable:false`; không bắt booking vô nghĩa. Các điều kiện phải đúng theo **từng** leg, bao gồm leg ROAD tại JP. `ready=true` là đủ dữ liệu, **không đồng nghĩa Coordinator đã bấm xác nhận**.

### F03-C26. `POST /coordinator/trips/{tripId}/operations-readiness/confirm` **[BỔ SUNG]**

**Role:** `FLEET_COORDINATOR`. **Body:**

```json
{
  "routeVersionId":120,
  "expectedAssignmentVersion":3,
  "expectedFlightBookingId":300,
  "expectedFlightBookingVersion":2,
  "note":"Đã hoàn tất phân công mọi chặng VN và JP, kiểm tra lịch phương tiện và nhân sự"
}
```

`expectedFlightBookingId` và `expectedFlightBookingVersion` đều `null` cho Trip ROAD thuần; với AIR cả hai phải khớp phiên bản hiện hành. `note` là ghi chú audit tự do; không phải yêu cầu thêm một chứng chỉ hoặc duyệt phụ mới.

**200 OK:**

```json
{
  "success":true,
  "message":"Operations readiness confirmed",
  "data":{
    "tripId":9,
    "operationsReadiness":{
      "ready":true,
      "confirmed":true,
      "routeVersionId":120,
      "assignmentVersion":3,
      "flightBookingId":300,
      "flightBookingVersion":2,
      "confirmedBy":20,
      "confirmedAt":"2026-11-11T09:30:00Z"
    },
    "documentsReadiness":{"ready":false,"confirmed":false},
    "tripStatus":"PLANNING",
    "departureReadinessReevaluationRequested":true
  }
}
```

**Backend guards:**

1. Trip thuộc phạm vi Coordinator và chưa khởi hành; Request/Contract/deployment hợp lệ.
2. RouteVersion phải là bản hiện hành đang dùng để chuẩn bị, có tính liên tục/hợp lệ; **không** xác nhận nhầm Route Version cũ. Không cần đợi Specialist xác nhận trước.
3. Từng chặng ROAD tại VN và JP đã phân đủ `vehicleId`, `MAIN_DRIVER`, `CO_DRIVER`, `VETERINARIAN`, ngựa/stall; Xe/người được phân công phù hợp quốc gia chặng, thời gian và sức chứa.
4. AIR nếu áp dụng có booking bằng chứng hợp lệ, lịch bay đúng chặng và nhân sự đi kèm đáp ứng điều kiện đã được kiểm tra.
5. `expectedAssignmentVersion`, `expectedFlightBookingId`, **`expectedFlightBookingVersion`** và `routeVersionId` phải khớp snapshot hiện hành. Backend recheck **trong transaction**; preview GET không cấp quyền bỏ qua validation.
6. Ghi audit `OPERATIONS_READINESS_CONFIRMED` gồm actor/time/snapshot, phát update sau commit. Retry cùng snapshot không tạo thêm confirmation hoặc Trip.

**Errors:** `400 VALIDATION_ERROR`; `403 FORBIDDEN_ROLE`; `404 NOT_FOUND`; `409 OPERATIONS_NOT_READY`, `OPERATIONS_CONFIRMATION_STALE`, `ROUTE_VERSION_CONFLICT`, `ASSIGNMENT_ROUTE_MISMATCH`, `RESOURCE_SCHEDULE_CONFLICT`, `INVALID_STATE`, `DEPLOYMENT_NOT_CONFIRMED`.

Không cho FE truyền `confirmed=true`, `tripStatus` hoặc `approvedBy` trong body. Quyền xác nhận không thay Manager approve Route Version.

### F03-M06. `GET /manager/trips/{tripId}/departure-conditions`

**Role:** `LOGISTICS_MANAGER`; chỉ đọc snapshot kết quả readiness tổng, không có side-effect chuyển trạng thái.

```json
{
  "success":true,"message":"OK",
  "data":{
    "tripId":9,"tripStatus":"PLANNING","deploymentStatus":"CONFIRMED",
    "routeVersionId":120,"evaluatedAt":"2026-11-11T09:45:00Z",
    "allMet":false,
    "operationsReadiness":{"ready":true,"confirmed":true,"routeVersionId":120,"assignmentVersion":3,"confirmedBy":20,"confirmedAt":"2026-11-11T09:30:00Z"},
    "documentsReadiness":{"ready":false,"confirmed":false,"routeVersionId":120,"missingConditions":["INSURANCE_VERIFIED"]},
    "conditions":[
      {"code":"ROUTE_APPROVED","met":true},
      {"code":"OPERATIONS_CONFIRMED","met":true},
      {"code":"DOCUMENTS_CONFIRMED","met":false},
      {"code":"STAFF_ASSIGNED","met":true},
      {"code":"VEHICLE_READY","met":true},
      {"code":"CHECKLIST_READY","met":false},
      {"code":"VETERINARIAN_QUALIFIED","met":true},
      {"code":"INSURANCE_VERIFIED","met":false},
      {"code":"FLIGHT_BOOKING_CONFIRMED","met":true,"applicable":true},
      {"code":"DEPLOYMENT_CONFIRMED","met":true}
    ],
    "missingConditions":["DOCUMENTS_CONFIRMED","CHECKLIST_READY","INSURANCE_VERIFIED"],
    "allowedActions":["VIEW_ROUTE","VIEW_DOCUMENTS"]
  }
}
```

Không tạo `InsuranceStatus` hoặc `TripStatus` mới; `INSURANCE_VERIFIED` chỉ là condition từ Flow 2. Manager có thể xem read-only nhưng không gọi `insurance/verify` để hoàn tất điều kiện.

### F03-C27. `GET /coordinator/trips/{tripId}/departure-conditions` **[BỔ SUNG]**

**200 data:** projection readiness tương tự Manager, nhưng redacted trường giấy tờ/PII không thuộc Coordinator: chỉ cần `documentsReadiness.ready/confirmed`, `missingConditions` tổng hợp và badges. **Không** hiển thị policy file, insurer private, document number hay quyền duyệt bảo hiểm. Coordinator không gọi Manager API để xem readiness.

### 15.2. Tổng hợp điều kiện và chuyển TripStatus

Backend cho `allMet=true` khi **đồng thời**:

1. `ROUTE_APPROVED`: Route Version hiện hành được Manager duyệt, vẫn phù hợp Trip;
2. `OPERATIONS_CONFIRMED`: Coordinator đã xác nhận đúng current route/assignment/flight snapshot, tất cả phương tiện và nhân sự vẫn thực sự hợp lệ;
3. `DOCUMENTS_CONFIRMED`: Specialist đã xác nhận hồ sơ FINAL đúng current route/horses/time; giấy tờ/bảo hiểm vẫn đủ điều kiện;
4. Request/Contract/Deployment Flow 1 tiếp tục hợp lệ, Trip chưa khởi hành và không bị hold.

Các conditions nhỏ (`STAFF_ASSIGNED`, `VEHICLE_READY`, `VETERINARIAN_QUALIFIED`, `FLIGHT_BOOKING_CONFIRMED`, `CHECKLIST_READY`, `INSURANCE_VERIFIED`) vẫn được Backend kiểm tra độc lập. **Không chấp nhận hai confirmation stale dù cả hai còn `confirmed=true` trong lịch sử**.

Sau khi dữ liệu nguồn thay đổi, domain service re-evaluate và điều chỉnh trạng thái. Nếu toàn bộ cùng đạt khi Trip `PLANNING`, BE chuyển nguyên tử `READY_TO_DEPART`, ghi audit, notification, SignalR. Nếu một điều kiện mất trước milestone khởi hành, BE rút readiness hiện hành, Trip trở về `PLANNING` và thông báo. Sau `IN_TRANSIT`, không tự lùi PLANNING; áp dụng Flow 4/5.

`GET` là read-only, không kích hoạt chuyển state. Re-evaluation chạy từ domain event/outbox khi approve, confirm, đổi tài nguyên, cập nhật hồ sơ/policy hoặc thay đổi lịch.

### 15.3. Khi nào phải xác nhận lại?

| Dữ liệu thay đổi | Hệ quả |
|---|---|
| Route Version/legs/ETA/booking thay đổi ảnh hưởng vận hành | Rút `Operations READY`; đồng thời báo Flow 2 đánh giá checklist/bảo hiểm |
| Xe/người/stall thay đổi, thiếu hợp lệ, xung đột lịch | Rút `Operations READY`, Coordinator sửa và confirm lại |
| Hồ sơ ngựa, quy định, chứng từ kiểm dịch hoặc bảo hiểm thay đổi ảnh hưởng hiệu lực | Flow 2 rút `Documents READY`, Specialist cập nhật và confirm lại |
| Manager trả lại/sửa Route Version đang được xác nhận | Không dùng snapshot cũ; Route Approval/Operations/Documents đánh giá lại |
| Deployment ON_HOLD hoặc Flow 1 không còn hợp lệ | Không cho Trip mới `READY_TO_DEPART` dù confirmations đã từng được ghi |
| Đã `IN_TRANSIT` | Không rút `TripStatus` về `PLANNING`; xử lý qua Flow 4/5 và lưu audit |

Đánh giá lại theo mức ảnh hưởng thực tế, không yêu cầu xác nhận lại vô cớ khi một metadata hiển thị không liên quan thay đổi. Điều kiện đang ở trạng thái lỗi làm `allMet=false` cho tới khi được xử lý.

---

## 16. Integration với Flow 2 – Checklist, Route Version, Checkpoint

### 16.1. Input Coordinator → Specialist

Khi Route submit hoặc approved/changed, BE gửi domain event chứa tối thiểu:

```json
{
  "eventType":"RouteVersionSubmitted",
  "tripId":9,"routeVersionId":120,"routeVersion":3,
  "routePointCheckpointIds":[101,201],
  "originCountry":"VN","destinationCountry":"JP",
  "transportModes":["ROAD","AIR"],
  "plannedDepartureAt":"2026-11-20T01:00:00Z",
  "etaDestination":"2026-11-21T08:00:00Z"
}
```

**Đây là domain event nội bộ, không tự thêm endpoint REST**. Specialist Flow 2 tạo/đánh giá lại checklist FINAL gắn `routeVersionId`. Nếu queue nội bộ xử lý chậm thì readiness chưa được coi là READY.

### 16.2. Checklist version lifecycle

- `PRELIMINARY` từ plan sơ bộ là để chuẩn bị sớm, có thể xuất hiện trước khi Manager duyệt route.
- `FINAL` gắn RouteVersion hợp lệ, điểm kiểm soát đúng route, thời hạn/cert tương ứng. Checklist không tự động APPROVED chỉ vì Route `PENDING_APPROVAL`/`APPROVED`.
- `GET /specialist/trips/{tripId}/checklist`/`GET /manager/trips/{tripId}/checklist` là các API của Flow 2; không nhân bản thành checklist Coordinator. Sau khi checklist FINAL và chứng từ bảo hiểm thực tế đủ, **Specialist xác nhận `Documents READY` bằng API Flow 2**; Backend tổng hợp từ confirmation này, không tự suy luận chỉ vì Coordinator đã xong.
- Nếu Coordinator cần xem trạng thái, `GET /coordinator/trips/{tripId}` và `GET .../departure-conditions` chỉ hiển thị badge `Documents READY/NOT READY` cùng thông tin thiếu được phép công bố; Coordinator không duyệt hoặc yêu cầu file bảo hiểm.

### 16.3. Clearance tại checkpoint không phải route approval

- Manager duyệt route chỉ xác nhận kế hoạch, không xác nhận ngựa đã qua hải quan/kiểm dịch.
- Sau khi `IN_TRANSIT`, Driver/Escort ghi `ARRIVED_CHECKPOINT`/`PASSED_CHECKPOINT` thủ công tại Flow 4; Specialist ghi `ClearanceResult` có bằng chứng trong Flow 2.
- `ClearanceResult.HELD` hoặc `FAILED` có thể kích hoạt sự cố Flow 5; hệ thống không tự đánh dấu `PASSED` từ GPS hay ETA.

---

## 17. Integration Flow 4 và Flow 5 – chặn trộn nhiệm vụ

**Flow 4:** sau `READY_TO_DEPART`, nhân sự được phân công khởi hành/chuyển `IN_TRANSIT` qua milestone **thủ công**; đến/rời stop/checkpoint được xác nhận thực tế; `ETA` kế hoạch được so với sự kiện thực tế. Nếu giờ hiện tại vượt ETA mà chưa có xác nhận đến điểm tương ứng, hệ thống cảnh báo ngay (không thêm grace period), theo quyết định đã chốt ở Flow 4. Driver có thể đề xuất ETA mới và Coordinator xác nhận; không dùng Route PUT thường để đổi ETA khi đang chạy.

**Flow 5:** khi đang `IN_TRANSIT`, thay đổi route/phương tiện/nhân sự do sự cố phải tạo phương án gắn Incident. Coordinator đề xuất điều chỉnh Route, Manager phê duyệt thay tuyến; ghi audit và bảo toàn `originalApprovedEta`; nếu thay checkpoint thì Specialist cập nhật nghĩa vụ pháp lý, không chuyển clearance cũ sang checkpoint mới như đã đạt.

**Không dùng các API cũ:** `GET /coordinator/trips/live-map` dạng GPS, `GET .../tracking/live` polling real-time hoặc `POST /driver/trips/{tripId}/locations` không thuộc Flow 3 và không được tham chiếu để nghiệm thu giao diện.

---

## 18. Notifications, Task, SignalR và Audit

### 18.1. Sự kiện cần thông báo

| Sự kiện domain | Người nhận | FE reload |
|---|---|---|
| `RouteDraftCreated/Updated` | Coordinator liên quan | Trip/route versions |
| `RouteSubmitted` | Logistics Manager, Specialist | Manager planning; Specialist checklist |
| `RouteApproved` | Coordinator, Specialist, staff liên quan | Route + departure conditions |
| `RouteReturned` | Coordinator | Route detail, `returnReason` |
| `AssignmentsChanged` | Nhân sự được gán/rút, Coordinator | Assignment, Driver trip list |
| `VehicleAvailabilityChanged` | Coordinator, Manager nếu ảnh hưởng Trip | Vehicles, readiness |
| `FlightBookingChanged` | Coordinator, Specialist, Manager | Booking, Route, checklist |
| `InsuranceSubmitted/Verified/Rejected` (Flow 2) | Specialist, Manager; Coordinator chỉ nhận readiness thay đổi | Documents readiness tổng; không phát nội dung policy cho Coordinator |
| `DocumentsReadinessConfirmed/Invalidated` (Flow 2) | Specialist, Coordinator, Manager | Departure conditions |
| `OperationsReadinessConfirmed/Invalidated` | Coordinator, Manager, Specialist | Departure conditions |
| `ChecklistReadyChanged` | Coordinator, Manager | Readiness |
| `TripReadyToDepart/ReadinessRevoked` | Driver/Escort, Coordinator, Manager, Customer theo quyền | Trip detail/tracking |

### 18.2. Shared APIs / SignalR

`GET /notifications`, `GET /notifications/unread-count`, `GET /tasks`, `GET /tasks/summary`, Hub `/api/hubs/updates`. Event names đã có ở `00-conventions`: `TripUpdated`, `DocumentUpdated`, `AssignmentUpdated`, `NotificationCreated`; phần `RouteUpdated` nếu bổ sung phải đồng bộ conventions. Không broadcast payload tài liệu nhạy cảm hoặc file bảo hiểm nguyên bản qua Hub.

```json
{
  "event":"TripUpdated",
  "data":{"tripId":9,"changeType":"ROUTE_APPROVED","occurredAt":"2026-11-11T08:00:00Z"}
}
```

SignalR chỉ thông báo thay đổi, REST là nguồn dữ liệu. Quyền theo user/group xác thực; gửi sau transaction commit; FE reconnect rồi reload.

### 18.3. Audit tối thiểu

| Audit event | Dữ liệu phải có |
|---|---|
| `ROUTE_CREATED`, `ROUTE_UPDATED` | `tripId`, `routeVersionId`, actor, time, before/after revision |
| `ROUTE_SUBMITTED` | version, validity/warnings, submitter |
| `ROUTE_APPROVED`, `ROUTE_RETURNED` | Manager, reason/note, originalApprovedEta khi lần đầu |
| `VEHICLE_CREATED`, `VEHICLE_UPDATED`, `VEHICLE_STATUS_CHANGED` | vehicleId, before/after, ảnh hưởng đến Trip |
| `ASSIGNMENTS_UPDATED` | routeVersionId, staff/vehicle/horse diff |
| `FLIGHT_BOOKING_RECORDED`, `FLIGHT_BOOKING_CHANGED` | reference, carrier, version, evidence, actor |
| `OPERATIONS_READINESS_CONFIRMED`, `OPERATIONS_READINESS_INVALIDATED` | Coordinator, timestamp, routeVersionId, assignmentVersion, flight booking snapshot, reason |
| `DOCUMENTS_READINESS_CHANGED` (Flow 2) | Specialist confirmation ID, document/checklist/insurance version, reason (tham chiếu, không nhân bản policy) |
| `TRIP_READY_TO_DEPART`, `TRIP_READINESS_REVOKED` | evaluatedAt, conditions snapshot, reason |

Log chỉ đọc, không công khai PII/license/passport; dữ liệu nhạy cảm có masking theo quyền.

---

## 19. Error Contract và HTTP status

### 19.1. Quy ước trả lỗi

| HTTP | Khi nào | Ví dụ |
|---|---|---|
| 400 | Thiếu/sai kiểu dữ liệu; validation field; file không hợp lệ | `VALIDATION_ERROR`, `DEADLINE_JUSTIFICATION_REQUIRED` |
| 401 | Chưa xác thực/hết token | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| 403 | Không đúng role/không được phân công | `FORBIDDEN_ROLE`, `NOT_ASSIGNED`, `QUALIFICATION_REQUIRED` |
| 404 | Trip/Route/vehicle/staff không tồn tại hoặc không được phép thấy | `NOT_FOUND` |
| 409 | Trạng thái/version/resource conflict | `INVALID_STATE`, `ROUTE_VERSION_CONFLICT`, `RESOURCE_SCHEDULE_CONFLICT` |
| 429 | Quá giới hạn request nếu hệ thống cấu hình | `RATE_LIMITED` |
| 500 | Lỗi nội bộ không lộ secret | `INTERNAL_ERROR` |
| 503 | Dịch vụ bản đồ bị gián đoạn, nếu không thể cung cấp kết quả preview | `MAP_SERVICE_UNAVAILABLE` |

### 19.2. Route-specific error codes

| errorCode | Ý nghĩa / FE action |
|---|---|
| `UNSUPPORTED_ROUTE` | Không thuộc phạm vi demo → sửa tuyến |
| `TRIP_NOT_PLANNING` | Trip đã đi/vượt giới hạn điều phối bình thường |
| `DEPLOYMENT_NOT_CONFIRMED` | Manager chưa xác nhận hoặc đang ON_HOLD |
| `ROUTE_DRAFT_EXISTS` | Đã có Draft → load Draft hiện hành |
| `ROUTE_NOT_EDITABLE` | Phiên bản đã submit/approved → không PUT |
| `ROUTE_NOT_PENDING` | Manager không thể duyệt/trả version không chờ |
| `ROUTE_VERSION_CONFLICT` | Reload version mới trước khi ghi |
| `ROUTE_VALIDATION_FAILED` | Lộ trình không đạt kiểm tra server-side |
| `MISSING_ROUTE_POINT` | Thiếu origin/destination/điểm cần thiết |
| `LEG_MODE_INVALID` | Chặng sai mode hoặc nối sai điểm |
| `CHECKPOINT_NOT_FOUND` | CheckpointId sai/không còn hiệu lực |
| `INVALID_DIRECT_FLIGHT` | Quốc tế quá cảnh / không đúng DIRECT flight demo |
| `MANUAL_DISTANCE_REQUIRED` | Không tính được quãng đường, phải xử lý giá trị thiếu |
| `CONTINUOUS_DRIVE_EXCEEDED` | Vượt cấu hình nghỉ/di chuyển |
| `DEADLINE_JUSTIFICATION_REQUIRED` | ETA trễ hạn giao nhưng không giải trình |
| `FLIGHT_BUDGET_NOT_APPROVED` | Chưa có phương án/ngân sách thuê bay được Manager duyệt |
| `FLIGHT_BOOKING_CONFLICT` | Booking đã có/trùng lịch/không đúng Trip |

### 19.3. Fleet / staff / readiness errors

| errorCode | Ý nghĩa / FE action |
|---|---|
| `PLATE_NUMBER_DUPLICATE` | Xe trùng biển số |
| `STALLS_OUT_OF_RANGE` | Số stall không hợp lệ |
| `VEHICLE_NOT_READY` | Xe bảo dưỡng/ngưng sử dụng |
| `VEHICLE_REGISTRATION_EXPIRES` | Đăng kiểm không bao phủ chặng |
| `RESOURCE_SCHEDULE_CONFLICT` | Xe/nhân viên trùng lịch |
| `STALL_CAPACITY_EXCEEDED` | Quá sức chứa xe |
| `DUPLICATE_STALL` | Hai ngựa được xếp cùng một stall |
| `HORSE_NOT_ASSIGNED` | Ngựa bị thiếu ở chặng bắt buộc |
| `MISSING_MAIN_DRIVER` | Chặng ROAD thiếu tài xế chính |
| `MISSING_CO_DRIVER` | Chặng ROAD thiếu tài xế phụ |
| `MISSING_VETERINARIAN` | Không có vet hợp lệ và độc lập |
| `ASSIGNMENT_ROUTE_MISMATCH` | Assignment không còn khớp Route Version |
| `ASSIGNMENT_INVALID` | Dữ liệu phân công không đạt invariant |
| `OPERATIONS_NOT_READY` | Coordinator chưa phân công đủ/booking chưa hợp lệ để xác nhận |
| `FLIGHT_BOOKING_VERSION_CONFLICT` | Booking đã thay trên cùng ID, request/confirmation chứa version cũ |
| `OPERATIONS_CONFIRMATION_STALE` | Coordinator đã xác nhận trên snapshot cũ; phải xác nhận lại sau khi sửa |
| `DOCUMENTS_NOT_READY` | Specialist chưa xác nhận hồ sơ, bao gồm bảo hiểm, ở Flow 2 |
| `DOCUMENTS_CONFIRMATION_STALE` | Checklist/insurance/route version thay đổi làm xác nhận Specialist cũ không còn hiệu lực |
| `DEPARTURE_NOT_READY` | Không đủ điều kiện để khởi hành |

**Ví dụ `409`:**

```json
{
  "success":false,"message":"Vehicle already scheduled for another trip",
  "errorCode":"RESOURCE_SCHEDULE_CONFLICT","data":null
}
```

**Ví dụ validation `400`:**

```json
{
  "success":false,"message":"Validation failed","errorCode":"VALIDATION_ERROR","data":null,
  "errors":[{"field":"points[1].checkpointId","message":"Checkpoint required"}]
}
```

---

## 20. Security, consistency, file upload and DB design constraints

### 20.1. Role + scope authorization

- `/coordinator/*` chỉ role `FLEET_COORDINATOR`; `/manager/*` chỉ `LOGISTICS_MANAGER`. Authenticated token không thay thế kiểm tra assignment/deployment/status theo nghiệp vụ.
- Read-only customer tracking dùng `/customer/*` riêng theo Flow 4; Customer không gọi trực tiếp Manager/Coordinator APIs.
- Chứng chỉ vet, giấy đăng kiểm, flight booking, tài liệu bảo hiểm phải qua file endpoint có kiểm tra quyền (`GET /files/{fileId}`), không cung cấp link public.

### 20.2. Transaction boundaries

- Save assignments phải commit nhất quán routeVersionId, vehicle reservations, staff reservations, horse allocations và audit; partial failure không được để slot bị giữ sai.
- Approve route phải lưu quyết định Manager, `originalApprovedEta` nếu lần đầu, phát checklist sync/readiness event sau commit.
- Insurance evidence và verification thuộc Flow 2 Specialist; Flow 3 chỉ lưu/đọc readiness projection, không có Coordinator InsuranceWrite hoặc Manager InsuranceVerify.
- Confirm Operations READY phải lưu actor/routeVersionId/assignmentVersion/flightBooking reference đúng snapshot, recheck trước commit và phát event sau commit.
- Confirm Documents READY (Flow 2) phải ràng buộc checklist/insurance version, recheck đúng phạm vi và phát event sau commit.
- Route/flight change làm thay đổi ETA phải revalidate hồ sơ, tài nguyên và bảo hiểm; không dùng “last write wins”.

### 20.3. Database uniqueness/checks tham khảo

| Object | Ràng buộc mong đợi |
|---|---|
| `RouteVersion` | Unique `(tripId,version)`, một Draft edit active/trip |
| `RoutePoint` | Unique `(routeVersionId,sequence)`, `checkpointId` FK nếu áp dụng |
| `RouteLeg` | FK points cùng route; từ/to tương ứng kế cận |
| `Vehicle` | Unique `plateNumber` sau normalize |
| `VehicleReservation` | No valid overlapping allocation for same vehicle/time (checked transactionally) |
| `StaffAssignment` | No same required role duplicate in same leg; no time overlap |
| `HorseStallAllocation` | Unique `(legId,vehicleId,stallNumber)` và không double-assign horse cùng leg |
| `FlightBooking` | Giữ lịch sử/phiên bản và active booking reference theo trip/service |
| `InsurancePolicy` (Flow 2) | Giữ version/evidence, trạng thái xác minh do Specialist chịu trách nhiệm; Flow 3 chỉ FK/projection nếu cần |
| `ReadinessConfirmation` | `tripId`, `kind` (OPERATIONS/DOCUMENTS), source versions, actor/time, validity; không thay enum TripStatus |
| `TripReadiness` | Cache/projection dựa điều kiện và version nguồn; có timestamp evaluation |

DB constraint cụ thể phụ thuộc SQL Server/EF Core; bảng trên là điều kiện nhất quán dữ liệu, không ép lớp Infrastructure/Domain dùng đúng tên physical tables.

### 20.4. Timezone, distance, map privacy

- Lịch bay, planned arrivals, resource schedule lưu instant có timezone; hiển thị theo múi giờ local từng điểm nếu cần; không so UTC string không parse.
- Không tính DISTANCE thực tế từ đường chim bay cho ROAD. Khi map service không dùng được, manualDistance/manualDuration hiển thị nguồn thủ công để Manager đánh giá.
- Không phát sự kiện tọa độ định kỳ; timeline Flow 4 chỉ thay đổi bằng milestone/ETA được ghi nhận đúng quyền.

---

## 21. Acceptance Tests – Coordinator route/fleet/assignment

| Test ID | Kịch bản | Expected result |
|---|---|---|
| `F03-T01` | Trip chưa ACTIVATED | Không cho tạo Route; 409 INVALID_STATE |
| `F03-T02` | Trip chưa confirm deployment | Không cho submit Route; 409 DEPLOYMENT_NOT_CONFIRMED |
| `F03-T03` | Deployment ON_HOLD | Không cho thay đổi planning khi hold; GET vẫn xem theo quyền |
| `F03-T04` | VN→VN road only | Không sinh checkpoint JP/air leg không có trong yêu cầu |
| `F03-T05` | VN→JP direct air | Route nối sân bay VN–JP bằng AIR trực tiếp |
| `F03-T06` | VN→TH / JP→VN | Reject UNSUPPORTED_ROUTE |
| `F03-T07` | Tuyến quốc tế quá cảnh KH/TH | Reject INVALID_DIRECT_FLIGHT / UNSUPPORTED_ROUTE |
| `F03-T08` | AIR nối điểm không là AIRPORT | Reject LEG_MODE_INVALID |
| `F03-T09` | Route points sequence trùng/bị ngắt | Reject validation; không lưu route lỗi cấu trúc |
| `F03-T10` | Tạo Draft Route | 201 status DRAFT; không tạo Trip thứ hai |
| `F03-T11` | POST Draft lặp do mạng | Idempotency; không tạo phiên bản ngẫu nhiên |
| `F03-T12` | Tạo 2 Draft cùng Trip | 409 ROUTE_DRAFT_EXISTS |
| `F03-T13` | PUT pending Route | 409 ROUTE_NOT_EDITABLE |
| `F03-T14` | PUT returned Route | Bản returned giữ audit; tạo new Draft version |
| `F03-T15` | Edit với expectedVersion cũ | 409 ROUTE_VERSION_CONFLICT |
| `F03-T16` | Map calculate không lưu | 200 preview có legs, ETA, validation; DB không có route mới |
| `F03-T17` | Map service không phản hồi | distanceSource UNAVAILABLE + xử lý thủ công/503 hợp lệ |
| `F03-T18` | Nhập quãng đường thủ công hợp lệ | distanceSource MANUAL, audit nguồn; FE không hiện GPS |
| `F03-T19` | Quãng đường thủ công thiếu | Cảnh báo MANUAL_DISTANCE_REQUIRED, không submit |
| `F03-T20` | Nghỉ/lái quá ngưỡng cấu hình | Reject CONTINUOUS_DRIVE_EXCEEDED |
| `F03-T21` | ETA vượt deliveryDeadline | Warning và bắt deadlineJustification khi submit |
| `F03-T22` | Submit Route hợp lệ | PENDING_APPROVAL + Specialist checklist FINAL sync |
| `F03-T23` | Checklist sau submit chưa duyệt | Không tự checklist READY |
| `F03-T24` | Manager return với reason | RETURNED, Coordinator nhận cảnh báo |
| `F03-T25` | Manager return thiếu reason | 400 VALIDATION_ERROR |
| `F03-T26` | Manager approve Route mới nhất | APPROVED; originalApprovedEta set lần đầu |
| `F03-T27` | Approve route cũ/sai version | 409 ROUTE_VERSION_CONFLICT |
| `F03-T28` | Approve Route lần thứ hai | Không overwrite originalApprovedEta |
| `F03-T29` | Manager approve nhưng thiếu documents | Trip vẫn PLANNING |
| `F03-T30` | Vehicle capacity thấp hơn số ngựa | Assignment validate false; 409 khi PUT |
| `F03-T31` | Hai ngựa chung stall | Reject DUPLICATE_STALL |
| `F03-T32` | Xe maintenance/expired registration | Reject vehicle allocation, báo reassignment |
| `F03-T33` | Trùng lịch tài xế/xe | Reject RESOURCE_SCHEDULE_CONFLICT at PUT |
| `F03-T34` | Chỉ có MAIN_DRIVER, thiếu CO_DRIVER | Reject MISSING_CO_DRIVER |
| `F03-T35` | Thiếu VETERINARIAN | Reject MISSING_VETERINARIAN |
| `F03-T36` | Cùng user làm cả MAIN_DRIVER và VET | Reject independent-role constraint |
| `F03-T37` | ESCORT không có vet certificate | Reject QUALIFICATION_REQUIRED |
| `F03-T38` | Thay stall capacity làm mất readiness | Trip trước departure về PLANNING; alert |
| `F03-T39` | PUT assignments sau preview đã cũ | Recheck resource conflict tại commit |
| `F03-T40` | Trip AIR thiếu booking | FLIGHT_BOOKING_CONFIRMED false |
| `F03-T41` | Ghi booking nhưng ngân sách chưa duyệt | Reject FLIGHT_BUDGET_NOT_APPROVED |
| `F03-T42` | Booking đổi giờ bay | Revalidate route ETA/assignments; rút Operations READY, báo Flow 2 đánh giá checklist/bảo hiểm |
| `F03-T43` | Specialist upload policy mới ở Flow 2 | Policy chờ kiểm tra, `Documents READY` không được coi là đạt; Coordinator không được yêu cầu upload lại |
| `F03-T44` | Policy thiếu một Horse | Specialist/Flow 2 không xác nhận hồ sơ đạt; tổng readiness false |
| `F03-T45` | Policy không bao phủ khoảng vận chuyển thực tế | Flow 2 từ chối/đánh dấu không hợp lệ; Documents READY false |
| `F03-T46` | Route approved; Coordinator và Specialist cùng confirm đúng snapshot; mọi điều kiện thật sự đạt | Trip auto READY_TO_DEPART |
| `F03-T47` | Một điều kiện mất trước departure | Trip về PLANNING, ghi audit và notification |
| `F03-T48` | Sau IN_TRANSIT có điều kiện đổi | Không tự lùi trạng thái; dùng Flow 5 |
| `F03-T49` | Driver chưa có milestone, ETA quá tại Flow 4 | Cảnh báo ngay, không giả lập GPS |
| `F03-T50` | Customer gọi coordinator API | 403 FORBIDDEN_ROLE |
| `F03-T51` | Coordinator tìm cách gọi endpoint upload/xác minh policy | Không có quyền trong Flow 3; nếu gọi Flow 2 trả 403 FORBIDDEN_ROLE |
| `F03-T52` | SignalR bị replay/reconnect | FE GET lại route/readiness; không tự cập nhật state |
| `F03-T53` | Trip VN→JP bàn giao sau sân bay JP | Phải có ROAD leg tại JP và Coordinator phân công đầy đủ xe/tài xế/vet/ngựa cho chặng đó |
| `F03-T54` | Specialist Clearance HELD ở Flow 2 | Không coi milestone PASS là chứng cứ thông quan |
| `F03-T55` | Booking air có airport không thuộc route | Reject booking-route mismatch |
| `F03-T56` | Nguồn lực JP đã có nhưng chưa được phân công | Readiness false; Coordinator vẫn phải lưu `vehicleId`, staff và stall allocations cho JP ROAD leg |

| `F03-T57` | Chỉ Coordinator xác nhận Operations READY, Specialist chưa OK | Trip PLANNING, `DOCUMENTS_CONFIRMED` false |
| `F03-T58` | Chỉ Specialist xác nhận Documents READY, Coordinator chưa OK | Trip PLANNING, `OPERATIONS_CONFIRMED` false |
| `F03-T59` | Coordinator bấm confirm khi leg ROAD JP chưa được phân công | `409 OPERATIONS_NOT_READY`; không set Operations READY |
| `F03-T60` | Nguồn lực JP AVAILABLE nhưng chưa có assignment | Operations READY false, không tự phân công |
| `F03-T61` | Coordinator confirm sau khi thay vehicle làm stale assignmentVersion | `409 OPERATIONS_CONFIRMATION_STALE`; reload/confirm lại |
| `F03-T62` | Cả hai OK nhưng Manager chưa APPROVED Route | Trip PLANNING, thiếu ROUTE_APPROVED |
| `F03-T63` | Specialist đã confirm nhưng policy mất hiệu lực trước departure | Documents READY invalidated; Trip về PLANNING và thông báo |
| `F03-T64` | Coordinator đã confirm, sau đó flight schedule/route version thay đổi | Operations READY invalidated; revalidate/reconfirm, không dùng snapshot cũ |
| `F03-T65` | Coordinator POST confirm trùng cùng snapshot | Idempotent, một confirmation hiện hành, không tạo trùng Trip |
| `F03-T69` | Booking đổi lịch trên cùng `flightBookingId` nhưng tăng `bookingVersion` | Confirm cũ stale; Coordinator phải revalidate và xác nhận lại nếu bị ảnh hưởng |
| `F03-T70` | PUT booking với `expectedBookingVersion` cũ | `409 FLIGHT_BOOKING_VERSION_CONFLICT`, không ghi đè lịch của người khác |
| `F03-T71` | Manager Hold khi Trip đã READY_TO_DEPART nhưng chưa departed | Trip re-evaluate về PLANNING; đang IN_TRANSIT thì Flow 1 Hold từ chối |
| `F03-T66` | Cả hai xác nhận hợp lệ; route approved; đã khởi hành milestone | Trip IN_TRANSIT qua Flow 4; không nhảy IN_TRANSIT tại Confirm |
| `F03-T67` | Documents READY không có bảo hiểm thực tế dù Contract đã gồm phí | Backend không READY_TO_DEPART |
| `F03-T68` | Coordinator sửa staff sau khi Trip đã IN_TRANSIT | Không cho qua Flow 3; chuyển Flow 5 nếu là sự cố |

**Nguyên tắc test:** mỗi acceptance case có cả positive/negative test ở BE (policy + DB + concurrency) và FE (disabled/enabled state + hiển thị lỗi). Test integration giữa Flow 2/3 phải kiểm tra Route Version and Checklist Version khớp; giữa Flow 3/4 phải kiểm tra Trip ready/departed; giữa Flow 3/5 phải kiểm tra sửa route sau khởi hành qua Incident.

---

## 22. Endpoint Inventory – kiểm soát coverage

| Prefix | ID | Endpoint | Trạng thái tài liệu |
|---|---|---|---|
| `/api` | `F03-C01` | `GET /coordinator/dashboard` | Kế thừa |
| `/api` | `F03-C02` | `GET /coordinator/planning-trips` | Kế thừa |
| `/api` | `F03-C03` | `GET /coordinator/trips/{tripId}` | Kế thừa |
| `/api` | `F03-C04` | `GET /coordinator/checkpoints` | Kế thừa Flow 2 |
| `/api` | `F03-C05` | `POST /coordinator/routes/calculate` | Kế thừa |
| `/api` | `F03-C06` | `GET /coordinator/trips/{tripId}/routes` | Kế thừa |
| `/api` | `F03-C07` | `GET /coordinator/routes/{routeVersionId}` | Kế thừa |
| `/api` | `F03-C08` | `POST /coordinator/trips/{tripId}/routes` | Kế thừa |
| `/api` | `F03-C09` | `PUT /coordinator/routes/{routeVersionId}` | Kế thừa |
| `/api` | `F03-C10` | `POST /coordinator/routes/{routeVersionId}/submit` | Kế thừa |
| `/api` | `F03-C11` | `GET /coordinator/vehicles` | Kế thừa |
| `/api` | `F03-C12` | `GET /coordinator/vehicles/{vehicleId}` | Kế thừa |
| `/api` | `F03-C13` | `POST /coordinator/vehicles` | Kế thừa |
| `/api` | `F03-C14` | `PUT /coordinator/vehicles/{vehicleId}` | Kế thừa |
| `/api` | `F03-C15` | `PATCH /coordinator/vehicles/{vehicleId}/status` | Kế thừa |
| `/api` | `F03-C16` | `GET /coordinator/vehicles/{vehicleId}/schedule` | Kế thừa |
| `/api` | `F03-C17` | `GET /coordinator/vehicles/available` | Kế thừa |
| `/api` | `F03-C18` | `GET /coordinator/staff` | Kế thừa |
| `/api` | `F03-C19` | `GET /coordinator/staff/{userId}/schedule` | Kế thừa |
| `/api` | `F03-C20` | `GET /coordinator/trips/{tripId}/assignments` | Kế thừa |
| `/api` | `F03-C21` | `POST /coordinator/trips/{tripId}/assignments/validate` | Kế thừa |
| `/api` | `F03-C22` | `PUT /coordinator/trips/{tripId}/assignments` | Kế thừa |
| `/api` | `F03-C23` | `GET /coordinator/trips/{tripId}/flight-booking` | BỔ SUNG |
| `/api` | `F03-C24` | `PUT /coordinator/trips/{tripId}/flight-booking` | BỔ SUNG |
| `/api` | `F03-C25` | `GET /coordinator/trips/{tripId}/operations-readiness` | BỔ SUNG |
| `/api` | `F03-C26` | `POST /coordinator/trips/{tripId}/operations-readiness/confirm` | BỔ SUNG |
| `/api` | `F03-C27` | `GET /coordinator/trips/{tripId}/departure-conditions` | BỔ SUNG |
| `/api` | `F03-M01` | `GET /manager/planning` | Kế thừa |
| `/api` | `F03-M02` | `GET /manager/trips/{tripId}/route` | Kế thừa |
| `/api` | `F03-M03` | `POST /manager/trips/{tripId}/routes/{routeVersionId}/approve` | Kế thừa |
| `/api` | `F03-M04` | `POST /manager/trips/{tripId}/routes/{routeVersionId}/return` | Kế thừa |
| `/api` | `F03-M05` | `GET /manager/trips/{tripId}/insurance` | Kế thừa |
| `/api` | `F03-M06` | `GET /manager/trips/{tripId}/departure-conditions` | Kế thừa (trước đây `F03-M07`) |

**Endpoint thuộc Flow 2 – chỉ tham chiếu, KHÔNG đếm là Coordinator API:** `GET/POST /specialist/trips/{tripId}/insurance`, `POST /specialist/trips/{tripId}/insurance/{policyId}/verify`, `POST /specialist/trips/{tripId}/documents-readiness/confirm`. Các API này cần được bổ sung/đồng bộ trong Flow 2 khi sửa tiếp. Không xóa logic bảo hiểm của hệ thống, chỉ chuyển owner sang Specialist.

**Lưu ý:** `GET /coordinator/checkpoints` dùng chung catalog Flow 2. Các API `[BỔ SUNG]` chưa có trong Role API cũ **không được coi là đã implement**. Không tạo `/flow3/*`; đồng bộ endpoint và schema vào Coordinator/Manager Role API và OpenAPI trước triển khai.

---

## 23. Kiểm tra tích hợp FE/BE và quy tắc dữ liệu

### 23.1. FE – Coordinator

1. Chỉ hiển thị planning Trip có deployment thích hợp; lấy `allowedActions`, không tự bật nút theo status rút gọn.
2. Bản đồ route hiển thị marker mỗi RoutePoint, đường ROAD polyline khi có `path`, chặng AIR là ký hiệu tuyến bay kế hoạch; không hiển thị GPS thật.
3. Giữ Draft form local trong quá trình sửa, nhưng mọi action Save/Submit phải gọi BE; khi 409 stale version reload/hỏi người dùng trước overwrite.
4. Khi thêm, xóa, đổi thứ tự điểm → `POST /routes/calculate` để dự báo ETA và warnings; không hiển thị số giả làm thời gian thực.
5. Assignment sử dụng preview validation và lịch xe/staff; sai thì hiển thị theo legId/vehicleId/userId, không bỏ qua lỗi.
6. Khi kết quả validation Server đổi, `PUT` có thể bị 409 dù FE vừa preview pass; dùng lỗi để reload dữ liệu.
7. Sau route submit, booking, staff changes, Coordinator confirmation hoặc Specialist documents confirmation → refresh readiness; không tự set `TripStatus`. Coordinator không upload hoặc đọc file insurance.
8. Khi mất kết nối SignalR → reconnect và reload current Route/Assignments/Readiness.

### 23.2. BE – Services / Clean Architecture

- **Controller:** xác thực/validate request shape/điều phối command, trả envelope; không trực tiếp tính hoặc phê duyệt bằng string do FE gửi.
- **Application:** `RoutePlanningService` tính/version/submit; `FleetService` quản lý xe; `ResourceAssignmentService` phân công; `FlightBookingService` lưu bằng chứng thuê bay; `OperationsReadinessService` xác nhận điều phối; `TripReadinessService` đánh giá điều kiện. `InsuranceService` lưu/xác minh thuộc Flow 2 và cung cấp read model liên hệ. Tên class là gợi ý, không áp đặt cấu trúc cụ thể.
- **Domain:** state machine, invariant, owner/role, route/leg identity, resource reservation, snapshot, `originalApprovedEta`.
- **Infrastructure:** database/transaction, mapping provider, file storage private, SignalR, background jobs/outbox.
- Giao diện dịch vụ đối tác map/booking nếu chưa chọn provider phải có failure path rõ và test bằng fake data; không hardcode tọa độ/hãng bay để giả tạo điều kiện sẵn sàng.

### 23.3. Đồng bộ mô hình dữ liệu

```text
TransportRequest (ACTIVATED) 1 : 1 Trip
Trip 1 : N RouteVersion
RouteVersion 1 : N RoutePoint + RouteLeg
RouteVersion 1 : N LegAssignments (theo version có hiệu lực)
Trip 1 : N InsurancePolicyVersion (Flow 2 quản lý)
Trip 1 : N FlightBookingVersion (khi AIR)
Trip 1 : N ChecklistVersion (Flow 2 theo RouteVersion)
Trip 1 : N ReadinessConfirmations (OPERATIONS / DOCUMENTS theo version)
Trip 1 : N TripReadinessEvaluations
```

- Request không trở thành ROUTE_APPROVED status, Trip không trở thành `CHECKLIST_READY` status: những mục đó là condition/projection.
- Mỗi `Trip` được tạo từ Flow 1 đúng một lần; Route Version không được tạo thêm Trip mới.
- `FlightBooking` không tạo `AIRCRAFT` trong danh mục Vehicle nội bộ.

---

## 24. Danh mục cần đồng bộ và tiêu chí chốt Flow 3

### 24.1. Các hợp đồng liên quan

| Tài liệu | Phần cần đồng bộ khi đưa vào sử dụng |
|---|---|
| `00-conventions.md` | Enums giữ nguyên, Route/TripStatus, no-GPS; SignalR events, ownership, versioning |
| `04-manager-api.md` | Manager planning, route approve/return, departure conditions, approved flight budget; **bỏ Manager insurance verify**, giữ policy overview read-only |
| Coordinator Role API (`Markdown đã dán (3).md`) | Bỏ VN→TH/KH, GPS/polling, mốc lái cứng; bỏ Coordinator insurance upload/verify; thêm Operations READY; phân công ROAD VN/JP và AIR |
| `flow-02-legal-quarantine-customs-api.md` | Specialist sở hữu insurance upload/verify + Documents READY, checklist FINAL đúng Route Version; xác nhận không thay route approval |
| Flow 1 v2.3 | Trip PLANNING, deployment CONFIRMED, preliminary plan và budget đã được Manager duyệt |
| Driver/Escort API + Flow 4 | Trip READY_TO_DEPART → manual departure milestone; staff view đúng assignments, không GPS |
| Flow 5 | Thay lộ trình/xe/người sau IN_TRANSIT từ Incident Proposal và Manager approval |

### 24.2. Giá trị cấu hình, không là Business Rule mới

- Provider bản đồ, geocoding, bảng checkpoint có tọa độ, thuật toán route/ETA.
- Giới hạn lái liên tục, nghỉ ngơi, giờ tài xế, sức chứa tính cả stall/payload, vùng bảo hiểm được chấp nhận.
- Bảng giá dịch vụ bay/đối tác, lịch bay thực tế, số người đi kèm theo điều kiện hãng, tài liệu yêu cầu.
- Nguồn lực xe/người tại Nhật trong danh mục có thể điều phối, giấy tờ hợp lệ để vận hành tại JP, và lịch sử phân công theo từng ROAD leg; demo giả định có đủ nguồn lực, **không giả định phân công tự động**.
- Chính sách đổi lịch ảnh hưởng lịch nguồn lực, độ chính xác ETA, cách tính distance thủ công.

Các cấu hình do nguồn vận hành/công ty quản lý; không được biến con số từ ví dụ thành quy tắc không được duyệt.

### 24.3. Checklist nghiệm thu trước khi nhóm dùng

1. Mỗi endpoint trong Inventory có role, method, path, validation, response/error, side effect; các API bổ sung đã đồng bộ với Role/API Controller.
2. Không còn route hợp lệ KH/TH hoặc VN→JP quá cảnh trong ví dụ/case. Chỉ `VN→VN`, `VN→JP`.
3. Route Version & TripStatus phân biệt tuyệt đối; route được duyệt không tự thành READY nếu còn thiếu tài nguyên/hồ sơ.
4. Bảo hiểm được công ty thu xếp ngoài hệ thống và Specialist xác minh trong Flow 2; Manager chỉ duyệt Route; Coordinator không thao tác policy. Booking dựa chứng từ thực.
5. **Coordinator phân công ROAD cho cả VN lẫn JP** (xe, MAIN_DRIVER, CO_DRIVER, VETERINARIAN, horse/stall); AIR có bác sĩ thú y và booking; không tạo vet role độc lập.
6. Original ETA bảo toàn; preview/polyline không phải GPS; milestone actual ở Flow 4 và incident route update ở Flow 5.
7. Route/assignments/booking/operations confirmation có version/audit; checklist/insurance/documents confirmation thuộc Flow 2; SignalR sau commit; FE nhận 409 biết refresh.
8. Các tình huống UAT Chương 21 được pass trong test FE/BE liên vai trò.

**Version:** `v1.1` – API Contract Flow 3 cập nhật phân quyền bảo hiểm và xác nhận 2 bên; các nghiệp vụ đã chốt được đưa trực tiếp vào endpoint và state machine. Tài liệu này là bản thiết kế để đồng bộ Role API; **không khẳng định tính pháp lý/điều kiện hãng bay thực tế đã được kiểm tra**, và không khẳng định endpoint đã được implement.

