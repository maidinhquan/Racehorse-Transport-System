using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng HORSE (Lý lịch cá thể ngựa đua, mã Microchip, Passport FEI).
/// Tương ứng bảng HORSE trong HorseTransportDB.sql
/// </summary>
public class HorseDAO : BaseDAO<Horse>
{
    public HorseDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Horse>> GetByOwnerIdAsync(string ownerId)
    {
        return await _dbSet.AsNoTracking().Where(h => h.OwnerID == ownerId).ToListAsync();
    }

    public async Task<Horse?> GetByMicrochipAsync(string microchipIso)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(h => h.Microchip_ISO == microchipIso);
    }

    public async Task<Horse?> GetByFeiPassportAsync(string feiPassportNo)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(h => h.FEI_Passport_No == feiPassportNo);
    }
}
