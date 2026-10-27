using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IInvoiceDAO : IBaseDAO<Invoice>
{
    Task<List<Invoice>> GetByContractIdAsync(string contractId, CancellationToken cancellationToken = default);
    Task<Invoice?> GetDepositInvoiceByContractIdAsync(string contractId, CancellationToken cancellationToken = default);
}
