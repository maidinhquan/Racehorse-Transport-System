# Flow 1 — lựa chọn thu gọn: không bảng mới, không JSON

Ngày 16/10/2026. **Đại ca đã chọn A1 + B1 + C1 và cho phép hơn 7 cột; không thêm bảng.**
Baseline source: `2ba80f273fa238c6eb3974ceb79ae766516a2fd5` trên Truong.
Quyết định đã có: không thêm bảng; bỏ JSON state trong thiết kế đích; đã chọn gói thu gọn
chức năng/lịch sử A1/B1/C1 trước khi refactor. Cho phép đề xuất cột tường minh
trong bảng hiện có; chưa chốt số cột. Không áp migration hoặc xóa state hiện tại.

## 1. Các phần giữ được và phải giữ an toàn

| Phần | Hướng dùng bảng hiện có, cần thiết kế/migration cột trước khi code |
| --- | --- |
| Estimate/Wizard | TRANSPORT_REQUEST: địa chỉ, latitude/longitude tách kiểu số, country, liên hệ đón, receiver/proxy, distance/provider/pricing version và tổng estimate hiện hành |
| Ảnh/passport ngựa | HORSE giữ tham chiếu private file hiện hành cùng hash; REQUEST_HORSE_MAPPING giữ tham chiếu/hash/thông tin hồ sơ được chốt cho từng request-horse |
| Plan trước Contract | Cột planned dates/preparation/resources/gateways/counts trên TRANSPORT_REQUEST; không tạo Trip hoặc Contract sớm chỉ để vượt FK |
| Contract/PDF | Mỗi hợp đồng phát hành là một row CONTRACT; thêm số phiên bản/liên kết thay thế, PdfFileKey/PdfHash/template/issued fields; giữ PDF cũ và signed receipt, không chỉ PdfUrl |
| OTP | CONTRACT có challenge/digest/expiry/attempt/resend/consumed fields hiện hành; USER có cửa sổ/counter gửi phù hợp; không dùng chung reset OTP và không lưu mã thô |
| Ký và hạn | CONTRACT có signed evidence, original/effective/signed deadline phù hợp; không sửa PDF đã phát hành khi gia hạn |
| Nhiều lần nộp cọc | INVOICE/PAYMENT: mỗi khoản/phiên một row; thêm declared amount, proof/hash, reference, merchant/session/expiry/idempotency fields cần thiết; tổng tiền verified giữ trong SQL tx |
| Activation | Request/Contract/Invoice/Trip hiện có + unique constraints/transaction/idempotency; chỉ tạo Trip một lần sau ký và đủ cọc 40% xác minh |
| Thông báo | NOTIFICATION tiếp tục là thông báo cho người dùng; không biến Message thành kho workflow/serialized payload |
| Concurrency | Cột version/rowversion hoặc cơ chế thích hợp có test stale update; xóa Flow1StateVersion không có nghĩa bỏ kiểm tra đồng thời |

DDL foundation 005 và mapping đã được lập riêng; runtime chưa chuyển đổi. Một loạt cột cần được mapping và kiểm
độ dài/nullable/FK/index với source trước khi chốt số lượng. 7 cột ban đầu không
đủ, kể cả khi giảm lịch sử. File bytes vẫn immutable/private; không chuyển state
sang JSON file/XML/chuỗi phân cách hoặc nhét vào Notification.Message.

LEGAL_MEDICAL_RECORD hiện bắt buộc RequestID: không dùng trực tiếp để thay kho
hồ sơ toàn cục của Horse khi chưa có request nếu không thiết kế lại quan hệ.
REQUEST_HORSE_MAPPING có thể thêm snapshot columns cho hồ sơ hiện hành của mỗi
request-horse. Khi phát hành/ký, cần khóa cập nhật các liên kết mà downstream đang
tham chiếu; PDF version cũ được giữ. Lịch sử đổi hồ sơ qua mọi thời điểm là phần
thu gọn riêng bên dưới.

## 2. Danh sách thu gọn đã chọn

| ID | Hiện có | Đề xuất MVP quan hệ gọn | Hệ quả người dùng cần chấp nhận |
| --- | --- | --- | --- |
| R1 | Manager hỏi nhiều câu, Customer trả lời từng câu | Bỏ module hỏi/đáp; Manager dùng lý do yêu cầu sửa, Customer sửa rồi gửi lại | Không xem được hội thoại/câu trả lời theo từng câu |
| R2 | Đề xuất thay đổi song song, Manager duyệt rồi mới đổi canonical | Bỏ change proposal; sửa trực tiếp chỉ khi CHANGES_REQUESTED trước phát hành; có PDF thì Manager đóng bản cũ trước khi sửa | Khách không tự sửa đơn đang thẩm định/chờ ký; không còn compare proposal/canonical |
| R3 | Lịch sử mọi lần sửa request, plan, lời nhắn | Giữ request/plan/ManagerNotes hiện hành và last actor/time; giữ các Contract đã phát hành | Không dựng lại toàn bộ request/plan trước mỗi lần sửa; không có timeline đầy đủ |
| R4 | Horse document versions đầy đủ | Giữ hồ sơ hiện hành + hồ sơ đã chốt theo request, giữ immutable bytes tham chiếu | Không có màn hình liệt kê mọi lần thay ảnh/passport; cần policy khóa sửa request đã phát hành |
| R5 | Budget/selling nhiều dòng tùy ý và nhiều bản plan | Áp B1 đã chọn; plan chỉ giữ bản hiện hành | Không có lịch sử mọi lần đổi budget/plan; B1 còn mất thêm dòng chi phí tùy ý |
| R6 | Lịch sử gửi/thử/revoke OTP chi tiết | Giữ challenge hiện hành + counters/window + signed receipt thành công | Không có audit từng lần gửi/thử OTP; vẫn giữ expiry/rate/attempt/one-time binding |
| R7 | Lịch sử mọi gia hạn và lifecycle event | Giữ hạn gốc, hạn hiện hành, hạn lúc ký, lần gia hạn gần nhất/actor/reason và counter nếu cần | Không có timeline mọi lần gia hạn; PDF và signed receipt vẫn bất biến |
| R8 | Customer cancellation nhiều đề nghị/quyết định trên một Contract | Áp C1 đã chọn; C1 chỉ giữ đề nghị gần nhất và quyết định hiện hành | Không có danh sách mọi đề nghị hủy cũ; các khoản tiền và chứng cứ ký không bị xóa |
| R9 | Timeline payment/financial-review từng transition/callback attempt | Giữ mỗi PAYMENT với trạng thái cuối, proof/reference/session binding và quyết định review gần nhất | Không có lịch sử đầy đủ pending→rejected/success hay từng callback; receipt đã xác minh và phát hiện callback trùng/mâu thuẫn vẫn bắt buộc |
| R10 | Timeline hold/resume/reconfirm và lịch sử acknowledgement mọi event | Giữ deployment hiện hành + current generation/event + last reason/actor/time + acknowledgement hiện hành ROUTING/DOCUMENTS | Không xem được toàn bộ các vòng hold/resume/ack cũ; event cũ vẫn phải bị từ chối khi ghi |

Đây là **đề xuất thu gọn có chủ đích**, không phải khẳng định mọi mục trên đều
bất khả thi về kỹ thuật khi chỉ dùng bảng sẵn có. Tránh mở rộng một bảng thành
kho sự kiện tổng hợp với hàng loạt cột nullable chỉ để giữ nguyên mọi lịch sử.
Không đổi tên JSON thành text hoặc sao chép cả payload vào một cột khác.

## 3. Ba lựa chọn nghiệp vụ để chốt

### A. Duyệt và sửa đơn — đã chọn A1

- **A1 — khuyến nghị:** Accept / Reject / Request changes. Giữ Customer sửa và gửi
  lại khi Manager yêu cầu; áp R1–R2. ManagerNotes là lý do hiện hành, không là chat.
- **A2 — tối giản hơn:** Chỉ Accept / Reject. Khách tạo request mới nếu cần sửa;
  bỏ cả request-revision/resubmit. Request bị từ chối giữ nguyên để tra cứu.

Cả hai giữ kiểm tra quyền, status, schedule/horse ownership; không cho sửa dữ liệu
đã ký. Đơn có PDF chưa ký muốn đổi phải đóng hợp đồng cũ trước, giữ file cũ.

### B. Plan/budget/báo giá — đã chọn B1

- **B1 — khuyến nghị:** 4 nhóm cố định Transport / Procedure / Veterinary care /
  Insurance. Giữ tổng cost/selling mỗi nhóm bằng cột số, selling/quote PDF freeze
  theo Contract; không additional cost lines tùy ý, không lịch sử plan/budget.
  Vẫn giữ floor/override reason, Manager chỉ tăng preparation và backend tính cọc.
- **B2 — giữ dòng linh hoạt:** Dùng COST_ITEM hiện có nhưng cần đề xuất thêm
  RequestID, phân loại cost/selling và các trường quantity/unit/value, thiết kế
  ContractID nullable cho dòng plan trước Draft, CHECK/FK và quyền theo owner.
  Đây là thay đổi quan hệ của bảng có sẵn, ảnh hưởng module đồng đội; cần review
  tác động trước code. Khi phát hành phải cố định/copy dòng cho đúng Contract,
  không sửa dòng đã gắn bản phát hành. Không tạo Draft sớm để né quan hệ này.

### C. Gia hạn/hủy sau ký và history — đã chọn C1

- **C1 — khuyến nghị:** Giữ gia hạn, Customer đề nghị hủy và Manager review; chỉ
  giữ state/decision/reason gần nhất bằng các cột có kiểu rõ ràng. Áp R6–R10:
  bỏ timeline chi tiết, giữ counters/binding/receipt/Contract/PAYMENT records.
  Khi reject hủy và tiền đã đủ phải xét activation một lần; approve chỉ zero-money,
  không pending, đã đối soát; không tự hoàn tiền.
- **C2 — ít workflow hơn:** Bỏ Customer đề nghị hủy sau ký; giữ Manager gia hạn và
  Manager cancel-overdue sau đối soát. Vẫn giữ các trường deadline/evidence và
  state hiện hành như C1, không có full history. Khách cần hủy liên hệ Manager
  ngoài hệ thống; Manager không được hủy có tiền để né financial review.

Gói đã chọn: **A1 + B1 + C1**, gồm cắt giảm timeline R3–R10, giữ dữ liệu hiện hành
và các chứng cứ đã chốt như câu Question C. A2/B2/C2 không được chọn; giữ mô tả
để biết các phương án đã loại. Xem [mapping cột và kế hoạch chuyển đổi](FLOW1_RELATIONAL_COLUMN_MAPPING.md).
Scope được duyệt không phải quyền xóa dữ liệu thật: cutover/drop vẫn cần operator
review/quyền riêng, test parity và bảo quản dữ liệu/bytes cũ.

## 4. Không thu gọn các guard an toàn

Không bỏ ownership/auth/private files, OTP hash/expiry/rate/attempt/one-time,
PDF/hash/Contract version, chống cộng tiền callback trùng, số thực nhận/đối soát,
transaction/rollback, kiểm tra stale version, Trip exactly-once, effective deadline,
hoặc downstream role/current event guard. Nếu chưa mapping đủ để giữ guard thì
chưa cutover, chưa drop cột JSON/provider cũ.

## 5. Sau khi đã chọn

1. Chốt scope A/B/C và ghi rõ những UAT cũ sẽ thay/retire; không gọi scope mới
   là đầy đủ mọi chức năng/lịch sử của plan cũ.
2. Lập column-by-column mapping source → bảng/cột đích, keys/constraints/indexes,
   DDL và tác động API/FE/module đồng đội. Kiểm lại số cột trước khi triển khai.
3. Triển khai trên DB test riêng, migration/copy/parity và browser use cases theo
   scope mới; giữ dữ liệu/bytes cũ tới khi verified và có quyền cutover riêng.
4. Cập nhật scheduler theo scope mới, chỉ commit source/test đã kiểm chứng. Không
   apply/drop/import business DB hoặc hủy lịch sử thật trong bước chọn scope.
