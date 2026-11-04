using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class DepartureCheckResultDto
{
    [JsonPropertyName("binding")]
    public Flow4BindingDto Binding { get; set; } = new();

    [JsonPropertyName("approvalValid")]
    public bool ApprovalValid { get; set; }

    [JsonPropertyName("checks")]
    public List<Flow4BlockerDto> Checks { get; set; } = new();

    [JsonPropertyName("canDepart")]
    public bool CanDepart { get; set; }

    [JsonPropertyName("requiredAcknowledgements")]
    public List<string> RequiredAcknowledgements { get; set; } = new() { "HORSES_CHECKED", "VEHICLE_VERIFIED" };
}

public class DriverDepartureInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("approvedPlanVersion")]
    public int ApprovedPlanVersion { get; set; }

    [JsonPropertyName("assignmentVersion")]
    public int AssignmentVersion { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("acknowledgements")]
    public List<string> Acknowledgements { get; set; } = new();

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

