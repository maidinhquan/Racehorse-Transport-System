using System.Text.Json;
using Domain.Entities;

namespace Infrastructure.Services;

public static class CoordinatorPlanMode
{
    // The published contract is authoritative. Keep saved modes for older mode-deferred contracts.
    public static string? Selected(TripPlan trip)
    {
        if (trip.Request?.TransportType is "ROAD" or "AIR") return trip.Request.TransportType;
        foreach (var json in new[] { trip.ApprovedPlanJson, trip.DraftPlanJson })
        {
            if (string.IsNullOrWhiteSpace(json)) continue;
            try
            {
                using var plan = JsonDocument.Parse(json);
                if (plan.RootElement.ValueKind != JsonValueKind.Object) continue;
                foreach (var field in plan.RootElement.EnumerateObject())
                    if (field.Name.Equals("mode", StringComparison.OrdinalIgnoreCase)
                        && field.Value.ValueKind == JsonValueKind.String && field.Value.GetString() is "ROAD" or "AIR")
                        return field.Value.GetString();
            }
            catch (JsonException) { }
        }
        return null;
    }
}
