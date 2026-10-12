using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("QUARANTINE_BOOKING")]
    public class QuarantineBooking
    {
        [Key]
        [Column("BookingID")]
        [StringLength(50)]
        public string BookingId { get; set; } = null!;

        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("FacilityID")]
        [StringLength(50)]
        public string? FacilityId { get; set; }

        [Column("StationName")]
        [StringLength(200)]
        public string? StationName { get; set; }

        [Column("Country")]
        [StringLength(100)]
        public string? Country { get; set; }

        [Column("ExpectedStartDate")]
        public DateTime? ExpectedStartDate { get; set; }

        [Column("ExpectedEndDate")]
        public DateTime? ExpectedEndDate { get; set; }

        [Column("ConfirmationNumber")]
        [StringLength(100)]
        public string? ConfirmationNumber { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string? Status { get; set; }

        // Navigation properties
        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.QuarantineBookings))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(FacilityId))]
        [InverseProperty(nameof(PartnerFacility.QuarantineBookings))]
        public virtual PartnerFacility? Facility { get; set; }
    }
}

