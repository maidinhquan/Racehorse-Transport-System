using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng VEHICLE (Đội xe thùng chuyên dụng có điều hòa khí hậu & chống sốc).
/// Tương ứng bảng VEHICLE trong HorseTransportDB.sql
/// </summary>
public class VehicleDAO : BaseDAO<Vehicle>
{
    public VehicleDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Vehicle>> GetAvailableVehiclesAsync()
    {
        return await _dbSet.AsNoTracking().Where(v => v.Status == "Available" || v.Status == "Ready").ToListAsync();
    }

    public async Task<List<Vehicle>> GetByTypeAsync(string type)
    {
        return await _dbSet.AsNoTracking().Where(v => v.Type == type).ToListAsync();
    }
}
