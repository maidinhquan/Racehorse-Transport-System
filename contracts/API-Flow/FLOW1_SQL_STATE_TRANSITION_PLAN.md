# Flow 1 — chuyển state vào SQL, giữ đầy đủ nghiệp vụ

Quyết định trực tiếp của đại ca ngày **16/10/2026, Asia/Ho_Chi_Minh**:
**Chuyển metadata vào SQL, giữ đầy đủ Flow 1. Không thêm bảng mới.**
Thay giới hạn cũ chỉ hai cột CONTRACT và kiến trúc sidecar file; không thay quyền
chỉ commit local hoặc tự cho phép apply migration lên HorseTransportDB.

## 1. Đích kiến trúc và tình trạng thực tế

Ảnh, hộ chiếu, PDF, proof bytes tiếp tục ở private file store, tải qua API kiểm quyền.
SQL giữ file references/hash/size/version, toàn bộ snapshot/review/plan/history,
OTP digests/attempts/TTL/rate budget, acceptance, extension và operation receipts.
Invoice/Payment/status/SignedAt/Trip vẫn ở các cột nghiệp vụ hiện hữu.
Không lưu code OTP thô hoặc secret trong JSON; không dùng public URL thay file key.

**S1–S3 đã thực hiện và kiểm chứng trong local/test; DB nghiệp vụ chưa migrate/import.**
Customer/review/publication/OTP/acceptance dùng `IFlow1StateStore`; runtime không
đăng ký `LocalFlow1MetadataStore`. SQL state và business writes commit chung.
S3 có tool inventory/import/parity offline, đã gỡ file provider/interface/options/
tests cũ có SQL/import replacement. Xem [báo cáo S3](FLOW1_PHASE4_SQL_IMPORT_REPORT.md).

Thiếu schema 004 hoặc còn sidecar JSON chưa có biên nhận import phải dừng rõ bằng lỗi
`FLOW1_SQL_SCHEMA_REQUIRED` / `FLOW1_STATE_IMPORT_REQUIRED`; không tự nâng schema.
Không dùng dual-write, fallback âm thầm sang file khi SQL thiếu/hỏng hoặc ghi SQL lỗi.

## 2. Danh sách cột đã xác định theo dữ liệu thực tế

Migration `backend/database/004_flow1_sql_state.sql` bổ sung **8 cột**:

| Bảng hiện hữu | Cột mới | Dữ liệu |
|---|---|---|
| HORSE | `Flow1StateJson nvarchar(max) NULL` | Horse identity/document snapshots, status, private file references, versions/audit |
| HORSE | `Flow1StateVersion bigint NOT NULL DEFAULT(0)` | Compare-and-swap cho owner row |
| TRANSPORT_REQUEST | `Flow1StateJson nvarchar(max) NULL` | request canonical/estimate snapshots; review/questions/changes; plan/budget/quote |
| TRANSPORT_REQUEST | `Flow1StateVersion bigint NOT NULL DEFAULT(0)` | Compare-and-swap chung các document của Request |
| CONTRACT | `Flow1StateJson nvarchar(max) NULL` | Draft lines/snapshot, publication/PDF/hash, OTP, acceptance, extension/payment evidence/deployment |
| CONTRACT | `Flow1StateVersion bigint NOT NULL DEFAULT(0)` | Compare-and-swap chung các document của Contract |
| USER | `Flow1StateJson nvarchar(max) NULL` | Account OTP rate budget xuyên contracts, không sửa field reset-password/registration |
| USER | `Flow1StateVersion bigint NOT NULL DEFAULT(0)` | Compare-and-swap cho rate state |

Hai cột CONTRACT của migration 003 và TripID nullable được giữ. Không thêm PhotoUrl/
PassportUrl/PdfUrl riêng gây trùng nguồn chuẩn; file key nằm trong typed JSON snapshot.
Tọa độ, proxy receiver và Manager feedback cũng có sẵn trong các typed snapshot.
Đây là lý do tám cột này chứa đủ nhóm dữ liệu, còn bảy cột scalar trong đề xuất ban
đầu chưa đủ. Nếu sau này có nhu cầu lọc/index SQL cụ thể mới đề xuất projection.

`Flow1StateVersion` là **counter bigint**, không phải SQL Server `rowversion` và
không thay Contract/document version hay API expected review version. Không map
các cột state vào EF entities chung trong S1, tránh làm auth/DAO cũ đòi schema mới.
SQL adapter dùng EF-owned connection và current transaction qua ADO có tham số;
bảng/cột lấy từ mapping cố định, không dùng identifiers từ request trong SQL.

ISJSON và nonnegative-version CHECK được SQL kiểm; schema cũ không đúng type,
default khác 0, CHECK giả/có tên đúng nhưng bị disable/untrusted đều chặn upgrade.
Migration transactional/idempotent; không CREATE TABLE, seed, reset, tiền tệ hay
backfill fake state. Rows legacy giữ JSON NULL/version 0 cho đến khi import hợp lệ.

## 3. Typed payload và bảo toàn dữ liệu

JSON không phải một string tùy ý mà là envelope version 1 gồm các document có
schema/type/owner ID và revisions. Mỗi revision có Version/OperationID/RequestHash/
Actor/Action/CreatedAtUtc/Payload. Giữ các DTO nghiệp vụ có kiểu ở Application;
không serialize SQL state hoặc internal plan/budget ra Customer DTO.

| Document key | SQL owner row | Payload hiện tại / handoff |
|---|---|---|
| horse | HORSE / HorseID | HorseSnapshot, ảnh/passport hash/key, identity/status/version |
| request | TRANSPORT_REQUEST / RequestID | RequestSnapshot + EstimateView/version/policy/attribution/horse snapshots |
| review | TRANSPORT_REQUEST / RequestID | ReviewState, feedback, revision fields, questions/changes/notices/currentContractId |
| plan | TRANSPORT_REQUEST / RequestID | PreliminaryPlan, prep days, planned departure, resources/cost/floor/suggested |
| contract | CONTRACT / ContractID | DraftSnapshot, selling lines, total/cọc snapshot, bound request/plan versions |
| publication | CONTRACT / ContractID | ContractPublication, frozen model, template/PDF hash/size/key/original deadline |
| contract-otp | CONTRACT / ContractID | ContractOtpState: keyed digests, delivery state, expiry, attempts, consumed |
| acceptance | CONTRACT / ContractID | ContractAcceptance, keyed input digest, invoice binding/receipt |
| extensions | CONTRACT / ContractID | Typed old/new effective deadline + actor/reason/time; phase 4 tiếp tục implement |
| otp-account | USER / UserID | ContractOtpAccount gửi mã; S2 đổi key từ hash synthetic sang owner UserID |
| payment-ledger | CONTRACT / ContractID | Phase 5 evidence/idempotency gắn PaymentID/InvoiceID; tiền chuẩn vẫn INVOICE/PAYMENT |
| deployment | CONTRACT / ContractID | Phase 6 readiness/handoff/hold/resume refs gắn TripID; status vận hành vẫn TRIP_PLAN |

Các key phase 5/6 chỉ là mapping được dự trù, chưa phải use case đã implement.
Không làm mất payment/deployment history khi dữ liệu nhiều; S2/S3 phải kiểm giới hạn
storage/archival trước nghiệm thu các phần đó. S1 giới hạn 2 MiB/document và 8 MiB/
owner bundle, từ chối ghi vượt mức, giữ nguyên lịch sử đã commit; không tự trim audit.
Các limits này tính UTF-8 bytes tại ứng dụng, không phải độ dài NVARCHAR SQL.

## 4. Transaction sau cutover

1. Giữ request/horses/account locks đúng scope, status/version/ownership guards,
   unique DEPOSIT và unique Trip theo Request; không bỏ concurrency vì đã dùng SQL.
2. Tạo/kiểm hash immutable file bytes trước transaction khi phù hợp; không giữ SQL
   lock suốt LibreOffice rendering hay SMTP/provider network call.
3. Trong một SQL transaction: revalidate, thay đổi business columns và append
   document/audit/receipt SQL; lỗi bất kỳ rollback hết. SQL-state adapter không Commit
   hoặc SaveChanges thay UoW. Owner row phải tồn tại trong cùng transaction; thao tác
   tạo row mới cần stage + flush SQL trong transaction trước append, không commit sớm.
4. Gỡ PREPARED/pending projections/after-SQL receipt completion và recovery endpoints
   chỉ dùng để chữa split SQL/JSON file sau khi các use case tương ứng đã cutover.
   Giữ retry/idempotency/SQL transaction rollback và immutable PDF integrity checks.
5. SMTP vẫn có DELIVERING/DELIVERED/FAILED vì là tác vụ ngoài DB. Crash sau SMTP
   không suy đoán delivery; challenge không chắc chắn phải resend sau cooldown.
6. File bytes + SQL không có distributed transaction: orphan bytes có thể còn khi
   SQL rollback; không publish document trước SQL commit, không xóa file tham chiếu.
   Notification/payment-provider retry cần xử lý riêng; không gọi mọi thứ atomic.

Counter tăng cho từng append mới của owner; exact replay không tăng. SQL UPDATE
so sánh version và giữ nguyên các document khác cùng owner. UPDLOCK + current
transaction + compare-and-swap tránh hai writer âm thầm ghi đè chung JSON bundle.
API use cases vẫn phải xác thực role/owner trước truy cập adapter nội bộ.

## 5. Các bước triển khai và tiêu chí hoàn thành

### S1 — SQL foundation và mapping, lượt hiện tại

- [x] Chốt mapping đủ dữ liệu, không cắt review hoặc chức năng Flow 1.
- [x] Migration 004: tám cột vào bốn bảng hiện hữu, không bảng mới.
- [x] `IFlow1StateStore` / `SqlFlow1StateStore` hỗ trợ transaction chung, revision,
  expectedVersion, replay/key misuse, case-normalized IDs, limits/owner guards.
- [x] Test SQL migration/rollback/concurrency/reopen/missing owner/invalid key.
- [x] Giữ nguyên runtime cũ trước cutover; không áp migration lên DB nghiệp vụ.
- [x] Regression cuối 179 pass (Flow1 132 + Registration 47), build/diff checks;
  xem [báo cáo S1](FLOW1_PHASE4_SQL_STATE_REPORT.md), commit local phần đã kiểm chứng.

### S2 — Chuyển các use case đã có, transaction SQL duy nhất

Source cutover đã thực hiện trong lượt trực tiếp “Chuyển đi. Ko cần đợi 2 tiếng nữa”.
Chi tiết phạm vi và bằng chứng ở [báo cáo S2](FLOW1_PHASE4_SQL_CUTOVER_REPORT.md).

1. CustomerTransportService: create horse/request đúng order owner SQL + state,
   documents/history/selectable/detail/list, quote snapshot và idempotent replay.
2. RequestReviewService: giữ toàn bộ hỏi/đáp/revision/change/plan/quote/Draft;
   SQL state + canonical projections + superseded contracts cùng commit. Gỡ
   PendingReview/projections/EnsureFile/Finalize và recovery dành riêng file saga.
3. Publication: render ngoài transaction, append COMMITTED manifest + deadline/
   status cùng SQL commit; không hai bước publish/recover/discard sau cutover.
4. OTP/acceptance: account budget USER state theo UserID, gửi ngoài transaction;
   signed timestamp + invoice + consumed challenge + receipt commit một lần.
   Gỡ acceptance PREPARED/manager recovery chỉ dành split storage.
5. Đổi DI/test factories sang SQL provider thật; lỗi schema/state trả lỗi rõ,
   không fallback file. Không đọc file mới khi SQL thiếu state để che lỗi import.
6. Thay test file-saga bằng SQL rollback/injected-failure tests tương ứng. Giữ
   owner/status/stale/hash/OTP/cooldown/budget/retry/parallel/restart/one-invoice/no-Trip
   coverage. Browser nối API/SQL/PDF/loopback SMTP kiểm use case thật.
7. Chỉ bật runtime SQL khi toàn bộ use case đã có dùng cùng provider và schema
   preflight/import path rõ. Cutover không được âm thầm mất dữ liệu local có sẵn.

### S3 — Import có kiểm chứng, dọn phần cũ và regression

**Đã hoàn thành source/tool/test của S3** theo yêu cầu “Tiếp”, không tự apply vào
DB nghiệp vụ. [Hướng dẫn vận hành](../../backend/tools/Flow1StateImport/README.md)
có dry-run mặc định, xác nhận target/offline/reviewed fingerprint khi apply.
SQL giữ source receipts cùng transaction; JSON nguồn được giữ nguyên, runtime chỉ
hash đối chiếu committed receipts và không parse làm business state. PREPARED latest
hoặc conflict được báo để reconcile rõ, không đoán success. Các mục dưới là tiêu chí
đã kiểm trong disposable DB/Chrome; không phải bằng chứng import dữ liệu production.

1. Tạo tool read-only inventory/dry-run mặc định: xác định target DB rõ, đọc SQL
   rows + private metadata + file hashes, báo missing/duplicate/owner/version conflict.
   Không apply DB nghiệp vụ từ scheduler. Không giả tạo state cho legacy thiếu file.
2. Import giữ đủ revisions/actors/time/keys/versions, references/PDF hash và OTP
   counters; không rotate secret hoặc reset attempt/budget âm thầm. Resolve synthetic
   otp-account hashed ID bằng actor/customer đối chiếu USER. PREPARED legacy phải
   reconcile hoặc dừng báo xung đột, không đoán success. Retry import idempotent.
3. Kiểm parity snapshot/plan/quote/PDF/receipt/invoice/status từ nguồn sang SQL;
   simulated interruption rollback toàn batch hoặc checkpoint rõ; tuyệt đối không
   xóa sidecar/private bytes sau import chỉ vì tool trả 0.
4. Gỡ LocalFlow1MetadataStore/IFlow1MetadataStore, file-lock/temp/rename và test cũ
   khi không còn consumer. Tách options file private/runtime khỏi options metadata,
   giữ chống public wwwroot. Không xóa tests mà thiếu replacement tương ứng.
5. Browser/regression toàn bộ use case hiện có trên SQL, UAT đúng scope. Ghi số
   dòng/codepaths thực sự bỏ được; không hứa giảm nửa code hoặc tốc độ chưa đo.

Sau S3 tiếp tục **phase 4** decline/expire/reissue/extension/legacy Contract FE;
rồi phase 5 thanh toán/activation và phase 6 operational deployment/Flow 2/3.
Không tính S1/S2/S3 là hoàn thành Flow 1. Mỗi lượt lịch hoàn thành tối đa một bước
chuyển đổi hoặc một business phase; nếu chưa đạt, lượt sau tiếp tục cùng bước.

## 6. Bảo toàn và quyền thao tác

- Không thay `frontend/vite.config.ts` staged riêng hoặc private appsettings.Local.json.
- Không push/deploy/PR/thay hạ tầng, không migration/reset/seed HorseTransportDB.
- Commit local chỉ file/hunk đã kiểm chứng, không lấy nguyên index của người dùng.
- Schema transition đã được duyệt; không hỏi lại lựa chọn đã chốt. Chỉ hỏi nếu cần
  quyết định nghiệp vụ hoặc quyền ngoài phạm vi thật sự chưa có.
- Không thêm SQL table mới, kể cả outbox/metadata/version/audit table.
