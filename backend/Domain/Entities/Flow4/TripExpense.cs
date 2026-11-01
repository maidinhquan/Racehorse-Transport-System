using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("TRIP_EXPENSE")]
public class TripExpense
{
    [Key]
    [Column("ExpenseID")]
    [StringLength(50)]
    public string ExpenseId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("RecordedBy")]
    [StringLength(50)]
    public string RecordedBy { get; set; } = null!;

    [Column("MilestoneID")]
    [StringLength(50)]
    public string? MilestoneId { get; set; }

    [Column("Category")]
    [StringLength(50)]
    public string Category { get; set; } = "OTHER"; // TOLL_FEE, FEED_SUPPLIES, EMERGENCY_CARE, OTHER

    [Column("AmountVnd", TypeName = "decimal(14, 2)")]
    public decimal AmountVnd { get; set; }

    [Column("OccurredAt")]
    public DateTime OccurredAt { get; set; }

    [Column("Reason")]
    [StringLength(2000)]
    public string Reason { get; set; } = null!;

    [Column("ReceiptPhotoUrl")]
    [StringLength(500)]
    public string? ReceiptPhotoUrl { get; set; }

    [Column("ReceiptFileIds")]
    public string? ReceiptFileIds { get; set; }

    [Column("Status")]
    [StringLength(30)]
    public string Status { get; set; } = "RECORDED";

    [Column("RecordedAt")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(RecordedBy))]
    public virtual User? RecordedByUser { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public virtual TripMilestone? Milestone { get; set; }
}

