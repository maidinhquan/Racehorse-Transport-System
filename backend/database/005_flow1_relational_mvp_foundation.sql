-- A1/B1/C1 additive foundation only; explicit target, never startup.
-- Existing tables/FKs/business data and 004 state are preserved. No runtime cutover/import/drop.
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Schema',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51100,'Flow1 schema lock unavailable.',1;
 IF COL_LENGTH(N'dbo.CONTRACT',N'RequestID') IS NULL OR COL_LENGTH(N'dbo.CONTRACT',N'CompletionDeadline') IS NULL
  OR EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.CONTRACT') AND name=N'TripID' AND is_nullable=0)
  THROW 51101,'Apply and verify migration 003 first; 004 is optional.',1;
 -- Table variables below are migration metadata, not persistent application tables.
 DECLARE @columns TABLE(T sysname,C sysname,D nvarchar(100),B sysname,L int,P int,S int,N bit,V nvarchar(20));
 INSERT @columns VALUES
(N'HORSE',N'PhotoFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'HORSE',N'PhotoSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'HORSE',N'PassportFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'HORSE',N'PassportSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'HORSE',N'DocumentRevision',N'int',N'int',4,0,0,0,N'0'),
(N'HORSE',N'CreationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'HORSE',N'LastDocumentOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'HORSE',N'LastDocumentInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'HORSE',N'RelationalReady',N'bit',N'bit',1,0,0,0,N'0'),
(N'REQUEST_HORSE_MAPPING',N'SnapshotName',N'nvarchar(100)',N'nvarchar',200,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotMicrochip',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotPassportNo',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotBreed',N'nvarchar(100)',N'nvarchar',200,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotSex',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotWeight',N'decimal(10,2)',N'decimal',9,10,2,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'SnapshotDob',N'date',N'date',3,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'PhotoFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'PhotoSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'PassportFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'PassportSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'DocumentRevision',N'int',N'int',4,0,0,1,NULL),
(N'REQUEST_HORSE_MAPPING',N'RelationalReady',N'bit',N'bit',1,0,0,0,N'0'),
(N'TRANSPORT_REQUEST',N'PickupLatitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupLongitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'DeliveryLatitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'DeliveryLongitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'OriginCountry',N'varchar(3)',N'varchar',3,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'DestinationCountry',N'varchar(3)',N'varchar',3,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupContactName',N'nvarchar(100)',N'nvarchar',200,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupContactPhone',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'IsProxyReceiver',N'bit',N'bit',1,0,0,0,N'0'),
(N'TRANSPORT_REQUEST',N'RoadDistanceKm',N'decimal(12,3)',N'decimal',9,12,3,1,NULL),
(N'TRANSPORT_REQUEST',N'MapProvider',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'MapAttribution',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PricingPolicyVersion',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'EstimatedPrice',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRANSPORT_REQUEST',N'EstimatedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ManagerNotes',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ReviewedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ReviewedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'RequestRevision',N'int',N'int',4,0,0,0,N'0'),
(N'TRANSPORT_REQUEST',N'PlanRevision',N'int',N'int',4,0,0,0,N'0'),
(N'TRANSPORT_REQUEST',N'Revision',N'int',N'int',4,0,0,0,N'0'),
(N'TRANSPORT_REQUEST',N'PlannedDepartureAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'MinimumPreparationDays',N'int',N'int',4,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PreparationDays',N'int',N'int',4,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'VehicleCount',N'int',N'int',4,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'StallsRequired',N'int',N'int',4,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PlannedResources',N'nvarchar(100)',N'nvarchar',200,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'DepartureGateway',N'char(3)',N'char',3,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ArrivalGateway',N'char(3)',N'char',3,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'TransportCost',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ProcedureCost',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRANSPORT_REQUEST',N'VeterinaryCareCost',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRANSPORT_REQUEST',N'InsuranceCost',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRANSPORT_REQUEST',N'CreationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'LastOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'LastOperationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'LastOperationAction',N'varchar(30)',N'varchar',30,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'RelationalReady',N'bit',N'bit',1,0,0,0,N'0'),
(N'CONTRACT',N'VersionNumber',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'IsCurrent',N'bit',N'bit',1,0,0,0,N'0'),
(N'CONTRACT',N'Revision',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'RequestRevision',N'int',N'int',4,0,0,1,NULL),
(N'CONTRACT',N'PlanRevision',N'int',N'int',4,0,0,1,NULL),
(N'CONTRACT',N'CreationOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'CreationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'PdfFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'PdfSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'TemplateVersion',N'varchar(30)',N'varchar',30,0,0,1,NULL),
(N'CONTRACT',N'PublishedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'PublishedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'PublicationOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'PublicationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'BankName',N'nvarchar(200)',N'nvarchar',400,0,0,1,NULL),
(N'CONTRACT',N'BankAccount',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'BankBeneficiary',N'nvarchar(200)',N'nvarchar',400,0,0,1,NULL),
(N'CONTRACT',N'BelowFloorReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'CONTRACT',N'EffectiveDeadline',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'DeadlineRevision',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'LastExtensionFrom',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'LastExtendedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'LastExtendedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'LastExtensionReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'CONTRACT',N'OtpChallengeId',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'OtpCodeDigest',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'OtpEmailDigest',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'OtpSentAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'OtpExpiresAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'OtpDeliveryStatus',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'CONTRACT',N'OtpAttempts',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'OtpConsumed',N'bit',N'bit',1,0,0,0,N'0'),
(N'CONTRACT',N'OtpRevoked',N'bit',N'bit',1,0,0,0,N'0'),
(N'CONTRACT',N'OtpDeadlineRevision',N'int',N'int',4,0,0,1,NULL),
(N'CONTRACT',N'OtpNotificationID',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'SignOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'SignInputHmac',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'SignedDeadline',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'SignedDeadlineRevision',N'int',N'int',4,0,0,1,NULL),
(N'CONTRACT',N'SignedChallengeId',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'SignatureMethod',N'varchar(30)',N'varchar',30,0,0,1,NULL),
(N'CONTRACT',N'LastLifecycleAction',N'varchar(30)',N'varchar',30,0,0,1,NULL),
(N'CONTRACT',N'LastLifecycleReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'CONTRACT',N'LastLifecycleBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'LastLifecycleAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'CancellationId',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'CancellationStatus',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'CONTRACT',N'CancellationReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'CONTRACT',N'CancellationRequestedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'CancellationDecisionReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'CONTRACT',N'CancellationDecidedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'CancellationDecidedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'CONTRACT',N'CancellationRevision',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'LastOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'CONTRACT',N'LastOperationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'LastOperationAction',N'varchar(30)',N'varchar',30,0,0,1,NULL),
(N'CONTRACT',N'RelationalReady',N'bit',N'bit',1,0,0,0,N'0'),
(N'INVOICE',N'PaymentRevision',N'int',N'int',4,0,0,0,N'0'),
(N'INVOICE',N'FinancialReviewedPaymentRevision',N'int',N'int',4,0,0,1,NULL),
(N'INVOICE',N'FinancialReviewedDeadlineRevision',N'int',N'int',4,0,0,1,NULL),
(N'INVOICE',N'FinancialReviewedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'INVOICE',N'FinancialReviewedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'INVOICE',N'FinancialReviewReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'PAYMENT',N'Revision',N'int',N'int',4,0,0,0,N'0'),
(N'PAYMENT',N'DeclaredAmount',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'PAYMENT',N'ProofFileKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'PAYMENT',N'ProofSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'PAYMENT',N'Memo',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'PAYMENT',N'DecisionReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'PAYMENT',N'ReceivedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'PAYMENT',N'NormalizedBankReference',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'PAYMENT',N'CreationOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'PAYMENT',N'CreationInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'PAYMENT',N'DecisionOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'PAYMENT',N'DecisionInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'PAYMENT',N'SessionCreatedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'PAYMENT',N'SessionExpiresAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'PAYMENT',N'RequestedAmount',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'PAYMENT',N'MerchantID',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'PAYMENT',N'GatewayPaymentUrl',N'varchar(2048)',N'varchar',2048,0,0,1,NULL),
(N'PAYMENT',N'ProviderTransactionID',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'PAYMENT',N'ProviderResponseCode',N'varchar(10)',N'varchar',10,0,0,1,NULL),
(N'PAYMENT',N'ProviderTransactionStatus',N'varchar(10)',N'varchar',10,0,0,1,NULL),
(N'PAYMENT',N'VerifiedCallbackDigest',N'char(64)',N'char',64,0,0,1,NULL),
(N'PAYMENT',N'ProviderConflictKind',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'PAYMENT',N'ProviderConflictDigest',N'char(64)',N'char',64,0,0,1,NULL),
(N'PAYMENT',N'ProviderConflictAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'PAYMENT',N'RelationalReady',N'bit',N'bit',1,0,0,0,N'0'),
(N'TRIP_PLAN',N'ActivationContractID',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'ActivatedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRIP_PLAN',N'VerifiedDepositAtActivation',N'decimal(12,0)',N'decimal',9,12,0,1,NULL),
(N'TRIP_PLAN',N'ScheduleNeedsReview',N'bit',N'bit',1,0,0,0,N'0'),
(N'TRIP_PLAN',N'DeploymentStatus',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentRevision',N'int',N'int',4,0,0,0,N'0'),
(N'TRIP_PLAN',N'HandoffEventID',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentReason',N'nvarchar(2000)',N'nvarchar',4000,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentOperationKey',N'varchar(100)',N'varchar',100,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentInputHash',N'char(64)',N'char',64,0,0,1,NULL),
(N'TRIP_PLAN',N'RoutingAcknowledgedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'RoutingAcknowledgedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'TRIP_PLAN',N'DocumentsAcknowledgedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'DocumentsAcknowledgedAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL),
(N'NOTIFICATION',N'DeliveryStatus',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'NOTIFICATION',N'DeliveredAtUtc',N'datetime2(0)',N'datetime2',6,0,0,1,NULL);
 DECLARE @t sysname,@c sysname,@d nvarchar(100),@b sysname,@l int,@p int,@s int,@n bit,@v nvarchar(20),@sql nvarchar(max),@def nvarchar(max),@message nvarchar(2048);
 DECLARE cols CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,D,B,L,P,S,N,V FROM @columns;
 OPEN cols; FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF OBJECT_ID(N'dbo.'+QUOTENAME(@t),N'U') IS NULL THROW 51102,'Required existing table missing.',1;
  IF COL_LENGTH(N'dbo.'+QUOTENAME(@t),@c) IS NULL
  BEGIN
   SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@t)+N' ADD '+QUOTENAME(@c)+N' '+@d+
     CASE WHEN @n=1 THEN N' NULL;' ELSE N' NOT NULL CONSTRAINT '+QUOTENAME(N'DF_F1R_'+@t+N'_'+@c)+N' DEFAULT('+@v+N') WITH VALUES;' END;
   EXEC sys.sp_executesql @sql;
  END;
  IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@c AND
   (TYPE_NAME(user_type_id)<>@b OR max_length<>@l OR is_nullable<>@n OR is_computed=1 OR is_identity=1
    OR (@b=N'decimal' AND (precision<>@p OR scale<>@s)) OR (@b=N'datetime2' AND scale<>@s)))
   BEGIN
    SELECT @message=CONCAT(N'Incompatible typed column ',@t,N'.',@c,N': expected ',@d,N' length ',@l,N'; actual ',TYPE_NAME(user_type_id),N' length ',max_length,N' nullable ',is_nullable,N' scale ',scale) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@c;
    THROW 51103,@message,1;
   END;
  SET @def=NULL;
  SELECT @def=d.definition FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
    WHERE c.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND c.name=@c;
  IF (@v IS NULL AND @def IS NOT NULL) OR (@v IS NOT NULL AND (@def IS NULL OR REPLACE(REPLACE(REPLACE(@def,N'(',N''),N')',N''),N' ',N'')<>@v))
   THROW 51104,'Existing typed column has an unexpected default; rolled back.',1;
  FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 END;
 CLOSE cols; DEALLOCATE cols;
 DECLARE @checks TABLE(T sysname,N sysname,D nvarchar(max));
 INSERT @checks VALUES
(N'HORSE',N'CK_F1R_HORSE_Revisions',N'[DocumentRevision]>=0'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_Revisions',N'[RequestRevision]>=0 AND [PlanRevision]>=0 AND [Revision]>=0'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Revisions',N'[VersionNumber]>=0 AND [Revision]>=0 AND [DeadlineRevision]>=0 AND [OtpAttempts]>=0 AND [CancellationRevision]>=0'),
(N'INVOICE',N'CK_F1R_INVOICE_Revisions',N'[PaymentRevision]>=0'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Revisions',N'[Revision]>=0'),
(N'TRIP_PLAN',N'CK_F1R_TRIP_PLAN_Revisions',N'[DeploymentRevision]>=0'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_PickupLatitude',N'[PickupLatitude] IS NULL OR [PickupLatitude] BETWEEN -90 AND 90'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_DeliveryLatitude',N'[DeliveryLatitude] IS NULL OR [DeliveryLatitude] BETWEEN -90 AND 90'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_PickupLongitude',N'[PickupLongitude] IS NULL OR [PickupLongitude] BETWEEN -180 AND 180'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_DeliveryLongitude',N'[DeliveryLongitude] IS NULL OR [DeliveryLongitude] BETWEEN -180 AND 180'),
(N'HORSE',N'CK_F1R_HORSE_Digests',N'([PhotoSha256] IS NULL OR (LEN([PhotoSha256])=64 AND [PhotoSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([PassportSha256] IS NULL OR (LEN([PassportSha256])=64 AND [PassportSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([CreationInputHash] IS NULL OR (LEN([CreationInputHash])=64 AND [CreationInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([LastDocumentInputHash] IS NULL OR (LEN([LastDocumentInputHash])=64 AND [LastDocumentInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2))'),
(N'REQUEST_HORSE_MAPPING',N'CK_F1R_REQUEST_HORSE_MAPPING_Digests',N'([PhotoSha256] IS NULL OR (LEN([PhotoSha256])=64 AND [PhotoSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([PassportSha256] IS NULL OR (LEN([PassportSha256])=64 AND [PassportSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2))'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Digests',N'([CreationInputHash] IS NULL OR (LEN([CreationInputHash])=64 AND [CreationInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([PdfSha256] IS NULL OR (LEN([PdfSha256])=64 AND [PdfSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([PublicationInputHash] IS NULL OR (LEN([PublicationInputHash])=64 AND [PublicationInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([OtpCodeDigest] IS NULL OR (LEN([OtpCodeDigest])=64 AND [OtpCodeDigest] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([OtpEmailDigest] IS NULL OR (LEN([OtpEmailDigest])=64 AND [OtpEmailDigest] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([SignInputHmac] IS NULL OR (LEN([SignInputHmac])=64 AND [SignInputHmac] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([LastOperationInputHash] IS NULL OR (LEN([LastOperationInputHash])=64 AND [LastOperationInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2))'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Digests',N'([ProofSha256] IS NULL OR (LEN([ProofSha256])=64 AND [ProofSha256] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([CreationInputHash] IS NULL OR (LEN([CreationInputHash])=64 AND [CreationInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([DecisionInputHash] IS NULL OR (LEN([DecisionInputHash])=64 AND [DecisionInputHash] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([VerifiedCallbackDigest] IS NULL OR (LEN([VerifiedCallbackDigest])=64 AND [VerifiedCallbackDigest] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2)) AND ([ProviderConflictDigest] IS NULL OR (LEN([ProviderConflictDigest])=64 AND [ProviderConflictDigest] NOT LIKE ''%[^0-9A-Fa-f]%'' COLLATE Latin1_General_100_BIN2))'),
(N'HORSE',N'CK_F1R_HORSE_Files',N'RelationalReady=0 OR (DocumentRevision>0 AND PhotoFileKey IS NOT NULL AND PhotoSha256 IS NOT NULL AND PassportFileKey IS NOT NULL AND PassportSha256 IS NOT NULL AND CreationInputHash IS NOT NULL)'),
(N'REQUEST_HORSE_MAPPING',N'CK_F1R_REQUEST_HORSE_MAPPING_Snapshot',N'RelationalReady=0 OR (DocumentRevision IS NOT NULL AND DocumentRevision>0 AND SnapshotName IS NOT NULL AND SnapshotMicrochip IS NOT NULL AND SnapshotPassportNo IS NOT NULL AND SnapshotBreed IS NOT NULL AND SnapshotSex IS NOT NULL AND SnapshotWeight IS NOT NULL AND SnapshotDob IS NOT NULL AND PhotoFileKey IS NOT NULL AND PhotoSha256 IS NOT NULL AND PassportFileKey IS NOT NULL AND PassportSha256 IS NOT NULL)'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_Ready',N'RelationalReady=0 OR (RequestRevision>0 AND PickupLatitude IS NOT NULL AND PickupLongitude IS NOT NULL AND DeliveryLatitude IS NOT NULL AND DeliveryLongitude IS NOT NULL AND OriginCountry IS NOT NULL AND DestinationCountry IS NOT NULL AND PickupContactName IS NOT NULL AND PickupContactPhone IS NOT NULL AND ExpectedDate IS NOT NULL AND CommittedDeadline IS NOT NULL AND PricingPolicyVersion IS NOT NULL AND EstimatedPrice IS NOT NULL AND EstimatedAtUtc IS NOT NULL AND CreationInputHash IS NOT NULL AND CommittedDeadline>=ExpectedDate AND EstimatedPrice>0 AND TransportType IS NOT NULL AND OriginCountry=''VN'' AND ((DestinationCountry=''VN'' AND TransportType=''ROAD'' AND RoadDistanceKm IS NOT NULL AND RoadDistanceKm>0) OR (DestinationCountry=''JP'' AND TransportType=''AIR'')))'),
(N'TRANSPORT_REQUEST',N'CK_F1R_TRANSPORT_REQUEST_Plan',N'PlanRevision=0 OR (PlannedDepartureAtUtc IS NOT NULL AND MinimumPreparationDays IS NOT NULL AND MinimumPreparationDays>=2 AND PreparationDays IS NOT NULL AND PreparationDays>=MinimumPreparationDays AND VehicleCount IS NOT NULL AND VehicleCount>=0 AND StallsRequired IS NOT NULL AND StallsRequired>0 AND PlannedResources IS NOT NULL AND TransportCost IS NOT NULL AND TransportCost BETWEEN 0 AND 9999999999 AND ProcedureCost IS NOT NULL AND ProcedureCost BETWEEN 0 AND 9999999999 AND VeterinaryCareCost IS NOT NULL AND VeterinaryCareCost BETWEEN 0 AND 9999999999 AND InsuranceCost IS NOT NULL AND InsuranceCost BETWEEN 0 AND 9999999999)'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Ready',N'RelationalReady=0 OR (VersionNumber>0 AND RequestRevision IS NOT NULL AND RequestRevision>0 AND PlanRevision IS NOT NULL AND PlanRevision>0 AND CreationOperationKey IS NOT NULL AND CreationInputHash IS NOT NULL AND CurrencyCode=''VND'' AND DepositRateStandard IS NOT NULL AND DepositRateStandard=40)'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Publication',N'PublishedAtUtc IS NULL OR (PdfFileKey IS NOT NULL AND PdfSha256 IS NOT NULL AND TemplateVersion IS NOT NULL AND PublishedBy IS NOT NULL AND PublicationOperationKey IS NOT NULL AND PublicationInputHash IS NOT NULL AND CompletionDeadline IS NOT NULL AND EffectiveDeadline IS NOT NULL AND EffectiveDeadline>=CompletionDeadline AND BankName IS NOT NULL AND BankAccount IS NOT NULL AND BankBeneficiary IS NOT NULL)'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Signed',N'RelationalReady=0 OR ContractStatus NOT IN (''SIGNED'',''EFFECTIVE'') OR (SignedAt IS NOT NULL AND PublishedAtUtc IS NOT NULL AND SignedDeadline IS NOT NULL AND SignedDeadlineRevision IS NOT NULL AND SignedDeadlineRevision>=0 AND SignedDeadlineRevision<=DeadlineRevision AND SignedDeadline>=CompletionDeadline AND SignedDeadline<=EffectiveDeadline AND SignedChallengeId IS NOT NULL AND SignatureMethod IS NOT NULL AND SignatureMethod=''EMAIL_OTP'' AND SignOperationKey IS NOT NULL AND SignInputHmac IS NOT NULL)'),
(N'CONTRACT',N'CK_F1R_CONTRACT_OtpAttempts',N'OtpAttempts BETWEEN 0 AND 5'),
(N'CONTRACT',N'CK_F1R_CONTRACT_Cancellation',N'CancellationStatus IS NULL OR CancellationStatus IN (''PENDING'',''APPROVED'',''REJECTED'')'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Ready',N'RelationalReady=0 OR (CreationOperationKey IS NOT NULL AND CreationInputHash IS NOT NULL AND DeclaredAmount IS NOT NULL AND DeclaredAmount>0 AND DeclaredAmount<=9999999999 AND CurrencyCode=''VND'' AND Method IS NOT NULL AND Method IN (''BANK_TRANSFER'',''VNPAY'') AND Amount=ROUND(Amount,0) AND Amount BETWEEN 0 AND 9999999999 AND ((Status=''SUCCESS'' AND Amount>0 AND ReceivedAtUtc IS NOT NULL) OR (Status IN (''PENDING_CONFIRMATION'',''PENDING_GATEWAY'',''REJECTED'',''FAILED'') AND Amount=0)))'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Proof',N'(ProofFileKey IS NULL AND ProofSha256 IS NULL) OR (ProofFileKey IS NOT NULL AND ProofSha256 IS NOT NULL)'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Bank',N'RelationalReady=0 OR Method<>''BANK_TRANSFER'' OR Status<>''SUCCESS'' OR (ConfirmedByUserID IS NOT NULL AND NormalizedBankReference IS NOT NULL)'),
(N'PAYMENT',N'CK_F1R_PAYMENT_Gateway',N'RelationalReady=0 OR Method<>''VNPAY'' OR (SessionCreatedAtUtc IS NOT NULL AND SessionExpiresAtUtc IS NOT NULL AND SessionExpiresAtUtc>SessionCreatedAtUtc AND RequestedAmount IS NOT NULL AND RequestedAmount>0 AND MerchantID IS NOT NULL AND GatewayPaymentUrl IS NOT NULL)'),
(N'TRIP_PLAN',N'CK_F1R_TRIP_PLAN_Deployment',N'DeploymentStatus IS NULL OR DeploymentStatus IN (''PENDING'',''CONFIRMED'',''ON_HOLD'')'),
(N'TRIP_PLAN',N'CK_F1R_TRIP_PLAN_Confirmed',N'DeploymentStatus IS NULL OR DeploymentStatus<>''CONFIRMED'' OR (HandoffEventID IS NOT NULL AND DeploymentRevision>0 AND ActivationContractID IS NOT NULL AND ActivatedAtUtc IS NOT NULL AND VerifiedDepositAtActivation IS NOT NULL AND VerifiedDepositAtActivation>0)'),
(N'NOTIFICATION',N'CK_F1R_NOTIFICATION_Delivery',N'DeliveryStatus IS NULL OR DeliveryStatus IN (''RESERVED'',''DELIVERED'',''FAILED'',''IMPORTED_RESERVATION'')');
 DECLARE @name sysname,@body nvarchar(max),@actual nvarchar(max),@fingerprint nvarchar(129),@recorded nvarchar(129);
 DECLARE chk CURSOR LOCAL FAST_FORWARD FOR SELECT T,N,D FROM @checks;
 OPEN chk; FETCH NEXT FROM chk INTO @t,@name,@body;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name)
  BEGIN
   SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@t)+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(@name)+N' CHECK ('+@body+N');'; EXEC sys.sp_executesql @sql;
   SELECT @actual=definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name;
   -- SQL Server canonicalizes CHECK expressions (e.g. IN/BETWEEN). Fingerprint both
   -- the script spec and SQL's actual definition, rather than guessing that rewrite.
   SET @fingerprint=CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@body),2)+N':'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@actual),2);
   EXEC sys.sp_addextendedproperty @name=N'Flow1RelationalGuardFingerprint',@value=@fingerprint,
    @level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=@t,@level2type=N'CONSTRAINT',@level2name=@name;
  END;
  SELECT @actual=definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name;
  SET @fingerprint=CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@body),2)+N':'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@actual),2);
  SET @recorded=NULL;
  SELECT @recorded=CONVERT(nvarchar(129),e.value) FROM sys.extended_properties e JOIN sys.check_constraints c ON c.object_id=e.major_id
   WHERE e.class=1 AND e.minor_id=0 AND e.name=N'Flow1RelationalGuardFingerprint' AND c.parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND c.name=@name;
  IF @recorded IS NULL OR @recorded<>@fingerprint
    OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name AND (is_disabled=1 OR is_not_trusted=1))
    THROW 51105,'Typed CHECK has unknown/different fingerprint, is disabled or untrusted; rolled back.',1;
  FETCH NEXT FROM chk INTO @t,@name,@body;
 END;
 CLOSE chk; DEALLOCATE chk;
 DECLARE @indexes TABLE(T sysname,N sysname,U bit,K nvarchar(500),F nvarchar(1000));
 INSERT @indexes VALUES
(N'CONTRACT',N'UX_F1R_CurrentContract',1,N'RequestID',N'RelationalReady=1 AND IsCurrent=1'),
(N'CONTRACT',N'UX_F1R_ContractVersion',1,N'RequestID,VersionNumber',N'RelationalReady=1'),
(N'PAYMENT',N'UX_F1R_PaymentCreation',1,N'InvoiceID,CreationOperationKey',N'RelationalReady=1'),
(N'PAYMENT',N'UX_F1R_VerifiedBankReference',1,N'NormalizedBankReference',N'RelationalReady=1 AND Method=''BANK_TRANSFER'' AND Status=''SUCCESS'' AND NormalizedBankReference IS NOT NULL'),
(N'PAYMENT',N'UX_F1R_VerifiedGatewayTransaction',1,N'MerchantID,ProviderTransactionID',N'RelationalReady=1 AND Method=''VNPAY'' AND Status=''SUCCESS'' AND ProviderTransactionID IS NOT NULL'),
(N'NOTIFICATION',N'IX_F1R_OtpDeliveryBudget',0,N'UserID,Type,Channel,SentAt',NULL),
(N'COST_ITEM',N'UX_F1R_QuoteCategory',1,N'ContractID,CategoryName',N'SubcodeName=''FLOW1_QUOTE''');
 DECLARE @unique bit,@keys nvarchar(500),@filter nvarchar(1000),@actualkeys nvarchar(500),@actualfilter nvarchar(1000);
 DECLARE idx CURSOR LOCAL FAST_FORWARD FOR SELECT T,N,U,K,F FROM @indexes;
 OPEN idx; FETCH NEXT FROM idx INTO @t,@name,@unique,@keys,@filter;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name)
  BEGIN
   SET @sql=N'CREATE '+CASE WHEN @unique=1 THEN N'UNIQUE ' ELSE N'' END+N'INDEX '+QUOTENAME(@name)+N' ON dbo.'+QUOTENAME(@t)+N'('+@keys+N')'+CASE WHEN @filter IS NULL THEN N'' ELSE N' WHERE '+@filter END+N';'; EXEC sys.sp_executesql @sql;
  END;
  SELECT @actualkeys=STRING_AGG(CONVERT(nvarchar(max),c.name),N',') WITHIN GROUP(ORDER BY ic.key_ordinal)
    FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE i.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND i.name=@name AND ic.key_ordinal>0;
  SELECT @actualfilter=filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name;
  IF @actualkeys<>@keys OR ISNULL(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@actualfilter,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N'')),N'')<>
     ISNULL(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@filter,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N'')),N'')
    OR EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name AND (is_unique<>@unique OR is_disabled=1 OR is_hypothetical=1))
    OR EXISTS(SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id WHERE i.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND i.name=@name AND (ic.is_descending_key=1 OR ic.is_included_column=1))
    THROW 51106,'Typed index differs or is disabled; rolled back.',1;
  FETCH NEXT FROM idx INTO @t,@name,@unique,@keys,@filter;
 END;
 CLOSE idx; DEALLOCATE idx;
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
