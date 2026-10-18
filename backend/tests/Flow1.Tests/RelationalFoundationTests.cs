using Microsoft.Data.SqlClient;
using Xunit;

namespace Flow1.Tests;

public sealed class RelationalFoundationTests
{
    private const string Script = "005_flow1_relational_mvp_foundation.sql";
    private static Task<string> ForeignKeys(Flow1TestDatabase db) => db.ScalarAsync<string>("""
        SELECT STRING_AGG(CONVERT(nvarchar(max),CONCAT(OBJECT_NAME(f.parent_object_id),':',f.name,':',
          COL_NAME(c.parent_object_id,c.parent_column_id),':',OBJECT_NAME(f.referenced_object_id),':',
          COL_NAME(c.referenced_object_id,c.referenced_column_id),':',f.delete_referential_action,':',
          f.update_referential_action,':',f.is_disabled,':',f.is_not_trusted)),N'|')
        WITHIN GROUP(ORDER BY f.name,c.constraint_column_id)
        FROM sys.foreign_keys f JOIN sys.foreign_key_columns c ON f.object_id=c.constraint_object_id;
        """);
    private static Task InsertContracts(Flow1TestDatabase db) => db.ExecuteAsync("""
        INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,ContractStatus,DepositRateStandard,TotalQuotedPrice)
        VALUES ('c-one','req-1','owner','C-ONE','VND','DRAFT',40,100000000),
               ('c-two','req-1','owner','C-TWO','VND','DRAFT',40,100000000);
        """);

    [LocalSqlFact]
    public async Task Fresh_003_database_gets_typed_columns_without_json_tables_or_changes_to_any_existing_foreign_key()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        var columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        var tables = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"); var fks = await ForeignKeys(db);
        await db.ScriptAsync(Script); await db.ScriptAsync(Script);
        Assert.Equal(columns + 166, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(tables, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;")); Assert.Equal(fks, await ForeignKeys(db));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name IN ('Flow1StateJson','Flow1StateVersion');"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name IN ('PickupLatitude','PickupLongitude','DeliveryLatitude','DeliveryLongitude') AND (TYPE_NAME(user_type_id)<>'decimal' OR precision<>9 OR scale<>6);"));
        Assert.Equal("ACCEPTED", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.False(await db.ScalarAsync<bool>("SELECT RelationalReady FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }

    [LocalSqlFact]
    public async Task Existing_004_state_and_financial_fields_are_not_converted_deleted_or_marked_ready()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(); await InsertContracts(db);
        await db.ExecuteAsync("""
            UPDATE CONTRACT SET Flow1StateJson=N'{"retained":"test-source-not-imported"}',Flow1StateVersion=12 WHERE ContractID='c-one';
            INSERT INVOICE(InvoiceID,ContractID,InvoiceType,CurrencyCode,TotalPayableAmount,PaidAmount,PaymentStatus)
            VALUES ('i-one','c-one','DEPOSIT','VND',40000000,1234,'PARTIALLY_PAID');
            """);
        var fks = await ForeignKeys(db); await db.ScriptAsync(Script);
        Assert.Equal(fks, await ForeignKeys(db)); Assert.Equal(1234m, await db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
        Assert.Equal("{\"retained\":\"test-source-not-imported\"}", await db.ScalarAsync<string>("SELECT Flow1StateJson FROM CONTRACT WHERE ContractID='c-one';"));
        Assert.Equal(12L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM CONTRACT WHERE ContractID='c-one';"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE RelationalReady=1;"));
    }

    [LocalSqlFact]
    public async Task Incompatible_preexisting_column_rolls_back_all_earlier_additions_without_retyping_it()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE CONTRACT ADD PdfFileKey varbinary(10) NULL;");
        var error = await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script)); Assert.Equal(51103, error.Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('HORSE') AND name='PhotoFileKey';"));
        Assert.Equal("varbinary", await db.ScalarAsync<string>("SELECT TYPE_NAME(user_type_id) FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name='PdfFileKey';"));
    }

    [LocalSqlFact]
    public async Task Coordinates_missing_evidence_and_unverified_money_are_rejected_by_database_checks()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script); await InsertContracts(db);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET PickupLatitude=91 WHERE RequestID='req-1';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET RelationalReady=1 WHERE RequestID='req-1';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE CONTRACT SET RelationalReady=1,VersionNumber=1,RequestRevision=1,PlanRevision=1,CreationOperationKey='fixture-key',CreationInputHash=REPLICATE('A',64),ContractStatus='SIGNED' WHERE ContractID='c-one';"))).Number);
        await db.ExecuteAsync("INSERT INVOICE(InvoiceID,ContractID,InvoiceType,TotalPayableAmount,PaymentStatus) VALUES ('i-one','c-one','DEPOSIT',40000000,'UNPAID');");
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("""
            INSERT PAYMENT(PaymentID,InvoiceID,Method,Status,Amount,CurrencyCode,DeclaredAmount,CreationOperationKey,CreationInputHash,RelationalReady)
            VALUES ('p-one','i-one','BANK_TRANSFER','PENDING_CONFIRMATION',100,'VND',100,'fixture-proof',REPLICATE('A',64),1);
            """))).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
    }

    [LocalSqlFact]
    public async Task Only_one_current_contract_and_one_verified_bank_reference_can_exist_in_converted_rows()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script); await InsertContracts(db);
        await db.ExecuteAsync("""
            UPDATE CONTRACT SET VersionNumber=CASE WHEN ContractID='c-one' THEN 1 ELSE 2 END, RequestRevision=1,PlanRevision=1,
              CreationOperationKey=ContractID,CreationInputHash=REPLICATE('A',64),RelationalReady=1;
            UPDATE CONTRACT SET IsCurrent=1 WHERE ContractID='c-one';
            INSERT INVOICE(InvoiceID,ContractID,InvoiceType,CurrencyCode,TotalPayableAmount,PaymentStatus)
            VALUES ('i-one','c-one','DEPOSIT','VND',40000000,'UNPAID'),('i-two','c-two','DEPOSIT','VND',40000000,'UNPAID');
            INSERT PAYMENT(PaymentID,InvoiceID,Method,Status,Amount,CurrencyCode,DeclaredAmount,CreationOperationKey,CreationInputHash,
              ReceivedAtUtc,ConfirmedByUserID,NormalizedBankReference,RelationalReady)
            VALUES ('p-one','i-one','BANK_TRANSFER','SUCCESS',100,'VND',100,'fixture-proof',REPLICATE('A',64),'2026-10-16','owner','BANK-REFERENCE',1);
            """);
        Assert.Contains((await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE CONTRACT SET IsCurrent=1 WHERE ContractID='c-two';"))).Number, new[] { 2601, 2627 });
        Assert.Contains((await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("""
            INSERT PAYMENT(PaymentID,InvoiceID,Method,Status,Amount,CurrencyCode,DeclaredAmount,CreationOperationKey,CreationInputHash,
              ReceivedAtUtc,ConfirmedByUserID,NormalizedBankReference,RelationalReady)
            VALUES ('p-two','i-two','BANK_TRANSFER','SUCCESS',100,'VND',100,'another-proof',REPLICATE('A',64),'2026-10-16','owner','BANK-REFERENCE',1);
            """))).Number, new[] { 2601, 2627 });
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
    }

    [LocalSqlFact]
    public async Task Unknown_preexisting_guard_is_preserved_and_requires_operator_review_instead_of_silent_replacement()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE CONTRACT ADD OtpAttempts int NOT NULL DEFAULT(0);");
        await db.ExecuteAsync("ALTER TABLE CONTRACT ADD CONSTRAINT CK_F1R_CONTRACT_OtpAttempts CHECK(OtpAttempts>=0);");
        Assert.Equal(51105, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('HORSE') AND name='PhotoFileKey';"));
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.check_constraints WHERE name='CK_F1R_CONTRACT_OtpAttempts';"));
    }

    [LocalSqlFact]
    public async Task Drifted_or_disabled_guards_are_not_silently_accepted_and_delivery_budget_uses_real_notification_fields()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script);
        await db.ExecuteAsync("ALTER INDEX UX_F1R_CurrentContract ON CONTRACT DISABLE;");
        Assert.Equal(51106, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        await db.ExecuteAsync("ALTER INDEX UX_F1R_CurrentContract ON CONTRACT REBUILD; ALTER TABLE CONTRACT NOCHECK CONSTRAINT CK_F1R_CONTRACT_OtpAttempts;");
        Assert.Equal(51105, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        await db.ExecuteAsync("""
            INSERT NOTIFICATION(NotificationID,UserID,Type,Channel,Title,Message,SentAt,DeliveryStatus)
            VALUES ('n-one','owner','CONTRACT_OTP','EMAIL',N'Fixture send reservation',NULL,'2026-10-16T12:00:00','RESERVED'),
                   ('n-two','owner','CONTRACT_OTP','EMAIL',N'Fixture failed delivery',NULL,'2026-10-16T12:01:00','FAILED');
            """);
        Assert.Equal(2, await db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE UserID='owner' AND Type='CONTRACT_OTP' AND Channel='EMAIL' AND SentAt>'2026-10-16T11:50:00';"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Message IS NOT NULL;"));
    }
}
