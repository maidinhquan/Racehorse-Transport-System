using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record GatewaySessionRequest(string PaymentId, string InvoiceId, decimal Amount, string Currency,
    DateTimeOffset ExpiresAtUtc, string ClientIp = "127.0.0.1", DateTimeOffset? CreatedAtUtc = null);
