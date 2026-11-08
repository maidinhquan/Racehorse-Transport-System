using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;

namespace Application.Flow1.Services;

public sealed class RequestReviewResources(IDataSession data)
{
    public async Task<object> ReadAsync(TransportRequest request, int horseCount, CancellationToken ct)
    {
        var vehicles = await data.ListAsync<ReviewVehicle>(v => (v.Status == "READY" || v.Status == "AVAILABLE")
            && (v.OperatingCountry == request.OriginCountry || v.OperatingCountry == request.DestinationCountry)
            && v.CapacityStalls >= horseCount, ct);
        var flights = await data.ListAsync<ReviewFlight>(f => f.IsActive && f.CapacityHorses >= horseCount, ct);
        return new
        {
            vehicles = vehicles.OrderBy(v => v.OperatingCountry).ThenBy(v => v.VehicleID)
                .Select(v => new { id = v.VehicleID, v.Type, v.PlateNumber, v.OperatingCountry, v.CapacityStalls }).ToArray(),
            flights = flights.OrderBy(f => f.ProviderFlightCode).Select(f => new
            {
                id = f.ServiceID, f.ProviderFlightCode, f.Airline, originAirportPlaceId = f.OriginAirportPlaceId,
                destinationAirportPlaceId = f.DestAirportPlaceId, f.DepartureTime, f.ArrivalTime,
                departureDate = f.DepartureDate?.ToString("yyyy-MM-dd"),
                arrivalDate = f.ArrivalDate?.ToString("yyyy-MM-dd"),
                f.DepartureTimeZone, f.ArrivalTimeZone, f.CapacityHorses,
            }).ToArray(),
        };
    }
}
