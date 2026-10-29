using System.Threading.RateLimiting;
using Application.Common.Flow1;
using Application.DTOs;
using Application.Flow1.Interfaces;
using Application.Services.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace WebApi.Extensions;

public static class ProviderRegistration
{
    public static IServiceCollection AddFlow1Providers(this IServiceCollection services,IConfiguration config,IHostEnvironment environment)
    {
        services.AddSingleton(config.GetSection("Flow1:Vnpay").Get<Flow1VnpayOptions>() ?? new());
        services.AddSingleton<IPaymentGateway, VnpaySandboxGateway>();
        // Resolve deposits whose IPN never arrived (not in automated tests, which control time and providers).
        if (!environment.IsEnvironment("Testing")) services.AddHostedService<WebApi.Extensions.Flow1.PaymentReconciliationWorker>();
        services.AddHttpClient<IGatewayQuery,VnpayQueryGateway>(c=>c.Timeout=TimeSpan.FromSeconds(15))
            .RemoveAllLoggers().ConfigurePrimaryHttpMessageHandler(()=>new HttpClientHandler{AllowAutoRedirect=false});
        services.AddSingleton<IOtpSecurity>(new ContractOtpSecurity(config["Flow1:Contracts:OtpHmacKey"]));
        var emailOptions = config.GetSection("Flow1:Contracts:Email").Get<ContractSmtpOptions>() ?? new();
        if (!config.GetSection("Flow1:Contracts:Email:Smtp").Exists())
            emailOptions.Smtp = config.GetSection("RegistrationEmail:Smtp").Get<Infrastructure.ExternalServices.Email.RegistrationSmtpOptions>() ?? new();
        services.AddSingleton<IOtpSender>(new ContractSmtpSender(emailOptions, environment.IsDevelopment()));
        var contractOptions = config.GetSection("Flow1:Contracts").Get<Flow1ContractOptions>() ?? new();
        services.AddSingleton(contractOptions);
        services.AddSingleton<IDocumentGenerator>(sp => new CodeContractDocumentGenerator(
            environment.ContentRootPath, contractOptions, sp.GetRequiredService<IFileArchive>()));
        services.AddScoped<TransportEstimateService>();
        services.AddScoped<ICostRates, Infrastructure.Data.Context.DatabaseCostRates>();
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
        services.AddScoped<IRoadRouter>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddScoped<IGeocodingProvider>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddScoped<ILocationVerifier>(sp => Maps(sp) switch {
            "MAPBOX" => sp.GetRequiredService<MapboxTransportMaps>(), "GEOAPIFY" => sp.GetRequiredService<GeoapifyTransportMaps>(), _ => sp.GetRequiredService<OsmTransportMaps>() });
        services.AddSingleton<IFileArchive>(sp =>
        {
            var storage = sp.GetRequiredService<IOptions<Flow1PrivateFileOptions>>().Value;
            return new LocalFlow1PrivateFileStore(Flow1PrivateStoragePath.Resolve(storage.Root, environment));
        });
        // Per-customer requests/minute across Flow 1 customer endpoints (incl. location search).
        // Default 30; raise it in appsettings.Development.json for manual testing.
        var customerPerMinute = Math.Max(1, config.GetValue("Flow1:RateLimit:CustomerPerMinute", 30));
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("flow1-contract-otp", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 25, Window = TimeSpan.FromMinutes(15), QueueLimit = 0 }));
            options.AddPolicy("flow1-customer", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = customerPerMinute, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            var registrationRejected = options.OnRejected;
            options.OnRejected = async (context, ct) =>
            {
                if (context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName is "flow1-customer" or "flow1-contract-otp")
                {
                    context.HttpContext.Response.StatusCode = 429;
                    context.HttpContext.Response.Headers.RetryAfter = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName == "flow1-contract-otp" ? "900" : "60";
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
