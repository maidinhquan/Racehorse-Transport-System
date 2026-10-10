using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("NOTIFICATION")]
    public class Notification
    {
        [Key]
        [Column("NotificationID")]
        [StringLength(50)]
        public string NotificationId { get; set; } = null!;

        [Column("UserID")]
        [StringLength(50)]
        public string UserId { get; set; } = null!;

        [Column("ReferenceID")]
        [StringLength(50)]
        public string? ReferenceId { get; set; }

        [Column("Type")]
        [StringLength(50)]
        public string? Type { get; set; }

        [Column("Channel")]
        [StringLength(50)]
        public string? Channel { get; set; }

        [Column("Title")]
        [StringLength(200)]
        public string? Title { get; set; }

        [Column("Message")]
        public string? Message { get; set; }

        [Column("IsRead")]
        public bool IsRead { get; set; } = false;

        [Column("SentAt")]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(UserId))]
        [InverseProperty(nameof(Entities.User.Notifications))]
        public virtual User? User { get; set; }
    }
}

