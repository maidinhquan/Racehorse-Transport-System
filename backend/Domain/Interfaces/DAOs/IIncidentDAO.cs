using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IIncidentDAO : IBaseDAO<Incident>
{
    Task<List<Incident>> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default);
    Task<List<Incident>> GetPendingApprovalAsync(CancellationToken cancellationToken = default);
    Task<List<Incident>> GetAllIncidentsAsync(CancellationToken cancellationToken = default);
}
