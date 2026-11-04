using System.Text.Json.Serialization;

namespace Application.DTOs.Flow4;

public class TripExpenseInputDto
{
    [JsonPropertyName("expectedVersion")]
    public int ExpectedVersion { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "TOLL_FEE"; // TOLL_FEE, FEED_SUPPLIES, EMERGENCY_CARE, OTHER

    [JsonPropertyName("amountVnd")]
    public decimal AmountVnd { get; set; }

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = null!;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = null!;

    [JsonPropertyName("milestoneId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? MilestoneId { get; set; }

    [JsonPropertyName("receiptFileIds")]
    public List<string> ReceiptFileIds { get; set; } = new();
}

public class TripExpenseRecordDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = null!;

    [JsonPropertyName("entry")]
    public TripExpenseInputDto Entry { get; set; } = new();

    [JsonPropertyName("recordedBy")]
    public Flow4ActorDto RecordedBy { get; set; } = new();

    [JsonPropertyName("recordedAt")]
    public string RecordedAt { get; set; } = null!;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "RECORDED";
}

