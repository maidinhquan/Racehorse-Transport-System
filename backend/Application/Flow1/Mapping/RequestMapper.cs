using Domain.Flow1.Entities;
namespace Application.Flow1.Mapping;
public static class RequestMapper
{
    public static object View(TransportRequest request, IReadOnlyList<RequestHorse> horses) => new
    {
        requestedAt = (DateTime?)null, submittedAt = (DateTime?)null,
        unsupportedFields = new[] { "requestedAt", "submittedAt" },
        id = request.RequestID, customerId = request.CustomerID, origin = request.Departure,
        destination = request.Destination, originCountry = request.OriginCountry, destinationCountry = request.DestinationCountry,
        mode = request.TransportType, date = request.ExpectedDate?.ToString("yyyy-MM-dd"), status = request.Status,
        horseCount = horses.Count, horses = horses.Select(x => x.HorseID).ToArray(),
        horseNotes = horses.ToDictionary(x => x.HorseID, x => x.CareInstructions ?? ""),
        careInstructions = request.CareInstructions, preparationDays = request.PreparationDays,
        pickup = new { name = request.PickupStableName, address = request.Departure, postal = request.PickupPostalCode,
            contact = request.PickupContactName, phone = request.PickupContactPhone, notes = request.PickupInstructions,
            latitude = request.PickupLatitude, longitude = request.PickupLongitude },
        delivery = new { name = request.DeliveryStableName, address = request.Destination, postal = request.DeliveryPostalCode,
            contact = request.DesignatedReceiverName, phone = request.DesignatedReceiverPhone, notes = request.DeliveryInstructions,
            latitude = request.DeliveryLatitude, longitude = request.DeliveryLongitude },
        revisionFeedback = request.RevisionFeedback,
        cancellation = request.CancellationReason is null ? null : new { reason = request.CancellationReason,
            requestedAt = request.CancellationRequestedAtUtc, previousStatus = request.CancellationPreviousStatus }
    };
}
