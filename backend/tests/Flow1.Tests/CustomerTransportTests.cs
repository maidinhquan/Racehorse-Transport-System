using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.Data.Context;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace Flow1.Tests;

internal sealed class FlowClock : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);
}
internal sealed class TestTransportMaps : IFlow1RoadRoutingProvider, IFlow1LocationVerifier
{
    public bool MayPersist { get; set; } = true;
    public Task VerifyAsync(MapPoint p, CancellationToken ct) => Task.CompletedTask;
    public Task<RoadRouteResult> CalculateAsync(RoadRouteQuery q, CancellationToken ct = default) =>
        Task.FromResult(new RoadRouteResult("TEST_FIXTURE", 300_000m, 18_000m, new FlowClock().GetUtcNow(),
            CustomerTransportService.Hash(q), MayPersist, "TEST ONLY"));
}
internal sealed class CustomerTestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var owner = Request.Headers["X-Test-Owner"].ToString();
        if (owner.Length == 0) return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, owner), new Claim(ClaimTypes.Role,
            Request.Headers["X-Test-Role"].FirstOrDefault() ?? "CUSTOMER") };
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(
            new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name)));
    }
}
internal sealed class CustomerTestFactory(string connection, string root, bool failRequestPrepare = false,
    Action<IServiceCollection>? customize = null) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(s =>
        {
            s.RemoveAll<DbContextOptions<HorseTransportDbContext>>();
            s.RemoveAll<HorseTransportDbContext>();
            s.AddDbContext<HorseTransportDbContext>(o => o.UseSqlServer(connection));
            s.RemoveAll<TimeProvider>(); s.AddSingleton<TimeProvider, FlowClock>();
            s.AddSingleton(new Flow1EstimateOptions { StandardVehicleCapacityStalls = 2 });
            s.AddSingleton<IFlow1RoadRoutingProvider, TestTransportMaps>();
            s.AddSingleton<IFlow1LocationVerifier, TestTransportMaps>();
            s.AddSingleton<IFlow1MetadataStore>(sp => {
                var store = new LocalFlow1MetadataStore(Path.Combine(root, "metadata"), new(), sp.GetRequiredService<TimeProvider>());
                return failRequestPrepare ? new FailingPrepareStore(store) : store;
            });
            s.AddSingleton<IFlow1PrivateFileStore>(new LocalFlow1PrivateFileStore(Path.Combine(root, "bytes")));
            s.AddAuthentication(o => { o.DefaultAuthenticateScheme = "CustomerTest"; o.DefaultChallengeScheme = "CustomerTest"; o.DefaultForbidScheme = "CustomerTest"; })
                .AddScheme<AuthenticationSchemeOptions, CustomerTestAuth>("CustomerTest", _ => { });
            customize?.Invoke(s);
        });
    }
    public HttpClient Client(string? owner = "owner", string role = "CUSTOMER")
    {
        var client = CreateClient(new() { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
        if (owner is not null) client.DefaultRequestHeaders.Add("X-Test-Owner", owner);
        client.DefaultRequestHeaders.Add("X-Test-Role", role);
        return client;
    }
}

internal sealed class FailingPrepareStore(IFlow1MetadataStore inner) : IFlow1MetadataStore
{
    private bool failed;
    public Task<Flow1MetadataDocument?> ReadAsync(string type, string id, CancellationToken ct = default) => inner.ReadAsync(type, id, ct);
    public async Task<Flow1MetadataRevision> AppendAsync(string type, string id, int version, string operation, string actor,
        string action, JsonElement payload, CancellationToken ct = default)
    {
        var result = await inner.AppendAsync(type, id, version, operation, actor, action, payload, ct);
        if (type == "request" && !failed) { failed = true; throw new IOException("Injected crash after metadata prepare, before SQL commit."); }
        return result;
    }
}

public sealed class CustomerTransportTests
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static EstimateInput Trip(int count = 1) => new(new("Hồ Chí Minh", 10.8, 106.6, "VN"),
        new("Địa điểm nhận", 11.5, 107.5, "VN"), "ROAD", count, new(2026, 11, 20));
    internal static HorseInput Horse() => new("Demo", "123456789012345", "DEMO-PASSPORT", "Thoroughbred", "GELDING", 450, new(2020, 1, 1));
    internal static SubmitRequestInput Request(string horse, int version = 1) => new(Trip(), new(2026, 11, 25), "COMPETITION",
        new("Người giao", "0901234567"), new("Người nhận", "0907654321", true), [new(horse, version)]);
    internal static byte[] Png => Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=");
    internal static MultipartFormDataContent HorseBody(HorseInput? input = null, bool invalidPhoto = false)
    {
        var body = new MultipartFormDataContent();
        body.Add(new StringContent(JsonSerializer.Serialize(input ?? Horse(), Json)), "payload");
        var photo = new ByteArrayContent(invalidPhoto ? new byte[30] : Png);
        photo.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        body.Add(photo, "photo", "photo.png");
        body.Add(new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\nDemo passport test only\n%%EOF")), "passportScan", "passport.pdf");
        return body;
    }
    private static async Task<JsonElement> Data(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"Expected {expected}, got {response.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }
    private static async Task<HttpResponseMessage> Post(HttpClient c, string path, object body, string key)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/customer/" + path) {
            Content = body is HttpContent content ? content : JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key);
        return await c.SendAsync(request);
    }

    [Fact]
    public void Price_fixture_is_server_calculated_in_VND_with_vehicle_ceiling_and_private_costs()
    {
        var route = new RoadRouteResult("TEST", 300000, 100, new FlowClock().GetUtcNow(), "hash", true, "test");
        var result = Flow1PricingPolicy.Calculate(Trip(2), 2, route, new FlowClock());
        Assert.Equal(45_500_000, result.EstimatedCost);
        Assert.Equal(47_775_000, result.Floor);
        Assert.Equal(54_600_000, result.Customer.EstimatedPrice);
        Assert.Equal(21_840_000, result.Customer.EstimatedDeposit);
        Assert.Equal(2, Flow1PricingPolicy.Calculate(Trip(3), 2, route, new FlowClock()).Customer.VehicleCount);
        var json = JsonSerializer.Serialize(result.Customer, Json);
        Assert.DoesNotContain("estimatedCost", json); Assert.DoesNotContain("floor", json);
    }
    [Fact]
    public void Preparation_uses_Vietnam_day_and_exact_500km_boundary()
    {
        Assert.Equal(new DateOnly(2026, 10, 16), Flow1PricingPolicy.Today(new FlowClock()));
        var route = new RoadRouteResult("TEST", 500000, 100, new FlowClock().GetUtcNow(), "hash", true, "test");
        Assert.Equal(2, Flow1PricingPolicy.Calculate(Trip(), 2, route, new FlowClock()).Customer.MinimumPreparationDays);
        Assert.Equal(3, Flow1PricingPolicy.Calculate(Trip(), 2, route with { DistanceMeters = 500001 }, new FlowClock()).Customer.MinimumPreparationDays);
        Assert.Equal("INVALID_DEPARTURE_DATE", Assert.Throws<BusinessRuleException>(() => Flow1PricingPolicy.Calculate(
            Trip() with { DesiredDepartureDate = new(2026, 10, 17) }, 2, route, new FlowClock())).ErrorCode);
    }
    [Fact]
    public void Air_is_airport_only_and_missing_fleet_config_does_not_invent_a_capacity()
    {
        var air = Trip(2) with { Delivery = new("Tokyo", 35.6, 139.7, "JP"), PreferredTransportMode = "AIR" };
        var result = Flow1PricingPolicy.Calculate(air, null, null, new FlowClock());
        Assert.Equal(7, result.Customer.MinimumPreparationDays);
        Assert.Null(result.Customer.RoadDistanceKm);
        Assert.Contains("GROUND_LEGS_NOT_INCLUDED", result.Customer.Scope);
        Assert.Equal(210_000_000, result.Customer.EstimatedPrice);
        Assert.Equal("FLEET_CAPACITY_NOT_CONFIGURED", Assert.Throws<BusinessRuleException>(() =>
            Flow1PricingPolicy.Calculate(Trip(), null, null, new FlowClock())).ErrorCode);
        Assert.Equal("UNSUPPORTED_ROUTE", Assert.Throws<BusinessRuleException>(() => Flow1PricingPolicy.Route(
            Trip() with { Delivery = new("Thailand", 13, 100, "TH") })).ErrorCode);
    }

    [LocalSqlFact]
    public async Task Public_estimate_ignores_client_money_distance_and_is_rate_limited_without_SQL_writes()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root);
            using var guest = factory.Client(null);
            var trip = Trip(2);
            var calculated = await Data(await guest.PostAsJsonAsync("/api/public/estimates", new {
                trip.Pickup, trip.Delivery, trip.PreferredTransportMode, trip.HorseCount, trip.DesiredDepartureDate,
                distanceKm = 0, totalAmount = 1, depositPercent = 1, currencyCode = "USD" }));
            Assert.Equal("VND", calculated.GetProperty("currency").GetString());
            Assert.Equal(54_600_000, calculated.GetProperty("estimatedPrice").GetDecimal());
            Assert.Equal(21_840_000, calculated.GetProperty("estimatedDeposit").GetDecimal());
            Assert.False(calculated.TryGetProperty("floor", out _));
            Assert.False(calculated.TryGetProperty("estimatedCost", out _));
            Assert.Equal(HttpStatusCode.BadRequest, (await guest.PostAsJsonAsync("/api/public/estimates", trip with { DesiredDepartureDate = new(2026, 10, 16) })).StatusCode);
            HttpResponseMessage? throttled = null;
            for (var i = 0; i < 31; i++)
            {
                var response = await guest.GetAsync("/api/public/estimates/transport-modes");
                if (response.StatusCode == HttpStatusCode.TooManyRequests) { throttled = response; break; }
                response.Dispose();
            }
            Assert.NotNull(throttled);
            Assert.Equal("RATE_LIMITED", (await throttled.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errorCode").GetString());
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE;"));
            Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST;")); // baseline seed only
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }

    [LocalSqlFact]
    public async Task API_horse_upload_submit_reload_ownership_and_idempotency_use_real_SQL_and_files()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root);
            using var client = factory.Client();
            using var guest = factory.Client(null);
            using var wrongRole = factory.Client("owner", "LOGISTICS_MANAGER");
            Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync("/api/customer/requests")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await wrongRole.GetAsync("/api/customer/requests")).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "horses", HorseBody(invalidPhoto: true), "bad-photo-01")).StatusCode);
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE;"));
            var horse = await Data(await Post(client, "horses", HorseBody(), "horse-test-01"), HttpStatusCode.Created);
            var id = horse.GetProperty("horseId").GetString()!;
            Assert.Equal(id, (await Data(await Post(client, "horses", HorseBody(), "horse-test-01"), HttpStatusCode.Created)).GetProperty("horseId").GetString());
            var request = Request(id);
            var submitted = await Data(await Post(client, "requests", request, "request-test-01"), HttpStatusCode.Created);
            var requestId = submitted.GetProperty("requestId").GetString()!;
            Assert.Equal("PENDING", submitted.GetProperty("status").GetString());
            Assert.Equal(1, submitted.GetProperty("version").GetInt32());
            Assert.Equal("REQUIRED_NOT_VERIFIED", submitted.GetProperty("snapshot").GetProperty("receiverVerificationStatus").GetString());
            Assert.Equal(requestId, (await Data(await Post(client, "requests", request, "request-test-01"), HttpStatusCode.Created)).GetProperty("requestId").GetString());
            Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "requests", request with { Purpose = "CHANGED" }, "request-test-01")).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "requests", request, "request-test-02")).StatusCode);
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
            Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM REQUEST_HORSE_MAPPING;"));
            var selected = await Data(await client.GetAsync("/api/customer/horses/selectable?departure=2026-11-20&deadline=2026-11-25"));
            Assert.False(selected[0].GetProperty("selectable").GetBoolean());
            var otherDates = await Data(await client.GetAsync("/api/customer/horses/selectable?departure=2026-12-01&deadline=2026-12-05"));
            Assert.True(otherDates[0].GetProperty("selectable").GetBoolean());
            using var stranger = factory.Client("stranger");
            Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync("/api/customer/requests/" + requestId)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/customer/horses/{id}/documents/1/passport")).StatusCode);
            var file = await client.GetAsync($"/api/customer/horses/{id}/documents/1/passport");
            Assert.Equal(HttpStatusCode.OK, file.StatusCode);
            Assert.Equal("attachment", file.Content.Headers.ContentDisposition!.DispositionType);
            Assert.Equal("no-store", file.Headers.CacheControl!.ToString());
            using var reloadedFactory = new CustomerTestFactory(db.ConnectionString, root);
            using var reloaded = reloadedFactory.Client();
            Assert.Equal(requestId, (await Data(await reloaded.GetAsync("/api/customer/requests/" + requestId))).GetProperty("requestId").GetString());
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }

    [LocalSqlFact]
    public async Task Concurrent_submissions_cannot_double_book_a_horse_and_stale_documents_are_rejected()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root);
            using var a = factory.Client(); using var b = factory.Client();
            var horse = await Data(await Post(a, "horses", HorseBody(), "horse-concurrent"), HttpStatusCode.Created);
            var id = horse.GetProperty("horseId").GetString()!;
            Assert.Equal(HttpStatusCode.Conflict, (await Post(a, "requests", Request(id, 2), "request-stale-01")).StatusCode);
            var responses = await Task.WhenAll(Post(a, "requests", Request(id), "request-parallel-a"), Post(b, "requests", Request(id), "request-parallel-b"));
            Assert.Single(responses, x => x.StatusCode == HttpStatusCode.Created);
            Assert.Single(responses, x => x.StatusCode == HttpStatusCode.Conflict);
            Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM REQUEST_HORSE_MAPPING;"));
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }

    [LocalSqlFact]
    public async Task Prepared_file_survives_SQL_rollback_and_retry_finishes_one_request()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root, failRequestPrepare: true);
            using var client = factory.Client();
            var horse = await Data(await Post(client, "horses", HorseBody(), "horse-recovery-01"), HttpStatusCode.Created);
            var input = Request(horse.GetProperty("horseId").GetString()!);
            var maps = (TestTransportMaps)factory.Services.GetRequiredService<IFlow1RoadRoutingProvider>();
            maps.MayPersist = false;
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Post(client, "requests", input, "request-recovery-01")).StatusCode);
            Assert.False(Directory.Exists(Path.Combine(root, "metadata", "request")));
            maps.MayPersist = true;
            Assert.Equal(HttpStatusCode.InternalServerError, (await Post(client, "requests", input, "request-recovery-01")).StatusCode);
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM REQUEST_HORSE_MAPPING;"));
            Assert.Single(Directory.GetFiles(Path.Combine(root, "metadata", "request"), "*.json"));
            var saved = await Data(await Post(client, "requests", input, "request-recovery-01"), HttpStatusCode.Created);
            Assert.Equal("PENDING", saved.GetProperty("status").GetString());
            Assert.Equal(1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM REQUEST_HORSE_MAPPING;"));
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }

    [LocalSqlFact]
    public async Task Legacy_horse_requires_explicit_profile_documents_and_document_updates_keep_history()
    {
        await using var db = await Flow1TestDatabase.CreateAsync();
        await db.ExecuteAsync("INSERT INTO HORSE(HorseID,OwnerID,Microchip_ISO,Name) VALUES ('legacy-horse','owner','123456789012345',N'Legacy');");
        var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CustomerTestFactory(db.ConnectionString, root);
            using var client = factory.Client();
            var initial = await Data(await client.GetAsync("/api/customer/horses/selectable"));
            Assert.Equal("NEEDS_DOCUMENTS", initial[0].GetProperty("status").GetString());
            Assert.False(initial[0].GetProperty("selectable").GetBoolean());
            var onboard = HorseBody(); onboard.Add(new StringContent("0"), "expectedVersion");
            Assert.Equal(1, (await Data(await Post(client, "horses/legacy-horse/documents", onboard, "legacy-docs-01"))).GetProperty("version").GetInt32());
            var update = HorseBody(); update.Add(new StringContent("1"), "expectedVersion");
            Assert.Equal(2, (await Data(await Post(client, "horses/legacy-horse/documents", update, "legacy-docs-02"))).GetProperty("version").GetInt32());
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/customer/horses/legacy-horse/documents/1/passport")).StatusCode);
            var retry = HorseBody(); retry.Add(new StringContent("1"), "expectedVersion");
            Assert.Equal(2, (await Data(await Post(client, "horses/legacy-horse/documents", retry, "legacy-docs-02"))).GetProperty("version").GetInt32());
            var stale = HorseBody(); stale.Add(new StringContent("1"), "expectedVersion");
            Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "horses/legacy-horse/documents", stale, "legacy-docs-03")).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "requests", Request("legacy-horse"), "legacy-request-stale")).StatusCode);
            Assert.Equal(HttpStatusCode.Created, (await Post(client, "requests", Request("legacy-horse", 2), "legacy-request-01")).StatusCode);
            var invalid = HorseBody(Horse() with { Weight = 0 });
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "horses", invalid, "invalid-weight-01")).StatusCode);
        }
        finally { Flow1TestFolders.Cleanup(root); }
    }
}

internal static class Flow1TestFolders
{
    public static void Cleanup(string root)
    {
        var full = Path.GetFullPath(root);
        var parent = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar);
        if (!string.Equals(Path.GetDirectoryName(full), parent, StringComparison.OrdinalIgnoreCase) ||
            !System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(full), @"\ARaceHorse(?:Flow1Api|Files)-[a-f0-9]{32}\z"))
            throw new InvalidOperationException("Unsafe test directory cleanup target.");
        if (Directory.Exists(full)) Directory.Delete(full, recursive: true);
    }
}
