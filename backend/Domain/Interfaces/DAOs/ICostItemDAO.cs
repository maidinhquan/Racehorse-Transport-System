using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ICostItemDAO : IBaseDAO<CostItem>
{
    Task<List<CostItem>> GetByContractIdAsync(string contractId, CancellationToken cancellationToken = default);
}
