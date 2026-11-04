# API Contract — Flow 3: lập tuyến, bố trí nguồn lực và duyệt khởi hành

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản | 3.0.0 — 30/10/2026, theo luồng đã thống nhất |
| Nguồn nghiệp vụ | Luồng được chốt ngày 30/10/2026; HTML cũ chỉ tham khảo giao diện |
| Phạm vi | Contract v3 mục tiêu; các thay đổi v3 chưa được tích hợp vào backend/giao diện đang chạy |
| Đầu vào | Trip PLANNING, Request ACTIVATED, Contract EFFECTIVE, cọc đã xác minh, deployment CONFIRMED, đã giao Specialist/Coordinator |
| Kết thúc | Manager duyệt khởi hành: Trip READY_TO_DEPART, Request SCHEDULED; DEPARTED thuộc Flow 4 |

[JSON từng API](FLOW3-API-JSON.md) · [OpenAPI](flow3.openapi.json) · [Kịch bản nghiệm thu](flow3.examples.json) · [Quy ước](../../CONVENTIONS.md).

## 1. Quy trình đã chốt

**Phương thức do Manager chọn trong hợp đồng Flow 1.** Flow 3 đọc `mode`, `contractVersion` và `modeSource=CONTRACT`; không có API đổi phương thức. Đổi phương thức phải xử lý hợp đồng theo Flow 1, không sửa kế hoạch để vượt hợp đồng.

Khách chọn **ngày nhận ngựa** (`pickupDate`). Coordinator chọn **giờ nhận cụ thể** (`pickupAt`), tính giờ đến/rời từng điểm, bàn giao, di chuyển, nghỉ và giờ giao dự kiến. `plannedDepart` là giờ rời điểm nhận sau bàn giao, do server tính. Plan bắt đầu ở `effectivePickup`, không phải bãi xe. Chặng xe rỗng từ bãi đến nơi đón thuộc điều xe nội bộ; vẫn kiểm tra xe/người đến kịp giờ nhận nhưng không đưa bãi vào hành trình chở ngựa.

- ROAD: **Nhận ngựa → điểm nghỉ cần thiết → giao ngựa**.
- AIR: **Nhận ngựa → nghỉ nếu cần → sân bay đi → sân bay đến → nghỉ nếu cần → giao ngựa**.
- Không tự chèn điểm y tế/cách ly. Chỉ thêm điểm đó khi có yêu cầu thực tế của chuyến/Flow 2.
- Coordinator gửi **toàn bộ tuyến và lịch trình**, xe/người, giờ hoạt động cơ sở, lịch bay nếu có cho Manager kiểm tra. Manager APPROVE hoặc RETURN kèm lý do. Quá hạn giao/lệch ngày nhận là cảnh báo khi gửi xem xét; không được tự đổi cam kết. Manager chỉ APPROVE khi hợp đồng hiện hành đã cho phép lịch đó; cần đổi cam kết thì Manager lấy đồng ý khách và xử lý Flow 1 trước, rồi lập/tính/gửi lại phương án.


Sau giao việc, hai nhánh chạy ngay và song song: Specialist xử lý hồ sơ khách/CBN, bảo hiểm, kiểm dịch bằng Flow 2 rồi xác nhận Docs READY; Coordinator lập tuyến, bố trí xe/người, chọn dịch vụ bay, gửi Manager duyệt và hoàn tất vận hành. Không bắt Coordinator đợi planning-feasibility, earliestReadyAt hoặc danh sách giấy tờ có thời hạn.

Theo giả định đồ án trong frontend này, giấy tờ được xem là còn hiệu lực suốt chuyến. Vẫn bắt đủ hồ sơ được duyệt, bảo hiểm VERIFIED bao phủ lịch chuyến và lịch kiểm dịch bắt buộc được xác nhận. Checklist rỗng/chưa áp bộ yêu cầu không tự READY. Chứng chỉ nhân sự vẫn kiểm tra hạn. Thay lịch/tuyến/bộ yêu cầu/bảo hiểm phải đánh giá lại dấu READY liên quan.

### ROAD

1. Lưu nháp tuyến và xe + MAIN_DRIVER, CO_DRIVER, VETERINARIAN.
2. Tính tuyến, kiểm tra nghỉ/chăm sóc, hạn giao, tiếp cận địa chỉ và giới hạn xe. Coordinator xác nhận bố trí nguồn lực **trước submit**.
3. Gửi cả tuyến và nguồn lực đã xác nhận; Manager duyệt/trả có lý do. Chưa cần Docs READY tại mốc này.
4. APPROVED + xác nhận nguồn lực còn đúng tạo Ops READY do server tính.

### AIR

1. Chọn bên dịch vụ và nhập mã do bên đó cung cấp. Lookup đúng partnerId + providerFlightCode, trả lịch/giá/sân bay/chăm sóc/sức chứa và lỗi phù hợp Trip.
2. Lập ROAD trước/sau bay: hai xe và sáu người riêng, ba vị trí mỗi chặng. Không bố trí bác sĩ CBN trên máy bay; đối tác chịu trách nhiệm chăm sóc khi bàn giao/chờ/bay.
3. Gửi phương án tổng thể với nguồn lực **dự kiến**. Manager duyệt tuyến, nguồn lực dự kiến và ngân sách trong cùng quyết định. **Không bắt booking/resourcesConfirmed trước mốc này.**
4. Coordinator liên hệ và đặt dịch vụ bên ngoài, ghi nhận booking đúng bản duyệt rồi xác nhận nguồn lực thực tế. Server tính Ops READY.

Nút duyệt chi phí bay riêng vẫn có API nhưng không thay duyệt tổng thể, không giữ chỗ và không mở booking khi plan chưa APPROVED. Submit tổng thể tự đưa flight DRAFT/REJECTED sang BUDGET_PENDING; approve tổng thể đồng thời duyệt đúng ngân sách đó. Một bên không đáp ứng thì tra bên khác; không tự sửa hợp đồng/hạn giao hoặc sinh chuyến/booking giả.

### Hội tụ

Manager đọc readiness rồi duyệt khởi hành riêng khi Docs READY + Ops READY còn đúng, đủ bảo hiểm/kiểm dịch/booking AIR, nguồn lực khả dụng, tuyến/địa chỉ hợp lệ và không sự cố chặn. POST recheck trong transaction; GET không đủ để ra quyết định. Duyệt phương án không tự khởi hành.

## 2. Phiên bản và giữ nguồn lực

`version` là revision tổng hợp planning của Trip, tăng sau mỗi mutation thành công. Mọi mutation gửi expectedVersion; catalogue dùng revision từng record. `contextVersion` tăng khi đầu vào Flow 1/phân công đổi. `planVersion` là revision nội dung, tăng đơn điệu khi sửa nội dung; submit/rút/quyết định chỉ tăng version. Không dùng v/routeVersion HTML làm khóa backend. Draft/approvedPlan tách riêng, draft có thể thiếu; submit bắt đủ.

Server lưu resourcesConfirmed/docsReady/routing/pickupAccess kèm dependency snapshot, actor/time và valid/invalidatedReason. Docs READY có thể lập trước phương án; không bắt version tổng hợp của hai dấu bằng nhau. Backend đối chiếu dependency với approved plan hiện tại; thay đổi ảnh hưởng mới vô hiệu dấu. Xác nhận dấu bên kia không tự hủy dấu còn đúng. Khi planVersion đổi, server tái đánh giá; client không tự mang READY sang bản mới.

ROAD confirm trước submit kiểm tra và giữ tạm nguyên tử. AIR draft không giữ; submit giữ tạm nguyên tử. Manager duyệt chuyển sang phân công xác nhận. Một xe/người chỉ thuộc một Trip active, kiểm tra toàn hệ thống, không chỉ danh sách UI; không dùng lại giữa hai ROAD của AIR. Trả/rút giải phóng đúng giữ tạm, không giải phóng approved cũ. Không tự hết hạn hold nếu chưa có policy.

J12 tạo draft thay thế có lý do, giữ approved snapshot và lịch sử. Có bản sửa mở thì chặn departure. Duyệt mới chuyển nguồn lực/thay approved nguyên tử. Booking BOOKED không overwrite: J20 ghi nhận hủy đối tác trước duyệt bản thay flight/lịch/số ngựa; chỉ giữ booking nếu backend xác minh không bị ảnh hưởng. Rút draft không tự hủy booking.

Idempotency-Key UUID bắt buộc mọi mutation, scope actor + method + path; lưu bền vững >=24h. Cùng key/body chuẩn hóa trả cùng kết quả; khác body IDEMPOTENCY_CONFLICT. Key khác + revision cũ STALE_VERSION. Kiểm JWT/scope trước replay. POST validate chỉ đọc không cần key; POST routing/truck-check lưu bằng chứng nên cần key. Không nhận actor/time/status/READY/deadline/giá đối tác từ client.

## 3. Tuyến, địa điểm, nghỉ và bản đồ

Điểm nhận/giao là snapshot request riêng tư, không thêm vào catalogue công cộng. Place có nhiều chức năng REST/FUEL/QUARANTINE/BORDER/AIRPORT. placeId là khóa opaque server cấp; adapter checkpoints cũ giữ kiểu khóa nguồn, không suy DB ID từ PL-* demo. Trip/request/horse/vehicle/user theo TRIP_*/REQUEST_*/HORSE_*/VEHICLE_*/USER_*. EMP-* trong HTML phải map USER_*, không tạo actor mới. serviceId opaque; bookingId integer.

Stops theo thứ tự, ORIGIN/DESTINATION cố định; không xóa/đổi type để né điểm bắt buộc. Một place đa chức năng có nhiều purposes trong một lần ghé. AIR có hai AIRPORT kề nhau, một chuyến thẳng, hai ROAD độc lập. Backend resolve tọa độ/place/private endpoints và tính giờ, không tin geometry/plannedAt/ETA client.

Leaflet hiển thị; OSRM tham khảo đường bộ, không chứng minh hạn chế xe tải. Routing phía server trả geometry từng đoạn [lat,lng], km, duration, lịch arrive/depart. Không nối thẳng tọa độ rồi gọi là đường thực. DEMO/SIM chỉ Trip demo khi capability cho phép, nhãn rõ; không dùng duyệt chuyến thật.

Policy demo lấy J01, version và nhãn “Đề xuất cho đồ án”, không là luật: careIntervalH=4, shortRestMin=45, roadEpisodeH=12, recoveryRestH=8, truckFactor=1.2, airportHandoverH=3, airportReceiveH=2. Thiếu cấu hình chặn tính/submit, không tự default. Không nhân truckFactor hai lần.

- Cộng dồn lái + chờ không nghỉ đến lần chăm sóc hợp lệ; không vượt careIntervalH, kiểm ngay trước khi tới trạm.
- REST cần active, chỗ xe, nước/thức ăn, đủ capacity, mở cửa toàn khoảng ghé, dwell >= shortRestMin. Nghỉ trên xe cần onboardCare; xuống xe cần loadingArea + stabling.
- Nghỉ ngắn reset care clock, không reset roadEpisode. Chỉ hồi phục ngoài xe đủ recoveryRestH reset đợt đường bộ; đổ xăng/kiểm dịch không tự là nghỉ.
- Giờ mở 24/7 hoặc HH:mm–HH:mm, hỗ trợ qua đêm. Toàn khoảng ghé nằm trong giờ mở, hai đầu bằng nhau không hợp lệ.
- AIR đến sân bay trước giờ bay ít nhất airportHandoverH; tiếp nhận sau hạ cánh airportReceiveH. Care confirmation gắn flight version; bay không là nghỉ hồi phục. Reset clock đường bộ chặng đến chỉ khi có bàn giao chăm sóc rõ.
- ETA server gồm lái/dừng/bay/bàn giao. Nếu ETA > deliveryDeadline hoặc pickupAt lệch pickupDate, J07/J08 trả reviewWarnings để Manager kiểm tra; riêng lỗi lịch này không chặn gửi. J11 APPROVE và J18 vẫn chặn cho tới khi phương án phù hợp hoặc cam kết mới đã được khách đồng ý và ghi nhận qua Flow 1. Reason không vượt qua gate.

Place create/update chặn trùng tọa độ trong 50m, ưu tiên thêm chức năng vào địa điểm hiện có. Place đã tham chiếu kể cả history không xóa; đổi trạng thái không rewrite approved snapshot. Catalogue capacity là khả năng cơ sở, không phải chỗ trống realtime.

## 4. Xe, nhân sự và tiếp cận

Request 1–4 ngựa, kiểm mapping thực không tin count client. Xe READY, đủ stalls, đúng quốc gia/khu vực, không bảo trì/xung đột. Ba người khác nhau: hai DRIVER và một VETERINARIAN đủ chuyên môn/chứng chỉ đến hết khoảng phân công. AIR hai xe/sáu người khác nhau đúng quốc gia chặng. Không coi một EscortID là đủ hai vị trí.

Flow 3 không thêm/xóa hồ sơ nhân viên. Coordinator/Manager chỉ đổi ACTIVE/ON_LEAVE/INACTIVE. Người đang IN_TRANSIT phải thay qua flow sự cố trước nghỉ/ngừng. Thay trạng thái vô hiệu xác nhận nguồn lực Trip PLANNING liên quan và báo Manager. Trip READY_TO_DEPART bị ảnh hưởng phải chặn xuất phát, xử lý lại phê duyệt; không dùng READY cũ vượt gate.

vehicle.spec là kích thước/grossT cố định từ phân hệ xe đã xác minh, không suy từ stalls như fixture HTML. So pickup.access/delivery.access (maxHeightM/maxWidthM/maxLengthM/maxWeightT, dùng grossT). AIR outbound so pickup, inbound so delivery. Chưa có giới hạn khai báo không tự bịa giới hạn, vẫn xác minh tiếp cận. J27 trả eligible/blockers để lọc xe.

TruckProfile theo road/outbound/inbound: heightM,widthM,lengthM,currentT,grossT,axleT >0; currentT<=grossT; axleT<=currentT; vehicleId đúng xe. Không cho giảm kích thước/grossT khác spec để né hạn chế. J26 kiểm đường cấm/cầu/hầm theo đúng xe/lịch/stops, lưu server evidence; client không gửi ok/provider/signature. HERE_TRUCK là provider mục tiêu trong HTML; key/config ở server, không nhận key/URL tùy ý từ client. Provider lỗi trả 503 ROUTING_UNAVAILABLE, không fallback thành verified. Snap endpoint lệch >250m hoặc critical/violation/restricted notice chặn.

HTML cuối file ẩn khối truck/access, guard submit cuối chỉ kiểm số ngựa. Contract vẫn bắt các điều kiện này tại submit/approve/departure; khi tích hợp FE cần hiện lại thao tác hoặc kết quả xác minh để hoàn tất, không chỉ hiện lỗi sau duyệt.

## 5. Xe không vào được: đề xuất qua Manager và khách hàng

1. **J28 — Coordinator xác minh INACCESSIBLE:** ghi lý do/bằng chứng theo địa chỉ, kích thước xe và phương án đang xét. Không tự đổi điểm nhận.
2. **J29/J30 — Coordinator tìm và đề xuất điểm tập kết:** có địa chỉ/tọa độ, giờ bàn giao, lý do, ảnh hưởng lịch và chi phí dự kiến, trách nhiệm khách tự đưa ngựa ra. Điểm phải phù hợp tiếp nhận ngựa, có chỗ xe/lên xuống/nước/sức chứa và mở trong giờ hẹn; không bắt buộc là cơ sở y tế/cách ly. Trạng thái PROPOSED, gửi Manager.
3. **J31 — Manager kiểm tra:** APPROVE → MANAGER_APPROVED; RETURN → RETURNED kèm lý do để Coordinator làm lại. Chưa đổi điểm nhận.
4. **J56 — Manager gửi khách:** đóng băng snapshot và proposalVersion, chuyển AWAITING_CUSTOMER. Gửi thông báo không phải khách đồng ý, không đổi ORIGIN.
5. **J57/J32 — Khách xem và quyết định:** chỉ chủ đơn xem bản đã gửi và dùng tài khoản của mình ACCEPT hoặc REJECT. Manager/Coordinator không xác nhận thay. ACCEPT → CUSTOMER_CONFIRMED; REJECT cần lý do → CUSTOMER_REJECTED và báo Manager/Coordinator đề xuất phương án khác.
6. **Chỉ sau ACCEPT** mới cập nhật effectivePickup/ORIGIN nháp bằng đúng snapshot khách chấp nhận. Giữ pickup gốc và lịch sử; tăng version, vô hiệu routing/xác nhận nguồn lực/Ops READY liên quan, tính lại tuyến/lịch và gửi Manager duyệt phương án hoàn chỉnh.

Trong lúc chờ hoặc khi khách từ chối, giữ nguyên điểm nhận **đang có hiệu lực**. J33 tạo bản đề xuất mới, giữ lịch sử và thoả thuận cũ; không tự quay về điểm gốc hay áp địa điểm mới. Chỉ lần ACCEPT mới thay effectivePickup.

Mỗi quyết định gắn relocationId + proposalVersion bất biến. Đổi địa điểm/toạ độ/giờ/ảnh hưởng sau khi gửi phải tạo bản mới và xin lại quyết định; bản cũ trả STALE_PROPOSAL. Recheck placeVersion, xe/profile, giờ hoạt động và assignment trước khi chuyển trạng thái. Cơ sở không còn phù hợp thì chặn áp dụng, không thay bằng nơi khác tự động.

Khách chỉ nhận projection gồm điểm cũ/mới, lý do, giờ, ảnh hưởng và trách nhiệm; không nhận Context chứa bản nháp, ngân sách nội bộ hoặc nhân sự. Idempotency-Key dùng cho gửi và quyết định; gửi lại cùng key/cùng nội dung trả cùng kết quả, không đổi ORIGIN hai lần. Chỉ thông báo chứ chưa bấm đồng ý không tạo consent.

Việc đồng ý điểm nhận không tự sửa giá/hạn trong hợp đồng hoặc thu phí. Nếu cần thay cam kết, Manager xử lý qua Flow 1; trước khi duyệt tuyến phải khớp hợp đồng có hiệu lực. Điểm giao không đổi bằng nhóm API này.

## 6. Đối tác bay và booking

Coordinator CRUD bên dịch vụ, Manager chỉ đọc catalogue. Tuyến/lịch bay đối tác cung cấp là read-only, không có endpoint Coordinator tự tạo/sửa/xóa schedule. Catalogue demo sample=true. Không có lịch phù hợp trả data=[]/blockers để tra bên khác; không hứa thực tế luôn có chuyến.

Lookup mã trim/case-fold trong đúng partner. Cùng partner có nhiều lịch cùng mã trả FLIGHT_CODE_AMBIGUOUS kèm candidates; chọn serviceId rõ. Chọn serviceId+catalogVersion vào draft; server snapshot partner/code/airports/local times+IANA zones/giờ chuẩn/giá VND/capacity/care. Quy đổi VN/JP cùng instant trước so sánh, không so chuỗi local. USD demo phải thay báo giá VND đã xác nhận; không đổi nhãn hay đoán tỷ giá. Chi phí vận hành không sửa giá khách.

Budget DRAFT → BUDGET_PENDING → BUDGET_APPROVED/REJECTED; plan DRAFT → PENDING_APPROVAL → APPROVED/RETURNED. J11 duyệt tổng thể AIR gồm ngân sách. J40/J41 cho nút chi phí riêng, không thay J11. BUDGET_APPROVED không là BOOKED.

J13 sau APPROVED tổng thể + đúng budget snapshot. bookingRef 4–100, confirmedHorses đúng số ngựa, acknowledged=true, source PARTNER_REFERENCE/DEMO. File tùy chọn từ J42, không object URL/base64 giả. Không trùng mã trim/case-fold cùng đối tác ở Trip khác. Recheck catalogue/khả dụng/lịch/giá/care; thay đổi trả FLIGHT_CATALOG_CHANGED, không tự refresh approved snapshot. DEMO chỉ Trip/capability demo. Upload PDF/JPEG/PNG thật <=10 MiB, kiểm nội dung/MIME/quét và ownership trước gắn; download luôn xác thực, không trả binary giả.

J20 ghi nhận hủy đã được đối tác xác nhận (hoặc demo), reference/lý do/evidence/history. Không gọi API hãng thật hoặc báo hoàn tiền chỉ bằng ghi nhận hủy. Partner có tham chiếu không xóa. Đổi catalogue không sửa snapshot, nhưng vô hiệu bằng chứng liên quan và chặn khi không còn phù hợp.

## 7. READY và giao thức

J14 ROAD confirm ở draft đủ bộ, AIR sau approved+booking. Response có resourcesConfirmed và opsReady server tính. J15 recheck/reconfirm cho caller cũ cùng gate; UI chỉ cần nút J14, không bắt thêm nút Ops READY. J16 Specialist xác nhận đủ hồ sơ/bảo hiểm, được trước duyệt tuyến; phụ thuộc đổi phải kiểm lại. Không dùng 0/0 hoặc boolean client để READY.

J18 nhận expectedVersion+approvedPlanVersion+readinessVersion vừa đọc. Transaction khóa/đọc lại tất cả dependency; quá plannedDepart, còn draft thay đổi hoặc điều kiện đổi trả READINESS_CHANGED/blockers. Thành công cập nhật Trip+Request, audit/notification nguyên tử, không tạo DEPARTED. Sau READY_TO_DEPART khóa sửa planning/hồ sơ; lùi lịch/thu hồi phê duyệt là workflow riêng, không tự unlock. Driver vẫn kiểm trước xuất phát thực tế. Sự cố/khả dụng đổi phải chặn dù từng approved.

readinessVersion do server cấp cho tập kết quả kiểm tra/dependency, không phải timestamp client hoặc planVersion. Thay đổi nguồn ngoài/capability/thời gian làm gate đổi phải được phát hiện khi đọc/lệnh duyệt, kể cả version của nội dung plan chưa đổi. J17 trả checks có code/group/tab/label/ok/detail cho checklist của frontend và blockers cho lý do chặn; client không tự tính canApproveDeparture từ vài cờ.

Base /api; Bearer JWT. Customer chỉ chủ đơn được gọi J57/J32. Role FLEET_ROUTE_COORDINATOR (HTML alias FLEET_COORDINATOR), TRANSPORT_SPECIALIST, LOGISTICS_MANAGER. Staff chỉ Trip được giao; Manager trong scope quản lý; file/history cùng kiểm quyền. 403 sai role, 404 ngoài scope. Place/partner mutation chỉ Coordinator; staff-status cho Coordinator/Manager. Không CRUD xe từ Flow 3.

Envelope {success,message,data}; list data array. ID/status/version/time server cấp. Timestamp YYYY-MM-DD HH:mm theo Asia/Ho_Chi_Minh, kiểm ngày lịch thật, lưu UTC. Tiền nguyên VND. Error có errorCode/blockers[{code,field,message}], không SQL/stack. 400 validation, 401 auth, 403 role, 404 scope, 409 business/stale, 413 quá file, 415 MIME, 429 rate, 500 internal, 501 unsupported, 503 provider lỗi. Capability false trả 501, không fallback mock.

Các mã chính: STALE_VERSION, IDEMPOTENCY_CONFLICT, DEPLOYMENT_REQUIRED, PLAN_LOCKED, RESOURCE_CONFLICT, RESOURCES_NOT_CONFIRMED, INVALID_CREW, VEHICLE_ACCESS_RESTRICTED, PICKUP_CONSENT_REQUIRED, PLACE_CHANGED, CARE_POLICY_VIOLATION, DELIVERY_DEADLINE_EXCEEDED, ROUTING_REQUIRED, TRUCK_ROUTE_REQUIRED, FLIGHT_PROVIDER_MISMATCH, FLIGHT_CODE_AMBIGUOUS, FLIGHT_CATALOG_CHANGED, PLAN_NOT_APPROVED, OLD_BOOKING_ACTIVE, BOOKING_REFERENCE_DUPLICATE, DOCS_NOT_READY, READINESS_CHANGED, DEPARTURE_APPROVAL_LOCKED, RECORD_REFERENCED, CONTRACT_SUPERSEDED.

## 8. Chuyển đổi endpoint cũ

| Cũ | Chuẩn v3 |
|---|---|
| F3-J03 planning-feasibility | Retired, không là gate; mutation cũ 409 CONTRACT_SUPERSEDED |
| F3-J21/J22 timed-documents | Retired khỏi planning; lịch nằm plan-draft, không unlock hồ sơ |
| F2-J53/J54 timed-documents | Chỉ metadata/history nếu còn hiển thị; không block giấy; lệnh tuần tự cũ CONTRACT_SUPERSEDED |
| F3-J06/J08/J11 | Giữ URL, schema v3, ROAD/AIR gate khác nhau |
| F3-J13/J14/J16/J17/J18 | Giữ booking/resources/docs-ready/readiness/departure URL, một schema v3 |
| F2 route-draft/resources/flight-proposals | Caller chuyển Flow 3, không chạy workflow cũ song song |
| F2-J36/J37 | Giữ URL vehicle/staff, mở rộng projection spec/status/assignment |
| F2-J38 checkpoints | Adapter đọc cùng catalogue places, không hai nguồn khác nhau |
| J32 Manager ghi nhận consent | Retired; J56 Manager gửi và J32 Customer tự quyết định, không xác nhận thay |
| J06 plannedDepart input | Thay bằng pickupAt; plannedDepart do server tính sau bàn giao |
| Flow 1 | Giữ contract riêng về cọc/ký/kích hoạt/giao việc, chỉ đọc kết quả |
| Flow 4–5 | Khởi hành thực tế, báo cáo đường/sự cố/thay người đang chạy thuộc vận hành |

OpenAPI/JSON Flow 3 là nguồn schema v3; chỉ dẫn role cũ trỏ URL khác phải chuyển theo bảng này. Backend triển khai công bố capability.version=3.0.0; không hai schema để bỏ gate. Không tuyên bố DTO/revision/snapshot đã có bảng/migration; cần triển khai persistence, hold, file, audit, idempotency và provider riêng.

## 9. Ánh xạ frontend và nghiệm thu

| Script/màn hình Final_Flow3.html | API |
|---|---|
| canPlan/parallelLanes/f/monitor/f/trip | J04/J23/J24 |
| placesPage/pl-edit/pl-status/pl-del | J43–J47 |
| pl-geo/geoSearch và chọn tọa độ | Tái dùng F1-J10 `GET /locations/search` theo contract Flow 1; giới hạn quốc gia và scope phù hợp, chọn kết quả không tự lưu place |
| rpRoute/rpCalc/rpWriteTimes/Leaflet/journeyDetail | J25/J26/J07 |
| f-vehicle/groundLegs/f-crew-save | J06/J14/J27 |
| f3-staff-status/f/crew | J48/J49, không thêm/xóa nhân viên |
| f3-truck-profile/check, f3-pickup-* | J06/J26/J28–J33/J56/J57; Manager gửi, khách phản hồi qua portal |
| air-rental-providers/svc-code/svc-partner | J05/J34–J39/J50/J51/J54 |
| fa-send/m-flight/fa-revision | J40/J41/J12 |
| f-route-submit/m-route-approve/m-route-return | J08/J11 |
| f-flight-book/recordBooking | J13/J42/J52 |
| s-docs-ready/readiness/m-approve-depart | J16/J17/J18 |
| Driver report markers | J53 đọc từ Flow 5, gắn milestone, không GPS/traffic realtime |

Kịch bản trong flow3.examples.json là mục tiêu nghiệm thu, không bằng chứng API đã chạy. Validator kiểm ref/schema/mẫu request-response/input âm/đồng bộ tài liệu và fixture. Khi triển khai cần integration: hai Trip tranh xe chỉ một thành công; retry không trùng; role/scope/file; ROAD pre-confirm; AIR không vòng lặp booking; stale catalogue/consent/READY; rollback approve/departure và history.

Phương thức vận chuyển do Manager chọn khi lập hợp đồng. Điều phối sử dụng phương thức trên hợp đồng; không chọn lại trong tab Tuyến đường.

## 10. Tích hợp v3

Xem [MIGRATION-V3.md](MIGRATION-V3.md). Không đổi import runtime sang v3 trước khi backend/DTO/khách hàng được triển khai cùng nhau. Bản `frontend/src/contracts/flow3.v3.openapi.json` là mirror thiết kế; `flow3.openapi.json` đang được ứng dụng import vẫn giữ v2 trong giai đoạn chuyển đổi.
