# API Contract — Flow 5: xử lý sự cố vận chuyển

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0.0 — 29/10/2026 |
| Phạm vi | Contract đích; chưa triển khai backend/DB, chưa tích hợp frontend |
| Đầu vào | Trip thật được kích hoạt/phân công; sự cố có thể phát sinh trong chuẩn bị, hành trình hoặc trước bàn giao |
| Kết quả | Phần bị ảnh hưởng đủ điều kiện tiếp tục; hoặc hướng kết thúc được thống nhất và chuyển hồ sơ nghĩa vụ cho hệ thống có thẩm quyền |
| Nguồn | Quyết định đã bàn trong bản tổng hợp 19/10/2026; Flow 3 v2, Flow 4 v1, Flow 6 hiện hành |

[JSON từng API](FLOW5-API-JSON.md) · [OpenAPI 3.1](flow5.openapi.json) · [Kịch bản](flow5.examples.json) · [Quy ước](../../CONVENTIONS.md).

Nguồn thảo luận: `work/SWP391_Tong_Hop_20261019_105540/02_TAI_LIEU_TONG_HOP/DECISION_LOG_MOI_NHAT.md`, `FLOW_01_DEN_06_MOI_NHAT.md`, phần Flow 5; baseline chi tiết tại `work/full-documentation-export/docs/flows/FLOW_04_05_06.md`. Các mô tả Flow 3/6 cũ trong những bản tổng hợp đó đã có contract riêng thay thế.

## 1. Quy trình và quyết định chuẩn

`Báo sự cố → Coordinator tiếp nhận/đánh giá tác động → giao việc song song → lập phương án khi cần → Manager duyệt phần cần thẩm quyền → ghi thực hiện/bằng chứng → áp dụng phương án → kiểm tra và cho tiếp tục đúng phạm vi → Coordinator đóng sự cố`.

Chuyến bình thường không bắt đi qua Flow 5. Có bốn nhóm demo: VEHICLE_RESOURCE (xe/người không thể tiếp tục), HORSE_HEALTH, DELAY_AIR (chậm/mất/hoãn/đổi chuyến), OTHER. Không bắt thêm nhóm thiếu giấy tờ trước khởi hành: Flow 2 phải phát hiện và chặn sớm. Nếu sự cố làm hồ sơ hoặc bảo hiểm không còn phù hợp thì Specialist xử lý đúng phần bị ảnh hưởng.

Ba trạng thái incident: **REPORTED → IN_PROGRESS → RESOLVED**. Chúng là nhãn công việc, không chứng minh được phép vận chuyển. Coordinator là đầu mối và người đóng incident theo nghiệp vụ đã bàn; thao tác Manager PUT status tùy ý trong Operations cũ được thay bằng command có điều kiện. Manager giữ quyền quyết định phương án tác động approved resources/lịch/booking/chi phí hoặc thỏa thuận khách.

Chăm sóc khẩn cấp diễn ra ngay, có thể ghi J08 dù chưa có plan/cost approval. Không biến việc chăm sóc thành quyền tiếp tục vận chuyển. Sự cố được ghi vào một aggregate dùng chung, không tạo bản riêng cho từng role. Khiếu nại/bồi thường sau bàn giao dùng Flow 6, chỉ liên kết incident để đối chiếu.

## 2. Quyền theo người và tài nguyên

| Role | Quyền |
|---|---|
| DRIVER_ESCORT | Báo hiện trường, bổ sung diễn biến/bằng chứng, thực hiện công việc được giao trong phạm vi chặng |
| DRIVER_ESCORT + VETERINARIAN | Bác sĩ được phân công và qualification hợp lệ ghi kết luận/khả năng tiếp tục; không tạo role VET mới |
| FLEET_ROUTE_COORDINATOR | Tiếp nhận, đánh giá, giao việc, lập phương án, xác nhận nguồn lực/đối tác, áp dụng và cho tiếp tục đúng điều kiện, đóng incident |
| TRANSPORT_SPECIALIST | Hồ sơ/bảo hiểm bị ảnh hưởng, kiểm tra applicability và bằng chứng đúng phương án |
| LOGISTICS_MANAGER | Duyệt phương án cần quyết định, đầu mối thông báo/thỏa thuận khách, thương lượng kết thúc khi không thể tiếp tục |
| CUSTOMER | Xem thông tin sự cố đã chia sẻ trong đơn của mình, phản hồi đúng đề nghị lịch/hướng xử lý; không tự đổi lịch/địa chỉ giao hoặc điều phối |

JWT quyết định actor/role; server kiểm Trip/Request/incident, mốc, ngựa, task, file và booking trong path/body. Manager trong scope quản lý, nhân sự theo assignment hoặc task được ủy quyền. Giao task không đồng nghĩa chuyển assignment vận chuyển: nhân sự thay thế chỉ được ghi mốc sau khi thực hiện và áp dụng phân công hợp lệ. Người chỉ có task không được xem toàn bộ ghi chú ngoài nhiệm vụ. Sai role 403, tài nguyên ngoài scope 404, có quyền xem Trip nhưng sai chặng/tác vụ thì 409 cụ thể.

Customer dùng PublicIncident/PublicContext, không IncidentDetail. Các trường customerSummary/customerImpact lấy từ thông báo chính thức của Manager J31 và kết quả công bố, không sao chép mô tả kỹ thuật nội bộ. File mặc định INTERNAL, J42 chỉ Manager chia sẻ sau kiểm nội dung; thông báo/thỏa thuận chỉ đính file đã CUSTOMER. Public termination proposal chỉ chứa nội dung đã gửi khách, không chi phí nội bộ. Phản hồi khách có actor và thời điểm thật; không có checkbox nhân sự tự đánh dấu khách đã chấp thuận.

## 3. Báo sự cố, đánh giá và blocker

J03 gắn Trip/chặng/ngựa/mốc hiện hành; expectedExecutionVersion là revision Flow 4 đã đọc, không incidentVersion của sự cố chưa tạo. Khi stale phải tải lại và báo trên scope hiện hành, không tự đổi version để retry lệnh khác. Các quan sát đã soạn giữ trên UI; chăm sóc thực tế không chờ API báo thành công. Ngựa/mốc rỗng trong scope có nghĩa toàn chặng được nêu, không có nghĩa không ảnh hưởng. Category/description/occurredAt bắt buộc; ảnh được bổ sung sau để không cản ghi nhận ban đầu. Có thể upload bằng Trip trước rồi gắn file khi báo.

Ngay khi REPORTED, server đặt safety blocker cho phạm vi chưa xác minh; không chờ Coordinator bấm nhận. Nếu chưa thể xác định chính xác thì chặn chặng liên quan và ghi lý do, không khóa ngầm toàn bộ hoạt động chăm sóc. Không nhận boolean an toàn/tripStatus/actor từ client. Ngày sự kiện không tương lai, không trước phạm vi Trip tương ứng; recordedAt/reportedAt do server cấp.

Assessment có đủ tám area, mỗi area đúng một lần: RESOURCES, SCHEDULE, BOOKING, DOCUMENTS, INSURANCE, HEALTH, DELIVERY_DEADLINE, INTERNAL_COST. Mỗi mục AFFECTED/NOT_AFFECTED/UNASSESSED kèm lý do và scope cụ thể; UNASSESSED giữ gate liên quan. Coordinator không được dùng NOT_AFFECTED để phủ nhận NOT_FIT hoặc kết quả pháp lý BLOCKED của chuyên môn. Thay assessment làm mất hiệu lực các review/proposal phụ thuộc đã đổi; giữ các kết quả vẫn đúng.

Tasks có thể chạy song song theo đúng trách nhiệm. DONE cần kết quả/bằng chứng checklist nhưng không thay thế review chuyên môn, resource confirmation, booking hoặc Manager approval. Diễn biến/care/assessment/decision append-only hoặc có revision và lịch sử trước/sau; không có DELETE incident/history để xóa sai sót.

## 4. Phương án khôi phục và nguồn lực

Recovery có vòng đời `DRAFT → PENDING_APPROVAL → APPROVED → APPLIED`, nhánh RETURNED để sửa, SUPERSEDED khi có bản thay thế. J43 rút PENDING_APPROVAL về DRAFT, giải phóng đúng hold draft. Approved snapshot không sửa đè; J18 tạo revision mới và giữ bản cũ. Một bản đang chờ duyệt phải rút trước khi tạo bản thay. Phương án đang APPLIED có thay đổi tiếp phải mở revision mới, không sửa bằng một external-action mới.

Draft lưu baseApprovedPlanVersion, baseExecutionVersion, baseAssignmentVersion; không đồng nhất chúng với incidentVersion/recoveryVersion. Chỉ đưa vào các thay đổi cần thiết: resources từng ROAD, lịch các mốc tương lai, đề xuất flight/ETA, chi phí nội bộ, chăm sóc và bằng chứng. Không đổi điểm giao/hợp đồng đã ký. `customerAdditionalChargeVnd` luôn 0: **khách không trả thêm chi phí sự cố**. Nội bộ ghi đúng VND và Manager duyệt theo trách nhiệm, không cộng vào invoice khách.

J15 validate read-only không hold. J16 submit kiểm baseline, capacity, qualification, quốc gia, đường phù hợp tải trọng/kích thước, access, lịch khả dụng và care/rest theo Flow 3; giữ nguồn lực thay thế nguyên tử toàn hệ thống. Một xe/người không cùng hai Trip active; AIR vẫn hai ROAD độc lập. Nguồn lực đang giữ cho chính Trip có thể giữ lại đúng assignment, không coi là xung đột với chính mình. Không nhả xe/người cũ trước khi xác nhận chuyển giao và áp dụng phương án. RETURN/withdraw chỉ nhả hold draft, không hủy approved assignment/booking.

Server tính requiresManager, không tin cờ client. Thay approved vehicle/crew, lịch chính thức/tuyến/flight, chi phí nội bộ hoặc thỏa thuận khách đều cần Manager. Chỉ chăm sóc/khắc phục trong approved plan và không tác động các mục đó mới có thể auto APPROVED; history actor SYSTEM, không ghi Manager giả. J17 duyệt đúng toàn bộ snapshot/version, không chỉ ngân sách. Approved chưa phải thực hiện, booking hoặc quyền tiếp tục.

## 5. Hồ sơ, sức khỏe và AIR

Không làm lại toàn bộ Flow 2/3. Flow 3 giả định giấy còn hiệu lực suốt chuyến, nên không tự yêu cầu mọi giấy gia hạn vì lịch thay đổi. Specialist vẫn đánh giá applicability nếu thay điều kiện/tuyến/booking thực sự ảnh hưởng, bảo hiểm phải bao phủ hoạt động thực tế. Mỗi review gắn recoveryVersion, nguồn hồ sơ/bảo hiểm và dependency hiện hành; còn hạn không tự chứng minh phù hợp điều kiện mới. SATISFIED phải có nguồn/bằng chứng, NOT_AFFECTED có lý do. Thiếu cấu hình hoặc 0/0 không tự đạt.

Bác sĩ được giao, qualification hợp lệ dùng J22; cùng nguồn chuyên môn với Flow 4 J25, không hai bản kết luận khác nhau. Hệ thống ghi một assessment rồi liên kết health/incident, kiểm recovery dependency khi xác nhận. NOT_FIT/NEEDS_REVIEW chặn phần vận chuyển liên quan; FIT chỉ giải quyết gate sức khỏe. Nhân sự vẫn chăm sóc và ghi nhật ký khi bị chặn. Không thêm ngưỡng chẩn đoán y khoa vào contract.

AIR: Coordinator phối hợp lịch khả thi và compliance precheck với Specialist trước khi xác nhận booking thay thế. J23 PARTNER_CONTACT chỉ tiến độ; OLD_BOOKING_CANCELLED ghi kết quả đối tác đã xác nhận, không tự gọi hãng/hủy dịch vụ. NEW_BOOKING_CONFIRMED chỉ sau Manager approval đúng snapshot, precheck khả thi và booking cũ đã xử lý nếu bị ảnh hưởng. Loại action quyết định field bắt buộc: booking cũ cần bookingId; confirm mới lấy partner/service từ recovery đã duyệt, reference là mã đối tác, server cấp bookingId thật; resource confirm cần đúng leg và toàn bộ bộ xe/người trong recovery. Không dùng reference contact làm booking.

Reference booking được trim/case-fold và unique theo đối tác trên toàn hệ thống như Flow 3; không duplicate booking bằng key mới. Giữ bằng chứng hủy/thay, không overwrite BOOKED. Giữ booking cũ chỉ khi server/Specialist xác minh không ảnh hưởng. Lịch bay dự kiến và actual event vẫn do Flow 4 ghi nguồn thực; recovery không tạo AIR_DEPARTED/AIR_ARRIVED. Tích hợp hãng chưa có thì ghi nghiệp vụ đã làm ngoài hệ thống cùng file/reference, không mô tả phần mềm tự thực hiện.

## 6. Áp dụng, tiếp tục và đóng sự cố

J25 trả riêng canApplyRecovery, canContinue, canResolve cùng checks/blockers/readinessVersion. Token phụ thuộc dữ liệu hiện hành của toàn Trip, nhiều incident, qualification, nguồn lực, hồ sơ/bảo hiểm, booking, agreement và thời gian; không chỉ số revision nội dung. GET không bảo đảm POST sẽ đạt. J24/J26 recheck dưới transaction, thiếu dependency trả READINESS_CHANGED với blocker cụ thể.

J24 chỉ áp dụng recovery APPROVED đã có mọi confirmation liên quan và agreement khách cần thiết. Atomic: approved operational revision mới cho **phần tương lai**, execution mapping mốc tương lai, assignment swap, resource hold conversion, history/outbox. Giữ mốc đã hoàn tất/actor/time và liên kết snapshot gốc; không sửa hợp đồng/địa chỉ giao hoặc hoàn thành mốc. Review nào dependency vẫn đúng được rebind với provenance; đổi nội dung ảnh hưởng thì invalidated và chặn cho đến review mới. Baseline/review của incident khác trong Trip cũng phải recheck, không bỏ qua vì thuộc incident khác.

J26 chỉ gỡ blocker của incident hiện tại ở scope đã đủ; còn incident khác thì vẫn chặn. Không đổi Trip thành ON_HOLD hoặc tự IN_TRANSIT/DEPARTED/COMPLETED: Driver tiếp tục ghi Flow 4 đúng mốc. Với incident trước xuất phát, J26 không thay Manager duyệt khởi hành Flow 3 và Driver xuất phát Flow 4. Với incident sau FINAL_ARRIVED chưa bàn giao, chỉ cho tiếp tục bàn giao khi gate tương ứng đạt. Chăm sóc không bị chặn bởi nút continue.

Coordinator J27 đóng incident khi không còn công việc/gate bắt buộc chưa xử lý và đã có kết quả rõ. RECOVERED đòi scope đã được xác nhận tiếp tục nếu cần; TERMINATION_REFERRED chỉ khi hồ sơ kết thúc được bên xử lý nghĩa vụ thực sự tiếp nhận và trách nhiệm chăm sóc/custody đã rõ. Đóng incident không hoàn tất Trip, không đóng Request/Contract và không xác nhận tiền đã hoàn. J28 mở lại có lý do, giữ history; không tự mở Trip/Request đã bàn giao/đóng, khi đó xử lý Flow 6.

## 7. Customer, lịch thay đổi và không thể tiếp tục

Manager là đầu mối truyền đạt/thống nhất thay đổi với Customer. J31 NOTICE chỉ thông báo; AGREEMENT_REQUEST là đề nghị bất biến gắn đúng recoveryVersion/messageVersion. Server yêu cầu thỏa thuận khi thay cam kết/hạn giao hoặc hướng xử lý cần khách đồng ý. Khách J32 ACCEPT/REJECT đúng nội dung; im lặng không đồng ý, nhận thông báo không chấp thuận. Đổi nội dung phải tạo đề nghị mới và vô hiệu proposal cũ, không tái sử dụng consent. J33 ghi thỏa thuận ngoài hệ thống chỉ có reference và bằng chứng được xác minh; actor vẫn Manager, nguồn EXTERNAL_DOCUMENT, không giả khách bấm chấp nhận.

ETA thay đổi đi theo Flow 4 J17–J21; recovery approved/applied là căn cứ của ETA Manager decision, không tự sửa giờ bằng ghi chú incident. Server liên kết ETA proposal với recoveryVersion và kiểm scope/deadline. Customer không tự sửa giờ mong muốn hoặc địa chỉ giao để thay approved plan.

Nếu không thể tiếp tục: Manager J37 đề xuất hướng kết thúc, trách nhiệm chăm sóc/custody, khoản hoàn thương lượng và căn cứ; không tự đặt công thức hoàn theo phần đường còn lại. Khoản hoàn đề xuất phải dựa tiền đã xác minh/ledger thật, không vượt khoản có thể hoàn chưa thực trả; bồi thường nếu có cần quyết định tài chính riêng. J38 ghi khách phản hồi; đồng ý chưa phải đã bàn giao, nghiệm thu hoặc tiền đã chuyển. Không tự cho ngựa quay về, đổi nơi giao hoặc giao người khác.

J39 chuyển hồ sơ được đồng ý với bằng chứng custody sang workflow xử lý nghĩa vụ phù hợp. Nếu incident trước bàn giao và cần kết thúc sớm, **Flow 6 bình thường hiện yêu cầu bàn giao hợp lệ nên không dùng biên bản giả để vượt gate**. Cần extension pre-handover settlement có thật; capability terminationSettlementAvailable=false cho đến khi extension được triển khai. Khi chưa có, J39 trả 501 và giữ hồ sơ/blocker mở. Khi có, J39 trả REFERRED và settlementCaseId do server bên nhận cấp một lần; financiallySettled vẫn false tới xác minh ledger. Flow 5 hoàn tất việc chuyển trách nhiệm, không tự thay quy tắc đóng/thu/hoàn tiền của Flow 6 hoặc tạo trạng thái Trip kết thúc sớm chưa hỗ trợ. Đây là ranh giới tích hợp được chỉ rõ, không giả định đã có API hoàn tiền trước bàn giao.

## 8. Giao thức, phiên bản và file

Base `/api`, Bearer JWT. JSON: Authorization, Accept application/json, Content-Type application/json. GET không body. Success `{success:true,message,data}`; list data array. Error `{success:false,message,errorCode,data:null,blockers?,errors?}`. Binary thành công đúng MIME, lỗi JSON. 200/201 đọc/cập nhật/tạo, 400 validation, 401/403/404 auth/role/scope, 409 nghiệp vụ/revision, 413/415 file, 429 rate, 500 nội bộ, 501 capability chưa hỗ trợ. Không lộ SQL/stack hoặc fallback mock success.

Mã nghiệp vụ chính: BASELINE_CHANGED, RESOURCE_CONFLICT, INVALID_CREW, RECOVERY_NOT_APPROVED, OLD_BOOKING_ACTIVE, READINESS_CHANGED, VET_CLEARANCE_REQUIRED, COMPLIANCE_REVIEW_REQUIRED, CUSTOMER_AGREEMENT_REQUIRED, OTHER_INCIDENT_BLOCKING, SETTLEMENT_HANDOFF_REQUIRED, AFTERCARE_REQUIRED. Blocker phải chỉ rõ phần và người xử lý, không trả một cờ lỗi chung rồi tự mở lại mốc.

Trip/Request/User/Horse/Vehicle/Incident ID theo quy ước hiện hành. Task/recovery/message/file/history/settlement key mới là opaque ID server cấp; ví dụ không khẳng định có bảng SQL tương ứng. IncidentVersion, recoveryVersion và execution/plan/assignment version độc lập. Commands JSON có expectedVersion là incidentVersion vừa đọc, trừ J03 expectedExecutionVersion khi incident chưa tồn tại; upload J34 độc lập không tăng incidentVersion. Response không có Binding thì refetch J04/J30, không tự cộng version. Recovery.version do server tăng mỗi thay đổi draft/status; phải dùng revision mới khi quyết định/áp dụng.

Mọi mutation cần Idempotency-Key UUID, J15 validate read-only không cần. Dedupe theo principal+key, fingerprint method/path/body (upload gồm hash file/metadata). Cùng key/body replay kết quả gốc sau kiểm quyền và trước stale check; key khác body/path trả IDEMPOTENCY_CONFLICT. Unique ở nguồn booking/resource/adjustment ngăn tạo trùng cả khi key mới. State/history/outbox cùng transaction; apply/review/continue cùng aggregate lock hoặc optimistic boundary tương đương, rollback không để assignment chuyển nửa chừng. Không giả rollback sự kiện đối tác ngoài hệ thống; cần quy trình bù nếu booking thật đã thay.

Timestamp `YYYY-MM-DD HH:mm` theo Asia/Ho_Chi_Minh; BE kiểm ngày lịch thật, thứ tự và server now, persistence UTC. Money nguyên đồng VND. Notification có outbox/dedupe, không gửi trước commit; không hứa email/điện thoại/hãng bay thật đã chạy. Giả định demo mạng bình thường, không thêm offline sync.

J34 upload file thật PDF/JPEG/PNG <=10 MiB, HEALTH chỉ JPEG/PNG; kiểm nội dung/MIME/quét/scope trước liên kết. Chỉ Trip assignment thật mới upload trước báo; sau J03 chỉ file cùng Trip phù hợp purpose được gắn. Files bất biến, sai thì thêm record thay thế có lý do. Không object URL/base64 giả. Download có auth, visibility, Content-Disposition an toàn, Cache-Control private, no-store. Không coi upload thành hoàn thành công việc. Public file chỉ sau Manager kiểm và chia sẻ J42.

## 9. Chuyển từ Operations và điểm nối

| Cũ hoặc nguồn liên quan | Chuẩn hiện hành |
|---|---|
| Role GET/POST incidents và GET detail cũ | F5-J02–J05 dùng chung schema, kiểm x-roles/assignment; role route cũ phải adapter cùng aggregate hoặc retired |
| Specialist/Coordinator POST plans cũ | Task/review và recovery F5-J10–J24; Specialist không tự duyệt phương án nguồn lực |
| Manager PUT incident status | Retired, 409 CONTRACT_SUPERSEDED khi triển khai; Coordinator J06/J27/J28 có guard |
| Flow 3 draft sau READY_TO_DEPART | Không tự unlock; thay đổi đang chạy qua recovery và apply Flow 5 |
| Flow 4 health/ETA/checkpoint | Cùng nguồn assessment/incident, Flow 5 không hoàn tất mốc hoặc tự sửa ETA |
| Manager/customer complaints, compensation, settlement cũ trong Operations | Flow 6 hiện hành; không chạy workflow khiếu nại/tiền thứ hai trong Flow 5 |
| Kết thúc sớm chưa bàn giao | J37–J39 ghi thỏa thuận và handoff có capability; extension tài chính phải có thật trước công bố hỗ trợ |

Contract này thay định nghĩa incident mục tiêu trong Operations cũ; chưa khẳng định backend hiện đã retired route hoặc lưu được DTO mới. Cần review persistence cho revision, shared locks, holds, proof, audit/outbox và financial handoff trước tích hợp. Không sửa DB/backend trong công việc soạn contract.

## 10. Kiểm tra và nghiệm thu

Chạy `python contracts/API-Flow/Flow5/build_contract.py` rồi `node contracts/API-Flow/Flow5/validate_contract.mjs`. Generator tạo OpenAPI, JSON từng API và fixture ROAD/AIR; FLOW5.md giữ quy tắc viết tay. Validator kiểm refs/schema/mẫu/request/response/lỗi, coverage và input âm; không thực thi backend.

`flow5.examples.json` có các kịch bản mục tiêu: xe hỏng thay xe kịp bay, AIR hoãn kéo theo inbound, ngựa NOT_FIT, nhiều incident chặn cùng scope, stale readiness, duplicate booking/hold, khách từ chối lịch mới, không thể tiếp tục và capability handoff chưa có. Trước công bố API AVAILABLE cần integration test concurrency, scope/file, rollback state/history/outbox, emergency care trước approval, chỉ recheck phần bị ảnh hưởng và không thu thêm khách. Không dùng việc schema valid làm bằng chứng các quy tắc server đã triển khai.
