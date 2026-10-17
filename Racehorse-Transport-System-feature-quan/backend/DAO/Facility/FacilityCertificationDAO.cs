using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng FACILITY_CERTIFICATION (Chứng chỉ đạt chuẩn FEI, an toàn sinh học của trạm nghỉ).
/// Tương ứng bảng FACILITYCERTIFICATION trong HorseTransportDB.sql
/// </summary>
public class FacilityCertificationDAO : BaseDAO<FacilityCertification>
{
    public FacilityCertificationDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<FacilityCertification>> GetByFacilityIdAsync(string facilityId)
    {
        return await _dbSet.AsNoTracking().Where(c => c.FacilityID == facilityId).ToListAsync();
    }

    public async Task<List<FacilityCertification>> GetInternationalStandardsAsync()
    {
        return await _dbSet.AsNoTracking().Where(c => c.IsInternationalStandard).ToListAsync();
    }
}
