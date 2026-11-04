using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class EtaProposalInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("proposedEta")]
    public string ProposedEta { get; set; } = null!;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("milestoneId")]
    public string MilestoneId { get; set; } = null!;

    [JsonPropertyName("incidentId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? IncidentId { get; set; }
}

public class EtaProposalDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("currentEta")]
    public string CurrentEta { get; set; } = null!;

    [JsonPropertyName("proposedEta")]
    public string ProposedEta { get; set; } = null!;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING_COORDINATOR"; // PENDING_COORDINATOR, PENDING_MANAGER, APPROVED, REJECTED, WITHDRAWN

    [JsonPropertyName("requiresManager")]
    public bool RequiresManager { get; set; }

    [JsonPropertyName("escalationReasons")]
    public List<string> EscalationReasons { get; set; } = new();

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("incidentId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? IncidentId { get; set; }

    [JsonPropertyName("proposedBy")]
    public Flow4ActorDto ProposedBy { get; set; } = new();

    [JsonPropertyName("proposedAt")]
    public string ProposedAt { get; set; } = null!;

    [JsonPropertyName("decidedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? DecidedAt { get; set; }

    [JsonPropertyName("decisionReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? DecisionReason { get; set; }
}

public class EtaDecisionInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("proposalVersion")]
    public int ProposalVersion { get; set; } = 1;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "APPROVE"; // APPROVE, REJECT

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;
}

