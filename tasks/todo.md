# Danh sách Task: Ngoại lệ Xe không vào được điểm lấy ngựa

## Task 1: Mở rộng CSDL & Migration bảng TRIP_PLAN & INCIDENT [ĐÃ HOÀN THÀNH]
**Description:** Bổ sung các trường dữ liệu theo dõi phương án tiếp cận điểm lấy ngựa, xe trung chuyển và điểm hẹn mới vào bảng `TRIP_PLAN` và bảng `INCIDENT`.
**Acceptance Criteria:**
- [x] Bảng `TRIP_PLAN` có thêm các cột:
  - `PickupAccessStatus VARCHAR(30) DEFAULT 'NORMAL'` (`NORMAL`, `BLOCKED`, `RELOCATING`, `SHUTTLING`, `RESOLVED`).
  - `RelocationMeetingPointName NVARCHAR(255) NULL`.
  - `RelocationLatitude DECIMAL(9,6) NULL`, `RelocationLongitude DECIMAL(9,6) NULL`.
  - `RelocationDistanceMeters INT NULL`.
  - `ShuttleVehicleId VARCHAR(50) NULL` (FK -> `VEHICLE`).
  - `ShuttleDriverId VARCHAR(50) NULL` (FK -> `[USER]`).
  - `ShuttleCostVnd DECIMAL(12,2) NULL DEFAULT 0`.
  - `CustomerApprovalStatus VARCHAR(20) NULL` (`PENDING`, `APPROVED`, `REJECTED`).
  - `CustomerApprovalAt DATETIME2 NULL`.
- [x] Model Entity C# `TripPlan.cs` & `TripPlanConfiguration.cs` được mapping chính xác với Fluent API (DeleteBehavior.Restrict, HasPrecision).
**Verification:**
- [x] Build backend: `dotnet build backend/WebApi/WebApi.csproj` thành công 0 error.
**Dependencies:** None

---

## Task 2: Backend API Xử lý Đề xuất & Xác nhận Ngoại lệ Điểm đón [ĐÃ HOÀN THÀNH]
**Description:** Xây dựng các endpoint cho phép Tài xế báo cản trở, Điều phối viên đề xuất phương án (<500m dắt bộ hoặc >=500m điều xe nhỏ), và Khách hàng phê duyệt.
**Acceptance Criteria:**
- [x] Endpoint `POST /api/driver/trips/{tripId}/pickup-access-blocked`: Nhận lý do, tọa độ xe hiện tại, ảnh vật cản. Tính khoảng cách từ xe đến cổng trang trại. Kích hoạt `SafetyBlockerActive = true`.
- [x] Endpoint `POST /api/coordinator/trips/{tripId}/pickup-access-resolution`:
  - Nhánh `<500m`: Nhận tọa độ điểm hẹn `RelocationLatitude`, `RelocationLongitude`, `MeetingPointName`, chi phí = 0.
  - Nhánh `>=500m`: Nhận `ShuttleVehicleId`, `ShuttleDriverId`, `ShuttleCostVnd`, ghi chú điều động.
- [x] Endpoint `POST /api/customer/trips/{tripId}/pickup-access-decision`: Khách hàng chọn Chấp thuận / Từ chối. Nếu Chấp thuận: Cập nhật `PickupAccessStatus = 'RESOLVED'`, gỡ bỏ Safety Blocker cho xe. Nếu từ chối: giữ nguyên Blocker.
**Verification:**
- [x] `dotnet build backend/WebApi/WebApi.csproj` thành công 0 error.
- [x] Viết Unit test trước (TDD) trong `PickupAccessTests.cs`: 9 tests kiểm tra toàn diện IDOR, Haversine distance, state machine, và Safety Blocker.
- [x] `dotnet test backend/tests/Flow1.Tests/` toàn bộ 247 tests (161 pass, 86 skip, 0 fail).
**Dependencies:** Task 1

---

## Checkpoint 1: Backend Foundation [ĐÃ HOÀN THÀNH]
- [x] Schema database đầy đủ các trường hỗ trợ tiếp cận điểm đón và xe trung chuyển.
- [x] 3 API endpoints (Báo cản trở - Đề xuất phương án - Khách hàng duyệt) hoạt động chuẩn HTTP 200, validate đúng nghiệp vụ.

---

## Task 3: Ứng dụng Tài xế (Driver App) - Báo cáo Cản trở & Nhận Lộ trình Mới [ĐÃ HOÀN THÀNH]
**Description:** Thêm chức năng cho Tài xế khi đến điểm đón nếu không vào được: Chụp ảnh hiện trường, hệ thống định vị khoảng cách, khóa chặng và nhận thông báo khi có điểm hẹn mới.
**Acceptance Criteria:**
- [x] Trên màn hình Hành trình (`driver/pages/journey/JourneyPage.tsx`): Có nút thao tác nhanh *"Không vào được điểm đón (Đường hẹp / Cấm tải)"*.
- [x] Form báo cáo (`PickupAccessBlockedModal.tsx`): Chọn lý do cản trở, tự động lấy GPS thiết bị qua `navigator.geolocation` và tính khoảng cách Haversine đến điểm đón gốc, chụp/tải ảnh hiện trường qua `PhotoPicker`.
- [x] Sau khi gửi: Gọi API `POST /api/driver/trips/{tripId}/pickup-access-blocked` qua `driverApi.ts`. Nút ghi mốc tạm thời bị khóa khi trạng thái là `BLOCKED` (Safety Blocker).
- [x] Hiển thị các thông báo trạng thái cập nhật: `RELOCATING` (dắt bộ), `SHUTTLING` (xe trung chuyển), và `RESOLVED` (mở khóa tiếp tục hành trình khi khách duyệt).
**Verification:**
- [x] TypeScript compile: `npx tsc -p tsconfig.app.json --noEmit` đạt 0 lỗi.
- [x] Vitest: 25/25 test files passed (178/178 tests passed).
**Dependencies:** Task 2

---

## Task 4: Dashboard Điều phối viên (Coordinator) - Điều phối Điểm hẹn hoặc Xe trung chuyển [ĐÃ HOÀN THÀNH]
**Description:** Xây dựng giao diện cho Điều phối viên xử lý ca sự cố tiếp cận điểm đón: Bản đồ tương tác bán kính 500m và form phân bổ xe trung chuyển.
**Acceptance Criteria:**
- [x] Trong `IncidentDetailPage.tsx` và `OverviewTab.tsx`: Tích hợp thẻ `PickupAccessCard` theo dõi trạng thái `BLOCKED`, `RELOCATING`, `SHUTTLING`, `RESOLVED`.
- [x] Tạo Component `PickupAccessResolutionModal.tsx`:
  - Bản đồ tương tác Leaflet `PickupAccessResolutionMap.tsx` hiển thị vòng tròn bán kính 500m quanh trang trại đón ngựa.
  - Cho phép click hoặc kéo thả marker để chọn điểm hẹn mới, tự động tính toán khoảng cách thực tế (mét).
  - Tự động gợi ý nhánh phù hợp: `< 500m` đề xuất dắt bộ (chi phí = 0 VNĐ); `>= 500m` đề xuất điều xe trung chuyển 2 chỗ.
  - Form chọn xe trung chuyển 2 chỗ từ kho xe sẵn sàng `db.vehicles`, chọn tài xế từ `db.employees`, nhập chi phí và ghi chú.
- [x] Nút *"Gửi phương án cho Khách hàng duyệt"*: Gọi API `POST /api/coordinator/trips/{tripId}/pickup-access-resolution` thông qua `pickupAccessApi.ts`.
- [x] Cập nhật store cục bộ và thông báo Toast khi hoàn tất.
**Verification:**
- [x] TypeScript compile: `npx tsc -p tsconfig.app.json --noEmit` đạt 0 lỗi.
- [x] Vitest: 25/25 test files passed (178/178 tests passed).
**Dependencies:** Task 2

---

## Task 5: Ứng dụng Khách hàng (Customer App) - Nhận Thông báo & Phê duyệt Phương án [ĐÃ HOÀN THÀNH]
**Description:** Khách hàng nhận cảnh báo xe lớn không vào được trang trại, xem bản đồ điểm hẹn dắt ngựa hoặc xác nhận chi phí điều xe trung chuyển.
**Acceptance Criteria:**
- [x] Tạo Component `CustomerRelocationCard.tsx` hiển thị thông báo đề xuất phương án:
  - Trường hợp Điểm hẹn (<500m): Hiển thị tên điểm hẹn, khoảng cách đi bộ, chi phí 0 VNĐ (miễn phí). Nút: *"Tôi đồng ý dắt ngựa ra điểm hẹn (Miễn phí)"*.
  - Trường hợp Xe trung chuyển (>=500m): Hiển thị thông tin xe nhỏ 2 chỗ, tài xế phụ trách và phụ phí trung chuyển. Nút: *"Đồng ý chi phí & Điều xe trung chuyển"*.
  - Trường hợp từ chối: Nút *"Từ chối phương án"* mở ô nhập lý do từ chối gửi lại Điều phối viên.
- [x] Gọi API `POST /api/customer/trips/{tripId}/pickup-access-decision` qua `customerApi.ts`.
- [x] Tích hợp thẻ thông báo vào cả `TrackingTab.tsx` và `OverviewTab.tsx` của trang chi tiết yêu cầu.
**Verification:**
- [x] TypeScript compile: `npx tsc -p tsconfig.app.json --noEmit` đạt 0 lỗi.
- [x] Vitest: 25/25 test files passed (178/178 tests passed).
**Dependencies:** Task 2, Task 4

---

## Checkpoint 2: Full Vertical Flow & Nghiệm thu toàn diện [ĐÃ HOÀN THÀNH]
- [x] Chạy kiểm thử tự động toàn dự án: `npm run test:run` pass 100% (26/26 test files, 181/181 tests).
- [x] Build production frontend: `npm run build` thành công 0 lỗi.
- [x] Kiểm thử E2E kịch bản hoàn chỉnh:
  1. Tài xế bấm báo không vào được điểm lấy ngựa (<500m hoặc >=500m).
  2. Điều phối viên nhận cảnh báo, chọn điểm hẹn trên bản đồ hoặc chọn xe nhỏ 2 chỗ.
  3. Khách hàng nhận thông báo, xem bản đồ hoặc xem phí và bấm duyệt.
  4. Lộ trình xe tài xế tự động cập nhật mốc đón ngựa mới và mở nút hoàn tất chặng.

---

## Task 6: Triage, Khắc phục 10 Lỗi & Tối ưu Hóa [ĐÃ HOÀN THÀNH]
**Description:** Rà soát, chẩn đoán nguyên nhân gốc rễ và xử lý triệt để toàn bộ 10 lỗi phát sinh trong luồng xử lý ngoại lệ điểm lấy ngựa.
**Acceptance Criteria:**
- [x] **ERR-01 (EF Core Type Mismatch):** Sửa default value `0m` cho `ShuttleCostVnd` trong `TripPlanConfiguration.cs`.
- [x] **ERR-02 (State Overwrite Bug):** Bảo lưu `priorResolution` trước khi gán `RESOLVED` trong `PickupAccessService.cs`.
- [x] **ERR-03 (Routing 404):** Bổ sung song song route tuyệt đối và tương đối trong `PickupAccessController.cs`.
- [x] **ERR-04 & ERR-05 (Security IDOR & Validation):** Kiểm tra quyền sở hữu đơn hàng, tài xế phân công, tọa độ hợp lệ và chi phí không âm.
- [x] **ERR-06 (Mã chuyến -/_ mismatch):** Chuẩn hóa so sánh mã chuyến trong `QueryActivePickupIncidents`.
- [x] **ERR-07 (Dropdown thiếu loại sự cố):** Bổ sung `PICKUP_ACCESS_BLOCKED` vào danh mục `driver.types.ts` và `driverRules.ts`.
- [x] **ERR-08 (Sự cố biến mất trên UI Tài xế):** Chuẩn hóa `isTripMatch` nhận cả `INC-` và `INC_`, fix parse ngày giờ ISO.
- [x] **ERR-09 (Ngưỡng 500m):** Đảm bảo chuyển đổi tự động chính xác giữa Dắt bộ (<500m) và Xe trung chuyển (>=500m).
- [x] **ERR-10 (Hiệu năng kéo thả Map):** Áp dụng `requestAnimationFrame` throttle chống giật lag khi drag marker.
- [x] **Tách Component tinh gọn:** Trích xuất [`PickupAccessOrderBanner.tsx`](file:///z:/phanmem/Racehorse-Transport-System/frontend/src/features/driver/components/PickupAccessOrderBanner.tsx) giúp `JourneyPage.tsx` giảm 90 dòng code.
**Verification:**
- [x] Backend tests: 12/12 passed (`dotnet test --filter FullyQualifiedName~PickupAccessTests`).
- [x] Frontend tests: 5/5 passed (`npm run test:run src/features/driver/pickupAccess.test.ts`).
- [x] Full Frontend suite: 26/26 files passed (183/183 tests).
- [x] Type checking: `npx tsc -p tsconfig.app.json --noEmit` đạt 0 lỗi.
- [x] Production build: `npm run build` và `dotnet build WebApi.csproj` thành công 100%.

