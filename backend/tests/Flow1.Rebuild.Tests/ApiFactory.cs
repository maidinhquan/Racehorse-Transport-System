using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
namespace Flow1.Rebuild.Tests;
public sealed class ApiFactory(SqlFixture database) : WebApplicationFactory<Program>
{
    public VnpaySandboxGateway Gateway { get; } = new(new Flow1VnpayOptions { Enabled = true, TmnCode = "DEMO1234", HashSecret = "integration-tests-only-secret-not-production", ReturnUrl = "https://localhost/payment/return" }, TimeProvider.System);
    public CaptureSender Sender { get; } = new();
    private readonly string fileRoot = Path.Combine(Path.GetTempPath(), "Flow1RebuildFiles_" + Guid.NewGuid().ToString("N"));
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string,string?>
        { ["ConnectionStrings:Flow1"] = database.Connection, ["ConnectionStrings:DefaultConnection"] = database.Connection,
          ["Flow1:PrivateFiles:Root"] = fileRoot,
          ["RegistrationEmail:Mode"] = "Development",
          ["RegistrationEmail:Smtp:From"] = "noreply@racehorse.local",
          ["Jwt:Key"] = "tests-only-jwt-key-at-least-thirty-two-bytes-long" }));
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<RequestContext>>(); services.RemoveAll<RequestContext>();
            services.AddDbContext<RequestContext>(options => options.UseSqlServer(database.Connection));
            services.RemoveAll<SchemaCheck>(); services.AddSingleton(new SchemaCheck(database.Connection));
            services.AddAuthentication(options => { options.DefaultAuthenticateScheme = "RebuildTest"; options.DefaultChallengeScheme = "RebuildTest"; })
                .AddScheme<AuthenticationSchemeOptions, TestIdentity>("RebuildTest", _ => { });
            services.RemoveAll<ILocationVerifier>(); services.AddSingleton<ILocationVerifier, TestLocations>();
            services.RemoveAll<IPaymentGateway>(); services.AddSingleton<IPaymentGateway>(Gateway);
            services.RemoveAll<IOtpSender>(); services.AddSingleton<IOtpSender>(Sender);
            services.RemoveAll<IOtpSecurity>(); services.AddSingleton<IOtpSecurity>(new ContractOtpSecurity("test-otp-key-private-at-least-thirty-two-bytes"));
            services.RemoveAll<Flow1ContractOptions>(); services.AddSingleton(new Flow1ContractOptions { Issuer = new() { ["legalName"] = "Test Transport", ["phone"] = "0901112233", ["taxCode"] = "DEMO123", ["address"] = "Test address", ["email"] = "issuer@example.invalid", ["representative"] = "Test Manager" } });
            services.RemoveAll<IContractRenderer>(); services.AddScoped<IContractRenderer, TestRenderer>();
        });
    }
    protected override void Dispose(bool disposing)
    {
        var fileStore = fileRoot;
        base.Dispose(disposing);
        if (disposing && fileStore is not null)
        {
            var resolved = Path.GetFullPath(fileStore); var parent = Path.GetFullPath(Path.GetTempPath());
            if (resolved.StartsWith(parent, StringComparison.OrdinalIgnoreCase) && Path.GetFileName(resolved).StartsWith("Flow1RebuildFiles_",StringComparison.Ordinal) && Directory.Exists(resolved))
                Directory.Delete(resolved,true);
        }
    }
    public HttpClient Customer() { var client = CreateClient(new() { BaseAddress = new Uri("https://localhost") }); client.DefaultRequestHeaders.Add("X-Test-Actor", "USER_001"); client.DefaultRequestHeaders.Add("X-Test-Role", "CUSTOMER"); return client; }
    public HttpClient Manager() { var client = CreateClient(new() { BaseAddress = new Uri("https://localhost") }); client.DefaultRequestHeaders.Add("X-Test-Actor", "USER_004"); client.DefaultRequestHeaders.Add("X-Test-Role", "LOGISTICS_MANAGER"); return client; }
}
public sealed class TestIdentity(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var id = Request.Headers["X-Test-Actor"].ToString();
        if (string.IsNullOrEmpty(id)) return Task.FromResult(AuthenticateResult.NoResult());
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,id),new Claim(ClaimTypes.Role,Request.Headers["X-Test-Role"].ToString())],Scheme.Name));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal,Scheme.Name)));
    }
}
public sealed class CaptureSender : IOtpSender
{
    public ConcurrentDictionary<string,string> Codes { get; } = new();
    public Task SendAsync(string email,string code,string id,int version,string document,DateTimeOffset expires,CancellationToken ct)
    { Codes[id]=code; return Task.CompletedTask; }
}
public sealed class TestRenderer(IPrivateFiles files) : IContractRenderer
{
    public Task<string> RenderAsync(JsonElement snapshot,CancellationToken ct) => files.PutAsync(new UploadedFile(Encoding.UTF8.GetBytes("%PDF-1.7 test fixture "+snapshot.GetRawText()),"contract.pdf"),false,ct);
}

public sealed class TestLocations : ILocationVerifier, ICityLocations
{
    public Task<IReadOnlyList<CitySelection>> CitiesAsync(string query, string country, CancellationToken ct) => throw new NotSupportedException();
    public Task<IReadOnlyList<GeocodeCandidate>> SearchInCityAsync(string query, string country, string cityId, CancellationToken ct) => throw new NotSupportedException();
    public Task<CitySelection> VerifyCityAsync(MapPoint point, string cityId, CancellationToken ct)
    {
        if (cityId != (point.CountryCode == "VN" ? "fixture-hanoi" : "fixture-tokyo"))
            throw new Application.Common.Exceptions.BusinessRuleException("Coordinates outside city", 400, "CITY_MISMATCH");
        return Task.FromResult(new CitySelection(cityId, point.CountryCode == "VN" ? "Hanoi" : "Tokyo", point.CountryCode));
    }
    public Task VerifyAsync(MapPoint point,CancellationToken ct)
    {
        if(point.CountryCode is not ("VN" or "JP")) throw new InvalidOperationException("Unexpected fixture country");
        return Task.CompletedTask;
    }
}
