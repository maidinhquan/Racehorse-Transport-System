using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Domain.Entities;
using Infrastructure.DAOs.Flow1;
using Infrastructure.Data.Context;
using Infrastructure.Transactions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Tests;

public sealed class LocalSqlFactAttribute : FactAttribute
{
    public LocalSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER")))
            Skip = "Set RACEHORSE_TEST_SQL_SERVER to a local SQL Server instance for disposable database tests.";
    }
}

internal sealed class Flow1TestDatabase : IAsyncDisposable
{
    private readonly string name = "RaceHorseFlow1Test_" + Guid.NewGuid().ToString("N");
    private readonly string masterConnection;
    public string ConnectionString { get; }

    private Flow1TestDatabase()
    {
        var server = Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER") ?? "";
        var host = server.Split('\\')[0];
        if (!new[] { ".", "localhost", Environment.MachineName, "(localdb)" }.Contains(host, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Flow 1 tests only create disposable databases on a local instance.");
        var builder = new SqlConnectionStringBuilder
        {
            DataSource = server, InitialCatalog = "master", IntegratedSecurity = true,
            TrustServerCertificate = true, ConnectTimeout = 10
        };
        masterConnection = builder.ConnectionString;
        builder.InitialCatalog = name;
        ConnectionString = builder.ConnectionString;
    }

    public static async Task<Flow1TestDatabase> CreateAsync(bool migrate = true, bool sqlState = true)
    {
        var db = new Flow1TestDatabase();
        await ExecuteOnAsync(db.masterConnection, $"CREATE DATABASE [{db.name}];");
        try
        {
            await db.ScriptAsync("000_legacy_schema.sql");
            await db.ExecuteAsync("""
                INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('owner','fixture','CUSTOMER',N'Owner');
                INSERT INTO dbo.TRANSPORT_REQUEST(RequestID,CustomerID,Departure,Destination,Status)
                VALUES ('req-1','owner',N'A',N'B','ACCEPTED');
                """);
            if (migrate) { await db.MigrateAsync(); if (sqlState) await db.ScriptAsync("004_flow1_sql_state.sql"); }
            return db;
        }
        catch { await db.DisposeAsync(); throw; }
    }

    public HorseTransportDbContext Context() => new(new DbContextOptionsBuilder<HorseTransportDbContext>()
        .UseSqlServer(ConnectionString).Options);
    public Task MigrateAsync() => ScriptAsync("003_flow1_minimal_schema.sql");
    public Task ScriptAsync(string filename) => ExecuteAsync(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Sql", filename)));
    public Task ExecuteAsync(string sql) => ExecuteOnAsync(ConnectionString, sql);
    public async Task<T> ScalarAsync<T>(string sql)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection) { CommandTimeout = 30 };
        return (T)(await command.ExecuteScalarAsync())!;
    }
    private static async Task ExecuteOnAsync(string connectionString, string sql)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection) { CommandTimeout = 60 };
        await command.ExecuteNonQueryAsync();
    }
    public async ValueTask DisposeAsync()
    {
        if (!Regex.IsMatch(name, "\\ARaceHorseFlow1Test_[a-f0-9]{32}\\z")) throw new InvalidOperationException("Unsafe test database name.");
        SqlConnection.ClearAllPools();
        await ExecuteOnAsync(masterConnection, $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");
    }
}

public sealed class SqlFoundationTests
{
    private const string LegacyContract = """
        INSERT INTO dbo.TRIP_PLAN(TripID,RequestID,Status) VALUES ('old-trip','req-1','PLANNING');
        INSERT INTO dbo.CONTRACT(ContractID,TripID,CustomerID,ContractCode,CurrencyCode,TotalQuotedPrice,SignedAt,ContractStatus)
        VALUES ('old-contract','old-trip','owner','LEGACY','USD',123.45,'2026-01-01T12:34:56','SIGNED');
        """;

    [LocalSqlFact]
    public async Task Migration_adds_only_two_columns_no_tables_and_can_run_twice()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        var columnsBefore = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        var tablesBefore = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        await db.ScriptAsync("002_flow1_preflight.sql");
        await db.MigrateAsync();
        await db.MigrateAsync();
        Assert.Equal(columnsBefore + 2, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(tablesBefore, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT CONVERT(int,is_nullable) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='TripID';"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT CONVERT(int,is_nullable) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='RequestID';"));
    }

    [LocalSqlFact]
    public async Task Legacy_link_is_backfilled_without_changing_money_signature_or_inventing_deadline()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync(LegacyContract);
        await db.MigrateAsync();
        await using var context = db.Context();
        var contract = await context.Contracts.SingleAsync();
        Assert.Equal("req-1", contract.RequestId);
        Assert.Equal("old-trip", contract.TripId);
        Assert.Equal("USD", contract.CurrencyCode);
        Assert.Equal(123.45m, contract.TotalQuotedPrice);
        Assert.Equal(new DateTime(2026, 1, 1, 12, 34, 56), contract.SignedAt);
        Assert.Null(contract.CompletionDeadline);
    }

    [LocalSqlFact]
    public async Task Duplicate_trips_stop_the_migration_without_adding_columns_or_deleting_data()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync("INSERT INTO dbo.TRIP_PLAN(TripID,RequestID,Status) VALUES ('a','req-1','PLANNING'),('b','req-1','PLANNING');");
        Assert.Equal(51002, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
        Assert.Equal(2, await db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.TRIP_PLAN;"));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='RequestID';"));
    }

    [LocalSqlFact]
    public async Task Duplicate_deposit_invoices_stop_migration_without_deleting_either_invoice()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync(LegacyContract + """
            INSERT INTO dbo.INVOICE(InvoiceID,ContractID,InvoiceType,TotalPayableAmount,PaymentStatus)
            VALUES ('i1','old-contract','DEPOSIT',10,'UNPAID'),('i2','old-contract','DEPOSIT',10,'UNPAID');
            """);
        Assert.Equal(51003, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
        Assert.Equal(2, await db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Wrong_legacy_customer_stops_backfill_instead_of_overwriting_identity()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync(LegacyContract + """
            INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('other','fixture','CUSTOMER',N'Other');
            UPDATE dbo.CONTRACT SET CustomerID='other';
            """);
        Assert.Equal(51004, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
        Assert.Equal("other", await db.ScalarAsync<string>("SELECT CustomerID FROM dbo.CONTRACT;"));
    }

    [LocalSqlFact]
    public async Task New_draft_persists_before_trip_and_DAO_does_not_commit_early()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await using var context = db.Context();
        var repo = new Flow1Repository(context);
        var work = new Flow1UnitOfWork(context);
        await work.ExecuteAsync("req-1", async ct =>
        {
            var contract = Flow1ContractFactory.CreateDraft("c-1", "req-1", "owner", "C-001", 115_000_000m);
            contract.CompletionDeadline = new DateTime(2026, 11, 10, 10, 0, 0, DateTimeKind.Utc);
            repo.AddContract(contract);
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.CONTRACT;"));
            return contract.ContractId;
        });
        context.ChangeTracker.Clear();
        var saved = await context.Contracts.SingleAsync();
        Assert.Null(saved.TripId);
        Assert.Equal("req-1", saved.RequestId);
        Assert.Equal("VND", saved.CurrencyCode);
        Assert.Equal(40m, saved.DepositRateStandard);
        Assert.Equal(new DateTime(2026, 11, 10, 10, 0, 0), saved.CompletionDeadline);
        Assert.Equal(DateTimeKind.Utc, saved.CompletionDeadline!.Value.Kind);
        Assert.Equal(0, await context.TripPlans.CountAsync());
    }

    [LocalSqlFact]
    public async Task SQL_rollback_restores_request_contract_and_payment_together()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await db.ExecuteAsync("""
            INSERT INTO dbo.CONTRACT(ContractID,RequestID,TripID,CustomerID,ContractCode,CurrencyCode,ContractStatus)
            VALUES ('c-1','req-1',NULL,'owner','C-001','VND','SIGNED');
            INSERT INTO dbo.INVOICE(InvoiceID,ContractID,InvoiceType,CurrencyCode,TotalPayableAmount,PaymentStatus)
            VALUES ('i1','c-1','DEPOSIT','VND',46000000,'UNPAID');
            UPDATE dbo.TRANSPORT_REQUEST SET Status='AWAITING_DEPOSIT';
            """);
        await using var context = db.Context();
        var repo = new Flow1Repository(context);
        var work = new Flow1UnitOfWork(context);
        await Assert.ThrowsAsync<InvalidOperationException>(() => work.ExecuteAsync<int>("req-1", async ct =>
        {
            (await repo.GetRequestAsync("req-1", ct))!.Status = "ACTIVATED";
            (await repo.GetContractAsync("c-1", ct))!.ContractStatus = "EFFECTIVE";
            repo.AddPayment(new Payment { PaymentId = "p1", InvoiceId = "i1", Amount = 46000000,
                CurrencyCode = "VND", Method = "BANK_TRANSFER", Status = "SUCCESS" });
            repo.AddTrip(new TripPlan { TripId = "t1", RequestId = "req-1", Status = "PLANNING" });
            await context.SaveChangesAsync(ct);
            throw new InvalidOperationException("Injected failure before commit");
        }));
        Assert.Equal("AWAITING_DEPOSIT", (await context.TransportRequests.SingleAsync()).Status);
        Assert.Equal("SIGNED", (await context.Contracts.SingleAsync()).ContractStatus);
        Assert.Equal(0, await context.Payments.CountAsync());
        Assert.Equal(0, await context.TripPlans.CountAsync());
        // A failed UoW must not leave tracked writes that could leak into the next use case.
        await work.ExecuteAsync("req-1", async ct => { (await repo.GetRequestAsync("req-1", ct))!.Status = "CANCELLED"; return true; });
        Assert.Equal("CANCELLED", await db.ScalarAsync<string>("SELECT Status FROM dbo.TRANSPORT_REQUEST;"));
    }

    [LocalSqlFact]
    public async Task Request_lock_serializes_trip_creation_across_independent_contexts()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var trips = await Task.WhenAll(Create("trip-a"), Create("trip-b"));
        Assert.Equal(trips[0], trips[1]);
        Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.TRIP_PLAN;"));
        async Task<string> Create(string tripId)
        {
            await using var context = db.Context();
            var repo = new Flow1Repository(context);
            return await new Flow1UnitOfWork(context).ExecuteAsync("req-1", async ct =>
            {
                var existing = await repo.GetTripForRequestAsync("req-1", ct);
                if (existing is not null) return existing.TripId;
                await Task.Delay(75, ct);
                repo.AddTrip(new TripPlan { TripId = tripId, RequestId = "req-1", Status = "PLANNING" });
                return tripId;
            });
        }
    }

    [LocalSqlFact]
    public async Task Unique_indexes_guard_trips_and_deposit_invoices_even_without_the_UoW()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await db.ExecuteAsync("INSERT INTO dbo.TRIP_PLAN(TripID,RequestID,Status) VALUES ('t1','req-1','PLANNING');");
        var tripError = await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync(
            "INSERT INTO dbo.TRIP_PLAN(TripID,RequestID,Status) VALUES ('t2','req-1','PLANNING');"));
        Assert.Contains(tripError.Number, new[] { 2601, 2627 });
        await db.ExecuteAsync("""
            INSERT INTO dbo.CONTRACT(ContractID,RequestID,CustomerID,ContractCode,ContractStatus) VALUES ('c-1','req-1','owner','C','DRAFT');
            INSERT INTO dbo.INVOICE(InvoiceID,ContractID,InvoiceType,TotalPayableAmount,PaymentStatus) VALUES ('i1','c-1','DEPOSIT',10,'UNPAID');
            """);
        var invoiceError = await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync(
            "INSERT INTO dbo.INVOICE(InvoiceID,ContractID,InvoiceType,TotalPayableAmount,PaymentStatus) VALUES ('i2','c-1','DEPOSIT',10,'UNPAID');"));
        Assert.Contains(invoiceError.Number, new[] { 2601, 2627 });
        // Different invoice purposes remain legal.
        await db.ExecuteAsync("INSERT INTO dbo.INVOICE(InvoiceID,ContractID,InvoiceType,TotalPayableAmount,PaymentStatus) VALUES ('i3','c-1','BALANCE',10,'UNPAID');");
    }

    [LocalSqlFact]
    public async Task Unexpected_preexisting_column_type_rolls_back_instead_of_silently_converting_data()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync("ALTER TABLE dbo.CONTRACT ADD RequestID nvarchar(50) NULL;");
        Assert.Equal(51005, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='CompletionDeadline';"));
        Assert.Equal("nvarchar", await db.ScalarAsync<string>("SELECT TYPE_NAME(user_type_id) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='RequestID';"));
    }

    [LocalSqlFact]
    public async Task An_index_named_like_a_unique_constraint_cannot_bypass_the_invariant()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(migrate: false);
        await db.ExecuteAsync("CREATE INDEX UX_TRIP_PLAN_RequestID ON dbo.TRIP_PLAN(RequestID);");
        Assert.Equal(51008, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.CONTRACT') AND name='CompletionDeadline';"));
        await db.ExecuteAsync("DROP INDEX UX_TRIP_PLAN_RequestID ON dbo.TRIP_PLAN; CREATE UNIQUE INDEX UX_TRIP_PLAN_RequestID ON dbo.TRIP_PLAN(TripID);");
        Assert.Equal(51008, (await Assert.ThrowsAsync<SqlException>(db.MigrateAsync)).Number);
    }

    [LocalSqlFact]
    public async Task Repository_refuses_writes_outside_the_request_transaction()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await using var context = db.Context();
        Assert.Throws<InvalidOperationException>(() => new Flow1Repository(context).AddContract(
            Flow1ContractFactory.CreateDraft("c-1", "req-1", "owner", "C", 100)));
        Assert.Equal(0, await context.Contracts.CountAsync());
    }
}
