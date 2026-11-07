namespace Domain.Flow1.Entities;

public sealed class Contract
{
    public string? CommercialNotes { get; set; }
    public string ContractID { get; set; } = null!;
    public int? CurrentVersionNo { get; set; }
    public string? TripID { get; set; }
    public string CustomerID { get; set; } = null!;
    public string CurrencyCode { get; set; } = null!;
    public decimal? TotalQuotedPrice { get; set; }
    public decimal? DepositRateStandard { get; set; }
    public DateTime? SignedAt { get; set; }
    public string ContractStatus { get; set; } = null!;
    public string RequestID { get; set; } = null!;
    public DateTime? CompletionDeadline { get; set; }
    public string? PdfUrl { get; set; }
    public string? SignOtpHash { get; set; }
    public DateTime? SignOtpExpiry { get; set; }
    public int SignOtpFailedAttempts { get; set; }
    public decimal? DepositAmount { get; set; }
    public DateTime? SignOtpSentAtUtc { get; set; }
    public string? SignerEmail { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public string? PublishedBy { get; set; }
    public string? LastExtensionReason { get; set; }
    public string? LastExtensionBy { get; set; }
    public DateTime? LastExtensionAtUtc { get; set; }
    public string? CancellationId { get; set; }
    public string? CancellationStatus { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancellationRequestedAtUtc { get; set; }
    public string? CancellationDecisionReason { get; set; }
    public string? CancellationDecidedBy { get; set; }
    public DateTime? CancellationDecidedAtUtc { get; set; }
    public string? CustomerFeedback { get; set; }
    public string? FeedbackStatus { get; set; }
    public DateTime? FeedbackAtUtc { get; set; }
    public string? ManagerFeedback { get; set; }
    public DateTime? FeedbackHandledAtUtc { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? RefundStatus { get; set; }
    public string? RefundReference { get; set; }
}
