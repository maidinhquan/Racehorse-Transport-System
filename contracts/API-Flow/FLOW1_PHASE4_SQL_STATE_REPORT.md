# Flow 1 — chuyển SQL state, S1 foundation

Ngày **16/10/2026, Asia/Ho_Chi_Minh**, branch `Truong`.
Commit trước lượt: **`ec975cf3d7c5ae321d2148d1fcc632ef371ea026`**.
Quyết định trực tiếp: **metadata vào SQL, giữ đầy đủ Flow 1, không thêm bảng**.
Xem [plan chuyển đổi S1–S3](FLOW1_SQL_STATE_TRANSITION_PLAN.md).

**Phạm vi S1:** schema/port/adapter SQL và test transaction, cập nhật plan/lịch.
**Chưa cutover endpoint hoặc bỏ LocalFlow1MetadataStore.** Đây là bước nền tảng
kiểm chứng trước khi chuyển use case, không phải hoàn tất refactor/phase 4/Flow 1.

## Thay đổi đã thực hiện

- `backend/database/004_flow1_sql_state.sql`: mỗi bảng HORSE/TRANSPORT_REQUEST/
  CONTRACT/USER thêm Flow1StateJson (nvarchar(max), nullable) và Flow1StateVersion
  (bigint, NOT NULL, default 0): **8 cột, 0 bảng mới**. Giữ nguyên 003 và Trip nullable.
- Migration SQL transactional/repeatable, ISJSON + nonnegative counter constraints;
  chặn schema/type/computed column/default/check giả/disabled/untrusted không phù hợp.
  Không seed/reset hoặc tự tạo metadata/history cho rows legacy.
- `backend/Application/Interfaces/Flow1/IFlow1StateStore.cs`: Application port và
  typed envelope revisions; không reference EF hoặc file provider.
- `backend/Infrastructure/Storage/SqlFlow1StateStore.cs`: Infrastructure SQL adapter
  dùng EF connection + current transaction. Fixed mapping table/key, parameters cho
  values, ASCII IDs normalized, document owner/version/schema/history validation.
- Append dùng UPDLOCK/ROWLOCK + owner counter compare-and-swap, bảo toàn các document
  khác cùng row; expectedVersion/replay/key misuse/audit. Không Commit/SaveChanges
  trong adapter; từ chối ghi ngoài transaction hoặc owner row chưa tồn tại.
- Giới hạn 2 MiB/document và 8 MiB/owner bundle; oversize/cancel/error rollback,
  không tự trim lịch sử. Port không tự che secret trong JSON tùy ý: S2 chỉ được
  truyền typed DTO chứa keyed digests, tuyệt đối không raw OTP; OTP/email/hash/status
  và quyền vẫn do Application service kiểm.
- `backend/WebApi/Extensions/Flow1ServiceExtensions.cs`: đăng ký SQL port scoped;
  **không** thay IFlow1MetadataStore singleton hiện đang dùng. Không tự chạy 004.
- `backend/tests/Flow1.Tests/SqlStateStoreTests.cs`: tests SQL migration/atomicity/
  concurrency/reopen/limits và invalid-key tests không cần SQL.
- `backend/tests/Flow1.Tests/Flow1.Tests.csproj`: copy 004 vào test output.
- `contracts/API-Flow/FLOW1_IMPLEMENTATION_PLAN.md`: bản 3.0, schema/state target SQL;
  đánh dấu rõ runtime cũ trước cutover, link plan S1–S3 và trạng thái nghiệm thu.
- `backend/database/README.md`: bổ sung 004, transition/import/rollback boundaries.
- Lịch **Flow 1 — triển khai và commit mỗi 2 tiếng** giữ ACTIVE/cadence cũ, bỏ guard
  chờ lựa chọn và giới hạn hai cột đã bị thay thế. Lượt sau ưu tiên S2, không mở rộng
  file-saga để implement decline/gia hạn trước cutover.

Không sửa frontend, legacy backend/DAO hoặc business entities/EF model chung.
Vì vậy auth và endpoint hiện tại chưa đòi cột 004 để đọc entity bình thường.
Không sửa private appsettings.Local.json hoặc staged frontend/vite.config.ts.

## Kiểm thử

```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE=(Resolve-Path 'backend/WebApi/App_Data/flow1/runtime/libreoffice-26.8.1/extracted/program/soffice.com').Path
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

**179 pass = Flow1 132 + Registration 47, 0 fail/skip.** Có 17 test mới (13 SQL
integration cases và 4 invalid-key/type cases); real LibreOffice regression được
bật bằng biến môi trường trên. Trước đó lượt focused 16 test cũng pass; đã bổ sung
computed-column migration guard rồi chạy lại full suite đạt số liệu cuối 179.
`dotnet build backend/Backend.slnx --nologo -v:q` **PASS**, 0 warning/error;
`git diff --check` **PASS** trước commit. Không lấy số 162 cũ để nghiệm thu thay đổi mới.

Các trường hợp SQL mới:

1. 004 chạy hai lần chỉ tăng 8 cột, không tăng sys.tables, giữ row/status legacy.
2. Wrong type, computed column, default khác 0, named CHECK giả dừng và rollback
   toàn DDL của lượt migration; không chuyển kiểu hay ghi đè dữ liệu cũ.
3. Thiếu 003 dừng; SQL chặn JSON sai và version âm.
4. Đủ key/type của bốn owner tables được đọc lại qua context mới; không tạo folder
   metadata hoặc dùng LocalFlow1MetadataStore trong các tests SQL-state.
5. State + business status rollback chung khi throw sau SaveChanges trước commit.
6. Synthetic signature/invoice/acceptance proof: invoice SQL CHECK lỗi thì cả state,
   request/contract/signature rollback; retry khi bỏ lỗi commit đủ một invoice VND
   40% và evidence, 0 Trip. **Đây là transaction proof, chưa phải endpoint OTP đã cutover.**
7. Exact retry không tăng row counter; đổi payload/actor/action cùng key bị từ chối.
8. Hai independent contexts cùng version chỉ một append thành công, không mất
   document khác của owner bundle.
9. Từ chối append ngoài transaction/missing owner; không tạo row phantom.
10. Wrong owner binding hoặc NULL state với counter đã ghi phải fail closed.
11. Oversize/cancel không phá history đã commit, JsonElement vẫn đọc sau caller dispose.
12. Invalid type/key/traversal/SQL injection-shaped ID bị từ chối trước network/DB.

Không chạy frontend test/build hoặc browser cho S1: không đổi FE/endpoint/provider
đang phục vụ. Các số liệu Chrome/18 FE tests của increment B vẫn là baseline trước
lượt này, không được gọi là nghiệm thu browser dùng SQL state. S2 phải chạy browser
thật trên SQL provider và thay fault tests ứng với cơ chế transaction mới.

## Tiếp theo / điều kiện cutover

- **S2:** chuyển Customer/review/publication/OTP/sign/fixtures sang SQL port, gộp
  business + state + audit/receipt một transaction; đủ role/status/hash/OTP/version/
  concurrency/retry/restart/rollback coverage. Tạo owner row mới cần flush trong
  transaction trước Append; không thay bằng commit trước để vượt điều kiện owner.
- Gỡ PREPARED/projection/finalize recovery chỉ thuộc split storage, cập nhật FE/API
  tương ứng. Giữ delivery state của SMTP và các external operations thật sự cần retry.
- **S3:** inventory/dry-run/import/parity cho dữ liệu file cũ, xử lý legacy pending,
  giữ actor/time/hash/keys/attempts/rate budget; rồi gỡ provider/interface/options
  metadata file và thay tests cũ bằng SQL tests tương ứng. Không dùng dual-write
  hoặc fallback file khi SQL lỗi; không xóa sidecar/private bytes trước parity.
- Chưa apply 004/import lên HorseTransportDB hoặc SQL business DB khác. Scheduler
  chỉ chạy controlled disposable DB names, không push/deploy/PR/hạ tầng.
- Phase 4 còn decline/explicit expire/reissue/extension/legacy Contract FE sau storage
  transition. Phase 5/6 và full Flow 1 UAT chưa hoàn thành; không pause lịch như đã xong.
