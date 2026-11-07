namespace Application.DTOs.Flow1;

public sealed record CostAmounts(
    decimal Transport,
    decimal Crew,
    decimal Permit,
    decimal Vet,
    decimal Insurance
)
{
    public decimal Total => Transport + Crew + Permit + Vet + Insurance;
}

public sealed record CostPlanningInput(
    int? Days = null,
    int? StableNights = null,
    int? CrewCount = null,
    int? DoctorCount = null,
    int? VehicleCount = null,
    decimal? RoadDistanceKm = null,
    decimal? InsuredValueVnd = null,
    string? TransportMode = null,
    DateTimeOffset? DepartureAt = null,
    DateTimeOffset? DeliveryAt = null
);

public sealed record CostPlan(
    CostAmounts Costs,
    int Days,
    int StableNights,
    int CrewCount,
    int DoctorCount,
    int VehicleCount,
    decimal RoadDistanceKm,
    decimal? InsuredValueVnd,
    bool MinimumInsuranceAssumed,
    string Currency = "VND",
    string InsuranceRateBasis = "PROJECT_ASSUMPTION_NOT_INSURER_QUOTE"
);

public sealed record DemoEstimateInput(string Origin, string Destination, int HorseCount);

public sealed record DemoEstimateView(
    decimal EstimatedPrice,
    decimal EstimatedDeposit,
    string Currency,
    int HorseCount,
    decimal AverageRoadKm,
    int Days,
    int StableNights,
    bool MinimumInsuranceAssumed,
    string Scope = "NON_BINDING_AVERAGE_ROUTE"
);

public sealed record CostRateCard(
    string CostRateId,
    string Code,
    string CostGroup,
    string CalculationUnit,
    decimal Rate,
    string CurrencyCode,
    bool IsActive,
    string Version
);

public sealed record CostRateUpdate(string Version, decimal Rate, bool IsActive = true);
