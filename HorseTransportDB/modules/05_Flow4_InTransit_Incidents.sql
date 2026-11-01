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
-- Chuyến 1: TRIP_003 (Đường bộ Happy Path - Tài xế USER_007, Áp tải USER_009, Xe VEHICLE_002)
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_003')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'READY_TO_DEPART',
        ExecutionVersion = 1, 
        ExecutionPhase = 'AWAITING_DEPARTURE', 
        CurrentEta = '2026-10-10 18:00:00',
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        RouteStatus = 'APPROVED',
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1,
        EarliestDepartureDate = '2026-10-08 07:00:00',
        DocumentExpiryDate = '2027-05-10 00:00:00',
        ApprovedPlanJson = N'{"transportMode":"ROAD","legs":[{"leg":"road","origin":"Trang trại Sóc Sơn, Hà Nội","destination":"Trại ngựa Phú Thọ, TP.HCM"}]}'
    WHERE TripID = 'TRIP_003';

    UPDATE TRANSPORT_REQUEST
    SET Status = 'CONFIRMED',
        DeclaredValueVnd = 145000000.00
    WHERE RequestID = 'REQUEST_003';
END

-- Chuyến 2: TRIP_001 (Đa phương thức Đường bộ + Hàng không Air Leg - Đang thực hiện IN_TRANSIT)
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_001')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'IN_TRANSIT',
        ExecutionVersion = 2, 
        ExecutionPhase = 'IN_PROGRESS', 
        CurrentEta = '2026-09-17 12:00:00',
        OperationsStatus = 'READY',
        DocumentsStatus = 'READY',
        RouteStatus = 'APPROVED',
        PlanVersion = 1,
        ContextVersion = 1,
        ReadinessVersion = 1,
        EarliestDepartureDate = '2026-09-15 06:00:00',
        DocumentExpiryDate = '2026-12-01 00:00:00',
        PendingEtaProposalId = 'PROPOSAL_001',
        ApprovedPlanJson = N'{"transportMode":"AIR","legs":[{"leg":"road_outbound"},{"leg":"air","airline":"Nippon Cargo Airlines"},{"leg":"road_inbound"}]}'
    WHERE TripID = 'TRIP_001';

    UPDATE TRANSPORT_REQUEST
    SET Status = 'IN_PROGRESS',
        DeclaredValueVnd = 350000000.00
    WHERE RequestID = 'REQUEST_001';
END

-- Chuyến 3: TRIP_002 (Đường bộ phụ - Tài xế USER_008, Áp tải USER_010, Xe VEHICLE_003)
IF EXISTS (SELECT 1 FROM TRIP_PLAN WHERE TripID = 'TRIP_002')
BEGIN
    UPDATE TRIP_PLAN 
    SET Status = 'READY_TO_DEPART',
        ExecutionVersion = 1, 
        ExecutionPhase = 'AWAITING_DEPARTURE', 
        CurrentEta = '2026-10-02 18:00:00',
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
    SET Status = 'CONFIRMED',
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
('MILESTONE_002', 'TRIP_003', 'road', 'STOP_ARRIVED',  2, N'Trạm dừng nghỉ Đà Nẵng (Kiểm tra y tế)',       'PENDING', '2026-10-09 11:00:00', NULL, NULL, NULL, NULL, 1, 1),
('MILESTONE_003', 'TRIP_003', 'road', 'FINAL_ARRIVED', 3, N'Đến điểm giao CLB Ngựa Sài Gòn (Đích đến)', 'PENDING', '2026-10-10 18:00:00', NULL, NULL, NULL, NULL, 0, 1);

-- Mốc cho TRIP_001 (Đa phương thức hàng không - Kiểm thử Air Leg, Checkpoint, Đính chính)
INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Note, RequiresHealthCheck, Revision)
VALUES 
('MILESTONE_010', 'TRIP_001', 'road',    'DEPARTED',               1, N'Khởi hành từ trại ngựa Hà Nội',               'COMPLETED', '2026-09-15 07:00:00', '2026-09-15 07:00:00', '2026-09-15 07:05:00', 'USER_007', N'Xuất phát đúng giờ', 0, 1),
('MILESTONE_011', 'TRIP_001', 'road',    'AIRPORT_ORIGIN_ARRIVED', 2, N'Đến ga hàng hóa Nội Bài Cargo Terminal',     'COMPLETED', '2026-09-15 14:00:00', '2026-09-15 14:10:00', '2026-09-15 14:15:00', 'USER_007', N'Đã tập kết tại kho lạnh hàng không', 0, 1),
('MILESTONE_012', 'TRIP_001', 'air',     'AIR_HANDOVER',           3, N'Bàn giao ngựa cho hãng bay NCA Airlines',     'COMPLETED', '2026-09-15 16:30:00', '2026-09-15 16:40:00', '2026-09-15 16:45:00', 'USER_007', N'Ký biên bản bàn giao kho Cargo', 0, 1),
('MILESTONE_013', 'TRIP_001', 'air',     'AIR_DEPARTED',           4, N'Chuyến bay chở ngựa KZ-102 cất cánh',         'COMPLETED', '2026-09-16 05:30:00', '2026-09-16 05:30:00', '2026-09-16 05:35:00', 'USER_006', N'NCA xác nhận cất cánh', 0, 1),
('MILESTONE_014', 'TRIP_001', 'air',     'AIR_ARRIVED',            5, N'Hạ cánh sân bay Narita (Tokyo, Nhật Bản)',     'PENDING',   '2026-09-16 12:30:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_015', 'TRIP_001', 'road',    'AIR_RECEIVED',           6, N'Tiếp nhận ngựa tại Cargo Terminal Narita',     'PENDING',   '2026-09-16 14:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_016', 'TRIP_001', 'road',    'FINAL_ARRIVED',          7, N'Đến trung tâm tiếp nhận ngựa Narita',          'PENDING',   '2026-09-17 12:00:00', NULL, NULL, NULL, NULL, 0, 1);

-- Mốc cho TRIP_002 (Đường bộ phụ cho USER_008)
INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Note, RequiresHealthCheck, Revision)
VALUES 
('MILESTONE_020', 'TRIP_002', 'road', 'DEPARTED',      1, N'Xuất phát từ trang trại Đà Lạt',   'PENDING', '2026-10-01 07:00:00', NULL, NULL, NULL, NULL, 0, 1),
('MILESTONE_021', 'TRIP_002', 'road', 'FINAL_ARRIVED', 2, N'Đến trang trại Bình Dương',       'PENDING', '2026-10-02 18:00:00', NULL, NULL, NULL, NULL, 0, 1);
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
('PROPOSAL_002', 'TRIP_003', 'USER_007', '2026-10-11 10:00:00', '2026-10-10 18:00:00', N'Mưa lớn gây sạt lở đèo Hải Vân phải đi vòng đường tránh', 1, 'PENDING_COORDINATOR', NULL, NULL, NULL, '2026-10-09 14:00:00');
GO

-- 5.6. BẢNG VET_ASSESSMENT: KẾT LUẬN THỂ TRẠNG BÁC SĨ THÚ Y
DELETE FROM VET_ASSESSMENT;
INSERT INTO VET_ASSESSMENT (AssessmentID, TripID, HorseID, VetID, TransportFitness, Conclusion, CareInstructions, AssessedAt)
VALUES 
('ASSESSMENT_001', 'TRIP_003', 'HORSE_001', 'USER_009', 'FIT', N'Thể trạng ngựa khỏe mạnh, nhịp tim 38 bpm, hô hấp 14 l/p, mắt linh hoạt, niêm mạc hồng hào', N'Bổ sung nước điện giải mỗi 4 tiếng trên xe', '2026-10-08 07:45:00'),
('ASSESSMENT_002', 'TRIP_001', 'HORSE_001', 'USER_009', 'FIT', N'Thể trạng hoàn toàn đáp ứng điều kiện bay quốc tế chuẩn IATA Live Animals Regulations', N'Cho uống nước trước giờ bay 2 tiếng', '2026-09-15 15:00:00');
GO

-- 5.7. BẢNG TRIP_EXPENSE: CHI PHÍ PHÁT SINH TRÊN ĐƯỜNG
DELETE FROM TRIP_EXPENSE;
INSERT INTO TRIP_EXPENSE (ExpenseID, TripID, RecordedBy, Category, AmountVnd, OccurredAt, Reason, Status, RecordedAt)
VALUES 
('EXPENSE_001', 'TRIP_003', 'USER_007', 'TOLL_FEE',        250000.00, '2026-10-08 12:00:00', N'Vé trạm thu phí BOT Phước Tượng',       'RECORDED', '2026-10-08 12:05:00'),
('EXPENSE_002', 'TRIP_003', 'USER_007', 'FEED_SUPPLIES',   450000.00, '2026-10-09 11:30:00', N'Mua bổ sung cỏ khô và muối khoáng tại Đà Nẵng', 'RECORDED', '2026-10-09 11:35:00'),
('EXPENSE_003', 'TRIP_001', 'USER_007', 'OTHER',          1200000.00, '2026-09-15 15:30:00', N'Phí khử trùng xe và khu lưu chuồng ga hàng không Nội Bài', 'RECORDED', '2026-09-15 15:35:00');
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
('ALERT_001', 'TRIP_003', 'MILESTONE_002', 'HEALTH_CHECK_DUE', 'OPEN', N'Đến hạn kiểm tra y tế và đo sinh hiệu ngựa tại trạm dừng Đà Nẵng', N'["USER_007","USER_009"]', '2026-10-09 10:30:00'),
('ALERT_002', 'TRIP_001', 'MILESTONE_014', 'ETA_CHANGE',       'RESOLVED', N'Lịch bay KZ-102 đã được cập nhật, ETA mới: 2026-09-17 12:00', N'["USER_006"]', '2026-09-15 17:30:00');
GO

-- 5.11. BẢNG EXECUTION_CONTACT_LOG: NHẬT KÝ LIÊN HỆ NGOÀI LUỒNG
DELETE FROM EXECUTION_CONTACT_LOG;
INSERT INTO EXECUTION_CONTACT_LOG (ContactLogID, TripID, ContactedUserID, RecordedBy, ContactedAt, Channel, Result, RecordedAt)
VALUES 
('CONTACT_LOG_001', 'TRIP_003', 'USER_007', 'USER_006', '2026-10-08 19:00:00', 'PHONE', N'Tài xế thông báo xe đang dừng nghỉ ngơi đúng lịch trình, ngựa khỏe mạnh, kết nối 4G ổn định', '2026-10-08 19:05:00');
GO

-- 5.12. BẢNG EXECUTION_ATTACHMENT: METADATA CHỨNG TỪ & ẢNH HIỆN TRƯỜNG
DELETE FROM EXECUTION_ATTACHMENT;
INSERT INTO EXECUTION_ATTACHMENT (FileID, TripID, HorseID, FileName, ContentType, FileSize, Purpose, StoragePath, UploadedBy, UploadedAtUtc)
VALUES 
('ATTACHMENT_001', 'TRIP_001', 'HORSE_001', N'bien_ban_kiem_dich_noi_bai.pdf', 'application/pdf', 1048576, 'CHECKPOINT', N'/storage/flow4/trips/TRIP_001/bien_ban_kiem_dich_noi_bai.pdf', 'USER_005', '2026-09-15 15:05:00'),
('ATTACHMENT_002', 'TRIP_003', 'HORSE_001', N'anh_ngua_kham_khoi_hanh.jpg',     'image/jpeg',      2097152, 'HEALTH',     N'/storage/flow4/trips/TRIP_003/anh_ngua_kham_khoi_hanh.jpg',     'USER_009', '2026-10-08 07:50:00');
GO

-- 5.13. BỔ SUNG NHẬT KÝ SỨC KHỎE SINH HIỆU LÂM SÀNG (HEALTH_LOG)
IF NOT EXISTS (SELECT 1 FROM HEALTH_LOG WHERE LogID = 'LOG_005')
BEGIN
    INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, Condition, RespiratoryRatePerMin, Feeding, Water, RestStatus, CareNotes, LegType, RecordedAt)
    VALUES 
    ('LOG_005', 'TRIP_003', 'HORSE_001', 'USER_009', 'OBSERVATION', '2026-10-08 07:30:00', 38.0, 38, N'Tốt', N'Khám sức khỏe tổng quát trước giờ xuất phát', 'NORMAL', 14, N'Ăn cỏ khô bình thường', N'Uống 15L nước', N'Nghỉ ngơi tốt', N'Ngựa sẵn sàng lên đường', 'road', '2026-10-08 07:35:00');
END
GO
