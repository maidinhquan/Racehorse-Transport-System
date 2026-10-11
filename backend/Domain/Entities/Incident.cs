using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("INCIDENT")]
    public class Incident
    {
        [Key]
        [Column("IncidentID")]
        [StringLength(50)]
        public string IncidentId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("ApprovedBy")]
        [StringLength(50)]
        public string? ApprovedBy { get; set; }

        [Column("IncidentType")]
        [StringLength(50)]
        public string? IncidentType { get; set; }

        [Column("LocationCoordinates")]
        [StringLength(100)]
        public string? LocationCoordinates { get; set; }

        [Column("Description")]
        public string? Description { get; set; }

        [Column("ImageUrl")]
        [StringLength(500)]
        public string? ImageUrl { get; set; }

        [Column("AdditionalCost", TypeName = "decimal(12, 2)")]
        public decimal? AdditionalCost { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string? Status { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.Incidents))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(ApprovedBy))]
        [InverseProperty(nameof(Entities.User.ApprovedIncidents))]
        public virtual User? Approver { get; set; }
    }
}

