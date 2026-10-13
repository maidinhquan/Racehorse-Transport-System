# FLOW 01 – API Tạo & Phê duyệt Yêu cầu Vận chuyển

> **SWP391 – Cross-Border Racehorse Transport System**  
> **Use cases:** `UC-CUST-02`, `UC-CUST-03`, `UC-CUST-08` (phụ thuộc), `UC-CUST-10`, `UC-CUST-11`, `UC-CUST-09`, `UC-LM-01`, `UC-LM-02`, `UC-LM-03` (bổ sung).  
> **Actors:** `CUSTOMER`, `LOGISTICS_MANAGER`; các API Auth/Master/Horse/Document từ Shared và Customer là phụ thuộc.  
> **Cơ sở:** `00-conventions.md`, `01-shared-api.md`, `02-customer-api.md`, bản `04-manager-api.md` do nhóm cung cấp và các Business Rules đã chốt.  
> **Trạng thái:** *API Contract đề xuất để FE–BE triển khai*, chưa phải các endpoint đã code xong. Các endpoint đánh dấu **[BỔ SUNG]** cần đưa vào contract theo role khi nhóm hợp nhất.

## 1. Phạm vi và điểm kết thúc Flow 1

Flow 1 bắt đầu khi Customer xem dự toán/chuẩn bị đơn và kết thúc khi **đơn được kích hoạt** (`ACTIVATED`) hoặc rơi vào trạng thái kết thúc hợp lệ (`REJECTED`, `CANCELLED`). Flow 1 bao gồm: tạo đơn, xét duyệt và sửa đơn, lập kế hoạch sơ bộ, báo giá/thương lượng, ký hợp đồng, xác nhận tiền cọc, xử lý gia hạn/hủy, tạo Trip ban đầu.

**Không thuộc Flow 1:** thẩm định checklist và thông quan chi tiết (Flow 2), lập lộ trình/chọn xe/phân công crew (Flow 3), milestone vận chuyển (Flow 4), xử lý sự cố đang chạy (Flow 5). Chúng chỉ được viện dẫn làm API phụ thuộc/handoff, không trộn vào Flow 1.

**Các quy tắc bắt buộc:**

1. Một Transport Request thuộc một Customer; sau khi kích hoạt, một Request tạo **đúng một Trip** `PLANNING`, không gộp đơn của nhiều khách.
2. Dự toán ban đầu **không phải** báo giá chính thức. Bác sĩ thú y và bảo hiểm vận chuyển là **bắt buộc**, không phải tùy chọn.
3. Customer nhập đủ trường bắt buộc trước khi submit; hồ sơ chưa hoàn chỉnh có thể tạo cảnh báo và phải đạt điều kiện trước khởi hành.
4. Manager `ACCEPT`, `REJECT` hoặc yêu cầu `CHANGES_REQUESTED`. Customer sửa và gửi lại, Manager duyệt lại; không tự sửa dữ liệu quan trọng đã được chấp thuận.
5. Customer có thể đề xuất sửa thông tin quan trọng **trước khi ký**. Đề xuất đang chờ duyệt **không ghi đè Request**, đồng thời khóa chấp nhận Quote/ký Contract phiên bản cũ.
6. Báo giá và hợp đồng **có phiên bản, có lịch sử**. Mỗi Quote có hiệu lực **7 ngày**; mỗi phiên bản Contract chờ ký trong **7 ngày**; không giới hạn vòng thương lượng và **không tự kết thúc toàn bộ Request** khi một phiên bản hết hạn.
7. Trước khi ký, Customer được tự hủy Request. Sau ký, hủy cần Manager chấp thuận; đã ký nhưng chưa nhận cọc/contract chưa có hiệu lực thì **không áp dụng phạt hợp đồng** theo quy tắc demo.
8. `SIGNED` chưa có nghĩa `EFFECTIVE`. Chỉ sau **xác nhận cọc** thì Contract → `EFFECTIVE`, Request → `ACTIVATED`, BE tạo **một** Trip → `PLANNING` trong giao dịch nguyên tử.
9. Cọc quá hạn: nhắc một lần mỗi **ngày làm việc Việt Nam** trong **3 ngày làm việc** sau hạn; không tự hủy. Manager xử lý gia hạn hoặc hủy thủ công khi đủ điều kiện, không hủy khi có bằng chứng thanh toán chưa xử lý.
10. Manager phải **xác nhận triển khai** Trip sau kích hoạt trước khi Coordinator/Specialist bắt đầu quy trình chính thức. Đây là **handoff sang Flow 2/3**; khác với việc duyệt `READY_TO_DEPART` sau này.

## 2. Page → API (đầy đủ theo chức năng)

### 2.1. Customer

| Page / Function | Method | Endpoint | UC | Tính chất |
|---|---|---|---|---|
| Login / session | POST | `/auth/login` hoặc `/auth/google-login` | Shared | Tham chiếu `01` |
| Chọn quốc gia | GET | `/public/countries` | CUST-02/03 | Tham chiếu `01` |
| Chọn mode khả dụng | GET | `/customer/estimates/transport-modes` | CUST-02 | Có trong `02` |
| Xem dự toán sơ bộ | POST | `/customer/estimates` | CUST-02 | Có trong `02` |
| Tải PDF dự toán | POST | `/customer/estimates/pdf` | CUST-02 | Có trong `02` |
| Cấu hình form / min lead days | GET | `/customer/requests/form-options` | CUST-03 | Có trong `02` |
| Danh sách ngựa có thể chọn | GET | `/customer/horses/selectable` | CUST-03/08 | Có trong `02` |
| Thêm ngựa trong wizard | POST | `/customer/horses` | CUST-08 | Tham chiếu `02` |
| Xem hồ sơ ngựa | GET | `/customer/horses/{horseId}` | CUST-08 | Tham chiếu `02` |
| Tải giấy tờ ngựa | POST | `/customer/horses/{horseId}/documents` | CUST-04 | Phụ thuộc Flow 2/`02` |
| Xem tài liệu ngựa | GET | `/customer/horses/{horseId}/documents` | CUST-04 | Phụ thuộc Flow 2/`02` |
| Submit đơn cuối wizard | POST | `/customer/requests` | CUST-03 | Có trong `02` |
| Danh sách đơn | GET | `/customer/requests` | CUST-03 | Có trong `02` |
| Xem chi tiết/lịch sử/actions | GET | `/customer/requests/{requestId}` | CUST-03 | Có trong `02` |
| Xem Manager yêu cầu sửa | GET | `/customer/requests/{requestId}/revision-requests` | CUST-03 | **[BỔ SUNG]** |
| Sửa và gửi lại khi bị trả về | PUT | `/customer/requests/{requestId}/revision` | CUST-03 | Có trong `02` |
| Đề xuất thay đổi quan trọng | POST | `/customer/requests/{requestId}/change-requests` | CUST-03 | Có trong `02` |
| Lịch sử thay đổi quan trọng | GET | `/customer/requests/{requestId}/change-requests` | CUST-03 | Có trong `02` |
| Bổ sung thông tin trao đổi | GET | `/customer/requests/{requestId}/info-requests` | LM-01 | **[BỔ SUNG]** |
| Trả lời thông tin bổ sung | POST | `/customer/requests/{requestId}/info-responses` | LM-01 | Có trong bản Manager cũ, **đồng bộ vào `02`** |
| Hủy trước ký | POST | `/customer/requests/{requestId}/cancel` | CUST-10 | Có trong `02` |
| Yêu cầu hủy sau ký | POST | `/customer/requests/{requestId}/cancellation-requests` | CUST-10 | Có trong `02` |
| Xem tình trạng yêu cầu hủy | GET | `/customer/requests/{requestId}/cancellation-requests` | CUST-10 | **[BỔ SUNG]** |
| Danh sách phiên bản Quote | GET | `/customer/requests/{requestId}/quotes` | CUST-11 | Có trong `02` |
| Xem Quote | GET | `/customer/quotes/{quoteId}` | CUST-11 | Có trong `02` |
| Chấp nhận Quote | POST | `/customer/quotes/{quoteId}/accept` | CUST-11 | Có trong `02` |
| Yêu cầu điều chỉnh Quote | POST | `/customer/quotes/{quoteId}/request-adjustment` | CUST-11 | Có trong `02` |
| Từ chối Quote | POST | `/customer/quotes/{quoteId}/reject` | CUST-11 | Có trong `02` |
| Xem Contract và phiên bản | GET | `/customer/requests/{requestId}/contract` | CUST-11 | Có trong `02` |
| Gửi OTP ký Contract | POST | `/customer/contracts/{contractId}/otp` | CUST-11 | Có trong `02` |
| Ký Contract | POST | `/customer/contracts/{contractId}/sign` | CUST-11 | Có trong `02` |
| Không đồng ý Contract | POST | `/customer/contracts/{contractId}/decline` | CUST-11 | Có trong `02` |
| Số tiền cọc, hạn cọc, trạng thái thanh toán | GET | `/customer/requests/{requestId}/payments` | CUST-09 | Có trong `02` |
| QR/nội dung chuyển khoản | GET | `/customer/payments/bank-info` | CUST-09 | Có trong `02` |
| Tạo giao dịch qua cổng thanh toán | POST | `/customer/payments/online` | CUST-09 | Có trong `02`; phụ thuộc provider |
| Gửi bằng chứng thanh toán thủ công | POST | `/customer/payments/manual` | CUST-09 | Có trong `02` |
| Xem giao dịch | GET | `/customer/payments/transactions/{transactionId}` | CUST-09 | Có trong `02` |
| Biên nhận đã xác nhận | GET | `/customer/payments/transactions/{transactionId}/receipt` | CUST-09 | Có trong `02` |
| Xin gia hạn thanh toán cọc | POST | `/customer/requests/{requestId}/deposit-extension-requests` | CUST-09 | **[BỔ SUNG – ĐỀ XUẤT]** |
| Xem yêu cầu gia hạn | GET | `/customer/requests/{requestId}/deposit-extension-requests` | CUST-09 | **[BỔ SUNG – ĐỀ XUẤT]** |
| Notification badge + inbox | GET | `/notifications`, `/notifications/unread-count` | Shared | Tham chiếu `01` |
| Theo dõi thay đổi tức thời | SignalR | `/api/hubs/updates` | Shared | Hub, không phải REST |

**Wizard:** chuyển bước, quay lại bước, review trước khi Submit là **state của FE**, không phát sinh REST bắt buộc. `POST /customer/requests` chỉ gọi khi Customer xác nhận gửi **đơn hoàn chỉnh**; không tạo Request `DRAFT` ngầm để tránh xung đột enum đã chốt. Nếu nhóm muốn lưu dở trên server, phải phê duyệt một nghiệp vụ Draft độc lập trước khi bổ sung API.

### 2.2. Logistics Manager

| Page / Function | Method | Endpoint | UC | Tính chất |
|---|---|---|---|---|
| Dashboard đơn mới/chờ quyết định | GET | `/manager/dashboard` | LM-01 | Có trong `04` |
| Danh sách yêu cầu | GET | `/manager/requests` | LM-01 | Có trong `04` |
| Chi tiết yêu cầu + hồ sơ ngựa | GET | `/manager/requests/{requestId}` | LM-01 | Có trong `04` |
| Tiếp nhận đơn | POST | `/manager/requests/{requestId}/accept` | LM-01 | Có trong `04` |
| Từ chối đơn | POST | `/manager/requests/{requestId}/reject` | LM-01 | Có trong `04` |
| Yêu cầu Customer chỉnh sửa | POST | `/manager/requests/{requestId}/request-revision` | LM-01 | **[BỔ SUNG]** |
| Xem các lần sửa đơn | GET | `/manager/requests/{requestId}/revisions` | LM-01 | **[BỔ SUNG]** |
| Yêu cầu thông tin bổ sung (không sửa đơn) | POST | `/manager/requests/{requestId}/info-requests` | LM-01 | Có trong bản `04` cũ |
| Xem hỏi đáp bổ sung | GET | `/manager/requests/{requestId}/info-requests` | LM-01 | **[BỔ SUNG]** |
| Xem Customer đề xuất thay đổi | GET | `/manager/requests/{requestId}/change-requests` | LM-01/02 | **[BỔ SUNG]** |
| Duyệt đề xuất thay đổi | POST | `/manager/requests/{requestId}/change-requests/{changeRequestId}/approve` | LM-01/02 | **[BỔ SUNG]** |
| Từ chối đề xuất thay đổi | POST | `/manager/requests/{requestId}/change-requests/{changeRequestId}/reject` | LM-01/02 | **[BỔ SUNG]** |
| Xem yêu cầu hủy sau ký | GET | `/manager/requests/{requestId}/cancellation-requests` | CUST-10 | **[BỔ SUNG]** |
| Duyệt hủy sau ký | POST | `/manager/requests/{requestId}/cancellation-requests/{cancellationRequestId}/approve` | CUST-10 | **[BỔ SUNG]** |
| Từ chối hủy sau ký | POST | `/manager/requests/{requestId}/cancellation-requests/{cancellationRequestId}/reject` | CUST-10 | **[BỔ SUNG]** |
| Xem/lưu kế hoạch sơ bộ | GET, PUT | `/manager/requests/{requestId}/preliminary-plan` | LM-02 | Có trong `04` |
| Xem gợi ý báo giá/giá sàn | GET | `/manager/requests/{requestId}/quote-suggestion` | LM-02 | Có trong `04` |
| Lập/gửi báo giá phiên bản mới | POST | `/manager/requests/{requestId}/quotes` | LM-02 | Có trong `04` |
| Danh sách Quote | GET | `/manager/requests/{requestId}/quotes` | LM-02 | Có trong `04` |
| Xem Quote và lịch sử phản hồi | GET | `/manager/quotes/{quoteId}` | LM-02 | Có trong `04` |
| Xem Contract | GET | `/manager/requests/{requestId}/contract` | LM-02 | Có trong `04` |
| Sửa bản nháp Contract | PUT | `/manager/contracts/{contractId}` | LM-02 | Có trong `04` |
| Gửi Contract cho Customer | POST | `/manager/contracts/{contractId}/send` | LM-02 | Có trong `04` |
| Tạo phiên bản hợp đồng mới sau từ chối/hết hạn | POST | `/manager/requests/{requestId}/contract-versions` | LM-02 | **[BỔ SUNG]** |
| Hàng đợi giao dịch cần xác minh | GET | `/manager/payments/pending` | LM-03 | Có trong `04` |
| Chi tiết giao dịch và biên lai | GET | `/manager/payments/transactions/{transactionId}` | LM-03 | Có trong `04` |
| Duyệt xác nhận tiền | POST | `/manager/payments/transactions/{transactionId}/confirm` | LM-03 | Có trong `04` |
| Từ chối bằng chứng thanh toán | POST | `/manager/payments/transactions/{transactionId}/reject` | LM-03 | Có trong `04` |
| Xem thanh toán/cọc của đơn | GET | `/manager/requests/{requestId}/payments` | LM-03 | Có trong `04` |
| Danh sách yêu cầu gia hạn cọc | GET | `/manager/requests/{requestId}/deposit-extension-requests` | LM-03 | **[BỔ SUNG – ĐỀ XUẤT]** |
| Duyệt gia hạn cọc | POST | `/manager/requests/{requestId}/deposit-extension-requests/{extensionRequestId}/approve` | LM-03 | **[BỔ SUNG – ĐỀ XUẤT]** |
| Từ chối gia hạn cọc | POST | `/manager/requests/{requestId}/deposit-extension-requests/{extensionRequestId}/reject` | LM-03 | **[BỔ SUNG – ĐỀ XUẤT]** |
| Manager chủ động gia hạn (không có yêu cầu Customer) | POST | `/manager/requests/{requestId}/deposit-extensions` | LM-03 | **[BỔ SUNG]** |
| Hủy thủ công do quá hạn cọc sau grace | POST | `/manager/requests/{requestId}/cancel-overdue-deposit` | LM-03 | **[BỔ SUNG]** |
| Xem Trip vừa kích hoạt | GET | `/manager/trips/{tripId}` | Handoff | Có trong `04` |
| Manager xác nhận cho triển khai Trip | POST | `/manager/trips/{tripId}/confirm-deployment` | Handoff | **[BỔ SUNG]** |
| Manager tạm giữ triển khai / mở lại | POST | `/manager/trips/{tripId}/hold-deployment`, `/manager/trips/{tripId}/resume-deployment` | Handoff | **[BỔ SUNG]** |
| Nhận cập nhật realtime | SignalR | `/api/hubs/updates` | Shared | Hub, không phải REST |

### 2.3. Dịch vụ dùng chung / tự động

| Hành động hệ thống | Cách kích hoạt | Có cần endpoint riêng? |
|---|---|---|
| Sinh mã Request, lưu lịch sử, phát thông báo | `POST /customer/requests` | **Không**; side effect trong BE |
| Tự tính mức giá tham khảo | `POST /customer/estimates` | Không có endpoint phụ |
| Hết hạn từng phiên bản Quote/Contract | BE kiểm tra thời gian khi đọc/ghi; job đồng bộ khi cần | Không có API FE riêng |
| Sinh Contract `DRAFT` khi Quote được chấp nhận | `POST /customer/quotes/{quoteId}/accept` | Không cần API tạo Contract từ FE |
| Xác minh cổng thanh toán | Callback/webhook của nhà cung cấp | **Có adapter server** (URL/method theo provider, không phải Customer REST) |
| Sinh Trip `PLANNING` sau cọc xác nhận | Payment confirmation/webhook hợp lệ | **Không**; BE xử lý nguyên tử, chống tạo trùng |
| Gửi email nhắc cọc 3 ngày làm việc | Scheduled job + lịch ngày lễ/nghỉ bù Việt Nam | Không có API FE; phải có job backend |
| Phát SignalR events | Sau khi transaction DB thành công | Không có endpoint FE để tự phát |

## 3. State machine và quyền thực thi

### 3.1. Request và các đối tượng liên quan

```text
PENDING --Manager request-revision--> CHANGES_REQUESTED
CHANGES_REQUESTED --Customer PUT revision--> PENDING
PENDING --Manager reject--> REJECTED
PENDING --Manager accept--> ACCEPTED
ACCEPTED --Manager send quote--> QUOTING
QUOTING --Customer accepts active Quote--> AWAITING_CONTRACT
AWAITING_CONTRACT --Customer signs latest Contract--> AWAITING_DEPOSIT
AWAITING_DEPOSIT --Deposit confirmed--> ACTIVATED + Trip(PLANNING)
Pre-signature states --Customer cancels--> CANCELLED
Signed states --Manager approves cancellation--> CANCELLED (contract policy)
ACTIVATED --Flow 2/3 ...-- (đến CLOSED ở các flow sau)
```

- `CHANGES_REQUESTED` là sửa **đơn bị Manager yêu cầu chỉnh sửa** trong lần xét duyệt. `ChangeRequest` là **đề xuất thay đổi quan trọng do Customer khởi xướng** khi đơn đang được xử lý; **không** đổi RequestStatus sang `CHANGES_REQUESTED` chỉ vì có ChangeRequest đang `PENDING_APPROVAL`.
- Có thể có `InfoRequest` chỉ yêu cầu giải thích/bổ sung bằng chứng, không sửa trường canonical của Transport Request; nó không thay thế được `request-revision`.
- Quote/Contract hết hạn chỉ hết hạn **phiên bản**, không tự `EXPIRED` toàn bộ đơn. Trường hợp Quote bị từ chối không tự coi Request là `CANCELLED`.
- Contract `SIGNED` trước cọc; `EFFECTIVE` sau cọc. Mọi thao tác mang tính chấp nhận Quote/ký Contract phải kiểm tra pending change và phiên bản mới nhất.

### 3.2. Permission và allowedActions

| Actor | Trạng thái/điều kiện | AllowedActions mẫu |
|---|---|---|
| Customer | `PENDING` | `CANCEL`, `REQUEST_CHANGE`, `VIEW` |
| Customer | `CHANGES_REQUESTED` | `SUBMIT_REVISION`, `CANCEL`, `VIEW` |
| Customer | `QUOTING` + quote hiện hành hợp lệ | `ACCEPT_QUOTE`, `REQUEST_QUOTE_ADJUSTMENT`, `REJECT_QUOTE`, `REQUEST_CHANGE`, `CANCEL` |
| Customer | `AWAITING_CONTRACT` + Contract `PENDING_SIGNATURE` | `REQUEST_SIGN_OTP`, `SIGN_CONTRACT`, `DECLINE_CONTRACT`, `REQUEST_CHANGE`, `CANCEL` |
| Customer | `AWAITING_DEPOSIT` | `PAY_DEPOSIT`, `REQUEST_CANCELLATION`, `REQUEST_DEPOSIT_EXTENSION` (nếu hỗ trợ) |
| Customer | `ACTIVATED` | `VIEW_TRIP`, `REQUEST_CANCELLATION` theo điều kiện hợp đồng |
| Manager | `PENDING` | `ACCEPT`, `REJECT`, `REQUEST_REVISION`, `REQUEST_INFO` |
| Manager | Customer ChangeRequest đang chờ | `APPROVE_CHANGE`, `REJECT_CHANGE` |
| Manager | `ACCEPTED`/`QUOTING` | `EDIT_PRELIMINARY_PLAN`, `SEND_QUOTE` theo quy tắc |
| Manager | `AWAITING_CONTRACT` | `EDIT_CONTRACT`, `SEND_CONTRACT` |
| Manager | Payment `PENDING_CONFIRMATION` | `CONFIRM_PAYMENT`, `REJECT_PAYMENT` |
| Manager | Sau grace cọc và đủ điều kiện | `CANCEL_OVERDUE_DEPOSIT`, `EXTEND_DEPOSIT` |
| Manager | Trip `PLANNING`, chưa deployment | `CONFIRM_DEPLOYMENT`, `HOLD_DEPLOYMENT` |

Danh sách thực tế phải do BE trả theo quyền và trạng thái hiện hành. Không dùng `allowedActions` phía FE như biện pháp bảo mật; mỗi endpoint phải kiểm tra lại Role/Owner/State.

## 4. Chi tiết API: Customer – dự toán và chuẩn bị đơn

### F01-C01. `GET /customer/estimates/transport-modes`

**Query:** `originCountry` (bắt buộc), `destinationCountry` (bắt buộc).  
**200 data:** `{ "modes": ["ROAD", "AIR"] }`. BE chỉ trả mode khả thi; FE không tự đoán.  
**Errors:** `400 VALIDATION_ERROR`, `400 TRANSPORT_MODE_UNAVAILABLE` (nếu cần), `404 NOT_FOUND` khi resource riêng tư không thuộc quyền.

### F01-C02. `POST /customer/estimates`

Dự toán trước khi tạo đơn; không tạo Request/Quote.

```json
{
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "destinationCountry": "TH",
  "destinationCity": "Bangkok",
  "desiredDepartureDate": "2026-11-01",
  "horseCount": 2,
  "preferredTransportMode": "ROAD"
}
```

**200 OK**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "estimateAmount": 12900,
    "currency": "USD",
    "lines": [
      { "code": "TRANSPORT", "amount": 9000 },
      { "code": "PROCEDURES", "amount": 2000 },
      { "code": "VETERINARY_CARE", "amount": 1500, "mandatory": true },
      { "code": "MANDATORY_INSURANCE", "amount": 400, "mandatory": true }
    ],
    "note": "Dự toán tham khảo, không phải báo giá chính thức"
  }
}
```

`originCity`/`destinationCity`, ngày khởi hành, phương thức và `horseCount` có hiệu lực trong tính giá theo bảng giá BE. Không có `addOnServices` để khách bỏ chọn thú y/bảo hiểm. `400 VALIDATION_ERROR`, `400 TRANSPORT_MODE_UNAVAILABLE`, `404 PRICE_TABLE_NOT_FOUND`.

### F01-C03. `POST /customer/estimates/pdf`

**Body:** giống F01-C02.  
**200:** binary PDF, `Content-Type: application/pdf`, `Content-Disposition: attachment`; có ngày lập và nhãn "Dự toán tham khảo". Không dùng envelope cho PDF.

### F01-C04. `GET /customer/requests/form-options`

**200 data:** cấu hình FE cần để validate hợp lệ, ví dụ:

```json
{
  "minLeadDays": 14,
  "earliestDepartureDate": "2026-10-27",
  "supportedCountries": ["VN", "TH", "JP"],
  "supportedTransportModes": ["ROAD", "AIR"],
  "maxHorsesPerRequest": null
}
```

`earliestDepartureDate` phụ thuộc ngày hiện tại theo múi giờ nghiệp vụ; các giá trị là **ví dụ**, không hardcode số ngày hay phạm vi ở FE. Danh sách quốc gia đầy đủ lấy `GET /public/countries`.

### F01-C05. `GET /customer/horses/selectable`

**Query:** `departureDate`, `deadline`.  
**200 data:** mảng ngựa của Customer với `{horseId, name, microchipId, selectable, conflict, documentWarning}`. FE chỉ cho chọn `selectable = true`; BE vẫn validate lại khi submit.

**Thêm ngựa trong wizard:** dùng `POST /customer/horses`, sau đó gọi lại `GET /customer/horses/selectable`. **Upload hộ chiếu/bản scan** dùng `POST /customer/horses/{horseId}/documents`. Chi tiết payload ảnh và hộ chiếu theo `02-customer-api.md`/Flow 2, không sáng tác API mới cho cùng một chức năng.

### F01-C06. `POST /customer/requests`

Submit một lần ở bước Review/Confirm của wizard.

```json
{
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "pickupAddress": "Trường đua Đại Nam, Bình Dương",
  "destinationCountry": "TH",
  "destinationCity": "Bangkok",
  "deliveryAddress": "Royal Bangkok Sports Club, Bangkok",
  "receiver": { "fullName": "Somchai P.", "phone": "+66812345678" },
  "desiredDepartureDate": "2026-11-01",
  "deliveryDeadline": "2026-11-05",
  "preferredTransportMode": "ROAD",
  "horseIds": [31, 32],
  "specialRequirements": "Không có yêu cầu đặc biệt"
}
```

**201 Created**

```json
{
  "success": true,
  "message": "Transport request created",
  "data": {
    "requestId": 15,
    "requestCode": "REQ-20261013-0001",
    "status": "PENDING",
    "createdAt": "2026-10-13T03:00:00Z",
    "documentWarnings": [{ "horseId": 32, "message": "Hộ chiếu cần bổ sung" }],
    "allowedActions": ["VIEW", "CANCEL", "REQUEST_CHANGE"]
  }
}
```

**Validate:** quốc gia/mode hợp lệ; địa chỉ nhận và giao không rỗng; receiver hợp lệ; ngày khởi hành đủ lead days; `deliveryDeadline` sau ngày khởi hành; ít nhất một `horseId` không trùng; tất cả ngựa `ACTIVE` thuộc Customer và không xung đột lịch. `specialRequirements` rỗng = không có yêu cầu đặc biệt. Thiếu hồ sơ chuyên môn nhưng không cản tạo đơn có thể trả `documentWarnings` (Flow 2 xử lý trước khởi hành).

**Error:** `400 VALIDATION_ERROR`, `400 DEPARTURE_TOO_SOON`, `400 TRANSPORT_MODE_UNAVAILABLE`, `409 HORSE_SCHEDULE_CONFLICT`, `409 NO_HORSE_REGISTERED`. Dữ liệu lỗi phải có `errors[].field` để FE tô đỏ.

**Side effects:** BE tạo mã duy nhất, chụp snapshot thông tin ngựa/đơn, ghi audit history, tạo Notification/Task cho Manager và phát `RequestUpdated`, `NotificationCreated` qua SignalR sau commit.

### F01-C07. `GET /customer/requests` & `GET /customer/requests/{requestId}`

**Danh sách Query:** `status`, `q`, `from`, `to`, `page`, `pageSize`. Danh sách trả `data: { items, page, pageSize, totalItems, totalPages }` theo `00-conventions.md`.

**Chi tiết 200 data:**

```json
{
  "requestId": 15,
  "requestCode": "REQ-20261013-0001",
  "status": "PENDING",
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "pickupAddress": "Trường đua Đại Nam, Bình Dương",
  "destinationCountry": "TH",
  "destinationCity": "Bangkok",
  "deliveryAddress": "Royal Bangkok Sports Club, Bangkok",
  "receiver": { "fullName": "Somchai P.", "phone": "+66812345678" },
  "desiredDepartureDate": "2026-11-01",
  "deliveryDeadline": "2026-11-05",
  "horseIds": [31, 32],
  "currentQuote": null,
  "contract": null,
  "payment": { "paymentStatus": "UNPAID", "paidAmount": 0 },
  "trip": null,
  "pendingChangeRequest": null,
  "revisionRequests": [],
  "statusHistory": [{ "status": "PENDING", "at": "2026-10-13T03:00:00Z" }],
  "allowedActions": ["VIEW", "CANCEL", "REQUEST_CHANGE"]
}
```

**Ownership:** chỉ `customerId` từ token được xem; không có quyền → `404 NOT_FOUND`. Các list/detail của Manager có phạm vi theo role Manager.

## 5. Chi tiết API: Request review, sửa đơn và hủy

### F01-M01. `GET /manager/requests` & `GET /manager/requests/{requestId}`

Manager xem các Request `PENDING`, `CHANGES_REQUESTED`, `ACCEPTED`...; query `status`, `overdue`, `q`, `originCountry`, `destinationCountry`, `page`, `pageSize`. Chi tiết trả Request và **support data** để quyết định: tóm tắt ngựa/hồ sơ, năng lực dự kiến, estimate, `allowedActions`, lịch sử. Manager không được giả định rằng thiếu hồ sơ y tế là thiếu dữ liệu bắt buộc để tạo Request.

### F01-M02. `POST /manager/requests/{requestId}/accept`

**Body:** `{ "note": "Tuyến khả thi, chuẩn bị báo giá" }` (note có thể để trống).  
**200 data:** `{ "requestId": 15, "status": "ACCEPTED", "decidedAt": "2026-10-13T08:00:00Z" }`.  
**Precondition:** Request `PENDING`, không có pending ChangeRequest ngăn việc chốt nội dung. **Không tạo Trip.**  
**Errors:** `409 INVALID_STATE`, `409 REQUEST_STATE_CHANGED`; Manager xử lý đồng thời phải có optimistic concurrency/transaction.

### F01-M03. `POST /manager/requests/{requestId}/reject`

```json
{ "reasonGroup": "DEADLINE_NOT_FEASIBLE", "reason": "Không thể đáp ứng ngày bàn giao yêu cầu" }
```

**200 data:** `{ "requestId": 15, "status": "REJECTED", "rejectReason": "Không thể đáp ứng ngày bàn giao yêu cầu" }`.  
**Validate:** `reason` bắt buộc; các `reasonGroup`: `INSUFFICIENT_CAPACITY`, `DEADLINE_NOT_FEASIBLE`, `ROUTE_NOT_FEASIBLE`, `OTHER`.  
**Side effect:** giải phóng lịch ngựa, lưu người xét duyệt, thông báo Customer. `REJECTED` là trạng thái cuối, không thể resubmit cùng Request.

### F01-M04. `POST /manager/requests/{requestId}/request-revision` **[BỔ SUNG]**

Yêu cầu Customer chỉnh sửa nội dung nghiệp vụ (không chỉ trao đổi). Chỉ thực hiện khi `PENDING`.

```json
{
  "reason": "Ngày dự kiến không khả thi, cần điều chỉnh",
  "fields": ["desiredDepartureDate", "deliveryDeadline"],
  "managerSuggestion": { "desiredDepartureDate": "2026-11-03" },
  "dueAt": "2026-10-20T10:00:00Z"
}
```

**201 data:** `{ "revisionRequestId": 31, "requestId": 15, "requestStatus": "CHANGES_REQUESTED", "status": "OPEN" }`.  
**Side effects:** thông báo Customer; khóa accept/reject khi đang đợi Customer resubmit; lưu version và người đề nghị.  
**Errors:** `409 INVALID_STATE`, `409 REVISION_ALREADY_PENDING`, `400 VALIDATION_ERROR`.

### F01-C08. `GET /customer/requests/{requestId}/revision-requests` **[BỔ SUNG]**

**200 data:** `[{ "revisionRequestId": 31, "status": "OPEN", "fields": ["desiredDepartureDate"], "reason": "...", "dueAt": "...", "createdAt": "..." }]` (trong envelope), trả cả lịch sử `RESUBMITTED`, `SUPERSEDED` nếu có.

### F01-C09. `PUT /customer/requests/{requestId}/revision`

Gửi **bản đơn đầy đủ đã chỉnh sửa**, không phải PATCH tùy ý. Body là payload F01-C06 + `revisionRequestId`, `revisionNote`, ví dụ:

```json
{
  "revisionRequestId": 31,
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "pickupAddress": "Trường đua Đại Nam, Bình Dương",
  "destinationCountry": "TH",
  "destinationCity": "Bangkok",
  "deliveryAddress": "Royal Bangkok Sports Club, Bangkok",
  "receiver": { "fullName": "Somchai P.", "phone": "+66812345678" },
  "desiredDepartureDate": "2026-11-03",
  "deliveryDeadline": "2026-11-07",
  "preferredTransportMode": "ROAD",
  "horseIds": [31, 32],
  "specialRequirements": "",
  "revisionNote": "Đã điều chỉnh theo yêu cầu Manager"
}
```

**200 data:** `{ "requestId": 15, "status": "PENDING", "revisionVersion": 2 }`. BE validate như khi tạo mới, lưu snapshot cũ, close revision request. Manager xét duyệt lại. `409 REQUEST_REVISION_NOT_ALLOWED` nếu không ở `CHANGES_REQUESTED`.

### F01-M05. `GET /manager/requests/{requestId}/revisions` **[BỔ SUNG]**

Trả lịch sử các phiên bản Request và thay đổi có người thực hiện, thời điểm, reason, các trường trước/sau. Customer chỉ được xem lịch sử thuộc đơn mình qua detail/revision endpoint, không thấy ghi chú nội bộ của Manager.

### F01-M06. `POST /manager/requests/{requestId}/info-requests` & `GET /manager/requests/{requestId}/info-requests`

Dùng cho câu hỏi/đính kèm bổ sung nhưng **không sửa canonical fields** và không nhất thiết chuyển `RequestStatus`. `POST`:

```json
{ "message": "Cho biết loại thức ăn cần tránh cho ngựa?", "dueAt": "2026-10-17T10:00:00Z" }
```

**201 data:** `{ "infoRequestId": 8, "status": "OPEN" }`. `GET` trả lịch sử hỏi đáp theo `infoRequestId`. Các field bắt buộc của Request **không được trống để rồi mới yêu cầu hỏi đáp**.

### F01-C10. `GET /customer/requests/{requestId}/info-requests` & `POST /customer/requests/{requestId}/info-responses`

`GET` trả các câu hỏi thuộc Request. `POST` dùng multipart với `payload = {"infoRequestId":8,"message":"..."}` và `attachments[]` tùy chọn, hoặc JSON thuần khi không có file.  
**201 data:** `{ "responseId": 9, "infoRequestId": 8, "createdAt": "..." }`.  
**Rule:** đây là trao đổi, không tự cập nhật địa chỉ, ngày, danh sách ngựa, giá hay trạng thái Request.

### F01-C11. `POST /customer/requests/{requestId}/change-requests`

Customer chủ động đề xuất thay đổi quan trọng **trước ký** (kể cả khi Request đã `ACCEPTED`/`QUOTING`/`AWAITING_CONTRACT`).

```json
{
  "reason": "Thay đổi lịch thi đấu",
  "proposedChanges": {
    "desiredDepartureDate": "2026-11-05",
    "deliveryDeadline": "2026-11-10",
    "pickupAddress": "Địa chỉ nhận ngựa mới"
  }
}
```

**201 data:** `{ "changeRequestId": 51, "status": "PENDING_APPROVAL", "createdAt": "..." }`. **Canonical Request không thay đổi**.  
**Rule:** không cho ký Contract hay chấp nhận Quote khi còn `PENDING_APPROVAL`; Manager phải xử lý; sau duyệt BE tạo phiên bản/snapshot Request mới và vô hiệu hóa hoặc yêu cầu cập nhật Quote/Contract bị ảnh hưởng.  
**Error:** `409 REQUEST_CHANGE_NOT_ALLOWED`, `409 CHANGE_REQUEST_ALREADY_PENDING`.

### F01-C12. `GET /customer/requests/{requestId}/change-requests` & F01-M07. `GET /manager/requests/{requestId}/change-requests`

Trả `{ changeRequestId, requestId, status, reason, proposedChanges, managerNote, reviewedAt, createdAt }`, mới nhất trước; Customer chỉ xem của mình; Manager theo quyền tác nghiệp.

### F01-M08. `POST /manager/requests/{requestId}/change-requests/{changeRequestId}/approve` **[BỔ SUNG]**

```json
{ "note": "Chấp thuận đổi lịch, cần báo giá phiên bản mới" }
```

**200 data:** `{ "changeRequestId": 51, "status": "APPROVED", "requestVersion": 3, "requoteRequired": true, "contractRevisionRequired": false }`.  
**BE bắt buộc:** validate lại ngựa/lịch/mode và các điều kiện theo bản đề xuất; apply atomic; giữ lịch sử; chặn double approval, hủy hoặc thay thế phiên bản giá/hợp đồng không còn phản ánh dữ liệu mới; phát thông báo Customer.  
**Errors:** `409 INVALID_STATE`, `409 CHANGE_REQUEST_ALREADY_REVIEWED`, `409 HORSE_SCHEDULE_CONFLICT`.

### F01-M09. `POST /manager/requests/{requestId}/change-requests/{changeRequestId}/reject` **[BỔ SUNG]**

```json
{ "reason": "Không đủ năng lực vận chuyển vào ngày đề nghị" }
```

**200 data:** `{ "changeRequestId": 51, "status": "REJECTED", "requestVersionUnchanged": true }`. Request và Quote/Contract hiện có không đổi; phải revalidate hiệu lực nếu Customer muốn thao tác tiếp. `400 VALIDATION_ERROR` khi thiếu lý do.

### F01-C13. `POST /customer/requests/{requestId}/cancel`

```json
{ "reason": "Hủy tham gia giải đấu" }
```

**200 data:** `{ "requestId": 15, "status": "CANCELLED", "cancelledAt": "..." }`. **Chỉ trước khi Contract ký** (khi backend trả `CANCEL`); giải phóng ngựa và chấm dứt các phiên bản Quote/Contract còn chờ theo audit.  
**Error:** `409 CANCELLATION_REQUIRES_APPROVAL` sau ký; `409 REQUEST_NOT_CANCELLABLE` khi đã đóng/hủy/từ chối.

### F01-C14. `POST /customer/requests/{requestId}/cancellation-requests` & `GET .../cancellation-requests`

**POST body:** `{ "reason": "Không thể tham gia giải" }`. **201 data:** `{ "cancellationRequestId": 19, "status": "PENDING_APPROVAL" }`. `GET` trả lịch sử yêu cầu. Sau ký, Customer không được tự dừng chuyến; Request chỉ đổi trạng thái nếu Manager duyệt và có phương án an toàn/nghĩa vụ tài chính xử lý theo hợp đồng.

### F01-M10. `GET /manager/requests/{requestId}/cancellation-requests`, `POST .../{cancellationRequestId}/approve`, `POST .../{cancellationRequestId}/reject` **[BỔ SUNG]**

**Approve body:**

```json
{
  "decisionReason": "Chấp thuận hủy trước khi triển khai",
  "contractualChargeAmount": 0,
  "currency": "USD",
  "refundAmount": 0,
  "note": "Hợp đồng đã ký nhưng chưa hiệu lực vì cọc chưa xác nhận"
}
```

**200 data:** `{ "cancellationRequestId": 19, "status": "APPROVED", "requestStatus": "CANCELLED", "settlementStatus": "NONE" }`.  
**Reject body:** `{ "reason": "Cần thống nhất phương án vận chuyển ngựa an toàn" }`. **200 data:** `{ "status": "REJECTED", "requestStatus": "AWAITING_DEPOSIT" }` (hoặc trạng thái Request hiện hành).  
**Rule:** số tiền phạt/hoàn cọc chỉ do Manager xác định **theo hợp đồng**, **không phát sinh phạt hợp đồng trước khi Contract có hiệu lực do chưa xác nhận cọc**; không tự gán chi phí cho Customer. Nếu Trip đã vận hành, phải phối hợp nghiệp vụ vận hành trước khi kết thúc.

## 6. Chi tiết API: Manager kế hoạch sơ bộ & báo giá

### F01-M11. `GET /manager/requests/{requestId}/preliminary-plan`, `PUT /manager/requests/{requestId}/preliminary-plan`

**PUT body**

```json
{
  "transportMode": "ROAD",
  "transitCountries": ["KH"],
  "plannedCheckpointIds": [11, 12],
  "plannedDepartureAt": "2026-11-01T01:00:00Z",
  "plannedArrivalAt": "2026-11-03T09:00:00Z",
  "keyMilestones": [{ "name": "Qua cửa khẩu Mộc Bài", "plannedAt": "2026-11-01T06:00:00Z" }],
  "stallsRequired": 2,
  "currency": "USD",
  "budgetItems": [
    { "category": "FUEL", "amount": 1200 },
    { "category": "STAFF", "amount": 1800 },
    { "category": "PROCEDURE", "amount": 1500 },
    { "category": "VET", "amount": 1100 },
    { "category": "INSURANCE", "amount": 400 }
  ]
}
```

**200 data:** `{ "planId": 30, "totalBudget": 6000, "deadlineCheck": {"meetsDeadline": true, "earliestFeasibleArrival": "2026-11-03T09:00:00Z"} }`. `GET` trả kế hoạch/snapshot đã lưu.  
**Validate:** mode phải khả thi; đánh giá hạn; có ngân sách bắt buộc cho chăm sóc thú y, bảo hiểm; định tuyến/sân bay/cửa khẩu chi tiết chỉ là **sơ bộ**, Coordinator và Specialist xác nhận trong Flow 2/3.  
**Rule:** có cảnh báo đến trễ có thể lưu nếu Manager giải trình; chưa tạo Trip.

### F01-M12. `GET /manager/requests/{requestId}/quote-suggestion`

**200 data:** `{ "currency":"USD", "estimatedCost":6000, "minMarginPercent":15, "floorPrice":6900, "suggestedItems":[...], "negotiation":{"round":5} }`.  
**Rule:** giá sàn do BE tính từ cấu hình; **không có `maxRounds` hoặc `endsAt` giới hạn toàn cuộc thương lượng**.

### F01-M13. `POST /manager/requests/{requestId}/quotes`

Gửi bản Quote mới khi chưa có bản đang chờ Customer hoặc khi có thay đổi thương lượng hợp lệ; tạo version tự tăng, lịch sử bất biến.

```json
{
  "currency": "USD",
  "items": [
    { "category": "TRANSPORT", "description": "Vận chuyển 2 ngựa", "quantity": 1, "unitPrice": 9000 },
    { "category": "PROCEDURE", "description": "Thủ tục", "quantity": 1, "unitPrice": 2000 },
    { "category": "VETERINARY_CARE", "description": "Chăm sóc thú y bắt buộc", "quantity": 1, "unitPrice": 1100 },
    { "category": "INSURANCE", "description": "Bảo hiểm bắt buộc", "quantity": 1, "unitPrice": 400 }
  ],
  "depositPercent": 30,
  "included": ["Chăm sóc trong phạm vi vận chuyển"],
  "excluded": ["Các chi phí ngoài phạm vi hợp đồng"],
  "possibleExtraCosts": ["Chi phí chờ theo hợp đồng"],
  "noteToCustomer": "Báo giá chính thức phiên bản mới"
}
```

**201 data:** `{ "quoteId": 78, "version": 2, "status": "SENT", "validUntil": "2026-10-21T04:30:00Z", "requestStatus": "QUOTING" }`.  
**Validate:** plan đã có, giá không dưới floor, đủ chi phí bắt buộc, không pending ChangeRequest.  
**Errors:** `409 PRELIMINARY_PLAN_REQUIRED`, `409 QUOTE_BELOW_FLOOR`, `409 QUOTE_AWAITING_CUSTOMER`, `409 REQUEST_CHANGE_PENDING`. **Không dùng** `NEGOTIATION_LIMIT_REACHED`.  
**Side effects:** thay thế quote cũ khi hợp lệ, tạo notification cho Customer và SignalR.

### F01-M14. `GET /manager/requests/{requestId}/quotes` & `GET /manager/quotes/{quoteId}`

Danh sách các phiên bản và chi tiết, kèm `status`, `sentAt`, `validUntil`, phản hồi Customer, những version bị thay thế/hết hạn. Đây là nơi Manager xem lý do yêu cầu điều chỉnh để tạo Quote mới.

### F01-C15. `GET /customer/requests/{requestId}/quotes` & `GET /customer/quotes/{quoteId}`

**Quote data mẫu:**

```json
{
  "quoteId": 78,
  "requestId": 15,
  "version": 2,
  "status": "SENT",
  "isLatest": true,
  "currency": "USD",
  "items": [{ "category": "TRANSPORT", "amount": 9000 }, { "category": "VETERINARY_CARE", "amount": 1100 }, { "category": "INSURANCE", "amount": 400 }],
  "totalAmount": 12500,
  "depositPercent": 30,
  "depositAmount": 3750,
  "sentAt": "2026-10-14T04:30:00Z",
  "validUntil": "2026-10-21T04:30:00Z",
  "negotiation": { "round": 5, "canRequestAdjustment": true },
  "allowedActions": ["ACCEPT", "REQUEST_ADJUSTMENT", "REJECT"]
}
```

`GET /customer/requests/{id}/quotes` trả cả history, riêng bản cũ chỉ xem. BE chỉ cho hành động trên version mới nhất hợp lệ.

### F01-C16. `POST /customer/quotes/{quoteId}/accept`

**Body:** không cần. **200 data:** `{ "quoteId":78, "quoteStatus":"ACCEPTED", "requestStatus":"AWAITING_CONTRACT", "contractId":40, "contractStatus":"DRAFT" }`.  
**Side effect:** sinh Contract `DRAFT` từ đúng Quote version và preliminary plan đã được duyệt ở bước thương mại.  
**Errors:** `409 QUOTE_NOT_LATEST`, `409 QUOTE_EXPIRED`, `409 REQUEST_CHANGE_PENDING`, `409 INVALID_STATE`.

### F01-C17. `POST /customer/quotes/{quoteId}/request-adjustment`

**Body:** `{ "content": "Đề nghị điều chỉnh điều khoản phí chờ" }`. **200 data:** `{ "quoteId":78, "quoteStatus":"ADJUSTMENT_REQUESTED", "requestStatus":"QUOTING" }`.  
**Manager nhận thông báo**, có thể phát hành version Quote tiếp theo. Không giới hạn số vòng.

### F01-C18. `POST /customer/quotes/{quoteId}/reject`

**Body:** `{ "reason": "Chưa phù hợp ngân sách" }`. **200 data:** `{ "quoteId":78, "quoteStatus":"REJECTED", "requestStatus":"QUOTING" }`.  
Không tự `CANCELLED` Request; Manager có thể gửi phiên bản mới hoặc Customer hủy riêng qua API cancel.

## 7. Chi tiết API: Contract và ký điện tử

### F01-C19. `GET /customer/requests/{requestId}/contract` & F01-M15. `GET /manager/requests/{requestId}/contract`

Trả **version Contract hiện hành**, danh sách phiên bản trước, PDF và các mốc thời hạn; nếu chưa có: `data: null`.

```json
{
  "contractId": 40,
  "requestId": 15,
  "version": 2,
  "quoteId": 78,
  "status": "PENDING_SIGNATURE",
  "pdfFile": { "fileId": 700, "url": "/api/files/700" },
  "deliveryDeadline": "2026-11-05",
  "depositAmount": 3750,
  "depositDueDate": "2026-10-25",
  "signDeadline": "2026-10-22T02:00:00Z",
  "signedAt": null,
  "effectiveAt": null,
  "history": [{ "contractId": 39, "version": 1, "status": "SUPERSEDED" }],
  "allowedActions": ["REQUEST_OTP", "SIGN", "DECLINE"]
}
```

**Lưu ý:** hạn cọc là điều khoản Contract; thời hạn 7 ngày ký là của **phiên bản chưa ký**, không phải deadline toàn Request. Customer không được tự sửa nội dung hợp đồng.

### F01-M16. `PUT /manager/contracts/{contractId}` & `POST /manager/contracts/{contractId}/send`

**PUT body:** `{ "customTerms": "Điều khoản riêng được Manager soạn" }`; chỉ sửa Contract `DRAFT` chưa gửi/ký.  
**POST send body:** không cần; **200 data:** `{ "contractId":40, "status":"PENDING_SIGNATURE", "signDeadline":"..." }`.  
**Rule:** gửi lại khi bản trước bị từ chối/hết hạn **phải tạo version Contract mới**; không ghi đè version cũ. BE lưu hash/snapshot nội dung ký.

### F01-M17. `POST /manager/requests/{requestId}/contract-versions` **[BỔ SUNG]**

**Body:** `{ "sourceContractId": 40, "reason": "Bổ sung điều khoản đã thương lượng" }`.  
**201 data:** `{ "contractId":41, "version":3, "status":"DRAFT", "sourceContractId":40 }`.  
**Precondition:** Request chưa có Contract hiệu lực/đã ký không được tùy ý tái tạo. Manager tạo version từ bản `SIGN_DECLINED`/`EXPIRED` hoặc một bản chưa ký cần thay thế; BE khóa bản cũ tương ứng. Chữ ký đã có không bị sửa.

### F01-C20. `POST /customer/contracts/{contractId}/otp`

**Body:** không cần. **200 data:** `{ "sentTo":"c***@example.com", "expiresInSeconds":300, "resendAfterSeconds":60 }`.  
**Rules:** chỉ Contract `PENDING_SIGNATURE`, version mới nhất, chưa quá hạn, không có ChangeRequest chờ xử lý; OTP giới hạn số lần và không lộ mã. `409 OTP_RESEND_TOO_SOON`, `409 CONTRACT_EXPIRED`, `409 REQUEST_CHANGE_PENDING`.

### F01-C21. `POST /customer/contracts/{contractId}/sign`

**Body:** `{ "otp": "482913" }`.  
**200 data:** `{ "contractId":40, "contractStatus":"SIGNED", "signedAt":"...", "requestStatus":"AWAITING_DEPOSIT" }`.  
**BE bắt buộc:** kiểm tra OTP đúng, mới nhất, chưa dùng, còn hạn; Contract version/hash chưa đổi; người ký là Customer có quyền; chưa có thay đổi quan trọng chờ Manager; lưu danh tính, thời gian và dấu vết ký.  
**Errors:** `400 OTP_INVALID_OR_EXPIRED`, `409 CONTRACT_EXPIRED`, `409 CONTRACT_NOT_LATEST`, `409 REQUEST_CHANGE_PENDING`. **Không tạo Trip tại đây.**

### F01-C22. `POST /customer/contracts/{contractId}/decline`

**Body:** `{ "reason": "Điều kiện chăm sóc chưa rõ" }`.  
**200 data:** `{ "contractId":40, "contractStatus":"SIGN_DECLINED", "requestStatus":"AWAITING_CONTRACT" }`. Manager sửa điều khoản bằng **version mới** F01-M17 và gửi tiếp; không giới hạn số phiên bản hợp đồng đã thống nhất; một version chưa ký có hạn 7 ngày.

## 8. Chi tiết API: thanh toán cọc, gia hạn và kích hoạt

### F01-C23. `GET /customer/requests/{requestId}/payments` & F01-M18. `GET /manager/requests/{requestId}/payments`

**200 data mẫu:**

```json
{
  "requestId": 15,
  "contractAmount": 12500,
  "adjustedTotalPayable": 12500,
  "currency": "USD",
  "paymentStatus": "UNPAID",
  "paidAmount": 0,
  "receivables": [{ "receivableId":201, "type":"DEPOSIT", "amount":3750, "paidAmount":0, "dueDate":"2026-10-25", "status":"UNPAID" }],
  "depositReminder": {
    "graceWorkingDays": 3,
    "graceWorkingDaysElapsed": 0,
    "remindersSent": 0,
    "pendingPaymentVerification": false,
    "approvedExtensionUntil": null,
    "managerCancellationEligible": false
  },
  "transactions": []
}
```

`GET` cho Customer không được trả internal budget/profit; Manager có thể xem bản ghi đối soát thuộc quyền. Nếu đã có proof chờ review, `managerCancellationEligible = false`.

### F01-C24. `GET /customer/payments/bank-info`

**Query:** `requestId`. **200 data:** `{ "bankName":"Vietcombank", "accountName":"Cong ty Transport", "accountNumber":"...", "transferContent":"REQ-... COC", "qrPayload":"..." }`.  
FE dựng QR thanh toán từ dữ liệu được BE xác nhận; không hardcode tài khoản thụ hưởng. Các field QR có thể do module payment cung cấp, phải thống nhất với BE tích hợp.

### F01-C25. `POST /customer/payments/online`

**Body:** `{ "receivableId":201, "returnUrl":"http://localhost:5173/customer/payments/result" }`. **200 data:** `{ "transactionId":503, "paymentUrl":"https://provider.example/checkout/..." }`.  
**Rule:** FE redirect không khẳng định `SUCCESS`. Chỉ webhook/callback được BE **xác thực theo provider** mới được ghi thành công; chống callback lặp/tấn công giả mạo. Provider cụ thể chưa chốt, không khóa cứng tên hay method callback.

### F01-C26. `POST /customer/payments/manual`

**Content-Type:** `multipart/form-data`: `receivableId` (int), `method` (`BANK_TRANSFER` hoặc phương thức thủ công đã hỗ trợ), `amount`, `paidDate`, `note`, `receipt` PDF/JPG/PNG.  
**201 data:** `{ "transactionId":503, "status":"PENDING_CONFIRMATION" }`. Không đánh dấu đặt cọc thành công trước khi Manager xác nhận.  
**Errors:** `409 CONTRACT_NOT_SIGNED`, `409 PAYMENT_PENDING_CONFIRMATION`, `409 RECEIVABLE_ALREADY_PAID`.

### F01-C27. `GET /customer/payments/transactions/{transactionId}` & `GET .../{transactionId}/receipt`

`GET transaction`: envelope, `{transactionId, requestId, receivableId, method, amount, status, rejectReason, createdAt, confirmedAt}`.  
`GET receipt`: file PDF binary khi `status = SUCCESS` (không phải chụp proof). Customer chỉ xem giao dịch của mình, người khác → `404`.

### F01-M19. `GET /manager/payments/pending` & `GET /manager/payments/transactions/{transactionId}`

Hàng đợi kiểm tra các proof `PENDING_CONFIRMATION` và chi tiết; cung cấp `receiptFile`, `declaredAmount`, `expectedAmount`, `paidDate`, thông tin đối soát. Manager đối chiếu giao dịch thực tế, không dựa duy nhất vào ảnh chụp hoặc lời khai của Customer.

### F01-M20. `POST /manager/payments/transactions/{transactionId}/confirm`

```json
{ "confirmedAmount": 3750, "note": "Đã đối soát số tiền thực nhận" }
```

**200 data:**

```json
{
  "transactionId": 503,
  "transactionStatus": "SUCCESS",
  "paymentStatus": "DEPOSIT_PAID",
  "requestStatus": "ACTIVATED",
  "contractStatus": "EFFECTIVE",
  "trip": { "tripId": 9, "status": "PLANNING" }
}
```

**BE transaction nguyên tử / idempotent:**

1. Khóa giao dịch/receivable và kiểm tra `PENDING_CONFIRMATION`, số tiền, quyền Manager, chưa từng xác nhận.
2. Ghi `SUCCESS`, tổng tiền thực nhận và audit; cộng tiền thu một lần.
3. Nếu khoản cọc đạt điều kiện: Contract `SIGNED` → `EFFECTIVE`; Request → `ACTIVATED`; **tạo đúng một** Trip `PLANNING` với unique `requestId`.
4. Ghi chứng từ/biên nhận, notification Customer, Manager, phát `PaymentUpdated` và `RequestUpdated` sau commit.
5. Trip mới **chưa được triển khai chính thức** nếu Manager chưa confirm deployment (handoff Flow 2/3).

**Errors:** `409 TRANSACTION_ALREADY_PROCESSED`, `409 INVALID_PAYMENT_AMOUNT`, `409 INVALID_STATE`. Trường hợp cọc chưa đủ, trả số đã thu và `requestStatus = AWAITING_DEPOSIT`, chưa tạo Trip.

### F01-M21. `POST /manager/payments/transactions/{transactionId}/reject`

**Body:** `{ "reason":"Không có giao dịch phù hợp trên sao kê" }`.  
**200 data:** `{ "transactionId":503, "transactionStatus":"REJECTED", "requestStatus":"AWAITING_DEPOSIT" }`. Lưu lý do; Customer nhận thông báo, Request không tự hủy. `400 VALIDATION_ERROR` nếu thiếu lý do.

### F01-C28. `POST /customer/requests/{requestId}/deposit-extension-requests` & `GET .../deposit-extension-requests` **[BỔ SUNG – ĐỀ XUẤT]**

**POST:** `{ "requestedDueDate":"2026-10-30", "reason":"Ngân hàng cần thời gian xử lý" }`; **201:** `{ "extensionRequestId":11, "status":"PENDING_APPROVAL" }`. `GET` trả các yêu cầu và kết quả; đây là API giao diện đề xuất để Customer xin gia hạn. **Business Rule đã chốt chỉ yêu cầu Manager có quyền gia hạn**, chưa bắt buộc phải cho Customer chủ động xin trên hệ thống.

### F01-M22. `GET /manager/requests/{requestId}/deposit-extension-requests`, `POST /manager/requests/{requestId}/deposit-extension-requests/{extensionRequestId}/approve|reject` **[BỔ SUNG – ĐỀ XUẤT]**

Approve body `{ "approvedDueDate":"2026-10-30", "note":"Cho phép gia hạn" }`. Reject body `{ "reason":"Không phù hợp điều kiện hợp đồng" }`. Manager phải lưu người duyệt/lý do và cập nhật deadline/grace logic tương ứng khi approve. Nếu không triển khai Customer request extension thì **không cần ba endpoint này**, thay bằng F01-M23.

### F01-M23. `POST /manager/requests/{requestId}/deposit-extensions` **[BỔ SUNG]**

Manager **chủ động phê duyệt gia hạn cọc**:

```json
{ "newDepositDueDate":"2026-10-30", "reason":"Khách đã xuất trình xác nhận chuyển tiền quốc tế đang xử lý" }
```

**201 data:** `{ "extensionId":12, "newDepositDueDate":"2026-10-30", "approvedBy":5 }`. BE lưu cả hạn cũ/hạn mới, cập nhật `managerCancellationEligible`, lịch nhắc tương lai và thông báo Customer; không sửa trực tiếp bản hợp đồng đã ký (lưu phụ lục/quyết định gia hạn có hiệu lực nghiệp vụ theo hợp đồng).

### F01-M24. `POST /manager/requests/{requestId}/cancel-overdue-deposit` **[BỔ SUNG]**

Hủy **thủ công** sau khi hết **3 ngày làm việc Việt Nam** tính từ hạn cọc có hiệu lực; lịch trừ ngày lễ/nghỉ bù được cấu hình.

```json
{ "reason":"Hết thời hạn gia hạn và không có tiền cọc hợp lệ" }
```

**200 data:** `{ "requestId":15, "requestStatus":"CANCELLED", "cancellationReason":"...", "cancelledAt":"..." }`.  
**Chặn `409`:** chưa đủ grace, đã có cọc được xác nhận, có gia hạn còn hiệu lực, đang có giao dịch/proof chờ xác minh, Request đã hết hiệu lực thao tác. Không tự hủy bằng scheduled job, không phạt theo hợp đồng chưa hiệu lực do thiếu cọc.

### F01-S01. Webhook/callback của provider thanh toán **[ADAPTER NGOÀI CUSTOMER API]**

Endpoint public do **module Payment** thiết kế theo cổng thanh toán được chọn, ví dụ `POST /payments/gateway/webhook`; phương thức/URL/headers phải theo provider thực tế. Backend xác thực chữ ký/transaction reference/amount/merchant, ghi nhận idempotent, dùng **cùng service kích hoạt** như F01-M20. Không tin return URL FE. FE xem kết quả bằng F01-C27 và SignalR `PaymentUpdated`.

### F01-S02. Job nhắc cọc **[KHÔNG CÓ ENDPOINT REST FE]**

BE chạy job định kỳ theo lịch Việt Nam, sau `depositDueDate` gửi **một reminder mỗi ngày làm việc** trong 3 ngày làm việc grace; chống gửi trùng theo `(requestId, reminderDate)`; không gửi khi đã xác nhận cọc, gia hạn hợp lệ hoặc đang có kết quả xử lý làm nhắc nhở không còn phù hợp. Hết grace chỉ cập nhật điều kiện/Task cho Manager cân nhắc hủy **thủ công**, không auto-cancel.

## 9. Handoff sau khi đơn ACTIVATED (không triển khai Flow 2/3 trong file này)

### F01-M25. `GET /manager/trips/{tripId}`

**200 data:** bao gồm `tripId`, `requestId`, `status: PLANNING`, `preliminaryPlan`, `deployment: {status, confirmedAt, holdReason}`, `allowedActions`. Manager xem thông tin trước khi giao Coordinator/Specialist.

### F01-M26. `POST /manager/trips/{tripId}/confirm-deployment` **[BỔ SUNG]**

**Body:** `{ "note":"Đủ điều kiện bàn giao bước lập kế hoạch chi tiết" }`.  
**200 data:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"CONFIRMED", "confirmedAt":"..." }`. BE mới tạo tasks chính thức cho Coordinator và Specialist (triển khai **song song**). Đây **không phải** phê duyệt cuối `READY_TO_DEPART`.

### F01-M27. `POST /manager/trips/{tripId}/hold-deployment` & `POST /manager/trips/{tripId}/resume-deployment` **[BỔ SUNG]**

Hold body `{ "reason":"Cần làm rõ điều kiện an toàn" }`. Resume body `{ "note":"Đã xử lý vướng mắc" }`.  
**200 data:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"ON_HOLD" }` hoặc `CONFIRMED`. Giữ TripStatus `PLANNING`; đây là **trạng thái triển khai riêng**, không phát minh `TripStatus.ON_HOLD`. Không cho tiến hành phân công chính thức trong thời gian hold; Manager không tùy tiện từ chối hợp đồng có hiệu lực.

## 10. SignalR và tự động hóa (bắt buộc cho Flow 1)

**Hub:** `/api/hubs/updates` như `00-conventions.md`; sử dụng ASP.NET Core SignalR và `@microsoft/signalr`. Hub **không** tạo/xác nhận Request/Payment/Contract.

| Sự kiện | Khi nào | Người nhận | FE làm gì |
|---|---|---|---|
| `RequestUpdated` | Submit, Manager accept/reject/request-revision, resubmit, duyệt change, hủy, kích hoạt | Customer chủ đơn; Manager được phép | `GET /.../requests/{id}`, refresh `allowedActions` |
| `NotificationCreated` | Có thông báo mới | Chủ thông báo | Tải unread-count/inbox |
| `PaymentUpdated` | Proof submitted/confirmed/rejected, gia hạn/hủy quá hạn | Customer chủ đơn; Manager | Tải `GET /.../payments` |
| `TripUpdated` | Trip `PLANNING` được tạo; deployment confirmed/held/resumed | Manager; Customer chủ đơn; nhân sự liên quan sau phân công | Tải GET trip và trạng thái |

Quote/Contract thay đổi được báo qua `RequestUpdated` và `NotificationCreated`, FE tải lại Quote/Contract bằng REST. **BE chỉ phát event sau DB commit**, payload tối thiểu `{ "entityId": 15, "occurredAt": "...", "version": 3 }`. Không broadcast hợp đồng/thanh toán cho người ngoài phạm vi; không dùng SignalR thay REST hoặc dùng GPS nền. Kết nối lại phải refresh REST.

## 11. Error contract và ràng buộc triển khai

**Envelope thành công:**

```json
{ "success": true, "message": "OK", "data": {} }
```

**Envelope lỗi:**

```json
{
  "success": false,
  "message": "Cannot accept quote while request changes are pending",
  "errorCode": "REQUEST_CHANGE_PENDING",
  "data": null,
  "errors": []
}
```

| HTTP | errorCode | Áp dụng |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu/sai trường, ngày, số tiền, dữ liệu ngựa |
| 400 | `OTP_INVALID_OR_EXPIRED` | Xác thực ký Contract không hợp lệ |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED` | Auth |
| 403 | `FORBIDDEN_ROLE`, `ACCOUNT_INACTIVE` | Role/trạng thái tài khoản |
| 404 | `NOT_FOUND` | Resource không có hoặc Customer không sở hữu |
| 409 | `INVALID_STATE`, `REQUEST_STATE_CHANGED` | Race condition/trạng thái sai |
| 409 | `HORSE_SCHEDULE_CONFLICT` | Ngựa trùng lịch |
| 409 | `REQUEST_CHANGE_PENDING` | Quote/sign bị khóa do thay đổi chưa duyệt |
| 409 | `QUOTE_NOT_LATEST`, `QUOTE_EXPIRED`, `QUOTE_BELOW_FLOOR` | Quote |
| 409 | `CONTRACT_EXPIRED`, `CONTRACT_NOT_LATEST` | Contract |
| 409 | `PAYMENT_PENDING_CONFIRMATION`, `RECEIVABLE_ALREADY_PAID` | Payment |
| 409 | `CANCELLATION_REQUIRES_APPROVAL`, `REQUEST_NOT_CANCELLABLE` | Cancellation |
| 409 | `DEPOSIT_GRACE_NOT_EXPIRED`, `DEPOSIT_VERIFICATION_PENDING`, `DEPOSIT_EXTENSION_ACTIVE` | Manual overdue cancellation |
| 429 | `RATE_LIMITED` | OTP / thao tác có giới hạn |

Các mã **[BỔ SUNG]** phải được đồng bộ vào `00-conventions.md` và các contract role khi nhóm áp dụng; không được để cùng một Business Rule có hai `errorCode` mâu thuẫn.

**Quy tắc backend:**

- Request `POST`, payment manual, Quote send, confirm, signed action phải chống bấm đôi: idempotency key hoặc unique constraint/transaction phù hợp. Riêng activation phải **unique Trip per Request**.
- Manager reject/accept, xử lý change và payment phải có concurrency control; không xảy ra nhận/từ chối cùng lúc, tạo Quote sau cancel hoặc kích hoạt Request đã hủy.
- Bản ghi Quote/Contract đã gửi hoặc đã ký phải được version hóa, giữ audit, không chỉnh sửa trực tiếp. Chữ ký hợp đồng gắn với nội dung phiên bản cụ thể.
- Thời điểm API dùng UTC ISO 8601; tính **ngày làm việc Việt Nam** bằng calendar cấu hình. `date` dùng `YYYY-MM-DD`; trường `dueAt` có timezone.
- Dữ liệu giao dịch tài chính/định danh người ký/giấy tờ ngựa phải có authorization và audit; file chỉ truy cập qua `GET /files/{fileId}` kiểm tra quyền.
- Trường hợp hủy sau ký/đã activation phải áp dụng contract conditions và tình trạng an toàn thực tế, không làm mất lịch sử payment/proof.

## 12. Checklist bảo đảm mỗi function có API hoặc BE automation

| # | Function nghiệp vụ | Điểm FE / BE chịu trách nhiệm | API / cơ chế | Kết quả kiểm tra |
|---|---|---|---|---|
| 1 | Đăng nhập, lấy tài khoản | Shared | `/auth/login`, `/account/me` | Có, tham chiếu `01` |
| 2 | Chọn quốc gia/mode/dữ liệu form | Customer | `/public/countries`, `/estimates/transport-modes`, `/requests/form-options` | Có |
| 3 | Dự toán và xuất PDF | Customer | `POST /estimates`, `POST /estimates/pdf` | Có |
| 4 | Chọn/thêm ngựa, upload hộ chiếu | Customer + Flow 2 | `GET /horses/selectable`, `POST /horses`, `POST /horses/{id}/documents` | Có, phụ thuộc |
| 5 | Wizard nhiều bước / quay lại / Review | FE | FE state | Không cần REST riêng |
| 6 | Submit Request, lưu mã, báo Manager | Customer + BE | `POST /requests`; side effect | Có |
| 7 | Danh sách, xem chi tiết, theo dõi trạng thái | Customer/Manager | `GET /requests`, `GET /requests/{id}` | Có |
| 8 | Manager Accept/Reject | Manager | `POST /accept`, `POST /reject` | Có |
| 9 | Manager yêu cầu sửa và Customer resubmit | Manager/Customer | `POST /request-revision`, `GET /revision-requests`, `PUT /revision` | **Bổ sung đầy đủ** |
| 10 | Hỏi đáp thông tin bổ sung | Manager/Customer | `/info-requests`, `/info-responses` | **Bổ sung GET** |
| 11 | Customer đề xuất sửa và Manager duyệt/từ chối | Customer/Manager | `/change-requests`, `/approve`, `/reject` | **Bổ sung phần Manager** |
| 12 | Hủy trước ký | Customer | `POST /cancel` | Có |
| 13 | Xin hủy sau ký / Manager duyệt/từ chối | Customer/Manager | `/cancellation-requests`, `/approve`, `/reject` | **Bổ sung phần Manager** |
| 14 | Lập kế hoạch sơ bộ | Manager | `GET/PUT /preliminary-plan` | Có |
| 15 | Giá gợi ý / biên lợi nhuận | Manager | `GET /quote-suggestion` | Có |
| 16 | Tạo/gửi/version Quote | Manager | `POST /quotes`, `GET /quotes` | Có |
| 17 | Customer xem/chấp nhận/yêu cầu điều chỉnh/từ chối Quote | Customer | `/quotes/{id}`, `/accept`, `/request-adjustment`, `/reject` | Có |
| 18 | Sinh Contract sau Quote accept | BE | Side effect của Quote accept | Không cần endpoint FE |
| 19 | Manager sửa/gửi/version Contract | Manager | `PUT /contracts/{id}`, `POST /send`, `POST /contract-versions` | **Bổ sung version** |
| 20 | Customer xem Contract, nhận OTP/ký/từ chối | Customer | `GET /contract`, `/otp`, `/sign`, `/decline` | Có |
| 21 | Xem cọc, hạn cọc, trạng thái | Customer/Manager | `GET /.../payments` | Có |
| 22 | Thanh toán online/QR/chuyển khoản/proof | Customer + gateway | `GET /bank-info`, `POST /online`, `POST /manual` | Có |
| 23 | Xem kết quả/biên nhận | Customer | `GET /transactions/{id}`, `GET /receipt` | Có |
| 24 | Manager kiểm tra/duyệt/từ chối proof | Manager | `GET /pending`, `GET /transactions/{id}`, `POST /confirm|reject` | Có |
| 25 | Gia hạn cọc | Manager; Customer optional | `POST /deposit-extensions`; option `/deposit-extension-requests` | **Bổ sung** |
| 26 | Job nhắc cọc 3 ngày làm việc | BE | Background job; **không REST FE** | Có cơ chế |
| 27 | Hủy thủ công sau grace | Manager | `POST /cancel-overdue-deposit` | **Bổ sung** |
| 28 | Xác thực gateway callback | Payment BE | Webhook/adapter theo provider | Có cơ chế, cần provider |
| 29 | Activation và tạo **1 Trip** | BE | Side effect giao dịch cọc thành công | Không cần kích hoạt tay |
| 30 | Manager confirm/hold/resume triển khai | Manager | `POST /confirm-deployment`, `/hold-deployment`, `/resume-deployment` | **Bổ sung** |
| 31 | Email, Tasks, notifications | BE + Shared | `/notifications`, `/tasks`, SignalR events + jobs | Có |

**Kết luận kiểm tra coverage:** Không còn function thao tác nghiệp vụ nào của Flow 1 chỉ tồn tại dưới dạng "nút trên FE" mà không có REST tương ứng hoặc một cơ chế Backend tự động đã mô tả. Các endpoint **[BỔ SUNG]** cần được cập nhật vào contract role hiện hành trước khi code; các bước thuộc Flow 2/3 đã được chỉ rõ là phụ thuộc/handoff, không giả định triển khai trong Flow 1.
