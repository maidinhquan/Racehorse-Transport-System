using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("PICKUP_RELOCATION")]
    public class PickupRelocationProposal
    {
        [Key]
        [Column("RelocationID")]
        [StringLength(50)]
        public string RelocationId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("OriginalAddress")]
        [StringLength(500)]
        public string OriginalAddress { get; set; } = null!;

        [Column("AccessEvaluation")]
        [StringLength(20)]
        public string AccessEvaluation { get; set; } = "INACCESSIBLE";

        [Column("CandidatePlaceId")]
        [StringLength(50)]
        public string CandidatePlaceId { get; set; } = null!;

        [Column("Reason")]
        [StringLength(500)]
        public string Reason { get; set; } = null!;

        [Column("Status")]
        [StringLength(30)]
        public string Status { get; set; } = "PROPOSED";

        [Column("ProposedBy")]
        [StringLength(50)]
        public string? ProposedBy { get; set; }

        [Column("ProposedAt")]
        public DateTime ProposedAt { get; set; } = DateTime.UtcNow;

        [Column("ManagerDecision")]
        [StringLength(20)]
        public string? ManagerDecision { get; set; }

        [Column("ManagerDecisionReason")]
        [StringLength(500)]
        public string? ManagerDecisionReason { get; set; }

        [Column("ManagerDecisionBy")]
        [StringLength(50)]
        public string? ManagerDecisionBy { get; set; }

        [Column("ManagerDecisionAt")]
        public DateTime? ManagerDecisionAt { get; set; }

        [Column("CustomerConsentMethod")]
        [StringLength(20)]
        public string? CustomerConsentMethod { get; set; }

        [Column("CustomerConsentNote")]
        [StringLength(500)]
        public string? CustomerConsentNote { get; set; }

        [Column("CustomerConsentConfirmedBy")]
        [StringLength(50)]
        public string? CustomerConsentConfirmedBy { get; set; }

        [Column("CustomerConsentConfirmedAt")]
        public DateTime? CustomerConsentConfirmedAt { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.PickupRelocations))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(CandidatePlaceId))]
        public virtual PartnerFacility? CandidatePlace { get; set; }
    }
}

