using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RequestDraftInput([Required, MaxLength(255)] string Origin,
    [Required, MaxLength(255)] string Destination, [Required] string OriginCountry,
    [Required] string DestinationCountry, [Required] string Mode, [Required] string Date,
    [MaxLength(2000)] string CareNotes);
