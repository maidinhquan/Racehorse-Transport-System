using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("INVOICE")]
    public class Invoice
    {
        [Key]
        [Column("InvoiceID")]
        [StringLength(50)]
        public string InvoiceId { get; set; } = null!;

        [Column("ContractID")]
        [StringLength(50)]
        public string ContractId { get; set; } = null!;

        [Column("InvoiceType")]
        [StringLength(50)]
        public string? InvoiceType { get; set; }

        [Column("CurrencyCode")]
        [StringLength(3)]
        public string CurrencyCode { get; set; } = "USD";

        [Column("TotalPayableAmount", TypeName = "decimal(12, 2)")]
        public decimal TotalPayableAmount { get; set; }

        [Column("PaidAmount", TypeName = "decimal(12, 2)")]
        public decimal PaidAmount { get; set; } = 0;

        [Column("DueDate")]
        public DateTime? DueDate { get; set; }

        [Column("PaymentStatus")]
        [StringLength(50)]
        public string PaymentStatus { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(ContractId))]
        [InverseProperty(nameof(Entities.Contract.Invoices))]
        public virtual Contract? Contract { get; set; }

        [InverseProperty(nameof(Payment.Invoice))]
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}

