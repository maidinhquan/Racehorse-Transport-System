using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class TripHistoryItemDto
    {
        [JsonPropertyName("eventId")]
        public string EventId { get; set; } = string.Empty;

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;

        [JsonPropertyName("by")]
        public ActorDto By { get; set; } = new();

        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;

        [JsonPropertyName("planVersion")]
        public int? PlanVersion { get; set; }

        [JsonPropertyName("detail")]
        public string Detail { get; set; } = string.Empty;
    }
}

