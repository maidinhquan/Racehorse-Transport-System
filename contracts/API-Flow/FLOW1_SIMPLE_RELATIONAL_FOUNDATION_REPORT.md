# Flow 1 — foundation quan hệ theo scope demo đã chốt

Ngày 17/10/2026, Asia/Saigon. Baseline `ea943a4bcdd2a43209d157dd4478fb848216358c`.
Branch `codex/flow1-relational-mvp`, worktree:
`C:/Users/admin/.codex/worktrees/flow1-relational-mvp/Racehorse-Transport-System`.

## Quyết định mới

Đại ca đã đưa thiết kế hồ sơ ngựa mới nhất, Manager chốt giá trực tiếp trong
Contract, chỉ VNPay và không thêm bảng/JSON. Sau khi được giải thích về gia hạn,
khách đề nghị hủy, confirm/hold/resume, đại ca xác nhận **“OK. Vậy vẫn giữ.”**
Lượt này đưa cả ba vào mapping hiện hành; không hỏi lại A/B/C, không quay về budget
bốn nhóm/bank-proofs/frozen RHM snapshots chỉ vì report cũ từng giữ các chức năng đó.

## Files / layer / kết quả

| File | Layer và mục đích |
| --- | --- |
| backend/database/006_flow1_simple_relational_foundation.sql | SQL foundation additive: 63 cột, 25 CHECK, 3 indexes; không tạo bảng/FK |
| backend/tests/Flow1.Tests/SimpleRelationalFoundationTests.cs | Native SQL tests cho profile mới, liên kết/legacy/rollback/stale/constraints |
| backend/tests/Flow1.Tests/Flow1.Tests.csproj | Copy006 vào output test, không startup hook |
| contracts/API-Flow/FLOW1_SIMPLE_RELATIONAL_MAPPING.md | Mapping từng cột, lý do, states/guard/conversion/UAT và Mermaid flow mới |
| contracts/API-Flow/FLOW1_IMPLEMENTATION_PLAN.md | Header xác định scope mới thay mapping005 |
| contracts/API-Flow/FLOW1_RELATIONAL_MVP_SCOPE_CHOICES.md | Header chốt latest-files/direct-price/VNPay + gia hạn/hủy/deployment |
| contracts/API-Flow/FLOW1_RELATIONAL_COLUMN_MAPPING.md | Gắn cảnh báo superseded cho mapping166 cột |
| contracts/API-Flow/FLOW1_RELATIONAL_R0_REPORT.md | R0/005 là checkpoint lịch sử, không chỉ dẫn triển khai hiện hành |
| backend/database/README.md | Current profile000→003→006 và ranh giới operator/cutover |

Các file Domain/Application/Infrastructure/WebApi runtime và FE **chưa đổi**.
Không nói store JSON đã được xóa hoặc chuỗi typed API đã chạy chỉ vì schema đạt.
006 từ chối005, không tự kết hợp hai profile hoặc dọn cột của nó. Có thể coexist004
để converter đối chiếu sau này; chưa copy state, chưa backfill IsCurrent và chưa
drop JSON/constraints cũ. RowVersion tự sinh là cơ chế optimistic concurrency,
không phải serialized state/history; năm bảng đều có token để test stale write.
Actor columns giữ scalar ID, không tạo FK mới. Existing003 đã giữ một Trip/request
và một DEPOSIT invoice/Contract. PDF/OTP/IPN/đối soát/guards liên bảng vẫn phải do
service mới thực hiện, không tuyên bố CHECK đơn lẻ thay thế các guard đó.

## Kiểm chứng

Tám native SQL tests mới dùng disposable `RaceHorseFlow1Test_<GUID>` trên
`.\SQLEXPRESS`, không ghi/migrate/import/drop HorseTransportDB:

1. Fresh003 không004: apply006 hai lần, đúng +63 cột/5 rowversion/25 trustedCHECK;
   không thêm persistent table hoặc đổi bất kỳ FK/action/trust nào, giữ request cũ.
2. Coexist004: giữ JSON/version/SignedAt/PaidAmount nguyên, không tự nhận đã chuyển.
3. Sai type rollback tất cả ALTER trước đó; phát hiện005 và dừng không mix profiles.
4. Chặn tọa độ thiếu cặp/out-of-range, prep dưới floor2/3/7, sai cọc40%, OTP thiếu
   evidence/quá attempts, PDF public URL và effective deadline thiếu hạn gốc.
5. Unique current Contract/request; unique VNPay SUCCESS receipt; cả response00 và
   transactionStatus00/đúng số tiền mới qua CHECK. Không trigger tự cộng invoice.
6. Hạn cọc không thấp hơn hạn lúc ký, cancellation decision phải đủ actor/reason/time,
   confirmed handoff phải có event; hold phải clear current ack. SQL rollback
   extension/invoice giữ lại hạn cũ và tiền cũ.
7. RowVersion tự đổi sau edit; UPDATE với token cũ ảnh hưởng0row, không ghi đè notes.
8. Reapply không chấp nhận CHECK/index bị disable.

Lần focused đầu: 7 pass/1 fail do assertion tìm PhotoUrl ở tất cả bảng; schema legacy
có cột tên này ở bảng khác. Đã giới hạn assertion về dbo.HORSE. Không thay guard
hoặc acceptance để làm test qua. Kết quả final toàn solution ghi bên dưới.

```powershell
$env:RACEHORSE_TEST_SQL_SERVER='.\SQLEXPRESS'
$env:RACEHORSE_TEST_LIBREOFFICE='D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\runtime\libreoffice-26.8.1\extracted\program\soffice.com'
dotnet test backend/Backend.slnx --nologo --logger 'console;verbosity=minimal'
```

**PASS 263 tests = 216 Flow1 + 47 Registration, 0 fail / 0 skip.**
Flow1 duration 2m27s, Registration26s; full solution command exit0. Tám tests mới
đều đạt trong lượt full sau khi sửa phạm vi assertion. Kết quả này là schema mới
+ hồi quy runtime JSON hiện hành, chưa là typed runtime UAT. `git diff --check`
đạt; kiểm script không có USE/CREATE persistent table/database/business UPDATE/
DELETE. Không đưa secret/runtime/binary/PDF generated vào commit.

Không thay FE nên không chạy FE/build/browser mới; không gọi đây là typed E2E,
provider VNPay Sandbox hay business DB verification. GitNexus không có index cho
Racehorse trong inventory hiện hành; dùng source search/SQL metadata/native tests
để đối chiếu foundation, không tuyên bố đã chạy impact graph của repo này.

## Scheduler và bước tiếp theo

Lịch `Flow 1 — triển khai và commit mỗi 2 tiếng` đã cập nhật scope mới, giữ ACTIVE
và chu kỳ2tiếng. Không còn chỉ dẫn triển khai166 cột/005, bank-proofs hoặc budget.
Không tự pause lịch hoặc hỏi lại những lựa chọn đã chốt.

Tiếp theo chuyển typed entities/EF/repository và Application services/API/FE theo
mapping006. Dùng test-host cho chuỗi typed; chỉ switch DI/source khi customer,
Manager review/direct price, PDF/OTP/sign/deadlines/cancellation, VNPay/activation
và current deployment/handoff đã kiểm connected. Giữ raw private bytes và source
004 để inventory/parity offline; drop JSON chỉ sau cutover và quyền operator riêng.
Kiểm API consumers, unnamed INSERT/SELECT* ordinal/bulk trước merge vào checkout
chính. Không merge/push trong lượt này. Trạng thái user ở primary giữ nguyên.

Provider Sandbox/public HTTPS IPN thật, runtime đích/issuer/SMTP/HMAC/private bytes/
backup, offline business conversion và scoped operational UAT vẫn là các gate
riêng; không tự cấp quyền hạ tầng/tiền thật/DB nghiệp vụ để đạt acceptance.
