-- Run against the existing application database. No database is dropped or recreated.
-- Removes the retired request attachments and clears the retired customs document metadata.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.TRANSPORT_REQUEST', 'U') IS NULL
    THROW 51000, 'TRANSPORT_REQUEST is missing; select the application database.', 1;

DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'ALTER TABLE dbo.TRANSPORT_REQUEST DROP CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.TRANSPORT_REQUEST')
  AND (definition LIKE '%InvitationLetterFileUrl%'
    OR definition LIKE '%CompetitionRegistrationFileUrl%'
    OR definition LIKE '%AtaCarnetFileUrl%');
SELECT @sql += N'ALTER TABLE dbo.TRANSPORT_REQUEST DROP CONSTRAINT ' + QUOTENAME(d.name) + N';'
FROM sys.default_constraints d
JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
WHERE d.parent_object_id = OBJECT_ID('dbo.TRANSPORT_REQUEST')
  AND c.name IN ('InvitationLetterFileUrl', 'CompetitionRegistrationFileUrl', 'AtaCarnetFileUrl');
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'InvitationLetterFileUrl') IS NOT NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST DROP COLUMN InvitationLetterFileUrl;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'CompetitionRegistrationFileUrl') IS NOT NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST DROP COLUMN CompetitionRegistrationFileUrl;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'AtaCarnetFileUrl') IS NOT NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST DROP COLUMN AtaCarnetFileUrl;

IF OBJECT_ID('dbo.CUSTOMS_CLEARANCE', 'U') IS NOT NULL
    UPDATE dbo.CUSTOMS_CLEARANCE SET DocumentType = NULL, DeclarationNumber = NULL
    WHERE DocumentType IN ('INVITATION_LETTER', 'COMPETITION_REGISTRATION', 'ATA_CARNET');

COMMIT TRANSACTION;
