using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class PickupAccessDto
    {
        [JsonPropertyName("result")]
        public string Result { get; set; } = "ACCESSIBLE"; // ACCESSIBLE, INACCESSIBLE

        [JsonPropertyName("proof")]
        public string Proof { get; set; } = string.Empty;

        [JsonPropertyName("valid")]
        public bool Valid { get; set; } = true;

        [JsonPropertyName("by")]
        public ActorDto By { get; set; } = new();

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;
    }

    public class AccessInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("result")]
        public string Result { get; set; } = "ACCESSIBLE"; // ACCESSIBLE, INACCESSIBLE

        [JsonPropertyName("accessResult")]
        public string? AccessResult { set { if (!string.IsNullOrEmpty(value)) Result = value; } }

        [JsonPropertyName("proof")]
        public string Proof { get; set; } = string.Empty;

        [JsonPropertyName("acknowledged")]
        public bool Acknowledged { get; set; } = true;
    }

    public class ConsentDto
    {
        [JsonPropertyName("channel")]
        public string Channel { get; set; } = "PHONE"; // PHONE, EMAIL, WRITTEN

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;

        [JsonPropertyName("recordedBy")]
        public ActorDto RecordedBy { get; set; } = new();

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;
    }

    public class ConsentInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("placeVersion")]
        public int PlaceVersion { get; set; } = 1;

        [JsonPropertyName("channel")]
        public string Channel { get; set; } = "PHONE"; // PHONE, EMAIL, WRITTEN

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;

        [JsonPropertyName("acknowledged")]
        public bool Acknowledged { get; set; } = true;
    }

    public class PickupCandidateDto
    {
        [JsonPropertyName("place")]
        public PlaceDto Place { get; set; } = new();

        [JsonPropertyName("straightLineKm")]
        public double? StraightLineKm { get; set; }

        [JsonPropertyName("eligible")]
        public bool Eligible { get; set; }

        [JsonPropertyName("blockers")]
        public List<BlockerDto> Blockers { get; set; } = new();
    }

    public class PickupProposalInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("placeId")]
        public string PlaceId { get; set; } = string.Empty;

        [JsonPropertyName("placeVersion")]
        public int PlaceVersion { get; set; } = 1;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("handoverAt")]
        public string HandoverAt { get; set; } = string.Empty;

        [JsonPropertyName("facilityConfirmed")]
        public bool FacilityConfirmed { get; set; } = true;
    }

    public class PickupDecisionInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("decision")]
        public string Decision { get; set; } = "APPROVE"; // APPROVE, RETURN

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }

    public class PickupSendInputDto
    {
        [JsonPropertyName("expectedVersion")]
        public int ExpectedVersion { get; set; }

        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("proposalVersion")]
        public int ProposalVersion { get; set; } = 1;
    }

    public class CustomerPickupDecisionInputDto
    {
        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("proposalVersion")]
        public int ProposalVersion { get; set; } = 1;

        [JsonPropertyName("decision")]
        public string Decision { get; set; } = "ACCEPT"; // ACCEPT, REJECT

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;

        [JsonPropertyName("acknowledged")]
        public bool Acknowledged { get; set; } = true;
    }

    public class PlaceGeoDto
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
        public object? Access { get; set; }
    }

    public class CustomerReplyDto
    {
        [JsonPropertyName("decision")]
        public string Decision { get; set; } = "ACCEPT";

        [JsonPropertyName("note")]
        public string? Note { get; set; }

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;
    }

    public class CustomerPickupProposalDto
    {
        [JsonPropertyName("tripId")]
        public string TripId { get; set; } = string.Empty;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = string.Empty;

        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("proposalVersion")]
        public int ProposalVersion { get; set; } = 1;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "AWAITING_CUSTOMER"; // AWAITING_CUSTOMER, CUSTOMER_CONFIRMED, CUSTOMER_REJECTED

        [JsonPropertyName("originalPickup")]
        public PlaceGeoDto OriginalPickup { get; set; } = new();

        [JsonPropertyName("proposedPickup")]
        public PlaceGeoDto ProposedPickup { get; set; } = new();

        [JsonPropertyName("handoverAt")]
        public string HandoverAt { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("scheduleImpact")]
        public string ScheduleImpact { get; set; } = string.Empty;

        [JsonPropertyName("costImpactVnd")]
        public decimal CostImpactVnd { get; set; } = 0;

        [JsonPropertyName("customerResponsibilities")]
        public string CustomerResponsibilities { get; set; } = string.Empty;

        [JsonPropertyName("sentAt")]
        public string? SentAt { get; set; }

        [JsonPropertyName("replyAt")]
        public string? ReplyAt { get; set; }

        [JsonPropertyName("customerReply")]
        public CustomerReplyDto? CustomerReply { get; set; }
    }

    public class PickupRelocationDto
    {
        [JsonPropertyName("relocationId")]
        public string RelocationId { get; set; } = string.Empty;

        [JsonPropertyName("proposalVersion")]
        public int ProposalVersion { get; set; } = 1;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "PROPOSED"; // PROPOSED, MANAGER_APPROVED, AWAITING_CUSTOMER, CUSTOMER_CONFIRMED, CUSTOMER_REJECTED

        [JsonPropertyName("placeSnapshot")]
        public PlaceDto PlaceSnapshot { get; set; } = new();

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("handoverAt")]
        public string HandoverAt { get; set; } = string.Empty;

        [JsonPropertyName("scheduleImpact")]
        public string? ScheduleImpact { get; set; }

        [JsonPropertyName("costImpactVnd")]
        public decimal CostImpactVnd { get; set; } = 0;

        [JsonPropertyName("customerResponsibilities")]
        public string? CustomerResponsibilities { get; set; }

        [JsonPropertyName("sentAt")]
        public string? SentAt { get; set; }

        [JsonPropertyName("sentBy")]
        public ActorDto? SentBy { get; set; }

        [JsonPropertyName("customerConsent")]
        public ConsentDto? CustomerConsent { get; set; }

        [JsonPropertyName("customerReply")]
        public CustomerReplyDto? CustomerReply { get; set; }

        [JsonPropertyName("valid")]
        public bool Valid { get; set; } = true;

        [JsonPropertyName("by")]
        public ActorDto By { get; set; } = new();

        [JsonPropertyName("at")]
        public string At { get; set; } = string.Empty;
    }
}

