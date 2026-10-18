using System.Net;
using System.Text.Json;
using Application.DTOs.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class DepositGatewayTests
{
    private static Task<Fixture> Setup() => DepositPaymentTests.Setup(s => {
        s.RemoveAll<Flow1VnpayOptions>(); s.AddSingleton(VnpaySandboxGatewayTests.Options());
    });
    private static Task<HttpResponseMessage> Session(Fixture f, string key = "gateway-session-001") =>
        Send(f.Customer, DepositPaymentTests.Path(f) + "/vnpay-sessions", new { }, key);
    private static Dictionary<string, string> Payload(Fixture f, string id, decimal amount = 46_000_000, string transaction = "123456789", bool success = true)
    {
        var p = VnpaySandboxGatewayTests.Callback(id, amount, transaction);
        p["vnp_PayDate"] = f.Clock.Now.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss", System.Globalization.CultureInfo.InvariantCulture);
        if (!success) { p["vnp_ResponseCode"] = "24"; p["vnp_TransactionStatus"] = "02"; }
        p["vnp_SecureHash"] = new VnpaySandboxGateway(VnpaySandboxGatewayTests.Options(), f.Clock).Sign(p); return p;
    }
    private static async Task<string> Ipn(Fixture f, Dictionary<string, string> payload, string extra = "")
    {
        using var client = f.Factory.Client(null);
        var response = await client.GetAsync("/api/payments/vnpay/ipn?" + string.Join("&", payload.Select(p => WebUtility.UrlEncode(p.Key) + "=" + WebUtility.UrlEncode(p.Value))) + extra);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("RspCode").GetString()!;
    }
    [LocalSqlFact]
    public async Task Session_is_owned_stable_and_recoverable_without_counting_money_and_Return_cannot_credit()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        Assert.Equal(46_000_000, s.RequestedAmount); Assert.Equal(s.PaymentUrl, (await Data<GatewayPaymentSession>(await Session(f))).PaymentUrl);
        Assert.Equal(s.PaymentId, (await Data<GatewayPaymentSession>(await Session(f, "recover-session-001"))).PaymentId);
        var v = await DepositPaymentTests.View(f); Assert.Equal(0, v.VerifiedAmount); Assert.Null(v.Activation); Assert.Single(v.Payments);
        using var stranger = f.Factory.Client("other"); Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/customer/payments/{s.PaymentId}")).StatusCode);
        var status = await Data<GatewayPaymentStatus>(await f.Customer.GetAsync($"/api/customer/payments/{s.PaymentId}"));
        Assert.Equal("PENDING_GATEWAY", status.Status); Assert.Equal(f.RequestId, status.RequestId);
        Assert.Equal(HttpStatusCode.Conflict, (await DepositPaymentTests.Confirm(f, s.PaymentId, 46_000_000)).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Ipn_verifies_signature_merchant_reference_amount_currency_and_duplicate_keys_before_writes()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        var invalid = Payload(f, s.PaymentId); invalid["vnp_Amount"] = "100"; Assert.Equal("97", await Ipn(f, invalid));
        Assert.Equal("97", await Ipn(f, Payload(f, s.PaymentId), "&vnp_Amount=4600000000"));
        Assert.Equal("04", await Ipn(f, Payload(f, s.PaymentId, 100)));
        Assert.Equal("01", await Ipn(f, Payload(f, "vpUnknown")));
        Assert.Equal(0, (await DepositPaymentTests.View(f)).VerifiedAmount);
        var replies = await Task.WhenAll(Ipn(f, Payload(f, s.PaymentId)), Ipn(f, Payload(f, s.PaymentId)));
        Assert.Contains("00", replies); Assert.Contains("02", replies);
        var v = await DepositPaymentTests.View(f); Assert.Equal(46_000_000, v.VerifiedAmount); Assert.NotNull(v.Activation);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal("99", await Ipn(f, Payload(f, s.PaymentId, transaction: "999999999")));
        Assert.Equal(46_000_000, (await DepositPaymentTests.View(f)).VerifiedAmount);
    }
    [LocalSqlFact]
    public async Task Ipn_uses_original_session_amount_after_bank_partial_and_preserves_overpayment_without_second_trip()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        var bank = (await Data<DepositPaymentsView>(await DepositPaymentTests.Proof(f, 10_000_000))).Payments.Last();
        await Data<DepositPaymentsView>(await DepositPaymentTests.Confirm(f, bank.PaymentId, 10_000_000));
        Assert.Equal("00", await Ipn(f, Payload(f, s.PaymentId)));
        var v = await DepositPaymentTests.View(f); Assert.Equal(56_000_000, v.VerifiedAmount); Assert.Equal(10_000_000, v.ExcessAmount);
        Assert.True(v.FinancialReviewRequired); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT WHERE Status='SUCCESS';"));
    }
    [LocalSqlFact]
    public async Task Callback_after_effective_deadline_records_money_but_never_resurrects_cancelled_request()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        f.Clock.Now = new(2026, 11, 21, 0, 0, 0, TimeSpan.Zero);
        await f.Db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET Status='CANCELLED';");
        Assert.Equal("00", await Ipn(f, Payload(f, s.PaymentId))); var v = await DepositPaymentTests.View(f);
        Assert.Equal(46_000_000, v.VerifiedAmount); Assert.True(v.FinancialReviewRequired); Assert.Null(v.Activation); Assert.Equal("CANCELLED", v.RequestStatus);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Failed_ipn_counts_zero_and_overdue_cancel_requires_reconciliation_no_pending_no_money()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        var cancel = new CancelOverdueDepositInput(0, "Đã đối soát mọi kênh, không nhận tiền", true);
        var url = DepositPaymentTests.Path(f, true) + "/cancel-overdue";
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Manager, url, cancel, "cancel-001")).StatusCode);
        f.Clock.Now = new(2026, 11, 11, 0, 0, 0, TimeSpan.Zero);
        Assert.Contains("PAYMENT_PENDING", await (await Send(f.Manager, url, cancel, "cancel-001")).Content.ReadAsStringAsync());
        Assert.Equal("00", await Ipn(f, Payload(f, s.PaymentId, success: false))); Assert.Equal("02", await Ipn(f, Payload(f, s.PaymentId, success: false)));
        var v = await Data<DepositPaymentsView>(await Send(f.Manager, url, cancel, "cancel-001")); Assert.Equal("CANCELLED", v.RequestStatus); Assert.Equal("SIGNED", v.ContractStatus);
        await Data<DepositPaymentsView>(await Send(f.Manager, url, cancel, "cancel-001")); Assert.Equal(0, v.VerifiedAmount); Assert.Null(v.Activation);
        Assert.NotNull((await Data<ContractAcceptanceView>(await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance"))).Receipt);
    }
    [LocalSqlFact]
    public async Task Missing_gateway_configuration_leaves_no_session_or_payment_row()
    {
        await using var f = await DepositPaymentTests.Setup();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Session(f)).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
        Assert.Null(await f.Factory.State("payment-sessions", f.ContractId)); Assert.False((await DepositPaymentTests.View(f)).VnpayAvailable);
    }
    [LocalSqlFact]
    public async Task Expired_session_is_not_fake_failed_and_late_signed_receipt_or_duplicate_transaction_is_reconciled()
    {
        await using var f = await Setup(); var first = await Data<GatewayPaymentSession>(await Session(f));
        f.Clock.Now = f.Clock.Now.AddMinutes(16);
        Assert.Equal(HttpStatusCode.Conflict, (await Session(f)).StatusCode);
        var second = await Data<GatewayPaymentSession>(await Session(f, "session-after-expiry-001")); Assert.NotEqual(first.PaymentId, second.PaymentId);
        Assert.All((await DepositPaymentTests.View(f)).Payments, p => Assert.Equal("PENDING_GATEWAY", p.Status));
        Assert.Equal("00", await Ipn(f, Payload(f, first.PaymentId)));
        Assert.Equal("99", await Ipn(f, Payload(f, second.PaymentId))); // Same provider transaction cannot fund a second payment.
        var v = await DepositPaymentTests.View(f); Assert.Equal(46_000_000, v.VerifiedAmount); Assert.True(v.FinancialReviewRequired);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal("00", await Ipn(f, Payload(f, second.PaymentId, transaction: "987654321")));
        v = await DepositPaymentTests.View(f); Assert.Equal(92_000_000, v.VerifiedAmount); Assert.Equal(46_000_000, v.ExcessAmount);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Contains("PROVIDER_RECONCILIATION_REQUIRED", await (await Send(f.Manager, DepositPaymentTests.Path(f, true) + "/financial-review",
            new AcknowledgeFinancialReviewInput(v.LedgerVersion, v.DeadlineVersion, "Cannot override provider conflict", true))).Content.ReadAsStringAsync());
    }
    [LocalSqlFact]
    public async Task Callback_merchant_is_bound_to_original_session_even_if_current_configuration_changes()
    {
        await using var f = await Setup(); var session = await Data<GatewayPaymentSession>(await Session(f));
        var options = f.Factory.Services.GetRequiredService<Flow1VnpayOptions>(); options.TmnCode = "NEW2026A";
        var payload = Payload(f, session.PaymentId); payload["vnp_TmnCode"] = options.TmnCode;
        payload["vnp_SecureHash"] = new VnpaySandboxGateway(options, f.Clock).Sign(payload);
        Assert.Equal("97", await Ipn(f, payload)); Assert.Equal(0, (await DepositPaymentTests.View(f)).VerifiedAmount);
        Assert.Equal("TEST2026", session.MerchantId); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Crash_after_receipt_or_activation_returns_retry_code_and_same_ipn_commits_once()
    {
        await using var f = await Setup(); var s = await Data<GatewayPaymentSession>(await Session(f));
        foreach (var mode in new[] { "payment-ledger-after-state", "after-save", "activation-after-state", "review-after-state" })
        {
            f.Fault.Mode = mode; Assert.Equal("99", await Ipn(f, Payload(f, s.PaymentId)));
            var v = await DepositPaymentTests.View(f); Assert.Equal(0, v.VerifiedAmount); Assert.Null(v.Activation);
            Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        }
        Assert.Equal("00", await Ipn(f, Payload(f, s.PaymentId))); Assert.Equal("02", await Ipn(f, Payload(f, s.PaymentId)));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
}
