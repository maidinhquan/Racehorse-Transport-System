
namespace Application.Flow1.Interfaces;

public interface IGatewayQuery
{
    Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest input,CancellationToken ct);
}
