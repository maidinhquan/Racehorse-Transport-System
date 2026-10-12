using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("FACILITY_CERTIFICATION")]
    public class FacilityCertification
    {
        [Key]
        [Column("CertID")]
        [StringLength(50)]
        public string CertId { get; set; } = null!;

        [Column("FacilityID")]
        [StringLength(50)]
        public string FacilityId { get; set; } = null!;

        [Column("CertName")]
        [StringLength(200)]
        public string? CertName { get; set; }

        [Column("IssuedBy")]
        [StringLength(200)]
        public string? IssuedBy { get; set; }

        [Column("CountryOfIssue")]
        [StringLength(3)]
        public string? CountryOfIssue { get; set; }

        [Column("IsInternationalStandard")]
        public bool IsInternationalStandard { get; set; } = false;

        [Column("IssueDate", TypeName = "date")]
        public DateTime? IssueDate { get; set; }

        [Column("ExpiryDate", TypeName = "date")]
        public DateTime? ExpiryDate { get; set; }

        [Column("DocumentUrl")]
        [StringLength(500)]
        public string? DocumentUrl { get; set; }

        // Navigation properties
        [ForeignKey(nameof(FacilityId))]
        [InverseProperty(nameof(PartnerFacility.FacilityCertifications))]
        public virtual PartnerFacility? Facility { get; set; }
    }
}

