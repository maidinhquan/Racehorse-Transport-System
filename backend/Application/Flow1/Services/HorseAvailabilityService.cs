using System.Globalization;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed class HorseAvailabilityService(IDataSession data, AccessService access)
{
    public async Task<object> SelectAsync(
        string actor,
        string expectedTransportDate,
        string expectedDeliveryDate,
        CancellationToken ct
    )
    {
        await access.AccountAsync(actor, Domain.Enums.UserRoles.Customer, ct);
        Require(
            DateTime.TryParseExact(
                expectedTransportDate,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var when
            ),
            "VALIDATION_ERROR",
            "Invalid date.",
            400
        );
        Require(
            DateTime.TryParseExact(
                expectedDeliveryDate,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var end
            )
                && end >= when,
            "VALIDATION_ERROR",
            "expectedDeliveryDate must be yyyy-MM-dd and on or after expectedTransportDate.",
            400
        );
        var horses = await data.ListAsync<Horse>(h => h.OwnerID == actor, ct);
        var ids = horses.Select(h => h.HorseID).ToArray();
        var links = await data.ListAsync<RequestHorse>(h => ids.Contains(h.HorseID), ct);
        var requestIds = links.Select(h => h.RequestID).ToArray();
        var requests = await data.ListAsync<TransportRequest>(
            q =>
                requestIds.Contains(q.RequestID)
                && q.Status != "DRAFT"
                && q.Status != "CHANGES_REQUESTED"
                && q.Status != "CLOSED"
                && q.Status != "CANCELLED"
                && q.Status != "REJECTED"
                && q.ExpectedDate != null
                && q.ExpectedDate.Value.Date <= end
                && (q.CommittedDeadline ?? q.ExpectedDate)!.Value.Date >= when,
            ct
        );
        var busy = links
            .Where(l => requests.Any(q => q.RequestID == l.RequestID))
            .Select(l => l.HorseID)
            .ToHashSet();
        return horses
            .Select(h => new
            {
                id = h.HorseID,
                name = h.Name,
                horse = HorseMapper.View(h),
                selectable = !busy.Contains(h.HorseID),
                conflict = busy.Contains(h.HorseID)
                    ? new { code = "HORSE_SCHEDULE_CONFLICT" }
                    : null,
                documentWarnings = new[]
                {
                    h.PhotoUrl is null ? "PHOTO_MISSING" : null,
                    h.PassportScanUrl is null ? "PASSPORT_MISSING" : null,
                    h.OwnershipCertificateFileUrl is null ? "OWNERSHIP_MISSING" : null,
                    h.PassportExpiryDate is null || h.PassportExpiryDate <= end
                        ? "PASSPORT_EXPIRED_OR_MISSING"
                        : null,
                    h.DeclaredValueVnd is null or <= 0 ? "VALUE_MISSING" : null,
                }
                    .Where(x => x is not null)
                    .ToArray(),
            })
            .ToArray();
    }
}
