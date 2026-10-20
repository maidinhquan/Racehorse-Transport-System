using Domain.Flow1;

namespace Application.Interfaces.Flow1;

public interface IFlow1CostRates
{
    Task<IReadOnlyList<FlowCostRate>> ReadAsync(CancellationToken ct);
}
