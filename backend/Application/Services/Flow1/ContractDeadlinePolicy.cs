using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

// All readers resolve the same immutable extension chain while holding the request transaction.
public sealed class ContractDeadlinePolicy(IFlow1StateStore state)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public sealed record Resolved(DateTimeOffset Original, ContractDeadlineExtension[] Extensions)
    {
        public int Version => Extensions.Length;
        public DateTimeOffset Effective => Version == 0 ? Original : Extensions[^1].NewDeadline;
        public DateTimeOffset AtVersion(int version) => version >= 0 && version <= Version
            ? version == 0 ? Original : Extensions[version - 1].NewDeadline
            : throw Error("Acceptance refers to an unknown deadline version.", "STATE_CONFLICT", 409);
    }
    public static DateTime SqlTime(DateTimeOffset value) => DateTimeOffset.FromUnixTimeSeconds(value.ToUnixTimeSeconds()).UtcDateTime;
    public async Task<Resolved> ReadAsync(ContractPublication p, DraftSnapshot draft, CancellationToken ct)
    {
        var doc = await state.ReadAsync("extensions", p.ContractId, ct);
        var events = doc?.Revisions.Select(r => r.Payload.Deserialize<ContractDeadlineExtension>(Json)
            ?? throw Error("Deadline evidence unavailable.", "STATE_CONFLICT", 409)).ToArray() ?? [];
        var previous = p.CompletionDeadline;
        for (var i = 0; i < events.Length; i++)
        {
            var e = events[i];
            if (e.ExtensionVersion != i + 1 || e.ContractId != p.ContractId || e.RequestId != p.RequestId ||
                e.ContractVersion != p.ContractVersion || e.DocumentHash != p.Document.Sha256 ||
                e.OriginalDeadline != p.CompletionDeadline || e.PreviousDeadline != previous || e.NewDeadline <= previous ||
                e.NewDeadline <= e.AtUtc || string.IsNullOrWhiteSpace(e.Reason) || string.IsNullOrWhiteSpace(e.Actor) ||
                string.IsNullOrWhiteSpace(e.Key) || draft.Plan.Input.PlannedDepartureAt is null ||
                e.NewDeadline > draft.Plan.Input.PlannedDepartureAt.Value.AddDays(-draft.Plan.Input.PreparationDays))
                throw Error("Deadline history differs from the frozen contract or preparation interval.", "STATE_CONFLICT", 409);
            previous = e.NewDeadline;
        }
        return new(p.CompletionDeadline, events);
    }
}
