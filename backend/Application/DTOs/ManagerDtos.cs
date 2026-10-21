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
        public string? RejectionReason { get; set; }
        public DateTime? EarliestDepartureDate { get; set; }
        public DateTime? DocumentExpiryDate { get; set; }
        public string? SpecialistLegalNote { get; set; }
        public DateTime? ResourcesConfirmedAt { get; set; }
        public string? ResourcesConfirmedBy { get; set; }
        public DateTime? DepartureApprovedAt { get; set; }
        public string? DepartureApprovedBy { get; set; }
        public bool IsOperationsReady { get; set; }
        public bool IsLegalReady { get; set; }
        public DepartureConditionsDto Conditions { get; set; } = new();
    }

    public class ManagerApproveDepartureDto
    {
        public string? Note { get; set; }
    }
}

