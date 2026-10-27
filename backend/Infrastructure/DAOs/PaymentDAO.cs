using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class PaymentDAO : BaseDAO<Payment>, IPaymentDAO
{
    public PaymentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Payment>> GetByInvoiceIdAsync(string invoiceId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Payment?> GetByTransactionCodeAsync(string transactionCode, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .FirstOrDefaultAsync(p => p.TransactionCode == transactionCode, cancellationToken);
    }
}
