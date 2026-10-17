using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs.Flow1;

public sealed class Flow1Repository(HorseTransportDbContext context) : IFlow1Repository
{
    public Task<TransportRequest?> GetRequestAsync(string id, CancellationToken ct = default) =>
        context.TransportRequests.SingleOrDefaultAsync(r => r.RequestId == id, ct);
    public Task<Contract?> GetContractAsync(string id, CancellationToken ct = default) =>
        context.Contracts.SingleOrDefaultAsync(c => c.ContractId == id, ct);
    public Task<User?> GetCustomerAsync(string id, CancellationToken ct = default) =>
        context.Users.AsNoTracking().SingleOrDefaultAsync(c => c.UserId == id, ct);
    public Task<Invoice?> GetDepositInvoiceAsync(string id, CancellationToken ct = default) =>
        context.Invoices.SingleOrDefaultAsync(i => i.ContractId == id && i.InvoiceType == "DEPOSIT", ct);
    public Task<TripPlan?> GetTripForRequestAsync(string id, CancellationToken ct = default) =>
        context.TripPlans.SingleOrDefaultAsync(t => t.RequestId == id, ct);
    public async Task<IReadOnlyList<Contract>> GetContractsForRequestAsync(string id, CancellationToken ct = default) =>
        await context.Contracts.AsNoTracking().Where(c => c.RequestId == id).ToListAsync(ct);

    public void AddContract(Contract value) => Stage(value);
    public async Task<IReadOnlyList<Payment>> GetPaymentsAsync(string id, CancellationToken ct = default) =>
        await context.Payments.Where(p => p.InvoiceId == id).ToListAsync(ct);
    public Task<bool> BankReferenceExistsAsync(string reference, CancellationToken ct = default) =>
        context.Payments.AsNoTracking().AnyAsync(p => p.Method == "BANK_TRANSFER" && p.Status == "SUCCESS" && p.TransactionCode == reference, ct);
    public Task<Contract?> GetPaymentContractAsync(string id, CancellationToken ct = default) =>
        (from p in context.Payments.AsNoTracking() join i in context.Invoices.AsNoTracking() on p.InvoiceId equals i.InvoiceId
         join c in context.Contracts.AsNoTracking() on i.ContractId equals c.ContractId where p.PaymentId == id select c).SingleOrDefaultAsync(ct);
    public Task<bool> GatewayTransactionExistsAsync(string reference, CancellationToken ct = default) =>
        context.Payments.AsNoTracking().AnyAsync(p => p.Method == "VNPAY" && p.Status == "SUCCESS" && p.TransactionCode == reference, ct);
    public Task<Contract?> GetTripContractAsync(string id, CancellationToken ct = default) =>
        context.Contracts.AsNoTracking().SingleOrDefaultAsync(c => c.TripId == id && c.RequestId != null, ct);
    public async Task<IReadOnlyList<Contract>> GetActivatedContractsAsync(CancellationToken ct = default) =>
        await context.Contracts.AsNoTracking().Where(c => c.TripId != null && c.ContractStatus == "EFFECTIVE" && c.Request != null && c.Request.Status == "ACTIVATED")
            .OrderBy(c => c.ContractId).Take(100).ToListAsync(ct);
    public void AddTrip(TripPlan value) => Stage(value);
    public void AddInvoice(Invoice value) => Stage(value);
    public void AddPayment(Payment value) => Stage(value);

    private void Stage<T>(T value) where T : class
    {
        if (context.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Stage writes inside IFlow1UnitOfWork.ExecuteAsync.");
        context.Set<T>().Add(value);
    }
}
