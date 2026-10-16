using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

/// <summary>Only verified receipts count as money. Ledger, invoice, activation and Trip share one SQL transaction.</summary>
public sealed partial class DepositPaymentService(IRequestReviewRepository lookup, IFlow1Repository repo, IFlow1UnitOfWork work,
    IFlow1StateStore state, IFlow1PrivateFileStore files, Flow1RequestTransaction transactions,
    ContractDeadlinePolicy deadlines, TimeProvider clock, IFlow1PaymentGateway gateway)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static void Require(bool ok, string code, string message) { if (!ok) throw Error(message, code, 409); }
    private static void Money(decimal amount) => Require(amount > 0 && amount <= 9_999_999_999m && amount == decimal.Truncate(amount),
        "INVALID_AMOUNT", "Enter a positive whole VND amount within the supported limit.");
    private async Task<T> Read<T>(string type, string id, CancellationToken ct)
    {
        var d = await state.ReadAsync(type, id, ct) ?? throw Error("Required contract evidence unavailable.", "STATE_UNAVAILABLE", 409);
        return d.Revisions[^1].Payload.Deserialize<T>(Json) ?? throw Error("Required contract evidence unavailable.", "STATE_UNAVAILABLE", 409);
    }
    private async Task<Contract> Locate(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await lookup.ContractAsync(id, ct);
        if (c is null || !manager && c.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        return c;
    }
    private sealed record Context(Contract Contract, TransportRequest Request, ContractPublication Publication,
        DraftSnapshot Draft, Invoice Invoice, ContractDeadlinePolicy.Resolved Deadline, Flow1StateDocument? Ledger,
        DepositPaymentEvent[] Events, IReadOnlyList<Payment> Payments, ActivationReceipt? Activation, bool Current, bool CallbackConflict, bool FinancialReviewed);
    private async Task<Context> Load(string id, string requestId, CancellationToken ct)
    {
        var c = await repo.GetContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        var r = await repo.GetRequestAsync(requestId, ct) ?? throw Error("Request not found.", "NOT_FOUND", 404);
        Require(c.SignedAt is not null, "CONTRACT_NOT_SIGNED", "Confirm the issued contract before making a deposit.");
        var p = await Read<ContractPublication>("publication", id, ct); var d = await Read<DraftSnapshot>("contract", id, ct);
        var a = await Read<AcceptanceState>("acceptance", id, ct); var receipt = a.Operation.Evidence;
        var review = await Read<ReviewState>("review", requestId, ct);
        var deadline = await deadlines.ReadAsync(p, d, ct);
        var i = await repo.GetDepositInvoiceAsync(id, ct) ?? throw Error("Signed deposit invoice unavailable.", "STATE_UNAVAILABLE", 409);
        Require(p.Outcome == "COMMITTED" && p.ContractId == id && p.RequestId == requestId && c.RequestId == requestId &&
            c.CustomerId == r.CustomerId && c.CustomerId == p.CustomerId && c.CompletionDeadline == p.CompletionDeadline.UtcDateTime &&
            CustomerTransportService.Hash(d) == p.DraftHash && c.TotalQuotedPrice == d.Total && c.CurrencyCode == "VND" &&
            c.DepositRateStandard == 40 && d.Deposit == Flow1ContractFactory.DepositAmount(d.Total) &&
            a.Operation.Outcome == "COMMITTED" && receipt.ContractId == id && receipt.CustomerId == c.CustomerId &&
            receipt.ContractVersion == p.ContractVersion && receipt.DocumentHash == p.Document.Sha256 && receipt.Method == "EMAIL_OTP" &&
            c.SignedAt == receipt.SignedAtUtc && receipt.Deposit == d.Deposit && receipt.InvoiceId == i.InvoiceId &&
            receipt.InvoiceDueAtUtc == ContractDeadlinePolicy.SqlTime(deadline.AtVersion(receipt.DeadlineVersion)) &&
            i.CurrencyCode == "VND" && i.TotalPayableAmount == d.Deposit && i.DueDate == ContractDeadlinePolicy.SqlTime(deadline.Effective),
            "STATE_CONFLICT", "Signed contract/invoice evidence differs from SQL.");
        var ledger = await state.ReadAsync("payment-ledger", id, ct);
        var events = ledger?.Revisions.Select(x => x.Payload.Deserialize<DepositPaymentEvent>(Json) ?? throw new InvalidDataException("Invalid ledger.")).ToArray() ?? [];
        var payments = await repo.GetPaymentsAsync(i.InvoiceId, ct);
        var latest = events.GroupBy(x => x.PaymentId).Select(g => g.Last()).ToArray();
        Require(payments.Count == latest.Length && latest.All(e => e.InvoiceId == i.InvoiceId && payments.Any(v =>
            v.PaymentId == e.PaymentId && v.Status == e.Status && v.Amount == e.Amount && v.CurrencyCode == "VND" &&
            v.Method == e.Method && v.TransactionCode == e.Reference && (v.Status == "SUCCESS" ? v.Amount > 0 && e.ReceivedAtUtc.HasValue &&
                v.PaymentDate == ContractDeadlinePolicy.SqlTime(e.ReceivedAtUtc.Value) && (e.Method == "VNPAY" ? v.ConfirmedByUserId is null : v.ConfirmedByUserId == e.Actor) : v.Amount == 0))),
            "LEDGER_CONFLICT", "Payment rows differ from the committed ledger; reconciliation required.");
        var paid = payments.Where(v => v.Status == "SUCCESS").Sum(v => v.Amount);
        Require(i.PaidAmount == paid && i.PaymentStatus == Status(paid, i.TotalPayableAmount),
            "LEDGER_CONFLICT", "Invoice balance differs from verified receipts; reconciliation required.");
        var activationDoc = await state.ReadAsync("activation", id, ct);
        var activation = activationDoc?.Revisions[^1].Payload.Deserialize<ActivationReceipt>(Json);
        var trip = await repo.GetTripForRequestAsync(requestId, ct);
        if (activation is not null)
            Require(activationDoc!.Revisions.Count == 1 && activation.ContractId == id && activation.RequestId == requestId &&
                activation.InvoiceId == i.InvoiceId && activation.DocumentHash == p.Document.Sha256 && activation.RequiredDeposit == d.Deposit &&
                activation.VerifiedAmount >= d.Deposit && paid >= activation.VerifiedAmount && c.TripId == activation.TripId &&
                trip?.TripId == activation.TripId, "ACTIVATION_CONFLICT", "Activation evidence differs from SQL.");
        else Require(c.TripId is null && trip is null && c.ContractStatus != "EFFECTIVE", "ACTIVATION_CONFLICT", "Trip exists without activation receipt.");
        var financial = await state.ReadAsync("financial-review", id, ct);
        var reviewed = financial?.Revisions.LastOrDefault(v => v.Action == "RECEIPTS_REVIEWED")?.Payload;
        return new(c, r, p, d, i, deadline, ledger, events, payments, activation,
            review.CurrentContractId == id && !review.Changes.Any(x => x.Status == "PENDING"), financial?.Revisions.Any(v => v.Action == "CALLBACK_CONFLICT") == true,
            reviewed?.GetProperty("binding").GetString() == FinancialBinding(id, i.InvoiceId, paid, events.Length, deadline.Version));
    }
    private static string Status(decimal paid, decimal due) => paid == 0 ? "UNPAID" : paid < due ? "PARTIALLY_PAID" : "PAID";
    private bool CanSubmit(Context x) => x.Current && x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" &&
        x.Activation is null && clock.GetUtcNow() < x.Deadline.Effective && x.Invoice.PaidAmount < x.Invoice.TotalPayableAmount &&
        !string.IsNullOrWhiteSpace(Bank(x, "COMPANY_BANK_NAME")) && !string.IsNullOrWhiteSpace(Bank(x, "COMPANY_BANK_ACCOUNT"));
    private static string? Bank(Context x, string key) => x.Publication.FrozenModel.Values.GetValueOrDefault(key);
    private DepositPaymentsView View(Context x) => new(x.Contract.ContractId, x.Invoice.InvoiceId, x.Contract.ContractStatus, x.Request.Status,
        x.Invoice.TotalPayableAmount, x.Invoice.PaidAmount, Math.Max(0, x.Invoice.TotalPayableAmount - x.Invoice.PaidAmount),
        Math.Max(0, x.Invoice.PaidAmount - x.Invoice.TotalPayableAmount), x.Invoice.PaymentStatus, x.Deadline.Effective, x.Deadline.Version,
        CanSubmit(x), Bank(x, "COMPANY_BANK_NAME"), Bank(x, "COMPANY_BANK_ACCOUNT"), Bank(x, "COMPANY_NAME"), x.Invoice.InvoiceId,
        x.Events.GroupBy(e => e.PaymentId).Select(g => { var e = g.Last(); return new DepositPaymentItem(e.PaymentId, g.Count(), e.Method, e.Status,
            e.DeclaredAmount, e.Amount, e.Reference, e.ReceivedAtUtc, e.Reason, e.Memo, e.Proof is not null,
            e.ReceivedAtUtc is not null && e.ReceivedAtUtc >= x.Deadline.Effective); }).ToArray(), x.Activation,
        x.CallbackConflict || x.Invoice.PaidAmount > 0 && x.Request.Status is "CANCELLED" or "CANCELED" || !x.FinancialReviewed &&
        (x.Invoice.PaidAmount > x.Invoice.TotalPayableAmount || x.Invoice.PaidAmount > 0 && (
            clock.GetUtcNow() >= x.Deadline.Effective && x.Invoice.PaidAmount < x.Invoice.TotalPayableAmount ||
            x.Events.Any(e => e.Status == "SUCCESS" && e.ReceivedAtUtc >= x.Deadline.Effective))), gateway.IsConfigured, x.Events.Length, clock.GetUtcNow() >= x.Deadline.Effective);
    public async Task<DepositPaymentsView> GetAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await Locate(id, actor, manager, ct);
        return await transactions.ExecuteAsync(c.RequestId, async token => View(await Load(id, c.RequestId, token)), ct);
    }
    internal async Task<T> UnderLockAsync<T>(string id, string actor, bool manager, Func<DepositPaymentsView, CancellationToken, Task<T>> action, CancellationToken ct)
    {
        var c = await Locate(id, actor, manager, ct);
        return await transactions.ExecuteAsync(c.RequestId, async token => action is null ? throw new ArgumentNullException(nameof(action)) : await action(View(await Load(id, c.RequestId, token)), token), ct);
    }
    private static bool Replay(Context x, string key, string hash, string actor)
    {
        var old = x.Events.SingleOrDefault(e => e.Key == key);
        if (old is null) return false;
        Require(old.InputHash == hash && old.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used for another payment operation.");
        return true;
    }
    private Task<Flow1StateRevision> Append(Context x, DepositPaymentEvent e, CancellationToken ct) => state.AppendAsync("payment-ledger",
        x.Contract.ContractId, x.Events.Length, "payment-" + e.Key, e.Actor, e.Action, JsonSerializer.SerializeToElement(e, Json), ct);
    public async Task<DepositPaymentsView> SubmitAsync(string id, string actor, string key, BankProofInput input, UploadedFile upload, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key); Money(input.DeclaredAmount);
        Require(input.Memo is null || input.Memo.Length <= 1000, "VALIDATION_ERROR", "Memo is too long.");
        var c = await Locate(id, actor, false, ct);
        // Bytes are immutable and private. A crash may leave unreferenced bytes, never a credited payment.
        var proof = await files.PutAsync(upload, false, ct);
        var hash = CustomerTransportService.Hash(new { actor, input, proof });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token);
            var x = await Load(id, c.RequestId, token); if (Replay(x, key, hash, actor)) return 0;
            Require(CanSubmit(x), "PAYMENT_CLOSED", "Contract is not open for a new deposit proof; contact Manager.");
            Require(x.Payments.Count(p => p.Status == "PENDING_CONFIRMATION") < 10, "PENDING_LIMIT", "Wait for pending proofs to be reviewed.");
            var paymentId = "p-" + CustomerTransportService.Hash(new { id, actor, key })[..32];
            repo.AddPayment(new Payment { PaymentId = paymentId, InvoiceId = x.Invoice.InvoiceId, CurrencyCode = "VND", Amount = 0,
                Method = "BANK_TRANSFER", Status = "PENDING_CONFIRMATION", PaymentDate = ContractDeadlinePolicy.SqlTime(clock.GetUtcNow()) });
            await Append(x, new(key, hash, actor, "PROOF_SUBMITTED", paymentId, x.Invoice.InvoiceId, "BANK_TRANSFER", "PENDING_CONFIRMATION",
                input.DeclaredAmount, proof, input.Memo?.Trim(), 0, null, null, null, clock.GetUtcNow(), x.Deadline.Version), token); return 0;
        }, ct);
        return await GetAsync(id, actor, false, ct);
    }
    public async Task<(byte[] Bytes, string ContentType)> ProofAsync(string id, string paymentId, string actor, bool manager, CancellationToken ct)
    {
        var c = await Locate(id, actor, manager, ct);
        var proof = await transactions.ExecuteAsync(c.RequestId, async token => {
            var x = await Load(id, c.RequestId, token);
            return x.Events.LastOrDefault(e => e.PaymentId == paymentId)?.Proof ?? throw Error("Proof not found.", "NOT_FOUND", 404);
        }, ct);
        return (await files.ReadAsync(proof, ct), proof.ContentType);
    }
    public async Task<DepositPaymentsView> ConfirmAsync(string id, string paymentId, string actor, string key, ConfirmBankPaymentInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key); Money(input.ReceivedAmount);
        var reference = input.BankReference?.Trim().ToUpperInvariant() ?? "";
        Require(Regex.IsMatch(reference, "\\A[A-Z0-9][A-Z0-9._/-]{5,99}\\z", RegexOptions.CultureInvariant), "INVALID_REFERENCE", "Enter the bank's unique transaction reference (6–100 characters).");
        input = input with { BankReference = reference, ReceivedAtUtc = input.ReceivedAtUtc.ToUniversalTime() };
        Require(input.ReceivedAtUtc <= clock.GetUtcNow() && input.ReceivedAtUtc > DateTimeOffset.UnixEpoch,
            "INVALID_RECEIVED_AT", "Received time must be a real past bank posting time.");
        var c = await Locate(id, actor, true, ct); var hash = CustomerTransportService.Hash(new { paymentId, actor, input });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token);
            var x = await Load(id, c.RequestId, token); if (Replay(x, key, hash, actor)) return 0;
            var e = Pending(x, paymentId, input.ExpectedVersion); var payment = x.Payments.Single(p => p.PaymentId == paymentId);
            Require(input.ReceivedAtUtc >= new DateTimeOffset(x.Contract.SignedAt!.Value, TimeSpan.Zero), "INVALID_RECEIVED_AT", "Posting predates contract confirmation; reconcile manually.");
            await work.LockPaymentReferenceAsync(CustomerTransportService.Hash("BANK_TRANSFER:" + reference)[..40], token);
            Require(!await repo.BankReferenceExistsAsync(reference, token), "DUPLICATE_BANK_REFERENCE", "This bank transaction has already been credited.");
            var paid = x.Invoice.PaidAmount + input.ReceivedAmount;
            Require(paid <= 9_999_999_999m, "AMOUNT_OUT_OF_RANGE", "Accumulated receipts exceed the supported limit; reconcile manually.");
            payment.Amount = input.ReceivedAmount; payment.Status = "SUCCESS"; payment.TransactionCode = reference;
            payment.ConfirmedByUserId = actor; payment.PaymentDate = ContractDeadlinePolicy.SqlTime(input.ReceivedAtUtc);
            x.Invoice.PaidAmount = paid; x.Invoice.PaymentStatus = Status(paid, x.Invoice.TotalPayableAmount);
            await Append(x, e with { Key = key, InputHash = hash, Actor = actor, Action = "BANK_RECEIPT_VERIFIED", Status = "SUCCESS",
                Amount = input.ReceivedAmount, Reference = reference, ReceivedAtUtc = input.ReceivedAtUtc, AtUtc = clock.GetUtcNow(), DeadlineVersion = x.Deadline.Version }, token);
            await Activate(x, actor, token);
            await Notify(x, key, "Quản lý đã xác minh tiền chuyển khoản; kiểm tra số thực nhận và trạng thái cọc.", token); return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
    private static DepositPaymentEvent Pending(Context x, string paymentId, int version)
    {
        var events = x.Events.Where(e => e.PaymentId == paymentId).ToArray();
        if (events.Length == 0) throw Error("Payment not found.", "NOT_FOUND", 404);
        Require(events.Length == version, "STALE_VERSION", "Payment changed; reload before reviewing.");
        Require(events[^1].Status == "PENDING_CONFIRMATION" && events[^1].Method == "BANK_TRANSFER", "PAYMENT_REVIEW_CLOSED", "Only pending bank proofs can be reviewed.");
        return events[^1];
    }
    public async Task<DepositPaymentsView> RejectAsync(string id, string paymentId, string actor, string key, RejectBankPaymentInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 1000, "REASON_REQUIRED", "Enter a customer-visible rejection reason.");
        var c = await Locate(id, actor, true, ct); var hash = CustomerTransportService.Hash(new { paymentId, actor, input });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token);
            var x = await Load(id, c.RequestId, token); if (Replay(x, key, hash, actor)) return 0;
            var e = Pending(x, paymentId, input.ExpectedVersion); x.Payments.Single(p => p.PaymentId == paymentId).Status = "REJECTED";
            await Append(x, e with { Key = key, InputHash = hash, Actor = actor, Action = "PROOF_REJECTED", Status = "REJECTED",
                Reason = input.Reason.Trim(), AtUtc = clock.GetUtcNow(), DeadlineVersion = x.Deadline.Version }, token); return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
    private async Task Activate(Context x, string actor, CancellationToken ct)
    {
        if (x.Activation is not null || x.Invoice.PaidAmount < x.Invoice.TotalPayableAmount) return;
        // Record late/cancelled money, but never resurrect a cancelled request.
        if (!x.Current || x.Contract.ContractStatus != "SIGNED" || x.Request.Status != "AWAITING_DEPOSIT") return;
        var tripId = "t-" + CustomerTransportService.Hash(x.Request.RequestId + "/FLOW1")[..32];
        var needsReview = x.Draft.Plan.Input.PlannedDepartureAt is null ||
            clock.GetUtcNow().AddDays(x.Draft.Plan.Input.PreparationDays) > x.Draft.Plan.Input.PlannedDepartureAt.Value;
        repo.AddTrip(new TripPlan { TripId = tripId, RequestId = x.Request.RequestId, Status = "PLANNING",
            TotalDistanceKm = x.Draft.Plan.RoadDistanceKm, TotalCost = x.Draft.Plan.EstimatedCost });
        await work.FlushAsync(ct); // Insert FK target; rollback still covers this flush and all preceding writes.
        x.Contract.TripId = tripId; x.Contract.ContractStatus = "EFFECTIVE"; x.Request.Status = "ACTIVATED";
        var activation = new ActivationReceipt(x.Contract.ContractId, x.Request.RequestId, x.Invoice.InvoiceId, x.Publication.Document.Sha256,
            tripId, x.Invoice.TotalPayableAmount, x.Invoice.PaidAmount, clock.GetUtcNow(), needsReview);
        await state.AppendAsync("activation", x.Contract.ContractId, 0, "activate-" + tripId, actor, "ACTIVATED", JsonSerializer.SerializeToElement(activation, Json), ct);
        var deployment = new DeploymentState(tripId, "PENDING", null, [], new("activation", "", actor, "PENDING", null, clock.GetUtcNow()));
        await state.AppendAsync("deployment", x.Contract.ContractId, 0, "deployment-created-" + tripId, actor, "PENDING", JsonSerializer.SerializeToElement(deployment, Json), ct);
    }
}
