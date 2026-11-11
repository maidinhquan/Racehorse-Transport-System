using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class HealthLogInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("horseId")]
    public string HorseId { get; set; } = null!;

    [JsonPropertyName("leg")]
    public string Leg { get; set; } = "road";

    [JsonPropertyName("milestoneId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? MilestoneId { get; set; }

    [JsonPropertyName("observedAt")]
    public string ObservedAt { get; set; } = null!;

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "NORMAL"; // NORMAL, ABNORMAL

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

    [JsonPropertyName("incidentId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? IncidentId { get; set; }

    /// <summary>Vị trí tổ xe đang ở lúc báo sức khỏe (nếu có).</summary>
    [JsonPropertyName("latitude")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal? Latitude { get; set; }

    [JsonPropertyName("longitude")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal? Longitude { get; set; }

    [JsonPropertyName("locationLabel")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? LocationLabel { get; set; }
}

public class HealthLogDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("entry")]
    public HealthLogInputDto Entry { get; set; } = new();

    [JsonPropertyName("recordedBy")]
    public Flow4ActorDto RecordedBy { get; set; } = new();

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;

    [JsonPropertyName("supersedesId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? SupersedesId { get; set; }

    [JsonPropertyName("amendmentReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? AmendmentReason { get; set; }

    [JsonPropertyName("incidentRequired")]
    public bool IncidentRequired { get; set; }
}

public class HealthLogAmendmentInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("replacement")]
    public HealthLogInputDto Replacement { get; set; } = new();
}

public class VetAssessmentInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("healthLogId")]
    public string HealthLogId { get; set; } = null!;

    [JsonPropertyName("examinedAt")]
    public string ExaminedAt { get; set; } = null!;

    [JsonPropertyName("conclusion")]
    public string Conclusion { get; set; } = null!;

    [JsonPropertyName("transportFitness")]
    public string TransportFitness { get; set; } = "FIT"; // FIT, NOT_FIT, NEEDS_REVIEW

    [JsonPropertyName("instructions")]
    public string Instructions { get; set; } = null!;

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();

    [JsonPropertyName("incidentId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? IncidentId { get; set; }
}

public class VetAssessmentDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("entry")]
    public VetAssessmentInputDto Entry { get; set; } = new();

    [JsonPropertyName("recordedBy")]
    public Flow4ActorDto RecordedBy { get; set; } = new();

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;
}

