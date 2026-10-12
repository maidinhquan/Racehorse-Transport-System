using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("PAYMENT")]
    public class Payment
    {
        [Key]
        [Column("PaymentID")]
        [StringLength(50)]
        public string PaymentId { get; set; } = null!;

        [Column("InvoiceID")]
        [StringLength(50)]
        public string InvoiceId { get; set; } = null!;

        [Column("ConfirmedByUserID")]
        [StringLength(50)]
        public string? ConfirmedByUserId { get; set; }

        [Column("CurrencyCode")]
        [StringLength(3)]
        public string CurrencyCode { get; set; } = "USD";

        [Column("Amount", TypeName = "decimal(12, 2)")]
        public decimal Amount { get; set; }

        [Column("Method")]
        [StringLength(50)]
        public string? Method { get; set; }

        [Column("TransactionCode")]
        [StringLength(100)]
        public string? TransactionCode { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        [Column("PaymentDate")]
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(InvoiceId))]
        [InverseProperty(nameof(Entities.Invoice.Payments))]
        public virtual Invoice? Invoice { get; set; }

        [ForeignKey(nameof(ConfirmedByUserId))]
        [InverseProperty(nameof(Entities.User.ConfirmedPayments))]
        public virtual User? ConfirmedByUser { get; set; }
    }
}

