using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IPolicyAndTermDAO : IBaseDAO<PolicyAndTerm>
{
    Task<PolicyAndTerm?> GetActivePolicyByTypeAsync(string policyType, CancellationToken cancellationToken = default);
    Task<List<PolicyAndTerm>> GetAllActivePoliciesAsync(CancellationToken cancellationToken = default);
}
