using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("ETA_PROPOSAL")]
public class EtaProposal
{
    [Key]
    [Column("ProposalID")]
    [StringLength(50)]
    public string ProposalId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("MilestoneID")]
    [StringLength(50)]
    public string? MilestoneId { get; set; }

    [Column("CurrentEtaSnapshot")]
    public DateTime CurrentEtaSnapshot { get; set; }

    [Column("ProposedEta")]
    public DateTime ProposedEta { get; set; }

    [Column("Reason")]
    [StringLength(2000)]
    public string Reason { get; set; } = null!;

    [Column("LinkedIncidentId")]
    [StringLength(50)]
    public string? LinkedIncidentId { get; set; }

    [Column("Status")]
    [StringLength(30)]
    public string Status { get; set; } = "PENDING_COORDINATOR";

    [Column("RequiresManager")]
    public bool RequiresManager { get; set; } = false;

    [Column("EscalationReason")]
    [StringLength(1000)]
    public string? EscalationReason { get; set; }

    [Column("ProposedBy")]
    [StringLength(50)]
    public string ProposedBy { get; set; } = null!;

    [Column("ProposedAt")]
    public DateTime ProposedAt { get; set; } = DateTime.UtcNow;

    [Column("CoordinatorDecisionBy")]
    [StringLength(50)]
    public string? CoordinatorDecisionBy { get; set; }

    [Column("CoordinatorDecisionAt")]
    public DateTime? CoordinatorDecisionAt { get; set; }

    [Column("CoordinatorDecisionReason")]
    [StringLength(2000)]
    public string? CoordinatorDecisionReason { get; set; }

    [Column("ManagerDecisionBy")]
    [StringLength(50)]
    public string? ManagerDecisionBy { get; set; }

    [Column("ManagerDecisionAt")]
    public DateTime? ManagerDecisionAt { get; set; }

    [Column("ManagerDecisionReason")]
    [StringLength(2000)]
    public string? ManagerDecisionReason { get; set; }

    [Column("Version")]
    public int Version { get; set; } = 1;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public virtual TripMilestone? Milestone { get; set; }

    [ForeignKey(nameof(ProposedBy))]
    public virtual User? ProposedByUser { get; set; }

    [ForeignKey(nameof(CoordinatorDecisionBy))]
    public virtual User? CoordinatorDecisionByUser { get; set; }

    [ForeignKey(nameof(ManagerDecisionBy))]
    public virtual User? ManagerDecisionByUser { get; set; }
}

