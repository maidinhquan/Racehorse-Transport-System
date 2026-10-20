namespace Application.DTOs
{
    public class ManagerApproveRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string? Note { get; set; }
    }

    public class ManagerReturnRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string Reason { get; set; } = string.Empty;
    }

    public class ManagerPlanningItemDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = "PLANNING";
        public string RouteStatus { get; set; } = "PENDING_APPROVAL";
        public int? CurrentRouteVersionId { get; set; }
        public string DeploymentStatus { get; set; } = "CONFIRMED";
        public DateTime? PlannedDepartureAt { get; set; }
        public DepartureConditionsDto Conditions { get; set; } = new();
    }
}

