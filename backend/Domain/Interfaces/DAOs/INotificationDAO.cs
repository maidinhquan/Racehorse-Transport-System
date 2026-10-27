using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface INotificationDAO : IBaseDAO<Notification>
{
    Task<List<Notification>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<List<Notification>> GetUnreadByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAsReadAsync(string notificationId, CancellationToken cancellationToken = default);
    Task<bool> MarkAllAsReadAsync(string userId, CancellationToken cancellationToken = default);
}
