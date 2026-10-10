using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("HANDOVER")]
    public class Handover
    {
        [Key]
        [Column("HandoverID")]
        [StringLength(50)]
        public string HandoverId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("HandedByUserID")]
        [StringLength(50)]
        public string HandedByUserId { get; set; } = null!;

        [Column("Type")]
        [StringLength(50)]
        public string? Type { get; set; }

        [Column("LocationName")]
        [StringLength(255)]
        public string? LocationName { get; set; }

        [Column("ReceiverName")]
        [StringLength(100)]
        public string? ReceiverName { get; set; }

        [Column("ReceiverPhone")]
        [StringLength(20)]
        public string? ReceiverPhone { get; set; }

        [Column("IsAuthorized")]
        public bool? IsAuthorized { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string? Status { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.Handovers))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(HandedByUserId))]
        [InverseProperty(nameof(Entities.User.HandedOverRecords))]
        public virtual User? HandedByUser { get; set; }

        [InverseProperty(nameof(HandoverItem.Handover))]
        public virtual ICollection<HandoverItem> HandoverItems { get; set; } = new List<HandoverItem>();
    }
}

