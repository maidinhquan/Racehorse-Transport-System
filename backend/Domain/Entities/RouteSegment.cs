using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("ROUTE_SEGMENT")]
    public class RouteSegment
    {
        [Key]
        [Column("SegmentID")]
        [StringLength(50)]
        public string SegmentId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("FacilityID")]
        [StringLength(50)]
        public string? FacilityId { get; set; }

        [Column("LocationName")]
        [StringLength(255)]
        public string LocationName { get; set; } = null!;

        [Column("SegmentType")]
        [StringLength(50)]
        public string? SegmentType { get; set; }

        [Column("TransportMode")]
        [StringLength(50)]
        public string TransportMode { get; set; } = "ROAD";

        [Column("CarrierName")]
        [StringLength(100)]
        public string? CarrierName { get; set; }

        [Column("Flight_Voyage_No")]
        [StringLength(50)]
        public string? FlightVoyageNo { get; set; }

        [Column("ExpectedETA")]
        public DateTime? ExpectedEta { get; set; }

        [Column("ActualTime")]
        public DateTime? ActualTime { get; set; }

        [Column("Latitude", TypeName = "decimal(9, 6)")]
        public decimal? Latitude { get; set; }

        [Column("Longitude", TypeName = "decimal(9, 6)")]
        public decimal? Longitude { get; set; }

        [Column("Coordinates")]
        [StringLength(100)]
        public string? Coordinates { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string? Status { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.RouteSegments))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(FacilityId))]
        [InverseProperty(nameof(PartnerFacility.RouteSegments))]
        public virtual PartnerFacility? Facility { get; set; }

        [InverseProperty(nameof(CustomsClearance.Segment))]
        public virtual ICollection<CustomsClearance> CustomsClearances { get; set; } = new List<CustomsClearance>();
    }
}

