-- =============================================================================
-- MODULE 03: FLOW 2 - THẨM ĐỊNH HỒ SƠ PHÁP LÝ & ĐẶT TRẠM KIỂM DỊCH
-- Phân vùng: Hồ sơ y tế ngựa, chứng nhận thú y và đặt lịch cách ly (Specialist)
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ y tế, xét nghiệm & kiểm dịch của từng ngựa
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
GO

-- 2. Bảng QUARANTINE_BOOKING: Đặt lịch cách ly tiền xuất/hậu nhập cảnh tại các trạm
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
GO


-- 3. Bảng TRIP_INSURANCE: Bảo hiểm vận chuyển chuyến đi (Specialist)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRIP_INSURANCE')
BEGIN
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
END
GO

-- 4. Bảng TRIP_REQUIREMENT_SET: Bộ quy định & checklist áp dụng cho chuyến
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRIP_REQUIREMENT_SET')
BEGIN
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
END
GO

-- 5. Bảng TRIP_CHECKPOINT_CLEARANCE: Thông quan chốt kiểm soát / cửa khẩu chuyến đi
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TRIP_CHECKPOINT_CLEARANCE')
BEGIN
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
END
GO

-- 6. Bảng DOCUMENT_REQUEST: Yêu cầu bổ sung giấy tờ từ chuyên viên tới khách hàng
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DOCUMENT_REQUEST')
BEGIN
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
END
GO

-- 7. Bảng SPECIALIST_AUDIT_LOG: Nhật ký thao tác hồ sơ pháp lý chuyên viên
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SPECIALIST_AUDIT_LOG')
BEGIN
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
END
GO
