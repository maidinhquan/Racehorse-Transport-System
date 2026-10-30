using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class PolicyService(IDataSession data)
{
    public async Task<decimal> NumberAsync(string code, string unit, string? country,
        string? mode, decimal minimum, decimal? maximum, bool whole, CancellationToken ct)
    {
        var policies = await data.ListAsync<BusinessPolicy>(p => p.Code == code, ct);
        return Resolve(policies, code, unit, country, mode, minimum, maximum, whole);
    }
    public static decimal Resolve(IReadOnlyList<BusinessPolicy> policies, string code, string unit,
        string? country, string? mode, decimal minimum, decimal? maximum, bool whole)
    {
        foreach (var scope in new[] { (Type: "COUNTRY", Id: country), (Type: "TRANSPORT_MODE", Id: mode), (Type: "GLOBAL", Id: (string?)null) })
        {
            if (scope.Type != "GLOBAL" && scope.Id is null) continue;
            var matches = policies.Where(p => p.Code == code && p.ScopeType == scope.Type && p.ScopeID == scope.Id).ToArray();
            if (matches.Length == 0) continue;
            Require(matches.Length == 1, "BUSINESS_POLICY_CONFIGURATION_ERROR", "Duplicate policy configuration.", 500);
            var policy = matches[0];
            Require(policy.ValueType == "NUMBER" && policy.Unit == unit && policy.NumberValue is not null
                && policy.TextValue is null && policy.BoolValue is null,
                "BUSINESS_POLICY_CONFIGURATION_ERROR", $"Invalid type or unit for {code}.", 500);
            var number = policy.NumberValue!.Value;
            Require(number >= minimum && (maximum is null || number <= maximum)
                && (!whole || decimal.Truncate(number) == number),
                "BUSINESS_POLICY_CONFIGURATION_ERROR", $"Invalid domain for {code}.", 500);
            return number;
        }
        throw Failure("BUSINESS_POLICY_CONFIGURATION_ERROR", $"Missing required policy {code}.", 500);
    }
}
