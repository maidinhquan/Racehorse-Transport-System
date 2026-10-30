using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class RestFacilitiesDto
    {
        [JsonPropertyName("parkingStalls")]
        public int ParkingStalls { get; set; }

        [JsonPropertyName("hasWater")]
        public bool HasWater { get; set; } = true;

        [JsonPropertyName("hasStabling")]
        public bool HasStabling { get; set; } = true;

        [JsonPropertyName("supportsOvernight")]
        public bool SupportsOvernight { get; set; }
    }

    public class FuelFacilitiesDto
    {
        [JsonPropertyName("hasDiesel")]
        public bool HasDiesel { get; set; } = true;

        [JsonPropertyName("hasAdBlue")]
        public bool HasAdBlue { get; set; } = true;

        [JsonPropertyName("truckLane")]
        public bool TruckLane { get; set; } = true;
    }

    public class AirportFacilitiesDto
    {
        [JsonPropertyName("iataCode")]
        public string IataCode { get; set; } = string.Empty;

        [JsonPropertyName("cargoHandling")]
        public bool CargoHandling { get; set; } = true;

        [JsonPropertyName("quarantineStationAdjacent")]
        public bool QuarantineStationAdjacent { get; set; } = true;
    }

    public class PlaceServiceDto
    {
        [JsonPropertyName("quarantineCapacity")]
        public int? QuarantineCapacity { get; set; }

        [JsonPropertyName("customsOfficeHours")]
        public string? CustomsOfficeHours { get; set; }

        [JsonPropertyName("contactVet")]
        public string? ContactVet { get; set; }
    }

    public class PlaceDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public int Version { get; set; } = 1;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("province")]
        public string Province { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("geo")]
        public GeoDto Geo { get; set; } = new();

        [JsonPropertyName("functions")]
        public List<string> Functions { get; set; } = new();

        [JsonPropertyName("hours")]
        public string Hours { get; set; } = "24/7";

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("notes")]
        public string Notes { get; set; } = string.Empty;

        [JsonPropertyName("rest")]
        public RestFacilitiesDto? Rest { get; set; }

        [JsonPropertyName("fuel")]
        public FuelFacilitiesDto? Fuel { get; set; }

        [JsonPropertyName("airport")]
        public AirportFacilitiesDto? Airport { get; set; }

        [JsonPropertyName("service")]
        public PlaceServiceDto? Service { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, SUSPENDED, INACTIVE

        [JsonPropertyName("sample")]
        public bool Sample { get; set; }

        [JsonPropertyName("updatedAt")]
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class PlaceInputDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("province")]
        public string Province { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("geo")]
        public GeoDto Geo { get; set; } = new();

        [JsonPropertyName("functions")]
        public List<string> Functions { get; set; } = new();

        [JsonPropertyName("hours")]
        public string Hours { get; set; } = "24/7";

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("notes")]
        public string Notes { get; set; } = string.Empty;

        [JsonPropertyName("rest")]
        public RestFacilitiesDto? Rest { get; set; }

        [JsonPropertyName("fuel")]
        public FuelFacilitiesDto? Fuel { get; set; }

        [JsonPropertyName("airport")]
        public AirportFacilitiesDto? Airport { get; set; }

        [JsonPropertyName("service")]
        public PlaceServiceDto? Service { get; set; }
    }

    public class PlaceUpdateDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = "VN";

        [JsonPropertyName("province")]
        public string Province { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("geo")]
        public GeoDto Geo { get; set; } = new();

        [JsonPropertyName("functions")]
        public List<string> Functions { get; set; } = new();

        [JsonPropertyName("hours")]
        public string Hours { get; set; } = "24/7";

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("notes")]
        public string Notes { get; set; } = string.Empty;

        [JsonPropertyName("rest")]
        public RestFacilitiesDto? Rest { get; set; }

        [JsonPropertyName("fuel")]
        public FuelFacilitiesDto? Fuel { get; set; }

        [JsonPropertyName("airport")]
        public AirportFacilitiesDto? Airport { get; set; }

        [JsonPropertyName("service")]
        public PlaceServiceDto? Service { get; set; }
    }

    public class PlaceStatusDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, SUSPENDED, INACTIVE

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }

    public class DeletedDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("deleted")]
        public bool Deleted { get; set; } = true;
    }
}

