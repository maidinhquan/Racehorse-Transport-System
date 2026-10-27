using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ITransportRequestDAO : IBaseDAO<TransportRequest>
{
    Task<List<TransportRequest>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default);
    Task<List<TransportRequest>> GetByStatusAsync(string status, CancellationToken cancellationToken = default);
    Task<TransportRequest?> GetWithHorsesAsync(string requestId, CancellationToken cancellationToken = default);
}
