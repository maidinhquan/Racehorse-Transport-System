using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class NotificationDAO : BaseDAO<Notification>, INotificationDAO
{
    public NotificationDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Notification>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.SentAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Notification>> GetUnreadByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.SentAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(string notificationId, CancellationToken cancellationToken = default)
    {
        var item = await DbSet.FindAsync([notificationId], cancellationToken);
        if (item == null) return false;
        item.IsRead = true;
        await Context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(string userId, CancellationToken cancellationToken = default)
    {
        var unread = await DbSet.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(cancellationToken);
        foreach (var n in unread)
        {
            n.IsRead = true;
        }
        await Context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
