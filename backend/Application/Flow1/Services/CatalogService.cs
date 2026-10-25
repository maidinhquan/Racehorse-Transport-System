using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class CatalogService(IDataSession data, PolicyService policies)
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
        if (origin is not null && destination is not null && mode is not null) return await FormAsync(origin, destination, mode, ct);
        return new { currency = "VND", supportedRoutes = (await RoutesAsync(ct)).Select(r => new { id = r.RouteID,
            originCountry = r.OriginCountry, destinationCountry = r.DestinationCountry, mode = r.TransportMode }).ToArray(),
            preparationDays = await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", destination, mode, 0, null, true, ct),
            defaultDepositPct = await policies.NumberAsync("DEFAULT_DEPOSIT_PERCENT", "PERCENT", destination, mode, 1, 100, false, ct),
            contractDeadlineHours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", destination, mode, 1, null, false, ct) };
    }
    public async Task<object> FormAsync(string origin, string destination, string mode, CancellationToken ct)
    {
        await ValidateAsync(origin, destination, mode, ct);
        return new
        {
            currency = "VND",
            supportedRoutes = (await RoutesAsync(ct)).Select(r => new { id = r.RouteID, originCountry = r.OriginCountry, destinationCountry = r.DestinationCountry, mode = r.TransportMode }).ToArray(),
            preparationDays = await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", destination, mode, 0, null, true, ct),
            defaultDepositPct = await policies.NumberAsync("DEFAULT_DEPOSIT_PERCENT", "PERCENT", destination, mode, 1, 100, false, ct),
            contractDeadlineHours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", destination, mode, 1, null, false, ct)
        };
    }
}
