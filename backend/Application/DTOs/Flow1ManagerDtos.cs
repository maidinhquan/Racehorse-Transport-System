using System.Text.Json.Serialization;

namespace Application.DTOs;

public class ManagerCustomerInfoDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("company")]
    public string Company { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;
}

public class ManagerHorseRefDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("breed")]
    public string Breed { get; set; } = string.Empty;

    [JsonPropertyName("microchip")]
    public string Microchip { get; set; } = string.Empty;

    [JsonPropertyName("passportNo")]
    public string PassportNo { get; set; } = string.Empty;
}

public class ManagerDossierItemDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("scope")]
    public string Scope { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "APPROVED";

    [JsonPropertyName("file")]
    public string? File { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public class ManagerTransportRequestDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("contractId")]
    public string? ContractId { get; set; }

    [JsonPropertyName("tripId")]
    public string? TripId { get; set; }

    [JsonPropertyName("customerId")]
    public string CustomerId { get; set; } = string.Empty;

    [JsonPropertyName("origin")]
    public string Origin { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING_REVIEW";

    [JsonPropertyName("horses")]
    public List<string> Horses { get; set; } = new();

    [JsonPropertyName("pickup")]
    public PlaceDto Pickup { get; set; } = new();

    [JsonPropertyName("delivery")]
    public PlaceDto Delivery { get; set; } = new();

    [JsonPropertyName("careNotes")]
    public string CareNotes { get; set; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    public string SubmittedAt { get; set; } = string.Empty;

    [JsonPropertyName("feedback")]
    public string? Feedback { get; set; }

    [JsonPropertyName("revisionFields")]
    public List<string>? RevisionFields { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("versions")]
    public List<ContractVersionDto> Versions { get; set; } = new();

    [JsonPropertyName("draft")]
    public ManagerContractDraftDto? Draft { get; set; }

    [JsonPropertyName("dossier")]
    public List<ManagerDossierItemDto> Dossier { get; set; } = new();

    [JsonPropertyName("history")]
    public List<object> History { get; set; } = new();
}

public class ManagerContractDraftDto
{
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";

    [JsonPropertyName("departAt")]
    public string DepartAt { get; set; } = string.Empty;

    [JsonPropertyName("arriveAt")]
    public string ArriveAt { get; set; } = string.Empty;

    [JsonPropertyName("budget")]
    public Dictionary<string, decimal> Budget { get; set; } = new();

    [JsonPropertyName("items")]
    public List<ContractItemDto> Items { get; set; } = new();

    [JsonPropertyName("depositPct")]
    public int DepositPct { get; set; } = 30;

    [JsonPropertyName("note")]
    public string Note { get; set; } = string.Empty;

    [JsonPropertyName("exception")]
    public string Exception { get; set; } = string.Empty;

    [JsonPropertyName("terms")]
    public List<ContractTermDto> Terms { get; set; } = new();

    [JsonPropertyName("savedAt")]
    public string? SavedAt { get; set; }
}

public class CostEstimateRequestDto
{
    [JsonPropertyName("transportMode")]
    public string TransportMode { get; set; } = "ROAD";

    [JsonPropertyName("departureAt")]
    public string DepartureAt { get; set; } = string.Empty;

    [JsonPropertyName("deliveryAt")]
    public string DeliveryAt { get; set; } = string.Empty;
}

public class CostPlanDto
{
    [JsonPropertyName("costs")]
    public CostSummaryDto Costs { get; set; } = new();

    [JsonPropertyName("days")]
    public int Days { get; set; } = 1;

    [JsonPropertyName("stableNights")]
    public int StableNights { get; set; } = 0;

    [JsonPropertyName("crewCount")]
    public int CrewCount { get; set; } = 2;

    [JsonPropertyName("doctorCount")]
    public int DoctorCount { get; set; } = 1;

    [JsonPropertyName("vehicleCount")]
    public int VehicleCount { get; set; } = 1;

    [JsonPropertyName("roadDistanceKm")]
    public decimal RoadDistanceKm { get; set; } = 350;

    [JsonPropertyName("insuredValueVnd")]
    public decimal? InsuredValueVnd { get; set; }

    [JsonPropertyName("minimumInsuranceAssumed")]
    public bool MinimumInsuranceAssumed { get; set; } = true;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "VND";
}

public class CostSummaryDto
{
    [JsonPropertyName("transport")]
    public decimal Transport { get; set; }

    [JsonPropertyName("crew")]
    public decimal Crew { get; set; }

    [JsonPropertyName("permit")]
    public decimal Permit { get; set; }

    [JsonPropertyName("vet")]
    public decimal Vet { get; set; }

    [JsonPropertyName("insurance")]
    public decimal Insurance { get; set; }

    [JsonPropertyName("total")]
    public decimal Total { get; set; }
}

public class ContractEditorDataDto
{
    [JsonPropertyName("request")]
    public ManagerTransportRequestDto Request { get; set; } = new();

    [JsonPropertyName("customer")]
    public ManagerCustomerInfoDto Customer { get; set; } = new();

    [JsonPropertyName("horses")]
    public List<ManagerHorseRefDto> Horses { get; set; } = new();

    [JsonPropertyName("draft")]
    public ManagerContractDraftDto? Draft { get; set; }

    [JsonPropertyName("currentContract")]
    public ContractVersionDto? CurrentContract { get; set; }

    [JsonPropertyName("versions")]
    public List<ContractVersionDto> Versions { get; set; } = new();

    [JsonPropertyName("defaults")]
    public ContractEditorDefaultsDto Defaults { get; set; } = new();
}

public class ContractEditorDefaultsDto
{
    [JsonPropertyName("terms")]
    public List<ContractTermDto> Terms { get; set; } = new();
}

public class ManagerRequestChangesDto
{
    [JsonPropertyName("feedback")]
    public string Feedback { get; set; } = string.Empty;

    [JsonPropertyName("fields")]
    public List<string> Fields { get; set; } = new();
}

public class ManagerRejectRequestDto
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class ManagerPublishContractDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;
}

public class ManagerRespondFeedbackDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "ACCEPTED";

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class ManagerExtendDeadlineDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}
