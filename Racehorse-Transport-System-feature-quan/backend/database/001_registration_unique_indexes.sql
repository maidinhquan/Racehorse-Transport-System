-- Review and run manually against HorseTransportDB. No database reset or data rewrite.
SET XACT_ABORT ON;
IF DB_NAME() <> N'HorseTransportDB'
    THROW 50001, 'Select HorseTransportDB before applying registration indexes.', 1;
IF OBJECT_ID(N'dbo.[USER]', N'U') IS NULL
    THROW 50002, 'Existing dbo.USER table is required.', 1;

IF EXISTS (SELECT LOWER(LTRIM(RTRIM(Email))) FROM dbo.[USER] WHERE Email IS NOT NULL
    GROUP BY LOWER(LTRIM(RTRIM(Email))) HAVING COUNT(*) > 1)
    THROW 50003, 'Resolve duplicate emails before creating unique indexes.', 1;
IF EXISTS (SELECT REPLACE(REPLACE(REPLACE(REPLACE(Phone,' ',''),'-',''),'(',''),')','')
    FROM dbo.[USER] WHERE Phone IS NOT NULL
    GROUP BY REPLACE(REPLACE(REPLACE(REPLACE(Phone,' ',''),'-',''),'(',''),')','') HAVING COUNT(*) > 1)
    THROW 50004, 'Resolve duplicate phone numbers before creating unique indexes.', 1;

-- Explicitly stop on non-normalized legacy data. Reconcile it with the data owner.
IF EXISTS (SELECT 1 FROM dbo.[USER] WHERE Email IS NOT NULL AND
    (Email = '' OR Email COLLATE Latin1_General_100_BIN2 <> LOWER(LTRIM(RTRIM(Email))) COLLATE Latin1_General_100_BIN2
     OR DATALENGTH(Email) <> DATALENGTH(LTRIM(RTRIM(Email)))))
    THROW 50005, 'Normalize legacy emails first; this script will not rewrite them.', 1;
IF EXISTS (SELECT 1 FROM dbo.[USER] WHERE Phone IS NOT NULL AND
    (Phone = '' OR Phone LIKE '% %' OR Phone LIKE '%-%' OR Phone LIKE '%(%' OR Phone LIKE '%)%'))
    THROW 50006, 'Normalize legacy phone numbers first; this script will not rewrite them.', 1;

BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.[USER]') AND name = N'UX_USER_Email')
    CREATE UNIQUE INDEX UX_USER_Email ON dbo.[USER](Email) WHERE Email IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.[USER]') AND name = N'UX_USER_Phone')
    CREATE UNIQUE INDEX UX_USER_Phone ON dbo.[USER](Phone) WHERE Phone IS NOT NULL;
COMMIT;
