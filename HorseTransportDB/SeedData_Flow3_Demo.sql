-- =============================================================================
-- SCRIPT: SEED DATA DEMO FLOW 3 CHO ĐIỀU PHỐI VIÊN (COORDINATOR)
-- Dự án: Racehorse-Transport-System (SWP391)
--
-- Hướng dẫn thực thi:
-- Chỉ cần chạy 2 file SQL theo đúng thứ tự:
--   1. HorseTransportDB.sql
--   2. SeedData_Flow3_Demo.sql
-- Không cần thêm bất kỳ file SQL nào khác.
--
-- Nội dung thực hiện trong script:
-- 1. DỌN DẸP SẠCH SẼ các chuyến không hợp lệ: TRIP_015, TRIP_016, TRIP_017, TRIP_003, TRIP_014
--    và toàn bộ dữ liệu ràng buộc khóa ngoại (FK) liên quan.
-- 2. BỔ SUNG 6 NHÂN SỰ MỚI (1 Tài xế chính, 1 Phụ xe, 1 Bác sĩ thú y cho cả VN và Nhật Bản):
--    - Việt Nam: USER_025 (Tài xế), USER_026 (Phụ lái), USER_027 (Bác sĩ thú y)
--    - Nhật Bản: USER_JP_001 (Tài xế JP), USER_JP_002 (Phụ lái JP), USER_JP_003 (Bác sĩ thú y JP)
--    - Đầy đủ bằng lái xe quốc tế (DRIVING_LICENSE), chứng chỉ thú y FEI (VET_CERTIFICATE)
--      và hộ chiếu (PASSPORT) trong bảng STAFF_DOCUMENT.
-- 3. BỔ SUNG ĐỘI XE CHUYÊN DỤNG (VEHICLE) cho cả thị trường Việt Nam và Nhật Bản.
-- 4. BỔ SUNG 10 CÁ THỂ NGỰA ĐUA (HORSE_006 đến HORSE_015) kèm hồ sơ kiểm dịch thú y hợp lệ.
-- 5. BỔ SUNG ĐỐI TÁC HÀNG KHÔNG (AIR_PARTNER) và DANH MỤC CHUYẾN BAY (FLIGHT_CATALOG).
-- 6. TẠO 10 CHUYẾN ĐI MẪU HOÀN TOÀN MỚI Ở TRẠNG THÁI CHỜ ĐIỀU PHỐI VIÊN LẬP KẾ HOẠCH:
--    - 5 Chuyến ĐƯỜNG BỘ (ROAD): TRIP_020, TRIP_021, TRIP_022, TRIP_023, TRIP_024
--    - 5 Chuyến ĐƯỜNG HÀNG KHÔNG (AIR): TRIP_025, TRIP_026, TRIP_027, TRIP_028, TRIP_029
--    - Trạng thái chuẩn: Status = 'PLANNING', DeploymentStatus = 'CONFIRMED',
--      RouteStatus = 'DRAFT', OperationsStatus = 'NOT_READY', DocumentsStatus = 'READY',
--      Hợp đồng EFFECTIVE và Hóa đơn đặt cọc 40% PAID.
-- =============================================================================

USE HorseTransportDB;
GO

SET NOCOUNT ON;

PRINT N'=============================================================================';
PRINT N'>>> BẮT ĐẦU THỰC THI SCRIPT SEED DATA FLOW 3 (COORDINATOR DEMO)...';
PRINT N'=============================================================================';

-- =============================================================================
-- PHẦN 1: DỌN DẸP SẠCH CÁC CHUYẾN CŨ (TRIP_015, TRIP_016, TRIP_017, TRIP_003, TRIP_014)
-- =============================================================================
PRINT N'>>> [1/6] Đang dọn dẹp các chuyến đi TRIP_015, TRIP_016, TRIP_017, TRIP_003, TRIP_014 và bản ghi phụ thuộc...';

-- Tạm thời vô hiệu hóa các trigger kiểm soát sửa/xóa bất biến của Flow 6 để dọn dẹp an toàn
IF OBJECT_ID('TR_F6_HandoverRevisionImmutable', 'TR') IS NOT NULL
    ALTER TABLE HANDOVER_REVISION DISABLE TRIGGER TR_F6_HandoverRevisionImmutable;
IF OBJECT_ID('TR_F6_AdjustmentImmutable', 'TR') IS NOT NULL
    ALTER TABLE SETTLEMENT_ADJUSTMENT DISABLE TRIGGER TR_F6_AdjustmentImmutable;
IF OBJECT_ID('TR_F6_HandoverItemsLocked', 'TR') IS NOT NULL
    ALTER TABLE HANDOVER_ITEM DISABLE TRIGGER TR_F6_HandoverItemsLocked;

-- Danh sách Trip cần xóa (bao gồm cả các trip demo 020..029 để script có tính idempotent khi chạy lại)
DECLARE @TargetTrips TABLE (TripID VARCHAR(50) PRIMARY KEY);
INSERT INTO @TargetTrips (TripID) VALUES
('TRIP_015'), ('TRIP_016'), ('TRIP_017'), ('TRIP_003'), ('TRIP_014'),
('TRIP_020'), ('TRIP_021'), ('TRIP_022'), ('TRIP_023'), ('TRIP_024'),
('TRIP_025'), ('TRIP_026'), ('TRIP_027'), ('TRIP_028'), ('TRIP_029');

-- Danh sách Request tương ứng
DECLARE @TargetRequests TABLE (RequestID VARCHAR(50) PRIMARY KEY);
INSERT INTO @TargetRequests (RequestID)
SELECT DISTINCT RequestID FROM TRIP_PLAN WHERE TripID IN (SELECT TripID FROM @TargetTrips)
UNION SELECT 'REQUEST_003'
UNION SELECT 'REQUEST_014' UNION SELECT 'REQUEST_015' UNION SELECT 'REQUEST_016' UNION SELECT 'REQUEST_017'
UNION SELECT 'REQUEST_020' UNION SELECT 'REQUEST_021' UNION SELECT 'REQUEST_022' UNION SELECT 'REQUEST_023' UNION SELECT 'REQUEST_024'
UNION SELECT 'REQUEST_025' UNION SELECT 'REQUEST_026' UNION SELECT 'REQUEST_027' UNION SELECT 'REQUEST_028' UNION SELECT 'REQUEST_029';

-- Danh sách Contract tương ứng
DECLARE @TargetContracts TABLE (ContractID VARCHAR(50) PRIMARY KEY);
INSERT INTO @TargetContracts (ContractID)
SELECT ContractID FROM CONTRACT WHERE TripID IN (SELECT TripID FROM @TargetTrips)
UNION SELECT ContractID FROM CONTRACT WHERE RequestID IN (SELECT RequestID FROM @TargetRequests)
UNION SELECT 'CONTRACT_003'
UNION SELECT 'CONTRACT_020' UNION SELECT 'CONTRACT_021' UNION SELECT 'CONTRACT_022' UNION SELECT 'CONTRACT_023' UNION SELECT 'CONTRACT_024'
UNION SELECT 'CONTRACT_025' UNION SELECT 'CONTRACT_026' UNION SELECT 'CONTRACT_027' UNION SELECT 'CONTRACT_028' UNION SELECT 'CONTRACT_029';

-- Danh sách Settlement tương ứng
DECLARE @TargetSettlements TABLE (SettlementID VARCHAR(50) PRIMARY KEY);
INSERT INTO @TargetSettlements (SettlementID)
SELECT SettlementID FROM TRIP_SETTLEMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- 1. Xóa các bảng con thuộc Flow 6 (Quyết toán & Biên bản bàn giao)
DELETE FROM CUSTOMER_FEEDBACK WHERE SettlementID IN (SELECT SettlementID FROM @TargetSettlements);
DELETE FROM CUSTOMER_CASE WHERE SettlementID IN (SELECT SettlementID FROM @TargetSettlements);
DELETE FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID IN (SELECT SettlementID FROM @TargetSettlements);
DELETE FROM TRIP_SETTLEMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);

DELETE FROM HANDOVER_ITEM WHERE HandoverID IN (SELECT HandoverID FROM HANDOVER WHERE TripID IN (SELECT TripID FROM @TargetTrips));
DELETE FROM HANDOVER_REVISION WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM HANDOVER WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- 2. Xóa các bảng thuộc Flow 4 & Flow 5 (Tác nghiệp hiện trường, Sự cố, Giám sát sức khỏe)
DELETE FROM EXECUTION_ATTACHMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM EXECUTION_CONTACT_LOG WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM EXECUTION_ALERT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM LEGAL_CHECKPOINT_DECISION WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM AIR_NOTICE WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_EXPENSE WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM VET_ASSESSMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM HEALTH_LOG WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM INCIDENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM MILESTONE_CORRECTION_REQUEST WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM ETA_PROPOSAL WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_MILESTONE WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- 3. Xóa các bảng thuộc Flow 3 (Kế hoạch lộ trình, Phân công xe/kíp lái, Đặt chỗ chuyến bay, Thông quan)
DELETE FROM PLANNING_ATTACHMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_PLANNING_HISTORY WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM PICKUP_RELOCATION WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- Xóa CUSTOMS_CLEARANCE: đảm bảo không vi phạm FK_Customs_Segment (Msg 547)
-- Cần xóa tất cả các bản ghi hải quan thuộc các Trip cần xóa HOẶC trỏ tới các Segment của Trip cần xóa / Segment cần dọn
DELETE FROM CUSTOMS_CLEARANCE 
WHERE TripID IN (SELECT TripID FROM @TargetTrips)
   OR SegmentID IN (SELECT SegmentID FROM ROUTE_SEGMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips))
   OR SegmentID IN ('ROUTE_SEGMENT_006','ROUTE_SEGMENT_007','ROUTE_SEGMENT_010','ROUTE_SEGMENT_011','ROUTE_SEGMENT_012','ROUTE_SEGMENT_013','ROUTE_SEGMENT_014');

DELETE FROM FLIGHT_BOOKING WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- Xóa ROUTE_SEGMENT an toàn, triệt tiêu hoàn toàn ROUTE_SEGMENT_011 và các segment của target trips để tránh Msg 2627
DELETE FROM ROUTE_SEGMENT 
WHERE TripID IN (SELECT TripID FROM @TargetTrips)
   OR SegmentID IN ('ROUTE_SEGMENT_006','ROUTE_SEGMENT_007','ROUTE_SEGMENT_010','ROUTE_SEGMENT_011','ROUTE_SEGMENT_012','ROUTE_SEGMENT_013','ROUTE_SEGMENT_014');

DELETE FROM TRIP_VEHICLE_ASSIGNMENT WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM DOCUMENT_REQUEST WHERE TripID IN (SELECT TripID FROM @TargetTrips) OR RequestID IN (SELECT RequestID FROM @TargetRequests);
DELETE FROM SPECIALIST_AUDIT_LOG WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_CHECKPOINT_CLEARANCE WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_REQUIREMENT_SET WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_INSURANCE WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- 4. Xóa Hợp đồng, Hóa đơn và Thanh toán
DELETE FROM PAYMENT WHERE InvoiceID IN (SELECT InvoiceID FROM INVOICE WHERE ContractID IN (SELECT ContractID FROM @TargetContracts));
DELETE FROM INVOICE WHERE ContractID IN (SELECT ContractID FROM @TargetContracts);
DELETE FROM COST_ITEM WHERE ContractID IN (SELECT ContractID FROM @TargetContracts);

-- Gỡ bỏ tham chiếu vòng FK_Contract_CurrentVersion trước khi xóa CONTRACT_VERSION
UPDATE CONTRACT 
SET CurrentVersionNo = NULL 
WHERE TripID IN (SELECT TripID FROM @TargetTrips) 
   OR RequestID IN (SELECT RequestID FROM @TargetRequests)
   OR ContractID IN (SELECT ContractID FROM @TargetContracts);

DELETE FROM CONTRACT_VERSION WHERE ContractID IN (SELECT ContractID FROM @TargetContracts);

DELETE FROM CONTRACT 
WHERE TripID IN (SELECT TripID FROM @TargetTrips) 
   OR RequestID IN (SELECT RequestID FROM @TargetRequests)
   OR ContractID IN (SELECT ContractID FROM @TargetContracts);

-- 5. Xóa Thông báo liên quan
DELETE FROM NOTIFICATION WHERE ReferenceID IN (SELECT TripID FROM @TargetTrips);

-- 6. Xóa Chuyến đi TRIP_PLAN
DELETE FROM LEGAL_MEDICAL_RECORD WHERE TripID IN (SELECT TripID FROM @TargetTrips);
DELETE FROM TRIP_PLAN WHERE TripID IN (SELECT TripID FROM @TargetTrips);

-- 7. Xóa Đơn yêu cầu và ánh xạ ngựa
DELETE FROM LEGAL_MEDICAL_RECORD WHERE RequestID IN (SELECT RequestID FROM @TargetRequests)
                                    OR HorseID IN ('HORSE_006','HORSE_007','HORSE_008','HORSE_009','HORSE_010','HORSE_011','HORSE_012','HORSE_013','HORSE_014','HORSE_015');
DELETE FROM QUARANTINE_BOOKING WHERE RequestID IN (SELECT RequestID FROM @TargetRequests);
DELETE FROM REQUEST_HORSE_MAPPING WHERE RequestID IN (SELECT RequestID FROM @TargetRequests);
DELETE FROM TRANSPORT_REQUEST WHERE RequestID IN (SELECT RequestID FROM @TargetRequests);

-- Bật lại các trigger bảo vệ Flow 6
IF OBJECT_ID('TR_F6_HandoverRevisionImmutable', 'TR') IS NOT NULL
    ALTER TABLE HANDOVER_REVISION ENABLE TRIGGER TR_F6_HandoverRevisionImmutable;
IF OBJECT_ID('TR_F6_AdjustmentImmutable', 'TR') IS NOT NULL
    ALTER TABLE SETTLEMENT_ADJUSTMENT ENABLE TRIGGER TR_F6_AdjustmentImmutable;
IF OBJECT_ID('TR_F6_HandoverItemsLocked', 'TR') IS NOT NULL
    ALTER TABLE HANDOVER_ITEM ENABLE TRIGGER TR_F6_HandoverItemsLocked;

PRINT N' [OK] Đã dọn dẹp xong các chuyến đi và dữ liệu phụ thuộc.';
GO

-- =============================================================================
-- PHẦN 2: TẠO 6 NHÂN SỰ MỚI (TÀI XẾ, PHỤ LÁI, BÁC SĨ THÚ Y CHO VN VÀ JP)
-- =============================================================================
PRINT N'>>> [2/6] Đang khởi tạo 6 nhân sự mới (1 Tài xế, 1 Phụ xe, 1 Bác sĩ thú y cho cả VN và Nhật Bản)...';

-- Dọn dẹp hồ sơ giấy tờ cũ nếu đã tồn tại
DELETE FROM STAFF_DOCUMENT WHERE UserID IN ('USER_025', 'USER_026', 'USER_027', 'USER_JP_001', 'USER_JP_002', 'USER_JP_003');

-- 1. Tài xế chính Việt Nam (USER_025)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_025')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_025', 'driver_vn_minh', 'HASH_SECURE_25', 'DRIVER_ESCORT', N'Đặng Quang Minh (Tài xế chính VN)', 'minh.driver.vn@cbntransport.com', '0905557001', 1);
END;

-- 2. Phụ lái Việt Nam (USER_026)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_026')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_026', 'driver_vn_thang', 'HASH_SECURE_26', 'DRIVER_ESCORT', N'Trần Chiến Thắng (Phụ lái VN)', 'thang.codriver.vn@cbntransport.com', '0905557002', 1);
END;

-- 3. Bác sĩ thú y Việt Nam (USER_027)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_027')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_027', 'escort_vn_anhthu', 'HASH_SECURE_27', 'DRIVER_ESCORT', N'BS. Huỳnh Anh Thư (Bác sĩ thú y VN)', 'anhthu.vet.vn@cbntransport.com', '0285557003', 1);
END;

-- 4. Tài xế chính Nhật Bản (USER_JP_001)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_JP_001')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_JP_001', 'driver_jp_kenji', 'HASH_SECURE_JP01', 'DRIVER_ESCORT', N'Kenji Sato (Tài xế chính JP)', 'kenji.sato.jp@cbntransport.com', '09012345671', 1);
END;

-- 5. Phụ lái Nhật Bản (USER_JP_002)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_JP_002')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_JP_002', 'driver_jp_daiki', 'HASH_SECURE_JP02', 'DRIVER_ESCORT', N'Daiki Tanaka (Phụ lái JP)', 'daiki.tanaka.jp@cbntransport.com', '09012345672', 1);
END;

-- 6. Bác sĩ thú y Nhật Bản (USER_JP_003)
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USER_JP_003')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USER_JP_003', 'escort_jp_yuki', 'HASH_SECURE_JP03', 'DRIVER_ESCORT', N'Dr. Yuki Takahashi (Bác sĩ thú y JP)', 'yuki.takahashi.jp@cbntransport.com', '0355505673', 1);
END;

-- Bổ sung giấy tờ hành nghề, bằng lái FC/hạng nặng và hộ chiếu hợp lệ trong STAFF_DOCUMENT
INSERT INTO STAFF_DOCUMENT (DocumentID, UserID, DocType, CountryOfIssue, ValidForCountries, IssueDate, ExpiryDate, DocumentUrl, Status)
VALUES
-- VN Main Driver (USER_025)
('STAFF_DOC_025_LIC', 'USER_025', 'DRIVING_LICENSE', 'VN', N'VN', '2024-01-01', '2029-01-01', 'https://storage.cbntransport.com/docs/lic_minh.pdf', 'VALID'),
('STAFF_DOC_025_PAS', 'USER_025', 'PASSPORT', 'VN', N'VN, JP', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_minh.pdf', 'VALID'),
-- VN Co-Driver (USER_026)
('STAFF_DOC_026_LIC', 'USER_026', 'DRIVING_LICENSE', 'VN', N'VN', '2024-01-01', '2029-01-01', 'https://storage.cbntransport.com/docs/lic_thang.pdf', 'VALID'),
('STAFF_DOC_026_PAS', 'USER_026', 'PASSPORT', 'VN', N'VN, JP', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_thang.pdf', 'VALID'),
-- VN Vet (USER_027)
('STAFF_DOC_027_VET', 'USER_027', 'VET_CERTIFICATE', 'VN', N'VN, JP', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/vet_anhthu.pdf', 'VALID'),
('STAFF_DOC_027_PAS', 'USER_027', 'PASSPORT', 'VN', N'VN, JP', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_anhthu.pdf', 'VALID'),
-- JP Main Driver (USER_JP_001)
('STAFF_DOC_JP001_LIC', 'USER_JP_001', 'DRIVING_LICENSE', 'JPN', N'JP', '2024-01-01', '2029-01-01', 'https://storage.cbntransport.com/docs/lic_kenji.pdf', 'VALID'),
('STAFF_DOC_JP001_PAS', 'USER_JP_001', 'PASSPORT', 'JPN', N'JP, VN', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_kenji.pdf', 'VALID'),
-- JP Co-Driver (USER_JP_002)
('STAFF_DOC_JP002_LIC', 'USER_JP_002', 'DRIVING_LICENSE', 'JPN', N'JP', '2024-01-01', '2029-01-01', 'https://storage.cbntransport.com/docs/lic_daiki.pdf', 'VALID'),
('STAFF_DOC_JP002_PAS', 'USER_JP_002', 'PASSPORT', 'JPN', N'JP, VN', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_daiki.pdf', 'VALID'),
-- JP Vet (USER_JP_003)
('STAFF_DOC_JP003_VET', 'USER_JP_003', 'VET_CERTIFICATE', 'JPN', N'JP, VN', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/vet_yuki.pdf', 'VALID'),
('STAFF_DOC_JP003_PAS', 'USER_JP_003', 'PASSPORT', 'JPN', N'JP, VN', '2024-01-01', '2034-01-01', 'https://storage.cbntransport.com/docs/pass_yuki.pdf', 'VALID');

PRINT N' [OK] Đã tạo xong 6 nhân sự mới (3 VN, 3 JP) với đầy đủ giấy tờ hợp lệ.';
GO

-- =============================================================================
-- PHẦN 3: BỔ SUNG ĐỘI XE CHUYÊN DỤNG (VEHICLE) VN & JP
-- =============================================================================
PRINT N'>>> [3/6] Đang bổ sung phương tiện vận chuyển chuyên dụng (VEHICLE)...';

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_004')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_004', 'HORSEBOX_4_STALLS', 4, 1000.00, 35000.00, 'AVAILABLE', 'VN', '29C-999.11', 3.70, 2.48, 10.50, 14.00, 8.00);
END;

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_005')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_005', 'HORSEBOX_6_STALLS', 6, 1200.00, 45000.00, 'AVAILABLE', 'VN', '51D-234.56', 3.80, 2.50, 12.00, 18.00, 9.50);
END;

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_006')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_006', 'HORSEBOX_2_STALLS', 2, 800.00, 25000.00, 'AVAILABLE', 'VN', '43C-345.67', 3.20, 2.20, 7.50, 7.50, 4.50);
END;

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_007')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_007', 'HORSEBOX_4_STALLS', 4, 1000.00, 35000.00, 'AVAILABLE', 'VN', '65C-456.78', 3.70, 2.48, 10.50, 14.00, 8.00);
END;

-- Xe chuyên dụng tại Nhật Bản (cho chặng chuyển giao mặt đất từ sân bay Narita / Kansai về trang trại)
IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_JP_001')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_JP_001', 'HORSEBOX_4_STALLS', 4, 1000.00, 35000.00, 'AVAILABLE', 'JP', 'CHIBA-800-A-1122', 3.65, 2.45, 10.20, 13.50, 7.50);
END;

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEHICLE_JP_002')
BEGIN
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEHICLE_JP_002', 'HORSEBOX_4_STALLS', 4, 1000.00, 35000.00, 'AVAILABLE', 'JP', 'TOKYO-800-B-3344', 3.65, 2.45, 10.20, 13.50, 7.50);
END;

PRINT N' [OK] Đã bổ sung 6 xe chuyên dụng (4 xe VN, 2 xe JP).';
GO

-- =============================================================================
-- PHẦN 4: BỔ SUNG 10 CÁ THỂ NGỰA VÀ HỒ SƠ KIỂM DỊCH THÚ Y ĐẠT CHUẨN
-- =============================================================================
PRINT N'>>> [4/6] Đang khởi tạo 10 cá thể ngựa đua (HORSE_006 -> HORSE_015) và hồ sơ thú y...';

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_006')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_006', 'USER_001', '981098102938480', 'VN_FEI_2026_06', N'Hắc Long Mã (Black Dragon)', N'Thoroughbred', 'STALLION', 'INTACT', 530.00, '2020-03-10');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_007')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_007', 'USER_001', '981098102938481', 'VN_FEI_2026_07', N'Kim Kê Độc Lập (Golden Rooster)', N'Arabian', 'GELDING', 'GELDED', 490.00, '2021-05-15');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_008')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_008', 'USER_002', '981098102938482', 'VN_FEI_2026_08', N'Phi Vân (Flying Cloud)', N'Warmblood', 'MARE', 'NOT_PREGNANT', 515.00, '2020-08-20');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_009')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_009', 'USER_002', '981098102938483', 'VN_FEI_2026_09', N'Bạch Long Vĩ (White Dragon)', N'Thoroughbred', 'STALLION', 'INTACT', 540.00, '2019-11-12');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_010')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_010', 'USER_001', '981098102938484', 'VN_FEI_2026_10', N'Hồng Hạc (Flamingo)', N'Arabian', 'MARE', 'NOT_PREGNANT', 480.00, '2021-02-18');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_011')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_011', 'USER_001', '981098102938485', 'VN_FEI_2026_11', N'Bão Táp Tokyo (Tokyo Storm)', N'Thoroughbred', 'STALLION', 'INTACT', 525.00, '2020-07-04');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_012')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_012', 'USER_002', '981098102938486', 'VN_FEI_2026_12', N'Kansai Thunder (Sấm Sét Kansai)', N'Warmblood', 'GELDING', 'GELDED', 550.00, '2019-10-25');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_013')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_013', 'USER_001', '981098102938487', 'VN_FEI_2026_13', N'Sơn Trà Star (Ngôi Sao Sơn Trà)', N'Thoroughbred', 'MARE', 'NOT_PREGNANT', 495.00, '2021-04-30');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_014')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_014', 'USER_002', '981098102938488', 'VN_FEI_2026_14', N'Fukuoka Spirit (Tinh Thần Fukuoka)', N'Arabian', 'STALLION', 'INTACT', 510.00, '2020-09-14');

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HORSE_015')
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HORSE_015', 'USER_001', '981098102938489', 'VN_FEI_2026_15', N'Nagoya Knight (Hiệp Sĩ Nagoya)', N'Friesian', 'GELDING', 'GELDED', 565.00, '2018-12-01');

PRINT N' [OK] Đã tạo 10 cá thể ngựa đua (HORSE_006 -> HORSE_015).';
GO

-- =============================================================================
-- PHẦN 5: BỔ SUNG ĐỐI TÁC HÀNG KHÔNG VÀ LỊCH BAY (AIR_PARTNER & FLIGHT_CATALOG)
-- =============================================================================
PRINT N'>>> [5/6] Đang khởi tạo đối tác hàng không và lịch chuyến bay quốc tế...';

IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'AIR_PARTNER_001')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('AIR_PARTNER_001', N'Nippon Cargo Airlines (NCA)', 'JP', 'cargo@nca.aero', '+81355501001', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'AIR_PARTNER_002')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('AIR_PARTNER_002', N'Vietnam Airlines Cargo', 'VN', 'cargo@vietnamairlines.com', '02438320320', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'AIR_PARTNER_003')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('AIR_PARTNER_003', N'All Nippon Airways Cargo (ANA Cargo)', 'JP', 'cargo@ana.co.jp', '+81355501003', 'ACTIVE');

-- Danh mục lịch bay khả dụng cho Flow 3
DELETE FROM FLIGHT_CATALOG WHERE ServiceID IN ('SVC_FLIGHT_001', 'SVC_FLIGHT_002', 'SVC_FLIGHT_003', 'SVC_FLIGHT_004', 'SVC_FLIGHT_005');

INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive)
VALUES
('SVC_FLIGHT_001', 'AIR_PARTNER_001', 'KZ-102', N'NCA Airlines', 'FACILITY_001', 'FACILITY_002', '05:00', '12:00', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 120000000.00, 4, 'AIRLINE', 1, 1),
('SVC_FLIGHT_002', 'AIR_PARTNER_002', 'VN-300', N'Vietnam Airlines', 'FACILITY_003', 'FACILITY_002', '00:30', '07:30', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 115000000.00, 4, 'AIRLINE', 1, 1),
('SVC_FLIGHT_003', 'AIR_PARTNER_003', 'NH-8482', N'ANA Cargo', 'FACILITY_004', 'FACILITY_002', '06:00', '13:30', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 125000000.00, 4, 'AIRLINE', 1, 1),
('SVC_FLIGHT_004', 'AIR_PARTNER_002', 'VN-356', N'Vietnam Airlines', 'FACILITY_003', 'FACILITY_002', '01:15', '08:00', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 110000000.00, 4, 'AIRLINE', 1, 1),
('SVC_FLIGHT_005', 'AIR_PARTNER_001', 'KZ-204', N'NCA Airlines', 'FACILITY_001', 'FACILITY_002', '04:30', '11:45', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 118000000.00, 4, 'AIRLINE', 1, 1);

PRINT N' [OK] Đã khởi tạo danh mục lịch bay quốc tế (FLIGHT_CATALOG).';
GO

-- =============================================================================
-- PHẦN 6: TẠO 10 CHUYẾN ĐI MẪU MỚI (5 ĐƯỜNG BỘ ROAD, 5 ĐƯỜNG HÀNG KHÔNG AIR)
-- =============================================================================
PRINT N'>>> [6/6] Đang khởi tạo 10 chuyến đi mới (5 Road, 5 Air) sẵn sàng cho Coordinator lập kế hoạch...';

-- -----------------------------------------------------------------------------
-- 6.1. NĂM (5) CHUYẾN ĐƯỜNG BỘ (ROAD - NỘI ĐỊA VIỆT NAM)
-- -----------------------------------------------------------------------------

-- [1/10] TRIP_020: Tuyến Hà Nội -> Vinh (Nghệ An)
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_020', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'CLB Ngựa Lam Giang, TP. Vinh, Nghệ An', N'Tham dự hội thao biểu diễn ngựa Lam Giang 2026', 'ROAD', DATEADD(DAY, 4, GETDATE()), DATEADD(DAY, 7, GETDATE()), N'Phan Đình Phùng', '0912111222', 48000000.00, 'SCHEDULED', 'VN', 'VN', 3, N'Nguyễn Văn A', '0901234567', 21.200000, 105.800000, 18.670000, 105.680000, 310.00, 120000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_020', 'REQUEST_020', 'HORSE_006');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_020', 'REQUEST_020', 310.00, 6.50, 48000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã duyệt, cọc 40% đã thanh toán; bàn giao Điều phối viên lập tuyến đường bộ Hà Nội - Vinh.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_020', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Hồ sơ thú y nội địa đầy đủ, ngựa đủ điều kiện xuất phát.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_020', 'TRIP_020', 'REQUEST_020', 'USER_001', 'VND', 48000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_020_v1.pdf', 19200000.00, DATEADD(DAY, 15, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_020', 1, 'SIGNED', N'{"contractId":"CONTRACT_020","status":"SIGNED","depositAmount":19200000.00}', 'private/demo/contract_020_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_020', 'CONTRACT_020', 1, 'DEPOSIT', 'VND', 19200000.00, 19200000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_020', 'INVOICE_020', 'VND', 19200000.00, 'VNPAY', 'VNPAY_DEMO_020', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_020', 'USER_006', 'TRIP_020', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Đường bộ)', N'Chuyến TRIP_020 (Hà Nội -> Vinh) đã hoàn tất thủ tục bàn giao. Vui lòng lập lộ trình và bố trí xe/kíp lái.', 0, SYSUTCDATETIME());

-- [2/10] TRIP_021: Tuyến Hà Nội -> Đà Nẵng
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_021', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trung tâm tiếp nhận ngựa Sơn Trà, Đà Nẵng', N'Chuyển nhượng huấn luyện ngựa đua miền Trung', 'ROAD', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 8, GETDATE()), N'Hoàng Nam Sơn', '0913222333', 85000000.00, 'SCHEDULED', 'VN', 'VN', 3, N'Nguyễn Văn A', '0901234567', 21.200000, 105.800000, 16.050000, 108.200000, 760.00, 200000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_021', 'REQUEST_021', 'HORSE_007');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_021', 'REQUEST_021', 760.00, 16.00, 85000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã duyệt, cọc 40% đã thanh toán; bàn giao Điều phối viên lập tuyến đường bộ Hà Nội - Đà Nẵng.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_021', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Kim Kê Độc Lập sức khỏe tốt, hồ sơ thú y sẵn sàng.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_021', 'TRIP_021', 'REQUEST_021', 'USER_001', 'VND', 85000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_021_v1.pdf', 34000000.00, DATEADD(DAY, 15, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_021', 1, 'SIGNED', N'{"contractId":"CONTRACT_021","status":"SIGNED","depositAmount":34000000.00}', 'private/demo/contract_021_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_021', 'CONTRACT_021', 1, 'DEPOSIT', 'VND', 34000000.00, 34000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_021', 'INVOICE_021', 'VND', 34000000.00, 'VNPAY', 'VNPAY_DEMO_021', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_021', 'USER_006', 'TRIP_021', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Đường bộ)', N'Chuyến TRIP_021 (Hà Nội -> Đà Nẵng) đã hoàn tất thủ tục bàn giao. Vui lòng lập kế hoạch tuyến đường.', 0, SYSUTCDATETIME());

-- [3/10] TRIP_022: Tuyến TP.HCM -> Cần Thơ (Đồng bằng sông Cửu Long)
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_022', 'USER_002', N'Trại ngựa Củ Chi, TP.HCM', N'Trại huấn luyện ngựa Cái Răng, Cần Thơ', N'Vận chuyển thi đấu giao hữu Tây Nam Bộ', 'ROAD', DATEADD(DAY, 4, GETDATE()), DATEADD(DAY, 6, GETDATE()), N'Lâm Minh Triết', '0914333444', 35000000.00, 'SCHEDULED', 'VN', 'VN', 3, N'Trần Văn B', '0908889999', 10.970000, 106.500000, 10.030000, 105.780000, 180.00, 150000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_022', 'REQUEST_022', 'HORSE_008');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_022', 'REQUEST_022', 180.00, 4.00, 35000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã duyệt, cọc 40% đã thanh toán; bàn giao Điều phối viên lập tuyến TP.HCM - Cần Thơ.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_022', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Phi Vân đạt chuẩn sức khỏe kiểm dịch.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_022', 'TRIP_022', 'REQUEST_022', 'USER_002', 'VND', 35000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_022_v1.pdf', 14000000.00, DATEADD(DAY, 15, GETDATE()), 'tranb.racing@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_022', 1, 'SIGNED', N'{"contractId":"CONTRACT_022","status":"SIGNED","depositAmount":14000000.00}', 'private/demo/contract_022_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'tranb.racing@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_022', 'CONTRACT_022', 1, 'DEPOSIT', 'VND', 14000000.00, 14000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_022', 'INVOICE_022', 'VND', 14000000.00, 'VNPAY', 'VNPAY_DEMO_022', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_022', 'USER_006', 'TRIP_022', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Đường bộ)', N'Chuyến TRIP_022 (TP.HCM -> Cần Thơ) đã sẵn sàng lập kế hoạch phương án tuyến.', 0, SYSUTCDATETIME());

-- [4/10] TRIP_023: Tuyến Đà Nẵng -> Quy Nhơn (Bình Định)
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_023', 'USER_002', N'Trung tâm tiếp nhận Đà Nẵng', N'Khu bảo tồn ngựa An Nhơn, Bình Định', N'Di chuyển đàn ngựa đua phục vụ giải duyên hải', 'ROAD', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 7, GETDATE()), N'Nguyễn Tấn Đạt', '0915444555', 50000000.00, 'SCHEDULED', 'VN', 'VN', 3, N'Trần Văn B', '0908889999', 16.050000, 108.200000, 13.880000, 109.110000, 320.00, 180000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_023', 'REQUEST_023', 'HORSE_009');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_023', 'REQUEST_023', 320.00, 7.00, 50000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã duyệt, cọc 40% đã thanh toán; bàn giao Điều phối viên lập tuyến Đà Nẵng - Quy Nhơn.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_023', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Bạch Long Vĩ đạt chuẩn thể trạng thi đấu.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_023', 'TRIP_023', 'REQUEST_023', 'USER_002', 'VND', 50000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_023_v1.pdf', 20000000.00, DATEADD(DAY, 15, GETDATE()), 'tranb.racing@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_023', 1, 'SIGNED', N'{"contractId":"CONTRACT_023","status":"SIGNED","depositAmount":20000000.00}', 'private/demo/contract_023_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'tranb.racing@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_023', 'CONTRACT_023', 1, 'DEPOSIT', 'VND', 20000000.00, 20000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_023', 'INVOICE_023', 'VND', 20000000.00, 'VNPAY', 'VNPAY_DEMO_023', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_023', 'USER_006', 'TRIP_023', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Đường bộ)', N'Chuyến TRIP_023 (Đà Nẵng -> Quy Nhơn) đã bàn giao triển khai Flow 3.', 0, SYSUTCDATETIME());

-- [5/10] TRIP_024: Tuyến TP.HCM -> Đà Lạt (Lâm Đồng)
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_024', 'USER_001', N'Trại ngựa Phú Thọ, TP.HCM', N'Trang trại Đua ngựa Thung Lũng Vàng, Đà Lạt', N'Huấn luyện độ cao và khí hậu ôn đới', 'ROAD', DATEADD(DAY, 6, GETDATE()), DATEADD(DAY, 9, GETDATE()), N'Vũ Hoàng Anh', '0916555666', 52000000.00, 'SCHEDULED', 'VN', 'VN', 3, N'Nguyễn Văn A', '0901234567', 10.770000, 106.660000, 11.980000, 108.420000, 310.00, 160000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_024', 'REQUEST_024', 'HORSE_010');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_024', 'REQUEST_024', 310.00, 7.50, 52000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã duyệt, cọc 40% đã thanh toán; bàn giao Điều phối viên lập tuyến đường đèo TP.HCM - Đà Lạt.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_024', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Hồng Hạc đủ điều kiện vận chuyển đèo dốc.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_024', 'TRIP_024', 'REQUEST_024', 'USER_001', 'VND', 52000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_024_v1.pdf', 20800000.00, DATEADD(DAY, 15, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_024', 1, 'SIGNED', N'{"contractId":"CONTRACT_024","status":"SIGNED","depositAmount":20800000.00}', 'private/demo/contract_024_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_024', 'CONTRACT_024', 1, 'DEPOSIT', 'VND', 20800000.00, 20800000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_024', 'INVOICE_024', 'VND', 20800000.00, 'VNPAY', 'VNPAY_DEMO_024', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_024', 'USER_006', 'TRIP_024', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Đường bộ)', N'Chuyến TRIP_024 (TP.HCM -> Đà Lạt) đã được bàn giao cho bạn lập lộ trình.', 0, SYSUTCDATETIME());

-- -----------------------------------------------------------------------------
-- 6.2. NĂM (5) CHUYẾN ĐƯỜNG HÀNG KHÔNG (AIR - QUỐC TẾ VIỆT NAM -> NHẬT BẢN)
-- -----------------------------------------------------------------------------

-- [6/10] TRIP_025: Tuyến Hà Nội (HAN) -> Tokyo / Narita (NRT), Nhật Bản
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_025', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trung tâm huấn luyện JRA Miho, Narita, Nhật Bản', N'Tham dự Cúp Đua Ngựa Mùa Thu Tokyo JRA 2026', 'AIR', DATEADD(DAY, 7, GETDATE()), DATEADD(DAY, 11, GETDATE()), N'Kenji Sato', '+819012345671', 220000000.00, 'SCHEDULED', 'VN', 'JP', 7, N'Nguyễn Văn A', '0901234567', 21.200000, 105.800000, 35.770000, 140.380000, 4500.00, 350000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_025', 'REQUEST_025', 'HORSE_011');

INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status)
VALUES ('QB_025', 'REQUEST_025', 'FACILITY_002', N'Trạm thú y tiếp nhận Narita', N'Nhật Bản', DATEADD(DAY, 8, GETDATE()), DATEADD(DAY, 9, GETDATE()), 'CFM_DEMO_025', 'CONFIRMED');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_025', 'REQUEST_025', 4500.00, 48.00, 220000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Hợp đồng quốc tế đã ký & cọc đã thanh toán; bàn giao Điều phối viên đặt chỗ bay và phân công tổ xe 2 đầu VN/JP.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_025', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Hồ sơ Coggins, Equine Flu và kiểm dịch xuất cảnh sang Nhật Bản đã hoàn tất.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_025', 'TRIP_025', 'REQUEST_025', 'USER_001', 'VND', 220000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_025_v1.pdf', 88000000.00, DATEADD(DAY, 20, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_025', 1, 'SIGNED', N'{"contractId":"CONTRACT_025","status":"SIGNED","depositAmount":88000000.00}', 'private/demo/contract_025_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_025', 'CONTRACT_025', 1, 'DEPOSIT', 'VND', 88000000.00, 88000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_025', 'INVOICE_025', 'VND', 88000000.00, 'VNPAY', 'VNPAY_DEMO_025', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_025', 'USER_006', 'TRIP_025', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Hàng không quốc tế)', N'Chuyến TRIP_025 (Hà Nội -> Tokyo/Narita) đã sẵn sàng lập phương án bay và điều phối nhân sự.', 0, SYSUTCDATETIME());

-- [7/10] TRIP_026: Tuyến TP.HCM (SGN) -> Osaka / Kansai (KIX), Nhật Bản
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_026', 'USER_002', N'Trại ngựa Củ Chi, TP.HCM', N'Trung tâm tiếp nhận ngựa Hanshin, Osaka, Nhật Bản', N'Chuyển giao cá thể thuần chủng phối giống Hanshin', 'AIR', DATEADD(DAY, 8, GETDATE()), DATEADD(DAY, 12, GETDATE()), N'Takashi Yamamoto', '+81661234567', 215000000.00, 'SCHEDULED', 'VN', 'JP', 7, N'Trần Văn B', '0908889999', 10.970000, 106.500000, 34.430000, 135.240000, 4200.00, 300000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_026', 'REQUEST_026', 'HORSE_012');

INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status)
VALUES ('QB_026', 'REQUEST_026', 'FACILITY_002', N'Trạm thú y tiếp nhận Kansai', N'Nhật Bản', DATEADD(DAY, 9, GETDATE()), DATEADD(DAY, 10, GETDATE()), 'CFM_DEMO_026', 'CONFIRMED');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_026', 'REQUEST_026', 4200.00, 46.00, 215000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Hợp đồng hàng không đã ký & cọc thanh toán; bàn giao Điều phối viên lập kế hoạch chặng bay Tân Sơn Nhất - Kansai.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_026', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Hồ sơ thú y xuất cảnh Kansai đã thẩm định đạt chuẩn quốc tế.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_026', 'TRIP_026', 'REQUEST_026', 'USER_002', 'VND', 215000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_026_v1.pdf', 86000000.00, DATEADD(DAY, 20, GETDATE()), 'tranb.racing@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_026', 1, 'SIGNED', N'{"contractId":"CONTRACT_026","status":"SIGNED","depositAmount":86000000.00}', 'private/demo/contract_026_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'tranb.racing@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_026', 'CONTRACT_026', 1, 'DEPOSIT', 'VND', 86000000.00, 86000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_026', 'INVOICE_026', 'VND', 86000000.00, 'VNPAY', 'VNPAY_DEMO_026', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_026', 'USER_006', 'TRIP_026', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Hàng không quốc tế)', N'Chuyến TRIP_026 (TP.HCM -> Osaka/Kansai) đã bàn giao triển khai Flow 3.', 0, SYSUTCDATETIME());

-- [8/10] TRIP_027: Tuyến Đà Nẵng (DAD) -> Tokyo / Haneda (HND), Nhật Bản
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_027', 'USER_001', N'Trung tâm tiếp nhận Đà Nẵng', N'CLB Đua ngựa Hoàng gia Tokyo, Nhật Bản', N'Giao lưu hữu nghị đua ngựa quốc tế Tokyo', 'AIR', DATEADD(DAY, 9, GETDATE()), DATEADD(DAY, 13, GETDATE()), N'Dr. Yuki Takahashi', '+81355505673', 225000000.00, 'SCHEDULED', 'VN', 'JP', 7, N'Nguyễn Văn A', '0901234567', 16.050000, 108.200000, 35.540000, 139.780000, 4350.00, 280000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_027', 'REQUEST_027', 'HORSE_013');

INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status)
VALUES ('QB_027', 'REQUEST_027', 'FACILITY_002', N'Trạm thú y tiếp nhận Haneda', N'Nhật Bản', DATEADD(DAY, 10, GETDATE()), DATEADD(DAY, 11, GETDATE()), 'CFM_DEMO_027', 'CONFIRMED');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_027', 'REQUEST_027', 4350.00, 48.00, 225000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn hàng hoàn tất thủ tục cọc; bàn giao Điều phối viên lập phương án bay Đà Nẵng - Haneda.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_027', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Sơn Trà Star đủ tiêu chuẩn kiểm dịch quốc tế.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_027', 'TRIP_027', 'REQUEST_027', 'USER_001', 'VND', 225000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_027_v1.pdf', 90000000.00, DATEADD(DAY, 20, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_027', 1, 'SIGNED', N'{"contractId":"CONTRACT_027","status":"SIGNED","depositAmount":90000000.00}', 'private/demo/contract_027_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_027', 'CONTRACT_027', 1, 'DEPOSIT', 'VND', 90000000.00, 90000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_027', 'INVOICE_027', 'VND', 90000000.00, 'VNPAY', 'VNPAY_DEMO_027', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_027', 'USER_006', 'TRIP_027', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Hàng không quốc tế)', N'Chuyến TRIP_027 (Đà Nẵng -> Tokyo/Haneda) đã bàn giao triển khai.', 0, SYSUTCDATETIME());

-- [9/10] TRIP_028: Tuyến TP.HCM (SGN) -> Fukuoka (FUK), Nhật Bản
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_028', 'USER_002', N'Trại ngựa Củ Chi, TP.HCM', N'Trang trại ngựa giống Kyushu, Fukuoka, Nhật Bản', N'Vận chuyển chuyển nhượng ngựa đua Fukuoka', 'AIR', DATEADD(DAY, 8, GETDATE()), DATEADD(DAY, 12, GETDATE()), N'Daiki Tanaka', '+819012345672', 195000000.00, 'SCHEDULED', 'VN', 'JP', 7, N'Trần Văn B', '0908889999', 10.970000, 106.500000, 33.580000, 130.450000, 3800.00, 250000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_028', 'REQUEST_028', 'HORSE_014');

INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status)
VALUES ('QB_028', 'REQUEST_028', 'FACILITY_002', N'Trạm thú y tiếp nhận Fukuoka', N'Nhật Bản', DATEADD(DAY, 9, GETDATE()), DATEADD(DAY, 10, GETDATE()), 'CFM_DEMO_028', 'CONFIRMED');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_028', 'REQUEST_028', 3800.00, 44.00, 195000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu quốc tế đã hoàn tất; bàn giao Điều phối viên đặt chuyến bay Tân Sơn Nhất - Fukuoka.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_028', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Hồ sơ thú y xét nghiệm Fukuoka đầy đủ hợp lệ.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_028', 'TRIP_028', 'REQUEST_028', 'USER_002', 'VND', 195000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_028_v1.pdf', 78000000.00, DATEADD(DAY, 20, GETDATE()), 'tranb.racing@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_028', 1, 'SIGNED', N'{"contractId":"CONTRACT_028","status":"SIGNED","depositAmount":78000000.00}', 'private/demo/contract_028_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'tranb.racing@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_028', 'CONTRACT_028', 1, 'DEPOSIT', 'VND', 78000000.00, 78000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_028', 'INVOICE_028', 'VND', 78000000.00, 'VNPAY', 'VNPAY_DEMO_028', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_028', 'USER_006', 'TRIP_028', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Hàng không quốc tế)', N'Chuyến TRIP_028 (TP.HCM -> Fukuoka) đã bàn giao triển khai Flow 3.', 0, SYSUTCDATETIME());

-- [10/10] TRIP_029: Tuyến Hà Nội (HAN) -> Nagoya / Chubu (NGO), Nhật Bản
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd)
VALUES ('REQUEST_029', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trung tâm huấn luyện Chukyo, Nagoya, Nhật Bản', N'Huấn luyện thi đấu cúp Chukyo Nhật Bản', 'AIR', DATEADD(DAY, 9, GETDATE()), DATEADD(DAY, 13, GETDATE()), N'Shinji Kagawa', '+81521234567', 210000000.00, 'SCHEDULED', 'VN', 'JP', 7, N'Nguyễn Văn A', '0901234567', 21.200000, 105.800000, 34.850000, 136.810000, 4100.00, 320000000.00);

INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES ('RHM_029', 'REQUEST_029', 'HORSE_015');

INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status)
VALUES ('QB_029', 'REQUEST_029', 'FACILITY_002', N'Trạm thú y tiếp nhận Chubu/Nagoya', N'Nhật Bản', DATEADD(DAY, 10, GETDATE()), DATEADD(DAY, 11, GETDATE()), 'CFM_DEMO_029', 'CONFIRMED');

INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, ExecutionVersion, ContextVersion, PlanVersion, ReadinessVersion, OpenChange, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId, OperationsStatus, DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy, CurrentRouteVersion, RouteStatus)
VALUES ('TRIP_029', 'REQUEST_029', 4100.00, 45.00, 210000000.00, 'PLANNING', 1, 1, 1, 1, 0, 'CONFIRMED', N'Đơn yêu cầu đã hoàn tất; bàn giao Điều phối viên đặt chỗ chuyến bay Nội Bài - Nagoya.', 'USER_004', DATEADD(HOUR, -3, SYSUTCDATETIME()), 'HANDOFF_EVENT_029', 'USER_005', 'USER_006', 'NOT_READY', 'READY', DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 60, GETDATE()), N'Ngựa Nagoya Knight đủ điều kiện xuất cảnh Nhật Bản.', DATEADD(HOUR, -4, SYSUTCDATETIME()), N'Lê Tuấn (Specialist)', 1, 'DRAFT');

INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail)
VALUES ('CONTRACT_029', 'TRIP_029', 'REQUEST_029', 'USER_001', 'VND', 210000000.00, 40.00, DATEADD(DAY, -1, GETDATE()), 'EFFECTIVE', DATEADD(DAY, -2, GETDATE()), 'USER_004', 'private/demo/contract_029_v1.pdf', 84000000.00, DATEADD(DAY, 20, GETDATE()), 'vana.horse@gmail.com');

INSERT INTO CONTRACT_VERSION (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl, CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
VALUES ('CONTRACT_029', 1, 'SIGNED', N'{"contractId":"CONTRACT_029","status":"SIGNED","depositAmount":84000000.00}', 'private/demo/contract_029_v1.pdf', 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), 'USER_004', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'vana.horse@gmail.com');

INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus)
VALUES ('INVOICE_029', 'CONTRACT_029', 1, 'DEPOSIT', 'VND', 84000000.00, 84000000.00, DATEADD(DAY, 2, GETDATE()), 'PAID');

INSERT INTO PAYMENT (PaymentID, InvoiceID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate)
VALUES ('PAYMENT_029', 'INVOICE_029', 'VND', 84000000.00, 'VNPAY', 'VNPAY_DEMO_029', 'SUCCESS', DATEADD(DAY, -1, GETDATE()));

INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt)
VALUES ('NOTIF_029', 'USER_006', 'TRIP_029', 'TRIP_ASSIGN', 'WEB_ALERT', N'Chuyến đi mới cần lập kế hoạch (Hàng không quốc tế)', N'Chuyến TRIP_029 (Hà Nội -> Nagoya) đã bàn giao triển khai Flow 3.', 0, SYSUTCDATETIME());

-- Bổ sung hồ sơ kiểm dịch thú y hợp lệ (LEGAL_MEDICAL_RECORD) gắn liền với từng Request và Trip
INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, TripID, VerifiedBy, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl, ExpiryDate)
VALUES
('LMR_020_COG', 'HORSE_006', 'REQUEST_020', 'TRIP_020', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs6.pdf', '2027-06-30'),
('LMR_020_FLU', 'HORSE_006', 'REQUEST_020', 'TRIP_020', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs6.pdf', '2027-06-30'),

('LMR_021_COG', 'HORSE_007', 'REQUEST_021', 'TRIP_021', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs7.pdf', '2027-06-30'),
('LMR_021_FLU', 'HORSE_007', 'REQUEST_021', 'TRIP_021', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs7.pdf', '2027-06-30'),

('LMR_022_COG', 'HORSE_008', 'REQUEST_022', 'TRIP_022', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs8.pdf', '2027-06-30'),
('LMR_022_FLU', 'HORSE_008', 'REQUEST_022', 'TRIP_022', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs8.pdf', '2027-06-30'),

('LMR_023_COG', 'HORSE_009', 'REQUEST_023', 'TRIP_023', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs9.pdf', '2027-06-30'),
('LMR_023_FLU', 'HORSE_009', 'REQUEST_023', 'TRIP_023', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs9.pdf', '2027-06-30'),

('LMR_024_COG', 'HORSE_010', 'REQUEST_024', 'TRIP_024', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs10.pdf', '2027-06-30'),
('LMR_024_FLU', 'HORSE_010', 'REQUEST_024', 'TRIP_024', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs10.pdf', '2027-06-30'),

('LMR_025_COG', 'HORSE_011', 'REQUEST_025', 'TRIP_025', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs11.pdf', '2027-06-30'),
('LMR_025_FLU', 'HORSE_011', 'REQUEST_025', 'TRIP_025', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs11.pdf', '2027-06-30'),

('LMR_026_COG', 'HORSE_012', 'REQUEST_026', 'TRIP_026', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs12.pdf', '2027-06-30'),
('LMR_026_FLU', 'HORSE_012', 'REQUEST_026', 'TRIP_026', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs12.pdf', '2027-06-30'),

('LMR_027_COG', 'HORSE_013', 'REQUEST_027', 'TRIP_027', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs13.pdf', '2027-06-30'),
('LMR_027_FLU', 'HORSE_013', 'REQUEST_027', 'TRIP_027', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs13.pdf', '2027-06-30'),

('LMR_028_COG', 'HORSE_014', 'REQUEST_028', 'TRIP_028', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs14.pdf', '2027-06-30'),
('LMR_028_FLU', 'HORSE_014', 'REQUEST_028', 'TRIP_028', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs14.pdf', '2027-06-30'),

('LMR_029_COG', 'HORSE_015', 'REQUEST_029', 'TRIP_029', 'USER_005', 'COGGINS_TEST', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/coggins_hrs15.pdf', '2027-06-30'),
('LMR_029_FLU', 'HORSE_015', 'REQUEST_029', 'TRIP_029', 'USER_005', 'EQUINE_FLU_VAX', 'COMPLETED', 'APPROVED', 'https://storage.cbntransport.com/docs/flu_hrs15.pdf', '2027-06-30');

PRINT N' [OK] Đã tạo thành công 10 chuyến đi mới (TRIP_020 đến TRIP_029)!';

PRINT N'=============================================================================';
PRINT N'>>> HOÀN TẤT THỰC THI SCRIPT SEED DATA FLOW 3!';
PRINT N'    1. Đã dọn dẹp các chuyến lỗi: TRIP_015, TRIP_016, TRIP_017, TRIP_003, TRIP_014';
PRINT N'    2. Đã tạo 6 nhân sự mới (3 VN, 3 JP):';
PRINT N'       - VN: USER_025 (Tài xế), USER_026 (Phụ lái), USER_027 (Bác sĩ thú y)';
PRINT N'       - JP: USER_JP_001 (Tài xế JP), USER_JP_002 (Phụ lái JP), USER_JP_003 (Bác sĩ thú y JP)';
PRINT N'    3. Đã bổ sung 6 xe chuyên dụng (4 VN, 2 JP) và 10 ngựa (HORSE_006..015)';
PRINT N'    4. Đã tạo 10 chuyến đi hoàn toàn mới ở trạng thái chờ Coordinator lập kế hoạch:';
PRINT N'       - 5 Đường bộ (ROAD): TRIP_020, TRIP_021, TRIP_022, TRIP_023, TRIP_024';
PRINT N'       - 5 Hàng không (AIR): TRIP_025, TRIP_026, TRIP_027, TRIP_028, TRIP_029';
PRINT N'       - Tất cả đều ở trạng thái: PLANNING | Deployment: CONFIRMED | Route: DRAFT';
PRINT N'=============================================================================';
GO
