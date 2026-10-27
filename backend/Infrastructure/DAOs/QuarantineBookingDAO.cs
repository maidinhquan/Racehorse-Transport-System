using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class QuarantineBookingDAO : BaseDAO<QuarantineBooking>, IQuarantineBookingDAO
{
    public QuarantineBookingDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<QuarantineBooking>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(b => b.RequestId == requestId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<QuarantineBooking>> GetByFacilityIdAsync(string facilityId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(b => b.FacilityId == facilityId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<QuarantineBooking>> GetAllBookingsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .OrderByDescending(b => b.ExpectedStartDate)
            .ToListAsync(cancellationToken);
    }
}
