using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng HANDOVER (Biên bản bàn giao ngựa tại điểm tập kết hoặc trạm đích).
/// Tương ứng bảng HANDOVER trong HorseTransportDB.sql
/// </summary>
public class HandoverDAO : BaseDAO<Handover>
{
    public HandoverDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Handover>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(h => h.TripID == tripId).ToListAsync();
    }

    public async Task<List<Handover>> GetByTypeAsync(string type)
    {
        return await _dbSet.AsNoTracking().Where(h => h.Type == type).ToListAsync();
    }
}
