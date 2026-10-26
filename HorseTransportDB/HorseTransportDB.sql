-- SAMPLE DATABASE ONLY: this file DROPS and recreates HorseTransportDB.
-- Historical schema. Current test database source: HorseTransportDB/HorseTransportDB_Reviewed.sql.
-- Flow 1 schema is defined directly below; sample data from the team is retained.
-- =============================================================================
-- BƯỚC 1: TẠO VÀ CHUYỂN VÀO CƠ SỞ DỮ LIỆU CHÍNH THỨC
-- =============================================================================
USE master;
GO

-- Buộc ngắt mọi kết nối đang mở vào Database cũ và xóa hẳn nếu đã tồn tại
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HorseTransportDB')
BEGIN
    ALTER DATABASE HorseTransportDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HorseTransportDB;
END
GO

-- Tạo mới database hoàn toàn sạch sẽ
CREATE DATABASE HorseTransportDB;
GO

USE HorseTransportDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- =============================================================================
-- BƯỚC 2: KHỞI TẠO CÁC BẢNG (ĐÃ SẮP XẾP THEO THỨ TỰ PHỤ THUỘC KHÓA NGOẠI)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 1: QUẢN TRỊ NGƯỜI DÙNG & TÀI SẢN (USER, ASSET & STAFF)
-- -----------------------------------------------------------------------------

-- 1. Bảng USER: Lưu thông tin tài khoản người dùng
CREATE TABLE [USER] (
    UserID VARCHAR(50) NOT NULL,
    Username VARCHAR(50) NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role VARCHAR(50) NOT NULL, -- Customer, Manager, Specialist, Coordinator, Driver, Escort
    FullName NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) NULL,
    Phone VARCHAR(20) NULL,
    ForgotPasswordRequest NVARCHAR(500) NULL, -- token / request metadata (nullable)
    ResetPasswordRequest NVARCHAR(500) NULL,  -- token / reset metadata (nullable)
    ResetOtpCode VARCHAR(10) NULL,            -- ma OTP 6 so (nullable)
    ResetOtpExpiry DATETIME2 NULL,            -- thoi gian het han OTP (nullable)
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT PK_User PRIMARY KEY (UserID)
);

-- 2. Bảng HORSE: Lưu trữ lý lịch cá thể ngựa đua
CREATE TABLE HORSE (
    PassportIssuedBy NVARCHAR(200) NULL,
    PassportIssuedDate DATE NULL,
    PassportExpiryDate DATE NULL,
    OwnershipCertificateFileUrl NVARCHAR(500) NULL,
    ValuationDocumentFileUrl NVARCHAR(500) NULL,
    DeclaredValueVnd DECIMAL(18,2) NULL,
    SpecialHealthNotes NVARCHAR(2000) NULL,
    HorseID VARCHAR(50) NOT NULL,
    OwnerID VARCHAR(50) NOT NULL,
    Microchip_ISO VARCHAR(50) NOT NULL,
    FEI_Passport_No VARCHAR(50) NULL,
    Name NVARCHAR(100) NOT NULL,
    Breed NVARCHAR(100) NULL,
    Sex VARCHAR(20) NULL,
    ReproductiveStatus VARCHAR(50) NULL,
    Weight DECIMAL(10, 2) NULL,
    DOB DATE NULL,
    -- Flow 1
    PhotoUrl NVARCHAR(500) NULL,
    PassportScanUrl NVARCHAR(500) NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Horse PRIMARY KEY (HorseID),
    CONSTRAINT FK_Horse_Owner FOREIGN KEY (OwnerID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_HORSE_PhotoUrl CHECK ([PhotoUrl] IS NULL OR [PhotoUrl] like 'private/%' AND len([PhotoUrl])>(8)),
    CONSTRAINT CK_F1S_HORSE_PassportScanUrl CHECK ([PassportScanUrl] IS NULL OR [PassportScanUrl] like 'private/%' AND len([PassportScanUrl])>(8)),
    CONSTRAINT CK_F1W_HORSE_OwnershipCertificateFileUrl CHECK ([OwnershipCertificateFileUrl] IS NULL OR ([OwnershipCertificateFileUrl] LIKE 'private/%' AND LEN([OwnershipCertificateFileUrl])>8)),
    CONSTRAINT CK_F1W_HORSE_ValuationDocumentFileUrl CHECK ([ValuationDocumentFileUrl] IS NULL OR ([ValuationDocumentFileUrl] LIKE 'private/%' AND LEN([ValuationDocumentFileUrl])>8)),
    CONSTRAINT CK_F1W_HORSE_DeclaredValueVnd CHECK ([DeclaredValueVnd] IS NULL OR ([DeclaredValueVnd]>0 AND [DeclaredValueVnd]<=9999999999 AND [DeclaredValueVnd]=ROUND([DeclaredValueVnd],0))),
    CONSTRAINT CK_F1W_HORSE_PassportDates CHECK ([PassportIssuedDate] IS NULL OR [PassportExpiryDate] IS NULL OR [PassportExpiryDate]>[PassportIssuedDate])
);

-- 3. (MỚI) Bảng STAFF_DOCUMENT: Quản lý giấy tờ (Passport, Visa) của nhân sự theo xe
CREATE TABLE STAFF_DOCUMENT (
    DocumentID VARCHAR(50) NOT NULL,
    UserID VARCHAR(50) NOT NULL,
    DocType VARCHAR(50) NOT NULL, -- PASSPORT, VISA, DRIVING_LICENSE
    CountryOfIssue VARCHAR(3) NULL,
    ValidForCountries VARCHAR(500) NULL,
    IssueDate DATE NULL,
    ExpiryDate DATE NOT NULL,
    DocumentUrl VARCHAR(500) NULL,
    Status VARCHAR(50) NOT NULL,
    CONSTRAINT PK_StaffDocument PRIMARY KEY (DocumentID),
    CONSTRAINT FK_StaffDocument_User FOREIGN KEY (UserID) REFERENCES [USER](UserID)
);

-- 4. Bảng NOTIFICATION: Lưu thông báo hệ thống
CREATE TABLE NOTIFICATION (
    NotificationID VARCHAR(50) NOT NULL,
    UserID VARCHAR(50) NOT NULL,
    ReferenceID VARCHAR(50) NULL,
    Type VARCHAR(50) NULL,
    Channel VARCHAR(50) NULL,
    Title NVARCHAR(200) NULL,
    Message NVARCHAR(MAX) NULL,
    IsRead BIT NOT NULL DEFAULT 0,
    SentAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Notification PRIMARY KEY (NotificationID),
    CONSTRAINT FK_Notification_User FOREIGN KEY (UserID) REFERENCES [USER](UserID)
);

-- 5. (MỚI) Bảng POLICY_AND_TERM: Quản lý Quy định & Chính sách hệ thống
CREATE TABLE POLICY_AND_TERM (
    PolicyID VARCHAR(50) NOT NULL,
    PolicyType VARCHAR(50) NOT NULL, -- 'TERMS_OF_SERVICE', 'TRANSPORT_RULE', 'CUSTOMS_GUIDE'
    Title NVARCHAR(255) NOT NULL,    -- Tiêu đề quy định
    Content NVARCHAR(MAX) NOT NULL,  -- Nội dung chi tiết (HTML hoặc Markdown)
    Version VARCHAR(20) NOT NULL,    -- Phiên bản (VD: 'v1.0', 'v2.1')
    EffectiveDate DATE NOT NULL,     -- Ngày bắt đầu có hiệu lực
    IsActive BIT NOT NULL DEFAULT 1, -- 1 = Đang áp dụng, 0 = Đã cũ
    CreatedBy VARCHAR(50) NULL,      -- Người soạn thảo quy định
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_PolicyAndTerm PRIMARY KEY (PolicyID),
    CONSTRAINT FK_Policy_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID)
);

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 2: ĐỐI TÁC & TRẠM DỪNG NGHỈ/Y TẾ (PARTNER & FACILITY) - [MỚI]
-- -----------------------------------------------------------------------------

-- 6. (MỚI) Bảng PARTNER_FACILITY: Quản lý trạm đối tác trong và ngoài nước
CREATE TABLE PARTNER_FACILITY (
    FacilityID VARCHAR(50) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    FacilityType VARCHAR(50) NULL, -- VET_CLINIC, REST_STATION, QUARANTINE
    CountryCode VARCHAR(3) NOT NULL DEFAULT 'VN',
    State_Province NVARCHAR(100) NULL,
    City NVARCHAR(100) NULL,
    Address NVARCHAR(500) NULL,
    Coordinates VARCHAR(100) NULL,
    TimeZone VARCHAR(50) NULL, -- Múi giờ để tính ETA
    CapacityStalls INT NULL,
    ContactPerson NVARCHAR(100) NULL,
    ContactPhone VARCHAR(20) NULL,
    TaxID_BusinessCode VARCHAR(50) NULL,
    Status VARCHAR(50) NOT NULL,
    CONSTRAINT PK_PartnerFacility PRIMARY KEY (FacilityID)
);

-- 7. (MỚI) Bảng FACILITY_CONTRACT: Hợp đồng chi phí với trạm
CREATE TABLE FACILITY_CONTRACT (
    FacilityContractID VARCHAR(50) NOT NULL,
    FacilityID VARCHAR(50) NOT NULL,
    ContractCode VARCHAR(50) NOT NULL,
    ValidFrom DATE NULL,
    ValidTo DATE NULL,
    RestFeePerHorse_Day DECIMAL(12, 2) NULL,
    BasicMedicalCheckFee DECIMAL(12, 2) NULL,
    DocumentUrl VARCHAR(500) NULL,
    Status VARCHAR(50) NOT NULL,
    CONSTRAINT PK_FacilityContract PRIMARY KEY (FacilityContractID),
    CONSTRAINT FK_FacilityContract_Facility FOREIGN KEY (FacilityID) REFERENCES PARTNER_FACILITY(FacilityID)
);

-- 8. (MỚI) Bảng FACILITY_CERTIFICATION: Các chứng nhận thú y của trạm
CREATE TABLE FACILITY_CERTIFICATION (
    CertID VARCHAR(50) NOT NULL,
    FacilityID VARCHAR(50) NOT NULL,
    CertName NVARCHAR(200) NULL,
    IssuedBy NVARCHAR(200) NULL,
    CountryOfIssue VARCHAR(3) NULL,
    IsInternationalStandard BIT NOT NULL DEFAULT 0,
    IssueDate DATE NULL,
    ExpiryDate DATE NULL,
    DocumentUrl VARCHAR(500) NULL,
    CONSTRAINT PK_FacilityCertification PRIMARY KEY (CertID),
    CONSTRAINT FK_FacilityCertification_Facility FOREIGN KEY (FacilityID) REFERENCES PARTNER_FACILITY(FacilityID)
);

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 3: YÊU CẦU & KIỂM DỊCH (REQUEST & LEGAL)
-- -----------------------------------------------------------------------------

-- 9. Bảng TRANSPORT_REQUEST: Yêu cầu vận chuyển
CREATE TABLE TRANSPORT_REQUEST (
    PickupStableName NVARCHAR(200) NULL,
    PickupPostalCode NVARCHAR(20) NULL,
    PickupInstructions NVARCHAR(1000) NULL,
    DeliveryStableName NVARCHAR(200) NULL,
    DeliveryPostalCode NVARCHAR(20) NULL,
    DeliveryInstructions NVARCHAR(1000) NULL,
    InvitationLetterFileUrl NVARCHAR(500) NULL,
    CompetitionRegistrationFileUrl NVARCHAR(500) NULL,
    AtaCarnetFileUrl NVARCHAR(500) NULL,
    CareInstructions NVARCHAR(2000) NULL,
    DeclaredValueVnd DECIMAL(18,2) NULL,
    RequestID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    Departure NVARCHAR(255) NOT NULL,
    Destination NVARCHAR(255) NOT NULL,
    Purpose NVARCHAR(100) NULL,
    TransportType VARCHAR(50) NULL,
    ExpectedDate DATETIME NULL,
    CommittedDeadline DATETIME NULL,
    DesignatedReceiverName NVARCHAR(100) NULL,
    DesignatedReceiverPhone VARCHAR(20) NULL,
    BaseCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL,
    -- Flow 1
    PickupLatitude DECIMAL(9,6) NULL,
    PickupLongitude DECIMAL(9,6) NULL,
    DeliveryLatitude DECIMAL(9,6) NULL,
    DeliveryLongitude DECIMAL(9,6) NULL,
    DistanceKm DECIMAL(10,2) NULL,
    PickupContactName NVARCHAR(100) NULL,
    PickupContactPhone VARCHAR(20) NULL,
    ManagerNotes NVARCHAR(1000) NULL,
    OriginCountry VARCHAR(2) NULL,
    DestinationCountry VARCHAR(2) NULL,
    PreparationDays INT NULL,
    RowVersion ROWVERSION NOT NULL,
    DeclaredValueUsd DECIMAL(18,2) NULL,
    SubmissionKeyHash VARCHAR(64) NULL,
    CONSTRAINT PK_TransportRequest PRIMARY KEY (RequestID),
    CONSTRAINT FK_TransportRequest_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Pickup CHECK ([PickupLatitude] IS NULL AND [PickupLongitude] IS NULL OR [PickupLatitude] IS NOT NULL AND [PickupLongitude] IS NOT NULL AND ([PickupLatitude]>=(-90) AND [PickupLatitude]<=(90)) AND ([PickupLongitude]>=(-180) AND [PickupLongitude]<=(180))),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Delivery CHECK ([DeliveryLatitude] IS NULL AND [DeliveryLongitude] IS NULL OR [DeliveryLatitude] IS NOT NULL AND [DeliveryLongitude] IS NOT NULL AND ([DeliveryLatitude]>=(-90) AND [DeliveryLatitude]<=(90)) AND ([DeliveryLongitude]>=(-180) AND [DeliveryLongitude]<=(180))),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Distance CHECK ([DistanceKm] IS NULL OR [DistanceKm]>(0)),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Route CHECK ([OriginCountry] IS NULL AND [DestinationCountry] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [TransportType] IS NOT NULL AND [OriginCountry]='VN' AND ([DestinationCountry]='VN' AND [TransportType] IN ('ROAD','AIR') OR [DestinationCountry]='JP' AND [TransportType]='AIR')),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Preparation CHECK ([PreparationDays] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [PreparationDays]>=case when [TransportType]='AIR' then (7) when [DistanceKm]>(500) then (3) else (2) end AND ([TransportType]='AIR' OR [DistanceKm] IS NOT NULL)),
    CONSTRAINT CK_F1D_DeclaredValueUsd CHECK ([DeclaredValueUsd] IS NULL OR [DeclaredValueUsd]>(0)),
    CONSTRAINT CK_F1W_TRANSPORT_REQUEST_InvitationLetterFileUrl CHECK ([InvitationLetterFileUrl] IS NULL OR ([InvitationLetterFileUrl] LIKE 'private/%' AND LEN([InvitationLetterFileUrl])>8)),
    CONSTRAINT CK_F1W_TRANSPORT_REQUEST_CompetitionRegistrationFileUrl CHECK ([CompetitionRegistrationFileUrl] IS NULL OR ([CompetitionRegistrationFileUrl] LIKE 'private/%' AND LEN([CompetitionRegistrationFileUrl])>8)),
    CONSTRAINT CK_F1W_TRANSPORT_REQUEST_AtaCarnetFileUrl CHECK ([AtaCarnetFileUrl] IS NULL OR ([AtaCarnetFileUrl] LIKE 'private/%' AND LEN([AtaCarnetFileUrl])>8)),
    CONSTRAINT CK_F1W_TRANSPORT_REQUEST_DeclaredValueVnd CHECK ([DeclaredValueVnd] IS NULL OR ([DeclaredValueVnd]>0 AND [DeclaredValueVnd]<=9999999999 AND [DeclaredValueVnd]=ROUND([DeclaredValueVnd],0)))
);

-- 10. Bảng REQUEST_HORSE_MAPPING: Khử quan hệ N-N giữa Request và Horse
CREATE TABLE REQUEST_HORSE_MAPPING (
    CareInstructions NVARCHAR(2000) NULL,
    RequestHorseID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_RequestHorseMapping PRIMARY KEY (RequestHorseID),
    CONSTRAINT FK_RHM_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_RHM_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);

-- 11. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ y tế của ngựa
CREATE TABLE LEGAL_MEDICAL_RECORD (
    RecordID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    VerifiedBy VARCHAR(50) NULL,
    DocumentType VARCHAR(50) NULL,
    RequirementStatus VARCHAR(50) NULL,
    DocumentStatus VARCHAR(50) NULL,
    UploadedFileUrl VARCHAR(500) NULL,
    ExpiryDate DATE NULL,
    CONSTRAINT PK_LegalMedicalRecord PRIMARY KEY (RecordID),
    CONSTRAINT FK_LMR_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_LMR_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_LMR_VerifiedBy FOREIGN KEY (VerifiedBy) REFERENCES [USER](UserID)
);

-- 12. Bảng QUARANTINE_BOOKING: Đặt lịch cách ly (Liên kết với Trạm)
CREATE TABLE QUARANTINE_BOOKING (
    BookingID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    FacilityID VARCHAR(50) NULL, -- Liên kết trạm đối tác
    StationName NVARCHAR(200) NULL, -- Giữ lại phòng khi trạm chưa có trong DB
    Country NVARCHAR(100) NULL,
    ExpectedStartDate DATETIME NULL,
    ExpectedEndDate DATETIME NULL,
    ConfirmationNumber VARCHAR(100) NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_QuarantineBooking PRIMARY KEY (BookingID),
    CONSTRAINT FK_QuarantineBooking_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_QuarantineBooking_Facility FOREIGN KEY (FacilityID) REFERENCES PARTNER_FACILITY(FacilityID)
);

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG (FLEET, OPERATIONS & CUSTOMS)
-- -----------------------------------------------------------------------------

-- 13. Bảng TRIP_PLAN: Kế hoạch chuyến đi
CREATE TABLE TRIP_PLAN (
    TripID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    TotalDistance_km DECIMAL(10, 2) NULL,
    T_Total_Hours DECIMAL(10, 2) NULL,
    TotalCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL,
    -- Flow 1
    DeploymentStatus VARCHAR(12) NULL,
    DeploymentReason NVARCHAR(1000) NULL,
    DeploymentBy VARCHAR(50) NULL,
    DeploymentAtUtc DATETIME2(7) NULL,
    HandoffEventId VARCHAR(50) NULL,
    RowVersion ROWVERSION NOT NULL,
    AssignedSpecialistId VARCHAR(50) NULL,
    AssignedCoordinatorId VARCHAR(50) NULL,
    CONSTRAINT PK_TripPlan PRIMARY KEY (TripID),
    CONSTRAINT FK_TripPlan_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT CK_F1S_TRIP_PLAN_Deployment CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus]='ON_HOLD' OR [DeploymentStatus]='CONFIRMED' OR [DeploymentStatus]='PENDING') AND [DeploymentReason] IS NOT NULL AND [DeploymentBy] IS NOT NULL AND [DeploymentAtUtc] IS NOT NULL AND ([DeploymentStatus]='CONFIRMED' AND [HandoffEventId] IS NOT NULL OR ([DeploymentStatus]='ON_HOLD' OR [DeploymentStatus]='PENDING') AND [HandoffEventId] IS NULL)),
    CONSTRAINT CK_F1Final_Handoff CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus]='CONFIRMED' OR [DeploymentStatus]='PENDING')),
    CONSTRAINT FK_F1_Specialist FOREIGN KEY (AssignedSpecialistId) REFERENCES [USER](UserID),
    CONSTRAINT FK_F1_Coordinator FOREIGN KEY (AssignedCoordinatorId) REFERENCES [USER](UserID)
);

-- 14. Bảng VEHICLE: Quản lý xe chuyên dụng
CREATE TABLE VEHICLE (
    VehicleID VARCHAR(50) NOT NULL,
    Type VARCHAR(50) NULL,
    CapacityStalls INT NULL,
    MaxRange_km DECIMAL(10, 2) NULL,
    FuelCost_Per_Km DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_Vehicle PRIMARY KEY (VehicleID)
);

-- 15. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái
CREATE TABLE TRIP_VEHICLE_ASSIGNMENT (
    AssignmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    VehicleID VARCHAR(50) NOT NULL,
    DriverID VARCHAR(50) NOT NULL,
    EscortID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_TripVehicleAssignment PRIMARY KEY (AssignmentID),
    CONSTRAINT FK_TVA_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TVA_Vehicle FOREIGN KEY (VehicleID) REFERENCES VEHICLE(VehicleID),
    CONSTRAINT FK_TVA_Driver FOREIGN KEY (DriverID) REFERENCES [USER](UserID),
    CONSTRAINT FK_TVA_Escort FOREIGN KEY (EscortID) REFERENCES [USER](UserID)
);

-- 16. Bảng ROUTE_SEGMENT: Chặng đường & Đa phương thức
CREATE TABLE ROUTE_SEGMENT (
    SegmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    FacilityID VARCHAR(50) NULL, -- Trạm dừng liên kết
    LocationName NVARCHAR(255) NOT NULL,
    SegmentType VARCHAR(50) NULL,
    TransportMode VARCHAR(50) NOT NULL DEFAULT 'ROAD', -- ROAD, AIR, SEA
    CarrierName NVARCHAR(100) NULL, -- Hãng bay/tàu
    Flight_Voyage_No VARCHAR(50) NULL, -- Số chuyến bay/tàu
    ExpectedETA DATETIME NULL,
    ActualTime DATETIME NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_RouteSegment PRIMARY KEY (SegmentID),
    CONSTRAINT FK_RouteSegment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_RouteSegment_Facility FOREIGN KEY (FacilityID) REFERENCES PARTNER_FACILITY(FacilityID)
);

-- 17. (MỚI) Bảng FLIGHT_BOOKING: Quản lý đặt vé & dịch vụ bay chuyên chở ngựa (Air Leg)
CREATE TABLE FLIGHT_BOOKING (
    FlightBookingID INT IDENTITY(1,1) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    BookingVersion INT NOT NULL DEFAULT 1,
    RouteVersionID INT NULL,
    ProviderName NVARCHAR(200) NOT NULL,
    Airline NVARCHAR(100) NOT NULL,
    FlightNumber VARCHAR(50) NOT NULL,
    DepartureAirportCheckpointId INT NULL,
    ArrivalAirportCheckpointId INT NULL,
    DepartureAt DATETIME NOT NULL,
    ArrivalAt DATETIME NOT NULL,
    DirectFlight BIT NOT NULL DEFAULT 1,
    BookingReference VARCHAR(100) NOT NULL,
    BookingConfirmed BIT NOT NULL DEFAULT 1,
    HorseIds NVARCHAR(MAX) NULL,
    Note NVARCHAR(MAX) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_FlightBooking PRIMARY KEY (FlightBookingID),
    CONSTRAINT FK_FlightBooking_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID)
);

-- 18. (MỚI) Bảng CUSTOMS_CLEARANCE: Quản lý thông quan biên giới
CREATE TABLE CUSTOMS_CLEARANCE (
    ClearanceID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    SegmentID VARCHAR(50) NOT NULL,
    BorderCrossingName NVARCHAR(200) NULL,
    CustomsAgentName NVARCHAR(100) NULL,
    DocumentType VARCHAR(50) NULL, -- EXPORT, IMPORT, ATA_CARNET
    DeclarationNumber VARCHAR(100) NULL,
    Status VARCHAR(50) NOT NULL,
    ClearedAt DATETIME NULL,
    CONSTRAINT PK_CustomsClearance PRIMARY KEY (ClearanceID),
    CONSTRAINT FK_Customs_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Customs_Segment FOREIGN KEY (SegmentID) REFERENCES ROUTE_SEGMENT(SegmentID)
);

-- 19. Bảng HEALTH_LOG: Nhật ký sức khỏe ngựa trên đường
CREATE TABLE HEALTH_LOG (
    LogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    EscortID VARCHAR(50) NOT NULL,
    LogType VARCHAR(50) NULL,
    LogTime DATETIME NOT NULL DEFAULT GETDATE(),
    Temperature DECIMAL(4, 1) NULL,
    HeartRate INT NULL,
    HealthStatus NVARCHAR(100) NULL,
    Description NVARCHAR(MAX) NULL,
    MediaUrl VARCHAR(500) NULL,
    CONSTRAINT PK_HealthLog PRIMARY KEY (LogID),
    CONSTRAINT FK_HealthLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_HealthLog_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_HealthLog_Escort FOREIGN KEY (EscortID) REFERENCES [USER](UserID)
);

-- 20. Bảng INCIDENT: Báo cáo sự cố
CREATE TABLE INCIDENT (
    IncidentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    ApprovedBy VARCHAR(50) NULL,
    IncidentType VARCHAR(50) NULL,
    LocationCoordinates VARCHAR(100) NULL,
    Description NVARCHAR(MAX) NULL,
    ImageUrl VARCHAR(500) NULL,
    AdditionalCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_Incident PRIMARY KEY (IncidentID),
    CONSTRAINT FK_Incident_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Incident_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES [USER](UserID)
);

-- 21. Bảng HANDOVER: Biên bản giao nhận
CREATE TABLE HANDOVER (
    HandoverID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HandedByUserID VARCHAR(50) NOT NULL,
    Type VARCHAR(50) NULL, -- PICKUP / DELIVERY
    LocationName NVARCHAR(255) NULL,
    ReceiverName NVARCHAR(100) NULL,
    ReceiverPhone VARCHAR(20) NULL,
    IsAuthorized BIT NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_Handover PRIMARY KEY (HandoverID),
    CONSTRAINT FK_Handover_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Handover_HandedBy FOREIGN KEY (HandedByUserID) REFERENCES [USER](UserID)
);

-- 22. Bảng HANDOVER_ITEM: Chi tiết kiểm tra bàn giao
CREATE TABLE HANDOVER_ITEM (
    HandoverItemID VARCHAR(50) NOT NULL,
    HandoverID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    MicrochipVerified BIT NOT NULL DEFAULT 0,
    ConditionStatus NVARCHAR(100) NULL,
    AssetCheck NVARCHAR(MAX) NULL,
    PhotoUrl VARCHAR(500) NULL,
    CONSTRAINT PK_HandoverItem PRIMARY KEY (HandoverItemID),
    CONSTRAINT FK_HandoverItem_Handover FOREIGN KEY (HandoverID) REFERENCES HANDOVER(HandoverID),
    CONSTRAINT FK_HandoverItem_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH ĐA TIỀN TỆ (CONTRACT & BILLING)
-- -----------------------------------------------------------------------------

-- 23. (MỚI) Bảng CONTRACT_TEMPLATE: Quản lý Nội dung hợp đồng mẫu
CREATE TABLE CONTRACT_TEMPLATE (
    TemplateID VARCHAR(50) NOT NULL,
    TemplateName NVARCHAR(255) NOT NULL,
    LanguageCode VARCHAR(10) NOT NULL DEFAULT 'VI',
    BodyContent NVARCHAR(MAX) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_ContractTemplate PRIMARY KEY (TemplateID)
);

-- 24. Bảng CONTRACT: Hợp đồng với khách hàng
CREATE TABLE CONTRACT (
    CommercialNotes NVARCHAR(2000) NULL,
    ContractID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NULL,
    CustomerID VARCHAR(50) NOT NULL,
    ContractCode VARCHAR(50) NOT NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'USD',
    TotalQuotedPrice DECIMAL(12, 2) NULL,
    DepositRateStandard DECIMAL(5, 2) NULL,
    SignedAt DATETIME NULL,
    ContractStatus VARCHAR(50) NOT NULL,
    -- Flow 1
    RequestID VARCHAR(50) NOT NULL,
    CompletionDeadline DATETIME2(7) NULL,
    PdfUrl VARCHAR(500) NULL,
    SignOtpHash VARCHAR(255) NULL,
    SignOtpExpiry DATETIME2(7) NULL,
    SignOtpFailedAttempts INT NOT NULL CONSTRAINT DF_F1S_CONTRACT_SignOtpFailedAttempts DEFAULT ((0)),
    DepositAmount DECIMAL(12,2) NULL,
    PdfSha256 CHAR(64) NULL,
    SignOtpSentAtUtc DATETIME2(7) NULL,
    SignerEmail VARCHAR(255) NULL,
    PublishedAtUtc DATETIME2(7) NULL,
    PublishedBy VARCHAR(50) NULL,
    LastExtensionReason NVARCHAR(1000) NULL,
    LastExtensionBy VARCHAR(50) NULL,
    LastExtensionAtUtc DATETIME2(7) NULL,
    CancellationId VARCHAR(50) NULL,
    CancellationStatus VARCHAR(12) NULL,
    CancellationReason NVARCHAR(1000) NULL,
    CancellationRequestedAtUtc DATETIME2(7) NULL,
    CancellationDecisionReason NVARCHAR(1000) NULL,
    CancellationDecidedBy VARCHAR(50) NULL,
    CancellationDecidedAtUtc DATETIME2(7) NULL,
    RowVersion ROWVERSION NOT NULL,
    CustomerFeedback NVARCHAR(2000) NULL,
    FeedbackFields VARCHAR(200) NULL,
    FeedbackStatus VARCHAR(20) NULL,
    FeedbackAtUtc DATETIME2(7) NULL,
    ManagerFeedback NVARCHAR(2000) NULL,
    FeedbackHandledAtUtc DATETIME2(7) NULL,
    RefundAmount DECIMAL(12,2) NULL,
    RefundStatus VARCHAR(20) NULL,
    RefundReference VARCHAR(100) NULL,
    CONSTRAINT PK_Contract PRIMARY KEY (ContractID),
    CONSTRAINT FK_Contract_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Contract_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_CONTRACT_PdfUrl CHECK ([PdfUrl] IS NULL OR [PdfUrl] like 'private/%' AND len([PdfUrl])>(8)),
    CONSTRAINT CK_F1S_CONTRACT_Deposit CHECK ([DepositAmount] IS NULL OR [CurrencyCode]='VND' AND [TotalQuotedPrice] IS NOT NULL AND [TotalQuotedPrice]>(0) AND [TotalQuotedPrice]=round([TotalQuotedPrice],(0)) AND [DepositRateStandard] IS NOT NULL AND [DepositRateStandard]>(0) AND [DepositRateStandard]<=(100) AND [DepositAmount]>(0) AND [DepositAmount]<=[TotalQuotedPrice] AND [DepositAmount]=round(([TotalQuotedPrice]*[DepositRateStandard])/(100),(0))),
    CONSTRAINT CK_F1S_CONTRACT_Pdf CHECK ([PdfUrl] IS NULL AND [PdfSha256] IS NULL OR [PdfUrl] IS NOT NULL AND [PdfSha256] IS NOT NULL AND len([PdfSha256])=(64) AND NOT [PdfSha256] like ('%[^0-9a-f]%') collate Latin1_General_100_BIN2),
    CONSTRAINT CK_F1S_CONTRACT_Publication CHECK ([PublishedAtUtc] IS NULL OR [PublishedBy] IS NOT NULL AND [PdfUrl] IS NOT NULL AND [PdfSha256] IS NOT NULL AND [DepositAmount] IS NOT NULL AND [CompletionDeadline] IS NOT NULL),
    CONSTRAINT CK_F1S_CONTRACT_OtpAttempts CHECK ([SignOtpFailedAttempts]>=(0) AND [SignOtpFailedAttempts]<=(5)),
    CONSTRAINT CK_F1S_CONTRACT_Otp CHECK ([SignOtpHash] IS NULL OR len([SignOtpHash])=(64) AND NOT [SignOtpHash] like ('%[^0-9a-f]%') collate Latin1_General_100_BIN2 AND [SignOtpExpiry] IS NOT NULL AND [SignOtpSentAtUtc] IS NOT NULL AND [SignOtpExpiry]>[SignOtpSentAtUtc] AND [PublishedAtUtc] IS NOT NULL AND [SignedAt] IS NULL),
    CONSTRAINT CK_F1S_CONTRACT_SignDeadline CHECK (CompletionDeadline IS NULL OR PublishedAtUtc IS NULL OR CompletionDeadline>PublishedAtUtc),
    CONSTRAINT CK_F1S_CONTRACT_Signed CHECK (PublishedAtUtc IS NULL OR SignedAt IS NULL OR (SignerEmail IS NOT NULL AND CompletionDeadline IS NOT NULL AND CompletionDeadline>SignedAt AND SignOtpHash IS NULL)),
    CONSTRAINT CK_F1S_CONTRACT_Extension CHECK ([LastExtensionReason] IS NULL AND [LastExtensionBy] IS NULL AND [LastExtensionAtUtc] IS NULL OR [LastExtensionReason] IS NOT NULL AND [LastExtensionBy] IS NOT NULL AND [LastExtensionAtUtc] IS NOT NULL),
    CONSTRAINT CK_F1S_CONTRACT_Cancellation CHECK ([CancellationId] IS NULL AND [CancellationStatus] IS NULL AND [CancellationReason] IS NULL AND [CancellationRequestedAtUtc] IS NULL AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR [CancellationId] IS NOT NULL AND [CancellationStatus] IS NOT NULL AND [CancellationReason] IS NOT NULL AND [CancellationRequestedAtUtc] IS NOT NULL AND ([CancellationStatus]='PENDING' AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR ([CancellationStatus]='REJECTED' OR [CancellationStatus]='APPROVED') AND [CancellationDecisionReason] IS NOT NULL AND [CancellationDecidedBy] IS NOT NULL AND [CancellationDecidedAtUtc] IS NOT NULL)),
    CONSTRAINT CK_F1Final_Feedback CHECK ([FeedbackStatus] IS NULL OR ([FeedbackStatus]='REJECTED' OR [FeedbackStatus]='ACCEPTED' OR [FeedbackStatus]='PENDING') AND [CustomerFeedback] IS NOT NULL AND [FeedbackFields] IS NOT NULL AND [FeedbackAtUtc] IS NOT NULL),
    CONSTRAINT CK_F1Final_Refund CHECK ([RefundStatus] IS NULL AND [RefundAmount] IS NULL AND [RefundReference] IS NULL OR ([RefundStatus]='COMPLETED' OR [RefundStatus]='PROCESSING' OR [RefundStatus]='REQUESTED') AND [RefundAmount]>(0) AND ([RefundStatus]<>'COMPLETED' OR [RefundReference] IS NOT NULL)),
    CONSTRAINT FK_Contract_Request FOREIGN KEY (RequestID) REFERENCES [TRANSPORT_REQUEST](RequestID)
);

-- 25. Bảng COST_ITEM: Các khoản mục chi phí thực tế
CREATE TABLE COST_ITEM (
    CostItemID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    CategoryName NVARCHAR(100) NULL,
    SubcodeName NVARCHAR(100) NULL,
    Bearer VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'USD',
    TotalMoney DECIMAL(12, 2) NULL,
    EvidenceUrl VARCHAR(500) NULL,
    CONSTRAINT PK_CostItem PRIMARY KEY (CostItemID),
    CONSTRAINT FK_CostItem_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID)
);

-- 26. Bảng INVOICE: Hóa đơn cho khách hàng
CREATE TABLE INVOICE (
    InvoiceID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    InvoiceType VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'USD',
    TotalPayableAmount DECIMAL(12, 2) NOT NULL,
    PaidAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    DueDate DATETIME NULL,
    PaymentStatus VARCHAR(50) NOT NULL,
    CONSTRAINT PK_Invoice PRIMARY KEY (InvoiceID),
    CONSTRAINT FK_Invoice_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID)
);

-- 27. Bảng PAYMENT: Giao dịch thanh toán thực tế
CREATE TABLE PAYMENT (
    PaymentID VARCHAR(50) NOT NULL,
    InvoiceID VARCHAR(50) NOT NULL,
    ConfirmedByUserID VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'USD',
    Amount DECIMAL(12, 2) NOT NULL,
    Method VARCHAR(50) NULL,
    TransactionCode VARCHAR(100) NULL,
    Status VARCHAR(50) NOT NULL,
    PaymentDate DATETIME NOT NULL DEFAULT GETDATE(),
    -- Flow 1
    VnpayBankCode VARCHAR(50) NULL,
    VnpayResponseCode VARCHAR(10) NULL,
    VnpayTransactionStatus VARCHAR(10) NULL,
    VnpayTmnCode VARCHAR(8) NULL,
    VnpayCreatedAtUtc DATETIME2(7) NULL,
    VnpayExpiresAtUtc DATETIME2(7) NULL,
    VnpayReceivedAmount DECIMAL(12,2) NULL,
    FinancialReviewRequired BIT NOT NULL CONSTRAINT DF_F1S_PAYMENT_FinancialReviewRequired DEFAULT ((0)),
    FinancialReviewReason NVARCHAR(1000) NULL,
    FinancialReviewedBy VARCHAR(50) NULL,
    FinancialReviewedAtUtc DATETIME2(7) NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT PK_Payment PRIMARY KEY (PaymentID),
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY (InvoiceID) REFERENCES INVOICE(InvoiceID),
    CONSTRAINT FK_Payment_ConfirmedBy FOREIGN KEY (ConfirmedByUserID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_PAYMENT_Attempt CHECK ([VnpayTmnCode] IS NULL OR [Method] IS NOT NULL AND [Method]='VNPAY' AND [CurrencyCode]='VND' AND [Amount]>(0) AND [Amount]=round([Amount],(0)) AND [VnpayCreatedAtUtc] IS NOT NULL AND [VnpayExpiresAtUtc] IS NOT NULL AND [VnpayExpiresAtUtc]>[VnpayCreatedAtUtc] AND ([Status]='REVIEW_REQUIRED' OR [Status]='SUCCESS' OR [Status]='FAILED' OR [Status]='PENDING_GATEWAY')),
    CONSTRAINT CK_F1S_PAYMENT_Success CHECK ([VnpayTmnCode] IS NULL OR [Status]<>'SUCCESS' OR [VnpayResponseCode] IS NOT NULL AND [VnpayResponseCode]='00' AND [VnpayTransactionStatus] IS NOT NULL AND [VnpayTransactionStatus]='00' AND [TransactionCode] IS NOT NULL AND [VnpayReceivedAmount] IS NOT NULL AND [VnpayReceivedAmount]=[Amount]),
    CONSTRAINT CK_F1S_PAYMENT_Received CHECK ([VnpayReceivedAmount] IS NULL OR [VnpayReceivedAmount]>(0) AND [VnpayReceivedAmount]=round([VnpayReceivedAmount],(0))),
    CONSTRAINT CK_F1S_PAYMENT_Review CHECK ([FinancialReviewRequired]=(0) OR [FinancialReviewReason] IS NOT NULL),
    CONSTRAINT CK_F1S_PAYMENT_Reviewer CHECK ([FinancialReviewedBy] IS NULL AND [FinancialReviewedAtUtc] IS NULL OR [FinancialReviewedBy] IS NOT NULL AND [FinancialReviewedAtUtc] IS NOT NULL)
);


-- 28. COST_RATE: Don gia tinh 5 nhom chi phi (VND)
CREATE TABLE COST_RATE (
    CostRateID varchar(50) NOT NULL CONSTRAINT PK_COST_RATE PRIMARY KEY,
    Code varchar(50) NOT NULL CONSTRAINT UQ_COST_RATE_Code UNIQUE,
    CostGroup varchar(20) NOT NULL,
    CalculationUnit varchar(40) NOT NULL,
    Rate decimal(18,6) NOT NULL,
    CurrencyCode varchar(3) NOT NULL CONSTRAINT DF_COST_RATE_Currency DEFAULT 'VND',
    IsActive bit NOT NULL CONSTRAINT DF_COST_RATE_Active DEFAULT 1,
    RowVersion rowversion NOT NULL,
    CONSTRAINT CK_COST_RATE_Value CHECK (Rate>0 AND (Code<>'INSURANCE_RATE' OR Rate<=1)),
    CONSTRAINT CK_COST_RATE_Currency CHECK (CurrencyCode='VND'),
    CONSTRAINT CK_COST_RATE_Group CHECK (CostGroup IN ('TRANSPORT','CREW','PERMIT','VET','INSURANCE'))
);

-- Flow 1: Chi muc bao ve quan he va giao dich khong trung lap.
CREATE UNIQUE INDEX UX_INVOICE_ContractID_Deposit ON [INVOICE] ([ContractID]) WHERE ([InvoiceType]='DEPOSIT');
CREATE UNIQUE INDEX UX_F1S_VnpayReceipt ON [PAYMENT] ([VnpayTmnCode], [TransactionCode]) WHERE ([VnpayTmnCode] IS NOT NULL AND [TransactionCode] IS NOT NULL AND [Status]='SUCCESS');
CREATE INDEX IX_F1S_OtpBudget ON [NOTIFICATION] ([UserID], [Type], [Channel], [SentAt]);
CREATE UNIQUE INDEX UX_F1N_RequestSubmission ON [TRANSPORT_REQUEST] ([CustomerID], [SubmissionKeyHash]) WHERE ([SubmissionKeyHash] IS NOT NULL);
CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON [TRIP_PLAN] ([RequestID]);
CREATE INDEX IX_CONTRACT_RequestID ON [CONTRACT] ([RequestID]);
CREATE UNIQUE INDEX UX_CONTRACT_RequestID ON [CONTRACT] ([RequestID]);

GO

-- DataSet
-- =============================================================================
-- PHÂN VÙNG 1: QUẢN TRỊ NGƯỜI DÙNG, TÀI SẢN & PHÁP LÝ HỆ THỐNG
-- =============================================================================

-- 1. Bảng USER: Đầy đủ các Actor theo phân quyền (có cả tài khoản hoạt động và bị khóa)
-- Include new columns ForgotPasswordRequest and ResetPasswordRequest (nullable)
INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, ForgotPasswordRequest, ResetPasswordRequest, IsActive) VALUES
('USR_CUST_01', 'nguyenvana',     'HASH_SECURE_01', 'Customer',   N'Nguyễn Văn A (CLB Hà Nội)',         'vana.horse@gmail.com',        '0901234567', NULL, NULL, 1),
('USR_CUST_02', 'tranvanb',      'HASH_SECURE_02', 'Customer',   N'Trần Văn B (Trang trại Sài Gòn)',   'tranb.racing@gmail.com',      '0908889999', NULL, NULL, 1),
('USR_CUST_03', 'lethic_locked', 'HASH_SECURE_03', 'Customer',   N'Lê Thị C (Khách vi phạm)',          'lethic.locked@gmail.com',     '0911223344', NULL, NULL, 0),
('USR_MGR_01',  'manager_linh',  'HASH_SECURE_04', 'Manager',    N'Trần Thị Linh (Logistics Manager)', 'linh.manager@cbntransport.com','0912345678', NULL, NULL, 1),
('USR_SPEC_01', 'spec_tuan',     'HASH_SECURE_05', 'Specialist', N'Lê Tuấn (Thẩm định pháp lý/thú y)', 'tuan.specialist@cbntransport.com','0923456789', NULL, NULL, 1),
('USR_COORD_01','coord_hai',     'HASH_SECURE_06', 'Coordinator',N'Phạm Hải (Điều phối xe & tuyến)',   'hai.coord@cbntransport.com',  '0934567890', NULL, NULL, 1),
('USR_DRV_01',  'driver_hung',   'HASH_SECURE_07', 'Driver',     N'Hoàng Hùng (Tài xế quốc tế 1)',     'hung.driver@cbntransport.com','0945678901', NULL, NULL, 1),
('USR_DRV_02',  'driver_thanh',  'HASH_SECURE_08', 'Driver',     N'Vũ Thành (Tài xế quốc tế 2)',       'thanh.driver@cbntransport.com','0946789012', NULL, NULL, 1),
('USR_ESC_01',  'escort_hoa',    'HASH_SECURE_09', 'Escort',     N'BS. Đỗ Hoa (Bác sĩ thú y áp tải)', 'hoa.escort@cbntransport.com', '0956789012', NULL, NULL, 1),
('USR_ESC_02',  'escort_nam',    'HASH_SECURE_10', 'Escort',     N'BS. Phan Nam (Kỹ thuật viên ngựa)',  'nam.escort@cbntransport.com', '0957890123', NULL, NULL, 1);

-- 2. Bảng HORSE: Đa dạng cá thể (Ngựa đực Stallion, Ngựa cái Mare, Ngựa thiến Gelding)
INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB) VALUES
('HRS_001', 'USR_CUST_01', '981098102938475', 'VN_FEI_2026_01', N'Tia Chớp Đỏ (Red Lightning)', N'Thoroughbred', 'Stallion', 'Intact',       520.50, '2020-04-15'),
('HRS_002', 'USR_CUST_01', '981098102938476', 'VN_FEI_2026_02', N'Bão Táp Xanh (Blue Storm)',   N'Arabian',      'Mare',     'Non-Pregnant', 485.00, '2021-06-20'),
('HRS_003', 'USR_CUST_02', '981098102938477', 'VN_FEI_2026_03', N'Bạch Mã Hoàng Tử (Prince)',  N'Thoroughbred', 'Gelding',  'Gelded',       540.00, '2019-09-10'),
('HRS_004', 'USR_CUST_02', '981098102938478', 'VN_FEI_2026_04', N'Nữ Hoàng Cát (Desert Queen)', N'Warmblood',    'Mare',     'Pregnant',     510.00, '2020-11-05'),
('HRS_005', 'USR_CUST_03', '981098102938479', 'VN_FEI_2026_05', N'Chiến Binh Đen (Black Knight)',N'Friesian',    'Stallion', 'Intact',       560.00, '2018-03-12');

-- 3. Bảng STAFF_DOCUMENT: Giấy phép, Hộ chiếu, Visa nhân sự (Có hồ sơ hợp lệ và hồ sơ sắp hết hạn)
INSERT INTO STAFF_DOCUMENT (DocumentID, UserID, DocType, CountryOfIssue, ValidForCountries, IssueDate, ExpiryDate, DocumentUrl, Status) VALUES
('DOC_STF_01', 'USR_DRV_01', 'PASSPORT',        'VNM', 'LAO, THA, KHM', '2023-01-10', '2033-01-10', 'https://storage.cbntransport.com/docs/pass_hung.pdf', 'VALID'),
('DOC_STF_02', 'USR_DRV_01', 'DRIVING_LICENSE', 'VNM', 'VNM, LAO',      '2022-05-15', '2027-05-15', 'https://storage.cbntransport.com/docs/lic_hung.pdf',  'VALID'),
('DOC_STF_03', 'USR_ESC_01', 'PASSPORT',        'VNM', 'LAO, THA',      '2024-02-01', '2034-02-01', 'https://storage.cbntransport.com/docs/pass_hoa.pdf',  'VALID'),
('DOC_STF_04', 'USR_DRV_02', 'PASSPORT',        'VNM', 'KHM, THA',      '2022-08-10', '2032-08-10', 'https://storage.cbntransport.com/docs/pass_thanh.pdf', 'VALID'),
('DOC_STF_05', 'USR_ESC_02', 'PASSPORT',        'VNM', 'KHM, LAO',      '2021-03-01', '2026-10-25', 'https://storage.cbntransport.com/docs/pass_nam.pdf',   'EXPIRING_SOON');

-- 4. Bảng NOTIFICATION: Lịch sử thông báo hệ thống gửi qua App/Email/SMS
INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt) VALUES
('NOTIF_001', 'USR_CUST_01', 'REQ_2026_001', 'ORDER_STATUS', 'APP_PUSH', N'Yêu cầu vận chuyển được duyệt',   N'Đơn REQ_2026_001 của bạn đã được phê duyệt.', 1, '2026-10-01 08:30:00'),
('NOTIF_002', 'USR_DRV_01',  'TRIP_2026_001', 'TRIP_ASSIGN',  'SMS',      N'Lệnh điều xe mới',                 N'Bạn được phân công làm tài xế chính chuyến TRIP_2026_001.', 1, '2026-10-03 09:00:00'),
('NOTIF_003', 'USR_CUST_02', 'INC_002',       'INCIDENT',     'EMAIL',    N'Cảnh báo sự cố hiện trường',      N'Xe vận chuyển gặp sự cố nổ lốp nhẹ, lộ trình chậm 1h30m.', 1, '2026-10-06 11:00:00'),
('NOTIF_004', 'USR_SPEC_01', 'REC_006',       'DOC_WARNING',  'WEB_ALERT',N'Hồ sơ xét nghiệm bị từ chối',     N'Mã xét nghiệm Coggins của ngựa HRS_005 đã quá 6 tháng.', 0, '2026-10-08 14:00:00');

-- 5. Bảng POLICY_AND_TERM: Quản lý điều khoản và chính sách áp dụng
INSERT INTO POLICY_AND_TERM (PolicyID, PolicyType, Title, Content, Version, EffectiveDate, IsActive, CreatedBy, CreatedAt) VALUES
('POL_001', 'TERMS_OF_SERVICE', N'Điều khoản Vận chuyển Động vật Sống Xuyên Biên giới', N'<p>Quy định chi tiết về quyền bồi thường bảo hiểm, phí lưu chuồng trạm kiểm dịch...</p>', 'v1.0', '2026-01-01', 1, 'USR_MGR_01', '2026-01-01 00:00:00'),
('POL_002', 'TRANSPORT_RULE',   N'Quy chế Dinh dưỡng và Nghỉ ngơi cho Ngựa Đua',         N'<p>Bắt buộc dừng nghỉ mỗi 4-6 giờ đường bộ, cho uống nước bù điện giải định kỳ.</p>',       'v1.1', '2026-03-01', 1, 'USR_SPEC_01','2026-03-01 00:00:00');

-- 6. Bảng CONTRACT_TEMPLATE: Biểu mẫu hợp đồng chuẩn hóa
INSERT INTO CONTRACT_TEMPLATE (TemplateID, TemplateName, LanguageCode, BodyContent, IsActive, CreatedAt) VALUES
('TMPL_001', N'Mẫu Hợp Đồng Vận Tải Ngựa Quốc Tế (Đường Bộ)', 'VI', N'<article>Nội dung mẫu hợp đồng giao nhận ngựa chuyên dụng...</article>', 1, '2026-01-01 00:00:00'),
('TMPL_002', N'International Racehorse Transport Agreement', 'EN', N'<article>Terms and conditions for cross-border equine transport...</article>', 1, '2026-01-01 00:00:00');

-- =============================================================================
-- PHÂN VÙNG 2: ĐỐI TÁC & TRẠM DỪNG NGHỈ/Y TẾ (PARTNER & FACILITY)
-- =============================================================================

-- 7. Bảng PARTNER_FACILITY: Các trạm dừng nghỉ, phòng khám thú y đối tác
INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, CountryCode, State_Province, City, Address, Coordinates, TimeZone, CapacityStalls, ContactPerson, ContactPhone, TaxID_BusinessCode, Status) VALUES
('FAC_001', N'Trạm Kiểm Dịch & Nghỉ Chân Cầu Treo', 'REST_STATION', 'VN', N'Hà Tĩnh',   N'Hương Sơn',   N'Cửa khẩu Quốc tế Cầu Treo, Hà Tĩnh', '18.3976,105.1842', 'UTC+7', 8,  N'Lê Văn Bình',   '0988112233', '2801928374', 'ACTIVE'),
('FAC_002', N'Bệnh Viện Thú Y & Kiểm Dịch Vientiane', 'VET_CLINIC', 'LA', N'Vientiane', N'Vientiane', N'Km 12 Thadeua Road, Vientiane',       '17.9254,102.6645', 'UTC+7', 12, N'Dr. Somchai',   '+8562055667788', 'LA99281726', 'ACTIVE'),
('FAC_003', N'Trạm Dịch Vụ Nghỉ Chân Mộc Bài',      'REST_STATION', 'VN', N'Tây Ninh',  N'Bến Cầu',     N'Khu Kinh tế Cửa khẩu Mộc Bài',       '11.0650,106.1720', 'UTC+7', 6,  N'Trần Minh Tâm', '0918776655', '3901827364', 'ACTIVE'),
('FAC_004', N'Trung Tâm Thú Y Hoàng Gia Phnom Penh', 'VET_CLINIC',  'KH', N'Phnom Penh',N'Phnom Penh',  N'St. 271, Sangkat Boeung Tumpun',     '11.5560,104.9280', 'UTC+7', 10, N'Dr. Chea Rath', '+85512345678', 'KH88192837', 'ACTIVE'),
('FAC_005', N'Trạm Nghỉ Chuyên Dụng Đà Nẵng',       'REST_STATION', 'VN', N'Đà Nẵng',   N'Hòa Vang',    N'Km 24 Đường Tránh Nam Hải Vân',      '16.0544,108.2022', 'UTC+7', 8,  N'Đặng Quốc Bảo', '0905123123', '0401928381', 'ACTIVE');

-- 8. Bảng FACILITY_CONTRACT: Hợp đồng nguyên tắc biểu phí lưu chuồng và dịch vụ
INSERT INTO FACILITY_CONTRACT (FacilityContractID, FacilityID, ContractCode, ValidFrom, ValidTo, RestFeePerHorse_Day, BasicMedicalCheckFee, DocumentUrl, Status) VALUES
('FC_001', 'FAC_001', 'FC_CAUTREO_2026',   '2026-01-01', '2026-12-31', 45.00, 25.00, 'https://storage.cbntransport.com/contracts/fc_cautreo.pdf',   'ACTIVE'),
('FC_002', 'FAC_002', 'FC_VIENTIANE_2026', '2026-01-01', '2026-12-31', 60.00, 40.00, 'https://storage.cbntransport.com/contracts/fc_vientiane.pdf', 'ACTIVE'),
('FC_003', 'FAC_003', 'FC_MOCBAI_2026',    '2026-01-01', '2026-12-31', 40.00, 20.00, 'https://storage.cbntransport.com/contracts/fc_mocbai.pdf',    'ACTIVE'),
('FC_004', 'FAC_004', 'FC_PHNOMPENH_2026', '2026-01-01', '2026-12-31', 55.00, 35.00, 'https://storage.cbntransport.com/contracts/fc_phnompenh.pdf', 'ACTIVE');

-- 9. Bảng FACILITY_CERTIFICATION: Chứng chỉ tiêu chuẩn vệ sinh thú y của trạm
INSERT INTO FACILITY_CERTIFICATION (CertID, FacilityID, CertName, IssuedBy, CountryOfIssue, IsInternationalStandard, IssueDate, ExpiryDate, DocumentUrl) VALUES
('CERT_001', 'FAC_001', N'Chứng nhận Kiểm dịch Thú y Cửa khẩu', N'Cục Thú Y Việt Nam', 'VN', 1, '2025-01-10', '2027-01-10', 'https://storage.cbntransport.com/certs/cautreo_cert.pdf'),
('CERT_002', 'FAC_002', N'Chứng chỉ Tiêu chuẩn OIE Vientiane',  N'Bộ Nông nghiệp Lào', 'LA', 1, '2024-05-20', '2027-05-20', 'https://storage.cbntransport.com/certs/lao_cert.pdf'),
('CERT_003', 'FAC_004', N'ASEAN Equine Biosecurity Accredited', N'Bộ Nông Lâm Campuchia', 'KH', 1, '2025-03-15', '2028-03-15', 'https://storage.cbntransport.com/certs/kh_cert.pdf');

-- =============================================================================
-- PHÂN VÙNG 3: YÊU CẦU & KIỂM DỊCH PHÁP LÝ (REQUEST & LEGAL)
-- =============================================================================

-- 10. Bảng TRANSPORT_REQUEST: 4 đơn đại diện cho 4 tình huống khác nhau
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status) VALUES
('REQ_2026_001', 'USR_CUST_01', N'Trang trại Sóc Sơn, Hà Nội', N'CLB Đua Ngựa Hoàng Gia Bangkok, Thái Lan', N'Thi đấu Cúp Hoàng Gia', 'ROAD_CROSS_BORDER', '2026-09-15 06:00:00', '2026-09-18 18:00:00', N'Mr. Kraisak',   '+66812345678', 8500.00, 'COMPLETED'),
('REQ_2026_002', 'USR_CUST_02', N'Trại ngựa Củ Chi, TP.HCM',   N'Trường đua Chroy Changvar, Phnom Penh',   N'Giao lưu huấn luyện',   'ROAD_CROSS_BORDER', '2026-10-05 05:00:00', '2026-10-06 17:00:00', N'Sokha Heng',    '+85598765432', 4200.00, 'COMPLETED_LATE'),
('REQ_2026_003', 'USR_CUST_01', N'Trang trại Sóc Sơn, Hà Nội', N'Trại ngựa Phú Thọ, TP.HCM',             N'Nhân giống thuần chủng', 'ROAD_DOMESTIC',     '2026-10-08 07:00:00', '2026-10-11 20:00:00', N'Nguyễn Hoàng', '0903334455',   5800.00, 'IN_PROGRESS'),
('REQ_2026_004', 'USR_CUST_03', N'Khu huấn luyện Ba Vì, Hà Nội',N'Trường đua Thể thao Singapore',          N'Bán chuyển nhượng',     'MULTIMODAL_INTL',   '2026-10-20 08:00:00', '2026-10-24 16:00:00', N'David Tan',    '+6591112222',  12000.00,'REJECTED');

-- 11. Bảng REQUEST_HORSE_MAPPING: Gán các cá thể ngựa vào từng yêu cầu
INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES
('RHM_001', 'REQ_2026_001', 'HRS_001'),
('RHM_002', 'REQ_2026_001', 'HRS_002'),
('RHM_003', 'REQ_2026_002', 'HRS_003'),
('RHM_004', 'REQ_2026_003', 'HRS_001'),
('RHM_005', 'REQ_2026_004', 'HRS_005');

-- 12. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ thú y (Đủ điều kiện, Đang chờ duyệt, Bị từ chối do hết hạn)
INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, VerifiedBy, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl, ExpiryDate) VALUES
('REC_001', 'HRS_001', 'REQ_2026_001', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs1.pdf', '2026-12-01'),
('REC_002', 'HRS_001', 'REQ_2026_001', 'USR_SPEC_01', 'EQUINE_FLU_VAX', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/flu_hrs1.pdf',     '2027-01-15'),
('REC_003', 'HRS_002', 'REQ_2026_001', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs2.pdf', '2026-12-01'),
('REC_004', 'HRS_003', 'REQ_2026_002', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs3.pdf', '2026-11-20'),
('REC_005', 'HRS_001', 'REQ_2026_003', 'USR_SPEC_01', 'DOMESTIC_VET_PASS','MANDATORY','VERIFIED', 'https://storage.cbntransport.com/docs/vet_dom_hrs1.pdf','2027-05-10'),
('REC_006', 'HRS_005', 'REQ_2026_004', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'EXPIRED',  'https://storage.cbntransport.com/docs/coggins_exp_hrs5.pdf','2026-08-01');

-- 13. Bảng QUARANTINE_BOOKING: Đặt lịch cách ly tiền xuất/hậu nhập cảnh
INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status) VALUES
('QBK_001', 'REQ_2026_001', 'FAC_002', N'Bệnh Viện Thú Y & Kiểm Dịch Vientiane', 'Lào',        '2026-09-16 14:00:00', '2026-09-17 08:00:00', 'CFM_LAO_99881', 'COMPLETED'),
('QBK_002', 'REQ_2026_002', 'FAC_004', N'Trung Tâm Thú Y Hoàng Gia Phnom Penh', 'Campuchia', '2026-10-05 16:00:00', '2026-10-06 08:00:00', 'CFM_KHM_11223', 'COMPLETED');

-- =============================================================================
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG (OPERATIONS & CUSTOMS)
-- =============================================================================

-- 14. Bảng TRIP_PLAN: Kế hoạch các chuyến đi
INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status) VALUES
('TRIP_2026_001', 'REQ_2026_001', 1250.00, 36.50, 6200.00, 'COMPLETED'),
('TRIP_2026_002', 'REQ_2026_002', 240.00,  8.00,  3100.00, 'COMPLETED'),
('TRIP_2026_003', 'REQ_2026_003', 1720.00, 42.00, 4300.00, 'IN_TRANSIT');

-- 15. Bảng VEHICLE: Đội xe chuyên dụng chở ngựa đua
INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status) VALUES
('VEH_BOX_01', 'HORSEBOX_3_STALLS', 3, 900.00,  1.20, 'AVAILABLE'),
('VEH_BOX_02', 'HORSEBOX_6_STALLS', 6, 1200.00, 1.80, 'ON_TRIP'),
('VEH_BOX_03', 'HORSEBOX_2_STALLS', 2, 750.00,  1.00, 'MAINTENANCE');

-- 16. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái
INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, VehicleID, DriverID, EscortID) VALUES
('TVA_001', 'TRIP_2026_001', 'VEH_BOX_01', 'USR_DRV_01', 'USR_ESC_01'),
('TVA_002', 'TRIP_2026_002', 'VEH_BOX_03', 'USR_DRV_02', 'USR_ESC_02'),
('TVA_003', 'TRIP_2026_003', 'VEH_BOX_02', 'USR_DRV_01', 'USR_ESC_01');

-- 17. (MỚI) Bảng FLIGHT_BOOKING: Đặt dịch vụ vận chuyển hàng không mẫu
SET IDENTITY_INSERT FLIGHT_BOOKING ON;
INSERT INTO FLIGHT_BOOKING (FlightBookingID, TripID, BookingVersion, RouteVersionID, ProviderName, Airline, FlightNumber, DepartureAirportCheckpointId, ArrivalAirportCheckpointId, DepartureAt, ArrivalAt, DirectFlight, BookingReference, BookingConfirmed, HorseIds, Note, CreatedAt) VALUES
(300, 'TRIP_2026_001', 1, 120, N'Nippon Cargo Airlines', N'NCA Airlines', 'KZ-102', 101, 201, '2026-11-20 05:00:00', '2026-11-20 11:00:00', 1, 'NCA-SGN-NRT-2026', 1, '["HRS_001","HRS_002"]', N'Chuyến bay thẳng chuyên chở động vật thể thao SGN -> NRT', '2026-10-01 08:00:00');
SET IDENTITY_INSERT FLIGHT_BOOKING OFF;

-- 18. Bảng ROUTE_SEGMENT: Phân đoạn lộ trình của các chuyến đi
INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, FacilityID, LocationName, SegmentType, TransportMode, CarrierName, Flight_Voyage_No, ExpectedETA, ActualTime, Status) VALUES
-- Tuyến 1: Hà Nội -> Bangkok
('SEG_101', 'TRIP_2026_001', 'FAC_001', N'Sóc Sơn -> Cửa khẩu Cầu Treo',       'REST_STOP',       'ROAD', NULL, NULL, '2026-09-15 15:00:00', '2026-09-15 14:50:00', 'COMPLETED'),
('SEG_102', 'TRIP_2026_001', 'FAC_002', N'Cầu Treo -> Trạm Thú Y Vientiane',   'QUARANTINE_STOP', 'ROAD', NULL, NULL, '2026-09-16 13:00:00', '2026-09-16 13:10:00', 'COMPLETED'),
('SEG_103', 'TRIP_2026_001', NULL,      N'Vientiane -> CLB Hoàng Gia Bangkok', 'DESTINATION',     'ROAD', NULL, NULL, '2026-09-17 18:00:00', '2026-09-17 17:30:00', 'COMPLETED'),
-- Tuyến 2: TP.HCM -> Phnom Penh
('SEG_201', 'TRIP_2026_002', 'FAC_003', N'Củ Chi -> Cửa khẩu Mộc Bài',         'BORDER_CHECK',    'ROAD', NULL, NULL, '2026-10-05 08:30:00', '2026-10-05 09:15:00', 'COMPLETED'),
('SEG_202', 'TRIP_2026_002', 'FAC_004', N'Mộc Bài -> Trường đua Phnom Penh',   'DESTINATION',     'ROAD', NULL, NULL, '2026-10-05 16:00:00', '2026-10-05 18:30:00', 'COMPLETED'),
-- Tuyến 3: Hà Nội -> TP.HCM (Đang chạy, vừa qua trạm Đà Nẵng)
('SEG_301', 'TRIP_2026_003', 'FAC_005', N'Hà Nội -> Trạm Nghỉ Đà Nẵng',       'REST_STOP',       'ROAD', NULL, NULL, '2026-10-09 10:00:00', '2026-10-09 10:30:00', 'COMPLETED'),
('SEG_302', 'TRIP_2026_003', NULL,      N'Đà Nẵng -> Trại Phú Thọ TP.HCM',     'DESTINATION',     'ROAD', NULL, NULL, '2026-10-11 18:00:00', NULL,                  'IN_PROGRESS');

-- 19. Bảng CUSTOMS_CLEARANCE: Thủ tục thông quan biên giới
INSERT INTO CUSTOMS_CLEARANCE (ClearanceID, TripID, SegmentID, BorderCrossingName, CustomsAgentName, DocumentType, DeclarationNumber, Status, ClearedAt) VALUES
('CST_001', 'TRIP_2026_001', 'SEG_101', N'Cửa khẩu Quốc tế Cầu Treo', N'Đại lý HQ Miền Trung', 'ATA_CARNET', 'VN-CARNET-2026-088', 'CLEARED', '2026-09-15 17:00:00'),
('CST_002', 'TRIP_2026_002', 'SEG_201', N'Cửa khẩu Quốc tế Mộc Bài',  N'Đại lý Tân Cảng',       'EXPORT',     'TK-XNK-VN-9928172',   'CLEARED', '2026-10-05 10:30:00');

-- 20. Bảng HEALTH_LOG: Nhật ký sinh hiệu sức khỏe cá thể ngựa (Insert-Only)
INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, MediaUrl) VALUES
('LOG_001', 'TRIP_2026_001', 'HRS_001', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.1, 42, N'Ổn định',       N'Ngựa uống 15L nước, ăn cỏ khô tốt.', 'https://storage.cbntransport.com/logs/log1.jpg'),
('LOG_002', 'TRIP_2026_001', 'HRS_002', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.2, 44, N'Ổn định',       N'Thể trạng bình thường, mắt lanh lợi.', 'https://storage.cbntransport.com/logs/log2.jpg'),
('LOG_003', 'TRIP_2026_002', 'HRS_003', 'USR_ESC_02', 'TRANSIT_CHECK', '2026-10-05 14:00:00', 39.2, 58, N'Căng thẳng/Sốt',N'Ngựa đổ mồ hôi nhiều lúc qua phà, đã truyền điện giải.', 'https://storage.cbntransport.com/logs/log3.jpg'),
('LOG_004', 'TRIP_2026_003', 'HRS_001', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-10-09 11:00:00', 38.0, 40, N'Rất tốt',      N'Dừng nghỉ tại Đà Nẵng, vận động nhẹ 30 phút.', 'https://storage.cbntransport.com/logs/log4.jpg');

-- 21. Bảng INCIDENT: Sự cố phát sinh khẩn cấp trên đường
INSERT INTO INCIDENT (IncidentID, TripID, ApprovedBy, IncidentType, LocationCoordinates, Description, ImageUrl, AdditionalCost, Status) VALUES
('INC_001', 'TRIP_2026_001', 'USR_MGR_01', 'TIRE_PUNCTURE', '18.4123,105.2011', N'Xe bị thủng lốp sau trên QL8A, thay lốp phụ mất 40 phút.', 'https://storage.cbntransport.com/incidents/tire1.jpg', 80.00,  'RESOLVED'),
('INC_002', 'TRIP_2026_002', 'USR_MGR_01', 'EQUINE_STRESS', '11.2312,105.8821', N'Ngựa HRS_003 bị sốt nhẹ do nắng nóng, phải dừng xe hạ nhiệt mất 1h30m.', 'https://storage.cbntransport.com/incidents/vet2.jpg', 150.00, 'RESOLVED');

-- 22. Bảng HANDOVER: Biên bản tiếp nhận (Pickup) và giao ngựa (Delivery)
INSERT INTO HANDOVER (HandoverID, TripID, HandedByUserID, Type, LocationName, ReceiverName, ReceiverPhone, IsAuthorized, Status) VALUES
('HO_PU_001', 'TRIP_2026_001', 'USR_DRV_01', 'PICKUP',   N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED'),
('HO_DL_001', 'TRIP_2026_001', 'USR_DRV_01', 'DELIVERY', N'CLB Hoàng Gia Bangkok',     N'Mr. Kraisak',   '+66812345678',1, 'CONFIRMED'),
('HO_PU_002', 'TRIP_2026_002', 'USR_DRV_02', 'PICKUP',   N'Trại ngựa Củ Chi, TP.HCM',   N'Trần Văn B',   '0908889999', 1, 'CONFIRMED'),
('HO_DL_002', 'TRIP_2026_002', 'USR_DRV_02', 'DELIVERY', N'Trường đua Phnom Penh',      N'Sokha Heng',    '+85598765432',1, 'CONFIRMED'),
('HO_PU_003', 'TRIP_2026_003', 'USR_DRV_01', 'PICKUP',   N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED');

-- 23. Bảng HANDOVER_ITEM: Đối soát mã chip và thể trạng lúc giao nhận
INSERT INTO HANDOVER_ITEM (HandoverItemID, HandoverID, HorseID, MicrochipVerified, ConditionStatus, AssetCheck, PhotoUrl) VALUES
('HOI_001', 'HO_PU_001', 'HRS_001', 1, N'Khỏe mạnh',    N'01 bộ yên cương, 02 chăn đắp ngựa', 'https://storage.cbntransport.com/ho/pu_hrs1.jpg'),
('HOI_002', 'HO_PU_001', 'HRS_002', 1, N'Khỏe mạnh',    N'01 hộp thuốc dinh dưỡng',           'https://storage.cbntransport.com/ho/pu_hrs2.jpg'),
('HOI_003', 'HO_DL_001', 'HRS_001', 1, N'Thể trạng tốt',N'Bàn giao đầy đủ yên cương và chăn', 'https://storage.cbntransport.com/ho/dl_hrs1.jpg'),
('HOI_004', 'HO_DL_001', 'HRS_002', 1, N'Thể trạng tốt',N'Bàn giao nguyên trạng',             'https://storage.cbntransport.com/ho/dl_hrs2.jpg'),
('HOI_005', 'HO_DL_002', 'HRS_003', 1, N'Mệt mỏi nhẹ',  N'Đã bàn giao thuốc bổ sung',         'https://storage.cbntransport.com/ho/dl_hrs3.jpg');

-- =============================================================================
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH ĐA TIỀN TỆ (CONTRACT & BILLING)
-- =============================================================================

-- 24. Bảng CONTRACT: 3 hợp đồng vận chuyển
INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, ContractCode, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus) VALUES
('CTR_2026_001', 'TRIP_2026_001', 'REQ_2026_001', 'USR_CUST_01', 'HD-CBN-2026-001', 'USD', 8500.00, 0.40, '2026-09-02 14:00:00', 'SETTLED'),
('CTR_2026_002', 'TRIP_2026_002', 'REQ_2026_002', 'USR_CUST_02', 'HD-CBN-2026-002', 'USD', 4200.00, 0.40, '2026-09-28 10:00:00', 'SETTLED'),
('CTR_2026_003', 'TRIP_2026_003', 'REQ_2026_003', 'USR_CUST_01', 'HD-CBN-2026-003', 'VND', 145000000.00, 0.40, '2026-10-06 09:30:00', 'EXECUTING');

-- 25. Bảng COST_ITEM: Các mục chi phí dự toán và phát sinh
INSERT INTO COST_ITEM (CostItemID, ContractID, CategoryName, SubcodeName, Bearer, CurrencyCode, TotalMoney, EvidenceUrl) VALUES
('CST_01', 'CTR_2026_001', N'Nhiên liệu',       N'Xăng dầu xe chuyên dụng',      'COMPANY',  'USD', 1500.00, 'https://storage.cbntransport.com/bills/fuel1.pdf'),
('CST_02', 'CTR_2026_001', N'Phí dịch vụ trạm', N'Lưu chuồng cách ly Vientiane', 'CUSTOMER', 'USD', 200.00,  'https://storage.cbntransport.com/bills/vet_lao.pdf'),
('CST_03', 'CTR_2026_001', N'Sự cố phát sinh',  N'Sửa vá lốp khẩn cấp',          'COMPANY',  'USD', 80.00,   'https://storage.cbntransport.com/bills/tire1.jpg'),
('CST_04', 'CTR_2026_002', N'Chi phí thú y',    N'Khám cấp cứu sốt ngựa',        'CUSTOMER', 'USD', 150.00,  'https://storage.cbntransport.com/bills/vet_khm.jpg');

-- 26. Bảng INVOICE: Các đợt hóa đơn (Đã trả xong, Đang nợ, Quá hạn)
INSERT INTO INVOICE (InvoiceID, ContractID, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus) VALUES
-- Hợp đồng 1: Đã thanh toán 100%
('INV_101', 'CTR_2026_001', 'DEPOSIT_40',    'USD', 3400.00, 3400.00, '2026-09-05 23:59:59', 'PAID'),
('INV_102', 'CTR_2026_001', 'FINAL_60',      'USD', 5100.00, 5100.00, '2026-09-20 23:59:59', 'PAID'),
-- Hợp đồng 2: Đợt cọc đã trả, đợt quyết toán còn nợ
('INV_201', 'CTR_2026_002', 'DEPOSIT_40',    'USD', 1680.00, 1680.00, '2026-10-01 23:59:59', 'PAID'),
('INV_202', 'CTR_2026_002', 'FINAL_60_INC',  'USD', 2670.00, 0.00,    '2026-10-10 23:59:59', 'UNPAID'),
-- Hợp đồng 3: Vừa nộp tiền cọc
('INV_301', 'CTR_2026_003', 'DEPOSIT_40',    'VND', 58000000.00, 58000000.00, '2026-10-07 23:59:59', 'PAID');

-- 27. Bảng PAYMENT: Giao dịch đối soát thực tế qua Cổng thanh toán hoặc Chuyển khoản
INSERT INTO PAYMENT (PaymentID, InvoiceID, ConfirmedByUserID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate) VALUES
('PAY_001', 'INV_101', 'USR_MGR_01', 'USD', 3400.00,     'STRIPE_GATEWAY', 'TXN_STRIPE_001829', 'SUCCESS', '2026-09-04 15:30:00'),
('PAY_002', 'INV_102', 'USR_MGR_01', 'USD', 5100.00,     'BANK_TRANSFER',  'TXN_VCB_8829102938', 'SUCCESS', '2026-09-18 10:15:00'),
('PAY_003', 'INV_201', 'USR_MGR_01', 'USD', 1680.00,     'STRIPE_GATEWAY', 'TXN_STRIPE_001994', 'SUCCESS', '2026-09-30 09:20:00'),
('PAY_004', 'INV_301', 'USR_MGR_01', 'VND', 58000000.00, 'VNPAY_GATEWAY',  'VNPAY_20261007_019', 'SUCCESS', '2026-10-07 14:45:00');

GO

-- Flow 1: 10 don gia VND; ty le bao hiem 0.5% la gia dinh cua du an.
INSERT INTO COST_RATE (CostRateID, Code, CostGroup, CalculationUnit, Rate, CurrencyCode, IsActive) VALUES
('rate-ROAD_KM', 'ROAD_KM', 'TRANSPORT', 'KM_VEHICLE', 200000, 'VND', 1),
('rate-AIR_HORSE', 'AIR_HORSE', 'TRANSPORT', 'HORSE', 3000000, 'VND', 1),
('rate-STABLE_NIGHT', 'STABLE_NIGHT', 'TRANSPORT', 'HORSE_NIGHT', 250000, 'VND', 1),
('rate-CREW_DAY', 'CREW_DAY', 'CREW', 'PERSON_DAY', 300000, 'VND', 1),
('rate-PERMIT_TRIP', 'PERMIT_TRIP', 'PERMIT', 'TRIP', 1000000, 'VND', 1),
('rate-PERMIT_HORSE', 'PERMIT_HORSE', 'PERMIT', 'HORSE', 5000000, 'VND', 1),
('rate-VET_DAY', 'VET_DAY', 'VET', 'PERSON_DAY', 500000, 'VND', 1),
('rate-CARE_DAY', 'CARE_DAY', 'VET', 'HORSE_DAY', 300000, 'VND', 1),
('rate-INSURANCE_MIN', 'INSURANCE_MIN', 'INSURANCE', 'TRIP', 2000000, 'VND', 1),
('rate-INSURANCE_RATE', 'INSURANCE_RATE', 'INSURANCE', 'VALUE_RATIO', 0.005, 'VND', 1);

-- 12 dieu khoan bat buoc: noi dung A-L de cap nhat sau.
-- Twelve fixed clauses from the approved contract wizard.
DECLARE @Flow1Terms TABLE(TemplateID varchar(50),Title nvarchar(255),Content nvarchar(max));
INSERT INTO @Flow1Terms VALUES
(N'flow1-required-clause-01',N'Điều 1. Thông tin và tư cách các bên',N'CBN Transport (Bên A) cung cấp dịch vụ cho Customer (Bên B). Thông tin pháp lý, người đại diện và liên hệ được ghi trong hồ sơ hợp đồng. Customer phải có quyền sở hữu hoặc ủy quyền vận chuyển ngựa hợp lệ.'),
(N'flow1-required-clause-02',N'Điều 2. Đối tượng vận chuyển',N'Danh sách, số lượng, định danh, hộ chiếu và yêu cầu sức khỏe/chăm sóc ngựa lấy trực tiếp từ Transport Request đã được duyệt. Customer chịu trách nhiệm khai báo trung thực; tình trạng ngựa được ghi nhận tại lúc tiếp nhận và bàn giao. Manager không tự sửa dữ liệu thuộc Customer.'),
(N'flow1-required-clause-03',N'Điều 3. Phạm vi dịch vụ',N'CBN Transport tổ chức nhận/giao ngựa, chặng đường bộ, nhân sự hộ tống, bác sĩ thú y, kiểm dịch, bảo hiểm và thủ tục liên quan. Tuyến Việt Nam đến Nhật Bản bao gồm dịch vụ hàng không trực tiếp do bên thứ ba cung cấp. Xe, tài xế và số chuyến bay cụ thể được xác định trong Trip.'),
(N'flow1-required-clause-04',N'Điều 4. Địa điểm, lộ trình và thời gian',N'Địa điểm nhận/giao, người nhận được ủy quyền, ngày khởi hành mong muốn và hạn giao lấy từ Request đã duyệt. Thay đổi kế hoạch vận hành do người có thẩm quyền phê duyệt; không được sửa cam kết hoặc dữ liệu Request trong hợp đồng đã ký.'),
(N'flow1-required-clause-05',N'Điều 5. Giá trị hợp đồng',N'Giá bán chính thức và từng hạng mục thể hiện trong hợp đồng. Giá bao gồm bảo hiểm và những dịch vụ được ghi nhận; khoản chưa bao gồm phải thể hiện rõ. Chi phí nội bộ, giá sàn và lợi nhuận không cung cấp cho Customer. Chi phí phát sinh không làm thay đổi giá trị hợp đồng gốc.'),
(N'flow1-required-clause-06',N'Điều 6. Thanh toán và xử lý quá hạn',N'Manager quyết định tỷ lệ tiền cọc thể hiện trong hợp đồng. Một hạn chung 24 giờ kể từ phát hành áp dụng cho nộp cọc, xác minh và ký OTP; Manager có thể gia hạn, quá hạn không tự hủy. Sau bàn giao hợp lệ, Customer nghiệm thu trước rồi thanh toán số dư và hệ thống xác minh trong một thời hạn chung 24 giờ; chỉ có tranh chấp được tạm dừng theo điều khoản xử lý tranh chấp.'),
(N'flow1-required-clause-07',N'Điều 7. Quyền và nghĩa vụ các bên',N'CBN Transport tổ chức phương tiện/nhân sự đạt yêu cầu, hồ sơ, kiểm dịch, chăm sóc, bảo hiểm, theo dõi và bàn giao đúng người. Customer cung cấp thông tin/hồ sơ trung thực, chuẩn bị ngựa, phối hợp nhận/giao, nghiệm thu và thanh toán. Mỗi bên chịu trách nhiệm đối với nghĩa vụ của mình.'),
(N'flow1-required-clause-08',N'Điều 8. Bảo hiểm và cấp cứu thú y',N'CBN Transport thu xếp bảo hiểm từ lúc tiếp nhận đến bàn giao theo phạm vi và loại trừ của đơn bảo hiểm thực tế. Trong trường hợp cấp cứu đe dọa sức khỏe hoặc tính mạng ngựa, bác sĩ thú y được thực hiện biện pháp chuyên môn cần thiết trong phạm vi Customer ủy quyền trước mà không bị áp hạn mức tiền cứng. Phải ghi chứng cứ, thông báo Manager và Customer sớm; chi phí và trách nhiệm phân định sau.'),
(N'flow1-required-clause-09',N'Điều 9. Sự cố, thay đổi và chi phí phát sinh',N'Driver và bác sĩ thú y ghi nhận sự cố. Coordinator đề xuất thay đổi phương án, Manager phê duyệt các quyết định thuộc thẩm quyền. Chi phí phát sinh được phân định theo nguyên nhân, trách nhiệm, bảo hiểm và hợp đồng. Khoản Customer phải trả chưa được ủy quyền trước cần Customer xác nhận khi áp dụng; cấp cứu đã ủy quyền được xử lý theo Điều 8. Không sửa hợp đồng gốc.'),
(N'flow1-required-clause-10',N'Điều 10. Bàn giao, nghiệm thu và thanh toán cuối',N'Driver bàn giao cho người nhận hợp lệ và ghi biên bản, tình trạng ngựa, chữ ký, hình ảnh. Kể từ bàn giao, Customer có chung 24 giờ để xem xét và xác nhận nghiệm thu TRƯỚC, thanh toán số dư SAU và chờ xác minh. Im lặng hoặc quá hạn không đồng nghĩa chấp nhận; không được giữ ngựa tùy tiện vì chậm thanh toán.'),
(N'flow1-required-clause-11',N'Điều 11. Hủy dịch vụ và giải quyết tranh chấp',N'Khiếu nại phải ghi nhận chứng cứ và được Manager xem xét. Phần tiền tranh chấp được tạm dừng theo thỏa thuận, phần không tranh chấp vẫn có nghĩa vụ thanh toán. Khi hai bên xác nhận kết quả giải quyết, bắt đầu lại nguyên 24 giờ để hoàn tất nghiệm thu/thanh toán còn thiếu. Vi phạm, hủy, hoàn trả/bồi thường theo từng trường hợp, không tự áp một mức phạt chung. Tranh chấp không thống nhất xử lý ngoài hệ thống.'),
(N'flow1-required-clause-12',N'Điều 12. Ký kết, hiệu lực và lưu trữ',N'Customer xác nhận nội dung hiện hành; hợp đồng chỉ có hiệu lực sau khi cọc đã xác minh và Customer ký OTP thành công. Sau ký, không bên nào được sửa, xóa, thay thế nội dung; bản ký và lịch sử trước ký được bảo lưu, không có phụ lục trong Demo. Trip đóng khi Manager ghi đóng Request sau khi hết 24 giờ của chu kỳ cuối, đã bàn giao, nghiệm thu, xác minh đủ thanh toán và không còn khiếu nại.');
UPDATE c SET TemplateName=s.Title,BodyContent=s.Content,UpdatedAt=SYSUTCDATETIME()
FROM CONTRACT_TEMPLATE c JOIN @Flow1Terms s ON s.TemplateID=c.TemplateID
WHERE LEN(c.BodyContent)=1 AND c.BodyContent COLLATE Latin1_General_100_BIN2 BETWEEN 'A' AND 'L';
INSERT INTO CONTRACT_TEMPLATE(TemplateID,TemplateName,LanguageCode,BodyContent,IsActive,CreatedAt)
SELECT s.TemplateID,s.Title,'VI',s.Content,1,SYSUTCDATETIME() FROM @Flow1Terms s
WHERE NOT EXISTS(SELECT 1 FROM CONTRACT_TEMPLATE c WHERE c.TemplateID=s.TemplateID);

GO
