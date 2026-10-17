using System.Text.Json;
using Application.DTOs.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed partial class DepositPaymentService
{
    private async Task<CancellationEvent[]> CancellationEvents(string id, CancellationToken ct) =>
        (await state.ReadAsync("cancellation", id, ct))?.Revisions.Select(r => r.Payload.Deserialize<CancellationEvent>(Json)!).ToArray() ?? [];
    private static bool CancellationPending(CancellationEvent[] events)
    {
        Require(events.All(e => e.Status is "PENDING" or "APPROVED" or "REJECTED"), "STATE_CONFLICT", "Cancellation evidence is invalid; reconciliation required.");
        return events.GroupBy(e => e.Id).Any(g => g.Last().Status == "PENDING");
    }
    private bool CanRequestCancellation(Context x, CancellationEvent[] events) => x.Current && x.Contract.ContractStatus == "SIGNED" &&
        x.Request.Status == "AWAITING_DEPOSIT" && x.Activation is null && !CancellationPending(events);
    public async Task<CancellationsView> CancellationsAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await Locate(id, actor, manager, ct);
        return await transactions.ExecuteAsync(c.RequestId, async token => {
            var x = await Load(id, c.RequestId, token); var events = await CancellationEvents(id, token);
            return new CancellationsView(id, events.Length, !manager && CanRequestCancellation(x, events), manager &&
                x.Current && x.Request.Status == "AWAITING_DEPOSIT" && x.Contract.ContractStatus == "SIGNED" && x.Activation is null && CancellationPending(events),
                events.GroupBy(e => e.Id).Select(g => { var e = g.Last(); return new CancellationItem(e.Id, e.Status, e.CustomerReason,
                    e.RequestedAtUtc, e.DecisionReason, e.AtUtc); }).ToArray());
        }, ct);
    }
    public async Task<CancellationsView> RequestCancellationAsync(string id, string actor, string key, RequestCancellationInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "REASON_REQUIRED", "Enter the cancellation request reason.");
        var c = await Locate(id, actor, false, ct); var hash = CustomerTransportService.Hash(new { actor, input, action = "REQUEST_CANCELLATION" });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(id, c.RequestId, token);
            var events = await CancellationEvents(id, token); var prior = events.SingleOrDefault(e => e.Key == key);
            if (prior is not null) { Require(prior.Hash == hash && prior.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used for another cancellation request."); return 0; }
            Require(events.Length == input.ExpectedVersion, "STALE_VERSION", "Cancellation history changed; reload.");
            Require(CanRequestCancellation(x, events), "CANCELLATION_CLOSED", "Only a signed request awaiting deposit can request cancellation; activated trips require operational review.");
            var now = clock.GetUtcNow(); var e = new CancellationEvent(key, hash, actor, "REQUESTED", "cancel-" + CustomerTransportService.Hash(new { id, actor, key })[..32],
                "PENDING", input.Reason.Trim(), now, null, now);
            await state.AppendAsync("cancellation", id, events.Length, "request-cancel-" + key, actor, "REQUESTED", JsonSerializer.SerializeToElement(e, Json), token);
            await Notify(x, "cancel-request-" + key, "Khách đã yêu cầu hủy sau ký. Chờ quản lý quyết định; yêu cầu chưa bị hủy và tiền đã nhận vẫn được giữ nguyên trong ledger.", token); return 0;
        }, ct);
        return await CancellationsAsync(id, actor, false, ct);
    }
    public async Task<CancellationsView> DecideCancellationAsync(string id, string cancellationId, string actor, string key, bool approve, DecideCancellationInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "REASON_REQUIRED", "Enter the customer-visible cancellation decision reason.");
        var c = await Locate(id, actor, true, ct); var hash = CustomerTransportService.Hash(new { actor, cancellationId, approve, input });
        await transactions.ExecuteAsync(c.RequestId, async token => {
            await work.LockPaymentReferenceAsync("ledger", token); var x = await Load(id, c.RequestId, token);
            var events = await CancellationEvents(id, token); var prior = events.SingleOrDefault(e => e.Key == key);
            if (prior is not null) { Require(prior.Hash == hash && prior.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used for another cancellation decision."); return 0; }
            var e = events.LastOrDefault(e => e.Id == cancellationId) ?? throw Error("Cancellation request not found.", "NOT_FOUND", 404);
            Require(events.Length == input.ExpectedVersion && x.Events.Length == input.ExpectedLedgerVersion && x.Deadline.Version == input.ExpectedDeadlineVersion,
                "STALE_VERSION", "Cancellation, receipts or deadline changed; reload before deciding.");
            Require(e.Status == "PENDING" && x.Current && x.Contract.ContractStatus == "SIGNED" && x.Request.Status == "AWAITING_DEPOSIT" && x.Activation is null,
                "CANCELLATION_CLOSED", "This cancellation request is no longer open for review.");
            if (approve)
            {
                Require(input.ReconciliationConfirmed, "RECONCILIATION_REQUIRED", "Confirm that all payment channels have been reconciled.");
                Require(x.Invoice.PaidAmount == 0, "FINANCIAL_REVIEW_REQUIRED", "Verified money exists; this action cannot refund or erase money to permit cancellation.");
                Require(!x.Payments.Any(p => p.Status is "PENDING_CONFIRMATION" or "PENDING_GATEWAY"), "PAYMENT_PENDING", "Resolve all pending proofs/provider transactions before approving cancellation.");
                Require(!x.CallbackConflict, "PROVIDER_RECONCILIATION_REQUIRED", "Provider results require reconciliation before cancellation.");
                x.Request.Status = "CANCELLED";
            }
            var next = e with { Key = key, Hash = hash, Actor = actor, Action = approve ? "APPROVED" : "REJECTED", Status = approve ? "APPROVED" : "REJECTED",
                DecisionReason = input.Reason.Trim(), AtUtc = clock.GetUtcNow() };
            await state.AppendAsync("cancellation", id, events.Length, "decide-cancel-" + key, actor, next.Action, JsonSerializer.SerializeToElement(next, Json), token);
            if (!approve) await Activate(x, actor, token); // Money may have arrived while cancellation was pending; never require another payment.
            await Notify(x, "cancel-decision-" + key, approve ? "Quản lý đã duyệt hủy sau đối soát không có tiền và không còn giao dịch chờ. Chữ ký, PDF và lịch sử được giữ nguyên."
                : "Quản lý đã từ chối yêu cầu hủy. Kiểm tra lý do và trạng thái cọc/chuyến hiện hành.", token); return 0;
        }, ct);
        return await CancellationsAsync(id, actor, true, ct);
    }
}
