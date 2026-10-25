using System.Globalization;
using System.Net;
using System.Text.Json;
using Application.Common.Flow1;
using Application.Flow1.Interfaces;
using Application.Services.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// Geoapify permits storage with attribution, including its Free plan. The map renderer
// remains independent; no Mapbox geocoding or routing results enter this adapter.
public sealed class GeoapifyTransportMaps(HttpClient http, Flow1MapOptions options, OsmRequestGate gate, TimeProvider clock)
    : IGeocodingProvider, ILocationVerifier, IRoadRouter
{
    public const string SourceAttribution = "Powered by Geoapify | © OpenStreetMap contributors (ODbL)";
    public string? Attribution => SourceAttribution;

    private Uri Endpoint(string relative)
    {
        var config = options.Geoapify;
        if (!options.MayPersistResults || string.IsNullOrWhiteSpace(config.ApiKey) ||
            !Uri.TryCreate(config.ApiBaseUrl, UriKind.Absolute, out var root) || root.AbsolutePath != "/" ||
            !string.IsNullOrEmpty(root.UserInfo) || !string.IsNullOrEmpty(root.Query) || !string.IsNullOrEmpty(root.Fragment) ||
            !(root.Scheme == "https" && root.Host == "api.geoapify.com" && root.IsDefaultPort ||
              root.IsLoopback && root.Scheme is "http" or "https"))
            throw Error("Configure the Geoapify key and permission to store attributed results.", "MAP_PROVIDER_NOT_CONFIGURED", 503);
        return new Uri(root, relative + "&apiKey=" + Uri.EscapeDataString(config.ApiKey));
    }

    private Task<JsonDocument> GetAsync(string relative, CancellationToken ct)
    {
        var uri = Endpoint(relative); // Fail before queueing or network when configuration is absent.
        // Conservative one-request-per-second process-wide gate; shared with the OSM adapter.
        return gate.ExecuteAsync(async () =>
        {
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
            deadline.CancelAfter(TimeSpan.FromSeconds(15));
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            try
            {
                using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                    throw Error("Map provider quota exceeded; retry later.", "MAP_PROVIDER_RATE_LIMITED", 429);
                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                    throw Error("Check the Geoapify key and account permissions.", "MAP_PROVIDER_AUTH_FAILED", 503);
                if (!response.IsSuccessStatusCode) throw Error("Map provider unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503);
                await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
                using var buffer = new MemoryStream();
                var chunk = new byte[8192]; int read;
                while ((read = await stream.ReadAsync(chunk, deadline.Token)) > 0)
                {
                    if (buffer.Length + read > 1024 * 1024) throw new JsonException();
                    buffer.Write(chunk, 0, read);
                }
                return JsonDocument.Parse(buffer.ToArray());
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            { throw Error("Map provider timed out.", "MAP_PROVIDER_UNAVAILABLE", 503); }
            // API keys are in query strings. Discard raw body, URI and inner exception.
            catch (Exception e) when (e is HttpRequestException or IOException or JsonException)
            { throw Error("Map provider returned an unavailable or invalid response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        }, ct);
    }

    public async Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address, string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(address) || address.Length > 255 || (countryCode is not { Length: 2 } || countryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Enter an address and a two-letter uppercase country code.", "INVALID_LOCATION");
        using var doc = await GetAsync($"v1/geocode/search?text={Uri.EscapeDataString(address)}&filter=countrycode:{countryCode.ToLowerInvariant()}&lang={(countryCode == "JP" ? "ja" : countryCode == "VN" ? "vi" : "en")}&limit=5&format=json", ct);
        return Parse<IReadOnlyList<GeocodeCandidate>>(() =>
        {
            var result = new List<GeocodeCandidate>();
            foreach (var item in doc.RootElement.GetProperty("results").EnumerateArray().Take(5))
            {
                if (Country(item) != countryCode) continue;
                var label = item.GetProperty("formatted").GetString();
                if (string.IsNullOrWhiteSpace(label)) throw new JsonException();
                var point = new MapPoint(item.GetProperty("lon").GetDouble(), item.GetProperty("lat").GetDouble(), countryCode);
                ValidatePoint(point);
                result.Add(new(label, point, true, SourceAttribution, "GEOAPIFY",
                    string.Equals(options.Provider, "MAPBOX", StringComparison.OrdinalIgnoreCase) ? "MAPBOX" : null));
            }
            return result;
        });
    }

    public async Task VerifyAsync(MapPoint point, CancellationToken ct)
    {
        ValidatePoint(point);
        // Never send a client country filter here: establish the actual country from coordinates.
        using var doc = await GetAsync($"v1/geocode/reverse?lat={F(point.Latitude)}&lon={F(point.Longitude)}&type=country&limit=1&format=json", ct);
        var country = Parse(() => {
            var items = doc.RootElement.GetProperty("results");
            return items.GetArrayLength() == 0 ? null : Country(items[0]);
        });
        if (country != point.CountryCode)
            throw Error("Coordinates do not match the selected supported country.", "COUNTRY_MISMATCH");
    }

    public async Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query, CancellationToken ct = default)
    {
        if (query.Points.Count != 2 || query.Profile != "driving") throw Error("Invalid routing input.", "INVALID_LOCATION");
        foreach (var point in query.Points) ValidatePoint(point);
        // Geoapify waypoints are LAT,LON, unlike Mapbox's LON,LAT.
        var waypoints = string.Join("|", query.Points.Select(p => F(p.Latitude) + "," + F(p.Longitude)));
        using var doc = await GetAsync($"v1/routing?waypoints={Uri.EscapeDataString(waypoints)}&mode=drive&units=metric&format=geojson", ct);
        return Parse(() => {
            var features = doc.RootElement.GetProperty("features");
            if (features.GetArrayLength() == 0) throw Error("No road route found.", "ROUTE_NOT_FOUND");
            var route = features[0].GetProperty("properties");
            var distance = route.GetProperty("distance").GetDecimal();
            var duration = route.GetProperty("time").GetDecimal();
            if (!string.Equals(route.GetProperty("distance_units").GetString(), "meters", StringComparison.OrdinalIgnoreCase) ||
                route.TryGetProperty("time_units", out var unit) && !string.Equals(unit.GetString(), "seconds", StringComparison.OrdinalIgnoreCase) ||
                distance is <= 0 or > 10_000_000 || duration <= 0)
                throw new JsonException();
            return new RoadRouteResult("GEOAPIFY", distance, duration, clock.GetUtcNow(),
                Application.Common.Flow1.Flow1Hash.Of(query), true, SourceAttribution);
        });
    }

    private static string? Country(JsonElement item) => item.GetProperty("country_code").GetString()?.ToUpperInvariant();
    private static string F(double value) => value.ToString("0.######", CultureInfo.InvariantCulture);
    private static void ValidatePoint(MapPoint point)
    {
        if (!double.IsFinite(point.Latitude) || !double.IsFinite(point.Longitude) || point.Latitude is < -90 or > 90 ||
            point.Longitude is < -180 or > 180 || (point.CountryCode is not { Length: 2 } || point.CountryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Invalid coordinates.", "INVALID_LOCATION");
    }
    private static T Parse<T>(Func<T> action)
    {
        try { return action(); }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or
            IndexOutOfRangeException or FormatException or OverflowException)
        { throw Error("Map provider returned an invalid response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }
}
