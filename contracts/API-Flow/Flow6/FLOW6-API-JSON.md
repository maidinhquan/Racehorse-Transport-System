# Flow 6 — Request/response từng API

**1.1.0 — 29/10/2026. Contract đích; chưa triển khai backend/DB, chưa nối các màn hình cũ.**

> Sinh từ `build_contract.py`. Đọc [FLOW6.md](FLOW6.md) trước khi triển khai. Ví dụ là các snapshot độc lập, không phải chuỗi lệnh chạy liên tiếp; lấy lại version thật từ GET/response.

[OpenAPI](flow6.openapi.json) · [Kịch bản ROAD/AIR và nghiệm thu](flow6.examples.json) · [Review backend/frontend](REVIEW.md).

Base `/api`; Bearer token theo role. Mọi POST cần `Idempotency-Key` UUID; cùng key cho retry cùng payload. JSON dùng envelope, download dùng binary.

| ID | Method | Path | Vai trò | Chức năng |
|---|---|---|---|---|
| F6-J01 | GET | `/master/flow6-policy` | AUTHENTICATED | Đọc policy nghiệm thu và thanh toán |
| F6-J02 | GET | `/manager/aftercare` | LOGISTICS_MANAGER | Danh sách bàn giao, quá hạn và tranh chấp |
| F6-J03 | GET | `/driver/trips/{tripId}/handover` | DRIVER_ESCORT | Hồ sơ bàn giao của chặng được phân công |
| F6-J04 | POST | `/driver/trips/{tripId}/handover-attempts` | DRIVER_ESCORT | Ghi nhận bàn giao chưa thành công |
| F6-J05 | POST | `/driver/trips/{tripId}/handover` | DRIVER_ESCORT | Hoàn thành bàn giao và mở thời hạn nghiệm thu |
| F6-J06 | POST | `/manager/trips/{tripId}/receiver-authorizations` | LOGISTICS_MANAGER | Duyệt người nhận thay thế trước bàn giao |
| F6-J07 | GET | `/customer/requests/{requestId}/aftercare` | CUSTOMER | Đọc hồ sơ Flow 6 và hành động được phép |
| F6-J08 | GET | `/manager/requests/{requestId}/aftercare` | LOGISTICS_MANAGER | Đọc hồ sơ Flow 6 và hành động được phép |
| F6-J09 | GET | `/coordinator/requests/{requestId}/aftercare` | FLEET_ROUTE_COORDINATOR | Theo dõi kết quả bàn giao |
| F6-J10 | POST | `/customer/requests/{requestId}/aftercare/acceptance` | CUSTOMER | Customer xác nhận nghiệm thu cuối cùng |
| F6-J11 | POST | `/customer/requests/{requestId}/aftercare/complaints` | CUSTOMER | Báo vấn đề hoặc từ chối nghiệm thu |
| F6-J12 | POST | `/customer/requests/{requestId}/aftercare/complaints/{complaintId}/messages` | CUSTOMER | Trao đổi và bổ sung bằng chứng khiếu nại |
| F6-J13 | POST | `/manager/requests/{requestId}/aftercare/complaints/{complaintId}/messages` | LOGISTICS_MANAGER | Trao đổi và bổ sung bằng chứng khiếu nại |
| F6-J14 | POST | `/manager/requests/{requestId}/aftercare/complaints/{complaintId}/proposals` | LOGISTICS_MANAGER | Đề xuất giải quyết và khoản giảm |
| F6-J15 | POST | `/customer/requests/{requestId}/aftercare/complaints/{complaintId}/proposals/{proposalId}/decision` | CUSTOMER | Customer đồng ý hoặc từ chối đúng bản đề xuất |
| F6-J16 | POST | `/manager/requests/{requestId}/aftercare/complaints/{complaintId}/resolution/apply` | LOGISTICS_MANAGER | Áp dụng kết quả đã được khách đồng ý |
| F6-J17 | POST | `/manager/requests/{requestId}/aftercare/acceptance-window/extensions` | LOGISTICS_MANAGER | Gia hạn kiểm tra và nghiệm thu |
| F6-J18 | POST | `/manager/requests/{requestId}/aftercare/dispute` | LOGISTICS_MANAGER | Chuyển đơn sang đang giải quyết |
| F6-J19 | POST | `/manager/requests/{requestId}/aftercare/dispute/updates` | LOGISTICS_MANAGER | Ghi diễn biến giải quyết có thể chia sẻ với khách |
| F6-J20 | POST | `/manager/requests/{requestId}/aftercare/dispute/decisions` | LOGISTICS_MANAGER | Ghi nhận kết quả cuối cùng của tranh chấp |
| F6-J21 | POST | `/manager/requests/{requestId}/aftercare/dispute/decisions/{decisionId}/apply` | LOGISTICS_MANAGER | Áp dụng quyết định và hóa đơn trong một transaction |
| F6-J22 | POST | `/customer/requests/{requestId}/aftercare/payment-sessions` | CUSTOMER | Khởi tạo thanh toán số dư VNPay |
| F6-J23 | GET | `/customer/requests/{requestId}/aftercare/payments/{paymentId}` | CUSTOMER | Đọc kết quả thanh toán đã xác minh trên server |
| F6-J24 | POST | `/manager/requests/{requestId}/aftercare/refunds/{refundId}/confirmation` | LOGISTICS_MANAGER | Ghi nhận bằng chứng khoản hoàn đã chuyển thực tế |
| F6-J25 | POST | `/manager/requests/{requestId}/aftercare/closure` | LOGISTICS_MANAGER | Manager đóng đơn sau kiểm tra toàn bộ nghĩa vụ |
| F6-J26 | POST | `/driver/requests/{requestId}/aftercare/files` | DRIVER_ESCORT | Tải bằng chứng thật cho đúng yêu cầu |
| F6-J27 | GET | `/driver/requests/{requestId}/aftercare/files/{fileId}` | DRIVER_ESCORT | Tải bằng chứng có kiểm quyền |
| F6-J28 | POST | `/customer/requests/{requestId}/aftercare/files` | CUSTOMER | Tải bằng chứng thật cho đúng yêu cầu |
| F6-J29 | GET | `/customer/requests/{requestId}/aftercare/files/{fileId}` | CUSTOMER | Tải bằng chứng có kiểm quyền |
| F6-J30 | POST | `/manager/requests/{requestId}/aftercare/files` | LOGISTICS_MANAGER | Tải bằng chứng thật cho đúng yêu cầu |
| F6-J31 | GET | `/manager/requests/{requestId}/aftercare/files/{fileId}` | LOGISTICS_MANAGER | Tải bằng chứng có kiểm quyền |

## F6-J01 — GET /master/flow6-policy

Đọc policy nghiệm thu và thanh toán. Vai trò: **AUTHENTICATED**.

Server trả cấu hình đang bật. Snapshot policy khi bàn giao; cấu hình thay đổi không sửa deadline đã mở.

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "version": 1,
    "defaultAcceptanceHours": "48",
    "allowedAcceptanceHours": [
      "24",
      "48"
    ],
    "paymentHours": 24,
    "maxExtensionHours": 168,
    "acceptanceStatementVersion": 1,
    "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J02 — GET /manager/aftercare

Danh sách bàn giao, quá hạn và tranh chấp. Vai trò: **LOGISTICS_MANAGER**.

Chỉ phạm vi quản lý được cấp quyền. Danh sách rỗng vẫn trả []; không fallback demo.

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": [
    {
      "requestId": "REQUEST_001",
      "tripId": "TRIP_001",
      "customerName": "CLB Ngựa Đua",
      "phase": "AWAITING_ACCEPTANCE",
      "version": 1,
      "acceptanceDueAt": "2026-11-22 10:00",
      "paymentDueAt": null,
      "overdue": false,
      "openComplaints": 0,
      "hasOpenDispute": false,
      "outstanding": 12000000,
      "refundDue": 0
    }
  ]
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J03 — GET /driver/trips/{tripId}/handover

Hồ sơ bàn giao của chặng được phân công. Vai trò: **DRIVER_ESCORT**.

Chỉ tổ xe được giao chặng giao cuối. arrivedAtDestination lấy từ FINAL_ARRIVED đã xác nhận của Flow4, không từ GPS/ETA/giờ dự kiến. canComplete kiểm blocker hiện hành của mọi incident Flow5 liên quan bàn giao. Không trả tài chính, hồ sơ tranh chấp hoặc khách của chuyến khác.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 1,
    "arrivedAtDestination": true,
    "receiver": {
      "name": "Trần Văn Bình",
      "phone": "0901234567",
      "authorization": "REGISTERED",
      "authorizationReference": null
    },
    "horseIds": [
      "HORSE_001"
    ],
    "handover": null,
    "attempts": [],
    "canComplete": true,
    "blockers": []
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J04 — POST /driver/trips/{tripId}/handover-attempts

Ghi nhận bàn giao chưa thành công. Vai trò: **DRIVER_ESCORT**.

Chưa có bàn giao thành công, đã tới điểm giao. Giữ Trip chưa COMPLETED; chưa mở thời hạn nghiệm thu. Thông báo Coordinator và Manager.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "reason": "RECEIVER_ABSENT",
  "description": "Người nhận chưa có mặt tại địa điểm giao.",
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "arrivedAtDestination": true,
    "receiver": {
      "name": "Trần Văn Bình",
      "phone": "0901234567",
      "authorization": "REGISTERED",
      "authorizationReference": null
    },
    "horseIds": [
      "HORSE_001"
    ],
    "handover": null,
    "attempts": [
      {
        "id": "attempt_001",
        "at": "2026-11-20 10:00",
        "actor": {
          "userId": "USER_001",
          "name": "Nguyễn Minh An"
        },
        "reason": "RECEIVER_ABSENT",
        "description": "Người nhận chưa có mặt tại địa điểm giao.",
        "evidenceFileIds": []
      }
    ],
    "canComplete": true,
    "blockers": []
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: HANDOVER_ALREADY_COMPLETED, HANDOVER_NOT_READY, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: HANDOVER_ALREADY_COMPLETED",
  "errorCode": "HANDOVER_ALREADY_COMPLETED",
  "data": null
}
```

## F6-J05 — POST /driver/trips/{tripId}/handover

Hoàn thành bàn giao và mở thời hạn nghiệm thu. Vai trò: **DRIVER_ESCORT**.

Server recheck FINAL_ARRIVED Flow4 và toàn bộ blocker Flow5 liên quan bàn giao dưới cùng transaction boundary, kể cả context trước đó canComplete=true. Kiểm phân công chặng cuối, người nhận đã đăng ký/được duyệt, đủ đúng mỗi ngựa một lần, microchip, ảnh, chữ ký và file cùng request. Chữ ký gắn snapshot đầy đủ nội dung receiver/horses/condition/note/version đã cho người nhận xem; đổi nội dung phải ký lại, không tái dùng signature file cho biên bản khác. Atomic: Trip COMPLETED, Request DELIVERED, phase AWAITING_ACCEPTANCE, một deadline theo policy. Không phải nghiệm thu Customer.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "receiverName": "Trần Văn Bình",
  "identityChecked": true,
  "authorizationChecked": true,
  "horses": [
    {
      "horseId": "HORSE_001",
      "microchipVerified": true,
      "condition": "NORMAL",
      "note": "Tình trạng ổn định.",
      "photoFileIds": [
        "evidence_photo_001"
      ]
    }
  ],
  "signatureFileId": "evidence_signature_001",
  "note": "Đã kiểm tra người nhận và ngựa."
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "arrivedAtDestination": true,
    "receiver": {
      "name": "Trần Văn Bình",
      "phone": "0901234567",
      "authorization": "REGISTERED",
      "authorizationReference": null
    },
    "horseIds": [
      "HORSE_001"
    ],
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "attempts": [],
    "canComplete": false,
    "blockers": [
      "Đã bàn giao."
    ]
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: HANDOVER_NOT_READY, HANDOVER_ALREADY_COMPLETED, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: HANDOVER_NOT_READY",
  "errorCode": "HANDOVER_NOT_READY",
  "data": null
}
```

## F6-J06 — POST /manager/trips/{tripId}/receiver-authorizations

Duyệt người nhận thay thế trước bàn giao. Vai trò: **LOGISTICS_MANAGER**.

Chỉ trước bàn giao thành công; ghi bằng chứng ủy quyền và actor. Không sửa hợp đồng đã ký. version lấy từ HandoverContext.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `tripId` | True | `{"type": "string", "pattern": "^TRIP_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "name": "Trần Văn Hùng",
  "phone": "0901234568",
  "reason": "Khách ủy quyền người nhận thay thế.",
  "evidenceFileIds": [
    "evidence_authorization_001"
  ]
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "arrivedAtDestination": true,
    "receiver": {
      "name": "Trần Văn Hùng",
      "phone": "0901234568",
      "authorization": "MANAGER_APPROVED",
      "authorizationReference": "authorization_001"
    },
    "horseIds": [
      "HORSE_001"
    ],
    "handover": null,
    "attempts": [],
    "canComplete": true,
    "blockers": []
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J07 — GET /customer/requests/{requestId}/aftercare

Đọc hồ sơ Flow 6 và hành động được phép. Vai trò: **CUSTOMER**.

Sau bàn giao thành công. Chỉ chủ yêu cầu/phạm vi quản lý. Customer chỉ nhận bằng chứng và thông tin được chia sẻ, không có ghi chú hay chi phí nội bộ. actions chỉ hỗ trợ UI; mutation luôn recheck.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 1,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_ACCEPTANCE",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Chưa nghiệm thu."
      ]
    },
    "actions": [
      {
        "action": "ACCEPT",
        "allowed": true,
        "blockers": []
      },
      {
        "action": "REPORT_ISSUE",
        "allowed": true,
        "blockers": []
      },
      {
        "action": "PAY",
        "allowed": false,
        "blockers": [
          "Chưa nghiệm thu."
        ]
      }
    ],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J08 — GET /manager/requests/{requestId}/aftercare

Đọc hồ sơ Flow 6 và hành động được phép. Vai trò: **LOGISTICS_MANAGER**.

Sau bàn giao thành công. Chỉ chủ yêu cầu/phạm vi quản lý. Customer chỉ nhận bằng chứng và thông tin được chia sẻ, không có ghi chú hay chi phí nội bộ. actions chỉ hỗ trợ UI; mutation luôn recheck.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 1,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_ACCEPTANCE",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Chưa nghiệm thu."
      ]
    },
    "actions": [
      {
        "action": "ACCEPT",
        "allowed": true,
        "blockers": []
      },
      {
        "action": "REPORT_ISSUE",
        "allowed": true,
        "blockers": []
      },
      {
        "action": "PAY",
        "allowed": false,
        "blockers": [
          "Chưa nghiệm thu."
        ]
      }
    ],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J09 — GET /coordinator/requests/{requestId}/aftercare

Theo dõi kết quả bàn giao. Vai trò: **FLEET_ROUTE_COORDINATOR**.

Coordinator được phân công chỉ đọc kết quả và lần bàn giao thất bại; không có quyền nghiệm thu, xác minh tiền hoặc đóng đơn.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "phase": "AWAITING_ACCEPTANCE",
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "attempts": [],
    "issueSummary": ""
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J10 — POST /customer/requests/{requestId}/aftercare/acceptance

Customer xác nhận nghiệm thu cuối cùng. Vai trò: **CUSTOMER**.

Chỉ chủ yêu cầu, trong hạn RUNNING, chưa ACCEPTED, không khiếu nại/tranh chấp/điều chỉnh chờ. Kiểm đúng statementVersion. Atomic: ACCEPTED, khóa khiếu nại mới, mở paymentWindow riêng. Nếu không còn nợ thì READY_TO_CLOSE khi không nghĩa vụ treo. Không chờ hết 24/48h.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "statementVersion": 1,
  "confirmed": true
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_PAYMENT",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "ACCEPTED",
      "acceptedAt": "2026-11-20 10:00",
      "acceptedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "statementVersion": 1
    },
    "acceptanceWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-21 10:00",
      "remainingSeconds": 86400,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": true,
      "paymentBlockers": []
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: ACCEPTANCE_WINDOW_EXPIRED, ALREADY_ACCEPTED, OPEN_COMPLAINT, OPEN_DISPUTE, PENDING_ADJUSTMENT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: ACCEPTANCE_WINDOW_EXPIRED",
  "errorCode": "ACCEPTANCE_WINDOW_EXPIRED",
  "data": null
}
```

## F6-J11 — POST /customer/requests/{requestId}/aftercare/complaints

Báo vấn đề hoặc từ chối nghiệm thu. Vai trò: **CUSTOMER**.

Bàn giao xong, chưa ACCEPTED, trong hạn RUNNING hoặc đang PAUSED vì khiếu nại/tranh chấp trước nghiệm thu; quá hạn phải được gia hạn. Khóa nghiệm thu/thanh toán, pause thời hạn một lần; REFUSAL không đóng đơn. horseId nếu có phải thuộc chuyến.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "kind": "ISSUE",
  "category": "HORSE_CONDITION",
  "title": "Đề nghị kiểm tra tình trạng ngựa",
  "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
  "horseId": "HORSE_001",
  "evidenceFileIds": [
    "evidence_photo_001"
  ]
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "COMPLAINT_OPEN",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "OPEN",
        "createdAt": "2026-11-20 10:00",
        "messages": [],
        "proposals": []
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Khiếu nại chưa giải quyết."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: ALREADY_ACCEPTED, ACCEPTANCE_WINDOW_EXPIRED, REQUEST_CLOSED, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: ALREADY_ACCEPTED",
  "errorCode": "ALREADY_ACCEPTED",
  "data": null
}
```

## F6-J12 — POST /customer/requests/{requestId}/aftercare/complaints/{complaintId}/messages

Trao đổi và bổ sung bằng chứng khiếu nại. Vai trò: **CUSTOMER**.

Khiếu nại thuộc đúng request và chưa RESOLVED; CLOSED không cho ghi mới. Message hiển thị cho Customer; không dùng để lưu ghi chú nội bộ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `complaintId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "COMPLAINT_OPEN",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "OPEN",
        "createdAt": "2026-11-20 10:00",
        "messages": [
          {
            "id": "message_001",
            "at": "2026-11-20 10:00",
            "actor": {
              "userId": "USER_001",
              "name": "Nguyễn Minh An"
            },
            "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
            "evidenceFileIds": []
          }
        ],
        "proposals": []
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Khiếu nại chưa giải quyết."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J13 — POST /manager/requests/{requestId}/aftercare/complaints/{complaintId}/messages

Trao đổi và bổ sung bằng chứng khiếu nại. Vai trò: **LOGISTICS_MANAGER**.

Khiếu nại thuộc đúng request và chưa RESOLVED; CLOSED không cho ghi mới. Message hiển thị cho Customer; không dùng để lưu ghi chú nội bộ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `complaintId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "COMPLAINT_OPEN",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "OPEN",
        "createdAt": "2026-11-20 10:00",
        "messages": [
          {
            "id": "message_001",
            "at": "2026-11-20 10:00",
            "actor": {
              "userId": "USER_001",
              "name": "Nguyễn Minh An"
            },
            "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
            "evidenceFileIds": []
          }
        ],
        "proposals": []
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Khiếu nại chưa giải quyết."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J14 — POST /manager/requests/{requestId}/aftercare/complaints/{complaintId}/proposals

Đề xuất giải quyết và khoản giảm. Vai trò: **LOGISTICS_MANAGER**.

Khiếu nại OPEN/PROPOSED; đề xuất mới supersede bản PENDING cũ. Không sửa bản ACCEPTED. Khoản giảm chưa trừ hóa đơn; không cộng thêm tiền khách. Không dùng trong tranh chấp đã có quyết định cuối.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `complaintId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "description": "Đề xuất giảm tiền theo phản ánh của khách.",
  "reductionAmount": 1000000,
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "COMPLAINT_OPEN",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "PROPOSED",
        "createdAt": "2026-11-20 10:00",
        "messages": [],
        "proposals": [
          {
            "id": "proposal_001",
            "version": 1,
            "complaintId": "complaint_001",
            "status": "PENDING",
            "description": "Đề xuất giảm tiền theo phản ánh của khách.",
            "reductionAmount": 1000000,
            "evidenceFileIds": [],
            "createdAt": "2026-11-20 10:00",
            "createdBy": {
              "userId": "USER_001",
              "name": "Nguyễn Minh An"
            },
            "customerDecidedAt": null,
            "customerDecisionNote": null
          }
        ]
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Khiếu nại chưa giải quyết."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J15 — POST /customer/requests/{requestId}/aftercare/complaints/{complaintId}/proposals/{proposalId}/decision

Customer đồng ý hoặc từ chối đúng bản đề xuất. Vai trò: **CUSTOMER**.

Đúng proposalVersion hiện hành PENDING. ACCEPTED => AGREED và pendingAdjustment; REJECTED => OPEN, giữ khóa. Đồng ý phương án không phải nghiệm thu bàn giao.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `complaintId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| path | `proposalId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "proposalVersion": 1,
  "decision": "ACCEPTED",
  "note": "Tôi đồng ý phương án giải quyết này."
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "COMPLAINT_OPEN",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "AGREED",
        "createdAt": "2026-11-20 10:00",
        "messages": [],
        "proposals": [
          {
            "id": "proposal_001",
            "version": 1,
            "complaintId": "complaint_001",
            "status": "ACCEPTED",
            "description": "Đề xuất giảm tiền theo phản ánh của khách.",
            "reductionAmount": 1000000,
            "evidenceFileIds": [],
            "createdAt": "2026-11-20 10:00",
            "createdBy": {
              "userId": "USER_001",
              "name": "Nguyễn Minh An"
            },
            "customerDecidedAt": "2026-11-20 10:00",
            "customerDecisionNote": "Tôi đồng ý phương án giải quyết này."
          }
        ]
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [
        "proposal_001"
      ],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Khiếu nại chưa giải quyết."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STALE_PROPOSAL, REQUEST_CLOSED, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STALE_PROPOSAL",
  "errorCode": "STALE_PROPOSAL",
  "data": null
}
```

## F6-J16 — POST /manager/requests/{requestId}/aftercare/complaints/{complaintId}/resolution/apply

Áp dụng kết quả đã được khách đồng ý. Vai trò: **LOGISTICS_MANAGER**.

Chỉ proposal ACCEPTED. Atomic áp dụng khoản giảm một lần, tạo nghĩa vụ hoàn nếu thừa tiền, chuyển complaint RESOLVED. Không gửi số tiền lại. Khi hết khiếu nại, không tranh chấp và hết pendingAdjustment: mở lại đủ acceptanceHours từ server now; còn vụ mở giữ PAUSED.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `complaintId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_ACCEPTANCE",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 172800,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [
      {
        "id": "complaint_001",
        "requestId": "REQUEST_001",
        "kind": "ISSUE",
        "category": "HORSE_CONDITION",
        "title": "Đề nghị kiểm tra tình trạng ngựa",
        "description": "Ngựa có vết trầy cần xác minh nguyên nhân.",
        "horseId": "HORSE_001",
        "evidenceFileIds": [
          "evidence_photo_001"
        ],
        "status": "RESOLVED",
        "createdAt": "2026-11-20 10:00",
        "messages": [],
        "proposals": [
          {
            "id": "proposal_001",
            "version": 1,
            "complaintId": "complaint_001",
            "status": "ACCEPTED",
            "description": "Đề xuất giảm tiền theo phản ánh của khách.",
            "reductionAmount": 1000000,
            "evidenceFileIds": [],
            "createdAt": "2026-11-20 10:00",
            "createdBy": {
              "userId": "USER_001",
              "name": "Nguyễn Minh An"
            },
            "customerDecidedAt": "2026-11-20 10:00",
            "customerDecisionNote": "Tôi đồng ý phương án giải quyết này."
          }
        ]
      }
    ],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 2,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 1000000,
      "waiverTotal": 0,
      "netPayable": 19000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 11000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [
        {
          "id": "adjustment_001",
          "sourceId": "proposal_001",
          "kind": "REDUCTION",
          "amount": 1000000,
          "appliedAt": "2026-11-20 10:00",
          "reason": "Đề xuất giảm tiền theo phản ánh của khách."
        }
      ],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Chưa nghiệm thu."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: PROPOSAL_NOT_ACCEPTED, RECONCILIATION_REQUIRED, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: PROPOSAL_NOT_ACCEPTED",
  "errorCode": "PROPOSAL_NOT_ACCEPTED",
  "data": null
}
```

## F6-J17 — POST /manager/requests/{requestId}/aftercare/acceptance-window/extensions

Gia hạn kiểm tra và nghiệm thu. Vai trò: **LOGISTICS_MANAGER**.

Chưa ACCEPTED, không tranh chấp/complaint/pendingAdjustment. newDueAt > now và > hạn hiện tại, trong maxExtensionHours. Giữ lịch sử; không xóa bộ đếm cũ. Chỉ cửa sổ nghiệm thu, không sửa paymentWindow.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "newDueAt": "2026-11-24 10:00",
  "reason": "Gia hạn theo trao đổi với khách hàng."
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "DELIVERED",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_ACCEPTANCE",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-24 10:00",
      "remainingSeconds": 345600,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      },
      {
        "id": "deadline_002",
        "kind": "EXTENDED",
        "window": "ACCEPTANCE",
        "previousDueAt": "2026-11-22 10:00",
        "newDueAt": "2026-11-24 10:00",
        "reason": "Gia hạn theo trao đổi với khách hàng.",
        "at": "2026-11-20 10:00",
        "actor": {
          "userId": "USER_001",
          "name": "Nguyễn Minh An"
        }
      }
    ],
    "complaints": [],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Chưa nghiệm thu."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J18 — POST /manager/requests/{requestId}/aftercare/dispute

Chuyển đơn sang đang giải quyết. Vai trò: **LOGISTICS_MANAGER**.

Đơn đã bàn giao, chưa CLOSED, chưa có dispute mở. NO_RESPONSE chỉ sau quá hạn; PAYMENT_DISAGREEMENT có thể sau ACCEPTED. Request UNDER_RESOLUTION, chặn nghiệm thu/khởi tạo tiền/đóng. Hủy phiên đang chờ theo khả năng provider; tiền về muộn vẫn phải đối soát.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "reason": "NO_RESPONSE",
  "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "UNDER_RESOLUTION",
    "tripStatus": "COMPLETED",
    "phase": "DISPUTE_IN_PROGRESS",
    "serverTime": "2026-11-23 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": "2026-11-22 10:00"
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": {
      "id": "dispute_001",
      "status": "OPEN",
      "reason": "NO_RESPONSE",
      "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
      "openedAt": "2026-11-23 10:00",
      "evidenceFileIds": [],
      "updates": [],
      "decision": null
    },
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Đang giải quyết tranh chấp."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J19 — POST /manager/requests/{requestId}/aftercare/dispute/updates

Ghi diễn biến giải quyết có thể chia sẻ với khách. Vai trò: **LOGISTICS_MANAGER**.

Dispute OPEN/DECISION_RECORDED. Chỉ bằng chứng được phép chia sẻ. Không tự đánh dấu khách đồng ý.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
  "evidenceFileIds": []
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "UNDER_RESOLUTION",
    "tripStatus": "COMPLETED",
    "phase": "DISPUTE_IN_PROGRESS",
    "serverTime": "2026-11-23 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": "2026-11-22 10:00"
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": {
      "id": "dispute_001",
      "status": "OPEN",
      "reason": "NO_RESPONSE",
      "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
      "openedAt": "2026-11-23 10:00",
      "evidenceFileIds": [],
      "updates": [
        {
          "id": "message_001",
          "at": "2026-11-23 10:00",
          "actor": {
            "userId": "USER_001",
            "name": "Nguyễn Minh An"
          },
          "text": "Đã bổ sung bằng chứng để hai bên kiểm tra.",
          "evidenceFileIds": []
        }
      ],
      "decision": null
    },
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Đang giải quyết tranh chấp."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J20 — POST /manager/requests/{requestId}/aftercare/dispute/decisions

Ghi nhận kết quả cuối cùng của tranh chấp. Vai trò: **LOGISTICS_MANAGER**.

Dispute OPEN. CUSTOMER_AGREEMENT phải tham chiếu các proposal đã được chính Customer chấp nhận, bao phủ mọi complaint chưa giải quyết. EXTERNAL_DECISION cần reference và bằng chứng hợp lệ, Manager xác nhận đã kiểm chứng. COMPANY_WAIVER chỉ miễn nghĩa vụ khách còn nợ, không khẳng định khách đồng ý, không phủ nhận yêu cầu bồi thường chưa xử lý. RESUME_ACCEPTANCE chỉ khi chưa ACCEPTED, waiverAmount=0. Không ghi đè quyết định đã lưu; lỗi cần quy trình hiệu chỉnh riêng, chưa hỗ trợ.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "outcome": "CLOSE_AFTER_DISPUTE",
  "basis": "EXTERNAL_DECISION",
  "customerAgreementProposalIds": [],
  "reference": "EXAMPLE-RESOLUTION-01",
  "summary": "Kết quả giải quyết được kiểm chứng và ghi nhận.",
  "evidenceFileIds": [
    "evidence_decision_001"
  ],
  "reductionAmount": 1000000,
  "waiverAmount": 0
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "UNDER_RESOLUTION",
    "tripStatus": "COMPLETED",
    "phase": "DISPUTE_IN_PROGRESS",
    "serverTime": "2026-11-23 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "PENDING",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "PAUSED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": "2026-11-22 10:00"
    },
    "paymentWindow": {
      "status": "NOT_STARTED",
      "openedAt": null,
      "dueAt": null,
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": {
      "id": "dispute_001",
      "status": "DECISION_RECORDED",
      "reason": "NO_RESPONSE",
      "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
      "openedAt": "2026-11-23 10:00",
      "evidenceFileIds": [],
      "updates": [],
      "decision": {
        "id": "decision_001",
        "status": "RECORDED",
        "outcome": "CLOSE_AFTER_DISPUTE",
        "basis": "EXTERNAL_DECISION",
        "customerAgreementProposalIds": [],
        "reference": "EXAMPLE-RESOLUTION-01",
        "summary": "Kết quả giải quyết được kiểm chứng và ghi nhận.",
        "evidenceFileIds": [
          "evidence_decision_001"
        ],
        "reductionAmount": 1000000,
        "waiverAmount": 0,
        "recordedAt": "2026-11-23 10:00",
        "recordedBy": {
          "userId": "USER_001",
          "name": "Nguyễn Minh An"
        }
      }
    },
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 12000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [
        "decision_001"
      ],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Đang giải quyết tranh chấp."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: INVALID_DECISION_BASIS, OPEN_COMPLAINT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: INVALID_DECISION_BASIS",
  "errorCode": "INVALID_DECISION_BASIS",
  "data": null
}
```

## F6-J21 — POST /manager/requests/{requestId}/aftercare/dispute/decisions/{decisionId}/apply

Áp dụng quyết định và hóa đơn trong một transaction. Vai trò: **LOGISTICS_MANAGER**.

Quyết định RECORDED, đúng request. Đối soát payment đang xử lý trước. reduction không vượt giá còn lại, waiver không vượt nợ sau reduction; khoản đã áp dụng không tính hai lần. Giải quyết các complaint trong phạm vi quyết định. RESUME_ACCEPTANCE => mở thời hạn mới. CLOSE_AFTER_DISPUTE => bỏ yêu cầu nghiệm thu bằng NOT_REQUIRED_BY_DISPUTE nếu chưa ký nghiệm thu, không tạo acceptedAt. Nợ/hoàn còn treo vẫn chặn đóng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `decisionId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "UNDER_RESOLUTION",
    "tripStatus": "COMPLETED",
    "phase": "AWAITING_PAYMENT",
    "serverTime": "2026-11-23 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "NOT_REQUIRED_BY_DISPUTE",
      "acceptedAt": null,
      "acceptedBy": null,
      "statementVersion": null
    },
    "acceptanceWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": "2026-11-22 10:00"
    },
    "paymentWindow": {
      "status": "RUNNING",
      "openedAt": "2026-11-23 10:00",
      "dueAt": "2026-11-24 10:00",
      "remainingSeconds": 86400,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": {
      "id": "dispute_001",
      "status": "RESOLVED",
      "reason": "NO_RESPONSE",
      "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
      "openedAt": "2026-11-23 10:00",
      "evidenceFileIds": [],
      "updates": [],
      "decision": {
        "id": "decision_001",
        "status": "APPLIED",
        "outcome": "CLOSE_AFTER_DISPUTE",
        "basis": "EXTERNAL_DECISION",
        "customerAgreementProposalIds": [],
        "reference": "EXAMPLE-RESOLUTION-01",
        "summary": "Kết quả giải quyết được kiểm chứng và ghi nhận.",
        "evidenceFileIds": [
          "evidence_decision_001"
        ],
        "reductionAmount": 1000000,
        "waiverAmount": 0,
        "recordedAt": "2026-11-23 10:00",
        "recordedBy": {
          "userId": "USER_001",
          "name": "Nguyễn Minh An"
        }
      }
    },
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 2,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 1000000,
      "waiverTotal": 0,
      "netPayable": 19000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 0,
      "outstanding": 11000000,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [
        {
          "id": "adjustment_001",
          "sourceId": "decision_001",
          "kind": "REDUCTION",
          "amount": 1000000,
          "appliedAt": "2026-11-23 10:00",
          "reason": "Kết quả giải quyết được kiểm chứng và ghi nhận."
        }
      ],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": true,
      "paymentBlockers": []
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: INVALID_DECISION_BASIS, UNSETTLED_PAYMENT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: INVALID_DECISION_BASIS",
  "errorCode": "INVALID_DECISION_BASIS",
  "data": null
}
```

## F6-J22 — POST /customer/requests/{requestId}/aftercare/payment-sessions

Khởi tạo thanh toán số dư VNPay. Vai trò: **CUSTOMER**.

Server tính amount=outstanding theo invoiceVersion, không nhận amount/returnUrl từ client. Bình thường phải ACCEPTED; ngoại lệ quyết định CLOSE_AFTER_DISPUTE đã APPLIED và cho phép thu nợ. Không vụ mở, pendingAdjustment/refund, pendingPayment; nợ >0. Quá hạn thanh toán vẫn được trả và ghi nhận trễ. Return trình duyệt không xác minh tiền.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "invoiceVersion": 1,
  "method": "VNPAY"
}
```

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "paymentId": "PAYMENT_002",
    "requestId": "REQUEST_001",
    "invoiceId": "INVOICE_001",
    "invoiceVersion": 1,
    "amount": 12000000,
    "currency": "VND",
    "status": "PROCESSING",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=PAYMENT_002",
    "expiresAt": "2026-11-20 10:15"
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STALE_INVOICE, OPEN_COMPLAINT, OPEN_DISPUTE, PENDING_ADJUSTMENT, UNSETTLED_PAYMENT, PENDING_REFUND, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STALE_INVOICE",
  "errorCode": "STALE_INVOICE",
  "data": null
}
```

## F6-J23 — GET /customer/requests/{requestId}/aftercare/payments/{paymentId}

Đọc kết quả thanh toán đã xác minh trên server. Vai trò: **CUSTOMER**.

PAYMENT phải thuộc Request và Customer. Chỉ đọc; không xác minh từ query browser, không tự xử lý IPN.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `paymentId` | True | `{"type": "string", "pattern": "^PAYMENT_\\d{3,}$", "maxLength": 50}` |

Không gửi request body.

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "paymentId": "PAYMENT_002",
    "requestId": "REQUEST_001",
    "invoiceId": "INVOICE_001",
    "amount": 12000000,
    "status": "VERIFIED",
    "verifiedAt": "2026-11-20 10:00"
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J24 — POST /manager/requests/{requestId}/aftercare/refunds/{refundId}/confirmation

Ghi nhận bằng chứng khoản hoàn đã chuyển thực tế. Vai trò: **LOGISTICS_MANAGER**.

Nghĩa vụ refund có sẵn PENDING/PROCESSING/FAILED. Người có quyền tài chính được cấu hình kiểm tra reference, số tiền đúng nghĩa vụ, bằng chứng thanh toán. Không phải API chuyển tiền hoặc duyệt hoàn = đã hoàn. Chỉ ghi verifiedAt sau kiểm chứng; chống reference trùng.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `refundId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "reference": "BANK-EXAMPLE-REFUND-01",
  "evidenceFileIds": [
    "evidence_refund_001"
  ],
  "note": "Đã đối chiếu chứng từ chuyển khoản thực tế."
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "UNDER_RESOLUTION",
    "tripStatus": "COMPLETED",
    "phase": "READY_TO_CLOSE",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "ACCEPTED",
      "acceptedAt": "2026-11-20 10:00",
      "acceptedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "statementVersion": 1
    },
    "acceptanceWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-21 10:00",
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": {
      "id": "dispute_001",
      "status": "RESOLVED",
      "reason": "PAYMENT_DISAGREEMENT",
      "description": "Khách chưa phản hồi sau thời hạn nghiệm thu.",
      "openedAt": "2026-11-20 10:00",
      "evidenceFileIds": [],
      "updates": [],
      "decision": {
        "id": "decision_001",
        "status": "APPLIED",
        "outcome": "CLOSE_AFTER_DISPUTE",
        "basis": "EXTERNAL_DECISION",
        "customerAgreementProposalIds": [],
        "reference": "EXAMPLE-RESOLUTION-01",
        "summary": "Kết quả giải quyết được kiểm chứng và ghi nhận.",
        "evidenceFileIds": [
          "evidence_decision_001"
        ],
        "reductionAmount": 1000000,
        "waiverAmount": 0,
        "recordedAt": "2026-11-20 10:00",
        "recordedBy": {
          "userId": "USER_001",
          "name": "Nguyễn Minh An"
        }
      }
    },
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 2,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 1000000,
      "waiverTotal": 0,
      "netPayable": 19000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 12000000,
      "outstanding": 0,
      "refundDue": 0,
      "verifiedRefund": 1000000,
      "adjustments": [
        {
          "id": "adjustment_001",
          "sourceId": "decision_001",
          "kind": "REDUCTION",
          "amount": 1000000,
          "appliedAt": "2026-11-20 10:00",
          "reason": "Kết quả giải quyết được kiểm chứng và ghi nhận."
        }
      ],
      "pendingAdjustmentIds": [],
      "refunds": [
        {
          "id": "refund_001",
          "amount": 1000000,
          "status": "VERIFIED",
          "verifiedAt": "2026-11-20 10:00",
          "reference": "BANK-EXAMPLE-REFUND-01"
        }
      ],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Đã đủ tiền."
      ]
    },
    "actions": [],
    "closure": null
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: PENDING_REFUND, RECONCILIATION_REQUIRED, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: PENDING_REFUND",
  "errorCode": "PENDING_REFUND",
  "data": null
}
```

## F6-J25 — POST /manager/requests/{requestId}/aftercare/closure

Manager đóng đơn sau kiểm tra toàn bộ nghĩa vụ. Vai trò: **LOGISTICS_MANAGER**.

Atomic recheck đủ bàn giao, không vụ mở, không pendingAdjustment/payment/reconciliation/refund, outstanding=0, refundDue=0. NORMAL cần ACCEPTED. AFTER_DISPUTE cần quyết định CLOSE_AFTER_DISPUTE đã APPLIED. Không chờ hết acceptanceWindow sau đã ACCEPTED. Không tự đóng, không tự nghiệm thu, không đánh dấu nợ đã thanh toán.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request JSON:

```json
{
  "expectedVersion": 1,
  "mode": "NORMAL",
  "reason": "Đã nghiệm thu và hoàn tất các nghĩa vụ."
}
```

Response 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "requestId": "REQUEST_001",
    "tripId": "TRIP_001",
    "version": 2,
    "requestStatus": "CLOSED",
    "tripStatus": "COMPLETED",
    "phase": "CLOSED",
    "serverTime": "2026-11-20 10:00",
    "policy": {
      "version": 1,
      "defaultAcceptanceHours": "48",
      "allowedAcceptanceHours": [
        "24",
        "48"
      ],
      "paymentHours": 24,
      "maxExtensionHours": 168,
      "acceptanceStatementVersion": 1,
      "acceptanceStatement": "Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "handover": {
      "id": "handover_001",
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "completedAt": "2026-11-20 10:00",
      "recordedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "receiver": {
        "name": "Trần Văn Bình",
        "phone": "0901234567",
        "authorization": "REGISTERED",
        "authorizationReference": null
      },
      "horses": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "NORMAL",
          "note": "Tình trạng ổn định.",
          "photoFileIds": [
            "evidence_photo_001"
          ]
        }
      ],
      "signatureFileId": "evidence_signature_001",
      "note": "Đã bàn giao đủ ngựa."
    },
    "acceptance": {
      "status": "ACCEPTED",
      "acceptedAt": "2026-11-20 10:00",
      "acceptedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "statementVersion": 1
    },
    "acceptanceWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-22 10:00",
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "paymentWindow": {
      "status": "COMPLETED",
      "openedAt": "2026-11-20 10:00",
      "dueAt": "2026-11-21 10:00",
      "remainingSeconds": 0,
      "overdueAt": null
    },
    "deadlineHistory": [
      {
        "id": "deadline_001",
        "kind": "OPENED",
        "window": "ACCEPTANCE",
        "previousDueAt": null,
        "newDueAt": "2026-11-22 10:00",
        "reason": "Bàn giao thành công.",
        "at": "2026-11-20 10:00",
        "actor": null
      }
    ],
    "complaints": [],
    "dispute": null,
    "settlement": {
      "invoiceId": "INVOICE_001",
      "invoiceVersion": 1,
      "currency": "VND",
      "originalTotal": 20000000,
      "reductionTotal": 0,
      "waiverTotal": 0,
      "netPayable": 20000000,
      "verifiedDeposit": 8000000,
      "verifiedBalance": 12000000,
      "outstanding": 0,
      "refundDue": 0,
      "verifiedRefund": 0,
      "adjustments": [],
      "pendingAdjustmentIds": [],
      "refunds": [],
      "pendingPaymentIds": [],
      "canPay": false,
      "paymentBlockers": [
        "Đã đủ tiền."
      ]
    },
    "actions": [],
    "closure": {
      "mode": "NORMAL",
      "closedAt": "2026-11-20 10:00",
      "closedBy": {
        "userId": "USER_001",
        "name": "Nguyễn Minh An"
      },
      "reason": "Đã nghiệm thu và hoàn tất các nghĩa vụ.",
      "decisionId": null
    }
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: CLOSURE_BLOCKED, OUTSTANDING_BALANCE, PENDING_REFUND, UNSETTLED_PAYMENT, OPEN_COMPLAINT, OPEN_DISPUTE, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: CLOSURE_BLOCKED",
  "errorCode": "CLOSURE_BLOCKED",
  "data": null
}
```

## F6-J26 — POST /driver/requests/{requestId}/aftercare/files

Tải bằng chứng thật cho đúng yêu cầu. Vai trò: **DRIVER_ESCORT**.

PDF/JPEG/PNG 1 byte–10 MiB, kiểm bytes/MIME, malware và quyền. Driver chỉ chặng giao được phân công; cho upload trước handover. Client gửi đúng một file multipart, không URL/base64. Không tăng aftercare.version chỉ vì upload file chưa gắn.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request multipart: đúng một trường `file`, File thật PDF/JPEG/PNG, tối đa 10 MiB; không đặt boundary thủ công.

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "id": "evidence_photo_001",
    "requestId": "REQUEST_001",
    "name": "ban-giao.png",
    "mimeType": "image/png",
    "sizeBytes": 1024,
    "uploadedAt": "2026-11-20 10:00",
    "uploadedBy": {
      "userId": "USER_001",
      "name": "Nguyễn Minh An"
    }
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J27 — GET /driver/requests/{requestId}/aftercare/files/{fileId}

Tải bằng chứng có kiểm quyền. Vai trò: **DRIVER_ESCORT**.

File thuộc đúng Request và được chia sẻ với role. Token Bearer, binary đúng MIME. Driver chỉ file bàn giao mình có quyền; không thấy tài liệu tranh chấp. Không dùng URL công khai.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |

Không gửi request body.

Response 200: binary theo MIME file; `Content-Disposition: attachment`. Lỗi vẫn là JSON.

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J28 — POST /customer/requests/{requestId}/aftercare/files

Tải bằng chứng thật cho đúng yêu cầu. Vai trò: **CUSTOMER**.

PDF/JPEG/PNG 1 byte–10 MiB, kiểm bytes/MIME, malware và quyền. Driver chỉ chặng giao được phân công; cho upload trước handover. Client gửi đúng một file multipart, không URL/base64. Không tăng aftercare.version chỉ vì upload file chưa gắn.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request multipart: đúng một trường `file`, File thật PDF/JPEG/PNG, tối đa 10 MiB; không đặt boundary thủ công.

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "id": "evidence_photo_001",
    "requestId": "REQUEST_001",
    "name": "ban-giao.png",
    "mimeType": "image/png",
    "sizeBytes": 1024,
    "uploadedAt": "2026-11-20 10:00",
    "uploadedBy": {
      "userId": "USER_001",
      "name": "Nguyễn Minh An"
    }
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J29 — GET /customer/requests/{requestId}/aftercare/files/{fileId}

Tải bằng chứng có kiểm quyền. Vai trò: **CUSTOMER**.

File thuộc đúng Request và được chia sẻ với role. Token Bearer, binary đúng MIME. Driver chỉ file bàn giao mình có quyền; không thấy tài liệu tranh chấp. Không dùng URL công khai.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |

Không gửi request body.

Response 200: binary theo MIME file; `Content-Disposition: attachment`. Lỗi vẫn là JSON.

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J30 — POST /manager/requests/{requestId}/aftercare/files

Tải bằng chứng thật cho đúng yêu cầu. Vai trò: **LOGISTICS_MANAGER**.

PDF/JPEG/PNG 1 byte–10 MiB, kiểm bytes/MIME, malware và quyền. Driver chỉ chặng giao được phân công; cho upload trước handover. Client gửi đúng một file multipart, không URL/base64. Không tăng aftercare.version chỉ vì upload file chưa gắn.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| header | `Idempotency-Key` | True | `{"type": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"}` |

Header: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).

Request multipart: đúng một trường `file`, File thật PDF/JPEG/PNG, tối đa 10 MiB; không đặt boundary thủ công.

Response 201:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "id": "evidence_photo_001",
    "requestId": "REQUEST_001",
    "name": "ban-giao.png",
    "mimeType": "image/png",
    "sizeBytes": 1024,
    "uploadedAt": "2026-11-20 10:00",
    "uploadedBy": {
      "userId": "USER_001",
      "name": "Nguyễn Minh An"
    }
  }
}
```

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## F6-J31 — GET /manager/requests/{requestId}/aftercare/files/{fileId}

Tải bằng chứng có kiểm quyền. Vai trò: **LOGISTICS_MANAGER**.

File thuộc đúng Request và được chia sẻ với role. Token Bearer, binary đúng MIME. Driver chỉ file bàn giao mình có quyền; không thấy tài liệu tranh chấp. Không dùng URL công khai.

| Vị trí | Tên | Bắt buộc | Schema |
|---|---|---|---|
| path | `requestId` | True | `{"type": "string", "pattern": "^REQUEST_\\d{3,}$", "maxLength": 50}` |
| path | `fileId` | True | `{"type": "string", "pattern": "^[A-Za-z0-9_-]{1,80}$"}` |

Không gửi request body.

Response 200: binary theo MIME file; `Content-Disposition: attachment`. Lỗi vẫn là JSON.

Lỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.

Mã 409: STATE_CONFLICT, STALE_VERSION, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS.

Mẫu lỗi 409 (không commit một phần):

```json
{
  "success": false,
  "message": "Thao tác bị chặn: STATE_CONFLICT",
  "errorCode": "STATE_CONFLICT",
  "data": null
}
```

## Lỗi chung

401 chưa đăng nhập; 403 sai role; 404 không thuộc phạm vi; 409 version/trạng thái không còn hợp lệ; 413 file quá lớn; 415 sai định dạng; 429 giới hạn; 501 chưa triển khai. Mã nghiệp vụ chi tiết ở FLOW6.md.

```json
{
  "success": false,
  "message": "Hồ sơ đã thay đổi, hãy tải lại trước khi xác nhận.",
  "errorCode": "STALE_VERSION",
  "data": null
}
```
