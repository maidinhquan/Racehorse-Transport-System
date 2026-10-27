using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ICustomsClearanceDAO : IBaseDAO<CustomsClearance>
{
    Task<List<CustomsClearance>> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default);
    Task<List<CustomsClearance>> GetBySegmentIdAsync(string segmentId, CancellationToken cancellationToken = default);
    Task<List<CustomsClearance>> GetByStatusAsync(string status, CancellationToken cancellationToken = default);
}
