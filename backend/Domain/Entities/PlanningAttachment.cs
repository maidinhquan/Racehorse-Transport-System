using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("PLANNING_ATTACHMENT")]
    public class PlanningAttachment
    {
        [Key]
        [Column("FileID")]
        [StringLength(50)]
        public string FileId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("FileName")]
        [StringLength(255)]
        public string FileName { get; set; } = null!;

        [Column("FileType")]
        [StringLength(50)]
        public string FileType { get; set; } = "FLIGHT_EVIDENCE";

        [Column("ContentType")]
        [StringLength(100)]
        public string ContentType { get; set; } = "application/pdf";

        [Column("FileSize")]
        public long FileSize { get; set; }

        [Column("StoragePath")]
        [StringLength(500)]
        public string StoragePath { get; set; } = null!;

        [Column("UploadedBy")]
        [StringLength(50)]
        public string? UploadedBy { get; set; }

        [Column("UploadedAtUtc")]
        public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.PlanningAttachments))]
        public virtual TripPlan? Trip { get; set; }
    }
}

