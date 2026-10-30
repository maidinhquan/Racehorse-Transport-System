using System.Globalization;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class HorseAvailabilityService(IDataSession data, AccessService access)
{
    public async Task<object> SelectAsync(string actor, string expectedTransportDate, string expectedDeliveryDate, CancellationToken ct, string? excludeRequestId = null)
    {
        await access.AccountAsync(actor, Domain.Enums.UserRoles.Customer, ct);
        Require(DateTime.TryParseExact(expectedTransportDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var when), "VALIDATION_ERROR", "Invalid date.", 400);
        Require(DateTime.TryParseExact(expectedDeliveryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end) && end >= when, "VALIDATION_ERROR", "expectedDeliveryDate must be yyyy-MM-dd and on or after expectedTransportDate.", 400);
        var horses = await data.ListAsync<Horse>(h => h.OwnerID == actor, ct);
        var ids = horses.Select(h => h.HorseID).ToArray();
        if (!string.IsNullOrWhiteSpace(excludeRequestId))
            await access.RequestAsync(excludeRequestId, actor, false, ct);
        var states = await HorseBookingRules.CheckAsync(data, ids, excludeRequestId, ct);
        return horses.Select(h => new { id = h.HorseID, name = h.Name, horse = HorseMapper.View(h), selectable = states[h.HorseID].ConflictCode is null,
            availabilityStatus = states[h.HorseID].Status,
            conflict = states[h.HorseID].ConflictCode is { } code ? new { code } : null,
            documentWarnings = new[] { h.PhotoUrl is null ? "PHOTO_MISSING" : null, h.PassportScanUrl is null ? "PASSPORT_MISSING" : null,
                h.OwnershipCertificateFileUrl is null ? "OWNERSHIP_MISSING" : null,
                h.PassportExpiryDate is null || h.PassportExpiryDate <= end ? "PASSPORT_EXPIRED_OR_MISSING" : null,
                h.DeclaredValueVnd is null or <= 0 ? "VALUE_MISSING" : null }.Where(x => x is not null).ToArray() }).ToArray();
    }
}
