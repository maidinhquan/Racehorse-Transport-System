using System.Text.Json;
using Application.DTOs.Flow1;
using Domain.Entities;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed partial class DepositPaymentService
{
    private static string FinancialBinding(string id, string invoice, decimal paid, int ledger, int deadline) =>
        CustomerTransportService.Hash(new { id, invoice, paid, ledger, deadline });
    public async Task<FinancialReviewHistory> FinancialHistoryAsync(string id, string actor, CancellationToken ct)
    {
        var c = await Locate(id, actor, true, ct);
        return await transactions.ExecuteAsync(c.RequestId, async token => {
            await Load(id, c.RequestId, token); var d = await state.ReadAsync("financial-review", id, token);
            return new FinancialReviewHistory(d?.Revisions.Count ?? 0, d?.Revisions.Select(r => new FinancialReviewHistoryItem(r.Action, r.ActorUserId,
                r.Payload.TryGetProperty("reason", out var reason) ? reason.GetString() : r.Payload.TryGetProperty("kind", out var kind) ? kind.GetString() : null, r.CreatedAtUtc)).ToArray() ?? []);
        }, ct);
    }
    public async Task<DepositPaymentsView> AcknowledgeFinancialReviewAsync(string id, string actor, string key, AcknowledgeFinancialReviewInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(input.ReviewedActualReceipts && !string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000,
            "RECONCILIATION_REQUIRED", "Review the actual receipts and enter the financial decision. This does not issue a refund.");
        var c = await Locate(id, actor, true, ct); var hash = CustomerTransportService.Hash(new { actor, input });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(id, c.RequestId, token);
            var doc = await state.ReadAsync("financial-review", id, token); var previous = doc?.Revisions.SingleOrDefault(r => r.OperationId == "review-" + key);
            if (previous is not null) { Require(previous.Payload.GetProperty("hash").GetString() == hash, "IDEMPOTENCY_KEY_REUSED", "Review key was used for another decision."); return 0; }
            Require(!x.CallbackConflict, "PROVIDER_RECONCILIATION_REQUIRED", "A contradictory provider result must be resolved with the provider; acknowledgement cannot credit or erase it.");
            Require(View(x).FinancialReviewRequired, "FINANCIAL_REVIEW_NOT_REQUIRED", "No outstanding financial review is required on the current receipts.");
            Require(input.ExpectedLedgerVersion == x.Events.Length && input.ExpectedDeadlineVersion == x.Deadline.Version,
                "STALE_VERSION", "Receipts or deadline changed; review the current balance.");
            await state.AppendAsync("financial-review", id, doc?.Revisions.Count ?? 0, "review-" + key, actor, "RECEIPTS_REVIEWED",
                JsonSerializer.SerializeToElement(new { hash, binding = FinancialBinding(id, x.Invoice.InvoiceId, x.Invoice.PaidAmount, x.Events.Length, x.Deadline.Version),
                    actor, input.Reason, atUtc = clock.GetUtcNow(), paid = x.Invoice.PaidAmount }, Json), token);
            await Notify(x, key, "Quản lý đã rà soát các khoản thực nhận. Mọi khoản hoàn tiền, nếu có, được xử lý riêng; số tiền ledger không thay đổi.", token); return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
    private async Task<GatewayPaymentSession[]> Sessions(string id, CancellationToken ct) =>
        (await state.ReadAsync("payment-sessions", id, ct))?.Revisions.Select(r => r.Payload.Deserialize<GatewayPaymentSession>(Json)!).ToArray() ?? [];
    public async Task<GatewayPaymentSession> GatewaySessionAsync(string id, string actor, string key, string clientIp, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key); var c = await Locate(id, actor, false, ct);
        return await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(id, c.RequestId, token);
            var hash = CustomerTransportService.Hash(new { actor, action = "VNPAY_SESSION", id });
            var sessions = await Sessions(id, token);
            if (Replay(x, key, hash, actor))
            {
                var old = x.Events.Single(e => e.Key == key); var session = sessions.Single(s => s.PaymentId == old.PaymentId);
                Require(!x.CancellationRequested && x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" &&
                    x.Invoice.PaidAmount < x.Invoice.TotalPayableAmount && clock.GetUtcNow() < x.Deadline.Effective &&
                    session.ExpiresAtUtc > clock.GetUtcNow() && x.Payments.Single(p => p.PaymentId == old.PaymentId).Status == "PENDING_GATEWAY",
                    "GATEWAY_SESSION_CLOSED", "Session is closed; reload payment status before creating another."); return session;
            }
            Require(x.Current && !x.CancellationRequested && x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" && x.Activation is null &&
                x.Invoice.PaidAmount < x.Invoice.TotalPayableAmount && clock.GetUtcNow() < x.Deadline.Effective,
                "PAYMENT_CLOSED", "Contract is not open for a new gateway session.");
            var active = sessions.LastOrDefault(s => s.ExpiresAtUtc > clock.GetUtcNow() && x.Payments.Any(p => p.PaymentId == s.PaymentId && p.Status == "PENDING_GATEWAY"));
            if (active is not null) return active; // Recover the existing private session after browser/network state loss.
            var expires = clock.GetUtcNow().AddMinutes(15); if (expires > x.Deadline.Effective) expires = x.Deadline.Effective;
            Require(expires > clock.GetUtcNow().AddMinutes(1), "PAYMENT_CLOSED", "Too little time remains to start a payment; contact Manager.");
            var paymentId = "vp" + CustomerTransportService.Hash(new { id, actor, key })[..40];
            var amount = x.Invoice.TotalPayableAmount - x.Invoice.PaidAmount;
            var result = await gateway.CreateSessionAsync(new(paymentId, x.Invoice.InvoiceId, amount, "VND", expires, clientIp), token);
            Require(result.ProviderReference == paymentId && result.ExpiresAtUtc == expires && !string.IsNullOrWhiteSpace(result.MerchantId), "GATEWAY_SESSION_CONFLICT", "Provider session differs from requested terms.");
            var sessionValue = new GatewayPaymentSession(paymentId, c.RequestId, x.Invoice.InvoiceId, amount, "VND", result.PaymentUrl.AbsoluteUri, clock.GetUtcNow(), expires, result.MerchantId);
            repo.AddPayment(new Payment { PaymentId = paymentId, InvoiceId = x.Invoice.InvoiceId, CurrencyCode = "VND", Amount = 0,
                Method = "VNPAY", Status = "PENDING_GATEWAY", PaymentDate = ContractDeadlinePolicy.SqlTime(clock.GetUtcNow()) });
            await Append(x, new(key, hash, actor, "GATEWAY_SESSION_CREATED", paymentId, x.Invoice.InvoiceId, "VNPAY", "PENDING_GATEWAY", amount,
                null, null, 0, null, null, null, clock.GetUtcNow(), x.Deadline.Version), token);
            await state.AppendAsync("payment-sessions", id, sessions.Length, "session-" + key, actor, "SESSION_CREATED", JsonSerializer.SerializeToElement(sessionValue, Json), token);
            return sessionValue;
        }, ct);
    }
    public async Task<GatewayPaymentStatus> GatewayStatusAsync(string paymentId, string actor, CancellationToken ct)
    {
        var c = await repo.GetPaymentContractAsync(paymentId, ct);
        if (c is null || c.CustomerId != actor) throw Error("Payment not found.", "NOT_FOUND", 404);
        var v = await GetAsync(c.ContractId, actor, false, ct);
        var payment = v.Payments.SingleOrDefault(p => p.PaymentId == paymentId && p.Method == "VNPAY") ?? throw Error("Payment not found.", "NOT_FOUND", 404);
        return new(c.RequestId, paymentId, payment.Status, v);
    }
    public async Task<GatewayIpnResponse> GatewayIpnAsync(IReadOnlyDictionary<string, string> payload, CancellationToken ct)
    {
        var verified = await gateway.VerifyAsync(payload, ct);
        if (!verified.Verified) return new("97", "Invalid signature or payload");
        var c = await repo.GetPaymentContractAsync(verified.ProviderReference, ct);
        if (c is null) return new("01", "Order not found");
        return await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(c.ContractId, c.RequestId, token);
            var e = x.Events.LastOrDefault(p => p.PaymentId == verified.ProviderReference && p.Method == "VNPAY");
            var session = (await Sessions(c.ContractId, token)).SingleOrDefault(s => s.PaymentId == verified.ProviderReference);
            if (e is null || session is null) return new GatewayIpnResponse("01", "Order not found");
            if (verified.MerchantId != session.MerchantId) return new("97", "Merchant differs from the issued session");
            if (verified.Amount != session.RequestedAmount || verified.Currency != session.Currency || session.InvoiceId != x.Invoice.InvoiceId)
            { await Conflict(x, "AMOUNT_MISMATCH", verified.SafeEvidence, token); return new("04", "Invalid amount"); }
            if (e.Status != "PENDING_GATEWAY")
            {
                // No amount change on replay or on a contradictory second result. Operators must reconcile contradictions.
                if (e.Status == verified.Status && (e.Status != "SUCCESS" || e.Reference == verified.ProviderTransactionId)) return new("02", "Order already confirmed");
                await Conflict(x, "CONTRADICTORY_RESULT", verified.SafeEvidence, token); return new("99", "Conflicting provider result; reconciliation required");
            }
            if (verified.Status == "SUCCESS" && (verified.PaidAtUtc < session.CreatedAtUtc.AddSeconds(-1) || verified.PaidAtUtc is null))
            { await Conflict(x, "POSTING_TIME", verified.SafeEvidence, token); return new("99", "Invalid posting time"); }
            if (verified.Status == "SUCCESS" && await repo.GatewayTransactionExistsAsync(verified.ProviderTransactionId!, token))
            { await Conflict(x, "DUPLICATE_TRANSACTION", verified.SafeEvidence, token); return new("99", "Duplicate provider transaction; reconciliation required"); }
            var amount = verified.Status == "SUCCESS" ? verified.Amount : 0;
            Require(x.Invoice.PaidAmount + amount <= 9_999_999_999m, "AMOUNT_OUT_OF_RANGE", "Receipt total requires manual reconciliation.");
            var payment = x.Payments.Single(p => p.PaymentId == e.PaymentId); payment.Status = verified.Status; payment.Amount = amount;
            payment.TransactionCode = verified.ProviderTransactionId; payment.PaymentDate = ContractDeadlinePolicy.SqlTime(verified.PaidAtUtc ?? clock.GetUtcNow());
            x.Invoice.PaidAmount += amount; x.Invoice.PaymentStatus = Status(x.Invoice.PaidAmount, x.Invoice.TotalPayableAmount);
            var digest = CustomerTransportService.Hash(verified.SafeEvidence);
            await Append(x, e with { Key = "ipn-" + digest[..40], InputHash = digest, Actor = "VNPAY_IPN", Action = "GATEWAY_IPN_VERIFIED",
                Status = verified.Status, Amount = amount, Reference = verified.ProviderTransactionId, ReceivedAtUtc = verified.PaidAtUtc,
                Reason = verified.Status == "FAILED" ? "VNPay reported payment unsuccessful." : null,
                AtUtc = clock.GetUtcNow(), DeadlineVersion = x.Deadline.Version }, token);
            await Activate(x, "VNPAY_IPN", token); await Notify(x, "ipn-" + digest[..40], "VNPay đã cập nhật kết quả giao dịch; kiểm tra số tiền và trạng thái cọc.", token);
            return new("00", "Confirm success");
        }, ct);
    }
    private async Task Conflict(Context x, string kind, JsonElement evidence, CancellationToken ct)
    {
        var hash = CustomerTransportService.Hash(new { kind, evidence }); var operation = "conflict-" + hash[..40];
        var d = await state.ReadAsync("financial-review", x.Contract.ContractId, ct);
        if (d?.Revisions.Any(r => r.OperationId == operation) == true) return;
        await state.AppendAsync("financial-review", x.Contract.ContractId, d?.Revisions.Count ?? 0, operation, "VNPAY_IPN", "CALLBACK_CONFLICT",
            JsonSerializer.SerializeToElement(new { kind, evidence, atUtc = clock.GetUtcNow() }, Json), ct);
        await Notify(x, operation, "Kết quả VNPay có sai lệch; cần quản lý đối soát, hệ thống chưa tự cộng khoản tiền sai lệch.", ct);
    }
    private async Task Notify(Context x, string key, string message, CancellationToken ct)
    {
        var d = (await state.ReadAsync("review", x.Request.RequestId, ct))!; var value = d.Revisions[^1].Payload.Deserialize<ReviewState>(Json)!;
        if (value.Notices.Any(n => n.Id == "money-" + key)) return;
        var next = value with { Notices = value.Notices.Append(new ReviewNotice("money-" + key, message, clock.GetUtcNow().UtcDateTime)).TakeLast(50).ToArray() };
        await state.AppendAsync("review", x.Request.RequestId, d.Revisions.Count, "money-" + key, "SYSTEM", "PAYMENT_NOTICE", JsonSerializer.SerializeToElement(next, Json), ct);
    }
    public async Task<DepositPaymentsView> CancelOverdueAsync(string id, string actor, string key, CancelOverdueDepositInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key); Require(input.ReconciliationConfirmed && !string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 1000,
            "RECONCILIATION_REQUIRED", "Reconcile all payment channels and enter a cancellation reason.");
        var c = await Locate(id, actor, true, ct); var hash = CustomerTransportService.Hash(new { actor, input, action = "CANCEL_OVERDUE" });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(id, c.RequestId, token);
            var doc = await state.ReadAsync("financial-review", id, token);
            var prior = doc?.Revisions.SingleOrDefault(r => r.OperationId == "cancel-" + key);
            if (prior is not null) { Require(prior.Payload.GetProperty("hash").GetString() == hash, "IDEMPOTENCY_KEY_REUSED", "Key was used for a different cancellation."); return 0; }
            Require(x.Current && x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" && x.Activation is null &&
                clock.GetUtcNow() >= x.Deadline.Effective && input.ExpectedDeadlineVersion == x.Deadline.Version,
                "CANCEL_CLOSED", "Only a current overdue signed contract awaiting deposit can be cancelled.");
            Require(x.Invoice.PaidAmount == 0, "FINANCIAL_REVIEW_REQUIRED", "Verified money exists; manual financial review is required before cancellation.");
            Require(!x.CancellationRequested, "CANCELLATION_REQUEST_PENDING", "Review the customer's pending cancellation request instead.");
            Require(!x.Payments.Any(p => p.Status is "PENDING_CONFIRMATION" or "PENDING_GATEWAY"), "PAYMENT_PENDING", "Resolve every pending proof/gateway transaction before cancellation.");
            x.Request.Status = "CANCELLED"; // Preserve signed contract, immutable PDF, invoice and all receipts.
            await state.AppendAsync("financial-review", id, doc?.Revisions.Count ?? 0, "cancel-" + key, actor, "OVERDUE_CANCELLED",
                JsonSerializer.SerializeToElement(new { hash, input.Reason, actor, deadlineVersion = x.Deadline.Version, atUtc = clock.GetUtcNow() }, Json), token);
            await Notify(x, key, "Quản lý đã hủy yêu cầu quá hạn sau khi xác nhận đối soát không có tiền đã nhận và không còn giao dịch chờ.", token); return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
}
