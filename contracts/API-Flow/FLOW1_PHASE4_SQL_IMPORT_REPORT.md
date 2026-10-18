# Flow 1 — S3 offline import/parity và gỡ MetadataStore

Ngày **16/10/2026, Asia/Ho_Chi_Minh**, branch Truong.
Commit trước lượt: **dfc2136c1453a3daaf2391d063c49c2639e9e14b** (S2).
Yêu cầu trực tiếp: **“Tiếp”**.

**S3 hoàn thành trong source/tool và local/test.** Đã có inventory/dry-run mặc định,
import atomic + parity/retry, SQL import receipts cho nguồn giữ nguyên; đã xóa file
state provider/interface/options/test cũ với replacement tương ứng.
**Chưa apply migration/import DB nghiệp vụ; chưa hoàn thành phase 4 hoặc full Flow 1.**

## Thay đổi theo file/layer

Đường dẫn tính từ repo root.

| File | Layer / mục đích |
|---|---|
| backend/Infrastructure/Storage/Flow1LegacyStateImporter.cs | Offline maintenance, không WebApi DI: đọc SQL/source, schema validation, reviewed fingerprint, một batch SQL transaction, owner CAS, source receipts, prefix preservation, parity/retry |
| backend/Infrastructure/Storage/LegacyFlow1Sources.cs | Reader migration chỉ đọc: source limits/path/reparse/partial-write guards, schema/headers/revision/hash/duplicate/secret checks; không Append/lock/temp/rename writer |
| backend/Infrastructure/Storage/LegacyFlow1Parity.cs | Migration parity: owner/dependencies, horse historical versions/private bytes, request projections/status, plan/quote/Draft, PDF publication/hash và OTP/acceptance/invoice |
| backend/Infrastructure/Storage/SqlFlow1StateStore.cs | Runtime SQL only: giữ receipts trong envelope; retained source hashes phải có committed SQL receipts; không parse source thành business state/fallback |
| backend/Application/Common/Flow1/Flow1PrivateFileOptions.cs | Application config: private byte root độc lập với retained legacy source root |
| backend/Application/Interfaces/Flow1/IFlow1StateStore.cs | Cập nhật mô tả port theo runtime SQL đã cutover |
| backend/Infrastructure/Storage/Flow1PrivateStoragePath.cs | Validate root string ngoài public web root, độc lập options metadata writer cũ |
| backend/WebApi/Extensions/Flow1ServiceExtensions.cs | DI/config: hai options mới; MetadataRoot cũ chỉ fallback đường dẫn, new keys có ưu tiên; không migration/import startup |
| backend/WebApi/Extensions/Flow1CustomerExtensions.cs | Private byte store dùng root mới, không ghép từ file metadata options |
| backend/WebApi/appsettings.Local.example.json | Cấu hình mẫu PrivateFiles/LegacyImport, không secret; private appsettings.Local.json giữ nguyên |
| backend/tools/Flow1StateImport/Program.cs, Flow1StateImport.csproj, README.md | CLI dry-run/apply tách biệt, connection-env/exact target/offline/reviewed hash, exit codes/diagnostics an toàn và operator guide |
| backend/Backend.slnx, backend/tests/Flow1.Tests/Flow1.Tests.csproj | Build CLI cùng solution/tests; tests không reference top-level Program của CLI |
| backend/tests/Flow1.Tests/LegacyStateImportTests.cs | 17 test import/CLI/SQL/parity/fault/retry/concurrency/cancel/integrity, gồm source format cũ có PREPARED lịch sử và pending:null |
| backend/tests/Flow1.Tests/FoundationTests.cs | Giữ public-root guard, thêm test path compatibility/new-key precedence |
| backend/tests/Flow1.Tests/SqlCutoverTests.cs | Bỏ reference interface file đã xóa; giữ missing-schema/source guards/rollback |
| backend/tools/Flow1BrowserHarness/Program.cs | Browser import mode: dừng test API, export test sources, clear state chỉ DB GUID test, inventory/import/retry, restart API, verify Chrome |
| backend/tools/flow1-browser.cjs | Verify Customer/Manager receipt/quote/reload/download sau import, PDF hash không đổi; ảnh/kết quả local ignored |

Đã **xóa**:

- backend/Infrastructure/Storage/LocalFlow1MetadataStore.cs (113 dòng).
- backend/Application/Interfaces/Flow1/IFlow1MetadataStore.cs (17 dòng).
- backend/Application/Common/Flow1/Flow1StorageOptions.cs (9 dòng).
- backend/tests/Flow1.Tests/MetadataStoreTests.cs (108 dòng).

Đây là 247 dòng file cũ được gỡ, không phải mức giảm ròng cả diff. Importer/validation/
test/tool vận hành là code bổ sung cho chuyển dữ liệu, không phải provider file
runtime thay tên. Không hứa giảm một nửa backend hoặc tăng tốc khi chưa đo.
S2 đã gỡ prepare/finalize/recover/discard saga khỏi service/controller/FE. S3 không
thêm bảng/cột hay sửa business EF entities, legacy DAO hoặc sandbox.

## Hành vi import và bảo toàn

1. CLI không đọc appsettings/default DB. Phải truyền biến môi trường chứa connection,
   confirm-database khớp chính xác, hai absolute paths có thật. Mặc định chỉ inventory.
   Apply còn cần offline-confirmed và fingerprint SHA-256 từ inventory đã review.
   Tool không tự tạo thư mục nguồn rỗng để giả thành công, không chạy migration.
2. Đọc JSON nguồn tối đa 2 MiB/document, 128 MiB/10.000 documents; chặn reparse path,
   folder lồng/JSON lạ, .tmp chưa xử lý, duplicate property/key/owner, secret/OTP thô,
   unknown envelope/header fields và hash/revision sai. Không âm thầm bỏ unknown
   fields khi deserialize. Payload JsonElement/audit giữ nguyên.
3. SQL kiểm đúng tám cột 004, type/nullability/default/trusted CHECK definitions;
   thiếu/sai/disable đều báo conflict, không sửa schema. Owner phải tồn tại.
4. Kiểm references qua toàn bộ history: private key/hash/size và bytes, ownership/
   horse document version, request mapping/dates/contacts/status, review canonical/
   plan/current Draft, budget/floor/selling total/deposit, publication/PDF và
   signature/deposit invoice. Không reprice, đổi currency, SignedAt, due date hoặc status.
5. Synthetic otp-account ID cũ được kiểm hash và map về sole actor/USER. SQL document
   header chuyển sang UserID; raw source và mọi revision (key/hash/actor/time/payload)
   giữ nguyên, gồm OTP attempts/TTL/delivery/consumed và account sends. Không rotate
   HMAC key hoặc reset budget. Runtime cần giữ secret vận hành như trước.
6. Latest PREPARED/pending dừng bằng conflict để reconcile rõ. Không đoán SQL success,
   reset attempt hoặc làm biên nhận giả. PREPARED lịch sử đã có COMMITTED/ABORTED sau
   đó vẫn được giữ. Source thiếu dependency hoặc private file không được bỏ qua.
7. Một transaction SERIALIZABLE + import applock cho cả batch. Revalidate fingerprint
   (target server/catalog + SQL business snapshot + nguồn/private hashes), rồi CAS
   update state và receipts. Cuối lượt reread envelopes và kiểm lại nguồn/bytes;
   lỗi/cancel/interruption/tamper rollback toàn bộ. Không sửa cột nghiệp vụ.
8. Exact retry là no-op, không tăng counter/lịch sử lần nữa. Matching SQL history
   prefix mới hơn được giữ, không truncate; history/receipt conflict không overwrite.
9. Legacy SQL rows không có state được liệt kê warning, không tự tạo snapshot.
   Phải review riêng; inventory thành công không chứng nhận mọi row legacy đã migrate.
10. Source receipt path/hash nằm trong SQL envelope cùng transaction, không có
    receipt JSON file hoặc file saga mới. Runtime chỉ hash nguồn và đọc committed
    SQL receipts (một lần/scoped provider), không parse payload nguồn. File mới/đổi
    hash chặn runtime. Nguồn/private bytes giữ nguyên; không tự move/archive/delete.

Offline confirmation là xác nhận của operator, không phải tool tự kiểm/stop mọi
old app. SQL applock chỉ đồng bộ importer; trước apply phải backup/stop writers
theo [operator guide](../../backend/tools/Flow1StateImport/README.md).

## Kiểm thử cuối

~~~powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE=(Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'

# workdir frontend
npm run test:run
npm run build
node --check ../backend/tools/flow1-browser.cjs
~~~

**191 backend tests pass = 144 Flow1 + 47 Registration, 0 fail/skip**.
Đã thay 12 file-store cases bằng 17 import cases, thêm 1 config compatibility case;
S1/S2 SQL tests giữ version/replay/key misuse/concurrency/limits/rollback/reopen/
path guards tương ứng. Real LibreOffice regression bật. **22 FE tests pass**,
TypeScript/Vite build và Node syntax check **PASS**. Không đổi source FE trong S3;
không gọi full repository lint là clean khi chưa chạy. Build browser harness
**PASS, 0 warning/error**. git diff --check và kiểm artifact/secret trước commit.

Import coverage: signed + revised request có history/plan/Draft/OTP/account/PDF;
audit revision parity và giữ file nguồn; source change sau write rollback; partial
owner write interruption rollback; stale reviewed fingerprint; conflicting/newer
SQL history; wrong amount/missing/tampered file; latest PREPARED; duplicate mapped
account/missing plan; unknown/partial source/hash invalid; missing/incompatible/
disabled schema; CLI dry-run không write và reject wrong target/unconfirmed apply;
parallel importers/cancel; duplicate/unknown fields/raw OTP không bị echo hoặc bỏ qua.

## Connected Chrome trước và sau import

~~~powershell
# SQL/LO env ở trên, chạy từ repo root
$env:FLOW1_BROWSER_MAP_PROVIDER='GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS='0'
$env:FLOW1_BROWSER_SIGNING='1'
$env:FLOW1_BROWSER_IMPORT='1'
dotnet run --project backend/tools/Flow1BrowserHarness -- '<absolute-node.exe>' '<absolute-playwright-module-directory>'
~~~

**PASS** luồng Customer/Manager đầy đủ hiện có: horse/upload/submit/revision/
question-answer/change/plan/quote/Draft → real LibreOffice PDF → loopback SMTP,
OTP sai bị chặn, OTP đúng ký, một invoice cọc và không Trip. Sau đó harness dừng
test API, tạo source fixtures từ dữ liệu test, clear state chỉ DB test GUID,
inventory/import/retry, restart API và chạy Chrome verify riêng. Nguồn giữ nguyên;
Customer receipt/reload/PDF và Manager quote/receipt vẫn đúng. SQL invariant sau
import: SIGNED/SignedAt, AWAITING_DEPOSIT, một invoice UNPAID 40.000.000 VND,
0 Trip, có SQL source receipts. Không page errors.

Evidence local ignored:
backend/WebApi/App_Data/flow1/browser-da706a74ab11410a89fd2b9aa2c91308/.

- browser-result.json, acceptance-result.json: connected flow trước import.
- sql-import-result.json: inventory/apply/parity; 10 documents / 5 owners / 27
  revisions / 3 private files, 0 issues/warnings (xem số thực tế trong artifact).
- import-browser-result.json và import-browser.log: restart API + Chrome sau import.
- Đã xem customer-after-import.png và manager-after-import.png.
- PDF trước ký / sau ký / sau import cùng SHA-256:
  1dbad40d7df762246ccf1ad091cda52acf95326c356f10774565e30bc1dfc3db.

Maps là **LOCAL Geoapify data + Mapbox map HTTP fixtures, NOT LIVE**. SMTP chỉ
loopback/RAM; không email người thật, không thanh toán thật. Test DB tạo/drop theo
GUID kiểm soát. Không dùng HorseTransportDB. Đây là connected coverage của use
cases hiện có và migration, **chưa phải full Flow 1 E2E/UAT hoặc production import**.

## Cấu hình local và bước tiếp theo

Kiểm tra read-only các file JSON cấu hình hiện hành cho thấy source path mặc định
backend/WebApi/App_Data/flow1/metadata và private-bytes dưới nó đều chưa tồn tại;
đếm 0 JSON ở typed source directories tại đường dẫn đó. Không tạo nguồn giả/không
import gì vào business DB. Đây không phải chứng cứ rằng DB nghiệp vụ đã có 004,
đã migrate hoặc không có dữ liệu ở bản backup/đường dẫn vận hành khác.

Tiếp tục phần còn lại phase 4 bằng SQL: decline, explicit expire/reissue,
effective-deadline extension (không sửa PDF gốc), legacy Contract FE. Sau đó phase
5 payment/activation và phase 6 operational deployment/handoff. Không xin lại
quyết định kiến trúc, không chờ hai tiếng nếu người dùng yêu cầu chạy ngay.
Business DB migration/import vẫn cần quyền riêng trên target rõ ràng; lịch tự động
không thực hiện. Live SMTP/VNPay/public IPN/runtime deploy/UAT chưa xác minh.

Lịch hai tiếng tiếp tục ACTIVE, cập nhật ưu tiên phase 4 còn lại sau S3. Giữ nguyên
private backend/WebApi/appsettings.Local.json và staged frontend/vite.config.ts.
Chỉ commit local file S3 đã kiểm chứng; không push/deploy/PR/thay hạ tầng.
