using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng CONTRACT_TEMPLATE (Mẫu hợp đồng vận chuyển điện tử đa ngôn ngữ).
/// Tương ứng bảng CONTRACTTEMPLATE trong HorseTransportDB.sql
/// </summary>
public class ContractTemplateDAO : BaseDAO<ContractTemplate>
{
    public ContractTemplateDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<ContractTemplate?> GetActiveTemplateAsync(string languageCode = "VI")
    {
        return await _dbSet.AsNoTracking()
            .Where(t => t.LanguageCode == languageCode && t.IsActive)
            .OrderByDescending(t => t.Version)
            .FirstOrDefaultAsync();
    }

    public async Task<List<ContractTemplate>> GetAllActiveTemplatesAsync()
    {
        return await _dbSet.AsNoTracking().Where(t => t.IsActive).ToListAsync();
    }
}
