using Application.Common.Exceptions;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Rebuild.Tests;
public sealed class SchemaTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Fact] public async Task Deferred_mode_migration_is_repeatable_and_preserves_existing_snapshots()
    {
        await using var db = database.Context();
        var snapshots = await db.Set<Domain.Flow1.Entities.ContractVersion>().OrderBy(v => v.ContractID)
            .ThenBy(v => v.VersionNo).Select(v => v.ContentSnapshot).ToArrayAsync();
        var script = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "DeferContractTransportMode.sql"));
        await db.Database.ExecuteSqlRawAsync(script);
        await db.Database.ExecuteSqlRawAsync(script);
        await new SchemaCheck(database.Connection).EnsureAsync(default);
        Assert.Equal(snapshots, await db.Set<Domain.Flow1.Entities.ContractVersion>().OrderBy(v => v.ContractID)
            .ThenBy(v => v.VersionNo).Select(v => v.ContentSnapshot).ToArrayAsync());
        // An actual SQL write must allow a route with a pending mode, while retaining the supported-route FK.
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Database.ExecuteSqlRawAsync("UPDATE TRANSPORT_REQUEST SET TransportType=NULL WHERE RequestID='REQUEST_001'");
        Assert.Null((await db.Set<Domain.Flow1.Entities.TransportRequest>().AsNoTracking().SingleAsync(r => r.RequestID == "REQUEST_001")).TransportType);
        await transaction.RollbackAsync();
    }
    [Fact] public async Task Disabled_flow_constraint_fails_readiness_before_business_writes()
    {
        await using var db = database.Context();
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE HORSE NOCHECK CONSTRAINT CK_F1S_HORSE_PhotoUrl");
        try
        {
            var error = await Assert.ThrowsAsync<BusinessRuleException>(() => new SchemaCheck(database.Connection).EnsureAsync(default));
            Assert.Equal("FLOW1_SQL_SCHEMA_REQUIRED",error.ErrorCode);
        }
        finally { await db.Database.ExecuteSqlRawAsync("ALTER TABLE HORSE WITH CHECK CHECK CONSTRAINT CK_F1S_HORSE_PhotoUrl"); }
        await new SchemaCheck(database.Connection).EnsureAsync(default);
    }
    [Fact] public async Task Sql_seed_snapshot_is_readable_without_rebuilding_historical_content()
    {
        using var factory = new ApiFactory(database); using var manager = factory.Manager();
        var response = await manager.GetAsync("/api/manager/contracts/CONTRACT_001/versions/1");
        Assert.True(response.IsSuccessStatusCode,await response.Content.ReadAsStringAsync());
    }
}
