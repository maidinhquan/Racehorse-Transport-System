# Tổ hợp trạng thái tại điểm bàn giao Flow 4 → Flow 6

Cập nhật: 27/10/2026. Phạm vi: dữ liệu đang lưu khi bắt đầu giao ngựa tại đích; không quy định API, service hoặc nhóm nào phải cung cấp hàm.

Nguồn: [SQL Reviewed](../../../data/HorseTransportDB_Reviewed.sql), [ID_NAME_RULE_Reviewed](../../../data/ID_NAME_RULE_Reviewed.md), [DATABASE_STATUS_CONVENTION](../../../data/DATABASE_STATUS_CONVENTION.md) và SRS `data/SE2040_Group2_ASM2 (1).docx`. Giữ quyết định xác nhận bàn giao bằng OTP của nhóm. Các field liên quan được đối chiếu thêm với `HorseTransportDB/HorseTransportDB_Reviewed.sql`.

## 1. Điểm bàn giao đang nói tới

Ngựa đã được đưa đến nơi giao, nhưng người nhận **chưa hoàn tất xác nhận nhận ngựa**. Flow 6 bắt đầu kiểm người nhận, ngựa, tài sản, giấy tờ và lập biên bản DELIVERY.

ROUTE_SEGMENT thuộc xử lý hành trình Flow 2–3–4, không nằm trong tổ hợp trạng thái đầu vào trực tiếp của Flow 6 trong tài liệu này. Flow 6 không phải kiểm lại trạng thái từng chặng hoặc đọc ActualTime để thực hiện giao nhận.

Lưu ý: `Trip.Status = IN_TRANSIT` bao gồm cả đang di chuyển lẫn đã đến nhưng chưa giao xong; riêng tổ hợp trạng thái này không chứng minh xe đã đến. “Đã đến nơi giao” vẫn là bối cảnh nghiệp vụ của điểm bàn giao, không phải một NAME mới như ARRIVED. Tài liệu này không thiết kế cách thông báo/ghi nhận mốc đến và không yêu cầu thêm cột.

## 2. Tổ hợp trạng thái cốt lõi

Các dòng dưới đây cùng thuộc một chuyến, một yêu cầu, một hợp đồng và đúng phiên bản hợp đồng đã ký.

| Bảng | Field | Giá trị tại lúc bắt đầu Flow 6 | Ý nghĩa |
|---|---|---|---|
| TRIP_PLAN | Status | IN_TRANSIT | Chuyến đã xuất phát, chưa bàn giao cuối hợp lệ |
| TRIP_PLAN | DeploymentStatus | CONFIRMED | Đã xác nhận giao việc triển khai; không đồng nghĩa giao ngựa |
| TRANSPORT_REQUEST | Status | IN_PROGRESS | Đơn đang thực hiện, chưa giao xong |
| CONTRACT | ContractStatus | EFFECTIVE | Hợp đồng đang có hiệu lực; chưa tất toán/đóng |
| CONTRACT_VERSION | VersionStatus | SIGNED | Phiên bản được CONTRACT.CurrentVersionNo tham chiếu đã ký |
| INVOICE, InvoiceType = DEPOSIT | PaymentStatus | PAID | Cọc của đúng hợp đồng/phiên bản đã được xác minh đủ |
| PAYMENT được tính vào tiền cọc | Method / Status | VNPAY / SUCCESS | Giao dịch đã được backend xác minh, không phải kết quả trang return |

Không yêu cầu mọi dòng PAYMENT đều SUCCESS: lần thanh toán thất bại hoặc đang chờ có thể vẫn được giữ. Cần tổng tiền cọc thực được tính thu đủ, không chỉ có một dòng SUCCESS.

`PAYMENT.FinancialReviewRequired = 1` là còn ngoại lệ cần đối soát; `0` là không có yêu cầu review đang mở. Không tự coi cờ review là bằng chứng mất tiền hoặc lý do phủ nhận ngựa đã đến. Các mã PAYMENT khác là PENDING_GATEWAY, FAILED, REVIEW_REQUIRED; chúng không tự được cộng vào tiền đã thu.

### Metadata và liên kết đi cùng

| Field / liên kết | Dữ liệu cần giữ đúng |
|---|---|
| TRIP_PLAN.RequestID | Đúng yêu cầu đang IN_PROGRESS |
| CONTRACT.RequestID / TripID / CustomerID | Khớp yêu cầu, chuyến và khách hàng |
| CONTRACT.CurrentVersionNo | Trỏ đúng CONTRACT_VERSION có VersionStatus = SIGNED; không tự lấy số phiên bản lớn nhất |
| TRIP_PLAN.AssignedSpecialistId / AssignedCoordinatorId | Người phụ trách đã được giao; không thay DriverID/EscortID |
| TRIP_PLAN.DeploymentReason / DeploymentBy / DeploymentAtUtc / HandoffEventId | Có metadata theo CHECK của CONFIRMED. HandoffEventId là giao việc triển khai, không phải mã biên bản giao ngựa |
| CONTRACT.SignedAt và metadata ký của CONTRACT_VERSION | Giữ bằng chứng bản đã ký; không yêu cầu hạn ký CompletionDeadline còn trong tương lai |
| REQUEST_HORSE_MAPPING | Danh sách đúng ngựa của yêu cầu; dùng đối chiếu các HANDOVER_ITEM |
| TRANSPORT_REQUEST.DesignatedReceiverName / DesignatedReceiverPhone | Thông tin người nhận chỉ định để kiểm tra lúc giao; người nhận có thể khác khách hàng |

PLANNING/READY_TO_DEPART, Request ACTIVATED/SCHEDULED là các mốc trước vận chuyển. Trip COMPLETED hoặc Request DELIVERED là mốc đã giao, không thuộc lần bắt đầu giao nhận bình thường này. DeploymentStatus ON_HOLD chỉ dùng trước khởi hành; tổ hợp ON_HOLD + IN_TRANSIT không phải tổ hợp bình thường đã chốt.

## 3. Hồ sơ PICKUP dùng đối chiếu

Đây là dữ liệu nhận ngựa đầu chuyến đã có, không phải biên bản DELIVERY mà Flow 6 sắp tạo.

| Bảng | Field | Trạng thái / giá trị đầu vào |
|---|---|---|
| HANDOVER | Type / Status | PICKUP / CONFIRMED |
| HANDOVER | IsAuthorized | 1 cho người nhận đã được xác minh có quyền tại lần PICKUP; không thay xác minh người nhận DELIVERY |
| HANDOVER_ITEM của PICKUP | MicrochipVerified | 1 khi đã đối chiếu thành công lúc nhận đầu chuyến; 0 chưa xác minh thành công |
| HANDOVER_ITEM của PICKUP | ConditionStatus | Văn bản tình trạng ban đầu; không có enum đạt/trượt chung |
| HANDOVER_ITEM của PICKUP | AssetCheck | Nội dung tài sản/đồ đi kèm lúc nhận; không phải cột Status |
| HANDOVER_ITEM của PICKUP | DocumentsHandedOver / DocumentsReceivedAtUtc | Giấy tờ và thời điểm nhận đã ghi, nếu có; không có enum riêng |
| HANDOVER_REVISION của PICKUP, nếu bước này đã dùng revision OTP | Status | CONFIRMED; đúng biên bản/chuyến |

Cần có HANDOVER_ITEM tương ứng từng ngựa thực nhận để đối chiếu. Thiếu baseline hoặc bằng chứng phải thể hiện là thiếu; không tự tạo dữ liệu xác nhận giả. Hồ sơ cũ chưa có revision không được mô tả thành đã xác nhận OTP.

Mọi flag của PICKUP chỉ phản ánh lần nhận đầu chuyến. Không sao chép MicrochipVerified hoặc IsAuthorized thành kết quả kiểm tra DELIVERY.

## 4. Sức khỏe, sự cố và hồ sơ liên quan

Đây là trạng thái của dữ liệu tham chiếu khi có phát sinh, không phải yêu cầu tất cả bảng đều có dòng hoặc tất cả sự cố đều RESOLVED trước khi mở Flow 6.

| Bảng / field | Các giá trị đã thống nhất | Cách hiểu tại điểm bàn giao |
|---|---|---|
| HEALTH_LOG.HealthStatus | Văn bản mô tả, có thể NULL | Đọc tình trạng/số đo/bằng chứng đã ghi. Không yêu cầu chuỗi HEALTHY, NORMAL hay “Ổn định” |
| INCIDENT.Status | OPEN, IN_PROGRESS, AWAITING_APPROVAL, RESOLVED; SQL cho NULL | Giữ đúng tình trạng sự cố. NULL là chưa xác định, không phải đã xử lý. Sự cố mở không tự cấm mở giao nhận; RESOLVED cũng không thay mọi xác nhận chuyên môn |
| LEGAL_MEDICAL_RECORD.RequirementStatus | MANDATORY, OPTIONAL, NOT_APPLICABLE; SQL cho NULL | Mức áp dụng hồ sơ. NULL chưa được phân loại, không tự hiểu là OPTIONAL |
| LEGAL_MEDICAL_RECORD.DocumentStatus | PENDING_REVIEW, VERIFIED, REJECTED, EXPIRED; SQL cho NULL | Hồ sơ bắt buộc còn cần dùng phải VERIFIED và có hiệu lực tại lúc sử dụng; upload chưa đồng nghĩa đã duyệt |

INCIDENT.ApprovedBy có người duyệt không tự làm Status thành RESOLVED. AdditionalCost có tiền cũng không tự trở thành khoản khách phải trả; SETTLEMENT_ADJUSTMENT là dữ liệu riêng khi Manager quyết định điều chỉnh.

ConditionStatus, HealthStatus và AssetCheck là mô tả; không dùng chúng làm cờ “đủ điều kiện giao” bằng cách so khớp một chuỗi cố định. Bảng INCIDENT hiện không có cột BlocksHandover hoặc AffectsHandover đã chốt.

QUARANTINE_BOOKING, CUSTOMS_CLEARANCE, FLIGHT_BOOKING, VEHICLE, STAFF_DOCUMENT và catalog tuyến/cơ sở thuộc nghiệp vụ hồ sơ, hành trình và nguồn lực. Tài liệu này không đặt chúng thành một bộ điều kiện trạng thái trực tiếp để Flow 6 bắt đầu. Nếu có hồ sơ cần giao cho người nhận, nội dung thực giao được ghi ở HANDOVER/HANDOVER_ITEM; không yêu cầu Flow 6 kiểm lại mọi booking hoặc phê duyệt khởi hành.

## 5. Các bảng Flow 6 tại thời điểm tiếp nhận

“Chưa có dòng” khác với một dòng có Status = NULL. Các cột Status NOT NULL không được ghi NULL để biểu diễn chưa phát sinh.

| Bảng / field | Lúc bắt đầu lần giao nhận bình thường | Giải thích |
|---|---|---|
| HANDOVER, Type = DELIVERY / Status | Chưa có dòng, hoặc DRAFT nếu đã chuẩn bị | Chưa yêu cầu AWAITING_OTP/CONFIRMED |
| HANDOVER DELIVERY / IsAuthorized | NULL nếu chưa kiểm; 0 nếu xác định không có quyền; 1 nếu đã xác minh có quyền | Có quyền nhận chưa đồng nghĩa đã nhận hoặc đã OTP |
| HANDOVER_ITEM DELIVERY / MicrochipVerified | Mặc định 0 cho lần kiểm mới; 1 chỉ sau khi kiểm thành công | Không lấy kết quả PICKUP thay cho lần giao |
| HANDOVER_ITEM DELIVERY / ConditionStatus, AssetCheck | Chưa ghi hoặc đã có mô tả kiểm tra thực tế | Không có enum riêng; không tự mặc định “đạt” |
| HANDOVER_ITEM DELIVERY / DocumentsReceivedAtUtc | NULL khi chưa ghi nhận nhận giấy tờ | Có timestamp không thay xác nhận toàn bộ biên bản |
| HANDOVER_REVISION DELIVERY / Status | Chưa có dòng, hoặc DRAFT | DRAFT có ContentSnapshot; chưa có OTP/ConfirmedAtUtc/RefusalReason/RefusedAtUtc và OtpFailedAttempts = 0 theo CHECK |
| TRIP_SETTLEMENT / Status | Chưa có dòng, hoặc DRAFT nếu đã chuẩn bị | Chưa bắt buộc có hóa đơn cuối hoặc revision DELIVERY đã xác nhận |
| TRIP_SETTLEMENT / SettledBy, SettledAtUtc, ClosedAtUtc, FeedbackStartedAtUtc, FeedbackEndsAtUtc | NULL với DRAFT | Chưa tất toán/đóng/mở cửa sổ feedback |
| INVOICE, InvoiceType = FINAL_SETTLEMENT / PaymentStatus | Có thể chưa có; nếu đã soạn thì theo tiền thực tế | Không yêu cầu PAID để bắt đầu giao nhận; UNPAID/PARTIALLY_PAID không đồng nghĩa không được giao |
| SETTLEMENT_ADJUSTMENT | Không bắt buộc có dòng | Không có Status/Bearer; mỗi dòng là quyết định Manager, Amount > 0 và có metadata quyết định |
| SETTLEMENT_ADJUSTMENT.RefundStatus | NULL khi không áp dụng; REQUESTED/PROCESSING/COMPLETED khi có hoàn | Không phải điều kiện bắt đầu giao ngựa |
| CUSTOMER_CASE.Status | Không bắt buộc có; nếu có: OPEN/IN_PROGRESS/RESOLVED | Khiếu nại không tự đồng nghĩa đã giao hoặc chưa được mở giao nhận |
| CUSTOMER_FEEDBACK | Không bắt buộc có dòng; bình thường chưa có | Rating không phải điều kiện bàn giao |

Nếu DELIVERY đang AWAITING_OTP thì Flow 6 đã bắt đầu và đang chờ xác nhận. Nếu DELIVERY đã CONFIRMED thì đã qua điểm bàn giao đang mô tả. REFUSED là lần giao bị từ chối; giữ bằng chứng và xử lý giao lại, không coi là hoàn thành.

Tổ hợp sau xác nhận DELIVERY để phân biệt với đầu vào: **HANDOVER/REVISION = CONFIRMED → Trip = COMPLETED, Request = DELIVERED**. Contract vẫn EFFECTIVE nếu chưa tất toán; phiên bản hợp đồng vẫn SIGNED. Đây là mốc sau của Flow 6, không phải điều kiện đầu vào.

## 6. Làm rõ các thuật ngữ trong bản trước

- **“Assignment ở cấp Trip”**: TRIP_VEHICLE_ASSIGNMENT gắn TripID với VehicleID, DriverID, EscortID; không có SegmentID hoặc Status. Ví dụ một dòng nói “xe A, tài xế B, người đi kèm C được phân công cho chuyến X”, chưa nói họ phụ trách chặng nào. Flow 6 có thể tham chiếu phân công của chuyến để nhận diện người thực hiện; tài liệu này không yêu cầu xây phân công theo chặng.
- **ActualTime**: field DATETIME nullable trong ROUTE_SEGMENT, lưu thời điểm thực tế của mốc/chặng theo định nghĩa hành trình. ExpectedETA là giờ dự kiến. Ví dụ dự kiến đến 10:00, thực tế đến 10:25: hai giá trị khác nhau. ActualTime không phải giờ OTP, giờ giao nhận hoàn tất hoặc giờ tất toán; không nằm trong đầu vào trực tiếp Flow 6 đã chốt ở đây.
- **Hồ sơ bảo hiểm**: thông tin chứng minh đã mua bảo hiểm như số hợp đồng/giấy chứng nhận, đối tượng bảo hiểm, thời hạn và phạm vi chi trả. SQL Reviewed chưa có bảng riêng lưu đầy đủ hồ sơ này. COST_RATE nhóm INSURANCE chỉ là định mức giá, không chứng minh đã mua bảo hiểm. Không đặt INSURANCE.Status = ACTIVE thành điều kiện bàn giao vì field đó chưa tồn tại.
- **Checklist áp dụng**: danh sách giấy tờ/thủ tục chuyến cụ thể cần có, ví dụ giấy nào bắt buộc, tùy chọn hoặc không áp dụng. SQL đã có RequirementStatus ở LEGAL_MEDICAL_RECORD, nhưng chưa có bảng checklist đầy đủ. Không yêu cầu một ChecklistStatus mới cho Flow 6.
- **Kết luận/blocker chuyên môn**: ý kiến nghiệp vụ như ngựa cần kiểm tra thêm hoặc giấy tờ chưa được chấp nhận; “blocker” chỉ nghĩa vấn đề đang cản việc thực hiện. Đây là cách diễn giải ở bản trước, không phải bảng/cột/NAME đã chốt. Không yêu cầu một trạng thái chung kiểu NO_BLOCKER hoặc VET_APPROVED để tiếp nhận Flow 6.

Các mục giải thích trên không bổ sung bảng, cột, enum hoặc sự phụ thuộc hàm giữa các flow.
