using System.Text.Json.Serialization;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record BudgetInput(decimal TRANSPORT, decimal PROCEDURE, decimal VET, decimal INSURANCE, decimal STAFF);
