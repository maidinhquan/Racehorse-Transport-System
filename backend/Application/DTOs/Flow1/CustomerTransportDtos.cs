using System.ComponentModel.DataAnnotations;
using Application.Flow1.Interfaces;

namespace Application.DTOs.Flow1;

public sealed record LocationInput(
    [Required, StringLength(255)] string Address,
    double Lat,
    double Lng,
    [Required] string Country
);

public sealed record EstimateInput(
    [Required] LocationInput Pickup,
    [Required] LocationInput Delivery,
    [Required] string PreferredTransportMode,
    [Range(1, 100)] int HorseCount,
    DateOnly DesiredDepartureDate,
    decimal? InsuredValueVnd = null
);

public sealed record EstimateView(
    string PricingPolicyVersion,
    string Currency,
    decimal EstimatedPrice,
    decimal EstimatedDeposit,
    int HorseCount,
    int VehicleCount,
    int StallsRequired,
    decimal? RoadDistanceKm,
    int MinimumPreparationDays,
    DateOnly EarliestDepartureDate,
    string Scope,
    string? Provider,
    DateTimeOffset CalculatedAtUtc,
    string? Attribution,
    string? LocationAttribution = null,
    decimal? DemoTransportCost = null,
    bool MinimumInsuranceAssumed = true
);

// Internal cost breakdown is never serialized to a Customer endpoint.
public sealed record EstimateCalculation(
    EstimateView Customer,
    decimal EstimatedCost,
    decimal Floor,
    RoadRouteResult? Route,
    CostPlan? Plan = null
);

public sealed record ContactInput(
    [Required, StringLength(100)] string Name,
    [Required, RegularExpression(@"\+?[0-9 ()-]{7,20}")] string Phone,
    [StringLength(200)] string? StableName = null,
    [StringLength(20)] string? PostalCode = null,
    [StringLength(1000)] string? Instructions = null
);

public sealed record HorseInput(
    [Required, StringLength(100)] string Name,
    [Required, RegularExpression(@"[0-9]{15}")] string MicrochipIso,
    [Required, StringLength(50)] string FeiPassportNo,
    [Required, StringLength(100)] string Breed,
    [Required, RegularExpression("STALLION|MARE|GELDING")] string Sex,
    [Range(1, 2000)] decimal Weight,
    DateOnly Dob,
    [StringLength(200)] string? PassportIssuedBy = null,
    DateOnly? PassportIssuedDate = null,
    DateOnly? PassportExpiryDate = null,
    decimal? DeclaredValueVnd = null,
    [StringLength(2000)] string? SpecialHealthNotes = null
);

public sealed record UploadedFile(byte[] Bytes, string FileName);

public sealed record PrivateFileReference(
    string FileId,
    string Sha256,
    string ContentType,
    int SizeBytes
);
