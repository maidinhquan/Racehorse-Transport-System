using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("COST_ITEM")]
    public class CostItem
    {
        [Key]
        [Column("CostItemID")]
        [StringLength(50)]
        public string CostItemId { get; set; } = null!;

        [Column("ContractID")]
        [StringLength(50)]
        public string ContractId { get; set; } = null!;

        [Column("CategoryName")]
        [StringLength(100)]
        public string? CategoryName { get; set; }

        [Column("SubcodeName")]
        [StringLength(100)]
        public string? SubcodeName { get; set; }

        [Column("Bearer")]
        [StringLength(50)]
        public string? Bearer { get; set; }

        [Column("CurrencyCode")]
        [StringLength(3)]
        public string CurrencyCode { get; set; } = "USD";

        [Column("TotalMoney", TypeName = "decimal(12, 2)")]
        public decimal? TotalMoney { get; set; }

        [Column("EvidenceUrl")]
        [StringLength(500)]
        public string? EvidenceUrl { get; set; }

        // Navigation properties
        [ForeignKey(nameof(ContractId))]
        [InverseProperty(nameof(Entities.Contract.CostItems))]
        public virtual Contract? Contract { get; set; }
    }
}

