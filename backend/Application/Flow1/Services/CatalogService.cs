using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class CatalogService(IDataSession data, PolicyService policies, RequestSchedulePolicy? schedule = null)
{
    public async Task<IReadOnlyList<SupportedRoute>> RoutesAsync(CancellationToken ct)
    {
        var active = (await data.ListAsync<Country>(c => c.IsActive, ct)).Select(c => c.CountryCode).ToHashSet();
        return (await data.ListAsync<SupportedRoute>(r => r.IsActive, ct))
            .Where(r => active.Contains(r.OriginCountry) && active.Contains(r.DestinationCountry)).ToArray();
    }
    public async Task ValidateAsync(string origin, string destination, string mode, CancellationToken ct)
    {
        Require((await RoutesAsync(ct)).Any(r => r.OriginCountry == origin && r.DestinationCountry == destination && r.TransportMode == mode),
            "UNSUPPORTED_ROUTE", "The selected route is not active.", 400);
    }
    public async Task<object> OptionsAsync(string? origin, string? destination, string? mode, CancellationToken ct)
    {
        Require(origin is null && destination is null && mode is null ||
            !string.IsNullOrWhiteSpace(origin) && !string.IsNullOrWhiteSpace(destination) && !string.IsNullOrWhiteSpace(mode),
            "VALIDATION_ERROR", "Provide originCountry, destinationCountry and mode together, or omit all three.", 400);
        if (origin is not null && destination is not null && mode is not null) return await FormAsync(origin, destination, mode, ct);
        return new { currency = "VND", supportedRoutes = (await RoutesAsync(ct)).Select(r => new { id = r.RouteID,
            originCountry = r.OriginCountry, destinationCountry = r.DestinationCountry, mode = r.TransportMode }).ToArray(),
            preparationDays = mode is not null && schedule is not null ? await schedule.PreparationAsync(mode, ct)
                : await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", destination, mode, 0, null, true, ct),
            minTransitDays = await policies.NumberOrDefaultAsync("MIN_TRANSIT_DAYS", "DAY", destination, mode, 0, 30, true, 0, ct),
            minimumPickupLeadDays = mode is not null && schedule is not null ? await schedule.MinimumLeadDaysAsync(mode, true, ct) : (int?)null,
            defaultDepositPct = await policies.NumberAsync("DEFAULT_DEPOSIT_PERCENT", "PERCENT", destination, mode, 1, 100, false, ct),
            contractDeadlineHours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", destination, mode, 1, null, false, ct),
            maxHorsesPerRequest = (int)await policies.NumberOrDefaultAsync("MAX_HORSES_PER_REQUEST", "HORSE", destination, mode, 1, 100, true, 6, ct) };
    }
    public async Task<object> FormAsync(string origin, string destination, string mode, CancellationToken ct)
    {
        var route = (await RoutesAsync(ct)).FirstOrDefault(r =>
            r.OriginCountry == origin && r.DestinationCountry == destination && r.TransportMode == mode);
        Require(route is not null, "UNSUPPORTED_ROUTE", "The selected route is not active.", 400);
        var lead = schedule is null ? (int?)null : await schedule.MinimumLeadDaysAsync(mode, true, ct);
        return new
        {
            currency = "VND",
            selectedRoute = new { id = route!.RouteID, originCountry = route.OriginCountry, destinationCountry = route.DestinationCountry, mode = route.TransportMode },
            preparationDays = mode is not null && schedule is not null ? await schedule.PreparationAsync(mode, ct)
                : await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", destination, mode, 0, null, true, ct),
            minTransitDays = await policies.NumberOrDefaultAsync("MIN_TRANSIT_DAYS", "DAY", destination, mode, 0, 30, true, 0, ct),
            minimumPickupLeadDays = lead,
            earliestPickupDate = lead is int days ? DateOnly.FromDateTime(schedule!.Today(origin).AddDays(days)) : (DateOnly?)null,
            defaultDepositPct = await policies.NumberAsync("DEFAULT_DEPOSIT_PERCENT", "PERCENT", destination, mode, 1, 100, false, ct),
            contractDeadlineHours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", destination, mode, 1, null, false, ct),
            maxHorsesPerRequest = (int)await policies.NumberOrDefaultAsync("MAX_HORSES_PER_REQUEST", "HORSE", destination, mode, 1, 100, true, 6, ct)
        };
    }
}
