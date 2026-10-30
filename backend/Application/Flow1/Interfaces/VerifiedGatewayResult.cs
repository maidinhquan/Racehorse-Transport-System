using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record VerifiedGatewayResult(bool Verified, string ProviderReference, string? ProviderTransactionId,
    decimal Amount, string Currency, string Status, DateTimeOffset? PaidAtUtc, JsonElement SafeEvidence, string? MerchantId = null,
    string? BankCode = null, string? ResponseCode = null, string? TransactionStatus = null);
