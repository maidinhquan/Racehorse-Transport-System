namespace Application.DTOs.Flow1;

public sealed record BankProofInput(decimal DeclaredAmount, string? Memo = null);
public sealed record ConfirmBankPaymentInput(int ExpectedVersion, decimal ReceivedAmount, string BankReference, DateTimeOffset ReceivedAtUtc);
public sealed record RejectBankPaymentInput(int ExpectedVersion, string Reason);
public sealed record GatewayPaymentSession(string PaymentId, string RequestId, string InvoiceId, decimal RequestedAmount,
    string Currency, string PaymentUrl, DateTimeOffset CreatedAtUtc, DateTimeOffset ExpiresAtUtc, string MerchantId);
public sealed record GatewayPaymentStatus(string RequestId, string PaymentId, string Status, DepositPaymentsView Summary);
public sealed record GatewayIpnResponse(string RspCode, string Message);
public sealed record CancelOverdueDepositInput(int ExpectedDeadlineVersion, string Reason, bool ReconciliationConfirmed);
public sealed record AcknowledgeFinancialReviewInput(int ExpectedLedgerVersion, int ExpectedDeadlineVersion, string Reason, bool ReviewedActualReceipts);
public sealed record FinancialReviewHistoryItem(string Action, string Actor, string? Reason, DateTime AtUtc);
public sealed record FinancialReviewHistory(int Version, FinancialReviewHistoryItem[] Items);
public sealed record DepositPaymentEvent(string Key, string InputHash, string Actor, string Action, string PaymentId,
    string InvoiceId, string Method, string Status, decimal DeclaredAmount, PrivateFileReference? Proof, string? Memo,
    decimal Amount, string? Reference, DateTimeOffset? ReceivedAtUtc, string? Reason, DateTimeOffset AtUtc, int DeadlineVersion);
public sealed record ActivationReceipt(string ContractId, string RequestId, string InvoiceId, string DocumentHash,
    string TripId, decimal RequiredDeposit, decimal VerifiedAmount, DateTimeOffset AtUtc, bool ScheduleNeedsReview);
public sealed record DepositPaymentItem(string PaymentId, int Version, string Method, string Status, decimal DeclaredAmount,
    decimal VerifiedAmount, string? Reference, DateTimeOffset? ReceivedAtUtc, string? Reason, string? Memo, bool HasProof, bool Late);
public sealed record DepositPaymentsView(string ContractId, string InvoiceId, string ContractStatus, string RequestStatus,
    decimal RequiredDeposit, decimal VerifiedAmount, decimal OutstandingAmount, decimal ExcessAmount, string PaymentStatus,
    DateTimeOffset EffectiveDeadline, int DeadlineVersion, bool CanSubmit, string? BankName, string? BankAccount, string? Beneficiary,
    string TransferContent, DepositPaymentItem[] Payments, ActivationReceipt? Activation, bool FinancialReviewRequired, bool VnpayAvailable = false, int LedgerVersion = 0, bool Overdue = false);
