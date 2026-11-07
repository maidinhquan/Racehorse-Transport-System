using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FeedbackInput([Range(1, int.MaxValue)] int VersionNo, [Required, MinLength(10), MaxLength(2000)] string Text);
