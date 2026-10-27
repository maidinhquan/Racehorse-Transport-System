using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ITripPlanDAO : IBaseDAO<TripPlan>
{
    Task<TripPlan?> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
}
