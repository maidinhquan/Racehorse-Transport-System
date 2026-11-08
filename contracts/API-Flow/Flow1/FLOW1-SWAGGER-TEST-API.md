# Flow 1 — API bàn giao kiểm thử Swagger

Nhánh `MoreBusinessRuleFlow1`. Swagger local: http://localhost:5129/swagger/index.html. Các đường dẫn dưới đây thêm tiền tố `/api`. Authorize bằng token đúng vai trò. Lấy ID, revision và checklistVersion từ response thật.

## 12 API mới

| Mã JSON | Method và đường dẫn | Vai trò / tác dụng |
|---|---|---|
| F1-J72-READ | GET `/manager/requests/{requestId}/reviews` | Manager đọc phiên xét duyệt và kết quả hai bên |
| F1-J72 | POST `/manager/requests/{requestId}/reviews` | Manager phân công Điều phối và Chuyên viên |
| F1-J73 | GET `/coordinator/request-reviews` | Điều phối đọc danh sách được phân công |
| F1-J74 | GET `/coordinator/request-reviews/{reviewId}` | Đọc lịch và danh mục tài nguyên hỗ trợ đánh giá |
| F1-J75 | POST `/coordinator/request-reviews/{reviewId}/assessment` | Kết luận lịch gốc, đề xuất lịch thay thế khả thi |
| F1-J76 | GET `/specialist/request-reviews` | Chuyên viên đọc danh sách được phân công |
| F1-J77 | GET `/specialist/request-reviews/{reviewId}` | Đọc các phương án và checklist hệ thống |
| F1-J78 | GET `/specialist/request-reviews/{reviewId}/options/{optionId}/checklist/{itemId}/file` | Xem tệp giấy tờ được cấp quyền |
| F1-J79 | POST `/specialist/request-reviews/{reviewId}/options/{optionId}/assessment` | Gửi kết quả checklist theo từng lịch |
| F1-J80-READ | GET `/customer/requests/{requestId}/schedule-response` | Khách đọc phương án đang cần xác nhận |
| F1-J80 | POST `/customer/requests/{requestId}/schedule-response` | Khách đồng ý hoặc từ chối lịch đề xuất |
| F1-J81 | POST `/manager/contracts/{contractId}/refund/start` | Ghi nhận bắt đầu thực hiện nghĩa vụ hoàn tiền |

## API hiện có thay đổi nghiệp vụ hoặc dữ liệu

Các thay đổi gồm cả DTO dùng chung; không phải operation nào cũng đổi schema trực tiếp.

| Mã | Method và đường dẫn | Thay đổi cần kiểm tra |
|---|---|---|
| F1-J09 | GET `/customer/request-form-options` | Quy tắc thời gian và ngày lấy ngựa sớm nhất từ cấu hình |
| F1-J14 | GET `/customer/horses/selectable` | Loại trừ chính request đang sửa khi kiểm tra ngựa có thể chọn |
| F1-J18 | POST `/customer/requests` | Kiểm tra hồ sơ, thời gian chuẩn bị và dự phòng xét duyệt |
| F1-J19 | PUT `/customer/requests/{requestId}` | Chỉ gửi lại khi được yêu cầu bổ sung còn hiệu lực; tăng revision |
| F1-J21 | GET `/customer/requests` | Thông tin hợp đồng và hoàn tiền trong danh sách |
| F1-J22 | GET `/customer/requests/{requestId}` | Lịch đã thống nhất và thông tin hoàn tiền hiện tại |
| F1-J24 | GET `/manager/requests` | Thông tin hợp đồng và hoàn tiền trong danh sách |
| F1-J25 | GET `/manager/requests/{requestId}` | Thông tin nghĩa vụ hoàn và trạng thái hiện tại |
| F1-J26 | POST `/manager/requests/{requestId}/accept` | Kiểm tra reviewId, revision, optionId, kết quả hai bên, đồng ý lịch và thời gian |
| F1-J27 | POST `/manager/requests/{requestId}/request-changes` | Bổ sung giấy tờ hoặc xác nhận lịch; mở hạn phản hồi; chặn sau chấp thuận |
| F1-J28 | POST `/manager/requests/{requestId}/reject` | Từ chối trước chấp thuận, đóng xét duyệt |
| F1-J29 | GET `/manager/requests/{requestId}/contract-editor` | Dữ liệu soạn theo lịch/phương thức đã duyệt |
| F1-J30 | PUT `/manager/requests/{requestId}/contract-draft` | Giữ lịch đã duyệt, chặn soạn khi feedback còn chờ xử lý |
| F1-J32 | POST `/manager/requests/{requestId}/contract/publish` | Kiểm tra lại xét duyệt, thời gian và giao dịch liên quan |
| F1-J34 | GET `/customer/requests/{requestId}/contract` | Hạn chung và thông tin hợp đồng/hoàn tiền hiện tại |
| F1-J40 | POST `/manager/contracts/{contractId}/extend-deadline` | Giới hạn hạn mới theo ngày lấy ngựa trừ thời gian chuẩn bị; lỗi rõ lý do |
| F1-J42 | GET `/customer/requests/{requestId}/deposit` | Giao dịch chờ đối soát, tiền đã xác minh và nghĩa vụ hoàn |
| F1-J43 | POST `/customer/invoices/{invoiceId}/payment-session` | Tiếp tục cùng phiên VNPay còn hạn, đối soát trước khi tạo/thử lại |
| F1-J44 | GET `/customer/payments/{paymentId}` | `refresh=true` yêu cầu đối soát, có giới hạn tần suất |
| F1-J45 | GET `/manager/payments` | Lý do giao dịch cần đối soát |
| F1-J46 | GET `/manager/payments/{paymentId}` | Chi tiết và đối soát cho Manager |
| F1-J50 | POST `/customer/contracts/{contractId}/sign-otp` | Chặn khi thiếu cọc, hết hạn hoặc thiếu thời gian chuẩn bị |
| F1-J51 | POST `/customer/contracts/{contractId}/sign` | Kiểm tra lại trước ký; thành công mới tạo Trip |
| F1-J52 | POST `/customer/requests/{requestId}/cancel` | Có tiền đã xác minh thì chờ Manager quyết định hủy |
| F1-J53 | POST `/manager/requests/{requestId}/cancel` | Manager hủy trực tiếp, kết thúc request/contract và tạo nghĩa vụ hoàn nếu có tiền |
| F1-J54 | POST `/manager/contracts/{contractId}/cancellation/decision` | Duyệt hoặc từ chối yêu cầu hủy của khách |
| F1-J55 | POST `/manager/contracts/{contractId}/refund/complete` | Xác minh chứng từ, đúng số tiền và thời điểm hoàn |
| F1-J67 | GET `/payments/vnpay/ipn` | Xác minh tiền; xử lý thông báo trùng và thanh toán muộn an toàn |
| F1-J69 | POST `/manager/payments/{paymentId}/cancel` | Đối soát trước khi kết luận, không tự đánh dấu thất bại khi chưa rõ kết quả |
| F1-J71 | POST `/manager/payments/{paymentId}/confirm` | Chỉ đối soát/áp dụng khoản VNPay đã xác minh, không xác nhận tiền thủ công |

## Thứ tự test

1. Customer lấy form-options, tạo request: thử thiếu thời gian rồi ngày hợp lệ.
2. Manager đọc reviews và phân công đúng revision. Điều phối mở queue/detail rồi đánh giá. Lịch đề xuất phải FEASIBLE và khác lịch gốc.
3. Specialist lấy optionId, checklistVersion, itemId; xem file và gửi đầy đủ checklist cho từng lịch khả thi. Hạn nộp: hôm nay ≤ hạn ≤ ngày lấy ngựa.
4. Manager đọc kết quả; thử duyệt khi thiếu kết quả. Gửi yêu cầu bổ sung hoặc xác nhận lịch. Customer phản hồi bằng đúng phiên hiện tại. Thử lại bằng revision cũ phải bị chặn.
5. Manager duyệt, lưu nháp, phát hành. Sau duyệt không được bắt khách sửa và gửi lại request. Lịch hợp đồng phải đúng lịch đã thống nhất, không tự cộng ngày.
6. Customer đồng ý điều khoản, mở thanh toán rồi bấm Back: còn hạn phải tiếp tục cùng phiên. Đối soát bằng refresh=true. Chưa rõ tiền thì giữ chờ xác minh.
7. Đủ cọc mới gửi OTP/ký. Thử hết hạn, gia hạn hợp lệ và không còn đủ thời gian chuẩn bị.
8. Khách hủy khi có cọc: Manager từ chối, khách yêu cầu lại, Manager chấp nhận. Nhánh khác: Manager tự hủy phải kết thúc trực tiếp, không ghi thành khách yêu cầu hủy.
9. Hoàn tiền: start → complete. Thử thiếu reference, sai amount hoặc thời điểm không hợp lệ rồi dữ liệu đúng. Nhánh hủy không được tạo Trip.

Body phân công:

```json
{"coordinatorId":"USER_006","specialistId":"USER_005","requestRevision":1}
```

Body duyệt request, thay ID bằng response thật:

```json
{"reviewId":"<reviewId>","requestRevision":1,"scheduleOptionId":"<optionId>"}
```

Body xác minh hoàn:

```json
{"reference":"<chứng từ thực tế>","amount":400000,"refundedAtUtc":"<thời điểm thực tế ISO 8601 UTC>"}
```

Amount phải bằng nghĩa vụ backend tính. UI lấy số tiền tự động nên chỉ nhập chứng từ/thời gian; thử sai amount là test qua Swagger.

## Phạm vi và giới hạn

- JSON chi tiết: [MORE-BUSINESS-RULE-FLOW1-API-JSON.md](MORE-BUSINESS-RULE-FLOW1-API-JSON.md). Đây là thiết kế đích; ưu tiên OpenAPI hiện hành và danh sách bàn giao này khi khác nhau.
- SQL: `flow1-request-review-upgrade.sql`, `flight-catalog-dates-upgrade.sql`; sửa dữ liệu hủy legacy bằng `flow1-manager-cancellation-repair.sql` trong `backend/database`.
- Không khóa Flow 3 start-planning. Danh mục bay hiện có bổ sung ngày vào timestamp; danh sách tài nguyên thẩm định chưa tự lọc ngày/tuyến bay.
- Bổ sung F6-J49 vào nhóm hiển thị Swagger để sửa lỗi sinh tài liệu; không đổi nghiệp vụ Flow 6.
- VNPay chưa xác minh toàn trình với nhà cung cấp trong lần bàn giao này. Network error/mã 99 giữ chờ đối soát; hết hạn phiên không chứng minh tiền chưa bị trừ.
- Fixture chính thuộc USER_001: B REQUEST_008, C REQUEST_009, D REQUEST_010, E REQUEST_011, F REQUEST_012, G1 REQUEST_013, G2 REQUEST_014, G3 REQUEST_015. Trạng thái có thể đã thay đổi do test; REQUEST_015 đã hủy và có nghĩa vụ hoàn.
- Git chứa công cụ fixture, không chứa backup database hoặc manifest runtime.
