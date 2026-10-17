using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Interfaces;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

/// <summary>Discover resources without SQL locks, lock horses first, then re-read and validate under the request lock.</summary>
public sealed class Flow1RequestTransaction(IFlow1UnitOfWork work, IFlow1StateStore state)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private async Task<HashSet<string>> Horses(string id, CancellationToken ct)
    {
        var request = await state.ReadAsync("request", id, ct);
        var review = await state.ReadAsync("review", id, ct);
        var canonical = request?.Revisions[^1].Payload.Deserialize<RequestSnapshot>(Json);
        var reviews = review?.Revisions[^1].Payload.Deserialize<ReviewState>(Json);
        return (canonical?.Input.Horses.Select(h => h.HorseId) ?? [])
            .Concat(reviews?.Changes.Where(c => c.Status == "PENDING").SelectMany(c => c.Proposal.Horses.Select(h => h.HorseId)) ?? [])
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
    public async Task<T> ExecuteAsync<T>(string id, Func<CancellationToken, Task<T>> action, CancellationToken ct,
        IEnumerable<string>? extraHorses = null)
    {
        var locked = await Horses(id, ct); locked.UnionWith(extraHorses ?? []);
        return await work.ExecuteAsync(id, async token => {
            await work.LockHorsesAsync(locked, token);
            var current = await Horses(id, token);
            if (!current.IsSubsetOf(locked)) throw Error("Horse references changed while acquiring locks; reload and retry.", "STALE_VERSION", 409);
            return await action(token);
        }, ct);
    }
}
