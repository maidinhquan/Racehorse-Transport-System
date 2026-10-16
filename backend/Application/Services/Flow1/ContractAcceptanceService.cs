using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

/// <summary>SQL status/invoice and private acceptance evidence use prepare/commit/reconcile under the request lock.</summary>
public sealed class ContractAcceptanceService(IRequestReviewRepository lookup, IFlow1Repository repo, IFlow1UnitOfWork work,
    IFlow1MetadataStore metadata, IFlow1PrivateFileStore files, ContractPublicationService publications,
    CustomerTransportService customers, IContractOtpSecurity security, IContractOtpSender sender, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static T Payload<T>(Flow1MetadataRevision r) => r.Payload.Deserialize<T>(Json) ?? throw new InvalidDataException("Missing contract evidence.");
    private static void Require(bool condition, string code, string message) { if (!condition) throw Error(message, code, 409); }
    private async Task<(int Version, T Value)?> Read<T>(string type, string id, CancellationToken ct)
    {
        var doc = await metadata.ReadAsync(type, id, ct);
        return doc is null ? null : (doc.Revisions.Count, Payload<T>(doc.Revisions[^1]));
    }
    private Task<Flow1MetadataRevision> Append<T>(string type, string id, int version, string key, string actor, string action, T payload, CancellationToken ct) =>
        metadata.AppendAsync(type, id, version, key, actor, action, JsonSerializer.SerializeToElement(payload, Json), ct);
    private async Task<Contract> Locate(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await lookup.ContractAsync(id, ct);
        if (c is null || !manager && c.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        return c;
    }
    private sealed record Context(Contract Contract, TransportRequest Request, ContractPublication Publication, RequestSnapshot Canonical);
    // Called only under request lock. Horse locks precede tracked SQL reads, including retries/recovery.
    private async Task<Context> Load(string id, string requestId, bool current, CancellationToken ct)
    {
        var canonical = await Read<RequestSnapshot>("request", requestId, ct) ?? throw Error("Request evidence unavailable.", "METADATA_UNAVAILABLE", 409);
        await work.LockHorsesAsync(canonical.Value.Input.Horses.Select(h => h.HorseId), ct);
        var c = await repo.GetContractAsync(id, ct); var r = await repo.GetRequestAsync(requestId, ct);
        var pub = await Read<ContractPublication>("publication", id, ct);
        Require(c is not null && r is not null && pub is not null, "METADATA_UNAVAILABLE", "Issued contract evidence unavailable.");
        var p = pub!.Value.Value;
        Require(p.Outcome == "COMMITTED" && p.ContractId == id && p.RequestId == requestId && c!.RequestId == requestId &&
            c.CustomerId == p.CustomerId && r!.CustomerId == p.CustomerId && c.CompletionDeadline == p.CompletionDeadline.UtcDateTime,
            "RECOVERY_CONFLICT", "SQL contract and issued evidence do not match.");
        var draft = await Read<DraftSnapshot>("contract", id, ct);
        Require(draft is not null && draft.Value.Version == p.ContractVersion && CustomerTransportService.Hash(draft.Value.Value) == p.DraftHash &&
            c!.TotalQuotedPrice == draft.Value.Value.Total && c.CurrencyCode == "VND" && c.DepositRateStandard == 40 &&
            draft.Value.Value.Deposit == Application.Common.Flow1.Flow1ContractFactory.DepositAmount(c.TotalQuotedPrice!.Value),
            "RECOVERY_CONFLICT", "Frozen contract amount/version does not match SQL.");
        await files.ReadAsync(new(p.Document.PrivateStorageKey, p.Document.Sha256, "application/pdf", checked((int)p.Document.SizeBytes)), ct);
        if (current)
        {
            var review = await Read<ReviewState>("review", requestId, ct); var plan = await Read<PreliminaryPlan>("plan", requestId, ct);
            Require(review is not null && review.Value.Version == p.ReviewVersion && review.Value.Value.CurrentContractId == id &&
                review.Value.Value.Pending is null && !review.Value.Value.Changes.Any(x => x.Status == "PENDING") &&
                canonical.Version == p.RequestVersion && plan?.Version == p.PlanVersion,
                "STALE_VERSION", "Reload the current issued contract and resolve pending changes.");
        }
        return new(c!, r!, p, canonical.Value);
    }
    private void Open(Context x) => Require(x.Contract.ContractStatus == "PENDING_SIGNATURE" && x.Contract.SignedAt is null &&
        x.Contract.TripId is null && x.Request.Status == "AWAITING_CONTRACT" && clock.GetUtcNow() < x.Publication.CompletionDeadline,
        "SIGNING_CLOSED", "Contract is not awaiting signature or its completion deadline has passed; contact Manager.");
    private static void Bound(Context x, int version, string hash) => Require(version == x.Publication.ContractVersion && hash == x.Publication.Document.Sha256,
        "STALE_DOCUMENT", "The code/confirmation must refer to the exact issued PDF version and hash.");
    private string CodeDigest(ContractOtpState otp, string code) => security.Digest("code", JsonSerializer.Serialize(new {
        otp.ChallengeId, otp.CustomerId, otp.ContractVersion, otp.DocumentHash, otp.EmailDigest, code }, Json));
    private async Task<string> CustomerEmail(Context x, CancellationToken ct)
    {
        var user = await repo.GetCustomerAsync(x.Contract.CustomerId, ct);
        if (user is null || !user.IsActive || string.IsNullOrWhiteSpace(user.Email))
            throw Error("The customer needs an active account and a configured email address.", "CONTRACT_EMAIL_REQUIRED", 409);
        return user.Email.Trim();
    }
    private static void NoPending((int Version, AcceptanceState Value)? state) => Require(state?.Value.Operation.Outcome != "PREPARED",
        "ACCEPTANCE_RECOVERY_REQUIRED", "Resolve the prepared acceptance before requesting another code.");

    public async Task<ContractOtpView> SendOtpAsync(string id, string actor, ContractOtpInput input, CancellationToken ct)
    {
        var row = await Locate(id, actor, false, ct);
        // Reconcile a committed publication before entering the acceptance transaction (no nested UoW).
        await publications.GetAsync(id, actor, false, ct);
        var accountId = "oa-" + CustomerTransportService.Hash(actor)[..32];
        // Persistent account budget across contracts/restarts. Failed sends also consume a slot.
        await work.ExecuteAsync(accountId, async token => {
            var old = await Read<ContractOtpAccount>("otp-account", accountId, token);
            var sends = (old?.Value.Sends ?? []).Where(t => t > clock.GetUtcNow().AddMinutes(-15)).ToArray();
            Require(sends.Length < 5, "OTP_RATE_LIMITED", "Too many code requests for this account; retry in 15 minutes.");
            await Append("otp-account", accountId, old?.Version ?? 0, Guid.NewGuid().ToString("N"), actor, "RESERVED",
                new ContractOtpAccount([.. sends, clock.GetUtcNow()]), token); return 0;
        }, ct);
        var code = security.NewCode();
        var delivery = await work.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, true, token); Open(x); Bound(x, input.ContractVersion, input.DocumentHash);
            NoPending(await Read<AcceptanceState>("acceptance", id, token));
            var old = await Read<ContractOtpState>("contract-otp", id, token);
            Require(old is null || clock.GetUtcNow() >= old.Value.Value.SentAt.AddSeconds(60), "OTP_COOLDOWN", "Wait 60 seconds before requesting another code.");
            var email = await CustomerEmail(x, token); var now = clock.GetUtcNow();
            var expires = now.AddMinutes(5) < x.Publication.CompletionDeadline ? now.AddMinutes(5) : x.Publication.CompletionDeadline;
            var otp = new ContractOtpState("otp-" + Guid.NewGuid().ToString("N"), actor, input.ContractVersion, input.DocumentHash,
                security.Digest("email", email.ToUpperInvariant()), "", expires, now);
            otp = otp with { CodeDigest = CodeDigest(otp, code) };
            await Append("contract-otp", id, old?.Version ?? 0, otp.ChallengeId, actor, "DELIVERING", otp, token);
            return (Otp: otp, Email: email);
        }, ct);
        try
        {
            await sender.SendAsync(delivery.Email, code, id, input.ContractVersion, input.DocumentHash, delivery.Otp.ExpiresAt, ct);
            await Delivery("DELIVERED", ct);
        }
        catch
        {
            // DELIVERING is never accepted after a delivery crash, even if the SMTP server received the email.
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            try { await Delivery("FAILED", cleanup.Token); } catch { /* Fail closed; no code/body in diagnostics. */ }
            throw;
        }
        return new(delivery.Otp.ChallengeId, delivery.Otp.ExpiresAt, delivery.Otp.SentAt.AddSeconds(60));

        async Task Delivery(string status, CancellationToken token) => await work.ExecuteAsync(row.RequestId, async t => {
            var old = await Read<ContractOtpState>("contract-otp", id, t);
            Require(old?.Value.ChallengeId == delivery.Otp.ChallengeId && old.Value.Value.Delivery == "DELIVERING",
                "OTP_SUPERSEDED", "A newer code request replaced this delivery; reload.");
            await Append("contract-otp", id, old!.Value.Version, delivery.Otp.ChallengeId + "-" + status, actor, status,
                old.Value.Value with { Delivery = status }, t); return 0;
        }, token);
    }

    public async Task<ContractAcceptanceView> SignAsync(string id, string actor, string key, ContractSignInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(input.AcceptedTerms, "CONSENT_REQUIRED", "Confirm that you reviewed and accept this PDF.");
        var row = await Locate(id, actor, false, ct);
        await publications.GetAsync(id, actor, false, ct);
        // Keyed digest prevents offline brute force of six digits from persisted idempotency evidence.
        var digest = security.Digest("sign-input", JsonSerializer.Serialize(new { actor, input }, Json));
        var result = await work.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, true, token);
            var doc = await metadata.ReadAsync("acceptance", id, token);
            var prior = doc?.Revisions.Select(Payload<AcceptanceState>).LastOrDefault(s => s.Operation.Key == key)?.Operation;
            if (prior is not null)
            {
                Require(prior.Actor == actor && security.Matches(prior.InputDigest, digest), "IDEMPOTENCY_KEY_REUSED", "Key was used for different confirmation input.");
                Require(prior.Outcome != "ABORTED", "OPERATION_ABORTED", "Prepared acceptance was discarded; request a new code and use a new key.");
            }
            var state = doc is null ? null : Payload<AcceptanceState>(doc.Revisions[^1]);
            if (state?.Operation.Outcome == "COMMITTED")
            { Require(prior?.Key == state.Operation.Key, "ALREADY_SIGNED", "This contract is already confirmed."); return true; }
            if (state?.Operation.Outcome == "PREPARED")
            {
                Require(prior?.Key == state.Operation.Key, "ACCEPTANCE_RECOVERY_REQUIRED", "Retry the prepared confirmation or ask Manager to recover it.");
                if (!await After(x, state.Operation.Evidence, token)) await Apply(x, state.Operation, token);
                return true;
            }
            Open(x); Bound(x, input.ContractVersion, input.DocumentHash);
            Require(await repo.GetDepositInvoiceAsync(id, token) is null, "RECOVERY_CONFLICT", "An invoice already exists before confirmation.");
            var otp = await Read<ContractOtpState>("contract-otp", id, token);
            var email = await CustomerEmail(x, token);
            Require(otp is not null && otp.Value.Value.ChallengeId == input.ChallengeId && otp.Value.Value.CustomerId == actor &&
                otp.Value.Value.ContractVersion == input.ContractVersion && otp.Value.Value.DocumentHash == input.DocumentHash &&
                otp.Value.Value.EmailDigest == security.Digest("email", email.ToUpperInvariant()) && otp.Value.Value.Delivery == "DELIVERED" &&
                !otp.Value.Value.Consumed && otp.Value.Value.Attempts < 5 && clock.GetUtcNow() < otp.Value.Value.ExpiresAt,
                "OTP_INVALID_OR_EXPIRED", "Code is unavailable, replaced, locked or expired; request a new code.");
            if (!security.Matches(otp!.Value.Value.CodeDigest, CodeDigest(otp.Value.Value, input.Otp)))
            {
                var failed = otp.Value.Value with { Attempts = otp.Value.Value.Attempts + 1 };
                await Append("contract-otp", id, otp.Value.Version, "attempt-" + Guid.NewGuid().ToString("N"), actor, "FAILED_ATTEMPT", failed, token);
                return false;
            }
            // Legacy SignedAt/Invoice.DueDate are SQL datetime: whole seconds avoid rounding conflicts on recovery.
            var signed = DateTimeOffset.FromUnixTimeSeconds(clock.GetUtcNow().ToUnixTimeSeconds()).UtcDateTime;
            var due = DateTimeOffset.FromUnixTimeSeconds(x.Publication.CompletionDeadline.ToUnixTimeSeconds()).UtcDateTime;
            var evidence = new ContractAcceptance(id, actor, input.ContractVersion, input.DocumentHash, input.ChallengeId, "EMAIL_OTP",
                signed, "di-" + CustomerTransportService.Hash(id + "/DEPOSIT")[..32],
                Application.Common.Flow1.Flow1ContractFactory.DepositAmount(x.Contract.TotalQuotedPrice!.Value), due);
            var operation = new AcceptanceOperation(key, digest, actor, evidence);
            await Append("acceptance", id, doc?.Revisions.Count ?? 0, "prepare-" + key, actor, "PREPARED", new AcceptanceState(operation), token);
            await Apply(x, operation, token); return true;
        }, ct);
        if (!result) throw Error("Incorrect confirmation code.", "OTP_INCORRECT", 409);
        return await GetAsync(id, actor, false, ct);
    }
    private static void Evidence(Context x, ContractAcceptance e) => Require(e.ContractId == x.Contract.ContractId && e.CustomerId == x.Contract.CustomerId &&
        e.ContractVersion == x.Publication.ContractVersion && e.DocumentHash == x.Publication.Document.Sha256 && e.Method == "EMAIL_OTP" &&
        e.Deposit == Application.Common.Flow1.Flow1ContractFactory.DepositAmount(x.Contract.TotalQuotedPrice!.Value) &&
        e.InvoiceId == "di-" + CustomerTransportService.Hash(e.ContractId + "/DEPOSIT")[..32] &&
        e.InvoiceDueAtUtc == DateTimeOffset.FromUnixTimeSeconds(x.Publication.CompletionDeadline.ToUnixTimeSeconds()).UtcDateTime,
        "RECOVERY_CONFLICT", "Acceptance evidence differs from the issued contract.");
    private async Task<bool> Before(Context x, CancellationToken ct) => x.Contract.ContractStatus == "PENDING_SIGNATURE" &&
        x.Request.Status == "AWAITING_CONTRACT" && x.Contract.SignedAt is null && x.Contract.TripId is null && await repo.GetDepositInvoiceAsync(x.Contract.ContractId, ct) is null;
    private async Task<bool> After(Context x, ContractAcceptance e, CancellationToken ct)
    {
        Evidence(x, e); var invoice = await repo.GetDepositInvoiceAsync(x.Contract.ContractId, ct);
        return x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" && x.Contract.SignedAt == e.SignedAtUtc && x.Contract.TripId is null &&
            invoice is not null && invoice.InvoiceId == e.InvoiceId && invoice.TotalPayableAmount == e.Deposit && invoice.CurrencyCode == "VND" &&
            invoice.PaidAmount == 0 && invoice.PaymentStatus == "UNPAID" && invoice.DueDate == e.InvoiceDueAtUtc;
    }
    private async Task Apply(Context x, AcceptanceOperation op, CancellationToken ct)
    {
        Open(x); Evidence(x, op.Evidence);
        Require(await Before(x, ct), "RECOVERY_CONFLICT", "Prepared acceptance does not match the SQL before state.");
        var otp = await Read<ContractOtpState>("contract-otp", x.Contract.ContractId, ct);
        var email = await CustomerEmail(x, ct);
        Require(otp is not null && otp.Value.Value.ChallengeId == op.Evidence.ChallengeId && otp.Value.Value.CustomerId == op.Actor &&
            otp.Value.Value.ContractVersion == op.Evidence.ContractVersion && otp.Value.Value.DocumentHash == op.Evidence.DocumentHash &&
            otp.Value.Value.EmailDigest == security.Digest("email", email.ToUpperInvariant()) && otp.Value.Value.Delivery == "DELIVERED" &&
            otp.Value.Value.Attempts < 5 && clock.GetUtcNow() < otp.Value.Value.ExpiresAt,
            "OTP_INVALID_OR_EXPIRED", "Prepared confirmation expired; Manager must discard it before a new code can be sent.");
        await customers.ValidateHorsesAsync(x.Contract.CustomerId, x.Canonical.Input, x.Contract.RequestId, ct);
        if (!otp!.Value.Value.Consumed) await Append("contract-otp", x.Contract.ContractId, otp.Value.Version, "consume-" + op.Evidence.ChallengeId,
            op.Actor, "CONSUMED", otp.Value.Value with { Consumed = true }, ct);
        x.Contract.SignedAt = op.Evidence.SignedAtUtc; x.Contract.ContractStatus = "SIGNED"; x.Request.Status = "AWAITING_DEPOSIT";
        repo.AddInvoice(new() { InvoiceId = op.Evidence.InvoiceId, ContractId = x.Contract.ContractId, InvoiceType = "DEPOSIT", CurrencyCode = "VND",
            TotalPayableAmount = op.Evidence.Deposit, PaidAmount = 0, DueDate = op.Evidence.InvoiceDueAtUtc, PaymentStatus = "UNPAID" });
    }
    public async Task<ContractAcceptanceView> GetAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var row = await Locate(id, actor, manager, ct);
        await publications.GetAsync(id, actor, manager, ct);
        return await work.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, false, token);
            var state = await Read<AcceptanceState>("acceptance", id, token);
            if (state?.Value.Operation.Outcome == "PREPARED" && await After(x, state.Value.Value.Operation.Evidence, token))
            {
                var done = state.Value.Value with { Operation = state.Value.Value.Operation with { Outcome = "COMMITTED" } };
                await Append("acceptance", id, state.Value.Version, "complete-" + done.Operation.Key, actor, "COMPLETED", done, token);
                state = (state.Value.Version + 1, done);
            }
            var pending = state?.Value.Operation.Outcome == "PREPARED";
            ContractAcceptance? receipt = state?.Value.Operation.Outcome == "COMMITTED" ? state.Value.Value.Operation.Evidence : null;
            var invoice = await repo.GetDepositInvoiceAsync(id, token);
            if (receipt is not null)
            {
                Evidence(x, receipt);
                Require(x.Contract.SignedAt == receipt.SignedAtUtc && invoice?.InvoiceId == receipt.InvoiceId && invoice.TotalPayableAmount == receipt.Deposit && invoice.CurrencyCode == "VND",
                    "RECOVERY_CONFLICT", "SQL signed timestamp or deposit invoice differs from acceptance evidence.");
            }
            Require(receipt is not null || pending || x.Contract.SignedAt is null && invoice is null, "RECOVERY_CONFLICT", "SQL confirmation has no matching private receipt.");
            return new ContractAcceptanceView(id, state?.Version ?? 0, x.Contract.ContractStatus, clock.GetUtcNow() >= x.Publication.CompletionDeadline,
                pending, receipt, invoice is null ? null : new(invoice.InvoiceId, invoice.TotalPayableAmount, invoice.PaidAmount, invoice.CurrencyCode, invoice.PaymentStatus,
                    invoice.DueDate is null ? null : DateTime.SpecifyKind(invoice.DueDate.Value, DateTimeKind.Utc)));
        }, ct);
    }
    public async Task<ContractAcceptanceView> RecoverAsync(string id, string actor, CancellationToken ct)
    {
        var current = await GetAsync(id, actor, true, ct); if (!current.RecoveryRequired) return current;
        var row = await Locate(id, actor, true, ct);
        await work.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, true, token); var state = await Read<AcceptanceState>("acceptance", id, token);
            Require(state?.Value.Operation.Outcome == "PREPARED", "STALE_VERSION", "Reload the prepared acceptance.");
            if (!await After(x, state!.Value.Value.Operation.Evidence, token)) await Apply(x, state.Value.Value.Operation, token);
            return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
    public async Task<ContractAcceptanceView> DiscardAsync(string id, string actor, string reason, CancellationToken ct)
    {
        Require(!string.IsNullOrWhiteSpace(reason) && reason.Length <= 2000, "REASON_REQUIRED", "Enter a discard reason.");
        var row = await Locate(id, actor, true, ct);
        await work.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, false, token); var state = await Read<AcceptanceState>("acceptance", id, token);
            Require(state?.Value.Operation.Outcome == "PREPARED" && await Before(x, token), "RECOVERY_CONFLICT", "Cannot discard acceptance already committed in SQL.");
            var op = state!.Value.Value.Operation;
            var otp = await Read<ContractOtpState>("contract-otp", id, token);
            if (otp is not null && !otp.Value.Value.Consumed) await Append("contract-otp", id, otp.Value.Version, "abort-" + op.Key, actor, "CONSUMED", otp.Value.Value with { Consumed = true }, token);
            await Append("acceptance", id, state.Value.Version, "abort-" + op.Key, actor, "ABORTED",
                new AcceptanceState(op with { Outcome = "ABORTED", Reason = reason.Trim() }), token);
            return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
}
