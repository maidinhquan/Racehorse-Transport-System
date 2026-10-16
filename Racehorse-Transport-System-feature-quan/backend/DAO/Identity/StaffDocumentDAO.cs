using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng STAFF_DOCUMENT (Giấy tờ, Visa, chứng chỉ của tài xế và chuyên viên áp tải).
/// Tương ứng bảng STAFFDOCUMENT trong HorseTransportDB.sql
/// </summary>
public class StaffDocumentDAO : BaseDAO<StaffDocument>
{
    public StaffDocumentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<StaffDocument>> GetByUserIdAsync(string userId)
    {
        return await _dbSet.AsNoTracking().Where(d => d.UserID == userId).ToListAsync();
    }

    public async Task<List<StaffDocument>> GetExpiringDocumentsAsync(DateTime thresholdDate)
    {
        return await _dbSet.AsNoTracking()
            .Where(d => d.ExpiryDate <= thresholdDate)
            .ToListAsync();
    }

    public async Task<StaffDocument?> GetByDocTypeAsync(string userId, string docType)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(d => d.UserID == userId && d.DocType == docType);
    }
}
