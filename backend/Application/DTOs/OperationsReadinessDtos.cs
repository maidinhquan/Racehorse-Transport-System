namespace Application.DTOs
{
    public class OperationsReadinessDto
    {
        public string TripId { get; set; } = string.Empty;
        public int RouteVersionId { get; set; } = 1;
        public int AssignmentVersion { get; set; } = 1;
        public bool RouteCreated { get; set; }
        public bool RouteApproved { get; set; }
        public bool VehicleAssigned { get; set; }
        public bool DriverAssigned { get; set; }
        public bool EscortAssigned { get; set; }
        public bool StallsSufficient { get; set; }
        public bool OutboundGroundLegReady { get; set; } = true;
        public bool InboundGroundLegReady { get; set; } = true;
        public bool FlightBookingConfirmed { get; set; } = true;
        public bool IndependentResourcesVerified { get; set; } = true;
        public bool IsReady { get; set; }
        public bool ConfirmedByCoordinator { get; set; }
        public List<ConditionItemDto> Conditions { get; set; } = new();
        public List<string> MissingConditions { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class ConfirmOperationsReadinessRequestDto
    {
        public int? RouteVersionId { get; set; }
        public int? ExpectedAssignmentVersion { get; set; }
        public int? ExpectedFlightBookingId { get; set; }
        public int? ExpectedFlightBookingVersion { get; set; }
        public string? Note { get; set; }
    }

    public class DepartureConditionsDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripStatus { get; set; } = "PLANNING";
        public string DeploymentStatus { get; set; } = "CONFIRMED";
        public int? RouteVersionId { get; set; }
        public bool AllMet { get; set; }
        public OperationsReadinessSummaryDto OperationsReadiness { get; set; } = new();
        public DocumentsReadinessSummaryDto DocumentsReadiness { get; set; } = new();
        public List<ConditionItemDto> Conditions { get; set; } = new();
        public List<string> MissingConditions { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class ConditionItemDto
    {
        public string Code { get; set; } = string.Empty;
        public string? Label { get; set; }
        public bool Met { get; set; }
        public bool Applicable { get; set; } = true;
        public string? Detail { get; set; }
        public string? Group { get; set; }
    }

    public class OperationsReadinessSummaryDto
    {
        public bool Ready { get; set; }
        public bool Confirmed { get; set; }
        public int? RouteVersionId { get; set; }
        public int? AssignmentVersion { get; set; }
        public string? ConfirmedBy { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }

    public class DocumentsReadinessSummaryDto
    {
        public bool Ready { get; set; }
        public bool Confirmed { get; set; }
        public int? RouteVersionId { get; set; }
        public List<string> MissingConditions { get; set; } = new();
    }
}

