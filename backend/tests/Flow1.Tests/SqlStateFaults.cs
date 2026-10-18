using System.Text.Json;
using Application.Interfaces.Flow1;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Flow1.Tests;

internal sealed class SqlStateFaults { public string? Mode; }
internal sealed class FaultingSqlStateStore(IFlow1StateStore inner, SqlStateFaults faults) : IFlow1StateStore
{
    public Task<Flow1StateDocument?> ReadAsync(string type, string id, CancellationToken ct = default) => inner.ReadAsync(type, id, ct);
    public async Task<Flow1StateRevision> AppendAsync(string type, string id, int version, string key, string actor, string action, JsonElement payload, CancellationToken ct = default)
    {
        var result = await inner.AppendAsync(type, id, version, key, actor, action, payload, ct);
        if (faults.Mode == type + "-after-state" || faults.Mode == "canonical-written" && type == "request" && action == "RESUBMIT")
        { faults.Mode = null; throw new IOException("Injected failure after SQL state write, before transaction commit."); }
        return result;
    }
}
internal sealed class SqlSaveFault(SqlStateFaults faults) : SaveChangesInterceptor
{
    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken ct = default)
    {
        if (result > 0 && faults.Mode == "after-save")
        { faults.Mode = null; throw new IOException("Injected failure after all SQL writes, before transaction commit."); }
        return ValueTask.FromResult(result);
    }
}
