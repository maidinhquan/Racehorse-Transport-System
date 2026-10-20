using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng CUSTOMS_CLEARANCE (Quản lý thủ tục hải quan, tờ khai thông quan tại cửa khẩu).
/// Tương ứng bảng CUSTOMSCLEARANCE trong HorseTransportDB.sql
/// </summary>
public class CustomsClearanceDAO : BaseDAO<CustomsClearance>
{
    public CustomsClearanceDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<CustomsClearance>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.TripID == tripId).ToListAsync();
    }

    public async Task<List<CustomsClearance>> GetBySegmentIdAsync(string segmentId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.SegmentID == segmentId).ToListAsync();
    }

    public async Task<List<CustomsClearance>> GetByStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(c => c.Status == status).ToListAsync();
    }
}
