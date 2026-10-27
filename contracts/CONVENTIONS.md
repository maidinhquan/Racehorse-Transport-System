# Quy ước API — Racehorse Transport System

Cập nhật 24/10/2026. Áp dụng cho thiết kế Flow 1, Flow 2 và Flow 3. Tài liệu mô tả giao thức FE–BE mục tiêu; không xác nhận backend hiện có đã triển khai giao thức này.

## 1. Phạm vi và nguồn chuẩn

- Flow, quyền và điều kiện nghiệp vụ: [FLOW1.md](API-Flow/Flow1/FLOW1.md).
- Toàn bộ ví dụ request/response: [FLOW1-API-JSON.md](API-Flow/Flow1/FLOW1-API-JSON.md).
- Kiểu dữ liệu, required, nullable, enum và giới hạn: [flow1.openapi.json](API-Flow/Flow1/flow1.openapi.json).
- Flow 2: [flow và đối chiếu frontend](API-Flow/Flow2/FLOW2.md), [JSON từng API](API-Flow/Flow2/FLOW2-API-JSON.md), [OpenAPI](API-Flow/Flow2/flow2.openapi.json). Flow 2 mới có contract; caller frontend chưa được tích hợp.
- Flow 3: [flow đã đổi ngày 24/10/2026](API-Flow/Flow3/FLOW3.md), [JSON từng API](API-Flow/Flow3/FLOW3-API-JSON.md), [OpenAPI](API-Flow/Flow3/flow3.openapi.json), [kịch bản](API-Flow/Flow3/flow3.examples.json). Specialist đánh giá khả thi trước lập phương án; Manager duyệt rồi hai bên hoàn tất và xác nhận READY; duyệt khởi hành riêng. Flow 3 thay thế phần điều phối/readiness trùng trong Flow 2; API hồ sơ/danh mục Flow 2 tiếp tục dùng.
- Khi thay đổi payload, cập nhật đồng thời tài liệu liên quan và frontend trong bước tích hợp. Nếu có khác biệt chưa giải quyết, dừng thao tác liên quan; không chọn một mẫu tùy ý.
- Quy tắc ID và SQL do người dùng cung cấp tại `D:/Shared/ID_NAME_RULE.md`, `D:/Shared/HorseTransportDB.sql` là tài liệu tham khảo thiết kế. SQL trong repository là phiên bản khác; chưa kiểm chứng schema của DB đang chạy. Không sửa DB/backend trong công việc này.
- Endpoint cũ trong ứng dụng không phải nguồn thiết kế Flow 1/2/3. Flow 2 xử lý hồ sơ, Flow 3 điều phối đánh giá khả thi tới duyệt khởi hành; xác thực và vận hành sau xuất phát thực tế nằm ngoài phạm vi các contract này.

## 2. URL, xác thực và role

Base: `VITE_API_URL`, mặc định `/api`. Method/path trong tài liệu nằm sau base.

| Prefix | Role |
|---|---|
| `/customer/*` | `CUSTOMER` |
| `/manager/*` | `LOGISTICS_MANAGER` |
| `/specialist/*` | `TRANSPORT_SPECIALIST` |
| `/coordinator/*` | `FLEET_ROUTE_COORDINATOR` |
| `/master/*`, `/locations/*` | Người dùng đăng nhập, chỉ dữ liệu được cấp quyền |

Role chuẩn: `CUSTOMER`, `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `DRIVER_ESCORT`, `ADMIN`. `SYSTEM` chỉ là actor hệ thống trong history. Không truyền role/owner thay cho quyền JWT. Không tự thay USER được chọn bằng một ID nhân viên cố định.

Header JSON: `Authorization: Bearer <token>`, `Accept: application/json`, `Content-Type: application/json`. Upload dùng FormData; bỏ Content-Type để trình duyệt sinh boundary. GET/DELETE và POST được ghi không body phải không gửi body.

Kiểm tra quyền sở hữu trên máy chủ; tài nguyên không có quyền xem trả 404. Sai role trả 403. Request idempotent phải kiểm tra trạng thái hiện hành trong transaction; FE khóa gửi lặp chỉ là hỗ trợ giao diện.

## 3. Envelope, danh sách và lỗi

Thành công JSON:

```json
{"success":true,"message":"OK","data":{}}
```

Lỗi:

```json
{"success":false,"message":"Dữ liệu không hợp lệ","errorCode":"VALIDATION_ERROR","data":null,"errors":{"date":["Ngày không hợp lệ"]}}
```

- `success`, `message`, `data` bắt buộc. Lỗi có `errorCode`; `errors` chỉ cần khi có lỗi field.
- List Flow 1/2 trả `data: []`, không đổi sang `{items,page,...}`. Chưa áp dụng phân trang server; lọc/phân trang hiện tại trên FE. Muốn thêm phải đổi contract và caller cùng lúc.
- Field optional được bỏ khi chưa có; field nullable nhận null khi chưa phát sinh. Arrays luôn là arrays. Không coi response thiếu data hay HTTP lỗi là dữ liệu mẫu hoặc thành công.
- PDF/ảnh thành công trả binary đúng MIME, không envelope. Lỗi tải binary vẫn trả envelope JSON theo status. FE không tạo bản in từ dữ liệu hiện tại để thay một PDF phiên bản tải thất bại.
- 200 đọc/cập nhật; 201 tạo; 400 validation; 401 chưa đăng nhập; 403 sai quyền; 404 không có tài nguyên; 409 sai trạng thái/phiên bản/còn tiền cần đối soát; 429 giới hạn gửi; 500 lỗi máy chủ.
- Chức năng chưa hỗ trợ: 501 `FEATURE_NOT_SUPPORTED` với `data:null`. 404 route chưa triển khai cũng phải hiện lỗi, tuyệt đối không chuyển sang mock. Không hứa toàn bộ trường đã lưu khi backend thực tế bỏ field.

## 4. ID

Backend cấp `<PREFIX>_<D3 tối thiểu>`, ví dụ `USER_001`, `HORSE_001`, `REQUEST_1000`. Bất biến, không tái sử dụng, không sinh từ COUNT+1 ở frontend.

| Đối tượng | ID |
|---|---|
| USER, gồm mọi actor con người | USER_* |
| HORSE | HORSE_* |
| TRANSPORT_REQUEST | REQUEST_* |
| CONTRACT | CONTRACT_* |
| INVOICE | INVOICE_* |
| PAYMENT | PAYMENT_* |
| TRIP_PLAN | TRIP_* |
| NOTIFICATION | NOTIFICATION_* |
| SUPPORTED_ROUTE | ROUTE_* |
| COUNTRY | VN, JP |
| REQUEST_HORSE_MAPPING | (RequestID, HorseID), không ID riêng |
| CONTRACT_VERSION | (ContractID, VersionNo), không ID riêng |

Một hợp đồng giữ nguyên ContractID khi sửa. VersionNo là integer >=1; `v` trong DTO là alias VersionNo; `number` là alias ContractID. Không ContractCode, ContractVersionID, RowVersion, pdfSha256 hoặc base64 token giả trong Flow 1. Không bịa bảng history/file/refund để hợp thức hóa DTO.

## 5. Dữ liệu và giới hạn

- Tiền: VND, số nguyên đồng không âm; không suy đoán tỷ giá cho dữ liệu cũ. Giá trị ngựa `value` là chuỗi số nguyên >0, tối đa 9.999.999.999 VND theo SQL tham khảo.
- Tỷ lệ cọc: 40 nghĩa 40%, không phải 0.40; API trả giá trị thực. FE không tự chốt cọc/default deadline nếu chưa tải policy.
- Date: `YYYY-MM-DD`. Timestamp DTO: `YYYY-MM-DD HH:mm`, múi giờ Asia/Ho_Chi_Minh. Backend chuyển UTC ở lớp persistence. Không thêm Z vào giờ địa phương mà chưa chuyển múi giờ.
- Text được trim trước validation. Giới hạn chính xác từng field xem OpenAPI; FE kiểm tra tiện dụng, BE bắt buộc kiểm tra lại.
- File thật PDF/JPG/JPEG/PNG, tối đa 10 MiB; ảnh chỉ JPG/JPEG/PNG. Object URL chỉ xem trong phiên, không gửi làm URL file đã lưu. Không FILE_* hoặc tệp PDF/JPEG giả thay nội dung người chọn.

## 6. Trạng thái Flow 1

Request DTO:

```text
DRAFT → PENDING_REVIEW → CONTRACT_PREPARATION → CONTRACT_READY
→ DEPOSIT_VERIFIED → ACTIVATED
```

Nhánh sửa đơn: `PENDING_REVIEW → CHANGES_REQUESTED → PENDING_REVIEW`. Nhánh sửa hợp đồng: `CONTRACT_READY → CONTRACT_CHANGES_REQUESTED → CONTRACT_READY` khi phát hành bản mới hoặc giữ bản cũ. Hủy: `CANCELLATION_REQUESTED`, `CANCELLED`; từ chối: `REJECTED`. Các trạng thái vận hành `SCHEDULED`, `IN_TRANSIT`, `DELIVERED`, `CLOSED` thuộc flow sau.

Contract DTO: `ISSUED`, `CHANGES_REQUESTED`, `EXPIRED`, `SUPERSEDED`, `EFFECTIVE`, `FULFILLED`, `VOID`. VersionStatus trong SQL tham khảo là `DRAFT`, `ISSUED`, `SUPERSEDED`, `SIGNED`, `CANCELLED`; mapping `SIGNED → EFFECTIVE`, `CANCELLED → VOID`, feedback pending → CHANGES_REQUESTED; EXPIRED là trạng thái suy ra theo deadline, không ghi trực tiếp vào CHECK SQL.

Payment DTO: `PENDING_CONFIRMATION` (chuyển khoản), `PROCESSING` (gateway đang chờ), `SUCCESS`, `FAILED`, `REJECTED`. Không coi browser Return thành SUCCESS. Chỉ kết quả xác minh có thẩm quyền trên backend được cộng vào tiền cọc.

Trip: `PLANNING`, `READY_TO_DEPART`, `IN_TRANSIT`, `COMPLETED`. `deployment.status` là trạng thái phân công riêng. Hold/resume chưa được bật vì còn giới hạn backend; frontend không tự chuyển ON_HOLD.

## 7. Policy, snapshot và đồng bộ

- Policy lấy từ API options/editor theo tuyến/phương thức đang chọn. Thứ tự tham khảo: COUNTRY (nước đích) → TRANSPORT_MODE → GLOBAL. Không tự giả định phạm vi ROUTE có trong schema hiện tại.
- Giữ hạn hoàn tất máy chủ trả khi publish/extend. Phản hồi giữ hợp đồng không tự gia hạn. Gia hạn là thao tác riêng có lý do.
- Phiên bản đã phát hành phải chứa snapshot customer/route/places/horses, giá, lịch trình, điều khoản và PDF đúng bản. Cả FE Customer và Manager render snapshot; thiếu snapshot thì báo chưa đủ dữ liệu và khóa chấp thuận/ký.
- Cọc và acknowledgement gắn đúng ContractID + VersionNo. Ký thành công trả Request ACTIVATED và TripID thật. FE không tự sinh Trip.
- Mutation chờ API rồi cập nhật/refetch; lỗi giữ nguyên trạng thái nghiệp vụ. Form còn đang soạn chỉ là dữ liệu UI, không phải dữ liệu đã lưu.
- Notifications mark-read và nhắc có endpoint riêng. Khi chưa có realtime, chủ động tải lại sau thao tác; không hứa SignalR đã hoạt động.

## 8. Điểm nối Flow 2–3 sau thay đổi ngày 24/10/2026

Flow 3 là chuẩn cho thứ tự mới: Manager giao snapshot/hạn giao → Specialist đánh giá khoảng khả thi → Coordinator lập phương án → Manager duyệt → hoàn thiện giấy phụ thuộc lịch và booking/nguồn lực → Docs READY + Ops READY cùng bản → Manager duyệt khởi hành. Ngày dự kiến đủ giấy chưa phải READY; không bắt BOOKED/resourcesConfirmed trước duyệt phương án. Hạn giấy kiểm tra tại từng điểm dùng, deadline khách là ràng buộc bắt buộc.

Các endpoint Flow 2 được đánh dấu deprecated/superseded chỉ để tra cứu payload cũ. Những method/path giữ lại (docs-ready, booking, resources/confirm, preparation, readiness, departure/approve) dùng schema Flow 3 khi tích hợp flow mới; không có đường đi qua schema cũ để bỏ gate. Danh mục và xử lý hồ sơ không bị thay thế giữ contract Flow 2. PlanVersion mới là revision bộ phương án, không tự đồng nhất với routeVersion/resourceVersion/flightVersion cũ. EvidenceVersion trong ReadyStamp là revision lúc xác nhận; backend kiểm tra dependency bị ảnh hưởng, không bắt hai stamp được ghi ở hai thời điểm có cùng evidenceVersion.
