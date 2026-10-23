# Flow 1 — Danh sách JSON Request / Response cho FE và BE

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
- Mọi payload persistence chưa đủ SQL vẫn là thiết kế DTO. Baseline mục 14 là danh sách việc phải chốt, không thể coi việc có JSON là đã giải quyết migration/audit/accept-terms/transfer-proof/refund.
- Callback VNPay chưa có method/path cố định trong baseline nên không tự bịa JSON provider hoặc endpoint mới. Dùng hợp đồng adapter chính thức của module provider; browser Return không xác nhận tiền.
- Dữ liệu 20.000.000 VND, cọc 40%, thời hạn/OTP trong ví dụ chỉ minh họa; đọc và snapshot policy thật. Không dự toán giá cho Customer. Luồng: nhập ngựa trước submit, xác minh cọc trước OTP ký.

### Các body bổ sung/điểm cần chốt

| Nhóm | Quy tắc |
|---|---|
| Horse create/update | Body name/breed/sex/dob/microchip/value/currency/passport/conditions; file upload riêng. GET luôn có color/fluDate/vetName/vetPhone, trả null và liệt kê unsupportedFields khi chưa hỗ trợ lưu. FE khóa các ô đó, không gửi null hoặc chuỗi rỗng để giả vờ đã lưu |
| Request create | Không nhận id/status/owner/history/versions/payment/trip do FE tự cấp; slotCount/wizardStep nháp là UI hoặc cần persistence được chốt |
| Request update | Chỉ field chỉnh sửa đã liệt kê, không PUT toàn bộ aggregate nhận lại từ GET |
| Contract draft | Giữ budget/items/terms có cấu trúc; currency cố định VND không cần body USD; không nhận total/floorPrice do FE quyết định |
| Feedback decision | Chỉ ACCEPTED/REJECTED theo DB; KEPT/REVISED/RETURNED là nhãn UI/luồng khác, không enum DB tự thêm |
| Payment session | Chỉ bật VNPAY. BANK_TRANSFER chưa được xác nhận đủ persistence nên không mở tạo chuyển khoản/proof cho khách. Manager chỉ đối soát giao dịch có thật do API trả; không có nguồn giao dịch thì danh sách rỗng |
| OTP/sign | versionNo + otp; BE chọn OTP session hiện hành, kiểm tra owner/version/deadline/đủ cọc, không dùng secret FE |
| Hold/resume | Dự phòng, chưa hỗ trợ: trả 501 FEATURE_NOT_SUPPORTED. FE khóa nút; không chỉnh DB trong phạm vi này |

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
| F1-J11 | GET | /customer/horses/{horseId} | Chi tiết ngựa |
| F1-J12 | POST | /customer/horses | Thêm ngựa |
| F1-J13 | PUT | /customer/horses/{horseId} | Sửa hồ sơ ngựa |
| F1-J14 | GET | /customer/horses/selectable | Ngựa có thể chọn |
| F1-J15 | POST | /customer/horses/{horseId}/files/{kind} | Upload file ngựa |
| F1-J16 | GET | /customer/horses/{horseId}/files/{kind} | Đọc file private |
| F1-J17 | POST | /customer/requests/{requestId}/horses/{horseId}/documents | Nộp hồ sơ theo đơn |
| F1-J18 | POST | /customer/requests | Tạo DRAFT |
| F1-J19 | PUT | /customer/requests/{requestId} | Lưu dữ liệu Customer |
| F1-J20 | POST | /customer/requests/{requestId}/submit | Gửi/gửi lại |
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
| F1-J47 | POST | /manager/payments/{paymentId}/confirm | Xác minh chuyển khoản |
| F1-J48 | POST | /manager/payments/{paymentId}/reject | Từ chối giao dịch chờ |
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
    "name": "Nguyen Van A",
    "initials": "NA",
    "email": "customer@example.com",
    "phone": "+84901234567",
    "company": "Trang trại A"
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
      "conditions": "",
      "photo": {
        "name": "horse.png",
        "url": "/api/customer/horses/HORSE_001/files/photo"
      },
      "ownership": {
        "name": "ownership.pdf",
        "url": "/api/customer/horses/HORSE_001/files/ownership"
      },
      "color": null,
      "fluDate": null,
      "vetName": null,
      "vetPhone": null,
      "unsupportedFields": [
        "color",
        "fluDate",
        "vetName",
        "vetPhone"
      ]
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
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
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
      "microchip": "985112004571029",
      "passportNo": "VN-EQ-2020-1029"
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
      "load": 1
    },
    {
      "id": "USER_006",
      "name": "Tran Van C",
      "role": "FLEET_ROUTE_COORDINATOR",
      "load": 2
    }
  ]
}
```

**Quy tắc:** role trong DTO UI là FLEET_COORDINATOR; canonical USER.Role có thể là FLEET_ROUTE_COORDINATOR theo ID rule. Không tạo hai user/role để né mapping.

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
    ]
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
    "conditions": "",
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
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
  "conditions": ""
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
    "conditions": "",
    "passport": {
      "number": "VN-EQ-2020-1029",
      "authority": "Cơ quan cấp",
      "issueDate": "2023-04-10",
      "expiryDate": "2028-04-09"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
    ]
  }
}
```

**Quy tắc:** value là string theo input FE nhưng lưu DeclaredValueVnd numeric. sex dùng mã chuẩn. Response chỉ thể hiện field có nơi lưu đã xác định, không giả lập color/fluDate/vetName/vetPhone chưa có persistence. Ngay sau create chưa upload thì không có property file; gọi upload riêng rồi GET để lấy FileRef.

**Response lỗi 409 — HORSE_MICROCHIP_DUPLICATE**

```json
{
  "success": false,
  "message": "Microchip đã tồn tại",
  "errorCode": "HORSE_MICROCHIP_DUPLICATE",
  "data": null
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
  "conditions": "Cần theo dõi khẩu phần"
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
    "conditions": "Cần theo dõi khẩu phần",
    "photo": {
      "name": "horse.png",
      "url": "/api/customer/horses/HORSE_001/files/photo"
    },
    "ownership": {
      "name": "ownership.pdf",
      "url": "/api/customer/horses/HORSE_001/files/ownership"
    },
    "color": null,
    "fluDate": null,
    "vetName": null,
    "vetPhone": null,
    "unsupportedFields": [
      "color",
      "fluDate",
      "vetName",
      "vetPhone"
    ]
  }
}
```

**Response lỗi 409 — HORSE_NOT_EDITABLE**

```json
{
  "success": false,
  "message": "Thông tin ngựa đang bị khóa theo nghiệp vụ",
  "errorCode": "HORSE_NOT_EDITABLE",
  "data": null
}
```



### F1-J14 — GET /customer/horses/selectable

Ngựa có thể chọn. Role: **CUSTOMER**.

**Query parameters — gửi trên URL**

| Tên | Giá trị ví dụ |
|---|---|
| date | 2026-11-20 |

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
      "selectable": true,
      "conflict": null,
      "documentWarnings": []
    }
  ]
}
```

**Quy tắc:** date là query baseline; khoảng kết thúc phải được backend xác định từ Request/kế hoạch trước khi bảo đảm không xung đột. Nếu chưa đủ ngữ cảnh thì không được khẳng định ngựa an toàn cho mọi khoảng lịch; hợp đồng ngữ cảnh lịch cần chốt khi implement.

**Response lỗi 400 — VALIDATION_ERROR**

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



### F1-J15 — POST /customer/horses/{horseId}/files/{kind}

Upload file ngựa. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| kind | passport |

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

**Quy tắc:** kind: photo/passport/ownership/value-proof. Đây là multipart, không gửi JSON chứa tên file thay bytes. Giới hạn MIME/kích thước từ cấu hình, không tự tạo FILE_* ID.

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



### F1-J16 — GET /customer/horses/{horseId}/files/{kind}

Đọc file private. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| horseId | HORSE_001 |
| kind | passport |

**Request body:** Không gửi body.

**Response 200**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="passport.pdf"
```

Body là bytes file, không phải JSON và không có success/data envelope.

**Quy tắc:** Ví dụ kind=passport; photo có thể trả image/png hoặc image/jpeg.

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hoặc không có quyền truy cập tài nguyên",
  "errorCode": "NOT_FOUND",
  "data": null
}
```



### F1-J17 — POST /customer/requests/{requestId}/horses/{horseId}/documents

Nộp hồ sơ theo đơn. Role: **CUSTOMER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |
| horseId | HORSE_001 |

**Request: multipart/form-data, không có JSON body.**

| Field | Kiểu | Bắt buộc | Ví dụ |
|---|---|---|---|
| documentType | string | Có | PASSPORT |
| expiryDate | date | Không | 2028-04-09 |
| file | binary | Có | passport.pdf |

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "key": "passport",
    "scope": "HORSE_001",
    "status": "SUBMITTED",
    "file": {
      "name": "passport.pdf",
      "url": "/api/customer/horses/HORSE_001/files/passport"
    },
    "updatedAt": "2026-10-23 07:50"
  }
}
```

**Quy tắc:** documentType PASSPORT chỉ minh họa; dùng catalog đã chốt. DocRecord là projection UI từ LEGAL_MEDICAL_RECORD, không tự đánh dấu APPROVED.

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
  "date": "2026-11-20",
  "careNotes": ""
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 0,
    "requestedAt": "2026-10-23 07:30",
    "status": "DRAFT",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "",
      "address": "",
      "postal": "",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": ""
    },
    "delivery": {
      "name": "",
      "address": "",
      "postal": "",
      "contact": "",
      "phone": "",
      "notes": ""
    },
    "horses": [],
    "horseNotes": {},
    "wizardStep": 1,
    "revisions": [],
    "versions": [],
    "payments": [],
    "docs": [],
    "supplements": [],
    "companyDocs": [],
    "complaints": [],
    "history": [
      {
        "at": "2026-10-23 07:30",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_CREATED",
        "detail": "Tạo bản nháp"
      }
    ]
  }
}
```

**Quy tắc:** Header Idempotency-Key bắt buộc cho create theo baseline. ID backend; số slot mong muốn trong wizard thuộc state FE, response horseCount là số mapping thực hiện có.

**Response lỗi 400 — UNSUPPORTED_ROUTE**

```json
{
  "success": false,
  "message": "Tuyến hoặc phương thức không được hỗ trợ",
  "errorCode": "UNSUPPORTED_ROUTE",
  "data": null
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
  "date": "2026-11-20",
  "careNotes": "Chăm sóc theo hồ sơ ngựa",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyen Van A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
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
    "latitude": 35.668,
    "longitude": 139.484
  },
  "horses": [
    "HORSE_001"
  ],
  "horseNotes": {
    "HORSE_001": "Lưu ý khẩu phần"
  }
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "REQUEST_001",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "DRAFT",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
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
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "revisions": [],
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
      }
    ]
  }
}
```

**Quy tắc:** Chỉ DRAFT/CHANGES_REQUESTED; không gửi state, history, versions, payments hoặc trip. Response draft hoàn chỉnh vẫn chưa tự submit.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
}
```



### F1-J20 — POST /customer/requests/{requestId}/submit

Gửi/gửi lại. Role: **CUSTOMER**.

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
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "PENDING_REVIEW",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
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
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "revisions": [],
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
      }
    ]
  }
}
```

**Quy tắc:** Body không có. Backend kiểm tra mapping/tuyến/lịch/hồ sơ, không chỉ dùng validation FE. Chưa tạo Contract/Trip.

**Response lỗi 400 — REQUIRED_DOCUMENT_MISSING**

```json
{
  "success": false,
  "message": "Thiếu hồ sơ Customer phải nộp",
  "errorCode": "REQUIRED_DOCUMENT_MISSING",
  "data": null,
  "errors": {
    "horses.HORSE_001.passport.scan": [
      "Chưa nộp scan hộ chiếu"
    ]
  }
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
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "horseCount": 1,
      "requestedAt": "2026-10-23 07:30",
      "submittedAt": "2026-10-23 08:00",
      "status": "PENDING_REVIEW",
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
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
        "latitude": 35.668,
        "longitude": 139.484
      },
      "horses": [
        "HORSE_001"
      ],
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "wizardStep": 3,
      "revisions": [],
      "versions": [],
      "payments": [],
      "docs": [
        {
          "key": "passport",
          "scope": "HORSE_001",
          "status": "SUBMITTED",
          "file": {
            "name": "passport.pdf",
            "url": "/api/customer/horses/HORSE_001/files/passport"
          },
          "updatedAt": "2026-10-23 07:50"
        }
      ],
      "supplements": [],
      "companyDocs": [],
      "complaints": [],
      "history": [
        {
          "at": "2026-10-23 08:00",
          "actor": "Nguyen Van A",
          "role": "CUSTOMER",
          "action": "REQUEST_SUBMITTED",
          "detail": "Gửi đơn hoàn chỉnh"
        }
      ]
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
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "date": "2026-11-20",
    "horseCount": 1,
    "requestedAt": "2026-10-23 07:30",
    "submittedAt": "2026-10-23 08:00",
    "status": "PENDING_REVIEW",
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyen Van A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
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
      "latitude": 35.668,
      "longitude": 139.484
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "wizardStep": 3,
    "revisions": [],
    "versions": [],
    "payments": [],
    "docs": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "status": "SUBMITTED",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        },
        "updatedAt": "2026-10-23 07:50"
      }
    ],
    "supplements": [],
    "companyDocs": [],
    "complaints": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
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
    "canSubmit": true,
    "items": [
      {
        "key": "passport",
        "scope": "HORSE_001",
        "name": "Hộ chiếu ngựa",
        "kind": "file",
        "status": "SUBMITTED",
        "optional": false,
        "note": "Đã nộp, chưa Specialist duyệt",
        "file": {
          "name": "passport.pdf",
          "url": "/api/customer/horses/HORSE_001/files/passport"
        }
      }
    ],
    "issues": [],
    "warnings": []
  }
}
```

**Response nhánh: 200 thiếu hồ sơ, chưa được submit**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "canSubmit": false,
    "items": [],
    "issues": [
      {
        "field": "horses.HORSE_001.passport.scan",
        "code": "REQUIRED_DOCUMENT_MISSING",
        "message": "Chưa nộp scan hộ chiếu"
      }
    ],
    "warnings": []
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
      "date": "2026-11-20",
      "status": "PENDING_REVIEW",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": [],
      "history": [
        {
          "at": "2026-10-23 08:00",
          "actor": "Nguyen Van A",
          "role": "CUSTOMER",
          "action": "REQUEST_SUBMITTED",
          "detail": "Gửi đơn hoàn chỉnh"
        }
      ]
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
    "date": "2026-11-20",
    "status": "PENDING_REVIEW",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
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
    "date": "2026-11-20",
    "status": "CONTRACT_PREPARATION",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
      }
    ]
  }
}
```

**Quy tắc:** PENDING_REVIEW → CONTRACT_PREPARATION, chưa Trip.

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
  "feedback": "Vui lòng xác nhận lại nơi nhận.",
  "fields": [
    "places"
  ]
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
    "date": "2026-11-20",
    "status": "CHANGES_REQUESTED",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
      }
    ],
    "feedback": "Vui lòng xác nhận lại nơi nhận.",
    "revisionFields": [
      "places"
    ]
  }
}
```

**Quy tắc:** Bộ field mục tiêu cho cả hai UI: route/date/places/horses/notes. Cần cập nhật types cũ và persistence lịch sử đúng baseline.

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Trạng thái hiện tại không cho phép thao tác",
  "errorCode": "INVALID_STATE",
  "data": null
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
  "reason": "Không đáp ứng được lịch vận chuyển."
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
    "date": "2026-11-20",
    "status": "REJECTED",
    "horses": [
      "HORSE_001"
    ],
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
      "contact": "Nguyen Van A",
      "phone": "+84901234567"
    },
    "delivery": {
      "name": "Tokyo Racecourse",
      "address": "Địa chỉ giao tại Tokyo",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678"
    },
    "careNotes": "Chăm sóc theo hồ sơ ngựa",
    "submittedAt": "2026-10-23 08:00",
    "versions": [],
    "dossier": [
      {
        "name": "Hộ chiếu ngựa",
        "scope": "HORSE_001",
        "status": "PENDING_REVIEW",
        "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
        "note": "Chưa được Specialist duyệt"
      }
    ],
    "collection": [],
    "history": [
      {
        "at": "2026-10-23 08:00",
        "actor": "Nguyen Van A",
        "role": "CUSTOMER",
        "action": "REQUEST_SUBMITTED",
        "detail": "Gửi đơn hoàn chỉnh"
      }
    ],
    "reason": "Không đáp ứng được lịch vận chuyển."
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

Query `mode` (ROAD/AIR, optional) chọn phương thức để resolve defaults; không đổi draft khi GET. Role vẫn LOGISTICS_MANAGER.

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
      "date": "2026-11-20",
      "status": "CONTRACT_PREPARATION",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": [],
      "history": [
        {
          "at": "2026-10-23 08:00",
          "actor": "Nguyen Van A",
          "role": "CUSTOMER",
          "action": "REQUEST_SUBMITTED",
          "detail": "Gửi đơn hoàn chỉnh"
        }
      ]
    },
    "customer": {
      "id": "USER_001",
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
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
    }
  }
}
```

**Response nhánh: 200 đã có draft**

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
      "date": "2026-11-20",
      "status": "CONTRACT_PREPARATION",
      "horses": [
        "HORSE_001"
      ],
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "contact": "Nguyen Van A",
        "phone": "+84901234567"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678"
      },
      "careNotes": "Chăm sóc theo hồ sơ ngựa",
      "submittedAt": "2026-10-23 08:00",
      "versions": [],
      "dossier": [
        {
          "name": "Hộ chiếu ngựa",
          "scope": "HORSE_001",
          "status": "PENDING_REVIEW",
          "file": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/PASSPORT/file",
          "note": "Chưa được Specialist duyệt"
        }
      ],
      "collection": [],
      "history": [
        {
          "at": "2026-10-23 08:00",
          "actor": "Nguyen Van A",
          "role": "CUSTOMER",
          "action": "REQUEST_SUBMITTED",
          "detail": "Gửi đơn hoàn chỉnh"
        }
      ]
    },
    "customer": {
      "id": "USER_001",
      "name": "Nguyen Van A",
      "company": "Trang trại A",
      "email": "customer@example.com",
      "phone": "+84901234567"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "breed": "Thoroughbred",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
      }
    ],
    "draft": {
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
      ],
      "savedAt": "2026-10-23 08:30"
    },
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
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "draft": {
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
      ],
      "savedAt": "2026-10-23 08:30"
    }
  }
}
```

**Quy tắc:** contractId/versionNo response do backend cấp; không gửi rowVersion. Không ghi đè snapshot ISSUED/SIGNED.

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần đối soát tiền trước khi thực hiện",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
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
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
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
    "state": "ISSUED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
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
    "budget": {
      "TRANSPORT": 12000000,
      "PROCEDURE": 2000000,
      "VET": 1000000,
      "INSURANCE": 1000000,
      "STAFF": 1000000
    },
    "exception": "",
    "extensions": [],
    "snapshot": {
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      }
    }
  }
}
```

**Quy tắc:** Bao gồm budget/exception/terms, không có contractVersion dạng base64.

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
      "v": 1,
      "number": "CONTRACT_001",
      "issuedAt": "2026-10-23 09:00",
      "validUntil": "2026-10-24 09:00",
      "currency": "VND",
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
      "state": "ISSUED",
      "note": "",
      "termsAcceptedAt": null,
      "signedAt": null,
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
        "origin": "Ho Chi Minh City",
        "destination": "Tokyo",
        "date": "2026-11-20",
        "careNotes": "Chăm sóc theo hồ sơ đã chốt",
        "pickup": {
          "name": "Trại ngựa A",
          "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
          "postal": "700000",
          "contact": "Nguyen Van A",
          "phone": "+84901234567",
          "notes": "Gọi trước khi đến"
        },
        "delivery": {
          "name": "Tokyo Racecourse",
          "address": "Địa chỉ giao tại Tokyo",
          "postal": "1830024",
          "contact": "Yuki Tanaka",
          "phone": "+81312345678",
          "notes": ""
        },
        "horses": [
          {
            "id": "HORSE_001",
            "name": "Thunderbolt",
            "breed": "Thoroughbred",
            "microchip": "985112004571029",
            "passportNo": "VN-EQ-2020-1029"
          }
        ],
        "customer": {
          "id": "USER_001",
          "name": "Nguyen Van A",
          "company": "Trang trại A",
          "email": "customer@example.com",
          "phone": "+84901234567"
        }
      }
    },
    "history": [
      {
        "contractId": "CONTRACT_001",
        "v": 1,
        "state": "ISSUED",
        "issuedAt": "2026-10-23 09:00"
      }
    ]
  }
}
```

**Response nhánh: 200 chưa có bản được phát hành**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "currentVersion": null,
    "history": []
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
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
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
    "state": "ISSUED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
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
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      }
    }
  }
}
```

**Response nhánh: 200 version cũ chỉ đọc**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "v": 1,
    "number": "CONTRACT_001",
    "issuedAt": "2026-10-23 09:00",
    "validUntil": "2026-10-24 09:00",
    "currency": "VND",
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
    "state": "SUPERSEDED",
    "note": "",
    "termsAcceptedAt": null,
    "signedAt": null,
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
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "date": "2026-11-20",
      "careNotes": "Chăm sóc theo hồ sơ đã chốt",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Địa chỉ nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyen Van A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến"
      },
      "delivery": {
        "name": "Tokyo Racecourse",
        "address": "Địa chỉ giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": ""
      },
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "breed": "Thoroughbred",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "customer": {
        "id": "USER_001",
        "name": "Nguyen Van A",
        "company": "Trang trại A",
        "email": "customer@example.com",
        "phone": "+84901234567"
      }
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

**Quy tắc:** Acknowledgement cần persistence theo mục 14 baseline, không tự coi đã có cột SQL.

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
  "reason": "Khách cần thêm thời gian hoàn tất."
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
    "previousValidUntil": "2026-10-24 09:00",
    "validUntil": "2026-10-25 09:00",
    "reason": "Khách cần thêm thời gian hoàn tất.",
    "by": "USER_004",
    "at": "2026-10-24 08:30"
  }
}
```

**Quy tắc:** Mức gia hạn lấy policy và kiểm tra lịch khả thi; ví dụ một ngày không phải hằng số. Persistence history còn phụ thuộc schema.

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
    "notificationId": "NOTIFICATION_003",
    "queued": true
  }
}
```

**Quy tắc:** queued không có nghĩa email đã giao; đích nhận từ backend, không nhận email tùy ý.

**Response lỗi 429 — RATE_LIMITED**

```json
{
  "success": false,
  "message": "Thao tác vượt giới hạn, vui lòng thử lại",
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
    "validUntil": "2026-10-24 09:00",
    "canPay": true,
    "transactions": []
  }
}
```

**Response nhánh: 200 đang chờ provider**

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
    "validUntil": "2026-10-24 09:00",
    "canPay": false,
    "transactions": [
      {
        "id": "PAYMENT_001",
        "type": "DEPOSIT",
        "method": "VNPAY",
        "amount": 8000000,
        "status": "PROCESSING",
        "createdAt": "2026-10-23 09:15",
        "invoiceId": "INVOICE_001",
        "contractId": "CONTRACT_001",
        "versionNo": 1,
        "currency": "VND",
        "providerStatus": "PENDING_GATEWAY"
      }
    ]
  }
}
```

**Response nhánh: 200 đã nhận một phần**

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
    "paidAmount": 4000000,
    "remainingAmount": 4000000,
    "validUntil": "2026-10-24 09:00",
    "canPay": true,
    "transactions": []
  }
}
```

**Response nhánh: 200 quá hạn, chưa đủ cọc**

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
    "validUntil": "2026-10-24 09:00",
    "canPay": false,
    "transactions": []
  }
}
```

**Quy tắc:** canPay=false khi chưa đồng ý/còn payment chờ/quá hạn/hủy hoặc không còn phải thu; tính ở backend.

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

**Quy tắc:** Chỉ một nhánh VNPAY có đầy đủ schema ở baseline. BANK_TRANSFER cần cấu hình ngân hàng/proof/persistence trước khi đóng hợp đồng dữ liệu nhánh đó; không tự thêm property bankInfo tùy ý. paymentUrl là URL minh họa, không phải URL merchant thật.

**Response lỗi 409 — CONTRACT_EXPIRED**

```json
{
  "success": false,
  "message": "Hợp đồng đã hết hạn hoàn tất",
  "errorCode": "CONTRACT_EXPIRED",
  "data": null
}
```



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
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "PROCESSING",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "PENDING_GATEWAY"
  }
}
```

**Response nhánh: 200 provider đã xác minh**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "SUCCESS",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "SUCCESS",
    "confirmedAt": "2026-10-23 09:20"
  }
}
```

**Response nhánh: 200 cần đối soát**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_001",
    "type": "DEPOSIT",
    "method": "VNPAY",
    "amount": 8000000,
    "status": "PROCESSING",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "providerStatus": "REVIEW_REQUIRED",
    "reason": "Cần đối chiếu kết quả provider"
  }
}
```

**Quy tắc:** status UI PROCESSING, providerStatus trạng thái canonical; không ghi PROCESSING vào nhánh SQL chỉ cho PENDING_GATEWAY/SUCCESS/FAILED/REVIEW_REQUIRED.

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
      "id": "PAYMENT_002",
      "requestId": "REQUEST_001",
      "type": "DEPOSIT",
      "method": "BANK_TRANSFER",
      "amount": 8000000,
      "status": "PENDING_CONFIRMATION",
      "createdAt": "2026-10-23 09:15",
      "invoiceId": "INVOICE_001",
      "contractId": "CONTRACT_001",
      "versionNo": 1,
      "currency": "VND",
      "ref": "CUSTOMER-REFERENCE"
    },
    {
      "id": "CONTRACT_002",
      "contractId": "CONTRACT_002",
      "requestId": "REQUEST_002",
      "versionNo": 1,
      "type": "REFUND",
      "method": "BANK_TRANSFER",
      "amount": 8000000,
      "status": "PENDING_CONFIRMATION",
      "createdAt": "2026-10-23 10:00",
      "currency": "VND",
      "rowKind": "CONTRACT_REFUND",
      "ref": "Hoàn tiền theo quyết định hủy"
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




**Projection hoàn tiền:** rowKind=CONTRACT_REFUND lấy từ CONTRACT.Refund*, id bằng ContractID; đây là khóa dòng UI, không PaymentID và không phải một Payment REFUND tự sinh. Nút hoàn gọi F1-J55 qua contractId. GET payment detail/confirm/reject/receipt không nhận dòng projection này. Nếu backend không cung cấp projection thì không dựng hàng đợi từ dữ liệu giả.

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
    "id": "PAYMENT_002",
    "requestId": "REQUEST_001",
    "type": "DEPOSIT",
    "method": "BANK_TRANSFER",
    "amount": 8000000,
    "status": "PENDING_CONFIRMATION",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "ref": "CUSTOMER-REFERENCE"
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



### F1-J47 — POST /manager/payments/{paymentId}/confirm

Xác minh chuyển khoản. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request JSON**

```json
{
  "confirmedAmount": 8000000,
  "transactionCode": "BANK-VERIFIED-001",
  "receivedAt": "2026-10-23 09:20",
  "note": "Đã đối chiếu tiền thực nhận."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_002",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "status": "SUCCESS",
    "confirmedAmount": 8000000,
    "transactionCode": "BANK-VERIFIED-001",
    "confirmedBy": "USER_004",
    "confirmedAt": "2026-10-23 09:20",
    "requestId": "REQUEST_001",
    "requestStatus": "DEPOSIT_VERIFIED",
    "requiredAmount": 8000000,
    "paidAmount": 8000000,
    "remainingAmount": 0
  }
}
```

**Response nhánh: 200 mới đủ một phần**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_002",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "status": "SUCCESS",
    "confirmedAmount": 4000000,
    "transactionCode": "BANK-VERIFIED-001",
    "confirmedBy": "USER_004",
    "confirmedAt": "2026-10-23 09:20",
    "requestId": "REQUEST_001",
    "requestStatus": "CONTRACT_READY",
    "requiredAmount": 8000000,
    "paidAmount": 4000000,
    "remainingAmount": 4000000
  }
}
```

**Quy tắc:** BANK_TRANSFER đang chờ và có nguồn đối soát. Cần chốt schema lưu receivedAt/note/reference, không coi SQL hiện đã hỗ trợ toàn bộ.

**Response lỗi 409 — PAYMENT_ALREADY_PROCESSED**

```json
{
  "success": false,
  "message": "Giao dịch đã được xử lý",
  "errorCode": "PAYMENT_ALREADY_PROCESSED",
  "data": null
}
```



### F1-J48 — POST /manager/payments/{paymentId}/reject

Từ chối giao dịch chờ. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request JSON**

```json
{
  "reason": "Chưa tìm thấy khoản tiền thực nhận."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PAYMENT_002",
    "requestId": "REQUEST_001",
    "type": "DEPOSIT",
    "method": "BANK_TRANSFER",
    "amount": 8000000,
    "status": "REJECTED",
    "createdAt": "2026-10-23 09:15",
    "invoiceId": "INVOICE_001",
    "contractId": "CONTRACT_001",
    "versionNo": 1,
    "currency": "VND",
    "ref": "CUSTOMER-REFERENCE",
    "rejectReason": "Chưa tìm thấy khoản tiền thực nhận."
  }
}
```

**Response lỗi 409 — PAYMENT_ALREADY_PROCESSED**

```json
{
  "success": false,
  "message": "Giao dịch đã được xử lý",
  "errorCode": "PAYMENT_ALREADY_PROCESSED",
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
    "signedAt": "2026-10-23 09:25"
  }
}
```

**Quy tắc:** VersionNo là integer, không RowVersion/base64; không gửi pdfSha256. Atomic signature/Request/Trip; không cộng tiền ở bước ký.

**Response lỗi 400 — OTP_INVALID_OR_EXPIRED**

```json
{
  "success": false,
  "message": "OTP không đúng hoặc đã hết hạn",
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

**Response nhánh: 200 có tiền, chờ quyết định/đối soát**

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

**Quy tắc:** Trường hợp chưa có Contract trả Request CANCELLED không sinh contractId giả.

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

**Quy tắc:** Không tự bỏ qua tiền chờ/đã nhận. Tính nghĩa vụ theo chính sách đã chốt, không tự đặt refund=0.

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

**Quy tắc:** Giá trị phục hồi là prevStatus thực tế, không luôn DEPOSIT_VERIFIED. Refund amount phải được đối soát theo thỏa thuận trước, endpoint quyết định này không tự bịa tiền hoàn.

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

Xác nhận hoàn tiền. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "reference": "REFUND-VERIFIED-001",
  "note": "Đã kiểm tra hoàn tiền thực tế."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "refund": {
      "amount": 8000000,
      "status": "REFUNDED",
      "at": "2026-10-23 10:00",
      "refundedAt": "2026-10-23 11:00",
      "reference": "REFUND-VERIFIED-001"
    },
    "refundStatus": "COMPLETED"
  }
}
```

**Quy tắc:** amount lấy từ nghĩa vụ hoàn đã xác định, không lấy từ body. Refund* trên CONTRACT khác Payment transaction. Persistence note/time/history cần chốt theo baseline.

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
      "requestId": "REQUEST_001",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": {
        "status": "NOT_CONFIRMED"
      },
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "readiness": {
        "docsReady": 0,
        "docsTotal": 0,
        "insurance": "MISSING",
        "quarantineOk": false
      },
      "milestones": [],
      "etaHistory": []
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
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "NOT_CONFIRMED"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 0,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "milestones": [],
    "etaHistory": []
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
    "requestId": "REQUEST_001",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": {
      "status": "CONFIRMED",
      "specialistId": "USER_005",
      "coordinatorId": "USER_006",
      "at": "2026-10-23 09:40"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 0,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "milestones": [],
    "etaHistory": []
  }
}
```

**Quy tắc:** DTO/UI role mapping rõ; FK USER_*. Sau commit mới task/handoff, không tự READY_TO_DEPART.

**Response lỗi 409 — TRIP_ALREADY_ASSIGNED**

```json
{
  "success": false,
  "message": "Trip đã được phân công",
  "errorCode": "TRIP_ALREADY_ASSIGNED",
  "data": null
}
```



### F1-J59 — POST /manager/trips/{tripId}/hold

Tạm dừng. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Phụ thuộc schema:** Hiện SQL không cho ON_HOLD do CHECK chồng nhau. Ví dụ 200 chỉ là mục tiêu sau khi nhóm sửa ràng buộc; chưa được coi là endpoint triển khai được với SQL hiện tại.

**Request JSON**

```json
{
  "reason": "Chờ xác nhận lịch triển khai."
}
```

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng tạm dừng/tiếp tục chưa được hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```



### F1-J60 — POST /manager/trips/{tripId}/resume

Tiếp tục. Role: **LOGISTICS_MANAGER**.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| tripId | TRIP_001 |

**Phụ thuộc schema:** Phụ thuộc cùng thay đổi CHECK/persistence với hold; không giả lập ON_HOLD thành PENDING.

**Request body:** Không gửi body.

**Quy tắc:** Body không có. Không force READY_TO_DEPART, không rollback IN_TRANSIT.

**Response lỗi 501 — FEATURE_NOT_SUPPORTED**

```json
{
  "success": false,
  "message": "Chức năng tạm dừng/tiếp tục chưa được hỗ trợ",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```



## 14. Giới hạn DTO và việc bàn giao

- Đây là danh sách JSON của **Flow 1 trong FLOW1.md**, không phải toàn bộ API Auth/Flow 2/3/4/5. Không bổ sung estimates, Quote acceptance, số dư/nghiệm thu hoặc API cũ vào đây.
- Các projection có field giống FE nhưng backend phải mapping từ DB, không đọc thẳng các cột có tên khác rồi hy vọng UI tự hiểu. Customer không được nhận budget/exception hoặc ghi chú nội bộ Manager.
- Horse DTO mới theo DB thiếu một số field bắt buộc của type FE cũ (color, fluDate, vetName, vetPhone). Không điền chuỗi giả để tuyên bố khớp. Phải sửa type/adapter hoặc bổ sung persistence trước triển khai; xem mục 14 FLOW1.md.
- Mẫu Contract Customer trả terms/mode/departAt/arriveAt để đọc snapshot; frontend hiện phải dùng dữ liệu này thay nội dung hardcode. number là alias CONTRACT_001, v là integer; không thêm code/version ID thứ hai.
- Feedback text tự do; mapping các trạng thái feedback/version/request theo baseline. Client không lấy state UI ghi thẳng SQL.
- Snapshot cũ phải bất biến; draft/history/acknowledgement/extension/proof/refund và field local UI cần persistence được chốt. Mẫu JSON không thay migration hoặc quyết định chính sách.
- Assignment, cancellation/refund và confirmation có các field audit mới trong response để FE refetch; đây là schema mục tiêu cần đồng bộ caller, không phải dữ liệu đã có trong backend cũ.
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

Đánh dấu toàn bộ thông báo đã đọc. Role: **CUSTOMER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updatedCount": 2,
    "readAt": "2026-10-23 10:00"
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

Đánh dấu toàn bộ thông báo đã đọc. Role: **LOGISTICS_MANAGER**.

**Request body:** Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "updatedCount": 2,
    "readAt": "2026-10-23 10:00"
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


## 15. Quy tắc triển khai đã chốt

- GET Horse trả đủ field UI; `color`, `fluDate`, `vetName`, `vetPhone` chưa có nơi lưu được xác nhận nên null và unsupportedFields chứa đúng tên. Đây không phải dữ liệu trống đã lưu. Form khóa các field này; chỉ mở khi contract và backend cùng xác nhận hỗ trợ.
- Body create Horse yêu cầu các field lõi như mẫu; không nhận id, unsupportedFields hoặc file JSON. Field unsupported bị gửi lên phải trả 400 FIELD_NOT_SUPPORTED, không lặng lẽ bỏ. Tải tệp là bước riêng; nếu đã tạo ngựa nhưng upload lỗi, FE chỉ báo tạo bản ghi thành công một phần và cho mở lại đúng HorseID.
- Giá trị khai báo tối đa 9.999.999.999 VND; microchip đúng 15 chữ số; tên ngựa tối đa 100 ký tự. Max length khác xem OpenAPI.
- Mẫu Request create trả horseCount=0 vì chưa mapping ngựa. Số slot mong muốn và wizardStep là tiến độ UI trong phiên, không hứa lưu xuyên thiết bị. FE giữ tiến độ riêng theo RequestID, không gửi vào DTO lưu. Submit yêu cầu 1–6 HorseID khác nhau, đủ checklist từ backend.
- Request PUT là toàn bộ bộ field được phép ghi trong ví dụ; không gửi status/history/payment/versions/trip. Khi sửa theo feedback, BE so sánh dữ liệu thực thay đổi, không cấm field không thay đổi có trong PUT. FE cũng khóa places/horses theo revisionFields.
- Draft PUT là full editable draft; không phải PATCH. `savedAt`, contractId và versionNo chỉ do backend trả. Publish phải dùng versionNo của response lưu draft, không tự cộng từ độ dài mảng.
- Response Customer contract không được chứa budget/floor/margin. Phiên bản có snapshot customer, places và horses; không dựng snapshot cũ từ dữ liệu hiện tại. Thiếu snapshot thì API báo FEATURE_NOT_SUPPORTED hoặc lỗi dữ liệu; FE khóa đọc nội dung pháp lý/chấp thuận/ký.
- Gia hạn dùng reason riêng; không tự cộng 24 giờ trên FE. Quyết định ACCEPTED feedback nghĩa chấp nhận yêu cầu sửa và chuẩn bị bản mới; REJECTED nghĩa giữ bản và giữ deadline. Không có thao tác RETURNED nhập nhằng trong wire API.
- BANK_TRANSFER cho khách, hồ sơ chung scope=request, hold/resume chưa bật trong frontend. UI không hứa các chức năng này đã lưu được. Không tạo giấy tờ scope=request với HorseID giả.
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

Tiền cọc chỉ cộng SUCCESS của đúng ContractID + VersionNo; BANK_TRANSFER dùng confirmedAmount thực nhận, không dùng amount khai báo. Thanh toán một phần chưa mở OTP. Dòng thanh toán của bản cũ vẫn được giữ để đối soát, không tự gộp vào cọc bản mới.
