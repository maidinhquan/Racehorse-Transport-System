# Bộ fixture Flow 1

Mở **http://localhost:5174**. Backend test ở cổng **5130**, database là
`HorseTransportDB_Flow1Fixtures`. Ứng dụng thông thường vẫn ở cổng 5173.

Đăng nhập nhanh bằng các tài khoản đã có trong bản sao database.

| Vai trò | Tài khoản |
|---|---|
| Khách hàng | USER_002 — Trần Văn B |
| Quản lý | USER_004 — Trần Thị Linh |
| Điều phối | USER_006 — Phạm Hải |
| Chuyên viên | USER_005 — Lê Tuấn |

Các mã thực tế sau mỗi lần chuẩn bị nằm trong
`data/Flow1Fixtures/manifest.json`. Mỗi fixture có một ngựa riêng tên
`Fixture B`, `Fixture C`… Các request được tạo bằng service nghiệp vụ hiện tại,
đi qua xét duyệt và phát hành hợp đồng. Riêng khoản cọc D, F và G3 được gieo
trực tiếp vào database dưới dạng **thanh toán mô phỏng**, không phải bằng chứng
VNPay đã chuyển tiền. Kết nối VNPay được tắt trong backend fixture.

Hồ sơ ngựa và tọa độ được sao chép từ HORSE_008 / REQUEST_007 của bản sao
database. Seeder dùng bộ xác minh thành phố giới hạn đúng hai thành phố nguồn.
Việc tạo fixture không phải phép thử bản đồ hoặc giấy tờ ngoài đời.
PDF của các hợp đồng được renderer tạo thật từ snapshot của từng fixture.

## Bắt đầu từng nhánh

Mã trong bảng dưới là kết quả chuẩn bị ngày 07/11/2026. Manifest là nguồn
tra cứu khi chạy lại. Database là bản sao local, vì vậy cũng có các dữ liệu
cũ. Dùng mã request trong manifest hoặc tên ngựa Fixture để tìm đúng ca.

| Fixture | Request | Mốc bắt đầu | Thao tác trên UI và kết quả cần thấy |
|---|---|---|---|
| B | REQUEST_008 | Chờ Điều phối, đã phân công | Điều phối mở Thẩm định yêu cầu, kết luận lịch gốc không khả thi và bỏ đề xuất lịch khác. Quản lý từ chối yêu cầu. Kiểm tra trạng thái Đã từ chối, không có Trip. |
| C | REQUEST_009 | CONTRACT_007 v1 đã phát hành, chưa có tiền | Quản lý hủy yêu cầu hoặc khách hủy hợp đồng. Kiểm tra request và hợp đồng đã hủy. Tạo đơn mới với ngựa Fixture C cùng lịch cũ để kiểm tra ngựa được giải phóng. |
| D | REQUEST_010 | CONTRACT_008 v1 đã đủ cọc 400.000 VND, chưa ký | Khách yêu cầu hủy. Quản lý từ chối hủy. Kiểm tra quay về Đã xác minh cọc. Khách yêu cầu lại, Quản lý chấp thuận. Vào Tiền cọc & thanh toán để bắt đầu hoàn và xác minh hoàn bằng mã chứng từ test riêng. |
| E | REQUEST_011 | Đã quá hạn khách bổ sung | Sau khi khởi động backend, chờ worker kiểm tra, khoảng một phút. Kiểm tra request chuyển Đã hủy, phiên xét duyệt đóng và khách không thể gửi lại bản sửa cũ. Nếu mở sau thời điểm worker chạy, trạng thái đã hủy là kết quả mong đợi. |
| F | REQUEST_012 | CONTRACT_009 v1 đã đủ cọc 400.000 VND, đã hết hạn, chưa ký | Khách mở hợp đồng, kiểm tra ký bị khóa vì hết hạn. Quản lý gia hạn với lý do. Khách tải lại, gửi OTP, đọc mã tại console SMTP fixture rồi ký. Kiểm tra hợp đồng có hiệu lực và chỉ có một Trip. |
| G1 | REQUEST_013 | Hai vai đã kết luận khả thi, chờ Quản lý; lịch đi hiện quá gần | Quản lý bấm chấp thuận. Kiểm tra lỗi không đủ thời gian. Yêu cầu khách bổ sung, khách chọn lịch đủ xa rồi gửi lại cùng request để mở vòng xét duyệt mới. |
| G2 | REQUEST_014 | CONTRACT_010 v1 đang là bản nháp; lịch đi hiện quá gần | Quản lý mở hợp đồng, hoàn tất các bước và phát hành. Kiểm tra backend từ chối vì không đủ thời gian hoàn tất hợp đồng và chuẩn bị. |
| G3 | REQUEST_015 | CONTRACT_011 v1 đã nhận cọc, hết hạn và lịch đi hiện quá gần | Khách không ký được. Quản lý thử gia hạn, kiểm tra thông báo mốc chuẩn bị đã qua. Thực hiện hủy và hoàn cọc nếu dừng, rồi tạo yêu cầu mới cho lịch khác. |

Ngày đi B–F được đặt sau ngày chuẩn bị 30 ngày. G1–G3 sau 2 ngày.
E và F được tạo theo đồng hồ lùi hai ngày, G theo đồng hồ lùi 20 ngày rồi
đưa vào ứng dụng chạy thời gian thật. Vì vậy, các trạng thái quá hạn xuất
phát từ việc thời gian đã trôi qua sau lúc tạo dữ liệu hợp lệ.

Sau khi request được chấp thuận, quy tắc hiện tại khóa việc đưa khách
về form sửa và gửi lại. Vì vậy G2/G3 kết thúc qua hủy, xử lý tiền rồi
tạo yêu cầu mới; G1 còn ở bước xét duyệt nên được sửa cùng request.

## OTP của fixture F

Sau khi bấm gửi OTP trên UI, chạy lệnh sau ở console.

```powershell
docker logs --tail 60 racehorse-transport-system-fixture-mail-1
```

Mã nằm sau `Confirmation code`. SMTP chỉ lắng nghe loopback bên trong
backend fixture. Email được giữ trong log local.

## Khôi phục mốc bắt đầu

Từ thư mục dự án, chạy lệnh sau.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/tools/Prepare-Flow1Fixtures.ps1 -Reset
```

Lệnh dừng ba container fixture, phục hồi **toàn bộ database fixture** từ
bản sao nguồn, tạo lại các mốc B–G theo ngày hiện tại rồi khởi động dịch vụ.
Toàn bộ tiến độ đang test trong database fixture sẽ bị thay thế. Các ID
cần đọc lại từ manifest. Sau reset, tải lại trang để bỏ dữ liệu đang nhớ.

Lần chuẩn bị đầu tiên dùng cùng lệnh nhưng bỏ `-Reset`. Chạy khi backend
và frontend thông thường đang hoạt động. Script tạo backup COPY_ONLY của
`HorseTransportDB`, dùng file dữ liệu riêng cho database fixture và kiểm
tra tên đích trước khi RESTORE WITH REPLACE. Thông tin kết nối lấy từ
container local đang chạy và không ghi vào manifest.

Script từ chối ghi vào database có tên khác
`HorseTransportDB_Flow1Fixtures`. Metadata backup nằm trong
`.local/flow1-fixtures/state.json`; giữ file này để dùng lệnh reset.

## Dừng và mở lại dịch vụ fixture

```powershell
docker stop racehorse-transport-system-fixture-mail-1 racehorse-transport-system-fixture-frontend-1 racehorse-transport-system-fixture-backend-1
docker start racehorse-transport-system-fixture-backend-1 racehorse-transport-system-fixture-mail-1 racehorse-transport-system-fixture-frontend-1
```

Các container giữ sẵn cấu hình kết nối, nên mở lại bằng lệnh start không
cần tạo lại database.
