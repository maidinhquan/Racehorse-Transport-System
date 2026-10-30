# Flow 6 — JSON Request / Response

> Sinh từ build_openapi.py, không sửa ví dụ độc lập. FLOW6.md quy định nghiệp vụ; schema quyết định required/nullable/giới hạn.

| ID | Method | Path sau /api | Tác dụng |
|---|---|---|---|
| F6-J01 | GET | `/operations/flow6/trips` | Danh sách chuyến giao nhận |
| F6-J02 | GET | `/operations/flow6/trips/{tripId}/context` | Đầu vào và baseline |
| F6-J03 | POST | `/operations/flow6/trips/{tripId}/delivery` | Tạo DELIVERY và revision đầu |
| F6-J04 | GET | `/operations/flow6/handovers/{handoverId}` | Định danh biên bản |
| F6-J05 | GET | `/operations/flow6/revisions/{revisionId}` | Đọc đúng bản giao nhận |
| F6-J06 | PUT | `/operations/flow6/revisions/{revisionId}` | Thay nội dung draft |
| F6-J07 | POST | `/operations/flow6/revisions/{revisionId}/otp` | Gửi hoặc gửi lại OTP |
| F6-J08 | POST | `/operations/flow6/revisions/{revisionId}/invalidate-otp` | Thu hồi OTP để sửa draft |
| F6-J09 | POST | `/operations/flow6/revisions/{revisionId}/confirm` | Xác nhận nhận ngựa bằng OTP |
| F6-J10 | POST | `/operations/flow6/revisions/{revisionId}/refuse` | Ghi nhận từ chối nhận |
| F6-J11 | POST | `/operations/flow6/handovers/{handoverId}/revisions` | Lập bản giao lại |
| F6-J12 | GET | `/customer/flow6/settlements` | Hồ sơ của Customer |
| F6-J13 | GET | `/customer/flow6/settlements/{settlementId}` | Chi tiết tất toán Customer |
| F6-J14 | GET | `/manager/flow6/settlements` | Danh sách tất toán Manager |
| F6-J15 | POST | `/manager/flow6/trips/{tripId}/settlement` | Chuẩn bị hồ sơ tất toán |
| F6-J16 | GET | `/manager/flow6/settlements/{settlementId}` | Chi tiết hồ sơ Manager |
| F6-J17 | GET | `/manager/flow6/settlements/{settlementId}/balance` | Tính còn phải thu |
| F6-J18 | GET | `/customer/flow6/settlements/{settlementId}/balance` | Customer xem nghĩa vụ tiền |
| F6-J19 | POST | `/manager/flow6/settlements/{settlementId}/adjustments` | Manager xác nhận điều chỉnh |
| F6-J20 | GET | `/manager/flow6/settlements/{settlementId}/adjustments` | Điều chỉnh đã xác nhận |
| F6-J21 | GET | `/customer/flow6/settlements/{settlementId}/adjustments` | Customer xem điều chỉnh |
| F6-J22 | POST | `/manager/flow6/settlements/{settlementId}/final-invoice` | Phát hành hoặc thay invoice cuối |
| F6-J23 | GET | `/customer/flow6/settlements/{settlementId}/invoice` | Đọc invoice cuối hiện hành |
| F6-J24 | POST | `/customer/flow6/invoices/{invoiceId}/payment-session` | Tạo phiên VNPay trả số dư |
| F6-J25 | GET | `/customer/flow6/payments/{paymentId}` | Đọc thanh toán số dư |
| F6-J26 | POST | `/manager/flow6/settlements/{settlementId}/settle` | Xác nhận nghiệm thu và tất toán |
| F6-J27 | POST | `/manager/flow6/adjustments/{adjustmentId}/refund-processing` | Ghi bắt đầu xử lý hoàn |
| F6-J28 | POST | `/manager/flow6/adjustments/{adjustmentId}/refund-complete` | Ghi bằng chứng hoàn đủ khoản |
| F6-J29 | POST | `/customer/flow6/settlements/{settlementId}/cases` | Gửi khiếu nại/hỗ trợ |
| F6-J30 | GET | `/customer/flow6/settlements/{settlementId}/cases` | Theo dõi phiếu Customer |
| F6-J31 | GET | `/manager/flow6/cases` | Hàng đợi khiếu nại/hỗ trợ |
| F6-J32 | POST | `/manager/flow6/cases/{caseId}/start` | Đánh dấu đang xử lý |
| F6-J33 | POST | `/manager/flow6/cases/{caseId}/resolve` | Manager phản hồi rồi đóng phiếu |
| F6-J34 | POST | `/customer/flow6/settlements/{settlementId}/feedback` | Gửi đánh giá thông thường |
| F6-J35 | GET | `/customer/flow6/settlements/{settlementId}/feedback` | Đọc đánh giá đã gửi |
| F6-J36 | POST | `/manager/flow6/settlements/{settlementId}/restart-feedback-window` | Mở lại window sau khiếu nại/tiền |
| F6-J37 | POST | `/manager/flow6/settlements/{settlementId}/close` | Đóng hồ sơ đủ điều kiện |
| F6-J38 | GET | `/operations/flow6/trips/{tripId}/pickup-baseline` | Đọc baseline PICKUP |
| F6-J39 | GET | `/operations/flow6/trips/{tripId}/health-logs` | Tham chiếu sức khỏe đã ghi |
| F6-J40 | GET | `/operations/flow6/trips/{tripId}/incidents` | Tham chiếu sự cố hành trình |
| F6-J41 | GET | `/customer/flow6/settlements/{settlementId}/delivery` | Customer đọc biên bản đã nhận |
| F6-J42 | GET | `/manager/flow6/settlements/{settlementId}/delivery` | Manager đọc biên bản nghiệm thu |
| F6-J43 | GET | `/manager/flow6/settlements/{settlementId}/feedback` | Manager đọc đánh giá |
| F6-J44 | GET | `/manager/flow6/settlements/{settlementId}/payments` | Manager đọc giao dịch số dư |
| F6-J45 | GET | `/operations/flow6/revisions/{revisionId}/pdf` | Xuất PDF đúng bản biên bản |
| F6-J46 | GET | `/customer/flow6/settlements/{settlementId}/delivery/pdf` | Customer tải biên bản đã nhận |
| F6-J47 | GET | `/manager/flow6/settlements/{settlementId}/delivery/pdf` | Manager tải biên bản nghiệm thu |

## F6-J01 — GET /operations/flow6/trips

Danh sách chuyến giao nhận.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Chỉ chuyến được phân công, IN_TRANSIT hoặc COMPLETED để đọc hồ sơ cũ.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — TripSummary[]**

```json
{
  "success": true,
  "message": "Danh sách chuyến giao nhận thành công",
  "data": [
    {
      "tripId": "TRIP_001",
      "requestId": "REQUEST_001",
      "status": "IN_TRANSIT"
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 403**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: danh sách chuyến giao nhận.",
  "data": null,
  "errorCode": "FORBIDDEN_ROLE"
}
```

## F6-J02 — GET /operations/flow6/trips/{tripId}/context

Đầu vào và baseline.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Trước thao tác giao kiểm tổ hợp HANDOFF; warnings không thành trạng thái DB.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Context**

```json
{
  "success": true,
  "message": "Đầu vào và baseline thành công",
  "data": {
    "tripId": "TRIP_001",
    "requestId": "REQUEST_001",
    "contractId": "CONTRACT_001",
    "contractVersionNo": 1,
    "lifecycle": {
      "tripStatus": "IN_TRANSIT",
      "requestStatus": "IN_PROGRESS",
      "contractStatus": "EFFECTIVE"
    },
    "pickupHandoverIds": [],
    "horseIds": [
      "HORSE_001"
    ],
    "designatedReceiverName": "Yuki Tanaka",
    "designatedReceiverPhone": "+81312345678",
    "deliveryId": null,
    "warnings": []
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đầu vào và baseline.",
  "data": null,
  "errorCode": "HANDOFF_INCONSISTENT"
}
```

## F6-J03 — POST /operations/flow6/trips/{tripId}/delivery

Tạo DELIVERY và revision đầu.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Trip IN_TRANSIT, Request IN_PROGRESS, deployment CONFIRMED, Contract EFFECTIVE/current version SIGNED, đủ cọc; phân công hợp lệ. Không cần final invoice PAID. Thiếu baseline hiển thị thiếu, không giả dữ liệu. Tổ hợp status không chứng minh xe đã đến.

**Ghi dữ liệu / retry:** Khóa Trip; tạo HANDOVER DELIVERY DRAFT + ITEM + REVISION DRAFT trong transaction. Nếu đã có DELIVERY trả 409 DELIVERY_EXISTS kèm ID qua errors, không tạo lần hai. BE chụp tên và chip từng ngựa vào content.items.identity; request chỉ có horseId/kết quả kiểm, không nhận identity do FE tự cấp.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `DeliveryContent`

```json
{
  "location": "Tokyo Racecourse",
  "receiver": {
    "name": "Yuki Tanaka",
    "phone": "+81312345678",
    "authorized": true,
    "otpEmail": "receiver@example.com"
  },
  "commonDocuments": null,
  "items": [
    {
      "horseId": "HORSE_001",
      "microchipVerified": true,
      "condition": "Tỉnh táo, không có vết thương mới.",
      "assets": "Một dây dắt",
      "documents": null,
      "documentsReceivedAtUtc": null
    }
  ]
}
```

**Response 201 — Delivery**

```json
{
  "success": true,
  "message": "Tạo DELIVERY và revision đầu thành công",
  "data": {
    "id": "HANDOVER_001",
    "tripId": "TRIP_001",
    "status": "DRAFT",
    "currentRevisionId": "HANDOVER_REVISION_001"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: tạo delivery và revision đầu.",
  "data": null,
  "errorCode": "DELIVERY_EXISTS"
}
```

## F6-J04 — GET /operations/flow6/handovers/{handoverId}

Định danh biên bản.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Quyền theo Trip; không lặp content ở root.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `handoverId=HANDOVER_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Delivery**

```json
{
  "success": true,
  "message": "Định danh biên bản thành công",
  "data": {
    "id": "HANDOVER_001",
    "tripId": "TRIP_001",
    "status": "DRAFT",
    "currentRevisionId": "HANDOVER_REVISION_001"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: định danh biên bản.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J05 — GET /operations/flow6/revisions/{revisionId}

Đọc đúng bản giao nhận.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Quyền qua Handover → Trip. Bản cũ đọc snapshot, không dựng từ item hiện tại.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Đọc đúng bản giao nhận thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "DRAFT",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": null,
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đọc đúng bản giao nhận.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J06 — PUT /operations/flow6/revisions/{revisionId}

Thay nội dung draft.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Chỉ latest DRAFT chưa confirmed DELIVERY. horseId unique và đúng mapping; không nhận ID/actor/status FE tự cấp.

**Ghi dữ liệu / retry:** Khóa Handover/latest revision; đồng bộ HANDOVER/ITEM và ContentSnapshot nguyên tử. BE chụp tên và chip từng ngựa vào content.items.identity; request chỉ có horseId/kết quả kiểm, không nhận identity do FE tự cấp.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `DeliveryContent`

```json
{
  "location": "Tokyo Racecourse",
  "receiver": {
    "name": "Yuki Tanaka",
    "phone": "+81312345678",
    "authorized": true,
    "otpEmail": "receiver@example.com"
  },
  "commonDocuments": null,
  "items": [
    {
      "horseId": "HORSE_001",
      "microchipVerified": true,
      "condition": "Tỉnh táo, không có vết thương mới.",
      "assets": "Một dây dắt",
      "documents": null,
      "documentsReceivedAtUtc": null
    }
  ]
}
```

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Thay nội dung draft thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "DRAFT",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": null,
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: thay nội dung draft.",
  "data": null,
  "errorCode": "REVISION_NOT_EDITABLE"
}
```

## F6-J07 — POST /operations/flow6/revisions/{revisionId}/otp

Gửi hoặc gửi lại OTP.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Latest DRAFT/AWAITING_OTP; authorized=true, từng chip true, tình trạng/tài sản đã mô tả, đủ ngựa; hồ sơ bắt buộc thực dùng hợp lệ. Email actual được kiểm quyền, không nhập email mới ở đây.

**Ghi dữ liệu / retry:** Freeze snapshot; revision/Handover AWAITING_OTP. HMAC OTP theo revision/email với secret; resend sau policy, thay hash cũ, KHÔNG reset failed attempts. Không báo email delivered nếu chỉ queued; lỗi gửi trả lỗi, không log OTP.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — OtpState**

```json
{
  "success": true,
  "message": "Gửi hoặc gửi lại OTP thành công",
  "data": {
    "revisionId": "HANDOVER_REVISION_001",
    "expiresAtUtc": "2026-11-20T10:05:00Z",
    "resendAfterUtc": "2026-11-20T10:01:00Z",
    "attemptsRemaining": 5
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 429**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: gửi hoặc gửi lại otp.",
  "data": null,
  "errorCode": "OTP_RESEND_TOO_SOON"
}
```

## F6-J08 — POST /operations/flow6/revisions/{revisionId}/invalidate-otp

Thu hồi OTP để sửa draft.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Latest AWAITING_OTP chưa confirmed. Không sửa content trước thu hồi.

**Ghi dữ liệu / retry:** Về DRAFT; clear toàn bộ OTP metadata theo CHECK. Reset có chủ đích theo quyền, phải rate limit ngoài DB để không né max attempts. Lệnh này không đổi nội dung.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Thu hồi OTP để sửa draft thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "DRAFT",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": null,
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: thu hồi otp để sửa draft.",
  "data": null,
  "errorCode": "INVALID_STATE"
}
```

## F6-J09 — POST /operations/flow6/revisions/{revisionId}/confirm

Xác nhận nhận ngựa bằng OTP.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Latest AWAITING_OTP, chưa hết hạn/còn attempts, email/content không đổi; kiểm lại phân công/ngựa/ủy quyền. Nhân sự nhập mã người nhận cung cấp tại chỗ; không giả người nhận có account Customer.

**Ghi dữ liệu / retry:** Khóa Trip/Handover/revision; đúng OTP → clear hash, revision/Handover CONFIRMED, Trip COMPLETED, Request DELIVERED. Contract EFFECTIVE/version SIGNED. Retry confirmed trả kết quả cũ; không tạo settlement/payment.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `OtpInput`

```json
{
  "otp": "482913"
}
```

**Response 200 — ConfirmedDelivery**

```json
{
  "success": true,
  "message": "Xác nhận nhận ngựa bằng OTP thành công",
  "data": {
    "revision": {
      "id": "HANDOVER_REVISION_001",
      "handoverId": "HANDOVER_001",
      "number": 1,
      "status": "CONFIRMED",
      "content": {
        "location": "Tokyo Racecourse",
        "receiver": {
          "name": "Yuki Tanaka",
          "phone": "+81312345678",
          "authorized": true,
          "otpEmail": "receiver@example.com"
        },
        "commonDocuments": null,
        "items": [
          {
            "horseId": "HORSE_001",
            "microchipVerified": true,
            "condition": "Tỉnh táo, không có vết thương mới.",
            "assets": "Một dây dắt",
            "documents": null,
            "documentsReceivedAtUtc": null,
            "identity": {
              "name": "Thunderbolt",
              "microchip": "985112004571029"
            }
          }
        ]
      },
      "createdAtUtc": "2026-11-20T10:00:00Z",
      "confirmedAtUtc": "2026-11-20T10:04:00Z",
      "refusalReason": null,
      "refusedAtUtc": null
    },
    "lifecycle": {
      "tripStatus": "COMPLETED",
      "requestStatus": "DELIVERED",
      "contractStatus": "EFFECTIVE"
    }
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: xác nhận nhận ngựa bằng otp.",
  "data": null,
  "errorCode": "OTP_INVALID"
}
```

## F6-J10 — POST /operations/flow6/revisions/{revisionId}/refuse

Ghi nhận từ chối nhận.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Latest DRAFT/AWAITING_OTP chưa confirmed; nhân sự ghi từ chối thực tế, không phải giao thành công.

**Ghi dữ liệu / retry:** REFUSED và snapshot bất biến; clear OTP/attempts theo CHECK; Handover REFUSED, Trip IN_TRANSIT/Request IN_PROGRESS.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `ReasonInput`

```json
{
  "reason": "Người nhận yêu cầu kiểm tra thêm."
}
```

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Ghi nhận từ chối nhận thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "REFUSED",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": null,
    "refusalReason": "Người nhận yêu cầu kiểm tra thêm.",
    "refusedAtUtc": "2026-11-20T10:05:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: ghi nhận từ chối nhận.",
  "data": null,
  "errorCode": "INVALID_STATE"
}
```

## F6-J11 — POST /operations/flow6/handovers/{handoverId}/revisions

Lập bản giao lại.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Latest REFUSED, Trip IN_TRANSIT. Không tạo version mới sau DELIVERY confirmed.

**Ghi dữ liệu / retry:** Giữ REFUSED; insert revision số kế tiếp DRAFT TRƯỚC khi sửa ITEM để thỏa trigger. Cùng transaction đồng bộ content và Handover DRAFT. Header Idempotency-Key bắt buộc: cùng key/actor/operation và cùng payload trả bản ghi đã tạo; cùng key khác payload trả 409 IDEMPOTENCY_CONFLICT. Module idempotency bền vững phải lưu kết quả trước trả response; chưa tích hợp thì 501, không giả bảo đảm retry. BE chụp tên và chip từng ngựa vào content.items.identity; request chỉ có horseId/kết quả kiểm, không nhận identity do FE tự cấp.

**Path parameters:** `handoverId=HANDOVER_001`. ID chỉ ở URL, không lặp body.

**Header bắt buộc:** `Idempotency-Key: 7b9e8dc2-7357-4ef8-a765-2e7c7ee97001`.

**Request:** JSON `DeliveryContent`

```json
{
  "location": "Tokyo Racecourse",
  "receiver": {
    "name": "Yuki Tanaka",
    "phone": "+81312345678",
    "authorized": true,
    "otpEmail": "receiver@example.com"
  },
  "commonDocuments": null,
  "items": [
    {
      "horseId": "HORSE_001",
      "microchipVerified": true,
      "condition": "Tỉnh táo, không có vết thương mới.",
      "assets": "Một dây dắt",
      "documents": null,
      "documentsReceivedAtUtc": null
    }
  ]
}
```

**Response 201 — Revision**

```json
{
  "success": true,
  "message": "Lập bản giao lại thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "DRAFT",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": null,
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: lập bản giao lại.",
  "data": null,
  "errorCode": "DELIVERY_ALREADY_CONFIRMED"
}
```

## F6-J12 — GET /customer/flow6/settlements

Hồ sơ của Customer.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** CustomerID từ token; chưa có trả [].

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement[]**

```json
{
  "success": true,
  "message": "Hồ sơ của Customer thành công",
  "data": [
    {
      "id": "SETTLEMENT_001",
      "contractId": "CONTRACT_001",
      "tripId": "TRIP_001",
      "contractVersionNo": 1,
      "status": "DRAFT",
      "handoverRevisionId": null,
      "finalInvoiceId": null,
      "settledAtUtc": null,
      "closedAtUtc": null,
      "feedbackStartsAtUtc": null,
      "feedbackEndsAtUtc": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: hồ sơ của customer.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J13 — GET /customer/flow6/settlements/{settlementId}

Chi tiết tất toán Customer.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Khác chủ 404; không giá vốn/OTP hash.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement**

```json
{
  "success": true,
  "message": "Chi tiết tất toán Customer thành công",
  "data": {
    "id": "SETTLEMENT_001",
    "contractId": "CONTRACT_001",
    "tripId": "TRIP_001",
    "contractVersionNo": 1,
    "status": "DRAFT",
    "handoverRevisionId": null,
    "finalInvoiceId": null,
    "settledAtUtc": null,
    "closedAtUtc": null,
    "feedbackStartsAtUtc": null,
    "feedbackEndsAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: chi tiết tất toán customer.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J14 — GET /manager/flow6/settlements

Danh sách tất toán Manager.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Filter status optional; GET không tạo dòng.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Query tùy chọn:** status theo enum OpenAPI. Bỏ filter trả toàn bộ trong quyền.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement[]**

```json
{
  "success": true,
  "message": "Danh sách tất toán Manager thành công",
  "data": [
    {
      "id": "SETTLEMENT_001",
      "contractId": "CONTRACT_001",
      "tripId": "TRIP_001",
      "contractVersionNo": 1,
      "status": "DRAFT",
      "handoverRevisionId": null,
      "finalInvoiceId": null,
      "settledAtUtc": null,
      "closedAtUtc": null,
      "feedbackStartsAtUtc": null,
      "feedbackEndsAtUtc": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 403**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: danh sách tất toán manager.",
  "data": null,
  "errorCode": "FORBIDDEN_ROLE"
}
```

## F6-J15 — POST /manager/flow6/trips/{tripId}/settlement

Chuẩn bị hồ sơ tất toán.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Contract đúng Trip/Customer/current version SIGNED; được chuẩn bị DRAFT trước DELIVERY. Không mở window trước tất toán.

**Ghi dữ liệu / retry:** Create-or-get dưới khóa Contract/Trip và unique hiện có; retry cùng hồ sơ. Chỉ link DELIVERY CONFIRMED nếu có.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 201 — Settlement**

```json
{
  "success": true,
  "message": "Chuẩn bị hồ sơ tất toán thành công",
  "data": {
    "id": "SETTLEMENT_001",
    "contractId": "CONTRACT_001",
    "tripId": "TRIP_001",
    "contractVersionNo": 1,
    "status": "DRAFT",
    "handoverRevisionId": null,
    "finalInvoiceId": null,
    "settledAtUtc": null,
    "closedAtUtc": null,
    "feedbackStartsAtUtc": null,
    "feedbackEndsAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: chuẩn bị hồ sơ tất toán.",
  "data": null,
  "errorCode": "HANDOFF_INCONSISTENT"
}
```

## F6-J16 — GET /manager/flow6/settlements/{settlementId}

Chi tiết hồ sơ Manager.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Không lặp Customer/Request/Contract aggregate.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement**

```json
{
  "success": true,
  "message": "Chi tiết hồ sơ Manager thành công",
  "data": {
    "id": "SETTLEMENT_001",
    "contractId": "CONTRACT_001",
    "tripId": "TRIP_001",
    "contractVersionNo": 1,
    "status": "DRAFT",
    "handoverRevisionId": null,
    "finalInvoiceId": null,
    "settledAtUtc": null,
    "closedAtUtc": null,
    "feedbackStartsAtUtc": null,
    "feedbackEndsAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: chi tiết hồ sơ manager.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J17 — GET /manager/flow6/settlements/{settlementId}/balance

Tính còn phải thu.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Giá signed snapshot và khoản Manager quyết định; thiếu snapshot không fallback giá hiện tại.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Balance**

```json
{
  "success": true,
  "message": "Tính còn phải thu thành công",
  "data": {
    "signedPriceVnd": 20000000,
    "chargesVnd": 0,
    "discountsVnd": 0,
    "depositPaidVnd": 8000000,
    "finalDueVnd": 12000000,
    "finalPaidVnd": 0,
    "remainingVnd": 12000000,
    "financialReviewRequired": false
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: tính còn phải thu.",
  "data": null,
  "errorCode": "SIGNED_SNAPSHOT_UNAVAILABLE"
}
```

## F6-J18 — GET /customer/flow6/settlements/{settlementId}/balance

Customer xem nghĩa vụ tiền.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Cùng phép tính Manager; chỉ giá bán, không COST_ITEM giá vốn.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Balance**

```json
{
  "success": true,
  "message": "Customer xem nghĩa vụ tiền thành công",
  "data": {
    "signedPriceVnd": 20000000,
    "chargesVnd": 0,
    "discountsVnd": 0,
    "depositPaidVnd": 8000000,
    "finalDueVnd": 12000000,
    "finalPaidVnd": 0,
    "remainingVnd": 12000000,
    "financialReviewRequired": false
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: customer xem nghĩa vụ tiền.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J19 — POST /manager/flow6/settlements/{settlementId}/adjustments

Manager xác nhận điều chỉnh.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Không CLOSED; phải có final invoice hiện hành trước khi quyết định mọi adjustment. CHARGE/DISCOUNT chỉ AWAITING_PAYMENT và invoice nguồn chưa thu/không attempt chưa kết luận; REFUND có thể SETTLED nhưng nguồn đã thu đủ khoản. Nguồn phải đúng Trip/Contract/version. Không refund cọc hoặc tự biến Incident.AdditionalCost thành nợ.

**Ghi dữ liệu / retry:** CreatedBy=DecidedBy từ token, giờ server; OriginalInvoiceID=current final invoice luôn có. Khoản bất biến, không Status/Bearer. REFUND khởi tạo REQUESTED; CHARGE/DISCOUNT chưa áp khi AdjustedInvoiceID null. Chặn tạo payment-session/tất toán đến khi đã áp các khoản này. Không sửa signed Contract. Header Idempotency-Key bắt buộc: cùng key/actor/operation và cùng payload trả bản ghi đã tạo; cùng key khác payload trả 409 IDEMPOTENCY_CONFLICT. Module idempotency bền vững phải lưu kết quả trước trả response; chưa tích hợp thì 501, không giả bảo đảm retry.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Header bắt buộc:** `Idempotency-Key: 7b9e8dc2-7357-4ef8-a765-2e7c7ee97001`.

**Request:** JSON `AdjustmentInput`

```json
{
  "type": "CHARGE",
  "amountVnd": 1000000,
  "reason": "Chi phí bổ sung đã đối chiếu.",
  "decisionReason": "Xác nhận theo thỏa thuận."
}
```

**Response 201 — Adjustment**

```json
{
  "success": true,
  "message": "Manager xác nhận điều chỉnh thành công",
  "data": {
    "type": "CHARGE",
    "amountVnd": 1000000,
    "reason": "Chi phí bổ sung đã đối chiếu.",
    "decisionReason": "Xác nhận theo thỏa thuận.",
    "id": "SETTLEMENT_ADJUSTMENT_001",
    "settlementId": "SETTLEMENT_001",
    "originalInvoiceId": "INVOICE_001",
    "adjustedInvoiceId": null,
    "refundStatus": null,
    "decidedAtUtc": "2026-11-20T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager xác nhận điều chỉnh.",
  "data": null,
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED"
}
```

## F6-J20 — GET /manager/flow6/settlements/{settlementId}/adjustments

Điều chỉnh đã xác nhận.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** AdjustedInvoiceID null không nghĩa đã áp hóa đơn.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Adjustment[]**

```json
{
  "success": true,
  "message": "Điều chỉnh đã xác nhận thành công",
  "data": [
    {
      "type": "CHARGE",
      "amountVnd": 1000000,
      "reason": "Chi phí bổ sung đã đối chiếu.",
      "decisionReason": "Xác nhận theo thỏa thuận.",
      "id": "SETTLEMENT_ADJUSTMENT_001",
      "settlementId": "SETTLEMENT_001",
      "originalInvoiceId": "INVOICE_001",
      "adjustedInvoiceId": null,
      "refundStatus": null,
      "decidedAtUtc": "2026-11-20T10:00:00Z"
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: điều chỉnh đã xác nhận.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J21 — GET /customer/flow6/settlements/{settlementId}/adjustments

Customer xem điều chỉnh.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Không evidence/giá vốn nội bộ; CostItemID chỉ là nguồn ID, không cấp quyền đọc chi phí.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Adjustment[]**

```json
{
  "success": true,
  "message": "Customer xem điều chỉnh thành công",
  "data": [
    {
      "type": "CHARGE",
      "amountVnd": 1000000,
      "reason": "Chi phí bổ sung đã đối chiếu.",
      "decisionReason": "Xác nhận theo thỏa thuận.",
      "id": "SETTLEMENT_ADJUSTMENT_001",
      "settlementId": "SETTLEMENT_001",
      "originalInvoiceId": "INVOICE_001",
      "adjustedInvoiceId": null,
      "refundStatus": null,
      "decidedAtUtc": "2026-11-20T10:00:00Z"
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: customer xem điều chỉnh.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J22 — POST /manager/flow6/settlements/{settlementId}/final-invoice

Phát hành hoặc thay invoice cuối.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** DELIVERY CONFIRMED, Trip COMPLETED/Request DELIVERED. Invoice nguồn chỉ thay khi chưa thu và không attempt chưa kết luận. Có tiền cũ trả 409, không phân bổ ngầm.

**Ghi dữ liệu / retry:** Khóa settlement/invoice/attempt. Nghĩa vụ theo Balance. Hủy invoice cũ TRƯỚC insert để thỏa unique filtered index; tạo FINAL_SETTLEMENT, link adjustments và FinalInvoiceID, AWAITING_PAYMENT nguyên tử. Không thu lại cọc. Retry không có điều chỉnh mới trả invoice hiện tại. Invoice đầu lấy giá ký trừ cọc, chưa có adjustment. Các lần thay chỉ áp batch chưa áp có OriginalInvoiceID=current invoice; khoản nguồn khác bị chặn. BE check số tiền sau công thức không âm hoặc tràn SQL.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `InvoiceInput`

```json
{
  "dueAtUtc": "2026-11-22T10:00:00Z"
}
```

**Response 201 — Invoice**

```json
{
  "success": true,
  "message": "Phát hành hoặc thay invoice cuối thành công",
  "data": {
    "id": "INVOICE_001",
    "settlementId": "SETTLEMENT_001",
    "totalVnd": 12000000,
    "paidVnd": 0,
    "status": "UNPAID",
    "dueAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: phát hành hoặc thay invoice cuối.",
  "data": null,
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED"
}
```

## F6-J23 — GET /customer/flow6/settlements/{settlementId}/invoice

Đọc invoice cuối hiện hành.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Chưa phát hành trả 404 FINAL_INVOICE_NOT_FOUND.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Invoice**

```json
{
  "success": true,
  "message": "Đọc invoice cuối hiện hành thành công",
  "data": {
    "id": "INVOICE_001",
    "settlementId": "SETTLEMENT_001",
    "totalVnd": 12000000,
    "paidVnd": 0,
    "status": "UNPAID",
    "dueAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đọc invoice cuối hiện hành.",
  "data": null,
  "errorCode": "FINAL_INVOICE_NOT_FOUND"
}
```

## F6-J24 — POST /customer/flow6/invoices/{invoiceId}/payment-session

Tạo phiên VNPay trả số dư.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Current FINAL_SETTLEMENT chưa đủ tiền, settlement AWAITING_PAYMENT. BE lấy remaining; còn attempt chưa kết luận trả 409. Không có CHARGE/DISCOUNT chưa áp hóa đơn hoặc refund/review chưa đối soát; đối chiếu total invoice với Balance trước redirect.

**Ghi dữ liệu / retry:** Lưu PAYMENT PENDING_GATEWAY trước redirect, TxnRef gắn PaymentID; không nhận amount/method body. Adapter/IPN dùng chung, không confirm tiền thủ công.

**Path parameters:** `invoiceId=INVOICE_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 201 — PaymentSession**

```json
{
  "success": true,
  "message": "Tạo phiên VNPay trả số dư thành công",
  "data": {
    "paymentId": "PAYMENT_001",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?example=1",
    "expiresAtUtc": "2026-11-20T10:15:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: tạo phiên vnpay trả số dư.",
  "data": null,
  "errorCode": "PAYMENT_IN_PROGRESS"
}
```

## F6-J25 — GET /customer/flow6/payments/{paymentId}

Đọc thanh toán số dư.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Quyền qua invoice → settlement. Return không cập nhật tiền.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `paymentId=PAYMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Payment**

```json
{
  "success": true,
  "message": "Đọc thanh toán số dư thành công",
  "data": {
    "id": "PAYMENT_001",
    "invoiceId": "INVOICE_001",
    "amountVnd": 12000000,
    "status": "PENDING_GATEWAY",
    "financialReviewRequired": false
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đọc thanh toán số dư.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J26 — POST /manager/flow6/settlements/{settlementId}/settle

Xác nhận nghiệm thu và tất toán.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** DELIVERY CONFIRMED, final invoice PAID, không nợ/ngoại lệ, mọi điều chỉnh đã áp/hoàn đủ. Complaint mở không cấm ghi đủ tiền nhưng chặn đóng/reset.

**Ghi dữ liệu / retry:** SETTLED + SettledBy/At, Contract SETTLED, Request DELIVERED. Mở window policy; complaint mở giữ đơn mở và reset sau giải quyết hết. Retry SETTLED không reset window.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement**

```json
{
  "success": true,
  "message": "Xác nhận nghiệm thu và tất toán thành công",
  "data": {
    "id": "SETTLEMENT_001",
    "contractId": "CONTRACT_001",
    "tripId": "TRIP_001",
    "contractVersionNo": 1,
    "status": "SETTLED",
    "handoverRevisionId": "HANDOVER_REVISION_001",
    "finalInvoiceId": "INVOICE_001",
    "settledAtUtc": "2026-11-20T10:00:00Z",
    "closedAtUtc": null,
    "feedbackStartsAtUtc": "2026-11-20T10:00:00Z",
    "feedbackEndsAtUtc": "2026-11-21T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: xác nhận nghiệm thu và tất toán.",
  "data": null,
  "errorCode": "SETTLEMENT_NOT_READY"
}
```

## F6-J27 — POST /manager/flow6/adjustments/{adjustmentId}/refund-processing

Ghi bắt đầu xử lý hoàn.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Chỉ REFUND REQUESTED với invoice nguồn đúng; không gọi chuyển tiền.

**Ghi dữ liệu / retry:** REQUESTED → PROCESSING; retry PROCESSING trả hiện tại, không lùi COMPLETED.

**Path parameters:** `adjustmentId=SETTLEMENT_ADJUSTMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Refund**

```json
{
  "success": true,
  "message": "Ghi bắt đầu xử lý hoàn thành công",
  "data": {
    "adjustmentId": "SETTLEMENT_ADJUSTMENT_001",
    "status": "PROCESSING",
    "reference": null,
    "refundedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: ghi bắt đầu xử lý hoàn.",
  "data": null,
  "errorCode": "INVALID_STATE"
}
```

## F6-J28 — POST /manager/flow6/adjustments/{adjustmentId}/refund-complete

Ghi bằng chứng hoàn đủ khoản.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** REQUESTED/PROCESSING; một giao dịch đủ Amount, tổng refund <= tiền nguồn. Check reference chống trùng trong transaction; schema chưa hỗ trợ chia nhiều lần chuyển.

**Ghi dữ liệu / retry:** COMPLETED + RefundedBy token/At/reference; trigger bất biến. Retry cùng bằng chứng trả cũ, khác bằng chứng 409. Không tạo PAYMENT REFUND hoặc sửa SUCCESS → FAILED.

**Path parameters:** `adjustmentId=SETTLEMENT_ADJUSTMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `RefundInput`

```json
{
  "reference": "REFUND-REAL-001",
  "refundedAtUtc": "2026-11-20T11:00:00Z"
}
```

**Response 200 — Refund**

```json
{
  "success": true,
  "message": "Ghi bằng chứng hoàn đủ khoản thành công",
  "data": {
    "adjustmentId": "SETTLEMENT_ADJUSTMENT_001",
    "status": "COMPLETED",
    "reference": "REFUND-REAL-001",
    "refundedAtUtc": "2026-11-20T11:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: ghi bằng chứng hoàn đủ khoản.",
  "data": null,
  "errorCode": "REFUND_EVIDENCE_CONFLICT"
}
```

## F6-J29 — POST /customer/flow6/settlements/{settlementId}/cases

Gửi khiếu nại/hỗ trợ.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** COMPLAINT sau DELIVERY trước CLOSED; còn nợ/chưa có window vẫn gửi được; nếu có window thì phải trước hạn. SUPPORT được tạo sau CLOSED, không mở lại.

**Ghi dữ liệu / retry:** Khóa settlement cùng close/reset; OPEN. Complaint chặn đóng nhưng không sửa payment. Không chat/accept-result. Header Idempotency-Key bắt buộc: cùng key/actor/operation và cùng payload trả bản ghi đã tạo; cùng key khác payload trả 409 IDEMPOTENCY_CONFLICT. Module idempotency bền vững phải lưu kết quả trước trả response; chưa tích hợp thì 501, không giả bảo đảm retry.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Header bắt buộc:** `Idempotency-Key: 7b9e8dc2-7357-4ef8-a765-2e7c7ee97001`.

**Request:** JSON `CaseInput`

```json
{
  "type": "COMPLAINT",
  "subject": "Tình trạng ngựa lúc nhận",
  "description": "Cần giải thích tình trạng trong biên bản."
}
```

**Response 201 — Case**

```json
{
  "success": true,
  "message": "Gửi khiếu nại/hỗ trợ thành công",
  "data": {
    "type": "COMPLAINT",
    "subject": "Tình trạng ngựa lúc nhận",
    "description": "Cần giải thích tình trạng trong biên bản.",
    "id": "CUSTOMER_CASE_001",
    "settlementId": "SETTLEMENT_001",
    "status": "OPEN",
    "resolution": null,
    "openedAtUtc": "2026-11-20T10:00:00Z",
    "resolvedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: gửi khiếu nại/hỗ trợ.",
  "data": null,
  "errorCode": "COMPLAINT_WINDOW_CLOSED"
}
```

## F6-J30 — GET /customer/flow6/settlements/{settlementId}/cases

Theo dõi phiếu Customer.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Chỉ chủ; RESOLVED vẫn đọc được.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Case[]**

```json
{
  "success": true,
  "message": "Theo dõi phiếu Customer thành công",
  "data": [
    {
      "type": "COMPLAINT",
      "subject": "Tình trạng ngựa lúc nhận",
      "description": "Cần giải thích tình trạng trong biên bản.",
      "id": "CUSTOMER_CASE_001",
      "settlementId": "SETTLEMENT_001",
      "status": "OPEN",
      "resolution": null,
      "openedAtUtc": "2026-11-20T10:00:00Z",
      "resolvedAtUtc": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: theo dõi phiếu customer.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J31 — GET /manager/flow6/cases

Hàng đợi khiếu nại/hỗ trợ.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Filter status/type optional; không claim độc quyền.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Query tùy chọn:** status theo enum OpenAPI; type=COMPLAINT/SUPPORT. Bỏ filter trả toàn bộ trong quyền.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Case[]**

```json
{
  "success": true,
  "message": "Hàng đợi khiếu nại/hỗ trợ thành công",
  "data": [
    {
      "type": "COMPLAINT",
      "subject": "Tình trạng ngựa lúc nhận",
      "description": "Cần giải thích tình trạng trong biên bản.",
      "id": "CUSTOMER_CASE_001",
      "settlementId": "SETTLEMENT_001",
      "status": "OPEN",
      "resolution": null,
      "openedAtUtc": "2026-11-20T10:00:00Z",
      "resolvedAtUtc": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 403**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: hàng đợi khiếu nại/hỗ trợ.",
  "data": null,
  "errorCode": "FORBIDDEN_ROLE"
}
```

## F6-J32 — POST /manager/flow6/cases/{caseId}/start

Đánh dấu đang xử lý.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** OPEN/IN_PROGRESS; Manager nào cũng xử lý được.

**Ghi dữ liệu / retry:** IN_PROGRESS + HandledBy/At server; RESOLVED không mở lại, khách còn ý kiến tạo phiếu mới.

**Path parameters:** `caseId=CUSTOMER_CASE_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Case**

```json
{
  "success": true,
  "message": "Đánh dấu đang xử lý thành công",
  "data": {
    "type": "COMPLAINT",
    "subject": "Tình trạng ngựa lúc nhận",
    "description": "Cần giải thích tình trạng trong biên bản.",
    "id": "CUSTOMER_CASE_001",
    "settlementId": "SETTLEMENT_001",
    "status": "IN_PROGRESS",
    "resolution": null,
    "openedAtUtc": "2026-11-20T10:00:00Z",
    "resolvedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đánh dấu đang xử lý.",
  "data": null,
  "errorCode": "INVALID_STATE"
}
```

## F6-J33 — POST /manager/flow6/cases/{caseId}/resolve

Manager phản hồi rồi đóng phiếu.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** OPEN/IN_PROGRESS; không cần Customer đồng ý theo rule hiện hành; điều chỉnh tiền là nghiệp vụ riêng.

**Ghi dữ liệu / retry:** RESOLVED với ResolutionText/HandledBy/HandledAt/ResolvedAt. Complaint cuối + SETTLED + tiền hoàn thành → reset window đủ thời lượng trong transaction. Nếu tiền chưa xong thì J36 xử lý sau; retry không reset thêm.

**Path parameters:** `caseId=CUSTOMER_CASE_001`. ID chỉ ở URL, không lặp body.

**Request:** JSON `ResolveInput`

```json
{
  "resolution": "Đã giải thích và xử lý theo thỏa thuận."
}
```

**Response 200 — Case**

```json
{
  "success": true,
  "message": "Manager phản hồi rồi đóng phiếu thành công",
  "data": {
    "type": "COMPLAINT",
    "subject": "Tình trạng ngựa lúc nhận",
    "description": "Cần giải thích tình trạng trong biên bản.",
    "id": "CUSTOMER_CASE_001",
    "settlementId": "SETTLEMENT_001",
    "status": "RESOLVED",
    "resolution": "Đã giải thích và xử lý theo thỏa thuận.",
    "openedAtUtc": "2026-11-20T10:00:00Z",
    "resolvedAtUtc": "2026-11-20T11:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager phản hồi rồi đóng phiếu.",
  "data": null,
  "errorCode": "INVALID_STATE"
}
```

## F6-J34 — POST /customer/flow6/settlements/{settlementId}/feedback

Gửi đánh giá thông thường.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** SETTLED, server now trong window, một feedback/settlement theo unique kể cả reset. Rating không complaint.

**Ghi dữ liệu / retry:** Insert rating/comment và giờ server. Không chặn đóng/reset. Đã có trả 409 FEEDBACK_EXISTS. Header Idempotency-Key bắt buộc: cùng key/actor/operation và cùng payload trả bản ghi đã tạo; cùng key khác payload trả 409 IDEMPOTENCY_CONFLICT. Module idempotency bền vững phải lưu kết quả trước trả response; chưa tích hợp thì 501, không giả bảo đảm retry.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Header bắt buộc:** `Idempotency-Key: 7b9e8dc2-7357-4ef8-a765-2e7c7ee97001`.

**Request:** JSON `FeedbackInput`

```json
{
  "rating": 5
}
```

**Response 201 — Feedback**

```json
{
  "success": true,
  "message": "Gửi đánh giá thông thường thành công",
  "data": {
    "rating": 5,
    "comment": null,
    "id": "CUSTOMER_FEEDBACK_001",
    "createdAtUtc": "2026-11-20T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: gửi đánh giá thông thường.",
  "data": null,
  "errorCode": "FEEDBACK_EXISTS"
}
```

## F6-J35 — GET /customer/flow6/settlements/{settlementId}/feedback

Đọc đánh giá đã gửi.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Chưa có trả 404, không bịa đánh giá.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Feedback**

```json
{
  "success": true,
  "message": "Đọc đánh giá đã gửi thành công",
  "data": {
    "rating": 5,
    "comment": null,
    "id": "CUSTOMER_FEEDBACK_001",
    "createdAtUtc": "2026-11-20T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đọc đánh giá đã gửi.",
  "data": null,
  "errorCode": "FEEDBACK_NOT_FOUND"
}
```

## F6-J36 — POST /manager/flow6/settlements/{settlementId}/restart-feedback-window

Mở lại window sau khiếu nại/tiền.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** SETTLED, có complaint RESOLVED sau starts hiện hành; không còn complaint mở hoặc nợ/refund. Không reset tùy ý khi refresh.

**Ghi dữ liệu / retry:** Khóa settlement; max ResolvedAt làm căn cứ chống lặp. starts=server now, ends=starts+policy. Không history window.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Settlement**

```json
{
  "success": true,
  "message": "Mở lại window sau khiếu nại/tiền thành công",
  "data": {
    "id": "SETTLEMENT_001",
    "contractId": "CONTRACT_001",
    "tripId": "TRIP_001",
    "contractVersionNo": 1,
    "status": "SETTLED",
    "handoverRevisionId": "HANDOVER_REVISION_001",
    "finalInvoiceId": "INVOICE_001",
    "settledAtUtc": "2026-11-20T10:00:00Z",
    "closedAtUtc": null,
    "feedbackStartsAtUtc": "2026-11-20T10:00:00Z",
    "feedbackEndsAtUtc": "2026-11-21T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: mở lại window sau khiếu nại/tiền.",
  "data": null,
  "errorCode": "FEEDBACK_RESET_NOT_DUE"
}
```

## F6-J37 — POST /manager/flow6/settlements/{settlementId}/close

Đóng hồ sơ đủ điều kiện.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** SETTLED, hết window, không complaint mở/pending refund/adjustment/review/nợ. Nếu complaint resolved sau starts thì reset trước, không đóng.

**Ghi dữ liệu / retry:** Khóa cùng case/payment; CLOSED + ClosedAt, Request/Contract CLOSED. Trip COMPLETED/version SIGNED. Retry giữ mốc cũ. Worker tự đóng dùng cùng service guard, không public cron endpoint.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — CloseResult**

```json
{
  "success": true,
  "message": "Đóng hồ sơ đủ điều kiện thành công",
  "data": {
    "settlementId": "SETTLEMENT_001",
    "closedAtUtc": "2026-11-20T10:00:00Z",
    "lifecycle": {
      "tripStatus": "COMPLETED",
      "requestStatus": "CLOSED",
      "contractStatus": "CLOSED"
    }
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đóng hồ sơ đủ điều kiện.",
  "data": null,
  "errorCode": "CLOSE_BLOCKED"
}
```

## F6-J38 — GET /operations/flow6/trips/{tripId}/pickup-baseline

Đọc baseline PICKUP.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Chỉ PICKUP CONFIRMED cùng Trip. Thiếu trả [] và context warnings; snapshot cũ không có OTP thì không mô tả là đã OTP.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — PickupReference[]**

```json
{
  "success": true,
  "message": "Đọc baseline PICKUP thành công",
  "data": [
    {
      "handoverId": "HANDOVER_001",
      "receiverName": "Nguyen Van A",
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null
        }
      ]
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: đọc baseline pickup.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J39 — GET /operations/flow6/trips/{tripId}/health-logs

Tham chiếu sức khỏe đã ghi.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Cùng Trip/ngựa Request; chỉ đọc, không kiểm chuỗi HEALTHY/NORMAL.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — HealthReference[]**

```json
{
  "success": true,
  "message": "Tham chiếu sức khỏe đã ghi thành công",
  "data": [
    {
      "id": "HEALTH_LOG_001",
      "horseId": "HORSE_001",
      "recordedAtUtc": "2026-11-20T10:00:00Z",
      "description": null,
      "healthStatus": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: tham chiếu sức khỏe đã ghi.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J40 — GET /operations/flow6/trips/{tripId}/incidents

Tham chiếu sự cố hành trình.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Không yêu cầu mọi incident RESOLVED để mở Flow6. Không trả giá vốn/AdditionalCost cho caller này.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `tripId=TRIP_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — IncidentReference[]**

```json
{
  "success": true,
  "message": "Tham chiếu sự cố hành trình thành công",
  "data": [
    {
      "id": "INCIDENT_001",
      "status": null,
      "description": null
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: tham chiếu sự cố hành trình.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J41 — GET /customer/flow6/settlements/{settlementId}/delivery

Customer đọc biên bản đã nhận.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Chỉ bản DELIVERY CONFIRMED settlement đang liên kết; không leak draft hoặc OTP hash.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Customer đọc biên bản đã nhận thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "CONFIRMED",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": "2026-11-20T10:04:00Z",
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: customer đọc biên bản đã nhận.",
  "data": null,
  "errorCode": "DELIVERY_NOT_CONFIRMED"
}
```

## F6-J42 — GET /manager/flow6/settlements/{settlementId}/delivery

Manager đọc biên bản nghiệm thu.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Đúng revision settlement đã liên kết; chưa có confirmed trả 404.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Revision**

```json
{
  "success": true,
  "message": "Manager đọc biên bản nghiệm thu thành công",
  "data": {
    "id": "HANDOVER_REVISION_001",
    "handoverId": "HANDOVER_001",
    "number": 1,
    "status": "CONFIRMED",
    "content": {
      "location": "Tokyo Racecourse",
      "receiver": {
        "name": "Yuki Tanaka",
        "phone": "+81312345678",
        "authorized": true,
        "otpEmail": "receiver@example.com"
      },
      "commonDocuments": null,
      "items": [
        {
          "horseId": "HORSE_001",
          "microchipVerified": true,
          "condition": "Tỉnh táo, không có vết thương mới.",
          "assets": "Một dây dắt",
          "documents": null,
          "documentsReceivedAtUtc": null,
          "identity": {
            "name": "Thunderbolt",
            "microchip": "985112004571029"
          }
        }
      ]
    },
    "createdAtUtc": "2026-11-20T10:00:00Z",
    "confirmedAtUtc": "2026-11-20T10:04:00Z",
    "refusalReason": null,
    "refusedAtUtc": null
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager đọc biên bản nghiệm thu.",
  "data": null,
  "errorCode": "DELIVERY_NOT_CONFIRMED"
}
```

## F6-J43 — GET /manager/flow6/settlements/{settlementId}/feedback

Manager đọc đánh giá.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Chưa có trả 404 FEEDBACK_NOT_FOUND.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Feedback**

```json
{
  "success": true,
  "message": "Manager đọc đánh giá thành công",
  "data": {
    "rating": 5,
    "comment": null,
    "id": "CUSTOMER_FEEDBACK_001",
    "createdAtUtc": "2026-11-20T10:00:00Z"
  }
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager đọc đánh giá.",
  "data": null,
  "errorCode": "FEEDBACK_NOT_FOUND"
}
```

## F6-J44 — GET /manager/flow6/settlements/{settlementId}/payments

Manager đọc giao dịch số dư.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Tất cả attempt invoice FINAL_SETTLEMENT đúng Contract/version, gồm invoice cũ để đối soát. Chỉ đọc; không confirm/reject thủ công.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Payment[]**

```json
{
  "success": true,
  "message": "Manager đọc giao dịch số dư thành công",
  "data": [
    {
      "id": "PAYMENT_001",
      "invoiceId": "INVOICE_001",
      "amountVnd": 12000000,
      "status": "PENDING_GATEWAY",
      "financialReviewRequired": false
    }
  ]
}
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager đọc giao dịch số dư.",
  "data": null,
  "errorCode": "NOT_FOUND"
}
```

## F6-J45 — GET /operations/flow6/revisions/{revisionId}/pdf

Xuất PDF đúng bản biên bản.

**Quyền:** DRIVER_ESCORT được gán DriverID hoặc EscortID trên TRIP_VEHICLE_ASSIGNMENT của Trip; không suy từ Specialist/Coordinator.

**Điều kiện:** Chỉ revision AWAITING_OTP/CONFIRMED/REFUSED theo phân công; DRAFT chưa freeze trả 409. Render từ ContentSnapshot đúng bản, không từ item hiện tại.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `revisionId=HANDOVER_REVISION_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="delivery.pdf"

<bytes PDF sinh từ đúng snapshot>
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 409**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: xuất pdf đúng bản biên bản.",
  "data": null,
  "errorCode": "REVISION_NOT_FROZEN"
}
```

## F6-J46 — GET /customer/flow6/settlements/{settlementId}/delivery/pdf

Customer tải biên bản đã nhận.

**Quyền:** CUSTOMER sở hữu settlement/Contract

**Điều kiện:** Chỉ DELIVERY CONFIRMED mà settlement liên kết, đúng owner. Render từ snapshot, không mở draft/OTP hash.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="delivery.pdf"

<bytes PDF sinh từ đúng snapshot>
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: customer tải biên bản đã nhận.",
  "data": null,
  "errorCode": "DELIVERY_NOT_CONFIRMED"
}
```

## F6-J47 — GET /manager/flow6/settlements/{settlementId}/delivery/pdf

Manager tải biên bản nghiệm thu.

**Quyền:** LOGISTICS_MANAGER

**Điều kiện:** Chỉ DELIVERY CONFIRMED được settlement liên kết; chưa có trả 404. Không bịa URL storage hoặc PdfUrl không có SQL.

**Ghi dữ liệu / retry:** Chỉ đọc, không tạo bản ghi hoặc đổi trạng thái.

**Path parameters:** `settlementId=SETTLEMENT_001`. ID chỉ ở URL, không lặp body.

**Request:** Không gửi body; không gửi {} hoặc null thay thế.

**Response 200 — Binary**

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="delivery.pdf"

<bytes PDF sinh từ đúng snapshot>
```

**Lỗi nghiệp vụ tiêu biểu — HTTP 404**

```json
{
  "success": false,
  "message": "Không thể thực hiện thao tác: manager tải biên bản nghiệm thu.",
  "data": null,
  "errorCode": "DELIVERY_NOT_CONFIRMED"
}
```
