using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class StopInputDto
    {
        [JsonPropertyName("placeId")]
        public string PlaceId { get; set; } = string.Empty;

        [JsonPropertyName("purposes")]
        public List<string> Purposes { get; set; } = new();

        [JsonPropertyName("dwellMin")]
        public int DwellMin { get; set; }

        [JsonPropertyName("careNote")]
        public string CareNote { get; set; } = string.Empty;
    }

    public class StopDto
    {
        [JsonPropertyName("stopId")]
        public string StopId { get; set; } = string.Empty;

        [JsonPropertyName("clientKey")]
        public string ClientKey { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = "REST_STOP"; // ORIGIN, DESTINATION, REST_STOP, FUEL_STOP, CHECKPOINT, QUARANTINE_STATION, AIRPORT

        [JsonPropertyName("placeId")]
        public string? PlaceId { get; set; }

        [JsonPropertyName("purposes")]
        public List<string> Purposes { get; set; } = new();

        [JsonPropertyName("dwellMin")]
        public int DwellMin { get; set; }

        [JsonPropertyName("unload")]
        public bool Unload { get; set; }

        [JsonPropertyName("careNote")]
        public string CareNote { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("geo")]
        public GeoDto Geo { get; set; } = new();

        [JsonPropertyName("required")]
        public bool Required { get; set; } = true;

        [JsonPropertyName("arriveAt")]
        public string ArriveAt { get; set; } = string.Empty;

        [JsonPropertyName("departAt")]
        public string DepartAt { get; set; } = string.Empty;

        [JsonPropertyName("placeVersion")]
        public int? PlaceVersion { get; set; }
    }

    public class CrewDto
    {
        [JsonPropertyName("MAIN_DRIVER")]
        public string? MainDriver { get; set; }

        [JsonPropertyName("CO_DRIVER")]
        public string? CoDriver { get; set; }

        [JsonPropertyName("VETERINARIAN")]
        public string? Veterinarian { get; set; }
    }

    public class TruckProfileDto
    {
        [JsonPropertyName("vehicleId")]
        public string VehicleId { get; set; } = string.Empty;

        [JsonPropertyName("heightM")]
        public double HeightM { get; set; }

        [JsonPropertyName("widthM")]
        public double WidthM { get; set; }

        [JsonPropertyName("lengthM")]
        public double LengthM { get; set; }

        [JsonPropertyName("currentT")]
        public double CurrentT { get; set; }

        [JsonPropertyName("grossT")]
        public double GrossT { get; set; }

        [JsonPropertyName("axleT")]
        public double AxleT { get; set; }
    }

    public class RoadResourcesDto
    {
        [JsonPropertyName("leg")]
        public string Leg { get; set; } = "road"; // road, outbound, inbound

        [JsonPropertyName("vehicleId")]
        public string? VehicleId { get; set; }

        [JsonPropertyName("crew")]
        public CrewDto Crew { get; set; } = new();

        [JsonPropertyName("truckProfile")]
        public TruckProfileDto? TruckProfile { get; set; }
    }

    public class PlanDraftInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("plannedDepart")]
        public string? PlannedDepart { get; set; }

        [JsonPropertyName("stops")]
        public List<StopInputDto> Stops { get; set; } = new();

        [JsonPropertyName("resources")]
        public List<RoadResourcesDto> Resources { get; set; } = new();

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;
    }

    public class PlanDto
    {
        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; } = 1;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, RETURNED, WITHDRAWN, SUPERSEDED

        [JsonPropertyName("mode")]
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR

        [JsonPropertyName("plannedDepart")]
        public string PlannedDepart { get; set; } = string.Empty;

        [JsonPropertyName("eta")]
        public string? Eta { get; set; }

        [JsonPropertyName("stops")]
        public List<StopDto> Stops { get; set; } = new();

        [JsonPropertyName("resources")]
        public List<RoadResourcesDto> Resources { get; set; } = new();

        [JsonPropertyName("flight")]
        public FlightProposalDto? Flight { get; set; }

        [JsonPropertyName("routing")]
        public RoutingDto? Routing { get; set; }

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;
    }

    public class ValidationDto
    {
        [JsonPropertyName("binding")]
        public BindingDto Binding { get; set; } = new();

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; } = 1;

        [JsonPropertyName("valid")]
        public bool Valid { get; set; }

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();

        [JsonPropertyName("eta")]
        public string? Eta { get; set; }

        [JsonPropertyName("resourceHoldsCreated")]
        public bool ResourceHoldsCreated { get; set; } = false;
    }

    public class PlanDecisionInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; }

        [JsonPropertyName("decision")]
        public string Decision { get; set; } = "APPROVE"; // APPROVE, RETURN

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}

