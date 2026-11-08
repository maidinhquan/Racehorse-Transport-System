# Flow 1 mới — Danh sách JSON Request / Response cho FE và BE

| Thuộc tính | Giá trị |
|---|---|
| Ngày | 06/11/2026 |
| Nhánh | `MoreBusinessRuleFlow1`, baseline `origin/main` tại `b97f4dd` |
| Nghiệp vụ | [Flow1_UML_Ban_Chot.drawio](../../../data/Flow1_UML_Ban_Chot.drawio) |
| Mẫu trình bày | [FLOW1-API-JSON.md](FLOW1-API-JSON.md) |
| Phạm vi | 10 API mới và 26 API cần sửa cho Flow 1 |
| Trạng thái | Thiết kế đích. Hai bản `flow1.openapi.json` mô tả phần đã nối vào ứng dụng. |

Trên nhánh triển khai, UI đọc phiên xét duyệt bằng `GET /manager/requests/{requestId}/reviews` và đọc yêu cầu phản hồi bằng `GET /customer/requests/{requestId}/schedule-response`. Quản lý chỉ yêu cầu khách bổ sung khi chưa chấp thuận Request. Sau chấp thuận, API trả lỗi 409 nếu yêu cầu quay lại bước khách sửa và gửi lại. Lịch thay thế do Điều phối đề xuất phải có kết luận FEASIBLE. Trạng thái NEEDS_FOLLOW_UP dành cho giấy tờ trước khởi hành, phải có hạn khách nộp từ hôm nay đến hết ngày đi. Khi khách đồng ý lịch thay thế, Request cập nhật ngày nhận, ngày giao và phương thức ngay, trạng thái vẫn chờ Quản lý duyệt. Khoản đã nhận chuyển qua hủy và ghi nhận hoàn cọc nếu khách dừng. Hai thao tác legacy của Manager trên giao dịch VNPay chỉ đối soát hoặc áp dụng khoản đã được VNPay xác minh.

Cài schema trước khi chạy API mới trên database có sẵn. [Script nâng cấp Flow 1](../../../backend/database/flow1-request-review-upgrade.sql)

## 1. Cách sử dụng và quy tắc đọc JSON

- Mọi đường dẫn dưới đây tính từ `/api`. Endpoint ứng dụng yêu cầu Bearer token. Khi có JSON, gửi `Content-Type: application/json`. GET hoặc POST ghi **Không gửi body** thì để trống body.
- Mã F1-J cũ giữ theo tài liệu mẫu. **MỚI** là endpoint cần thêm. **SỬA** giữ method và path, có thể đổi điều kiện, body hoặc response. Các ví dụ là payload độc lập. Dùng ID và version do backend trả về.
- Response JSON ứng dụng dùng `success`, `message`, `data`. Lỗi có `errorCode` và `errors` nếu cần báo từng trường. Danh sách nằm trực tiếp trong `data` và dùng `[]` khi rỗng. Tệp và IPN có định dạng riêng.
- Tiền dùng VND nguyên đồng. Manager nhập các khoản giá và tỷ lệ cọc. Backend tính tổng và số dư. ID mới do backend cấp. Các trường `status`, người xử lý và ngày hết hạn do backend quyết định.
- Trường mới kết thúc bằng `AtUtc` trả ISO 8601 UTC với hậu tố `Z`. Lịch yêu cầu dùng ngày `yyyy-MM-dd`. Trường legacy `departAt` và `arriveAt` trong editor giữ `yyyy-MM-dd HH:mm` theo cách backend hiện hành đọc là UTC. Ví dụ `2026-11-23 01:00` tương ứng 08:00 tại Việt Nam. FE hiển thị theo múi giờ nghiệp vụ của từng địa điểm.
- Khi gửi và chấp nhận, tính ngày tối thiểu theo ngày địa phương của điểm lấy ngựa. Khi phát hành, gia hạn và ký, so sánh thời điểm thực tế. Backend trả ngày sớm nhất cho FE thay vì để FE tự cộng.
- Thứ tự chính là **Điều phối → Specialist theo từng phương án → Manager → khách đồng ý hợp đồng → cọc xác minh đủ → ký OTP → Trip**. Kết quả xét duyệt trước hợp đồng gắn với Request. Phân công sau ký vẫn dùng F1-J58. Tạm bỏ tranh tài nguyên giữa các Request.
- Ranh giới tích hợp: Flow 1 đọc danh mục xe, dịch vụ bay và hồ sơ nguồn. Endpoint `start-planning` thuộc Flow 3 và việc xử lý đường tạo Trip cũ cần phối hợp với người phụ trách Flow 3.

| Mốc | Điều kiện |
|---|---|
| Gửi hoặc gửi lại với thay đổi ảnh hưởng lịch | Thời gian chuẩn bị + đệm + dự phòng xét duyệt. Mặc định đường bộ 8 ngày, hàng không 12 ngày |
| Manager chấp nhận | Thời gian chuẩn bị + đệm. Mặc định đường bộ 5 ngày, hàng không 9 ngày |
| Phát hành, cấp lại hạn hoặc gia hạn | Hạn hoàn tất mới cộng thời gian chuẩn bị không vượt thời điểm lấy ngựa |
| Gửi OTP và ghi nhận ký | Thời gian từ hiện tại đến lấy ngựa còn đủ 3/7 ngày theo phương thức |
| Chờ khách trước hợp đồng | Mặc định 24 giờ theo cấu hình. Tính từ khi Manager gửi nội dung cần phản hồi |
| Cọc, xác minh cọc và ký | Một hạn chung mặc định 24 giờ theo cấu hình. Hai ngày đệm là tham số kiểm tra lịch |

**Đợt xét duyệt và trạng thái**

| Trường | Ý nghĩa |
|---|---|
| `requestRevision` | Số lần thay đổi dữ liệu xét duyệt. Backend bắt đầu từ 1, tăng khi khách gửi lại dữ liệu. Khách đồng ý một phương án đã đánh giá không tăng revision |
| `reviewId` | ID đợt xét duyệt. Mỗi Request có tối đa một đợt đang mở. Đợt cũ vẫn đọc được theo phân quyền |
| `review.stage` | `WAITING_COORDINATOR`, `WAITING_SPECIALIST`, `READY_FOR_MANAGER`, `WAITING_CUSTOMER`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `SUPERSEDED`. Đây là trạng thái đợt xét duyệt, tách khỏi `Request.status` |
| `scheduleOptionId` | ID của một phương án trong đợt. Phương án `ORIGINAL` lấy từ yêu cầu. Phương án `PROPOSED` do Điều phối đề xuất |
| `checklistVersion` | Phiên bản checklist của phương án. Nếu hồ sơ nguồn đổi, đánh dấu kết quả bị ảnh hưởng cần kiểm tra lại |
| `customerAction` | Hành động Manager yêu cầu khách thực hiện. `SUPPLEMENT_DOCUMENTS` dùng F1-J19, `CONFIRM_SCHEDULE` dùng F1-J80 |
| `paymentOutcome` | `SUCCESS` đã xác minh và áp dụng, `FAILED` thất bại đã xác định, `UNCONFIRMED` đang chờ xác minh hoặc cần đối soát |
| `refundStatus` | `REQUESTED` đã ghi nghĩa vụ hoàn, `PROCESSING` đang thực hiện hoặc còn phải theo dõi, `COMPLETED` đã xác minh hoàn tất |

Worker hết hạn chỉ hủy khi Request vẫn chờ khách đúng đợt, đã tới hạn, chưa ký và không có tiền cần đối soát. API phản hồi kiểm tra cùng điều kiện trong transaction để xử lý hai thao tác đến đồng thời. Hết hạn hợp đồng khóa cọc và ký, còn Request giữ để Manager xử lý. Tiền về muộn vẫn được ghi nhận.

## 2. Lỗi chung áp dụng cho mọi endpoint

| HTTP | errorCode | Điều kiện |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body hoặc query không đúng |
| 401 | `UNAUTHORIZED` | Chưa xác thực |
| 403 | `FORBIDDEN_ROLE` | Sai vai trò |
| 404 | `NOT_FOUND` | Không tồn tại hoặc tài nguyên không thuộc phạm vi được xem |
| 409 | `INVALID_STATE` | Trạng thái đã đổi hoặc thao tác sai bước |
| 409 | `REQUEST_REVIEW_STALE` | Đợt xét duyệt hoặc revision đã thay đổi |
| 429 | `RATE_LIMITED` | Vượt giới hạn thao tác |

**Response lỗi 400 — VALIDATION_ERROR**

```json
{
  "success": false,
  "message": "Ngày lấy ngựa không hợp lệ.",
  "errorCode": "VALIDATION_ERROR",
  "data": null,
  "errors": {
    "expectedTransportDate": [
      "Dùng định dạng yyyy-MM-dd."
    ]
  }
}
```

## 3. Danh mục endpoint

| Mã | Thay đổi | Method | Endpoint | Vai trò |
|---|---|---|---|---|
| F1-J09 | **SỬA** | GET | `/customer/request-form-options` | CUSTOMER |
| F1-J18 | **SỬA** | POST | `/customer/requests` | CUSTOMER |
| F1-J19 | **SỬA** | PUT | `/customer/requests/{requestId}` | CUSTOMER |
| F1-J72 | **MỚI** | POST | `/manager/requests/{requestId}/reviews` | LOGISTICS_MANAGER |
| F1-J73 | **MỚI** | GET | `/coordinator/request-reviews` | FLEET_ROUTE_COORDINATOR |
| F1-J74 | **MỚI** | GET | `/coordinator/request-reviews/{reviewId}` | FLEET_ROUTE_COORDINATOR |
| F1-J75 | **MỚI** | POST | `/coordinator/request-reviews/{reviewId}/assessment` | FLEET_ROUTE_COORDINATOR |
| F1-J76 | **MỚI** | GET | `/specialist/request-reviews` | TRANSPORT_SPECIALIST |
| F1-J77 | **MỚI** | GET | `/specialist/request-reviews/{reviewId}` | TRANSPORT_SPECIALIST |
| F1-J78 | **MỚI** | GET | `/specialist/request-reviews/{reviewId}/options/{scheduleOptionId}/checklist/{checklistItemId}/file` | TRANSPORT_SPECIALIST |
| F1-J79 | **MỚI** | POST | `/specialist/request-reviews/{reviewId}/options/{scheduleOptionId}/assessment` | TRANSPORT_SPECIALIST |
| F1-J25 | **SỬA** | GET | `/manager/requests/{requestId}` | LOGISTICS_MANAGER |
| F1-J27 | **SỬA** | POST | `/manager/requests/{requestId}/request-changes` | LOGISTICS_MANAGER |
| F1-J22 | **SỬA** | GET | `/customer/requests/{requestId}` | CUSTOMER |
| F1-J80 | **MỚI** | POST | `/customer/requests/{requestId}/schedule-response` | CUSTOMER |
| F1-J26 | **SỬA** | POST | `/manager/requests/{requestId}/accept` | LOGISTICS_MANAGER |
| F1-J28 | **SỬA** | POST | `/manager/requests/{requestId}/reject` | LOGISTICS_MANAGER |
| F1-J29 | **SỬA** | GET | `/manager/requests/{requestId}/contract-editor` | LOGISTICS_MANAGER |
| F1-J30 | **SỬA** | PUT | `/manager/requests/{requestId}/contract-draft` | LOGISTICS_MANAGER |
| F1-J32 | **SỬA** | POST | `/manager/requests/{requestId}/contract/publish` | LOGISTICS_MANAGER |
| F1-J37 | **SỬA** | POST | `/customer/contracts/{contractId}/accept-terms` | CUSTOMER |
| F1-J38 | **SỬA** | POST | `/customer/contracts/{contractId}/feedback` | CUSTOMER |
| F1-J39 | **SỬA** | POST | `/manager/contracts/{contractId}/feedback/decision` | LOGISTICS_MANAGER |
| F1-J40 | **SỬA** | POST | `/manager/contracts/{contractId}/extend-deadline` | LOGISTICS_MANAGER |
| F1-J42 | **SỬA** | GET | `/customer/requests/{requestId}/deposit` | CUSTOMER |
| F1-J43 | **SỬA** | POST | `/customer/invoices/{invoiceId}/payment-session` | CUSTOMER |
| F1-J44 | **SỬA** | GET | `/customer/payments/{paymentId}` | CUSTOMER |
| F1-J71 | **SỬA** | POST | `/manager/payments/{paymentId}/confirm` | LOGISTICS_MANAGER |
| F1-J67 | **SỬA** | GET | `/payments/vnpay/ipn` | VNPAY |
| F1-J50 | **SỬA** | POST | `/customer/contracts/{contractId}/sign-otp` | CUSTOMER |
| F1-J51 | **SỬA** | POST | `/customer/contracts/{contractId}/sign` | CUSTOMER |
| F1-J52 | **SỬA** | POST | `/customer/requests/{requestId}/cancel` | CUSTOMER |
| F1-J53 | **SỬA** | POST | `/manager/requests/{requestId}/cancel` | LOGISTICS_MANAGER |
| F1-J54 | **SỬA** | POST | `/manager/contracts/{contractId}/cancellation/decision` | LOGISTICS_MANAGER |
| F1-J81 | **MỚI** | POST | `/manager/contracts/{contractId}/refund/start` | LOGISTICS_MANAGER |
| F1-J55 | **SỬA** | POST | `/manager/contracts/{contractId}/refund/complete` | LOGISTICS_MANAGER |

## 4. Cấu hình và gửi yêu cầu

### F1-J09 — GET /customer/request-form-options

**SỬA** · Role **CUSTOMER**.

Trả thời gian chuẩn bị và ngày lấy ngựa sớm nhất do backend tính. Query gồm đủ originCountry, destinationCountry, mode hoặc bỏ cả ba để lấy danh mục.

Khi bỏ bộ query, giữ chế độ trả danh mục supportedRoutes và cấu hình mặc định. FE chỉ dùng minPickupDate khi đã xác định tuyến và phương thức.

**Query**

`originCountry=VN&destinationCountry=JP&mode=AIR`

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "currency": "VND",
    "selectedRoute": {
      "id": "ROUTE_003",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR"
    },
    "preparationDays": 7,
    "scheduleBufferDays": 2,
    "requestReviewDays": 3,
    "submissionLeadDays": 12,
    "acceptanceLeadDays": 9,
    "customerResponseHours": 24,
    "contractDeadlineHours": 24,
    "minPickupDate": "2026-11-18",
    "defaultDepositPct": 40
  }
}
```

**Response lỗi 400 — UNSUPPORTED_ROUTE**

```json
{
  "success": false,
  "message": "Tuyến và phương thức chưa được hỗ trợ.",
  "errorCode": "UNSUPPORTED_ROUTE",
  "data": null
}
```

### F1-J18 — POST /customer/requests

**SỬA** · Role **CUSTOMER**.

Gửi yêu cầu mới và chuyển thẳng sang PENDING_REVIEW. Backend kiểm tra hồ sơ cơ bản, quyền sử dụng ngựa và thời gian gửi yêu cầu.

**Header bổ sung**

`Idempotency-Key: 6bd827a3-463a-4f03-a155-6e6e48e7892a`

**Request JSON**

```json
{
  "origin": "TP. Hồ Chí Minh",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "expectedTransportDate": "2026-11-21",
  "expectedDeliveryDate": "2026-11-23",
  "careInstructions": "Chăm sóc theo hồ sơ ngựa",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Điểm nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyễn Văn A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
    "cityId": "0123456789abcdef012345",
    "latitude": 10.8231,
    "longitude": 106.6297
  },
  "delivery": {
    "name": "Điểm giao Tokyo",
    "address": "Điểm giao tại Tokyo",
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
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "PENDING_REVIEW",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": null,
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": null,
    "selectedScheduleOptionId": null
  }
}
```

**Response lỗi 400 — REQUEST_LEAD_TIME_TOO_SHORT**

```json
{
  "success": false,
  "message": "Ngày lấy ngựa chưa đủ thời gian xét duyệt, đệm và chuẩn bị.",
  "errorCode": "REQUEST_LEAD_TIME_TOO_SHORT",
  "data": null
}
```

### F1-J19 — PUT /customer/requests/{requestId}

**SỬA** · Role **CUSTOMER**.

Gửi lại dữ liệu sau yêu cầu SUPPLEMENT_DOCUMENTS. Kiểm tra đúng đợt đang chờ và hạn phản hồi trong cùng transaction.

Cập nhật nội dung làm tăng requestRevision và hết hiệu lực kết quả của dữ liệu cũ. Việc cập nhật hồ sơ không thay thế thao tác đồng ý lịch đã xác minh. Các thay đổi ngày/tuyến/ngựa được kiểm tra lại theo mốc gửi.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "origin": "TP. Hồ Chí Minh",
  "destination": "Tokyo",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "expectedTransportDate": "2026-11-21",
  "expectedDeliveryDate": "2026-11-23",
  "careInstructions": "Bổ sung hướng dẫn cho ăn trước khi đón.",
  "pickup": {
    "name": "Trại ngựa A",
    "address": "Điểm nhận tại TP. Hồ Chí Minh",
    "postal": "700000",
    "contact": "Nguyễn Văn A",
    "phone": "+84901234567",
    "notes": "Gọi trước khi đến",
    "cityId": "0123456789abcdef012345",
    "latitude": 10.8231,
    "longitude": 106.6297
  },
  "delivery": {
    "name": "Điểm giao Tokyo",
    "address": "Điểm giao tại Tokyo",
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
  "purpose": null,
  "reviewId": "REQUEST_REVIEW_001",
  "requestRevision": 1
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Bổ sung hướng dẫn cho ăn trước khi đón.",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "PENDING_REVIEW",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": null,
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 2,
    "reviewId": null,
    "selectedScheduleOptionId": null
  }
}
```

**Response lỗi 409 — CUSTOMER_RESPONSE_EXPIRED**

```json
{
  "success": false,
  "message": "Đã hết hạn gửi lại yêu cầu.",
  "errorCode": "CUSTOMER_RESPONSE_EXPIRED",
  "data": null
}
```

## 5. Giao xét duyệt và đánh giá phương án

### F1-J72 — POST /manager/requests/{requestId}/reviews

**MỚI** · Role **LOGISTICS_MANAGER**.

Giao xét duyệt trước hợp đồng. Manager chỉ định Điều phối và Specialist, đợt mới mở bước Điều phối trước.

Mỗi lần gửi chỉ có một đợt đang mở. Tạo lại sau khi khách gửi bản sửa hoặc Manager đưa yêu cầu trở lại xét duyệt lịch. Khi quay lại từ hợp đồng, chặn nếu đã ký, có giao dịch đang chờ hoặc tiền chưa xử lý. Nếu được phép, khóa bản phát hành cũ và hóa đơn chưa thanh toán trong cùng transaction, giữ lịch sử. Nhân sự phải có đúng vai và đang hoạt động.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "coordinatorId": "USER_006",
  "specialistId": "USER_005",
  "requestRevision": 1
}
```

**Response 201**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "reviewId": "REQUEST_REVIEW_001",
    "requestId": "REQUEST_001",
    "requestRevision": 1,
    "coordinatorId": "USER_006",
    "specialistId": "USER_005",
    "stage": "WAITING_COORDINATOR",
    "options": [],
    "customerAction": null,
    "selectedScheduleOptionId": null
  }
}
```

**Response lỗi 409 — REQUEST_REVIEW_ALREADY_ACTIVE**

```json
{
  "success": false,
  "message": "Yêu cầu đã có đợt xét duyệt đang mở.",
  "errorCode": "REQUEST_REVIEW_ALREADY_ACTIVE",
  "data": null
}
```

### F1-J73 — GET /coordinator/request-reviews

**MỚI** · Role **FLEET_ROUTE_COORDINATOR**.

Danh sách đợt được giao cho Điều phối đang đăng nhập.

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "reviewId": "REQUEST_REVIEW_001",
      "requestId": "REQUEST_001",
      "requestRevision": 1,
      "stage": "WAITING_COORDINATOR",
      "reviewerId": "USER_006",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-21",
      "expectedDeliveryDate": "2026-11-23",
      "horseCount": 1
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Chỉ Điều phối được truy cập danh sách này.",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J74 — GET /coordinator/request-reviews/{reviewId}

**MỚI** · Role **FLEET_ROUTE_COORDINATOR**.

Xem lịch gốc, tuyến và dữ liệu cần đánh giá vận hành. API chỉ mở với Điều phối được giao.

`resourceReference` đọc từ `VEHICLE` và `FLIGHT_CATALOG`. Xe tham khảo có trạng thái `AVAILABLE` hoặc `READY`, phù hợp nước vận hành và đủ số ô theo dữ liệu ghi nhận. Tuyến có chặng bộ ở hai đầu có thể xem xe theo cả hai nước. Danh mục bay lấy dịch vụ đang hoạt động, sân bay đi/đến, giờ địa phương, múi giờ và sức chứa đã khai báo. Đường bộ trả `flightServices: []`.

Hai danh sách là dữ liệu để Điều phối tự đánh giá. Trạng thái xe là trạng thái đang ghi trong DB. `FLIGHT_CATALOG` trên baseline lưu giờ bay mẫu theo dịch vụ, chưa có ngày khai thác cụ thể hoặc số chỗ còn lại theo ngày. Nếu thiếu dữ liệu thì trả mảng rỗng. Không đưa dữ liệu fallback của Flow 3 vào kết quả truy vấn này. Điều phối lưu kết luận và lý do qua F1-J75. Việc phân công xe và đặt chuyến bay thuộc bước vận hành của Flow 3.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| reviewId | REQUEST_REVIEW_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "reviewId": "REQUEST_REVIEW_001",
    "requestId": "REQUEST_001",
    "requestRevision": 1,
    "stage": "WAITING_COORDINATOR",
    "reviewerId": "USER_006",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "horseCount": 1,
    "originCountry": "VN",
    "destinationCountry": "JP",
    "pickup": {
      "cityName": "TP. Hồ Chí Minh",
      "latitude": 10.8231,
      "longitude": 106.6297
    },
    "delivery": {
      "cityName": "Tokyo",
      "latitude": 35.668,
      "longitude": 139.484
    },
    "options": [],
    "resourceReference": {
      "vehicles": [
        {
          "vehicleId": "VEHICLE_001",
          "operatingCountry": "VN",
          "status": "READY",
          "capacityStalls": 3
        }
      ],
      "flightServices": [
        {
          "serviceId": "FLIGHT_SERVICE_001",
          "airline": "Hãng bay minh họa",
          "providerFlightCode": "DEMO123",
          "originAirportPlaceId": "PLACE_SGN",
          "destinationAirportPlaceId": "PLACE_NRT",
          "departureTime": "05:00",
          "arrivalTime": "11:00",
          "departureTimeZone": "Asia/Ho_Chi_Minh",
          "arrivalTimeZone": "Asia/Tokyo",
          "capacityHorses": 4
        }
      ]
    }
  }
}
```

**Response lỗi 404 — REQUEST_REVIEW_NOT_ASSIGNED**

```json
{
  "success": false,
  "message": "Không tìm thấy đợt xét duyệt được giao.",
  "errorCode": "REQUEST_REVIEW_NOT_ASSIGNED",
  "data": null
}
```

### F1-J75 — POST /coordinator/request-reviews/{reviewId}/assessment

**MỚI** · Role **FLEET_ROUTE_COORDINATOR**.

Gửi kết quả lịch gốc và tối đa một lịch thay thế. Backend cấp ID cho từng phương án.

Nếu không đề xuất thì alternative là null. Mọi lịch khả thi chuyển Specialist đánh giá. Nếu không có lịch nào khả thi, đưa Manager kết luận và không tạo tác vụ Specialist. Kiểm tra tính hợp lệ của tuyến/phương thức và thứ tự ngày.

`reason` bắt buộc với mỗi phương án đã đánh giá. Điều phối có thể ghi mã xe hoặc mã dịch vụ bay đã tham khảo trong lý do.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| reviewId | REQUEST_REVIEW_001 |

**Request JSON**

```json
{
  "requestRevision": 1,
  "original": {
    "result": "NOT_FEASIBLE",
    "reason": "Không có phương án vận hành đáp ứng lịch gốc."
  },
  "alternative": {
    "mode": "AIR",
    "expectedTransportDate": "2026-11-23",
    "expectedDeliveryDate": "2026-11-25",
    "result": "FEASIBLE",
    "reason": "Có phương án phù hợp với lịch thay thế."
  }
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "reviewId": "REQUEST_REVIEW_001",
    "requestId": "REQUEST_001",
    "requestRevision": 1,
    "coordinatorId": "USER_006",
    "specialistId": "USER_005",
    "stage": "WAITING_SPECIALIST",
    "options": [
      {
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_001",
        "type": "ORIGINAL",
        "mode": "AIR",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "expectedTransportDate": "2026-11-21",
        "expectedDeliveryDate": "2026-11-23",
        "coordinatorResult": "NOT_FEASIBLE",
        "coordinatorReason": "Không có phương án vận hành đáp ứng lịch gốc.",
        "specialistStatus": "NOT_APPLICABLE"
      },
      {
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
        "type": "PROPOSED",
        "mode": "AIR",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "expectedTransportDate": "2026-11-23",
        "expectedDeliveryDate": "2026-11-25",
        "coordinatorResult": "FEASIBLE",
        "coordinatorReason": "Có phương án phù hợp với lịch thay thế.",
        "specialistStatus": "PENDING"
      }
    ],
    "customerAction": null,
    "selectedScheduleOptionId": null
  }
}
```

**Response lỗi 409 — REQUEST_REVIEW_STALE**

```json
{
  "success": false,
  "message": "Nội dung yêu cầu hoặc bước xét duyệt đã thay đổi.",
  "errorCode": "REQUEST_REVIEW_STALE",
  "data": null
}
```

### F1-J76 — GET /specialist/request-reviews

**MỚI** · Role **TRANSPORT_SPECIALIST**.

Danh sách đợt được giao cho Specialist và đã có ít nhất một phương án khả thi.

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "reviewId": "REQUEST_REVIEW_001",
      "requestId": "REQUEST_001",
      "requestRevision": 1,
      "stage": "WAITING_SPECIALIST",
      "reviewerId": "USER_005",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-21",
      "expectedDeliveryDate": "2026-11-23",
      "horseCount": 1
    }
  ]
}
```

**Response lỗi 403 — FORBIDDEN_ROLE**

```json
{
  "success": false,
  "message": "Chỉ Specialist được truy cập danh sách này.",
  "errorCode": "FORBIDDEN_ROLE",
  "data": null
}
```

### F1-J77 — GET /specialist/request-reviews/{reviewId}

**MỚI** · Role **TRANSPORT_SPECIALIST**.

Xem checklist đã sinh riêng cho từng phương án khả thi.

Checklist được tạo khi Điều phối gửi kết quả. Mỗi mục có requiredStage là BEFORE_CONTRACT hoặc BEFORE_DEPARTURE. horseId là null cho phạm vi PER_REQUEST. estimatedProcessingDays giữ null để tương thích dữ liệu cũ. Specialist chỉ nhập requiredByDate cho kế hoạch bổ sung, từ hôm nay đến hết ngày đi, bao gồm hai mốc. Không dùng cùng kết quả xác minh cho hai phương án.

| Nhóm checklist | Dữ liệu nguồn | Cách hiển thị |
|---|---|---|
| Nhận dạng và sở hữu | `HORSE` | Một mục hộ chiếu gồm số FEI và bản scan, ảnh nhận dạng, giấy sở hữu và chứng từ giá trị nếu có |
| Y tế và kiểm dịch | `LEGAL_MEDICAL_RECORD` theo `RequestID` và `HorseID` | Giấy sức khỏe/kiểm dịch và sổ tiêm theo tuyến áp dụng. Hiển thị tệp, hạn sử dụng và trạng thái của bản ghi nguồn |

Chuẩn hóa `DT-1/PASSPORT` thành một mục hộ chiếu, `DT-2/HEALTH_CERTIFICATE` thành giấy sức khỏe, và `DT-3/VACCINATION/EQUINE_FLU_VAX` thành sổ tiêm. Các mã legacy đang được đọc trong Flow 2 có thể map về cùng nhóm. Dùng `source`, `sourceRecordId` và `sourceStatus` để tham chiếu dữ liệu gốc. `status` là kết quả riêng của checklist theo phương án. Ví dụ hồ sơ đã duyệt ở nguồn vẫn cần xét hạn sử dụng với ngày của phương án mới. Kết quả xét duyệt theo lịch được lưu riêng, dùng lại tệp hiện có.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| reviewId | REQUEST_REVIEW_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "reviewId": "REQUEST_REVIEW_001",
    "requestId": "REQUEST_001",
    "requestRevision": 1,
    "stage": "WAITING_SPECIALIST",
    "reviewerId": "USER_005",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "horseCount": 1,
    "options": [
      {
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
        "type": "PROPOSED",
        "mode": "AIR",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "expectedTransportDate": "2026-11-23",
        "expectedDeliveryDate": "2026-11-25",
        "coordinatorResult": "FEASIBLE",
        "coordinatorReason": "Có phương án phù hợp với lịch thay thế.",
        "specialistStatus": "PENDING",
        "checklistVersion": 1,
        "checklist": [
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_001",
            "documentType": "PASSPORT",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "HORSE",
            "sourceRecordId": null,
            "sourceStatus": null,
            "expiryDate": "2029-01-10",
            "required": true,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_CONTRACT",
            "requiredByDate": "2026-11-09",
            "estimatedProcessingDays": null,
            "status": "SUBMITTED",
            "reason": null,
            "file": {
              "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_001/file"
            }
          },
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_002",
            "documentType": "PHOTO",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "HORSE",
            "sourceRecordId": null,
            "sourceStatus": null,
            "expiryDate": null,
            "required": true,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_CONTRACT",
            "requiredByDate": "2026-11-09",
            "estimatedProcessingDays": null,
            "status": "SUBMITTED",
            "reason": null,
            "file": {
              "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_002/file"
            }
          },
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_003",
            "documentType": "OWNERSHIP",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "HORSE",
            "sourceRecordId": null,
            "sourceStatus": null,
            "expiryDate": null,
            "required": true,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_CONTRACT",
            "requiredByDate": "2026-11-09",
            "estimatedProcessingDays": null,
            "status": "SUBMITTED",
            "reason": null,
            "file": {
              "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_003/file"
            }
          },
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_004",
            "documentType": "VALUE_PROOF",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "HORSE",
            "sourceRecordId": null,
            "sourceStatus": null,
            "expiryDate": null,
            "required": false,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_CONTRACT",
            "requiredByDate": null,
            "estimatedProcessingDays": null,
            "status": "MISSING",
            "reason": null,
            "file": null
          },
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_005",
            "documentType": "HEALTH_CERTIFICATE",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "LEGAL_MEDICAL_RECORD",
            "sourceRecordId": null,
            "sourceStatus": null,
            "expiryDate": null,
            "required": true,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_DEPARTURE",
            "requiredByDate": "2026-11-23",
            "estimatedProcessingDays": null,
            "status": "MISSING",
            "reason": null,
            "file": null
          },
          {
            "checklistItemId": "REQUEST_CHECKLIST_ITEM_006",
            "documentType": "VACCINATION",
            "horseId": "HORSE_001",
            "scope": "PER_HORSE",
            "source": "LEGAL_MEDICAL_RECORD",
            "sourceRecordId": "LEGAL_MEDICAL_RECORD_002",
            "sourceStatus": "APPROVED",
            "expiryDate": "2027-01-15",
            "required": true,
            "provider": "CUSTOMER",
            "requiredStage": "BEFORE_DEPARTURE",
            "requiredByDate": "2026-11-23",
            "estimatedProcessingDays": null,
            "status": "SUBMITTED",
            "reason": null,
            "file": {
              "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_006/file"
            }
          }
        ],
        "reviewNote": null
      }
    ]
  }
}
```

**Response lỗi 404 — REQUEST_REVIEW_NOT_ASSIGNED**

```json
{
  "success": false,
  "message": "Không tìm thấy đợt xét duyệt được giao.",
  "errorCode": "REQUEST_REVIEW_NOT_ASSIGNED",
  "data": null
}
```

### F1-J78 — GET /specialist/request-reviews/{reviewId}/options/{scheduleOptionId}/checklist/{checklistItemId}/file

**MỚI** · Role **TRANSPORT_SPECIALIST**.

Đọc tệp hồ sơ của đúng mục checklist trong đợt được giao.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| reviewId | REQUEST_REVIEW_001 |
| scheduleOptionId | REQUEST_SCHEDULE_OPTION_002 |
| checklistItemId | REQUEST_CHECKLIST_ITEM_001 |

**Request JSON**

Không gửi body.

**Response 200**

Trả dữ liệu nhị phân và Content-Type của tệp. Từ chối truy cập nếu mục không thuộc phương án hoặc người gọi không được giao đợt.

**Response lỗi 404 — DOCUMENT_NOT_FOUND**

```json
{
  "success": false,
  "message": "Không có tệp hồ sơ ở mục được yêu cầu.",
  "errorCode": "DOCUMENT_NOT_FOUND",
  "data": null
}
```

### F1-J79 — POST /specialist/request-reviews/{reviewId}/options/{scheduleOptionId}/assessment

**MỚI** · Role **TRANSPORT_SPECIALIST**.

Nộp kết quả xác minh một phương án. Khi đã có kết quả cho tất cả phương án khả thi, chuyển Manager.

result gồm FEASIBLE, NEEDS_SUPPLEMENT, NOT_FEASIBLE. Kết quả từng mục gồm VERIFIED, MISSING, INVALID, NEEDS_FOLLOW_UP. Mục bắt buộc trước hợp đồng phải đạt. Mục hoàn thiện sau có thể cần theo dõi nếu Specialist đánh giá kịp lịch. Bắt buộc ghi lý do cho mục thiếu, không hợp lệ hoặc cần theo dõi. Backend kiểm tra đủ mục, đúng phạm vi, đúng phiên bản tệp và không trùng mục.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| reviewId | REQUEST_REVIEW_001 |
| scheduleOptionId | REQUEST_SCHEDULE_OPTION_002 |

**Request JSON**

```json
{
  "requestRevision": 1,
  "checklistVersion": 1,
  "result": "FEASIBLE",
  "note": "Hồ sơ ban đầu đạt. Giấy sức khỏe cần bổ sung trước ngày lấy ngựa.",
  "items": [
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_001",
      "status": "VERIFIED",
      "reason": null,
      "requiredByDate": "2026-11-09",
      "estimatedProcessingDays": null
    },
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_002",
      "status": "VERIFIED",
      "reason": null,
      "requiredByDate": "2026-11-09",
      "estimatedProcessingDays": null
    },
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_003",
      "status": "VERIFIED",
      "reason": null,
      "requiredByDate": "2026-11-09",
      "estimatedProcessingDays": null
    },
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_004",
      "status": "MISSING",
      "reason": "Chứng từ giá trị không bắt buộc trong phương án minh họa.",
      "requiredByDate": null,
      "estimatedProcessingDays": null
    },
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_005",
      "status": "NEEDS_FOLLOW_UP",
      "reason": "Dự kiến bổ sung trước ngày lấy ngựa.",
      "requiredByDate": "2026-11-23",
      "estimatedProcessingDays": null
    },
    {
      "checklistItemId": "REQUEST_CHECKLIST_ITEM_006",
      "status": "VERIFIED",
      "reason": null,
      "requiredByDate": "2026-11-23",
      "estimatedProcessingDays": null
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
    "reviewId": "REQUEST_REVIEW_001",
    "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
    "stage": "READY_FOR_MANAGER",
    "result": "FEASIBLE",
    "checklistVersion": 1,
    "items": [
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_001",
        "documentType": "PASSPORT",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "HORSE",
        "sourceRecordId": null,
        "sourceStatus": null,
        "expiryDate": "2029-01-10",
        "required": true,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_CONTRACT",
        "requiredByDate": "2026-11-09",
        "estimatedProcessingDays": null,
        "status": "VERIFIED",
        "reason": null,
        "file": {
          "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_001/file"
        }
      },
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_002",
        "documentType": "PHOTO",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "HORSE",
        "sourceRecordId": null,
        "sourceStatus": null,
        "expiryDate": null,
        "required": true,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_CONTRACT",
        "requiredByDate": "2026-11-09",
        "estimatedProcessingDays": null,
        "status": "VERIFIED",
        "reason": null,
        "file": {
          "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_002/file"
        }
      },
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_003",
        "documentType": "OWNERSHIP",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "HORSE",
        "sourceRecordId": null,
        "sourceStatus": null,
        "expiryDate": null,
        "required": true,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_CONTRACT",
        "requiredByDate": "2026-11-09",
        "estimatedProcessingDays": null,
        "status": "VERIFIED",
        "reason": null,
        "file": {
          "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_003/file"
        }
      },
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_004",
        "documentType": "VALUE_PROOF",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "HORSE",
        "sourceRecordId": null,
        "sourceStatus": null,
        "expiryDate": null,
        "required": false,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_CONTRACT",
        "requiredByDate": null,
        "estimatedProcessingDays": null,
        "status": "MISSING",
        "reason": "Chứng từ giá trị không bắt buộc trong phương án minh họa.",
        "file": null
      },
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_005",
        "documentType": "HEALTH_CERTIFICATE",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "LEGAL_MEDICAL_RECORD",
        "sourceRecordId": null,
        "sourceStatus": null,
        "expiryDate": null,
        "required": true,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_DEPARTURE",
        "requiredByDate": "2026-11-23",
        "estimatedProcessingDays": null,
        "status": "NEEDS_FOLLOW_UP",
        "reason": "Dự kiến bổ sung trước ngày lấy ngựa.",
        "file": null
      },
      {
        "checklistItemId": "REQUEST_CHECKLIST_ITEM_006",
        "documentType": "VACCINATION",
        "horseId": "HORSE_001",
        "scope": "PER_HORSE",
        "source": "LEGAL_MEDICAL_RECORD",
        "sourceRecordId": "LEGAL_MEDICAL_RECORD_002",
        "sourceStatus": "APPROVED",
        "expiryDate": "2027-01-15",
        "required": true,
        "provider": "CUSTOMER",
        "requiredStage": "BEFORE_DEPARTURE",
        "requiredByDate": "2026-11-23",
        "estimatedProcessingDays": null,
        "status": "VERIFIED",
        "reason": null,
        "file": {
          "url": "/api/specialist/request-reviews/REQUEST_REVIEW_001/options/REQUEST_SCHEDULE_OPTION_002/checklist/REQUEST_CHECKLIST_ITEM_006/file"
        }
      }
    ]
  }
}
```

**Response lỗi 409 — REQUEST_CHECKLIST_STALE**

```json
{
  "success": false,
  "message": "Checklist hoặc tệp nguồn đã thay đổi.",
  "errorCode": "REQUEST_CHECKLIST_STALE",
  "data": null
}
```

## 6. Manager kết luận và khách phản hồi

### F1-J25 — GET /manager/requests/{requestId}

**SỬA** · Role **LOGISTICS_MANAGER**.

Trả chi tiết đợt xét duyệt, các phương án và tiến độ để Manager tổng hợp.

Manager thấy lý do và các mục Specialist ghi nhận. Link tệp dùng endpoint Manager hiện có, hoặc cùng cơ chế phân quyền nếu tài liệu không thuộc hồ sơ ngựa.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "CHANGES_REQUESTED",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": "REQUEST_REVIEW_001",
    "selectedScheduleOptionId": null,
    "versions": [],
    "payments": [],
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
    "contractFeedback": null,
    "review": {
      "reviewId": "REQUEST_REVIEW_001",
      "requestId": "REQUEST_001",
      "requestRevision": 1,
      "coordinatorId": "USER_006",
      "specialistId": "USER_005",
      "stage": "WAITING_CUSTOMER",
      "options": [
        {
          "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_001",
          "type": "ORIGINAL",
          "mode": "AIR",
          "originCountry": "VN",
          "destinationCountry": "JP",
          "expectedTransportDate": "2026-11-21",
          "expectedDeliveryDate": "2026-11-23",
          "coordinatorResult": "NOT_FEASIBLE",
          "coordinatorReason": "Không có phương án vận hành đáp ứng lịch gốc.",
          "specialistStatus": "NOT_APPLICABLE"
        },
        {
          "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
          "type": "PROPOSED",
          "mode": "AIR",
          "originCountry": "VN",
          "destinationCountry": "JP",
          "expectedTransportDate": "2026-11-23",
          "expectedDeliveryDate": "2026-11-25",
          "coordinatorResult": "FEASIBLE",
          "coordinatorReason": "Có phương án phù hợp với lịch thay thế.",
          "specialistStatus": "FEASIBLE",
          "checklistVersion": 1,
          "checklist": [
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_001",
              "documentType": "PASSPORT",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "HORSE",
              "sourceRecordId": null,
              "sourceStatus": null,
              "expiryDate": "2029-01-10",
              "required": true,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_CONTRACT",
              "requiredByDate": "2026-11-09",
              "estimatedProcessingDays": null,
              "status": "VERIFIED",
              "reason": null,
              "file": {
                "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/passport/file"
              }
            },
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_002",
              "documentType": "PHOTO",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "HORSE",
              "sourceRecordId": null,
              "sourceStatus": null,
              "expiryDate": null,
              "required": true,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_CONTRACT",
              "requiredByDate": "2026-11-09",
              "estimatedProcessingDays": null,
              "status": "VERIFIED",
              "reason": null,
              "file": {
                "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/photo/file"
              }
            },
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_003",
              "documentType": "OWNERSHIP",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "HORSE",
              "sourceRecordId": null,
              "sourceStatus": null,
              "expiryDate": null,
              "required": true,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_CONTRACT",
              "requiredByDate": "2026-11-09",
              "estimatedProcessingDays": null,
              "status": "VERIFIED",
              "reason": null,
              "file": {
                "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/ownership/file"
              }
            },
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_004",
              "documentType": "VALUE_PROOF",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "HORSE",
              "sourceRecordId": null,
              "sourceStatus": null,
              "expiryDate": null,
              "required": false,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_CONTRACT",
              "requiredByDate": null,
              "estimatedProcessingDays": null,
              "status": "MISSING",
              "reason": "Chứng từ giá trị không bắt buộc trong phương án minh họa.",
              "file": null
            },
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_005",
              "documentType": "HEALTH_CERTIFICATE",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "LEGAL_MEDICAL_RECORD",
              "sourceRecordId": null,
              "sourceStatus": null,
              "expiryDate": null,
              "required": true,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_DEPARTURE",
              "requiredByDate": "2026-11-23",
              "estimatedProcessingDays": null,
              "status": "NEEDS_FOLLOW_UP",
              "reason": "Dự kiến bổ sung trước ngày lấy ngựa.",
              "file": null
            },
            {
              "checklistItemId": "REQUEST_CHECKLIST_ITEM_006",
              "documentType": "VACCINATION",
              "horseId": "HORSE_001",
              "scope": "PER_HORSE",
              "source": "LEGAL_MEDICAL_RECORD",
              "sourceRecordId": "LEGAL_MEDICAL_RECORD_002",
              "sourceStatus": "APPROVED",
              "expiryDate": "2027-01-15",
              "required": true,
              "provider": "CUSTOMER",
              "requiredStage": "BEFORE_DEPARTURE",
              "requiredByDate": "2026-11-23",
              "estimatedProcessingDays": null,
              "status": "VERIFIED",
              "reason": null,
              "file": {
                "url": "/api/manager/requests/REQUEST_001/documents/LEGAL_MEDICAL_RECORD_002"
              }
            }
          ],
          "reviewNote": "Hồ sơ ban đầu đạt. Giấy sức khỏe cần bổ sung trước ngày lấy ngựa."
        }
      ],
      "customerAction": {
        "type": "CONFIRM_SCHEDULE",
        "feedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
        "customerResponseDueAtUtc": "2026-11-09T04:00:00Z"
      },
      "selectedScheduleOptionId": null
    },
    "refund": null
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy yêu cầu.",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J27 — POST /manager/requests/{requestId}/request-changes

**SỬA** · Role **LOGISTICS_MANAGER**.

Gửi yêu cầu bổ sung hoặc đề nghị xác nhận lịch đã được cả hai vai đánh giá.

Với SUPPLEMENT_DOCUMENTS, bỏ scheduleOptionId và ghi rõ nội dung cần bổ sung. Chỉ khi tạo hành động mới cho khách mới ghi hạn mới. Lặp cùng thao tác trả hạn đã ghi. Trong bước chờ khách, hai vai nội bộ không tự thay đổi phương án được gửi.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reviewId": "REQUEST_REVIEW_001",
  "requestRevision": 1,
  "action": "CONFIRM_SCHEDULE",
  "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
  "feedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "CHANGES_REQUESTED",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": "REQUEST_REVIEW_001",
    "selectedScheduleOptionId": null,
    "review": {
      "reviewId": "REQUEST_REVIEW_001",
      "requestId": "REQUEST_001",
      "requestRevision": 1,
      "coordinatorId": "USER_006",
      "specialistId": "USER_005",
      "stage": "WAITING_CUSTOMER",
      "options": [
        {
          "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_001",
          "type": "ORIGINAL",
          "mode": "AIR",
          "originCountry": "VN",
          "destinationCountry": "JP",
          "expectedTransportDate": "2026-11-21",
          "expectedDeliveryDate": "2026-11-23",
          "coordinatorResult": "NOT_FEASIBLE",
          "coordinatorReason": "Không có phương án vận hành đáp ứng lịch gốc.",
          "specialistStatus": "NOT_APPLICABLE"
        },
        {
          "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
          "type": "PROPOSED",
          "mode": "AIR",
          "originCountry": "VN",
          "destinationCountry": "JP",
          "expectedTransportDate": "2026-11-23",
          "expectedDeliveryDate": "2026-11-25",
          "coordinatorResult": "FEASIBLE",
          "coordinatorReason": "Có phương án phù hợp với lịch thay thế.",
          "specialistStatus": "FEASIBLE"
        }
      ],
      "customerAction": {
        "type": "CONFIRM_SCHEDULE",
        "feedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
        "customerResponseDueAtUtc": "2026-11-09T04:00:00Z"
      },
      "selectedScheduleOptionId": null
    }
  }
}
```

**Response lỗi 409 — SCHEDULE_OPTION_NOT_READY**

```json
{
  "success": false,
  "message": "Phương án chưa đủ kết quả để gửi khách.",
  "errorCode": "SCHEDULE_OPTION_NOT_READY",
  "data": null
}
```

### F1-J22 — GET /customer/requests/{requestId}

**SỬA** · Role **CUSTOMER**.

Hiển thị nội dung cần phản hồi, hạn và lịch thay thế đã được Manager gửi.

Không gửi checklist nội bộ, nhân sự hoặc phương án chưa được Manager chia sẻ. customerAction là null khi không chờ khách. Sau khi hết hạn, trả trạng thái CANCELLED với lý do hết hạn nếu yêu cầu đã được xử lý tự động.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "CHANGES_REQUESTED",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": "REQUEST_REVIEW_001",
    "selectedScheduleOptionId": null,
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
    "supplements": [],
    "contractFeedback": null,
    "review": {
      "reviewId": "REQUEST_REVIEW_001",
      "stage": "WAITING_CUSTOMER",
      "customerAction": {
        "type": "CONFIRM_SCHEDULE",
        "feedback": "Lịch gốc chưa khả thi. Vui lòng xác nhận lịch lấy ngày 23/11.",
        "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
        "customerResponseDueAtUtc": "2026-11-09T04:00:00Z",
        "scheduleOption": {
          "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
          "mode": "AIR",
          "expectedTransportDate": "2026-11-23",
          "expectedDeliveryDate": "2026-11-25"
        }
      },
      "selectedScheduleOptionId": null
    },
    "refund": null
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy yêu cầu của khách.",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J80 — POST /customer/requests/{requestId}/schedule-response

**MỚI** · Role **CUSTOMER**.

Khách đồng ý hoặc từ chối đúng phương án Manager đã gửi, trong hạn phản hồi.

Chấp nhận thì ghi đồng ý và đóng hạn chờ. Manager vẫn phải duyệt. Từ chối thì hủy yêu cầu trước hợp đồng với lý do khách từ chối phương án. Cả hai kết quả đều không tạo Trip. Retry cùng quyết định không tạo thêm thao tác.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reviewId": "REQUEST_REVIEW_001",
  "requestRevision": 1,
  "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
  "decision": "ACCEPTED"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "reviewId": "REQUEST_REVIEW_001",
    "requestRevision": 1,
    "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
    "decision": "ACCEPTED",
    "requestStatus": "PENDING_REVIEW",
    "reviewStage": "READY_FOR_MANAGER",
    "customerResponseDueAtUtc": null
  }
}
```

**Response lỗi 409 — CUSTOMER_RESPONSE_EXPIRED**

```json
{
  "success": false,
  "message": "Đã hết hạn phản hồi phương án.",
  "errorCode": "CUSTOMER_RESPONSE_EXPIRED",
  "data": null
}
```

### F1-J26 — POST /manager/requests/{requestId}/accept

**SỬA** · Role **LOGISTICS_MANAGER**.

Chấp nhận phương án đã đủ kết quả, còn thời gian và đã được khách đồng ý nếu là phương án thay thế.

Khóa phương án đã chọn và lưu ngày đã chốt. Đối chiếu lại hồ sơ nguồn và thời gian còn 5/9 ngày theo cấu hình. Nếu không đủ trả REQUEST_LEAD_TIME_TOO_SHORT để Manager đề xuất lịch khác. Lịch gốc giữ nội dung khách đã gửi nên không cần bước đồng ý lại.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reviewId": "REQUEST_REVIEW_001",
  "requestRevision": 1,
  "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-23",
    "expectedDeliveryDate": "2026-11-25",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "CONTRACT_PREPARATION",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": null,
    "rejectionReason": null,
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": "REQUEST_REVIEW_001",
    "selectedScheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
  }
}
```

**Response lỗi 409 — REQUEST_REVIEW_NOT_READY**

```json
{
  "success": false,
  "message": "Phương án chưa đủ kết quả xác minh hoặc khách chưa đồng ý.",
  "errorCode": "REQUEST_REVIEW_NOT_READY",
  "data": null
}
```

### F1-J28 — POST /manager/requests/{requestId}/reject

**SỬA** · Role **LOGISTICS_MANAGER**.

Từ chối phục vụ ở giai đoạn xét duyệt Request, ghi lý do và đóng đợt đang mở.

Vô hiệu hóa tác vụ và hạn phản hồi đang mở. Nếu đã phát hành hợp đồng, dùng nhánh ngừng phục vụ tại F1-J39 hoặc luồng hủy tương ứng với tình trạng cọc.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Không có phương án đáp ứng thời hạn khách yêu cầu."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "createdAt": "2026-11-06T03:00:00Z",
    "id": "REQUEST_001",
    "customerId": "USER_001",
    "origin": "Điểm nhận tại TP. Hồ Chí Minh",
    "destination": "Điểm giao tại Tokyo",
    "originCountry": "VN",
    "destinationCountry": "JP",
    "mode": "AIR",
    "expectedTransportDate": "2026-11-21",
    "expectedDeliveryDate": "2026-11-23",
    "careInstructions": "Chăm sóc theo hồ sơ ngựa",
    "pickup": {
      "name": "Trại ngựa A",
      "address": "Điểm nhận tại TP. Hồ Chí Minh",
      "postal": "700000",
      "contact": "Nguyễn Văn A",
      "phone": "+84901234567",
      "notes": "Gọi trước khi đến",
      "cityId": "0123456789abcdef012345",
      "latitude": 10.8231,
      "longitude": 106.6297,
      "cityName": "TP. Hồ Chí Minh"
    },
    "delivery": {
      "name": "Điểm giao Tokyo",
      "address": "Điểm giao tại Tokyo",
      "postal": "1830024",
      "contact": "Yuki Tanaka",
      "phone": "+81312345678",
      "notes": "",
      "cityId": "0123456789abcdef012346",
      "latitude": 35.668,
      "longitude": 139.484,
      "cityName": "Tokyo"
    },
    "horses": [
      "HORSE_001"
    ],
    "horseNotes": {
      "HORSE_001": "Lưu ý khẩu phần"
    },
    "purpose": null,
    "status": "REJECTED",
    "horseCount": 1,
    "preparationDays": 7,
    "revisionFeedback": null,
    "rejectionReason": "Không có phương án đáp ứng thời hạn khách yêu cầu.",
    "cancellation": null,
    "requestRevision": 1,
    "reviewId": "REQUEST_REVIEW_001",
    "selectedScheduleOptionId": null
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Yêu cầu đã sang giai đoạn hợp đồng hoặc không còn mở.",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

## 7. Soạn, phát hành và sửa hợp đồng

### F1-J29 — GET /manager/requests/{requestId}/contract-editor

**SỬA** · Role **LOGISTICS_MANAGER**.

Trả phương án đã khóa và mặc định của form. Frontend dùng lịch/phương thức của phương án đã duyệt.

Bản mới dùng phương thức đã chốt. Nếu nhận query mode tương thích với client cũ thì mode phải khớp phương án.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "status": "CONTRACT_PREPARATION",
    "contractId": null,
    "request": {
      "createdAt": "2026-11-06T03:00:00Z",
      "id": "REQUEST_001",
      "customerId": "USER_001",
      "origin": "Điểm nhận tại TP. Hồ Chí Minh",
      "destination": "Điểm giao tại Tokyo",
      "originCountry": "VN",
      "destinationCountry": "JP",
      "mode": "AIR",
      "expectedTransportDate": "2026-11-23",
      "expectedDeliveryDate": "2026-11-25",
      "careInstructions": "Chăm sóc theo hồ sơ ngựa",
      "pickup": {
        "name": "Trại ngựa A",
        "address": "Điểm nhận tại TP. Hồ Chí Minh",
        "postal": "700000",
        "contact": "Nguyễn Văn A",
        "phone": "+84901234567",
        "notes": "Gọi trước khi đến",
        "cityId": "0123456789abcdef012345",
        "latitude": 10.8231,
        "longitude": 106.6297,
        "cityName": "TP. Hồ Chí Minh"
      },
      "delivery": {
        "name": "Điểm giao Tokyo",
        "address": "Điểm giao tại Tokyo",
        "postal": "1830024",
        "contact": "Yuki Tanaka",
        "phone": "+81312345678",
        "notes": "",
        "cityId": "0123456789abcdef012346",
        "latitude": 35.668,
        "longitude": 139.484,
        "cityName": "Tokyo"
      },
      "horses": [
        "HORSE_001"
      ],
      "horseNotes": {
        "HORSE_001": "Lưu ý khẩu phần"
      },
      "purpose": null,
      "status": "CONTRACT_PREPARATION",
      "horseCount": 1,
      "preparationDays": 7,
      "revisionFeedback": null,
      "rejectionReason": null,
      "cancellation": null,
      "requestRevision": 1,
      "reviewId": "REQUEST_REVIEW_001",
      "selectedScheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
      "versions": [],
      "payments": [],
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
      "contractFeedback": null,
      "review": {
        "reviewId": "REQUEST_REVIEW_001",
        "requestId": "REQUEST_001",
        "requestRevision": 1,
        "coordinatorId": "USER_006",
        "specialistId": "USER_005",
        "stage": "ACCEPTED",
        "options": [
          {
            "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_001",
            "type": "ORIGINAL",
            "mode": "AIR",
            "originCountry": "VN",
            "destinationCountry": "JP",
            "expectedTransportDate": "2026-11-21",
            "expectedDeliveryDate": "2026-11-23",
            "coordinatorResult": "NOT_FEASIBLE",
            "coordinatorReason": "Không có phương án vận hành đáp ứng lịch gốc.",
            "specialistStatus": "NOT_APPLICABLE"
          },
          {
            "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002",
            "type": "PROPOSED",
            "mode": "AIR",
            "originCountry": "VN",
            "destinationCountry": "JP",
            "expectedTransportDate": "2026-11-23",
            "expectedDeliveryDate": "2026-11-25",
            "coordinatorResult": "FEASIBLE",
            "coordinatorReason": "Có phương án phù hợp với lịch thay thế.",
            "specialistStatus": "FEASIBLE"
          }
        ],
        "customerAction": null,
        "selectedScheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
      }
    },
    "customer": {
      "id": "USER_001",
      "name": "Nguyễn Văn A",
      "email": "customer@example.test",
      "phone": "+84901234567"
    },
    "horses": [
      {
        "id": "HORSE_001",
        "name": "Silver Star",
        "breed": "Thoroughbred",
        "sex": "MALE",
        "reproductiveStatus": null,
        "weight": 480,
        "dob": "2020-03-15",
        "microchip": "392123456789012",
        "value": "250000000",
        "currency": "VND",
        "passport": {
          "number": "PASS-DEMO-01",
          "authority": "Đơn vị cấp mẫu",
          "issueDate": "2023-01-10",
          "expiryDate": "2029-01-10",
          "scan": {
            "name": "passport.pdf",
            "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/passport/file"
          }
        },
        "healthNotes": null,
        "photo": {
          "name": "photo.jpg",
          "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/photo/file"
        },
        "ownership": {
          "name": "ownership.pdf",
          "url": "/api/manager/requests/REQUEST_001/horses/HORSE_001/documents/ownership/file"
        },
        "valueProof": null
      }
    ],
    "versionNo": null,
    "draft": null,
    "currentContract": null,
    "versions": [],
    "clauses": [],
    "internalCosts": [],
    "defaults": {
      "currency": "VND",
      "selectedRoute": {
        "id": "ROUTE_003",
        "originCountry": "VN",
        "destinationCountry": "JP",
        "mode": "AIR"
      },
      "supportedRoutes": [
        {
          "id": "ROUTE_003",
          "originCountry": "VN",
          "destinationCountry": "JP",
          "mode": "AIR"
        }
      ],
      "preparationDays": 7,
      "defaultDepositPct": 40,
      "contractDeadlineHours": 24,
      "terms": []
    },
    "selectedScheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
  }
}
```

**Response lỗi 409 — REQUEST_REVIEW_NOT_READY**

```json
{
  "success": false,
  "message": "Yêu cầu chưa có phương án đã được duyệt.",
  "errorCode": "REQUEST_REVIEW_NOT_READY",
  "data": null
}
```

### F1-J30 — PUT /manager/requests/{requestId}/contract-draft

**SỬA** · Role **LOGISTICS_MANAGER**.

Lưu bản nháp gắn với phương án đã chốt. Manager nhập giá và tỷ lệ cọc. Backend tính tổng, tiền cọc và số còn lại.

Giữ các trường thương mại hiện tại. Chặn tạo bản thay thế khi giao dịch cũ chưa rõ hoặc tiền đã nhận chưa xử lý. Sửa lịch đã chốt phải quay về xét duyệt, không sửa trực tiếp trong editor.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "mode": "AIR",
  "departAt": "2026-11-23 01:00",
  "arriveAt": "2026-11-25 09:00",
  "budget": {
    "TRANSPORT": 12000000,
    "PROCEDURE": 2000000,
    "VET": 1000000,
    "INSURANCE": 1000000,
    "STAFF": 1000000
  },
  "items": [
    {
      "desc": "Dịch vụ vận chuyển theo lịch đã duyệt",
      "amount": 20000000,
      "required": true
    }
  ],
  "depositPct": 40,
  "note": "Liên hệ người giao trước khi đến.",
  "exception": "",
  "terms": [
    {
      "title": "Phạm vi dịch vụ",
      "text": "Vận chuyển theo lịch hai bên đã thống nhất."
    },
    {
      "title": "Thanh toán",
      "text": "Xác minh đủ tiền cọc trước khi ký OTP."
    }
  ],
  "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
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
    "savedAt": "2026-11-10T01:50:00Z",
    "scheduleOptionId": "REQUEST_SCHEDULE_OPTION_002"
  }
}
```

**Response lỗi 409 — SCHEDULE_OPTION_MISMATCH**

```json
{
  "success": false,
  "message": "Lịch hoặc phương thức trong bản nháp khác phương án đã duyệt.",
  "errorCode": "SCHEDULE_OPTION_MISMATCH",
  "data": null
}
```

### F1-J32 — POST /manager/requests/{requestId}/contract/publish

**SỬA** · Role **LOGISTICS_MANAGER**.

Phát hành đúng phiên bản hiện hành và phương án đã chốt, tạo hóa đơn cọc. Giữ đủ thời hạn hoàn tất trước thời gian chuẩn bị.

Tính một hạn chung cho cọc, xác minh và ký. Tại transaction phát hành, kiểm tra lại bản nháp, phương án và tiền đang chờ. Phát hành lại cùng phiên bản không tạo thêm hóa đơn.

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
    "validUntil": "2026-11-11 02:00",
    "completionDeadlineAtUtc": "2026-11-11T02:00:00Z"
  }
}
```

**Response lỗi 409 — CONTRACT_PREPARATION_WINDOW_TOO_SHORT**

```json
{
  "success": false,
  "message": "Ngày lấy ngựa không còn đủ thời gian sau hạn hoàn tất hợp đồng.",
  "errorCode": "CONTRACT_PREPARATION_WINDOW_TOO_SHORT",
  "data": null
}
```

### F1-J37 — POST /customer/contracts/{contractId}/accept-terms

**SỬA** · Role **CUSTOMER**.

Ghi nhận khách đồng ý điều khoản của phiên bản hiện hành để mở bước cọc.

Chỉ cho phép bản đang phát hành, còn hạn và Request CONTRACT_READY. Chặn nếu đang chờ sửa, quay lại xét duyệt lịch hoặc chờ hủy. Đồng ý điều khoản chưa phải ký.

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
    "termsAcceptedAt": "2026-11-10 02:00",
    "requestStatus": "CONTRACT_READY"
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Hợp đồng không còn ở bước đồng ý điều khoản.",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J38 — POST /customer/contracts/{contractId}/feedback

**SỬA** · Role **CUSTOMER**.

Gửi đề nghị sửa cho đúng bản đang phát hành, trong hạn và trước khi có cọc đã nhận hoặc giao dịch chưa xác nhận.

Cùng một transaction với kiểm tra phiên thanh toán. Khi đã ghi nhận yêu cầu sửa, chặn tạo phiên cọc cho đến khi Manager giải quyết.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "text": "Đề nghị làm rõ điều khoản về cách liên hệ người nhận."
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
    "status": "CONTRACT_CHANGES_REQUESTED",
    "feedback": "Đề nghị làm rõ điều khoản về cách liên hệ người nhận."
  }
}
```

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Cần xử lý khoản cọc trước khi sửa hợp đồng.",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J39 — POST /manager/contracts/{contractId}/feedback/decision

**SỬA** · Role **LOGISTICS_MANAGER**.

Manager đồng ý điều chỉnh, từ chối sửa hoặc ngừng phục vụ khi không thể thống nhất.

ACCEPTED mở sửa và phát hành phiên bản mới, nextAction = EDIT_DRAFT. REJECTED giữ phiên bản hiện hành và cấp lại đủ thời hạn từ lúc quyết định, đồng bộ hạn hóa đơn, nextAction = REVIEW_CURRENT_VERSION. Nếu thiếu thời gian, giữ nguyên dữ liệu và quay lại xét duyệt lịch. STOP_SERVICE ngừng phục vụ, nextAction = NONE, chỉ chốt hủy khi không còn khoản chờ đối soát hoặc phải hoàn. Có tiền đã nhận thì dùng luồng hủy và hoàn. STOP_SERVICE là lệnh API, không lưu vào enum FeedbackStatus nếu chưa bổ sung SQL.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "decision": "REJECTED",
  "text": "Giữ điều khoản liên hệ hiện tại. Hai bên đã xác định người nhận trong hợp đồng."
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
    "decision": "REJECTED",
    "requestStatus": "CONTRACT_READY",
    "completionDeadlineAtUtc": "2026-11-12T04:00:00Z",
    "nextAction": "REVIEW_CURRENT_VERSION"
  }
}
```

**Response lỗi 409 — CONTRACT_PREPARATION_WINDOW_TOO_SHORT**

```json
{
  "success": false,
  "message": "Không thể cấp đủ thời gian để khách tiếp tục theo lịch hiện tại.",
  "errorCode": "CONTRACT_PREPARATION_WINDOW_TOO_SHORT",
  "data": null
}
```

### F1-J40 — POST /manager/contracts/{contractId}/extend-deadline

**SỬA** · Role **LOGISTICS_MANAGER**.

Gia hạn hợp đồng chưa ký và đồng bộ hạn hóa đơn cọc, sau khi kiểm tra đủ thời gian chuẩn bị.

Giữ cách tính gia hạn từ hạn đang còn hiệu lực hoặc từ thời điểm hiện tại nếu đã hết hạn. Gia hạn không tự xác minh cọc và không tự tạo Trip.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "reason": "Khách cần thêm thời gian hoàn tất ký OTP."
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
    "newDeadline": "2026-11-12T02:00:00Z",
    "reason": "Khách cần thêm thời gian hoàn tất ký OTP.",
    "by": "USER_004",
    "at": "2026-11-11T02:00:00Z"
  }
}
```

**Response lỗi 409 — CONTRACT_PREPARATION_WINDOW_TOO_SHORT**

```json
{
  "success": false,
  "message": "Gia hạn sẽ làm thời gian chuẩn bị không còn đủ.",
  "errorCode": "CONTRACT_PREPARATION_WINDOW_TOO_SHORT",
  "data": null
}
```

## 8. Cọc, đối soát và ký

### F1-J42 — GET /customer/requests/{requestId}/deposit

**SỬA** · Role **CUSTOMER**.

Trả trạng thái cọc trên hóa đơn hiện hành và quyền tạo phiên. Chưa có giao dịch thì paymentOutcome là null.

Khách xem ba kết quả SUCCESS, FAILED, UNCONFIRMED qua paymentOutcome. Trường status cũ vẫn giữ để tương thích. Dữ liệu đã nhận cọc nhưng chờ xử lý được phân biệt qua receivedAmount và reviewRequired.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

Không gửi body.

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
    "canPay": false,
    "validUntil": "2026-11-11 02:00",
    "completionDeadlineAtUtc": "2026-11-11T02:00:00Z",
    "paymentOutcome": "UNCONFIRMED",
    "transactions": [
      {
        "id": "PAYMENT_001",
        "paymentId": "PAYMENT_001",
        "invoiceId": "INVOICE_001",
        "contractId": "CONTRACT_001",
        "versionNo": 1,
        "amount": 8000000,
        "currency": "VND",
        "method": "VNPAY",
        "status": "PROCESSING",
        "databaseStatus": "PENDING_GATEWAY",
        "receivedAmount": null,
        "paidAt": null,
        "reviewRequired": false,
        "reviewReason": null,
        "expiresAt": "2026-11-10 02:15",
        "createdAt": "2026-11-10 02:00",
        "paymentOutcome": "UNCONFIRMED"
      }
    ]
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy hóa đơn cọc.",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J43 — POST /customer/invoices/{invoiceId}/payment-session

**SỬA** · Role **CUSTOMER**.

Chỉ tạo phiên khi đúng bản đã đồng ý, còn hạn và không có giao dịch cũ cần xác minh.

Trong thời gian phiên còn sử dụng được, retry có thể trả chính phiên cũ. Chỉ mở phiên mới sau khi giao dịch cũ đã có kết quả cho phép thử lại. Hết hạn phiên không tự suy ra chưa nhận tiền.

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
    "status": "PROCESSING",
    "paymentUrl": "https://payment.example.test/session-demo",
    "expiresAt": "2026-11-10 02:15",
    "paymentOutcome": "UNCONFIRMED"
  }
}
```

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Vẫn còn giao dịch cần xác minh. Vui lòng kiểm tra giao dịch cũ.",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J44 — GET /customer/payments/{paymentId}

**SỬA** · Role **CUSTOMER**.

Xem kết quả xác minh. FE dùng paymentOutcome, không kết luận dựa vào trang khách quay về từ cổng thanh toán.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request JSON**

Không gửi body.

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
    "paidAt": "2026-11-10T02:04:00Z",
    "reviewRequired": false,
    "reviewReason": null,
    "expiresAt": "2026-11-10 02:15",
    "createdAt": "2026-11-10 02:00",
    "paymentOutcome": "SUCCESS"
  }
}
```

**Response lỗi 404 — NOT_FOUND**

```json
{
  "success": false,
  "message": "Không tìm thấy giao dịch của khách.",
  "errorCode": "NOT_FOUND",
  "data": null
}
```

### F1-J71 — POST /manager/payments/{paymentId}/confirm

**SỬA** · Role **LOGISTICS_MANAGER**.

Đối soát hoặc phân bổ tiền đã được xác minh vào hóa đơn hiện hành. Dùng lại endpoint Manager đang có.

Đề xuất bỏ cách xác nhận thành công chỉ bằng ghi chú của Manager. Nếu cổng chưa xác minh thì vẫn UNCONFIRMED. Khi đã có chứng cứ tiền về muộn, chỉ phân bổ nếu hợp đồng được gia hạn hợp lệ, hóa đơn đúng phiên bản và không chờ hủy. Nếu khách dừng thì chuyển luồng hủy/hoàn. Phân bổ lặp lại không cộng tiền hai lần.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| paymentId | PAYMENT_001 |

**Request JSON**

```json
{
  "reason": "Đã đối chiếu giao dịch VNPay sau khi gia hạn hợp đồng."
}
```

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
    "paidAt": "2026-11-10T02:04:00Z",
    "reviewRequired": false,
    "reviewReason": null,
    "expiresAt": "2026-11-10 02:15",
    "createdAt": "2026-11-10 02:00",
    "paymentOutcome": "SUCCESS"
  }
}
```

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Chưa có bằng chứng xác minh giao dịch hoặc chưa đủ điều kiện phân bổ vào hóa đơn.",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J67 — GET /payments/vnpay/ipn

**SỬA** · Role **VNPAY**.

Nhận kết quả đã ký từ VNPay và ghi nhận theo đúng giao dịch. Bảo toàn khoản thực nhận khi hợp đồng đã hết hạn, đang hủy hoặc đã hủy.

Giữ giao thức trả mã VNPay, xác minh chữ ký và tham chiếu. Xử lý idempotent. Tiền về muộn cần đối soát trước khi mở ký. Nếu đã hủy hợp lệ thì ghi nhận khoản phải hoàn, không khôi phục hợp đồng hoặc tạo Trip.

**Query**

`vnp_TxnRef, vnp_Amount, vnp_ResponseCode, vnp_TransactionStatus, vnp_SecureHash và các tham số theo cấu hình tích hợp hiện có`

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "RspCode": "00",
  "Message": "Recorded for reconciliation"
}
```

**Response lỗi 200 — 97**

```json
{
  "RspCode": "97",
  "Message": "Invalid signature or payload"
}
```

### F1-J50 — POST /customer/contracts/{contractId}/sign-otp

**SỬA** · Role **CUSTOMER**.

Gửi OTP khi cọc đúng phiên bản đã xác minh đủ, hợp đồng còn hạn và ngày lấy ngựa vẫn đủ thời gian chuẩn bị.

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
    "sentTo": "c***@example.test",
    "expiresInSeconds": 300,
    "resendAfterSeconds": 60
  }
}
```

**Response lỗi 409 — CONTRACT_PREPARATION_WINDOW_TOO_SHORT**

```json
{
  "success": false,
  "message": "Lịch đã chốt không còn đủ thời gian chuẩn bị để mở ký.",
  "errorCode": "CONTRACT_PREPARATION_WINDOW_TOO_SHORT",
  "data": null
}
```

### F1-J51 — POST /customer/contracts/{contractId}/sign

**SỬA** · Role **CUSTOMER**.

Ký OTP và kiểm tra lại đủ thời gian chuẩn bị ngay trước khi ghi nhận hiệu lực.

Cùng transaction: kiểm tra phiên bản, cọc, OTP, hạn và lịch; ghi Contract EFFECTIVE, Request ACTIVATED và tạo đúng một Trip PLANNING. Retry ký thành công trả lại Trip đã tạo. Phân công Trip tiếp tục dùng F1-J58.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "versionNo": 1,
  "otp": "123456"
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
    "signedAt": "2026-11-10 02:10"
  }
}
```

**Response lỗi 409 — CONTRACT_PREPARATION_WINDOW_TOO_SHORT**

```json
{
  "success": false,
  "message": "Không còn đủ thời gian chuẩn bị. Hợp đồng chưa được ký.",
  "errorCode": "CONTRACT_PREPARATION_WINDOW_TOO_SHORT",
  "data": null
}
```

## 9. Hủy và hoàn cọc

### F1-J52 — POST /customer/requests/{requestId}/cancel

**SỬA** · Role **CUSTOMER**.

Yêu cầu hủy trước ký. Nếu tiền chưa rõ, ghi nhận đang chờ đối soát và khóa cọc/ký.

Nếu chưa có tiền và mọi giao dịch đã kết thúc thì có thể hủy trực tiếp. Nếu còn giao dịch chưa rõ, giữ CANCELLATION_REQUESTED. Sau đối soát, nếu có tiền thực nhận, chuyển Manager xử lý hủy và hoàn đủ. Dùng cơ chế chấm dứt riêng cho hợp đồng đã ký.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Khách đề nghị dừng trước khi ký."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "status": "CANCELLATION_REQUESTED",
    "reason": "Khách đề nghị dừng trước khi ký.",
    "requestedAt": "2026-11-10T02:30:00Z",
    "previousStatus": "CONTRACT_READY",
    "waitingForPayment": true,
    "refund": null
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Yêu cầu đã ký hoặc đã chuyển sang vận hành.",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J53 — POST /manager/requests/{requestId}/cancel

**SỬA** · Role **LOGISTICS_MANAGER**.

Yêu cầu hủy trước ký. Nếu tiền chưa rõ, ghi nhận đang chờ đối soát và khóa cọc/ký.

Nếu chưa có tiền và mọi giao dịch đã kết thúc thì có thể hủy trực tiếp. Nếu còn giao dịch chưa rõ, giữ CANCELLATION_REQUESTED. Sau đối soát, nếu có tiền thực nhận, chuyển Manager xử lý hủy và hoàn đủ. Dùng cơ chế chấm dứt riêng cho hợp đồng đã ký.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| requestId | REQUEST_001 |

**Request JSON**

```json
{
  "reason": "Khách đề nghị dừng trước khi ký."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "status": "CANCELLATION_REQUESTED",
    "reason": "Khách đề nghị dừng trước khi ký.",
    "requestedAt": "2026-11-10T02:30:00Z",
    "previousStatus": "CONTRACT_READY",
    "waitingForPayment": true,
    "refund": null
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Yêu cầu đã ký hoặc đã chuyển sang vận hành.",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J54 — POST /manager/contracts/{contractId}/cancellation/decision

**SỬA** · Role **LOGISTICS_MANAGER**.

Duyệt hoặc từ chối hủy trước ký sau khi khoản cọc đã rõ. Nếu duyệt và có tiền thực nhận, tạo nghĩa vụ hoàn.

Không tự chuyển trạng thái hoàn sang COMPLETED. Nếu từ chối hủy, phục hồi trạng thái đủ điều kiện theo trạng thái tiền và hợp đồng thực tế. Lặp lại quyết định không tạo thêm khoản hoàn.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "decision": "APPROVED",
  "reason": "Đã đối soát, khách chưa ký và yêu cầu dừng."
}
```

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": "REQUEST_001",
    "status": "CANCELLED",
    "reason": "Khách đề nghị dừng trước khi ký.",
    "requestedAt": "2026-11-10T02:30:00Z",
    "previousStatus": "DEPOSIT_VERIFIED",
    "waitingForPayment": false,
    "refund": {
      "contractId": "CONTRACT_001",
      "requestId": "REQUEST_001",
      "refundStatus": "REQUESTED",
      "amount": 8000000,
      "currency": "VND",
      "reference": null,
      "refundedAtUtc": null,
      "verifiedBy": null
    }
  }
}
```

**Response lỗi 409 — PAYMENT_RECONCILIATION_REQUIRED**

```json
{
  "success": false,
  "message": "Chưa đủ kết quả đối soát để chốt hủy.",
  "errorCode": "PAYMENT_RECONCILIATION_REQUIRED",
  "data": null
}
```

### F1-J81 — POST /manager/contracts/{contractId}/refund/start

**MỚI** · Role **LOGISTICS_MANAGER**.

Ghi bắt đầu thực hiện nghĩa vụ hoàn cọc đã xác định từ giao dịch gốc.

Backend chốt số tiền phải hoàn từ khoản thực nhận đã xác minh, trừ phần đã hoàn có chứng từ nếu có. Retry đang PROCESSING trả trạng thái hiện tại. API ghi nhận tiến độ, không gọi chuyển tiền.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

Không gửi body.

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "contractId": "CONTRACT_001",
    "requestId": "REQUEST_001",
    "refundStatus": "PROCESSING",
    "amount": 8000000,
    "currency": "VND",
    "reference": null,
    "refundedAtUtc": null,
    "verifiedBy": null
  }
}
```

**Response lỗi 409 — INVALID_STATE**

```json
{
  "success": false,
  "message": "Chưa có nghĩa vụ hoàn đủ điều kiện xử lý.",
  "errorCode": "INVALID_STATE",
  "data": null
}
```

### F1-J55 — POST /manager/contracts/{contractId}/refund/complete

**SỬA** · Role **LOGISTICS_MANAGER**.

Ghi đã hoàn tất sau khi Manager xác minh giao dịch hoàn và bằng chứng thực tế.

Chỉ từ PROCESSING. Số tiền hoàn phải bằng nghĩa vụ còn lại trong phạm vi hoàn một lần của bản này. Lưu người xác minh và thời điểm xác minh từ backend. Retry cùng bằng chứng trả kết quả cũ, thay tham chiếu sau hoàn bị chặn. Nếu chưa rõ hoặc hoàn thất bại thì vẫn PROCESSING.

**Path parameters**

| Tên | Giá trị ví dụ |
|---|---|
| contractId | CONTRACT_001 |

**Request JSON**

```json
{
  "reference": "REF-DEMO-001",
  "amount": 8000000,
  "refundedAtUtc": "2026-11-11T02:20:00Z"
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
    "refundStatus": "COMPLETED",
    "amount": 8000000,
    "currency": "VND",
    "reference": "REF-DEMO-001",
    "refundedAtUtc": "2026-11-11T02:20:00Z",
    "verifiedBy": "USER_004"
  }
}
```

**Response lỗi 409 — REFUND_EVIDENCE_INVALID**

```json
{
  "success": false,
  "message": "Số tiền hoặc tham chiếu chưa đủ để xác nhận hoàn cọc.",
  "errorCode": "REFUND_EVIDENCE_INVALID",
  "data": null
}
```

## 10. Kiểm tra trước khi tích hợp

- Cập nhật OpenAPI, DTO backend và frontend theo cùng payload. Giữ các field baseline ngoài phần thay đổi. Khi thêm đợt, phương án, checklist và hạn phản hồi, đồng bộ schema, ràng buộc và seed chính sách. Không ghi đè hợp đồng hoặc giao dịch hiện có khi chuyển dữ liệu.
- Kiểm tra quyền theo người được giao ở cả API xem đợt, tải tệp và nộp kết quả. Với Manager và khách, chiếu dữ liệu riêng theo vai.
- Chạy ca xuyên suốt từ lịch gốc không khả thi đến lịch thay thế đã xác minh, khách đồng ý, Manager phát hành, xác minh cọc, ký OTP và tạo một Trip. Kiểm tra thêm hồ sơ thay đổi sau xác minh, phản hồi sát hạn, thanh toán chưa xác nhận, tiền về muộn và hoàn chưa thành công.
- Khi đối soát thủ công, phương án trong tài liệu yêu cầu bằng chứng VNPay trước khi phân bổ tiền vào hóa đơn. Đây là thay đổi đề xuất so với nhánh hiện tại.

## Phục hồi phiên thanh toán VNPay

- POST /customer/invoices/{invoiceId}/payment-session mở lại cùng PAYMENT, mã tham chiếu và hạn gốc nếu phiên vẫn còn hạn. Backend đối soát phiên cũ trước khi quyết định.
- GET /customer/payments/{paymentId}?refresh=true yêu cầu đối soát thủ công, giới hạn 10 giây giữa hai lần gọi VNPay cho cùng phiên.
- Phiên hết hạn vẫn có paymentOutcome UNCONFIRMED cho đến khi có kết quả VNPay đã xác minh. NOT_FOUND chỉ kết thúc phiên sau thời gian chờ thêm 15 phút kể từ hạn phiên.
- Lỗi truy vấn, gồm mã 99, giữ UNCONFIRMED và ghi lý do vào reviewReason. Background worker cùng việc tải trạng thái tiếp tục thử lại, với khoảng chờ 5 phút sau lỗi. Kiểm tra thủ công có thể thử sớm hơn sau 10 giây.
- UI giữ trạng thái chờ đối soát khi chưa rõ kết quả, chỉ mở thanh toán lại khi phiên cũ có kết quả thất bại đã xác minh.

## Quản lý chủ động hủy trước ký

POST /manager/requests/{requestId}/cancel chuyển thẳng request và hợp đồng sang CANCELLED.
Nếu có tiền đã xác minh, tạo nghĩa vụ hoàn REQUESTED. Lưu người hủy và quyết định của Quản lý.
Khách hàng chủ động hủy khi đã có tiền vẫn đi qua CANCELLATION_REQUESTED để chờ Quản lý quyết định.
Quản lý từ chối nhận một yêu cầu chưa chấp thuận bằng thao tác reject.

Màn xác minh hoàn lấy số tiền từ nghĩa vụ hoàn và cọc đã xác minh. Người dùng chỉ nhập tham chiếu chứng từ và thời gian hoàn.
Test UI với thiếu tham chiếu, thiếu thời gian hoặc thời gian ngoài khoảng từ lúc nhận tiền đến hiện tại.
Số tiền sai là ca kiểm tra API/backend.
