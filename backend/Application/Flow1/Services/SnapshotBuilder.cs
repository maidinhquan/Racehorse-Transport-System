using System.Globalization;
using System.Text.Json;
using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class SnapshotBuilder(IDataSession data, Flow1ContractOptions options, CatalogService catalogs)
{
    public static DateTime Timestamp(string input)
    {
        Require(DateTime.TryParseExact(input, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var result),
            "VALIDATION_ERROR", "Use yyyy-MM-dd HH:mm in UTC.", 400);
        return DateTime.SpecifyKind(result, DateTimeKind.Utc);
    }
    public async Task<string> BuildAsync(Contract contract, int version, TransportRequest request, ContractDraftInput input, CancellationToken ct)
    {
        var customer = await data.FindAsync<Account>(ct, contract.CustomerID) ?? throw Failure("NOT_FOUND", "Customer not found.", 404);
        var links = await data.ListAsync<RequestHorse>(h => h.RequestID == request.RequestID, ct);
        var ids = links.Select(h => h.HorseID).ToArray();
        var horses = await data.ListAsync<Horse>(h => ids.Contains(h.HorseID), ct);
        var defaults = JsonSerializer.SerializeToElement(await catalogs.ContractOptionsAsync(request.OriginCountry!, request.DestinationCountry!, ct));
        var preparation = defaults.GetProperty("preparationDays").GetDecimal();
        var hours = defaults.GetProperty("contractDeadlineHours").GetDecimal();
        // Dates the customer originally asked for. Publication overwrites the request dates with the contract's,
        // so later versions carry the original values forward from the earliest version that recorded them.
        var (requestedTransport, requestedDelivery) = await RequestedDatesAsync(contract, version, request, ct);
        // Only these explicitly selected public fields can become part of a customer contract.
        var snapshot = new
        {
            contractId = contract.ContractID, versionNo = version, requestId = request.RequestID,
            issuedAtUtc = (DateTime?)null,
            parties = new { provider = options.Issuer, customer = new { id = customer.UserID, name = customer.FullName, customer.Email, customer.Phone } },
            pickup = new { cityId = request.PickupCityId, cityName = request.PickupCityName,
                name = request.PickupStableName, address = request.Departure, contact = request.PickupContactName, phone = request.PickupContactPhone,
                postal = request.PickupPostalCode, instructions = request.PickupInstructions, latitude = request.PickupLatitude, longitude = request.PickupLongitude },
            delivery = new { cityId = request.DeliveryCityId, cityName = request.DeliveryCityName,
                name = request.DeliveryStableName, address = request.Destination, contact = request.DesignatedReceiverName, phone = request.DesignatedReceiverPhone,
                postal = request.DeliveryPostalCode, instructions = request.DeliveryInstructions, latitude = request.DeliveryLatitude, longitude = request.DeliveryLongitude },
            route = new { originCountry = request.OriginCountry, destinationCountry = request.DestinationCountry, mode = (string?)null,
                transportModeDecision = "FLOW3",
                departureAtUtc = Timestamp(input.DepartAt), deliveryAtUtc = Timestamp(input.ArriveAt), preparationDays = preparation,
                requestedTransportDate = requestedTransport, requestedDeliveryDate = requestedDelivery },
            horses = horses.Select(h => new { id = h.HorseID, name = h.Name, h.Microchip_ISO, h.FEI_Passport_No, h.Breed, h.Sex, h.DOB, h.Weight,
                h.PassportIssuedBy, h.PassportIssuedDate, h.PassportExpiryDate, h.DeclaredValueVnd, healthNotes = h.SpecialHealthNotes,
                careInstructions = links.Single(l => l.HorseID == h.HorseID).CareInstructions }).ToArray(),
            careInstructions = request.CareInstructions,
            commercial = new { currency = "VND", items = input.Items, totalPrice = input.Items.Sum(x => x.Amount), depositPercent = input.DepositPct,
                depositAmount = decimal.Round(input.Items.Sum(x => x.Amount) * input.DepositPct / 100m, 0, MidpointRounding.AwayFromZero),
                remainingAmount = input.Items.Sum(x => x.Amount) - decimal.Round(input.Items.Sum(x => x.Amount) * input.DepositPct / 100m, 0, MidpointRounding.AwayFromZero),
                taxAndFees = "Included only as specified in the commercial items and terms", notes = input.Note },
            terms = input.Terms, appliedPolicies = new { minPreparationDays = preparation, contractDeadlineHours = hours },
            paymentObligations = new { depositRequiredBeforeSignature = true, channel = "VNPAY", completionDeadlineUtc = (DateTime?)null }
        };
        return JsonSerializer.Serialize(snapshot, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
    private async Task<(string? Transport, string? Delivery)> RequestedDatesAsync(Contract contract, int version, TransportRequest request, CancellationToken ct)
    {
        foreach (var earlier in (await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID && v.VersionNo < version, ct)).OrderBy(v => v.VersionNo))
        {
            try
            {
                using var doc = JsonDocument.Parse(earlier.ContentSnapshot);
                if (doc.RootElement.TryGetProperty("route", out var route) && route.ValueKind == JsonValueKind.Object
                    && route.TryGetProperty("requestedTransportDate", out var t) && t.ValueKind == JsonValueKind.String)
                    return (t.GetString(), route.TryGetProperty("requestedDeliveryDate", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null);
            }
            catch (JsonException) { /* legacy snapshot */ }
        }
        return (request.ExpectedDate?.ToString("yyyy-MM-dd"), request.CommittedDeadline?.ToString("yyyy-MM-dd"));
    }
}
