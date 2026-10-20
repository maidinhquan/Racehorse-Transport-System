# Kết nối Flow 2/3 với bàn giao Flow 1

Đối chiếu source working tree ngày 20/10/2026. Dành cho teammate/agent tích hợp các nhánh. Đọc `FLOW1_RUN_GUIDE.md` trước để dựng DB/runtime. Tài liệu mô tả hợp đồng bàn giao thực tế của Flow 1; không chứng nhận code nhánh Flow 2/3 đã tương thích hoặc định nghĩa lại nghiệp vụ các luồng đó.

## 1. Điểm bắt đầu và trách nhiệm

```text
Customer trả cọc 40% → backend xác minh → Customer ký OTP
  → CONTRACT.EFFECTIVE, TRANSPORT_REQUEST.ACTIVATED
  → tạo một TRIP_PLAN (PLANNING, deployment PENDING)
Manager chỉ định Specialist + Coordinator, xác nhận
  → deployment CONFIRMED, sinh handoff event, gửi thông báo riêng
  ├─ Coordinator: lấy chuyến được giao → ack → tiếp tục Flow 2
  └─ Specialist: lấy chuyến được giao → ack → tiếp tục Flow 3
```

Hai luồng có thể bắt đầu song song sau bàn giao. Không chờ một người hoàn thành/ack rồi mới cho người kia đọc chuyến. Ack xác nhận đã đọc/nhận việc của chính mình; không phải self-claim, không đổi người được gán và không tự đổi Trip.Status.

Flow 1 sở hữu tạo request/hợp đồng, tiền cọc và ký, tạo Trip, phân công và bàn giao. Flow 2/3 tiếp tục trên **TripID hiện có**. Không tạo Trip mới từ cùng RequestID; không tạo hợp đồng mới để làm khóa nối; không hardcode ID tài khoản demo.

## 2. Điều kiện server đang thực thi

### Manager xác nhận bàn giao

- Contract hiện hành `EFFECTIVE`, đã có Trip, request `ACTIVATED`.
- Trip `PLANNING` và `DeploymentStatus=PENDING`.
- Hai người được chọn tồn tại, active, đúng role.
- Có reason và trip.version hợp lệ.
- Một chiều: không hold/resume, không phân công lại/đổi người bằng API Flow 1.

### Nhân sự đọc/ack/tải tệp qua API bàn giao

- JWT là `TRANSPORT_SPECIALIST` hoặc `FLEET_ROUTE_COORDINATOR`, tài khoản hợp lệ.
- Đúng ID được chỉ định theo role của mình.
- Deployment `CONFIRMED`, có HandoffEventId.
- Trip.Status thuộc **PLANNING hoặc READY_TO_DEPART**.
- Contract hiện hành `EFFECTIVE`, SignedAt có giá trị.
- Với ack/tải tệp: gửi đúng eventId hiện hành.

**Hệ quả cần chú ý khi tích hợp:** API bàn giao không phải API xem chuyến suốt vòng đời. Khi Flow 2/3 đổi Trip sang trạng thái khác hoặc đổi ContractStatus khỏi EFFECTIVE, queue/tải hồ sơ/ack qua cửa Flow 1 sẽ không còn khả dụng. Flow 2/3 cần API riêng có phân quyền để xem chuyến/tệp ở giai đoạn thực thi. Đây là việc phải thống nhất khi ghép, không bỏ guard Flow 1 hoặc gọi nó như API chi tiết vĩnh viễn.

## 3. Role và xác thực

| Vai trò | Chuỗi role hiện hành | Được làm ở điểm nối |
|---|---|---|
| Manager | LOGISTICS_MANAGER | Lấy danh sách nhân sự, chỉ định và xác nhận bàn giao |
| Coordinator | FLEET_ROUTE_COORDINATOR | Xem chuyến của mình, PDF, ảnh/hộ chiếu ngựa, ack phần điều phối |
| Specialist | TRANSPORT_SPECIALIST | Xem chuyến của mình, PDF, ảnh/hộ chiếu và hồ sơ baseline, ack phần hồ sơ |

Không dùng `FLEET_COORDINATOR` theo ví dụ tài liệu cũ. Dùng chung cơ chế đăng nhập/JWT hiện tại, Actor lấy từ claims; không tin userId/role do client gửi để quyết định quyền. Manager không phải người gọi operations queue để giả danh nhân sự.

## 4. API nối thật

Base URL ví dụ `http://localhost:5129`, kèm `Authorization: Bearer <accessToken>`.

| Method | Path | Người gọi | Nội dung |
|---|---|---|---|
| GET | /api/manager/staff/operational | Manager | Nhân sự active theo role để chọn |
| GET | /api/manager/contracts/{contractId} | Manager | Lấy trip ID/version hiện hành |
| POST | /api/manager/contracts/{contractId}/deployment/confirm | Manager | Phân công ban đầu |
| GET | /api/operations/flow1/trips | Specialist/Coordinator | Danh sách bàn giao đúng người được gán |
| POST | /api/operations/flow1/trips/{tripId}/ack | Đúng nhân sự | Xác nhận nhận bàn giao |
| GET | /api/operations/flow1/trips/{tripId}/pdf?eventId={eventId} | Đúng nhân sự | PDF hợp đồng đã ký, kiểm tra SHA-256 |
| GET | /api/operations/flow1/trips/{tripId}/horses/{horseId}/files/photo?eventId={eventId} | Đúng nhân sự | Ảnh ngựa thuộc request |
| GET | /api/operations/flow1/trips/{tripId}/horses/{horseId}/files/passport?eventId={eventId} | Đúng nhân sự | Hộ chiếu ngựa thuộc request |
| GET | /api/operations/flow1/trips/{tripId}/documents/{documentId}?eventId={eventId} | Specialist | Hồ sơ baseline đã gửi cùng request |
| GET | /api/flow1/notifications | Đã đăng nhập | Thông báo riêng của actor |
| POST | /api/flow1/notifications/{notificationId}/read | Chủ thông báo | Đánh dấu đã đọc |

### Payload Manager phân công

```json
{
  "version": "<trip.version mới nhất>",
  "reason": "Phân công nhân sự chuẩn bị chuyến",
  "assignedSpecialistId": "<userId Specialist active>",
  "assignedCoordinatorId": "<userId Coordinator active>"
}
```

Response là ApiResponse với `data` kiểu FlowContractCard, trong đó `data.trip` có trạng thái/ID/token/event mới. **Không dùng contract.version trong payload phân công.**

### Response queue (minh họa cấu trúc, ID phải lấy thật)

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "trip": {
        "tripId": "<tripId>",
        "version": "<rowversion token>",
        "status": "PLANNING",
        "deploymentStatus": "CONFIRMED",
        "eventId": "<handoffEventId>",
        "reason": "Phân công nhân sự chuẩn bị chuyến",
        "routingAcknowledgedBy": null,
        "documentsAcknowledgedBy": null,
        "assignedSpecialistId": "<specialistId>",
        "assignedCoordinatorId": "<coordinatorId>"
      },
      "requestId": "<requestId>",
      "departure": "<địa chỉ đón>",
      "destination": "<địa chỉ giao>",
      "departureAt": "<ngày giờ API trả>",
      "deliveryAt": "<ngày giờ API trả>",
      "contractId": "<contractId>",
      "pdfSha256": "<SHA256>",
      "horses": [],
      "declaredValueUsd": null,
      "documents": []
    }
  ]
}
```

`horses` thực tế chứa FlowHorseCard: horseId/name/microchipIso/passportNo/version/hasDocuments/selectable/breed/sex/dob. `documents` chứa documentId/horseId/documentType/status. Không suy ra không có ngựa từ mảng rỗng trong ví dụ; dữ liệu thật dùng response.

Queue hiện trả danh sách, không có pagination contract ở endpoint này. DTO không chứa toàn bộ dữ liệu phục vụ định tuyến: tọa độ, liên hệ, giá trị chi tiết khác phải đọc qua service/DAO được phân quyền hoặc bổ sung endpoint Flow 2/3 có chủ đích. Không cho Coordinator gọi API Manager để lấy bổ sung dữ liệu.

### Ack

```json
{
  "version": "<trip.version lấy từ queue hiện hành>",
  "eventId": "<trip.eventId cùng chuyến>"
}
```

Response `data` là FlowHandoff. Coordinator ghi RoutingAcknowledgedBy/AtUtc; Specialist ghi DocumentsAcknowledgedBy/AtUtc. Ack cùng người/event lần nữa được xử lý như đã nhận. Nếu hai người ack đồng thời, người thứ hai có thể gặp xung đột version vì cùng row Trip: GET queue lại rồi retry sau khi xác minh event. Không bỏ kiểm tra concurrency.

## 5. Thông báo và event

Manager confirm sinh `HandoffEventId` trong TRIP_PLAN và hai thông báo `Type=FLOW1_HANDOFF`, mỗi người một thông báo. **ReferenceID của thông báo này là eventId, không phải TripID hay ContractID.** Để mở đúng chuyến, GET queue và tìm `trip.eventId` tương ứng; nếu chuyến đã rời giai đoạn bàn giao, dùng màn/API của flow tiếp theo theo thiết kế đã thống nhất.

Event ở đây là ID lưu DB trong giao dịch bàn giao, **không phải message broker, webhook hoặc SignalR đã triển khai**. Đừng chờ listener nhận event từ RabbitMQ/Kafka. Có thể tải queue khi mở trang và refresh/poll theo nhu cầu UI; cơ chế push mới cần thiết kế riêng.

## 6. Database dùng chung và khóa nối

Áp dụng `backend/database/002_flow1.sql` hiện hành trước khi test trên DB cá nhân. Không chỉ chép entity mới mà bỏ SQL. Dùng cùng database, không copy danh sách chuyến sang bảng riêng chỉ để nối các luồng.

| Nguồn | Khóa/cột cần hiểu | Ý nghĩa |
|---|---|---|
| TRANSPORT_REQUEST | RequestID, CustomerID | Yêu cầu và khách hàng |
| TRANSPORT_REQUEST | ExpectedDate, CommittedDeadline | Lịch đón/giao; không nhầm hạn ký hợp đồng |
| TRANSPORT_REQUEST | Departure/Destination, tọa độ, PickupContact..., DesignatedReceiver... | Điểm đón/giao và liên hệ gốc |
| REQUEST_HORSE_MAPPING | RequestID, HorseID | Danh sách ngựa của yêu cầu |
| HORSE | HorseID, OwnerID, PhotoUrl, PassportScanUrl | Hồ sơ ngựa; URL trong DB là tham chiếu tệp private |
| CONTRACT | ContractID, RequestID, TripID, IsCurrent | Hợp đồng hiện hành liên kết request và Trip |
| CONTRACT | ContractStatus, SignedAt, PdfUrl, PdfSha256 | Chứng cứ hợp đồng đã ký, tệp bất biến |
| TRIP_PLAN | TripID, RequestID | Chuyến do Flow 1 tạo sau ký |
| TRIP_PLAN | AssignedSpecialistId, AssignedCoordinatorId | Hai FK riêng tới USER.UserID, hai vai trò khác nhau |
| TRIP_PLAN | Status, DeploymentStatus, HandoffEventId | Trạng thái chuyến và bàn giao là các cột khác nhau |
| TRIP_PLAN | DeploymentBy/AtUtc/Reason | Người thực hiện và lý do phân công |
| TRIP_PLAN | RoutingAcknowledgedBy/AtUtc, DocumentsAcknowledgedBy/AtUtc | Hai xác nhận nhận bàn giao |
| TRIP_PLAN | RowVersion | Concurrency toàn row, kể cả thay đổi từ Flow 2/3 |
| LEGAL_MEDICAL_RECORD | RecordID, RequestID, HorseID | Hồ sơ gắn đúng ngựa/request; baseline Flow 1 dùng DocumentType=BASELINE_MEDICAL |
| NOTIFICATION | UserID, ReferenceID, Type | Thông báo riêng; phân biệt loại trước diễn giải ReferenceID |

Tên bảng/cột chính xác xem entity/SQL, không tự pluralize khi map EF. ID dạng string/varchar(50), không ép sang int/Guid dựa trên hình dạng ví dụ. TRIP_PLAN có hai FK vì cần lưu hai người khác vai trò trên cùng chuyến; không có hai TripID.

Không có AssignedManagerId/ReviewedAtUtc trong schema cuối. Không thêm CONTRACT_CLAUSE/audit/version-history để tích hợp. Nội dung điều khoản bổ sung chỉ nằm trong PDF. Không sửa SignedAt/PdfSha256/ContractStatus hoặc dữ liệu tiền để ép mở queue.

### Ảnh hưởng của schema khi ghép các nhánh

- Các cột mới không buộc mọi flow phải ghi hết chúng; nhưng thao tác INSERT/UPDATE phải tôn trọng constraint và trường bắt buộc hiện hành.
- Tránh `INSERT ... VALUES (...)` không nêu danh sách cột, `SELECT *` rồi map theo thứ tự, hoặc update toàn entity detached bằng giá trị mặc định: dễ mất assignment/event/concurrency.
- Nếu Flow 2/3 đang tự tạo TRIP_PLAN từ request, cần đổi điểm vào sang Trip có sẵn sau ký. Không xóa unique guard để cho phép chuyến trùng.
- Khi cập nhật bằng context/DAO khác, bảo toàn các cột Flow 1, dùng concurrency phù hợp, không reset RowVersion. Soát mapping/SQL của nhánh teammate khi merge; tài liệu này không thay thế kiểm thử nhánh thật.
- Baseline do Customer gửi không mặc nhiên là giấy tờ đã được Specialist xác minh. Giữ DocumentType/record riêng đúng nghĩa; không ghi đè baseline để giả định hoàn tất y tế.

## 7. Tệp private và PDF

Tải bằng API có JWT và eventId; response là bytes với Content-Type, không phải ApiResponse JSON. Browser nên fetch với Authorization rồi tạo blob URL nếu cần preview; không nhét token vào query string. Server dùng no-store, không public hóa thư mục App_Data.

PDF operations được kiểm SHA-256 với hash hợp đồng trước khi trả. Giữ nguyên bytes đã ký; không render lại từ catalogue mới cho Flow 2/3. Không mở trực tiếp PdfUrl/UploadedFileUrl như URL web công khai, không copy đường dẫn host của người khác. Khi chuyển môi trường, mang theo kho private files và DB khớp nhau.

Hồ sơ baseline `/documents/{documentId}` hiện chỉ Specialist được tải; cả hai vai trò được tải ảnh/hộ chiếu thuộc ngựa của chuyến. API giai đoạn sau phải giữ ít nhất cùng mức kiểm tra actor/assignment/thuộc chuyến, bổ sung trạng thái phù hợp thay vì tắt bảo vệ toàn cục.

## 8. Việc teammate cần làm trong flow của mình

1. Merge/pull đủ source và áp dụng SQL hiện hành trên DB local, cấu hình JWT/server giống ứng dụng đang chạy.
2. Gắn điểm vào danh sách được giao vào queue thật; map bằng tripId, không requestId hoặc eventId thay thế.
3. Gửi ack cho chính nhân sự, lưu state từ response; refresh khi 409.
4. Đọc request/ngựa/lịch/hồ sơ từ khóa liên kết đã có. Nếu thiếu field trong DTO bàn giao, bổ sung read-model/API có phân quyền hoặc đọc service/DAO nội bộ; không nhân bản dữ liệu không cần thiết.
5. Thực hiện nghiệp vụ Flow 2/3 trên Trip hiện có. Tách quyền cập nhật các trường flow mình sở hữu; bảo toàn hợp đồng/tiền/assignment của Flow 1.
6. Trước thay đổi Trip.Status/ContractStatus, thống nhất endpoint tiếp tục xem chuyến/tệp sau khi queue Flow 1 đóng. Đặc biệt không để một flow đổi status làm flow kia mất lối vào khi vẫn đang chuẩn bị.
7. Không coi ack đủ hai người là điều kiện khởi hành đã hoàn tất. Điều kiện xe/tuyến đường/y tế của Flow 2/3 phải được kiểm tra bởi nghiệp vụ các luồng đó.

## 9. Checklist kiểm thử ghép tối thiểu

| Ca kiểm thử | Kết quả kỳ vọng |
|---|---|
| Đã cọc nhưng chưa ký | Không có Trip mới để bàn giao |
| Đã ký, chưa Manager confirm | Trip tồn tại nhưng operations queue chưa trả |
| Confirm thiếu/sai role/inactive | Bị từ chối, không gán dở một người |
| Confirm đúng | Cùng TripID, eventId có giá trị, mỗi người nhận thông báo riêng |
| Đúng Specialist và Coordinator | Cả hai thấy cùng chuyến, không phải hai chuyến khác nhau |
| Nhân sự không được gán | Không thấy chuyến/không tải được tệp bằng ID đoán |
| Ack từng người và retry | Chỉ ghi đúng trường của người đó; retry không tạo Trip/event mới |
| Ack đồng thời | Concurrency conflict được refresh/retry đúng, không mất ack người trước |
| Event sai/thiếu | Không mở được ack/tệp bằng sự kiện không hợp lệ |
| Hồ sơ baseline | Specialist đúng người được tải; Coordinator không có quyền endpoint baseline |
| PDF bị đổi bytes | Bị lỗi kiểm tra integrity, không trả PDF giả là bản đã ký |
| Flow 2 cập nhật kế hoạch | Không xóa assignment/ack/event và không ảnh hưởng phần Flow 3 ngoài quy tắc thống nhất |
| Trip sang trạng thái thực thi | Queue Flow 1 đóng theo guard hiện hành; API Flow 2/3 vẫn phục vụ đúng người theo thiết kế giai đoạn sau |
| Request cùng ID bị xử lý lặp | Không phát sinh chuyến trùng |

Các lỗi expected 400/401/403/409 là kết quả cần assert theo từng ca, không gọi tất cả là hệ thống lỗi. Đọc errorCode/message hiện hành; response auth/model validation có thể chưa đồng nhất errorCode toàn bộ. Không báo “E2E xong” chỉ vì queue GET trả 200.

## 10. Bản đồ source cho agent

| File/thư mục | Vai trò |
|---|---|
| backend/Application/Services/Flow1/Relational/RelationalDeployment.cs | Released guard, confirm, queue, ack, PDF/ảnh/hộ chiếu |
| backend/Application/Services/Flow1/Relational/RelationalRequestDocuments.cs | Hồ sơ baseline và OperationsDocumentAsync |
| backend/Application/Services/Flow1/Relational/RelationalContracts.cs | Ký và liên kết hợp đồng/chuyến |
| backend/WebApi/Controllers/Flow1/Relational/Flow1Controllers.cs | Route và authorization thật |
| backend/Application/DTOs/Flow1/RelationalDtos.cs | FlowAction, FlowTripCard, FlowHandoff, FlowRequestDocument |
| backend/Domain/Flow1/FlowRows.cs | Entity map bảng/cột |
| backend/Infrastructure/Data/Context/Flow1RelationalContext.cs | EF/FK/transaction/concurrency |
| backend/Infrastructure/Data/Context/Flow1RelationalSchema.cs | Guard schema triển khai |
| backend/database/002_flow1.sql | Schema cuối/constraint/seed điều khoản |
| backend/Domain/Enums/UserRoles.cs | Role chuẩn và normalization |
| backend/tests/Flow1.Tests/ | Ca nghiệp vụ/phân quyền/tiền/tệp/concurrency |

Tài liệu backend/FLOW* là báo cáo local đang bị ignore, không mặc định tồn tại ở máy teammate. Hai tài liệu root này là điểm đọc được đưa lên Git; không phụ thuộc báo cáo local hoặc file data chưa track.
