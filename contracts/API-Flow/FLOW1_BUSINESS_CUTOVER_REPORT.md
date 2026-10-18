# Flow 1 — chuyển DB nghiệp vụ sang typed006

Ngày 18/10/2026, Asia/Saigon. Source baseline `9dc08280819a165881b4cfe4ab44cf00c1fc1f8a`.
Thực hiện tại worktree `codex/flow1-relational-mvp`, không merge primary/push/deploy.

## Quyền và kết quả

Đại ca trực tiếp duyệt: giữ `CTR_2026_001`, `CTR_2026_002`, `CTR_2026_003` như lịch sử
chưa xác minh; backup + kiểm restore; chuyển offline bằng006, đối chiếu rồi bỏ8cột
JSON cũ. Quyền này thay giới hạn cấm business apply trước đó cho đúng lượt chuyển này.
Không thêm bảng/FK, không tạo chứng cứ PDF/OTP giả, không đổi tiền/status/SignedAt/Trip.

**Đã hoàn thành trên `.\SQLEXPRESS/HorseTransportDB`:**
- 006 được áp từ script đã review trong worktree, không dùng003/004 đang sửa ở primary.
- Native typed schema có63cột mới/5bảng,25CHECK được trust; không005.
- Gỡ đúng8cột `Flow1StateJson` / `Flow1StateVersion` trên HORSE, TRANSPORT_REQUEST,
  CONTRACT, USER và các constraint/default004 đã biết. Không xóa object khác.
- Vẫn26bảng và39FK. Hash từng dòng của toàn bộ cột business ban đầu ở cả26bảng,
  row counts và cấu trúc39FK khớp trước backup/sau006/sauconversion/sauDROP/sauAPIread.
- CHECKDB đạt trên bản restore và DB chính sau chuyển; không còn cột JSON.
- DB chính trở lại **ONLINE / MULTI_USER**; process API kiểm thử đã dừng.

## Backup và restore thực tế

Backup COPY_ONLY/CHECKSUM được giữ tại:
`A:\SQL2019\MSSQL15.SQLEXPRESS\MSSQL\Backup\HorseTransportDB_Flow1_Before006_20261018_d7f9c0aa66b54189b825256f0846709e.bak`.

`RESTORE VERIFYONLY WITH CHECKSUM` đạt. Đã thực sự restore sang
`RaceHorseFlow1Test_d7f9c0aa66b54189b825256f0846709e` bằng MOVE sang data/log paths
riêng, CHECKDB và đối chiếu toàn bộ dữ liệu/FK với source trước006 đều đạt. Sau khi
kiểm xong, chỉ DB test do lượt này tạo được drop bằng exact-name guard; backup giữ lại.
Configured metadata/private roots đều chưa tồn tại, nên không có private bytes để
copy. Không tạo thư mục nguồn rỗng giả hoặc xóa/move nguồn cũ.

SQL service ACL không cho tài khoản shell đọc file `.bak` để tính SHA256. Không sửa
ACL để vượt quyền. Xác minh backup dựa trên backupset `is_copy_only=1`,
`has_backup_checksums=1`, VERIFYONLY và actual restore/CHECKDB/parity; không tuyên bố
đã tính hash file backup. Các bước này theo tài liệu [Microsoft backup copy-only](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server)
và [restore với MOVE](https://learn.microsoft.com/en-us/sql/relational-databases/databases/copy-databases-with-backup-and-restore).

Không có ứng dụng dotnet/WebApi đang chạy, không có business sessions/transaction
mở trước khi khóa. DB được giữ SINGLE_USER giữa các bước, không force-disconnect
hay rollback transaction của người khác. Lần mở connection đầu tiên bị timeout sau
SET SINGLE_USER; chuyển DB trên chính connection giữ khóa đã xử lý được, trước DDL.
Lỗi đọc hash backup chỉ là ACL shell, không phải lỗi backup/restore.

## Fingerprint và conversion

SELECT-only shadow preview mới sau cấp quyền vẫn có source snapshot:
`B495657D46EB5516879F664433F6081DE03DC36E05899FF8CB7B378D88FF8415`.
0 documents,0 blockers với đúng allowlist3Contract đã được duyệt. Shadow đã dọn.
Không dùng fingerprint shadow để apply business.

Sau006, dry-run trực tiếp trên exact business target có fingerprint:
`444B73095A6866A804B10A13ECA472173168DC6E259B4674345E1140B9D35514`.
Typed parity fingerprint:
`E35C954DC29140396765209AECBFC24A8EF2F9061586F8EED8ED411C0613517E`.

CLI apply offline với token này đạt0blockers, Applied=true, chưa DROP. Đối chiếu
all26tables/39FK/CHECKDB đạt; dry-run lại token không đổi. Sau đó apply offline kèm
`--drop-retained-state true` đạt0blockers, RetainedColumnsDropped=true; đối chiếu lại
và CHECKDB đạt. Không startup migration hoặc auto-import.

Row counts giữ nguyên: HORSE5, TRANSPORT_REQUEST4, CONTRACT3, PAYMENT4, INVOICE5,
TRIP_PLAN3, REQUEST_HORSE_MAPPING5, USER13, NOTIFICATION4. Các bảng khác cũng giữ
nguyên theo snapshot. Các giá trị gốc được băm/so sánh trong RAM, không xuất payload
business/secret vào Git hoặc báo cáo.

Ba Contract lịch sử vẫn giữ dữ liệu ban đầu, `IsCurrent=false`, không có PDF hash,
không được hiển thị như đã có receipt OTP. Không giải phóng booking cũ hoặc kết luận
Trip cũ đã hoàn thành. Dữ liệu thiếu chứng cứ không được biến thành workflow mới.

## API chỉ đọc trên DB đã chuyển

Chạy tạm Release WebApi từ worktree, connection exact business target; chỉ GET.
Identity dùng JWT key ngẫu nhiên trong RAM và IDs/roles thực của DB; đây **không phải**
nghiệm thu mật khẩu đăng nhập người dùng thật. Key/token không lưu/log/Git. Không
thay settings/issuer của primary. API process dừng sau kiểm tra.
- Manager đọc4requests,3historicalContracts có `isCurrent=false`,
  `hasAcceptanceEvidence=false`, `relationalTermsReady=false`.
- Customer đọc đúng request thuộc mình và danh sách ngựa.
- Không token →401; Customer gọi Manager endpoint →403.
- Không POST/provider request/email/payment/Trip mới trên DB nghiệp vụ.
- So sánh hash toàn bộ original data sau API read vẫn khớp; CHECKDB đạt.

Evidence operation ở ignored `backend/WebApi/App_Data/flow1/business-cutover/`:
`state.json`, `shadow.json`, `dry.json`, `apply.json`, `applydrop.json`, `api-smoke.json`.
Không commit backup/generated files/config/token hoặc row payload. Không có sửa
runtime source trong lượt DB này;305BE/52FE/ROAD+AIR proof thuộc source baseline,
không được gọi là chạy lại fullE2E trên business DB.

## Bàn giao và phần còn lại

Primary `D:\Racehorse-Transport-System` vẫn giữ nguyên source/index/config của đại ca.
Để dùng Flow1 mới, chạy typed worktree hiện hành; primary chưa merge và Flow1 JSON
cũ không tương thích DB đã bỏ cột. Không tự merge/cherry-pick để giải quyết điều này.
Teammate cần review source/API cùng mapping006 trước khi tích hợp nhánh.

Còn nghiệm thu VNPay provider Sandbox/publicHTTPSIPN với merchant hiện có,
SMTP/issuer/HMAC/private bytes/backup ở runtime đích và UAT vận hành. Native Chrome
đã kiểm local với maps/SMTP/IPN fixtures; chưa tuyên bố provider payment thành công.
Không mở tunnel/deploy/hạ tầng hoặc giao dịch tiền thật khi chưa có quyền tương ứng.

## VNPay Sandbox: probe chỉ đọc sau chuyển DB

Đã gọi đúng adapter `VnpayQueryGateway` tới endpoint Sandbox bằng merchant đang có,
với reference ngẫu nhiên chưa tồn tại, không tạo payment/hoàn tiền/giao dịch thật,
không SQL, không log merchant/secret/signature/response body. Theo [API querydr
chính thức](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html),
đây là truy vấn kết quả, không phải luồng thu tiền hay refund.

Kết quả tại môi trường chạy này: **HTTP403**, không có provider JSON response code
hoặc secure hash; adapter trả `VNPAY_QUERY_UNAVAILABLE`, Verified=false. Không đủ
bằng chứng để kết luận credential sai, querydr đã xác minh hoặc payment/IPN đã đạt.
Không retry vòng lặp hoặc hạ guard xác minh để vượt lỗi. Cần môi trường HTTPS/IPN
Sandbox được cấp quyền và kiểm tra truy cập provider trước nghiệm thu tiếp.
Evidence redacted: `provider-querydr-probe.json` trong thư mục operation ignored.
