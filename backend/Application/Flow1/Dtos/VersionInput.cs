using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record VersionInput([Range(1, int.MaxValue)] int VersionNo);
