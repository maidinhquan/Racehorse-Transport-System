using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng FACILITY_CONTRACT (Hợp đồng thuê trạm dừng, biểu phí lưu chuồng).
/// Tương ứng bảng FACILITYCONTRACT trong HorseTransportDB.sql
/// </summary>
public class FacilityContractDAO : BaseDAO<FacilityContract>
{
    public FacilityContractDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<FacilityContract>> GetByFacilityIdAsync(string facilityId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.FacilityID == facilityId).ToListAsync();
    }

    public async Task<FacilityContract?> GetValidContractAsync(string facilityId, DateTime targetDate)
    {
        return await _dbSet.AsNoTracking()
            .Where(c => c.FacilityID == facilityId && c.ValidFrom <= targetDate && (!c.ValidTo.HasValue || c.ValidTo.Value >= targetDate))
            .FirstOrDefaultAsync();
    }
}
