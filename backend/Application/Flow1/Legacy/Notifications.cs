using Domain.Flow1;
using Domain.Enums;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private async Task NotifyManagers(string reference, string type, string title, string message, CancellationToken ct)
    {
        foreach (var user in await db.QueryAsync<FlowUser>(u => u.IsActive, ct))
            if (Role(user) == UserRoles.LogisticsManager)
                await Notify(user.UserID, reference, type, title, message, ct);
    }

    private async Task Notify(string user, string reference, string type, string title, string message, CancellationToken ct)
    {
        var id = Id("notice", user, reference, type);
        if (await db.FindAsync<FlowNotice>(id, ct) is not null) return;
        db.Add(new FlowNotice { NotificationID = id, UserID = user, ReferenceID = reference.Split(':')[0],
            Type = type, Channel = "IN_APP", Title = title, Message = message, SentAt = Now, IsRead = false });
    }

    public Task<object> NotificationsAsync(string actor, CancellationToken ct) => db.RunAsync<object>(async t => {
        await Actor(actor, null, t);
        var notices = await db.QueryAsync<FlowNotice>(x => x.UserID == actor && x.Channel == "IN_APP", t);
        return notices.OrderByDescending(x => x.SentAt).Take(100).Select(x => new {
            id = x.NotificationID, referenceId = x.ReferenceID, type = x.Type, title = x.Title,
            message = x.Message, sentAt = x.SentAt, isRead = x.IsRead }).ToArray();
    }, ct);

    public Task<object> ReadNotificationAsync(string id, string actor, CancellationToken ct) => db.RunAsync<object>(async t => {
        await Actor(actor, null, t);
        var n = await db.FindAsync<FlowNotice>(id, t);
        if (n is null || n.UserID != actor || n.Channel != "IN_APP") throw Error("Notification not found.", "NOT_FOUND", 404);
        n.IsRead = true; await db.SaveAsync(t); return new { read = true };
    }, ct);
}
