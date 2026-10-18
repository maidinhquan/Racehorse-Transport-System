# 00 – Quy ước chung cho toàn bộ API

> **Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Quốc gia (SWP391)**  
> Áp dụng cho `01-shared-api.md` đến `06-driver-api.md`. FE và BE cần đọc file này trước khi tích hợp.

## 1. Base URL và quy tắc route

```env
VITE_API_URL=http://localhost:5000/api
```

Mọi endpoint trong các file contract được viết **sau** `/api`. Ví dụ: `POST /auth/login` tương ứng `POST http://localhost:5000/api/auth/login` tại môi trường phát triển.

| Prefix | Role được phép gọi | Phạm vi |
|---|---|---|
| `/auth/*` | Public, trừ endpoint yêu cầu đăng nhập | Đăng ký, OTP, đăng nhập, quên/đặt lại mật khẩu |
| `/public/*` | Public | Quốc gia được hỗ trợ, tra cứu quy định công khai |
| `/account/*`, `/notifications/*`, `/tasks/*`, `/files/*`, `/master/*` | Người dùng đã đăng nhập, theo quyền cụ thể của endpoint | Dữ liệu dùng chung |
| `/customer/*` | `CUSTOMER` | Chức năng khách hàng |
| `/specialist/*` | `TRANSPORT_SPECIALIST` | Pháp lý, hồ sơ, kiểm dịch, thông quan |
| `/manager/*` | `LOGISTICS_MANAGER` | Quản lý và phê duyệt |
| `/coordinator/*` | `FLEET_COORDINATOR` | Phương tiện, lộ trình, nhân sự, lịch trình |
| `/driver/*` | `DRIVER`, `ESCORT` | Tác nghiệp hiện trường trên **Responsive Web** |

- Sai role: HTTP `403` với `errorCode: "FORBIDDEN_ROLE"`.
- Đúng role nhưng chưa được phân công hoặc không đủ chuyên môn: `403 NOT_ASSIGNED` hoặc `403 QUALIFICATION_REQUIRED`, tùy nguyên nhân.
- Khách hàng truy cập tài nguyên không thuộc sở hữu: trả `404 NOT_FOUND`, tránh tiết lộ sự tồn tại của tài nguyên.
- **Không suy ra quyền chỉ từ URL hoặc role**: BE phải kiểm tra quyền sở hữu, Trip/chặng được phân công, trạng thái nghiệp vụ và chuyên môn tương ứng ở từng thao tác.
- Bác sĩ thú y **không có role đăng nhập riêng**: dùng `ESCORT`, có vị trí phân công `VETERINARIAN` và hồ sơ chứng chỉ đã xác minh. Chỉ bác sĩ đủ điều kiện, được phân công đúng Trip/chặng mới được thực hiện tác vụ đòi hỏi chuyên môn thú y.

## 2. Header

```http
Authorization: Bearer <accessToken>
Accept: application/json
Content-Type: application/json
Accept-Language: vi
```

- Các endpoint Public không yêu cầu `Authorization`, trừ khi contract của endpoint quy định khác.
- Với upload: `Content-Type: multipart/form-data` **do trình duyệt tự thiết lập kèm boundary**; FE không tự gán header `Content-Type` thủ công khi gửi `FormData`.
- `Accept-Language` quyết định ngôn ngữ `message`; khi không truyền, mặc định `en` theo contract hiện tại. FE không dựa vào `message` để xử lý logic.
- Với các thao tác quan trọng hoặc có khả năng gửi lại do mạng chập chờn, BE phải áp dụng cơ chế chống gửi trùng phù hợp tại từng endpoint.

## 3. Response envelope

**Thành công:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {}
}
```

**Thất bại:**

```json
{
  "success": false,
  "message": "Microchip ID already registered",
  "errorCode": "HORSE_MICROCHIP_DUPLICATE",
  "data": null,
  "errors": {
    "microchipId": ["Microchip ID already registered"]
  }
}
```

- `success` là `boolean`; `message` dùng để hiển thị cho người dùng.
- `data` chứa dữ liệu thành công; khi lỗi là `null`.
- `errorCode` là mã ổn định để FE xử lý; không dùng chuỗi `message` để rẽ nhánh.
- `errors` chỉ được trả khi có lỗi xác thực dữ liệu ở từng trường: dictionary tên field -> danh sách message, khớp `ApiResponse<T>` đang chạy. Không đổi các API cũ sang array để tích hợp Flow 1. `errorCode` mới là optional để tương thích callers cũ.
- Các endpoint hiện có được giữ envelope `success` / `message` / `data`; các trường lỗi bổ sung không làm thay đổi cấu trúc thành công.

**Danh sách có phân trang:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalItems": 135,
    "totalPages": 7
  }
}
```

Quy ước query: `page` (mặc định `1`), `pageSize` (mặc định `20`, tối đa `100`), `q` (từ khóa), `sort` (ví dụ `createdAt:desc`). API riêng có thể bổ sung filter phù hợp; danh sách giá trị hợp lệ phải mô tả trong contract từng endpoint.

### 3.1. Các API chi tiết và `allowedActions`

Các API chi tiết của Request, Quote, Contract, Trip, Incident và Acceptance **nên** trả `allowedActions` bên trong `data`, theo quyền và trạng thái tại thời điểm đọc:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": 15,
    "status": "AWAITING_DEPOSIT",
    "allowedActions": ["VIEW_CONTRACT", "PAY_DEPOSIT", "REQUEST_CANCELLATION"]
  }
}
```

FE hiển thị/khóa hành động theo danh sách này, **không tự suy luận chỉ từ `status`**. BE phải kiểm tra điều kiện một lần nữa khi xử lý request vì trạng thái có thể đã thay đổi. `allowedActions` không cấp quyền bảo mật thay cho authorization trên BE.

## 4. HTTP status và lỗi nghiệp vụ

| HTTP | Khi sử dụng | `errorCode` ví dụ |
|---|---|---|
| `200` | Thành công truy vấn/cập nhật/thao tác nghiệp vụ | — |
| `201` | Tạo tài nguyên mới | — |
| `400` | Request thiếu dữ liệu, sai định dạng, file không hợp lệ | `VALIDATION_ERROR`, `FILE_TOO_LARGE` |
| `401` | Thiếu/sai/hết hạn token; email hoặc mật khẩu đăng nhập không đúng | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| `403` | Không có quyền, chưa được phân công, không đủ chuyên môn, tài khoản không đủ điều kiện | `FORBIDDEN_ROLE`, `NOT_ASSIGNED`, `QUALIFICATION_REQUIRED`, `ACCOUNT_INACTIVE`, `EMAIL_NOT_VERIFIED` |
| `404` | Không tìm thấy hoặc không được phép biết tài nguyên tồn tại | `NOT_FOUND` |
| `409` | Xung đột trạng thái, phiên bản hoặc quy tắc nghiệp vụ | `INVALID_STATE`, `HORSE_SCHEDULE_CONFLICT`, `QUOTE_EXPIRED`, `DEPARTURE_NOT_READY` |
| `429` | Gửi OTP hoặc thao tác bị giới hạn tần suất | `RATE_LIMITED` |
| `500` | Lỗi nội bộ | `INTERNAL_ERROR` |

Quy ước áp dụng:

- Customer chưa xác minh email **không được đăng nhập**: `403 EMAIL_NOT_VERIFIED`.
- Không cho thao tác chuyển trạng thái nếu chưa đủ điều kiện. Ví dụ: chưa xác nhận tiền cọc không thể kích hoạt Request; Trip thiếu bảo hiểm không thể `READY_TO_DEPART`.
- Với lỗi dữ liệu đầu vào, dùng `400 VALIDATION_ERROR`; với dữ liệu hợp lệ nhưng **không hợp lệ tại trạng thái hiện tại**, dùng `409 INVALID_STATE`.
- Khi đối tượng vừa được người khác cập nhật, FE phải tải lại dữ liệu và `allowedActions` thay vì tiếp tục sử dụng trạng thái cũ.
- Tên mã lỗi chuyên biệt có thể được bổ sung trong contract theo role nhưng phải nhất quán giữa FE và BE.

## 5. Upload file và kiểm soát quyền truy cập

### 5.1. Định dạng và giới hạn

- Chấp nhận `application/pdf`, `image/jpeg`, `image/png`.
- Mặc định tối đa **10 MB/tệp** và **10 tệp/giấy tờ**; có thể cấu hình.
- Ảnh hiện trường nên nén về ≤ 2 MB trước khi tải lên, nhưng BE vẫn kiểm tra giới hạn tối đa.
- BE kiểm tra MIME thực tế, kích thước, quyền truy cập và loại tài liệu; không chỉ dựa vào tên hoặc phần mở rộng.

### 5.2. Dữ liệu lồng nhau kèm tệp

Dùng `multipart/form-data`, phần `payload` chứa JSON dạng chuỗi và các phần `files` chứa tệp:

```text
payload = {"documentTypeId":3,"documentNumber":"VN-HC-2026-001"}
files   = passport_p1.pdf
files   = passport_p2.jpg
```

Các biểu mẫu đơn giản có thể dùng multipart field thông thường nếu endpoint mô tả rõ.

**File object:**

```json
{
  "fileId": 901,
  "fileName": "passport_p1.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 524288,
  "url": "/api/files/901",
  "uploadedAt": "2026-10-12T04:29:00Z"
}
```

`GET /files/{fileId}` cần token và phải kiểm tra quyền theo Horse/Request/Trip và tài liệu đã được cấp quyền, không chỉ dựa vào việc biết `fileId`.

## 6. Enum dùng chung

### 6.1. Role

| Giá trị | Ý nghĩa | Trang mặc định sau login |
|---|---|---|
| `CUSTOMER` | Khách hàng | `/customer/home` |
| `TRANSPORT_SPECIALIST` | Chuyên viên Thủ tục & Kiểm dịch | `/specialist/dashboard` |
| `LOGISTICS_MANAGER` | Quản lý Logistics | `/manager/dashboard` |
| `FLEET_COORDINATOR` | Điều phối viên Đội xe & Lộ trình | `/coordinator/dashboard` |
| `DRIVER` | Tài xế | `/driver/trips` |
| `ESCORT` | Nhân viên đi kèm, bao gồm bác sĩ thú y đủ điều kiện | `/driver/trips` |

### 6.2. RequestStatus

| Giá trị | Nhãn |
|---|---|
| `PENDING` | Chờ Manager xử lý |
| `CHANGES_REQUESTED` | Manager yêu cầu chỉnh sửa đơn |
| `ACCEPTED` | Đã tiếp nhận |
| `QUOTING` | Đang báo giá/thương lượng |
| `AWAITING_CONTRACT` | Chờ ký hợp đồng |
| `AWAITING_DEPOSIT` | Đã ký, chờ xác nhận tiền cọc |
| `ACTIVATED` | Đã kích hoạt, có Trip |
| `CLOSED` | Hoàn tất nghiệm thu, thanh toán và đối soát |
| `REJECTED` | Bị Manager từ chối |
| `CANCELLED` | Đã hủy theo quy trình |

**Không sử dụng `EXPIRED` để tự động kết thúc Request** khi một phiên bản Quote/Contract hết hạn. Thời hạn thuộc về từng phiên bản.

### 6.3. TripStatus

| Giá trị | Nhãn |
|---|---|
| `PLANNING` | Đang chuẩn bị triển khai/lập kế hoạch |
| `READY_TO_DEPART` | Sẵn sàng khởi hành |
| `IN_TRANSIT` | Đang vận chuyển |
| `COMPLETED` | Đã bàn giao toàn bộ ngựa |

**Không sử dụng `AWAITING_ACCEPTANCE` hoặc `COMPLAINT_PENDING` làm TripStatus.** Đây là nghiệp vụ hậu bàn giao.

### 6.4. Báo giá, hợp đồng, thanh toán và nghiệm thu

| Enum | Giá trị |
|---|---|
| `QuoteStatus` | `DRAFT`, `SENT`, `ADJUSTMENT_REQUESTED`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`, `EXPIRED` |
| `ContractStatus` | `DRAFT`, `PENDING_SIGNATURE`, `SIGNED`, `EFFECTIVE`, `SIGN_DECLINED`, `SUPERSEDED`, `EXPIRED`, `TERMINATED` |
| `PaymentStatus` (tổng hợp của Request) | `UNPAID`, `PENDING_CONFIRMATION`, `DEPOSIT_PAID`, `PARTIALLY_PAID`, `FULLY_PAID` |
| `ReceivableType` | `DEPOSIT`, `BALANCE`, `EXTRA_COST` |
| `TransactionStatus` | `SUCCESS`, `FAILED`, `CANCELLED`, `PENDING_CONFIRMATION`, `REJECTED` |
| `PaymentMethod` | `ONLINE_GATEWAY`, `BANK_TRANSFER`, `CASH` |
| `AcceptanceStatus` | `PENDING`, `AWAITING_PAYMENT`, `PAYMENT_PROCESSING`, `DISPUTED`, `ACCEPTED` |

- Hợp đồng `SIGNED` là đã ký; `EFFECTIVE` chỉ khi điều kiện tiền cọc đã xác nhận được đáp ứng. `TERMINATED` chỉ dùng khi đã có quyết định hủy/chấm dứt hợp lệ theo hợp đồng.
- `PaymentStatus` là trạng thái tổng hợp, không thay thế lịch sử từng giao dịch/đợt thu. `FULLY_PAID` phải căn cứ vào **số tiền thực tế còn phải thu sau điều chỉnh hợp lệ**, không chỉ số tiền gốc.
- `AcceptanceStatus` kết hợp `isOverdue`/`dueAt`; quá hạn không đồng nghĩa tự động nghiệm thu.

### 6.5. Ngựa, tài liệu và checklist

| Enum | Giá trị |
|---|---|
| `HorseStatus` | `ACTIVE`, `INACTIVE` |
| `HorseSex` | `STALLION`, `MARE`, `GELDING`, `COLT`, `FILLY` |
| `DocumentStatus` | `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUPERSEDED` |
| `DocumentGroup` | `MEDICAL`, `QUARANTINE`, `CUSTOMS` |
| `DocumentScope` | `PER_HORSE`, `PER_TRIP` |
| `ChecklistItemStatus` | `NOT_SUBMITTED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED` |
| `ChecklistStatus` | `NOT_READY`, `READY` |
| `RegulationDirection` | `EXPORT`, `IMPORT`, `TRANSIT`, `DOMESTIC` |
| `ClearanceResult` | `PASSED`, `HELD`, `FAILED` |

- Specialist có thể chuẩn bị **checklist sơ bộ** từ kế hoạch sơ bộ do Manager lập. Khi tuyến/cửa khẩu được xác nhận, checklist được rà soát và hoàn thiện thành bản áp dụng cho chuyến.
- Hồ sơ được phê duyệt có thể hết hạn; trước khi khởi hành BE phải kiểm tra lại điều kiện áp dụng thực tế.

### 6.6. Lộ trình, phương tiện, phân công và bảo hiểm

| Enum | Giá trị |
|---|---|
| `TransportMode` | `ROAD`, `AIR` |
| `RouteStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RETURNED` |
| `RoutePointType` | `ORIGIN`, `REST_STOP`, `FUEL_STOP`, `CHECKPOINT`, `AIRPORT`, `QUARANTINE_STATION`, `DESTINATION` |
| `CheckpointType` | `LAND_BORDER`, `AIRPORT`, `QUARANTINE_STATION` |
| `VehicleStatus` | `READY`, `MAINTENANCE`, `INACTIVE` |
| `AssignmentRole` | `MAIN_DRIVER`, `CO_DRIVER`, `ESCORT`, `VETERINARIAN` |
| `InsuranceVerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED` |

Quy tắc phân công:

- Chặng đường bộ: tài xế chính (`MAIN_DRIVER`), tài xế phụ kiêm chăm sóc (`CO_DRIVER`) và **bác sĩ thú y** (`VETERINARIAN`). Một cá nhân không được tính là hai vị trí độc lập bắt buộc trong cùng chặng.
- Chặng hàng không: bác sĩ thú y (`VETERINARIAN`) đi kèm ngựa theo điều kiện hãng bay; máy bay/dịch vụ hàng không do bên thứ ba cung cấp. Demo chỉ hỗ trợ **chuyến bay thẳng**.
- `VETERINARIAN` là **vị trí phân công**, không phải account role. Account được phân công vị trí này phải có role `ESCORT` và chứng chỉ hợp lệ.
- Manager phê duyệt phương án/ngân sách thuê chuyến bay; Coordinator đặt dịch vụ và ghi nhận lịch bay thủ công. Specialist kiểm tra tài liệu liên quan.
- Bảo hiểm bắt buộc cho mỗi Trip; trạng thái `VERIFIED` chỉ đạt khi đã kiểm tra danh sách ngựa, thời hạn, điều kiện và phạm vi bảo hiểm phù hợp. Khoản bồi thường bảo hiểm không được tự động coi là đã thu.

### 6.7. Hiện trường, sự cố và khiếu nại

| Enum | Giá trị |
|---|---|
| `MilestoneType` | `DEPARTED`, `ARRIVED_STOP`, `LEFT_STOP`, `ARRIVED_CHECKPOINT`, `PASSED_CHECKPOINT`, `ARRIVED_DESTINATION` |
| `FlightMilestoneType` | `FLIGHT_DEPARTED`, `FLIGHT_ARRIVED` |
| `HorseCondition` | `NORMAL`, `MONITOR`, `ABNORMAL` |
| `IncidentType` | `VEHICLE_BREAKDOWN`, `BORDER_DELAY`, `BAD_WEATHER`, `TRAFFIC_ACCIDENT`, `HORSE_HEALTH`, `CUSTOMS_HOLD`, `OTHER` |
| `IncidentSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `IncidentStatus` | `NEW`, `IN_PROGRESS`, `PLAN_APPROVED`, `CLOSED` |
| `PlanStatus` | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `APPLIED` |
| `CostPayer` | `COMPANY`, `CUSTOMER`, `INSURANCE` |
| `ComplaintType` | `MISSING_HORSE`, `HEALTH_CONDITION`, `OTHER` |
| `ComplaintStatus` | `NEW`, `IN_PROGRESS`, `PENDING_CUSTOMER_CONFIRMATION`, `ESCALATED`, `RESOLVED` |

- Driver/Escort chỉ xác nhận milestone thuộc chặng được phân công; **không gửi vị trí GPS 5 phút/lần**.
- `FlightMilestoneType` do Coordinator ghi nhận thủ công từ thông tin hãng bay. Xác nhận ngựa giao cho hãng và tình trạng khi đến là nhiệm vụ chuyên môn của bác sĩ thú y.
- Khi sự cố nguy hiểm tới sức khỏe ngựa, bác sĩ thú y xử lý trong phạm vi chuyên môn ngay khi cần; Driver/Escort bảo đảm an toàn trước rồi báo Manager sớm nhất có thể.
- Điều chỉnh tuyến, xe, nhân sự hoặc chi phí phát sinh theo quy trình phê duyệt Manager; không làm gián đoạn biện pháp cứu hộ khẩn cấp.
- `CostPayer = INSURANCE` chỉ phản ánh bên dự kiến/được xác định chịu chi phí theo hồ sơ; **không đồng nghĩa doanh nghiệp bảo hiểm đã duyệt hoặc chuyển tiền**. Tiền được bảo hiểm chấp thuận và tiền thực nhận phải lưu riêng.
- Khiếu nại được tạo trong thời hạn quy định; `RESOLVED` cần thỏa thuận được Customer xác nhận hoặc quyết định bên ngoài có tính ràng buộc kèm bằng chứng.

## 7. Cập nhật realtime bằng SignalR

**Sử dụng ASP.NET Core SignalR ngay từ giai đoạn Demo**, thay cho polling định kỳ. SignalR dùng để thông báo **những thay đổi do người dùng/hệ thống ghi nhận**; không triển khai GPS tự động, không suy diễn vị trí xe theo thời gian thực.

### 7.1. Kết nối và xác thực

- **Hub dự kiến:** `/api/hubs/updates` (đường dẫn SignalR Hub, **không phải endpoint REST GET**; SignalR sử dụng cơ chế negotiate và kết nối transport phù hợp). FE kết nối bằng `@microsoft/signalr`; BE cấu hình ASP.NET Core SignalR. Endpoint này cần được thống nhất với `01-shared-api.md` trước khi triển khai.
- FE dùng `accessTokenFactory` để cấp JWT cho kết nối; BE xác thực token và kiểm tra quyền đối với mọi nhóm dữ liệu được đăng ký. Với transport cần truyền token qua query string, BE chỉ chấp nhận trên đường dẫn Hub, bật HTTPS ở môi trường triển khai và tránh ghi access token vào log.
- Khi mất kết nối, FE **tự kết nối lại**; sau khi kết nối lại, tải lại dữ liệu hiện tại bằng REST và khôi phục các đăng ký nhóm theo quyền. Khi token hết hạn hoặc quyền phân công thay đổi, phải xác thực lại trước khi nhận sự kiện.
- Hub **không tự cấp quyền**: không tin `userId`, `role`, `tripId` do client tự khai để vào group. Mọi quyền phải dựa trên danh tính đã xác thực và kiểm tra ownership/assignment ở BE.

### 7.2. Sự kiện và màn hình nhận cập nhật

| Sự kiện từ BE → FE | Màn hình liên quan | FE xử lý |
|---|---|---|
| `NotificationCreated` | Badge, danh sách thông báo | Tải lại số thông báo chưa đọc/danh sách thông báo |
| `RequestUpdated` | Customer Request; Manager duyệt đơn | Tải lại đơn và `allowedActions` |
| `TripUpdated` | Tracking của Customer; điều phối; hiện trường | Tải lại timeline, milestone, ETA và trạng thái Trip |
| `IncidentUpdated` | Manager, Coordinator, nhân sự được phân công | Tải lại chi tiết sự cố/cảnh báo |
| `DocumentUpdated` | Customer, Specialist | Tải lại checklist/hồ sơ được phép truy cập |
| `PaymentUpdated` | Customer; Manager | Tải lại thanh toán, công nợ thuộc phạm vi quyền |
| `ComplaintUpdated` | Customer; Manager | Tải lại tiến độ giải quyết khiếu nại |
| `AssignmentUpdated` | Coordinator, Driver/Escort | Tải lại danh sách Trip/chặng được phân công và quyền truy cập |

Tên sự kiện trong bảng là **hợp đồng đề xuất** giữa FE–BE; payload cụ thể được thống nhất trong API contract tương ứng. Không giả định các sự kiện/Hub đã được code sẵn.

Ví dụ payload sự kiện tối thiểu, không nhúng hồ sơ y tế hay dữ liệu tài chính nhạy cảm:

```json
{
  "entityId": 15,
  "occurredAt": "2026-11-20T08:15:00Z",
  "version": 3
}
```

- BE chỉ phát sự kiện **sau khi lưu nghiệp vụ thành công**. Payload thông báo ngắn gọn nhằm báo FE tải lại dữ liệu; **REST API vẫn là nguồn dữ liệu chính thức**.
- Phạm vi phát phải giới hạn theo tài khoản (`user:{id}`), Trip (`trip:{id}`) và/hoặc người được phân quyền. Group là cơ chế định tuyến thông báo, **không thay thế kiểm tra quyền**.
- Chỉ Manager được nhận thông tin doanh thu, chi phí và lợi nhuận toàn hệ thống; không đưa dữ liệu đó vào broadcast chung. Customer chỉ nhận sự kiện liên quan đến đơn/Trip của mình; Driver/Escort chỉ nhận sự kiện liên quan chặng/chuyến được giao.
- Khi quyền được thu hồi hoặc nhân sự bị gỡ phân công, BE phải ngừng phát dữ liệu cho kết nối đó, cập nhật tư cách thành viên group và từ chối truy cập REST tương ứng.

### 7.3. Quy tắc hiển thị và xử lý mất kết nối

- Khi mở page, FE thiết lập đăng ký SignalR rồi gọi REST để lấy trạng thái hiện tại, tránh bỏ lỡ cập nhật giữa lúc tải dữ liệu. Khi nhận sự kiện, FE tải lại resource bị thay đổi (có thể debounce để tránh gọi trùng).
- Sau reconnect, FE gọi lại REST để đồng bộ các thay đổi bị bỏ lỡ; không giả định SignalR lưu hàng đợi sự kiện khi client offline.
- Nếu kết nối SignalR tạm thời không khả dụng, FE hiển thị trạng thái mất kết nối và cho phép người dùng **tải lại thủ công**; không bắt buộc dùng polling định kỳ.
- **Trip Tracking chỉ thể hiện milestone đã xác nhận thủ công, tuyến polyline, các marker, ETA và mốc cập nhật gần nhất.** SignalR không có nghĩa có GPS/live location.
- Mỗi action qua REST vẫn phải kiểm tra role, assignment, business state và `allowedActions` tại BE; sự kiện SignalR không được dùng để xác nhận giao dịch hay chuyển trạng thái thay cho API nghiệp vụ.

## 8. Danh sách file API Contract

| File | Nội dung |
|---|---|
| `00-conventions.md` | Quy ước chung – file này |
| `01-shared-api.md` | Auth, Account, Notifications, Tasks, Files, Master Data, dữ liệu public |
| `02-customer-api.md` | Customer |
| `03-specialist-api.md` | Transport Specialist |
| `04-manager-api.md` | Logistics Manager |
| `05-coordinator-api.md` | Fleet & Route Coordinator |
| `06-driver-api.md` | Driver/Escort, bao gồm tác nghiệp bác sĩ thú y theo phân công |
| `README.md` | Tổng quan, bảng Page → API và kế hoạch Sprint |

---

**Ghi chú đồng bộ:** Các file `01`–`06` đang sử dụng enum/trạng thái cũ phải được rà soát và sửa theo tài liệu này; riêng đường dẫn endpoint chi tiết vẫn theo contract của từng role. Không suy diễn rằng endpoint mới đã được triển khai chỉ vì quy tắc có mặt tại đây.
