using System.Text.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs;
using Application.Interfaces.Flow1;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WebApi.Extensions;
using Infrastructure.Storage;
using WebApi.Middlewares;
using Xunit;

namespace Flow1.Tests;

public sealed class FoundationTests
{
    [Fact]
    public void New_draft_uses_VND_and_40_percent_without_a_fake_trip()
    {
        var contract = Flow1ContractFactory.CreateDraft("c-1", "req-1", "owner", "C-001", 115_000_000m);
        Assert.Null(contract.TripId);
        Assert.Null(contract.SignedAt);
        Assert.Null(contract.CompletionDeadline);
        Assert.Equal("req-1", contract.RequestId);
        Assert.Equal("DRAFT", contract.ContractStatus);
        Assert.Equal("VND", contract.CurrencyCode);
        Assert.Equal(40m, contract.DepositRateStandard);
        Assert.Equal(46_000_000m, Flow1ContractFactory.DepositAmount(contract.TotalQuotedPrice!.Value));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1.5)]
    [InlineData(10000000000)]
    public void Invalid_VND_selling_totals_are_not_silently_truncated(decimal value) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => Flow1ContractFactory.CreateDraft("c", "r", "u", "C", value));

    [Fact]
    public void Existing_failure_callers_keep_their_shape_and_new_errors_have_codes()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var old = JsonSerializer.SerializeToElement(ApiResponse<object?>.Fail("old", new Dictionary<string, string[]> { ["email"] = ["Invalid"] }), options);
        Assert.False(old.TryGetProperty("errorCode", out _));
        Assert.Equal("Invalid", old.GetProperty("errors").GetProperty("email")[0].GetString());
        Assert.Equal(JsonValueKind.Null, old.GetProperty("data").ValueKind);
        var current = JsonSerializer.SerializeToElement(ApiResponse<object?>.Fail("expired", errorCode: "CONTRACT_EXPIRED"), options);
        Assert.Equal("CONTRACT_EXPIRED", current.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task Middleware_preserves_the_business_HTTP_status_and_machine_readable_code()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new GlobalExceptionMiddleware(_ => throw new BusinessRuleException("Reload", 409, "STALE_VERSION"),
            NullLogger<GlobalExceptionMiddleware>.Instance, new TestEnvironment());
        await middleware.InvokeAsync(context);
        Assert.Equal(409, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Equal("STALE_VERSION", json.RootElement.GetProperty("errorCode").GetString());
    }

    [Fact]
    public void Metadata_cannot_be_configured_under_a_custom_public_web_root()
    {
        var contentRoot = Path.Combine(Path.GetTempPath(), "flow1-config-test");
        var publicRoot = Path.Combine(contentRoot, "public");
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Flow1:Storage:MetadataRoot"] = Path.Combine(publicRoot, "metadata")
        }).Build();
        var services = new ServiceCollection();
        services.AddFlow1Foundation(config, new TestEnvironment { ContentRootPath = contentRoot, WebRootPath = publicRoot });
        using var provider = services.BuildServiceProvider();
        Assert.Throws<InvalidOperationException>(() => Flow1PrivateStoragePath.Resolve(Path.Combine(publicRoot, "metadata"), new TestEnvironment { ContentRootPath = contentRoot, WebRootPath = publicRoot }));
        Assert.False(Directory.Exists(Path.Combine(publicRoot, "metadata")));
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Flow1.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Production";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    [Fact]
    public void Storage_configuration_keeps_legacy_byte_paths_and_allows_explicit_new_roots_without_a_file_state_provider()
    {
        var settings = new Dictionary<string, string?> { ["Flow1:Storage:MetadataRoot"] = "App_Data/legacy" };
        void Check(string bytes, string source)
        {
            var services = new ServiceCollection();
            services.AddFlow1Foundation(new ConfigurationBuilder().AddInMemoryCollection(settings).Build(), new TestEnvironment());
            using var provider = services.BuildServiceProvider();
            Assert.Equal(bytes, provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Flow1PrivateFileOptions>>().Value.Root);
            Assert.Equal(source, provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Flow1LegacyImportOptions>>().Value.SourceRoot);
        }
        Check(Path.Combine("App_Data/legacy", "private-bytes"), "App_Data/legacy");
        settings["Flow1:PrivateFiles:Root"] = "App_Data/private"; settings["Flow1:LegacyImport:SourceRoot"] = "App_Data/retained";
        Check("App_Data/private", "App_Data/retained");
    }
}

file static class FoundationTestExtensions
{
    public static IServiceCollection AddFlow1Foundation(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var oldRoot = configuration["Flow1:Storage:MetadataRoot"] ?? "App_Data/flow1/metadata";
        services.AddOptions<Flow1PrivateFileOptions>().Configure(o => o.Root = configuration["Flow1:PrivateFiles:Root"] ?? Path.Combine(oldRoot, "private-bytes"))
            .Validate(o => !string.IsNullOrWhiteSpace(o.Root), "Private file root is required.").ValidateOnStart();
        services.AddOptions<Flow1LegacyImportOptions>().Configure(o => o.SourceRoot = configuration["Flow1:LegacyImport:SourceRoot"] ?? oldRoot)
            .Validate(o => !string.IsNullOrWhiteSpace(o.SourceRoot), "Legacy source root is required.").ValidateOnStart();
        return services;
    }
}
