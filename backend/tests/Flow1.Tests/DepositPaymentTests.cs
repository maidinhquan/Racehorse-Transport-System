using System.Net;
using System.Text;
using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class DepositPaymentTests
{
    internal sealed class Sink : IContractOtpSender
    {
        public string Code = "";
        public Task SendAsync(string email, string code, string id, int version, string hash, DateTimeOffset expires, CancellationToken ct)
        { Assert.EndsWith("@example.invalid", email); Code = code; return Task.CompletedTask; }
    }
    internal static async Task<Fixture> Setup(Action<IServiceCollection>? customize = null)
    {
        var sink = new Sink(); var f = await Fixture.Create(s => {
            s.RemoveAll<IContractOtpSender>(); s.AddSingleton<IContractOtpSender>(sink);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("Payment_Test_Only_AtLeast32Bytes_2026_Fixture"));
            customize?.Invoke(s);
        });
        try
        {
            await f.Db.ExecuteAsync("UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';");
            await f.Db.ExecuteAsync("INSERT INTO [USER](UserID,PasswordHash,Role,FullName) VALUES ('manager','test-only','LOGISTICS_MANAGER',N'Payment Manager Fixture');");
            var p = await Data<PublishedContractView>(await f.Publish());
            var code = await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash)));
            await Data<ContractAcceptanceView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign",
                new ContractSignInput(p.Version, p.DocumentHash, code.ChallengeId, sink.Code, true)));
            return f;
        }
        catch { await f.DisposeAsync(); throw; }
    }
    internal static string Path(Fixture f, bool manager = false) => $"/api/{(manager ? "manager" : "customer")}/contracts/{f.ContractId}/payments";
    internal static async Task<HttpResponseMessage> Proof(Fixture f, decimal amount, string key = "proof-001", HttpClient? client = null, string? content = null)
    {
        using var form = new MultipartFormDataContent { { new StringContent(JsonSerializer.Serialize(new BankProofInput(amount, "Demo transfer"), CustomerTransportTests.Json)), "payload" },
            { new ByteArrayContent(Encoding.UTF8.GetBytes(content ?? "%PDF-1.4\nBANK TEST PROOF ONLY\n%%EOF")), "proof", "proof.pdf" } };
        return await Send(client ?? f.Customer, Path(f) + "/bank-proofs", form, key);
    }
    internal static Task<HttpResponseMessage> Confirm(Fixture f, string id, decimal amount, string reference = "BANK-REFERENCE-001", string key = "confirm-001", int version = 1) =>
        Send(f.Manager, Path(f, true) + $"/{id}/confirm", new ConfirmBankPaymentInput(version, amount, reference, f.Clock.Now), key);
    internal static Task<DepositPaymentsView> View(Fixture f) => Get(f);
    private static async Task<DepositPaymentsView> Get(Fixture f) => await Data<DepositPaymentsView>(await f.Customer.GetAsync(Path(f)));
    [LocalSqlFact]
    public async Task Pending_proofs_are_private_and_count_zero_money_rejection_is_audited_and_retry_safe()
    {
        await using var f = await Setup(); using var stranger = f.Factory.Client("other");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(Path(f))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Proof(f, 100, client: f.Manager)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Proof(f, 0)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Proof(f, 100, content: "invalid file content which is not PDF")).StatusCode);
        var v = await Data<DepositPaymentsView>(await Proof(f, 10_000_000)); var p = Assert.Single(v.Payments);
        Assert.Equal(0, p.VerifiedAmount); Assert.Equal(0, v.VerifiedAmount); Assert.Null(v.Activation);
        Assert.Single((await Data<DepositPaymentsView>(await Proof(f, 10_000_000))).Payments);
        Assert.Equal(HttpStatusCode.Conflict, (await Proof(f, 20_000_000)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(Path(f) + $"/{p.PaymentId}/proof")).StatusCode);
        var download = await f.Customer.GetAsync(Path(f) + $"/{p.PaymentId}/proof"); Assert.Equal("no-store", download.Headers.CacheControl!.ToString());
        Assert.Contains("BANK TEST PROOF", await download.Content.ReadAsStringAsync());
        var input = new RejectBankPaymentInput(1, "Không khớp sao kê");
        var rejected = await Data<DepositPaymentsView>(await Send(f.Manager, Path(f, true) + $"/{p.PaymentId}/reject", input, "reject-001"));
        Assert.Equal("REJECTED", Assert.Single(rejected.Payments).Status); Assert.Equal(input.Reason, rejected.Payments[0].Reason);
        await Data<DepositPaymentsView>(await Send(f.Manager, Path(f, true) + $"/{p.PaymentId}/reject", input, "reject-001"));
        Assert.Equal(HttpStatusCode.Conflict, (await Confirm(f, p.PaymentId, 10_000_000)).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal(0, await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
        var text = await (await f.Customer.GetAsync(Path(f))).Content.ReadAsStringAsync(); Assert.DoesNotContain("sha256", text); Assert.DoesNotContain("proofReference", text);
    }
    [LocalSqlFact]
    public async Task Partial_concurrent_receipts_use_actual_money_and_activate_exactly_once_with_excess_preserved()
    {
        await using var f = await Setup();
        var p = (await Data<DepositPaymentsView>(await Proof(f, 40_000_000))).Payments[0];
        var first = await Data<DepositPaymentsView>(await Confirm(f, p.PaymentId, 10_000_000));
        Assert.Equal("PARTIALLY_PAID", first.PaymentStatus); Assert.Equal(36_000_000, first.OutstandingAmount); Assert.Null(first.Activation);
        await Data<DepositPaymentsView>(await Confirm(f, p.PaymentId, 10_000_000));
        Assert.Equal(HttpStatusCode.Conflict, (await Confirm(f, p.PaymentId, 11_000_000)).StatusCode);
        var b = (await Data<DepositPaymentsView>(await Proof(f, 20_000_000, "proof-002"))).Payments.Last();
        var c = (await Data<DepositPaymentsView>(await Proof(f, 20_000_000, "proof-003"))).Payments.Last();
        var results = await Task.WhenAll(Confirm(f, b.PaymentId, 20_000_000, "BANK-002", "confirm-002"), Confirm(f, c.PaymentId, 20_000_000, "BANK-003", "confirm-003"));
        foreach (var r in results) await Data<DepositPaymentsView>(r);
        var v = await View(f); Assert.Equal(50_000_000, v.VerifiedAmount); Assert.Equal(4_000_000, v.ExcessAmount);
        Assert.True(v.FinancialReviewRequired); Assert.Equal("PAID", v.PaymentStatus); Assert.Equal("EFFECTIVE", v.ContractStatus); Assert.Equal("ACTIVATED", v.RequestStatus);
        Assert.NotNull(v.Activation); Assert.False(v.CanSubmit); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN WHERE Status='PLANNING';"));
        Assert.Single((await f.Factory.State("activation", f.ContractId))!.Revisions);
        var acceptance = await Data<ContractAcceptanceView>(await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/acceptance"));
        Assert.NotNull(acceptance.Receipt); Assert.Equal(50_000_000, acceptance.Invoice!.PaidAmount);
    }
    [LocalSqlFact]
    public async Task Duplicate_bank_reference_cannot_credit_two_proofs_and_stale_confirmation_cannot_overwrite()
    {
        await using var f = await Setup();
        var a = (await Data<DepositPaymentsView>(await Proof(f, 100))).Payments[0];
        var b = (await Data<DepositPaymentsView>(await Proof(f, 100, "proof-002"))).Payments.Last();
        var results = await Task.WhenAll(Confirm(f, a.PaymentId, 100), Confirm(f, b.PaymentId, 100, key: "confirm-002"));
        Assert.Single(results, r => r.StatusCode == HttpStatusCode.OK); Assert.Single(results, r => r.StatusCode == HttpStatusCode.Conflict);
        var v = await View(f); Assert.Equal(100, v.VerifiedAmount); Assert.Single(v.Payments, p => p.Status == "SUCCESS");
        Assert.Equal(HttpStatusCode.Conflict, (await Confirm(f, b.PaymentId, 100, "BANK-OTHER", "stale-001", 9)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, Path(f, true) + $"/{a.PaymentId}/confirm", new ConfirmBankPaymentInput(1, 100, "FORBIDDEN", f.Clock.Now))).StatusCode);
    }
    [LocalSqlFact]
    public async Task Effective_extension_controls_new_proofs_late_money_still_records_and_impossible_schedule_requires_review()
    {
        await using var f = await Setup(); var p = await Data<PublishedContractView>(await f.Public());
        var extension = new ExtendContractDeadlineInput(p.Version, p.DocumentHash, 0, p.OriginalCompletionDeadline.AddDays(1), "Wait for bank");
        await Data<ContractDeadlineView>(await Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/extensions", extension));
        f.Clock.Now = p.OriginalCompletionDeadline.AddHours(1);
        var proof = (await Data<DepositPaymentsView>(await Proof(f, 46_000_000))).Payments[0];
        f.Clock.Now = new(2026, 11, 21, 0, 0, 0, TimeSpan.Zero);
        Assert.Equal(HttpStatusCode.Conflict, (await Proof(f, 100, "proof-late")).StatusCode);
        var v = await Data<DepositPaymentsView>(await Confirm(f, proof.PaymentId, 46_000_000));
        Assert.True(v.Payments[0].Late); Assert.True(v.FinancialReviewRequired); Assert.True(v.Activation!.ScheduleNeedsReview);
        Assert.Equal(p.DocumentHash, v.Activation.DocumentHash); Assert.Equal(extension.NewDeadline, v.EffectiveDeadline);
    }
    [LocalSqlFact]
    public async Task Cancelled_request_never_resurrects_when_existing_proof_is_later_verified()
    {
        await using var f = await Setup(); var p = (await Data<DepositPaymentsView>(await Proof(f, 46_000_000))).Payments[0];
        // Models an externally reconciled cancellation; the normal cancellation API will refuse pending money.
        await f.Db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET Status='CANCELLED';");
        var v = await Data<DepositPaymentsView>(await Confirm(f, p.PaymentId, 46_000_000));
        Assert.Equal(46_000_000, v.VerifiedAmount); Assert.True(v.FinancialReviewRequired); Assert.Null(v.Activation);
        Assert.Equal("CANCELLED", v.RequestStatus); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Fault_after_ledger_and_after_trip_flush_rolls_back_all_money_and_retry_creates_one_trip()
    {
        await using var f = await Setup(); var p = (await Data<DepositPaymentsView>(await Proof(f, 46_000_000))).Payments[0];
        foreach (var mode in new[] { "payment-ledger-after-state", "after-save", "activation-after-state" })
        {
            f.Fault.Mode = mode; Assert.Equal(HttpStatusCode.InternalServerError, (await Confirm(f, p.PaymentId, 46_000_000)).StatusCode);
            var v = await View(f); Assert.Equal(0, v.VerifiedAmount); Assert.Null(v.Activation); Assert.Equal("PENDING_CONFIRMATION", v.Payments[0].Status);
            Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;")); Assert.Equal("SIGNED", v.ContractStatus);
        }
        await Data<DepositPaymentsView>(await Confirm(f, p.PaymentId, 46_000_000));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Same_bank_reference_is_rejected_across_different_contracts_in_the_same_database()
    {
        await using var f = await Setup(); var original = f.ContractId;
        var a = (await Data<DepositPaymentsView>(await Proof(f, 100))).Payments[0];
        await Data<DepositPaymentsView>(await Confirm(f, a.PaymentId, 100));
        var horse = await Data<HorseView>(await Send(f.Customer, "/api/customer/horses", CustomerTransportTests.HorseBody(
            CustomerTransportTests.Horse() with { MicrochipIso = "223456789012345", FeiPassportNo = "SECOND-PASSPORT" })), HttpStatusCode.Created);
        var request = await Data<RequestView>(await Send(f.Customer, "/api/customer/requests", CustomerTransportTests.Request(horse.HorseId)), HttpStatusCode.Created);
        var v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{request.RequestId}/accept", new ReviewCommand(0)));
        v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{request.RequestId}/preliminary-plan", new ReviewCommand(v.Version,
            Plan: new(new(2026, 11, 20), new(2026, 11, 25), 2, 1, 1, "Second resources"))));
        v = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{request.RequestId}/contracts", new ReviewCommand(v.Version,
            Lines: [new("TRANSPORT", "Second transport", 1, 115_000_000)])));
        f.ContractId = v.Contract!.ContractId;
        var p = await Data<PublishedContractView>(await Send(f.Manager, $"/api/manager/contracts/{f.ContractId}/send", new PublishContractInput(v.Version, f.Input.CompletionDeadline)));
        var otp = await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(p.Version, p.DocumentHash)));
        var sink = (Sink)f.Factory.Services.GetRequiredService<IContractOtpSender>();
        await Data<ContractAcceptanceView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", new ContractSignInput(p.Version, p.DocumentHash, otp.ChallengeId, sink.Code, true)));
        var b = (await Data<DepositPaymentsView>(await Proof(f, 100))).Payments[0];
        Assert.Contains("DUPLICATE_BANK_REFERENCE", await (await Confirm(f, b.PaymentId, 100)).Content.ReadAsStringAsync());
        Assert.Equal(0, (await View(f)).VerifiedAmount); Assert.Equal(100, await f.Db.ScalarAsync<decimal>("SELECT SUM(PaidAmount) FROM INVOICE;"));
        f.ContractId = original; Assert.Equal(100, (await View(f)).VerifiedAmount);
    }
    [LocalSqlFact]
    public async Task Unsigned_contract_cannot_accept_proof_or_create_a_payment_or_trip()
    {
        await using var f = await Fixture.Create(); await Data<PublishedContractView>(await f.Publish());
        var response = await Proof(f, 100); Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("CONTRACT_NOT_SIGNED", await response.Content.ReadAsStringAsync());
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;")); Assert.Null(await f.Factory.State("payment-ledger", f.ContractId));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Financial_review_is_version_bound_private_and_cannot_erase_partial_money_to_allow_cancellation()
    {
        await using var f = await Setup(); var p = (await Data<DepositPaymentsView>(await Proof(f, 100))).Payments[0];
        var v = await Data<DepositPaymentsView>(await Confirm(f, p.PaymentId, 100)); f.Clock.Now = v.EffectiveDeadline.AddMinutes(1);
        v = await View(f); Assert.True(v.FinancialReviewRequired);
        var review = new AcknowledgeFinancialReviewInput(v.LedgerVersion, v.DeadlineVersion, "INTERNAL_BANK_REVIEW_DECISION", true);
        Assert.Contains("STALE_VERSION", await (await Send(f.Manager, Path(f, true) + "/financial-review", review with { ExpectedLedgerVersion = 99 })).Content.ReadAsStringAsync());
        v = await Data<DepositPaymentsView>(await Send(f.Manager, Path(f, true) + "/financial-review", review, "money-review-001"));
        Assert.False(v.FinancialReviewRequired); Assert.Equal(100, v.VerifiedAmount);
        await Data<DepositPaymentsView>(await Send(f.Manager, Path(f, true) + "/financial-review", review, "money-review-001"));
        var history = await Data<FinancialReviewHistory>(await f.Manager.GetAsync(Path(f, true) + "/financial-review")); Assert.Equal(review.Reason, Assert.Single(history.Items).Reason);
        Assert.Equal(HttpStatusCode.Forbidden, (await f.Customer.GetAsync(Path(f, true) + "/financial-review")).StatusCode);
        Assert.DoesNotContain(review.Reason, await (await f.Customer.GetAsync(Path(f))).Content.ReadAsStringAsync());
        Assert.Contains("FINANCIAL_REVIEW_REQUIRED", await (await Send(f.Manager, Path(f, true) + "/cancel-overdue", new CancelOverdueDepositInput(v.DeadlineVersion, "Cancel", true))).Content.ReadAsStringAsync());
        Assert.Equal("AWAITING_DEPOSIT", (await View(f)).RequestStatus);
    }
    [LocalSqlFact]
    public async Task Corrupt_invoice_or_payment_projection_stops_before_any_new_money_is_written()
    {
        await using var f = await Setup(); var p = (await Data<DepositPaymentsView>(await Proof(f, 100))).Payments[0];
        await f.Db.ExecuteAsync("UPDATE INVOICE SET PaidAmount=123;");
        Assert.Contains("LEDGER_CONFLICT", await (await Confirm(f, p.PaymentId, 100)).Content.ReadAsStringAsync());
        await f.Db.ExecuteAsync("UPDATE INVOICE SET PaidAmount=0; UPDATE PAYMENT SET Amount=123;");
        Assert.Contains("LEDGER_CONFLICT", await (await f.Customer.GetAsync(Path(f))).Content.ReadAsStringAsync());
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
}
