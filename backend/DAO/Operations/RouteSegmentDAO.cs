using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng ROUTE_SEGMENT (Chi tiết từng chặng di chuyển, trạm dừng, chuyến bay).
/// Tương ứng bảng ROUTESEGMENT trong HorseTransportDB.sql
/// </summary>
public class RouteSegmentDAO : BaseDAO<RouteSegment>
{
    public RouteSegmentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<RouteSegment>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(s => s.TripID == tripId).ToListAsync();
    }

    /// <summary>
    /// Sắp xếp chặng theo giờ đến dự kiến (ExpectedETA), không phải giờ khởi hành.
    /// </summary>
    public async Task<List<RouteSegment>> GetByTripIdOrderedAsync(string tripId)
    {
        return await _dbSet.AsNoTracking()
            .Where(s => s.TripID == tripId)
            .OrderBy(s => s.ExpectedETA)
            .ToListAsync();
    }

    public async Task<List<RouteSegment>> GetByFacilityIdAsync(string facilityId)
    {
        return await _dbSet.AsNoTracking().Where(s => s.FacilityID == facilityId).ToListAsync();
    }
}
