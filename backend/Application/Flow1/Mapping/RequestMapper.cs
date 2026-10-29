using Domain.Flow1.Entities;
namespace Application.Flow1.Mapping;
public static class RequestMapper
{
    public static object View(TransportRequest request, IReadOnlyList<RequestHorse> horses) => new
    {
        createdAt = request.CreatedAtUtc is DateTime created ? DateTime.SpecifyKind(created, DateTimeKind.Utc) : (DateTime?)null,
        id = request.RequestID, customerId = request.CustomerID, origin = request.Departure,
        destination = request.Destination, originCountry = request.OriginCountry, destinationCountry = request.DestinationCountry,
        purpose = request.Purpose, mode = request.TransportType, expectedTransportDate = request.ExpectedDate?.ToString("yyyy-MM-dd"), expectedDeliveryDate = request.CommittedDeadline?.ToString("yyyy-MM-dd"), status = request.Status,
        horseCount = horses.Count, horses = horses.Select(x => x.HorseID).ToArray(),
        horseNotes = horses.ToDictionary(x => x.HorseID, x => x.CareInstructions ?? ""),
        careInstructions = request.CareInstructions, preparationDays = request.PreparationDays,
        pickup = new { cityId = request.PickupCityId, cityName = request.PickupCityName,
            name = request.PickupStableName, address = request.Departure, postal = request.PickupPostalCode,
            contact = request.PickupContactName, phone = request.PickupContactPhone, notes = request.PickupInstructions,
            latitude = request.PickupLatitude, longitude = request.PickupLongitude },
        delivery = new { cityId = request.DeliveryCityId, cityName = request.DeliveryCityName,
            name = request.DeliveryStableName, address = request.Destination, postal = request.DeliveryPostalCode,
            contact = request.DesignatedReceiverName, phone = request.DesignatedReceiverPhone, notes = request.DeliveryInstructions,
            latitude = request.DeliveryLatitude, longitude = request.DeliveryLongitude },
        revisionFeedback = request.RevisionFeedback,
        // Manager's reason is stored in ManagerNotes when a request is rejected.
        rejectionReason = request.Status == "REJECTED" ? request.ManagerNotes : null,
        cancellation = request.CancellationReason is null ? null : new { reason = request.CancellationReason,
            requestedAt = request.CancellationRequestedAtUtc, previousStatus = request.CancellationPreviousStatus }
    };
}
