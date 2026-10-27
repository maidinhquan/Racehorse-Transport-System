using System.Text.Json.Serialization;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PriceItem(decimal Amount, string Desc, bool Required);
