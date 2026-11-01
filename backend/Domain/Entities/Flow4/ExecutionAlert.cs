using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("EXECUTION_ALERT")]
public class ExecutionAlert
{
    [Key]
    [Column("AlertID")]
    [StringLength(50)]
    public string AlertId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("MilestoneID")]
    [StringLength(50)]
    public string? MilestoneId { get; set; }

    [Column("AlertKind")]
    [StringLength(50)]
    public string AlertKind { get; set; } = null!; // MILESTONE_OVERDUE, HEALTH_CHECK_DUE, ETA_CHANGE

    [Column("Status")]
    [StringLength(20)]
    public string Status { get; set; } = "OPEN"; // OPEN, ACKNOWLEDGED, RESOLVED

    [Column("Message")]
    [StringLength(1000)]
    public string Message { get; set; } = null!;

    [Column("AssigneeUserIds")]
    [StringLength(500)]
    public string? AssigneeUserIds { get; set; }

    [Column("AcknowledgedBy")]
    [StringLength(50)]
    public string? AcknowledgedBy { get; set; }

    [Column("AcknowledgedAt")]
    public DateTime? AcknowledgedAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public virtual TripMilestone? Milestone { get; set; }

    [ForeignKey(nameof(AcknowledgedBy))]
    public virtual User? AcknowledgedByUser { get; set; }
}

