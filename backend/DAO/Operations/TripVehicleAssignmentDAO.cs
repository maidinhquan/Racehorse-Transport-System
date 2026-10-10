using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng TRIP_VEHICLE_ASSIGNMENT (Phân công xe, tài xế chính/phụ và chuyên viên áp tải).
/// Tương ứng bảng TRIPVEHICLEASSIGNMENT trong HorseTransportDB.sql
/// </summary>
public class TripVehicleAssignmentDAO : BaseDAO<TripVehicleAssignment>
{
    public TripVehicleAssignmentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<TripVehicleAssignment>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(a => a.TripID == tripId).ToListAsync();
    }

    public async Task<List<TripVehicleAssignment>> GetByDriverIdAsync(string driverId)
    {
        return await _dbSet.AsNoTracking().Where(a => a.DriverID == driverId).ToListAsync();
    }

    public async Task<List<TripVehicleAssignment>> GetByEscortIdAsync(string escortId)
    {
        return await _dbSet.AsNoTracking().Where(a => a.EscortID == escortId).ToListAsync();
    }
}
