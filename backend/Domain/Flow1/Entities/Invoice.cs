namespace Domain.Flow1.Entities;

public sealed class Invoice
{
    public string InvoiceID { get; set; } = null!;
    public string ContractID { get; set; } = null!;
    public int ContractVersionNo { get; set; }
    public string? InvoiceType { get; set; }
    public string CurrencyCode { get; set; } = null!;
    public decimal TotalPayableAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public string PaymentStatus { get; set; } = null!;
}
