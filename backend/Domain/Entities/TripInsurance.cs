using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_INSURANCE")]
    public class TripInsurance
    {
        [Key]
        [Column("InsuranceID")]
        [StringLength(50)]
        public string InsuranceId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("Insurer")]
        [StringLength(150)]
        public string Insurer { get; set; } = null!;

        [Column("PolicyNumber")]
        [StringLength(100)]
        public string PolicyNumber { get; set; } = null!;

        [Column("CoverageAmount", TypeName = "decimal(18, 0)")]
        public decimal CoverageAmount { get; set; }

        [Column("ValidFrom", TypeName = "date")]
        public DateTime ValidFrom { get; set; }

        [Column("ValidTo", TypeName = "date")]
        public DateTime ValidTo { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = "PENDING"; // PENDING, VERIFIED

        [Column("CheckedBy")]
        [StringLength(50)]
        public string? CheckedBy { get; set; }

        [Column("CheckedAtUtc")]
        public DateTime? CheckedAtUtc { get; set; }

        [Column("CreatedAtUtc")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(TripId))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(CheckedBy))]
        public virtual User? CheckedByUser { get; set; }
    }
}

