using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("HEALTH_LOG")]
    public class HealthLog
    {
        [Key]
        [Column("LogID")]
        [StringLength(50)]
        public string LogId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("HorseID")]
        [StringLength(50)]
        public string HorseId { get; set; } = null!;

        [Column("EscortID")]
        [StringLength(50)]
        public string EscortId { get; set; } = null!;

        [Column("LogType")]
        [StringLength(50)]
        public string? LogType { get; set; }

        [Column("LogTime")]
        public DateTime LogTime { get; set; } = DateTime.UtcNow;

        [Column("Temperature", TypeName = "decimal(4, 1)")]
        public decimal? Temperature { get; set; }

        [Column("HeartRate")]
        public int? HeartRate { get; set; }

        [Column("HealthStatus")]
        [StringLength(100)]
        public string? HealthStatus { get; set; }

        [Column("Description")]
        public string? Description { get; set; }

        [Column("MediaUrl")]
        [StringLength(500)]
        public string? MediaUrl { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.HealthLogs))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(HorseId))]
        [InverseProperty(nameof(Entities.Horse.HealthLogs))]
        public virtual Horse? Horse { get; set; }

        [ForeignKey(nameof(EscortId))]
        [InverseProperty(nameof(Entities.User.HealthLogs))]
        public virtual User? Escort { get; set; }
    }
}

