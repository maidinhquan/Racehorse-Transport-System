# Chỉ dẫn API — Role: Logistics Manager (Quản lý Vận hành)

> **Flow 3 đã thay thế ngày 27/10/2026:** [quy trình v2](../../API-Flow/Flow3/FLOW3.md) và [API/JSON chuẩn](../../API-Flow/Flow3/FLOW3-API-JSON.md) là nguồn hiện hành cho planning/nguồn lực/bay/READY/khởi hành. Bảng và quy tắc planning cũ bên dưới chỉ tra cứu lịch sử khi khác v2: hai nhánh song song, ba người mỗi ROAD; ROAD confirm trước submit, AIR approve rồi book/confirm; không feasibility/timed-documents gate. API role JSON cũ không thay schema v2.


| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 2.1 — Bản đồ Tra cứu & Điều hướng Role (Navigation & Integration Matrix) |
| Ngày cập nhật | 26/10/2026 |
| Dự án | Racehorse Transport System |
| Định hướng kiến trúc | Phương án 2: Tinh gọn Role Index — Tham chiếu trực tiếp nguồn chuẩn [FLOW1.md](../../API-Flow/Flow1/FLOW1.md) |
| Phạm vi | Toàn bộ giao diện cổng Quản lý (`frontend/src/features/manager`) |
| Schema máy đọc | [manager.openapi.json](manager.openapi.json) |
| Nguồn chuẩn chi tiết (Single Source of Truth) | [contracts/API-Flow/Flow1/FLOW1.md](../../API-Flow/Flow1/FLOW1.md) |

---

## 1. Hành trình Nghiệp vụ của Logistics Manager

Tài liệu này đóng vai trò là **Bản đồ chỉ dẫn tích hợp (Role Guide)** dành riêng cho Frontend và Backend khi phát triển cổng Quản lý Vận hành (Logistics Manager). Toàn bộ chi tiết wire payload JSON, tham số headers và mã lỗi HTTP được quản lý tập trung tại **[FLOW1.md](../../API-Flow/Flow1/FLOW1.md)** và các flow vận hành liên quan.

```text
[1. Tiếp nhận & Xét duyệt Yêu cầu Vận chuyển]
   Xem danh sách yêu cầu mới (PENDING_REVIEW)
   ├─ Yêu cầu chỉnh sửa (Request Revision): Chỉ định revisionFields (tuyến, ngày, nơi nhận/giao, ngựa, ghi chú)
   ├─ Từ chối (Reject): Ghi rõ lý do nghiệp vụ
   └─ Chấp thuận (Accept): Chuyển đơn sang trạng thái CONTRACT_PREPARATION để bắt đầu soạn hợp đồng

[2. Lập Giá & Soạn thảo Hợp đồng (Contract Wizard)]
   Bước 1: Kiểm tra phạm vi, lộ trình & tính dự toán chi phí nội bộ (xe, áp tải, thú y, bảo hiểm)
   → Bước 2: Thiết lập bảng khoản mục giá chính thức, tỷ lệ cọc (mặc định 40%), hạn ký (24h)
   → Bước 3: Soạn điều khoản riêng & lưu bản nháp (Contract Draft)
   → Bước 4: Xem trước bản in & Phát hành hợp đồng chính thức (PUBLISH → CONTRACT_READY)
   → Xử lý phản hồi từ khách (Feedback decision: Giữ bản cũ hoặc Phát hành bản sửa đổi v2, v3...)
   → Gia hạn hạn chót (Extend deadline) hoặc Gửi nhắc hoàn tất cọc/ký OTP

[3. Đối soát Thanh toán & Hoàn tiền (Payments Reconciliation)]
   Theo dõi giao dịch tiền cọc (VNPAY tự động / Chuyển khoản ngân hàng)
   → Đối soát giao dịch chuyển khoản thủ công (Xác nhận số tiền thực nhận, mã giao dịch ngân hàng, thời điểm nhận)
   → Xử lý hoàn tiền cọc (Refund) khi khách hủy đơn hợp lệ

[4. Điều phối Nhân sự & Phê duyệt Khởi hành (Trip Planning & Readiness)]
   Khi hợp đồng được ký OTP (ACTIVATED), hệ thống tự sinh Chuyến đi (TRIP_* ở trạng thái PLANNING)
   → Phân công Chuyên viên hồ sơ (Specialist) và Điều phối viên tuyến (Coordinator)
   → Duyệt phương án tuyến đường (Route approval) và ngân sách chuyến bay (Flight budget)
   → Kiểm tra điều kiện sẵn sàng kép (Docs READY + Ops READY) → Phê duyệt khởi hành (Approve Departure)

[5. Giám sát Vận hành, Xử lý Sự cố & Nghiệm thu Đóng đơn]
   Giám sát hành trình xe, tiếp nhận và xử lý sự cố phát sinh dọc đường (Incidents)
   → Giải quyết trường hợp người nhận từ chối nhận ngựa tại điểm đến (Handover resolution)
   → Xử lý khiếu nại dịch vụ từ khách hàng (Complaints: Trả lời, đề xuất bồi thường, ghi nhận kết quả)
   → Đối soát thanh toán 60% số dư còn lại sau nghiệm thu
   → Kiểm tra đủ điều kiện đóng → Đóng yêu cầu vận chuyển (CLOSED) & Hoàn thành hợp đồng (FULFILLED)
```

---

## 2. Bảng ánh xạ Màn hình Giao diện → API & Mã Endpoint chuẩn

| Màn hình / Component | Route UI | Thao tác quản lý | Method & URL | Mã Endpoint trong FLOW1.md |
|---|---|---|---|---|
| **Layout & Header** | Mọi trang | Xem danh sách khách hàng | `GET /manager/customers` | [`F1-J04`](../../API-Flow/Flow1/FLOW1.md#f1-j04--get-managercustomers) |
| | | Xem danh sách ngựa hệ thống | `GET /manager/horses` | [`F1-J05`](../../API-Flow/Flow1/FLOW1.md#f1-j05--get-managerhorses) |
| | | Xem danh sách nhân sự | `GET /manager/staff` | [`F1-J06`](../../API-Flow/Flow1/FLOW1.md#f1-j06--get-managerstaff) |
| | | Xem thông báo quản lý | `GET /manager/notifications` | [`F1-J07`](../../API-Flow/Flow1/FLOW1.md#f1-j07--get-managernotifications) |
| | | Đánh dấu đã đọc thông báo | `POST /manager/notifications/{id}/read`<br>`POST /manager/notifications/read-all` | [`F1-J64`](../../API-Flow/Flow1/FLOW1.md#f1-j64--post-managernotificationsnotificationidread)<br>[`F1-J65`](../../API-Flow/Flow1/FLOW1.md#f1-j65--post-managernotificationsread-all) |
| **Bảng điều khiển (Dashboard)** | `/manager` | Thống kê KPI, đơn chờ duyệt, chuyến đang chạy | `GET /manager/requests`<br>`GET /manager/trips`<br>`GET /manager/payments` | [`F1-J24`](../../API-Flow/Flow1/FLOW1.md#f1-j24--get-managerrequests)<br>[`F1-J56`](../../API-Flow/Flow1/FLOW1.md#f1-j56--get-managertrips)<br>[`F1-J45`](../../API-Flow/Flow1/FLOW1.md#f1-j45--get-managerpayments) |
| **Danh sách Yêu cầu** | `/manager/requests` | Danh sách yêu cầu vận chuyển | `GET /manager/requests` | [`F1-J24`](../../API-Flow/Flow1/FLOW1.md#f1-j24--get-managerrequests) |
| **Chi tiết & Xét duyệt Đơn** | `/manager/requests/:id` | Xem chi tiết yêu cầu & hồ sơ | `GET /manager/requests/{id}` | [`F1-J25`](../../API-Flow/Flow1/FLOW1.md#f1-j25--get-managerrequestsrequestid) |
| | | Xem file giấy tờ ngựa trong đơn | `GET /manager/requests/{rId}/horses/{hId}/documents/{type}/file` | [`F1-J66`](../../API-Flow/Flow1/FLOW1.md#f1-j66--get-managerrequestsrequestidhorseshorseiddocumentsdocumenttypefile) |
| | | Chấp nhận yêu cầu (bắt đầu soạn hợp đồng) | `POST /manager/requests/{id}/accept` | [`F1-J26`](../../API-Flow/Flow1/FLOW1.md#f1-j26--post-managerrequestsrequestidaccept) |
| | | Yêu cầu khách sửa đổi hồ sơ/tuyến | `POST /manager/requests/{id}/request-changes` | [`F1-J27`](../../API-Flow/Flow1/FLOW1.md#f1-j27--post-managerrequestsrequestidrequest-changes) |
| | | Từ chối yêu cầu kèm lý do | `POST /manager/requests/{id}/reject` | [`F1-J28`](../../API-Flow/Flow1/FLOW1.md#f1-j28--post-managerrequestsrequestidreject) |
| | | Quyết định duyệt yêu cầu hủy của khách | `POST /manager/contracts/{id}/cancellation/decision` | [`F1-J54`](../../API-Flow/Flow1/FLOW1.md#f1-j54--post-managercontractcontractidcancellationdecision) |
| | | Ghi nhận theo dõi công nợ | `POST /manager/requests/{id}/collection-notes` | `POST /manager/requests/{id}/collection-notes` |
| | | Đóng yêu cầu khi hoàn tất | `POST /manager/requests/{id}/close` | `POST /manager/requests/{id}/close` |
| **Soạn thảo Hợp đồng (Contract Editor)** | `/manager/requests/:id/contract/editor` | Dữ liệu khởi tạo trình soạn hợp đồng | `GET /manager/requests/{id}/contract-editor` | [`F1-J29`](../../API-Flow/Flow1/FLOW1.md#f1-j29--get-managerrequestsrequestidcontract-editor) |
| | | Tính dự toán chi phí nội bộ | `POST /manager/requests/{id}/cost-estimate` | [`F1-J61`](../../API-Flow/Flow1/FLOW1.md#f1-j61--post-managerrequestsrequestidcost-estimate) |
| | | Lưu bản nháp hợp đồng (Draft) | `PUT /manager/requests/{id}/contract-draft` | [`F1-J30`](../../API-Flow/Flow1/FLOW1.md#f1-j30--put-managerrequestsrequestidcontract-draft) |
| | | Hủy bỏ bản nháp hợp đồng | `DELETE /manager/requests/{id}/contract-draft` | [`F1-J31`](../../API-Flow/Flow1/FLOW1.md#f1-j31--delete-managerrequestsrequestidcontract-draft) |
| | | Phát hành hợp đồng chính thức | `POST /manager/requests/{id}/contract/publish` | [`F1-J32`](../../API-Flow/Flow1/FLOW1.md#f1-j32--post-managerrequestsrequestidcontractpublish) |
| **Quản lý Hợp đồng & Phản hồi** | `/manager/contracts` | Xem chi tiết hợp đồng đã phát hành | `GET /manager/requests/{id}/contract` | [`F1-J34`](../../API-Flow/Flow1/FLOW1.md#f1-j34--get-managerrequestsrequestidcontract) |
| | | Phản hồi yêu cầu sửa của khách | `POST /manager/contracts/{id}/feedback/decision` | [`F1-J39`](../../API-Flow/Flow1/FLOW1.md#f1-j39--post-managercontractscontractidfeedbackdecision) |
| | | Gia hạn thời hạn cọc / ký OTP | `POST /manager/contracts/{id}/extend-deadline` | [`F1-J40`](../../API-Flow/Flow1/FLOW1.md#f1-j40--post-managercontractscontractidextend-deadline) |
| | | Gửi nhắc nhở cọc / ký OTP | `POST /manager/contracts/{id}/reminder` | [`F1-J41`](../../API-Flow/Flow1/FLOW1.md#f1-j41--post-managercontractscontractidreminder) |
| **Đối soát Thanh toán (Payments)** | `/manager/payments` | Danh sách giao dịch cần đối soát | `GET /manager/payments` | [`F1-J45`](../../API-Flow/Flow1/FLOW1.md#f1-j45--get-managerpayments) |
| | | Xác minh giao dịch chuyển khoản | `POST /manager/payments/{id}/confirm` | [`F1-J47`](../../API-Flow/Flow1/FLOW1.md#f1-j47--post-managerpaymentspaymentidconfirm) |
| | | Từ chối chứng từ chuyển khoản sai | `POST /manager/payments/{id}/reject` | [`F1-J48`](../../API-Flow/Flow1/FLOW1.md#f1-j48--post-managerpaymentspaymentidreject) |
| | | Ghi nhận hoàn tiền đặt cọc | `POST /manager/contracts/{id}/refund/complete` | [`F1-J55`](../../API-Flow/Flow1/FLOW1.md#f1-j55--post-managercontractscontractidrefundcomplete) |
| **Quản lý Chuyến đi (Trips)** | `/manager/trips` | Danh sách chuyến đi toàn hệ thống | `GET /manager/trips` | [`F1-J56`](../../API-Flow/Flow1/FLOW1.md#f1-j56--get-managertrips) |
| **Chi tiết Chuyến đi & Điều phối** | `/manager/trips/:id` | Xem chi tiết chuyến đi | `GET /manager/trips/{id}` | [`F1-J57`](../../API-Flow/Flow1/FLOW1.md#f1-j57--get-managertripstripid) |
| | | Phân công Specialist & Coordinator | `POST /manager/trips/{id}/assignment` | [`F1-J58`](../../API-Flow/Flow1/FLOW1.md#f1-j58--post-managertripstripidassignment) |
| | | Quyết định duyệt / trả lại phương án tuyến | `POST /manager/trips/{id}/route/decision` | `POST /manager/trips/{id}/route/decision` |
| | | Quyết định duyệt ngân sách chuyến bay | `POST /manager/trips/{id}/flight/decision` | `POST /manager/trips/{id}/flight/decision` |
| | | Phê duyệt cho phép khởi hành | `POST /manager/trips/{id}/approve-departure` | `POST /manager/trips/{id}/approve-departure` |
| | | Xử lý sự cố người nhận từ chối bàn giao | `POST /manager/trips/{id}/handover-resolution` | `POST /manager/trips/{id}/handover-resolution` |
| | | Xem và kiểm soát chi phí thực tế | `GET /manager/actual-costs`<br>`PUT /manager/trips/{id}/actual-costs` | `GET /manager/actual-costs`<br>`PUT /manager/trips/{id}/actual-costs` |
| **Quản lý Sự cố (Incidents)** | `/manager/incidents` | Danh sách sự cố phát sinh | `GET /manager/incidents` | `GET /manager/incidents` |
| | | Cập nhật trạng thái sự cố | `PUT /manager/incidents/{id}/status` | `PUT /manager/incidents/{id}/status` |
| | | Duyệt / từ chối phương án xử lý sự cố | `POST /manager/incidents/{id}/plans/{pId}/decision` | `POST /manager/incidents/{id}/plans/{planId}/decision` |
| **Quản lý Khiếu nại (Complaints)** | `/manager/complaints` | Danh sách khiếu nại khách hàng | `GET /manager/complaints` | [`F1-J73`](../../API-Flow/Flow1/FLOW1.md#f1-j73--get-customerrequestsrequestidcomplaints) |
| | | Phản hồi / đề xuất bồi thường | `POST /manager/complaints/{id}/replies` | `POST /manager/complaints/{id}/replies` |
| | | Ghi nhận giải quyết khiếu nại | `POST /manager/complaints/{id}/resolve` | [`F1-J74`](../../API-Flow/Flow1/FLOW1.md#f1-j74--get-customercomplaintscomplaintid) |
| | | Chuyển khiếu nại lên cấp cao hơn | `POST /manager/complaints/{id}/escalate` | `POST /manager/complaints/{id}/escalate` |
| **Báo cáo & Thống kê (Reports)** | `/manager/reports` | Báo cáo doanh thu, sản lượng, hiệu suất | `GET /manager/reports/overview` | `GET /manager/reports/overview` |

---

## 3. Quy tắc Nghiệp vụ Dành riêng cho Logistics Manager

### 3.1. Thẩm quyền Xét duyệt Yêu cầu (Request Review Gate)
- Đơn ở trạng thái `PENDING_REVIEW` chỉ có thể chuyển sang:
  1. `CONTRACT_PREPARATION`: Khi Manager chấp thuận (Accept).
  2. `CHANGES_REQUESTED`: Khi Manager yêu cầu sửa đổi; bắt buộc nhập nội dung góp ý (`>= 10 ký tự`) và chọn ít nhất một mục được sửa (`revisionFields`: `route`, `date`, `places`, `horses`, `notes`). Khách hàng chỉ được phép sửa đúng các mục này.
  3. `REJECTED`: Khi Manager từ chối; bắt buộc nhập lý do từ chối (`>= 10 ký tự`).

### 3.2. Quy tắc Soạn thảo & Phát hành Hợp đồng
- **Dự toán chi phí nội bộ:** Được tính toán dựa trên khoảng cách km thực tế, loại xe, số lượng nhân sự áp tải và bác sĩ thú y đi kèm. Dự toán chi phí này chỉ phục vụ nội bộ Manager để lập giá, tuyệt đối **không gửi xuống cho Khách hàng**.
- **Điều kiện phát hành hợp đồng:**
  - Tổng giá trị hợp đồng (`total`) phải lớn hơn hoặc bằng giá sàn quy định.
  - Tỷ lệ cọc (`depositPct`) là số nguyên từ `10` đến `100` (mặc định 40%).
  - Thời hạn ký mặc định là 24 giờ (`validUntil = hiện tại + 24h`).
- **Phản hồi yêu cầu sửa của khách (`Feedback Decision`):**
  - Nếu `REJECTED` (Giữ bản cũ): Hệ thống cấp lại thời hạn 24 giờ cho phiên bản hiện hành.
  - Nếu `ACCEPTED` (Đồng ý sửa): Đánh dấu phiên bản cũ là `SUPERSEDED` và phát hành phiên bản mới `v+1` với hạn 24 giờ mới.

### 3.3. Quy tắc Đối soát Tiền cọc & Số dư
- **Thanh toán qua cổng VNPay:** Hệ thống tự động cập nhật trạng thái `SUCCESS` và nâng trạng thái đơn sang `DEPOSIT_VERIFIED`.
- **Thanh toán chuyển khoản ngân hàng:** Manager bắt buộc phải nhập đúng số tiền thực nhận (`confirmedAmount > 0`), mã tham chiếu giao dịch ngân hàng (`transactionCode`), thời điểm nhận tiền thực tế (`receivedAt`). Chỉ số tiền thực nhận có thẩm quyền mới được ghi nhận vào hợp đồng.

### 3.4. Điều kiện Phê duyệt Khởi hành (Departure Gate)
- Chuyến đi chỉ được Manager ấn nút **Duyệt Khởi hành (`Approve Departure`)** khi vượt qua kiểm tra điều kiện kép:
  1. **Docs READY:** Chuyên viên hồ sơ (Specialist) đã xác nhận 100% giấy tờ ngựa và kiểm dịch hải quan đã đủ điều kiện.
  2. **Ops READY:** Điều phối viên (Coordinator) đã xác nhận phương án lộ trình, phương tiện xe chuyên dụng, tài xế và nhân sự áp tải đã sẵn sàng.

### 3.5. Quy tắc Đóng Yêu cầu Vận chuyển (`Close Request`)
- Yêu cầu vận chuyển chỉ được đóng khi thỏa mãn đủ 3 điều kiện:
  1. Tổ xe đã hoàn tất bàn giao tại hiện trường (`DELIVERED`).
  2. Khách hàng đã xác nhận nghiệm thu dịch vụ (`ACCEPTED`) hoặc hết hạn 24h nghiệm thu mà không có tranh chấp.
  3. Không còn khiếu nại nào đang mở (`OPEN` hoặc `IN_PROGRESS`) và số dư công nợ bằng 0.

---

## 4. Quy ước Kỹ thuật, Phân quyền & Mã Lỗi

- **Header bắt buộc:**
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  Accept: application/json
  ```
- **Phân quyền Role:** Bắt buộc claim `role: "LOGISTICS_MANAGER"` trong JWT token. Truy cập sai role trả về `HTTP 403 FORBIDDEN_ROLE`.
- **Mã lỗi thông dụng cần xử lý tại giao diện:**
  * `VALIDATION_ERROR` (400): Dữ liệu gửi lên sai quy cách (thiếu trường bắt buộc, giá âm).
  * `UNAUTHORIZED` (401): Hết phiên đăng nhập.
  * `FORBIDDEN_ROLE` (403): Không có quyền thực hiện nghiệp vụ quản lý.
  * `NOT_FOUND` (404): Không tìm thấy yêu cầu, hợp đồng hoặc giao dịch thanh toán.
  * `INVALID_STATE` (409): Trạng thái đơn không cho phép thao tác (ví dụ: duyệt đơn đã bị hủy, phát hành hợp đồng khi đã ký).
