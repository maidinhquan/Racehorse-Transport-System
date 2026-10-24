## Quyết định Flow 1 hiện hành — 24/10/2026

- Chỉ thu tiền qua VNPAY. Tạo phiên → Customer thanh toán → backend xác minh IPN → cập nhật PAYMENT/INVOICE trong transaction → đủ cọc đúng version mới mở OTP. Return không xác nhận tiền. Không có API Manager confirm/reject thanh toán thủ công.
- Theo dõi tiến độ bằng status hiện tại; không xây timeline history hoặc audit riêng. Chỉ giữ metadata nghiệp vụ cần thiết: feedback gần nhất, trạng thái trước hủy, xác nhận điều khoản, metadata phát hành/ký/gia hạn/triển khai. Collection history/revisions/deadlineHistory/extensions cũ được bỏ khỏi DTO Flow 1.
- ContentSnapshot lưu đầy đủ một hợp đồng hoàn chỉnh: số hợp đồng/version, ngày phát hành, bên cung cấp và Customer, thông tin liên hệ, danh sách ngựa, nơi nhận/giao và người nhận, tuyến/mode/lịch trình, chăm sóc, toàn bộ khoản giá/thuế/phí nếu áp dụng, tổng giá, tiền/tỷ lệ cọc, nghĩa vụ thanh toán, thời hạn, mọi điều khoản/phụ lục và giá trị policy đã áp dụng. Không bỏ trường thuộc hợp đồng; dữ liệu không áp dụng thể hiện rõ. PDF thể hiện cùng nội dung và được giữ theo version. Không dựng lại bản cũ từ master hiện tại. Bản phát hành/ký bất biến; sửa nội dung tạo version mới. Giá vốn nội bộ và OTP/hash không thuộc bản hợp đồng Customer.
- fileType dùng chung photo/passport/ownership/value-proof. Không coi đây là mã ID. Hồ sơ y tế theo đơn dùng API documents.
- Refund Flow 1 chỉ ghi nhận status thủ công; không thực hiện chuyển tiền hoặc tuyên bố hệ thống đã hoàn tiền. Không yêu cầu audit/chứng từ mới.
- Đây là thiết kế đích và SQL mẫu Reviewed, không xác nhận backend/FE hoặc database đang chạy đã được cập nhật.

# Bản đã đối chiếu với SQL Reviewed

File đi kèm: `HorseTransportDB.sql`, tạo database riêng `HorseTransportDB_Reviewed`. Hai file gốc được giữ nguyên.

# Quy tắc mã định danh database

Tài liệu thống nhất cách đặt mã giữa backend, frontend và dữ liệu mẫu của nhóm. Phạm vi gồm toàn bộ **37 bảng** hiện có trong `HorseTransportDB.sql`. Mục tiêu là nhìn mã biết đối tượng, dễ đọc và dễ trao đổi khi demo.

Quy chuẩn ID đã được áp dụng vào SQL mẫu `HorseTransportDB.sql`, gồm khóa chính, khóa ngoại, tham chiếu trong thông báo và JSON. Backend/frontend và logic sinh mã chưa được cập nhật trong lần thay đổi SQL này.

## 1. Quy tắc chung

Mã nội bộ dạng chuỗi dùng mẫu:

```text
<TIỀN_TỐ>_<SỐ_THỨ_TỰ>

USER_001
HORSE_001
REQUEST_001
CONTRACT_001
```

1. Tiền tố dùng đúng bảng quy định bên dưới, viết HOA, không dấu, phân tách từ bằng `_`.
2. Số thứ tự bắt đầu từ `1`, hiển thị tối thiểu ba chữ số: `001`, `002`, ..., `999`, `1000`, `1001`.
3. Không giới hạn hệ thống ở 999 bản ghi. Ba chữ số là độ rộng tối thiểu, không phải tối đa.
4. Mỗi bảng có dãy số riêng. Ví dụ `USER_001` và `HORSE_001` là hai đối tượng khác nhau, hợp lệ.
5. Không thêm năm, ngày, tên người, số điện thoại hoặc vai trò vào mã. Những thông tin đó lưu ở cột nghiệp vụ tương ứng.
6. Mã đã tạo không được đổi. Không đánh lại số khi xóa dữ liệu hoặc đổi thứ tự hiển thị.
7. Cho phép khoảng trống trong dãy ID. Không tái sử dụng số đã cấp, kể cả sau xóa thật; không đánh lại số để lấp khoảng trống. Backend dùng bộ cấp số tăng dần và không reset về số cũ.
8. Backend tự cấp mã; người dùng không nhập hoặc sửa mã trong form. Frontend chỉ nhận mã do backend trả về và dùng nguyên giá trị đó.
9. PK/FK phải lưu cùng một mã, không tự đổi format ở từng màn hình hoặc từng API.
10. Không thêm cột mã hiển thị thứ hai chỉ để lặp lại ID. Trường hợp số chứng từ bên ngoài có ý nghĩa độc lập được giữ theo mục 5.

Ví dụ không dùng:

```text
USR_CUST_01       -- dùng USER_001; Customer là Role
HRS_001           -- dùng HORSE_001
REQ_2026_001      -- dùng REQUEST_001
CTR_2026_001      -- dùng CONTRACT_001
USER_NGUYENVANA   -- tên là dữ liệu thay đổi được, không thuộc ID
```

## 2. Mã khóa chính và bộ cấp mã của toàn bộ 37 bảng

| STT | Bảng | PK | Prefix / cách lưu | ID tiếp theo sau seed |
|---|---|---|---|---|
| 1 | `USER` | `UserID` | `USER` | `USER_011` |
| 2 | `HORSE` | `HorseID` | `HORSE` | `HORSE_006` |
| 3 | `STAFF_DOCUMENT` | `DocumentID` | `STAFF_DOCUMENT` | `STAFF_DOCUMENT_006` |
| 4 | `NOTIFICATION` | `NotificationID` | `NOTIFICATION` | `NOTIFICATION_005` |
| 5 | `POLICY_AND_TERM` | `PolicyID` | `POLICY_TERM` | `POLICY_TERM_003` |
| 6 | `PARTNER_FACILITY` | `FacilityID` | `FACILITY` | `FACILITY_006` |
| 7 | `FACILITY_CONTRACT` | `FacilityContractID` | `FACILITY_CONTRACT` | `FACILITY_CONTRACT_005` |
| 8 | `FACILITY_CERTIFICATION` | `CertID` | `FACILITY_CERTIFICATION` | `FACILITY_CERTIFICATION_004` |
| 9 | `TRANSPORT_REQUEST` | `RequestID` | `REQUEST` | `REQUEST_005` |
| 10 | `REQUEST_HORSE_MAPPING` | `(RequestID, HorseID)` | `Khóa ghép` | `Không có ID/Sequence riêng` |
| 11 | `LEGAL_MEDICAL_RECORD` | `RecordID` | `LEGAL_MEDICAL_RECORD` | `LEGAL_MEDICAL_RECORD_007` |
| 12 | `QUARANTINE_BOOKING` | `BookingID` | `QUARANTINE_BOOKING` | `QUARANTINE_BOOKING_003` |
| 13 | `TRIP_PLAN` | `TripID` | `TRIP` | `TRIP_004` |
| 14 | `VEHICLE` | `VehicleID` | `VEHICLE` | `VEHICLE_004` |
| 15 | `TRIP_VEHICLE_ASSIGNMENT` | `AssignmentID` | `TRIP_ASSIGNMENT` | `TRIP_ASSIGNMENT_004` |
| 16 | `ROUTE_SEGMENT` | `SegmentID` | `ROUTE_SEGMENT` | `ROUTE_SEGMENT_008` |
| 17 | `FLIGHT_BOOKING` | `FlightBookingID` | `INT IDENTITY(1,1)` | `SQL IDENTITY; seed có 300` |
| 18 | `CUSTOMS_CLEARANCE` | `ClearanceID` | `CUSTOMS_CLEARANCE` | `CUSTOMS_CLEARANCE_003` |
| 19 | `HEALTH_LOG` | `LogID` | `HEALTH_LOG` | `HEALTH_LOG_005` |
| 20 | `INCIDENT` | `IncidentID` | `INCIDENT` | `INCIDENT_003` |
| 21 | `HANDOVER` | `HandoverID` | `HANDOVER` | `HANDOVER_006` |
| 22 | `HANDOVER_ITEM` | `HandoverItemID` | `HANDOVER_ITEM` | `HANDOVER_ITEM_006` |
| 23 | `CONTRACT_TEMPLATE` | `TemplateID` | `CONTRACT_TEMPLATE` | `CONTRACT_TEMPLATE_013` |
| 24 | `CONTRACT` | `ContractID` | `CONTRACT` | `CONTRACT_004` |
| 25 | `CONTRACT_VERSION` | `(ContractID, VersionNo)` | `Khóa ghép` | `VersionNo tăng trong mỗi Contract` |
| 26 | `COST_ITEM` | `CostItemID` | `COST_ITEM` | `COST_ITEM_005` |
| 27 | `INVOICE` | `InvoiceID` | `INVOICE` | `INVOICE_006` |
| 28 | `PAYMENT` | `PaymentID` | `PAYMENT` | `PAYMENT_005` |
| 29 | `COST_RATE` | `CostRateID` | `COST_RATE` | `COST_RATE_011` |
| 30 | `COUNTRY` | `CountryCode` | `ISO alpha-2` | `VN, JP` |
| 31 | `SUPPORTED_ROUTE` | `RouteID` | `ROUTE` | `ROUTE_004` |
| 32 | `BUSINESS_POLICY` | `PolicyID` | `BUSINESS_POLICY` | `BUSINESS_POLICY_012` |
| 33 | `HANDOVER_REVISION` | `HandoverRevisionID` | `HANDOVER_REVISION` | `HANDOVER_REVISION_003` |
| 34 | `TRIP_SETTLEMENT` | `SettlementID` | `SETTLEMENT` | `SETTLEMENT_003` |
| 35 | `SETTLEMENT_ADJUSTMENT` | `AdjustmentID` | `SETTLEMENT_ADJUSTMENT` | `SETTLEMENT_ADJUSTMENT_001` |
| 36 | `CUSTOMER_CASE` | `CaseID` | `CUSTOMER_CASE` | `CUSTOMER_CASE_002` |
| 37 | `CUSTOMER_FEEDBACK` | `FeedbackID` | `CUSTOMER_FEEDBACK` | `CUSTOMER_FEEDBACK_002` |

ID tiếp theo là giá trị trong file tạo database mới sau fixture, không phải số cấp phát hiện tại của database đang chạy. Mọi Sequence NO CYCLE, có khoảng trống hợp lệ và không tái sử dụng sau xóa/rollback.

### Lưu ý riêng về FLIGHT_BOOKING

FlightBookingID giữ nguyên INT IDENTITY(1,1), ngoại lệ với quy tắc ID chuỗi. Không đổi sang VARCHAR và không cấp mã FLIGHT_BOOKING_001. Seed giữ ID số 300, dùng SET IDENTITY_INSERT ON/OFF khi chèn số cụ thể.

TripID và HorseIds JSON trong booking vẫn tham chiếu đúng mã TRIP_* và HORSE_* đã thống nhất. Các trường RouteVersionID và airport checkpoint cũng giữ kiểu số hiện có. Không thêm FlightBookingCode.

## 3. Khóa ngoại dùng nguyên mã của bảng đích

Tên cột có thể mô tả vai trò, nhưng giá trị phải theo ID của đối tượng thực tế.

| Cột hoặc nhóm cột | Mã cần dùng | Ví dụ |
|---|---|---|
| `OwnerID`, `CustomerID`, `CreatedBy`, `UpdatedBy`, `PublishedBy` | `USER_*` | `USER_001` |
| `AssignedSpecialistId`, `AssignedCoordinatorId` | `USER_*` | `USER_005` |
| `DriverID`, `EscortID`, `HandedByUserID` | `USER_*` | `USER_008` |
| `VerifiedBy`, `ApprovedBy`, `ConfirmedByUserID`, `FinancialReviewedBy`, `CancellationDecidedBy` | `USER_*` nếu có actor người dùng | `USER_003` |
| `RequestID` | `REQUEST_*` | `REQUEST_001` |
| `HorseID` | `HORSE_*` | `HORSE_001` |
| `TripID` | `TRIP_*` | `TRIP_001` |
| `ContractID` | `CONTRACT_*` | `CONTRACT_001` |
| `InvoiceID` | `INVOICE_*` | `INVOICE_001` |
| `FacilityID` | `FACILITY_*` | `FACILITY_001` |
| `VehicleID` | `VEHICLE_*` | `VEHICLE_001` |
| `SegmentID` | `ROUTE_SEGMENT_*` | `ROUTE_SEGMENT_001` |
| `HandoverID` | `HANDOVER_*` | `HANDOVER_001` |
| `OriginCountry`, `DestinationCountry` của tuyến/request | Mã ISO alpha-2 | `VN`, `JP` |

Không tạo các mã như `CUSTOMER_001`, `MANAGER_001`, `DRIVER_001`, `SPECIALIST_001` chỉ vì người đó có vai trò tương ứng. Tất cả đều là dòng trong `USER`; vai trò nằm ở `Role`.

Actor hệ thống như literal `SYSTEM` hiện có trong `DeploymentBy` không phải `UserID`. Backend phải phân biệt actor hệ thống và người dùng, không coi mọi actor là FK hợp lệ tới USER. Tài liệu này không tự thêm FK cho các cột hiện chưa có.

## 4. Khóa ghép và phiên bản

### REQUEST_HORSE_MAPPING

```text
RequestID = REQUEST_001
HorseID   = HORSE_001
```

Hai cột tạo thành khóa chính. Không thêm lại `RequestHorseID`, không ghép chuỗi thành `REQUEST_001_HORSE_001` để lưu làm khóa thứ ba.

### CONTRACT_VERSION

```text
ContractID = CONTRACT_001
VersionNo  = 1

ContractID = CONTRACT_001
VersionNo  = 2
```

- Cùng một hợp đồng luôn giữ `ContractID`; bản sửa tăng `VersionNo` trong phạm vi hợp đồng đó.
- `VersionNo` lưu số nguyên `1`, `2`, ... Không lưu chuỗi `V01` vào cột INT.
- Giao diện có thể hiển thị `CONTRACT_001 / V01`, `CONTRACT_001 / V02`.
- `CONTRACT.CurrentVersionNo` và `INVOICE.ContractVersionNo` phải chứa đúng số bản tương ứng.
- Không tạo `ContractVersionID`, không thêm lại `ContractCode` trong thiết kế hiện tại.
- `BookingVersion` cũng là số phiên bản nghiệp vụ của booking, không thay thế mã booking và không phải RowVersion.

## 5. Mã danh mục và số chứng từ bên ngoài

Không áp dụng mẫu số thứ tự cho mọi cột có chữ `Code`.

| Cột | Quy tắc |
|---|---|
| `COUNTRY.CountryCode` | ISO alpha-2 như `VN`, `JP`. Không dùng `COUNTRY_001`. |
| `COST_RATE.Code` | Mã nghiệp vụ dễ hiểu như `ROAD_KM`, `AIR_HORSE`, `INSURANCE_RATE`. `CostRateID` vẫn là `COST_RATE_001`. |
| `BUSINESS_POLICY.Code` | Mã tham số như `MIN_PREPARATION_DAYS`, `SIGN_OTP_MAX_ATTEMPTS`. `PolicyID` vẫn là `BUSINESS_POLICY_001`. |
| `CurrencyCode` | `VND` trong toàn hệ thống hiện tại. |
| `TransportMode` / `TransportType` | Mã phương thức thống nhất như `ROAD`, `AIR`; không phải mã tuyến. |
| `FACILITY_CONTRACT.ContractCode` | Số hợp đồng thương mại của đối tác nếu có; khác ID nội bộ `FacilityContractID`. Không áp dụng việc bỏ ContractCode của bảng CONTRACT sang bảng này. |
| `Microchip_ISO`, `FEI_Passport_No` | Mã định danh/chứng từ thật của ngựa; giữ giá trị từ hồ sơ, không sinh theo số thứ tự nội bộ. |
| `FlightNumber`, `Flight_Voyage_No`, `BookingReference`, `ConfirmationNumber` | Mã/số do hãng hoặc đối tác cấp; không đổi sang ID nội bộ. |
| `TransactionCode`, `VnpayTmnCode`, `DeclarationNumber` | Mã từ cổng thanh toán/đơn vị bên ngoài; lưu nguyên giá trị hợp lệ. |
| `SubmissionKeyHash`, `SignOtpHash` | Giá trị kỹ thuật được tính/băm; không đổi thành mã dễ đọc theo dãy số. |

Seed `CountryOfIssue` và `ValidForCountries` đã dùng mapping rõ ràng: `VNM → VN`, `LAO → LA`, `THA → TH`, `KHM → KH`. Đây không tự thêm các nước vào danh sách hỗ trợ của COUNTRY/SUPPORTED_ROUTE.

### 5.1. Phân biệt mã nghiệp vụ và chữ hiển thị

- Mã do hệ thống quản lý dùng `UPPER_SNAKE_CASE`: chữ HOA không dấu, từ có nghĩa, ngăn cách bằng `_`. Ví dụ `MIN_PREPARATION_DAYS`.
- Mã dùng để tra cứu/điều khiển không thêm đuôi `_001`. Đuôi số thứ tự dành cho ID của dòng dữ liệu ở mục 2.
- Nhãn giao diện có thể là tiếng Việt: `MIN_PREPARATION_DAYS` hiển thị “Số ngày chuẩn bị tối thiểu”. Đổi nhãn không đổi Code.
- Khi một mã đã được dữ liệu hoặc code tham chiếu, không sửa tên mã như sửa nhãn. Nếu cần đổi phải cập nhật có kiểm soát mọi caller, dữ liệu seed và validation liên quan.
- Không ép tên người, địa chỉ, giống ngựa, ghi chú sức khỏe, nội dung phản hồi hoặc số chứng từ thật thành mã viết HOA.
- Cùng một mã trạng thái như `PENDING` có thể xuất hiện ở nhiều bảng nhưng mang ý nghĩa theo bảng. Không coi mọi cột `Status` có chung một state machine.

### 5.2. Toàn bộ mã tham số đang seed trong BUSINESS_POLICY

Hiện có **10 Code khác nhau, 11 dòng policy**, vì `MIN_PREPARATION_DAYS` có giá trị toàn cục và riêng nước đích JP. Bảng dưới là danh sách đã có trong SQL mẫu, không phải danh sách mọi tham số có thể thêm về sau.

| Code | ValueType | Unit | Chức năng |
|---|---|---|---|
| `MIN_PREPARATION_DAYS` | `NUMBER` | `DAY` | Số ngày chuẩn bị tối thiểu, có thể khác nhau theo scope |
| `CONTRACT_DEADLINE_HOURS` | `NUMBER` | `HOUR` | Hạn chung cho cọc, xác minh cọc và ký |
| `DEFAULT_DEPOSIT_PERCENT` | `NUMBER` | `PERCENT` | Tỷ lệ cọc mặc định; `40` là 40% |
| `SIGN_OTP_TTL_MINUTES` | `NUMBER` | `MINUTE` | Hiệu lực OTP ký |
| `SIGN_OTP_RESEND_SECONDS` | `NUMBER` | `SECOND` | Khoảng chờ cấp lại OTP |
| `SIGN_OTP_MAX_ATTEMPTS` | `NUMBER` | `ATTEMPT` | Số lần nhập sai tối đa |
| `FEEDBACK_WINDOW_HOURS` | `NUMBER` | `HOUR` | Thời lượng cửa sổ feedback |
| `HANDOVER_OTP_TTL_MINUTES` | `NUMBER` | `MINUTE` | Hiệu lực OTP bàn giao, seed 5 |
| `HANDOVER_OTP_RESEND_SECONDS` | `NUMBER` | `SECOND` | Chờ gửi lại OTP bàn giao, seed 60 |
| `HANDOVER_OTP_MAX_ATTEMPTS` | `NUMBER` | `ATTEMPT` | Giới hạn lần sai OTP bàn giao, seed 5 |

Quy tắc bổ sung:

- `ValueType` hiện được CHECK SQL cho phép đúng `NUMBER`, `TEXT`, `BOOLEAN`. Mỗi dòng chỉ dùng một cột giá trị phù hợp.
- Các `Unit` đang sử dụng là `DAY`, `HOUR`, `MINUTE`, `SECOND`, `PERCENT`, `ATTEMPT`. Tham số không có đơn vị dùng NULL, không trộn chuỗi rỗng với các mã `NONE`/`N/A` tự đặt.
- Tham số thời lượng phải thống nhất đơn vị, số nguyên/phân số và cách tính thời gian. Không đổi giá trị 24 giờ thành 24 phút do UI hoặc backend diễn giải khác nhau.
- Số lần thử và ngày chuẩn bị phải được backend kiểm tra miền giá trị đúng nghiệp vụ. Kiểu NUMBER lưu được số thập phân không đồng nghĩa mọi policy đều cho phép số lẻ.
- Thêm Code vào database chưa đủ tạo ra một quy tắc mới: backend phải biết Code có ý nghĩa gì, đọc nó ở đâu và validate như thế nào.

### 5.3. Toàn bộ mã đơn giá đang seed trong COST_RATE

| Code | CostGroup | CalculationUnit | Ý nghĩa |
|---|---|---|---|
| `ROAD_KM` | `TRANSPORT` | `KM_VEHICLE` | Chi phí theo km và xe |
| `AIR_HORSE` | `TRANSPORT` | `HORSE` | Chi phí hàng không theo ngựa |
| `STABLE_NIGHT` | `TRANSPORT` | `HORSE_NIGHT` | Phí chuồng theo ngựa và đêm |
| `CREW_DAY` | `CREW` | `PERSON_DAY` | Nhân sự theo người và ngày |
| `PERMIT_TRIP` | `PERMIT` | `TRIP` | Hồ sơ/phí theo chuyến |
| `PERMIT_HORSE` | `PERMIT` | `HORSE` | Hồ sơ/phí theo ngựa |
| `VET_DAY` | `VET` | `PERSON_DAY` | Thú y theo người và ngày |
| `CARE_DAY` | `VET` | `HORSE_DAY` | Chăm sóc theo ngựa và ngày |
| `INSURANCE_MIN` | `INSURANCE` | `TRIP` | Mức phí bảo hiểm tối thiểu |
| `INSURANCE_RATE` | `INSURANCE` | `VALUE_RATIO` | Tỷ lệ theo giá trị khai báo |

Quy ước dùng chung:

- Năm `CostGroup` hiện SQL chấp nhận: `TRANSPORT`, `CREW`, `PERMIT`, `VET`, `INSURANCE`.
- `Rate` của `INSURANCE_RATE` là tỷ lệ: `0.005` là 0,5%. Không đổi thành `0.5` hoặc hiểu là số tiền chỉ vì CurrencyCode của bảng là VND.
- `DepositRateStandard` và policy `DEFAULT_DEPOSIT_PERCENT` dùng phần trăm: `40` là 40%. Hai cách biểu diễn khác nhau phải được ghi rõ, không tự quy đổi bằng suy đoán.
- Backend hiện dùng `COST_ITEM.SubcodeName` là `PLANNED_TRANSPORT`, `PLANNED_CREW`, `PLANNED_PERMIT`, `PLANNED_VET`, `PLANNED_INSURANCE` cho năm dòng giá dự kiến. Đây là mã khoản mục, không phải `CostItemID`.
- `COST_ITEM.Bearer` hiện seed có `COMPANY`, `CUSTOMER`, nhưng service Flow 1 còn ghi `CT`. Nhóm cần thống nhất lại ý nghĩa trước khi bỏ alias; không tự mặc định `CT` tương đương một bên bất kỳ.
- Nếu muốn loại khoản mục tùy biến, không dùng `CategoryName` vừa làm nhãn tiếng Việt vừa làm mã ổn định cho logic. Phải thống nhất cột chứa code và cột/nơi chứa nhãn khi triển khai; tài liệu này không tự thêm cột.

### 5.4. Mã có tập giá trị được SQL giới hạn rõ

| Cột | Tập mã hiện CHECK SQL chấp nhận | Ghi chú |
|---|---|---|
| `BUSINESS_POLICY.ValueType` | `NUMBER`, `TEXT`, `BOOLEAN` | Quyết định cột giá trị được dùng |
| `BUSINESS_POLICY.ScopeType` | `GLOBAL`, `COUNTRY`, `TRANSPORT_MODE` | Không dùng ROUTE hoặc ROUTE_MODE làm scope policy |
| `CONTRACT_VERSION.VersionStatus` | `DRAFT`, `ISSUED`, `SUPERSEDED`, `SIGNED`, `CANCELLED` | Trạng thái của một phiên bản, khác vòng đời hợp đồng tổng |
| `TRIP_PLAN.DeploymentStatus` | `PENDING`, `CONFIRMED`, `ON_HOLD`; cho phép NULL | CHECK hợp nhất; CONFIRMED/ON_HOLD giữ HandoffEventId và metadata; PENDING không có event |
| `CONTRACT.CancellationStatus` | `PENDING`, `REJECTED`, `APPROVED`; cho phép NULL | Đi cùng dữ liệu yêu cầu/quyết định hủy |
| `CONTRACT.FeedbackStatus` | `PENDING`, `ACCEPTED`, `REJECTED`; cho phép NULL | Phản hồi sửa hợp đồng trước ký, không phải feedback sau chuyến |
| `CONTRACT.RefundStatus` | `REQUESTED`, `PROCESSING`, `COMPLETED`; cho phép NULL | Phân biệt đề nghị hoàn và hoàn xong |
| Các bảng có `CurrencyCode` | `VND` | Giới hạn tiền tệ đã thống nhất |
| `COST_RATE.CostGroup` | `TRANSPORT`, `CREW`, `PERMIT`, `VET`, `INSURANCE` | Nhóm chi phí hiện có |
| `PAYMENT.Status` khi có `VnpayTmnCode` | `PENDING_GATEWAY`, `SUCCESS`, `FAILED`, `REVIEW_REQUIRED` | CHECK nhánh VNPAY; không suy thành toàn bộ trạng thái của mọi phương thức |
| `HANDOVER_REVISION.Status` | `DRAFT`, `AWAITING_OTP`, `CONFIRMED`, `REFUSED` | CHECK; metadata OTP theo phase, bản finalized bất biến |
| `TRIP_SETTLEMENT.Status` | `DRAFT`, `AWAITING_PAYMENT`, `SETTLED`, `CLOSED` | CHECK; giữ hai mốc feedback hiện hành |
| `SETTLEMENT_ADJUSTMENT.RefundStatus` | `REQUESTED`, `PROCESSING`, `COMPLETED`; cho NULL | CHECK theo type REFUND và chứng từ; adjustment không có Status/Bearer |
| `CUSTOMER_CASE.Status` | `OPEN`, `IN_PROGRESS`, `RESOLVED` | CHECK; Manager phản hồi rồi RESOLVED, không cần Customer xác nhận |

Các CHECK này mô tả schema hiện tại. Tập giá trị được chấp nhận không tự mô tả thứ tự chuyển trạng thái hoặc quyền thực hiện, vẫn cần state transition của nghiệp vụ.

### 5.5. Các nhóm mã còn phải thống nhất giữa các thành viên

Danh sách sau bao phủ các nhóm phân loại/trạng thái còn lại trong SQL. **Ví dụ từ seed hoặc source không được hiểu là bộ giá trị cuối cùng đã được nhóm phê duyệt.** Với các cột chưa có CHECK/catalog đầy đủ, nhóm sở hữu flow phải chốt danh mục trước khi sửa hàng loạt dữ liệu.

| Bảng/cột | Hiện trạng và yêu cầu thống nhất |
|---|---|
| `USER.Role` | Source hiện chuẩn hóa về `CUSTOMER`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `DRIVER_ESCORT`, `ADMIN`. Seed đã đồng bộ các vai trò này; Driver và Escort dùng `DRIVER_ESCORT` theo source hiện tại. Khi tách nhiệm vụ tài xế, Escort, bác sĩ theo SRS, nhóm cần chốt quyền và mã vai trò tương ứng, không tự thêm role vào một client riêng. |
| `HORSE.Sex` | Flow 1 dùng `STALLION`, `MARE`, `GELDING`; seed đã đồng bộ cách viết HOA này. |
| `HORSE.ReproductiveStatus` | Seed đã chuẩn hóa thành `INTACT`, `GELDED`, `PREGNANT`, `NOT_PREGNANT`. Nhóm cần giữ thống nhất ý nghĩa và validation với Sex. |
| `STAFF_DOCUMENT.DocType` | Ví dụ `PASSPORT`, `VISA`, `DRIVING_LICENSE`. Không dùng số thứ tự làm code loại giấy tờ. |
| `STAFF_DOCUMENT.Status` | Seed có `VALID`, `EXPIRING_SOON`; nhóm hồ sơ chốt thêm các trạng thái xét duyệt nếu cần, tránh trạng thái còn hợp lệ nhưng ngày hết hạn đã qua. |
| `NOTIFICATION.Type` | Là mã sự kiện như `REQUEST_ACCEPTED`, `CONTRACT_OTP`; seed có ORDER_STATUS/TRIP_ASSIGN/DOC_WARNING/INCIDENT. Cần bảng quy ước sự kiện, đối tượng ReferenceID và người nhận, không dùng tùy ý một chữ Type cho mọi luồng. |
| `NOTIFICATION.Channel` | Source Flow 1 dùng `IN_APP`, `EMAIL`; seed có APP_PUSH/WEB_ALERT/SMS. Phải xác định đó là kênh thật hay tên cũ; không tự đồng nhất SMS với email hoặc push với in-app. |
| `POLICY_AND_TERM.PolicyType` | Ví dụ `TERMS_OF_SERVICE`, `TRANSPORT_RULE`, `CUSTOMS_GUIDE`. Đây là loại nội dung pháp lý, không phải BUSINESS_POLICY.Code. |
| `POLICY_AND_TERM.Version` | Là chuỗi phiên bản nội dung, hiện ví dụ `v1.0`, `v2.1`; không phải ID và không áp dụng hậu tố `_001`. Giữ một format phiên bản nội dung đã chốt. |
| `PARTNER_FACILITY.FacilityType` | Ví dụ `VET_CLINIC`, `REST_STATION`, `QUARANTINE`; nhãn tiếng Việt không thay code. |
| `PARTNER_FACILITY.Status`, `FACILITY_CONTRACT.Status` | Seed đang có `ACTIVE`. Vòng đời cơ sở và hợp đồng đối tác phải được chốt riêng, không suy toàn bộ từ IsActive của bảng khác. |
| `TRANSPORT_REQUEST.TransportType`, `SUPPORTED_ROUTE.TransportMode`, `ROUTE_SEGMENT.TransportMode` | Thống nhất phương thức `ROAD`, `AIR` trong phạm vi demo. Seed mới chỉ dùng ROAD/AIR. Request AIR có thể có chặng ROAD tiếp cận sân bay; không vì vậy đổi mode chính thành MULTIMODAL_INTL. SEA trong comment không chứng minh app hỗ trợ. |
| `TRANSPORT_REQUEST.Status` | Danh mục hiện hành theo DATABASE_STATUS_CONVENTION: DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, CONTRACT_PREPARATION, CONTRACT_READY, CONTRACT_CHANGES_REQUESTED, DEPOSIT_VERIFIED, CANCELLATION_REQUESTED, ACTIVATED, SCHEDULED, IN_PROGRESS, DELIVERED, CLOSED, REJECTED, CANCELLED. Trip vẫn dùng IN_TRANSIT/COMPLETED riêng. |
| `LEGAL_MEDICAL_RECORD.DocumentType` | Seed có `COGGINS_TEST`, `DOMESTIC_VET_PASS`, `EQUINE_FLU_VAX`; source có `BASELINE_MEDICAL` và nhóm file chung khác. Phân biệt loại tài liệu, loại upload và trường file; chưa có catalog chung đầy đủ. |
| `LEGAL_MEDICAL_RECORD.RequirementStatus` | Seed có `MANDATORY`. Cần chốt bắt buộc/tùy chọn/không áp dụng, tách biệt trạng thái thẩm định. |
| `LEGAL_MEDICAL_RECORD.DocumentStatus` | Seed có `VERIFIED`, `EXPIRED`; bổ sung/chuẩn hóa theo quy trình hồ sơ, không coi upload là đã duyệt. |
| `QUARANTINE_BOOKING.Status` | Seed có `COMPLETED`; nhóm hồ sơ phải định nghĩa vòng đời đặt chỗ/cách ly. |
| `TRIP_PLAN.Status` | Code Flow 1 có `PLANNING`, `READY_TO_DEPART`; seed có `IN_TRANSIT`, `COMPLETED`. Danh mục toàn chuyến thuộc các flow phối hợp, không dùng DeploymentStatus thay thế. |
| `VEHICLE.Type` | Seed có HORSEBOX_2_STALLS/3_STALLS/6_STALLS. Cần phân biệt loại xe với sức chứa CapacityStalls, không suy sức chứa bằng cách tách chuỗi Type. |
| `VEHICLE.Status` | Seed có `AVAILABLE`, `ON_TRIP`, `MAINTENANCE`; nhóm đội xe chốt vòng đời sử dụng. |
| `ROUTE_SEGMENT.SegmentType` | Ví dụ `BORDER_CHECK`, `DESTINATION`, `QUARANTINE_STOP`, `REST_STOP`; khác TransportMode. |
| `ROUTE_SEGMENT.Status` | Seed có `IN_PROGRESS`, `COMPLETED`; nhóm hành trình chốt điều kiện chuyển mốc. |
| `CUSTOMS_CLEARANCE.DocumentType` | Ví dụ `EXPORT`, `IMPORT`, `ATA_CARNET`; không tự dùng chung bộ mã hồ sơ thú y. |
| `CUSTOMS_CLEARANCE.Status` | Seed có `CLEARED`; cần giữ/từ chối/chờ nếu nghiệp vụ yêu cầu, danh mục do nhóm pháp lý chốt. |
| `HEALTH_LOG.LogType` | Seed có `TRANSIT_CHECK`; chốt riêng loại lần ghi nhận, không dùng HealthStatus thay LogType. |
| `INCIDENT.IncidentType`, `INCIDENT.Status` | Ví dụ loại TIRE_PUNCTURE/EQUINE_STRESS và trạng thái RESOLVED trong seed. Cần danh mục sự cố/vòng đời chung; OTHER chỉ dùng khi nhóm đã hỗ trợ. |
| `HANDOVER.Type`, `HANDOVER.Status` | Type PICKUP/DELIVERY; Status DRAFT, AWAITING_OTP, CONFIRMED, REFUSED theo quy ước. Người nhận xác nhận OTP đúng revision; không ký ảnh. |
| `CONTRACT_TEMPLATE.LanguageCode` | Seed mới chỉ có VI; EN hoặc ngôn ngữ khác cần điều khoản dịch và renderer tương ứng, không trộn hai ngôn ngữ vào snapshot. |
| `CONTRACT.ContractStatus` | DRAFT, ISSUED, EFFECTIVE, SETTLED, CLOSED, CANCELLED theo quy ước đích. Seed hiện dùng EFFECTIVE/CLOSED; không dùng EXECUTING cho dữ liệu mới. Version ký vẫn SIGNED. |
| `INVOICE.InvoiceType` | Seed mới dùng DEPOSIT và FINAL_SETTLEMENT; tỷ lệ nằm ở giá trị hợp đồng, không gắn vào mã loại. Backend/index phải cùng sử dụng các mã này. |
| `INVOICE.PaymentStatus` | UNPAID, PARTIALLY_PAID, PAID, CANCELLED. CANCELLED là hủy hóa đơn, không hủy Trip/Contract. Chỉ hóa đơn cuối không CANCELLED bị unique theo Contract/version. |
| `PAYMENT.Method` | Chỉ VNPAY; PAYMENT.Method NOT NULL theo CHECK nghiệp vụ. SUCCESS chỉ do backend xác minh IPN, không có xác nhận/từ chối thu tiền thủ công. Seed VNPay là dữ liệu minh họa, không phải giao dịch thực. |
| `PAYMENT.Status` | Có thể bị ràng buộc theo nhánh cổng thanh toán như mục 5.4; chốt cả trường hợp pending/failed/review và callback lặp. |

Các cột như `Breed`, `Purpose`, `HealthStatus`, `ConditionStatus`, `AssetCheck`, tên hãng và địa điểm hiện chứa thông tin mô tả hoặc văn bản. Nếu nhóm muốn đổi chúng thành dropdown/catalog thì đó là thay đổi thiết kế riêng; không áp uppercase code cho toàn bộ NVARCHAR.

### 5.6. Các mã tiêu chuẩn và kỹ thuật khác

| Cột / nhóm | Cách xử lý |
|---|---|
| `TaxID_BusinessCode` | Mã số thuế/đăng ký của đối tác; không tự sinh mã nội bộ thay giá trị này. |
| `PickupPostalCode`, `DeliveryPostalCode` | Chuỗi mã bưu chính, giữ số 0 đầu nếu có; không chuyển sang số thứ tự hoặc số nguyên. |
| `TimeZone` | Dùng định danh múi giờ mà backend hỗ trợ, ví dụ `Asia/Ho_Chi_Minh`; không viết HOA toàn bộ hoặc coi UTC+7 đủ thay tên múi giờ mọi trường hợp. Seed mới dùng Asia/Ho_Chi_Minh hoặc Asia/Tokyo theo cơ sở. |
| `VnpayBankCode`, `VnpayResponseCode`, `VnpayTransactionStatus` | Giá trị của provider; giữ nguyên mã, kể cả số 0 đầu như `00`. Không chuyển thành int hoặc tự đặt tên thay mã gốc. |
| `ForgotPasswordRequest`, `ResetOtpCode` và token xác thực | Giá trị kỹ thuật theo cơ chế auth, không áp tiền tố ID hoặc sinh tuần tự. |
| `SubmissionKeyHash`, `SignOtpHash` | Giữ đúng thuật toán/encoding đã triển khai. Không gắn tiền tố vào chuỗi hash; SQL ký OTP hiện kiểm tra hex 64 ký tự. |
| Các trường `*Url` / file key | Giữ quy tắc kho file và private access. Không đổi khóa file thành ID dễ đọc nếu storage vẫn dùng tên định danh nội dung. |

Phần 5 là quy tắc đặt tên và bản kiểm kê các chỗ cần thống nhất. Nó **chưa phải tài liệu state machine hoàn chỉnh** cho tất cả flow; các bộ trạng thái chưa được chốt phải được nhóm sở hữu flow xác nhận trước khi ràng buộc SQL hoặc dùng trong UI.

## 6. Mã tham chiếu không phải khóa chính

### BUSINESS_POLICY.ScopeID

| `ScopeType` | Giá trị `ScopeID` | Ý nghĩa |
|---|---|---|
| `COUNTRY` | `JP` | Áp dụng theo quốc gia đích (nước đến) |
| `TRANSPORT_MODE` | `AIR`, `ROAD` | Áp dụng theo phương thức vận chuyển |
| `GLOBAL` | `NULL` | Giá trị mặc định toàn hệ thống |

Không tự sinh một mã ScopeID mới. ScopeID dùng đúng mã quốc gia hoặc phương thức được hỗ trợ. Backend kiểm tra đối tượng và trạng thái phù hợp.

Tra cứu riêng cho cùng một Code theo thứ tự:

```text
COUNTRY → TRANSPORT_MODE → GLOBAL
```

- Không có cấu hình ở mức hiện tại: tìm mức tiếp theo.
- Có cấu hình nhưng sai kiểu dữ liệu, đơn vị, miền giá trị hoặc phạm vi: báo lỗi cấu hình, không âm thầm bỏ qua để fallback.
- Chọn giá trị đầu tiên tồn tại và hợp lệ; không cộng các mức và không tự lấy giá trị lớn nhất.
- Nếu không tìm thấy cấu hình ở mọi mức đối với Code bắt buộc: báo thiếu cấu hình, không tự thay bằng hằng số.
- Tính hợp lệ phải xác định theo từng Code. Ví dụ MIN_PREPARATION_DAYS dùng NUMBER, đơn vị DAY, số nguyên không âm. GLOBAL có ScopeID NULL; COUNTRY là mã nước đến; TRANSPORT_MODE là mã phương thức được hỗ trợ.

Ví dụ tra MIN_PREPARATION_DAYS cho chuyến đến JP bằng AIR:

| ScopeType | ScopeID | Giá trị |
|---|---|---:|
| COUNTRY | JP | 7 ngày |
| TRANSPORT_MODE | AIR | 5 ngày |
| GLOBAL | NULL | 3 ngày |

Backend chọn **7 ngày**. Nếu không có dòng COUNTRY/JP thì chọn 5 ngày của AIR; nếu cũng không có AIR thì chọn 3 ngày GLOBAL. Nếu dòng JP tồn tại nhưng chứa giá trị -7 ngày thì báo lỗi cấu hình.

Bỏ ROUTE khỏi scope policy vẫn giữ bảng SUPPORTED_ROUTE để quản lý chiều tuyến và phương thức được hỗ trợ. Không đổi bảng hay dữ liệu mẫu của các flow khác vì thay đổi này.

ScopeID là tham chiếu đa loại, không có một FK SQL thông thường trỏ đồng thời tới CountryCode và TransportMode. API phải kiểm tra theo ScopeType. Một Code chỉ có một giá trị trong cùng ScopeType/ScopeID, theo unique constraint hiện có.

SQL mẫu đã giới hạn ScopeType còn ba giá trị trên. Thứ tự tra cứu, validation theo Code và cách trả lỗi là yêu cầu cho backend; lần thay đổi này không sửa code backend. Seed hiện có chỉ dùng COUNTRY/GLOBAL, nên không cần đổi hoặc thêm dữ liệu mẫu để áp dụng quy tắc.

### Các mã khác

- `ReferenceID` của thông báo lưu nguyên mã đối tượng liên quan như `REQUEST_001`, `CONTRACT_001`, `TRIP_001`. Backend cần biết loại đối tượng từ loại sự kiện/ngữ cảnh; tiền tố giúp con người đọc, không thay kiểm tra quyền.
- `HorseIds` của booking nếu còn lưu JSON phải chứa mã chuẩn, ví dụ `["HORSE_001", "HORSE_002"]`.
- `HandoffEventId` nếu tiếp tục cấp mã nội bộ dạng dễ đọc dùng `HANDOFF_EVENT_001`; mã này định danh một lần bàn giao, không dùng thay `TripID`.
- `CancellationId` nếu tiếp tục cấp mã nội bộ dạng dễ đọc dùng `CANCELLATION_001`; không dùng thay `ContractID`.
- `FLIGHT_BOOKING.RouteVersionID`, `DepartureAirportCheckpointId`, `ArrivalAirportCheckpointId` hiện là INT và chưa có bảng/FK đích tương ứng trong SQL mẫu. Không tự bịa tiền tố hoặc đổi kiểu của chúng theo tài liệu này; cần thống nhất với nhóm sở hữu dữ liệu route/checkpoint trước.

### Ngữ cảnh tham chiếu và dữ liệu JSON

- `ReferenceID` không có FK đa hình trong schema hiện tại. Backend phải biết từ ngữ cảnh sự kiện ID thuộc bảng nào, kiểm tra đối tượng tồn tại và quyền xem; không chỉ dựa tiền tố để cấp quyền hoặc chọn endpoint tùy ý.
- Các cột user/actor ở mục 3 dùng USER_ID thật khi hành động do người dùng thực hiện. Chỉ dùng SYSTEM ở nơi có hợp đồng dữ liệu cho phép; không gửi SYSTEM vào FK bắt buộc của USER.
- Khi dùng JSON `HorseIds`, mỗi phần tử phải là mã ngựa chuẩn và thuộc request/trip liên quan, không chỉ kiểm tra chuỗi bắt đầu bằng HORSE_.
- `ContentSnapshot` chứa bản chụp theo phiên bản, có thể gồm ID và mã danh mục. Khi tạo data mẫu mới phải dùng bộ mã thống nhất. Với bản đã phát hành/ký thật, không sửa đè snapshot chỉ để đổi mã hiển thị; cần cơ chế chuyển đổi/tra cứu có chủ đích nếu phát sinh nhu cầu đó.
- `CurrentVersionNo`, `ContractVersionNo`, `BookingVersion` và số VersionNo trong snapshot vẫn là số phiên bản. Không thay chúng bằng ID chuỗi hoặc số thứ tự độc lập với đối tượng cha.

## 7. Yêu cầu sinh mã ở backend

1. Có một cách cấp mã dùng chung theo danh sách tiền tố ở mục 2; các service không tự đặt tiền tố khác nhau.
2. SQL mẫu có 33 Sequence BIGINT riêng cho 33 bảng dùng ID chuỗi, cấu hình NO CYCLE, kèm DEFAULT cấp mã. Backend bỏ cột PK khi INSERT và đọc OUTPUT INSERTED.<ID>; không tự sinh bằng MAX hoặc số lượng. FlightBookingID vẫn theo INT IDENTITY; COUNTRY và hai bảng khóa ghép không cần Sequence.
3. Không dùng COUNT(*) + 1, MAX(ID) + 1 hoặc tìm số nhỏ nhất còn trống. Không tái sử dụng mã đã xóa. Sequence có thể bỏ số do rollback, cache hoặc restart; đây là hành vi hợp lệ.
4. Không dựa vào thứ tự chuỗi để tìm số lớn nhất: sau `999` sẽ có `1000`, thứ tự chữ không còn phản ánh đúng thứ tự số.
5. Định dạng số tối thiểu ba chữ số. Trong C# có thể dùng `number.ToString("D3")` rồi ghép với tiền tố đã quy định.
6. Khóa chính/unique constraint trong SQL vẫn là lớp kiểm tra cuối cùng. Không loại bỏ transaction, idempotency hoặc uniqueness vì chỉ có một người demo.
7. Retry một thao tác đã thành công phải trả lại đối tượng có mã cũ, không cấp mã mới rồi tạo trùng dữ liệu.
8. Seed USER_001 đến USER_010 thì bộ cấp số bắt đầu từ 11. Xóa USER_005 không làm cấp lại USER_005. Nhập seed/migration/restore phải kiểm tra bộ cấp số và những số đã cấp, không giảm theo MAX của bản ghi còn tồn tại. Tạo lại toàn bộ database mẫu được bắt đầu lại từ 001.
9. Mã là định danh, không phải bằng chứng người dùng có quyền xem hoặc sửa bản ghi. Backend vẫn kiểm tra chủ sở hữu, vai trò và phân công.

## 8. Cách nhóm áp dụng đồng bộ

1. Giữ tên bảng/cột hiện tại; tài liệu này thống nhất **giá trị mã**, không tự đổi tên cột.
2. Cập nhật PK trong seed và toàn bộ FK/tham chiếu đi kèm. Không chỉ sửa cột ID của bảng cha.
3. Cập nhật ví dụ API, test, JSON snapshot, dữ liệu demo và logic sinh mã có dùng mã cũ.
4. Với số chứng từ ngoài hệ thống, chỉ sửa nếu đó là dữ liệu mẫu cần thay; không đổi chứng từ thật để ép giống ID nội bộ.
5. Khi chuyển seed hợp đồng, phải đồng bộ CONTRACT_VERSION, CurrentVersionNo, INVOICE và PAYMENT theo đúng quan hệ.
6. Giữ FlightBookingID là INT IDENTITY; không áp dụng quy tắc ID chuỗi cho bảng FLIGHT_BOOKING.
7. Không có thay đổi RowVersion, PdfSha256, FeedbackFields hoặc CONFIG_VERSION nào được yêu cầu bởi quy chuẩn mã này.

## 9. Ví dụ một bộ dữ liệu dễ trao đổi

```text
USER_001                    Khách hàng
HORSE_001                   Ngựa của USER_001
REQUEST_001                 Yêu cầu vận chuyển của khách
(REQUEST_001, HORSE_001)    Dòng mapping ngựa
CONTRACT_001                Hợp đồng của REQUEST_001
(CONTRACT_001, 1)          Phiên bản hợp đồng thứ nhất
TRIP_001                    Chuyến được kích hoạt từ yêu cầu
INVOICE_001                 Hóa đơn của CONTRACT_001, phiên bản 1
PAYMENT_001                 Giao dịch cho INVOICE_001
HANDOVER_001                Biên bản giao nhận của TRIP_001
ROUTE_003                   Tuyến VN → JP bằng AIR
BUSINESS_POLICY_001         Dòng tham số cấu hình
```

Nội dung dễ nhắn giữa các thành viên: “Kiểm tra PAYMENT_001 của INVOICE_001, hợp đồng CONTRACT_001 bản 1”. Không cần suy mã khách hàng, năm hoặc vai trò từ ID.

## 10. Hợp đồng dữ liệu Reviewed hiện hành

- Tổng 37 bảng: 32 bảng nền và 5 bảng Flow 6: HANDOVER_REVISION, TRIP_SETTLEMENT, SETTLEMENT_ADJUSTMENT, CUSTOMER_CASE, CUSTOMER_FEEDBACK. Tổng 33 Sequence string ID; FlightBookingID giữ INT IDENTITY, COUNTRY và hai bảng khóa ghép không dùng Sequence.
- SQL Reviewed là script tạo lại database mẫu riêng, không phải migration. Không chạy bản DROP/recreate trên database đang dùng. Các file gốc chưa Reviewed giữ nguyên.
- Hợp đồng tổng EFFECTIVE, version SIGNED là tổ hợp hợp lệ. Request đang vận chuyển IN_PROGRESS; đã giao DELIVERED; hoàn thành vòng đời CLOSED. Trip dùng IN_TRANSIT và COMPLETED riêng. Contract SETTLED chưa đồng nghĩa CLOSED.
- DeploymentStatus: NULL/PENDING/CONFIRMED/ON_HOLD theo CHECK hiện tại. PENDING không có HandoffEventId; CONFIRMED/ON_HOLD có event và metadata. Backend kiểm phân công/vai trò; hold chỉ trước khởi hành, resume không tự duyệt Gate 2.
- HANDOVER giữ IsAuthorized. Giấy tờ từng ngựa lưu HANDOVER_ITEM.DocumentsHandedOver/DocumentsReceivedAtUtc; giấy chung nếu có lưu HANDOVER.DocumentsHandedOver. Revision giữ snapshot/OTP, không có ContentHash/ảnh chữ ký/IsAuthorized lặp.
- SETTLEMENT_ADJUSTMENT không có Status/Bearer. Mỗi dòng do Manager xác nhận trực tiếp; bắt buộc DecidedBy, DecidedAtUtc, DecisionReason. Amount là tiền điều chỉnh VND theo quy ước hệ thống. Chi phí công ty ở COST_ITEM, Bearer trên COST_ITEM không bị xóa.
- OriginalInvoiceID là hóa đơn nguồn; AdjustedInvoiceID/AppliedAtUtc là hóa đơn thay thế đã áp. Hai hóa đơn khác nhau, đúng Contract/version và loại FINAL_SETTLEMENT. Invoice cũ hủy dùng CANCELLED. Refund giữ ngay trên adjustment qua RefundStatus/RefundedBy/RefundedAtUtc/RefundReference; không có bảng refund riêng.
- CUSTOMER_CASE: OPEN → IN_PROGRESS → RESOLVED. Manager ghi ResolutionText, HandledBy, HandledAtUtc, ResolvedAtUtc để phản hồi và đóng; Customer còn ý kiến tạo phiếu mới. Không có bước chờ Customer đồng ý hoặc field CustomerAcceptedAtUtc. Đây là quyết định nhóm mới thay điều kiện đồng ý của SRS cũ; DOCX gốc chưa sửa.
- TRIP_SETTLEMENT giữ FeedbackStartedAtUtc/FeedbackEndsAtUtc; reset đầy đủ thời lượng sau khi các khiếu nại đã được Manager xử lý và nghĩa vụ tiền xong. Không có FEEDBACK_WINDOW/hội thoại/audit riêng Flow 6. Không tự đóng khi còn complaint mở/công nợ.
- CUSTOMER_FEEDBACK giữ đánh giá thường theo settlement, không kéo dài thời hạn hoặc tự thành complaint. SUPPORT sau đóng không tự mở lại đơn.
- BUSINESS_POLICY có 10 Code/11 dòng seed: OTP bàn giao dùng HANDOVER_OTP_TTL_MINUTES, HANDOVER_OTP_RESEND_SECONDS, HANDOVER_OTP_MAX_ATTEMPTS riêng, không dùng mã ký hợp đồng. Sequence policy tiếp theo là BUSINESS_POLICY_012.
- Published/Signed snapshot không sửa đè; OTP hash không phải nội dung/chữ ký và không được log/đưa ra DTO. File seed và email demo không phải chứng từ hoặc xác minh thật.
- Thời gian nghiệp vụ seed là UTC. SQL kiểm FK/CHECK/unique/trigger bất biến; backend vẫn kiểm quyền, tiền, đầy đủ giấy tờ/ngựa, OTP thực tế, chuyển trạng thái liên bảng, retry và tác vụ đóng/reset.

## 11. Tham chiếu kiểm tra

Script tests/Flow6_Reviewed_Checks.sql chạy trên database thử riêng có tên RacehorseF6Review_*. Các kiểm thử lịch sử bản 32 bảng/28 Sequence không dùng để chứng minh schema mới. Bản hiện hành đã được kiểm tra SQL trên database thử; chưa áp dụng database đang chạy hoặc chứng minh API/FE đã triển khai.

Tra cứu chi tiết NAME: [DATABASE_STATUS_CONVENTION.md](DATABASE_STATUS_CONVENTION.md). Dictionary Flow 6: [FLOW6_DATABASE_DESIGN_Reviewed.md](FLOW6_DATABASE_DESIGN_Reviewed.md).


## Quyết định Flow 1 ngày 24/10/2026

- TRANSPORT_REQUEST.RevisionFeedback (NVARCHAR(2000), NULL): lời nhắn yêu cầu sửa gần nhất. Không lưu revisionFields, không hạn chế nhóm field Customer được sửa trước duyệt.
- TRANSPORT_REQUEST.CancellationReason (NVARCHAR(1000)), CancellationRequestedBy (FK USER), CancellationRequestedAtUtc và CancellationPreviousStatus: metadata hủy ở cấp Request; đều nullable cho dữ liệu chưa hủy. Chỉ nhánh đã nhận cọc chờ Manager duyệt cần trạng thái trước hủy.
- CONTRACT_VERSION.TermsAcceptedAtUtc (DATETIME2(7), NULL): lần đồng ý đầu tiên đúng version, UTC; Customer suy từ CONTRACT.CustomerID. Không đổi ContentSnapshot.
- CONTRACT.RefundStatus Flow 1 chỉ theo dõi REQUESTED/PROCESSING/COMPLETED. Amount/reference tùy chọn; không triển khai chuyển tiền hoặc bắt buộc bằng chứng. Không thay quy tắc hoàn tiền Flow 6.
- Lịch ngựa theo departAt → arriveAt của version SIGNED; chưa bàn giao thực tế thì vẫn bận khi quá giờ giao dự kiến. Không thêm cột ngày kết thúc.
- Đây là sửa file SQL mẫu và hợp đồng; chưa áp dụng database đang chạy hay triển khai backend. Snapshot hợp đồng đầy đủ đã chốt; không xây lịch sử/audit riêng.
