# Flow 1 phase 6 — operational release and handoff

Ngày: 16/10/2026. Cùng lượt tích hợp phase 5–6 từ baseline `bf2ac7d` theo yêu cầu
trực tiếp “tích hợp toàn bộ luôn”. Deployment ở đây là bàn giao chuyến, không
phải deploy phần mềm.

## Nghiệp vụ

- Activation ghi deployment PENDING, chưa giải phóng tác vụ vận hành.
- Manager confirm kiểm signed/EFFECTIVE + ACTIVATED + verified deposit + đúng
  Trip/request/plan/version đã ký + không có thay đổi chờ + đủ preparation floor
  trước planned departure. Kiểm lại ownership/version/status của ngựa, booking
  overlap và immutable private bytes. Passport upload không tự APPROVED.
- Quyết định có optimistic version, idempotency key, actor/reason/time/history
  cùng SQL transaction. Customer chỉ đọc status/history được redacted.
- Hold trước departure; từ READY_TO_DEPART đưa Trip về PLANNING để downstream
  phải đánh giá readiness lại. Không reset Trip IN_TRANSIT/completed.
- Resume chỉ về PENDING/PLANNING; cần confirm rõ lần nữa. EventID mới làm package
  cũ mất hiệu lực. Không sửa PDF hoặc tự đổi lịch để vượt preparation guard.
- Operations queue đọc SQL; chỉ release CONFIRMED mới đọc/ack gói bàn giao.
  Coordinator chỉ ack ROUTING, Specialist chỉ ack DOCUMENTS. Backend rechecks
  trong transaction, không dựa vào nút bị ẩn ở frontend.
- Package schema v1 gồm EventID, Request/Trip/Contract IDs, frozen versions/hash,
  operational plan/dates/gateways/resources và horse document references.
  Không lộ cost/floor/suggested price trong gói tác nghiệp.
- Receipts hai stream nằm trong deployment SQL history, dedupe theo event/
  stream và retry key; polling queue khôi phục sau restart. Đây là durable SQL
  handoff state, không tuyên bố đã có một broker hoặc SQL outbox mới.
- Handoff acknowledgement là **tiếp nhận công việc**, không tự phê duyệt hồ sơ,
  mua bảo hiểm, gán xe, dựng route hay READY_TO_DEPART.

## File/layer

| Đường dẫn | Chức năng |
| --- | --- |
| backend/Application/DTOs/Flow1/DeploymentDtos.cs | Deployment state/history, v1 package và acknowledgements |
| backend/Application/Services/Flow1/DeploymentService.cs | Release/hold/resume, frozen binding, downstream guards/receipts |
| backend/WebApi/Controllers/Flow1/DeploymentController.cs | Manager decisions, owner read, operational roles/queue/private documents |
| backend/Domain/Interfaces/DAOs/IFlow1Repository.cs | Trip/activated-contract query contracts |
| backend/Infrastructure/DAOs/Flow1/Flow1Repository.cs | Active SQL queries |
| frontend/src/features/flow1/DeploymentPanel.tsx | Manager decisions và Customer status |
| frontend/src/features/flow1/OperationsInbox.tsx | Real Coordinator/Specialist handoff queue, receipt và frozen downloads |
| frontend/src/features/flow1/deploymentApi.ts | Real authenticated endpoints |
| frontend/src/app/router/AppRouter.tsx | /coordinator/flow1-work, /specialist/flow1-work và read-only VNPay return |
| frontend/src/features/coordinator/CoordinatorDashboard.tsx | Link tới inbox thật, giữ phần dashboard khác |
| frontend/src/features/documents/SpecialistDashboard.tsx | Link tới inbox thật, giữ phần dashboard khác |
| backend/tests/Flow1.Tests/DeploymentTests.cs | Native SQL role/status/race/rollback/hold-resume/handoff tests |
| backend/tools/Flow1BrowserHarness/Program.cs, backend/tools/flow1-browser.cjs | Disposable SQL + real browser + real LibreOffice + loopback SMTP + signed gateway fixtures |

Không sửa legacy DAO; không thêm schema trong phase 5–6.

## Kiểm chứng và ranh giới

Backend checkpoint toàn solution: **242 pass, 0 fail/skip**. Gồm confirm concurrent/
retry, owner/role, pre-activation guard, stale docs, impossible schedule, excess
requiring financial review, held/stale downstream writes, role-scoped stream
receipts, hold vs acknowledge race, failure sau deployment append và READY reset
rollback. FE checkpoint: **44 pass**, build/scoped lint pass.

Browser nối liền phase 5–6 **PASS**, 0 page errors, với real Chrome/SQL/private
files/LibreOffice/loopback SMTP; Maps HTTP fixtures và gateway local signed
callbacks. Sau bank partial 20 triệu và VNPay fixture 20 triệu có đúng 1 invoice
40 triệu đã trả/1 Trip PLANNING, rồi Manager confirm/hold/resume/reconfirm;
downstream write lúc hold trả 409; Coordinator ROUTING và Specialist DOCUMENTS
nhận đúng event mới, tải frozen passport; Manager refresh thấy đủ hai receipts.

Evidence ignored: `backend/WebApi/App_Data/flow1/browser-c1880d15126f48e1b7a4c2c8cd430830`.
Đã xem screenshot Customer payment và Specialist handoff. Browser-result,
gateway-fixture-result, deployment-result và screenshots giữ local, không commit.

Những lần đầu phát hiện harness chạm real rate limiter, lấy danh sách trước lúc
load và so `null` trong khi API omit null. Đã sửa harness đúng semantics, giữ
assertion và real limiter; đồng thời tránh Manager work remount do payment notice.

**Ranh giới Flow 2/3:** active source trước lượt này chưa có service/controller
thực thi trọn quy trình điều phối tuyến/hồ sơ. Lượt này nối được hai consumer
inbox thật và receipt SQL, kiểm guard bằng API thật. Các màn hình dashboard mock
khác vẫn thuộc scope Flow 2/3; không coi chúng là route planning/customs/readiness
đã vận hành. Khi các tác vụ đó được implement, mọi write phải dùng cùng release
guard và EventID hiện hành; handoff thành công không chứng minh full E2E Flow 2/3.

Không có production deployment/business DB cutover/provider callback thật trong
lượt này. Không tuyên bố toàn hệ thống hoặc full production Flow 1 UAT đạt.
