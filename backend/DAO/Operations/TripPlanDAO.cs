using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng TRIP_PLAN (Kế hoạch chuyến vận chuyển, lộ trình tổng, trạng thái hành trình).
/// Tương ứng bảng TRIPPLAN trong HorseTransportDB.sql
/// </summary>
public class TripPlanDAO : BaseDAO<TripPlan>
{
    public TripPlanDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<TripPlan?> GetByRequestIdAsync(string requestId)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(t => t.RequestID == requestId);
    }

    public async Task<List<TripPlan>> GetByStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(t => t.Status == status).ToListAsync();
    }

    public async Task<List<TripPlan>> GetActiveTripsAsync()
    {
        return await _dbSet.AsNoTracking().Where(t => t.Status == "InTransit" || t.Status == "Paused").ToListAsync();
    }
}
