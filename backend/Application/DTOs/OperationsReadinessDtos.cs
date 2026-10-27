using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class ReadinessCheckDto
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("group")]
        public string Group { get; set; } = "SHARED"; // SHARED, ROAD, AIR

        [JsonPropertyName("tab")]
        public string Tab { get; set; } = "overview"; // overview, route, resources, readiness, incidents

        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("detail")]
        public string Detail { get; set; } = string.Empty;
    }

    public class ReadinessDto
    {
        [JsonPropertyName("tripId")]
        public string TripId { get; set; } = string.Empty;

        [JsonPropertyName("binding")]
        public BindingDto Binding { get; set; } = new();

        [JsonPropertyName("readinessVersion")]
        public int ReadinessVersion { get; set; } = 1;

        [JsonPropertyName("approvedPlanVersion")]
        public int? ApprovedPlanVersion { get; set; }

        [JsonPropertyName("docsReady")]
        public bool DocsReady { get; set; }

        [JsonPropertyName("opsReady")]
        public bool OpsReady { get; set; }

        [JsonPropertyName("canApproveDeparture")]
        public bool CanApproveDeparture { get; set; }

        [JsonPropertyName("openChange")]
        public bool OpenChange { get; set; }

        [JsonPropertyName("checkedAt")]
        public string CheckedAt { get; set; } = string.Empty;

        [JsonPropertyName("checks")]
        public List<ReadinessCheckDto> Checks { get; set; } = new();

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();
    }

    public class DepartureInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("approvedPlanVersion")]
        public int ApprovedPlanVersion { get; set; }

        [JsonPropertyName("readinessVersion")]
        public int ReadinessVersion { get; set; }
    }

    public class DepartureResultDto
    {
        [JsonPropertyName("tripId")]
        public string TripId { get; set; } = string.Empty;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonPropertyName("tripStatus")]
        public string TripStatus { get; set; } = "READY_TO_DEPART";

        [JsonPropertyName("requestStatus")]
        public string RequestStatus { get; set; } = "SCHEDULED";

        [JsonPropertyName("binding")]
        public BindingDto Binding { get; set; } = new();

        [JsonPropertyName("approvedPlanVersion")]
        public int ApprovedPlanVersion { get; set; }

        [JsonPropertyName("approvedBy")]
        public ActorDto ApprovedBy { get; set; } = new();

        [JsonPropertyName("approvedAt")]
        public string ApprovedAt { get; set; } = string.Empty;
    }

    // --- Legacy compatibility classes ---
    public class OperationsReadinessDto
    {
        public string TripId { get; set; } = string.Empty;
        public int RouteVersionId { get; set; } = 1;
        public int AssignmentVersion { get; set; } = 1;
        public bool RouteCreated { get; set; }
        public bool RouteApproved { get; set; }
        public bool VehicleAssigned { get; set; }
        public bool DriverAssigned { get; set; }
        public bool CoDriverAssigned { get; set; }
        public bool VeterinarianAssigned { get; set; }
        public bool EscortAssigned { get; set; }
        public bool StallsSufficient { get; set; }
        public bool OutboundGroundLegReady { get; set; } = true;
        public bool InboundGroundLegReady { get; set; } = true;
        public bool FlightBookingConfirmed { get; set; } = true;
        public bool IndependentResourcesVerified { get; set; } = true;
        public bool IsOperationsReady { get; set; }
        public bool IsLegalReady { get; set; }
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
        public string? ConfirmedBy { get; set; }
    }

    public class DepartureConditionsDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripStatus { get; set; } = "PLANNING";
        public string DeploymentStatus { get; set; } = "CONFIRMED";
        public int? RouteVersionId { get; set; }
        public bool AllMet { get; set; }
        public bool IsOperationsReady { get; set; }
        public bool IsLegalReady { get; set; }
        public bool CanApproveDeparture => AllMet && IsOperationsReady && IsLegalReady;
        public string? RejectionReason { get; set; }
        public DateTime? DepartureApprovedAt { get; set; }
        public string? DepartureApprovedBy { get; set; }
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
        public string? ConfirmedBy { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? EarliestDepartureDate { get; set; }
        public DateTime? DocumentExpiryDate { get; set; }
        public string? SpecialistLegalNote { get; set; }
        public List<string> MissingConditions { get; set; } = new();
    }
}
