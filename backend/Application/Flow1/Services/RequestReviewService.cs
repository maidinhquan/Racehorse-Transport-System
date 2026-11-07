using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed partial class RequestAssessmentService
{
    public Task<int> ExpireAsync(CancellationToken ct) => data.WriteAsync(async token =>
    {
        var now = Now;
        var expired = await data.ListAsync<RequestAssessment>(x => x.CustomerDeadlineUtc <= now
            && (x.Status == "CUSTOMER_SCHEDULE_PENDING" || x.Status == "CUSTOMER_CHANGES_PENDING"), token);
        var cancelled = 0;
        foreach (var review in expired)
        {
            var request = await data.FindAsync<TransportRequest>(token, review.RequestID);
            if (request?.Status != "CHANGES_REQUESTED") continue;
            var draft = (await data.ListAsync<Contract>(c => c.RequestID == request.RequestID, token)).SingleOrDefault();
            if (draft is not null)
            {
                if (draft.ContractStatus != "DRAFT" || draft.SignedAt is not null || !await HasNoFundsAsync(draft, token))
                    continue;
                draft.ContractStatus = "CANCELLED";
                foreach (var version in await data.ListAsync<ContractVersion>(v => v.ContractID == draft.ContractID && v.VersionStatus == "DRAFT", token))
                    version.VersionStatus = "CANCELLED";
            }
            request.Status = "CANCELLED";
            request.ManagerNotes = "Hết hạn phản hồi yêu cầu vận chuyển.";
            review.Status = "CLOSED";
            review.CustomerDeadlineUtc = null;
            notifications.Add(request.CustomerID, request.RequestID, "REQUEST_REVIEWED", "Yêu cầu đã hết hạn", request.ManagerNotes);
            cancelled++;
        }
        return cancelled;
    }, ct);

    private async Task<bool> HasNoFundsAsync(Contract contract, CancellationToken ct)
    {
        var invoices = await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID, ct);
        var ids = invoices.Select(i => i.InvoiceID).ToArray();
        return invoices.All(i => i.PaidAmount == 0)
            && (await PaymentService.PendingAsync(data, ids, Now, ct)).Count == 0
            && !(await data.ListAsync<Payment>(p => ids.Contains(p.InvoiceID) && p.VnpayReceivedAmount > 0, ct)).Any();
    }

    public async Task CloseForResubmissionAsync(string id, CancellationToken ct)
    {
        var review = await LatestAsync(id, ct);
        if (review is null) return; // Requests returned before the assessment workflow.
        Require(review.Status == "CUSTOMER_CHANGES_PENDING" && review.CustomerDeadlineUtc > Now,
            "INVALID_STATE", "Yêu cầu đã hết hạn chỉnh sửa hoặc đang chờ xác nhận lịch.");
        review.Status = "CLOSED";
        review.CustomerDeadlineUtc = null;
    }
}
