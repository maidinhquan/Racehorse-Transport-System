using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRANSPORT_REQUEST")]
    public class TransportRequest
    {
        [Key]
        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("CustomerID")]
        [StringLength(50)]
        public string CustomerId { get; set; } = null!;

        [Column("Departure")]
        [StringLength(255)]
        public string Departure { get; set; } = null!;

        [Column("Destination")]
        [StringLength(255)]
        public string Destination { get; set; } = null!;

        [Column("Purpose")]
        [StringLength(100)]
        public string? Purpose { get; set; }

        [Column("TransportType")]
        [StringLength(50)]
        public string? TransportType { get; set; }

        [Column("ExpectedDate")]
        public DateTime? ExpectedDate { get; set; }

        [Column("CommittedDeadline")]
        public DateTime? CommittedDeadline { get; set; }

        [Column("DesignatedReceiverName")]
        [StringLength(100)]
        public string? DesignatedReceiverName { get; set; }

        [Column("DesignatedReceiverPhone")]
        [StringLength(20)]
        public string? DesignatedReceiverPhone { get; set; }

        [Column("BaseCost", TypeName = "decimal(12, 2)")]
        public decimal? BaseCost { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(CustomerId))]
        [InverseProperty(nameof(Entities.User.TransportRequests))]
        public virtual User? Customer { get; set; }

        [InverseProperty(nameof(RequestHorseMapping.Request))]
        public virtual ICollection<RequestHorseMapping> RequestHorseMappings { get; set; } = new List<RequestHorseMapping>();

        [InverseProperty(nameof(LegalMedicalRecord.Request))]
        public virtual ICollection<LegalMedicalRecord> LegalMedicalRecords { get; set; } = new List<LegalMedicalRecord>();

        [InverseProperty(nameof(QuarantineBooking.Request))]
        public virtual ICollection<QuarantineBooking> QuarantineBookings { get; set; } = new List<QuarantineBooking>();

        [InverseProperty(nameof(TripPlan.Request))]
        public virtual ICollection<TripPlan> TripPlans { get; set; } = new List<TripPlan>();
    }
}

