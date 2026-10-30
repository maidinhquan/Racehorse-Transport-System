# Flow 3 v2 — JSON từng API

Cập nhật 27/10/2026 theo `Final_Flow3.html`, ghi đè contract cũ. **Chỉ tài liệu mục tiêu, chưa triển khai backend/DB.**

[Quy tắc nghiệp vụ](FLOW3.md) · [OpenAPI](flow3.openapi.json) · [Kịch bản](flow3.examples.json).

Base `/api`, Bearer JWT. Mẫu mỗi API độc lập; lấy ID/revision từ response thật, không chạy nối tiếp các mẫu có cùng version. GET/DELETE không body; DELETE gửi expectedVersion qua query. Mutation có Idempotency-Key UUID, riêng POST validate read-only không cần. List trả data array; binary tải xác thực. Actor/time/status/deadline/giá server cấp. Thời gian Asia/Ho_Chi_Minh; tiền nguyên VND.

| Mã | Method | Endpoint | Chức năng |
|---|---|---|---|
| F3-J01 | GET | `/master/flow3-capabilities` | Khả năng triển khai và policy Flow 3 v2 |
| F3-J02 | GET | `/specialist/trips/{tripId}/planning-context` | Context cho nhánh hồ sơ song song |
| F3-J04 | GET | `/coordinator/trips/{tripId}/planning-context` | Context điều phối và cả hai nhánh chuẩn bị |
| F3-J05 | GET | `/coordinator/flights` | Tra chuyến bay đối tác (read-only) |
| F3-J06 | PUT | `/coordinator/trips/{tripId}/plan-draft` | Lưu nháp tuyến, lịch, xe và nhân sự |
| F3-J07 | POST | `/coordinator/trips/{tripId}/plan/validate` | Kiểm nháp, không giữ nguồn lực |
| F3-J08 | POST | `/coordinator/trips/{tripId}/plan/submit` | Gửi tổng thể và giữ tạm nguyên tử |
| F3-J09 | POST | `/coordinator/trips/{tripId}/plan/withdraw` | Rút nháp/chờ duyệt/trả lại |
| F3-J10 | GET | `/manager/trips/{tripId}/preparation` | Manager xem hai nhánh và bundle cần duyệt |
| F3-J11 | POST | `/manager/trips/{tripId}/plan/decision` | Duyệt/trả toàn bộ phương án |
| F3-J12 | POST | `/coordinator/trips/{tripId}/plan/changes` | Tạo bản điều chỉnh approved/flight proposal |
| F3-J13 | POST | `/coordinator/trips/{tripId}/flight/booking` | Ghi nhận booking đã xác nhận bởi đối tác |
| F3-J14 | POST | `/coordinator/trips/{tripId}/resources/confirm` | Xác nhận bố trí xe/người và tính Ops READY |
| F3-J15 | POST | `/coordinator/trips/{tripId}/ops-ready` | Kiểm tra/xác nhận lại Ops READY |
| F3-J16 | POST | `/specialist/trips/{tripId}/docs-ready` | Xác nhận Docs READY độc lập nhánh điều phối |
| F3-J17 | GET | `/manager/trips/{tripId}/readiness` | Đọc gate và revision duyệt khởi hành |
| F3-J18 | POST | `/manager/trips/{tripId}/departure/approve` | Duyệt khởi hành riêng |
| F3-J19 | GET | `/trips/{tripId}/planning-history` | Lịch sử phương án, quyết định và bằng chứng |
| F3-J20 | POST | `/coordinator/trips/{tripId}/flight/booking/cancel` | Ghi nhận hủy booking đã được đối tác xác nhận |
| F3-J23 | GET | `/coordinator/trips` | Danh sách chuyến được giao và KPI planning |
| F3-J24 | GET | `/coordinator/trips/{tripId}` | Chi tiết chuyến, điểm nhận/giao, ngựa và readiness |
| F3-J25 | POST | `/coordinator/trips/{tripId}/plan/routing` | Tính tuyến đường bộ tham khảo |
| F3-J26 | POST | `/coordinator/trips/{tripId}/plan/truck-check` | Kiểm tuyến theo kích thước/tải trọng xe |
| F3-J27 | GET | `/coordinator/trips/{tripId}/vehicle-options` | Lọc xe theo chặng/sức chứa/quốc gia/lối vào |
| F3-J28 | PUT | `/coordinator/trips/{tripId}/pickup-access` | Ghi xác minh xe có vào địa chỉ nhận |
| F3-J29 | GET | `/coordinator/trips/{tripId}/pickup-relocation/candidates` | Tìm cơ sở tiếp nhận thay thế |
| F3-J30 | POST | `/coordinator/trips/{tripId}/pickup-relocation` | Đề xuất điểm nhận thay thế |
| F3-J31 | POST | `/manager/trips/{tripId}/pickup-relocation/decision` | Manager xét đề xuất điểm nhận |
| F3-J32 | POST | `/manager/trips/{tripId}/pickup-relocation/customer-consent` | Ghi nhận khách đã đồng ý thực tế |
| F3-J33 | POST | `/coordinator/trips/{tripId}/pickup-relocation/revisions` | Mở lại đề xuất điểm nhận đã chốt |
| F3-J34 | GET | `/coordinator/air-partners` | Danh sách bên dịch vụ bay |
| F3-J35 | POST | `/coordinator/air-partners` | Thêm bên dịch vụ |
| F3-J36 | PUT | `/coordinator/air-partners/{partnerId}` | Sửa thông tin bên dịch vụ |
| F3-J37 | PUT | `/coordinator/air-partners/{partnerId}/status` | Kích hoạt/ngừng bên dịch vụ |
| F3-J38 | DELETE | `/coordinator/air-partners/{partnerId}` | Xóa đối tác chưa từng tham chiếu |
| F3-J39 | PUT | `/coordinator/trips/{tripId}/flight/selection` | Chọn dịch vụ đúng partner/mã vào draft |
| F3-J40 | POST | `/coordinator/trips/{tripId}/flight/proposal/submit` | Gửi riêng chi phí dịch vụ bay |
| F3-J41 | POST | `/manager/trips/{tripId}/flight/decision` | Manager xét ngân sách bay riêng |
| F3-J42 | POST | `/coordinator/trips/{tripId}/flight/evidence` | Upload bằng chứng đối tác (tùy chọn booking) |
| F3-J43 | GET | `/coordinator/places` | Danh mục đa chức năng cho bản đồ |
| F3-J44 | POST | `/coordinator/places` | Thêm địa điểm dùng chung |
| F3-J45 | PUT | `/coordinator/places/{placeId}` | Sửa địa điểm và giờ mở |
| F3-J46 | PUT | `/coordinator/places/{placeId}/status` | Đổi trạng thái cơ sở |
| F3-J47 | DELETE | `/coordinator/places/{placeId}` | Xóa địa điểm chưa được tham chiếu |
| F3-J48 | GET | `/coordinator/staff` | Danh mục nhân sự và trạng thái vận hành |
| F3-J49 | PUT | `/coordinator/staff/{staffId}/status` | Đổi ACTIVE/ON_LEAVE/INACTIVE |
| F3-J50 | GET | `/manager/flights` | Manager đọc catalogue bay |
| F3-J51 | GET | `/manager/air-partners` | Manager đọc bên dịch vụ |
| F3-J52 | GET | `/trips/{tripId}/planning-files/{fileId}` | Tải bằng chứng planning có xác thực |
| F3-J53 | GET | `/coordinator/trips/{tripId}/route-reports` | Đọc báo cáo tài xế gắn mốc trên bản đồ |
| F3-J54 | GET | `/coordinator/flights/lookup` | Tra mã chuyến trong đúng bên dịch vụ |
| F3-J55 | GET | `/coordinator/vehicles` | Danh mục xe và thông số đã xác minh |

F3-J03/J21/J22 đã retired; xem bảng chuyển đổi trong FLOW3.md. Không còn feasibility/timed-document gate. Mỗi endpoint sau đây bao gồm schema, JSON thành công và mã lỗi trong OpenAPI.

## F3-J01 — GET /master/flow3-capabilities

Khả năng triển khai và policy Flow 3 v2.

**Role:** `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`.

**Điều kiện và ảnh hưởng:** Metadata contract mục tiêu; flags thực tế chỉ true sau nghiệm thu. Không lộ API key. Chưa có persistence/provider thì false và mutation trả 501.

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": "2.0.0",
    "implementationStatus": "DESIGNED_NOT_IMPLEMENTED",
    "parallelPreparation": true,
    "documentValidityMode": "ASSUMED_VALID_FOR_TRIP",
    "feasibilityRequired": false,
    "timedDocumentsGate": false,
    "roadConfirmBeforeSubmit": true,
    "airConfirmAfterBooking": true,
    "demoEnabled": false,
    "routingAvailable": false,
    "truckRoutingAvailable": false,
    "persistenceAvailable": false,
    "policy": null,
    "currency": "VND",
    "timezone": "Asia/Ho_Chi_Minh",
    "maxHorses": 4,
    "maxUploadBytes": 10485760
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J02 — GET /specialist/trips/{tripId}/planning-context

Context cho nhánh hồ sơ song song.

**Role:** `TRANSPORT_SPECIALIST`.

**Điều kiện và ảnh hưởng:** Chỉ Trip được giao. Không tạo feasibility gate; không đợi Coordinator chốt lịch để chuẩn bị giấy.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J04 — GET /coordinator/trips/{tripId}/planning-context

Context điều phối và cả hai nhánh chuẩn bị.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Context điều phối và cả hai nhánh chuẩn bị

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J05 — GET /coordinator/flights

Tra chuyến bay đối tác (read-only).

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Có tripId thì kiểm assignment, lịch/country/số ngựa. Không có lịch phù hợp trả []; không tự tạo schedule. Giá VND báo giá đã xác nhận.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `tripId` | Không | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| query | `partnerId` | Không | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| query | `code` | Không | `{"type": "string", "example": "EQA-DEMO-01", "minLength": 1, "maxLength": 100}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "serviceId": "SERVICE_001",
      "catalogVersion": 1,
      "partnerId": "PARTNER_001",
      "partnerName": "Thông tin đã xác minh",
      "providerFlightCode": "EQA-DEMO-01",
      "flightNo": "EQA 7710",
      "fromAirportId": "AIRPORT_001",
      "toAirportId": "AIRPORT_002",
      "fromCountry": "VN",
      "toCountry": "JP",
      "departLocal": "2026-11-10 15:00",
      "departZone": "Asia/Ho_Chi_Minh",
      "arriveLocal": "2026-11-10 22:30",
      "arriveZone": "Asia/Tokyo",
      "departAt": "2026-11-10 15:00",
      "arriveAt": "2026-11-10 20:30",
      "capacity": 4,
      "costVnd": 105000000,
      "currency": "VND",
      "careIncluded": true,
      "direct": true,
      "status": "AVAILABLE",
      "sample": true,
      "eligible": true,
      "blockers": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J06 — PUT /coordinator/trips/{tripId}/plan-draft

Lưu nháp tuyến, lịch, xe và nhân sự.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** PLANNING + deployed. Tạo nếu chưa có draft, sửa DRAFT/RETURNED; không sửa APPROVED tại chỗ. Server cấp planVersion nội dung mới, tính dependency và invalidation. Draft cho thiếu, không giữ mới; thay bộ đã confirm giải phóng hold draft không còn dùng. Không nhận deadline/ETA/geometry/status/actor. Chọn bay qua J39.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "plannedDepart": "2026-11-10 06:00",
  "stops": [
    {
      "clientKey": "stop-origin",
      "type": "ORIGIN",
      "placeId": null,
      "purposes": [],
      "dwellMin": 0,
      "unload": false,
      "careNote": ""
    },
    {
      "clientKey": "stop-destination",
      "type": "DESTINATION",
      "placeId": null,
      "purposes": [],
      "dwellMin": 0,
      "unload": false,
      "careNote": ""
    }
  ],
  "resources": [
    {
      "leg": "road",
      "vehicleId": "VEHICLE_001",
      "crew": {
        "MAIN_DRIVER": "USER_008",
        "CO_DRIVER": "USER_009",
        "VETERINARIAN": "USER_010"
      },
      "truckProfile": {
        "vehicleId": "VEHICLE_001",
        "heightM": 3.8,
        "widthM": 2.5,
        "lengthM": 10,
        "currentT": 12,
        "grossT": 18,
        "axleT": 4
      }
    }
  ],
  "note": ""
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 2
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 2,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J07 — POST /coordinator/trips/{tripId}/plan/validate

Kiểm nháp, không giữ nguồn lực.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Read-only: thiếu điều kiện trả 200 valid=false + blockers; stale binding 409. Không tạo hold hoặc dấu READY; không bắt feasibility/docs-ready/booking AIR.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": null
    },
    "planVersion": 1,
    "valid": true,
    "blockers": [],
    "eta": "2026-11-10 06:30",
    "resourceHoldsCreated": false
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J08 — POST /coordinator/trips/{tripId}/plan/submit

Gửi tổng thể và giữ tạm nguyên tử.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** ROAD phải resourcesConfirmed hợp lệ. AIR chỉ đủ bộ dự kiến, chưa cần booking/confirm thực tế; tự submit budget nếu DRAFT/REJECTED. Cả hai kiểm server routing, truck, access, care, deadline, source, resource conflict và giữ tạm toàn bộ trong transaction. Không đợi Specialist feasibility/Docs READY.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "PENDING_APPROVAL",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, RESOURCE_CONFLICT, INVALID_CREW, RESOURCES_NOT_CONFIRMED, TRUCK_ROUTE_REQUIRED, PICKUP_CONSENT_REQUIRED, VEHICLE_ACCESS_RESTRICTED, CARE_POLICY_VIOLATION, DELIVERY_DEADLINE_EXCEEDED, FLIGHT_CATALOG_CHANGED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J09 — POST /coordinator/trips/{tripId}/plan/withdraw

Rút nháp/chờ duyệt/trả lại.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** WITHDRAWN, giải phóng hold đúng draft, giữ approved cũ và history; không hủy booking đối tác. Không rút approved bằng endpoint này.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": null
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": null,
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J10 — GET /manager/trips/{tripId}/preparation

Manager xem hai nhánh và bundle cần duyệt.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Manager xem hai nhánh và bundle cần duyệt

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J11 — POST /manager/trips/{tripId}/plan/decision

Duyệt/trả toàn bộ phương án.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Chỉ đúng pending snapshot. RETURN cần reason>=5, giải phóng hold draft. APPROVE recheck atomic; ROAD cần confirm còn đúng; AIR duyệt cả budget/nguồn lực dự kiến, chưa booking, xóa confirm thực tế cũ. Không yêu cầu Docs READY. Approved cũ chỉ SUPERSEDED khi approve mới thành công.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1,
  "decision": "APPROVE"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": null,
    "approvedPlan": {
      "planVersion": 1,
      "status": "APPROVED",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "resourcesConfirmed": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "opsReady": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, RESOURCE_CONFLICT, INVALID_CREW, RESOURCES_NOT_CONFIRMED, TRUCK_ROUTE_REQUIRED, PICKUP_CONSENT_REQUIRED, VEHICLE_ACCESS_RESTRICTED, CARE_POLICY_VIOLATION, DELIVERY_DEADLINE_EXCEEDED, FLIGHT_CATALOG_CHANGED, OLD_BOOKING_ACTIVE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J12 — POST /coordinator/trips/{tripId}/plan/changes

Tạo bản điều chỉnh approved/flight proposal.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Giữ approved/booking/history; tạo DRAFT nội dung revision mới, vô hiệu evidence bị ảnh hưởng và chặn departure. Flight pending có thể rút trước khi sửa; không overwrite BOOKED. Không tự gửi duyệt hoặc đổi hạn giao.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Đã kiểm tra và xác nhận phương án"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 2
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 2,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": {
      "planVersion": 1,
      "status": "APPROVED",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J13 — POST /coordinator/trips/{tripId}/flight/booking

Ghi nhận booking đã xác nhận bởi đối tác.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** AIR approved plan + budget đúng flightVersion/catalog snapshot; confirmedHorses đúng mapping. Booking external, không gọi hãng thật; mã unique case-fold theo partner giữa các Trip. File tùy chọn phải thuộc Trip, đã scan. DEMO chỉ trip demo/capability. Thành công xóa confirm vận hành để J14 kiểm lại.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1,
  "flightVersion": 1,
  "bookingRef": "EQA-BOOK-001",
  "confirmedHorses": 2,
  "acknowledged": true,
  "source": "PARTNER_REFERENCE",
  "note": "",
  "evidenceFileId": null
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "AIR",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "JP",
      "geo": {
        "lat": 35.8,
        "lng": 140.4
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": null,
    "approvedPlan": {
      "planVersion": 1,
      "status": "APPROVED",
      "mode": "AIR",
      "plannedDepart": "2026-11-10 11:00",
      "eta": "2026-11-10 23:00",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "air-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-origin",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 11:00",
          "departAt": "2026-11-10 11:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "air-departure",
          "type": "AIRPORT",
          "placeId": "AIRPORT_001",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 210,
          "unload": false,
          "careNote": "",
          "name": "air-departure",
          "geo": {
            "lat": 10.8188,
            "lng": 106.6519
          },
          "required": true,
          "arriveAt": "2026-11-10 11:30",
          "departAt": "2026-11-10 15:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_003",
          "clientKey": "air-arrival",
          "type": "AIRPORT",
          "placeId": "AIRPORT_002",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 120,
          "unload": false,
          "careNote": "",
          "name": "air-arrival",
          "geo": {
            "lat": 35.772,
            "lng": 140.3929
          },
          "required": true,
          "arriveAt": "2026-11-10 20:30",
          "departAt": "2026-11-10 22:30",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_004",
          "clientKey": "air-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-destination",
          "geo": {
            "lat": 35.8,
            "lng": 140.4
          },
          "required": true,
          "arriveAt": "2026-11-10 23:00",
          "departAt": "2026-11-10 23:00",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "outbound",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        },
        {
          "leg": "inbound",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "MAIN_DRIVER": "USER_011",
            "CO_DRIVER": "USER_012",
            "VETERINARIAN": "USER_013"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_002",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": {
        "flightVersion": 1,
        "status": "BOOKED",
        "service": {
          "serviceId": "SERVICE_001",
          "catalogVersion": 1,
          "partnerId": "PARTNER_001",
          "partnerName": "Thông tin đã xác minh",
          "providerFlightCode": "EQA-DEMO-01",
          "flightNo": "EQA 7710",
          "fromAirportId": "AIRPORT_001",
          "toAirportId": "AIRPORT_002",
          "fromCountry": "VN",
          "toCountry": "JP",
          "departLocal": "2026-11-10 15:00",
          "departZone": "Asia/Ho_Chi_Minh",
          "arriveLocal": "2026-11-10 22:30",
          "arriveZone": "Asia/Tokyo",
          "departAt": "2026-11-10 15:00",
          "arriveAt": "2026-11-10 20:30",
          "capacity": 4,
          "costVnd": 105000000,
          "currency": "VND",
          "careIncluded": true,
          "direct": true,
          "status": "AVAILABLE",
          "sample": true,
          "eligible": true,
          "blockers": []
        },
        "careAcknowledged": true
      },
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "air-origin",
            "toStopKey": "air-departure",
            "leg": "outbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.8188,
                106.6519
              ]
            ]
          },
          {
            "fromStopKey": "air-arrival",
            "toStopKey": "air-destination",
            "leg": "inbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                35.772,
                140.3929
              ],
              [
                35.8,
                140.4
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "air-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-origin",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 11:00",
            "departAt": "2026-11-10 11:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "air-departure",
            "type": "AIRPORT",
            "placeId": "AIRPORT_001",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 210,
            "unload": false,
            "careNote": "",
            "name": "air-departure",
            "geo": {
              "lat": 10.8188,
              "lng": 106.6519
            },
            "required": true,
            "arriveAt": "2026-11-10 11:30",
            "departAt": "2026-11-10 15:00",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_003",
            "clientKey": "air-arrival",
            "type": "AIRPORT",
            "placeId": "AIRPORT_002",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 120,
            "unload": false,
            "careNote": "",
            "name": "air-arrival",
            "geo": {
              "lat": 35.772,
              "lng": 140.3929
            },
            "required": true,
            "arriveAt": "2026-11-10 20:30",
            "departAt": "2026-11-10 22:30",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_004",
            "clientKey": "air-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-destination",
            "geo": {
              "lat": 35.8,
              "lng": 140.4
            },
            "required": true,
            "arriveAt": "2026-11-10 23:00",
            "departAt": "2026-11-10 23:00",
            "placeVersion": null
          }
        ],
        "totalKm": 40,
        "driveMin": 60,
        "stopMin": 330,
        "flyMin": 330,
        "eta": "2026-11-10 23:00",
        "issues": []
      },
      "note": ""
    },
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": {
      "bookingId": 1,
      "planVersion": 1,
      "flightVersion": 1,
      "partnerId": "PARTNER_001",
      "bookingRef": "EQA-BOOK-001",
      "confirmedHorses": 2,
      "source": "PARTNER_REFERENCE",
      "status": "BOOKED",
      "evidenceFileId": null,
      "recordedAt": "2026-11-10 06:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      }
    },
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PLAN_NOT_APPROVED, FLIGHT_CATALOG_CHANGED, BOOKING_REFERENCE_DUPLICATE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J14 — POST /coordinator/trips/{tripId}/resources/confirm

Xác nhận bố trí xe/người và tính Ops READY.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** ROAD DRAFT đủ bộ trước submit, tạo hold nguyên tử; không cần plan approved. AIR sau approved+BOOKED đúng plan, kiểm thực tế. Không dùng chung gate booking AIR cho ROAD; opsReady chỉ valid khi toàn bộ điều kiện vận hành đã đủ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, RESOURCE_CONFLICT, INVALID_CREW, PLAN_NOT_APPROVED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J15 — POST /coordinator/trips/{tripId}/ops-ready

Kiểm tra/xác nhận lại Ops READY.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Compatibility command sau APPROVED, cùng kiểm tra vận hành như J14; không boolean client. J14 đã tính Ops READY nên frontend không bắt thêm nút mới.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": null,
    "approvedPlan": {
      "planVersion": 1,
      "status": "APPROVED",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "resourcesConfirmed": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "opsReady": {
      "valid": true,
      "planVersion": 1,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PLAN_NOT_APPROVED, RESOURCES_NOT_CONFIRMED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J16 — POST /specialist/trips/{tripId}/docs-ready

Xác nhận Docs READY độc lập nhánh điều phối.

**Role:** `TRANSPORT_SPECIALIST`.

**Điều kiện và ảnh hưởng:** PLANNING, đúng assigned Specialist, đã áp bộ yêu cầu/đủ hồ sơ approved + insurance VERIFIED; không bắt plan approved/feasibility/timed schedule. Stamp lưu doc/insurance/context dependency; plan/lịch đổi đánh giá lại, không sao chép valid mù.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": {
      "valid": true,
      "planVersion": null,
      "contextVersion": 1,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00",
      "invalidatedReason": null
    },
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DOCS_NOT_READY, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J17 — GET /manager/trips/{tripId}/readiness

Đọc gate và revision duyệt khởi hành.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Projection do server tính, không tạo READY. checkedAt không cấp lease; POST phải recheck toàn bộ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": null
    },
    "readinessVersion": 10,
    "approvedPlanVersion": 1,
    "docsReady": true,
    "opsReady": true,
    "canApproveDeparture": true,
    "openChange": false,
    "checkedAt": "2026-11-09 15:00",
    "checks": [
      {
        "code": "DEPLOYMENT_CONFIRMED",
        "group": "SHARED",
        "tab": "overview",
        "label": "Đã giao việc và đúng phân công",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "CONTRACT_EFFECTIVE",
        "group": "SHARED",
        "tab": "overview",
        "label": "Hợp đồng hiệu lực và cọc đã xác minh",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "APPROVED_PLAN",
        "group": "SHARED",
        "tab": "route",
        "label": "Đúng phương án được Manager duyệt, không bản sửa mở",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "RESOURCES_CONFIRMED",
        "group": "SHARED",
        "tab": "resources",
        "label": "Xe và ba người mỗi ROAD khả dụng, đã xác nhận",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "TRUCK_ROUTE_VERIFIED",
        "group": "SHARED",
        "tab": "route",
        "label": "Tuyến theo đúng kích thước và tải trọng xe",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "ENDPOINT_ACCESS_VERIFIED",
        "group": "SHARED",
        "tab": "route",
        "label": "Xe tiếp cận được điểm nhận/giao hoặc điểm nhận thay thế đã đồng ý",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "CARE_POLICY_VALID",
        "group": "SHARED",
        "tab": "route",
        "label": "Lịch dừng nghỉ và bàn giao phù hợp",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "DELIVERY_DEADLINE_VALID",
        "group": "SHARED",
        "tab": "route",
        "label": "ETA trong hạn giao và chưa quá giờ khởi hành",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "DOCUMENTS_APPROVED",
        "group": "SHARED",
        "tab": "readiness",
        "label": "Đủ bộ hồ sơ được duyệt",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "INSURANCE_VERIFIED",
        "group": "SHARED",
        "tab": "readiness",
        "label": "Bảo hiểm đã xác minh và bao phủ",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "QUARANTINE_VALID",
        "group": "SHARED",
        "tab": "readiness",
        "label": "Lịch kiểm dịch bắt buộc đã xác nhận hoặc không yêu cầu",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "DOCS_READY_VALID",
        "group": "SHARED",
        "tab": "readiness",
        "label": "Docs READY còn đúng nội dung hiện tại",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "OPS_READY_VALID",
        "group": "SHARED",
        "tab": "resources",
        "label": "Ops READY còn đúng nội dung hiện tại",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      },
      {
        "code": "NO_BLOCKING_INCIDENT",
        "group": "SHARED",
        "tab": "incidents",
        "label": "Không sự cố đang chặn khởi hành",
        "ok": true,
        "detail": "Đã kiểm tra theo bằng chứng hiện hành"
      }
    ],
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J18 — POST /manager/trips/{tripId}/departure/approve

Duyệt khởi hành riêng.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Atomic recheck context/contract/deposit/plan+no open change, resources, truck/access/care, Docs/Ops READY, insurance/quarantine, AIR budget+booking, deadline/serverNow<=plannedDepart/no blocking incident. Change returns 409 blockers. Commit Trip READY_TO_DEPART + Request SCHEDULED + audit/notification, không DEPARTED.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "approvedPlanVersion": 1,
  "readinessVersion": 10
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "tripStatus": "READY_TO_DEPART",
    "requestStatus": "SCHEDULED",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "approvedPlanVersion": 1,
    "approvedBy": {
      "userId": "USER_001",
      "name": "Thông tin đã xác minh"
    },
    "approvedAt": "2026-11-09 15:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `READINESS_CHANGED, STALE_VERSION, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: READINESS_CHANGED",
  "errorCode": "READINESS_CHANGED",
  "data": null,
  "blockers": [
    {
      "code": "READINESS_CHANGED",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J19 — GET /trips/{tripId}/planning-history

Lịch sử phương án, quyết định và bằng chứng.

**Role:** `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`.

**Điều kiện và ảnh hưởng:** Cùng quyền assigned trip/manager scope; immutable history cả rút/trả, consent/booking hủy và invalidation. Không hard-delete để làm sạch revision.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "eventId": "EVENT_001",
      "at": "2026-11-10 06:00",
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "action": "Thông tin đã xác minh",
      "planVersion": null,
      "detail": "Đã kiểm tra và xác nhận phương án"
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J20 — POST /coordinator/trips/{tripId}/flight/booking/cancel

Ghi nhận hủy booking đã được đối tác xác nhận.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Chỉ pre-departure; không gọi hãng/hủy ngoài thực tế. Lưu xác nhận hủy + lịch sử, vô hiệu Ops READY; không tự hoàn tiền hoặc rewrite booking. Retry không ghi đôi.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "bookingId": 1,
  "cancellationRef": "Thông tin đã xác minh",
  "reason": "Đã kiểm tra và xác nhận phương án",
  "partnerConfirmed": true,
  "evidenceFileId": null
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "AIR",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "JP",
      "geo": {
        "lat": 35.8,
        "lng": 140.4
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": null,
    "approvedPlan": {
      "planVersion": 1,
      "status": "APPROVED",
      "mode": "AIR",
      "plannedDepart": "2026-11-10 11:00",
      "eta": "2026-11-10 23:00",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "air-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-origin",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 11:00",
          "departAt": "2026-11-10 11:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "air-departure",
          "type": "AIRPORT",
          "placeId": "AIRPORT_001",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 210,
          "unload": false,
          "careNote": "",
          "name": "air-departure",
          "geo": {
            "lat": 10.8188,
            "lng": 106.6519
          },
          "required": true,
          "arriveAt": "2026-11-10 11:30",
          "departAt": "2026-11-10 15:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_003",
          "clientKey": "air-arrival",
          "type": "AIRPORT",
          "placeId": "AIRPORT_002",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 120,
          "unload": false,
          "careNote": "",
          "name": "air-arrival",
          "geo": {
            "lat": 35.772,
            "lng": 140.3929
          },
          "required": true,
          "arriveAt": "2026-11-10 20:30",
          "departAt": "2026-11-10 22:30",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_004",
          "clientKey": "air-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-destination",
          "geo": {
            "lat": 35.8,
            "lng": 140.4
          },
          "required": true,
          "arriveAt": "2026-11-10 23:00",
          "departAt": "2026-11-10 23:00",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "outbound",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        },
        {
          "leg": "inbound",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "MAIN_DRIVER": "USER_011",
            "CO_DRIVER": "USER_012",
            "VETERINARIAN": "USER_013"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_002",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": {
        "flightVersion": 1,
        "status": "BUDGET_APPROVED",
        "service": {
          "serviceId": "SERVICE_001",
          "catalogVersion": 1,
          "partnerId": "PARTNER_001",
          "partnerName": "Thông tin đã xác minh",
          "providerFlightCode": "EQA-DEMO-01",
          "flightNo": "EQA 7710",
          "fromAirportId": "AIRPORT_001",
          "toAirportId": "AIRPORT_002",
          "fromCountry": "VN",
          "toCountry": "JP",
          "departLocal": "2026-11-10 15:00",
          "departZone": "Asia/Ho_Chi_Minh",
          "arriveLocal": "2026-11-10 22:30",
          "arriveZone": "Asia/Tokyo",
          "departAt": "2026-11-10 15:00",
          "arriveAt": "2026-11-10 20:30",
          "capacity": 4,
          "costVnd": 105000000,
          "currency": "VND",
          "careIncluded": true,
          "direct": true,
          "status": "AVAILABLE",
          "sample": true,
          "eligible": true,
          "blockers": []
        },
        "careAcknowledged": true
      },
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "air-origin",
            "toStopKey": "air-departure",
            "leg": "outbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.8188,
                106.6519
              ]
            ]
          },
          {
            "fromStopKey": "air-arrival",
            "toStopKey": "air-destination",
            "leg": "inbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                35.772,
                140.3929
              ],
              [
                35.8,
                140.4
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "air-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-origin",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 11:00",
            "departAt": "2026-11-10 11:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "air-departure",
            "type": "AIRPORT",
            "placeId": "AIRPORT_001",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 210,
            "unload": false,
            "careNote": "",
            "name": "air-departure",
            "geo": {
              "lat": 10.8188,
              "lng": 106.6519
            },
            "required": true,
            "arriveAt": "2026-11-10 11:30",
            "departAt": "2026-11-10 15:00",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_003",
            "clientKey": "air-arrival",
            "type": "AIRPORT",
            "placeId": "AIRPORT_002",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 120,
            "unload": false,
            "careNote": "",
            "name": "air-arrival",
            "geo": {
              "lat": 35.772,
              "lng": 140.3929
            },
            "required": true,
            "arriveAt": "2026-11-10 20:30",
            "departAt": "2026-11-10 22:30",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_004",
            "clientKey": "air-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-destination",
            "geo": {
              "lat": 35.8,
              "lng": 140.4
            },
            "required": true,
            "arriveAt": "2026-11-10 23:00",
            "departAt": "2026-11-10 23:00",
            "placeVersion": null
          }
        ],
        "totalKm": 40,
        "driveMin": 60,
        "stopMin": 330,
        "flyMin": 330,
        "eta": "2026-11-10 23:00",
        "issues": []
      },
      "note": ""
    },
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": {
      "bookingId": 1,
      "planVersion": 1,
      "flightVersion": 1,
      "partnerId": "PARTNER_001",
      "bookingRef": "EQA-BOOK-001",
      "confirmedHorses": 2,
      "source": "PARTNER_REFERENCE",
      "status": "CANCELLED",
      "evidenceFileId": null,
      "recordedAt": "2026-11-10 06:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      }
    },
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, OLD_BOOKING_ACTIVE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J23 — GET /coordinator/trips

Danh sách chuyến được giao và KPI planning.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Danh sách chuyến được giao và KPI planning

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `status` | Không | `{"type": "string", "example": "PLANNING", "enum": ["PLANNING", "READY_TO_DEPART", "IN_TRANSIT", "COMPLETED"]}` |
| query | `mode` | Không | `{"type": "string", "example": "ROAD", "enum": ["ROAD", "AIR"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "status": "PLANNING",
      "planningState": "AWAITING_ROUTE",
      "plannedDepart": null,
      "eta": null,
      "deliveryDeadline": "2026-11-10 06:00",
      "horseCount": 2,
      "docsReady": false,
      "opsReady": false,
      "blockerCount": 0
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J24 — GET /coordinator/trips/{tripId}

Chi tiết chuyến, điểm nhận/giao, ngựa và readiness.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Chi tiết chuyến, điểm nhận/giao, ngựa và readiness

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 10,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": "2026-11-10 06:30",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "stop-origin",
            "toStopKey": "stop-destination",
            "leg": "road",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.9,
                106.8
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "stop-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 06:00",
            "departAt": "2026-11-10 06:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "stop-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "Thông tin đã xác minh",
            "geo": {
              "lat": 10.9,
              "lng": 106.8
            },
            "required": true,
            "arriveAt": "2026-11-10 06:30",
            "departAt": "2026-11-10 06:30",
            "placeVersion": null
          }
        ],
        "totalKm": 20,
        "driveMin": 30,
        "stopMin": 0,
        "flyMin": 0,
        "eta": "2026-11-10 06:30",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J25 — POST /coordinator/trips/{tripId}/plan/routing

Tính tuyến đường bộ tham khảo.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Resolve current saved stops từ server; provider URL/key server, không SSRF URL client. Tính geometry/times theo policy; OSRM không truck verification. Lưu routing evidence tăng aggregate version; client refetch context. Dữ liệu demo chỉ Trip demo được bật.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "routingId": "ROUTING_001",
    "planVersion": 1,
    "policyVersion": 1,
    "provider": "OSRM",
    "truckVerified": false,
    "demo": false,
    "checkedAt": "2026-11-10 06:00",
    "segments": [
      {
        "fromStopKey": "stop-origin",
        "toStopKey": "stop-destination",
        "leg": "road",
        "km": 20,
        "driveMin": 30,
        "geometry": [
          [
            10.7769,
            106.7009
          ],
          [
            10.9,
            106.8
          ]
        ]
      }
    ],
    "stops": [
      {
        "stopId": "STOP_001",
        "clientKey": "stop-origin",
        "type": "ORIGIN",
        "placeId": null,
        "purposes": [],
        "dwellMin": 0,
        "unload": false,
        "careNote": "",
        "name": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "required": true,
        "arriveAt": "2026-11-10 06:00",
        "departAt": "2026-11-10 06:00",
        "placeVersion": null
      },
      {
        "stopId": "STOP_002",
        "clientKey": "stop-destination",
        "type": "DESTINATION",
        "placeId": null,
        "purposes": [],
        "dwellMin": 0,
        "unload": false,
        "careNote": "",
        "name": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.9,
          "lng": 106.8
        },
        "required": true,
        "arriveAt": "2026-11-10 06:30",
        "departAt": "2026-11-10 06:30",
        "placeVersion": null
      }
    ],
    "totalKm": 20,
    "driveMin": 30,
    "stopMin": 0,
    "flyMin": 0,
    "eta": "2026-11-10 06:30",
    "issues": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, ROUTING_REQUIRED, CARE_POLICY_VIOLATION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 503:** `ROUTING_UNAVAILABLE`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J26 — POST /coordinator/trips/{tripId}/plan/truck-check

Kiểm tuyến theo kích thước/tải trọng xe.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** HERE_TRUCK server-side từng ROAD với profile đúng xe; validate gross/current/axle/spec. Critical restriction hoặc snap>250m chặn. Lưu provider result/dependency, không tin client signature/ok; provider unavailable 503 không fallback OSRM thành verified. Refetch version sau thành công.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "routingId": "ROUTING_001",
    "planVersion": 1,
    "policyVersion": 1,
    "provider": "HERE_TRUCK",
    "truckVerified": true,
    "demo": false,
    "checkedAt": "2026-11-10 06:00",
    "segments": [
      {
        "fromStopKey": "stop-origin",
        "toStopKey": "stop-destination",
        "leg": "road",
        "km": 20,
        "driveMin": 30,
        "geometry": [
          [
            10.7769,
            106.7009
          ],
          [
            10.9,
            106.8
          ]
        ]
      }
    ],
    "stops": [
      {
        "stopId": "STOP_001",
        "clientKey": "stop-origin",
        "type": "ORIGIN",
        "placeId": null,
        "purposes": [],
        "dwellMin": 0,
        "unload": false,
        "careNote": "",
        "name": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "required": true,
        "arriveAt": "2026-11-10 06:00",
        "departAt": "2026-11-10 06:00",
        "placeVersion": null
      },
      {
        "stopId": "STOP_002",
        "clientKey": "stop-destination",
        "type": "DESTINATION",
        "placeId": null,
        "purposes": [],
        "dwellMin": 0,
        "unload": false,
        "careNote": "",
        "name": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.9,
          "lng": 106.8
        },
        "required": true,
        "arriveAt": "2026-11-10 06:30",
        "departAt": "2026-11-10 06:30",
        "placeVersion": null
      }
    ],
    "totalKm": 20,
    "driveMin": 30,
    "stopMin": 0,
    "flyMin": 0,
    "eta": "2026-11-10 06:30",
    "issues": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, TRUCK_ROUTE_REQUIRED, VEHICLE_ACCESS_RESTRICTED, CARE_POLICY_VIOLATION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 503:** `ROUTING_UNAVAILABLE`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J27 — GET /coordinator/trips/{tripId}/vehicle-options

Lọc xe theo chặng/sức chứa/quốc gia/lối vào.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** ROAD leg=road, AIR outbound/inbound. Check vehicle.spec so access pickup/delivery, status/conflict/capacity; unknown spec có blocker không tự suy stalls. GET không giữ xe.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| query | `leg` | Có | `{"type": "string", "example": "road", "enum": ["road", "outbound", "inbound"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VEHICLE_001",
      "plate": "51C-12345",
      "stalls": 4,
      "country": "VN",
      "status": "READY",
      "spec": {
        "heightM": 3.8,
        "widthM": 2.5,
        "lengthM": 10,
        "grossT": 18
      },
      "eligible": true,
      "blockers": [],
      "assignedTrips": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J28 — PUT /coordinator/trips/{tripId}/pickup-access

Ghi xác minh xe có vào địa chỉ nhận.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** DRAFT (hoặc chưa có route), xe/profile đã lưu; proof>=8, acknowledged. Bind server xe/profile/request endpoint. Consent đã chốt không sửa đè: J33 trước. Vô hiệu routing/confirm liên quan.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "result": "ACCESSIBLE",
  "proof": "Đã khảo sát và đối chiếu kích thước xe",
  "acknowledged": true
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PICKUP_CONSENT_REQUIRED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J29 — GET /coordinator/trips/{tripId}/pickup-relocation/candidates

Tìm cơ sở tiếp nhận thay thế.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Cùng country active QUARANTINE, parking/loading/waterFeed/capacity và mở toàn khoảng handover; km đường thẳng gắn nhãn. Không đặt cơ sở realtime.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "place": {
        "id": "PLACE_001",
        "version": 1,
        "name": "Cơ sở nghỉ chăm sóc ngựa",
        "country": "VN",
        "province": "Thông tin đã xác minh",
        "address": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "functions": [
          "QUARANTINE",
          "REST"
        ],
        "hours": "24/7",
        "contact": "Thông tin đã xác minh",
        "phone": "+84901234567",
        "notes": "",
        "rest": {
          "truckParking": true,
          "onboardCare": true,
          "waterFeed": true,
          "loadingArea": true,
          "stabling": true,
          "capacity": 4
        },
        "fuel": null,
        "airport": null,
        "service": {
          "kind": "Thông tin đã xác minh",
          "capacity": "Thông tin đã xác minh"
        },
        "status": "ACTIVE",
        "sample": true,
        "updatedAt": "2026-11-10 06:00"
      },
      "straightLineKm": null,
      "eligible": true,
      "blockers": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J30 — POST /coordinator/trips/{tripId}/pickup-relocation

Đề xuất điểm nhận thay thế.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Chỉ sau INACCESSIBLE đúng xe; DRAFT, placeVersion live, reason>=10 + facilityConfirmed. PROPOSED không đổi ORIGIN. Lưu place/access snapshot và notify Manager. Consent đang chốt cần J33 trước.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "placeId": "PLACE_001",
  "placeVersion": 1,
  "reason": "Lối vào hẹp, khách đưa ngựa đến cơ sở đã liên hệ",
  "handoverAt": "2026-11-10 06:00",
  "facilityConfirmed": true
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "INACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": {
      "relocationId": "MEETING_001",
      "status": "PROPOSED",
      "placeSnapshot": {
        "id": "PLACE_001",
        "version": 1,
        "name": "Cơ sở nghỉ chăm sóc ngựa",
        "country": "VN",
        "province": "Thông tin đã xác minh",
        "address": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "functions": [
          "QUARANTINE",
          "REST"
        ],
        "hours": "24/7",
        "contact": "Thông tin đã xác minh",
        "phone": "+84901234567",
        "notes": "",
        "rest": {
          "truckParking": true,
          "onboardCare": true,
          "waterFeed": true,
          "loadingArea": true,
          "stabling": true,
          "capacity": 4
        },
        "fuel": null,
        "airport": null,
        "service": {
          "kind": "Thông tin đã xác minh",
          "capacity": "Thông tin đã xác minh"
        },
        "status": "ACTIVE",
        "sample": true,
        "updatedAt": "2026-11-10 06:00"
      },
      "reason": "Đã kiểm tra và xác nhận phương án",
      "handoverAt": "2026-11-10 06:00",
      "customerConsent": null,
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PLACE_CHANGED, PICKUP_CONSENT_REQUIRED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J31 — POST /manager/trips/{tripId}/pickup-relocation/decision

Manager xét đề xuất điểm nhận.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** APPROVE PROPOSED→MANAGER_APPROVED sau recheck; RETURN PROPOSED/MANAGER_APPROVED→REJECTED reason>=5. Không tự coi khách đồng ý hoặc đổi ORIGIN.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "relocationId": "MEETING_001",
  "decision": "APPROVE"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "INACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": {
      "relocationId": "MEETING_001",
      "status": "MANAGER_APPROVED",
      "placeSnapshot": {
        "id": "PLACE_001",
        "version": 1,
        "name": "Cơ sở nghỉ chăm sóc ngựa",
        "country": "VN",
        "province": "Thông tin đã xác minh",
        "address": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "functions": [
          "QUARANTINE",
          "REST"
        ],
        "hours": "24/7",
        "contact": "Thông tin đã xác minh",
        "phone": "+84901234567",
        "notes": "",
        "rest": {
          "truckParking": true,
          "onboardCare": true,
          "waterFeed": true,
          "loadingArea": true,
          "stabling": true,
          "capacity": 4
        },
        "fuel": null,
        "airport": null,
        "service": {
          "kind": "Thông tin đã xác minh",
          "capacity": "Thông tin đã xác minh"
        },
        "status": "ACTIVE",
        "sample": true,
        "updatedAt": "2026-11-10 06:00"
      },
      "reason": "Đã kiểm tra và xác nhận phương án",
      "handoverAt": "2026-11-10 06:00",
      "customerConsent": null,
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PLACE_CHANGED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J32 — POST /manager/trips/{tripId}/pickup-relocation/customer-consent

Ghi nhận khách đã đồng ý thực tế.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Chỉ MANAGER_APPROVED đúng relocation/version/vehicle/profile/place/handoverAt. Channel PHONE/EMAIL/WRITTEN, note>=10, acknowledged; chuyển CUSTOMER_CONFIRMED, ORIGIN draft mới dùng place; giữ pickup gốc, invalidate routing/confirm, notify Coordinator. Không chỉ gửi thông báo là consent.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "relocationId": "MEETING_001",
  "placeVersion": 1,
  "channel": "PHONE",
  "note": "Khách đồng ý tự đưa ngựa đến điểm tiếp nhận lúc đã hẹn",
  "acknowledged": true
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 2
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 2,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": "PLACE_001",
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Điểm tiếp nhận đã thống nhất",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "INACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": {
      "relocationId": "MEETING_001",
      "status": "CUSTOMER_CONFIRMED",
      "placeSnapshot": {
        "id": "PLACE_001",
        "version": 1,
        "name": "Cơ sở nghỉ chăm sóc ngựa",
        "country": "VN",
        "province": "Thông tin đã xác minh",
        "address": "Thông tin đã xác minh",
        "geo": {
          "lat": 10.7769,
          "lng": 106.7009
        },
        "functions": [
          "QUARANTINE",
          "REST"
        ],
        "hours": "24/7",
        "contact": "Thông tin đã xác minh",
        "phone": "+84901234567",
        "notes": "",
        "rest": {
          "truckParking": true,
          "onboardCare": true,
          "waterFeed": true,
          "loadingArea": true,
          "stabling": true,
          "capacity": 4
        },
        "fuel": null,
        "airport": null,
        "service": {
          "kind": "Thông tin đã xác minh",
          "capacity": "Thông tin đã xác minh"
        },
        "status": "ACTIVE",
        "sample": true,
        "updatedAt": "2026-11-10 06:00"
      },
      "reason": "Đã kiểm tra và xác nhận phương án",
      "handoverAt": "2026-11-10 06:00",
      "customerConsent": {
        "channel": "PHONE",
        "note": "Khách đồng ý tự đưa ngựa đến điểm tiếp nhận lúc đã hẹn",
        "recordedBy": {
          "userId": "USER_001",
          "name": "Thông tin đã xác minh"
        },
        "at": "2026-11-10 06:00"
      },
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, PLACE_CHANGED, PICKUP_CONSENT_REQUIRED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J33 — POST /coordinator/trips/{tripId}/pickup-relocation/revisions

Mở lại đề xuất điểm nhận đã chốt.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Chỉ draft chỉnh sửa; archive consent, clear access/relocation/routing/confirm hiện hành; giữ lịch sử, quay điểm gốc cho tới consent mới. Không overwrite thỏa thuận cũ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "ROAD",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 2
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.9,
        "lng": 106.8
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 2,
      "status": "DRAFT",
      "mode": "ROAD",
      "plannedDepart": "2026-11-10 06:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "stop-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 06:00",
          "departAt": "2026-11-10 06:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "stop-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "Thông tin đã xác minh",
          "geo": {
            "lat": 10.9,
            "lng": 106.8
          },
          "required": true,
          "arriveAt": "2026-11-10 06:30",
          "departAt": "2026-11-10 06:30",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "road",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": null,
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": null,
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J34 — GET /coordinator/air-partners

Danh sách bên dịch vụ bay.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Danh sách bên dịch vụ bay

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PARTNER_001",
      "version": 1,
      "name": "Equus Air Charter",
      "contact": "Thông tin đã xác minh",
      "email": "booking@equusair.example",
      "phone": "Thông tin đã xác minh",
      "services": "Thông tin đã xác minh",
      "status": "ACTIVE",
      "sample": true,
      "updatedAt": "2026-11-10 06:00"
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J35 — POST /coordinator/air-partners

Thêm bên dịch vụ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Thêm bên dịch vụ

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "name": "Equus Air Charter",
  "contact": "Thông tin đã xác minh",
  "email": "booking@equusair.example",
  "phone": "Thông tin đã xác minh",
  "services": "Thông tin đã xác minh"
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PARTNER_001",
    "version": 1,
    "name": "Equus Air Charter",
    "contact": "Thông tin đã xác minh",
    "email": "booking@equusair.example",
    "phone": "Thông tin đã xác minh",
    "services": "Thông tin đã xác minh",
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J36 — PUT /coordinator/air-partners/{partnerId}

Sửa thông tin bên dịch vụ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Chỉ thông tin partner, không sửa schedule; tăng record version, không rewrite snapshot plan/hợp đồng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `partnerId` | Có | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 1,
  "name": "Equus Air Charter",
  "contact": "Thông tin đã xác minh",
  "email": "booking@equusair.example",
  "phone": "Thông tin đã xác minh",
  "services": "Thông tin đã xác minh"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PARTNER_001",
    "version": 2,
    "name": "Equus Air Charter",
    "contact": "Thông tin đã xác minh",
    "email": "booking@equusair.example",
    "phone": "Thông tin đã xác minh",
    "services": "Thông tin đã xác minh",
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J37 — PUT /coordinator/air-partners/{partnerId}/status

Kích hoạt/ngừng bên dịch vụ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Notify/invalidate live operational evidence bị ảnh hưởng, giữ snapshot/history. Không tự hủy booking đối tác.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `partnerId` | Có | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 1,
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PARTNER_001",
    "version": 2,
    "name": "Equus Air Charter",
    "contact": "Thông tin đã xác minh",
    "email": "booking@equusair.example",
    "phone": "Thông tin đã xác minh",
    "services": "Thông tin đã xác minh",
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J38 — DELETE /coordinator/air-partners/{partnerId}

Xóa đối tác chưa từng tham chiếu.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** DELETE không body, version ở query + idempotency header. Nếu catalogue schedule/plan/contract/booking/history tham chiếu trả 409, chỉ đổi status.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `partnerId` | Có | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| query | `expectedVersion` | Có | `{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "example": 1}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PARTNER_001",
    "deleted": true
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, RECORD_REFERENCED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J39 — PUT /coordinator/trips/{tripId}/flight/selection

Chọn dịch vụ đúng partner/mã vào draft.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** AIR DRAFT, serviceId + partnerId + providerFlightCode + catalogVersion phải cùng bản. Server resolve snapshot/giá VND/lịch/khả dụng/sân bay/capacity/care; không nhận giá tên tự nhập. Thay nội dung tăng planVersion, clear dependent route/budget/confirm; không tạo booking.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "serviceId": "SERVICE_001",
  "catalogVersion": 1,
  "partnerId": "PARTNER_001",
  "providerFlightCode": "EQA-DEMO-01",
  "careAcknowledged": true
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "AIR",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 2
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "JP",
      "geo": {
        "lat": 35.8,
        "lng": 140.4
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 2,
      "status": "DRAFT",
      "mode": "AIR",
      "plannedDepart": "2026-11-10 11:00",
      "eta": null,
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "air-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-origin",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 11:00",
          "departAt": "2026-11-10 11:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "air-departure",
          "type": "AIRPORT",
          "placeId": "AIRPORT_001",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 210,
          "unload": false,
          "careNote": "",
          "name": "air-departure",
          "geo": {
            "lat": 10.8188,
            "lng": 106.6519
          },
          "required": true,
          "arriveAt": "2026-11-10 11:30",
          "departAt": "2026-11-10 15:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_003",
          "clientKey": "air-arrival",
          "type": "AIRPORT",
          "placeId": "AIRPORT_002",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 120,
          "unload": false,
          "careNote": "",
          "name": "air-arrival",
          "geo": {
            "lat": 35.772,
            "lng": 140.3929
          },
          "required": true,
          "arriveAt": "2026-11-10 20:30",
          "departAt": "2026-11-10 22:30",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_004",
          "clientKey": "air-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-destination",
          "geo": {
            "lat": 35.8,
            "lng": 140.4
          },
          "required": true,
          "arriveAt": "2026-11-10 23:00",
          "departAt": "2026-11-10 23:00",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "outbound",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        },
        {
          "leg": "inbound",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "MAIN_DRIVER": "USER_011",
            "CO_DRIVER": "USER_012",
            "VETERINARIAN": "USER_013"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_002",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": {
        "flightVersion": 1,
        "status": "DRAFT",
        "service": {
          "serviceId": "SERVICE_001",
          "catalogVersion": 1,
          "partnerId": "PARTNER_001",
          "partnerName": "Thông tin đã xác minh",
          "providerFlightCode": "EQA-DEMO-01",
          "flightNo": "EQA 7710",
          "fromAirportId": "AIRPORT_001",
          "toAirportId": "AIRPORT_002",
          "fromCountry": "VN",
          "toCountry": "JP",
          "departLocal": "2026-11-10 15:00",
          "departZone": "Asia/Ho_Chi_Minh",
          "arriveLocal": "2026-11-10 22:30",
          "arriveZone": "Asia/Tokyo",
          "departAt": "2026-11-10 15:00",
          "arriveAt": "2026-11-10 20:30",
          "capacity": 4,
          "costVnd": 105000000,
          "currency": "VND",
          "careIncluded": true,
          "direct": true,
          "status": "AVAILABLE",
          "sample": true,
          "eligible": true,
          "blockers": []
        },
        "careAcknowledged": true
      },
      "routing": null,
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, FLIGHT_PROVIDER_MISMATCH, FLIGHT_CATALOG_CHANGED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J40 — POST /coordinator/trips/{tripId}/flight/proposal/submit

Gửi riêng chi phí dịch vụ bay.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** AIR DRAFT proposal→BUDGET_PENDING, lưu snapshot bất biến; chưa thay tổng thể J08. Không hold slot hãng hoặc mở booking.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "flightVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "AIR",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "JP",
      "geo": {
        "lat": 35.8,
        "lng": 140.4
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "AIR",
      "plannedDepart": "2026-11-10 11:00",
      "eta": "2026-11-10 23:00",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "air-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-origin",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 11:00",
          "departAt": "2026-11-10 11:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "air-departure",
          "type": "AIRPORT",
          "placeId": "AIRPORT_001",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 210,
          "unload": false,
          "careNote": "",
          "name": "air-departure",
          "geo": {
            "lat": 10.8188,
            "lng": 106.6519
          },
          "required": true,
          "arriveAt": "2026-11-10 11:30",
          "departAt": "2026-11-10 15:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_003",
          "clientKey": "air-arrival",
          "type": "AIRPORT",
          "placeId": "AIRPORT_002",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 120,
          "unload": false,
          "careNote": "",
          "name": "air-arrival",
          "geo": {
            "lat": 35.772,
            "lng": 140.3929
          },
          "required": true,
          "arriveAt": "2026-11-10 20:30",
          "departAt": "2026-11-10 22:30",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_004",
          "clientKey": "air-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-destination",
          "geo": {
            "lat": 35.8,
            "lng": 140.4
          },
          "required": true,
          "arriveAt": "2026-11-10 23:00",
          "departAt": "2026-11-10 23:00",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "outbound",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        },
        {
          "leg": "inbound",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "MAIN_DRIVER": "USER_011",
            "CO_DRIVER": "USER_012",
            "VETERINARIAN": "USER_013"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_002",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": {
        "flightVersion": 1,
        "status": "BUDGET_PENDING",
        "service": {
          "serviceId": "SERVICE_001",
          "catalogVersion": 1,
          "partnerId": "PARTNER_001",
          "partnerName": "Thông tin đã xác minh",
          "providerFlightCode": "EQA-DEMO-01",
          "flightNo": "EQA 7710",
          "fromAirportId": "AIRPORT_001",
          "toAirportId": "AIRPORT_002",
          "fromCountry": "VN",
          "toCountry": "JP",
          "departLocal": "2026-11-10 15:00",
          "departZone": "Asia/Ho_Chi_Minh",
          "arriveLocal": "2026-11-10 22:30",
          "arriveZone": "Asia/Tokyo",
          "departAt": "2026-11-10 15:00",
          "arriveAt": "2026-11-10 20:30",
          "capacity": 4,
          "costVnd": 105000000,
          "currency": "VND",
          "careIncluded": true,
          "direct": true,
          "status": "AVAILABLE",
          "sample": true,
          "eligible": true,
          "blockers": []
        },
        "careAcknowledged": true
      },
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "air-origin",
            "toStopKey": "air-departure",
            "leg": "outbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.8188,
                106.6519
              ]
            ]
          },
          {
            "fromStopKey": "air-arrival",
            "toStopKey": "air-destination",
            "leg": "inbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                35.772,
                140.3929
              ],
              [
                35.8,
                140.4
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "air-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-origin",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 11:00",
            "departAt": "2026-11-10 11:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "air-departure",
            "type": "AIRPORT",
            "placeId": "AIRPORT_001",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 210,
            "unload": false,
            "careNote": "",
            "name": "air-departure",
            "geo": {
              "lat": 10.8188,
              "lng": 106.6519
            },
            "required": true,
            "arriveAt": "2026-11-10 11:30",
            "departAt": "2026-11-10 15:00",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_003",
            "clientKey": "air-arrival",
            "type": "AIRPORT",
            "placeId": "AIRPORT_002",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 120,
            "unload": false,
            "careNote": "",
            "name": "air-arrival",
            "geo": {
              "lat": 35.772,
              "lng": 140.3929
            },
            "required": true,
            "arriveAt": "2026-11-10 20:30",
            "departAt": "2026-11-10 22:30",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_004",
            "clientKey": "air-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-destination",
            "geo": {
              "lat": 35.8,
              "lng": 140.4
            },
            "required": true,
            "arriveAt": "2026-11-10 23:00",
            "departAt": "2026-11-10 23:00",
            "placeVersion": null
          }
        ],
        "totalKm": 40,
        "driveMin": 60,
        "stopMin": 330,
        "flyMin": 330,
        "eta": "2026-11-10 23:00",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, FLIGHT_CATALOG_CHANGED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J41 — POST /manager/trips/{tripId}/flight/decision

Manager xét ngân sách bay riêng.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** BUDGET_PENDING đúng flightVersion; APPROVE→BUDGET_APPROVED, RETURN→REJECTED reason>=5. Không thay J11 và không mở J13 khi plan chưa approved. J11 vẫn có thể quyết định tổng thể ngân sách cùng bundle.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "flightVersion": 1,
  "decision": "APPROVE"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "status": "PLANNING",
    "mode": "AIR",
    "binding": {
      "version": 11,
      "contextVersion": 1,
      "planVersion": 1
    },
    "deployment": "CONFIRMED",
    "specialistId": "USER_006",
    "coordinatorId": "USER_007",
    "horseIds": [
      "HORSE_001",
      "HORSE_002"
    ],
    "pickup": {
      "name": "Trại nhận ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "VN",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "access": null
    },
    "delivery": {
      "name": "Trại giao ngựa",
      "address": "Địa chỉ nhận ngựa theo hợp đồng",
      "country": "JP",
      "geo": {
        "lat": 35.8,
        "lng": 140.4
      },
      "access": null
    },
    "deliveryDeadline": "2026-11-12 18:00",
    "draft": {
      "planVersion": 1,
      "status": "DRAFT",
      "mode": "AIR",
      "plannedDepart": "2026-11-10 11:00",
      "eta": "2026-11-10 23:00",
      "stops": [
        {
          "stopId": "STOP_001",
          "clientKey": "air-origin",
          "type": "ORIGIN",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-origin",
          "geo": {
            "lat": 10.7769,
            "lng": 106.7009
          },
          "required": true,
          "arriveAt": "2026-11-10 11:00",
          "departAt": "2026-11-10 11:00",
          "placeVersion": null
        },
        {
          "stopId": "STOP_002",
          "clientKey": "air-departure",
          "type": "AIRPORT",
          "placeId": "AIRPORT_001",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 210,
          "unload": false,
          "careNote": "",
          "name": "air-departure",
          "geo": {
            "lat": 10.8188,
            "lng": 106.6519
          },
          "required": true,
          "arriveAt": "2026-11-10 11:30",
          "departAt": "2026-11-10 15:00",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_003",
          "clientKey": "air-arrival",
          "type": "AIRPORT",
          "placeId": "AIRPORT_002",
          "purposes": [
            "AIRPORT"
          ],
          "dwellMin": 120,
          "unload": false,
          "careNote": "",
          "name": "air-arrival",
          "geo": {
            "lat": 35.772,
            "lng": 140.3929
          },
          "required": true,
          "arriveAt": "2026-11-10 20:30",
          "departAt": "2026-11-10 22:30",
          "placeVersion": 1
        },
        {
          "stopId": "STOP_004",
          "clientKey": "air-destination",
          "type": "DESTINATION",
          "placeId": null,
          "purposes": [],
          "dwellMin": 0,
          "unload": false,
          "careNote": "",
          "name": "air-destination",
          "geo": {
            "lat": 35.8,
            "lng": 140.4
          },
          "required": true,
          "arriveAt": "2026-11-10 23:00",
          "departAt": "2026-11-10 23:00",
          "placeVersion": null
        }
      ],
      "resources": [
        {
          "leg": "outbound",
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_008",
            "CO_DRIVER": "USER_009",
            "VETERINARIAN": "USER_010"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_001",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        },
        {
          "leg": "inbound",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "MAIN_DRIVER": "USER_011",
            "CO_DRIVER": "USER_012",
            "VETERINARIAN": "USER_013"
          },
          "truckProfile": {
            "vehicleId": "VEHICLE_002",
            "heightM": 3.8,
            "widthM": 2.5,
            "lengthM": 10,
            "currentT": 12,
            "grossT": 18,
            "axleT": 4
          }
        }
      ],
      "flight": {
        "flightVersion": 1,
        "status": "BUDGET_APPROVED",
        "service": {
          "serviceId": "SERVICE_001",
          "catalogVersion": 1,
          "partnerId": "PARTNER_001",
          "partnerName": "Thông tin đã xác minh",
          "providerFlightCode": "EQA-DEMO-01",
          "flightNo": "EQA 7710",
          "fromAirportId": "AIRPORT_001",
          "toAirportId": "AIRPORT_002",
          "fromCountry": "VN",
          "toCountry": "JP",
          "departLocal": "2026-11-10 15:00",
          "departZone": "Asia/Ho_Chi_Minh",
          "arriveLocal": "2026-11-10 22:30",
          "arriveZone": "Asia/Tokyo",
          "departAt": "2026-11-10 15:00",
          "arriveAt": "2026-11-10 20:30",
          "capacity": 4,
          "costVnd": 105000000,
          "currency": "VND",
          "careIncluded": true,
          "direct": true,
          "status": "AVAILABLE",
          "sample": true,
          "eligible": true,
          "blockers": []
        },
        "careAcknowledged": true
      },
      "routing": {
        "routingId": "ROUTING_001",
        "planVersion": 1,
        "policyVersion": 1,
        "provider": "HERE_TRUCK",
        "truckVerified": true,
        "demo": false,
        "checkedAt": "2026-11-10 06:00",
        "segments": [
          {
            "fromStopKey": "air-origin",
            "toStopKey": "air-departure",
            "leg": "outbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                10.7769,
                106.7009
              ],
              [
                10.8188,
                106.6519
              ]
            ]
          },
          {
            "fromStopKey": "air-arrival",
            "toStopKey": "air-destination",
            "leg": "inbound",
            "km": 20,
            "driveMin": 30,
            "geometry": [
              [
                35.772,
                140.3929
              ],
              [
                35.8,
                140.4
              ]
            ]
          }
        ],
        "stops": [
          {
            "stopId": "STOP_001",
            "clientKey": "air-origin",
            "type": "ORIGIN",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-origin",
            "geo": {
              "lat": 10.7769,
              "lng": 106.7009
            },
            "required": true,
            "arriveAt": "2026-11-10 11:00",
            "departAt": "2026-11-10 11:00",
            "placeVersion": null
          },
          {
            "stopId": "STOP_002",
            "clientKey": "air-departure",
            "type": "AIRPORT",
            "placeId": "AIRPORT_001",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 210,
            "unload": false,
            "careNote": "",
            "name": "air-departure",
            "geo": {
              "lat": 10.8188,
              "lng": 106.6519
            },
            "required": true,
            "arriveAt": "2026-11-10 11:30",
            "departAt": "2026-11-10 15:00",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_003",
            "clientKey": "air-arrival",
            "type": "AIRPORT",
            "placeId": "AIRPORT_002",
            "purposes": [
              "AIRPORT"
            ],
            "dwellMin": 120,
            "unload": false,
            "careNote": "",
            "name": "air-arrival",
            "geo": {
              "lat": 35.772,
              "lng": 140.3929
            },
            "required": true,
            "arriveAt": "2026-11-10 20:30",
            "departAt": "2026-11-10 22:30",
            "placeVersion": 1
          },
          {
            "stopId": "STOP_004",
            "clientKey": "air-destination",
            "type": "DESTINATION",
            "placeId": null,
            "purposes": [],
            "dwellMin": 0,
            "unload": false,
            "careNote": "",
            "name": "air-destination",
            "geo": {
              "lat": 35.8,
              "lng": 140.4
            },
            "required": true,
            "arriveAt": "2026-11-10 23:00",
            "departAt": "2026-11-10 23:00",
            "placeVersion": null
          }
        ],
        "totalKm": 40,
        "driveMin": 60,
        "stopMin": 330,
        "flyMin": 330,
        "eta": "2026-11-10 23:00",
        "issues": []
      },
      "note": ""
    },
    "approvedPlan": null,
    "resourcesConfirmed": null,
    "opsReady": null,
    "docsReady": null,
    "documents": {
      "requirementSetApplied": true,
      "required": 5,
      "approved": 5,
      "insuranceStatus": "VERIFIED",
      "quarantineConfirmed": true,
      "validityMode": "ASSUMED_VALID_FOR_TRIP",
      "blockers": []
    },
    "pickupAccess": {
      "result": "ACCESSIBLE",
      "proof": "Đã khảo sát và đối chiếu kích thước xe",
      "valid": true,
      "by": {
        "userId": "USER_001",
        "name": "Thông tin đã xác minh"
      },
      "at": "2026-11-10 06:00"
    },
    "pickupRelocation": null,
    "booking": null,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DEPLOYMENT_REQUIRED, PLAN_LOCKED, DEPARTURE_APPROVAL_LOCKED, FLIGHT_CATALOG_CHANGED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J42 — POST /coordinator/trips/{tripId}/flight/evidence

Upload bằng chứng đối tác (tùy chọn booking).

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Multipart expectedVersion + file bytes thật; PDF/JPEG/PNG <=10485760. Check assignment/state, magic bytes/MIME/scan, private storage; không public URL/base64. Trả fileId; refetch context revision trước J13/J20. Upload đơn thuần không là BOOKED.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request multipart/form-data:** `expectedVersion` và `file` bytes thật PDF/JPEG/PNG <=10 MiB; trình duyệt tự sinh boundary. Không gửi JSON/base64/object URL.

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "fileId": "FILE_001",
    "fileName": "booking.pdf",
    "contentType": "application/pdf",
    "size": 2048,
    "uploadedAt": "2026-11-10 06:00",
    "uploadedBy": {
      "userId": "USER_001",
      "name": "Thông tin đã xác minh"
    }
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 413:** `FILE_TOO_LARGE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 415:** `UNSUPPORTED_MEDIA_TYPE`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J43 — GET /coordinator/places

Danh mục đa chức năng cho bản đồ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Danh mục đa chức năng cho bản đồ

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `country` | Không | `{"type": "string", "example": "VN", "pattern": "^[A-Z]{2}$"}` |
| query | `function` | Không | `{"type": "string", "example": "REST", "enum": ["REST", "FUEL", "QUARANTINE", "BORDER", "AIRPORT"]}` |
| query | `status` | Không | `{"type": "string", "example": "ACTIVE", "enum": ["ACTIVE", "SUSPENDED", "INACTIVE"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PLACE_001",
      "version": 1,
      "name": "Cơ sở nghỉ chăm sóc ngựa",
      "country": "VN",
      "province": "Thông tin đã xác minh",
      "address": "Thông tin đã xác minh",
      "geo": {
        "lat": 10.7769,
        "lng": 106.7009
      },
      "functions": [
        "REST"
      ],
      "hours": "24/7",
      "contact": "Thông tin đã xác minh",
      "phone": "+84901234567",
      "notes": "",
      "rest": {
        "truckParking": true,
        "onboardCare": true,
        "waterFeed": true,
        "loadingArea": true,
        "stabling": true,
        "capacity": 4
      },
      "fuel": null,
      "airport": null,
      "service": null,
      "status": "ACTIVE",
      "sample": true,
      "updatedAt": "2026-11-10 06:00"
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J44 — POST /coordinator/places

Thêm địa điểm dùng chung.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Check coordinates, functions and conditional extras: REST capacity>0, AIRPORT IATA/horseHandling; duplicate<50m chặn. Không tạo pickup/delivery cá nhân vào public catalogue. Server status ACTIVE/sample=false.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "name": "Cơ sở nghỉ chăm sóc ngựa",
  "country": "VN",
  "province": "Thông tin đã xác minh",
  "address": "Thông tin đã xác minh",
  "geo": {
    "lat": 10.7769,
    "lng": 106.7009
  },
  "functions": [
    "REST"
  ],
  "hours": "24/7",
  "contact": "Thông tin đã xác minh",
  "phone": "+84901234567",
  "notes": "",
  "rest": {
    "truckParking": true,
    "onboardCare": true,
    "waterFeed": true,
    "loadingArea": true,
    "stabling": true,
    "capacity": 4
  },
  "fuel": null,
  "airport": null,
  "service": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PLACE_001",
    "version": 1,
    "name": "Cơ sở nghỉ chăm sóc ngựa",
    "country": "VN",
    "province": "Thông tin đã xác minh",
    "address": "Thông tin đã xác minh",
    "geo": {
      "lat": 10.7769,
      "lng": 106.7009
    },
    "functions": [
      "REST"
    ],
    "hours": "24/7",
    "contact": "Thông tin đã xác minh",
    "phone": "+84901234567",
    "notes": "",
    "rest": {
      "truckParking": true,
      "onboardCare": true,
      "waterFeed": true,
      "loadingArea": true,
      "stabling": true,
      "capacity": 4
    },
    "fuel": null,
    "airport": null,
    "service": null,
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `DUPLICATE_PLACE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: DUPLICATE_PLACE",
  "errorCode": "DUPLICATE_PLACE",
  "data": null,
  "blockers": [
    {
      "code": "DUPLICATE_PLACE",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J45 — PUT /coordinator/places/{placeId}

Sửa địa điểm và giờ mở.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Validate hours qua đêm và extras đúng functions, version tăng; không rewrite approved snapshot. Live consent/evidence stale phải re-evaluate và báo Trip liên quan.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `placeId` | Có | `{"type": "string", "example": "PLACE_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 1,
  "name": "Cơ sở nghỉ chăm sóc ngựa",
  "country": "VN",
  "province": "Thông tin đã xác minh",
  "address": "Thông tin đã xác minh",
  "geo": {
    "lat": 10.7769,
    "lng": 106.7009
  },
  "functions": [
    "REST"
  ],
  "hours": "24/7",
  "contact": "Thông tin đã xác minh",
  "phone": "+84901234567",
  "notes": "",
  "rest": {
    "truckParking": true,
    "onboardCare": true,
    "waterFeed": true,
    "loadingArea": true,
    "stabling": true,
    "capacity": 4
  },
  "fuel": null,
  "airport": null,
  "service": null
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PLACE_001",
    "version": 2,
    "name": "Cơ sở nghỉ chăm sóc ngựa",
    "country": "VN",
    "province": "Thông tin đã xác minh",
    "address": "Thông tin đã xác minh",
    "geo": {
      "lat": 10.7769,
      "lng": 106.7009
    },
    "functions": [
      "REST"
    ],
    "hours": "24/7",
    "contact": "Thông tin đã xác minh",
    "phone": "+84901234567",
    "notes": "",
    "rest": {
      "truckParking": true,
      "onboardCare": true,
      "waterFeed": true,
      "loadingArea": true,
      "stabling": true,
      "capacity": 4
    },
    "fuel": null,
    "airport": null,
    "service": null,
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, DUPLICATE_PLACE`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J46 — PUT /coordinator/places/{placeId}/status

Đổi trạng thái cơ sở.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Tạm ngừng/đóng invalidate evidence bị ảnh hưởng; không xóa history hoặc tự đổi điểm trên plan đã duyệt.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `placeId` | Có | `{"type": "string", "example": "PLACE_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 1,
  "status": "ACTIVE",
  "reason": "Đã kiểm tra và xác nhận phương án"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PLACE_001",
    "version": 2,
    "name": "Cơ sở nghỉ chăm sóc ngựa",
    "country": "VN",
    "province": "Thông tin đã xác minh",
    "address": "Thông tin đã xác minh",
    "geo": {
      "lat": 10.7769,
      "lng": 106.7009
    },
    "functions": [
      "REST"
    ],
    "hours": "24/7",
    "contact": "Thông tin đã xác minh",
    "phone": "+84901234567",
    "notes": "",
    "rest": {
      "truckParking": true,
      "onboardCare": true,
      "waterFeed": true,
      "loadingArea": true,
      "stabling": true,
      "capacity": 4
    },
    "fuel": null,
    "airport": null,
    "service": null,
    "status": "ACTIVE",
    "sample": false,
    "updatedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J47 — DELETE /coordinator/places/{placeId}

Xóa địa điểm chưa được tham chiếu.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Không body. Check mọi plan/consent/checkpoint/catalog/history reference trong transaction; có tham chiếu chỉ đổi trạng thái.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `placeId` | Có | `{"type": "string", "example": "PLACE_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| query | `expectedVersion` | Có | `{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "example": 1}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "PLACE_001",
    "deleted": true
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, RECORD_REFERENCED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J48 — GET /coordinator/staff

Danh mục nhân sự và trạng thái vận hành.

**Role:** `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** tripId/leg phải đi cặp khi tính eligible theo chặng; check assigned scope. Không expose payroll/password/PII ngoài quyền. Không tạo/xóa nhân viên trong Flow 3.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `tripId` | Không | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| query | `leg` | Không | `{"type": "string", "example": "road", "enum": ["road", "outbound", "inbound"]}` |
| query | `status` | Không | `{"type": "string", "example": "ACTIVE", "enum": ["ACTIVE", "ON_LEAVE", "INACTIVE"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "USER_008",
      "version": 1,
      "name": "Thông tin đã xác minh",
      "phone": "Thông tin đã xác minh",
      "country": "VN",
      "position": "DRIVER",
      "status": "ACTIVE",
      "licence": "FC",
      "certExpiry": null,
      "assignedTrips": [],
      "eligible": true,
      "blockers": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J49 — PUT /coordinator/staff/{staffId}/status

Đổi ACTIVE/ON_LEAVE/INACTIVE.

**Role:** `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** IN_TRANSIT không cho nghỉ/ngừng nếu chưa thay qua incident workflow. PLANNING liên quan clear confirmation/opsReady và notify Manager. READY_TO_DEPART liên quan phải chặn actual departure, không để dấu cũ hợp thức.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `staffId` | Có | `{"type": "string", "example": "USER_008", "pattern": "^USER_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | Có | `{"type": "string", "example": "b141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 1,
  "status": "ACTIVE"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "USER_008",
    "version": 2,
    "name": "Thông tin đã xác minh",
    "phone": "Thông tin đã xác minh",
    "country": "VN",
    "position": "DRIVER",
    "status": "ACTIVE",
    "licence": "FC",
    "certExpiry": null,
    "assignedTrips": [],
    "eligible": true,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION, STAFF_IN_TRANSIT`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J50 — GET /manager/flights

Manager đọc catalogue bay.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Read-only; tripId phải manager scope. Không chỉnh lịch/giá đối tác.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `tripId` | Không | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| query | `partnerId` | Không | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "serviceId": "SERVICE_001",
      "catalogVersion": 1,
      "partnerId": "PARTNER_001",
      "partnerName": "Thông tin đã xác minh",
      "providerFlightCode": "EQA-DEMO-01",
      "flightNo": "EQA 7710",
      "fromAirportId": "AIRPORT_001",
      "toAirportId": "AIRPORT_002",
      "fromCountry": "VN",
      "toCountry": "JP",
      "departLocal": "2026-11-10 15:00",
      "departZone": "Asia/Ho_Chi_Minh",
      "arriveLocal": "2026-11-10 22:30",
      "arriveZone": "Asia/Tokyo",
      "departAt": "2026-11-10 15:00",
      "arriveAt": "2026-11-10 20:30",
      "capacity": 4,
      "costVnd": 105000000,
      "currency": "VND",
      "careIncluded": true,
      "direct": true,
      "status": "AVAILABLE",
      "sample": true,
      "eligible": true,
      "blockers": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J51 — GET /manager/air-partners

Manager đọc bên dịch vụ.

**Role:** `LOGISTICS_MANAGER`.

**Điều kiện và ảnh hưởng:** Manager đọc bên dịch vụ

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "PARTNER_001",
      "version": 1,
      "name": "Equus Air Charter",
      "contact": "Thông tin đã xác minh",
      "email": "booking@equusair.example",
      "phone": "Thông tin đã xác minh",
      "services": "Thông tin đã xác minh",
      "status": "ACTIVE",
      "sample": true,
      "updatedAt": "2026-11-10 06:00"
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J52 — GET /trips/{tripId}/planning-files/{fileId}

Tải bằng chứng planning có xác thực.

**Role:** `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`.

**Điều kiện và ảnh hưởng:** File phải thuộc Trip và actor assigned/scope; trả MIME+Content-Disposition an toàn, lỗi JSON. Không dùng fileId để đọc path tùy ý; file booking chỉ role có quyền nghiệp vụ được cấp.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | Có | `{"type": "string", "example": "FILE_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200:** binary MIME từ metadata; Content-Disposition an toàn. Không envelope khi thành công.

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J53 — GET /coordinator/trips/{tripId}/route-reports

Đọc báo cáo tài xế gắn mốc trên bản đồ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Projection Flow 5 có stopId/geo nullable; thiếu vị trí không bịa GPS. Không ghi traffic/sửa đường tự động từ HERE. Không có báo cáo trả []; chưa có sự cố không chứng minh đường không tắc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "incidentId": "INCIDENT_001",
      "type": "ROAD_CLOSURE",
      "stopId": null,
      "location": "Thông tin đã xác minh",
      "geo": null,
      "at": "2026-11-10 06:00",
      "description": "Đã kiểm tra và xác nhận phương án",
      "blocking": true,
      "locationSource": "MILESTONE_REPORT",
      "isGps": false
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J54 — GET /coordinator/flights/lookup

Tra mã chuyến trong đúng bên dịch vụ.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Lookup trim/case-fold; không map mã bên khác. Không thấy toàn catalogue trả 404; mã thuộc partner khác 409 mismatch chỉ trong catalogue actor có quyền. Nhiều lịch cùng partner/code 409 ambiguous (dùng J05 lấy candidates để chọn serviceId). Lookup không chọn/giữ/booking.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `tripId` | Có | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| query | `partnerId` | Có | `{"type": "string", "example": "PARTNER_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| query | `providerFlightCode` | Có | `{"type": "string", "example": "EQA-DEMO-01", "minLength": 1, "maxLength": 100}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "serviceId": "SERVICE_001",
    "catalogVersion": 1,
    "partnerId": "PARTNER_001",
    "partnerName": "Thông tin đã xác minh",
    "providerFlightCode": "EQA-DEMO-01",
    "flightNo": "EQA 7710",
    "fromAirportId": "AIRPORT_001",
    "toAirportId": "AIRPORT_002",
    "fromCountry": "VN",
    "toCountry": "JP",
    "departLocal": "2026-11-10 15:00",
    "departZone": "Asia/Ho_Chi_Minh",
    "arriveLocal": "2026-11-10 22:30",
    "arriveZone": "Asia/Tokyo",
    "departAt": "2026-11-10 15:00",
    "arriveAt": "2026-11-10 20:30",
    "capacity": 4,
    "costVnd": 105000000,
    "currency": "VND",
    "careIncluded": true,
    "direct": true,
    "status": "AVAILABLE",
    "sample": true,
    "eligible": true,
    "blockers": []
  }
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `FLIGHT_PROVIDER_MISMATCH, FLIGHT_CODE_AMBIGUOUS`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: FLIGHT_PROVIDER_MISMATCH",
  "errorCode": "FLIGHT_PROVIDER_MISMATCH",
  "data": null,
  "blockers": [
    {
      "code": "FLIGHT_PROVIDER_MISMATCH",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```

## F3-J55 — GET /coordinator/vehicles

Danh mục xe và thông số đã xác minh.

**Role:** `FLEET_ROUTE_COORDINATOR`.

**Điều kiện và ảnh hưởng:** Giữ URL F2-J36, mở rộng projection spec/assignment. eligible ở đây chỉ khả dụng chung; chọn theo Trip phải dùng J27. Không CRUD xe bằng Flow 3.

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "VEHICLE_001",
      "plate": "51C-12345",
      "stalls": 4,
      "country": "VN",
      "status": "READY",
      "spec": {
        "heightM": 3.8,
        "widthM": 2.5,
        "lengthM": 10,
        "grossT": 18
      },
      "eligible": true,
      "blockers": [],
      "assignedTrips": []
    }
  ]
}
```

**Response 400:** `VALIDATION_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 401:** `UNAUTHENTICATED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 403:** `FORBIDDEN`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 404:** `NOT_FOUND`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 409:** `STALE_VERSION`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 429:** `RATE_LIMITED`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 500:** `INTERNAL_ERROR`; schema `Error`, JSON mẫu trong OpenAPI.

**Response 501:** `FEATURE_NOT_SUPPORTED`; schema `Error`, JSON mẫu trong OpenAPI.

**Mẫu lỗi nghiệp vụ (409)**

```json
{
  "success": false,
  "message": "Yêu cầu chưa đủ điều kiện: STALE_VERSION",
  "errorCode": "STALE_VERSION",
  "data": null,
  "blockers": [
    {
      "code": "STALE_VERSION",
      "field": "planning",
      "message": "Tải lại dữ liệu và xử lý điều kiện trước khi gửi lại"
    }
  ]
}
```
