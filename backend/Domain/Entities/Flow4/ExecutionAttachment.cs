using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.Flow4;

[Table("EXECUTION_ATTACHMENT")]
public class ExecutionAttachment
{
    [Key]
    [Column("FileID")]
    [StringLength(50)]
    public string FileId { get; set; } = null!;

    [Column("TripID")]
    [StringLength(50)]
    public string TripId { get; set; } = null!;

    [Column("HorseID")]
    [StringLength(50)]
    public string? HorseId { get; set; }

    [Column("FileName")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("ContentType")]
    [StringLength(100)]
    public string ContentType { get; set; } = null!;

    [Column("FileSize")]
    public long FileSize { get; set; }

    [Column("Purpose")]
    [StringLength(30)]
    public string Purpose { get; set; } = null!; // MILESTONE, AIR, CHECKPOINT, HEALTH, EXPENSE

    [Column("StoragePath")]
    [StringLength(500)]
    public string StoragePath { get; set; } = null!;

    [Column("UploadedBy")]
    [StringLength(50)]
    public string UploadedBy { get; set; } = null!;

    [Column("UploadedAtUtc")]
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(TripId))]
    public virtual TripPlan? Trip { get; set; }

    [ForeignKey(nameof(HorseId))]
    public virtual Horse? Horse { get; set; }

    [ForeignKey(nameof(UploadedBy))]
    public virtual User? UploadedByUser { get; set; }
}

