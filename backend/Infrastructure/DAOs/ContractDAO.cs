using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class ContractDAO : BaseDAO<Contract>, IContractDAO
{
    public ContractDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<Contract?> GetByTripIdAsync(string tripId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(c => c.CostItems)
            .Include(c => c.Invoices)
            .FirstOrDefaultAsync(c => c.TripId == tripId, cancellationToken);
    }

    public async Task<List<Contract>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(c => c.CostItems)
            .Include(c => c.Invoices)
            .Where(c => c.CustomerId == customerId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Contract?> GetByContractCodeAsync(string contractCode, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(c => c.CostItems)
            .Include(c => c.Invoices)
            .FirstOrDefaultAsync(c => c.ContractCode == contractCode, cancellationToken);
    }
}
