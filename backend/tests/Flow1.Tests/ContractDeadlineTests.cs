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

public sealed class ContractDeadlineTests
{
    private sealed class Sink : IContractOtpSender
    {
        public string Code = "";
        public Task SendAsync(string email, string code, string id, int version, string hash, DateTimeOffset expires, CancellationToken ct)
        { Assert.EndsWith("@example.invalid", email); Code = code; return Task.CompletedTask; }
    }
    private static async Task<(Fixture F, PublishedContractView P, Sink Sink)> Setup()
    {
        var sink = new Sink(); var f = await Fixture.Create(s => {
            s.RemoveAll<IContractOtpSender>(); s.AddSingleton<IContractOtpSender>(sink);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("DeadlineFixture_Key_2026_NotProduction_AtLeast32Bytes"));
        });
        try { await f.Db.ExecuteAsync("UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';"); return (f, await Data<PublishedContractView>(await f.Publish()), sink); }
        catch { await f.DisposeAsync(); throw; }
    }
    private static ExtendContractDeadlineInput Input(PublishedContractView p, int version = 0) =>
        new(p.Version, p.DocumentHash, version, p.OriginalCompletionDeadline.AddDays(version + 1), "INTERNAL_EXTENSION_REASON");
    private static Task<HttpResponseMessage> Extend(Fixture f, ExtendContractDeadlineInput input, string key = "deadline-extend-001") =>
        Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/extensions", input, key);
    private static Task<HttpResponseMessage> View(Fixture f, bool manager = false) =>
        (manager ? f.Manager : f.Customer).GetAsync($"/api/{(manager ? "manager" : "customer")}/contracts/{f.ContractId}/deadlines");
    private static Task<HttpResponseMessage> Acceptance(Fixture f) => f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance");
    private static async Task<ContractSignInput> Code(Fixture f, PublishedContractView p, Sink sink)
    {
        var otp = await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash)));
        return new(p.Version, p.DocumentHash, otp.ChallengeId, sink.Code, true);
    }
    private static Task<HttpResponseMessage> Sign(Fixture f, ContractSignInput input) => Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", input, "deadline-sign-001");
    private static ContractOtpState Otp(Flow1StateDocument doc) => doc.Revisions[^1].Payload.Deserialize<ContractOtpState>(CustomerTransportTests.Json)!;
    [LocalSqlFact]
    public async Task Extension_checks_role_owner_hash_version_reason_and_frozen_preparation_boundary()
    {
        var setup = await Setup(); await using var f = setup.F; var input = Input(setup.P);
        using var stranger = f.Factory.Client("other");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/customer/contracts/{f.ContractId}/deadlines")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, $"/api/manager/contracts/{f.ContractId}/extensions", input)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Extend(f, input with { Reason = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, input with { ExpectedExtensionVersion = 9 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, input with { DocumentHash = new string('0', 64) })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, input with { ContractVersion = 9 })).StatusCode);
        foreach (var date in new[] { setup.P.OriginalCompletionDeadline, f.Clock.Now, new DateTimeOffset(2026, 11, 19, 0, 0, 0, TimeSpan.Zero) })
            Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, input with { NewDeadline = date })).StatusCode);
        Assert.Null(await f.Factory.State("extensions", f.ContractId));
        var plan = (await f.Factory.State("plan", f.RequestId))!.Revisions[^1].Payload.Deserialize<PreliminaryPlan>(CustomerTransportTests.Json)!;
        var limit = plan.Input.PlannedDepartureAt!.Value.AddDays(-plan.Input.PreparationDays);
        var v = await Data<ContractDeadlineView>(await Extend(f, input with { NewDeadline = limit })); Assert.Equal(limit, v.EffectiveCompletionDeadline);
        Assert.False(v.CanExtend); Assert.Single(v.History); Assert.Equal(input.Reason, v.History[0].Reason);
        var customer = await Data<ContractDeadlineView>(await View(f)); Assert.False(customer.CanExtend); Assert.Null(customer.History[0].Reason); Assert.Null(customer.History[0].Actor);
        Assert.Equal(setup.P.OriginalCompletionDeadline, (await Data<PublishedContractView>(await f.Public())).OriginalCompletionDeadline);
    }
    [LocalSqlFact]
    public async Task Overdue_unsigned_extension_reopens_signing_and_new_invoice_uses_effective_deadline()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        f.Clock.Now = p.OriginalCompletionDeadline;
        Assert.True((await Data<PublishedContractView>(await f.Public())).Overdue);
        var v = await Data<ContractDeadlineView>(await Extend(f, Input(p)));
        var pub = await Data<PublishedContractView>(await f.Public()); Assert.False(pub.Overdue); Assert.Equal(v.EffectiveCompletionDeadline, pub.EffectiveCompletionDeadline);
        Assert.Equal(p.DocumentHash, pub.DocumentHash); Assert.Equal(1, pub.DeadlineVersion);
        var life = await Data<ContractLifecycleView>(await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/lifecycle")); Assert.True(life.CanDecline);
        Assert.Contains("DEADLINE_NOT_REACHED", await (await Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/expire", new ContractLifecycleCommand(p.Version, p.DocumentHash, 0, "Hết hạn"))).Content.ReadAsStringAsync());
        var signed = await Data<ContractAcceptanceView>(await Sign(f, await Code(f, p, setup.Sink)));
        Assert.Equal(1, signed.Receipt!.DeadlineVersion); Assert.Equal(v.EffectiveCompletionDeadline.UtcDateTime, signed.Invoice!.DueAtUtc);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Extension_revokes_pending_OTP_without_resetting_attempts_expiry_cooldown_or_account_budget()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        var code = await Code(f, p, setup.Sink);
        await Sign(f, code with { Otp = setup.Sink.Code == "000000" ? "111111" : "000000" });
        var old = Otp((await f.Factory.State("contract-otp", f.ContractId))!);
        await Data<ContractDeadlineView>(await Extend(f, Input(p)));
        var revoked = Otp((await f.Factory.State("contract-otp", f.ContractId))!);
        Assert.True(revoked.Revoked); Assert.False(revoked.Consumed); Assert.Equal(1, revoked.Attempts); Assert.Equal(old.ExpiresAt, revoked.ExpiresAt);
        Assert.Single((await f.Factory.State("otp-account", "owner"))!.Revisions);
        Assert.Equal(HttpStatusCode.Conflict, (await Sign(f, code)).StatusCode);
        Assert.Contains("OTP_COOLDOWN", await (await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash))).Content.ReadAsStringAsync());
        f.Clock.Now = f.Clock.Now.AddSeconds(61);
        var next = await Code(f, p, setup.Sink); var fresh = Otp((await f.Factory.State("contract-otp", f.ContractId))!);
        Assert.Equal(1, fresh.DeadlineVersion); Assert.False(fresh.Revoked); Assert.Equal(0, fresh.Attempts);
        Assert.Equal("SIGNED", (await Data<ContractAcceptanceView>(await Sign(f, next))).Status);
    }
    [LocalSqlFact]
    public async Task Signed_extension_updates_only_invoice_due_and_preserves_signed_receipt_partial_money_PDF_and_retry()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P; var code = await Code(f, p, setup.Sink);
        var before = await Data<ContractAcceptanceView>(await Sign(f, code)); var receipt = JsonSerializer.Serialize(before.Receipt);
        await f.Db.ExecuteAsync("UPDATE INVOICE SET PaidAmount=5000000,PaymentStatus='PARTIALLY_PAID';");
        f.Clock.Now = p.OriginalCompletionDeadline.AddSeconds(1);
        Assert.True((await Data<ContractAcceptanceView>(await Acceptance(f))).Overdue);
        await Data<ContractDeadlineView>(await Extend(f, Input(p)));
        await Data<ContractDeadlineView>(await Extend(f, Input(p, 1), "deadline-extend-002"));
        var replay = await Data<ContractDeadlineView>(await Extend(f, Input(p))); Assert.Equal(2, replay.Version);
        var after = await Data<ContractAcceptanceView>(await Sign(f, code));
        Assert.False(after.Overdue); Assert.Equal(receipt, JsonSerializer.Serialize(after.Receipt)); Assert.Equal(before.Invoice!.InvoiceId, after.Invoice!.InvoiceId);
        Assert.Equal(5_000_000, after.Invoice.PaidAmount); Assert.Equal("PARTIALLY_PAID", after.Invoice.Status); Assert.Equal(Input(p, 1).NewDeadline.UtcDateTime, after.Invoice.DueAtUtc);
        Assert.Equal("AWAITING_DEPOSIT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        var bytes = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync();
        Assert.Equal(p.DocumentHash, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)).ToLowerInvariant());
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;")); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Closed_declined_expired_fully_paid_and_activated_contracts_cannot_be_extended()
    {
        foreach (var mode in new[] { "DECLINED", "EXPIRED", "PAID", "ACTIVATED" })
        {
            var setup = await Setup(); await using var f = setup.F; var p = setup.P;
            if (mode is "PAID" or "ACTIVATED")
            {
                await Data<ContractAcceptanceView>(await Sign(f, await Code(f, p, setup.Sink)));
                await f.Db.ExecuteAsync(mode == "PAID" ? "UPDATE INVOICE SET PaidAmount=TotalPayableAmount,PaymentStatus='PAID';" : "UPDATE TRANSPORT_REQUEST SET Status='ACTIVATED';");
            }
            else
            {
                if (mode == "EXPIRED") f.Clock.Now = p.OriginalCompletionDeadline;
                await Data<ContractLifecycleView>(await Send(mode == "EXPIRED" ? f.Manager : f.Customer,
                    $"/api/{(mode == "EXPIRED" ? "manager" : "customer")}/contracts/{f.ContractId}/{(mode == "EXPIRED" ? "expire" : "decline")}", new ContractLifecycleCommand(p.Version, p.DocumentHash, 0, "Đóng phiên bản")));
            }
            Assert.False((await Data<ContractDeadlineView>(await View(f, true))).CanExtend);
            Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, Input(p))).StatusCode); Assert.Null(await f.Factory.State("extensions", f.ContractId));
        }
    }
    [LocalSqlFact]
    public async Task Duplicate_and_competing_extension_keys_do_not_append_twice_or_overwrite_history()
    {
        var setup = await Setup(); await using var f = setup.F; var input = Input(setup.P);
        foreach (var r in await Task.WhenAll(Extend(f, input), Extend(f, input))) Assert.Equal(1, (await Data<ContractDeadlineView>(r)).Version);
        Assert.Contains("IDEMPOTENCY_KEY_REUSED", await (await Extend(f, input with { Reason = "Khác" })).Content.ReadAsStringAsync());
        var a = Input(setup.P, 1); var replies = await Task.WhenAll(Extend(f, a, "concurrent-next-A"), Extend(f, a, "concurrent-next-B"));
        Assert.Single(replies, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(replies, x => x.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(2, (await Data<ContractDeadlineView>(await View(f))).Version);
    }
    [LocalSqlFact]
    public async Task Unsigned_faults_rollback_extension_revocation_and_retry_exact_input()
    {
        // Unsigned extension changes only ADO state; EF SaveChanges returns zero. EF after-save faults are covered with a signed invoice below.
        foreach (var mode in new[] { "extensions-after-state", "contract-otp-after-state" })
        {
            var setup = await Setup(); await using var f = setup.F; await Code(f, setup.P, setup.Sink); f.Fault.Mode = mode;
            Assert.Equal(HttpStatusCode.InternalServerError, (await Extend(f, Input(setup.P))).StatusCode);
            Assert.Null(await f.Factory.State("extensions", f.ContractId)); Assert.False(Otp((await f.Factory.State("contract-otp", f.ContractId))!).Revoked);
            Assert.Equal(setup.P.OriginalCompletionDeadline, (await Data<PublishedContractView>(await f.Public())).EffectiveCompletionDeadline);
            Assert.Equal(1, (await Data<ContractDeadlineView>(await Extend(f, Input(setup.P)))).Version);
        }
    }
    [LocalSqlFact]
    public async Task Invoice_SQL_failure_and_after_save_failure_rollback_due_receipt_and_can_retry()
    {
        foreach (var mode in new[] { "SQL", "after-save" })
        {
            var setup = await Setup(); await using var f = setup.F; var p = setup.P;
            var signed = await Data<ContractAcceptanceView>(await Sign(f, await Code(f, p, setup.Sink)));
            if (mode == "SQL") await f.Db.ExecuteAsync("ALTER TABLE INVOICE ADD CONSTRAINT CK_DeadlineFault CHECK(DueDate < '2026-11-11');");
            else f.Fault.Mode = mode;
            Assert.Equal(HttpStatusCode.InternalServerError, (await Extend(f, Input(p))).StatusCode); Assert.Null(await f.Factory.State("extensions", f.ContractId));
            Assert.Equal(signed.Invoice!.DueAtUtc, (await Data<ContractAcceptanceView>(await Acceptance(f))).Invoice!.DueAtUtc);
            if (mode == "SQL") await f.Db.ExecuteAsync("ALTER TABLE INVOICE DROP CONSTRAINT CK_DeadlineFault;");
            Assert.Equal(1, (await Data<ContractDeadlineView>(await Extend(f, Input(p)))).Version);
        }
    }
    [LocalSqlFact]
    public async Task Sign_extension_race_keeps_signature_receipt_invoice_and_OTP_consistent()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P; var code = await Code(f, p, setup.Sink);
        var replies = await Task.WhenAll(Sign(f, code), Extend(f, Input(p)));
        Assert.Equal(HttpStatusCode.OK, replies[1].StatusCode); Assert.Contains(replies[0].StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
        var view = await Data<ContractAcceptanceView>(await Acceptance(f)); Assert.Equal(1, view.DeadlineVersion);
        if (replies[0].IsSuccessStatusCode) { Assert.Equal("SIGNED", view.Status); Assert.Equal(0, view.Receipt!.DeadlineVersion); }
        else
        { Assert.Equal("PENDING_SIGNATURE", view.Status); Assert.Null(view.Invoice); f.Clock.Now = f.Clock.Now.AddSeconds(61); view = await Data<ContractAcceptanceView>(await Sign(f, await Code(f, p, setup.Sink))); Assert.Equal(1, view.Receipt!.DeadlineVersion); }
        Assert.Equal(Input(p).NewDeadline.UtcDateTime, view.Invoice!.DueAtUtc); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Explicit_expire_extension_race_has_one_winner_and_never_resurrects_expired_contract()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P; f.Clock.Now = p.OriginalCompletionDeadline;
        var results = await Task.WhenAll(Extend(f, Input(p)), Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/expire", new ContractLifecycleCommand(p.Version, p.DocumentHash, 0, "Hết hạn")));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(results, x => x.StatusCode == HttpStatusCode.Conflict);
        var pub = await Data<PublishedContractView>(await f.Public());
        if (pub.Status == "EXPIRED") { Assert.Null(await f.Factory.State("extensions", f.ContractId)); Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, Input(p))).StatusCode); }
        else { Assert.Equal("PENDING_SIGNATURE", pub.Status); Assert.Equal(1, pub.DeadlineVersion); Assert.False(pub.Overdue); }
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Corrupt_extension_chain_fails_closed()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        await Data<ContractDeadlineView>(await Extend(f, Input(p)));
        await f.Db.ExecuteAsync("UPDATE CONTRACT SET Flow1StateJson=JSON_MODIFY(Flow1StateJson,'$.documents.extensions.revisions[0].payload.previousDeadline','2026-01-01T00:00:00Z');");
        Assert.Equal(HttpStatusCode.Conflict, (await f.Public()).StatusCode); Assert.Equal(HttpStatusCode.Conflict, (await View(f)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash))).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Signed_invoice_due_must_match_effective_state_without_rewriting_receipt()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        await Data<ContractAcceptanceView>(await Sign(f, await Code(f, p, setup.Sink)));
        await Data<ContractDeadlineView>(await Extend(f, Input(p)));
        await f.Db.ExecuteAsync("UPDATE INVOICE SET DueDate='2026-11-10T10:00:00';");
        Assert.Equal(HttpStatusCode.Conflict, (await Acceptance(f)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await View(f, true)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Extend(f, Input(p, 1), "corrupt-due-extend")).StatusCode);
        Assert.Single((await f.Factory.State("extensions", f.ContractId))!.Revisions);
    }
}
