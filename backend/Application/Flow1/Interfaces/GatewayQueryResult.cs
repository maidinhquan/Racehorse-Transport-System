
namespace Application.Flow1.Interfaces;

public sealed record GatewayQueryResult(bool Verified,string PaymentId,string MerchantId,string State,decimal? Amount=null,
    string? TransactionId=null,DateTimeOffset? PaidAtUtc=null,string? BankCode=null,string? TransactionStatus=null);
