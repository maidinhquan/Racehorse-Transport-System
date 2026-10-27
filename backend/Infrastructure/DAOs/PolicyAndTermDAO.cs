using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class PolicyAndTermDAO : BaseDAO<PolicyAndTerm>, IPolicyAndTermDAO
{
    public PolicyAndTermDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<PolicyAndTerm?> GetActivePolicyByTypeAsync(string policyType, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(p => p.PolicyType == policyType && p.IsActive)
            .OrderByDescending(p => p.EffectiveDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<PolicyAndTerm>> GetAllActivePoliciesAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(p => p.IsActive)
            .ToListAsync(cancellationToken);
    }
}
