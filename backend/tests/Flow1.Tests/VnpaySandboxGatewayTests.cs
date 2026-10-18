using Application.Common.Exceptions;
using Application.Interfaces.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Xunit;

namespace Flow1.Tests;

public sealed class VnpaySandboxGatewayTests
{
    internal static Flow1VnpayOptions Options() => new() { Enabled = true, TmnCode = "TEST2026", HashSecret = "Sandbox_Unit_Test_Key_Not_A_Provider_Credential",
        ReturnUrl = "http://localhost/customer/payments/return" };
    internal static Dictionary<string, string> Callback(string id, decimal amount = 46_000_000, string transaction = "123456789") => new() {
        ["vnp_TmnCode"] = "TEST2026", ["vnp_TxnRef"] = id, ["vnp_Amount"] = (amount * 100).ToString("0", System.Globalization.CultureInfo.InvariantCulture),
        ["vnp_TransactionNo"] = transaction, ["vnp_ResponseCode"] = "00", ["vnp_TransactionStatus"] = "00", ["vnp_PayDate"] = "20261016030000" };
    [Fact]
    public async Task Session_is_sandbox_only_VND_integer_and_signed_with_GMT7_dates()
    {
        var clock = new ContractPublicationTests.Clock(); var gateway = new VnpaySandboxGateway(Options(), clock);
        var session = await gateway.CreateSessionAsync(new("vp123", "i-one", 10000, "VND", clock.Now.AddMinutes(15)));
        var uri = session.PaymentUrl.AbsoluteUri;
        Assert.StartsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?", uri); Assert.Contains("vnp_Amount=1000000", uri);
        Assert.Contains("vnp_CreateDate=20261016030000", uri); Assert.Contains("vnp_ExpireDate=20261016031500", uri); Assert.Contains("vnp_SecureHash=", uri);
        await Assert.ThrowsAsync<BusinessRuleException>(() => gateway.CreateSessionAsync(new("vp123", "i", 100.5m, "VND", clock.Now.AddMinutes(15))));
    }
    [Fact]
    public async Task Signature_merchant_amount_currency_dates_and_both_result_codes_are_checked()
    {
        var clock = new ContractPublicationTests.Clock(); var gateway = new VnpaySandboxGateway(Options(), clock); var p = Callback("vp123");
        p["vnp_SecureHash"] = gateway.Sign(p); Assert.True((await gateway.VerifyAsync(p)).Verified);
        p["vnp_Amount"] = "100"; Assert.False((await gateway.VerifyAsync(p)).Verified);
        foreach (var pair in new[] { ("vnp_TmnCode", "OTHER123"), ("vnp_Amount", "12345"), ("vnp_CurrCode", "USD"), ("vnp_PayDate", "invalid"), ("vnp_TransactionNo", "0") })
        {
            var value = Callback("vp123"); value[pair.Item1] = pair.Item2; value["vnp_SecureHash"] = gateway.Sign(value);
            Assert.False((await gateway.VerifyAsync(value)).Verified);
        }
        var failed = Callback("vp123"); failed["vnp_TransactionStatus"] = "02"; failed["vnp_SecureHash"] = gateway.Sign(failed);
        var result = await gateway.VerifyAsync(failed); Assert.True(result.Verified); Assert.Equal("FAILED", result.Status); Assert.Null(result.PaidAtUtc);
        Assert.DoesNotContain("vnp_SecureHash", result.SafeEvidence.GetRawText());
    }
    [Fact]
    public async Task Missing_config_or_production_url_fail_closed_and_never_create_a_live_payment()
    {
        foreach (var options in new[] { new Flow1VnpayOptions(), new Flow1VnpayOptions { Enabled = true, TmnCode = "TEST2026", HashSecret = "Fixture", ReturnUrl = "https://example.invalid/return", PaymentUrl = "https://pay.vnpay.vn/vpcpay.html" } })
            await Assert.ThrowsAsync<BusinessRuleException>(() => new VnpaySandboxGateway(options, new FlowClock()).CreateSessionAsync(new("vp123", "i", 100, "VND", DateTimeOffset.UtcNow.AddMinutes(15))));
    }
    [Theory]
    [InlineData("::1")]
    [InlineData("::ffff:127.0.0.1")]
    public async Task Local_ipv6_addresses_use_the_equivalent_provider_valid_loopback_value(string ip)
    {
        var clock=new ContractPublicationTests.Clock();var gateway=new VnpaySandboxGateway(Options(),clock);
        var session=await gateway.CreateSessionAsync(new("vp123","invoice",10000,"VND",clock.Now.AddMinutes(15),ip));Assert.Contains("vnp_IpAddr=127.0.0.1",session.PaymentUrl.AbsoluteUri);
    }
    [Fact]
    public async Task Unspecified_short_ipv6_address_cannot_be_sent_as_a_provider_client_ip()
    {
        var clock=new ContractPublicationTests.Clock();await Assert.ThrowsAsync<BusinessRuleException>(()=>new VnpaySandboxGateway(Options(),clock).CreateSessionAsync(new("vp123","invoice",10000,"VND",clock.Now.AddMinutes(15),"::")));
    }

}
