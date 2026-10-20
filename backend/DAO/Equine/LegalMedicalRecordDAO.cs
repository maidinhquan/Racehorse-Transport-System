using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng LEGAL_MEDICAL_RECORD (Hồ sơ pháp lý, sổ tiêm vắc-xin, kết quả xét nghiệm Lab).
/// Tương ứng bảng LEGALMEDICALRECORD trong HorseTransportDB.sql
/// </summary>
public class LegalMedicalRecordDAO : BaseDAO<LegalMedicalRecord>
{
    public LegalMedicalRecordDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<LegalMedicalRecord>> GetByHorseIdAsync(string horseId)
    {
        return await _dbSet.AsNoTracking().Where(r => r.HorseID == horseId).ToListAsync();
    }

    public async Task<List<LegalMedicalRecord>> GetByRequestIdAsync(string requestId)
    {
        return await _dbSet.AsNoTracking().Where(r => r.RequestID == requestId).ToListAsync();
    }

    public async Task<LegalMedicalRecord?> GetByDocumentTypeAsync(string horseId, string documentType)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(r => r.HorseID == horseId && r.DocumentType == documentType);
    }

    public async Task<List<LegalMedicalRecord>> GetByStatusAsync(string documentStatus)
    {
        return await _dbSet.AsNoTracking().Where(r => r.DocumentStatus == documentStatus).ToListAsync();
    }
}
