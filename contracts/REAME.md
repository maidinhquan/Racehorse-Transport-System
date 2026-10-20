# API Contract – Hệ thống Quản lý Vận chuyển Ngựa đua (SWP391)

## 1. Tổng quan

Bộ API Contract được tổ chức theo từng role nhằm thống nhất cách Frontend (FE) và Backend (BE) triển khai hệ thống.

Mỗi file API Contract cần mở đầu bằng bảng **Page → API**, xác định:

- Page hoặc chức năng tương ứng trên Frontend.
- Endpoint mà page cần sử dụng.
- HTTP Method.
- Role được phép truy cập.
- Mục đích và điều kiện nghiệp vụ của endpoint.

**Nguyên tắc:** API Contract phải tuân thủ Use Case Specification và Business Rules đã được thống nhất.

## 2. Cấu trúc bộ API Contract

| File | Role | Phạm vi |
|---|---|---|
| [00-conventions.md](00-conventions.md) | Tất cả – **đọc trước** | Quy ước API, response, lỗi, phân quyền, trạng thái, thời gian, phân trang |
| [01-shared-api.md](01-shared-api.md) | Tất cả | Authentication, Account, Notifications, Tasks, Files, Master Data, Regulation Lookup |
| [02-customer-api.md](02-customer-api.md) | `CUSTOMER` | Quản lý ngựa, tạo và chỉnh sửa đơn, báo giá, hợp đồng, thanh toán, theo dõi, nghiệm thu, khiếu nại |
| [03-specialist-api.md](03-specialist-api.md) | `TRANSPORT_SPECIALIST` | Hồ sơ pháp lý, kiểm dịch, thông quan, checklist, yêu cầu bổ sung tài liệu |
| [04-manager-api.md](04-manager-api.md) | `LOGISTICS_MANAGER` | Xét duyệt đơn, kế hoạch sơ bộ, báo giá, hợp đồng, thanh toán, phê duyệt điều phối, sự cố, khiếu nại, tài chính, báo cáo |
| [05-coordinator-api.md](05-coordinator-api.md) | `FLEET_COORDINATOR` | Phương tiện, nhân sự, lộ trình, phân công theo chặng, đặt dịch vụ hàng không, điều chỉnh kế hoạch |
| [06-driver-api.md](06-driver-api.md) | `DRIVER`, `ESCORT` | Chuyến được phân công, xác nhận mốc hành trình, nhật ký sức khỏe, sự cố, bàn giao ngựa |

**Nền tảng:** Responsive Web Application. Không yêu cầu PWA hoặc Mobile Native trong phạm vi Demo.

Bác sĩ thú y sử dụng tài khoản `ESCORT`, được xác định qua vị trí chuyên môn `VETERINARIAN`, chứng chỉ và phân công theo chặng.

## 3. Mô hình nghiệp vụ tổng quát

```text
CUSTOMER
   |
   | Tạo nhiều đơn vận chuyển
   v
TRANSPORT REQUEST
   |
   | Hợp đồng đã ký và tiền cọc được xác nhận
   v
TRIP
   |
   | Có một hoặc nhiều chặng
   v
ROAD / AIR SEGMENTS
```

Quy tắc quan hệ:

- Mỗi Transport Request thuộc duy nhất một Customer.
- Mỗi Transport Request được kích hoạt tạo đúng một Trip.
- Một Trip chỉ phục vụ một Transport Request, không gom đơn của nhiều Customer.
- Một Trip có thể vận chuyển nhiều ngựa và sử dụng nhiều phương tiện hoặc chặng vận chuyển.
- Mỗi Transport Request có báo giá, hợp đồng, thanh toán, nghiệm thu và trạng thái đóng đơn riêng.
- Trip chỉ được tạo sau khi hợp đồng đã ký và tiền cọc được xác nhận.

## 4. Thứ tự triển khai đề xuất

| Sprint | Mục tiêu Demo | API Contract liên quan |
|---|---|---|
| **1** | Đăng ký, xác thực email/OTP, đăng nhập, phân quyền, thông tin tài khoản, master data | `01` – Authentication, Account, Master Data |
| **2** | Customer quản lý ngựa, upload hồ sơ, tra cứu quy định, xem dự toán sơ bộ, tạo đơn | `02` – Horse Management, Documents, Estimate, Transport Request; `01` – Shared Data |
| **3** | Manager xét duyệt hoặc yêu cầu chỉnh sửa đơn, lập kế hoạch sơ bộ, báo giá chính thức, thương lượng, ký hợp đồng, xác nhận cọc, kích hoạt đơn | `04` – Request Approval, Quotation, Contract, Payment; `02` – Quotation, Contract, Payment |
| **4** | Coordinator lập lộ trình và phân công nguồn lực; Specialist chuẩn bị và duyệt hồ sơ song song; Manager xác nhận triển khai và duyệt điều kiện khởi hành | `05` – Routes, Fleet, Assignments; `03` – Checklist, Documents, Customs; `04` – Approvals |
| **5** | Driver/Escort cập nhật mốc thủ công, bác sĩ ghi nhật ký sức khỏe, xử lý sự cố, cập nhật ETA; Customer theo dõi tiến độ | `06` – Milestones, Health, Incidents; `02` – Tracking; `03`, `04`, `05` – Incident Management |
| **6** | Bàn giao ngựa, nghiệm thu, thanh toán còn lại, giải quyết khiếu nại, đối soát chi phí, đóng đơn, dashboard, xuất báo cáo PDF | `06` – Handover; `02` – Acceptance, Payment, Complaint; `04` – Complaint, Reconciliation, Reports; `01` – Notifications |

**Lưu ý:** Sprint là thứ tự triển khai Demo, không có nghĩa các nghiệp vụ xảy ra tuần tự hoàn toàn. Sau khi Trip được kích hoạt và Manager xác nhận triển khai, Coordinator và Specialist thực hiện công việc song song.

## 5. Quy tắc đồng bộ FE – BE

1. Frontend không tự quyết định trạng thái nghiệp vụ quan trọng.
2. Backend chịu trách nhiệm validate dữ liệu, phân quyền, kiểm tra điều kiện và thực hiện State Transitions.
3. Frontend chỉ hiển thị các thao tác phù hợp với trạng thái hiện tại và quyền của người dùng.
4. Backend phải tiếp tục kiểm tra quyền ngay cả khi Frontend đã ẩn nút thao tác.
5. Các sự kiện quan trọng phải được lưu lịch sử: yêu cầu chỉnh sửa, phê duyệt, báo giá, ký hợp đồng, xác nhận thanh toán, lộ trình, sự cố, nghiệm thu, khiếu nại và đóng đơn.
6. Tài liệu và bằng chứng liên quan phải được kiểm tra quyền truy cập theo Customer hoặc Trip được phân công.
7. Mọi thông tin thời gian phải phân biệt thời điểm dự kiến, thời điểm thực tế và lịch sử điều chỉnh.
8. Các phép tính tài chính phải được thực hiện hoặc xác thực tại Backend.
9. Các API phải thống nhất response structure, error code và HTTP status code theo `00-conventions.md`.
10. Một trạng thái nghiệp vụ không được tự động chuyển tiếp nếu chưa đáp ứng đầy đủ điều kiện tương ứng.