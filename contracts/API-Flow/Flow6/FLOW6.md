# Flow 6 — Bàn giao, nghiệm thu, thanh toán và giải quyết tranh chấp

**Bản review 1.1.0 — 29/10/2026.** Giữ quy tắc Flow 6 ngày 26/10/2026, bổ sung điểm nối Flow 4–5, JSON lỗi tại từng API và kịch bản máy đọc. Quy tắc này thay thế phần Flow 6 cũ trong HTML, Flow 1 lịch sử và Operations. Đây là API contract đích và SDK gọi API frontend, **chưa có backend/DB triển khai, chưa nối các màn hình cũ và chưa kiểm thử thanh toán thật**.

- [Toàn bộ endpoint, JSON gửi/nhận](FLOW6-API-JSON.md).
- [OpenAPI 3.1 để import vào Swagger Editor/Postman](flow6.openapi.json).
- [Kịch bản bạn review cần kiểm tra](REVIEW.md).
- [JSON kịch bản và snapshot nghiệm thu/thanh toán/đóng](flow6.examples.json).
- Frontend mới: `frontend/src/features/aftercare/api/flow6Api.ts`, `flow6Client.ts`, DTO cùng feature. Không gọi client cũ để bỏ qua guard của contract mới.

## 1. Phạm vi và quyết định nghiệp vụ

Flow 1: cọc được xác minh đủ **trước** ký OTP, rồi kích hoạt và tạo Trip. Flow 2 và Flow 3 chuẩn bị song song; giấy tờ giả định còn hiệu lực suốt chuyến. Flow 6 bắt đầu bằng bàn giao ở điểm đến, không tạo lại Trip, hợp đồng hoặc thay đổi nội dung hợp đồng đã ký.

Nhánh bình thường:

`Bàn giao → Chờ nghiệm thu → Customer nghiệm thu → Thanh toán số dư → Xác minh tiền → Manager đóng`.

Nhánh có vấn đề:

`Báo vấn đề/từ chối nghiệm thu → Manager và khách giải quyết → Áp dụng kết quả → Mở lại nghiệm thu → Thanh toán → Manager đóng`.

Nhánh tranh chấp:

`Manager chuyển Đang giải quyết → Ghi nhận kết quả có căn cứ → Áp dụng kết quả và xử lý nghĩa vụ tài chính → Quay lại nghiệm thu hoặc đóng sau tranh chấp`.

- Khách nghiệm thu là xác nhận cuối cùng không còn vấn đề cần khiếu nại. Sau nghiệm thu khóa khiếu nại mới; không reset hoặc xóa dấu nghiệm thu.
- Còn khiếu nại, tranh chấp hoặc điều chỉnh hóa đơn đang chờ thì chặn nghiệm thu và khởi tạo thanh toán.
- Im lặng/quá hạn không phải đồng ý. Hệ thống chỉ cảnh báo Manager, không tự nghiệm thu hay tự đóng.
- Cho gia hạn có lý do, lưu hạn cũ và hạn mới. Không ghi đè đồng hồ về 0 mất lịch sử.
- Giải quyết tranh chấp có thể kết thúc mà khách không nghiệm thu. Lưu `NOT_REQUIRED_BY_DISPUTE`, không tạo `acceptedAt/acceptedBy` giả.
- Đóng đơn luôn là thao tác Manager có kiểm tra điều kiện; `Trip COMPLETED` không đồng nghĩa `Request CLOSED`.

## 2. Vai trò và quyền theo tài nguyên

| Role | Quyền Flow 6 |
|---|---|
| DRIVER_ESCORT | Chỉ chặng giao cuối được phân công: đọc thông tin bàn giao, upload bằng chứng, ghi lần giao thất bại, bàn giao thành công. |
| CUSTOMER | Chỉ đơn của mình: đọc biên bản/tài chính liên quan, báo vấn đề trước nghiệm thu, trao đổi, đồng ý/từ chối đề xuất, nghiệm thu, tạo phiên thanh toán. |
| LOGISTICS_MANAGER | Trong phạm vi quản lý: duyệt người nhận thay thế, gia hạn, đề xuất xử lý, áp dụng kết quả, xử lý tranh chấp, ghi nhận hoàn tiền có bằng chứng và đóng đơn. |
| FLEET_ROUTE_COORDINATOR | Chỉ chuyến được giao: đọc kết quả và lần bàn giao thất bại để phối hợp; không có quyền nghiệm thu hay đóng đơn. |
| TRANSPORT_SPECIALIST | Không có tác vụ Flow 6. |

Bearer JWT chỉ xác thực role; phải kiểm tra ownership/assignment tại backend với từng ID, kể cả ID lồng trong body/file. Sai role: 403; tài nguyên khác chủ/ngoài phân công: 404. Không nhận actor, chủ đơn, trạng thái, thời điểm hoàn tất hoặc số tiền phải thu từ client.

File chỉ tải qua endpoint có kiểm quyền. Customer chỉ thấy nội dung/bằng chứng được chia sẻ với mình. API message/dispute update ở contract này là nội dung chia sẻ, không dùng để chứa ghi chú riêng hoặc chi phí nội bộ. SDK không tự thiết lập quyền; backend là nơi thực thi.

## 3. Các trạng thái không được trộn

`phase` là trạng thái nghiệp vụ Flow 6, không phải khẳng định có cột tương ứng trong DB:

| Phase | Ý nghĩa | Hành động tiếp theo |
|---|---|---|
| AWAITING_HANDOVER | Chưa có bàn giao hợp lệ | Tổ xe xác minh và bàn giao |
| AWAITING_ACCEPTANCE | Chờ kiểm tra/nghiệm thu; có thể đã quá hạn | Customer phản hồi; Manager gia hạn/nhắc |
| COMPLAINT_OPEN | Có phản ánh hoặc từ chối trước nghiệm thu | Manager xử lý, khách quyết định đề xuất |
| DISPUTE_IN_PROGRESS | Có tranh chấp đang giải quyết | Manager ghi diễn biến/kết quả có căn cứ |
| AWAITING_PAYMENT | Đã nghiệm thu hoặc có quyết định cho phép thu nợ | Customer thanh toán; server xác minh |
| READY_TO_CLOSE | Đủ mọi điều kiện, vẫn chưa đóng | Manager bấm đóng |
| CLOSED | Đã đóng, chỉ đọc | Giữ hồ sơ để tra cứu |

Ưu tiên phase: CLOSED → dispute chưa RESOLVED → complaint chưa RESOLVED/pending adjustment → chờ nghiệm thu → chờ xử lý tài chính → READY_TO_CLOSE. `AWAITING_PAYMENT` bao gồm chờ đối soát/hoàn tiền; `actions` và blockers phải chỉ rõ việc còn thiếu, không hiển thị nút trả tiền khi `canPay=false`.

Request sau bàn giao là DELIVERED. Manager mở tranh chấp đổi thành **UNDER_RESOLUTION** (nhãn “Đang giải quyết”). Nhánh RESUME_ACCEPTANCE đã áp dụng trở về DELIVERED; nhánh CLOSE_AFTER_DISPUTE giữ UNDER_RESOLUTION đến CLOSED. Đây là giá trị API đích mới, cần backend review mapping/migration, không tự ghi vào enum DB chưa hỗ trợ. Trip đã bàn giao giữ COMPLETED.

Nghiệm thu: PENDING → ACCEPTED, hoặc PENDING → NOT_REQUIRED_BY_DISPUTE theo quyết định đã áp dụng. Nếu đã ACCEPTED trước khi Manager mở tranh chấp thanh toán, giữ nguyên dấu nghiệm thu.

Complaint: OPEN → PROPOSED → AGREED → RESOLVED. Khách từ chối proposal quay về OPEN. Đồng ý proposal không phải nghiệm thu; AGREED vẫn chặn cho tới Manager áp dụng. Dispute: OPEN → DECISION_RECORDED → RESOLVED. Cần proposal version và aggregate version hiện hành, không sửa nội dung khách đã đồng ý.

## 4. Đồng hồ, quá hạn và gia hạn

Policy do server cung cấp. Giá trị **đề xuất để review**: nghiệm thu mặc định 48 giờ, cho chọn cấu hình 24/48; thanh toán riêng 24 giờ; mỗi lần gia hạn tối đa 168 giờ từ server now. Những giá trị này không phải quyền hardcode ở frontend, không tự đổi policy toàn hệ thống từ màn chi tiết.

- Bàn giao lần đầu thành công: server snapshot policy, mở acceptanceWindow tại thời điểm transaction hoàn tất. GET không khởi động lại đồng hồ.
- `serverTime` và dueAt là nguồn chuẩn. Timestamp `YYYY-MM-DD HH:mm`, Asia/Ho_Chi_Minh; persistence lưu UTC. Backend dùng độ chính xác thực tế; không so sánh theo clock trình duyệt. `now >= dueAt` là quá hạn. Các ngày phải là ngày lịch thực, không chỉ đúng regex.
- Chưa nghiệm thu mà hết hạn: status OVERDUE, vẫn AWAITING_ACCEPTANCE; job thông báo Manager một lần cho mỗi lần mở/gia hạn, có retry/dedupe ở outbox. Customer muốn thao tác sau hạn cần Manager gia hạn. Quá hạn không xóa quyền tiếp tục trao đổi khiếu nại đã mở.
- Báo vấn đề hợp lệ trước hạn: pause acceptanceWindow một lần. Khách có thể bổ sung phản ánh trong khi cửa sổ PAUSED và chưa nghiệm thu. Vẫn phải xử lý tất cả; không tự gia hạn do mỗi message.
- Hết mọi complaint, không dispute và không pendingAdjustment: bắt đầu đủ thời hạn nghiệm thu mới theo policy snapshot. Còn vụ mở thì vẫn PAUSED. Việc này xảy ra khi apply kết quả, không khi khách mới đồng ý proposal.
- Gia hạn thủ công: chỉ khi chưa nghiệm thu và không có vụ/điều chỉnh đang mở; newDueAt phải lớn hơn now và hạn hiện tại, trong giới hạn policy. Không cho extend bằng giá trị 0 hoặc timestamp quá khứ. Lưu DeadlineEvent bất biến và gửi thông báo khách.
- Nghiệm thu thành công: acceptanceWindow COMPLETED; mở paymentWindow riêng từ now. Nếu nợ bằng 0 thì không cần tạo phiên tiền 0. Có thể đóng sớm khi đủ nghĩa vụ, không chờ hết thời gian nghiệm thu.
- Quá hạn trả tiền vẫn cho trả nếu các điều kiện khác đạt, đánh dấu trễ và cảnh báo Manager. Không tự xóa nợ.
- Mở tranh chấp sau nghiệm thu: pause paymentWindow, giữ ACCEPTED. Áp dụng kết quả mà còn phải thu thì mở lại paymentWindow riêng; hết nợ vẫn phải kiểm khoản hoàn/đối soát.

## 5. Bàn giao và bằng chứng

Server kiểm Trip đã tới điểm giao, tổ xe đúng phân công, danh sách ngựa chính xác không trùng/thiếu, ảnh từng ngựa, microchip, chữ ký và người nhận đã đăng ký/được Manager duyệt. Tình trạng ABNORMAL phải có mô tả; không bắt khai “bình thường” mới nhận bàn giao. Trường hợp thực tế chưa thể giao phải ghi lần thất bại.

`arrivedAtDestination` lấy từ **FINAL_ARRIVED đã xác nhận trong [Flow 4](../Flow4/FLOW4.md)**, không từ ETA, giờ dự kiến hoặc marker bản đồ. FINAL_ARRIVED chỉ mở giai đoạn bàn giao, Trip/Request vẫn IN_TRANSIT trước khi handover hợp lệ. GET HandoverContext.version là revision bàn giao của server, độc lập executionVersion Flow 4; server phải cập nhật/invalidate context khi dependency thay đổi. POST bàn giao recheck mọi blocker [Flow 5](../Flow5/FLOW5.md) thực sự ảnh hưởng bàn giao dưới cùng transaction boundary; canComplete=true từ GET cũ không đủ. Sự cố REPORTED chưa được tiếp nhận vẫn phải được xét. Một incident RESOLVED không thay bằng chứng sức khỏe/pháp lý/custody còn đang chặn; chăm sóc vẫn tiếp tục khi chưa thể bàn giao.

Handover chỉ được tạo một lần cho một Trip/Request. Hai tổ xe gửi đồng thời phải chỉ có một kết quả. Retry không tạo thêm deadline. File tham chiếu phải có thật, được upload cho Request này và đúng loại: ảnh/chữ ký là JPEG/PNG; tài liệu quyết định có thể PDF. Client không gửi link tự chế. Không cần lưu số định danh đầy đủ của người nhận trong contract này; dùng xác nhận kiểm tra đối chiếu và người nhận đã được duyệt.

Trước khi lấy chữ ký, giao diện cho người nhận xem toàn bộ receiver, danh sách ngựa/tình trạng, note và nội dung biên bản của đúng version. Server lưu snapshot bất biến cùng dấu liên kết nội dung và signatureFileId trong transaction bàn giao; chữ ký không được tái dùng cho biên bản khác. Đổi nội dung sau khi ký phải hiển thị và ký lại, không chỉ gửi lại ảnh chữ ký cũ. Đây là xác nhận nghiệp vụ, không tự coi ảnh chữ ký là chữ ký số có chứng thư. Backend cần review cơ chế lưu chứng cứ này trước khi công bố hoàn tất hỗ trợ.

Giao thất bại: lưu attempt + lý do, thông báo Coordinator/Manager, không COMPLETED và chưa mở nghiệm thu. Người nhận thay thế chỉ được Manager ghi nhận trước khi bàn giao thành công, có căn cứ ủy quyền. Không sửa hợp đồng đã ký.

## 6. Tranh chấp và tài chính

Manager mở dispute có lý do và căn cứ; NO_RESPONSE đòi đã quá hạn, không được gắn nhãn khách gian lận. PAYMENT_DISAGREEMENT sau ACCEPTED do Manager mở để theo dõi nợ; đây không mở lại quyền khiếu nại của khách.

Kết quả cuối có hai outcome:

- **RESUME_ACCEPTANCE**: chỉ khi chưa ACCEPTED; giải quyết hết vấn đề, áp dụng khoản giảm, đưa đơn về DELIVERED và mở thời hạn mới. Không miễn nghĩa vụ tài chính bằng waiver ở nhánh này.
- **CLOSE_AFTER_DISPUTE**: xử lý theo kết quả, không đòi tạo dấu nghiệm thu giả. Nghĩa vụ tiền còn lại vẫn phải hoàn thành trước khi đóng.

Căn cứ quyết định:

- CUSTOMER_AGREEMENT: phải trỏ các proposal đã được chính Customer chấp nhận cho mọi complaint chưa giải quyết. Không chấp nhận checkbox do Manager đánh dấu thay khách; giá trị tiền khớp phần đã đồng ý chưa áp dụng. Nếu khách không thao tác trên hệ thống, dùng tài liệu kết quả ngoài hệ thống đã kiểm chứng và reference.
- EXTERNAL_DECISION: reference, nội dung kết quả và ít nhất một bằng chứng có thật, Manager chịu trách nhiệm xác nhận căn cứ; không tự tuyên bố hiệu lực pháp lý chỉ vì đã upload file. Hệ thống chỉ quản lý hồ sơ/kết quả, không khởi kiện hoặc gửi tài liệu ra ngoài.
- COMPANY_WAIVER: quyết định công ty miễn khoản nợ của khách, lưu số tiền và lý do; không được dùng để phủ nhận khiếu nại của khách chưa được giải quyết. Server chặn nếu còn yêu cầu bồi thường chưa có kết quả. Nhánh này chỉ CLOSE_AFTER_DISPUTE, reductionAmount=0, waiverAmount>0 và không vượt outstanding. Không đánh dấu khoản được miễn thành tiền đã nhận.

Số tiền VND nguyên đồng, không có đổi tiền mẫu USD. Hợp đồng gốc bất biến; hóa đơn tất toán lưu adjustment riêng. Ký hiệu:

```
netPayable = originalTotal - reductionTotal - waiverTotal >= 0
received = verifiedDeposit + verifiedBalance
outstanding = max(0, netPayable - received)
refundDue = max(0, received - netPayable - verifiedRefund)
```

Reduction không vượt giá trị chưa giảm; waiver không vượt nợ sau reduction, không tạo hoàn tiền từ waiver. Tổng hợp tài chính được tính từ ledger server, không tin phép tính client. Source proposal/decision chỉ áp dụng một lần, có unique constraint. Các khoản đã áp dụng từ complaint không được cộng lại khi áp dụng dispute. APPLIED không đồng nghĩa đã hoàn tiền.

Kết quả được ghi nhận trước, áp dụng riêng trong transaction; pendingAdjustment chặn trả tiền/nghiệm thu/đóng. Đồng ý proposal xong mà Manager chưa apply thì vẫn khóa. File/actor/decision/hóa đơn đều liên kết đúng Request.

Thanh toán: POST tạo session, server tự lấy outstanding và kiểm invoiceVersion. Không nhận amount từ UI. Không tạo session 0 hoặc trùng phiên còn pending. Callback server dùng gateway hiện có `GET /payments/vnpay/ipn` (F1-J67), cần backend mở rộng cho BALANCE: xác minh checksum, merchant, transaction reference, provider result, currency và số tiền VND với quy tắc VNPay ×100; success ghi tiền một lần. Browser Return chỉ điều hướng và GET trạng thái. Flow 6 không tạo một endpoint IPN thứ hai hoặc cho Customer gọi xác minh tiền.

Khi mở dispute/đổi invoice: vô hiệu hóa session cũ nếu được; nếu provider chưa thể xác nhận hủy thì giữ pending/reconciliation, chặn apply/đóng. Callback đến muộn dù đã hết session/dispute/closed vẫn phải ghi nhận tiền có thật một lần và tạo đối soát/hoàn nếu cần; không bỏ tiền và không tự đóng/mở lại đơn. Đơn đã đóng phát sinh đối soát phải thông báo Manager, giữ snapshot closure và tạo hồ sơ đối soát liên kết; nghiệp vụ mở lại closure chưa cung cấp ở bản này.

Hoàn tiền: contract chỉ tạo nghĩa vụ từ ledger và cho Manager có quyền tài chính ghi nhận đã chuyển thật với reference/bằng chứng. Endpoint confirmation không thực hiện chuyển tiền. Không cho nhập lại amount tùy ý. Backend kiểm chứng theo tích hợp hoặc quy trình đối soát được tổ chức cho phép; nếu chưa có thì FEATURE_NOT_SUPPORTED. Reference dùng một lần và khớp số tiền; PENDING/FAILED refund vẫn chặn đóng.

## 7. Điều kiện đóng và tính đồng thời

Manager đóng với mode:

- NORMAL: bàn giao đầy đủ, ACCEPTED, hết nợ, hết khoản hoàn, không vụ mở/điều chỉnh/phiên tiền/đối soát treo.
- AFTER_DISPUTE: đủ bàn giao, quyết định CLOSE_AFTER_DISPUTE đã APPLIED, mọi nghĩa vụ theo kết quả đã hoàn thành; không giả định Customer đã nghiệm thu. Giữ acceptance có thật nếu trước đó đã ACCEPTED.

Phải trả blocker cụ thể. Ví dụ `PENDING_REFUND`, `OPEN_COMPLAINT`, `UNSETTLED_PAYMENT`, không chỉ “chưa đủ điều kiện”. GET chỉ gợi ý; POST đóng recheck dưới cùng lock với payment/complaint/acceptance. Hồ sơ đóng chỉ đọc và giữ dữ liệu tra cứu. Không có thao tác System tự đóng hay cron đóng; job chỉ cảnh báo.

Mọi POST cần Idempotency-Key UUID. Backend scope theo actor + operation + resource + key, lưu fingerprint và kết quả bền vững trong thời gian retry (tối thiểu 7 ngày; financial uniqueness vĩnh viễn). Cùng key/body trả đúng kết quả cũ trước kiểm stale version, không phát sinh thêm side effect. Cùng key khác body trả IDEMPOTENCY_CONFLICT. Cùng key đang chạy trả REQUEST_IN_PROGRESS hoặc chờ transaction, không chạy song song.

`expectedVersion` là revision do server cấp: trước bàn giao dùng HandoverContext.version; sau bàn giao dùng Aftercare.version. Mọi thay đổi nghiệp vụ/callback/job đổi trạng thái tăng revision nguyên tử. File chưa gắn không tăng revision. Schema version không phải RowVersion DB đã tồn tại; cần persistence review. ProposalVersion và invoiceVersion riêng đảm bảo xác nhận đúng nội dung đã xem. Stale trả 409, UI refetch và yêu cầu người dùng xem lại; không tự thay version rồi retry mutation.

Nghiệm thu và khiếu nại đồng thời: cùng aggregate lock; chỉ một thao tác thành công. Thanh toán/điều chỉnh và đóng cũng cùng boundary. Notifications qua outbox, không gửi trước commit. Server kiểm lại phân quyền kể cả idempotent replay, không phát response cho actor khác.

## 8. Mã lỗi nghiệp vụ (JSON envelope)

| HTTP | errorCode | Ý nghĩa |
|---|---|---|
| 400 | VALIDATION_ERROR | Thiếu field, sai ngày thực, số âm, file/ID không hợp lệ |
| 401/403/404 | UNAUTHENTICATED / FORBIDDEN / RESOURCE_NOT_FOUND | Xác thực, role hoặc phạm vi tài nguyên |
| 409 | STALE_VERSION / STALE_INVOICE / STALE_PROPOSAL | Nội dung đã thay đổi, phải tải lại |
| 409 | IDEMPOTENCY_CONFLICT / REQUEST_IN_PROGRESS | Key bị dùng khác payload hoặc đang xử lý |
| 409 | HANDOVER_NOT_READY / HANDOVER_ALREADY_COMPLETED | Chưa đủ bàn giao hoặc đã có biên bản |
| 409 | ACCEPTANCE_WINDOW_EXPIRED / ALREADY_ACCEPTED | Quá hạn hoặc đã nghiệm thu |
| 409 | OPEN_COMPLAINT / OPEN_DISPUTE / PENDING_ADJUSTMENT | Còn điều kiện đang chặn |
| 409 | PROPOSAL_NOT_ACCEPTED / INVALID_DECISION_BASIS | Chưa có đồng thuận/căn cứ phù hợp |
| 409 | UNSETTLED_PAYMENT / RECONCILIATION_REQUIRED / PENDING_REFUND | Tài chính còn treo |
| 409 | OUTSTANDING_BALANCE / CLOSURE_BLOCKED / REQUEST_CLOSED | Còn nợ, chưa đủ đóng, hoặc đã đóng |
| 413/415 | FILE_TOO_LARGE / UNSUPPORTED_FILE_TYPE | File quá lớn hoặc bytes/MIME không hợp lệ |
| 501 | FEATURE_NOT_SUPPORTED | Backend/persistence/tích hợp chưa hỗ trợ; không fallback thành công |

## 9. Ranh giới với code và contract cũ

API Flow 6 dùng namespace `/.../aftercare` để không nhận lẫn payload cũ thiếu version/consent/idempotency. Các API cũ acceptance, balance-payment, complaint, settlement không được triển khai song song thành đường bỏ qua guard. Nếu cần giữ compatibility, adapter backend phải dùng cùng service và đầy đủ quyền/guard; không đủ dữ liệu thì từ chối, không tự gán consent/version.

Thay thế phần hậu bàn giao F1-J70–J73 trong tài liệu lịch sử và Operations F4-U01/U02, F5-M07/M08/M09, F5-U02/U03. RequestCases F5-U01 chỉ là compatibility read; incident dùng Flow 5 hiện hành, complaint projection phải theo Flow 6, không hai workflow bồi thường hoặc ledger riêng. Ghi/đóng incident do Flow 5 phụ trách, không Manager đổi status tùy ý trong Operations cũ.

Flow 5 không thể tiếp tục trước bàn giao có nhánh thương lượng kết thúc và handoff nghĩa vụ. Các endpoint aftercare bình thường trong contract này yêu cầu bàn giao hợp lệ; không tạo handover/acceptedAt giả để xử lý kết thúc sớm. Extension pre-handover settlement phải được triển khai riêng và công bố capability thật trước khi nhận handoff F5-J39; khi chưa có trả 501 và giữ hồ sơ nghĩa vụ mở. REFERRED không đồng nghĩa đã hoàn tiền hoặc đóng Trip/Request.

`customerApi.confirmAcceptance/payBalance/raiseComplaint` và hook cũ vẫn dùng kiểu optimistic chưa phù hợp; cần migrate màn hình theo flow6Api trước dùng thật. Các thay đổi Flow1/2 từ lượt trước chưa được đảo hết theo quyết định mới; Flow6 không xác nhận chúng đã hoàn tất.

## 10. Tạo lại và kiểm tra

Từ repository:

```
python contracts/API-Flow/Flow6/build_contract.py
node contracts/API-Flow/Flow6/validate_contract.mjs
```

Trong frontend:

```
npm run contract:check:flow6
npm run test:run -- src/features/aftercare/api/flow6Client.test.ts
npm run build
```

Generator tạo OpenAPI, JSON từng API, flow6.examples.json và đồng bộ mirror/DTO/API client đã có. Các snapshot trong flow6.examples.json là độc lập; giá trị 48/24 giờ minh họa không thay policy máy chủ hoặc quyết định chưa chốt. Validator kiểm schema, examples, mirror, typed client coverage và những trường hợp payload sai. Unit tests mock HTTP để kiểm SDK không giả thành công. Những guard ownership, concurrency, due dates, accounting và webhook ở REVIEW.md phải được backend integration test sau khi triển khai; không gọi chúng là đã pass bằng schema tests.
