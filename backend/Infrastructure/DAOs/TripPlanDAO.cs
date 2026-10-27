using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class TripPlanDAO : BaseDAO<TripPlan>, ITripPlanDAO
{
    public TripPlanDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<TripPlan?> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(t => t.Contracts)
            .FirstOrDefaultAsync(t => t.RequestId == requestId, cancellationToken);
    }
}
