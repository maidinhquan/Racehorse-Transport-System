# Gửi yêu cầu vận chuyển một bước

## API

- `POST /api/customer/requests`: tạo đầy đủ và gửi thẳng `PENDING_REVIEW`; cần Bearer CUSTOMER và `Idempotency-Key` UUID.
- `PUT /api/customer/requests/{requestId}`: chỉ chủ đơn ở `CHANGES_REQUESTED`; thay thông tin đầy đủ, gửi lại `PENDING_REVIEW`.
- Không còn `POST .../{requestId}/submit` hoặc `POST .../{requestId}/horses/{horseId}/documents`.
- Đơn `REJECTED` kết thúc, không mở lại qua PUT. Đơn `DRAFT` cũ không được gửi qua API mới; khách tạo yêu cầu đầy đủ mới.

Content-Type: `application/json`. Gửi trực tiếp đối tượng JSON; không bọc trong trường `data` hoặc gửi multipart.

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
  "horseNotes": {"HORSE_001": "Dùng dây dắt quen thuộc."}
}
```

## Hồ sơ ngựa

Trước khi gửi yêu cầu, ngựa phải thuộc khách hàng, có ảnh, scan hộ chiếu, giấy sở hữu, giá trị khai báo dương và hộ chiếu còn hạn qua ngày giao. Upload hồ sơ ngựa qua `POST /api/customer/horses/{horseId}/files/{fileType}` với `photo`, `passport`, `ownership`, `value-proof`.

Bước tạo/sửa yêu cầu không nhận `documents`, `files` hoặc URL tệp, không tạo LEGAL_MEDICAL_RECORD. API đọc medical record hiện có vẫn giữ nguyên.

## Transaction, retry và triển khai

- Xác minh thành phố/tọa độ trước transaction; trong transaction kiểm tra lại tài khoản, trạng thái, tuyến, thời gian chuẩn bị, quyền sở hữu và lịch ngựa.
- Request, liên kết ngựa và thông báo được commit cùng nhau. Lỗi không để lại đơn chưa đầy đủ trong queue.
- Cùng Idempotency-Key và cùng nội dung trả cùng RequestID; thay nội dung trả `409 IDEMPOTENCY_KEY_REUSED`. Thứ tự ngựa và dictionary không ảnh hưởng hash.
- API không nhận customerId, requestId, createdAt hoặc trạng thái do khách tự đặt. createdAt do server ghi UTC.
- Database test dùng `HorseTransportDB/HorseTransportDB_Reviewed.sql` để tạo lại schema và dữ liệu mẫu. Schema đã bỏ các cột tài liệu dùng chung; không cần chạy migration riêng.
- Frontend gửi JSON trực tiếp cho POST/PUT; không tạo nháp hoặc gọi submit riêng.
