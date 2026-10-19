-- Flow 1 final scope: assigned manager/staff, latest feedback, deposit BEFORE signing.
-- No new table, no contract-content column, no contract history/audit.
-- Apply explicitly after 003/006/007/008; never at application startup.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST','SubmissionKeyHash') IS NULL
    THROW 51400,'Apply reviewed schema 003/006/007/008 first.',1;
DECLARE @columns TABLE(T sysname,C sysname,D nvarchar(100));
INSERT @columns VALUES
('TRANSPORT_REQUEST','AssignedManagerId','varchar(50) NULL'),
('TRANSPORT_REQUEST','ReviewedAtUtc','datetime2(7) NULL'),
('CONTRACT','CustomerFeedback','nvarchar(2000) NULL'),
('CONTRACT','FeedbackFields','varchar(200) NULL'),
('CONTRACT','FeedbackStatus','varchar(20) NULL'),
('CONTRACT','FeedbackAtUtc','datetime2(7) NULL'),
('CONTRACT','ManagerFeedback','nvarchar(2000) NULL'),
('CONTRACT','FeedbackHandledAtUtc','datetime2(7) NULL'),
('CONTRACT','RefundAmount','decimal(12,2) NULL'),
('CONTRACT','RefundStatus','varchar(20) NULL'),
('CONTRACT','RefundReference','varchar(100) NULL'),
('TRIP_PLAN','AssignedSpecialistId','varchar(50) NULL'),
('TRIP_PLAN','AssignedCoordinatorId','varchar(50) NULL');
DECLARE @t sysname,@c sysname,@d nvarchar(100),@sql nvarchar(max);
DECLARE col CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,D FROM @columns;
OPEN col; FETCH NEXT FROM col INTO @t,@c,@d;
WHILE @@FETCH_STATUS=0 BEGIN
 IF COL_LENGTH('dbo.'+@t,@c) IS NULL BEGIN
  SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' ADD '+QUOTENAME(@c)+' '+@d;
  EXEC sys.sp_executesql @sql;
 END;
 FETCH NEXT FROM col INTO @t,@c,@d;
END; CLOSE col; DEALLOCATE col;
DECLARE @links TABLE(T sysname,C sysname,N sysname);
INSERT @links VALUES
('TRANSPORT_REQUEST','AssignedManagerId','FK_F1_Manager'),
('TRIP_PLAN','AssignedSpecialistId','FK_F1_Specialist'),
('TRIP_PLAN','AssignedCoordinatorId','FK_F1_Coordinator');
DECLARE @n sysname;
DECLARE fk CURSOR LOCAL FAST_FORWARD FOR SELECT T,C,N FROM @links;
OPEN fk; FETCH NEXT FROM fk INTO @t,@c,@n;
WHILE @@FETCH_STATUS=0 BEGIN
 IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=@n) BEGIN
  SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' WITH CHECK ADD CONSTRAINT '+QUOTENAME(@n)+' FOREIGN KEY('+QUOTENAME(@c)+') REFERENCES dbo.[USER](UserID)';
  EXEC sys.sp_executesql @sql;
 END;
 FETCH NEXT FROM fk INTO @t,@c,@n;
END; CLOSE fk; DEALLOCATE fk;
-- Remove the obsolete assumption that cancellation must be AFTER signing.
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_F1S_CONTRACT_Cancellation')
 ALTER TABLE dbo.CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Cancellation;
ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Cancellation CHECK
((CancellationId IS NULL AND CancellationStatus IS NULL AND CancellationReason IS NULL AND CancellationRequestedAtUtc IS NULL AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL)
 OR (CancellationId IS NOT NULL AND CancellationStatus IS NOT NULL AND CancellationReason IS NOT NULL AND CancellationRequestedAtUtc IS NOT NULL
 AND ((CancellationStatus='PENDING' AND CancellationDecisionReason IS NULL AND CancellationDecidedBy IS NULL AND CancellationDecidedAtUtc IS NULL)
 OR (CancellationStatus IN ('APPROVED','REJECTED') AND CancellationDecisionReason IS NOT NULL AND CancellationDecidedBy IS NOT NULL AND CancellationDecidedAtUtc IS NOT NULL))));
DECLARE @fingerprint nvarchar(129)=(SELECT N'009:'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',definition),2) FROM sys.check_constraints WHERE name='CK_F1S_CONTRACT_Cancellation');
EXEC sys.sp_addextendedproperty @name=N'Flow1SimpleGuardFingerprint',@value=@fingerprint,@level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=N'CONTRACT',@level2type=N'CONSTRAINT',@level2name=N'CK_F1S_CONTRACT_Cancellation';
IF NOT EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name='Flow1.FinalWorkflow')
 EXEC sys.sp_addextendedproperty @name=N'Flow1.FinalWorkflow',@value=N'deposit-before-signing-v1';
-- Dynamic SQL compiles these expressions after the additive columns exist.
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_F1Final_Feedback')
 EXEC sys.sp_executesql N'ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1Final_Feedback CHECK
 (FeedbackStatus IS NULL OR (FeedbackStatus IN (''PENDING'',''ACCEPTED'',''REJECTED'') AND CustomerFeedback IS NOT NULL AND FeedbackFields IS NOT NULL AND FeedbackAtUtc IS NOT NULL));';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_F1Final_Refund')
 EXEC sys.sp_executesql N'ALTER TABLE dbo.CONTRACT WITH CHECK ADD CONSTRAINT CK_F1Final_Refund CHECK
 ((RefundStatus IS NULL AND RefundAmount IS NULL AND RefundReference IS NULL) OR (RefundStatus IN (''REQUESTED'',''PROCESSING'',''COMPLETED'') AND RefundAmount>0 AND (RefundStatus<>''COMPLETED'' OR RefundReference IS NOT NULL)));';
COMMIT;
