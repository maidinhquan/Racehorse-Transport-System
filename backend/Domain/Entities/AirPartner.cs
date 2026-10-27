using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("AIR_PARTNER")]
    public class AirPartner
    {
        [Key]
        [Column("PartnerID")]
        [StringLength(50)]
        public string PartnerId { get; set; } = null!;

        [Column("PartnerName")]
        [StringLength(200)]
        public string PartnerName { get; set; } = null!;

        [Column("CountryCode")]
        [StringLength(3)]
        public string CountryCode { get; set; } = "VN";

        [Column("ContactEmail")]
        [StringLength(100)]
        public string? ContactEmail { get; set; }

        [Column("ContactPhone")]
        [StringLength(20)]
        public string? ContactPhone { get; set; }

        [Column("Status")]
        [StringLength(20)]
        public string Status { get; set; } = "ACTIVE";

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [InverseProperty(nameof(FlightCatalogItem.Partner))]
        public virtual ICollection<FlightCatalogItem> FlightCatalogs { get; set; } = new List<FlightCatalogItem>();
    }
}

