using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IPaymentDAO : IBaseDAO<Payment>
{
    Task<List<Payment>> GetByInvoiceIdAsync(string invoiceId, CancellationToken cancellationToken = default);
    Task<Payment?> GetByTransactionCodeAsync(string transactionCode, CancellationToken cancellationToken = default);
}
