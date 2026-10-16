using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;

namespace Application.Services.Flow1;

public sealed class TransportEstimateService(IFlow1RoadRoutingProvider routing, IFlow1LocationVerifier locations,
    Flow1EstimateOptions options, TimeProvider clock)
{
    public async Task<EstimateCalculation> CalculateAsync(EstimateInput input, CancellationToken ct)
    {
        Flow1PricingPolicy.Route(input);
        var from = new MapPoint(input.Pickup.Lng, input.Pickup.Lat, input.Pickup.Country);
        var to = new MapPoint(input.Delivery.Lng, input.Delivery.Lat, input.Delivery.Country);
        // Country claims from the client never decide route eligibility on their own.
        await locations.VerifyAsync(from, ct);
        await locations.VerifyAsync(to, ct);
        var road = input.PreferredTransportMode == "ROAD" ? await routing.CalculateAsync(new([from, to]), ct) : null;
        var result = Flow1PricingPolicy.Calculate(input, options.StandardVehicleCapacityStalls, road, clock);
        return result with { Customer = result.Customer with { LocationAttribution = locations.Attribution } };
    }
}
