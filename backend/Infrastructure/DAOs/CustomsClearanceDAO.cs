using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class CustomsClearanceDAO : BaseDAO<CustomsClearance>, ICustomsClearanceDAO
{
    public CustomsClearanceDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<CustomsClearance>> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(c => c.TripId == tripId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<CustomsClearance>> GetBySegmentIdAsync(string segmentId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(c => c.SegmentId == segmentId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<CustomsClearance>> GetByStatusAsync(string status, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(c => c.Status == status)
            .ToListAsync(cancellationToken);
    }
}
