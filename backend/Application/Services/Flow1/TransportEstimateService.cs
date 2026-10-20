using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;

namespace Application.Services.Flow1;

public sealed class TransportEstimateService(IFlow1RoadRoutingProvider routing, IFlow1LocationVerifier locations,
    Flow1EstimateOptions options, TimeProvider clock, IFlow1CostRates rates)
{
    public string? LocationAttribution=>locations.Attribution;
    public async Task<CostPlan> PlanAsync(string mode, int horses, decimal roadKm, int days, CostPlanningInput input, CancellationToken ct)
    {
        var duration = input.Days ?? days;
        var distance = input.RoadDistanceKm ?? roadKm;
        var vehicles = input.VehicleCount ?? (distance > 0 ? Vehicles(horses) : 0);
        return Flow1CostCalculator.Calculate(await rates.ReadAsync(ct), mode, horses, duration, input.StableNights ?? Math.Max(0,duration-1),
            vehicles, input.CrewCount ?? options.DefaultCrewCount*Math.Max(1,vehicles), input.DoctorCount ?? options.DefaultDoctorCount,
            distance, input.InsuredValueVnd);
    }
    private int Vehicles(int horses)
    {
        if (options.StandardVehicleCapacityStalls is not (>0 and <=100))
            throw Flow1PricingPolicy.Error("Configure standard vehicle capacity.", "FLEET_CAPACITY_NOT_CONFIGURED", 503);
        return (horses + options.StandardVehicleCapacityStalls.Value - 1) / options.StandardVehicleCapacityStalls.Value;
    }
    public async Task<DemoEstimateView> DemoAsync(DemoEstimateInput input, CancellationToken ct)
    {
        var from=options.DemoCities.SingleOrDefault(c=>c.Name.Equals(input.Origin,StringComparison.OrdinalIgnoreCase));
        var to=options.DemoCities.SingleOrDefault(c=>c.Name.Equals(input.Destination,StringComparison.OrdinalIgnoreCase));
        if(from is null || to is null || from==to || from.Country!="VN" || to.Country is not ("VN" or "JP") || input.HorseCount is <1 or >100)
            throw Flow1PricingPolicy.Error("Choose distinct configured cities and 1–100 horses.","VALIDATION_ERROR");
        if(options.DemoAverageSpeedKmh<=0 || options.DemoRoadFactor<1 || options.DrivingHoursPerDay is <1 or >24)
            throw Flow1PricingPolicy.Error("Configure average route assumptions.","COST_ASSUMPTIONS_INVALID",503);
        var air=to.Country=="JP";
        double Rad(double x)=>x*Math.PI/180;
        var h=Math.Pow(Math.Sin(Rad(to.Lat-from.Lat)/2),2)+Math.Cos(Rad(from.Lat))*Math.Cos(Rad(to.Lat))*Math.Pow(Math.Sin(Rad(to.Lng-from.Lng)/2),2);
        var km=air?0:decimal.Round((decimal)(6371*2*Math.Asin(Math.Sqrt(Math.Clamp(h,0,1))))*options.DemoRoadFactor,2);
        var days=air?1:Math.Max(1,(int)Math.Ceiling(km/options.DemoAverageSpeedKmh/options.DrivingHoursPerDay));
        var plan=await PlanAsync(air?"AIR":"ROAD",input.HorseCount,km,days,new(),ct);
        return new(plan.Costs.Total,Flow1PricingPolicy.Round(plan.Costs.Total*.4m),"VND",input.HorseCount,km,days,plan.StableNights,plan.MinimumInsuranceAssumed,
            air?"NON_BINDING_AIRPORT_TO_AIRPORT_NO_GROUND_LEGS":"NON_BINDING_CITY_CENTRES_STRAIGHT_LINE_WITH_ROAD_FACTOR");
    }
    public async Task<EstimateCalculation> CalculateAsync(EstimateInput input, CancellationToken ct)
    {
        Flow1PricingPolicy.Route(input);
        var from = new MapPoint(input.Pickup.Lng, input.Pickup.Lat, input.Pickup.Country);
        var to = new MapPoint(input.Delivery.Lng, input.Delivery.Lat, input.Delivery.Country);
        // Country claims from the client never decide route eligibility on their own.
        await locations.VerifyAsync(from, ct);
        await locations.VerifyAsync(to, ct);
        var road = input.PreferredTransportMode == "ROAD" ? await routing.CalculateAsync(new([from, to]), ct) : null;
        var result = Flow1PricingPolicy.Calculate(input, options.StandardVehicleCapacityStalls, road, clock, await rates.ReadAsync(ct), options);
        return result with { Customer = result.Customer with { LocationAttribution = locations.Attribution } };
    }
}
