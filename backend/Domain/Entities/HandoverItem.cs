using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("HANDOVER_ITEM")]
    public class HandoverItem
    {
        [Key]
        [Column("HandoverItemID")]
        [StringLength(50)]
        public string HandoverItemId { get; set; } = null!;

        [Column("HandoverID")]
        [StringLength(50)]
        public string HandoverId { get; set; } = null!;

        [Column("HorseID")]
        [StringLength(50)]
        public string HorseId { get; set; } = null!;

        [Column("MicrochipVerified")]
        public bool MicrochipVerified { get; set; } = false;

        [Column("ConditionStatus")]
        [StringLength(100)]
        public string? ConditionStatus { get; set; }

        [Column("AssetCheck")]
        public string? AssetCheck { get; set; }

        [Column("PhotoUrl")]
        [StringLength(500)]
        public string? PhotoUrl { get; set; }

        // Navigation properties
        [ForeignKey(nameof(HandoverId))]
        [InverseProperty(nameof(Entities.Handover.HandoverItems))]
        public virtual Handover? Handover { get; set; }

        [ForeignKey(nameof(HorseId))]
        [InverseProperty(nameof(Entities.Horse.HandoverItems))]
        public virtual Horse? Horse { get; set; }
    }
}

