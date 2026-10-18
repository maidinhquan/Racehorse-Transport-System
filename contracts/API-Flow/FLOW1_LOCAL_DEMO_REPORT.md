# Flow 1 — chế độ demo localhost tương tác

Ngày18/10/2026. Baseline `3ea44e9df666f7eb7692284e0155a394676de299`.
Đại ca chọn dùng localhost, chưa deploy, rồi yêu cầu “Làm luôn đi”. Scope lượt này:
khởi chạy demo có thể tự thao tác, dùng fixture/local test DB, không tiếp tục nghiệm
thu provider/IPN công khai. Primary/business DB không sửa ở lượt demo này.

## Thay đổi và ranh giới

- `backend/tools/Flow1RelationalHarness/Program.cs`: thêm `--serve`, loopback5129/5173,
  output riêng/host metadata, giữ process khi user thao tác; vẫn tạo/drop đúng một
  `RaceHorseFlow1Browser_<GUID>` với000/003/006. Chế độ autocheck có timeout hữu hạn;
  chế độ browser regression cũ vẫn giữ checks/invariants và tự dọn.
- `backend/tools/flow1-relational-browser.cjs`: Chrome tương tác, cấu hình proxy/API
  local cố định, smoke path qua chính simulator/OTP panel; mask code ở ảnh lỗi.
- `backend/tools/flow1-local-demo.cjs`: tooling browser-only, bảng chọn4role/OTP sink
  RAM; chặn navigation Sandbox trước network; kiểm HMAC/merchant/amount/reference/
  return của session fixture rồi mô phỏng callback có chữ ký tới IPN thật của API
  test. Cùng payload được giữ RAM để retry; không đổi outcome session đã gửi.
  ReturnURL chỉ đọc, không nhận tiền từ URL. Querydr UI bị chặn khi demo.
- `backend/tools/Start-Flow1LocalDemo.ps1`: Start/Stop/Status, reuse phiên đang sống,
  kiểm runtime/cổng/PID/path; helperẩn, Chrome hiển thị cho user. Dừng graceful bằng
  stop.request, không kill app lạ; host dọn riêng DB test.
- `backend/tools/flow1-local-demo.test.cjs`: kiểm session thật từ fixture signature,
  chặn tamper/merchant khác/return ngoài/amount không nguyên/duplicate params,
  role route mapping, RAM inbox/no-store, callback success/failure, nonce lạ.
- `backend/WebApi/WebApi.csproj`: exclude Compile App_Data. Phát hiện helper probe
  ignored từ lượt operator bị SDK compile cùng WebApi, gây duplicate top-level/
  assembly attributes; không xóa nguồn operator hoặc sửa logic nghiệp vụ để né lỗi.
- `FLOW1_LOCAL_DEMO.md` và operator guide: cách chạy/dừng, phạm vi demo, giới hạn.

Simulator không phải endpoint của WebApi và không được import vào frontend bundle.
Các trang `__flow1_demo` là route browser tooling trong Chrome do tool mở, không
phải public server routes. Không đưa “demo bypass” vào service/controller ký/tiền.
Backend vẫn kiểm signature/deadline/money/cancel/ownership/RowVersion như bình thường.
SMTP không gửi người thật; không ghi raw OTP ra file/log. No public endpoint/tunnel,
provider payment/querydr/refund hoặc business writes. Maps300km là fixture có nhãn.
Dữ liệu demo mất khi dừng; private artifacts ignored giữ riêng để đối chiếu.

## Kiểm chứng

- Node test runner:6tests đạt,0fail/skip.
- Build harness/WebApi:0warning/error sau compile exclusion.
- Connected Chrome ROAD ở chế độ `--serve` + `FLOW1_LOCAL_DEMO_AUTOCHECK=1`: đạt
  actualBCryptlogin/A1resubmit/directquote/realLOPDF/extensions/OTP/signedinvoice/
  cancelreject/Return-alone-unpaid/simulatorIPN/retry/singleTrip/confirmholdresume/
  both current acknowledgements. SQL cuối chỉ một invoice40M paid/một Trip,
  khôngCOST_ITEM/JSON columns. Test DB được tự dọn.
- Evidence: ignored `backend/WebApi/App_Data/flow1/local-demo-ac67bb21a8474705b7d4f09bb172ab44/`;
  `demo-smoke.json`, `typed-result.json`, `steps.log`, ảnh đã che input/code khi lỗi.
  PDF SHA256 `3ba8e3ba1374f88ca4cf33ddeaf3a913802686cd41a7906fd23aebc4c9d6cf8c`.
- Lượt đầu phát hiện HTTP redirect của browser routing không đi vào simulator,
  nên đổi sang navigation mới trong browser; lượt chạy lại đủ chuỗi đạt, không
  bỏ assertion hoặc ghi tiền từ Return để giả pass.

Full solution đã chạy lại sau thay đổi project: **305 backend =258Flow1+47Registration,
0fail/skip**. Launcher Start →Status Running=true →Stop graceful →Status Running=false
đạt. SQL xác nhận DB test `RaceHorseFlow1Browser_7c51eb1086504341b8b6ad68632f721b`
đã được dọn (count0), không query/update DB nghiệp vụ cho lượt demo. Kiểm port/PID/
reuse và metadata không chứa credential; không kill dịch vụ khác. Một phiên mới
đã mở cho user sau kiểm tra cleanup, Chrome panel đã kiểm trực quan và status Running=true;
SQL phiên mới xác nhận0Contract/0Payment/0Trip,4testaccounts; status/evidence nằm ở active-local-demo.json
ignored, không dùng file này như cấu hình DB nghiệp vụ.
Release publish smoke sau compile exclusion: WebApi có, không Flow1LegacySupport.dll,
không appsettings.Flow1Sandbox.Local.json hoặc App_Data/private runtime trong output.
Đây là kiểm packaging local, không deploy.

FE source không đổi;52FEtests/build/scopedlint là baseline trước lượt này, không
nói đã chạy lại. Provider/public IPN vẫn chưa nghiệm thu theo quyết định đã hoãn.
Primary chưa merge/push/deploy; không sửa/gỡ backup business hoặc tạo dữ liệu demo
trên HorseTransportDB.

Lệnh kiểm đã dùng:
```powershell
node --test backend/tools/flow1-local-demo.test.cjs
dotnet build backend/tools/Flow1RelationalHarness --nologo
# Set RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS and verified LibreOffice path privately.
$env:FLOW1_LOCAL_DEMO_AUTOCHECK='1'
dotnet run --no-build --project backend/tools/Flow1RelationalHarness -- '<Node executable>' '<Playwright module>' --serve
dotnet test backend/Backend.slnx --nologo
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1 -Action Status
pwsh -NoProfile -File backend/tools/Start-Flow1LocalDemo.ps1 -Action Stop
```
