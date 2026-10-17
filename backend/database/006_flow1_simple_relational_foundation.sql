-- Current simple Flow1 profile: latest horse files, direct Contract price, VNPay only.
-- Keep extension/cancellation/confirm-hold-resume, current/last decisions only.
-- Apply after 003; 004 may coexist for operator-reviewed conversion. Do NOT apply 005.
-- No persistent tables, FK changes, backfill, JSON drop, startup execution or runtime switch.
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Schema',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51200,'Flow1 schema lock unavailable.',1;
 IF COL_LENGTH(N'dbo.CONTRACT',N'RequestID') IS NULL OR COL_LENGTH(N'dbo.CONTRACT',N'CompletionDeadline') IS NULL
  OR EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.CONTRACT') AND name=N'TripID' AND is_nullable=0)
  THROW 51201,'Apply and verify migration 003 first.',1;
 IF COL_LENGTH(N'dbo.HORSE',N'PhotoFileKey') IS NOT NULL
  OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE name LIKE N'CK_F1R[_]%')
  THROW 51207,'Superseded 005 profile detected; review conversion, do not mix profiles.',1;
 -- Table variables describe schema only; no new application table is created.
 DECLARE @columns TABLE(T sysname,C sysname,D nvarchar(100),B sysname,L int,P int,S int,N bit,V nvarchar(20));
 INSERT @columns VALUES
(N'HORSE',N'PhotoUrl',N'nvarchar(500)',N'nvarchar',1000,0,0,1,NULL),
(N'HORSE',N'PassportScanUrl',N'nvarchar(500)',N'nvarchar',1000,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupLatitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupLongitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'DeliveryLatitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'DeliveryLongitude',N'decimal(9,6)',N'decimal',5,9,6,1,NULL),
(N'TRANSPORT_REQUEST',N'DistanceKm',N'decimal(10,2)',N'decimal',9,10,2,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupContactName',N'nvarchar(100)',N'nvarchar',200,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PickupContactPhone',N'varchar(20)',N'varchar',20,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'ManagerNotes',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'OriginCountry',N'varchar(2)',N'varchar',2,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'DestinationCountry',N'varchar(2)',N'varchar',2,0,0,1,NULL),
(N'TRANSPORT_REQUEST',N'PreparationDays',N'int',N'int',4,0,0,1,NULL),
(N'CONTRACT',N'PdfUrl',N'varchar(500)',N'varchar',500,0,0,1,NULL),
(N'CONTRACT',N'SignOtpHash',N'varchar(255)',N'varchar',255,0,0,1,NULL),
(N'CONTRACT',N'SignOtpExpiry',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'SignOtpFailedAttempts',N'int',N'int',4,0,0,0,N'0'),
(N'CONTRACT',N'DepositDeadline',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'DepositAmount',N'decimal(12,2)',N'decimal',9,12,2,1,NULL),
(N'CONTRACT',N'PdfSha256',N'char(64)',N'char',64,0,0,1,NULL),
(N'CONTRACT',N'SignOtpSentAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'SignerEmail',N'varchar(255)',N'varchar',255,0,0,1,NULL),
(N'CONTRACT',N'PublishedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'PublishedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'EffectiveSignDeadline',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'SignedDepositDeadline',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'LastExtensionTarget',N'varchar(10)',N'varchar',10,0,0,1,NULL),
(N'CONTRACT',N'LastExtensionReason',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'CONTRACT',N'LastExtensionBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'LastExtensionAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'CancellationId',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'CancellationStatus',N'varchar(12)',N'varchar',12,0,0,1,NULL),
(N'CONTRACT',N'CancellationReason',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'CONTRACT',N'CancellationRequestedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'CancellationDecisionReason',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'CONTRACT',N'CancellationDecidedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'CONTRACT',N'CancellationDecidedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'CONTRACT',N'IsCurrent',N'bit',N'bit',1,0,0,0,N'0'),
(N'PAYMENT',N'VnpayBankCode',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'PAYMENT',N'VnpayResponseCode',N'varchar(10)',N'varchar',10,0,0,1,NULL),
(N'PAYMENT',N'VnpayTransactionStatus',N'varchar(10)',N'varchar',10,0,0,1,NULL),
(N'PAYMENT',N'VnpayTmnCode',N'varchar(8)',N'varchar',8,0,0,1,NULL),
(N'PAYMENT',N'VnpayCreatedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'PAYMENT',N'VnpayExpiresAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'PAYMENT',N'VnpayReceivedAmount',N'decimal(12,2)',N'decimal',9,12,2,1,NULL),
(N'PAYMENT',N'FinancialReviewRequired',N'bit',N'bit',1,0,0,0,N'0'),
(N'PAYMENT',N'FinancialReviewReason',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'PAYMENT',N'FinancialReviewedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'PAYMENT',N'FinancialReviewedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'TRIP_PLAN',N'DeploymentStatus',N'varchar(12)',N'varchar',12,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentReason',N'nvarchar(1000)',N'nvarchar',2000,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'DeploymentAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'TRIP_PLAN',N'HandoffEventId',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'RoutingAcknowledgedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'RoutingAcknowledgedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL),
(N'TRIP_PLAN',N'DocumentsAcknowledgedBy',N'varchar(50)',N'varchar',50,0,0,1,NULL),
(N'TRIP_PLAN',N'DocumentsAcknowledgedAtUtc',N'datetime2(7)',N'datetime2',8,0,7,1,NULL);
 DECLARE @t sysname,@c sysname,@d nvarchar(100),@b sysname,@l int,@p int,@s int,@n bit,@v nvarchar(20),@sql nvarchar(max),@def nvarchar(max),@message nvarchar(2048);
 DECLARE cols CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,D,B,L,P,S,N,V FROM @columns;
 OPEN cols; FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF OBJECT_ID(N'dbo.'+QUOTENAME(@t),N'U') IS NULL THROW 51202,'Required existing table missing.',1;
  IF COL_LENGTH(N'dbo.'+QUOTENAME(@t),@c) IS NULL
  BEGIN
   SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@t)+N' ADD '+QUOTENAME(@c)+N' '+@d+
     CASE WHEN @n=1 THEN N' NULL;' ELSE N' NOT NULL CONSTRAINT '+QUOTENAME(N'DF_F1S_'+@t+N'_'+@c)+N' DEFAULT('+@v+N') WITH VALUES;' END;
   EXEC sys.sp_executesql @sql;
  END;
  IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@c AND
   (TYPE_NAME(user_type_id)<>@b OR max_length<>@l OR is_nullable<>@n OR is_computed=1 OR is_identity=1
    OR (@b=N'decimal' AND (precision<>@p OR scale<>@s)) OR (@b=N'datetime2' AND scale<>@s)))
   BEGIN
    SELECT @message=CONCAT(N'Incompatible typed column ',@t,N'.',@c,N': expected ',@d,N' length ',@l,N'; actual ',TYPE_NAME(user_type_id),N' length ',max_length,N' nullable ',is_nullable,N' scale ',scale) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@c;
    THROW 51203,@message,1;
   END;
  SET @def=NULL;
  SELECT @def=d.definition FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
    WHERE c.object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND c.name=@c;
  IF (@v IS NULL AND @def IS NOT NULL) OR (@v IS NOT NULL AND (@def IS NULL OR REPLACE(REPLACE(REPLACE(@def,N'(',N''),N')',N''),N' ',N'')<>@v))
   THROW 51204,'Existing typed column has an unexpected default; rolled back.',1;
  FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 END;
 CLOSE cols; DEALLOCATE cols;
 DECLARE rv CURSOR LOCAL FAST_FORWARD FOR SELECT T FROM @columns GROUP BY T;
 OPEN rv; FETCH NEXT FROM rv INTO @t;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF COL_LENGTH(N'dbo.'+QUOTENAME(@t),N'RowVersion') IS NULL
  BEGIN
   IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND system_type_id=189)
    THROW 51208,'An existing rowversion needs explicit mapping; no replacement added.',1;
   SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@t)+N' ADD RowVersion rowversion NOT NULL;'; EXEC sys.sp_executesql @sql;
  END;
  IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=N'RowVersion'
    AND system_type_id=189 AND is_nullable=0)
   THROW 51208,'Incompatible RowVersion; no alteration performed.',1;
  FETCH NEXT FROM rv INTO @t;
 END;
 CLOSE rv; DEALLOCATE rv;
 DECLARE @checks TABLE(T sysname,N sysname,D nvarchar(max));
 INSERT @checks VALUES
(N'HORSE',N'CK_F1S_HORSE_PhotoUrl',N'PhotoUrl IS NULL OR (PhotoUrl LIKE ''private/%'' AND LEN(PhotoUrl)>8)'),
(N'HORSE',N'CK_F1S_HORSE_PassportScanUrl',N'PassportScanUrl IS NULL OR (PassportScanUrl LIKE ''private/%'' AND LEN(PassportScanUrl)>8)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_PdfUrl',N'PdfUrl IS NULL OR (PdfUrl LIKE ''private/%'' AND LEN(PdfUrl)>8)'),
(N'TRANSPORT_REQUEST',N'CK_F1S_TRANSPORT_REQUEST_Pickup',N'(PickupLatitude IS NULL AND PickupLongitude IS NULL) OR (PickupLatitude IS NOT NULL AND PickupLongitude IS NOT NULL AND PickupLatitude BETWEEN -90 AND 90 AND PickupLongitude BETWEEN -180 AND 180)'),
(N'TRANSPORT_REQUEST',N'CK_F1S_TRANSPORT_REQUEST_Delivery',N'(DeliveryLatitude IS NULL AND DeliveryLongitude IS NULL) OR (DeliveryLatitude IS NOT NULL AND DeliveryLongitude IS NOT NULL AND DeliveryLatitude BETWEEN -90 AND 90 AND DeliveryLongitude BETWEEN -180 AND 180)'),
(N'TRANSPORT_REQUEST',N'CK_F1S_TRANSPORT_REQUEST_Distance',N'DistanceKm IS NULL OR DistanceKm>0'),
(N'TRANSPORT_REQUEST',N'CK_F1S_TRANSPORT_REQUEST_Route',N'(OriginCountry IS NULL AND DestinationCountry IS NULL) OR (OriginCountry IS NOT NULL AND DestinationCountry IS NOT NULL AND TransportType IS NOT NULL AND OriginCountry=''VN'' AND ((DestinationCountry=''VN'' AND TransportType=''ROAD'') OR (DestinationCountry=''JP'' AND TransportType=''AIR'')))'),
(N'TRANSPORT_REQUEST',N'CK_F1S_TRANSPORT_REQUEST_Preparation',N'PreparationDays IS NULL OR (OriginCountry IS NOT NULL AND DestinationCountry IS NOT NULL AND PreparationDays>=CASE WHEN DestinationCountry=''JP'' THEN 7 WHEN DistanceKm>500 THEN 3 ELSE 2 END AND (DestinationCountry=''JP'' OR DistanceKm IS NOT NULL))'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Deposit',N'DepositAmount IS NULL OR (CurrencyCode=''VND'' AND TotalQuotedPrice IS NOT NULL AND TotalQuotedPrice>0 AND TotalQuotedPrice=ROUND(TotalQuotedPrice,0) AND DepositRateStandard IS NOT NULL AND DepositRateStandard=40 AND DepositAmount>0 AND DepositAmount=ROUND(TotalQuotedPrice*0.4,0))'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Pdf',N'(PdfUrl IS NULL AND PdfSha256 IS NULL) OR (PdfUrl IS NOT NULL AND PdfSha256 IS NOT NULL AND LEN(PdfSha256)=64 AND PdfSha256 NOT LIKE ''%[^0-9a-f]%'' COLLATE Latin1_General_100_BIN2)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Publication',N'PublishedAtUtc IS NULL OR (PublishedBy IS NOT NULL AND PdfUrl IS NOT NULL AND PdfSha256 IS NOT NULL AND DepositAmount IS NOT NULL AND CompletionDeadline IS NOT NULL)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_OtpAttempts',N'SignOtpFailedAttempts BETWEEN 0 AND 5'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Otp',N'SignOtpHash IS NULL OR (LEN(SignOtpHash)=64 AND SignOtpHash NOT LIKE ''%[^0-9a-f]%'' COLLATE Latin1_General_100_BIN2 AND SignOtpExpiry IS NOT NULL AND SignOtpSentAtUtc IS NOT NULL AND SignOtpExpiry>SignOtpSentAtUtc AND PublishedAtUtc IS NOT NULL AND SignedAt IS NULL)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_SignDeadline',N'EffectiveSignDeadline IS NULL OR (CompletionDeadline IS NOT NULL AND EffectiveSignDeadline>=CompletionDeadline)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Signed',N'PublishedAtUtc IS NULL OR SignedAt IS NULL OR (SignerEmail IS NOT NULL AND SignedDepositDeadline IS NOT NULL AND DepositDeadline IS NOT NULL AND DepositDeadline>=SignedDepositDeadline AND SignedDepositDeadline>SignedAt AND SignOtpHash IS NULL)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Extension',N'(LastExtensionTarget IS NULL AND LastExtensionReason IS NULL AND LastExtensionBy IS NULL AND LastExtensionAtUtc IS NULL) OR (LastExtensionTarget IS NOT NULL AND LastExtensionTarget IN (''SIGN'',''DEPOSIT'') AND LastExtensionReason IS NOT NULL AND LastExtensionBy IS NOT NULL AND LastExtensionAtUtc IS NOT NULL)'),
(N'CONTRACT',N'CK_F1S_CONTRACT_Cancellation',N'(CancellationId IS NULL AND CancellationStatus IS NULL AND CancellationReason IS NULL AND CancellationRequestedAtUtc IS NULL AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL) OR (CancellationId IS NOT NULL AND SignedAt IS NOT NULL AND CancellationStatus IS NOT NULL AND CancellationReason IS NOT NULL AND CancellationRequestedAtUtc IS NOT NULL AND ((CancellationStatus=''PENDING'' AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL) OR (CancellationStatus IN (''APPROVED'',''REJECTED'') AND CancellationDecisionReason IS NOT NULL AND CancellationDecidedBy IS NOT NULL AND CancellationDecidedAtUtc IS NOT NULL)))'),
(N'PAYMENT',N'CK_F1S_PAYMENT_Attempt',N'VnpayTmnCode IS NULL OR (Method IS NOT NULL AND Method=''VNPAY'' AND CurrencyCode=''VND'' AND Amount>0 AND Amount=ROUND(Amount,0) AND VnpayCreatedAtUtc IS NOT NULL AND VnpayExpiresAtUtc IS NOT NULL AND VnpayExpiresAtUtc>VnpayCreatedAtUtc AND Status IN (''PENDING_GATEWAY'',''FAILED'',''SUCCESS'',''REVIEW_REQUIRED''))'),
(N'PAYMENT',N'CK_F1S_PAYMENT_Success',N'VnpayTmnCode IS NULL OR Status<>''SUCCESS'' OR (VnpayResponseCode IS NOT NULL AND VnpayResponseCode=''00'' AND VnpayTransactionStatus IS NOT NULL AND VnpayTransactionStatus=''00'' AND TransactionCode IS NOT NULL AND VnpayReceivedAmount IS NOT NULL AND VnpayReceivedAmount=Amount)'),
(N'PAYMENT',N'CK_F1S_PAYMENT_Received',N'VnpayReceivedAmount IS NULL OR (VnpayReceivedAmount>0 AND VnpayReceivedAmount=ROUND(VnpayReceivedAmount,0))'),
(N'PAYMENT',N'CK_F1S_PAYMENT_Review',N'FinancialReviewRequired=0 OR FinancialReviewReason IS NOT NULL'),
(N'PAYMENT',N'CK_F1S_PAYMENT_Reviewer',N'(FinancialReviewedBy IS NULL AND FinancialReviewedAtUtc IS NULL) OR (FinancialReviewedBy IS NOT NULL AND FinancialReviewedAtUtc IS NOT NULL)'),
(N'TRIP_PLAN',N'CK_F1S_TRIP_PLAN_Deployment',N'DeploymentStatus IS NULL OR (DeploymentStatus IN (''PENDING'',''CONFIRMED'',''ON_HOLD'') AND DeploymentReason IS NOT NULL AND DeploymentBy IS NOT NULL AND DeploymentAtUtc IS NOT NULL AND ((DeploymentStatus=''CONFIRMED'' AND HandoffEventId IS NOT NULL) OR (DeploymentStatus IN (''PENDING'',''ON_HOLD'') AND HandoffEventId IS NULL)))'),
(N'TRIP_PLAN',N'CK_F1S_TRIP_PLAN_RoutingAck',N'(RoutingAcknowledgedBy IS NULL AND RoutingAcknowledgedAtUtc IS NULL) OR (RoutingAcknowledgedBy IS NOT NULL AND RoutingAcknowledgedAtUtc IS NOT NULL AND DeploymentStatus IS NOT NULL AND DeploymentStatus=''CONFIRMED'' AND HandoffEventId IS NOT NULL)'),
(N'TRIP_PLAN',N'CK_F1S_TRIP_PLAN_DocumentsAck',N'(DocumentsAcknowledgedBy IS NULL AND DocumentsAcknowledgedAtUtc IS NULL) OR (DocumentsAcknowledgedBy IS NOT NULL AND DocumentsAcknowledgedAtUtc IS NOT NULL AND DeploymentStatus IS NOT NULL AND DeploymentStatus=''CONFIRMED'' AND HandoffEventId IS NOT NULL)');
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
   EXEC sys.sp_addextendedproperty @name=N'Flow1SimpleGuardFingerprint',@value=@fingerprint,
    @level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=@t,@level2type=N'CONSTRAINT',@level2name=@name;
  END;
  SELECT @actual=definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name;
  SET @fingerprint=CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@body),2)+N':'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',@actual),2);
  SET @recorded=NULL;
  SELECT @recorded=CONVERT(nvarchar(129),e.value) FROM sys.extended_properties e JOIN sys.check_constraints c ON c.object_id=e.major_id
   WHERE e.class=1 AND e.minor_id=0 AND e.name=N'Flow1SimpleGuardFingerprint' AND c.parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND c.name=@name;
  IF @recorded IS NULL OR @recorded<>@fingerprint
    OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name=@name AND (is_disabled=1 OR is_not_trusted=1))
    THROW 51205,'Typed CHECK has unknown/different fingerprint, is disabled or untrusted; rolled back.',1;
  FETCH NEXT FROM chk INTO @t,@name,@body;
 END;
 CLOSE chk; DEALLOCATE chk;
 DECLARE @indexes TABLE(T sysname,N sysname,U bit,K nvarchar(500),F nvarchar(1000));
 INSERT @indexes VALUES
(N'CONTRACT',N'UX_F1S_CurrentContract',1,N'RequestID',N'IsCurrent=1'),
(N'PAYMENT',N'UX_F1S_VnpayReceipt',1,N'VnpayTmnCode,TransactionCode',N'VnpayTmnCode IS NOT NULL AND TransactionCode IS NOT NULL AND Status=''SUCCESS'''),
(N'NOTIFICATION',N'IX_F1S_OtpBudget',0,N'UserID,Type,Channel,SentAt',NULL);
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
    THROW 51206,'Typed index differs or is disabled; rolled back.',1;
  FETCH NEXT FROM idx INTO @t,@name,@unique,@keys,@filter;
 END;
 CLOSE idx; DEALLOCATE idx;
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
