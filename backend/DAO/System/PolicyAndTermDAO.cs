using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng POLICY_AND_TERM (Điều khoản vận chuyển, chính sách bảo hiểm, quy chế hoàn cọc).
/// Tương ứng bảng POLICYANDTERM trong HorseTransportDB.sql
/// </summary>
public class PolicyAndTermDAO : BaseDAO<PolicyAndTerm>
{
    public PolicyAndTermDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<PolicyAndTerm?> GetActivePolicyByTypeAsync(string policyType)
    {
        return await _dbSet.AsNoTracking()
            .Where(p => p.PolicyType == policyType && p.IsActive)
            .OrderByDescending(p => p.EffectiveDate)
            .FirstOrDefaultAsync();
    }

    public async Task<List<PolicyAndTerm>> GetAllActivePoliciesAsync()
    {
        return await _dbSet.AsNoTracking().Where(p => p.IsActive).ToListAsync();
    }
}
