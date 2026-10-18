using System.Text.Json;
using Application.Common.Exceptions;
using Application.Interfaces.Flow1;
using Infrastructure.Storage;
using Infrastructure.Transactions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Tests;

public sealed class SqlStateStoreTests
{
    private static JsonElement Payload(int value) => JsonSerializer.SerializeToElement(new { value });
    private static SqlFlow1StateStore Store(Infrastructure.Data.Context.HorseTransportDbContext db) => new(db, new FlowClock());
    private static async Task<Flow1TestDatabase> Database()
    {
        var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        try
        {
            await db.ScriptAsync("004_flow1_sql_state.sql");
            await db.ExecuteAsync("""
                INSERT INTO dbo.HORSE(HorseID,OwnerID,Name,Microchip_ISO) VALUES ('h-1','owner',N'SQL state fixture','987654321012345');
                INSERT INTO dbo.CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,TotalQuotedPrice,DepositRateStandard,ContractStatus)
                VALUES ('c-1','req-1','owner','C-STATE-FIXTURE','VND',100000000,40,'DRAFT');
                """);
            return db;
        }
        catch { await db.DisposeAsync(); throw; }
    }
    [LocalSqlFact]
    public async Task Migration_adds_eight_columns_only_to_existing_tables_and_is_repeatable_without_changing_legacy_data()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        var columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        var tables = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        await db.ScriptAsync("004_flow1_sql_state.sql"); await db.ScriptAsync("004_flow1_sql_state.sql");
        Assert.Equal(columns + 8, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(tables, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(4, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateJson' AND TYPE_NAME(user_type_id)='nvarchar' AND max_length=-1 AND is_nullable=1;"));
        Assert.Equal(4, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateVersion' AND TYPE_NAME(user_type_id)='bigint' AND is_nullable=0;"));
        Assert.Equal(8, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.check_constraints WHERE name LIKE 'CK_%_Flow1State%' AND is_disabled=0 AND is_not_trusted=0;"));
        Assert.Equal("ACCEPTED", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE Flow1StateJson IS NULL AND Flow1StateVersion=0;"));
    }
    [LocalSqlFact]
    public async Task Wrong_preexisting_column_type_rolls_back_earlier_table_changes_without_rewriting_the_existing_column()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE dbo.CONTRACT ADD Flow1StateJson varchar(500) NULL;");
        var error = await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync("004_flow1_sql_state.sql")); Assert.Equal(51042, error.Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.HORSE') AND name='Flow1StateJson';"));
        Assert.Equal("varchar", await db.ScalarAsync<string>("SELECT TYPE_NAME(user_type_id) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='Flow1StateJson';"));
    }
    [LocalSqlFact]
    public async Task A_computed_state_column_is_rejected_instead_of_being_treated_as_writable_storage()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE dbo.HORSE ADD Flow1StateJson AS CONVERT(nvarchar(max),NULL);");
        Assert.Equal(51042, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync("004_flow1_sql_state.sql"))).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateVersion';"));
    }
    [LocalSqlFact]
    public async Task Incompatible_named_check_or_wrong_default_cannot_bypass_migration_validation()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ExecuteAsync("ALTER TABLE dbo.HORSE ADD Flow1StateJson nvarchar(max) NULL, Flow1StateVersion bigint NOT NULL DEFAULT(0); ALTER TABLE dbo.HORSE ADD CONSTRAINT CK_HORSE_Flow1StateJson CHECK(1=1);");
        Assert.Equal(51044, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync("004_flow1_sql_state.sql"))).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='Flow1StateJson';"));
        await db.ExecuteAsync("ALTER TABLE dbo.HORSE DROP CONSTRAINT CK_HORSE_Flow1StateJson; ALTER TABLE dbo.CONTRACT ADD Flow1StateVersion bigint NOT NULL DEFAULT(7);");
        Assert.Equal(51043, (await Assert.ThrowsAsync<SqlException>(() => db.ScriptAsync("004_flow1_sql_state.sql"))).Number);
    }
    [LocalSqlFact]
    public async Task Missing_minimal_schema_stops_upgrade_and_json_and_nonnegative_version_are_database_enforced()
    {
        await using var legacy = await Flow1TestDatabase.CreateAsync(false);
        Assert.Equal(51040, (await Assert.ThrowsAsync<SqlException>(() => legacy.ScriptAsync("004_flow1_sql_state.sql"))).Number);
        await using var db = await Database();
        await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=N'invalid JSON';"));
        await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE [USER] SET Flow1StateVersion=-1;"));
        Assert.Equal(0L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM HORSE;"));
    }
    [LocalSqlFact]
    public async Task All_state_kinds_map_to_existing_owner_rows_and_survive_reopening_without_any_metadata_directory()
    {
        await using var db = await Database();
        var kinds = new[] { ("horse", "h-1"), ("request", "req-1"), ("review", "req-1"), ("plan", "req-1"),
            ("contract", "c-1"), ("publication", "c-1"), ("contract-otp", "c-1"), ("acceptance", "c-1"),
            ("extensions", "c-1"), ("payment-ledger", "c-1"), ("deployment", "c-1"), ("otp-account", "owner") };
        await using (var context = db.Context())
        {
            var store = Store(context);
            await new Flow1UnitOfWork(context).ExecuteAsync("req-1", async ct => {
                foreach (var (kind, id) in kinds) await store.AppendAsync(kind, id, 0, "op-" + kind, "owner", "FIXTURE", Payload(1), ct);
                return 0;
            });
        }
        await using var reopened = db.Context();
        foreach (var (kind, id) in kinds)
        {
            var doc = await Store(reopened).ReadAsync(kind.ToUpperInvariant(), id.ToUpperInvariant());
            Assert.NotNull(doc); Assert.Single(doc.Revisions); Assert.Equal("owner", doc.Revisions[0].ActorUserId);
            Assert.Equal(DateTimeKind.Utc, doc.Revisions[0].CreatedAtUtc.Kind);
        }
        Assert.Equal(3L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.Equal(7L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM CONTRACT;"));
        Assert.Equal(1L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM [USER] WHERE UserID='owner';"));
    }
    [LocalSqlFact]
    public async Task Business_status_and_state_roll_back_together_when_the_sql_transaction_fails()
    {
        await using var db = await Database(); await using var context = db.Context(); var store = Store(context);
        await Assert.ThrowsAsync<IOException>(() => new Flow1UnitOfWork(context).ExecuteAsync<int>("req-1", async ct => {
            (await context.TransportRequests.SingleAsync(ct)).Status = "AWAITING_CONTRACT";
            await store.AppendAsync("review", "req-1", 0, "review-1", "owner", "ACCEPT", Payload(1), ct);
            await context.SaveChangesAsync(ct);
            throw new IOException("Injected failure after SQL state and business writes, before commit.");
        }));
        Assert.Null(await store.ReadAsync("review", "req-1"));
        Assert.Equal("ACCEPTED", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.Equal(0L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }
    [LocalSqlFact]
    public async Task Signature_invoice_and_acceptance_evidence_commit_or_roll_back_as_one_sql_transaction()
    {
        await using var db = await Database();
        await db.ExecuteAsync("ALTER TABLE INVOICE ADD CONSTRAINT CK_StateInvoiceFault CHECK(InvoiceType <> 'DEPOSIT');");
        await Assert.ThrowsAsync<DbUpdateException>(() => Confirm());
        Assert.Equal("DRAFT", await db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal(0L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM CONTRACT;"));
        await db.ExecuteAsync("ALTER TABLE INVOICE DROP CONSTRAINT CK_StateInvoiceFault;");
        await Confirm();
        Assert.Equal("SIGNED", await db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Equal("AWAITING_DEPOSIT", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE WHERE InvoiceType='DEPOSIT' AND CurrencyCode='VND' AND TotalPayableAmount=40000000;"));
        await using var check = db.Context(); Assert.NotNull(await Store(check).ReadAsync("acceptance", "c-1"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        async Task Confirm()
        {
            await using var context = db.Context();
            await new Flow1UnitOfWork(context).ExecuteAsync("req-1", async ct => {
                var c = await context.Contracts.SingleAsync(ct); c.ContractStatus = "SIGNED"; c.SignedAt = new DateTime(2026, 10, 16, 9, 0, 0, DateTimeKind.Utc);
                (await context.TransportRequests.SingleAsync(ct)).Status = "AWAITING_DEPOSIT";
                // Synthetic transaction proof; actual OTP/sign endpoint coverage lives in ContractAcceptanceTests.
                await Store(context).AppendAsync("acceptance", "c-1", 0, "sign-1", "owner", "SIGNED", JsonSerializer.SerializeToElement(new { documentHash = new string('a', 64), deposit = 40_000_000 }), ct);
                context.Invoices.Add(new() { InvoiceId = "di-state", ContractId = "c-1", InvoiceType = "DEPOSIT", CurrencyCode = "VND", TotalPayableAmount = 40_000_000, PaymentStatus = "UNPAID" });
                return 0;
            });
        }
    }
    [LocalSqlFact]
    public async Task Idempotent_replay_validates_payload_actor_and_action_without_bumping_sql_row_version()
    {
        await using var db = await Database(); await using var context = db.Context(); var store = Store(context); var work = new Flow1UnitOfWork(context);
        await work.ExecuteAsync("req-1", ct => store.AppendAsync("review", "req-1", 0, "review-1", "owner", "REVIEW", Payload(1), ct));
        var replay = await work.ExecuteAsync("req-1", ct => store.AppendAsync("review", "req-1", 0, "review-1", "owner", "REVIEW", Payload(1), ct)); Assert.Equal(1, replay.Version);
        foreach (var (actor, action, value) in new[] { ("owner", "REVIEW", 2), ("other", "REVIEW", 1), ("owner", "REJECT", 1) })
        {
            var error = await Assert.ThrowsAsync<BusinessRuleException>(() => work.ExecuteAsync("req-1", ct => store.AppendAsync("review", "req-1", 1, "review-1", actor, action, Payload(value), ct)));
            Assert.Equal("IDEMPOTENCY_KEY_REUSED", error.ErrorCode);
        }
        Assert.Equal(1L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }
    [LocalSqlFact]
    public async Task Independent_contexts_cannot_both_append_the_same_version_and_other_document_kinds_are_preserved()
    {
        await using var db = await Database();
        var results = await Task.WhenAll(Attempt("first"), Attempt("second")); Assert.Single(results, ok => ok);
        await using var context = db.Context();
        await new Flow1UnitOfWork(context).ExecuteAsync("req-1", ct => Store(context).AppendAsync("plan", "req-1", 0, "plan-1", "manager", "PLAN", Payload(2), ct));
        Assert.Single((await Store(context).ReadAsync("review", "req-1"))!.Revisions);
        Assert.Single((await Store(context).ReadAsync("plan", "req-1"))!.Revisions);
        async Task<bool> Attempt(string key)
        {
            await using var independent = db.Context();
            try { await new Flow1UnitOfWork(independent).ExecuteAsync("req-1", ct => Store(independent).AppendAsync("review", "req-1", 0, key, "owner", "REVIEW", Payload(1), ct)); return true; }
            catch (BusinessRuleException e) when (e.ErrorCode == "STALE_VERSION") { return false; }
        }
    }
    [LocalSqlFact]
    public async Task Transaction_is_required_and_owner_rows_are_never_created_implicitly()
    {
        await using var db = await Database(); await using var context = db.Context(); var store = Store(context);
        await Assert.ThrowsAsync<InvalidOperationException>(() => store.AppendAsync("request", "req-1", 0, "op", "owner", "SUBMIT", Payload(1)));
        Assert.Null(await store.ReadAsync("request", "missing"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => new Flow1UnitOfWork(context).ExecuteAsync("missing", ct => store.AppendAsync("request", "missing", 0, "op", "owner", "SUBMIT", Payload(1), ct)));
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST;"));
    }
    [LocalSqlFact]
    public async Task Invalid_owner_binding_or_schema_or_cleared_previously_written_state_fails_closed()
    {
        await using var db = await Database(); await using var context = db.Context(); var store = Store(context);
        await new Flow1UnitOfWork(context).ExecuteAsync("req-1", ct => store.AppendAsync("review", "req-1", 0, "op", "owner", "REVIEW", Payload(1), ct));
        await db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET Flow1StateJson=JSON_MODIFY(Flow1StateJson,'$.documents.review.aggregateId','other') WHERE RequestID='req-1';");
        await Assert.ThrowsAsync<InvalidDataException>(() => store.ReadAsync("review", "req-1"));
        await db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET Flow1StateJson=NULL WHERE RequestID='req-1';");
        await Assert.ThrowsAsync<InvalidDataException>(() => store.ReadAsync("review", "req-1"));
    }
    [LocalSqlFact]
    public async Task Oversized_payload_or_cancellation_preserves_last_committed_history_and_new_json_values_outlive_caller()
    {
        await using var db = await Database(); await using var context = db.Context(); var store = Store(context); var work = new Flow1UnitOfWork(context);
        using (var input = JsonDocument.Parse("{ \"value\": 3 }"))
            await work.ExecuteAsync("req-1", ct => store.AppendAsync("request", "req-1", 0, "op-1", "owner", "SUBMIT", input.RootElement, ct));
        await Assert.ThrowsAsync<InvalidDataException>(() => work.ExecuteAsync("req-1", ct => store.AppendAsync("request", "req-1", 1, "op-2", "owner", "EDIT", JsonSerializer.SerializeToElement(new { huge = new string('x', 2 * 1024 * 1024) }), ct)));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => work.ExecuteAsync<int>("req-1", async ct => {
            await store.AppendAsync("request", "req-1", 1, "op-cancel", "owner", "EDIT", Payload(4), ct);
            throw new OperationCanceledException("Injected client cancellation before commit.");
        }));
        var doc = await store.ReadAsync("request", "req-1"); Assert.Single(doc!.Revisions); Assert.Equal(3, doc.Revisions[0].Payload.GetProperty("value").GetInt32());
    }
    [Theory]
    [InlineData("request", "../escape")]
    [InlineData("request", "a';UPDATE CONTRACT SET ContractStatus='SIGNED';--")]
    [InlineData("unknown-table", "req-1")]
    [InlineData("contract", "")]
    public async Task Invalid_type_or_key_is_rejected_before_accessing_a_database(string type, string id)
    {
        await using var context = new Infrastructure.Data.Context.HorseTransportDbContext(new DbContextOptionsBuilder<Infrastructure.Data.Context.HorseTransportDbContext>().UseSqlServer("Server=unreachable.invalid;Database=not_used;Integrated Security=true").Options);
        await Assert.ThrowsAsync<ArgumentException>(() => Store(context).ReadAsync(type, id));
    }
}
