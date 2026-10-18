namespace Application.Interfaces.Flow1;

public sealed record GatewayQueryRequest(string PaymentId,string MerchantId,DateTimeOffset CreatedAtUtc,string ClientIp);
public sealed record GatewayQueryResult(bool Verified,string PaymentId,string MerchantId,string State,decimal? Amount=null,
    string? TransactionId=null,DateTimeOffset? PaidAtUtc=null,string? BankCode=null,string? TransactionStatus=null);
public interface IFlow1GatewayQuery
{
    Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest input,CancellationToken ct);
}
