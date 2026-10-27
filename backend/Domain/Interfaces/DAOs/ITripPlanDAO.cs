using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ITripPlanDAO : IBaseDAO<TripPlan>
{
    Task<TripPlan?> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
    Task<TripPlan?> GetByIdWithDetailsAsync(string tripId, CancellationToken cancellationToken = default);
    Task<List<TripPlan>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default);
}
