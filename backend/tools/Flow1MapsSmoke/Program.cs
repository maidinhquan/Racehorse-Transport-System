using System.Text.Json;
using System.Security.Cryptography;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Application.Services.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Data.Context;

// Explicit, bounded live checks. Estimates read current SQL rates; no SQL writes, SMTP or payment access.
if (args.Length != 1 || args[0] is not ("--live" or "--preview-only"))
    throw new ArgumentException("Run from repo root with --live (Geoapify + Mapbox) or --preview-only (one Mapbox image).");
var repository = Directory.GetCurrentDirectory();
var contentRoot = Path.Combine(repository, "backend/WebApi");
if (!File.Exists(Path.Combine(repository, "backend/Backend.slnx"))) throw new InvalidOperationException("Run from repository root.");
var config = new ConfigurationBuilder().SetBasePath(contentRoot).AddJsonFile("appsettings.json")
    .AddJsonFile("appsettings.Development.json", optional: true).AddJsonFile("appsettings.Local.json", optional: true)
    .AddEnvironmentVariables().Build();
var options = config.GetSection("Flow1:Maps").Get<Flow1MapOptions>() ?? new();
var estimateOptions = config.GetSection("Flow1:Estimate").Get<Flow1EstimateOptions>() ?? new();
var folder = Path.Combine(contentRoot, "App_Data/flow1/maps-smoke-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(folder);
var checks = new List<object>(); var complete = true;
using var http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(15) };
var clock = TimeProvider.System;
var mapbox = new MapboxTransportMaps(http, options, clock);
try
{
    // Public city landmark only; no user/contact/horse data is sent to providers.
    var image = await mapbox.PreviewAsync(106.7009, 10.7769, default);
    await File.WriteAllBytesAsync(Path.Combine(folder, "mapbox-preview.png"), image);
    checks.Add(new { Check = "MapboxStaticImage", Status = "PASS", Bytes = image.Length,
        Sha256 = Convert.ToHexString(SHA256.HashData(image)).ToLowerInvariant(), PermanentGeocodingEnabled = options.Mapbox.PermanentGeocodingEnabled });
}
catch (BusinessRuleException error) { complete = false; checks.Add(new { Check = "MapboxStaticImage", Status = "FAIL", Code = error.ErrorCode }); }

if (args[0] == "--live")
{
    if (!string.Equals(options.DataProvider, "GEOAPIFY", StringComparison.OrdinalIgnoreCase) ||
        string.IsNullOrWhiteSpace(options.Geoapify.ApiKey))
    {
        complete = false; checks.Add(new { Check = "Geoapify", Status = "NOT_CONFIGURED" });
    }
    else
    {
        var maps = new GeoapifyTransportMaps(http, options, new(), clock);
        await using var db = new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>()
            .UseSqlServer(config.GetConnectionString("DefaultConnection")??throw new InvalidOperationException("Configure SQL for rate lookup.")).Options);
        var service = new TransportEstimateService(maps, maps, estimateOptions, clock, new DatabaseCostRates(db));
        try
        {
            var pickup = (await maps.SearchAsync("Ho Chi Minh City", "VN")).FirstOrDefault() ?? throw new InvalidOperationException();
            var date = Flow1PricingPolicy.Today(clock).AddDays(30);
            foreach (var query in new[] { (Address: "Vung Tau", Country: "VN", Mode: "ROAD"),
                         (Address: "Hanoi", Country: "VN", Mode: "ROAD"), (Address: "Tokyo", Country: "JP", Mode: "AIR") })
            {
                var delivery = (await maps.SearchAsync(query.Address, query.Country)).FirstOrDefault() ?? throw new InvalidOperationException();
                var result = await service.CalculateAsync(new(ToInput(pickup), ToInput(delivery), query.Mode, 1, date), default);
                if (result.Route is { MayPersist: false } || result.Customer.LocationAttribution != GeoapifyTransportMaps.SourceAttribution)
                    throw new InvalidOperationException();
                checks.Add(new { Check = "Estimate", Status = "PASS", result.Customer,
                    RouteFingerprint = result.Route?.InputFingerprint });
            }
        }
        catch (BusinessRuleException error) { complete = false; checks.Add(new { Check = "GeoapifyEstimate", Status = "FAIL", Code = error.ErrorCode }); }
        catch (InvalidOperationException) { complete = false; checks.Add(new { Check = "GeoapifyEstimate", Status = "FAIL", Code = "UNEXPECTED_PROVIDER_RESULT" }); }
    }
}
// Preview-only is partial evidence even when its single check passes.
var report = new { Status = complete && args[0] == "--live" ? "PASS" : "PARTIAL", CheckedAtUtc = clock.GetUtcNow(),
    Mode = args[0], Scope = "LIVE MAPS ONLY - NO SQL OR FULL FLOW 1 ACCEPTANCE", Checks = checks };
await File.WriteAllTextAsync(Path.Combine(folder, "maps-smoke-result.json"), JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine($"{report.Status}: sanitized evidence written to {folder}");
if (!complete) Environment.ExitCode = 2;
static LocationInput ToInput(GeocodeCandidate candidate) => new(candidate.Label[..Math.Min(candidate.Label.Length, 255)],
    candidate.Point.Latitude, candidate.Point.Longitude, candidate.Point.CountryCode);
