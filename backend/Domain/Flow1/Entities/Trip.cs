namespace Domain.Flow1.Entities;

public sealed class Trip
{
    public string TripID { get; set; } = null!;
    public string RequestID { get; set; } = null!;
    public decimal? TotalDistance_km { get; set; }
    public decimal? T_Total_Hours { get; set; }
    public decimal? TotalCost { get; set; }
    public string Status { get; set; } = null!;
    public string? DeploymentStatus { get; set; }
    public string? DeploymentReason { get; set; }
    public string? DeploymentBy { get; set; }
    public DateTime? DeploymentAtUtc { get; set; }
    public string? HandoffEventId { get; set; }
    public string? AssignedSpecialistId { get; set; }
    public string? AssignedCoordinatorId { get; set; }
}
