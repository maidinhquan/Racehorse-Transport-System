# API Contract — Flow 3: đánh giá khả thi, lập phương án và duyệt khởi hành

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.0 — flow sửa theo yêu cầu ngày 24/10/2026 |
| Đầu vào | Request ACTIVATED, Contract EFFECTIVE, Trip PLANNING, deployment CONFIRMED; Manager đã giao Specialist/Coordinator và hạn giao thống nhất với khách từ Flow 1 |
| Kết thúc | Manager duyệt khởi hành riêng: Trip READY_TO_DEPART, Request SCHEDULED |
| Phạm vi | Thiết kế API contract, chưa triển khai frontend/backend/DB/migration |
| Nguồn ưu tiên | Trình tự mới trong ảnh người dùng ngày 24/10/2026; frontend chỉ làm nguồn đối chiếu màn hình và trường dữ liệu |

[JSON từng API](FLOW3-API-JSON.md) · [OpenAPI 3.1](flow3.openapi.json) · [Kịch bản ROAD/AIR và nhánh lỗi](flow3.examples.json) · [Quy ước](../../CONVENTIONS.md).

## 1. Trình tự mới

1. **Manager giao thông tin chuyến và hạn giao đã thống nhất với khách.** Đọc snapshot hợp đồng, danh sách ngựa, tuyến/phương thức và phân công từ Flow 1. Coordinator không tự đổi hạn giao.
2. **Specialist kiểm tra hồ sơ và công bố đánh giá khả thi.** Ghi ngày/giờ sớm nhất dự kiến đủ điều kiện, hiệu lực từng giấy tờ tại nơi cần sử dụng và những mục còn thiếu hoặc cần lịch/chuyến bay chính thức để hoàn thiện. Đây là dự kiến có điều kiện, chưa phải Docs READY.
3. **Coordinator lập phương án trong khoảng khả thi.** Tuyến, xe, ba vị trí nhân sự mỗi ROAD, chuyến bay và thời gian giao phải đồng thời phù hợp hồ sơ và hạn giao khách. Lưu nháp không giữ nguồn lực; gửi duyệt mới kiểm tra lại và giữ tạm.
4. **Manager duyệt phương án hoặc trả lại có lý do.** Duyệt đúng phiên bản phương án, đánh giá Specialist và deadline snapshot. AIR duyệt luôn đề xuất dịch vụ/ngân sách nằm trong bản này. Chưa yêu cầu booking, Docs READY hoặc Ops READY ở mốc này.
5. **Sau duyệt**, Specialist hoàn thiện các mục phụ thuộc lịch chính thức; Coordinator xác nhận booking và khả dụng thực tế của nguồn lực theo phương án được duyệt.
6. **Hai bên xác nhận READY cùng phương án.** Specialist xác nhận Docs READY, Coordinator xác nhận Ops READY. Backend kiểm tra lại; Manager thực hiện phê duyệt khởi hành riêng. Driver xác nhận khởi hành thực tế ở Flow 4.

Specialist có thể chuẩn bị giấy tờ không phụ thuộc lịch từ sớm. Coordinator có thể xem danh mục trước, nhưng không lưu/gửi phương án chính thức khi chưa có đánh giá khả thi hợp lệ. Không bắt Specialist hoàn tất mục cần lịch/chuyến bay trước khi Coordinator được lập phương án.

## 2. Ranh giới với Flow 2 và chuyển đổi endpoint

Flow 2 tiếp tục quản lý hồ sơ khách, chứng từ CBN và phiên bản/file/review, bộ yêu cầu, bảo hiểm, lịch kiểm dịch, yêu cầu bổ sung. **Flow 3 này là nguồn chuẩn mới cho thứ tự chuẩn bị và điều phối tới duyệt khởi hành.** Những phần trùng trong bản Flow 2 ngày 24/10 trước thay đổi được đánh dấu superseded; không triển khai song song hai quy trình.

| Contract cũ | Contract Flow 3 |
|---|---|
| F2-J28 docs-ready | F3-J16, cùng method/path, payload mới gắn phương án và feasibility |
| F2-J35–J38: trips/vehicles/staff/checkpoints | Tiếp tục dùng cho danh sách/danh mục; không dùng mock thay dữ liệu thật |
| F2-J39 chi tiết chuyến | Giữ projection cơ bản; lấy trạng thái chuẩn bị và phiên bản mới qua F3-J02/J04/J10 |
| F2-J40 route-draft + J42 resources + J44 flight proposal | F3-J06 plan-draft: lưu một bộ tuyến/lịch/xe/nhân sự/đề xuất AIR nhất quán |
| F2-J41 submit, J46 reopen, J49 route decision | F3-J08 gửi, J09 rút, J11 quyết định, J12 đề xuất thay phương án đã duyệt |
| F2-J43 resources confirm, J45 booking | F3-J14, F3-J13, cùng method/path nhưng kiểm tra bản đã duyệt; Ops READY riêng F3-J15 |
| F2-J47 preparation, J48 readiness, J51 departure | F3-J10, J17, J18 cùng method/path, dùng schema Flow 3 |
| F2-J50 flight decision | Không quyết định riêng để vượt duyệt phương án; ngân sách nằm trong F3-J11 |

Đây là thay đổi contract trước tích hợp, chưa khẳng định caller cũ tương thích. Khi tích hợp, đổi capability và caller cùng đợt; gọi mutation cũ đã thay thế trả 409 CONTRACT_SUPERSEDED, không chạy workflow cũ. Những path được giữ dùng schema Flow 3 khi deployment đã chuyển sang contract này. Không thêm prefix `/flow3` cho API nghiệp vụ; endpoint capability là metadata.

## 3. Khoảng khả thi và hiệu lực tại điểm dùng

`earliestReadyAt` là dự kiến sớm nhất đủ điều kiện xuất phát. `constraints` liệt kê từng yêu cầu giấy tờ có phạm vi ngựa/chuyến, hiệu lực và mốc cần dùng. `dependencies` ghi mục cần lịch chính thức/chuyến bay, ai hoàn thiện và điều kiện để hoàn thiện. `planningAllowed` do backend tính, không phải boolean Specialist tự bật.

- Thiếu bộ yêu cầu, thiếu ngày hiệu lực bắt buộc, chưa đánh giá một điều kiện, không biết ngày có thể hoàn thiện, hoặc chưa đủ dữ liệu đối chiếu: planningAllowed=false và có blockers. Không coi constraints rỗng là hợp lệ nếu chưa chứng minh tuyến không có yêu cầu thời hạn.
- `constraints`/`dependencies` là kết quả rà soát theo requirement snapshot, không thay thế checklist Flow 2. Backend đối chiếu đủ các mục; không nhận danh sách bỏ bớt để qua kiểm tra. Dòng ngày tháng dựa trên tài liệu đã kiểm tra hoặc dự kiến có ghi chú, không phải trích luật pháp.
- `useAt` là DEPARTURE, ARRIVAL, CHECKPOINT, FLIGHT_DEPARTURE hoặc FLIGHT_ARRIVAL. CHECKPOINT bắt buộc checkpointId; backend gắn tới mốc cụ thể trong stops; bỏ mốc để né kiểm tra bị từ chối. Mỗi địa điểm trung gian chỉ xuất hiện một lần trong demo để tránh ánh xạ mơ hồ.
- Hiệu lực so với **thời điểm sử dụng dự kiến**: `validFrom <= useTime <= validUntil`. Nếu giấy ghi ngày hết hạn, Specialist ghi biên thời gian đúng quy định áp dụng; không tự giả định mọi giấy có hiệu lực tới 23:59. Bao phủ tới ETA chỉ bắt buộc với tài liệu cần bao phủ toàn hành trình và bảo hiểm; không thay thế kiểm tra riêng tại từng điểm dùng.
- `mustCoverWholeTrip=true` đòi từ lúc nhận/vận chuyển ngựa đến lúc giao; trong contract này nhận ngựa để vận chuyển là plannedDepart. Nếu có nhận sớm hơn phải có mốc nhận thật và bổ sung contract trước tích hợp, không bỏ trống phần thời gian đó.
- `schedule-dependent` có thể còn thiếu file trước duyệt phương án, nhưng phải có đường hoàn thiện khả thi. Sau duyệt phải có bằng chứng và được Specialist kiểm duyệt trước Docs READY; thông quan thực tế ở tương lai vẫn thuộc Flow 4.
- Khi submit và khi Manager duyệt, BE yêu cầu `plannedDepart >= earliestReadyAt`, `eta <= deliveryDeadline` và đủ thời gian còn lại để hoàn thiện từng dependency trước khởi hành. `expectedLeadMinutes` là thời lượng dự kiến Specialist cung cấp, tính từ giờ máy chủ lúc xét duyệt; kiểm tra lại sau khi thời gian trôi qua. Các dependency độc lập có thể làm song song; nếu thực tế phụ thuộc nối tiếp mà chưa biểu diễn được thì chặn với DEPENDENCY_UNRESOLVED, không cộng/loại bỏ thời gian tùy ý. Trường completionRule chỉ giải thích cho người đọc, không dùng văn bản đó thay kiểm tra số liệu.
- Không có khoảng khả thi đáp ứng hạn giao: chặn submit/approve. Manager thống nhất lại với khách bằng quy trình Flow 1 rồi giao snapshot mới; nhập một lý do không đủ quyền vượt hạn giao hoặc giấy hết hạn.

Ví dụ minh họa: dự kiến sẵn sàng từ **25/10/2026 08:00**, giấy cần dùng trước **30/10/2026 18:00**. Xuất phát 29/10 nhưng qua điểm kiểm tra 31/10 vẫn **không hợp lệ**, dù giao trước hạn khách 02/11. Bộ [examples](flow3.examples.json) có nhánh này và trường hợp đúng vào biên hiệu lực. Các ngày chỉ là dữ liệu demo.

Thời gian API `YYYY-MM-DD HH:mm`, múi giờ Asia/Ho_Chi_Minh cho cả hai nước; chuyển giờ sân bay về cùng múi giờ trước so sánh. Backend chuyển UTC khi lưu. Định dạng không thay thế kiểm tra ngày lịch thật. Tiền nguyên VND; flight catalog demo phải cung cấp giá VND, không đổi USD bằng đổi nhãn.

## 4. Phiên bản, nguồn lực và chuyến bay

`contextVersion` do BE tăng khi snapshot Flow 1 hoặc phân công thay đổi. `feasibilityVersion` tăng khi Specialist đánh giá lại; gắn `contextVersion` và `documentSetVersion`. `planVersion` là revision nghiệp vụ đơn điệu trong một Trip, gồm cả tuyến, lịch, nguồn lực và đề xuất bay. Lưu nháp, gửi, rút, quyết định đều trả revision mới; luôn dùng bản vừa đọc. Không tự tăng phiên bản ở frontend, không suy từ số dòng hoặc tạo bảng mới chỉ vì DTO có version.

`draft` và `approvedPlan` tách nhau. Sau duyệt, tạo draft thay đổi qua J12, giữ bản đã duyệt cho tới khi bản thay thế được chấp nhận. Trong lúc còn draft thay đổi hoặc bản mới chờ duyệt, chặn khởi hành để tránh dùng bản cũ trong khi đang xử lý thay đổi. Rút/trả về bản thay thế chỉ giải phóng giữ tạm của bản đó; bản approved cũ và phân công cũ còn nguyên. Có thể hủy draft thay đổi bằng J09 (WITHDRAWN), khi đó dùng bản approved cũ nếu mọi bằng chứng còn hợp lệ.

| Thao tác | Trạng thái/bằng chứng | Giữ nguồn lực |
|---|---|---|
| Lưu nháp | DRAFT, cho phép thiếu trường; submit đòi đủ | Không giữ |
| Submit | PENDING_APPROVAL, khóa chỉnh sửa; chưa cần READY/booking | Kiểm tra toàn hệ thống, giữ tạm nguyên tử; xung đột rollback toàn bộ |
| Manager trả lại | RETURNED; reason >=5 ký tự | Giải phóng giữ tạm của bản bị trả |
| Rút nháp/đang chờ/trả lại | WITHDRAWN | Giải phóng giữ tạm của bản đó |
| Manager duyệt | APPROVED, lưu snapshot feasibility/context và ngân sách AIR | Chuyển giữ tạm thành CONFIRMED; thay bản cũ nguyên tử |
| Thay bản approved | Bản cũ SUPERSEDED chỉ khi bản mới APPROVED | Chuyển/đổi giữ lịch nguyên tử, không giải phóng phần cần giữ trước khi có thay thế |

Không tự hết hạn giữ tạm khi chưa có policy. Cùng một người/xe không phục vụ hai Trip active theo hạn chế demo hiện tại; BE kiểm tra mọi chuyến, kể cả không hiện trong danh sách role. Ba slot MAIN_DRIVER/CO_DRIVER/VETERINARIAN độc lập, không dùng lại giữa hai ROAD của AIR. Thời gian phân công vẫn lưu theo chặng để kiểm tra bằng cấp, bàn giao và khả dụng. Không diễn giải EscortID duy nhất thành đủ hai vị trí.

ROAD có một leg `road`; AIR có `outbound` và `inbound`, nối ROAD_ORIGIN → AIR → ROAD_DESTINATION. Mỗi ROAD có xe đủ sức chứa và đủ ba người phù hợp quốc gia/chuyên môn; bằng/chứng chỉ bao phủ chặng. Quốc gia/sân bay theo snapshot Trip và catalog, không hardcode VN/JP trong component. Bộ đệm bàn giao trước/sau bay và thời gian nghỉ lấy capability; thiếu cấu hình thì chặn submit, không tự gán phút.

AIR chọn từ catalog demo có provider, số hiệu, sân bay, lịch, sức chứa, giá VND, dịch vụ trọn gói. Chỉ bay thẳng, không bố trí bác sĩ CBN trên máy bay. Chọn chuyến không phải booking, không gọi API hãng thật. Catalog change làm proposal stale, phải refetch và duyệt đúng bản. Phương án chứa catalog flight reference, backend chụp lịch/giá version khi lưu, không tin tên/giá do client nhập.

Sau duyệt, J13 ghi mã xác nhận đối tác/demo kèm nguồn DEMO hoặc PARTNER_REFERENCE. DEMO chỉ khi capability cho phép, vẫn phải có chứng cứ demo được server lưu và phân biệt với booking thực. Không tự sinh booking giả trong production. Retry không tạo booking trùng; FlightBookingID vẫn INT. Thay phương án không được ghi đè booking đã xác nhận: J20 ghi nhận hủy bên ngoài/demo, lưu lịch sử. Còn booking cũ chưa hủy thì chặn duyệt bản thay thế có đổi flight/lịch/horse; thay đổi không ảnh hưởng booking có thể giữ cùng bookingId sau khi BE xác minh phạm vi tương đương.

## 5. READY và duyệt khởi hành

Sau APPROVED: Coordinator J13 booking nếu AIR → J14 xác nhận nguồn lực thực tế → J15 Ops READY. Specialist hoàn thiện mục phụ thuộc lịch bằng API Flow 2 → J16 Docs READY. Hai nhánh làm song song sau duyệt, không chờ nhau.

J14 xác nhận đủ bộ xe/crew, chưa tự là Ops READY. J15 kiểm tra lại cả bộ đã duyệt, booking AIR và thời gian bàn giao; J16 kiểm tra hồ sơ/bảo hiểm/lịch kiểm dịch/supplement theo phương án và thời điểm dùng. Không dùng boolean READY client gửi. Mỗi READY trả người/thời điểm, contextVersion, feasibilityVersion, planVersion và evidenceVersion. Docs còn gắn documentSetVersion/insuranceVersion. EvidenceVersion do BE tăng khi bất cứ booking, nguồn lực, hồ sơ, bảo hiểm, kiểm dịch, capability hoặc bằng chứng readiness nào đổi, kể cả xác nhận READY.

`evidenceVersion` trong ReadyStamp là revision tại lúc xác nhận, không bắt mọi stamp bằng evidenceVersion hiện tại: xác nhận Ops READY sau Docs READY không tự làm Docs READY mất giá trị. Ba khóa contextVersion/feasibilityVersion/planVersion phải cùng bản hiện hành; BE kiểm tra riêng các dependency của từng stamp. Bằng chứng không liên quan đổi chỉ tăng khóa chống tranh chấp, không tự hủy READY phía kia. Mutation dùng binding mới nhất từ context/readiness; stamp cũ chỉ còn giá trị nếu dependency của nó chưa bị ảnh hưởng. Không so toàn bộ binding bằng phép equality đơn giản để suy ra READY.

GET readiness chỉ hiển thị. POST departure/approve nhận đúng bộ revision GET trả, đọc lại bằng chứng và kiểm tra trong transaction: phân công/contract/request còn hợp lệ; đánh giá khả thi còn đúng; kế hoạch approved; không còn thay đổi đang mở; đủ cả READY cùng bản; nguồn lực thật còn khả dụng; AIR booking đúng; hồ sơ tại tất cả điểm dùng còn hạn; bảo hiểm bao phủ; lịch kiểm dịch bắt buộc xác nhận; không blocker. Điều kiện đổi trả 409 READINESS_CHANGED và blocker để tải lại.

Quá giờ plannedDepart mà chưa xuất phát không được dùng đánh giá giờ cũ để phê duyệt. Contract này chặn phê duyệt khi `serverNow > plannedDepart`; Coordinator điều chỉnh lịch qua duyệt thay đổi rồi hai bên đánh giá lại. Sau duyệt khởi hành, Driver ở Flow 4 vẫn kiểm tra điều kiện theo thời điểm thực tế trước DEPARTED, không chỉ đọc cờ READY_TO_DEPART.

Thành công đổi Trip READY_TO_DEPART + Request SCHEDULED nguyên tử, lưu revision và audit, không tạo DEPARTED. Sau READY_TO_DEPART, mutation kế hoạch/hồ sơ trả 409 DEPARTURE_APPROVAL_LOCKED; thu hồi duyệt khởi hành chưa chốt, không tự mở khóa. Sau IN_TRANSIT chuyển Flow 4–5. Trip hủy theo flow có thẩm quyền phải giải phóng reservation và xử lý booking, không xóa history.

Thay hồ sơ/đánh giá/lịch/nguồn lực/booking làm các bằng chứng liên quan không còn đúng: mất READY tương ứng; không xóa lịch sử. Nếu context/feasibility đổi, cả hai READY không còn giá trị cho version cũ; approved snapshot được giữ để đối chiếu nhưng phải duyệt bản kế hoạch cập nhật trước khi READY lại. Không sửa approved tại chỗ.

## 6. Giao thức, quyền và lỗi

Base `/api`, Bearer JWT; role chuẩn theo [CONVENTIONS](../../CONVENTIONS.md). Specialist/Coordinator chỉ đọc/sửa Trip được giao, Manager có phạm vi quản lý. USER ID lấy từ JWT, thời điểm/ID/status/version do server cấp. Đối tượng ngoài phạm vi trả 404, role không hợp lệ trả 403. Không nhận actor hoặc deadline từ mutation.

Mọi mutation POST/PUT dùng `Idempotency-Key` UUID (trừ POST validate chỉ đọc). Key scope actor + method + path, lưu bền vững tối thiểu 24 giờ; payload đã chuẩn hóa phải giống. Retry key cũ trả response cũ; khác payload 409 IDEMPOTENCY_CONFLICT. Update khác key với revision cũ trả 409 STALE_VERSION. PUT create draft/feasibility gửi expectedVersion=null chỉ khi chưa có bản; draft RETURNED có thể lưu lại với revision cũ; WITHDRAWN tạo draft mới expectedVersion=null, cấp planVersion tiếp theo của Trip.

Mã chính: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 STALE_VERSION / FEASIBILITY_REQUIRED / DOCUMENT_WINDOW_VIOLATION / DELIVERY_DEADLINE_EXCEEDED / DEPENDENCY_UNRESOLVED / RESOURCE_CONFLICT / FLIGHT_CATALOG_CHANGED / PLAN_NOT_APPROVED / OLD_BOOKING_ACTIVE / READINESS_CHANGED / DEPARTURE_APPROVAL_LOCKED / CONTRACT_SUPERSEDED; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Blockers có code, field, message; nếu liên quan giấy có constraintKey và useTime để FE chỉ đúng điểm dùng bị lỗi. Schema lỗi không lộ SQL/stack trace.

## 7. Đối chiếu frontend và persistence

| Nguồn đã đọc | Điều chỉnh cần làm khi tích hợp |
|---|---|
| Specialist types SpecTrip/Checklist, DocsReadyCard | Thêm đánh giá khả thi gồm ngày sớm nhất, từng hạn giấy tờ, mục cần lịch; READY phải gắn phương án |
| Coordinator RouteTab/ResourcesTab và coordinator.types.ts | Dùng plan-draft chung; route.version cũ không tự là planVersion; submit trước xác nhận thực tế |
| Coordinator FlightTab/FlightPlan | Bổ sung catalog demo và version; đổi mẫu USD sang dữ liệu VND thật; booking chỉ sau APPROVED |
| coordinatorRules.ts vehicleConflict/crewConflict | Nháp không chiếm nguồn lực; server giữ tạm khi submit, vẫn giữ quy tắc một Trip active trong demo |
| Manager PrepareStage | Bỏ điều kiện resourcesConfirmed trước duyệt phương án; hiển thị feasibility và dependency; duyệt cả bundle/ngân sách |
| Manager DepartStage | Đọc fresh readiness từ server, await mutation, kiểm tra phiên bản và không tự đổi trạng thái |
| SQL/ID tham khảo D:/Shared; DAO/entity hiện có | Chưa xác nhận có persistence cho feasibility, plan snapshot/revisions, giữ tạm, READY bindings và idempotency |

Contract chỉ đề xuất DTO, không tuyên bố bảng FEASIBILITY/PLAN/FLIGHT_CATALOG tồn tại và không thay schema. Flight catalog ref là opaque key do server cung cấp, không phải FlightBookingID hay mã bảng mới. checkpointId giữ integer từ catalog; VEHICLE_*, USER_*, HORSE_*, TRIP_*, REQUEST_* theo ID_NAME_RULE. Bộ API F2-J36/37/38 đọc danh mục tiếp tục dùng schema Flow 2.

Capability mặc định false khi chưa nghiệm thu persistence; thao tác chưa hỗ trợ trả 501. Không fallback về mock, không bật READY vì 0/0, không coi đã viết contract là đã chạy được. Flow 2 legacy examples giữ để tra cứu nhưng không phải bằng chứng triển khai flow mới.

## 8. Nghiệm thu contract và triển khai sau này

- ROAD và AIR đi đúng sáu bước; Manager có thể duyệt phương án khi dependencies cần lịch còn mở nhưng khả thi; chưa được duyệt khởi hành.
- Thiếu feasibility/đánh giá không đủ/ngoài hiệu lực/điểm dùng thiếu/hạn giao vượt đều chặn submit, không chỉ cảnh báo.
- Xuất phát trước hết hạn nhưng dùng giấy sau hết hạn bị chặn; biên validUntil được phép; bảo hiểm kiểm tra toàn hành trình.
- Nháp không giữ; submit hai chuyến tranh cùng xe chỉ một thành công; trả/rút giải phóng đúng bản; duyệt kiểm tra lại khả dụng.
- Approval và booking là hai thao tác; book trước duyệt bị chặn; ROAD không yêu cầu flight; AIR thiếu booking chặn Ops READY.
- Hai READY cùng snapshot; stale GET → POST bị chặn; thay version không giữ READY cũ; không có đường bỏ qua bằng API legacy.
- Thay kế hoạch giữ lịch sử, không overwrite booking; xử lý booking cũ trước duyệt đổi chuyến bay; draft thay đổi đang mở chặn departure.
- Retry không tạo trùng; actor giả/role sai/chuyến chưa giao không được mutate; unsupported trả 501.
- Duyệt departure nguyên tử, còn Driver DEPARTED ở Flow 4; frontend/backend/DB và kiểm thử tích hợp thật là công việc tiếp theo.
