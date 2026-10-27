using System.Text.Json.Serialization;

namespace Application.DTOs;

public class TripInfoInput
{
    [JsonPropertyName("origin")]
    public string Origin { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("originCountry")]
    public string OriginCountry { get; set; } = "VN";

    [JsonPropertyName("destinationCountry")]
    public string DestinationCountry { get; set; } = "VN";

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("careNotes")]
    public string CareNotes { get; set; } = string.Empty;
}

public class PlaceDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("postal")]
    public string Postal { get; set; } = string.Empty;

    [JsonPropertyName("contact")]
    public string Contact { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;

    [JsonPropertyName("notes")]
    public string Notes { get; set; } = string.Empty;

    [JsonPropertyName("latitude")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Latitude { get; set; }

    [JsonPropertyName("longitude")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Longitude { get; set; }
}

public class CustomerSaveRequestDto : TripInfoInput
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("pickup")]
    public PlaceDto Pickup { get; set; } = new();

    [JsonPropertyName("delivery")]
    public PlaceDto Delivery { get; set; } = new();

    [JsonPropertyName("horses")]
    public List<string> Horses { get; set; } = new();

    [JsonPropertyName("horseNotes")]
    public Dictionary<string, string> HorseNotes { get; set; } = new();

    [JsonPropertyName("horseCount")]
    public int HorseCount { get; set; } = 1;

    [JsonPropertyName("wizardStep")]
    public int WizardStep { get; set; } = 1;
}

public class CustomerTransportRequestDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("origin")]
    public string Origin { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("horseCount")]
    public int HorseCount { get; set; }

    [JsonPropertyName("requestedAt")]
    public string RequestedAt { get; set; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SubmittedAt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "DRAFT";

    [JsonPropertyName("feedback")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Feedback { get; set; }

    [JsonIgnore]
    public List<string>? RevisionFields { get; set; }

    [JsonPropertyName("reason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Reason { get; set; }

    [JsonPropertyName("careNotes")]
    public string CareNotes { get; set; } = string.Empty;

    [JsonPropertyName("pickup")]
    public PlaceDto Pickup { get; set; } = new();

    [JsonPropertyName("delivery")]
    public PlaceDto Delivery { get; set; } = new();

    [JsonPropertyName("horses")]
    public List<string> Horses { get; set; } = new();

    [JsonPropertyName("horseNotes")]
    public Dictionary<string, string> HorseNotes { get; set; } = new();

    [JsonPropertyName("wizardStep")]
    public int WizardStep { get; set; } = 1;

    [JsonIgnore]
    public List<object> Revisions { get; set; } = new();

    [JsonPropertyName("versions")]
    public List<ContractVersionDto> Versions { get; set; } = new();

    [JsonPropertyName("payments")]
    public List<PaymentSummaryDto> Payments { get; set; } = new();

    [JsonPropertyName("docs")]
    public List<DocRecordDto> Docs { get; set; } = new();

    [JsonPropertyName("supplements")]
    public List<object> Supplements { get; set; } = new();

    [JsonPropertyName("companyDocs")]
    public List<object> CompanyDocs { get; set; } = new();

    [JsonPropertyName("complaints")]
    public List<object> Complaints { get; set; } = new();

    [JsonIgnore]
    public List<object> History { get; set; } = new();
}

public class DocRecordDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("scope")]
    public string Scope { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "SUBMITTED";

    [JsonPropertyName("file")]
    public FileRefDto? File { get; set; }

    [JsonPropertyName("issue")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Issue { get; set; }

    [JsonPropertyName("updatedAt")]
    public string? UpdatedAt { get; set; }
}

public class FileRefDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

public class DocumentChecklistDto
{
    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("canSubmit")]
    public bool CanSubmit { get; set; }

    [JsonPropertyName("items")]
    public List<DocumentChecklistItemDto> Items { get; set; } = new();

    [JsonPropertyName("issues")]
    public List<DocumentIssueDto> Issues { get; set; } = new();

    [JsonPropertyName("warnings")]
    public List<string> Warnings { get; set; } = new();
}

public class DocumentChecklistItemDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("scope")]
    public string Scope { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "file";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "SUBMITTED";

    [JsonPropertyName("optional")]
    public bool Optional { get; set; }

    [JsonPropertyName("note")]
    public string Note { get; set; } = string.Empty;

    [JsonPropertyName("file")]
    public FileRefDto? File { get; set; }
}

public class DocumentIssueDto
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

public class ContractItemDto
{
    [JsonPropertyName("desc")]
    public string Desc { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("required")]
    public bool Required { get; set; } = true;
}

public class ContractTermDto
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class ContractVersionDto
{
    [JsonPropertyName("v")]
    public int V { get; set; } = 1;

    [JsonPropertyName("number")]
    public string Number { get; set; } = string.Empty;

    [JsonPropertyName("contractId")]
    public string? ContractId { get; set; }

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";

    [JsonPropertyName("departAt")]
    public string DepartAt { get; set; } = string.Empty;

    [JsonPropertyName("arriveAt")]
    public string ArriveAt { get; set; } = string.Empty;

    [JsonPropertyName("issuedAt")]
    public string IssuedAt { get; set; } = string.Empty;

    [JsonPropertyName("validUntil")]
    public string ValidUntil { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<ContractItemDto> Items { get; set; } = new();

    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("depositPct")]
    public int DepositPct { get; set; } = 30;

    [JsonPropertyName("depositAmount")]
    public decimal DepositAmount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "VND";

    [JsonPropertyName("state")]
    public string State { get; set; } = "ISSUED";

    [JsonPropertyName("terms")]
    public List<ContractTermDto> Terms { get; set; } = new();

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("termsAcceptedAt")]
    public string? TermsAcceptedAt { get; set; }

    [JsonPropertyName("signedAt")]
    public string? SignedAt { get; set; }
}

public class ContractResponseDto
{
    [JsonPropertyName("currentVersion")]
    public ContractVersionDto? CurrentVersion { get; set; }
}

public class AcceptTermsRequestDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;
}

public class ContractFeedbackRequestDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class SignOtpRequestDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;
}

public class SignOtpResponseDto
{
    [JsonPropertyName("expiresInSeconds")]
    public int ExpiresInSeconds { get; set; } = 300;

    [JsonPropertyName("resendAfterSeconds")]
    public int ResendAfterSeconds { get; set; } = 60;

    [JsonPropertyName("sentTo")]
    public string SentTo { get; set; } = string.Empty;
}

public class SignContractRequestDto
{
    [JsonPropertyName("versionNo")]
    public int VersionNo { get; set; } = 1;

    [JsonPropertyName("otp")]
    public string Otp { get; set; } = string.Empty;
}

public class SignContractResponseDto
{
    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("requestStatus")]
    public string RequestStatus { get; set; } = "ACTIVATED";

    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = string.Empty;

    [JsonPropertyName("tripStatus")]
    public string TripStatus { get; set; } = "PLANNING";

    [JsonPropertyName("signedAt")]
    public string SignedAt { get; set; } = string.Empty;
}

public class DepositInfoDto
{
    [JsonPropertyName("invoiceId")]
    public string InvoiceId { get; set; } = string.Empty;

    [JsonPropertyName("canPay")]
    public bool CanPay { get; set; } = true;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PENDING";
}

public class CreatePaymentSessionRequestDto
{
    [JsonPropertyName("method")]
    public string Method { get; set; } = "VNPAY";
}

public class PaymentSessionResponseDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("paymentUrl")]
    public string PaymentUrl { get; set; } = string.Empty;
}

public class PaymentSummaryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "DEPOSIT";

    [JsonPropertyName("method")]
    public string Method { get; set; } = "VNPAY";

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "SUCCESS";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}

public class CancelRequestDto
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class FormOptionsDto
{
    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "VND";

    [JsonPropertyName("preparationDays")]
    public int PreparationDays { get; set; } = 3;

    [JsonPropertyName("defaultDepositPct")]
    public int DefaultDepositPct { get; set; } = 30;

    [JsonPropertyName("contractDeadlineHours")]
    public int ContractDeadlineHours { get; set; } = 24;

    [JsonPropertyName("supportedRoutes")]
    public List<SupportedRouteDto> SupportedRoutes { get; set; } = new();

    [JsonIgnore]
    public List<string> TransportModes { get; set; } = new() { "ROAD", "AIR" };

    [JsonIgnore]
    public List<ContractTermDto> Terms { get; set; } = new();
}

public class SupportedRouteDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("originCountry")]
    public string OriginCountry { get; set; } = "VN";

    [JsonPropertyName("destinationCountry")]
    public string DestinationCountry { get; set; } = "VN";

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "ROAD";
}
