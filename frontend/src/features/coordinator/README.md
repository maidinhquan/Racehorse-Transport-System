# Coordinator

Giao diện Điều phối đội xe & tuyến được chuyển từ bản HTML demo sang React.
`src/app/router/AppRouter.tsx` sử dụng các trang được export từ `index.ts`.

## Cấu trúc

- `pages/`: trang theo chức năng; các tab chi tiết chuyến nằm trong `trip-detail/tabs/`.
- `components/`: giao diện dùng chung, chia theo `layout`, `common`, `forms`, `maps`, `air`, `demo`.
- `hooks/`: các hook vòng đời dùng chung giữa các trang.
- `store/`: dữ liệu trong bộ nhớ, đăng ký cập nhật, điều hướng và trạng thái modal/toast.
- `domain/`: quy tắc và trạng thái nghiệp vụ của chuyến, xe, nhân sự.
- `workflows/`: luồng thao tác lập tuyến, chuyến bay, sự cố và phân công. Có JSX vì các luồng này mở biểu mẫu xác nhận.
- `utils/`: định dạng ngày giờ, nhãn và giá trị hiển thị.
- `data/`: dữ liệu mẫu.
- `styles/`: CSS được giới hạn dưới `.cbn-coord`.

## Đường dẫn

Trang chính: `/coordinator/dashboard`, `/coordinator/monitor`, `/coordinator/places`,
`/coordinator/fleet`, `/coordinator/crew`, `/coordinator/flights`, `/coordinator/incidents`.
Các trang phụ: `/coordinator/fleet/:vehicleId`, `/coordinator/notifications`, `/coordinator/profile`.
Chi tiết chuyến: `/coordinator/trips/:tripId/:tab` (`overview`, `route`, `resources`, `flight`, `progress`).
`/coordinator/trips` chuyển đến trang giám sát hành trình.

## Dữ liệu

Đây vẫn là bản mô phỏng: dữ liệu và các quyết định Manager/Driver được xử lý trong bộ nhớ
của trình duyệt, chưa kết nối API backend. Tải lại trang sẽ khởi tạo lại dữ liệu theo chế độ demo.
