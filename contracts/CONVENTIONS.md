# Quy ước chung toàn bộ API (API Conventions)

> **Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Quốc gia (SWP391)**  
> File quy ước duy nhất áp dụng cho toàn bộ API Contract giữa Frontend (FE) và Backend (BE).  
> Cả hai phía FE và BE phải đọc và tuân thủ file này trước khi triển khai hoặc tích hợp.

---

## 1. Base URL và quy tắc Route

```env
VITE_API_URL=http://localhost:5000/api
```

Mọi endpoint trong hệ thống được viết **sau `/api`**.  
*Ví dụ:* `POST /auth/login` tương ứng với `POST http://localhost:5000/api/auth/login`.

| Prefix | Phân quyền truy cập | Phạm vi nghiệp vụ |
|---|---|---|
| `/auth/*` | Public / Khách vãng lai | Đăng ký, đăng nhập, OTP, quên/đặt lại mật khẩu |
| `/public/*` | Public | Tra cứu quốc gia, tuyến đường, quy định công khai |
| `/customer/*` | `CUSTOMER` | Khách hàng: Quản lý ngựa, tạo/theo dõi đơn, hợp đồng, thanh toán, nghiệm thu |
| `/manager/*` | `LOGISTICS_MANAGER` | Quản lý: Duyệt đơn, giá, hợp đồng, đối soát thanh toán, điều phối, sự cố |
| `/specialist/*` | `TRANSPORT_SPECIALIST` | Chuyên viên: Hồ sơ kiểm dịch, pháp lý, checklist, thông quan hải quan |
| `/coordinator/*` | `FLEET_COORDINATOR` | Điều phối: Xe, tài xế, trạm dừng, chuyến bay, lộ trình |
| `/driver/*` | `DRIVER`, `ESCORT` | Hiện trường: Xác nhận mốc hành trình, nhật ký sức khỏe ngựa, sự cố |
| `/files/*` | Đã xác thực theo quyền | Tải lên (`POST /files/upload`) và truy xuất tệp chứng từ/hình ảnh |
| `/notifications/*` | Đã xác thực | Danh sách, đánh dấu đã đọc thông báo của tài khoản |

### Nguyên tắc bảo mật & phân quyền:
- **Xác thực qua Token:** Mọi thông tin `userId`, `role` được lấy trực tiếp từ JWT Access Token. Backend **không tin cậy** `customerId` hay `role` được truyền qua Body hoặc Query.
- **Kiểm tra quyền sở hữu:** Nếu khách hàng truy cập tài nguyên (đơn hàng, ngựa, hợp đồng) không thuộc quyền sở hữu của mình → trả về HTTP `404 NOT_FOUND` (để tránh lộ sự tồn tại của dữ liệu).
- **Sai Role:** Trả về HTTP `403 FORBIDDEN_ROLE`.
- **Bác sĩ thú y:** Sử dụng tài khoản có role `ESCORT`, vị trí phân công `VETERINARIAN` và chứng chỉ hợp lệ.

---

## 2. Request Headers

```http
Authorization: Bearer <accessToken>
Accept: application/json
Content-Type: application/json
```

- Các API public không cần header `Authorization`.
- Khi upload file (`multipart/form-data`): **Trình duyệt tự động sinh header `Content-Type` cùng boundary**. Frontend không tự ý set cứng `Content-Type: multipart/form-data`.

---

## 3. Response Envelope chuẩn

Mọi API phản hồi từ Backend **bắt buộc** bọc trong cấu trúc envelope đồng nhất sau:

### 3.1. Phản hồi Thành công (200 OK / 201 Created)

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {}
}
```

- `success`: Luôn là `true`.
- `message`: Chuỗi thông điệp thông báo kết quả.
- `data`: Chứa payload kết quả (object, array hoặc primitive).
- Với danh sách: `data` có thể là mảng `[]` trực tiếp hoặc object phân trang (xem mục 3.3).

### 3.2. Phản hồi Lỗi (4xx / 5xx)

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "departureDate": ["Ngày khởi hành không được trong quá khứ"],
    "horses": ["Phải chọn ít nhất 1 ngựa"]
  }
}
```

- `success`: Luôn là `false`.
- `message`: Chuỗi mô tả lỗi hiển thị thân thiện trên UI.
- `errorCode`: Mã lỗi chuẩn (viết HOA, phân tách bằng `_`) để Frontend rẽ nhánh logic nếu cần.
- `data`: Luôn là `null`.
- `errors`: Dictionary chứa danh sách lỗi chi tiết theo từng field (chỉ xuất hiện khi có lỗi xác thực dữ liệu).

### 3.3. Quy ước Danh sách và Phân trang

Khi trả về danh sách có phân trang:

```json
{
  "success": true,
  "message": "Lấy danh sách thành công",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3
  }
}
```

- Tham số Query chuẩn: `page` (bắt đầu từ 1, mặc định 1), `pageSize` (mặc định 20, tối đa 100), `q` (tìm kiếm từ khóa).
- Khi danh sách trống: `items` trả về `[]`, không trả về `null`.

---

## 4. Quy chuẩn Mã định danh (ID Naming Rules)

Toàn bộ ID nội bộ dạng chuỗi trong hệ thống tuân theo quy tắc:

```text
<TIỀN_TỐ>_<SỐ_THỨ_TỰ>
```

1. **Format số:** Bắt đầu từ `1`, hiển thị tối thiểu 3 chữ số: `001`, `002`, ..., `999`, `1000`, `1001` (dùng `D3` trong C#).
2. **Backend tự cấp phát:** Số thứ tự được sinh tự động bởi Sequence trong Database / Backend. Frontend tuyệt đối không tự cấp mã ID tạm thời rồi gửi lên lưu DB.
3. **Tính bất biến:** Mã định danh đã cấp không được phép thay đổi, không tái sử dụng mã khi xóa dữ liệu.
4. **Không nhúng dữ liệu nghiệp vụ:** Không nhúng ngày, tháng, năm, vai trò vào mã ID (ví dụ: dùng `USER_001`, không dùng `USR_CUST_2026_01`).

### Danh sách tiền tố ID chuẩn:

| Bảng / Đối tượng | Khóa chính (PK) | Tiền tố | Ví dụ |
|---|---|---|---|
| `USER` | `UserID` | `USER` | `USER_001` |
| `HORSE` | `HorseID` | `HORSE` | `HORSE_001` |
| `STAFF_DOCUMENT` | `DocumentID` | `STAFF_DOCUMENT` | `STAFF_DOCUMENT_001` |
| `NOTIFICATION` | `NotificationID` | `NOTIFICATION` | `NOTIFICATION_001` |
| `POLICY_AND_TERM` | `PolicyID` | `POLICY_TERM` | `POLICY_TERM_001` |
| `PARTNER_FACILITY` | `FacilityID` | `FACILITY` | `FACILITY_001` |
| `SUPPORTED_ROUTE` | `RouteID` | `ROUTE` | `ROUTE_001` |
| `TRANSPORT_REQUEST` | `RequestID` | `REQUEST` | `REQUEST_001` |
| `REQUEST_STATUS_HISTORY` | `HistoryID` | `REQ_HISTORY` | `REQ_HISTORY_001` |
| `HORSE_PROFILE_DOCUMENT` | `DocumentID` | `HORSE_DOC` | `HORSE_DOC_001` |
| `CONTRACT` | `ContractID` | `CONTRACT` | `CONTRACT_001` |
| `CONTRACT_FEEDBACK` | `FeedbackID` | `FEEDBACK` | `FEEDBACK_001` |
| `INVOICE` | `InvoiceID` | `INVOICE` | `INVOICE_001` |
| `PAYMENT_TRANSACTION` | `PaymentID` | `PAYMENT` | `PAYMENT_001` |
| `TRIP` | `TripID` | `TRIP` | `TRIP_001` |
| `TRIP_STATUS_HISTORY` | `HistoryID` | `TRIP_HISTORY` | `TRIP_HISTORY_001` |
| `HANDOFF_EVENT` | `HandoffEventID` | `HANDOFF_EVENT` | `HANDOFF_EVENT_001` |
| `BUSINESS_POLICY` | `PolicyID` | `BUSINESS_POLICY` | `BUSINESS_POLICY_001` |
| `VEHICLE` | `VehicleID` | `VEHICLE` | `VEHICLE_001` |
| `INCIDENT` | `IncidentID` | `INCIDENT` | `INCIDENT_001` |
| `COMPLAINT` | `ComplaintID` | `COMPLAINT` | `COMPLAINT_001` |

> **Lưu ý về phiên bản hợp đồng (Contract Version):**  
> Mỗi hợp đồng có một `ContractID` duy nhất (`CONTRACT_001`). Các lần chỉnh sửa hợp đồng tăng `VersionNo` (số nguyên `1`, `2`, `3`). Không tạo mã ContractID mới khi sửa hợp đồng.

---

## 5. Quy chuẩn Định dạng Dữ liệu & Tiền tệ

- **Tiền tệ:** Đơn vị tính thống nhất là **VND (Việt Nam Đồng)**, lưu số nguyên đồng (Backend xử lý kiểu `decimal`).
- **Thời gian:**
  - Date (ngày): `YYYY-MM-DD` (ví dụ: `2026-11-20`).
  - Datetime hiển thị API: `YYYY-MM-DD HH:mm` theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - GMT+7).
  - Database lưu: UTC (`UtcDateTime`).
- **File đính kèm:** Định dạng `.pdf`, `.jpg`, `.jpeg`, `.png`. Kích thước tối đa mặc định **10MB/file**.

---

## 6. HTTP Status Codes & Error Codes chuẩn

| HTTP Status | Trường hợp sử dụng | Ví dụ `errorCode` |
|---|---|---|
| `200 OK` | Lấy dữ liệu thành công / Cập nhật thành công | — |
| `201 Created` | Tạo mới tài nguyên thành công | — |
| `400 Bad Request` | Thiếu trường bắt buộc, sai định dạng, dữ liệu đầu vào không hợp lệ | `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `INVALID_FORMAT` |
| `401 Unauthorized` | Thiếu token, token hết hạn, sai email hoặc mật khẩu | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| `403 Forbidden` | Không đúng role, chưa xác minh email, tài khoản bị khóa | `FORBIDDEN_ROLE`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_INACTIVE` |
| `404 Not Found` | Không tìm thấy tài nguyên hoặc không thuộc quyền sở hữu | `NOT_FOUND` |
| `409 Conflict` | Xung đột trạng thái nghiệp vụ (đơn đã xử lý, trùng lịch ngựa, hết hạn) | `INVALID_STATE`, `HORSE_SCHEDULE_CONFLICT`, `CONTRACT_EXPIRED`, `DEPOSIT_NOT_VERIFIED` |
| `429 Too Many Requests` | Vượt giới hạn gửi OTP hoặc gửi yêu cầu quá nhanh | `RATE_LIMITED` |
| `500 Internal Server Error` | Lỗi máy chủ chưa được xử lý | `INTERNAL_ERROR` |

---

## 7. Các Enum nghiệp vụ chính

### 7.1. Roles
- `CUSTOMER`: Khách hàng vận chuyển
- `LOGISTICS_MANAGER`: Quản lý Logistics & Hợp đồng
- `TRANSPORT_SPECIALIST`: Chuyên viên Pháp lý & Kiểm dịch
- `FLEET_COORDINATOR`: Điều phối viên Đội xe & Tuyến đường
- `DRIVER`: Tài xế vận chuyển
- `ESCORT`: Nhân viên đi kèm / Bác sĩ thú y

### 7.2. Trạng thái Request (`RequestStatus`)
`PENDING` → `CHANGES_REQUESTED` → `ACCEPTED` → `AWAITING_CONTRACT` → `AWAITING_DEPOSIT` → `ACTIVATED` → `CLOSED`  
*(Nhánh kết thúc: `REJECTED`, `CANCELLED`)*

### 7.3. Trạng thái Hợp đồng (`ContractStatus`)
`DRAFT` → `PENDING_SIGNATURE` → `SIGNED` → `EFFECTIVE`  
*(Nhánh phụ: `SUPERSEDED` khi có bản mới, `EXPIRED`, `TERMINATED`)*

### 7.4. Trạng thái Chuyến đi (`TripStatus`)
`PLANNING` → `READY_TO_DEPART` → `IN_TRANSIT` → `COMPLETED`  
*(Cờ tạm dừng: `ON_HOLD`)*

### 7.5. Trạng thái Giao dịch (`TransactionStatus`)
`PENDING_CONFIRMATION` → `SUCCESS`  
*(Nhánh lỗi: `FAILED`, `CANCELLED`, `REJECTED`)*

---

## 8. Chuẩn API Xác thực & Dùng chung (Authentication & Shared)

### 8.1. Đăng nhập (`POST /auth/login`)
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123@"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "d8f9e1...",
      "user": {
        "userId": "USER_001",
        "email": "customer@example.com",
        "fullName": "Nguyễn Văn A",
        "role": "CUSTOMER",
        "phoneNumber": "0912345678"
      }
    }
  }
  ```

### 8.2. Tải lên tệp chứng từ (`POST /files/upload`)
- **Headers:** `Authorization: Bearer <token>`, Body dạng `multipart/form-data`.
- **Form Data:** field `file` chứa file binary.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Tải lên tệp thành công",
    "data": {
      "fileId": "FILE_001",
      "fileName": "horse_passport.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 1048576,
      "url": "/api/files/FILE_001"
    }
  }
  ```

---

## 9. Cập nhật thời gian thực (SignalR)

- **Hub URL:** `/api/hubs/updates`
- **Sự kiện chính:**
  - `NotificationCreated`: Có thông báo mới
  - `RequestUpdated`: Cập nhật trạng thái yêu cầu vận chuyển
  - `TripUpdated`: Cập nhật tiến độ chuyến đi
  - `PaymentUpdated`: Cập nhật trạng thái thanh toán / cọc
- **Nguyên tắc:** Sự kiện SignalR chỉ mang tính chất thông báo cho FE gọi lại REST API tương ứng để làm mới dữ liệu; không dùng SignalR để truyền toàn bộ dữ liệu giao dịch hay thay thế REST API.
