-- =============================================================================
-- MODULE 07: FLOW 6 - HỢP ĐỒNG, CHI PHÍ & THANH TOÁN (CONTRACT & BILLING)
-- Phân vùng: Hợp đồng vận chuyển, Bóc tách chi phí thực tế, Hóa đơn & Giao dịch
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng CONTRACT: Hợp đồng vận chuyển với khách hàng (Đa tiền tệ & Quản lý phiên bản)
CREATE TABLE CONTRACT (
    ContractID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NULL,
    CustomerID VARCHAR(50) NOT NULL,
    ContractCode VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    ExchangeRateToLocal DECIMAL(10, 4) NULL,
    TotalQuotedPrice DECIMAL(12, 2) NULL,
    BaseContractPrice_P DECIMAL(12, 2) NULL,
    DepositRateStandard DECIMAL(5, 2) NULL,
    ActualGrossProfit_AGP DECIMAL(12, 2) NULL,
    SignedAt DATETIME NULL,
    ContractStatus VARCHAR(50) NOT NULL,
    -- Quản lý phiên bản & Snapshot Flow 6
    CurrentVersionNo INT NULL,
    CommercialNotes NVARCHAR(2000) NULL,
    RequestID VARCHAR(50) NULL,
    CompletionDeadline DATETIME2(7) NULL,
    PdfUrl VARCHAR(500) NULL,
    SignOtpHash VARCHAR(255) NULL,
    SignOtpExpiry DATETIME2(7) NULL,
    SignOtpFailedAttempts INT NOT NULL DEFAULT 0,
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
    CONSTRAINT PK_Contract PRIMARY KEY (ContractID),
    CONSTRAINT FK_Contract_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Contract_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT FK_Contract_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID)
);
GO

-- 2. Bảng CONTRACT_VERSION: Lưu trữ các bản chụp hợp đồng (Content snapshot)
CREATE TABLE CONTRACT_VERSION (
    ContractID VARCHAR(50) NOT NULL,
    VersionNo INT NOT NULL,
    VersionStatus VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ContentSnapshot NVARCHAR(MAX) NOT NULL,
    PdfUrl NVARCHAR(500) NULL,
    CreatedBy VARCHAR(50) NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    PublishedBy VARCHAR(50) NULL,
    PublishedAtUtc DATETIME2(7) NULL,
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
GO

ALTER TABLE CONTRACT ADD CONSTRAINT FK_Contract_CurrentVersion
    FOREIGN KEY (ContractID, CurrentVersionNo) REFERENCES CONTRACT_VERSION(ContractID, VersionNo);
GO
ALTER TABLE CONTRACT ADD CONSTRAINT UQ_F6_ContractScope UNIQUE (ContractID, TripID, CustomerID);
GO

-- 3. Bảng COST_ITEM: Các khoản mục chi phí thực tế phát sinh (Nhiên liệu, trạm, sự cố, thú y)
CREATE TABLE COST_ITEM (
    CostItemID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    CategoryName NVARCHAR(100) NULL,
    SubcodeName NVARCHAR(100) NULL,
    Bearer VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    TotalMoney DECIMAL(12, 2) NULL,
    EvidenceUrl VARCHAR(500) NULL,
    CONSTRAINT PK_CostItem PRIMARY KEY (CostItemID),
    CONSTRAINT FK_CostItem_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID)
);
GO

-- 4. Bảng INVOICE: Hóa đơn thanh toán theo từng đợt (Cọc, Quyết toán cuối)
CREATE TABLE INVOICE (
    InvoiceID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    ContractVersionNo INT NOT NULL DEFAULT 1,
    InvoiceType VARCHAR(50) NULL,
    CurrencyCode VARCHAR(3) NOT NULL DEFAULT 'VND',
    TotalPayableAmount DECIMAL(12, 2) NOT NULL,
    PaidAmount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    DueDate DATETIME NULL,
    PaymentStatus VARCHAR(50) NOT NULL,
    CONSTRAINT PK_Invoice PRIMARY KEY (InvoiceID),
    CONSTRAINT FK_Invoice_Contract FOREIGN KEY (ContractID) REFERENCES CONTRACT(ContractID)
);
GO

ALTER TABLE INVOICE ADD CONSTRAINT UQ_F6_InvoiceVersion UNIQUE (InvoiceID, ContractID, ContractVersionNo);
GO
CREATE UNIQUE INDEX UX_F6_FinalInvoice ON INVOICE(ContractID, ContractVersionNo) WHERE InvoiceType='FINAL_SETTLEMENT' AND PaymentStatus<>'CANCELLED';
GO

-- 5. Bảng PAYMENT: Giao dịch thanh toán thực tế (Cổng thanh toán hoặc Chuyển khoản)
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
    VnpayTmnCode VARCHAR(50) NULL,
    VnpayBankCode VARCHAR(50) NULL,
    VnpayCardType VARCHAR(50) NULL,
    VnpayTransactionNo VARCHAR(50) NULL,
    VnpayResponseCode VARCHAR(10) NULL,
    VnpayPayDate VARCHAR(20) NULL,
    VnpayOrderInfo NVARCHAR(500) NULL,
    VnpayRawData NVARCHAR(MAX) NULL,
    FinancialReviewedBy VARCHAR(50) NULL,
    FinancialReviewedAtUtc DATETIME2(7) NULL,
    FinancialReviewNotes NVARCHAR(1000) NULL,
    CONSTRAINT PK_Payment PRIMARY KEY (PaymentID),
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY (InvoiceID) REFERENCES INVOICE(InvoiceID),
    CONSTRAINT FK_Payment_ConfirmedBy FOREIGN KEY (ConfirmedByUserID) REFERENCES [USER](UserID)
);
GO

-- 6. Bảng COST_RATE: Đơn giá định mức các nhóm chi phí (VND)
CREATE TABLE COST_RATE (
    CostRateID VARCHAR(50) NOT NULL CONSTRAINT PK_COST_RATE PRIMARY KEY,
    Code VARCHAR(50) NOT NULL CONSTRAINT UQ_COST_RATE_Code UNIQUE,
    CostGroup VARCHAR(20) NOT NULL,
    CalculationUnit VARCHAR(40) NOT NULL,
    Rate DECIMAL(18,6) NOT NULL,
    CurrencyCode VARCHAR(3) NOT NULL CONSTRAINT DF_COST_RATE_Currency DEFAULT 'VND',
    IsActive BIT NOT NULL CONSTRAINT DF_COST_RATE_Active DEFAULT 1,
    CONSTRAINT CK_COST_RATE_Value CHECK (Rate>0 AND (Code<>'INSURANCE_RATE' OR Rate<=1)),
    CONSTRAINT CK_COST_RATE_Currency CHECK (CurrencyCode='VND'),
    CONSTRAINT CK_COST_RATE_Group CHECK (CostGroup IN ('TRANSPORT','CREW','PERMIT','VET','INSURANCE'))
);
GO

CREATE SEQUENCE dbo.[SEQ_COST_RATE_ID] AS BIGINT START WITH 11 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[COST_RATE] ADD CONSTRAINT [DF_COST_RATE_ID] DEFAULT ('COST_RATE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_COST_RATE_ID], '000', 'en-US')) FOR [CostRateID];
GO

-- 7. Bảng TRIP_SETTLEMENT: Quyết toán toàn bộ chuyến đi
CREATE TABLE TRIP_SETTLEMENT (
    SettlementID VARCHAR(50) NOT NULL,
    ContractID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    ContractVersionNo INT NOT NULL,
    HandoverRevisionID VARCHAR(50) NULL,
    FinalInvoiceID VARCHAR(50) NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
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
GO

CREATE SEQUENCE dbo.[SEQ_TRIP_SETTLEMENT_ID] AS BIGINT START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[TRIP_SETTLEMENT] ADD CONSTRAINT [DF_TRIP_SETTLEMENT_ID] DEFAULT ('SETTLEMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_SETTLEMENT_ID], '000', 'en-US')) FOR [SettlementID];
GO

-- 8. Bảng SETTLEMENT_ADJUSTMENT: Điều chỉnh số tiền quyết toán (Giảm trừ, Phạt, Bồi thường, Hoàn tiền)
CREATE TABLE SETTLEMENT_ADJUSTMENT (
    AdjustmentID VARCHAR(50) NOT NULL,
    SettlementID VARCHAR(50) NOT NULL,
    IncidentID VARCHAR(50) NULL,
    CostItemID VARCHAR(50) NULL,
    OriginalInvoiceID VARCHAR(50) NOT NULL,
    AdjustedInvoiceID VARCHAR(50) NULL,
    AppliedAtUtc DATETIME2(7) NULL,
    AdjustmentType VARCHAR(20) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    EvidenceUrl NVARCHAR(500) NULL,
    RefundStatus VARCHAR(20) NULL,
    RefundedBy VARCHAR(50) NULL,
    RefundedAtUtc DATETIME2(7) NULL,
    RefundReference VARCHAR(100) NULL,
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
GO

CREATE SEQUENCE dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID] AS BIGINT START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[SETTLEMENT_ADJUSTMENT] ADD CONSTRAINT [DF_SETTLEMENT_ADJUSTMENT_ID] DEFAULT ('SETTLEMENT_ADJUSTMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID], '000', 'en-US')) FOR [AdjustmentID];
GO
CREATE UNIQUE INDEX UX_F6_ActualCostAdjustment ON SETTLEMENT_ADJUSTMENT(CostItemID) WHERE CostItemID IS NOT NULL;
GO

-- 9. Bảng CUSTOMER_CASE: Quản lý khiếu nại, hỗ trợ khách hàng sau chuyến đi
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
GO

CREATE SEQUENCE dbo.[SEQ_CUSTOMER_CASE_ID] AS BIGINT START WITH 2 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[CUSTOMER_CASE] ADD CONSTRAINT [DF_CUSTOMER_CASE_ID] DEFAULT ('CUSTOMER_CASE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_CASE_ID], '000', 'en-US')) FOR [CaseID];
GO
CREATE INDEX IX_F6_CaseQueue ON CUSTOMER_CASE(SettlementID, CaseType, Status);
GO

-- 10. Bảng CUSTOMER_FEEDBACK: Đánh giá chất lượng dịch vụ của khách hàng
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
GO

CREATE SEQUENCE dbo.[SEQ_CUSTOMER_FEEDBACK_ID] AS BIGINT START WITH 2 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[CUSTOMER_FEEDBACK] ADD CONSTRAINT [DF_CUSTOMER_FEEDBACK_ID] DEFAULT ('CUSTOMER_FEEDBACK_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CUSTOMER_FEEDBACK_ID], '000', 'en-US')) FOR [FeedbackID];
GO

-- Triggers bảo vệ tính toàn vẹn nghiệp vụ Flow 6
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

