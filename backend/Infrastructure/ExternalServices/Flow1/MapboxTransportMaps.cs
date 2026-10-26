using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.Flow1.Interfaces;
using Application.Services.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

public sealed class MapboxTransportMaps(HttpClient http, Flow1MapOptions options, TimeProvider clock)
    : IRoadRouter, IGeocodingProvider, ILocationVerifier
{
    private Uri Endpoint(string relative, bool permanentGeocoding = false)
    {
        var config = options.Mapbox;
        if (string.IsNullOrWhiteSpace(config.AccessToken) ||
            permanentGeocoding && (!options.MayPersistResults || !config.PermanentGeocodingEnabled))
            throw Error("Configure the Mapbox token and, for stored geocoding, permanent storage entitlement.", "MAP_PROVIDER_NOT_CONFIGURED", 503);
        if (!Uri.TryCreate(config.ApiBaseUrl, UriKind.Absolute, out var root) || root.AbsolutePath != "/" ||
            !string.IsNullOrEmpty(root.UserInfo) || !string.IsNullOrEmpty(root.Query) || !string.IsNullOrEmpty(root.Fragment) ||
            !(root.Scheme == "https" && root.Host == "api.mapbox.com" || root.IsLoopback && root.Scheme is "http" or "https"))
            throw Error("Mapbox requires its official HTTPS host or a local test fixture.", "MAP_PROVIDER_NOT_CONFIGURED", 503);
        return new Uri(root, relative + "&access_token=" + Uri.EscapeDataString(config.AccessToken));
    }

    private async Task<JsonDocument> GetAsync(string relative, CancellationToken ct)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(15));
        using var request = new HttpRequestMessage(HttpMethod.Get, Endpoint(relative, relative.StartsWith("search/geocode/", StringComparison.Ordinal)));
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                throw Error("Mapbox quota exceeded; retry later.", "MAP_PROVIDER_RATE_LIMITED", 429);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw Error("Check the Mapbox token and account permissions.", "MAP_PROVIDER_AUTH_FAILED", 503);
            if (!response.IsSuccessStatusCode) throw Error("Mapbox is unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503);
            await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int read;
            while ((read = await stream.ReadAsync(chunk, deadline.Token)) > 0)
            {
                if (buffer.Length + read > 1024 * 1024) throw new JsonException();
                buffer.Write(chunk, 0, read);
            }
            return JsonDocument.Parse(buffer.ToArray());
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw Error("Mapbox timed out.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        // Never propagate provider bodies, request URIs or inner exceptions containing access_token.
        catch (Exception e) when (e is HttpRequestException or IOException or JsonException)
        { throw Error("Mapbox returned an unavailable or invalid response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }

    public async Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address, string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(address) || address.Length > 255 || address.Contains(';') ||
            Regex.Matches(address, @"[\p{L}\p{N}]+").Count > 20 || (countryCode is not { Length: 2 } || countryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Enter a supported country and address of at most 20 words without semicolons.", "INVALID_LOCATION");
        var language = countryCode == "VN" ? "&language=vi" : "&language=en";
        using var doc = await GetAsync($"search/geocode/v6/forward?q={Uri.EscapeDataString(address)}&country={countryCode.ToLowerInvariant()}{language}&limit=5&autocomplete=false&permanent=true", ct);
        return Parse<IReadOnlyList<GeocodeCandidate>>(() =>
        {
            var attribution = doc.RootElement.TryGetProperty("attribution", out var a) ? a.GetString() : null;
            var candidates = new List<GeocodeCandidate>();
            foreach (var feature in doc.RootElement.GetProperty("features").EnumerateArray().Take(5))
            {
                var properties = feature.GetProperty("properties");
                var country = Country(properties);
                if (country != countryCode) continue;
                var coords = feature.GetProperty("geometry").GetProperty("coordinates");
                var point = new MapPoint(coords[0].GetDouble(), coords[1].GetDouble(), country);
                ValidatePoint(point);
                var label = properties.TryGetProperty("full_address", out var full) ? full.GetString() : null;
                label ??= string.Join(", ", new[] { properties.GetProperty("name").GetString(),
                    properties.TryGetProperty("place_formatted", out var place) ? place.GetString() : null }.Where(x => !string.IsNullOrWhiteSpace(x)));
                if (string.IsNullOrWhiteSpace(label)) throw new JsonException();
                candidates.Add(new(label, point, true, attribution ?? options.Mapbox.Attribution, "MAPBOX"));
            }
            return candidates;
        });
    }

    public async Task VerifyAsync(MapPoint point, CancellationToken ct)
    {
        ValidatePoint(point);
        // No client country filter: determine the country from the actual coordinates.
        using var doc = await GetAsync($"search/geocode/v6/reverse?longitude={F(point.Longitude)}&latitude={F(point.Latitude)}&types=country&limit=1&permanent=true", ct);
        var country = Parse(() => {
            var features = doc.RootElement.GetProperty("features");
            return features.GetArrayLength() == 0 ? null : Country(features[0].GetProperty("properties"));
        });
        if (country != point.CountryCode) throw Error("Coordinates do not match the selected country.", "COUNTRY_MISMATCH");
    }

    public async Task<byte[]> PreviewAsync(MapPoint point, CancellationToken ct)
    {
        ValidatePoint(point);
        var coords = F(point.Longitude) + "," + F(point.Latitude);
        var uri = Endpoint($"styles/v1/mapbox/streets-v12/static/pin-s+156b59({coords})/{coords},9/600x300?logo=true&attribution=true");
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(15));
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            if (response.StatusCode == HttpStatusCode.TooManyRequests) throw Error("Mapbox quota exceeded.", "MAP_PROVIDER_RATE_LIMITED", 429);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw Error("Check Mapbox token permissions for Static Images.", "MAP_PROVIDER_AUTH_FAILED", 503);
            if (!response.IsSuccessStatusCode || response.Content.Headers.ContentType?.MediaType != "image/png")
                throw Error("Mapbox map preview is unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503);
            await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
            using var buffer = new MemoryStream();
            var chunk = new byte[8192]; int read;
            while ((read = await stream.ReadAsync(chunk, deadline.Token)) > 0)
            {
                if (buffer.Length + read > 4 * 1024 * 1024) throw new IOException();
                buffer.Write(chunk, 0, read);
            }
            var bytes = buffer.ToArray();
            if (!bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
                throw new IOException();
            return bytes;
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw Error("Mapbox timed out.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        catch (Exception e) when (e is HttpRequestException or IOException)
        { throw Error("Mapbox map preview is unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }

    public async Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query, CancellationToken ct = default)
    {
        if (query.Points.Count != 2 || query.Profile != "driving") throw Error("Invalid routing input.", "INVALID_LOCATION");
        foreach (var point in query.Points) ValidatePoint(point);
        var coordinates = string.Join(";", query.Points.Select(p => F(p.Longitude) + "," + F(p.Latitude)));
        using var doc = await GetAsync($"directions/v5/mapbox/driving/{coordinates}?overview=false&steps=false&alternatives=false", ct);
        return Parse(() =>
        {
            var code = doc.RootElement.GetProperty("code").GetString();
            if (code is "NoRoute" or "NoSegment") throw Error("No road route found.", "ROUTE_NOT_FOUND");
            if (code != "Ok") throw new JsonException();
            var route = doc.RootElement.GetProperty("routes")[0];
            var distance = route.GetProperty("distance").GetDecimal();
            var duration = route.GetProperty("duration").GetDecimal();
            if (distance is <= 0 or > 10_000_000 || duration <= 0) throw new JsonException();
            return new RoadRouteResult("MAPBOX", distance, duration, clock.GetUtcNow(),
                // Mapbox Product Terms 2026-07 section 2.10.1: no stored Navigation API results.
                // Display-only callers may use this result; Customer submit rejects MayPersist=false.
                Application.Common.Flow1.Flow1Hash.Of(query), false, options.Mapbox.Attribution);
        });
    }
    private static string? Country(JsonElement properties) =>
        properties.GetProperty("context").GetProperty("country").GetProperty("country_code").GetString()?.ToUpperInvariant();
    private static T Parse<T>(Func<T> parse)
    {
        try { return parse(); }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or
            IndexOutOfRangeException or FormatException or OverflowException)
        { throw Error("Mapbox returned an invalid response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }
    private static string F(double value) => value.ToString("0.######", CultureInfo.InvariantCulture);
    private static void ValidatePoint(MapPoint point)
    {
        if (!double.IsFinite(point.Latitude) || !double.IsFinite(point.Longitude) || point.Latitude is < -90 or > 90 ||
            point.Longitude is < -180 or > 180 || (point.CountryCode is not { Length: 2 } || point.CountryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Invalid coordinates.", "INVALID_LOCATION");
    }
}
