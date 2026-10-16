using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("CUSTOMS_CLEARANCE")]
    public class CustomsClearance
    {
        [Key]
        [Column("ClearanceID")]
        [StringLength(50)]
        public string ClearanceId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("SegmentID")]
        [StringLength(50)]
        public string SegmentId { get; set; } = null!;

        [Column("BorderCrossingName")]
        [StringLength(200)]
        public string? BorderCrossingName { get; set; }

        [Column("CustomsAgentName")]
        [StringLength(100)]
        public string? CustomsAgentName { get; set; }

        [Column("DocumentType")]
        [StringLength(50)]
        public string? DocumentType { get; set; }

        [Column("DeclarationNumber")]
        [StringLength(100)]
        public string? DeclarationNumber { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        [Column("ClearedAt")]
        public DateTime? ClearedAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.CustomsClearances))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(SegmentId))]
        [InverseProperty(nameof(RouteSegment.CustomsClearances))]
        public virtual RouteSegment? Segment { get; set; }
    }
}

