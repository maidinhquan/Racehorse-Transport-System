-- Canonical test schema: reset/recreate using this file; no numbered migrations are required.
-- Flow 1 scope 2026-10-24: VNPAY only; progress via current Status, no history/audit tables.
-- Reviewed sample only: do not run against an active database as a migration.
-- Reviewed copy: source data/HorseTransportDB.sql is preserved.
-- Creates ONLY HorseTransportDB_Reviewed. All timestamps in demo fixtures are UTC.
-- Private/demo paths and example URLs are placeholders, not bundled file contents.
-- SAMPLE DATABASE ONLY: this file DROPS and recreates HorseTransportDB_Reviewed.
-- Not a migration. Do not apply old migration scripts to restore removed columns.
-- Flow 1 and Flow 6 schema is defined directly below; all monetary amounts are VND.
-- Flow 6: 5 additional tables, totaling 37 tables / 33 monotonic sequences.
-- Backend still owns authorization, cross-table transitions, window scheduling and financial reconciliation.
-- Monetary seed values are illustrative demo data, not market quotations. Ratios remain ratios.
-- =============================================================================
-- BƯỚC 1: TẠO VÀ CHUYỂN VÀO CƠ SỞ DỮ LIỆU CHÍNH THỨC
-- =============================================================================
USE master;
GO

-- Buộc ngắt mọi kết nối đang mở vào Database cũ và xóa hẳn nếu đã tồn tại
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HorseTransportDB_Reviewed')
BEGIN
    ALTER DATABASE HorseTransportDB_Reviewed SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HorseTransportDB_Reviewed;
END
GO

-- Tạo mới database hoàn toàn sạch sẽ
CREATE DATABASE HorseTransportDB_Reviewed;
GO

USE HorseTransportDB_Reviewed;
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
    CareInstructions NVARCHAR(2000) NULL,
    RequestID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    Departure NVARCHAR(255) NOT NULL,
    Destination NVARCHAR(255) NOT NULL,
    Purpose NVARCHAR(100) NULL,
    TransportType VARCHAR(50) NULL,
    CreatedAtUtc DATETIME2(7) NULL DEFAULT SYSUTCDATETIME(),
    ExpectedDate DATETIME NULL,
    CommittedDeadline DATETIME NULL,
    DesignatedReceiverName NVARCHAR(100) NULL,
    DesignatedReceiverPhone VARCHAR(20) NULL,
    BaseCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL,
    -- Flow 1
    PickupCityId VARCHAR(1024) NULL,
    PickupCityName NVARCHAR(255) NULL,
    DeliveryCityId VARCHAR(1024) NULL,
    DeliveryCityName NVARCHAR(255) NULL,
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
    SubmissionKeyHash VARCHAR(64) NULL,
    SubmissionContentHash VARCHAR(64) NULL,
    -- Latest revision feedback only; no field-group restriction or history is introduced.
    RevisionFeedback NVARCHAR(2000) NULL,
    -- Request-level cancellation also supports requests without a contract.
    CancellationPreviousStatus VARCHAR(50) NULL,
    CancellationReason NVARCHAR(1000) NULL,
    CancellationRequestedBy VARCHAR(50) NULL,
    CancellationRequestedAtUtc DATETIME2(7) NULL,
    CONSTRAINT PK_TransportRequest PRIMARY KEY (RequestID),
    CONSTRAINT FK_TransportRequest_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT FK_F1_RequestCancellationActor FOREIGN KEY (CancellationRequestedBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1_RequestCancellationMetadata CHECK (
        (CancellationReason IS NULL AND CancellationRequestedBy IS NULL AND CancellationRequestedAtUtc IS NULL AND CancellationPreviousStatus IS NULL)
        OR (CancellationReason IS NOT NULL AND LEN(LTRIM(RTRIM(CancellationReason)))>0
            AND CancellationRequestedBy IS NOT NULL AND CancellationRequestedAtUtc IS NOT NULL
            AND (CancellationPreviousStatus IS NULL OR CancellationPreviousStatus IN
                ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','CONTRACT_PREPARATION','CONTRACT_READY','CONTRACT_CHANGES_REQUESTED','DEPOSIT_VERIFIED')))),
    CONSTRAINT CK_F1_RequestCancellationPending CHECK (
        Status<>'CANCELLATION_REQUESTED' OR (CancellationPreviousStatus IS NOT NULL
            AND CancellationReason IS NOT NULL AND CancellationRequestedBy IS NOT NULL
            AND CancellationRequestedAtUtc IS NOT NULL)),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Pickup CHECK ([PickupLatitude] IS NULL AND [PickupLongitude] IS NULL OR [PickupLatitude] IS NOT NULL AND [PickupLongitude] IS NOT NULL AND ([PickupLatitude]>=(-90) AND [PickupLatitude]<=(90)) AND ([PickupLongitude]>=(-180) AND [PickupLongitude]<=(180))),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Delivery CHECK ([DeliveryLatitude] IS NULL AND [DeliveryLongitude] IS NULL OR [DeliveryLatitude] IS NOT NULL AND [DeliveryLongitude] IS NOT NULL AND ([DeliveryLatitude]>=(-90) AND [DeliveryLatitude]<=(90)) AND ([DeliveryLongitude]>=(-180) AND [DeliveryLongitude]<=(180))),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Distance CHECK ([DistanceKm] IS NULL OR [DistanceKm]>(0)),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Route CHECK ([OriginCountry] IS NULL AND [DestinationCountry] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [TransportType] IS NOT NULL),
    -- The backend resolves the minimum from BUSINESS_POLICY and stores the applied days.
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Preparation CHECK ([PreparationDays] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [PreparationDays]>=0)
);

-- 10. Bảng REQUEST_HORSE_MAPPING: Khử quan hệ N-N giữa Request và Horse
CREATE TABLE REQUEST_HORSE_MAPPING (
    CareInstructions NVARCHAR(2000) NULL,
    RequestID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_RequestHorseMapping PRIMARY KEY (RequestID, HorseID),
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
    AssignedSpecialistId VARCHAR(50) NULL,
    AssignedCoordinatorId VARCHAR(50) NULL,
    CONSTRAINT PK_TripPlan PRIMARY KEY (TripID),
    CONSTRAINT FK_TripPlan_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT CK_F1S_TRIP_PLAN_Deployment CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus] IS NOT NULL AND [DeploymentStatus] IN ('PENDING','CONFIRMED','ON_HOLD') AND [DeploymentReason] IS NOT NULL AND [DeploymentBy] IS NOT NULL AND [DeploymentAtUtc] IS NOT NULL AND (([DeploymentStatus]='PENDING' AND [HandoffEventId] IS NULL) OR ([DeploymentStatus] IN ('CONFIRMED','ON_HOLD') AND [HandoffEventId] IS NOT NULL)))),
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
    DocumentType VARCHAR(50) NULL, -- EXPORT, IMPORT
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
    DocumentsHandedOver NVARCHAR(2000) NULL, -- optional documents common to this handover
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
    DocumentsHandedOver NVARCHAR(2000) NULL,
    DocumentsReceivedAtUtc DATETIME2(7) NULL,
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
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH VND (CONTRACT & BILLING)
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
    -- Current working state; published content is preserved in CONTRACT_VERSION.
    CurrentVersionNo INT NULL,
    TripID VARCHAR(50) NULL,
    CustomerID VARCHAR(50) NOT NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    TotalQuotedPrice DECIMAL(12, 2) NULL,
    DepositRateStandard DECIMAL(5, 2) NULL,
    SignedAt DATETIME NULL, -- UTC by application contract; DATETIME has no timezone
    ContractStatus VARCHAR(50) NOT NULL,
    -- Flow 1
    RequestID VARCHAR(50) NOT NULL,
    CompletionDeadline DATETIME2(7) NULL,
    PdfUrl VARCHAR(500) NULL,
    SignOtpHash VARCHAR(255) NULL,
    SignOtpExpiry DATETIME2(7) NULL,
    -- The maximum is resolved from BUSINESS_POLICY.SIGN_OTP_MAX_ATTEMPTS by the backend.
    SignOtpFailedAttempts INT NOT NULL CONSTRAINT DF_F1S_CONTRACT_SignOtpFailedAttempts DEFAULT ((0)),
    DepositAmount DECIMAL(12,2) NULL,
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
    CustomerFeedback NVARCHAR(2000) NULL,
    FeedbackStatus VARCHAR(20) NULL,
    FeedbackAtUtc DATETIME2(7) NULL,
    ManagerFeedback NVARCHAR(2000) NULL,
    FeedbackHandledAtUtc DATETIME2(7) NULL,
    RefundAmount DECIMAL(12,2) NULL,
    RefundStatus VARCHAR(20) NULL,
    RefundReference VARCHAR(100) NULL,
    CONSTRAINT CK_Contract_Currency CHECK (CurrencyCode = 'VND'),
    CONSTRAINT PK_Contract PRIMARY KEY (ContractID),
    CONSTRAINT CK_Contract_CurrentVersion CHECK (CurrentVersionNo IS NULL OR CurrentVersionNo > 0),
    CONSTRAINT FK_Contract_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Contract_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_CONTRACT_PdfUrl CHECK ([PdfUrl] IS NULL OR [PdfUrl] like 'private/%' AND len([PdfUrl])>(8)),
    CONSTRAINT CK_F1S_CONTRACT_Deposit CHECK ([DepositAmount] IS NULL OR [CurrencyCode]='VND' AND [TotalQuotedPrice] IS NOT NULL AND [TotalQuotedPrice]>(0) AND [TotalQuotedPrice]=round([TotalQuotedPrice],(0)) AND [DepositRateStandard] IS NOT NULL AND [DepositRateStandard]>(0) AND [DepositRateStandard]<=(100) AND [DepositAmount]>(0) AND [DepositAmount]<=[TotalQuotedPrice] AND [DepositAmount]=round(([TotalQuotedPrice]*[DepositRateStandard])/(100),(0))),
    CONSTRAINT CK_F1S_CONTRACT_Publication CHECK ([PublishedAtUtc] IS NULL OR [PublishedBy] IS NOT NULL AND [PdfUrl] IS NOT NULL AND [DepositAmount] IS NOT NULL AND [CompletionDeadline] IS NOT NULL),
    CONSTRAINT CK_F1S_CONTRACT_OtpAttempts CHECK ([SignOtpFailedAttempts]>=(0)),
    CONSTRAINT CK_F1S_CONTRACT_Otp CHECK ([SignOtpHash] IS NULL OR len([SignOtpHash])=(64) AND NOT [SignOtpHash] like ('%[^0-9a-f]%') collate Latin1_General_100_BIN2 AND [SignOtpExpiry] IS NOT NULL AND [SignOtpSentAtUtc] IS NOT NULL AND [SignOtpExpiry]>[SignOtpSentAtUtc] AND [PublishedAtUtc] IS NOT NULL AND [SignedAt] IS NULL),
    CONSTRAINT CK_F1S_CONTRACT_SignDeadline CHECK (CompletionDeadline IS NULL OR PublishedAtUtc IS NULL OR CompletionDeadline>PublishedAtUtc),
    CONSTRAINT CK_F1S_CONTRACT_Signed CHECK (SignedAt IS NULL OR (PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL AND PdfUrl IS NOT NULL AND DepositAmount IS NOT NULL AND SignerEmail IS NOT NULL AND CompletionDeadline IS NOT NULL AND SignedAt >= PublishedAtUtc AND CompletionDeadline > SignedAt AND SignOtpHash IS NULL)),
    CONSTRAINT CK_F1S_CONTRACT_Extension CHECK ([LastExtensionReason] IS NULL AND [LastExtensionBy] IS NULL AND [LastExtensionAtUtc] IS NULL OR [LastExtensionReason] IS NOT NULL AND [LastExtensionBy] IS NOT NULL AND [LastExtensionAtUtc] IS NOT NULL),
    CONSTRAINT CK_F1S_CONTRACT_Cancellation CHECK ([CancellationId] IS NULL AND [CancellationStatus] IS NULL AND [CancellationReason] IS NULL AND [CancellationRequestedAtUtc] IS NULL AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR [CancellationId] IS NOT NULL AND [CancellationStatus] IS NOT NULL AND [CancellationReason] IS NOT NULL AND [CancellationRequestedAtUtc] IS NOT NULL AND ([CancellationStatus]='PENDING' AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR ([CancellationStatus]='REJECTED' OR [CancellationStatus]='APPROVED') AND [CancellationDecisionReason] IS NOT NULL AND [CancellationDecidedBy] IS NOT NULL AND [CancellationDecidedAtUtc] IS NOT NULL)),
    CONSTRAINT CK_F1Final_Feedback CHECK ([FeedbackStatus] IS NULL OR ([FeedbackStatus]='REJECTED' OR [FeedbackStatus]='ACCEPTED' OR [FeedbackStatus]='PENDING') AND [CustomerFeedback] IS NOT NULL AND [FeedbackAtUtc] IS NOT NULL),
    -- Flow 1 tracks refund status only; no transfer/evidence workflow is implemented.
    -- Existing amount/reference are optional metadata, not proof that a transfer occurred.
    CONSTRAINT CK_F1Final_Refund CHECK (
        (RefundStatus IS NULL AND RefundAmount IS NULL AND RefundReference IS NULL)
        OR (RefundStatus IS NOT NULL AND RefundStatus IN ('REQUESTED','PROCESSING','COMPLETED')
            AND (RefundAmount IS NULL OR RefundAmount>0))),
    CONSTRAINT FK_Contract_Request FOREIGN KEY (RequestID) REFERENCES [TRANSPORT_REQUEST](RequestID)
);

-- Contract content history, not a concurrency token.
-- CONTRACT contains the current operational state; these snapshots preserve issued content.
-- A new draft/version gets a new row. Never overwrite an issued or signed snapshot.
CREATE TABLE CONTRACT_VERSION (
    ContractID VARCHAR(50) NOT NULL,
    VersionNo INT NOT NULL,
    VersionStatus VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    -- Complete contract document including both parties, horses, schedule, all financial/legal terms and applied policy.
    -- Preserve issued/signed JSON and PDF; content edits create a new business version.
    ContentSnapshot NVARCHAR(MAX) NOT NULL,
    PdfUrl NVARCHAR(500) NULL,
    CreatedBy VARCHAR(50) NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    PublishedBy VARCHAR(50) NULL,
    PublishedAtUtc DATETIME2(7) NULL,
    -- NULL until the owning customer accepts this version; recorded in UTC by the backend.
    TermsAcceptedAtUtc DATETIME2(7) NULL,
    SignedAtUtc DATETIME2(7) NULL,
    SignerEmail VARCHAR(255) NULL,
    CONSTRAINT PK_ContractVersion PRIMARY KEY (ContractID, VersionNo),
    CONSTRAINT FK_ContractVersion_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID),
    CONSTRAINT FK_ContractVersion_Creator FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_ContractVersion_Publisher FOREIGN KEY (PublishedBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_ContractVersion_Number CHECK (VersionNo > 0),
    CONSTRAINT CK_ContractVersion_Content CHECK (ISJSON(ContentSnapshot) = 1),
    CONSTRAINT CK_ContractVersion_Status CHECK (VersionStatus IN ('DRAFT', 'ISSUED', 'SUPERSEDED', 'SIGNED', 'CANCELLED')),
    CONSTRAINT CK_ContractVersion_Publication CHECK (
        (VersionStatus NOT IN ('ISSUED', 'SUPERSEDED', 'SIGNED') AND PublishedAtUtc IS NULL)
        OR (PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL AND PdfUrl IS NOT NULL)),
    CONSTRAINT CK_ContractVersion_Signature CHECK (
        (VersionStatus <> 'SIGNED' OR SignedAtUtc IS NOT NULL)
        AND (SignedAtUtc IS NULL OR (VersionStatus IN ('SIGNED', 'CANCELLED')
            AND PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL AND PdfUrl IS NOT NULL
            AND SignerEmail IS NOT NULL AND SignedAtUtc >= PublishedAtUtc))),
    CONSTRAINT CK_ContractVersion_Pdf CHECK (PdfUrl IS NULL OR PdfUrl LIKE 'private/%' AND LEN(PdfUrl) > 8)
);

ALTER TABLE CONTRACT ADD CONSTRAINT FK_Contract_CurrentVersion
    FOREIGN KEY (ContractID, CurrentVersionNo) REFERENCES CONTRACT_VERSION(ContractID, VersionNo);

-- 25. Bảng COST_ITEM: Các khoản mục chi phí thực tế
CREATE TABLE COST_ITEM (
    CostItemID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    CategoryName NVARCHAR(100) NULL,
    SubcodeName NVARCHAR(100) NULL,
    Bearer VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    TotalMoney DECIMAL(12, 2) NULL,
    EvidenceUrl VARCHAR(500) NULL,
    CONSTRAINT CK_CostItem_Currency CHECK (CurrencyCode = 'VND'),
    CONSTRAINT PK_CostItem PRIMARY KEY (CostItemID),
    CONSTRAINT FK_CostItem_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID)
);

-- 26. Bảng INVOICE: Hóa đơn cho khách hàng
CREATE TABLE INVOICE (
    InvoiceID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    ContractVersionNo INT NOT NULL,
    InvoiceType VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    TotalPayableAmount DECIMAL(12, 2) NOT NULL,
    PaidAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    DueDate DATETIME NULL,
    PaymentStatus VARCHAR(50) NOT NULL,
    CONSTRAINT CK_Invoice_Currency CHECK (CurrencyCode = 'VND'),
    CONSTRAINT PK_Invoice PRIMARY KEY (InvoiceID),
    CONSTRAINT FK_Invoice_ContractVersion FOREIGN KEY (ContractID, ContractVersionNo) REFERENCES CONTRACT_VERSION(ContractID, VersionNo)
);

-- 27. Bảng PAYMENT: Giao dịch thanh toán thực tế
CREATE TABLE PAYMENT (
    PaymentID VARCHAR(50) NOT NULL,
    InvoiceID VARCHAR(50) NOT NULL,
    ConfirmedByUserID VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
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
    CONSTRAINT CK_Payment_Method CHECK (Method IS NOT NULL AND Method='VNPAY'),
    CONSTRAINT CK_Payment_Status CHECK (Status IN ('PENDING_GATEWAY','SUCCESS','FAILED','REVIEW_REQUIRED')),
    CONSTRAINT CK_Payment_Currency CHECK (CurrencyCode = 'VND'),
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
    CONSTRAINT CK_COST_RATE_Value CHECK (Rate>0 AND (Code<>'INSURANCE_RATE' OR Rate<=1)),
    CONSTRAINT CK_COST_RATE_Currency CHECK (CurrencyCode='VND'),
    CONSTRAINT CK_COST_RATE_Group CHECK (CostGroup IN ('TRANSPORT','CREW','PERMIT','VET','INSURANCE'))
);

-- COUNTRY is a catalog, not a list of allowed origin/destination pairs.
-- Each SUPPORTED_ROUTE row below defines one direction and transport mode.
CREATE TABLE COUNTRY (
    CountryCode VARCHAR(2) NOT NULL,
    CountryName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT PK_Country PRIMARY KEY (CountryCode),
    CONSTRAINT CK_Country_Code CHECK (DATALENGTH(CountryCode) = 2
        AND CountryCode COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^A-Z]%'),
    CONSTRAINT CK_Country_Name CHECK (LEN(LTRIM(RTRIM(CountryName))) > 0)
);

CREATE TABLE SUPPORTED_ROUTE (
    RouteID VARCHAR(50) NOT NULL,
    OriginCountry VARCHAR(2) NOT NULL,
    DestinationCountry VARCHAR(2) NOT NULL,
    TransportMode VARCHAR(50) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT PK_SupportedRoute PRIMARY KEY (RouteID),
    CONSTRAINT FK_SupportedRoute_Origin FOREIGN KEY (OriginCountry) REFERENCES COUNTRY(CountryCode),
    CONSTRAINT FK_SupportedRoute_Destination FOREIGN KEY (DestinationCountry) REFERENCES COUNTRY(CountryCode),
    CONSTRAINT UQ_SupportedRoute_DirectionMode UNIQUE (OriginCountry, DestinationCountry, TransportMode),
    CONSTRAINT CK_SupportedRoute_Mode CHECK (LEN(LTRIM(RTRIM(TransportMode))) > 0)
);

-- Keep historical references valid even when a route/country is deactivated.
-- New requests must also validate IsActive in the backend.
ALTER TABLE TRANSPORT_REQUEST ADD CONSTRAINT FK_TransportRequest_SupportedRoute
    FOREIGN KEY (OriginCountry, DestinationCountry, TransportType)
    REFERENCES SUPPORTED_ROUTE(OriginCountry, DestinationCountry, TransportMode);

-- Current parameter values for new operations; no configuration history table.
-- Persist applied amounts/deadlines on the transaction when they are agreed.
-- Resolver precedence for the SAME Code: COUNTRY > TRANSPORT_MODE > GLOBAL.
-- SUPPORTED_ROUTE stays unchanged; ROUTE is no longer a policy scope.
-- Missing policy at one level: try the next level. Never add values or take MAX.
-- Existing but invalid policy (type/unit/domain/scope): report a configuration error.
-- Backend must validate each Code and resolve policies; this CHECK only limits scopes.
-- COUNTRY scope refers to the destination country for transport requests.
-- ScopeID is polymorphic; the backend must validate the referenced catalog key.
CREATE TABLE BUSINESS_POLICY (
    PolicyID VARCHAR(50) NOT NULL,
    Code VARCHAR(100) NOT NULL,
    ValueType VARCHAR(10) NOT NULL,
    NumberValue DECIMAL(18,6) NULL,
    TextValue NVARCHAR(2000) NULL,
    BoolValue BIT NULL,
    Unit VARCHAR(30) NULL,
    ScopeType VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    ScopeID VARCHAR(50) NULL,
    Description NVARCHAR(1000) NOT NULL,
    UpdatedBy VARCHAR(50) NULL,
    UpdatedAt DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BusinessPolicy PRIMARY KEY (PolicyID),
    CONSTRAINT FK_BusinessPolicy_Updater FOREIGN KEY (UpdatedBy) REFERENCES [USER](UserID),
    CONSTRAINT UQ_BusinessPolicy_CodeScope UNIQUE (Code, ScopeType, ScopeID),
    CONSTRAINT CK_BusinessPolicy_Code CHECK (LEN(LTRIM(RTRIM(Code))) > 0),
    CONSTRAINT CK_BusinessPolicy_Value CHECK (
        (ValueType = 'NUMBER' AND NumberValue IS NOT NULL AND TextValue IS NULL AND BoolValue IS NULL)
        OR (ValueType = 'TEXT' AND TextValue IS NOT NULL AND NumberValue IS NULL AND BoolValue IS NULL)
        OR (ValueType = 'BOOLEAN' AND BoolValue IS NOT NULL AND NumberValue IS NULL AND TextValue IS NULL)),
    CONSTRAINT CK_BusinessPolicy_Scope CHECK (
        (ScopeType = 'GLOBAL' AND ScopeID IS NULL)
        OR (ScopeType IN ('COUNTRY', 'TRANSPORT_MODE')
            AND ScopeID IS NOT NULL AND LEN(LTRIM(RTRIM(ScopeID))) > 0))
);


-- FLOW 6 EXTENSION BEGIN
-- BR-38..46: delivery evidence, settlement, complaints and feedback windows.
-- All new timestamps are UTC. No application of this file to a live database is implied.
-- Composite FKs prevent linking another customer's trip/contract/invoice by mistake.
ALTER TABLE CONTRACT ADD CONSTRAINT UQ_F6_ContractScope UNIQUE (ContractID, TripID, CustomerID);
ALTER TABLE HANDOVER ADD CONSTRAINT UQ_F6_HandoverTrip UNIQUE (HandoverID, TripID);
ALTER TABLE INVOICE ADD CONSTRAINT UQ_F6_InvoiceVersion UNIQUE (InvoiceID, ContractID, ContractVersionNo);

CREATE TABLE HANDOVER_REVISION (
    HandoverRevisionID VARCHAR(50) NOT NULL,
    HandoverID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RevisionNo INT NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    -- Exact version presented to the receiver; receiver/items/documents are inside this snapshot.
    ContentSnapshot NVARCHAR(MAX) NOT NULL,
    -- Email OTP for this revision only. Never persist or log the plaintext OTP.
    OtpEmail VARCHAR(254) NULL,
    OtpHash VARCHAR(64) NULL,
    OtpSentAtUtc DATETIME2(7) NULL,
    OtpExpiresAtUtc DATETIME2(7) NULL,
    OtpFailedAttempts INT NOT NULL DEFAULT 0,
    ConfirmedAtUtc DATETIME2(7) NULL,
    RefusalReason NVARCHAR(2000) NULL,
    RefusedAtUtc DATETIME2(7) NULL,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_HandoverRevision PRIMARY KEY (HandoverRevisionID),
    CONSTRAINT UQ_F6_HandoverRevisionNo UNIQUE (HandoverID, RevisionNo),
    CONSTRAINT UQ_F6_HandoverRevisionTrip UNIQUE (HandoverRevisionID, TripID),
    CONSTRAINT FK_F6_RevisionHandover FOREIGN KEY (HandoverID, TripID) REFERENCES HANDOVER(HandoverID, TripID),
    CONSTRAINT FK_F6_RevisionCreator FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F6_RevisionNo CHECK (RevisionNo>0 AND OtpFailedAttempts>=0),
    CONSTRAINT CK_F6_RevisionJson CHECK (ISJSON(ContentSnapshot)=1),
    CONSTRAINT CK_F6_RevisionStatus CHECK (Status IN ('DRAFT','AWAITING_OTP','CONFIRMED','REFUSED')),
    CONSTRAINT CK_F6_RevisionOtpHash CHECK (OtpHash IS NULL OR (LEN(OtpHash)=64 AND OtpHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2)),
    CONSTRAINT CK_F6_RevisionPhase CHECK (
        (Status='DRAFT' AND OtpEmail IS NULL AND OtpHash IS NULL AND OtpSentAtUtc IS NULL AND OtpExpiresAtUtc IS NULL AND OtpFailedAttempts=0 AND ConfirmedAtUtc IS NULL AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='AWAITING_OTP' AND OtpEmail IS NOT NULL AND LEN(LTRIM(RTRIM(OtpEmail)))>0 AND OtpHash IS NOT NULL AND OtpSentAtUtc IS NOT NULL AND OtpSentAtUtc>=CreatedAtUtc AND OtpExpiresAtUtc IS NOT NULL AND OtpExpiresAtUtc>OtpSentAtUtc AND ConfirmedAtUtc IS NULL AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='CONFIRMED' AND OtpEmail IS NOT NULL AND LEN(LTRIM(RTRIM(OtpEmail)))>0 AND OtpHash IS NULL AND OtpSentAtUtc IS NOT NULL AND OtpSentAtUtc>=CreatedAtUtc AND OtpExpiresAtUtc IS NOT NULL AND OtpExpiresAtUtc>OtpSentAtUtc AND ConfirmedAtUtc IS NOT NULL AND ConfirmedAtUtc>=OtpSentAtUtc AND ConfirmedAtUtc<OtpExpiresAtUtc AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='REFUSED' AND OtpEmail IS NULL AND OtpHash IS NULL AND OtpSentAtUtc IS NULL AND OtpExpiresAtUtc IS NULL AND OtpFailedAttempts=0 AND ConfirmedAtUtc IS NULL AND RefusalReason IS NOT NULL AND LEN(LTRIM(RTRIM(RefusalReason)))>0 AND RefusedAtUtc IS NOT NULL AND RefusedAtUtc>=CreatedAtUtc))
);


CREATE TABLE TRIP_SETTLEMENT (
    SettlementID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    ContractVersionNo INT NOT NULL,
    HandoverRevisionID VARCHAR(50) NULL,
    FinalInvoiceID VARCHAR(50) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    -- Signed price is in CONTRACT_VERSION; money received remains in INVOICE/PAYMENT.
    PreparedBy VARCHAR(50) NOT NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    SettledBy VARCHAR(50) NULL,
    SettledAtUtc DATETIME2(7) NULL,
    ClosedAtUtc DATETIME2(7) NULL,
    FeedbackStartedAtUtc DATETIME2(7) NULL,
    FeedbackEndsAtUtc DATETIME2(7) NULL,
    CONSTRAINT PK_TripSettlement PRIMARY KEY (SettlementID),
    CONSTRAINT UQ_F6_SettlementContract UNIQUE (ContractID),
    CONSTRAINT UQ_F6_SettlementTrip UNIQUE (TripID),
    CONSTRAINT FK_F6_SettlementScope FOREIGN KEY (ContractID, TripID, CustomerID) REFERENCES CONTRACT(ContractID, TripID, CustomerID),
    CONSTRAINT FK_F6_SettlementVersion FOREIGN KEY (ContractID, ContractVersionNo) REFERENCES CONTRACT_VERSION(ContractID, VersionNo),
    CONSTRAINT FK_F6_SettlementHandover FOREIGN KEY (HandoverRevisionID, TripID) REFERENCES HANDOVER_REVISION(HandoverRevisionID, TripID),
    CONSTRAINT FK_F6_SettlementInvoice FOREIGN KEY (FinalInvoiceID, ContractID, ContractVersionNo) REFERENCES INVOICE(InvoiceID, ContractID, ContractVersionNo),
    CONSTRAINT FK_F6_SettlementPreparer FOREIGN KEY (PreparedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_F6_SettlementVerifier FOREIGN KEY (SettledBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F6_SettlementStatus CHECK (Status IN ('DRAFT','AWAITING_PAYMENT','SETTLED','CLOSED')),
    CONSTRAINT CK_F6_SettlementPhase CHECK (
        (Status='DRAFT' AND SettledAtUtc IS NULL AND SettledBy IS NULL AND ClosedAtUtc IS NULL)
        OR (Status='AWAITING_PAYMENT' AND HandoverRevisionID IS NOT NULL AND FinalInvoiceID IS NOT NULL AND SettledAtUtc IS NULL AND SettledBy IS NULL AND ClosedAtUtc IS NULL)
        OR (Status='SETTLED' AND HandoverRevisionID IS NOT NULL AND FinalInvoiceID IS NOT NULL AND SettledAtUtc IS NOT NULL AND SettledBy IS NOT NULL AND ClosedAtUtc IS NULL)
        OR (Status='CLOSED' AND HandoverRevisionID IS NOT NULL AND FinalInvoiceID IS NOT NULL AND SettledAtUtc IS NOT NULL AND SettledBy IS NOT NULL AND ClosedAtUtc IS NOT NULL)),
    CONSTRAINT CK_F6_SettlementFeedback CHECK ((Status IN ('DRAFT','AWAITING_PAYMENT') AND FeedbackStartedAtUtc IS NULL AND FeedbackEndsAtUtc IS NULL) OR (Status IN ('SETTLED','CLOSED') AND FeedbackStartedAtUtc IS NOT NULL AND FeedbackEndsAtUtc IS NOT NULL AND FeedbackStartedAtUtc>=SettledAtUtc AND FeedbackEndsAtUtc>FeedbackStartedAtUtc AND (ClosedAtUtc IS NULL OR ClosedAtUtc>=FeedbackEndsAtUtc))),
    CONSTRAINT CK_F6_SettlementTimes CHECK ((SettledAtUtc IS NULL OR SettledAtUtc>=CreatedAtUtc) AND (ClosedAtUtc IS NULL OR ClosedAtUtc>=SettledAtUtc))
);

CREATE TABLE SETTLEMENT_ADJUSTMENT (
    AdjustmentID VARCHAR(50) NOT NULL,
    SettlementID VARCHAR(50) NOT NULL,
    IncidentID VARCHAR(50) NULL,
    CostItemID VARCHAR(50) NULL,
    OriginalInvoiceID VARCHAR(50) NULL,
    AdjustedInvoiceID VARCHAR(50) NULL,
    AppliedAtUtc DATETIME2(7) NULL,
    RefundStatus VARCHAR(20) NULL,
    RefundedBy VARCHAR(50) NULL,
    RefundedAtUtc DATETIME2(7) NULL,
    RefundReference VARCHAR(100) NULL,
    AdjustmentType VARCHAR(20) NOT NULL,
    Amount DECIMAL(12,2) NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    EvidenceUrl NVARCHAR(500) NULL,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    DecidedBy VARCHAR(50) NOT NULL,
    DecidedAtUtc DATETIME2(7) NOT NULL,
    DecisionReason NVARCHAR(2000) NOT NULL,
    CONSTRAINT PK_SettlementAdjustment PRIMARY KEY (AdjustmentID),
    CONSTRAINT FK_F6_AdjustmentScope FOREIGN KEY (SettlementID) REFERENCES TRIP_SETTLEMENT(SettlementID),
    CONSTRAINT FK_F6_AdjustmentIncident FOREIGN KEY (IncidentID) REFERENCES INCIDENT(IncidentID),
    CONSTRAINT FK_F6_AdjustmentCost FOREIGN KEY (CostItemID) REFERENCES COST_ITEM(CostItemID),
    CONSTRAINT FK_F6_AdjustmentCreator FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_F6_AdjustmentDecider FOREIGN KEY (DecidedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_F6_AdjustmentOriginalInvoice FOREIGN KEY (OriginalInvoiceID) REFERENCES INVOICE(InvoiceID),
    CONSTRAINT FK_F6_AdjustmentAdjustedInvoice FOREIGN KEY (AdjustedInvoiceID) REFERENCES INVOICE(InvoiceID),
    CONSTRAINT FK_F6_AdjustmentRefunder FOREIGN KEY (RefundedBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F6_AdjustmentApplied CHECK ((AdjustedInvoiceID IS NULL AND AppliedAtUtc IS NULL) OR (AdjustedInvoiceID IS NOT NULL AND OriginalInvoiceID IS NOT NULL AND AdjustedInvoiceID<>OriginalInvoiceID AND AppliedAtUtc IS NOT NULL AND DecidedAtUtc IS NOT NULL AND AppliedAtUtc>=DecidedAtUtc AND AdjustmentType IN ('CHARGE','DISCOUNT'))),
    CONSTRAINT CK_F6_AdjustmentRefund CHECK (
        (RefundStatus IS NULL AND RefundedBy IS NULL AND RefundedAtUtc IS NULL AND RefundReference IS NULL)
        OR (RefundStatus IS NOT NULL AND AdjustmentType='REFUND' AND OriginalInvoiceID IS NOT NULL AND AdjustedInvoiceID IS NULL AND AppliedAtUtc IS NULL AND
            ((RefundStatus IN ('REQUESTED','PROCESSING') AND RefundedAtUtc IS NULL AND RefundReference IS NULL)
             OR (RefundStatus='COMPLETED' AND RefundedBy IS NOT NULL AND RefundedAtUtc IS NOT NULL AND RefundedAtUtc>=DecidedAtUtc AND RefundReference IS NOT NULL AND LEN(LTRIM(RTRIM(RefundReference)))>0)))),
    CONSTRAINT CK_F6_AdjustmentType CHECK (AdjustmentType IN ('CHARGE','DISCOUNT','REFUND')),
    CONSTRAINT CK_F6_AdjustmentMoney CHECK (Amount>0 AND Amount=ROUND(Amount,0)),
    CONSTRAINT CK_F6_AdjustmentDecision CHECK (DecidedAtUtc>=CreatedAtUtc AND LEN(LTRIM(RTRIM(DecisionReason)))>0),
    CONSTRAINT CK_F6_AdjustmentReason CHECK (LEN(LTRIM(RTRIM(Reason)))>0)
);


CREATE TABLE CUSTOMER_CASE (
    CaseID VARCHAR(50) NOT NULL,
    SettlementID VARCHAR(50) NOT NULL,
    CaseType VARCHAR(20) NOT NULL,
    Status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    Subject NVARCHAR(200) NOT NULL,
    Description NVARCHAR(2000) NOT NULL,
    OpenedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    ResolutionText NVARCHAR(2000) NULL,
    HandledBy VARCHAR(50) NULL,
    HandledAtUtc DATETIME2(7) NULL,
    ResolvedAtUtc DATETIME2(7) NULL,
    CONSTRAINT PK_CustomerCase PRIMARY KEY (CaseID),
    CONSTRAINT UQ_F6_CaseSettlement UNIQUE (CaseID, SettlementID),
    CONSTRAINT FK_F6_CaseSettlement FOREIGN KEY (SettlementID) REFERENCES TRIP_SETTLEMENT(SettlementID),
    CONSTRAINT FK_F6_CaseHandler FOREIGN KEY (HandledBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F6_CaseHandler CHECK ((HandledBy IS NULL AND HandledAtUtc IS NULL) OR (HandledBy IS NOT NULL AND HandledAtUtc IS NOT NULL AND HandledAtUtc>=OpenedAtUtc)),
    CONSTRAINT CK_F6_CaseType CHECK (CaseType IN ('COMPLAINT','SUPPORT')),
    CONSTRAINT CK_F6_CaseStatus CHECK (Status IN ('OPEN','IN_PROGRESS','RESOLVED')),
    CONSTRAINT CK_F6_CaseResolution CHECK (
        (Status IN ('OPEN','IN_PROGRESS') AND ResolvedAtUtc IS NULL)
        OR (Status='RESOLVED' AND ResolutionText IS NOT NULL AND LEN(LTRIM(RTRIM(ResolutionText)))>0 AND HandledBy IS NOT NULL AND HandledAtUtc IS NOT NULL AND ResolvedAtUtc IS NOT NULL AND ResolvedAtUtc>=HandledAtUtc)),
    CONSTRAINT CK_F6_CaseTimes CHECK (ResolvedAtUtc IS NULL OR ResolvedAtUtc>=OpenedAtUtc),
    CONSTRAINT CK_F6_CaseText CHECK (LEN(LTRIM(RTRIM(Subject)))>0 AND LEN(LTRIM(RTRIM(Description)))>0)
);



CREATE TABLE CUSTOMER_FEEDBACK (
    FeedbackID VARCHAR(50) NOT NULL,
    SettlementID VARCHAR(50) NOT NULL,
    Rating TINYINT NOT NULL,
    Comment NVARCHAR(2000) NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CustomerFeedback PRIMARY KEY (FeedbackID),
    CONSTRAINT UQ_F6_FeedbackWindow UNIQUE (SettlementID),
    CONSTRAINT FK_F6_FeedbackSettlement FOREIGN KEY (SettlementID) REFERENCES TRIP_SETTLEMENT(SettlementID),
    CONSTRAINT CK_F6_FeedbackRating CHECK (Rating BETWEEN 1 AND 5)
);

CREATE INDEX IX_F6_CaseQueue ON CUSTOMER_CASE(SettlementID, CaseType, Status);
CREATE UNIQUE INDEX UX_F6_ActualCostAdjustment ON SETTLEMENT_ADJUSTMENT(CostItemID) WHERE CostItemID IS NOT NULL;
CREATE UNIQUE INDEX UX_F6_FinalInvoice ON INVOICE(ContractID, ContractVersionNo) WHERE InvoiceType='FINAL_SETTLEMENT' AND PaymentStatus<>'CANCELLED';
GO
-- Signed/refused snapshots cannot be rewritten or deleted. Corrections create a new revision.
CREATE TRIGGER TR_F6_HandoverRevisionImmutable ON HANDOVER_REVISION AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(HandoverRevisionID) AND EXISTS (SELECT 1 FROM deleted)
        THROW 51068, 'Handover revision ID is immutable.', 1;
    IF EXISTS (SELECT 1 FROM deleted WHERE Status IN ('CONFIRMED','REFUSED'))
        THROW 51060, 'Finalized handover revision is immutable; create a new revision.', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.HandoverRevisionID=d.HandoverRevisionID WHERE d.Status='AWAITING_OTP' AND i.Status<>'DRAFT' AND (CONVERT(VARBINARY(MAX),d.ContentSnapshot)<>CONVERT(VARBINARY(MAX),i.ContentSnapshot) OR i.HandoverID<>d.HandoverID OR i.TripID<>d.TripID OR i.RevisionNo<>d.RevisionNo OR (i.Status IN ('AWAITING_OTP','CONFIRMED') AND ISNULL(i.OtpEmail,'')<>ISNULL(d.OtpEmail,''))))
        THROW 51066, 'Invalidate OTP and return to DRAFT before changing signed content or recipient.', 1;
END;
GO
CREATE TRIGGER TR_F6_AdjustmentImmutable ON SETTLEMENT_ADJUSTMENT AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(AdjustmentID) AND EXISTS (SELECT 1 FROM deleted) THROW 51064, 'Adjustment ID is immutable.', 1;
    IF EXISTS (SELECT 1 FROM deleted d WHERE NOT EXISTS (SELECT 1 FROM inserted i WHERE i.AdjustmentID=d.AdjustmentID)) THROW 51064, 'Decided adjustment cannot be deleted.', 1;
    IF EXISTS (SELECT d.AdjustmentID,d.SettlementID,d.IncidentID,d.CostItemID,d.OriginalInvoiceID,d.AdjustmentType,d.Amount,d.Reason,d.EvidenceUrl,d.CreatedBy,d.CreatedAtUtc,d.DecidedBy,d.DecidedAtUtc,d.DecisionReason FROM deleted d EXCEPT SELECT i.AdjustmentID,i.SettlementID,i.IncidentID,i.CostItemID,i.OriginalInvoiceID,i.AdjustmentType,i.Amount,i.Reason,i.EvidenceUrl,i.CreatedBy,i.CreatedAtUtc,i.DecidedBy,i.DecidedAtUtc,i.DecisionReason FROM inserted i) THROW 51064, 'Approved amount and decision are immutable.', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.AdjustmentID=d.AdjustmentID WHERE d.AdjustedInvoiceID IS NOT NULL AND (i.AdjustedInvoiceID IS NULL OR i.AdjustedInvoiceID<>d.AdjustedInvoiceID OR i.AppliedAtUtc IS NULL OR i.AppliedAtUtc<>d.AppliedAtUtc)) THROW 51064, 'Invoice application is immutable.', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.AdjustmentID=d.AdjustmentID WHERE d.RefundStatus='COMPLETED' AND EXISTS (SELECT d.RefundStatus,d.RefundedBy,d.RefundedAtUtc,d.RefundReference EXCEPT SELECT i.RefundStatus,i.RefundedBy,i.RefundedAtUtc,i.RefundReference)) THROW 51065, 'Completed refund evidence is immutable.', 1;
END;
GO
CREATE TRIGGER TR_F6_AdjustmentScope ON SETTLEMENT_ADJUSTMENT AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN TRIP_SETTLEMENT s ON s.SettlementID=i.SettlementID LEFT JOIN INCIDENT n ON n.IncidentID=i.IncidentID LEFT JOIN COST_ITEM c ON c.CostItemID=i.CostItemID WHERE (i.IncidentID IS NOT NULL AND n.TripID<>s.TripID) OR (i.CostItemID IS NOT NULL AND c.ContractID<>s.ContractID))
        THROW 51067, 'Adjustment source must belong to the same trip and contract.', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN TRIP_SETTLEMENT s ON s.SettlementID=i.SettlementID JOIN INVOICE v ON v.InvoiceID IN (i.OriginalInvoiceID,i.AdjustedInvoiceID) WHERE v.ContractID<>s.ContractID OR v.ContractVersionNo<>s.ContractVersionNo OR ISNULL(v.InvoiceType,'')<>'FINAL_SETTLEMENT')
        THROW 51069, 'Adjustment invoices must match settlement contract/version and be final invoices.', 1;
END;
GO
CREATE TRIGGER TR_F6_HandoverItemsLocked ON HANDOVER_ITEM AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM (SELECT HandoverID FROM inserted UNION SELECT HandoverID FROM deleted) d JOIN HANDOVER_REVISION r ON r.HandoverID=d.HandoverID WHERE r.Status IN ('AWAITING_OTP','CONFIRMED','REFUSED') AND NOT EXISTS (SELECT 1 FROM HANDOVER_REVISION newer WHERE newer.HandoverID=r.HandoverID AND newer.RevisionNo>r.RevisionNo))
        THROW 51061, 'Handover items/documents are locked by the latest OTP revision.', 1;
END;
GO
-- FLOW 6 EXTENSION END

-- Registration: unique non-null emails and phone numbers, created before sample data.
CREATE UNIQUE INDEX UX_USER_Email ON dbo.[USER](Email) WHERE Email IS NOT NULL;
CREATE UNIQUE INDEX UX_USER_Phone ON dbo.[USER](Phone) WHERE Phone IS NOT NULL;

-- Flow 1: Chi muc bao ve quan he va giao dich khong trung lap.
CREATE UNIQUE INDEX UX_INVOICE_ContractID_Deposit ON [INVOICE] ([ContractID], [ContractVersionNo]) WHERE ([InvoiceType]='DEPOSIT');
CREATE UNIQUE INDEX UX_F1S_VnpayReceipt ON [PAYMENT] ([VnpayTmnCode], [TransactionCode]) WHERE ([VnpayTmnCode] IS NOT NULL AND [TransactionCode] IS NOT NULL AND [Status]='SUCCESS');
CREATE INDEX IX_F1S_OtpBudget ON [NOTIFICATION] ([UserID], [Type], [Channel], [SentAt]);
CREATE UNIQUE INDEX UX_F1N_RequestSubmission ON [TRANSPORT_REQUEST] ([CustomerID], [SubmissionKeyHash]) WHERE ([SubmissionKeyHash] IS NOT NULL);
CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON [TRIP_PLAN] ([RequestID]);
CREATE UNIQUE INDEX UX_CONTRACT_RequestID ON [CONTRACT] ([RequestID]);

GO

-- DataSet
-- =============================================================================
-- PHÂN VÙNG 1: QUẢN TRỊ NGƯỜI DÙNG, TÀI SẢN & PHÁP LÝ HỆ THỐNG
-- =============================================================================

-- 1. Bảng USER: Đầy đủ các Actor theo phân quyền (có cả tài khoản hoạt động và bị khóa)
-- Include new columns ForgotPasswordRequest and ResetPasswordRequest (nullable)
INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, ForgotPasswordRequest, ResetPasswordRequest, IsActive) VALUES
('USER_001', 'nguyenvana', 'HASH_SECURE_01', 'CUSTOMER', N'Nguyễn Văn A (CLB Hà Nội)', 'vana.horse@gmail.com', '0901234567', NULL, NULL, 1),
('USER_002', 'tranvanb', 'HASH_SECURE_02', 'CUSTOMER', N'Trần Văn B (Trang trại Sài Gòn)', 'tranb.racing@gmail.com', '0908889999', NULL, NULL, 1),
('USER_003', 'lethic_locked', 'HASH_SECURE_03', 'CUSTOMER', N'Lê Thị C (Khách vi phạm)', 'lethic.locked@gmail.com', '0911223344', NULL, NULL, 0),
('USER_004', 'manager_linh', 'HASH_SECURE_04', 'LOGISTICS_MANAGER', N'Trần Thị Linh (Logistics Manager)', 'linh.manager@cbntransport.com', '0912345678', NULL, NULL, 1),
('USER_005', 'spec_tuan', 'HASH_SECURE_05', 'TRANSPORT_SPECIALIST', N'Lê Tuấn (Thẩm định pháp lý/thú y)', 'tuan.specialist@cbntransport.com', '0923456789', NULL, NULL, 1),
('USER_006', 'coord_hai', 'HASH_SECURE_06', 'FLEET_ROUTE_COORDINATOR', N'Phạm Hải (Điều phối xe & tuyến)', 'hai.coord@cbntransport.com', '0934567890', NULL, NULL, 1),
('USER_007', 'driver_hung', 'HASH_SECURE_07', 'DRIVER_ESCORT', N'Hoàng Hùng (Tài xế quốc tế 1)', 'hung.driver@cbntransport.com', '0945678901', NULL, NULL, 1),
('USER_008', 'driver_thanh', 'HASH_SECURE_08', 'DRIVER_ESCORT', N'Vũ Thành (Tài xế quốc tế 2)', 'thanh.driver@cbntransport.com', '0946789012', NULL, NULL, 1),
('USER_009', 'escort_hoa', 'HASH_SECURE_09', 'DRIVER_ESCORT', N'BS. Đỗ Hoa (Bác sĩ thú y áp tải)', 'hoa.escort@cbntransport.com', '0956789012', NULL, NULL, 1),
('USER_010', 'escort_nam', 'HASH_SECURE_10', 'DRIVER_ESCORT', N'BS. Phan Nam (Kỹ thuật viên ngựa)', 'nam.escort@cbntransport.com', '0957890123', NULL, NULL, 1);

-- Sample catalogs and mutable policy values. These are data, not service constants.
INSERT INTO COUNTRY (CountryCode, CountryName, IsActive) VALUES
('VN', N'Việt Nam', 1),
('JP', N'Nhật Bản', 1);

INSERT INTO SUPPORTED_ROUTE (RouteID, OriginCountry, DestinationCountry, TransportMode, IsActive) VALUES
('ROUTE_001', 'VN', 'VN', 'ROAD', 1),
('ROUTE_002', 'VN', 'VN', 'AIR', 1),
('ROUTE_003', 'VN', 'JP', 'AIR', 1);

INSERT INTO BUSINESS_POLICY (PolicyID, Code, ValueType, NumberValue, TextValue, BoolValue, Unit, ScopeType, ScopeID, Description, UpdatedBy) VALUES
('BUSINESS_POLICY_001', 'MIN_PREPARATION_DAYS', 'NUMBER', 3, NULL, NULL, 'DAY', 'GLOBAL', NULL, N'Số ngày chuẩn bị tối thiểu mặc định khi không có cấu hình phạm vi cụ thể.', 'USER_004'),
('BUSINESS_POLICY_002', 'MIN_PREPARATION_DAYS', 'NUMBER', 7, NULL, NULL, 'DAY', 'COUNTRY', 'JP', N'Số ngày chuẩn bị tối thiểu khi quốc gia đích là Nhật Bản.', 'USER_004'),
('BUSINESS_POLICY_003', 'CONTRACT_DEADLINE_HOURS', 'NUMBER', 24, NULL, NULL, 'HOUR', 'GLOBAL', NULL, N'Thời hạn chung để thanh toán cọc, xác minh cọc và ký hợp đồng.', 'USER_004'),
('BUSINESS_POLICY_004', 'DEFAULT_DEPOSIT_PERCENT', 'NUMBER', 40, NULL, NULL, 'PERCENT', 'GLOBAL', NULL, N'Tỷ lệ cọc mặc định; 40 tương ứng 40 phần trăm, chốt vào hợp đồng lúc phát hành.', 'USER_004'),
('BUSINESS_POLICY_005', 'SIGN_OTP_TTL_MINUTES', 'NUMBER', 5, NULL, NULL, 'MINUTE', 'GLOBAL', NULL, N'Thời gian hiệu lực của một mã OTP ký hợp đồng.', 'USER_004'),
('BUSINESS_POLICY_006', 'SIGN_OTP_RESEND_SECONDS', 'NUMBER', 60, NULL, NULL, 'SECOND', 'GLOBAL', NULL, N'Khoảng chờ tối thiểu trước khi cấp lại OTP ký hợp đồng.', 'USER_004'),
('BUSINESS_POLICY_007', 'SIGN_OTP_MAX_ATTEMPTS', 'NUMBER', 5, NULL, NULL, 'ATTEMPT', 'GLOBAL', NULL, N'Số lần nhập sai tối đa của một mã OTP ký hợp đồng.', 'USER_004'),
('BUSINESS_POLICY_008', 'FEEDBACK_WINDOW_HOURS', 'NUMBER', 24, NULL, NULL, 'HOUR', 'GLOBAL', NULL, N'Thời lượng cửa sổ phản hồi sau tất toán hoặc sau khi khách chấp nhận kết quả giải quyết khiếu nại.', 'USER_004');

-- 2. Bảng HORSE: Đa dạng cá thể (Ngựa đực Stallion, Ngựa cái Mare, Ngựa thiến Gelding)
INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB, PhotoUrl, PassportScanUrl) VALUES
('HORSE_001', 'USER_001', '981098102938475', 'VN_FEI_2026_01', N'Tia Chớp Đỏ (Red Lightning)', N'Thoroughbred', 'STALLION', 'INTACT', 520.50, '2020-04-15', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_002', 'USER_001', '981098102938476', 'VN_FEI_2026_02', N'Bão Táp Xanh (Blue Storm)', N'Arabian', 'MARE', 'NOT_PREGNANT', 485.00, '2021-06-20', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_003', 'USER_002', '981098102938477', 'VN_FEI_2026_03', N'Bạch Mã Hoàng Tử (Prince)', N'Thoroughbred', 'GELDING', 'GELDED', 540.00, '2019-09-10', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_004', 'USER_002', '981098102938478', 'VN_FEI_2026_04', N'Nữ Hoàng Cát (Desert Queen)', N'Warmblood', 'MARE', 'PREGNANT', 510.00, '2020-11-05', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_005', 'USER_003', '981098102938479', 'VN_FEI_2026_05', N'Chiến Binh Đen (Black Knight)', N'Friesian', 'STALLION', 'INTACT', 560.00, '2018-03-12', NULL, NULL);

-- 3. Bảng STAFF_DOCUMENT: Giấy phép, Hộ chiếu, Visa nhân sự (Có hồ sơ hợp lệ và hồ sơ sắp hết hạn)
INSERT INTO STAFF_DOCUMENT (DocumentID, UserID, DocType, CountryOfIssue, ValidForCountries, IssueDate, ExpiryDate, DocumentUrl, Status) VALUES
('STAFF_DOCUMENT_001', 'USER_007', 'PASSPORT', 'VN', N'VN, JP', '2023-01-10', '2033-01-10', 'https://storage.cbntransport.com/docs/pass_hung.pdf', 'VALID'),
('STAFF_DOCUMENT_002', 'USER_007', 'DRIVING_LICENSE', 'VN', N'VN', '2022-05-15', '2027-05-15', 'https://storage.cbntransport.com/docs/lic_hung.pdf', 'VALID'),
('STAFF_DOCUMENT_003', 'USER_009', 'PASSPORT', 'VN', N'VN, JP', '2024-02-01', '2034-02-01', 'https://storage.cbntransport.com/docs/pass_hoa.pdf', 'VALID'),
('STAFF_DOCUMENT_004', 'USER_008', 'PASSPORT', 'VN', N'VN, JP', '2022-08-10', '2032-08-10', 'https://storage.cbntransport.com/docs/pass_thanh.pdf', 'VALID'),
('STAFF_DOCUMENT_005', 'USER_010', 'PASSPORT', 'VN', N'VN, JP', '2021-03-01', '2026-10-25', 'https://storage.cbntransport.com/docs/pass_nam.pdf', 'EXPIRING_SOON');

-- 4. Bảng NOTIFICATION: Lịch sử thông báo hệ thống gửi qua App/Email/SMS
INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt) VALUES
('NOTIFICATION_001', 'USER_001', 'REQUEST_001', 'ORDER_STATUS', 'APP_PUSH', N'Yêu cầu vận chuyển được duyệt', N'Đơn REQUEST_001 của bạn đã được phê duyệt.', 1, N'2026-09-03 08:30:00'),
('NOTIFICATION_002', 'USER_007', 'TRIP_001', 'TRIP_ASSIGN', 'SMS', N'Lệnh điều xe mới', N'Bạn được phân công làm tài xế chính chuyến TRIP_001.', 1, N'2026-09-04 16:30:00'),
('NOTIFICATION_003', 'USER_002', 'INCIDENT_002', 'INCIDENT', 'EMAIL', N'Cảnh báo sự cố hiện trường', N'Ngựa HORSE_003 bị stress nhiệt; chuyến được theo dõi và giao muộn.', 1, N'2026-10-05 14:00:00'),
('NOTIFICATION_004', 'USER_005', 'LEGAL_MEDICAL_RECORD_006', 'DOC_WARNING', 'WEB_ALERT', N'Hồ sơ xét nghiệm bị từ chối', N'Mã xét nghiệm Coggins của ngựa HORSE_005 đã quá 6 tháng.', 0, '2026-10-08 14:00:00');

-- 5. Bảng POLICY_AND_TERM: Quản lý điều khoản và chính sách áp dụng
INSERT INTO POLICY_AND_TERM (PolicyID, PolicyType, Title, Content, Version, EffectiveDate, IsActive, CreatedBy, CreatedAt) VALUES
('POLICY_TERM_001', 'TERMS_OF_SERVICE', N'Điều khoản Vận chuyển Động vật Sống Xuyên Biên giới', N'<p>Quy định chi tiết về quyền bồi thường bảo hiểm, phí lưu chuồng trạm kiểm dịch...</p>', 'v1.0', '2026-01-01', 1, 'USER_004', '2026-01-01 00:00:00'),
('POLICY_TERM_002', 'TRANSPORT_RULE', N'Quy chế Dinh dưỡng và Nghỉ ngơi cho Ngựa Đua', N'<p>Bắt buộc dừng nghỉ mỗi 4-6 giờ đường bộ, cho uống nước bù điện giải định kỳ.</p>', 'v1.1', '2026-03-01', 1, 'USER_005', '2026-03-01 00:00:00');

-- CONTRACT_TEMPLATE contains individual clauses, not complete document layouts.
-- Twelve fixed clauses from the approved contract wizard.
DECLARE @Flow1Terms TABLE(TemplateID varchar(50),Title nvarchar(255),Content nvarchar(max));
INSERT INTO @Flow1Terms VALUES
(N'CONTRACT_TEMPLATE_001',N'Điều 1. Thông tin và tư cách các bên',N'CBN Transport (Bên A) cung cấp dịch vụ cho Customer (Bên B). Thông tin pháp lý, người đại diện và liên hệ được ghi trong hồ sơ hợp đồng. Customer phải có quyền sở hữu hoặc ủy quyền vận chuyển ngựa hợp lệ.'),
(N'CONTRACT_TEMPLATE_002',N'Điều 2. Đối tượng vận chuyển',N'Danh sách, số lượng, định danh, hộ chiếu và yêu cầu sức khỏe/chăm sóc ngựa lấy trực tiếp từ Transport Request đã được duyệt. Customer chịu trách nhiệm khai báo trung thực; tình trạng ngựa được ghi nhận tại lúc tiếp nhận và bàn giao. Manager không tự sửa dữ liệu thuộc Customer.'),
(N'CONTRACT_TEMPLATE_003',N'Điều 3. Phạm vi dịch vụ',N'CBN Transport tổ chức nhận/giao ngựa, chặng đường bộ, nhân sự hộ tống, bác sĩ thú y, kiểm dịch, bảo hiểm và thủ tục liên quan. Nếu phương án được duyệt là Việt Nam đến Nhật Bản thì có chặng hàng không trực tiếp do bên thứ ba cung cấp. Xe, tài xế và số chuyến bay cụ thể được xác định trong Trip.'),
(N'CONTRACT_TEMPLATE_004',N'Điều 4. Địa điểm, lộ trình và thời gian',N'Địa điểm nhận/giao, người nhận được ủy quyền, ngày khởi hành mong muốn và hạn giao lấy từ Request đã duyệt. Thay đổi kế hoạch vận hành do người có thẩm quyền phê duyệt; không được sửa cam kết hoặc dữ liệu Request trong hợp đồng đã ký.'),
(N'CONTRACT_TEMPLATE_005',N'Điều 5. Giá trị hợp đồng',N'Giá bán chính thức và từng hạng mục thể hiện trong hợp đồng. Giá bao gồm bảo hiểm và những dịch vụ được ghi nhận; khoản chưa bao gồm phải thể hiện rõ. Chi phí nội bộ, giá sàn và lợi nhuận không cung cấp cho Customer. Chi phí phát sinh không làm thay đổi giá trị hợp đồng gốc.'),
(N'CONTRACT_TEMPLATE_006',N'Điều 6. Thanh toán và xử lý quá hạn',N'Manager quyết định tỷ lệ tiền cọc thể hiện trong hợp đồng. Một hạn chung theo cấu hình CONTRACT_DEADLINE_HOURS đã chốt khi phát hành áp dụng cho nộp cọc, xác minh và ký OTP; Manager có thể gia hạn, quá hạn không tự hủy. Sau bàn giao hợp lệ, Customer nghiệm thu trước rồi thanh toán số dư và hệ thống xác minh trong một thời hạn chung theo cấu hình đã chốt; chỉ có tranh chấp được tạm dừng theo điều khoản xử lý tranh chấp.'),
(N'CONTRACT_TEMPLATE_007',N'Điều 7. Quyền và nghĩa vụ các bên',N'CBN Transport tổ chức phương tiện/nhân sự đạt yêu cầu, hồ sơ, kiểm dịch, chăm sóc, bảo hiểm, theo dõi và bàn giao đúng người. Customer cung cấp thông tin/hồ sơ trung thực, chuẩn bị ngựa, phối hợp nhận/giao, nghiệm thu và thanh toán. Mỗi bên chịu trách nhiệm đối với nghĩa vụ của mình.'),
(N'CONTRACT_TEMPLATE_008',N'Điều 8. Bảo hiểm và cấp cứu thú y',N'CBN Transport thu xếp bảo hiểm từ lúc tiếp nhận đến bàn giao theo phạm vi và loại trừ của đơn bảo hiểm thực tế. Trong trường hợp cấp cứu đe dọa sức khỏe hoặc tính mạng ngựa, bác sĩ thú y được thực hiện biện pháp chuyên môn cần thiết trong phạm vi Customer ủy quyền trước mà không bị áp hạn mức tiền cứng. Phải ghi chứng cứ, thông báo Manager và Customer sớm; chi phí và trách nhiệm phân định sau.'),
(N'CONTRACT_TEMPLATE_009',N'Điều 9. Sự cố, thay đổi và chi phí phát sinh',N'Driver và bác sĩ thú y ghi nhận sự cố. Coordinator đề xuất thay đổi phương án, Manager phê duyệt các quyết định thuộc thẩm quyền. Chi phí phát sinh được phân định theo nguyên nhân, trách nhiệm, bảo hiểm và hợp đồng. Khoản Customer phải trả chưa được ủy quyền trước cần Customer xác nhận khi áp dụng; cấp cứu đã ủy quyền được xử lý theo Điều 8. Không sửa hợp đồng gốc.'),
(N'CONTRACT_TEMPLATE_010',N'Điều 10. Bàn giao, nghiệm thu và thanh toán cuối',N'Driver bàn giao cho người nhận hợp lệ và ghi biên bản, tình trạng ngựa, chữ ký, hình ảnh. Kể từ bàn giao, Customer có thời hạn chung được ghi trong hợp đồng để xem xét và xác nhận nghiệm thu TRƯỚC, thanh toán số dư SAU và chờ xác minh. Im lặng hoặc quá hạn không đồng nghĩa chấp nhận; không được giữ ngựa tùy tiện vì chậm thanh toán.'),
(N'CONTRACT_TEMPLATE_011',N'Điều 11. Hủy dịch vụ và giải quyết tranh chấp',N'Khiếu nại phải ghi nhận chứng cứ và được Manager xem xét. Phần tiền tranh chấp được tạm dừng theo thỏa thuận, phần không tranh chấp vẫn có nghĩa vụ thanh toán. Khi hai bên xác nhận kết quả giải quyết, bắt đầu lại nguyên thời hạn phản hồi đã thỏa thuận để hoàn tất nghiệm thu/thanh toán còn thiếu. Vi phạm, hủy, hoàn trả/bồi thường theo từng trường hợp, không tự áp một mức phạt chung. Tranh chấp không thống nhất xử lý ngoài hệ thống.'),
(N'CONTRACT_TEMPLATE_012',N'Điều 12. Ký kết, hiệu lực và lưu trữ',N'Customer xác nhận nội dung hiện hành; hợp đồng chỉ có hiệu lực sau khi cọc đã xác minh và Customer ký OTP thành công. Sau ký, không bên nào được sửa, xóa, thay thế nội dung; bản ký và lịch sử trước ký được bảo lưu, không có phụ lục trong Demo. Trip đóng khi Manager ghi đóng Request sau khi hết thời hạn phản hồi của chu kỳ cuối, đã bàn giao, nghiệm thu, xác minh đủ thanh toán và không còn khiếu nại.');
UPDATE c SET TemplateName=s.Title,BodyContent=s.Content,UpdatedAt=SYSUTCDATETIME()
FROM CONTRACT_TEMPLATE c JOIN @Flow1Terms s ON s.TemplateID=c.TemplateID
WHERE LEN(c.BodyContent)=1 AND c.BodyContent COLLATE Latin1_General_100_BIN2 BETWEEN 'A' AND 'L';
INSERT INTO CONTRACT_TEMPLATE(TemplateID,TemplateName,LanguageCode,BodyContent,IsActive,CreatedAt)
SELECT s.TemplateID,s.Title,'VI',s.Content,1,CONVERT(DATETIME,'2026-01-01T00:00:00',126) FROM @Flow1Terms s
WHERE NOT EXISTS(SELECT 1 FROM CONTRACT_TEMPLATE c WHERE c.TemplateID=s.TemplateID);

GO

-- =============================================================================
-- PHÂN VÙNG 2: ĐỐI TÁC & TRẠM DỪNG NGHỈ/Y TẾ (PARTNER & FACILITY)
-- =============================================================================

-- 7. Bảng PARTNER_FACILITY: Các trạm dừng nghỉ, phòng khám thú y đối tác
INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, CountryCode, State_Province, City, Address, Coordinates, TimeZone, CapacityStalls, ContactPerson, ContactPhone, TaxID_BusinessCode, Status) VALUES
('FACILITY_001', N'Trạm tiếp nhận ngựa Nội Bài', 'REST_STATION', N'VN', N'Hà Nội', N'Sóc Sơn', N'Khu tiếp nhận hàng hóa Nội Bài', N'21.2187,105.8042', N'Asia/Ho_Chi_Minh', 8, N'Lê Văn Bình', '0988112233', '2801928374', 'ACTIVE'),
('FACILITY_002', N'Trạm thú y tiếp nhận Narita', 'VET_CLINIC', N'JP', N'Chiba', N'Narita', N'Khu tiếp nhận động vật Narita', N'35.7720,140.3929', N'Asia/Tokyo', 12, N'Kenji Tanaka', N'+819011112222', N'JP-DEMO-002', 'ACTIVE'),
('FACILITY_003', N'Trạm tiếp nhận ngựa Củ Chi', 'REST_STATION', N'VN', N'TP.HCM', N'Củ Chi', N'Khu tiếp nhận ngựa Củ Chi', N'10.9700,106.5000', N'Asia/Ho_Chi_Minh', 6, N'Trần Minh Tâm', '0918776655', '3901827364', 'ACTIVE'),
('FACILITY_004', N'Trung tâm thú y Đà Nẵng', 'VET_CLINIC', N'VN', N'Đà Nẵng', N'Hòa Vang', N'Khu thú y tiếp nhận Đà Nẵng', N'16.0500,108.2000', N'Asia/Ho_Chi_Minh', 10, N'Nguyễn Minh', N'0902223344', N'VN-DEMO-004', 'ACTIVE'),
('FACILITY_005', N'Trạm nghỉ chuyên dụng Đà Nẵng', 'REST_STATION', N'VN', N'Đà Nẵng', N'Hòa Vang', N'Km 24 Đường Tránh Nam Hải Vân', N'16.0544,108.2022', N'Asia/Ho_Chi_Minh', 8, N'Đặng Quốc Bảo', '0905123123', '0401928381', 'ACTIVE');

-- 8. Bảng FACILITY_CONTRACT: Hợp đồng nguyên tắc biểu phí lưu chuồng và dịch vụ
INSERT INTO FACILITY_CONTRACT (FacilityContractID, FacilityID, ContractCode, ValidFrom, ValidTo, RestFeePerHorse_Day, BasicMedicalCheckFee, DocumentUrl, Status) VALUES
('FACILITY_CONTRACT_001', 'FACILITY_001', N'FC_NOIBAI_2026', '2026-01-01', '2026-12-31', 1125000.00, 625000.00, N'https://example.invalid/contracts/facility_1.pdf', 'ACTIVE'),
('FACILITY_CONTRACT_002', 'FACILITY_002', N'FC_NARITA_2026', '2026-01-01', '2026-12-31', 1500000.00, 1000000.00, N'https://example.invalid/contracts/facility_2.pdf', 'ACTIVE'),
('FACILITY_CONTRACT_003', 'FACILITY_003', N'FC_CUCHI_2026', '2026-01-01', '2026-12-31', 1000000.00, 500000.00, N'https://example.invalid/contracts/facility_3.pdf', 'ACTIVE'),
('FACILITY_CONTRACT_004', 'FACILITY_004', N'FC_DANANG_2026', '2026-01-01', '2026-12-31', 1375000.00, 875000.00, N'https://example.invalid/contracts/facility_4.pdf', 'ACTIVE');

-- 9. Bảng FACILITY_CERTIFICATION: Chứng chỉ tiêu chuẩn vệ sinh thú y của trạm
INSERT INTO FACILITY_CERTIFICATION (CertID, FacilityID, CertName, IssuedBy, CountryOfIssue, IsInternationalStandard, IssueDate, ExpiryDate, DocumentUrl) VALUES
('FACILITY_CERTIFICATION_001', 'FACILITY_001', N'Chứng nhận thú y mẫu 1', N'Đơn vị cấp chứng nhận mẫu Việt Nam', N'VN', 1, '2025-01-10', '2027-01-10', N'https://example.invalid/certifications/1.pdf'),
('FACILITY_CERTIFICATION_002', 'FACILITY_002', N'Chứng nhận thú y mẫu 2', N'Đơn vị cấp chứng nhận mẫu Nhật Bản', N'JP', 1, '2024-05-20', '2027-05-20', N'https://example.invalid/certifications/2.pdf'),
('FACILITY_CERTIFICATION_003', 'FACILITY_004', N'Chứng nhận thú y mẫu 3', N'Đơn vị cấp chứng nhận mẫu Việt Nam', N'VN', 1, '2025-03-15', '2028-03-15', N'https://example.invalid/certifications/3.pdf');

-- =============================================================================
-- PHÂN VÙNG 3: YÊU CẦU & KIỂM DỊCH PHÁP LÝ (REQUEST & LEGAL)
-- =============================================================================

-- 10. Bảng TRANSPORT_REQUEST: 4 đơn đại diện cho 4 tình huống khác nhau
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status, OriginCountry, DestinationCountry, PreparationDays, PickupContactName, PickupContactPhone, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude, DistanceKm, ManagerNotes) VALUES
('REQUEST_001', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trung tâm tiếp nhận ngựa Narita, Nhật Bản', N'Thi đấu Cúp Hoàng Gia', N'AIR', '2026-09-15 06:00:00', '2026-09-18 18:00:00', N'Kenji Sato', N'+819012345678', 212500000.00, 'CLOSED', N'VN', N'JP', 7, N'Nguyễn Văn A', N'0901234567', 21.200000, 105.800000, 35.770000, 140.380000, NULL, NULL),
('REQUEST_002', 'USER_002', N'Trại ngựa Củ Chi, TP.HCM', N'Trung tâm tiếp nhận ngựa Đà Nẵng', N'Giao lưu huấn luyện', 'ROAD', '2026-10-05 05:00:00', '2026-10-06 17:00:00', N'Nguyễn Minh', N'0902223344', 105000000.00, N'DELIVERED', N'VN', N'VN', 3, N'Trần Văn B', N'0908889999', 10.970000, 106.500000, 16.050000, 108.200000, 950.00, N'Đã giao muộn ngày 06/10; còn hóa đơn cuối chưa thanh toán, chưa đóng request.'),
('REQUEST_003', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trại ngựa Phú Thọ, TP.HCM', N'Nhân giống thuần chủng', 'ROAD', '2026-10-08 07:00:00', '2026-10-11 20:00:00', N'Nguyễn Hoàng', '0903334455', 145000000.00, 'IN_PROGRESS', N'VN', N'VN', 3, N'Nguyễn Văn A', N'0901234567', 21.200000, 105.800000, 10.770000, 106.660000, 1720.00, NULL),
('REQUEST_004', 'USER_003', N'Khu huấn luyện Ba Vì, Hà Nội', N'Trung tâm tiếp nhận ngựa Narita, Nhật Bản', N'Bán chuyển nhượng', N'AIR', '2026-10-20 08:00:00', '2026-10-24 16:00:00', N'Kenji Sato', N'+819012345678', 300000000.00, 'REJECTED', N'VN', N'JP', 7, N'Lê Thị C', N'0911223344', 21.200000, 105.800000, 35.770000, 140.380000, NULL, N'Từ chối do hồ sơ xét nghiệm hết hạn; không tạo hợp đồng hoặc chuyến.');

-- 11. Bảng REQUEST_HORSE_MAPPING: Gán các cá thể ngựa vào từng yêu cầu
INSERT INTO REQUEST_HORSE_MAPPING (RequestID, HorseID) VALUES
('REQUEST_001', 'HORSE_001'),
('REQUEST_001', 'HORSE_002'),
('REQUEST_002', 'HORSE_003'),
('REQUEST_003', 'HORSE_001'),
('REQUEST_004', 'HORSE_005');

-- 12. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ thú y (Đủ điều kiện, Đang chờ duyệt, Bị từ chối do hết hạn)
INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, VerifiedBy, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl, ExpiryDate) VALUES
('LEGAL_MEDICAL_RECORD_001', 'HORSE_001', 'REQUEST_001', 'USER_005', 'COGGINS_TEST', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs1.pdf', '2026-12-01'),
('LEGAL_MEDICAL_RECORD_002', 'HORSE_001', 'REQUEST_001', 'USER_005', 'EQUINE_FLU_VAX', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/flu_hrs1.pdf', '2027-01-15'),
('LEGAL_MEDICAL_RECORD_003', 'HORSE_002', 'REQUEST_001', 'USER_005', 'COGGINS_TEST', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs2.pdf', '2026-12-01'),
('LEGAL_MEDICAL_RECORD_004', 'HORSE_003', 'REQUEST_002', 'USER_005', 'COGGINS_TEST', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs3.pdf', '2026-11-20'),
('LEGAL_MEDICAL_RECORD_005', 'HORSE_001', 'REQUEST_003', 'USER_005', 'DOMESTIC_VET_PASS', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/vet_dom_hrs1.pdf', '2027-05-10'),
('LEGAL_MEDICAL_RECORD_006', 'HORSE_005', 'REQUEST_004', 'USER_005', 'COGGINS_TEST', 'MANDATORY', 'EXPIRED', 'https://storage.cbntransport.com/docs/coggins_exp_hrs5.pdf', '2026-08-01');

-- 13. Bảng QUARANTINE_BOOKING: Đặt lịch cách ly tiền xuất/hậu nhập cảnh
INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status) VALUES
('QUARANTINE_BOOKING_001', 'REQUEST_001', 'FACILITY_002', N'Trạm thú y tiếp nhận Narita', N'Nhật Bản', N'2026-09-16 14:00:00', N'2026-09-17 08:00:00', N'CFM_DEMO_1', 'COMPLETED'),
('QUARANTINE_BOOKING_002', 'REQUEST_002', 'FACILITY_004', N'Trung tâm thú y Đà Nẵng', N'Việt Nam', N'2026-10-06 12:00:00', N'2026-10-06 17:00:00', N'CFM_DEMO_2', 'COMPLETED');

-- =============================================================================
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG (OPERATIONS & CUSTOMS)
-- =============================================================================

-- 14. Bảng TRIP_PLAN: Kế hoạch các chuyến đi
INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId) VALUES
('TRIP_001', 'REQUEST_001', 4500.00, 59.50, 155000000.00, 'COMPLETED', N'CONFIRMED', N'Hợp đồng đã ký và cọc đã xác minh; bàn giao cho hai nhân sự.', N'USER_004', N'2026-09-04 16:30:00', N'HANDOFF_EVENT_001', N'USER_005', N'USER_006'),
('TRIP_002', 'REQUEST_002', 950.00, 37.50, 77500000.00, 'COMPLETED', N'CONFIRMED', N'Hợp đồng đã ký và cọc đã xác minh; bàn giao cho hai nhân sự.', N'USER_004', N'2026-09-30 10:30:00', N'HANDOFF_EVENT_002', N'USER_005', N'USER_006'),
('TRIP_003', 'REQUEST_003', 1720.00, 42.00, 107500000.00, 'IN_TRANSIT', N'CONFIRMED', N'Hợp đồng đã ký và cọc đã xác minh; bàn giao cho hai nhân sự.', N'USER_004', N'2026-10-04 16:00:00', N'HANDOFF_EVENT_003', N'USER_005', N'USER_006');

-- 15. Bảng VEHICLE: Đội xe chuyên dụng chở ngựa đua
INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status) VALUES
('VEHICLE_001', 'HORSEBOX_3_STALLS', 3, 900.00, 30000.00, 'AVAILABLE'),
('VEHICLE_002', 'HORSEBOX_6_STALLS', 6, 1200.00, 45000.00, 'ON_TRIP'),
('VEHICLE_003', 'HORSEBOX_2_STALLS', 2, 750.00, 25000.00, 'MAINTENANCE');

-- 16. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái
INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, VehicleID, DriverID, EscortID) VALUES
('TRIP_ASSIGNMENT_001', 'TRIP_001', 'VEHICLE_001', 'USER_007', 'USER_009'),
('TRIP_ASSIGNMENT_002', 'TRIP_002', 'VEHICLE_003', 'USER_008', 'USER_010'),
('TRIP_ASSIGNMENT_003', 'TRIP_003', 'VEHICLE_002', 'USER_007', 'USER_009');

-- 17. (MỚI) Bảng FLIGHT_BOOKING: Đặt dịch vụ vận chuyển hàng không mẫu
SET IDENTITY_INSERT FLIGHT_BOOKING ON;
INSERT INTO FLIGHT_BOOKING (FlightBookingID, TripID, BookingVersion, RouteVersionID, ProviderName, Airline, FlightNumber, DepartureAirportCheckpointId, ArrivalAirportCheckpointId, DepartureAt, ArrivalAt, DirectFlight, BookingReference, BookingConfirmed, HorseIds, Note, CreatedAt) VALUES
(300, 'TRIP_001', 1, 120, N'Nippon Cargo Airlines', N'NCA Airlines', 'KZ-102', 101, 201, N'2026-09-16 05:00:00', N'2026-09-16 12:00:00', 1, N'NCA-HAN-NRT-DEMO-2026', 1, '["HORSE_001","HORSE_002"]', N'Chặng HAN → NRT của TRIP_001; mọi thời điểm lưu UTC.', N'2026-09-05 08:00:00');
SET IDENTITY_INSERT FLIGHT_BOOKING OFF;
-- 18. Bảng ROUTE_SEGMENT: Phân đoạn lộ trình của các chuyến đi
INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, FacilityID, LocationName, SegmentType, TransportMode, CarrierName, Flight_Voyage_No, ExpectedETA, ActualTime, Status) VALUES
('ROUTE_SEGMENT_001', 'TRIP_001', 'FACILITY_001', N'Sóc Sơn → khu tiếp nhận Nội Bài', 'REST_STOP', 'ROAD', NULL, NULL, '2026-09-15 15:00:00', '2026-09-15 14:50:00', 'COMPLETED'),
('ROUTE_SEGMENT_002', 'TRIP_001', 'FACILITY_002', N'Nội Bài (HAN) → Narita (NRT)', N'QUARANTINE_STOP', N'AIR', N'NCA Airlines', N'KZ-102', N'2026-09-16 12:00:00', N'2026-09-16 12:00:00', 'COMPLETED'),
('ROUTE_SEGMENT_003', 'TRIP_001', NULL, N'Trạm thú y Narita → trung tâm tiếp nhận Narita', 'DESTINATION', 'ROAD', NULL, NULL, '2026-09-17 18:00:00', '2026-09-17 17:30:00', 'COMPLETED'),
('ROUTE_SEGMENT_004', 'TRIP_002', 'FACILITY_003', N'Củ Chi → trạm tiếp nhận Củ Chi', N'REST_STOP', 'ROAD', NULL, NULL, '2026-10-05 08:30:00', '2026-10-05 09:15:00', 'COMPLETED'),
('ROUTE_SEGMENT_005', 'TRIP_002', 'FACILITY_004', N'TP.HCM → trung tâm tiếp nhận Đà Nẵng', 'DESTINATION', 'ROAD', NULL, NULL, N'2026-10-06 16:00:00', N'2026-10-06 18:30:00', 'COMPLETED'),
('ROUTE_SEGMENT_006', 'TRIP_003', 'FACILITY_005', N'Hà Nội -> Trạm Nghỉ Đà Nẵng', 'REST_STOP', 'ROAD', NULL, NULL, '2026-10-09 10:00:00', '2026-10-09 10:30:00', 'COMPLETED'),
('ROUTE_SEGMENT_007', 'TRIP_003', NULL, N'Đà Nẵng -> Trại Phú Thọ TP.HCM', 'DESTINATION', 'ROAD', NULL, NULL, '2026-10-11 18:00:00', NULL, 'IN_PROGRESS');

-- 19. Bảng CUSTOMS_CLEARANCE: Thủ tục thông quan biên giới
INSERT INTO CUSTOMS_CLEARANCE (ClearanceID, TripID, SegmentID, BorderCrossingName, CustomsAgentName, DocumentType, DeclarationNumber, Status, ClearedAt) VALUES
('CUSTOMS_CLEARANCE_001', N'TRIP_001', N'ROUTE_SEGMENT_002', N'Cửa khẩu hàng không Nội Bài', N'Đại lý hải quan mẫu', N'EXPORT', N'DEMO-CUSTOMS-1', 'CLEARED', N'2026-09-16 04:00:00'),
('CUSTOMS_CLEARANCE_002', N'TRIP_001', N'ROUTE_SEGMENT_002', N'Cửa khẩu hàng không Narita', N'Đại lý hải quan mẫu', N'IMPORT', N'DEMO-CUSTOMS-2', 'CLEARED', N'2026-09-16 13:00:00');

-- 20. Bảng HEALTH_LOG: Nhật ký sinh hiệu sức khỏe cá thể ngựa (Insert-Only)
INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, MediaUrl) VALUES
('HEALTH_LOG_001', 'TRIP_001', 'HORSE_001', 'USER_009', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.1, 42, N'Ổn định', N'Ngựa uống 15L nước, ăn cỏ khô tốt.', 'https://storage.cbntransport.com/logs/log1.jpg'),
('HEALTH_LOG_002', 'TRIP_001', 'HORSE_002', 'USER_009', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.2, 44, N'Ổn định', N'Thể trạng bình thường, mắt lanh lợi.', 'https://storage.cbntransport.com/logs/log2.jpg'),
('HEALTH_LOG_003', 'TRIP_002', 'HORSE_003', 'USER_010', 'TRANSIT_CHECK', '2026-10-05 14:00:00', 39.2, 58, N'Căng thẳng/Sốt', N'Ngựa đổ mồ hôi nhiều lúc qua phà, đã truyền điện giải.', 'https://storage.cbntransport.com/logs/log3.jpg'),
('HEALTH_LOG_004', 'TRIP_003', 'HORSE_001', 'USER_009', 'TRANSIT_CHECK', '2026-10-09 11:00:00', 38.0, 40, N'Rất tốt', N'Dừng nghỉ tại Đà Nẵng, vận động nhẹ 30 phút.', 'https://storage.cbntransport.com/logs/log4.jpg');

-- 21. Bảng INCIDENT: Sự cố phát sinh khẩn cấp trên đường
INSERT INTO INCIDENT (IncidentID, TripID, ApprovedBy, IncidentType, LocationCoordinates, Description, ImageUrl, AdditionalCost, Status) VALUES
('INCIDENT_001', 'TRIP_001', 'USER_004', 'TIRE_PUNCTURE', N'21.2187,105.8042', N'Thủng lốp trên chặng đường bộ Sóc Sơn đến Nội Bài; thay lốp trước chuyến bay.', 'https://storage.cbntransport.com/incidents/tire1.jpg', 2000000.00, 'RESOLVED'),
('INCIDENT_002', 'TRIP_002', 'USER_004', 'EQUINE_STRESS', '11.2312,105.8821', N'Ngựa HORSE_003 bị sốt nhẹ do nắng nóng, phải dừng xe hạ nhiệt mất 1h30m.', 'https://storage.cbntransport.com/incidents/vet2.jpg', 3750000.00, 'RESOLVED');

-- 22. Bảng HANDOVER: Biên bản tiếp nhận (Pickup) và giao ngựa (Delivery)
INSERT INTO HANDOVER (HandoverID, TripID, HandedByUserID, Type, LocationName, ReceiverName, ReceiverPhone, IsAuthorized, Status) VALUES
('HANDOVER_001', 'TRIP_001', 'USER_007', 'PICKUP', N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED'),
('HANDOVER_002', 'TRIP_001', 'USER_007', 'DELIVERY', N'Trung tâm tiếp nhận ngựa Narita', N'Kenji Sato', N'+819012345678', 1, 'CONFIRMED'),
('HANDOVER_003', 'TRIP_002', 'USER_008', 'PICKUP', N'Trại ngựa Củ Chi, TP.HCM', N'Trần Văn B', '0908889999', 1, 'CONFIRMED'),
('HANDOVER_004', 'TRIP_002', 'USER_008', 'DELIVERY', N'Trung tâm tiếp nhận ngựa Đà Nẵng', N'Nguyễn Minh', N'0902223344', 1, 'CONFIRMED'),
('HANDOVER_005', 'TRIP_003', 'USER_007', 'PICKUP', N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED');

-- 23. Bảng HANDOVER_ITEM: Đối soát mã chip và thể trạng lúc giao nhận
INSERT INTO HANDOVER_ITEM (HandoverItemID, HandoverID, HorseID, MicrochipVerified, ConditionStatus, AssetCheck, PhotoUrl) VALUES
('HANDOVER_ITEM_001', 'HANDOVER_001', 'HORSE_001', 1, N'Khỏe mạnh', N'01 bộ yên cương, 02 chăn đắp ngựa', 'https://storage.cbntransport.com/ho/pu_hrs1.jpg'),
('HANDOVER_ITEM_002', 'HANDOVER_001', 'HORSE_002', 1, N'Khỏe mạnh', N'01 hộp thuốc dinh dưỡng', 'https://storage.cbntransport.com/ho/pu_hrs2.jpg'),
('HANDOVER_ITEM_003', 'HANDOVER_002', 'HORSE_001', 1, N'Thể trạng tốt', N'Bàn giao đầy đủ yên cương và chăn', 'https://storage.cbntransport.com/ho/dl_hrs1.jpg'),
('HANDOVER_ITEM_004', 'HANDOVER_002', 'HORSE_002', 1, N'Thể trạng tốt', N'Bàn giao nguyên trạng', 'https://storage.cbntransport.com/ho/dl_hrs2.jpg'),
('HANDOVER_ITEM_005', 'HANDOVER_004', 'HORSE_003', 1, N'Mệt mỏi nhẹ', N'Đã bàn giao thuốc bổ sung', 'https://storage.cbntransport.com/ho/dl_hrs3.jpg');

-- =============================================================================
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH VND (CONTRACT & BILLING)
-- =============================================================================

-- 24. Bảng CONTRACT: 3 hợp đồng vận chuyển
INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail) VALUES
('CONTRACT_001', 'TRIP_001', 'REQUEST_001', 'USER_001', 'VND', 212500000.00, 40.00, N'2026-09-04 16:00:00', 'SETTLED', N'2026-09-04 08:00:00', N'USER_004', N'private/demo/contract_1_v1.pdf', 85000000, N'2026-09-05 08:00:00', N'vana.horse@gmail.com'),
('CONTRACT_002', 'TRIP_002', 'REQUEST_002', 'USER_002', 'VND', 105000000.00, 40.00, N'2026-09-30 10:00:00', N'EFFECTIVE', N'2026-09-30 08:00:00', N'USER_004', N'private/demo/contract_2_v1.pdf', 42000000, N'2026-10-01 08:00:00', N'tranb.racing@gmail.com'),
('CONTRACT_003', 'TRIP_003', 'REQUEST_003', 'USER_001', 'VND', 145000000.00, 40.00, N'2026-10-04 15:00:00', 'EFFECTIVE', N'2026-10-04 06:00:00', N'USER_004', N'private/demo/contract_3_v1.pdf', 58000000, N'2026-10-05 06:00:00', N'vana.horse@gmail.com');

-- Seed one preserved version for each sample contract before its invoices.
-- Version snapshots use the illustrative VND values seeded above.
INSERT INTO CONTRACT_VERSION
    (ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl,
     CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, SignedAtUtc, SignerEmail)
SELECT c.ContractID, 1,
       CASE WHEN c.SignedAt IS NOT NULL THEN 'SIGNED'
            WHEN c.PublishedAtUtc IS NOT NULL THEN 'ISSUED' ELSE 'DRAFT' END,
       (SELECT c.ContractID, c.RequestID, c.TripID, c.CustomerID,
               c.CurrencyCode, c.TotalQuotedPrice, c.DepositRateStandard, c.DepositAmount,
               c.CommercialNotes, c.CompletionDeadline,
               u.FullName AS CustomerName, u.Email AS CustomerEmail,
               r.Departure, r.Destination, r.ExpectedDate, r.CommittedDeadline,
               r.PickupContactName, r.PickupContactPhone,
               r.DesignatedReceiverName, r.DesignatedReceiverPhone,
               JSON_QUERY((SELECT t.TemplateID, t.TemplateName, t.LanguageCode, t.BodyContent
                           FROM CONTRACT_TEMPLATE t
                           WHERE t.IsActive = 1 AND t.LanguageCode = 'VI'
                           ORDER BY t.TemplateID
                           FOR JSON PATH, INCLUDE_NULL_VALUES)) AS Clauses,
               JSON_QUERY((SELECT h.HorseID, h.Name, h.Microchip_ISO, h.FEI_Passport_No,
                                  rh.CareInstructions
                           FROM REQUEST_HORSE_MAPPING rh
                           JOIN HORSE h ON h.HorseID = rh.HorseID
                           WHERE rh.RequestID = c.RequestID
                           FOR JSON PATH, INCLUDE_NULL_VALUES)) AS Horses
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER),
       c.PdfUrl, c.PublishedBy,
       COALESCE(c.PublishedAtUtc, CONVERT(DATETIME2(7), c.SignedAt), SYSUTCDATETIME()),
       c.PublishedBy, c.PublishedAtUtc, CONVERT(DATETIME2(7), c.SignedAt),
       COALESCE(c.SignerEmail, CASE WHEN c.SignedAt IS NOT NULL THEN u.Email END)
FROM CONTRACT c
JOIN [USER] u ON u.UserID = c.CustomerID
JOIN TRANSPORT_REQUEST r ON r.RequestID = c.RequestID;

UPDATE CONTRACT SET CurrentVersionNo = 1;

-- 25. Bảng COST_ITEM: Các mục chi phí dự toán và phát sinh
INSERT INTO COST_ITEM (CostItemID, ContractID, CategoryName, SubcodeName, Bearer, CurrencyCode, TotalMoney, EvidenceUrl) VALUES
('COST_ITEM_001', 'CONTRACT_001', N'Nhiên liệu', N'Xăng dầu xe chuyên dụng', 'COMPANY', 'VND', 37500000.00, 'https://storage.cbntransport.com/bills/fuel1.pdf'),
('COST_ITEM_002', 'CONTRACT_001', N'Phí dịch vụ trạm', N'Lưu chuồng kiểm dịch Narita', 'CUSTOMER', 'VND', 5000000.00, N'https://example.invalid/bills/narita.pdf'),
('COST_ITEM_003', 'CONTRACT_001', N'Sự cố phát sinh', N'Sửa vá lốp khẩn cấp', 'COMPANY', 'VND', 2000000.00, 'https://storage.cbntransport.com/bills/tire1.jpg'),
('COST_ITEM_004', 'CONTRACT_002', N'Chi phí thú y', N'Khám cấp cứu sốt ngựa', 'COMPANY', 'VND', 3750000.00, N'https://example.invalid/bills/danang.pdf');

-- 26. Bảng INVOICE: Các đợt hóa đơn (Đã trả xong, Đang nợ, Quá hạn)
INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus) VALUES
('INVOICE_001', 'CONTRACT_001', 1, 'DEPOSIT', 'VND', 85000000.00, 85000000.00, N'2026-09-05 08:00:00', 'PAID'),
('INVOICE_002', 'CONTRACT_001', 1, 'FINAL_SETTLEMENT', 'VND', 127500000.00, 127500000.00, '2026-09-20 23:59:59', 'PAID'),
('INVOICE_003', 'CONTRACT_002', 1, 'DEPOSIT', 'VND', 42000000.00, 42000000.00, N'2026-10-01 08:00:00', 'PAID'),
('INVOICE_004', 'CONTRACT_002', 1, 'FINAL_SETTLEMENT', 'VND', 63000000.00, 0.00, '2026-10-10 23:59:59', 'UNPAID'),
('INVOICE_005', 'CONTRACT_003', 1, 'DEPOSIT', 'VND', 58000000.00, 58000000.00, N'2026-10-05 06:00:00', 'PAID');

-- 27. Bảng PAYMENT: Giao dịch đối soát thực tế qua Cổng thanh toán hoặc Chuyển khoản
INSERT INTO PAYMENT (PaymentID, InvoiceID, ConfirmedByUserID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate, VnpayTmnCode, VnpayResponseCode, VnpayTransactionStatus, VnpayCreatedAtUtc, VnpayExpiresAtUtc, VnpayReceivedAmount) VALUES
('PAYMENT_001', 'INVOICE_001', NULL, 'VND', 85000000.00, N'VNPAY', N'DEMO_VNPAY_001', 'SUCCESS', '2026-09-04 15:30:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-09-04 15:30:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-09-04 15:30:00' AS DATETIME2)), 85000000.00),
('PAYMENT_002', 'INVOICE_002', NULL, 'VND', 127500000.00, N'VNPAY', N'DEMO_VNPAY_002', 'SUCCESS', '2026-09-18 10:15:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-09-18 10:15:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-09-18 10:15:00' AS DATETIME2)), 127500000.00),
('PAYMENT_003', 'INVOICE_003', NULL, 'VND', 42000000.00, N'VNPAY', N'DEMO_VNPAY_003', 'SUCCESS', '2026-09-30 09:20:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-09-30 09:20:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-09-30 09:20:00' AS DATETIME2)), 42000000.00),
('PAYMENT_004', 'INVOICE_005', NULL, 'VND', 58000000.00, N'VNPAY', N'DEMO_VNPAY_004', 'SUCCESS', '2026-10-04 14:45:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-10-04 14:45:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-10-04 14:45:00' AS DATETIME2)), 58000000.00);

GO

-- Flow 1: 10 don gia VND; ty le bao hiem 0.5% la gia dinh cua du an.
INSERT INTO COST_RATE (CostRateID, Code, CostGroup, CalculationUnit, Rate, CurrencyCode, IsActive) VALUES
('COST_RATE_001', 'ROAD_KM', 'TRANSPORT', 'KM_VEHICLE', 200000, 'VND', 1),
('COST_RATE_002', 'AIR_HORSE', 'TRANSPORT', 'HORSE', 3000000, 'VND', 1),
('COST_RATE_003', 'STABLE_NIGHT', 'TRANSPORT', 'HORSE_NIGHT', 250000, 'VND', 1),
('COST_RATE_004', 'CREW_DAY', 'CREW', 'PERSON_DAY', 300000, 'VND', 1),
('COST_RATE_005', 'PERMIT_TRIP', 'PERMIT', 'TRIP', 1000000, 'VND', 1),
('COST_RATE_006', 'PERMIT_HORSE', 'PERMIT', 'HORSE', 5000000, 'VND', 1),
('COST_RATE_007', 'VET_DAY', 'VET', 'PERSON_DAY', 500000, 'VND', 1),
('COST_RATE_008', 'CARE_DAY', 'VET', 'HORSE_DAY', 300000, 'VND', 1),
('COST_RATE_009', 'INSURANCE_MIN', 'INSURANCE', 'TRIP', 2000000, 'VND', 1),
('COST_RATE_010', 'INSURANCE_RATE', 'INSURANCE', 'VALUE_RATIO', 0.005, 'VND', 1);



INSERT INTO BUSINESS_POLICY (PolicyID,Code,ValueType,NumberValue,Unit,ScopeType,Description,UpdatedBy) VALUES
('BUSINESS_POLICY_009','HANDOVER_OTP_TTL_MINUTES','NUMBER',5,'MINUTE','GLOBAL',N'Hiệu lực OTP xác nhận biên bản bàn giao.','USER_004'),
('BUSINESS_POLICY_010','HANDOVER_OTP_RESEND_SECONDS','NUMBER',60,'SECOND','GLOBAL',N'Khoảng chờ gửi lại OTP bàn giao.','USER_004'),
('BUSINESS_POLICY_011','HANDOVER_OTP_MAX_ATTEMPTS','NUMBER',5,'ATTEMPT','GLOBAL',N'Số lần nhập sai tối đa OTP bàn giao.','USER_004');
GO

-- FLOW 6 DEMO FIXTURES BEGIN
-- Demo confirmation timestamps/email are fixtures only; no real OTP was sent or verified.
INSERT INTO HANDOVER_REVISION(HandoverRevisionID,HandoverID,TripID,RevisionNo,ContentSnapshot,CreatedBy,CreatedAtUtc) VALUES
('HANDOVER_REVISION_001','HANDOVER_002','TRIP_001',1,N'{"demo":true,"receiver":"Kenji Sato","horses":["HORSE_001","HORSE_002"],"documents":["Original passports"]}','USER_007','2026-09-17T17:30:00'),
('HANDOVER_REVISION_002','HANDOVER_004','TRIP_002',1,N'{"demo":true,"receiver":"Nguyen Minh","horses":["HORSE_003"],"documents":["Original passport"]}','USER_008','2026-10-06T18:30:00');
UPDATE HANDOVER_ITEM SET DocumentsHandedOver=N'Original passport - demo',DocumentsReceivedAtUtc='2026-10-06T18:35:00' WHERE HandoverID='HANDOVER_004';
UPDATE HANDOVER_REVISION SET Status='CONFIRMED',OtpEmail='receiver1@example.invalid',OtpSentAtUtc='2026-09-17T17:36:00',OtpExpiresAtUtc='2026-09-17T17:41:00',ConfirmedAtUtc='2026-09-17T17:40:00' WHERE HandoverRevisionID='HANDOVER_REVISION_001';
UPDATE HANDOVER_REVISION SET Status='CONFIRMED',OtpEmail='receiver2@example.invalid',OtpSentAtUtc='2026-10-06T18:36:00',OtpExpiresAtUtc='2026-10-06T18:41:00',ConfirmedAtUtc='2026-10-06T18:40:00' WHERE HandoverRevisionID='HANDOVER_REVISION_002';
INSERT INTO TRIP_SETTLEMENT(SettlementID,ContractID,TripID,CustomerID,ContractVersionNo,HandoverRevisionID,FinalInvoiceID,Status,PreparedBy,CreatedAtUtc,SettledBy,SettledAtUtc,ClosedAtUtc,FeedbackStartedAtUtc,FeedbackEndsAtUtc) VALUES
('SETTLEMENT_001','CONTRACT_001','TRIP_001','USER_001',1,'HANDOVER_REVISION_001','INVOICE_002','CLOSED','USER_004','2026-09-17T17:30:00','USER_004','2026-09-18T10:15:00','2026-09-19T10:15:00','2026-09-18T10:15:00','2026-09-19T10:15:00'),
('SETTLEMENT_002','CONTRACT_002','TRIP_002','USER_002',1,'HANDOVER_REVISION_002','INVOICE_004','AWAITING_PAYMENT','USER_004','2026-10-06T18:30:00',NULL,NULL,NULL,NULL,NULL);
UPDATE CONTRACT SET ContractStatus='CLOSED' WHERE ContractID='CONTRACT_001';
UPDATE TRIP_SETTLEMENT SET FeedbackStartedAtUtc='2026-09-18T10:15:00',FeedbackEndsAtUtc='2026-09-19T10:15:00' WHERE SettlementID='SETTLEMENT_001';
INSERT INTO CUSTOMER_FEEDBACK(FeedbackID,SettlementID,Rating,Comment,CreatedAtUtc)
VALUES ('CUSTOMER_FEEDBACK_001','SETTLEMENT_001',5,N'Demo feedback only','2026-09-18T12:00:00');
INSERT INTO CUSTOMER_CASE(CaseID,SettlementID,CaseType,Status,Subject,Description,OpenedAtUtc)
VALUES ('CUSTOMER_CASE_001','SETTLEMENT_002','COMPLAINT','OPEN',N'Giao trễ - demo',N'Customer yêu cầu giải thích giao trễ, chưa xác nhận kết quả.','2026-10-06T20:00:00');
-- FLOW 6 DEMO FIXTURES END
GO

-- Monotonic ID allocators. Created AFTER all explicit sample IDs.
-- Never RESTART backwards, CYCLE, or reseed after deletion.
-- Gaps from rollback/cache/restart are normal; never fill them.
-- Backend omits the PK on INSERT and reads OUTPUT INSERTED.<ID>.
-- These defaults do not forbid privileged callers from explicitly inserting an old ID.
-- Imports must synchronize the allocators without reducing previously issued high-water marks.
GO
CREATE SEQUENCE dbo.[SEQ_USER_ID] AS BIGINT
    START WITH 11 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[USER] ADD CONSTRAINT [DF_USER_ID]
    DEFAULT ('USER_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_USER_ID], '000', 'en-US')) FOR [UserID];

CREATE SEQUENCE dbo.[SEQ_HORSE_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HORSE] ADD CONSTRAINT [DF_HORSE_ID]
    DEFAULT ('HORSE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HORSE_ID], '000', 'en-US')) FOR [HorseID];

CREATE SEQUENCE dbo.[SEQ_STAFF_DOCUMENT_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[STAFF_DOCUMENT] ADD CONSTRAINT [DF_STAFF_DOCUMENT_ID]
    DEFAULT ('STAFF_DOCUMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_STAFF_DOCUMENT_ID], '000', 'en-US')) FOR [DocumentID];

CREATE SEQUENCE dbo.[SEQ_NOTIFICATION_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[NOTIFICATION] ADD CONSTRAINT [DF_NOTIFICATION_ID]
    DEFAULT ('NOTIFICATION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_NOTIFICATION_ID], '000', 'en-US')) FOR [NotificationID];

CREATE SEQUENCE dbo.[SEQ_POLICY_AND_TERM_ID] AS BIGINT
    START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[POLICY_AND_TERM] ADD CONSTRAINT [DF_POLICY_AND_TERM_ID]
    DEFAULT ('POLICY_TERM_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_POLICY_AND_TERM_ID], '000', 'en-US')) FOR [PolicyID];

CREATE SEQUENCE dbo.[SEQ_PARTNER_FACILITY_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[PARTNER_FACILITY] ADD CONSTRAINT [DF_PARTNER_FACILITY_ID]
    DEFAULT ('FACILITY_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_PARTNER_FACILITY_ID], '000', 'en-US')) FOR [FacilityID];

CREATE SEQUENCE dbo.[SEQ_FACILITY_CONTRACT_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[FACILITY_CONTRACT] ADD CONSTRAINT [DF_FACILITY_CONTRACT_ID]
    DEFAULT ('FACILITY_CONTRACT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_FACILITY_CONTRACT_ID], '000', 'en-US')) FOR [FacilityContractID];

CREATE SEQUENCE dbo.[SEQ_FACILITY_CERTIFICATION_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[FACILITY_CERTIFICATION] ADD CONSTRAINT [DF_FACILITY_CERTIFICATION_ID]
    DEFAULT ('FACILITY_CERTIFICATION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_FACILITY_CERTIFICATION_ID], '000', 'en-US')) FOR [CertID];

CREATE SEQUENCE dbo.[SEQ_TRANSPORT_REQUEST_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[TRANSPORT_REQUEST] ADD CONSTRAINT [DF_TRANSPORT_REQUEST_ID]
    DEFAULT ('REQUEST_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRANSPORT_REQUEST_ID], '000', 'en-US')) FOR [RequestID];

CREATE SEQUENCE dbo.[SEQ_LEGAL_MEDICAL_RECORD_ID] AS BIGINT
    START WITH 7 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[LEGAL_MEDICAL_RECORD] ADD CONSTRAINT [DF_LEGAL_MEDICAL_RECORD_ID]
    DEFAULT ('LEGAL_MEDICAL_RECORD_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_LEGAL_MEDICAL_RECORD_ID], '000', 'en-US')) FOR [RecordID];

CREATE SEQUENCE dbo.[SEQ_QUARANTINE_BOOKING_ID] AS BIGINT
    START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[QUARANTINE_BOOKING] ADD CONSTRAINT [DF_QUARANTINE_BOOKING_ID]
    DEFAULT ('QUARANTINE_BOOKING_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_QUARANTINE_BOOKING_ID], '000', 'en-US')) FOR [BookingID];

CREATE SEQUENCE dbo.[SEQ_TRIP_PLAN_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[TRIP_PLAN] ADD CONSTRAINT [DF_TRIP_PLAN_ID]
    DEFAULT ('TRIP_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_PLAN_ID], '000', 'en-US')) FOR [TripID];

CREATE SEQUENCE dbo.[SEQ_VEHICLE_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[VEHICLE] ADD CONSTRAINT [DF_VEHICLE_ID]
    DEFAULT ('VEHICLE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_VEHICLE_ID], '000', 'en-US')) FOR [VehicleID];

CREATE SEQUENCE dbo.[SEQ_TRIP_VEHICLE_ASSIGNMENT_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[TRIP_VEHICLE_ASSIGNMENT] ADD CONSTRAINT [DF_TRIP_VEHICLE_ASSIGNMENT_ID]
    DEFAULT ('TRIP_ASSIGNMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_VEHICLE_ASSIGNMENT_ID], '000', 'en-US')) FOR [AssignmentID];

CREATE SEQUENCE dbo.[SEQ_ROUTE_SEGMENT_ID] AS BIGINT
    START WITH 8 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[ROUTE_SEGMENT] ADD CONSTRAINT [DF_ROUTE_SEGMENT_ID]
    DEFAULT ('ROUTE_SEGMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_ROUTE_SEGMENT_ID], '000', 'en-US')) FOR [SegmentID];

CREATE SEQUENCE dbo.[SEQ_CUSTOMS_CLEARANCE_ID] AS BIGINT
    START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CUSTOMS_CLEARANCE] ADD CONSTRAINT [DF_CUSTOMS_CLEARANCE_ID]
    DEFAULT ('CUSTOMS_CLEARANCE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMS_CLEARANCE_ID], '000', 'en-US')) FOR [ClearanceID];

CREATE SEQUENCE dbo.[SEQ_HEALTH_LOG_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HEALTH_LOG] ADD CONSTRAINT [DF_HEALTH_LOG_ID]
    DEFAULT ('HEALTH_LOG_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HEALTH_LOG_ID], '000', 'en-US')) FOR [LogID];

CREATE SEQUENCE dbo.[SEQ_INCIDENT_ID] AS BIGINT
    START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[INCIDENT] ADD CONSTRAINT [DF_INCIDENT_ID]
    DEFAULT ('INCIDENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_INCIDENT_ID], '000', 'en-US')) FOR [IncidentID];

CREATE SEQUENCE dbo.[SEQ_HANDOVER_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HANDOVER] ADD CONSTRAINT [DF_HANDOVER_ID]
    DEFAULT ('HANDOVER_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HANDOVER_ID], '000', 'en-US')) FOR [HandoverID];

CREATE SEQUENCE dbo.[SEQ_HANDOVER_ITEM_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HANDOVER_ITEM] ADD CONSTRAINT [DF_HANDOVER_ITEM_ID]
    DEFAULT ('HANDOVER_ITEM_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HANDOVER_ITEM_ID], '000', 'en-US')) FOR [HandoverItemID];

CREATE SEQUENCE dbo.[SEQ_CONTRACT_TEMPLATE_ID] AS BIGINT
    START WITH 13 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CONTRACT_TEMPLATE] ADD CONSTRAINT [DF_CONTRACT_TEMPLATE_ID]
    DEFAULT ('CONTRACT_TEMPLATE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CONTRACT_TEMPLATE_ID], '000', 'en-US')) FOR [TemplateID];

CREATE SEQUENCE dbo.[SEQ_CONTRACT_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CONTRACT] ADD CONSTRAINT [DF_CONTRACT_ID]
    DEFAULT ('CONTRACT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CONTRACT_ID], '000', 'en-US')) FOR [ContractID];

CREATE SEQUENCE dbo.[SEQ_COST_ITEM_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[COST_ITEM] ADD CONSTRAINT [DF_COST_ITEM_ID]
    DEFAULT ('COST_ITEM_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_COST_ITEM_ID], '000', 'en-US')) FOR [CostItemID];

CREATE SEQUENCE dbo.[SEQ_INVOICE_ID] AS BIGINT
    START WITH 6 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[INVOICE] ADD CONSTRAINT [DF_INVOICE_ID]
    DEFAULT ('INVOICE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_INVOICE_ID], '000', 'en-US')) FOR [InvoiceID];

CREATE SEQUENCE dbo.[SEQ_PAYMENT_ID] AS BIGINT
    START WITH 5 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[PAYMENT] ADD CONSTRAINT [DF_PAYMENT_ID]
    DEFAULT ('PAYMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_PAYMENT_ID], '000', 'en-US')) FOR [PaymentID];

CREATE SEQUENCE dbo.[SEQ_COST_RATE_ID] AS BIGINT
    START WITH 11 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[COST_RATE] ADD CONSTRAINT [DF_COST_RATE_ID]
    DEFAULT ('COST_RATE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_COST_RATE_ID], '000', 'en-US')) FOR [CostRateID];

CREATE SEQUENCE dbo.[SEQ_SUPPORTED_ROUTE_ID] AS BIGINT
    START WITH 4 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[SUPPORTED_ROUTE] ADD CONSTRAINT [DF_SUPPORTED_ROUTE_ID]
    DEFAULT ('ROUTE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_SUPPORTED_ROUTE_ID], '000', 'en-US')) FOR [RouteID];

CREATE SEQUENCE dbo.[SEQ_BUSINESS_POLICY_ID] AS BIGINT
    START WITH 12 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[BUSINESS_POLICY] ADD CONSTRAINT [DF_BUSINESS_POLICY_ID]
    DEFAULT ('BUSINESS_POLICY_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_BUSINESS_POLICY_ID], '000', 'en-US')) FOR [PolicyID];

GO

-- Flow 6 monotonic ID allocators (after fixtures).
CREATE SEQUENCE dbo.[SEQ_HANDOVER_REVISION_ID] AS BIGINT START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HANDOVER_REVISION] ADD CONSTRAINT [DF_HANDOVER_REVISION_ID] DEFAULT ('HANDOVER_REVISION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HANDOVER_REVISION_ID], '000', 'en-US')) FOR [HandoverRevisionID];
GO
CREATE SEQUENCE dbo.[SEQ_TRIP_SETTLEMENT_ID] AS BIGINT START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[TRIP_SETTLEMENT] ADD CONSTRAINT [DF_TRIP_SETTLEMENT_ID] DEFAULT ('SETTLEMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_SETTLEMENT_ID], '000', 'en-US')) FOR [SettlementID];
GO
CREATE SEQUENCE dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[SETTLEMENT_ADJUSTMENT] ADD CONSTRAINT [DF_SETTLEMENT_ADJUSTMENT_ID] DEFAULT ('SETTLEMENT_ADJUSTMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID], '000', 'en-US')) FOR [AdjustmentID];
GO
CREATE SEQUENCE dbo.[SEQ_CUSTOMER_CASE_ID] AS BIGINT START WITH 2 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CUSTOMER_CASE] ADD CONSTRAINT [DF_CUSTOMER_CASE_ID] DEFAULT ('CUSTOMER_CASE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_CASE_ID], '000', 'en-US')) FOR [CaseID];
GO
CREATE SEQUENCE dbo.[SEQ_CUSTOMER_FEEDBACK_ID] AS BIGINT START WITH 2 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CUSTOMER_FEEDBACK] ADD CONSTRAINT [DF_CUSTOMER_FEEDBACK_ID] DEFAULT ('CUSTOMER_FEEDBACK_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_FEEDBACK_ID], '000', 'en-US')) FOR [FeedbackID];
GO
