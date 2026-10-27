using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IContractDAO : IBaseDAO<Contract>
{
    Task<Contract?> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default);
    Task<List<Contract>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default);
    Task<Contract?> GetByContractCodeAsync(string contractCode, CancellationToken cancellationToken = default);
}
