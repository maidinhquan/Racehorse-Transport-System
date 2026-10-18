-- Additive: preserves every existing request ID and foreign key. No startup migration.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeclaredValueUsd') IS NULL
    THROW 51600,'Apply reviewed schema007 first.',1;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','SubmissionKeyHash') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD SubmissionKeyHash varchar(64) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
    AND name='SubmissionKeyHash' AND system_type_id=167 AND max_length=64 AND is_nullable=1)
    THROW 51601,'SubmissionKeyHash has an incompatible definition.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='UX_F1N_RequestSubmission')
    EXEC(N'CREATE UNIQUE INDEX UX_F1N_RequestSubmission ON dbo.TRANSPORT_REQUEST(CustomerID,SubmissionKeyHash) WHERE SubmissionKeyHash IS NOT NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.indexes i WHERE i.object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
    AND i.name='UX_F1N_RequestSubmission' AND i.is_unique=1 AND i.is_disabled=0
    AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(i.filter_definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N''))=N'submissionkeyhashisnotnull'
    AND (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),N',') WITHIN GROUP(ORDER BY ic.key_ordinal)
         FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
         WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=N'CustomerID,SubmissionKeyHash'
    AND NOT EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND (ic.is_descending_key=1 OR ic.is_included_column=1)))
    THROW 51602,'Request submission index definition differs from schema008.',1;
COMMIT;
