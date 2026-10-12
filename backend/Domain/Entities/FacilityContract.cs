using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("FACILITY_CONTRACT")]
    public class FacilityContract
    {
        [Key]
        [Column("FacilityContractID")]
        [StringLength(50)]
        public string FacilityContractId { get; set; } = null!;

        [Column("FacilityID")]
        [StringLength(50)]
        public string FacilityId { get; set; } = null!;

        [Column("ContractCode")]
        [StringLength(50)]
        public string ContractCode { get; set; } = null!;

        [Column("ValidFrom", TypeName = "date")]
        public DateTime? ValidFrom { get; set; }

        [Column("ValidTo", TypeName = "date")]
        public DateTime? ValidTo { get; set; }

        [Column("RestFeePerHorse_Day", TypeName = "decimal(12, 2)")]
        public decimal? RestFeePerHorseDay { get; set; }

        [Column("BasicMedicalCheckFee", TypeName = "decimal(12, 2)")]
        public decimal? BasicMedicalCheckFee { get; set; }

        [Column("DocumentUrl")]
        [StringLength(500)]
        public string? DocumentUrl { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(FacilityId))]
        [InverseProperty(nameof(PartnerFacility.FacilityContracts))]
        public virtual PartnerFacility? Facility { get; set; }
    }
}

