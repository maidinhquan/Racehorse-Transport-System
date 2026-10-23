# Đối chiếu Flow 1 với frontend hiện tại

Ngày: 22/10/2026. Phương pháp: đọc source, lần theo route → page → hook → API client → endpoint/type; so với FLOW1.md v2.5 và danh mục 63 thao tác. Chưa chạy giao dịch backend, browser hoặc kiểm thử thanh toán. Không sửa source frontend/backend trong lần audit này.

## Kết luận

**Chưa thể tích hợp trực tiếp.** Contract bao phủ nhiều hành vi nghiệp vụ Flow 1 nhưng không khớp code FE hiện tại về URL, payload, response, enum, thứ tự ký/cọc và cách quản lý dữ liệu. Một số nhu cầu thật của giao diện cũng chưa được contract đặc tả đủ.

63 thao tác là danh mục thiết kế, không phải 63 API đã hoạt động hoặc đã kiểm chứng tương thích FE. Cần phân biệt sửa FE theo nghiệp vụ đã chốt, chuẩn hóa DTO bằng adapter và bổ sung hợp đồng dữ liệu còn thiếu; không sao chép toàn bộ hành vi demo thành backend.

## 1. Các vấn đề chặn tích hợp

### FEA-01 — Sai thứ tự ký/cọc và nơi kích hoạt Trip

- `frontend/src/features/customer/hooks/customerRules.ts:304`: canPayDeposit cho trả tiền khi CONTRACT_READY, đã accept terms, chưa ký. `:315` yêu cầu cọc VERIFIED mới cho ký; `:318` canSign yêu cầu DEPOSIT_VERIFIED.
- `frontend/src/features/customer/hooks/useCustomer.ts:405`: ký OTP trực tiếp chuyển hợp đồng EFFECTIVE, Request ACTIVATED và tạo Trip trong state FE.
- `frontend/src/features/customer/pages/contract/ReviewSignPage.tsx:48`: giao diện thông báo đã xác minh cọc trước khi ký.
- Baseline v2.5 mục 11–14: ký trước → SIGNED/AWAITING_DEPOSIT; chỉ sau cọc đủ được xác minh thì backend kích hoạt nguyên tử.

**Xử lý:** sửa guard, điều hướng, thông điệp, enum và hook FE. Không đảo thứ tự contract theo demo. Customer không được tự xác minh tiền hoặc tạo Trip thật.

### FEA-02 — Tắt demo vẫn bỏ dữ liệu backend; mutation không chờ kết quả

- `useCustomer.ts:158–169`: loadAll gọi backend nhưng khi demo tắt lại gán horses/requests/notifications thành mảng rỗng.
- `frontend/src/features/manager/hooks/useManager.ts:177–192`: cùng lỗi, bỏ toàn bộ dữ liệu nhận được khi demo tắt.
- Customer `updateReq` ở `:142–145` sửa state rồi tự PUT toàn bộ request; nhiều action gọi `void customerApi...` rồi trả ok ngay. Manager cũng mutate cục bộ rồi `void managerApi...`.
- Hai file `api/*Api.ts` bắt lỗi GET thành fallback/empty và mutation chỉ trả boolean; hook không dùng boolean đó để rollback hay hiện lỗi.

**Xử lý:** tách demo store khỏi real API state; action real dùng async/await, chỉ xác nhận thành công sau response, dùng server IDs/state, phân biệt loading/error/empty. Refresh dữ liệu sau mutation. Lỗi backend không được hiển thị thành công.

### FEA-03 — FE đang tạo và lưu Request DRAFT qua backend

- `useCustomer.ts:196–210`: createDraft tạo mã TRN tại FE, trạng thái DRAFT và POST ngay lúc mới có thông tin chuyến.
- `:266–278`: khi hoàn tất wizard lại gọi `/submit` riêng; mọi bước cập nhật có thể PUT toàn bộ request qua updateReq.
- Contract chỉ POST đơn hoàn chỉnh tại cuối wizard; không có server Request DRAFT, PUT tùy ý hay `/submit`.

**Xử lý:** giữ draft ở FE; POST một lần lúc xác nhận gửi và dùng ID BE trả về. Khi CHANGES_REQUESTED dùng PUT `/revision`. Không thêm server draft chỉ để khớp code demo.

### FEA-04 — URL và khóa tài nguyên chưa thống nhất

| Hành vi | FE đang gọi | Contract v2.5 |
|---|---|---|
| Danh sách/tạo đơn Customer | `/customer/transport-requests` | `/customer/requests` |
| Gửi đơn | `POST /customer/transport-requests/{requestId}/submit` | `POST /customer/requests` với dữ liệu hoàn chỉnh |
| Lưu đơn bất kỳ | `PUT /customer/transport-requests/{requestId}` | Không có PUT tổng quát; revision có guard riêng |
| OTP/ký | `/customer/transport-requests/{requestId}/contract/otp`, `/sign` | `/customer/contracts/{contractId}/otp`, `/sign` |
| Accept terms | Endpoint riêng dưới request | Checkbox có thể là state FE trước sign; baseline chưa có API accept-terms độc lập |
| Đặt cọc | `/customer/transport-requests/{requestId}/payments/deposit` | `/customer/payments/online` hoặc `/manual`, gắn receivableId |
| Lưu/phát hành hợp đồng | `/manager/requests/{requestId}/contract/draft`, `/issue` | POST `/manager/requests/{requestId}/contracts`, PUT `/manager/contracts/{contractId}`, POST `/send` |
| Giao dịch chờ | `/manager/transactions` | `/manager/payments/pending` |
| Xác nhận tiền | `/manager/transactions/{id}/verify` | `/manager/payments/transactions/{transactionId}/confirm` |
| Gia hạn | `/manager/requests/{id}/contract/extend` | `/manager/requests/{requestId}/deposit-extensions` |
| Bàn giao/hold/resume | `/manager/trips/{id}/deployment`, `/hold`, `/resume` | `/confirm-deployment`, `/hold-deployment`, `/resume-deployment` |

Nguồn: `customerEndpoints.ts:9–20`, `managerEndpoints.ts:17–31`. Các path tương đối sau `/api`.

**Xử lý:** cập nhật endpoint layer cùng chữ ký hàm và caller; thay requestId bằng contractId/receivableId ở nơi yêu cầu. Chỉ đổi chuỗi URL là chưa đủ.

### FEA-05 — Payload tạo đơn thiếu field bắt buộc; đang gửi cả view model

- Customer `TransportRequest` ở `types/customer.types.ts:340`, `TripInfoInput` ở `:397`: dùng id/origin/destination/date/horses, pickup/delivery kiểu Place, horseCount, horseNotes, wizardStep, versions/payments/history...
- Contract CreateRequest yêu cầu originCountry/originCity, destinationCountry/destinationCity, desiredDepartureDate, deliveryDeadline, preferredTransportMode, pickupContact, receiver.isProxy, horseIds.
- Form hiện không có field riêng cho deliveryDeadline, preferredTransportMode và receiver.isProxy. Không thể chỉ rename field để tạo đủ dữ liệu.
- ID, trạng thái, lịch sử, hợp đồng/thanh toán nhúng trong view model là dữ liệu server quản lý, không phải CreateRequestInput.

**Xử lý:** tạo DTO request riêng + adapter city/country/contact; bổ sung input còn thiếu. Các field UI đang cho nhập như postal, notes địa điểm, horseNotes phải được phân loại: state UI hay dữ liệu cần lưu. Nếu cần lưu, contract phải có schema rõ; không âm thầm bỏ mất khi map.

### FEA-06 — Response phân trang và chi tiết chưa dùng đúng

- `customerApi.ts:56` và `managerApi.ts:62` kỳ vọng `data` là `TransportRequest[]`; contract list là `{items,page,pageSize,totalItems,totalPages}`.
- FE hiện dùng list như chứa toàn bộ aggregate: Customer versions/payments/docs/history; Manager versions/dossier/customerId/draft/history. Contract list trả summary, các GET detail/contract/payment cung cấp phần còn lại.
- Request detail pages lấy bản ghi trong store: Customer page `:78`, Manager page `:20`; Manager API chưa expose hàm getRequest detail mặc dù có endpoint constant.

**Xử lý:** list đọc data.items và metadata; detail fetch theo route ID, tải contract/payment/dependency đúng nhu cầu. Không xem một trang list là toàn bộ DB, không suy ra 404 chỉ vì ID chưa nằm trong trang đã tải.

### FEA-07 — Enum và allowedActions không tương thích

| FE | Contract / vấn đề |
|---|---|
| PENDING_REVIEW | PENDING |
| CONTRACT_PREPARATION | ACCEPTED |
| CONTRACT_READY | Gần với AWAITING_CONTRACT, nhưng FE còn dùng cho thanh toán trước ký |
| CONTRACT_CHANGES_REQUESTED | Contract SIGN_DECLINED hoặc đề xuất thay đổi riêng; không phải cùng một RequestStatus |
| DEPOSIT_VERIFIED | Phản ánh quy trình demo cọc trước ký, không có ánh xạ 1–1 |
| Request SCHEDULED / IN_TRANSIT / DELIVERED | Cần đọc TripStatus độc lập, không ép vào RequestStatus |
| Contract ISSUED | PENDING_SIGNATURE |
| Deployment NOT_CONFIRMED | Draft schema trước đề xuất PENDING_CONFIRMATION; cần thống nhất tên |

Types và source Customer/Manager hiện chưa dùng allowedActions, requestVersion, contractId, receivableId để điều khiển Flow 1. Contract yêu cầu các dữ liệu đó.

**Xử lý:** dùng enum chuẩn trong DTO; nếu giữ view model cũ phải có adapter theo ngữ cảnh. Sửa state machine ở các điểm không thể map đơn giản. FE dùng allowedActions, BE vẫn kiểm tra quyền lại.

### FEA-08 — Hợp đồng Manager gửi chưa đúng schema, thiếu concurrency

- `useManager.ts:222` gửi `{feedback,fields}` với fields như date/places/horses/notes. Contract request-revision dùng reason và canonical field names.
- `managerApi.ts:73` rejectRequest chỉ gửi reason; baseline còn yêu cầu reasonGroup.
- ContractDraft FE ở `manager.types.ts:205` gộp mode/departAt/arriveAt/budget/items `{desc,amount}`/depositPct/terms.
- Contract tách preliminary plan, pricing suggestion, draft và send; line item cần category/description/quantity/unitPrice, cùng requestVersion/preliminaryPlanId/preliminaryPlanVersion. FE chưa giữ các version/IDs này.

**Xử lý:** ánh xạ form thành từng DTO/API call; BE tính tổng, không gửi toàn bộ aggregate. Lưu ID/version từ response; xử lý 409 bằng refetch/review. Không dùng stale form để ghi đè snapshot mới.

### FEA-09 — Upload đang gửi tên tệp thay vì file

- `components/DocumentList/FilePickButton.tsx:30` chuyển File thành `{name,url:blobURL}` và không giữ File trong FileRef.
- `customerApi.ts:63–64` uploadDocument gửi JSON `{key,scope,fileName}`; createHorse cũng gửi HorseInput JSON, chứa file metadata/blob URLs.
- Contract yêu cầu multipart có bytes, tệp được gắn Horse/Document và private fileId. Blob URL chỉ tồn tại trong trình duyệt, không phải tài liệu backend đọc được.

**Xử lý:** giữ File trong form state, gửi FormData, lưu fileId/URL có quyền từ BE. Không upload giấy tờ Customer PER_TRIP trong wizard nếu giữ phạm vi demo v2.5. Việc thêm ngựa cần schema dùng chung đầy đủ, không tạo lại passport scan ở bước submit.

### FEA-10 — Pricing, deadline và OTP vẫn do FE quyết định

- LandingPage.tsx:90 và customerRules.ts:105 tính giá cứng 650/1850 USD mỗi ngựa; không gọi public/customer estimates.
- managerRules.ts có defaultBudget/defaultItems, giá sàn, tỷ lệ cọc mặc định; dùng làm dữ liệu thương mại demo.
- `useManager.ts:301` phát hành validUntil = +24 giờ; `:331–340` gia hạn cố định thêm 24 giờ và chỉ cho hợp đồng chưa ký.
- Baseline yêu cầu Manager chọn completionDeadline, gia hạn cả giai đoạn SIGNED/AWAITING_DEPOSIT khi hợp lệ, không sửa hash hợp đồng đã ký. Không mặc định 24 giờ.
- `useCustomer.ts:389–400` tạo OTP session FE, so mã cố định DEMO_OTP; TTL/attempts hardcode.

**Xử lý:** dùng API pricing/mode/form-options; bổ sung input deadline/reason, đọc effectiveCompletionDeadline; OTP phải xác minh tại backend, lấy TTL/resend từ response. Giá/OTP/QR giả chỉ giữ trong demo mode.

### FEA-11 — Thanh toán chưa có dữ liệu để gọi API thật

- payDeposit không gửi body; không có receivableId. DepositPage tự tạo QR minh họa bằng seed, không phải paymentUrl hoặc bank-info từ BE.
- `managerApi.ts:87` verifyTransaction không gửi confirmedAmount/bankReference/receivedAt; contract yêu cầu số tiền thực nhận và chứng cứ đối soát.
- send() chỉ trả boolean nên làm mất transactionId/paymentUrl/receipt/server state cần cho bước tiếp theo.
- Customer types chưa mô hình BANK_TRANSFER + PENDING_CONFIRMATION theo contract; RequestStatus DEPOSIT_VERIFIED chỉ phục vụ flow cũ.

**Xử lý:** API client trả typed data; đọc payment overview/receivable, tạo session và theo dõi transaction. Form Manager thu tiền thực nhận/reference/time. Không tự cộng tiền/kích hoạt hoặc coi proof là SUCCESS. Trang sandbox độc lập không chứng minh Flow 1 đã tích hợp.

## 2. Nhu cầu giao diện mà contract cần làm rõ hoặc bổ sung

Các mục này là khoảng trống thiết kế; không tự tuyên bố endpoint bổ sung đã được nhóm chốt.

| Nhu cầu FE thực tế | Bằng chứng | Contract cần quyết định |
|---|---|---|
| Chọn Specialist và Coordinator khi giao việc | useManager.ts:391–401, AssignStage và DeployModal | Nguồn danh sách staff có role/load/availability; thêm specialistId/coordinatorId vào confirm-deployment hoặc đặc tả assignment endpoint dùng chung. Body chỉ note hiện chưa đủ cho UI này |
| Xem thông tin Customer ở Manager | Manager TransportRequest.customerId và managerApi.getCustomers | Manager detail nên có customer summary hoặc customerId + dependency lookup đã đặc tả; không chỉ copy DTO detail của Customer |
| Biên soạn 12 điều khoản và điều khoản bổ sung | manager ContractTerm `{title,text}`, TermsStep.tsx | Quyết định terms[] có cấu trúc hay customTerms là tài liệu/string. Plain string không tự khôi phục được editor có từng điều khoản |
| Xem nhiều phiên bản hợp đồng cũ | routes contract/:version, FE versions[] và bản ContractBody | Baseline nói history, nhưng cần chốt full snapshot từng version hay summary + API đọc version. Summary chỉ id/version/status không đủ render nội dung cũ |
| Lịch sử ai làm gì, lý do và nội dung | HistoryEntry Customer/Manager, HistoryTab | statusHistory chỉ status/at không đủ. Cần history/audit projection có actor/role/action/detail/time, phân quyền lọc ghi chú nội bộ |
| Giá trị khai báo, hồ sơ và dữ liệu chăm sóc theo ngựa | Horse.value/currency/valueProof/conditions/vetName/vetPhone; request horseNotes | Hoàn thiện Horse/Document shared contract và các field theo ngựa cần snapshot. Không ép mọi ghi chú vào một specialRequirements rồi mất liên kết ngựa |
| Phản hồi yêu cầu sửa hợp đồng: giữ bản / trả đơn / phát hành lại | useManager.respondChange:312–328 | Baseline chủ yếu decline + phiên bản mới. Hoặc đơn giản hóa UI theo baseline, hoặc bổ sung quyết định có audit; giữ bản không tự cấp lại 24 giờ |
| Nhắc khách ký thủ công | managerApi.remindSign, useManager.ts:343 | Chọn là chức năng cần endpoint có giới hạn/audit, hay bỏ nút và dùng notifications/job đã đặc tả |
| Dữ liệu dashboard/profile/notifications, mark-read | API constants và hook loadAll | Dependency shared cần đủ schema/route; thao tác mark-read hiện chỉ sửa state FE. Không mặc định toàn bộ nằm trong 63 API cốt lõi |

Các màn hình route approval, flight, departure, actual costs, nghiệm thu, số dư, khiếu nại và hoàn tiền thuộc Flow 2/3/4/5 hoặc tài chính liên quan. Chúng không phải lý do để thêm mọi endpoint Manager/Customer vào Flow 1. Riêng handoff và xử lý hủy trong Flow 1 phải công bố dependency cần dùng.

## 3. Coverage và thứ tự đồng bộ

| Nhóm | Đánh giá |
|---|---|
| Danh sách/chi tiết Manager, accept/reject/request-revision | Có endpoint nghiệp vụ tương ứng; payload, DTO, list/detail và async vẫn lệch |
| Customer request/wizard | Có API thiết kế, nhưng FE dùng URL và vòng đời DRAFT/submit khác |
| Estimate/options/checklist | Contract có; FE chưa tích hợp, còn tự tính/tự validate theo dữ liệu demo |
| Contract/version/OTP | Có API thiết kế, nhưng khác resource IDs, schema editor và state machine |
| Deposit/verification | Có API thiết kế, nhưng FE thiếu receivable/session/data đối soát và đang cọc trước ký |
| Deployment | Có API thiết kế, cần đặc tả chọn người và danh mục staff theo UI |
| Info request/change/cancellation | Contract có các nhánh; FE chỉ có một phần hành vi hoặc gộp vào contract/cancel action khác |
| Sẵn sàng chạy end-to-end thật | Chưa: core BE chưa implement và FE chưa khớp contract |

Thứ tự đề xuất:

1. Chốt nghiệp vụ ký trước/cọc sau; phân biệt Request/Contract/Payment/Trip status.
2. Chốt schema còn thiếu: assignments, customer summary, terms/version detail, audit, Horse/Document.
3. Sửa API DTO/adapter, URL, response phân trang và detail fetching; tách real API khỏi demo state.
4. Sửa wizard chỉ submit cuối, giữ File thật để upload, dùng ID/version backend trả về.
5. Tích hợp plan → pricing → draft → send → OTP → payment → verification → deployment; lỗi phải hiện đúng và 409 phải refetch.
6. Kiểm thử các nhánh hết hạn, retry, sửa/hủy và khác owner bằng backend thật trước khi tuyên bố đủ.

## 4. Tình trạng artifact trong workspace

Tài liệu đã được chuyển vào `contracts/API-Flow/Flow1/`. Tại thời điểm audit, không còn `flow1.openapi.json` trong thư mục này dù các tài liệu còn tham chiếu tới nó. `contracts/tools/validate_flow1_contract.py` cũng còn trỏ vị trí cũ. Vì vậy chưa thể kiểm định OpenAPI hiện hành hoặc coi link import là sử dụng được. Audit không tự phục hồi file đã được di chuyển/xóa bởi thay đổi ngoài lượt này.

## 5. Phạm vi xác minh

Đã đối chiếu source frontend thực tế của Landing, Customer và Manager; API constants/clients/types/hooks, wizard, file picker, contract editor, ký/cọc và deployment. Đã đọc lại baseline FLOW1.md và danh mục endpoint. Không chạy build/test vì không sửa logic ứng dụng; build thành công cũng không chứng minh response hoặc state machine tương thích. Chưa gọi BE hay kiểm thử provider. Các khoảng trống và mức ảnh hưởng ở trên là kết quả review source, không phải kết quả chạy UAT.
