using System.Threading.RateLimiting;
using Application.Common.Flow1;
using Application.DTOs;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.DAOs.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace WebApi.Extensions;

public static class Flow1CustomerExtensions
{
    public static IServiceCollection AddFlow1Customer(this IServiceCollection services, IConfiguration config, IHostEnvironment environment)
    {
        services.AddScoped<ICustomerTransportRepository, CustomerTransportRepository>();
        services.AddScoped<CustomerTransportService>();
        services.AddScoped<TransportEstimateService>();
        services.AddSingleton(config.GetSection("Flow1:Maps").Get<Flow1MapOptions>() ?? new());
        services.AddSingleton(config.GetSection("Flow1:Estimate").Get<Flow1EstimateOptions>() ?? new());
        services.AddSingleton<OsmRequestGate>();
        services.AddHttpClient<OsmTransportMaps>(client => client.Timeout = TimeSpan.FromSeconds(15))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        // Mapbox authenticates in the query string; suppress factory URI logging entirely.
        services.AddHttpClient<MapboxTransportMaps>(client => client.Timeout = TimeSpan.FromSeconds(15))
            .RemoveAllLoggers()
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        // Geoapify also authenticates in query parameters. Never log the request URI.
        services.AddHttpClient<GeoapifyTransportMaps>(client => client.Timeout = TimeSpan.FromSeconds(15))
            .RemoveAllLoggers()
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddScoped<IFlow1RoadRoutingProvider>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddScoped<IFlow1GeocodingProvider>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddScoped<IFlow1LocationVerifier>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddSingleton<IFlow1PrivateFileStore>(sp =>
        {
            // Force validation of the metadata root against custom web roots first.
            sp.GetRequiredService<IFlow1MetadataStore>();
            var storage = sp.GetRequiredService<IOptions<Flow1StorageOptions>>().Value;
            var root = Path.GetFullPath(storage.MetadataRoot, environment.ContentRootPath);
            return new LocalFlow1PrivateFileStore(Path.Combine(root, "private-bytes"));
        });
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("flow1-customer", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            var registrationRejected = options.OnRejected;
            options.OnRejected = async (context, ct) =>
            {
                if (context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName == "flow1-customer")
                {
                    context.HttpContext.Response.StatusCode = 429;
                    context.HttpContext.Response.Headers.RetryAfter = "60";
                    await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail("Too many requests; retry later.", errorCode: "RATE_LIMITED"), ct);
                }
                else if (registrationRejected is not null) await registrationRejected(context, ct);
            };
        });
        return services;
    }
    private static string Maps(IServiceProvider services) => DataProvider(services.GetRequiredService<Flow1MapOptions>()) switch
    {
        "MAPBOX" => "MAPBOX", "OSM" => "OSM", "GEOAPIFY" => "GEOAPIFY",
        _ => throw new InvalidOperationException("Flow1:Maps:DataProvider must be GEOAPIFY, MAPBOX or OSM.")
    };
    private static string DataProvider(Flow1MapOptions options) => (options.DataProvider ?? options.Provider).ToUpperInvariant();
}
