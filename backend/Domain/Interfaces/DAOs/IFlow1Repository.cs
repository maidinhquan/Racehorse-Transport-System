using Domain.Entities;

namespace Domain.Interfaces.DAOs;

/// <summary>Stages writes; only IFlow1UnitOfWork commits. No immediate-save BaseDAO.</summary>
public interface IFlow1Repository
{
    Task<TransportRequest?> GetRequestAsync(string requestId, CancellationToken ct = default);
    Task<Contract?> GetContractAsync(string contractId, CancellationToken ct = default);
    Task<Invoice?> GetDepositInvoiceAsync(string contractId, CancellationToken ct = default);
    Task<User?> GetCustomerAsync(string customerId, CancellationToken ct = default);
    Task<TripPlan?> GetTripForRequestAsync(string requestId, CancellationToken ct = default);
    Task<IReadOnlyList<Contract>> GetContractsForRequestAsync(string requestId, CancellationToken ct = default);
    void AddContract(Contract contract);
    void AddTrip(TripPlan trip);
    void AddInvoice(Invoice invoice);
    void AddPayment(Payment payment);
}
