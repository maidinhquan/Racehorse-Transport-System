using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SignInput([Range(1,int.MaxValue)] int VersionNo, [Required, RegularExpression(@"^\d{6}$")] string Otp);
