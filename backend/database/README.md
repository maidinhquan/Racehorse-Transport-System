# SQL đang sử dụng

Chỉ có ba script triển khai:

| File | Khi nào dùng |
|---|---|
| `000_legacy_schema.sql` | Khởi tạo schema gốc cho **database trống**. Không dùng để reset database có dữ liệu. |
| `001_registration_unique_indexes.sql` | Index riêng của đăng ký tài khoản; giữ độc lập với Flow 1. Script yêu cầu chọn HorseTransportDB. |
| **`002_flow1.sql`** | **Toàn bộ schema Flow 1 hiện hành**, chạy một file này sau schema gốc. Không cần chạy 003–009. |

## Cách chạy Flow 1

Chọn đúng database đích trong SSMS rồi chạy toàn bộ `002_flow1.sql`, hoặc:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d HorseTransportDB -i backend/database/002_flow1.sql
```

Backup và kiểm tra dữ liệu trước khi thay schema trên database có dữ liệu. Không chạy migration khi backend đang ghi dữ liệu. Ứng dụng không tự chạy SQL khi khởi động.

`002` là một file tự chứa, không import file khác, không cần SQLCMD mode và không có GO. Các bước nằm trong một transaction chung: nếu bước cuối lỗi thì các bước trước cũng rollback. Có khóa migration, kiểm tra cột/index/CHECK và dữ liệu xung đột. Gặp định nghĩa không tương thích sẽ dừng, không xóa hoặc đổi kiểu để ép chạy.

File dùng được với schema gốc, database đang ở giữa chuỗi migration đang dùng và schema cuối đã nâng cấp trước khi gộp. Chạy lại giữ dữ liệu, không tạo bảng nghiệp vụ mới, không seed tài khoản/yêu cầu/thanh toán. RequestID của hợp đồng cũ chỉ được nối từ Trip đang tồn tại khi chưa có liên kết; không suy đoán liên kết.

## Database hiện tại

HorseTransportDB trên máy đã có schema cuối từ lượt nâng cấp trước. **Không cần chạy lại để test Swagger**. Lần gộp này chỉ sửa source, fixture kiểm thử và tài liệu; không đổi database hay khởi động lại API đại ca đang sử dụng.

## Chỉ giữ schema cuối

Các SQL lịch sử của Flow 1 đã xóa hẳn, kể cả trong test. Test nghiệp vụ và harness đều dùng `000` (schema nền cho database tạm) → **`002`**. `001` thuộc đăng ký tài khoản, không phải một phiên bản của Flow 1.

Test chỉ kiểm tra schema hiện hành: đầy đủ cột/khóa/guard, chạy lại không đổi dữ liệu, từ chối cột sai kiểu, rollback toàn bộ khi lỗi và các nghiệp vụ Flow 1. Không còn bộ test cho profile SQL cũ hoặc so sánh với chuỗi migration đã bỏ.
