-- Legacy DDL only; derived from tracked HorseTransportDB/HorseTransportDB.sql.
-- Empty databases only. No database reset and no seed data.
SET XACT_ABORT ON;

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

CREATE TABLE HORSE (
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
    CONSTRAINT PK_Horse PRIMARY KEY (HorseID),
    CONSTRAINT FK_Horse_Owner FOREIGN KEY (OwnerID) REFERENCES [USER](UserID)
);

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

CREATE TABLE TRANSPORT_REQUEST (
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
    CONSTRAINT PK_TransportRequest PRIMARY KEY (RequestID),
    CONSTRAINT FK_TransportRequest_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID)
);

CREATE TABLE REQUEST_HORSE_MAPPING (
    RequestHorseID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_RequestHorseMapping PRIMARY KEY (RequestHorseID),
    CONSTRAINT FK_RHM_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_RHM_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);

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

CREATE TABLE TRIP_PLAN (
    TripID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    TotalDistance_km DECIMAL(10, 2) NULL,
    T_Total_Hours DECIMAL(10, 2) NULL,
    TotalCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL,
    CONSTRAINT PK_TripPlan PRIMARY KEY (TripID),
    CONSTRAINT FK_TripPlan_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID)
);

CREATE TABLE VEHICLE (
    VehicleID VARCHAR(50) NOT NULL,
    Type VARCHAR(50) NULL,
    CapacityStalls INT NULL,
    MaxRange_km DECIMAL(10, 2) NULL,
    FuelCost_Per_Km DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_Vehicle PRIMARY KEY (VehicleID)
);

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

CREATE TABLE CONTRACT_TEMPLATE (
    TemplateID VARCHAR(50) NOT NULL,
    TemplateName NVARCHAR(255) NOT NULL,
    LanguageCode VARCHAR(10) NOT NULL DEFAULT 'VI',
    BodyContent NVARCHAR(MAX) NOT NULL,
    Version VARCHAR(20) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_ContractTemplate PRIMARY KEY (TemplateID)
);

CREATE TABLE CONTRACT (
    ContractID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    ContractCode VARCHAR(50) NOT NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'USD',
    ExchangeRateToLocal DECIMAL(10, 4) NULL,
    TotalQuotedPrice DECIMAL(12, 2) NULL,
    BaseContractPrice_P DECIMAL(12, 2) NULL,
    DepositRateStandard DECIMAL(5, 2) NULL,
    ActualGrossProfit_AGP DECIMAL(12, 2) NULL,
    SignedAt DATETIME NULL,
    ContractStatus VARCHAR(50) NOT NULL,
    CONSTRAINT PK_Contract PRIMARY KEY (ContractID),
    CONSTRAINT FK_Contract_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Contract_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID)
);

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
    CONSTRAINT PK_Payment PRIMARY KEY (PaymentID),
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY (InvoiceID) REFERENCES INVOICE(InvoiceID),
    CONSTRAINT FK_Payment_ConfirmedBy FOREIGN KEY (ConfirmedByUserID) REFERENCES [USER](UserID)
);
