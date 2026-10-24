## Quyết định Flow 1 hiện hành — 24/10/2026

- Chỉ thu tiền qua VNPAY. Tạo phiên → Customer thanh toán → backend xác minh IPN → cập nhật PAYMENT/INVOICE trong transaction → đủ cọc đúng version mới mở OTP. Return không xác nhận tiền. Không có API Manager confirm/reject thanh toán thủ công.
- Theo dõi tiến độ bằng status hiện tại; không xây timeline history hoặc audit riêng. Chỉ giữ metadata nghiệp vụ cần thiết: feedback gần nhất, trạng thái trước hủy, xác nhận điều khoản, metadata phát hành/ký/gia hạn/triển khai. Collection history/revisions/deadlineHistory/extensions cũ được bỏ khỏi DTO Flow 1.
- ContentSnapshot lưu đầy đủ một hợp đồng hoàn chỉnh: số hợp đồng/version, ngày phát hành, bên cung cấp và Customer, thông tin liên hệ, danh sách ngựa, nơi nhận/giao và người nhận, tuyến/mode/lịch trình, chăm sóc, toàn bộ khoản giá/thuế/phí nếu áp dụng, tổng giá, tiền/tỷ lệ cọc, nghĩa vụ thanh toán, thời hạn, mọi điều khoản/phụ lục và giá trị policy đã áp dụng. Không bỏ trường thuộc hợp đồng; dữ liệu không áp dụng thể hiện rõ. PDF thể hiện cùng nội dung và được giữ theo version. Không dựng lại bản cũ từ master hiện tại. Bản phát hành/ký bất biến; sửa nội dung tạo version mới. Giá vốn nội bộ và OTP/hash không thuộc bản hợp đồng Customer.
- fileType dùng chung photo/passport/ownership/value-proof. Không coi đây là mã ID. Hồ sơ y tế theo đơn dùng API documents.
- Refund Flow 1 chỉ ghi nhận status thủ công; không thực hiện chuyển tiền hoặc tuyên bố hệ thống đã hoàn tiền. Không yêu cầu audit/chứng từ mới.
- Đây là thiết kế đích và SQL mẫu Reviewed, không xác nhận backend/FE hoặc database đang chạy đã được cập nhật.

> Quyết định hiện hành: SETTLEMENT_ADJUSTMENT không có Bearer/Status; mỗi dòng là khoản Manager xác nhận, bắt buộc DecidedBy/DecidedAtUtc/DecisionReason. Chưa gắn AdjustedInvoiceID là chưa áp hóa đơn; hoàn tiền vẫn có RefundStatus riêng. CUSTOMER_CASE bỏ bước chờ Customer xác nhận và timestamp đồng ý; Manager phản hồi rồi đóng RESOLVED, còn ý kiến tạo phiếu mới. Luồng này thay yêu cầu Customer đồng ý trong SRS cũ; DOCX gốc chưa sửa.

# Quy ước thống nhất trạng thái database cho Flow 1 đến Flow 6

Ngày lập: 23/10/2026.

Tài liệu này đề xuất một bộ NAME dùng chung khi nhóm triển khai song song Flow 1–6. Giữ nguyên tên bảng và cột trong SQL Reviewed; thống nhất giá trị lưu trong các cột đó. Đây là đặc tả đích để nhóm áp dụng, không phải xác nhận backend hoặc database hiện tại đã hỗ trợ toàn bộ bộ trạng thái này.

Bảng tra cứu chi tiết từng field nằm ở **mục 9**; các field ngầm thể hiện trạng thái ở **mục 10**; kiểm kê mọi cột của 37 bảng ở **mục 11**. Các mục 3–7 giải thích vòng đời và điều kiện liên bảng.

## 1. Nguồn và cách giải quyết khác biệt

- `../HorseTransportDB/HorseTransportDB.sql`: nguồn chuẩn cho bảng, cột, kiểu, NULL và CHECK hiện có.
- `data/ID_NAME_RULE.md`: mục 5.4, 5.5 và 11; phân biệt mã đã bị CHECK với ví dụ seed/source chưa chốt.
- `data/SE2040_Group2_ASM2 (1).docx`: sơ đồ Flow 1–6, BR-01–62 và use case; đặc biệt BR-16–20, 21–33, 35–46, 48–62.

Quyết định trong tài liệu này:

1. Hợp đồng tổng dùng `EFFECTIVE` khi đã ký và có hiệu lực thi hành (NAME đích của hợp đồng tổng; field state hiển thị của phiên bản được suy ra riêng). Trong dữ liệu seed cũ nếu có `EXECUTING` thì được hiểu đồng nghĩa ngữ nghĩa với `EFFECTIVE`.
2. `SIGNED` thuộc CONTRACT_VERSION, biểu thị phiên bản hợp đồng cụ thể đã được ký OTP thành công; không dùng thay trạng thái tổng `EFFECTIVE` của CONTRACT.
3. Trip `COMPLETED` nghĩa là bàn giao hợp lệ. Request `CLOSED` nghĩa là đã kết thúc toàn bộ vòng đời đơn. Contract `SETTLED` nghĩa là đã tất toán; `CLOSED` nghĩa là đã hết cửa sổ phản hồi và đủ điều kiện đóng.
4. Yêu cầu vận chuyển (`TRANSPORT_REQUEST.Status`): dùng trực tiếp bộ mã chuẩn của Flow 1 (`PENDING_REVIEW`, `CHANGES_REQUESTED`, `CONTRACT_PREPARATION`, `CONTRACT_READY`, `CONTRACT_CHANGES_REQUESTED`, `DEPOSIT_VERIFIED`, `ACTIVATED`) kết hợp các mốc thực hiện (`SCHEDULED`, `IN_PROGRESS`, `DELIVERED`, `CLOSED`, `CANCELLATION_REQUESTED`, `REJECTED`, `CANCELLED`). Không bắt buộc ép qua các mã trung gian cũ (như `SUBMITTED`, `ACCEPTED`) để tránh phải viết adapter/map.
5. Quyết định trạng thái trong tài liệu là đặc tả thống nhất chuẩn hóa giữa Frontend, Backend và Database. SQL Server `HorseTransportDB.sql` khai báo cả `Status` và `ContractStatus` là `VARCHAR(50) NOT NULL` (không có CHECK constraint enum cứng), cho phép lưu trữ trực tiếp bộ mã chuẩn này mà không xung đột schema.

## 2. Quy tắc dùng chung

- NAME là UPPER_SNAKE_CASE, phân biệt theo từng bảng/cột. Nhãn UI dịch riêng.
- Không đổi tên cột Status hiện hữu; enum phía code phải có phạm vi riêng, ví dụ TripStatus và RequestStatus.
- Không dùng PENDING chung cho mọi giai đoạn khi cần phân biệt hành động tiếp theo.
- NULL chỉ có nghĩa chưa phát sinh/không có dữ liệu theo cột; không dùng NULL thay một bước chờ xử lý đã tồn tại.
- Cột NOT NULL không ghi NULL. Cột đang nullable phải được backend kiểm tra ở thời điểm nghiệp vụ bắt buộc.
- Trạng thái không thay bằng chứng: PAID cần giao dịch đủ tiền; CONFIRMED cần kiểm tra/xác nhận OTP tương ứng; CLEARED cần kết quả thực tế.
- Chuyển trạng thái do backend kiểm soát, có quyền, điều kiện, lịch sử và chống xử lý lặp. CHECK danh sách mã không thay state machine.
- Trạng thái hết hạn tính theo thời điểm sử dụng thực tế. Không tự đóng đơn, xác nhận thanh toán hoặc hoàn tất mốc do quá hạn.
- Các mũi tên dưới đây là luồng chính; chỉ cho nhánh ngoại lệ được mô tả, không cho sửa trạng thái tùy ý.

## 3. Danh mục các cột trạng thái hiện có

Ký hiệu nguồn: **CHECK** = SQL đã giới hạn mã; **SEED** = có ví dụ seed/source được ghi trong ID_NAME_RULE; **ĐỀ XUẤT** = bổ sung hoặc thống nhất ngữ nghĩa trong tài liệu này. Với các dòng không có CHECK, danh mục đích cần backend/migration áp dụng sau.

### 3.1 USER

`USER.IsActive` (BIT, NOT NULL): `1` được phép hoạt động; `0` chưa kích hoạt hoặc bị vô hiệu hóa. Không dùng riêng bit này để phân biệt chờ OTP và bị khóa; cần dữ liệu xác minh/tài khoản bổ sung nếu muốn phân biệt. Không tạo cột USER.Status trong tài liệu này.

### 3.2 HORSE

`HORSE.ReproductiveStatus` (nullable), giữ NAME đã chuẩn hóa trong ID_NAME_RULE:

| NAME | Nghĩa |
|---|---|
| INTACT | Chưa triệt sản |
| GELDED | Ngựa đực đã thiến |
| PREGNANT | Ngựa cái mang thai |
| NOT_PREGNANT | Ngựa cái không mang thai |

Đây là thuộc tính sinh học, không phải vòng đời xử lý. Validate theo Sex; NULL là chưa ghi nhận, không tự hiểu là NOT_PREGNANT.

### 3.3 STAFF_DOCUMENT.Status

NOT NULL. Bộ đích: `PENDING_REVIEW`, `VALID`, `EXPIRING_SOON`, `REJECTED`, `EXPIRED`.

- VALID, EXPIRING_SOON: SEED. Các mã còn lại: ĐỀ XUẤT.
- PENDING_REVIEW → VALID hoặc REJECTED; VALID → EXPIRING_SOON → EXPIRED theo ngày; có thể VALID → EXPIRED khi vượt thời hạn giữa hai lần đánh giá.
- Tài liệu thay thế phải được xét lại. REJECTED có lý do. VALID không ghi đè kiểm tra điều kiện quốc gia và ngày hết hạn.

### 3.4 PARTNER_FACILITY.Status

NOT NULL. Bộ đích: `ACTIVE`, `INACTIVE`. ACTIVE có trong seed; INACTIVE là ĐỀ XUẤT.

ACTIVE cho phép cân nhắc lập kế hoạch; INACTIVE không dùng cho phân công mới. Không dùng trạng thái này thay sức chứa, giấy chứng nhận hoặc hiệu lực hợp đồng cơ sở. Đổi ACTIVE ↔ INACTIVE có lý do và đánh giá Trip đang dùng.

### 3.5 FACILITY_CONTRACT.Status

NOT NULL. Bộ đích: `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`. ACTIVE có trong seed; phần còn lại ĐỀ XUẤT.

DRAFT → ACTIVE → EXPIRED; ACTIVE → TERMINATED khi kết thúc trước hạn. ACTIVE chỉ hợp lệ trong ValidFrom/ValidTo; EXPIRED và TERMINATED không tự quay về ACTIVE, tạo/gia hạn theo quy trình riêng.

### 3.6 TRANSPORT_REQUEST.Status

NOT NULL. Bộ đích:

| NAME | Nghĩa | Bên ghi |
|---|---|---|
| DRAFT | Customer đang soạn, chưa gửi | Flow 1 |
| PENDING_REVIEW | Đã nộp đơn, chờ Manager tiếp nhận & thẩm định (chuẩn Flow 1 API/FE) | Flow 1 |
| CHANGES_REQUESTED | Manager yêu cầu sửa đơn | Flow 1 |
| CONTRACT_PREPARATION | Đơn đã duyệt, đang chuẩn bị phương án/bảng giá và dự thảo hợp đồng | Flow 1 |
| CONTRACT_READY | Hợp đồng đã phát hành, chờ Customer xác nhận, thanh toán cọc và ký | Flow 1 |
| CONTRACT_CHANGES_REQUESTED | Customer gửi yêu cầu sửa điều khoản hợp đồng trước khi ký | Flow 1 |
| DEPOSIT_VERIFIED | Đã xác minh nhận tiền cọc thành công | Flow 1 |
| ACTIVATED | Ký OTP thành công, hợp đồng có hiệu lực, đơn kích hoạt tạo Trip chuyển sang Flow 2 | Flow 1 |
| REJECTED | Từ chối đơn có lý do | Flow 1 |
| CANCELLATION_REQUESTED | Đã yêu cầu hủy, chờ Manager quyết định; lưu trạng thái trước hủy | Flow 1 |
| CANCELLED | Đã hủy theo quy trình | Flow 1 |
| SCHEDULED | Phương án đã duyệt Gate 1 và nguồn lực được xác nhận; chưa khởi hành, vẫn phải đạt Gate 2 | Flow 3 |
| IN_PROGRESS | Đã khởi hành thực tế, chưa bàn giao cuối hợp lệ | Flow 4–6 |
| DELIVERED | Đã bàn giao cuối hợp lệ, còn mở để tất toán/feedback/khiếu nại | Flow 6 |
| CLOSED | Đã tất toán, hết cửa sổ feedback, không còn khiếu nại mở | Flow 6 |

IN_PROGRESS, COMPLETED, REJECTED có trong seed lịch sử; COMPLETED của Request cũ không thuộc enum đích. Request dùng cùng enum đích ở DB và API; dữ liệu seed cũ phải chuyển có kiểm soát. Payment, deployment, refund và state UI của phiên bản có bảng đối chiếu riêng ở mục 12.

Luồng: DRAFT → PENDING_REVIEW → CONTRACT_PREPARATION → CONTRACT_READY → DEPOSIT_VERIFIED → ACTIVATED → SCHEDULED → IN_PROGRESS → DELIVERED → CLOSED. Nhánh sửa đơn: PENDING_REVIEW → CHANGES_REQUESTED → PENDING_REVIEW; Từ chối: PENDING_REVIEW / CHANGES_REQUESTED → REJECTED; Phản hồi hợp đồng: CONTRACT_READY → CONTRACT_CHANGES_REQUESTED → CONTRACT_READY. Hủy trước ký có thể từ giai đoạn chưa kích hoạt theo điều kiện nghiệp vụ; không suy từ việc gửi yêu cầu hủy thành CANCELLED ngay.

ACTIVATED là mốc kích hoạt đơn ngay sau khi hoàn tất ký OTP (đồng thời tạo Trip ở trạng thái PLANNING). IN_PROGRESS bắt đầu khi chuyến đi thực tế xuất phát. Đã giao thì chuyển DELIVERED và giữ trạng thái này khi còn nợ hoặc đang chờ feedback/khiếu nại. Quá hạn hợp đồng không tự hủy Request. Hủy sau ký không được triển khai tùy ý bằng cách tái dùng quy trình hủy trước ký.

### 3.7 LEGAL_MEDICAL_RECORD

`RequirementStatus` (nullable): `MANDATORY`, `OPTIONAL`, `NOT_APPLICABLE`. MANDATORY có trong seed; hai mã sau ĐỀ XUẤT. NULL là chưa phân loại và không đạt điều kiện checklist. Đây là mức áp dụng, không phải kết quả duyệt.

`DocumentStatus` (nullable): `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED`. VERIFIED/EXPIRED có trong seed; các mã khác ĐỀ XUẤT.

- Upload hợp lệ → PENDING_REVIEW → VERIFIED hoặc REJECTED.
- VERIFIED → EXPIRED khi không còn hiệu lực ở thời điểm cần sử dụng.
- Khi cần bổ sung/thay thế tài liệu, bản nộp mới được xét lại PENDING_REVIEW; phải giữ lịch sử, không xóa bằng chứng bản cũ.
- VERIFIED cần VerifiedBy, bằng chứng và hiệu lực phù hợp. Không reset các mục không bị ảnh hưởng khi đổi lịch/tuyến.
- Hồ sơ chưa nộp là mục checklist thiếu tài liệu, không tự tạo một record VERIFIED hoặc dùng NULL thay MISSING. Schema hiện chưa có checklist đầy đủ; xem mục 6.

### 3.8 QUARANTINE_BOOKING.Status

Nullable. Bộ đích: `PENDING_CONFIRMATION`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`.

COMPLETED có trong seed; các mã khác ĐỀ XUẤT. Luồng: PENDING_CONFIRMATION → CONFIRMED → IN_PROGRESS → COMPLETED; bị từ chối → REJECTED; hủy trước hoàn tất → CANCELLED có lý do. NULL là legacy chưa xác định, không đủ để coi booking hợp lệ.

COMPLETED chỉ nghĩa quy trình booking/cách ly này đã hoàn thành; không tự thay kết luận thông quan hoặc chuyên môn.

### 3.9 TRIP_PLAN

`Status` (NOT NULL): `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT`, `COMPLETED`.

Các NAME đều đã được ID_NAME_RULE ghi nhận từ source/seed. Tài liệu này thống nhất ý nghĩa và điều kiện:

| NAME | Điều kiện |
|---|---|
| PLANNING | Trip đã tạo sau ký; đang giao việc, chuẩn bị và phê duyệt |
| READY_TO_DEPART | Manager đã duyệt khởi hành, các điều kiện hồ sơ/vận hành đáp ứng phương án hiện hành |
| IN_TRANSIT | Đã khởi hành thực tế; gồm thời gian đã đến điểm giao nhưng chưa bàn giao hợp lệ |
| COMPLETED | Biên bản DELIVERY hợp lệ, đủ kiểm tra và OTP đúng phiên bản người nhận |

Luồng chính: PLANNING → READY_TO_DEPART → IN_TRANSIT → COMPLETED. Nếu điều kiện khởi hành mất hiệu lực trước khi xuất phát: READY_TO_DEPART → PLANNING, hủy hiệu lực phê duyệt liên quan và duyệt lại. Không chuyển ngược Trip đã khởi hành về PLANNING để xử lý sự cố; theo dõi phần bị chặn riêng.

`DeploymentStatus` (nullable, CHECK): `PENDING`, `CONFIRMED`, `ON_HOLD`.

- NULL: chưa ghi nhận hành động bàn giao triển khai.
- PENDING: đã ghi nhận chờ triển khai, đúng metadata theo CHECK, HandoffEventId NULL.
- CONFIRMED: Manager xác nhận giao việc; có HandoffEventId và metadata; backend bắt buộc có AssignedSpecialistId và AssignedCoordinatorId hợp lệ.
- ON_HOLD: tạm dừng triển khai trước khởi hành, giữ event/phân công đã xác nhận. CONFIRMED không có nghĩa được khởi hành và không phải xác nhận giao ngựa.

ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/nghiệp vụ do backend thực hiện.

Gate 1, Documents READY, Operations READY, Gate 2 không phải các giá trị thay thế của DeploymentStatus; schema còn thiếu dữ liệu riêng cho các phê duyệt này.

### 3.10 VEHICLE.Status

Nullable. Bộ đích: `AVAILABLE`, `ON_TRIP`, `MAINTENANCE`, `INACTIVE`.

Ba mã đầu có trong seed; INACTIVE ĐỀ XUẤT. AVAILABLE → ON_TRIP → AVAILABLE; AVAILABLE/ON_TRIP → MAINTENANCE khi thực tế cần, đồng thời xử lý Trip bị ảnh hưởng; MAINTENANCE → AVAILABLE sau xác nhận đủ điều kiện. INACTIVE không nhận việc mới.

AVAILABLE không đồng nghĩa không xung đột lịch tương lai. Giữ lịch tạm/xác nhận phân công phải lưu riêng, không đổi xe thành ON_TRIP chỉ vì gửi phương án.

### 3.11 ROUTE_SEGMENT.Status

Nullable. Bộ đích: `PENDING`, `IN_PROGRESS`, `COMPLETED`. IN_PROGRESS/COMPLETED có trong seed; PENDING ĐỀ XUẤT.

PENDING → IN_PROGRESS → COMPLETED, theo thứ tự phương án. COMPLETED nghĩa mốc/chặng tương ứng đã thực hiện và được xác nhận thực tế. SegmentType = DESTINATION có COMPLETED và ActualTime khác NULL nghĩa đã đến điểm giao cuối; chưa chứng minh đã giao ngựa.

Không thêm ARRIVED cho Trip. ActualTime phải có ngữ nghĩa rõ theo loại mốc. Schema hiện thiếu thứ tự và nhiều timestamp, không suy thứ tự từ SegmentID; nhóm hành trình phải bổ sung hợp đồng dữ liệu trước khi triển khai khóa mốc.

### 3.12 FLIGHT_BOOKING

`BookingConfirmed` (BIT, NOT NULL): `0` chưa xác nhận booking; `1` đã xác nhận với BookingReference hợp lệ, đúng phương án đã duyệt Gate 1. Dù SQL DEFAULT hiện là 1, backend phải ghi rõ 0 cho bản chưa xác nhận; không dựa default để tự coi đã đặt chỗ.

`DirectFlight` (BIT): 1 bay thẳng, 0 không bay thẳng; là thuộc tính, không phải trạng thái. Trong demo chỉ chọn chuyến phù hợp yêu cầu bay thẳng.

Không dùng BookingConfirmed = 0 để biểu diễn đồng thời bị hủy và chưa đặt. SQL chưa có trạng thái thay thế/hủy booking và lịch sử đầy đủ; xem mục 6.

### 3.13 CUSTOMS_CLEARANCE.Status

NOT NULL. Bộ đích: `PENDING`, `ON_HOLD`, `CLEARED`, `REJECTED`.

CLEARED có trong seed; phần còn lại ĐỀ XUẤT. PENDING → CLEARED/ON_HOLD/REJECTED. ON_HOLD → CLEARED hoặc REJECTED theo kết quả thực tế. Kết quả bị từ chối muốn xét lại phải có hồ sơ/bằng chứng xử lý và lịch sử, không xóa kết quả cũ.

CLEARED cần ClearedAt và chứng từ. ON_HOLD/REJECTED hoặc chưa hoàn thành chặn phần hành trình liên quan theo BR-61; xác nhận Driver đi qua không tự chuyển CLEARED.

### 3.14 HEALTH_LOG.HealthStatus

NVARCHAR mô tả, nullable. Giữ văn bản như tình trạng quan sát/kết luận; không ép thành enum chung HEALTHY/SICK. LogType phân loại lần ghi, không thay HealthStatus. Bác sĩ ghi kết luận chuyên môn đúng quyền. Giữ nhật ký bất biến; đính chính bằng bản ghi có liên kết/lý do khi được triển khai.

### 3.15 INCIDENT.Status

Nullable. Bộ đích: `OPEN`, `IN_PROGRESS`, `AWAITING_APPROVAL`, `RESOLVED`. RESOLVED có trong seed; các mã khác ĐỀ XUẤT.

OPEN → IN_PROGRESS; IN_PROGRESS ↔ AWAITING_APPROVAL khi cần quyết định Manager; IN_PROGRESS → RESOLVED sau xử lý và xác nhận liên quan. Không dùng RESOLVED thay xác nhận thú y, thông quan hoặc phê duyệt phương án. Không phải mọi sự cố đều cần duyệt Manager; chỉ các điều kiện SRS quy định.

Một trạng thái tổng không đủ lưu các việc khắc phục song song và các blocker; cần dữ liệu riêng ở mục 6. Khiếu nại sau giao là đối tượng khác, không tự coi là INCIDENT đã mở lại.

### 3.16 HANDOVER.Status

Nullable. Bộ đích: `DRAFT`, `AWAITING_OTP`, `CONFIRMED`, `REFUSED`.

CONFIRMED có trong seed; các mã khác ĐỀ XUẤT. HANDOVER.Type giữ PICKUP hoặc DELIVERY, không trộn vào Status.

- DRAFT: đang kiểm tra/nghiệp vụ chưa đủ; kể cả sai người nhận hoặc chưa đủ điều kiện.
- AWAITING_OTP: nội dung đã sẵn sàng cho đúng người nhận đọc và xác nhận OTP.
- CONFIRMED: đủ kiểm tra, OTP đã xác minh cho đúng phiên bản và người nhận.
- REFUSED: người nhận từ chối, có lý do và bằng chứng. Không hoàn tất Trip.

DRAFT → AWAITING_OTP → CONFIRMED hoặc REFUSED. Sửa nội dung trước xác nhận phải đưa về DRAFT và xác nhận OTP lại. Biên bản CONFIRMED không sửa đè; đính chính/phiên bản mới cần thiết kế riêng. REFUSED giữ lịch sử; lần giao lại tạo biên bản mới theo phương án thống nhất.

`IsAuthorized` (BIT nullable): 1 đã xác minh người nhận có quyền nhận, 0 không có quyền, NULL chưa kiểm tra. Không đồng nghĩa đã ký hoặc đã nhận. Đối chiếu trực tiếp người nhận chỉ định và dữ liệu ủy quyền theo quy trình.

### 3.17 HANDOVER_ITEM

`MicrochipVerified` (BIT NOT NULL): 1 đã đối chiếu đúng chip của ngựa; 0 chưa xác minh thành công. Giá trị 0 không phân biệt chưa kiểm tra với chip sai; cần ghi bằng chứng/chi tiết bổ sung nếu UI cần tách.

`ConditionStatus` (NVARCHAR nullable): mô tả tình trạng ngựa lúc giao nhận, không phải vòng đời biên bản; giữ văn bản. AssetCheck cũng là mô tả đối chiếu tài sản/giấy tờ, không tự coi là cờ đã hoàn thành mọi kiểm tra.

### 3.18 CONTRACT.ContractStatus

NOT NULL. Bộ đích:

| NAME | Nghĩa |
|---|---|
| DRAFT | Đang soạn hợp đồng, chưa có bản phát hành có hiệu lực thao tác |
| ISSUED | Có bản hiện hành đã phát hành, đang chờ cọc/xác minh/ký |
| EFFECTIVE | Đã ký thành công, hợp đồng có hiệu lực thi hành; đang thực hiện hoặc đã giao nhưng chưa tất toán |
| SETTLED | Đã xác minh trả đủ và hoàn tất nghiệm thu/tất toán; đơn vẫn có thể mở để feedback/khiếu nại |
| CLOSED | Đã hết cửa sổ feedback hiện hành và không còn khiếu nại mở |
| CANCELLED | Đã hủy theo quy trình; trường hợp trước ký có tiền cần theo dõi hoàn riêng |

EFFECTIVE (hoặc EXECUTING trong dữ liệu seed cũ) và SETTLED biểu thị vòng đời thực hiện và thanh toán; DRAFT, ISSUED, CLOSED, CANCELLED hoàn thiện trọn vẹn vòng đời. Tài liệu này chuẩn hóa EFFECTIVE là mã trạng thái chính thức lưu trữ trực tiếp vào database, đồng bộ tên ở field hợp đồng tổng; state hiển thị của phiên bản vẫn là projection riêng, không ghi vào VersionStatus.

Luồng: DRAFT → ISSUED → EFFECTIVE → SETTLED → CLOSED. Khi phát hành version sửa trước ký, giữ vòng đời ISSUED và thay CurrentVersionNo đúng quy trình. DRAFT/ISSUED → CANCELLED theo điều kiện hủy. Không tự CANCELLED khi quá deadline; trước hết đối soát giao dịch và quyết định gia hạn/hủy. Không chuyển SETTLED/CLOSED chỉ từ Trip COMPLETED.

Không sửa hợp đồng đã ký hoặc thêm phụ lục trong demo (BR-20); điều chỉnh tiền ghi riêng. Khiếu nại mở giữ Contract chưa CLOSED; SETTLED không chứng minh khiếu nại đã xong. Nếu khiếu nại làm phát sinh điều chỉnh công nợ, cần quy tắc điều chỉnh riêng, không tự đổi trạng thái hoặc reset cửa sổ trước khi các điều kiện giải quyết đáp ứng.

### 3.19 CONTRACT.CancellationStatus

Nullable, CHECK: `PENDING`, `APPROVED`, `REJECTED`. NULL = không có yêu cầu hủy.

NULL → PENDING → APPROVED/REJECTED. PENDING chưa có quyết định; APPROVED/REJECTED phải có người, thời gian, lý do theo CHECK. APPROVED không đồng nghĩa hoàn tiền xong. Không tái sử dụng quy trình này cho hủy sau ký khi SRS chưa đặc tả.

### 3.20 CONTRACT.FeedbackStatus

Nullable, CHECK: `PENDING`, `ACCEPTED`, `REJECTED`. NULL = chưa có yêu cầu sửa hợp đồng.

Đây chỉ là phản hồi yêu cầu sửa hợp đồng trước ký: PENDING chờ Manager; ACCEPTED đồng ý sửa và tạo bản nháp phiên bản mới; REJECTED từ chối có lý do, giữ bản cũ và cấp lại deadline theo quy trình. Không dùng cho đánh giá sau chuyến, khiếu nại hoặc đồng ý kết quả khiếu nại.

### 3.21 CONTRACT.RefundStatus

Nullable, CHECK: `REQUESTED`, `PROCESSING`, `COMPLETED`. NULL = chưa phát sinh hoàn.

REQUESTED → PROCESSING → COMPLETED. Flow 1 chỉ theo dõi status do Manager ghi nhận, không triển khai chuyển tiền/chứng từ; RefundAmount/RefundReference tùy chọn theo CHECK Reviewed đã sửa. Không tự COMPLETED khi duyệt hủy. Quy tắc Flow 6 vẫn riêng.

### 3.22 CONTRACT_VERSION.VersionStatus

NOT NULL, CHECK: `DRAFT`, `ISSUED`, `SUPERSEDED`, `SIGNED`, `CANCELLED`.

- DRAFT: nội dung còn được chỉnh trước phát hành.
- ISSUED: đã phát hành, có metadata/PDF; nội dung bất biến.
- SUPERSEDED: bản phát hành cũ được thay bởi bản mới; không thanh toán/ký.
- SIGNED: bản Customer đã ký hợp lệ; nội dung bất biến.
- CANCELLED: phiên bản bị hủy theo quyết định nghiệp vụ, giữ bằng chứng cũ; không tự hủy bản ký chỉ vì Trip hoàn tất.

DRAFT → ISSUED → SIGNED; ISSUED → SUPERSEDED khi phát hành bản thay thế; DRAFT/ISSUED → CANCELLED khi hủy hợp lệ. SIGNED → CANCELLED chỉ khi có quy trình hủy hợp đồng đã ký được đặc tả riêng; demo hiện không tự mở nhánh đó chỉ vì SQL cho phép.

Không đổi SIGNED → SETTLED/CLOSED: đó là trạng thái CONTRACT, không phải trạng thái nội dung phiên bản.

### 3.23 INVOICE.PaymentStatus

NOT NULL. Bộ đích: `UNPAID`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`.

UNPAID/PAID có trong seed; PARTIALLY_PAID và CANCELLED là NAME đích đề xuất.

- UNPAID: tiền được xác minh = 0, số phải trả > 0.
- PARTIALLY_PAID: 0 < tiền được xác minh < số phải trả.
- PAID: tiền được phân bổ/xác minh đủ; không kết luận từ một attempt thành công nếu còn thiếu.
- CANCELLED: hóa đơn không còn được phép thanh toán, ví dụ hóa đơn version bị thay trước ký; giữ lịch sử. Không CANCELLED một hóa đơn có tiền thực thu chưa được đối soát/xử lý.

UNPAID → PARTIALLY_PAID → PAID; UNPAID → PAID. Hóa đơn hợp lệ có số phải trả bằng 0 có thể PAID mà không tạo PAYMENT giả. Thanh toán thừa phải đối soát và quản lý phân bổ/hoàn, không âm thầm cắt bỏ số tiền thực nhận. SQL hiện chưa có sổ phân bổ/điều chỉnh đủ cho mọi ngoại lệ.

Quá DueDate là thuộc tính tính toán của hóa đơn còn nợ, không thêm OVERDUE thay PaymentStatus vì sẽ làm mất thông tin thanh toán một phần. InvoiceType chỉ dùng DEPOSIT hoặc FINAL_SETTLEMENT; đây là loại, không phải trạng thái.

### 3.24 PAYMENT.Status

NOT NULL. Bộ đích: `PENDING_GATEWAY`, `SUCCESS`, `FAILED`, `REVIEW_REQUIRED`.

- PENDING_GATEWAY: attempt cổng đang chờ kết quả.
- SUCCESS: xác minh thành công, đủ điều kiện tính vào tiền thu.
- FAILED: attempt thất bại có kết quả xác định.
- REVIEW_REQUIRED: cần đối soát ngoại lệ, chưa được tự tính là thành công.



SUCCESS không sửa thành FAILED để biểu diễn hoàn tiền. Hoàn/điều chỉnh là nghiệp vụ riêng. Frontend return URL không đủ xác minh SUCCESS. FinancialReviewRequired là cờ ngoại lệ riêng, không tự đồng nhất với Payment.Status.

`FinancialReviewRequired` (BIT NOT NULL): 1 cần kiểm tra tài chính, có lý do; 0 không còn yêu cầu review đang mở. FinancialReviewedBy/At ghi người và thời điểm theo quy trình; review xong không tự có nghĩa SUCCESS nếu tiền chưa được xác minh.

`VnpayTransactionStatus` và `VnpayResponseCode`: mã provider, giữ chuỗi gốc; không chuẩn hóa theo enum nội bộ. CHECK SUCCESS VNPAY hiện cần cả hai bằng '00' và các điều kiện đối soát tiền/mã giao dịch.

## 4. Các cờ còn lại và bảng không có trạng thái

### Các cờ hiện hữu

| Bảng/cột | Quy ước |
|---|---|
| NOTIFICATION.IsRead | 0 chưa đọc; 1 đã đọc. Không phải trạng thái gửi thành công |
| POLICY_AND_TERM.IsActive | 1 đang áp dụng; 0 ngừng dùng cho lựa chọn mới. Bản snapshot đã ký không thay đổi |
| CONTRACT_TEMPLATE.IsActive | 1 được chọn cho hợp đồng mới; 0 không được chọn mới; không sửa snapshot đã phát hành |
| COST_RATE.IsActive | 1 dùng cho tính giá mới; 0 ngừng dùng. Không tính lại giá hợp đồng ký từ rate hiện tại |
| COUNTRY.IsActive | 1 cho phép xem xét tạo tuyến/yêu cầu mới trong phạm vi hỗ trợ; 0 ngừng lựa chọn mới |
| SUPPORTED_ROUTE.IsActive | 1 tuyến được mở cho yêu cầu mới; 0 ngừng mở mới; vẫn giữ lịch sử Trip |
| FACILITY_CERTIFICATION.IsInternationalStandard | 1 chứng nhận thuộc chuẩn quốc tế; 0 không thuộc; không chứng minh còn hạn |

BUSINESS_POLICY.BoolValue là giá trị cấu hình theo Code, không phải trạng thái bật/tắt bản policy. State_Province là địa giới hành chính, không phải state machine.

### Kiểm kê đủ 37 bảng

| Bảng | Trường trạng thái/cờ hoặc cách quản lý |
|---|---|
| USER | IsActive |
| HORSE | ReproductiveStatus; không có vòng đời xử lý |
| STAFF_DOCUMENT | Status |
| NOTIFICATION | IsRead |
| POLICY_AND_TERM | IsActive |
| PARTNER_FACILITY | Status |
| FACILITY_CONTRACT | Status |
| FACILITY_CERTIFICATION | IsInternationalStandard; hiệu lực theo ngày, không có Status |
| TRANSPORT_REQUEST | Status |
| REQUEST_HORSE_MAPPING | Không có trạng thái |
| LEGAL_MEDICAL_RECORD | RequirementStatus, DocumentStatus |
| QUARANTINE_BOOKING | Status |
| TRIP_PLAN | Status, DeploymentStatus |
| VEHICLE | Status |
| TRIP_VEHICLE_ASSIGNMENT | Không có trạng thái giữ lịch/xác nhận hiện hữu |
| ROUTE_SEGMENT | Status |
| FLIGHT_BOOKING | BookingConfirmed; DirectFlight là thuộc tính |
| CUSTOMS_CLEARANCE | Status |
| HEALTH_LOG | HealthStatus là mô tả |
| INCIDENT | Status |
| HANDOVER | Status, IsAuthorized |
| HANDOVER_ITEM | MicrochipVerified; ConditionStatus là mô tả |
| CONTRACT_TEMPLATE | IsActive |
| CONTRACT | ContractStatus, CancellationStatus, FeedbackStatus, RefundStatus |
| CONTRACT_VERSION | VersionStatus |
| COST_ITEM | Không có trạng thái phê duyệt hiện hữu |
| INVOICE | PaymentStatus |
| PAYMENT | Status, FinancialReviewRequired; mã provider giữ riêng |
| COST_RATE | IsActive |
| COUNTRY | IsActive |
| SUPPORTED_ROUTE | IsActive |
| BUSINESS_POLICY | Không có trạng thái; BoolValue là giá trị policy |


Các bảng bổ sung Flow 6:

| Bảng | Field trạng thái |
|---|---|
| HANDOVER_REVISION | Status |
| TRIP_SETTLEMENT | Status |
| SETTLEMENT_ADJUSTMENT | RefundStatus; không có Status/Bearer |
| CUSTOMER_CASE | Status |
| CUSTOMER_FEEDBACK |  |

Không bổ sung Status cho mọi bảng chỉ để đồng dạng. Type, Role, Sex, Category, Bearer, ScopeType, ValueType và CurrencyCode là phân loại/thuộc tính; nằm ngoài danh mục trạng thái này.

## 5. Hợp đồng dữ liệu bàn giao giữa các flow

### Flow 1 sang chuẩn bị Flow 2–3

- Request.Status = ACTIVATED sau ký OTP; chuyển SCHEDULED sau Gate 1 và xác nhận nguồn lực; chuyển IN_PROGRESS khi khởi hành thực tế.
- Contract.ContractStatus = EFFECTIVE; có SignedAt.
- ContractVersion hiện hành = SIGNED, đúng CurrentVersionNo và metadata ký.
- Invoice DEPOSIT = PAID; tiền cọc có giao dịch SUCCESS thực sự, không còn mâu thuẫn đối soát chưa xử lý.
- Trip.Status = PLANNING, đúng RequestID; đúng một Trip cho Request.
- Khi Manager xác nhận triển khai: Trip.DeploymentStatus = CONFIRMED, đủ Specialist/Coordinator và metadata.

### Flow 2–3 sang Flow 4

- Trip.Status = READY_TO_DEPART chỉ sau Gate 2 của Manager.
- DeploymentStatus = CONFIRMED.
- Phương án hiện hành đã duyệt, phân công đã xác nhận, không xung đột.
- Tài liệu bắt buộc trước xuất phát VERIFIED và đủ hiệu lực sử dụng; bảo hiểm thực sự có hiệu lực.
- Nếu có AIR: booking cần thiết BookingConfirmed = 1 và đúng phương án.
- Không bắt kết quả thông quan tại mốc tương lai phải CLEARED trước xuất phát.
- Flow 4 xác nhận khởi hành thực tế mới chuyển Trip = IN_TRANSIT.

### Flow 4–5 sang bước giao nhận Flow 6

| Đối tượng | Điều kiện |
|---|---|
| TRIP_PLAN.Status | IN_TRANSIT |
| TRIP_PLAN.DeploymentStatus | CONFIRMED |
| TRANSPORT_REQUEST.Status | IN_PROGRESS |
| CONTRACT.ContractStatus | EFFECTIVE |
| CONTRACT_VERSION.VersionStatus | SIGNED ở bản được tham chiếu |
| INVOICE loại DEPOSIT | PAID, đúng Contract/version |
| ROUTE_SEGMENT điểm giao cuối | SegmentType = DESTINATION, Status = COMPLETED, ActualTime có giá trị |
| Phân công | Người thao tác đúng nhiệm vụ chặng cuối; schema hiện cần làm rõ mapping theo chặng |
| HANDOVER ban đầu | Type = PICKUP, Status = CONFIRMED, có dữ liệu từng ngựa để đối chiếu |
| Hồ sơ và sự cố | Có bằng chứng liên quan; không còn blocker ngăn bàn giao; không bắt mọi INCIDENT phải RESOLVED nếu không ảnh hưởng việc giao |

Không yêu cầu DELIVERY = CONFIRMED trước khi vào bước giao nhận, vì đó là đầu ra Flow 6. Không yêu cầu hóa đơn FINAL_SETTLEMENT đã PAID trước bước bàn giao theo SRS hiện tại.

### Các mốc trong Flow 6

1. Kiểm tra và chờ ký: Trip vẫn IN_TRANSIT; tạo HANDOVER DELIVERY từ DRAFT tới AWAITING_OTP.
2. Người nhận từ chối: HANDOVER = REFUSED; Trip chưa COMPLETED; Manager/Customer thống nhất phương án, Coordinator bố trí.
3. Bàn giao hợp lệ: HANDOVER = CONFIRMED và đủ item/xác nhận OTP → Trip = COMPLETED. Request chuyển DELIVERED; Contract vẫn EFFECTIVE khi còn nợ.
4. Xác minh trả đủ và hoàn tất nghiệm thu/tất toán: Invoice FINAL_SETTLEMENT = PAID → Contract = SETTLED; mở cửa sổ feedback theo FEEDBACK_WINDOW_HOURS (policy seed là 24 giờ).
Khiếu nại được Manager phản hồi và đóng ở RESOLVED; Customer còn ý kiến thì gửi phiếu mới, không cần bước xác nhận đồng ý.
6. Hết cửa sổ hiện hành, không còn khiếu nại mở: Request = CLOSED, Contract = CLOSED. ContractVersion vẫn SIGNED. Hỗ trợ sau đóng không tự mở lại đơn.

## 6. Yêu cầu SRS và phần đã được bổ sung cho Flow 6

Các mục Flow 6 về biên bản, điều chỉnh, khiếu nại và feedback đã có bảng thực tế trong SQL Reviewed ở lần cập nhật này (xem mục 13 và FLOW6_DATABASE_DESIGN_Reviewed.md). Các mục Gate 1/2, readiness, nguồn lực, hồ sơ và bảo hiểm của flow khác dưới đây vẫn là thiết kế cần bổ sung, không phải cột đã có.

| Phần thiếu | Bộ trạng thái/giá trị đề xuất và dữ liệu cần bổ sung |
|---|---|
| Phê duyệt phương án Gate 1 | DRAFT, SUBMITTED, APPROVED, CHANGES_REQUESTED, WITHDRAWN; gắn version phương án và người/thời gian/lý do |
| Documents/Operations readiness | NOT_READY, READY cho từng xác nhận riêng; gắn version, thời điểm kiểm tra và các điều kiện bị ảnh hưởng |
| Phê duyệt Gate 2 | PENDING, APPROVED, REVOKED; gắn phương án và thời điểm; không thay bằng DeploymentStatus |
| Giữ lịch nguồn lực | HELD, CONFIRMED, RELEASED; có khoảng thời gian, nhân sự và chặng; draft chưa giữ lịch |
| Checklist hồ sơ | Mục áp dụng, bên chịu trách nhiệm, phạm vi ngựa/Trip, giai đoạn cần; biểu diễn thiếu tài liệu mà không giả record hồ sơ |
| Bảo hiểm | PENDING_PURCHASE, ACTIVE, EXPIRED, CANCELLED; phạm vi, thời hạn, chứng từ, chi phí và version liên quan |
| Hủy/thay booking | DRAFT, CONFIRMED, SUPERSEDED, CANCELLED trong mô hình mới; không nhét vào bit BookingConfirmed |
| Khóa hành trình/sự cố | Blocker, nhiệm vụ song song, xác nhận chuyên môn/phê duyệt; tách khỏi Incident.Status tổng |
| Biên bản và chữ ký | ĐÃ CÓ HANDOVER_REVISION và field giấy tờ ở HANDOVER/HANDOVER_ITEM: snapshot, OTP đúng bản, người nhận/thời điểm và mô tả giấy tờ ở handover/item |
| Chi phí/điều chỉnh | ĐÃ CÓ SETTLEMENT_ADJUSTMENT gồm refund fields; giữ bản hợp đồng đã ký |
| Khiếu nại sau chuyến | ĐÃ CÓ CUSTOMER_CASE với kết quả hiện tại; Manager ghi phản hồi và đóng RESOLVED, không cần Customer đồng ý |
| Feedback và tự đóng | ĐÃ CÓ TRIP_SETTLEMENT (hai mốc feedback) và CUSTOMER_FEEDBACK; worker/backend vẫn phải thực hiện reset/đóng theo điều kiện |
| Hoàn/điều chỉnh sau ký | ĐÃ CÓ SETTLEMENT_ADJUSTMENT gồm refund fields cho hoàn sau ký; không trộn hoàn cọc Flow 1 |
| Audit | Không tạo audit Flow 6 riêng theo quyết định nhóm; giữ metadata chính trong bảng nghiệp vụ |

Khách được báo vấn đề/khiếu nại trước khi trả đủ; đánh giá thông thường không kéo dài cửa sổ. Chữ ký nhận không xóa quyền khiếu nại. Không tự thu mọi AdditionalCost từ Customer; BR-55 quy định không thu thêm phí xử lý sự cố từ Customer. Phải làm rõ Bearer = CT trước khi mapping về COMPANY/CUSTOMER.

## 7. Cách áp dụng khi nhóm code song song

1. Dùng tài liệu này làm bản thống nhất đích để review/chốt chung. Các NAME CHECK đã có phải giữ tương thích; tên mới cần cập nhật enum/validation/migration ở lần triển khai.
2. Bộ NAME đích của Request và hợp đồng tổng đã được chốt trong tài liệu; không khẳng định backend/FE đã triển khai. Các projection UI phải theo mục 12.
3. Giữ mọi liên kết Request–Trip–Contract–version–Invoice–Payment nhất quán. Không đổi snapshot đã ký để đổi NAME.
4. Tạo fixture chung tại từng điểm bàn giao, nhất là: đang chờ giao; từ chối giao; giao xong còn nợ; tất toán chờ feedback; khiếu nại chờ Customer; đóng đơn.
5. Schema Flow 6 đã có nơi lưu xác nhận OTP/feedback; seed chỉ là fixture. Không coi timestamp/email demo là bằng chứng OTP thật hoặc kiểm thử E2E.
6. Thực hiện một transaction hoặc cơ chế nhất quán phù hợp cho thay đổi liên bảng; chống tạo trùng Trip, biên bản xác nhận, invoice cuối và ghi nhận cùng giao dịch hai lần.

## 8. Nguồn đối chiếu

- HorseTransportDB.sql: schema, FK/CHECK/unique, seed, Sequence và trigger hiện hành.
- ID_NAME_RULE.md: registry 37 bảng/33 Sequence và quy tắc ID.
- FLOW6_DATABASE_DESIGN_Reviewed.md: năm bảng Flow 6, liên kết hóa đơn và metadata OTP/refund.
- contracts/API-Flow/Flow1: các mốc Flow 1 và projection UI; không dùng enum Request thay enum Trip/version.
- SRS SE2040_Group2_ASM2 (1).docx: cơ sở nghiệp vụ; các quyết định nhóm về OTP bàn giao và đóng case bởi Manager thay mô tả cũ tương ứng. File DOCX chưa được sửa trong lần này.

## 9. Tra cứu chi tiết từng field mang trạng thái

Phần này là bảng tra cứu theo field: mỗi giá trị có một dòng riêng. Kiểu, NULL và DEFAULT được lấy trực tiếp từ định nghĩa SQL Reviewed. Tập NAME đích và nguồn của từng bộ được giải thích ở mục 3; các NAME bổ sung vẫn là đề xuất chuẩn hóa, chưa phải CHECK đã triển khai. Tất cả field BIT đều được kê, kể cả thuộc tính nhị phân không phải vòng đời.

Đối với các cột nullable mang trạng thái vòng đời: NULL chỉ được giữ trong dữ liệu nháp/legacy khi chưa xác định; tại bước yêu cầu trạng thái rõ thì phải chặn nghiệp vụ, không mặc định PASS. Không đổi NULL thành PENDING một cách tự động nếu không có sự kiện nghiệp vụ tương ứng.

### 9.1 USER.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Chưa kích hoạt hoặc bị vô hiệu hóa; không phân biệt hai lý do bằng bit này |
| `1` | Tài khoản được phép hoạt động |

### 9.2 HORSE.ReproductiveStatus

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa ghi nhận tình trạng sinh sản; không suy thành NOT_PREGNANT.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `INTACT` | Chưa triệt sản |
| `GELDED` | Ngựa đực đã thiến |
| `PREGNANT` | Ngựa cái mang thai |
| `NOT_PREGNANT` | Ngựa cái không mang thai |

### 9.3 STAFF_DOCUMENT.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING_REVIEW` | Đã nộp, chờ xét |
| `VALID` | Đã duyệt và đủ hiệu lực |
| `EXPIRING_SOON` | Đã duyệt, sắp hết hạn theo ngưỡng cấu hình |
| `REJECTED` | Bị từ chối có lý do |
| `EXPIRED` | Đã hết hiệu lực sử dụng |

### 9.4 NOTIFICATION.IsRead

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `0`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Chưa đọc |
| `1` | Người dùng đã đánh dấu đọc |

### 9.5 POLICY_AND_TERM.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Ngừng áp dụng cho lựa chọn mới |
| `1` | Được lựa chọn áp dụng nếu đã đến EffectiveDate |

### 9.6 PARTNER_FACILITY.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `ACTIVE` | Được xem xét sử dụng cho kế hoạch mới |
| `INACTIVE` | Ngừng nhận lựa chọn/phân công mới |

### 9.7 FACILITY_CONTRACT.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `DRAFT` | Đang soạn |
| `ACTIVE` | Đang hiệu lực và trong khoảng ngày áp dụng |
| `EXPIRED` | Đã hết hạn |
| `TERMINATED` | Chấm dứt trước hạn |

### 9.8 FACILITY_CERTIFICATION.IsInternationalStandard

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `0`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Không đánh dấu thuộc chuẩn quốc tế; không có nghĩa chứng nhận hết hạn |
| `1` | Thuộc chuẩn quốc tế |

### 9.9 TRANSPORT_REQUEST.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `DRAFT` | Chưa gửi |
| `PENDING_REVIEW` | Đã nộp, chờ Manager thẩm định xét duyệt (chuẩn Flow 1 API/FE) |
| `CHANGES_REQUESTED` | Chờ Customer sửa và gửi lại |
| `CONTRACT_PREPARATION` | Đơn đã duyệt, đang chuẩn bị phương án/bảng giá và dự thảo hợp đồng |
| `CONTRACT_READY` | Hợp đồng đã phát hành, chờ thanh toán cọc và ký |
| `CONTRACT_CHANGES_REQUESTED` | Chờ xử lý phản hồi sửa điều khoản hợp đồng của Customer |
| `DEPOSIT_VERIFIED` | Đã xác minh nhận tiền cọc thành công |
| `ACTIVATED` | Đã ký OTP thành công, hợp đồng có hiệu lực, đã kích hoạt đơn tạo Trip |
| `REJECTED` | Đã từ chối |
| `CANCELLED` | Đã hủy hợp lệ |
| `CANCELLATION_REQUESTED` | Chờ Manager xử lý hủy; phải lưu prevStatus |
| `SCHEDULED` | Gate 1 đã duyệt, phân công xác nhận; chưa khởi hành |
| `IN_PROGRESS` | Đang trong hành trình vận chuyển thực tế |
| `DELIVERED` | Đã giao hợp lệ, đơn còn mở |
| `CLOSED` | Đã tất toán và đủ điều kiện đóng sau feedback/khiếu nại |

### 9.10 LEGAL_MEDICAL_RECORD.RequirementStatus

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa đánh giá yêu cầu; không coi là OPTIONAL hay NOT_APPLICABLE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `MANDATORY` | Bắt buộc theo checklist áp dụng |
| `OPTIONAL` | Tùy chọn |
| `NOT_APPLICABLE` | Không áp dụng cho phạm vi này |

### 9.11 LEGAL_MEDICAL_RECORD.DocumentStatus

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING_REVIEW` | Đã nộp chờ Specialist xét |
| `VERIFIED` | Đã duyệt theo phạm vi và thời điểm sử dụng |
| `REJECTED` | Bị từ chối, cần lý do |
| `EXPIRED` | Không còn hiệu lực sử dụng |

### 9.12 QUARANTINE_BOOKING.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING_CONFIRMATION` | Chờ cơ sở xác nhận |
| `CONFIRMED` | Lịch được xác nhận |
| `IN_PROGRESS` | Đang thực hiện cách ly |
| `COMPLETED` | Quy trình booking/cách ly đã hoàn thành |
| `CANCELLED` | Đã hủy |
| `REJECTED` | Cơ sở từ chối |

### 9.13 TRIP_PLAN.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PLANNING` | Đang chuẩn bị chuyến sau ký |
| `READY_TO_DEPART` | Đủ điều kiện và Manager đã duyệt khởi hành |
| `IN_TRANSIT` | Đã khởi hành, chưa bàn giao cuối hợp lệ |
| `COMPLETED` | Đã bàn giao cuối hợp lệ |

### 9.14 TRIP_PLAN.DeploymentStatus

- Kiểu SQL: `VARCHAR(12)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa ghi nhận hành động triển khai; không đồng nghĩa đã CONFIRMED.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING` | Đã ghi nhận chờ bàn giao triển khai |
| `CONFIRMED` | Đã xác nhận giao việc triển khai |
| `ON_HOLD` | Tạm dừng triển khai trước khởi hành; giữ event/phân công, bắt buộc metadata |

### 9.15 VEHICLE.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `AVAILABLE` | Có thể xem xét phân công, vẫn phải kiểm tra lịch |
| `ON_TRIP` | Đang thực hiện chuyến |
| `MAINTENANCE` | Đang bảo trì/không đủ điều kiện hoạt động |
| `INACTIVE` | Ngừng sử dụng |

### 9.16 ROUTE_SEGMENT.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING` | Mốc/chặng chưa đến lượt thực hiện |
| `IN_PROGRESS` | Đang thực hiện |
| `COMPLETED` | Đã xác nhận thực hiện thực tế |

### 9.17 FLIGHT_BOOKING.DirectFlight

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Chuyến bay không thẳng; ngoài lựa chọn demo theo SRS |
| `1` | Chuyến bay thẳng |

### 9.18 FLIGHT_BOOKING.BookingConfirmed

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Chưa xác nhận; không dùng thay trạng thái bị hủy |
| `1` | Đã xác nhận booking, cần mã booking và điều kiện Gate 1 |

### 9.19 CUSTOMS_CLEARANCE.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING` | Chờ kết quả |
| `ON_HOLD` | Đang bị giữ/chờ bổ sung |
| `CLEARED` | Đã được thông quan thực tế |
| `REJECTED` | Đã bị từ chối |

### 9.20 HEALTH_LOG.HealthStatus

- Kiểu SQL: `NVARCHAR(100)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa ghi nhận mô tả sức khỏe; không suy thành khỏe mạnh.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `Văn bản NVARCHAR(100)` | Quan sát/kết luận sức khỏe tại lần ghi; ví dụ “Ổn định”, “Sốt”; không có enum HEALTHY/SICK được thống nhất |

### 9.21 INCIDENT.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `OPEN` | Vừa ghi nhận |
| `IN_PROGRESS` | Đang phối hợp xử lý |
| `AWAITING_APPROVAL` | Chờ quyết định Manager cho phần cần duyệt |
| `RESOLVED` | Đã xử lý và đủ các xác nhận liên quan |

### 9.22 HANDOVER.IsAuthorized

- Kiểu SQL: `BIT`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: HANDOVER: chưa kiểm tra quyền nhận.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Đã xác định không có quyền nhận |
| `1` | Đã xác minh người nhận có quyền nhận |

### 9.23 HANDOVER.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa xác định; không đủ điều kiện nghiệp vụ nếu field này bắt buộc tại bước đang xử lý.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `DRAFT` | Đang kiểm tra/soạn biên bản |
| `AWAITING_OTP` | Đủ nội dung, chờ người nhận ký |
| `CONFIRMED` | Biên bản đã xác nhận hợp lệ, có bằng chứng và OTP đúng bản |
| `REFUSED` | Người nhận từ chối, phải giữ lý do |

### 9.24 HANDOVER_ITEM.MicrochipVerified

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `0`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Chưa xác minh thành công; chưa tách được chưa kiểm tra và chip sai |
| `1` | Đã đối chiếu đúng microchip |

### 9.25 HANDOVER_ITEM.ConditionStatus

- Kiểu SQL: `NVARCHAR(100)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa ghi nhận tình trạng; không coi là kiểm tra đạt.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `Văn bản NVARCHAR(100)` | Mô tả tình trạng từng ngựa tại giao/nhận; ví dụ “Thể trạng tốt”; không phải trạng thái xử lý biên bản |

### 9.26 CONTRACT_TEMPLATE.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Ngừng chọn mới, giữ snapshot cũ |
| `1` | Cho phép chọn điều khoản cho snapshot mới |

### 9.27 CONTRACT.ContractStatus

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `DRAFT` | Đang soạn |
| `ISSUED` | Đã phát hành, chờ hoàn tất cọc và ký |
| `EFFECTIVE` | Đã ký thành công, hợp đồng có hiệu lực thi hành; đang thực hiện hoặc còn công nợ |
| `SETTLED` | Đã nghiệm thu/tất toán, còn theo dõi sau chuyến |
| `CLOSED` | Đã đủ điều kiện kết thúc sau cửa sổ feedback |
| `CANCELLED` | Đã hủy theo quy trình |

### 9.28 CONTRACT.CancellationStatus

- Kiểu SQL: `VARCHAR(12)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa có yêu cầu hủy; cả nhóm metadata hủy phải nhất quán.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING` | Customer yêu cầu hủy, chưa có quyết định |
| `APPROVED` | Manager chấp thuận hủy |
| `REJECTED` | Manager từ chối hủy |

### 9.29 CONTRACT.FeedbackStatus

- Kiểu SQL: `VARCHAR(20)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa có yêu cầu sửa hợp đồng; không phải đánh giá sau chuyến.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING` | Chờ xử lý yêu cầu sửa hợp đồng trước ký |
| `ACCEPTED` | Chấp nhận sửa, chuẩn bị phiên bản mới |
| `REJECTED` | Từ chối sửa, có phản hồi |

### 9.30 CONTRACT.RefundStatus

- Kiểu SQL: `VARCHAR(20)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa phát sinh hoàn; không suy thành đã hoàn hoặc số tiền bằng 0.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `REQUESTED` | Đã đề nghị hoàn |
| `PROCESSING` | Đang xử lý hoàn thực tế |
| `COMPLETED` | Đã hoàn thực tế, có mã tham chiếu |

### 9.31 CONTRACT_VERSION.VersionStatus

- Kiểu SQL: `VARCHAR(20)`. Cho NULL: **Không**. DEFAULT: `'DRAFT'`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `DRAFT` | Bản nháp còn sửa được |
| `ISSUED` | Bản đã phát hành, nội dung bất biến |
| `SUPERSEDED` | Bản bị thay thế, không ký/thanh toán |
| `SIGNED` | Bản đã ký, nội dung bất biến |
| `CANCELLED` | Bản bị hủy hợp lệ, giữ lịch sử |

### 9.32 INVOICE.PaymentStatus

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `UNPAID` | Chưa có tiền xác minh được phân bổ |
| `PARTIALLY_PAID` | Đã trả một phần, còn thiếu |
| `PAID` | Đã xác minh đủ tiền phải trả |
| `CANCELLED` | Hóa đơn bị vô hiệu hóa hợp lệ, giữ lịch sử |

### 9.33 PAYMENT.Status

- Kiểu SQL: `VARCHAR(50)`. Cho NULL: **Không**. DEFAULT: `Không khai báo`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `PENDING_GATEWAY` | Attempt cổng chờ kết quả |
| `SUCCESS` | Đã xác minh giao dịch thành công |
| `FAILED` | Attempt thất bại có kết quả xác định |
| `REVIEW_REQUIRED` | Ngoại lệ cần đối soát trước khi kết luận |

### 9.34 PAYMENT.VnpayTransactionStatus

- Kiểu SQL: `VARCHAR(10)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa có mã provider; không đủ kết luận giao dịch VNPAY thành công.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `'00'` | Mã thành công mà CHECK SUCCESS hiện yêu cầu |
| `Mã provider khác` | Giữ nguyên chuỗi provider và đối soát theo tích hợp; không tự gán một nghĩa chung cho mọi mã khác 00 |

### 9.35 PAYMENT.FinancialReviewRequired

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `((0))`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Không có yêu cầu review đang mở; không tự chứng minh SUCCESS |
| `1` | Cần review tài chính, phải có lý do |

### 9.36 COST_RATE.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Ngừng sử dụng tính giá mới |
| `1` | Cho phép sử dụng tính giá mới |

### 9.37 COUNTRY.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Không mở lựa chọn mới, giữ lịch sử |
| `1` | Quốc gia đang mở cho lựa chọn mới trong phạm vi tuyến hỗ trợ |

### 9.38 SUPPORTED_ROUTE.IsActive

- Kiểu SQL: `BIT`. Cho NULL: **Không**. DEFAULT: `1`.
- Khi NULL: Không hợp lệ theo SQL; không gửi NULL khi INSERT/UPDATE.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Tuyến ngừng nhận yêu cầu mới |
| `1` | Tuyến được mở cho yêu cầu mới |

### 9.39 BUSINESS_POLICY.BoolValue

- Kiểu SQL: `BIT`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chỉ NULL khi ValueType khác BOOLEAN; nếu ValueType = BOOLEAN thì SQL bắt buộc có 0 hoặc 1.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `0` | Giá trị sai của policy có ValueType BOOLEAN |
| `1` | Giá trị đúng của policy có ValueType BOOLEAN |

### 9.40 PAYMENT.VnpayResponseCode

- Kiểu SQL: `VARCHAR(10)`. Cho NULL: **Có**. DEFAULT: `Không khai báo`.
- Khi NULL: Chưa nhận kết quả provider; không đồng nghĩa FAILED.

| Giá trị lưu | Ý nghĩa thống nhất |
|---|---|
| `'00'` | Mã kết quả thành công mà CHECK SUCCESS hiện yêu cầu |
| `Mã provider khác` | Giữ nguyên mã provider; tài liệu nguồn chưa có catalog đầy đủ, không tự đặt mã nội bộ thay thế |

## 10. Field không tên Status nhưng biểu thị hoặc quyết định một trạng thái

Các field dưới đây không nhận enum mới. Bảng nêu cách đọc giá trị hiện hữu và điều KHÔNG được suy ra từ chúng. Dữ liệu thời gian là UTC theo quy ước nhóm; DATE phải được đánh giá theo ngày sử dụng tại nghiệp vụ/cơ sở liên quan. Trạng thái dẫn xuất nêu trong bảng là nhãn trả ra/UI, không tự thêm cột vào SQL.

| Field | Giá trị/điều kiện | Ý nghĩa và giới hạn |
|---|---|---|
| `USER.ForgotPasswordRequest` | `NVARCHAR(500)`; NULL: Có | NULL: không có metadata request tương ứng; khác NULL: có payload kỹ thuật, phải validate theo auth. Không tự suy request còn hiệu lực từ sự tồn tại chuỗi. |
| `USER.ResetPasswordRequest` | `NVARCHAR(500)`; NULL: Có | NULL: không có metadata request tương ứng; khác NULL: có payload kỹ thuật, phải validate theo auth. Không tự suy request còn hiệu lực từ sự tồn tại chuỗi. |
| `USER.ResetOtpCode` | `VARCHAR(10)`; NULL: Có | NULL: không có mã reset đang lưu; khác NULL: có mã, phải kiểm tra đúng mã, thời hạn và quy tắc sử dụng. Không đưa mã ra log/UI ngoài luồng OTP. |
| `USER.ResetOtpExpiry` | `DATETIME2`; NULL: Có | NULL: không có thời hạn xác định; > hiện tại: chưa hết hạn; <= hiện tại: hết hạn. Có thời hạn chưa chứng minh OTP đúng hoặc tài khoản đã xác minh. |
| `HORSE.PassportIssuedDate` | `DATE`; NULL: Có | So sánh ngày cấp/ngày hết hạn với thời điểm cần sử dụng; NULL: chưa biết. Có scan/hộ chiếu không tự chứng minh còn hạn. |
| `HORSE.PassportExpiryDate` | `DATE`; NULL: Có | So sánh ngày cấp/ngày hết hạn với thời điểm cần sử dụng; NULL: chưa biết. Có scan/hộ chiếu không tự chứng minh còn hạn. |
| `STAFF_DOCUMENT.IssueDate` | `DATE`; NULL: Có | IssueDate sau ngày sử dụng: chưa hiệu lực; quá ExpiryDate: hết hạn; gần hết hạn theo ngưỡng: sắp hết hạn. NULL ở IssueDate không chứng minh đã có hiệu lực; ExpiryDate NOT NULL. Không thay kiểm tra nước/loại giấy tờ. |
| `STAFF_DOCUMENT.ExpiryDate` | `DATE`; NULL: Không | IssueDate sau ngày sử dụng: chưa hiệu lực; quá ExpiryDate: hết hạn; gần hết hạn theo ngưỡng: sắp hết hạn. NULL ở IssueDate không chứng minh đã có hiệu lực; ExpiryDate NOT NULL. Không thay kiểm tra nước/loại giấy tờ. |
| `STAFF_DOCUMENT.ValidForCountries` | `VARCHAR(500)`; NULL: Có | NULL: chưa xác định phạm vi; có CSV mã ISO: chỉ xem đủ điều kiện khi quốc gia chặng nằm trong phạm vi và chứng từ còn hiệu lực. Đây là phạm vi, không phải enum trạng thái. |
| `POLICY_AND_TERM.EffectiveDate` | `DATE`; NULL: Không | Ngày tương lai: chưa đến thời điểm áp dụng dù IsActive=1; đến ngày và IsActive=1: có thể áp dụng; IsActive=0: ngừng chọn mới. |
| `FACILITY_CONTRACT.ValidFrom` | `DATE`; NULL: Có | NULL: thiếu mốc hiệu lực, phải xác minh trước sử dụng; ngoài khoảng ngày: chưa/hết hiệu lực dù Status=ACTIVE. Không tự đổi Status khi chỉ mở trang. |
| `FACILITY_CONTRACT.ValidTo` | `DATE`; NULL: Có | NULL: thiếu mốc hiệu lực, phải xác minh trước sử dụng; ngoài khoảng ngày: chưa/hết hiệu lực dù Status=ACTIVE. Không tự đổi Status khi chỉ mở trang. |
| `FACILITY_CERTIFICATION.IssueDate` | `DATE`; NULL: Có | NULL: chưa rõ hiệu lực; kiểm tra ngày sử dụng thực tế. Không suy IsInternationalStandard=1 thành chứng nhận hợp lệ hoặc còn hạn. |
| `FACILITY_CERTIFICATION.ExpiryDate` | `DATE`; NULL: Có | NULL: chưa rõ hiệu lực; kiểm tra ngày sử dụng thực tế. Không suy IsInternationalStandard=1 thành chứng nhận hợp lệ hoặc còn hạn. |
| `TRANSPORT_REQUEST.ExpectedDate` | `DATETIME`; NULL: Có | Ngày dự kiến xuất phát, không phải bằng chứng đã khởi hành. Dùng với PreparationDays để kiểm tra cutoff chuẩn bị. |
| `TRANSPORT_REQUEST.CommittedDeadline` | `DATETIME`; NULL: Có | NULL: chưa chốt hạn giao; thời điểm giao thực tế > hạn: giao trễ. Quá hạn chưa có bàn giao không tự hoàn tất/hủy đơn. |
| `TRANSPORT_REQUEST.SubmissionKeyHash` | `VARCHAR(64)`; NULL: Có | NULL: chưa lưu khóa chống trùng; có hash: có khóa idempotency cho thao tác submit theo hợp đồng backend. Không chứng minh Request đã được duyệt hoặc gửi thành công nếu transaction chưa commit. |
| `TRANSPORT_REQUEST.RevisionFeedback` | `NVARCHAR(2000)` | Có | Lời nhắn yêu cầu sửa gần nhất; không có revisionFields. |
| `TRANSPORT_REQUEST.CancellationPreviousStatus` | `VARCHAR(50)` | Có | Bắt buộc khi CANCELLATION_REQUESTED, phục hồi khi từ chối; NULL cho hủy ngay. |
| `TRANSPORT_REQUEST.CancellationReason` | `NVARCHAR(1000)` | Có | Lý do hủy cấp Request. |
| `TRANSPORT_REQUEST.CancellationRequestedBy` | `VARCHAR(50)` | Có | FK USER, lấy từ token. |
| `TRANSPORT_REQUEST.CancellationRequestedAtUtc` | `DATETIME2(7)` | Có | Thời điểm server ghi nhận yêu cầu/hủy trực tiếp. |
| `LEGAL_MEDICAL_RECORD.VerifiedBy` | `VARCHAR(50)`; NULL: Có | NULL: chưa lưu người thẩm định; có USER: ghi người thẩm định, phải đi cùng DocumentStatus và bằng chứng. Không suy riêng VerifiedBy khác NULL thành VERIFIED. |
| `LEGAL_MEDICAL_RECORD.ExpiryDate` | `DATE`; NULL: Có | NULL: chưa có thời hạn; chỉ coi không có hạn nếu loại tài liệu đã quy định rõ. Có ngày: kiểm tra theo thời điểm sử dụng, không chỉ ngày upload. |
| `QUARANTINE_BOOKING.ExpectedStartDate` | `DATETIME`; NULL: Có | Lịch dự kiến; đến/quá thời gian không tự chuyển IN_PROGRESS/COMPLETED. Chưa có thời gian bắt đầu/kết thúc thực tế trong schema này. |
| `QUARANTINE_BOOKING.ExpectedEndDate` | `DATETIME`; NULL: Có | Lịch dự kiến; đến/quá thời gian không tự chuyển IN_PROGRESS/COMPLETED. Chưa có thời gian bắt đầu/kết thúc thực tế trong schema này. |
| `QUARANTINE_BOOKING.ConfirmationNumber` | `VARCHAR(100)`; NULL: Có | NULL: chưa có mã xác nhận; có mã: dữ liệu bằng chứng đối tác, phải đi cùng Status hợp lệ. Không tự chuyển CONFIRMED chỉ vì có chuỗi. |
| `TRIP_PLAN.DeploymentBy` | `VARCHAR(50)`; NULL: Có | NULL: chưa có metadata tương ứng; PENDING/CONFIRMED/ON_HOLD theo CHECK phải có đủ. Đây là người/thời điểm/lý do triển khai, không phải Gate 1/Gate 2 hay bàn giao ngựa. |
| `TRIP_PLAN.DeploymentAtUtc` | `DATETIME2(7)`; NULL: Có | NULL: chưa có metadata tương ứng; PENDING/CONFIRMED/ON_HOLD theo CHECK phải có đủ. Đây là người/thời điểm/lý do triển khai, không phải Gate 1/Gate 2 hay bàn giao ngựa. |
| `TRIP_PLAN.DeploymentReason` | `NVARCHAR(1000)`; NULL: Có | NULL: chưa có metadata tương ứng; PENDING/CONFIRMED/ON_HOLD theo CHECK phải có đủ. Đây là người/thời điểm/lý do triển khai, không phải Gate 1/Gate 2 hay bàn giao ngựa. |
| `TRIP_PLAN.HandoffEventId` | `VARCHAR(50)`; NULL: Có | NULL khi PENDING; khác NULL khi CONFIRMED hoặc ON_HOLD theo CHECK. Chỉ định danh sự kiện triển khai, không thay HANDOVER.HandoverID. |
| `TRIP_PLAN.AssignedSpecialistId` | `VARCHAR(50)`; NULL: Có | NULL: chưa phân công vai trò tương ứng; có USER: đã ghi phân công, phải kiểm tra đúng role và tài khoản hoạt động. Có cả hai chưa chứng minh hồ sơ/phương án đã duyệt. |
| `TRIP_PLAN.AssignedCoordinatorId` | `VARCHAR(50)`; NULL: Có | NULL: chưa phân công vai trò tương ứng; có USER: đã ghi phân công, phải kiểm tra đúng role và tài khoản hoạt động. Có cả hai chưa chứng minh hồ sơ/phương án đã duyệt. |
| `TRIP_VEHICLE_ASSIGNMENT.DriverID` | `VARCHAR(50)`; NULL: Không | Có giá trị NOT NULL: đã lưu lựa chọn phân công. Không có field xác nhận/giữ lịch, nên sự tồn tại dòng không chứng minh CONFIRMED, khả dụng hoặc không xung đột. Driver và Escort phải độc lập theo SRS. |
| `TRIP_VEHICLE_ASSIGNMENT.EscortID` | `VARCHAR(50)`; NULL: Không | Có giá trị NOT NULL: đã lưu lựa chọn phân công. Không có field xác nhận/giữ lịch, nên sự tồn tại dòng không chứng minh CONFIRMED, khả dụng hoặc không xung đột. Driver và Escort phải độc lập theo SRS. |
| `TRIP_VEHICLE_ASSIGNMENT.VehicleID` | `VARCHAR(50)`; NULL: Không | Có giá trị NOT NULL: đã lưu lựa chọn phân công. Không có field xác nhận/giữ lịch, nên sự tồn tại dòng không chứng minh CONFIRMED, khả dụng hoặc không xung đột. Driver và Escort phải độc lập theo SRS. |
| `ROUTE_SEGMENT.ExpectedETA` | `DATETIME`; NULL: Có | ETA hiện lưu; không phải thời điểm thực tế. Schema chưa có cặp ETA đề xuất/được xác nhận, không sửa âm thầm để coi đã duyệt. |
| `ROUTE_SEGMENT.ActualTime` | `DATETIME`; NULL: Có | NULL: chưa có thời điểm thực tế; khác NULL: đã ghi thời điểm cho mốc/chặng theo định nghĩa. Chỉ coi đến đích khi đúng SegmentType DESTINATION và Status COMPLETED; chưa coi Trip hoàn tất. |
| `FLIGHT_BOOKING.BookingReference` | `VARCHAR(100)`; NULL: Không | SQL NOT NULL, kể cả khi BookingConfirmed=0. Nhóm phải thống nhất cách lưu bản chọn chuyến trước booking; không giả mã đối tác để đáp ứng schema. Có mã không thay bit xác nhận và Gate 1. |
| `FLIGHT_BOOKING.DepartureAt` | `DATETIME`; NULL: Không | Lịch bay lưu trong booking; không tự chứng minh máy bay đã cất/hạ cánh hoặc ngựa đã được bàn giao/tiếp nhận AIR. |
| `FLIGHT_BOOKING.ArrivalAt` | `DATETIME`; NULL: Không | Lịch bay lưu trong booking; không tự chứng minh máy bay đã cất/hạ cánh hoặc ngựa đã được bàn giao/tiếp nhận AIR. |
| `FLIGHT_BOOKING.BookingVersion` | `INT`; NULL: Không | BookingVersion tăng theo phiên bản nghiệp vụ, không biểu thị bản còn hiệu lực một mình; RouteVersionID NULL: chưa có tham chiếu. Không có catalog/FK version tuyến trong SQL này; chưa tự xác định superseded từ số lớn nhất. |
| `FLIGHT_BOOKING.RouteVersionID` | `INT`; NULL: Có | BookingVersion tăng theo phiên bản nghiệp vụ, không biểu thị bản còn hiệu lực một mình; RouteVersionID NULL: chưa có tham chiếu. Không có catalog/FK version tuyến trong SQL này; chưa tự xác định superseded từ số lớn nhất. |
| `CUSTOMS_CLEARANCE.ClearedAt` | `DATETIME`; NULL: Có | NULL: chưa ghi thời điểm được thông quan; khác NULL phải đồng bộ Status CLEARED và bằng chứng. Không tự coi CLEARED chỉ từ timestamp. |
| `CUSTOMS_CLEARANCE.DeclarationNumber` | `VARCHAR(100)`; NULL: Có | Có số khai báo chưa có nghĩa đã được thông quan. NULL: chưa ghi số; yêu cầu bắt buộc tùy loại thủ tục. |
| `HEALTH_LOG.Temperature` | `DECIMAL(4, 1)`; NULL: Có | NULL: chưa đo/ghi; số đo: dữ liệu quan sát, không tự chốt đủ điều kiện vận chuyển bằng ngưỡng tự đặt. Kết luận chuyên môn do Vet được phân công. |
| `HEALTH_LOG.HeartRate` | `INT`; NULL: Có | NULL: chưa đo/ghi; số đo: dữ liệu quan sát, không tự chốt đủ điều kiện vận chuyển bằng ngưỡng tự đặt. Kết luận chuyên môn do Vet được phân công. |
| `HEALTH_LOG.LogTime` | `DATETIME`; NULL: Không | Thời điểm ghi nhận sức khỏe theo nghiệp vụ. DEFAULT GETDATE không tự đảm bảo UTC trên mọi máy; backend phải bảo đảm quy ước UTC. Không dùng làm thời điểm giải quyết sự cố. |
| `INCIDENT.ApprovedBy` | `VARCHAR(50)`; NULL: Có | NULL: chưa ghi phê duyệt Manager hoặc tình huống không yêu cầu duyệt; có USER: có người duyệt nhưng chưa đủ lịch sử/đối tượng quyết định. Không đồng nghĩa RESOLVED. |
| `INCIDENT.AdditionalCost` | `DECIMAL(12, 2)`; NULL: Có | NULL: chưa xác định chi phí; 0: ghi nhận không phát sinh nếu đã được xác minh; >0: số tiền phát sinh ghi nhận. Không chứng minh đã duyệt hay Customer phải trả; không tính trùng COST_ITEM. |
| `HANDOVER.HandedByUserID` | `VARCHAR(50)`; NULL: Không | Người ghi/thực hiện bàn giao theo phân công. Không phải xác nhận OTP của người nhận và không tự chứng minh CONFIRMED. |
| `HANDOVER_ITEM.AssetCheck` | `NVARCHAR(MAX)`; NULL: Có | NULL: chưa ghi kiểm tra; văn bản: nội dung đối chiếu tài sản/giấy tờ. Không ép văn bản thành PASS/FAIL, không dùng chuỗi không rỗng thay đủ checklist. |
| `CONTRACT.CurrentVersionNo` | `INT`; NULL: Có | NULL: chưa trỏ bản hiện hành (hợp lệ trong bước tạo transaction); >0: tham chiếu phiên bản. Phải đọc VersionStatus; số version lớn nhất không tự có nghĩa đã phát hành/ký. |
| `CONTRACT.TripID` | `VARCHAR(50)`; NULL: Có | NULL: chưa liên kết Trip; có Trip: liên kết đã lưu. Không đủ chứng minh Trip được phép khởi hành hoặc hợp đồng đã tất toán. |
| `CONTRACT.PublishedAtUtc` | `DATETIME2(7)`; NULL: Có | NULL: chưa ghi phát hành tương ứng; có thời điểm phát hành phải đủ metadata/PDF/cọc/deadline theo CHECK. Không chứng minh Customer đã đồng ý hoặc đã ký. |
| `CONTRACT.PublishedBy` | `VARCHAR(50)`; NULL: Có | NULL: chưa ghi phát hành tương ứng; có thời điểm phát hành phải đủ metadata/PDF/cọc/deadline theo CHECK. Không chứng minh Customer đã đồng ý hoặc đã ký. |
| `CONTRACT.SignedAt` | `DATETIME`; NULL: Có | SignedAt NULL: chưa ghi ký; có SignedAt: bằng chứng ký hợp đồng cần đồng bộ version SIGNED, điều kiện cọc/OTP/deadline. SignerEmail có giá trị một mình không chứng minh đã ký; OTP ký hợp đồng khác OTP nhận ngựa. |
| `CONTRACT.SignerEmail` | `VARCHAR(255)`; NULL: Có | SignedAt NULL: chưa ghi ký; có SignedAt: bằng chứng ký hợp đồng cần đồng bộ version SIGNED, điều kiện cọc/OTP/deadline. SignerEmail có giá trị một mình không chứng minh đã ký; OTP ký hợp đồng khác OTP nhận ngựa. |
| `CONTRACT.CompletionDeadline` | `DATETIME2(7)`; NULL: Có | Hạn chung hoàn thành cọc/xác minh/ký, không phải hạn hoàn thành Trip. <= hiện tại khi chưa ký: quá hạn thao tác, không tự hủy Request. Hợp đồng đã ký hợp lệ không mất hiệu lực chỉ vì đồng hồ vượt deadline này. |
| `CONTRACT.SignOtpHash` | `VARCHAR(255)`; NULL: Có | NULL: không có OTP ký đang lưu, có thể chưa cấp/đã tiêu thụ/đã thu hồi; có hash: chỉ là ứng viên OTP, phải kiểm tra expiry, số lần thử, phiên bản, cọc và deadline. |
| `CONTRACT.SignOtpExpiry` | `DATETIME2(7)`; NULL: Có | NULL: chưa có hạn OTP; > hiện tại: chưa hết hạn; <= hiện tại: OTP hết hạn. Không gia hạn CompletionDeadline khi gửi lại OTP. |
| `CONTRACT.SignOtpFailedAttempts` | `INT`; NULL: Không | 0: chưa ghi lần sai từ lần reset hợp lệ; 0<n<policy max: còn lượt; n>=max: chặn OTP theo quy trình. Chỉ SQL kiểm tra >=0; giới hạn tối đa do BUSINESS_POLICY và backend. |
| `CONTRACT.SignOtpSentAtUtc` | `DATETIME2(7)`; NULL: Có | NULL: chưa lưu lần gửi; khác NULL: dùng kiểm tra thời gian resend theo policy, không đồng nghĩa email đã được nhận hoặc OTP còn hợp lệ. |
| `CONTRACT.LastExtensionReason` | `NVARCHAR(1000)`; NULL: Có | Cả nhóm NULL: chưa ghi lần gia hạn; có phải đủ nhóm theo CHECK. Chỉ lưu lần gia hạn gần nhất; không xây audit hoặc lịch sử gia hạn riêng. |
| `CONTRACT.LastExtensionBy` | `VARCHAR(50)`; NULL: Có | Cả nhóm NULL: chưa ghi lần gia hạn; có phải đủ nhóm theo CHECK. Chỉ lưu lần gia hạn gần nhất; không xây audit hoặc lịch sử gia hạn riêng. |
| `CONTRACT.LastExtensionAtUtc` | `DATETIME2(7)`; NULL: Có | Cả nhóm NULL: chưa ghi lần gia hạn; có phải đủ nhóm theo CHECK. Chỉ lưu lần gia hạn gần nhất; không xây audit hoặc lịch sử gia hạn riêng. |
| `CONTRACT.CancellationId` | `VARCHAR(50)`; NULL: Có | NULL đồng bộ khi chưa có yêu cầu hủy; có đủ khi phát sinh yêu cầu. Phải xem CancellationStatus; có request chưa có nghĩa hủy thành công. |
| `CONTRACT.CancellationReason` | `NVARCHAR(1000)`; NULL: Có | NULL đồng bộ khi chưa có yêu cầu hủy; có đủ khi phát sinh yêu cầu. Phải xem CancellationStatus; có request chưa có nghĩa hủy thành công. |
| `CONTRACT.CancellationRequestedAtUtc` | `DATETIME2(7)`; NULL: Có | NULL đồng bộ khi chưa có yêu cầu hủy; có đủ khi phát sinh yêu cầu. Phải xem CancellationStatus; có request chưa có nghĩa hủy thành công. |
| `CONTRACT.CancellationDecisionReason` | `NVARCHAR(1000)`; NULL: Có | PENDING: cả nhóm NULL theo CHECK; APPROVED/REJECTED: đủ nhóm. Có thời điểm quyết định không đồng nghĩa đã hoàn tiền. |
| `CONTRACT.CancellationDecidedBy` | `VARCHAR(50)`; NULL: Có | PENDING: cả nhóm NULL theo CHECK; APPROVED/REJECTED: đủ nhóm. Có thời điểm quyết định không đồng nghĩa đã hoàn tiền. |
| `CONTRACT.CancellationDecidedAtUtc` | `DATETIME2(7)`; NULL: Có | PENDING: cả nhóm NULL theo CHECK; APPROVED/REJECTED: đủ nhóm. Có thời điểm quyết định không đồng nghĩa đã hoàn tiền. |
| `CONTRACT.CustomerFeedback` | `NVARCHAR(2000)`; NULL: Có | NULL: chưa ghi yêu cầu sửa trước ký; khi FeedbackStatus có giá trị phải có nội dung/thời điểm theo CHECK. Không dùng làm mốc mở feedback sau chuyến. |
| `CONTRACT.FeedbackAtUtc` | `DATETIME2(7)`; NULL: Có | NULL: chưa ghi yêu cầu sửa trước ký; khi FeedbackStatus có giá trị phải có nội dung/thời điểm theo CHECK. Không dùng làm mốc mở feedback sau chuyến. |
| `CONTRACT.ManagerFeedback` | `NVARCHAR(2000)`; NULL: Có | NULL: chưa ghi phản hồi/kết thúc xử lý yêu cầu sửa; có dữ liệu: phản hồi Manager, phải khớp FeedbackStatus. SQL chưa bắt đủ mọi tổ hợp, backend phải kiểm tra. |
| `CONTRACT.FeedbackHandledAtUtc` | `DATETIME2(7)`; NULL: Có | NULL: chưa ghi phản hồi/kết thúc xử lý yêu cầu sửa; có dữ liệu: phản hồi Manager, phải khớp FeedbackStatus. SQL chưa bắt đủ mọi tổ hợp, backend phải kiểm tra. |
| `CONTRACT.RefundAmount` | `DECIMAL(12,2)`; NULL: Có | Flow 1 cho NULL khi chỉ theo dõi RefundStatus; nếu có phải >0. Không suy đã chuyển tiền từ amount/status. |
| `CONTRACT.RefundReference` | `VARCHAR(100)`; NULL: Có | Flow 1 cho NULL kể cả COMPLETED vì chỉ theo dõi status; nếu có thì là metadata tham chiếu, không phải bằng chứng hệ thống đã chuyển tiền. |
| `CONTRACT_VERSION.PublishedBy` | `VARCHAR(50)`; NULL: Có | ISSUED/SUPERSEDED/SIGNED phải có metadata phát hành và PDF theo CHECK. Có metadata không tự chứng minh đã ký. |
| `CONTRACT_VERSION.PublishedAtUtc` | `DATETIME2(7)`; NULL: Có | ISSUED/SUPERSEDED/SIGNED phải có metadata phát hành và PDF theo CHECK. Có metadata không tự chứng minh đã ký. |
| `CONTRACT_VERSION.SignedAtUtc` | `DATETIME2(7)`; NULL: Có | SIGNED cần đủ thời gian/email và phát hành; thời điểm ký không trước phát hành. Bản CANCELLED có thể vẫn giữ dấu ký; không xóa bằng chứng lịch sử. |
| `CONTRACT_VERSION.SignerEmail` | `VARCHAR(255)`; NULL: Có | SIGNED cần đủ thời gian/email và phát hành; thời điểm ký không trước phát hành. Bản CANCELLED có thể vẫn giữ dấu ký; không xóa bằng chứng lịch sử. |
| `INVOICE.TotalPayableAmount` | `DECIMAL(12, 2)`; NULL: Không | PaidAmount=0 và phải trả>0: chưa trả; 0<PaidAmount<phải trả: trả một phần; đủ: PAID sau xác minh. Đối soát tổng PAYMENT SUCCESS và phân bổ; không cộng PENDING/FAILED. Tiền thừa/điều chỉnh cần xử lý riêng. |
| `INVOICE.PaidAmount` | `DECIMAL(12, 2)`; NULL: Không | PaidAmount=0 và phải trả>0: chưa trả; 0<PaidAmount<phải trả: trả một phần; đủ: PAID sau xác minh. Đối soát tổng PAYMENT SUCCESS và phân bổ; không cộng PENDING/FAILED. Tiền thừa/điều chỉnh cần xử lý riêng. |
| `INVOICE.DueDate` | `DATETIME`; NULL: Có | NULL: chưa chốt hạn; còn dư nợ và quá hạn: dẫn xuất quá hạn. Không ghi đè PaymentStatus bằng OVERDUE và không tự xóa nợ. |
| `PAYMENT.ConfirmedByUserID` | `VARCHAR(50)`; NULL: Có | NULL có thể chưa được xác minh thủ công hoặc do cổng tự xác minh; có USER là người đối soát. Không buộc mọi SUCCESS cổng phải có Manager; không suy SUCCESS chỉ từ field này. |
| `PAYMENT.TransactionCode` | `VARCHAR(100)`; NULL: Có | NULL: chưa ghi mã; có mã: định danh đối soát/chống trùng. Không tự chứng minh giao dịch thành công; VNPAY SUCCESS bị CHECK yêu cầu có mã. |
| `PAYMENT.PaymentDate` | `DATETIME`; NULL: Không | Thời điểm giao dịch/bản ghi theo hợp đồng backend, SQL có DEFAULT GETDATE. Không phải bằng chứng đã SUCCESS hoặc giờ đối soát; backend cần bảo đảm UTC. |
| `PAYMENT.VnpayTmnCode` | `VARCHAR(8)`; NULL: Có | Có TMN: kích hoạt các CHECK nhánh VNPAY; NULL: các CHECK nhánh này không chứng minh được tính đúng của thanh toán thủ công. Không dùng NULL để né validation. |
| `PAYMENT.VnpayCreatedAtUtc` | `DATETIME2(7)`; NULL: Có | Khoảng hiệu lực attempt; hết hạn không tự suy FAILED nếu kết quả còn bất đồng/chờ đối soát. Callback đến muộn phải xử lý theo điều kiện tài chính và hợp đồng, không tự mở quyền ký. |
| `PAYMENT.VnpayExpiresAtUtc` | `DATETIME2(7)`; NULL: Có | Khoảng hiệu lực attempt; hết hạn không tự suy FAILED nếu kết quả còn bất đồng/chờ đối soát. Callback đến muộn phải xử lý theo điều kiện tài chính và hợp đồng, không tự mở quyền ký. |
| `PAYMENT.VnpayReceivedAmount` | `DECIMAL(12,2)`; NULL: Có | NULL: chưa ghi số tiền nhận; >0: tiền báo nhận; SUCCESS VNPAY cần bằng Amount theo CHECK và chữ ký/mã provider đúng theo backend. |
| `PAYMENT.FinancialReviewReason` | `NVARCHAR(1000)`; NULL: Có | FinancialReviewRequired=1 phải có lý do theo CHECK. Lý do tồn tại không thay kết luận review, không tự chứng minh FAILED. |
| `PAYMENT.FinancialReviewedBy` | `VARCHAR(50)`; NULL: Có | Cùng NULL: chưa lưu review; cùng có: đã ghi người/thời điểm review theo CHECK. Không tự chứng minh tiền thu thành công; phải xem kết quả và bằng chứng. |
| `PAYMENT.FinancialReviewedAtUtc` | `DATETIME2(7)`; NULL: Có | Cùng NULL: chưa lưu review; cùng có: đã ghi người/thời điểm review theo CHECK. Không tự chứng minh tiền thu thành công; phải xem kết quả và bằng chứng. |

### 10.0 Cách đọc các thời điểm và trạng thái dẫn xuất

- `NOTIFICATION.SentAt` (DATETIME, NOT NULL, DEFAULT GETDATE): thời điểm ghi nhận thông báo đã gửi theo hợp đồng backend. Vì được điền mặc định khi INSERT, riêng field này chưa chứng minh email/SMS/in-app đã được chuyển đến hay người dùng đã đọc; `IsRead` quản lý việc đọc riêng. Schema không có trạng thái gửi thất bại/đang gửi.
- `BUSINESS_POLICY.ValueType` quyết định có được đọc `BoolValue` như trạng thái boolean hay không: chỉ BOOLEAN được có BoolValue 0/1; NUMBER/TEXT phải để BoolValue NULL theo CHECK. Không dùng BoolValue để bật/tắt policy nếu Code đó không định nghĩa hành vi này.
- Trạng thái dẫn xuất của thời hạn nên trả thành field riêng trong DTO nếu cần, không ghi đè status lưu: `NOT_YET_VALID` (chưa đến hiệu lực), `VALID` (đủ hiệu lực), `EXPIRED` (hết hạn), `UNKNOWN` (thiếu dữ liệu). Đây là NAME đề xuất cho kết quả kiểm tra, chưa phải enum/cột SQL mới; cách tính còn phụ thuộc thời điểm sử dụng, loại giấy tờ và phạm vi áp dụng.
- Trạng thái dẫn xuất công nợ: `OVERDUE` chỉ khi còn nợ và đã qua DueDate; không dùng nó thay PAID/PARTIALLY_PAID/UNPAID. `DueDate = NULL` nghĩa chưa xác định quá hạn, không đồng nghĩa còn hạn vô thời hạn.
- Chuỗi rỗng hoặc toàn khoảng trắng không được coi là có bằng chứng dù SQL chỉ kiểm tra NOT NULL. Backend phải validate nội dung, quyền, định dạng và tính xác thực theo field.

### 10.1 Các field tệp và bằng chứng

Tất cả URL/key sau đều có NULL trong schema. NULL nghĩa chưa lưu tham chiếu tệp; khác NULL nghĩa có tham chiếu, KHÔNG chứng minh tệp tồn tại, đọc được, đã duyệt, đã ký hoặc còn hiệu lực. Kiểm tra quyền và nội dung tệp riêng. Trường Flow 1 bị CHECK private/% phải giữ key riêng tư; không thay bằng mã trạng thái hay URL công khai. Tệp seed là placeholder.

| Field | Kiểu SQL | Cách hiểu |
|---|---|---|
| `HORSE.OwnershipCertificateFileUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `HORSE.ValuationDocumentFileUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `HORSE.PhotoUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `HORSE.PassportScanUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `STAFF_DOCUMENT.DocumentUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `FACILITY_CONTRACT.DocumentUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `FACILITY_CERTIFICATION.DocumentUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `TRANSPORT_REQUEST.InvitationLetterFileUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `TRANSPORT_REQUEST.CompetitionRegistrationFileUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `TRANSPORT_REQUEST.AtaCarnetFileUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `LEGAL_MEDICAL_RECORD.UploadedFileUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `HEALTH_LOG.MediaUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `INCIDENT.ImageUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `HANDOVER_ITEM.PhotoUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `CONTRACT.PdfUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `CONTRACT_VERSION.PdfUrl` | `NVARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |
| `COST_ITEM.EvidenceUrl` | `VARCHAR(500)` | Chưa lưu tệp / đã lưu tham chiếu; không tự suy trạng thái duyệt hoặc hoàn thành |

### 10.2 Trường mô tả và phân loại dễ bị nhầm với trạng thái

- HORSE.SpecialHealthNotes, HEALTH_LOG.Description và INCIDENT.Description: nội dung quan sát/xử lý, không thay trạng thái tổng hoặc xác nhận chuyên môn.
- TRANSPORT_REQUEST.ManagerNotes, FLIGHT_BOOKING.Note: ghi chú, không dùng tìm từ khóa để xác định đã duyệt/đã đặt.
- HANDOVER.Type = PICKUP/DELIVERY; ROUTE_SEGMENT.SegmentType xác định loại điểm; không biểu thị hoàn tất.
- PAYMENT.Method, INVOICE.InvoiceType, LEGAL_MEDICAL_RECORD.DocumentType, STAFF_DOCUMENT.DocType, HEALTH_LOG.LogType: loại nghiệp vụ, không phải bước xử lý.
- COST_ITEM.Bearer là bên chịu phí, không phải đã duyệt/đã trả. CategoryName/SubcodeName phân loại khoản mục, không chứng minh đó là chi phí thực tế được duyệt.
- USER.Role là quyền/nhóm vai trò, không thay IsActive hoặc xác nhận phân công.
- HORSE.Sex là giới tính, phân loại sinh học; ReproductiveStatus đã được kê riêng ở mục 9.
- PARTNER_FACILITY.State_Province là địa giới, không phải trạng thái.
- CreatedAt/CreatedAtUtc/UpdatedAt/UpdatedAtUtc, CreatedBy/UpdatedBy chỉ chứng minh metadata tạo/sửa khi backend ghi đúng; không suy một phê duyệt nghiệp vụ từ việc có người/thời gian sửa.
- DOB, Weight, DeclaredValueVnd, CapacityStalls, Rate, BaseCost, TotalCost, T_Total_Hours và khoảng cách là thuộc tính/đầu vào tính điều kiện; không tự chuyển thành một enum trạng thái. Giá trị bất thường phải validate, không tự coi là APPROVED/REJECTED.

## 11. Ma trận toàn bộ field SQL hiện hành

| Field | Kiểu SQL | NULL |
|---|---|---|
| `USER.UserID` | `VARCHAR(50)` | Không |
| `USER.Username` | `VARCHAR(50)` | Có |
| `USER.PasswordHash` | `VARCHAR(255)` | Không |
| `USER.Role` | `VARCHAR(50)` | Không |
| `USER.FullName` | `NVARCHAR(100)` | Không |
| `USER.Email` | `VARCHAR(100)` | Có |
| `USER.Phone` | `VARCHAR(20)` | Có |
| `USER.ForgotPasswordRequest` | `NVARCHAR(500)` | Có |
| `USER.ResetPasswordRequest` | `NVARCHAR(500)` | Có |
| `USER.ResetOtpCode` | `VARCHAR(10)` | Có |
| `USER.ResetOtpExpiry` | `DATETIME2` | Có |
| `USER.IsActive` | `BIT` | Không |
| `HORSE.PassportIssuedBy` | `NVARCHAR(200)` | Có |
| `HORSE.PassportIssuedDate` | `DATE` | Có |
| `HORSE.PassportExpiryDate` | `DATE` | Có |
| `HORSE.OwnershipCertificateFileUrl` | `NVARCHAR(500)` | Có |
| `HORSE.ValuationDocumentFileUrl` | `NVARCHAR(500)` | Có |
| `HORSE.DeclaredValueVnd` | `DECIMAL(18,2)` | Có |
| `HORSE.SpecialHealthNotes` | `NVARCHAR(2000)` | Có |
| `HORSE.HorseID` | `VARCHAR(50)` | Không |
| `HORSE.OwnerID` | `VARCHAR(50)` | Không |
| `HORSE.Microchip_ISO` | `VARCHAR(50)` | Không |
| `HORSE.FEI_Passport_No` | `VARCHAR(50)` | Có |
| `HORSE.Name` | `NVARCHAR(100)` | Không |
| `HORSE.Breed` | `NVARCHAR(100)` | Có |
| `HORSE.Sex` | `VARCHAR(20)` | Có |
| `HORSE.ReproductiveStatus` | `VARCHAR(50)` | Có |
| `HORSE.Weight` | `DECIMAL(10, 2)` | Có |
| `HORSE.DOB` | `DATE` | Có |
| `HORSE.PhotoUrl` | `NVARCHAR(500)` | Có |
| `HORSE.PassportScanUrl` | `NVARCHAR(500)` | Có |
| `STAFF_DOCUMENT.DocumentID` | `VARCHAR(50)` | Không |
| `STAFF_DOCUMENT.UserID` | `VARCHAR(50)` | Không |
| `STAFF_DOCUMENT.DocType` | `VARCHAR(50)` | Không |
| `STAFF_DOCUMENT.CountryOfIssue` | `VARCHAR(3)` | Có |
| `STAFF_DOCUMENT.ValidForCountries` | `VARCHAR(500)` | Có |
| `STAFF_DOCUMENT.IssueDate` | `DATE` | Có |
| `STAFF_DOCUMENT.ExpiryDate` | `DATE` | Không |
| `STAFF_DOCUMENT.DocumentUrl` | `VARCHAR(500)` | Có |
| `STAFF_DOCUMENT.Status` | `VARCHAR(50)` | Không |
| `NOTIFICATION.NotificationID` | `VARCHAR(50)` | Không |
| `NOTIFICATION.UserID` | `VARCHAR(50)` | Không |
| `NOTIFICATION.ReferenceID` | `VARCHAR(50)` | Có |
| `NOTIFICATION.Type` | `VARCHAR(50)` | Có |
| `NOTIFICATION.Channel` | `VARCHAR(50)` | Có |
| `NOTIFICATION.Title` | `NVARCHAR(200)` | Có |
| `NOTIFICATION.Message` | `NVARCHAR(MAX)` | Có |
| `NOTIFICATION.IsRead` | `BIT` | Không |
| `NOTIFICATION.SentAt` | `DATETIME` | Không |
| `POLICY_AND_TERM.PolicyID` | `VARCHAR(50)` | Không |
| `POLICY_AND_TERM.PolicyType` | `VARCHAR(50)` | Không |
| `POLICY_AND_TERM.Title` | `NVARCHAR(255)` | Không |
| `POLICY_AND_TERM.Content` | `NVARCHAR(MAX)` | Không |
| `POLICY_AND_TERM.Version` | `VARCHAR(20)` | Không |
| `POLICY_AND_TERM.EffectiveDate` | `DATE` | Không |
| `POLICY_AND_TERM.IsActive` | `BIT` | Không |
| `POLICY_AND_TERM.CreatedBy` | `VARCHAR(50)` | Có |
| `POLICY_AND_TERM.CreatedAt` | `DATETIME` | Không |
| `POLICY_AND_TERM.UpdatedAt` | `DATETIME` | Có |
| `PARTNER_FACILITY.FacilityID` | `VARCHAR(50)` | Không |
| `PARTNER_FACILITY.Name` | `NVARCHAR(200)` | Không |
| `PARTNER_FACILITY.FacilityType` | `VARCHAR(50)` | Có |
| `PARTNER_FACILITY.CountryCode` | `VARCHAR(3)` | Không |
| `PARTNER_FACILITY.State_Province` | `NVARCHAR(100)` | Có |
| `PARTNER_FACILITY.City` | `NVARCHAR(100)` | Có |
| `PARTNER_FACILITY.Address` | `NVARCHAR(500)` | Có |
| `PARTNER_FACILITY.Coordinates` | `VARCHAR(100)` | Có |
| `PARTNER_FACILITY.TimeZone` | `VARCHAR(50)` | Có |
| `PARTNER_FACILITY.CapacityStalls` | `INT` | Có |
| `PARTNER_FACILITY.ContactPerson` | `NVARCHAR(100)` | Có |
| `PARTNER_FACILITY.ContactPhone` | `VARCHAR(20)` | Có |
| `PARTNER_FACILITY.TaxID_BusinessCode` | `VARCHAR(50)` | Có |
| `PARTNER_FACILITY.Status` | `VARCHAR(50)` | Không |
| `FACILITY_CONTRACT.FacilityContractID` | `VARCHAR(50)` | Không |
| `FACILITY_CONTRACT.FacilityID` | `VARCHAR(50)` | Không |
| `FACILITY_CONTRACT.ContractCode` | `VARCHAR(50)` | Không |
| `FACILITY_CONTRACT.ValidFrom` | `DATE` | Có |
| `FACILITY_CONTRACT.ValidTo` | `DATE` | Có |
| `FACILITY_CONTRACT.RestFeePerHorse_Day` | `DECIMAL(12, 2)` | Có |
| `FACILITY_CONTRACT.BasicMedicalCheckFee` | `DECIMAL(12, 2)` | Có |
| `FACILITY_CONTRACT.DocumentUrl` | `VARCHAR(500)` | Có |
| `FACILITY_CONTRACT.Status` | `VARCHAR(50)` | Không |
| `FACILITY_CERTIFICATION.CertID` | `VARCHAR(50)` | Không |
| `FACILITY_CERTIFICATION.FacilityID` | `VARCHAR(50)` | Không |
| `FACILITY_CERTIFICATION.CertName` | `NVARCHAR(200)` | Có |
| `FACILITY_CERTIFICATION.IssuedBy` | `NVARCHAR(200)` | Có |
| `FACILITY_CERTIFICATION.CountryOfIssue` | `VARCHAR(3)` | Có |
| `FACILITY_CERTIFICATION.IsInternationalStandard` | `BIT` | Không |
| `FACILITY_CERTIFICATION.IssueDate` | `DATE` | Có |
| `FACILITY_CERTIFICATION.ExpiryDate` | `DATE` | Có |
| `FACILITY_CERTIFICATION.DocumentUrl` | `VARCHAR(500)` | Có |
| `TRANSPORT_REQUEST.PickupStableName` | `NVARCHAR(200)` | Có |
| `TRANSPORT_REQUEST.PickupPostalCode` | `NVARCHAR(20)` | Có |
| `TRANSPORT_REQUEST.PickupInstructions` | `NVARCHAR(1000)` | Có |
| `TRANSPORT_REQUEST.DeliveryStableName` | `NVARCHAR(200)` | Có |
| `TRANSPORT_REQUEST.DeliveryPostalCode` | `NVARCHAR(20)` | Có |
| `TRANSPORT_REQUEST.DeliveryInstructions` | `NVARCHAR(1000)` | Có |
| `TRANSPORT_REQUEST.InvitationLetterFileUrl` | `NVARCHAR(500)` | Có |
| `TRANSPORT_REQUEST.CompetitionRegistrationFileUrl` | `NVARCHAR(500)` | Có |
| `TRANSPORT_REQUEST.AtaCarnetFileUrl` | `NVARCHAR(500)` | Có |
| `TRANSPORT_REQUEST.CareInstructions` | `NVARCHAR(2000)` | Có |
| `TRANSPORT_REQUEST.DeclaredValueVnd` | `DECIMAL(18,2)` | Có |
| `TRANSPORT_REQUEST.RequestID` | `VARCHAR(50)` | Không |
| `TRANSPORT_REQUEST.CustomerID` | `VARCHAR(50)` | Không |
| `TRANSPORT_REQUEST.Departure` | `NVARCHAR(255)` | Không |
| `TRANSPORT_REQUEST.Destination` | `NVARCHAR(255)` | Không |
| `TRANSPORT_REQUEST.Purpose` | `NVARCHAR(100)` | Có |
| `TRANSPORT_REQUEST.TransportType` | `VARCHAR(50)` | Có |
| `TRANSPORT_REQUEST.ExpectedDate` | `DATETIME` | Có |
| `TRANSPORT_REQUEST.CommittedDeadline` | `DATETIME` | Có |
| `TRANSPORT_REQUEST.DesignatedReceiverName` | `NVARCHAR(100)` | Có |
| `TRANSPORT_REQUEST.DesignatedReceiverPhone` | `VARCHAR(20)` | Có |
| `TRANSPORT_REQUEST.BaseCost` | `DECIMAL(12, 2)` | Có |
| `TRANSPORT_REQUEST.Status` | `VARCHAR(50)` | Không |
| `TRANSPORT_REQUEST.PickupLatitude` | `DECIMAL(9,6)` | Có |
| `TRANSPORT_REQUEST.PickupLongitude` | `DECIMAL(9,6)` | Có |
| `TRANSPORT_REQUEST.DeliveryLatitude` | `DECIMAL(9,6)` | Có |
| `TRANSPORT_REQUEST.DeliveryLongitude` | `DECIMAL(9,6)` | Có |
| `TRANSPORT_REQUEST.DistanceKm` | `DECIMAL(10,2)` | Có |
| `TRANSPORT_REQUEST.PickupContactName` | `NVARCHAR(100)` | Có |
| `TRANSPORT_REQUEST.PickupContactPhone` | `VARCHAR(20)` | Có |
| `TRANSPORT_REQUEST.ManagerNotes` | `NVARCHAR(1000)` | Có |
| `TRANSPORT_REQUEST.OriginCountry` | `VARCHAR(2)` | Có |
| `TRANSPORT_REQUEST.DestinationCountry` | `VARCHAR(2)` | Có |
| `TRANSPORT_REQUEST.PreparationDays` | `INT` | Có |
| `TRANSPORT_REQUEST.SubmissionKeyHash` | `VARCHAR(64)` | Có |
| `REQUEST_HORSE_MAPPING.CareInstructions` | `NVARCHAR(2000)` | Có |
| `REQUEST_HORSE_MAPPING.RequestID` | `VARCHAR(50)` | Không |
| `REQUEST_HORSE_MAPPING.HorseID` | `VARCHAR(50)` | Không |
| `LEGAL_MEDICAL_RECORD.RecordID` | `VARCHAR(50)` | Không |
| `LEGAL_MEDICAL_RECORD.HorseID` | `VARCHAR(50)` | Không |
| `LEGAL_MEDICAL_RECORD.RequestID` | `VARCHAR(50)` | Không |
| `LEGAL_MEDICAL_RECORD.VerifiedBy` | `VARCHAR(50)` | Có |
| `LEGAL_MEDICAL_RECORD.DocumentType` | `VARCHAR(50)` | Có |
| `LEGAL_MEDICAL_RECORD.RequirementStatus` | `VARCHAR(50)` | Có |
| `LEGAL_MEDICAL_RECORD.DocumentStatus` | `VARCHAR(50)` | Có |
| `LEGAL_MEDICAL_RECORD.UploadedFileUrl` | `VARCHAR(500)` | Có |
| `LEGAL_MEDICAL_RECORD.ExpiryDate` | `DATE` | Có |
| `QUARANTINE_BOOKING.BookingID` | `VARCHAR(50)` | Không |
| `QUARANTINE_BOOKING.RequestID` | `VARCHAR(50)` | Không |
| `QUARANTINE_BOOKING.FacilityID` | `VARCHAR(50)` | Có |
| `QUARANTINE_BOOKING.StationName` | `NVARCHAR(200)` | Có |
| `QUARANTINE_BOOKING.Country` | `NVARCHAR(100)` | Có |
| `QUARANTINE_BOOKING.ExpectedStartDate` | `DATETIME` | Có |
| `QUARANTINE_BOOKING.ExpectedEndDate` | `DATETIME` | Có |
| `QUARANTINE_BOOKING.ConfirmationNumber` | `VARCHAR(100)` | Có |
| `QUARANTINE_BOOKING.Status` | `VARCHAR(50)` | Có |
| `TRIP_PLAN.TripID` | `VARCHAR(50)` | Không |
| `TRIP_PLAN.RequestID` | `VARCHAR(50)` | Không |
| `TRIP_PLAN.TotalDistance_km` | `DECIMAL(10, 2)` | Có |
| `TRIP_PLAN.T_Total_Hours` | `DECIMAL(10, 2)` | Có |
| `TRIP_PLAN.TotalCost` | `DECIMAL(12, 2)` | Có |
| `TRIP_PLAN.Status` | `VARCHAR(50)` | Không |
| `TRIP_PLAN.DeploymentStatus` | `VARCHAR(12)` | Có |
| `TRIP_PLAN.DeploymentReason` | `NVARCHAR(1000)` | Có |
| `TRIP_PLAN.DeploymentBy` | `VARCHAR(50)` | Có |
| `TRIP_PLAN.DeploymentAtUtc` | `DATETIME2(7)` | Có |
| `TRIP_PLAN.HandoffEventId` | `VARCHAR(50)` | Có |
| `TRIP_PLAN.AssignedSpecialistId` | `VARCHAR(50)` | Có |
| `TRIP_PLAN.AssignedCoordinatorId` | `VARCHAR(50)` | Có |
| `VEHICLE.VehicleID` | `VARCHAR(50)` | Không |
| `VEHICLE.Type` | `VARCHAR(50)` | Có |
| `VEHICLE.CapacityStalls` | `INT` | Có |
| `VEHICLE.MaxRange_km` | `DECIMAL(10, 2)` | Có |
| `VEHICLE.FuelCost_Per_Km` | `DECIMAL(12, 2)` | Có |
| `VEHICLE.Status` | `VARCHAR(50)` | Có |
| `TRIP_VEHICLE_ASSIGNMENT.AssignmentID` | `VARCHAR(50)` | Không |
| `TRIP_VEHICLE_ASSIGNMENT.TripID` | `VARCHAR(50)` | Không |
| `TRIP_VEHICLE_ASSIGNMENT.VehicleID` | `VARCHAR(50)` | Không |
| `TRIP_VEHICLE_ASSIGNMENT.DriverID` | `VARCHAR(50)` | Không |
| `TRIP_VEHICLE_ASSIGNMENT.EscortID` | `VARCHAR(50)` | Không |
| `ROUTE_SEGMENT.SegmentID` | `VARCHAR(50)` | Không |
| `ROUTE_SEGMENT.TripID` | `VARCHAR(50)` | Không |
| `ROUTE_SEGMENT.FacilityID` | `VARCHAR(50)` | Có |
| `ROUTE_SEGMENT.LocationName` | `NVARCHAR(255)` | Không |
| `ROUTE_SEGMENT.SegmentType` | `VARCHAR(50)` | Có |
| `ROUTE_SEGMENT.TransportMode` | `VARCHAR(50)` | Không |
| `ROUTE_SEGMENT.CarrierName` | `NVARCHAR(100)` | Có |
| `ROUTE_SEGMENT.Flight_Voyage_No` | `VARCHAR(50)` | Có |
| `ROUTE_SEGMENT.ExpectedETA` | `DATETIME` | Có |
| `ROUTE_SEGMENT.ActualTime` | `DATETIME` | Có |
| `ROUTE_SEGMENT.Status` | `VARCHAR(50)` | Có |
| `FLIGHT_BOOKING.FlightBookingID` | `INT` | Không |
| `FLIGHT_BOOKING.TripID` | `VARCHAR(50)` | Không |
| `FLIGHT_BOOKING.BookingVersion` | `INT` | Không |
| `FLIGHT_BOOKING.RouteVersionID` | `INT` | Có |
| `FLIGHT_BOOKING.ProviderName` | `NVARCHAR(200)` | Không |
| `FLIGHT_BOOKING.Airline` | `NVARCHAR(100)` | Không |
| `FLIGHT_BOOKING.FlightNumber` | `VARCHAR(50)` | Không |
| `FLIGHT_BOOKING.DepartureAirportCheckpointId` | `INT` | Có |
| `FLIGHT_BOOKING.ArrivalAirportCheckpointId` | `INT` | Có |
| `FLIGHT_BOOKING.DepartureAt` | `DATETIME` | Không |
| `FLIGHT_BOOKING.ArrivalAt` | `DATETIME` | Không |
| `FLIGHT_BOOKING.DirectFlight` | `BIT` | Không |
| `FLIGHT_BOOKING.BookingReference` | `VARCHAR(100)` | Không |
| `FLIGHT_BOOKING.BookingConfirmed` | `BIT` | Không |
| `FLIGHT_BOOKING.HorseIds` | `NVARCHAR(MAX)` | Có |
| `FLIGHT_BOOKING.Note` | `NVARCHAR(MAX)` | Có |
| `FLIGHT_BOOKING.CreatedAt` | `DATETIME` | Không |
| `FLIGHT_BOOKING.UpdatedAt` | `DATETIME` | Có |
| `CUSTOMS_CLEARANCE.ClearanceID` | `VARCHAR(50)` | Không |
| `CUSTOMS_CLEARANCE.TripID` | `VARCHAR(50)` | Không |
| `CUSTOMS_CLEARANCE.SegmentID` | `VARCHAR(50)` | Không |
| `CUSTOMS_CLEARANCE.BorderCrossingName` | `NVARCHAR(200)` | Có |
| `CUSTOMS_CLEARANCE.CustomsAgentName` | `NVARCHAR(100)` | Có |
| `CUSTOMS_CLEARANCE.DocumentType` | `VARCHAR(50)` | Có |
| `CUSTOMS_CLEARANCE.DeclarationNumber` | `VARCHAR(100)` | Có |
| `CUSTOMS_CLEARANCE.Status` | `VARCHAR(50)` | Không |
| `CUSTOMS_CLEARANCE.ClearedAt` | `DATETIME` | Có |
| `HEALTH_LOG.LogID` | `VARCHAR(50)` | Không |
| `HEALTH_LOG.TripID` | `VARCHAR(50)` | Không |
| `HEALTH_LOG.HorseID` | `VARCHAR(50)` | Không |
| `HEALTH_LOG.EscortID` | `VARCHAR(50)` | Không |
| `HEALTH_LOG.LogType` | `VARCHAR(50)` | Có |
| `HEALTH_LOG.LogTime` | `DATETIME` | Không |
| `HEALTH_LOG.Temperature` | `DECIMAL(4, 1)` | Có |
| `HEALTH_LOG.HeartRate` | `INT` | Có |
| `HEALTH_LOG.HealthStatus` | `NVARCHAR(100)` | Có |
| `HEALTH_LOG.Description` | `NVARCHAR(MAX)` | Có |
| `HEALTH_LOG.MediaUrl` | `VARCHAR(500)` | Có |
| `INCIDENT.IncidentID` | `VARCHAR(50)` | Không |
| `INCIDENT.TripID` | `VARCHAR(50)` | Không |
| `INCIDENT.ApprovedBy` | `VARCHAR(50)` | Có |
| `INCIDENT.IncidentType` | `VARCHAR(50)` | Có |
| `INCIDENT.LocationCoordinates` | `VARCHAR(100)` | Có |
| `INCIDENT.Description` | `NVARCHAR(MAX)` | Có |
| `INCIDENT.ImageUrl` | `VARCHAR(500)` | Có |
| `INCIDENT.AdditionalCost` | `DECIMAL(12, 2)` | Có |
| `INCIDENT.Status` | `VARCHAR(50)` | Có |
| `HANDOVER.DocumentsHandedOver` | `NVARCHAR(2000)` | Có |
| `HANDOVER.HandoverID` | `VARCHAR(50)` | Không |
| `HANDOVER.TripID` | `VARCHAR(50)` | Không |
| `HANDOVER.HandedByUserID` | `VARCHAR(50)` | Không |
| `HANDOVER.Type` | `VARCHAR(50)` | Có |
| `HANDOVER.LocationName` | `NVARCHAR(255)` | Có |
| `HANDOVER.ReceiverName` | `NVARCHAR(100)` | Có |
| `HANDOVER.ReceiverPhone` | `VARCHAR(20)` | Có |
| `HANDOVER.IsAuthorized` | `BIT` | Có |
| `HANDOVER.Status` | `VARCHAR(50)` | Có |
| `HANDOVER_ITEM.DocumentsHandedOver` | `NVARCHAR(2000)` | Có |
| `HANDOVER_ITEM.DocumentsReceivedAtUtc` | `DATETIME2(7)` | Có |
| `HANDOVER_ITEM.HandoverItemID` | `VARCHAR(50)` | Không |
| `HANDOVER_ITEM.HandoverID` | `VARCHAR(50)` | Không |
| `HANDOVER_ITEM.HorseID` | `VARCHAR(50)` | Không |
| `HANDOVER_ITEM.MicrochipVerified` | `BIT` | Không |
| `HANDOVER_ITEM.ConditionStatus` | `NVARCHAR(100)` | Có |
| `HANDOVER_ITEM.AssetCheck` | `NVARCHAR(MAX)` | Có |
| `HANDOVER_ITEM.PhotoUrl` | `VARCHAR(500)` | Có |
| `CONTRACT_TEMPLATE.TemplateID` | `VARCHAR(50)` | Không |
| `CONTRACT_TEMPLATE.TemplateName` | `NVARCHAR(255)` | Không |
| `CONTRACT_TEMPLATE.LanguageCode` | `VARCHAR(10)` | Không |
| `CONTRACT_TEMPLATE.BodyContent` | `NVARCHAR(MAX)` | Không |
| `CONTRACT_TEMPLATE.IsActive` | `BIT` | Không |
| `CONTRACT_TEMPLATE.CreatedAt` | `DATETIME` | Không |
| `CONTRACT_TEMPLATE.UpdatedAt` | `DATETIME` | Có |
| `CONTRACT.CommercialNotes` | `NVARCHAR(2000)` | Có |
| `CONTRACT.ContractID` | `VARCHAR(50)` | Không |
| `CONTRACT.CurrentVersionNo` | `INT` | Có |
| `CONTRACT.TripID` | `VARCHAR(50)` | Có |
| `CONTRACT.CustomerID` | `VARCHAR(50)` | Không |
| `CONTRACT.CurrencyCode` | `VARCHAR(3)` | Không |
| `CONTRACT.TotalQuotedPrice` | `DECIMAL(12, 2)` | Có |
| `CONTRACT.DepositRateStandard` | `DECIMAL(5, 2)` | Có |
| `CONTRACT.SignedAt` | `DATETIME` | Có |
| `CONTRACT.ContractStatus` | `VARCHAR(50)` | Không |
| `CONTRACT.RequestID` | `VARCHAR(50)` | Không |
| `CONTRACT.CompletionDeadline` | `DATETIME2(7)` | Có |
| `CONTRACT.PdfUrl` | `VARCHAR(500)` | Có |
| `CONTRACT.SignOtpHash` | `VARCHAR(255)` | Có |
| `CONTRACT.SignOtpExpiry` | `DATETIME2(7)` | Có |
| `CONTRACT.SignOtpFailedAttempts` | `INT` | Không |
| `CONTRACT.DepositAmount` | `DECIMAL(12,2)` | Có |
| `CONTRACT.SignOtpSentAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.SignerEmail` | `VARCHAR(255)` | Có |
| `CONTRACT.PublishedAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.PublishedBy` | `VARCHAR(50)` | Có |
| `CONTRACT.LastExtensionReason` | `NVARCHAR(1000)` | Có |
| `CONTRACT.LastExtensionBy` | `VARCHAR(50)` | Có |
| `CONTRACT.LastExtensionAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.CancellationId` | `VARCHAR(50)` | Có |
| `CONTRACT.CancellationStatus` | `VARCHAR(12)` | Có |
| `CONTRACT.CancellationReason` | `NVARCHAR(1000)` | Có |
| `CONTRACT.CancellationRequestedAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.CancellationDecisionReason` | `NVARCHAR(1000)` | Có |
| `CONTRACT.CancellationDecidedBy` | `VARCHAR(50)` | Có |
| `CONTRACT.CancellationDecidedAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.CustomerFeedback` | `NVARCHAR(2000)` | Có |
| `CONTRACT.FeedbackStatus` | `VARCHAR(20)` | Có |
| `CONTRACT.FeedbackAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.ManagerFeedback` | `NVARCHAR(2000)` | Có |
| `CONTRACT.FeedbackHandledAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT.RefundAmount` | `DECIMAL(12,2)` | Có |
| `CONTRACT.RefundStatus` | `VARCHAR(20)` | Có |
| `CONTRACT.RefundReference` | `VARCHAR(100)` | Có |
| `CONTRACT_VERSION.ContractID` | `VARCHAR(50)` | Không |
| `CONTRACT_VERSION.VersionNo` | `INT` | Không |
| `CONTRACT_VERSION.VersionStatus` | `VARCHAR(20)` | Không |
| `CONTRACT_VERSION.ContentSnapshot` | `NVARCHAR(MAX)` | Không |
| `CONTRACT_VERSION.PdfUrl` | `NVARCHAR(500)` | Có |
| `CONTRACT_VERSION.CreatedBy` | `VARCHAR(50)` | Có |
| `CONTRACT_VERSION.CreatedAtUtc` | `DATETIME2(7)` | Không |
| `CONTRACT_VERSION.PublishedBy` | `VARCHAR(50)` | Có |
| `CONTRACT_VERSION.PublishedAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT_VERSION.TermsAcceptedAtUtc` | `DATETIME2(7)` | Có | Lần đồng ý đầu tiên đúng version, UTC; Customer suy từ Contract. |
| `CONTRACT_VERSION.SignedAtUtc` | `DATETIME2(7)` | Có |
| `CONTRACT_VERSION.SignerEmail` | `VARCHAR(255)` | Có |
| `COST_ITEM.CostItemID` | `VARCHAR(50)` | Không |
| `COST_ITEM.ContractID` | `VARCHAR(50)` | Không |
| `COST_ITEM.CategoryName` | `NVARCHAR(100)` | Có |
| `COST_ITEM.SubcodeName` | `NVARCHAR(100)` | Có |
| `COST_ITEM.Bearer` | `VARCHAR(50)` | Có |
| `COST_ITEM.CurrencyCode` | `VARCHAR(3)` | Không |
| `COST_ITEM.TotalMoney` | `DECIMAL(12, 2)` | Có |
| `COST_ITEM.EvidenceUrl` | `VARCHAR(500)` | Có |
| `INVOICE.InvoiceID` | `VARCHAR(50)` | Không |
| `INVOICE.ContractID` | `VARCHAR(50)` | Không |
| `INVOICE.ContractVersionNo` | `INT` | Không |
| `INVOICE.InvoiceType` | `VARCHAR(50)` | Có |
| `INVOICE.CurrencyCode` | `VARCHAR(3)` | Không |
| `INVOICE.TotalPayableAmount` | `DECIMAL(12, 2)` | Không |
| `INVOICE.PaidAmount` | `DECIMAL(12, 2)` | Không |
| `INVOICE.DueDate` | `DATETIME` | Có |
| `INVOICE.PaymentStatus` | `VARCHAR(50)` | Không |
| `PAYMENT.PaymentID` | `VARCHAR(50)` | Không |
| `PAYMENT.InvoiceID` | `VARCHAR(50)` | Không |
| `PAYMENT.ConfirmedByUserID` | `VARCHAR(50)` | Có |
| `PAYMENT.CurrencyCode` | `VARCHAR(3)` | Không |
| `PAYMENT.Amount` | `DECIMAL(12, 2)` | Không |
| `PAYMENT.Method` | `VARCHAR(50)` | Có |
| `PAYMENT.TransactionCode` | `VARCHAR(100)` | Có |
| `PAYMENT.Status` | `VARCHAR(50)` | Không |
| `PAYMENT.PaymentDate` | `DATETIME` | Không |
| `PAYMENT.VnpayBankCode` | `VARCHAR(50)` | Có |
| `PAYMENT.VnpayResponseCode` | `VARCHAR(10)` | Có |
| `PAYMENT.VnpayTransactionStatus` | `VARCHAR(10)` | Có |
| `PAYMENT.VnpayTmnCode` | `VARCHAR(8)` | Có |
| `PAYMENT.VnpayCreatedAtUtc` | `DATETIME2(7)` | Có |
| `PAYMENT.VnpayExpiresAtUtc` | `DATETIME2(7)` | Có |
| `PAYMENT.VnpayReceivedAmount` | `DECIMAL(12,2)` | Có |
| `PAYMENT.FinancialReviewRequired` | `BIT` | Không |
| `PAYMENT.FinancialReviewReason` | `NVARCHAR(1000)` | Có |
| `PAYMENT.FinancialReviewedBy` | `VARCHAR(50)` | Có |
| `PAYMENT.FinancialReviewedAtUtc` | `DATETIME2(7)` | Có |
| `COST_RATE.CostRateID` | `varchar(50)` | Không |
| `COST_RATE.Code` | `varchar(50)` | Không |
| `COST_RATE.CostGroup` | `varchar(20)` | Không |
| `COST_RATE.CalculationUnit` | `varchar(40)` | Không |
| `COST_RATE.Rate` | `decimal(18,6)` | Không |
| `COST_RATE.CurrencyCode` | `varchar(3)` | Không |
| `COST_RATE.IsActive` | `bit` | Không |
| `COUNTRY.CountryCode` | `VARCHAR(2)` | Không |
| `COUNTRY.CountryName` | `NVARCHAR(100)` | Không |
| `COUNTRY.IsActive` | `BIT` | Không |
| `SUPPORTED_ROUTE.RouteID` | `VARCHAR(50)` | Không |
| `SUPPORTED_ROUTE.OriginCountry` | `VARCHAR(2)` | Không |
| `SUPPORTED_ROUTE.DestinationCountry` | `VARCHAR(2)` | Không |
| `SUPPORTED_ROUTE.TransportMode` | `VARCHAR(50)` | Không |
| `SUPPORTED_ROUTE.IsActive` | `BIT` | Không |
| `BUSINESS_POLICY.PolicyID` | `VARCHAR(50)` | Không |
| `BUSINESS_POLICY.Code` | `VARCHAR(100)` | Không |
| `BUSINESS_POLICY.ValueType` | `VARCHAR(10)` | Không |
| `BUSINESS_POLICY.NumberValue` | `DECIMAL(18,6)` | Có |
| `BUSINESS_POLICY.TextValue` | `NVARCHAR(2000)` | Có |
| `BUSINESS_POLICY.BoolValue` | `BIT` | Có |
| `BUSINESS_POLICY.Unit` | `VARCHAR(30)` | Có |
| `BUSINESS_POLICY.ScopeType` | `VARCHAR(20)` | Không |
| `BUSINESS_POLICY.ScopeID` | `VARCHAR(50)` | Có |
| `BUSINESS_POLICY.Description` | `NVARCHAR(1000)` | Không |
| `BUSINESS_POLICY.UpdatedBy` | `VARCHAR(50)` | Có |
| `BUSINESS_POLICY.UpdatedAt` | `DATETIME2(7)` | Không |
| `HANDOVER_REVISION.HandoverRevisionID` | `VARCHAR(50)` | Không |
| `HANDOVER_REVISION.HandoverID` | `VARCHAR(50)` | Không |
| `HANDOVER_REVISION.TripID` | `VARCHAR(50)` | Không |
| `HANDOVER_REVISION.RevisionNo` | `INT` | Không |
| `HANDOVER_REVISION.Status` | `VARCHAR(30)` | Không |
| `HANDOVER_REVISION.ContentSnapshot` | `NVARCHAR(MAX)` | Không |
| `HANDOVER_REVISION.OtpEmail` | `VARCHAR(254)` | Có |
| `HANDOVER_REVISION.OtpHash` | `VARCHAR(64)` | Có |
| `HANDOVER_REVISION.OtpSentAtUtc` | `DATETIME2(7)` | Có |
| `HANDOVER_REVISION.OtpExpiresAtUtc` | `DATETIME2(7)` | Có |
| `HANDOVER_REVISION.OtpFailedAttempts` | `INT` | Không |
| `HANDOVER_REVISION.ConfirmedAtUtc` | `DATETIME2(7)` | Có |
| `HANDOVER_REVISION.RefusalReason` | `NVARCHAR(2000)` | Có |
| `HANDOVER_REVISION.RefusedAtUtc` | `DATETIME2(7)` | Có |
| `HANDOVER_REVISION.CreatedBy` | `VARCHAR(50)` | Không |
| `HANDOVER_REVISION.CreatedAtUtc` | `DATETIME2(7)` | Không |
| `TRIP_SETTLEMENT.SettlementID` | `VARCHAR(50)` | Không |
| `TRIP_SETTLEMENT.ContractID` | `VARCHAR(50)` | Không |
| `TRIP_SETTLEMENT.TripID` | `VARCHAR(50)` | Không |
| `TRIP_SETTLEMENT.CustomerID` | `VARCHAR(50)` | Không |
| `TRIP_SETTLEMENT.ContractVersionNo` | `INT` | Không |
| `TRIP_SETTLEMENT.HandoverRevisionID` | `VARCHAR(50)` | Có |
| `TRIP_SETTLEMENT.FinalInvoiceID` | `VARCHAR(50)` | Có |
| `TRIP_SETTLEMENT.Status` | `VARCHAR(30)` | Không |
| `TRIP_SETTLEMENT.PreparedBy` | `VARCHAR(50)` | Không |
| `TRIP_SETTLEMENT.CreatedAtUtc` | `DATETIME2(7)` | Không |
| `TRIP_SETTLEMENT.SettledBy` | `VARCHAR(50)` | Có |
| `TRIP_SETTLEMENT.SettledAtUtc` | `DATETIME2(7)` | Có |
| `TRIP_SETTLEMENT.ClosedAtUtc` | `DATETIME2(7)` | Có |
| `TRIP_SETTLEMENT.FeedbackStartedAtUtc` | `DATETIME2(7)` | Có |
| `TRIP_SETTLEMENT.FeedbackEndsAtUtc` | `DATETIME2(7)` | Có |
| `SETTLEMENT_ADJUSTMENT.AdjustmentID` | `VARCHAR(50)` | Không |
| `SETTLEMENT_ADJUSTMENT.SettlementID` | `VARCHAR(50)` | Không |
| `SETTLEMENT_ADJUSTMENT.IncidentID` | `VARCHAR(50)` | Có |
| `SETTLEMENT_ADJUSTMENT.CostItemID` | `VARCHAR(50)` | Có |
| `SETTLEMENT_ADJUSTMENT.OriginalInvoiceID` | `VARCHAR(50)` | Có |
| `SETTLEMENT_ADJUSTMENT.AdjustedInvoiceID` | `VARCHAR(50)` | Có |
| `SETTLEMENT_ADJUSTMENT.AppliedAtUtc` | `DATETIME2(7)` | Có |
| `SETTLEMENT_ADJUSTMENT.RefundStatus` | `VARCHAR(20)` | Có |
| `SETTLEMENT_ADJUSTMENT.RefundedBy` | `VARCHAR(50)` | Có |
| `SETTLEMENT_ADJUSTMENT.RefundedAtUtc` | `DATETIME2(7)` | Có |
| `SETTLEMENT_ADJUSTMENT.RefundReference` | `VARCHAR(100)` | Có |
| `SETTLEMENT_ADJUSTMENT.AdjustmentType` | `VARCHAR(20)` | Không |
| `SETTLEMENT_ADJUSTMENT.Amount` | `DECIMAL(12,2)` | Không |
| `SETTLEMENT_ADJUSTMENT.Reason` | `NVARCHAR(2000)` | Không |
| `SETTLEMENT_ADJUSTMENT.EvidenceUrl` | `NVARCHAR(500)` | Có |
| `SETTLEMENT_ADJUSTMENT.CreatedBy` | `VARCHAR(50)` | Không |
| `SETTLEMENT_ADJUSTMENT.CreatedAtUtc` | `DATETIME2(7)` | Không |
| `SETTLEMENT_ADJUSTMENT.DecidedBy` | `VARCHAR(50)` | Không |
| `SETTLEMENT_ADJUSTMENT.DecidedAtUtc` | `DATETIME2(7)` | Không |
| `SETTLEMENT_ADJUSTMENT.DecisionReason` | `NVARCHAR(2000)` | Không |
| `CUSTOMER_CASE.CaseID` | `VARCHAR(50)` | Không |
| `CUSTOMER_CASE.SettlementID` | `VARCHAR(50)` | Không |
| `CUSTOMER_CASE.CaseType` | `VARCHAR(20)` | Không |
| `CUSTOMER_CASE.Status` | `VARCHAR(40)` | Không |
| `CUSTOMER_CASE.Subject` | `NVARCHAR(200)` | Không |
| `CUSTOMER_CASE.Description` | `NVARCHAR(2000)` | Không |
| `CUSTOMER_CASE.OpenedAtUtc` | `DATETIME2(7)` | Không |
| `CUSTOMER_CASE.ResolutionText` | `NVARCHAR(2000)` | Có |
| `CUSTOMER_CASE.HandledBy` | `VARCHAR(50)` | Có |
| `CUSTOMER_CASE.HandledAtUtc` | `DATETIME2(7)` | Có |
| `CUSTOMER_CASE.ResolvedAtUtc` | `DATETIME2(7)` | Có |
| `CUSTOMER_FEEDBACK.FeedbackID` | `VARCHAR(50)` | Không |
| `CUSTOMER_FEEDBACK.SettlementID` | `VARCHAR(50)` | Không |
| `CUSTOMER_FEEDBACK.Rating` | `TINYINT` | Không |
| `CUSTOMER_FEEDBACK.Comment` | `NVARCHAR(2000)` | Có |
| `CUSTOMER_FEEDBACK.CreatedAtUtc` | `DATETIME2(7)` | Không |

Tổng 37 bảng / 436 field.

## 12. Bộ thống nhất đã chốt và đối chiếu DB với API/UI

Phần này được chốt theo trao đổi ngày 23/10/2026 và ưu tiên khi mô tả seed cũ trong ID_NAME_RULE khác tên đích. Không đổi tên cột; đã mở rộng CHECK DeploymentStatus trong file SQL Reviewed cho ON_HOLD, chưa áp dụng database đang chạy.

### 12.1 Request dùng một enum ở DB và API

`DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `CONTRACT_PREPARATION`, `CONTRACT_READY`, `CONTRACT_CHANGES_REQUESTED`, `DEPOSIT_VERIFIED`, `CANCELLATION_REQUESTED`, `ACTIVATED`, `SCHEDULED`, `IN_PROGRESS`, `DELIVERED`, `CLOSED`, `REJECTED`, `CANCELLED`.

- Gate 1 được duyệt và phân công được xác nhận → SCHEDULED. Đây là quy tắc thiết kế đích bổ sung để xác định mốc; không tuyên bố backend hiện đã thực hiện. Gate 2 vẫn quyết định quyền khởi hành, không đồng nhất với SCHEDULED.
- Khi Gate 1 bị mất hiệu lực trước khởi hành: SCHEDULED → ACTIVATED để chuẩn bị/duyệt lại, giữ lịch sử. Gate 2 mất hiệu lực nhưng Gate 1 vẫn hợp lệ không tự xóa SCHEDULED.
- Khởi hành thực tế: Request IN_PROGRESS, Trip IN_TRANSIT. Hai bảng dùng enum khác nhau có chủ đích.
- Giao cuối hợp lệ: Request DELIVERED, Trip COMPLETED. Giữ DELIVERED khi chờ trả đủ, feedback hoặc khiếu nại.
- Đủ điều kiện kết thúc: Request CLOSED, Contract CLOSED; phiên bản vẫn SIGNED.
- Không dùng IN_TRANSIT hoặc COMPLETED cho Request mới. Đây vẫn là NAME hợp lệ cho Trip; không thay hàng loạt trong mọi bảng.
- Chưa ký và chưa nhận cọc đã xác minh: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã ký/kích hoạt Trip không dùng quy trình hủy trước ký này.

### 12.2 Projection không ghi thẳng vào cột SQL khác nghĩa

| Field lưu DB | Field API/UI | Quy tắc |
|---|---|---|
| TRANSPORT_REQUEST.Status | Request.status, requestStatus, cancelRequest.prevStatus | Cùng enum ở mục 12.1 |
| TRIP_PLAN.Status | Trip.status | PLANNING / READY_TO_DEPART / IN_TRANSIT / COMPLETED; không đổi thành enum Request |
| CONTRACT.ContractStatus = EFFECTIVE; version SIGNED | ContractVersion UI.state = EFFECTIVE | Tổng hợp vòng đời và phiên bản; không lưu EFFECTIVE vào VersionStatus |
| Version ISSUED + quá hạn chưa ký | UI.state = EXPIRED | Dẫn xuất deadline; không thêm EXPIRED vào CHECK version |
| Version ISSUED + yêu cầu sửa đang chờ | UI.state = CHANGES_REQUESTED | Dẫn xuất FeedbackStatus PENDING; không thay VersionStatus |
| Version SUPERSEDED | UI.state = SUPERSEDED | Bản cũ được thay thế |
| Version CANCELLED | UI.state = VOID | Giữ phiên bản/bằng chứng cũ |
| Version SIGNED + Contract SETTLED/CLOSED | UI.state = FULFILLED | Bản đã thực hiện/tất toán; không dùng FULFILLED để tự đóng Request. Nếu có công nợ điều chỉnh chưa xử lý thì không suy fulfilled chỉ từ tên tổng |
| PAYMENT.Status = PENDING_GATEWAY | Payment.status = PROCESSING; providerStatus = PENDING_GATEWAY | Chờ cổng |
| PAYMENT.Status = REVIEW_REQUIRED | Payment.status = PROCESSING; providerStatus = REVIEW_REQUIRED | Kèm cảnh báo đối soát |
| PAYMENT.Status = SUCCESS / FAILED (cổng) | Payment.status = SUCCESS / FAILED | Theo kết quả đã xác minh |
| CONTRACT.RefundStatus = REQUESTED / PROCESSING / COMPLETED | refund.status = REQUESTED / PROCESSING / REFUNDED | REFUNDED là UI, không ghi vào RefundStatus SQL |
| TRIP_PLAN.DeploymentStatus = NULL hoặc PENDING | deployment.status = NOT_CONFIRMED | Chưa xác nhận triển khai |
| TRIP_PLAN.DeploymentStatus = CONFIRMED | deployment.status = CONFIRMED | Có metadata và phân công hợp lệ |
| TRIP_PLAN.DeploymentStatus = ON_HOLD | deployment.status = ON_HOLD | Tạm dừng trước khởi hành, không được xuất phát |

Projection phiên bản xét từng bản: SUPERSEDED/CANCELLED phải được giữ đúng cho bản lịch sử; deadline/yêu cầu sửa chỉ áp dụng bản hiện hành chưa ký; trạng thái tổng không ghi đè lịch sử mọi phiên bản. Contract DRAFT được trả qua DTO draft riêng, không ép thành một UI state mà enum versions chưa hỗ trợ.

### 12.3 Dữ liệu cũ và giới hạn hiện tại

- Contract seed EXECUTING → EFFECTIVE khi xác nhận đã ký và đang thực hiện.
- Request seed COMPLETED → CLOSED chỉ khi có đủ bằng chứng hết cửa sổ và không còn khiếu nại; không đổi mù từ tên cũ.
- Request IN_PROGRESS nhưng Trip đã giao hợp lệ → DELIVERED; không đổi tất cả IN_PROGRESS vì cùng tên còn đúng cho chuyến đang chạy.
- SQL không CHECK enum của Request/Contract không có nghĩa tự triển khai đúng transition. Backend/FE và dữ liệu thực chưa được sửa ở lần đồng bộ tài liệu này.
- CHECK deployment đã mở rộng PENDING/CONFIRMED/ON_HOLD; chỉ sửa file SQL, chưa áp dụng database đang chạy. ON_HOLD thuộc TRIP_PLAN.DeploymentStatus, không thuộc TRIP_PLAN.Status. Chỉ Manager hold chuyến đã CONFIRMED và Trip.Status = PLANNING hoặc READY_TO_DEPART; giữ HandoffEventId và hai nhân sự được giao. Hold lưu DeploymentReason/By/AtUtc mới nhất và metadata nghiệp vụ, chuyển Trip về PLANNING nếu trước đó READY_TO_DEPART để thu hồi Gate 2. Resume chỉ ON_HOLD → CONFIRMED, kiểm tra lại phân công; giữ Trip PLANNING, phải đánh giá/duyệt khởi hành lại, không tự READY_TO_DEPART. ON_HOLD chặn khởi hành và mở tác vụ triển khai mới; không xóa lịch sử hoặc dữ liệu đã chuẩn bị. Không dùng hold/resume này cho Trip IN_TRANSIT/COMPLETED. Request không tự đổi trạng thái chỉ vì hold; nếu Gate 1 thực sự mất hiệu lực mới SCHEDULED → ACTIVATED. Retry không tạo handoff mới hoặc ghi metadata trùng. SQL CHECK chỉ kiểm tra tổ hợp một dòng; các guard chuyển trạng thái/quyền/nghiệp vụ do backend thực hiện.

### 12.4 Kiểm tra CHECK ON_HOLD

Đã chạy chính biểu thức CHECK sửa đổi trên bảng tạm #DeploymentCheck trong SQL Server .\SQLEXPRESS: 3 trường hợp hợp lệ (PENDING, CONFIRMED, ON_HOLD) được chấp nhận; 3 trường hợp sai (ON_HOLD thiếu event, ON_HOLD thiếu lý do, mã INVALID) bị lỗi CHECK 547. Không chạy script DROP/recreate Reviewed và không sửa bảng nghiệp vụ. Kiểm tra này không chứng minh backend đã triển khai guard/audit hoặc thu hồi Gate 2.

## 13. Flow 6 năm bảng

Giữ HANDOVER_REVISION, TRIP_SETTLEMENT, SETTLEMENT_ADJUSTMENT, CUSTOMER_CASE, CUSTOMER_FEEDBACK. Giấy tờ gộp handover/item; refund gộp adjustment; hạn feedback gộp settlement; không lưu hội thoại/audit riêng.

### HANDOVER_REVISION.Status

Kiểu `VARCHAR(30)`; cho NULL Không.

| Giá trị | Ý nghĩa |
|---|---|
| `DRAFT` | Đang lập |
| `AWAITING_OTP` | Chờ OTP, khóa nội dung |
| `CONFIRMED` | Đã xác minh OTP |
| `REFUSED` | Người nhận từ chối |

### TRIP_SETTLEMENT.Status

Kiểu `VARCHAR(30)`; cho NULL Không.

| Giá trị | Ý nghĩa |
|---|---|
| `DRAFT` | Đang chuẩn bị |
| `AWAITING_PAYMENT` | Đã giao, chờ xác minh đủ tiền |
| `SETTLED` | Đã tất toán, còn theo dõi feedback/khiếu nại |
| `CLOSED` | Đã đóng |

### SETTLEMENT_ADJUSTMENT.RefundStatus

Kiểu `VARCHAR(20)`; cho NULL Có.

| Giá trị | Ý nghĩa |
|---|---|
| `NULL` | Chưa thực hiện hoàn |
| `REQUESTED` | Đề nghị hoàn |
| `PROCESSING` | Đang hoàn |
| `COMPLETED` | Đã hoàn có chứng từ |

### CUSTOMER_CASE.Status

Kiểu `VARCHAR(40)`, NOT NULL, DEFAULT `OPEN`. RESOLVED là đã đóng phiếu, không phải Request đã đóng.

| Giá trị | Ý nghĩa |
|---|---|
| OPEN | Customer vừa gửi phiếu |
| IN_PROGRESS | Manager đang xử lý |
| RESOLVED | Manager đã phản hồi và đóng phiếu |

### Field ngầm thể hiện trạng thái và liên kết mới

- OriginalInvoiceID: hóa đơn nguồn. AdjustedInvoiceID + AppliedAtUtc: hóa đơn thay thế đã áp; chỉ CHARGE/DISCOUNT do Manager xác nhận trực tiếp. Cặp ID khác nhau, cùng Contract/version, loại FINAL_SETTLEMENT. NULL invoice thay thế nghĩa chưa ghi áp dụng.
- RefundStatus/RefundedBy/RefundedAtUtc/RefundReference lưu thực hiện hoàn ngay trên adjustment REFUND do Manager xác nhận. Xác nhận điều chỉnh chưa nghĩa hoàn xong; mỗi khoản hoàn một giao dịch đủ Amount.
- FeedbackStartedAtUtc/FeedbackEndsAtUtc ở settlement là hạn hiện hành; NULL trước tất toán, SETTLED/CLOSED phải có. Complaint mở vẫn chặn đóng, không giữ lịch sử window.
- Khiếu nại: Customer gửi → Manager phản hồi, lưu HandledBy/HandledAtUtc/ResolutionText → đóng RESOLVED; còn ý kiến thì tạo phiếu mới.
- HANDOVER_ITEM.DocumentsHandedOver/DocumentsReceivedAtUtc ghi giấy tờ từng ngựa; HANDOVER.DocumentsHandedOver ghi giấy chung nếu có. Không tạo HANDOVER_DOCUMENT.
- OTP revision vẫn có email/hash/lúc gửi/hết hạn/lượt sai/lúc xác nhận; hash là OTP, không phải ContentHash. AWAITING_OTP khóa nội dung và item hiện hành.
- INVOICE.PaymentStatus: UNPAID / PARTIALLY_PAID / PAID / CANCELLED. CANCELLED là Đã hủy hóa đơn. VOID chỉ còn có thể là state UI phiên bản hợp đồng, không dùng cho hóa đơn.

Dictionary toàn bộ field và ví dụ 60 triệu giảm còn 50 triệu: FLOW6_DATABASE_DESIGN_Reviewed.md. Tiền và điều kiện đóng/reset vẫn do backend kiểm, không suy từ một status đơn lẻ.


## Quyết định đơn giản hóa Flow 1 ngày 24/10/2026

Chưa ký và chưa nhận cọc đã xác minh: hủy ngay thành CANCELLED, kể cả có phiên VNPay đang chờ. Đã nhận cọc một phần hoặc đủ: lưu TRANSPORT_REQUEST.CancellationPreviousStatus, chuyển CANCELLATION_REQUESTED / CONTRACT.CancellationStatus PENDING để Manager duyệt; duyệt → CANCELLED, từ chối → trạng thái trước hủy đã lưu. Giao dịch đến sau hủy đưa đối soát, không tự mở lại đơn. Đã ký/kích hoạt Trip không dùng quy trình hủy trước ký này.

Chỉ nhận feedback (10–2000 ký tự), lưu TRANSPORT_REQUEST.RevisionFeedback và chuyển PENDING_REVIEW → CHANGES_REQUESTED. Customer được sửa toàn bộ các trường Customer được phép sửa trước duyệt; không có fields/revisionFields và không khóa theo nhóm. Gửi lại → PENDING_REVIEW, giữ lời nhắn gần nhất; lịch sử nhiều vòng chưa thuộc phạm vi lần này.

Lưu lần đồng ý đầu tiên bằng UTC vào CONTRACT_VERSION.TermsAcceptedAtUtc của đúng ContractID/VersionNo; Customer lấy từ CONTRACT.CustomerID và đối chiếu token. NULL là chưa đồng ý; retry giữ nguyên thời điểm đã ghi. Version mới mặc định NULL. Không sửa ContentSnapshot và không lưu lặp CustomerID/RequestID.

date chỉ phục vụ kiểm tra sơ bộ tại ngày chọn, không bảo đảm toàn bộ khoảng lịch của đơn mới. Chuyến đã ký giữ lịch theo departAt → arriveAt trong CONTRACT_VERSION.ContentSnapshot của đúng version SIGNED; arriveAt là thời điểm giao ngựa dự kiến. Chuyến chưa bàn giao thực tế vẫn bị coi là đang bận khi quá arriveAt. Khi Manager chốt/phát hành lịch và trước ký, backend kiểm tra lại xung đột cả khoảng trong transaction; submit chỉ kiểm tra sơ bộ khi đơn chưa có ngày giao dự kiến. Không thêm trường ngày kết thúc riêng.

Phạm vi Flow 1 chỉ theo dõi RefundStatus trên CONTRACT: REQUESTED/PROCESSING/COMPLETED; UI REFUNDED ánh xạ COMPLETED. Không gọi API hoàn tiền VNPay, không xây quy trình chuyển tiền/chứng từ. COMPLETED là trạng thái do Manager ghi nhận thủ công, không phải chứng minh hệ thống đã chuyển tiền. Amount/reference nếu có chỉ là metadata tùy chọn; duyệt hủy không tự chuyển COMPLETED.

Các cột mới là nullable cho seed cũ; backend mới phải kiểm tra guard. Không áp dụng thay đổi refund Flow 1 cho SETTLEMENT_ADJUSTMENT Flow 6. Chưa chạy migration/backend. Snapshot hợp đồng đầy đủ đã chốt; chỉ giữ metadata gần nhất theo phạm vi.
