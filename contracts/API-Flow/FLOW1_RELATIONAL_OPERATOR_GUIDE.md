# Flow1 — hướng dẫn operator và teammate (typed006)

Ngày18/10/2026. Chỉ áp dụng scope [mapping hiện hành](FLOW1_SIMPLE_RELATIONAL_MAPPING.md).
Xem [source/acceptance report](FLOW1_RELATIONAL_CUTOVER_REPORT.md) trước khi chạy.
Không dùng005/R0 hoặc old004 importer như một phần triển khai006.

## Ranh giới quyền hiện tại

Đã có quyền sửa source, test trên DB disposable và commit local. Chưa có quyền
merge primary, push/deploy/hạ tầng, migrate/import/drop HorseTransportDB, phát sinh
giao dịch tiền thật hoặc gửi email người thật. Mọi command apply dưới đây là tài
liệu cho operator sau phê duyệt riêng; không phải command đã chạy trên DB nghiệp vụ.
Primary có sửa đồng thời của user; chỉ review/merge có chọn lọc, không checkout/reset.

## Native demo / kiểm lại source

Dùng đúng worktree `C:\Users\admin\.codex\worktrees\flow1-relational-mvp\Racehorse-Transport-System`.
Native schema mới:000→003→006. Không004/005. Harness tự tạo `RaceHorseFlow1Browser_<GUID>`,
seed accounts `@example.invalid`, khởi động actual API/Vite/Chrome, dùng RAM-only SMTP,
real LibreOffice và HTTP map fixtures. Accounts đăng nhập qua endpoint thật bằng
BCrypt; common-password bypass phải bị từ chối, không fallback sang fixture JWT. VNPay redirect được intercept; local signed
IPN fixture cấp cọc trong DB test. Cuối lượt dừng process và drop đúng DB đã tạo.
Không gọi fixture này là provider Sandbox/public IPN verification.

```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE='D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\runtime\libreoffice-26.8.1\extracted\program\soffice.com'
$env:FLOW1_RELATIONAL_AIR='0' # ROAD; đổi1 cho VN→JP AIR, sân bay→sân bay

dotnet run --project backend/tools/Flow1RelationalHarness -- '<absolute Node executable>' '<absolute Playwright module directory>'
```

Evidence nằm trong ignored `backend/WebApi/App_Data/flow1/browser-<GUID>/`:
`typed-result.json`, customer/manager/handoff screenshots, private PDF hash.
Không commit PDF/runtime/fixture tokens/OTP hoặc private bytes.

## Local provider configuration

Legacy merchant/secret đã có ở primary; active WebApi dùng `Flow1:Vnpay`, không tự
đọc project Sandbox cũ. Script sau bridge đúng những option cần thiết; không copy
ConnectionStrings/SMTP/issuer hoặc chạy provider request. Dry-run mặc định.

```powershell
pwsh -NoProfile -File backend/tools/Configure-Flow1Sandbox.ps1 `
  -LegacyRoot 'D:\Racehorse-Transport-System' `
  -WebApiRoot 'C:\Users\admin\.codex\worktrees\flow1-relational-mvp\Racehorse-Transport-System\backend\WebApi' `
  -ReturnUrl 'http://localhost:5173/customer/payments/return'
# Sau review, thêm -Apply để ghi riêng file ignored của worktree.
```

`appsettings.Flow1Sandbox.Local.json` chỉ nạp trong Development, không vào Git hoặc
publish. Environment overrides được nạp cuối. Script giữ cấu hình khác ở target và
dừng nếu target đã có merchant/secret khác. Không in secret. Không ghi primary local
settings. Frontend default proxy5129 theo launchSettings WebApi; set `API_PROXY_TARGET`
cho cổng khác. Không dùng đường return của Sandbox độc lập cho Flow1.

Provider integration còn cần merchant đăng ký đúng public HTTPS
`/api/payments/vnpay/ipn`, actual Sandbox test và querydr result kiểm chữ ký. Return
`/customer/payments/return` chỉ đọc status SQL. Không activate từ response-code trên
URL. Không bật logging full query/body/signature của IPN, maps hoặc querydr. Local
fixture merchant không thể thay provider acceptance. Không mở tunnel/deploy hạ tầng
hoặc thanh toán thật trong phạm vi lượt tự động này.

## Inventory trước006 trên DB đang dùng

Tool: `backend/tools/Flow1RelationalConvert`. Connection string đặt qua process env
`FLOW1_CONVERSION_CONNECTION`, không argv/Git/chat. `--target` phải khớp đúng
`SqlConnectionStringBuilder.DataSource/InitialCatalog`, kể cả dry-run.
CLI không startup migration và không đọc config để đoán một DB đích khác.

Đặt `--source-root` đúng thư mục metadata cũ và `--private-root` đúng immutable
bytes root. Không tạo thư mục rỗng giả để vượt guard khi nguồn thực tế chưa rõ.

```powershell
# Env connection đã được đặt riêng; không echo nó.
dotnet run --project backend/tools/Flow1RelationalConvert -- `
  --target '<exact-server>/<exact-database>' `
  --source-root '<absolute-retained-source-root>' `
  --private-root '<absolute-private-bytes-root>' --schema-only true

# SELECT-only source snapshot -> guarded disposable local shadow -> conversion dry-run.
# Có thể dùng khi source chưa006. Không áp DDL/data update lên source.
dotnet run --project backend/tools/Flow1RelationalConvert -- `
  --target '<exact-server>/<exact-database>' `
  --source-root '<absolute-retained-source-root>' `
  --private-root '<absolute-private-bytes-root>' --shadow-dry-run true
```

Shadow clone dùng named columns/explicit bulk mappings; source snapshot ở RAM,
không export row payload. Chỉ target `RaceHorseFlow1Test_<GUID>` mới được tạo/drop.
Target shadow dùng000/003/004/006 để đối chiếu retained state; đây là conversion
fixture riêng, không đổi profile native runtime. Metadata/table/column bất tương
thích dừng rõ; FK/CHECK shadow được kiểm lại trước preview. Shadow fingerprint chỉ
mô tả bản sao; **không bao giờ dùng làm business apply token**.

Đã chạy chỉ đọc trên source hiện hành:003/004 có,006 chưa có.5ngựa/4request/
3Contract/4payment/5invoice/3Trip.0 state documents được đọc; configured metadata và
private roots chưa tồn tại. Preview dừng với `CONTRACT_EVIDENCE_MISSING` cho
`CTR_2026_001`, `CTR_2026_002`, `CTR_2026_003`. Nguồn không bị migrate/update;
shadow đã xóa. Source snapshot hash:
`B495657D46EB5516879F664433F6081DE03DC36E05899FF8CB7B378D88FF8415`.

Không coi SignedAt cũ là bằng chứng OTP; không sinh PDF giả để khớp hồ sơ đã ký.
Cần quyết định trước business cutover:
1. Giữ nguyên các hồ sơ đó như lịch sử chưa đủ chứng cứ, không vào workflow mới;
   dùng Flow1 typed cho đơn mới. Không xóa/sửa tiền/chữ ký/Trip cũ. Đây là policy
   cần phê duyệt; CLI mặc định vẫn dừng, chỉ allowlist chính xác mới chọn policy này.
2. Hoặc khôi phục đúng nguồn PDF/hash/receipt/plan/ledger gốc để chuyển tiếp workflow.
   Tọa độ/date/time/receipt thiếu hoặc mâu thuẫn phải review, không tự suy ra.

### Policy đề xuất đã preview, chưa duyệt/apply

Đã chạy shadow dry-run lần hai với đúng ba Contract trên và nhận **0 blockers,
Applied=false**, cùng source snapshot fingerprint. Option bổ sung cho dry-run:

```powershell
--retain-unverified-history 'CTR_2026_001,CTR_2026_002,CTR_2026_003'
```

Chỉ thêm option này sau khi operator đã duyệt danh sách. Exact IDs được gắn vào
fingerprint; thêm/bớt IDs cần review lại. Giữ original money/status/SignedAt/Trip;
không giả PDF/chữ ký OTP hoặc suy luận payment cũ đã được xác minh theo Flow1 mới.
Không giải phóng booking cũ hay coi Trip cũ đã hoàn thành. Không được dùng policy
để bỏ qua unknown/PREPARED/conflict hoặc Contract đang active/đã có typed state.
Nguồn có bất kỳ thay đổi nào phải inventory/preview lại. Shadow token không dùng
cho business apply. Đây chưa phải quyền migrate/drop DB nghiệp vụ.

## Apply/conversion/drop — CHỈ sau quyền operator riêng

1. Review diff/mapping/API với teammate; backup SQL và private bytes, kiểm restore.
   Dừng tất cả writer/background jobs/old app, giữ offline đến hết parity. Chụp
   inventory fingerprint và danh sách legacy policy đã được duyệt.
2. Verify003 và apply reviewed006 additive trên **exact target** nếu được cấp quyền.
   Không005; không chạy004 để làm điều kiện cho006.006 có thể coexist004 cũ khi review.
3. Chạy CLI không flag apply sau006 để lấy inventory/dry-run trên chính target.
   Source/file conflict, unknown kind, latest PREPARED/pending, hash/owner mismatch,
   file thiếu/tamper, planned departure khác canonical SQL, unsigned v2 PDF cần
   reissue, financial review chưa rõ hoặc evidence thiếu đều dừng. Không bỏ acceptance.
4. Đối chiếu từng Contract/PDF/hash/SignedAt/invoice/Payment/Trip/last decisions với
   operator. Current OTP HMAC cũ bị revoke; attempts/cooldown/account reservations
   được giữ, không copy raw code. Chỉ fill typed columns; original business fields
   phải giữ fingerprint. Giữ toàn bộ source/private bytes để kiểm lại.
5. Sau review mới chạy `--apply true --offline true --fingerprint '<exact current dry-run fingerprint>'`.
   Mismatch token dừng; typed updates/receipts schema properties/budget reservations
   cùng một SQL transaction. File bytes không nằm trong SQL transaction; runtime
   vẫn rehash. Không hứa atomic tuyệt đối giữa SMTP/provider/files và SQL.
6. CLI giữ004 columns sau apply mặc định. Runtime vẫn maintenance nếu còn nonempty
   JSON. Sau source cutover/parity và **quyền drop riêng**, chạy lại dry-run exact
   target rồi apply kèm `--drop-retained-state true`. Chỉ known004 CHECK/default và
   8old state columns được gỡ; extra dependencies gây rollback, không xóa object lạ.
   Original business fingerprint và typed parity phải giữ. Không xóa/move legacy files.
7. Mở native app ở runtime đích, test owned PDF/receipt/money/oneTrip/current event;
   kiểm lại các consumer downstream. Có blocker thì giữ offline/source, không fake
   finished hoặc cố khôi phục DB bằng reset/seed.

CLI tests đã kiểm horse SQL+file parity/retry/drop, file-only conversion không004,
stale fingerprint, conflict/missing bytes và read-only shadow của source chưa006.
Không suy diễn thành mọi dataset legacy đã chuyển thành công: bản source đang dùng
mặc định có3 blocker nêu trên; policy allowlist mới chỉ được shadow preview, chưa
được duyệt/apply. Signed/financial legacy cần bằng chứng hoặc policy review cụ thể.

## Vận hành / rollback boundary

Giữ issuer, SMTP đúng môi trường, HMAC đủ mạnh, private bytes ownership/backup và
bộ token signing riêng. Tất cả test email là sink/fixtures; chưa xác minh gửi mail
người thật. Production/real-money verification chưa được cấp quyền.

Không auto-cancel khi quá hạn. Manager explicit expire/cancel-overdue sau đối soát;
callback muộn vẫn giữ tiền. Pending cancellation hoặc financial review không tự
refund. Chuyến đã khởi hành không hold/rollback bằng Flow1.

Rollback sau đã có hợp đồng ký/tiền phải giữ SQL+bytes backup và receipts, dừng writer,
đối soát trước; không drop006/khôi phục source JSON cũ để ghi tiếp lên state typed.
Không reset/seed DB nghiệp vụ để làm demo. Flow2/3 inbox/ack là connected handoff;
nghiệm thu routing/customs/readiness đầy đủ vẫn thuộc module downstream.
