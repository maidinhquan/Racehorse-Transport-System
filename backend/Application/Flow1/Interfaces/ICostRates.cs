using Domain.Flow1;
namespace Application.Flow1.Interfaces;

public interface ICostRates
{
    Task<IReadOnlyList<FlowCostRate>> ReadAsync(CancellationToken ct);
}
