using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_CHECKPOINT_CLEARANCE")]
    public class TripCheckpointClearance
    {
        [Key]
        [Column("ClearanceID")]
        [StringLength(50)]
        public string ClearanceId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("CheckpointIndex")]
        public int CheckpointIndex { get; set; }

        [Column("CheckpointName")]
        [StringLength(200)]
        public string CheckpointName { get; set; } = null!;

        [Column("Result")]
        [StringLength(50)]
        public string Result { get; set; } = null!; // PASSED, HELD, FAILED

        [Column("RefNumber")]
        [StringLength(100)]
        public string? RefNumber { get; set; }

        [Column("ClearedBy")]
        [StringLength(50)]
        public string ClearedBy { get; set; } = null!;

        [Column("ClearedAtUtc")]
        public DateTime ClearedAtUtc { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(TripId))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(ClearedBy))]
        public virtual User? ClearedByUser { get; set; }
    }
}

