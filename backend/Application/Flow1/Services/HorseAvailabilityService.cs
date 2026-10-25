using System.Globalization;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class HorseAvailabilityService(IDataSession data, AccessService access)
{
    public async Task<object> SelectAsync(string actor, string date, string? exclude, CancellationToken ct)
    {
        await access.AccountAsync(actor, Domain.Enums.UserRoles.Customer, ct);
        Require(DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var when), "VALIDATION_ERROR", "Invalid date.", 400);
        if (exclude is not null) await access.RequestAsync(exclude, actor, false, ct);
        var horses = await data.ListAsync<Horse>(h => h.OwnerID == actor, ct);
        var ids = horses.Select(h => h.HorseID).ToArray();
        var links = await data.ListAsync<RequestHorse>(h => ids.Contains(h.HorseID) && h.RequestID != exclude, ct);
        var requestIds = links.Select(h => h.RequestID).ToArray();
        var requests = await data.ListAsync<TransportRequest>(q => requestIds.Contains(q.RequestID) && q.Status != "DRAFT" && q.Status != "CHANGES_REQUESTED"
            && q.Status != "CLOSED" && q.Status != "CANCELLED" && q.Status != "REJECTED" && q.ExpectedDate <= when && (q.CommittedDeadline ?? q.ExpectedDate) >= when, ct);
        var busy = links.Where(l => requests.Any(q => q.RequestID == l.RequestID)).Select(l => l.HorseID).ToHashSet();
        return horses.Select(h => new { id = h.HorseID, name = h.Name, horse = HorseMapper.View(h), selectable = !busy.Contains(h.HorseID),
            conflict = busy.Contains(h.HorseID) ? new { code = "HORSE_SCHEDULE_CONFLICT" } : null,
            documentWarnings = new[] { h.PhotoUrl is null ? "PHOTO_MISSING" : null, h.PassportScanUrl is null ? "PASSPORT_MISSING" : null,
                h.OwnershipCertificateFileUrl is null ? "OWNERSHIP_MISSING" : null,
                h.PassportExpiryDate is null || h.PassportExpiryDate <= when ? "PASSPORT_EXPIRED_OR_MISSING" : null,
                h.DeclaredValueVnd is null or <= 0 ? "VALUE_MISSING" : null }.Where(x => x is not null).ToArray() }).ToArray();
    }
}
