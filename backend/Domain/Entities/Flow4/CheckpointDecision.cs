using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("LEGAL_CHECKPOINT_DECISION")]
public class CheckpointDecision
{
    [Key]
    [Column("DecisionID")]
    [StringLength(50)]
    public string DecisionId { get; set; } = null!;

    [Column("CheckpointID")]
    [StringLength(50)]
    public string CheckpointId { get; set; } = null!;

    [Column("MilestoneID")]
    [StringLength(50)]
    public string? MilestoneId { get; set; }

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("SpecialistID")]
    [StringLength(50)]
    public string SpecialistId { get; set; } = null!;

    [Column("Decision")]
    [StringLength(30)]
    public string Decision { get; set; } = null!; // CLEARED, HELD, SUPPLEMENT_REQUIRED

    [Column("OccurredAt")]
    public DateTime OccurredAt { get; set; }

    [Column("Reason")]
    [StringLength(2000)]
    public string Reason { get; set; } = null!;

    [Column("EvidenceFileIds")]
    public string EvidenceFileIds { get; set; } = null!;

    [Column("RecordedAt")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    [Column("Version")]
    public int Version { get; set; } = 1;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(SpecialistId))]
    public virtual User? SpecialistUser { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public virtual TripMilestone? Milestone { get; set; }
}

