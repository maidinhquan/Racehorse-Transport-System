using System.ComponentModel.DataAnnotations;

namespace Application.Flow1.Dtos;

public sealed record ReviewInput(
    [Required, MinLength(10), MaxLength(2000)] string Feedback,
    [Required] string ReviewId, [Range(1, int.MaxValue)] int RequestRevision,
    [Required] string Action, string? ScheduleOptionId);
