using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;
public sealed class LocationService(IDataSession data, AccessService access, IGeocodingProvider provider)
{
    private async Task ValidateAsync(string actor, string country, CancellationToken ct)
    {
        await access.AccountAsync(actor, null, ct);
        Require((await data.ListAsync<Country>(c => c.CountryCode == country && c.IsActive, ct)).Any(),
            "UNSUPPORTED_COUNTRY", "Country is not active.", 400);
    }
    private ICityLocations Cities => provider as ICityLocations
        ?? throw Failure("CITY_PROVIDER_UNSUPPORTED", "City-scoped locations currently require Geoapify.", 503);
    public async Task<object> CitiesAsync(string actor, string query, string country, CancellationToken ct)
    {
        await ValidateAsync(actor, country, ct);
        return await Cities.CitiesAsync(query, country, ct);
    }
    public async Task<object> SearchAsync(string actor, string query, string country, string cityId, CancellationToken ct)
    {
        await ValidateAsync(actor, country, ct);
        return await Cities.SearchInCityAsync(query, country, cityId, ct);
    }
}
