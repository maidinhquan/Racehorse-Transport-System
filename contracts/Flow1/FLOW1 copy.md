# FLOW 1 — Tạo yêu cầu, hợp đồng, đặt cọc, ký OTP và kích hoạt chuyến

Ngày cập nhật: 19/10/2026 (Asia/Saigon).

**Trạng thái: ĐÃ KHÓA NGHIỆP VỤ theo các quyết định người dùng xác nhận trong cuộc trò chuyện.** Ánh xạ API, enum và các thông số kỹ thuật chưa được thống nhất không được coi là đã khóa theo tài liệu này.

Tài liệu được viết lại từ bản nghiệp vụ đã thống nhất và bổ sung các quyết định mới nhất về bảo hiểm, phối hợp Flow 2–3 và ranh giới với Flow 5–6. Nội dung FLOW1.md cũ không được dùng làm mẫu hoặc dùng để tự điền các điểm còn thiếu. Đây không phải báo cáo xác nhận code đã triển khai hoặc đã kiểm thử thành công.

## 1. Nguồn và quy tắc áp dụng

1. Quyết định mới được người dùng xác nhận trực tiếp ưu tiên cao nhất.
2. HTML `D:\Shared\CBN_Coordinator_Hai_Chang_Duong_Bo_Xe_Nhan_Su_Doc_Lap.html` là thiết kế frontend mới đang làm việc, chưa phải bản chính thức bất biến.
3. Bản tổng hợp nghiệp vụ ngày 18/10/2026 được tái sử dụng cho những quyết định còn hiệu lực. Các quyết định mới ngày 19/10/2026 được đưa vào bản này; không sao chép trạng thái cũ của các flow khác từ bản tổng hợp đó.
4. Source frontend được dùng để kiểm kê mức độ đáp ứng, không dùng để quyết định thay nghiệp vụ. Khi source khác HTML hoặc bản chốt, phải ghi nhận khác biệt để đồng bộ.
5. Khi thay đổi baseline phải ghi quyết định mới, cập nhật tài liệu và tình huống kiểm thử trước khi sửa code theo nghiệp vụ mới.

Tên trạng thái dưới đây là nhãn nghiệp vụ. Không yêu cầu tạo enum, endpoint hoặc sửa schema chỉ từ tên trong bảng.

## 2. Mục tiêu và ranh giới

Demo hỗ trợ VN→VN và VN→JP. Estimate công khai chỉ tham khảo, không tạo Request/Contract/Trip. Landing và Dashboard dẫn đến cùng quy trình tạo yêu cầu. Customer cung cấp đủ thông tin chuyến, giao nhận, ngựa cụ thể và hồ sơ baseline theo checklist trước khi gửi.

Một yêu cầu được kích hoạt tạo đúng một Trip riêng, không gom nhiều Customer. Flow 1 kết thúc ở Trip PLANNING và bàn giao công việc; chưa có nghĩa đủ điều kiện khởi hành. Flow 2–6 đã có bản chốt riêng trong cuộc trò chuyện. Tài liệu này chỉ ghi các điểm bàn giao liên quan, không thay thế đặc tả chi tiết của các flow đó hoặc tự suy ra chính sách hủy sau ký.

## 3. Luồng chính được chốt

Customer gửi yêu cầu đầy đủ → Manager chấp nhận → Manager chuẩn bị và phát hành hợp đồng có giá chính thức, bao gồm bảo hiểm bắt buộc → Customer đọc và đồng ý nội dung → thanh toán cọc → xác minh đủ cọc → cấp OTP ký hợp đồng → Customer ký bằng OTP thành công → hợp đồng có hiệu lực, Request kích hoạt và tạo đúng một Trip PLANNING.

Không có bước Customer chấp nhận Quotation độc lập. Đồng ý nội dung để thanh toán không phải chữ ký hợp đồng. Xác minh cọc không tự làm hợp đồng có hiệu lực và không tự tạo Trip.

## 4. Bảng trạng thái và quyền thao tác

| Tình trạng | Chủ thể | Thao tác và điều kiện | Kết quả |
|---|---|---|---|
| Đang nhập yêu cầu | Customer | Nhập đủ dữ liệu và hồ sơ bắt buộc | Được gửi xét duyệt |
| Chờ xét duyệt | Manager | Xem dữ liệu để chấp nhận, yêu cầu sửa hoặc từ chối | Lưu quyết định và lý do phù hợp |
| Cần sửa yêu cầu vận chuyển | Customer | Sửa theo phản hồi và gửi lại | Quay về chờ xét duyệt |
| Yêu cầu bị từ chối | Customer | Xem lý do | Kết thúc yêu cầu đó |
| Yêu cầu được chấp nhận | Manager | Chuẩn bị giá, điều khoản, số tiền hoặc tỷ lệ cọc | Tạo hợp đồng nháp |
| Hợp đồng nháp | Manager | Kiểm tra và phát hành | Tạo version phát hành và hạn chung 24h |
| Hợp đồng đã phát hành, chưa trả cọc | Customer | Đọc; yêu cầu sửa hoặc đồng ý và thanh toán | Đi nhánh sửa hoặc thanh toán |
| Có yêu cầu sửa hợp đồng | Manager | Xem các mục được chọn và note | Tạm khóa thanh toán version đang xử lý |
| Manager đồng ý sửa | Manager | Sao chép version cũ vào bản nháp, sửa mục được yêu cầu | Phát hành version mới, reset đầy đủ 24h |
| Manager từ chối sửa | Manager | Ghi lý do; giữ nội dung/version | Reset đầy đủ 24h từ lúc phản hồi |
| Version đã bị thay thế | Customer | Chỉ xem lịch sử | Không thanh toán hoặc ký version cũ |
| Giao dịch đang diễn ra/chờ xác minh | Hệ thống/Manager | Theo dõi và đối soát đúng giao dịch, version, số tiền | Tạm khóa yêu cầu sửa; không cho trả lại tùy tiện khi chưa có kết quả |
| Giao dịch thất bại/hủy đã được xác nhận | Customer | Nếu còn hạn và đủ điều kiện | Có thể thanh toán lại hoặc yêu cầu sửa |
| Cọc đủ và đã xác minh | Customer | Còn deadline hợp lệ | Được cấp OTP để ký |
| OTP ký chưa hoàn tất | Customer | Nhập hoặc gửi lại theo giới hạn | Chưa effective, chưa có Trip |
| OTP đúng và hợp lệ | Hệ thống | Kiểm tra version, cọc, deadline, OTP, tình trạng hủy | Effective + activated + đúng một Trip PLANNING |
| Hợp đồng đã ký | Các bên | Xem bản ký và lịch sử | Không sửa nội dung hoặc thêm phụ lục trong demo |

Yêu cầu sửa Request và yêu cầu sửa Contract là hai thao tác khác nhau. Không gộp chúng thành một trạng thái hoặc một màn hình mà làm mất ngữ cảnh.

## 5. Quy tắc chỉnh sửa hợp đồng

- Customer chỉ được gửi yêu cầu sửa trước khi trả cọc. Từ lúc bắt đầu giao dịch, khóa yêu cầu sửa để tránh thanh toán và phát hành version mới đồng thời.
- Giao dịch chưa có kết quả không được coi là thất bại chỉ vì Customer đóng trang hoặc quay lại từ Sandbox.
- Customer chọn những phần cần sửa và ghi note. Manager tạo bản nháp điền sẵn dữ liệu của version cũ.
- Chỉ các phần được Customer yêu cầu mới mở cho Manager sửa; phần còn lại chỉ đọc.
- Tổng tiền, số tiền cọc, số dư và các giá trị dẫn xuất được tính lại khi đầu vào liên quan thay đổi. Chúng không phải ngoại lệ cho phép tự sửa các mục độc lập khác.
- Chấp nhận yêu cầu sửa và phát hành lại: tạo version mới, giữ lịch sử và ngừng thanh toán/ký bản đã thay thế. Customer phải đọc lại bản mới trước khi đồng ý thanh toán.
- Từ chối yêu cầu sửa: ghi lý do, giữ version và nội dung; cấp lại đầy đủ 24h từ thời điểm phản hồi. Không yêu cầu phát hành version mới chỉ để ghi nhận từ chối.
- Sau khi cọc thành công, không mở lại chức năng sửa hợp đồng. Nếu không tiếp tục ký thì xử lý hủy/hoàn tiền theo quy trình, không chỉnh sửa ngầm hợp đồng có tiền đã nhận.

## 6. Deadline và OTP

Một deadline chung 24h tính từ lúc phát hành hợp đồng bao trùm thanh toán cọc, xác minh cọc và ký OTP. Việc đọc, đồng ý nội dung và yêu cầu sửa nằm trong cửa sổ đang áp dụng; chỉ những sự kiện đặt lại/gia hạn được chốt bên dưới mới thay đổi hạn. Cả frontend và bản mô phỏng phải hiển thị đúng một hạn nghiệp vụ; không tạo hai khoảng 24h liên tiếp cho tiền và chữ ký.

| Sự kiện | Version | Xử lý deadline |
|---|---|---|
| Phát hành lần đầu | Version phát hành đầu | Thời điểm phát hành + 24h |
| Chấp nhận sửa và phát hành lại | Version mới | Thời điểm phát hành lại + 24h |
| Từ chối yêu cầu sửa | Giữ version | Thời điểm từ chối + 24h |
| Gia hạn thủ công | Giữ version/nội dung | Manager chọn hạn mới, ghi lý do và lịch sử |
| Lưu bản nháp chưa phát hành | Chưa thay bản phát hành | Không tự reset deadline |
| Gửi lại OTP | Giữ version | Không kéo dài deadline hợp đồng |

OTP sai hoặc hết hạn không làm mất khoản cọc đã xác minh. Việc gửi lại bị giới hạn theo cấu hình được thống nhất; chưa tự đặt số lần, cooldown hoặc TTL trong baseline này. OTP trong Flow 1 chỉ dùng để ký hợp đồng, không dùng thay xác nhận bàn giao. Flow 6 đã chốt người nhận ký trực tiếp trên màn hình; không có OTP bàn giao trong bản chốt hiện hành.

## 7. Quá hạn, giao dịch đang chờ và hoàn tiền

- Quá hạn không tự hủy Request hoặc tự ký hợp đồng. Khóa các thao tác thanh toán/ký cần deadline còn hiệu lực.
- Nếu tiền đang chờ xác minh, hiển thị tình trạng quá hạn/chờ đối soát. Manager đối soát trước khi gia hạn, hủy hoặc hoàn tiền.
- Tiền được ghi nhận sau deadline không tự mở ký. Manager gia hạn cho khách ký tiếp hoặc hủy và xử lý hoàn tiền, giữ dấu vết thời gian giao dịch.
- Khách đã cọc nhưng chưa ký và hủy/không tiếp tục: hoàn toàn bộ số cọc thực tế đã xác minh. Không tự khấu trừ phí trong phạm vi quyết định này.
- Khách im lặng đến quá hạn không dẫn đến auto-cancel hay auto-refund. Manager quyết định xử lý.
- Tiến trình hoàn tiền phải phân biệt yêu cầu hoàn, đang xử lý và đã hoàn. Chỉ đánh dấu đã hoàn khi có kết quả xác nhận; lưu chứng từ, người xử lý và thời gian.
- Khi việc hủy/hoàn đang được xử lý, không cho hoàn tất ký hoặc tạo Trip trái quyết định hủy.
- Không dùng quy tắc hoàn toàn bộ trước ký để suy ra chính sách hủy sau khi hợp đồng đã ký.
- Nhánh kết thúc vận chuyển sớm ở Flow 5–6 là trường hợp khác: số tiền hoàn do Manager thương lượng với Customer; hệ thống ghi nhận số tiền đã thanh toán và kết quả hoàn tiền nếu có, không tự tính tiền theo từng chặng. Quyết định đó không thay thế quy tắc hoàn toàn bộ cọc đã xác minh khi hủy trước ký ở Flow 1.

## 8. Bất biến dữ liệu và hiển thị

1. Giá chính thức, cọc và số dư lấy từ đúng Contract Version; không hiển thị cùng một hợp đồng cố định cho mọi requestId.
2. Return URL của thanh toán không phải nguồn xác minh tiền. Khi chưa rõ kết quả phải hiển thị đang xác minh, không tự thành công/thất bại.
3. Cọc verified mà chưa ký vẫn có 0 Trip; OTP thành công mới có đúng một Trip. Retry/callback lặp không tạo trùng khoản tiền hoặc Trip.
4. Các bên tham chiếu cùng Request, Contract Version và giao dịch; không ghép các dữ liệu mẫu độc lập thành cảm giác liên thông giả.
5. Lưu người thao tác, thời gian, lý do, trước/sau của quyết định duyệt, sửa, từ chối sửa, deadline, xác minh tiền, OTP, hủy và hoàn tiền.
6. Bản triển khai thật phải kiểm tra quyền, ownership, deadline và transition ở backend. Route guard/nút disabled chỉ hỗ trợ UX.
7. Lần cập nhật này chỉ thay tài liệu FLOW1.md. Không coi việc khóa nghiệp vụ là đã chốt endpoint, enum, schema hoặc đã cho phép sửa source/backend/database.

## 9. Bảo hiểm bắt buộc trong hợp đồng

### 9.1. Trước khi Customer đồng ý và đặt cọc

- Bảo hiểm vận chuyển ngựa là bắt buộc; không có lựa chọn bỏ bảo hiểm để giảm giá.
- Manager xác định nội dung bảo hiểm trong hợp đồng và đưa phí bảo hiểm vào giá chính thức trước khi phát hành cho Customer đọc.
- Hạng mục bảo hiểm phải được thể hiện rõ; số tiền cụ thể không được lấy từ dữ liệu mẫu để coi là giá đã chốt.
- Customer đồng ý nội dung và thanh toán cọc theo giá hợp đồng có bảo hiểm, không mua bảo hiểm riêng trên trang thanh toán.
- Không được suy ra bảo hiểm đã được mua hoặc đã có hiệu lực chỉ vì hợp đồng có dòng phí bảo hiểm hoặc cọc đã được xác minh.

### 9.2. Sau khi bàn giao sang Flow 2

- **Specialist chịu trách nhiệm mua bảo hiểm**, thay cho phương án trước đây giao Coordinator mua.
- Manager xác định nội dung và phí trong hợp đồng; Specialist thực hiện mua, kiểm tra sự phù hợp và hiệu lực theo kế hoạch.
- Specialist chỉ xác nhận Hồ sơ sẵn sàng khi bảo hiểm có hiệu lực và các giấy tờ cần thiết đáp ứng kế hoạch đã được Manager duyệt.
- Cách lưu chứng từ, trường dữ liệu bảo hiểm và tích hợp với bên bảo hiểm thuộc phần thiết kế kỹ thuật; không tự mặc định chỉ cần checkbox hoặc bắt buộc một bộ trường policy cụ thể từ tài liệu cũ.
- Sự cố thuộc phạm vi bảo hiểm được CBN xử lý theo quy trình liên quan. Không mặc định bảo hiểm chi trả mọi sự cố và không chờ bồi thường mới xử lý sự cố.
- Customer không phải trả thêm chi phí khắc phục sự cố ở Flow 5; không mở một nghĩa vụ thanh toán mới từ phần chi phí phát sinh trong hợp đồng Flow 1.

## 10. Bàn giao sang Flow 2–3 và ranh giới các flow

### 10.1. Điều kiện bàn giao

1. Customer đã đồng ý nội dung hợp đồng, cọc đã được xác minh đủ và OTP ký hợp đồng thành công.
2. Hợp đồng có hiệu lực, Request được kích hoạt, có đúng một Trip ở trạng thái PLANNING.
3. Manager cho triển khai và phân công công việc cho Specialist, Coordinator.
4. Hồ sơ ngựa đã nộp được tái sử dụng, không yêu cầu Customer nộp lại toàn bộ.

Trip PLANNING hoặc Manager cho triển khai không có nghĩa đã được khởi hành.

### 10.2. Phối hợp sau bàn giao

- Flow 2 và Flow 3 chuẩn bị song song trên cùng chuyến và cùng phiên bản kế hoạch.
- Specialist kiểm tra hồ sơ đã có, xác định phần cần bổ sung và thời gian có thể đáp ứng.
- Coordinator lập kế hoạch dự kiến và gửi Specialist kiểm tra khả năng đáp ứng hồ sơ. Xác nhận có thể đáp ứng chưa phải Hồ sơ sẵn sàng.
- Nếu chưa phù hợp, Specialist phản hồi lý do/điều kiện cần điều chỉnh; Coordinator sửa kế hoạch và gửi kiểm tra lại.
- Kế hoạch khả thi được gửi Manager duyệt. Sau đó Coordinator hoàn tất booking/nguồn lực; Specialist hoàn tất hồ sơ và mua bảo hiểm theo kế hoạch.
- Specialist xác nhận Hồ sơ sẵn sàng; Coordinator xác nhận Điều phối sẵn sàng. Hai xác nhận độc lập, phải khớp cùng kế hoạch hiện hành.
- Đủ hồ sơ, bảo hiểm, điều phối và các điều kiện liên quan mới trình Manager duyệt khởi hành theo Flow 3; sự kiện xuất phát thực tế thuộc Flow 4.
- Khi đổi lịch, chỉ kiểm tra lại hồ sơ, bảo hiểm, booking, nguồn lực bị ảnh hưởng; giữ lịch sử và không làm lại toàn bộ các phần còn phù hợp.

### 10.3. Thông báo, sự cố và bàn giao cuối

- Các role được tạo thông báo nghiệp vụ cho Customer thông qua hệ thống theo quyền của mình; Specialist có thể yêu cầu bổ sung hồ sơ trực tiếp trên tài khoản khách.
- Riêng phương án xử lý sự cố và lịch điều chỉnh: Coordinator đề xuất cho Manager; Manager xem xét, gửi Customer và tiếp nhận phản hồi; Coordinator triển khai phương án đã thống nhất.
- Địa chỉ giao trong quá trình vận chuyển được giữ nguyên. Khi không thể tiếp tục, xử lý theo nhánh kết thúc sớm và hoàn trả về điểm nhận ban đầu đã chốt ở Flow 5–6; không biến thành thao tác sửa hợp đồng đã ký trong Flow 1.
- Người nhận ký bàn giao trực tiếp trên màn hình ở Flow 6, khác với OTP ký hợp đồng của Customer ở Flow 1.
- Cửa sổ phản hồi 24h của Flow 6 là một quy tắc riêng; không dùng deadline hợp đồng Flow 1 làm mốc bắt đầu phản hồi.

## 11. Tiêu chí nghiệm thu nghiệp vụ và kiểm thử frontend

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| F1-01 | Thiếu dữ liệu/hồ sơ bắt buộc | Không gửi thành công |
| F1-02 | Manager yêu cầu sửa Request; Customer gửi lại | Về chờ xét duyệt, giữ lý do/lịch sử |
| F1-03 | Customer mở hợp đồng | Đúng request/version/giá/cọc; đồng ý nội dung chưa phải ký |
| F1-04 | Customer gửi yêu cầu sửa Contract | Thanh toán tạm khóa, Manager thấy đúng checkbox/note |
| F1-05 | Manager sửa bản nháp | Chỉ sửa các phần yêu cầu và tính lại giá trị phụ thuộc |
| F1-06 | Phát hành version sửa | Có version mới, đủ 24h; bản cũ không còn ký/thanh toán được |
| F1-07 | Manager từ chối sửa | Giữ version/nội dung, có lý do; đủ 24h mới |
| F1-08 | Bắt đầu thanh toán | Khóa yêu cầu sửa trong lúc giao dịch chưa có kết quả |
| F1-09 | Customer quay lại nhưng thanh toán chưa rõ kết quả | Hiển thị chờ xác minh; không tự Paid hoặc cho trả lại ngay |
| F1-10 | Chưa xác minh đủ cọc | Chưa được ký OTP |
| F1-11 | Đã verified cọc, chưa ký | Chưa effective/activated và chưa có Trip |
| F1-12 | OTP sai/hết hạn; gửi lại | Không ký; giữ cọc verified; hạn hợp đồng không đổi |
| F1-13 | OTP hợp lệ trong hạn | Effective, activated và đúng một Trip PLANNING |
| F1-14 | Gửi lại xác nhận ký/callback | Không tạo thêm Trip hoặc ghi nhận tiền kép |
| F1-15 | Hết hạn khi đang chờ xác minh tiền | Chờ đối soát, không tự hủy/ký/kích hoạt |
| F1-16 | Manager gia hạn | Hạn mới được lưu với lý do/lịch sử, không đổi nội dung hợp đồng |
| F1-17 | Hủy trước ký sau cọc | Hiển thị tiến trình hoàn toàn bộ tiền đã xác minh, không báo đã hoàn sớm |
| F1-18 | Đã ký | Không sửa hợp đồng hoặc tạo phụ lục demo |
| F1-19 | Hợp đồng trước khi gửi thiếu nội dung/phí bảo hiểm bắt buộc | Chưa đủ điều kiện phát hành theo nghiệp vụ đã chốt |
| F1-20 | Cọc đủ và xác minh thành công | Chỉ mở bước OTP nếu còn hạn; hợp đồng chưa có hiệu lực và chưa sinh Trip |
| F1-21 | Đồng ý nội dung nhưng chưa thanh toán cọc | Không được cấp OTP ký; đồng ý nội dung không phải chữ ký |
| F1-22 | Thanh toán bắt đầu đồng thời với yêu cầu sửa hợp đồng | Không cho hai nhánh cùng được chấp nhận; version và giao dịch phải nhất quán |
| F1-23 | Giao dịch thất bại/hủy đã được xác nhận, không có tiền đang chờ | Chỉ mở lại thao tác khi còn hạn và đủ điều kiện; không dựa vào việc khách đóng trang |
| F1-24 | Tiền được xác minh sau khi hạn chung đã hết | Giữ tiền và lịch sử đúng thực tế; không tự mở OTP hoặc kích hoạt, Manager xử lý tiếp |
| F1-25 | Lưu nháp sửa hoặc gửi lại OTP | Không tự đặt lại đồng hồ 24h |
| F1-26 | Hủy/hoàn tiền đang xử lý mà có yêu cầu ký đến | Chặn ký/kích hoạt trái quyết định hủy; không sinh Trip |
| F1-27 | OTP ký được gửi lại sau khi lần ký đầu đã thành công | Trả trạng thái đã hoàn tất; vẫn đúng một Trip |
| F1-28 | Trip mới PLANNING, chưa đủ điều kiện Flow 2–3 | Chưa được coi là sẵn sàng khởi hành |
| F1-29 | Bàn giao triển khai bảo hiểm | Specialist nhận trách nhiệm mua và kiểm tra; không gán việc mua cho Coordinator |
| F1-30 | Dữ liệu cũ đề xuất thứ tự ký trước cọc hoặc tự điền thông số chưa chốt | Không dùng làm nguồn thay đổi baseline mới |

Playwright có thể kiểm tra frontend bằng fixtures, localStorage hoặc mock API tùy nguồn dữ liệu thật của màn hình. Phải chặn API nghiệp vụ ngoài dự kiến; không gọi backend thật trong bộ test frontend độc lập. Kết quả đạt chỉ chứng minh hành vi frontend với dữ liệu giả lập, không chứng minh giao dịch VNPAY/OTP/hoàn tiền hoặc transaction backend hoạt động thật.

## 12. Thông số và ánh xạ kỹ thuật chưa chốt

### 12.1. Thông số nghiệp vụ chưa xác nhận giá trị cụ thể

- Tỷ lệ/số tiền cọc cố định cho toàn hệ thống: chưa được xác nhận giá trị trong bản chốt này; số phải trả phải hiển thị rõ trong hợp đồng cụ thể.
- Tiền tệ, bảng giá, thuế, phí và quy tắc làm tròn: không tự kế thừa các giá trị của FLOW1.md cũ.
- Số ngày chuẩn bị tối thiểu theo tuyến/cự ly: không tự lấy các con số cũ làm quyết định đã chốt. Kế hoạch phải có thời gian chuẩn bị khả thi theo đánh giá của các bộ phận.
- Bộ trường hồ sơ chi tiết và điều kiện nhập/lưu/gửi lấy theo HTML hiện hành và các quyết định đã thống nhất; không dựng lại form dựa trên bảng trường của tài liệu API cũ.

Các thông số này cần được xác định trước khi tích hợp thật hoặc công bố giá/điều kiện dịch vụ. Không coi khóa luồng nghiệp vụ là đã chốt tất cả giá trị cấu hình.

### 12.2. Ánh xạ triển khai

Không bổ sung nghiệp vụ mới để lấp các chi tiết kỹ thuật chưa thống nhất: enum literal, endpoint, mã lỗi, TTL/giới hạn OTP, định dạng lưu chữ ký, nguồn đồng hồ server, payment/refund adapter và cơ chế đối soát. Những nội dung này cần hợp đồng dữ liệu và xác nhận người phụ trách trước khi tích hợp thật.

Các hằng số, record demo và trạng thái mock trong React cũ không phải nguồn quyết định cho các chi tiết này. Khi chuyển frontend sang baseline mới, test legacy trái baseline phải được thay thế có chủ đích, không sửa yêu cầu để phù hợp code cũ.

Baseline này ghi nhận phần nghiệp vụ Flow 1 đã được người dùng chốt. Mọi khác biệt được phát hiện khi đối chiếu HTML hoặc SRS phải được liệt kê để giải quyết; không âm thầm sửa yêu cầu hoặc source.


## 13. Nhật ký quyết định áp dụng trong bản này

| Chủ đề | Quyết định hiện hành | Nội dung không áp dụng |
|---|---|---|
| Nguồn viết lại | Bản người dùng chốt trong cuộc trò chuyện và HTML theo thứ tự ưu tiên | Dùng FLOW1.md cũ làm mẫu rồi giữ lại các quy tắc chưa được xác nhận |
| Trình tự hợp đồng | Đọc → đồng ý nội dung → cọc được xác minh đủ → OTP ký → có hiệu lực/kích hoạt/tạo Trip | Ký trước cọc hoặc cọc thành công là tự kích hoạt |
| Đồng hồ | Một cửa sổ 24h; reset khi phát hành lại hoặc Manager từ chối sửa; gia hạn có lịch sử | Tự đặt hai cửa sổ tiền/chữ ký, lưu nháp là reset hoặc gửi OTP là gia hạn |
| Sửa hợp đồng | Trước cọc, đúng mục được yêu cầu; thanh toán đang chờ thì khóa sửa | Sửa bản đang có giao dịch chưa rõ kết quả hoặc sửa hợp đồng đã ký |
| Hoàn trước ký | Hoàn toàn bộ cọc thực nhận đã xác minh, theo dõi đến khi thực sự hoàn xong | Tự khấu trừ phí hoặc coi bấm hủy là đã hoàn |
| Bảo hiểm | Bắt buộc trong giá hợp đồng; Specialist mua, kiểm tra hiệu lực | Coordinator mua hoặc suy ra đã có bảo hiểm chỉ từ khoản tiền đã trả |
| Phối hợp Flow 2–3 | Chuẩn bị song song, cùng kế hoạch, hai xác nhận sẵn sàng độc lập | Một bên tự coi toàn chuyến đã sẵn sàng hoặc dùng lịch cũ để xác nhận |
| Kết thúc sớm Flow 5–6 | Hoàn trả về điểm nhận ban đầu; số hoàn do Manager thương lượng, hệ thống ghi nhận | Tự tính hoàn theo chặng hoặc áp ngược sang quy tắc hoàn trước ký |
| Mức độ hoàn thành | Khóa bản nghiệp vụ; API/code phải được đối chiếu riêng | Tuyên bố endpoint, database hay kiểm thử đã đáp ứng chỉ vì tài liệu được cập nhật |

Các tài liệu Role/API, SRS, HTML và source cần được đối chiếu theo bản này khi có yêu cầu cập nhật. Lần thay đổi này chỉ viết lại FLOW1.md, không tự sửa các tài liệu hoặc mã nguồn phụ thuộc.
