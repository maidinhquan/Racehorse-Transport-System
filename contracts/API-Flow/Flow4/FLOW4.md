# API Contract — Flow 4: thực hiện và theo dõi hành trình

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.1.0 — 30/10/2026 |
| Phạm vi | API contract đích; chưa triển khai backend/database, chưa nối frontend |
| Đầu vào | Flow 3 v2: Trip READY_TO_DEPART, Request SCHEDULED, approved plan và phân công còn hợp lệ |
| Kết thúc | Đến điểm giao cuối, mở bàn giao Flow 6; chưa hoàn tất Trip |
| Nguồn nghiệp vụ | Flow 4 đã bàn, tổng hợp 18/10/2026; cập nhật điểm nối Flow 3 ngày 27/10, Flow 6 ngày 26/10 và chuẩn hóa vận hành 30/10/2026 |

[JSON từng API](FLOW4-API-JSON.md) · [OpenAPI 3.1](flow4.openapi.json) · [Kịch bản nghiệm thu](flow4.examples.json) · [Quy ước](../../CONVENTIONS.md).

Nguồn thảo luận lưu tại `work/full-documentation-export/docs/flows/FLOW_04_05_06.md`, phần Flow 4. Chỉ dùng phần Flow 4 của bản đó: Flow 3/6 có contract mới thay thế. Không dùng phần Flow 6 cũ về tự đóng đơn/cửa sổ feedback để triển khai. Quy tắc dưới đây xác định giao thức FE–BE mục tiêu, không khẳng định schema DB hiện tại lưu được toàn bộ DTO.

## 1. Luồng chính và ranh giới

ROAD: `Duyệt khởi hành (Flow 3 J18) → sinh danh sách mốc tự động → kiểm tra thực tế (J04) → DEPARTED (J05) → các điểm dừng/kiểm tra đã duyệt (J06/J12) → FINAL_ARRIVED (J06) → Flow 6`.

AIR: `Duyệt khởi hành → sinh mốc → outbound DEPARTED → các điểm dừng/kiểm tra → AIRPORT_ORIGIN_ARRIVED → AIR_HANDOVER → AIR_DEPARTED → AIR_ARRIVED → AIR_RECEIVED → inbound DEPARTED → các điểm dừng/kiểm tra → FINAL_ARRIVED → Flow 6`.

Danh sách mốc được máy chủ tạo tự động từ snapshot phương án Flow 3 đã duyệt (`ApprovedPlanJson`) ngay trong transaction phê duyệt khởi hành (`F3-J18 / ApproveDepartureV2Async`). Chỉ sinh những điểm thực sự có trong phương án, gồm cặp đến/rời cho điểm nghỉ (`STOP_ARRIVED`/`STOP_DEPARTED`) và checkpoint (`CHECKPOINT_ARRIVED`/`CHECKPOINT_DEPARTED`) khi cần. Điểm dừng có thể đánh dấu `requiresHealthCheck: true` để bắt buộc kiểm tra y tế trước khi rời trạm. Không bắt buộc có cùng số mốc ở mọi chuyến. `sequence` tăng trên toàn hành trình, `leg` là `road`, `outbound`, `air`, `inbound`; ROAD chỉ có `road`. AIR có hai tổ ROAD độc lập như Flow 3, không cho người đầu đi ghi thay đầu đến. Khi chuyến đi đã ghi nhận xuất phát thực tế (`IN_TRANSIT`), hệ thống khóa hoàn toàn việc duyệt lại khởi hành hoặc sửa đổi kế hoạch nháp ở Flow 3.

| Sự kiện | Trip | Request | Ý nghĩa |
|---|---|---|---|
| Manager duyệt Flow 3 | READY_TO_DEPART | SCHEDULED | Được phép chuẩn bị xuất phát, sinh mốc PENDING, chưa đi |
| Xuất phát ROAD đầu thực tế | IN_TRANSIT | IN_TRANSIT | J05, ghi DEPARTED một lần, khóa sửa kế hoạch Flow 3 |
| Các mốc giữa, kể cả inbound xuất phát | IN_TRANSIT | IN_TRANSIT | Không tạo Trip mới |
| FINAL_ARRIVED | IN_TRANSIT | IN_TRANSIT | phase AWAITING_HANDOVER; mở Flow 6 nếu đủ điều kiện |
| Flow 6 bàn giao hợp lệ | COMPLETED | DELIVERED | Flow 6 quyết định; nhả xe AVAILABLE; chưa tự CLOSED |

`phase` là projection vận hành, không phải enum DB mới: `AWAITING_DEPARTURE`, `IN_PROGRESS`, `AWAITING_HANDOVER`, `HANDED_OVER`. Request có thể đi tiếp UNDER_RESOLUTION/CLOSED theo Flow 6 khi đọc lịch sử. Mọi mutation vận hành bị khóa sau bàn giao; đọc và yêu cầu đính chính lịch sử vẫn kiểm scope. Đính chính sau bàn giao chỉ metadata không ảnh hưởng bằng chứng đã ký; nếu ảnh hưởng thì trả CORRECTION_REQUIRES_INCIDENT và xử lý qua quy trình Flow 5/6, không sửa biên bản đã ký.

Flow 4 không lập lại tuyến, thay xe/người hoặc booking trực tiếp. Thay đổi khi đang chạy qua Flow 5, chỉ đánh giá lại phần bị ảnh hưởng; không cho sửa plan-draft Flow 3 đã khóa. Khi phương án thay đổi được phê duyệt và áp dụng, máy chủ tạo execution revision mới: giữ toàn bộ mốc đã ghi, chỉ thay các mốc tương lai và phân công liên quan, lưu mapping mốc cũ/mới; proposal và clearance bị ảnh hưởng phải recheck. Không tự nối mốc từ hai approved plan khác nhau. Giá, địa chỉ giao và hợp đồng đã ký không bị sửa bởi ETA hoặc nhật ký.

## 2. Role, quyền và phạm vi

| Role | Quyền |
|---|---|
| DRIVER_ESCORT | Đọc nhiệm vụ được phân công; MAIN_DRIVER/CO_DRIVER ghi mốc, xuất phát và bàn giao AIR của chặng; ghi chi phí phát sinh trên đường; mọi crew được giao ghi chăm sóc/ETA, yêu cầu đính chính |
| DRIVER_ESCORT + crewDuty VETERINARIAN | Bác sĩ được phân công, qualification hợp lệ: thêm kết luận chuyên môn và khả năng tiếp tục; không cho client tự khai crewDuty |
| FLEET_ROUTE_COORDINATOR | Giám sát chuyến được giao, xét đính chính, điều phối ETA, nhập thông tin đối tác AIR, xem chi phí phát sinh và ghi liên hệ/cảnh báo |
| TRANSPORT_SPECIALIST | Đọc chuyến được giao và ghi kết quả checkpoint pháp lý, hồ sơ/bảo hiểm bị ảnh hưởng thuộc Flow 2/5 |
| LOGISTICS_MANAGER | Giám sát trong phạm vi quản lý, duyệt ETA cần quyết định cấp Manager; không hoàn tất mốc thay tài xế |
| CUSTOMER | Chỉ đọc hành trình, nhật ký/chỉ số/ảnh/kết luận liên quan ngựa của đơn mình; không sửa dữ liệu vận hành |

Bearer JWT xác định actor và role. Mỗi ID trong path/body/file đều kiểm ownership/assignment, gồm ngựa, checkpoint, booking, incident. Sai role trả 403; Trip/Request/file ngoài scope trả 404. Người có quyền xem Trip nhưng ghi sai chặng trả 409 NOT_ASSIGNED_LEG. Bác sĩ thiếu qualification trả 409 VETERINARIAN_REQUIRED. Prefix `/trips/*/execution` là endpoint dùng chung có `x-roles` rõ, không mở cho mọi tài khoản.

Khi tài xế xem danh sách hoặc chi tiết chuyến (`J02`, `J03`), hệ thống phải trả thông tin xe chi tiết (`VehicleSummary`: `vehicleId`, `plateNumber`, `type`, `capacityStalls`, `heightM`, `grossWeightTons`) để nhận diện xe thực tế tại bãi. Trước khi xuất phát (`J04`, `J05`), tài xế bắt buộc phải xác nhận `VEHICLE_VERIFIED` bên cạnh `HORSES_CHECKED`.

PublicTracking/PublicHealth là projection riêng. Customer được thấy tình trạng, chăm sóc, ăn uống/nghỉ, chỉ số, ảnh, nhận xét, hướng dẫn xử lý liên quan, người ghi/vai trò/thời điểm và lịch sử đính chính. Không trả chi phí nội bộ, chi phí phát sinh đường đi, thông tin liên hệ riêng, hồ sơ nhân sự, ghi chú xử lý nội bộ hay bằng chứng chưa chia sẻ. Nội dung note/observation public phải được phân loại và lọc ở server; không trả nguyên DTO nội bộ rồi chỉ ẩn bằng CSS. File quyền đọc riêng, không dựa vào biết fileId.

## 3. Milestone, checkpoint và xuất phát

- Chỉ mốc PENDING đầu tiên chưa hoàn tất được thao tác; kiểm thứ tự và chặng tại transaction. Mốc COMPLETED và mốc tương lai khóa. Client lấy `actions`/`blockers` từ server, không tự mở theo đồng hồ.
- J04 chỉ kiểm trước xuất phát, không cấp quyền vĩnh viễn. Yêu cầu xác nhận `HORSES_CHECKED` và `VEHICLE_VERIFIED`. J05 recheck approved plan, assignment, readiness, hồ sơ, bảo hiểm và blocker hiện hành rồi cập nhật Trip/Request/mốc/history/outbox cùng transaction. Không cần duyệt khởi hành Flow 3 lần nữa chỉ vì gọi J04; dependency thay đổi thì chặn và xử lý đúng workflow.
- J06 không dùng để vượt J05 hoặc các mốc AIR chuyên biệt. Inbound DEPARTED chỉ sau AIR_RECEIVED và precheck chặng đầu đến; check với `leg=inbound` để đọc yêu cầu. Không có checkpoint clearance hay nguồn lực phù hợp thì chưa được rời.
- Mốc trạm dừng có cờ `requiresHealthCheck`. Nếu `requiresHealthCheck: true`, mốc rời trạm (`STOP_DEPARTED` hoặc hoàn tất mốc đó) bị chặn (`canComplete = false`) cho đến khi kíp xe ghi nhận nhật ký sức khỏe (`HEALTH_LOG` qua J23) cho toàn bộ ngựa của chặng tại trạm này. Cố tình gửi request khi chưa hoàn tất trả lỗi 409 `HEALTH_CHECK_REQUIRED`.
- Chặn xe khi có sự cố y tế (Gate Blocking: Health Abnormal): Khi có bất kỳ ngựa nào trên chuyến bị ghi nhận `Condition: ABNORMAL` (qua J23), hệ thống tự động đặt `Safety Blocker`, khóa hoàn tất mốc tiếp theo (`J06`) và mốc bàn giao sân bay (`J13`), trả lỗi 409 `VET_CLEARANCE_REQUIRED` hoặc `INCIDENT_BLOCKING`. Mốc chỉ được mở lại khi Bác sĩ thú y phân công ghi nhận `transportFitness: FIT` (`J25`) hoặc phương án khắc phục Flow 5 hoàn tất.
- Lưu `occurredAt` do người nhập, `recordedAt` và `recordedBy` do máy chủ; không nhận actor/status từ body. Kiểm ngày lịch thực, không giờ tương lai so serverTime, không trước khởi hành hoặc mốc trước, không sau mốc sau khi đính chính. Cho phép cùng phút vì DTO chính xác tới phút; server giữ thứ tự bằng sequence và độ chính xác persistence.
- Tại CHECKPOINT_ARRIVED, Specialist ghi kết quả thực tế từ cơ quan/bên kiểm tra bằng J12, kèm bằng chứng. PENDING/HELD/SUPPLEMENT_REQUIRED chặn CHECKPOINT_DEPARTED; chỉ CLEARED đúng checkpoint/plan dependency mới cho phép xem xét tiếp. Không tự mở bằng một ghi chú Driver.
- Health blocker, incident blocker, checkpoint blocker độc lập. CLEAR/FIT hoặc đóng incident đơn lẻ không tự mở toàn bộ chuyến. Kiểm lại phần hành trình bị ảnh hưởng mỗi lần complete.

Mỗi mốc giữ revision. Driver J08 yêu cầu đính chính COMPLETED, nêu lý do và đề xuất time/note/evidence; original được snapshot từ server. Coordinator J10 chỉ duyệt đúng đề xuất/revision, giữ cả trước/sau và actor quyết định. Không sửa loại/chặng/sequence, không xóa mốc, không giả actor gốc, không lùi trạng thái Trip. Có một yêu cầu pending mỗi mốc. Sửa ảnh hưởng kế hoạch, điều kiện chuyên môn hoặc bàn giao phải đi Flow 5/6; không dùng correction để vượt gate.

## 4. AIR và thông tin hãng

J13 xác nhận ngựa đã bàn giao thực tế cho đối tác ở sân bay đi; J15 xác nhận đã kiểm tra/tiếp nhận thực tế ở đầu đến. Địa điểm tiếp nhận thực tế quy ước là Kho hàng hóa động vật sân bay (Cargo Terminal / Animal Lounge). Danh sách phải đúng toàn bộ ngựa chuyến, không trùng/thiếu, đúng booking đang có hiệu lực, có bằng chứng và tham chiếu đối tác. Chỉ tổ được giao đúng đầu vận chuyển thực hiện. Bất thường được ghi nhận và liên kết Flow 5; không bắt người nhập khai bình thường mới ghi nhận tiếp nhận.

Coordinator dùng J14 ghi thông tin do đối tác cung cấp, không điều khiển chuyến bay hoặc tự nhận là hãng. ESTIMATED_SCHEDULE tách khỏi giờ thực tế, không complete milestone; actual departure/arrival chỉ ghi khi có bằng chứng, đúng thứ tự AIR và booking, timestamp không tương lai. Arrival không trước departure. Lịch đổi ảnh hưởng lịch chính thức/booking/ROAD sau bay đi qua Flow 5 và Manager; lưu notice trước, không sửa approved snapshot bằng notice.

AIR_HANDOVER/AIR_RECEIVED ghi outbox cho Manager, Customer và Coordinator sau transaction thành công; retry không nhân thông báo. Không hứa gửi email/SignalR thật đã hoạt động. Đến giờ bay theo lịch không tự ghi AIR_DEPARTED/AIR_ARRIVED. ROAD không có các tác vụ AIR, trả 409 TRIP_STATE_INVALID.

## 5. ETA, cảnh báo và sự cố

`currentEta` và `proposedEta` luôn riêng. J17/J18 tạo PENDING_COORDINATOR, không đổi ETA hiện hành. Mỗi Trip chỉ một proposal mở. Chỉ được đề xuất khi IN_TRANSIT; ETA >= serverTime và không trước mốc thực tế cuối. Nếu chậm do sự cố phải liên kết incident có thật; không dùng chỉnh ETA thay báo sự cố.

J20 APPROVE: trong phạm vi cho phép thì công bố ETA mới; vượt hạn giao, đổi route/chuyến bay hoặc ảnh hưởng lịch chính thức thì chuyển PENDING_MANAGER, giữ ETA cũ. Server tính `requiresManager`/`escalationReasons`; không nhận quyền override từ client. Coordinator REJECT kết thúc đề xuất và lưu lý do. J21 chỉ xét PENDING_MANAGER, recheck toàn bộ tác động: cần thay phương án thì phải có kết quả Flow 5 đã phê duyệt/áp dụng, đúng dependency trước cập nhật ETA. Manager duyệt ETA không tự gia hạn hợp đồng, thay lịch bay, phí khách hay nguồn lực. Quyết định phải có version, người và thời điểm; proposal đã quyết định không dùng lại. Lịch sử theo J19/J07.

Trễ mốc: job chỉ cảnh báo Driver phụ trách và Coordinator; không tự complete hoặc chuyển mọi cảnh báo cho Manager. Không phản hồi thì Coordinator liên hệ trực tiếp rồi ghi J29. Acknowledge không giải quyết mốc. Cảnh báo chỉ RESOLVED khi điều kiện nguồn đã được xử lý; không có nút bỏ qua gate. Job dedupe theo Trip/mốc/loại/policy và lần cảnh báo; retry outbox an toàn.

Ngưỡng trễ, tần suất health, số ảnh là policy máy chủ; chưa chốt thì null và configured=false. Không tự đặt 30 phút, 2 giờ hoặc một ảnh từ các giá trị minh họa trong schema. Checklist bắt buộc trong phương án vẫn áp dụng; trạm có cờ `requiresHealthCheck` chưa có log thì trả HEALTH_CHECK_REQUIRED, không coi 0/0 là đủ. Demo giả định mạng bình thường, không thêm đồng bộ offline.

Flow 5 là nguồn chung sự cố; contract này chỉ tham chiếu incidentId và blockers. Chăm sóc vẫn ghi được khi hành trình bị chặn. Hệ thống chưa hỗ trợ tích hợp sự cố phải công bố capability false; không coi thiếu dữ liệu incident là không có blocker.

## 6. Sức khỏe, bác sĩ và bản đồ

J23 ghi quan sát, ăn uống, nước, nghỉ, chăm sóc, chỉ số/ảnh theo checklist; từng ngựa thuộc chuyến/chặng. Các khoảng số trong schema là giới hạn nhập liệu kỹ thuật, không phải ngưỡng chẩn đoán y khoa. Thiếu đo trả null, không 0 hoặc số mặc định. ABNORMAL cần mô tả, lưu ngay kể cả chưa tạo incident; server trả incidentRequired=true và kích hoạt chốt chặn an toàn, khóa mốc tiếp theo và bàn giao AIR cho đến khi quy trình chuyên môn/Flow 5 đáp ứng. Đừng chặn việc ghi nhận dấu hiệu bất thường vì chưa có incidentId.

J25 chỉ bác sĩ đúng phân công/qualification ghi kết luận chuyên môn, transportFitness và hướng dẫn. FIT giải phóng gate chuyên môn sức khỏe nhưng không tự resume các blocker sự cố khác; NOT_FIT/NEEDS_REVIEW tiếp tục chặn phần liên quan và chuyển Flow 5 xử lý. Không để Driver thường tự đánh giá FIT. Mọi lần đánh giá append-only. Nhật ký nhập sai dùng J24 tạo bản thay thế có lý do/supersedesId, giữ gốc; replacement.expectedVersion phải khớp version ngoài. Không dùng amendment chăm sóc để sửa kết luận bác sĩ. Phần sửa kết luận chuyên môn là lần đánh giá mới của bác sĩ, không PATCH bản cũ.

Bản đồ đọc tuyến approved và mốc thực tế gần nhất đã xác nhận. Không GPS realtime, không nội suy marker di chuyển, không trộn báo cáo giao thông Flow 5 thành GPS. Nếu mốc cuối không có geo, markerGeo=null; label vẫn hiển thị mốc cuối. routePoints thể hiện geometry tham khảo của approved plan. ETA không tự suy từ vị trí giả. Báo cáo đường trên Flow 3 J53 vẫn là báo cáo Flow 5 gắn mốc, không thay tracking Flow 4.

## 7. Giao thức, dữ liệu và lỗi

Base `/api`; JSON header Authorization Bearer, Accept application/json, Content-Type application/json. GET không body; upload FormData không tự đặt Content-Type. Success `{success:true,message,data}`, list `data:[]`. Lỗi `{success:false,message,errorCode,data:null,blockers?,errors?}`. Binary thành công đúng MIME, lỗi vẫn JSON. Xem JSON cụ thể từng endpoint tại FLOW4-API-JSON.md; required/nullable/enum/giới hạn trong OpenAPI là chuẩn wire.

IDs Trip/Request/User/Horse/Vehicle/Incident tuân quy ước hiện hành. ID mốc/file/health/correction/ETA/expense là opaque key do server cấp; ví dụ MILESTONE_001/EXPENSE_001 không khẳng định có bảng hoặc prefix SQL tương ứng. Không tạo ID ở FE hoặc COUNT+1. ExecutionVersion là revision của aggregate vận hành, độc lập planVersion Flow 3 và revision Flow 6. Driver không tự tăng version. Binding trả approvedPlanVersion/assignmentVersion để đối chiếu dependency, không dùng executionVersion thay chúng.

Mutation JSON có expectedVersion (J30 upload độc lập không có), Idempotency-Key UUID bắt buộc. Khóa dedupe theo principal + key, fingerprint chứa method + path + body (upload gồm hash file và metadata). Cùng principal/key với body/path khác trả IDEMPOTENCY_CONFLICT; cùng request retry trả kết quả gốc kể cả version đã đổi, sau khi xác thực lại quyền. Backend kiểm dedupe trước stale-version của chính retry, giữ key gắn bền với transaction. Các lệnh cùng executionVersion cạnh tranh chỉ một commit. Health/ETA/correction/expense responses không nhất thiết có Binding; caller refetch J03 để lấy revision mới, không suy version từ ID.

Chi phí phát sinh trên đường (Petty Cash / Road Expenses): Hỗ trợ tổ xe ghi nhận các chi phí phát sinh thực tế (vé cầu đường BOT, thức ăn/nước uống bổ sung khẩn cấp, mua vật tư chăm sóc) kèm hóa đơn/biên lai ảnh chụp qua API `F4-J36 POST /driver/trips/{tripId}/expenses` và tra cứu qua `F4-J37 GET /trips/{tripId}/execution/expenses`. Chi phí phát sinh là dữ liệu ghi nhận hiện trường nội bộ, không tự ý sửa đổi cước phí hợp đồng với khách hàng, và sẽ được chuyển giao sang Flow 6 để kế toán duyệt quyết toán hoàn ứng (`TRIP_SETTLEMENT`).

Transaction ghi trạng thái, history và outbox cùng nhau; lỗi rollback, không thông báo trước commit. Sau đó worker phát thông báo có retry/dedupe. Timestamp `YYYY-MM-DD HH:mm` theo Asia/Ho_Chi_Minh, kiểm ngày lịch thực; persistence UTC. recordedAt/serverTime do server cấp. Tiền luôn nguyên VND; Flow 4 không có thao tác thu cước hay hoàn tiền khách hàng.

File thật <=10 MiB; JPEG/PNG cho health và expense receipts, PDF/JPEG/PNG cho bằng chứng khác. Kiểm MIME/nội dung/quét, purpose, owner Trip/horse, trạng thái file trước liên kết; không nhận object URL/base64 làm file đã lưu. File bất biến sau gắn, lưu lịch sử khi thay bằng revision mới. Download phải kiểm scope và visibility, Content-Disposition an toàn, Cache-Control private, no-store. Upload không thay executionVersion, không tự làm xong checklist.

| HTTP | Ý nghĩa |
|---|---|
| 200/201 | Đọc/cập nhật hoặc tạo sau lưu thành công |
| 400 | Sai schema, ngày/số/field không hợp lệ, trường actor/status ngoài contract |
| 401/403/404 | Chưa đăng nhập / sai role / ngoài scope hoặc không tồn tại |
| 409 | Sai trạng thái, thứ tự, dependency, revision, idempotency hoặc thiếu điều kiện nghiệp vụ |
| 413/415 | File quá lớn / loại nội dung không hỗ trợ |
| 429/500/501 | Rate limit / lỗi nội bộ / capability chưa hỗ trợ |

Không lộ SQL/stack trong lỗi, không chuyển 404/501 thành mock success. Mã trọng yếu: STALE_VERSION, IDEMPOTENCY_CONFLICT, DEPARTURE_NOT_APPROVED, READINESS_CHANGED, MILESTONE_NOT_NEXT, MILESTONE_ALREADY_COMPLETED, NOT_ASSIGNED_LEG, CHECKPOINT_NOT_CLEARED, INCIDENT_BLOCKING, CORRECTION_REQUIRES_INCIDENT, INVALID_EVENT_TIME, MANAGER_REVIEW_PENDING, CHANGE_PLAN_REQUIRED, INCIDENT_REQUIRED, HORSE_SET_MISMATCH, BOOKING_CHANGED, HEALTH_CHECK_REQUIRED, VETERINARIAN_REQUIRED, VET_CLEARANCE_REQUIRED, EVIDENCE_INVALID.

## 8. Tích hợp và chuyển đổi tài liệu cũ

| Nguồn/chức năng | Contract áp dụng |
|---|---|
| Duyệt cho khởi hành | Flow 3 J18, chỉ READY_TO_DEPART; tự động sinh mốc PENDING; Flow 4 J04/J05 kiểm và ghi xuất phát thực tế |
| Timeline và bản đồ nhân sự | F4-J03/J07/J11/J16/J19; Manager có J35 |
| Mốc và AIR | J05/J06/J13/J14/J15; chỉ người đúng chặng; kiểm requiresHealthCheck và vet clearance |
| Hồ sơ trước khởi hành | Flow 2/3; J12 chỉ ghi kết quả checkpoint thực tế |
| Theo dõi khách hiện có | Chuyển tracking/health callers sang J32–J34 khi tích hợp; chưa nối trong công việc này |
| Coordinator PUT `/coordinator/trips/{tripId}/eta` cũ | Chuyển J18/J20/J21; không cập nhật ETA trực tiếp bỏ duyệt |
| Coordinator POST `/coordinator/trips/{tripId}/milestones` cũ | Không ghi thay Driver; dùng J08–J10 đính chính, J14 nhập nguồn AIR |
| Chi phí phát sinh trên đường | F4-J36 ghi nhận, F4-J37 tra cứu; chuyển Flow 6 quyết toán hoàn ứng |
| F4-U01/U02 settlement/acceptance trong Operations cũ | Thuộc Flow 6 mới, không API theo dõi Flow 4; không dùng song song schema cũ |
| Sự cố, thay xe/người/booking khi đang chạy | Flow 5; giữ nguồn chung, chỉ blocker/incidentId ở Flow 4 |
| Đến điểm giao cuối | J06 FINAL_ARRIVED; bàn giao/chữ ký/nghiệm thu/thanh toán/nhả xe theo Flow 6 |

Khi triển khai, mutation cũ cho phép bypass trả 409 CONTRACT_SUPERSEDED; caller chuyển một lần sang schema mục tiêu. File OpenAPI role cũ chỉ là index lịch sử, không được dùng định nghĩa payload thay Flow 4. Không khẳng định các route cũ hiện đã trả lỗi này. Các cấu trúc revision/audit/outbox/file/clearance mới phải được backend review persistence/migration trước tích hợp; tài liệu không tự tạo bảng.

## 9. Kiểm tra contract và nghiệm thu triển khai

Chạy `python contracts/API-Flow/Flow4/build_contract.py` rồi `node contracts/API-Flow/Flow4/validate_contract.mjs` từ root repository. Generator cập nhật OpenAPI, JSON từng API cùng bảng danh mục và fixture; FLOW4.md giữ quy tắc viết tay. Validator kiểm reference, schema, mẫu request/response/lỗi, coverage và input âm.

`flow4.examples.json` là kịch bản nghiệm thu mục tiêu, không phải backend test đã chạy. Trước công bố capability cần integration: hai người ghi cùng mốc chỉ một commit; retry không trùng mốc/history/thông báo; stale readiness; quyền sai chặng/khác chủ/file; checkpoint giữ; AIR đúng thứ tự/bằng chứng; ETA không bỏ duyệt Manager; bác sĩ đúng qualification; chăm sóc vẫn ghi khi blocked; trạm requiresHealthCheck chặn mốc rời trạm nếu chưa có log; ngựa ABNORMAL chặn mốc tiếp theo cho đến khi FIT; chi phí phát sinh ghi nhận hợp lệ; correction không sửa bằng chứng đã ký; FINAL_ARRIVED chưa COMPLETED; rollback state/history/outbox. Không cần hoặc hứa GPS, gửi mail/điện thoại thật hay API hãng bay trong demo này.
