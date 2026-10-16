using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record ContractOtpInput(int ContractVersion, [Required, StringLength(64, MinimumLength = 64)] string DocumentHash);
public sealed record ContractSignInput(int ContractVersion, [Required, StringLength(64, MinimumLength = 64)] string DocumentHash,
    [Required, StringLength(50)] string ChallengeId, [Required, RegularExpression("^[0-9]{6}$")] string Otp, bool AcceptedTerms);
public sealed record ContractOtpView(string ChallengeId, DateTimeOffset ExpiresAt, DateTimeOffset ResendAt);
// Private metadata contains only keyed digests. Never persist or return the code or email address here.
public sealed record ContractOtpState(string ChallengeId, string CustomerId, int ContractVersion, string DocumentHash,
    string EmailDigest, string CodeDigest, DateTimeOffset ExpiresAt, DateTimeOffset SentAt,
    string Delivery = "DELIVERING", int Attempts = 0, bool Consumed = false, bool Revoked = false);
public sealed record ContractOtpAccount(DateTimeOffset[] Sends);
public sealed record ContractAcceptance(string ContractId, string CustomerId, int ContractVersion, string DocumentHash,
    string ChallengeId, string Method, DateTime SignedAtUtc, string InvoiceId, decimal Deposit, DateTime InvoiceDueAtUtc);
public sealed record AcceptanceOperation(string Key, string InputDigest, string Actor, ContractAcceptance Evidence, string Outcome = "COMMITTED", string? Reason = null);
public sealed record AcceptanceState(AcceptanceOperation Operation);
public sealed record DepositInvoiceView(string InvoiceId, decimal Amount, decimal PaidAmount, string Currency, string Status, DateTime? DueAtUtc);
public sealed record ContractAcceptanceView(string ContractId, int Version, string Status, bool Overdue,
    bool RecoveryRequired, ContractAcceptance? Receipt, DepositInvoiceView? Invoice);
