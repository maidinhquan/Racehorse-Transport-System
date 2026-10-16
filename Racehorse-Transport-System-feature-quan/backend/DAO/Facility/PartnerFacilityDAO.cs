using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng PARTNER_FACILITY (Trạm dừng nghỉ, chuồng cách ly PEQ, bệnh viện thú y).
/// Tương ứng bảng PARTNERFACILITY trong HorseTransportDB.sql
/// </summary>
public class PartnerFacilityDAO : BaseDAO<PartnerFacility>
{
    public PartnerFacilityDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<PartnerFacility>> GetByFacilityTypeAsync(string facilityType)
    {
        return await _dbSet.AsNoTracking().Where(f => f.FacilityType == facilityType).ToListAsync();
    }

    public async Task<List<PartnerFacility>> GetByCountryCodeAsync(string countryCode)
    {
        return await _dbSet.AsNoTracking().Where(f => f.CountryCode == countryCode).ToListAsync();
    }

    public async Task<List<PartnerFacility>> GetByStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(f => f.Status == status).ToListAsync();
    }
}
