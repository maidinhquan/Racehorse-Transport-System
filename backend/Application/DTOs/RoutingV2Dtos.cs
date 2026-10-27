using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class RoutingSegmentDto
    {
        [JsonPropertyName("fromStopKey")]
        public string FromStopKey { get; set; } = string.Empty;

        [JsonPropertyName("toStopKey")]
        public string ToStopKey { get; set; } = string.Empty;

        [JsonPropertyName("leg")]
        public string Leg { get; set; } = "road"; // road, outbound, inbound

        [JsonPropertyName("km")]
        public double Km { get; set; }

        [JsonPropertyName("driveMin")]
        public double DriveMin { get; set; }

        [JsonPropertyName("geometry")]
        public List<List<double>> Geometry { get; set; } = new();
    }

    public class RoutingDto
    {
        [JsonPropertyName("routingId")]
        public string RoutingId { get; set; } = string.Empty;

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; } = 1;

        [JsonPropertyName("policyVersion")]
        public int PolicyVersion { get; set; } = 1;

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "OSRM"; // OSRM, HERE, DEMO

        [JsonPropertyName("truckVerified")]
        public bool TruckVerified { get; set; } = true;

        [JsonPropertyName("demo")]
        public bool Demo { get; set; } = false;

        [JsonPropertyName("checkedAt")]
        public string CheckedAt { get; set; } = string.Empty;

        [JsonPropertyName("segments")]
        public List<RoutingSegmentDto> Segments { get; set; } = new();

        [JsonPropertyName("stops")]
        public List<string> Stops { get; set; } = new();

        [JsonPropertyName("totalKm")]
        public double TotalKm { get; set; }

        [JsonPropertyName("driveMin")]
        public double DriveMin { get; set; }

        [JsonPropertyName("stopMin")]
        public double StopMin { get; set; }

        [JsonPropertyName("flyMin")]
        public double FlyMin { get; set; }

        [JsonPropertyName("eta")]
        public string Eta { get; set; } = string.Empty;

        [JsonPropertyName("issues")]
        public List<BlockerDto> Issues { get; set; } = new();
    }

    public class RoutingInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; }
    }
}

