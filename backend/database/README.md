# SQL đang sử dụng

Các script triển khai:

| File | Khi nào dùng |
|---|---|
| `000_legacy_schema.sql` | Khởi tạo schema gốc cho **database trống**. Không dùng để reset database có dữ liệu. |
| `001_registration_unique_indexes.sql` | Index riêng của đăng ký tài khoản; giữ độc lập với Flow 1. Script yêu cầu chọn HorseTransportDB. |
| **`002_flow1.sql`** | **Schema nền tảng Flow 1**, chạy sau schema gốc. Đã bao gồm CreatedAtUtc; tính năng giới hạn địa chỉ theo tỉnh/thành phố cần thêm 004_request_city_scope.sql. |
| `003_request_created_at.sql` | Nâng cấp database đã chạy Flow 1: chỉ thêm CreatedAtUtc nullable với default UTC cho bản ghi mới; giữ null cho bản ghi cũ, không reset dữ liệu. |
| `004_request_city_scope.sql` | Thêm ID địa giới và tên tỉnh/thành phố đã chọn cho điểm nhận/giao; chạy trước khi triển khai xác minh địa chỉ theo thành phố. Không cần bảng danh mục toàn thế giới. |

| `005_request_submission_content.sql` | Thêm hash nội dung/file cho khóa chống gửi trùng của POST request một bước; chạy trước khi triển khai API multipart mới. |

## Cách chạy Flow 1

Chọn đúng database đích trong SSMS rồi chạy toàn bộ `002_flow1.sql`, hoặc:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d HorseTransportDB -i backend/database/002_flow1.sql
```

Backup và kiểm tra dữ liệu trước khi thay schema trên database có dữ liệu. Không chạy migration khi backend đang ghi dữ liệu. Ứng dụng không tự chạy SQL khi khởi động.

`002` là một file tự chứa, không import file khác, không cần SQLCMD mode và không có GO. Các bước nằm trong một transaction chung: nếu bước cuối lỗi thì các bước trước cũng rollback. Có khóa migration, kiểm tra cột/index/CHECK và dữ liệu xung đột. Gặp định nghĩa không tương thích sẽ dừng, không xóa hoặc đổi kiểu để ép chạy.

File dùng được với schema gốc, database đang ở giữa chuỗi migration đang dùng và schema cuối đã nâng cấp trước khi gộp. Chạy lại giữ dữ liệu, không seed tài khoản/yêu cầu/thanh toán. Từ 20/10/2026, chỉ thêm một bảng danh mục `COST_RATE` với 10 định mức VND; seed chỉ chèn mã còn thiếu, không ghi đè đơn giá đã sửa. `COST_ITEM` giữ nguyên tám cột, năm dòng kế hoạch dùng mã `PLANNED_TRANSPORT/CREW/PERMIT/VET/INSURANCE` (mỗi mã đầy đủ bắt đầu bằng `PLANNED_`). Không tự tạo chi phí cho hợp đồng cũ. RequestID của hợp đồng cũ chỉ được nối từ Trip đang tồn tại khi chưa có liên kết; không suy đoán liên kết.

## Database hiện tại

Cập nhật 20/10/2026: HorseTransportDB trên máy phát triển đã áp dụng COST_RATE sau backup có CHECKSUM/VERIFYONLY, khôi phục thử và đối chiếu toàn bộ bảng cũ. Máy teammate chưa có COST_RATE vẫn phải chạy bản 002 mới trước khi test tính giá. Các đơn giá chỉ là định mức đồ án đã chốt; bảo hiểm 0,5% không phải báo giá hãng bảo hiểm. Hướng dẫn API/công thức ở `FLOW1_RUN_GUIDE.md` tại root.

HorseTransportDB trên máy đã có schema cuối từ lượt nâng cấp trước. **Không cần chạy lại để test Swagger**. Lần gộp này chỉ sửa source, fixture kiểm thử và tài liệu; không đổi database hay khởi động lại API đại ca đang sử dụng.

## Chỉ giữ schema cuối

Các SQL lịch sử của Flow 1 đã xóa hẳn, kể cả trong test. Test nghiệp vụ và harness đều dùng `000` (schema nền cho database tạm) → **`002`**. `001` thuộc đăng ký tài khoản, không phải một phiên bản của Flow 1.

Test chỉ kiểm tra schema hiện hành: đầy đủ cột/khóa/guard, chạy lại không đổi dữ liệu, từ chối cột sai kiểu, rollback toàn bộ khi lỗi và các nghiệp vụ Flow 1. Không còn bộ test cho profile SQL cũ hoặc so sánh với chuỗi migration đã bỏ.
