using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("FLIGHT_BOOKING")]
    public class FlightBooking
    {
        [Key]
        [Column("FlightBookingID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int FlightBookingId { get; set; }

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("BookingVersion")]
        public int BookingVersion { get; set; } = 1;

        [Column("RouteVersionID")]
        public int? RouteVersionId { get; set; }

        [Column("ProviderName")]
        [StringLength(200)]
        public string ProviderName { get; set; } = null!;

        [Column("Airline")]
        [StringLength(100)]
        public string Airline { get; set; } = null!;

        [Column("FlightNumber")]
        [StringLength(50)]
        public string FlightNumber { get; set; } = null!;

        [Column("DepartureAirportCheckpointId")]
        public int? DepartureAirportCheckpointId { get; set; }

        [Column("ArrivalAirportCheckpointId")]
        public int? ArrivalAirportCheckpointId { get; set; }

        [Column("DepartureAt")]
        public DateTime DepartureAt { get; set; }

        [Column("ArrivalAt")]
        public DateTime ArrivalAt { get; set; }

        [Column("DirectFlight")]
        public bool DirectFlight { get; set; } = true;

        [Column("BookingReference")]
        [StringLength(100)]
        public string BookingReference { get; set; } = null!;

        [Column("BookingConfirmed")]
        public bool BookingConfirmed { get; set; } = true;

        [Column("HorseIds")]
        public string? HorseIds { get; set; }

        [Column("Note")]
        public string? Note { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.FlightBookings))]
        public virtual TripPlan? Trip { get; set; }
    }
}

