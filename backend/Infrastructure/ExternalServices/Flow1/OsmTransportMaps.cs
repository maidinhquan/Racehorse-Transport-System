using System.Globalization;
using System.Net;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Application.Services.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// Singleton gate applies across all scoped clients in this process. A multi-process deployment
// needs a provider quota gateway or self-hosted service, not one public Nominatim quota per process.
public sealed class OsmRequestGate
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private DateTimeOffset last;
    public async Task<T> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            var wait = TimeSpan.FromSeconds(1) - (DateTimeOffset.UtcNow - last);
            if (wait > TimeSpan.Zero) await Task.Delay(wait, ct);
            last = DateTimeOffset.UtcNow;
            return await action();
        }
        finally { gate.Release(); }
    }
}

public sealed class OsmTransportMaps(HttpClient http, Flow1MapOptions options, OsmRequestGate gate, TimeProvider clock)
    : IRoadRouter, IGeocodingProvider, ILocationVerifier
{
    private Uri Endpoint(string? root, string relative)
    {
        if (!options.MayPersistResults || string.IsNullOrWhiteSpace(options.UserAgent) ||
            !Uri.TryCreate(root?.TrimEnd('/') + "/", UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && !(uri.Scheme == "http" && uri.IsLoopback)) ||
            !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
            throw Error("Configure map endpoints, identifying User-Agent and permission to persist results.", "MAP_PROVIDER_NOT_CONFIGURED", 503);
        return new Uri(uri, relative);
    }
    private async Task<JsonDocument> GetAsync(Uri uri, CancellationToken ct)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(15));
        var token = deadline.Token;
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Add("User-Agent", options.UserAgent);
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
                throw Error("Map provider quota exceeded.", "MAP_PROVIDER_RATE_LIMITED", 429);
            if (!response.IsSuccessStatusCode) throw Error("Map provider unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503);
            // Bound provider responses before parsing, even without a Content-Length header.
            await using var stream = await response.Content.ReadAsStreamAsync(token);
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int read;
            while ((read = await stream.ReadAsync(chunk, token)) > 0)
            {
                if (buffer.Length + read > 1024 * 1024) throw new JsonException("Oversized map response.");
                buffer.Write(chunk, 0, read);
            }
            return JsonDocument.Parse(buffer.ToArray());
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw Error("Map provider timed out.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        catch (HttpRequestException) { throw Error("Map provider unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        catch (IOException) { throw Error("Map provider unavailable.", "MAP_PROVIDER_UNAVAILABLE", 503); }
        catch (JsonException) { throw Error("Invalid map provider response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }
    public async Task VerifyAsync(MapPoint point, CancellationToken ct)
    {
        ValidatePoint(point);
        var query = $"reverse?format=jsonv2&addressdetails=1&zoom=3&lat={F(point.Latitude)}&lon={F(point.Longitude)}";
        var endpoint = Endpoint(options.GeocodingBaseUrl, query);
        using var doc = await gate.ExecuteAsync(() => GetAsync(endpoint, ct), ct);
        if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("address", out var address) ||
            address.ValueKind != JsonValueKind.Object ||
            !address.TryGetProperty("country_code", out var code) || code.GetString()?.ToUpperInvariant() != point.CountryCode)
            throw Error("Coordinates do not match the selected supported country.", "COUNTRY_MISMATCH");
    }
    public async Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address, string countryCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(address) || address.Length > 255 || (countryCode is not { Length: 2 } || countryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Enter an address and a two-letter uppercase country code.", "INVALID_LOCATION");
        var endpoint = Endpoint(options.GeocodingBaseUrl, $"search?format=jsonv2&addressdetails=1&limit=5&countrycodes={countryCode.ToLowerInvariant()}&q={Uri.EscapeDataString(address)}");
        using var doc = await gate.ExecuteAsync(() => GetAsync(endpoint, ct), ct);
        try
        {
            return doc.RootElement.EnumerateArray().Where(x => x.GetProperty("address").GetProperty("country_code").GetString()?.ToUpperInvariant() == countryCode)
                .Select(x => new GeocodeCandidate(x.GetProperty("display_name").GetString()!,
                    new(double.Parse(x.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture),
                        double.Parse(x.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture), countryCode),
                    true, options.Attribution)).ToArray();
        }
        catch (Exception e) when (e is KeyNotFoundException or InvalidOperationException or FormatException)
        { throw Error("Invalid geocoding response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }
    public async Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query, CancellationToken ct = default)
    {
        if (query.Points.Count != 2 || query.Profile != "driving") throw Error("Invalid routing input.", "INVALID_LOCATION");
        foreach (var p in query.Points) ValidatePoint(p);
        var coordinates = string.Join(";", query.Points.Select(p => F(p.Longitude) + "," + F(p.Latitude)));
        using var doc = await GetAsync(Endpoint(options.RoutingBaseUrl, $"route/v1/driving/{coordinates}?overview=false&steps=false&alternatives=false"), ct);
        try
        {
            if (doc.RootElement.GetProperty("code").GetString() != "Ok") throw Error("No road route found.", "ROUTE_NOT_FOUND");
            var route = doc.RootElement.GetProperty("routes")[0];
            var distance = route.GetProperty("distance").GetDecimal();
            var duration = route.GetProperty("duration").GetDecimal();
            if (distance is <= 0 or > 10_000_000 || duration <= 0) throw Error("No valid road route found.", "ROUTE_NOT_FOUND");
            return new("OSRM", distance, duration, clock.GetUtcNow(), Application.Common.Flow1.Flow1Hash.Of(query), true, options.Attribution);
        }
        catch (Exception e) when (e is KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException or FormatException)
        { throw Error("Invalid routing response.", "MAP_PROVIDER_UNAVAILABLE", 503); }
    }
    private static string F(double value) => value.ToString("0.######", CultureInfo.InvariantCulture);
    private static void ValidatePoint(MapPoint p)
    {
        if (!double.IsFinite(p.Latitude) || !double.IsFinite(p.Longitude) || p.Latitude is < -90 or > 90 ||
            p.Longitude is < -180 or > 180 || (p.CountryCode is not { Length: 2 } || p.CountryCode.Any(c => c is < 'A' or > 'Z')))
            throw Error("Invalid coordinates.", "INVALID_LOCATION");
    }
}
