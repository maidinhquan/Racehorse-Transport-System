using System.Net;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WebApi.Extensions;
using Xunit;

namespace Flow1.Tests;

public sealed class GeoapifyTransportMapsTests
{
    private const string Key = "geoapify_fixture_not_a_real_key";
    private const string Locations = """{"results":[{"formatted":"Ho Chi Minh City","lat":10.8,"lon":106.6,"country_code":"vn"}]}""";
    private const string Route = """{"features":[{"properties":{"distance":300000,"time":18000,"distance_units":"meters","time_units":"seconds"}}]}""";
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(reply(request));
    }
    private static Flow1MapOptions Options() => new() { Provider = "MAPBOX", DataProvider = "GEOAPIFY", MayPersistResults = true,
        Geoapify = new() { ApiKey = Key }, Mapbox = new() { PermanentGeocodingEnabled = false } };
    private static GeoapifyTransportMaps Maps(string body, HttpStatusCode status = HttpStatusCode.OK, Flow1MapOptions? options = null) =>
        new(new(new Handler(_ => new(status) { Content = new StringContent(body) })), options ?? Options(), new(), new FlowClock());
    private static RoadRouteQuery Road() => new([new(106.6, 10.8, "VN"), new(107.5, 11.5, "VN")]);

    [Theory]
    [InlineData("VN", "vi")]
    [InlineData("JP", "ja")]
    public async Task Search_encodes_query_filters_country_and_keeps_data_source_distinct_from_map(string country, string language)
    {
        var maps = new GeoapifyTransportMaps(new(new Handler(request => {
            Assert.Equal("api.geoapify.com", request.RequestUri!.Host);
            Assert.Equal("/v1/geocode/search", request.RequestUri.AbsolutePath);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("Địa chỉ & filter=countrycode:th", query["text"]);
            Assert.Equal("countrycode:" + country.ToLowerInvariant(), query["filter"]); Assert.Equal(language, query["lang"]);
            Assert.Equal("json", query["format"]); Assert.Equal(Key, query["apiKey"]);
            Assert.False(query.ContainsKey("permanent"));
            return new(HttpStatusCode.OK) { Content = new StringContent(Locations.Replace("\"vn\"", "\"" + country.ToLowerInvariant() + "\"")) };
        })), Options(), new(), new FlowClock());
        var candidate = Assert.Single(await maps.SearchAsync("Địa chỉ & filter=countrycode:th", country));
        Assert.True(candidate.MayPersist); Assert.Equal("GEOAPIFY", candidate.Provider); Assert.Equal("MAPBOX", candidate.PreviewProvider);
        Assert.Equal(country, candidate.Point.CountryCode); Assert.Equal(106.6, candidate.Point.Longitude);
        Assert.Contains("Geoapify", candidate.Attribution); Assert.Contains("OpenStreetMap", candidate.Attribution);
        Assert.DoesNotContain(Key, candidate.ToString());
    }
    [Fact]
    public async Task Reverse_verifies_actual_country_without_client_country_filter()
    {
        var maps = new GeoapifyTransportMaps(new(new Handler(request => {
            var q = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri!.Query);
            Assert.Equal("/v1/geocode/reverse", request.RequestUri.AbsolutePath);
            Assert.Equal("10.8", q["lat"]); Assert.Equal("106.6", q["lon"]); Assert.Equal("country", q["type"]);
            Assert.False(q.ContainsKey("filter")); Assert.False(q.ContainsKey("countrycodes"));
            return new(HttpStatusCode.OK) { Content = new StringContent(Locations) };
        })), Options(), new(), new FlowClock());
        await maps.VerifyAsync(Road().Points[0], default);
        Assert.Equal("COUNTRY_MISMATCH", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps(Locations.Replace("\"vn\"", "\"th\"")).VerifyAsync(Road().Points[0], default))).ErrorCode);
        Assert.Equal("COUNTRY_MISMATCH", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("""{"results":[]}""").VerifyAsync(Road().Points[0], default))).ErrorCode);
    }
    [Fact]
    public async Task Route_uses_lat_lon_metric_units_and_is_persistable_without_Mapbox_permanent()
    {
        var maps = new GeoapifyTransportMaps(new(new Handler(request => {
            Assert.Equal("/v1/routing", request.RequestUri!.AbsolutePath);
            var q = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("10.8,106.6|11.5,107.5", q["waypoints"]); Assert.Equal("drive", q["mode"]);
            Assert.Equal("metric", q["units"]); Assert.Equal("geojson", q["format"]);
            return new(HttpStatusCode.OK) { Content = new StringContent(Route) };
        })), Options(), new(), new FlowClock());
        var route = await maps.CalculateAsync(Road());
        Assert.Equal("GEOAPIFY", route.Provider); Assert.Equal(300000, route.DistanceMeters); Assert.Equal(18000, route.DurationSeconds);
        Assert.True(route.MayPersist); Assert.DoesNotContain(Key, route.ToString());
        Assert.Equal("UNSUPPORTED_ROUTE", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            maps.CalculateAsync(new([Road().Points[0], new(139.7, 35.6, "JP")])))).ErrorCode);
    }
    [Theory]
    [InlineData("miles")]
    [InlineData("kilometers")]
    public async Task Non_metric_route_response_is_rejected_instead_of_mispriced(string unit) =>
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps(Route.Replace("meters", unit)).CalculateAsync(Road()))).ErrorCode);
    [Theory]
    [InlineData("not-json")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"results\":[{\"country_code\":\"vn\",\"lat\":10,\"lon\":106}]}")]
    public async Task Malformed_responses_are_sanitized(string body) =>
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(body).SearchAsync("HCM", "VN"))).ErrorCode);
    [Theory]
    [InlineData(401, "MAP_PROVIDER_AUTH_FAILED")]
    [InlineData(403, "MAP_PROVIDER_AUTH_FAILED")]
    [InlineData(429, "MAP_PROVIDER_RATE_LIMITED")]
    [InlineData(500, "MAP_PROVIDER_UNAVAILABLE")]
    public async Task Provider_errors_never_expose_raw_body_or_key(int status, string code)
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Maps("echo apiKey=" + Key, (HttpStatusCode)status).SearchAsync("HCM", "VN"));
        Assert.Equal(code, error.ErrorCode); Assert.DoesNotContain(Key, error.ToString());
    }
    [Theory]
    [InlineData("key")]
    [InlineData("permission")]
    [InlineData("host")]
    [InlineData("query")]
    public async Task Invalid_configuration_fails_before_network(string missing)
    {
        var options = Options();
        if (missing == "key") options.Geoapify.ApiKey = "";
        if (missing == "permission") options.MayPersistResults = false;
        if (missing == "host") options.Geoapify.ApiBaseUrl = "https://attacker.invalid/";
        if (missing == "query") options.Geoapify.ApiBaseUrl = "https://api.geoapify.com/?apiKey=leak";
        var called = false;
        var maps = new GeoapifyTransportMaps(new(new Handler(_ => { called = true; throw new InvalidOperationException(); })), options, new(), new FlowClock());
        Assert.Equal("MAP_PROVIDER_NOT_CONFIGURED", (await Assert.ThrowsAsync<BusinessRuleException>(() => maps.SearchAsync("HCM", "VN"))).ErrorCode);
        Assert.False(called);
    }
    [Fact]
    public async Task No_route_and_empty_search_are_not_zero_km_success()
    {
        Assert.Empty(await Maps("""{"results":[]}""").SearchAsync("HCM", "VN"));
        Assert.Equal("ROUTE_NOT_FOUND", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps("""{"features":[]}""").CalculateAsync(Road()))).ErrorCode);
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(Route.Replace("300000", "0")).CalculateAsync(Road()))).ErrorCode);
    }
    [Fact]
    public async Task Oversized_body_and_network_exception_with_query_key_are_sanitized()
    {
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps(new string('x', 1024 * 1024 + 1)).SearchAsync("HCM", "VN"))).ErrorCode);
        var maps = new GeoapifyTransportMaps(new(new Handler(_ => throw new HttpRequestException("https://api.geoapify.com/?apiKey=" + Key))), Options(), new(), new FlowClock());
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => maps.SearchAsync("HCM", "VN"));
        Assert.DoesNotContain(Key, error.ToString());
    }
    [Fact]
    public async Task Hybrid_DI_never_resolves_Mapbox_for_stored_data_and_does_not_log_Geoapify_key()
    {
        var logs = new Capture(); var services = new ServiceCollection();
        services.AddLogging(b => b.SetMinimumLevel(LogLevel.Trace).AddProvider(logs)); services.AddSingleton<TimeProvider, FlowClock>();
        services.AddFlow1Providers(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Flow1:Maps:Provider"] = "MAPBOX", ["Flow1:Maps:DataProvider"] = "GEOAPIFY",
            ["Flow1:Maps:MayPersistResults"] = "true", ["Flow1:Maps:Geoapify:ApiKey"] = Key }).Build(), new TestHost());
        services.AddHttpClient<GeoapifyTransportMaps>().ConfigurePrimaryHttpMessageHandler(() => new Handler(_ =>
            new(HttpStatusCode.OK) { Content = new StringContent(Locations) }));
        using var root = services.BuildServiceProvider(); using var scope = root.CreateScope();
        Assert.IsType<GeoapifyTransportMaps>(scope.ServiceProvider.GetRequiredService<IFlow1RoadRoutingProvider>());
        Assert.IsType<GeoapifyTransportMaps>(scope.ServiceProvider.GetRequiredService<IFlow1LocationVerifier>());
        var geocoder = scope.ServiceProvider.GetRequiredService<IFlow1GeocodingProvider>(); Assert.IsType<GeoapifyTransportMaps>(geocoder);
        Assert.Single(await geocoder.SearchAsync("HCM", "VN"));
        Assert.DoesNotContain(Key, string.Join("\n", logs.Messages));
    }
    [Fact]
    public async Task One_horse_per_vehicle_policy_and_air_location_attribution_are_preserved()
    {
        var maps = Maps(Locations);
        // Road calculation checked separately so this fixture only needs reverse responses here.
        var road = Flow1PricingPolicy.Calculate(new(new("HCM", 10.8, 106.6, "VN"), new("Da Lat", 11.5, 107.5, "VN"), "ROAD", 5,
            new(2026, 11, 20)), 1, new("GEOAPIFY", 300000, 18000, new FlowClock().GetUtcNow(), "test", true, "test"), new FlowClock());
        Assert.Equal(5, road.Customer.VehicleCount);
        // Different country response for each reverse lookup, including Japan (no road call).
        var locations = new GeoapifyTransportMaps(new(new Handler(request => new(HttpStatusCode.OK) { Content = new StringContent(
            request.RequestUri!.Query.Contains("lat=35.6") ? Locations.Replace("\"vn\"", "\"jp\"") : Locations) })), Options(), new(), new FlowClock());
        var air = await new TransportEstimateService(maps, locations, new() { StandardVehicleCapacityStalls = 1 }, new FlowClock()).CalculateAsync(
            new(new("HCM", 10.8, 106.6, "VN"), new("Tokyo", 35.6, 139.7, "JP"), "AIR", 1, new(2026, 11, 20)), default);
        Assert.Contains("Geoapify", air.Customer.LocationAttribution); Assert.Null(air.Route); Assert.Equal(7, air.Customer.MinimumPreparationDays);
    }
    private sealed class TestHost : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Flow1.Tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
    private sealed class Capture : ILoggerProvider
    {
        public List<string> Messages { get; } = [];
        public ILogger CreateLogger(string categoryName) => new Logger(Messages);
        public void Dispose() { }
        private sealed class Logger(List<string> messages) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel level) => true;
            public void Log<TState>(LogLevel level, EventId id, TState state, Exception? error, Func<TState, Exception?, string> formatter)
            { lock (messages) messages.Add(formatter(state, error)); }
        }
    }
}
