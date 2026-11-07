using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class ContractLifecycleService(IDataSession data, AccessService access, ContractService contracts, PolicyService policies, TimeProvider clock)
{
    public Task<object> ExtendAsync(string actor, string id, ExtensionInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token); await contracts.CurrentAsync(contract, input.VersionNo, token);
        var request = await access.RequestAsync(contract.RequestID, actor, true, token);
        Require(contract.SignedAt is null && contract.ContractStatus == "ISSUED" && contract.CancellationStatus != "PENDING", "INVALID_STATE", "Only an open unsigned contract can be extended.");
        var hours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", request.DestinationCountry, request.TransportType, 1, null, false, token);
        var now = clock.GetUtcNow().UtcDateTime; var deadline = (contract.CompletionDeadline > now ? contract.CompletionDeadline.Value : now).AddHours((double)hours);
        Require(request.ExpectedDate is not null && request.PreparationDays is not null && deadline <= request.ExpectedDate.Value.AddDays(-request.PreparationDays.Value),
            "INVALID_STATE", "Extension would cross the preparation cutoff.");
        contract.CompletionDeadline = deadline; contract.LastExtensionReason = Required(input.Reason, 1000);
        contract.LastExtensionBy = actor; contract.LastExtensionAtUtc = now;
        foreach (var invoice in await data.ListAsync<Invoice>(i => i.ContractID == id && i.ContractVersionNo == input.VersionNo && i.InvoiceType == "DEPOSIT", token)) invoice.DueDate = deadline;
        return new { contractId = id, versionNo = input.VersionNo, newDeadline = deadline, reason = contract.LastExtensionReason, by = actor, at = now };
    }, ct);
    public Task<object> ReminderAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token);
        Require(contract.SignedAt is null && contract.ContractStatus == "ISSUED" && contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime, "INVALID_STATE", "Contract is not open for reminders.");
        var cutoff = clock.GetUtcNow().UtcDateTime.AddMinutes(-1);
        Require(!(await data.ListAsync<Notification>(n => n.ReferenceID == id && n.Type == "CONTRACT_REMINDER" && n.SentAt > cutoff, token)).Any(), "RATE_LIMITED", "Wait before sending another reminder.", 429);
        var notification = new Notification { UserID = contract.CustomerID, ReferenceID = id, Type = "CONTRACT_REMINDER", Channel = "IN_APP",
            Title = "Complete your contract", Message = "Review your current contract, pay the deposit and sign before the deadline.", SentAt = clock.GetUtcNow().UtcDateTime };
        data.Add(notification); await data.SaveAsync(token);
        return new { contractId = id, versionNo = contract.CurrentVersionNo, notificationId = notification.NotificationID, queued = true };
    }, ct);
    public Task<object> DeleteDraftAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.RequestAsync(id, actor, true, token);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == id, token)).SingleOrDefault();
        if (contract is null) return new { requestId = id, deleted = true };
        Require(contract.SignedAt is null && contract.CurrentVersionNo is not null, "INVALID_STATE", "No editable draft.");
        var current = await data.FindAsync<ContractVersion>(token, contract.ContractID, contract.CurrentVersionNo!.Value);
        Require(current?.VersionStatus == "DRAFT", "INVALID_STATE", "Published content cannot be deleted.");
        var previous = (await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID && v.VersionNo != current!.VersionNo, token)).OrderByDescending(v => v.VersionNo).FirstOrDefault();
        contract.CurrentVersionNo = null; await data.SaveAsync(token);
        data.Remove(current!); await data.SaveAsync(token);
        contract.CurrentVersionNo = previous?.VersionNo;
        if (previous is null)
        {
            foreach (var item in await data.ListAsync<CostItem>(c => c.ContractID == contract.ContractID, token)) data.Remove(item);
            await data.SaveAsync(token); data.Remove(contract);
        }
        return new { requestId = id, deleted = true };
    }, ct);
}
