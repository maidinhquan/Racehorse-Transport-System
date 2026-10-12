using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng HANDOVER_ITEM (Chi tiết nghiệm thu từng con ngựa trong biên bản bàn giao).
/// Tương ứng bảng HANDOVERITEM trong HorseTransportDB.sql
/// </summary>
public class HandoverItemDAO : BaseDAO<HandoverItem>
{
    public HandoverItemDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<HandoverItem>> GetByHandoverIdAsync(string handoverId)
    {
        return await _dbSet.AsNoTracking().Where(i => i.HandoverID == handoverId).ToListAsync();
    }

    public async Task<List<HandoverItem>> GetByHorseIdAsync(string horseId)
    {
        return await _dbSet.AsNoTracking().Where(i => i.HorseID == horseId).ToListAsync();
    }
}
