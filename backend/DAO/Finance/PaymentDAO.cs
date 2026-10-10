using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng PAYMENT (Giao dịch dòng tiền thực tế qua VNPay, Stripe hoặc Tiền mặt).
/// Tương ứng bảng PAYMENT trong HorseTransportDB.sql
/// </summary>
public class PaymentDAO : BaseDAO<Payment>
{
    public PaymentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Payment>> GetByInvoiceIdAsync(string invoiceId)
    {
        return await _dbSet.AsNoTracking().Where(p => p.InvoiceID == invoiceId).OrderByDescending(p => p.PaymentDate).ToListAsync();
    }

    public async Task<Payment?> GetByTransactionCodeAsync(string transactionCode)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(p => p.TransactionCode == transactionCode);
    }

    public async Task<List<Payment>> GetByStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(p => p.Status == status).ToListAsync();
    }
}
