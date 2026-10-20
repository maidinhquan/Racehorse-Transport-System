-- Flow 1: ONE self-contained migration for the current backend.
-- Select the intended existing database explicitly; NEVER run 000 on a populated database.
-- On the legacy base schema apply 001 (registration, separately) then THIS file only.
-- Supports legacy base, partial active migrations and the final pre-consolidation schema.
-- Retired JSON/alternate profiles are not installed or deleted; incompatible profiles stop.
-- No includes, GO, startup migration, new application tables or business fixtures.
-- Seeds only the twelve required catalogue clauses A-L; existing edits are retained.
-- One outer transaction makes all stages atomic, including late validation failures.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @migrationLock int;
    EXEC @migrationLock=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Schema',
        @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    IF @migrationLock<0 THROW 51700,'Flow1 schema lock unavailable.',1;
    -- Contract/request links and uniqueness
    EXEC sys.sp_executesql N'SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
IF OBJECT_ID(N''dbo.CONTRACT'', N''U'') IS NULL OR OBJECT_ID(N''dbo.TRIP_PLAN'', N''U'') IS NULL
    OR OBJECT_ID(N''dbo.TRANSPORT_REQUEST'', N''U'') IS NULL OR OBJECT_ID(N''dbo.INVOICE'', N''U'') IS NULL
    THROW 51000, ''Flow 1 requires the existing legacy schema.'', 1;

BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @lockResult int;
  EXEC @lockResult = sys.sp_getapplock @Resource=N''RaceHorse.Flow1.Schema'',
      @LockMode=''Exclusive'', @LockOwner=''Transaction'', @LockTimeout=10000;
  IF @lockResult < 0 THROW 51001, ''Flow 1 migration lock unavailable.'', 1;

  IF EXISTS (SELECT RequestID FROM dbo.TRIP_PLAN GROUP BY RequestID HAVING COUNT_BIG(*)>1)
      THROW 51002, ''Duplicate Trip.RequestID. Review data; migration never deletes trips.'', 1;
  IF EXISTS (SELECT ContractID FROM dbo.INVOICE WHERE InvoiceType=''DEPOSIT'' GROUP BY ContractID HAVING COUNT_BIG(*)>1)
      THROW 51003, ''Duplicate deposit invoices. Review data before migration.'', 1;
  IF EXISTS (
      SELECT 1 FROM dbo.CONTRACT c
      LEFT JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID
      LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID=t.RequestID
      WHERE c.TripID IS NOT NULL AND (t.TripID IS NULL OR r.RequestID IS NULL OR r.CustomerID<>c.CustomerID))
      THROW 51004, ''Legacy contract does not match its trip/request/customer.'', 1;

  IF COL_LENGTH(N''dbo.CONTRACT'', N''RequestID'') IS NULL
      ALTER TABLE dbo.CONTRACT ADD RequestID varchar(50) NULL;
  IF COL_LENGTH(N''dbo.CONTRACT'', N''CompletionDeadline'') IS NULL
      ALTER TABLE dbo.CONTRACT ADD CompletionDeadline datetime2 NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.CONTRACT'')
      AND name=N''RequestID'' AND TYPE_NAME(user_type_id)=''varchar'' AND max_length=50)
      THROW 51005, ''Existing Contract.RequestID has an unexpected type.'', 1;
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.CONTRACT'')
      AND name=N''CompletionDeadline'' AND TYPE_NAME(user_type_id)=''datetime2'')
      THROW 51006, ''Existing CompletionDeadline must be datetime2; do not silently convert old dates.'', 1;

  -- Dynamic batches compile AFTER the new column exists. Never overwrite an existing link.
  EXEC(N''UPDATE c SET RequestID=t.RequestID FROM dbo.CONTRACT c
         JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID WHERE c.RequestID IS NULL;'');
  EXEC(N''IF EXISTS (
      SELECT 1 FROM dbo.CONTRACT c LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID=c.RequestID
      LEFT JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID
      WHERE c.RequestID IS NULL OR r.RequestID IS NULL OR r.CustomerID<>c.CustomerID
         OR (c.TripID IS NOT NULL AND t.RequestID<>c.RequestID))
      THROW 51007, ''''Cannot backfill Contract.RequestID without inventing or overwriting data.'''', 1;'');
  EXEC(N''ALTER TABLE dbo.CONTRACT ALTER COLUMN RequestID varchar(50) NOT NULL;'');
  ALTER TABLE dbo.CONTRACT ALTER COLUMN TripID varchar(50) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N''FK_Contract_Request'' AND parent_object_id=OBJECT_ID(N''dbo.CONTRACT''))
      EXEC(N''ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT FK_Contract_Request
             FOREIGN KEY(RequestID) REFERENCES dbo.TRANSPORT_REQUEST(RequestID);'');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N''IX_CONTRACT_RequestID'' AND object_id=OBJECT_ID(N''dbo.CONTRACT''))
      EXEC(N''CREATE INDEX IX_CONTRACT_RequestID ON dbo.CONTRACT(RequestID);'');
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N''UX_TRIP_PLAN_RequestID'' AND object_id=OBJECT_ID(N''dbo.TRIP_PLAN'')
      AND (is_unique=0 OR is_disabled=1 OR has_filter=1
        OR (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal>0)<>1
        OR NOT EXISTS(SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id=k.object_id AND c.column_id=k.column_id
          WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal=1 AND c.name=N''RequestID'')))
      THROW 51008, ''Existing trip index does not enforce the required uniqueness.'', 1;
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N''UX_INVOICE_ContractID_Deposit'' AND object_id=OBJECT_ID(N''dbo.INVOICE'')
      AND (is_unique=0 OR is_disabled=1 OR has_filter=0
        OR UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(filter_definition,N'' '',N''''),N''['',N''''),N'']'',N''''),N''('',N''''),N'')'',N''''))<>N''INVOICETYPE=''''DEPOSIT''''''
        OR (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal>0)<>1
        OR NOT EXISTS(SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id=k.object_id AND c.column_id=k.column_id
          WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal=1 AND c.name=N''ContractID'')))
      THROW 51009, ''Existing deposit index does not enforce the required uniqueness.'', 1;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N''UX_TRIP_PLAN_RequestID'' AND object_id=OBJECT_ID(N''dbo.TRIP_PLAN''))
      CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON dbo.TRIP_PLAN(RequestID);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N''UX_INVOICE_ContractID_Deposit'' AND object_id=OBJECT_ID(N''dbo.INVOICE''))
      CREATE UNIQUE INDEX UX_INVOICE_ContractID_Deposit ON dbo.INVOICE(ContractID) WHERE InvoiceType=''DEPOSIT'';
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;';

    -- Current typed operational fields and guards
    EXEC sys.sp_executesql N'SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N''RaceHorse.Flow1.Schema'',@LockMode=''Exclusive'',@LockOwner=''Transaction'',@LockTimeout=10000;
 IF @lock<0 THROW 51200,''Flow1 schema lock unavailable.'',1;
 IF COL_LENGTH(N''dbo.CONTRACT'',N''RequestID'') IS NULL OR COL_LENGTH(N''dbo.CONTRACT'',N''CompletionDeadline'') IS NULL
  OR EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.CONTRACT'') AND name=N''TripID'' AND is_nullable=0)
  THROW 51201,''Apply and verify migration 003 first.'',1;
 IF COL_LENGTH(N''dbo.HORSE'',N''PhotoFileKey'') IS NOT NULL
  OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE name LIKE N''CK_F1R[_]%'')
  THROW 51207,''Superseded 005 profile detected; review conversion, do not mix profiles.'',1;
 -- Table variables describe schema only; no new application table is created.
 DECLARE @columns TABLE(T sysname,C sysname,D nvarchar(100),B sysname,L int,P int,S int,N bit,V nvarchar(20));
 INSERT @columns VALUES
(N''HORSE'',N''PhotoUrl'',N''nvarchar(500)'',N''nvarchar'',1000,0,0,1,NULL),
(N''HORSE'',N''PassportScanUrl'',N''nvarchar(500)'',N''nvarchar'',1000,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''PickupLatitude'',N''decimal(9,6)'',N''decimal'',5,9,6,1,NULL),
(N''TRANSPORT_REQUEST'',N''PickupLongitude'',N''decimal(9,6)'',N''decimal'',5,9,6,1,NULL),
(N''TRANSPORT_REQUEST'',N''DeliveryLatitude'',N''decimal(9,6)'',N''decimal'',5,9,6,1,NULL),
(N''TRANSPORT_REQUEST'',N''DeliveryLongitude'',N''decimal(9,6)'',N''decimal'',5,9,6,1,NULL),
(N''TRANSPORT_REQUEST'',N''DistanceKm'',N''decimal(10,2)'',N''decimal'',9,10,2,1,NULL),
(N''TRANSPORT_REQUEST'',N''PickupContactName'',N''nvarchar(100)'',N''nvarchar'',200,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''PickupContactPhone'',N''varchar(20)'',N''varchar'',20,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''ManagerNotes'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''OriginCountry'',N''varchar(2)'',N''varchar'',2,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''DestinationCountry'',N''varchar(2)'',N''varchar'',2,0,0,1,NULL),
(N''TRANSPORT_REQUEST'',N''PreparationDays'',N''int'',N''int'',4,0,0,1,NULL),
(N''CONTRACT'',N''PdfUrl'',N''varchar(500)'',N''varchar'',500,0,0,1,NULL),
(N''CONTRACT'',N''SignOtpHash'',N''varchar(255)'',N''varchar'',255,0,0,1,NULL),
(N''CONTRACT'',N''SignOtpExpiry'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''SignOtpFailedAttempts'',N''int'',N''int'',4,0,0,0,N''0''),
(N''CONTRACT'',N''DepositDeadline'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''DepositAmount'',N''decimal(12,2)'',N''decimal'',9,12,2,1,NULL),
(N''CONTRACT'',N''PdfSha256'',N''char(64)'',N''char'',64,0,0,1,NULL),
(N''CONTRACT'',N''SignOtpSentAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''SignerEmail'',N''varchar(255)'',N''varchar'',255,0,0,1,NULL),
(N''CONTRACT'',N''PublishedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''PublishedBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''CONTRACT'',N''EffectiveSignDeadline'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''SignedDepositDeadline'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''LastExtensionTarget'',N''varchar(10)'',N''varchar'',10,0,0,1,NULL),
(N''CONTRACT'',N''LastExtensionReason'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''CONTRACT'',N''LastExtensionBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''CONTRACT'',N''LastExtensionAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''CancellationId'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''CONTRACT'',N''CancellationStatus'',N''varchar(12)'',N''varchar'',12,0,0,1,NULL),
(N''CONTRACT'',N''CancellationReason'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''CONTRACT'',N''CancellationRequestedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''CancellationDecisionReason'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''CONTRACT'',N''CancellationDecidedBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''CONTRACT'',N''CancellationDecidedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''CONTRACT'',N''IsCurrent'',N''bit'',N''bit'',1,0,0,0,N''0''),
(N''PAYMENT'',N''VnpayBankCode'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''PAYMENT'',N''VnpayResponseCode'',N''varchar(10)'',N''varchar'',10,0,0,1,NULL),
(N''PAYMENT'',N''VnpayTransactionStatus'',N''varchar(10)'',N''varchar'',10,0,0,1,NULL),
(N''PAYMENT'',N''VnpayTmnCode'',N''varchar(8)'',N''varchar'',8,0,0,1,NULL),
(N''PAYMENT'',N''VnpayCreatedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''PAYMENT'',N''VnpayExpiresAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''PAYMENT'',N''VnpayReceivedAmount'',N''decimal(12,2)'',N''decimal'',9,12,2,1,NULL),
(N''PAYMENT'',N''FinancialReviewRequired'',N''bit'',N''bit'',1,0,0,0,N''0''),
(N''PAYMENT'',N''FinancialReviewReason'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''PAYMENT'',N''FinancialReviewedBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''PAYMENT'',N''FinancialReviewedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''TRIP_PLAN'',N''DeploymentStatus'',N''varchar(12)'',N''varchar'',12,0,0,1,NULL),
(N''TRIP_PLAN'',N''DeploymentReason'',N''nvarchar(1000)'',N''nvarchar'',2000,0,0,1,NULL),
(N''TRIP_PLAN'',N''DeploymentBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''TRIP_PLAN'',N''DeploymentAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''TRIP_PLAN'',N''HandoffEventId'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''TRIP_PLAN'',N''RoutingAcknowledgedBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''TRIP_PLAN'',N''RoutingAcknowledgedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL),
(N''TRIP_PLAN'',N''DocumentsAcknowledgedBy'',N''varchar(50)'',N''varchar'',50,0,0,1,NULL),
(N''TRIP_PLAN'',N''DocumentsAcknowledgedAtUtc'',N''datetime2(7)'',N''datetime2'',8,0,7,1,NULL);
 DECLARE @t sysname,@c sysname,@d nvarchar(100),@b sysname,@l int,@p int,@s int,@n bit,@v nvarchar(20),@sql nvarchar(max),@def nvarchar(max),@message nvarchar(2048);
 DECLARE cols CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,D,B,L,P,S,N,V FROM @columns;
 OPEN cols; FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF OBJECT_ID(N''dbo.''+QUOTENAME(@t),N''U'') IS NULL THROW 51202,''Required existing table missing.'',1;
  IF COL_LENGTH(N''dbo.''+QUOTENAME(@t),@c) IS NULL
  BEGIN
   SET @sql=N''ALTER TABLE dbo.''+QUOTENAME(@t)+N'' ADD ''+QUOTENAME(@c)+N'' ''+@d+
     CASE WHEN @n=1 THEN N'' NULL;'' ELSE N'' NOT NULL CONSTRAINT ''+QUOTENAME(N''DF_F1S_''+@t+N''_''+@c)+N'' DEFAULT(''+@v+N'') WITH VALUES;'' END;
   EXEC sys.sp_executesql @sql;
  END;
  IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@c AND
   (TYPE_NAME(user_type_id)<>@b OR max_length<>@l OR is_nullable<>@n OR is_computed=1 OR is_identity=1
    OR (@b=N''decimal'' AND (precision<>@p OR scale<>@s)) OR (@b=N''datetime2'' AND scale<>@s)))
   BEGIN
    SELECT @message=CONCAT(N''Incompatible typed column '',@t,N''.'',@c,N'': expected '',@d,N'' length '',@l,N''; actual '',TYPE_NAME(user_type_id),N'' length '',max_length,N'' nullable '',is_nullable,N'' scale '',scale) FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@c;
    THROW 51203,@message,1;
   END;
  SET @def=NULL;
  SELECT @def=d.definition FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
    WHERE c.object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND c.name=@c;
  IF (@v IS NULL AND @def IS NOT NULL) OR (@v IS NOT NULL AND (@def IS NULL OR REPLACE(REPLACE(REPLACE(@def,N''('',N''''),N'')'',N''''),N'' '',N'''')<>@v))
   THROW 51204,''Existing typed column has an unexpected default; rolled back.'',1;
  FETCH NEXT FROM cols INTO @t,@c,@d,@b,@l,@p,@s,@n,@v;
 END;
 CLOSE cols; DEALLOCATE cols;
 DECLARE rv CURSOR LOCAL FAST_FORWARD FOR SELECT T FROM @columns GROUP BY T;
 OPEN rv; FETCH NEXT FROM rv INTO @t;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF COL_LENGTH(N''dbo.''+QUOTENAME(@t),N''RowVersion'') IS NULL
  BEGIN
   IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND system_type_id=189)
    THROW 51208,''An existing rowversion needs explicit mapping; no replacement added.'',1;
   SET @sql=N''ALTER TABLE dbo.''+QUOTENAME(@t)+N'' ADD RowVersion rowversion NOT NULL;''; EXEC sys.sp_executesql @sql;
  END;
  IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=N''RowVersion''
    AND system_type_id=189 AND is_nullable=0)
   THROW 51208,''Incompatible RowVersion; no alteration performed.'',1;
  FETCH NEXT FROM rv INTO @t;
 END;
 CLOSE rv; DEALLOCATE rv;
 DECLARE @checks TABLE(T sysname,N sysname,D nvarchar(max));
 INSERT @checks VALUES
(N''HORSE'',N''CK_F1S_HORSE_PhotoUrl'',N''PhotoUrl IS NULL OR (PhotoUrl LIKE ''''private/%'''' AND LEN(PhotoUrl)>8)''),
(N''HORSE'',N''CK_F1S_HORSE_PassportScanUrl'',N''PassportScanUrl IS NULL OR (PassportScanUrl LIKE ''''private/%'''' AND LEN(PassportScanUrl)>8)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_PdfUrl'',N''PdfUrl IS NULL OR (PdfUrl LIKE ''''private/%'''' AND LEN(PdfUrl)>8)''),
(N''TRANSPORT_REQUEST'',N''CK_F1S_TRANSPORT_REQUEST_Pickup'',N''(PickupLatitude IS NULL AND PickupLongitude IS NULL) OR (PickupLatitude IS NOT NULL AND PickupLongitude IS NOT NULL AND PickupLatitude BETWEEN -90 AND 90 AND PickupLongitude BETWEEN -180 AND 180)''),
(N''TRANSPORT_REQUEST'',N''CK_F1S_TRANSPORT_REQUEST_Delivery'',N''(DeliveryLatitude IS NULL AND DeliveryLongitude IS NULL) OR (DeliveryLatitude IS NOT NULL AND DeliveryLongitude IS NOT NULL AND DeliveryLatitude BETWEEN -90 AND 90 AND DeliveryLongitude BETWEEN -180 AND 180)''),
(N''TRANSPORT_REQUEST'',N''CK_F1S_TRANSPORT_REQUEST_Distance'',N''DistanceKm IS NULL OR DistanceKm>0''),
(N''TRANSPORT_REQUEST'',N''CK_F1S_TRANSPORT_REQUEST_Route'',N''(OriginCountry IS NULL AND DestinationCountry IS NULL) OR (OriginCountry IS NOT NULL AND DestinationCountry IS NOT NULL AND TransportType IS NOT NULL AND OriginCountry=''''VN'''' AND ((DestinationCountry=''''VN'''' AND TransportType=''''ROAD'''') OR (DestinationCountry=''''JP'''' AND TransportType=''''AIR'''')))''),
(N''TRANSPORT_REQUEST'',N''CK_F1S_TRANSPORT_REQUEST_Preparation'',N''PreparationDays IS NULL OR (OriginCountry IS NOT NULL AND DestinationCountry IS NOT NULL AND PreparationDays>=CASE WHEN DestinationCountry=''''JP'''' THEN 7 WHEN DistanceKm>500 THEN 3 ELSE 2 END AND (DestinationCountry=''''JP'''' OR DistanceKm IS NOT NULL))''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Deposit'',N''DepositAmount IS NULL OR (CurrencyCode=''''VND'''' AND TotalQuotedPrice IS NOT NULL AND TotalQuotedPrice>0 AND TotalQuotedPrice=ROUND(TotalQuotedPrice,0) AND DepositRateStandard IS NOT NULL AND DepositRateStandard=40 AND DepositAmount>0 AND DepositAmount=ROUND(TotalQuotedPrice*0.4,0))''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Pdf'',N''(PdfUrl IS NULL AND PdfSha256 IS NULL) OR (PdfUrl IS NOT NULL AND PdfSha256 IS NOT NULL AND LEN(PdfSha256)=64 AND PdfSha256 NOT LIKE ''''%[^0-9a-f]%'''' COLLATE Latin1_General_100_BIN2)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Publication'',N''PublishedAtUtc IS NULL OR (PublishedBy IS NOT NULL AND PdfUrl IS NOT NULL AND PdfSha256 IS NOT NULL AND DepositAmount IS NOT NULL AND CompletionDeadline IS NOT NULL)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_OtpAttempts'',N''SignOtpFailedAttempts BETWEEN 0 AND 5''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Otp'',N''SignOtpHash IS NULL OR (LEN(SignOtpHash)=64 AND SignOtpHash NOT LIKE ''''%[^0-9a-f]%'''' COLLATE Latin1_General_100_BIN2 AND SignOtpExpiry IS NOT NULL AND SignOtpSentAtUtc IS NOT NULL AND SignOtpExpiry>SignOtpSentAtUtc AND PublishedAtUtc IS NOT NULL AND SignedAt IS NULL)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_SignDeadline'',N''EffectiveSignDeadline IS NULL OR (CompletionDeadline IS NOT NULL AND EffectiveSignDeadline>=CompletionDeadline)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Signed'',N''PublishedAtUtc IS NULL OR SignedAt IS NULL OR (SignerEmail IS NOT NULL AND SignedDepositDeadline IS NOT NULL AND DepositDeadline IS NOT NULL AND DepositDeadline>=SignedDepositDeadline AND SignedDepositDeadline>SignedAt AND SignOtpHash IS NULL)''),
(N''CONTRACT'',N''CK_F1S_CONTRACT_Extension'',N''(LastExtensionTarget IS NULL AND LastExtensionReason IS NULL AND LastExtensionBy IS NULL AND LastExtensionAtUtc IS NULL) OR (LastExtensionTarget IS NOT NULL AND LastExtensionTarget IN (''''SIGN'''',''''DEPOSIT'''') AND LastExtensionReason IS NOT NULL AND LastExtensionBy IS NOT NULL AND LastExtensionAtUtc IS NOT NULL)''),
(N''PAYMENT'',N''CK_F1S_PAYMENT_Attempt'',N''VnpayTmnCode IS NULL OR (Method IS NOT NULL AND Method=''''VNPAY'''' AND CurrencyCode=''''VND'''' AND Amount>0 AND Amount=ROUND(Amount,0) AND VnpayCreatedAtUtc IS NOT NULL AND VnpayExpiresAtUtc IS NOT NULL AND VnpayExpiresAtUtc>VnpayCreatedAtUtc AND Status IN (''''PENDING_GATEWAY'''',''''FAILED'''',''''SUCCESS'''',''''REVIEW_REQUIRED''''))''),
(N''PAYMENT'',N''CK_F1S_PAYMENT_Success'',N''VnpayTmnCode IS NULL OR Status<>''''SUCCESS'''' OR (VnpayResponseCode IS NOT NULL AND VnpayResponseCode=''''00'''' AND VnpayTransactionStatus IS NOT NULL AND VnpayTransactionStatus=''''00'''' AND TransactionCode IS NOT NULL AND VnpayReceivedAmount IS NOT NULL AND VnpayReceivedAmount=Amount)''),
(N''PAYMENT'',N''CK_F1S_PAYMENT_Received'',N''VnpayReceivedAmount IS NULL OR (VnpayReceivedAmount>0 AND VnpayReceivedAmount=ROUND(VnpayReceivedAmount,0))''),
(N''PAYMENT'',N''CK_F1S_PAYMENT_Review'',N''FinancialReviewRequired=0 OR FinancialReviewReason IS NOT NULL''),
(N''PAYMENT'',N''CK_F1S_PAYMENT_Reviewer'',N''(FinancialReviewedBy IS NULL AND FinancialReviewedAtUtc IS NULL) OR (FinancialReviewedBy IS NOT NULL AND FinancialReviewedAtUtc IS NOT NULL)''),
(N''TRIP_PLAN'',N''CK_F1S_TRIP_PLAN_Deployment'',N''DeploymentStatus IS NULL OR (DeploymentStatus IN (''''PENDING'''',''''CONFIRMED'''',''''ON_HOLD'''') AND DeploymentReason IS NOT NULL AND DeploymentBy IS NOT NULL AND DeploymentAtUtc IS NOT NULL AND ((DeploymentStatus=''''CONFIRMED'''' AND HandoffEventId IS NOT NULL) OR (DeploymentStatus IN (''''PENDING'''',''''ON_HOLD'''') AND HandoffEventId IS NULL)))''),
(N''TRIP_PLAN'',N''CK_F1S_TRIP_PLAN_RoutingAck'',N''(RoutingAcknowledgedBy IS NULL AND RoutingAcknowledgedAtUtc IS NULL) OR (RoutingAcknowledgedBy IS NOT NULL AND RoutingAcknowledgedAtUtc IS NOT NULL AND DeploymentStatus IS NOT NULL AND DeploymentStatus=''''CONFIRMED'''' AND HandoffEventId IS NOT NULL)''),
(N''TRIP_PLAN'',N''CK_F1S_TRIP_PLAN_DocumentsAck'',N''(DocumentsAcknowledgedBy IS NULL AND DocumentsAcknowledgedAtUtc IS NULL) OR (DocumentsAcknowledgedBy IS NOT NULL AND DocumentsAcknowledgedAtUtc IS NOT NULL AND DeploymentStatus IS NOT NULL AND DeploymentStatus=''''CONFIRMED'''' AND HandoffEventId IS NOT NULL)'');
 DECLARE @name sysname,@body nvarchar(max),@actual nvarchar(max),@fingerprint nvarchar(129),@recorded nvarchar(129);
 DECLARE chk CURSOR LOCAL FAST_FORWARD FOR SELECT T,N,D FROM @checks;
 OPEN chk; FETCH NEXT FROM chk INTO @t,@name,@body;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name)
  BEGIN
   SET @sql=N''ALTER TABLE dbo.''+QUOTENAME(@t)+N'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(@name)+N'' CHECK (''+@body+N'');''; EXEC sys.sp_executesql @sql;
   SELECT @actual=definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name;
   -- SQL Server canonicalizes CHECK expressions (e.g. IN/BETWEEN). Fingerprint both
   -- the script spec and SQL''s actual definition, rather than guessing that rewrite.
   SET @fingerprint=CONVERT(nvarchar(64),HASHBYTES(''SHA2_256'',@body),2)+N'':''+CONVERT(nvarchar(64),HASHBYTES(''SHA2_256'',@actual),2);
   EXEC sys.sp_addextendedproperty @name=N''Flow1SimpleGuardFingerprint'',@value=@fingerprint,
    @level0type=N''SCHEMA'',@level0name=N''dbo'',@level1type=N''TABLE'',@level1name=@t,@level2type=N''CONSTRAINT'',@level2name=@name;
  END;
  SELECT @actual=definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name;
  SET @fingerprint=CONVERT(nvarchar(64),HASHBYTES(''SHA2_256'',@body),2)+N'':''+CONVERT(nvarchar(64),HASHBYTES(''SHA2_256'',@actual),2);
  SET @recorded=NULL;
  SELECT @recorded=CONVERT(nvarchar(129),e.value) FROM sys.extended_properties e JOIN sys.check_constraints c ON c.object_id=e.major_id
   WHERE e.class=1 AND e.minor_id=0 AND e.name=N''Flow1SimpleGuardFingerprint'' AND c.parent_object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND c.name=@name;
  IF @recorded IS NULL OR @recorded<>@fingerprint
    OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name AND (is_disabled=1 OR is_not_trusted=1))
    THROW 51205,''Typed CHECK has unknown/different fingerprint, is disabled or untrusted; rolled back.'',1;
  FETCH NEXT FROM chk INTO @t,@name,@body;
 END;
 CLOSE chk; DEALLOCATE chk;
 DECLARE @indexes TABLE(T sysname,N sysname,U bit,K nvarchar(500),F nvarchar(1000));
 INSERT @indexes VALUES
(N''CONTRACT'',N''UX_F1S_CurrentContract'',1,N''RequestID'',N''IsCurrent=1''),
(N''PAYMENT'',N''UX_F1S_VnpayReceipt'',1,N''VnpayTmnCode,TransactionCode'',N''VnpayTmnCode IS NOT NULL AND TransactionCode IS NOT NULL AND Status=''''SUCCESS''''''),
(N''NOTIFICATION'',N''IX_F1S_OtpBudget'',0,N''UserID,Type,Channel,SentAt'',NULL);
 DECLARE @unique bit,@keys nvarchar(500),@filter nvarchar(1000),@actualkeys nvarchar(500),@actualfilter nvarchar(1000);
 DECLARE idx CURSOR LOCAL FAST_FORWARD FOR SELECT T,N,U,K,F FROM @indexes;
 OPEN idx; FETCH NEXT FROM idx INTO @t,@name,@unique,@keys,@filter;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name)
  BEGIN
   SET @sql=N''CREATE ''+CASE WHEN @unique=1 THEN N''UNIQUE '' ELSE N'''' END+N''INDEX ''+QUOTENAME(@name)+N'' ON dbo.''+QUOTENAME(@t)+N''(''+@keys+N'')''+CASE WHEN @filter IS NULL THEN N'''' ELSE N'' WHERE ''+@filter END+N'';''; EXEC sys.sp_executesql @sql;
  END;
  SELECT @actualkeys=STRING_AGG(CONVERT(nvarchar(max),c.name),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal)
    FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE i.object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND i.name=@name AND ic.key_ordinal>0;
  SELECT @actualfilter=filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name;
  IF @actualkeys<>@keys OR ISNULL(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@actualfilter,N''['',N''''),N'']'',N''''),N''('',N''''),N'')'',N''''),N'' '',N'''')),N'''')<>
     ISNULL(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@filter,N''['',N''''),N'']'',N''''),N''('',N''''),N'')'',N''''),N'' '',N'''')),N'''')
    OR EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND name=@name AND (is_unique<>@unique OR is_disabled=1 OR is_hypothetical=1))
    OR EXISTS(SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id WHERE i.object_id=OBJECT_ID(N''dbo.''+QUOTENAME(@t)) AND i.name=@name AND (ic.is_descending_key=1 OR ic.is_included_column=1))
    THROW 51206,''Typed index differs or is disabled; rolled back.'',1;
  FETCH NEXT FROM idx INTO @t,@name,@unique,@keys,@filter;
 END;
 CLOSE idx; DEALLOCATE idx;
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;';

    -- Declared value
    EXEC sys.sp_executesql N'SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''RowVersion'') IS NULL
    THROW 51400,''Apply the reviewed schema006 before schema007.'',1;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''DeclaredValueUsd'') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD DeclaredValueUsd decimal(18,2) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'')
    AND name=''DeclaredValueUsd'' AND system_type_id=106 AND precision=18 AND scale=2 AND is_nullable=1)
    THROW 51401,''Existing DeclaredValueUsd has an incompatible definition.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'') AND name=''CK_F1D_DeclaredValueUsd'')
    EXEC(N''ALTER TABLE dbo.TRANSPORT_REQUEST WITH CHECK ADD CONSTRAINT CK_F1D_DeclaredValueUsd CHECK (DeclaredValueUsd IS NULL OR DeclaredValueUsd > 0);'');
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'')
    AND name=''CK_F1D_DeclaredValueUsd'' AND (is_disabled=1 OR is_not_trusted=1))
    THROW 51402,''Declared-value CHECK must be enabled and trusted.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'')
    AND name=''CK_F1D_DeclaredValueUsd'' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(definition,N''['',N''''),N'']'',N''''),N''('',N''''),N'')'',N''''),N'' '',N''''))=N''declaredvalueusdisnullordeclaredvalueusd>0'')
    THROW 51403,''Declared-value CHECK definition differs from schema007.'',1;
COMMIT;';

    -- Readable request submission keys
    EXEC sys.sp_executesql N'SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''DeclaredValueUsd'') IS NULL
    THROW 51600,''Apply reviewed schema007 first.'',1;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''SubmissionKeyHash'') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD SubmissionKeyHash varchar(64) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'')
    AND name=''SubmissionKeyHash'' AND system_type_id=167 AND max_length=64 AND is_nullable=1)
    THROW 51601,''SubmissionKeyHash has an incompatible definition.'',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'') AND name=''UX_F1N_RequestSubmission'')
    EXEC(N''CREATE UNIQUE INDEX UX_F1N_RequestSubmission ON dbo.TRANSPORT_REQUEST(CustomerID,SubmissionKeyHash) WHERE SubmissionKeyHash IS NOT NULL;'');
IF NOT EXISTS(SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'')
    AND i.name=''UX_F1N_RequestSubmission'' AND i.is_unique=1 AND i.is_disabled=0
    AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(i.filter_definition,N''['',N''''),N'']'',N''''),N''('',N''''),N'')'',N''''),N'' '',N''''))=N''submissionkeyhashisnotnull''
    AND (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),N'','') WITHIN GROUP(ORDER BY ic.key_ordinal)
         FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
         WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=N''CustomerID,SubmissionKeyHash''
    AND NOT EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND (ic.is_descending_key=1 OR ic.is_included_column=1)))
    THROW 51602,''Request submission index definition differs from schema008.'',1;
COMMIT;';

    -- Shared Manager queue, staff assignment, feedback, refund and cancellation guard
    EXEC sys.sp_executesql N'SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''SubmissionKeyHash'') IS NULL
    THROW 51400,''Apply reviewed schema 003/006/007/008 first.'',1;
DECLARE @columns TABLE(T sysname,C sysname,D nvarchar(100));
INSERT @columns VALUES
(''CONTRACT'',''CustomerFeedback'',''nvarchar(2000) NULL''),
(''CONTRACT'',''FeedbackFields'',''varchar(200) NULL''),
(''CONTRACT'',''FeedbackStatus'',''varchar(20) NULL''),
(''CONTRACT'',''FeedbackAtUtc'',''datetime2(7) NULL''),
(''CONTRACT'',''ManagerFeedback'',''nvarchar(2000) NULL''),
(''CONTRACT'',''FeedbackHandledAtUtc'',''datetime2(7) NULL''),
(''CONTRACT'',''RefundAmount'',''decimal(12,2) NULL''),
(''CONTRACT'',''RefundStatus'',''varchar(20) NULL''),
(''CONTRACT'',''RefundReference'',''varchar(100) NULL''),
(''TRIP_PLAN'',''AssignedSpecialistId'',''varchar(50) NULL''),
(''TRIP_PLAN'',''AssignedCoordinatorId'',''varchar(50) NULL'');
DECLARE @t sysname,@c sysname,@d nvarchar(100),@sql nvarchar(max);
DECLARE col CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,D FROM @columns;
OPEN col; FETCH NEXT FROM col INTO @t,@c,@d;
WHILE @@FETCH_STATUS=0 BEGIN
 IF COL_LENGTH(''dbo.''+@t,@c) IS NULL BEGIN
  SET @sql=''ALTER TABLE dbo.''+QUOTENAME(@t)+'' ADD ''+QUOTENAME(@c)+'' ''+@d;
  EXEC sys.sp_executesql @sql;
 END;
 FETCH NEXT FROM col INTO @t,@c,@d;
END; CLOSE col; DEALLOCATE col;
-- Stop rather than silently accept partial/incompatible installations.
IF EXISTS (SELECT 1 FROM @columns expected
 WHERE NOT EXISTS (SELECT 1 FROM sys.columns actual JOIN sys.types typ ON typ.user_type_id=actual.user_type_id
 WHERE actual.object_id=OBJECT_ID(''dbo.''+QUOTENAME(expected.T)) AND actual.name=expected.C AND actual.is_nullable=1
 AND ((expected.D=''varchar(50) NULL'' AND typ.name=''varchar'' AND actual.max_length=50)
 OR (expected.D=''varchar(20) NULL'' AND typ.name=''varchar'' AND actual.max_length=20)
 OR (expected.D=''varchar(100) NULL'' AND typ.name=''varchar'' AND actual.max_length=100)
 OR (expected.D=''varchar(200) NULL'' AND typ.name=''varchar'' AND actual.max_length=200)
 OR (expected.D=''nvarchar(2000) NULL'' AND typ.name=''nvarchar'' AND actual.max_length=4000)
 OR (expected.D=''datetime2(7) NULL'' AND typ.name=''datetime2'' AND actual.scale=7)
 OR (expected.D=''decimal(12,2) NULL'' AND typ.name=''decimal'' AND actual.precision=12 AND actual.scale=2))))
 THROW 51703,''Flow1 column definition differs; entire 002 migration rolled back.'',1;

DECLARE @links TABLE(T sysname,C sysname,N sysname);
INSERT @links VALUES
(''TRIP_PLAN'',''AssignedSpecialistId'',''FK_F1_Specialist''),
(''TRIP_PLAN'',''AssignedCoordinatorId'',''FK_F1_Coordinator'');
DECLARE @n sysname;
DECLARE fk CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,N FROM @links;
OPEN fk; FETCH NEXT FROM fk INTO @t,@c,@n;
WHILE @@FETCH_STATUS=0 BEGIN
 IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=@n) BEGIN
  SET @sql=''ALTER TABLE dbo.''+QUOTENAME(@t)+'' WITH CHECK ADD CONSTRAINT ''+QUOTENAME(@n)+'' FOREIGN KEY(''+QUOTENAME(@c)+'') REFERENCES dbo.[USER](UserID)'';
  EXEC sys.sp_executesql @sql;
 END;
 FETCH NEXT FROM fk INTO @t,@c,@n;
END; CLOSE fk; DEALLOCATE fk;
-- Requests are shared by all Logistics Managers; no ownership/review-time columns.
-- Existing installations may still have the retired ownership FK/column.
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(''dbo.TRANSPORT_REQUEST'') AND name=''FK_F1_Manager'')
 ALTER TABLE dbo.TRANSPORT_REQUEST DROP CONSTRAINT FK_F1_Manager;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''AssignedManagerId'') IS NOT NULL
 ALTER TABLE dbo.TRANSPORT_REQUEST DROP COLUMN AssignedManagerId;
IF COL_LENGTH(''dbo.TRANSPORT_REQUEST'',''ReviewedAtUtc'') IS NOT NULL
 ALTER TABLE dbo.TRANSPORT_REQUEST DROP COLUMN ReviewedAtUtc;
-- The earlier typed guard is retained for legacy fingerprint compatibility.
-- This final guard removes ON_HOLD from the effective allowed states.
-- Existing held trips require operator review; never silently release a trip.
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=''CK_F1Final_Handoff'')
 ALTER TABLE dbo.TRIP_PLAN WITH CHECK ADD CONSTRAINT CK_F1Final_Handoff
 CHECK (DeploymentStatus IS NULL OR DeploymentStatus IN (''PENDING'',''CONFIRMED''));
-- Remove the obsolete assumption that cancellation must be AFTER signing.
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=''CK_F1S_CONTRACT_Cancellation'')
 ALTER TABLE dbo.CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Cancellation;
ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Cancellation CHECK
((CancellationId IS NULL AND CancellationStatus IS NULL AND CancellationReason IS NULL AND CancellationRequestedAtUtc IS NULL AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL)
 OR (CancellationId IS NOT NULL AND CancellationStatus IS NOT NULL AND CancellationReason IS NOT NULL AND CancellationRequestedAtUtc IS NOT NULL
 AND ((CancellationStatus=''PENDING'' AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL)
 OR (CancellationStatus IN (''APPROVED'',''REJECTED'') AND CancellationDecisionReason IS NOT NULL AND CancellationDecidedBy IS NOT NULL AND CancellationDecidedAtUtc IS NOT NULL))));
DECLARE @fingerprint nvarchar(129)=(SELECT N''009:''+CONVERT(nvarchar(64),HASHBYTES(''SHA2_256'',definition),2) FROM sys.check_constraints WHERE name=''CK_F1S_CONTRACT_Cancellation'');
EXEC sys.sp_addextendedproperty @name=N''Flow1SimpleGuardFingerprint'',@value=@fingerprint,@level0type=N''SCHEMA'',@level0name=N''dbo'',@level1type=N''TABLE'',@level1name=N''CONTRACT'',@level2type=N''CONSTRAINT'',@level2name=N''CK_F1S_CONTRACT_Cancellation'';
IF NOT EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=''Flow1.FinalWorkflow'')
 EXEC sys.sp_addextendedproperty @name=N''Flow1.FinalWorkflow'',@value=N''deposit-before-signing-v1'';
-- Dynamic SQL compiles these expressions after the additive columns exist.
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=''CK_F1Final_Feedback'')
 EXEC sys.sp_executesql N''ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1Final_Feedback CHECK
 (FeedbackStatus IS NULL OR (FeedbackStatus IN (''''PENDING'''',''''ACCEPTED'''',''''REJECTED'''') AND CustomerFeedback IS NOT NULL AND FeedbackFields IS NOT NULL AND FeedbackAtUtc IS NOT NULL));'';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=''CK_F1Final_Refund'')
 EXEC sys.sp_executesql N''ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1Final_Refund CHECK
 ((RefundStatus IS NULL AND RefundAmount IS NULL AND RefundReference IS NULL) OR (RefundStatus IN (''''REQUESTED'''',''''PROCESSING'''',''''COMPLETED'''') AND RefundAmount>0 AND (RefundStatus<>''''COMPLETED'''' OR RefundReference IS NOT NULL)));'';
COMMIT;';
    -- Only seed missing required clauses. Tomorrow's operator edits are retained.
    INSERT dbo.CONTRACT_TEMPLATE(TemplateID,TemplateName,LanguageCode,BodyContent,Version,IsActive,CreatedAt)
    SELECT CONCAT('flow1-required-clause-',RIGHT(CONCAT('0',seed.ClauseNo),2)),
        CONCAT(NCHAR(272),N'i',NCHAR(7873),N'u ',seed.ClauseNo), 'VI', NCHAR(64+seed.ClauseNo), '1', 1, SYSUTCDATETIME()
    FROM (VALUES(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) seed(ClauseNo)
    WHERE NOT EXISTS(SELECT 1 FROM dbo.CONTRACT_TEMPLATE existing
        WHERE existing.TemplateID=CONCAT('flow1-required-clause-',RIGHT(CONCAT('0',seed.ClauseNo),2)));
    COMMIT TRANSACTION;
    PRINT N'Flow1 schema ready. Data was not reset; existing links and business values are retained.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
