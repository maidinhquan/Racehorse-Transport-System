# Flow 1 và Flow 3 sử dụng dữ liệu SQL

Trạng thái ngày 19/10/2026: bản sửa đang được kiểm chứng, chưa đủ điều kiện công bố hoàn tất 100%.

Đã xác nhận: backend build thành công; frontend build thành công; 11 bài SQL của AgreedFlowTests đạt; 4 bài giao diện Flow 1 và 3 bài giao diện Flow 3 đạt khi chạy riêng. Chưa xác nhận kết quả bộ hồi quy mở rộng hoặc demo E2E trên trình duyệt.

## Thay đổi chính

- Các route chính khách hàng, quản lý và điều phối dùng API. Không đọc kho mock hoặc localStorage để thay thế dữ liệu nghiệp vụ khi API lỗi.
- Flow 1 mới: đọc và đồng ý nội dung → xác minh cọc VNPay → ký OTP email → hợp đồng hiệu lực và tạo duy nhất một Trip.
- Một hạn chung 24 giờ. OTP gửi lại không reset hạn. Từ chối chỉnh sửa giữ nguyên PDF và phiên bản, reset đủ 24 giờ. Chấp thuận tạo bản nháp mới, chỉ sửa phần khách đã chọn; phát hành mới bắt đầu hạn mới.
- Tiền về muộn, giao dịch chưa đối soát và sai số tiền không được tự coi là thanh toán hoàn tất. Trước ký, hủy yêu cầu có cọc phải ghi nhận hoàn đủ tiền thực nhận và chứng cứ hoàn thực tế.
- Flow 3 lưu kế hoạch, hai chặng ROAD độc lập nếu có AIR, phân xe/ngựa/ba nhân sự khác nhau và chuyến bay vào SQL. Bản nháp chưa giữ chỗ. Gửi duyệt mới kiểm tra xung đột và giữ chỗ.
- Chuyên viên xác nhận khả thi, quản lý duyệt, điều phối xác nhận booking. Documents READY và Operations READY là hai cổng riêng trên cùng phiên bản. Quản lý cho khởi hành sau cùng.
- Hợp đồng, tiền và chuyến cũ được giữ lại; không chuyển chứng cứ cũ thành chứng cứ ký theo quy trình mới. Endpoint kế hoạch cũ trả HTTP 410 để tránh bỏ qua cổng nghiệp vụ.

## Các đường dẫn giao diện

| Vai trò | Đường dẫn |
|---|---|
| Khách hàng | `/customer/requests`, `/customer/requests/new`, `/customer/requests/:requestId` |
| Quản lý Flow 1 | `/manager/requests` |
| Điều phối Flow 3 | `/coordinator/trips` |
| Chuyên viên kiểm tra và hồ sơ | `/specialist/planning` |
| Quản lý phê duyệt kế hoạch | `/manager/planning` |

## Chuẩn bị cơ sở dữ liệu

Công cụ chỉ đọc để kiểm tra cấu hình hiện tại, không in mật khẩu:

```powershell
dotnet run --project backend/tools/Flow13Database/Flow13Database.csproj -- --inspect
```

Migration mới là `backend/database/008_flow1_deposit_before_signature.sql` và `009_flow3_persistent_planning.sql`. Phải có nền tảng 006/007 đã kiểm chứng trước. Không chạy seed hoặc reset DB.

Sau khi kiểm thử thành công, áp dụng migration bổ sung vào local HorseTransportDB đã cấu hình:

```powershell
dotnet run --project backend/tools/Flow13Database/Flow13Database.csproj -- --apply
```

Công cụ giới hạn thao tác áp dụng vào local HorseTransportDB. Không xóa bản ghi. Nếu dữ liệu hiện tại vi phạm constraint, migration thất bại và rollback thay vì tự sửa chứng cứ tài chính.

Xe có trường `OperatingCountry`. Dữ liệu cũ không được tự suy đoán quốc gia. Điều phối phải xác minh VN hoặc JP trước khi gửi kế hoạch. Nhân sự cần chứng chỉ trong STAFF_DOCUMENT, hiện dùng DRIVER_LICENSE và VET_LICENSE, trạng thái VALID và quốc gia phù hợp. Danh mục chuyến bay mới ban đầu rỗng, nhập thông tin thực tế từ hãng; không tự tạo chuyến bay mẫu.

## Chạy kiểm thử

```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.'
dotnet test backend/tests/Flow1.Tests/Flow1.Tests.csproj --filter 'FullyQualifiedName~AgreedFlowTests|FullyQualifiedName~PersistentPlanningTests|FullyQualifiedName~Relational|FullyQualifiedName~RequestBaselineTests' --logger 'trx;LogFileName=flow13-regression.trx'
```

Kiểm thử SQL tạo database riêng có tên RaceHorseFlow1Test_*, tự dọn theo giới hạn tên; không sử dụng dữ liệu HorseTransportDB. Các fixture bản đồ, SMTP và callback VNPay chỉ phục vụ kiểm thử. Chúng không chứng minh giao dịch sandbox của nhà cung cấp hoặc email Gmail thực tế đã hoạt động.

```powershell
cd frontend
npm run build
npx vitest run --config vitest.config.ts --maxWorkers 1 src/features/flow1/relational/DatabaseRequests.test.tsx src/features/coordinator/pages/planning/PlanningWorkspace.test.tsx
```

## Điều kiện còn phải xác minh

Bộ demo E2E đã được chuẩn bị trong `backend/tools/flow13-browser-case.cjs`, chạy qua `Flow1RelationalHarness` với `FLOW13_BROWSER=1`. Harness tạo DB riêng, khởi động API và Vite, dùng Chrome để thao tác qua UI rồi kiểm tra bất biến trong SQL và tự dọn DB. Mặc định kiểm tra ROAD; đặt `FLOW1_RELATIONAL_AIR=1` để chạy ROAD → AIR → ROAD. Cần cấu hình đường dẫn LibreOffice thực tế trong `RACEHORSE_TEST_LIBREOFFICE` trước khi chạy:

```powershell
$env:FLOW13_BROWSER='1'
$env:RACEHORSE_TEST_SQL_SERVER='.'
$env:RACEHORSE_TEST_LIBREOFFICE='<đường dẫn soffice.com thực tế>'
dotnet run --project backend/tools/Flow1RelationalHarness -- '<đường dẫn node.exe>' '<đường dẫn frontend/node_modules/playwright>'
```

Chưa thực thi bộ demo mới này. Ảnh chụp chỉ được tạo khi chạy thành công các bước tương ứng; không có ảnh demo hoặc kết quả E2E được giả lập sẵn.

1. Chạy lại toàn bộ nhóm hồi quy và kiểm thử Flow 3 sau các thay đổi cuối. Lần yêu cầu thực thi nâng quyền cho nhóm này đã bị từ chối; không được coi các bài chưa chạy là đạt.
2. Áp dụng migration mới sau kiểm thử. Kết quả đọc DB hiện tại: có 3 hợp đồng, 4 khoản thanh toán, 3 chuyến, 3 xe, 5 chứng chỉ; chưa có cột WorkflowVersion hoặc bảng FLOW3_PLAN. Chưa sửa dữ liệu DB nghiệp vụ.
3. Kiểm tra LibreOffice và cấu hình PDF, issuer, SMTP, khóa OTP, VNPay và nhà cung cấp bản đồ. Chưa tìm thấy soffice.com ở vị trí cài đặt chuẩn và chưa thấy LibreOfficePath trong cấu hình được đọc. Kiểm thử Flow 1 đã đạt dùng renderer và SMTP kiểm thử, chưa xác nhận PDF thực tế trên máy này. Mẫu v4 dùng nội dung mới trong agreed-template.json, thay toàn bộ thân mẫu cũ để không còn các điều khoản ba đợt thu, cửa sổ 72 giờ hoặc phí phát sinh trái quyết định mới. Cần render và kiểm tra bố cục thực tế trước khi dùng để ký.
4. Demo toàn bộ chuỗi bằng trình duyệt với ROAD và ROAD → AIR → ROAD, kiểm tra reload, phiên bản cũ, lỗi API, quyền truy cập và xung đột nguồn lực.
5. Đối chiếu lại bố cục HTML tham chiếu: các màn hình nối DB mới ưu tiên kiểm chứng nghiệp vụ; chưa xác nhận giống 100% bản HTML.
6. Các phần ngoài Flow 1/3 vẫn có mã demo cũ trong source. Không dùng kết quả này để tuyên bố cả sáu flow đã chuyển sang DB.
7. Chính sách tiền tệ và số ngày chuẩn bị trong hệ thống cũ còn cần cấu hình nghiệp vụ chính thức; không coi VND hoặc các mốc 2/3/7 ngày là quyết định mới của khách hàng.

Không commit hoặc push trong đợt sửa này.
