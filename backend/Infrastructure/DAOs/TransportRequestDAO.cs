using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class TransportRequestDAO : BaseDAO<TransportRequest>, ITransportRequestDAO
{
    public TransportRequestDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<TransportRequest>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(r => r.RequestHorseMappings)
                .ThenInclude(m => m.Horse)
            .Where(r => r.CustomerId == customerId)
            .OrderByDescending(r => r.ExpectedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<TransportRequest>> GetByStatusAsync(string status, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(r => r.RequestHorseMappings)
                .ThenInclude(m => m.Horse)
            .Where(r => r.Status == status)
            .OrderByDescending(r => r.ExpectedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<TransportRequest?> GetWithHorsesAsync(string requestId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(r => r.RequestHorseMappings)
                .ThenInclude(m => m.Horse)
            .Include(r => r.LegalMedicalRecords)
            .FirstOrDefaultAsync(r => r.RequestId == requestId, cancellationToken);
    }
}
