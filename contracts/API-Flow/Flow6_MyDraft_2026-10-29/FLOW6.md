# API Contract — Flow 6

Phiên bản 1.0.0 — 27/10/2026. **Thiết kế đích, chưa chứng nhận backend/FE đã triển khai.** Chỉ tạo tài liệu trong folder Flow6; không sửa schema, backend hay hợp đồng của flow khác.

## 1. Đọc bộ tài liệu

| File | Mục đích |
|---|---|
| [FLOW4_TO_FLOW6_HANDOFF.md](FLOW4_TO_FLOW6_HANDOFF.md) | Đầu vào tại đích trước khi giao xong; giữ nguyên tài liệu được cung cấp |
| FLOW6.md | Quyền, nghiệp vụ, trạng thái, tiền, transaction và giới hạn |
| [FLOW6-API-JSON.md](FLOW6-API-JSON.md) | Danh sách đầy đủ API, request, response, guard, retry và lỗi theo endpoint |
| [FIELD-DICTIONARY.md](FIELD-DICTIONARY.md) | Mỗi field có tác dụng, nguồn SQL hoặc công thức; không có field trang trí |
| [flow6.openapi.json](flow6.openapi.json) | Schema máy đọc, required/nullable, enum và kiểu |
| [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md) | Phụ thuộc module dùng chung, quyết định API đề xuất và giới hạn cần hiểu trước khi code |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Ma trận nghiệm thu; phân biệt kiểm tra schema với chạy E2E |
| build_openapi.py / validate_contract.py | Nguồn schema khai báo rõ / kiểm tra tính nhất quán |
| source-manifest.json | SHA-256 nguồn đã đọc, phát hiện drift khi teammate thay SQL/rule |

Không nhúng lại toàn bộ ví dụ JSON trong file này. Payload chỉ xuất hiện trong tài liệu JSON sinh từ schema; không duy trì hai bộ ví dụ bằng tay.

## 2. Nguồn và thứ tự ưu tiên

1. Quyết định trong chat: chỉ VNPay cho thu tiền, status hiện tại để theo dõi, không history/audit riêng. Không tự thêm RowVersion, content hash hay ảnh chữ ký.
2. [SQL đang làm](../../../HorseTransportDB/HorseTransportDB_Reviewed.sql): bảng/cột/kiểu/CHECK/trigger hiện tại. Bản này đang có thay đổi của người dùng, tài liệu chỉ đọc.
3. [ID rule](../../../data/ID_NAME_RULE_Reviewed.md), [status convention](../../../data/DATABASE_STATUS_CONVENTION.md) và [thiết kế năm bảng](../../../data/FLOW6_DATABASE_DESIGN_Reviewed.md): quyết định nghiệp vụ Flow6 hiện hành.
4. Tài liệu HANDOFF: tổ hợp đầu vào Flow4 → Flow6, không phải endpoint/service mà Flow4 đã cam kết xây.
5. SRS `data/SE2040_Group2_ASM2 (1).docx`, BR-41–46: tham khảo yêu cầu gốc, ưu tiên rule hiện hành khi khác.

Bản `data/HorseTransportDB_Reviewed.sql` và bản trong HorseTransportDB khác nhau ở field giấy tờ Request đã bỏ và CUSTOMS document type; nhóm bảng Flow6 được kiểm tra theo SQL trong HorseTransportDB. Không mở lại các field đã bỏ. Tài liệu thiết kế database có một số câu cũ như “Status đã duyệt”, “mỗi cửa sổ một feedback”; SQL hiện tại **không có Adjustment.Status/Bearer**, và unique feedback là **một dòng/SettlementID**, không một dòng mỗi lần reset.

SRS cũ đòi Customer đồng ý kết quả complaint. Rule hiện hành đổi thành **Manager phản hồi rồi RESOLVED; Customer còn ý kiến tạo phiếu mới**. Không có endpoint accept-result hoặc enum AWAITING_CUSTOMER_CONFIRMATION.

SRS BR-39 còn mô tả chữ ký trực tiếp trên màn hình. HANDOFF và SQL/rule hiện hành đã thay bằng **OTP gắn đúng revision**; không thêm ảnh chữ ký để làm theo đồng thời hai cách xác nhận.

## 3. Tác dụng của HANDOFF và điểm bắt đầu

HANDOFF có tác dụng trực tiếp: giúp Flow6 tránh thiết kế lại Gate khởi hành, đọc từng ROUTE_SEGMENT hoặc cho `IN_TRANSIT` thành “đã đến”.

Đầu vào bình thường: Trip IN_TRANSIT + deployment CONFIRMED, Request IN_PROGRESS, Contract EFFECTIVE, current contract version SIGNED, DEPOSIT invoice PAID và tổng tiền VNPay SUCCESS thực tế đủ cọc đúng version. Không yêu cầu mọi attempt đều SUCCESS. Kiểm đồng thời liên kết Trip/Request/Contract/Customer/version, không tìm mỗi status độc lập.

Đã đến điểm giao là bối cảnh thao tác thực tế, **không có cột ARRIVED**. API context trả dữ liệu để nhân sự kiểm, không có `arrived=true` suy từ status. API mutation kiểm lại tổ hợp đầu vào dưới transaction; GET không tạo dữ liệu.

HANDOVER PICKUP CONFIRMED cùng các item là baseline. Thiếu baseline trả `warnings`, không bịa dữ liệu hay đánh dấu đã OTP. Không copy `IsAuthorized`/`MicrochipVerified` sang DELIVERY. Incident mở không mặc định cấm mở màn hình giao; `HealthStatus`, `ConditionStatus`, `AssetCheck` là mô tả, không so chuỗi “HEALTHY/đạt” để cho qua. Hồ sơ chuyên môn bắt buộc còn thực dùng phải hợp lệ; Flow6 không tự duyệt lại booking, flight hay Gate 2.

## 4. Quyền và API context

- Base `/api`; JSON UTF-8; Bearer token. Customer khác chủ trả 404. Manager sai role trả 403.
- Nhân sự thao tác giao: DRIVER_ESCORT có UserID nằm ở DriverID hoặc EscortID của TRIP_VEHICLE_ASSIGNMENT đúng Trip. Specialist/Coordinator assignment không cấp quyền giao thay. Đây là lựa chọn thiết kế API dựa phân công hiện có; SQL FK không tự bảo đảm role/quyền.
- Người nhận có thể không có tài khoản. OTP được gửi cho email người nhận thực tế đã kiểm quyền; nhân sự tại chỗ nhập mã do họ cung cấp. Không có endpoint công khai chỉ cần biết revisionId để ký.
- Manager không có endpoint bỏ qua OTP. Customer xem biên bản confirmed qua settlement thuộc mình; không sửa handover hay tạo adjustment.
- Không tin actor, CustomerID, status, tiền đã thu hoặc server timestamps từ request. POST không body nghĩa là không gửi body, không gửi `{}` hoặc `null`.
- Các list trả `data: []` nếu không có. Bộ v1 chưa quy định pagination; không tự thêm wrapper `items` khiến caller khác schema.
- J11/J19/J29/J34 bắt buộc `Idempotency-Key` UUID. Đây là key chống retry trùng, không phải ID/rowVersion. Kết quả phải lưu bền vững theo actor/operation/key, kiểm payload hash; khác payload trả 409. Chưa có module persistence dùng chung thì 501; schema năm bảng không tự bảo đảm idempotency này. Endpoint singleton dùng khóa + unique/create-or-conflict theo mô tả riêng.

**Bước xem giao nhận trước khi có settlement:** worker đọc context/baseline. Customer chỉ xem biên bản qua hồ sơ settlement; Manager chuẩn bị DRAFT bằng J15 để có liên kết hồ sơ, không tạo Contract/Trip mới.

## 5. Nguyên tắc field: không lặp vô nghĩa

| Quy tắc | Ví dụ |
|---|---|
| ID ở URL không lặp trong body | PUT revision nhận DeliveryContent, không nhận revisionId/handoverId/TripID |
| Metadata và nội dung tách có lý do | Revision có id/number/status; content chỉ người nhận/địa điểm/ngựa/giấy tờ |
| Không trả content hai lần | Delivery trả currentRevisionId; GET revision trả đúng content, không root.receiver + content.receiver |
| Không alias mã | id là PK, number chỉ RevisionNo; không thêm code/id/number cùng chỉ một ID |
| Parent ID chỉ là liên kết | Case có settlementId, không lặp CustomerID/ContractID/TripID vì truy ngược từ settlement |
| Field tính toán có công thức | Balance tách signedPrice, depositPaid, finalDue, finalPaid, remaining; không cùng tên `amount` cho năm ý nghĩa |
| Phân biệt dữ liệu nguồn và snapshot | ReceiverName trên Request là người chỉ định; content.receiver là người nhận thực tế được kiểm tại DELIVERY |
| Duplicate trong DB chỉ khi có mục đích | HANDOVER/ITEM là bản làm việc; ContentSnapshot giữ đúng một revision để xem lại. BE ghi nguyên tử, không coi là hai store độc lập |
| Null có nghĩa cụ thể | confirmedAtUtc null = chưa xác nhận, không = lỗi đọc dữ liệu; collection rỗng không = tính năng đã thành công |

Timestamp mới của Flow6 dùng **RFC3339 UTC có Z**; FE chuyển sang giờ Việt Nam khi hiển thị. Không kế thừa chuỗi giờ FE không timezone của Flow1. Cột legacy DATETIME phải có adapter xác định UTC, không đoán theo timezone máy. VND nguyên đồng, BE dùng decimal, JSON integer. SQL DECIMAL(12,2) giới hạn phần nguyên tối đa 9.999.999.999; kiểm cả tổng sau cộng trừ, không chỉ mỗi khoản.

ID backend cấp Sequence NO CYCLE, cho gap, không reuse, không COUNT+1. Prefix: HANDOVER, HANDOVER_ITEM, HANDOVER_REVISION, SETTLEMENT, SETTLEMENT_ADJUSTMENT, CUSTOMER_CASE, CUSTOMER_FEEDBACK; actor luôn USER. RevisionNo tăng dưới khóa Handover; không phải số toàn hệ thống.

## 6. Giao nhận và OTP đúng phiên bản

Luồng: context/baseline → tạo DELIVERY/DRAFT → kiểm chip/tình trạng/tài sản/giấy tờ và quyền người nhận → gửi OTP → AWAITING_OTP → confirm hoặc refuse.

1. Tạo draft không mặc định đã kiểm chip hoặc đã có quyền; các flag chỉ true sau kiểm thực tế. Tập item phải đúng toàn bộ ngựa Request, unique horseId; không giao thiếu/nhầm hoặc sao chép kết quả PICKUP.
2. `content` chứa đủ nội dung biên bản được trình người nhận: địa điểm, người nhận/liên hệ/email, quyền nhận, từng ngựa/chip/tình trạng/tài sản, giấy riêng và giấy chung thực giao. Không đưa bí mật OTP, thông tin y tế/giá vốn nội bộ không thuộc biên bản.
3. Freeze lúc gửi OTP. Dùng BUSINESS_POLICY HANDOVER_OTP_TTL_MINUTES, HANDOVER_OTP_RESEND_SECONDS, HANDOVER_OTP_MAX_ATTEMPTS; seed chỉ minh họa. Không có policy hợp lệ trả lỗi cấu hình, không default FE. Resolve theo nước đến → mode → global giống module policy; không tạo code mới.
4. Bind hash/HMAC với revision ID và email, không chỉ số mã. Max attempts áp trong transaction; sai mã tăng counter, hết hạn không tự REFUSED, resend không reset counter. Không log mã hoặc request confirm.
5. Đổi người nhận/content phải invalidate OTP trước rồi sửa DRAFT, gửi mã mới; mã cũ không hợp lệ. Rate-limit invalidate/send theo operator và Handover ngoài DB, tránh reset counter để brute force; chưa có rate-limit runtime thì endpoint này không được coi an toàn để public.
6. REFUSED có lý do và thời gian, clear toàn bộ OTP metadata theo CHECK. Bản refused bất biến. Giao lại tạo revision kế tiếp DRAFT trước cập nhật item, phù hợp trigger latest revision lock. Không tạo revision mới sau confirmed DELIVERY để sửa lịch sử.
7. Confirm atomic: revision/HANDOVER CONFIRMED, Trip COMPLETED, Request DELIVERED; Contract vẫn EFFECTIVE/current version SIGNED. Chưa thu đủ final invoice không cấm nhận ngựa. Không mở window feedback chỉ vì đã giao.

Sau confirm/refuse, tạo thông báo nghiệp vụ qua module NOTIFICATION hiện có cho Customer/Manager và người phụ trách liên quan theo token/assignment. Không cần endpoint notification riêng lặp lại module chung. Không tuyên bố email giao thành công từ flag DB; thông báo lỗi sau commit không được trả như confirm chưa xảy ra khiến caller xác nhận lần hai. Refuse cần báo Manager phối hợp Customer/Coordinator theo BR-40, không tự coi đã có phương án giao lại được duyệt.

Việc một nhân sự ghi “người nhận có quyền” chỉ lưu flag và metadata hiện có, chưa có nơi lưu tài liệu ủy quyền riêng. Email actual lưu trong snapshot draft rồi OtpEmail khi gửi; hai field là snapshot địa chỉ đã trình và địa chỉ session gửi, BE phải bắt chúng khớp. Không cho FE tùy ý thay OtpEmail.

## 7. Tất toán, hóa đơn và VNPay

Settlement DRAFT có thể chuẩn bị trước giao. Hóa đơn cuối chỉ phát hành khi DELIVERY confirmed, đúng signed contract/version. Tiền cọc lấy từ invoice DEPOSIT + PAYMENT SUCCESS đã xác minh; invoice final chỉ thu phần còn lại.

```text
adjustedPrice = signedPriceVnd + chargesVnd - discountsVnd
finalDueVnd   = adjustedPrice - depositPaidVnd
remainingVnd  = max(finalDueVnd - finalPaidVnd, 0)
```

adjustedPrice và finalDue không được âm. Nếu giảm giá vượt số dư còn lại hoặc có tiền thừa, trả PAYMENT_RECONCILIATION_REQUIRED; không âm thầm cắt số âm về 0 rồi mất nghĩa vụ hoàn. REFUND là trả tiền đã thu, không tự tính thêm DISCOUNT lần hai. Một quyết định bồi hoàn không được đồng thời nhập cả refund và discount cùng nghĩa.

- CHARGE/DISCOUNT: Manager xác nhận trực tiếp, không workflow draft/approve, không Status/Bearer. `reason` là phát sinh, `decisionReason` là căn cứ xác nhận; có thể giống nội dung nhưng khác ý nghĩa nghiệp vụ. Server ghi hai actor bằng token nếu cùng Manager.
- Chi phí nội bộ/Incident.AdditionalCost không tự thành tiền Customer trả. CostItemID optional chỉ tham chiếu, unique không áp lại cùng chi phí; không công bố tổng giá vốn.
- **Phát hành invoice cơ sở trước khi tạo adjustment.** `OriginalInvoiceID` luôn lấy từ final invoice hiện hành ở thời điểm quyết định, bất biến theo trigger; `AdjustedInvoiceID/AppliedAtUtc` chỉ ghi khi thật sự thay invoice. SQL cho null để chứa dữ liệu cũ nhưng API tạo mới không dùng null. Không có field thời điểm phát hành invoice hoặc dấu đã áp cho khoản trước invoice đầu, nên không suy qua thời gian hay tạo cặp invoice giả. Invoice đầu = giá ký trừ cọc; khoản phát sinh xử lý bằng lần thay sau đó.
- Thay invoice: chỉ cho invoice chưa thu, không attempt còn pending/review/ngoại lệ. Transaction cancel invoice cũ trước insert mới để qua UX_F6_FinalInvoice, giữ pair đúng version. Không cho invoice bị thay tiếp tục tạo session.
- Nếu tiền đã có trên invoice cũ, schema hiện không có sổ phân bổ tiền sang invoice mới. API chặn bằng 409 để đối soát; không hứa hỗ trợ chuyển tiền tự động. CHARGE/DISCOUNT sau SETTLED/CLOSED chưa thuộc phạm vi v1; REFUND có thể xử lý trước CLOSED.
- finalDue=0: tạo final invoice PAID tổng 0, không tạo PAYMENT giả. Manager vẫn phải nghiệm thu/tất toán.
- VNPay session lấy số còn thiếu từ server, không nhận amount/method. Còn attempt chưa kết luận chặn session mới. Expiry không tự chứng minh attempt FAILED; phải có kết quả provider/đối soát trước cho tạo tiếp.
- **Dùng chung adapter `GET /api/payments/vnpay/ipn`** đã mô tả trong Flow1; không dựng IPN thứ hai. Module phải phân biệt DEPOSIT với FINAL_SETTLEMENT bằng InvoiceID. Merchant/signature/TxnRef/amount, provider result và chống callback trùng kiểm như module payment. Chỉ IPN đã xác minh cập nhật PAYMENT + INVOICE.PaidAmount/PaymentStatus. Return chỉ hiển thị/refetch.
- Callback cho invoice đã hủy, sai version, settlement đã đổi, số tiền thừa/khác phải bật FinancialReviewRequired, giữ tiền thật để đối soát; không tự chuyển CLOSED/SETTLED hay mở lại hồ sơ. Tiền final đủ chỉ làm invoice PAID, **Manager J26** mới nghiệm thu và ghi SettledBy.

## 8. Hoàn tiền Flow6 khác Flow1

Flow1 đã chốt chỉ ghi status. **Không áp giới hạn đó cho SETTLEMENT_ADJUSTMENT Flow6**: SQL Flow6 yêu cầu REFUND có OriginalInvoiceID là FINAL_SETTLEMENT đúng version; COMPLETED phải có RefundedBy, RefundedAtUtc, RefundReference, không sửa lại.

J27/J28 chỉ ghi nhận thực hiện, không gọi API chuyển tiền hoặc hoàn VNPay tự động. Manager kiểm một giao dịch hoàn đủ Amount; không tách nhiều giao dịch vào một adjustment. Tổng các khoản refund requested/processing/completed phải được giữ chỗ dưới khóa settlement và không vượt tiền verified invoice nguồn. Không refund cọc qua API final refund này. Không tạo PAYMENT Method=REFUND hoặc đổi SUCCESS thành FAILED.

REFUND không thay số dư cần thu một lần nữa. Đã hoàn thực tế không có nghĩa một khoản giảm giá khác cũng được tự áp. Hoàn chưa xong là nghĩa vụ tiền chưa hết và chặn close/reset. Nếu cần refund tự động qua provider hoặc chia nhiều giao dịch phải thiết kế tiếp, không giả là đã có.

## 9. Complaint, feedback và đóng đơn

- COMPLAINT sau giao, trước đóng; có thể gửi khi chưa trả đủ và chưa bắt đầu window. Khi window đã có thì nhận trước feedbackEndsAtUtc. SUPPORT sau đóng được nhận, không reopen Contract/Request.
- Manager OPEN → IN_PROGRESS → RESOLVED, có thể OPEN → RESOLVED. Phản hồi + actor/time + ResolvedAt lưu kết quả hiện tại. Không có hội thoại, Customer accept-result hoặc mở lại cùng phiếu.
- Đủ tiền + nghiệm thu J26: Settlement SETTLED, Contract SETTLED, Request vẫn DELIVERED. Khởi tạo window FEEDBACK_WINDOW_HOURS, ví dụ seed 24 giờ không hardcode.
- Khiếu nại mở giữ đơn mở kể cả đã quá hạn. Sau complaint cuối được giải quyết **và mọi nghĩa vụ tiền xong**, reset đầy đủ window. J33 làm ngay nếu đủ; J36 dùng khi tiền hoàn thành sau đó. Chỉ lưu starts/ends hiện hành, không history.
- Chống reset lặp bằng max complaint.ResolvedAtUtc > feedbackStartsAtUtc; ghi starts bằng server now >= mốc resolve, cùng khóa settlement. Có pending refund/nợ thì không reset sớm rồi ăn mất thời gian Customer.
- Một CUSTOMER_FEEDBACK/SettlementID theo unique SQL, kể cả window reset. Đánh giá thông thường không thành complaint, không kéo dài hạn, không chặn đóng. Rating 1..5, comment optional <=2000.
- Hết window, không complaint mở, không nợ/refund/review/adjustment chưa xử lý: worker tự đóng bằng cùng service với J37. Không cần public worker API. Atomic Settlement CLOSED, Request CLOSED, Contract CLOSED; Trip vẫn COMPLETED/version SIGNED.
- Tất toán/close/refund đều retry không đổi mốc hoặc tạo giao dịch trùng. Complaint vs close/reset, session vs thay invoice, IPN vs settle, confirm vs refuse phải serialize trên resource cha phù hợp.

## 10. HTTP và lỗi chung

| HTTP | Khi dùng / errorCode |
|---|---|
| 200 / 201 | Đọc/thao tác / tạo mới; create-or-get có thể trả cùng entity |
| 400 | VALIDATION_ERROR, UNKNOWN_FIELD, HORSE_SET_MISMATCH, INVALID_DOCUMENTS |
| 401 / 403 / 404 | UNAUTHORIZED / FORBIDDEN_ROLE / NOT_FOUND hoặc tài nguyên chưa phát sinh |
| 409 | INVALID_STATE, HANDOFF_INCONSISTENT, REVISION_NOT_EDITABLE, DELIVERY_EXISTS, DELIVERY_ALREADY_CONFIRMED, PAYMENT_IN_PROGRESS, PAYMENT_RECONCILIATION_REQUIRED, SETTLEMENT_NOT_READY, CLOSE_BLOCKED, FEEDBACK_EXISTS, COMPLAINT_WINDOW_CLOSED, IDEMPOTENCY_CONFLICT |
| 409 | OTP_INVALID, OTP_EXPIRED, OTP_ATTEMPTS_EXHAUSTED; sai mã tăng attempts, các lỗi khác không giả thành công |
| 429 | OTP_RESEND_TOO_SOON, RATE_LIMITED; có Retry-After từ server nếu biết |
| 500 | BUSINESS_POLICY_CONFIGURATION_ERROR, DATA_INTEGRITY_ERROR, INTERNAL_ERROR; không lỗi cấu hình thành lỗi Customer |
| 501 | FEATURE_NOT_SUPPORTED: capability/schema integration chưa triển khai, UI khóa thao tác tương ứng |

Envelope success/message/data; lỗi thêm errorCode, errors field validation khi cần. Không trả hash/provider secret/private path trong lỗi. Mẫu lỗi trong JSON là một lỗi tiêu biểu, không phải toàn bộ guard của endpoint.

## 11. Ma trận màn hình → API

| Màn hình | API |
|---|---|
| Nhân sự danh sách/context | J01/J02, baseline J38, sức khỏe/sự cố J39/J40 |
| Kiểm ngựa/người nhận/giấy tờ | J03/J04/J05/J06 |
| OTP và từ chối/giao lại | J07/J08/J09/J10/J11 |
| Manager nghiệm thu | J14/J15/J16/J42, balance J17, invoice cơ sở J22 rồi adjustments J19/J20 |
| Customer tất toán/thanh toán | J12/J13/J18/J21/J23/J24/J25/J41 |
| Manager tiền/hoàn | J22/J26/J27/J28/J44 |
| Customer phản hồi | J29/J30/J34/J35 |
| Manager chăm sóc/đóng | J31/J32/J33/J36/J37/J43 |
| PDF đúng snapshot | Nhân sự J45; Customer J46; Manager J47 |

Không làm mock thành công khi backend chưa hỗ trợ. Các quyết định API mới và giới hạn schema ở IMPLEMENTATION-NOTES là một phần hợp đồng, không được bỏ khi giao teammate.
