# Database test hiện hành

Nguồn schema duy nhất: `HorseTransportDB/HorseTransportDB_Reviewed.sql` ở root repository. File gồm bảng, cột, constraints, indexes, sequences và dữ liệu mẫu; không dùng các script migration đánh số nữa.

Chạy từ root bằng SQL Server Management Studio hoặc PowerShell:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -i HorseTransportDB/HorseTransportDB_Reviewed.sql
```

Script reset/recreate `HorseTransportDB_Reviewed` và seed dữ liệu test. Các cột mới gồm CreatedAtUtc, PickupCityId/PickupCityName, DeliveryCityId/DeliveryCityName và SubmissionContentHash nằm trực tiếp trong CREATE TABLE TRANSPORT_REQUEST. Unique indexes email/phone cũng có sẵn trong schema này.

Cấu hình backend trỏ tới HorseTransportDB_Reviewed. Khi đổi schema, sửa trực tiếp file Reviewed và tạo lại database test. Commit file SQL không tự chạy reset trên instance đang sử dụng.

Kiểm thử hiện hành: `dotnet test backend/tests/Flow1.Rebuild.Tests/Flow1.Rebuild.Tests.csproj`; mỗi fixture đổi tên DB thành Flow1Rebuild_<GUID>, tạo/reset từ đúng file này rồi dọn riêng database vừa tạo. Không chạy migration bổ sung trong fixture.

Các bài SQL migration/RowVersion của backend cũ giữ source với LegacySqlFact và lý do nghỉ dùng rõ ràng. Flow1RelationalHarness cũ dừng ngay và hướng dẫn dùng suite hiện hành; Flow1SwaggerHarness tạo fixture từ file Reviewed. Các test thuần logic và bản đồ vẫn chạy bình thường.
