using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class NotificationService(IDataSession data, AccessService access, TimeProvider clock)
{
    public void Add(string user, string reference, string kind, string title, string message) => data.Add(new Notification
    { UserID = user, ReferenceID = reference, Type = kind, Channel = "IN_APP", Title = title, Message = message, SentAt = clock.GetUtcNow().UtcDateTime });
    public async Task<object> ListAsync(string actor, CancellationToken ct)
    {
        await access.AccountAsync(actor, null, ct);
        return (await data.ListAsync<Notification>(n => n.UserID == actor, ct)).OrderByDescending(n => n.SentAt)
            .Select(n => new { id = n.NotificationID, referenceId = n.ReferenceID, type = n.Type, title = n.Title,
                body = n.Message, at = n.SentAt.ToString("yyyy-MM-dd HH:mm"), read = n.IsRead,
                link = n.ReferenceID?.StartsWith("REQUEST_", StringComparison.Ordinal) == true ? $"/customer/requests/{n.ReferenceID}" : null }).ToArray();
    }
    public Task<object> ReadAsync(string actor, string? id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, null, token);
        var rows = await data.ListAsync<Notification>(n => n.UserID == actor && (id == null || n.NotificationID == id), token);
        Require(id is null || rows.Count == 1, "NOT_FOUND", "Notification not found.", 404);
        foreach (var row in rows) row.IsRead = true;
        return id is null ? new { updated = rows.Count } : new { id = id, read = true };
    }, ct);
}
