using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow5;

public class ReportIncidentInputDto
{
    public string? TripId { get; set; }
    public string Category { get; set; } = null!; // VEHICLE_RESOURCE, DELAY_AIR, HORSE_HEALTH, OTHER
    public string? Type { get => Category; set => Category = value ?? Category; }
    public string? Severity { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }
    public string? ImmediateCare { get; set; }
    public string? LocationCoordinates { get; set; }
    public string? ImageUrl { get; set; }
    public List<string>? Photos { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? HorseId { get; set; }
    public string? HorseName { get; set; }
    public string? HealthIssueType { get; set; } // HORSE_FEVER, HORSE_COLIC, HORSE_SHOCK
}

public class EscalateIncidentInputDto
{
    [Required(ErrorMessage = "Lý do chuyển Quản lý là bắt buộc.")]
    [MinLength(5, ErrorMessage = "Lý do phải có ít nhất 5 ký tự.")]
    public string Reason { get; set; } = null!;
}

public class ApplyRecoveryPlanInputDto
{
    public string? PlanSummary { get; set; }
    public string? ResolutionType { get; set; }
    public string? ResolutionNotes { get; set; }
}

public class IncidentResponseDto
{
    public string IncidentId { get; set; } = null!;
    public string TripId { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? LocationCoordinates { get; set; }
    public string? ImageUrl { get; set; }
    public List<string>? Photos { get; set; }
    public string? CoordinatorId { get; set; }
    public string? ReportedByUserId { get; set; }
    public string? ReportedByUserName { get; set; }
    public string? ReportedByUserRole { get; set; }
    public string? ReportedByUserPhone { get; set; }
    public string? ImmediateCare { get; set; }
    public DateTime ReportedAt { get; set; }
    public bool SafetyBlockerActive { get; set; }
    public string? ApprovedPlan { get; set; }
    public string? ResolutionType { get; set; }
    public string? ResolutionNotes { get; set; }
    public bool IsSceneReady { get; set; }
    public string? SceneAckRole { get; set; }
    public string? SceneAckByName { get; set; }
    public string? HorseId { get; set; }
    public string? HorseName { get; set; }
    public string? HealthIssueType { get; set; }
    public string? VetStatus { get; set; }
    public string? TargetVetStation { get; set; }
    public string? VetResolutionNote { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
