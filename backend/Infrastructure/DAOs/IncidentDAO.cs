using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class IncidentDAO : BaseDAO<Incident>, IIncidentDAO
{
    public IncidentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Incident>> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(i => i.TripId == tripId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Incident>> GetPendingApprovalAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(i => string.IsNullOrEmpty(i.ApprovedBy) || i.Status == "NEW" || i.Status == "PENDING_APPROVAL")
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Incident>> GetAllIncidentsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .OrderByDescending(i => i.IncidentId)
            .ToListAsync(cancellationToken);
    }
}
