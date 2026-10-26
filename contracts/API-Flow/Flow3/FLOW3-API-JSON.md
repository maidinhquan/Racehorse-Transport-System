# Flow 3 — JSON đầy đủ từng API

## Cập nhật helo.html — 26/10/2026

Specialist gửi danh sách hồ sơ có thời hạn trước; Coordinator chốt lịch khởi hành
trên đúng version đó, sau đó Specialist mới chuẩn bị/cấp giấy tờ chính thức.
Không thay đổi dữ liệu đã cấp khi xem trước. API bổ sung và guard nằm tại
[Operations/OPERATIONS.md](../Operations/OPERATIONS.md) và
[operations.openapi.json](../Operations/operations.openapi.json).
Các mô tả cũ cho phép làm hồ sơ trước khi chốt lịch được thay bằng quy tắc này.
Frontend/API contract đã cập nhật; backend chưa được triển khai trong thay đổi này.


Ngày 24/10/2026. Thiết kế mục tiêu theo flow mới trong ảnh người dùng. Chưa triển khai backend/frontend/DB. [Flow và quy tắc](FLOW3.md) · [OpenAPI 3.1](flow3.openapi.json) · [Kịch bản](flow3.examples.json).

Mẫu từng API độc lập, không phải một chuỗi request liên tiếp. Revision/ID phải lấy từ response thật. Context ROAD không dùng để book AIR. Base `/api`, Bearer JWT; actor/time/status do server cấp. Tất cả POST/PUT đổi trạng thái gửi Idempotency-Key UUID; POST validate chỉ đọc không cần key. GET không body. Danh sách data array. Mutation chưa hỗ trợ trả 501, không trả mẫu thành dữ liệu đã lưu.

## Danh mục

| Mã | Method | Endpoint | Chức năng |
|---|---|---|---|
| F3-J01 | GET | /master/flow3-capabilities | Khả năng flow mới và cấu hình vận hành |
| F3-J02 | GET | /specialist/trips/{tripId}/planning-context | Thông tin Manager giao và đánh giá Specialist |
| F3-J03 | PUT | /specialist/trips/{tripId}/planning-feasibility | Ghi đánh giá khả thi trước lập phương án |
| F3-J04 | GET | /coordinator/trips/{tripId}/planning-context | Khoảng khả thi và bộ phương án hiện hành |
| F3-J05 | GET | /coordinator/flights | Danh mục chuyến bay demo phù hợp chuyến |
| F3-J06 | PUT | /coordinator/trips/{tripId}/plan-draft | Lưu bộ phương án nháp |
| F3-J07 | POST | /coordinator/trips/{tripId}/plan/validate | Kiểm tra nháp, không giữ lịch |
| F3-J08 | POST | /coordinator/trips/{tripId}/plan/submit | Gửi duyệt và giữ tạm nguồn lực |
| F3-J09 | POST | /coordinator/trips/{tripId}/plan/withdraw | Rút phương án chưa duyệt |
| F3-J10 | GET | /manager/trips/{tripId}/preparation | Manager xem feasibility, dependency và phương án |
| F3-J11 | POST | /manager/trips/{tripId}/plan/decision | Duyệt toàn bộ phương án hoặc trả lại |
| F3-J12 | POST | /coordinator/trips/{tripId}/plan/changes | Tạo đề xuất thay phương án đã duyệt |
| F3-J13 | POST | /coordinator/trips/{tripId}/flight/booking | Xác nhận booking sau duyệt phương án |
| F3-J14 | POST | /coordinator/trips/{tripId}/resources/confirm | Xác nhận khả dụng thực tế xe và nhân sự |
| F3-J15 | POST | /coordinator/trips/{tripId}/ops-ready | Coordinator xác nhận Ops READY |
| F3-J16 | POST | /specialist/trips/{tripId}/docs-ready | Specialist xác nhận Docs READY theo lịch được duyệt |
| F3-J17 | GET | /manager/trips/{tripId}/readiness | Đọc điều kiện khởi hành hiện hành |
| F3-J18 | POST | /manager/trips/{tripId}/departure/approve | Manager cho phép khởi hành sau hai READY |
| F3-J19 | GET | /trips/{tripId}/planning-history | Lịch sử đánh giá, phương án, booking và READY |
| F3-J20 | POST | /coordinator/trips/{tripId}/flight/booking/cancel | Ghi nhận hủy booking để xử lý phương án thay thế |

## Lỗi chung

400 validation/header; 401 chưa đăng nhập; 403 sai role; 404 không tìm thấy trong phạm vi được giao; 409 stale hoặc điều kiện nghiệp vụ; 429 giới hạn; 500 lỗi hệ thống; 501 capability/persistence chưa hỗ trợ. Mỗi operation có schema/mẫu cho toàn bộ mã lỗi trong OpenAPI. Lỗi nghiệp vụ 409 dùng đúng errorCode và blockers theo FLOW3.md.

```json
{
  "success": false,
  "message": "Giấy không còn hiệu lực khi tới điểm sử dụng",
  "errorCode": "DOCUMENT_WINDOW_VIOLATION",
  "data": null,
  "blockers": [
    {
      "code": "DOCUMENT_WINDOW_VIOLATION",
      "field": "stops[1].plannedAt",
      "message": "Thời điểm dùng giấy sau validUntil",
      "constraintKey": "HEALTH:HORSE_001",
      "useTime": "2026-10-31 10:00"
    }
  ]
}
```


## F3-J01 — GET /master/flow3-capabilities

Khả năng flow mới và cấu hình vận hành. Role: `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`.


**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "features": {
      "feasibility": false,
      "planVersioning": false,
      "reservations": false,
      "flightCatalog": false,
      "demoBooking": false,
      "readyBindings": false,
      "departureApproval": false,
      "idempotency": false
    },
    "airHandoverBeforeMinutes": null,
    "airHandoverAfterMinutes": null,
    "continuousDriveLimitMinutes": null,
    "minimumRestMinutes": null,
    "reason": "Chưa nghiệm thu backend/persistence và cấu hình vận hành"
  }
}
```

**Điều kiện/ảnh hưởng:** Không hỗ trợ phải false; thiếu buffer hoặc giới hạn nghỉ thì chặn submit, không điền số mặc định.

**Schema:** `#/components/schemas/F3-J01Response` trong OpenAPI.


## F3-J02 — GET /specialist/trips/{tripId}/planning-context

Thông tin Manager giao và đánh giá Specialist. Role: `TRANSPORT_SPECIALIST`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "tripStatus": "PLANNING",
    "requestStatus": "ACTIVATED",
    "contractStatus": "EFFECTIVE",
    "contextVersion": 1,
    "contractId": "CONTRACT_001",
    "contractVersion": 1,
    "deliveryDeadline": "2026-11-02 18:00",
    "originCountry": "VN",
    "destinationCountry": "VN",
    "mode": "ROAD",
    "horseIds": [
      "HORSE_001"
    ],
    "deploymentStatus": "CONFIRMED",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "documentSetVersion": 3,
    "evidenceVersion": 8,
    "feasibility": {
      "version": 1,
      "contextVersion": 1,
      "documentSetVersion": 3,
      "earliestReadyAt": "2026-10-25 08:00",
      "constraints": [
        {
          "key": "HEALTH:HORSE_001",
          "typeId": "HEALTH_CERTIFICATE",
          "horseId": "HORSE_001",
          "validFrom": "2026-10-25 08:00",
          "validUntil": "2026-10-30 18:00",
          "useAt": "CHECKPOINT",
          "checkpointId": 102,
          "mustCoverWholeTrip": false,
          "basis": "ESTIMATED_ISSUANCE",
          "note": "Ví dụ dự kiến, Specialist phải kiểm tra giấy thật sau duyệt."
        }
      ],
      "dependencies": [
        {
          "key": "EXPORT_SCHEDULE",
          "description": "Hoàn thiện giấy theo lịch chính thức",
          "needs": "OFFICIAL_SCHEDULE",
          "owner": "TRANSPORT_SPECIALIST",
          "expectedLeadMinutes": 120,
          "completionRule": "Lịch đã duyệt phải còn đủ thời gian hoàn thiện trước điểm dùng",
          "resolved": false
        }
      ],
      "planningAllowed": true,
      "blockers": [],
      "assessed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      }
    },
    "draft": null,
    "approvedPlan": {
      "version": 4,
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "status": "APPROVED",
      "replacesPlanVersion": null,
      "mode": "ROAD",
      "plannedDepart": "2026-10-26 08:00",
      "eta": "2026-10-26 16:00",
      "stops": [
        {
          "checkpointId": null,
          "name": "Điểm nhận theo hợp đồng",
          "type": "ORIGIN",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 08:00"
        },
        {
          "checkpointId": 102,
          "name": "Điểm kiểm tra demo",
          "type": "QUARANTINE_STATION",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 10:00"
        },
        {
          "checkpointId": null,
          "name": "Điểm giao theo hợp đồng",
          "type": "DESTINATION",
          "country": "VN",
          "lat": 11.0,
          "lng": 107.0,
          "plannedAt": "2026-10-26 16:00"
        }
      ],
      "legs": [
        {
          "key": "road",
          "country": "VN",
          "startStopIndex": 0,
          "endStopIndex": 2,
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_010",
            "CO_DRIVER": "USER_011",
            "VETERINARIAN": "USER_012"
          }
        }
      ],
      "flight": null,
      "reservationState": "CONFIRMED",
      "decisionNote": "Chấp thuận phương án trong khoảng khả thi",
      "submitted": {
        "by": "USER_006",
        "at": "2026-10-24 11:00"
      },
      "decided": {
        "by": "USER_004",
        "at": "2026-10-24 11:30"
      }
    },
    "booking": null,
    "resourcesConfirmed": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "docsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "opsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "blockers": []
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ Specialist được giao; snapshot deadline/horse/mode từ Flow 1. Không sửa hạn giao ở đây.

**Schema:** `#/components/schemas/F3-J02Response` trong OpenAPI.


## F3-J03 — PUT /specialist/trips/{tripId}/planning-feasibility

Ghi đánh giá khả thi trước lập phương án. Role: `TRANSPORT_SPECIALIST`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "documentSetVersion": 3,
  "earliestReadyAt": "2026-10-25 08:00",
  "constraints": [
    {
      "key": "HEALTH:HORSE_001",
      "typeId": "HEALTH_CERTIFICATE",
      "horseId": "HORSE_001",
      "validFrom": "2026-10-25 08:00",
      "validUntil": "2026-10-30 18:00",
      "useAt": "CHECKPOINT",
      "checkpointId": 102,
      "mustCoverWholeTrip": false,
      "basis": "ESTIMATED_ISSUANCE",
      "note": "Ví dụ dự kiến, Specialist phải kiểm tra giấy thật sau duyệt."
    }
  ],
  "expectedVersion": null,
  "dependencies": [
    {
      "key": "EXPORT_SCHEDULE",
      "description": "Hoàn thiện giấy theo lịch chính thức",
      "needs": "OFFICIAL_SCHEDULE",
      "owner": "TRANSPORT_SPECIALIST",
      "expectedLeadMinutes": 120,
      "completionRule": "Lịch đã duyệt phải còn đủ thời gian hoàn thiện trước điểm dùng"
    }
  ]
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "contextVersion": 1,
    "documentSetVersion": 3,
    "earliestReadyAt": "2026-10-25 08:00",
    "constraints": [
      {
        "key": "HEALTH:HORSE_001",
        "typeId": "HEALTH_CERTIFICATE",
        "horseId": "HORSE_001",
        "validFrom": "2026-10-25 08:00",
        "validUntil": "2026-10-30 18:00",
        "useAt": "CHECKPOINT",
        "checkpointId": 102,
        "mustCoverWholeTrip": false,
        "basis": "ESTIMATED_ISSUANCE",
        "note": "Ví dụ dự kiến, Specialist phải kiểm tra giấy thật sau duyệt."
      }
    ],
    "dependencies": [
      {
        "key": "EXPORT_SCHEDULE",
        "description": "Hoàn thiện giấy theo lịch chính thức",
        "needs": "OFFICIAL_SCHEDULE",
        "owner": "TRANSPORT_SPECIALIST",
        "expectedLeadMinutes": 120,
        "completionRule": "Lịch đã duyệt phải còn đủ thời gian hoàn thiện trước điểm dùng",
        "resolved": false
      }
    ],
    "planningAllowed": true,
    "blockers": [],
    "assessed": {
      "by": "USER_005",
      "at": "2026-10-24 10:00"
    }
  }
}
```

**Điều kiện/ảnh hưởng:** expectedVersion=null chỉ lần đầu. BE đối chiếu requirement snapshot và tính planningAllowed, blockers, dependency.resolved. Không cho bỏ yêu cầu bắt buộc. Thay version làm bindings READY cũ stale; approved giữ lịch sử, cần kế hoạch cập nhật được duyệt. Mutation chỉ khi PLANNING.

**Schema:** `#/components/schemas/F3-J03Response`, `#/components/schemas/F3-J03Request` trong OpenAPI.


## F3-J04 — GET /coordinator/trips/{tripId}/planning-context

Khoảng khả thi và bộ phương án hiện hành. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "tripStatus": "PLANNING",
    "requestStatus": "ACTIVATED",
    "contractStatus": "EFFECTIVE",
    "contextVersion": 1,
    "contractId": "CONTRACT_001",
    "contractVersion": 1,
    "deliveryDeadline": "2026-11-02 18:00",
    "originCountry": "VN",
    "destinationCountry": "VN",
    "mode": "ROAD",
    "horseIds": [
      "HORSE_001"
    ],
    "deploymentStatus": "CONFIRMED",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "documentSetVersion": 3,
    "evidenceVersion": 8,
    "feasibility": {
      "version": 1,
      "contextVersion": 1,
      "documentSetVersion": 3,
      "earliestReadyAt": "2026-10-25 08:00",
      "constraints": [
        {
          "key": "HEALTH:HORSE_001",
          "typeId": "HEALTH_CERTIFICATE",
          "horseId": "HORSE_001",
          "validFrom": "2026-10-25 08:00",
          "validUntil": "2026-10-30 18:00",
          "useAt": "CHECKPOINT",
          "checkpointId": 102,
          "mustCoverWholeTrip": false,
          "basis": "ESTIMATED_ISSUANCE",
          "note": "Ví dụ dự kiến, Specialist phải kiểm tra giấy thật sau duyệt."
        }
      ],
      "dependencies": [
        {
          "key": "EXPORT_SCHEDULE",
          "description": "Hoàn thiện giấy theo lịch chính thức",
          "needs": "OFFICIAL_SCHEDULE",
          "owner": "TRANSPORT_SPECIALIST",
          "expectedLeadMinutes": 120,
          "completionRule": "Lịch đã duyệt phải còn đủ thời gian hoàn thiện trước điểm dùng",
          "resolved": false
        }
      ],
      "planningAllowed": true,
      "blockers": [],
      "assessed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      }
    },
    "draft": null,
    "approvedPlan": {
      "version": 4,
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "status": "APPROVED",
      "replacesPlanVersion": null,
      "mode": "ROAD",
      "plannedDepart": "2026-10-26 08:00",
      "eta": "2026-10-26 16:00",
      "stops": [
        {
          "checkpointId": null,
          "name": "Điểm nhận theo hợp đồng",
          "type": "ORIGIN",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 08:00"
        },
        {
          "checkpointId": 102,
          "name": "Điểm kiểm tra demo",
          "type": "QUARANTINE_STATION",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 10:00"
        },
        {
          "checkpointId": null,
          "name": "Điểm giao theo hợp đồng",
          "type": "DESTINATION",
          "country": "VN",
          "lat": 11.0,
          "lng": 107.0,
          "plannedAt": "2026-10-26 16:00"
        }
      ],
      "legs": [
        {
          "key": "road",
          "country": "VN",
          "startStopIndex": 0,
          "endStopIndex": 2,
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_010",
            "CO_DRIVER": "USER_011",
            "VETERINARIAN": "USER_012"
          }
        }
      ],
      "flight": null,
      "reservationState": "CONFIRMED",
      "decisionNote": "Chấp thuận phương án trong khoảng khả thi",
      "submitted": {
        "by": "USER_006",
        "at": "2026-10-24 11:00"
      },
      "decided": {
        "by": "USER_004",
        "at": "2026-10-24 11:30"
      }
    },
    "booking": null,
    "resourcesConfirmed": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "docsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "opsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "blockers": []
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ Coordinator được giao; không tự coi feasibility là Docs READY. draft và approvedPlan độc lập.

**Schema:** `#/components/schemas/F3-J04Response` trong OpenAPI.


## F3-J05 — GET /coordinator/flights

Danh mục chuyến bay demo phù hợp chuyến. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | query | Có |
| feasibilityVersion | query | Có |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "catalogRef": "DEMO-DIRECT-01",
      "catalogVersion": 1,
      "provider": "Đối tác demo",
      "airline": "Demo Air",
      "flightNo": "DEMO101",
      "fromCheckpointId": 201,
      "toCheckpointId": 202,
      "originCountry": "VN",
      "destinationCountry": "JP",
      "departAt": "2026-10-27 08:00",
      "arriveAt": "2026-10-27 14:00",
      "stalls": 6,
      "cost": 180000000,
      "currency": "VND",
      "direct": true,
      "fullCare": true
    }
  ]
}
```

**Điều kiện/ảnh hưởng:** Tuyến/phương thức/horse từ Trip được giao; ROAD trả []; AIR lọc theo lịch, sức chứa và feasibility. Chưa có catalog thật trả 501; [] không được fallback mock. Chọn không giữ chỗ/không là booking.

**Schema:** `#/components/schemas/F3-J05Response` trong OpenAPI.


## F3-J06 — PUT /coordinator/trips/{tripId}/plan-draft

Lưu bộ phương án nháp. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "expectedVersion": null,
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "plannedDepart": "2026-10-26 08:00",
  "eta": "2026-10-26 16:00",
  "stops": [
    {
      "checkpointId": null,
      "name": "Điểm nhận theo hợp đồng",
      "type": "ORIGIN",
      "country": "VN",
      "lat": 10.8,
      "lng": 106.7,
      "plannedAt": "2026-10-26 08:00"
    },
    {
      "checkpointId": 102,
      "name": "Điểm kiểm tra demo",
      "type": "QUARANTINE_STATION",
      "country": "VN",
      "lat": 10.8,
      "lng": 106.7,
      "plannedAt": "2026-10-26 10:00"
    },
    {
      "checkpointId": null,
      "name": "Điểm giao theo hợp đồng",
      "type": "DESTINATION",
      "country": "VN",
      "lat": 11.0,
      "lng": 107.0,
      "plannedAt": "2026-10-26 16:00"
    }
  ],
  "legs": [
    {
      "key": "road",
      "country": "VN",
      "startStopIndex": 0,
      "endStopIndex": 2,
      "vehicleId": "VEHICLE_001",
      "crew": {
        "MAIN_DRIVER": "USER_010",
        "CO_DRIVER": "USER_011",
        "VETERINARIAN": "USER_012"
      }
    }
  ],
  "flight": null
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 1,
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "status": "DRAFT",
    "replacesPlanVersion": null,
    "mode": "ROAD",
    "plannedDepart": "2026-10-26 08:00",
    "eta": "2026-10-26 16:00",
    "stops": [
      {
        "checkpointId": null,
        "name": "Điểm nhận theo hợp đồng",
        "type": "ORIGIN",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 08:00"
      },
      {
        "checkpointId": 102,
        "name": "Điểm kiểm tra demo",
        "type": "QUARANTINE_STATION",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 10:00"
      },
      {
        "checkpointId": null,
        "name": "Điểm giao theo hợp đồng",
        "type": "DESTINATION",
        "country": "VN",
        "lat": 11.0,
        "lng": 107.0,
        "plannedAt": "2026-10-26 16:00"
      }
    ],
    "legs": [
      {
        "key": "road",
        "country": "VN",
        "startStopIndex": 0,
        "endStopIndex": 2,
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_010",
          "CO_DRIVER": "USER_011",
          "VETERINARIAN": "USER_012"
        }
      }
    ],
    "flight": null,
    "reservationState": "NONE",
    "decisionNote": null,
    "submitted": null,
    "decided": null
  }
}
```

**Điều kiện/ảnh hưởng:** Không nhận actor/status/giá bay. planningAllowed phải true và context/feasibility đúng. Backend cấp version tăng đơn điệu; cho phép stops/legs thiếu và crew/vehicle null ở nháp nhưng báo qua validate. Chỉ sửa DRAFT/RETURNED; không chiếm nguồn lực. Không có draft gửi expectedVersion=null. Bản thay thế tạo qua J12 trước; flight snapshot lấy catalog, ROAD flight=null.

**Schema:** `#/components/schemas/F3-J06Response`, `#/components/schemas/F3-J06Request` trong OpenAPI.


## F3-J07 — POST /coordinator/trips/{tripId}/plan/validate

Kiểm tra nháp, không giữ lịch. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 1,
    "canSubmit": true,
    "canApprovePlan": false,
    "checks": [],
    "dependenciesRemaining": [
      "EXPORT_SCHEDULE"
    ],
    "reservesResources": false
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ đọc, không cần Idempotency-Key. Không đạt nghiệp vụ trả 200 canSubmit=false và checks; stale trả 409. Validate không bảo đảm slot còn rảnh khi submit. Phải kiểm tra đủ ràng buộc ngày dùng và deadline, nguồn lực và lead time hoàn thiện dependency.

**Schema:** `#/components/schemas/F3-J07Response`, `#/components/schemas/F3-J07Request` trong OpenAPI.


## F3-J08 — POST /coordinator/trips/{tripId}/plan/submit

Gửi duyệt và giữ tạm nguồn lực. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "planVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 2,
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "status": "PENDING_APPROVAL",
    "replacesPlanVersion": null,
    "mode": "ROAD",
    "plannedDepart": "2026-10-26 08:00",
    "eta": "2026-10-26 16:00",
    "stops": [
      {
        "checkpointId": null,
        "name": "Điểm nhận theo hợp đồng",
        "type": "ORIGIN",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 08:00"
      },
      {
        "checkpointId": 102,
        "name": "Điểm kiểm tra demo",
        "type": "QUARANTINE_STATION",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 10:00"
      },
      {
        "checkpointId": null,
        "name": "Điểm giao theo hợp đồng",
        "type": "DESTINATION",
        "country": "VN",
        "lat": 11.0,
        "lng": 107.0,
        "plannedAt": "2026-10-26 16:00"
      }
    ],
    "legs": [
      {
        "key": "road",
        "country": "VN",
        "startStopIndex": 0,
        "endStopIndex": 2,
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_010",
          "CO_DRIVER": "USER_011",
          "VETERINARIAN": "USER_012"
        }
      }
    ],
    "flight": null,
    "reservationState": "TEMPORARY",
    "decisionNote": null,
    "submitted": {
      "by": "USER_006",
      "at": "2026-10-24 11:00"
    },
    "decided": null
  }
}
```

**Điều kiện/ảnh hưởng:** DRAFT/RETURNED -> PENDING_APPROVAL. Đọc lại feasibility, giấy tại mốc dùng, deadline, lịch AIR, sức chứa/chuyên môn/đất nước; kiểm tra đủ cả ba slot mỗi ROAD. Giữ tạm toàn bộ xe/người trong transaction. Không đòi booking/resourcesConfirmed/Ops READY/Docs READY. Xung đột rollback toàn bộ.

**Schema:** `#/components/schemas/F3-J08Response`, `#/components/schemas/F3-J08Request` trong OpenAPI.


## F3-J09 — POST /coordinator/trips/{tripId}/plan/withdraw

Rút phương án chưa duyệt. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "planVersion": 2,
  "reason": "Cần sửa lại lịch trình phù hợp"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 3,
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "status": "WITHDRAWN",
    "replacesPlanVersion": null,
    "mode": "ROAD",
    "plannedDepart": "2026-10-26 08:00",
    "eta": "2026-10-26 16:00",
    "stops": [
      {
        "checkpointId": null,
        "name": "Điểm nhận theo hợp đồng",
        "type": "ORIGIN",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 08:00"
      },
      {
        "checkpointId": 102,
        "name": "Điểm kiểm tra demo",
        "type": "QUARANTINE_STATION",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 10:00"
      },
      {
        "checkpointId": null,
        "name": "Điểm giao theo hợp đồng",
        "type": "DESTINATION",
        "country": "VN",
        "lat": 11.0,
        "lng": 107.0,
        "plannedAt": "2026-10-26 16:00"
      }
    ],
    "legs": [
      {
        "key": "road",
        "country": "VN",
        "startStopIndex": 0,
        "endStopIndex": 2,
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_010",
          "CO_DRIVER": "USER_011",
          "VETERINARIAN": "USER_012"
        }
      }
    ],
    "flight": null,
    "reservationState": "RELEASED",
    "decisionNote": null,
    "submitted": {
      "by": "USER_006",
      "at": "2026-10-24 11:00"
    },
    "decided": null
  }
}
```

**Điều kiện/ảnh hưởng:** DRAFT/RETURNED/PENDING_APPROVAL -> WITHDRAWN; release đúng giữ tạm của bản này, không release approved cũ. Không rút APPROVED. Bản mới tăng revision toàn Trip, không dùng lại số cũ.

**Schema:** `#/components/schemas/F3-J09Response`, `#/components/schemas/F3-J09Request` trong OpenAPI.


## F3-J10 — GET /manager/trips/{tripId}/preparation

Manager xem feasibility, dependency và phương án. Role: `LOGISTICS_MANAGER`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "tripStatus": "PLANNING",
    "requestStatus": "ACTIVATED",
    "contractStatus": "EFFECTIVE",
    "contextVersion": 1,
    "contractId": "CONTRACT_001",
    "contractVersion": 1,
    "deliveryDeadline": "2026-11-02 18:00",
    "originCountry": "VN",
    "destinationCountry": "VN",
    "mode": "ROAD",
    "horseIds": [
      "HORSE_001"
    ],
    "deploymentStatus": "CONFIRMED",
    "specialistId": "USER_005",
    "coordinatorId": "USER_006",
    "documentSetVersion": 3,
    "evidenceVersion": 8,
    "feasibility": {
      "version": 1,
      "contextVersion": 1,
      "documentSetVersion": 3,
      "earliestReadyAt": "2026-10-25 08:00",
      "constraints": [
        {
          "key": "HEALTH:HORSE_001",
          "typeId": "HEALTH_CERTIFICATE",
          "horseId": "HORSE_001",
          "validFrom": "2026-10-25 08:00",
          "validUntil": "2026-10-30 18:00",
          "useAt": "CHECKPOINT",
          "checkpointId": 102,
          "mustCoverWholeTrip": false,
          "basis": "ESTIMATED_ISSUANCE",
          "note": "Ví dụ dự kiến, Specialist phải kiểm tra giấy thật sau duyệt."
        }
      ],
      "dependencies": [
        {
          "key": "EXPORT_SCHEDULE",
          "description": "Hoàn thiện giấy theo lịch chính thức",
          "needs": "OFFICIAL_SCHEDULE",
          "owner": "TRANSPORT_SPECIALIST",
          "expectedLeadMinutes": 120,
          "completionRule": "Lịch đã duyệt phải còn đủ thời gian hoàn thiện trước điểm dùng",
          "resolved": false
        }
      ],
      "planningAllowed": true,
      "blockers": [],
      "assessed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      }
    },
    "draft": null,
    "approvedPlan": {
      "version": 4,
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "status": "APPROVED",
      "replacesPlanVersion": null,
      "mode": "ROAD",
      "plannedDepart": "2026-10-26 08:00",
      "eta": "2026-10-26 16:00",
      "stops": [
        {
          "checkpointId": null,
          "name": "Điểm nhận theo hợp đồng",
          "type": "ORIGIN",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 08:00"
        },
        {
          "checkpointId": 102,
          "name": "Điểm kiểm tra demo",
          "type": "QUARANTINE_STATION",
          "country": "VN",
          "lat": 10.8,
          "lng": 106.7,
          "plannedAt": "2026-10-26 10:00"
        },
        {
          "checkpointId": null,
          "name": "Điểm giao theo hợp đồng",
          "type": "DESTINATION",
          "country": "VN",
          "lat": 11.0,
          "lng": 107.0,
          "plannedAt": "2026-10-26 16:00"
        }
      ],
      "legs": [
        {
          "key": "road",
          "country": "VN",
          "startStopIndex": 0,
          "endStopIndex": 2,
          "vehicleId": "VEHICLE_001",
          "crew": {
            "MAIN_DRIVER": "USER_010",
            "CO_DRIVER": "USER_011",
            "VETERINARIAN": "USER_012"
          }
        }
      ],
      "flight": null,
      "reservationState": "CONFIRMED",
      "decisionNote": "Chấp thuận phương án trong khoảng khả thi",
      "submitted": {
        "by": "USER_006",
        "at": "2026-10-24 11:00"
      },
      "decided": {
        "by": "USER_004",
        "at": "2026-10-24 11:30"
      }
    },
    "booking": null,
    "resourcesConfirmed": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "docsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "opsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "blockers": []
  }
}
```

**Điều kiện/ảnh hưởng:** Thay F2-J47; chưa có READY/booking vẫn cho xem và xét duyệt phương án. Cần refetch trước quyết định.

**Schema:** `#/components/schemas/F3-J10Response` trong OpenAPI.


## F3-J11 — POST /manager/trips/{tripId}/plan/decision

Duyệt toàn bộ phương án hoặc trả lại. Role: `LOGISTICS_MANAGER`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "planVersion": 2,
  "decision": "APPROVE",
  "reason": "Chấp thuận phương án và nguồn lực"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 4,
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "status": "APPROVED",
    "replacesPlanVersion": null,
    "mode": "ROAD",
    "plannedDepart": "2026-10-26 08:00",
    "eta": "2026-10-26 16:00",
    "stops": [
      {
        "checkpointId": null,
        "name": "Điểm nhận theo hợp đồng",
        "type": "ORIGIN",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 08:00"
      },
      {
        "checkpointId": 102,
        "name": "Điểm kiểm tra demo",
        "type": "QUARANTINE_STATION",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 10:00"
      },
      {
        "checkpointId": null,
        "name": "Điểm giao theo hợp đồng",
        "type": "DESTINATION",
        "country": "VN",
        "lat": 11.0,
        "lng": 107.0,
        "plannedAt": "2026-10-26 16:00"
      }
    ],
    "legs": [
      {
        "key": "road",
        "country": "VN",
        "startStopIndex": 0,
        "endStopIndex": 2,
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_010",
          "CO_DRIVER": "USER_011",
          "VETERINARIAN": "USER_012"
        }
      }
    ],
    "flight": null,
    "reservationState": "CONFIRMED",
    "decisionNote": "Chấp thuận phương án trong khoảng khả thi",
    "submitted": {
      "by": "USER_006",
      "at": "2026-10-24 11:00"
    },
    "decided": {
      "by": "USER_004",
      "at": "2026-10-24 11:30"
    }
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ PENDING_APPROVAL. APPROVE recheck feasibility/nguồn lực tạm/thời điểm dùng/hạn giao/lead time/catalog, xác nhận phân công và ngân sách AIR trong snapshot, tăng revision (mẫu version=4 độc lập). Chưa đòi READY hay booking. RETURN tăng revision, ghi lý do, giải phóng giữ tạm của bản đó. Thay flight trên bản đã BOOKED chặn OLD_BOOKING_ACTIVE cho tới khi có J20; booking không bị ảnh hưởng có thể giữ khi BE xác minh tương đương.

**Schema:** `#/components/schemas/F3-J11Response`, `#/components/schemas/F3-J11Request` trong OpenAPI.


## F3-J12 — POST /coordinator/trips/{tripId}/plan/changes

Tạo đề xuất thay phương án đã duyệt. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "contextVersion": 1,
  "feasibilityVersion": 1,
  "approvedPlanVersion": 4,
  "reason": "Đề xuất điều chỉnh lịch phương tiện"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": 5,
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "status": "DRAFT",
    "replacesPlanVersion": 4,
    "mode": "ROAD",
    "plannedDepart": "2026-10-26 08:00",
    "eta": "2026-10-26 16:00",
    "stops": [
      {
        "checkpointId": null,
        "name": "Điểm nhận theo hợp đồng",
        "type": "ORIGIN",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 08:00"
      },
      {
        "checkpointId": 102,
        "name": "Điểm kiểm tra demo",
        "type": "QUARANTINE_STATION",
        "country": "VN",
        "lat": 10.8,
        "lng": 106.7,
        "plannedAt": "2026-10-26 10:00"
      },
      {
        "checkpointId": null,
        "name": "Điểm giao theo hợp đồng",
        "type": "DESTINATION",
        "country": "VN",
        "lat": 11.0,
        "lng": 107.0,
        "plannedAt": "2026-10-26 16:00"
      }
    ],
    "legs": [
      {
        "key": "road",
        "country": "VN",
        "startStopIndex": 0,
        "endStopIndex": 2,
        "vehicleId": "VEHICLE_001",
        "crew": {
          "MAIN_DRIVER": "USER_010",
          "CO_DRIVER": "USER_011",
          "VETERINARIAN": "USER_012"
        }
      }
    ],
    "flight": null,
    "reservationState": "NONE",
    "decisionNote": null,
    "submitted": null,
    "decided": null
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ PLANNING, có APPROVED, không có draft đang mở. Copy sang DRAFT revision mới gắn feasibility mới nhất; giữ approved và booking/history. Chặn departure trong khi thay đổi đang mở. Nháp không giữ thêm; khi submit bỏ qua xung đột với giữ lịch của cùng Trip nhưng phải kiểm tra Trip khác. Approval mới chuyển reservation nguyên tử và đánh giá lại READY.

**Schema:** `#/components/schemas/F3-J12Response`, `#/components/schemas/F3-J12Request` trong OpenAPI.


## F3-J13 — POST /coordinator/trips/{tripId}/flight/booking

Xác nhận booking sau duyệt phương án. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  },
  "catalogRef": "DEMO-DIRECT-01",
  "bookingRef": "DEMO-REF-20261027",
  "source": "DEMO"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 300,
    "planVersion": 4,
    "catalogRef": "DEMO-DIRECT-01",
    "bookingRef": "DEMO-REF-20261027",
    "source": "DEMO",
    "status": "BOOKED",
    "confirmed": {
      "by": "USER_006",
      "at": "2026-10-24 12:00"
    },
    "cancellationRef": null,
    "cancelled": null
  }
}
```

**Điều kiện/ảnh hưởng:** AIR APPROVED đúng catalog/lịch/giá và binding hiện hành, không có thay đổi đang mở; ROAD từ chối VALIDATION_ERROR. Không tự gọi hãng hay sinh mã production. DEMO cần capability cho phép. Tăng evidenceVersion, invalidates Ops READY. Retry cùng key trả cùng bookingId; đã có BOOKED cùng bản/ref/source trả bản cũ, ref khác trả 409 BOOKING_ALREADY_CONFIRMED. Response mẫu độc lập phải dùng context AIR tương ứng.

**Schema:** `#/components/schemas/F3-J13Response`, `#/components/schemas/F3-J13Request` trong OpenAPI.


## F3-J14 — POST /coordinator/trips/{tripId}/resources/confirm

Xác nhận khả dụng thực tế xe và nhân sự. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  }
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "planVersion": 4,
      "evidenceVersion": 9
    },
    "confirmed": {
      "by": "USER_005",
      "at": "2026-10-24 10:00"
    },
    "documentSetVersion": null,
    "insuranceVersion": null
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ phương án APPROVED hiện hành, không thay đổi đang mở. Recheck toàn hệ thống và lịch/bằng/chứng chỉ; tăng evidenceVersion, lưu binding/actor/time thực. Chưa phải Ops READY. Không cần Docs READY.

**Schema:** `#/components/schemas/F3-J14Response`, `#/components/schemas/F3-J14Request` trong OpenAPI.


## F3-J15 — POST /coordinator/trips/{tripId}/ops-ready

Coordinator xác nhận Ops READY. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  }
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "planVersion": 4,
      "evidenceVersion": 9
    },
    "confirmed": {
      "by": "USER_005",
      "at": "2026-10-24 10:00"
    },
    "documentSetVersion": null,
    "insuranceVersion": null
  }
}
```

**Điều kiện/ảnh hưởng:** Recheck APPROVED, feasibility đúng, nguồn lực xác nhận còn hợp lệ và AIR booking đúng hai ROAD/buffer. Không đòi Docs READY. Tăng evidenceVersion và trả ReadyStamp mới; FE refetch context trước thao tác kế tiếp.

**Schema:** `#/components/schemas/F3-J15Response`, `#/components/schemas/F3-J15Request` trong OpenAPI.


## F3-J16 — POST /specialist/trips/{tripId}/docs-ready

Specialist xác nhận Docs READY theo lịch được duyệt. Role: `TRANSPORT_SPECIALIST`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  },
  "documentSetVersion": 3,
  "insuranceVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "planVersion": 4,
      "evidenceVersion": 9
    },
    "confirmed": {
      "by": "USER_005",
      "at": "2026-10-24 10:00"
    },
    "documentSetVersion": 3,
    "insuranceVersion": 1
  }
}
```

**Điều kiện/ảnh hưởng:** Thay F2-J28. Chỉ APPROVED đúng context/feasibility; hoàn thiện dependencies bằng Flow 2, BE đánh giá đủ required/conditionMet và hồ sơ còn hạn tại từng điểm dùng, supplement, bảo hiểm, lịch kiểm dịch. Không cần Ops READY, không bắt có kết quả thông quan tương lai. Tăng evidenceVersion. Bộ yêu cầu rỗng/chưa cấu hình không READY.

**Schema:** `#/components/schemas/F3-J16Response`, `#/components/schemas/F3-J16Request` trong OpenAPI.


## F3-J17 — GET /manager/trips/{tripId}/readiness

Đọc điều kiện khởi hành hiện hành. Role: `LOGISTICS_MANAGER`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "tripId": "TRIP_001",
    "serverNow": "2026-10-26 07:30",
    "binding": {
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "planVersion": 4,
      "evidenceVersion": 8
    },
    "documentSetVersion": 3,
    "insuranceVersion": 1,
    "canApprove": true,
    "docsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "opsReady": {
      "binding": {
        "contextVersion": 1,
        "feasibilityVersion": 1,
        "planVersion": 4,
        "evidenceVersion": 8
      },
      "confirmed": {
        "by": "USER_005",
        "at": "2026-10-24 10:00"
      },
      "documentSetVersion": 3,
      "insuranceVersion": 1
    },
    "blockers": []
  }
}
```

**Điều kiện/ảnh hưởng:** Thay F2-J48. Bao gồm cả READY đúng bản, giờ server và revision bằng chứng. canApprove=false nếu có blocker/unsupported/draft thay đổi hoặc giờ xuất phát đã qua. GET không cấp quyền bỏ qua kiểm tra POST.

**Schema:** `#/components/schemas/F3-J17Response` trong OpenAPI.


## F3-J18 — POST /manager/trips/{tripId}/departure/approve

Manager cho phép khởi hành sau hai READY. Role: `LOGISTICS_MANAGER`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  },
  "documentSetVersion": 3,
  "insuranceVersion": 1
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

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
      "contextVersion": 1,
      "feasibilityVersion": 1,
      "planVersion": 4,
      "evidenceVersion": 8
    },
    "approved": {
      "by": "USER_004",
      "at": "2026-10-26 07:30"
    }
  }
}
```

**Điều kiện/ảnh hưởng:** Thay F2-J51. Transaction recheck toàn bộ bằng chứng hiện tại và serverNow<=plannedDepart. Trip READY_TO_DEPART + Request SCHEDULED cùng transaction; không tạo DEPARTED. Retry cùng key trả approval cũ; key mới đúng snapshot đã duyệt trả kết quả cũ nếu trạng thái còn READY_TO_DEPART, không thêm event; snapshot khác hoặc IN_TRANSIT trả 409. Hết hạn idempotency vẫn không duyệt trùng snapshot.

**Schema:** `#/components/schemas/F3-J18Response`, `#/components/schemas/F3-J18Request` trong OpenAPI.


## F3-J19 — GET /trips/{tripId}/planning-history

Lịch sử đánh giá, phương án, booking và READY. Role: `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `LOGISTICS_MANAGER`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| limit | query | Không |
| cursor | query | Không |

**Request:**

Không gửi body.

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "planVersion": 4,
      "feasibilityVersion": 1,
      "action": "APPROVED",
      "actor": "USER_004",
      "at": "2026-10-24 11:30",
      "note": "Duyệt bộ phương án, chưa là cho phép khởi hành"
    }
  ]
}
```

**Điều kiện/ảnh hưởng:** Cùng phạm vi Trip được giao/quản lý, thứ tự thời gian tăng. Không xóa bản cũ. Chỉ lịch sử nghiệp vụ, không trả file hoặc thông tin nhạy cảm ngoài quyền. Nếu >limit dùng cursor từ response header X-Next-Cursor.

**Schema:** `#/components/schemas/F3-J19Response` trong OpenAPI.


## F3-J20 — POST /coordinator/trips/{tripId}/flight/booking/cancel

Ghi nhận hủy booking để xử lý phương án thay thế. Role: `FLEET_ROUTE_COORDINATOR`.

| Tham số | Vị trí | Bắt buộc |
|---|---|---|
| tripId | path | Có |
| Idempotency-Key | header | Có |

**Request:**

```json
{
  "binding": {
    "contextVersion": 1,
    "feasibilityVersion": 1,
    "planVersion": 4,
    "evidenceVersion": 8
  },
  "bookingId": 300,
  "cancellationRef": "DEMO-CANCEL-01",
  "reason": "Đổi chuyến bay theo đề xuất mới"
}
```

**Response 200 — mẫu mục tiêu khi đã triển khai:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 300,
    "planVersion": 4,
    "catalogRef": "DEMO-DIRECT-01",
    "bookingRef": "DEMO-REF-20261027",
    "source": "DEMO",
    "status": "CANCELLED",
    "confirmed": {
      "by": "USER_006",
      "at": "2026-10-24 12:00"
    },
    "cancellationRef": "DEMO-CANCEL-01",
    "cancelled": {
      "by": "USER_006",
      "at": "2026-10-24 14:00"
    }
  }
}
```

**Điều kiện/ảnh hưởng:** Chỉ PLANNING có approved và proposal thay đổi đang mở, đúng booking hiện hành. Ghi chứng cứ hủy bên ngoài/demo, không gọi hãng tự hủy; không xóa booking cũ. Tăng evidenceVersion, mất Ops READY, giữ lịch sử. Hủy thất bại không được ghi CANCELLED. Retry key cũ trả kết quả cũ; booking đã CANCELLED cùng ref trả kết quả đã lưu khi vẫn PLANNING. Backend phải kiểm tra nguồn/chứng cứ tương ứng booking.source.

**Schema:** `#/components/schemas/F3-J20Response`, `#/components/schemas/F3-J20Request` trong OpenAPI.

