using System.Text.Json;
using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class StringListOrSingleConverter : JsonConverter<List<string>>
    {
        public override List<string> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str)) return new List<string>();
                return str.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                          .Select(s => s.Trim())
                          .ToList();
            }

            if (reader.TokenType == JsonTokenType.StartArray)
            {
                var list = new List<string>();
                while (reader.Read())
                {
                    if (reader.TokenType == JsonTokenType.EndArray)
                        break;
                    if (reader.TokenType == JsonTokenType.String)
                    {
                        var s = reader.GetString();
                        if (s != null) list.Add(s);
                    }
                }
                return list;
            }

            return new List<string>();
        }

        public override void Write(Utf8JsonWriter writer, List<string> value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            if (value != null)
            {
                foreach (var item in value)
                {
                    writer.WriteStringValue(item);
                }
            }
            writer.WriteEndArray();
        }
    }

    public class StopInputDto
    {
        [JsonPropertyName("placeId")]
        public string PlaceId { get; set; } = string.Empty;

        [JsonPropertyName("purposes")]
        [JsonConverter(typeof(StringListOrSingleConverter))]
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
        [JsonConverter(typeof(StringListOrSingleConverter))]
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

    public class CrewDtoConverter : JsonConverter<CrewDto>
    {
        public override CrewDto Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var crew = new CrewDto();
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                return crew;
            }

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                    break;

                if (reader.TokenType == JsonTokenType.PropertyName)
                {
                    var propName = reader.GetString()?.ToLowerInvariant();
                    reader.Read();
                    var propValue = reader.GetString();

                    if (propName != null)
                    {
                        if (propName.Contains("main") || propName == "maindriver" || propName == "main_driver")
                        {
                            crew.MainDriver = propValue;
                        }
                        else if (propName.Contains("co") || propName == "codriver" || propName == "co_driver")
                        {
                            crew.CoDriver = propValue;
                        }
                        else if (propName.Contains("vet") || propName == "escort")
                        {
                            crew.Veterinarian = propValue;
                        }
                    }
                }
            }

            return crew;
        }

        public override void Write(Utf8JsonWriter writer, CrewDto value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WriteString("mainDriver", value.MainDriver ?? string.Empty);
            writer.WriteString("coDriver", value.CoDriver ?? string.Empty);
            writer.WriteString("veterinarian", value.Veterinarian ?? string.Empty);
            writer.WriteEndObject();
        }
    }

    [JsonConverter(typeof(CrewDtoConverter))]
    public class CrewDto
    {
        [JsonPropertyName("mainDriver")]
        public string? MainDriver { get; set; }

        [JsonPropertyName("coDriver")]
        public string? CoDriver { get; set; }

        [JsonPropertyName("veterinarian")]
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

