using System.ComponentModel.DataAnnotations;

namespace Application.Flow1.Dtos;

public sealed record AssignRequestReviewInput(
    [Required, MaxLength(50)] string CoordinatorId,
    [Required, MaxLength(50)] string SpecialistId,
    [Range(1, int.MaxValue)] int RequestRevision);

public sealed record OriginalScheduleInput([Required] string Result, [Required, MaxLength(2000)] string Reason);

public sealed record AlternativeScheduleInput(
    [Required] string Mode, DateOnly ExpectedTransportDate, DateOnly ExpectedDeliveryDate,
    [Required] string Result, [Required, MaxLength(2000)] string Reason);

public sealed record CoordinatorAssessmentInput(
    int RequestRevision, [Required] OriginalScheduleInput Original, AlternativeScheduleInput? Alternative);

public sealed record ChecklistItemAssessmentInput(
    [Required] string ChecklistItemId, [Required] string Status, [MaxLength(2000)] string? Reason,
    DateOnly? RequiredByDate, [Range(0, 365)] int? EstimatedProcessingDays);

public sealed record SpecialistAssessmentInput(
    int RequestRevision, [Required] string ChecklistVersion, [Required] string Result,
    [MaxLength(2000)] string? Note, [Required] IReadOnlyList<ChecklistItemAssessmentInput> Items);

public sealed record AcceptRequestReviewInput([Required] string ReviewId, int RequestRevision, [Required] string ScheduleOptionId);

public sealed record ScheduleResponseInput(
    [Required] string ReviewId, int RequestRevision, [Required] string ScheduleOptionId, [Required] string Decision);
