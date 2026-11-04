using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class Flow4ActorDto
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("role")]
    public string Role { get; set; } = null!;

    [JsonPropertyName("crewDuty")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? CrewDuty { get; set; }
}

public class Flow4BlockerDto
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("field")]
    public string Field { get; set; } = null!;

    [JsonPropertyName("message")]
    public string Message { get; set; } = null!;
}

public class Flow4BindingDto
{
    [JsonPropertyName("executionVersion")]
    public int ExecutionVersion { get; set; } = 1;

    [JsonPropertyName("approvedPlanVersion")]
    public int ApprovedPlanVersion { get; set; } = 1;

    [JsonPropertyName("assignmentVersion")]
    public int AssignmentVersion { get; set; } = 1;
}

public class Flow4GeoDto
{
    [JsonPropertyName("lat")]
    public decimal Lat { get; set; }

    [JsonPropertyName("lng")]
    public decimal Lng { get; set; }
}

public class Flow4HorseSnapshotDto
{
    [JsonPropertyName("horseId")]
    public string HorseId { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("microchip")]
    public string Microchip { get; set; } = null!;

    [JsonPropertyName("careInstructions")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? CareInstructions { get; set; }
}

public class Flow4EndpointDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("address")]
    public string Address { get; set; } = null!;

    [JsonPropertyName("country")]
    public string Country { get; set; } = "VN";

    [JsonPropertyName("geo")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4GeoDto? Geo { get; set; }
}

public class Flow4CrewAssignmentDto
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("duty")]
    public string Duty { get; set; } = null!;
}

public class Flow4VehicleSummaryDto
{
    [JsonPropertyName("vehicleId")]
    public string VehicleId { get; set; } = null!;

    [JsonPropertyName("plateNumber")]
    public string PlateNumber { get; set; } = null!;

    [JsonPropertyName("type")]
    public string Type { get; set; } = null!;

    [JsonPropertyName("capacityStalls")]
    public int CapacityStalls { get; set; }

    [JsonPropertyName("heightM")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal? HeightM { get; set; }

    [JsonPropertyName("grossWeightTons")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal? GrossWeightTons { get; set; }
}

public class Flow4FlightSnapshotDto
{
    [JsonPropertyName("bookingId")]
    public string BookingId { get; set; } = null!;

    [JsonPropertyName("partnerName")]
    public string PartnerName { get; set; } = null!;

    [JsonPropertyName("flightCode")]
    public string FlightCode { get; set; } = null!;

    [JsonPropertyName("originAirport")]
    public string OriginAirport { get; set; } = null!;

    [JsonPropertyName("destinationAirport")]
    public string DestinationAirport { get; set; } = null!;

    [JsonPropertyName("plannedDepartureAt")]
    public string PlannedDepartureAt { get; set; } = null!;

    [JsonPropertyName("plannedArrivalAt")]
    public string PlannedArrivalAt { get; set; } = null!;
}

public class Flow4LegDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = "road";

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING";

    [JsonPropertyName("assignedUserIds")]
    public List<string> AssignedUserIds { get; set; } = new();

    [JsonPropertyName("crew")]
    public List<Flow4CrewAssignmentDto> Crew { get; set; } = new();

    [JsonPropertyName("vehicleId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? VehicleId { get; set; }

    [JsonPropertyName("vehicle")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4VehicleSummaryDto? Vehicle { get; set; }

    [JsonPropertyName("from")]
    public string From { get; set; } = null!;

    [JsonPropertyName("to")]
    public string To { get; set; } = null!;

    [JsonPropertyName("milestoneIds")]
    public List<string> MilestoneIds { get; set; } = new();
}

public class Flow4MilestoneActionsDto
{
    [JsonPropertyName("canComplete")]
    public bool CanComplete { get; set; }

    [JsonPropertyName("canRequestCorrection")]
    public bool CanRequestCorrection { get; set; }

    [JsonPropertyName("canRecordHealth")]
    public bool CanRecordHealth { get; set; }

    [JsonPropertyName("canProposeEta")]
    public bool CanProposeEta { get; set; }

    [JsonPropertyName("blockers")]
    public List<Flow4BlockerDto> Blockers { get; set; } = new();
}

public class Flow4MilestoneDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("leg")]
    public string Leg { get; set; } = "road";

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = null!;

    [JsonPropertyName("sequence")]
    public int Sequence { get; set; }

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING";

    [JsonPropertyName("plannedAt")]
    public string PlannedAt { get; set; } = null!;

    [JsonPropertyName("occurredAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? OccurredAt { get; set; }

    [JsonPropertyName("recordedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? RecordedAt { get; set; }

    [JsonPropertyName("recordedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? RecordedBy { get; set; }

    [JsonPropertyName("revision")]
    public int Revision { get; set; } = 1;

    [JsonPropertyName("note")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();

    [JsonPropertyName("geo")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4GeoDto? Geo { get; set; }

    [JsonPropertyName("requiresHealthCheck")]
    public bool RequiresHealthCheck { get; set; }

    [JsonPropertyName("actions")]
    public Flow4MilestoneActionsDto Actions { get; set; } = new();
}

public class Flow4EtaSummaryDto
{
    [JsonPropertyName("currentEta")]
    public string CurrentEta { get; set; } = null!;

    [JsonPropertyName("deliveryDeadline")]
    public string DeliveryDeadline { get; set; } = null!;

    [JsonPropertyName("pendingProposalId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? PendingProposalId { get; set; }

    [JsonPropertyName("proposedEta")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? ProposedEta { get; set; }

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;
}

public class Flow4TripSummaryDto
{
    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = null!;

    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = null!;

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";

    [JsonPropertyName("tripStatus")]
    public string TripStatus { get; set; } = "READY_TO_DEPART";

    [JsonPropertyName("requestStatus")]
    public string RequestStatus { get; set; } = "SCHEDULED";

    [JsonPropertyName("phase")]
    public string Phase { get; set; } = "AWAITING_DEPARTURE";

    [JsonPropertyName("lastMilestoneId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? LastMilestoneId { get; set; }

    [JsonPropertyName("eta")]
    public Flow4EtaSummaryDto Eta { get; set; } = new();
}

public class Flow4MapDto
{
    [JsonPropertyName("routeSource")]
    public string RouteSource { get; set; } = "APPROVED_PLAN";

    [JsonPropertyName("locationSource")]
    public string LocationSource { get; set; } = "CONFIRMED_MILESTONE";

    [JsonPropertyName("lastConfirmedMilestoneId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? LastConfirmedMilestoneId { get; set; }

    [JsonPropertyName("markerGeo")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4GeoDto? MarkerGeo { get; set; }

    [JsonPropertyName("isGps")]
    public bool IsGps { get; set; } = false;

    [JsonPropertyName("routePoints")]
    public List<Flow4GeoDto> RoutePoints { get; set; } = new();
}

public class Flow4PolicyDto
{
    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("lateMilestoneMinutes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? LateMilestoneMinutes { get; set; }

    [JsonPropertyName("healthIntervalMinutes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? HealthIntervalMinutes { get; set; }

    [JsonPropertyName("minimumHealthPhotos")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? MinimumHealthPhotos { get; set; }

    [JsonPropertyName("configured")]
    public bool Configured { get; set; } = false;

    [JsonPropertyName("note")]
    public string Note { get; set; } = "Chưa chốt ngưỡng; không tự gán mặc định";
}

public class Flow4CapabilitiesDto
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.1.0";

    [JsonPropertyName("implementationStatus")]
    public string ImplementationStatus { get; set; } = "AVAILABLE";

    [JsonPropertyName("persistenceAvailable")]
    public bool PersistenceAvailable { get; set; } = true;

    [JsonPropertyName("filesAvailable")]
    public bool FilesAvailable { get; set; } = true;

    [JsonPropertyName("notificationsAvailable")]
    public bool NotificationsAvailable { get; set; } = true;

    [JsonPropertyName("incidentIntegrationAvailable")]
    public bool IncidentIntegrationAvailable { get; set; } = true;

    [JsonPropertyName("gpsRealtime")]
    public bool GpsRealtime { get; set; } = false;

    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = "Asia/Ho_Chi_Minh";

    [JsonPropertyName("policy")]
    public Flow4PolicyDto Policy { get; set; } = new();
}

public class Flow4TrackingDto
{
    [JsonPropertyName("binding")]
    public Flow4BindingDto Binding { get; set; } = new();

    [JsonPropertyName("serverTime")]
    public string ServerTime { get; set; } = null!;

    [JsonPropertyName("trip")]
    public Flow4TripSummaryDto Trip { get; set; } = new();

    [JsonPropertyName("horses")]
    public List<Flow4HorseSnapshotDto> Horses { get; set; } = new();

    [JsonPropertyName("pickup")]
    public Flow4EndpointDto Pickup { get; set; } = new();

    [JsonPropertyName("delivery")]
    public Flow4EndpointDto Delivery { get; set; } = new();

    [JsonPropertyName("flight")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4FlightSnapshotDto? Flight { get; set; }

    [JsonPropertyName("legs")]
    public List<Flow4LegDto> Legs { get; set; } = new();

    [JsonPropertyName("milestones")]
    public List<Flow4MilestoneDto> Milestones { get; set; } = new();

    [JsonPropertyName("map")]
    public Flow4MapDto Map { get; set; } = new();

    [JsonPropertyName("policy")]
    public Flow4PolicyDto Policy { get; set; } = new();

    [JsonPropertyName("blockers")]
    public List<Flow4BlockerDto> Blockers { get; set; } = new();

    [JsonPropertyName("handoverAvailable")]
    public bool HandoverAvailable { get; set; } = false;
}

public class Flow4MutationResultDto
{
    [JsonPropertyName("binding")]
    public Flow4BindingDto Binding { get; set; } = new();

    [JsonPropertyName("recordId")]
    public string RecordId { get; set; } = null!;

    [JsonPropertyName("trip")]
    public Flow4TripSummaryDto Trip { get; set; } = new();

    [JsonPropertyName("blockers")]
    public List<Flow4BlockerDto> Blockers { get; set; } = new();
}

public class Flow4HistoryEventDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("type")]
    public string Type { get; set; } = null!;

    [JsonPropertyName("actor")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? Actor { get; set; }

    [JsonPropertyName("systemActor")]
    public bool SystemActor { get; set; }

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;

    [JsonPropertyName("reason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Reason { get; set; }

    [JsonPropertyName("targetId")]
    public string TargetId { get; set; } = null!;

    [JsonPropertyName("beforeRevision")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? BeforeRevision { get; set; }

    [JsonPropertyName("afterRevision")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? AfterRevision { get; set; }
}

public class Flow4AlertDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = null!; // MILESTONE_OVERDUE, HEALTH_CHECK_DUE, ETA_CHANGE

    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = null!;

    [JsonPropertyName("milestoneId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? MilestoneId { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = null!;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "OPEN"; // OPEN, ACKNOWLEDGED, RESOLVED

    [JsonPropertyName("message")]
    public string Message { get; set; } = null!;

    [JsonPropertyName("assigneeUserIds")]
    public List<string> AssigneeUserIds { get; set; } = new();

    [JsonPropertyName("acknowledgedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? AcknowledgedBy { get; set; }
}

public class Flow4AcknowledgeAlertInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }
}

public class Flow4ContactLogInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("contactedUserId")]
    public string ContactedUserId { get; set; } = null!;

    [JsonPropertyName("contactedAt")]
    public string ContactedAt { get; set; } = null!;

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = "PHONE"; // PHONE, IN_PERSON, OTHER

    [JsonPropertyName("result")]
    public string Result { get; set; } = null!;
}

public class Flow4FileUploadResultDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = null!;

    [JsonPropertyName("filename")]
    public string Filename { get; set; } = null!;

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = null!;

    [JsonPropertyName("sizeBytes")]
    public long SizeBytes { get; set; }

    [JsonPropertyName("purpose")]
    public string Purpose { get; set; } = null!;

    [JsonPropertyName("uploadedAt")]
    public string UploadedAt { get; set; } = null!;
}

public class Flow4PublicMilestoneDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("leg")]
    public string Leg { get; set; } = "road";

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = null!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;

    [JsonPropertyName("plannedAt")]
    public string PlannedAt { get; set; } = null!;

    [JsonPropertyName("occurredAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? OccurredAt { get; set; }

    [JsonPropertyName("recordedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? RecordedAt { get; set; }

    [JsonPropertyName("recordedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? RecordedBy { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING";

    [JsonPropertyName("note")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Note { get; set; }

    [JsonPropertyName("revision")]
    public int Revision { get; set; } = 1;
}

public class Flow4PublicHealthDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("horseId")]
    public string HorseId { get; set; } = null!;

    [JsonPropertyName("observedAt")]
    public string ObservedAt { get; set; } = null!;

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;

    [JsonPropertyName("recordedBy")]
    public Flow4ActorDto RecordedBy { get; set; } = new();

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "NORMAL";

    [JsonPropertyName("observation")]
    public string Observation { get; set; } = null!;

    [JsonPropertyName("feeding")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Feeding { get; set; }

    [JsonPropertyName("water")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Water { get; set; }

    [JsonPropertyName("rest")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Rest { get; set; }

    [JsonPropertyName("care")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Care { get; set; }

    [JsonPropertyName("temperatureC")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal? TemperatureC { get; set; }

    [JsonPropertyName("heartRateBpm")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? HeartRateBpm { get; set; }

    [JsonPropertyName("respiratoryRatePerMin")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int? RespiratoryRatePerMin { get; set; }

    [JsonPropertyName("photoFileIds")]
    public List<string> PhotoFileIds { get; set; } = new();

    [JsonPropertyName("vetConclusion")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? VetConclusion { get; set; }

    [JsonPropertyName("vetInstructions")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? VetInstructions { get; set; }

    [JsonPropertyName("transportFitness")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? TransportFitness { get; set; }

    [JsonPropertyName("vetRecordedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? VetRecordedBy { get; set; }

    [JsonPropertyName("vetRecordedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? VetRecordedAt { get; set; }

    [JsonPropertyName("amendmentReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? AmendmentReason { get; set; }

    [JsonPropertyName("supersedesId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? SupersedesId { get; set; }
}

public class Flow4PublicTrackingDto
{
    [JsonPropertyName("serverTime")]
    public string ServerTime { get; set; } = null!;

    [JsonPropertyName("trip")]
    public Flow4TripSummaryDto Trip { get; set; } = new();

    [JsonPropertyName("milestones")]
    public List<Flow4PublicMilestoneDto> Milestones { get; set; } = new();

    [JsonPropertyName("horses")]
    public List<Flow4HorseSnapshotDto> Horses { get; set; } = new();

    [JsonPropertyName("pickup")]
    public Flow4EndpointDto Pickup { get; set; } = new();

    [JsonPropertyName("delivery")]
    public Flow4EndpointDto Delivery { get; set; } = new();

    [JsonPropertyName("map")]
    public Flow4MapDto Map { get; set; } = new();

    [JsonPropertyName("health")]
    public List<Flow4PublicHealthDto> Health { get; set; } = new();

    [JsonPropertyName("customerNotice")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? CustomerNotice { get; set; }
}

