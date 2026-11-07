using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record GatewaySessionResult(string ProviderReference, Uri PaymentUrl, DateTimeOffset ExpiresAtUtc, string MerchantId);
