using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng CONTRACT (Hợp đồng vận chuyển chính thức, giá hợp đồng P bất biến).
/// Tương ứng bảng CONTRACT trong HorseTransportDB.sql
/// </summary>
public class ContractDAO : BaseDAO<Contract>
{
    public ContractDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<Contract?> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(c => c.TripID == tripId);
    }

    public async Task<List<Contract>> GetByCustomerIdAsync(string customerId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.CustomerID == customerId).ToListAsync();
    }

    public async Task<Contract?> GetByContractCodeAsync(string contractCode)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(c => c.ContractCode == contractCode);
    }

    public async Task<List<Contract>> GetByContractStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(c => c.ContractStatus == status).ToListAsync();
    }
}
