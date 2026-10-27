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

    public async Task<TripPlan?> GetByIdWithDetailsAsync(string tripId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(t => t.Request)
                .ThenInclude(r => r!.RequestHorseMappings)
                    .ThenInclude(m => m.Horse)
            .Include(t => t.Request)
                .ThenInclude(r => r!.Customer)
            .Include(t => t.Request)
                .ThenInclude(r => r!.LegalMedicalRecords)
            .Include(t => t.VehicleAssignments)
                .ThenInclude(a => a.Vehicle)
            .Include(t => t.RouteSegments)
            .Include(t => t.CustomsClearances)
            .Include(t => t.FlightBookings)
            .Include(t => t.Incidents)
            .Include(t => t.Contracts)
                .ThenInclude(c => c.CostItems)
            .FirstOrDefaultAsync(t => t.TripId == tripId, cancellationToken);
    }

    public async Task<List<TripPlan>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(t => t.Request)
                .ThenInclude(r => r!.RequestHorseMappings)
                    .ThenInclude(m => m.Horse)
            .Include(t => t.Request)
                .ThenInclude(r => r!.Customer)
            .Include(t => t.VehicleAssignments)
            .Include(t => t.RouteSegments)
            .Include(t => t.CustomsClearances)
            .Include(t => t.Contracts)
            .ToListAsync(cancellationToken);
    }
}
