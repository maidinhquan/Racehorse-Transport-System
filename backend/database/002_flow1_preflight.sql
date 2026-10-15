-- READ ONLY. Run in the intended database, not master. No USE/DROP/reset.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.CONTRACT', N'U') IS NULL
    OR OBJECT_ID(N'dbo.TRANSPORT_REQUEST', N'U') IS NULL
    OR OBJECT_ID(N'dbo.TRIP_PLAN', N'U') IS NULL
    OR OBJECT_ID(N'dbo.INVOICE', N'U') IS NULL
    THROW 51000, 'Flow 1 requires the existing legacy schema.', 1;

SELECT DB_NAME() AS DatabaseName, @@SERVERNAME AS ServerName;
SELECT N'DUPLICATE_TRIP_REQUEST' AS Issue, RequestID AS ReferenceID, COUNT_BIG(*) AS Occurrences
FROM dbo.TRIP_PLAN GROUP BY RequestID HAVING COUNT_BIG(*) > 1;
SELECT N'DUPLICATE_DEPOSIT_INVOICE' AS Issue, ContractID AS ReferenceID, COUNT_BIG(*) AS Occurrences
FROM dbo.INVOICE WHERE InvoiceType = 'DEPOSIT' GROUP BY ContractID HAVING COUNT_BIG(*) > 1;
SELECT N'CONTRACT_TRIP_OR_CUSTOMER_MISMATCH' AS Issue, c.ContractID
FROM dbo.CONTRACT c
LEFT JOIN dbo.TRIP_PLAN t ON t.TripID = c.TripID
LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID = t.RequestID
WHERE c.TripID IS NOT NULL AND (t.TripID IS NULL OR r.RequestID IS NULL OR r.CustomerID <> c.CustomerID);
IF COL_LENGTH(N'dbo.CONTRACT', N'RequestID') IS NOT NULL
    EXEC(N'SELECT N''CONTRACT_REQUEST_MISMATCH'' AS Issue, c.ContractID
      FROM dbo.CONTRACT c LEFT JOIN dbo.TRANSPORT_REQUEST r ON r.RequestID=c.RequestID
      LEFT JOIN dbo.TRIP_PLAN t ON t.TripID=c.TripID
      WHERE c.RequestID IS NULL OR r.RequestID IS NULL OR r.CustomerID<>c.CustomerID
         OR (c.TripID IS NOT NULL AND t.RequestID<>c.RequestID);');
SELECT name AS ColumnName, TYPE_NAME(user_type_id) AS SqlType, max_length, is_nullable
FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.CONTRACT');
