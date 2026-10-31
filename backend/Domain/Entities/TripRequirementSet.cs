using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_REQUIREMENT_SET")]
    public class TripRequirementSet
    {
        [Key]
        [Column("SnapshotID")]
        [StringLength(50)]
        public string SnapshotId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("PkgId")]
        [StringLength(50)]
        public string PkgId { get; set; } = null!;

        [Column("PkgVersion")]
        public int PkgVersion { get; set; } = 1;

        [Column("PkgName")]
        [StringLength(200)]
        public string PkgName { get; set; } = null!;

        [Column("AppliedBy")]
        [StringLength(50)]
        public string AppliedBy { get; set; } = null!;

        [Column("AppliedAtUtc")]
        public DateTime AppliedAtUtc { get; set; } = DateTime.UtcNow;

        [Column("SnapshotJson")]
        public string? SnapshotJson { get; set; }

        [ForeignKey(nameof(TripId))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(AppliedBy))]
        public virtual User? AppliedByUser { get; set; }
    }
}

