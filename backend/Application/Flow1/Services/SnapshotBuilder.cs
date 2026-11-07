using System.Globalization;
using System.Text.Json;
using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class SnapshotBuilder(IDataSession data, Flow1ContractOptions options, PolicyService policies)
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
        var preparation = await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", request.DestinationCountry, input.Mode, 0, null, true, ct);
        var hours = await policies.NumberAsync("CONTRACT_DEADLINE_HOURS", "HOUR", request.DestinationCountry, input.Mode, 1, null, false, ct);
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
            route = new { originCountry = request.OriginCountry, destinationCountry = request.DestinationCountry, mode = input.Mode,
                departureAtUtc = Timestamp(input.DepartAt), deliveryAtUtc = Timestamp(input.ArriveAt), preparationDays = preparation },
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
}
