namespace Domain.Flow1.Entities;

public sealed class Notification
{
    public string NotificationID { get; set; } = null!;
    public string UserID { get; set; } = null!;
    public string? ReferenceID { get; set; }
    public string? Type { get; set; }
    public string? Channel { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public bool IsRead { get; set; }
    public DateTime SentAt { get; set; }
}
