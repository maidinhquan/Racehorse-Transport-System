-- =============================================================================
-- MODULE 05: FLOW 4 - VẬN HÀNH HIỆN TRƯỜNG & GIÁM SÁT HÀNH TRÌNH
-- Phân vùng: Nhật ký sinh hiệu sức khỏe ngựa, Sự cố, Mốc hành trình, Đính chính,
--           Đề xuất ETA 2 cấp, Đánh giá thú y, Chi phí phát sinh & Chứng từ hiện trường
-- Tuân thủ: RULE/ID_NAME_RULE.md (Chuẩn ID: <TIỀN_TỐ>_<SỐ_THỨ_TỰ>)
--          RULE/DATABASE_STATUS_CONVENTION.md (Chuẩn hóa trạng thái)
-- =============================================================================
USE HorseTransportDB;
GO

-- =============================================================================
-- BƯỚC 1: DỌN DẸP BẢNG THEO THỨ TỰ PHỤ THUỘC KHÓA NGOẠI NGƯỢC
-- (Xóa code tạo bảng cũ và tạo bảng mới nguyên khối, không dùng ALTER TABLE chắp vá)
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
DROP TABLE IF EXISTS INCIDENT;
DROP TABLE IF EXISTS HEALTH_LOG;
GO

-- =============================================================================
-- BƯỚC 2: MỞ RỘNG BẢNG TRIP_PLAN CHO PHÂN HỆ FLOW 4
-- GHI CHÚ NGUỒN GỐC (ORIGIN NOTE):
-- * BẢNG TRIP_PLAN GỐC ĐƯỢC TẠO TẠI:
--   - File module: HorseTransportDB/modules/04_Flow3_Fleet_TripPlan.sql
--   - File master: HorseTransportDB/HorseTransportDB.sql (Dòng 321)
-- * ENTITY C# TƯƠNG ỨNG TRONG BACKEND: backend/Domain/Entities/TripPlan.cs
-- * MỤC ĐÍCH: Flow 4 kế thừa bảng TRIP_PLAN từ Flow 3 và bổ sung 4 trường dữ liệu mới:
--   - ExecutionVersion: Phiên bản thực thi phục vụ khóa lạc quan (Optimistic Concurrency)
--   - ExecutionPhase: Giai đoạn hành trình (AWAITING_DEPARTURE, IN_PROGRESS, AWAITING_HANDOVER)
--   - CurrentEta: Thời gian dự kiến đến đích mới nhất
--   - PendingEtaProposalId: Mã đề xuất ETA đang chờ phê duyệt
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ExecutionVersion')
    ALTER TABLE TRIP_PLAN ADD ExecutionVersion INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'ExecutionPhase')
    ALTER TABLE TRIP_PLAN ADD ExecutionPhase VARCHAR(30) NOT NULL DEFAULT 'AWAITING_DEPARTURE';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'CurrentEta')
    ALTER TABLE TRIP_PLAN ADD CurrentEta DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'PendingEtaProposalId')
    ALTER TABLE TRIP_PLAN ADD PendingEtaProposalId VARCHAR(50) NULL;
GO

-- =============================================================================
-- BƯỚC 3: TẠO CÁC BẢNG NGUYÊN KHỐI PHỤC VỤ RIÊNG CHO FLOW 4
-- =============================================================================

-- 1. BẢNG HEALTH_LOG: NHẬT KÝ SINH HIỆU SỨC KHỎE NGỰA TRÊN ĐƯỜNG (APPEND-ONLY)
-- Chuẩn mã ID: HEALTH_LOG_001, HEALTH_LOG_002...
CREATE TABLE HEALTH_LOG (
    LogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    EscortID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    LegType VARCHAR(20) NULL,                        -- 'road', 'outbound', 'air', 'inbound'
    LogType VARCHAR(50) NULL,
    LogTime DATETIME NOT NULL DEFAULT GETDATE(),
    Temperature DECIMAL(4, 1) NULL,                  -- Nhiệt độ (°C)
    HeartRate INT NULL,                              -- Nhịp tim (nhịp/phút)
    RespiratoryRatePerMin INT NULL,                  -- Nhịp thở (lần/phút)
    HealthStatus NVARCHAR(100) NULL,
    Condition VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- NORMAL, ABNORMAL (Kích hoạt Safety Blocker)
    Description NVARCHAR(MAX) NULL,
    MediaUrl VARCHAR(500) NULL,
    PhotoFileIds NVARCHAR(MAX) NULL,                 -- Danh sách JSON FileID ảnh chứng từ
    HydrationStatus NVARCHAR(100) NULL,
    AppetiteStatus NVARCHAR(100) NULL,
    FecesCondition NVARCHAR(100) NULL,
    Feeding NVARCHAR(500) NULL,
    Water NVARCHAR(500) NULL,
    RestStatus NVARCHAR(500) NULL,
    CareNotes NVARCHAR(MAX) NULL,
    IncidentID VARCHAR(50) NULL,
    IncidentRequired BIT NOT NULL DEFAULT 0,
    SupersedesLogId VARCHAR(50) NULL,                -- Lưu LogID cũ khi đính chính (Append-Only)
    AmendmentReason NVARCHAR(1000) NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_HealthLog PRIMARY KEY (LogID),
    CONSTRAINT FK_HealthLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_HealthLog_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_HealthLog_Escort FOREIGN KEY (EscortID) REFERENCES [USER](UserID),
    CONSTRAINT FK_HealthLog_Supersedes FOREIGN KEY (SupersedesLogId) REFERENCES HEALTH_LOG(LogID)
);
GO

-- 2. BẢNG INCIDENT: BÁO CÁO SỰ CỐ PHÁT SINH KHẨN CẤP TRÊN ĐƯỜNG
-- Chuẩn mã ID: INCIDENT_001, INCIDENT_002...
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

-- 3. BẢNG TRIP_MILESTONE: DANH SÁCH CÁC MỐC HÀNH TRÌNH TUẦN TỰ
-- Chuẩn mã ID: MILESTONE_001, MILESTONE_002...
CREATE TABLE TRIP_MILESTONE (
    MilestoneID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    Leg VARCHAR(20) NOT NULL DEFAULT 'road',         -- 'road', 'outbound', 'air', 'inbound'
    MilestoneKind VARCHAR(50) NOT NULL,              -- DEPARTED, STOP_ARRIVED, STOP_DEPARTED, CHECKPOINT_ARRIVED, CHECKPOINT_DEPARTED, AIRPORT_ORIGIN_ARRIVED, AIR_HANDOVER, AIR_DEPARTED, AIR_ARRIVED, AIR_RECEIVED, FINAL_ARRIVED
    SequenceOrder INT NOT NULL,                      -- Thứ tự tuần tự (1, 2, 3...)
    MilestoneLabel NVARCHAR(255) NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING',   -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    PlannedTimeUtc DATETIME2 NOT NULL,
    OccurredTimeUtc DATETIME2 NULL,
    ConfirmedTimeUtc DATETIME2 NULL,
    ConfirmedByUserId VARCHAR(50) NULL,
    Note NVARCHAR(1000) NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,              -- JSON mảng các FileID chứng từ
    RequiresHealthCheck BIT NOT NULL DEFAULT 0,      -- Trạm dừng yêu cầu kiểm tra y tế bắt buộc
    Revision INT NOT NULL DEFAULT 1,
    CONSTRAINT PK_TripMilestone PRIMARY KEY (MilestoneID),
    CONSTRAINT FK_TripMilestone_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripMilestone_User FOREIGN KEY (ConfirmedByUserId) REFERENCES [USER](UserID)
);
GO

-- 4. BẢNG MILESTONE_CORRECTION_REQUEST: YÊU CẦU ĐÍNH CHÍNH MỐC ĐÃ HOÀN TẤT
-- Chuẩn mã ID: CORRECTION_001, CORRECTION_002...
CREATE TABLE MILESTONE_CORRECTION_REQUEST (
    CorrectionID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RequestedBy VARCHAR(50) NOT NULL,
    OriginalOccurredAt DATETIME2 NOT NULL,
    ProposedOccurredAt DATETIME2 NOT NULL,
    OriginalNote NVARCHAR(1000) NULL,
    ProposedNote NVARCHAR(1000) NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,
    Reason NVARCHAR(1000) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING, APPROVED, REJECTED
    ReviewedBy VARCHAR(50) NULL,
    ReviewedAt DATETIME2 NULL,
    ReviewNote NVARCHAR(1000) NULL,
    RequestedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_MilestoneCorrection PRIMARY KEY (CorrectionID),
    CONSTRAINT FK_MilestoneCorrection_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID),
    CONSTRAINT FK_MilestoneCorrection_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_MilestoneCorrection_Requester FOREIGN KEY (RequestedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_MilestoneCorrection_Reviewer FOREIGN KEY (ReviewedBy) REFERENCES [USER](UserID)
);
GO

-- 5. BẢNG ETA_PROPOSAL: ĐỀ XUẤT ĐIỀU CHỈNH THỜI GIAN ĐẾN NƠI (ETA 2 CẤP)
-- Chuẩn mã ID: PROPOSAL_001, PROPOSAL_002...
CREATE TABLE ETA_PROPOSAL (
    ProposalID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    ProposedByUser VARCHAR(50) NOT NULL,
    ProposedEta DATETIME2 NOT NULL,
    CurrentEtaSnapshot DATETIME2 NOT NULL,
    Reason NVARCHAR(1000) NOT NULL,
    LinkedIncidentId VARCHAR(50) NULL,
    RequiresManager BIT NOT NULL DEFAULT 0,          -- Vượt hạn giao hàng -> Manager duyệt
    EscalationReason NVARCHAR(1000) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING_COORDINATOR', -- PENDING_COORDINATOR, PENDING_MANAGER, APPROVED, REJECTED
    CoordinatorDecision VARCHAR(20) NULL,
    CoordinatorDecisionReason NVARCHAR(1000) NULL,
    CoordinatorDecidedAt DATETIME2 NULL,
    ManagerDecision VARCHAR(20) NULL,
    ManagerDecisionReason NVARCHAR(1000) NULL,
    ManagerDecidedAt DATETIME2 NULL,
    ProposedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_EtaProposal PRIMARY KEY (ProposalID),
    CONSTRAINT FK_EtaProposal_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_EtaProposal_User FOREIGN KEY (ProposedByUser) REFERENCES [USER](UserID)
);
GO

-- 6. BẢNG VET_ASSESSMENT: KẾT LUẬN ĐÁNH GIÁ THỂ TRẠNG BÁC SĨ THÚ Y
-- Chuẩn mã ID: ASSESSMENT_001, ASSESSMENT_002...
CREATE TABLE VET_ASSESSMENT (
    AssessmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    VetUser VARCHAR(50) NOT NULL,
    TransportFitness VARCHAR(20) NOT NULL,           -- FIT, NOT_FIT, NEEDS_REVIEW (FIT gỡ Safety Blocker)
    ClinicalFindings NVARCHAR(MAX) NOT NULL,
    CareRecommendations NVARCHAR(MAX) NULL,
    RestRequiredHours INT NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,
    AssessedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_VetAssessment PRIMARY KEY (AssessmentID),
    CONSTRAINT FK_VetAssessment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_VetAssessment_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_VetAssessment_Vet FOREIGN KEY (VetUser) REFERENCES [USER](UserID)
);
GO

-- 7. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG CỦA TỔ XE (NỘI BỘ)
-- Chuẩn mã ID: EXPENSE_001, EXPENSE_002...
CREATE TABLE TRIP_EXPENSE (
    ExpenseID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RecordedByUser VARCHAR(50) NOT NULL,
    Category VARCHAR(50) NOT NULL,                   -- TOLL, FUEL, HORSE_CARE, REPAIR, OTHER
    Amount DECIMAL(18, 2) NOT NULL,
    Currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    ReceiptFileId VARCHAR(50) NULL,                  -- FileID ảnh hóa đơn/chứng từ thực tế
    Note NVARCHAR(1000) NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'RECORDED',  -- RECORDED
    IncurredAt DATETIME2 NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_TripExpense PRIMARY KEY (ExpenseID),
    CONSTRAINT FK_TripExpense_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripExpense_User FOREIGN KEY (RecordedByUser) REFERENCES [USER](UserID)
);
GO

-- 8. BẢNG AIR_NOTICE: THÔNG BÁO LỊCH BAY TỪ HÃNG HÀNG KHÔNG
-- Chuẩn mã ID: AIR_NOTICE_001, AIR_NOTICE_002...
CREATE TABLE AIR_NOTICE (
    NoticeID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    BookingId VARCHAR(50) NULL,
    NoticeKind VARCHAR(50) NOT NULL,                 -- ESTIMATED_SCHEDULE, ACTUAL_DEPARTURE, ACTUAL_ARRIVAL, DELAY, CANCELLATION
    DepartureAt DATETIME2 NULL,
    ArrivalAt DATETIME2 NULL,
    ReceivedAt DATETIME2 NOT NULL,
    SourceReference NVARCHAR(255) NULL,
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

-- 9. BẢNG LEGAL_CHECKPOINT_DECISION: KẾT QUẢ KIỂM TRA PHÁP LÝ TẠI TRẠM KIỂM SOÁT
-- Chuẩn mã ID: DECISION_001, DECISION_002...
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

-- 10. BẢNG EXECUTION_ALERT: CẢNH BÁO TRỄ MỐC VÀ ĐẾN HẠN KIỂM TRA Y TẾ
-- Chuẩn mã ID: ALERT_001, ALERT_002...
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

-- 11. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ KHẨN CẤP NGOÀI LUỒNG
-- Chuẩn mã ID: CONTACT_LOG_001, CONTACT_LOG_002...
CREATE TABLE EXECUTION_CONTACT_LOG (
    ContactLogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    ContactedUserID VARCHAR(50) NOT NULL,
    RecordedBy VARCHAR(50) NOT NULL,
    ContactedAt DATETIME2 NOT NULL,
    Channel VARCHAR(30) NOT NULL,                    -- PHONE, IN_PERSON, OTHER
    Result NVARCHAR(2000) NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_ContactLog PRIMARY KEY (ContactLogID),
    CONSTRAINT FK_ContactLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ContactLog_ContactedUser FOREIGN KEY (ContactedUserID) REFERENCES [USER](UserID),
    CONSTRAINT FK_ContactLog_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- 12. BẢNG EXECUTION_ATTACHMENT: QUẢN LÝ METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
-- Chuẩn mã ID: ATTACHMENT_001, ATTACHMENT_002...
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
