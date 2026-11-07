# API Contract — Flow 5: xử lý sự cố vận chuyển (Bản cập nhật)

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 1.1.0 — 03/11/2026 |
| Phạm vi | Contract cập nhật; ĐÃ TRIỂN KHAI Backend .NET API & Entity DB, tích hợp Frontend Driver / Coordinator |
| Đầu vào | Trip thật được kích hoạt/phân công; sự cố phát sinh trong chuẩn bị, hành trình hoặc trước bàn giao |
| Kết quả | Sự cố được ghi nhận vào CSDL, kích hoạt Safety Blocker, gửi thông báo khẩn cấp tới Coordinator, khôi phục hoặc kết thúc hợp lệ |
| Nguồn | Kế thừa từ `FLOW5.md` (v1.0.0 — 29/10/2026); mã nguồn Backend `.NET`, Frontend Driver `IncidentsPage.tsx` và Coordinator Store |

[JSON từng API](FLOW5-API-JSON.md) · [OpenAPI 3.1](flow5.openapi.json) · [Kịch bản](flow5.examples.json) · [Quy ước](../../CONVENTIONS.md).

Nguồn thảo luận: `work/SWP391_Tong_Hop_20261019_105540/02_TAI_LIEU_TONG_HOP/DECISION_LOG_MOI_NHAT.md`, `FLOW_01_DEN_06_MOI_NHAT.md`, phần Flow 5; baseline triển khai thực tế tại `backend/Application/DTOs/Flow5/`, `backend/Infrastructure/Services/Flow5/` và `frontend/src/features/driver/pages/incidents/`.

## 1. Quy trình và quyết định chuẩn

`Báo sự cố → Hệ thống kích hoạt Safety Blocker & bắn Notification → Coordinator tiếp nhận/đánh giá tác động → giao việc song song → lập phương án khi cần → Manager duyệt phần cần thẩm quyền → ghi thực hiện/bằng chứng → áp dụng phương án → kiểm tra và cho tiếp tục đúng phạm vi → Coordinator đóng sự cố`.

Chuyến bình thường không bắt đi qua Flow 5. Có bốn nhóm chính quy được triển khai đồng bộ giữa Backend DTO và Frontend UI:
1. `VEHICLE_RESOURCE` (Hỏng xe / Phương tiện & Tài xế không thể tiếp tục): Nổ lốp, sự cố động cơ, hỏng máy lạnh khoang, tài xế kiệt sức.
2. `HORSE_HEALTH` (Sức khỏe y tế của ngựa): Ngựa sốt, đau bụng (*colic*), chấn thương, mất nước, bất thường sinh hiệu.
3. `DELAY_AIR` (Chậm trễ lịch trình, kẹt xe hoặc hoãn/hủy chuyến bay): Ùn tắc nghiêm trọng, cấm đường kéo dài, đổi giờ bay.
4. `OTHER` (Lý do khác): Các trường hợp bất khả kháng hoặc phát sinh đặc thù khác. **Bắt buộc**: Phải nhập mô tả chi tiết tối thiểu 10 ký tự.

Không bắt thêm nhóm thiếu giấy tờ trước khởi hành: Flow 2 phải phát hiện và chặn sớm. Nếu sự cố làm hồ sơ hoặc bảo hiểm không còn phù hợp thì Specialist xử lý đúng phần bị ảnh hưởng.

Ba trạng thái incident: **REPORTED → IN_PROGRESS → RESOLVED**. Chúng là nhãn công việc, không chứng minh được phép vận chuyển. Coordinator là đầu mối và người đóng incident theo nghiệp vụ đã bàn; thao tác Manager PUT status tùy ý trong Operations cũ được thay bằng command tiếp nhận có điều kiện (`POST /api/incidents/{id}/accept`). Manager giữ quyền quyết định phương án tác động approved resources/lịch/booking/chi phí hoặc thỏa thuận khách.

Chăm sóc khẩn cấp diễn ra ngay tại hiện trường, tài xế xác nhận an toàn/sơ cứu ban đầu khi gửi báo cáo. Không biến việc chăm sóc thành quyền tiếp tục vận chuyển. Khách hàng không trả thêm chi phí sự cố (`customerAdditionalChargeVnd` luôn bằng 0). Khiếu nại/bồi thường sau bàn giao dùng Flow 6, chỉ liên kết incident để đối chiếu.

## 2. Quyền theo người và tài nguyên

| Role | Quyền |
|---|---|
| `DRIVER_ESCORT` / `DRIVER` | Báo hiện trường qua `POST /api/incidents` hoặc `POST /api/driver/trips/{tripId}/incidents`, xác nhận sơ cứu/an toàn, gửi ảnh bằng chứng |
| `DRIVER_ESCORT + VETERINARIAN` | Bác sĩ được phân công và qualification hợp lệ ghi kết luận y tế / khả năng tiếp tục (`FIT` / `NOT_FIT`) |
| `FLEET_ROUTE_COORDINATOR` | Nhận thông báo khẩn cấp tức thời, tiếp nhận sự cố qua `POST /api/incidents/{id}/accept`, đánh giá 8 phạm vi, lập phương án, xác nhận nguồn lực, đóng incident |
| `TRANSPORT_SPECIALIST` | Rà soát hồ sơ/bảo hiểm bị ảnh hưởng, kiểm tra applicability và bằng chứng đúng phương án |
| `LOGISTICS_MANAGER` | Duyệt phương án cần quyết định (thay đổi nguồn lực/lịch/chi phí nội bộ), đầu mối thông báo/thỏa thuận khách |
| `CUSTOMER` | Xem tóm tắt công khai (`PublicIncident`), phản hồi đúng đề nghị lịch/hướng xử lý; không tự đổi lịch/địa chỉ giao hoặc điều phối |

JWT quyết định actor/role; server kiểm Trip/Request/incident, mốc, ngựa, task, file và booking trong path/body. Manager trong scope quản lý, nhân sự theo assignment hoặc task được ủy quyền. Giao task không đồng nghĩa chuyển assignment vận chuyển: nhân sự thay thế chỉ được ghi mốc sau khi thực hiện và áp dụng phân công hợp lệ. Người chỉ có task không được xem toàn bộ ghi chú ngoài nhiệm vụ.

Customer dùng PublicIncident/PublicContext, không IncidentDetail. Các trường customerSummary/customerImpact lấy từ thông báo chính thức của Manager và kết quả công bố, không sao chép mô tả kỹ thuật nội bộ. Phản hồi khách có actor và thời điểm thật.

## 3. Báo sự cố, đánh giá và blocker

Tài xế gửi báo cáo sự cố qua API `POST /api/incidents` hoặc `POST /api/driver/trips/{tripId}/incidents`. Dữ liệu đầu vào chuẩn hóa trong `ReportIncidentInputDto`: `TripId`, `Category`, `Description`, `ImmediateCare`, `LocationCoordinates`, `ImageUrl`, `OccurredAt`. Khi chọn `Category = 'OTHER'`, hệ thống chặn và yêu cầu nhập mô tả ít nhất 10 ký tự.

Mã sự cố được sinh tự động theo chuẩn `ID_NAME_RULE`: `INC_{yyyyMMdd}_{6 ký tự ngẫu nhiên}` (ví dụ: `INC_20261103_AB12CD`).

Ngay khi REPORTED, server tự động đặt cờ **`SafetyBlockerActive = true`** cho phạm vi chưa xác minh; không chờ Coordinator bấm nhận. Đồng thời, hệ thống tự động tạo bản ghi `Notification` loại `INCIDENT_REPORTED` gửi đích danh đến Điều phối viên phụ trách chuyến đi (`AssignedCoordinatorId`), kích hoạt chuông cảnh báo khẩn cấp màu đỏ trên giao diện điều phối.

Assessment có đủ tám area, mỗi area đúng một lần: RESOURCES, SCHEDULE, BOOKING, DOCUMENTS, INSURANCE, HEALTH, DELIVERY_DEADLINE, INTERNAL_COST. Mỗi mục AFFECTED/NOT_AFFECTED/UNASSESSED kèm lý do và scope cụ thể; UNASSESSED giữ gate liên quan. Coordinator không được dùng NOT_AFFECTED để phủ nhận NOT_FIT hoặc kết quả pháp lý BLOCKED của chuyên môn.

Tasks có thể chạy song song theo đúng trách nhiệm. DONE cần kết quả/bằng chứng checklist nhưng không thay thế review chuyên môn, resource confirmation, booking hoặc Manager approval. Diễn biến/care/assessment/decision append-only hoặc có revision và lịch sử trước/sau; không có DELETE incident/history để xóa sai sót.

## 4. Phương án khôi phục và nguồn lực

Recovery có vòng đời `DRAFT → PENDING_APPROVAL → APPROVED → APPLIED`, nhánh RETURNED để sửa, SUPERSEDED khi có bản thay thế. Approved snapshot không sửa đè; tạo revision mới và giữ bản cũ.

Bảng CSDL `INCIDENT` đã được bổ sung các trường phục vụ xử lý khôi phục: `CoordinatorId`, `SafetyBlockerActive`, `ResolvedAt`, `ResolutionType`, `ResolutionNotes`.

Chỉ đưa vào các thay đổi cần thiết: resources từng ROAD, lịch các mốc tương lai, đề xuất flight/ETA, chi phí nội bộ, chăm sóc và bằng chứng. Không đổi điểm giao/hợp đồng đã ký. `customerAdditionalChargeVnd` luôn 0: **khách không trả thêm chi phí sự cố**. Nội bộ ghi đúng VND và Manager duyệt theo trách nhiệm, không cộng vào invoice khách.

Nguồn lực thay thế kiểm tra nguyên tử toàn hệ thống: một xe/người không cùng lúc nhận hai Trip active; AIR vẫn hai ROAD độc lập. Không nhả xe/người cũ trước khi xác nhận chuyển giao và áp dụng phương án. Thay approved vehicle/crew, lịch chính thức/tuyến/flight, chi phí nội bộ hoặc thỏa thuận khách đều cần Manager phê duyệt.

## 5. Hồ sơ, sức khỏe và AIR

Không làm lại toàn bộ Flow 2/3. Flow 3 giả định giấy còn hiệu lực suốt chuyến, nên không tự yêu cầu mọi giấy gia hạn vì lịch thay đổi. Specialist vẫn đánh giá applicability nếu thay điều kiện/tuyến/booking thực sự ảnh hưởng, bảo hiểm phải bao phủ hoạt động thực tế.

Bác sĩ được giao, qualification hợp lệ ghi nhận đánh giá chuyên môn y tế độc lập. NOT_FIT/NEEDS_REVIEW chặn phần vận chuyển liên quan; FIT chỉ giải quyết gate sức khỏe. Nhân sự vẫn chăm sóc và ghi nhật ký khi bị chặn.

AIR: Coordinator phối hợp lịch khả thi và compliance precheck với Specialist trước khi xác nhận booking thay thế. OLD_BOOKING_CANCELLED ghi kết quả đối tác đã xác nhận. NEW_BOOKING_CONFIRMED chỉ sau Manager approval đúng snapshot, precheck khả thi và booking cũ đã xử lý nếu bị ảnh hưởng. Giữ bằng chứng hủy/thay, không overwrite BOOKED. Lịch bay dự kiến và actual event vẫn do Flow 4 ghi nguồn thực.

## 6. Áp dụng, tiếp tục và đóng sự cố

Tiếp nhận sự cố: Coordinator gọi `POST /api/incidents/{incidentId}/accept`, chuyển trạng thái `REPORTED → IN_PROGRESS`, gán `CoordinatorId` phụ trách.

Chỉ áp dụng recovery APPROVED đã có mọi confirmation liên quan và agreement khách cần thiết. Atomic: approved operational revision mới cho phần tương lai, execution mapping mốc tương lai, assignment swap, resource hold conversion, history/outbox.

Gỡ Safety Blocker: Chỉ gỡ `SafetyBlockerActive = false` khi phương án đã được áp dụng hoặc chuyên môn y tế/kỹ thuật xác nhận đủ điều kiện an toàn. Không đổi Trip thành ON_HOLD hoặc tự IN_TRANSIT/DEPARTED/COMPLETED: Driver tiếp tục ghi Flow 4 đúng mốc.

Coordinator đóng incident khi không còn công việc/gate bắt buộc chưa xử lý và đã có kết quả rõ ràng. Cập nhật `Status = 'RESOLVED'`, lưu `ResolvedAt`, `ResolutionType` (`RECOVERED` hoặc `TERMINATION_REFERRED`) và `ResolutionNotes`. Đóng incident không hoàn tất Trip, không đóng Request/Contract và không xác nhận tiền đã hoàn.

## 7. Customer, lịch thay đổi và không thể tiếp tục

Manager là đầu mối truyền đạt/thống nhất thay đổi với Customer. NOTICE chỉ thông báo; AGREEMENT_REQUEST là đề nghị bất biến gắn đúng recoveryVersion. Server yêu cầu thỏa thuận khi thay cam kết/hạn giao hoặc hướng xử lý cần khách đồng ý. Khách ACCEPT/REJECT đúng nội dung; im lặng không đồng ý.

ETA thay đổi đi theo Flow 4; recovery approved/applied là căn cứ của ETA Manager decision, không tự sửa giờ bằng ghi chú incident.

Nếu không thể tiếp tục: Manager đề xuất hướng kết thúc, trách nhiệm chăm sóc/custody, khoản hoàn thương lượng và căn cứ; không tự đặt công thức hoàn theo phần đường còn lại. Chuyển hồ sơ được đồng ý với bằng chứng custody sang workflow xử lý nghĩa vụ phù hợp. Flow 5 hoàn tất việc chuyển trách nhiệm, không tự thay quy tắc đóng/thu/hoàn tiền của Flow 6.

## 8. Giao thức, phiên bản và file

Base `/api`, Bearer JWT. JSON chuẩn: `SuccessResponse<T>` (`{success:true, message, data}`). Lỗi: `{success:false, message, errors}`. HTTP Status Codes: 200/201 thành công, 400 validation, 401/403 auth/role, 404 không tìm thấy chuyến/sự cố, 409 xung đột nghiệp vụ, 500 lỗi hệ thống.

Danh sách Endpoints thực tế đã triển khai trong `IncidentsController`:
- `POST /api/incidents` hoặc `POST /api/driver/trips/{tripId}/incidents`: Báo sự cố hiện trường từ ứng dụng tài xế.
- `GET /api/incidents`: Điều phối viên tra cứu danh sách sự cố (lọc theo `tripId`, `status`).
- `GET /api/incidents/{incidentId}`: Xem chi tiết sự cố theo ID.
- `POST /api/incidents/{incidentId}/accept`: Điều phối viên tiếp nhận xử lý sự cố.

Mọi mutation cần xác thực token người gửi (`reporterUserId`). Timestamp ISO 8601 UTC trên server, hiển thị theo Asia/Ho_Chi_Minh trên UI. Upload ảnh bằng chứng định dạng JPEG/PNG <=10 MiB, lưu đường dẫn `ImageUrl` gắn trực tiếp vào sự cố.

## 9. Chuyển từ Operations và điểm nối

| Cũ hoặc nguồn liên quan | Chuẩn hiện hành trong mã nguồn thực tế |
|---|---|
| Role GET/POST incidents và GET detail cũ | `IncidentsController` chuẩn hóa `POST /api/incidents` và `GET /api/incidents` dùng chung DTO `IncidentDtos.cs` |
| Giao diện tài xế lưu mock state | `IncidentsPage.tsx` tích hợp gọi API thực tế `apiClient.post('/incidents', ...)`, lưu CSDL và thông báo tức thời |
| Manager PUT incident status tùy ý | Retired; chuyển thành command có điều kiện: Coordinator gọi `POST /api/incidents/{id}/accept` chuyển `IN_PROGRESS` |
| Safety Blocker lý thuyết | Bổ sung cột `SafetyBlockerActive` trực tiếp trong bảng `INCIDENT`, tự động bật `true` khi `REPORTED` |
| Thông báo sự cố thủ công | Bổ sung cơ chế tự động tạo bản ghi `Notification` khẩn cấp tới Coordinator phụ trách khi tạo sự cố |
| Manager/customer complaints, settlement cũ | Tách riêng Flow 6; Flow 5 chỉ chuyển giao hồ sơ nghĩa vụ khi sự cố không thể tiếp tục |

## 10. Kiểm tra và nghiệm thu

Kịch bản kiểm thử tích hợp E2E đã hoàn thành trên hệ thống:
1. **Tài xế báo sự cố hiện trường**: Đăng nhập tài xế (`hung.driver@cbntransport.com`), chọn chuyến đang hoạt động, chọn lý do (Hỏng xe / Kẹt xe / Ngựa sốt / Khác), xác nhận an toàn/sơ cứu và gửi báo cáo.
2. **Hệ thống xử lý tự động**: Tạo bản ghi `INC_...`, lưu `Status = 'REPORTED'`, bật `SafetyBlockerActive = true`, tạo thông báo khẩn cấp `INCIDENT_REPORTED`.
3. **Điều phối tiếp nhận**: Đăng nhập điều phối viên (`hai.coord@cbntransport.com`), chuông thông báo hiển thị sự cố mới, mở chi tiết và bấm tiếp nhận (`POST /accept`), chuyển `IN_PROGRESS`.
4. **Khắc phục và mở khóa**: Điều phối hoàn tất phương án thay xe hoặc xác nhận y tế, gỡ Safety Blocker và đóng sự cố (`RESOLVED`).
