using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ContractDraftInput(string ArriveAt, BudgetInput Budget, string DepartAt,
    [Range(1, 100)] int DepositPct, string Exception, IReadOnlyList<PriceItem> Items,
    string Mode, string Note, IReadOnlyList<ContractTerm> Terms);
