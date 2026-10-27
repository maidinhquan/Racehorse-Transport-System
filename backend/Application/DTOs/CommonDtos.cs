using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class ActorDto
    {
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class BindingDto
    {
        [JsonPropertyName("version")]
        public int Version { get; set; } = 1;

        [JsonPropertyName("contextVersion")]
        public int ContextVersion { get; set; } = 1;

        [JsonPropertyName("planVersion")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? PlanVersion { get; set; }

        [JsonPropertyName("expectedVersion")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? ExpectedVersion { get; set; }
    }

    public class ExpectedDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }
    }

    public class PlanCommandDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; }
    }

    public class ReasonCommandDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    public class ReadyStampDto
    {
        [JsonPropertyName("ready")]
        public bool Ready { get; set; }

        [JsonPropertyName("confirmedAt")]
        public string ConfirmedAt { get; set; } = string.Empty;

        [JsonPropertyName("confirmedBy")]
        public ActorDto ConfirmedBy { get; set; } = new();

        [JsonPropertyName("source")]
        public string Source { get; set; } = "COORDINATOR"; // SYSTEM, COORDINATOR, SPECIALIST
    }

    public class GeoDto
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lng { get; set; }
    }

    public class AccessLimitsDto
    {
        [JsonPropertyName("maxHeightM")]
        public double? MaxHeightM { get; set; }

        [JsonPropertyName("maxWidthM")]
        public double? MaxWidthM { get; set; }

        [JsonPropertyName("maxLengthM")]
        public double? MaxLengthM { get; set; }

        [JsonPropertyName("maxGrossT")]
        public double? MaxGrossT { get; set; }

        [JsonPropertyName("maxAxleT")]
        public double? MaxAxleT { get; set; }
    }

    public class EndpointDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("geo")]
        public GeoDto Geo { get; set; } = new();

        [JsonPropertyName("access")]
        public AccessLimitsDto? Access { get; set; }
    }
}

