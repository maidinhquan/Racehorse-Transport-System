# So sánh hai bộ hợp đồng Flow6 — 29/10/2026

## 1. Kết quả lấy file và phạm vi

- Bộ của mình được chuyển nguyên sang [Flow6_MyDraft_2026-10-29](Flow6_MyDraft_2026-10-29/README.md), gồm Markdown và các schema/script đi cùng. Không sửa nội dung bản lưu. File HANDOFF người dùng cung cấp nằm ở bản lưu này.
- Bản teammate tại [Flow6](Flow6/FLOW6.md) lấy từ `origin/fe-phase1`, commit **d0b13a67121522fe424d24f842637feb1cd3335f**, commit ngày 29/10/2026 19:37:29 +07.
- Đã kiểm 7 file Flow6 nhận về giống từng byte với remote. Không chạy generator teammate vì script còn ghi sang frontend.
- Workspace vẫn ở `Refactor-Flow1`. Hai nhánh lệch 198 commit riêng hiện tại / 32 commit riêng remote tại thời điểm fetch. Không `git pull`/merge toàn nhánh vào workspace đang có thay đổi; dùng fetch và lấy riêng subtree Flow6 như phạm vi yêu cầu. Không sửa các thay đổi backend/SQL/Flow1 đang có.
- Lấy file vào working tree, chưa stage/commit/push. Frontend SDK/mirror của teammate chỉ xuất vào thư mục tạm để kiểm tra, không nhập vào frontend hiện tại.

## 2. Kết luận chính

**Đây là hai phiên bản nghiệp vụ khác nhau, không phải cùng hợp đồng đổi cách viết.** Bản mình ưu tiên SQL/rule đã chốt trước đó; teammate mô tả một aftercare workflow mới có nghiệm thu Customer, proposal, trao đổi, dispute và Manager đóng. Không nên ghép endpoint hoặc sinh backend từ cả hai bộ cùng lúc.

Không coi teammate sai chỉ vì khác bản cũ: tài liệu của teammate tự tuyên bố thay thế rule Flow6 cũ và nêu chưa triển khai backend/DB. Nhưng tuyên bố trong tài liệu không tự giải quyết việc team phải thống nhất quyết định mới, cập nhật rule và schema tương ứng.

## 3. Cấu trúc và bằng chứng kiểm tra

| Nội dung | Bản mình | Bản teammate |
|---|---|---|
| Phiên bản | 1.0.0, 27/10 | 1.1.0, 29/10 |
| API / schema | 47 / 79 | 31 / 42 |
| HTTP | 27 GET, 19 POST, 1 PUT | 10 GET, 21 POST |
| Tài liệu field | FIELD-DICTIONARY, tác dụng + x-source từng field | Schema + DTO TypeScript; chưa có bảng mapping từng field sang SQL tương đương |
| Sinh tài liệu | Explicit schema → OpenAPI, JSON, dictionary | Explicit schema → OpenAPI, JSON, scenarios và frontend SDK/DTO/mirror |
| Điểm mạnh kiểm tra | SQL field mapping, source fingerprint, conditional phase, payload lạ | SDK coverage, mirror parity, công thức ledger trong mẫu, lỗi từng operation và 40 acceptance targets |
| Kết quả hiện tại | Schema examples trong OpenAPI: 55 mẫu đều hợp lệ; lần tạo bộ có 102 mẫu tính cả lỗi Markdown, 18 ca âm và 137 mapping | Validator chính chủ chạy trên snapshot remote đầy đủ: 31 API, 42 schema, 18 request JSON, 454 response examples, 40 acceptance targets đạt |

Không so chất lượng bằng số API hoặc số ví dụ: cách đếm khác nhau. Teammate có nhiều mẫu lỗi HTTP lặp theo mỗi operation; bản mình tách nhiều GET/read resource hơn. Cả hai chưa được chứng minh bằng backend integration/E2E.

Đã chạy validator teammate trong bản xuất tạm của chính commit remote (13 file gồm contract + SDK/types/mirror/package). `frontend/node_modules` hiện có cung cấp Ajv. Không dùng trạng thái thiếu mirror ở nhánh hiện tại để kết luận contract teammate hỏng.

## 4. Các thay đổi nghiệp vụ quan trọng

| Chủ đề | Bản mình / quyết định cũ | Teammate | Tác động / việc cần chốt |
|---|---|---|---|
| Xác nhận giao nhận | OTP đúng HANDOVER_REVISION, có gửi mã/thu hồi/từ chối/giao lại | Ảnh chữ ký `signatureFileId`, POST bàn giao trực tiếp | Thay cơ chế bằng chứng. Nếu giữ OTP, teammate cần đổi nhóm Driver; nếu chọn ảnh chữ ký phải sửa rule/CHECK OTP hiện tại, không giả metadata OTP |
| Hai loại xác nhận | Người nhận OTP; Manager nghiệm thu/tất toán sau đủ tiền | Người nhận ký lúc giao, sau đó **Customer nghiệm thu riêng** | Người nhận có thể khác Customer; thêm bước chờ Customer là thay đổi nghiệp vụ thực sự |
| Thứ tự thanh toán | Bàn giao → thu số dư → Manager tất toán → window feedback | Bàn giao → Customer nghiệm thu → trả số dư → Manager đóng | Guards mở thanh toán và vai trò nghiệm thu không dùng chung được |
| Đồng hồ | Một window feedback **sau tất toán**, policy hiện hành ví dụ 24h | Acceptance window từ lúc bàn giao, ví dụ 48h; payment window riêng 24h | Không chỉ đổi 24 thành 48: thời điểm bắt đầu và mục đích khác nhau; cần persistence riêng |
| Quá hạn | Không tự trả tiền; hết feedback và đủ điều kiện thì worker đóng | Chỉ cảnh báo, Manager gia hạn/đưa dispute; không tự đóng | Phải chốt chính sách vận hành và worker |
| Complaint | OPEN/IN_PROGRESS/RESOLVED, Manager phản hồi rồi đóng, khách còn ý kiến tạo phiếu mới | OPEN/PROPOSED/AGREED/RESOLVED; khách quyết định proposal rồi Manager apply | Trái rule cũ đã giản lược; cần model proposal/decision và đồng thuận Customer |
| Trao đổi/lịch sử | Không chat/audit/timeline riêng, chỉ metadata gần nhất | messages, dispute updates, deadlineHistory bất biến và outbox | Mở rộng lại phạm vi đã bỏ; không lấy cột ResolutionText để giả lưu hội thoại |
| Khiếu nại sau nghiệm thu | Nhận khi sau giao và còn window, không có bước ACCEPTED khóa mọi complaint | ACCEPTED là xác nhận cuối, khóa complaint mới ngay | Có thể Customer trả đủ sớm rồi mất quyền tạo complaint trong app; cần team xác nhận rõ thay đổi |
| Đánh giá sao | CUSTOMER_FEEDBACK rating 1..5, một dòng/settlement | Không có API rating trong 31 operation | Nếu vẫn cần chức năng đánh giá thì bản teammate còn thiếu |
| Hỗ trợ sau đóng | CUSTOMER_CASE SUPPORT được tạo sau CLOSED, không reopen | Hồ sơ CLOSED chỉ đọc; không có API SUPPORT tương đương | Chưa có đường thực hiện yêu cầu hỗ trợ sau đóng theo BR-46; cần endpoint/module khác hoặc chấp nhận bỏ |
| Tranh chấp | Không thêm workflow riêng | Dispute, quyết định có căn cứ, COMPANY_WAIVER và đóng AFTER_DISPUTE | Nghiệp vụ mới, không có bảng đầy đủ trong năm bảng Reviewed |
| Status Request | DELIVERED → CLOSED, vận chuyển dùng IN_PROGRESS | Thêm UNDER_RESOLUTION; tài liệu Flow4 mới dùng IN_TRANSIT cho Request | Cần thống nhất status liên flow. Không thay nhầm Trip IN_TRANSIT thành Request enum cũ |
| Tới đích | HANDOFF cũ chỉ nêu bối cảnh, không có marker persisted | FINAL_ARRIVED từ Flow4 mới, recheck blockers Flow5 | Có căn cứ **trong contract Flow4 mới ở cùng remote**; không phải field SQL đã có. Đây là dependency contract mới, không chứng minh backend đã cung cấp |
| Kiểm tình trạng ngựa | Văn bản ConditionStatus và tình trạng tham chiếu | NORMAL/MONITOR/ABNORMAL + note và ảnh bắt buộc | Có thể mapping vào mô tả/snapshot, nhưng phải ghi rõ; không ghi đè làm mất nội dung cũ |
| Phân công | DriverID/EscortID ở assignment cấp Trip | Chặng giao cuối, phối hợp roles Flow4 mới | SQL Reviewed cũ không có phân công theo SegmentID; cần module phân công mới hoặc mapping cụ thể |
| Tăng/giảm tiền | CHARGE/DISCOUNT/REFUND theo adjustment hiện có | REDUCTION/WAIVER, không có API CHARGE tương đương | Không ánh xạ bằng thay tên hàng loạt; WAIVER khác tiền đã thu, CHARGE có thể đã chủ đích bỏ cần xác nhận |
| Tiền đã thu trên invoice cũ | Chặn thay invoice nếu có tiền/pending, chưa có ledger phân bổ | Tổng hợp ledger + invoiceVersion, apply resolution/decision | Mô hình mới giàu hơn nhưng thiếu storage ledger/migration đã chốt; không cộng PaidAmount từ hai mô hình |
| Hoàn tiền | REQUESTED/PROCESSING/COMPLETED, reference/time bắt buộc khi xong | PENDING/PROCESSING/VERIFIED/FAILED và file evidence | Cần mapping/persistence rõ. Hai bên đều nói chỉ ghi nhận tiền thực hoàn, không endpoint tự chuyển tiền |
| Đóng | Worker sau hết window; Manager có thể gọi cùng guard | Manager NORMAL/AFTER_DISPUTE, có thể đóng ngay sau ACCEPTED và đủ tiền | Trái chính sách cũ; phải chọn một bộ guard |
| Version | RevisionNo nghiệp vụ và lock, không thêm aggregate version chung | expectedVersion + proposalVersion + invoiceVersion + statementVersion | Tăng độ chặt đồng thời, đồng thời thêm nghĩa vụ lưu version/counter; chưa có đủ cột ở SQL cũ |
| Retry | Idempotency bắt buộc ở một số create + singleton guard | Mọi POST bắt buộc key, replay trước stale check, tối thiểu 7 ngày | Điểm tốt về retry; vẫn cần store bền vững, không phải có header là đã có backend |
| File/PDF | PDF từ snapshot có quyền; chưa mở upload ảnh mới | Upload/download ảnh, chữ ký, evidence có scope | Teammate tốt hơn ở hợp đồng upload; nhưng file IDs/registry còn cần nơi lưu. Chưa có PDF biên bản đầy đủ tương đương J45–J47 của mình |
| Timestamp | RFC3339 UTC có Z | Chuỗi giờ Việt Nam YYYY-MM-DD HH:mm, persistence UTC | Client/adapter và timestamp so sánh cần thống nhất; không nối hai kiểu vào cùng DTO |

Tham chiếu: bản mình FLOW6.md mục 2, 6–9; teammate FLOW6.md mục 1, 3–7, 9; REVIEW.md. Không so F6-Jxx cùng số giữa hai bản: chúng đã chỉ **hai endpoint khác nhau**; phải dùng method + path hoặc x-client-name khi đối chiếu.

## 5. Đối chiếu schema: những điểm cụ thể cần xử lý

| Mức | Phát hiện | Bằng chứng | Hướng xử lý |
|---|---|---|---|
| Chặn tích hợp với SQL cũ | CONFIRMED HANDOVER_REVISION đòi metadata OTP trong CK_F6_RevisionPhase | SQL có OtpEmail/Sent/Expiry/ConfirmedAt, không signatureFileId; teammate dùng ảnh chữ ký | Chọn OTP hay chữ ký rồi thay schema/trigger/migration và contract đồng bộ; không bịa OTP để qua CHECK |
| Chặn tích hợp với SQL cũ | Customer acceptance, 2 window, histories, proposals/messages/dispute/version/file registry không có persistence tương đương | Năm bảng Reviewed chỉ settlement + current window/case result + feedback + handover revision + adjustment | Lập mapping/schema extension trước backend. Teammate cũng thừa nhận chưa có DB triển khai |
| Sai giới hạn nếu map trực tiếp | HandoverInput.receiverName tối đa 255 nhưng HANDOVER.ReceiverName NVARCHAR(100) | OpenAPI HandoverInput và SQL HANDOVER | Giới hạn API 100 hoặc migration cột lên 255; không âm thầm truncate |
| Sai giới hạn nếu map trực tiếp | Tiền API tối đa 9.007.199.254.740.991 nhưng DECIMAL(12,2) chỉ tối đa 9.999.999.999,99 | `money` trong build_contract.py dùng JS safe integer; SQL Invoice/Payment/Adjustment DECIMAL(12,2) | Giới hạn 9.999.999.999 VND nguyên hoặc nâng precision có chủ đích; check cả tổng |
| Sai giới hạn nếu map trực tiếp | `text` tối đa 4000, `short` 255 khác nhiều cột reason/case/refund reference | Reason/DecisionReason/ResolutionText/Description 2000; Subject 200; RefundReference 100 | Khai báo schema theo từng field đích; nếu bảng mới thì có dictionary riêng, không dùng text/short chung để suy SQL |
| Chưa có mapping trạng thái/ID | Refund VERIFIED/PENDING/FAILED; Adjustment REDUCTION/WAIVER; nhiều id opaque tối đa 80 | SQL refund REQUESTED/PROCESSING/COMPLETED, adjustment CHARGE/DISCOUNT/REFUND, PK prefix VARCHAR(50) | Phân biệt DTO/projection với DB, mapping từng loại/ID; không ghi thẳng payload vào cột |
| Cần mapping tài chính | Tài liệu yêu cầu adapter nhận BALANCE trong khi SQL InvoiceType hiện FINAL_SETTLEMENT | Teammate FLOW6.md phần thanh toán vs rule Reviewed | BALANCE là payment-purpose hay InvoiceType phải ghi rõ; giữ canonical type đúng schema đã chọn |
| Chưa rõ cách bảo vệ chữ ký | Tài liệu yêu cầu bind signature với snapshot nhưng Evidence/schema upload không thể hiện token/hash/revision nội dung đã ký | HandoverInput có expectedVersion và signatureFileId; Evidence chỉ scope file/request/metadata | Chốt cách server liên kết nội dung được trình–file chữ ký–expectedVersion trước commit; không coi ảnh tồn tại là đủ bảo vệ nội dung |
| Độ nhất quán kiểu, không phải lỗi runtime đã chứng minh | defaultAcceptanceHours/allowedAcceptanceHours là string '24'/'48', paymentHours/maxExtensionHours là integer | Policy schema | Nên thống nhất số giờ là integer; hiện generated client vẫn có thể xử lý kiểu string nếu tuân thủ schema |

Các điểm “nếu map trực tiếp” không khẳng định backend đang lỗi: cả hai contract chưa triển khai server. Chúng chỉ ra tại sao không thể nói bản teammate đã khớp SQL Reviewed 100%.

## 6. Về việc lặp JSON/field

Teammate cũng dùng generator, không copy nhiều bộ payload bằng tay. `Aftercare` gom nhiều dữ liệu trong một response, nên ít endpoint hơn nhưng payload lớn hơn.

- `version`, `proposal.version`, `invoiceVersion`, `statementVersion`: khác đối tượng kiểm soát; không tự coi là field lặp sai. Cần dictionary và nơi lưu cho từng version.
- `phase` với requestStatus/tripStatus: phase là projection, không tên cột DB; có lý do nhưng phải có thứ tự ưu tiên rõ (teammate đã ghi).
- `actions[PAY].allowed`, `settlement.canPay`, `paymentBlockers`: lặp quyết định khả năng thanh toán ở nhiều vị trí. Cần chỉ định một service/tính toán chuẩn và invariant để chúng không mâu thuẫn. Không để FE tự suy mỗi nơi một cách.
- `originalTotal/netPayable/verifiedDeposit/verifiedBalance/outstanding/refundDue`: là các đại lượng khác nhau và có công thức; không phải lặp vô nghĩa. Teammate có test kiểm công thức mẫu, đây là điểm tốt.
- Nhiều mutation trả nguyên Aftercare: giúp FE refresh state từ server nhưng tạo ví dụ JSON dài và dễ có snapshot chưa phản ánh đúng action nếu cập nhật generator không đồng bộ. Không phải lỗi chỉ vì response dài.

## 7. Khuyến nghị sau so sánh

1. Chốt **nghiệp vụ** trước: OTP hay ảnh chữ ký; có Customer nghiệm thu và đồng ý proposal không; giữ rating/support sau đóng không; Manager đóng hay worker tự đóng; có chat/history/dispute không.
2. Nếu ưu tiên các quyết định đã chốt trong chat/rule cũ: giữ bộ của mình làm baseline, lấy ý tưởng tốt từ teammate về upload thực, receiver authorization, Coordinator view, messages/case nếu thật sự muốn mở rộng và SDK/40 targets.
3. Nếu team đã chủ đích đổi sang aftercare 1.1: lấy bộ teammate làm baseline mới rồi **cập nhật SQL + ID/status rule + HANDOFF**; không trộn workflow OTP/current window cũ vào acceptance/dispute mới bằng adapter tên field.
4. Bất kể chọn bộ nào, nên giữ explicit schemas, dictionary/source mapping, Idempotency-Key bền vững, kiểm quyền/transaction phía server và signed snapshot bất biến.
5. Chưa tự sửa nội dung teammate, chưa thay SQL/rule hay quyết định thay người dùng; so sánh này là cơ sở chọn baseline.

## 8. Giới hạn xác minh

Đã đọc cả hai bộ, SQL/rule hiện có và Flow4 mới trên đúng remote; kiểm schema samples và chạy validator chính chủ cùng SDK/mirror trong thư mục tạm. Chưa chạy backend, gửi OTP/mail, upload storage thật, VNPay, migration, PDF render hoặc E2E. SDK/mock HTTP và acceptance target là hợp đồng kiểm thử, không bằng chứng nghiệp vụ production.

Bản lưu nguyên vẹn có source-manifest trỏ `contracts/API-Flow/Flow6/FLOW4_TO_FLOW6_HANDOFF.md` ở vị trí cũ; sau di chuyển, validator cũ cần điều chỉnh đường dẫn/fixture nếu muốn chạy lại. Không regenerate hay sửa bản lưu chỉ để che drift. Toàn bộ HANDOFF và nguồn đọc cũ vẫn được bảo toàn ở archive/local data.
