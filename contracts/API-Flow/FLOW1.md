# FLOW 01 – API Contract v2.5: Estimate → Transport Request → Draft Contract → OTP → Deposit → Activation

> **Cập nhật MVP 16/10/2026:** cọc cố định 40%; chuẩn bị sàn 2/3/7 ngày theo tuyến/cự ly, Manager được tăng trong kế hoạch; Wizard bắt buộc ảnh + scan passport, không thay thẩm định Flow 2. Database chỉ thêm `CONTRACT.CompletionDeadline`, `CONTRACT.RequestID`, cho `TripID` nullable và thêm index/FK có nhu cầu; không tạo 12 bảng. Version/snapshot/plan/deployment dùng private metadata. Xem [plan 2.0](FLOW1_IMPLEMENTATION_PLAN.md). SQL vẫn là nguồn tiền/trạng thái; metadata và SQL không có một transaction chung. Chi tiết lưu audit/outbox trong các chương cũ là yêu cầu về hành vi/recovery, **không yêu cầu thêm SQL outbox** cho MVP này.

> **SWP391 – Cross-Border Racehorse Transport System**  
> **Use cases:** `UC-CUST-02`, `UC-CUST-03`, `UC-CUST-08` (phụ thuộc), `UC-CUST-10`, `UC-CUST-11`, `UC-CUST-09`, `UC-LM-01`, `UC-LM-02`, `UC-LM-03` (bổ sung).  
> **Actors:** `CUSTOMER`, `LOGISTICS_MANAGER`; các API Auth/Master/Horse/Document từ Shared và Customer là phụ thuộc.  
> **Cơ sở:** `00-conventions.md`, `01-shared-api.md`, `02-customer-api.md`, `04-manager-api.md` và các Business Rules đã chốt.  
> **Phiên bản tài liệu:** **2.5 – Reopened: Schedule Change / Deadline Impact / Manager Escalation**, tiếp nối v2.4; ngày 13/10/2026.  
> **Trạng thái:** **REOPENED – cập nhật thiết kế nghiệp vụ**, thay thế baseline Flow 1 v2.4 cho các thay đổi lịch; chưa tái khóa hoặc xác nhận endpoint đã implement. Các tài liệu Role/Shared/Use Case đồng bộ sau; adapter VNPay do nhóm phụ trách.  
> **Kiến trúc:** Flow 1 là bản đồ API end-to-end; không có prefix `/flow1/*`. Mỗi endpoint chỉ có một định nghĩa hành vi, được tham chiếu cùng `02-customer-api.md`, `04-manager-api.md`, `01-shared-api.md`, `00-conventions.md`.

## 1. Mục tiêu, phạm vi và luồng tổng thể

**Phạm vi demo:** chỉ `VN→VN` và `VN→JP`. Cặp tuyến `JP→VN`, `VN→TH` hoặc quốc gia khác không được đặt dịch vụ trong demo. **Hai entry points, một Wizard:** (A) Landing Page → trang Estimate công khai → khách chọn tiếp tục → Login/Register → Wizard có dữ liệu điền trước; (B) Customer Dashboard → Tạo yêu cầu thủ công → cùng Wizard. Không tạo hai loại Transport Request.

**Các bước FE:** `Estimate (chỉ cho entry Landing)` → `Trip Information` → `Pickup & Delivery` → `Horses & Horse Documents` → `Review & Submit`. Estimate không cần Customer accept; không tạo Request/Quote/Contract/Trip. Customer chưa xác thực không được tạo Horse hoặc Submit; chỉ giữ tạm origin, destination, date, horseCount, mode giữa lần chuyển tới Login, không lưu hồ sơ riêng tư/đơn DRAFT trên server.

```text
PUBLIC Landing → POST /public/estimates → xem Estimate tham khảo
      → "Tiếp tục" → Login/Register (nếu cần) → Wizard nhập dữ liệu hoàn chỉnh
CUSTOMER Dashboard → "Tạo yêu cầu" → Wizard nhập thủ công (có thể xem Estimate)
      ↓ (cùng Wizard, không upload hồ sơ chung Customer)
Trip/Pickup/Delivery + Horse Profiles/required PER_HORSE documents
      → Submit Request(PENDING)
      → Logistics Manager: ACCEPT / REQUEST_CHANGES / REJECT
      → ACCEPTED → Preliminary Plan → Backend Pricing Suggestion
      → Manager soạn Contract(DRAFT) với hạng mục giá, tổng tiền, tỷ lệ cọc, điều khoản
      → Manager gửi Contract(PENDING_SIGNATURE), một completionDeadline chung
      → Customer xem, ký OTP hoặc từ chối/yêu cầu điều chỉnh bằng lý do
      → SIGNED / Request(AWAITING_DEPOSIT) → FE chuyển trang thanh toán
      → VNPay đã xác minh bởi BE hoặc Bank Transfer đã đối soát bởi Manager
      → đủ cọc → Contract(EFFECTIVE), Request(ACTIVATED), Trip(PLANNING)
      → Manager confirm-deployment → Flow 2 và Flow 3
```

**QUY TRÌNH CHÍNH THỨC V2.2:** Bỏ hoàn toàn bước **Customer chấp nhận một Quotation chính thức riêng**. Manager đưa **giá chính thức ngay vào Draft Contract**. `GET /manager/requests/{requestId}/quote-suggestion` được giữ như tên endpoint nội bộ hiện có để lấy **gợi ý giá**, không phát hành Quote hoặc bắt Customer accept. `POST /manager/requests/{requestId}/quotes` và `POST /customer/quotes/{quoteId}/accept|reject|request-adjustment` **không nằm trong Flow 1 mới**. Thương lượng/không đồng ý nội dung giá được giải quyết bằng Contract `SIGN_DECLINED` + lý do và Contract Version mới trước ký. Không tự tạo vòng thương lượng tối đa.

**Hồ sơ Customer trước Submit:** ảnh và scan hộ chiếu của **từng ngựa** cùng basic fields định danh theo schema trong MVP; các yêu cầu pháp lý khác do Flow 2 kiểm tra theo tuyến. Customer không phải upload giấy tờ chung `PER_TRIP` hay giấy ủy quyền cho demo. Thông tin giao nhận gồm pickup contact và receiver. Nếu receiver nhận hộ (`isProxy=true`), **công ty gọi xác nhận và lưu kết quả** trong quy trình giao nhận; không yêu cầu chứng từ ủy quyền giả định. Các thủ tục/hồ sơ chung của Trip do công ty/Specialist chuẩn bị và hoàn thiện trong Flow 2; không bỏ qua yêu cầu hợp pháp do cơ quan có thẩm quyền áp dụng.

**Kết thúc Flow 1:** đủ cọc hợp lệ + đã ký → Contract `EFFECTIVE`, Request `ACTIVATED`, tạo đúng một Trip `PLANNING`. Manager xác nhận deployment mới bàn giao tác vụ chính thức Flow 2/3; không tự coi Trip sẵn sàng khởi hành. Thất bại hợp lệ: `REJECTED` hoặc `CANCELLED`. Không dùng GPS, không xử lý điều phối thực địa trong Flow 1.

## 2. Business Rules và bất biến Backend

| ID | Quy tắc |
|---|---|
| `F01-BR-01` | Demo chỉ `VN→VN`, `VN→JP`; BE kiểm tra cặp tuyến và mode theo cấu hình, không suy ra từ danh mục quốc gia. |
| `F01-BR-02` | Public Estimate không cần đăng nhập, chỉ là giá tham khảo, không có hành động ACCEPT và không sinh Request/Contract/Trip. |
| `F01-BR-03` | Landing và Dashboard đi vào **cùng một Wizard**; login chỉ sau khi khách từ Landing quyết định tiếp tục. Không có Request `DRAFT` trên server. |
| `F01-BR-04` | Trước Submit phải đủ trip info, pickup/delivery, pickup contact, receiver, Horse đã đăng ký, và hồ sơ Customer `PER_HORSE` bắt buộc theo tuyến. |
| `F01-BR-05` | **Không** bắt Customer tải hồ sơ chung `PER_TRIP` hay giấy ủy quyền trong demo; `PER_TRIP` công ty làm ở Flow 2. Người nhận hộ cần công ty gọi xác nhận, không tự coi đã xác minh. |
| `F01-BR-06` | Horse khác chủ không được dùng; Horse `ACTIVE`, không xung đột lịch, mỗi Horse có ảnh và scan passport theo checklist MVP; tài liệu `SUBMITTED` chưa Specialist duyệt vẫn được Submit nếu Customer đã nộp đủ. |
| `F01-BR-07` | Manager xử lý Request `PENDING` bằng `ACCEPT`, `REQUEST_CHANGES`, `REJECT`; `REJECTED` là trạng thái kết thúc, Revision hợp lệ trở lại `PENDING`. |
| `F01-BR-08` | `ACCEPTED` đi thẳng tới chuẩn bị **Draft Contract** với giá chính thức; **không có** bước Customer accept Quotation chính thức. |
| `F01-BR-09` | Backend Pricing tính Estimate và giá/chi phí đề xuất; Manager được chỉnh các hạng mục và giá bán trước khi gửi Contract; BE tính lại tổng. |
| `F01-BR-10` | Có giá sàn theo policy BE; nếu Contract price dưới sàn, Manager phải ghi `priceOverrideReason`, lưu audit; không thêm tầng duyệt thứ hai. |
| `F01-BR-11` | MVP cố định `depositPercent=40` trên mọi Contract Version mới; Manager không đổi tỷ lệ; Backend tính và làm tròn `depositAmount`. |
| `F01-BR-12` | Contract `DRAFT`/phiên bản mới giữ snapshot `requestVersion`, plan/pricing version, giá, cọc, điều khoản; bản đã gửi/ký không sửa đè. |
| `F01-BR-13` | Manager chọn một `completionDeadline` khi gửi Contract, dùng chung cho ký OTP và đặt cọc; không mặc định 7 ngày. |
| `F01-BR-14` | Sau OTP ký thành công BE lưu `SIGNED`, Request → `AWAITING_DEPOSIT`, FE mở trang thanh toán. Quay lại không ký lại nếu Contract vẫn hợp lệ. |
| `F01-BR-15` | Chỉ `VNPay` xác minh bởi BE hoặc `BANK_TRANSFER` được Manager đối soát tiền thực nhận; không hỗ trợ `CASH` trong Flow 1. |
| `F01-BR-16` | Hết hạn chung khóa tạo giao dịch/proof mới; Manager gia hạn để mở lại, Manager hủy thủ công sau đối soát; **không auto-cancel**. |
| `F01-BR-17` | Chỉ khi Contract `SIGNED` và cọc đã xác minh đủ mới atomic Contract `EFFECTIVE` + Request `ACTIVATED` + một Trip `PLANNING`. |
| `F01-BR-18` | Customer Change Request chưa được Manager duyệt không ghi đè Request; nếu làm đổi giá/nội dung Contract chưa ký, Manager phát hành Contract Version mới. |
| `F01-BR-19` | FE dùng `allowedActions`, BE kiểm tra quyền, ownership, status và version; file tư nhân tải bằng Bearer; SignalR chỉ kích hoạt refetch REST. |
| `F01-BR-20` | MVP có chuẩn bị sàn VN→VN <=500km: 2 ngày, >500km: 3 ngày; VN→JP: 7 ngày. Manager được tăng và lưu mức đã chốt trong kế hoạch. Send/gia hạn phải còn đủ thời gian này trước plannedDepartureAt; không hạ mức để lách kiểm tra hoặc tự dời lịch đã ký. |
| `F01-BR-21` | Khi ký/cọc trễ làm lịch dự kiến không khả thi, hệ thống gắn cảnh báo và giữ deployment chưa được xác nhận hoặc `ON_HOLD` (nếu đã triển khai); **không tự dời ngày, tự hủy Request hoặc tự sửa Contract đã ký**. Manager đề xuất lịch mới, Customer xác nhận; điều chỉnh kế hoạch/Contract theo tình trạng ký và cơ chế có thẩm quyền. |
| `F01-BR-22` | `hold-deployment` chỉ cho Trip chưa có milestone khởi hành; khi Trip `READY_TO_DEPART` bị hold, BE đánh giá lại và chuyển về `PLANNING`, giữ audit. Trip `IN_TRANSIT`/`COMPLETED` không được đưa về `PLANNING` bằng Flow 1; xử lý tình huống trên đường thuộc Flow 4/5. |
| `F01-BR-23` | Khi Flow 3 ghi nhận thay đổi lịch xuất phát, lịch bay hoặc ETA, Backend phải đối chiếu **hạn bàn giao theo Contract hiện hành**; nếu ETA dự kiến vượt hạn, tạo cảnh báo cho Logistics Manager ngay khi thay đổi được lưu, không chờ chuyến thực sự trễ. Không tự thay `deliveryDeadline` trong Contract đã ký. |
| `F01-BR-24` | Phân biệt `effectiveCompletionDeadline` **ký/cọc** với deadline **hồ sơ** (Flow 2) và deadline **giao hàng** (hợp đồng/kế hoạch Flow 3). Dời lịch vận chuyển không tự gia hạn hạn ký/cọc, hạn pháp lý hoặc hạn bàn giao đã cam kết. Hạn vận hành phụ thuộc có thể tính lại theo kế hoạch mới với nguồn quy tắc hợp lệ; sửa cam kết đã ký cần thỏa thuận Customer và quyết định có thẩm quyền. |
| `F01-BR-25` | Sau Contract `SIGNED/EFFECTIVE`, thay đổi ngày/horses/hạn giao ảnh hưởng thỏa thuận phải theo quy trình thay đổi có xác nhận Customer và Manager, bảo toàn phiên bản hợp đồng. Đây là **phụ thuộc nghiệp vụ cần đặc tả API riêng khi đồng bộ**; không giả định API Change Request trước ký (F01-C11) có thể tự sửa Contract đã ký. |
| `F01-BR-26` | Cảnh báo vượt hạn bàn giao không tự hủy Request, không tự rút `Documents READY` nếu không có hồ sơ bị ảnh hưởng và không tự đổi TripStatus. Khi mất điều kiện hồ sơ/điều phối trước khởi hành, Backend tổng hợp và đưa `READY_TO_DEPART → PLANNING`; nếu đã `IN_TRANSIT`, sử dụng Flow 4/5. |

**Policy MVP đã chốt:** VND, cọc 40%, chuẩn bị sàn 2/3/7 và bảng giá/làm tròn tại plan 2.0. **Ngoài các giá trị đã chốt, không tự thiết lập:** công thức Pricing, biểu giá, tiền tệ/FX, VAT, giá sàn tối thiểu cụ thể, tỷ lệ cọc mặc định/giới hạn, hạn cố định, grace period, phạt hủy, lịch nhắc, chính sách làm tròn và thời điểm cuộc gọi xác nhận người nhận hộ. Chúng thuộc cấu hình hoặc quy trình được đội phụ trách duyệt riêng. Ví dụ giá chỉ là dữ liệu minh họa, không phải quy định.

## 3. State machine và permission

### 3.1. Request, Contract, Trip

```text
Request PENDING --Manager request-changes--> CHANGES_REQUESTED
CHANGES_REQUESTED --Customer revision--> PENDING
PENDING --Manager reject--> REJECTED  [terminal]
PENDING --Manager accept--> ACCEPTED
ACCEPTED --Manager create Contract DRAFT--> ACCEPTED  [Contract DRAFT riêng]
ACCEPTED --Manager send Contract--> AWAITING_CONTRACT
AWAITING_CONTRACT --Customer ký OTP--> AWAITING_DEPOSIT
AWAITING_DEPOSIT --Cọc verified đủ--> ACTIVATED + Contract EFFECTIVE + Trip PLANNING
Hủy hợp lệ theo giai đoạn --> CANCELLED  [không auto]
ACTIVATED --đóng đơn khi hoàn thành các Flow khác--> CLOSED
```

**RequestStatus vẫn dùng enum hiện có** trong `00-conventions.md`: `PENDING`, `CHANGES_REQUESTED`, `ACCEPTED`, `QUOTING`, `AWAITING_CONTRACT`, `AWAITING_DEPOSIT`, `ACTIVATED`, `CLOSED`, `REJECTED`, `CANCELLED`. `QUOTING` được **giữ để tương thích dữ liệu lịch sử**, nhưng **Flow 1 v2.4 không sinh mới** trạng thái này và không có Quote acceptance. Không thêm `ESTIMATED`, `DRAFT`, `EXPIRED` hay `OVERDUE` vào `RequestStatus`.

ContractStatus giữ `DRAFT`, `PENDING_SIGNATURE`, `SIGNED`, `EFFECTIVE`, `SIGN_DECLINED`, `SUPERSEDED`, `EXPIRED`, `TERMINATED`. Không biến Contract `SIGNED` thành `EFFECTIVE` trước khi nhận đủ cọc. TripStatus độc lập và ban đầu chỉ `PLANNING`.

`completionDeadline` và `effectiveCompletionDeadline`: hạn chung cho ký và cọc, sau gia hạn bởi Manager có thể có hạn hiệu lực mới; cờ `isCompletionOverdue`/`paymentLocked` là giá trị dẫn xuất. Đã ký + chưa cọc + hết hạn thì chữ ký còn nguyên, payment locked, Request vẫn `AWAITING_DEPOSIT`.

**Thương lượng điều khoản/giá:** Customer từ chối Contract trước khi ký với `reason`, BE lưu `SIGN_DECLINED`. Manager tạo Contract Version mới từ snapshot Request hiện hành, có thể sửa giá/điều khoản rồi gửi, giữ cọc 40%. Không tạo Quote acceptance, không tự hủy Request vì hợp đồng bị từ chối. Nếu Customer đã ký, mọi thay đổi thuộc chính sách xử lý hợp đồng/hủy có thẩm quyền, không sửa âm thầm.

### 3.2. `allowedActions` từ Backend

| Role + điều kiện | Actions (ví dụ theo thực tế) |
|---|---|
| Public chưa đăng nhập | `CALCULATE_ESTIMATE`, `CONTINUE_TO_LOGIN` (chỉ UI; không có quyền Request) |
| Customer `CHANGES_REQUESTED` | `SUBMIT_REVISION`, `VIEW`, `CANCEL` |
| Customer `AWAITING_CONTRACT`, contract `PENDING_SIGNATURE`, còn hạn | `REQUEST_OTP`, `SIGN`, `DECLINE` |
| Customer `AWAITING_DEPOSIT`, signed và còn hạn | `PAY_DEPOSIT`, `VIEW_PAYMENTS` |
| Customer `AWAITING_DEPOSIT`, đã quá hạn | `VIEW_PAYMENTS`; **không** `PAY_DEPOSIT` |
| Manager `PENDING` | `ACCEPT`, `REQUEST_REVISION`, `REJECT` |
| Manager `ACCEPTED` | `EDIT_PRELIMINARY_PLAN`, `VIEW_QUOTE_SUGGESTION`, `CREATE_CONTRACT_DRAFT` |
| Manager Contract `DRAFT` | `EDIT_CONTRACT`, `SEND_CONTRACT` |
| Manager Request quá hạn chưa kích hoạt | `EXTEND_COMPLETION_DEADLINE`, `REVIEW_BANK_TRANSFER`, `CANCEL_OVERDUE` nếu đủ guard |

Các `allowedActions` của Contract/Request là **dữ liệu trả từ BE**, không dựa vào việc FE tự tính state. Phiên bản cũ đã `SUPERSEDED`, đã ký hoặc không thuộc khách không được thao tác.

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


## 5. Public Estimate Page & Pricing API

**Trang riêng:** `/estimate` (tên route FE tham khảo); Landing Page nhập origin/destination/date/horseCount để mở trang này và xem giá dự toán. **Không yêu cầu login để tính giá**, chỉ yêu cầu login khi nhấn "Tiếp tục đặt chuyến". Dashboard có thể mở Wizard trực tiếp, nếu muốn xem dự toán dùng cùng PricingService/API.

### F01-P01. `GET /public/estimates/transport-modes`

**Auth:** Public. **Query:** `originCountry`, `destinationCountry` (bắt buộc); BE giới hạn `VN→VN`, `VN→JP`, trả mode thật từ cấu hình. **200:**
```json
{"success":true,"message":"OK","data":{"originCountry":"VN","destinationCountry":"JP","modes":["AIR"]}}
```
`modes` chỉ là ví dụ, không hardcode mode dựa trên quốc gia. **Errors:** `400 VALIDATION_ERROR`, `400 UNSUPPORTED_ROUTE`.

### F01-P02. `POST /public/estimates`

**Auth:** Public. **Request:**
```json
{
  "originCountry":"VN", "originCity":"Ho Chi Minh City",
  "destinationCountry":"JP", "destinationCity":"Tokyo",
  "desiredDepartureDate":"2026-11-20", "horseCount":2,
  "preferredTransportMode":"AIR"
}
```
`preferredTransportMode` chọn theo mode BE đã trả; nếu UI chỉ thu bốn yếu tố đầu thì FE có thể gọi mode options để yêu cầu khách chọn mode trước khi tính giá, **không tự giả định mode**. `horseCount` integer ≥1; ngày ISO `YYYY-MM-DD` và đúng điều kiện lịch cấu hình. **200:**
```json
{
  "success":true,"message":"Estimate calculated",
  "data":{
    "currency":"VND","estimateAmount":150000000,
    "lines":[
      {"code":"TRANSPORT","label":"Vận chuyển dự kiến","amount":120000000,"mandatory":true},
      {"code":"PROCEDURES","label":"Hồ sơ và thủ tục dự kiến","amount":15000000,"mandatory":true},
      {"code":"VETERINARY_CARE","label":"Chăm sóc thú y","amount":10000000,"mandatory":true},
      {"code":"MANDATORY_INSURANCE","label":"Bảo hiểm bắt buộc","amount":5000000,"mandatory":true}
    ],
    "calculatedAt":"2026-10-13T04:00:00Z",
    "disclaimer":"Giá tham khảo, không phải Quotation chính thức hoặc đề nghị ký hợp đồng"
  }
}
```
**Không** trả `depositPercent`/`depositAmount` ở bước Public Estimate; cọc cố định 40% khi lập Contract, không phải nghĩa vụ phải trả ở bước Estimate. Không có `estimateAccepted`, `quoteId`, `contractId`, `tripId`. Không persist Customer profile từ yêu cầu Public. Không cho FE gửi `estimateAmount` làm dữ liệu giá Contract. `404 PRICE_TABLE_NOT_FOUND` nếu thiếu bảng giá, không tự hiện giá giả; `400` nếu sai route/mode/date/count; rate limiting/bảo vệ endpoint public theo cấu hình an ninh, không tự đặt ngưỡng.

### F01-C01. `GET /customer/estimates/transport-modes` (đã đăng nhập)

**Auth:** `CUSTOMER`. Cùng query/response/validation của F01-P01. **BE dùng chung một PricingService**, không có hai công thức.

### F01-C02. `POST /customer/estimates` (đã đăng nhập)

**Auth:** `CUSTOMER`. Body và response **giống hệt F01-P02**; tiện dùng trong Customer Dashboard/Wizard, không tạo Request/Contract/Trip. `estimateAmount = Σ lines[].amount` theo chính sách Pricing đã triển khai. Backend tính toán bằng decimal-safe và không tin giá từ FE. Bảo hiểm/chăm sóc thú y bắt buộc theo các chính sách hiện có; không để Customer bỏ loại hình này.

### F01-C03. `POST /customer/estimates/pdf`

**Auth:** `CUSTOMER`, body giống F01-C02; trả PDF binary đánh dấu **"Dự toán tham khảo"**, không có status ACCEPT, không lưu Quote/Contract. Trang Public không bắt buộc có download PDF cho khách chưa login; không tự tạo public PDF endpoint mới khi chưa cần.

### F01-C04. `GET /customer/requests/form-options`

**Auth:** `CUSTOMER`. Trả `supportedRoutes` chỉ `[VN→VN,VN→JP]`, `supportedTransportModes`/mode-options theo cấu hình, `minLeadDays`, `earliestDepartureDate`, `maxHorsesPerRequest` nếu có cấu hình. Không coi các số ví dụ trong docs là giá trị cố định. FE prefill từ dữ liệu Estimate trước login; BE **validate lại** khi Submit. Không tạo server DRAFT.

### 5.1. Quy trình Login/Persist prefill (không phải endpoint mới)

- Landing Page và trang Estimate dùng **dữ liệu không nhạy cảm** (`origin*`, `destination*`, `desiredDepartureDate`, `horseCount`, `preferredTransportMode`) để khôi phục qua điều hướng đến Login/Register; không đưa ngựa, hộ chiếu, giấy tờ, OTP hay accessToken vào query string.
- Sau Login/Register thành công, FE đến cùng Wizard; `horseCount` chỉ dùng gợi ý số ngựa cần chọn, BE Submit vẫn dựa trên `horseIds[]` thực tế.
- Dashboard đi vào cùng Wizard ở trạng thái nhập thủ công; không cần gọi API "accept estimate". Nếu dữ liệu đầu vào thay đổi, FE phải gọi lại Estimate để cập nhật giá tham khảo.

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

### F01-C05E. `GET /customer/requests/document-requirements` – Checklist theo tuyến

**Query:** `originCountry`, `destinationCountry`, `horseIds` (csv) và `preferredTransportMode` nếu đã chọn. **Auth:** `CUSTOMER`. Cùng nguồn checklist với Flow 2; áp đúng tuyến `VN→VN` hoặc `VN→JP`.

**200 data:**
```json
{
 "originCountry":"VN", "destinationCountry":"JP", "checklistVersion":"cfg-v1",
 "requirements":[
  {"documentTypeCode":"EQUINE_PASSPORT","scope":"PER_HORSE","horseId":31,"responsibleParty":"CUSTOMER","requiredAt":"REQUEST_SUBMISSION","isMandatory":true,"isUploaded":true,"documentStatus":"SUBMITTED"},
  {"documentTypeCode":"OWNERSHIP_EVIDENCE","scope":"PER_HORSE","horseId":31,"responsibleParty":"CUSTOMER","requiredAt":"REQUEST_SUBMISSION","isMandatory":true,"isUploaded":true,"documentStatus":"SUBMITTED"},
  {"documentTypeCode":"COMPANY_TRIP_PROCEDURE","scope":"PER_TRIP","horseId":null,"responsibleParty":"COMPANY","requiredAt":"BEFORE_DEPARTURE","isMandatory":true,"isUploaded":false,"documentStatus":null}
 ]
}
```
`documentTypeCode` là **mã ví dụ**, phải map tới DocumentType/catalog thật, không suy diễn nghĩa vụ pháp lý từ mã ví dụ. **Bắt buộc trước Submit**: chỉ các requirement `responsibleParty=CUSTOMER`, `scope=PER_HORSE`, `requiredAt=REQUEST_SUBMISSION` cho từng Horse đã chọn. Dữ liệu Horse Identity/Owner, ảnh và passport scan từ `POST /customer/horses`; chứng cứ sở hữu/giấy tờ y tế cơ bản từ `POST /customer/horses/{horseId}/documents`. Nếu hồ sơ đã nộp, không upload lại. `DocumentStatus=SUBMITTED` chờ Specialist review **không chặn Submit**. Thiếu tài liệu bắt buộc trả `400 REQUIRED_CUSTOMER_DOCUMENT_MISSING` với `errors[].field` ứng với Horse/document.

**KHÔNG áp Customer `PER_TRIP` trong Wizard demo:** Không có phần upload giấy ủy quyền hoặc hồ sơ chung Customer; nếu có chứng từ hành chính/chuyến đi cần thiết do COMPANY thực hiện, Specialist xử lý trong Flow 2. Bảo đảm pháp lý thực tế do đội Specialist đối chiếu quy định tuyến/cơ quan; đây là giới hạn trách nhiệm cung cấp thông tin trong sản phẩm demo, không phải khẳng định tuyến VN→JP về pháp lý luôn không yêu cầu bất kỳ chứng từ bổ sung nào.

### F01-C05F. Thông tin người nhận hộ và ranh giới tài liệu

- `pickupContact` và `receiver` là **thông tin liên hệ bắt buộc**, không phải tài liệu upload. `receiver.isProxy` cho biết người nhận hộ.
- Nếu `receiver.isProxy=true`, công ty **phải gọi xác nhận và ghi nhận kết quả** ở nghiệp vụ giao nhận; không đặt bắt buộc `authorizationDocumentId` hoặc upload giấy ủy quyền. Ở Submit chỉ lưu người nhận hộ cần được xác minh, **không** coi đã gọi xác nhận.
- Không đặt deadline cuộc gọi, cơ chế ủy quyền pháp lý thay thế hay role mới khi chưa được thống nhất. Flow 4/handover sẽ dùng thông tin đã ghi nhận để kiểm tra việc xác nhận người nhận hộ theo quy trình được triển khai.

## 7. Customer – Submit Transport Request và truy vấn đơn

### F01-C06. `POST /customer/requests`

**Auth:** `CUSTOMER`, `application/json`. Chỉ gọi ở Review & Submit, không có Request DRAFT trước đó; không cần gửi `estimateAmount`, `quoteId` hoặc bất kỳ giá tiền FE nào.

```json
{
  "originCountry":"VN","originCity":"Ho Chi Minh City",
  "destinationCountry":"JP","destinationCity":"Tokyo",
  "pickupAddress":"Địa chỉ lấy ngựa tại Việt Nam",
  "deliveryAddress":"Địa chỉ giao ngựa tại Nhật Bản",
  "pickupContact":{"fullName":"Nguyen Van A","phone":"+84901234567"},
  "receiver":{"fullName":"Yuki Tanaka","phone":"+81312345678","isProxy":true},
  "desiredDepartureDate":"2026-11-20","deliveryDeadline":"2026-11-25",
  "preferredTransportMode":"AIR","horseIds":[31,32],
  "specialRequirements":"Không dùng cỏ linh lăng"
}
```

**Validation:** cặp tuyến/mode hợp lệ, pickup/delivery và contact đủ, receiver đủ, `isProxy` boolean; ngày theo cấu hình; `horseIds[]` không rỗng/không trùng, Horse thuộc Customer và `ACTIVE`, không conflict; mỗi Horse có hồ sơ `CUSTOMER`/`PER_HORSE` bắt buộc tại Submit theo checklist tuyến. Không bắt hồ sơ chung PER_TRIP, không bắt giấy ủy quyền, không chặn vì chứng từ COMPANY chưa có hay Specialist chưa duyệt tài liệu đã `SUBMITTED`. Nếu `isProxy=true`, đánh dấu cần gọi xác nhận sau, **không tự đánh dấu đã xác minh**. `horseIds.length` phải khớp lựa chọn thực tế, không tự tin `horseCount` từ Estimate. `specialRequirements` tùy chọn.

**201 Created:**
```json
{
  "success":true,"message":"Transport request created",
  "data":{"requestId":15,"requestCode":"REQ-20261013-0001","status":"PENDING","requestVersion":1,"documentWarnings":[{"horseId":32,"message":"Tài liệu đã nộp, đang chờ Specialist thẩm định"}],"createdAt":"2026-10-13T03:00:00Z","allowedActions":["VIEW","CANCEL","REQUEST_CHANGE"]}
}
```

**Errors:** `400 VALIDATION_ERROR`, `400 UNSUPPORTED_ROUTE`, `400 TRANSPORT_MODE_UNAVAILABLE`, `400 REQUIRED_CUSTOMER_DOCUMENT_MISSING`, `400 DEPARTURE_TOO_SOON`, `409 HORSE_SCHEDULE_CONFLICT`, `409 NO_HORSE_REGISTERED`; `errors[].field` cho trường thiếu/không hợp lệ. `404 NOT_FOUND` khi horse không thuộc Customer.

**Side effects:** snapshot dữ liệu Horse/Request/checklistVersion, audit, thông báo Manager sau commit. Một Request thuộc một Customer, chưa sinh Contract hoặc Trip. Không tự tạo hồ sơ chung Customer dạng multipart.

### F01-C07. `GET /customer/requests` và `GET /customer/requests/{requestId}`

Danh sách phân trang `status`, `q`, `from`, `to`, `page`, `pageSize` và envelope theo conventions. **Chi tiết data**:
```json
{
 "requestId":15,"requestCode":"REQ-20261013-0001","status":"PENDING","requestVersion":1,
 "originCountry":"VN","originCity":"Ho Chi Minh City","destinationCountry":"JP","destinationCity":"Tokyo",
 "pickupAddress":"Địa chỉ lấy ngựa tại Việt Nam","deliveryAddress":"Địa chỉ giao ngựa tại Nhật Bản",
 "pickupContact":{"fullName":"Nguyen Van A","phone":"+84901234567"},
 "receiver":{"fullName":"Yuki Tanaka","phone":"+81312345678","isProxy":true},
 "receiverVerification":{"required":true,"confirmed":false},
 "desiredDepartureDate":"2026-11-20","deliveryDeadline":"2026-11-25","preferredTransportMode":"AIR",
 "horseIds":[31,32],"contract":null,"payment":{"paymentStatus":"UNPAID","paidAmount":0},"trip":null,
 "pendingChangeRequest":null,"revisionRequests":[],"statusHistory":[{"status":"PENDING","at":"2026-10-13T03:00:00Z"}],
 "allowedActions":["VIEW","CANCEL","REQUEST_CHANGE"]
}
```
`receiverVerification` chỉ phản ánh trạng thái xác nhận nội bộ theo nghiệp vụ giao nhận; Flow 1 không tự định nghĩa endpoint xác nhận cuộc gọi hay gán quyền xác nhận cho role chưa chốt. `contract` nếu tồn tại là `{contractId,version,status,totalAmount,depositAmount,completionDeadline}` và không có `currentQuote` ở Request mới. Ownership lấy từ token; khách khác → `404 NOT_FOUND`. FE refresh theo `RequestUpdated`.

## 8. Manager – Xét duyệt, yêu cầu sửa và Customer Revision

### F01-M01. `GET /manager/requests` & `GET /manager/requests/{requestId}`


Manager xem các Request `PENDING`, `CHANGES_REQUESTED`, `ACCEPTED`...; query `status`, `overdue`, `q`, `originCountry`, `destinationCountry`, `page`, `pageSize`. Chi tiết trả Request và **support data** để quyết định: tóm tắt ngựa/hồ sơ, năng lực dự kiến, estimate, `allowedActions`, lịch sử. Manager không được giả định rằng thiếu hồ sơ y tế là thiếu dữ liệu bắt buộc để tạo Request.

### F01-M02. `POST /manager/requests/{requestId}/accept`


**Body:** `{ "note": "Tuyến khả thi, chuẩn bị lập Draft Contract" }` (note có thể để trống).  
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
  "pickupContact": { "fullName": "Nguyen Van A", "phone": "+84901234567" },
  "receiver": { "fullName": "Yuki Tanaka", "phone": "+81312345678", "isProxy": true },
  "desiredDepartureDate": "2026-11-03",
  "deliveryDeadline": "2026-11-07",
  "preferredTransportMode": "AIR",
  "horseIds": [31, 32],
  "specialRequirements": "",
  "revisionNote": "Đã điều chỉnh theo yêu cầu Manager"
}
```

**200 data:** `{ "requestId": 15, "status": "PENDING", "revisionVersion": 2 }`. `PUT` dùng JSON hoàn chỉnh như Submit; hồ sơ **PER_HORSE** mới hoặc cần thay thế được Customer cập nhật qua API Horse/Document trước khi resubmit. Không thêm file Customer `PER_TRIP` hoặc giấy ủy quyền vào Revision. BE validate như khi tạo mới, lưu snapshot cũ, đóng revision request. Manager xét duyệt lại. `409 REQUEST_REVISION_NOT_ALLOWED` nếu không ở `CHANGES_REQUESTED`.

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


Customer chủ động đề xuất thay đổi quan trọng **trước ký** (khi Request ở các trạng thái đang được phép thay đổi, như `ACCEPTED`/`AWAITING_CONTRACT`; `QUOTING` chỉ là dữ liệu legacy, không được sinh mới).

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
**Rule:** không cho ký Contract khi còn `PENDING_APPROVAL`; Manager phải xử lý; sau duyệt BE tạo phiên bản/snapshot Request mới và vô hiệu hóa Contract chưa ký bị ảnh hưởng.  
**Error:** `409 REQUEST_CHANGE_NOT_ALLOWED`, `409 CHANGE_REQUEST_ALREADY_PENDING`.

### F01-C12. `GET /customer/requests/{requestId}/change-requests` & F01-M07. `GET /manager/requests/{requestId}/change-requests`


Trả `{ changeRequestId, requestId, status, reason, proposedChanges, managerNote, reviewedAt, createdAt }`, mới nhất trước; Customer chỉ xem của mình; Manager theo quyền tác nghiệp.

### F01-M08. `POST /manager/requests/{requestId}/change-requests/{changeRequestId}/approve` **[BỔ SUNG]**


```json
{ "note": "Chấp thuận đổi lịch, cần lập Contract Version phù hợp" }
```

**200 data:** `{ "changeRequestId": 51, "status": "APPROVED", "requestVersion": 3, "contractRevisionRequired": true }`.  
**BE bắt buộc:** validate lại ngựa/lịch/mode và các điều kiện theo bản đề xuất; apply atomic; giữ lịch sử; chặn double approval, chuyển Contract chưa ký gắn Request version cũ sang bản không còn thao tác (`SUPERSEDED` nếu phù hợp), giữ lịch sử; Request quay lại `ACCEPTED` để Manager lập Contract version phù hợp; phát thông báo Customer.  
**Errors:** `409 INVALID_STATE`, `409 CHANGE_REQUEST_ALREADY_REVIEWED`, `409 HORSE_SCHEDULE_CONFLICT`.

### F01-M09. `POST /manager/requests/{requestId}/change-requests/{changeRequestId}/reject` **[BỔ SUNG]**


```json
{ "reason": "Không đủ năng lực vận chuyển vào ngày đề nghị" }
```

**200 data:** `{ "changeRequestId": 51, "status": "REJECTED", "requestVersionUnchanged": true }`. Request và Contract hiện có không đổi; phải revalidate hiệu lực nếu Customer muốn thao tác tiếp. `400 VALIDATION_ERROR` khi thiếu lý do.


## 10. Hybrid Pricing & Manager tạo Draft Contract (không có Quote acceptance)

### F01-M11. `GET /manager/requests/{requestId}/preliminary-plan` và `PUT /manager/requests/{requestId}/preliminary-plan`

**Auth:** `LOGISTICS_MANAGER`; Request phải `ACCEPTED`, không có Change Request quan trọng đang chờ. Là kế hoạch sơ bộ để báo giá trong Contract, **không thay thế** Route Plan/Resource Assignment của Coordinator ở Flow 3.

**PUT Request (ví dụ):**
```json
{
 "requestVersion":3,"transportMode":"AIR","transitCountries":[],"plannedCheckpointIds":[],
 "plannedDepartureAt":"2026-11-20T01:00:00Z","plannedArrivalAt":"2026-11-21T09:00:00Z",
 "stallsRequired":2,"keyMilestones":[],"currency":"VND",
 "budgetItems":[{"category":"AIR_FREIGHT","amount":70000000},{"category":"PROCEDURE","amount":15000000},{"category":"VET","amount":10000000},{"category":"INSURANCE","amount":5000000}]
}
```
**200:**
```json
{"success":true,"message":"Preliminary plan saved","data":{"planId":30,"planVersion":2,"requestVersion":3,"totalBudget":100000000,"deadlineCheck":{"meetsDeadline":true,"earliestFeasibleArrival":"2026-11-21T09:00:00Z"}}}
```
`GET` trả snapshot hoặc `data:null`; Manager nhìn thấy chi phí nội bộ, Customer không. Validate route, mode, budget vet/insurance, requestVersion; cảnh báo hạn giao mà không tự đổi deadline. Errors `400 VALIDATION_ERROR`, `409 INVALID_STATE`, `409 REQUEST_CHANGE_PENDING`, `409 REQUEST_STATE_CHANGED`.

### F01-M12. `GET /manager/requests/{requestId}/quote-suggestion` – tên endpoint kế thừa, **chỉ** là Pricing Suggestion

**Auth:** Manager; không tạo Quotation, không tạo hợp đồng hoặc công nợ. `GET` chỉ dùng cho việc điền Draft Contract. BE dùng PricingService đã có, không thay công thức.

**200 Response:**
```json
{
 "success":true,"message":"OK","data":{
 "requestId":15,"requestVersion":3,"preliminaryPlanId":30,"preliminaryPlanVersion":2,
 "currency":"VND","estimatedCost":100000000,"suggestedTotal":140000000,"floorPrice":110000000,
 "suggestedItems":[
  {"category":"TRANSPORT","description":"Vận chuyển","quantity":1,"unitPrice":110000000,"amount":110000000},
  {"category":"PROCEDURE","description":"Hồ sơ và thủ tục","quantity":1,"unitPrice":15000000,"amount":15000000},
  {"category":"VETERINARY_CARE","description":"Bác sĩ thú y","quantity":1,"unitPrice":10000000,"amount":10000000},
  {"category":"INSURANCE","description":"Bảo hiểm","quantity":1,"unitPrice":5000000,"amount":5000000}
 ],"pricingVersion":"backend-config-version","calculatedAt":"2026-10-13T04:00:00Z"}}
```
Không hiển thị `floorPrice`, `estimatedCost`, margin, budget cho Customer. Errors `404 PRICE_TABLE_NOT_FOUND`, `409 PRELIMINARY_PLAN_REQUIRED`, `409 INVALID_STATE`, `409 REQUEST_CHANGE_PENDING`.

### F01-M13. `POST /manager/requests/{requestId}/contracts` – Tạo Draft Contract trực tiếp

**ĐÂY LÀ ENDPOINT CHÍNH MỚI THAY CHO `POST .../quotes`**. Auth Manager. Request phải `ACCEPTED`, plan hợp lệ; không có pending Change Request. Backend tạo Contract version 1 `DRAFT` gắn `requestVersion`, `preliminaryPlanVersion`, `pricingVersion` và snapshot các điều khoản + giá **không có `quoteId` hoặc bước Customer accept Quote**.

**Request:**
```json
{
 "requestVersion":3,"preliminaryPlanId":30,"preliminaryPlanVersion":2,"currency":"VND",
 "items":[
  {"category":"TRANSPORT","description":"Dịch vụ vận chuyển","quantity":1,"unitPrice":85000000},
  {"category":"PROCEDURE","description":"Thủ tục","quantity":1,"unitPrice":15000000},
  {"category":"VETERINARY_CARE","description":"Chăm sóc thú y","quantity":1,"unitPrice":10000000},
  {"category":"INSURANCE","description":"Bảo hiểm bắt buộc","quantity":1,"unitPrice":5000000}
 ],"depositPercent":40,"priceOverrideReason":"Giảm giá theo thỏa thuận",
 "included":["Chăm sóc theo phạm vi hợp đồng"],"excluded":[],"possibleExtraCosts":[],
 "customTerms":"Điều khoản hợp đồng theo thỏa thuận"
}
```
**201 Created:**
```json
{
 "success":true,"message":"Draft contract created","data":{
 "contractId":40,"requestId":15,"version":1,"status":"DRAFT","requestStatus":"ACCEPTED",
 "currency":"VND","totalAmount":115000000,"depositPercent":40,"depositAmount":46000000,
 "suggestedTotal":140000000,"floorPrice":110000000,"isBelowFloor":false,
 "priceOverrideReason":"Giảm giá theo thỏa thuận","allowedActions":["EDIT_CONTRACT","SEND_CONTRACT"]
 }}
```
**Lưu ý ví dụ:** response minh họa tổng 115 triệu cao hơn giá sàn 110 triệu, nên `priceOverrideReason` thực tế không bắt buộc; nếu giá *thấp hơn* sàn thì bắt buộc có lý do. BE luôn tính `item.amount = quantity * unitPrice`, `totalAmount = Σ item.amount`, `depositAmount` theo `depositPercent` và chính sách tiền tệ của nhóm. FE không được gửi/tin tổng giá, giá sàn hoặc depositAmount. Bảo hiểm/vet bắt buộc theo plan, không được bị xóa. Giá sàn có Manager override với reason lưu audit; **không thêm người phê duyệt khác**. Không tự mặc định tỷ lệ 30%, ngày hiệu lực, bảng giá hay quy tắc thuế. Errors `400 VALIDATION_ERROR`, `400 PRICE_OVERRIDE_REASON_REQUIRED`, `409 PRELIMINARY_PLAN_REQUIRED`, `409 REQUEST_CHANGE_PENDING`, `409 REQUEST_STATE_CHANGED`.

### F01-M14. `GET /manager/requests/{requestId}/contract` – xem Draft/hợp đồng hiện hành

**Auth:** Manager; GET trả phiên bản hiện hành và `history` version; nếu chưa có `data:null`. Nội dung Contract hiện hành bao gồm `items`, `totalAmount`, `depositPercent`, `depositAmount`, `included`, `excluded`, `possibleExtraCosts`, `customTerms`, `status`, `requestVersion`, `planVersion`, `pricingVersion`, `pdfFile`, deadline (sau khi gửi), audit; thông tin giá vốn/giá sàn chỉ trả Manager. Customer chỉ xem giá bán và điều khoản dành cho Customer.

### 10.1. No independent Quotation acceptance

**Không có bước công khai `POST /customer/quotes/{quoteId}/accept` hoặc gửi báo giá thương mại riêng trước khi lập Contract.** Những API Quote versioned cũ đã được đánh dấu **deprecated/not used in new Flow 1**. Nếu Backend vẫn còn module Quote, không được dùng trạng thái `Quote.ACCEPTED` làm precondition của Contract mới. Lịch sử Quote từ dữ liệu cũ được giữ read-only nếu có, không tạo hợp đồng mới từ hành động chấp nhận Quote.

## 11. Contract Version, thương lượng nội dung, OTP và deadline chung

### 11.1. Contract object (giá chính thức nằm ngay trong Contract)

`GET /customer/requests/{requestId}/contract` và `GET /manager/requests/{requestId}/contract`: `data:null` nếu chưa có Contract. **Customer chỉ xem bản đã phát hành, không xem bản DRAFT chưa gửi.** Ví dụ sau khi Manager gửi:
```json
{
 "success":true,"message":"OK","data":{
 "contractId":40,"requestId":15,"requestVersion":3,"version":1,"status":"PENDING_SIGNATURE",
 "currency":"VND","items":[{"category":"TRANSPORT","description":"Dịch vụ vận chuyển","quantity":1,"unitPrice":85000000,"amount":85000000},{"category":"PROCEDURE","description":"Hồ sơ và thủ tục","quantity":1,"unitPrice":15000000,"amount":15000000},{"category":"VETERINARY_CARE","description":"Chăm sóc thú y","quantity":1,"unitPrice":10000000,"amount":10000000},{"category":"INSURANCE","description":"Bảo hiểm","quantity":1,"unitPrice":5000000,"amount":5000000}],
 "totalAmount":115000000,"depositPercent":40,"depositAmount":46000000,
 "included":["Chăm sóc theo phạm vi hợp đồng"],"excluded":[],"possibleExtraCosts":[],
 "customTerms":"Điều khoản hợp đồng theo thỏa thuận",
 "completionDeadline":"2026-11-15T16:59:59Z","effectiveCompletionDeadline":"2026-11-15T16:59:59Z",
 "pdfFile":{"fileId":700,"url":"/api/files/700"},"signedAt":null,"effectiveAt":null,
 "payment":{"paymentStatus":"UNPAID","paidAmount":0,"depositPaidAmount":0,"paymentLocked":true},
 "allowedActions":["REQUEST_OTP","SIGN","DECLINE"]
 }}
```
`Contract.status=SIGNED` là đã ký nhưng chưa có hiệu lực triển khai; không được sửa văn bản/giá sau ký. Mọi thay đổi điều khoản trước ký tạo Contract Version tiếp theo, giữ lịch sử bất biến. Không có `quoteId`, `quoteVersion` ở Contract mới.

### F01-M15. `PUT /manager/contracts/{contractId}` – sửa giá/điều khoản trong DRAFT

**Auth:** Manager; chỉ `DRAFT` chưa gửi. Body cho phép `items[]`, `depositPercent` (nếu gửi phải là 40), `included[]`, `excluded[]`, `possibleExtraCosts[]`, `customTerms`, `priceOverrideReason`, `requestVersion`, `preliminaryPlanVersion` (theo snapshot hợp lệ). Không cho FE sửa `totalAmount`, `depositAmount` hoặc `floorPrice` như nguồn xác thực. BE tính lại giá và tiền cọc theo tỷ lệ cố định 40%, kiểm tra điều kiện giá sàn và lý do ngoại lệ, lập bản PDF khi phát hành. **200:** trả Contract DRAFT hiện hành có tổng/cọc được BE tính; `409 CONTRACT_NOT_EDITABLE`, `409 REQUEST_STATE_CHANGED` nếu stale.

### F01-M16. `POST /manager/contracts/{contractId}/send`

**Auth:** Manager; chỉ bản `DRAFT` mới nhất, `requestVersion` khớp. **Body:**
```json
{"completionDeadline":"2026-11-15T16:59:59Z","note":"Mời Customer ký hợp đồng và hoàn tất cọc"}
```
`completionDeadline` do Manager chọn, phải lớn hơn serverNow; chung cả OTP ký và thanh toán cọc; không tồn tại `signDeadline` và `depositDueDate` độc lập. **BE phải xác minh lịch còn khả thi**: deadline hoàn tất cộng thời gian chuẩn bị cần thiết theo kế hoạch/nguồn lực được xác nhận phải không vượt `plannedDepartureAt`. Nếu không có đủ dữ liệu chuẩn bị, không khẳng định lịch khả thi; yêu cầu Manager rà lại dự kiến khởi hành trước khi gửi Contract. Khi lịch không khả thi trả `409 DEPARTURE_SCHEDULE_NOT_FEASIBLE` với chi tiết nguyên nhân; không tự chọn ngày khác. Không mặc định bất kỳ số ngày đệm cố định nào. BE khóa snapshot/PDF/hash giá/điều khoản/managerId/deadline/version, trả **200**:
```json
{"success":true,"message":"Contract sent","data":{"contractId":40,"status":"PENDING_SIGNATURE","version":1,"requestStatus":"AWAITING_CONTRACT","completionDeadline":"2026-11-15T16:59:59Z"}}
```
Gửi notification/SignalR sau commit. Không cần yêu cầu `Quote.ACCEPTED`; không mặc định 7 ngày. Errors `400 VALIDATION_ERROR`, `409 CONTRACT_NOT_EDITABLE`, `409 REQUEST_CHANGE_PENDING`, `409 CONTRACT_NOT_LATEST`.

### F01-M17. `POST /manager/requests/{requestId}/contract-versions`

**Auth:** Manager; body `{"sourceContractId":40,"reason":"Điều chỉnh giá hoặc điều khoản theo phản hồi khách"}`. BE tạo `Contract DRAFT` phiên bản mới trên cùng Request, sao chép dữ liệu nguồn hợp lệ để Manager sửa trước khi gửi; bản cũ `SIGN_DECLINED`, `EXPIRED` hoặc được thay thế đúng quy trình, bản cũ chỉ đọc. Không sửa đè Contract đã ký. **201:** `{"success":true,"message":"New contract version created","data":{"contractId":41,"version":2,"status":"DRAFT","sourceContractId":40}}`.

### F01-C20. `POST /customer/contracts/{contractId}/otp`

**Auth:** Customer sở hữu Request; body rỗng; chỉ version `PENDING_SIGNATURE` mới nhất, còn `effectiveCompletionDeadline`, không có pending changes. **200:** `{"success":true,"message":"OTP sent","data":{"sentTo":"c***@example.com","expiresInSeconds":300,"resendAfterSeconds":60}}`. Các số OTP **chỉ là ví dụ do module Auth cấu hình**, không phải rule thời gian mới. Errors `429 RATE_LIMITED`, `409 CONTRACT_EXPIRED`, `409 REQUEST_CHANGE_PENDING`.

### F01-C21. `POST /customer/contracts/{contractId}/sign`

**Auth:** Customer; `{"otp":"482913"}`. BE validate email/OTP, owner, contract version/hash, deadline chung, pending changes. Ký thành công phải commit vào DB **trước** trả response:
```json
{"success":true,"message":"Contract signed","data":{"contractId":40,"contractStatus":"SIGNED","requestId":15,"requestStatus":"AWAITING_DEPOSIT","effectiveCompletionDeadline":"2026-11-15T16:59:59Z","nextAction":"PAY_DEPOSIT","paymentLocked":false,"signedAt":"2026-11-13T04:30:00Z"}}
```
FE chuyển đến trang thanh toán sau response 200. Nếu User thoát/refresh khi chưa thanh toán thì Contract vẫn `SIGNED`, Request vẫn `AWAITING_DEPOSIT`, không ký OTP lại. **Không tạo Trip ở bước ký**. Lỗi `400 OTP_INVALID_OR_EXPIRED`, `409 CONTRACT_NOT_LATEST`, `409 CONTRACT_EXPIRED`, `409 REQUEST_CHANGE_PENDING`.

### F01-C22. `POST /customer/contracts/{contractId}/decline`

**Auth:** Customer. Body `{"reason":"Đề nghị điều chỉnh giá hoặc điều khoản"}`. Chỉ Contract hiện hành `PENDING_SIGNATURE` chưa ký; lưu `SIGN_DECLINED` và thông báo Manager để Manager phát hành Contract Version mới nếu tiếp tục. **200:** `{"success":true,"message":"Contract declined","data":{"contractId":40,"contractStatus":"SIGN_DECLINED","requestStatus":"AWAITING_CONTRACT"}}`. Không tự CANCELLED Request. Không dùng API Quote reject/negotiation.

**Quá hạn:** chưa ký → khóa OTP/sign, Manager có thể tạo Contract Version mới với deadline khác; đã ký nhưng chưa đủ cọc → giữ `SIGNED`, khóa thanh toán mới, Manager có thể gia hạn/hủy thủ công sau đối soát. Không xóa chữ ký đã lưu.

## 12. Thanh toán đặt cọc: VNPay và chuyển khoản ngân hàng

### 12.1. Điều kiện chung và số phải thu

**Chỉ hỗ trợ** `ONLINE_GATEWAY` (provider VNPay) và `BANK_TRANSFER` (Manager đối soát thủ công); không có `CASH`. **Trình tự:** Contract đã được Customer ký OTP (`SIGNED`) → mới mở thanh toán. Khoản phải thu `DEPOSIT` lấy từ **Contract đã ký**, gắn Contract Version đã ký. Customer không thể chỉnh `depositPercent`, `depositAmount`, `currency` hoặc `receivable.amount` bằng request FE.

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
    "completionDeadline": "2026-11-15T16:59:59Z",
    "effectiveCompletionDeadline": "2026-11-15T16:59:59Z",
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
  "paidAt": "2026-11-14T08:20:00Z",
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
  "receivedAt": "2026-11-14T08:21:00Z",
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

**Lưu ý:** Flow 1 v2.5 không sử dụng `Quote.validUntil` hoặc thời hạn Accept Quote. **Nguồn thời hạn duy nhất cho ký OTP và đặt cọc là `effectiveCompletionDeadline` của Contract đang áp dụng**.

### F01-M23. `POST /manager/requests/{requestId}/deposit-extensions` – Manager gia hạn deadline chung

**Endpoint tên giữ tương thích với cấu trúc role cũ; ngữ nghĩa chính thức:** **gia hạn `effectiveCompletionDeadline` chung**, không tạo hạn chung độc lập. Manager có quyền thực hiện khi Request đang `AWAITING_CONTRACT` (chưa ký) hoặc `AWAITING_DEPOSIT` (đã ký), chưa bị `CANCELLED`/`ACTIVATED` và chưa có điều kiện ngăn nghiệp vụ.

**Request:**

```json
{"newCompletionDeadline":"2026-11-17T16:59:59Z","reason":"Cho khách thêm thời gian hoàn tất hợp đồng và tiền cọc"}
```

**201 Response:**

```json
{"success":true,"message":"Deadline extended","data":{"extensionId":12,"requestId":15,"previousDeadline":"2026-11-15T16:59:59Z","effectiveCompletionDeadline":"2026-11-17T16:59:59Z","approvedByManagerId":5,"createdAt":"2026-11-16T10:00:00Z","paymentLocked":false}}
```

`newCompletionDeadline` bắt buộc muộn hơn deadline đang áp dụng và sau `serverNow`. Trước khi cho gia hạn, BE cũng đánh giá tính khả thi của lịch khởi hành; nếu deadline mới làm lịch cũ không còn khả thi, Manager phải xử lý phương án đổi lịch với Customer, không tự dời hoặc tuyên bố lịch cũ vẫn bảo đảm. Backend lưu bản ghi `DeadlineExtension` riêng: hạn cũ, hạn mới, người duyệt, lý do, thời điểm; không sửa hash/nội dung Contract đã ký. Khi đã ký, gia hạn thành công **mở lại thanh toán**; Customer không cần OTP ký lần nữa. Khi chưa ký và Contract version đã EXPIRED, Manager cần gửi Contract Version mới phù hợp thay vì tự sửa bản bất biến.

**Errors:** `400 VALIDATION_ERROR`, `409 INVALID_STATE`, `409 DEADLINE_EXTENSION_INVALID`, `404 NOT_FOUND`. Chỉ Manager được gọi; không giả định phải có API Customer xin gia hạn.

### F01-M24. `POST /manager/requests/{requestId}/cancel-overdue-deposit` – Hủy quá hạn THỦ CÔNG

**Endpoint tên giữ tương thích, áp dụng khi chưa hoàn tất deadline chung:**

```json
{"reason":"Không hoàn tất nghĩa vụ ký/đặt cọc sau các lần trao đổi"}
```

**200 data:** `{"requestId":15,"requestStatus":"CANCELLED","cancelledAt":"...","cancelledByManagerId":5,"cancellationReason":"..."}`.

**Preconditions:** Request chưa activated/closed/cancelled; `serverNow > effectiveCompletionDeadline`; chưa có gia hạn còn hiệu lực; chưa xác minh đủ cọc; **không có giao dịch hoặc bằng chứng tiền đang chờ xác minh cần xử lý**; Manager đã rà soát tình trạng thực nhận, đúng thẩm quyền và nhập lý do. **Không đặt ngưỡng 3 ngày/7 ngày cố định**. Khi quá hạn lâu hay ngắn, hệ thống chỉ cảnh báo/tạo task để Manager cân nhắc; quyết định hủy là **thủ công**, không thực hiện qua cron.

**Errors:** `409 DEADLINE_NOT_OVERDUE`, `PAYMENT_VERIFICATION_PENDING`, `DEADLINE_EXTENSION_ACTIVE`, `INVALID_STATE`, `404 NOT_FOUND`. Hủy không được xóa Contract SIGNED, lịch sử Contract Version, Quote legacy (nếu có), lịch sử thanh toán hoặc giao dịch đối soát; cách tính phí/hoàn tiền nếu đã thực nhận tiền phải căn cứ nghiệp vụ tài chính/hợp đồng, không tự sinh phạt.

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

1. Request ở `AWAITING_DEPOSIT`, chưa bị hủy/kết thúc; Contract đúng phiên bản đã ký `SIGNED` và gắn Contract Version đã ký.
2. Tổng số tiền cọc **đã xác minh thực nhận**, sau chống giao dịch trùng, đạt nghĩa vụ tiền cọc của Contract. Giá/tiền tệ đúng ledger; không tin dữ liệu FE.
3. Nếu có trạng thái chờ xác minh hoặc thông tin quá hạn, xử lý theo kết quả đối soát và guard trước khi quyết định; **không kích hoạt Request đã bị `CANCELLED`**.
4. Trong một SQL transaction: cập nhật Contract `EFFECTIVE`, Request `ACTIVATED`, tạo Trip `PLANNING` với **unique** `Trip.requestId` và liên kết Contract.TripID. Audit/operation receipt nằm private metadata với prepare/reconciliation; không tuyên bố commit file cùng SQL hoặc thêm SQL outbox. Nếu retry callback hoặc confirm bị bấm lại, trả trạng thái hiện hành, **không sinh Trip thứ hai hoặc cộng tiền lần hai**.
5. Sau commit phát `PaymentUpdated`, `RequestUpdated`, `TripUpdated`, `NotificationCreated`; FE tải REST nguồn sự thật.

**Kết quả sau kích hoạt:** `TripStatus=PLANNING`, `deployment` chưa được Manager xác nhận. Chưa được đặt `READY_TO_DEPART` hay xem tài liệu chưa duyệt là đủ điều kiện khởi hành. Manager phải xác nhận bước Deployment ở Chương 15 trước khi chính thức bàn giao tác vụ Flow 2/3.

### 14.1. Trường hợp Customer hoàn tất muộn hoặc lịch không còn khả thi

1. Khi phát hành Contract, Manager chọn `completionDeadline` để còn đủ thời gian chuẩn bị trước `plannedDepartureAt`. Thời gian chuẩn bị là mức đã chốt trong kế hoạch, không thấp hơn sàn MVP, dùng mức chuẩn bị sàn MVP 2/3/7 ngày theo tuyến/cự ly, Manager được tăng trong kế hoạch.
2. Chỉ một deadline chung cho ký và đặt cọc. Khi hết hạn, BE không cho khởi tạo thanh toán/chữ ký mới theo quy tắc Chương 13; những giao dịch hợp lệ đã khởi tạo và đến muộn vẫn phải được đối soát, không bỏ tiền thực nhận.
3. Nếu dự kiến khởi hành đã qua hoặc không còn khả thi tại thời điểm Trip được kích hoạt, Trip vẫn có thể `PLANNING` để xử lý nghiệp vụ tài chính, **nhưng Manager không được confirm deployment khi chưa có lịch khả thi**. Khi cần, ghi `scheduleFeasibility: {feasible:false, requiresCustomerAgreement:true}` là read-model dẫn xuất, **không thêm RequestStatus/TripStatus**.
4. Manager làm việc với Customer để thống nhất lịch mới; không tự thay ngày trong Contract đã ký. Trước ký, dùng cơ chế Request Change/Contract Version theo Chương 9–11. Sau ký, sự đồng ý thay đổi ngày phải được lưu có bằng chứng và thực hiện qua quy trình sửa đổi hợp đồng phù hợp; tài liệu này **chưa đặc tả API phụ lục hợp đồng sau ký** và không cho phép chỉnh âm thầm chữ ký/PDF.
5. Sau khi phương án ngày mới hợp lệ và được ghi nhận, Manager cập nhật kế hoạch có thẩm quyền; Flow 3 lập/duyệt lại Route Version nếu bị ảnh hưởng, Flow 2 đánh giá lại checklist/bảo hiểm theo ngày mới. Không tự đặt lại mọi phân công nếu chúng vẫn phù hợp, nhưng bắt buộc revalidate.

**Đây là chốt kiểm soát lịch, không phải một bước phê duyệt mới mặc định.** `DEPARTURE_SCHEDULE_NOT_FEASIBLE` là lỗi nghiệp vụ đề xuất bổ sung vào conventions khi đồng bộ sau.

---

## 15. Manager xác nhận Deployment và handoff Flow 2/3

### F01-M25. `GET /manager/trips/{tripId}`

**200 data:** bao gồm `tripId`, `requestId`, `status: PLANNING`, `preliminaryPlan`, `deployment: {status, confirmedAt, holdReason}`, `allowedActions`. Manager xem thông tin trước khi giao Coordinator/Specialist.

### F01-M26. `POST /manager/trips/{tripId}/confirm-deployment` **[BỔ SUNG]**

**Body:** `{ "note":"Đủ điều kiện bàn giao bước lập kế hoạch chi tiết" }`.  
**200 data:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"CONFIRMED", "confirmedAt":"..." }`. BE mới tạo tasks chính thức cho Coordinator và Specialist (triển khai **song song**). Đây **không phải** phê duyệt cuối `READY_TO_DEPART`. **Không confirm deployment nếu departure plan không còn khả thi hoặc đang chờ Customer xác nhận lịch mới**; trả `409 DEPARTURE_SCHEDULE_NOT_FEASIBLE` và giữ Trip `PLANNING`.

### F01-M27. `POST /manager/trips/{tripId}/hold-deployment` & `POST /manager/trips/{tripId}/resume-deployment` **[BỔ SUNG]**

Hold body `{ "reason":"Cần làm rõ điều kiện an toàn" }`. Resume body `{ "note":"Đã xử lý vướng mắc" }`.  
**200 data ví dụ khi Trip còn `PLANNING`:** `{ "tripId":9, "tripStatus":"PLANNING", "deploymentStatus":"ON_HOLD" }` hoặc `CONFIRMED`. `deploymentStatus` là **trạng thái triển khai riêng**, không phát minh `TripStatus.ON_HOLD`.

**Backend guards:** chỉ hold/resume khi Trip chưa ghi milestone khởi hành (Trip `PLANNING` hoặc `READY_TO_DEPART`). Hold từ `READY_TO_DEPART` làm điều kiện `DEPLOYMENT_CONFIRMED` mất hiệu lực, Domain Readiness Engine đưa Trip về `PLANNING` có audit và notification; không giả định mọi request đang `PLANNING`. Resume không tự đưa Trip lên `READY_TO_DEPART` nếu các xác nhận/snapshot không còn hợp lệ; phải đánh giá lại từ Flow 2/3. Với Trip đã `IN_TRANSIT` hoặc `COMPLETED`, trả `409 TRIP_ALREADY_DEPARTED`/`409 INVALID_STATE` theo trạng thái; xử lý sự cố qua Flow 4/5. Không cho tiến hành phân công chính thức trong thời gian hold. Manager không tùy tiện từ chối hợp đồng có hiệu lực.


### 15.1. Chi phí bảo hiểm và ranh giới trách nhiệm Flow 2–3 (bản chốt Checklist)

- **Flow 1 / Contract:** Manager lập giá chính thức có hạng mục `INSURANCE`, tiền bảo hiểm nằm trong giá dịch vụ và được Customer thanh toán theo điều khoản Contract. Giá có bảo hiểm **không phải bằng chứng** công ty đã thu xếp bảo hiểm.
- **Sau khi Trip được kích hoạt:** công ty liên hệ bên bảo hiểm và hoàn tất việc thu xếp bảo hiểm phù hợp **ngoài hệ thống**. Dự án demo không tích hợp API mua bảo hiểm, không xử lý phí bảo hiểm trực tiếp với insurer hay yêu cầu bồi thường.
- **Flow 2 / Transport Specialist:** Specialist đối chiếu bảo hiểm thực tế bên ngoài phần mềm; sau khi hợp lệ, đánh dấu duy nhất một **mục checklist `INSURANCE_VERIFIED`** thuộc `COMPANY/PER_TRIP`, có audit actor/time, không bắt nhập số policy, mức bồi thường hoặc upload giấy chứng nhận vào hệ thống. Specialist chỉ xác nhận `Documents READY` sau khi **tất cả** mục hồ sơ cần thiết, bao gồm mục bảo hiểm, đạt yêu cầu. Sử dụng `PATCH /specialist/trips/{tripId}/checklist/insurance-confirmation` và `POST /specialist/trips/{tripId}/documents-readiness/confirm` theo Flow 2 v1.3.
- **Flow 3 / Fleet & Route Coordinator:** Coordinator phân công xe/người/từng ROAD leg VN/JP, quản lý AIR booking và xác nhận `Operations READY`; không thao tác bảo hiểm. Backend dùng kết quả `Documents READY`/checklist từ Flow 2 để quyết định tính sẵn sàng khởi hành.
- **Bất biến:** `Documents READY` + `Operations READY` + Route Version Manager `APPROVED` + các guard khác còn hợp lệ → Trip `READY_TO_DEPART`; không suy ra bảo hiểm từ thanh toán Contract, không suy ra Trip xuất phát từ `READY_TO_DEPART`. Nếu tuyến/ngày/ngựa thay đổi có khả năng ảnh hưởng phạm vi bảo hiểm, đánh dấu checklist bảo hiểm `NOT_SUBMITTED`/chưa xác nhận và yêu cầu Specialist kiểm tra/tick lại; không tự bảo đảm bảo hiểm còn hiệu lực.

**Ranh giới bằng chứng:** tick checklist chỉ là xác nhận nội bộ của Specialist rằng họ đã kiểm tra chứng từ ngoài hệ thống. Hệ thống demo **không lưu hợp đồng bảo hiểm** và không thể tự kiểm chứng các điều khoản, hạn mức hay hiệu lực bảo hiểm thực tế. Quy trình thực tế vẫn phải lưu trữ chứng từ theo yêu cầu của doanh nghiệp và cơ quan có thẩm quyền.

### 15.2. Khi đổi lịch/ETA – ranh giới Flow 1 với Flow 2 và Flow 3 (v2.5)

- **Sự kiện nguồn:** Coordinator cập nhật Route Version hoặc flight booking trong Flow 3. Backend đánh giá tác động với `plannedDepartureAt`, `etaDestination`, deadline giao hàng theo Contract đang có hiệu lực và các deadline chuyên môn của Flow 2. Đây là đánh giá **sau mutation đã commit**, không phải side effect của GET/preview.
- **Ba loại thời hạn không được gộp:** (1) `effectiveCompletionDeadline` cho ký/cọc ở Flow 1, (2) `documentRequiredBy`/thời điểm phải đủ hồ sơ theo nguồn quy định ở Flow 2, (3) `deliveryDeadline` cam kết theo hợp đồng và `etaDestination` dự kiến ở Flow 3. Chỉ thời gian kế hoạch phụ thuộc mới tính lại tự động khi hợp lệ; **deadline pháp lý hoặc cam kết đã ký không tự gia hạn**.
- **Nếu ETA mới vượt hạn bàn giao cam kết:** Backend tạo `DELIVERY_DEADLINE_AT_RISK` cho Logistics Manager ngay khi lưu thay đổi có hiệu lực, với `tripId`, `routeVersionId`, `previousEta`, `newEta`, `committedDeliveryDeadline`, `detectedAt` và link Trip; idempotent theo Trip/Route Version/tình trạng deadline, không spam do retry. Coordinator vẫn cần `deadlineJustification` khi submit Route quá hạn; giải trình **không có nghĩa Customer đã đồng ý đổi hạn**.
- **Nếu đã vượt hạn xử lý hồ sơ:** cảnh báo `DOCUMENT_DEADLINE_OVERDUE` từ Flow 2 cũng được gửi Manager ngay khi phát hiện. Manager giám sát và phối hợp; Specialist xử lý hồ sơ, Coordinator điều chỉnh kế hoạch nếu cần. Không chuyển tự động thành Request `CANCELLED` hoặc tạo quy trình bồi thường giả định.
- **Lịch mới tác động hợp đồng đã ký:** Manager liên hệ Customer và ghi nhận chấp thuận theo quy trình thay đổi hợp đồng có thẩm quyền. Bản thiết kế Flow 1 v2.5 **chưa đặt thêm endpoint sửa hợp đồng sau ký**, không tái sử dụng F01-C11 vốn chỉ cho *trước ký*. Nếu chưa có xác nhận hợp lệ cho thay đổi cam kết, không được xem hạn mới là đã được Customer chấp thuận.
- **Khởi hành:** nếu giấy tờ/hồ sơ bị ảnh hưởng, Flow 2 rút hiệu lực `Documents READY` cho snapshot hiện hành; nếu xe/người/booking bị ảnh hưởng, Flow 3 rút hiệu lực `Operations READY`. Backend chỉ đưa `READY_TO_DEPART → PLANNING` trước milestone khởi hành khi **thực sự mất guard**. `IN_TRANSIT` được xử lý theo Flow 4/5, không rollback về Planning.

**Ví dụ minh họa:** Contract cam kết bàn giao 25/11, Route dự kiến ETA 24/11; Coordinator cập nhật booking khiến ETA thành 27/11. Backend giữ nguyên hạn hợp đồng 25/11, lập tức cảnh báo Manager dự kiến trễ; Flow 2 chỉ đánh dấu đỏ hồ sơ không còn hợp lệ với lịch mới, hồ sơ còn hợp lệ vẫn giữ nguyên. Manager xử lý phương án/hạn cam kết với Customer; không sửa ngày giao trong hợp đồng một cách ngầm định.

## 16. SignalR, thông báo và tác vụ tự động

**Hub:** `/api/hubs/updates` như `00-conventions.md`; sử dụng ASP.NET Core SignalR và `@microsoft/signalr`. Hub **không** tạo/xác nhận Request/Payment/Contract.

| Sự kiện | Khi nào | Người nhận | FE làm gì |
|---|---|---|---|
| `RequestUpdated` | Submit, Manager accept/reject/request-revision, resubmit, duyệt change, hủy, kích hoạt | Customer chủ đơn; Manager được phép | `GET /.../requests/{id}`, refresh `allowedActions` |
| `NotificationCreated` | Có thông báo mới | Chủ thông báo | Tải unread-count/inbox |
| `PaymentUpdated` | Proof submitted/confirmed/rejected, gia hạn/hủy quá hạn | Customer chủ đơn; Manager | Tải `GET /.../payments` |
| `TripUpdated` | Trip `PLANNING` được tạo; deployment confirmed/held/resumed | Manager; Customer chủ đơn; nhân sự liên quan sau phân công | Tải GET trip và trạng thái |

Contract/Contract Version thay đổi được báo qua `RequestUpdated` và `NotificationCreated`, FE tải lại Contract bằng REST. **BE chỉ phát event sau DB commit**, payload tối thiểu `{ "entityId": 15, "occurredAt": "...", "version": 3 }`. Không broadcast hợp đồng/thanh toán cho người ngoài phạm vi; không dùng SignalR thay REST hoặc dùng GPS nền. Kết nối lại phải refresh REST.


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
| 400 | `PRICE_OVERRIDE_REASON_REQUIRED` | Giá chính thức trong Draft Contract thấp hơn giá sàn nhưng Manager chưa nhập `priceOverrideReason` |
| 400 | `OTP_INVALID_OR_EXPIRED` | OTP sai/hết hạn/chưa được phát hành cho version cần ký |
| 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED` | Thiếu/hết hạn xác thực |
| 403 | `FORBIDDEN_ROLE`, `ACCOUNT_INACTIVE` | Sai vai trò hoặc tài khoản bị khóa |
| 404 | `NOT_FOUND`, `PRICE_TABLE_NOT_FOUND` | Resource không tồn tại/không thuộc owner hoặc chưa cấu hình giá |
| 409 | `INVALID_STATE`, `REQUEST_STATE_CHANGED` | State/version thay đổi trước khi thực hiện thao tác |
| 409 | `HORSE_SCHEDULE_CONFLICT`, `REQUEST_CHANGE_PENDING` | Ngựa trùng lịch hoặc có đề nghị thay đổi chưa xử lý |
| 409 | `CONTRACT_NOT_EDITABLE`, `REQUEST_CHANGE_PENDING` | Contract không thể sửa ở trạng thái hiện tại hoặc Request có đề nghị thay đổi đang chờ |
| 409 | `PRELIMINARY_PLAN_REQUIRED` | Thiếu kế hoạch sơ bộ cho phiên bản Request hiện tại |
| 409 | `CONTRACT_EXPIRED`, `CONTRACT_NOT_LATEST`, `CONTRACT_ALREADY_SIGNED`, `CONTRACT_NOT_SIGNED` | Contract/OTP chưa đủ điều kiện |
| 409 | `PAYMENT_DEADLINE_EXPIRED`, `RECEIVABLE_ALREADY_PAID`, `PAYMENT_PENDING_CONFIRMATION` | Không thể tạo thanh toán mới hoặc đang cần đối soát |
| 409 | `TRANSACTION_ALREADY_PROCESSED`, `INVALID_PAYMENT_AMOUNT`, `PAYMENT_VERIFICATION_PENDING` | Confirm/reject không hợp lệ, số tiền hoặc bằng chứng cần kiểm tra |
| 409 | `DEADLINE_NOT_OVERDUE`, `DEADLINE_EXTENSION_ACTIVE`, `DEADLINE_EXTENSION_INVALID` | Không thỏa điều kiện gia hạn/hủy quá hạn |
| 409 | `CANCELLATION_REQUIRES_APPROVAL`, `REQUEST_NOT_CANCELLABLE` | Không được hủy trực tiếp |
| 429 | `RATE_LIMITED` | Giới hạn OTP/thao tác an toàn |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống |

**Authorization:** tất cả `/customer/*` kiểm tra `CUSTOMER` và ownership từ JWT; không tin `customerId` của FE; resource khách khác trả `404 NOT_FOUND`. `/manager/*` kiểm tra `LOGISTICS_MANAGER`. VNPay callback không nằm dưới endpoint role Customer, kiểm tra tính xác thực riêng theo provider. Tài liệu/biên lai phải truy cập qua API có quyền; không lộ đường dẫn file public.

**Idempotency/Concurrency:** tạo Request, tạo Contract Draft/Contract Version, ký OTP, tạo payment session, Manager confirm ngân hàng, VNPay callback và activation phải chống gửi trùng/retry phù hợp (`Idempotency-Key` nếu được ứng dụng hỗ trợ, unique constraint, locking, transaction). Manager approve/reject cùng Request/Change/Bank Transfer cần optimistic locking hoặc transaction. Version `requestVersion`, `preliminaryPlanVersion`, `pricingVersion` và `contractVersion` là cơ sở chặn stale action. Contract đã phát hành và giao dịch đã xác nhận là dữ liệu audit không ghi đè; dữ liệu Quote cũ (nếu có) chỉ đọc.

**Thời gian:** timestamp là ISO 8601 UTC, date là `YYYY-MM-DD`; BE kiểm tra `completionDeadline`/`effectiveCompletionDeadline` theo server clock. Hạn gia hạn phải đồng nhất ở `Contract`, `RequestDetail`, `Payments` và notification. `TransactionStatus`/`PaymentStatus`/`RequestStatus` là ba loại trạng thái khác nhau. Các error code bổ sung sẽ được đồng bộ trong `00-conventions.md` khi hoàn thiện bộ Role Contracts, tránh đặt hai tên cho một lỗi.

## 18. Page → API và quyền truy cập theo Role

### 18.1. Customer

| Page / Function | Method | Endpoint | UC | Tính chất |
|---|---|---|---|---|
| Đăng ký/đăng nhập để sử dụng Flow 1 | POST | `/auth/register/request-otp`, `/auth/register/verify-otp`, `/auth/register`, `/auth/login`, `/auth/google-login` | Shared | Tham chiếu `01` |
| Trang chủ, hành động Customer cần xử lý | GET | `/customer/dashboard` | Dashboard | Tham chiếu `02` |
| Chọn quốc gia | GET | `/public/countries` | CUST-02/03 | Tham chiếu `01` |
| Chọn mode khả dụng ở trang Public Estimate | GET | `/public/estimates/transport-modes` | CUST-02 | Public, **[BỔ SUNG — cần đồng bộ Shared]** |
| Tính giá dự toán chưa đăng nhập | POST | `/public/estimates` | CUST-02 | Public, **[BỔ SUNG — cần đồng bộ Shared]** |
| Chọn mode khả dụng khi đã đăng nhập | GET | `/customer/estimates/transport-modes` | CUST-02 | Cùng PricingService; cần đồng bộ `02` |
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

**Không thuộc API Inventory v2.2:** các endpoint `/customer/quotes/*`, `/manager/quotes/*`, `/customer/requests/{requestId}/quotes`, `/manager/requests/{requestId}/quotes` và `POST /manager/requests/{requestId}/quotes` là **legacy/deprecated**. Không triển khai luồng Accept/Reject/Adjust Quotation cho Request mới. `GET /manager/requests/{requestId}/quote-suggestion` **vẫn dùng được** nhưng chỉ là giá gợi ý nội bộ.

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
| Xem gợi ý giá nội bộ (tên endpoint kế thừa) | GET | `/manager/requests/{requestId}/quote-suggestion` | LM-02 | Pricing Suggestion **không tạo Quote**, cần đồng bộ `04` |
| **Tạo Draft Contract có giá chính thức** | POST | `/manager/requests/{requestId}/contracts` | LM-02 | **API chính thay Quote**, cần đồng bộ `04` |
| Xem Contract và lịch sử phiên bản | GET | `/manager/requests/{requestId}/contract` | LM-02 | Cần đồng bộ `04` |
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
| `/customer/home` | Xem các yêu cầu đang chờ thao tác, hợp đồng, cọc | `GET /customer/dashboard` | Mã đơn, loại công việc, deadline, liên kết chi tiết |
| `/customer/horses` | Danh sách ngựa, tìm kiếm, trạng thái | `GET /customer/horses` | Ảnh, tên, microchip, trạng thái, tóm tắt hồ sơ |
| `/customer/horses/{horseId}` | Xem thông tin đầy đủ ngựa | `GET /customer/horses/{horseId}` | Thuộc tính ngựa, thông tin hộ chiếu, ảnh, `allowedActions` |
| Tab hồ sơ ngựa | Danh sách giấy tờ và xem tệp scan | `GET /customer/horses/{horseId}/documents`, `GET /customer/documents/{documentId}`, `GET /files/{fileId}` | Phiên bản/tình trạng giấy tờ, file hợp lệ, thông báo thiếu giấy tờ |
| `/estimate` (Public) | Xem Estimate tham khảo trước khi đăng nhập; bấm Tiếp tục để Login/Register | `GET /public/countries`, `GET /public/estimates/transport-modes`, `POST /public/estimates` | Giá tham khảo, bao gồm hạng mục bảo hiểm; không tạo Quote/Contract/Trip |
| Dự toán khi đã đăng nhập | Xem Estimate trong Customer Dashboard/Wizard khi cần | `GET /customer/estimates/transport-modes`, `POST /customer/estimates` | Cùng PricingService, không yêu cầu accept |
| Wizard – Trip Information | Cấu hình ngày/mode, giữ dữ liệu bước | `GET /customer/requests/form-options`, `GET /customer/requests/document-requirements` và API Estimate | Ngày khả dụng, quốc gia/mode, form validation |
| Wizard – Pickup/Delivery | Nhập địa chỉ đường phố và người nhận | Dữ liệu trên FE; gửi qua `POST /customer/requests` | Tóm tắt thông tin nhận/giao ngựa |
| Wizard – Horses | Chọn **nhiều ngựa đã có**, xem chi tiết trước khi chọn | `GET /customer/horses`, `GET /customer/horses/selectable`, `GET /customer/horses/{horseId}` | Chọn được hay trùng lịch; cảnh báo tài liệu |
| Wizard – Add New Horse | **Tạo ngựa mới trong wizard**, gồm ảnh + passport scan | `POST /customer/horses`, sau đó `GET /customer/horses/selectable` | Thêm ngựa vừa tạo vào danh sách đã chọn mà không xóa state wizard |
| Wizard – Horses & Horse Documents | Xem checklist theo tuyến, nộp/cập nhật **PER_HORSE** bắt buộc của từng ngựa; **không upload Customer PER_TRIP** | `GET /customer/requests/document-requirements`; `GET/POST /customer/horses/{horseId}/documents`; `POST /customer/horses` nếu thêm mới | Thiếu Customer PER_HORSE thì chặn Submit; hồ sơ COMPANY/PER_TRIP do Specialist thực hiện trong Flow 2 |
| Wizard – Review & Confirm | Xem tất cả dữ liệu, quay lại sửa, xác nhận tạo đơn | `POST /customer/requests` **một lần khi submit** | Request code, status `PENDING`, cảnh báo hồ sơ |
| `/customer/requests` | Xem danh sách/trạng thái đơn | `GET /customer/requests` | Đơn hiện tại, tìm kiếm/lọc |
| `/customer/requests/{id}` | Xem chi tiết, lịch sử, quyền thao tác | `GET /customer/requests/{requestId}` | Thông tin đơn, ngựa, Contract/Payment tóm tắt, `allowedActions` |
| Trang/Modal yêu cầu sửa | Xem yêu cầu Manager và nộp lại | `GET /customer/requests/{requestId}/revision-requests`, `PUT /customer/requests/{requestId}/revision` | Lý do yêu cầu, trường cần sửa, lịch sử phiên bản |
| Tab yêu cầu bổ sung | Xem câu hỏi và trả lời | `GET /customer/requests/{requestId}/info-requests`, `POST /customer/requests/{requestId}/info-responses` | Lịch sử hỏi đáp/tài liệu đính kèm |
| Tab đề xuất thay đổi | Tạo/xem đề xuất và quyết định Manager | `POST/GET /customer/requests/{requestId}/change-requests` | Đề xuất `PENDING_APPROVAL`, dữ liệu chuẩn chưa thay đổi |
| Tab hủy đơn | Hủy trước ký, xin hủy sau ký, xem kết quả | `POST /customer/requests/{requestId}/cancel`, `POST/GET /customer/requests/{requestId}/cancellation-requests` | Quy trình khác nhau trước và sau ký |
| Tab hợp đồng | Xem giá chính thức (gồm bảo hiểm), Contract Version/PDF, lấy OTP, ký hoặc từ chối kèm lý do | `GET /customer/requests/{requestId}/contract`, `GET /files/{fileId}`, `POST /customer/contracts/{contractId}/otp`, `POST .../sign`, `POST .../decline` | `SIGNED` khác `EFFECTIVE`; từ chối trước ký → Manager tạo Contract Version mới; ký xong → Payment |
| Tab thanh toán cọc | Xem số tiền cọc, hạn, chứng từ, trạng thái | `GET /customer/requests/{requestId}/payments`, Bank info/Online/Manual, Transaction GET | `PAY_DEPOSIT` chỉ khi Contract SIGNED và chưa quá hạn; đã ký nhưng chưa cọc có thể quay lại tiếp tục, biên nhận |
| Hộp thư thông báo | Xem thông báo và tải lại dữ liệu thay đổi | `GET /notifications`, `GET /notifications/unread-count`; SignalR | Trạng thái mới chỉ sau khi GET REST xác nhận |

**Ranh giới:** Trang theo dõi xe, lịch trình vận chuyển chi tiết, health log khi đang chạy và nghiệm thu **không** thuộc Flow 1; có trong Role Customer API cho Flow 4/hậu bàn giao. Ở cuối Flow 1, Customer chỉ cần thấy `tripId`, `tripCode`, `TripStatus = PLANNING` và trạng thái triển khai từ Request detail/notification.

### 18.4. Dịch vụ dùng chung / tự động

| Hành động hệ thống | Cách kích hoạt | Có cần endpoint riêng? |
|---|---|---|
| Sinh mã Request, lưu lịch sử, phát thông báo | `POST /customer/requests` | **Không**; side effect trong BE |
| Tính dự toán theo bảng giá cấu hình (PricingService) | `POST /public/estimates` hoặc `POST /customer/estimates` | Chung PricingService, không tạo Quote/Request/Trip |
| Hết hạn thời gian hoàn tất Contract (ký + cọc) | BE kiểm tra `effectiveCompletionDeadline`; job cảnh báo khi cần | Không có API FE riêng, không auto-cancel |
| Manager lập Contract `DRAFT` sau khi ACCEPT Request | `POST /manager/requests/{requestId}/contracts` (sau preliminary plan/pricing) | Manager API; **không có** Customer Accept Quote |
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
| F01-T09 | Customer Change Request quan trọng trước ký | Chưa ghi đè canonical; không cho phát hành/ký Contract không còn phù hợp khi đang chờ |
| F01-T10 | Manager duyệt Change Request khi đã có Draft/Pending Contract | Version Request tăng; Contract chưa ký của version cũ không được ký, Request trở lại `ACCEPTED` để lập Contract Version phù hợp |
| F01-T11 | Manager xem Pricing Suggestion | BE tính `estimatedCost`, `suggestedTotal`, `floorPrice`; Customer không được xem chi phí nội bộ |
| F01-T12 | Manager tạo Draft Contract có giá bằng/trên sàn | Không cần `priceOverrideReason`; Backend tính tổng và cọc từ các hạng mục |
| F01-T13 | Manager tạo Draft Contract dưới sàn không có lý do | `PRICE_OVERRIDE_REASON_REQUIRED` |
| F01-T14 | Manager tạo Draft Contract dưới sàn có lý do | Thành công, audit `floorPrice`, `totalAmount`, Manager, `priceOverrideReason` |
| F01-T15 | MVP cố định `depositPercent=40` theo mọi Contract Version mới | Snapshot hợp đồng và `depositAmount` đúng; không auto-default 30% |
| F01-T16 | Manager gửi Contract với `completionDeadline` riêng theo phiên bản | Deadline chung ký/cọc MVP cố định 40%, không default 7 ngày; hết hạn không tự hủy Request |
| F01-T17 | Customer từ chối Contract trước ký và Manager lập Contract Version mới | Lưu `SIGN_DECLINED` cùng lý do; version cũ bất biến, chỉ bản mới nhất hợp lệ được ký; không giới hạn vòng trao đổi |
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
| F01-T35 | Customer hoặc Manager hủy đúng quyền/trạng thái | Giữ lịch sử Contract/Contract Version và payment; không xóa audit |
| F01-T36 | Customer truy cập tài nguyên của Customer khác | `404 NOT_FOUND` |
| F01-T37 | FE gửi sửa `totalAmount`/`depositAmount`/currency tại payment | BE bỏ qua/từ chối; số tiền lấy từ Contract và receivable |
| F01-T38 | SignalR bị ngắt/reconnect | FE GET lại REST, trạng thái không lệ thuộc thông báo push |
| F01-T39 | Public Estimate từ Landing trước Login và Customer tiếp tục | Public không cần JWT, không tạo Request/Quote/Trip; sau Login Wizard prefill phi nhạy cảm |
| F01-T40 | Customer Submit/Revision không có file `PER_TRIP` nhưng đủ tài liệu ngựa | Chấp nhận theo checklist `CUSTOMER + PER_HORSE + REQUEST_SUBMISSION`; không yêu cầu giấy ủy quyền |
| F01-T41 | Receiver là người nhận hộ (`isProxy=true`) | Lưu `receiverVerification.required=true`, `confirmed=false` lúc Submit; công ty xác nhận sau qua luồng giao nhận |
| F01-T42 | Manager soạn Contract có hạng mục `INSURANCE` | `Contract.totalAmount` gồm bảo hiểm; giá đã thu **không** đánh dấu `INSURANCE_VERIFIED` trong checklist Flow 2 |
| F01-T43 | Trip PLANNING sau activation, Specialist/Coordinator chưa xác nhận READY | Không tự `READY_TO_DEPART`; Flow 2–3 xác nhận riêng theo route/version, Manager duyệt route; Driver khởi hành thực tế mới `IN_TRANSIT` |

**Điều kiện nghiệm thu tài liệu trước khi code:** các API ở Chương 18 phải được đồng bộ vào `02-customer-api.md` và `04-manager-api.md`; schema checklist cần khớp Flow 2; VNPay adapter mapping khớp mã nguồn thực tế. Các test này là **kịch bản cần thực hiện**, không phải tuyên bố đã có code/đã kiểm thử.

### 19.1. UAT kế thừa Flow 1 v2.4

| Mã | Kịch bản | Kết quả |
|---|---|---|
| `F01-T44` | Manager gửi Contract với hạn ký/cọc muộn hơn lịch khởi hành dự kiến | `409 DEPARTURE_SCHEDULE_NOT_FEASIBLE`; không gửi Contract như thể lịch vẫn khả thi |
| `F01-T45` | Manager gia hạn nhưng lịch cũ không còn khả thi | Cảnh báo/chặn xác nhận lịch cũ; Manager cần thống nhất phương án với Customer, không tự dời ngày |
| `F01-T46` | Cọc được xác minh hợp lệ nhưng thời gian khởi hành đã qua | Ledger ghi tiền đúng; Trip `PLANNING` nếu đủ điều kiện tài chính, không confirm deployment khi lịch chưa khả thi |
| `F01-T47` | Hold Trip `READY_TO_DEPART` trước milestone khởi hành | Deployment `ON_HOLD`, Trip về `PLANNING` theo readiness event, audit đầy đủ |
| `F01-T48` | Hold hoặc resume khi Trip `IN_TRANSIT` | `409`, không rollback trạng thái; chuyển xử lý qua Flow 4/5 |

### 19.2. UAT bổ sung khi mở khóa v2.5

| Mã | Kịch bản | Kết quả kỳ vọng |
|---|---|---|
| `F01-T49` | Dời chuyến làm ETA mới vượt hạn giao đã cam kết | Manager nhận cảnh báo ngay sau khi thay đổi được lưu; không tự sửa `deliveryDeadline` đã ký |
| `F01-T50` | Dời ngày nhưng ETA vẫn trong hạn giao và không có hồ sơ bị ảnh hưởng | Không tạo cảnh báo quá hạn giả; không tự rollback Trip |
| `F01-T51` | Customer/Manager cố dùng F01-C11 để sửa hợp đồng đã `SIGNED` | Từ chối thao tác không phù hợp; lưu quy trình thay đổi hợp đồng sau ký làm phụ thuộc chưa đặc tả API |
| `F01-T52` | Dời lịch vận chuyển sau khi đã ký/cọc | `effectiveCompletionDeadline` không bị tự gia hạn; hồ sơ/ETA được xử lý ở Flow 2/3 |
| `F01-T53` | Hồ sơ trước khởi hành đã quá hạn | Manager được thông báo từ Flow 2; không tự `CANCELLED` Request |
| `F01-T54` | Chỉ có cảnh báo ETA vượt hạn nhưng các điều kiện sẵn sàng vẫn hợp lệ | Không tự giả lập thiếu Documents/Operations READY; Manager xử lý cam kết theo thẩm quyền |


## 20. Thông số cấu hình và phụ thuộc triển khai (không phải vấn đề cần hỏi lại)

Các mục dưới đây **không chặn việc giao thiết kế nghiệp vụ**, nhưng đội code phải lấy từ cấu hình hoặc hiện thực đang chạy, không tự phát sinh policy từ số minh họa.

| ID | Chủ đề | Cách xử lý trong contract |
|---|---|---|
| F01-CONFIG-01 | Bảng giá/tariff VN→VN và VN→JP, phí theo route/mode/horseCount/ngày | Dùng định mức MVP và policy version tại plan 2.0; không rải magic number ở controller; thay policy phải version và cập nhật fixture |
| F01-CONFIG-02 | `floorPrice`, margin/cost policy | BE tính theo chính sách công ty; Manager override khi có `overrideReason`; không chờ phê duyệt ngoại lệ từ role khác |
| F01-CONFIG-03 | Thuế, phụ phí, quy tắc làm tròn, currency/FX | Dùng chính sách cấu hình và dữ liệu triển khai, không tự lấy mặc định từ ví dụ |
| F01-CONFIG-04 | Giới hạn đầu vào và lead time | Dùng sàn 2/3/7 ngày theo tuyến/cự ly đã chốt; Manager được tăng trong plan, không dùng 14 ngày từ bản cũ |
| F01-CONFIG-05 | `depositPercent` | **MVP cố định 40%**; Manager không đổi; BE tự tính số tiền theo Contract Version |
| F01-CONFIG-06 | Giá chính thức trong Contract Version | Không có `Quote.validUntil` hay Accept Quote; Contract chứa hạng mục giá (kể cả bảo hiểm), giá tổng và snapshot Pricing; mọi version sau trước ký giữ lịch sử |
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
- `POST /customer/horses` và hồ sơ Horse dùng API Role Customer hiện có; **không tạo endpoint thêm ngựa riêng trong wizard**. Checklist PER_HORSE thuộc Customer khi Submit phải chung nguồn kiểm tra với Flow 2; **không có upload Customer PER_TRIP** trong Wizard/Revision demo.
- Các endpoint được ghi trong hợp đồng thiết kế **không đồng nghĩa đã được lập trình**; người phụ trách tích hợp xác nhận code và test riêng khi bàn giao.

### 21.2. Kiểm tra bắt buộc trước merge

1. **Route scope:** mọi JSON và error test chỉ đặt VN→VN/VN→JP; không chấp nhận JP→VN/VN→TH.
2. **Pricing & Contract:** BE tính Estimate, Pricing Suggestion, floor, `Contract.totalAmount` và `depositAmount`; Manager được override dưới sàn có lý do, giữ `depositPercent=40` và chọn `completionDeadline` chung khi gửi Contract. **Không có Quote acceptance**.
3. **Document:** Submit có đủ hồ sơ Customer, không đòi hồ sơ do công ty phải thực hiện; Specialist xử lý Flow 2 trước khởi hành.
4. **Contract + Payment:** ký OTP trước, lưu SIGNED khi rời trang; một deadline chung; VNPay hoặc Bank Transfer; quá hạn khóa giao dịch mới/Manager gia hạn; không auto-cancel.
5. **Activation:** chỉ khi ký + đủ cọc xác minh; BE transaction atomic và `Trip.requestId` unique; Trip mới `PLANNING`.
6. **Quyền:** Customer chỉ thấy của mình; Manager theo role; VNPay callback không do FE tự xác nhận.
7. **Contract testing:** cập nhật và test `00-conventions`, `01-shared`, `02-customer`, `04-manager`, Flow 1 Use Case; kiểm tra toàn bộ ID F01, route/method, error và field schema; acceptance tests Chương 19.

**Version history:** v1.1 — mở rộng Coverage FE Customer; v2.0-DRAFT/v2.0 — tích hợp Pricing/VNPay và chính sách giá sàn, cọc, thời hạn, hủy thủ công; v2.1 — chuyển sang Public Estimate → Draft Contract trực tiếp, không cần Customer Accept Quote, hồ sơ Customer PER_HORSE; **v2.2 — làm sạch bảng endpoint/UI/UAT/configuration còn theo Quote cũ, chuẩn hóa Request Revision và trách nhiệm bảo hiểm, đồng bộ ranh giới Flow 2/3.**

**v2.3:** Kiểm soát feasibility/deployment, Customer PER_TRIP và booking version.

**v2.4:** Bảo hiểm chỉ là checklist item do Specialist xác nhận thủ công sau khi công ty thu xếp ngoài hệ thống; không có InsurancePolicy/upload/verify API riêng (đồng bộ Flow 2 v1.3 và Flow 3 v1.3).

**v2.5 (REOPENED):** Tách hạn ký/cọc, hạn hồ sơ và hạn bàn giao; cảnh báo Manager ngay khi ETA mới vượt hạn hợp đồng; không tự sửa hợp đồng đã ký hoặc tự hủy Trip; đồng bộ logic impact assessment Flow 2 v1.4 / Flow 3 v1.4. Chưa tái khóa.
