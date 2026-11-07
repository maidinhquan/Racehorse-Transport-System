namespace Application.Flow1.Interfaces;

public sealed record CitySelection(string CityId, string Label, string CountryCode,
    string Provider = "GEOAPIFY");

public interface ICityLocations
{
    Task<IReadOnlyList<CitySelection>> CitiesAsync(string query, string country, CancellationToken ct);
    Task<IReadOnlyList<GeocodeCandidate>> SearchInCityAsync(string query, string country, string cityId, CancellationToken ct);
    Task<CitySelection> VerifyCityAsync(MapPoint point, string cityId, CancellationToken ct);
}
