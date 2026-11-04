using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("REQUEST_HORSE_MAPPING")]
    public class RequestHorseMapping
    {
        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("HorseID")]
        [StringLength(50)]
        public string HorseId { get; set; } = null!;

        [Column("CareInstructions")]
        [StringLength(2000)]
        public string? CareInstructions { get; set; }

        // Navigation properties
        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.RequestHorseMappings))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(HorseId))]
        [InverseProperty(nameof(Entities.Horse.RequestHorseMappings))]
        public virtual Horse? Horse { get; set; }
    }
}
