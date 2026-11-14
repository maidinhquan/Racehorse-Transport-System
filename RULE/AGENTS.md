# AGENTS.md – Quy tắc cho agent làm việc trên Racehorse-Transport-System

Dự án SWP391: hệ thống quản lý vận chuyển ngựa đua xuyên quốc gia.
- `frontend/`: React 19 + Vite + TypeScript, chia theo vai trò trong `frontend/src/features/<vai trò>` (coordinator, manager, customer, specialist, driver, admin…), phần dùng chung ở `frontend/src/shared`.
- `backend/`: ASP.NET Core 8, Clean Architecture (Domain / Application / Infrastructure / WebApi).
- Tài liệu cần đọc khi liên quan: `README.md`, `backend_coding_rules.md`, `RULE/ID_NAME_RULE.md`, `RULE/DATABASE_STATUS_CONVENTION.md`, `contracts/` (API contract theo từng flow).

## 1. Cách làm việc

- **Được phép sửa cả frontend và backend** (kể cả database, API contract, cấu hình Docker) khi việc yêu cầu cần. Khi đổi backend/database/contract, cập nhật luôn phần liên quan (migration/SQL, `contracts/`, `frontend/src/contracts`, test) và nói rõ trong câu trả lời đã đổi gì ở phía backend.
- **Tiết kiệm token:**
  - Đọc code trước, chỉ mở trình duyệt khi đọc code không thể kết luận.
  - Tìm bằng `grep`/`rg` rồi chỉ đọc đoạn liên quan; không đọc cả file dài nếu không cần.
  - Không in lại toàn bộ file trong câu trả lời; tóm tắt thay đổi.
- **Hỏi khi chưa rõ**, nhất là khi yêu cầu có thể hiểu theo nhiều cách hoặc làm sai sẽ tốn nhiều công sửa. Hỏi ngắn, kèm các lựa chọn cụ thể.
- **Lập kế hoạch và gửi cho người dùng trước khi sửa** (áp dụng cho mọi lỗi hoặc thay đổi hành vi, trừ chỉnh chữ/CSS nhỏ một chỗ). Chưa sửa code khi chưa gửi bản kế hoạch. Bản kế hoạch ngắn gồm:
  1. **Khoanh vùng lỗi:** hiện tượng người dùng thấy, file và hàm nghi ngờ, nguyên nhân gốc (đã đọc code xác nhận hay mới là giả thuyết).
  2. **Phân tích lỗi liên quan:** những trang/vai/luồng khác dùng chung đoạn code hoặc dữ liệu đó (Tài xế, Điều phối, Quản lý, Khách hàng, Chuyên viên, backend) và có thể bị ảnh hưởng hoặc đang sai cùng kiểu.
  3. **Cách sửa:** liệt kê file sẽ đổi, đổi gì, vì sao chọn cách đó; nêu phần cố ý không đổi.
  4. **Kế hoạch kiểm thử:** lệnh sẽ chạy (`tsc`, `vitest`, lint) và kịch bản thử tay hoặc test mới cho đúng lỗi này.
  Gửi bản kế hoạch, **chờ người dùng đồng ý** rồi mới sửa. Sau khi sửa phải **tự kiểm thử** theo kế hoạch (chạy `tsc`, test liên quan, so với kết quả trước khi sửa để phân biệt lỗi có sẵn), rồi báo kết quả thật, kể cả phần chưa kiểm tra được.
- **Đọc trạng thái hiện tại trước khi sửa.** Chạy `git status`; nếu có thay đổi chưa commit mà không do mình làm, đọc kỹ và giữ nguyên, không ghi đè.
- **Không tự xóa file.** Nếu một file không còn dùng, báo người dùng thay vì xóa.
- **Không tự commit/push** trừ khi người dùng yêu cầu.
- Trả lời người dùng bằng **tiếng Việt**, ngắn gọn: đã làm gì, ở file nào, còn hạn chế gì, cần người dùng kiểm tra gì.

## 2. Giao diện (UI)

- **Không dùng emoji trang trí** trong giao diện (ví dụ 📍 🗺️ ⚠️ 💡 ⚡ 📞 ✉️). Cần nhãn thì dùng chữ ("SĐT:", "Địa chỉ:") hoặc icon SVG có sẵn của dự án. Được giữ các ký hiệu có chức năng: mũi tên →, nút ✕ để xóa/đóng, ↑ ↓ để đổi thứ tự.
- **Không đưa ghi chú nghiệp vụ vào UI** (các đoạn giải thích quy trình kiểu "Phương án B – …", "Bác sĩ A bàn giao…", "Giá trị chưa được chủ dự án chốt", "dữ liệu demo"). Chỉ hiển thị:
  - thông báo theo trạng thái thật (ví dụ "Còn thiếu: …", "Chờ Manager duyệt", "Bị trả lại"),
  - hướng dẫn ngắn cho từng ô nhập liệu khi thật sự cần.
- Toàn bộ chữ trên giao diện bằng **tiếng Việt**, giọng trung tính, chuyên nghiệp.
- Thao tác chính phải ở gần nơi người dùng đang nhìn (ví dụ chọn điểm trên bản đồ thì nút "Thêm vào hành trình" hiện ngay trên bản đồ), tránh bắt người dùng cuộn xa.
- Nút bị khóa phải cho biết lý do (dòng chú thích hoặc `title`), không để nút "chết" không giải thích.
- **Màu sắc:** dùng biến CSS trong `frontend/src/index.css` (`--bg-page`, `--bg-surface`, `--text-primary`, `--border-color`, `--accent-primary`…), không viết mã màu cứng trong component, để giao diện sáng và tối đều đúng. Màu cam (`--accent-primary`) chỉ dành cho thao tác chính và điểm nhấn; mỗi khu vực chỉ có một nút chính.
- **Màu trạng thái thống nhất toàn hệ thống:** xanh lá = đã duyệt/hoàn tất, vàng = đang chờ, đỏ = lỗi/cần xử lý, xanh dương = thông tin/đã gửi, xám = không bắt buộc/chưa đến lượt. Dùng đúng component huy hiệu của feature (`TripStatusBadge`/`StatusBadge`), không tự tô màu riêng cho trạng thái.
- **Bố cục:** mỗi khối thông tin là một thẻ (card) có tiêu đề rõ; thứ tự từ trên xuống: tiêu đề và trạng thái, nội dung, ghi chú/lý do, rồi hàng nút thao tác ở cuối thẻ. Khoảng cách, bo góc, cỡ chữ lấy từ class dùng chung của feature, không đặt số `px` rời rạc cho từng chỗ.
- **Nhất quán giữa các vai:** cùng một giấy tờ/trạng thái phải có cùng tên gọi và cùng màu ở trang Khách hàng, Chuyên viên, Quản lý, Điều phối. Đổi nhãn ở `...Rules.ts` của một vai thì kiểm tra các vai còn lại.
- **Không hiển thị dữ liệu bịa:** khi chưa có giá trị thật (hạn giấy tờ, ngày, số tiền) thì ẩn hoặc ghi "Chưa có", không tự điền giá trị mặc định.
- **Hiển thị đúng số lượng:** một giấy tờ/đối tượng chỉ xuất hiện một dòng và đếm một lần, dù có nhiều bản ghi liên quan; trạng thái phải đổi ngay sau thao tác và tự làm mới khi vai khác thay đổi.
- **Responsive:** bố cục không vỡ ở màn hình hẹp; hàng nút được phép xuống dòng, bảng rộng cuộn ngang trong thẻ chứ không làm cả trang cuộn ngang.

## 3. Quy ước code

- Đặt code đúng chỗ theo vai trò: `features/<vai trò>/{pages,components,workflows,domain,store,api,styles}`. Logic nghiệp vụ dùng lại nhiều nơi đặt trong `domain/` (ví dụ `coordinatorRules.ts`), thao tác người dùng đặt trong `workflows/`.
- Store của Điều phối (`features/coordinator/store/coordinatorStore.tsx`): sửa dữ liệu trong `db` rồi gọi `commit()` để vẽ lại; `commit()` cũng tự lưu phần việc của Điều phối (tuyến, xe, nhân sự, chuyến bay) vào localStorage.
- Dữ liệu dùng chung giữa các vai (Điều phối ↔ Quản lý ↔ Chuyên viên ↔ Khách hàng) đi qua `shared/utils/sharedTrips.ts`, `shared/utils/sharedRequests.ts` và `shared/utils/syncChannel.ts`. Khi một vai đổi trạng thái mà vai khác cần thấy, phải gọi `saveSharedTrip` / `saveSharedRequest`. Lưu ý cơ chế này chỉ đồng bộ trong **cùng một trình duyệt**.
- Gọi API qua client có sẵn của từng feature (`flow3Api`, `managerApi`, `customerApi`…), không gọi `fetch` trực tiếp. Khi chuyển dữ liệu từ backend sang UI, chuẩn hóa trong hàm `...FromWire` của file api, không rải logic chuyển đổi trong component.
- Không thêm thư viện mới khi chưa hỏi người dùng.
- Không để lại import, biến hoặc file thừa sau khi gỡ một tính năng.
- **Trước khi báo xong**, chạy trong `frontend/`:
  - `npx tsc -p tsconfig.app.json --noEmit` – phải không có lỗi.
  - `npm run test:run` nếu có sửa logic đã có test.
  - Nếu không chạy được (ví dụ thiếu môi trường), nói rõ cho người dùng và nhờ họ chạy.
