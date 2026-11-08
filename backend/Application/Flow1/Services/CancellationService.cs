using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class CancellationService(IDataSession data, AccessService access, NotificationService notifications, TimeProvider clock)
{
    public Task<object> RequestAsync(string actor, string id, bool manager, string reason, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var request = await access.RequestAsync(id, actor, manager, token);
        if (request.Status == "CANCELLED" || request.Status == "CANCELLATION_REQUESTED" && !manager) return State(request);
        Require(!manager || request.Status is "CONTRACT_PREPARATION" or "CONTRACT_READY" or "CONTRACT_CHANGES_REQUESTED" or "DEPOSIT_VERIFIED" or "CANCELLATION_REQUESTED",
            "INVALID_STATE", "Yêu cầu chưa được chấp thuận. Quản lý cần dùng thao tác Từ chối yêu cầu.");
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == id, token)).SingleOrDefault();
        Require(contract?.SignedAt is null && request.Status is "DRAFT" or "PENDING_REVIEW" or "CHANGES_REQUESTED" or "CONTRACT_PREPARATION" or "CONTRACT_READY" or "CONTRACT_CHANGES_REQUESTED" or "DEPOSIT_VERIFIED" or "CANCELLATION_REQUESTED",
            "INVALID_STATE", "This flow only cancels requests before signature and activation.");
        var invoices = contract is null ? [] : await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID, token);
        var ids = invoices.Select(i => i.InvoiceID).ToArray();
        Require((await PaymentService.PendingAsync(data, ids, clock.GetUtcNow().UtcDateTime, token)).Count == 0,
            "PAYMENT_RECONCILIATION_REQUIRED", "Chờ VNPay xác minh giao dịch cọc trước khi hủy.");
        var receipts = await data.ListAsync<Payment>(p => ids.Contains(p.InvoiceID) && p.VnpayReceivedAmount > 0, token);
        var received = receipts.Sum(p => p.VnpayReceivedAmount ?? 0);
        request.CancellationReason = Required(reason, 1000); request.CancellationRequestedBy = actor;
        request.CancellationRequestedAtUtc = clock.GetUtcNow().UtcDateTime;
        if (received == 0 || manager)
        {
            request.CancellationPreviousStatus = null; request.Status = "CANCELLED";
            if (contract is not null)
            {
                contract.ContractStatus = "CANCELLED";
                contract.SignOtpHash = null; contract.SignOtpExpiry = null; contract.SignOtpSentAtUtc = null;
                if (manager)
                {
                    contract.CancellationId = "CANCELLATION_" + request.RequestID["REQUEST_".Length..];
                    contract.CancellationStatus = "APPROVED";
                    contract.CancellationReason = request.CancellationReason;
                    contract.CancellationRequestedAtUtc = request.CancellationRequestedAtUtc;
                    contract.CancellationDecisionReason = request.CancellationReason;
                    contract.CancellationDecidedBy = actor;
                    contract.CancellationDecidedAtUtc = request.CancellationRequestedAtUtc;
                    if (received > 0) contract.RefundStatus ??= "REQUESTED";
                }
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
        notifications.Add(request.CustomerID, id, request.Status == "CANCELLED" ? "CANCELLATION_DECIDED" : "CANCELLATION_REQUESTED",
            manager ? "Quản lý đã hủy yêu cầu" : "Đã tiếp nhận yêu cầu hủy", request.CancellationReason);
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
        if (decision == "APPROVED")
        {
            var ids = (await data.ListAsync<Invoice>(i => i.ContractID == id, token)).Select(i => i.InvoiceID).ToArray();
            Require((await PaymentService.PendingAsync(data, ids, clock.GetUtcNow().UtcDateTime, token)).Count == 0,
                "PAYMENT_RECONCILIATION_REQUIRED", "Chờ VNPay xác minh giao dịch cọc trước khi duyệt hủy.");
        }
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
    public Task<object> StartRefundAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token);
        Require(contract.ContractStatus == "CANCELLED" && contract.SignedAt is null
            && contract.RefundStatus is "REQUESTED" or "PROCESSING", "INVALID_STATE", "Chưa có nghĩa vụ hoàn cọc đang mở.");
        var receipts = await VerifiedDepositsAsync(id, token);
        var amount = receipts.Sum(x => x.VnpayReceivedAmount ?? 0);
        Require(amount is > 0 and <= 9999999999m, "REFUND_EVIDENCE_INVALID", "Không có khoản cọc đã xác minh đủ điều kiện ghi nhận hoàn.");
        contract.RefundAmount = amount;
        contract.RefundStatus = "PROCESSING";
        return RefundMapper.View(contract)!;
    }, ct);

    public Task<object> CompleteRefundAsync(string actor, string id, RefundEvidenceInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token);
        var reference = Required(input.Reference, 100);
        var refundedAt = input.RefundedAtUtc.UtcDateTime;
        if (contract.RefundStatus == "COMPLETED")
        {
            Require(contract.RefundReference == reference && contract.RefundAmount == input.Amount && contract.RefundedAtUtc == refundedAt,
                "REFUND_EVIDENCE_INVALID", "Chứng từ đã xác minh không thể thay đổi.");
            return RefundMapper.View(contract)!;
        }
        Require(contract.ContractStatus == "CANCELLED" && contract.SignedAt is null && contract.RefundStatus == "PROCESSING",
            "INVALID_STATE", "Cần ghi nhận bắt đầu xử lý hoàn cọc trước.");
        var receipts = await VerifiedDepositsAsync(id, token);
        var now = clock.GetUtcNow().UtcDateTime;
        Require(receipts.Count != 0 && input.Amount > 0 && input.Amount == contract.RefundAmount
            && input.Amount == receipts.Sum(x => x.VnpayReceivedAmount ?? 0)
            && refundedAt >= receipts.Max(x => x.PaymentDate) && refundedAt <= now,
            "REFUND_EVIDENCE_INVALID", "Kiểm tra lại số tiền và thời điểm trên chứng từ hoàn cọc.");
        Require(!(await data.ListAsync<Contract>(x => x.RefundReference == reference && x.RefundVerifiedAtUtc != null, token)).Any(),
            "REFUND_EVIDENCE_INVALID", "Tham chiếu hoàn cọc đã dùng cho hợp đồng khác.");
        contract.RefundReference = reference;
        contract.RefundedAtUtc = refundedAt;
        contract.RefundVerifiedAtUtc = now;
        contract.RefundVerifiedBy = actor;
        contract.RefundStatus = "COMPLETED";
        notifications.Add(contract.CustomerID, contract.RequestID, "REFUND_COMPLETED", "Đã xác minh hoàn cọc", "Bạn có thể xem tham chiếu hoàn cọc trong yêu cầu vận chuyển.");
        return RefundMapper.View(contract)!;
    }, ct);

    private async Task<List<Payment>> VerifiedDepositsAsync(string contractId, CancellationToken ct)
    {
        var ids = (await data.ListAsync<Invoice>(x => x.ContractID == contractId && x.InvoiceType == "DEPOSIT", ct))
            .Select(x => x.InvoiceID).ToArray();
        Require((await PaymentService.PendingAsync(data, ids, clock.GetUtcNow().UtcDateTime, ct)).Count == 0,
            "PAYMENT_RECONCILIATION_REQUIRED", "Chờ đối soát các giao dịch cọc trước khi ghi nhận hoàn.");
        return await data.ListAsync<Payment>(x => ids.Contains(x.InvoiceID) && x.Method == "VNPAY"
            && x.VnpayReceivedAmount > 0 && x.VnpayResponseCode == "00" && x.VnpayTransactionStatus == "00"
            && x.TransactionCode != null && !x.TransactionCode.StartsWith("MANUAL_"), ct);
    }
    private static object State(TransportRequest request) => new { requestId = request.RequestID, status = request.Status,
        reason = request.CancellationReason, requestedAt = request.CancellationRequestedAtUtc, previousStatus = request.CancellationPreviousStatus };
}
