# FLOW 01 – API Contract v2.0: Tạo, xét duyệt, báo giá và kích hoạt yêu cầu vận chuyển

> **SWP391 – Cross-Border Racehorse Transport System**  
> **Use cases:** `UC-CUST-02`, `UC-CUST-03`, `UC-CUST-08` (phụ thuộc), `UC-CUST-10`, `UC-CUST-11`, `UC-CUST-09`, `UC-LM-01`, `UC-LM-02`, `UC-LM-03` (bổ sung).  
> **Actors:** `CUSTOMER`, `LOGISTICS_MANAGER`; các API Auth/Master/Horse/Document từ Shared và Customer là phụ thuộc.  
> **Cơ sở:** `00-conventions.md`, `01-shared-api.md`, `02-customer-api.md`, `04-manager-api.md` và các Business Rules đã chốt.  
> **Phiên bản tài liệu:** **2.0 – Final Flow Contract** (chuẩn nghiệp vụ của Flow 1; phải đồng bộ các Role Contract trước khi triển khai toàn bộ).
> **Trạng thái:** **HOÀN THIỆN BẢN TỔNG FLOW 1**; chỉ còn phụ thuộc triển khai/cấu hình và công việc đồng bộ Role API. Không hàm ý mọi endpoint đã implement hoặc đã integration test.
> **Kiến trúc tài liệu:** Đây là **bản đồ end-to-end của Flow 1**, không phải một nhóm endpoint `/flow1/*` riêng. Các endpoint `/customer/*`, `/manager/*`, `/auth/*`, `/files/*` là **cùng các API** được mô tả trong `02-customer-api.md`, `04-manager-api.md`, `01-shared-api.md`. Khi phát hiện khác biệt về payload/status/error giữa Flow và Role, FE–BE phải thống nhất **một contract duy nhất**, cập nhật cả hai tài liệu; không duy trì hai định nghĩa API mâu thuẫn.



## 1. Mục tiêu, phạm vi và luồng tổng thể

**Hệ thống:** Cross-Border Racehorse Transport System (SWP391). **Tài liệu:** API Contract cho Flow 1 — Tạo, xét duyệt, báo giá, ký hợp đồng, nhận đặt cọc và kích hoạt đơn. **Phiên bản:** `2.0 – Final Flow Contract (chờ đồng bộ sang Role Contracts)`. **Ngày rà soát:** 13/10/2026.

**Căn cứ thống nhất:** các quyết định nghiệp vụ mới nhất của nhóm; `00-conventions.md` cho chuẩn response/role và `02-customer-api.md`, `04-manager-api.md` là tài liệu cần được đồng bộ theo tài liệu này **trước khi giao FE/BE**. Các endpoint ở đây là **thiết kế giao tiếp**, không mặc định tuyên bố đã implement. Không thêm route `/flow1/*`.

**Phạm vi demo bắt buộc:** nội địa **VN→VN** và vận chuyển một chiều **VN→JP**. **Không** hỗ trợ JP→VN, VN→TH hay quốc gia khác trong demo. BE kiểm tra cặp tuyến; mode khả dụng trả từ cấu hình (không suy đoán cặp tuyến có hỗ trợ ROAD/AIR nào chỉ từ quốc gia).

**Actor chính:** `CUSTOMER`, `LOGISTICS_MANAGER`. `TRANSPORT_SPECIALIST` nhận và thực hiện hồ sơ/thủ tục công ty trong Flow 2; `FLEET_COORDINATOR` thực hiện điều phối ở Flow 3 sau khi có handoff. `DRIVER`/`ESCORT` không có quyền hành động Flow 1. Email/OTP, Files, Notification, Payment Adapter là dịch vụ phụ thuộc.

**Bắt đầu:** Customer xem Estimate, đăng ký/chọn Horse và chuẩn bị Request. **Kết thúc thành công:** Backend đã xác minh đủ tiền cọc, Contract `EFFECTIVE`, Request `ACTIVATED`, tạo **duy nhất một Trip `PLANNING`**, sau đó Manager xác nhận Deployment để bàn giao Flow 2/3. **Các kết thúc khác:** `REJECTED` hoặc `CANCELLED` bởi chủ thể có quyền và đúng điều kiện.

```text
Customer xem Estimate (không ràng buộc) + chuẩn bị hồ sơ thuộc trách nhiệm Customer
  → SUBMIT Request(PENDING)
  → Manager: ACCEPT / REQUEST_REVISION / REJECT
  → ACCEPTED → Preliminary Plan + Backend Pricing Suggestion
  → Manager chỉnh giá, chọn depositPercent, validUntil, phát hành Quote(versioned)
  → Customer: ACCEPT / REQUEST_ADJUSTMENT / REJECT Quote
  → ACCEPT Quote → Contract DRAFT → Manager gửi Contract với completionDeadline chung
  → Customer OTP SIGN → Contract(SIGNED), Request(AWAITING_DEPOSIT)
  → FE chuyển trang thanh toán; có thể rời trang và quay lại không ký lại
  → VNPay xác minh Backend HOẶC Bank Transfer do Manager đối soát tiền thực nhận
  → ĐỦ CỌC → Contract(EFFECTIVE) + Request(ACTIVATED) + Trip(PLANNING)
  → Manager confirm-deployment → bàn giao Flow 2/3
```

**Ngoài phạm vi:** cấp phép/chứng nhận chuyên sâu, kiểm dịch và thông quan (Flow 2); lộ trình/nhân sự/xe/đường bay chính thức (Flow 3); milestone vận chuyển (Flow 4); xử lý sự cố giữa chuyến (Flow 5). Đặc biệt **không thiết kế GPS** trong Flow 1.

**Đã chốt về sản phẩm:** Pricing theo Hybrid (Backend tính, Manager chỉnh); giá sàn có ngoại lệ ghi lý do; tỷ lệ cọc và hiệu lực Quote do Manager chọn cho **từng phiên bản**; OTP ký trước, sau đó chuyển thanh toán cọc, dùng chung một `completionDeadline` cho cả hai việc; VNPay hoặc chuyển khoản ngân hàng (Manager đối soát); quá hạn khóa thanh toán mới, Manager có quyền gia hạn/hủy thủ công, hệ thống chỉ cảnh báo; **không tự hủy**.

## 2. Business Rules và bất biến Backend

| ID | Quy tắc đã chốt |
|---|---|
| F01-BR-01 | Chỉ VN→VN, VN→JP; mọi tuyến/mode phải được BE kiểm tra trước Estimate, Submit, Quote. |
| F01-BR-02 | Customer nộp đủ thông tin và tài liệu **thuộc trách nhiệm có thể cung cấp của Customer** trước Submit; Company/Specialist chuẩn bị thủ tục thuộc phía công ty ở Flow 2. Chưa Specialist duyệt ≠ chưa nộp. |
| F01-BR-03 | Không tạo Request `DRAFT` trên server chỉ vì Customer di chuyển giữa các bước wizard; tạo duy nhất khi Submit thành công. |
| F01-BR-04 | Mỗi Request thuộc một Customer; mỗi Request được kích hoạt có tối đa **một** Trip, tạo sau khi nhận đủ cọc đã xác minh. |
| F01-BR-05 | Manager duyệt, từ chối, yêu cầu sửa; khách sửa theo Revision; Customer Change Request trước ký không ghi đè dữ liệu gốc cho tới khi duyệt. |
| F01-BR-06 | Estimate chỉ là thông tin tham khảo; Quotation chính thức do Manager phát hành, có version bất biến và lịch sử. |
| F01-BR-07 | Hybrid Pricing: BE tính chi phí và giá bán đề xuất; Manager có quyền điều chỉnh giá/hạng mục trước khi phát hành Quote; BE tính lại tổng. |
| F01-BR-08 | Có giá sàn tính theo chính sách/cấu hình công ty. Nếu tổng Quote dưới giá sàn, Manager **được phát hành** nhưng phải cung cấp lý do ngoại lệ; lưu audit. Không phát sinh người duyệt bổ sung. |
| F01-BR-09 | `depositPercent` do Manager quyết định **cho mỗi Quote Version**; BE tính `depositAmount`; Quote và Contract phải hiển thị và lưu snapshot nhất quán. Không mặc định 30%. |
| F01-BR-10 | `validUntil` của **mỗi Quote Version** do Manager cài lúc phát hành; hết hạn chỉ khiến Quote không được accept, không hủy Request. Không mặc định 7 ngày. |
| F01-BR-11 | Customer chấp nhận Quote mới nhất/đang hiệu lực rồi mới đến Contract. Contract gắn Quote version, không được âm thầm sửa văn bản đã ký. |
| F01-BR-12 | Manager đặt **một** `completionDeadline` khi gửi Contract, chung cho ký OTP **và** hoàn tất đặt cọc; không áp dụng hạn ký/hạn chung riêng. |
| F01-BR-13 | **Thứ tự UI:** ký OTP thành công và BE lưu `SIGNED` → FE chuyển sang màn hình cọc. Nếu rời trang khi chưa nộp, lần sau vẫn `SIGNED`/`AWAITING_DEPOSIT` và tiếp tục thanh toán, **không ký lại**. |
| F01-BR-14 | Thanh toán cọc chỉ có hai cách: VNPay (BE xác minh theo tích hợp của nhóm) hoặc Bank Transfer (Manager xác minh **tiền thực nhận**). FE Return URL/ảnh biên lai không đủ xác nhận. Không có CASH. |
| F01-BR-15 | Hết hạn chung mà chưa hoàn tất: khóa tạo thanh toán/gửi proof mới; giữ chữ ký hợp lệ; Manager gia hạn để mở lại; hệ thống cảnh báo, **không tự hủy**. Hủy quá hạn là hành động **thủ công của Manager** sau khi kiểm tra giao dịch chờ đối soát. |
| F01-BR-16 | Chỉ khi Contract `SIGNED` và **đã xác minh đủ cọc**: Contract→`EFFECTIVE`, Request→`ACTIVATED`, tạo 1 Trip→`PLANNING` bằng transaction/idempotency. |
| F01-BR-17 | Trip vừa tạo chưa `READY_TO_DEPART`. Manager xác nhận deployment trước handoff Flow 2/3. |
| F01-BR-18 | FE dùng `allowedActions` để hiển thị; BE kiểm tra lại role, ownership, version và state; SignalR chỉ nhắc refresh REST. |

**Đảm bảo tiền tệ và tính toán:** Backend dùng decimal-safe arithmetic; cùng một phép tính chỉ sử dụng một `currency`; `amount = quantity × unitPrice` sau chính sách làm tròn được cấu hình, `totalAmount = Σ item.amount`, `depositAmount` tính từ `totalAmount` và `depositPercent` theo chính sách tiền tệ. Không cho FE gửi `totalAmount` hoặc `depositAmount` làm nguồn tính tiền. Bảo hiểm và chăm sóc thú y bắt buộc phải được tính (riêng/gộp nhất quán, không nhân đôi). Từng phiên bản lưu `pricingVersion`, `requestVersion`, `preliminaryPlanVersion` khi áp dụng.

**Các giá trị chưa được phê duyệt:** biểu giá, công thức/mức giá sàn cụ thể, tiền tệ thương mại/FX, thuế/phụ phí, làm tròn, lead time, giới hạn tỷ lệ cọc, checklist pháp lý chính xác theo tuyến, số ngày/nhịp cảnh báo quá hạn, chính sách phí hủy/hoàn tiền. **Không dùng** bất kỳ số tiền, phần trăm hay số ngày minh họa trong tài liệu làm chính sách ngầm.

## 3. State machine và permission

### 3.1. RequestStatus và ContractStatus

```text
Request PENDING --Manager yêu cầu sửa--> CHANGES_REQUESTED
CHANGES_REQUESTED --Customer resubmit đầy đủ--> PENDING
PENDING --Manager từ chối--> REJECTED
PENDING --Manager tiếp nhận--> ACCEPTED
ACCEPTED --Manager phát hành Quote--> QUOTING
QUOTING --Customer accept Quote hiện hành--> AWAITING_CONTRACT
AWAITING_CONTRACT --Customer ký Contract OTP hợp lệ--> AWAITING_DEPOSIT
AWAITING_DEPOSIT --BE xác minh đủ cọc--> ACTIVATED, Contract EFFECTIVE, Trip PLANNING
Trước ký --Customer hủy hợp lệ--> CANCELLED
Sau ký --Manager phê duyệt/hủy thủ công hợp lệ--> CANCELLED
ACTIVATED --nghiệp vụ sau Flow 1 hoàn tất--> CLOSED
```

`RequestStatus`: `PENDING`, `CHANGES_REQUESTED`, `ACCEPTED`, `QUOTING`, `AWAITING_CONTRACT`, `AWAITING_DEPOSIT`, `ACTIVATED`, `CLOSED`, `REJECTED`, `CANCELLED`. **Không thêm `EXPIRED`, `OVERDUE` vào RequestStatus.**

`ContractStatus`: `DRAFT`, `PENDING_SIGNATURE`, `SIGNED`, `EFFECTIVE`, `SIGN_DECLINED`, `SUPERSEDED`, `EXPIRED`, `TERMINATED` theo conventions. `SIGNED` vẫn giữ sau khi khách rời màn hình, kể cả khi hạn chung đã qua. `EFFECTIVE` chỉ khi đạt điều kiện cọc. `QuoteStatus`: `DRAFT`, `SENT`, `ADJUSTMENT_REQUESTED`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`, `EXPIRED`.

`TripStatus`: `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT`, `COMPLETED`, tách biệt hoàn toàn với RequestStatus; Flow 1 chỉ tạo `PLANNING`.

**Thời hạn chung:** `completionDeadline` là timestamp gốc của phiên bản Contract phát hành; `effectiveCompletionDeadline` có thể khác nếu Manager tạo quyết định gia hạn. `isCompletionOverdue = now > effectiveCompletionDeadline` và chưa đủ điều kiện hoàn tất. `paymentLocked` là **cờ dẫn xuất** chứ không phải `RequestStatus` mới. Quá hạn không xóa chữ ký, không tự hủy và không tự làm `RequestStatus=EXPIRED`.

**Change/Info/Revision/Cancellation/DeadlineExtension/Deployment** là đối tượng phụ có trạng thái riêng, không dùng các enum này làm RequestStatus. Khi Manager chấp thuận một Change Request quan trọng trước ký, BE tăng `requestVersion`, invalidates Quote/Contract cũ bị ảnh hưởng theo version và đưa Request về `QUOTING` để phát hành Quote mới nếu đã bước vào báo giá. Giữ bản cũ đọc-only; không được ký bản Contract tham chiếu Request version lỗi thời.

### 3.2. Các điều kiện hiển thị FE (BE kiểm tra lại)

| Điều kiện | `allowedActions` gợi ý |
|---|---|
| Customer `PENDING` | `VIEW`, `CANCEL`, `REQUEST_CHANGE` (nếu tính năng tương ứng được cho phép) |
| Customer `CHANGES_REQUESTED` | `SUBMIT_REVISION`, `VIEW`, `CANCEL` |
| Customer `QUOTING`, Quote mới nhất chưa hết hạn | `ACCEPT_QUOTE`, `REQUEST_QUOTE_ADJUSTMENT`, `REJECT_QUOTE` |
| Customer `AWAITING_CONTRACT`, Contract `PENDING_SIGNATURE`, còn hạn | `REQUEST_SIGN_OTP`, `SIGN_CONTRACT`, `DECLINE_CONTRACT` |
| Customer `AWAITING_DEPOSIT`, đã ký, chưa quá hạn, chưa đủ cọc | `PAY_DEPOSIT`, `VIEW_PAYMENTS`, `REQUEST_CANCELLATION` |
| Customer `AWAITING_DEPOSIT`, quá hạn | `VIEW_PAYMENTS`, `REQUEST_CANCELLATION` (**không** `PAY_DEPOSIT`) |
| Customer `ACTIVATED` | `VIEW_TRIP`, các quyền hủy/yêu cầu thay đổi theo nghiệp vụ được phép |
| Manager `PENDING` | `ACCEPT`, `REJECT`, `REQUEST_REVISION`, `REQUEST_INFO` |
| Manager `ACCEPTED`/`QUOTING` | `EDIT_PRELIMINARY_PLAN`, `VIEW_QUOTE_SUGGESTION`, `SEND_QUOTE` |
| Manager chưa có tiền cọc được xác minh đủ | `EXTEND_COMPLETION_DEADLINE`, `REVIEW_BANK_TRANSFER`, `CANCEL_OVERDUE` nếu đủ điều kiện |
| Manager Trip `PLANNING` | `CONFIRM_DEPLOYMENT`, `HOLD_DEPLOYMENT`, `RESUME_DEPLOYMENT` theo trạng thái triển khai |

`GET` detail phải trả các cờ `canSign`, `paymentLocked`, `isCompletionOverdue` và `allowedActions` hoặc có thể dẫn xuất chúng một cách nhất quán từ response; BE **không được cấp phép dựa duy nhất** vào cờ phía FE.

## 4. Quy ước chung, phân quyền và chuẩn dữ liệu

**Base URL:** `/api`. Endpoint trong tài liệu không lặp tiền tố `/api`. Truy cập qua JWT Bearer; `/customer/*` cho `CUSTOMER`, `/manager/*` cho `LOGISTICS_MANAGER`; các adapter VNPay không phải API công khai cho Customer. API có nhiều vai trò phải ghi rõ quyền riêng.

**Response envelope thành công** (theo `00-conventions.md`):
```json
{"success":true,"message":"OK","data":{}}
```

**Response envelope lỗi:**
```json
{"success":false,"message":"Invalid input","errorCode":"VALIDATION_ERROR","data":null,"errors":[{"field":"horseCount","message":"Must be greater than zero"}]}
```

HTTP thành công `200`/`201`, validate `400`, unauthorized `401`, forbidden `403`, not found `404`, conflict `409`, throttle `429`, lỗi máy chủ `500`. `errors[]` chỉ khi có lỗi theo trường; FE phân nhánh bằng `errorCode`. `allowedActions` phục vụ UI, không thay thế kiểm tra BE.

**Số tiền:** dùng decimal-safe arithmetic trên Backend; `currency` phải thống nhất trong mỗi phép tính. Trước khi có quy tắc về rounding/FX được duyệt, không áp dụng tỷ giá, mức thuế, phí, discount hoặc tỷ lệ cọc tự đặt. Không tính tiền bằng số float trên React. Tham chiếu `00-conventions.md` cho cấu hình MIME, phân trang, enum chung và các response chuẩn.


## 5. Customer – Dự toán sơ bộ và Pricing API

### F01-C01. `GET /customer/estimates/transport-modes` – Chọn phương thức theo tuyến


**Auth:** `CUSTOMER`; `GET /api/customer/estimates/transport-modes?originCountry=VN&destinationCountry=JP`.

**Query:** `originCountry` và `destinationCountry` (string ISO 3166-1 alpha-2, bắt buộc).

**200 OK (danh sách mode chỉ minh họa, thực tế do BE cấu hình):**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "originCountry": "VN",
    "destinationCountry": "JP",
    "modes": ["AIR"]
  }
}
```

**Validate:** chỉ cho phép cặp nước `VN→VN` hoặc `VN→JP`, không giới hạn cứng mode theo ví dụ. Với cặp tuyến hỗ trợ nhưng chưa có mode khả dụng, có thể trả `modes: []` để FE thông báo không thể dự toán. Không tin `preferredTransportMode` do FE gửi nếu không thuộc danh sách BE trả cho tuyến/ngày liên quan.

**Lỗi:** `400 VALIDATION_ERROR`, `400 UNSUPPORTED_ROUTE`.

### F01-C02. `POST /customer/estimates` – Pricing API dự toán sơ bộ


**Auth:** `CUSTOMER`; `Content-Type: application/json`. FE gọi khi đã có điểm đi/đến, ngày dự kiến, số ngựa và phương thức; không cần tạo Request, Quote hay Contract trước.

**Request JSON (giá trị ví dụ):**

```json
{
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "destinationCountry": "JP",
  "destinationCity": "Tokyo",
  "desiredDepartureDate": "2026-11-20",
  "horseCount": 2,
  "preferredTransportMode": "AIR"
}
```

| Trường | Kiểu | Bắt buộc / kiểm tra |
|---|---|---|
| `originCountry` | string | Có; `VN` trong demo |
| `originCity` | string | Có; địa điểm BE hỗ trợ |
| `destinationCountry` | string | Có; `VN` hoặc `JP`, cặp tuyến phải hợp lệ |
| `destinationCity` | string | Có; địa điểm BE hỗ trợ |
| `desiredDepartureDate` | date string | Có; `YYYY-MM-DD`, trong khoảng dịch vụ cấu hình |
| `horseCount` | integer | Có; ≥1, không vượt giới hạn năng lực cấu hình |
| `preferredTransportMode` | `TransportMode` | Có; một trong những mode khả dụng do BE xác định |

**200 OK – response envelope; toàn bộ giá tiền bên dưới là dữ liệu mẫu VND, chưa phải tariff thật:**

```json
{
  "success": true,
  "message": "Estimate calculated",
  "data": {
    "currency": "VND",
    "estimateAmount": 150000000,
    "lines": [
      { "code": "TRANSPORT", "label": "Vận chuyển dự kiến", "amount": 120000000, "mandatory": true },
      { "code": "PROCEDURES", "label": "Hồ sơ, thủ tục dự kiến", "amount": 15000000, "mandatory": true },
      { "code": "VETERINARY_CARE", "label": "Chăm sóc thú y bắt buộc", "amount": 10000000, "mandatory": true },
      { "code": "MANDATORY_INSURANCE", "label": "Bảo hiểm bắt buộc", "amount": 5000000, "mandatory": true }
    ],
    "pricingVersion": "demo-example-not-approved",
    "calculatedAt": "2026-10-13T04:00:00Z",
    "disclaimer": "Dự toán tham khảo, không phải báo giá chính thức hoặc cam kết giá"
  }
}
```

**Bất biến tính toán:** `estimateAmount = Σ lines[].amount` theo cùng `currency`; mỗi `amount` không âm; các hạng mục áp dụng theo bảng giá thực tế của công ty. `pricingVersion` gắn bản cấu hình sử dụng để tính, không phải phiên bản Quote. Nếu lưu `estimateId` thì chỉ là mã tham chiếu/audit, **không phải** giấy phép thu tiền; không bắt buộc tạo bản ghi Estimate trong DB nếu nhóm chọn tính stateless.

**Pricing engine ở BE:** dùng tuyến, mode, số ngựa, thời điểm, các cấu phần và biểu giá có hiệu lực; tính bằng `decimal`/thao tác tiền tệ an toàn (không dùng float làm giá trị tài chính). BE chịu trách nhiệm chọn tariff, phép nhân số lượng và cộng tổng; quy tắc thuế/phụ phí/giảm giá/làm tròn chỉ áp dụng nếu đã có policy cấu hình được duyệt. Bác sĩ thú y và bảo hiểm bắt buộc không được cho Customer bỏ chọn để giảm giá; cách thể hiện thành dòng riêng hay gộp cần nhất quán với cấu hình và không tính trùng.

**Không được:** hardcode đơn giá trong FE; tin `estimateAmount` của FE; tự phát sinh số 0 hoặc giá giả khi thiếu bảng giá; biến Estimate thành Quote; cho Customer sửa giá trên bước thanh toán.

**Lỗi:** `400 VALIDATION_ERROR` (bao gồm `errors[].field`), `400 UNSUPPORTED_ROUTE`, `400 TRANSPORT_MODE_UNAVAILABLE`, `404 PRICE_TABLE_NOT_FOUND`, `401 UNAUTHORIZED`, `403 FORBIDDEN_ROLE`.

### F01-C02A. Quy ước PricingService (nội bộ BE, không tạo REST mới)


- `PricingService.CalculateEstimate(input)` → kiểm tra phạm vi tuyến, chọn tariff có version/effective date, trả `currency`, `lines[]`, `estimateAmount`, `pricingVersion`.
- `QuotePricingService.CalculateSuggestion(requestVersion, preliminaryPlanVersion)` → tổng hợp chi phí dự kiến nội bộ (`estimatedCost`) và giá bán đề xuất (`suggestedItems`, `suggestedTotal`) từ nguồn cấu hình đã duyệt; có thể chưa có `floorPrice` hoặc `minMarginPercent` khi công ty chưa chốt policy.
- `QuotationService` tính lại mọi `quantity × unitPrice`, `totalAmount` và tiền cọc từ Quote/Contract phiên bản hiện hành, không tin tổng tiền do trình duyệt gửi.
- `PaymentService` lấy khoản cọc chưa thanh toán từ receivable thuộc hợp đồng đã ký; VNPay không phải máy tính báo giá.
- **Currency:** Pricing/Quotation trong tài liệu sử dụng VND làm **dữ liệu minh họa**; tiền tệ thương mại và currency settlement của VNPay phải được đối chiếu với tích hợp thật. Không tự quy đổi USD→VND, không đặt tỷ giá mặc định khi chưa có rule.

### F01-C03. `POST /customer/estimates/pdf`


**Body:** giống F01-C02. **200:** binary PDF, `Content-Type: application/pdf`, `Content-Disposition: attachment`; có ngày lập, đồng tiền, bảng thành phần chi phí và nhãn **"Dự toán tham khảo"**. Không dùng JSON envelope cho file binary. BE phải tính lại từ PricingService hoặc dùng bản snapshot hợp lệ; không tin số tiền Client gửi. Chi tiết định dạng PDF nằm ngoài contract Pricing.

### F01-C04. `GET /customer/requests/form-options`


**200 data ví dụ:**

```json
{
  "minLeadDays": null,
  "earliestDepartureDate": null,
  "supportedRoutes": [
    { "originCountry": "VN", "destinationCountry": "VN" },
    { "originCountry": "VN", "destinationCountry": "JP" }
  ],
  "supportedTransportModes": ["ROAD", "AIR"],
  "maxHorsesPerRequest": null
}
```

`minLeadDays`, `earliestDepartureDate`, `maxHorsesPerRequest`: giá trị null trong ví dụ chỉ có nghĩa **chưa có cấu hình chốt**, không hàm ý không có giới hạn hay BE phải trả null trong production. Khi triển khai, BE trả cấu hình áp dụng thực tế; FE không hardcode. `supportedTransportModes` chỉ là tập tổng quát; mode hợp lệ theo cặp tuyến phải lấy từ F01-C01. `supportedRoutes` là trường **đề xuất bổ sung** cần đồng bộ vào Role Customer contract; danh sách quốc gia công khai lấy `GET /public/countries` nhưng không được coi mọi cặp nước đều đặt được.


## 6. Customer – Horse và trách nhiệm cung cấp hồ sơ

### F01-C05. `GET /customer/horses/selectable`


**Query:** `departureDate`, `deadline`.  
**200 data:** mảng ngựa của Customer với `{horseId, name, microchipId, selectable, conflict, documentWarning}`. FE chỉ cho chọn `selectable = true`; BE vẫn validate lại khi submit.

**Thêm ngựa trong wizard:** dùng `POST /customer/horses`, sau đó gọi lại `GET /customer/horses/selectable`. **Ảnh ngựa và scan hộ chiếu** được nộp ngay trong `POST /customer/horses`; chỉ giấy tờ bổ sung hoặc phiên bản mới mới dùng `POST /customer/horses/{horseId}/documents`. Chi tiết payload ảnh và hộ chiếu theo `02-customer-api.md`/Flow 2, không sáng tác API mới cho cùng một chức năng.

### F01-C05A. `GET /customer/horses` & `GET /customer/horses/{horseId}` – Xem thông tin ngựa **[THAM CHIẾU ROLE]**


- `GET /customer/horses`: query `status`, `q`, `page`, `pageSize`, trả danh sách có phân trang; phục vụ My Horses và chọn ngựa trước khi tạo Request.
- `GET /customer/horses/{horseId}`: trả Horse object đầy đủ (nhận dạng, ảnh, chủ ngựa, `passport` gồm `passportNumber`, `issuingAuthority`, `issueDate`, `expiryDate`, `scanDocumentId`, tình trạng hồ sơ, `allowedActions`).
- Không expose ngựa của Customer khác: `404 NOT_FOUND`. Xem một con ngựa chỉ để chọn trong wizard **không được làm thay đổi Horse**.
- Khi chọn ngựa hiện có, chỉ đưa `horseId` vào `horseIds[]` khi gọi `POST /customer/requests`; **không gửi lại toàn bộ hồ sơ Horse** như thể tạo ngựa mới.

### F01-C05B. `POST /customer/horses` – Thêm ngựa mới ngay trong wizard **[THAM CHIẾU ROLE]**


**Trigger:** Customer mở bước Horses → bấm "Thêm ngựa mới" → điền thông tin → bấm "Lưu ngựa". Đây là hành động tạo **Horse độc lập**, không phải tạo Transport Request.

**Content-Type:** `multipart/form-data`. Chấp nhận các trường dạng form hoặc phần JSON `payload` kèm hai tệp `photo`, `passportScan` theo `00-conventions.md` và `02-customer-api.md`.

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `microchipId` | Có | 15 chữ số theo ISO 11784; duy nhất toàn hệ thống |
| `name`, `breed`, `sex`, `dateOfBirth`, `color` | Có | `sex` theo `HorseSex` trong conventions |
| `heightCm`, `weightKg`, `ownerName` | Có | Validate tại BE |
| `ownerContact`, `specialCareNotes` | Không | Ghi chú chăm sóc |
| `passportNumber`, `passportIssuingAuthority` | Có | Hộ chiếu ngựa |
| `passportIssueDate`, `passportExpiryDate` | Có | Ngày hợp lệ, ngày hết hạn sau ngày cấp |
| `photo` | Có | Ảnh bằng chứng JPG/PNG, ≤ 10 MB |
| `passportScan` | Có | PDF/JPG/PNG, ≤ 10 MB |

**201 Created (ví dụ rút gọn):**

```json
{
  "success": true,
  "message": "Horse created",
  "data": {
    "horseId": 33,
    "name": "Golden Star",
    "microchipId": "985141000777888",
    "photoUrl": "/api/files/133",
    "passport": {
      "passportNumber": "EQ-VN-00987",
      "issuingAuthority": "Cơ quan cấp hộ chiếu",
      "issueDate": "2025-01-01",
      "expiryDate": "2029-01-01",
      "scanDocumentId": 501
    },
    "status": "ACTIVE",
    "allowedActions": ["EDIT", "UPLOAD_DOCUMENT"]
  }
}
```

**BE side effects:** Lưu Horse, file ảnh và document scan hộ chiếu liên kết với Horse trong một nghiệp vụ nhất quán; giấy tờ hộ chiếu mặc định `SUBMITTED`, **không tự `APPROVED`**. Nếu upload/validate thất bại, không để dữ liệu Horse tạo dở gây nhầm lẫn.

**Sau khi thành công, FE phải:** (1) giữ nguyên các bước Trip Information/Pickup/Delivery đã nhập; (2) gọi lại `GET /customer/horses/selectable?departureDate=...&deadline=...`; (3) tự chọn `horseId` mới nếu `selectable=true`; (4) cho phép tiếp tục thêm ngựa mới hoặc quay lại wizard; (5) tránh tạo lại cùng con ngựa nếu Customer bấm Back/Next. Ngựa đã lưu vẫn nằm trong My Horses kể cả nếu Customer rời wizard mà chưa gửi Request.

**Errors:** `400 VALIDATION_ERROR`, `400 FILE_TOO_LARGE`, `400 FILE_TYPE_NOT_ALLOWED`, `409 HORSE_MICROCHIP_DUPLICATE`, `401 UNAUTHORIZED`, `403 FORBIDDEN_ROLE`. FE không coi validation của `POST /customer/horses` là validation `POST /customer/requests`.

### F01-C05C. `GET /customer/horses/{horseId}/documents`, `GET /customer/documents/{documentId}`, `GET /files/{fileId}` – Xem hồ sơ **[THAM CHIẾU ROLE/SHARED]**


- Danh sách hồ sơ ngựa và trạng thái duyệt: `GET /customer/horses/{horseId}/documents`.
- Xem chi tiết một phiên bản tài liệu: `GET /customer/documents/{documentId}`.
- Xem/tải PDF/ảnh ngựa hoặc scan hộ chiếu: `GET /files/{fileId}` (binary, Bearer token, quyền theo owner).
- **Không đưa link file private vào public URL**; ứng dụng tải qua API đã xác thực. Nếu ảnh/passport scan được đính kèm trong lần tạo Horse ở F01-C05B thì **không upload lặp lại bằng API Documents**.
- Hồ sơ tiêm phòng/y tế bổ sung dùng `POST /customer/horses/{horseId}/documents` theo `02-customer-api.md`. Cảnh báo giấy tờ chưa duyệt phải hiển thị trước khi gửi Request, nhưng theo quy tắc Flow 1 không tự chặn việc tạo đơn chỉ vì Specialist chưa duyệt (các điều kiện khởi hành xử lý ở Flow 2/3).

### F01-C05D. `PUT /customer/horses/{horseId}` – Sửa hồ sơ được phép trước khi chọn **[THAM CHIẾU ROLE]**


Chỉ thực hiện khi `allowedActions` và business rule của Horse cho phép. Không đổi `microchipId`; không ghi đè trực tiếp tài liệu passport đã có phiên bản – phải sử dụng API Document tương ứng. Sau khi sửa, FE refresh Horse detail và danh sách selectable. Nếu định danh ngựa đang bị khóa trong Request/Trip đang hoạt động, BE trả `409 HORSE_IN_ACTIVE_ORDER` hoặc lỗi chuyên biệt theo `02-customer-api.md`.

### F01-C05E. `GET /customer/requests/document-requirements` – Checklist theo tuyến **[API CẦN ĐỒNG BỘ CUSTOMER/FLOW 2]**

**Query:** `originCountry`, `destinationCountry`, `horseIds` (mảng ID, có thể truyền phân cách dấu phẩy theo quy ước query) và `preferredTransportMode` khi đã chọn. BE xác định danh sách **áp dụng thực tế** theo tuyến VN→VN hoặc VN→JP, loại ngựa và thông số liên quan; cùng **một nguồn checklist** phải dùng để validate `POST /customer/requests` và Flow 2.

**200 data – cấu trúc schema minh họa, `documentTypeCode` là mã cấu hình, không phải tên luật cố định:**

```json
{
  "originCountry": "VN",
  "destinationCountry": "JP",
  "checklistVersion": "cfg-v1",
  "requirements": [
    {
      "documentTypeCode": "EQUINE_PASSPORT",
      "scope": "PER_HORSE",
      "horseId": 31,
      "responsibleParty": "CUSTOMER",
      "requiredAt": "REQUEST_SUBMISSION",
      "isMandatory": true,
      "isUploaded": true,
      "documentStatus": "SUBMITTED"
    },
    {
      "documentTypeCode": "COMPANY_PROCEDURE_EXAMPLE",
      "scope": "PER_TRIP",
      "horseId": null,
      "responsibleParty": "COMPANY",
      "requiredAt": "BEFORE_DEPARTURE",
      "isMandatory": true,
      "isUploaded": false,
      "documentStatus": null
    }
  ]
}
```

**Trách nhiệm:** `CUSTOMER` là tài liệu thông tin khách có thể/được yêu cầu cung cấp; `COMPANY` là chứng từ/thủ tục công ty phải xử lý. `requiredAt`: `REQUEST_SUBMISSION` hoặc `BEFORE_DEPARTURE` (nếu nghiệp vụ yêu cầu mốc cụ thể hơn, checklist cấu hình cung cấp). `scope`: `PER_HORSE` hoặc `PER_TRIP` theo conventions. Mã `COMPANY_PROCEDURE_EXAMPLE` chỉ dùng mô tả schema, **không phải một chứng từ pháp lý đã xác định**.

**Tài liệu PER_HORSE:** Customer tải lên qua `POST /customer/horses/{horseId}/documents`; ảnh và scan Passport đã gửi khi thêm Horse thì không upload lại. **Tài liệu PER_TRIP thuộc trách nhiệm Customer trước Submit:** đính kèm trực tiếp trong `POST /customer/requests` ở chế độ multipart (xem chương 7), **không cần tạo Request DRAFT**. Hồ sơ COMPANY được gắn vào checklist sau khi tạo Request và do Specialist/công ty thực hiện trong Flow 2. BE không được yêu cầu tài liệu COMPANY chưa tồn tại tại thời điểm Submit.

**Lỗi:** `400 UNSUPPORTED_ROUTE`, `400 VALIDATION_ERROR`, `404 NOT_FOUND` (Horse không thuộc Customer), `409 HORSE_SCHEDULE_CONFLICT` nếu kiểm tra theo lịch. Cần đồng bộ schema với API Document/Checklist Flow 2 trước khi giao code.

### F01-C05F. Trách nhiệm hồ sơ trước Submit Request **[QUY TẮC ĐÃ CHỐT]**


Customer phải nộp **đủ mọi thông tin và tài liệu mà họ có khả năng/trách nhiệm cung cấp** ngay trong wizard trước `POST /customer/requests`. Công ty/Transport Specialist chịu trách nhiệm chuẩn bị, làm thủ tục, phối hợp với đơn vị chuyên môn/cơ quan có thẩm quyền để hoàn thiện các hồ sơ thuộc trách nhiệm nhà cung cấp dịch vụ tại Flow 2. Không được buộc Customer upload một chứng từ chỉ có công ty/cơ quan có thẩm quyền mới có thể phát hành.

**Phân loại theo tuyến và nghĩa vụ (đề xuất biểu diễn checklist, chưa duyệt schema):** `documentType`, `responsibleParty` (`CUSTOMER` hoặc `COMPANY`), `requiredAt` (`REQUEST_SUBMISSION` hoặc mốc chuyên môn trước khởi hành), `status`, `horseId` nếu PER_HORSE. Đây là metadata gợi ý trên API Documents/Checklist hiện có, **không tạo endpoint mới** trong Flow 1 khi chưa chốt schema với Flow 2.

- Nhóm Customer thường gồm nhận dạng ngựa, ảnh, Equine Passport + scan, bằng chứng quyền sở hữu và những thông tin/giấy tờ y tế sẵn có mà checklist tuyến xác định Customer phải cung cấp. Một tài liệu chỉ bắt buộc ở Submit khi có trong **checklist đã phê duyệt cho đúng tuyến và tình huống**, không buộc tất cả Request có Invitation Letter hoặc giấy phép không áp dụng.
- Nhóm COMPANY thường gồm chứng từ/thủ tục kiểm dịch, thông quan, phối hợp khám/xét nghiệm/chứng nhận với cơ quan đủ thẩm quyền theo tuyến. Có thể chưa hoàn thiện tại Submit, nhưng phải đạt điều kiện tại milestone pháp lý trước departure.
- **Chưa duyệt ≠ chưa upload.** Nếu Customer đã nộp đủ giấy tờ có trách nhiệm nộp, tài liệu vẫn `SUBMITTED` chờ Specialist xử lý thì Request vẫn có thể `PENDING` và cảnh báo kiểm tra chuyên môn; BE chỉ chặn `POST /customer/requests` khi thiếu trường/tài liệu thuộc nhóm Customer bắt buộc tại thời điểm Submit.
- BE phải tra checklist theo `originCountry`, `destinationCountry`, ngựa và tình huống, so với tài liệu đã upload, trả lỗi cụ thể và `errors[].field`/danh sách `missingCustomerDocuments` (schema bổ sung cần thống nhất cùng Flow 2). Không chặn Submit vì **tài liệu COMPANY chưa được cấp**.


## 7. Customer – Submit Transport Request và truy vấn đơn

### F01-C06. `POST /customer/requests`


Submit một lần ở bước Review/Confirm của wizard.

```json
{
  "originCountry": "VN",
  "originCity": "Ho Chi Minh City",
  "pickupAddress": "Trường đua Đại Nam, Bình Dương",
  "destinationCountry": "JP",
  "destinationCity": "Tokyo",
  "deliveryAddress": "Tokyo Racecourse, Tokyo",
  "receiver": { "fullName": "Yuki Tanaka", "phone": "+81312345678" },
  "desiredDepartureDate": "2026-11-01",
  "deliveryDeadline": "2026-11-05",
  "preferredTransportMode": "AIR",
  "horseIds": [31, 32],
  "specialRequirements": ""
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
    "documentWarnings": [{ "horseId": 32, "message": "Hồ sơ đã nộp, đang chờ Specialist thẩm định" }],
    "allowedActions": ["VIEW", "CANCEL", "REQUEST_CHANGE"]
  }
}
```

**Content-Type:** `application/json` nếu toàn bộ hồ sơ cần thiết đã được gắn với Horse. Nếu checklist có tài liệu **Customer – PER_TRIP** phải nộp tại Submit, dùng `multipart/form-data`: `payload` là toàn bộ JSON ở trên cùng `requestDocuments` manifest `[{"documentTypeCode":"...","fileKey":"tripDoc1"}]`; các file gửi bằng multipart field tên trùng `fileKey`. Backend lưu file, manifest và Request trong **một nghiệp vụ nguyên tử**; nếu thiếu một tệp bắt buộc thì không tạo Request. FE không tạo Request tạm để tải hồ sơ. Cấu trúc multipart tuân thủ `00-conventions.md`.

**Validate:** `horseIds` có thể bao gồm Horse vừa tạo và Horse đã đăng ký trước đó; mọi `horseId` phải tồn tại và thuộc Customer. Quốc gia/mode hợp lệ; địa chỉ nhận và giao không rỗng; receiver hợp lệ; ngày khởi hành đủ lead days; `deliveryDeadline` sau ngày khởi hành; ít nhất một `horseId` không trùng; tất cả ngựa `ACTIVE` thuộc Customer và không xung đột lịch. `specialRequirements` rỗng = không có yêu cầu đặc biệt. Bắt buộc kiểm tra **đã nộp đủ hồ sơ Customer phải cung cấp theo checklist tuyến** (xem F01-C05E); hồ sơ **COMPANY** và tài liệu `SUBMITTED` chưa được Specialist `APPROVED` không được dùng làm lý do từ chối Submit nếu Customer đã thực hiện đủ nghĩa vụ. Trả `documentWarnings` cho tài liệu cần thẩm định/hoàn thiện trong Flow 2.

**Error:** `400 VALIDATION_ERROR`, `400 DEPARTURE_TOO_SOON`, `400 TRANSPORT_MODE_UNAVAILABLE`, `409 HORSE_SCHEDULE_CONFLICT`, `409 NO_HORSE_REGISTERED`, `400 REQUIRED_CUSTOMER_DOCUMENT_MISSING` (mã đề xuất, cần đồng bộ error conventions). Dữ liệu lỗi phải có `errors[].field` để FE tô đỏ.

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
  "destinationCountry": "JP",
  "destinationCity": "Tokyo",
  "deliveryAddress": "Tokyo Racecourse, Tokyo",
  "receiver": { "fullName": "Yuki Tanaka", "phone": "+81312345678" },
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


## 8. Manager – Xét duyệt, yêu cầu sửa và Customer Revision

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
  "destinationCountry": "JP",
  "destinationCity": "Tokyo",
  "deliveryAddress": "Tokyo Racecourse, Tokyo",
  "receiver": { "fullName": "Yuki Tanaka", "phone": "+81312345678" },
  "desiredDepartureDate": "2026-11-03",
  "deliveryDeadline": "2026-11-07",
  "preferredTransportMode": "AIR",
  "horseIds": [31, 32],
  "specialRequirements": "",
  "revisionNote": "Đã điều chỉnh theo yêu cầu Manager"
}
```

**200 data:** `{ "requestId": 15, "status": "PENDING", "revisionVersion": 2 }`. `PUT` cho phép cùng định dạng JSON/multipart của Submit để nộp thêm file PER_TRIP nếu checklist bản sửa yêu cầu. BE validate như khi tạo mới, lưu snapshot cũ, close revision request. Manager xét duyệt lại. `409 REQUEST_REVISION_NOT_ALLOWED` nếu không ở `CHANGES_REQUESTED`.

### F01-M05. `GET /manager/requests/{requestId}/revisions` **[BỔ SUNG]**


Trả lịch sử các phiên bản Request và thay đổi có người thực hiện, thời điểm, reason, các trường trước/sau. Customer chỉ được xem lịch sử thuộc đơn mình qua detail/revision endpoint, không thấy ghi chú nội bộ của Manager.


## 9. Info Request và Customer Change Request

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

**200 data:** `{ "changeRequestId": 51, "status": "APPROVED", "requestVersion": 3, "requoteRequired": true, "contractRevisionRequired": true }`.  
**BE bắt buộc:** validate lại ngựa/lịch/mode và các điều kiện theo bản đề xuất; apply atomic; giữ lịch sử; chặn double approval, chuyển Quote/Contract chưa ký của Request version cũ thành phiên bản không còn thao tác (`SUPERSEDED` nếu phù hợp), giữ lịch sử và chuyển Request về `QUOTING` khi đã bước vào giai đoạn báo giá; phát thông báo Customer.  
**Errors:** `409 INVALID_STATE`, `409 CHANGE_REQUEST_ALREADY_REVIEWED`, `409 HORSE_SCHEDULE_CONFLICT`.

### F01-M09. `POST /manager/requests/{requestId}/change-requests/{changeRequestId}/reject` **[BỔ SUNG]**


```json
{ "reason": "Không đủ năng lực vận chuyển vào ngày đề nghị" }
```

**200 data:** `{ "changeRequestId": 51, "status": "REJECTED", "requestVersionUnchanged": true }`. Request và Quote/Contract hiện có không đổi; phải revalidate hiệu lực nếu Customer muốn thao tác tiếp. `400 VALIDATION_ERROR` khi thiếu lý do.


## 10. Hybrid Pricing, Quotation và thương lượng (Flow 1)

### F01-M11. `GET /manager/requests/{requestId}/preliminary-plan` và `PUT /manager/requests/{requestId}/preliminary-plan`

**Quyền:** `LOGISTICS_MANAGER`. Request phải `ACCEPTED`/`QUOTING` và không có thay đổi quan trọng chưa xử lý. Kế hoạch này là **sơ bộ để tính giá**, không phải route/crew/air booking chính thức của Flow 3.

**PUT Request (giá/giờ chỉ là ví dụ):**

```json
{
  "requestVersion": 3,
  "transportMode": "AIR",
  "transitCountries": [],
  "plannedCheckpointIds": [],
  "plannedDepartureAt": "2026-11-20T01:00:00Z",
  "plannedArrivalAt": "2026-11-21T09:00:00Z",
  "stallsRequired": 2,
  "keyMilestones": [],
  "currency": "VND",
  "budgetItems": [
    {"category":"AIR_FREIGHT","amount":70000000},
    {"category":"PROCEDURE","amount":15000000},
    {"category":"VET","amount":10000000},
    {"category":"INSURANCE","amount":5000000}
  ]
}
```

**200 Response:**

```json
{"success":true,"message":"Preliminary plan saved","data":{"planId":30,"planVersion":2,"requestVersion":3,"totalBudget":100000000,"deadlineCheck":{"meetsDeadline":true,"earliestFeasibleArrival":"2026-11-21T09:00:00Z"}}}
```

**Validate:** BE kiểm tra mode, năng lực và ngân sách bắt buộc cho nhân sự thú y/bảo hiểm; phản hồi cảnh báo khi deadline có rủi ro mà không tự sửa ngày Customer. `GET` trả snapshot hiện hành hoặc `data:null`. **Lỗi:** `400 VALIDATION_ERROR`, `409 INVALID_STATE`, `409 REQUEST_CHANGE_PENDING`, `409 REQUEST_STATE_CHANGED`.

### F01-M12. `GET /manager/requests/{requestId}/quote-suggestion`

**Quyền:** Manager. Chỉ thực hiện khi Request `ACCEPTED`/`QUOTING`, kế hoạch sơ bộ tương ứng `requestVersion` hiện tại tồn tại và hợp lệ, không có Change Request đang chờ. **GET chỉ tính gợi ý, không phát hành Quote và không tạo công nợ.**

**200 Response (mọi số tiền minh họa):**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": 15,
    "requestVersion": 3,
    "preliminaryPlanId": 30,
    "preliminaryPlanVersion": 2,
    "currency": "VND",
    "estimatedCost": 100000000,
    "suggestedItems": [
      {"category":"TRANSPORT","description":"Dịch vụ vận chuyển","quantity":1,"unitPrice":110000000,"amount":110000000},
      {"category":"PROCEDURE","description":"Thủ tục","quantity":1,"unitPrice":15000000,"amount":15000000},
      {"category":"VETERINARY_CARE","description":"Chăm sóc thú y bắt buộc","quantity":1,"unitPrice":10000000,"amount":10000000},
      {"category":"INSURANCE","description":"Bảo hiểm bắt buộc","quantity":1,"unitPrice":5000000,"amount":5000000}
    ],
    "suggestedTotal": 140000000,
    "floorPrice": 110000000,
    "pricingVersion": "config-version-from-backend",
    "calculatedAt": "2026-10-13T04:00:00Z"
  }
}
```

**Định nghĩa:** `estimatedCost` là chi phí nội bộ; `suggestedTotal` là giá bán BE đề xuất; `floorPrice` là giá sàn BE tính bằng chính sách công ty (không cố định số hoặc margin trong contract). FE Manager có thể sửa giá/hạng mục trước khi gọi F01-M13. BE vẫn quyết định giá sàn thật tại thời điểm phát hành, không tin giá sàn do FE truyền. **Lỗi:** `404 PRICE_TABLE_NOT_FOUND`, `409 PRELIMINARY_PLAN_REQUIRED`, `409 INVALID_STATE`, `409 REQUEST_CHANGE_PENDING`.

### F01-M13. `POST /manager/requests/{requestId}/quotes` – Phát hành phiên bản Quote

**Quyền:** `LOGISTICS_MANAGER`. Tạo **Quote Version mới** bất biến, không ghi đè bản cũ; `validUntil` và `depositPercent` do Manager lựa chọn **cho từng lần phát hành**. `overrideReason` chỉ bắt buộc khi giá bán **thấp hơn giá sàn**; Manager không cần thêm tầng phê duyệt.

**Request JSON (các số chỉ minh họa):**

```json
{
  "requestVersion": 3,
  "preliminaryPlanId": 30,
  "preliminaryPlanVersion": 2,
  "currency": "VND",
  "items": [
    {"category":"TRANSPORT","description":"Vận chuyển ngựa","quantity":1,"unitPrice":85000000},
    {"category":"PROCEDURE","description":"Hồ sơ và thủ tục","quantity":1,"unitPrice":15000000},
    {"category":"VETERINARY_CARE","description":"Chăm sóc thú y bắt buộc","quantity":1,"unitPrice":10000000},
    {"category":"INSURANCE","description":"Bảo hiểm vận chuyển bắt buộc","quantity":1,"unitPrice":5000000}
  ],
  "depositPercent": 40,
  "validUntil": "2026-11-19T16:59:59Z",
  "overrideReason": null,
  "included": ["Chăm sóc trong phạm vi thỏa thuận"],
  "excluded": [],
  "possibleExtraCosts": [],
  "noteToCustomer": "Báo giá theo phương án sơ bộ"
}
```

**201 Response mẫu (ví dụ Quote KHÔNG dưới sàn):**

```json
{
  "success": true,
  "message": "Quotation sent",
  "data": {
    "quoteId": 78,
    "requestId": 15,
    "requestVersion": 3,
    "version": 2,
    "status": "SENT",
    "currency": "VND",
    "totalAmount": 115000000,
    "floorPrice": 110000000,
    "isBelowFloor": false,
    "overrideReason": null,
    "depositPercent": 40,
    "depositAmount": 46000000,
    "sentAt": "2026-10-13T04:30:00Z",
    "validUntil": "2026-11-19T16:59:59Z",
    "requestStatus": "QUOTING"
  }
}
```

**Quy tắc số tiền:** `item.amount` và `totalAmount` do BE tính từ `quantity × unitPrice`, `depositAmount` do BE tính từ `totalAmount × depositPercent / 100` theo chính sách làm tròn/tiền tệ thực tế. **Không cho FE quyết định các total.** Cấu phần bắt buộc về thú y và bảo hiểm không được loại bỏ (nếu chính sách gộp giá thì phải có dữ liệu chứng minh không tính thiếu/trùng).

**Rule giá sàn:** Nếu `totalAmount < floorPrice`, `overrideReason` phải là chuỗi có nội dung; BE **cho phép Manager phát hành** dưới sàn khi có lý do. Lưu snapshot `suggestedTotal`, `floorPrice`, `totalAmount`, `isBelowFloor`, `overrideReason`, `managerId`, `sentAt` để audit. Nếu bằng/cao sàn, `overrideReason` có thể null. Không tự tạo quyền phê duyệt ngoại lệ mới. **Lỗi:** `400 PRICE_OVERRIDE_REASON_REQUIRED` (trường `overrideReason`), `400 VALIDATION_ERROR`, `409 PRELIMINARY_PLAN_REQUIRED`, `409 REQUEST_CHANGE_PENDING`, `409 QUOTE_AWAITING_CUSTOMER`, `409 REQUEST_STATE_CHANGED`.

**Ví dụ phát hành dưới giá sàn:** Nếu Backend tính `floorPrice = 120000000`, còn Manager chọn `totalAmount = 115000000` từ các `items` trên, request **phải** ghi `"overrideReason": "Giảm giá theo thỏa thuận đã ghi nhận"`. Backend vẫn cho phát hành, trả `isBelowFloor: true` và lưu audit người thực hiện; nếu `overrideReason` rỗng trả HTTP `400 PRICE_OVERRIDE_REASON_REQUIRED`. Đây chỉ là ví dụ minh họa, không phải mức giá sàn chính thức.

**Rule hiệu lực:** BE bắt `validUntil > serverNow`; không cố định 7 ngày, không ngầm áp ngày tối đa/tối thiểu chưa duyệt. Quote hết hạn không làm Request tự hủy. Manager muốn điều chỉnh Quote đã gửi phải lập version mới; giữ mọi version để xem lịch sử. Nếu đã có một Quote đang `SENT` và còn chờ Customer thì xử lý thay thế/thu hồi đúng quy tắc phiên bản, **không ghi đè** version cũ.

### F01-M14. `GET /manager/requests/{requestId}/quotes`, `GET /manager/quotes/{quoteId}`

Danh sách version mới nhất trước; chi tiết bản Quote gắn `requestVersion`, `preliminaryPlanVersion`, `pricingVersion`, `currency`, `items`, `suggestedTotal`, `floorPrice`, `totalAmount`, `isBelowFloor`, `overrideReason`, `depositPercent`, `depositAmount`, `validUntil`, `sentAt`, `createdByManagerId`, `customerResponse`, `allowedActions`. Giá vốn nội bộ chỉ trả cho Manager. Không xóa bản cũ.

### F01-C15. `GET /customer/requests/{requestId}/quotes`, `GET /customer/quotes/{quoteId}`

Customer xem các phiên bản được phát hành, mới nhất trước; **không được thấy** chi phí nội bộ, margin nội bộ hay `floorPrice` công ty. Response `Quote` tham chiếu hợp lệ:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "quoteId": 78,
    "requestId": 15,
    "version": 2,
    "status": "SENT",
    "currency": "VND",
    "items": [
      {"category":"TRANSPORT","description":"Vận chuyển ngựa","quantity":1,"unitPrice":85000000,"amount":85000000},
      {"category":"PROCEDURE","description":"Hồ sơ","quantity":1,"unitPrice":15000000,"amount":15000000},
      {"category":"VETERINARY_CARE","description":"Chăm sóc thú y","quantity":1,"unitPrice":10000000,"amount":10000000},
      {"category":"INSURANCE","description":"Bảo hiểm","quantity":1,"unitPrice":5000000,"amount":5000000}
    ],
    "totalAmount": 115000000,
    "depositPercent": 40,
    "depositAmount": 46000000,
    "validUntil": "2026-11-19T16:59:59Z",
    "allowedActions": ["ACCEPT", "REQUEST_ADJUSTMENT", "REJECT"]
  }
}
```

**Chỉ bản Quote mới nhất, còn hạn, khớp Request Version, không bị Change Request khóa thao tác mới được Customer accept.** Lỗi quyền truy cập tài nguyên khác chủ: `404 NOT_FOUND`.

### F01-C16. `POST /customer/quotes/{quoteId}/accept`

**Body:** không cần. **200 data:** `{"quoteId":78,"quoteStatus":"ACCEPTED","requestStatus":"AWAITING_CONTRACT","contractId":40,"contractStatus":"DRAFT"}`. Backend sinh Contract DRAFT từ **đúng snapshot Quote đã chấp nhận**; không khởi tạo thanh toán/Trip tại đây. Errors `409 QUOTE_EXPIRED`, `QUOTE_NOT_LATEST`, `REQUEST_CHANGE_PENDING`, `INVALID_STATE`.

### F01-C17. `POST /customer/quotes/{quoteId}/request-adjustment`

**Body:** `{"content":"Đề nghị điều chỉnh mức giá"}`. **200 data:** `{"quoteId":78,"quoteStatus":"ADJUSTMENT_REQUESTED","requestStatus":"QUOTING"}`. Manager được phát hành version mới không giới hạn vòng thương lượng. Không tạo RequestStatus mới.

### F01-C18. `POST /customer/quotes/{quoteId}/reject`

**Body:** `{"reason":"Không phù hợp ngân sách"}`. **200 data:** `{"quoteId":78,"quoteStatus":"REJECTED","requestStatus":"QUOTING"}`. Không tự hủy Request. Customer có thể hủy riêng qua endpoint hủy hợp lệ.

**Acceptance tài chính:** cùng Quote Version và cùng chính sách tiền tệ, `totalAmount`, `depositAmount`, `remainingAmount` phải có thể đối soát; Backend không tạo khoản phải thu từ Estimate hoặc Quote chưa được chấp nhận/ký; tiền VNPay/Bank Transfer chỉ lấy theo Contract version đã ký.

## 11. Contract có phiên bản, ký OTP và deadline chung

### 11.1. Contract object và deadline

Sau `POST /customer/quotes/{quoteId}/accept`, BE tạo `Contract(DRAFT)` gắn Quote Version và Request Version. Manager hoàn thiện điều khoản rồi **gửi Contract với đúng một hạn** `completionDeadline` cho **cả việc ký OTP và đặt cọc**. Đây là hạn **độc lập** với `Quote.validUntil` (Quote chỉ cần còn hạn khi Customer chấp nhận).

**`GET /customer/requests/{requestId}/contract` và `GET /manager/requests/{requestId}/contract` – 200 data:**

```json
{
  "contractId": 40,
  "requestId": 15,
  "requestVersion": 3,
  "quoteId": 78,
  "quoteVersion": 2,
  "version": 1,
  "status": "PENDING_SIGNATURE",
  "currency": "VND",
  "totalAmount": 115000000,
  "depositPercent": 40,
  "depositAmount": 46000000,
  "completionDeadline": "2026-11-25T16:59:59Z",
  "effectiveCompletionDeadline": "2026-11-25T16:59:59Z",
  "isCompletionOverdue": false,
  "pdfFile": {"fileId":700,"url":"/api/files/700"},
  "signedAt": null,
  "effectiveAt": null,
  "payment": {"paymentStatus":"UNPAID","paidAmount":0,"depositPaidAmount":0,"paymentLocked":true},
  "allowedActions": ["REQUEST_OTP","SIGN","DECLINE"]
}
```

`paymentLocked=true` trước khi ký, vì **không cho đi tới cọc trước bước OTP**. Khi đã ký, status `SIGNED`, Request `AWAITING_DEPOSIT`, `paymentLocked=false` nếu còn hạn. Khi ký xong mà thoát khỏi web, lần sau GET vẫn trả `SIGNED` và hành động thanh toán (không cấp lại OTP ký).

### F01-M15. `GET /manager/requests/{requestId}/contract`

Cùng nguồn Contract nhưng Manager được xem audit/versions và các thao tác quản lý theo quyền. Không cho Customer đọc bản Contract của khách khác.

### F01-M16. `PUT /manager/contracts/{contractId}` và `POST /manager/contracts/{contractId}/send`

`PUT` chỉ chỉnh `DRAFT` chưa gửi: `{"customTerms":"Điều khoản theo thỏa thuận"}`. Không cho sửa hợp đồng đã ký, hoặc thay âm thầm tỷ lệ cọc/giá từ Quote đã chấp nhận. Muốn giá/cọc khác phải tạo **Quote Version mới** rồi Contract tương ứng.

`POST /manager/contracts/{contractId}/send` **body bắt buộc:**

```json
{"completionDeadline":"2026-11-25T16:59:59Z","note":"Gửi hợp đồng để khách ký và đặt cọc"}
```

**200 data:** `{"contractId":40,"status":"PENDING_SIGNATURE","completionDeadline":"2026-11-25T16:59:59Z","requestStatus":"AWAITING_CONTRACT"}`. `completionDeadline` phải sau serverNow; chỉ một timestamp, **không dùng** đồng thời `signDeadline`/`depositDueDate`. Backend snapshot văn bản/PDF/hash, chữ ký khách gắn nội dung phiên bản. Nếu Customer decline/hợp đồng chưa ký hết hạn: Manager có thể phát hành Contract Version mới (không ghi đè bản đã gửi), với deadline được thiết lập lại khi gửi.

### F01-M17. `POST /manager/requests/{requestId}/contract-versions`

**Body:** `{"sourceContractId":40,"reason":"Điều chỉnh điều khoản trước ký"}`. **201:** `{"contractId":41,"version":2,"status":"DRAFT"}`. Không tạo phiên bản mới làm biến mất dấu vết của Contract đã ký. `409 CONTRACT_ALREADY_SIGNED` nếu yêu cầu sửa bản đã ký trái quy trình.

### F01-C20. `POST /customer/contracts/{contractId}/otp`

**Body:** không cần. **200:** `{"sentTo":"c***@example.com","expiresInSeconds":300,"resendAfterSeconds":60}`. OTP chỉ dùng với Contract mới nhất `PENDING_SIGNATURE`, còn `effectiveCompletionDeadline`, đúng Customer. `expiresInSeconds`/`resendAfterSeconds` là **ví dụ giao diện**, thời gian thực lấy cấu hình Auth; OTP là mã ngắn hạn, không thay đổi deadline của hợp đồng. Errors `429 RATE_LIMITED`, `409 CONTRACT_EXPIRED`, `409 REQUEST_CHANGE_PENDING`.

### F01-C21. `POST /customer/contracts/{contractId}/sign`

**Request:** `{"otp":"482913"}`.

**200 Response:**

```json
{
  "success": true,
  "message": "Contract signed",
  "data": {
    "contractId": 40,
    "contractStatus": "SIGNED",
    "signedAt": "2026-11-20T04:30:00Z",
    "requestId": 15,
    "requestStatus": "AWAITING_DEPOSIT",
    "effectiveCompletionDeadline": "2026-11-25T16:59:59Z",
    "nextAction": "PAY_DEPOSIT",
    "paymentLocked": false
  }
}
```

Backend kiểm tra OTP đúng/chưa dùng/còn hạn, hợp đồng đúng owner, đúng content hash/version, chưa quá deadline chung và chưa có Change Request chờ duyệt; lưu `SIGNED` + audit **trước khi** trả 200. FE chỉ chuyển sang màn hình cọc khi nhận 200. **Không tạo Trip** tại bước ký. Nếu Customer rời/refresh trang, không yêu cầu ký lại; GET trả đúng trạng thái đã lưu.

### F01-C22. `POST /customer/contracts/{contractId}/decline`

**Body:** `{"reason":"Điều khoản chưa phù hợp"}`. **200:** `{"contractId":40,"contractStatus":"SIGN_DECLINED","requestStatus":"AWAITING_CONTRACT"}`. Manager tạo Contract Version mới nếu muốn thương lượng tiếp. Không tự hủy Request.

**Deadline đã quá khi chưa ký:** khóa OTP/Sign; Manager có thể phát hành phiên bản Contract mới với một `completionDeadline` khác. **Deadline quá khi đã ký:** giữ Contract `SIGNED`, khóa thanh toán mới, Manager gia hạn qua F01-M23 hoặc hủy thủ công đúng guard (Chương 13). Không tách deadline ký và cọc.

## 12. Thanh toán đặt cọc: VNPay và chuyển khoản ngân hàng

### 12.1. Điều kiện chung và số phải thu

**Chỉ hỗ trợ** `ONLINE_GATEWAY` (provider VNPay) và `BANK_TRANSFER` (Manager đối soát thủ công); không có `CASH`. **Trình tự:** Contract đã được Customer ký OTP (`SIGNED`) → mới mở thanh toán. Khoản phải thu `DEPOSIT` lấy từ **Contract đã ký**, gắn Quote Version đã chấp nhận. Customer không thể chỉnh `depositPercent`, `depositAmount`, `currency` hoặc `receivable.amount` bằng request FE.

**Deadline chung:** khi `now > effectiveCompletionDeadline` và chưa đủ cọc thì khóa **khởi tạo giao dịch VNPay mới** và **nộp proof chuyển khoản mới**, trả `409 PAYMENT_DEADLINE_EXPIRED`; không xóa giao dịch chờ xác minh đã gửi trước hạn, không xóa chữ ký, không tự hủy đơn. Manager có thể gia hạn theo F01-M23. Callback giao dịch đã khởi tạo hợp lệ và bằng chứng đã nộp trước hạn vẫn phải được **đối soát**; trường hợp Request đã bị hủy không được tự kích hoạt lại, cần xử lý theo dữ liệu/giao dịch thực tế.

Các khoản thanh toán được Backend ghi nhận vào ledger/receivable theo giao dịch đã xác minh; nếu trả chưa đủ cọc thì Request vẫn `AWAITING_DEPOSIT`, Contract vẫn `SIGNED`. Chỉ đủ điều kiện tổng cọc mới kích hoạt như Chương 14. Chống ghi nhận trùng cùng giao dịch/reference.

### F01-C23. `GET /customer/requests/{requestId}/payments` và F01-M18. `GET /manager/requests/{requestId}/payments`

**200 Response mẫu:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "requestId": 15,
    "contractId": 40,
    "contractStatus": "SIGNED",
    "requestStatus": "AWAITING_DEPOSIT",
    "currency": "VND",
    "contractAmount": 115000000,
    "depositPercent": 40,
    "depositRequiredAmount": 46000000,
    "depositConfirmedAmount": 0,
    "depositOutstandingAmount": 46000000,
    "paymentStatus": "UNPAID",
    "completionDeadline": "2026-11-25T16:59:59Z",
    "effectiveCompletionDeadline": "2026-11-25T16:59:59Z",
    "isCompletionOverdue": false,
    "paymentLocked": false,
    "pendingPaymentVerification": false,
    "receivables": [{"receivableId":201,"type":"DEPOSIT","currency":"VND","amount":46000000,"confirmedPaidAmount":0,"remainingAmount":46000000}],
    "transactions": [],
    "allowedActions": ["PAY_DEPOSIT"]
  }
}
```

**BE tự dẫn xuất:** `depositOutstandingAmount = max(0, depositRequiredAmount – depositConfirmedAmount)` trong cùng đơn vị tiền tệ; `paymentLocked=true` nếu chưa ký, đã hủy/kích hoạt, hoặc quá hạn chưa gia hạn. `paymentStatus` tổng hợp (`UNPAID`, `PENDING_CONFIRMATION`, `DEPOSIT_PAID`...) theo `00-conventions.md`, không thay trạng thái từng Transaction. Manager có thể xem audit/đối soát; Customer không xem dữ liệu ngân sách nội bộ.

### F01-C24. `GET /customer/payments/bank-info?requestId={requestId}`

**Auth:** Customer sở hữu Request, Contract `SIGNED`; GET có thể xem lại thông tin chuyển khoản khi payment bị khóa nhưng FE phải ẩn hướng dẫn tạo thanh toán mới và hiển thị cảnh báo quá hạn.

**200 data:**

```json
{
  "requestId": 15,
  "receivableId": 201,
  "bankName": "Tên ngân hàng theo cấu hình",
  "accountName": "Tên chủ tài khoản theo cấu hình",
  "accountNumber": "Số tài khoản theo cấu hình",
  "transferContent": "Nội dung định danh giao dịch từ Backend",
  "currency": "VND",
  "outstandingAmount": 46000000,
  "qrPayload": "QR payload từ Backend hoặc null"
}
```

Không hardcode tài khoản nhận tiền, nội dung chuyển khoản hay QR ở FE. `qrPayload` có thể `null` nếu module thanh toán không sinh QR; cách cấu hình tài khoản là trách nhiệm Backend/Finance.

### F01-C25. `POST /customer/payments/online` – Khởi tạo VNPay

**Request:** `{"receivableId":201}`. FE **không truyền số tiền/currency/tỷ giá hoặc return URL tùy ý**. App Backend đọc khoản phải thu và xác định payment URL/return URL từ cấu hình VNPay do nhóm triển khai. **200 data (adapter app, không phải payload VNPay nguyên bản):**

```json
{
  "success": true,
  "message": "Payment session created",
  "data": {
    "transactionId": 503,
    "receivableId": 201,
    "provider": "VNPAY",
    "transactionStatus": "PENDING_CONFIRMATION",
    "paymentUrl": "https://sandbox-vnpayment.vn/paymentv2/vpcpay.html?..."
  }
}
```

**Precondition:** Request thuộc Customer, Contract `SIGNED`, `AWAITING_DEPOSIT`, `paymentLocked=false`, receivable còn tiền phải thu; Backend kiểm tra currency/amount của module VNPay. Không mở session mới nếu bị khóa do deadline; giao dịch đang xử lý phải chống nhân đôi/bấm lại theo thiết kế adapter.

**Ranh giới tích hợp:** Thành viên phụ trách VNPay tự xử lý SDK/chữ ký/IPN/Return URL theo **code VNPay đang chạy**; Flow 1 **không áp đặt endpoint callback hay thuật toán signature giả định**. Backend chỉ thông báo `SUCCESS` khi đã xác thực đáng tin cậy các thông tin merchant/reference/amount/status và lưu giao dịch đúng một lần. **Return URL trên trình duyệt không đủ căn cứ báo đã nhận tiền.** FE phải GET trạng thái giao dịch và Request/Payment sau khi quay lại từ VNPay.

**Lỗi:** `409 CONTRACT_NOT_SIGNED`, `PAYMENT_DEADLINE_EXPIRED`, `INVALID_STATE`, `RECEIVABLE_ALREADY_PAID`, `PAYMENT_PENDING_CONFIRMATION` (khi không cho session song song), `404 NOT_FOUND`, `400 VALIDATION_ERROR`.

### F01-C26. `POST /customer/payments/manual` – Nộp bằng chứng chuyển khoản

**Auth:** `CUSTOMER`; `multipart/form-data` với phần `payload` JSON và tệp `receipt` PDF/JPG/PNG.

```json
{
  "receivableId": 201,
  "method": "BANK_TRANSFER",
  "declaredAmount": 46000000,
  "paidAt": "2026-11-21T08:20:00Z",
  "bankReference": "REFERENCE-FROM-CUSTOMER-IF-AVAILABLE",
  "note": "Đã chuyển khoản"
}
```

`receipt` là chứng từ Customer cung cấp; `declaredAmount`, `paidAt`, `bankReference` chỉ là **khai báo hỗ trợ đối soát**, không được coi là tiền đã nhận. **201 data:** `{"transactionId":504,"status":"PENDING_CONFIRMATION","method":"BANK_TRANSFER"}`. Không cộng tiền cọc tại bước này. Backend kiểm tra Contract đã ký, còn hạn hoặc đã gia hạn, owner, định dạng file và trạng thái receivable. Không có tùy chọn `CASH`.

### F01-C27. `GET /customer/payments/transactions/{transactionId}` và `GET /customer/payments/transactions/{transactionId}/receipt`

**200 data giao dịch:** `{"transactionId":504,"requestId":15,"receivableId":201,"method":"BANK_TRANSFER","declaredAmount":46000000,"confirmedAmount":null,"status":"PENDING_CONFIRMATION","rejectReason":null,"createdAt":"...","confirmedAt":null}`. Chỉ người sở hữu thấy giao dịch; `GET .../receipt` chỉ trả **biên nhận đã xác minh** nếu có (file binary, kiểm tra quyền); proof Customer upload không tự biến thành receipt xác nhận.

### F01-M19. `GET /manager/payments/pending` và `GET /manager/payments/transactions/{transactionId}`

**Quyền:** Manager. `GET /manager/payments/pending?page=1&pageSize=20` trả `{items,page,pageSize,totalItems,totalPages}`. Item gồm `transactionId`, `requestId`, `method: BANK_TRANSFER`, `receivableId`, `declaredAmount`, `expectedOutstandingAmount`, `receiptFileId`, `bankReference`, `createdAt`, `status`. Chi tiết còn có lịch sử ghi nhận và `allowedActions`. Hàng đợi phê duyệt thủ công **chỉ dành cho BANK_TRANSFER**; giao dịch VNPay không cho Manager giả lập kết quả provider.

### F01-M20. `POST /manager/payments/transactions/{transactionId}/confirm`

**Chỉ cho `BANK_TRANSFER`.** Manager phải **đối chiếu tiền thực nhận** với sao kê/nguồn kế toán trước khi xác nhận, không chỉ dựa vào proof. **Request:**

```json
{
  "confirmedAmount": 46000000,
  "bankReference": "BANK-REFERENCE-VERIFIED",
  "receivedAt": "2026-11-21T08:21:00Z",
  "note": "Đã xác minh tiền thực nhận"
}
```

**200 Response khi đủ cọc:**

```json
{
  "success": true,
  "message": "Bank transfer confirmed",
  "data": {
    "transactionId": 504,
    "transactionStatus": "SUCCESS",
    "confirmedAmount": 46000000,
    "paymentStatus": "DEPOSIT_PAID",
    "contractStatus": "EFFECTIVE",
    "requestStatus": "ACTIVATED",
    "trip": {"tripId":9,"status":"PLANNING"}
  }
}
```

Nếu tổng tiền mới xác nhận **chưa đủ cọc**, `paymentStatus` có thể `PARTIALLY_PAID` (theo logic ledger), Contract vẫn `SIGNED`, Request vẫn `AWAITING_DEPOSIT`, `trip:null`. Trong DB transaction: khóa transaction/receivable; chống đối soát trùng; lưu số tiền thực nhận, `bankReference`, thời điểm, `confirmedBy` Manager; cộng tiền đúng một lần; kiểm tra kích hoạt; commit; sau đó phát notification/SignalR. **Không** cho Confirm giao dịch VNPay tại endpoint này. **Lỗi:** `409 INVALID_STATE`, `TRANSACTION_ALREADY_PROCESSED`, `INVALID_PAYMENT_AMOUNT`, `PAYMENT_VERIFICATION_PENDING` khi cần đối soát thêm.

### F01-M21. `POST /manager/payments/transactions/{transactionId}/reject`

**Chỉ `BANK_TRANSFER`; request:** `{"reason":"Chưa tìm thấy tiền thực nhận để xác minh"}`. **200 data:** `{"transactionId":504,"transactionStatus":"REJECTED","requestStatus":"AWAITING_DEPOSIT"}`. Lưu lý do/audit và thông báo Customer. Không tự hủy Request.

### F01-S01. VNPay adapter và đồng bộ giao dịch **[NỘI BỘ BE]**

URL callback/IPN/Return, tham số chữ ký và mapping mã giao dịch **thuộc module VNPay do thành viên nhóm phụ trách**. Flow 1 chỉ yêu cầu một contract adapter nhất quán: `CreatePaymentSession(receivable)` → `paymentUrl, transactionId`; `VerifyAndRecordProviderResult(providerPayload)` → trạng thái giao dịch đã xác thực hoặc không; `GetTransactionStatus(transactionId)` cho REST GET.

Backend phải xác minh chữ ký và toàn vẹn thông tin phù hợp tích hợp provider, đối chiếu merchant/reference/amount/currency/kết quả, chống replay/duplicate, không ghi nhận thành công chỉ vì FE gọi Return URL. Một transaction thành công có thể dẫn tới bước kích hoạt Chương 14 **một lần duy nhất**. Nếu adapter nhận kết quả sau khi quá hạn, giao dịch đã bắt đầu trước hạn vẫn phải đối soát; nếu Request đã `CANCELLED` thì không tự kích hoạt lại, chuyển xử lý đối soát theo quy trình tài chính thực tế. Việc phối hợp/chi tiết provider **không yêu cầu user quyết định thêm trong Flow 1**.

## 13. Hạn chung, gia hạn và hủy Request

### 13.1. Một deadline cho ký OTP và tiền cọc

Contract phát hành chỉ có `completionDeadline`; sau gia hạn, Backend trả `effectiveCompletionDeadline`. Trước ký, Customer chỉ thấy thao tác ký. Sau ký, Customer thấy thao tác thanh toán (VNPay hoặc Bank Transfer). Quá deadline, BE **không cho thực hiện thao tác mới** để hoàn tất nghĩa vụ còn thiếu; dữ liệu chữ ký và giao dịch đã nộp vẫn giữ nguyên. **Không tự đặt số ngày tự gia hạn**, không tự tạo RequestStatus `EXPIRED` và không có job tự hủy.

**Lưu ý:** `Quote.validUntil` chỉ giới hạn thời gian **chấp nhận báo giá**, không phải deadline ký/cọc.

### F01-M23. `POST /manager/requests/{requestId}/deposit-extensions` – Manager gia hạn deadline chung

**Endpoint tên giữ tương thích với cấu trúc role cũ; ngữ nghĩa chính thức:** **gia hạn `effectiveCompletionDeadline` chung**, không tạo hạn chung độc lập. Manager có quyền thực hiện khi Request đang `AWAITING_CONTRACT` (chưa ký) hoặc `AWAITING_DEPOSIT` (đã ký), chưa bị `CANCELLED`/`ACTIVATED` và chưa có điều kiện ngăn nghiệp vụ.

**Request:**

```json
{"newCompletionDeadline":"2026-12-01T16:59:59Z","reason":"Cho khách thêm thời gian hoàn tất hợp đồng và tiền cọc"}
```

**201 Response:**

```json
{"success":true,"message":"Deadline extended","data":{"extensionId":12,"requestId":15,"previousDeadline":"2026-11-25T16:59:59Z","effectiveCompletionDeadline":"2026-12-01T16:59:59Z","approvedByManagerId":5,"createdAt":"2026-11-25T10:00:00Z","paymentLocked":false}}
```

`newCompletionDeadline` bắt buộc muộn hơn deadline đang áp dụng và sau `serverNow`. Backend lưu bản ghi `DeadlineExtension` riêng: hạn cũ, hạn mới, người duyệt, lý do, thời điểm; không sửa hash/nội dung Contract đã ký. Khi đã ký, gia hạn thành công **mở lại thanh toán**; Customer không cần OTP ký lần nữa. Khi chưa ký và Contract version đã EXPIRED, Manager cần gửi Contract Version mới phù hợp thay vì tự sửa bản bất biến.

**Errors:** `400 VALIDATION_ERROR`, `409 INVALID_STATE`, `409 DEADLINE_EXTENSION_INVALID`, `404 NOT_FOUND`. Chỉ Manager được gọi; không giả định phải có API Customer xin gia hạn.

### F01-M24. `POST /manager/requests/{requestId}/cancel-overdue-deposit` – Hủy quá hạn THỦ CÔNG

**Endpoint tên giữ tương thích, áp dụng khi chưa hoàn tất deadline chung:**

```json
{"reason":"Không hoàn tất nghĩa vụ ký/đặt cọc sau các lần trao đổi"}
```

**200 data:** `{"requestId":15,"requestStatus":"CANCELLED","cancelledAt":"...","cancelledByManagerId":5,"cancellationReason":"..."}`.

**Preconditions:** Request chưa activated/closed/cancelled; `serverNow > effectiveCompletionDeadline`; chưa có gia hạn còn hiệu lực; chưa xác minh đủ cọc; **không có giao dịch hoặc bằng chứng tiền đang chờ xác minh cần xử lý**; Manager đã rà soát tình trạng thực nhận, đúng thẩm quyền và nhập lý do. **Không đặt ngưỡng 3 ngày/7 ngày cố định**. Khi quá hạn lâu hay ngắn, hệ thống chỉ cảnh báo/tạo task để Manager cân nhắc; quyết định hủy là **thủ công**, không thực hiện qua cron.

**Errors:** `409 DEADLINE_NOT_OVERDUE`, `PAYMENT_VERIFICATION_PENDING`, `DEADLINE_EXTENSION_ACTIVE`, `INVALID_STATE`, `404 NOT_FOUND`. Hủy không được xóa Contract SIGNED, Quote, lịch sử thanh toán hoặc giao dịch đối soát; cách tính phí/hoàn tiền nếu đã thực nhận tiền phải căn cứ nghiệp vụ tài chính/hợp đồng, không tự sinh phạt.

### F01-S02. Job cảnh báo quá hạn **[HỆ THỐNG, KHÔNG REST]**

BE kiểm tra `effectiveCompletionDeadline`, điều kiện chưa hoàn tất, cập nhật cờ dẫn xuất/công việc/notification; **không tự CANCELLED**. Thời điểm và tần suất cảnh báo dùng cấu hình (không mặc định 3 ngày làm việc từ tài liệu cũ). Chống gửi thông báo trùng theo đơn/mốc thời gian; không phát cảnh báo sai khi đã activated/cancelled hoặc đang có gia hạn hợp lệ.

### F01-C13. `POST /customer/requests/{requestId}/cancel` – Hủy trước ký

**Body:** `{"reason":"Không còn nhu cầu vận chuyển"}`. **200:** `{"requestId":15,"status":"CANCELLED","cancelledAt":"..."}`. Chỉ trước Contract SIGNED, đúng `allowedActions`; BE lưu audit và giải phóng các ràng buộc liên quan hợp lệ. **Sau ký** dùng Cancellation Request, không dùng API này.

### F01-C14. `POST /customer/requests/{requestId}/cancellation-requests` và `GET .../cancellation-requests`

**POST Body:** `{"reason":"Cần xin hủy sau khi đã ký"}`. **201:** `{"cancellationRequestId":19,"status":"PENDING_APPROVAL"}`. Customer chỉ đề nghị, không tự chuyển Request `CANCELLED`. GET trả lịch sử và phản hồi Manager.

### F01-M10. `GET /manager/requests/{requestId}/cancellation-requests`, `POST .../{cancellationRequestId}/approve` và `POST .../{cancellationRequestId}/reject`

**GET:** danh sách đề nghị hủy theo Request. **Approve Body:** `{"decisionReason":"Chấp thuận hủy theo điều khoản hợp đồng","note":"Đã kiểm tra tiền cọc và tình trạng vận hành"}`. **200:** `{"cancellationRequestId":19,"status":"APPROVED","requestStatus":"CANCELLED"}` khi được phép kết thúc đơn. **Reject Body:** `{"reason":"Cần hoàn thiện điều kiện trước khi hủy"}`; **200:** `{"status":"REJECTED","requestStatus":"AWAITING_DEPOSIT"}` hoặc RequestStatus hiện tại.

**BE guards:** đối soát tiền đã xác minh hoặc đang chờ, hợp đồng đã ký, điều khoản tài chính và tình trạng Trip. **Không tự đặt `contractualChargeAmount`, `refundAmount` bằng số 0** nếu chưa có chính sách; xử lý bồi hoàn là nghiệp vụ tài chính riêng. Nếu Trip đã triển khai hoặc đang vận chuyển, không chuyển thẳng sang `CANCELLED` bỏ qua phương án an toàn và handoff Flow 3/5. Sau ký nhưng chưa hiệu lực cần lưu chữ ký trong audit kể cả khi Request được phép hủy.

## 14. Kích hoạt Request và tạo đúng một Trip (Backend side effect)

**Không có API Frontend `POST /activate`.** Sự kiện kích hoạt xảy ra trong cùng dịch vụ xử lý xác nhận nhận đủ cọc hợp lệ từ VNPay hoặc từ Manager xác nhận Bank Transfer. Các điều kiện **đều phải đúng**:

1. Request ở `AWAITING_DEPOSIT`, chưa bị hủy/kết thúc; Contract đúng phiên bản đã ký `SIGNED` và gắn Quote Version đã chấp nhận.
2. Tổng số tiền cọc **đã xác minh thực nhận**, sau chống giao dịch trùng, đạt nghĩa vụ tiền cọc của Contract. Giá/tiền tệ đúng ledger; không tin dữ liệu FE.
3. Nếu có trạng thái chờ xác minh hoặc thông tin quá hạn, xử lý theo kết quả đối soát và guard trước khi quyết định; **không kích hoạt Request đã bị `CANCELLED`**.
4. Trong một database transaction/atomic unit: cập nhật Contract `EFFECTIVE`, Request `ACTIVATED`, tạo Trip `PLANNING` với **unique** `Trip.requestId`, lưu audit và outbox. Nếu retry callback hoặc confirm bị bấm lại, trả trạng thái hiện hành, **không sinh Trip thứ hai hoặc cộng tiền lần hai**.
5. Sau commit phát `PaymentUpdated`, `RequestUpdated`, `TripUpdated`, `NotificationCreated`; FE tải REST nguồn sự thật.

**Kết quả sau kích hoạt:** `TripStatus=PLANNING`, `deployment` chưa được Manager xác nhận. Chưa được đặt `READY_TO_DEPART` hay xem tài liệu chưa duyệt là đủ điều kiện khởi hành. Manager phải xác nhận bước Deployment ở Chương 15 trước khi chính thức bàn giao tác vụ Flow 2/3.

## 15. Manager xác nhận Deployment và handoff Flow 2/3

### F01-M25. `GET /manager/trips/{tripId}`

**200 data:** bao gồm `tripId`, `requestId`, `status: PLANNING`, `preliminaryPlan`, `deployment: {status, confirmedAt, holdReason}`, `allowedActions`. Manager xem thông tin trước khi giao Coordinator/Specialist.

### F01-M26. `POST /manager/trips/{tripId}/confirm-deployment` **[BỔ SUNG]**

**Body:** `{ "note":"Đủ điều kiện bàn giao bước lập kế hoạch chi tiết" }`.  
**200 data:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"CONFIRMED", "confirmedAt":"..." }`. BE mới tạo tasks chính thức cho Coordinator và Specialist (triển khai **song song**). Đây **không phải** phê duyệt cuối `READY_TO_DEPART`.

### F01-M27. `POST /manager/trips/{tripId}/hold-deployment` & `POST /manager/trips/{tripId}/resume-deployment` **[BỔ SUNG]**

Hold body `{ "reason":"Cần làm rõ điều kiện an toàn" }`. Resume body `{ "note":"Đã xử lý vướng mắc" }`.  
**200 data:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"ON_HOLD" }` hoặc `CONFIRMED`. Giữ TripStatus `PLANNING`; đây là **trạng thái triển khai riêng**, không phát minh `TripStatus.ON_HOLD`. Không cho tiến hành phân công chính thức trong thời gian hold; Manager không tùy tiện từ chối hợp đồng có hiệu lực.


## 16. SignalR, thông báo và tác vụ tự động

**Hub:** `/api/hubs/updates` như `00-conventions.md`; sử dụng ASP.NET Core SignalR và `@microsoft/signalr`. Hub **không** tạo/xác nhận Request/Payment/Contract.

| Sự kiện | Khi nào | Người nhận | FE làm gì |
|---|---|---|---|
| `RequestUpdated` | Submit, Manager accept/reject/request-revision, resubmit, duyệt change, hủy, kích hoạt | Customer chủ đơn; Manager được phép | `GET /.../requests/{id}`, refresh `allowedActions` |
| `NotificationCreated` | Có thông báo mới | Chủ thông báo | Tải unread-count/inbox |
| `PaymentUpdated` | Proof submitted/confirmed/rejected, gia hạn/hủy quá hạn | Customer chủ đơn; Manager | Tải `GET /.../payments` |
| `TripUpdated` | Trip `PLANNING` được tạo; deployment confirmed/held/resumed | Manager; Customer chủ đơn; nhân sự liên quan sau phân công | Tải GET trip và trạng thái |

Quote/Contract thay đổi được báo qua `RequestUpdated` và `NotificationCreated`, FE tải lại Quote/Contract bằng REST. **BE chỉ phát event sau DB commit**, payload tối thiểu `{ "entityId": 15, "occurredAt": "...", "version": 3 }`. Không broadcast hợp đồng/thanh toán cho người ngoài phạm vi; không dùng SignalR thay REST hoặc dùng GPS nền. Kết nối lại phải refresh REST.


## 17. Error Contract, phân quyền, idempotency

**Thành công:** `{"success":true,"message":"OK","data":{}}`. **Lỗi field:**

```json
{"success":false,"message":"Validation failed","errorCode":"PRICE_OVERRIDE_REASON_REQUIRED","data":null,"errors":[{"field":"overrideReason","message":"Required when totalAmount is below floorPrice"}]}
```

Không trả `errors: []` khi không có lỗi field; `errors` chỉ xuất hiện nếu thật sự có danh sách lỗi theo trường, đúng `00-conventions.md`. FE phân nhánh bằng `errorCode`, không dựa `message`.

| HTTP | Mã | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `UNSUPPORTED_ROUTE`, `TRANSPORT_MODE_UNAVAILABLE` | Dữ liệu không hợp lệ hoặc route/mode không hỗ trợ |
| 400 | `REQUIRED_CUSTOMER_DOCUMENT_MISSING` | Thiếu tài liệu bắt buộc do Customer phải nộp khi Submit |
| 400 | `PRICE_OVERRIDE_REASON_REQUIRED` | Quote dưới giá sàn nhưng Manager không nhập lý do |
| 400 | `OTP_INVALID_OR_EXPIRED` | OTP sai/hết hạn/chưa được phát hành cho version cần ký |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED` | Thiếu/hết hạn xác thực |
| 403 | `FORBIDDEN_ROLE`, `ACCOUNT_INACTIVE` | Sai vai trò hoặc tài khoản bị khóa |
| 404 | `NOT_FOUND`, `PRICE_TABLE_NOT_FOUND` | Resource không tồn tại/không thuộc owner hoặc chưa cấu hình giá |
| 409 | `INVALID_STATE`, `REQUEST_STATE_CHANGED` | State/version thay đổi trước khi thực hiện thao tác |
| 409 | `HORSE_SCHEDULE_CONFLICT`, `REQUEST_CHANGE_PENDING` | Ngựa trùng lịch hoặc có đề nghị thay đổi chưa xử lý |
| 409 | `QUOTE_EXPIRED`, `QUOTE_NOT_LATEST`, `QUOTE_AWAITING_CUSTOMER` | Quote không còn khả dụng |
| 409 | `PRELIMINARY_PLAN_REQUIRED` | Thiếu kế hoạch sơ bộ cho phiên bản Request hiện tại |
| 409 | `CONTRACT_EXPIRED`, `CONTRACT_NOT_LATEST`, `CONTRACT_ALREADY_SIGNED`, `CONTRACT_NOT_SIGNED` | Contract/OTP chưa đủ điều kiện |
| 409 | `PAYMENT_DEADLINE_EXPIRED`, `RECEIVABLE_ALREADY_PAID`, `PAYMENT_PENDING_CONFIRMATION` | Không thể tạo thanh toán mới hoặc đang cần đối soát |
| 409 | `TRANSACTION_ALREADY_PROCESSED`, `INVALID_PAYMENT_AMOUNT`, `PAYMENT_VERIFICATION_PENDING` | Confirm/reject không hợp lệ, số tiền hoặc bằng chứng cần kiểm tra |
| 409 | `DEADLINE_NOT_OVERDUE`, `DEADLINE_EXTENSION_ACTIVE`, `DEADLINE_EXTENSION_INVALID` | Không thỏa điều kiện gia hạn/hủy quá hạn |
| 409 | `CANCELLATION_REQUIRES_APPROVAL`, `REQUEST_NOT_CANCELLABLE` | Không được hủy trực tiếp |
| 429 | `RATE_LIMITED` | Giới hạn OTP/thao tác an toàn |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống |

**Authorization:** tất cả `/customer/*` kiểm tra `CUSTOMER` và ownership từ JWT; không tin `customerId` của FE; resource khách khác trả `404 NOT_FOUND`. `/manager/*` kiểm tra `LOGISTICS_MANAGER`. VNPay callback không nằm dưới endpoint role Customer, kiểm tra tính xác thực riêng theo provider. Tài liệu/biên lai phải truy cập qua API có quyền; không lộ đường dẫn file public.

**Idempotency/Concurrency:** tạo Request, tạo Quote, ký OTP, tạo payment session, Manager confirm ngân hàng, VNPay callback và activation phải chống gửi trùng/retry phù hợp (`Idempotency-Key` nếu được ứng dụng hỗ trợ, unique constraint, locking, transaction). Manager approve/reject cùng Request/Change/Bank Transfer cần optimistic locking hoặc transaction. Version `requestVersion`, `preliminaryPlanVersion`, `quoteVersion` và `contractVersion` là cơ sở chặn stale action. Contract/Quote đã phát hành và giao dịch đã xác nhận là dữ liệu audit không ghi đè.

**Thời gian:** timestamp là ISO 8601 UTC, date là `YYYY-MM-DD`; BE kiểm tra `validUntil`/`completionDeadline` theo server clock. Hạn gia hạn phải đồng nhất ở `Contract`, `RequestDetail`, `Payments` và notification. `TransactionStatus`/`PaymentStatus`/`RequestStatus` là ba loại trạng thái khác nhau. Các error code bổ sung sẽ được đồng bộ trong `00-conventions.md` khi hoàn thiện bộ Role Contracts, tránh đặt hai tên cho một lỗi.

## 18. Page → API và quyền truy cập theo Role

### 18.1. Customer

| Page / Function | Method | Endpoint | UC | Tính chất |
|---|---|---|---|---|
| Đăng ký/đăng nhập để sử dụng Flow 1 | POST | `/auth/register/request-otp`, `/auth/register/verify-otp`, `/auth/register`, `/auth/login`, `/auth/google-login` | Shared | Tham chiếu `01` |
| Trang chủ, hành động Customer cần xử lý | GET | `/customer/dashboard` | Dashboard | Tham chiếu `02` |
| Chọn quốc gia | GET | `/public/countries` | CUST-02/03 | Tham chiếu `01` |
| Chọn mode khả dụng | GET | `/customer/estimates/transport-modes` | CUST-02 | Có trong `02` |
| Xem dự toán sơ bộ | POST | `/customer/estimates` | CUST-02 | Có trong `02` |
| Tải PDF dự toán | POST | `/customer/estimates/pdf` | CUST-02 | Có trong `02` |
| Cấu hình form, giới hạn theo BE | GET | `/customer/requests/form-options` | CUST-03 | Có trong `02` |
| Checklist hồ sơ theo tuyến và trách nhiệm | GET | `/customer/requests/document-requirements` | CUST-03 | **[BỔ SUNG — cần đồng bộ Flow 2]** |
| Xem danh sách ngựa của mình | GET | `/customer/horses` | CUST-08 | Tham chiếu `02` |
| Danh sách ngựa có thể chọn và kiểm tra xung đột lịch | GET | `/customer/horses/selectable` | CUST-03/08 | Có trong `02` |
| Thêm ngựa trong wizard | POST | `/customer/horses` | CUST-08 | Tham chiếu `02` |
| Xem chi tiết ngựa (ảnh, microchip, hộ chiếu, trạng thái) | GET | `/customer/horses/{horseId}` | CUST-08 | Tham chiếu `02` |
| Sửa thông tin ngựa được phép trước khi chọn | PUT | `/customer/horses/{horseId}` | CUST-08 | Tham chiếu `02`, theo `allowedActions` |
| Xem chi tiết một tài liệu ngựa | GET | `/customer/documents/{documentId}` | CUST-04 | Tham chiếu `02` |
| Xem/tải ảnh ngựa, hộ chiếu và giấy tờ | GET | `/files/{fileId}` | Shared | Tham chiếu `01`, phân quyền theo Horse/Document |
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
| Số tiền cọc, hạn chung, trạng thái thanh toán | GET | `/customer/requests/{requestId}/payments` | CUST-09 | Có trong `02` |
| QR/nội dung chuyển khoản | GET | `/customer/payments/bank-info` | CUST-09 | Có trong `02` |
| Tạo giao dịch qua cổng thanh toán | POST | `/customer/payments/online` | CUST-09 | Có trong `02`; phụ thuộc provider |
| Gửi bằng chứng thanh toán thủ công | POST | `/customer/payments/manual` | CUST-09 | Có trong `02` |
| Xem giao dịch | GET | `/customer/payments/transactions/{transactionId}` | CUST-09 | Có trong `02` |
| Biên nhận đã xác nhận | GET | `/customer/payments/transactions/{transactionId}/receipt` | CUST-09 | Có trong `02` |
| Notification badge + inbox | GET | `/notifications`, `/notifications/unread-count` | Shared | Tham chiếu `01` |
| Theo dõi thay đổi tức thời | SignalR | `/api/hubs/updates` | Shared | Hub, không phải REST |

**Wizard:** chuyển bước, quay lại bước, review trước khi Submit là **state của FE**, không phát sinh REST bắt buộc. `POST /customer/requests` chỉ gọi khi Customer xác nhận gửi **đơn hoàn chỉnh**; không tạo Request `DRAFT` ngầm để tránh xung đột enum đã chốt. Nếu nhóm muốn lưu dở trên server, phải phê duyệt một nghiệp vụ Draft độc lập trước khi bổ sung API.

### 18.2. Logistics Manager

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
| Manager gia hạn deadline chung | POST | `/manager/requests/{requestId}/deposit-extensions` | LM-03 | **[BỔ SUNG]** |
| Hủy thủ công do quá hạn chung sau Manager xem xét | POST | `/manager/requests/{requestId}/cancel-overdue-deposit` | LM-03 | **[BỔ SUNG]** |
| Xem Trip vừa kích hoạt | GET | `/manager/trips/{tripId}` | Handoff | Có trong `04` |
| Manager xác nhận cho triển khai Trip | POST | `/manager/trips/{tripId}/confirm-deployment` | Handoff | **[BỔ SUNG]** |
| Manager tạm giữ triển khai / mở lại | POST | `/manager/trips/{tripId}/hold-deployment`, `/manager/trips/{tripId}/resume-deployment` | Handoff | **[BỔ SUNG]** |
| Nhận cập nhật realtime | SignalR | `/api/hubs/updates` | Shared | Hub, không phải REST |

### 18.3. Bảng ánh xạ Customer UI → Function → API trong Flow 1

> Các route dưới đây là **gợi ý đường dẫn Frontend**, không phải endpoint BE bắt buộc. Đường dẫn FE thực tế theo React Router của dự án. Một tab có thể sử dụng lại API chi tiết đã tải, không cần tạo endpoint mới nếu response đủ dữ liệu.

| Page hoặc thành phần UI | Chức năng phải có | API/nguồn dữ liệu | Kết quả FE cần hiển thị |
|---|---|---|---|
| `/customer/home` | Xem các yêu cầu đang chờ thao tác, báo giá, hợp đồng, cọc | `GET /customer/dashboard` | Mã đơn, loại công việc, deadline, liên kết chi tiết |
| `/customer/horses` | Danh sách ngựa, tìm kiếm, trạng thái | `GET /customer/horses` | Ảnh, tên, microchip, trạng thái, tóm tắt hồ sơ |
| `/customer/horses/{horseId}` | Xem thông tin đầy đủ ngựa | `GET /customer/horses/{horseId}` | Thuộc tính ngựa, thông tin hộ chiếu, ảnh, `allowedActions` |
| Tab hồ sơ ngựa | Danh sách giấy tờ và xem tệp scan | `GET /customer/horses/{horseId}/documents`, `GET /customer/documents/{documentId}`, `GET /files/{fileId}` | Phiên bản/tình trạng giấy tờ, file hợp lệ, thông báo thiếu giấy tờ |
| Dự toán sơ bộ | Chọn điểm đi/đến, thời gian, số ngựa và mode | `GET /public/countries`, `GET /customer/estimates/transport-modes`, `POST /customer/estimates` | Giá tham khảo, phân tách phí bắt buộc, cảnh báo không ràng buộc |
| Wizard – Trip Information | Cấu hình ngày/mode, giữ dữ liệu bước | `GET /customer/requests/form-options`, `GET /customer/requests/document-requirements` và API Estimate | Ngày khả dụng, quốc gia/mode, form validation |
| Wizard – Pickup/Delivery | Nhập địa chỉ đường phố và người nhận | Dữ liệu trên FE; gửi qua `POST /customer/requests` | Tóm tắt thông tin nhận/giao ngựa |
| Wizard – Horses | Chọn **nhiều ngựa đã có**, xem chi tiết trước khi chọn | `GET /customer/horses`, `GET /customer/horses/selectable`, `GET /customer/horses/{horseId}` | Chọn được hay trùng lịch; cảnh báo tài liệu |
| Wizard – Add New Horse | **Tạo ngựa mới trong wizard**, gồm ảnh + passport scan | `POST /customer/horses`, sau đó `GET /customer/horses/selectable` | Thêm ngựa vừa tạo vào danh sách đã chọn mà không xóa state wizard |
| Wizard – Documents | Xem checklist VN→VN/VN→JP theo trách nhiệm, nộp hồ sơ Horse và hồ sơ Request | `GET /customer/requests/document-requirements`; `GET/POST /customer/horses/{horseId}/documents`; file PER_TRIP kèm `POST /customer/requests` multipart | Thiếu hồ sơ Customer tại Submit thì báo lỗi; hồ sơ COMPANY để Specialist làm trong Flow 2 |
| Wizard – Review & Confirm | Xem tất cả dữ liệu, quay lại sửa, xác nhận tạo đơn | `POST /customer/requests` **một lần khi submit** | Request code, status `PENDING`, cảnh báo hồ sơ |
| `/customer/requests` | Xem danh sách/trạng thái đơn | `GET /customer/requests` | Đơn hiện tại, tìm kiếm/lọc |
| `/customer/requests/{id}` | Xem chi tiết, lịch sử, quyền thao tác | `GET /customer/requests/{requestId}` | Thông tin đơn, ngựa, Quote/Contract/Payment tóm tắt, `allowedActions` |
| Trang/Modal yêu cầu sửa | Xem yêu cầu Manager và nộp lại | `GET /customer/requests/{requestId}/revision-requests`, `PUT /customer/requests/{requestId}/revision` | Lý do yêu cầu, trường cần sửa, lịch sử phiên bản |
| Tab yêu cầu bổ sung | Xem câu hỏi và trả lời | `GET /customer/requests/{requestId}/info-requests`, `POST /customer/requests/{requestId}/info-responses` | Lịch sử hỏi đáp/tài liệu đính kèm |
| Tab đề xuất thay đổi | Tạo/xem đề xuất và quyết định Manager | `POST/GET /customer/requests/{requestId}/change-requests` | Đề xuất `PENDING_APPROVAL`, dữ liệu chuẩn chưa thay đổi |
| Tab hủy đơn | Hủy trước ký, xin hủy sau ký, xem kết quả | `POST /customer/requests/{requestId}/cancel`, `POST/GET /customer/requests/{requestId}/cancellation-requests` | Quy trình khác nhau trước và sau ký |
| Tab báo giá | Xem chi tiết/lịch sử, đồng ý/thương lượng/từ chối | `GET /customer/requests/{requestId}/quotes`, `GET /customer/quotes/{quoteId}`, action POST liên quan | Version, `validUntil` do Manager chọn, số tiền, `allowedActions` |
| Tab hợp đồng | Xem hợp đồng/bản PDF, lấy OTP, ký/từ chối | `GET /customer/requests/{requestId}/contract`, `GET /files/{fileId}`, POST Contract OTP/Sign/Decline | `SIGNED` khác `EFFECTIVE`; sau khi ký FE chuyển Payment; lần sau không ký lại |
| Tab thanh toán cọc | Xem số tiền cọc, hạn, chứng từ, trạng thái | `GET /customer/requests/{requestId}/payments`, Bank info/Online/Manual, Transaction GET | `PAY_DEPOSIT` chỉ khi Contract SIGNED và chưa quá hạn; đã ký nhưng chưa cọc có thể quay lại tiếp tục, biên nhận |
| Hộp thư thông báo | Xem thông báo và tải lại dữ liệu thay đổi | `GET /notifications`, `GET /notifications/unread-count`; SignalR | Trạng thái mới chỉ sau khi GET REST xác nhận |

**Ranh giới:** Trang theo dõi xe, lịch trình vận chuyển chi tiết, health log khi đang chạy và nghiệm thu **không** thuộc Flow 1; có trong Role Customer API cho Flow 4/hậu bàn giao. Ở cuối Flow 1, Customer chỉ cần thấy `tripId`, `tripCode`, `TripStatus = PLANNING` và trạng thái triển khai từ Request detail/notification.

### 18.4. Dịch vụ dùng chung / tự động

| Hành động hệ thống | Cách kích hoạt | Có cần endpoint riêng? |
|---|---|---|
| Sinh mã Request, lưu lịch sử, phát thông báo | `POST /customer/requests` | **Không**; side effect trong BE |
| Tính dự toán theo bảng giá cấu hình (PricingService) | `POST /customer/estimates` | Không có endpoint phụ; không tạo Quote/Request |
| Hết hạn từng phiên bản Quote/Contract | BE kiểm tra thời gian khi đọc/ghi; job đồng bộ khi cần | Không có API FE riêng |
| Sinh Contract `DRAFT` khi Quote được chấp nhận | `POST /customer/quotes/{quoteId}/accept` | Không cần API tạo Contract từ FE |
| Xác minh cổng thanh toán VNPay | IPN/cơ chế xác minh đáng tin cậy của VNPay | **Có adapter server**, URL/method phải đối chiếu mã nguồn VNPay của nhóm; Return URL không xác nhận thành công |
| Sinh Trip `PLANNING` sau cọc xác nhận | Payment confirmation/webhook hợp lệ | **Không**; BE xử lý nguyên tử, chống tạo trùng |
| Cảnh báo quá hạn deadline chung (không auto-cancel) | Scheduled job + lịch ngày lễ/nghỉ bù Việt Nam | Không có API FE; cảnh báo không tự huỷ |
| Phát SignalR events | Sau khi transaction DB thành công | Không có endpoint FE để tự phát |


## 19. Acceptance Tests (UAT) / checklist kiểm tra tích hợp

| ID | Scenario | Kết quả bắt buộc |
|---|---|---|
| F01-T01 | `VN→VN`, `VN→JP` khi tariff/config phù hợp | Tính Estimate được, mode theo BE |
| F01-T02 | `JP→VN`, `VN→TH` hoặc mode không khả dụng | `UNSUPPORTED_ROUTE` / `TRANSPORT_MODE_UNAVAILABLE` |
| F01-T03 | Thiếu bảng giá | `PRICE_TABLE_NOT_FOUND`, không dùng giá giả |
| F01-T04 | Customer tạo Horse trong wizard | Ảnh và passport scan lưu một lần, Horse trong My Horses ngay cả khi bỏ wizard |
| F01-T05 | Thiếu thông tin/giấy tờ Customer phải nộp | Submit bị chặn, trả trường/tài liệu thiếu |
| F01-T06 | Giấy tờ COMPANY chưa có/chưa được Specialist duyệt | Không chặn Submit nếu Customer đã đủ phần mình; tạo công việc Flow 2 |
| F01-T07 | Request đầy đủ được gửi thành công | `PENDING`, thông báo Manager, không tạo Trip |
| F01-T08 | Manager yêu cầu Revision, Customer nộp lại | `CHANGES_REQUESTED → PENDING`, audit Request version |
| F01-T09 | Customer Change Request quan trọng trước ký | Chưa ghi đè canonical; không chấp nhận Quote/ký khi đang chờ |
| F01-T10 | Manager duyệt Change Request sau Quote | Version Request tăng, Quote/Contract phiên bản lỗi thời không thể ký, tiếp tục `QUOTING` |
| F01-T11 | Manager xem Pricing Suggestion | BE tính `estimatedCost`, `suggestedTotal`, `floorPrice`; Customer không được xem chi phí nội bộ |
| F01-T12 | Manager phát hành Quote bằng/qua sàn | Không cần `overrideReason`; Backend tính lại tổng |
| F01-T13 | Manager phát hành Quote dưới sàn không có lý do | `PRICE_OVERRIDE_REASON_REQUIRED` |
| F01-T14 | Manager phát hành Quote dưới sàn có lý do | Thành công, audit `floorPrice`, `totalAmount`, Manager, lý do |
| F01-T15 | Manager chọn `depositPercent` theo từng Quote | Quote/Contract snapshot đúng, không auto-default 30% |
| F01-T16 | Manager chọn `validUntil` trên mỗi Quote Version | Quote hết hạn không accept được, Request không tự hủy; không default 7 ngày |
| F01-T17 | Customer thương lượng Quote nhiều phiên bản | Lưu lịch sử; chỉ version hợp lệ mới nhất actionable; không giới hạn 3 vòng |
| F01-T18 | Manager gửi Contract | **Một** `completionDeadline` chung cho ký và cọc; Contract `PENDING_SIGNATURE` |
| F01-T19 | Customer OTP ký thành công | Contract `SIGNED`, Request `AWAITING_DEPOSIT`; FE chuyển màn hình cọc, không tạo Trip |
| F01-T20 | Customer ký xong thoát trang và quay lại | GET vẫn `SIGNED`, nút ký đã hoàn tất, nút thanh toán mở nếu còn hạn; không ký lại |
| F01-T21 | Customer chưa ký cố gọi `/payments/online`/`manual` | BE chặn `CONTRACT_NOT_SIGNED` |
| F01-T22 | Hết hạn chung khi đã ký/chưa nộp cọc | `paymentLocked=true`, BE chặn giao dịch/proof mới, không tự `CANCELLED` |
| F01-T23 | Manager gia hạn | Cập nhật `effectiveCompletionDeadline`, mở lại thanh toán; Contract vẫn `SIGNED` |
| F01-T24 | Đơn quá hạn dài | Hệ thống chỉ cảnh báo; Manager quyết định hủy thủ công sau khi đối soát |
| F01-T25 | Có proof/chuyển khoản đang chờ xác minh | Manager không được hủy nhầm; phải đối soát trước |
| F01-T26 | VNPay Return URL giả success | Không ghi Transaction `SUCCESS`, không kích hoạt |
| F01-T27 | VNPay result đã xác thực / callback lặp | Ghi nhận đúng một giao dịch thành công, không cộng tiền lặp |
| F01-T28 | Customer nộp proof Bank Transfer | `PENDING_CONFIRMATION`, không coi là đã nhận tiền |
| F01-T29 | Manager xác nhận Bank Transfer đúng tiền thực nhận | Ghi `confirmedBy`, số tiền và reference; nếu đủ cọc kích hoạt |
| F01-T30 | Đã ký nhưng mới nhận cọc một phần | Contract vẫn `SIGNED`, Request `AWAITING_DEPOSIT`, chưa tạo Trip |
| F01-T31 | Đủ cọc được xác minh lần đầu | Contract `EFFECTIVE`, Request `ACTIVATED`, đúng một Trip `PLANNING` |
| F01-T32 | Gửi lại request xác nhận/IPN nhiều lần | Không tạo Trip thứ hai; ledger không cộng trùng |
| F01-T33 | Manager chưa confirm deployment | Trip `PLANNING` chưa mở tác vụ chính thức Flow 2/3 |
| F01-T34 | Manager confirm deployment | Bàn giao công việc cho Specialist/Coordinator; chưa `READY_TO_DEPART` |
| F01-T35 | Customer hoặc Manager hủy đúng quyền/trạng thái | Giữ lịch sử Contract, Quote, payment; không xóa audit |
| F01-T36 | Customer truy cập tài nguyên của Customer khác | `404 NOT_FOUND` |
| F01-T37 | FE gửi sửa `totalAmount`/`depositAmount`/currency tại payment | BE bỏ qua/từ chối; số tiền lấy từ Contract và receivable |
| F01-T38 | SignalR bị ngắt/reconnect | FE GET lại REST, trạng thái không lệ thuộc thông báo push |

**Điều kiện nghiệm thu tài liệu trước khi code:** các API ở Chương 18 phải được đồng bộ vào `02-customer-api.md` và `04-manager-api.md`; schema checklist cần khớp Flow 2; VNPay adapter mapping khớp mã nguồn thực tế. Các test này là **kịch bản cần thực hiện**, không phải tuyên bố đã có code/đã kiểm thử.

## 20. Thông số cấu hình và phụ thuộc triển khai (không phải vấn đề cần hỏi lại)

Các mục dưới đây **không chặn việc giao thiết kế nghiệp vụ**, nhưng đội code phải lấy từ cấu hình hoặc hiện thực đang chạy, không tự phát sinh policy từ số minh họa.

| ID | Chủ đề | Cách xử lý trong contract |
|---|---|---|
| F01-CONFIG-01 | Bảng giá/tariff VN→VN và VN→JP, phí theo route/mode/horseCount/ngày | Người phụ trách Pricing tự triển khai engine/bảng giá có version; API schema cố định, không hardcode số minh họa |
| F01-CONFIG-02 | `floorPrice`, margin/cost policy | BE tính theo chính sách công ty; Manager override khi có `overrideReason`; không chờ phê duyệt ngoại lệ từ role khác |
| F01-CONFIG-03 | Thuế, phụ phí, quy tắc làm tròn, currency/FX | Dùng chính sách cấu hình và dữ liệu triển khai, không tự lấy mặc định từ ví dụ |
| F01-CONFIG-04 | Giới hạn đầu vào và lead time | BE lấy cấu hình chính thức, không mặc định 14 ngày từ bản cũ |
| F01-CONFIG-05 | `depositPercent` | **Manager tự chọn theo mỗi Quote**; không mặc định 30%; BE kiểm tra tính hợp lệ theo quy tắc tài chính được công ty áp dụng |
| F01-CONFIG-06 | `Quote.validUntil` | **Manager tự chọn theo từng phiên bản**, timestamp tương lai; không cố định 7 ngày |
| F01-CONFIG-07 | Contract `completionDeadline` | **Manager tự đặt một deadline chung**, không có hạn ký/hạn chung độc lập; gia hạn phải được Manager ghi nhận |
| F01-CONFIG-08 | Quá hạn, thông báo và hủy | Khóa thanh toán mới khi hết hạn; hệ thống cảnh báo theo cấu hình; **không tự hủy**; Manager hủy thủ công nếu phù hợp, không áp ngưỡng 3 ngày |
| F01-CONFIG-09 | Checklist tài liệu tuyến, phân loại Customer/Company, mốc phải có | Tra dữ liệu yêu cầu pháp lý/nghiệp vụ được công ty phê duyệt cho VN→VN/VN→JP; Flow 2 và Flow 1 cùng nguồn |
| F01-CONFIG-10 | VNPay IPN/callback, chữ ký, URL, merchant, settlement currency | Thành viên tích hợp VNPay tự phụ trách; Flow 1 chỉ định contract đầu vào/đầu ra cho customer payment và BE xác minh kết quả |
| F01-CONFIG-11 | Bank Transfer tài khoản/QR/nội dung, đối soát | BE trả dữ liệu cấu hình; Manager xác minh tiền thực nhận, lưu audit |
| F01-CONFIG-12 | Quy tắc phí hủy/hoàn tiền phát sinh | Dựa vào chính sách/hợp đồng và tình trạng vận hành; không mặc định số tiền phạt hoặc hoàn tiền |

**Không cần tách `pricing-api.md` làm hợp đồng bắt buộc để hiểu Flow 1:** Chương 5 và 10 là contract Pricing nội tại. **Không** yêu cầu người phụ trách VNPay thay module đang hoạt động chỉ để khớp ví dụ callback không có trong tài liệu.

## 21. Kiểm tra nhất quán, bàn giao và lịch sử phiên bản

### 21.1. Nguồn sự thật và đồng bộ role

- **Flow 1 này** là contract tổng theo luồng nghiệp vụ, dùng để đồng bộ các endpoint cùng tên trong `02-customer-api.md`, `04-manager-api.md`, `01-shared-api.md` và `00-conventions.md`. Không triển khai hai request/response khác nhau cho cùng một URL.
- File Role cũ có tuyến VN→TH, cọc mặc định 30%, Quote/Contract 7 ngày, job grace 3 ngày, Manager bắt buộc từ chối Quote dưới sàn, hoặc chỉ VNPay cần cập nhật theo Flow 1 bản này **trước khi nhóm code**.
- `flow-01-use-case-specification.md` phải cập nhật theo các Business Rules đã chốt: trách nhiệm hồ sơ Submit, Hybrid Pricing/override giá sàn, deadline chung ký/cọc, VNPay + Bank Transfer, Manager hủy thủ công không grace mặc định.
- `POST /customer/horses` và hồ sơ Horse dùng API Role Customer hiện có; **không tạo endpoint thêm ngựa riêng trong wizard**. Checklist theo tuyến/đính kèm PER_TRIP khi Submit được chuẩn hóa trong Chương 6–7, cần chung nguồn kiểm tra với Flow 2.
- Các endpoint được ghi trong hợp đồng thiết kế **không đồng nghĩa đã được lập trình**; người phụ trách tích hợp xác nhận code và test riêng khi bàn giao.

### 21.2. Kiểm tra bắt buộc trước merge

1. **Route scope:** mọi JSON và error test chỉ đặt VN→VN/VN→JP; không chấp nhận JP→VN/VN→TH.
2. **Pricing:** BE tính estimate, suggestion, floor, quote total/deposit; Manager được override dưới sàn có lý do và chọn `depositPercent`, `validUntil` theo **Quote Version**.
3. **Document:** Submit có đủ hồ sơ Customer, không đòi hồ sơ do công ty phải thực hiện; Specialist xử lý Flow 2 trước khởi hành.
4. **Contract + Payment:** ký OTP trước, lưu SIGNED khi rời trang; một deadline chung; VNPay hoặc Bank Transfer; quá hạn khóa giao dịch mới/Manager gia hạn; không auto-cancel.
5. **Activation:** chỉ khi ký + đủ cọc xác minh; BE transaction atomic và `Trip.requestId` unique; Trip mới `PLANNING`.
6. **Quyền:** Customer chỉ thấy của mình; Manager theo role; VNPay callback không do FE tự xác nhận.
7. **Contract testing:** cập nhật và test `00-conventions`, `01-shared`, `02-customer`, `04-manager`, Flow 1 Use Case; kiểm tra toàn bộ ID F01, route/method, error và field schema; acceptance tests Chương 19.

**Version history:** v1.1 — mở rộng Coverage FE Customer; v2.0-DRAFT — tích hợp Estimate/Pricing/VNPay vào 21 chương; **v2.0 Final Flow Contract** — áp quyết định cuối về ngân hàng, giá sàn có Manager override, cọc/validUntil do Manager tự cài, deadline chung ký/cọc, lưu trạng thái ký và khóa thanh toán quá hạn, Manager hủy thủ công; hồ sơ Customer/Company theo checklist tuyến; không tự đặt giả định tài chính hay adapter VNPay.
