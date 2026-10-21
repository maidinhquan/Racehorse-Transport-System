-- Final Flow 1 schema. Run against the selected database after the base schema.
-- Test data may be normalized. Does not reset other flows or USER.ResetOtpCode.
-- Schema initialization is explicit; the backend never runs this script on startup.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
BEGIN TRY
BEGIN TRANSACTION;
DECLARE @lock int,@sql nvarchar(max);
EXEC @lock=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Relational',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
IF @lock<0 THROW 51700,'Flow 1 is busy; retry schema initialization.',1;

-- Replace only the Flow 1 checks with their final definitions.
SELECT @sql=STRING_AGG(CONVERT(nvarchar(max),'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(parent_object_id))+' DROP CONSTRAINT '+QUOTENAME(name)),N';')
FROM sys.check_constraints WHERE name LIKE 'CK_F1%';
IF @sql IS NOT NULL EXEC sys.sp_executesql @sql;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_F1_Manager') ALTER TABLE TRANSPORT_REQUEST DROP CONSTRAINT FK_F1_Manager;
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('CONTRACT') AND name='UX_F1S_CurrentContract') DROP INDEX UX_F1S_CurrentContract ON CONTRACT;

-- Add the fields used by the current backend.
IF COL_LENGTH('dbo.HORSE','PassportIssuedBy') IS NULL ALTER TABLE [HORSE] ADD [PassportIssuedBy] NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.HORSE','PassportIssuedDate') IS NULL ALTER TABLE [HORSE] ADD [PassportIssuedDate] DATE NULL;
IF COL_LENGTH('dbo.HORSE','PassportExpiryDate') IS NULL ALTER TABLE [HORSE] ADD [PassportExpiryDate] DATE NULL;
IF COL_LENGTH('dbo.HORSE','OwnershipCertificateFileUrl') IS NULL ALTER TABLE [HORSE] ADD [OwnershipCertificateFileUrl] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HORSE','ValuationDocumentFileUrl') IS NULL ALTER TABLE [HORSE] ADD [ValuationDocumentFileUrl] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HORSE','DeclaredValueVnd') IS NULL ALTER TABLE [HORSE] ADD [DeclaredValueVnd] DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.HORSE','SpecialHealthNotes') IS NULL ALTER TABLE [HORSE] ADD [SpecialHealthNotes] NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupStableName') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [PickupStableName] NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupPostalCode') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [PickupPostalCode] NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupInstructions') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [PickupInstructions] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryStableName') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [DeliveryStableName] NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryPostalCode') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [DeliveryPostalCode] NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryInstructions') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [DeliveryInstructions] NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','InvitationLetterFileUrl') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [InvitationLetterFileUrl] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','CompetitionRegistrationFileUrl') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [CompetitionRegistrationFileUrl] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','AtaCarnetFileUrl') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [AtaCarnetFileUrl] NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','CareInstructions') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [CareInstructions] NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeclaredValueVnd') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD [DeclaredValueVnd] DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.REQUEST_HORSE_MAPPING','CareInstructions') IS NULL ALTER TABLE [REQUEST_HORSE_MAPPING] ADD [CareInstructions] NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.HORSE','PhotoUrl') IS NULL ALTER TABLE [HORSE] ADD PhotoUrl NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HORSE','PassportScanUrl') IS NULL ALTER TABLE [HORSE] ADD PassportScanUrl NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HORSE','RowVersion') IS NULL ALTER TABLE [HORSE] ADD RowVersion ROWVERSION NOT NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupLatitude') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD PickupLatitude DECIMAL(9,6) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupLongitude') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD PickupLongitude DECIMAL(9,6) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryLatitude') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD DeliveryLatitude DECIMAL(9,6) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryLongitude') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD DeliveryLongitude DECIMAL(9,6) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DistanceKm') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD DistanceKm DECIMAL(10,2) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupContactName') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD PickupContactName NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupContactPhone') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD PickupContactPhone VARCHAR(20) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','ManagerNotes') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD ManagerNotes NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','OriginCountry') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD OriginCountry VARCHAR(2) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DestinationCountry') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD DestinationCountry VARCHAR(2) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','PreparationDays') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD PreparationDays INT NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','RowVersion') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD RowVersion ROWVERSION NOT NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeclaredValueUsd') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD DeclaredValueUsd DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','SubmissionKeyHash') IS NULL ALTER TABLE [TRANSPORT_REQUEST] ADD SubmissionKeyHash VARCHAR(64) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','DeploymentStatus') IS NULL ALTER TABLE [TRIP_PLAN] ADD DeploymentStatus VARCHAR(12) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','DeploymentReason') IS NULL ALTER TABLE [TRIP_PLAN] ADD DeploymentReason NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','DeploymentBy') IS NULL ALTER TABLE [TRIP_PLAN] ADD DeploymentBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','DeploymentAtUtc') IS NULL ALTER TABLE [TRIP_PLAN] ADD DeploymentAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','HandoffEventId') IS NULL ALTER TABLE [TRIP_PLAN] ADD HandoffEventId VARCHAR(50) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','RowVersion') IS NULL ALTER TABLE [TRIP_PLAN] ADD RowVersion ROWVERSION NOT NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','AssignedSpecialistId') IS NULL ALTER TABLE [TRIP_PLAN] ADD AssignedSpecialistId VARCHAR(50) NULL;
IF COL_LENGTH('dbo.TRIP_PLAN','AssignedCoordinatorId') IS NULL ALTER TABLE [TRIP_PLAN] ADD AssignedCoordinatorId VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','RequestID') IS NULL ALTER TABLE [CONTRACT] ADD RequestID VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','CompletionDeadline') IS NULL ALTER TABLE [CONTRACT] ADD CompletionDeadline DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','PdfUrl') IS NULL ALTER TABLE [CONTRACT] ADD PdfUrl VARCHAR(500) NULL;
IF COL_LENGTH('dbo.CONTRACT','SignOtpHash') IS NULL ALTER TABLE [CONTRACT] ADD SignOtpHash VARCHAR(255) NULL;
IF COL_LENGTH('dbo.CONTRACT','SignOtpExpiry') IS NULL ALTER TABLE [CONTRACT] ADD SignOtpExpiry DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','SignOtpFailedAttempts') IS NULL ALTER TABLE [CONTRACT] ADD SignOtpFailedAttempts INT NOT NULL CONSTRAINT DF_F1S_CONTRACT_SignOtpFailedAttempts DEFAULT ((0));
IF COL_LENGTH('dbo.CONTRACT','DepositAmount') IS NULL ALTER TABLE [CONTRACT] ADD DepositAmount DECIMAL(12,2) NULL;
IF COL_LENGTH('dbo.CONTRACT','PdfSha256') IS NULL ALTER TABLE [CONTRACT] ADD PdfSha256 CHAR(64) NULL;
IF COL_LENGTH('dbo.CONTRACT','SignOtpSentAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD SignOtpSentAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','SignerEmail') IS NULL ALTER TABLE [CONTRACT] ADD SignerEmail VARCHAR(255) NULL;
IF COL_LENGTH('dbo.CONTRACT','PublishedAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD PublishedAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','PublishedBy') IS NULL ALTER TABLE [CONTRACT] ADD PublishedBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','LastExtensionReason') IS NULL ALTER TABLE [CONTRACT] ADD LastExtensionReason NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.CONTRACT','LastExtensionBy') IS NULL ALTER TABLE [CONTRACT] ADD LastExtensionBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','LastExtensionAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD LastExtensionAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationId') IS NULL ALTER TABLE [CONTRACT] ADD CancellationId VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationStatus') IS NULL ALTER TABLE [CONTRACT] ADD CancellationStatus VARCHAR(12) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationReason') IS NULL ALTER TABLE [CONTRACT] ADD CancellationReason NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationRequestedAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD CancellationRequestedAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationDecisionReason') IS NULL ALTER TABLE [CONTRACT] ADD CancellationDecisionReason NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationDecidedBy') IS NULL ALTER TABLE [CONTRACT] ADD CancellationDecidedBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.CONTRACT','CancellationDecidedAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD CancellationDecidedAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','RowVersion') IS NULL ALTER TABLE [CONTRACT] ADD RowVersion ROWVERSION NOT NULL;
IF COL_LENGTH('dbo.CONTRACT','CustomerFeedback') IS NULL ALTER TABLE [CONTRACT] ADD CustomerFeedback NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.CONTRACT','FeedbackFields') IS NULL ALTER TABLE [CONTRACT] ADD FeedbackFields VARCHAR(200) NULL;
IF COL_LENGTH('dbo.CONTRACT','FeedbackStatus') IS NULL ALTER TABLE [CONTRACT] ADD FeedbackStatus VARCHAR(20) NULL;
IF COL_LENGTH('dbo.CONTRACT','FeedbackAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD FeedbackAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','ManagerFeedback') IS NULL ALTER TABLE [CONTRACT] ADD ManagerFeedback NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.CONTRACT','FeedbackHandledAtUtc') IS NULL ALTER TABLE [CONTRACT] ADD FeedbackHandledAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.CONTRACT','RefundAmount') IS NULL ALTER TABLE [CONTRACT] ADD RefundAmount DECIMAL(12,2) NULL;
IF COL_LENGTH('dbo.CONTRACT','RefundStatus') IS NULL ALTER TABLE [CONTRACT] ADD RefundStatus VARCHAR(20) NULL;
IF COL_LENGTH('dbo.CONTRACT','RefundReference') IS NULL ALTER TABLE [CONTRACT] ADD RefundReference VARCHAR(100) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayBankCode') IS NULL ALTER TABLE [PAYMENT] ADD VnpayBankCode VARCHAR(50) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayResponseCode') IS NULL ALTER TABLE [PAYMENT] ADD VnpayResponseCode VARCHAR(10) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayTransactionStatus') IS NULL ALTER TABLE [PAYMENT] ADD VnpayTransactionStatus VARCHAR(10) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayTmnCode') IS NULL ALTER TABLE [PAYMENT] ADD VnpayTmnCode VARCHAR(8) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayCreatedAtUtc') IS NULL ALTER TABLE [PAYMENT] ADD VnpayCreatedAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayExpiresAtUtc') IS NULL ALTER TABLE [PAYMENT] ADD VnpayExpiresAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.PAYMENT','VnpayReceivedAmount') IS NULL ALTER TABLE [PAYMENT] ADD VnpayReceivedAmount DECIMAL(12,2) NULL;
IF COL_LENGTH('dbo.PAYMENT','FinancialReviewRequired') IS NULL ALTER TABLE [PAYMENT] ADD FinancialReviewRequired BIT NOT NULL CONSTRAINT DF_F1S_PAYMENT_FinancialReviewRequired DEFAULT ((0));
IF COL_LENGTH('dbo.PAYMENT','FinancialReviewReason') IS NULL ALTER TABLE [PAYMENT] ADD FinancialReviewReason NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.PAYMENT','FinancialReviewedBy') IS NULL ALTER TABLE [PAYMENT] ADD FinancialReviewedBy VARCHAR(50) NULL;
IF COL_LENGTH('dbo.PAYMENT','FinancialReviewedAtUtc') IS NULL ALTER TABLE [PAYMENT] ADD FinancialReviewedAtUtc DATETIME2(7) NULL;
IF COL_LENGTH('dbo.PAYMENT','RowVersion') IS NULL ALTER TABLE [PAYMENT] ADD RowVersion ROWVERSION NOT NULL;

-- One contract per request and one shared deadline.
EXEC(N'UPDATE c SET RequestID=t.RequestID FROM CONTRACT c JOIN TRIP_PLAN t ON t.TripID=c.TripID WHERE c.RequestID IS NULL;');
ALTER TABLE CONTRACT ALTER COLUMN RequestID varchar(50) NOT NULL;
ALTER TABLE CONTRACT ALTER COLUMN TripID varchar(50) NULL;
IF COL_LENGTH('CONTRACT','EffectiveSignDeadline') IS NOT NULL EXEC(N'UPDATE CONTRACT SET CompletionDeadline=EffectiveSignDeadline WHERE EffectiveSignDeadline IS NOT NULL;');
-- Test contracts from the retired signing flow use the shared deadline after normalization.
EXEC(N'UPDATE CONTRACT SET CompletionDeadline=DATEADD(day,1,SignedAt) WHERE PublishedAtUtc IS NOT NULL AND SignedAt>=CompletionDeadline;');
IF COL_LENGTH('CONTRACT','CompletionDeadline') IS NOT NULL EXEC(N'UPDATE i SET DueDate=c.CompletionDeadline FROM INVOICE i JOIN CONTRACT c ON c.ContractID=i.ContractID WHERE i.InvoiceType=''DEPOSIT'' AND c.CompletionDeadline IS NOT NULL AND (i.DueDate IS NULL OR i.DueDate<>c.CompletionDeadline);');

-- Remove retired fields and any defaults attached to them.
SET @sql=NULL;
SELECT @sql=STRING_AGG(CONVERT(nvarchar(max),'ALTER TABLE dbo.'+QUOTENAME(v.T)+' DROP CONSTRAINT '+QUOTENAME(d.name)),N';')
FROM (VALUES ('CONTRACT_TEMPLATE','Version'),('CONTRACT','LastExtensionTarget'),('CONTRACT','BaseContractPrice_P'),('CONTRACT','ExchangeRateToLocal'),('CONTRACT','ActualGrossProfit_AGP'),('CONTRACT','EffectiveSignDeadline'),('CONTRACT','DepositDeadline'),('CONTRACT','SignedDepositDeadline'),('CONTRACT','IsCurrent'),('TRANSPORT_REQUEST','AssignedManagerId'),('TRANSPORT_REQUEST','ReviewedAtUtc'),('TRIP_PLAN','RoutingAcknowledgedBy'),('TRIP_PLAN','RoutingAcknowledgedAtUtc'),('TRIP_PLAN','DocumentsAcknowledgedBy'),('TRIP_PLAN','DocumentsAcknowledgedAtUtc')) v(T,C)
JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+v.T) AND c.name=v.C JOIN sys.default_constraints d ON d.object_id=c.default_object_id;
IF @sql IS NOT NULL EXEC sys.sp_executesql @sql;
IF COL_LENGTH('dbo.CONTRACT_TEMPLATE','Version') IS NOT NULL ALTER TABLE [CONTRACT_TEMPLATE] DROP COLUMN Version;
IF COL_LENGTH('dbo.CONTRACT','LastExtensionTarget') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN LastExtensionTarget;
IF COL_LENGTH('dbo.CONTRACT','BaseContractPrice_P') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN BaseContractPrice_P;
IF COL_LENGTH('dbo.CONTRACT','ExchangeRateToLocal') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN ExchangeRateToLocal;
IF COL_LENGTH('dbo.CONTRACT','ActualGrossProfit_AGP') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN ActualGrossProfit_AGP;
IF COL_LENGTH('dbo.CONTRACT','EffectiveSignDeadline') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN EffectiveSignDeadline;
IF COL_LENGTH('dbo.CONTRACT','DepositDeadline') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN DepositDeadline;
IF COL_LENGTH('dbo.CONTRACT','SignedDepositDeadline') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN SignedDepositDeadline;
IF COL_LENGTH('dbo.CONTRACT','IsCurrent') IS NOT NULL ALTER TABLE [CONTRACT] DROP COLUMN IsCurrent;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','AssignedManagerId') IS NOT NULL ALTER TABLE [TRANSPORT_REQUEST] DROP COLUMN AssignedManagerId;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','ReviewedAtUtc') IS NOT NULL ALTER TABLE [TRANSPORT_REQUEST] DROP COLUMN ReviewedAtUtc;
IF COL_LENGTH('dbo.TRIP_PLAN','RoutingAcknowledgedBy') IS NOT NULL ALTER TABLE [TRIP_PLAN] DROP COLUMN RoutingAcknowledgedBy;
IF COL_LENGTH('dbo.TRIP_PLAN','RoutingAcknowledgedAtUtc') IS NOT NULL ALTER TABLE [TRIP_PLAN] DROP COLUMN RoutingAcknowledgedAtUtc;
IF COL_LENGTH('dbo.TRIP_PLAN','DocumentsAcknowledgedBy') IS NOT NULL ALTER TABLE [TRIP_PLAN] DROP COLUMN DocumentsAcknowledgedBy;
IF COL_LENGTH('dbo.TRIP_PLAN','DocumentsAcknowledgedAtUtc') IS NOT NULL ALTER TABLE [TRIP_PLAN] DROP COLUMN DocumentsAcknowledgedAtUtc;

-- Pricing catalogue (the only additional table).
IF OBJECT_ID('dbo.COST_RATE','U') IS NULL
CREATE TABLE COST_RATE (
    CostRateID varchar(50) NOT NULL CONSTRAINT PK_COST_RATE PRIMARY KEY,
    Code varchar(50) NOT NULL CONSTRAINT UQ_COST_RATE_Code UNIQUE,
    CostGroup varchar(20) NOT NULL,
    CalculationUnit varchar(40) NOT NULL,
    Rate decimal(18,6) NOT NULL,
    CurrencyCode varchar(3) NOT NULL CONSTRAINT DF_COST_RATE_Currency DEFAULT 'VND',
    IsActive bit NOT NULL CONSTRAINT DF_COST_RATE_Active DEFAULT 1,
    RowVersion rowversion NOT NULL,
    CONSTRAINT CK_COST_RATE_Value CHECK (Rate>0 AND (Code<>'INSURANCE_RATE' OR Rate<=1)),
    CONSTRAINT CK_COST_RATE_Currency CHECK (CurrencyCode='VND'),
    CONSTRAINT CK_COST_RATE_Group CHECK (CostGroup IN ('TRANSPORT','CREW','PERMIT','VET','INSURANCE'))
 );

-- Stop on an incompatible field instead of allowing a runtime EF conversion error.
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('TRANSPORT_REQUEST') AND name='DistanceKm' AND TYPE_NAME(user_type_id)='decimal' AND precision=10 AND scale=2) THROW 51203,'DistanceKm must be decimal(10,2).',1;
IF COL_LENGTH('TRANSPORT_REQUEST','ManagerNotes')<>2000 THROW 51203,'ManagerNotes must be nvarchar(1000).',1;
IF COL_LENGTH('CONTRACT','RefundAmount')<>9 OR NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name='RefundAmount' AND TYPE_NAME(user_type_id)='decimal' AND precision=12 AND scale=2) THROW 51703,'RefundAmount must be decimal(12,2).',1;

-- Final foreign keys, checks and indexes are compiled after the column changes.
EXEC sys.sp_executesql N'
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1W_HORSE_OwnershipCertificateFileUrl CHECK ([OwnershipCertificateFileUrl] IS NULL OR ([OwnershipCertificateFileUrl] LIKE ''private/%'' AND LEN([OwnershipCertificateFileUrl])>8));
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1W_HORSE_ValuationDocumentFileUrl CHECK ([ValuationDocumentFileUrl] IS NULL OR ([ValuationDocumentFileUrl] LIKE ''private/%'' AND LEN([ValuationDocumentFileUrl])>8));
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1W_HORSE_DeclaredValueVnd CHECK ([DeclaredValueVnd] IS NULL OR ([DeclaredValueVnd]>0 AND [DeclaredValueVnd]<=9999999999 AND [DeclaredValueVnd]=ROUND([DeclaredValueVnd],0)));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1W_TRANSPORT_REQUEST_InvitationLetterFileUrl CHECK ([InvitationLetterFileUrl] IS NULL OR ([InvitationLetterFileUrl] LIKE ''private/%'' AND LEN([InvitationLetterFileUrl])>8));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1W_TRANSPORT_REQUEST_CompetitionRegistrationFileUrl CHECK ([CompetitionRegistrationFileUrl] IS NULL OR ([CompetitionRegistrationFileUrl] LIKE ''private/%'' AND LEN([CompetitionRegistrationFileUrl])>8));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1W_TRANSPORT_REQUEST_AtaCarnetFileUrl CHECK ([AtaCarnetFileUrl] IS NULL OR ([AtaCarnetFileUrl] LIKE ''private/%'' AND LEN([AtaCarnetFileUrl])>8));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1W_TRANSPORT_REQUEST_DeclaredValueVnd CHECK ([DeclaredValueVnd] IS NULL OR ([DeclaredValueVnd]>0 AND [DeclaredValueVnd]<=9999999999 AND [DeclaredValueVnd]=ROUND([DeclaredValueVnd],0)));
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1W_HORSE_PassportDates CHECK ([PassportIssuedDate] IS NULL OR [PassportExpiryDate] IS NULL OR [PassportExpiryDate]>[PassportIssuedDate]);
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1S_HORSE_PhotoUrl CHECK ([PhotoUrl] IS NULL OR [PhotoUrl] like ''private/%'' AND len([PhotoUrl])>(8));
ALTER TABLE [HORSE] WITH CHECK ADD CONSTRAINT CK_F1S_HORSE_PassportScanUrl CHECK ([PassportScanUrl] IS NULL OR [PassportScanUrl] like ''private/%'' AND len([PassportScanUrl])>(8));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Pickup CHECK ([PickupLatitude] IS NULL AND [PickupLongitude] IS NULL OR [PickupLatitude] IS NOT NULL AND [PickupLongitude] IS NOT NULL AND ([PickupLatitude]>=(-90) AND [PickupLatitude]<=(90)) AND ([PickupLongitude]>=(-180) AND [PickupLongitude]<=(180)));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Delivery CHECK ([DeliveryLatitude] IS NULL AND [DeliveryLongitude] IS NULL OR [DeliveryLatitude] IS NOT NULL AND [DeliveryLongitude] IS NOT NULL AND ([DeliveryLatitude]>=(-90) AND [DeliveryLatitude]<=(90)) AND ([DeliveryLongitude]>=(-180) AND [DeliveryLongitude]<=(180)));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Distance CHECK ([DistanceKm] IS NULL OR [DistanceKm]>(0));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Route CHECK ([OriginCountry] IS NULL AND [DestinationCountry] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [TransportType] IS NOT NULL AND [OriginCountry]=''VN'' AND ([DestinationCountry]=''VN'' AND [TransportType]=''ROAD'' OR [DestinationCountry]=''JP'' AND [TransportType]=''AIR''));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Preparation CHECK ([PreparationDays] IS NULL OR [OriginCountry] IS NOT NULL AND [DestinationCountry] IS NOT NULL AND [PreparationDays]>=case when [DestinationCountry]=''JP'' then (7) when [DistanceKm]>(500) then (3) else (2) end AND ([DestinationCountry]=''JP'' OR [DistanceKm] IS NOT NULL));
ALTER TABLE [TRANSPORT_REQUEST] WITH CHECK ADD CONSTRAINT CK_F1D_DeclaredValueUsd CHECK ([DeclaredValueUsd] IS NULL OR [DeclaredValueUsd]>(0));
ALTER TABLE [TRIP_PLAN] WITH CHECK ADD CONSTRAINT CK_F1S_TRIP_PLAN_Deployment CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus]=''ON_HOLD'' OR [DeploymentStatus]=''CONFIRMED'' OR [DeploymentStatus]=''PENDING'') AND [DeploymentReason] IS NOT NULL AND [DeploymentBy] IS NOT NULL AND [DeploymentAtUtc] IS NOT NULL AND ([DeploymentStatus]=''CONFIRMED'' AND [HandoffEventId] IS NOT NULL OR ([DeploymentStatus]=''ON_HOLD'' OR [DeploymentStatus]=''PENDING'') AND [HandoffEventId] IS NULL));
ALTER TABLE [TRIP_PLAN] WITH CHECK ADD CONSTRAINT CK_F1Final_Handoff CHECK ([DeploymentStatus] IS NULL OR ([DeploymentStatus]=''CONFIRMED'' OR [DeploymentStatus]=''PENDING''));
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=''FK_F1_Specialist'') ALTER TABLE [TRIP_PLAN] WITH CHECK ADD CONSTRAINT FK_F1_Specialist FOREIGN KEY (AssignedSpecialistId) REFERENCES [USER](UserID);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=''FK_F1_Coordinator'') ALTER TABLE [TRIP_PLAN] WITH CHECK ADD CONSTRAINT FK_F1_Coordinator FOREIGN KEY (AssignedCoordinatorId) REFERENCES [USER](UserID);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_PdfUrl CHECK ([PdfUrl] IS NULL OR [PdfUrl] like ''private/%'' AND len([PdfUrl])>(8));
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Deposit CHECK ([DepositAmount] IS NULL OR [CurrencyCode]=''VND'' AND [TotalQuotedPrice] IS NOT NULL AND [TotalQuotedPrice]>(0) AND [TotalQuotedPrice]=round([TotalQuotedPrice],(0)) AND [DepositRateStandard] IS NOT NULL AND [DepositRateStandard]>(0) AND [DepositRateStandard]<=(100) AND [DepositAmount]>(0) AND [DepositAmount]<=[TotalQuotedPrice] AND [DepositAmount]=round(([TotalQuotedPrice]*[DepositRateStandard])/(100),(0)));
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Pdf CHECK ([PdfUrl] IS NULL AND [PdfSha256] IS NULL OR [PdfUrl] IS NOT NULL AND [PdfSha256] IS NOT NULL AND len([PdfSha256])=(64) AND NOT [PdfSha256] like (''%[^0-9a-f]%'') collate Latin1_General_100_BIN2);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Publication CHECK ([PublishedAtUtc] IS NULL OR [PublishedBy] IS NOT NULL AND [PdfUrl] IS NOT NULL AND [PdfSha256] IS NOT NULL AND [DepositAmount] IS NOT NULL AND [CompletionDeadline] IS NOT NULL);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_OtpAttempts CHECK ([SignOtpFailedAttempts]>=(0) AND [SignOtpFailedAttempts]<=(5));
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Otp CHECK ([SignOtpHash] IS NULL OR len([SignOtpHash])=(64) AND NOT [SignOtpHash] like (''%[^0-9a-f]%'') collate Latin1_General_100_BIN2 AND [SignOtpExpiry] IS NOT NULL AND [SignOtpSentAtUtc] IS NOT NULL AND [SignOtpExpiry]>[SignOtpSentAtUtc] AND [PublishedAtUtc] IS NOT NULL AND [SignedAt] IS NULL);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_SignDeadline CHECK (CompletionDeadline IS NULL OR PublishedAtUtc IS NULL OR CompletionDeadline>PublishedAtUtc);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Signed CHECK (PublishedAtUtc IS NULL OR SignedAt IS NULL OR (SignerEmail IS NOT NULL AND CompletionDeadline IS NOT NULL AND CompletionDeadline>SignedAt AND SignOtpHash IS NULL));
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Extension CHECK ([LastExtensionReason] IS NULL AND [LastExtensionBy] IS NULL AND [LastExtensionAtUtc] IS NULL OR [LastExtensionReason] IS NOT NULL AND [LastExtensionBy] IS NOT NULL AND [LastExtensionAtUtc] IS NOT NULL);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Cancellation CHECK ([CancellationId] IS NULL AND [CancellationStatus] IS NULL AND [CancellationReason] IS NULL AND [CancellationRequestedAtUtc] IS NULL AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR [CancellationId] IS NOT NULL AND [CancellationStatus] IS NOT NULL AND [CancellationReason] IS NOT NULL AND [CancellationRequestedAtUtc] IS NOT NULL AND ([CancellationStatus]=''PENDING'' AND [CancellationDecisionReason] IS NULL AND [CancellationDecidedBy] IS NULL AND [CancellationDecidedAtUtc] IS NULL OR ([CancellationStatus]=''REJECTED'' OR [CancellationStatus]=''APPROVED'') AND [CancellationDecisionReason] IS NOT NULL AND [CancellationDecidedBy] IS NOT NULL AND [CancellationDecidedAtUtc] IS NOT NULL));
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1Final_Feedback CHECK ([FeedbackStatus] IS NULL OR ([FeedbackStatus]=''REJECTED'' OR [FeedbackStatus]=''ACCEPTED'' OR [FeedbackStatus]=''PENDING'') AND [CustomerFeedback] IS NOT NULL AND [FeedbackFields] IS NOT NULL AND [FeedbackAtUtc] IS NOT NULL);
ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT CK_F1Final_Refund CHECK ([RefundStatus] IS NULL AND [RefundAmount] IS NULL AND [RefundReference] IS NULL OR ([RefundStatus]=''COMPLETED'' OR [RefundStatus]=''PROCESSING'' OR [RefundStatus]=''REQUESTED'') AND [RefundAmount]>(0) AND ([RefundStatus]<>''COMPLETED'' OR [RefundReference] IS NOT NULL));
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=''FK_Contract_Request'') ALTER TABLE [CONTRACT] WITH CHECK ADD CONSTRAINT FK_Contract_Request FOREIGN KEY (RequestID) REFERENCES [TRANSPORT_REQUEST](RequestID);
ALTER TABLE [PAYMENT] WITH CHECK ADD CONSTRAINT CK_F1S_PAYMENT_Attempt CHECK ([VnpayTmnCode] IS NULL OR [Method] IS NOT NULL AND [Method]=''VNPAY'' AND [CurrencyCode]=''VND'' AND [Amount]>(0) AND [Amount]=round([Amount],(0)) AND [VnpayCreatedAtUtc] IS NOT NULL AND [VnpayExpiresAtUtc] IS NOT NULL AND [VnpayExpiresAtUtc]>[VnpayCreatedAtUtc] AND ([Status]=''REVIEW_REQUIRED'' OR [Status]=''SUCCESS'' OR [Status]=''FAILED'' OR [Status]=''PENDING_GATEWAY''));
ALTER TABLE [PAYMENT] WITH CHECK ADD CONSTRAINT CK_F1S_PAYMENT_Success CHECK ([VnpayTmnCode] IS NULL OR [Status]<>''SUCCESS'' OR [VnpayResponseCode] IS NOT NULL AND [VnpayResponseCode]=''00'' AND [VnpayTransactionStatus] IS NOT NULL AND [VnpayTransactionStatus]=''00'' AND [TransactionCode] IS NOT NULL AND [VnpayReceivedAmount] IS NOT NULL AND [VnpayReceivedAmount]=[Amount]);
ALTER TABLE [PAYMENT] WITH CHECK ADD CONSTRAINT CK_F1S_PAYMENT_Received CHECK ([VnpayReceivedAmount] IS NULL OR [VnpayReceivedAmount]>(0) AND [VnpayReceivedAmount]=round([VnpayReceivedAmount],(0)));
ALTER TABLE [PAYMENT] WITH CHECK ADD CONSTRAINT CK_F1S_PAYMENT_Review CHECK ([FinancialReviewRequired]=(0) OR [FinancialReviewReason] IS NOT NULL);
ALTER TABLE [PAYMENT] WITH CHECK ADD CONSTRAINT CK_F1S_PAYMENT_Reviewer CHECK ([FinancialReviewedBy] IS NULL AND [FinancialReviewedAtUtc] IS NULL OR [FinancialReviewedBy] IS NOT NULL AND [FinancialReviewedAtUtc] IS NOT NULL);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''INVOICE'') AND name=''UX_INVOICE_ContractID_Deposit'') CREATE UNIQUE INDEX UX_INVOICE_ContractID_Deposit ON [INVOICE] ([ContractID]) WHERE ([InvoiceType]=''DEPOSIT'');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''PAYMENT'') AND name=''UX_F1S_VnpayReceipt'') CREATE UNIQUE INDEX UX_F1S_VnpayReceipt ON [PAYMENT] ([VnpayTmnCode], [TransactionCode]) WHERE ([VnpayTmnCode] IS NOT NULL AND [TransactionCode] IS NOT NULL AND [Status]=''SUCCESS'');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''NOTIFICATION'') AND name=''IX_F1S_OtpBudget'') CREATE INDEX IX_F1S_OtpBudget ON [NOTIFICATION] ([UserID], [Type], [Channel], [SentAt]);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''TRANSPORT_REQUEST'') AND name=''UX_F1N_RequestSubmission'') CREATE UNIQUE INDEX UX_F1N_RequestSubmission ON [TRANSPORT_REQUEST] ([CustomerID], [SubmissionKeyHash]) WHERE ([SubmissionKeyHash] IS NOT NULL);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''TRIP_PLAN'') AND name=''UX_TRIP_PLAN_RequestID'') CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON [TRIP_PLAN] ([RequestID]);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''CONTRACT'') AND name=''IX_CONTRACT_RequestID'') CREATE INDEX IX_CONTRACT_RequestID ON [CONTRACT] ([RequestID]);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''CONTRACT'') AND name=''UX_CONTRACT_RequestID'') CREATE UNIQUE INDEX UX_CONTRACT_RequestID ON [CONTRACT] ([RequestID]);
ALTER INDEX UX_INVOICE_ContractID_Deposit ON [INVOICE] REBUILD;
ALTER INDEX UX_F1S_VnpayReceipt ON [PAYMENT] REBUILD;
ALTER INDEX IX_F1S_OtpBudget ON [NOTIFICATION] REBUILD;
ALTER INDEX UX_F1N_RequestSubmission ON [TRANSPORT_REQUEST] REBUILD;
ALTER INDEX UX_TRIP_PLAN_RequestID ON [TRIP_PLAN] REBUILD;
ALTER INDEX IX_CONTRACT_RequestID ON [CONTRACT] REBUILD;
ALTER INDEX UX_CONTRACT_RequestID ON [CONTRACT] REBUILD;
-- Flow 1: 10 don gia VND; ty le bao hiem 0.5% la gia dinh cua du an.
INSERT INTO COST_RATE (CostRateID, Code, CostGroup, CalculationUnit, Rate, CurrencyCode, IsActive)
SELECT CostRateID, Code, CostGroup, CalculationUnit, Rate, CurrencyCode, IsActive FROM (VALUES
(''rate-ROAD_KM'', ''ROAD_KM'', ''TRANSPORT'', ''KM_VEHICLE'', 200000, ''VND'', 1),
(''rate-AIR_HORSE'', ''AIR_HORSE'', ''TRANSPORT'', ''HORSE'', 3000000, ''VND'', 1),
(''rate-STABLE_NIGHT'', ''STABLE_NIGHT'', ''TRANSPORT'', ''HORSE_NIGHT'', 250000, ''VND'', 1),
(''rate-CREW_DAY'', ''CREW_DAY'', ''CREW'', ''PERSON_DAY'', 300000, ''VND'', 1),
(''rate-PERMIT_TRIP'', ''PERMIT_TRIP'', ''PERMIT'', ''TRIP'', 1000000, ''VND'', 1),
(''rate-PERMIT_HORSE'', ''PERMIT_HORSE'', ''PERMIT'', ''HORSE'', 5000000, ''VND'', 1),
(''rate-VET_DAY'', ''VET_DAY'', ''VET'', ''PERSON_DAY'', 500000, ''VND'', 1),
(''rate-CARE_DAY'', ''CARE_DAY'', ''VET'', ''HORSE_DAY'', 300000, ''VND'', 1),
(''rate-INSURANCE_MIN'', ''INSURANCE_MIN'', ''INSURANCE'', ''TRIP'', 2000000, ''VND'', 1),
(''rate-INSURANCE_RATE'', ''INSURANCE_RATE'', ''INSURANCE'', ''VALUE_RATIO'', 0.005, ''VND'', 1)
) Seed(CostRateID, Code, CostGroup, CalculationUnit, Rate, CurrencyCode, IsActive)
WHERE NOT EXISTS(SELECT 1 FROM COST_RATE existing WHERE existing.CostRateID=Seed.CostRateID);

-- 12 dieu khoan bat buoc: noi dung A-L de cap nhat sau.
INSERT INTO CONTRACT_TEMPLATE (TemplateID, TemplateName, LanguageCode, BodyContent, IsActive, CreatedAt)
SELECT TemplateID, TemplateName, LanguageCode, BodyContent, IsActive, CreatedAt FROM (VALUES
(''flow1-required-clause-01'', N''Điều 1'', ''VI'', N''A'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-02'', N''Điều 2'', ''VI'', N''B'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-03'', N''Điều 3'', ''VI'', N''C'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-04'', N''Điều 4'', ''VI'', N''D'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-05'', N''Điều 5'', ''VI'', N''E'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-06'', N''Điều 6'', ''VI'', N''F'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-07'', N''Điều 7'', ''VI'', N''G'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-08'', N''Điều 8'', ''VI'', N''H'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-09'', N''Điều 9'', ''VI'', N''I'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-10'', N''Điều 10'', ''VI'', N''J'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-11'', N''Điều 11'', ''VI'', N''K'', 1, SYSUTCDATETIME()),
(''flow1-required-clause-12'', N''Điều 12'', ''VI'', N''L'', 1, SYSUTCDATETIME())
) Seed(TemplateID, TemplateName, LanguageCode, BodyContent, IsActive, CreatedAt)
WHERE NOT EXISTS(SELECT 1 FROM CONTRACT_TEMPLATE existing WHERE existing.TemplateID=Seed.TemplateID);

';
COMMIT TRANSACTION;
PRINT N'Final Flow 1 schema ready.';
END TRY
BEGIN CATCH
IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
