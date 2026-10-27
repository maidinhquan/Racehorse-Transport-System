using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class DocumentSummaryDto
    {
        [JsonPropertyName("requirementSetApplied")]
        public bool RequirementSetApplied { get; set; } = true;

        [JsonPropertyName("required")]
        public int Required { get; set; } = 5;

        [JsonPropertyName("approved")]
        public int Approved { get; set; } = 5;

        [JsonPropertyName("insuranceStatus")]
        public string InsuranceStatus { get; set; } = "VERIFIED"; // VERIFIED, PENDING, MISSING

        [JsonPropertyName("quarantineConfirmed")]
        public bool QuarantineConfirmed { get; set; } = true;

        [JsonPropertyName("validityMode")]
        public string ValidityMode { get; set; } = "ASSUMED_VALID_FOR_TRIP";

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();
    }

    public class TripContextDto
    {
        [JsonPropertyName("tripId")]
        public string TripId { get; set; } = string.Empty;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonPropertyName("contractId")]
        public string ContractId { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "PLANNING"; // PLANNING, READY_TO_DEPART, IN_TRANSIT, COMPLETED

        [JsonPropertyName("mode")]
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR

        [JsonPropertyName("binding")]
        public BindingDto Binding { get; set; } = new();

        [JsonPropertyName("deployment")]
        public string Deployment { get; set; } = "CONFIRMED"; // CONFIRMED, AWAITING_DEPLOYMENT, ON_HOLD

        [JsonPropertyName("specialistId")]
        public string SpecialistId { get; set; } = string.Empty;

        [JsonPropertyName("coordinatorId")]
        public string CoordinatorId { get; set; } = string.Empty;

        [JsonPropertyName("horseIds")]
        public List<string> HorseIds { get; set; } = new();

        [JsonPropertyName("pickup")]
        public EndpointDto Pickup { get; set; } = new();

        [JsonPropertyName("delivery")]
        public EndpointDto Delivery { get; set; } = new();

        [JsonPropertyName("deliveryDeadline")]
        public string DeliveryDeadline { get; set; } = string.Empty;

        [JsonPropertyName("draft")]
        public PlanDto? Draft { get; set; }

        [JsonPropertyName("approvedPlan")]
        public PlanDto? ApprovedPlan { get; set; }

        [JsonPropertyName("resourcesConfirmed")]
        public ReadyStampDto? ResourcesConfirmed { get; set; }

        [JsonPropertyName("opsReady")]
        public ReadyStampDto? OpsReady { get; set; }

        [JsonPropertyName("docsReady")]
        public ReadyStampDto? DocsReady { get; set; }

        [JsonPropertyName("documents")]
        public DocumentSummaryDto Documents { get; set; } = new();

        [JsonPropertyName("pickupAccess")]
        public PickupAccessDto? PickupAccess { get; set; }

        [JsonPropertyName("pickupRelocation")]
        public PickupRelocationDto? PickupRelocation { get; set; }

        [JsonPropertyName("booking")]
        public BookingDto? Booking { get; set; }

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();
    }

    public class TripListItemDto
    {
        [JsonPropertyName("tripId")]
        public string TripId { get; set; } = string.Empty;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonPropertyName("mode")]
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR

        [JsonPropertyName("status")]
        public string Status { get; set; } = "PLANNING"; // PLANNING, READY_TO_DEPART, IN_TRANSIT, COMPLETED

        [JsonPropertyName("planningState")]
        public string PlanningState { get; set; } = "AWAITING_ROUTE"; // AWAITING_DEPLOYMENT, AWAITING_ROUTE, MISSING_RESOURCES, ROUTE_PENDING, ROUTE_RETURNED, PLANNED, READY

        [JsonPropertyName("plannedDepart")]
        public string? PlannedDepart { get; set; }

        [JsonPropertyName("eta")]
        public string? Eta { get; set; }

        [JsonPropertyName("openChange")]
        public bool OpenChange { get; set; }

        [JsonPropertyName("docsReady")]
        public bool DocsReady { get; set; }

        [JsonPropertyName("opsReady")]
        public bool OpsReady { get; set; }

        [JsonPropertyName("canApproveDeparture")]
        public bool CanApproveDeparture { get; set; }

        [JsonPropertyName("blockerCount")]
        public int BlockerCount { get; set; }
    }
}

