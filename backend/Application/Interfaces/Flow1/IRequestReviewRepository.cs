using Domain.Entities;

namespace Application.Interfaces.Flow1;

public interface IRequestReviewRepository
{
    Task<TransportRequest?> GetAsync(string id, CancellationToken ct);
    Task<Contract?> ContractAsync(string id, CancellationToken ct);
    Task<(IReadOnlyList<TransportRequest> Items, int Count)> ListAsync(string? status, int page, int size, CancellationToken ct);
    void ReplaceHorses(TransportRequest request, IEnumerable<string> ids);
}
