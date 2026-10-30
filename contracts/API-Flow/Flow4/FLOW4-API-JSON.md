# Flow 4 — JSON từng API

**1.1.0 — 30/10/2026. Contract mục tiêu; chưa triển khai backend/database hoặc tích hợp frontend.**

[Nghiệp vụ](FLOW4.md) · [OpenAPI](flow4.openapi.json) · [Kịch bản](flow4.examples.json).

Base `/api`, Bearer JWT, Accept application/json. JSON dùng Content-Type application/json. GET không body. Mutation có Idempotency-Key UUID; payload và status/actor được kiểm máy chủ. Mẫu độc lập, không phải script chạy nối tiếp. Timestamp địa phương Asia/Ho_Chi_Minh. Lists trả data array.

| Mã | Method | Endpoint | Chức năng |
|---|---|---|---|
| F4-J01 | GET | `/master/flow4-capabilities` | Capability và policy theo dõi hành trình |
| F4-J02 | GET | `/driver/trips` | Nhiệm vụ vận chuyển được phân công |
| F4-J03 | GET | `/trips/{tripId}/execution` | Context hành trình và thao tác theo phân công |
| F4-J04 | GET | `/driver/trips/{tripId}/departure-check` | Kiểm tra trước xuất phát thực tế |
| F4-J05 | POST | `/driver/trips/{tripId}/departure` | Xác nhận xuất phát thực tế |
| F4-J06 | POST | `/driver/trips/{tripId}/milestones/{milestoneId}/complete` | Xác nhận mốc kế tiếp của chặng |
| F4-J07 | GET | `/trips/{tripId}/execution/history` | Lịch sử hành trình, đính chính và quyết định |
| F4-J08 | POST | `/driver/trips/{tripId}/milestones/{milestoneId}/correction-requests` | Yêu cầu đính chính mốc đã hoàn tất |
| F4-J09 | GET | `/coordinator/trips/{tripId}/milestone-corrections` | Danh sách yêu cầu đính chính |
| F4-J10 | POST | `/coordinator/trips/{tripId}/milestone-corrections/{correctionId}/decision` | Duyệt hoặc từ chối đính chính |
| F4-J11 | GET | `/trips/{tripId}/execution/checkpoints` | Kết quả cho phép đi tiếp tại checkpoint |
| F4-J12 | POST | `/specialist/trips/{tripId}/checkpoints/{checkpointId}/decisions` | Ghi kết quả kiểm tra pháp lý thực tế |
| F4-J13 | POST | `/driver/trips/{tripId}/air/handover` | Bàn giao ngựa cho đối tác AIR đầu đi |
| F4-J14 | POST | `/coordinator/trips/{tripId}/air/notices` | Ghi thông tin lịch hoặc sự kiện AIR từ đối tác |
| F4-J15 | POST | `/driver/trips/{tripId}/air/receive` | Kiểm tra và tiếp nhận ngựa đầu đến |
| F4-J16 | GET | `/trips/{tripId}/execution/air/notices` | Lịch sử thông tin hãng và lịch dự kiến riêng |
| F4-J17 | POST | `/driver/trips/{tripId}/eta-proposals` | Đề xuất ETA kèm lý do |
| F4-J18 | POST | `/coordinator/trips/{tripId}/eta-proposals` | Điều phối viên lập đề xuất ETA |
| F4-J19 | GET | `/trips/{tripId}/execution/eta-proposals` | Đọc ETA hiện hành và lịch sử đề xuất |
| F4-J20 | POST | `/coordinator/trips/{tripId}/eta-proposals/{proposalId}/decision` | Xác nhận ETA hoặc trình Manager |
| F4-J21 | POST | `/manager/trips/{tripId}/eta-proposals/{proposalId}/decision` | Manager quyết định đề xuất ETA vượt phạm vi |
| F4-J22 | GET | `/trips/{tripId}/execution/health-logs` | Nhật ký chăm sóc và chỉ số từng ngựa |
| F4-J23 | POST | `/driver/trips/{tripId}/health-logs` | Ghi chăm sóc và quan sát sức khỏe |
| F4-J24 | POST | `/driver/trips/{tripId}/health-logs/{healthLogId}/amendments` | Bổ sung bản đính chính nhật ký sức khỏe |
| F4-J25 | POST | `/driver/trips/{tripId}/vet-assessments` | Bác sĩ ghi kết luận và khả năng tiếp tục |
| F4-J26 | GET | `/trips/{tripId}/execution/vet-assessments` | Đọc kết luận chuyên môn và hướng dẫn |
| F4-J27 | GET | `/trips/{tripId}/execution/alerts` | Cảnh báo trễ mốc và chăm sóc đến hạn |
| F4-J28 | POST | `/coordinator/trips/{tripId}/alerts/{alertId}/acknowledge` | Ghi đã tiếp nhận cảnh báo |
| F4-J29 | POST | `/coordinator/trips/{tripId}/contact-logs` | Ghi kết quả liên hệ nhân sự không phản hồi |
| F4-J30 | POST | `/trips/{tripId}/execution/files` | Upload bằng chứng hành trình thật |
| F4-J31 | GET | `/trips/{tripId}/execution/files/{fileId}` | Tải file vận hành có kiểm quyền |
| F4-J32 | GET | `/customer/requests/{requestId}/tracking` | Khách xem hành trình đơn của mình |
| F4-J33 | GET | `/customer/requests/{requestId}/health-logs` | Khách xem chăm sóc, chỉ số, ảnh và nhận xét |
| F4-J34 | GET | `/customer/requests/{requestId}/tracking-files/{fileId}` | Khách tải ảnh/bằng chứng được chia sẻ |
| F4-J35 | GET | `/manager/trips/{tripId}/execution` | Manager giám sát vận hành |
| F4-J36 | POST | `/driver/trips/{tripId}/expenses` | Ghi nhận chi phí phát sinh trên đường |
| F4-J37 | GET | `/trips/{tripId}/execution/expenses` | Danh sách chi phí phát sinh chuyến đi |

## F4-J01 — GET /master/flow4-capabilities

Capability và policy theo dõi hành trình

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST, CUSTOMER

**Điều kiện và ảnh hưởng:** Metadata đăng nhập; flags chỉ bật sau triển khai. Policy chưa cấu hình trả null, không fallback số phút/ảnh ở client.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": "1.1.0",
    "implementationStatus": "DESIGNED_NOT_IMPLEMENTED",
    "persistenceAvailable": false,
    "filesAvailable": false,
    "notificationsAvailable": false,
    "incidentIntegrationAvailable": false,
    "gpsRealtime": false,
    "timezone": "Asia/Ho_Chi_Minh",
    "policy": {
      "version": 1,
      "lateMilestoneMinutes": null,
      "healthIntervalMinutes": null,
      "minimumHealthPhotos": null,
      "configured": false,
      "note": "Chưa chốt ngưỡng; không tự gán mặc định"
    }
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J02 — GET /driver/trips

Nhiệm vụ vận chuyển được phân công

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Chỉ chuyến có assignment của JWT, gồm lịch sử trong scope và thông tin xe phân công. Không trả mọi chuyến cho mọi tài xế.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `status` | False | `{"type":"string","example":"READY_TO_DEPART","enum":["READY_TO_DEPART","IN_TRANSIT","COMPLETED"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J03 — GET /trips/{tripId}/execution

Context hành trình và thao tác theo phân công

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Driver chỉ có action ở chặng được giao; Specialist chỉ tác vụ checkpoint. Mốc/route từ approved snapshot, trả đầy đủ thông tin xe (biển số, loại xe, số khoang) theo từng chặng ROAD.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 10,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "serverTime": "2026-11-10 06:00",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "READY_TO_DEPART",
      "requestStatus": "SCHEDULED",
      "phase": "AWAITING_DEPARTURE",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 18:00",
        "deliveryDeadline": "2026-11-11 18:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "horses": [
      {
        "horseId": "HORSE_001",
        "name": "Bạch Long",
        "microchip": "704123456789012",
        "careInstructions": ""
      }
    ],
    "pickup": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "delivery": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "flight": null,
    "legs": [
      {
        "key": "road",
        "mode": "ROAD",
        "status": "PENDING",
        "assignedUserIds": [
          "USER_011",
          "USER_012",
          "USER_013"
        ],
        "crew": [
          {
            "userId": "USER_011",
            "name": "Nguyễn Văn An",
            "duty": "MAIN_DRIVER"
          },
          {
            "userId": "USER_012",
            "name": "Trần Văn Bình",
            "duty": "CO_DRIVER"
          },
          {
            "userId": "USER_013",
            "name": "Lê Văn Cường",
            "duty": "VETERINARIAN"
          }
        ],
        "vehicleId": "VEHICLE_001",
        "vehicle": {
          "vehicleId": "VEHICLE_001",
          "plateNumber": "51B-888.99",
          "type": "Xe chuyên dụng 4 khoang điều hòa",
          "capacityStalls": 4,
          "heightM": 3.8,
          "grossWeightTons": 8.5
        },
        "from": "Điểm nhận ngựa",
        "to": "Điểm giao cuối",
        "milestoneIds": [
          "MILESTONE_001",
          "MILESTONE_002"
        ]
      }
    ],
    "milestones": [
      {
        "id": "MILESTONE_001",
        "leg": "road",
        "kind": "DEPARTED",
        "sequence": 1,
        "label": "Xuất phát đường bộ",
        "status": "PENDING",
        "plannedAt": "2026-11-10 06:00",
        "occurredAt": null,
        "recordedAt": null,
        "recordedBy": null,
        "revision": 1,
        "note": "",
        "evidenceFileIds": [],
        "geo": null,
        "requiresHealthCheck": false,
        "actions": {
          "canComplete": true,
          "canRequestCorrection": false,
          "canRecordHealth": false,
          "canProposeEta": false,
          "blockers": []
        }
      },
      {
        "id": "MILESTONE_002",
        "leg": "road",
        "kind": "FINAL_ARRIVED",
        "sequence": 2,
        "label": "Đến điểm giao cuối",
        "status": "PENDING",
        "plannedAt": "2026-11-10 18:00",
        "occurredAt": null,
        "recordedAt": null,
        "recordedBy": null,
        "revision": 1,
        "note": "",
        "evidenceFileIds": [],
        "geo": null,
        "requiresHealthCheck": false,
        "actions": {
          "canComplete": false,
          "canRequestCorrection": false,
          "canRecordHealth": false,
          "canProposeEta": false,
          "blockers": []
        }
      }
    ],
    "map": {
      "routeSource": "APPROVED_PLAN",
      "locationSource": "CONFIRMED_MILESTONE",
      "lastConfirmedMilestoneId": null,
      "markerGeo": null,
      "isGps": false,
      "routePoints": []
    },
    "policy": {
      "version": 1,
      "lateMilestoneMinutes": null,
      "healthIntervalMinutes": null,
      "minimumHealthPhotos": null,
      "configured": false,
      "note": "Chưa chốt ngưỡng; không tự gán mặc định"
    },
    "blockers": [],
    "handoverAvailable": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J04 — GET /driver/trips/{tripId}/departure-check

Kiểm tra trước xuất phát thực tế

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Kiểm lại approval, nguồn lực, xe, hồ sơ, bảo hiểm, tình trạng ngựa và blocker hiện hành. Yêu cầu xác nhận HORSES_CHECKED và VEHICLE_VERIFIED. GET không xuất phát. Inbound cũng dùng check theo chặng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| query | `leg` | False | `{"type":"string","example":"road","enum":["road","outbound","air","inbound"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 10,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "approvalValid": false,
    "checks": [],
    "canDepart": false,
    "requiredAcknowledgements": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J05 — POST /driver/trips/{tripId}/departure

Xác nhận xuất phát thực tế

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Chỉ MAIN_DRIVER/CO_DRIVER được giao ở ROAD đầu; recheck transaction với phiên bản plan/assignment hiện hành và acknowledgement (HORSES_CHECKED, VEHICLE_VERIFIED) server yêu cầu. Hoàn tất DEPARTED đầu tiên: Trip và Request IN_TRANSIT nguyên tử; khóa duyệt lại Flow 3; không tạo Trip mới.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "approvedPlanVersion": 1,
  "assignmentVersion": 1,
  "occurredAt": "2026-11-10 06:00",
  "acknowledgements": [
    "HORSES_CHECKED"
  ],
  "note": "",
  "evidenceFileIds": []
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": "MILESTONE_001",
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, DEPARTURE_NOT_APPROVED, READINESS_CHANGED, NOT_ASSIGNED_LEG, INCIDENT_BLOCKING; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: DEPARTURE_NOT_APPROVED",
  "errorCode": "DEPARTURE_NOT_APPROVED",
  "data": null,
  "blockers": [
    {
      "code": "DEPARTURE_NOT_APPROVED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J06 — POST /driver/trips/{tripId}/milestones/{milestoneId}/complete

Xác nhận mốc kế tiếp của chặng

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Chỉ mốc generic STOP/CHECKPOINT/AIRPORT_ORIGIN/FINAL_ARRIVED và DEPARTED của inbound đã đủ tiếp nhận. DEPARTED đầu dùng J05, AIR dùng J13–J15. Kiểm thứ tự, thời gian, checklist và blocker. Trạm có cờ requiresHealthCheck phải hoàn tất HealthLog trước khi hoàn tất mốc. Ngựa có trạng thái ABNORMAL chặn mốc tiếp theo cho đến khi có xác nhận FIT. FINAL_ARRIVED chỉ mở Flow 6; Trip/Request vẫn IN_TRANSIT.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `milestoneId` | True | `{"type":"string","example":"MILESTONEID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "occurredAt": "2026-11-10 06:00",
  "note": "",
  "evidenceFileIds": []
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, MILESTONE_NOT_NEXT, MILESTONE_ALREADY_COMPLETED, NOT_ASSIGNED_LEG, CHECKPOINT_NOT_CLEARED, INCIDENT_BLOCKING, USE_SPECIALIZED_COMMAND, INVALID_EVENT_TIME, HEALTH_CHECK_REQUIRED, VET_CLEARANCE_REQUIRED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: MILESTONE_NOT_NEXT",
  "errorCode": "MILESTONE_NOT_NEXT",
  "data": null,
  "blockers": [
    {
      "code": "MILESTONE_NOT_NEXT",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J07 — GET /trips/{tripId}/execution/history

Lịch sử hành trình, đính chính và quyết định

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Append-only, thứ tự recordedAt rồi ID; chỉ lịch sử trong scope, giữ cả revision cũ, actor hệ thống có systemActor=true.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J08 — POST /driver/trips/{tripId}/milestones/{milestoneId}/correction-requests

Yêu cầu đính chính mốc đã hoàn tất

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Chỉ mốc trong chặng được giao và COMPLETED; lưu original/proposed, không cập nhật mốc ngay; một yêu cầu pending mỗi mốc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `milestoneId` | True | `{"type":"string","example":"MILESTONEID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "milestoneRevision": 1,
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "proposedOccurredAt": "2026-11-10 06:00",
  "proposedNote": "",
  "proposedEvidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "CORRECTION_001",
    "milestoneId": "MILESTONE_001",
    "version": 1,
    "status": "PENDING",
    "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
    "requestedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "requestedAt": "2026-11-10 06:00",
    "original": {
      "expectedVersion": 10,
      "occurredAt": "2026-11-10 06:00",
      "note": "",
      "evidenceFileIds": []
    },
    "proposed": {
      "expectedVersion": 10,
      "occurredAt": "2026-11-10 06:00",
      "note": "",
      "evidenceFileIds": []
    },
    "decidedBy": null,
    "decidedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, CORRECTION_ALREADY_PENDING, MILESTONE_NOT_COMPLETED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: CORRECTION_ALREADY_PENDING",
  "errorCode": "CORRECTION_ALREADY_PENDING",
  "data": null,
  "blockers": [
    {
      "code": "CORRECTION_ALREADY_PENDING",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J09 — GET /coordinator/trips/{tripId}/milestone-corrections

Danh sách yêu cầu đính chính

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Chỉ Trip điều phối viên được giao; giữ cả pending và lịch sử quyết định.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J10 — POST /coordinator/trips/{tripId}/milestone-corrections/{correctionId}/decision

Duyệt hoặc từ chối đính chính

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Đúng revision mốc và yêu cầu; chỉ thay time/note/evidence đã đề nghị, không đổi actor ghi gốc, loại/chặng/thứ tự mốc. Kiểm toàn chuỗi thời gian và dependency; giữ revision cũ. Không xóa mốc hay đảo Trip đã bàn giao.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `correctionId` | True | `{"type":"string","example":"CORRECTIONID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "correctionVersion": 1,
  "milestoneRevision": 1,
  "decision": "APPROVE",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, CORRECTION_DECIDED, INVALID_EVENT_TIME, CORRECTION_REQUIRES_INCIDENT; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: CORRECTION_DECIDED",
  "errorCode": "CORRECTION_DECIDED",
  "data": null,
  "blockers": [
    {
      "code": "CORRECTION_DECIDED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J11 — GET /trips/{tripId}/execution/checkpoints

Kết quả cho phép đi tiếp tại checkpoint

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** PENDING/HELD/SUPPLEMENT_REQUIRED đều chặn rời checkpoint, chăm sóc vẫn được ghi.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J12 — POST /specialist/trips/{tripId}/checkpoints/{checkpointId}/decisions

Ghi kết quả kiểm tra pháp lý thực tế

**Role:** TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Specialist được giao ghi kết quả từ cơ quan/bên kiểm tra cùng bằng chứng sau CHECKPOINT_ARRIVED. CLEARED không gỡ blocker sức khỏe/nguồn lực. Không tự cấp giấy phép; đây là kết quả thực tế của Flow 2 trong hành trình, không checklist pre-departure thứ hai.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `checkpointId` | True | `{"type":"string","example":"CHECKPOINTID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "checkpointVersion": 1,
  "decision": "CLEARED",
  "occurredAt": "2026-11-10 06:00",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "evidenceFileIds": [
    "EVIDENCE_001"
  ]
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, CHECKPOINT_NOT_ARRIVED, EVIDENCE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: CHECKPOINT_NOT_ARRIVED",
  "errorCode": "CHECKPOINT_NOT_ARRIVED",
  "data": null,
  "blockers": [
    {
      "code": "CHECKPOINT_NOT_ARRIVED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J13 — POST /driver/trips/{tripId}/air/handover

Bàn giao ngựa cho đối tác AIR đầu đi

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** MAIN_DRIVER/CO_DRIVER outbound, đúng mốc AIR_HANDOVER sau tới sân bay (kho Cargo Terminal); đủ toàn bộ ngựa và booking hiện hành, bằng chứng đối tác. Ngựa có trạng thái ABNORMAL chặn bàn giao cho đến khi có xác nhận FIT. Không bàn giao cho người nhận cuối. Thông báo Manager/Customer/Coordinator sau commit.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "occurredAt": "2026-11-10 06:00",
  "horseIds": [
    "HORSE_001"
  ],
  "bookingId": "BOOKING_001",
  "partnerReference": "Biên nhận đối tác AIR tại kho Cargo Terminal",
  "allHorsesChecked": true,
  "note": "",
  "evidenceFileIds": [
    "EVIDENCE_001"
  ]
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, MILESTONE_NOT_NEXT, HORSE_SET_MISMATCH, BOOKING_CHANGED, NOT_ASSIGNED_LEG, VET_CLEARANCE_REQUIRED, INCIDENT_BLOCKING; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: MILESTONE_NOT_NEXT",
  "errorCode": "MILESTONE_NOT_NEXT",
  "data": null,
  "blockers": [
    {
      "code": "MILESTONE_NOT_NEXT",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J14 — POST /coordinator/trips/{tripId}/air/notices

Ghi thông tin lịch hoặc sự kiện AIR từ đối tác

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** ESTIMATED_SCHEDULE chỉ ghi notice và mở đề xuất thay đổi khi cần, không đổi mốc thực tế/approved plan/ETA. ACTUAL_DEPARTURE/ARRIVAL chỉ áp dụng mốc kế tiếp AIR từ nguồn có bằng chứng; không giả làm actor hãng. Giờ thực tế không tương lai, arrival >= departure, đúng booking. Thay lịch chính thức phải qua Flow 5/Manager trước áp dụng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "bookingId": "BOOKING_001",
  "kind": "ESTIMATED_SCHEDULE",
  "departureAt": "2026-11-10 12:00",
  "arrivalAt": "2026-11-10 16:00",
  "receivedAt": "2026-11-10 06:00",
  "sourceReference": "Thông báo đối tác AIR số 123",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "evidenceFileIds": [
    "EVIDENCE_001"
  ],
  "incidentId": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "AIRNOTICE_001",
    "input": {
      "expectedVersion": 10,
      "bookingId": "BOOKING_001",
      "kind": "ESTIMATED_SCHEDULE",
      "departureAt": "2026-11-10 12:00",
      "arrivalAt": "2026-11-10 16:00",
      "receivedAt": "2026-11-10 06:00",
      "sourceReference": "Thông báo đối tác AIR số 123",
      "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
      "evidenceFileIds": [
        "EVIDENCE_001"
      ],
      "incidentId": null
    },
    "recordedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 06:00",
    "requiresPlanChange": false,
    "milestoneApplied": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, BOOKING_CHANGED, MILESTONE_NOT_NEXT, INVALID_EVENT_TIME, INCIDENT_REQUIRED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: BOOKING_CHANGED",
  "errorCode": "BOOKING_CHANGED",
  "data": null,
  "blockers": [
    {
      "code": "BOOKING_CHANGED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J15 — POST /driver/trips/{tripId}/air/receive

Kiểm tra và tiếp nhận ngựa đầu đến

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** MAIN_DRIVER/CO_DRIVER inbound sau AIR_ARRIVED có bằng chứng; đủ ngựa và tình trạng nhận tại kho Cargo Terminal. Bất thường ghi health/Flow 5, không khai bình thường giả. Mở inbound khi tất cả gate đủ; thông báo Manager/Customer/Coordinator.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "occurredAt": "2026-11-10 06:00",
  "horseIds": [
    "HORSE_001"
  ],
  "bookingId": "BOOKING_001",
  "partnerReference": "Biên nhận đối tác AIR tại kho Cargo Terminal",
  "allHorsesChecked": true,
  "note": "",
  "evidenceFileIds": [
    "EVIDENCE_001"
  ]
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, MILESTONE_NOT_NEXT, HORSE_SET_MISMATCH, NOT_ASSIGNED_LEG, BOOKING_CHANGED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: MILESTONE_NOT_NEXT",
  "errorCode": "MILESTONE_NOT_NEXT",
  "data": null,
  "blockers": [
    {
      "code": "MILESTONE_NOT_NEXT",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J16 — GET /trips/{tripId}/execution/air/notices

Lịch sử thông tin hãng và lịch dự kiến riêng

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Chỉ AIR; hiển thị nguồn, giờ nhận tin và giờ nhập; không coi giờ dự kiến là thực tế.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J17 — POST /driver/trips/{tripId}/eta-proposals

Đề xuất ETA kèm lý do

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Nhân sự chặng được giao, Trip IN_TRANSIT; chỉ một proposal mở. ETA hiện hành không đổi. Chậm do sự cố phải liên kết incident có thật.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposedEta": "2026-11-10 19:00",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "milestoneId": "MILESTONE_001",
  "incidentId": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "ETA_001",
    "version": 1,
    "currentEta": "2026-11-10 18:00",
    "proposedEta": "2026-11-10 19:00",
    "status": "PENDING_COORDINATOR",
    "requiresManager": false,
    "escalationReasons": [],
    "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
    "incidentId": null,
    "proposedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "proposedAt": "2026-11-10 06:00",
    "decidedAt": null,
    "decisionReason": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, ETA_PROPOSAL_OPEN, INCIDENT_REQUIRED, INVALID_EVENT_TIME; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: ETA_PROPOSAL_OPEN",
  "errorCode": "ETA_PROPOSAL_OPEN",
  "data": null,
  "blockers": [
    {
      "code": "ETA_PROPOSAL_OPEN",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J18 — POST /coordinator/trips/{tripId}/eta-proposals

Điều phối viên lập đề xuất ETA

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Cùng guard J17; ảnh hưởng hạn giao, tuyến, bay hoặc lịch chính thức thì server requiresManager=true. Không đổi địa chỉ giao hoặc giá khách.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposedEta": "2026-11-10 19:00",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "milestoneId": "MILESTONE_001",
  "incidentId": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "ETA_001",
    "version": 1,
    "currentEta": "2026-11-10 18:00",
    "proposedEta": "2026-11-10 19:00",
    "status": "PENDING_COORDINATOR",
    "requiresManager": false,
    "escalationReasons": [],
    "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
    "incidentId": null,
    "proposedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "proposedAt": "2026-11-10 06:00",
    "decidedAt": null,
    "decisionReason": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, ETA_PROPOSAL_OPEN, INCIDENT_REQUIRED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: ETA_PROPOSAL_OPEN",
  "errorCode": "ETA_PROPOSAL_OPEN",
  "data": null,
  "blockers": [
    {
      "code": "ETA_PROPOSAL_OPEN",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J19 — GET /trips/{tripId}/execution/eta-proposals

Đọc ETA hiện hành và lịch sử đề xuất

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Trả cả proposal chờ và quyết định cũ. currentEta trong Tracking là nguồn hiện hành; proposedEta không thay nó.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J20 — POST /coordinator/trips/{tripId}/eta-proposals/{proposalId}/decision

Xác nhận ETA hoặc trình Manager

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** APPROVE trong phạm vi được phép cập nhật currentEta; nếu requiresManager thì chuyển PENDING_MANAGER và giữ ETA cũ. Server recheck tác động theo approved plan/deadline; ghi quyết định, không tự đổi lịch chính thức.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `proposalId` | True | `{"type":"string","example":"PROPOSALID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposalVersion": 1,
  "decision": "APPROVE",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, MANAGER_REVIEW_PENDING, PROPOSAL_DECIDED, INCIDENT_REQUIRED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: MANAGER_REVIEW_PENDING",
  "errorCode": "MANAGER_REVIEW_PENDING",
  "data": null,
  "blockers": [
    {
      "code": "MANAGER_REVIEW_PENDING",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J21 — POST /manager/trips/{tripId}/eta-proposals/{proposalId}/decision

Manager quyết định đề xuất ETA vượt phạm vi

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Chỉ PENDING_MANAGER. Nếu phải đổi route/booking/resources/lịch chính thức, xử lý và phê duyệt phương án Flow 5 trước; ETA command chỉ công bố ETA tương ứng sau recheck, không tự sửa phương án hoặc hợp đồng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `proposalId` | True | `{"type":"string","example":"PROPOSALID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposalVersion": 1,
  "decision": "APPROVE",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, CHANGE_PLAN_REQUIRED, PROPOSAL_NOT_ESCALATED, PROPOSAL_DECIDED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: CHANGE_PLAN_REQUIRED",
  "errorCode": "CHANGE_PLAN_REQUIRED",
  "data": null,
  "blockers": [
    {
      "code": "CHANGE_PLAN_REQUIRED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J22 — GET /trips/{tripId}/execution/health-logs

Nhật ký chăm sóc và chỉ số từng ngựa

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Ngựa thuộc Trip, không chẩn đoán bằng ngưỡng schema. Trả history amendment, người ghi và thời điểm quan sát/nhập riêng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| query | `horseId` | False | `{"type":"string","example":"HORSE_001","pattern":"^HORSE_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J23 — POST /driver/trips/{tripId}/health-logs

Ghi chăm sóc và quan sát sức khỏe

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Mọi nhân sự được giao ở chặng, gồm bác sĩ, được ghi; khi blocker hành trình còn mở vẫn cho chăm sóc. Checklist máy chủ quyết định ảnh/chỉ số cần có. ABNORMAL lưu ngay và trả incidentRequired=true nếu chưa liên kết incident; tự động kích hoạt chốt chặn an toàn cho chuyến đi.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "horseId": "HORSE_001",
  "leg": "road",
  "milestoneId": null,
  "observedAt": "2026-11-10 06:00",
  "condition": "NORMAL",
  "observation": "Đã kiểm tra tại hiện trường",
  "feeding": "",
  "water": "",
  "rest": "",
  "care": "",
  "temperatureC": null,
  "heartRateBpm": null,
  "respiratoryRatePerMin": null,
  "photoFileIds": [],
  "incidentId": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HEALTH_001",
    "entry": {
      "expectedVersion": 10,
      "horseId": "HORSE_001",
      "leg": "road",
      "milestoneId": null,
      "observedAt": "2026-11-10 06:00",
      "condition": "NORMAL",
      "observation": "Đã kiểm tra tại hiện trường",
      "feeding": "",
      "water": "",
      "rest": "",
      "care": "",
      "temperatureC": null,
      "heartRateBpm": null,
      "respiratoryRatePerMin": null,
      "photoFileIds": [],
      "incidentId": null
    },
    "recordedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 06:00",
    "supersedesId": null,
    "amendmentReason": null,
    "incidentRequired": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, NOT_ASSIGNED_LEG, HEALTH_CHECK_REQUIRED, EVIDENCE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: NOT_ASSIGNED_LEG",
  "errorCode": "NOT_ASSIGNED_LEG",
  "data": null,
  "blockers": [
    {
      "code": "NOT_ASSIGNED_LEG",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J24 — POST /driver/trips/{tripId}/health-logs/{healthLogId}/amendments

Bổ sung bản đính chính nhật ký sức khỏe

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Chỉ tác giả đang có assignment, lưu bản mới supersedesId và lý do, giữ bản cũ; replacement.expectedVersion phải bằng outer expectedVersion. Không sửa kết luận bác sĩ bằng nhật ký chăm sóc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `healthLogId` | True | `{"type":"string","example":"HEALTHLOGID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "replacement": {
    "expectedVersion": 10,
    "horseId": "HORSE_001",
    "leg": "road",
    "milestoneId": null,
    "observedAt": "2026-11-10 06:00",
    "condition": "NORMAL",
    "observation": "Đã kiểm tra tại hiện trường",
    "feeding": "",
    "water": "",
    "rest": "",
    "care": "",
    "temperatureC": null,
    "heartRateBpm": null,
    "respiratoryRatePerMin": null,
    "photoFileIds": [],
    "incidentId": null
  }
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "HEALTH_001",
    "entry": {
      "expectedVersion": 10,
      "horseId": "HORSE_001",
      "leg": "road",
      "milestoneId": null,
      "observedAt": "2026-11-10 06:00",
      "condition": "NORMAL",
      "observation": "Đã kiểm tra tại hiện trường",
      "feeding": "",
      "water": "",
      "rest": "",
      "care": "",
      "temperatureC": null,
      "heartRateBpm": null,
      "respiratoryRatePerMin": null,
      "photoFileIds": [],
      "incidentId": null
    },
    "recordedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 06:00",
    "supersedesId": null,
    "amendmentReason": null,
    "incidentRequired": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, NOT_LOG_AUTHOR, HEALTH_LOG_SUPERSEDED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: NOT_LOG_AUTHOR",
  "errorCode": "NOT_LOG_AUTHOR",
  "data": null,
  "blockers": [
    {
      "code": "NOT_LOG_AUTHOR",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J25 — POST /driver/trips/{tripId}/vet-assessments

Bác sĩ ghi kết luận và khả năng tiếp tục

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** JWT DRIVER_ESCORT và assignment crewDuty=VETERINARIAN với chứng chỉ/qualification hợp lệ; không tạo role VET mới. NOT_FIT/NEEDS_REVIEW chặn phần liên quan. FIT giải phóng chốt chặn y tế chuyên môn nhưng không tự resume các blocker sự cố khác; kết luận mới append-only.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "healthLogId": "HEALTH_001",
  "examinedAt": "2026-11-10 06:00",
  "conclusion": "Đã kiểm tra tại hiện trường",
  "transportFitness": "FIT",
  "instructions": "Đã kiểm tra tại hiện trường",
  "evidenceFileIds": [],
  "incidentId": null
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "ASSESSMENT_001",
    "entry": {
      "expectedVersion": 10,
      "healthLogId": "HEALTH_001",
      "examinedAt": "2026-11-10 06:00",
      "conclusion": "Đã kiểm tra tại hiện trường",
      "transportFitness": "FIT",
      "instructions": "Đã kiểm tra tại hiện trường",
      "evidenceFileIds": [],
      "incidentId": null
    },
    "recordedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": "VETERINARIAN"
    },
    "recordedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, VETERINARIAN_REQUIRED, NOT_ASSIGNED_LEG, EVIDENCE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: VETERINARIAN_REQUIRED",
  "errorCode": "VETERINARIAN_REQUIRED",
  "data": null,
  "blockers": [
    {
      "code": "VETERINARIAN_REQUIRED",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J26 — GET /trips/{tripId}/execution/vet-assessments

Đọc kết luận chuyên môn và hướng dẫn

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Chỉ ngựa/chuyến trong scope; giữ mọi lần đánh giá.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J27 — GET /trips/{tripId}/execution/alerts

Cảnh báo trễ mốc và chăm sóc đến hạn

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Ngưỡng theo policy snapshot; chưa cấu hình thì không sinh cảnh báo định kỳ giả. Cảnh báo mốc cho Driver phụ trách và Coordinator, không tự complete hoặc escalate mọi cảnh báo lên Manager.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J28 — POST /coordinator/trips/{tripId}/alerts/{alertId}/acknowledge

Ghi đã tiếp nhận cảnh báo

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Acknowledged không bằng resolved và không hoàn thành mốc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `alertId` | True | `{"type":"string","example":"ALERTID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

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
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J29 — POST /coordinator/trips/{tripId}/contact-logs

Ghi kết quả liên hệ nhân sự không phản hồi

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Người được liên hệ thuộc assignment Trip. Chỉ ghi kết quả đã liên hệ ngoài hệ thống; không tự gọi điện/gửi tin nhắn và không hoàn tất mốc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "contactedUserId": "USER_001",
  "contactedAt": "2026-11-10 06:00",
  "channel": "PHONE",
  "result": "Đã kiểm tra tại hiện trường"
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 11,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "recordId": "MILESTONE_001",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_TRANSIT",
      "phase": "IN_PROGRESS",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J30 — POST /trips/{tripId}/execution/files

Upload bằng chứng hành trình thật

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** FormData file bytes + purpose, horseId bắt buộc với HEALTH. HEALTH/EXPENSE chỉ JPEG/PNG, mục khác PDF/JPEG/PNG <=10 MiB. Kiểm nội dung/MIME/quét và scope; chưa gắn file không tự hoàn tất mốc. Upload độc lập không đổi executionVersion.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Multipart:** `file` bytes thật, `purpose`, `horseId` nếu HEALTH; tối đa 10 MiB. HEALTH/EXPENSE chỉ JPEG/PNG. Không đặt Content-Type thủ công, trình duyệt tạo boundary. Không gửi JSON/base64/object URL.

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "EVIDENCE_001",
    "tripId": "TRIP_001",
    "filename": "anh-kiem-tra.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 2048,
    "purpose": "MILESTONE",
    "uploadedAt": "2026-11-10 06:00"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 413:** FILE_TOO_LARGE; schema Error và JSON đầy đủ trong OpenAPI.

**Response 415:** UNSUPPORTED_MEDIA_TYPE; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J31 — GET /trips/{tripId}/execution/files/{fileId}

Tải file vận hành có kiểm quyền

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Kiểm Trip, assignment, file thực và metadata; không nhận URL tùy ý. Binary thật, JSON lỗi khi thất bại.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| path | `fileId` | True | `{"type":"string","example":"FILEID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200:** binary với MIME file đã lưu; Content-Disposition an toàn, Cache-Control private, no-store. Lỗi trả JSON theo status.

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J32 — GET /customer/requests/{requestId}/tracking

Khách xem hành trình đơn của mình

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Projection đã lọc nội dung nội bộ, chỉ ngựa/đơn của JWT. Có ETA hiện hành/đề xuất riêng và bản đồ mốc đã xác nhận; không lộ booking nội bộ, chi phí phát sinh hoặc hồ sơ nhân sự.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type":"string","example":"REQUEST_001","pattern":"^REQUEST_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "serverTime": "2026-11-10 06:00",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "READY_TO_DEPART",
      "requestStatus": "SCHEDULED",
      "phase": "AWAITING_DEPARTURE",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 06:00",
        "deliveryDeadline": "2026-11-10 06:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "milestones": [
      {
        "id": "MILESTONE_001",
        "leg": "road",
        "kind": "DEPARTED",
        "label": "Đã kiểm tra tại hiện trường",
        "plannedAt": "2026-11-10 06:00",
        "occurredAt": null,
        "recordedAt": null,
        "recordedBy": null,
        "status": "PENDING",
        "note": "",
        "revision": 1
      }
    ],
    "horses": [
      {
        "horseId": "HORSE_001",
        "name": "Bạch Long",
        "microchip": "704123456789012",
        "careInstructions": ""
      }
    ],
    "pickup": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "delivery": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "map": {
      "routeSource": "APPROVED_PLAN",
      "locationSource": "CONFIRMED_MILESTONE",
      "lastConfirmedMilestoneId": null,
      "markerGeo": null,
      "isGps": false,
      "routePoints": []
    },
    "health": [],
    "customerNotice": ""
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J33 — GET /customer/requests/{requestId}/health-logs

Khách xem chăm sóc, chỉ số, ảnh và nhận xét

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Chỉ ngựa thuộc đơn, gồm kết luận/hướng dẫn và người ghi/thời điểm được chia sẻ; giữ amendment. Không mutation.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type":"string","example":"REQUEST_001","pattern":"^REQUEST_\\d{3,}$","maxLength":50}` |
| query | `horseId` | False | `{"type":"string","example":"HORSE_001","pattern":"^HORSE_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J34 — GET /customer/requests/{requestId}/tracking-files/{fileId}

Khách tải ảnh/bằng chứng được chia sẻ

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Kiểm ownership Request, ngựa và visibility của từng file; không suy quyền từ biết fileId hoặc URL. Không tự chia sẻ file AIR/checkpoint nội bộ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type":"string","example":"REQUEST_001","pattern":"^REQUEST_\\d{3,}$","maxLength":50}` |
| path | `fileId` | True | `{"type":"string","example":"FILEID_001","minLength":1,"maxLength":100,"pattern":"^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200:** binary với MIME file đã lưu; Content-Disposition an toàn, Cache-Control private, no-store. Lỗi trả JSON theo status.

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J35 — GET /manager/trips/{tripId}/execution

Manager giám sát vận hành

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Cùng read model J03 trong scope quản lý, không có quyền hoàn tất mốc thay tài xế.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "executionVersion": 10,
      "approvedPlanVersion": 1,
      "assignmentVersion": 1
    },
    "serverTime": "2026-11-10 06:00",
    "trip": {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "mode": "ROAD",
      "tripStatus": "READY_TO_DEPART",
      "requestStatus": "SCHEDULED",
      "phase": "AWAITING_DEPARTURE",
      "lastMilestoneId": null,
      "eta": {
        "currentEta": "2026-11-10 18:00",
        "deliveryDeadline": "2026-11-11 18:00",
        "pendingProposalId": null,
        "proposedEta": null,
        "version": 1
      }
    },
    "horses": [
      {
        "horseId": "HORSE_001",
        "name": "Bạch Long",
        "microchip": "704123456789012",
        "careInstructions": ""
      }
    ],
    "pickup": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "delivery": {
      "name": "Đã kiểm tra tại hiện trường",
      "address": "Đã kiểm tra tại hiện trường",
      "country": "VN",
      "geo": null
    },
    "flight": null,
    "legs": [
      {
        "key": "road",
        "mode": "ROAD",
        "status": "PENDING",
        "assignedUserIds": [
          "USER_011",
          "USER_012",
          "USER_013"
        ],
        "crew": [
          {
            "userId": "USER_011",
            "name": "Nguyễn Văn An",
            "duty": "MAIN_DRIVER"
          },
          {
            "userId": "USER_012",
            "name": "Trần Văn Bình",
            "duty": "CO_DRIVER"
          },
          {
            "userId": "USER_013",
            "name": "Lê Văn Cường",
            "duty": "VETERINARIAN"
          }
        ],
        "vehicleId": "VEHICLE_001",
        "vehicle": {
          "vehicleId": "VEHICLE_001",
          "plateNumber": "51B-888.99",
          "type": "Xe chuyên dụng 4 khoang điều hòa",
          "capacityStalls": 4,
          "heightM": 3.8,
          "grossWeightTons": 8.5
        },
        "from": "Điểm nhận ngựa",
        "to": "Điểm giao cuối",
        "milestoneIds": [
          "MILESTONE_001",
          "MILESTONE_002"
        ]
      }
    ],
    "milestones": [
      {
        "id": "MILESTONE_001",
        "leg": "road",
        "kind": "DEPARTED",
        "sequence": 1,
        "label": "Xuất phát đường bộ",
        "status": "PENDING",
        "plannedAt": "2026-11-10 06:00",
        "occurredAt": null,
        "recordedAt": null,
        "recordedBy": null,
        "revision": 1,
        "note": "",
        "evidenceFileIds": [],
        "geo": null,
        "requiresHealthCheck": false,
        "actions": {
          "canComplete": true,
          "canRequestCorrection": false,
          "canRecordHealth": false,
          "canProposeEta": false,
          "blockers": []
        }
      },
      {
        "id": "MILESTONE_002",
        "leg": "road",
        "kind": "FINAL_ARRIVED",
        "sequence": 2,
        "label": "Đến điểm giao cuối",
        "status": "PENDING",
        "plannedAt": "2026-11-10 18:00",
        "occurredAt": null,
        "recordedAt": null,
        "recordedBy": null,
        "revision": 1,
        "note": "",
        "evidenceFileIds": [],
        "geo": null,
        "requiresHealthCheck": false,
        "actions": {
          "canComplete": false,
          "canRequestCorrection": false,
          "canRecordHealth": false,
          "canProposeEta": false,
          "blockers": []
        }
      }
    ],
    "map": {
      "routeSource": "APPROVED_PLAN",
      "locationSource": "CONFIRMED_MILESTONE",
      "lastConfirmedMilestoneId": null,
      "markerGeo": null,
      "isGps": false,
      "routePoints": []
    },
    "policy": {
      "version": 1,
      "lateMilestoneMinutes": null,
      "healthIntervalMinutes": null,
      "minimumHealthPhotos": null,
      "configured": false,
      "note": "Chưa chốt ngưỡng; không tự gán mặc định"
    },
    "blockers": [],
    "handoverAvailable": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J36 — POST /driver/trips/{tripId}/expenses

Ghi nhận chi phí phát sinh trên đường

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** Tổ xe ghi nhận chi phí thực tế (vé BOT, cỏ/nước, thuốc khẩn cấp) kèm ảnh biên lai/hóa đơn. Không tự ý sửa giá cước hợp đồng của khách hàng. Dữ liệu được chuyển Flow 6 đối soát hoàn ứng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |
| header | `Idempotency-Key` | True | `{"type":"string","example":"f141a4d2-3221-4a68-9b0e-1bac88cc1f0a","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "category": "TOLL_FEE",
  "amountVnd": 150000,
  "occurredAt": "2026-11-10 06:00",
  "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
  "milestoneId": null,
  "receiptFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "EXPENSE_001",
    "tripId": "TRIP_001",
    "entry": {
      "expectedVersion": 10,
      "category": "TOLL_FEE",
      "amountVnd": 150000,
      "occurredAt": "2026-11-10 06:00",
      "reason": "Giờ thực tế khác thời điểm nhập ban đầu",
      "milestoneId": null,
      "receiptFileIds": []
    },
    "recordedBy": {
      "userId": "USER_011",
      "name": "Nguyễn Văn An",
      "role": "DRIVER_ESCORT",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 06:00",
    "status": "RECORDED"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID, NOT_ASSIGNED_LEG, EVIDENCE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: NOT_ASSIGNED_LEG",
  "errorCode": "NOT_ASSIGNED_LEG",
  "data": null,
  "blockers": [
    {
      "code": "NOT_ASSIGNED_LEG",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```

## F4-J37 — GET /trips/{tripId}/execution/expenses

Danh sách chi phí phát sinh chuyến đi

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Đọc danh sách chi phí phát sinh thực tế do tổ xe ghi nhận trong hành trình để phục vụ đối soát hoàn ứng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type":"string","example":"TRIP_001","pattern":"^TRIP_\\d{3,}$","maxLength":50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và JSON đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và JSON đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, TRIP_STATE_INVALID; schema Error và JSON đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và JSON đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và JSON đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và JSON đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_STATE_INVALID",
  "errorCode": "TRIP_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_STATE_INVALID",
      "field": "execution",
      "message": "Tải lại và kiểm tra điều kiện liên quan"
    }
  ]
}
```
