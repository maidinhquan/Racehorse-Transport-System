using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng HEALTH_LOG (Nhật ký sức khỏe realtime của ngựa: thân nhiệt, nhịp tim, stress).
/// Tương ứng bảng HEALTHLOG trong HorseTransportDB.sql
/// </summary>
public class HealthLogDAO : BaseDAO<HealthLog>
{
    public HealthLogDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<HealthLog>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(l => l.TripID == tripId).OrderByDescending(l => l.LogTime).ToListAsync();
    }

    public async Task<List<HealthLog>> GetByHorseIdAsync(string horseId)
    {
        return await _dbSet.AsNoTracking().Where(l => l.HorseID == horseId).OrderByDescending(l => l.LogTime).ToListAsync();
    }

    public async Task<List<HealthLog>> GetLogsForTripAndHorseAsync(string tripId, string horseId)
    {
        return await _dbSet.AsNoTracking()
            .Where(l => l.TripID == tripId && l.HorseID == horseId)
            .OrderByDescending(l => l.LogTime)
            .ToListAsync();
    }
}
