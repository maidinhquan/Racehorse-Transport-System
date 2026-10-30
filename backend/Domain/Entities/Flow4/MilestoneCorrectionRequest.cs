using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("MILESTONE_CORRECTION_REQUEST")]
public class MilestoneCorrectionRequest
{
    [Key]
    [Column("CorrectionID")]
    [StringLength(50)]
    public string CorrectionId { get; set; } = null!;

    [Column("MilestoneID")]
    [StringLength(50)]
    public string MilestoneId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("RequestedBy")]
    [StringLength(50)]
    public string RequestedBy { get; set; } = null!;

    [Column("RequestedAt")]
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [Column("ProposedOccurredAt")]
    public DateTime ProposedOccurredAt { get; set; }

    [Column("ProposedNote")]
    public string? ProposedNote { get; set; }

    [Column("ProposedEvidenceFileIds")]
    public string? ProposedEvidenceFileIds { get; set; }

    [Column("OriginalOccurredAt")]
    public DateTime? OriginalOccurredAt { get; set; }

    [Column("OriginalNote")]
    public string? OriginalNote { get; set; }

    [Column("OriginalEvidenceFileIds")]
    public string? OriginalEvidenceFileIds { get; set; }

    [Column("Reason")]
    [StringLength(2000)]
    public string Reason { get; set; } = null!;

    [Column("Status")]
    [StringLength(30)]
    public string Status { get; set; } = "PENDING";

    [Column("Version")]
    public int Version { get; set; } = 1;

    [Column("DecidedBy")]
    [StringLength(50)]
    public string? DecidedBy { get; set; }

    [Column("DecidedAt")]
    public DateTime? DecidedAt { get; set; }

    [Column("DecisionReason")]
    [StringLength(2000)]
    public string? DecisionReason { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MilestoneId))]
    public virtual TripMilestone? Milestone { get; set; }

    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(RequestedBy))]
    public virtual User? RequestedByUser { get; set; }

    [ForeignKey(nameof(DecidedBy))]
    public virtual User? DecidedByUser { get; set; }
}

