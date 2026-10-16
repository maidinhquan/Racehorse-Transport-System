using System.Net;
using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class ContractAcceptanceTests
{
    private sealed class Sink : IContractOtpSender
    {
        public string Code = ""; public int Sends; public bool Fail;
        public Task SendAsync(string email, string code, string contractId, int version, string hash, DateTimeOffset expires, CancellationToken ct)
        {
            Code = code; Sends++; Assert.EndsWith("@example.invalid", email);
            if (Fail) throw Application.Common.Flow1.Flow1PricingPolicy.Error("Injected email delivery failure.", "CONTRACT_EMAIL_UNAVAILABLE", 503);
            return Task.CompletedTask;
        }
    }
    private static async Task<(Fixture F, Sink Sink, PublishedContractView Pdf)> Setup()
    {
        var sink = new Sink(); var f = await Fixture.Create(s => {
            s.RemoveAll<IContractOtpSender>(); s.AddSingleton<IContractOtpSender>(sink);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("Fixture contract OTP secret only, 2026, not production"));
        });
        try
        {
            await f.Db.ExecuteAsync("UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';");
            return (f, sink, await Data<PublishedContractView>(await f.Publish()));
        }
        catch { await f.DisposeAsync(); throw; }
    }
    private static Task<HttpResponseMessage> Otp(Fixture f, PublishedContractView pdf) => Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(pdf.Version, pdf.DocumentHash));
    private static ContractSignInput Input(PublishedContractView p, ContractOtpView otp, Sink sink) => new(p.Version, p.DocumentHash, otp.ChallengeId, sink.Code, true);
    private static Task<HttpResponseMessage> Sign(Fixture f, ContractSignInput input, string key = "confirm-fixture-001") => Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", input, key);
    private static Task<HttpResponseMessage> View(Fixture f) => f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance");
    private static Task<HttpResponseMessage> Recover(Fixture f) => Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/acceptance/recover", new { });
    private static Task<HttpResponseMessage> Discard(Fixture f) => Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/acceptance/discard", new { reason = "Discard expired confirmation; customer must obtain a new code" });
    [LocalSqlFact]
    public async Task Confirm_is_owner_scoped_bound_to_pdf_requires_consent_and_creates_one_deposit_without_trip()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        using var stranger = f.Factory.Client("other");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Manager, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Otp(f, p with { Version = 99 })).StatusCode); Assert.Equal(0, sink.Sends);
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, input with { AcceptedTerms = false })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, input with { DocumentHash = new string('a', 64) })).StatusCode);
        var replies = await Task.WhenAll(Sign(f, input), Sign(f, input));
        foreach (var reply in replies) { var v = await Data<ContractAcceptanceView>(reply); Assert.Equal("SIGNED", v.Status); Assert.Equal(46_000_000, v.Invoice!.Amount); Assert.NotNull(v.Receipt); Assert.False(v.RecoveryRequired); }
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE WHERE InvoiceType='DEPOSIT' AND CurrencyCode='VND' AND TotalPayableAmount=46000000 AND PaidAmount=0 AND PaymentStatus='UNPAID';"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal("AWAITING_DEPOSIT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, input with { Otp = sink.Code == "000000" ? "111111" : "000000" })).StatusCode);
        var pdfBytes = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync();
        Assert.Equal(p.DocumentHash, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(pdfBytes)).ToLowerInvariant());
        var text = await (await View(f)).Content.ReadAsStringAsync(); Assert.DoesNotContain("inputDigest", text); Assert.DoesNotContain("codeDigest", text); Assert.DoesNotContain(sink.Code, text);
        foreach (var type in new[] { "contract-otp", "acceptance" })
        { var doc = await f.Factory.State(type, f.ContractId); Assert.DoesNotContain(sink.Code, JsonSerializer.Serialize(doc)); Assert.DoesNotContain("\"otp\":", JsonSerializer.Serialize(doc)); }
        Assert.Equal(HttpStatusCode.NotFound, (await Discard(f)).StatusCode);
    }
    [LocalSqlFact]
    public async Task Resend_replaces_old_challenge_and_cooldown_expiry_and_attempt_limit_survive_reads()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        var first = await Data<ContractOtpView>(await Otp(f, p)); var old = Input(p, first, sink);
        Assert.Equal(HttpStatusCode.Conflict, (await Otp(f, p)).StatusCode); Assert.Equal(1, sink.Sends);
        f.Clock.Now = f.Clock.Now.AddSeconds(61);
        var second = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, second, sink);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, old)).StatusCode);
        var wrong = input with { Otp = input.Otp == "000000" ? "111111" : "000000" };
        for (var i = 0; i < 5; i++) Assert.Contains("OTP_INCORRECT", await (await Sign(f, wrong, "wrong-code-" + i)).Content.ReadAsStringAsync());
        Assert.Contains("OTP_INVALID_OR_EXPIRED", await (await Sign(f, input)).Content.ReadAsStringAsync());
        f.Clock.Now = f.Clock.Now.AddSeconds(61);
        var third = await Data<ContractOtpView>(await Otp(f, p)); f.Clock.Now = third.ExpiresAt;
        Assert.Contains("OTP_INVALID_OR_EXPIRED", await (await Sign(f, Input(p, third, sink))).Content.ReadAsStringAsync());
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Delivery_failure_never_yields_an_acceptable_code_and_account_budget_is_persistent()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        sink.Fail = true; Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Otp(f, p)).StatusCode);
        var doc = await f.Factory.State("contract-otp", f.ContractId);
        var failed = doc!.Revisions[^1].Payload.Deserialize<ContractOtpState>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal("FAILED", failed.Delivery);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, new(p.Version, p.DocumentHash, failed.ChallengeId, sink.Code, true))).StatusCode);
        sink.Fail = false;
        for (var i = 0; i < 4; i++) { f.Clock.Now = f.Clock.Now.AddSeconds(61); await Data<ContractOtpView>(await Otp(f, p)); }
        f.Clock.Now = f.Clock.Now.AddSeconds(61); Assert.Contains("OTP_RATE_LIMITED", await (await Otp(f, p)).Content.ReadAsStringAsync());
        Assert.Equal(5, sink.Sends); f.Clock.Now = f.Clock.Now.AddMinutes(15); await Data<ContractOtpView>(await Otp(f, p));
    }
    [LocalSqlFact]
    public async Task Account_budget_applies_across_contracts_and_a_new_host_cannot_reset_it()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf;
        await Data<ContractOtpView>(await Otp(f, p));
        var h = await Data<HorseView>(await Send(f.Customer, "/api/customer/horses", CustomerTransportTests.HorseBody(
            CustomerTransportTests.Horse() with { MicrochipIso = "987654321012345", FeiPassportNo = "SECOND-PASSPORT" })), HttpStatusCode.Created);
        var r = await Data<RequestView>(await Send(f.Customer, "/api/customer/requests", CustomerTransportTests.Request(h.HorseId)), HttpStatusCode.Created);
        var v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{r.RequestId}/accept", new ReviewCommand(0)));
        v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{r.RequestId}/preliminary-plan", new ReviewCommand(v.Version,
            Plan: new(new(2026, 11, 20), new(2026, 11, 25), 2, 1, 1, "Fixture second plan"))));
        v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{r.RequestId}/contracts", new ReviewCommand(v.Version, Lines: [new("TRANSPORT", "Second fixture", 1, 100_000_000)])));
        var p2 = await Data<PublishedContractView>(await Send(f.Manager, $"/api/manager/contracts/{v.Contract!.ContractId}/send", new PublishContractInput(v.Version, f.Input.CompletionDeadline)));
        for (var i = 0; i < 4; i++)
        {
            f.Clock.Now = f.Clock.Now.AddSeconds(61);
            await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{p2.ContractId}/otp", new ContractOtpInput(p2.Version, p2.DocumentHash)));
        }
        using var restarted = new CustomerTestFactory(f.Db.ConnectionString, f.Folder, customize: s => {
            s.RemoveAll<TimeProvider>(); s.AddSingleton<TimeProvider>(f.Clock);
        });
        using var customer = restarted.Client();
        var limited = await Send(customer, $"/api/customer/contracts/{p.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash));
        Assert.Equal(HttpStatusCode.Conflict, limited.StatusCode); Assert.Contains("OTP_RATE_LIMITED", await limited.Content.ReadAsStringAsync());
    }
    [LocalSqlFact]
    public async Task Acceptance_write_failure_rolls_back_consumed_code_and_fresh_host_can_retry_once()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink); f.Fault.Mode = "acceptance-after-state";
        Assert.Equal(HttpStatusCode.InternalServerError, (await Sign(f, input)).StatusCode);
        Assert.False((await Data<ContractAcceptanceView>(await View(f))).RecoveryRequired);
        Assert.Null(await f.Factory.State("acceptance", f.ContractId));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        using var restarted = new CustomerTestFactory(f.Db.ConnectionString, f.Folder, customize: s => {
            s.RemoveAll<TimeProvider>(); s.AddSingleton<TimeProvider>(f.Clock);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("Fixture contract OTP secret only, 2026, not production"));
        });
        using var customer = restarted.Client();
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Send(customer, $"/api/customer/contracts/{f.ContractId}/sign", input, "confirm-fixture-001"))).Status);
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Sign(f, input))).Status);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal(1, sink.Sends);
    }
    [LocalSqlFact]
    public async Task Successful_sql_confirmation_replays_after_deadline_without_a_second_invoice_or_receipt_write()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        f.Clock.Now = f.Clock.Now.AddMilliseconds(877);
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink);
        await Data<ContractAcceptanceView>(await Sign(f, input));
        f.Clock.Now = p.OriginalCompletionDeadline.AddDays(1);
        var view = await Data<ContractAcceptanceView>(await View(f)); Assert.False(view.RecoveryRequired); Assert.NotNull(view.Receipt);
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Sign(f, input))).Status);
        Assert.Single((await f.Factory.State("acceptance", f.ContractId))!.Revisions);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Sql_invoice_failure_rolls_back_signature_receipt_and_code_consumption_then_exact_retry_succeeds()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink);
        await f.Db.ExecuteAsync("ALTER TABLE INVOICE ADD CONSTRAINT CK_TestAcceptanceFailure CHECK (InvoiceType <> 'DEPOSIT');");
        Assert.Equal(HttpStatusCode.InternalServerError, (await Sign(f, input)).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal("AWAITING_CONTRACT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE SignedAt IS NULL AND ContractStatus='PENDING_SIGNATURE';"));
        await f.Db.ExecuteAsync("ALTER TABLE INVOICE DROP CONSTRAINT CK_TestAcceptanceFailure;");
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Sign(f, input))).Status);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Failure_after_sql_save_rolls_back_everything_and_expired_code_requires_new_customer_confirmation()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink); f.Fault.Mode = "after-save";
        Assert.Equal(HttpStatusCode.InternalServerError, (await Sign(f, input)).StatusCode);
        Assert.Equal("PENDING_SIGNATURE", await f.Db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Null(await f.Factory.State("acceptance", f.ContractId)); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        f.Clock.Now = otp.ExpiresAt.AddSeconds(1);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, input)).StatusCode);
        var fresh = await Data<ContractOtpView>(await Otp(f, p));
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Sign(f, Input(p, fresh, sink), "fresh-confirm-after-rollback"))).Status);
    }
    [LocalSqlFact]
    public async Task Overdue_or_corrupt_pdf_and_changed_email_close_confirmation_without_automatic_cancellation()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.Pdf; var sink = setup.Sink;
        var otp = await Data<ContractOtpView>(await Otp(f, p)); var input = Input(p, otp, sink);
        await f.Db.ExecuteAsync("UPDATE [USER] SET Email='changed@example.invalid' WHERE UserID='owner';");
        Assert.Contains("OTP_INVALID_OR_EXPIRED", await (await Sign(f, input)).Content.ReadAsStringAsync());
        f.Clock.Now = p.OriginalCompletionDeadline;
        Assert.Equal(HttpStatusCode.Conflict, (await Otp(f, p)).StatusCode);
        Assert.Equal("PENDING_SIGNATURE", await f.Db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Equal("AWAITING_CONTRACT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        await File.WriteAllTextAsync(Path.Combine(f.Folder, "bytes", p.DocumentHash + ".bin"), "CORRUPTION");
        Assert.Equal(HttpStatusCode.Conflict, (await View(f)).StatusCode);
    }
    [Fact]
    public async Task Security_requires_private_key_and_smtp_rejects_non_tls_non_loopback_configuration()
    {
        Assert.ThrowsAny<Exception>(() => new ContractOtpSecurity(null).Digest("code", "000000"));
        var security = new ContractOtpSecurity("Fixture key only, not a production secret, 32+ bytes");
        Assert.NotEqual(security.Digest("code", "000000"), security.Digest("sign-input", "000000"));
        var options = new ContractSmtpOptions { AllowDevelopmentLoopback = true, Smtp = new() { Host = "smtp.example.invalid", From = "noreply@example.invalid", EnableSsl = false } };
        await Assert.ThrowsAnyAsync<Exception>(() => new ContractSmtpSender(options, true).SendAsync("owner@example.invalid", "000000", "c", 1, "hash", DateTimeOffset.UtcNow, default));
    }
}
