namespace Application.DTOs.Flow5;

public class ReportIncidentInputDto
{
    public string? TripId { get; set; }
    public string? Category { get; set; }
    public string? Type { get; set; }
    public string? Severity { get; set; }
    public string? Location { get; set; }
    public List<string>? Photos { get; set; }
    public string? Description { get; set; }
    public string? ImmediateCare { get; set; }
    public string? LocationCoordinates { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? OccurredAt { get; set; }
}

public class IncidentResponseDto
{
    public string IncidentId { get; set; } = null!;
    public string TripId { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? Description { get; set; }
    public string? LocationCoordinates { get; set; }
    public string? ImageUrl { get; set; }
    public string? CoordinatorId { get; set; }
    public string? ReportedByUserId { get; set; }
    public string? ReportedByUserName { get; set; }
    public DateTime ReportedAt { get; set; }
    public bool SafetyBlockerActive { get; set; }
}
