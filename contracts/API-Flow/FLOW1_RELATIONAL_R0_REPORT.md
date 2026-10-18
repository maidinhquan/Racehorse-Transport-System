# Flow 1 relational R0 — scope, typed mapping và SQL foundation

**Báo cáo lịch sử:** R0/005 166 cột đã bị scope trực tiếp ngày17/10/2026 thay thế.
Đọc [mapping mới](FLOW1_SIMPLE_RELATIONAL_MAPPING.md). Không triển khai R1 theo
mapping005 hoặc áp005 lên DB mới. Kết quả test bên dưới chỉ thuộc checkpoint R0.

Kiểm chứng ngày 17/10/2026, Asia/Ho_Chi_Minh.
Baseline `2ba80f273fa238c6eb3974ceb79ae766516a2fd5`.
Branch `codex/flow1-relational-mvp`, worktree:
`C:/Users/admin/.codex/worktrees/flow1-relational-mvp/Racehorse-Transport-System`.
Primary D:/Racehorse-Transport-System được người dùng đổi main/Truong trong lúc
làm; giữ nguyên checkout/commit và mọi sửa đồng thời. Không merge/cherry-pick/push.

## Quyết định nghiệp vụ đã có

Đại ca đã chọn A1 + B1 + C1 và nói rõ cho phép hơn 7 cột nhưng không thêm bảng,
để bảo vệ module/quan hệ của teammate. Không hỏi lại ba lựa chọn này.

- A1 giữ accept/reject/request-revision/resubmit; bỏ chat và proposal song song.
- B1 bốn nhóm cố định; plan current cost trên Request, quote bốn COST_ITEM rows
  theo Contract; không đổi COST_ITEM.ContractID nullable theo B2.
- C1 giữ gia hạn và Customer cancellation review; bỏ full timeline, giữ current
  state, last reason/actor/time/counters, PDF/signed receipt và từng Payment.

## Deliverable R0

| File | Layer / mục đích |
| --- | --- |
| contracts/API-Flow/FLOW1_RELATIONAL_MVP_SCOPE_CHOICES.md | Scope đã chọn, ghi rõ các history/use cases thu gọn |
| contracts/API-Flow/FLOW1_RELATIONAL_COLUMN_MAPPING.md | Mapping 166 cột và existing fields; invariants, API/UAT changes, R1–R5, offline parity/drop policy |
| contracts/API-Flow/FLOW1_IMPLEMENTATION_PLAN.md | Header scope mới supersede lịch sử SQL JSON, không lẫn với runtime hiện tại |
| backend/database/005_flow1_relational_mvp_foundation.sql | SQL Infrastructure foundation, explicit additive, chạy được trên003 và coexist004 |
| backend/database/README.md | Hướng dẫn scope005, operator boundary |
| backend/tests/Flow1.Tests/RelationalFoundationTests.cs | Bảy native SQL tests cho compatibility/constraints/rollback/dedupe |
| backend/tests/Flow1.Tests/Flow1.Tests.csproj | Copy005 vào test output; không startup migration |

Tổng 166 cột trên 8 bảng hiện có, 30 CHECK, 7 indexes. Không thêm bảng persistent,
không sửa cột/khóa ngoại hiện hữu; table variables chỉ là metadata migration.
Nullable/default cho phép named-column inserts cũ; không tuyên bố INSERT không
column list/SELECT * ordinal/bulk mapping và mọi teammate use case đều không ảnh hưởng.
Cần audit các module này khi tích hợp runtime/merge. Không gọi đây là hứa hẹn
chuẩn hóa đầy đủ 3NF hoặc giảm một nửa code; đây là trade-off typed columns theo
ràng buộc đã chọn.

005 không backfill Ready, chuyển dữ liệu, drop004, thực hiện SMTP/payment hoặc
đổi DI/runtime. JSON store cũ chưa bị xóa; chỉ xóa sau typed services và parity
đã kiểm đủ. USER không thêm cột: planned OTP sliding budget dùng reservation/send
notifications thật, không dùng Message chứa OTP/business payload. Runtime phần
này sẽ được implement/test ở R3; SQL foundation không chứng minh OTP mới chạy rồi.

## Kiểm chứng

Chạy từ worktree trên:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE = 'D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\runtime\libreoffice-26.8.1\extracted\program\soffice.com'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

**PASS 255 = 208 Flow1 + 47 Registration; 0 fail/skip**.
Flow1 duration 2m16s; Registration 29s. Đây là regression baseline runtime hiện
hành cộng 7 tests foundation, không phải runtime typed/E2E mới đã hoàn thành.
`git diff --check`: PASS. Secret/binary review được kiểm trên các path của increment;
không đưa runtime, private config hoặc generated PDFs vào commit.

Bảy tests xác minh:

1. Fresh003 không cần004; chạy005 hai lần, đúng166 cột mới/không bảng mới, tất cả
   FK cũ và action/trust flags giữ nguyên; không có cột JSON mới và dữ liệu cũ chưa Ready.
2. Coexist004 giữ nguyên JSON/version, số tiền và status cũ, không tự chuyển đổi.
3. Cột có sẵn sai type: fail rõ và rollback mọi ALTER trước đó, không ép kiểu.
4. Tọa độ ngoài range/Ready thiếu evidence/đưa pending proof vào money bị SQL reject.
5. Chặn hai current Contract cho một Request và một bank reference verified dùng hai lần.
6. CHECK cùng tên không rõ nguồn phải operator review; không tự thay guard của teammate.
7. Disabled index/CHECK bị từ chối; OTP budget fields chỉ nhận genuine delivery states,
   count cả failed reservation và không chứa code trong Message.

Lượt đầu đã phát hiện lỗi generator metadata datetime2 scale và test fixture SQL
batch compile (ALTER thêm cột rồi CHECK trong cùng batch). Đã sửa metadata/fingerprint
canonical SQL và tách fixture batch; chỉ kết quả cuối ở trên là checkpoint được commit.

## Giới hạn và bước kế tiếp

- R0 là schema foundation + mapping, chưa phải runtime bỏ JSON hay full E2E typed.
- FE không đổi trong increment, không chạy lại FE/browser rồi gán là evidence mới.
- Toàn bộ DB test có prefix RaceHorseFlow1Test_* và cleanup bằng helper; không
  migrate/import HorseTransportDB hoặc business DB, không copy secrets/runtime/PDF vào Git.
- R1 tiếp theo: typed entities/repository + Horse/Request/Mapping/A1 với native tests;
  sau đó R2 quote, R3 signing/C1, R4 money/deployment, R5 source cutover/cleanup.
  Không bật source trộn, không runtime fallback từng field từ JSON.
- Giữ cùng worktree/branch đã đính kèm. Primary có sửa đồng thời ở controllers/
  migrations/config/Vite, tuyệt đối không đưa vào commit này hoặc ghi đè.
- Scheduler cần đọc scope/mapping/report này thay header cũ CHƯA DUYỆT; chỉ commit
  local increment đã kiểm. Public VNPay/business cutover vẫn cần gate riêng.
