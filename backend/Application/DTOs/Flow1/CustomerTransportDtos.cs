using System.ComponentModel.DataAnnotations;
using Application.Interfaces.Flow1;

namespace Application.DTOs.Flow1;

public sealed record LocationInput([Required, StringLength(255)] string Address,
    double Lat, double Lng, [Required] string Country);
public sealed record EstimateInput([Required] LocationInput Pickup,
    [Required] LocationInput Delivery, [Required] string PreferredTransportMode,
    [Range(1, 100)] int HorseCount, DateOnly DesiredDepartureDate);
public sealed record EstimateView(string PricingPolicyVersion, string Currency, decimal EstimatedPrice,
    decimal EstimatedDeposit, int HorseCount, int VehicleCount, int StallsRequired,
    decimal? RoadDistanceKm, int MinimumPreparationDays, DateOnly EarliestDepartureDate,
    string Scope, string? Provider, DateTimeOffset CalculatedAtUtc, string? Attribution, string? LocationAttribution = null);
// Internal cost breakdown is never serialized to a Customer endpoint.
public sealed record EstimateCalculation(EstimateView Customer, decimal EstimatedCost, decimal Floor,
    RoadRouteResult? Route);
public sealed record ContactInput([Required, StringLength(100)] string Name,
    [Required, RegularExpression(@"\+?[0-9 ()-]{7,20}")] string Phone);
public sealed record ReceiverInput([Required, StringLength(100)] string Name,
    [Required, RegularExpression(@"\+?[0-9 ()-]{7,20}")] string Phone, bool IsProxy);
public sealed record DocumentVersionInput(string HorseId, int DocumentVersion);
public sealed record SubmitRequestInput([Required] EstimateInput Trip,
    DateOnly DeliveryDeadline, [Required, StringLength(100)] string Purpose,
    [Required] ContactInput PickupContact, [Required] ReceiverInput Receiver,
    [Required, MinLength(1), MaxLength(100)] IReadOnlyList<DocumentVersionInput> Horses);
public sealed record HorseInput([Required, StringLength(100)] string Name,
    [Required, RegularExpression(@"[0-9]{15}")] string MicrochipIso,
    [Required, StringLength(50)] string FeiPassportNo,
    [Required, StringLength(100)] string Breed,
    [Required, RegularExpression("STALLION|MARE|GELDING")] string Sex,
    [Range(1, 2000)] decimal Weight, DateOnly Dob);
public sealed record UploadedFile(byte[] Bytes, string FileName);
public sealed record PrivateFileReference(string FileId, string Sha256, string ContentType, int SizeBytes);
public sealed record HorseSnapshot(string Status, HorseInput Identity, PrivateFileReference Photo,
    PrivateFileReference PassportScan, string InputHash);
public sealed record HorseView(string HorseId, string Name, string MicrochipIso, string? FeiPassportNo,
    string Status, int DocumentVersion, bool Selectable, string? UnavailableReason);
public sealed record RequestSnapshot(SubmitRequestInput Input, EstimateView Estimate, string InputHash,
    IReadOnlyList<HorseSnapshot> HorseSnapshots, string ReceiverVerificationStatus);
public sealed record RequestView(string RequestId, string Status, string Departure, string Destination,
    DateTime? ExpectedDate, DateTime? CommittedDeadline, int Version, RequestSnapshot? Snapshot,
    IReadOnlyList<string> AllowedActions, CustomerReviewView? Review = null);
public sealed record PageView<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
