using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;

namespace Application.Common.Flow1;

public sealed class Flow1EstimateOptions
{
    // Deliberately unset: actual fleet capacity must be supplied by the operator.
    public int? StandardVehicleCapacityStalls { get; set; }
}

public static class Flow1PricingPolicy
{
    public const decimal RoadRatePerKm = 35_000m;
    public const decimal AirRatePerHorse = 70_000_000m;
    // Transport-only demo; excludes the ancillary costs/margin in the full estimate.
    // MVP fleet capacity is one horse per vehicle, as agreed by the operator.
    public static decimal? DemoTransportPrice(string? mode, decimal? km, int horses) => horses <= 0 ? null :
        mode == "AIR" ? Round(AirRatePerHorse * horses) :
        mode == "ROAD" && km > 0 ? Round(decimal.Round(km.Value,2) * RoadRatePerKm * horses) : null;
    public const string Version = "MVP-2026-10-16";
    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(
        TimeZoneInfo.ConvertTime(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh")).DateTime);

    public static EstimateCalculation Calculate(EstimateInput input, int? capacity, RoadRouteResult? road, TimeProvider clock)
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
        var transport = Round(air ? input.HorseCount * AirRatePerHorse : km!.Value * RoadRatePerKm * vehicles);
        var cost = transport + 15_000_000m + 10_000_000m + input.HorseCount * 5_000_000m;
        var price = Round(cost * 1.20m);
        if (price > 9_999_999_999m) throw Error("Estimate exceeds the supported VND limit.", "AMOUNT_OUT_OF_RANGE");
        return new(new(Version, "VND", price, Round(price * .40m), input.HorseCount, vehicles,
            input.HorseCount, km, lead, earliest,
            air ? "AIRPORT_TO_AIRPORT_ONLY_GROUND_LEGS_NOT_INCLUDED" : "ROAD_PICKUP_TO_DELIVERY",
            air ? null : road!.Provider, clock.GetUtcNow(), air ? null : road!.Attribution,
            DemoTransportCost:DemoTransportPrice(input.PreferredTransportMode,km,input.HorseCount)), cost, Round(cost * 1.05m), road);
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
