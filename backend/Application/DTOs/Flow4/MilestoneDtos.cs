using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class MilestoneCompleteInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("note")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

public class MilestoneCorrectionInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("milestoneRevision")]
    public int MilestoneRevision { get; set; } = 1;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("proposedOccurredAt")]
    public string ProposedOccurredAt { get; set; } = null!;

    [JsonPropertyName("proposedNote")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? ProposedNote { get; set; }

    [JsonPropertyName("proposedEvidenceFileIds")]
    public List<string> ProposedEvidenceFileIds { get; set; } = new();
}

public class MilestoneInputSnapshotDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("note")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Note { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

public class MilestoneCorrectionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("milestoneId")]
    public string MilestoneId { get; set; } = null!;

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("requestedBy")]
    public Flow4ActorDto RequestedBy { get; set; } = new();

    [JsonPropertyName("requestedAt")]
    public string RequestedAt { get; set; } = null!;

    [JsonPropertyName("original")]
    public MilestoneInputSnapshotDto Original { get; set; } = new();

    [JsonPropertyName("proposed")]
    public MilestoneInputSnapshotDto Proposed { get; set; } = new();

    [JsonPropertyName("decidedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? DecidedBy { get; set; }

    [JsonPropertyName("decidedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? DecidedAt { get; set; }
}

public class MilestoneCorrectionDecisionInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("correctionVersion")]
    public int CorrectionVersion { get; set; } = 1;

    [JsonPropertyName("milestoneRevision")]
    public int MilestoneRevision { get; set; } = 1;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "APPROVE"; // APPROVE, REJECT

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;
}

public class CheckpointRecordDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("milestoneId")]
    public string MilestoneId { get; set; } = null!;

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING"; // PENDING, HELD, SUPPLEMENT_REQUIRED, CLEARED

    [JsonPropertyName("reason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Reason { get; set; }

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();

    [JsonPropertyName("recordedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public Flow4ActorDto? RecordedBy { get; set; }

    [JsonPropertyName("recordedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? RecordedAt { get; set; }
}

public class CheckpointDecisionInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("checkpointVersion")]
    public int CheckpointVersion { get; set; } = 1;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "CLEARED"; // CLEARED, HELD, SUPPLEMENT_REQUIRED

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("evidenceFileIds")]
    public List<string> EvidenceFileIds { get; set; } = new();
}

