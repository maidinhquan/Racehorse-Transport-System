using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("TRIP_MILESTONE")]
public class TripMilestone
{
    [Key]
    [Column("MilestoneID")]
    [StringLength(50)]
    public string MilestoneId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("Leg")]
    [StringLength(20)]
    public string Leg { get; set; } = "road";

    [Column("MilestoneKind")]
    [StringLength(50)]
    public string MilestoneKind { get; set; } = null!;

    [Column("SequenceOrder")]
    public int SequenceOrder { get; set; }

    [Column("Label")]
    [StringLength(255)]
    public string Label { get; set; } = null!;

    [Column("Status")]
    [StringLength(20)]
    public string Status { get; set; } = "PENDING";

    [Column("PlannedTime")]
    public DateTime PlannedTime { get; set; }

    [Column("OccurredAt")]
    public DateTime? OccurredAt { get; set; }

    [Column("RecordedAt")]
    public DateTime? RecordedAt { get; set; }

    [Column("RecordedBy")]
    [StringLength(50)]
    public string? RecordedBy { get; set; }

    [Column("Revision")]
    public int Revision { get; set; } = 1;

    [Column("RequiresHealthCheck")]
    public bool RequiresHealthCheck { get; set; } = false;

    [Column("LocationCoordinates")]
    [StringLength(100)]
    public string? LocationCoordinates { get; set; }

    [Column("Latitude", TypeName = "decimal(9, 6)")]
    public decimal? Latitude { get; set; }

    [Column("Longitude", TypeName = "decimal(9, 6)")]
    public decimal? Longitude { get; set; }

    [Column("Note")]
    public string? Note { get; set; }

    [Column("EvidenceFileIds")]
    public string? EvidenceFileIds { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(RecordedBy))]
    public virtual User? RecordedByUser { get; set; }

    public virtual ICollection<MilestoneCorrectionRequest> CorrectionRequests { get; set; } = new List<MilestoneCorrectionRequest>();
    public virtual ICollection<TripExpense> Expenses { get; set; } = new List<TripExpense>();
}

