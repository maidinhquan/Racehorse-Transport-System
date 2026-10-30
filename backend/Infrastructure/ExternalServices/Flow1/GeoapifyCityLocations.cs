using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Flow1.Interfaces;
using Application.Common.Exceptions;
using Microsoft.Extensions.Caching.Memory;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

public sealed partial class GeoapifyTransportMaps
{
    private sealed record Boundary(CitySelection Selection, long OsmId, string OsmType);
    private static string Language(string country) => country == "VN" ? "vi" : "en";
    private static void ValidateSearch(string query, string country)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length > 255 || !Regex.IsMatch(country ?? "", "^[A-Z]{2}$"))
            throw Error("Enter a query and a two-letter uppercase country code.", "INVALID_LOCATION");
    }

    public async Task<IReadOnlyList<CitySelection>> CitiesAsync(string query, string country, CancellationToken ct)
    {
        ValidateSearch(query, country);
        using var doc = await GetAsync($"v1/geocode/search?text={Uri.EscapeDataString(query)}&type=locality&filter=countrycode:{country.ToLowerInvariant()}&lang={Language(country)}&limit=5&format=json", ct);
        var candidates = Parse(() => doc.RootElement.GetProperty("results").EnumerateArray()
            .Where(x => Country(x) == country && x.GetProperty("result_type").GetString() is "city" or "state" or "county")
            .Select(x => x.GetProperty("place_id").GetString()!)
            .ToArray());
        var result = new List<CitySelection>();
        foreach (var id in candidates)
        {
            try
            {
                var boundary = await ResolveBoundaryAsync(id, country, ct);
                if (!result.Any(x => x.CityId == boundary.Selection.CityId)) result.Add(boundary.Selection);
            }
            catch (BusinessRuleException e) when (e.ErrorCode == "INVALID_CITY") { }
        }
        return result;
    }

    private async Task<Boundary> ResolveBoundaryAsync(string id, string country, CancellationToken ct)
    {
        if (!Regex.IsMatch(id ?? "", "^[a-f0-9]{20,1024}$"))
            throw Error("Use cityId returned by /api/locations/cities.", "INVALID_CITY", 400);
        var cacheKey = $"geoapify-city:{options.Geoapify.ApiBaseUrl}:{country}:{id}";
        if (cityCache is not null && cityCache.TryGetValue<Boundary>(cacheKey, out var cached) && cached is not null) return cached;
        using var doc = await GetAsync($"v2/place-details?id={Uri.EscapeDataString(id!)}&features=details&lang={Language(country)}", ct);
        var boundary = Parse(() =>
        {
            var features = doc.RootElement.GetProperty("features");
            if (features.GetArrayLength() != 1) throw Error("City boundary is unavailable.", "INVALID_CITY", 400);
            var feature = features[0]; var p = feature.GetProperty("properties");
            if (Country(p) != country) throw Error("City does not belong to the selected country.", "COUNTRY_MISMATCH", 400);
            var raw = p.GetProperty("datasource").GetProperty("raw");
            var level = raw.GetProperty("admin_level").ToString();
            if (feature.GetProperty("geometry").GetProperty("type").GetString() is not ("Polygon" or "MultiPolygon")
                || !int.TryParse(level, out var number) || number is < 3 or > 8
                || raw.GetProperty("boundary").GetString() != "administrative")
                throw Error("Select a province/city with a known administrative boundary.", "INVALID_CITY", 400);
            // Geoapify IDs can differ by label/language for the same OSM boundary.
            return new Boundary(new(p.GetProperty("place_id").GetString()!, p.GetProperty("formatted").GetString()!, country),
                long.Parse(raw.GetProperty("osm_id").ToString()), raw.GetProperty("osm_type").GetString()!);
        });
        cityCache?.Set(cacheKey, boundary, TimeSpan.FromHours(6));
        return boundary;
    }

    private async Task<bool> ContainsAsync(Boundary city, MapPoint point, CancellationToken ct)
    {
        ValidatePoint(point);
        using var doc = await GetAsync($"v1/boundaries/part-of?lat={F(point.Latitude)}&lon={F(point.Longitude)}&geometry=point&lang={Language(point.CountryCode)}", ct);
        return Parse(() => doc.RootElement.GetProperty("features").EnumerateArray().Any(feature =>
        {
            var p = feature.GetProperty("properties");
            if (Country(p) != point.CountryCode) return false;
            var raw = p.GetProperty("datasource").GetProperty("raw");
            return raw.GetProperty("osm_id").ToString() == city.OsmId.ToString(System.Globalization.CultureInfo.InvariantCulture)
                && raw.GetProperty("osm_type").GetString() == city.OsmType;
        }));
    }

    public async Task<CitySelection> VerifyCityAsync(MapPoint point, string cityId, CancellationToken ct)
    {
        ValidatePoint(point);
        var city = await ResolveBoundaryAsync(cityId, point.CountryCode, ct);
        if (!await ContainsAsync(city, point, ct))
            throw Error("Coordinates are outside the selected province/city.", "CITY_MISMATCH", 400);
        return city.Selection;
    }

    public async Task<IReadOnlyList<GeocodeCandidate>> SearchInCityAsync(string query, string country, string cityId, CancellationToken ct)
    {
        ValidateSearch(query, country);
        var city = await ResolveBoundaryAsync(cityId, country, ct);
        var filter = Uri.EscapeDataString($"countrycode:{country.ToLowerInvariant()}|place:{city.Selection.CityId}");
        using var doc = await GetAsync($"v1/geocode/search?text={Uri.EscapeDataString(query)}&filter={filter}&lang={Language(country)}&limit=5&format=json", ct);
        var candidates = Parse(() => doc.RootElement.GetProperty("results").EnumerateArray()
            .Where(x => Country(x) == country).Select(x => new GeocodeCandidate(x.GetProperty("formatted").GetString()!,
                new(x.GetProperty("lon").GetDouble(), x.GetProperty("lat").GetDouble(), country), true, SourceAttribution,
                "GEOAPIFY", string.Equals(options.Provider, "MAPBOX", StringComparison.OrdinalIgnoreCase) ? "MAPBOX" : null)).ToArray());
        var accepted = new List<GeocodeCandidate>();
        // Verify actual containment too: never turn a missing/ignored provider filter into a country-wide search.
        foreach (var candidate in candidates)
            if (await ContainsAsync(city, candidate.Point, ct)) accepted.Add(candidate);
        return accepted;
    }
}
