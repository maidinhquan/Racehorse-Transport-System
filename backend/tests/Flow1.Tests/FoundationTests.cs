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
        Assert.Throws<InvalidOperationException>(() => Flow1PrivateStoragePath.Resolve(new() { MetadataRoot = Path.Combine(publicRoot, "metadata") }, new TestEnvironment { ContentRootPath = contentRoot, WebRootPath = publicRoot }));
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
}
