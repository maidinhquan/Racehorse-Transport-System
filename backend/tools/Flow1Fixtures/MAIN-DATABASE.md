# Test B–G trong database chính

Mở **http://localhost:5173**, database **HorseTransportDB**.
Toàn bộ request và ngựa fixture thuộc **USER_001 — Nguyễn Văn A (CLB Hà Nội)**.

| Fixture | Request | Trạng thái bắt đầu |
|---|---|---|
| B | REQUEST_008 | Chờ Điều phối, đã phân công USER_006 và USER_005 |
| C | REQUEST_009 | CONTRACT_007 v1 đã phát hành, chưa nhận cọc |
| D | REQUEST_010 | CONTRACT_008 v1 đã xác minh cọc 400.000 VND, chưa ký |
| E | REQUEST_011 | Quá hạn khách bổ sung; worker tự hủy |
| F | REQUEST_012 | CONTRACT_009 v1 đã xác minh cọc, đã hết hạn, chưa ký |
| G1 | REQUEST_013 | Đã thẩm định, chờ Quản lý; lịch hiện không đủ thời gian |
| G2 | REQUEST_014 | CONTRACT_010 v1 là bản nháp; lịch hiện không đủ thời gian phát hành |
| G3 | REQUEST_015 | CONTRACT_011 v1 đã nhận cọc, hết hạn và không đủ thời gian gia hạn |

Đăng nhập nhanh bằng Khách hàng USER_001, Quản lý USER_004,
Điều phối USER_006, Chuyên viên USER_005.

Thao tác và kết quả mong đợi của từng nhánh xem bảng B–G trong
[hướng dẫn](README.md#bắt-đầu-từng-nhánh). Thông tin hiện hành nằm ở
`data/Flow1Fixtures/main-manifest.json`.

Các khoản cọc D, F, G3 là dữ liệu mô phỏng được gieo trực tiếp vào database.
Ngày đi B–F cách ngày chuẩn bị 30 ngày, G1–G3 cách 2 ngày.
Mỗi request có một ngựa riêng. Hồ sơ mẫu được sao chép từ HORSE_008,
quyền sở hữu ngựa mới và snapshot hợp đồng đều dùng khách USER_001.

OTP khi ký F sử dụng cấu hình email của backend chính. Hộp thư console
của môi trường cổng 5174 trong README cũ chỉ phục vụ backend fixture riêng.

## Tạo bộ mới khi đã test xong

Chạy từ thư mục dự án.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/tools/Prepare-Flow1Fixtures.ps1 -MainDatabase -CustomerId USER_001
```

Mỗi lần chạy tạo một bộ request/ngựa mới, cập nhật ngày tương đối theo
thời điểm chạy và ghi lại main-manifest. Các bộ về sau có thêm thời điểm
ở tên ngựa để phân biệt. Lịch sử bộ đã test được giữ lại.

Script sao lưu COPY_ONLY database chính trước khi gieo dữ liệu. Tham số
`-Reset` bị chặn ở chế độ MainDatabase. Việc phục hồi toàn bộ database
chính cần quyết định riêng vì có thể ghi đè những thay đổi khác của nhóm.

Sau khi tạo dữ liệu, đăng nhập USER_001 và tải lại trang.
