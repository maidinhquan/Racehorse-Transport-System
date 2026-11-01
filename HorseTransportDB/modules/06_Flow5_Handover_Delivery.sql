-- =============================================================================
-- MODULE 06: FLOW 5 - GIAO NHẬN & BÀN GIAO ĐÍCH (HANDOVER & DELIVERY)
-- Phân vùng: Biên bản giao nhận tại chuồng đi/đến và kiểm tra mã chip cá thể
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng HANDOVER: Biên bản tiếp nhận (PICKUP) và giao ngựa (DELIVERY)
CREATE TABLE HANDOVER (
    HandoverID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    HandedByUserID VARCHAR(50) NOT NULL,
    Type VARCHAR(50) NULL, -- PICKUP / DELIVERY
    LocationName NVARCHAR(255) NULL,
    ReceiverName NVARCHAR(100) NULL,
    ReceiverPhone VARCHAR(20) NULL,
    IsAuthorized BIT NULL,
    Status VARCHAR(50) NULL,
    CONSTRAINT PK_Handover PRIMARY KEY (HandoverID),
    CONSTRAINT FK_Handover_Trip FOREIGN KEY (TripID) REFERENCES TRIP_PLAN(TripID),
    CONSTRAINT FK_Handover_HandedBy FOREIGN KEY (HandedByUserID) REFERENCES [USER](UserID)
);
GO

-- 2. Bảng HANDOVER_ITEM: Chi tiết kiểm tra đối soát từng cá thể ngựa & tài sản đi kèm
CREATE TABLE HANDOVER_ITEM (
    HandoverItemID VARCHAR(50) NOT NULL,
    HandoverID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    MicrochipVerified BIT NOT NULL DEFAULT 0,
    ConditionStatus NVARCHAR(100) NULL,
    AssetCheck NVARCHAR(MAX) NULL,
    PhotoUrl VARCHAR(500) NULL,
    CONSTRAINT PK_HandoverItem PRIMARY KEY (HandoverItemID),
    CONSTRAINT FK_HandoverItem_Handover FOREIGN KEY (HandoverID) REFERENCES HANDOVER(HandoverID),
    CONSTRAINT FK_HandoverItem_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);
GO

