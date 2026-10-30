using Application.Common.Exceptions;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Rebuild.Tests;
public sealed class SchemaTests(SqlFixture database) : IClassFixture<SqlFixture>
{
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
