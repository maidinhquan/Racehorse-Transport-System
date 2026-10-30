-- =============================================================================
-- MODULE 05: FLOW 4 - VẬN HÀNH HIỆN TRƯỜNG & GIÁM SÁT HÀNH TRÌNH
-- Phân vùng: Nhật ký sinh hiệu sức khỏe ngựa, Sự cố, Mốc hành trình, Đính chính,
--           Đề xuất ETA 2 cấp, Đánh giá thú y, Chi phí phát sinh & Chứng từ hiện trường
-- =============================================================================
USE HorseTransportDB;
GO

-- =============================================================================
-- 1. MỞ RỘNG BẢNG TRIP_PLAN CHO PHÂN HỆ FLOW 4
-- GHI CHÚ NGUỒN GỐC (ORIGIN NOTE):
-- * BẢNG TRIP_PLAN GỐC ĐƯỢC TẠO TẠI: HorseTransportDB/modules/04_Flow3_Fleet_TripPlan.sql (Dòng 9)
-- * ENTITY C# TƯƠNG ỨNG TRONG BACKEND: backend/Domain/Entities/TripPlan.cs
-- * MỤC ĐÍCH: Flow 4 kế thừa bảng TRIP_PLAN từ Flow 3 và bổ sung 4 trường dữ liệu mới
--   để phục vụ giám sát tiến độ thực tế, kiểm soát phiên bản lạc quan (ExecutionVersion),
--   giai đoạn vận hành (ExecutionPhase), ETA thực tế (CurrentEta) và đề xuất ETA (PendingEtaProposalId).
-- =============================================================================
ALTER TABLE TRIP_PLAN ADD
    ExecutionVersion INT NOT NULL DEFAULT 1,
    ExecutionPhase VARCHAR(30) NOT NULL DEFAULT 'AWAITING_DEPARTURE',
    CurrentEta DATETIME2 NULL,
    PendingEtaProposalId VARCHAR(50) NULL;
GO

-- =============================================================================
-- 2. BẢNG HEALTH_LOG: NHẬT KÝ SINH HIỆU SỨC KHỎE NGỰA TRÊN ĐƯỜNG (APPEND-ONLY)
-- =============================================================================
CREATE TABLE HEALTH_LOG (
    LogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    EscortID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    LegType VARCHAR(20) NULL,                    -- 'road', 'outbound', 'air', 'inbound'
    LogType VARCHAR(50) NULL,
    LogTime DATETIME NOT NULL DEFAULT GETDATE(),
    Temperature DECIMAL(4, 1) NULL,
    HeartRate INT NULL,
    RespiratoryRatePerMin INT NULL,
    HealthStatus NVARCHAR(100) NULL,
    Condition VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- NORMAL, ABNORMAL (Kích hoạt Safety Blocker)
    Description NVARCHAR(MAX) NULL,
    MediaUrl VARCHAR(500) NULL,
    PhotoFileIds NVARCHAR(MAX) NULL,
    HydrationStatus NVARCHAR(100) NULL,
    AppetiteStatus NVARCHAR(100) NULL,
    FecesCondition NVARCHAR(100) NULL,
    Feeding NVARCHAR(500) NULL,
    Water NVARCHAR(500) NULL,
    RestStatus NVARCHAR(500) NULL,
    CareNotes NVARCHAR(MAX) NULL,
    IncidentID VARCHAR(50) NULL,
    IncidentRequired BIT NOT NULL DEFAULT 0,
    SupersedesLogId VARCHAR(50) NULL,            -- Lưu LogID cũ khi đính chính (Append-Only)
    AmendmentReason NVARCHAR(1000) NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_HealthLog PRIMARY KEY (LogID),
    CONSTRAINT FK_HealthLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_HealthLog_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_HealthLog_Escort FOREIGN KEY (EscortID) REFERENCES [USER](UserID),
    CONSTRAINT FK_HealthLog_Supersedes FOREIGN KEY (SupersedesLogId) REFERENCES HEALTH_LOG(LogID)
);
GO

-- =============================================================================
-- 3. BẢNG INCIDENT: BÁO CÁO SỰ CỐ PHÁT SINH KHẨN CẤP TRÊN ĐƯỜNG
-- =============================================================================
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

-- =============================================================================
-- 4. BẢNG TRIP_MILESTONE: DANH SÁCH CÁC MỐC HÀNH TRÌNH TUẦN TỰ
-- =============================================================================
CREATE TABLE TRIP_MILESTONE (
    MilestoneID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    Leg VARCHAR(20) NOT NULL DEFAULT 'road',     -- 'road', 'outbound', 'air', 'inbound'
    MilestoneKind VARCHAR(50) NOT NULL,          -- DEPARTED, STOP_ARRIVED, STOP_DEPARTED, CHECKPOINT_ARRIVED, CHECKPOINT_DEPARTED, AIRPORT_ORIGIN_ARRIVED, AIR_HANDOVER, AIR_DEPARTED, AIR_ARRIVED, AIR_RECEIVED, FINAL_ARRIVED
    SequenceOrder INT NOT NULL,                  -- Thứ tự tuần tự tăng dần trên toàn chuyến
    Label NVARCHAR(255) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED
    PlannedTime DATETIME2 NOT NULL,
    OccurredAt DATETIME2 NULL,                   -- Thời điểm tài xế/người nhập ghi nhận
    RecordedAt DATETIME2 NULL,                   -- Thời điểm server ghi nhận vào hệ thống
    RecordedBy VARCHAR(50) NULL,                 -- Tài xế hoặc nhân sự xác nhận mốc
    Revision INT NOT NULL DEFAULT 1,             -- Số lần đính chính mốc (bắt đầu từ 1)
    RequiresHealthCheck BIT NOT NULL DEFAULT 0,  -- Bắt buộc kiểm tra sức khỏe tại trạm dừng
    LocationCoordinates VARCHAR(100) NULL,
    Latitude DECIMAL(9, 6) NULL,
    Longitude DECIMAL(9, 6) NULL,
    Note NVARCHAR(MAX) NULL,
    EvidenceFileIds NVARCHAR(MAX) NULL,          -- Danh sách ID ảnh/chứng từ đính kèm
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT PK_TripMilestone PRIMARY KEY (MilestoneID),
    CONSTRAINT FK_TripMilestone_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripMilestone_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- =============================================================================
-- 5. BẢNG MILESTONE_CORRECTION_REQUEST: QUẢN LÝ YÊU CẦU ĐÍNH CHÍNH MỐC
-- =============================================================================
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
    Reason NVARCHAR(2000) NOT NULL,              -- Lý do đính chính (bắt buộc)
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    Version INT NOT NULL DEFAULT 1,
    DecidedBy VARCHAR(50) NULL,                  -- Điều phối viên quyết định
    DecidedAt DATETIME2 NULL,
    DecisionReason NVARCHAR(2000) NULL,
    CONSTRAINT PK_MilestoneCorrection PRIMARY KEY (CorrectionID),
    CONSTRAINT FK_MilestoneCorrection_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID),
    CONSTRAINT FK_MilestoneCorrection_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_MilestoneCorrection_RequestedBy FOREIGN KEY (RequestedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_MilestoneCorrection_DecidedBy FOREIGN KEY (DecidedBy) REFERENCES [USER](UserID)
);
GO

-- =============================================================================
-- 6. BẢNG ETA_PROPOSAL: ĐỀ XUẤT VÀ PHÊ DUYỆT ĐIỀU CHỈNH ETA 2 CẤP
-- =============================================================================
CREATE TABLE ETA_PROPOSAL (
    ProposalID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    CurrentEtaSnapshot DATETIME2 NOT NULL,
    ProposedEta DATETIME2 NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    LinkedIncidentId VARCHAR(50) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'PENDING_COORDINATOR', -- PENDING_COORDINATOR, PENDING_MANAGER, APPROVED, REJECTED, WITHDRAWN
    RequiresManager BIT NOT NULL DEFAULT 0,      -- Bật khi đề xuất vượt deliveryDeadline hoặc trễ bay
    EscalationReason NVARCHAR(1000) NULL,        -- Lý do chuyển cấp Quản lý
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

-- =============================================================================
-- 7. BẢNG VET_ASSESSMENT: KẾT LUẬN THỂ TRẠNG CHUYÊN MÔN CỦA BÁC SĨ THÚ Y
-- =============================================================================
CREATE TABLE VET_ASSESSMENT (
    AssessmentID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    VetID VARCHAR(50) NOT NULL,
    HealthLogID VARCHAR(50) NULL,
    TransportFitness VARCHAR(20) NOT NULL,       -- FIT, NOT_FIT, NEEDS_REVIEW
    Conclusion NVARCHAR(MAX) NOT NULL,           -- Kết luận lâm sàng
    CareInstructions NVARCHAR(MAX) NULL,         -- Chỉ dẫn chăm sóc y tế
    EvidenceFileIds NVARCHAR(MAX) NULL,
    IncidentID VARCHAR(50) NULL,
    AssessedAt DATETIME2 NOT NULL,               -- Thời điểm khám lâm sàng
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_VetAssessment PRIMARY KEY (AssessmentID),
    CONSTRAINT FK_VetAssessment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_VetAssessment_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_VetAssessment_Vet FOREIGN KEY (VetID) REFERENCES [USER](UserID),
    CONSTRAINT FK_VetAssessment_HealthLog FOREIGN KEY (HealthLogID) REFERENCES HEALTH_LOG(LogID)
);
GO

-- =============================================================================
-- 8. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG (PETTY CASH NỘI BỘ TỔ XE)
-- =============================================================================
CREATE TABLE TRIP_EXPENSE (
    ExpenseID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RecordedBy VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    Category VARCHAR(50) NOT NULL,               -- TOLL_FEE, FEED_SUPPLIES, EMERGENCY_CARE, OTHER
    AmountVnd DECIMAL(14, 2) NOT NULL,           -- Số tiền phát sinh (VND)
    OccurredAt DATETIME2 NOT NULL,               -- Thời điểm phát sinh chi phí
    Reason NVARCHAR(2000) NOT NULL,              -- Nội dung và lý do chi
    ReceiptPhotoUrl NVARCHAR(500) NULL,          -- Ảnh chụp hóa đơn / biên lai
    ReceiptFileIds NVARCHAR(MAX) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'RECORDED', -- RECORDED (Không can thiệp cước khách hàng)
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_TripExpense PRIMARY KEY (ExpenseID),
    CONSTRAINT FK_TripExpense_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_TripExpense_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID),
    CONSTRAINT FK_TripExpense_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID)
);
GO

-- =============================================================================
-- 9. BẢNG AIR_NOTICE: THÔNG BÁO LỊCH BAY VÀ SỰ KIỆN TỪ ĐỐI TÁC HÀNG KHÔNG
-- =============================================================================
CREATE TABLE AIR_NOTICE (
    NoticeID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    BookingID VARCHAR(50) NULL,
    NoticeKind VARCHAR(50) NOT NULL,             -- ESTIMATED_SCHEDULE, ACTUAL_DEPARTURE, ACTUAL_ARRIVAL
    DepartureAt DATETIME2 NULL,
    ArrivalAt DATETIME2 NULL,
    ReceivedAt DATETIME2 NOT NULL,               -- Thời điểm nhận được thông tin
    SourceReference NVARCHAR(255) NOT NULL,      -- Số hiệu văn bản/email đối tác
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

-- =============================================================================
-- 10. BẢNG LEGAL_CHECKPOINT_DECISION: KẾT QUẢ KIỂM TRA PHÁP LÝ TẠI TRẠM KIỂM SOÁT
-- =============================================================================
CREATE TABLE LEGAL_CHECKPOINT_DECISION (
    DecisionID VARCHAR(50) NOT NULL,
    CheckpointID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    TripID VARCHAR(50) NOT NULL,
    SpecialistID VARCHAR(50) NOT NULL,
    Decision VARCHAR(30) NOT NULL,               -- CLEARED, HELD, SUPPLEMENT_REQUIRED
    OccurredAt DATETIME2 NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    EvidenceFileIds NVARCHAR(MAX) NOT NULL,      -- Bắt buộc có bằng chứng biên bản kiểm tra
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    Version INT NOT NULL DEFAULT 1,
    CONSTRAINT PK_CheckpointDecision PRIMARY KEY (DecisionID),
    CONSTRAINT FK_CheckpointDecision_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_CheckpointDecision_Specialist FOREIGN KEY (SpecialistID) REFERENCES [USER](UserID),
    CONSTRAINT FK_CheckpointDecision_Milestone FOREIGN KEY (MilestoneID) REFERENCES TRIP_MILESTONE(MilestoneID)
);
GO

-- =============================================================================
-- 11. BẢNG EXECUTION_ALERT: CẢNH BÁO TRỄ MỐC VÀ ĐẾN HẠN KIỂM TRA Y TẾ
-- =============================================================================
CREATE TABLE EXECUTION_ALERT (
    AlertID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    MilestoneID VARCHAR(50) NULL,
    AlertKind VARCHAR(50) NOT NULL,              -- MILESTONE_OVERDUE, HEALTH_CHECK_DUE, ETA_CHANGE
    Status VARCHAR(20) NOT NULL DEFAULT 'OPEN',   -- OPEN, ACKNOWLEDGED, RESOLVED
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

-- =============================================================================
-- 12. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ KHẨN CẤP NGOÀI LUỒNG
-- =============================================================================
CREATE TABLE EXECUTION_CONTACT_LOG (
    ContactLogID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    ContactedUserID VARCHAR(50) NOT NULL,
    RecordedBy VARCHAR(50) NOT NULL,
    ContactedAt DATETIME2 NOT NULL,
    Channel VARCHAR(30) NOT NULL,                -- PHONE, IN_PERSON, OTHER
    Result NVARCHAR(2000) NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_ContactLog PRIMARY KEY (ContactLogID),
    CONSTRAINT FK_ContactLog_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ContactLog_ContactedUser FOREIGN KEY (ContactedUserID) REFERENCES [USER](UserID),
    CONSTRAINT FK_ContactLog_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES [USER](UserID)
);
GO

-- =============================================================================
-- 13. BẢNG EXECUTION_ATTACHMENT: QUẢN LÝ METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
-- =============================================================================
CREATE TABLE EXECUTION_ATTACHMENT (
    FileID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NULL,
    FileName NVARCHAR(255) NOT NULL,
    ContentType VARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL,
    Purpose VARCHAR(30) NOT NULL,                -- MILESTONE, AIR, CHECKPOINT, HEALTH, EXPENSE
    StoragePath NVARCHAR(500) NOT NULL,
    UploadedBy VARCHAR(50) NOT NULL,
    UploadedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_ExecutionAttachment PRIMARY KEY (FileID),
    CONSTRAINT FK_ExecutionAttachment_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_ExecutionAttachment_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID),
    CONSTRAINT FK_ExecutionAttachment_User FOREIGN KEY (UploadedBy) REFERENCES [USER](UserID)
);
GO
