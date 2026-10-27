# Bản đồ Flow 1 với tài khoản free

Ngày 16/10/2026: đại ca xác nhận tài khoản Mapbox free, đồng ý tách nguồn dữ liệu được lưu
và chốt **1 ngựa/xe** làm sức chứa chuẩn MVP. Không cần Mapbox Permanent cho cấu hình này.

## Phân công provider

| Chức năng | Provider | Lưu vào hồ sơ |
|---|---|---|
| Search địa chỉ, xác minh quốc gia | Geoapify Geocoding / Reverse | Có, kèm attribution |
| Km và thời gian đường bộ để tính giá | Geoapify Routing | Có, kèm provider/thời điểm/attribution |
| Ảnh bản đồ tại điểm đã chọn | Mapbox Static Images | Chỉ hiển thị; không lưu bytes vào snapshot |

`Provider` là map renderer; `DataProvider` chọn cả geocoding, reverse và routing.
Không fallback khi provider lỗi. Cấu hình cũ chưa có DataProvider giữ selector theo Provider.
Mapbox Geocoding vẫn yêu cầu Permanent nếu chọn làm nguồn lưu địa chỉ. Mapbox Directions
chỉ trả `MayPersist=false`; submit từ chối lưu kết quả này. Không bật cờ để vượt quyền tài khoản.

Geoapify Free cho phép lưu kết quả với attribution, không cần thẻ; hiện có 3.000 credits/ngày
dùng chung các API. Một yêu cầu không luôn tương đương một credit: routing dài có cách tính
riêng. Theo dõi quota của chính tài khoản, không tự nâng gói hoặc cho rằng mọi lưu lượng đều free.

Nguồn chính thức kiểm tra ngày 16/10/2026:

- [Geoapify storage FAQ](https://www.geoapify.com/), [Free plan và attribution](https://www.geoapify.com/pricing/), [credits](https://www.geoapify.com/pricing-details/).
- [Geocoding](https://apidocs.geoapify.com/docs/geocoding/), [Reverse](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/), [Routing](https://apidocs.geoapify.com/docs/routing/).
- [Mapbox Product Terms](https://www.mapbox.com/legal/product-terms): bản 2026-07, mục 2.10.1 hạn chế lưu kết quả Navigation API; không áp dụng hướng dẫn cache 30 ngày từ điều khoản cũ.
- [Mapbox Geocoding storage](https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results), [Static Images](https://docs.mapbox.com/api/maps/static-images/).

## Lấy key và cấu hình

1. Đăng ký tài khoản Free tại [Geoapify MyProjects](https://myprojects.geoapify.com/).
2. Tạo project, mở **API Keys**, lấy key được sinh cho project. Một key dùng cho cả
   Geocoding/Reverse/Routing. Không cần gửi key vào chat.
3. Trong `backend/WebApi/appsettings.Local.json`, chỉ điền `Flow1.Maps.Geoapify.ApiKey`;
   giữ nguyên Mapbox.AccessToken đã có và các cấu hình đăng nhập/mail/database.
4. Restart backend sau khi lưu. Endpoint và key chỉ nằm ở backend, không có `VITE_*` token.

Phần Flow1 mẫu để **merge**, không ghi đè toàn bộ file đang dùng:

```json
{
  "Flow1": {
    "Maps": {
      "Provider": "MAPBOX",
      "DataProvider": "GEOAPIFY",
      "MayPersistResults": true,
      "Geoapify": {
        "ApiKey": "",
        "ApiBaseUrl": "https://api.geoapify.com/"
      },
      "Mapbox": {
        "AccessToken": "",
        "PermanentGeocodingEnabled": false,
        "Attribution": "© Mapbox © OpenStreetMap"
      }
    },
    "Estimate": { "StandardVehicleCapacityStalls": 1 }
  }
}
```

`MayPersistResults=true` ở đây xác nhận dùng dữ liệu **Geoapify** có quyền lưu; không cấp
quyền lưu Mapbox. Token Mapbox cần quyền Static Images `styles:tiles`, logo/attribution giữ nguyên.
Có thể dùng env `Flow1__Maps__Geoapify__ApiKey` thay JSON.

File local đang được Git track từ trước dù có rule ignore. Tuyệt đối không stage/commit file
chứa credentials này; chỉ commit file example trống. Không in diff của file local hoặc raw HTTP URI.

## Attribution và bảo vệ key

Customer search, điểm đã chọn, estimate và detail sau reload đều có liên kết
`Powered by Geoapify` và `OpenStreetMap contributors (ODbL)`. Snapshot estimate giữ attribution
của nguồn xác minh quốc gia cho cả AIR (không có route). Mapbox map giữ logo/attribution riêng.

HTTP client Geoapify/Mapbox tắt URI logging, không redirect, chỉ tới HTTPS host chính thức hoặc
loopback fixture; timeout 15 giây bao gồm đọc body, JSON tối đa 1 MB, ảnh PNG tối đa 4 MB.
Lỗi 401/403/429/body/network được trả mã an toàn, không raw key/body/inner exception.
Geoapify chia sẻ gate 1 request/giây trong process; nhiều instance cần quota gateway chung.
Search chủ động, không gọi autocomplete theo từng phím. Không gửi contact, hồ sơ ngựa hay OTP
cho provider. Backend chỉ gửi địa chỉ/tọa độ cần cho chức năng địa lý.

## Nghiệm thu

Chạy connected browser bằng HTTP fixtures:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAP_PROVIDER = 'GEOAPIFY'
dotnet build backend/Backend.slnx
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

Harness cấp key giả chỉ trong process con, Mapbox Permanent=false, capacity=1; fixture từ chối
Mapbox Geocoding/Directions và kiểm credentials không lọt vào API log. Không gọi provider thật.

Khi đã có key thật, smoke VN→VN phải có country check, km thật, nguồn GEOAPIFY, giá VND,
sàn 2/3 ngày và preview Mapbox tải được. VN→JP xác minh cả hai quốc gia, sàn 7 ngày và chỉ
airport-to-airport; không gọi routing xuyên biển. Ghi evidence private, không có token/raw URL.
Không seed/áp migration DB nghiệp vụ. Key thiếu/lỗi không được thay bằng dữ liệu fixture để đóng phase 2.

Ngày 16/10/2026 đã nghiệm thu bằng key local thật: Geoapify road ngắn/dài, country VN/JP và
Mapbox preview; Customer Chrome đã submit/reload trên DB test với provider thật.
Evidence và giới hạn tại [báo cáo live phase 2](../../contracts/API-Flow/FLOW1_PHASE2_LIVE_REPORT.md).

Công cụ smoke độc lập, chạy từ repo root (không mở SQL/mail/payment):

```powershell
dotnet run --project backend/tools/Flow1MapsSmoke -- --preview-only
# Khi key Geoapify đã được điền:
dotnet run --project backend/tools/Flow1MapsSmoke -- --live
```

`--preview-only` tải một ảnh Mapbox và luôn ghi PARTIAL vì chưa kiểm cả nguồn dữ liệu.
`--live` dùng vài truy vấn địa danh công khai, hai tuyến đường bộ và một tuyến AIR VN→JP;
key thiếu hoặc một kiểm tra lỗi trả exit code 2. JSON/PNG evidence nằm trong private App_Data,
không chứa key/raw URL và không được commit. Đây là live Maps smoke, không phải nghiệm thu toàn Flow 1.
