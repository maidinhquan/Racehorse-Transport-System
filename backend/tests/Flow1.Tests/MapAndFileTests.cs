using System.Net;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Xunit;

namespace Flow1.Tests;

public sealed class MapAndFileTests
{
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(reply(request));
    }
    private static OsmTransportMaps Maps(string body, HttpStatusCode status = HttpStatusCode.OK, Flow1MapOptions? options = null) =>
        new(new HttpClient(new Handler(_ => new(status) { Content = new StringContent(body) })), options ?? new() {
            RoutingBaseUrl = "https://routing.example.invalid/", GeocodingBaseUrl = "https://geocode.example.invalid/",
            UserAgent = "RaceHorse-Tests/1.0", MayPersistResults = true }, new(), new FlowClock());
    private static RoadRouteQuery Road() => new([new(106.6, 10.8, "VN"), new(107.5, 11.5, "VN")]);
    [Fact]
    public async Task OSRM_keeps_provider_units_and_rejects_invalid_country_code_format()
    {
        var maps = Maps("""{"code":"Ok","routes":[{"distance":300000,"duration":18000}]}""");
        var result = await maps.CalculateAsync(Road());
        Assert.Equal(300000, result.DistanceMeters); Assert.Equal(18000, result.DurationSeconds);
        Assert.True(result.MayPersist); Assert.Equal("OSRM", result.Provider);
        Assert.Equal("INVALID_LOCATION", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            maps.CalculateAsync(new([Road().Points[0], new(139.7, 35.6, "JPN")])))).ErrorCode);
    }
    [Fact]
    public async Task Quota_no_route_and_malformed_provider_responses_never_become_zero_km()
    {
        Assert.Equal("MAP_PROVIDER_RATE_LIMITED", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("{}", HttpStatusCode.TooManyRequests).CalculateAsync(Road()))).ErrorCode);
        Assert.Equal("ROUTE_NOT_FOUND", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("""{"code":"NoRoute"}""").CalculateAsync(Road()))).ErrorCode);
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("""{"code":"Ok","routes":[]}""").CalculateAsync(Road()))).ErrorCode);
    }
    [Fact]
    public async Task Country_is_verified_from_provider_not_only_from_client_text()
    {
        var maps = Maps("""{"address":{"country_code":"th"}}""");
        Assert.Equal("COUNTRY_MISMATCH", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            maps.VerifyAsync(Road().Points[0], default))).ErrorCode);
        Assert.Equal("MAP_PROVIDER_NOT_CONFIGURED", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("{}", options: new()).VerifyAsync(Road().Points[0], default))).ErrorCode);
    }
    [Fact]
    public async Task Search_is_explicit_and_sends_only_configured_host_with_encoded_query()
    {
        Uri? called = null;
        var client = new HttpClient(new Handler(request => {
            called = request.RequestUri;
            Assert.Contains("RaceHorse-Tests", request.Headers.UserAgent.ToString());
            return new(HttpStatusCode.OK) { Content = new StringContent("""[{"display_name":"Hồ Chí Minh","lat":"10.8","lon":"106.6","address":{"country_code":"vn"}}]""") };
        }));
        var maps = new OsmTransportMaps(client, new() { GeocodingBaseUrl = "https://configured.example.invalid/", UserAgent = "RaceHorse-Tests/1.0", MayPersistResults = true }, new(), new FlowClock());
        var result = await maps.SearchAsync("https://attacker.invalid/?q=1&countrycodes=th", "VN");
        Assert.Equal("configured.example.invalid", called!.Host);
        Assert.Contains("countrycodes=vn", called.Query); Assert.Single(result);
        Assert.Equal("VN", result[0].Point.CountryCode);
    }
    [Fact]
    public async Task Immutable_private_files_check_signatures_size_and_hash_on_every_read()
    {
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFiles-" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new LocalFlow1PrivateFileStore(root);
            var file = await store.PutAsync(new(CustomerTransportTests.Png, "horse.png"), true, default);
            Assert.Equal(CustomerTransportTests.Png, await store.ReadAsync(file, default));
            Assert.Equal(file, await store.PutAsync(new(CustomerTransportTests.Png, "again.png"), true, default));
            await Assert.ThrowsAsync<BusinessRuleException>(() => store.PutAsync(new(new byte[40], "horse.png"), true, default));
            await Assert.ThrowsAsync<BusinessRuleException>(() => store.PutAsync(new(new byte[LocalFlow1PrivateFileStore.MaxBytes + 1], "huge.pdf"), false, default));
            await Assert.ThrowsAsync<InvalidDataException>(() => store.ReadAsync(file with { FileId = "../escape" }, default));
            var bytes = CustomerTransportTests.Png; bytes[20] ^= 1;
            await File.WriteAllBytesAsync(Path.Combine(root, file.FileId + ".bin"), bytes);
            Assert.Equal("FILE_INTEGRITY_ERROR", (await Assert.ThrowsAsync<BusinessRuleException>(() => store.ReadAsync(file, default))).ErrorCode);
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }
}
