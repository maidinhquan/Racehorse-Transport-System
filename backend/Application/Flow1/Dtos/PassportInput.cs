using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PassportInput([Required] string Number, [Required] string Authority,
    [Required] string IssueDate, [Required] string ExpiryDate);
