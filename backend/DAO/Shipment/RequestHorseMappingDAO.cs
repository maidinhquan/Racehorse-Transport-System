using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng REQUEST_HORSE_MAPPING (Bảng mapping liên kết n-n giữa đơn đặt và danh sách ngựa).
/// Tương ứng bảng REQUESTHORSEMAPPING trong HorseTransportDB.sql
/// </summary>
public class RequestHorseMappingDAO : BaseDAO<RequestHorseMapping>
{
    public RequestHorseMappingDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<RequestHorseMapping>> GetByRequestIdAsync(string requestId)
    {
        return await _dbSet.AsNoTracking().Where(m => m.RequestID == requestId).ToListAsync();
    }

    public async Task<List<RequestHorseMapping>> GetByHorseIdAsync(string horseId)
    {
        return await _dbSet.AsNoTracking().Where(m => m.HorseID == horseId).ToListAsync();
    }

    public async Task<bool> DeleteByRequestAndHorseAsync(string requestId, string horseId)
    {
        var item = await _dbSet.FirstOrDefaultAsync(m => m.RequestID == requestId && m.HorseID == horseId);
        if (item == null) return false;
        _dbSet.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }
}
