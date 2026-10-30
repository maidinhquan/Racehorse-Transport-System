# Flow 5 — JSON từng API

**1.0.0 — 29/10/2026. Contract đích; chưa triển khai backend/database hoặc nối frontend.**

[Nghiệp vụ](FLOW5.md) · [OpenAPI](flow5.openapi.json) · [Kịch bản](flow5.examples.json).

Base `/api`; Bearer JWT, Accept application/json. JSON có Content-Type application/json; GET không body. Mutation có Idempotency-Key UUID, riêng J15 validate read-only không cần. List data array. Timestamp địa phương Asia/Ho_Chi_Minh, tiền nguyên VND. Mẫu độc lập, không chạy nối tiếp với cùng version; lấy ID/version từ server thật.

| Mã | Method | Endpoint | Chức năng |
|---|---|---|---|
| F5-J01 | GET | `/master/flow5-capabilities` | Capability xử lý sự cố |
| F5-J02 | GET | `/incidents` | Danh sách sự cố theo quyền |
| F5-J03 | POST | `/incidents` | Báo sự cố và ghi nhận chăm sóc ban đầu |
| F5-J04 | GET | `/incidents/{incidentId}` | Chi tiết sự cố, nhiệm vụ và hành động |
| F5-J05 | GET | `/trips/{tripId}/incidents` | Sự cố trong chi tiết chuyến |
| F5-J06 | POST | `/coordinator/incidents/{incidentId}/accept` | Coordinator tiếp nhận sự cố |
| F5-J07 | PUT | `/coordinator/incidents/{incidentId}/impact-assessment` | Xác định chính xác phần bị ảnh hưởng |
| F5-J08 | POST | `/incidents/{incidentId}/updates` | Ghi hiện trường, tiến độ hoặc chăm sóc khẩn |
| F5-J09 | GET | `/incidents/{incidentId}/updates` | Đọc diễn biến sự cố |
| F5-J10 | POST | `/coordinator/incidents/{incidentId}/tasks` | Giao công việc khắc phục song song |
| F5-J11 | GET | `/incidents/{incidentId}/tasks` | Danh sách công việc và người phụ trách |
| F5-J12 | POST | `/incidents/{incidentId}/tasks/{taskId}/progress` | Người được giao cập nhật kết quả công việc |
| F5-J13 | GET | `/coordinator/incidents/{incidentId}/recovery-context` | Context phương án khôi phục và dependency |
| F5-J14 | PUT | `/coordinator/incidents/{incidentId}/recovery-draft` | Lưu nháp phương án khôi phục |
| F5-J15 | POST | `/coordinator/incidents/{incidentId}/recovery/validate` | Kiểm tra phương án không ghi trạng thái |
| F5-J16 | POST | `/coordinator/incidents/{incidentId}/recovery/submit` | Gửi phương án và giữ nguồn lực nguyên tử |
| F5-J17 | POST | `/manager/incidents/{incidentId}/recovery/decision` | Manager duyệt hoặc trả phương án |
| F5-J18 | POST | `/coordinator/incidents/{incidentId}/recovery/revisions` | Mở bản sửa phương án, giữ lịch sử approved |
| F5-J19 | GET | `/incidents/{incidentId}/history` | Lịch sử quyết định, phiên bản và áp dụng |
| F5-J20 | GET | `/coordinator/incidents/{incidentId}/resource-options` | Tìm xe và nhân sự thay thế phù hợp |
| F5-J21 | POST | `/specialist/incidents/{incidentId}/compliance-reviews` | Xác nhận hồ sơ hoặc bảo hiểm bị ảnh hưởng |
| F5-J22 | POST | `/driver/incidents/{incidentId}/vet-assessments` | Bác sĩ xác nhận sức khỏe và khả năng tiếp tục |
| F5-J23 | POST | `/coordinator/incidents/{incidentId}/external-actions` | Ghi xác nhận đối tác, booking và nguồn lực thật |
| F5-J24 | POST | `/coordinator/incidents/{incidentId}/recovery/apply` | Áp dụng phương án khôi phục đã đủ bằng chứng |
| F5-J25 | GET | `/incidents/{incidentId}/continuation-readiness` | Kiểm tra điều kiện tiếp tục và điều kiện đóng |
| F5-J26 | POST | `/coordinator/incidents/{incidentId}/continue` | Cho phép tiếp tục đúng phần đủ điều kiện |
| F5-J27 | POST | `/coordinator/incidents/{incidentId}/resolve` | Coordinator ghi kết quả và đóng sự cố |
| F5-J28 | POST | `/coordinator/incidents/{incidentId}/reopen` | Mở lại sự cố có vấn đề chưa xử lý |
| F5-J29 | GET | `/customer/requests/{requestId}/incidents` | Khách xem sự cố và ảnh hưởng được thông báo |
| F5-J30 | GET | `/customer/requests/{requestId}/incidents/{incidentId}` | Khách đọc chi tiết sự cố được chia sẻ |
| F5-J31 | POST | `/manager/incidents/{incidentId}/communications` | Manager thông báo hoặc đề nghị thống nhất với khách |
| F5-J32 | POST | `/customer/requests/{requestId}/incidents/{incidentId}/communications/{messageId}/reply` | Khách đồng ý hoặc từ chối nội dung cụ thể |
| F5-J33 | POST | `/manager/incidents/{incidentId}/customer-agreements/external` | Ghi thỏa thuận ngoài hệ thống có bằng chứng |
| F5-J34 | POST | `/trips/{tripId}/incident-files` | Upload bằng chứng trước hoặc sau báo sự cố |
| F5-J35 | GET | `/incidents/{incidentId}/files/{fileId}` | Tải bằng chứng sự cố có kiểm quyền |
| F5-J36 | GET | `/customer/requests/{requestId}/incidents/{incidentId}/files/{fileId}` | Khách tải bằng chứng được chia sẻ |
| F5-J37 | POST | `/manager/incidents/{incidentId}/termination-proposals` | Đề xuất hướng kết thúc khi không thể tiếp tục |
| F5-J38 | POST | `/customer/requests/{requestId}/incidents/{incidentId}/termination-proposals/{proposalId}/reply` | Khách phản hồi hướng kết thúc được đề xuất |
| F5-J39 | POST | `/manager/incidents/{incidentId}/termination-proposals/{proposalId}/refer` | Chuyển hồ sơ kết thúc sớm sang xử lý nghĩa vụ |
| F5-J40 | GET | `/incidents/{incidentId}/termination-proposals` | Đọc lịch sử đề xuất kết thúc và handoff |
| F5-J41 | GET | `/customer/requests/{requestId}/incidents/{incidentId}/termination-proposals` | Khách đọc nội dung kết thúc cần phản hồi |
| F5-J42 | POST | `/manager/incidents/{incidentId}/files/{fileId}/share` | Cho phép chia sẻ bằng chứng với khách |
| F5-J43 | POST | `/coordinator/incidents/{incidentId}/recovery/withdraw` | Rút phương án đang chờ duyệt |

## F5-J01 — GET /master/flow5-capabilities

Capability xử lý sự cố

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST, CUSTOMER

**Điều kiện và ảnh hưởng:** Flags thật do server; chưa persistence/integration không báo đã hỗ trợ. Không lộ cấu hình nội bộ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "version": "1.0.0",
    "implementationStatus": "DESIGNED_NOT_IMPLEMENTED",
    "persistenceAvailable": false,
    "filesAvailable": false,
    "notificationsAvailable": false,
    "recoveryApplyAvailable": false,
    "terminationSettlementAvailable": false,
    "currency": "VND",
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J02 — GET /incidents

Danh sách sự cố theo quyền

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Manager scope quản lý, Coordinator/Specialist chuyến được giao, Driver assignment liên quan. data array, lọc tại server trước trả.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| query | `status` | False | `{"type": "string", "example": "REPORTED", "enum": ["REPORTED", "IN_PROGRESS", "RESOLVED"]}` |
| query | `tripId` | False | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J03 — POST /incidents

Báo sự cố và ghi nhận chăm sóc ban đầu

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Trip thật đã kích hoạt/được giao, chặng/ngựa/mốc trong Trip. REPORTED và safety blocker tối thiểu do server đặt ngay, không đợi Coordinator tiếp nhận. Cho báo thiếu ảnh/incident file khi khẩn; file có thể upload theo Trip trước rồi liên kết. Không nhận severity/actor/tripStatus từ client.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "tripId": "TRIP_001",
  "expectedExecutionVersion": 11,
  "category": "VEHICLE_RESOURCE",
  "scope": {
    "leg": "road",
    "horseIds": [],
    "milestoneIds": []
  },
  "occurredAt": "2026-11-10 08:00",
  "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "immediateCare": "",
  "evidenceFileIds": [],
  "healthLogIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": true,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, TRIP_NOT_ACTIVE, SCOPE_MISMATCH; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TRIP_NOT_ACTIVE",
  "errorCode": "TRIP_NOT_ACTIVE",
  "data": null,
  "blockers": [
    {
      "code": "TRIP_NOT_ACTIVE",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J04 — GET /incidents/{incidentId}

Chi tiết sự cố, nhiệm vụ và hành động

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Cùng aggregate dùng chung, actions theo actor; không copy một sự cố cho từng role.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 10,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": true,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "impacts": [
      {
        "area": "RESOURCES",
        "status": "AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [
          "MILESTONE_002"
        ],
        "blockedHorseIds": []
      },
      {
        "area": "SCHEDULE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "BOOKING",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "DOCUMENTS",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "INSURANCE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "HEALTH",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "DELIVERY_DEADLINE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "INTERNAL_COST",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      }
    ],
    "tasks": [],
    "recovery": null,
    "readiness": {
      "binding": {
        "incidentVersion": 10,
        "recoveryVersion": null,
        "approvedPlanVersion": 1,
        "executionVersion": 11,
        "assignmentVersion": 1
      },
      "readinessVersion": "CHECK_001",
      "serverTime": "2026-11-10 08:00",
      "checks": [],
      "blockers": [],
      "canApplyRecovery": false,
      "canContinue": false,
      "canResolve": false,
      "blockedScopes": [
        {
          "leg": "road",
          "horseIds": [],
          "milestoneIds": []
        }
      ]
    },
    "complianceReviews": [],
    "vetAssessments": [],
    "externalActions": [],
    "actions": {
      "canAccept": false,
      "canAssessImpact": false,
      "canSubmitRecovery": false,
      "canDecideRecovery": false,
      "canApplyRecovery": false,
      "canContinue": false,
      "canResolve": false,
      "blockers": []
    },
    "evidenceFileIds": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J05 — GET /trips/{tripId}/incidents

Sự cố trong chi tiết chuyến

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Cùng nguồn J02/J04; không lẫn complaint Flow 6.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J06 — POST /coordinator/incidents/{incidentId}/accept

Coordinator tiếp nhận sự cố

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** REPORTED → IN_PROGRESS; ghi đầu mối và kế hoạch xử lý ban đầu. Không xóa blocker hoặc hoàn thành Trip.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J07 — PUT /coordinator/incidents/{incidentId}/impact-assessment

Xác định chính xác phần bị ảnh hưởng

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Mỗi area xuất hiện đúng một lần, đủ 8 mục; UNASSESSED vẫn chặn phần liên quan. NOT_AFFECTED có lý do, không thay xác nhận bác sĩ/Specialist. Thay assessment tăng dependency revision, vô hiệu phần kết quả bị ảnh hưởng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "impacts": [
    {
      "area": "RESOURCES",
      "status": "AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [
        "MILESTONE_002"
      ],
      "blockedHorseIds": []
    },
    {
      "area": "SCHEDULE",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "BOOKING",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "DOCUMENTS",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "INSURANCE",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "HEALTH",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "DELIVERY_DEADLINE",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    },
    {
      "area": "INTERNAL_COST",
      "status": "NOT_AFFECTED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "blockedMilestoneIds": [],
      "blockedHorseIds": []
    }
  ],
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, IMPACT_ASSESSMENT_INCOMPLETE, SPECIALIST_REVIEW_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: IMPACT_ASSESSMENT_INCOMPLETE",
  "errorCode": "IMPACT_ASSESSMENT_INCOMPLETE",
  "data": null,
  "blockers": [
    {
      "code": "IMPACT_ASSESSMENT_INCOMPLETE",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J08 — POST /incidents/{incidentId}/updates

Ghi hiện trường, tiến độ hoặc chăm sóc khẩn

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Nhân sự đúng nhiệm vụ/chuyến, append-only. EMERGENCY_CARE không chờ duyệt plan/cost; không tự xác nhận FIT hoặc gỡ safety gate. Nội dung nội bộ, khách chỉ nhận thông tin đã chia sẻ qua Manager.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "occurredAt": "2026-11-10 08:00",
  "kind": "FIELD_REPORT",
  "message": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "evidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "UPDATE_001",
    "kind": "FIELD_REPORT",
    "occurredAt": "2026-11-10 08:00",
    "recordedAt": "2026-11-10 08:00",
    "actor": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "FLEET_ROUTE_COORDINATOR",
      "crewDuty": null
    },
    "message": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "evidenceFileIds": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J09 — GET /incidents/{incidentId}/updates

Đọc diễn biến sự cố

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Giữ thứ tự recordedAt/ID, không sửa đè bản gốc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J10 — POST /coordinator/incidents/{incidentId}/tasks

Giao công việc khắc phục song song

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Assignee từ nhân sự hợp lệ được giao Trip hoặc task xử lý được ủy quyền có thời hạn. Vai trò phù hợp area; task sức khỏe cần bác sĩ, hồ sơ/bảo hiểm cần Specialist. Không giao công việc cho ID ngoài scope.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "area": "RESOURCES",
  "assigneeUserId": "USER_008",
  "instruction": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn"
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TASK_001",
    "area": "RESOURCES",
    "assignee": {
      "userId": "USER_008",
      "name": "Phạm Hải",
      "role": "FLEET_ROUTE_COORDINATOR",
      "crewDuty": null
    },
    "status": "OPEN",
    "instruction": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "result": null,
    "evidenceFileIds": [],
    "updatedAt": "2026-11-10 08:00"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, INVALID_ASSIGNEE; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INVALID_ASSIGNEE",
  "errorCode": "INVALID_ASSIGNEE",
  "data": null,
  "blockers": [
    {
      "code": "INVALID_ASSIGNEE",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J11 — GET /incidents/{incidentId}/tasks

Danh sách công việc và người phụ trách

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Chỉ task trong scope; người được giao task không mặc nhiên có quyền vận chuyển hoặc hoàn tất milestone.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J12 — POST /incidents/{incidentId}/tasks/{taskId}/progress

Người được giao cập nhật kết quả công việc

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Chỉ assignee cập nhật, DONE cần kết quả/bằng chứng theo checklist. DONE không thay clearance/vet approval/resource confirmation. Nhận nhiệm vụ khắc phục không tự đổi tổ xe.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `taskId` | True | `{"type": "string", "example": "TASKID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "status": "IN_PROGRESS",
  "result": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
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
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, NOT_TASK_ASSIGNEE, EVIDENCE_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: NOT_TASK_ASSIGNEE",
  "errorCode": "NOT_TASK_ASSIGNEE",
  "data": null,
  "blockers": [
    {
      "code": "NOT_TASK_ASSIGNEE",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J13 — GET /coordinator/incidents/{incidentId}/recovery-context

Context phương án khôi phục và dependency

**Role:** FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Snapshot approved plan/execution/assignment, assessment và kết quả còn hợp lệ; không bắt làm lại mọi hồ sơ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 10,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": true,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "impacts": [
      {
        "area": "RESOURCES",
        "status": "AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [
          "MILESTONE_002"
        ],
        "blockedHorseIds": []
      },
      {
        "area": "SCHEDULE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "BOOKING",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "DOCUMENTS",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "INSURANCE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "HEALTH",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "DELIVERY_DEADLINE",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      },
      {
        "area": "INTERNAL_COST",
        "status": "NOT_AFFECTED",
        "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
        "blockedMilestoneIds": [],
        "blockedHorseIds": []
      }
    ],
    "tasks": [],
    "recovery": null,
    "readiness": {
      "binding": {
        "incidentVersion": 10,
        "recoveryVersion": null,
        "approvedPlanVersion": 1,
        "executionVersion": 11,
        "assignmentVersion": 1
      },
      "readinessVersion": "CHECK_001",
      "serverTime": "2026-11-10 08:00",
      "checks": [],
      "blockers": [],
      "canApplyRecovery": false,
      "canContinue": false,
      "canResolve": false,
      "blockedScopes": [
        {
          "leg": "road",
          "horseIds": [],
          "milestoneIds": []
        }
      ]
    },
    "complianceReviews": [],
    "vetAssessments": [],
    "externalActions": [],
    "actions": {
      "canAccept": false,
      "canAssessImpact": false,
      "canSubmitRecovery": false,
      "canDecideRecovery": false,
      "canApplyRecovery": false,
      "canContinue": false,
      "canResolve": false,
      "blockers": []
    },
    "evidenceFileIds": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J14 — PUT /coordinator/incidents/{incidentId}/recovery-draft

Lưu nháp phương án khôi phục

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Chỉ DRAFT/RETURNED, baseline phải hiện hành. Draft không giữ nguồn lực, không thay approved plan/ETA/booking. Không đổi địa chỉ giao; customerAdditionalChargeVnd luôn 0.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "baseApprovedPlanVersion": 1,
  "baseExecutionVersion": 11,
  "baseAssignmentVersion": 1,
  "content": {
    "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
    "scope": {
      "leg": "road",
      "horseIds": [],
      "milestoneIds": []
    },
    "resources": [],
    "schedule": [],
    "flight": null,
    "proposedEta": null,
    "internalCostVnd": 0,
    "customerAdditionalChargeVnd": 0,
    "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "evidenceFileIds": []
  }
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECOVERY_001",
    "version": 1,
    "status": "DRAFT",
    "content": {
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "resources": [],
      "schedule": [],
      "flight": null,
      "proposedEta": null,
      "internalCostVnd": 0,
      "customerAdditionalChargeVnd": 0,
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "evidenceFileIds": []
    },
    "requiresManager": false,
    "approvalReasons": [],
    "baseApprovedPlanVersion": 1,
    "baseExecutionVersion": 11,
    "baseAssignmentVersion": 1,
    "approvedBy": null,
    "approvedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, BASELINE_CHANGED, RECOVERY_LOCKED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: BASELINE_CHANGED",
  "errorCode": "BASELINE_CHANGED",
  "data": null,
  "blockers": [
    {
      "code": "BASELINE_CHANGED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J15 — POST /coordinator/incidents/{incidentId}/recovery/validate

Kiểm tra phương án không ghi trạng thái

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Read-only, không giữ xe/người, không gửi duyệt. Recheck dependency ngoài hệ thống/capability; không giả success khi provider chưa hỗ trợ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 10,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "readinessVersion": "CHECK_001",
    "serverTime": "2026-11-10 08:00",
    "checks": [],
    "blockers": [],
    "canApplyRecovery": false,
    "canContinue": false,
    "canResolve": false,
    "blockedScopes": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J16 — POST /coordinator/incidents/{incidentId}/recovery/submit

Gửi phương án và giữ nguồn lực nguyên tử

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Server tính requiresManager: thay approved resources/route/schedule/flight, chi phí nội bộ hoặc thỏa thuận khách đều cần Manager. Chỉ chăm sóc trong approved plan, không tác động thì tự APPROVED với approvedBy=null và history SYSTEM. Giữ nguồn lực thay thế đủ bộ, không nhả nguồn cũ trước thực hiện.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECOVERY_001",
    "version": 2,
    "status": "PENDING_APPROVAL",
    "content": {
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "resources": [
        {
          "leg": "road",
          "oldVehicleId": "VEHICLE_001",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "mainDriverId": "USER_011",
            "coDriverId": "USER_012",
            "veterinarianId": "USER_013"
          },
          "availableFrom": "2026-11-10 09:00",
          "availableUntil": "2026-11-10 20:00",
          "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
        }
      ],
      "schedule": [],
      "flight": null,
      "proposedEta": null,
      "internalCostVnd": 0,
      "customerAdditionalChargeVnd": 0,
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "evidenceFileIds": []
    },
    "requiresManager": true,
    "approvalReasons": [
      "Thay nguồn lực đã duyệt"
    ],
    "baseApprovedPlanVersion": 1,
    "baseExecutionVersion": 11,
    "baseAssignmentVersion": 1,
    "approvedBy": null,
    "approvedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RESOURCE_CONFLICT, INVALID_CREW, BASELINE_CHANGED, COMPLIANCE_PRECHECK_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RESOURCE_CONFLICT",
  "errorCode": "RESOURCE_CONFLICT",
  "data": null,
  "blockers": [
    {
      "code": "RESOURCE_CONFLICT",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J17 — POST /manager/incidents/{incidentId}/recovery/decision

Manager duyệt hoặc trả phương án

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Chỉ PENDING_APPROVAL, đúng version/budget/scope; APPROVE chưa áp dụng thực tế hoặc resume. RETURN giải phóng hold draft, giữ nguồn cũ; lưu lý do. Chi phí sự cố không thu thêm Customer.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1,
  "decision": "APPROVE",
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECOVERY_001",
    "version": 3,
    "status": "APPROVED",
    "content": {
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "resources": [
        {
          "leg": "road",
          "oldVehicleId": "VEHICLE_001",
          "vehicleId": "VEHICLE_002",
          "crew": {
            "mainDriverId": "USER_011",
            "coDriverId": "USER_012",
            "veterinarianId": "USER_013"
          },
          "availableFrom": "2026-11-10 09:00",
          "availableUntil": "2026-11-10 20:00",
          "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
        }
      ],
      "schedule": [],
      "flight": null,
      "proposedEta": null,
      "internalCostVnd": 0,
      "customerAdditionalChargeVnd": 0,
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "evidenceFileIds": []
    },
    "requiresManager": true,
    "approvalReasons": [],
    "baseApprovedPlanVersion": 1,
    "baseExecutionVersion": 11,
    "baseAssignmentVersion": 1,
    "approvedBy": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "LOGISTICS_MANAGER",
      "crewDuty": null
    },
    "approvedAt": "2026-11-10 09:00"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_NOT_PENDING, RESOURCE_CONFLICT, BASELINE_CHANGED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_NOT_PENDING",
  "errorCode": "RECOVERY_NOT_PENDING",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_NOT_PENDING",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J18 — POST /coordinator/incidents/{incidentId}/recovery/revisions

Mở bản sửa phương án, giữ lịch sử approved

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Giữ approved cũ, tạo DRAFT version mới; không overwrite booking/cost/consent đã duyệt. Submission pending phải được rút qua endpoint withdraw; recheck phần dependency thay đổi.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECOVERY_001",
    "version": 1,
    "status": "DRAFT",
    "content": {
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "resources": [],
      "schedule": [],
      "flight": null,
      "proposedEta": null,
      "internalCostVnd": 0,
      "customerAdditionalChargeVnd": 0,
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "evidenceFileIds": []
    },
    "requiresManager": false,
    "approvalReasons": [],
    "baseApprovedPlanVersion": 1,
    "baseExecutionVersion": 11,
    "baseAssignmentVersion": 1,
    "approvedBy": null,
    "approvedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_PENDING; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_PENDING",
  "errorCode": "RECOVERY_PENDING",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_PENDING",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J19 — GET /incidents/{incidentId}/history

Lịch sử quyết định, phiên bản và áp dụng

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Append-only trước/sau, actor/time/reason; systemActor=true khi tự xử lý, không giả Manager.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J20 — GET /coordinator/incidents/{incidentId}/resource-options

Tìm xe và nhân sự thay thế phù hợp

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Đọc từ nguồn Flow 3: sức chứa, quốc gia, đường xe tải/access, qualification, thời gian còn lại. AIR không dùng lại người/xe giữa hai ROAD. Danh sách không phải hold.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| query | `leg` | False | `{"type": "string", "example": "road", "enum": ["road", "outbound", "air", "inbound"]}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J21 — POST /specialist/incidents/{incidentId}/compliance-reviews

Xác nhận hồ sơ hoặc bảo hiểm bị ảnh hưởng

**Role:** TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Specialist được giao; gắn recoveryVersion và dependency document/insurance hiện hành. Không tự đòi gia hạn mọi giấy: giả định Flow3 giấy còn hiệu lực suốt chuyến, chỉ kiểm applicability khi thay điều kiện. SATISFIED cần nguồn/bằng chứng thật; NOT_AFFECTED có lý do.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1,
  "area": "DOCUMENTS",
  "result": "SATISFIED",
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
  "sourceRecordIds": [],
  "evidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECORD_001",
    "actor": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "TRANSPORT_SPECIALIST",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 08:00",
    "content": {
      "recoveryVersion": 1,
      "area": "DOCUMENTS",
      "result": "SATISFIED",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "sourceRecordIds": [],
      "evidenceFileIds": []
    },
    "valid": false,
    "invalidatedReason": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_CHANGED, COMPLIANCE_EVIDENCE_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_CHANGED",
  "errorCode": "RECOVERY_CHANGED",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_CHANGED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J22 — POST /driver/incidents/{incidentId}/vet-assessments

Bác sĩ xác nhận sức khỏe và khả năng tiếp tục

**Role:** DRIVER_ESCORT

**Điều kiện và ảnh hưởng:** DRIVER_ESCORT với crewDuty VETERINARIAN và qualification hợp lệ; một nguồn kết luận với Flow4 J25, lưu một record và liên kết incident/health. FIT không tự resume; NOT_FIT/NEEDS_REVIEW giữ block. Không cho Driver thường tự chẩn đoán.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "horseId": "HORSE_001",
  "examinedAt": "2026-11-10 08:00",
  "transportFitness": "FIT",
  "conclusion": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "healthLogIds": [],
  "evidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECORD_001",
    "actor": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "DRIVER_ESCORT",
      "crewDuty": "VETERINARIAN"
    },
    "recordedAt": "2026-11-10 08:00",
    "content": {
      "horseId": "HORSE_001",
      "examinedAt": "2026-11-10 08:00",
      "transportFitness": "FIT",
      "conclusion": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "healthLogIds": [],
      "evidenceFileIds": []
    },
    "valid": false,
    "invalidatedReason": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, VETERINARIAN_REQUIRED, HORSE_OUT_OF_SCOPE; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

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
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J23 — POST /coordinator/incidents/{incidentId}/external-actions

Ghi xác nhận đối tác, booking và nguồn lực thật

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** PARTNER_CONTACT chỉ tiến độ. OLD_BOOKING_CANCELLED cần đối tác xác nhận; NEW_BOOKING_CONFIRMED chỉ sau Manager approved và compliance precheck khả thi, xử lý booking cũ khi bị ảnh hưởng. RESOURCE_CONFIRMED phải đúng bộ đã duyệt. Không gọi hãng hoặc chuyển tiền; reference unique theo đối tác/loại, file thật.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1,
  "kind": "PARTNER_CONTACT",
  "reference": "Đối tác xác nhận số 123",
  "bookingId": null,
  "leg": null,
  "completedAt": "2026-11-10 08:00",
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
  "evidenceFileIds": [
    "EVIDENCE_001"
  ]
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECORD_001",
    "actor": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "FLEET_ROUTE_COORDINATOR",
      "crewDuty": null
    },
    "recordedAt": "2026-11-10 08:00",
    "content": {
      "recoveryVersion": 1,
      "kind": "PARTNER_CONTACT",
      "reference": "Đối tác xác nhận số 123",
      "bookingId": null,
      "leg": null,
      "completedAt": "2026-11-10 08:00",
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "evidenceFileIds": [
        "EVIDENCE_001"
      ]
    },
    "valid": false,
    "invalidatedReason": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_NOT_APPROVED, OLD_BOOKING_ACTIVE, BOOKING_REFERENCE_DUPLICATE, RESOURCE_CONFLICT, COMPLIANCE_PRECHECK_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_NOT_APPROVED",
  "errorCode": "RECOVERY_NOT_APPROVED",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_NOT_APPROVED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J24 — POST /coordinator/incidents/{incidentId}/recovery/apply

Áp dụng phương án khôi phục đã đủ bằng chứng

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Đúng recovery approved + readiness hiện hành. Transaction cập nhật phần tương lai của approved plan/execution, chuyển resource assignments, giữ mốc đã hoàn tất và giá/địa chỉ giao. Không complete mốc, không tự resume. Hủy/cancel booking bên ngoài chỉ là evidence, không rollback cuộc gọi hãng bằng SQL.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": null,
  "readinessVersion": "CHECK_001",
  "scope": {
    "leg": "road",
    "horseIds": [],
    "milestoneIds": []
  },
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_NOT_APPROVED, READINESS_CHANGED, RESOURCE_CONFIRMATION_REQUIRED, COMPLIANCE_REVIEW_REQUIRED, CUSTOMER_AGREEMENT_REQUIRED, OLD_BOOKING_ACTIVE; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_NOT_APPROVED",
  "errorCode": "RECOVERY_NOT_APPROVED",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_NOT_APPROVED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J25 — GET /incidents/{incidentId}/continuation-readiness

Kiểm tra điều kiện tiếp tục và điều kiện đóng

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Server tính riêng canApplyRecovery/canContinue/canResolve từ dependency hiện hành; nhiều incident cùng chặn một phần thì không tự mở sau một incident. Không dùng 0/0 là đạt.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 10,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "readinessVersion": "CHECK_001",
    "serverTime": "2026-11-10 08:00",
    "checks": [],
    "blockers": [],
    "canApplyRecovery": false,
    "canContinue": false,
    "canResolve": false,
    "blockedScopes": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J26 — POST /coordinator/incidents/{incidentId}/continue

Cho phép tiếp tục đúng phần đủ điều kiện

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** Recheck readiness, affected scope, phê duyệt, bằng chứng, health/compliance/booking/assignment và incident khác trong transaction. Chỉ gỡ block của incident này ở scope đã đủ; không DEPARTED/complete milestone, Driver vẫn ghi Flow4. Trip giữ trạng thái gốc.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": null,
  "readinessVersion": "CHECK_001",
  "scope": {
    "leg": "road",
    "horseIds": [],
    "milestoneIds": []
  },
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, READINESS_CHANGED, OTHER_INCIDENT_BLOCKING, VET_CLEARANCE_REQUIRED, COMPLIANCE_REVIEW_REQUIRED, RECOVERY_NOT_APPLIED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: READINESS_CHANGED",
  "errorCode": "READINESS_CHANGED",
  "data": null,
  "blockers": [
    {
      "code": "READINESS_CHANGED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J27 — POST /coordinator/incidents/{incidentId}/resolve

Coordinator ghi kết quả và đóng sự cố

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** IN_PROGRESS → RESOLVED chỉ khi không còn blocker/work/financial handoff bắt buộc của incident; tiếp tục đã xác nhận nếu đang vận chuyển. Nhánh kết thúc sớm chỉ TERMINATION_REFERRED sau hồ sơ được hệ thống tất toán tiếp nhận và trách nhiệm chăm sóc được xác nhận. Không tự hoàn tất Trip/Request, không tự hoàn tiền.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "RESOLVED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": "RECOVERED",
      "resolvedAt": "2026-11-10 10:00"
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, UNRESOLVED_TASKS, INCIDENT_STILL_BLOCKING, SETTLEMENT_HANDOFF_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: UNRESOLVED_TASKS",
  "errorCode": "UNRESOLVED_TASKS",
  "data": null,
  "blockers": [
    {
      "code": "UNRESOLVED_TASKS",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J28 — POST /coordinator/incidents/{incidentId}/reopen

Mở lại sự cố có vấn đề chưa xử lý

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** RESOLVED → IN_PROGRESS, giữ kết quả cũ, recheck và đặt lại blocker liên quan; không mở lại Request/Trip đã đóng/bàn giao. Khi sau bàn giao dùng Flow6 và liên kết lịch sử.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "IN_PROGRESS",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, AFTERCARE_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: AFTERCARE_REQUIRED",
  "errorCode": "AFTERCARE_REQUIRED",
  "data": null,
  "blockers": [
    {
      "code": "AFTERCARE_REQUIRED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J29 — GET /customer/requests/{requestId}/incidents

Khách xem sự cố và ảnh hưởng được thông báo

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Chỉ Request của JWT, thông tin đã chia sẻ, không cost nội bộ hoặc ghi chú nghiệp vụ; complaint Flow6 riêng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J30 — GET /customer/requests/{requestId}/incidents/{incidentId}

Khách đọc chi tiết sự cố được chia sẻ

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Projection riêng gồm communication/ETA/ảnh hưởng đến ngựa và thông tin xử lý công bố; không trả toàn IncidentDetail rồi ẩn trên UI.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "incidentVersion": 10,
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "horseIds": [],
      "customerSummary": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "customerImpact": "",
      "latestDeliveryAt": null,
      "reportedAt": "2026-11-10 08:00",
      "resolvedAt": null,
      "evidenceFileIds": [],
      "communications": []
    }
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J31 — POST /manager/incidents/{incidentId}/communications

Manager thông báo hoặc đề nghị thống nhất với khách

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Manager đầu mối thay lịch/thỏa thuận. NOTICE không phải đồng ý. AGREEMENT_REQUEST gắn recoveryVersion và nội dung bất biến; có thay đổi phải tạo đề nghị mới, không đổi địa chỉ giao.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "type": "NOTICE",
  "recoveryVersion": null,
  "message": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "proposedDeliveryAt": null,
  "evidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "MESSAGE_001",
    "version": 1,
    "type": "NOTICE",
    "message": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "proposedDeliveryAt": null,
    "status": "SENT",
    "sentBy": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "FLEET_ROUTE_COORDINATOR",
      "crewDuty": null
    },
    "sentAt": "2026-11-10 08:00",
    "replyBy": null,
    "repliedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J32 — POST /customer/requests/{requestId}/incidents/{incidentId}/communications/{messageId}/reply

Khách đồng ý hoặc từ chối nội dung cụ thể

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Chỉ AGREEMENT_REQUEST hiện hành và messageVersion đúng; actor chính Customer. ACCEPT không nghiệm thu, không đổi ETA/plan hay tạo tiền đã nhận; từ chối giữ blocker yêu cầu thỏa thuận.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `messageId` | True | `{"type": "string", "example": "MESSAGEID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "messageVersion": 1,
  "decision": "ACCEPT",
  "message": ""
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, MESSAGE_NOT_ACTIONABLE, AGREEMENT_SUPERSEDED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: MESSAGE_NOT_ACTIONABLE",
  "errorCode": "MESSAGE_NOT_ACTIONABLE",
  "data": null,
  "blockers": [
    {
      "code": "MESSAGE_NOT_ACTIONABLE",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J33 — POST /manager/incidents/{incidentId}/customer-agreements/external

Ghi thỏa thuận ngoài hệ thống có bằng chứng

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Đúng message/version hiện hành, reference và tài liệu xác minh theo quy trình; không checkbox giả Customer hay giả user đã bấm. Lưu actor Manager, source EXTERNAL_DOCUMENT. Nếu chưa có quy trình kiểm chứng thì 501.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "messageId": "MESSAGE_001",
  "messageVersion": 1,
  "reference": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "agreedAt": "2026-11-10 08:00",
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
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
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, AGREEMENT_SUPERSEDED, EVIDENCE_REQUIRED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: AGREEMENT_SUPERSEDED",
  "errorCode": "AGREEMENT_SUPERSEDED",
  "data": null,
  "blockers": [
    {
      "code": "AGREEMENT_SUPERSEDED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J34 — POST /trips/{tripId}/incident-files

Upload bằng chứng trước hoặc sau báo sự cố

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Trip/assignment có thật, file PDF/JPEG/PNG <=10 MiB; HEALTH chỉ JPEG/PNG. Metadata/file không tăng incidentVersion, mặc định INTERNAL. Có thể upload trước J03 và gắn sau kiểm scope.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "example": "TRIP_001", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Multipart:** file bytes thật và purpose, PDF/JPEG/PNG <=10 MiB; HEALTH chỉ JPEG/PNG. Không gửi JSON/base64/object URL. Trình duyệt sinh Content-Type boundary.

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "EVIDENCE_001",
    "tripId": "TRIP_001",
    "incidentId": null,
    "filename": "bien-ban-su-co.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 2048,
    "visibility": "INTERNAL",
    "uploadedAt": "2026-11-10 08:00"
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 413:** FILE_TOO_LARGE; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 415:** UNSUPPORTED_MEDIA_TYPE; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J35 — GET /incidents/{incidentId}/files/{fileId}

Tải bằng chứng sự cố có kiểm quyền

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Trip/Incident đúng scope và file thật đã gắn; binary thật, không URL tùy ý.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "example": "FILEID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200:** binary đúng MIME đã lưu, Content-Disposition an toàn, Cache-Control private, no-store; lỗi vẫn JSON.

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J36 — GET /customer/requests/{requestId}/incidents/{incidentId}/files/{fileId}

Khách tải bằng chứng được chia sẻ

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Request của khách và file CUSTOMER được gắn đúng incident; internal luôn 404.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "example": "FILEID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |

**Request body:** Không gửi.

**Response 200:** binary đúng MIME đã lưu, Content-Disposition an toàn, Cache-Control private, no-store; lỗi vẫn JSON.

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J37 — POST /manager/incidents/{incidentId}/termination-proposals

Đề xuất hướng kết thúc khi không thể tiếp tục

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Không tự hủy/hoàn tất, không đưa ngựa quay về hoặc đổi nơi giao. Manager thương lượng hướng xử lý/custody và khoản hoàn; không tự đặt công thức. Một đề xuất mở; có thay đổi phải version mới. proposedRefund không vượt khoản có thể hoàn từ ledger thật.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
  "careAndCustodyPlan": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "proposedRefundVnd": 1000000,
  "basis": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
  "evidenceFileIds": []
}
```

**Response 201 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TERMINATION_001",
    "version": 1,
    "status": "PROPOSED",
    "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
    "careAndCustodyPlan": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "proposedRefundVnd": 1000000,
    "basis": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "proposedBy": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "LOGISTICS_MANAGER",
      "crewDuty": null
    },
    "proposedAt": "2026-11-10 08:00",
    "respondedBy": null,
    "respondedAt": null,
    "settlementCaseId": null,
    "financiallySettled": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, TERMINATION_PROPOSAL_OPEN, INVALID_REFUND_AMOUNT; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: TERMINATION_PROPOSAL_OPEN",
  "errorCode": "TERMINATION_PROPOSAL_OPEN",
  "data": null,
  "blockers": [
    {
      "code": "TERMINATION_PROPOSAL_OPEN",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J38 — POST /customer/requests/{requestId}/incidents/{incidentId}/termination-proposals/{proposalId}/reply

Khách phản hồi hướng kết thúc được đề xuất

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Chính Customer, đúng proposal/version và nội dung; ACCEPT chỉ ghi thỏa thuận, không nghiệm thu/nhận ngựa/hoàn tiền. Không phản hồi hoặc REJECT không coi đồng ý.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `proposalId` | True | `{"type": "string", "example": "PROPOSALID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposalVersion": 1,
  "decision": "ACCEPT",
  "message": ""
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, PROPOSAL_DECIDED, TERMINATION_SUPERSEDED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: PROPOSAL_DECIDED",
  "errorCode": "PROPOSAL_DECIDED",
  "data": null,
  "blockers": [
    {
      "code": "PROPOSAL_DECIDED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J39 — POST /manager/incidents/{incidentId}/termination-proposals/{proposalId}/refer

Chuyển hồ sơ kết thúc sớm sang xử lý nghĩa vụ

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Chỉ ACCEPTED, custody có bằng chứng và readiness hiện hành; tích hợp settlement phải tiếp nhận hồ sơ duy nhất và server trả settlementCaseId. Không coi REFERRED là đã hoàn tiền/đóng Trip. Nếu chưa có pre-handover settlement extension thì 501, giữ chặn; không ép Flow6 normal handover giả.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `proposalId` | True | `{"type": "string", "example": "PROPOSALID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "proposalVersion": 1,
  "readinessVersion": "CHECK_001",
  "custodyEvidenceFileIds": [
    "EVIDENCE_001"
  ],
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "TERMINATION_001",
    "version": 1,
    "status": "REFERRED",
    "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
    "careAndCustodyPlan": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "proposedRefundVnd": 1000000,
    "basis": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
    "proposedBy": {
      "userId": "USER_006",
      "name": "Phạm Hải",
      "role": "LOGISTICS_MANAGER",
      "crewDuty": null
    },
    "proposedAt": "2026-11-10 08:00",
    "respondedBy": null,
    "respondedAt": null,
    "settlementCaseId": "SETTLEMENT_001",
    "financiallySettled": false
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, CUSTOMER_AGREEMENT_REQUIRED, CUSTODY_UNCONFIRMED, READINESS_CHANGED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: CUSTOMER_AGREEMENT_REQUIRED",
  "errorCode": "CUSTOMER_AGREEMENT_REQUIRED",
  "data": null,
  "blockers": [
    {
      "code": "CUSTOMER_AGREEMENT_REQUIRED",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J40 — GET /incidents/{incidentId}/termination-proposals

Đọc lịch sử đề xuất kết thúc và handoff

**Role:** DRIVER_ESCORT, FLEET_ROUTE_COORDINATOR, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST

**Điều kiện và ảnh hưởng:** Nội bộ, các khoản hoàn đề xuất và trạng thái chuyển hồ sơ; không tự tính đã trả tiền.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J41 — GET /customer/requests/{requestId}/incidents/{incidentId}/termination-proposals

Khách đọc nội dung kết thúc cần phản hồi

**Role:** CUSTOMER

**Điều kiện và ảnh hưởng:** Chỉ proposal đã gửi khách, không có chi phí nội bộ; không lộ ghi chú riêng trong reason/basis/custody text.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "example": "REQUEST_001", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |

**Request body:** Không gửi.

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": []
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J42 — POST /manager/incidents/{incidentId}/files/{fileId}/share

Cho phép chia sẻ bằng chứng với khách

**Role:** LOGISTICS_MANAGER

**Điều kiện và ảnh hưởng:** Manager kiểm nội dung được công bố, file đúng incident/Request. Không sửa file bytes; ghi visibility/history. File nhạy cảm cần bản đã loại nội dung riêng, upload mới thay vì đánh dấu tất cả công khai.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "example": "FILEID_001", "minLength": 1, "maxLength": 100, "pattern": "^[A-Za-z0-9_-]+$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại"
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "binding": {
      "incidentVersion": 11,
      "recoveryVersion": null,
      "approvedPlanVersion": 1,
      "executionVersion": 11,
      "assignmentVersion": 1
    },
    "incident": {
      "id": "INCIDENT_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "category": "VEHICLE_RESOURCE",
      "status": "REPORTED",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "description": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "occurredAt": "2026-11-10 08:00",
      "reportedAt": "2026-11-10 08:00",
      "reportedBy": {
        "userId": "USER_006",
        "name": "Phạm Hải",
        "role": "FLEET_ROUTE_COORDINATOR",
        "crewDuty": null
      },
      "coordinatorId": "USER_006",
      "hasBlockingScope": false,
      "resolutionOutcome": null,
      "resolvedAt": null
    },
    "recordId": "RECORD_001",
    "blockers": []
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: INCIDENT_STATE_INVALID",
  "errorCode": "INCIDENT_STATE_INVALID",
  "data": null,
  "blockers": [
    {
      "code": "INCIDENT_STATE_INVALID",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```

## F5-J43 — POST /coordinator/incidents/{incidentId}/recovery/withdraw

Rút phương án đang chờ duyệt

**Role:** FLEET_ROUTE_COORDINATOR

**Điều kiện và ảnh hưởng:** PENDING_APPROVAL → DRAFT, nhả hold draft, giữ nguồn lực/booking approved cũ, không tự hủy booking ngoài hệ thống.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `incidentId` | True | `{"type": "string", "example": "INCIDENT_001", "pattern": "^INCIDENT_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "example": "5141a4d2-3221-4a68-9b0e-1bac88cc1f0a", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

**Request JSON**

```json
{
  "expectedVersion": 10,
  "recoveryVersion": 1
}
```

**Response 200 — mẫu mục tiêu**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "RECOVERY_001",
    "version": 1,
    "status": "DRAFT",
    "content": {
      "reason": "Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại",
      "scope": {
        "leg": "road",
        "horseIds": [],
        "milestoneIds": []
      },
      "resources": [],
      "schedule": [],
      "flight": null,
      "proposedEta": null,
      "internalCostVnd": 0,
      "customerAdditionalChargeVnd": 0,
      "careInstructions": "Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn",
      "evidenceFileIds": []
    },
    "requiresManager": false,
    "approvalReasons": [],
    "baseApprovedPlanVersion": 1,
    "baseExecutionVersion": 11,
    "baseAssignmentVersion": 1,
    "approvedBy": null,
    "approvedAt": null
  }
}
```

**Response 400:** VALIDATION_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 401:** UNAUTHENTICATED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 403:** FORBIDDEN; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 404:** NOT_FOUND; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 409:** STALE_VERSION, IDEMPOTENCY_CONFLICT, INCIDENT_STATE_INVALID, RECOVERY_NOT_PENDING; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 429:** RATE_LIMITED; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 500:** INTERNAL_ERROR; schema Error và mẫu đầy đủ trong OpenAPI.

**Response 501:** FEATURE_NOT_SUPPORTED; schema Error và mẫu đầy đủ trong OpenAPI.

**Mẫu lỗi nghiệp vụ**

```json
{
  "success": false,
  "message": "Không thể thực hiện: RECOVERY_NOT_PENDING",
  "errorCode": "RECOVERY_NOT_PENDING",
  "data": null,
  "blockers": [
    {
      "code": "RECOVERY_NOT_PENDING",
      "field": "incident",
      "message": "Tải lại và xử lý điều kiện liên quan"
    }
  ]
}
```
