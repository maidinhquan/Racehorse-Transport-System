# Gửi yêu cầu vận chuyển một bước

## API

- `POST /api/customer/requests`: tạo đầy đủ và gửi thẳng `PENDING_REVIEW`; cần Bearer CUSTOMER và `Idempotency-Key` UUID.
- `PUT /api/customer/requests/{requestId}`: chỉ chủ đơn ở `CHANGES_REQUESTED`; thay thông tin đầy đủ, đính kèm hồ sơ cần thay, gửi lại `PENDING_REVIEW`.
- Không còn `POST .../{requestId}/submit` hoặc `POST .../{requestId}/horses/{horseId}/documents`.
- Đơn `REJECTED` kết thúc, không mở lại qua PUT. Đơn `DRAFT` cũ không được gửi qua API mới; khách tạo yêu cầu đầy đủ mới.

Content-Type: `multipart/form-data`, gồm `data` (chuỗi JSON UTF-8) và `files` (nhiều file). Giới hạn 33 file, 10 MiB/file, tổng file 60 MiB, body 64 MiB. PDF/PNG/JPEG phải có chữ ký hợp lệ. Không đưa URL do khách cung cấp vào database.

## Ví dụ data

ID thành phố/ngựa dưới đây là minh họa. Phải lấy cityId thật từ `GET /api/locations/cities?q=...&country=...`, rồi chọn địa chỉ/tọa độ từ `GET /api/locations/search?q=...&country=...&cityId=...`.

```json
{
  "origin": "Hanoi, Vietnam",
  "destination": "Tokyo, Japan",
  "originCountry": "VN",
  "destinationCountry": "JP",
  "mode": "AIR",
  "expectedTransportDate": "2027-12-25",
  "expectedDeliveryDate": "2027-12-27",
  "careInstructions": "Tiếp cận ngựa nhẹ nhàng.",
  "purpose": "Competition",
  "pickup": {
    "name": "Chuồng nhận", "address": "Địa chỉ nhận đã chọn", "postal": "100000",
    "contact": "Người giao", "phone": "0901234567", "notes": "",
    "latitude": 21.02, "longitude": 105.8, "cityId": "<cityId Hanoi>"
  },
  "delivery": {
    "name": "Chuồng giao", "address": "Địa chỉ giao đã chọn", "postal": "1000000",
    "contact": "Người nhận", "phone": "0907654321", "notes": "",
    "latitude": 35.6, "longitude": 139.7, "cityId": "<cityId Tokyo>"
  },
  "horses": ["HORSE_001"],
  "horseNotes": {"HORSE_001": "Dùng dây dắt quen thuộc."},
  "documents": [
    {"fileName": "invitation.pdf", "documentType": "INVITATION_LETTER"},
    {"fileName": "health.pdf", "documentType": "HEALTH_CERTIFICATE", "horseId": "HORSE_001", "expiryDate": "2028-01-31"}
  ]
}
```

Chọn hai file `invitation.pdf` và `health.pdf` trong trường `files` của Swagger. Không dùng đường dẫn máy cá nhân làm fileName. Nếu không có hồ sơ theo đơn cần đính kèm, gửi `documents: []` và không có files; hồ sơ ngựa dùng chung vẫn phải đầy đủ.

## Nơi lưu và hồ sơ bắt buộc

| documentType | Phạm vi | Nơi lưu |
|---|---|---|
| INVITATION_LETTER | Không có horseId | TRANSPORT_REQUEST.InvitationLetterFileUrl |
| COMPETITION_REGISTRATION | Không có horseId | TRANSPORT_REQUEST.CompetitionRegistrationFileUrl |
| ATA_CARNET | Không có horseId | TRANSPORT_REQUEST.AtaCarnetFileUrl |
| Mã UPPER_SNAKE_CASE tối đa 50 ký tự: COGGINS_TEST / EQUINE_FLU_VAX / DOMESTIC_VET_PASS / HEALTH_CERTIFICATE… | horseId thuộc horses | LEGAL_MEDICAL_RECORD, RequestID + HorseID |

Không mặc định buộc mọi chuyến phải có thư mời/ATA Carnet. Nhóm file chung phụ thuộc mục đích và yêu cầu nghiệp vụ; API không tự phát minh checklist pháp lý theo quốc gia. Điều kiện nền vẫn yêu cầu ngựa thuộc khách, có ảnh, scan hộ chiếu, giấy sở hữu, giá trị khai báo dương và hộ chiếu còn hạn qua ngày giao. Tài liệu có expiryDate được gửi phải còn hạn qua ngày giao. Trạng thái tài liệu mới là `PENDING_REVIEW`, không tự coi là VERIFIED.

Đọc hồ sơ chung qua `GET /api/{customer|manager}/requests/{requestId}/shared-documents/{documentType}`. Đọc hồ sơ từng ngựa qua `GET /api/{customer|manager}/requests/{requestId}/documents/{recordId}`. Các URL có trong chi tiết đơn; quyền được kiểm tra phía server.

PUT không gửi lại file chưa thay sẽ giữ liên kết cũ. File mới cùng horseId/documentType thay bản liên kết hiện tại và quay về PENDING_REVIEW. Bỏ ngựa khỏi đơn sẽ bỏ hồ sơ theo đơn của ngựa đó, không xóa hồ sơ HORSE hoặc bytes dùng chung.

## Transaction, retry và triển khai

- Xác minh thành phố/tọa độ và lưu bytes riêng tư trước transaction; trong transaction kiểm tra lại tài khoản, trạng thái, tuyến, thời gian chuẩn bị, quyền sở hữu ngựa và toàn khoảng lịch.
- Request, liên kết ngựa, metadata hồ sơ và thông báo được commit cùng nhau. Lỗi không để lại đơn chưa đầy đủ trong queue. Bytes theo hash chưa được tham chiếu có thể còn lại khi transaction thất bại; không tự xóa bytes có thể đang dùng chung.
- Cùng Idempotency-Key và cùng đầy đủ data/file trả cùng RequestID; thay liên hệ, ngày, ngựa, ghi chú, metadata hoặc bytes thì `409 IDEMPOTENCY_KEY_REUSED`. Thứ tự multipart và thứ tự dictionary không ảnh hưởng hash.
- API không nhận customerId, requestId, createdAt hoặc trạng thái do khách tự đặt. createdAt do server ghi UTC.
- Với database đang chạy, áp dụng lần lượt các migration còn thiếu `003_request_created_at.sql`, `004_request_city_scope.sql`, `005_request_submission_content.sql` trước triển khai. Không chạy script tạo/reset database trên dữ liệu thật.
- Đây là thay đổi contract cho frontend: gửi multipart trực tiếp, không tạo nháp hoặc gọi submit riêng. Commit code không tự triển khai hoặc chạy migration trên database dùng chung.
