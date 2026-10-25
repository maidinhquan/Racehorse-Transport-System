namespace Domain.Flow1.Entities;

public sealed class Payment
{
    public string PaymentID { get; set; } = null!;
    public string InvoiceID { get; set; } = null!;
    public string? ConfirmedByUserID { get; set; }
    public string CurrencyCode { get; set; } = null!;
    public decimal Amount { get; set; }
    public string? Method { get; set; }
    public string? TransactionCode { get; set; }
    public string Status { get; set; } = null!;
    public DateTime PaymentDate { get; set; }
    public string? VnpayBankCode { get; set; }
    public string? VnpayResponseCode { get; set; }
    public string? VnpayTransactionStatus { get; set; }
    public string? VnpayTmnCode { get; set; }
    public DateTime? VnpayCreatedAtUtc { get; set; }
    public DateTime? VnpayExpiresAtUtc { get; set; }
    public decimal? VnpayReceivedAmount { get; set; }
    public bool FinancialReviewRequired { get; set; }
    public string? FinancialReviewReason { get; set; }
    public string? FinancialReviewedBy { get; set; }
    public DateTime? FinancialReviewedAtUtc { get; set; }
}
