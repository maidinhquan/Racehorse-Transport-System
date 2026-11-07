using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Settings;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class CostService(IDataSession data, AccessService access, CatalogService catalogs, IRoadRouter router, CostSettings options)
{
    public async Task<object> CalculateAsync(string actor, string id, CostInput input, CancellationToken ct)
    {
        var request = await access.RequestAsync(id, actor, true, ct);
        await catalogs.ValidateAsync(request.OriginCountry!, request.DestinationCountry!, input.TransportMode, ct);
        var departure = SnapshotBuilder.Timestamp(input.DepartureAt); var delivery = SnapshotBuilder.Timestamp(input.DeliveryAt);
        Require(delivery > departure, "VALIDATION_ERROR", "Delivery must follow departure.", 400);
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == id, ct);
        var horseIds = links.Select(x => x.HorseID).ToArray(); var horses = await data.ListAsync<Horse>(h => horseIds.Contains(h.HorseID), ct);
        var days = Math.Max(1, (int)Math.Ceiling((delivery-departure).TotalDays));
        decimal distance = 0;
        if (input.TransportMode == "ROAD")
        {
            Require(request.PickupLatitude is not null && request.PickupLongitude is not null && request.DeliveryLatitude is not null && request.DeliveryLongitude is not null,
                "VALIDATION_ERROR", "Verified pickup and delivery coordinates are required.", 400);
            var route = await router.CalculateAsync(new([new((double)request.PickupLongitude!.Value, (double)request.PickupLatitude!.Value, request.OriginCountry!),
                new((double)request.DeliveryLongitude!.Value, (double)request.DeliveryLatitude!.Value, request.DestinationCountry!)]), ct);
            distance = route.DistanceMeters / 1000m;
        }
        Require(options.StandardVehicleCapacityStalls is > 0 && options.DefaultCrewCount > 0 && options.DefaultDoctorCount > 0,
            "COST_ASSUMPTIONS_NOT_CONFIGURED", "Configure planning capacity and staffing assumptions.", 503);
        var vehicles = distance > 0 ? (int)Math.Ceiling((decimal)horses.Count/options.StandardVehicleCapacityStalls!.Value) : 0;
        var rates = (await data.ListAsync<CostRate>(c => c.IsActive, ct)).Select(c => new Domain.Flow1.FlowCostRate
        { CostRateID = c.CostRateID, Code = c.Code, CostGroup = c.CostGroup, CalculationUnit = c.CalculationUnit, CurrencyCode = c.CurrencyCode, Rate = c.Rate, IsActive = true }).ToArray();
        var plan = Flow1CostCalculator.Calculate(rates, input.TransportMode, horses.Count, days, Math.Max(0,days-1), vehicles,
            Math.Max(1,vehicles)*options.DefaultCrewCount!.Value, options.DefaultDoctorCount!.Value, distance, horses.All(h => h.DeclaredValueVnd > 0) ? horses.Sum(h => h.DeclaredValueVnd) : null);
        return new { costs = plan.Costs, currency = "VND", days = plan.Days, stableNights = plan.StableNights,
            crewCount = plan.CrewCount, doctorCount = plan.DoctorCount, vehicleCount = plan.VehicleCount,
            roadDistanceKm = plan.RoadDistanceKm, insuredValueVnd = plan.InsuredValueVnd,
            minimumInsuranceAssumed = plan.MinimumInsuranceAssumed };
    }
}
