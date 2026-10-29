-- =============================================================================
-- SCRIPT: TẠO DỮ LIỆU DEMO FLOW 3 CHO ĐIỀU PHỐI VIÊN (COORDINATOR)
-- Mô tả: Tạo 1 đơn yêu cầu vận chuyển xuyên biên giới (Hà Nội -> Bangkok)
--       đã hoàn tất ký hợp đồng, đã đóng tiền cọc, Quản lý (Manager) đã duyệt
--       và bàn giao triển khai. Chuyến đi đang ở trạng thái PLANNING,
--       CHỈ CHỜ COORDINATOR LẬP LỘ TRÌNH VÀ PHÂN CÔNG XE / TÀI XẾ.
-- =============================================================================

USE HorseTransportDB;
GO

SET NOCOUNT ON;

PRINT N'>>> BẮT ĐẦU KHỞI TẠO DỮ LIỆU DEMO FLOW 3 (COORDINATOR)...';

-- -----------------------------------------------------------------------------
-- 0. DỌN DẸP DỮ LIỆU CŨ NẾU ĐÃ CHẠY TRƯỚC ĐÓ (ĐẢM BẢO CHẠY LẠI KHÔNG BỊ TRÙNG KHÓA)
-- -----------------------------------------------------------------------------
DELETE FROM INVOICE WHERE ContractID = 'CTR_2026_004';
DELETE FROM CONTRACT_VERSION WHERE ContractID = 'CTR_2026_004';
DELETE FROM CONTRACT WHERE ContractID = 'CTR_2026_004';
DELETE FROM TRIP_PLAN WHERE TripID = 'TRIP_2026_006';
DELETE FROM LEGAL_MEDICAL_RECORD WHERE RequestID = 'REQ_2026_005';
DELETE FROM REQUEST_HORSE_MAPPING WHERE RequestID = 'REQ_2026_005';
DELETE FROM TRANSPORT_REQUEST WHERE RequestID = 'REQ_2026_005';
DELETE FROM NOTIFICATION WHERE NotificationID = 'NOTIF_005';
GO

-- -----------------------------------------------------------------------------
-- 1. ĐẢM BẢO CÁC ACTOR & CÁ THỂ NGỰA CỐT LÕI ĐÃ TỒN TẠI
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_CUST_01')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USR_CUST_01', 'nguyenvana', '123456', 'Customer', N'Nguyễn Văn A (CLB Hà Nội)', 'vana.horse@gmail.com', '0901234567', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_COORD_01')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USR_COORD_01', 'coord_hai', '123456', 'Coordinator', N'Phạm Hải (Điều phối xe & tuyến)', 'hai.coord@cbntransport.com', '0934567890', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_SPEC_01')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USR_SPEC_01', 'spec_tuan', '123456', 'Specialist', N'Lê Tuấn (Thẩm định pháp lý/thú y)', 'tuan.specialist@cbntransport.com', '0923456789', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_MGR_01')
BEGIN
    INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, IsActive)
    VALUES ('USR_MGR_01', 'manager_linh', '123456', 'Manager', N'Trần Thị Linh (Logistics Manager)', 'linh.manager@cbntransport.com', '0912345678', 1);
END;

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HRS_001')
BEGIN
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HRS_001', 'USR_CUST_01', '981098102938475', 'VN_FEI_2026_01', N'Tia Chớp Đỏ (Red Lightning)', N'Thoroughbred', 'Stallion', 'Intact', 520.50, '2020-04-15');
END;

IF NOT EXISTS (SELECT 1 FROM HORSE WHERE HorseID = 'HRS_002')
BEGIN
    INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB)
    VALUES ('HRS_002', 'USR_CUST_01', '981098102938476', 'VN_FEI_2026_02', N'Bão Táp Xanh (Blue Storm)', N'Arabian', 'Mare', 'Non-Pregnant', 485.00, '2021-06-20');
END;
GO

-- -----------------------------------------------------------------------------
-- 2. TẠO YÊU CẦU VẬN CHUYỂN: REQ_2026_005 (Hà Nội -> Bangkok, 2 ngựa đua)
-- -----------------------------------------------------------------------------
INSERT INTO TRANSPORT_REQUEST (
    RequestID, CustomerID, Departure, Destination, Purpose, TransportType,
    ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone,
    BaseCost, Status, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude,
    DistanceKm, PickupStableName, PickupPostalCode, PickupInstructions,
    DeliveryStableName, DeliveryPostalCode, DeliveryInstructions, CareInstructions,
    DeclaredValueVnd, OriginCountry, DestinationCountry, PreparationDays
) VALUES (
    'REQ_2026_005',
    'USR_CUST_01',
    N'Trang trại Ngựa Thể Thao Sóc Sơn, Hà Nội',
    N'CLB Đua Ngựa Hoàng Gia Bangkok, Thái Lan',
    N'Tham dự Cúp Đua Ngựa Hữu Nghị ASEAN 2026',
    'ROAD_CROSS_BORDER',
    DATEADD(DAY, 5, GETDATE()),  -- Dự kiến khởi hành sau 5 ngày
    DATEADD(DAY, 8, GETDATE()),  -- Cam kết hoàn tất sau 8 ngày
    N'Somchai Prasert (Bangkok Polo Club)',
    '+66812349999',
    9500.00,
    'APPROVED',                  -- Trạng thái đơn: ĐÃ DUYỆT
    21.285000, 105.850000,       -- Tọa độ đón (Sóc Sơn)
    13.736700, 100.542000,       -- Tọa độ trả (Bangkok)
    1350.00,
    N'Trang trại Sóc Sơn - Stable A',
    N'100000',
    N'Đường nội bộ trải nhựa rộng 8m, xe chuyên dụng 6 chuồng vào tận cửa chuồng nhận ngựa',
    N'Bangkok Royal Polo Stable',
    N'10330',
    N'Cổng số 2 đường Henri Dunant, có trạm kiểm tra thú y tiếp nhận 24/7',
    N'Cho ngựa ăn cỏ Timothy và yến mạch mỗi 4 tiếng, uống nước bù điện giải định kỳ, tránh tiếng ồn lớn',
    5000000000.00,
    'VN',
    'TH',
    3
);
PRINT N' [OK] Đã tạo đơn yêu cầu: REQ_2026_005 (Đã duyệt)';

-- -----------------------------------------------------------------------------
-- 3. GÁN 2 CÁ THỂ NGỰA VÀO ĐƠN REQ_2026_005
-- -----------------------------------------------------------------------------
INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID)
VALUES 
('RHM_006', 'REQ_2026_005', 'HRS_001'),
('RHM_007', 'REQ_2026_005', 'HRS_002');
PRINT N' [OK] Đã gán 2 ngựa: HRS_001 (Tia Chớp Đỏ) & HRS_002 (Bão Táp Xanh)';

-- -----------------------------------------------------------------------------
-- 4. HỒ SƠ PHÁP LÝ & Y TẾ ĐÃ ĐƯỢC CHUYÊN VIÊN PHÁP LÝ (SPECIALIST) THẨM ĐỊNH
-- -----------------------------------------------------------------------------
INSERT INTO LEGAL_MEDICAL_RECORD (
    RecordID, HorseID, RequestID, VerifiedBy, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl, ExpiryDate
) VALUES
('REC_007', 'HRS_001', 'REQ_2026_005', 'USR_SPEC_01', 'COGGINS_TEST', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs1.pdf', DATEADD(MONTH, 3, GETDATE())),
('REC_008', 'HRS_002', 'REQ_2026_005', 'USR_SPEC_01', 'EQUINE_FLU_VAX', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/flu_hrs2.pdf', DATEADD(MONTH, 4, GETDATE()));
PRINT N' [OK] Hồ sơ thú y kiểm dịch đã thẩm định hoàn tất (Specialist READY)';

-- -----------------------------------------------------------------------------
-- 5. TẠO KẾ HOẠCH CHUYẾN ĐI (TRIP_PLAN): TRIP_2026_006
-- Trạng thái: PLANNING, DeploymentStatus = CONFIRMED (Đã bàn giao cho Coordinator)
-- Tuyến đường: DRAFT (Chưa lập tuyến), Nhân sự & Xe: Chưa phân công
-- -----------------------------------------------------------------------------
INSERT INTO TRIP_PLAN (
    TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status,
    [Version], PlanVersion, ContextVersion, ReadinessVersion, DraftPlanJson, ApprovedPlanJson, OpenChange,
    EffectiveOriginPlaceId, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId,
    AssignedCoordinatorId, AssignedSpecialistId,
    OperationsStatus, ResourcesConfirmedAt, ResourcesConfirmedBy,
    DocumentsStatus, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, DocumentsConfirmedAt, DocumentsConfirmedBy,
    CurrentRouteVersion, RouteStatus, RouteApprovedAt, RouteApprovedBy, RouteReturnReason,
    DepartureApprovedAt, DepartureApprovedBy, RejectionReason
) VALUES (
    'TRIP_2026_006',
    'REQ_2026_005',
    1350.00,
    38.00,
    7200.00,
    'PLANNING',                               -- TRẠNG THÁI: ĐANG LẬP KẾ HOẠCH
    1, 1, 1, 1, NULL, NULL, 0,
    NULL,
    'CONFIRMED',                              -- BÀN GIAO: ĐÃ XÁC NHẬN BÀN GIAO TỪ FLOW 1
    N'Đơn yêu cầu REQ_2026_005 đã ký hợp đồng & thanh toán cọc thành công, bàn giao điều phối viên lập kế hoạch vận tải Flow 3',
    'USR_MGR_01',
    SYSUTCDATETIME(),
    'EVT_HO_006',
    'USR_COORD_01',                           -- Điều phối viên phụ trách: coord_hai
    'USR_SPEC_01',                           -- Chuyên viên pháp lý phụ trách: spec_tuan
    'NOT_READY',                              -- VẬN HÀNH: CHƯA SẴN SÀNG (CHỜ LẬP TUYẾN & CHỌN XE)
    NULL, NULL,
    'READY',                                  -- PHÁP LÝ: ĐÃ SẴN SÀNG
    DATEADD(DAY, 4, GETDATE()),               -- Sớm nhất có thể khởi hành sau 4 ngày
    DATEADD(DAY, 15, GETDATE()),              -- Hạn giấy tờ thú y sau 15 ngày
    N'Hồ sơ thú y xét nghiệm Coggins và tiêm phòng Cúm đã được thẩm định đạt chuẩn xuất cảnh sang Thái Lan.',
    SYSUTCDATETIME(),
    N'Lê Tuấn (Specialist)',
    1,
    'DRAFT',                                  -- LỘ TRÌNH: BẢN NHÁP (Chờ Coordinator vào lập trạm dừng & lộ trình)
    NULL, NULL, NULL,
    NULL, NULL, NULL
);
PRINT N' [OK] Đã tạo chuyến đi TRIP_2026_006: PLANNING | Deployment: CONFIRMED | Route: DRAFT';

-- -----------------------------------------------------------------------------
-- 6. HỢP ĐỒNG & HÓA ĐƠN ĐẶT CỌC (FLOW 6) ĐÃ HOÀN TẤT
-- -----------------------------------------------------------------------------
INSERT INTO CONTRACT (
    ContractID, TripID, CustomerID, ContractCode, CurrencyCode, ExchangeRateToLocal,
    TotalQuotedPrice, BaseContractPrice_P, DepositRateStandard, ActualGrossProfit_AGP,
    SignedAt, ContractStatus, CurrentVersionNo, RequestID, DepositAmount, PdfUrl
) VALUES (
    'CTR_2026_004',
    'TRIP_2026_006',
    'USR_CUST_01',
    'HD-CBN-2026-004',
    'USD',
    25450.0000,
    9500.00,
    9500.00,
    0.40,
    2500.00,
    DATEADD(DAY, -1, GETDATE()),
    'EXECUTING',                              -- HỢP ĐỒNG ĐANG THỰC HIỆN
    1,
    'REQ_2026_005',
    3800.00,                                  -- Tiền cọc 40% = 3,800 USD
    'https://storage.cbntransport.com/contracts/hd_cbn_2026_004.pdf'
);

INSERT INTO CONTRACT_VERSION (
    ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl,
    CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail
) VALUES (
    'CTR_2026_004',
    1,
    'SIGNED',
    N'{"contractId":"CTR_2026_004","code":"HD-CBN-2026-004","status":"SIGNED","depositAmount":3800.00}',
    'private/demo/CTR_2026_004_v1.pdf',
    'USR_MGR_01',
    SYSUTCDATETIME(),
    'USR_MGR_01',
    SYSUTCDATETIME(),
    SYSUTCDATETIME(),
    'vana.horse@gmail.com'
);

INSERT INTO INVOICE (
    InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode,
    TotalPayableAmount, PaidAmount, DueDate, PaymentStatus
) VALUES (
    'INV_401',
    'CTR_2026_004',
    1,
    'DEPOSIT_40',
    'USD',
    3800.00,
    3800.00,
    DATEADD(DAY, 2, GETDATE()),
    'PAID'                                    -- TIỀN CỌC ĐÃ THANH TOÁN XONG
);
PRINT N' [OK] Hợp đồng CTR_2026_004 & Hóa đơn cọc 3,800 USD (PAID) đã ghi nhận';

-- -----------------------------------------------------------------------------
-- 7. THÔNG BÁO CHO ĐIỀU PHỐI VIÊN (COORDINATOR)
-- -----------------------------------------------------------------------------
INSERT INTO NOTIFICATION (
    NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt
) VALUES (
    'NOTIF_005',
    'USR_COORD_01',
    'TRIP_2026_006',
    'TRIP_ASSIGN',
    'WEB_ALERT',
    N'Chuyến đi mới cần lập kế hoạch (Flow 3)',
    N'Chuyến TRIP_2026_006 (Đơn REQ_2026_005: Sóc Sơn -> Bangkok) đã được duyệt và giao cho bạn. Vui lòng lập lộ trình và phân công phương tiện.',
    0,
    SYSUTCDATETIME()
);
PRINT N' [OK] Đã gửi thông báo đến tài khoản Coordinator (coord_hai)';

PRINT N'-----------------------------------------------------------------------------';
PRINT N'>>> HOÀN TẤT TẠO DATASET FLOW 3!';
PRINT N'    Mã chuyến: TRIP_2026_006';
PRINT N'    Mã yêu cầu: REQ_2026_005';
PRINT N'    Tuyến đường: Hà Nội -> Bangkok (Đường bộ xuyên biên giới)';
PRINT N'    Trạng thái: PLANNING (Chờ Coordinator lập tuyến và phân công xe/tài xế)';
PRINT N'    Tài khoản Coordinator demo: coord_hai (Mật khẩu: 123456)';
PRINT N'-----------------------------------------------------------------------------';
GO

