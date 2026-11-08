-- =============================================================================
-- HorseTransportDB.sql: FILE DATABASE DUY NHẤT (schema + dữ liệu mẫu, Flow 1 đến Flow 6)
-- Gộp từ: HorseTransportDB_Reviewed.sql (schema Flow 1-3, 5, 6 và dữ liệu mẫu)
--       + modules/05_Flow4_InTransit_Incidents.sql (schema Flow 4)
-- Script xóa và tạo lại database HorseTransportDB; không dùng làm migration trên DB đang chạy.
-- Chạy từ thư mục gốc repository (bắt buộc có -f 65001 để giữ đúng tiếng Việt):
--   sqlcmd -S ".\SQLEXPRESS" -E -C -b -f 65001 -i HorseTransportDB/HorseTransportDB.sql
-- Các file HorseTransportDB_Reviewed.sql, modules/, 00_Init_Database.sql không còn cần để khởi tạo DB.
-- Canonical test schema: reset/recreate using this file; no numbered migrations are required.
-- Includes RemoveRequestSharedDocuments: retired request attachment columns are omitted;
-- customs fixtures use EXPORT/IMPORT only, so no legacy-data cleanup is needed.
-- Flow 1 scope 2026-10-24: VNPAY only; progress via current Status, no history/audit tables.
-- Reviewed sample only: do not run against an active database as a migration.
-- Reviewed copy: source data/HorseTransportDB.sql is preserved.
-- Creates ONLY HorseTransportDB. All timestamps in demo fixtures are UTC.
-- Private/demo paths and example URLs are placeholders, not bundled file contents.
-- SAMPLE DATABASE ONLY: this file DROPS and recreates HorseTransportDB.
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
    Purposes NVARCHAR(100) NULL, -- Flow 3 v2: REST, FUEL, QUARANTINE, BORDER, AIRPORT
    CountryCode VARCHAR(3) NOT NULL DEFAULT 'VN',
    State_Province NVARCHAR(100) NULL,
    City NVARCHAR(100) NULL,
    Address NVARCHAR(500) NULL,
    Coordinates VARCHAR(100) NULL,
    Latitude DECIMAL(9,6) NULL,
    Longitude DECIMAL(9,6) NULL,
    TimeZone VARCHAR(50) NULL, -- Múi giờ để tính ETA
    OperatingHours VARCHAR(50) NULL DEFAULT '24/7', -- '24/7' hoặc '06:00-22:00'
    SupportsOvernight BIT NOT NULL DEFAULT 0,
    HasTruckParking BIT NOT NULL DEFAULT 1,
    HasLoadingArea BIT NOT NULL DEFAULT 1,
    HasStabling BIT NOT NULL DEFAULT 1,
    HasWaterFeed BIT NOT NULL DEFAULT 1,
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
    DeclaredValueVnd DECIMAL(18,2) NULL,
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

-- Flow 1: xét duyệt theo yêu cầu trước hợp đồng.
CREATE TABLE REQUEST_REVIEW (
    ReviewID VARCHAR(50) NOT NULL PRIMARY KEY,
    RequestID VARCHAR(50) NOT NULL REFERENCES TRANSPORT_REQUEST(RequestID),
    RequestRevision INT NOT NULL CHECK (RequestRevision > 0),
    CoordinatorID VARCHAR(50) NOT NULL REFERENCES [USER](UserID),
    SpecialistID VARCHAR(50) NOT NULL REFERENCES [USER](UserID),
    Status VARCHAR(40) NOT NULL CHECK (Status IN (
        'COORDINATOR_PENDING','SPECIALIST_PENDING','MANAGER_PENDING','CUSTOMER_SCHEDULE_PENDING',
        'CUSTOMER_CHANGES_PENDING','CUSTOMER_ACCEPTED','CUSTOMER_REJECTED','APPROVED','CLOSED')),
    SelectedOptionID VARCHAR(50) NULL,
    CustomerDeadlineUtc DATETIME2(7) NULL,
    CONSTRAINT UQ_RequestReview_Revision UNIQUE (RequestID, RequestRevision)
);
CREATE INDEX IX_RequestReview_Coordinator ON REQUEST_REVIEW(CoordinatorID, Status);
CREATE INDEX IX_RequestReview_Specialist ON REQUEST_REVIEW(SpecialistID, Status);
CREATE INDEX IX_RequestReview_Deadline ON REQUEST_REVIEW(CustomerDeadlineUtc) WHERE CustomerDeadlineUtc IS NOT NULL;

CREATE TABLE REQUEST_SCHEDULE_OPTION (
    OptionID VARCHAR(50) NOT NULL PRIMARY KEY,
    ReviewID VARCHAR(50) NOT NULL REFERENCES REQUEST_REVIEW(ReviewID),
    IsOriginal BIT NOT NULL,
    Mode VARCHAR(10) NOT NULL CHECK (Mode IN ('ROAD','AIR')),
    PickupDate DATE NOT NULL,
    DeliveryDate DATE NOT NULL,
    CoordinatorResult VARCHAR(30) NOT NULL CHECK (CoordinatorResult IN ('FEASIBLE','NOT_FEASIBLE')),
    CoordinatorReason NVARCHAR(2000) NOT NULL,
    ChecklistVersion VARCHAR(64) NULL,
    SpecialistResult VARCHAR(30) NULL CHECK (SpecialistResult IN ('FEASIBLE','NOT_FEASIBLE','NEEDS_SUPPLEMENT')),
    SpecialistNote NVARCHAR(2000) NULL,
    ChecklistAssessmentJson NVARCHAR(MAX) NULL CHECK (ChecklistAssessmentJson IS NULL OR ISJSON(ChecklistAssessmentJson)=1),
    CONSTRAINT UQ_RequestScheduleOption_Kind UNIQUE (ReviewID, IsOriginal),
    CONSTRAINT UQ_RequestScheduleOption_Scope UNIQUE (ReviewID, OptionID),
    CONSTRAINT CK_RequestScheduleOption_Dates CHECK (DeliveryDate >= PickupDate)
);
ALTER TABLE REQUEST_REVIEW ADD CONSTRAINT FK_RequestReview_Option
    FOREIGN KEY (ReviewID, SelectedOptionID) REFERENCES REQUEST_SCHEDULE_OPTION(ReviewID, OptionID);
CREATE SEQUENCE dbo.SEQ_REQUEST_REVIEW_ID AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
ALTER TABLE REQUEST_REVIEW ADD CONSTRAINT DF_REQUEST_REVIEW_ID
    DEFAULT ('REQUEST_REVIEW_' + FORMAT(NEXT VALUE FOR dbo.SEQ_REQUEST_REVIEW_ID, '000', 'en-US')) FOR ReviewID;
CREATE SEQUENCE dbo.SEQ_REQUEST_SCHEDULE_OPTION_ID AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
ALTER TABLE REQUEST_SCHEDULE_OPTION ADD CONSTRAINT DF_REQUEST_SCHEDULE_OPTION_ID
    DEFAULT ('REQUEST_SCHEDULE_OPTION_' + FORMAT(NEXT VALUE FOR dbo.SEQ_REQUEST_SCHEDULE_OPTION_ID, '000', 'en-US')) FOR OptionID;

-- 10. Bảng REQUEST_HORSE_MAPPING: Khử quan hệ N-N giữa Request và Horse
CREATE TABLE REQUEST_HORSE_MAPPING (
    RequestHorseID VARCHAR(50) NOT NULL CONSTRAINT DF_REQUEST_HORSE_MAPPING_ID DEFAULT ('RHM_' + CONVERT(VARCHAR(36), NEWID())),
    CareInstructions NVARCHAR(2000) NULL,
    RequestID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_RequestHorseMapping PRIMARY KEY (RequestHorseID),
    CONSTRAINT FK_RHM_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_RHM_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);

-- 11. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ y tế của ngựa
CREATE TABLE LEGAL_MEDICAL_RECORD (
    RecordID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NULL,
    TripID VARCHAR(50) NULL,
    RequestID VARCHAR(50) NOT NULL,
    VerifiedBy VARCHAR(50) NULL,
    DocumentType VARCHAR(50) NULL,
    RequirementStatus VARCHAR(50) NULL,
    DocumentStatus VARCHAR(50) NULL,
    UploadedFileUrl VARCHAR(500) NULL,
    ExpiryDate DATE NULL,
    DocumentVersion INT NOT NULL DEFAULT 1,
    DocumentNumber VARCHAR(100) NULL,
    IssuingAuthority NVARCHAR(255) NULL,
    IssuedDate DATE NULL,
    PhysicalCopyCollected BIT NOT NULL DEFAULT 0,
    ReviewedBy VARCHAR(50) NULL,
    ReviewedAtUtc DATETIME2 NULL,
    RejectionReason NVARCHAR(1000) NULL,
    DocumentScope VARCHAR(50) NOT NULL DEFAULT 'PER_HORSE',
    CONSTRAINT PK_LegalMedicalRecord PRIMARY KEY (RecordID),
    CONSTRAINT FK_LMR_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_LMR_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_LMR_VerifiedBy FOREIGN KEY (VerifiedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_LMR_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES [USER](UserID)
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

    -- Quản lý Phiên bản & Khóa lạc quan (Flow 3 v2 Optimistic Concurrency & Binding)
    [Version] INT NOT NULL DEFAULT 1,
    PlanVersion INT NOT NULL DEFAULT 1,
    ContextVersion INT NOT NULL DEFAULT 1,
    ReadinessVersion INT NOT NULL DEFAULT 1,
    DraftPlanJson NVARCHAR(MAX) NULL,
    ApprovedPlanJson NVARCHAR(MAX) NULL,
    OpenChange BIT NOT NULL DEFAULT 0,
    EffectiveOriginPlaceId VARCHAR(50) NULL,

    -- Flow 1
    DeploymentStatus VARCHAR(12) NULL,
    DeploymentReason NVARCHAR(1000) NULL,
    DeploymentBy VARCHAR(50) NULL,
    DeploymentAtUtc DATETIME2(7) NULL,
    HandoffEventId VARCHAR(50) NULL,
    AssignedSpecialistId VARCHAR(50) NULL,
    AssignedCoordinatorId VARCHAR(50) NULL,

    -- Xác nhận Điều phối viên (Coordinator / Operations READY - Flow 3)
    OperationsStatus VARCHAR(20) NOT NULL DEFAULT 'NOT_READY', -- NOT_READY, READY
    ResourcesConfirmedAt DATETIME2 NULL,
    ResourcesConfirmedBy NVARCHAR(100) NULL,
    
    -- Xác nhận Chuyên viên pháp lý (Specialist / Documents READY - Flow 2)
    DocumentsStatus VARCHAR(20) NOT NULL DEFAULT 'NOT_READY', -- NOT_READY, READY
    EarliestDepartureDate DATETIME2 NULL,
    DocumentExpiryDate DATETIME2 NULL,
    SpecialistLegalNote NVARCHAR(500) NULL,
    DocumentsConfirmedAt DATETIME2 NULL,
    DocumentsConfirmedBy NVARCHAR(100) NULL,
    
    -- Thẩm định & Phê duyệt Lộ trình (Manager Route Review / Gate 1)
    CurrentRouteVersion INT NOT NULL DEFAULT 1,
    RouteStatus VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, RETURNED
    RouteApprovedAt DATETIME2 NULL,
    RouteApprovedBy VARCHAR(50) NULL,
    RouteReturnReason NVARCHAR(500) NULL,
    
    -- Phê duyệt Khởi hành (Manager Gate 2 -> READY_TO_DEPART)
    DepartureApprovedAt DATETIME2 NULL,
    DepartureApprovedBy NVARCHAR(100) NULL,
    RejectionReason NVARCHAR(500) NULL,
    DocsReadyAtUtc DATETIME2 NULL,
    DocsReadyBy VARCHAR(50) NULL,

    CONSTRAINT PK_TripPlan PRIMARY KEY (TripID),
    CONSTRAINT FK_TripPlan_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_TripPlan_OriginPlace FOREIGN KEY (EffectiveOriginPlaceId) REFERENCES PARTNER_FACILITY(FacilityID),
    CONSTRAINT CK_TRIP_PLAN_OperationsStatus CHECK (OperationsStatus IN ('NOT_READY', 'READY')),
    CONSTRAINT CK_TRIP_PLAN_DocumentsStatus CHECK (DocumentsStatus IN ('NOT_READY', 'READY')),
    CONSTRAINT CK_TRIP_PLAN_RouteStatus CHECK (RouteStatus IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED')),
    CONSTRAINT CK_F1S_TRIP_PLAN_Deployment CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus] IS NOT NULL AND [DeploymentStatus] IN ('PENDING','CONFIRMED','ON_HOLD') AND [DeploymentReason] IS NOT NULL AND [DeploymentBy] IS NOT NULL AND [DeploymentAtUtc] IS NOT NULL AND (([DeploymentStatus]='PENDING' AND [HandoffEventId] IS NULL) OR ([DeploymentStatus] IN ('CONFIRMED','ON_HOLD') AND [HandoffEventId] IS NOT NULL)))),
    CONSTRAINT FK_F1_Specialist FOREIGN KEY (AssignedSpecialistId) REFERENCES [USER](UserID),
    CONSTRAINT FK_F1_Coordinator FOREIGN KEY (AssignedCoordinatorId) REFERENCES [USER](UserID)
);

-- Liên kết hồ sơ pháp lý vào chuyến sau khi TRIP_PLAN đã tạo
ALTER TABLE LEGAL_MEDICAL_RECORD ADD CONSTRAINT FK_LMR_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID);

-- 13.1. Bảng TRIP_INSURANCE: Bảo hiểm vận chuyển chuyến đi (Flow 2 Specialist)
CREATE TABLE TRIP_INSURANCE (
    InsuranceID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    Insurer NVARCHAR(150) NOT NULL,
    PolicyNumber VARCHAR(100) NOT NULL,
    CoverageAmount DECIMAL(18, 0) NOT NULL DEFAULT 0,
    ValidFrom DATE NOT NULL,
    ValidTo DATE NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    CheckedBy VARCHAR(50) NULL,
    CheckedAtUtc DATETIME2 NULL,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_TripInsurance PRIMARY KEY (InsuranceID),
    CONSTRAINT FK_TripInsurance_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripInsurance_User FOREIGN KEY (CheckedBy) REFERENCES [USER](UserID)
);

-- 13.2. Bảng TRIP_REQUIREMENT_SET: Bộ quy định & checklist áp dụng cho chuyến (Flow 2 Specialist)
CREATE TABLE TRIP_REQUIREMENT_SET (
    SnapshotID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    PkgId VARCHAR(50) NOT NULL,
    PkgVersion INT NOT NULL DEFAULT 1,
    PkgName NVARCHAR(200) NOT NULL,
    AppliedBy VARCHAR(50) NOT NULL,
    AppliedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    SnapshotJson NVARCHAR(MAX) NULL,
    CONSTRAINT PK_TripRequirementSet PRIMARY KEY (SnapshotID),
    CONSTRAINT FK_TripRequirementSet_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripRequirementSet_User FOREIGN KEY (AppliedBy) REFERENCES [USER](UserID)
);

-- 13.3. Bảng TRIP_CHECKPOINT_CLEARANCE: Thông quan chốt kiểm soát / cửa khẩu chuyến đi (Flow 2 Specialist)
CREATE TABLE TRIP_CHECKPOINT_CLEARANCE (
    ClearanceID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    CheckpointIndex INT NOT NULL,
    CheckpointName NVARCHAR(200) NOT NULL,
    Result VARCHAR(50) NOT NULL,
    RefNumber VARCHAR(100) NULL,
    ClearedBy VARCHAR(50) NOT NULL,
    ClearedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_TripCheckpointClearance PRIMARY KEY (ClearanceID),
    CONSTRAINT FK_TripCheckpointClearance_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripCheckpointClearance_User FOREIGN KEY (ClearedBy) REFERENCES [USER](UserID)
);

-- 13.4. Bảng DOCUMENT_REQUEST: Yêu cầu bổ sung giấy tờ từ chuyên viên tới khách hàng (Flow 2 Specialist)
CREATE TABLE DOCUMENT_REQUEST (
    RequestDocID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    KeyName VARCHAR(50) NOT NULL,
    Scope VARCHAR(50) NOT NULL,
    Reason NVARCHAR(1000) NOT NULL,
    DueAt DATE NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FulfilledAtUtc DATETIME2 NULL,
    CONSTRAINT PK_DocumentRequest PRIMARY KEY (RequestDocID),
    CONSTRAINT FK_DocumentRequest_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_DocumentRequest_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_DocumentRequest_User FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID)
);

-- 13.5. Bảng SPECIALIST_AUDIT_LOG: Nhật ký thao tác hồ sơ pháp lý chuyên viên (Flow 2 Specialist)
CREATE TABLE SPECIALIST_AUDIT_LOG (
    AuditID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NULL,
    ActorId VARCHAR(50) NOT NULL,
    Role VARCHAR(50) NOT NULL,
    Action NVARCHAR(200) NOT NULL,
    Entity NVARCHAR(100) NOT NULL,
    Detail NVARCHAR(MAX) NULL,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_SpecialistAuditLog PRIMARY KEY (AuditID),
    CONSTRAINT FK_SpecialistAuditLog_User FOREIGN KEY (ActorId) REFERENCES [USER](UserID)
);

-- 14. Bảng VEHICLE: Quản lý xe chuyên dụng
CREATE TABLE VEHICLE (
    VehicleID VARCHAR(50) NOT NULL,
    Type VARCHAR(50) NULL,
    CapacityStalls INT NULL,
    MaxRange_km DECIMAL(10, 2) NULL,
    FuelCost_Per_Km DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NULL,
    OperatingCountry VARCHAR(10) NULL DEFAULT 'VN', -- 'VN', 'JP', 'SG'
    PlateNumber NVARCHAR(50) NULL, -- Biển số xe thực tế
    -- Thông số kỹ thuật phục vụ kiểm soát cầu hầm & tải trọng (Flow 3 v2 Truck-Check)
    Height_m DECIMAL(4, 2) NULL,
    Width_m DECIMAL(4, 2) NULL,
    Length_m DECIMAL(4, 2) NULL,
    Gross_Weight_Tons DECIMAL(5, 2) NULL,
    Axle_Weight_Tons DECIMAL(5, 2) NULL,
    CONSTRAINT PK_Vehicle PRIMARY KEY (VehicleID)
);

-- 15. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái theo từng chặng độc lập
CREATE TABLE TRIP_VEHICLE_ASSIGNMENT (
    AssignmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    LegNumber INT NOT NULL DEFAULT 1, -- 1: Chặng đi VN, 2: Chặng đến (hoặc 3 nếu có)
    LegType VARCHAR(50) NULL, -- 'OUTBOUND' (Chặng 1), 'INBOUND' (Chặng 2)
    VehicleID VARCHAR(50) NOT NULL,
    DriverID VARCHAR(50) NOT NULL, -- Tài xế chính
    CoDriverID VARCHAR(50) NULL, -- Phụ xe / Tài xế phụ
    VeterinarianID VARCHAR(50) NULL, -- Bác sĩ thú y áp tải
    EscortID VARCHAR(50) NULL, -- Người áp tải kiêm nhiệm (nullable)
    CONSTRAINT PK_TripVehicleAssignment PRIMARY KEY (AssignmentID),
    CONSTRAINT FK_TVA_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TVA_Vehicle FOREIGN KEY (VehicleID) REFERENCES VEHICLE(VehicleID),
    CONSTRAINT FK_TVA_Driver FOREIGN KEY (DriverID) REFERENCES [USER](UserID),
    CONSTRAINT FK_TVA_CoDriver FOREIGN KEY (CoDriverID) REFERENCES [USER](UserID),
    CONSTRAINT FK_TVA_Vet FOREIGN KEY (VeterinarianID) REFERENCES [USER](UserID),
    CONSTRAINT FK_TVA_Escort FOREIGN KEY (EscortID) REFERENCES [USER](UserID)
);

-- 16. Bảng ROUTE_SEGMENT: Chặng đường, điểm dừng nghỉ & Vận tải đa phương thức
CREATE TABLE ROUTE_SEGMENT (
    SegmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    SequenceOrder INT NULL DEFAULT 1, -- Thứ tự điểm dừng trên lộ trình
    FacilityID VARCHAR(50) NULL, -- Trạm dừng liên kết
    LocationName NVARCHAR(255) NOT NULL,
    SegmentType VARCHAR(50) NULL,
    TransportMode VARCHAR(50) NOT NULL DEFAULT 'ROAD', -- ROAD, AIR, SEA
    CarrierName NVARCHAR(100) NULL, -- Hãng bay/tàu
    Flight_Voyage_No VARCHAR(50) NULL, -- Số chuyến bay/tàu
    PlannedTime DATETIME NULL, -- Thời gian dự kiến đến trạm
    ExpectedETA DATETIME NULL,
    ActualTime DATETIME NULL,
    -- Tọa độ kinh độ / vĩ độ của điểm dừng tự do (ngoài trạm liên kết Facility)
    Latitude DECIMAL(9,6) NULL,
    Longitude DECIMAL(9,6) NULL,
    Coordinates VARCHAR(100) NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_RouteSegment PRIMARY KEY (SegmentID),
    CONSTRAINT FK_RouteSegment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_RouteSegment_Facility FOREIGN KEY (FacilityID) REFERENCES PARTNER_FACILITY(FacilityID),
    CONSTRAINT CK_RouteSegment_Coordinates CHECK ([Latitude] IS NULL AND [Longitude] IS NULL OR [Latitude] IS NOT NULL AND [Longitude] IS NOT NULL AND ([Latitude]>=(-90) AND [Latitude]<=(90)) AND ([Longitude]>=(-180) AND [Longitude]<=(180)))
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

-- =============================================================================
-- CÁC BẢNG BỔ SUNG CHO FLOW 3 PHIÊN BẢN 2.0.0 (API CONTRACT 27/10/2026)
-- =============================================================================

-- 18a. Bảng AIR_PARTNER: Quản lý danh mục đối tác dịch vụ vận tải hàng không (F3-J34..J38)
CREATE TABLE AIR_PARTNER (
    PartnerID VARCHAR(50) NOT NULL,
    PartnerName NVARCHAR(200) NOT NULL,
    CountryCode VARCHAR(3) NOT NULL DEFAULT 'VN',
    ContactEmail VARCHAR(100) NULL,
    ContactPhone VARCHAR(20) NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_AirPartner PRIMARY KEY (PartnerID),
    CONSTRAINT CK_AirPartner_Status CHECK (Status IN ('ACTIVE', 'INACTIVE'))
);

-- 18b. Bảng FLIGHT_CATALOG: Danh mục lịch chuyến bay đối tác cung cấp (F3-J05, J50, J54)
CREATE TABLE FLIGHT_CATALOG (
    ServiceID VARCHAR(50) NOT NULL,
    PartnerID VARCHAR(50) NOT NULL,
    ProviderFlightCode VARCHAR(50) NOT NULL,
    Airline NVARCHAR(100) NOT NULL,
    OriginAirportPlaceId VARCHAR(50) NOT NULL,
    DestAirportPlaceId VARCHAR(50) NOT NULL,
    DepartureTime VARCHAR(5) NOT NULL, -- HH:mm (vd: 05:00)
    ArrivalTime VARCHAR(5) NOT NULL,   -- HH:mm (vd: 11:00)
    DepartureDate DATE NULL,
    ArrivalDate DATE NULL,
    DepartureTimeZone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    ArrivalTimeZone VARCHAR(50) NOT NULL DEFAULT 'Asia/Tokyo',
    PriceVND DECIMAL(14, 2) NOT NULL,
    CapacityHorses INT NOT NULL DEFAULT 4,
    CareProvider VARCHAR(50) NOT NULL DEFAULT 'AIRLINE',
    DirectFlight BIT NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_FlightCatalog PRIMARY KEY (ServiceID),
    CONSTRAINT FK_FlightCatalog_Partner FOREIGN KEY (PartnerID) REFERENCES AIR_PARTNER(PartnerID)
);

-- 18c. Bảng PICKUP_RELOCATION: Quy trình đổi điểm nhận khi xe lớn không vào được (F3-J28..J33)
CREATE TABLE PICKUP_RELOCATION (
    RelocationID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    OriginalAddress NVARCHAR(500) NOT NULL,
    AccessEvaluation VARCHAR(20) NOT NULL DEFAULT 'INACCESSIBLE', -- INACCESSIBLE, ACCESSIBLE
    CandidatePlaceId VARCHAR(50) NOT NULL,
    Reason NVARCHAR(500) NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, MANAGER_APPROVED, CUSTOMER_CONFIRMED, REJECTED
    ProposedBy VARCHAR(50) NULL,
    ProposedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    ManagerDecision VARCHAR(20) NULL, -- APPROVED, REJECTED
    ManagerDecisionReason NVARCHAR(500) NULL,
    ManagerDecisionBy VARCHAR(50) NULL,
    ManagerDecisionAt DATETIME2 NULL,
    CustomerConsentMethod VARCHAR(20) NULL, -- PHONE, EMAIL, WRITTEN
    CustomerConsentNote NVARCHAR(500) NULL,
    CustomerConsentConfirmedBy VARCHAR(50) NULL,
    CustomerConsentConfirmedAt DATETIME2 NULL,
    -- Các trường bổ sung cho Flow 3 v3 (Customer Relocation Decision)
    ProposalVersion INT NOT NULL DEFAULT 1,
    SentAt DATETIME2 NULL,
    SentBy VARCHAR(50) NULL,
    CustomerReplyAt DATETIME2 NULL,
    CustomerReplyDecision VARCHAR(20) NULL,
    CustomerReplyNote NVARCHAR(500) NULL,
    ScheduleImpact NVARCHAR(500) NULL,
    CustomerResponsibilities NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT PK_PickupRelocation PRIMARY KEY (RelocationID),
    CONSTRAINT FK_PickupRelocation_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_PickupRelocation_Candidate FOREIGN KEY (CandidatePlaceId) REFERENCES PARTNER_FACILITY(FacilityID),
    CONSTRAINT CK_PickupRelocation_Status CHECK (Status IN ('PROPOSED', 'MANAGER_APPROVED', 'AWAITING_CUSTOMER', 'CUSTOMER_CONFIRMED', 'CUSTOMER_REJECTED', 'RETURNED', 'SUPERSEDED', 'REJECTED'))
);

-- 18d. Bảng IDEMPOTENCY_RECORD: Lưu cache khóa Idempotency-Key chống gửi trùng lặp (Conventions & Flow 3)
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

-- 18e. Bảng TRIP_PLANNING_HISTORY: Lịch sử các bước lập kế hoạch và phê duyệt (F3-J19)
CREATE TABLE TRIP_PLANNING_HISTORY (
    HistoryID BIGINT IDENTITY(1,1) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    [Version] INT NOT NULL,
    [Action] VARCHAR(50) NOT NULL,
    ActorID VARCHAR(50) NOT NULL,
    ActorRole VARCHAR(50) NOT NULL,
    DetailsJson NVARCHAR(MAX) NULL,
    CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_TripPlanningHistory PRIMARY KEY (HistoryID),
    CONSTRAINT FK_TripPlanningHistory_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID)
);

-- 18f. Bảng PLANNING_ATTACHMENT: Lưu chứng từ & file vé bay thật (F3-J42, J52)
CREATE TABLE PLANNING_ATTACHMENT (
    FileID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    FileType VARCHAR(50) NOT NULL, -- FLIGHT_EVIDENCE, ACCESS_EVIDENCE, CONSENT_EVIDENCE
    ContentType VARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL,
    StoragePath NVARCHAR(500) NOT NULL,
    UploadedBy VARCHAR(50) NULL,
    UploadedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_PlanningAttachment PRIMARY KEY (FileID),
    CONSTRAINT FK_PlanningAttachment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID)
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
    CoordinatorId VARCHAR(50) NULL,
    SafetyBlockerActive BIT NULL,
    ResolvedAt DATETIME2(7) NULL,
    ResolutionType VARCHAR(50) NULL,
    ResolutionNotes NVARCHAR(MAX) NULL,
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
    Version VARCHAR(20) NOT NULL DEFAULT '1.0',
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_ContractTemplate PRIMARY KEY (TemplateID)
);

-- 24. Bảng CONTRACT: Hợp đồng với khách hàng
CREATE TABLE CONTRACT (
    ContractCode VARCHAR(50) NULL,
    ExchangeRateToLocal DECIMAL(10, 4) NULL,
    BaseContractPrice_P DECIMAL(12, 2) NULL,
    ActualGrossProfit_AGP DECIMAL(12, 2) NULL,
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
    RefundedAtUtc DATETIME2(7) NULL,
    RefundVerifiedBy VARCHAR(50) NULL REFERENCES [USER](UserID),
    RefundVerifiedAtUtc DATETIME2(7) NULL,
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
    -- A transfer is performed externally; the Manager records its reference and verifies the evidence.
    CONSTRAINT CK_F1Final_Refund CHECK (
        (RefundStatus IS NULL AND RefundAmount IS NULL AND RefundReference IS NULL)
        OR (RefundStatus IS NOT NULL AND RefundStatus IN ('REQUESTED','PROCESSING','COMPLETED')
            AND (RefundAmount IS NULL OR RefundAmount>0))),
    CONSTRAINT FK_Contract_Request FOREIGN KEY (RequestID) REFERENCES [TRANSPORT_REQUEST](RequestID)
);

CREATE UNIQUE INDEX UX_Flow1Refund_Reference ON CONTRACT(RefundReference)
    WHERE RefundReference IS NOT NULL AND RefundVerifiedAtUtc IS NOT NULL;

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
('USER_010', 'escort_nam', 'HASH_SECURE_10', 'DRIVER_ESCORT', N'BS. Phan Nam (Kỹ thuật viên ngựa)', 'nam.escort@cbntransport.com', '0957890123', NULL, NULL, 1),
('USER_012', 'driver_nvhung', 'HASH_SECURE_12', 'DRIVER_ESCORT', N'Nguyễn Văn Hùng (Tài xế chính)', 'nguyenvanhung.driver@cbntransport.com', '0905551021', NULL, NULL, 1),
('USER_013', 'driver_lqtuan', 'HASH_SECURE_13', 'DRIVER_ESCORT', N'Lê Quốc Tuấn (Phụ lái)', 'lequoctuan.driver@cbntransport.com', '0905551022', NULL, NULL, 1),
('USER_014', 'escort_lttrang', 'HASH_SECURE_14', 'DRIVER_ESCORT', N'Dr. Lê Thu Trang (Bác sĩ thú y)', 'lethutrang.escort@cbntransport.com', '0285550135', NULL, NULL, 1),
('USER_015', 'driver_ptson', 'HASH_SECURE_15', 'DRIVER_ESCORT', N'Phạm Thanh Sơn (Tài xế)', 'phamthanhson.driver@cbntransport.com', '0905551023', NULL, NULL, 1),
('USER_016', 'driver_blong', 'HASH_SECURE_16', 'DRIVER_ESCORT', N'Bùi Văn Long (Tài xế)', 'buivanlong.driver@cbntransport.com', '0905551025', NULL, NULL, 1),
('USER_017', 'driver_dvkhoa', 'HASH_SECURE_17', 'DRIVER_ESCORT', N'Đặng Văn Khoa (Phụ lái)', 'dangvankhoa.driver@cbntransport.com', '0905551026', NULL, NULL, 1),
('USER_018', 'escort_nmanh', 'HASH_SECURE_18', 'DRIVER_ESCORT', N'BS. Nguyễn Minh Anh (Bác sĩ thú y)', 'nguyenminhanh.escort@cbntransport.com', '0285550142', NULL, NULL, 1),
('USER_019', 'escort_tqbao', 'HASH_SECURE_19', 'DRIVER_ESCORT', N'BS. Trần Quốc Bảo (Bác sĩ thú y)', 'tranquocbao.escort@cbntransport.com', '0245550177', NULL, NULL, 1),
('USER_020', 'spec_hha', 'HASH_SECURE_20', 'TRANSPORT_SPECIALIST', N'Hoàng Thu Hà (Chuyên viên thẩm định hồ sơ)', 'ha.specialist@cbntransport.com', '0905556601', NULL, NULL, 1),
('USER_021', 'spec_vmchau', 'HASH_SECURE_21', 'TRANSPORT_SPECIALIST', N'Vũ Minh Châu (Chuyên viên kiểm dịch & hải quan)', 'chau.specialist@cbntransport.com', '0905556602', NULL, NULL, 1),
('USER_022', 'coord_tbngoc', 'HASH_SECURE_22', 'FLEET_ROUTE_COORDINATOR', N'Trần Bảo Ngọc (Điều phối xe & lịch trình)', 'ngoc.coord@cbntransport.com', '0905556603', NULL, NULL, 1),
('USER_024', 'admin_system', 'HASH_SECURE_24', 'ADMIN', N'Quản trị viên Hệ thống (System Admin)', 'admin@cbntransport.com', '0905556605', NULL, NULL, 1);

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
('BUSINESS_POLICY_008', 'FEEDBACK_WINDOW_HOURS', 'NUMBER', 24, NULL, NULL, 'HOUR', 'GLOBAL', NULL, N'Thời lượng cửa sổ phản hồi sau tất toán hoặc sau khi khách chấp nhận kết quả giải quyết khiếu nại.', 'USER_004'),
('BUSINESS_POLICY_012', 'MIN_TRANSIT_DAYS', 'NUMBER', 0, NULL, NULL, 'DAY', 'GLOBAL', NULL, N'Số ngày tối thiểu từ ngày lấy đến ngày giao mặc định (0 là được giao trong ngày).', 'USER_004'),
('BUSINESS_POLICY_013', 'MIN_TRANSIT_DAYS', 'NUMBER', 2, NULL, NULL, 'DAY', 'COUNTRY', 'JP', N'Chuyến đi Nhật Bản gồm chặng bay quốc tế và thủ tục nên ngày giao phải sau ngày lấy ít nhất 2 ngày.', 'USER_004'),
('BUSINESS_POLICY_014', 'FLOW1_PREPARATION_DAYS', 'NUMBER', 3, NULL, NULL, 'DAY', 'TRANSPORT_MODE', 'ROAD', N'Flow 1: số ngày chuẩn bị vận chuyển đường bộ.', 'USER_004'),
('BUSINESS_POLICY_015', 'FLOW1_PREPARATION_DAYS', 'NUMBER', 7, NULL, NULL, 'DAY', 'TRANSPORT_MODE', 'AIR', N'Flow 1: số ngày chuẩn bị vận chuyển đường hàng không.', 'USER_004'),
('BUSINESS_POLICY_016', 'FLOW1_REVIEW_BUFFER_DAYS', 'NUMBER', 3, NULL, NULL, 'DAY', 'GLOBAL', NULL, N'Số ngày dự trù xét duyệt yêu cầu.', 'USER_004'),
('BUSINESS_POLICY_017', 'FLOW1_SIGNING_BUFFER_DAYS', 'NUMBER', 2, NULL, NULL, 'DAY', 'GLOBAL', NULL, N'Số ngày dự trù hoàn thành hợp đồng khi chọn ngày nhận ngựa.', 'USER_004'),
('BUSINESS_POLICY_018', 'FLOW1_CUSTOMER_RESPONSE_HOURS', 'NUMBER', 24, NULL, NULL, 'HOUR', 'GLOBAL', NULL, N'Hạn phản hồi chỉnh sửa hoặc xác nhận lịch trước hợp đồng.', 'USER_004');

-- 2. Bảng HORSE: Đa dạng cá thể (Ngựa đực Stallion, Ngựa cái Mare, Ngựa thiến Gelding)
INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB, PhotoUrl, PassportScanUrl) VALUES
('HORSE_001', 'USER_001', '981098102938475', 'VN_FEI_2026_01', N'Tia Chớp Đỏ (Red Lightning)', N'Thoroughbred', 'STALLION', 'INTACT', 520.50, '2020-04-15', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_002', 'USER_001', '981098102938476', 'VN_FEI_2026_02', N'Bão Táp Xanh (Blue Storm)', N'Arabian', 'MARE', 'NOT_PREGNANT', 485.00, '2021-06-20', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_003', 'USER_001', '981098102938477', 'VN_FEI_2026_03', N'Bạch Mã Hoàng Tử (Prince)', N'Thoroughbred', 'GELDING', 'GELDED', 540.00, '2019-09-10', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_004', 'USER_001', '981098102938478', 'VN_FEI_2026_04', N'Nữ Hoàng Cát (Desert Queen)', N'Warmblood', 'MARE', 'PREGNANT', 510.00, '2020-11-05', 'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf'),
('HORSE_005', 'USER_003', '981098102938479', 'VN_FEI_2026_05', N'Chiến Binh Đen (Black Knight)', N'Friesian', 'STALLION', 'INTACT', 560.00, '2018-03-12', NULL, NULL);

-- 3. Bảng STAFF_DOCUMENT: Giấy phép, Hộ chiếu, Visa nhân sự (Có hồ sơ hợp lệ và hồ sơ sắp hết hạn)
INSERT INTO STAFF_DOCUMENT (DocumentID, UserID, DocType, CountryOfIssue, ValidForCountries, IssueDate, ExpiryDate, DocumentUrl, Status) VALUES
('STAFF_DOCUMENT_001', 'USER_007', 'PASSPORT', 'VN', N'VN, JP', '2023-01-10', '2033-01-10', 'https://storage.cbntransport.com/docs/pass_hung.pdf', 'VALID'),
('STAFF_DOCUMENT_002', 'USER_007', 'DRIVING_LICENSE', 'VN', N'VN', '2022-05-15', '2027-05-15', 'https://storage.cbntransport.com/docs/lic_hung.pdf', 'VALID'),
('STAFF_DOCUMENT_003', 'USER_009', 'PASSPORT', 'VN', N'VN, JP', '2024-02-01', '2034-02-01', 'https://storage.cbntransport.com/docs/pass_hoa.pdf', 'VALID'),
('STAFF_DOCUMENT_004', 'USER_008', 'PASSPORT', 'VN', N'VN, JP', '2022-08-10', '2032-08-10', 'https://storage.cbntransport.com/docs/pass_thanh.pdf', 'VALID'),
('STAFF_DOCUMENT_005', 'USER_010', 'PASSPORT', 'VN', N'VN, JP', '2021-03-01', '2026-10-25', 'https://storage.cbntransport.com/docs/pass_nam.pdf', 'EXPIRING_SOON'),
('STAFF_DOCUMENT_006', 'USER_012', 'DRIVING_LICENSE', 'VN', N'VN, JP', '2023-03-15', '2028-03-15', 'https://storage.cbntransport.com/docs/lic_nvhung.pdf', 'VALID'),
('STAFF_DOCUMENT_007', 'USER_012', 'PASSPORT', 'VN', N'VN, JP', '2023-01-10', '2033-01-10', 'https://storage.cbntransport.com/docs/pass_nvhung.pdf', 'VALID'),
('STAFF_DOCUMENT_008', 'USER_013', 'DRIVING_LICENSE', 'VN', N'VN, JP', '2023-04-20', '2028-04-20', 'https://storage.cbntransport.com/docs/lic_lqtuan.pdf', 'VALID'),
('STAFF_DOCUMENT_009', 'USER_013', 'PASSPORT', 'VN', N'VN, JP', '2023-02-15', '2033-02-15', 'https://storage.cbntransport.com/docs/pass_lqtuan.pdf', 'VALID'),
('STAFF_DOCUMENT_010', 'USER_014', 'VET_CERTIFICATE', 'VN', N'VN, JP', '2022-09-01', '2032-09-01', 'https://storage.cbntransport.com/docs/vet_lttrang.pdf', 'VALID'),
('STAFF_DOCUMENT_011', 'USER_014', 'PASSPORT', 'VN', N'VN, JP', '2022-07-10', '2032-07-10', 'https://storage.cbntransport.com/docs/pass_lttrang.pdf', 'VALID');

-- 4. Bảng NOTIFICATION: Lịch sử thông báo hệ thống gửi qua App/Email/SMS
INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt) VALUES
('NOTIFICATION_001', 'USER_001', 'REQUEST_001', 'ORDER_STATUS', 'APP_PUSH', N'Yêu cầu vận chuyển được duyệt', N'Đơn REQUEST_001 của bạn đã được phê duyệt.', 1, N'2026-09-03 08:30:00'),
('NOTIFICATION_002', 'USER_007', 'TRIP_001', 'TRIP_ASSIGN', 'SMS', N'Lệnh điều xe mới', N'Bạn được phân công làm tài xế chính chuyến TRIP_001.', 1, N'2026-09-04 16:30:00'),
('NOTIFICATION_003', 'USER_001', 'INCIDENT_002', 'INCIDENT', 'EMAIL', N'Cảnh báo sự cố hiện trường', N'Ngựa HORSE_003 bị stress nhiệt; chuyến được theo dõi và giao muộn.', 1, N'2026-10-05 14:00:00'),
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
('REQUEST_001', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trung tâm tiếp nhận ngựa Narita, Nhật Bản', N'Thi đấu Cúp Hoàng Gia', N'AIR', '2026-11-15 06:00:00', '2026-11-18 18:00:00', N'Kenji Sato', N'+819012345678', 212500000.00, 'SCHEDULED', N'VN', N'JP', 7, N'Nguyễn Văn A', N'0901234567', 21.200000, 105.800000, 35.770000, 140.380000, NULL, NULL),
('REQUEST_002', 'USER_001', N'Trại ngựa Củ Chi, TP.HCM', N'Trung tâm tiếp nhận ngựa Đà Nẵng', N'Giao lưu huấn luyện', 'ROAD', '2026-11-05 05:00:00', '2026-11-06 17:00:00', N'Nguyễn Minh', N'0902223344', 105000000.00, N'IN_PROGRESS', N'VN', N'VN', 3, N'Nguyễn Văn A', N'0901234567', 10.970000, 106.500000, 16.050000, 108.200000, 950.00, N'Đã đến nơi; chờ lập biên bản bàn giao và nghiệm thu Flow 6.'),
('REQUEST_003', 'USER_001', N'Trang trại Sóc Sơn, Hà Nội', N'Trại ngựa Phú Thọ, TP.HCM', N'Nhân giống thuần chủng', 'ROAD', '2026-11-12 07:00:00', '2026-11-15 20:00:00', N'Nguyễn Hoàng', '0903334455', 145000000.00, 'SCHEDULED', N'VN', N'VN', 3, N'Nguyễn Văn A', N'0901234567', 21.200000, 105.800000, 10.770000, 106.660000, 1720.00, NULL),
('REQUEST_004', 'USER_003', N'Khu huấn luyện Ba Vì, Hà Nội', N'Trung tâm tiếp nhận ngựa Narita, Nhật Bản', N'Bán chuyển nhượng', N'AIR', '2026-10-20 08:00:00', '2026-10-24 16:00:00', N'Kenji Sato', N'+819012345678', 300000000.00, 'REJECTED', N'VN', N'JP', 7, N'Lê Thị C', N'0911223344', 21.200000, 105.800000, 35.770000, 140.380000, NULL, N'Từ chối do hồ sơ xét nghiệm hết hạn; không tạo hợp đồng hoặc chuyến.');

-- 11. Bảng REQUEST_HORSE_MAPPING: Gán các cá thể ngựa vào từng yêu cầu
INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES
('RHM_001', 'REQUEST_001', 'HORSE_001'),
('RHM_002', 'REQUEST_001', 'HORSE_002'),
('RHM_003', 'REQUEST_002', 'HORSE_003'),
('RHM_004', 'REQUEST_003', 'HORSE_001'),
('RHM_005', 'REQUEST_004', 'HORSE_005');

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
('QUARANTINE_BOOKING_001', 'REQUEST_001', 'FACILITY_002', N'Trạm thú y tiếp nhận Narita', N'Nhật Bản', N'2026-11-16 14:00:00', N'2026-11-17 08:00:00', N'CFM_DEMO_1', 'CONFIRMED'),
('QUARANTINE_BOOKING_002', 'REQUEST_002', 'FACILITY_004', N'Trung tâm thú y Đà Nẵng', N'Việt Nam', N'2026-10-06 12:00:00', N'2026-10-06 17:00:00', N'CFM_DEMO_2', 'COMPLETED');

-- =============================================================================
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG (OPERATIONS & CUSTOMS)
-- =============================================================================

-- 14. Bảng TRIP_PLAN: Kế hoạch các chuyến đi
INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId, AssignedSpecialistId, AssignedCoordinatorId) VALUES
('TRIP_001', 'REQUEST_001', 4500.00, 59.50, 155000000.00, 'PLANNING', N'CONFIRMED', N'Hợp đồng đã ký và cọc đã xác minh; Flow 2 và Flow 3 hoàn tất, chờ Quản lý mở chuyến.', N'USER_004', N'2026-11-05 16:30:00', N'HANDOFF_EVENT_001', N'USER_005', N'USER_006'),
('TRIP_002', 'REQUEST_002', 950.00, 37.50, 77500000.00, 'COMPLETED', N'CONFIRMED', N'Đã hoàn thành bàn giao và tất toán chi phí.', N'USER_004', N'2026-09-30 10:30:00', N'HANDOFF_EVENT_002', N'USER_005', N'USER_006'),
('TRIP_003', 'REQUEST_003', 1720.00, 42.00, 107500000.00, 'READY_TO_DEPART', N'CONFIRMED', N'Đã hoàn tất Flow 2 và Flow 3; sẵn sàng khởi hành, chưa ghi nhận tiến độ.', N'USER_004', N'2026-11-04 16:00:00', N'HANDOFF_EVENT_003', N'USER_005', N'USER_006');

-- 15. Bảng VEHICLE: Đội xe chuyên dụng chở ngựa đua
INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status) VALUES
('VEHICLE_001', 'HORSEBOX_3_STALLS', 3, 900.00, 30000.00, 'AVAILABLE'),
('VEHICLE_002', 'HORSEBOX_6_STALLS', 6, 1200.00, 45000.00, 'AVAILABLE'),
('VEHICLE_003', 'HORSEBOX_2_STALLS', 2, 750.00, 25000.00, 'MAINTENANCE');

-- 16. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái
INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, VehicleID, DriverID, EscortID) VALUES
('TRIP_ASSIGNMENT_001', 'TRIP_001', 'VEHICLE_001', 'USER_007', 'USER_009'),
('TRIP_ASSIGNMENT_002', 'TRIP_002', 'VEHICLE_003', 'USER_008', 'USER_010'),
('TRIP_ASSIGNMENT_003', 'TRIP_003', 'VEHICLE_002', 'USER_015', 'USER_018');
UPDATE TRIP_VEHICLE_ASSIGNMENT SET CoDriverID = 'USER_017', VeterinarianID = 'USER_018' WHERE AssignmentID = 'TRIP_ASSIGNMENT_003';

-- 17. (MỚI) Bảng FLIGHT_BOOKING: Đặt dịch vụ vận chuyển hàng không mẫu
SET IDENTITY_INSERT FLIGHT_BOOKING ON;
INSERT INTO FLIGHT_BOOKING (FlightBookingID, TripID, BookingVersion, RouteVersionID, ProviderName, Airline, FlightNumber, DepartureAirportCheckpointId, ArrivalAirportCheckpointId, DepartureAt, ArrivalAt, DirectFlight, BookingReference, BookingConfirmed, HorseIds, Note, CreatedAt) VALUES
(300, 'TRIP_001', 1, 120, N'Nippon Cargo Airlines', N'NCA Airlines', 'KZ-102', 101, 201, N'2026-11-16 05:00:00', N'2026-11-16 12:00:00', 1, N'NCA-HAN-NRT-DEMO-2026', 1, '["HORSE_001","HORSE_002"]', N'Chặng HAN → NRT của TRIP_001; mọi thời điểm lưu UTC.', N'2026-11-05 08:00:00');
SET IDENTITY_INSERT FLIGHT_BOOKING OFF;
-- 18. Bảng ROUTE_SEGMENT: Phân đoạn lộ trình của các chuyến đi
INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, FacilityID, LocationName, SegmentType, TransportMode, CarrierName, Flight_Voyage_No, ExpectedETA, ActualTime, Status) VALUES
('ROUTE_SEGMENT_001', 'TRIP_001', 'FACILITY_001', N'Sóc Sơn → khu tiếp nhận Nội Bài', 'REST_STOP', 'ROAD', NULL, NULL, '2026-11-15 15:00:00', NULL, 'PLANNED'),
('ROUTE_SEGMENT_002', 'TRIP_001', 'FACILITY_002', N'Nội Bài (HAN) → Narita (NRT)', N'QUARANTINE_STOP', N'AIR', N'NCA Airlines', N'KZ-102', N'2026-11-16 12:00:00', NULL, 'PLANNED'),
('ROUTE_SEGMENT_003', 'TRIP_001', NULL, N'Trạm thú y Narita → trung tâm tiếp nhận Narita', 'DESTINATION', 'ROAD', NULL, NULL, '2026-11-17 18:00:00', NULL, 'PLANNED'),
('ROUTE_SEGMENT_004', 'TRIP_002', 'FACILITY_003', N'Củ Chi → trạm tiếp nhận Củ Chi', N'REST_STOP', 'ROAD', NULL, NULL, '2026-11-05 08:30:00', '2026-11-05 09:15:00', 'COMPLETED'),
('ROUTE_SEGMENT_005', 'TRIP_002', 'FACILITY_004', N'TP.HCM → trung tâm tiếp nhận Đà Nẵng', 'DESTINATION', 'ROAD', NULL, NULL, N'2026-11-06 16:00:00', N'2026-11-06 18:30:00', 'COMPLETED'),
('ROUTE_SEGMENT_006', 'TRIP_003', 'FACILITY_005', N'Hà Nội -> Trạm Nghỉ Đà Nẵng', 'REST_STOP', 'ROAD', NULL, NULL, '2026-11-13 10:00:00', NULL, 'PLANNED'),
('ROUTE_SEGMENT_007', 'TRIP_003', NULL, N'Đà Nẵng -> Trại Phú Thọ TP.HCM', 'DESTINATION', 'ROAD', NULL, NULL, '2026-11-15 18:00:00', NULL, 'PLANNED');

-- 19. Bảng CUSTOMS_CLEARANCE: Thủ tục thông quan biên giới
INSERT INTO CUSTOMS_CLEARANCE (ClearanceID, TripID, SegmentID, BorderCrossingName, CustomsAgentName, DocumentType, DeclarationNumber, Status, ClearedAt) VALUES
('CUSTOMS_CLEARANCE_001', N'TRIP_001', N'ROUTE_SEGMENT_002', N'Cửa khẩu hàng không Nội Bài', N'Đại lý hải quan mẫu', N'EXPORT', N'DEMO-CUSTOMS-1', 'CLEARED', N'2026-09-16 04:00:00'),
('CUSTOMS_CLEARANCE_002', N'TRIP_001', N'ROUTE_SEGMENT_002', N'Cửa khẩu hàng không Narita', N'Đại lý hải quan mẫu', N'IMPORT', N'DEMO-CUSTOMS-2', 'CLEARED', N'2026-09-16 13:00:00');

-- 20. Bảng HEALTH_LOG: Nhật ký sinh hiệu sức khỏe cá thể ngựa (Insert-Only)
INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, MediaUrl) VALUES
('HEALTH_LOG_003', 'TRIP_002', 'HORSE_003', 'USER_010', 'TRANSIT_CHECK', '2026-10-05 14:00:00', 39.2, 58, N'Căng thẳng/Sốt', N'Ngựa đổ mồ hôi nhiều lúc qua phà, đã truyền điện giải.', 'https://storage.cbntransport.com/logs/log3.jpg'),
('HEALTH_LOG_004', 'TRIP_003', 'HORSE_001', 'USER_018', 'OBSERVATION', '2026-11-12 07:00:00', 38.0, 40, N'Rất tốt', N'Kiểm tra sức khỏe trước khi xe khởi hành.', 'https://storage.cbntransport.com/logs/log4.jpg');

-- 21. Bảng INCIDENT: Sự cố phát sinh khẩn cấp trên đường
INSERT INTO INCIDENT (IncidentID, TripID, ApprovedBy, IncidentType, LocationCoordinates, Description, ImageUrl, AdditionalCost, Status) VALUES
('INCIDENT_002', 'TRIP_002', 'USER_004', 'EQUINE_STRESS', '11.2312,105.8821', N'Ngựa HORSE_003 bị sốt nhẹ do nắng nóng, phải dừng xe hạ nhiệt mất 1h30m.', 'https://storage.cbntransport.com/incidents/vet2.jpg', 3750000.00, 'RESOLVED');

-- 22. Bảng HANDOVER: Biên bản tiếp nhận (Pickup) và giao ngựa (Delivery)
INSERT INTO HANDOVER (HandoverID, TripID, HandedByUserID, Type, LocationName, ReceiverName, ReceiverPhone, IsAuthorized, Status) VALUES
('HANDOVER_003', 'TRIP_002', 'USER_008', 'PICKUP', N'Trại ngựa Củ Chi, TP.HCM', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED'),
('HANDOVER_004', 'TRIP_002', 'USER_008', 'DELIVERY', N'Trung tâm tiếp nhận ngựa Đà Nẵng', N'Nguyễn Minh', N'0902223344', 1, 'CONFIRMED');

-- 23. Bảng HANDOVER_ITEM: Đối soát mã chip và thể trạng lúc giao nhận
INSERT INTO HANDOVER_ITEM (HandoverItemID, HandoverID, HorseID, MicrochipVerified, ConditionStatus, AssetCheck, PhotoUrl) VALUES
('HANDOVER_ITEM_005', 'HANDOVER_003', 'HORSE_003', 1, N'Thể trạng tốt', N'Đã xác nhận tiếp nhận ngựa tại điểm lấy.', 'https://storage.cbntransport.com/ho/pu_hrs3.jpg'),
('HANDOVER_ITEM_006', 'HANDOVER_004', 'HORSE_003', 1, N'Thể trạng tốt sau hành trình', N'Đã xác nhận giao ngựa tại điểm đến Đà Nẵng.', 'https://storage.cbntransport.com/ho/de_hrs3.jpg');

-- 23.1. Bảng HANDOVER_REVISION: Phiên bản bàn giao cho chuyến hoàn thành TRIP_002
INSERT INTO HANDOVER_REVISION (HandoverRevisionID, HandoverID, TripID, RevisionNo, Status, ContentSnapshot, OtpEmail, OtpHash, OtpSentAtUtc, OtpExpiresAtUtc, OtpFailedAttempts, ConfirmedAtUtc, RefusalReason, RefusedAtUtc, CreatedBy, CreatedAtUtc)
VALUES
('HR_002', 'HANDOVER_004', 'TRIP_002', 1, 'CONFIRMED', N'{"handoverId":"HANDOVER_004","receiverName":"Nguyễn Minh","receiverPhone":"0902223344","notes":"Ngựa đã bàn giao nguyên vẹn, khỏe mạnh"}', 'minh.nguyen@example.com', NULL, '2026-11-06 17:00:00', '2026-11-06 17:30:00', 0, '2026-11-06 17:15:00', NULL, NULL, 'USER_008', '2026-11-06 16:50:00');

-- =============================================================================
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH VND (CONTRACT & BILLING)
-- =============================================================================

-- 24. Bảng CONTRACT: 3 hợp đồng vận chuyển
INSERT INTO CONTRACT (ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard, SignedAt, ContractStatus, PublishedAtUtc, PublishedBy, PdfUrl, DepositAmount, CompletionDeadline, SignerEmail) VALUES
('CONTRACT_001', 'TRIP_001', 'REQUEST_001', 'USER_001', 'VND', 212500000.00, 40.00, N'2026-11-04 16:00:00', 'EFFECTIVE', N'2026-11-04 08:00:00', N'USER_004', N'private/demo/contract_1_v1.pdf', 85000000, N'2026-11-20 08:00:00', N'vana.horse@gmail.com'),
('CONTRACT_002', 'TRIP_002', 'REQUEST_002', 'USER_001', 'VND', 105000000.00, 40.00, N'2026-09-30 10:00:00', N'EFFECTIVE', N'2026-09-30 08:00:00', N'USER_004', N'private/demo/contract_2_v1.pdf', 42000000, N'2026-11-07 08:00:00', N'vana.horse@gmail.com'),
('CONTRACT_003', 'TRIP_003', 'REQUEST_003', 'USER_001', 'VND', 145000000.00, 40.00, N'2026-10-04 15:00:00', 'EFFECTIVE', N'2026-10-04 06:00:00', N'USER_004', N'private/demo/contract_3_v1.pdf', 58000000, N'2026-11-16 06:00:00', N'vana.horse@gmail.com');

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
('COST_ITEM_004', 'CONTRACT_002', N'Chi phí thú y', N'Khám cấp cứu sốt ngựa', 'COMPANY', 'VND', 3750000.00, N'https://example.invalid/bills/danang.pdf');

-- 26. Bảng INVOICE: Các đợt hóa đơn (Đã trả xong, Đang nợ, Quá hạn)
INSERT INTO INVOICE (InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus) VALUES
('INVOICE_001', 'CONTRACT_001', 1, 'DEPOSIT', 'VND', 85000000.00, 85000000.00, N'2026-11-05 08:00:00', 'PAID'),
('INVOICE_003', 'CONTRACT_002', 1, 'DEPOSIT', 'VND', 42000000.00, 42000000.00, N'2026-10-01 08:00:00', 'PAID'),
('INVOICE_004', 'CONTRACT_002', 1, 'FINAL_SETTLEMENT', 'VND', 63000000.00, 63000000.00, N'2026-11-06 18:00:00', 'PAID'),
('INVOICE_005', 'CONTRACT_003', 1, 'DEPOSIT', 'VND', 58000000.00, 58000000.00, N'2026-10-05 06:00:00', 'PAID');

-- 27. Bảng PAYMENT: Giao dịch đối soát thực tế qua Cổng thanh toán hoặc Chuyển khoản
INSERT INTO PAYMENT (PaymentID, InvoiceID, ConfirmedByUserID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate, VnpayTmnCode, VnpayResponseCode, VnpayTransactionStatus, VnpayCreatedAtUtc, VnpayExpiresAtUtc, VnpayReceivedAmount) VALUES
('PAYMENT_001', 'INVOICE_001', NULL, 'VND', 85000000.00, N'VNPAY', N'DEMO_VNPAY_001', 'SUCCESS', '2026-11-04 15:30:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-11-04 15:30:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-11-04 15:30:00' AS DATETIME2)), 85000000.00),
('PAYMENT_003', 'INVOICE_003', NULL, 'VND', 42000000.00, N'VNPAY', N'DEMO_VNPAY_003', 'SUCCESS', '2026-09-30 09:20:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-09-30 09:20:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-09-30 09:20:00' AS DATETIME2)), 42000000.00),
('PAYMENT_004', 'INVOICE_005', NULL, 'VND', 58000000.00, N'VNPAY', N'DEMO_VNPAY_004', 'SUCCESS', '2026-10-04 14:45:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-10-04 14:45:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-10-04 14:45:00' AS DATETIME2)), 58000000.00),
('PAYMENT_005', 'INVOICE_004', 'USER_004', 'VND', 63000000.00, N'VNPAY', N'DEMO_VNPAY_005', 'SUCCESS', '2026-11-06 18:15:00', 'DEMOTMN1', '00', '00', DATEADD(MINUTE,-5,CAST('2026-11-06 18:15:00' AS DATETIME2)), DATEADD(MINUTE,10,CAST('2026-11-06 18:15:00' AS DATETIME2)), 63000000.00);

GO


-- 27.1. Bảng TRIP_SETTLEMENT: Tất toán tài chính chuyến hoàn thành TRIP_002
INSERT INTO TRIP_SETTLEMENT (SettlementID, ContractID, TripID, CustomerID, ContractVersionNo, HandoverRevisionID, FinalInvoiceID, Status, PreparedBy, CreatedAtUtc, SettledBy, SettledAtUtc, ClosedAtUtc, FeedbackStartedAtUtc, FeedbackEndsAtUtc)
VALUES
('SETTLEMENT_002', 'CONTRACT_002', 'TRIP_002', 'USER_001', 1, 'HR_002', 'INVOICE_004', 'CLOSED', 'USER_004', '2026-11-06 18:00:00', 'USER_004', '2026-11-06 18:30:00', '2026-11-06 19:00:00', '2026-11-06 18:30:00', '2026-11-13 18:30:00');

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

-- Flow 6 begins on arrival; delivery handover, settlement and feedback are created by the workflow.
GO

-- Monotonic ID allocators. Created AFTER all explicit sample IDs.
-- Never RESTART backwards, CYCLE, or reseed after deletion.
-- Gaps from rollback/cache/restart are normal; never fill them.
-- Backend omits the PK on INSERT and reads OUTPUT INSERTED.<ID>.
-- These defaults do not forbid privileged callers from explicitly inserting an old ID.
-- Imports must synchronize the allocators without reducing previously issued high-water marks.
GO
CREATE SEQUENCE dbo.[SEQ_USER_ID] AS BIGINT
    START WITH 25 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
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
    START WITH 19 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[BUSINESS_POLICY] ADD CONSTRAINT [DF_BUSINESS_POLICY_ID]
    DEFAULT ('BUSINESS_POLICY_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_BUSINESS_POLICY_ID], '000', 'en-US')) FOR [PolicyID];

GO

-- Flow 6 monotonic ID allocators (after fixtures).
CREATE SEQUENCE dbo.[SEQ_HANDOVER_REVISION_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[HANDOVER_REVISION] ADD CONSTRAINT [DF_HANDOVER_REVISION_ID] DEFAULT ('HANDOVER_REVISION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HANDOVER_REVISION_ID], '000', 'en-US')) FOR [HandoverRevisionID];
GO
CREATE SEQUENCE dbo.[SEQ_TRIP_SETTLEMENT_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[TRIP_SETTLEMENT] ADD CONSTRAINT [DF_TRIP_SETTLEMENT_ID] DEFAULT ('SETTLEMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_SETTLEMENT_ID], '000', 'en-US')) FOR [SettlementID];
GO
CREATE SEQUENCE dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[SETTLEMENT_ADJUSTMENT] ADD CONSTRAINT [DF_SETTLEMENT_ADJUSTMENT_ID] DEFAULT ('SETTLEMENT_ADJUSTMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID], '000', 'en-US')) FOR [AdjustmentID];
GO
CREATE SEQUENCE dbo.[SEQ_CUSTOMER_CASE_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CUSTOMER_CASE] ADD CONSTRAINT [DF_CUSTOMER_CASE_ID] DEFAULT ('CUSTOMER_CASE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_CASE_ID], '000', 'en-US')) FOR [CaseID];
GO
CREATE SEQUENCE dbo.[SEQ_CUSTOMER_FEEDBACK_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
ALTER TABLE dbo.[CUSTOMER_FEEDBACK] ADD CONSTRAINT [DF_CUSTOMER_FEEDBACK_ID] DEFAULT ('CUSTOMER_FEEDBACK_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_FEEDBACK_ID], '000', 'en-US')) FOR [FeedbackID];
GO
GO

-- Dữ liệu mẫu CONTRACT chưa có ContractCode nhưng entity backend yêu cầu không NULL.
UPDATE CONTRACT SET ContractCode = ContractID WHERE ContractCode IS NULL;
GO

-- =============================================================================
-- PHẦN FLOW 4: VẬN HÀNH HIỆN TRƯỜNG & GIÁM SÁT HÀNH TRÌNH (từ module 05)
-- =============================================================================
USE HorseTransportDB;
GO

-- =============================================================================
-- BƯỚC 1: DỌN DẸP 10 BẢNG THUỘC SỞ HỮU RIÊNG CỦA FLOW 4 NẾU ĐÃ TỒN TẠI
-- LƯU Ý BẢO VỆ TOÀN VẸN HỆ THỐNG:
-- * TUYỆT ĐỐI KHÔNG DROP bảng INCIDENT vì bảng SETTLEMENT_ADJUSTMENT (Flow 6) đang tham chiếu FK_F6_AdjustmentIncident.
-- * TUYỆT ĐỐI KHÔNG DROP bảng HEALTH_LOG vì đang chứa dữ liệu seed ban đầu của HorseTransportDB.sql.
-- =============================================================================
DROP TABLE IF EXISTS EXECUTION_ATTACHMENT;
DROP TABLE IF EXISTS EXECUTION_CONTACT_LOG;
DROP TABLE IF EXISTS EXECUTION_ALERT;
DROP TABLE IF EXISTS LEGAL_CHECKPOINT_DECISION;
DROP TABLE IF EXISTS AIR_NOTICE;
DROP TABLE IF EXISTS TRIP_EXPENSE;
DROP TABLE IF EXISTS VET_ASSESSMENT;
DROP TABLE IF EXISTS ETA_PROPOSAL;
DROP TABLE IF EXISTS MILESTONE_CORRECTION_REQUEST;
DROP TABLE IF EXISTS TRIP_MILESTONE;
GO

-- =============================================================================
-- BƯỚC 2: MỞ RỘNG BẢNG TRIP_PLAN CHO PHÂN HỆ FLOW 4
-- GHI CHÚ NGUỒN GỐC (ORIGIN NOTE):
-- * BẢNG TRIP_PLAN GỐC ĐƯỢC TẠO TẠI: HorseTransportDB.sql (Dòng 321)
-- * ENTITY C# TƯƠNG ỨNG: backend/Domain/Entities/TripPlan.cs
-- * MỤC ĐÍCH: Bổ sung các trường phục vụ giám sát tiến độ thực tế, khóa phiên bản
--   lạc quan (ExecutionVersion), giai đoạn (ExecutionPhase) và đề xuất ETA.
-- =============================================================================

-- Các cột phục vụ Flow 4
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ExecutionVersion')
    ALTER TABLE TRIP_PLAN ADD ExecutionVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ExecutionPhase')
    ALTER TABLE TRIP_PLAN ADD ExecutionPhase VARCHAR(30) NOT NULL DEFAULT 'AWAITING_DEPARTURE';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'CurrentEta')
    ALTER TABLE TRIP_PLAN ADD CurrentEta DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'PendingEtaProposalId')
    ALTER TABLE TRIP_PLAN ADD PendingEtaProposalId VARCHAR(50) NULL;

-- Đảm bảo các cột phiên bản và phê duyệt của Backend được bổ sung an toàn nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'Version')
    ALTER TABLE TRIP_PLAN ADD [Version] INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'PlanVersion')
    ALTER TABLE TRIP_PLAN ADD PlanVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ContextVersion')
    ALTER TABLE TRIP_PLAN ADD ContextVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ReadinessVersion')
    ALTER TABLE TRIP_PLAN ADD ReadinessVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DraftPlanJson')
    ALTER TABLE TRIP_PLAN ADD DraftPlanJson NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ApprovedPlanJson')
    ALTER TABLE TRIP_PLAN ADD ApprovedPlanJson NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'OpenChange')
    ALTER TABLE TRIP_PLAN ADD OpenChange BIT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'EffectiveOriginPlaceId')
    ALTER TABLE TRIP_PLAN ADD EffectiveOriginPlaceId VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'OperationsStatus')
    ALTER TABLE TRIP_PLAN ADD OperationsStatus VARCHAR(30) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DocumentsStatus')
    ALTER TABLE TRIP_PLAN ADD DocumentsStatus VARCHAR(30) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'RouteStatus')
    ALTER TABLE TRIP_PLAN ADD RouteStatus VARCHAR(30) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ResourcesConfirmedAt')
    ALTER TABLE TRIP_PLAN ADD ResourcesConfirmedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ResourcesConfirmedBy')
    ALTER TABLE TRIP_PLAN ADD ResourcesConfirmedBy NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'EarliestDepartureDate')
    ALTER TABLE TRIP_PLAN ADD EarliestDepartureDate DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DocumentExpiryDate')
    ALTER TABLE TRIP_PLAN ADD DocumentExpiryDate DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DocumentsConfirmedAt')
    ALTER TABLE TRIP_PLAN ADD DocumentsConfirmedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DocumentsConfirmedBy')
    ALTER TABLE TRIP_PLAN ADD DocumentsConfirmedBy NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'SpecialistLegalNote')
    ALTER TABLE TRIP_PLAN ADD SpecialistLegalNote NVARCHAR(1000) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'CurrentRouteVersion')
    ALTER TABLE TRIP_PLAN ADD CurrentRouteVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'RouteApprovedAt')
    ALTER TABLE TRIP_PLAN ADD RouteApprovedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'RouteApprovedBy')
    ALTER TABLE TRIP_PLAN ADD RouteApprovedBy NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'RouteReturnReason')
    ALTER TABLE TRIP_PLAN ADD RouteReturnReason NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DepartureApprovedAt')
    ALTER TABLE TRIP_PLAN ADD DepartureApprovedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DepartureApprovedBy')
    ALTER TABLE TRIP_PLAN ADD DepartureApprovedBy VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'RejectionReason')
    ALTER TABLE TRIP_PLAN ADD RejectionReason NVARCHAR(500) NULL;
GO

-- Bổ sung an toàn cho bảng TRANSPORT_REQUEST
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRANSPORT_REQUEST') AND name = 'DeclaredValueVnd')
    ALTER TABLE TRANSPORT_REQUEST ADD DeclaredValueVnd DECIMAL(18, 2) NULL;
GO

-- Bổ sung an toàn cho bảng TRIP_VEHICLE_ASSIGNMENT
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_VEHICLE_ASSIGNMENT') AND name = 'LegNumber')
    ALTER TABLE TRIP_VEHICLE_ASSIGNMENT ADD LegNumber INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_VEHICLE_ASSIGNMENT') AND name = 'LegType')
    ALTER TABLE TRIP_VEHICLE_ASSIGNMENT ADD LegType VARCHAR(20) NOT NULL DEFAULT 'OUTBOUND';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_VEHICLE_ASSIGNMENT') AND name = 'CoDriverID')
    ALTER TABLE TRIP_VEHICLE_ASSIGNMENT ADD CoDriverID VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_VEHICLE_ASSIGNMENT') AND name = 'VeterinarianID')
    ALTER TABLE TRIP_VEHICLE_ASSIGNMENT ADD VeterinarianID VARCHAR(50) NULL;
GO

-- Bổ sung an toàn cho bảng VEHICLE
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'OperatingCountry')
    ALTER TABLE VEHICLE ADD OperatingCountry VARCHAR(10) NOT NULL DEFAULT 'VN';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'PlateNumber')
    ALTER TABLE VEHICLE ADD PlateNumber VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'Height_m')
    ALTER TABLE VEHICLE ADD Height_m DECIMAL(4, 2) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'Width_m')
    ALTER TABLE VEHICLE ADD Width_m DECIMAL(4, 2) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'Length_m')
    ALTER TABLE VEHICLE ADD Length_m DECIMAL(4, 2) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'Gross_Weight_Tons')
    ALTER TABLE VEHICLE ADD Gross_Weight_Tons DECIMAL(5, 2) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VEHICLE') AND name = 'Axle_Weight_Tons')
    ALTER TABLE VEHICLE ADD Axle_Weight_Tons DECIMAL(5, 2) NULL;
GO

-- Bổ sung an toàn cho bảng ROUTE_SEGMENT
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ROUTE_SEGMENT') AND name = 'SequenceOrder')
    ALTER TABLE ROUTE_SEGMENT ADD SequenceOrder INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ROUTE_SEGMENT') AND name = 'PlannedTime')
    ALTER TABLE ROUTE_SEGMENT ADD PlannedTime DATETIME NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ROUTE_SEGMENT') AND name = 'Latitude')
    ALTER TABLE ROUTE_SEGMENT ADD Latitude DECIMAL(9, 6) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ROUTE_SEGMENT') AND name = 'Longitude')
    ALTER TABLE ROUTE_SEGMENT ADD Longitude DECIMAL(9, 6) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ROUTE_SEGMENT') AND name = 'Coordinates')
    ALTER TABLE ROUTE_SEGMENT ADD Coordinates NVARCHAR(100) NULL;
GO

-- =============================================================================
-- BƯỚC 3: MỞ RỘNG BẢNG HEALTH_LOG CHO PHÂN HỆ FLOW 4 (APPEND-ONLY & CLINICAL)
-- GHI CHÚ NGUỒN GỐC (ORIGIN NOTE):
-- * BẢNG HEALTH_LOG GỐC ĐƯỢC TẠO TẠI: HorseTransportDB.sql (Bảng số 19, dòng 427)
-- * ENTITY C# TƯƠNG ỨNG: backend/Domain/Entities/HealthLog.cs
-- * MỤC ĐÍCH: Kế thừa 4 bản ghi seed mẫu đã có sẵn và bổ sung các chỉ số sinh hiệu
--   chuyên sâu (nhịp thở, thức ăn, nước uống, tình trạng NORMAL/ABNORMAL kích hoạt
--   Safety Blocker, cờ liên kết sự cố và cơ chế đính chính Append-Only qua SupersedesLogId).
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'MilestoneID')
    ALTER TABLE HEALTH_LOG ADD MilestoneID VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'LegType')
    ALTER TABLE HEALTH_LOG ADD LegType VARCHAR(20) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'RespiratoryRatePerMin')
    ALTER TABLE HEALTH_LOG ADD RespiratoryRatePerMin INT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'Condition')
    ALTER TABLE HEALTH_LOG ADD Condition VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'PhotoFileIds')
    ALTER TABLE HEALTH_LOG ADD PhotoFileIds NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'HydrationStatus')
    ALTER TABLE HEALTH_LOG ADD HydrationStatus NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'AppetiteStatus')
    ALTER TABLE HEALTH_LOG ADD AppetiteStatus NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'FecesCondition')
    ALTER TABLE HEALTH_LOG ADD FecesCondition NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'Feeding')
    ALTER TABLE HEALTH_LOG ADD Feeding NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'Water')
    ALTER TABLE HEALTH_LOG ADD Water NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'RestStatus')
    ALTER TABLE HEALTH_LOG ADD RestStatus NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'CareNotes')
    ALTER TABLE HEALTH_LOG ADD CareNotes NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'IncidentID')
    ALTER TABLE HEALTH_LOG ADD IncidentID VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'IncidentRequired')
    ALTER TABLE HEALTH_LOG ADD IncidentRequired BIT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'SupersedesLogId')
    ALTER TABLE HEALTH_LOG ADD SupersedesLogId VARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'AmendmentReason')
    ALTER TABLE HEALTH_LOG ADD AmendmentReason NVARCHAR(1000) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HEALTH_LOG') AND name = 'RecordedAt')
    ALTER TABLE HEALTH_LOG ADD RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE();

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_HealthLog_Supersedes')
BEGIN
    ALTER TABLE HEALTH_LOG ADD CONSTRAINT FK_HealthLog_Supersedes 
    FOREIGN KEY (SupersedesLogId) REFERENCES HEALTH_LOG(LogID);
END
GO

-- Đảm bảo REQUEST_HORSE_MAPPING có cột CareInstructions (RULE/ID_NAME_RULE.md: Khóa chính ghép RequestID, HorseID)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('REQUEST_HORSE_MAPPING') AND name = 'CareInstructions')
BEGIN
    ALTER TABLE REQUEST_HORSE_MAPPING ADD CareInstructions NVARCHAR(2000) NULL;
END
GO

-- Chuẩn hóa dữ liệu cũ của HEALTH_LOG & TRIP_PLAN tránh lỗi SqlNullValueException
UPDATE HEALTH_LOG SET Condition = 'NORMAL' WHERE Condition IS NULL;
UPDATE HEALTH_LOG SET LegType = 'road' WHERE LegType IS NULL;
UPDATE HEALTH_LOG SET RecordedAt = LogTime WHERE RecordedAt IS NULL;
UPDATE HEALTH_LOG SET IncidentRequired = 0 WHERE IncidentRequired IS NULL;
UPDATE TRIP_PLAN SET ExecutionPhase = 'AWAITING_DEPARTURE' WHERE ExecutionPhase IS NULL;
UPDATE TRIP_PLAN SET RouteStatus = 'APPROVED' WHERE RouteStatus IS NULL;
UPDATE TRIP_PLAN SET OperationsStatus = 'READY' WHERE OperationsStatus IS NULL;
UPDATE TRIP_PLAN SET DocumentsStatus = 'READY' WHERE DocumentsStatus IS NULL;
GO

-- =============================================================================
-- BƯỚC 4: TẠO 10 BẢNG MỚI ĐẶC THÙ RIÊNG PHỤC VỤ CHO 37 ENDPOINT FLOW 4
-- Đồng bộ 100% tên cột với các Fluent API Configurations trong C# Backend:
-- Infrastructure/Data/Configurations/Flow4/
-- Chuẩn mã ID theo RULE/ID_NAME_RULE.md: <TIỀN_TỐ>_<SỐ_THỨ_TỰ>
-- =============================================================================

-- 1. BẢNG TRIP_MILESTONE: DANH SÁCH CÁC MỐC HÀNH TRÌNH TUẦN TỰ
-- Cấu hình Entity: TripMilestoneConfiguration.cs (Entity: TripMilestone.cs)
CREATE TABLE TRIP_MILESTONE (
    MilestoneID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    Leg VARCHAR(20) NOT NULL DEFAULT 'road',         -- 'road', 'outbound', 'air', 'inbound'
    MilestoneKind VARCHAR(50) NOT NULL,              -- DEPARTED, STOP_ARRIVED, STOP_DEPARTED, CHECKPOINT_ARRIVED, CHECKPOINT_DEPARTED, AIRPORT_ORIGIN_ARRIVED, AIR_HANDOVER, AIR_DEPARTED, AIR_ARRIVED, AIR_RECEIVED, FINAL_ARRIVED
    SequenceOrder INT NOT NULL,                      -- Thứ tự tuần tự (1, 2, 3...)
    Label NVARCHAR(255) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING, COMPLETED
    PlannedTime DATETIME2 NOT NULL,
    OccurredAt DATETIME2 NULL,
    RecordedAt DATETIME2 NULL,
    RecordedBy VARCHAR(50) NULL,
    Revision INT NOT NULL DEFAULT 1,
    RequiresHealthCheck BIT NOT NULL DEFAULT 0,      -- Trạm dừng yêu cầu kiểm tra y tế bắt buộc
    LocationCoordinates VARCHAR(100) NULL,
    Latitude DECIMAL(9, 6) NULL,
    Longitude DECIMAL(9, 6) NULL,
    Note NVARCHAR(MAX) NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,              -- JSON mảng các FileID chứng từ
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_TripMilestone PRIMARY KEY (MilestoneID),
    CONSTRAINT FK_TripMilestone_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripMilestone_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- 2. BẢNG MILESTONE_CORRECTION_REQUEST: YÊU CẦU ĐÍNH CHÍNH MỐC ĐÃ HOÀN TẤT
-- Cấu hình Entity: MilestoneCorrectionRequestConfiguration.cs
CREATE TABLE MILESTONE_CORRECTION_REQUEST (
    CorrectionID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RequestedBy VARCHAR(50) NOT NULL,
    RequestedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    ProposedOccurredAt DATETIME2 NOT NULL,
    ProposedNote NVARCHAR(MAX) NULL,
    ProposedEvidenceFileIds NVARCHAR(MAX) NULL,
    OriginalOccurredAt DATETIME2 NULL,
    OriginalNote NVARCHAR(MAX) NULL,
    OriginalEvidenceFileIds NVARCHAR(MAX) NULL,
    Reason NVARCHAR(2000) NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING',   -- PENDING, APPROVED, REJECTED
    Version INT NOT NULL DEFAULT 1,
    DecidedBy VARCHAR(50) NULL,
    DecidedAt DATETIME2 NULL,
    DecisionReason NVARCHAR(2000) NULL,
    CONSTRAINT PK_MilestoneCorrection PRIMARY KEY (CorrectionID),
    CONSTRAINT FK_MilestoneCorrection_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID),
    CONSTRAINT FK_MilestoneCorrection_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_MilestoneCorrection_RequestedBy FOREIGN KEY (RequestedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_MilestoneCorrection_DecidedBy FOREIGN KEY (DecidedBy) REFERENCES [USER](UserID)
);
GO

-- 3. BẢNG ETA_PROPOSAL: ĐỀ XUẤT ĐIỀU CHỈNH THỜI GIAN ĐẾN NƠI (ETA 2 CẤP)
-- Cấu hình Entity: EtaProposalConfiguration.cs
CREATE TABLE ETA_PROPOSAL (
    ProposalID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    CurrentEtaSnapshot DATETIME2 NOT NULL,
    ProposedEta DATETIME2 NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    LinkedIncidentId VARCHAR(50) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING_COORDINATOR', -- PENDING_COORDINATOR, PENDING_MANAGER, APPROVED, REJECTED
    RequiresManager BIT NOT NULL DEFAULT 0,          -- Vượt hạn giao hàng -> Manager duyệt
    EscalationReason NVARCHAR(1000) NULL,
    ProposedBy VARCHAR(50) NOT NULL,
    ProposedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CoordinatorDecisionBy VARCHAR(50) NULL,
    CoordinatorDecisionAt DATETIME2 NULL,
    CoordinatorDecisionReason NVARCHAR(2000) NULL,
    ManagerDecisionBy VARCHAR(50) NULL,
    ManagerDecisionAt DATETIME2 NULL,
    ManagerDecisionReason NVARCHAR(2000) NULL,
    Version INT NOT NULL DEFAULT 1,
    CONSTRAINT PK_EtaProposal PRIMARY KEY (ProposalID),
    CONSTRAINT FK_EtaProposal_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_EtaProposal_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID),
    CONSTRAINT FK_EtaProposal_ProposedBy FOREIGN KEY (ProposedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_EtaProposal_CoordDecisionBy FOREIGN KEY (CoordinatorDecisionBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_EtaProposal_ManagerDecisionBy FOREIGN KEY (ManagerDecisionBy) REFERENCES [USER](UserID)
);
GO

-- 4. BẢNG VET_ASSESSMENT: KẾT LUẬN ĐÁNH GIÁ THỂ TRẠNG BÁC SĨ THÚ Y
-- Cấu hình Entity: VetAssessmentConfiguration.cs
CREATE TABLE VET_ASSESSMENT (
    AssessmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    VetID VARCHAR(50) NOT NULL,
    HealthLogID VARCHAR(50) NULL,
    TransportFitness VARCHAR(20) NOT NULL DEFAULT 'FIT', -- FIT, NOT_FIT, NEEDS_REVIEW
    Conclusion NVARCHAR(MAX) NOT NULL,
    CareInstructions NVARCHAR(MAX) NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,
    IncidentID VARCHAR(50) NULL,
    AssessedAt DATETIME2 NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_VetAssessment PRIMARY KEY (AssessmentID),
    CONSTRAINT FK_VetAssessment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_VetAssessment_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_VetAssessment_Vet FOREIGN KEY (VetID) REFERENCES [USER](UserID),
    CONSTRAINT FK_VetAssessment_HealthLog FOREIGN KEY (HealthLogID) REFERENCES HEALTH_LOG(LogID)
);
GO

-- 5. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG CỦA TỔ XE (NỘI BỘ)
-- Cấu hình Entity: TripExpenseConfiguration.cs
CREATE TABLE TRIP_EXPENSE (
    ExpenseID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RecordedBy VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    Category VARCHAR(50) NOT NULL,                   -- TOLL, FUEL, HORSE_CARE, REPAIR, OTHER
    AmountVnd DECIMAL(14, 2) NOT NULL,
    OccurredAt DATETIME2 NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    ReceiptPhotoUrl NVARCHAR(500) NULL,
    ReceiptFileIds NVARCHAR(MAX) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'RECORDED',  -- RECORDED
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_TripExpense PRIMARY KEY (ExpenseID),
    CONSTRAINT FK_TripExpense_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripExpense_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_TripExpense_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID)
);
GO

-- 6. BẢNG AIR_NOTICE: THÔNG BÁO LỊCH BAY TỪ HÃNG HÀNG KHÔNG
-- Cấu hình Entity: AirNoticeConfiguration.cs
CREATE TABLE AIR_NOTICE (
    NoticeID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    BookingID VARCHAR(50) NULL,
    NoticeKind VARCHAR(50) NOT NULL,                 -- ESTIMATED_SCHEDULE, ACTUAL_DEPARTURE, ACTUAL_ARRIVAL
    DepartureAt DATETIME2 NULL,
    ArrivalAt DATETIME2 NULL,
    ReceivedAt DATETIME2 NOT NULL,
    SourceReference NVARCHAR(255) NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,
    IncidentID VARCHAR(50) NULL,
    RequiresPlanChange BIT NOT NULL DEFAULT 0,
    MilestoneApplied BIT NOT NULL DEFAULT 0,
    RecordedBy VARCHAR(50) NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_AirNotice PRIMARY KEY (NoticeID),
    CONSTRAINT FK_AirNotice_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_AirNotice_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- 7. BẢNG LEGAL_CHECKPOINT_DECISION: KẾT QUẢ KIỂM TRA PHÁP LÝ TẠI TRẠM KIỂM SOÁT
-- Cấu hình Entity: CheckpointDecisionConfiguration.cs
CREATE TABLE LEGAL_CHECKPOINT_DECISION (
    DecisionID VARCHAR(50) NOT NULL,
    CheckpointID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    TripID VARCHAR(50) NOT NULL,
    SpecialistID VARCHAR(50) NOT NULL,
    Decision VARCHAR(30) NOT NULL,                   -- CLEARED, HELD, SUPPLEMENT_REQUIRED
    OccurredAt DATETIME2 NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    EvidenceFileIds NVARCHAR(MAX) NOT NULL,          -- Bắt buộc có bằng chứng biên bản kiểm tra
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    Version INT NOT NULL DEFAULT 1,
    CONSTRAINT PK_CheckpointDecision PRIMARY KEY (DecisionID),
    CONSTRAINT FK_CheckpointDecision_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_CheckpointDecision_Specialist FOREIGN KEY (SpecialistID) REFERENCES [USER](UserID),
    CONSTRAINT FK_CheckpointDecision_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID)
);
GO

-- 8. BẢNG EXECUTION_ALERT: CẢNH BÁO TRỄ MỐC VÀ ĐẾN HẠN KIỂM TRA Y TẾ
-- Cấu hình Entity: ExecutionAlertConfiguration.cs
CREATE TABLE EXECUTION_ALERT (
    AlertID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    AlertKind VARCHAR(50) NOT NULL,                  -- MILESTONE_OVERDUE, HEALTH_CHECK_DUE, ETA_CHANGE
    Status VARCHAR(20) NOT NULL DEFAULT 'OPEN',       -- OPEN, ACKNOWLEDGED, RESOLVED
    Message NVARCHAR(1000) NOT NULL,
    AssigneeUserIds NVARCHAR(500) NULL,
    AcknowledgedBy VARCHAR(50) NULL,
    AcknowledgedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_ExecutionAlert PRIMARY KEY (AlertID),
    CONSTRAINT FK_ExecutionAlert_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ExecutionAlert_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID),
    CONSTRAINT FK_ExecutionAlert_User FOREIGN KEY (AcknowledgedBy) REFERENCES [USER](UserID)
);
GO

-- 9. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ KHẨN CẤP NGOÀI LUỒNG
-- Cấu hình Entity: ExecutionContactLogConfiguration.cs
CREATE TABLE EXECUTION_CONTACT_LOG (
    ContactLogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    ContactedUserID VARCHAR(50) NOT NULL,
    RecordedBy VARCHAR(50) NOT NULL,
    ContactedAt DATETIME2 NOT NULL,
    Channel VARCHAR(30) NOT NULL DEFAULT 'PHONE',    -- PHONE, IN_PERSON, OTHER
    Result NVARCHAR(2000) NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_ContactLog PRIMARY KEY (ContactLogID),
    CONSTRAINT FK_ContactLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ContactLog_ContactedUser FOREIGN KEY (ContactedUserID) REFERENCES [USER](UserID),
    CONSTRAINT FK_ContactLog_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- 10. BẢNG EXECUTION_ATTACHMENT: QUẢN LÝ METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
-- Cấu hình Entity: ExecutionAttachmentConfiguration.cs
CREATE TABLE EXECUTION_ATTACHMENT (
    FileID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NULL,
    FileName NVARCHAR(255) NOT NULL,
    ContentType VARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL,
    Purpose VARCHAR(30) NOT NULL,                    -- MILESTONE, AIR, CHECKPOINT, HEALTH, EXPENSE
    StoragePath NVARCHAR(500) NOT NULL,
    UploadedBy VARCHAR(50) NOT NULL,
    UploadedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_ExecutionAttachment PRIMARY KEY (FileID),
    CONSTRAINT FK_ExecutionAttachment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ExecutionAttachment_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_ExecutionAttachment_User FOREIGN KEY (UploadedBy) REFERENCES [USER](UserID)
);
GO

-- =============================================================================
-- BƯỚC 5: KHỞI TẠO BỘ DỮ LIỆU SEED MẪU TOÀN DIỆN CHO FLOW 4 (FULL DATASET)
-- Phục vụ kiểm thử 37 API Swagger: Happy Path đường bộ, Đa phương thức Air Leg,
-- Bác sĩ thú y, Trạm kiểm soát, Điều phối viên, Quản lý và Khách hàng.
-- =============================================================================

-- 5.1. CẬP NHẬT XE CHUYÊN DỤNG (VEHICLE)
UPDATE VEHICLE 
SET PlateNumber = '29C-123.45', OperatingCountry = 'VN', Height_m = 3.60, Width_m = 2.45, Length_m = 9.80, Gross_Weight_Tons = 12.50, Axle_Weight_Tons = 7.00, Status = 'AVAILABLE'
WHERE VehicleID = 'VEHICLE_001';

UPDATE VEHICLE 
SET PlateNumber = '29C-888.99', OperatingCountry = 'VN', Height_m = 3.80, Width_m = 2.50, Length_m = 12.00, Gross_Weight_Tons = 18.00, Axle_Weight_Tons = 9.50, Status = 'AVAILABLE'
WHERE VehicleID = 'VEHICLE_002';

UPDATE VEHICLE 
SET PlateNumber = '29C-555.66', OperatingCountry = 'VN', Height_m = 3.20, Width_m = 2.20, Length_m = 7.50, Gross_Weight_Tons = 7.50, Axle_Weight_Tons = 4.50, Status = 'MAINTENANCE'
WHERE VehicleID = 'VEHICLE_003';
GO

-- 5.2. ĐỒNG BỘ ĐƠN HÀNG VÀ CHUYẾN ĐI (TRIP_PLAN & TRANSPORT_REQUEST)
-- Chuyến 1: TRIP_003 (Đường bộ Happy Path - Tài xế USER_015, Áp tải USER_018, Xe VEHICLE_002)
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_003')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'READY_TO_DEPART',
        ExecutionVersion = 1,
        ExecutionPhase = 'AWAITING_DEPARTURE',
        CurrentEta = '2026-11-15 18:00:00',
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        RouteStatus = 'APPROVED',
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1,
        EarliestDepartureDate = '2026-11-12 07:00:00',
        DocumentExpiryDate = '2027-05-10 00:00:00',
        ApprovedPlanJson = N'{"transportMode":"ROAD","legs":[{"leg":"road","origin":"Trang trại Sóc Sơn, Hà Nội","destination":"Trại ngựa Phú Thọ, TP.HCM"}]}'
    WHERE TripID = 'TRIP_003';

    UPDATE TRANSPORT_REQUEST
    SET Status = 'SCHEDULED',
        DeclaredValueVnd = 145000000.00
    WHERE RequestID = 'REQUEST_003';
END

-- REQUEST_001 is the end-to-end walkthrough's Flow 3 handoff point.
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_001')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'PLANNING',
        ExecutionVersion = 1,
        ExecutionPhase = 'AWAITING_DEPARTURE',
        CurrentEta = '2026-11-17 12:00:00',
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        RouteStatus = 'APPROVED',
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1,
        EarliestDepartureDate = '2026-11-15 06:00:00',
        DocumentExpiryDate = '2026-12-01 00:00:00',
        PendingEtaProposalId = NULL,
        ApprovedPlanJson = N'{"transportMode":"AIR","legs":[{"leg":"road_outbound"},{"leg":"air","airline":"Nippon Cargo Airlines"},{"leg":"road_inbound"}]}'
    WHERE TripID = 'TRIP_001';

    UPDATE TRANSPORT_REQUEST
    SET Status = 'ACTIVATED',
        DeclaredValueVnd = 350000000.00
    WHERE RequestID = 'REQUEST_001';
END

-- REQUEST_002 starts Flow 6 after actual arrival; REQUEST_003 is the standalone Flow 4 start.
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_002')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'IN_TRANSIT',
        ExecutionVersion = 2,
        ExecutionPhase = 'IN_PROGRESS',
        CurrentEta = '2026-10-06 18:30:00',
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        RouteStatus = 'APPROVED',
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1,
        EarliestDepartureDate = '2026-10-01 07:00:00',
        DocumentExpiryDate = '2027-01-15 00:00:00',
        ApprovedPlanJson = N'{"transportMode":"ROAD"}'
    WHERE TripID = 'TRIP_002';

    UPDATE TRANSPORT_REQUEST
    SET Status = 'IN_PROGRESS',
        DeclaredValueVnd = 80000000.00
    WHERE RequestID = 'REQUEST_002';
END
GO

-- 5.3. BẢNG TRIP_MILESTONE: MỐC HÀNH TRÌNH TUẦN TỰ
DELETE FROM TRIP_MILESTONE WHERE TripID IN ('TRIP_003', 'TRIP_001', 'TRIP_002');

-- Mốc cho TRIP_003 (Đường bộ toàn trình - Sẵn sàng test xuất phát từ F4-J04 -> F4-J05 -> F4-J06)
INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Note, RequiresHealthCheck, Revision)
VALUES 
('MILESTONE_001', 'TRIP_003', 'road', 'DEPARTED',      1, N'Xuất phát từ trang trại Sóc Sơn',               'PENDING', '2026-10-08 08:30:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_002', 'TRIP_003', 'road', 'STOP_ARRIVED',  2, N'Đến trạm dừng Đà Nẵng (Kiểm tra y tế)',       'PENDING', '2026-10-09 11:00:00', NULL, NULL, NULL, NULL, 1, 1),
('MILESTONE_003', 'TRIP_003', 'road', 'STOP_DEPARTED', 3, N'Rời trạm dừng Đà Nẵng',                       'PENDING', '2026-10-09 12:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_004', 'TRIP_003', 'road', 'FINAL_ARRIVED', 4, N'Đến điểm giao CLB Ngựa Sài Gòn (Đích đến)', 'PENDING', '2026-10-10 18:00:00', NULL, NULL, NULL, NULL, 0, 1);

-- Mốc cho TRIP_001 (Đa phương thức hàng không - Kiểm thử Air Leg, Checkpoint, Đính chính)
INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Note, RequiresHealthCheck, Revision)
VALUES 
('MILESTONE_010', 'TRIP_001', 'road',    'DEPARTED',               1, N'Khởi hành từ trại ngựa Hà Nội',               'PENDING', '2026-11-15 07:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_011', 'TRIP_001', 'road',    'AIRPORT_ORIGIN_ARRIVED', 2, N'Đến ga hàng hóa Nội Bài Cargo Terminal',     'PENDING', '2026-11-15 14:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_012', 'TRIP_001', 'air',     'AIR_HANDOVER',           3, N'Bàn giao ngựa cho hãng bay NCA Airlines',     'PENDING', '2026-11-15 16:30:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_013', 'TRIP_001', 'air',     'AIR_DEPARTED',           4, N'Chuyến bay chở ngựa KZ-102 cất cánh',         'PENDING', '2026-11-16 05:30:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_014', 'TRIP_001', 'air',     'AIR_ARRIVED',            5, N'Hạ cánh sân bay Narita (Tokyo, Nhật Bản)',     'PENDING', '2026-11-16 12:30:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_015', 'TRIP_001', 'road',    'AIR_RECEIVED',           6, N'Tiếp nhận ngựa tại Cargo Terminal Narita',     'PENDING', '2026-11-16 14:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_016', 'TRIP_001', 'road',    'FINAL_ARRIVED',          7, N'Đến trung tâm tiếp nhận ngựa Narita',          'PENDING', '2026-11-17 12:00:00', NULL, NULL, NULL, NULL, 0, 1);

-- Mốc cho TRIP_002 (Đường bộ phụ cho USER_008)
INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Note, RequiresHealthCheck, Revision)
VALUES 
('MILESTONE_020', 'TRIP_002', 'road', 'DEPARTED',      1, N'Xuất phát từ trang trại Củ Chi',   'COMPLETED', '2026-11-05 07:00:00', '2026-11-05 07:00:00', '2026-11-05 07:05:00', 'USER_008', N'Đã xuất phát đúng lịch trình.', 0, 1),
('MILESTONE_021', 'TRIP_002', 'road', 'FINAL_ARRIVED', 2, N'Đến trung tâm tiếp nhận Đà Nẵng', 'COMPLETED', '2026-11-06 10:00:00', '2026-11-06 10:00:00', '2026-11-06 10:05:00', 'USER_008', N'Đã đến nơi; chờ bắt đầu bàn giao Flow 6.', 0, 1);
GO

-- 5.4. BẢNG MILESTONE_CORRECTION_REQUEST: YÊU CẦU ĐÍNH CHÍNH MỐC
DELETE FROM MILESTONE_CORRECTION_REQUEST;
INSERT INTO MILESTONE_CORRECTION_REQUEST (CorrectionID, MilestoneID, TripID, RequestedBy, OriginalOccurredAt, ProposedOccurredAt, OriginalNote, ProposedNote, Reason, Status, DecidedBy, DecidedAt, DecisionReason, RequestedAt)
VALUES 
('CORRECTION_001', 'MILESTONE_010', 'TRIP_001', 'USER_007', '2026-09-15 07:00:00', '2026-09-15 07:15:00', N'Khởi hành đúng giờ', N'Khởi hành lúc 07:15 do kiểm tra lại chốt cửa', N'Bấm nhầm nút xuất phát trước khi xe thực sự lăn bánh', 'APPROVED', 'USER_006', '2026-09-15 08:00:00', N'Đã đối chiếu GPS, chấp thuận đính chính', '2026-09-15 07:30:00');
GO

-- 5.5. BẢNG ETA_PROPOSAL: ĐỀ XUẤT ĐIỀU CHỈNH ETA (2 CẤP)
DELETE FROM ETA_PROPOSAL;
INSERT INTO ETA_PROPOSAL (ProposalID, TripID, ProposedBy, ProposedEta, CurrentEtaSnapshot, Reason, RequiresManager, Status, CoordinatorDecisionBy, CoordinatorDecisionReason, CoordinatorDecisionAt, ProposedAt)
VALUES 
('PROPOSAL_001', 'TRIP_001', 'USER_007', '2026-09-17 12:00:00', '2026-09-16 18:00:00', N'Chuyến bay KZ-102 bị lùi giờ cất cánh do thời tiết xấu', 0, 'APPROVED', 'USER_006', N'Đã đối chiếu lịch bay hãng NCA, trong hạn hợp đồng', '2026-09-15 18:00:00', '2026-09-15 17:30:00'),
('PROPOSAL_002', 'TRIP_003', 'USER_015', '2026-10-11 10:00:00', '2026-10-10 18:00:00', N'Mưa lớn gây sạt lở đèo Hải Vân phải đi vòng đường tránh', 1, 'PENDING_COORDINATOR', NULL, NULL, NULL, '2026-10-09 14:00:00');
GO

-- 5.6. BẢNG VET_ASSESSMENT: KẾT LUẬN THỂ TRẠNG BÁC SĨ THÚ Y
DELETE FROM VET_ASSESSMENT;
INSERT INTO VET_ASSESSMENT (AssessmentID, TripID, HorseID, VetID, TransportFitness, Conclusion, CareInstructions, AssessedAt)
VALUES 
('ASSESSMENT_001', 'TRIP_003', 'HORSE_001', 'USER_018', 'FIT', N'Thể trạng ngựa khỏe mạnh, nhịp tim 38 bpm, hô hấp 14 l/p, mắt linh hoạt, niêm mạc hồng hào', N'Bổ sung nước điện giải mỗi 4 tiếng trên xe', '2026-11-12 07:45:00'),
('ASSESSMENT_002', 'TRIP_001', 'HORSE_001', 'USER_009', 'FIT', N'Thể trạng hoàn toàn đáp ứng điều kiện bay quốc tế chuẩn IATA Live Animals Regulations', N'Cho uống nước trước giờ bay 2 tiếng', '2026-09-15 15:00:00');
GO

-- 5.7. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG
DELETE FROM TRIP_EXPENSE;
INSERT INTO TRIP_EXPENSE (ExpenseID, TripID, RecordedBy, Category, AmountVnd, OccurredAt, Reason, Status, RecordedAt)
VALUES 
('EXPENSE_001', 'TRIP_002', 'USER_008', 'FUEL',           14200000.00, '2026-11-05 12:00:00', N'Nhiên liệu toàn tuyến Củ Chi - Đà Nẵng', 'APPROVED', '2026-11-05 12:05:00'),
('EXPENSE_002', 'TRIP_002', 'USER_008', 'TOLL_FEE',        3200000.00, '2026-11-05 18:00:00', N'Phí cầu đường BOT quốc lộ 1A', 'APPROVED', '2026-11-05 18:05:00'),
('EXPENSE_003', 'TRIP_002', 'USER_010', 'OTHER',           8000000.00, '2026-11-06 12:00:00', N'Công tác phí tài xế và nhân viên áp tải ngựa', 'APPROVED', '2026-11-06 12:05:00'),
('EXPENSE_004', 'TRIP_002', 'USER_010', 'EMERGENCY_CARE',  3750000.00, '2026-11-06 14:00:00', N'Thuốc hạ sốt và dịch truyền cấp cứu ngựa', 'APPROVED', '2026-11-06 14:05:00'),
('EXPENSE_005', 'TRIP_002', 'USER_008', 'FEED_SUPPLIES',   4000000.00, '2026-11-06 18:00:00', N'Cỏ khô, nước điện giải và lưu chuồng trạm Đà Nẵng', 'APPROVED', '2026-11-06 18:05:00'),
('EXPENSE_006', 'TRIP_002', 'USER_004', 'OTHER',          40000000.00, '2026-11-06 19:00:00', N'Chi phí khấu hao phương tiện xe chuyên dụng và bảo dưỡng', 'APPROVED', '2026-11-06 19:05:00'),
('EXPENSE_007', 'TRIP_002', 'USER_004', 'OTHER',           2500000.00, '2026-11-06 19:00:00', N'Phí bảo hiểm vận chuyển hàng hóa trách nhiệm cao', 'APPROVED', '2026-11-06 19:05:00'),
('EXPENSE_008', 'TRIP_001', 'USER_007', 'OTHER',           1200000.00, '2026-09-15 15:30:00', N'Phí khử trùng xe và khu lưu chuồng ga hàng không Nội Bài', 'RECORDED', '2026-09-15 15:35:00');
GO

-- 5.8. BẢNG AIR_NOTICE: THÔNG BÁO LỊCH BAY TỪ HÃNG HÀNG KHÔNG
DELETE FROM AIR_NOTICE;
INSERT INTO AIR_NOTICE (NoticeID, TripID, BookingID, NoticeKind, DepartureAt, ArrivalAt, ReceivedAt, SourceReference, Reason, RecordedBy, RecordedAt)
VALUES 
('AIR_NOTICE_001', 'TRIP_001', '300', 'ESTIMATED_SCHEDULE', '2026-09-16 05:30:00', '2026-09-16 12:30:00', '2026-09-15 17:00:00', N'NCA-NOTAM-KZ102-REV1', N'Lùi lịch bay 30 phút do kiểm tra kỹ thuật máy bay chở hàng', 'USER_006', '2026-09-15 17:05:00');
GO

-- 5.9. BẢNG LEGAL_CHECKPOINT_DECISION: KẾT QUẢ KIỂM TRA PHÁP LÝ TẠI TRẠM KIỂM SOÁT
DELETE FROM LEGAL_CHECKPOINT_DECISION;
INSERT INTO LEGAL_CHECKPOINT_DECISION (DecisionID, CheckpointID, MilestoneID, TripID, SpecialistID, Decision, OccurredAt, Reason, EvidenceFileIds, RecordedAt, Version)
VALUES 
('DECISION_001', 'CP_NOI_BAI_01', 'MILESTONE_011', 'TRIP_001', 'USER_005', 'CLEARED', '2026-09-15 15:00:00', N'Hồ sơ Coggins test và chứng nhận kiểm dịch xuất cảnh hợp lệ, số vi chip trùng khớp', N'["ATTACHMENT_001"]', '2026-09-15 15:10:00', 1);
GO

-- 5.10. BẢNG EXECUTION_ALERT: CẢNH BÁO HÀNH TRÌNH
DELETE FROM EXECUTION_ALERT;
INSERT INTO EXECUTION_ALERT (AlertID, TripID, MilestoneID, AlertKind, Status, Message, AssigneeUserIds, CreatedAt)
VALUES 
('ALERT_001', 'TRIP_003', 'MILESTONE_002', 'HEALTH_CHECK_DUE', 'OPEN', N'Đến hạn kiểm tra y tế và đo sinh hiệu ngựa tại trạm dừng Đà Nẵng', N'["USER_015","USER_018"]', '2026-10-09 10:30:00'),
('ALERT_002', 'TRIP_001', 'MILESTONE_014', 'ETA_CHANGE',       'RESOLVED', N'Lịch bay KZ-102 đã được cập nhật, ETA mới: 2026-09-17 12:00', N'["USER_006"]', '2026-09-15 17:30:00');
GO

-- 5.11. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ NGOÀI LUỒNG
DELETE FROM EXECUTION_CONTACT_LOG;
INSERT INTO EXECUTION_CONTACT_LOG (ContactLogID, TripID, ContactedUserID, RecordedBy, ContactedAt, Channel, Result, RecordedAt)
VALUES 
('CONTACT_LOG_001', 'TRIP_003', 'USER_015', 'USER_006', '2026-10-08 19:00:00', 'PHONE', N'Tài xế thông báo xe đang dừng nghỉ ngơi đúng lịch trình, ngựa khỏe mạnh, kết nối 4G ổn định', '2026-10-08 19:05:00');
GO

-- 5.12. BẢNG EXECUTION_ATTACHMENT: METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
DELETE FROM EXECUTION_ATTACHMENT;
INSERT INTO EXECUTION_ATTACHMENT (FileID, TripID, HorseID, FileName, ContentType, FileSize, Purpose, StoragePath, UploadedBy, UploadedAtUtc)
VALUES 
('ATTACHMENT_001', 'TRIP_001', 'HORSE_001', N'bien_ban_kiem_dich_noi_bai.pdf', 'application/pdf', 1048576, 'CHECKPOINT', N'/storage/flow4/trips/TRIP_001/bien_ban_kiem_dich_noi_bai.pdf', 'USER_005', '2026-09-15 15:05:00'),
('ATTACHMENT_002', 'TRIP_003', 'HORSE_001', N'anh_ngua_kham_khoi_hanh.jpg',     'image/jpeg',      2097152, 'HEALTH',     N'/storage/flow4/trips/TRIP_003/anh_ngua_kham_khoi_hanh.jpg',     'USER_018', '2026-10-08 07:50:00');
GO

-- 5.13. BỔ SUNG NHẬT KÝ SỨC KHỎE SINH HIỆU LÂM SÀNG (HEALTH_LOG)
IF NOT EXISTS (SELECT 1 FROM HEALTH_LOG WHERE LogID = 'LOG_005')
BEGIN
    INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, Condition, RespiratoryRatePerMin, Feeding, Water, RestStatus, CareNotes, LegType, RecordedAt)
    VALUES 
    ('LOG_005', 'TRIP_003', 'HORSE_001', 'USER_018', 'OBSERVATION', '2026-10-08 07:30:00', 38.0, 38, N'Tốt', N'Khám sức khỏe tổng quát trước giờ xuất phát', 'NORMAL', 14, N'Ăn cỏ khô bình thường', N'Uống 15L nước', N'Nghỉ ngơi tốt', N'Ngựa sẵn sàng lên đường', 'road', '2026-10-08 07:35:00');
END
GO

-- Normalize operational fixtures to the three customer demo entry points.
DELETE FROM MILESTONE_CORRECTION_REQUEST WHERE TripID IN ('TRIP_001','TRIP_003');
DELETE FROM ETA_PROPOSAL WHERE TripID IN ('TRIP_001','TRIP_003');
DELETE FROM LEGAL_CHECKPOINT_DECISION WHERE TripID='TRIP_001';
DELETE FROM EXECUTION_ALERT WHERE TripID IN ('TRIP_001','TRIP_003');
DELETE FROM EXECUTION_CONTACT_LOG WHERE TripID IN ('TRIP_001','TRIP_003');
DELETE FROM TRIP_EXPENSE WHERE TripID IN ('TRIP_001','TRIP_003');
DELETE FROM VET_ASSESSMENT WHERE TripID='TRIP_001';
DELETE FROM HEALTH_LOG WHERE TripID='TRIP_001';
DELETE FROM AIR_NOTICE WHERE TripID='TRIP_001';
DELETE FROM EXECUTION_ATTACHMENT WHERE TripID='TRIP_001';

UPDATE TRIP_PLAN SET Status='PLANNING', ExecutionVersion=1, ExecutionPhase='AWAITING_DEPARTURE', PendingEtaProposalId=NULL,
    ResourcesConfirmedAt='2026-11-04T15:00:00',ResourcesConfirmedBy='USER_006',DocumentsConfirmedAt='2026-11-04T15:00:00',DocumentsConfirmedBy='USER_005',
    DocsReadyAtUtc='2026-11-04T15:00:00',DocsReadyBy='USER_005',RouteApprovedAt='2026-11-04T14:00:00',RouteApprovedBy='USER_004',DepartureApprovedAt=NULL,DepartureApprovedBy=NULL
    WHERE TripID='TRIP_001';
UPDATE TRIP_PLAN SET Status='COMPLETED', ExecutionVersion=2, ExecutionPhase='COMPLETED',DepartureApprovedAt='2026-11-05T06:45:00',DepartureApprovedBy='USER_004' WHERE TripID='TRIP_002';
UPDATE TRIP_PLAN SET Status='READY_TO_DEPART', ExecutionVersion=1, ExecutionPhase='AWAITING_DEPARTURE',
    ResourcesConfirmedAt='2026-11-04T15:00:00',ResourcesConfirmedBy='USER_006',DocumentsConfirmedAt='2026-11-04T15:00:00',DocumentsConfirmedBy='USER_005',
    DocsReadyAtUtc='2026-11-04T15:00:00',DocsReadyBy='USER_005',RouteApprovedAt='2026-11-04T14:00:00',RouteApprovedBy='USER_004',DepartureApprovedAt='2026-11-12T08:00:00',DepartureApprovedBy='USER_004'
    WHERE TripID='TRIP_003';
UPDATE TRANSPORT_REQUEST SET Status='ACTIVATED' WHERE RequestID='REQUEST_001';
UPDATE TRANSPORT_REQUEST SET Status='DELIVERED' WHERE RequestID='REQUEST_002';
UPDATE TRANSPORT_REQUEST SET Status='SCHEDULED' WHERE RequestID='REQUEST_003';

UPDATE ROUTE_SEGMENT SET Status='PLANNED',ActualTime=NULL WHERE TripID IN ('TRIP_001','TRIP_003');
UPDATE CUSTOMS_CLEARANCE SET Status='PENDING',ClearedAt=NULL WHERE TripID='TRIP_001';
UPDATE TRIP_MILESTONE SET Status='PENDING',OccurredAt=NULL,RecordedAt=NULL,RecordedBy=NULL,Note=NULL WHERE TripID='TRIP_001';
UPDATE TRIP_MILESTONE SET PlannedTime='2026-11-12 08:30:00' WHERE MilestoneID='MILESTONE_001';
UPDATE TRIP_MILESTONE SET PlannedTime='2026-11-13 11:00:00' WHERE MilestoneID='MILESTONE_002';
UPDATE TRIP_MILESTONE SET PlannedTime='2026-11-13 12:00:00' WHERE MilestoneID='MILESTONE_003';
UPDATE TRIP_MILESTONE SET PlannedTime='2026-11-15 18:00:00' WHERE MilestoneID='MILESTONE_004';
UPDATE TRIP_MILESTONE SET PlannedTime='2026-11-06 18:30:00',OccurredAt='2026-11-06 18:30:00',RecordedAt='2026-11-06 18:35:00' WHERE MilestoneID='MILESTONE_021';
UPDATE HEALTH_LOG SET LogTime='2026-11-12 07:30:00',RecordedAt='2026-11-12 07:35:00' WHERE LogID='LOG_005';
UPDATE EXECUTION_ATTACHMENT SET UploadedAtUtc='2026-11-12 07:50:00' WHERE FileID='ATTACHMENT_002';
GO
