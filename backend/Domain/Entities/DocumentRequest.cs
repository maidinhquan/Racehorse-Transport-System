using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("DOCUMENT_REQUEST")]
    public class DocumentRequest
    {
        [Key]
        [Column("RequestDocID")]
        [StringLength(50)]
        public string RequestDocId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("KeyName")]
        [StringLength(50)]
        public string KeyName { get; set; } = null!;

        [Column("Scope")]
        [StringLength(50)]
        public string Scope { get; set; } = null!; // horseId or 'request'

        [Column("Reason")]
        [StringLength(1000)]
        public string Reason { get; set; } = null!;

        [Column("DueAt", TypeName = "date")]
        public DateTime? DueAt { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = "OPEN"; // OPEN, SUBMITTED, FULFILLED

        [Column("CreatedBy")]
        [StringLength(50)]
        public string CreatedBy { get; set; } = null!;

        [Column("CreatedAtUtc")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [Column("FulfilledAtUtc")]
        public DateTime? FulfilledAtUtc { get; set; }

        [ForeignKey(nameof(TripId))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(RequestId))]
        public virtual TransportRequest? TransportRequest { get; set; }

        [ForeignKey(nameof(CreatedBy))]
        public virtual User? CreatedByUser { get; set; }
    }
}

