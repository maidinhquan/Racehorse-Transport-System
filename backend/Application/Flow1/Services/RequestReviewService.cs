using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestReviewService(IDataSession data, AccessService access, NotificationService notifications)
{
    public Task<object> AcceptAsync(string actor, string id, CancellationToken ct) => DecideAsync(actor, id, "CONTRACT_PREPARATION", null, ct);
    public Task<object> RejectAsync(string actor, string id, string reason, CancellationToken ct) => DecideAsync(actor, id, "REJECTED", Required(reason), ct);
    public Task<object> ChangesAsync(string actor, string id, string feedback, CancellationToken ct)
    {
        Require(feedback.Trim().Length >= 10, "VALIDATION_ERROR", "Explain the requested changes in at least ten characters.", 400);
        return DecideAsync(actor, id, "CHANGES_REQUESTED", Required(feedback), ct);
    }
    private Task<object> DecideAsync(string actor, string id, string next, string? message, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var row = await access.RequestAsync(id, actor, true, token);
        if (row.Status == next) return RequestMapper.View(row, await data.ListAsync<RequestHorse>(h => h.RequestID == id, token));
        Require(row.Status == "PENDING_REVIEW" || next == "REJECTED" && row.Status == "CHANGES_REQUESTED", "INVALID_STATE", "Only a submitted request can be reviewed.");
        row.Status = next;
        if (next == "CHANGES_REQUESTED") row.RevisionFeedback = message;
        else row.ManagerNotes = message;
        notifications.Add(row.CustomerID, row.RequestID, "REQUEST_REVIEWED", "Request reviewed", message ?? "Request accepted; the contract is being prepared.");
        return RequestMapper.View(row, await data.ListAsync<RequestHorse>(h => h.RequestID == id, token));
    }, ct);
}
