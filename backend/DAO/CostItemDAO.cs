using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng COST_ITEM (Khoản mục chi phí kế hoạch PC và phát sinh IC dọc đường).
/// Tương ứng bảng COSTITEM trong HorseTransportDB.sql
/// </summary>
public class CostItemDAO : BaseDAO<CostItem>
{
    public CostItemDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<CostItem>> GetByContractIdAsync(string contractId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.ContractID == contractId).ToListAsync();
    }

    public async Task<List<CostItem>> GetByBearerAsync(string contractId, string bearer)
    {
        return await _dbSet.AsNoTracking().Where(c => c.ContractID == contractId && c.Bearer == bearer).ToListAsync();
    }

    public async Task<List<CostItem>> GetByCategoryAsync(string contractId, string categoryName)
    {
        return await _dbSet.AsNoTracking().Where(c => c.ContractID == contractId && c.CategoryName == categoryName).ToListAsync();
    }

    public async Task<decimal> GetTotalMoneyByContractAsync(string contractId)
    {
        return await _dbSet.Where(c => c.ContractID == contractId).SumAsync(c => c.TotalMoney) ?? 0m;
    }
}
