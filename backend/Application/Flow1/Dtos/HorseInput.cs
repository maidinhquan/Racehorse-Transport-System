using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record HorseInput(
    [Required, MaxLength(100)] string Name, [Required, MaxLength(100)] string Breed,
    [Required, RegularExpression("^(STALLION|MARE|GELDING)$")] string Sex,
    [Required] string Dob, [Required, RegularExpression(@"^\d{15}$")] string Microchip,
    [Required, RegularExpression(@"^[1-9]\d{0,9}$")] string Value,
    [Required, RegularExpression("^VND$")] string Currency,
    [Required] PassportInput Passport,
    [MaxLength(2000)] string? HealthNotes = null,
    [RegularExpression("^(INTACT|NOT_PREGNANT|PREGNANT|GELDED)$")] string? ReproductiveStatus = null,
    decimal? Weight = null,
    [MaxLength(2000)] string? Conditions = null)
{
    public string EffectiveHealthNotes => Conditions ?? HealthNotes ?? "";
}
