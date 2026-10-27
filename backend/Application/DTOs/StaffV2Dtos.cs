using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class StaffV2Dto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public int Version { get; set; } = 1;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("position")]
        public string Position { get; set; } = "DRIVER"; // DRIVER, VETERINARIAN, ESCORT

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, ON_LEAVE, INACTIVE

        [JsonPropertyName("licence")]
        public string? Licence { get; set; }

        [JsonPropertyName("certExpiry")]
        public string? CertExpiry { get; set; }

        [JsonPropertyName("assignedTrips")]
        public List<string> AssignedTrips { get; set; } = new();

        [JsonPropertyName("eligible")]
        public bool Eligible { get; set; } = true;

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();
    }

    public class StaffStatusDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, ON_LEAVE, INACTIVE

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}

