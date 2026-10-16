using System.Text.Json;
using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Domain.Interfaces;
using Xunit;

namespace Flow1.Tests;

public sealed class RequestTransactionTests
{
    private sealed class ResourceState(bool changeAfterDiscovery = false) : IFlow1StateStore
    {
        public int Reads; public bool InTransaction; public bool HorsesLocked;
        public Task<Flow1StateDocument?> ReadAsync(string type, string id, CancellationToken ct = default)
        {
            Reads++;
            if (InTransaction) Assert.True(HorsesLocked); // no SQL read while waiting for horse resources
            var input = CustomerTransportTests.Request("h-1");
            var change = new ReviewChange("change-1", "Change horse", input with { Horses = [new(changeAfterDiscovery && Reads > 2 ? "h-new" : "h-proposal", 1)] }, "PENDING", 1);
            var snapshot = new RequestSnapshot(input, null!, "fixture", [], "NOT_REQUIRED");
            var payload = type == "request" ? JsonSerializer.SerializeToElement(snapshot, CustomerTransportTests.Json)
                : JsonSerializer.SerializeToElement(new ReviewState(1, null, [], [], [change], []), CustomerTransportTests.Json);
            return Task.FromResult<Flow1StateDocument?>(new(1, type, id, [new(1, "fixture", "hash", "owner", "FIXTURE", DateTime.UtcNow, payload)]));
        }
        public Task<Flow1StateRevision> AppendAsync(string type, string id, int version, string key, string actor, string action, JsonElement payload, CancellationToken ct = default)
            => throw new NotSupportedException();
    }
    private sealed class ResourceWork(ResourceState state) : IFlow1UnitOfWork
    {
        public string[] Locked = [];
        public async Task<T> ExecuteAsync<T>(string id, Func<CancellationToken, Task<T>> action, CancellationToken ct = default)
        { Assert.Equal(2, state.Reads); state.InTransaction = true; return await action(ct); }
        public Task LockHorsesAsync(IEnumerable<string> ids, CancellationToken ct = default)
        { Assert.Equal(2, state.Reads); Locked = ids.ToArray(); state.HorsesLocked = true; return Task.CompletedTask; }
        public Task FlushAsync(CancellationToken ct = default) => throw new NotSupportedException();
    }
    [Fact]
    public async Task Horse_references_changed_during_lock_acquisition_stop_before_business_writes()
    {
        var state = new ResourceState(true); var work = new ResourceWork(state); var ran = false;
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => new Flow1RequestTransaction(work, state).ExecuteAsync("req-1", _ => {
            ran = true; return Task.FromResult(0);
        }, default));
        Assert.Equal("STALE_VERSION", error.ErrorCode); Assert.False(ran); Assert.DoesNotContain("h-new", work.Locked);
    }
    [Fact]
    public async Task Canonical_pending_proposal_and_input_horses_are_locked_before_transactional_state_reads()
    {
        var state = new ResourceState(); var work = new ResourceWork(state);
        var result = await new Flow1RequestTransaction(work, state).ExecuteAsync("req-1", _ => Task.FromResult(42), default, ["h-input", "H-1"]);
        Assert.Equal(42, result); Assert.Equal(3, work.Locked.Length);
        Assert.Contains("h-1", work.Locked); Assert.Contains("h-proposal", work.Locked); Assert.Contains("h-input", work.Locked);
    }
}
