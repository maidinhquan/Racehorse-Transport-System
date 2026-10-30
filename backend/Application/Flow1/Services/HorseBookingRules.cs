using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed record HorseBookingState(string Status, string? ConflictCode);

public static class HorseBookingRules
{
    public static async Task<Dictionary<string, HorseBookingState>> CheckAsync(IDataSession data,
        IReadOnlyCollection<string> horseIds, string? excludeRequestId, CancellationToken ct, bool ignoreReturnedRequests = false)
    {
        var links = await data.ListAsync<RequestHorse>(h => horseIds.Contains(h.HorseID) && h.RequestID != excludeRequestId, ct);
        var ids = links.Select(h => h.RequestID).Distinct().ToArray();
        var requests = await data.ListAsync<TransportRequest>(r => ids.Contains(r.RequestID), ct);
        var completedTrips = await data.ListAsync<Trip>(t => ids.Contains(t.RequestID)
            && (t.Status == "COMPLETED" || t.Status == "DELIVERED"), ct);
        bool Delivered(TransportRequest r) => r.Status is "COMPLETED" or "DELIVERED" or "CLOSED"
            || completedTrips.Any(t => t.RequestID == r.RequestID);
        var result = new Dictionary<string, HorseBookingState>();
        foreach (var horseId in horseIds)
        {
            var history = requests.Where(r => links.Any(l => l.HorseID == horseId && l.RequestID == r.RequestID)
                && r.Status is not ("DRAFT" or "CANCELLED" or "REJECTED")
                && (!ignoreReturnedRequests || r.Status != "CHANGES_REQUESTED")).ToArray();
            var delivered = history.Any(Delivered);
            var busy = history.Any(r => !Delivered(r));
            result[horseId] = new(busy ? "IN_TRANSPORT_REQUEST" : delivered ? "DELIVERED" : "AVAILABLE",
                busy ? "HORSE_SCHEDULE_CONFLICT" : null);
        }
        return result;
    }

    public static async Task RequireAvailableAsync(IDataSession data, IReadOnlyCollection<string> horses,
        TransportRequest request, CancellationToken ct)
    {
        foreach (var state in (await CheckAsync(data, horses, request.RequestID, ct)).Values)
            Require(state.ConflictCode is null, "HORSE_SCHEDULE_CONFLICT",
                "Ngựa đang thuộc một đơn vận chuyển chưa hoàn tất. Vui lòng hoàn tất hoặc huỷ đơn đó trước.");
    }
}
