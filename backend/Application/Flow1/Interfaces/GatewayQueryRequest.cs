
namespace Application.Flow1.Interfaces;

public sealed record GatewayQueryRequest(string PaymentId,string MerchantId,DateTimeOffset CreatedAtUtc,string ClientIp);
