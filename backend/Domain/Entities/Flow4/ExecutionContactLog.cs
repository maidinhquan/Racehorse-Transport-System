using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("EXECUTION_CONTACT_LOG")]
public class ExecutionContactLog
{
    [Key]
    [Column("ContactLogID")]
    [StringLength(50)]
    public string ContactLogId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("ContactedUserID")]
    [StringLength(50)]
    public string ContactedUserId { get; set; } = null!;

    [Column("RecordedBy")]
    [StringLength(50)]
    public string RecordedBy { get; set; } = null!;

    [Column("ContactedAt")]
    public DateTime ContactedAt { get; set; }

    [Column("Channel")]
    [StringLength(30)]
    public string Channel { get; set; } = "PHONE"; // PHONE, IN_PERSON, OTHER

    [Column("Result")]
    [StringLength(2000)]
    public string Result { get; set; } = null!;

    [Column("RecordedAt")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(ContactedUserId))]
    public virtual User? ContactedUser { get; set; }

    [ForeignKey(nameof(RecordedBy))]
    public virtual User? RecordedByUser { get; set; }
}

