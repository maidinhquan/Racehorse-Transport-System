-- =============================================================================
-- MODULE 07: FLOW 6 - HỢP ĐỒNG, CHI PHÍ & THANH TOÁN (CONTRACT & BILLING)
-- Phân vùng: Hợp đồng vận chuyển, Bóc tách chi phí thực tế, Hóa đơn & Giao dịch
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng CONTRACT: Hợp đồng vận chuyển với khách hàng (Đa tiền tệ)
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
GO

-- 2. Bảng COST_ITEM: Các khoản mục chi phí thực tế phát sinh (Nhiên liệu, trạm, sự cố, thú y)
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
GO

-- 3. Bảng INVOICE: Hóa đơn thanh toán theo từng đợt (Cọc, Quyết toán cuối)
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
GO

-- 4. Bảng PAYMENT: Giao dịch thanh toán thực tế (Cổng thanh toán hoặc Chuyển khoản)
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
GO

