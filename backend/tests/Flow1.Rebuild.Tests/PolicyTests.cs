using Application.Common.Exceptions;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;
namespace Flow1.Rebuild.Tests;
public sealed class PolicyTests
{
    private static BusinessPolicy Policy(string type, string? id, decimal number) => new()
    { PolicyID = "TEST", Code = "MIN_PREPARATION_DAYS", ScopeType = type, ScopeID = id,
      ValueType = "NUMBER", NumberValue = number, Unit = "DAY", Description = "Test" };
    [Theory]
    [InlineData(true, true, 7)] [InlineData(false, true, 5)] [InlineData(false, false, 3)]
    public void Uses_first_existing_scope(bool country, bool mode, decimal expected)
    {
        var rows = new List<BusinessPolicy> { Policy("GLOBAL", null, 3) };
        if (country) rows.Add(Policy("COUNTRY", "JP", 7));
        if (mode) rows.Add(Policy("TRANSPORT_MODE", "AIR", 5));
        Assert.Equal(expected, PolicyService.Resolve(rows, "MIN_PREPARATION_DAYS", "DAY", "JP", "AIR", 0, null, true));
    }
    [Fact] public void Invalid_country_does_not_fall_back()
    {
        var rows = new[] { Policy("COUNTRY", "JP", -7), Policy("GLOBAL", null, 3) };
        var error = Assert.Throws<BusinessRuleException>(() => PolicyService.Resolve(rows, "MIN_PREPARATION_DAYS", "DAY", "JP", "AIR", 0, null, true));
        Assert.Equal("BUSINESS_POLICY_CONFIGURATION_ERROR", error.ErrorCode);
    }
    [Fact] public void Missing_policy_is_configuration_error() => Assert.Throws<BusinessRuleException>(() =>
        PolicyService.Resolve([], "MIN_PREPARATION_DAYS", "DAY", "JP", "AIR", 0, null, true));
    [Fact] public void Fractional_days_are_invalid() => Assert.Throws<BusinessRuleException>(() =>
        PolicyService.Resolve([Policy("GLOBAL", null, 1.5m)], "MIN_PREPARATION_DAYS", "DAY", "JP", "AIR", 0, null, true));
}
