-- =============================================================================
-- MODULE 05: FLOW 4 - VẬN HÀNH HIỆN TRƯỜNG & GIÁM SÁT HÀNH TRÌNH
-- Phân vùng: Nhật ký sinh hiệu sức khỏe ngựa & Báo cáo sự cố khẩn cấp (Driver & Escort)
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng HEALTH_LOG: Nhật ký sinh hiệu sức khỏe ngựa trên đường (Insert-Only)
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
GO

-- 2. Bảng INCIDENT: Báo cáo sự cố phát sinh khẩn cấp trên đường
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
GO

