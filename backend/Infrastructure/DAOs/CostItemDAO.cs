using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class CostItemDAO : BaseDAO<CostItem>, ICostItemDAO
{
    public CostItemDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<CostItem>> GetByContractIdAsync(string contractId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(c => c.ContractId == contractId)
            .ToListAsync(cancellationToken);
    }
}
