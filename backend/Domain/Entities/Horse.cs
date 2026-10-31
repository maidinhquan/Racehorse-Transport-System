using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("HORSE")]
    public class Horse
    {
        [Key]
        [Column("HorseID")]
        [StringLength(50)]
        public string HorseId { get; set; } = null!;

        [Column("OwnerID")]
        [StringLength(50)]
        public string OwnerId { get; set; } = null!;

        [Column("Microchip_ISO")]
        [StringLength(50)]
        public string MicrochipIso { get; set; } = null!;

        [Column("FEI_Passport_No")]
        [StringLength(50)]
        public string? FeiPassportNo { get; set; }

        [Column("Name")]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        [Column("Breed")]
        [StringLength(100)]
        public string? Breed { get; set; }

        [Column("Sex")]
        [StringLength(20)]
        public string? Sex { get; set; }

        [Column("ReproductiveStatus")]
        [StringLength(50)]
        public string? ReproductiveStatus { get; set; }

        [Column("Weight", TypeName = "decimal(10, 2)")]
        public decimal? Weight { get; set; }

        [Column("DOB", TypeName = "date")]
        public DateTime? Dob { get; set; }

        [Column("PassportIssuedBy", TypeName = "nvarchar(200)")]
        public string? PassportIssuedBy { get; set; }
        [Column("PassportIssuedDate", TypeName = "date")]
        public DateTime? PassportIssuedDate { get; set; }
        [Column("PassportExpiryDate", TypeName = "date")]
        public DateTime? PassportExpiryDate { get; set; }
        [Column("OwnershipCertificateFileUrl", TypeName = "nvarchar(500)")]
        public string? OwnershipCertificateFileUrl { get; set; }
        [Column("ValuationDocumentFileUrl", TypeName = "nvarchar(500)")]
        public string? ValuationDocumentFileUrl { get; set; }
        [Column("DeclaredValueVnd", TypeName = "decimal(18,2)")]
        public decimal? DeclaredValueVnd { get; set; }
        [Column("SpecialHealthNotes", TypeName = "nvarchar(2000)")]
        public string? SpecialHealthNotes { get; set; }

        [Column("PhotoUrl", TypeName = "nvarchar(500)")]
        public string? PhotoUrl { get; set; }

        [Column("PassportScanUrl", TypeName = "nvarchar(500)")]
        public string? PassportScanUrl { get; set; }

        // Navigation properties
        [ForeignKey(nameof(OwnerId))]
        [InverseProperty(nameof(Entities.User.Horses))]
        public virtual User? Owner { get; set; }

        [InverseProperty(nameof(RequestHorseMapping.Horse))]
        public virtual ICollection<RequestHorseMapping> RequestHorseMappings { get; set; } = new List<RequestHorseMapping>();

        [InverseProperty(nameof(LegalMedicalRecord.Horse))]
        public virtual ICollection<LegalMedicalRecord> LegalMedicalRecords { get; set; } = new List<LegalMedicalRecord>();

        [InverseProperty(nameof(HealthLog.Horse))]
        public virtual ICollection<HealthLog> HealthLogs { get; set; } = new List<HealthLog>();

        [InverseProperty(nameof(HandoverItem.Horse))]
        public virtual ICollection<HandoverItem> HandoverItems { get; set; } = new List<HandoverItem>();
    }
}

