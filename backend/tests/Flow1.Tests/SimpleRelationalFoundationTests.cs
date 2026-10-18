using Microsoft.Data.SqlClient;
using Xunit;

namespace Flow1.Tests;

public sealed class SimpleRelationalFoundationTests
{
    private const string Script = "006_flow1_simple_relational_foundation.sql";
    private static Task<string> ForeignKeys(Flow1TestDatabase db) => db.ScalarAsync<string>("""
        SELECT STRING_AGG(CONVERT(nvarchar(max),CONCAT(f.name,':',OBJECT_NAME(f.parent_object_id),':',
          COL_NAME(c.parent_object_id,c.parent_column_id),':',OBJECT_NAME(f.referenced_object_id),':',
          COL_NAME(c.referenced_object_id,c.referenced_column_id),':',f.delete_referential_action,':',
          f.update_referential_action,':',f.is_disabled,':',f.is_not_trusted)),N'|')
        WITHIN GROUP(ORDER BY f.name,c.constraint_column_id)
        FROM sys.foreign_keys f JOIN sys.foreign_key_columns c ON f.object_id=c.constraint_object_id;
        """);
    private static Task InsertContract(Flow1TestDatabase db) => db.ExecuteAsync("""
        INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,ContractStatus,TotalQuotedPrice,DepositRateStandard)
        VALUES ('c-one','req-1','owner','C-ONE','VND','DRAFT',100000000,40);
        """);
    private static Task InsertInvoice(Flow1TestDatabase db) => db.ExecuteAsync("""
        INSERT INVOICE(InvoiceID,ContractID,InvoiceType,CurrencyCode,TotalPayableAmount,PaymentStatus)
        VALUES ('i-one','c-one','DEPOSIT','VND',40000000,'UNPAID');
        """);

    [LocalSqlFact]
    public async Task Fresh_profile_is_repeatable_adds_63_columns_and_preserves_every_existing_relation_and_business_row()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        var tables = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        var columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"); var fks = await ForeignKeys(db);
        await db.ScriptAsync(Script); await db.ScriptAsync(Script);
        Assert.Equal(tables, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(columns + 63, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(fks, await ForeignKeys(db));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name IN ('Flow1StateJson','Flow1StateVersion','RelationalReady','DocumentRevision');"));
        Assert.Equal(5, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='RowVersion' AND system_type_id=189 AND is_nullable=0;"));
        Assert.Equal(25, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.check_constraints WHERE name LIKE 'CK_F1S[_]%' AND is_disabled=0 AND is_not_trusted=0;"));
        Assert.Equal("ACCEPTED", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }

    [LocalSqlFact]
    public async Task Coexisting_004_source_money_and_signature_are_not_backfilled_dropped_or_relabelled()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(); await InsertContract(db); await InsertInvoice(db);
        await db.ExecuteAsync("""
            UPDATE CONTRACT SET Flow1StateJson=N'{"retained":"operator-review"}',Flow1StateVersion=19,
              SignedAt='2026-10-01T12:00:00',ContractStatus='SIGNED' WHERE ContractID='c-one';
            UPDATE INVOICE SET PaidAmount=1234,PaymentStatus='PARTIALLY_PAID';
            """);
        await db.ScriptAsync(Script);
        Assert.Equal("{\"retained\":\"operator-review\"}", await db.ScalarAsync<string>("SELECT Flow1StateJson FROM CONTRACT;"));
        Assert.Equal(19L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM CONTRACT;"));
        Assert.Equal(new DateTime(2026, 10, 1, 12, 0, 0), await db.ScalarAsync<DateTime>("SELECT SignedAt FROM CONTRACT;"));
        Assert.False(await db.ScalarAsync<bool>("SELECT IsCurrent FROM CONTRACT;"));
        Assert.Equal(1234m, await db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Wrong_column_type_rolls_back_and_superseded_005_is_rejected_without_combining_profiles()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE TRANSPORT_REQUEST ADD DistanceKm varchar(20) NULL;");
        var columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        Assert.Equal(51203, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        Assert.Equal(columns, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        await db.ExecuteAsync("ALTER TABLE TRANSPORT_REQUEST DROP COLUMN DistanceKm;");
        await db.ScriptAsync("005_flow1_relational_mvp_foundation.sql");
        columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        Assert.Equal(51207, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        Assert.Equal(columns, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.HORSE') AND name='PhotoUrl';"));
    }

    [LocalSqlFact]
    public async Task Coordinates_floor_fixed_deposit_and_otp_guards_reject_invalid_or_missing_evidence()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script); await InsertContract(db);
        foreach (var sql in new[] {
            "UPDATE TRANSPORT_REQUEST SET PickupLatitude=91,PickupLongitude=106;",
            "UPDATE TRANSPORT_REQUEST SET PickupLatitude=10;",
            "UPDATE TRANSPORT_REQUEST SET OriginCountry='VN',DestinationCountry='JP',TransportType='AIR',PreparationDays=2;",
            "UPDATE TRANSPORT_REQUEST SET OriginCountry='VN',DestinationCountry='VN',TransportType='ROAD',DistanceKm=501,PreparationDays=2;",
            "UPDATE CONTRACT SET DepositAmount=39999999;",
            "UPDATE CONTRACT SET SignOtpFailedAttempts=6;",
            "UPDATE CONTRACT SET SignOtpHash=REPLICATE('a',64);",
            "UPDATE CONTRACT SET PdfUrl='https://public.invalid/contract.pdf';",
            "UPDATE CONTRACT SET EffectiveSignDeadline='2026-10-10';"
        }) Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync(sql))).Number);
        await db.ExecuteAsync("""
            UPDATE TRANSPORT_REQUEST SET PickupLatitude=10,PickupLongitude=106,OriginCountry='VN',DestinationCountry='JP',TransportType='AIR',PreparationDays=7;
            UPDATE CONTRACT SET DepositAmount=40000000;
            """);
        Assert.Equal(40000000m, await db.ScalarAsync<decimal>("SELECT DepositAmount FROM CONTRACT;"));
    }

    [LocalSqlFact]
    public async Task Current_contract_and_verified_vnpay_receipt_have_unique_keys_and_success_needs_both_codes_and_amount()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script); await InsertContract(db); await InsertInvoice(db);
        await db.ExecuteAsync("""
            UPDATE CONTRACT SET IsCurrent=1;
            INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,ContractStatus)
            VALUES ('c-two','req-1','owner','C-TWO','VND','DRAFT');
            INSERT PAYMENT(PaymentID,InvoiceID,CurrencyCode,Amount,Method,Status,VnpayTmnCode,VnpayCreatedAtUtc,VnpayExpiresAtUtc)
            VALUES ('p-one','i-one','VND',40000000,'VNPAY','PENDING_GATEWAY','TEST0001','2026-10-17T10:00:00','2026-10-17T10:15:00'),
                   ('p-two','i-one','VND',40000000,'VNPAY','PENDING_GATEWAY','TEST0001','2026-10-17T10:00:00','2026-10-17T10:15:00');
            """);
        Assert.Equal(2601, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE CONTRACT SET IsCurrent=1 WHERE ContractID='c-two';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE PAYMENT SET Status='SUCCESS',VnpayResponseCode='00',VnpayTransactionStatus='01',TransactionCode='123',VnpayReceivedAmount=40000000 WHERE PaymentID='p-one';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE PAYMENT SET Status='SUCCESS',VnpayResponseCode='00',VnpayTransactionStatus='00',TransactionCode='123',VnpayReceivedAmount=1 WHERE PaymentID='p-one';"))).Number);
        await db.ExecuteAsync("UPDATE PAYMENT SET Status='SUCCESS',VnpayResponseCode='00',VnpayTransactionStatus='00',TransactionCode='123',VnpayReceivedAmount=40000000 WHERE PaymentID='p-one';");
        Assert.Equal(2601, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE PAYMENT SET Status='SUCCESS',VnpayResponseCode='00',VnpayTransactionStatus='00',TransactionCode='123',VnpayReceivedAmount=40000000 WHERE PaymentID='p-two';"))).Number);
        Assert.Equal(0m, await db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;")); // No trigger invents ledger allocation.
    }

    [LocalSqlFact]
    public async Task Deadline_cancellation_and_handoff_current_state_are_guarded_and_transaction_rollback_preserves_cash()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script); await InsertContract(db); await InsertInvoice(db);
        await db.ExecuteAsync("""
            UPDATE CONTRACT SET DepositAmount=40000000,CompletionDeadline='2026-10-20T10:00:00',
              PdfUrl='private/contract.pdf',PdfSha256=REPLICATE('a',64),PublishedBy='manager',PublishedAtUtc='2026-10-18',
              SignedAt='2026-10-19',SignerEmail='fixture@example.invalid',SignedDepositDeadline='2026-10-20',DepositDeadline='2026-10-20';
            INSERT TRIP_PLAN(TripID,RequestID,Status) VALUES ('t-one','req-1','PLANNING');
            """);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE CONTRACT SET DepositDeadline='2026-10-19';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE CONTRACT SET CancellationId='cancel-one',CancellationStatus='APPROVED',CancellationReason=N'Cancel',CancellationRequestedAtUtc='2026-10-19';"))).Number);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE TRIP_PLAN SET DeploymentStatus='CONFIRMED',DeploymentReason=N'Confirm',DeploymentBy='manager',DeploymentAtUtc='2026-10-19';"))).Number);
        await db.ExecuteAsync("""
            UPDATE TRIP_PLAN SET DeploymentStatus='CONFIRMED',DeploymentReason=N'Confirm',DeploymentBy='manager',DeploymentAtUtc='2026-10-19',HandoffEventId='event-one',RoutingAcknowledgedBy='coordinator',RoutingAcknowledgedAtUtc='2026-10-19';
            """);
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE TRIP_PLAN SET DeploymentStatus='ON_HOLD',HandoffEventId=NULL;"))).Number);
        await db.ExecuteAsync("UPDATE TRIP_PLAN SET DeploymentStatus='ON_HOLD',HandoffEventId=NULL,RoutingAcknowledgedBy=NULL,RoutingAcknowledgedAtUtc=NULL;");
        await db.ExecuteAsync("""
            BEGIN TRANSACTION;
            UPDATE CONTRACT SET DepositDeadline='2026-10-21',LastExtensionTarget='DEPOSIT',LastExtensionReason=N'Fixture',LastExtensionBy='manager',LastExtensionAtUtc='2026-10-19';
            UPDATE INVOICE SET DueDate='2026-10-21',PaidAmount=40000000,PaymentStatus='PAID';
            ROLLBACK TRANSACTION;
            """);
        Assert.Equal(new DateTime(2026, 10, 20), await db.ScalarAsync<DateTime>("SELECT DepositDeadline FROM CONTRACT;"));
        Assert.Equal(0m, await db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Rowversion_changes_on_edit_and_a_stale_write_cannot_overwrite_the_newer_decision()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script);
        var prior = await db.ScalarAsync<byte[]>("SELECT RowVersion FROM TRANSPORT_REQUEST WHERE RequestID='req-1';");
        await db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET ManagerNotes=N'New decision' WHERE RequestID='req-1';");
        await using var connection = new SqlConnection(db.ConnectionString); await connection.OpenAsync();
        await using var command = new SqlCommand("UPDATE TRANSPORT_REQUEST SET ManagerNotes=N'Stale decision' WHERE RequestID='req-1' AND RowVersion=@expected;", connection);
        command.Parameters.Add("@expected", System.Data.SqlDbType.Timestamp).Value = prior;
        Assert.Equal(0, await command.ExecuteNonQueryAsync());
        Assert.Equal("New decision", await db.ScalarAsync<string>("SELECT ManagerNotes FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }

    [LocalSqlFact]
    public async Task Disabled_guard_or_index_is_not_silently_accepted_on_reapply()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await db.ScriptAsync(Script);
        await db.ExecuteAsync("ALTER TABLE CONTRACT NOCHECK CONSTRAINT CK_F1S_CONTRACT_OtpAttempts;");
        Assert.Equal(51205, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
        await db.ExecuteAsync("ALTER TABLE CONTRACT WITH CHECK CHECK CONSTRAINT CK_F1S_CONTRACT_OtpAttempts; ALTER INDEX UX_F1S_CurrentContract ON CONTRACT DISABLE;");
        Assert.Equal(51206, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync(Script))).Number);
    }
}
