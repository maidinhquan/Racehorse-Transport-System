-- =============================================================================
-- MODULE 05: FLOW 4 - VẬN HÀNH HIỆN TRƯỜNG & GIÁM SÁT HÀNH TRÌNH
-- Căn cứ gốc: HorseTransportDB_Reviewed.sql (Bản chuẩn quy tắc toàn dự án)
-- Tuân thủ: RULE/ID_NAME_RULE.md (Chuẩn ID: <TIỀN_TỐ>_<SỐ_THỨ_TỰ>)
--          RULE/DATABASE_STATUS_CONVENTION.md (Chuẩn hóa trạng thái)
-- =============================================================================

-- Tự động chọn đúng Database theo môi trường thực thi (Ưu tiên HorseTransportDB_Reviewed)
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HorseTransportDB_Reviewed')
BEGIN
    USE HorseTransportDB_Reviewed;
END
ELSE IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HorseTransportDB')
BEGIN
    USE HorseTransportDB;
END
GO

-- =============================================================================
-- BƯỚC 1: DỌN DẸP 10 BẢNG THUỘC SỞ HỮU RIÊNG CỦA FLOW 4 NẾU ĐÃ TỒN TẠI
-- LƯU Ý BẢO VỆ TOÀN VẸN HỆ THỐNG:
-- * TUYỆT ĐỐI KHÔNG DROP bảng INCIDENT vì bảng SETTLEMENT_ADJUSTMENT (Flow 6) đang tham chiếu FK_F6_AdjustmentIncident.
-- * TUYỆT ĐỐI KHÔNG DROP bảng HEALTH_LOG vì đang chứa dữ liệu seed ban đầu của HorseTransportDB_Reviewed.sql.
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
-- * BẢNG TRIP_PLAN GỐC ĐƯỢC TẠO TẠI: HorseTransportDB_Reviewed.sql (Dòng 321)
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

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DepartureApprovedAt')
    ALTER TABLE TRIP_PLAN ADD DepartureApprovedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TRIP_PLAN') AND name = 'DepartureApprovedBy')
    ALTER TABLE TRIP_PLAN ADD DepartureApprovedBy VARCHAR(50) NULL;
GO

-- =============================================================================
-- BƯỚC 3: MỞ RỘNG BẢNG HEALTH_LOG CHO PHÂN HỆ FLOW 4 (APPEND-ONLY & CLINICAL)
-- GHI CHÚ NGUỒN GỐC (ORIGIN NOTE):
-- * BẢNG HEALTH_LOG GỐC ĐƯỢC TẠO TẠI: HorseTransportDB_Reviewed.sql (Bảng số 19, dòng 427)
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

-- =============================================================================
-- BƯỚC 4: TẠO 10 BẢNG MỚI ĐẶC THÙ RIÊNG PHỤC VỤ CHO 37 ENDPOINT FLOW 4
-- Chuẩn mã ID theo RULE/ID_NAME_RULE.md: <TIỀN_TỐ>_<SỐ_THỨ_TỰ>
-- =============================================================================

-- 1. BẢNG TRIP_MILESTONE: DANH SÁCH CÁC MỐC HÀNH TRÌNH TUẦN TỰ
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

-- 2. BẢNG MILESTONE_CORRECTION_REQUEST: YÊU CẦU ĐÍNH CHÍNH MỐC ĐÃ HOÀN TẤT
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

-- 3. BẢNG ETA_PROPOSAL: ĐỀ XUẤT ĐIỀU CHỈNH THỜI GIAN ĐẾN NƠI (ETA 2 CẤP)
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

-- 4. BẢNG VET_ASSESSMENT: KẾT LUẬN ĐÁNH GIÁ THỂ TRẠNG BÁC SĨ THÚ Y
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

-- 5. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG CỦA TỔ XE (NỘI BỘ)
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

-- 6. BẢNG AIR_NOTICE: THÔNG BÁO LỊCH BAY TỪ HÃNG HÀNG KHÔNG
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

-- 7. BẢNG LEGAL_CHECKPOINT_DECISION: KẾT QUẢ KIỂM TRA PHÁP LÝ TẠI TRẠM KIỂM SOÁT
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

-- 8. BẢNG EXECUTION_ALERT: CẢNH BÁO TRỄ MỐC VÀ ĐẾN HẠN KIỂM TRA Y TẾ
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

-- 9. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ KHẨN CẤP NGOÀI LUỒNG
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

-- 10. BẢNG EXECUTION_ATTACHMENT: QUẢN LÝ METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
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

-- =============================================================================
-- BƯỚC 5: KHỞI TẠO DỮ LIỆU SEED MẪU PHỤC VỤ TEST FLOW 4 TRÊN CHUYẾN TRIP_003
-- (TRIP_003 là chuyến IN_TRANSIT có sẵn từ HorseTransportDB_Reviewed.sql)
-- =============================================================================
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_003')
BEGIN
    UPDATE TRIP_PLAN 
    SET ExecutionVersion = 2, 
        ExecutionPhase = 'IN_PROGRESS', 
        CurrentEta = '2026-10-10 18:00:00' 
    WHERE TripID = 'TRIP_003';

    INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, MilestoneLabel, Status, PlannedTimeUtc, OccurredTimeUtc, ConfirmedTimeUtc, ConfirmedByUserId, Note, RequiresHealthCheck, Revision)
    VALUES 
    ('MILESTONE_001', 'TRIP_003', 'road', 'DEPARTED',     1, N'Xuất phát từ trang trại Sóc Sơn', 'COMPLETED', '2026-10-08 08:30:00', '2026-10-08 08:35:00', '2026-10-08 08:35:00', 'USER_007', N'Xuất phát đúng giờ', 0, 1),
    ('MILESTONE_002', 'TRIP_003', 'road', 'STOP_ARRIVED', 2, N'Trạm dừng nghỉ Đà Nẵng (Kiểm tra y tế)', 'PENDING',   '2026-10-09 11:00:00', NULL, NULL, NULL, NULL, 1, 1),
    ('MILESTONE_003', 'TRIP_003', 'road', 'FINAL_ARRIVED',3, N'Đến điểm giao CLB Ngựa Sài Gòn',          'PENDING',   '2026-10-10 18:00:00', NULL, NULL, NULL, NULL, 0, 1);
END
GO
