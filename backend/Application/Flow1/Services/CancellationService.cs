using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class CancellationService(IDataSession data, AccessService access, NotificationService notifications, TimeProvider clock)
{
    public Task<object> RequestAsync(string actor, string id, bool manager, string reason, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var request = await access.RequestAsync(id, actor, manager, token);
        if (request.Status is "CANCELLED" or "CANCELLATION_REQUESTED") return State(request);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == id, token)).SingleOrDefault();
        Require(contract?.SignedAt is null && request.Status is "DRAFT" or "PENDING_REVIEW" or "CHANGES_REQUESTED" or "CONTRACT_PREPARATION" or "CONTRACT_READY" or "CONTRACT_CHANGES_REQUESTED" or "DEPOSIT_VERIFIED",
            "INVALID_STATE", "This flow only cancels requests before signature and activation.");
        var invoices = contract is null ? [] : await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID, token);
        var ids = invoices.Select(i => i.InvoiceID).ToArray();
        var receipts = await data.ListAsync<Payment>(p => ids.Contains(p.InvoiceID) && p.VnpayReceivedAmount > 0, token);
        var received = receipts.Sum(p => p.VnpayReceivedAmount ?? 0);
        request.CancellationReason = Required(reason, 1000); request.CancellationRequestedBy = actor;
        request.CancellationRequestedAtUtc = clock.GetUtcNow().UtcDateTime;
        if (received == 0)
        {
            request.CancellationPreviousStatus = null; request.Status = "CANCELLED";
            if (contract is not null)
            {
                contract.ContractStatus = "CANCELLED";
                contract.SignOtpHash = null; contract.SignOtpExpiry = null; contract.SignOtpSentAtUtc = null;
                foreach (var version in await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID && v.VersionStatus != "SIGNED", token)) version.VersionStatus = "CANCELLED";
            }
            foreach (var invoice in invoices) invoice.PaymentStatus = "CANCELLED";
        }
        else
        {
            Require(contract is not null, "INVALID_STATE", "Verified funds require a contract.");
            request.CancellationPreviousStatus = request.Status; request.Status = "CANCELLATION_REQUESTED";
            contract!.CancellationId = "CANCELLATION_" + request.RequestID["REQUEST_".Length..];
            contract.CancellationStatus = "PENDING"; contract.CancellationReason = request.CancellationReason;
            contract.CancellationRequestedAtUtc = request.CancellationRequestedAtUtc;
            contract.CancellationDecisionReason = null; contract.CancellationDecidedAtUtc = null; contract.CancellationDecidedBy = null;
        }
        notifications.Add(request.CustomerID, id, "CANCELLATION_REQUESTED", "Cancellation updated", request.CancellationReason);
        return State(request);
    }, ct);
    public Task<object> DecideAsync(string actor, string id, string decision, string reason, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token);
        var request = await access.RequestAsync(contract.RequestID, actor, true, token);
        Require(decision is "APPROVED" or "REJECTED", "VALIDATION_ERROR", "Invalid decision.", 400);
        if (contract.CancellationStatus == decision) return State(request);
        Require(contract.CancellationStatus == "PENDING" && request.Status == "CANCELLATION_REQUESTED" && request.CancellationPreviousStatus is not null && contract.SignedAt is null,
            "INVALID_STATE", "No pending pre-signature cancellation.");
        contract.CancellationStatus = decision; contract.CancellationDecisionReason = Required(reason, 1000);
        contract.CancellationDecidedBy = actor; contract.CancellationDecidedAtUtc = clock.GetUtcNow().UtcDateTime;
        if (decision == "APPROVED")
        {
            request.Status = "CANCELLED"; contract.ContractStatus = "CANCELLED";
            contract.SignOtpHash = null; contract.SignOtpExpiry = null; contract.SignOtpSentAtUtc = null;
            foreach (var invoice in await data.ListAsync<Invoice>(i => i.ContractID == id, token)) invoice.PaymentStatus = "CANCELLED";
            foreach (var version in await data.ListAsync<ContractVersion>(v => v.ContractID == id && v.VersionStatus != "SIGNED", token)) version.VersionStatus = "CANCELLED";
            contract.RefundStatus = "REQUESTED";
        }
        else request.Status = request.CancellationPreviousStatus!;
        notifications.Add(request.CustomerID, request.RequestID, "CANCELLATION_DECIDED", "Cancellation reviewed", contract.CancellationDecisionReason);
        return State(request);
    }, ct);
    public Task<object> CompleteRefundAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token);
        Require(contract.CancellationStatus == "APPROVED" && contract.ContractStatus == "CANCELLED" && contract.RefundStatus is "REQUESTED" or "PROCESSING" or "COMPLETED",
            "INVALID_STATE", "Refund status is not open.");
        contract.RefundStatus = "COMPLETED";
        return new { contractId = id, refundStatus = contract.RefundStatus, statusOnly = true };
    }, ct);
    private static object State(TransportRequest request) => new { requestId = request.RequestID, status = request.Status,
        reason = request.CancellationReason, requestedAt = request.CancellationRequestedAtUtc, previousStatus = request.CancellationPreviousStatus };
}
