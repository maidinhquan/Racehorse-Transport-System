-- =============================================================================
-- MODULE 04: FLOW 3 - LẬP KẾ HOẠCH VẬN TẢI & ĐIỀU PHỐI (COORDINATOR)
-- Phân vùng: Kế hoạch chuyến đi, phân công xe & nhân sự, lộ trình, chuyến bay & hải quan
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng TRIP_PLAN: Kế hoạch chuyến đi cốt lõi (Chuẩn hóa trạng thái bàn giao & Two-Party Ready)
CREATE TABLE TRIP_PLAN (
    TripID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    TotalDistance_km DECIMAL(10, 2) NULL,
    T_Total_Hours DECIMAL(10, 2) NULL,
    TotalCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL, -- PLANNING, READY_TO_DEPART, IN_TRANSIT, COMPLETED, PENDING_APPROVAL, RETURNED
    
    -- Quản lý Phiên bản & Khóa lạc quan (Flow 3 v2 Optimistic Concurrency & Binding)
    [Version] INT NOT NULL DEFAULT 1,
    PlanVersion INT NOT NULL DEFAULT 1,
    ContextVersion INT NOT NULL DEFAULT 1,
    ReadinessVersion INT NOT NULL DEFAULT 1,
    DraftPlanJson NVARCHAR(MAX) NULL,
    ApprovedPlanJson NVARCHAR(MAX) NULL,
    OpenChange BIT NOT NULL DEFAULT 0,
    EffectiveOriginPlaceId VARCHAR(50) NULL,

    -- Bàn giao triển khai từ Flow 1 (Deployment Handoff)
    DeploymentStatus VARCHAR(12) NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED
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
    
    CONSTRAINT PK_TripPlan PRIMARY KEY (TripID),
    CONSTRAINT FK_TripPlan_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_TripPlan_Specialist FOREIGN KEY (AssignedSpecialistId) REFERENCES [USER](UserID),
    CONSTRAINT FK_TripPlan_Coordinator FOREIGN KEY (AssignedCoordinatorId) REFERENCES [USER](UserID),
    CONSTRAINT FK_TripPlan_OriginPlace FOREIGN KEY (EffectiveOriginPlaceId) REFERENCES PARTNER_FACILITY(FacilityID),
    CONSTRAINT CK_TRIP_PLAN_OperationsStatus CHECK (OperationsStatus IN ('NOT_READY', 'READY')),
    CONSTRAINT CK_TRIP_PLAN_DocumentsStatus CHECK (DocumentsStatus IN ('NOT_READY', 'READY')),
    CONSTRAINT CK_TRIP_PLAN_RouteStatus CHECK (RouteStatus IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED')),
    CONSTRAINT CK_F1S_TRIP_PLAN_Deployment CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus]='CONFIRMED' OR [DeploymentStatus]='PENDING') AND [DeploymentReason] IS NOT NULL AND [DeploymentBy] IS NOT NULL AND [DeploymentAtUtc] IS NOT NULL AND ([DeploymentStatus]='CONFIRMED' AND [HandoffEventId] IS NOT NULL OR ([DeploymentStatus]='PENDING') AND [HandoffEventId] IS NULL))
);
GO

-- 2. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái theo từng chặng độc lập
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
GO

-- 3. Bảng ROUTE_SEGMENT: Chặng đường, điểm dừng nghỉ & Vận tải đa phương thức
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
GO

-- 4. Bảng FLIGHT_BOOKING: Quản lý đặt vé & dịch vụ bay chuyên chở ngựa (Air Leg)
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
GO

-- 5. Bảng CUSTOMS_CLEARANCE: Quản lý thủ tục thông quan biên giới
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
GO

-- =============================================================================
-- CÁC BẢNG BỔ SUNG CHO FLOW 3 PHIÊN BẢN 2.0.0 (API CONTRACT 27/10/2026)
-- =============================================================================

-- 6. Bảng AIR_PARTNER: Quản lý danh mục đối tác dịch vụ vận tải hàng không (F3-J34..J38)
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
GO

-- 7. Bảng FLIGHT_CATALOG: Danh mục lịch chuyến bay đối tác cung cấp (F3-J05, J50, J54)
CREATE TABLE FLIGHT_CATALOG (
    ServiceID VARCHAR(50) NOT NULL,
    PartnerID VARCHAR(50) NOT NULL,
    ProviderFlightCode VARCHAR(50) NOT NULL,
    Airline NVARCHAR(100) NOT NULL,
    OriginAirportPlaceId VARCHAR(50) NOT NULL,
    DestAirportPlaceId VARCHAR(50) NOT NULL,
    DepartureTime VARCHAR(5) NOT NULL, -- HH:mm (vd: 05:00)
    ArrivalTime VARCHAR(5) NOT NULL,   -- HH:mm (vd: 11:00)
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
GO

-- 8. Bảng PICKUP_RELOCATION: Quy trình đổi điểm nhận khi xe lớn không vào được (F3-J28..J33)
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
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT PK_PickupRelocation PRIMARY KEY (RelocationID),
    CONSTRAINT FK_PickupRelocation_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_PickupRelocation_Candidate FOREIGN KEY (CandidatePlaceId) REFERENCES PARTNER_FACILITY(FacilityID),
    CONSTRAINT CK_PickupRelocation_Status CHECK (Status IN ('PROPOSED', 'MANAGER_APPROVED', 'CUSTOMER_CONFIRMED', 'REJECTED'))
);
GO

-- 9. Bảng IDEMPOTENCY_RECORD: Lưu cache khóa Idempotency-Key chống gửi trùng lặp (Conventions & Flow 3)
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
GO

-- 10. Bảng TRIP_PLANNING_HISTORY: Lịch sử các bước lập kế hoạch và phê duyệt (F3-J19)
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
GO

-- 11. Bảng PLANNING_ATTACHMENT: Lưu chứng từ & file vé bay thật (F3-J42, J52)
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
GO

