using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("LEGAL_MEDICAL_RECORD")]
    public class LegalMedicalRecord
    {
        [Key]
        [Column("RecordID")]
        [StringLength(50)]
        public string RecordId { get; set; } = null!;

        [Column("HorseID")]
        [StringLength(50)]
        public string? HorseId { get; set; }

        [Column("TripID")]
        [StringLength(50)]
        public string? TripId { get; set; }

        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("VerifiedBy")]
        [StringLength(50)]
        public string? VerifiedBy { get; set; }

        [Column("DocumentType")]
        [StringLength(50)]
        public string? DocumentType { get; set; }

        [Column("RequirementStatus")]
        [StringLength(50)]
        public string? RequirementStatus { get; set; }

        [Column("DocumentStatus")]
        [StringLength(50)]
        public string? DocumentStatus { get; set; }

        [Column("UploadedFileUrl")]
        [StringLength(500)]
        public string? UploadedFileUrl { get; set; }

        [Column("ExpiryDate", TypeName = "date")]
        public DateTime? ExpiryDate { get; set; }

        [Column("DocumentVersion")]
        public int DocumentVersion { get; set; } = 1;

        [Column("DocumentNumber")]
        [StringLength(100)]
        public string? DocumentNumber { get; set; }

        [Column("IssuingAuthority")]
        [StringLength(255)]
        public string? IssuingAuthority { get; set; }

        [Column("IssuedDate", TypeName = "date")]
        public DateTime? IssuedDate { get; set; }

        [Column("PhysicalCopyCollected")]
        public bool PhysicalCopyCollected { get; set; } = false;

        [Column("ReviewedBy")]
        [StringLength(50)]
        public string? ReviewedBy { get; set; }

        [Column("ReviewedAtUtc")]
        public DateTime? ReviewedAtUtc { get; set; }

        [Column("RejectionReason")]
        [StringLength(1000)]
        public string? RejectionReason { get; set; }

        [Column("DocumentScope")]
        [StringLength(50)]
        public string DocumentScope { get; set; } = "PER_HORSE";

        // Navigation properties
        [ForeignKey(nameof(HorseId))]
        [InverseProperty(nameof(Entities.Horse.LegalMedicalRecords))]
        public virtual Horse? Horse { get; set; }

        [ForeignKey(nameof(TripId))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.LegalMedicalRecords))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(VerifiedBy))]
        [InverseProperty(nameof(Entities.User.VerifiedMedicalRecords))]
        public virtual User? Verifier { get; set; }

        [ForeignKey(nameof(ReviewedBy))]
        public virtual User? Reviewer { get; set; }
    }
}
