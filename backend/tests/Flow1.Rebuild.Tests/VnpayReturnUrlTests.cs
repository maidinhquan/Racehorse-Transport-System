using Application.Flow1.Interfaces;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class VnpayReturnUrlTests
{
    private sealed class Accessor(string? origin) : IHttpContextAccessor
    {
        public HttpContext? HttpContext { get; set; } = Build(origin);
        private static DefaultHttpContext Build(string? origin)
        {
            var context = new DefaultHttpContext();
            if (origin is not null) context.Request.Headers.Origin = origin;
            return context;
        }
    }

    private static string ReturnUrlFor(string? origin)
    {
        var options = new Flow1VnpayOptions
        {
            Enabled = true, TmnCode = "TEST0001", HashSecret = "fixture-only-vnpay-key",
            ReturnUrl = "http://localhost:5173/customer/payments/return",
            AllowedReturnOrigins = ["http://localhost:5173", "https://demo.ngrok-free.dev"],
        };
        var gateway = new VnpaySandboxGateway(options, TimeProvider.System, new Accessor(origin));
        var session = gateway.CreateSessionAsync(new GatewaySessionRequest("PAYMENT012", "INVOICE_012", 10000, "VND", DateTimeOffset.UtcNow.AddMinutes(15))).Result;
        var query = System.Web.HttpUtility.ParseQueryString(session.PaymentUrl.Query);
        return query["vnp_ReturnUrl"]!;
    }

    [Fact]
    public void ReturnsToTheOriginThatStartedThePayment_WhenAllowed()
    {
        Assert.Equal("https://demo.ngrok-free.dev/customer/payments/return", ReturnUrlFor("https://demo.ngrok-free.dev"));
        Assert.Equal("http://localhost:5173/customer/payments/return", ReturnUrlFor("http://localhost:5173"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("https://evil.example.com")]
    [InlineData("not a url")]
    public void FallsBackToConfiguredReturnUrl_WhenOriginMissingOrNotAllowed(string? origin)
    {
        Assert.Equal("http://localhost:5173/customer/payments/return", ReturnUrlFor(origin));
    }
}
