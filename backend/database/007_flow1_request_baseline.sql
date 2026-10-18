-- Reviewed additive extension: one column, one CHECK, no tables or foreign keys.
-- Run offline on an explicitly approved target; never executed at API startup.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','RowVersion') IS NULL
    THROW 51400,'Apply the reviewed schema006 before schema007.',1;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','DeclaredValueUsd') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD DeclaredValueUsd decimal(18,2) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
    AND name='DeclaredValueUsd' AND system_type_id=106 AND precision=18 AND scale=2 AND is_nullable=1)
    THROW 51401,'Existing DeclaredValueUsd has an incompatible definition.',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='CK_F1D_DeclaredValueUsd')
    EXEC(N'ALTER TABLE dbo.TRANSPORT_REQUEST WITH CHECK ADD CONSTRAINT CK_F1D_DeclaredValueUsd CHECK (DeclaredValueUsd IS NULL OR DeclaredValueUsd > 0);');
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
    AND name='CK_F1D_DeclaredValueUsd' AND (is_disabled=1 OR is_not_trusted=1))
    THROW 51402,'Declared-value CHECK must be enabled and trusted.',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
    AND name='CK_F1D_DeclaredValueUsd' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N''))=N'declaredvalueusdisnullordeclaredvalueusd>0')
    THROW 51403,'Declared-value CHECK definition differs from schema007.',1;
COMMIT;
