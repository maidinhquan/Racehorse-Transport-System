# Flow 2 — toàn bộ JSON API

## Cập nhật helo.html — 26/10/2026

Specialist gửi danh sách hồ sơ có thời hạn trước; Coordinator chốt lịch khởi hành
trên đúng version đó, sau đó Specialist mới chuẩn bị/cấp giấy tờ chính thức.
Không thay đổi dữ liệu đã cấp khi xem trước. API bổ sung và guard nằm tại
[Operations/OPERATIONS.md](../Operations/OPERATIONS.md) và
[operations.openapi.json](../Operations/operations.openapi.json).
Các mô tả cũ cho phép làm hồ sơ trước khi chốt lịch được thay bằng quy tắc này.
Frontend/API contract đã cập nhật; backend chưa được triển khai trong thay đổi này.


> **ĐÃ ĐỔI FLOW ngày 24/10/2026:** [Flow 3](../Flow3/FLOW3.md) là nguồn chuẩn cho đánh giá Specialist → lập phương án → Manager duyệt → hoàn tất booking/nguồn lực/hồ sơ → hai READY → Manager cho phép khởi hành. Các API chuẩn bị/duyệt trùng được đánh dấu SUPERSEDED bên dưới; JSON/schema cũ chỉ tra cứu lịch sử, không triển khai cùng flow mới. Các API hồ sơ và danh mục không bị thay thế tiếp tục áp dụng.

Ngày 24/10/2026. Giao thức mục tiêu dựa trên frontend; chưa nối caller hiện có hoặc kiểm thử backend thật. Không sửa DB/backend. Mẫu thành công chỉ dùng khi backend đã lưu đầy đủ và trả được dữ liệu đúng schema; nếu chưa có khả năng này phải trả 501, không giả mẫu thành dữ liệu thật.

Đọc [FLOW2.md](FLOW2.md) cho flow/quyền/quy tắc và khoảng trống frontend. [flow2.openapi.json](flow2.openapi.json) quy định required/nullable/enum/giới hạn. [flow2.examples.json](flow2.examples.json) có nhánh ROAD/AIR và 0/0 bị chặn.

- Base /api, Bearer token. List trả data array trực tiếp. Actor/time/status/ID/version do BE xác nhận.
- Required bắt buộc; optional được bỏ, nullable nhận null. Không dùng chuỗi rỗng thay object chưa có.
- type/reg/package là khóa ứng dụng (PASSPORT/VN_EXPORT/VN_JP_AIR), không khẳng định có bảng tương ứng. Supplement.id là opaque reference, không tự tạo bảng SUPPLEMENT. ID thật giữ ID_NAME_RULE; FlightBookingID là integer.
- File là bytes; binary success không envelope. Lỗi JSON có success/message/errorCode/data và errors theo field nếu cần.
- routeVersion/resourceVersion/flightVersion/documentSetVersion là revision nghiệp vụ từ server, không RowVersion/base64 giả. Không có nơi lưu ->501.
- VND cho coverage/cost/budget; không tự đổi số USD trong demo chỉ bằng thay nhãn.
- Mẫu là các tình huống độc lập, không phải chuỗi chạy thẳng. Lấy ID/revision từ response thật cùng môi trường.

## Danh mục

| Mã | Method | Endpoint | Chức năng |
|---|---|---|---|
| F2-J01 | GET | /master/flow2-capabilities | Khả năng Flow 2 được triển khai |
| F2-J02 | GET | /specialist/trips | Chuyến Specialist được giao |
| F2-J03 | GET | /specialist/customer-documents | Hồ sơ khách đã nộp |
| F2-J04 | GET | /specialist/documents | Chứng từ CBN |
| F2-J05 | GET | /specialist/document-requests | Yêu cầu bổ sung |
| F2-J06 | GET | /specialist/quarantine-bookings | Lịch kiểm dịch |
| F2-J07 | GET | /specialist/document-types | Loại giấy tờ |
| F2-J08 | GET | /specialist/regulations | Quy định nội bộ |
| F2-J09 | GET | /specialist/requirement-sets | Bộ yêu cầu |
| F2-J10 | GET | /specialist/audit | Nhật ký thao tác |
| F2-J11 | GET | /specialist/trips/{tripId} | Chi tiết chuyến cho Specialist |
| F2-J12 | GET | /specialist/trips/{tripId}/checklist | Checklist do backend đánh giá |
| F2-J13 | POST | /specialist/trips/{tripId}/requirement-set-preview | Xem trước thay đổi checklist |
| F2-J14 | PUT | /specialist/trips/{tripId}/requirement-set | Áp dụng snapshot bộ yêu cầu |
| F2-J15 | POST | /specialist/trips/{tripId}/customer-documents/review | Duyệt bản khách nộp |
| F2-J16 | POST | /specialist/document-requests | Gửi yêu cầu bổ sung cho khách |
| F2-J17 | POST | /specialist/document-requests/{supplementRef}/fulfill | Hoàn tất yêu cầu đã được duyệt |
| F2-J18 | GET | /specialist/trips/{tripId}/customer-documents/{scope}/{key}/file | Đọc file khách có quyền |
| F2-J19 | POST | /specialist/documents | Ghi nhận chứng từ CBN với file thật |
| F2-J20 | POST | /specialist/documents/{documentRef}/versions | Nộp bản mới cùng chứng từ |
| F2-J21 | GET | /specialist/documents/{documentRef}/versions/{versionNo}/file | Đọc file đúng bản chứng từ |
| F2-J22 | POST | /specialist/documents/{documentRef}/review | Duyệt phiên bản chứng từ |
| F2-J23 | PUT | /specialist/documents/{documentRef}/physical-copy | Ghi nhận bản cứng |
| F2-J24 | PUT | /specialist/trips/{tripId}/insurance | Ghi nhận bảo hiểm |
| F2-J25 | POST | /specialist/trips/{tripId}/insurance/verify | Xác minh bảo hiểm |
| F2-J26 | POST | /specialist/quarantine-bookings | Đề nghị lịch kiểm dịch |
| F2-J27 | POST | /specialist/quarantine-bookings/{bookingId}/confirm | Ghi nhận xác nhận từ trạm |
| F2-J28 | POST | /specialist/trips/{tripId}/docs-ready | Xác nhận Docs READY |
| F2-J29 | POST | /specialist/document-types | Tạo document-types |
| F2-J30 | PUT | /specialist/document-types/{configKey} | Sửa document-types |
| F2-J31 | POST | /specialist/regulations | Tạo regulations |
| F2-J32 | PUT | /specialist/regulations/{configKey} | Sửa regulations |
| F2-J33 | POST | /specialist/requirement-sets | Tạo requirement-sets |
| F2-J34 | PUT | /specialist/requirement-sets/{configKey} | Sửa requirement-sets |
| F2-J35 | GET | /coordinator/trips | Chuyến Coordinator được giao |
| F2-J36 | GET | /coordinator/vehicles | Xe để phân công |
| F2-J37 | GET | /coordinator/staff | Nhân sự theo năng lực |
| F2-J38 | GET | /coordinator/checkpoints | Danh mục điểm dừng cho bản đồ |
| F2-J39 | GET | /coordinator/trips/{tripId} | Chi tiết chuyến Coordinator |
| F2-J40 | PUT | /coordinator/trips/{tripId}/route-draft | Lưu thứ tự và tọa độ điểm dừng |
| F2-J41 | POST | /coordinator/trips/{tripId}/route/submit | Gửi tuyến chờ duyệt |
| F2-J42 | PUT | /coordinator/trips/{tripId}/resources | Lưu phân công chặng đang sửa |
| F2-J43 | POST | /coordinator/trips/{tripId}/resources/confirm | Xác nhận nguồn lực |
| F2-J44 | POST | /coordinator/trips/{tripId}/flight/proposals | Đề xuất ngân sách bay |
| F2-J45 | POST | /coordinator/trips/{tripId}/flight/booking | Ghi nhận mã đặt chỗ |
| F2-J46 | POST | /coordinator/trips/{tripId}/route/reopen | Mở bản mới khi đổi kế hoạch |
| F2-J47 | GET | /manager/trips/{tripId}/preparation | Tổng hợp chuẩn bị cho Manager |
| F2-J48 | GET | /manager/trips/{tripId}/readiness | Điều kiện khởi hành |
| F2-J49 | POST | /manager/trips/{tripId}/route/decision | Duyệt hoặc trả tuyến |
| F2-J50 | POST | /manager/trips/{tripId}/flight/decision | Quyết định ngân sách bay |
| F2-J51 | POST | /manager/trips/{tripId}/departure/approve | Duyệt sẵn sàng khởi hành |
| F2-J52 | GET | /customer/requests/{requestId}/supplements | Yêu cầu bổ sung khách phải xử lý |

## Payload theo endpoint

### F2-J01 — GET /master/flow2-capabilities

Khả năng Flow 2 được triển khai. Role: **AUTHENTICATED**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "features": [
      {
        "key": "configuration",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "core",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "document-review",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "document-versions",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "flight-budget",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "insurance",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "readiness",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "requirements",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "resources",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "route-versioning",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      },
      {
        "key": "supplements",
        "enabled": false,
        "reason": "Chưa nghiệm thu backend và nguồn lưu bền vững"
      }
    ],
    "checkpointSuggestionRadiusMeters": 5000
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J01Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J02 — GET /specialist/trips

Chuyến Specialist được giao. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customerName": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destCountry": "JP",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": "CONFIRMED",
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "reqSet": null,
      "docsReady": null,
      "insurance": null,
      "checkpoints": [
        {
          "name": "Sân bay Narita",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "arrivedAt": null,
          "clearance": null
        }
      ],
      "documentSetVersion": 3
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J02Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J03 — GET /specialist/customer-documents

Hồ sơ khách đã nộp. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "documentVersion": 1,
      "status": "SUBMITTED",
      "optional": false,
      "file": "/api/specialist/trips/TRIP_001/customer-documents/HORSE_001/passport/file",
      "note": "Chờ Specialist kiểm tra",
      "issue": null,
      "expiry": null,
      "reviewedAt": null,
      "reviewedBy": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J03Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J04 — GET /specialist/documents

Chứng từ CBN. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J04Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J05 — GET /specialist/document-requests

Yêu cầu bổ sung. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "SUP:TRIP_001:HORSE_001:passport:1",
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
      "dueAt": null,
      "status": "OPEN",
      "createdAt": "2026-10-24 09:00",
      "history": [
        [
          "2026-10-24 09:00",
          "Gửi yêu cầu bổ sung"
        ]
      ]
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J05Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J06 — GET /specialist/quarantine-bookings

Lịch kiểm dịch. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "QUARANTINE_BOOKING_001",
      "tripId": "TRIP_001",
      "station": "Trạm kiểm dịch A",
      "slot": "2026-11-20",
      "ref": "",
      "status": "REQUESTED",
      "notes": "",
      "confirmedAt": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J06Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J07 — GET /specialist/document-types

Loại giấy tờ. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PASSPORT",
      "name": "Hộ chiếu ngựa",
      "group": "IDENTITY",
      "scope": "PER_HORSE",
      "provider": "CUSTOMER",
      "validityDays": null,
      "status": "ACTIVE",
      "customerKey": "passport"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J07Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J08 — GET /specialist/regulations

Quy định nội bộ. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VN_EXPORT",
      "v": 1,
      "effectiveFrom": "2026-10-24",
      "country": "VN",
      "direction": "EXPORT",
      "lines": [
        {
          "typeId": "PASSPORT",
          "provider": "CUSTOMER",
          "scope": "PER_HORSE",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": ""
        }
      ],
      "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
      "status": "ACTIVE"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J08Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J09 — GET /specialist/requirement-sets

Bộ yêu cầu. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VN_JP_AIR",
      "v": 1,
      "effectiveFrom": "2026-10-24",
      "name": "Việt Nam → Nhật Bản",
      "items": [
        [
          "VN",
          "EXPORT"
        ],
        [
          "JP",
          "IMPORT"
        ]
      ],
      "origin": "VN",
      "dest": "JP",
      "modes": [
        "AIR"
      ],
      "note": "",
      "status": "ACTIVE"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J09Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J10 — GET /specialist/audit

Nhật ký thao tác. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | query | Không | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "at": "2026-10-24 09:00",
      "actor": "Specialist A",
      "role": "TRANSPORT_SPECIALIST",
      "action": "REVIEW_CUSTOMER_DOCUMENT",
      "entity": "TRIP_001",
      "detail": "Đã kiểm tra hồ sơ"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].

**Schema:** `#/components/schemas/F2-J10Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J11 — GET /specialist/trips/{tripId}

Chi tiết chuyến cho Specialist. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customerName": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destCountry": "JP",
    "mode": "AIR",
    "status": "PLANNING",
    "deployment": "CONFIRMED",
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Thunderbolt",
        "microchip": "985112004571029",
        "passportNo": "VN-EQ-2020-1029"
      }
    ],
    "reqSet": null,
    "docsReady": null,
    "insurance": null,
    "checkpoints": [
      {
        "name": "Sân bay Narita",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "arrivedAt": null,
        "clearance": null
      }
    ],
    "documentSetVersion": 3
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J11Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J12 — GET /specialist/trips/{tripId}/checklist

Checklist do backend đánh giá. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "typeId": "PASSPORT",
        "horseId": "HORSE_001",
        "provider": "CUSTOMER",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": "",
        "conditionMet": null,
        "counted": true,
        "status": "SUBMITTED",
        "doc": null,
        "missingRule": null
      }
    ],
    "ready": 0,
    "total": 1,
    "pending": 1,
    "needs": 0,
    "status": "NOT_READY",
    "documentSetVersion": 3
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J12Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J13 — POST /specialist/trips/{tripId}/requirement-set-preview

Xem trước thay đổi checklist. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "pkgId": "VN_JP_AIR",
  "pkgV": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "snapshot": {
      "pkgId": "VN_JP_AIR",
      "pkgV": 1,
      "name": "Việt Nam → Nhật Bản",
      "at": "2026-10-24 09:00",
      "by": "USER_005",
      "rules": [
        {
          "country": "VN",
          "direction": "EXPORT",
          "regId": "VN_EXPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        },
        {
          "country": "JP",
          "direction": "IMPORT",
          "regId": "JP_IMPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        }
      ]
    },
    "checklist": {
      "items": [
        {
          "typeId": "PASSPORT",
          "horseId": "HORSE_001",
          "provider": "CUSTOMER",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": "",
          "conditionMet": null,
          "counted": true,
          "status": "SUBMITTED",
          "doc": null,
          "missingRule": null
        }
      ],
      "ready": 0,
      "total": 1,
      "pending": 1,
      "needs": 0,
      "status": "NOT_READY",
      "documentSetVersion": 3
    },
    "changes": [
      {
        "action": "ADD",
        "typeId": "PASSPORT",
        "horseId": null
      }
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ đọc, không áp dụng/sửa dữ liệu; điều kiện phải được BE xác định.

**Schema:** `#/components/schemas/F2-J13Request`, `#/components/schemas/F2-J13Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J14 — PUT /specialist/trips/{tripId}/requirement-set

Áp dụng snapshot bộ yêu cầu. Role: **TRANSPORT_SPECIALIST**. Feature: `requirements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "pkgId": "VN_JP_AIR",
  "pkgV": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "trip": {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customerName": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destCountry": "JP",
      "mode": "AIR",
      "status": "PLANNING",
      "deployment": "CONFIRMED",
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "horses": [
        {
          "id": "HORSE_001",
          "name": "Thunderbolt",
          "microchip": "985112004571029",
          "passportNo": "VN-EQ-2020-1029"
        }
      ],
      "reqSet": {
        "pkgId": "VN_JP_AIR",
        "pkgV": 1,
        "name": "Việt Nam → Nhật Bản",
        "at": "2026-10-24 09:00",
        "by": "USER_005",
        "rules": [
          {
            "country": "VN",
            "direction": "EXPORT",
            "regId": "VN_EXPORT",
            "regV": 1,
            "lines": [
              {
                "typeId": "PASSPORT",
                "provider": "CUSTOMER",
                "scope": "PER_HORSE",
                "level": "REQUIRED",
                "stage": "BEFORE_DEPART",
                "condition": ""
              }
            ]
          },
          {
            "country": "JP",
            "direction": "IMPORT",
            "regId": "JP_IMPORT",
            "regV": 1,
            "lines": [
              {
                "typeId": "PASSPORT",
                "provider": "CUSTOMER",
                "scope": "PER_HORSE",
                "level": "REQUIRED",
                "stage": "BEFORE_DEPART",
                "condition": ""
              }
            ]
          }
        ]
      },
      "docsReady": null,
      "insurance": null,
      "checkpoints": [
        {
          "name": "Sân bay Narita",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "arrivedAt": null,
          "clearance": null
        }
      ],
      "documentSetVersion": 3
    },
    "snapshot": {
      "pkgId": "VN_JP_AIR",
      "pkgV": 1,
      "name": "Việt Nam → Nhật Bản",
      "at": "2026-10-24 09:00",
      "by": "USER_005",
      "rules": [
        {
          "country": "VN",
          "direction": "EXPORT",
          "regId": "VN_EXPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        },
        {
          "country": "JP",
          "direction": "IMPORT",
          "regId": "JP_IMPORT",
          "regV": 1,
          "lines": [
            {
              "typeId": "PASSPORT",
              "provider": "CUSTOMER",
              "scope": "PER_HORSE",
              "level": "REQUIRED",
              "stage": "BEFORE_DEPART",
              "condition": ""
            }
          ]
        }
      ]
    },
    "checklist": {
      "items": [
        {
          "typeId": "PASSPORT",
          "horseId": "HORSE_001",
          "provider": "CUSTOMER",
          "level": "REQUIRED",
          "stage": "BEFORE_DEPART",
          "condition": "",
          "conditionMet": null,
          "counted": true,
          "status": "SUBMITTED",
          "doc": null,
          "missingRule": null
        }
      ],
      "ready": 0,
      "total": 1,
      "pending": 1,
      "needs": 0,
      "status": "NOT_READY",
      "documentSetVersion": 3
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Snapshot do BE dựng từ đúng pkgV và regV; giữ bản chuyến cũ. Invalidate Docs READY.

**Schema:** `#/components/schemas/F2-J14Request`, `#/components/schemas/F2-J14Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J15 — POST /specialist/trips/{tripId}/customer-documents/review

Duyệt bản khách nộp. Role: **TRANSPORT_SPECIALIST**. Feature: `document-review`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "key": "passport",
  "scope": "HORSE_001",
  "documentVersion": 1,
  "decision": "APPROVED",
  "remark": "Đã kiểm tra"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "documentVersion": 1,
      "status": "APPROVED",
      "optional": false,
      "file": "/api/specialist/trips/TRIP_001/customer-documents/HORSE_001/passport/file",
      "note": "Chờ Specialist kiểm tra",
      "issue": null,
      "expiry": null,
      "reviewedAt": "2026-10-24 09:00",
      "reviewedBy": "USER_005"
    },
    "documentSetVersion": 4,
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Kiểm tra đúng bản đã xem, hiệu lực tới ETA; REJECTED cần remark >=5. Scope=request là nhánh chưa đủ persistence.

**Schema:** `#/components/schemas/F2-J15Request`, `#/components/schemas/F2-J15Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J16 — POST /specialist/document-requests

Gửi yêu cầu bổ sung cho khách. Role: **TRANSPORT_SPECIALIST**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "tripId": "TRIP_001",
  "key": "passport",
  "scope": "HORSE_001",
  "reason": "Vui lòng nộp bản còn hiệu lực",
  "dueAt": null
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "SUP:TRIP_001:HORSE_001:passport:1",
    "tripId": "TRIP_001",
    "key": "passport",
    "scope": "HORSE_001",
    "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
    "dueAt": null,
    "status": "OPEN",
    "createdAt": "2026-10-24 09:00",
    "history": [
      [
        "2026-10-24 09:00",
        "Gửi yêu cầu bổ sung"
      ]
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Một OPEN/SUBMITTED trên trip/key/scope; gửi thông báo, mất Docs READY; upload lại chỉ SUBMITTED, duyệt xong mới FULFILLED.

**Schema:** `#/components/schemas/F2-J16Request`, `#/components/schemas/F2-J16Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J17 — POST /specialist/document-requests/{supplementRef}/fulfill

Hoàn tất yêu cầu đã được duyệt. Role: **TRANSPORT_SPECIALIST**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| supplementRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "SUP:TRIP_001:HORSE_001:passport:1",
    "tripId": "TRIP_001",
    "key": "passport",
    "scope": "HORSE_001",
    "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
    "dueAt": null,
    "status": "FULFILLED",
    "createdAt": "2026-10-24 09:00",
    "history": [
      [
        "2026-10-24 09:00",
        "Gửi yêu cầu bổ sung"
      ],
      [
        "2026-10-24 10:00",
        "Đã duyệt bản bổ sung"
      ]
    ]
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ sau đúng bản được APPROVED; idempotent nếu FULFILLED, không bỏ qua duyệt.

**Schema:** `#/components/schemas/F2-J17Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J18 — GET /specialist/trips/{tripId}/customer-documents/{scope}/{key}/file

Đọc file khách có quyền. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| scope | path | Có | string |
| key | path | Có | string |

**Request body:** Không gửi body.

**Response 200:** Binary đúng MIME, có quyền; không bọc JSON thành công. Lỗi vẫn JSON.

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** , trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J19 — POST /specialist/documents

Ghi nhận chứng từ CBN với file thật. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Multipart:** metadata JSON dưới đây và file thật PDF/JPEG/PNG <=10 MiB.

```json
{
  "tripId": "TRIP_001",
  "typeId": "EXPORT_HEALTH",
  "horseId": "HORSE_001",
  "number": "CERT-001",
  "issuer": "Đơn vị cấp giấy A",
  "issuedAt": "2026-11-15",
  "expiry": "2026-12-01"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** FormData metadata JSON và file bytes <=10 MiB. PER_HORSE bắt buộc horseId thuộc chuyến; PER_TRIP chỉ bật khi có lưu bền vững.

**Schema:** `#/components/schemas/F2-J19Request`, `#/components/schemas/F2-J19Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J20 — POST /specialist/documents/{documentRef}/versions

Nộp bản mới cùng chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Multipart:** metadata JSON dưới đây và file thật PDF/JPEG/PNG <=10 MiB.

```json
{
  "expectedVersion": 1,
  "number": "CERT-002",
  "issuer": "Đơn vị cấp giấy A",
  "issuedAt": "2026-11-16",
  "expiry": "2026-12-02"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "SUBMITTED",
      "number": "CERT-002",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-16",
      "expiry": "2026-12-02",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        },
        {
          "v": 2,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/2/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE cấp version mới, reset SUBMITTED, giữ file/review cũ, mất Docs READY.

**Schema:** `#/components/schemas/F2-J20Request`, `#/components/schemas/F2-J20Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J21 — GET /specialist/documents/{documentRef}/versions/{versionNo}/file

Đọc file đúng bản chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| versionNo | path | Có | integer |

**Request body:** Không gửi body.

**Response 200:** Binary đúng MIME, có quyền; không bọc JSON thành công. Lỗi vẫn JSON.

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** , trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J22 — POST /specialist/documents/{documentRef}/review

Duyệt phiên bản chứng từ. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "version": 1,
  "decision": "APPROVED",
  "remark": "Đã kiểm tra"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "document": {
      "id": "LEGAL_MEDICAL_RECORD_002",
      "tripId": "TRIP_001",
      "typeId": "EXPORT_HEALTH",
      "horseId": "HORSE_001",
      "status": "APPROVED",
      "number": "CERT-001",
      "issuer": "Đơn vị cấp giấy A",
      "issuedAt": "2026-11-15",
      "expiry": "2026-12-01",
      "versions": [
        {
          "v": 1,
          "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
          "at": "2026-10-24 09:00",
          "by": "USER_005"
        }
      ],
      "reviews": [
        {
          "v": 1,
          "decision": "APPROVED",
          "at": "2026-10-24 09:00",
          "by": "USER_005",
          "remark": "Đã kiểm tra bản nộp"
        }
      ],
      "rejectReason": null,
      "physicalCopy": false
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ bản SUBMITTED mới nhất; không suy version từ array.length. REJECTED cần remark >=5; hết hạn trước ETA không duyệt.

**Schema:** `#/components/schemas/F2-J22Request`, `#/components/schemas/F2-J22Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J23 — PUT /specialist/documents/{documentRef}/physical-copy

Ghi nhận bản cứng. Role: **TRANSPORT_SPECIALIST**. Feature: `document-versions`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| documentRef | path | Có | string |

**Request JSON**

```json
{
  "version": 1,
  "physicalCopy": true
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "LEGAL_MEDICAL_RECORD_002",
    "tripId": "TRIP_001",
    "typeId": "EXPORT_HEALTH",
    "horseId": "HORSE_001",
    "status": "SUBMITTED",
    "number": "CERT-001",
    "issuer": "Đơn vị cấp giấy A",
    "issuedAt": "2026-11-15",
    "expiry": "2026-12-01",
    "versions": [
      {
        "v": 1,
        "file": "/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file",
        "at": "2026-10-24 09:00",
        "by": "USER_005"
      }
    ],
    "reviews": [],
    "rejectReason": null,
    "physicalCopy": true
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** PUT giá trị tuyệt đối, không toggle mù; có audit. Không tự biến scan thành APPROVED.

**Schema:** `#/components/schemas/F2-J23Request`, `#/components/schemas/F2-J23Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J24 — PUT /specialist/trips/{tripId}/insurance

Ghi nhận bảo hiểm. Role: **TRANSPORT_SPECIALIST**. Feature: `insurance`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "insurer": "Đơn vị bảo hiểm A",
  "policy": "POL-2026-001",
  "validFrom": "2026-11-20",
  "validTo": "2026-11-22",
  "coverage": 120000000,
  "currency": "VND"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "insurance": {
      "v": 1,
      "insurer": "Đơn vị bảo hiểm A",
      "policy": "POL-2026-001",
      "validFrom": "2026-11-20",
      "validTo": "2026-11-22",
      "coverage": 120000000,
      "currency": "VND",
      "status": "PENDING",
      "checkedBy": null,
      "checkedAt": null
    },
    "docsReady": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J24Request`, `#/components/schemas/F2-J24Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J25 — POST /specialist/trips/{tripId}/insurance/verify

Xác minh bảo hiểm. Role: **TRANSPORT_SPECIALIST**. Feature: `insurance`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "insuranceVersion": 1,
  "allHorsesCovered": true,
  "wholeJourneyCovered": true,
  "scopeChecked": true
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "v": 1,
    "insurer": "Đơn vị bảo hiểm A",
    "policy": "POL-2026-001",
    "validFrom": "2026-11-20",
    "validTo": "2026-11-22",
    "coverage": 120000000,
    "currency": "VND",
    "status": "VERIFIED",
    "checkedBy": "USER_005",
    "checkedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE kiểm tra ngựa và khoảng departure–ETA; checkbox không thay dữ liệu thực.

**Schema:** `#/components/schemas/F2-J25Request`, `#/components/schemas/F2-J25Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J26 — POST /specialist/quarantine-bookings

Đề nghị lịch kiểm dịch. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "tripId": "TRIP_001",
  "station": "Trạm kiểm dịch A",
  "slot": "2026-11-20",
  "notes": ""
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "QUARANTINE_BOOKING_001",
    "tripId": "TRIP_001",
    "station": "Trạm kiểm dịch A",
    "slot": "2026-11-20",
    "ref": "",
    "status": "REQUESTED",
    "notes": "",
    "confirmedAt": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J26Request`, `#/components/schemas/F2-J26Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J27 — POST /specialist/quarantine-bookings/{bookingId}/confirm

Ghi nhận xác nhận từ trạm. Role: **TRANSPORT_SPECIALIST**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| bookingId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "ref": "Q-CONF-001"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "QUARANTINE_BOOKING_001",
    "tripId": "TRIP_001",
    "station": "Trạm kiểm dịch A",
    "slot": "2026-11-20",
    "ref": "Q-CONF-001",
    "status": "BOOKED",
    "notes": "",
    "confirmedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ REQUESTED -> BOOKED với xác nhận thật; không đồng nghĩa kiểm dịch đạt hoặc đặt lịch tự động.

**Schema:** `#/components/schemas/F2-J27Request`, `#/components/schemas/F2-J27Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J28 — POST /specialist/trips/{tripId}/docs-ready

> SUPERSEDED: [F3-J16](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Xác nhận Docs READY. Role: **TRANSPORT_SPECIALIST**. Feature: `readiness`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "documentSetVersion": 3,
  "insuranceVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "docsReady": {
      "at": "2026-10-24 09:00",
      "by": "USER_005"
    },
    "documentSetVersion": 3,
    "insuranceVersion": 1
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE tính lại checklist, hồ sơ khách, supplement, bảo hiểm; thiếu config/stale ->409, không nhận booleans ready do FE gửi.

**Schema:** `#/components/schemas/F2-J28Request`, `#/components/schemas/F2-J28Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J29 — POST /specialist/document-types

Tạo document-types. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "name": "Hộ chiếu ngựa",
  "group": "IDENTITY",
  "scope": "PER_HORSE",
  "provider": "CUSTOMER",
  "validityDays": null,
  "status": "ACTIVE",
  "customerKey": "passport"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PASSPORT",
    "name": "Hộ chiếu ngựa",
    "group": "IDENTITY",
    "scope": "PER_HORSE",
    "provider": "CUSTOMER",
    "validityDays": null,
    "status": "ACTIVE",
    "customerKey": "passport"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J29Request`, `#/components/schemas/F2-J29Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J30 — PUT /specialist/document-types/{configKey}

Sửa document-types. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |

**Request JSON**

```json
{
  "name": "Hộ chiếu ngựa",
  "group": "IDENTITY",
  "scope": "PER_HORSE",
  "provider": "CUSTOMER",
  "validityDays": null,
  "status": "ACTIVE",
  "customerKey": "passport"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PASSPORT",
    "name": "Hộ chiếu ngựa",
    "group": "IDENTITY",
    "scope": "PER_HORSE",
    "provider": "CUSTOMER",
    "validityDays": null,
    "status": "ACTIVE",
    "customerKey": "passport"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J30Request`, `#/components/schemas/F2-J30Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J31 — POST /specialist/regulations

Tạo regulations. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "country": "VN",
  "direction": "EXPORT",
  "lines": [
    {
      "typeId": "PASSPORT",
      "provider": "CUSTOMER",
      "scope": "PER_HORSE",
      "level": "REQUIRED",
      "stage": "BEFORE_DEPART",
      "condition": ""
    }
  ],
  "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
  "status": "ACTIVE"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_EXPORT",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "country": "VN",
    "direction": "EXPORT",
    "lines": [
      {
        "typeId": "PASSPORT",
        "provider": "CUSTOMER",
        "scope": "PER_HORSE",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": ""
      }
    ],
    "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J31Request`, `#/components/schemas/F2-J31Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J32 — PUT /specialist/regulations/{configKey}

Sửa regulations. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |
| currentVersion | query | Có | integer |

**Request JSON**

```json
{
  "country": "VN",
  "direction": "EXPORT",
  "lines": [
    {
      "typeId": "PASSPORT",
      "provider": "CUSTOMER",
      "scope": "PER_HORSE",
      "level": "REQUIRED",
      "stage": "BEFORE_DEPART",
      "condition": ""
    }
  ],
  "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_EXPORT",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "country": "VN",
    "direction": "EXPORT",
    "lines": [
      {
        "typeId": "PASSPORT",
        "provider": "CUSTOMER",
        "scope": "PER_HORSE",
        "level": "REQUIRED",
        "stage": "BEFORE_DEPART",
        "condition": ""
      }
    ],
    "note": "Quy định demo nội bộ, chưa xác minh pháp lý",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J32Request`, `#/components/schemas/F2-J32Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J33 — POST /specialist/requirement-sets

Tạo requirement-sets. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "name": "Việt Nam → Nhật Bản",
  "items": [
    [
      "VN",
      "EXPORT"
    ],
    [
      "JP",
      "IMPORT"
    ]
  ],
  "origin": "VN",
  "dest": "JP",
  "modes": [
    "AIR"
  ],
  "note": "",
  "status": "ACTIVE"
}
```

**Response 201 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_JP_AIR",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "name": "Việt Nam → Nhật Bản",
    "items": [
      [
        "VN",
        "EXPORT"
      ],
      [
        "JP",
        "IMPORT"
      ]
    ],
    "origin": "VN",
    "dest": "JP",
    "modes": [
      "AIR"
    ],
    "note": "",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.

**Schema:** `#/components/schemas/F2-J33Request`, `#/components/schemas/F2-J33Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J34 — PUT /specialist/requirement-sets/{configKey}

Sửa requirement-sets. Role: **TRANSPORT_SPECIALIST**. Feature: `configuration`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| configKey | path | Có | string |
| currentVersion | query | Có | integer |

**Request JSON**

```json
{
  "name": "Việt Nam → Nhật Bản",
  "items": [
    [
      "VN",
      "EXPORT"
    ],
    [
      "JP",
      "IMPORT"
    ]
  ],
  "origin": "VN",
  "dest": "JP",
  "modes": [
    "AIR"
  ],
  "note": "",
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "VN_JP_AIR",
    "v": 1,
    "effectiveFrom": "2026-10-24",
    "name": "Việt Nam → Nhật Bản",
    "items": [
      [
        "VN",
        "EXPORT"
      ],
      [
        "JP",
        "IMPORT"
      ]
    ],
    "origin": "VN",
    "dest": "JP",
    "modes": [
      "AIR"
    ],
    "note": "",
    "status": "ACTIVE"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.

**Schema:** `#/components/schemas/F2-J34Request`, `#/components/schemas/F2-J34Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J35 — GET /coordinator/trips

Chuyến Coordinator được giao. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "TRIP_001",
      "requestId": "REQUEST_001",
      "customer": "Nguyen Van A",
      "origin": "Ho Chi Minh City",
      "destination": "Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "horses": [
        "HORSE_001"
      ],
      "plannedDepart": "2026-11-20 08:00",
      "eta": "2026-11-21 18:00",
      "status": "PLANNING",
      "deploymentStatus": "CONFIRMED",
      "route": {
        "version": 1,
        "status": "DRAFT",
        "stops": [
          {
            "id": "ROUTE_SEGMENT_001",
            "name": "Trại ngựa A",
            "type": "ORIGIN",
            "country": "VN",
            "plannedAt": "2026-11-20 08:00",
            "lat": 10.82,
            "lng": 106.65,
            "checkpointId": null
          },
          {
            "id": "ROUTE_SEGMENT_002",
            "name": "SGN",
            "type": "AIRPORT",
            "country": "VN",
            "plannedAt": "2026-11-20 10:00",
            "lat": 10.82,
            "lng": 106.65,
            "checkpointId": 101
          },
          {
            "id": "ROUTE_SEGMENT_003",
            "name": "NRT",
            "type": "AIRPORT",
            "country": "JP",
            "plannedAt": "2026-11-21 14:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": 201
          },
          {
            "id": "ROUTE_SEGMENT_004",
            "name": "Trạm kiểm dịch A",
            "type": "QUARANTINE_STATION",
            "country": "JP",
            "plannedAt": "2026-11-21 16:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": 203
          },
          {
            "id": "ROUTE_SEGMENT_005",
            "name": "Trại ngựa B",
            "type": "DESTINATION",
            "country": "JP",
            "plannedAt": "2026-11-21 18:00",
            "lat": 35.77,
            "lng": 140.39,
            "checkpointId": null
          }
        ],
        "submittedAt": null,
        "reviewedAt": null,
        "returnReason": null
      },
      "vehicleId": null,
      "crew": {},
      "legs": {
        "outbound": {
          "key": "outbound",
          "title": "Chặng VN",
          "country": "VN",
          "from": "Trại ngựa A",
          "to": "SGN",
          "vehicleId": null,
          "crew": {}
        },
        "inbound": {
          "key": "inbound",
          "title": "Chặng JP",
          "country": "JP",
          "from": "NRT",
          "to": "Trại ngựa B",
          "vehicleId": null,
          "crew": {}
        }
      },
      "flight": {
        "version": 1,
        "airline": "Hãng bay A",
        "flightNo": "AIR001",
        "fromAirport": "SGN",
        "toAirport": "NRT",
        "departAt": "2026-11-20 12:00",
        "arriveAt": "2026-11-21 14:00",
        "cost": 25000000,
        "currency": "VND",
        "departureAirportCheckpointId": 101,
        "arrivalAirportCheckpointId": 201,
        "status": "BUDGET_PENDING",
        "bookingRef": null,
        "bookingId": null
      },
      "resourcesConfirmed": null,
      "resourceVersion": 0,
      "milestones": [],
      "etaHistory": []
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J35Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J36 — GET /coordinator/vehicles

Xe để phân công. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VEHICLE_001",
      "plate": "51C-12345",
      "model": "Xe vận chuyển ngựa",
      "stalls": 4,
      "country": "VN",
      "base": "Ho Chi Minh City",
      "status": "READY",
      "nextService": "2026-12-01",
      "features": "Thông gió, vách ngăn"
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J36Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J37 — GET /coordinator/staff

Nhân sự theo năng lực. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_008",
      "name": "Driver A",
      "role": "DRIVER",
      "country": "VN",
      "phone": "+84901234567",
      "licence": null,
      "certExpiry": null
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J37Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J38 — GET /coordinator/checkpoints

Danh mục điểm dừng cho bản đồ. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "checkpointId": 101,
      "name": "Sân bay SGN",
      "country": "VN",
      "type": "AIRPORT",
      "lat": 10.8188,
      "lng": 106.652,
      "active": true
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.

**Schema:** `#/components/schemas/F2-J38Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J39 — GET /coordinator/trips/{tripId}

Chi tiết chuyến Coordinator. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {}
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 0,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J39Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J40 — PUT /coordinator/trips/{tripId}/route-draft

> SUPERSEDED: [F3-J06](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Lưu thứ tự và tọa độ điểm dừng. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "expectedRouteVersion": 0,
  "stops": [
    {
      "id": "ROUTE_SEGMENT_001",
      "name": "Trại ngựa A",
      "type": "ORIGIN",
      "country": "VN",
      "plannedAt": "2026-11-20 08:00",
      "lat": 10.82,
      "lng": 106.65,
      "checkpointId": null
    },
    {
      "id": "ROUTE_SEGMENT_002",
      "name": "SGN",
      "type": "AIRPORT",
      "country": "VN",
      "plannedAt": "2026-11-20 10:00",
      "lat": 10.82,
      "lng": 106.65,
      "checkpointId": 101
    },
    {
      "id": "ROUTE_SEGMENT_003",
      "name": "NRT",
      "type": "AIRPORT",
      "country": "JP",
      "plannedAt": "2026-11-21 14:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": 201
    },
    {
      "id": "ROUTE_SEGMENT_004",
      "name": "Trạm kiểm dịch A",
      "type": "QUARANTINE_STATION",
      "country": "JP",
      "plannedAt": "2026-11-21 16:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": 203
    },
    {
      "id": "ROUTE_SEGMENT_005",
      "name": "Trại ngựa B",
      "type": "DESTINATION",
      "country": "JP",
      "plannedAt": "2026-11-21 18:00",
      "lat": 35.77,
      "lng": 140.39,
      "checkpointId": null
    }
  ]
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "status": "DRAFT",
    "stops": [
      {
        "id": "ROUTE_SEGMENT_001",
        "name": "Trại ngựa A",
        "type": "ORIGIN",
        "country": "VN",
        "plannedAt": "2026-11-20 08:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": null
      },
      {
        "id": "ROUTE_SEGMENT_002",
        "name": "SGN",
        "type": "AIRPORT",
        "country": "VN",
        "plannedAt": "2026-11-20 10:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": 101
      },
      {
        "id": "ROUTE_SEGMENT_003",
        "name": "NRT",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 201
      },
      {
        "id": "ROUTE_SEGMENT_004",
        "name": "Trạm kiểm dịch A",
        "type": "QUARANTINE_STATION",
        "country": "JP",
        "plannedAt": "2026-11-21 16:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 203
      },
      {
        "id": "ROUTE_SEGMENT_005",
        "name": "Trại ngựa B",
        "type": "DESTINATION",
        "country": "JP",
        "plannedAt": "2026-11-21 18:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": null
      }
    ],
    "submittedAt": null,
    "reviewedAt": null,
    "returnReason": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Thêm/xóa/sắp xếp là staging trước PUT. Điểm mới không gửi ID tạm; BE cấp ROUTE_SEGMENT_*. Đổi cấu trúc mất xác nhận resources và duyệt tuyến cũ.

**Schema:** `#/components/schemas/F2-J40Request`, `#/components/schemas/F2-J40Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J41 — POST /coordinator/trips/{tripId}/route/submit

> SUPERSEDED: [F3-J08](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Gửi tuyến chờ duyệt. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "status": "PENDING_APPROVAL",
    "stops": [
      {
        "id": "ROUTE_SEGMENT_001",
        "name": "Trại ngựa A",
        "type": "ORIGIN",
        "country": "VN",
        "plannedAt": "2026-11-20 08:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": null
      },
      {
        "id": "ROUTE_SEGMENT_002",
        "name": "SGN",
        "type": "AIRPORT",
        "country": "VN",
        "plannedAt": "2026-11-20 10:00",
        "lat": 10.82,
        "lng": 106.65,
        "checkpointId": 101
      },
      {
        "id": "ROUTE_SEGMENT_003",
        "name": "NRT",
        "type": "AIRPORT",
        "country": "JP",
        "plannedAt": "2026-11-21 14:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 201
      },
      {
        "id": "ROUTE_SEGMENT_004",
        "name": "Trạm kiểm dịch A",
        "type": "QUARANTINE_STATION",
        "country": "JP",
        "plannedAt": "2026-11-21 16:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": 203
      },
      {
        "id": "ROUTE_SEGMENT_005",
        "name": "Trại ngựa B",
        "type": "DESTINATION",
        "country": "JP",
        "plannedAt": "2026-11-21 18:00",
        "lat": 35.77,
        "lng": 140.39,
        "checkpointId": null
      }
    ],
    "submittedAt": "2026-10-24 09:00",
    "reviewedAt": null,
    "returnReason": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Cần resourcesConfirmed; AIR BOOKED và đủ hai chặng xe. DRAFT/RETURNED -> PENDING_APPROVAL. Không đợi route APPROVED mới confirm resources.

**Schema:** `#/components/schemas/F2-J41Request`, `#/components/schemas/F2-J41Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J42 — PUT /coordinator/trips/{tripId}/resources

> SUPERSEDED: [F3-J06](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Lưu phân công chặng đang sửa. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `resources`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request JSON**

```json
{
  "expectedResourceVersion": 0,
  "leg": "outbound",
  "vehicleId": null,
  "crew": {
    "MAIN_DRIVER": "USER_008",
    "CO_DRIVER": "USER_009",
    "VETERINARIAN": "USER_010"
  }
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {
          "MAIN_DRIVER": "USER_008",
          "CO_DRIVER": "USER_009",
          "VETERINARIAN": "USER_010"
        }
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** ROAD leg=null; AIR phải outbound/inbound. PUT full xe/crew của chặng; slot thiếu là chưa phân công. Không sửa PENDING_APPROVAL/APPROVED, phải reopen.

**Schema:** `#/components/schemas/F2-J42Request`, `#/components/schemas/F2-J42Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J43 — POST /coordinator/trips/{tripId}/resources/confirm

> SUPERSEDED: [F3-J14](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Xác nhận nguồn lực. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `resources`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "flightVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 1,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_008",
          "CO_DRIVER": "USER_009",
          "VETERINARIAN": "USER_010"
        }
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": "VEHICLE_002",
        "crew": {
          "MAIN_DRIVER": "USER_011",
          "CO_DRIVER": "USER_012",
          "VETERINARIAN": "USER_013"
        }
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BOOKED",
      "bookingRef": "BOOK-001",
      "bookingId": 300
    },
    "resourcesConfirmed": {
      "at": "2026-10-24 09:00",
      "by": "USER_006"
    },
    "resourceVersion": 3,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** BE kiểm tra xung đột/chứng chỉ, 3 người khác nhau, đủ stalls, đúng quốc gia; AIR đủ hai chặng + BOOKED. Không đòi route APPROVED.

**Schema:** `#/components/schemas/F2-J43Request`, `#/components/schemas/F2-J43Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J44 — POST /coordinator/trips/{tripId}/flight/proposals

> SUPERSEDED: [F3-J06](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Đề xuất ngân sách bay. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "expectedFlightVersion": 0,
  "airline": "Hãng bay A",
  "flightNo": "AIR001",
  "fromAirport": "SGN",
  "toAirport": "NRT",
  "departAt": "2026-11-20 12:00",
  "arriveAt": "2026-11-21 14:00",
  "cost": 25000000,
  "currency": "VND",
  "departureAirportCheckpointId": 101,
  "arrivalAirportCheckpointId": 201
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "airline": "Hãng bay A",
    "flightNo": "AIR001",
    "fromAirport": "SGN",
    "toAirport": "NRT",
    "departAt": "2026-11-20 12:00",
    "arriveAt": "2026-11-21 14:00",
    "cost": 25000000,
    "currency": "VND",
    "departureAirportCheckpointId": 101,
    "arrivalAirportCheckpointId": 201,
    "status": "BUDGET_PENDING",
    "bookingRef": null,
    "bookingId": null
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** AIR bay thẳng, sân bay đúng quốc gia/thứ tự tuyến, VND. Không insert FLIGHT_BOOKING BookingConfirmed=1 khi mới đề xuất.

**Schema:** `#/components/schemas/F2-J44Request`, `#/components/schemas/F2-J44Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J45 — POST /coordinator/trips/{tripId}/flight/booking

> SUPERSEDED: [F3-J13](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Ghi nhận mã đặt chỗ. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "flightVersion": 1,
  "bookingRef": "BOOK-001"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "airline": "Hãng bay A",
    "flightNo": "AIR001",
    "fromAirport": "SGN",
    "toAirport": "NRT",
    "departAt": "2026-11-20 12:00",
    "arriveAt": "2026-11-21 14:00",
    "cost": 25000000,
    "currency": "VND",
    "departureAirportCheckpointId": 101,
    "arrivalAirportCheckpointId": 201,
    "status": "BOOKED",
    "bookingRef": "BOOK-001",
    "bookingId": 300
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ BUDGET_APPROVED đúng bản với mã thật. bookingId INT, không FLIGHT_BOOKING_001.

**Schema:** `#/components/schemas/F2-J45Request`, `#/components/schemas/F2-J45Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J46 — POST /coordinator/trips/{tripId}/route/reopen

> SUPERSEDED: [F3-J09/F3-J12](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Mở bản mới khi đổi kế hoạch. Role: **FLEET_ROUTE_COORDINATOR**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "reason": "Cần đổi trạm nghỉ và bố trí lại xe"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TRIP_001",
    "requestId": "REQUEST_001",
    "customer": "Nguyen Van A",
    "origin": "Ho Chi Minh City",
    "destination": "Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "horses": [
      "HORSE_001"
    ],
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "status": "PLANNING",
    "deploymentStatus": "CONFIRMED",
    "route": {
      "version": 2,
      "status": "DRAFT",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "submittedAt": null,
      "reviewedAt": null,
      "returnReason": null
    },
    "vehicleId": null,
    "crew": {},
    "legs": {
      "outbound": {
        "key": "outbound",
        "title": "Chặng VN",
        "country": "VN",
        "from": "Trại ngựa A",
        "to": "SGN",
        "vehicleId": null,
        "crew": {}
      },
      "inbound": {
        "key": "inbound",
        "title": "Chặng JP",
        "country": "JP",
        "from": "NRT",
        "to": "Trại ngựa B",
        "vehicleId": null,
        "crew": {}
      }
    },
    "flight": {
      "version": 1,
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "fromAirport": "SGN",
      "toAirport": "NRT",
      "departAt": "2026-11-20 12:00",
      "arriveAt": "2026-11-21 14:00",
      "cost": 25000000,
      "currency": "VND",
      "departureAirportCheckpointId": 101,
      "arrivalAirportCheckpointId": 201,
      "status": "BUDGET_PENDING",
      "bookingRef": null,
      "bookingId": null
    },
    "resourcesConfirmed": null,
    "resourceVersion": 0,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ PLANNING, tăng routeVersion, hủy duyệt/xác nhận liên quan. READY_TO_DEPART cần quy trình thu hồi duyệt riêng ngoài contract này.

**Schema:** `#/components/schemas/F2-J46Request`, `#/components/schemas/F2-J46Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J47 — GET /manager/trips/{tripId}/preparation

> SUPERSEDED: [F3-J10](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Tổng hợp chuẩn bị cho Manager. Role: **LOGISTICS_MANAGER**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

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
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": null,
    "flight": null,
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": null,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Schema:** `#/components/schemas/F2-J47Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J48 — GET /manager/trips/{tripId}/readiness

> SUPERSEDED: [F3-J17](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Điều kiện khởi hành. Role: **LOGISTICS_MANAGER**. Feature: `core`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": null,
    "canApprove": false,
    "checks": [
      {
        "key": "docs",
        "ok": false,
        "code": "DOCS_NOT_READY",
        "message": "Hồ sơ chưa được xác nhận"
      }
    ],
    "evaluatedAt": "2026-10-24 09:00"
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Tính dữ liệu mới nhất; 0/0 hoặc missing config không phải đủ hồ sơ. ROAD/AIR có checks khác nhau.

**Schema:** `#/components/schemas/F2-J48Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J49 — POST /manager/trips/{tripId}/route/decision

> SUPERSEDED: [F3-J11](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Duyệt hoặc trả tuyến. Role: **LOGISTICS_MANAGER**. Feature: `route-versioning`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "decision": "APPROVED",
  "reason": "Đã kiểm tra phương án"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

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
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": {
      "v": 1,
      "status": "APPROVED",
      "submittedAt": "2026-10-24 08:30",
      "stops": [
        {
          "id": "ROUTE_SEGMENT_001",
          "name": "Trại ngựa A",
          "type": "ORIGIN",
          "country": "VN",
          "plannedAt": "2026-11-20 08:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": null
        },
        {
          "id": "ROUTE_SEGMENT_002",
          "name": "SGN",
          "type": "AIRPORT",
          "country": "VN",
          "plannedAt": "2026-11-20 10:00",
          "lat": 10.82,
          "lng": 106.65,
          "checkpointId": 101
        },
        {
          "id": "ROUTE_SEGMENT_003",
          "name": "NRT",
          "type": "AIRPORT",
          "country": "JP",
          "plannedAt": "2026-11-21 14:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 201
        },
        {
          "id": "ROUTE_SEGMENT_004",
          "name": "Trạm kiểm dịch A",
          "type": "QUARANTINE_STATION",
          "country": "JP",
          "plannedAt": "2026-11-21 16:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": 203
        },
        {
          "id": "ROUTE_SEGMENT_005",
          "name": "Trại ngựa B",
          "type": "DESTINATION",
          "country": "JP",
          "plannedAt": "2026-11-21 18:00",
          "lat": 35.77,
          "lng": 140.39,
          "checkpointId": null
        }
      ],
      "vehicle": "51C-12345 / JP-001",
      "crew": [
        [
          "MAIN_DRIVER",
          "Driver VN A"
        ],
        [
          "CO_DRIVER",
          "Driver VN B"
        ],
        [
          "VETERINARIAN",
          "Vet VN"
        ],
        [
          "MAIN_DRIVER",
          "Driver JP A"
        ],
        [
          "CO_DRIVER",
          "Driver JP B"
        ],
        [
          "VETERINARIAN",
          "Vet JP"
        ]
      ],
      "resourcesConfirmed": true,
      "note": "",
      "decisionNote": "Đã kiểm tra phương án",
      "decidedAt": "2026-10-24 09:00"
    },
    "flight": {
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "budget": 25000000,
      "status": "BOOKED",
      "decidedAt": "2026-10-24 08:00"
    },
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 3,
    "flightVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ PENDING_APPROVAL; RETURNED reason>=10. Duyệt đúng bundle tuyến/xe/crew, không duyệt nhân sự riêng.

**Schema:** `#/components/schemas/F2-J49Request`, `#/components/schemas/F2-J49Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J50 — POST /manager/trips/{tripId}/flight/decision

> SUPERSEDED: [F3-J11](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Quyết định ngân sách bay. Role: **LOGISTICS_MANAGER**. Feature: `flight-budget`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "flightVersion": 1,
  "decision": "APPROVED",
  "note": "Đồng ý ngân sách"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

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
      "at": "2026-10-24 09:00"
    },
    "plannedDepart": "2026-11-20 08:00",
    "eta": "2026-11-21 18:00",
    "readiness": {
      "docsReady": 0,
      "docsTotal": 1,
      "docsReadyAt": null,
      "insurance": "MISSING",
      "quarantineOk": false
    },
    "route": null,
    "flight": {
      "airline": "Hãng bay A",
      "flightNo": "AIR001",
      "budget": 25000000,
      "status": "APPROVED",
      "decidedAt": "2026-10-24 09:00"
    },
    "departureApprovedAt": null,
    "routeVersion": 1,
    "resourceVersion": 0,
    "flightVersion": 1,
    "milestones": [],
    "etaHistory": []
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Chỉ BUDGET_PENDING; REJECTED note>=10. Manager APPROVED = Coordinator BUDGET_APPROVED, chưa BOOKED.

**Schema:** `#/components/schemas/F2-J50Request`, `#/components/schemas/F2-J50Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J51 — POST /manager/trips/{tripId}/departure/approve

> SUPERSEDED: [F3-J18](../Flow3/FLOW3-API-JSON.md), mẫu cũ chỉ để tra cứu.

Duyệt sẵn sàng khởi hành. Role: **LOGISTICS_MANAGER**. Feature: `readiness`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| tripId | path | Có | string |
| Idempotency-Key | header | Có | string |

**Request JSON**

```json
{
  "routeVersion": 1,
  "resourceVersion": 3,
  "flightVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "tripStatus": "READY_TO_DEPART",
    "requestId": "REQUEST_001",
    "requestStatus": "SCHEDULED",
    "departureApprovedAt": "2026-10-24 09:00",
    "approvedBy": "USER_004",
    "routeVersion": 1,
    "resourceVersion": 3,
    "flightVersion": 1
  }
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Transaction kiểm tra tất cả bằng chứng/reservations; Trip READY_TO_DEPART + Request SCHEDULED, actor/time. Không tạo DEPARTED/IN_TRANSIT.

**Schema:** `#/components/schemas/F2-J51Request`, `#/components/schemas/F2-J51Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.

### F2-J52 — GET /customer/requests/{requestId}/supplements

Yêu cầu bổ sung khách phải xử lý. Role: **CUSTOMER**. Feature: `supplements`.

| Tham số | Nơi gửi | Bắt buộc | Kiểu |
|---|---|---|---|
| requestId | path | Có | string |

**Request body:** Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "SUP:TRIP_001:HORSE_001:passport:1",
      "tripId": "TRIP_001",
      "key": "passport",
      "scope": "HORSE_001",
      "reason": "Vui lòng nộp bản hộ chiếu còn hiệu lực",
      "dueAt": null,
      "status": "OPEN",
      "createdAt": "2026-10-24 09:00",
      "history": [
        [
          "2026-10-24 09:00",
          "Gửi yêu cầu bổ sung"
        ]
      ]
    }
  ]
}
```

**Response 501 — khi chưa hỗ trợ**

```json
{
  "success": false,
  "message": "Chức năng chưa có nơi lưu bền vững được xác nhận",
  "errorCode": "FEATURE_NOT_SUPPORTED",
  "data": null
}
```

**Điều kiện/ảnh hưởng:** Cùng DocRequest của Specialist; upload dùng Flow 1 J17, không tạo hồ sơ độc lập. Upload chưa APPROVED/FULFILLED.

**Schema:** `#/components/schemas/F2-J52Response`, trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.
