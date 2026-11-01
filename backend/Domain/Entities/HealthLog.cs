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
        public string? TripId { get; set; }

        [Column("HorseID")]
        [StringLength(50)]
        public string? HorseId { get; set; }

        [Column("EscortID")]
        [StringLength(50)]
        public string? EscortId { get; set; }

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

        // Flow 4: Detailed Vitals & Observations
        [Column("Condition")]
        [StringLength(20)]
        public string? Condition { get; set; } = "NORMAL";

        [Column("RespiratoryRatePerMin")]
        public int? RespiratoryRatePerMin { get; set; }

        [Column("HydrationStatus")]
        [StringLength(50)]
        public string? HydrationStatus { get; set; }

        [Column("AppetiteStatus")]
        [StringLength(50)]
        public string? AppetiteStatus { get; set; }

        [Column("FecesCondition")]
        [StringLength(50)]
        public string? FecesCondition { get; set; }

        [Column("Feeding")]
        [StringLength(500)]
        public string? Feeding { get; set; }

        [Column("Water")]
        [StringLength(500)]
        public string? Water { get; set; }

        [Column("RestStatus")]
        [StringLength(500)]
        public string? RestStatus { get; set; }

        [Column("CareNotes")]
        public string? CareNotes { get; set; }

        [Column("PhotoFileIds")]
        public string? PhotoFileIds { get; set; }

        [Column("IncidentID")]
        [StringLength(50)]
        public string? IncidentId { get; set; }

        [Column("IncidentRequired")]
        public bool? IncidentRequired { get; set; } = false;

        [Column("SupersedesLogId")]
        [StringLength(50)]
        public string? SupersedesLogId { get; set; }

        [Column("AmendmentReason")]
        [StringLength(500)]
        public string? AmendmentReason { get; set; }

        [Column("MilestoneID")]
        [StringLength(50)]
        public string? MilestoneId { get; set; }

        [Column("LegType")]
        [StringLength(20)]
        public string? LegType { get; set; } = "road";

        [Column("RecordedAt")]
        public DateTime? RecordedAt { get; set; } = DateTime.UtcNow;

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
