using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("FLIGHT_CATALOG")]
    public class FlightCatalogItem
    {
        [Key]
        [Column("ServiceID")]
        [StringLength(50)]
        public string ServiceId { get; set; } = null!;

        [Column("PartnerID")]
        [StringLength(50)]
        public string PartnerId { get; set; } = null!;

        [Column("ProviderFlightCode")]
        [StringLength(50)]
        public string ProviderFlightCode { get; set; } = null!;

        [Column("Airline")]
        [StringLength(100)]
        public string Airline { get; set; } = null!;

        [Column("OriginAirportPlaceId")]
        [StringLength(50)]
        public string OriginAirportPlaceId { get; set; } = null!;

        [Column("DestAirportPlaceId")]
        [StringLength(50)]
        public string DestAirportPlaceId { get; set; } = null!;

        [Column("DepartureTime")]
        [StringLength(5)]
        public string DepartureTime { get; set; } = "05:00";

        [Column("ArrivalTime")]
        [StringLength(5)]
        public string ArrivalTime { get; set; } = "11:00";

        [Column("DepartureTimeZone")]
        [StringLength(50)]
        public string DepartureTimeZone { get; set; } = "Asia/Ho_Chi_Minh";

        [Column("ArrivalTimeZone")]
        [StringLength(50)]
        public string ArrivalTimeZone { get; set; } = "Asia/Tokyo";

        [Column("PriceVND", TypeName = "decimal(14, 2)")]
        public decimal PriceVnd { get; set; }

        [Column("CapacityHorses")]
        public int CapacityHorses { get; set; } = 4;

        [Column("CareProvider")]
        [StringLength(50)]
        public string CareProvider { get; set; } = "AIRLINE";

        [Column("DirectFlight")]
        public bool DirectFlight { get; set; } = true;

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(PartnerId))]
        [InverseProperty(nameof(AirPartner.FlightCatalogs))]
        public virtual AirPartner? Partner { get; set; }
    }
}

