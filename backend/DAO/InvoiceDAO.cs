using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng INVOICE (Hóa đơn thanh toán theo 3 đợt vàng: Cọc 40%, Chặng giữa 30%, Đích 30%).
/// Tương ứng bảng INVOICE trong HorseTransportDB.sql
/// </summary>
public class InvoiceDAO : BaseDAO<Invoice>
{
    public InvoiceDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Invoice>> GetByContractIdAsync(string contractId)
    {
        return await _dbSet.AsNoTracking().Where(i => i.ContractID == contractId).OrderBy(i => i.IssuedAt).ToListAsync();
    }

    public async Task<Invoice?> GetByInvoiceCodeAsync(string invoiceCode)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(i => i.InvoiceCode == invoiceCode);
    }

    public async Task<List<Invoice>> GetByPaymentStatusAsync(string paymentStatus)
    {
        return await _dbSet.AsNoTracking().Where(i => i.PaymentStatus == paymentStatus).ToListAsync();
    }

    public async Task<List<Invoice>> GetUnpaidInvoicesAsync()
    {
        return await _dbSet.AsNoTracking().Where(i => i.PaymentStatus == "Unpaid" || i.PaymentStatus == "Partial").ToListAsync();
    }
}
