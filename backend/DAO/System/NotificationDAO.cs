using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng NOTIFICATION (Thông báo lộ trình, sự cố, thông quan).
/// Tương ứng bảng NOTIFICATION trong HorseTransportDB.sql
/// </summary>
public class NotificationDAO : BaseDAO<Notification>
{
    public NotificationDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Notification>> GetByUserIdAsync(string userId)
    {
        return await _dbSet.AsNoTracking().Where(n => n.UserID == userId).OrderByDescending(n => n.NotificationID).ToListAsync();
    }

    public async Task<List<Notification>> GetUnreadByUserIdAsync(string userId)
    {
        return await _dbSet.AsNoTracking().Where(n => n.UserID == userId && !n.IsRead).ToListAsync();
    }

    public async Task<bool> MarkAsReadAsync(string notificationId)
    {
        var item = await _dbSet.FindAsync(notificationId);
        if (item == null) return false;
        item.IsRead = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(string userId)
    {
        var unread = await _dbSet.Where(n => n.UserID == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _context.SaveChangesAsync();
        return true;
    }
}
