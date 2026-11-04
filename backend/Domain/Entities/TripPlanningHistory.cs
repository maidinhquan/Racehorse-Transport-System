using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_PLANNING_HISTORY")]
    public class TripPlanningHistory
    {
        [Key]
        [Column("HistoryID")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long HistoryId { get; set; }

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("Version")]
        public int Version { get; set; }

        [Column("Action")]
        [StringLength(50)]
        public string Action { get; set; } = null!;

        [Column("ActorID")]
        [StringLength(50)]
        public string ActorId { get; set; } = null!;

        [Column("ActorRole")]
        [StringLength(50)]
        public string ActorRole { get; set; } = null!;

        [Column("DetailsJson")]
        public string? DetailsJson { get; set; }

        [Column("CreatedAtUtc")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.PlanningHistories))]
        public virtual TripPlan? Trip { get; set; }
    }
}

