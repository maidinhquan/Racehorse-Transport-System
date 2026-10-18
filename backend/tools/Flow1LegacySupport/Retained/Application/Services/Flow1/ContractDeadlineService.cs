using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed class ContractDeadlineService(IRequestReviewRepository lookup, IFlow1Repository repo, IFlow1StateStore state,
    Flow1RequestTransaction transactions, ContractPublicationService publications, ContractAcceptanceService acceptance,
    ContractDeadlinePolicy policy, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static void Require(bool ok, string code, string message) { if (!ok) throw Error(message, code, 409); }
    private async Task<T> Read<T>(string type, string id, CancellationToken ct)
    {
        var d = await state.ReadAsync(type, id, ct) ?? throw Error("Contract evidence unavailable.", "STATE_UNAVAILABLE", 409);
        return d.Revisions[^1].Payload.Deserialize<T>(Json) ?? throw Error("Contract evidence unavailable.", "STATE_UNAVAILABLE", 409);
    }
    private async Task<Contract> Locate(string id, string actor, bool manager, CancellationToken ct)
    {
        var row = await lookup.ContractAsync(id, ct);
        if (row is null || !manager && row.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        return row;
    }
    private sealed record Context(Contract Contract, TransportRequest Request, ContractPublication Publication,
        DraftSnapshot Draft, ReviewState Review, ContractDeadlinePolicy.Resolved Deadline, Invoice? Invoice, bool CanExtend);
    private async Task<Context> Load(string id, string requestId, CancellationToken ct)
    {
        var c = await repo.GetContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        var r = await repo.GetRequestAsync(requestId, ct) ?? throw Error("Request not found.", "NOT_FOUND", 404);
        var p = await Read<ContractPublication>("publication", id, ct); var draft = await Read<DraftSnapshot>("contract", id, ct);
        var review = await Read<ReviewState>("review", requestId, ct);
        Require(p.Outcome == "COMMITTED" && p.ContractId == id && p.RequestId == requestId && c.RequestId == requestId &&
            c.CustomerId == r.CustomerId && p.CustomerId == c.CustomerId && c.CompletionDeadline == p.CompletionDeadline.UtcDateTime &&
            CustomerTransportService.Hash(draft) == p.DraftHash && c.TotalQuotedPrice == draft.Total && c.CurrencyCode == "VND" && c.DepositRateStandard == 40,
            "STATE_CONFLICT", "Issued deadline/terms differ from SQL.");
        var deadline = await policy.ReadAsync(p, draft, ct); var invoice = await repo.GetDepositInvoiceAsync(id, ct);
        var unsigned = c.ContractStatus == "PENDING_SIGNATURE" && c.SignedAt is null && r.Status == "AWAITING_CONTRACT" && invoice is null;
        var signed = c.ContractStatus == "SIGNED" && c.SignedAt is not null && r.Status == "AWAITING_DEPOSIT" && invoice is not null &&
            invoice.CurrencyCode == "VND" && invoice.TotalPayableAmount == draft.Deposit && invoice.PaidAmount >= 0 &&
            invoice.PaidAmount < invoice.TotalPayableAmount && (invoice.PaymentStatus is "UNPAID" or "PARTIALLY_PAID");
        if (signed)
        {
            var a = await Read<AcceptanceState>("acceptance", id, ct); var e = a.Operation.Evidence;
            Require(a.Operation.Outcome == "COMMITTED" && e.ContractId == id && e.CustomerId == c.CustomerId && e.Method == "EMAIL_OTP" &&
                e.DocumentHash == p.Document.Sha256 && e.ContractVersion == p.ContractVersion && e.SignedAtUtc == c.SignedAt &&
                e.Deposit == draft.Deposit && e.InvoiceId == invoice!.InvoiceId &&
                e.InvoiceDueAtUtc == ContractDeadlinePolicy.SqlTime(deadline.AtVersion(e.DeadlineVersion)) &&
                invoice.DueDate == ContractDeadlinePolicy.SqlTime(deadline.Effective), "STATE_CONFLICT", "Signed invoice/deadline evidence differs from SQL.");
        }
        var can = (unsigned || signed) && review.CurrentContractId == id && !review.Changes.Any(x => x.Status == "PENDING") &&
            c.TripId is null && await repo.GetTripForRequestAsync(requestId, ct) is null &&
            draft.Plan.Input.PlannedDepartureAt is not null &&
            draft.Plan.Input.PlannedDepartureAt.Value.AddDays(-draft.Plan.Input.PreparationDays) > (clock.GetUtcNow() > deadline.Effective ? clock.GetUtcNow() : deadline.Effective);
        return new(c, r, p, draft, review, deadline, invoice, can);
    }
    public async Task<ContractDeadlineView> GetAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var row = await Locate(id, actor, manager, ct); await publications.GetAsync(id, actor, manager, ct);
        return await transactions.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, token);
            return new ContractDeadlineView(id, x.Deadline.Version, x.Deadline.Original, x.Deadline.Effective,
                clock.GetUtcNow() >= x.Deadline.Effective, manager && x.CanExtend,
                x.Deadline.Extensions.Select(e => new ContractDeadlineHistoryItem(e.ExtensionVersion, e.PreviousDeadline, e.NewDeadline, e.AtUtc,
                    manager ? e.Reason : null, manager ? e.Actor : null)).ToArray());
        }, ct);
    }
    public async Task<ContractDeadlineView> ExtendAsync(string id, string actor, string key, ExtendContractDeadlineInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "REASON_REQUIRED", "Enter an extension reason.");
        input = input with { NewDeadline = input.NewDeadline.ToUniversalTime() };
        var row = await Locate(id, actor, true, ct);
        await publications.GetAsync(id, actor, true, ct); await acceptance.GetAsync(id, actor, true, ct);
        var hash = CustomerTransportService.Hash(new { actor, input });
        await transactions.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, token);
            var prior = x.Deadline.Extensions.SingleOrDefault(e => e.Key == key);
            if (prior is not null)
            { Require(prior.InputHash == hash && prior.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used for another extension."); return 0; }
            Require(x.CanExtend, "DEADLINE_EXTENSION_CLOSED", "Only a current unsigned or signed contract awaiting deposit can be extended.");
            Require(input.ContractVersion == x.Publication.ContractVersion && input.DocumentHash == x.Publication.Document.Sha256,
                "STALE_DOCUMENT", "Extension must refer to the exact issued PDF.");
            Require(input.ExpectedExtensionVersion == x.Deadline.Version, "STALE_VERSION", "Deadline changed; reload.");
            Require(input.NewDeadline > x.Deadline.Effective && input.NewDeadline > clock.GetUtcNow() &&
                input.NewDeadline <= x.Draft.Plan.Input.PlannedDepartureAt!.Value.AddDays(-x.Draft.Plan.Input.PreparationDays),
                "DEPARTURE_SCHEDULE_NOT_FEASIBLE", "New deadline must increase and preserve the frozen preparation interval.");
            var e = new ContractDeadlineExtension(key, hash, actor, input.Reason.Trim(), id, row.RequestId, input.ContractVersion,
                input.DocumentHash, x.Deadline.Version + 1, x.Deadline.Original, x.Deadline.Effective, input.NewDeadline, clock.GetUtcNow());
            await state.AppendAsync("extensions", id, x.Deadline.Version, "extend-" + key, actor, "DEADLINE_EXTENDED", JsonSerializer.SerializeToElement(e, Json), token);
            if (x.Invoice is not null) x.Invoice.DueDate = ContractDeadlinePolicy.SqlTime(input.NewDeadline);
            var otp = await state.ReadAsync("contract-otp", id, token);
            if (otp is not null)
            {
                var value = otp.Revisions[^1].Payload.Deserialize<ContractOtpState>(Json)!;
                if (!value.Consumed && !value.Revoked) await state.AppendAsync("contract-otp", id, otp.Revisions.Count,
                    "revoke-extension-" + key, actor, "REVOKED", JsonSerializer.SerializeToElement(value with { Revoked = true }, Json), token);
            }
            return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
}
