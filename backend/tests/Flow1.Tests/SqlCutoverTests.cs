using System.Net;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Infrastructure.Storage;
using Infrastructure.Transactions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Flow1.Tests;

public sealed class SqlCutoverTests
{
    [LocalSqlFact]
    public async Task Missing_state_schema_returns_503_without_creating_horse_or_sidecars()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        var root = Path.Combine(Path.GetTempPath(), "flow1-cutover-" + Guid.NewGuid().ToString("N"));
        using var factory = new CustomerTestFactory(db.ConnectionString, root);
        using var client = factory.Client();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/customer/horses") { Content = CustomerTransportTests.HorseBody() };
        request.Headers.Add("Idempotency-Key", "schema-missing-create");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("FLOW1_SQL_SCHEMA_REQUIRED", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errorCode").GetString());
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE;"));
        Assert.False(Directory.Exists(root));
        using var scope = factory.Services.CreateScope();
        Assert.Null(scope.ServiceProvider.GetService<IFlow1MetadataStore>());
    }

    [LocalSqlFact]
    public async Task Legacy_sidecar_presence_blocks_cutover_without_reading_or_overwriting_source()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var root = Path.Combine(Path.GetTempPath(), "flow1-cutover-" + Guid.NewGuid().ToString("N"));
        var folder = Path.Combine(root, "metadata", "horse"); Directory.CreateDirectory(folder);
        var file = Path.Combine(folder, "legacy.json");
        const string original = "deliberately invalid JSON: presence-only guard must not parse or replace it";
        await File.WriteAllTextAsync(file, original);
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root); using var client = factory.Client();
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/customer/horses") { Content = CustomerTransportTests.HorseBody() };
            request.Headers.Add("Idempotency-Key", "legacy-presence-create");
            using var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.Equal("FLOW1_STATE_IMPORT_REQUIRED", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errorCode").GetString());
            Assert.Equal(original, await File.ReadAllTextAsync(file));
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE;"));
            Assert.Equal(0L, await db.ScalarAsync<long>("SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
            Assert.False(Directory.Exists(Path.Combine(root, "bytes")));
        }
        finally { File.Delete(file); Directory.Delete(folder); Directory.Delete(Path.GetDirectoryName(folder)!); Directory.Delete(root); }
    }

    [LocalSqlFact]
    public async Task Unreconciled_prepared_state_is_rejected_but_historical_aborted_publication_is_readable()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await db.ExecuteAsync("INSERT INTO CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,DepositRateStandard,ContractStatus) VALUES ('c-guard','req-1','owner','C-GUARD','VND',40,'DRAFT');");
        await using var context = db.Context(); var store = new SqlFlow1StateStore(context, new FlowClock());
        var work = new Flow1UnitOfWork(context);
        await work.ExecuteAsync("req-1", async ct => {
            await store.AppendAsync("publication", "c-guard", 0, "aborted-history", "owner", "IMPORT_FIXTURE", JsonSerializer.SerializeToElement(new { outcome = "ABORTED" }), ct); return 0;
        });
        Assert.NotNull(await store.ReadAsync("publication", "c-guard"));
        await work.ExecuteAsync("req-1", async ct => {
            await store.AppendAsync("publication", "c-guard", 1, "prepared-history", "owner", "IMPORT_FIXTURE", JsonSerializer.SerializeToElement(new { outcome = "PREPARED" }), ct); return 0;
        });
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => store.ReadAsync("publication", "c-guard"));
        Assert.Equal("FLOW1_STATE_RECONCILIATION_REQUIRED", error.ErrorCode);
    }

    [LocalSqlFact]
    public async Task Flushing_new_owner_never_commits_and_rollback_removes_owner_and_state_together()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(); await using var context = db.Context();
        var store = new SqlFlow1StateStore(context, new FlowClock()); var work = new Flow1UnitOfWork(context);
        await Assert.ThrowsAsync<InvalidOperationException>(() => work.FlushAsync());
        await Assert.ThrowsAsync<IOException>(() => work.ExecuteAsync<int>("new-horse", async ct => {
            context.Horses.Add(new Horse { HorseId = "new-horse", OwnerId = "owner", Name = "Fixture", MicrochipIso = "123456789012345" });
            await work.FlushAsync(ct);
            await store.AppendAsync("horse", "new-horse", 0, "flush-proof", "owner", "HORSE_CREATED", JsonSerializer.SerializeToElement(new { status = "ACTIVE" }), ct);
            throw new IOException("Crash after owner flush/state append, before commit.");
        }));
        Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE;"));
        Assert.Null(await store.ReadAsync("horse", "new-horse"));
    }
}
