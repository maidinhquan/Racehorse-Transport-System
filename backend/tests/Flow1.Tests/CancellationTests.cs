using System.Net;
using System.Text.Json;
using Application.DTOs.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class CancellationTests
{
    private static string Url(Fixture f, bool manager = false) => $"/api/{(manager ? "manager" : "customer")}/contracts/{f.ContractId}/cancellation-requests";
    private static Task<HttpResponseMessage> Request(Fixture f, int version = 0, string key = "cancel-request-001") =>
        Send(f.Customer, Url(f), new RequestCancellationInput(version, "Khách cần thay đổi kế hoạch"), key);
    private static async Task<CancellationsView> View(Fixture f, bool manager = false) => await Data<CancellationsView>(await (manager ? f.Manager : f.Customer).GetAsync(Url(f, manager)));
    private static async Task<HttpResponseMessage> Decide(Fixture f, bool approve, string key = "cancel-decision-001", int? expectedVersion = null)
    {
        var v = await View(f, true); var money = await DepositPaymentTests.View(f); var pending = v.Items.Last();
        return await Send(f.Manager, Url(f, true) + $"/{pending.Id}/{(approve ? "approve" : "reject")}",
            new DecideCancellationInput(expectedVersion ?? v.Version, money.LedgerVersion, money.DeadlineVersion, "Quyết định đã đối soát gửi khách", true), key);
    }
    [LocalSqlFact]
    public async Task Signed_customer_request_requires_manager_decision_without_deadline_wait_and_preserves_receipt_invoice_and_pdf()
    {
        await using var f = await DepositPaymentTests.Setup(); var before = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync();
        var receipt = (await Data<ContractAcceptanceView>(await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance"))).Receipt;
        using var other = f.Factory.Client("other"); Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(Url(f))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Manager, Url(f), new RequestCancellationInput(0, "Forbidden"))).StatusCode);
        var view = await Data<CancellationsView>(await Request(f)); Assert.Equal("PENDING", Assert.Single(view.Items).Status);
        await Data<CancellationsView>(await Request(f)); Assert.Equal(1, (await View(f)).Version);
        var money = await DepositPaymentTests.View(f); Assert.Equal("AWAITING_DEPOSIT", money.RequestStatus); Assert.False(money.CanSubmit); Assert.False(money.Overdue);
        Assert.Equal(HttpStatusCode.Conflict, (await DepositPaymentTests.Proof(f, 100)).StatusCode);
        Assert.Contains("CANCEL_CLOSED", await (await Send(f.Manager, DepositPaymentTests.Path(f, true) + "/cancel-overdue", new CancelOverdueDepositInput(0, "Use proper request", true))).Content.ReadAsStringAsync());
        var approved = await Data<CancellationsView>(await Decide(f, true)); Assert.Equal("APPROVED", approved.Items[0].Status); Assert.False(approved.CanRequest);
        Assert.Equal("CANCELLED", (await DepositPaymentTests.View(f)).RequestStatus); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        var after = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync(); Assert.Equal(before, after);
        var accepted = await Data<ContractAcceptanceView>(await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance")); Assert.Equal(receipt, accepted.Receipt); Assert.NotNull(accepted.Invoice);
        var input = new DecideCancellationInput(1, money.LedgerVersion, money.DeadlineVersion, "Quyết định đã đối soát gửi khách", true);
        await Data<CancellationsView>(await Send(f.Manager, Url(f, true) + $"/{view.Items[0].Id}/approve", input, "cancel-decision-001"));
    }
    [LocalSqlFact]
    public async Task Pending_proof_and_verified_money_block_approval_but_rejection_releases_fully_funded_activation_once()
    {
        await using var f = await DepositPaymentTests.Setup(); var p = (await Data<DepositPaymentsView>(await DepositPaymentTests.Proof(f, 46_000_000))).Payments[0];
        await Data<CancellationsView>(await Request(f));
        Assert.Contains("PAYMENT_PENDING", await (await Decide(f, true)).Content.ReadAsStringAsync());
        var money = await Data<DepositPaymentsView>(await DepositPaymentTests.Confirm(f, p.PaymentId, 46_000_000));
        Assert.Equal(46_000_000, money.VerifiedAmount); Assert.Null(money.Activation); Assert.True(money.FinancialReviewRequired);
        Assert.Contains("FINANCIAL_REVIEW_REQUIRED", await (await Decide(f, true)).Content.ReadAsStringAsync());
        await Data<CancellationsView>(await Decide(f, false)); money = await DepositPaymentTests.View(f);
        Assert.NotNull(money.Activation); Assert.Equal("ACTIVATED", money.RequestStatus); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.False((await View(f)).CanRequest); Assert.Equal(HttpStatusCode.Conflict, (await Request(f, 2, "cancel-after-activation")).StatusCode);
    }
    [LocalSqlFact]
    public async Task Rejection_reopens_new_payment_and_stale_or_foreign_decisions_are_rejected()
    {
        await using var f = await DepositPaymentTests.Setup(); var requested = await Data<CancellationsView>(await Request(f));
        Assert.Equal(HttpStatusCode.Conflict, (await Decide(f, false, expectedVersion: 99)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, Url(f, true) + $"/{requested.Items[0].Id}/approve", new DecideCancellationInput(1, 0, 0, "Forbidden", true))).StatusCode);
        await Data<CancellationsView>(await Decide(f, false)); Assert.True((await DepositPaymentTests.View(f)).CanSubmit);
        Assert.True((await View(f)).CanRequest); Assert.Equal("REJECTED", (await View(f)).Items[0].Status);
        await Data<CancellationsView>(await Request(f, 2, "cancel-request-002")); Assert.Equal(2, (await View(f)).Items.Length);
    }
    [LocalSqlFact]
    public async Task Cancellation_failure_rolls_back_request_state_notices_and_decision_then_retry_commits()
    {
        await using var f = await DepositPaymentTests.Setup(); f.Fault.Mode = "cancellation-after-state";
        Assert.Equal(HttpStatusCode.InternalServerError, (await Request(f)).StatusCode); Assert.Empty((await View(f)).Items);
        await Data<CancellationsView>(await Request(f)); f.Fault.Mode = "review-after-state";
        Assert.Equal(HttpStatusCode.InternalServerError, (await Decide(f, true)).StatusCode);
        Assert.Equal("PENDING", (await View(f)).Items[0].Status); Assert.Equal("AWAITING_DEPOSIT", (await DepositPaymentTests.View(f)).RequestStatus);
        await Data<CancellationsView>(await Decide(f, true)); Assert.Equal("CANCELLED", (await DepositPaymentTests.View(f)).RequestStatus);
    }
    [LocalSqlFact]
    public async Task Simultaneous_cancellation_request_and_bank_receipt_never_cancel_or_lose_verified_money()
    {
        await using var f = await DepositPaymentTests.Setup(); var proof = (await Data<DepositPaymentsView>(await DepositPaymentTests.Proof(f, 46_000_000))).Payments[0];
        var request = Request(f); var confirm = DepositPaymentTests.Confirm(f, proof.PaymentId, 46_000_000); await Task.WhenAll(request, confirm);
        await Data<DepositPaymentsView>(confirm.Result); Assert.Contains(request.Result.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
        var v = await DepositPaymentTests.View(f); Assert.Equal(46_000_000, v.VerifiedAmount); Assert.NotEqual("CANCELLED", v.RequestStatus);
        if (request.Result.IsSuccessStatusCode) { Assert.Null(v.Activation); await Data<CancellationsView>(await Decide(f, false)); }
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Pending_gateway_callback_still_records_cash_while_cancellation_holds_activation_and_session_replay_stays_closed()
    {
        await using var f = await DepositPaymentTests.Setup(s => { s.RemoveAll<Flow1VnpayOptions>(); s.AddSingleton(VnpaySandboxGatewayTests.Options()); });
        var sessionUrl = DepositPaymentTests.Path(f) + "/vnpay-sessions";
        var session = await Data<GatewayPaymentSession>(await Send(f.Customer, sessionUrl, new { }, "pending-cancel-session"));
        await Data<CancellationsView>(await Request(f));
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, sessionUrl, new { }, "pending-cancel-session")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, sessionUrl, new { }, "other-cancel-session")).StatusCode);
        var p = VnpaySandboxGatewayTests.Callback(session.PaymentId); p["vnp_SecureHash"] = new VnpaySandboxGateway(VnpaySandboxGatewayTests.Options(), f.Clock).Sign(p);
        using var provider = f.Factory.Client(null); var response = await provider.GetAsync("/api/payments/vnpay/ipn?" + string.Join("&", p.Select(v => WebUtility.UrlEncode(v.Key) + "=" + WebUtility.UrlEncode(v.Value))));
        Assert.Equal("00", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("RspCode").GetString());
        var money = await DepositPaymentTests.View(f); Assert.Equal(46_000_000, money.VerifiedAmount); Assert.Null(money.Activation);
        await Data<CancellationsView>(await Decide(f, false)); Assert.NotNull((await DepositPaymentTests.View(f)).Activation);
    }
}
