using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class AirHandoverInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("horseIds")]
    public List<string> HorseIds { get; set; } = new();

    [JsonPropertyName("bookingId")]
    public string BookingId { get; set; } = null!;

    [JsonPropertyName("partnerReference")]
    public string PartnerReference { get; set; } = null!;

    [JsonPropertyName("allHorsesChecked")]
    public bool AllHorsesChecked { get; set; } = true;

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

public class AirReceiveInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("horseIds")]
    public List<string> HorseIds { get; set; } = new();

    [JsonPropertyName("bookingId")]
    public string BookingId { get; set; } = null!;

    [JsonPropertyName("partnerReference")]
    public string PartnerReference { get; set; } = null!;

    [JsonPropertyName("allHorsesChecked")]
    public bool AllHorsesChecked { get; set; } = true;

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

public class AirNoticeInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("bookingId")]
    public string BookingId { get; set; } = null!;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "ESTIMATED_SCHEDULE"; // ESTIMATED_SCHEDULE, ACTUAL_DEPARTURE, ACTUAL_ARRIVAL

    [JsonPropertyName("departureAt")]
    public string? DepartureAt { get; set; }

    [JsonPropertyName("arrivalAt")]
    public string? ArrivalAt { get; set; }

    [JsonPropertyName("receivedAt")]
    public string ReceivedAt { get; set; } = null!;

    [JsonPropertyName("sourceReference")]
    public string SourceReference { get; set; } = null!;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();

    [JsonPropertyName("incidentId")]
    public string? IncidentId { get; set; }
}

public class AirNoticeDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("input")]
    public AirNoticeInputDto Input { get; set; } = new();

    [JsonPropertyName("recordedBy")]
    public Flow4ActorDto RecordedBy { get; set; } = new();

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;

    [JsonPropertyName("requiresPlanChange")]
    public bool RequiresPlanChange { get; set; }

    [JsonPropertyName("milestoneApplied")]
    public bool MilestoneApplied { get; set; }
}
