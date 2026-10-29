using System.Collections.Concurrent;
using System.Globalization;
using System.Text.RegularExpressions;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class PaymentService(IDataSession data, AccessService access, IPaymentGateway gateway,
    NotificationService notifications, TimeProvider clock, IGatewayQuery? query = null)
{
    // Last VNPAY query per payment, so page polling and the background sweep do not flood the provider.
    private static readonly ConcurrentDictionary<string, DateTime> lastQuery = new(StringComparer.Ordinal);
    public async Task<object> SessionAsync(string actor, string invoiceId, string method, string ip, CancellationToken ct)
    {
        Require(method == "VNPAY", "VALIDATION_ERROR", "Only VNPAY is supported.", 400);
        Require(gateway.IsConfigured, "VNPAY_NOT_CONFIGURED", "Configure VNPAY.", 503);
        var pending = await data.WriteAsync(async token =>
        {
            var invoice = await data.FindAsync<Invoice>(token, invoiceId) ?? throw Failure("NOT_FOUND", "Invoice not found.", 404);
            var contract = await access.ContractAsync(invoice.ContractID, actor, false, token);
            var request = await access.RequestAsync(contract.RequestID, actor, false, token);
            Require(contract.CurrentVersionNo == invoice.ContractVersionNo && invoice.InvoiceType == "DEPOSIT" && invoice.PaymentStatus != "CANCELLED", "CONTRACT_NOT_CURRENT", "Invoice is not current.");
            Require(contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime && contract.SignedAt is null, "CONTRACT_EXPIRED", "Contract is not open for payment.");
            Require(request.Status == "CONTRACT_READY" && contract.CancellationStatus != "PENDING", "INVALID_STATE", "Request is not open for payment.");
            var version = await data.FindAsync<ContractVersion>(token, contract.ContractID, invoice.ContractVersionNo);
            Require(version?.TermsAcceptedAtUtc is not null && version.VersionStatus == "ISSUED", "TERMS_NOT_ACCEPTED", "Accept this contract version first.");
            var amount = invoice.TotalPayableAmount - invoice.PaidAmount;
            Require(amount > 0, "PAYMENT_ALREADY_PROCESSED", "Deposit already paid.");
            var attempts = await data.ListAsync<Payment>(p => p.InvoiceID == invoiceId && p.Status == "PENDING_GATEWAY" && p.VnpayExpiresAtUtc > clock.GetUtcNow().UtcDateTime, token);
            var payment = attempts.FirstOrDefault(p => p.Amount == amount);
            if (payment is null)
            {
                var timestamp = clock.GetUtcNow().UtcDateTime;
                var now = new DateTime(timestamp.Ticks - timestamp.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);
                payment = new Payment { InvoiceID = invoiceId, Amount = amount, CurrencyCode = "VND", Method = "VNPAY",
                    Status = "PENDING_GATEWAY", PaymentDate = now, VnpayCreatedAtUtc = now,
                    VnpayExpiresAtUtc = now.AddMinutes(15) < contract.CompletionDeadline!.Value ? now.AddMinutes(15) : contract.CompletionDeadline.Value };
                data.Add(payment); await data.SaveAsync(token);
            }
            return payment;
        }, ct);
        // VNPAY reference stays alphanumeric, while database IDs keep their readable underscore.
        // The session timestamp keeps vnp_TxnRef unique even when a reset database reuses PAYMENT_00x numbers
        // (VNPAY rejects a TxnRef it has already seen for the merchant).
        var reference = TxnRef(pending.PaymentID, pending.VnpayCreatedAtUtc!.Value);
        var result = await gateway.CreateSessionAsync(new(reference, invoiceId, pending.Amount, "VND",
            new DateTimeOffset(DateTime.SpecifyKind(pending.VnpayExpiresAtUtc!.Value, DateTimeKind.Utc)), ip,
            new DateTimeOffset(DateTime.SpecifyKind(pending.VnpayCreatedAtUtc!.Value, DateTimeKind.Utc))), ct);
        return await data.WriteAsync<object>(async token =>
        {
            var payment = await data.FindAsync<Payment>(token, pending.PaymentID) ?? throw Failure("NOT_FOUND", "Payment not found.", 404);
            var invoice = await data.FindAsync<Invoice>(token, invoiceId) ?? throw Failure("NOT_FOUND", "Invoice not found.", 404);
            var contract = await access.ContractAsync(invoice.ContractID, actor, false, token);
            var request = await access.RequestAsync(contract.RequestID, actor, false, token);
            Require(contract.CurrentVersionNo == invoice.ContractVersionNo && request.Status == "CONTRACT_READY"
                && payment.Status == "PENDING_GATEWAY" && contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime,
                "INVALID_STATE", "Payment state changed while creating the session.");
            payment.VnpayTmnCode = result.MerchantId;
            return new { id = payment.PaymentID, invoiceId, amount = payment.Amount, currency = "VND", method = "VNPAY", status = "PROCESSING", paymentUrl = result.PaymentUrl.ToString(), expiresAt = result.ExpiresAtUtc.UtcDateTime.ToString("yyyy-MM-dd HH:mm") };
        }, ct);
    }
    public async Task<object> IpnAsync(IReadOnlyDictionary<string, string> payload, CancellationToken ct)
    {
        var verified = await gateway.VerifyAsync(payload, ct);
        if (!verified.Verified) return new { RspCode = "97", Message = "Invalid signature or payload" };
        var match = Regex.Match(verified.ProviderReference, @"\APAYMENT([0-9]{3,})(?:T([0-9]{14}))?\z");
        if (!match.Success) return new { RspCode = "01", Message = "Order not found" };
        var id = "PAYMENT_" + match.Groups[1].Value;
        var stamp = match.Groups[2].Success ? match.Groups[2].Value : null;
        return await RecordAsync(id, stamp is not null, verified with
        {
            ResponseCode = payload.GetValueOrDefault("vnp_ResponseCode"), TransactionStatus = payload.GetValueOrDefault("vnp_TransactionStatus")
        }, ct);
    }
    /// <summary>
    /// Records a provider-verified outcome (from the IPN or from a VNPAY query) with the same checks:
    /// session binding, amount/merchant, duplicates, open deposit window. Invalid late funds go to reconciliation.
    /// </summary>
    private Task<object> RecordAsync(string id, bool stamped, VerifiedGatewayResult verified, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var payment = await data.FindAsync<Payment>(token, id);
            if (payment is null || payment.Method != "VNPAY") return new { RspCode = "01", Message = "Order not found" };
            // A timestamped reference must belong to this exact session (guards against reused payment numbers).
            if (stamped && (payment.VnpayCreatedAtUtc is null || TxnRef(payment.PaymentID, payment.VnpayCreatedAtUtc.Value) != verified.ProviderReference))
                return new { RspCode = "01", Message = "Order not found" };
            if (payment.Amount != verified.Amount || payment.CurrencyCode != verified.Currency || payment.VnpayTmnCode != verified.MerchantId)
                return new { RspCode = "04", Message = "Amount or merchant mismatch" };
            var successAfterFailure = payment.Status == "FAILED" && verified.Status == "SUCCESS" && payment.VnpayReceivedAmount is null;
            if (payment.Status != "PENDING_GATEWAY" && !successAfterFailure) return new { RspCode = "02", Message = "Already processed" };
            var duplicate = verified.ProviderTransactionId is null ? [] : await data.ListAsync<Payment>(p => p.PaymentID != id
                && p.VnpayTmnCode == verified.MerchantId && p.TransactionCode == verified.ProviderTransactionId, token);
            if (duplicate.Count != 0) return new { RspCode = "02", Message = "Transaction already processed" };
            var invoice = await data.FindAsync<Invoice>(token, payment.InvoiceID) ?? throw Failure("NOT_FOUND", "Invoice not found.", 404);
            var contract = await data.FindAsync<Contract>(token, invoice.ContractID) ?? throw Failure("NOT_FOUND", "Contract not found.", 404);
            var request = await data.FindAsync<TransportRequest>(token, contract.RequestID) ?? throw Failure("NOT_FOUND", "Request not found.", 404);
            payment.VnpayResponseCode = verified.ResponseCode;
            payment.VnpayTransactionStatus = verified.TransactionStatus;
            payment.VnpayBankCode = verified.BankCode; payment.TransactionCode = verified.ProviderTransactionId;
            payment.Status = verified.Status;
            if (verified.Status != "SUCCESS") return new { RspCode = "00", Message = "Recorded" };
            payment.VnpayReceivedAmount = verified.Amount; payment.PaymentDate = verified.PaidAtUtc!.Value.UtcDateTime;
            var valid = !successAfterFailure && contract.CurrentVersionNo == invoice.ContractVersionNo && invoice.PaymentStatus != "CANCELLED"
                && request.Status is "CONTRACT_READY" or "DEPOSIT_VERIFIED"
                && contract.CancellationStatus != "PENDING" && contract.SignedAt is null
                && payment.PaymentDate <= contract.CompletionDeadline && payment.PaymentDate <= payment.VnpayExpiresAtUtc
                && payment.PaymentDate >= payment.VnpayCreatedAtUtc && invoice.PaidAmount + payment.Amount <= invoice.TotalPayableAmount;
            if (!valid)
            {
                payment.Status = "REVIEW_REQUIRED"; payment.FinancialReviewRequired = true;
                payment.FinancialReviewReason = successAfterFailure
                    ? "Verified funds arrived after a failed payment notification; reconciliation required."
                    : "Verified funds arrived outside the current open deposit window; reconciliation required.";
                return new { RspCode = "00", Message = "Recorded for reconciliation" };
            }
            invoice.PaidAmount += payment.Amount;
            invoice.PaymentStatus = invoice.PaidAmount >= invoice.TotalPayableAmount ? "PAID" : "PARTIALLY_PAID";
            if (invoice.PaymentStatus == "PAID")
            {
                request.Status = "DEPOSIT_VERIFIED";
                notifications.Add(request.CustomerID, request.RequestID, "DEPOSIT_VERIFIED", "Deposit verified", "You may now request the signing OTP.");
            }
            return new { RspCode = "00", Message = "Recorded" };
        }, ct);

    /// <summary>
    /// Resolves a payment still waiting for the gateway by asking VNPAY (querydr), so a missed IPN never leaves it pending:
    /// paid → recorded exactly like the IPN; failed → FAILED; unknown to VNPAY after the session expired → FAILED (nothing charged).
    /// Provider errors keep the state for a later attempt.
    /// </summary>
    public async Task ReconcileAsync(string paymentId, CancellationToken ct, bool force = false)
    {
        if (query is null) return;
        var payment = await data.FindAsync<Payment>(ct, paymentId);
        if (payment is null || payment.Status != "PENDING_GATEWAY" || payment.Method != "VNPAY" || payment.VnpayCreatedAtUtc is null || payment.VnpayTmnCode is null) return;
        var now = clock.GetUtcNow().UtcDateTime;
        if (!force && now - payment.VnpayCreatedAtUtc.Value < TimeSpan.FromSeconds(20)) return; // customer is still on the gateway page
        if (!force && lastQuery.TryGetValue(paymentId, out var last) && now - last < TimeSpan.FromSeconds(10)) return;
        lastQuery[paymentId] = now;
        var reference = TxnRef(payment.PaymentID, payment.VnpayCreatedAtUtc.Value);
        try
        {
            var created = new DateTimeOffset(DateTime.SpecifyKind(payment.VnpayCreatedAtUtc.Value, DateTimeKind.Utc));
            var result = await query.QueryAsync(new GatewayQueryRequest(reference, payment.VnpayTmnCode, created, "127.0.0.1"), ct);
            if (result.State is "SUCCESS" or "FAILED")
            {
                var success = result.State == "SUCCESS";
                await RecordAsync(payment.PaymentID, true, new VerifiedGatewayResult(true, reference, result.TransactionId,
                    success ? result.Amount ?? 0 : payment.Amount, "VND", success ? "SUCCESS" : "FAILED", result.PaidAtUtc, default,
                    result.MerchantId, result.BankCode, success ? "00" : null, result.TransactionStatus), ct);
                return;
            }
            // VNPAY does not accept payment after vnp_ExpireDate; with no transaction on record the customer was not charged.
            if (payment.VnpayExpiresAtUtc is DateTime expires && now > expires.AddMinutes(15))
                await data.WriteAsync<object>(async token =>
                {
                    var row = await data.FindAsync<Payment>(token, paymentId);
                    if (row?.Status == "PENDING_GATEWAY")
                    {
                        row.Status = "FAILED";
                        row.FinancialReviewReason = "VNPAY has no transaction for this expired session; nothing was charged.";
                    }
                    return true;
                }, ct);
        }
        catch (Exception error) when (error is not OperationCanceledException)
        {
            // Provider unreachable or unverifiable: keep PENDING_GATEWAY and try again on the next poll or sweep.
        }
    }
    /// <summary>
    /// Manager cancels a payment stuck at the gateway. VNPAY is asked first, so a confirmed payment is recorded instead of
    /// cancelled; only an expired session can be cancelled. A late VNPAY success afterwards still lands in reconciliation
    /// (IPN "success after failure" → REVIEW_REQUIRED), so money is never lost. The customer can pay again.
    /// </summary>
    public async Task<object> CancelAsync(string actor, string id, string reason, CancellationToken ct)
    {
        await access.AccountAsync(actor, Domain.Enums.UserRoles.LogisticsManager, ct);
        var text = (reason ?? "").Trim();
        Require(text.Length is >= 5 and <= 1000, "VALIDATION_ERROR", "Enter a cancellation reason of 5 to 1000 characters.", 400);
        var payment = await data.FindAsync<Payment>(ct, id) ?? throw Failure("NOT_FOUND", "Payment not found.", 404);
        var invoice = await data.FindAsync<Invoice>(ct, payment.InvoiceID) ?? throw Failure("NOT_FOUND", "Invoice not found.", 404);
        await access.ContractAsync(invoice.ContractID, actor, true, ct);
        if (payment.Status == "PENDING_GATEWAY")
        {
            await ReconcileAsync(id, ct, force: true);
            payment = await data.FindAsync<Payment>(ct, id) ?? payment;
        }
        if (payment.Status != "PENDING_GATEWAY") return View(payment, invoice); // resolved by VNPAY: nothing to cancel
        Require(payment.VnpayExpiresAtUtc is DateTime expires && expires <= clock.GetUtcNow().UtcDateTime,
            "PAYMENT_SESSION_OPEN", "The VNPay session is still open; it can be cancelled after it expires.", 409);
        await data.WriteAsync<object>(async token =>
        {
            var row = await data.FindAsync<Payment>(token, id);
            if (row?.Status == "PENDING_GATEWAY")
            {
                row.Status = "FAILED";
                var note = "Cancelled by Manager: " + text;
                row.FinancialReviewReason = note.Length > 1000 ? note[..1000] : note;
            }
            return true;
        }, ct);
        payment = await data.FindAsync<Payment>(ct, id) ?? payment;
        return View(payment, invoice);
    }
    /// <summary>Background sweep: resolves every payment still waiting for the gateway.</summary>
    public async Task<int> SweepAsync(CancellationToken ct)
    {
        var pending = await data.ListAsync<Payment>(p => p.Status == "PENDING_GATEWAY" && p.Method == "VNPAY", ct);
        foreach (var payment in pending) await ReconcileAsync(payment.PaymentID, ct);
        return pending.Count;
    }
    public async Task<object> DepositAsync(string actor, string requestId, CancellationToken ct)
    {
        var request = await access.RequestAsync(requestId, actor, false, ct);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == requestId, ct)).SingleOrDefault() ?? throw Failure("NOT_FOUND", "Contract not found.", 404);
        var invoice = (await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID && i.ContractVersionNo == contract.CurrentVersionNo && i.InvoiceType == "DEPOSIT", ct)).SingleOrDefault() ?? throw Failure("NOT_FOUND", "Deposit not found.", 404);
        foreach (var waiting in await data.ListAsync<Payment>(p => p.InvoiceID == invoice.InvoiceID && p.Status == "PENDING_GATEWAY", ct))
            await ReconcileAsync(waiting.PaymentID, ct);
        if (invoice.PaidAmount == 0 || request.Status == "CONTRACT_READY")
        {
            request = await access.RequestAsync(requestId, actor, false, ct);
            invoice = await data.FindAsync<Invoice>(ct, invoice.InvoiceID) ?? invoice;
        }
        return new { requestId, contractId = contract.ContractID, versionNo = invoice.ContractVersionNo, invoiceId = invoice.InvoiceID,
            currency = "VND", requiredAmount = invoice.TotalPayableAmount, paidAmount = invoice.PaidAmount, remainingAmount = invoice.TotalPayableAmount - invoice.PaidAmount,
            canPay = request.Status == "CONTRACT_READY" && contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime && invoice.PaidAmount < invoice.TotalPayableAmount,
            validUntil = invoice.DueDate?.ToString("yyyy-MM-dd HH:mm") ?? "",
            transactions = (await data.ListAsync<Payment>(p => p.InvoiceID == invoice.InvoiceID, ct)).Select(p => View(p, invoice)).ToArray() };
    }
    public async Task<object> DetailAsync(string actor, string id, bool manager, CancellationToken ct)
    {
        var payment = await data.FindAsync<Payment>(ct, id) ?? throw Failure("NOT_FOUND", "Payment not found.", 404);
        var invoice = await data.FindAsync<Invoice>(ct, payment.InvoiceID) ?? throw Failure("NOT_FOUND", "Invoice not found.", 404);
        await access.ContractAsync(invoice.ContractID, actor, manager, ct);
        if (payment.Status == "PENDING_GATEWAY")
        {
            await ReconcileAsync(id, ct);
            payment = await data.FindAsync<Payment>(ct, id) ?? payment;
        }
        return View(payment, invoice);
    }
    public async Task<object> ReceiptAsync(string actor, string id, CancellationToken ct)
    {
        await DetailAsync(actor, id, false, ct);
        throw Failure("PAYMENT_RECEIPT_UNAVAILABLE", "The Reviewed schema does not retain a downloadable payment receipt. Payment details contain the verified gateway evidence.", 501);
    }
    public async Task<object> ListAsync(string actor, CancellationToken ct)
    {
        await access.AccountAsync(actor, Domain.Enums.UserRoles.LogisticsManager, ct);
        var invoices = (await data.ListAsync<Invoice>(i => i.InvoiceType == "DEPOSIT", ct)).ToDictionary(i => i.InvoiceID);
        return (await data.ListAsync<Payment>(p => true, ct)).Where(p => invoices.ContainsKey(p.InvoiceID)).OrderByDescending(p => p.PaymentDate).Select(p => View(p, invoices[p.InvoiceID])).ToArray();
    }
    private static object View(Payment payment, Invoice invoice) => new
    {
        id = payment.PaymentID, paymentId = payment.PaymentID, invoiceId = payment.InvoiceID, contractId = invoice.ContractID,
        versionNo = invoice.ContractVersionNo, amount = payment.Amount, currency = payment.CurrencyCode, method = payment.Method,
        status = payment.Status == "PENDING_GATEWAY" ? "PROCESSING" : payment.Status == "FAILED" ? "REJECTED" : payment.Status == "REVIEW_REQUIRED" ? "PROCESSING" : "SUCCESS",
        databaseStatus = payment.Status, receivedAmount = payment.VnpayReceivedAmount,
        paidAt = payment.VnpayReceivedAmount is null ? (DateTime?)null : payment.PaymentDate,
        reviewRequired = payment.FinancialReviewRequired, reviewReason = payment.FinancialReviewReason,
        // When an unpaid VNPay session stops being payable; the client treats abandoned sessions as no money in flight.
        expiresAt = payment.VnpayExpiresAtUtc?.ToString("yyyy-MM-dd HH:mm"),
        createdAt = payment.VnpayCreatedAtUtc?.ToString("yyyy-MM-dd HH:mm")
    };
    private static string TxnRef(string paymentId, DateTime createdAtUtc) =>
        paymentId.Replace("_", "", StringComparison.Ordinal) + "T" + createdAtUtc.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
}
