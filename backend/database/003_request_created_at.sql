-- Additive migration for existing databases. Never invent creation dates for old rows.
-- Run against the configured Flow 1 database before starting the updated backend.
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'CreatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD CreatedAtUtc datetime2(7) NULL
        CONSTRAINT DF_TRANSPORT_REQUEST_CreatedAtUtc DEFAULT SYSUTCDATETIME();
END;
