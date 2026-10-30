using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class AirPartnerDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public int Version { get; set; } = 1;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("services")]
        public string Services { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

        [JsonPropertyName("sample")]
        public bool Sample { get; set; }

        [JsonPropertyName("updatedAt")]
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class AirPartnerInputDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("services")]
        public string Services { get; set; } = string.Empty;
    }

    public class AirPartnerUpdateDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("contact")]
        public string Contact { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("services")]
        public string Services { get; set; } = string.Empty;
    }

    public class AirPartnerStatusDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }

    public class FlightServiceDto
    {
        [JsonPropertyName("serviceId")]
        public string ServiceId { get; set; } = string.Empty;

        [JsonPropertyName("catalogVersion")]
        public int CatalogVersion { get; set; } = 1;

        [JsonPropertyName("partnerId")]
        public string PartnerId { get; set; } = string.Empty;

        [JsonPropertyName("partnerName")]
        public string PartnerName { get; set; } = string.Empty;

        [JsonPropertyName("airline")]
        public string Airline { get; set; } = string.Empty;

        [JsonPropertyName("providerFlightCode")]
        public string ProviderFlightCode { get; set; } = string.Empty;

        [JsonPropertyName("originAirportPlaceId")]
        public string OriginAirportPlaceId { get; set; } = string.Empty;

        [JsonPropertyName("originAirportPlaceName")]
        public string OriginAirportPlaceName { get; set; } = string.Empty;

        [JsonPropertyName("destAirportPlaceId")]
        public string DestAirportPlaceId { get; set; } = string.Empty;

        [JsonPropertyName("destAirportPlaceName")]
        public string DestAirportPlaceName { get; set; } = string.Empty;

        [JsonPropertyName("departureTime")]
        public string DepartureTime { get; set; } = string.Empty;

        [JsonPropertyName("arrivalTime")]
        public string ArrivalTime { get; set; } = string.Empty;

        [JsonPropertyName("departureTimeZone")]
        public string DepartureTimeZone { get; set; } = "Asia/Ho_Chi_Minh";

        [JsonPropertyName("arrivalTimeZone")]
        public string ArrivalTimeZone { get; set; } = "Asia/Tokyo";

        [JsonPropertyName("durationMinutes")]
        public int DurationMinutes { get; set; }

        [JsonPropertyName("priceVnd")]
        public decimal PriceVnd { get; set; }

        [JsonPropertyName("capacityHorses")]
        public int CapacityHorses { get; set; } = 4;

        [JsonPropertyName("careProvider")]
        public string CareProvider { get; set; } = "AIRLINE";

        [JsonPropertyName("directFlight")]
        public bool DirectFlight { get; set; } = true;

        [JsonPropertyName("sample")]
        public bool Sample { get; set; }

        [JsonPropertyName("updatedAt")]
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class FlightSelectInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("serviceId")]
        public string ServiceId { get; set; } = string.Empty;

        [JsonPropertyName("catalogVersion")]
        public int CatalogVersion { get; set; } = 1;

        [JsonPropertyName("partnerId")]
        public string PartnerId { get; set; } = string.Empty;

        [JsonPropertyName("providerFlightCode")]
        public string ProviderFlightCode { get; set; } = string.Empty;

        [JsonPropertyName("careAcknowledged")]
        public bool CareAcknowledged { get; set; } = true;
    }

    public class FlightSelectionDto
    {
        [JsonPropertyName("serviceId")]
        public string ServiceId { get; set; } = string.Empty;

        [JsonPropertyName("catalogVersion")]
        public int CatalogVersion { get; set; } = 1;

        [JsonPropertyName("partnerId")]
        public string PartnerId { get; set; } = string.Empty;

        [JsonPropertyName("providerFlightCode")]
        public string ProviderFlightCode { get; set; } = string.Empty;

        [JsonPropertyName("careAcknowledged")]
        public bool CareAcknowledged { get; set; } = true;
    }

    public class FlightProposalDto
    {
        [JsonPropertyName("flightVersion")]
        public int FlightVersion { get; set; } = 1;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "DRAFT"; // DRAFT, BUDGET_PENDING, BUDGET_APPROVED, REJECTED, BOOKED

        [JsonPropertyName("service")]
        public FlightServiceDto Service { get; set; } = new();

        [JsonPropertyName("careAcknowledged")]
        public bool CareAcknowledged { get; set; } = true;
    }

    public class BookingInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; } = 1;

        [JsonPropertyName("flightVersion")]
        public int FlightVersion { get; set; } = 1;

        [JsonPropertyName("bookingRef")]
        public string BookingRef { get; set; } = string.Empty;

        [JsonPropertyName("confirmedHorses")]
        public int ConfirmedHorses { get; set; } = 1;

        [JsonPropertyName("acknowledged")]
        public bool Acknowledged { get; set; } = true;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "PARTNER_REFERENCE"; // PARTNER_REFERENCE, DEMO

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;

        [JsonPropertyName("evidenceFileId")]
        public string? EvidenceFileId { get; set; }
    }

    public class BookingDto
    {
        [JsonPropertyName("bookingId")]
        public int BookingId { get; set; }

        [JsonPropertyName("planVersion")]
        public int PlanVersion { get; set; } = 1;

        [JsonPropertyName("flightVersion")]
        public int FlightVersion { get; set; } = 1;

        [JsonPropertyName("partnerId")]
        public string PartnerId { get; set; } = string.Empty;

        [JsonPropertyName("bookingRef")]
        public string BookingRef { get; set; } = string.Empty;

        [JsonPropertyName("confirmedHorses")]
        public int ConfirmedHorses { get; set; } = 1;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "PARTNER_REFERENCE"; // PARTNER_REFERENCE, DEMO

        [JsonPropertyName("status")]
        public string Status { get; set; } = "BOOKED"; // BOOKED, CANCELLED

        [JsonPropertyName("evidenceFileId")]
        public string? EvidenceFileId { get; set; }

        [JsonPropertyName("recordedAt")]
        public string RecordedAt { get; set; } = string.Empty;

        [JsonPropertyName("recordedBy")]
        public ActorDto RecordedBy { get; set; } = new();
    }

    public class CancelBookingInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("bookingId")]
        public int BookingId { get; set; }

        [JsonPropertyName("cancellationRef")]
        public string CancellationRef { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("partnerConfirmed")]
        public bool PartnerConfirmed { get; set; } = true;

        [JsonPropertyName("evidenceFileId")]
        public string? EvidenceFileId { get; set; }
    }

    public class PlanningFileDto
    {
        [JsonPropertyName("fileId")]
        public string FileId { get; set; } = string.Empty;

        [JsonPropertyName("fileName")]
        public string FileName { get; set; } = string.Empty;

        [JsonPropertyName("contentType")]
        public string ContentType { get; set; } = "application/pdf"; // application/pdf, image/jpeg, image/png

        [JsonPropertyName("size")]
        public int Size { get; set; }

        [JsonPropertyName("uploadedAt")]
        public string UploadedAt { get; set; } = string.Empty;

        [JsonPropertyName("uploadedBy")]
        public ActorDto UploadedBy { get; set; } = new();
    }

    public class BudgetCommandDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("flightVersion")]
        public int FlightVersion { get; set; }
    }

    public class BudgetDecisionInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("flightVersion")]
        public int FlightVersion { get; set; }

        [JsonPropertyName("decision")]
        public string Decision { get; set; } = "APPROVE"; // APPROVE, RETURN

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }
}

