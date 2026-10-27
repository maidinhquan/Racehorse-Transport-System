using Microsoft.EntityFrameworkCore;
namespace Infrastructure.Data.Context;
public static class Flow1RelationalSchema
{
    // Current schema only. No historical profile markers or constraint fingerprints.
    public const string ValidationSql="""
        SELECT CONVERT(int,CASE WHEN OBJECT_ID('dbo.COST_RATE','U') IS NOT NULL
          AND COL_LENGTH('dbo.CONTRACT','CommercialNotes')=4000
          AND COL_LENGTH('dbo.CONTRACT','CompletionDeadline')=8
          AND COL_LENGTH('dbo.CONTRACT','EffectiveSignDeadline') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','DepositDeadline') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','SignedDepositDeadline') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','IsCurrent') IS NULL
          AND COL_LENGTH('dbo.CONTRACT_TEMPLATE','Version') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','LastExtensionTarget') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','BaseContractPrice_P') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','ExchangeRateToLocal') IS NULL
          AND COL_LENGTH('dbo.CONTRACT','ActualGrossProfit_AGP') IS NULL
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','AssignedManagerId') IS NULL
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','ReviewedAtUtc') IS NULL
          AND COL_LENGTH('dbo.HORSE','PassportIssuedBy')=400
          AND COL_LENGTH('dbo.HORSE','PassportIssuedDate')=3
          AND COL_LENGTH('dbo.HORSE','PassportExpiryDate')=3
          AND COL_LENGTH('dbo.HORSE','OwnershipCertificateFileUrl')=1000
          AND COL_LENGTH('dbo.HORSE','ValuationDocumentFileUrl')=1000
          AND COL_LENGTH('dbo.HORSE','SpecialHealthNotes')=4000
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupStableName')=400
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupPostalCode')=40
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','PickupInstructions')=2000
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryStableName')=400
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryPostalCode')=40
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','DeliveryInstructions')=2000
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','CareInstructions')=4000
          AND COL_LENGTH('dbo.REQUEST_HORSE_MAPPING','CareInstructions')=4000
          AND COL_LENGTH('dbo.HORSE','PhotoUrl')=1000 AND COL_LENGTH('dbo.HORSE','PassportScanUrl')=1000
          AND EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.HORSE') AND name='DeclaredValueVnd' AND TYPE_NAME(user_type_id)='decimal' AND precision=18 AND scale=2)
          AND EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='DeclaredValueVnd' AND TYPE_NAME(user_type_id)='decimal' AND precision=18 AND scale=2)
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','ManagerNotes')=2000
          AND EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='DistanceKm' AND TYPE_NAME(user_type_id)='decimal' AND precision=10 AND scale=2)
          AND COL_LENGTH('dbo.TRANSPORT_REQUEST','SubmissionKeyHash')=64
          AND COL_LENGTH('dbo.CONTRACT','FeedbackStatus')=20 AND COL_LENGTH('dbo.CONTRACT','RefundStatus')=20
          AND COL_LENGTH('dbo.TRIP_PLAN','AssignedSpecialistId')=50 AND COL_LENGTH('dbo.TRIP_PLAN','AssignedCoordinatorId')=50
          AND NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRIP_PLAN') AND name LIKE '%Acknowledged%')
          AND NOT EXISTS(SELECT 1 FROM (VALUES ('HORSE'),('TRANSPORT_REQUEST'),('CONTRACT'),('PAYMENT'),('TRIP_PLAN'),('COST_RATE')) t(n)
            WHERE NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.'+t.n) AND name='RowVersion' AND system_type_id=189 AND is_nullable=0))
          AND EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_F1S_CONTRACT_Deposit'
            AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N'')) LIKE N'%depositratestandard>0%')
          AND EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='DeclaredValueUsd' AND TYPE_NAME(user_type_id)='decimal' AND precision=18 AND scale=2)
          AND EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_F1D_DeclaredValueUsd'
            AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N''))=N'declaredvalueusdisnullordeclaredvalueusd>0')
          AND (SELECT COUNT(*) FROM sys.foreign_keys WHERE name IN ('FK_F1_Specialist','FK_F1_Coordinator','FK_Contract_Request') AND is_disabled=0 AND is_not_trusted=0)=3
          AND NOT EXISTS(SELECT 1 FROM (VALUES ('CK_F1W_HORSE_OwnershipCertificateFileUrl'),('CK_F1W_HORSE_ValuationDocumentFileUrl'),('CK_F1W_HORSE_DeclaredValueVnd'),('CK_F1W_TRANSPORT_REQUEST_DeclaredValueVnd'),('CK_F1W_HORSE_PassportDates'),('CK_F1S_HORSE_PhotoUrl'),('CK_F1S_HORSE_PassportScanUrl'),('CK_F1S_TRANSPORT_REQUEST_Pickup'),('CK_F1S_TRANSPORT_REQUEST_Delivery'),('CK_F1S_TRANSPORT_REQUEST_Distance'),('CK_F1S_TRANSPORT_REQUEST_Route'),('CK_F1S_TRANSPORT_REQUEST_Preparation'),('CK_F1D_DeclaredValueUsd'),('CK_F1S_TRIP_PLAN_Deployment'),('CK_F1Final_Handoff'),('CK_F1S_CONTRACT_PdfUrl'),('CK_F1S_CONTRACT_Deposit'),('CK_F1S_CONTRACT_Pdf'),('CK_F1S_CONTRACT_Publication'),('CK_F1S_CONTRACT_OtpAttempts'),('CK_F1S_CONTRACT_Otp'),('CK_F1S_CONTRACT_SignDeadline'),('CK_F1S_CONTRACT_Signed'),('CK_F1S_CONTRACT_Extension'),('CK_F1S_CONTRACT_Cancellation'),('CK_F1Final_Feedback'),('CK_F1Final_Refund'),('CK_F1S_PAYMENT_Attempt'),('CK_F1S_PAYMENT_Success'),('CK_F1S_PAYMENT_Received'),('CK_F1S_PAYMENT_Review'),('CK_F1S_PAYMENT_Reviewer')) expected(n)
            WHERE NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=expected.n AND is_disabled=0 AND is_not_trusted=0))
          AND NOT EXISTS(
            SELECT 1 FROM (VALUES
              (OBJECT_ID('dbo.TRIP_PLAN'),N'UX_TRIP_PLAN_RequestID',N'RequestID',1,N''),
              (OBJECT_ID('dbo.TRANSPORT_REQUEST'),N'UX_F1N_RequestSubmission',N'CustomerID,SubmissionKeyHash',1,N'submissionkeyhashisnotnull'),
              (OBJECT_ID('dbo.INVOICE'),N'UX_INVOICE_ContractID_Deposit',N'ContractID',1,N'invoicetype=''deposit'''),
              (OBJECT_ID('dbo.CONTRACT'),N'UX_CONTRACT_RequestID',N'RequestID',1,N''),
              (OBJECT_ID('dbo.PAYMENT'),N'UX_F1S_VnpayReceipt',N'VnpayTmnCode,TransactionCode',1,N'vnpaytmncodeisnotnullandtransactioncodeisnotnullandstatus=''success'''),
              (OBJECT_ID('dbo.NOTIFICATION'),N'IX_F1S_OtpBudget',N'UserID,Type,Channel,SentAt',0,N'')) expected(id,name,keys,u,f)
            WHERE NOT EXISTS(SELECT 1 FROM sys.indexes i WHERE i.object_id=expected.id AND i.name=expected.name AND i.is_unique=expected.u AND i.is_disabled=0
              AND ISNULL(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(i.filter_definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N'')),N'')=expected.f
              AND (SELECT STRING_AGG(CONVERT(nvarchar(max),c.name),N',') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=expected.keys
              AND NOT EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND (ic.is_descending_key=1 OR ic.is_included_column=1))))
          THEN 1 ELSE 0 END) AS Value
        """;
    public static async Task<bool> IsReadyAsync(Flow1RelationalContext db,CancellationToken ct)=>await db.Database.SqlQueryRaw<int>(ValidationSql).SingleAsync(ct)==1;
}
