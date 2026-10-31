using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("SPECIALIST_AUDIT_LOG")]
    public class SpecialistAuditLog
    {
        [Key]
        [Column("AuditID")]
        [StringLength(50)]
        public string AuditId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string? TripId { get; set; }

        [Column("ActorId")]
        [StringLength(50)]
        public string ActorId { get; set; } = null!;

        [Column("Role")]
        [StringLength(50)]
        public string Role { get; set; } = null!;

        [Column("Action")]
        [StringLength(200)]
        public string Action { get; set; } = null!;

        [Column("Entity")]
        [StringLength(100)]
        public string Entity { get; set; } = null!;

        [Column("Detail")]
        public string? Detail { get; set; }

        [Column("CreatedAtUtc")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(ActorId))]
        public virtual User? ActorUser { get; set; }
    }
}

