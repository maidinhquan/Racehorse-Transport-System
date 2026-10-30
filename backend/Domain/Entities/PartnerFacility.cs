using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("PARTNER_FACILITY")]
    public class PartnerFacility
    {
        [Key]
        [Column("FacilityID")]
        [StringLength(50)]
        public string FacilityId { get; set; } = null!;

        [Column("Name")]
        [StringLength(200)]
        public string Name { get; set; } = null!;

        [Column("FacilityType")]
        [StringLength(50)]
        public string? FacilityType { get; set; }

        // Flow 3 v2: Place Purposes đa chức năng (REST, FUEL, QUARANTINE, BORDER, AIRPORT)
        [Column("Purposes")]
        [StringLength(100)]
        public string? Purposes { get; set; }

        [Column("CountryCode")]
        [StringLength(3)]
        public string CountryCode { get; set; } = "VN";

        [Column("State_Province")]
        [StringLength(100)]
        public string? StateProvince { get; set; }

        [Column("City")]
        [StringLength(100)]
        public string? City { get; set; }

        [Column("Address")]
        [StringLength(500)]
        public string? Address { get; set; }

        [Column("Coordinates")]
        [StringLength(100)]
        public string? Coordinates { get; set; }

        [Column("Latitude", TypeName = "decimal(9, 6)")]
        public decimal? Latitude { get; set; }

        [Column("Longitude", TypeName = "decimal(9, 6)")]
        public decimal? Longitude { get; set; }

        [Column("TimeZone")]
        [StringLength(50)]
        public string? TimeZone { get; set; }

        [Column("OperatingHours")]
        [StringLength(50)]
        public string? OperatingHours { get; set; } = "24/7";

        [Column("SupportsOvernight")]
        public bool SupportsOvernight { get; set; } = false;

        [Column("HasTruckParking")]
        public bool HasTruckParking { get; set; } = true;

        [Column("HasLoadingArea")]
        public bool HasLoadingArea { get; set; } = true;

        [Column("HasStabling")]
        public bool HasStabling { get; set; } = true;

        [Column("HasWaterFeed")]
        public bool HasWaterFeed { get; set; } = true;

        [Column("CapacityStalls")]
        public int? CapacityStalls { get; set; }

        [Column("ContactPerson")]
        [StringLength(100)]
        public string? ContactPerson { get; set; }

        [Column("ContactPhone")]
        [StringLength(20)]
        public string? ContactPhone { get; set; }

        [Column("TaxID_BusinessCode")]
        [StringLength(50)]
        public string? TaxIdBusinessCode { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        // Navigation properties
        [InverseProperty(nameof(FacilityContract.Facility))]
        public virtual ICollection<FacilityContract> FacilityContracts { get; set; } = new List<FacilityContract>();

        [InverseProperty(nameof(FacilityCertification.Facility))]
        public virtual ICollection<FacilityCertification> FacilityCertifications { get; set; } = new List<FacilityCertification>();

        [InverseProperty(nameof(QuarantineBooking.Facility))]
        public virtual ICollection<QuarantineBooking> QuarantineBookings { get; set; } = new List<QuarantineBooking>();

        [InverseProperty(nameof(RouteSegment.Facility))]
        public virtual ICollection<RouteSegment> RouteSegments { get; set; } = new List<RouteSegment>();
    }
}
