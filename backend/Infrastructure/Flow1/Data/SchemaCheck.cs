using Microsoft.Data.SqlClient;
using static Application.Flow1.Rules.BusinessRules;
namespace Infrastructure.Flow1.Data;
public sealed class SchemaCheck(string connectionString)
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private bool ready;
    public async Task EnsureAsync(CancellationToken ct)
    {
        if (ready) return;
        await gate.WaitAsync(ct);
        try
        {
            if (ready) return;
            await using var connection = new SqlConnection(connectionString);
            try
            {
                await connection.OpenAsync(ct);
                await using var command = new SqlCommand("""
                    SELECT CASE WHEN OBJECT_ID('dbo.CONTRACT_VERSION') IS NOT NULL
                    AND COL_LENGTH('dbo.CONTRACT_VERSION','TermsAcceptedAtUtc') IS NOT NULL
                    AND COL_LENGTH('dbo.TRANSPORT_REQUEST','CancellationPreviousStatus') IS NOT NULL
                    AND COL_LENGTH('dbo.TRANSPORT_REQUEST','RevisionFeedback') IS NOT NULL
                    AND OBJECT_ID('dbo.BUSINESS_POLICY') IS NOT NULL
                    AND OBJECT_ID('dbo.SUPPORTED_ROUTE') IS NOT NULL
                    AND COL_LENGTH('dbo.HORSE','RowVersion') IS NULL
                    AND COL_LENGTH('dbo.CONTRACT','PdfSha256') IS NULL
                    AND EXISTS(SELECT 1 FROM sys.sequences WHERE name='SEQ_TRANSPORT_REQUEST_ID' AND is_cycling=0)
                    AND (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN
                        ('USER','HORSE','TRANSPORT_REQUEST','REQUEST_HORSE_MAPPING','LEGAL_MEDICAL_RECORD','TRIP_PLAN',
                         'CONTRACT_TEMPLATE','CONTRACT','CONTRACT_VERSION','COST_ITEM','INVOICE','PAYMENT',
                         'NOTIFICATION','COST_RATE','COUNTRY','SUPPORTED_ROUTE','BUSINESS_POLICY'))=17
                    AND NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE (is_disabled=1 OR is_not_trusted=1)
                        AND parent_object_id IN (OBJECT_ID('dbo.HORSE'),OBJECT_ID('dbo.TRANSPORT_REQUEST'),
                            OBJECT_ID('dbo.CONTRACT'),OBJECT_ID('dbo.CONTRACT_VERSION'),OBJECT_ID('dbo.INVOICE'),
                            OBJECT_ID('dbo.PAYMENT'),OBJECT_ID('dbo.TRIP_PLAN'),OBJECT_ID('dbo.BUSINESS_POLICY')))
                    AND NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE (is_disabled=1 OR is_not_trusted=1)
                        AND parent_object_id IN (OBJECT_ID('dbo.REQUEST_HORSE_MAPPING'),OBJECT_ID('dbo.CONTRACT'),
                            OBJECT_ID('dbo.CONTRACT_VERSION'),OBJECT_ID('dbo.INVOICE'),OBJECT_ID('dbo.PAYMENT'),OBJECT_ID('dbo.TRIP_PLAN')))
                    AND (SELECT COUNT(*) FROM sys.sequences WHERE schema_id=SCHEMA_ID('dbo') AND is_cycling=0 AND name IN
                        ('SEQ_USER_ID','SEQ_HORSE_ID','SEQ_TRANSPORT_REQUEST_ID','SEQ_LEGAL_MEDICAL_RECORD_ID',
                         'SEQ_TRIP_PLAN_ID','SEQ_CONTRACT_TEMPLATE_ID','SEQ_CONTRACT_ID','SEQ_COST_ITEM_ID',
                         'SEQ_INVOICE_ID','SEQ_PAYMENT_ID','SEQ_NOTIFICATION_ID','SEQ_COST_RATE_ID',
                         'SEQ_SUPPORTED_ROUTE_ID','SEQ_BUSINESS_POLICY_ID'))=14
                    AND (SELECT COUNT(*) FROM sys.indexes WHERE is_unique=1 AND is_disabled=0 AND
                        ((object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='UX_F1N_RequestSubmission')
                        OR (object_id=OBJECT_ID('dbo.TRIP_PLAN') AND name='UX_TRIP_PLAN_RequestID')
                        OR (object_id=OBJECT_ID('dbo.CONTRACT') AND name='UX_CONTRACT_RequestID')
                        OR (object_id=OBJECT_ID('dbo.INVOICE') AND name='UX_INVOICE_ContractID_Deposit')
                        OR (object_id=OBJECT_ID('dbo.PAYMENT') AND name='UX_F1S_VnpayReceipt')))=5
                    THEN 1 ELSE 0 END
                    """, connection);
                Require(Convert.ToInt32(await command.ExecuteScalarAsync(ct)) == 1, "FLOW1_SQL_SCHEMA_REQUIRED", "Flow 1 requires the current Reviewed schema; no migration is run automatically.", 503);
                ready = true;
            }
            catch (SqlException) { throw Failure("FLOW1_DATABASE_UNAVAILABLE", "The configured Flow 1 database is unavailable.", 503); }
        }
        finally { gate.Release(); }
    }
}
