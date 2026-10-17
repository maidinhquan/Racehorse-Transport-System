using Application.Interfaces.Flow1;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs.Flow1;

public sealed class RequestReviewRepository(HorseTransportDbContext db) : IRequestReviewRepository
{
    public Task<TransportRequest?> GetAsync(string id, CancellationToken ct) =>
        db.TransportRequests.Include(x => x.RequestHorseMappings).SingleOrDefaultAsync(x => x.RequestId == id, ct);
    public Task<Contract?> ContractAsync(string id, CancellationToken ct) => db.Contracts.AsNoTracking().SingleOrDefaultAsync(x => x.ContractId == id, ct);
    public async Task<(IReadOnlyList<TransportRequest> Items, int Count)> ListAsync(string? status, int page, int size, CancellationToken ct)
    {
        var q = db.TransportRequests.AsNoTracking().Where(x => status == null || x.Status == status);
        return (await q.OrderByDescending(x => x.RequestId).Skip((page - 1) * size).Take(size).ToArrayAsync(ct), await q.CountAsync(ct));
    }
    public void ReplaceHorses(TransportRequest request, IEnumerable<string> ids)
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Writes require the Flow 1 UoW.");
        db.RequestHorseMappings.RemoveRange(request.RequestHorseMappings);
        request.RequestHorseMappings = ids.Select(id => new RequestHorseMapping { RequestHorseId = Guid.NewGuid().ToString("N"),
            RequestId = request.RequestId, HorseId = id }).ToList();
    }
}
