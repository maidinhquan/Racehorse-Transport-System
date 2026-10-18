using Microsoft.EntityFrameworkCore;
namespace Infrastructure.Data.Context;
public static class Flow1RelationalSchema
{
    public const string ValidationSql="""
        SELECT CONVERT(int,CASE WHEN COL_LENGTH('dbo.HORSE','PhotoUrl') IS NOT NULL
          AND EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='DeclaredValueUsd'
            AND system_type_id=106 AND precision=18 AND scale=2 AND is_nullable=1)
          AND EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST')
            AND name='CK_F1D_DeclaredValueUsd' AND is_disabled=0 AND is_not_trusted=0
            AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N''))=N'declaredvalueusdisnullordeclaredvalueusd>0')
          AND COL_LENGTH('dbo.CONTRACT','SignedDepositDeadline') IS NOT NULL
          AND COL_LENGTH('dbo.PAYMENT','VnpayReceivedAmount') IS NOT NULL
          AND COL_LENGTH('dbo.TRIP_PLAN','RowVersion') IS NOT NULL
          AND NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name LIKE N'CK_F1R[_]%')
          AND (SELECT COUNT(*) FROM sys.check_constraints c JOIN sys.extended_properties e ON e.class=1 AND e.major_id=c.object_id AND e.minor_id=0 AND e.name=N'Flow1SimpleGuardFingerprint'
            WHERE c.name LIKE N'CK_F1S[_]%' AND c.is_disabled=0 AND c.is_not_trusted=0
              AND RIGHT(CONVERT(nvarchar(129),e.value),64)=CONVERT(nvarchar(64),HASHBYTES('SHA2_256',c.definition),2))=25
          AND NOT EXISTS(
            SELECT 1 FROM (VALUES
              (OBJECT_ID('dbo.TRIP_PLAN'),N'UX_TRIP_PLAN_RequestID',N'RequestID',1,N''),
              (OBJECT_ID('dbo.INVOICE'),N'UX_INVOICE_ContractID_Deposit',N'ContractID',1,N'invoicetype=''deposit'''),
              (OBJECT_ID('dbo.CONTRACT'),N'UX_F1S_CurrentContract',N'RequestID',1,N'iscurrent=1'),
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
