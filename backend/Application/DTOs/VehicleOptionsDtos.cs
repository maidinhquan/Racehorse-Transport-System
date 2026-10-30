using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class VehicleSpecDto
    {
        [JsonPropertyName("heightM")]
        public double HeightM { get; set; }

        [JsonPropertyName("widthM")]
        public double WidthM { get; set; }

        [JsonPropertyName("lengthM")]
        public double LengthM { get; set; }

        [JsonPropertyName("grossT")]
        public double GrossT { get; set; }
    }

    public class VehicleOptionDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("plate")]
        public string Plate { get; set; } = string.Empty;

        [JsonPropertyName("stalls")]
        public int Stalls { get; set; } = 3;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "READY"; // READY, MAINTENANCE, INACTIVE

        [JsonPropertyName("spec")]
        public VehicleSpecDto? Spec { get; set; }

        [JsonPropertyName("eligible")]
        public bool Eligible { get; set; } = true;

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();

        [JsonPropertyName("assignedTrips")]
        public List<string> AssignedTrips { get; set; } = new();
    }
}

