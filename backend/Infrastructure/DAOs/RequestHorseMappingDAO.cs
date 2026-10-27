using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class RequestHorseMappingDAO : BaseDAO<RequestHorseMapping>, IRequestHorseMappingDAO
{
    public RequestHorseMappingDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<RequestHorseMapping>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(m => m.Horse)
            .Where(m => m.RequestId == requestId)
            .ToListAsync(cancellationToken);
    }

    public async Task DeleteByRequestIdAsync(string requestId, CancellationToken cancellationToken = default)
    {
        var mappings = await DbSet.Where(m => m.RequestId == requestId).ToListAsync(cancellationToken);
        if (mappings.Count > 0)
        {
            DbSet.RemoveRange(mappings);
            await Context.SaveChangesAsync(cancellationToken);
        }
    }
}
