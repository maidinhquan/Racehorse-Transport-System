using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class DriverReportItemDto
    {
        [JsonPropertyName("incidentId")]
        public string IncidentId { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = "ROAD_CLOSURE"; // ROAD_CLOSURE, TRAFFIC_ACCIDENT, BORDER_DELAY, OTHER, BAD_WEATHER

        [JsonPropertyName("stopId")]
        public string? StopId { get; set; }

        [JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        [JsonPropertyName("geo")]
        public GeoDto? Geo { get; set; }

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("blocking")]
        public bool Blocking { get; set; } = true;

        [JsonPropertyName("locationSource")]
        public string LocationSource { get; set; } = "MILESTONE_REPORT";

        [JsonPropertyName("isGps")]
        public bool IsGps { get; set; } = false;
    }
}

