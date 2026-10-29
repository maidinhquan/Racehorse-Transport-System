# Chỉ dẫn API — Role: Customer (Khách hàng)

Sự cố dùng [Flow 5](../../API-Flow/Flow5/FLOW5.md), J29–J33/J36/J38/J41: xem thông tin được chia sẻ và phản hồi đúng đề nghị; không thu thêm phí sự cố. [Flow 6 v1.1](../../API-Flow/Flow6/FLOW6.md) quy định nghiệm thu trước trả số dư, giải quyết vấn đề trước nghiệm thu, Manager đóng sau đủ nghĩa vụ; không tự nghiệm thu/đóng vì im lặng.

Theo dõi hành trình/sức khỏe sau duyệt khởi hành dùng [Flow 4](../../API-Flow/Flow4/FLOW4.md), F4-J32–J34 (29/10/2026): chỉ đơn/ngựa của khách, projection và file đã chia sẻ; không GPS realtime. Schema role cũ không thay schema Flow 4. Bàn giao/nghiệm thu/thanh toán dùng Flow 6 hiện hành.

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 2.1 — Bản đồ Tra cứu & Điều hướng Role (Navigation & Integration Matrix) |
| Ngày cập nhật | 26/10/2026 |
| Dự án | Racehorse Transport System |
| Định hướng kiến trúc | Phương án 2: Tinh gọn Role Index — Tham chiếu trực tiếp nguồn chuẩn [FLOW1.md](../../API-Flow/Flow1/FLOW1.md) |
| Phạm vi | Toàn bộ giao diện cổng Khách hàng (`frontend/src/features/customer`) |
| Schema máy đọc | [customer.openapi.json](customer.openapi.json) |
| Nguồn chuẩn chi tiết (Single Source of Truth) | [contracts/API-Flow/Flow1/FLOW1.md](../../API-Flow/Flow1/FLOW1.md) |

---

## 1. Hành trình Nghiệp vụ của Khách hàng

Tài liệu này đóng vai trò là **Bản đồ chỉ dẫn tích hợp (Role Guide)** dành riêng cho Frontend và Backend khi phát triển cổng Khách hàng. Toàn bộ đặc tả chi tiết từng byte wire payload JSON, tham số headers và mã lỗi HTTP được quản lý tập trung duy nhất tại **[FLOW1.md](../../API-Flow/Flow1/FLOW1.md)** nhằm tránh trùng lặp tài liệu.

```text
[1. Quản lý Hồ sơ & Danh bạ Ngựa]
   Khách hàng cập nhật thông tin cá nhân
   → Khai báo ngựa (Hộ chiếu, Microchip 15 số, Tiêm phòng cúm, Kiểm tra sức khỏe, Định giá VND)

[2. Wizard Tạo Yêu cầu Vận chuyển]
   Bước 1: Chọn Tuyến đường, Ngày xuất phát mong muốn, Chăm sóc đặc biệt
   → Bước 2: Nhập Điểm nhận & Điểm giao (kèm Geocoding tọa độ)
   → Bước 3: Chọn Ngựa khả dụng theo ngày (kiểm tra xung đột lịch & cảnh báo hồ sơ), ghi chú từng ngựa
   → Bước 4: Kiểm tra Checklist hồ sơ giấy tờ → Nộp đơn chính thức (Chuyển sang PENDING_REVIEW)

[3. Đàm phán Hợp đồng, Đặt cọc & Ký số OTP]
   Manager phát hành Hợp đồng chính thức (kèm snapshot giá và điều khoản)
   ├─ Nếu có sai sót: Khách hàng gửi Yêu cầu chỉnh sửa (Feedback) → Manager xử lý
   └─ Nếu đồng ý: Khách hàng Xác nhận điều khoản (Accept Terms)
      → Khách hàng Thanh toán tiền cọc (VNPay)
      → Hệ thống xác minh tiền cọc thành công (DEPOSIT_VERIFIED)
      → Khách hàng nhận OTP qua SMS/Email và thực hiện Ký số hợp đồng
      → Yêu cầu chuyển sang ACTIVATED; Hệ thống tự động sinh Chuyến đi (TRIP_*) ở trạng thái PLANNING

[4. Bổ sung Hồ sơ & Theo dõi Chuyến đi]
   Khách hàng nộp bổ sung giấy tờ nếu có yêu cầu từ Transport Specialist
   → Khi tổ xe xuất phát: Khách hàng theo dõi tiến độ theo các mốc thực tế mà tổ xe xác nhận

[5. Bàn giao, Nghiệm thu, Thanh toán Số dư & Đóng yêu cầu]
   Tổ xe đến nơi và thực hiện biên bản bàn giao điện tử (kèm ảnh chụp thực tế)
   → Khách hàng kiểm tra và Xác nhận Nghiệm thu (Acceptance trong vòng 24 giờ)
   → Khách hàng Thanh toán 60% số dư hợp đồng còn lại (VNPay)
   → Nếu có sự cố: Khách hàng gửi Khiếu nại dịch vụ (Complaint)
   → Sau khi nghiệm thu, giải quyết xong khiếu nại và thanh toán đủ → Yêu cầu được Đóng (CLOSED)
```

---

## 2. Bảng ánh xạ Màn hình Giao diện → API & Mã Endpoint chuẩn

Bảng dưới đây quy định chính xác từng màn hình/component trong Frontend cổng Khách hàng sẽ gọi API nào, kèm mã endpoint tương ứng trong **[FLOW1.md](../../API-Flow/Flow1/FLOW1.md)** để tra cứu nhanh wire payload:

| Màn hình / Component | Route UI | Thao tác người dùng | Method & URL | Mã Endpoint trong FLOW1.md |
|---|---|---|---|---|
| **Header & Layout** | Mọi trang | Lấy thông tin tài khoản | `GET /customer/profile` | [`F1-J01`](../../API-Flow/Flow1/FLOW1.md#f1-j01--get-customerprofile) |
| | | Xem danh sách thông báo | `GET /customer/notifications` | [`F1-J03`](../../API-Flow/Flow1/FLOW1.md#f1-j03--get-customernotifications) |
| | | Đánh dấu đọc 1 thông báo | `POST /customer/notifications/{id}/read` | [`F1-J62`](../../API-Flow/Flow1/FLOW1.md#f1-j62--post-customernotificationsnotificationidread) |
| | | Đánh dấu đọc tất cả | `POST /customer/notifications/read-all` | [`F1-J63`](../../API-Flow/Flow1/FLOW1.md#f1-j63--post-customernotificationsread-all) |
| **Trang chủ Khách hàng** | `/customer` | Tổng quan yêu cầu & ngựa | `GET /customer/requests`<br>`GET /customer/horses` | [`F1-J22`](../../API-Flow/Flow1/FLOW1.md#f1-j22--get-customerrequests)<br>[`F1-J02`](../../API-Flow/Flow1/FLOW1.md#f1-j02--get-customerhorses) |
| **Quản lý Ngựa của tôi** | `/customer/horses` | Danh sách ngựa cá nhân | `GET /customer/horses` | [`F1-J02`](../../API-Flow/Flow1/FLOW1.md#f1-j02--get-customerhorses) |
| **Thêm / Sửa Ngựa** | `/customer/horses/new`<br>`/customer/horses/:id/edit` | Khai báo ngựa mới | `POST /customer/horses` | [`F1-J12`](../../API-Flow/Flow1/FLOW1.md#f1-j12--post-customerhorses) |
| | | Cập nhật hồ sơ ngựa | `PUT /customer/horses/{id}` | [`F1-J13`](../../API-Flow/Flow1/FLOW1.md#f1-j13--put-customerhorseshorseid) |
| | | Tải file đính kèm (hộ chiếu, cúm...) | `POST /customer/horses/{id}/files/{kind}` | [`F1-J15`](../../API-Flow/Flow1/FLOW1.md#f1-j15--post-customerhorseshorseidfileskind) |
| **Wizard Tạo Đơn (Bước 1)** | `/customer/requests/new` | Lấy options tuyến & chính sách | `GET /customer/request-form-options` | [`F1-J09`](../../API-Flow/Flow1/FLOW1.md#f1-j09--get-customerrequest-form-options) |
| | | Khởi tạo đơn nháp | `POST /customer/requests` | [`F1-J18`](../../API-Flow/Flow1/FLOW1.md#f1-j18--post-customerrequests) |
| **Wizard Tạo Đơn (Bước 2 & 3)** | | Tìm kiếm địa chỉ & tọa độ | `GET /locations/search` | [`F1-J08`](../../API-Flow/Flow1/FLOW1.md#f1-j08--get-locationssearch) |
| | | Lọc ngựa khả dụng theo ngày | `GET /customer/horses/selectable` | [`F1-J14`](../../API-Flow/Flow1/FLOW1.md#f1-j14--get-customerhorsesselectable) |
| | | Lưu điểm nhận/giao & danh sách ngựa | `PUT /customer/requests/{id}` | [`F1-J19`](../../API-Flow/Flow1/FLOW1.md#f1-j19--put-customerrequestsrequestid) |
| **Wizard Tạo Đơn (Bước 4)** | | Kiểm tra checklist hồ sơ | `GET /customer/requests/{id}/document-checklist` | [`F1-J23`](../../API-Flow/Flow1/FLOW1.md#f1-j23--get-customerrequestsrequestiddocument-checklist) |
| | | Nộp đơn chính thức để duyệt | `POST /customer/requests/{id}/submit` | [`F1-J20`](../../API-Flow/Flow1/FLOW1.md#f1-j20--post-customerrequestsrequestidsubmit) |
| **Danh sách & Chi tiết Yêu cầu** | `/customer/requests`<br>`/customer/requests/:id` | Danh sách yêu cầu | `GET /customer/requests` | [`F1-J22`](../../API-Flow/Flow1/FLOW1.md#f1-j22--get-customerrequests) |
| | | Chi tiết toàn diện đơn | `GET /customer/requests/{id}` | [`F1-J25`](../../API-Flow/Flow1/FLOW1.md#f1-j25--get-customerrequestsrequestid) |
| | | Khách hàng yêu cầu hủy đơn | `POST /customer/requests/{id}/cancel` | [`F1-J21`](../../API-Flow/Flow1/FLOW1.md#f1-j21--post-customerrequestsrequestidcancel) |
| **Tab Hợp đồng & Chi phí** | `/customer/requests/:id/contract` | Xem hợp đồng & snapshot giá | `GET /customer/requests/{id}/contract` | [`F1-J33`](../../API-Flow/Flow1/FLOW1.md#f1-j33--get-customerrequestsrequestidcontract) |
| | | Tải file PDF bản in chính thức | `GET /customer/contracts/{id}/versions/{v}/pdf` | [`F1-J36`](../../API-Flow/Flow1/FLOW1.md#f1-j36--get-customercontractscontractidversionsversionnopdf) |
| | | Đồng ý điều khoản hợp đồng | `POST /customer/contracts/{id}/accept-terms` | [`F1-J37`](../../API-Flow/Flow1/FLOW1.md#f1-j37--post-customercontractscontractidaccept-terms) |
| | | Gửi yêu cầu chỉnh sửa hợp đồng | `POST /customer/contracts/{id}/feedback` | [`F1-J38`](../../API-Flow/Flow1/FLOW1.md#f1-j38--post-customercontractscontractidfeedback) |
| **Thanh toán Tiền cọc** | `/customer/requests/:id/deposit` | Xem hóa đơn đặt cọc | `GET /customer/requests/{id}/deposit` | [`F1-J42`](../../API-Flow/Flow1/FLOW1.md#f1-j42--get-customerrequestsrequestiddeposit) |
| | | Tạo phiên thanh toán VNPay | `POST /customer/invoices/{id}/payment-session` | [`F1-J43`](../../API-Flow/Flow1/FLOW1.md#f1-j43--post-customerinvoicesinvoiceidpayment-session) |
| | | Kiểm tra kết quả giao dịch cọc | `GET /customer/payments/{id}/status` | [`F1-J44`](../../API-Flow/Flow1/FLOW1.md#f1-j44--get-customerpaymentspaymentidstatus) |
| **Ký số bằng mã OTP** | `/customer/requests/:id/sign` | Gửi mã OTP xác thực | `POST /customer/contracts/{id}/sign-otp` | [`F1-J50`](../../API-Flow/Flow1/FLOW1.md#f1-j50--post-customercontractscontractidsign-otp) |
| | | Xác thực OTP & Ký số | `POST /customer/contracts/{id}/sign` | [`F1-J51`](../../API-Flow/Flow1/FLOW1.md#f1-j51--post-customercontractscontractidsign) |
| **Theo dõi Chuyến đi** | `/customer/tracking`<br>`/customer/requests/:id/tracking` | Danh sách chuyến đang chạy | `GET /customer/tracking` | [`F1-J67`](../../API-Flow/Flow1/FLOW1.md#f1-j67--get-customertracking) |
| | | Tiến độ & mốc hành trình | `GET /customer/requests/{id}/tracking` | [`F1-J68`](../../API-Flow/Flow1/FLOW1.md#f1-j68--get-customerrequestsrequestidtracking) |
| **Bàn giao & Nghiệm thu** | `/customer/requests/:id/handover` | Xem biên bản bàn giao điện tử | `GET /customer/requests/{id}/handover` | [`F1-J69`](../../API-Flow/Flow1/FLOW1.md#f1-j69--get-customerrequestsrequestidhandover) |
| | | Xác nhận nghiệm thu dịch vụ | `POST /customer/contracts/{id}/acceptance` | [`F1-J70`](../../API-Flow/Flow1/FLOW1.md#f1-j70--post-customercontractscontractidacceptance) |
| **Thanh toán Số dư** | | Tạo phiên VNPay số dư 60% | `POST /customer/contracts/{id}/balance-payment` | [`F1-J71`](../../API-Flow/Flow1/FLOW1.md#f1-j71--post-customercontractscontractidbalance-payment) |
| **Khiếu nại Dịch vụ** | `/customer/requests/:id/complaints` | Gửi khiếu nại sự cố/dịch vụ | `POST /customer/complaints` | [`F1-J72`](../../API-Flow/Flow1/FLOW1.md#f1-j72--post-customercomplaints) |
| | | Danh sách khiếu nại của đơn | `GET /customer/requests/{id}/complaints` | [`F1-J73`](../../API-Flow/Flow1/FLOW1.md#f1-j73--get-customerrequestsrequestidcomplaints) |
| | | Xem chi tiết phản hồi khiếu nại | `GET /customer/complaints/{id}` | [`F1-J74`](../../API-Flow/Flow1/FLOW1.md#f1-j74--get-customercomplaintscomplaintid) |

---

## 3. Quy tắc Nghiệp vụ Dành riêng cho Khách hàng (Business Rules)

### 3.1. Ràng buộc Khóa Hồ sơ Ngựa (`HORSE_LOCKED_FIELDS`)
- Khi một con ngựa đang tham gia vào bất kỳ đơn vận chuyển nào chưa kết thúc (`PENDING_REVIEW`, `CONTRACT_PREPARATION`, `CONTRACT_READY`, `DEPOSIT_VERIFIED`, `ACTIVATED`, `SCHEDULED`, `IN_TRANSIT`), các trường định danh gồm: **`microchip`**, **`passport.number`**, **`dob`**, **`sex`** sẽ bị khóa cứng. Khách hàng không thể thay đổi để đảm bảo tính pháp lý của hợp đồng.

### 3.2. Điều kiện Nộp Đơn (`canSubmit`)
- Đơn chỉ có thể nộp khi thỏa mãn đồng thời:
  1. Tuyến đường nằm trong danh mục hỗ trợ (`isSupportedRoute`).
  2. Ngày vận chuyển phải từ ngày hôm nay trở đi (`date >= today()`).
  3. Đã chọn đủ số lượng ngựa đã đăng ký (từ 1 đến 6 con).
  4. Địa điểm nhận và giao có đủ: tên địa điểm, địa chỉ chi tiết, người liên hệ và số điện thoại hợp lệ.
  5. Vượt qua checklist hồ sơ: hộ chiếu còn hạn, chứng nhận tiêm phòng cúm hợp lệ.

### 3.3. Quy tắc Ký số Hợp đồng bằng OTP
- Nút gửi mã OTP và ký hợp đồng **chỉ mở** khi:
  1. Khách hàng đã ấn **Đồng ý điều khoản** (`termsAcceptedAt != null`).
  2. Tiền cọc đã được cổng thanh toán VNPay hoặc Manager xác minh đủ 100% (`DEPOSIT_VERIFIED`).
  3. Thời hạn hiệu lực của hợp đồng chưa hết (`validUntil > hiện tại`).
- Ký OTP thành công sẽ ngay lập tức:
  * Đổi trạng thái hợp đồng sang `EFFECTIVE`.
  * Đổi trạng thái yêu cầu sang `ACTIVATED`.
  * Hệ thống tự động tạo mã Chuyến đi `TRIP_...` ở trạng thái `PLANNING`.

### 3.4. Nghiệm thu, Hạn đóng yêu cầu & Khiếu nại
- **Hạn nghiệm thu:** Trong vòng **24 giờ** kể từ khi tổ xe hoàn tất biên bản bàn giao tại điểm đến.
- **Khiếu nại:** Khách hàng có quyền gửi khiếu nại trước khi đơn đóng. Khi có khiếu nại ở trạng thái `OPEN` hoặc `IN_PROGRESS`, đồng hồ tự động đóng đơn sẽ tạm dừng cho đến khi CBN Transport có văn bản phản hồi giải quyết.
- **Thanh toán số dư:** Khách hàng xác nhận nghiệm thu dịch vụ trước, sau đó thanh toán 60% số dư còn lại qua cổng VNPay. Khi số dư = 0 và không còn khiếu nại, yêu cầu được đóng hoàn tất (`CLOSED`).

---

## 4. Quy ước Kỹ thuật & Envelope

- **Header bắt buộc:** `Authorization: Bearer <token>`, `Accept: application/json`, `Content-Type: application/json` (trừ upload file dùng `multipart/form-data`).
- **Thành công:** `{ "success": true, "message": "...", "data": ... }`.
- **Thất bại:** `{ "success": false, "message": "...", "errorCode": "...", "data": null, "errors": ... }`.
- **Mã lỗi thông dụng cần xử lý ở giao diện:**
  * `VALIDATION_ERROR` (400): Dữ liệu form không hợp lệ (hiển thị lỗi theo field).
  * `UNAUTHORIZED` (401): Hết phiên đăng nhập → Chuyển hướng về `/login`.
  * `FORBIDDEN` / `NOT_FOUND` (404): Không có quyền xem đơn hoặc tài nguyên không tồn tại.
  * `INVALID_STATE` (409): Trạng thái đơn không cho phép thao tác (ví dụ: đã quá hạn ký, chưa đủ cọc).
