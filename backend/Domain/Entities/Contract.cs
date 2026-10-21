using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("CONTRACT")]
    public class Contract
    {
        [Column("CommercialNotes", TypeName = "nvarchar(2000)")]
        public string? CommercialNotes { get; set; }

        [Key]
        [Column("ContractID")]
        [StringLength(50)]
        public string ContractId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string? TripId { get; set; }

        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        // UTC. Null for a draft and for legacy contracts without a recorded deadline.
        [Column("CompletionDeadline", TypeName = "datetime2")]
        public DateTime? CompletionDeadline { get; set; }

        [Column("CustomerID")]
        [StringLength(50)]
        public string CustomerId { get; set; } = null!;

        [Column("ContractCode")]
        [StringLength(50)]
        public string ContractCode { get; set; } = null!;

        [Column("CurrencyCode")]
        [StringLength(3)]
        public string CurrencyCode { get; set; } = "USD";

        [Column("TotalQuotedPrice", TypeName = "decimal(12, 2)")]
        public decimal? TotalQuotedPrice { get; set; }

        [Column("DepositRateStandard", TypeName = "decimal(5, 2)")]
        public decimal? DepositRateStandard { get; set; }

        [Column("SignedAt")]
        public DateTime? SignedAt { get; set; }

        [Column("ContractStatus")]
        [StringLength(50)]
        public string ContractStatus { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.Contracts))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(RequestId))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(CustomerId))]
        [InverseProperty(nameof(Entities.User.CustomerContracts))]
        public virtual User? Customer { get; set; }

        [InverseProperty(nameof(CostItem.Contract))]
        public virtual ICollection<CostItem> CostItems { get; set; } = new List<CostItem>();

        [InverseProperty(nameof(Invoice.Contract))]
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}

