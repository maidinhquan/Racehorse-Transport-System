-- Agreed Flow1: accept terms -> verified deposit -> OTP -> activation.
-- Additive schema; existing contracts/receipts are retained as workflow 0.
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 IF COL_LENGTH('dbo.CONTRACT','SignedDepositDeadline') IS NULL
  THROW 51800,'Apply the existing relational foundation before migration 008.',1;
 IF COL_LENGTH('dbo.CONTRACT','WorkflowVersion') IS NULL
  ALTER TABLE dbo.CONTRACT ADD WorkflowVersion int NOT NULL CONSTRAINT DF_F1_Workflow DEFAULT(0),
   ContractVersion int NOT NULL CONSTRAINT DF_F1_ContractVersion DEFAULT(1),
   SourceContractID varchar(50) NULL, TermsAcceptedAtUtc datetime2(7) NULL,
   TermsAcceptedPdfSha256 char(64) NULL, InsuranceAmount decimal(12,2) NULL,
   TermsText nvarchar(4000) NULL, RefundStatus varchar(20) NULL,
   RefundAmount decimal(12,2) NULL, RefundReference nvarchar(200) NULL;
 IF OBJECT_ID('dbo.FLOW1_CONTRACT_CHANGE','U') IS NULL
  CREATE TABLE dbo.FLOW1_CONTRACT_CHANGE(
   ChangeID varchar(50) NOT NULL PRIMARY KEY, ContractID varchar(50) NOT NULL,
   Status varchar(20) NOT NULL, Reason nvarchar(1000) NOT NULL, Decision nvarchar(1000) NULL,
   DecidedBy varchar(50) NULL, RequestedAtUtc datetime2(7) NOT NULL, DecidedAtUtc datetime2(7) NULL,
   CONSTRAINT FK_F1_CHANGE_Contract FOREIGN KEY(ContractID) REFERENCES dbo.CONTRACT(ContractID),
   CONSTRAINT CK_F1_CHANGE_Status CHECK(Status IN ('PENDING','APPROVED','REJECTED')));
 IF OBJECT_ID('dbo.FLOW1_CONTRACT_CHANGE_FIELD','U') IS NULL
  CREATE TABLE dbo.FLOW1_CONTRACT_CHANGE_FIELD(
   FieldID varchar(50) NOT NULL PRIMARY KEY, ChangeID varchar(50) NOT NULL, FieldName varchar(20) NOT NULL,
   CONSTRAINT FK_F1_CHANGE_FIELD_Change FOREIGN KEY(ChangeID) REFERENCES dbo.FLOW1_CONTRACT_CHANGE(ChangeID),
   CONSTRAINT UQ_F1_CHANGE_FIELD UNIQUE(ChangeID,FieldName),
   CONSTRAINT CK_F1_CHANGE_FIELD CHECK(FieldName IN ('PRICE','DEPOSIT','INSURANCE','TERMS')));
 IF OBJECT_ID('dbo.FLOW1_CONTRACT_EVENT','U') IS NULL
  CREATE TABLE dbo.FLOW1_CONTRACT_EVENT(
   EventID varchar(50) NOT NULL PRIMARY KEY, ContractID varchar(50) NOT NULL, ActorID varchar(50) NOT NULL,
   Action varchar(40) NOT NULL, Reason nvarchar(1000) NOT NULL, AtUtc datetime2(7) NOT NULL,
   PreviousDeadline datetime2(7) NULL, NewDeadline datetime2(7) NULL,
   CONSTRAINT FK_F1_EVENT_Contract FOREIGN KEY(ContractID) REFERENCES dbo.CONTRACT(ContractID));

 -- Preserve the trusted-guard fingerprint mechanism used by the relational context.
 DECLARE @guards TABLE(Name sysname,Definition nvarchar(max));
 INSERT @guards VALUES
 ('CK_F1S_CONTRACT_Deposit',N'DepositAmount IS NULL OR (CurrencyCode=''VND'' AND TotalQuotedPrice>0 AND TotalQuotedPrice=ROUND(TotalQuotedPrice,0) AND DepositRateStandard>0 AND DepositRateStandard<=100 AND DepositAmount>0 AND DepositAmount=ROUND(TotalQuotedPrice*DepositRateStandard/100,0))'),
 ('CK_F1S_CONTRACT_Cancellation',N'(CancellationId IS NULL AND CancellationStatus IS NULL AND CancellationReason IS NULL AND CancellationRequestedAtUtc IS NULL AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL) OR (CancellationId IS NOT NULL AND CancellationStatus IS NOT NULL AND CancellationReason IS NOT NULL AND CancellationRequestedAtUtc IS NOT NULL AND ((CancellationStatus=''PENDING'' AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL) OR (CancellationStatus IN (''APPROVED'',''REJECTED'') AND CancellationDecisionReason IS NOT NULL AND CancellationDecidedBy IS NOT NULL AND CancellationDecidedAtUtc IS NOT NULL)))');
 DECLARE @name sysname,@definition nvarchar(max),@sql nvarchar(max),@fingerprint nvarchar(129);
 DECLARE checks CURSOR LOCAL FAST_FORWARD FOR SELECT Name,Definition FROM @guards;
 OPEN checks; FETCH NEXT FROM checks INTO @name,@definition;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.CONTRACT') AND name=@name)
  BEGIN SET @sql=N'ALTER TABLE dbo.CONTRACT DROP CONSTRAINT '+QUOTENAME(@name); EXEC sys.sp_executesql @sql; END;
  SET @sql=N'ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT '+QUOTENAME(@name)+N' CHECK('+@definition+N')';
  EXEC sys.sp_executesql @sql;
  SELECT @fingerprint=N'008:'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',definition),2)
   FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.CONTRACT') AND name=@name;
  EXEC sys.sp_addextendedproperty @name=N'Flow1SimpleGuardFingerprint',@value=@fingerprint,
   @level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=N'CONTRACT',@level2type=N'CONSTRAINT',@level2name=@name;
  FETCH NEXT FROM checks INTO @name,@definition;
 END;
 CLOSE checks; DEALLOCATE checks;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
