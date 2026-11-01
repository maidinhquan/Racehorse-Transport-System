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

