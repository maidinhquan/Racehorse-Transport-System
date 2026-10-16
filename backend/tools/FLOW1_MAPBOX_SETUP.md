# Mapbox cho Flow 1

Đại ca đã chọn Mapbox ngày 16/10/2026. Adapter dùng Geocoding v6 forward/reverse và
Directions v5 `mapbox/driving`. Customer gọi backend, token không gửi tới browser.
Không thêm bảng/cột. OSM còn dùng được khi cấu hình `Provider=OSM`; không fallback tự động.

## Cấu hình local

Merge phần sau vào `backend/WebApi/appsettings.Local.json` đang có, giữ nguyên cấu hình
khác. File local bị Git ignore. Không điền token vào file example hoặc chat.

```json
{
  "Flow1": {
    "Maps": {
      "Provider": "MAPBOX",
      "MayPersistResults": false,
      "Mapbox": {
        "AccessToken": "",
        "PermanentGeocodingEnabled": false,
        "Attribution": "© Mapbox © OpenStreetMap"
      }
    },
    "Estimate": {
      "StandardVehicleCapacityStalls": null
    }
  }
}
```

1. Điền AccessToken cho phép backend gọi Geocoding/Directions/Static Images (`styles:tiles`);
   kiểm tra hạn mức và
   giới hạn token của tài khoản. Lỗi 401/403 trả MAP_PROVIDER_AUTH_FAILED, không lộ raw body.
2. Xác minh tài khoản được dùng Permanent Geocoding rồi mới bật
   `PermanentGeocodingEnabled=true` và `MayPersistResults=true`. Cờ local không tự cấp quyền
   tài khoản hay kích hoạt dịch vụ có phí. Mọi forward/reverse gửi `permanent=true` vì Flow 1
   lưu địa chỉ/tọa độ vào snapshot.
3. Điền sức chứa xe chuẩn được xác nhận vào `StandardVehicleCapacityStalls`; không lấy
   số 2 trong fixture làm dữ liệu đội xe thật.
4. Restart backend để nạp cấu hình. Nếu frontend dùng proxy cũ, đặt
   `VITE_API_URL=http://localhost:5129/api` hoặc URL WebApi của môi trường khi chạy frontend.

Có thể dùng environment thay JSON: `Flow1__Maps__Mapbox__AccessToken`,
`Flow1__Maps__Mapbox__PermanentGeocodingEnabled`, `Flow1__Maps__MayPersistResults`,
`Flow1__Estimate__StandardVehicleCapacityStalls`. Không in token khi kiểm tra cấu hình.

Theo [Mapbox storage rules](https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results),
Temporary không cho cache; Permanent cho lưu và yêu cầu tài khoản đáp ứng điều kiện
thanh toán/hợp đồng của Mapbox. Kiểm tra tài khoản thực tế; không mặc định flow này miễn phí.

## Nghiệm thu

Chưa có token/quyền lưu/sức chứa được xác nhận ở lượt triển khai adapter. Chưa gọi live API.
Khi đã cấu hình, smoke VN→VN phải có km thật và nguồn MAPBOX, giá VND và sàn 2/3 ngày.
Điểm đã chọn phải tải được ảnh bản đồ Mapbox qua backend, giữ logo và attribution trên ảnh.
VN→JP phải xác minh cả hai quốc gia, sàn 7 ngày và ghi rõ chỉ airport-to-airport chưa gồm
ground legs; không gọi Directions xuyên Việt Nam–Nhật. Ghi evidence không chứa token/raw URL.
Không seed/đổi DB nghiệp vụ; submit E2E tiếp tục chạy trên DB test riêng.

HTTP client Mapbox tắt logging URI của HttpClientFactory, không follow redirect, chỉ cho
HTTPS api.mapbox.com hoặc loopback fixture; timeout 15 giây, response cap 1 MB. Không bật
thêm tracing raw URL chứa token. Lỗi provider/network được sanitize trước khi trả/log.
Search chủ động, `autocomplete=false`, có attribution; driving chỉ phục vụ lập dự toán,
chưa xác nhận tuyến phù hợp với phương tiện/ngựa cụ thể.
Search tại Nhật gửi `country=jp&language=ja`. Để dùng kết quả Geocoding cùng Mapbox map,
UI hiển thị Static Images 600×300 tại điểm chọn; endpoint public được rate limit, ảnh
không cache, server giữ token. Không cần đưa token Mapbox vào VITE hoặc localStorage.

Connected test không gọi Mapbox thật:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAP_PROVIDER = 'MAPBOX'
dotnet build backend/Backend.slnx
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

Harness tự cấp token giả, HTTP responses và capacity fixture, kiểm API log không chứa token
giả. Kết quả local integration không thay nghiệm thu live.

Giao thức: [Geocoding v6](https://docs.mapbox.com/api/search/geocoding/),
[Directions](https://docs.mapbox.com/api/navigation/directions/),
[Static Images](https://docs.mapbox.com/api/maps/static-images/).
