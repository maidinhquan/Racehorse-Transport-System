using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("AIR_NOTICE")]
public class AirNotice
{
    [Key]
    [Column("NoticeID")]
    [StringLength(50)]
    public string NoticeId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("BookingID")]
    [StringLength(50)]
    public string? BookingId { get; set; }

    [Column("NoticeKind")]
    [StringLength(50)]
    public string NoticeKind { get; set; } = null!; // ESTIMATED_SCHEDULE, ACTUAL_DEPARTURE, ACTUAL_ARRIVAL

    [Column("DepartureAt")]
    public DateTime? DepartureAt { get; set; }

    [Column("ArrivalAt")]
    public DateTime? ArrivalAt { get; set; }

    [Column("ReceivedAt")]
    public DateTime ReceivedAt { get; set; }

    [Column("SourceReference")]
    [StringLength(255)]
    public string SourceReference { get; set; } = null!;

    [Column("Reason")]
    [StringLength(2000)]
    public string Reason { get; set; } = null!;

    [Column("EvidenceFileIds")]
    public string? EvidenceFileIds { get; set; }

    [Column("IncidentID")]
    [StringLength(50)]
    public string? IncidentId { get; set; }

    [Column("RequiresPlanChange")]
    public bool RequiresPlanChange { get; set; } = false;

    [Column("MilestoneApplied")]
    public bool MilestoneApplied { get; set; } = false;

    [Column("RecordedBy")]
    [StringLength(50)]
    public string RecordedBy { get; set; } = null!;

    [Column("RecordedAt")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(RecordedBy))]
    public virtual User? RecordedByUser { get; set; }
}

