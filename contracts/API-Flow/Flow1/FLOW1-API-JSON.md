# Flow 1 — Danh sách JSON Request / Response cho FE và BE

## Cập nhật theo helo.html — 26/10/2026 (thay thế thứ tự cũ)

- Hai ngày mong muốn: `pickupAt` (lấy ngựa) và `date` (giao đến nơi). Không tự tạo ngày lấy từ ngày giao.
- Luồng hiện hành: yêu cầu đầy đủ → Manager duyệt → hợp đồng → đồng ý điều khoản → ký OTP → `AWAITING_DEPOSIT` → VNPAY/IPN đủ cọc → kích hoạt và tạo một Trip.
- OTP chỉ xác nhận chữ ký. Hợp đồng đã ký chờ cọc là `SIGNED`, chưa `EFFECTIVE`. Nội dung đã ký bất biến; tiền và tạo Trip chỉ do backend/IPN xác nhận.
- Các đoạn mô tả thứ tự cọc trước/ký sau bên dưới là lịch sử và được thay bằng quy tắc tại mục này cùng quy tắc của từng endpoint.
- Phản hồi ký có `tripId: null`, `tripStatus: null`. Frontend chuyển tới đặt cọc, không tự tạo Trip.
- Hủy sau ký dùng API hủy/yêu cầu hủy với trạng thái và quyết định do backend trả về; không cho sửa nội dung hợp đồng đã ký để đổi lịch.
- Đây là contract đích mới; backend và DB chưa được cập nhật trong thay đổi frontend này.


## Quyết định Flow 1 hiện hành — 24/10/2026

- Chỉ thu tiền qua VNPAY. Tạo phiên → Customer thanh toán → backend xác minh IPN → cập nhật PAYMENT/INVOICE trong transaction → ký OTP trước, đủ cọc đúng version đã ký mới kích hoạt. Return không xác nhận tiền. Không có API Manager confirm/reject thanh toán thủ công.
- Theo dõi tiến độ bằng status hiện tại; không xây timeline history hoặc audit riêng. Chỉ giữ metadata nghiệp vụ cần thiết: feedback gần nhất, trạng thái trước hủy, xác nhận điều khoản, metadata phát hành/ký/gia hạn/triển khai. Collection history/revisions/deadlineHistory/extensions cũ được bỏ khỏi DTO Flow 1.
- ContentSnapshot lưu đầy đủ một hợp đồng hoàn chỉnh: số hợp đồng/version, ngày phát hành, bên cung cấp và Customer, thông tin liên hệ, danh sách ngựa, nơi nhận/giao và người nhận, tuyến/mode/lịch trình, chăm sóc, toàn bộ khoản giá/thuế/phí nếu áp dụng, tổng giá, tiền/tỷ lệ cọc, nghĩa vụ thanh toán, thời hạn, mọi điều khoản/phụ lục và giá trị policy đã áp dụng. Không bỏ trường thuộc hợp đồng; dữ liệu không áp dụng thể hiện rõ. PDF thể hiện cùng nội dung và được giữ theo version. Không dựng lại bản cũ từ master hiện tại. Bản phát hành/ký bất biến; sửa nội dung tạo version mới. Giá vốn nội bộ và OTP/hash không thuộc bản hợp đồng Customer.
- fileType dùng chung photo/passport/ownership/value-proof. Không coi đây là mã ID. Hồ sơ y tế theo đơn dùng API documents.
- Refund Flow 1 chỉ ghi nhận status thủ công; không thực hiện chuyển tiền hoặc tuyên bố hệ thống đã hoàn tiền. Không yêu cầu audit/chứng từ mới.
- Đây là thiết kế đích và SQL mẫu Reviewed, không xác nhận backend/FE hoặc database đang chạy đã được cập nhật.


## Quy ước trạng thái thống nhất với database

Nguồn NAME đích: [DATABASE_STATUS_CONVENTION.md](../../../data/DATABASE_STATUS_CONVENTION.md), mục 12. Request dùng cùng enum DB/API: DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, CONTRACT_PREPARATION, CONTRACT_READY, CONTRACT_CHANGES_REQUESTED, DEPOSIT_VERIFIED, CANCELLATION_REQUESTED, ACTIVATED, SCHEDULED, IN_PROGRESS, DELIVERED, CLOSED, REJECTED, CANCELLED.

Sau ký: AWAITING_DEPOSIT. Sau IPN xác minh đủ cọc: ACTIVATED. Gate 1 đã duyệt và phân công xác nhận: SCHEDULED. Khởi hành thực tế: Request IN_PROGRESS, Trip IN_TRANSIT. Bàn giao hợp lệ: Request DELIVERED, Trip COMPLETED. Tất toán xong: Contract SETTLED, Request vẫn DELIVERED trong cửa sổ feedback/khiếu nại. Hết cửa sổ và không khiếu nại mở: Request CLOSED, Contract CLOSED. SCHEDULED không thay Gate 2; nếu Gate 1 bị thu hồi trước khởi hành, Request trở lại ACTIVATED để duyệt lại.

Contract tổng dùng SIGNED sau ký, EFFECTIVE sau xác minh đủ cọc; CONTRACT_VERSION vẫn SIGNED. State UI của phiên bản là projection, không phải enum DB. Payment UI PENDING_CONFIRMATION/PROCESSING/REJECTED, refund UI REFUNDED, deployment UI NOT_CONFIRMED được đối chiếu ở mục 12; không lưu trực tiếp các nhãn này vào cột có enum khác.

Chưa nhận cọc đã xác minh và chưa kích hoạt: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã kích hoạt Trip không dùng quy trình hủy trước triển khai này; đã ký nhưng chưa đủ cọc vẫn xử lý theo trạng thái thực tế do backend trả về.

SQL Reviewed đã cho DeploymentStatus PENDING/CONFIRMED/ON_HOLD. Hold/resume là hợp đồng đích cần kiểm chứng backend; không còn bị chặn bởi enum SQL.

ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/metadata do backend thực hiện.

Các quy tắc trên là hợp đồng đích, không xác nhận backend/FE đã triển khai hoặc seed đã được chuyển đổi.


| Thuộc tính | Giá trị |
|---|---|
| Ngày | 23/10/2026 |
| Baseline | [FLOW1.md](FLOW1.md), 1.1 — frontend aligned |
| Phạm vi | Toàn bộ endpoint có method/path cụ thể trong baseline Flow 1 hiện tại |
| Trạng thái | Hợp đồng payload để triển khai, chưa phải kết quả gọi backend thật |

## 1. Cách sử dụng và quy tắc đọc JSON

- FLOW1.md quyết định flow/quyền/state machine/policy. File này chốt mẫu wire payload, tên field và kiểu dữ liệu; không dùng danh mục API cũ làm chuẩn.
- Mọi URL bên dưới nằm sau base /api. Header có Authorization: Bearer và Content-Type: application/json khi gửi JSON. GET/POST không body là **không gửi body**, không gửi chuỗi JSON null hoặc object rỗng thay thế.
- Path parameters và query là thành phần URL, không phải request JSON. Bảng tham số dùng chuỗi để biểu diễn URL; versionNo được backend parse integer ≥1.
- JSON là payload đầy đủ cho từng tình huống minh họa, không có dấu ba chấm hoặc tham chiếu “giống API trên” thay nội dung. Các ví dụ là các trạng thái độc lập, không phải chuỗi request chạy liên tiếp mặc định; phải lấy ID/version từ response thật.
- Response luôn có success/message/data; lỗi có errorCode, chỉ có errors khi cần field validation. GET list trả mảng trực tiếp. Trường optional chưa có dữ liệu được bỏ; collection FE yêu cầu luôn trả [] nếu chưa có dữ liệu. Null có nghĩa đã xác định là chưa có, không tương đương lỗi đọc dữ liệu.
- Mẫu JSON kèm schema bắt buộc tại [flow1.openapi.json](flow1.openapi.json): required/nullable/enum/giới hạn không suy đoán từ một ví dụ. Không gửi field readonly/ngoài schema. Các field chưa được backend hỗ trợ có danh sách riêng, không được giả vờ đã lưu.
- ID backend cấp USER_*/HORSE_*/REQUEST_*/CONTRACT_*/TRIP_*/INVOICE_*/PAYMENT_*. Một ContractID giữ qua các bản, VersionNo số nguyên; number trong DTO chỉ là alias ContractID. Không rowVersion/pdfSha256/token giả, không thêm ContractCode hoặc ContractVersionID.
- Tiền VND, nguyên đồng, BE tính decimal; value của Horse giữ string theo input FE rồi BE parse. Timestamp DTO theo YYYY-MM-DD HH:mm ở Asia/Ho_Chi_Minh; cột Utc lưu UTC, không chuyển nghĩa thời gian tùy endpoint.
- Upload là multipart và file thật; thành công PDF/ảnh là binary, không bọc JSON. Không tạo FILE_* khi DB chưa có bảng File. Link file trong ví dụ là endpoint có quyền.
- state UI, VersionStatus SQL và Payment status provider khác nhau. Đừng ghi ISSUED/EXPIRED/EFFECTIVE hoặc PROCESSING vào cột SQL có CHECK khác mà không mapping.
- Mọi payload persistence chưa đủ SQL vẫn là thiết kế DTO. Baseline mục 14 là danh sách việc phải chốt, không thể coi việc có JSON là đã giải quyết migration hoặc triển khai backend.
- Dữ liệu 20.000.000 VND, cọc 40%, thời hạn/OTP trong ví dụ chỉ minh họa; đọc và snapshot policy thật. Không dự toán giá cho Customer. Luồng: nhập ngựa trước submit, xác minh cọc trước OTP ký.

### Các body bổ sung/điểm cần chốt

| Nhóm | Quy tắc |
|---|---|
| Horse create/update | Body name/breed/sex/dob/microchip/value/currency/passport/conditions; file upload riêng. GET luôn có color/fluDate/vetName/vetPhone, trả null và liệt kê unsupportedFields khi chưa hỗ trợ lưu. FE khóa các ô đó, không gửi null hoặc chuỗi rỗng để giả vờ đã lưu |
| Request create | Không nhận id/status/owner/history/versions/payment/trip do FE tự cấp; slotCount/wizardStep nháp là UI hoặc cần persistence được chốt |
| Request update | Chỉ field chỉnh sửa đã liệt kê, không PUT toàn bộ aggregate nhận lại từ GET |
| Contract draft | Giữ budget/items/terms có cấu trúc; currency cố định VND không cần body USD; không nhận total/floorPrice do FE quyết định |
| Feedback decision | Chỉ ACCEPTED/REJECTED theo DB; KEPT/REVISED/RETURNED là nhãn UI/luồng khác, không enum DB tự thêm |
| OTP/sign | versionNo + otp; BE chọn OTP session hiện hành, kiểm tra owner/version/deadline/đủ cọc, không dùng secret FE |
| Hold/resume | Hợp đồng đích dùng ON_HOLD; backend chưa triển khai có thể trả 501, không phải enum SQL bị chặn |

## 2. Lỗi chung áp dụng cho mọi endpoint

Mỗi endpoint bên dưới có một lỗi đặc thù. Các lỗi chung sau cũng áp dụng khi điều kiện tương ứng xảy ra:

### HTTP 400 — VALIDATION_ERROR

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "date": [
      "Ngày không hợp lệ"
    ]
  }
}
```

### HTTP 401 — UNAUTHORIZED

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### HTTP 403 — FORBIDDEN_ROLE

```json
{
  "success": false,
  "message": "Bạn không có quyền thực hiện",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### HTTP 404 — NOT_FOUND

```json
{
  "success": false,
  "message": "Không tìm thấy tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### HTTP 409 — INVALID_STATE

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### HTTP 429 — RATE_LIMITED

```json
{
  "success": false,
  "message": "Vui lòng thử lại sau",
  "errorCode": "RATE_LIMITED",
  "data": null
}
```

### HTTP 500 — INTERNAL_ERROR

```json
{
  "success": false,
  "message": "Không thể xử lý, vui lòng thử lại",
  "errorCode": "INTERNAL_ERROR",
  "data": null
}
```

## 3. Danh mục endpoint

| Mã | Method | Endpoint | Nội dung |
|---|---|---|---|
| F1-J01 | GET | /customer/profile | Thông tin Customer |
| F1-J02 | GET | /customer/horses | Danh sách ngựa |
| F1-J03 | GET | /customer/notifications | Thông báo Customer |
| F1-J04 | GET | /manager/customers | Danh sách Customer |
| F1-J05 | GET | /manager/horses | Danh sách ngựa cho Manager |
| F1-J06 | GET | /manager/staff | Nhân sự phân công |
| F1-J07 | GET | /manager/notifications | Thông báo Manager |
| F1-J08 | GET | /master/supported-routes | Tuyến hoạt động |
| F1-J09 | GET | /customer/request-form-options | Cấu hình form đã resolve |
| F1-J10 | GET | /locations/search | Gợi ý địa chỉ |
| F1-J68 | GET | /locations/cities | Tìm tỉnh/thành phố |
| F1-J11 | GET | /customer/horses/{horseId} | Chi tiết ngựa |
| F1-J12 | POST | /customer/horses | Thêm ngựa |
| F1-J13 | PUT | /customer/horses/{horseId} | Sửa hồ sơ ngựa |
| F1-J14 | GET | /customer/horses/selectable | Ngựa có thể chọn |
| F1-J15 | POST | /customer/horses/{horseId}/files/{fileType} | Upload file ngựa |
| F1-J16 | GET | /customer/horses/{horseId}/files/{fileType} | Đọc file private |
| F1-J18 | POST | /customer/requests | Tạo DRAFT |
| F1-J19 | PUT | /customer/requests/{requestId} | Lưu dữ liệu Customer |
| F1-J21 | GET | /customer/requests | Danh sách Customer Request |
| F1-J22 | GET | /customer/requests/{requestId} | Chi tiết Customer Request |
| F1-J23 | GET | /customer/requests/{requestId}/document-checklist | Checklist tài liệu |
| F1-J24 | GET | /manager/requests | Danh sách Manager Request |
| F1-J25 | GET | /manager/requests/{requestId} | Chi tiết Manager Request |
| F1-J26 | POST | /manager/requests/{requestId}/accept | Tiếp nhận đơn |
| F1-J27 | POST | /manager/requests/{requestId}/request-changes | Yêu cầu sửa |
| F1-J28 | POST | /manager/requests/{requestId}/reject | Từ chối |
| F1-J29 | GET | /manager/requests/{requestId}/contract-editor | Dữ liệu editor |
| F1-J30 | PUT | /manager/requests/{requestId}/contract-draft | Lưu draft |
| F1-J31 | DELETE | /manager/requests/{requestId}/contract-draft | Bỏ draft |
| F1-J32 | POST | /manager/requests/{requestId}/contract/publish | Phát hành |
| F1-J33 | GET | /manager/contracts/{contractId}/versions/{versionNo} | Version cho Manager |
| F1-J34 | GET | /customer/requests/{requestId}/contract | Hợp đồng hiện hành |
| F1-J35 | GET | /customer/contracts/{contractId}/versions/{versionNo} | Đọc snapshot phiên bản |
| F1-J36 | GET | /customer/contracts/{contractId}/versions/{versionNo}/pdf | PDF hợp đồng |
| F1-J37 | POST | /customer/contracts/{contractId}/accept-terms | Đồng ý điều khoản |
| F1-J38 | POST | /customer/contracts/{contractId}/feedback | Yêu cầu sửa tự do |
| F1-J39 | POST | /manager/contracts/{contractId}/feedback/decision | Quyết định feedback |
| F1-J40 | POST | /manager/contracts/{contractId}/extend-deadline | Gia hạn |
| F1-J41 | POST | /manager/contracts/{contractId}/reminder | Nhắc hoàn tất |
| F1-J42 | GET | /customer/requests/{requestId}/deposit | Nghĩa vụ tiền cọc |
| F1-J43 | POST | /customer/invoices/{invoiceId}/payment-session | Tạo session |
| F1-J44 | GET | /customer/payments/{paymentId} | Trạng thái cho Customer |
| F1-J45 | GET | /manager/payments | Danh sách giao dịch Manager |
| F1-J46 | GET | /manager/payments/{paymentId} | Chi tiết giao dịch |
| F1-J69 | POST | /manager/payments/{paymentId}/cancel | Huỷ giao dịch VNPay bị treo |
| F1-J49 | GET | /customer/payments/{paymentId}/receipt | Biên nhận đã xác minh |
| F1-J50 | POST | /customer/contracts/{contractId}/sign-otp | Gửi OTP ký |
| F1-J51 | POST | /customer/contracts/{contractId}/sign | Ký và tạo một Trip |
| F1-J52 | POST | /customer/requests/{requestId}/cancel | Customer hủy/đề nghị hủy |
| F1-J53 | POST | /manager/requests/{requestId}/cancel | Manager hủy |
| F1-J54 | POST | /manager/contracts/{contractId}/cancellation/decision | Quyết định hủy |
| F1-J55 | POST | /manager/contracts/{contractId}/refund/complete | Xác nhận hoàn tiền |
| F1-J56 | GET | /manager/trips | Danh sách Trip |
| F1-J57 | GET | /manager/trips/{tripId} | Chi tiết Trip |
| F1-J58 | POST | /manager/trips/{tripId}/assignment | Giao việc |
| F1-J59 | POST | /manager/trips/{tripId}/hold | Tạm dừng |
| F1-J60 | POST | /manager/trips/{tripId}/resume | Tiếp tục |
| F1-J61 | POST | /manager/requests/{requestId}/cost-estimate | Bổ sung theo frontend |
| F1-J62 | POST | /customer/notifications/{notificationId}/read | Bổ sung theo frontend |
| F1-J63 | POST | /customer/notifications/read-all | Bổ sung theo frontend |
| F1-J64 | POST | /manager/notifications/{notificationId}/read | Bổ sung theo frontend |
| F1-J65 | POST | /manager/notifications/read-all | Bổ sung theo frontend |

| F1-J66 | GET | /manager/requests/{requestId}/horses/{horseId}/documents/{documentType}/file | Đọc hồ sơ có quyền |


## 4. Form và layout


### F1-J01 — GET /customer/profile

Thông tin Customer. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "USER_001",
    "fullName": "Nguyen Van A",
    "username": "customer_a",
    "email": "customer@example.com",
    "phone": "+84901234567",
    "role": "CUSTOMER"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J02 — GET /customer/horses

Danh sách ngựa. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "breed": "Thoroughbred",
      "sex": "STALLION",
      "dob": "2020-03-14",
      "microchip": "985112004571029",
      "value": "120000000",
      "currency": "VND",
      "healthNotes": "Khỏe mạnh",
      "reproductiveStatus": "INTACT",
      "weight": 520,
      "passport": {
        "number": "VN-EQ-2020-1029",
        "authority": "Cơ quan cấp",
        "issueDate": "2023-04-10",
        "expiryDate": "2028-04-09",
        "scan": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      },
      "photo": {
        "name": "horse.png",
        "url": "/api/customer/horses/HORSE_001/files/photo"
      },
      "ownership": {
        "name": "ownership.pdf",
        "url": "/api/customer/horses/HORSE_001/files/ownership"
      },
      "valueProof": {
        "name": "valueProof.pdf",
        "url": "/api/customer/horses/HORSE_001/files/value-proof"
      }
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```


### F1-J03 — GET /customer/notifications

Thông báo Customer. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "NOTIFICATION_001",
      "title": "Hợp đồng đã phát hành",
      "body": "Vui lòng xem hợp đồng CONTRACT_001 phiên bản 1.",
      "at": "2026-10-23 09:00",
      "read": false,
      "link": "/customer/requests/REQUEST_001/contract"
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```



### F1-J04 — GET /manager/customers

Danh sách Customer. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_001",
      "fullName": "Nguyen Van A",
      "username": "customer_a",
      "email": "customer@example.com",
      "phone": "+84901234567",
      "role": "CUSTOMER"
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J05 — GET /manager/horses

Danh sách ngựa cho Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "breed": "Thoroughbred",
      "sex": "STALLION",
      "dob": "2020-03-14",
      "microchip": "985112004571029",
      "value": "120000000",
      "currency": "VND",
      "healthNotes": "Khỏe mạnh",
      "reproductiveStatus": "INTACT",
      "weight": 520,
      "passport": {
        "number": "VN-EQ-2020-1029",
        "authority": "Cơ quan cấp",
        "issueDate": "2023-04-10",
        "expiryDate": "2028-04-09",
        "scan": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      },
      "photo": {
        "name": "horse.png",
        "url": "/api/customer/horses/HORSE_001/files/photo"
      },
      "ownership": {
        "name": "ownership.pdf",
        "url": "/api/customer/horses/HORSE_001/files/ownership"
      },
      "valueProof": {
        "name": "valueProof.pdf",
        "url": "/api/customer/horses/HORSE_001/files/value-proof"
      }
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J06 — GET /manager/staff

Nhân sự phân công. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_005",
      "name": "Nguyen Thi B",
      "role": "TRANSPORT_SPECIALIST",
      "isActive": true
    },
    {
      "id": "USER_006",
      "name": "Tran Van C",
      "role": "FLEET_ROUTE_COORDINATOR",
      "isActive": true
    }
  ]
}
```

**Quy tắc:** role Coordinator trong DTO và USER.Role thống nhất FLEET_ROUTE_COORDINATOR. Không tạo hai user/role để né mapping.

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J07 — GET /manager/notifications

Thông báo Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "NOTIFICATION_002",
      "at": "2026-10-23 08:00",
      "title": "Đơn mới",
      "text": "REQUEST_001 đang chờ xét duyệt.",
      "link": "/manager/requests/REQUEST_001",
      "read": false
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```



### F1-J08 — GET /master/supported-routes

Tuyến hoạt động. Role: **Người dùng đã đăng nhập theo phạm vi dữ liệu**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "ROUTE_001",
      "originCountry": "VN",
      "destinationCountry": "VN",
      "mode": "ROAD"
    },
    {
      "id": "ROUTE_002",
      "originCountry": "VN",
      "destinationCountry": "VN",
      "mode": "AIR"
    },
    {
      "id": "ROUTE_003",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR"
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```



### F1-J09 — GET /customer/request-form-options

Cấu hình form đã resolve. Role: **CUSTOMER**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| originCountry | VN |
| destinationCountry | JP |
| mode | AIR |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "currency": "VND",
    "preparationDays": 7,
    "defaultDepositPct": 40,
    "contractDeadlineHours": 24,
    "selectedRoute": {
      "id": "ROUTE_003",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR"
    }
  }
}
```

**Response nhánh: 200 khi chưa chọn tuyến**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "currency": "VND",
    "supportedRoutes": [
      {
        "id": "ROUTE_001",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "ROAD"
      },
      {
        "id": "ROUTE_002",
        "originCountry": "VN",
        "destinationCountry": "VN",
        "mode": "AIR"
      },
      {
        "id": "ROUTE_003",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "mode": "AIR"
      }
    ],
    "preparationDays": 7,
    "defaultDepositPct": 40,
    "contractDeadlineHours": 24
  }
}
```

**Quy tắc:** Query chỉ là tham số URL. Chưa có nước/mode thì trả danh mục, không khẳng định preparationDays cho một tuyến chưa xác định.

**Response lỗi 500 — BUSINESS_POLICY_CONFIGURATION_ERROR**

```json
{
  "success": false,
  "message": "Cấu hình policy bị thiếu hoặc không hợp lệ",
  "errorCode": "BUSINESS_POLICY_CONFIGURATION_ERROR",
  "data": null
}
```


### F1-J10 — GET /locations/search

Gợi ý địa chỉ. Role: **Người dùng đã đăng nhập theo phạm vi dữ liệu**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| q | Trại ngựa |
| country | VN |
| cityId | 0123456789abcdef012345 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "label": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "point": {
        "latitude": 10.8231,
        "longitude": 106.6297,
        "countryCode": "VN"
      }
    }
  ]
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "q": [
      "Từ khóa tìm kiếm không hợp lệ"
    ]
  }
}
```


### F1-J68 — GET /locations/cities

Tìm tỉnh/thành phố. Role: **Người dùng đã đăng nhập theo phạm vi dữ liệu**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| q | Hồ Chí Minh |
| country | VN |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "cityId": "0123456789abcdef012345",
      "label": "Thành phố Hồ Chí Minh",
      "countryCode": "VN"
    }
  ]
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null
}
```


## 5. Horse và hồ sơ


### F1-J11 — GET /customer/horses/{horseId}

Chi tiết ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "healthNotes": "Khỏe mạnh",
    "reproductiveStatus": "INTACT",
    "weight": 520,
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09",
      "scan": {
        "name": "passport.pdf",
        "url": "/api/customer/horses/HORSE_001/files/passport"
      }
    },
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "valueProof": {
      "name": "valueProof.pdf",
      "url": "/api/customer/horses/HORSE_001/files/value-proof"
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J12 — POST /customer/horses

Thêm ngựa. Role: **CUSTOMER**.

**Request JSON**

```json
{
  "name": "Thunderbolt",
  "breed": "Thoroughbred",
  "sex": "STALLION",
  "dob": "2020-03-14",
  "microchip": "985112004571029",
  "value": "120000000",
  "currency": "VND",
  "passport": {
    "number": "VN-EQ-2020-1029",
    "authority": "Cơ quan cấp",
    "issueDate": "2023-04-10",
    "expiryDate": "2028-04-09"
  },
  "healthNotes": "Khỏe mạnh",
  "reproductiveStatus": "INTACT",
  "weight": 520
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "healthNotes": "Khỏe mạnh",
    "reproductiveStatus": "INTACT",
    "weight": 520,
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09",
      "scan": null
    },
    "photo": null,
    "ownership": null,
    "valueProof": null
  }
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "microchip": [
      "Microchip phải gồm đúng 15 chữ số"
    ]
  }
}
```


### F1-J13 — PUT /customer/horses/{horseId}

Sửa hồ sơ ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |

**Request JSON**

```json
{
  "name": "Thunderbolt",
  "breed": "Thoroughbred",
  "sex": "STALLION",
  "dob": "2020-03-14",
  "microchip": "985112004571029",
  "value": "120000000",
  "currency": "VND",
  "passport": {
    "number": "VN-EQ-2020-1029",
    "authority": "Cơ quan cấp",
    "issueDate": "2023-04-10",
    "expiryDate": "2028-04-09"
  },
  "healthNotes": "Khỏe mạnh",
  "reproductiveStatus": "INTACT",
  "weight": 520
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HORSE_001",
    "name": "Thunderbolt",
    "breed": "Thoroughbred",
    "sex": "STALLION",
    "dob": "2020-03-14",
    "microchip": "985112004571029",
    "value": "120000000",
    "currency": "VND",
    "healthNotes": "Khỏe mạnh",
    "reproductiveStatus": "INTACT",
    "weight": 520,
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09",
      "scan": {
        "name": "passport.pdf",
        "url": "/api/customer/horses/HORSE_001/files/passport"
      }
    },
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "valueProof": {
      "name": "valueProof.pdf",
      "url": "/api/customer/horses/HORSE_001/files/value-proof"
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J14 — GET /customer/horses/selectable

Ngựa có thể chọn. Role: **CUSTOMER**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| expectedTransportDate | 2026-11-19 |
| expectedDeliveryDate | 2026-11-20 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "HORSE_001",
      "name": "Thunderbolt",
      "horse": {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "sex": "STALLION",
        "dob": "2020-03-14",
        "microchip": "985112004571029",
        "value": "120000000",
        "currency": "VND",
        "healthNotes": "Khỏe mạnh",
        "reproductiveStatus": "INTACT",
        "weight": 520,
        "passport": {
          "number": "VN-EQ-2020-1029",
          "authority": "Cơ quan cấp",
          "issueDate": "2023-04-10",
          "expiryDate": "2028-04-09",
          "scan": {
            "name": "passport.pdf",
            "url": "/api/customer/horses/HORSE_001/files/passport"
          }
        },
        "photo": {
          "name": "horse.png",
          "url": "/api/customer/horses/HORSE_001/files/photo"
        },
        "ownership": {
          "name": "ownership.pdf",
          "url": "/api/customer/horses/HORSE_001/files/ownership"
        },
        "valueProof": {
          "name": "valueProof.pdf",
          "url": "/api/customer/horses/HORSE_001/files/value-proof"
        }
      },
      "selectable": true,
      "conflict": null,
      "documentWarnings": []
    }
  ]
}
```

**Quy tắc:** selectable = true khi không trùng lịch. Thiếu file chỉ là documentWarnings, không chặn chọn ngựa.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "expectedTransportDate": [
      "Ngày không hợp lệ"
    ]
  }
}
```


### F1-J15 — POST /customer/horses/{horseId}/files/{fileType}

Upload file ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| fileType | passport |

**Request: multipart/form-data, không có JSON body.**

| Field | Kiểu | Bắt buộc | Ví dụ |
|---|---|---|---|
| file | binary | Có | passport.pdf |

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "name": "passport.pdf",
    "url": "/api/customer/horses/HORSE_001/files/passport"
  }
}
```

**Quy tắc:** fileType: photo/passport/ownership/value-proof. Đây là multipart, không gửi JSON chứa tên file thay bytes. Giới hạn MIME/kích thước từ cấu hình, không tự tạo FILE_* ID.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "file": [
      "Nội dung file không hợp lệ"
    ]
  }
}
```



### F1-J16 — GET /customer/horses/{horseId}/files/{fileType}

Đọc file private. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| fileType | passport |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="passport.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Quy tắc:** Ví dụ fileType=passport; photo có thể trả image/png hoặc image/jpeg.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```



## 6. Customer Request


### F1-J18 — POST /customer/requests

Tạo DRAFT. Role: **CUSTOMER**.

**Request JSON**

```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "expectedTransportDate": "2026-11-19",
  "expectedDeliveryDate": "2026-11-20",
  "careInstructions": "Chăm sóc theo hồ sơ ngựa",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyen Van A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
    "cityId": "0123456789abcdef012345",
    "latitude": 10.8231,
    "longitude": 106.6297
  },
  "delivery": {
    "name": "Tokyo Racecourse",
    "address": "Địa chỉ giao tại Tokyo",
    "postal": "1830024",
    "contact": "Yuki Tanaka",
    "phone": "+81312345678",
    "notes": "",
    "cityId": "0123456789abcdef012346",
    "latitude": 35.668,
    "longitude": 139.484
  },
  "horses": [
    "HORSE_001"
  ],
  "horseNotes": {
    "HORSE_001": "Lưu ý khẩu phần"
  },
  "purpose": null
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "DRAFT",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [],
    "dossier": [],
    "revisionFeedback": null,
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "horses": [
      "Tối thiểu 1 ngựa"
    ]
  }
}
```


### F1-J19 — PUT /customer/requests/{requestId}

Lưu dữ liệu Customer. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "expectedTransportDate": "2026-11-19",
  "expectedDeliveryDate": "2026-11-20",
  "careInstructions": "Chăm sóc theo hồ sơ ngựa",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyen Van A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
    "cityId": "0123456789abcdef012345",
    "latitude": 10.8231,
    "longitude": 106.6297
  },
  "delivery": {
    "name": "Tokyo Racecourse",
    "address": "Địa chỉ giao tại Tokyo",
    "postal": "1830024",
    "contact": "Yuki Tanaka",
    "phone": "+81312345678",
    "notes": "",
    "cityId": "0123456789abcdef012346",
    "latitude": 35.668,
    "longitude": 139.484
  },
  "horses": [
    "HORSE_001"
  ],
  "horseNotes": {
    "HORSE_001": "Lưu ý khẩu phần"
  },
  "purpose": null
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "PENDING_REVIEW",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "dossier": [],
    "revisionFeedback": null,
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F1-J21 — GET /customer/requests

Danh sách Customer Request. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-19",
      "expectedDeliveryDate": "2026-11-20",
      "status": "PENDING_REVIEW",
      "careInstructions": "Chăm sóc theo hồ sơ ngựa",
      "horses": [
        "HORSE_001"
      ],
      "horseCount": 1,
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
        "cityId": "0123456789abcdef012345",
        "cityName": "TP. Hồ Chí Minh",
        "latitude": 10.8231,
        "longitude": 106.6297
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": "",
        "cityId": "0123456789abcdef012346",
        "cityName": "Tokyo",
        "latitude": 35.668,
        "longitude": 139.484
      },
      "versions": [],
      "payments": [],
      "docs": [
        {
          "key": "passport",
          "scope": "HORSE_001",
          "status": "SUBMITTED",
          "file": {
            "url": "/api/customer/horses/HORSE_001/files/passport"
          }
        }
      ],
      "dossier": [],
      "revisionFeedback": null,
      "createdAt": "2026-10-23 07:30"
    }
  ]
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```


### F1-J22 — GET /customer/requests/{requestId}

Chi tiết Customer Request. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "PENDING_REVIEW",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "dossier": [],
    "revisionFeedback": null,
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J23 — GET /customer/requests/{requestId}/document-checklist

Checklist tài liệu. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "horses": [
      {
        "horseId": "HORSE_001",
        "documents": [
          {
            "key": "photo",
            "scope": "HORSE_001",
            "required": true,
            "status": "SUBMITTED",
            "file": {
              "url": "/api/customer/horses/HORSE_001/files/photo"
            }
          }
        ],
        "medical": []
      }
    ]
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


## 7. Manager xét duyệt


### F1-J24 — GET /manager/requests

Danh sách Manager Request. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-19",
      "expectedDeliveryDate": "2026-11-20",
      "status": "PENDING_REVIEW",
      "careInstructions": "Chăm sóc theo hồ sơ ngựa",
      "horses": [
        "HORSE_001"
      ],
      "horseCount": 1,
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
        "cityId": "0123456789abcdef012345",
        "cityName": "TP. Hồ Chí Minh",
        "latitude": 10.8231,
        "longitude": 106.6297
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": "",
        "cityId": "0123456789abcdef012346",
        "cityName": "Tokyo",
        "latitude": 35.668,
        "longitude": 139.484
      },
      "versions": [],
      "payments": [],
      "docs": [
        {
          "key": "passport",
          "scope": "HORSE_001",
          "status": "SUBMITTED",
          "file": {
            "url": "/api/customer/horses/HORSE_001/files/passport"
          }
        }
      ],
      "dossier": [],
      "revisionFeedback": null,
      "createdAt": "2026-10-23 07:30"
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J25 — GET /manager/requests/{requestId}

Chi tiết Manager Request. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "PENDING_REVIEW",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [],
    "dossier": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/passport/file"
        }
      }
    ],
    "revisionFeedback": null,
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J26 — POST /manager/requests/{requestId}/accept

Tiếp nhận đơn. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "CONTRACT_PREPARATION",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "dossier": [],
    "revisionFeedback": null,
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F1-J27 — POST /manager/requests/{requestId}/request-changes

Yêu cầu sửa. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "feedback": "Vui lòng cập nhật lại người nhận tại điểm đến Tokyo"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "CHANGES_REQUESTED",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "dossier": [],
    "revisionFeedback": "Vui lòng cập nhật lại người nhận tại điểm đến Tokyo",
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Quy tắc:** feedback là trường nghiệp vụ chính thức.

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "feedback": [
      "Lý do yêu cầu sửa tối thiểu 10 ký tự"
    ]
  }
}
```


### F1-J28 — POST /manager/requests/{requestId}/reject

Từ chối. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không đủ năng lực vận chuyển tuyến đường này trong thời gian yêu cầu"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-19",
    "expectedDeliveryDate": "2026-11-20",
    "status": "REJECTED",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "horses": [
      "HORSE_001"
    ],
    "horseCount": 1,
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "dossier": [],
    "revisionFeedback": "Không đủ năng lực vận chuyển tuyến đường này trong thời gian yêu cầu",
    "createdAt": "2026-10-23 07:30"
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


## 8. Manager hợp đồng


### F1-J29 — GET /manager/requests/{requestId}/contract-editor

Dữ liệu editor. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| mode | AIR |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "request": {
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-19",
      "expectedDeliveryDate": "2026-11-20",
      "status": "CONTRACT_PREPARATION",
      "careInstructions": "Chăm sóc theo hồ sơ ngựa",
      "horses": [
        "HORSE_001"
      ],
      "horseCount": 1,
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
        "cityId": "0123456789abcdef012345",
        "cityName": "TP. Hồ Chí Minh",
        "latitude": 10.8231,
        "longitude": 106.6297
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": "",
        "cityId": "0123456789abcdef012346",
        "cityName": "Tokyo",
        "latitude": 35.668,
        "longitude": 139.484
      },
      "versions": [],
      "payments": [],
      "docs": [
        {
          "key": "passport",
          "scope": "HORSE_001",
          "status": "SUBMITTED",
          "file": {
            "url": "/api/customer/horses/HORSE_001/files/passport"
          }
        }
      ],
      "dossier": [],
      "revisionFeedback": null,
      "createdAt": "2026-10-23 07:30"
    },
    "customer": {
      "id": "USER_001",
      "fullName": "Nguyen Van A",
      "username": "customer_a",
      "email": "customer@example.com",
      "phone": "+84901234567",
      "role": "CUSTOMER"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "sex": "STALLION",
        "dob": "2020-03-14",
        "microchip": "985112004571029",
        "value": "120000000",
        "currency": "VND",
        "healthNotes": "Khỏe mạnh",
        "reproductiveStatus": "INTACT",
        "weight": 520,
        "passport": {
          "number": "VN-EQ-2020-1029",
          "authority": "Cơ quan cấp",
          "issueDate": "2023-04-10",
          "expiryDate": "2028-04-09",
          "scan": {
            "name": "passport.pdf",
            "url": "/api/customer/horses/HORSE_001/files/passport"
          }
        },
        "photo": {
          "name": "horse.png",
          "url": "/api/customer/horses/HORSE_001/files/photo"
        },
        "ownership": {
          "name": "ownership.pdf",
          "url": "/api/customer/horses/HORSE_001/files/ownership"
        },
        "valueProof": {
          "name": "valueProof.pdf",
          "url": "/api/customer/horses/HORSE_001/files/value-proof"
        }
      }
    ],
    "draft": null,
    "currentContract": null,
    "versions": [],
    "defaults": {
      "currency": "VND",
      "preparationDays": 7,
      "defaultDepositPct": 40,
      "contractDeadlineHours": 24,
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ]
    },
    "internalCosts": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J30 — PUT /manager/requests/{requestId}/contract-draft

Lưu draft. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "mode": "AIR",
  "departAt": "2026-11-20 08:00",
  "arriveAt": "2026-11-21 18:00",
  "budget": {
    "TRANSPORT": 12000000,
    "PROCEDURE": 2000000,
    "VET": 1000000,
    "INSURANCE": 1000000,
    "STAFF": 1000000
  },
  "items": [
    {
      "desc": "Vận chuyển",
      "amount": 16000000,
      "required": true
    },
    {
      "desc": "Thủ tục",
      "amount": 2000000,
      "required": true
    },
    {
      "desc": "Chăm sóc thú y",
      "amount": 1000000,
      "required": true
    },
    {
      "desc": "Bảo hiểm",
      "amount": 1000000,
      "required": true
    }
  ],
  "depositPct": 40,
  "note": "",
  "exception": "",
  "terms": [
    {
      "title": "Phạm vi dịch vụ",
      "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
    },
    {
      "title": "Thanh toán",
      "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
    }
  ]
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "requestId": "REQUEST_001",
    "versionNo": 1,
    "status": "DRAFT",
    "savedAt": "2026-10-23 08:30"
  }
}
```

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "items": [
      "Cần ít nhất một khoản mục"
    ]
  }
}
```


### F1-J31 — DELETE /manager/requests/{requestId}/contract-draft

Bỏ draft. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "discarded": true,
    "draft": null
  }
}
```

**Quy tắc:** Chỉ bỏ bản nháp, không xóa version đã phát hành/ký. DELETE vẫn trả JSON envelope 200, không 204.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```



### F1-J32 — POST /manager/requests/{requestId}/contract/publish

Phát hành. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "requestStatus": "CONTRACT_READY",
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "currency": "VND",
    "validUntil": "2026-10-24 09:00"
  }
}
```

**Response nhánh: 201 bản sửa v2 chưa có tiền ngăn thay bản**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 2,
    "invoiceId": "INVOICE_002",
    "requestStatus": "CONTRACT_READY",
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "currency": "VND",
    "validUntil": "2026-10-24 09:00"
  }
}
```

**Quy tắc:** Tạo PDF/snapshot/Invoice đúng version; tiền và deadline backend tính từ policy. Không tạo Trip.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```



### F1-J33 — GET /manager/contracts/{contractId}/versions/{versionNo}

Version cho Manager. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "requestId": "REQUEST_001",
    "versionNo": 1,
    "requestStatus": "CONTRACT_READY",
    "contractStatus": "ISSUED",
    "versionStatus": "ISSUED",
    "currentDeadline": "2026-10-24 08:00",
    "issuedAt": "2026-10-23 08:00",
    "signedAt": null,
    "termsAcceptedAt": "2026-10-23 08:15",
    "items": [
      {
        "desc": "Vận chuyển",
        "amount": 16000000,
        "required": true
      },
      {
        "desc": "Thủ tục",
        "amount": 2000000,
        "required": true
      },
      {
        "desc": "Chăm sóc thú y",
        "amount": 1000000,
        "required": true
      },
      {
        "desc": "Bảo hiểm",
        "amount": 1000000,
        "required": true
      }
    ],
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "terms": [
      {
        "title": "Phạm vi dịch vụ",
        "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
      },
      {
        "title": "Thanh toán",
        "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
      }
    ],
    "mode": "AIR",
    "departAt": "2026-11-20 08:00",
    "arriveAt": "2026-11-21 18:00",
    "snapshot": {
      "route": {
        "departureAtUtc": "2026-11-20T08:00:00Z",
        "deliveryAtUtc": "2026-11-21T18:00:00Z",
        "mode": "AIR"
      },
      "pickup": {
        "cityName": "Ho Chi Minh City"
      },
      "delivery": {
        "cityName": "Tokyo"
      },
      "parties": {
        "customer": {
          "id": "USER_001"
        }
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip_ISO": "985112004571029",
          "feI_Passport_No": "VN-EQ-2020-1029"
        }
      ]
    },
    "pdfUrl": "/api/customer/contracts/CONTRACT_001/versions/1/pdf",
    "note": ""
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


## 9. Customer hợp đồng


### F1-J34 — GET /customer/requests/{requestId}/contract

Hợp đồng hiện hành. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "currentVersion": {
      "contractId": "CONTRACT_001",
      "requestId": "REQUEST_001",
      "versionNo": 1,
      "requestStatus": "CONTRACT_READY",
      "contractStatus": "ISSUED",
      "versionStatus": "ISSUED",
      "currentDeadline": "2026-10-24 08:00",
      "issuedAt": "2026-10-23 08:00",
      "signedAt": null,
      "termsAcceptedAt": "2026-10-23 08:15",
      "items": [
        {
          "desc": "Vận chuyển",
          "amount": 16000000,
          "required": true
        },
        {
          "desc": "Thủ tục",
          "amount": 2000000,
          "required": true
        },
        {
          "desc": "Chăm sóc thú y",
          "amount": 1000000,
          "required": true
        },
        {
          "desc": "Bảo hiểm",
          "amount": 1000000,
          "required": true
        }
      ],
      "total": 20000000,
      "depositPct": 40,
      "depositAmount": 8000000,
      "terms": [
        {
          "title": "Phạm vi dịch vụ",
          "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
        },
        {
          "title": "Thanh toán",
          "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
        }
      ],
      "mode": "AIR",
      "departAt": "2026-11-20 08:00",
      "arriveAt": "2026-11-21 18:00",
      "snapshot": {
        "route": {
          "departureAtUtc": "2026-11-20T08:00:00Z",
          "deliveryAtUtc": "2026-11-21T18:00:00Z",
          "mode": "AIR"
        },
        "pickup": {
          "cityName": "Ho Chi Minh City"
        },
        "delivery": {
          "cityName": "Tokyo"
        },
        "parties": {
          "customer": {
            "id": "USER_001"
          }
        },
        "horses": [
          {
            "id": "HORSE_001",
            "name": "Thunderbolt",
            "microchip_ISO": "985112004571029",
            "feI_Passport_No": "VN-EQ-2020-1029"
          }
        ]
      },
      "pdfUrl": "/api/customer/contracts/CONTRACT_001/versions/1/pdf",
      "note": ""
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J35 — GET /customer/contracts/{contractId}/versions/{versionNo}

Đọc snapshot phiên bản. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "requestId": "REQUEST_001",
    "versionNo": 1,
    "requestStatus": "CONTRACT_READY",
    "contractStatus": "ISSUED",
    "versionStatus": "ISSUED",
    "currentDeadline": "2026-10-24 08:00",
    "issuedAt": "2026-10-23 08:00",
    "signedAt": null,
    "termsAcceptedAt": "2026-10-23 08:15",
    "items": [
      {
        "desc": "Vận chuyển",
        "amount": 16000000,
        "required": true
      },
      {
        "desc": "Thủ tục",
        "amount": 2000000,
        "required": true
      },
      {
        "desc": "Chăm sóc thú y",
        "amount": 1000000,
        "required": true
      },
      {
        "desc": "Bảo hiểm",
        "amount": 1000000,
        "required": true
      }
    ],
    "total": 20000000,
    "depositPct": 40,
    "depositAmount": 8000000,
    "terms": [
      {
        "title": "Phạm vi dịch vụ",
        "text": "Vận chuyển và chăm sóc theo nội dung hai bên đã thống nhất."
      },
      {
        "title": "Thanh toán",
        "text": "Tiền cọc theo tỷ lệ trong hợp đồng; thanh toán bằng VND."
      }
    ],
    "mode": "AIR",
    "departAt": "2026-11-20 08:00",
    "arriveAt": "2026-11-21 18:00",
    "snapshot": {
      "route": {
        "departureAtUtc": "2026-11-20T08:00:00Z",
        "deliveryAtUtc": "2026-11-21T18:00:00Z",
        "mode": "AIR"
      },
      "pickup": {
        "cityName": "Ho Chi Minh City"
      },
      "delivery": {
        "cityName": "Tokyo"
      },
      "parties": {
        "customer": {
          "id": "USER_001"
        }
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip_ISO": "985112004571029",
          "feI_Passport_No": "VN-EQ-2020-1029"
        }
      ]
    },
    "pdfUrl": "/api/customer/contracts/CONTRACT_001/versions/1/pdf",
    "note": ""
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J36 — GET /customer/contracts/{contractId}/versions/{versionNo}/pdf

PDF hợp đồng. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |
| versionNo | 1 |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="CONTRACT_001-V01.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```



### F1-J37 — POST /customer/contracts/{contractId}/accept-terms

Đồng ý điều khoản. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "termsAcceptedAt": "2026-10-23 09:10",
    "requestStatus": "CONTRACT_READY"
  }
}
```

**Quy tắc:** Lưu lần đồng ý đầu tiên bằng UTC vào CONTRACT_VERSION.TermsAcceptedAtUtc của đúng ContractID/VersionNo; Customer lấy từ CONTRACT.CustomerID và đối chiếu token. NULL là chưa đồng ý; retry giữ nguyên thời điểm đã ghi. Version mới mặc định NULL. Không sửa ContentSnapshot và không lưu lặp CustomerID/RequestID.

**Response lỗi 409 — CONTRACT_EXPIRED**

```json
{
  "success": false,
  "message": "Hợp đồng đã hết hạn hoàn tất",
  "errorCode": "CONTRACT_EXPIRED",
  "data": null
}
```



### F1-J38 — POST /customer/contracts/{contractId}/feedback

Yêu cầu sửa tự do. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "text": "Đề nghị xem lại khoản phí vận chuyển"
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "requestStatus": "CONTRACT_CHANGES_REQUESTED",
    "feedbackStatus": "PENDING",
    "change": {
      "at": "2026-10-23 09:05",
      "text": "Đề nghị xem lại khoản phí vận chuyển"
    }
  }
}
```

**Quy tắc:** Không thêm FeedbackFields. Text không tự thay canonical ngày/giá.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```



### F1-J39 — POST /manager/contracts/{contractId}/feedback/decision

Quyết định feedback. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "decision": "REJECTED",
  "text": "Giữ nội dung hiện tại theo thỏa thuận."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "decision": "REJECTED",
    "feedbackStatus": "REJECTED",
    "requestStatus": "CONTRACT_READY",
    "managerFeedback": "Giữ nội dung hiện tại theo thỏa thuận."
  }
}
```

**Response nhánh: 200 chấp nhận xử lý, chưa phát hành bản mới**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "decision": "ACCEPTED",
    "feedbackStatus": "ACCEPTED",
    "requestStatus": "CONTRACT_CHANGES_REQUESTED",
    "managerFeedback": "Sẽ soạn phiên bản mới."
  }
}
```

**Quy tắc:** ACCEPTED chưa phải bản mới đã phát hành; không mở thanh toán nhầm. Publish mới chuyển CONTRACT_READY.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```



### F1-J40 — POST /manager/contracts/{contractId}/extend-deadline

Gia hạn. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "reason": "Khách hàng yêu cầu thêm thời gian hoàn thiện hồ sơ hải quan"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "newDeadline": "2026-10-25 08:00",
    "reason": "Khách hàng yêu cầu thêm thời gian hoàn thiện hồ sơ hải quan",
    "by": "USER_002",
    "at": "2026-10-23 10:00"
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F1-J41 — POST /manager/contracts/{contractId}/reminder

Nhắc hoàn tất. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "notificationId": "NOTIFICATION_001",
    "queued": true
  }
}
```

**Response lỗi 429 — RATE_LIMITED**

```json
{
  "success": false,
  "message": "Vui lòng chờ trước khi gửi nhắc nhở tiếp theo",
  "errorCode": "RATE_LIMITED",
  "data": null
}
```


## 10. Cọc và đối soát


### F1-J42 — GET /customer/requests/{requestId}/deposit

Nghĩa vụ tiền cọc. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "invoiceId": "INVOICE_001",
    "currency": "VND",
    "requiredAmount": 8000000,
    "paidAmount": 0,
    "remainingAmount": 8000000,
    "canPay": true,
    "validUntil": "2026-10-24 08:00",
    "transactions": []
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J43 — POST /customer/invoices/{invoiceId}/payment-session

Tạo session. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| invoiceId | INVOICE_001 |

**Request JSON**

```json
{
  "method": "VNPAY"
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "invoiceId": "INVOICE_001",
    "amount": 8000000,
    "currency": "VND",
    "method": "VNPAY",
    "status": "PENDING_GATEWAY",
    "paymentUrl": "https://sandbox.example.test/pay/PAYMENT_001",
    "expiresAt": "2026-10-23 09:30"
  }
}
```


**Response lỗi 409 — CONTRACT_EXPIRED**

```json
{
  "success": false,
  "message": "Hợp đồng đã hết hạn hoàn tất",
  "errorCode": "CONTRACT_EXPIRED",
  "data": null
}
```


**Thứ tự mới:** chỉ tạo phiên cọc sau khi version đã ký (`SIGNED`, `signedAt` có giá trị) và Request `AWAITING_DEPOSIT`. Return không xác nhận tiền.

### F1-J44 — GET /customer/payments/{paymentId}

Trạng thái cho Customer. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "paymentId": "PAYMENT_001",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "amount": 8000000,
    "currency": "VND",
    "method": "VNPAY",
    "status": "SUCCESS",
    "databaseStatus": "SUCCESS",
    "receivedAmount": 8000000,
    "paidAt": "2026-10-23 09:15",
    "reviewRequired": false
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J45 — GET /manager/payments

Danh sách giao dịch Manager. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PAYMENT_001",
      "paymentId": "PAYMENT_001",
      "invoiceId": "INVOICE_001",
      "contractId": "CONTRACT_001",
      "versionNo": 1,
      "amount": 8000000,
      "currency": "VND",
      "method": "VNPAY",
      "status": "SUCCESS",
      "databaseStatus": "SUCCESS",
      "receivedAmount": 8000000,
      "paidAt": "2026-10-23 09:15",
      "reviewRequired": false
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J46 — GET /manager/payments/{paymentId}

Chi tiết giao dịch. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "paymentId": "PAYMENT_001",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "amount": 8000000,
    "currency": "VND",
    "method": "VNPAY",
    "status": "SUCCESS",
    "databaseStatus": "SUCCESS",
    "receivedAmount": 8000000,
    "paidAt": "2026-10-23 09:15",
    "reviewRequired": false
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J69 — POST /manager/payments/{paymentId}/cancel

Huỷ giao dịch VNPay bị treo. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_005 |

**Request JSON**

```json
{
  "reason": "Khách xác nhận không thanh toán, phiên VNPay đã hết hạn."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_005",
    "paymentId": "PAYMENT_005",
    "invoiceId": "INVOICE_005",
    "contractId": "CONTRACT_005",
    "versionNo": 1,
    "amount": 400000,
    "currency": "VND",
    "method": "VNPAY",
    "status": "REJECTED",
    "databaseStatus": "FAILED",
    "receivedAmount": null,
    "paidAt": null,
    "reviewRequired": false
  }
}
```

**Quy tắc:** Backend hỏi VNPay (querydr) trước khi huỷ: nếu VNPay xác nhận đã thanh toán thì ghi nhận cọc như IPN và trả về giao dịch thành công thay vì huỷ. Chỉ huỷ được giao dịch đang chờ cổng có phiên VNPay đã hết hạn; giao dịch chuyển FAILED với lý do của Manager và khách có thể thanh toán lại. Nếu sau đó VNPay vẫn báo đã thu tiền, khoản tiền được ghi REVIEW_REQUIRED để đối soát/hoàn tiền, không bị mất.

**Response lỗi 409 — PAYMENT_SESSION_OPEN**

```json
{
  "success": false,
  "message": "The VNPay session is still open; it can be cancelled after it expires.",
  "errorCode": "PAYMENT_SESSION_OPEN",
  "data": null
}
```


### F1-J49 — GET /customer/payments/{paymentId}/receipt

Biên nhận đã xác minh. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="PAYMENT_001-receipt.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Quy tắc:** Không có biên nhận xác minh thì 404, không lấy proof upload làm receipt tự động.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```



## 11. OTP và kích hoạt


### F1-J50 — POST /customer/contracts/{contractId}/sign-otp

Gửi OTP ký. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "sentTo": "c***@example.com",
    "expiresInSeconds": 120,
    "resendAfterSeconds": 60
  }
}
```

**Quy tắc:** Chỉ sau đủ cọc đúng version, còn hạn và đã đồng ý. TTL/resend/attempts từ policy; không mã demo cố định.

**Response lỗi 409 — DEPOSIT_NOT_VERIFIED**

```json
{
  "success": false,
  "message": "Chưa xác minh đủ cọc của phiên bản hiện hành",
  "errorCode": "DEPOSIT_NOT_VERIFIED",
  "data": null
}
```


**Thứ tự mới:** đồng ý điều khoản → ký OTP → `SIGNED` / `AWAITING_DEPOSIT`. Không yêu cầu đã trả cọc và không tạo Trip trong API ký. IPN xác minh đủ tiền của version đã ký mới kích hoạt và tạo đúng một Trip.

### F1-J51 — POST /customer/contracts/{contractId}/sign

Ký và tạo một Trip. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "otp": "482913"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "requestStatus": "ACTIVATED",
    "versionStatus": "SIGNED",
    "tripId": "TRIP_001",
    "tripStatus": "PLANNING",
    "signedAt": "2026-10-23 09:30"
  }
}
```

**Response lỗi 400 — OTP_INVALID_OR_EXPIRED**

```json
{
  "success": false,
  "message": "Mã OTP không hợp lệ hoặc đã hết hạn",
  "errorCode": "OTP_INVALID_OR_EXPIRED",
  "data": null
}
```


## 12. Hủy và hoàn


### F1-J52 — POST /customer/requests/{requestId}/cancel

Customer hủy/đề nghị hủy. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không còn nhu cầu vận chuyển."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "status": "CANCELLED",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Response nhánh: 200 đã nhận cọc đã xác minh, chờ Manager duyệt**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "requestStatus": "CANCELLATION_REQUESTED",
    "cancellationStatus": "PENDING",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Quy tắc:** Chưa nhận cọc đã xác minh và chưa kích hoạt: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã kích hoạt Trip không dùng quy trình hủy trước triển khai này; đã ký nhưng chưa đủ cọc vẫn xử lý theo trạng thái thực tế do backend trả về. Lưu lý do/người yêu cầu/thời điểm tại Request cho cả hai nhánh; nhánh hủy ngay để CancellationPreviousStatus NULL và không tạo Contract giả. Tiền cọc lấy từ PAYMENT đã xác minh, không tin FE; pending gateway không tính là đã nhận. Chặn phiên thanh toán mới và ký khi đang chờ hủy; callback trong lúc chờ hủy đưa đối soát, không ghi đè trạng thái chờ. Quyết định và tiền được kiểm tra trong transaction, retry không ghi đè prevStatus. Metadata lý do/thời điểm yêu cầu trên Contract là bản đồng bộ từ Request cho nhánh PENDING, không phải nguồn thứ hai; khi yêu cầu mới sau lần từ chối, reset metadata quyết định cũ và ghi prevStatus mới trong cùng transaction.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```



### F1-J53 — POST /manager/requests/{requestId}/cancel

Manager hủy. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không còn nhu cầu vận chuyển."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "status": "CANCELLED",
    "reason": "Không còn nhu cầu vận chuyển."
  }
}
```

**Quy tắc:** Lưu lý do/actor/thời điểm ở Request; chỉ hủy trực tiếp trước ký khi chưa có cọc đã xác minh. Nếu đã nhận cọc thì xử lý yêu cầu PENDING qua J54, không dùng J53 để bỏ qua bước quyết định. Tiền đang chờ không phải cọc đã nhận; callback đến sau hủy phải đối soát.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```



### F1-J54 — POST /manager/contracts/{contractId}/cancellation/decision

Quyết định hủy. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "decision": "APPROVED",
  "reason": "Đã đối soát và chấp thuận hủy."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "cancellationStatus": "APPROVED",
    "requestStatus": "CANCELLED",
    "decisionReason": "Đã đối soát và chấp thuận hủy."
  }
}
```

**Response nhánh: 200 từ chối, phục hồi trạng thái trước đề nghị**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "cancellationId": "CANCELLATION_001",
    "cancellationStatus": "REJECTED",
    "requestStatus": "DEPOSIT_VERIFIED",
    "decisionReason": "Chưa đủ điều kiện hủy."
  }
}
```

**Quy tắc:** Chỉ xử lý yêu cầu hủy đang PENDING có cọc đã xác minh. Giá trị phục hồi lấy TRANSPORT_REQUEST.CancellationPreviousStatus, không luôn DEPOSIT_VERIFIED. Actor/thời điểm/lý do quyết định lưu ở CONTRACT.CancellationDecidedBy/AtUtc/DecisionReason; cập nhật Request và Contract trong một transaction. Nếu có tiền mới đến trong lúc chờ thì giữ cờ đối soát và không ghi đè prevStatus. Duyệt hủy chỉ đánh dấu RefundStatus REQUESTED khi có nghĩa vụ hoàn; không tự COMPLETED và không tự tính khoản hoàn chưa thỏa thuận.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```



### F1-J55 — POST /manager/contracts/{contractId}/refund/complete

Ghi nhận trạng thái hoàn tiền (không chuyển tiền). Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "Đã cập nhật trạng thái hoàn tiền",
  "data": {
    "contractId": "CONTRACT_001",
    "refundStatus": "COMPLETED"
  }
}
```

**Quy tắc:** Phạm vi Flow 1 chỉ theo dõi RefundStatus trên CONTRACT: REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED. Không gọi API hoàn tiền VNPay, không xây quy trình chuyển tiền/chứng từ. COMPLETED là trạng thái do Manager ghi nhận thủ công, không phải chứng minh hệ thống đã chuyển tiền. Amount/reference nếu có chỉ là metadata tùy chọn; duyệt hủy không tự chuyển COMPLETED. Chỉ cập nhật sau duyệt hủy và khi RefundStatus đang REQUESTED/PROCESSING; retry COMPLETED trả trạng thái hiện tại, không tạo giao dịch hoặc Payment mới. Giữ path cũ để tương thích.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

## 13. Trip và phân công


### F1-J56 — GET /manager/trips

Danh sách Trip. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "status": "PLANNING",
      "tripStatus": "PLANNING",
      "mode": "AIR",
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "deployment": {
        "status": "CONFIRMED",
        "eventId": "HANDOFF_EVENT_001",
        "reason": "Assigned by Logistics Manager",
        "at": "2026-10-23 09:30"
      }
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


### F1-J57 — GET /manager/trips/{tripId}

Chi tiết Trip. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "status": "PLANNING",
    "tripStatus": "PLANNING",
    "mode": "AIR",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "deployment": {
      "status": "CONFIRMED",
      "eventId": "HANDOFF_EVENT_001",
      "reason": "Assigned by Logistics Manager",
      "at": "2026-10-23 09:30"
    }
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```


### F1-J58 — POST /manager/trips/{tripId}/assignment

Giao việc. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request JSON**

```json
{
  "specialistId": "USER_005",
  "coordinatorId": "USER_006"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "status": "PLANNING",
    "tripStatus": "PLANNING",
    "mode": "AIR",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "deployment": {
      "status": "CONFIRMED",
      "eventId": "HANDOFF_EVENT_001",
      "reason": "Assigned by Logistics Manager",
      "at": "2026-10-23 09:30"
    }
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F1-J59 — POST /manager/trips/{tripId}/hold

Tạm dừng. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request JSON**

```json
{
  "reason": "Thời tiết xấu tại sân bay Tân Sơn Nhất, tạm hoãn kế hoạch bay"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "status": "PLANNING",
    "tripStatus": "PLANNING",
    "mode": "AIR",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "deployment": {
      "status": "ON_HOLD",
      "eventId": "HANDOFF_EVENT_001",
      "reason": "Thời tiết xấu tại sân bay Tân Sơn Nhất, tạm hoãn kế hoạch bay",
      "at": "2026-10-23 10:00"
    }
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


### F1-J60 — POST /manager/trips/{tripId}/resume

Tiếp tục. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "status": "PLANNING",
    "tripStatus": "PLANNING",
    "mode": "AIR",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "deployment": {
      "status": "CONFIRMED",
      "eventId": "HANDOFF_EVENT_001",
      "reason": "Resumed; departure approval must be evaluated again",
      "at": "2026-10-23 11:00"
    }
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```


## 14. Giới hạn DTO và việc bàn giao

- Đây là danh sách JSON của **Flow 1 trong FLOW1.md**, không phải toàn bộ API Auth/Flow 2/3/4/5. Không bổ sung estimates, Quote acceptance, số dư/nghiệm thu hoặc API cũ vào đây.
- Các projection có field giống FE nhưng backend phải mapping từ DB, không đọc thẳng các cột có tên khác rồi hy vọng UI tự hiểu. Customer không được nhận budget/exception hoặc ghi chú nội bộ Manager.
- Horse DTO mới theo DB thiếu một số field bắt buộc của type FE cũ (color, fluDate, vetName, vetPhone). Không điền chuỗi giả để tuyên bố khớp. Phải sửa type/adapter hoặc bổ sung persistence trước triển khai; xem mục 14 FLOW1.md.
- Mẫu Contract Customer trả terms/mode/departAt/arriveAt để đọc snapshot; frontend hiện phải dùng dữ liệu này thay nội dung hardcode. number là alias CONTRACT_001, v là integer; không thêm code/version ID thứ hai.
- Feedback text tự do; mapping các trạng thái feedback/version/request theo baseline. Client không lấy state UI ghi thẳng SQL.
- Snapshot cũ phải bất biến; draft và field local UI dùng persistence đã chốt; không xây history/audit riêng; acknowledgement dùng TermsAcceptedAtUtc, refund Flow 1 chỉ theo dõi status. Mẫu JSON không thay migration hoặc quyết định chính sách.
- Assignment, cancellation và confirmation có schema mục tiêu cần đồng bộ caller, không phải dữ liệu đã có trong backend cũ. Refund Flow 1 chỉ trả status, không yêu cầu audit/chứng từ mới.
- Những tên field bổ sung như currentVersion/history của GET contract, request/versions/defaults của editor và deposit DTO được chốt ở tài liệu JSON này để FE–BE dùng chung. Không tự đổi sang một shape khác trong implement.
- Với mọi GET list chưa có dữ liệu trả envelope data=[]; mọi GET detail không tồn tại/khác owner trả 404 theo lỗi chung, không trả success với object rỗng.
- Binary/file success không có JSON. Multipart không gửi JSON filename thay bytes. Callback provider chưa có route cụ thể trong baseline được đặc tả ở adapter riêng, không có mẫu JSON giả ở đây.

## 15. Kiểm tra trước khi tích hợp

1. FE dùng đúng tên field/ID/currency và lấy state từ response; không tự sinh ID/OTP/SUCCESS/Trip.
2. Backend trả danh sách dạng mảng và đủ collection trong aggregate, không mất data sau refresh.
3. Kiểm tra thành công, field validation, 401/403/404/409, stale version, expired deadline, partial deposit và retry.
4. Callback/confirm không cộng tiền lặp; sign không tạo Trip thứ hai; assignment không tạo task trùng.
5. Các endpoint có phụ thuộc schema phải được giải quyết trước khi coi 200 example là khả thi với DB hiện tại.

**Xác minh tài liệu:** bao phủ đúng method/path trong FLOW1.md và kiểm tra parse toàn bộ JSON code block. Chưa gọi HTTP backend, provider hoặc chạy UAT; ví dụ không phải bằng chứng triển khai đã thành công.

## 14. API bổ sung từ thao tác frontend

### F1-J61 — POST /manager/requests/{requestId}/cost-estimate

Dự toán chi phí nội bộ theo lịch trình đang soạn. Role: **LOGISTICS_MANAGER**.

**Request JSON**

```json
{
  "transportMode": "AIR",
  "departureAt": "2026-11-20 08:00",
  "deliveryAt": "2026-11-21 18:00"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "costs": {
      "transport": 12000000,
      "crew": 1000000,
      "permit": 2000000,
      "vet": 1000000,
      "insurance": 1000000,
      "total": 17000000
    },
    "days": 2,
    "stableNights": 1,
    "crewCount": 2,
    "doctorCount": 1,
    "vehicleCount": 1,
    "roadDistanceKm": 150,
    "insuredValueVnd": 120000000,
    "minimumInsuranceAssumed": false,
    "currency": "VND"
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J62 — POST /customer/notifications/{notificationId}/read

Đánh dấu một thông báo đã đọc. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "NOTIFICATION_001",
    "read": true
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J63 — POST /customer/notifications/read-all

Bổ sung theo frontend. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updated": 2
  }
}
```

**Response lỗi 401 — UNAUTHORIZED**

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```


### F1-J64 — POST /manager/notifications/{notificationId}/read

Đánh dấu một thông báo đã đọc. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "NOTIFICATION_001",
    "read": true
  }
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng chưa được máy chủ hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

### F1-J65 — POST /manager/notifications/read-all

Bổ sung theo frontend. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updated": 2
  }
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Không đúng vai trò",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```


## 15. Quy tắc triển khai đã chốt

- GET Horse trả đủ field UI; `color`, `fluDate`, `vetName`, `vetPhone` chưa có nơi lưu được xác nhận nên null và unsupportedFields chứa đúng tên. Đây không phải dữ liệu trống đã lưu. Form khóa các field này; chỉ mở khi contract và backend cùng xác nhận hỗ trợ.
- Body create Horse yêu cầu các field lõi như mẫu; không nhận id, unsupportedFields hoặc file JSON. Field unsupported bị gửi lên phải trả 400 FIELD_NOT_SUPPORTED, không lặng lẽ bỏ. Tải tệp là bước riêng; nếu đã tạo ngựa nhưng upload lỗi, FE chỉ báo tạo bản ghi thành công một phần và cho mở lại đúng HorseID.
- Giá trị khai báo tối đa 9.999.999.999 VND; microchip đúng 15 chữ số; tên ngựa tối đa 100 ký tự. Max length khác xem OpenAPI.
- Mẫu Request create trả horseCount=0 vì chưa mapping ngựa. Số slot mong muốn và wizardStep là tiến độ UI trong phiên, không hứa lưu xuyên thiết bị. FE giữ tiến độ riêng theo RequestID, không gửi vào DTO lưu. Submit yêu cầu 1–6 HorseID khác nhau, đủ checklist từ backend.
- Request PUT chỉ nhận các trường Customer được phép ghi; không nhận status/history/payment/versions/trip. Khi CHANGES_REQUESTED, Customer được sửa toàn bộ các trường này, không khóa theo nhóm; feedback đọc từ TRANSPORT_REQUEST.RevisionFeedback.
- Draft PUT là full editable draft; không phải PATCH. `savedAt`, contractId và versionNo chỉ do backend trả. Publish phải dùng versionNo của response lưu draft, không tự cộng từ độ dài mảng.
- Response Customer contract không được chứa budget/floor/margin. Phiên bản có snapshot customer, places và horses; không dựng snapshot cũ từ dữ liệu hiện tại. Thiếu snapshot thì API báo FEATURE_NOT_SUPPORTED hoặc lỗi dữ liệu; FE khóa đọc nội dung pháp lý/chấp thuận/ký.
- Gia hạn dùng reason riêng; không tự cộng 24 giờ trên FE. Quyết định ACCEPTED feedback nghĩa chấp nhận yêu cầu sửa và chuẩn bị bản mới; REJECTED nghĩa giữ bản và giữ deadline. Không có thao tác RETURNED nhập nhằng trong wire API.
- Confirm chuyển khoản dùng confirmedAmount thực nhận; amount khai báo không tự trở thành amount đã xác minh. Backend trả paidAmount/remainingAmount thật, chỉ DEPOSIT_VERIFIED khi đủ cọc của đúng phiên bản.
- Tiền cọc/phát hành/OTP/phân công chỉ đổi trạng thái sau response thành công. Browser Return VNPay chỉ đọc GET payment, không gọi mock-deposit và không tin vnp_ResponseCode để xác nhận tiền.
- Mỗi endpoint vẫn là giao thức mục tiêu. Chỉ backend trả đúng schema và vượt kiểm tra tích hợp mới được đánh dấu hỗ trợ; không suy ra khả năng backend chỉ từ việc có JSON mẫu.

## 16. Tệp hồ sơ cho quản lý

### F1-J66 — GET /manager/requests/{requestId}/horses/{horseId}/documents/{documentType}/file

Đọc hồ sơ ngựa trong đơn để xét duyệt. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |
| horseId | HORSE_001 |
| documentType | PASSPORT |

**Request body:** Không gửi body.

**Response 200 — binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="passport.pdf"

<bytes của tài liệu thực đã lưu>
```

Content-Type có thể application/pdf, image/jpeg hoặc image/png theo tệp đã kiểm tra. BE kiểm tra role và mapping Request–Horse; đọc đúng LEGAL_MEDICAL_RECORD hoặc hồ sơ ngựa được tham chiếu. Không tạo bản ghi khi GET. DossierItem.file trả URL này; FE tải blob bằng Bearer token, không mở trang minh họa thay tài liệu thật.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hồ sơ trong đơn hoặc không có quyền xem",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

## 17. Công thức dự toán nội bộ

Tổng chi phí = TRANSPORT + PROCEDURE + VET + INSURANCE + STAFF (VND nguyên đồng). Giá sàn gợi ý = ceil(tổng chi phí × 115 / 100), giá gợi ý = ceil(tổng chi phí × 125 / 100). Đây là quy tắc ứng dụng của contract 1.1, không tạo bảng/cột policy mới và không công bố cho khách. Khi chỉnh ngân sách thủ công, FE tính lại theo cùng công thức; BE phải kiểm tra lại khi publish. Giá bán dưới sàn cần exception ít nhất 10 ký tự. total do BE tính từ items; depositAmount do BE tính, làm tròn nguyên đồng. Customer chỉ nhận items/total/depositPct/depositAmount.


## 20. Thông báo thanh toán VNPay

### F1-J67 — GET /payments/vnpay/ipn

Nhận thông báo server-to-server từ VNPay. Không dùng Bearer token Customer; xác thực bằng chữ ký provider. Path thống nhất endpoint sandbox hiện có, phần tích hợp Invoice/Contract là thiết kế đích.

**Request body:** Không gửi body. Query nhận nguyên bộ tham số vnp_* do VNPay ký, gồm vnp_TmnCode, vnp_TxnRef, vnp_Amount, vnp_ResponseCode, vnp_TransactionStatus, vnp_TransactionNo, vnp_SecureHash và các tham số provider khác. Không cắt bỏ tham số trước khi kiểm tra chữ ký, từ chối query trùng khóa. vnp_Amount theo đơn vị provider, quy đổi đúng về VND để so khớp PAYMENT.Amount.

**Response 200 — JSON provider, không dùng success/message/data**

```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

**Quy tắc:** Kiểm tra chữ ký, merchant, TxnRef đã lưu, amount/currency, Invoice và ContractVersion. Chỉ SUCCESS khi responseCode và transactionStatus cùng 00. Khóa giao dịch khi cập nhật PAYMENT và tính lại INVOICE.PaidAmount từ PAYMENT SUCCESS của đúng invoice/version; callback lặp không cộng tiền hai lần. Chỉ DEPOSIT_VERIFIED khi đủ cọc và Request còn hợp lệ; không tự tạo Trip. Callback sau hủy, trong lúc chờ hủy hoặc quá hạn phải giữ bằng chứng tiền, bật FinancialReviewRequired và không mở ký/kích hoạt. Payload không hợp lệ không được ghi SUCCESS; lỗi lưu trữ không trả xác nhận thành công. RspCode dùng hợp đồng adapter VNPay: 00 đã xử lý, 01 không thấy giao dịch, 02 đã xử lý, 04 sai số tiền, 97 sai xác thực, 99 lỗi khác. Các mã provider là chuỗi, không phải HTTP status. Browser Return chỉ đọc kết quả đã lưu; Customer kiểm tra bằng J44.


**Kích hoạt sau IPN:** chỉ giao dịch hợp lệ của version đã ký mới được cộng tiền; đủ cọc → contract EFFECTIVE, Request ACTIVATED và tạo duy nhất một Trip PLANNING trong cùng transaction. IPN trùng không tạo thêm Trip. IPN thiếu chữ ký/sai số tiền hoặc version không hợp lệ không thay trạng thái.

## Kiểm tra bộ hợp đồng hiện hành

Chạy `python contracts/API-Flow/Flow1/build_openapi.py` rồi `python contracts/API-Flow/Flow1/validate_contract.py`. Có 65 operation: bỏ J47/J48 thủ công, thêm J67 IPN; giữ số J cũ để không làm sai tham chiếu. Bộ kiểm tra frontend cũ có thể còn kỳ vọng 66 operation/J47 và phải được cập nhật khi tích hợp frontend; không dùng kết quả đó để xác nhận backend đã hỗ trợ.
