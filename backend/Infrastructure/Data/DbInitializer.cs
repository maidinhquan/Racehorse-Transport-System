using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Data
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(HorseTransportDbContext context, ILogger logger)
        {
            try
            {
                logger.LogInformation(">>> Đang kiểm tra và khởi tạo dữ liệu / schema cho Flow 3 (Two-Party Ready & Fleet Management)...");

                // 1. Kiểm tra kết nối tới SQL Server
                bool canConnect = await context.Database.CanConnectAsync();
                if (!canConnect)
                {
                    logger.LogWarning(">>> Không thể kết nối tới SQL Server Database. Bỏ qua khởi tạo DB.");
                    return;
                }

                // 2. Tự động bổ sung các cột mới vào bảng TRIP_PLAN (Idempotent DDL)
                var alterTripPlanSql = @"
IF COL_LENGTH('TRIP_PLAN', 'Version') IS NULL ALTER TABLE TRIP_PLAN ADD [Version] INT NOT NULL DEFAULT 1;
IF COL_LENGTH('TRIP_PLAN', 'PlanVersion') IS NULL ALTER TABLE TRIP_PLAN ADD PlanVersion INT NOT NULL DEFAULT 1;
IF COL_LENGTH('TRIP_PLAN', 'ContextVersion') IS NULL ALTER TABLE TRIP_PLAN ADD ContextVersion INT NOT NULL DEFAULT 1;
IF COL_LENGTH('TRIP_PLAN', 'ReadinessVersion') IS NULL ALTER TABLE TRIP_PLAN ADD ReadinessVersion INT NOT NULL DEFAULT 1;
IF COL_LENGTH('TRIP_PLAN', 'DraftPlanJson') IS NULL ALTER TABLE TRIP_PLAN ADD DraftPlanJson NVARCHAR(MAX) NULL;
IF COL_LENGTH('TRIP_PLAN', 'ApprovedPlanJson') IS NULL ALTER TABLE TRIP_PLAN ADD ApprovedPlanJson NVARCHAR(MAX) NULL;
IF COL_LENGTH('TRIP_PLAN', 'OpenChange') IS NULL ALTER TABLE TRIP_PLAN ADD OpenChange BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('TRIP_PLAN', 'EffectiveOriginPlaceId') IS NULL ALTER TABLE TRIP_PLAN ADD EffectiveOriginPlaceId VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DeploymentStatus') IS NULL ALTER TABLE TRIP_PLAN ADD DeploymentStatus VARCHAR(12) NULL DEFAULT 'CONFIRMED';
IF COL_LENGTH('TRIP_PLAN', 'DeploymentReason') IS NULL ALTER TABLE TRIP_PLAN ADD DeploymentReason NVARCHAR(1000) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DeploymentBy') IS NULL ALTER TABLE TRIP_PLAN ADD DeploymentBy VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DeploymentAtUtc') IS NULL ALTER TABLE TRIP_PLAN ADD DeploymentAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('TRIP_PLAN', 'HandoffEventId') IS NULL ALTER TABLE TRIP_PLAN ADD HandoffEventId VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'AssignedSpecialistId') IS NULL ALTER TABLE TRIP_PLAN ADD AssignedSpecialistId VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'AssignedCoordinatorId') IS NULL ALTER TABLE TRIP_PLAN ADD AssignedCoordinatorId VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'OperationsStatus') IS NULL ALTER TABLE TRIP_PLAN ADD OperationsStatus VARCHAR(20) NOT NULL DEFAULT 'NOT_READY';
IF COL_LENGTH('TRIP_PLAN', 'ResourcesConfirmedAt') IS NULL ALTER TABLE TRIP_PLAN ADD ResourcesConfirmedAt DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'ResourcesConfirmedBy') IS NULL ALTER TABLE TRIP_PLAN ADD ResourcesConfirmedBy NVARCHAR(100) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DocumentsStatus') IS NULL ALTER TABLE TRIP_PLAN ADD DocumentsStatus VARCHAR(20) NOT NULL DEFAULT 'NOT_READY';
IF COL_LENGTH('TRIP_PLAN', 'EarliestDepartureDate') IS NULL ALTER TABLE TRIP_PLAN ADD EarliestDepartureDate DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'DocumentExpiryDate') IS NULL ALTER TABLE TRIP_PLAN ADD DocumentExpiryDate DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'SpecialistLegalNote') IS NULL ALTER TABLE TRIP_PLAN ADD SpecialistLegalNote NVARCHAR(500) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DocumentsConfirmedAt') IS NULL ALTER TABLE TRIP_PLAN ADD DocumentsConfirmedAt DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'DocumentsConfirmedBy') IS NULL ALTER TABLE TRIP_PLAN ADD DocumentsConfirmedBy NVARCHAR(100) NULL;
IF COL_LENGTH('TRIP_PLAN', 'CurrentRouteVersion') IS NULL ALTER TABLE TRIP_PLAN ADD CurrentRouteVersion INT NOT NULL DEFAULT 1;
IF COL_LENGTH('TRIP_PLAN', 'RouteStatus') IS NULL ALTER TABLE TRIP_PLAN ADD RouteStatus VARCHAR(30) NOT NULL DEFAULT 'DRAFT';
IF COL_LENGTH('TRIP_PLAN', 'RouteApprovedAt') IS NULL ALTER TABLE TRIP_PLAN ADD RouteApprovedAt DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'RouteApprovedBy') IS NULL ALTER TABLE TRIP_PLAN ADD RouteApprovedBy VARCHAR(50) NULL;
IF COL_LENGTH('TRIP_PLAN', 'RouteReturnReason') IS NULL ALTER TABLE TRIP_PLAN ADD RouteReturnReason NVARCHAR(500) NULL;
IF COL_LENGTH('TRIP_PLAN', 'DepartureApprovedAt') IS NULL ALTER TABLE TRIP_PLAN ADD DepartureApprovedAt DATETIME2 NULL;
IF COL_LENGTH('TRIP_PLAN', 'DepartureApprovedBy') IS NULL ALTER TABLE TRIP_PLAN ADD DepartureApprovedBy NVARCHAR(100) NULL;
IF COL_LENGTH('TRIP_PLAN', 'RejectionReason') IS NULL ALTER TABLE TRIP_PLAN ADD RejectionReason NVARCHAR(500) NULL;
";
                await context.Database.ExecuteSqlRawAsync(alterTripPlanSql);

                // 3. Tự động bổ sung các cột mới vào bảng VEHICLE và PARTNER_FACILITY
                var alterOtherTablesSql = @"
IF COL_LENGTH('VEHICLE', 'Height_m') IS NULL ALTER TABLE VEHICLE ADD Height_m DECIMAL(4, 2) NULL;
IF COL_LENGTH('VEHICLE', 'Width_m') IS NULL ALTER TABLE VEHICLE ADD Width_m DECIMAL(4, 2) NULL;
IF COL_LENGTH('VEHICLE', 'Length_m') IS NULL ALTER TABLE VEHICLE ADD Length_m DECIMAL(4, 2) NULL;
IF COL_LENGTH('VEHICLE', 'Gross_Weight_Tons') IS NULL ALTER TABLE VEHICLE ADD Gross_Weight_Tons DECIMAL(5, 2) NULL;
IF COL_LENGTH('VEHICLE', 'Axle_Weight_Tons') IS NULL ALTER TABLE VEHICLE ADD Axle_Weight_Tons DECIMAL(5, 2) NULL;

IF COL_LENGTH('PARTNER_FACILITY', 'Purposes') IS NULL ALTER TABLE PARTNER_FACILITY ADD Purposes NVARCHAR(100) NULL;
IF COL_LENGTH('PARTNER_FACILITY', 'OperatingHours') IS NULL ALTER TABLE PARTNER_FACILITY ADD OperatingHours VARCHAR(50) NULL DEFAULT '24/7';
IF COL_LENGTH('PARTNER_FACILITY', 'CountryCode') IS NULL ALTER TABLE PARTNER_FACILITY ADD CountryCode VARCHAR(3) NOT NULL DEFAULT 'VN';
";
                await context.Database.ExecuteSqlRawAsync(alterOtherTablesSql);

                // 4. Tạo các bảng bổ sung của Flow 3 v2 nếu chưa có
                var createTablesSql = @"
IF OBJECT_ID('AIR_PARTNER', 'U') IS NULL
BEGIN
    CREATE TABLE AIR_PARTNER (
        PartnerID VARCHAR(50) NOT NULL,
        PartnerName NVARCHAR(200) NOT NULL,
        CountryCode VARCHAR(3) NOT NULL DEFAULT 'VN',
        ContactEmail VARCHAR(100) NULL,
        ContactPhone VARCHAR(20) NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT PK_AirPartner PRIMARY KEY (PartnerID)
    );
END;

IF OBJECT_ID('FLIGHT_CATALOG', 'U') IS NULL
BEGIN
    CREATE TABLE FLIGHT_CATALOG (
        ServiceID VARCHAR(50) NOT NULL,
        PartnerID VARCHAR(50) NOT NULL,
        ProviderFlightCode VARCHAR(50) NOT NULL,
        Airline NVARCHAR(100) NOT NULL,
        OriginAirportPlaceId VARCHAR(50) NOT NULL,
        DestAirportPlaceId VARCHAR(50) NOT NULL,
        DepartureTime VARCHAR(5) NOT NULL,
        ArrivalTime VARCHAR(5) NOT NULL,
        DepartureTimeZone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        ArrivalTimeZone VARCHAR(50) NOT NULL DEFAULT 'Asia/Tokyo',
        PriceVND DECIMAL(14, 2) NOT NULL,
        CapacityHorses INT NOT NULL DEFAULT 4,
        CareProvider VARCHAR(50) NOT NULL DEFAULT 'AIRLINE',
        DirectFlight BIT NOT NULL DEFAULT 1,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_FlightCatalog PRIMARY KEY (ServiceID)
    );
END;

IF OBJECT_ID('PICKUP_RELOCATION', 'U') IS NULL
BEGIN
    CREATE TABLE PICKUP_RELOCATION (
        RelocationID VARCHAR(50) NOT NULL,
        TripID VARCHAR(50) NOT NULL,
        OriginalAddress NVARCHAR(500) NOT NULL,
        AccessEvaluation VARCHAR(20) NOT NULL DEFAULT 'INACCESSIBLE',
        CandidatePlaceId VARCHAR(50) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
        ProposedBy VARCHAR(50) NULL,
        ProposedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        ManagerDecision VARCHAR(20) NULL,
        ManagerDecisionReason NVARCHAR(500) NULL,
        ManagerDecisionBy VARCHAR(50) NULL,
        ManagerDecisionAt DATETIME2 NULL,
        CustomerConsentMethod VARCHAR(20) NULL,
        CustomerConsentNote NVARCHAR(500) NULL,
        CustomerConsentConfirmedBy VARCHAR(50) NULL,
        CustomerConsentConfirmedAt DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CONSTRAINT PK_PickupRelocation PRIMARY KEY (RelocationID)
    );
END;

IF OBJECT_ID('IDEMPOTENCY_RECORD', 'U') IS NULL
BEGIN
    CREATE TABLE IDEMPOTENCY_RECORD (
        IdempotencyKey VARCHAR(64) NOT NULL,
        ActorID VARCHAR(50) NOT NULL,
        HttpMethod VARCHAR(10) NOT NULL,
        RequestPath VARCHAR(255) NOT NULL,
        RequestBodyHash VARCHAR(64) NOT NULL,
        ResponseStatusCode INT NOT NULL,
        ResponseBody NVARCHAR(MAX) NOT NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ExpiresAtUtc DATETIME2 NOT NULL,
        CONSTRAINT PK_IdempotencyRecord PRIMARY KEY (IdempotencyKey)
    );
END;

IF OBJECT_ID('TRIP_PLANNING_HISTORY', 'U') IS NULL
BEGIN
    CREATE TABLE TRIP_PLANNING_HISTORY (
        HistoryID BIGINT IDENTITY(1,1) NOT NULL,
        TripID VARCHAR(50) NOT NULL,
        [Version] INT NOT NULL,
        [Action] VARCHAR(50) NOT NULL,
        ActorID VARCHAR(50) NOT NULL,
        ActorRole VARCHAR(50) NOT NULL,
        DetailsJson NVARCHAR(MAX) NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_TripPlanningHistory PRIMARY KEY (HistoryID)
    );
END;

IF OBJECT_ID('PLANNING_ATTACHMENT', 'U') IS NULL
BEGIN
    CREATE TABLE PLANNING_ATTACHMENT (
        FileID VARCHAR(50) NOT NULL,
        TripID VARCHAR(50) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        FileType VARCHAR(50) NOT NULL,
        ContentType VARCHAR(100) NOT NULL,
        FileSize BIGINT NOT NULL,
        StoragePath NVARCHAR(500) NOT NULL,
        UploadedBy VARCHAR(50) NULL,
        UploadedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_PlanningAttachment PRIMARY KEY (FileID)
    );
END;
";
                await context.Database.ExecuteSqlRawAsync(createTablesSql);

                // 5. Nạp dữ liệu mẫu quan trọng cho Flow 3 (Users, Facilities, Vehicles, Requests, Trips)
                var seedDataSql = @"
-- USERS
IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_CUST_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_CUST_01', N'Nguyễn Văn A (CLB Hà Nội)', 'vana.horse@gmail.com', '0901234567', 'Customer', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_COORD_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_COORD_01', N'Phạm Hải', 'hai.pham@horsetransport.vn', '0901234567', 'Coordinator', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_MGR_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_MGR_01', N'Trần Đình Quản Lý', 'manager@horsetransport.vn', '0907654321', 'Manager', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_SPEC_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_SPEC_01', N'Lê Minh Pháp Lý', 'specialist@horsetransport.vn', '0903333333', 'Specialist', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_DRV_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_DRV_01', N'Nguyễn Văn Hùng', 'hung.driver@horsetransport.vn', '0904444444', 'Driver', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_DRV_02')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_DRV_02', N'Trần Đình Trọng', 'trong.driver@horsetransport.vn', '0905555555', 'Driver', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_ESC_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_ESC_01', N'BS. Lê Minh Hoàng', 'hoang.vet@horsetransport.vn', '0906666666', 'Escort', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_DRV_JP_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_DRV_JP_01', N'Kenji Sato (Driver JP)', 'kenji.sato@horsetransport.jp', '+819012345678', 'Driver', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_DRV_JP_02')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_DRV_JP_02', N'Takashi Tanaka (Co-Driver JP)', 'takashi.tanaka@horsetransport.jp', '+819087654321', 'Driver', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

IF NOT EXISTS (SELECT 1 FROM [USER] WHERE UserID = 'USR_ESC_JP_01')
    INSERT INTO [USER] (UserID, FullName, Email, Phone, Role, PasswordHash, IsActive)
    VALUES ('USR_ESC_JP_01', N'Dr. Yoko Takahashi (Vet JP)', 'yoko.vet@tokyo.jp', '+819055556666', 'Escort', 'AQAAAAIAAYagAAAAEPwdDemoHashSalt1==', 1);

-- VEHICLES
IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEH_BOX_01')
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEH_BOX_01', 'HORSEBOX_3_STALLS', 3, 900.00, 1.20, 'AVAILABLE', 'VN', '51C-101.45', 3.80, 2.50, 10.00, 18.00, 4.00);

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEH_BOX_02')
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEH_BOX_02', 'HORSEBOX_6_STALLS', 6, 1200.00, 1.80, 'AVAILABLE', 'VN', '51C-202.88', 3.90, 2.55, 12.00, 24.00, 6.00);

IF NOT EXISTS (SELECT 1 FROM VEHICLE WHERE VehicleID = 'VEH_JP_01')
    INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons)
    VALUES ('VEH_JP_01', 'HORSEBOX_3_STALLS', 3, 1000.00, 2.50, 'AVAILABLE', 'JP', N'品川 300 あ 12-34', 3.80, 2.50, 10.00, 18.00, 4.00);

-- AIR PARTNERS
IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'PARTNER_NCA')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('PARTNER_NCA', N'Nippon Cargo Airlines', 'JP', 'charter@nca.aero', '+81355551234', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'PARTNER_KLINE')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('PARTNER_KLINE', N'K-Line Air Service', 'JP', 'cargo@kline.co.jp', '+81355555678', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM AIR_PARTNER WHERE PartnerID = 'PARTNER_VN_CARGO')
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('PARTNER_VN_CARGO', N'Vietnam Airlines Cargo', 'VN', 'cargo@vietnamairlines.com', '19001100', 'ACTIVE');

-- FLIGHT CATALOGS
IF NOT EXISTS (SELECT 1 FROM FLIGHT_CATALOG WHERE ServiceID = 'SVC_NCA_102')
    INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive)
    VALUES ('SVC_NCA_102', 'PARTNER_NCA', 'KZ-102', N'NCA Airlines', 'AP_SGN', 'AP_NRT', '05:00', '11:00', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 125000000.00, 4, 'AIRLINE', 1, 1);

IF NOT EXISTS (SELECT 1 FROM FLIGHT_CATALOG WHERE ServiceID = 'SVC_NCA_104')
    INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive)
    VALUES ('SVC_NCA_104', 'PARTNER_NCA', 'KZ-104', N'NCA Airlines', 'AP_HAN', 'AP_HND', '08:00', '14:30', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 135000000.00, 4, 'AIRLINE', 1, 1);

-- PARTNER FACILITIES
IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'FAC_001')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('FAC_001', N'Trung tâm Huấn luyện Ngựa Củ Chi', 'REST_STOP', 'REST,QUARANTINE', 'VN', N'Ấp 4, Củ Chi, TP. Hồ Chí Minh', 11.006500, 106.502000, '24/7', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'FAC_004')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('FAC_004', N'Trại ngựa Ba Vì - Hà Nội', 'REST_STOP', 'REST,FEED', 'VN', N'Vân Hòa, Ba Vì, Hà Nội', 21.050000, 105.350000, '24/7', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'FAC_BAVI')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('FAC_BAVI', N'Khu huấn luyện Ba Vì, Hà Nội', 'ORIGIN', 'PICKUP,REST', 'VN', N'Vân Hòa, Ba Vì, Hà Nội', 21.050000, 105.350000, '24/7', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'AP_HAN')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('AP_HAN', N'Sân bay Quốc tế Nội Bài (HAN)', 'AIRPORT', 'AIRPORT,BORDER', 'VN', N'Sóc Sơn, Hà Nội', 21.221200, 105.807200, '24/7', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'AP_NRT')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('AP_NRT', N'Sân bay Quốc tế Narita (NRT)', 'AIRPORT', 'AIRPORT,BORDER', 'JP', N'Narita, Chiba, Tokyo, Nhật Bản', 35.772000, 140.392900, '24/7', 'ACTIVE');

IF NOT EXISTS (SELECT 1 FROM PARTNER_FACILITY WHERE FacilityID = 'DEST_004')
    INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, Address, Latitude, Longitude, OperatingHours, Status)
    VALUES ('DEST_004', N'Trường đua Tokyo Fuchu', 'DESTINATION', 'DESTINATION,QUARANTINE', 'JP', N'Fuchu, Tokyo, Nhật Bản', 35.660000, 139.480000, '24/7', 'ACTIVE');

-- REQUEST REQ_2026_004
IF NOT EXISTS (SELECT 1 FROM TRANSPORT_REQUEST WHERE RequestID = 'REQ_2026_004')
BEGIN
    INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, DeclaredValueVnd, OriginCountry, DestinationCountry, PreparationDays)
    VALUES ('REQ_2026_004', 'USR_CUST_01', N'Khu huấn luyện Ba Vì, Hà Nội', N'Trường đua Tokyo Fuchu, Tokyo, Nhật Bản', N'Thi đấu Cúp Hoàng Gia Tokyo', 'MULTIMODAL_AIR', DATEADD(day, 2, GETDATE()), DATEADD(day, 7, GETDATE()), N'Kenji Sato', '+819012345678', 9500.00, 'APPROVED', 21.050000, 105.350000, 35.660000, 139.480000, 3200.00, 5000000000.00, 'VN', 'JP', 3);
END
ELSE
BEGIN
    UPDATE TRANSPORT_REQUEST
    SET TransportType = 'MULTIMODAL_AIR',
        Destination = N'Trường đua Tokyo Fuchu, Tokyo, Nhật Bản',
        ExpectedDate = DATEADD(day, 2, GETDATE()),
        CommittedDeadline = DATEADD(day, 7, GETDATE())
    WHERE RequestID = 'REQ_2026_004';
END;

-- REQUEST_HORSE_MAPPING CHO REQ_2026_004
IF NOT EXISTS (SELECT 1 FROM REQUEST_HORSE_MAPPING WHERE RequestID = 'REQ_2026_004')
BEGIN
    INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID)
    VALUES ('RHM_2026_004_1', 'REQ_2026_004', 'HRS_001'), ('RHM_2026_004_2', 'REQ_2026_004', 'HRS_002');
END;

-- TRIP TRIP_2026_004
IF NOT EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_2026_004')
BEGIN
    INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, RejectionReason, ResourcesConfirmedAt, ResourcesConfirmedBy, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote, AssignedCoordinatorId, AssignedSpecialistId, OperationsStatus, DocumentsStatus, RouteStatus, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, [Version], PlanVersion, ContextVersion, ReadinessVersion)
    VALUES ('TRIP_2026_004', 'REQ_2026_004', 3200.00, 28.00, 9500.00, 'PENDING_APPROVAL', NULL, GETDATE(), N'Phạm Hải (Coordinator)', DATEADD(day, 1, GETDATE()), DATEADD(day, 10, GETDATE()), N'Giấy Coggins test và tiêm phòng Cúm đủ điều kiện xuất cảnh. Đã thẩm định hợp lệ.', 'USR_COORD_01', 'USR_SPEC_01', 'READY', 'READY', 'DRAFT', 'CONFIRMED', N'Bàn giao triển khai thành công từ Flow 1', 'USR_MGR_01', GETDATE(), 'EVT_HO_004', 1, 1, 1, 1);
END
ELSE
BEGIN
    UPDATE TRIP_PLAN 
    SET AssignedCoordinatorId = COALESCE(AssignedCoordinatorId, 'USR_COORD_01'),
        AssignedSpecialistId = COALESCE(AssignedSpecialistId, 'USR_SPEC_01'),
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        EarliestDepartureDate = DATEADD(day, 1, GETDATE()),
        DocumentExpiryDate = DATEADD(day, 10, GETDATE()),
        RouteStatus = 'DRAFT',
        Status = 'PENDING_APPROVAL',
        DraftPlanJson = NULL,
        ApprovedPlanJson = NULL,
        OpenChange = 0,
        DeploymentStatus = COALESCE(DeploymentStatus, 'CONFIRMED'),
        [Version] = 1,
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1
    WHERE TripID = 'TRIP_2026_004';

    DELETE FROM TRIP_PLANNING_HISTORY WHERE TripID = 'TRIP_2026_004';
    DELETE FROM IDEMPOTENCY_RECORD;
END;

-- ASSIGNMENTS CHO TRIP_2026_004
IF NOT EXISTS (SELECT 1 FROM TRIP_VEHICLE_ASSIGNMENT WHERE TripID = 'TRIP_2026_004')
BEGIN
    INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, LegNumber, LegType, VehicleID, DriverID, CoDriverID, VeterinarianID, EscortID)
    VALUES 
    ('TVA_004', 'TRIP_2026_004', 1, 'OUTBOUND', 'VEH_BOX_01', 'USR_DRV_01', 'USR_DRV_02', 'USR_ESC_01', 'USR_ESC_01'),
    ('TVA_005', 'TRIP_2026_004', 2, 'INBOUND',  'VEH_JP_01',  'USR_DRV_JP_01', 'USR_DRV_JP_02', 'USR_ESC_JP_01', 'USR_ESC_JP_01');
END;

-- ROUTE SEGMENTS CHO TRIP_2026_004
IF NOT EXISTS (SELECT 1 FROM ROUTE_SEGMENT WHERE TripID = 'TRIP_2026_004')
BEGIN
    INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, SequenceOrder, FacilityID, LocationName, SegmentType, TransportMode, CarrierName, Flight_Voyage_No, PlannedTime, ExpectedETA, ActualTime, Status)
    VALUES
    ('SEG_401', 'TRIP_2026_004', 1, 'FAC_004', N'Khu huấn luyện Ba Vì -> Sân bay Nội Bài', 'PICKUP', 'ROAD', NULL, NULL, '2026-10-20 05:00:00', '2026-10-20 07:30:00', NULL, 'PENDING'),
    ('SEG_402', 'TRIP_2026_004', 2, 'AP_HAN',  N'Sân bay Nội Bài -> Sân bay Narita (NRT)', 'AIRPORT', 'AIR', N'NCA Airlines', 'KZ-102', '2026-10-20 09:30:00', '2026-10-20 16:00:00', NULL, 'PENDING'),
    ('SEG_403', 'TRIP_2026_004', 3, 'AP_NRT',  N'Sân bay Narita -> Trường đua Tokyo Fuchu', 'DESTINATION', 'ROAD', NULL, NULL, '2026-10-20 17:30:00', '2026-10-20 20:00:00', NULL, 'PENDING');
END;

-- FLIGHT BOOKING CHO TRIP_2026_004
IF NOT EXISTS (SELECT 1 FROM FLIGHT_BOOKING WHERE TripID = 'TRIP_2026_004')
BEGIN
    INSERT INTO FLIGHT_BOOKING (TripID, BookingVersion, RouteVersionID, ProviderName, Airline, FlightNumber, DepartureAirportCheckpointId, ArrivalAirportCheckpointId, DepartureAt, ArrivalAt, DirectFlight, BookingReference, BookingConfirmed, HorseIds, Note, CreatedAt)
    VALUES ('TRIP_2026_004', 1, 1, N'Nippon Cargo Airlines', N'NCA Airlines', 'KZ-102', 101, 201, '2026-10-20 09:30:00', '2026-10-20 16:00:00', 1, 'NCA-HAN-NRT-2026', 1, N'[""HORSE_001"",""HORSE_002""]', N'Chuyến bay charter chuyên chở ngựa đua', GETDATE());
END;
";
                await context.Database.ExecuteSqlRawAsync(seedDataSql);

                logger.LogInformation(">>> Khởi tạo và đồng bộ Flow 3 Database thành công 100%!");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, ">>> Có lỗi xảy ra trong quá trình khởi tạo dữ liệu / schema tự động.");
            }
        }
    }
}
