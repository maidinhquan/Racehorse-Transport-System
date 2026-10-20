using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;

namespace Application.Common.Flow1;

public sealed class Flow1EstimateOptions
{
    // Deliberately unset: actual fleet capacity must be supplied by the operator.
    public int? StandardVehicleCapacityStalls { get; set; }
    public int DefaultCrewCount { get; set; } = 2;
    public int DefaultDoctorCount { get; set; } = 1;
    public int DrivingHoursPerDay { get; set; } = 8;
    public decimal DemoRoadFactor { get; set; } = 1.3m;
    public decimal DemoAverageSpeedKmh { get; set; } = 60;
    public List<DemoCity> DemoCities { get; set; } = [];
}
public sealed record DemoCity(string Name, string Country, double Lat, double Lng);

public static class Flow1PricingPolicy
{
    public const string Version = "COST-RATE-2026-10-20";
    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(
        TimeZoneInfo.ConvertTime(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")).DateTime);

    public static EstimateCalculation Calculate(EstimateInput input, int? capacity, RoadRouteResult? road, TimeProvider clock,
        IReadOnlyList<Domain.Flow1.FlowCostRate> rates, Flow1EstimateOptions options)
    {
        Route(input);
        if (input.HorseCount is < 1 or > 100) throw Error("Horse count must be 1–100.", "VALIDATION_ERROR");
        var air = input.PreferredTransportMode == "AIR";
        if (!air && capacity is not (> 0 and <= 100))
            throw new BusinessRuleException("Configure the verified standard vehicle stall capacity.", 503, "FLEET_CAPACITY_NOT_CONFIGURED");
        if (!air && (road is null || road.DistanceMeters <= 0 || road.DurationSeconds <= 0))
            throw Error("No verified road route is available.", "ROUTE_NOT_FOUND");
        var vehicles = air ? 0 : (input.HorseCount + capacity!.Value - 1) / capacity.Value;
        decimal? km = air ? null : road!.DistanceMeters / 1000m;
        var lead = air ? 7 : km <= 500 ? 2 : 3;
        var earliest = Today(clock).AddDays(lead);
        if (input.DesiredDepartureDate < earliest || input.DesiredDepartureDate > Today(clock).AddYears(2))
            throw Error($"Departure must be between {earliest:yyyy-MM-dd} and two years from today in Vietnam.", "INVALID_DEPARTURE_DATE");
        if (options.DrivingHoursPerDay is < 1 or > 24) throw Error("Configure driving hours per day.", "COST_ASSUMPTIONS_INVALID", 503);
        var days = air ? 1 : Math.Max(1, (int)Math.Ceiling(road!.DurationSeconds / (options.DrivingHoursPerDay * 3600m)));
        var plan = Flow1CostCalculator.Calculate(rates, input.PreferredTransportMode, input.HorseCount, days, days - 1,
            vehicles, options.DefaultCrewCount*Math.Max(1,vehicles), options.DefaultDoctorCount, km ?? 0, input.InsuredValueVnd);
        var cost = plan.Costs.Total;
        var price = cost;
        if (price > 9_999_999_999m) throw Error("Estimate exceeds the supported VND limit.", "AMOUNT_OUT_OF_RANGE");
        return new(new(Version, "VND", price, Round(price * .40m), input.HorseCount, vehicles,
            input.HorseCount, km, lead, earliest,
            air ? "AIRPORT_TO_AIRPORT_ONLY_GROUND_LEGS_NOT_INCLUDED" : "ROAD_PICKUP_TO_DELIVERY",
            air ? null : road!.Provider, clock.GetUtcNow(), air ? null : road!.Attribution,
            DemoTransportCost:price, MinimumInsuranceAssumed:plan.MinimumInsuranceAssumed), cost, cost, road, plan);
    }

    public static void Route(EstimateInput input)
    {
        if (input.Pickup is null || input.Delivery is null) throw Error("Pickup and delivery are required.", "VALIDATION_ERROR");
        if (input.Pickup.Country != "VN" || input.Delivery.Country is not ("VN" or "JP"))
            throw Error("Only VN to VN and VN to JP are supported.", "UNSUPPORTED_ROUTE");
        if (input.PreferredTransportMode != (input.Delivery.Country == "JP" ? "AIR" : "ROAD"))
            throw Error("Transport mode does not match this route.", "UNSUPPORTED_TRANSPORT_MODE");
        foreach (var p in new[] { input.Pickup, input.Delivery })
            if (string.IsNullOrWhiteSpace(p.Address) || p.Address.Length > 255 || !double.IsFinite(p.Lat) ||
                !double.IsFinite(p.Lng) || p.Lat is < -90 or > 90 || p.Lng is < -180 or > 180)
                throw Error("Invalid address or coordinates.", "INVALID_LOCATION");
        if (input.Pickup.Lat == input.Delivery.Lat && input.Pickup.Lng == input.Delivery.Lng)
            throw Error("Pickup and delivery must be different.", "INVALID_LOCATION");
    }
    public static decimal Round(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
    public static BusinessRuleException Error(string message, string code, int status = 400) => new(message, status, code);
}
