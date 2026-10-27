using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class InvoiceDAO : BaseDAO<Invoice>, IInvoiceDAO
{
    public InvoiceDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Invoice>> GetByContractIdAsync(string contractId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Include(i => i.Payments)
            .Where(i => i.ContractId == contractId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Invoice?> GetDepositInvoiceByContractIdAsync(string contractId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.ContractId == contractId && (i.InvoiceType == "DEPOSIT" || i.InvoiceType == "Deposit"), cancellationToken);
    }
}
