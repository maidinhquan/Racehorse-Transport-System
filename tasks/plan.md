# Kế hoạch Triển khai & Khắc phục Lỗi: Ngoại lệ Xe không thể vào điểm lấy ngựa (Pickup Access Exception)

## 1. Tổng quan Nghiệp vụ
Khi xe chuyên dụng (Horsebox lớn 3-6 chỗ) đến điểm đón của Khách hàng nhưng gặp trở ngại địa hình (đường làng hẹp, cầu yếu giới hạn tải trọng, cổng nhỏ, đường lầy lội...), tài xế không thể lái xe vào tận nơi.
Hệ thống xử lý linh hoạt theo quy tắc bán kính 500m:
- **Nhánh A (Dưới 500m) - Đổi điểm hẹn đón (Pickup Relocation / Meeting Point):** Điều phối viên chọn điểm hẹn ngoài đường lớn gần nhất, Khách hàng dắt bộ ngựa ra xe (Chi phí phát sinh = 0 VNĐ).
- **Nhánh B (Trên 500m) - Điều xe trung chuyển (Shuttling Feeder Vehicle):** Điều phối viên điều động xe nhỏ 2 chỗ (hoặc thuê xe địa phương) vào tận nơi đón ngựa chở ra điểm tập kết chuyển sang xe lớn (Có phát sinh chi phí trung chuyển cần khách hàng xác nhận).

---

## 2. Kiến trúc & Phân rã phụ thuộc (Dependency Graph)

```
[Phase 1: Database & Model Fixes]
        │
        ├── [Phase 2: Backend Core Logic & Security Triage]
        │           │
        │           ├── [Phase 3: Frontend Driver & Incident Sync Fixes]
        │           ├── [Phase 4: Coordinator Dispatch Map & Throttle Optimization]
        │           └── [Phase 5: Customer Approval & Realtime Event Loop]
        │
        └── [Phase 6: End-to-End Regression Verification & Checkpoints]
```

---

## 3. Thống kê & Phân loại 10 Lỗi Đã Khắc Phục

| Mã lỗi | Phân loại | Tệp tin liên quan | Nguyên nhân gốc rễ | Giải pháp kỹ thuật | Test Case TDD |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ERR-01** | *Cơ sở dữ liệu* | `TripPlanConfiguration.cs` | Default value kiểu `int` gán vào cột `decimal?`. | Đổi `.HasDefaultValue(0)` -> `.HasDefaultValue(0m)`. | `SeedTripDataAsync` trong `PickupAccessTests.cs` |
| **ERR-02** | *Logic nghiệp vụ* | `PickupAccessService.cs` | Trạng thái `trip.PickupAccessStatus` bị đổi `"RESOLVED"` trước khi kiểm tra nhánh ghi chú `ResolutionNotes`. | Lưu giữ `priorResolution` trước khi gán trạng thái mới. | `Customer_DecideAccess_Approved_...` |
| **ERR-03** | *Routing WebApi* | `PickupAccessController.cs` | Thiếu ánh xạ route kép (có và không có `/api`) khi client dùng base URL `/api`. | Khai báo song song 2 route attribute cho cả 3 vai trò. | Route integration tests |
| **ERR-04** | *Bảo mật IDOR* | `PickupAccessService.cs` | Thiếu kiểm tra phân công tài xế (`VehicleAssignments`) và chủ sở hữu đơn (`CustomerId`). | Kiểm tra quyền nghiêm ngặt, ném `UnauthorizedAccessException` khi vi phạm. | `Driver_ReportAccessBlocked_ThrowsSecurityException...` |
| **ERR-05** | *Validation* | `PickupAccessService.cs` | Cho phép nhập chi phí trung chuyển âm hoặc thiếu xe trung chuyển khi chọn nhánh SHUTTLING. | Thêm validate dữ liệu đầu vào tại tầng Service. | `Coordinator_ResolveAccess_ThrowsArgumentException...` |
| **ERR-06** | *Truy vấn dữ liệu* | `PickupAccessService.cs` | Sót Incident do không đồng nhất định dạng mã chuyến giữa dấu `-` và `_`. | Gom vào hàm `QueryActivePickupIncidents` so sánh cả 3 biến thể mã chuyến. | `PickupAccessTests.cs` |
| **ERR-07** | *Giao diện Driver* | `driver.types.ts`, `driverRules.ts` | Thiếu tùy chọn *"Không thể tiếp cận điểm lấy ngựa"* trong form tạo sự cố. | Thêm `PICKUP_ACCESS_BLOCKED` vào `IncidentType` kèm nhãn tiếng Việt chuẩn. | `registers PICKUP_ACCESS_BLOCKED...` trong `pickupAccess.test.ts` |
| **ERR-08** | *Lọc dữ liệu Driver* | `IncidentsPage.tsx` | Sự cố vừa tạo bị bộ lọc loại bỏ do chỉ khớp tiền tố `INC-` (không khớp `INC_`) và lỗi parse ngày có khoảng trắng. | Cập nhật `isTripMatch` chấp nhận cả 2 tiền tố và chuẩn hóa chuỗi ngày giờ ISO 8601. | `matches incident ID with both hyphen...` trong `pickupAccess.test.ts` |
| **ERR-09** | *Thuật toán ngưỡng* | `PickupAccessResolutionModal.tsx` | Nhầm lẫn logic ranh giới 500m giữa dắt bộ và xe trung chuyển. | Khóa chặt điều kiện: `< 500m` là dắt bộ, `≥ 500m` là xe trung chuyển. | `correctly calculates geodetic distance threshold...` |
| **ERR-10** | *Hiệu năng UI* | `PickupAccessResolutionMap.tsx` | Kéo thả marker trên bản đồ Leaflet bị giật lag do re-render React liên tục. | Bọc tính toán khoảng cách trong `requestAnimationFrame` throttle (60fps). | Verified mượt mà không frame drops |

---

## 4. Kế hoạch Kiểm thử & Nghiệm thu (Verification & Checkpoints)

### Phase 1: Backend Foundation & CSDL
- [x] Sửa lỗi cấu hình Fluent API `TripPlanConfiguration.cs`.
- [x] Thêm hàm truy vấn chuẩn hóa `QueryActivePickupIncidents`.
- [x] Thêm tối ưu `asNoTracking` cho các endpoint đọc.
- [x] Chạy kiểm thử: `dotnet test backend/tests/Flow1.Tests/Flow1.Tests.csproj --filter FullyQualifiedName~PickupAccessTests` (12/12 passed).

### Phase 2: Frontend Driver & Incident Triage
- [x] Đăng ký `PICKUP_ACCESS_BLOCKED` trong `driver.types.ts`, `driverRules.ts`, `driverApi.ts`.
- [x] Sửa hàm lọc `isTripMatch` và parse ngày trong `IncidentsPage.tsx`.
- [x] Tách component hiển thị lệnh điều phối [`PickupAccessOrderBanner.tsx`](file:///z:/phanmem/Racehorse-Transport-System/frontend/src/features/driver/components/PickupAccessOrderBanner.tsx).
- [x] Chạy kiểm thử: `npm run test:run src/features/driver/pickupAccess.test.ts` (5/5 passed).

### Phase 3: Coordinator & Customer Realtime Loop
- [x] Bản đồ Leaflet điều tiết mượt mà qua `requestAnimationFrame`.
- [x] Thẻ xác nhận phương án của Khách hàng phản hồi thời gian thực qua event channel.
- [x] Kiểm tra toàn bộ dự án: `npx tsc -p tsconfig.app.json --noEmit` (0 lỗi).
- [x] Toàn bộ test suite Vitest: `npm run test:run` (26 test files passed, 183 tests passed).
- [x] Biên dịch Production: `npm run build` và `dotnet build WebApi.csproj` (0 error).
