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
        public string HorseId { get; set; } = null!;

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

        // Navigation properties
        [ForeignKey(nameof(HorseId))]
        [InverseProperty(nameof(Entities.Horse.LegalMedicalRecords))]
        public virtual Horse? Horse { get; set; }

        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.LegalMedicalRecords))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(VerifiedBy))]
        [InverseProperty(nameof(Entities.User.VerifiedMedicalRecords))]
        public virtual User? Verifier { get; set; }
    }
}

