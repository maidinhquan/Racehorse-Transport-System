using System.Net;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.Interfaces.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WebApi.Extensions;
using Xunit;

namespace Flow1.Tests;

public sealed class MapboxTransportMapsTests
{
    private const string Token = "pk.fixture_not_a_real_mapbox_token";
    private const string Feature = """{"type":"FeatureCollection","attribution":"Mapbox fixture attribution","features":[{"geometry":{"type":"Point","coordinates":[106.6,10.8]},"properties":{"full_address":"Ho Chi Minh City","context":{"country":{"country_code":"VN"}}}}]}""";
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(reply(request));
    }
    private static Flow1MapOptions Options() => new() { MayPersistResults = true, Mapbox = new() {
        AccessToken = Token, PermanentGeocodingEnabled = true } };
    private static MapboxTransportMaps Maps(string body, HttpStatusCode status = HttpStatusCode.OK, Flow1MapOptions? options = null) =>
        new(new HttpClient(new Handler(_ => new(status) { Content = new StringContent(body) })), options ?? Options(), new FlowClock());
    private static RoadRouteQuery Road() => new([new(106.6, 10.8, "VN"), new(107.5, 11.5, "VN")]);

    [Fact]
    public async Task Static_map_uses_backend_token_and_keeps_attribution_and_logo()
    {
        var maps = new MapboxTransportMaps(new(new Handler(request => {
            Assert.StartsWith("/styles/v1/mapbox/streets-v12/static/pin-s+156b59(106.6,10.8)/106.6,10.8,9/600x300", request.RequestUri!.AbsolutePath);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("true", query["logo"]); Assert.Equal("true", query["attribution"]);
            Assert.Equal(Token, query["access_token"]);
            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(CustomerTransportTests.Png) };
            response.Content.Headers.ContentType = new("image/png");
            return response;
        })), Options(), new FlowClock());
        Assert.Equal(CustomerTransportTests.Png, await maps.PreviewAsync(Road().Points[0], default));
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Maps("bad image " + Token).PreviewAsync(Road().Points[0], default));
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", error.ErrorCode); Assert.DoesNotContain(Token, error.ToString());
    }
    [Fact]
    public async Task Japan_forward_uses_Japanese_language_and_country_filter()
    {
        var maps = new MapboxTransportMaps(new(new Handler(request => {
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri!.Query);
            Assert.Equal("jp", query["country"]); Assert.Equal("ja", query["language"]);
            return new(HttpStatusCode.OK) { Content = new StringContent(Feature.Replace("\"VN\"", "\"JP\"")) };
        })), Options(), new FlowClock());
        Assert.Equal("JP", Assert.Single(await maps.SearchAsync("Tokyo", "JP")).Point.CountryCode);
    }
    [Theory]
    [InlineData("OSM")]
    [InlineData("UNKNOWN")]
    public void Provider_selector_preserves_explicit_OSM_and_rejects_unknown_values(string choice)
    {
        var services = new ServiceCollection(); services.AddLogging(); services.AddSingleton<TimeProvider, FlowClock>();
        services.AddFlow1Customer(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Flow1:Maps:Provider"] = choice }).Build(), new TestHost());
        using var provider = services.BuildServiceProvider(); using var scope = provider.CreateScope();
        if (choice == "OSM") Assert.IsType<OsmTransportMaps>(scope.ServiceProvider.GetRequiredService<IFlow1RoadRoutingProvider>());
        else Assert.Throws<InvalidOperationException>(() => scope.ServiceProvider.GetRequiredService<IFlow1RoadRoutingProvider>());
    }
    [Fact]
    public async Task Forward_uses_v6_permanent_explicit_search_and_keeps_token_out_of_result()
    {
        var maps = new MapboxTransportMaps(new(new Handler(request => {
            Assert.Equal("api.mapbox.com", request.RequestUri!.Host);
            Assert.Equal("/search/geocode/v6/forward", request.RequestUri.AbsolutePath);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("true", query["permanent"]); Assert.Equal("false", query["autocomplete"]);
            Assert.Equal("vn", query["country"]); Assert.Equal(Token, query["access_token"]);
            Assert.Equal("Địa chỉ & country=th", query["q"]);
            return new(HttpStatusCode.OK) { Content = new StringContent(Feature) };
        })), Options(), new FlowClock());
        var candidate = Assert.Single(await maps.SearchAsync("Địa chỉ & country=th", "VN"));
        Assert.Equal("Ho Chi Minh City", candidate.Label); Assert.Equal(106.6, candidate.Point.Longitude);
        Assert.Equal("VN", candidate.Point.CountryCode); Assert.True(candidate.MayPersist);
        Assert.Equal("Mapbox fixture attribution", candidate.Attribution);
        Assert.DoesNotContain(Token, candidate.ToString());
    }
    [Theory]
    [InlineData("VN", "VN")]
    [InlineData("JP", "JP")]
    public async Task Reverse_country_verification_reads_provider_context_without_client_country_filter(string country, string expected)
    {
        var maps = new MapboxTransportMaps(new(new Handler(request => {
            Assert.Equal("/search/geocode/v6/reverse", request.RequestUri!.AbsolutePath);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.False(query.ContainsKey("country")); Assert.Equal("country", query["types"]);
            Assert.Equal("true", query["permanent"]);
            return new(HttpStatusCode.OK) { Content = new StringContent(Feature.Replace("\"VN\"", "\"" + country + "\"")) };
        })), Options(), new FlowClock());
        await maps.VerifyAsync(new(106.6, 10.8, expected), default);
        Assert.Equal("COUNTRY_MISMATCH", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps(Feature.Replace("\"VN\"", "\"TH\"")).VerifyAsync(new(106.6, 10.8, "VN"), default))).ErrorCode);
    }
    [Fact]
    public async Task Directions_preserves_meters_seconds_and_never_routes_air_over_the_ocean()
    {
        var maps = Maps("""{"code":"Ok","routes":[{"distance":300000,"duration":18000}]}""");
        var route = await maps.CalculateAsync(Road());
        Assert.Equal("MAPBOX", route.Provider); Assert.Equal(300000, route.DistanceMeters); Assert.Equal(18000, route.DurationSeconds);
        Assert.False(route.MayPersist); Assert.DoesNotContain(Token, route.ToString());
        Assert.Equal("UNSUPPORTED_ROUTE", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            maps.CalculateAsync(new([Road().Points[0], new(139.7, 35.6, "JP")])))).ErrorCode);
        Assert.Equal("ROUTE_NOT_FOUND", (await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Maps("""{"code":"NoRoute"}""").CalculateAsync(Road()))).ErrorCode);
    }
    [Theory]
    [InlineData(false, true, true)]
    [InlineData(true, false, true)]
    [InlineData(true, true, false)]
    public async Task Token_and_both_storage_confirmations_are_required_before_any_network_call(bool token, bool persist, bool permanent)
    {
        var called = false;
        var options = Options(); options.MayPersistResults = persist;
        options.Mapbox.PermanentGeocodingEnabled = permanent; options.Mapbox.AccessToken = token ? Token : "";
        var maps = new MapboxTransportMaps(new(new Handler(_ => { called = true; throw new InvalidOperationException(); })), options, new FlowClock());
        Assert.Equal("MAP_PROVIDER_NOT_CONFIGURED", (await Assert.ThrowsAsync<BusinessRuleException>(() => maps.SearchAsync("Hồ Chí Minh", "VN"))).ErrorCode);
        Assert.False(called);
    }
    [Fact]
    public async Task Map_preview_and_display_only_directions_do_not_require_permanent_geocoding()
    {
        var options = Options(); options.MayPersistResults = false; options.Mapbox.PermanentGeocodingEnabled = false;
        Assert.False((await Maps("""{"code":"Ok","routes":[{"distance":1000,"duration":120}]}""", options: options).CalculateAsync(Road())).MayPersist);
        var maps = new MapboxTransportMaps(new(new Handler(_ => {
            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(CustomerTransportTests.Png) };
            response.Content.Headers.ContentType = new("image/png"); return response;
        })), options, new FlowClock());
        Assert.Equal(CustomerTransportTests.Png, await maps.PreviewAsync(Road().Points[0], default));
    }
    [Theory]
    [InlineData(401, "MAP_PROVIDER_AUTH_FAILED")]
    [InlineData(403, "MAP_PROVIDER_AUTH_FAILED")]
    [InlineData(429, "MAP_PROVIDER_RATE_LIMITED")]
    [InlineData(500, "MAP_PROVIDER_UNAVAILABLE")]
    public async Task Provider_errors_are_safe_and_do_not_expose_echoed_tokens(int status, string code)
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Maps("echoed access_token=" + Token, (HttpStatusCode)status).SearchAsync("Hồ Chí Minh", "VN"));
        Assert.Equal(code, error.ErrorCode); Assert.DoesNotContain(Token, error.ToString());
    }
    [Theory]
    [InlineData("not-json")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"features\":{}}")]
    public async Task Invalid_geocoding_response_returns_provider_error(string body) =>
        Assert.Equal("MAP_PROVIDER_UNAVAILABLE", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(body).SearchAsync("Hồ Chí Minh", "VN"))).ErrorCode);
    [Fact]
    public async Task Network_exception_with_request_uri_is_sanitized_and_redirect_host_is_not_configurable()
    {
        var maps = new MapboxTransportMaps(new(new Handler(_ => throw new HttpRequestException("https://api.mapbox.com/?access_token=" + Token))), Options(), new FlowClock());
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => maps.SearchAsync("Hồ Chí Minh", "VN"));
        Assert.DoesNotContain(Token, error.ToString());
        var options = Options(); options.Mapbox.ApiBaseUrl = "https://attacker.invalid/";
        Assert.Equal("MAP_PROVIDER_NOT_CONFIGURED", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(Feature, options: options).SearchAsync("Hồ Chí Minh", "VN"))).ErrorCode);
    }
    [Fact]
    public async Task DI_selects_Mapbox_and_http_factory_never_logs_token_query_strings()
    {
        var logs = new CapturedLogs();
        var services = new ServiceCollection(); services.AddLogging(b => b.SetMinimumLevel(LogLevel.Trace).AddProvider(logs));
        services.AddSingleton<TimeProvider, FlowClock>();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Flow1:Maps:Provider"] = "MAPBOX", ["Flow1:Maps:MayPersistResults"] = "true",
            ["Flow1:Maps:Mapbox:AccessToken"] = Token, ["Flow1:Maps:Mapbox:PermanentGeocodingEnabled"] = "true" }).Build();
        services.AddFlow1Customer(config, new TestHost());
        services.AddHttpClient<MapboxTransportMaps>().ConfigurePrimaryHttpMessageHandler(() => new Handler(_ =>
            new(HttpStatusCode.OK) { Content = new StringContent(Feature) }));
        using var provider = services.BuildServiceProvider(); using var scope = provider.CreateScope();
        var geocoding = scope.ServiceProvider.GetRequiredService<IFlow1GeocodingProvider>();
        Assert.IsType<MapboxTransportMaps>(geocoding);
        Assert.IsType<MapboxTransportMaps>(scope.ServiceProvider.GetRequiredService<IFlow1RoadRoutingProvider>());
        Assert.IsType<MapboxTransportMaps>(scope.ServiceProvider.GetRequiredService<IFlow1LocationVerifier>());
        Assert.Single(await geocoding.SearchAsync("Hồ Chí Minh", "VN"));
        Assert.DoesNotContain(Token, string.Join("\n", logs.Messages));
    }
    private sealed class TestHost : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Flow1.Tests";
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
    private sealed class CapturedLogs : ILoggerProvider
    {
        public readonly List<string> Messages = [];
        public ILogger CreateLogger(string categoryName) => new Capture(Messages);
        public void Dispose() { }
        private sealed class Capture(List<string> messages) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel level) => true;
            public void Log<TState>(LogLevel level, EventId id, TState state, Exception? error, Func<TState, Exception?, string> formatter)
            { lock (messages) messages.Add(formatter(state, error)); }
        }
    }
}
