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
    public Task<TripPlan?> GetTripForRequestAsync(string id, CancellationToken ct = default) =>
        context.TripPlans.SingleOrDefaultAsync(t => t.RequestId == id, ct);
    public async Task<IReadOnlyList<Contract>> GetContractsForRequestAsync(string id, CancellationToken ct = default) =>
        await context.Contracts.AsNoTracking().Where(c => c.RequestId == id).ToListAsync(ct);

    public void AddContract(Contract value) => Stage(value);
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
