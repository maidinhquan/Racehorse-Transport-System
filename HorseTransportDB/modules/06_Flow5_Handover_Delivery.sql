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
    DocumentsHandedOver NVARCHAR(2000) NULL,
    DocumentsReceivedAtUtc DATETIME2(7) NULL,
    CONSTRAINT PK_HandoverItem PRIMARY KEY (HandoverItemID),
    CONSTRAINT FK_HandoverItem_Handover FOREIGN KEY (HandoverID) REFERENCES HANDOVER(HandoverID),
    CONSTRAINT FK_HandoverItem_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);
GO

ALTER TABLE HANDOVER ADD CONSTRAINT UQ_F6_HandoverTrip UNIQUE (HandoverID, TripID);
GO

-- 3. Bảng HANDOVER_REVISION: Lịch sử phiên bản biên bản bàn giao & xác thực OTP
CREATE TABLE HANDOVER_REVISION (
    HandoverRevisionID VARCHAR(50) NOT NULL,
    HandoverID VARCHAR(50) NOT NULL,
    TripID VARCHAR(50) NOT NULL,
    RevisionNo INT NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    ContentSnapshot NVARCHAR(MAX) NOT NULL,
    OtpEmail VARCHAR(254) NULL,
    OtpHash VARCHAR(64) NULL,
    OtpSentAtUtc DATETIME2(7) NULL,
    OtpExpiresAtUtc DATETIME2(7) NULL,
    OtpFailedAttempts INT NOT NULL DEFAULT 0,
    ConfirmedAtUtc DATETIME2(7) NULL,
    RefusalReason NVARCHAR(2000) NULL,
    RefusedAtUtc DATETIME2(7) NULL,
    CreatedBy VARCHAR(50) NOT NULL,
    CreatedAtUtc DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_HandoverRevision PRIMARY KEY (HandoverRevisionID),
    CONSTRAINT UQ_F6_HandoverRevisionNo UNIQUE (HandoverID, RevisionNo),
    CONSTRAINT UQ_F6_HandoverRevisionTrip UNIQUE (HandoverRevisionID, TripID),
    CONSTRAINT FK_F6_RevisionHandover FOREIGN KEY (HandoverID, TripID) REFERENCES HANDOVER(HandoverID, TripID),
    CONSTRAINT FK_F6_RevisionCreator FOREIGN KEY (CreatedBy) REFERENCES [USER](UserID),
    CONSTRAINT CK_F6_RevisionNo CHECK (RevisionNo>0 AND OtpFailedAttempts>=0),
    CONSTRAINT CK_F6_RevisionJson CHECK (ISJSON(ContentSnapshot)=1),
    CONSTRAINT CK_F6_RevisionStatus CHECK (Status IN ('DRAFT','AWAITING_OTP','CONFIRMED','REFUSED')),
    CONSTRAINT CK_F6_RevisionOtpHash CHECK (OtpHash IS NULL OR (LEN(OtpHash)=64 AND OtpHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2)),
    CONSTRAINT CK_F6_RevisionPhase CHECK (
        (Status='DRAFT' AND OtpEmail IS NULL AND OtpHash IS NULL AND OtpSentAtUtc IS NULL AND OtpExpiresAtUtc IS NULL AND OtpFailedAttempts=0 AND ConfirmedAtUtc IS NULL AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='AWAITING_OTP' AND OtpEmail IS NOT NULL AND LEN(LTRIM(RTRIM(OtpEmail)))>0 AND OtpHash IS NOT NULL AND OtpSentAtUtc IS NOT NULL AND OtpSentAtUtc>=CreatedAtUtc AND OtpExpiresAtUtc IS NOT NULL AND OtpExpiresAtUtc>OtpSentAtUtc AND ConfirmedAtUtc IS NULL AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='CONFIRMED' AND OtpEmail IS NOT NULL AND LEN(LTRIM(RTRIM(OtpEmail)))>0 AND OtpHash IS NULL AND OtpSentAtUtc IS NOT NULL AND OtpSentAtUtc>=CreatedAtUtc AND OtpExpiresAtUtc IS NOT NULL AND OtpExpiresAtUtc>OtpSentAtUtc AND ConfirmedAtUtc IS NOT NULL AND ConfirmedAtUtc>=OtpSentAtUtc AND ConfirmedAtUtc<OtpExpiresAtUtc AND RefusalReason IS NULL AND RefusedAtUtc IS NULL)
        OR (Status='REFUSED' AND OtpEmail IS NULL AND OtpHash IS NULL AND OtpSentAtUtc IS NULL AND OtpExpiresAtUtc IS NULL AND OtpFailedAttempts=0 AND ConfirmedAtUtc IS NULL AND RefusalReason IS NOT NULL AND LEN(LTRIM(RTRIM(RefusalReason)))>0 AND RefusedAtUtc IS NOT NULL AND RefusedAtUtc>=CreatedAtUtc))
);
GO

CREATE SEQUENCE dbo.[SEQ_HANDOVER_REVISION_ID] AS BIGINT START WITH 3 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE NO CYCLE CACHE 50;
GO
ALTER TABLE dbo.[HANDOVER_REVISION] ADD CONSTRAINT [DF_HANDOVER_REVISION_ID] DEFAULT ('HANDOVER_REVISION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HANDOVER_REVISION_ID], '000', 'en-US')) FOR [HandoverRevisionID];
GO

CREATE TRIGGER TR_F6_HandoverRevisionImmutable ON HANDOVER_REVISION AFTER UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(HandoverRevisionID) AND EXISTS (SELECT 1 FROM deleted)
        THROW 51068, 'Handover revision ID is immutable.', 1;
    IF EXISTS (SELECT 1 FROM deleted WHERE Status IN ('CONFIRMED','REFUSED'))
        THROW 51060, 'Finalized handover revision is immutable; create a new revision.', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.HandoverRevisionID=d.HandoverRevisionID WHERE d.Status='AWAITING_OTP' AND i.Status<>'DRAFT' AND (CONVERT(VARBINARY(MAX),d.ContentSnapshot)<>CONVERT(VARBINARY(MAX),i.ContentSnapshot) OR i.HandoverID<>d.HandoverID OR i.TripID<>d.TripID OR i.RevisionNo<>d.RevisionNo OR (i.Status IN ('AWAITING_OTP','CONFIRMED') AND ISNULL(i.OtpEmail,'')<>ISNULL(d.OtpEmail,''))))
        THROW 51066, 'Invalidate OTP and return to DRAFT before changing signed content or recipient.', 1;
END;
GO

CREATE TRIGGER TR_F6_HandoverItemsLocked ON HANDOVER_ITEM AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM (SELECT HandoverID FROM inserted UNION SELECT HandoverID FROM deleted) d JOIN HANDOVER_REVISION r ON r.HandoverID=d.HandoverID WHERE r.Status IN ('AWAITING_OTP','CONFIRMED','REFUSED') AND NOT EXISTS (SELECT 1 FROM HANDOVER_REVISION newer WHERE newer.HandoverID=r.HandoverID AND newer.RevisionNo>r.RevisionNo))
        THROW 51061, 'Handover items/documents are locked by the latest OTP revision.', 1;
END;
GO

