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

public sealed class ContractLifecycleTests
{
    private sealed class Sink : IContractOtpSender
    {
        public string Code = "";
        public bool Block;
        public TaskCompletionSource Entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task SendAsync(string email, string code, string id, int version, string hash, DateTimeOffset expires, CancellationToken ct)
        { Assert.EndsWith("@example.invalid", email); Code = code; Entered.TrySetResult(); if (Block) await Release.Task.WaitAsync(ct); }
    }
    private static async Task<(Fixture F, PublishedContractView P, Sink Sink)> Setup()
    {
        var sink = new Sink();
        var f = await Fixture.Create(s => {
            s.RemoveAll<IContractOtpSender>(); s.AddSingleton<IContractOtpSender>(sink);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("LifecycleFixture_Key_2026_NotProduction_AtLeast32Bytes"));
        });
        try { await f.Db.ExecuteAsync("UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';"); return (f, await Data<PublishedContractView>(await f.Publish()), sink); }
        catch { await f.DisposeAsync(); throw; }
    }
    private static ContractLifecycleCommand Input(PublishedContractView p, string reason = "Không đồng ý điều khoản") => new(p.Version, p.DocumentHash, 0, reason);
    private static Task<HttpResponseMessage> Close(Fixture f, ContractLifecycleCommand input, bool manager = false, string key = "lifecycle-close-001") =>
        Send(manager ? f.Manager : f.Customer, $"/api/{(manager ? "manager" : "customer")}/contracts/{f.ContractId}/{(manager ? "expire" : "decline")}", input, key);
    private static Task<HttpResponseMessage> Life(Fixture f, bool manager = false, string? id = null) =>
        (manager ? f.Manager : f.Customer).GetAsync($"/api/{(manager ? "manager" : "customer")}/contracts/{id ?? f.ContractId}/lifecycle");
    private static async Task<ManagerReviewView> Current(Fixture f) => await Data<ManagerReviewView>(await f.Manager.GetAsync($"/api/manager/requests/{f.RequestId}"));
    private static Task<HttpResponseMessage> Reissue(Fixture f, int version, string key = "reissue-contract-001", string reason = "Tạo bản mới theo phản hồi", decimal price = 115_000_000) =>
        Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/reissue",
            new ReviewCommand(version, reason, Lines: [new("TRANSPORT", "Giá bán bản mới", 1, price)]), key);
    private static async Task<ContractSignInput> Challenge(Fixture f, PublishedContractView p, Sink sink)
    {
        var otp = await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash)));
        return new(p.Version, p.DocumentHash, otp.ChallengeId, sink.Code, true);
    }
    [LocalSqlFact]
    public async Task Lifecycle_checks_owner_role_exact_PDF_reason_versions_and_deadline_before_mutating()
    {
        var setup = await Setup(); await using var f = setup.F; var input = Input(setup.P);
        using var stranger = f.Factory.Client("other");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/customer/contracts/{f.ContractId}/lifecycle")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(stranger, $"/api/customer/contracts/{f.ContractId}/decline", input)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Manager, $"/api/customer/contracts/{f.ContractId}/decline", input)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, $"/api/manager/contracts/{f.ContractId}/expire", input)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Close(f, input with { Reason = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Close(f, input with { DocumentHash = new string('0', 64) })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Close(f, input with { ContractVersion = 99 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Close(f, input with { ExpectedLifecycleVersion = 1 })).StatusCode);
        Assert.Contains("DEADLINE_NOT_REACHED", await (await Close(f, input, true)).Content.ReadAsStringAsync());
        Assert.True((await Data<ContractLifecycleView>(await Life(f))).CanDecline);
        Assert.False((await Data<ContractLifecycleView>(await Life(f, true))).CanExpire);
        Assert.Null(await f.Factory.State("lifecycle", f.ContractId));
        Assert.Equal("PENDING_SIGNATURE", (await Data<PublishedContractView>(await f.Public())).Status);
    }
    [LocalSqlFact]
    public async Task Decline_commits_once_revokes_code_keeps_PDF_request_booking_and_account_budget()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        var sign = await Challenge(f, p, setup.Sink);
        foreach (var reply in await Task.WhenAll(Close(f, Input(p)), Close(f, Input(p))))
        { var result = await Data<ContractLifecycleView>(reply); Assert.Equal("SIGN_DECLINED", result.Status); Assert.Single(result.History); Assert.False(result.CanDecline); }
        Assert.Equal("ACCEPTED", (await Current(f)).Request.Status);
        Assert.True((await Data<ContractLifecycleView>(await Life(f, true))).CanReissue);
        Assert.Contains("REISSUE_DRAFT", (await Current(f)).AllowedActions);
        Assert.DoesNotContain("REPLACE_DRAFT", (await Current(f)).AllowedActions);
        var otp = (await f.Factory.State("contract-otp", f.ContractId))!.Revisions[^1].Payload.Deserialize<ContractOtpState>(CustomerTransportTests.Json)!;
        Assert.True(otp.Revoked); Assert.False(otp.Consumed); Assert.Equal(0, otp.Attempts); Assert.Equal("DELIVERED", otp.Delivery);
        Assert.Single((await f.Factory.State("otp-account", "owner"))!.Revisions);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", sign, "old-challenge-sign")).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        var bytes = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync();
        Assert.Equal(p.DocumentHash, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)).ToLowerInvariant());
        Assert.Contains("IDEMPOTENCY_KEY_REUSED", await (await Close(f, Input(p, "Lý do khác"))).Content.ReadAsStringAsync());
        var horses = await Data<JsonElement>(await f.Customer.GetAsync("/api/customer/horses/selectable?departure=2026-11-20&deadline=2026-11-25"));
        Assert.False(horses[0].GetProperty("selectable").GetBoolean());
        f.Clock.Now = p.OriginalCompletionDeadline.AddDays(1);
        Assert.Equal("SIGN_DECLINED", (await Data<ContractLifecycleView>(await Close(f, Input(p)))).Status);
    }
    [LocalSqlFact]
    public async Task In_flight_SMTP_delivery_cannot_clear_revocation_after_decline()
    {
        var setup = await Setup(); await using var f = setup.F; setup.Sink.Block = true;
        var delivery = Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(setup.P.Version, setup.P.DocumentHash));
        try
        {
            await setup.Sink.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            await Data<ContractLifecycleView>(await Close(f, Input(setup.P)));
        }
        finally { setup.Sink.Release.TrySetResult(); }
        Assert.Equal(HttpStatusCode.Conflict, (await delivery).StatusCode);
        var otp = (await f.Factory.State("contract-otp", f.ContractId))!.Revisions[^1].Payload.Deserialize<ContractOtpState>(CustomerTransportTests.Json)!;
        Assert.True(otp.Revoked); Assert.Equal("DELIVERING", otp.Delivery); Assert.False(otp.Consumed);
        Assert.Equal("SIGN_DECLINED", (await Data<PublishedContractView>(await f.Public())).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign",
            new ContractSignInput(setup.P.Version, setup.P.DocumentHash, otp.ChallengeId, setup.Sink.Code, true), "late-smtp-sign")).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task Time_passing_does_not_mutate_contract_and_expire_requires_Manager_explicitly()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        f.Clock.Now = p.OriginalCompletionDeadline;
        var before = await Data<PublishedContractView>(await f.Public()); Assert.True(before.Overdue); Assert.Equal("PENDING_SIGNATURE", before.Status);
        Assert.Equal("AWAITING_CONTRACT", (await Current(f)).Request.Status);
        Assert.True((await Data<ContractLifecycleView>(await Life(f, true))).CanExpire);
        Assert.Contains("SIGNING_CLOSED", await (await Close(f, Input(p))).Content.ReadAsStringAsync());
        var expired = await Data<ContractLifecycleView>(await Close(f, Input(p, "Deadline đã qua"), true));
        Assert.Equal("EXPIRED", expired.Status); Assert.True(expired.CanReissue);
        Assert.Equal("ACCEPTED", (await Current(f)).Request.Status);
        var customer = await Data<ContractLifecycleView>(await Life(f)); Assert.Null(customer.History.Single().Reason); Assert.Null(customer.History.Single().Actor);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal("EXPIRED", (await Data<ContractLifecycleView>(await Close(f, Input(p, "Deadline đã qua"), true))).Status);
    }
    [LocalSqlFact]
    public async Task Reissue_creates_one_new_Draft_preserves_closed_PDF_and_hides_internal_reason_from_Customer()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P;
        await Data<ContractLifecycleView>(await Close(f, Input(p)));
        var v = await Current(f); const string reason = "INTERNAL_OVERRIDE_42500000_FLOOR";
        var replies = await Task.WhenAll(Reissue(f, v.Version, reason: reason, price: 25_000_000), Reissue(f, v.Version, reason: reason, price: 25_000_000));
        var next = await Data<ManagerReviewView>(replies[0]); var replay = await Data<ManagerReviewView>(replies[1]);
        Assert.NotEqual(f.ContractId, next.Contract!.ContractId); Assert.Equal(next.Contract.ContractId, replay.Contract!.ContractId);
        Assert.Equal("DRAFT", next.Contract.Status); Assert.Equal(10_000_000, next.Contract.Deposit);
        Assert.Null(next.Review.Feedback); // pending-close feedback is no longer current; audit notices remain available
        Assert.Contains(next.ContractHistory!, h => h.ContractId == f.ContractId && h.Status == "SIGN_DECLINED" && h.HasPublishedPdf);
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
        var text = await (await f.Customer.GetAsync($"/api/customer/requests/{f.RequestId}")).Content.ReadAsStringAsync();
        Assert.DoesNotContain(reason, text); Assert.DoesNotContain("belowFloorReason", text); Assert.DoesNotContain("estimatedCost", text);
        var oldPublic = await (await Life(f)).Content.ReadAsStringAsync(); Assert.DoesNotContain(reason, oldPublic);
        var oldManager = await Data<ContractLifecycleView>(await Life(f, true)); Assert.Equal(reason, oldManager.History[^1].Reason); Assert.False(oldManager.CanReissue);
        Assert.Equal(p.DocumentHash, (await Data<PublishedContractView>(await f.Public())).DocumentHash);
        Assert.Equal("SIGN_DECLINED", (await Data<ContractLifecycleView>(await Close(f, Input(p)))).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await Reissue(f, next.Version, "reissue-old-again")).StatusCode);
    }
    [LocalSqlFact]
    public async Task Expired_reissue_needs_new_future_deadline_and_signs_only_the_new_contract()
    {
        var setup = await Setup(); await using var f = setup.F; var p = setup.P; var oldId = f.ContractId;
        f.Clock.Now = p.OriginalCompletionDeadline;
        await Data<ContractLifecycleView>(await Close(f, Input(p, "Đã hết hạn"), true));
        var next = await Data<ManagerReviewView>(await Reissue(f, (await Current(f)).Version));
        f.ContractId = next.Contract!.ContractId; f.Version = next.Version;
        Assert.Contains("INVALID_COMPLETION_DEADLINE", await (await f.Publish("new-deadline-invalid")).Content.ReadAsStringAsync());
        var issued = await Data<PublishedContractView>(await f.Publish("new-deadline-valid", new(next.Version, f.Clock.Now.AddDays(1))));
        Assert.NotEqual(p.DocumentHash, issued.DocumentHash);
        var sign = await Challenge(f, issued, setup.Sink);
        await Data<ContractAcceptanceView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", sign, "sign-reissued-new"));
        Assert.Equal("EXPIRED", await f.Db.ScalarAsync<string>($"SELECT ContractStatus FROM CONTRACT WHERE ContractID='{oldId}';"));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal("AWAITING_DEPOSIT", (await Current(f)).Request.Status);
        Assert.Equal(p.DocumentHash, (await Data<PublishedContractView>(await f.Customer.GetAsync($"/api/customer/contracts/{oldId}/publication"))).DocumentHash);
        f.Clock.Now = issued.OriginalCompletionDeadline.AddSeconds(1);
        Assert.Equal(HttpStatusCode.Conflict, (await Close(f, Input(issued), true, "expire-signed-new")).StatusCode);
    }
    [LocalSqlFact]
    public async Task Closing_faults_roll_back_review_revocation_status_receipt_and_exact_retry_succeeds()
    {
        foreach (var mode in new[] { "lifecycle-after-state", "after-save" })
        {
            var setup = await Setup(); await using var f = setup.F; await Challenge(f, setup.P, setup.Sink); var v = await Current(f);
            f.Fault.Mode = mode;
            Assert.Equal(HttpStatusCode.InternalServerError, (await Close(f, Input(setup.P))).StatusCode);
            Assert.Equal("PENDING_SIGNATURE", (await Data<PublishedContractView>(await f.Public())).Status); Assert.Equal(v.Version, (await Current(f)).Version);
            Assert.Null(await f.Factory.State("lifecycle", f.ContractId));
            Assert.False((await f.Factory.State("contract-otp", f.ContractId))!.Revisions[^1].Payload.Deserialize<ContractOtpState>(CustomerTransportTests.Json)!.Revoked);
            Assert.Equal("SIGN_DECLINED", (await Data<ContractLifecycleView>(await Close(f, Input(setup.P)))).Status);
        }
    }
    [LocalSqlFact]
    public async Task SQL_constraint_failure_does_not_leave_a_closed_receipt_or_review()
    {
        var setup = await Setup(); await using var f = setup.F;
        await f.Db.ExecuteAsync("ALTER TABLE CONTRACT ADD CONSTRAINT CK_TestDeclineFault CHECK(ContractStatus<>'SIGN_DECLINED');");
        Assert.Equal(HttpStatusCode.InternalServerError, (await Close(f, Input(setup.P))).StatusCode);
        Assert.Null(await f.Factory.State("lifecycle", f.ContractId)); Assert.Equal("AWAITING_CONTRACT", (await Current(f)).Request.Status);
        await f.Db.ExecuteAsync("ALTER TABLE CONTRACT DROP CONSTRAINT CK_TestDeclineFault;");
        Assert.Equal("SIGN_DECLINED", (await Data<ContractLifecycleView>(await Close(f, Input(setup.P)))).Status);
    }
    [LocalSqlFact]
    public async Task Reissue_faults_roll_back_new_owner_Draft_link_review_and_receipt_together()
    {
        foreach (var mode in new[] { "contract-after-state", "lifecycle-after-state", "after-save" })
        {
            var setup = await Setup(); await using var f = setup.F; await Data<ContractLifecycleView>(await Close(f, Input(setup.P)));
            var v = await Current(f); f.Fault.Mode = mode;
            Assert.Equal(HttpStatusCode.InternalServerError, (await Reissue(f, v.Version)).StatusCode);
            Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;")); Assert.Equal(v.Version, (await Current(f)).Version);
            Assert.Single((await Data<ContractLifecycleView>(await Life(f, true))).History);
            Assert.NotEqual(f.ContractId, (await Data<ManagerReviewView>(await Reissue(f, v.Version))).Contract!.ContractId);
        }
    }
    [LocalSqlFact]
    public async Task Sign_and_decline_race_produces_exactly_one_valid_terminal_result()
    {
        var setup = await Setup(); await using var f = setup.F; var sign = await Challenge(f, setup.P, setup.Sink);
        var replies = await Task.WhenAll(Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", sign, "sign-decline-race"), Close(f, Input(setup.P)));
        Assert.Single(replies, r => r.StatusCode == HttpStatusCode.OK); Assert.Single(replies, r => r.StatusCode == HttpStatusCode.Conflict);
        var status = (await Data<PublishedContractView>(await f.Public())).Status;
        Assert.Contains(status, new[] { "SIGNED", "SIGN_DECLINED" });
        Assert.Equal(status == "SIGNED" ? 1 : 0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        var life = await f.Factory.State("lifecycle", f.ContractId);
        Assert.Equal(status == "SIGNED" ? 0 : 1, life?.Revisions.Count ?? 0);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Closed_contract_reissue_still_checks_reason_stale_plan_and_does_not_bypass_signed_contract_guards()
    {
        var setup = await Setup(); await using var f = setup.F;
        Assert.Equal(HttpStatusCode.Conflict, (await Reissue(f, (await Current(f)).Version)).StatusCode);
        await Data<ContractLifecycleView>(await Close(f, Input(setup.P)));
        var v = await Current(f);
        Assert.Equal(HttpStatusCode.Conflict, (await Reissue(f, v.Version, reason: " ")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Reissue(f, v.Version - 1, "stale-reissue-key")).StatusCode);
        f.Clock.Now = new(2026, 11, 20, 0, 0, 0, TimeSpan.Zero);
        Assert.Contains("INVALID_PREPARATION", await (await Reissue(f, v.Version, "too-late-reissue")).Content.ReadAsStringAsync());
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }
}
