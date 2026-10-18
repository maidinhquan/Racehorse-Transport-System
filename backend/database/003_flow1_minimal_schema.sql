-- Minimal migration: TWO new columns, nullable TripID, FK/indexes. NO new tables.
-- Caller selects the target database explicitly. Never automatically run on API startup.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.CONTRACT', N'U') IS NULL OR OBJECT_ID(N'dbo.TRIP_PLAN', N'U') IS NULL
    OR OBJECT_ID(N'dbo.TRANSPORT_REQUEST', N'U') IS NULL OR OBJECT_ID(N'dbo.INVOICE', N'U') IS NULL
    THROW 51000, 'Flow 1 requires the existing legacy schema.', 1;

BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @lockResult int;
  EXEC @lockResult = sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Schema',
      @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
  IF @lockResult < 0 THROW 51001, 'Flow 1 migration lock unavailable.', 1;

  IF EXISTS (SELECT RequestID FROM dbo.TRIP_PLAN GROUP BY RequestID HAVING COUNT_BIG(*)>1)
      THROW 51002, 'Duplicate Trip.RequestID. Review data; migration never deletes trips.', 1;
  IF EXISTS (SELECT ContractID FROM dbo.INVOICE WHERE InvoiceType='DEPOSIT' GROUP BY ContractID HAVING COUNT_BIG(*)>1)
      THROW 51003, 'Duplicate deposit invoices. Review data before migration.', 1;
  IF EXISTS (
      SELECT 1 FROM dbo.CONTRACT c
      LEFT JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID
      LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID=t.RequestID
      WHERE c.TripID IS NOT NULL AND (t.TripID IS NULL OR r.RequestID IS NULL OR r.CustomerID<>c.CustomerID))
      THROW 51004, 'Legacy contract does not match its trip/request/customer.', 1;

  IF COL_LENGTH(N'dbo.CONTRACT', N'RequestID') IS NULL
      ALTER TABLE dbo.CONTRACT ADD RequestID varchar(50) NULL;
  IF COL_LENGTH(N'dbo.CONTRACT', N'CompletionDeadline') IS NULL
      ALTER TABLE dbo.CONTRACT ADD CompletionDeadline datetime2 NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.CONTRACT')
      AND name=N'RequestID' AND TYPE_NAME(user_type_id)='varchar' AND max_length=50)
      THROW 51005, 'Existing Contract.RequestID has an unexpected type.', 1;
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.CONTRACT')
      AND name=N'CompletionDeadline' AND TYPE_NAME(user_type_id)='datetime2')
      THROW 51006, 'Existing CompletionDeadline must be datetime2; do not silently convert old dates.', 1;

  -- Dynamic batches compile AFTER the new column exists. Never overwrite an existing link.
  EXEC(N'UPDATE c SET RequestID=t.RequestID FROM dbo.CONTRACT c
         JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID WHERE c.RequestID IS NULL;');
  EXEC(N'IF EXISTS (
      SELECT 1 FROM dbo.CONTRACT c LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID=c.RequestID
      LEFT JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID
      WHERE c.RequestID IS NULL OR r.RequestID IS NULL OR r.CustomerID<>c.CustomerID
         OR (c.TripID IS NOT NULL AND t.RequestID<>c.RequestID))
      THROW 51007, ''Cannot backfill Contract.RequestID without inventing or overwriting data.'', 1;');
  EXEC(N'ALTER TABLE dbo.CONTRACT ALTER COLUMN RequestID varchar(50) NOT NULL;');
  ALTER TABLE dbo.CONTRACT ALTER COLUMN TripID varchar(50) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Contract_Request' AND parent_object_id=OBJECT_ID(N'dbo.CONTRACT'))
      EXEC(N'ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT FK_Contract_Request
             FOREIGN KEY(RequestID) REFERENCES dbo.TRANSPORT_REQUEST(RequestID);');
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_CONTRACT_RequestID' AND object_id=OBJECT_ID(N'dbo.CONTRACT'))
      EXEC(N'CREATE INDEX IX_CONTRACT_RequestID ON dbo.CONTRACT(RequestID);');
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TRIP_PLAN_RequestID' AND object_id=OBJECT_ID(N'dbo.TRIP_PLAN')
      AND (is_unique=0 OR is_disabled=1 OR has_filter=1
        OR (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal>0)<>1
        OR NOT EXISTS(SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id=k.object_id AND c.column_id=k.column_id
          WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal=1 AND c.name=N'RequestID')))
      THROW 51008, 'Existing trip index does not enforce the required uniqueness.', 1;
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_INVOICE_ContractID_Deposit' AND object_id=OBJECT_ID(N'dbo.INVOICE')
      AND (is_unique=0 OR is_disabled=1 OR has_filter=0
        OR UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(filter_definition,N' ',N''),N'[',N''),N']',N''),N'(',N''),N')',N''))<>N'INVOICETYPE=''DEPOSIT'''
        OR (SELECT COUNT(*) FROM sys.index_columns k WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal>0)<>1
        OR NOT EXISTS(SELECT 1 FROM sys.index_columns k JOIN sys.columns c ON c.object_id=k.object_id AND c.column_id=k.column_id
          WHERE k.object_id=sys.indexes.object_id AND k.index_id=sys.indexes.index_id AND k.key_ordinal=1 AND c.name=N'ContractID')))
      THROW 51009, 'Existing deposit index does not enforce the required uniqueness.', 1;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_TRIP_PLAN_RequestID' AND object_id=OBJECT_ID(N'dbo.TRIP_PLAN'))
      CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON dbo.TRIP_PLAN(RequestID);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_INVOICE_ContractID_Deposit' AND object_id=OBJECT_ID(N'dbo.INVOICE'))
      CREATE UNIQUE INDEX UX_INVOICE_ContractID_Deposit ON dbo.INVOICE(ContractID) WHERE InvoiceType='DEPOSIT';
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
