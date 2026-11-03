# AGENTS.md – Quy tắc cho agent làm việc trên Racehorse-Transport-System

Dự án SWP391: hệ thống quản lý vận chuyển ngựa đua xuyên quốc gia.
- `frontend/`: React 19 + Vite + TypeScript, chia theo vai trò trong `frontend/src/features/<vai trò>` (coordinator, manager, customer, specialist, driver, admin…), phần dùng chung ở `frontend/src/shared`.
- `backend/`: ASP.NET Core 8, Clean Architecture (Domain / Application / Infrastructure / WebApi).
- Tài liệu cần đọc khi liên quan: `README.md`, `backend_coding_rules.md`, `RULE/ID_NAME_RULE.md`, `RULE/DATABASE_STATUS_CONVENTION.md`, `contracts/` (API contract theo từng flow).

## 1. Cách làm việc

- **Mặc định chỉ sửa frontend.** Nếu một việc cần đổi backend, database hoặc API contract: dừng lại, nói rõ cần đổi gì và vì sao, chờ người dùng đồng ý rồi mới làm.
- **Tiết kiệm token:**
  - Đọc code trước, chỉ mở trình duyệt khi đọc code không thể kết luận.
  - Tìm bằng `grep`/`rg` rồi chỉ đọc đoạn liên quan; không đọc cả file dài nếu không cần.
  - Không in lại toàn bộ file trong câu trả lời; tóm tắt thay đổi.
- **Hỏi khi chưa rõ**, nhất là khi yêu cầu có thể hiểu theo nhiều cách hoặc làm sai sẽ tốn nhiều công sửa. Hỏi ngắn, kèm các lựa chọn cụ thể.
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
