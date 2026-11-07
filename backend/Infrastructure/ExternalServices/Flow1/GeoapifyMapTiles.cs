using System.Net;
using Application.Flow1.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using static Application.Flow1.Rules.BusinessRules;

namespace Infrastructure.ExternalServices.Flow1;

public sealed partial class GeoapifyTransportMaps : IMapTiles
{
    public async Task<byte[]> TileAsync(int z, int x, int y, CancellationToken ct)
    {
        Require(z is >= 0 and <= 19 && x >= 0 && y >= 0 && x < (1 << z) && y < (1 << z),
            "VALIDATION_ERROR", "Invalid map tile coordinates.", 400);
        Require(!string.IsNullOrWhiteSpace(options.Geoapify.ApiKey), "MAP_PROVIDER_NOT_CONFIGURED", "Geoapify is not configured.", 503);
        var cacheKey = $"geoapify-tile:{z}:{x}:{y}";
        if (cityCache?.TryGetValue<byte[]>(cacheKey, out var cached) == true) return cached!;
        try
        {
            // The provider key stays on the server; factory URI logging is disabled for this client.
            using var response = await http.GetAsync($"https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={Uri.EscapeDataString(options.Geoapify.ApiKey)}", ct);
            Require(response.StatusCode != HttpStatusCode.TooManyRequests, "MAP_PROVIDER_RATE_LIMITED", "Map quota exceeded.", 429);
            Require(response.IsSuccessStatusCode, "MAP_PROVIDER_UNAVAILABLE", "Map background is unavailable.", 503);
            var bytes = await response.Content.ReadAsByteArrayAsync(ct);
            Require(response.Content.Headers.ContentType?.MediaType == "image/png" && bytes.Length is >= 8 and <= 1048576
                && bytes.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
                "MAP_PROVIDER_UNAVAILABLE", "Invalid map background response.", 503);
            if (options.MayPersistResults) cityCache?.Set(cacheKey, bytes, TimeSpan.FromHours(1));
            return bytes;
        }
        catch (Exception e) when (e is HttpRequestException or IOException || e is OperationCanceledException && !ct.IsCancellationRequested)
        {
            throw Failure("MAP_PROVIDER_UNAVAILABLE", "Map background is unavailable.", 503);
        }
    }
}
