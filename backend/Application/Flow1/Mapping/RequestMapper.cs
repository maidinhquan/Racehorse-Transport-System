using Domain.Flow1.Entities;

namespace Application.Flow1.Mapping;

public static class RequestMapper
{
    public static object View(TransportRequest request, IReadOnlyList<RequestHorse> horses, Contract? contract = null, IReadOnlyList<ContractVersion>? versions = null) =>
        new
        {
            createdAt = request.CreatedAtUtc is DateTime created
                ? DateTime.SpecifyKind(created, DateTimeKind.Utc)
                : (DateTime?)null,
            id = request.RequestID,
            customerId = request.CustomerID,
            origin = request.Departure,
            destination = request.Destination,
            originCountry = request.OriginCountry,
            destinationCountry = request.DestinationCountry,
            purpose = request.Purpose,
            mode = request.TransportType,
            expectedTransportDate = request.ExpectedDate?.ToString("yyyy-MM-dd"),
            expectedDeliveryDate = request.CommittedDeadline?.ToString("yyyy-MM-dd"),
            status = request.Status,
            horseCount = horses.Count,
            horses = horses.Select(x => x.HorseID).ToArray(),
            horseNotes = horses.ToDictionary(x => x.HorseID, x => x.CareInstructions ?? ""),
            careInstructions = request.CareInstructions,
            preparationDays = request.PreparationDays,
            contractId = contract?.ContractID,
            versions = versions is not null && versions.Count > 0
                ? (object)versions.Select(v => ContractMapper.View(contract!, v, request)).ToArray()
                : (contract?.TotalQuotedPrice is not null
                    ? new object[]
                    {
                        new
                        {
                            contractId = contract.ContractID,
                            requestId = contract.RequestID,
                            versionNo = contract.CurrentVersionNo ?? 1,
                            requestStatus = request.Status,
                            contractStatus = contract.ContractStatus,
                            versionStatus = contract.SignedAt is not null ? "SIGNED" : "ISSUED",
                            issuedAt = contract.PublishedAtUtc?.ToString("yyyy-MM-dd HH:mm"),
                            signedAt = contract.SignedAt?.ToString("yyyy-MM-dd HH:mm"),
                            termsAcceptedAt = (string?)null,
                            currentDeadline = contract.CompletionDeadline?.ToString("yyyy-MM-dd HH:mm"),
                            currency = "VND",
                            total = (object?)contract.TotalQuotedPrice,
                            depositPct = (object?)(contract.DepositRateStandard ?? 40m),
                            depositAmount = (object?)contract.DepositAmount,
                            note = contract.CommercialNotes,
                            mode = request.TransportType,
                            items = Array.Empty<object>(),
                            terms = Array.Empty<object>(),
                            pdfUrl = (string?)null
                        }
                    }
                    : Array.Empty<object>()),
            refund = RefundMapper.View(contract),
            pickup = new
            {
                cityId = request.PickupCityId,
                cityName = request.PickupCityName,
                name = request.PickupStableName,
                address = request.Departure,
                postal = request.PickupPostalCode,
                contact = request.PickupContactName,
                phone = request.PickupContactPhone,
                notes = request.PickupInstructions,
                latitude = request.PickupLatitude,
                longitude = request.PickupLongitude,
            },
            delivery = new
            {
                cityId = request.DeliveryCityId,
                cityName = request.DeliveryCityName,
                name = request.DeliveryStableName,
                address = request.Destination,
                postal = request.DeliveryPostalCode,
                contact = request.DesignatedReceiverName,
                phone = request.DesignatedReceiverPhone,
                notes = request.DeliveryInstructions,
                latitude = request.DeliveryLatitude,
                longitude = request.DeliveryLongitude,
            },
            revisionFeedback = request.RevisionFeedback,
            rejectionReason = request.Status == "REJECTED" ? request.ManagerNotes : null,
            cancellation = request.CancellationReason is null
                ? request.Status == "CANCELLED" && request.ManagerNotes is not null
                    ? new { reason = request.ManagerNotes, requestedAt = (DateTime?)null, previousStatus = (string?)null }
                    : null
                : new
                {
                    reason = request.CancellationReason,
                    requestedAt = request.CancellationRequestedAtUtc,
                    previousStatus = request.CancellationPreviousStatus,
                },
        };
}
