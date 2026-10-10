using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng QUARANTINE_BOOKING (Đăng ký giữ chỗ trạm cách ly tiền xuất khẩu PEQ).
/// Tương ứng bảng QUARANTINEBOOKING trong HorseTransportDB.sql
/// </summary>
public class QuarantineBookingDAO : BaseDAO<QuarantineBooking>
{
    public QuarantineBookingDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<QuarantineBooking>> GetByRequestIdAsync(string requestId)
    {
        return await _dbSet.AsNoTracking().Where(b => b.RequestID == requestId).ToListAsync();
    }

    public async Task<List<QuarantineBooking>> GetByFacilityIdAsync(string facilityId)
    {
        return await _dbSet.AsNoTracking().Where(b => b.FacilityID == facilityId).ToListAsync();
    }

    public async Task<List<QuarantineBooking>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _dbSet.AsNoTracking()
            .Where(b => b.ExpectedStartDate <= endDate && b.ExpectedEndDate >= startDate)
            .ToListAsync();
    }
}
