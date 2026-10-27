using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IRequestHorseMappingDAO : IBaseDAO<RequestHorseMapping>
{
    Task<List<RequestHorseMapping>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
    Task DeleteByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
}
