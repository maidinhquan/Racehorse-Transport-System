-- Complete legacy pending cancellations initiated by a Manager, before signing.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @targets TABLE (RequestID varchar(50), ContractID varchar(50), CustomerID varchar(50), ActorID varchar(50), Reason nvarchar(1000), Received decimal(14,2));
INSERT @targets
SELECT r.RequestID,c.ContractID,r.CustomerID,r.CancellationRequestedBy,r.CancellationReason,
       COALESCE((SELECT SUM(p.VnpayReceivedAmount) FROM dbo.INVOICE i JOIN dbo.PAYMENT p ON p.InvoiceID=i.InvoiceID
                 WHERE i.ContractID=c.ContractID AND p.VnpayReceivedAmount>0),0)
FROM dbo.TRANSPORT_REQUEST r WITH (UPDLOCK,HOLDLOCK)
JOIN dbo.CONTRACT c ON c.RequestID=r.RequestID
JOIN dbo.[USER] u ON u.UserID=r.CancellationRequestedBy
WHERE r.Status='CANCELLATION_REQUESTED' AND c.CancellationStatus='PENDING'
  AND u.Role IN ('LOGISTICS_MANAGER','MANAGER') AND c.SignedAt IS NULL AND c.TripID IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.TRIP_PLAN t WHERE t.RequestID=r.RequestID)
  AND NOT EXISTS (SELECT 1 FROM dbo.INVOICE i JOIN dbo.PAYMENT p ON p.InvoiceID=i.InvoiceID
                 WHERE i.ContractID=c.ContractID AND p.Status='PENDING_GATEWAY'
                   AND (p.VnpayTmnCode IS NOT NULL OR p.VnpayExpiresAtUtc>SYSUTCDATETIME()));
UPDATE r SET Status='CANCELLED',CancellationPreviousStatus=NULL
FROM dbo.TRANSPORT_REQUEST r JOIN @targets t ON t.RequestID=r.RequestID;
UPDATE c SET ContractStatus='CANCELLED',CancellationStatus='APPROVED',
             CancellationDecisionReason=t.Reason,CancellationDecidedBy=t.ActorID,CancellationDecidedAtUtc=SYSUTCDATETIME(),
             SignOtpHash=NULL,SignOtpExpiry=NULL,SignOtpSentAtUtc=NULL,
             RefundStatus=CASE WHEN t.Received>0 THEN COALESCE(c.RefundStatus,'REQUESTED') ELSE c.RefundStatus END
FROM dbo.CONTRACT c JOIN @targets t ON t.ContractID=c.ContractID;
UPDATE i SET PaymentStatus='CANCELLED' FROM dbo.INVOICE i JOIN @targets t ON t.ContractID=i.ContractID;
UPDATE v SET VersionStatus='CANCELLED' FROM dbo.CONTRACT_VERSION v JOIN @targets t ON t.ContractID=v.ContractID
WHERE v.VersionStatus<>'SIGNED';
INSERT dbo.NOTIFICATION(NotificationID,UserID,ReferenceID,Type,Channel,Title,Message,SentAt)
SELECT 'NOTIFICATION_'+FORMAT(NEXT VALUE FOR dbo.SEQ_NOTIFICATION_ID,'000','en-US'),
       CustomerID,RequestID,'CANCELLATION_DECIDED','IN_APP',N'Quản lý đã hủy yêu cầu',Reason,SYSUTCDATETIME() FROM @targets;
SELECT RequestID,ContractID,Received AS RefundDue FROM @targets;
COMMIT;
