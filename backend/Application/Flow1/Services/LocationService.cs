using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;
public sealed class LocationService(IDataSession data, AccessService access, IGeocodingProvider provider)
{
    public async Task<object> SearchAsync(string actor, string query, string country, CancellationToken ct)
    {
        await access.AccountAsync(actor, null, ct);
        Require((await data.ListAsync<Country>(c => c.CountryCode == country && c.IsActive, ct)).Any(),
            "UNSUPPORTED_COUNTRY", "Country is not active.", 400);
        return await provider.SearchAsync(query, country, ct);
    }
}
