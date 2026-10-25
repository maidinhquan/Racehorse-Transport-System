using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestService(IDataSession data, AccessService access, CatalogService catalogs, PolicyService policies, TimeProvider clock, ILocationVerifier? locations = null)
{
    public async Task<object> DetailAsync(string actor, string id, bool manager, CancellationToken ct)
    {
        var row = await access.RequestAsync(id, actor, manager, ct);
        return RequestMapper.View(row, await data.ListAsync<RequestHorse>(x => x.RequestID == id, ct));
    }
    public async Task<IReadOnlyList<object>> ListAsync(string actor, bool manager, CancellationToken ct)
    {
        await access.AccountAsync(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, ct);
        var requests = await data.ListAsync<TransportRequest>(x => manager || x.CustomerID == actor, ct);
        var ids = requests.Select(x => x.RequestID).ToArray();
        var links = await data.ListAsync<RequestHorse>(x => ids.Contains(x.RequestID), ct);
        return requests.OrderByDescending(x => x.ExpectedDate).Select(x => RequestMapper.View(x, links.Where(l => l.RequestID == x.RequestID).ToArray())).ToArray();
    }
    public Task<object> CreateAsync(string actor, string key, RequestDraftInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, UserRoles.Customer, token);
        Require(Guid.TryParse(key, out _), "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be a UUID.", 400);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Guid.Parse(key).ToString("N")))).ToLowerInvariant();
        var prior = (await data.ListAsync<TransportRequest>(x => x.CustomerID == actor && x.SubmissionKeyHash == hash, token)).SingleOrDefault();
        if (prior is not null)
        {
            Require(prior.Departure == input.Origin && prior.Destination == input.Destination && prior.TransportType == input.Mode
                && prior.OriginCountry == input.OriginCountry && prior.DestinationCountry == input.DestinationCountry
                && prior.ExpectedDate?.ToString("yyyy-MM-dd") == input.Date && prior.CareInstructions == input.CareNotes,
                "IDEMPOTENCY_KEY_REUSED", "The same key was used with different request content.");
            return RequestMapper.View(prior, await data.ListAsync<RequestHorse>(x => x.RequestID == prior.RequestID, token));
        }
        var row = new TransportRequest { CustomerID = actor, Status = "DRAFT", SubmissionKeyHash = hash };
        await ApplyAsync(row, input, token); data.Add(row); await data.SaveAsync(token);
        return RequestMapper.View(row, []);
    }, ct);
    public async Task<object> UpdateAsync(string actor, string id, RequestUpdateInput input, CancellationToken ct)
    {
        await access.RequestAsync(id, actor, false, ct);
        Require(locations is not null, "MAPS_NOT_CONFIGURED", "A location verifier is required.", 503);
        foreach (var point in new[] { (Contact: input.Pickup, Country: input.OriginCountry), (Contact: input.Delivery, Country: input.DestinationCountry) })
            if (point.Contact.Latitude is decimal latitude && point.Contact.Longitude is decimal longitude)
                await locations!.VerifyAsync(new((double)longitude, (double)latitude, point.Country), ct);
        return await data.WriteAsync<object>(async token =>
    {
        var row = await access.RequestAsync(id, actor, false, token);
        Require(row.Status is "DRAFT" or "CHANGES_REQUESTED", "INVALID_STATE", "Request cannot be edited.");
        await ApplyAsync(row, new(input.Origin, input.Destination, input.OriginCountry, input.DestinationCountry, input.Mode, input.Date, input.CareNotes), token);
        Require(input.Horses.Count <= 6 && input.Horses.Distinct().Count() == input.Horses.Count, "VALIDATION_ERROR", "Select up to six distinct horses.", 400);
        ApplyContacts(row, input.Pickup, input.Delivery);
        foreach (var link in await data.ListAsync<RequestHorse>(x => x.RequestID == id, token)) data.Remove(link);
        await data.SaveAsync(token);
        var links = new List<RequestHorse>();
        foreach (var horseId in input.Horses)
        {
            await access.HorseAsync(horseId, actor, token);
            var link = new RequestHorse { RequestID = id, HorseID = horseId, CareInstructions = input.HorseNotes.GetValueOrDefault(horseId) };
            data.Add(link); links.Add(link);
        }
        return RequestMapper.View(row, links);
    }, ct);
    }
    public Task<object> SubmitAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var row = await access.RequestAsync(id, actor, false, token);
        if (row.Status == "PENDING_REVIEW") return await DetailAsync(actor, id, false, token);
        Require(row.Status is "DRAFT" or "CHANGES_REQUESTED", "INVALID_STATE", "Request is not open for submission.");
        await catalogs.ValidateAsync(row.OriginCountry!, row.DestinationCountry!, row.TransportType!, token);
        row.PreparationDays = (int)await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", row.DestinationCountry, row.TransportType, 0, int.MaxValue, true, token);
        Require(row.ExpectedDate is not null && row.PreparationDays is not null && row.ExpectedDate.Value.AddDays(-row.PreparationDays.Value) > clock.GetUtcNow().UtcDateTime,
            "VALIDATION_ERROR", "Departure is inside the preparation window.", 400);
        Require(!string.IsNullOrWhiteSpace(row.PickupContactName) && !string.IsNullOrWhiteSpace(row.PickupContactPhone)
            && !string.IsNullOrWhiteSpace(row.DesignatedReceiverName) && !string.IsNullOrWhiteSpace(row.DesignatedReceiverPhone)
            && row.PickupLatitude is not null && row.DeliveryLatitude is not null,
            "VALIDATION_ERROR", "Pickup and receiver contacts and verified locations are required.", 400);
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == id, token);
        Require(links.Count is > 0 and <= 6, "VALIDATION_ERROR", "Select between one and six horses.", 400);
        foreach (var link in links)
        {
            var horse = await access.HorseAsync(link.HorseID, actor, token);
            Require(horse.PhotoUrl is not null && horse.PassportScanUrl is not null && horse.OwnershipCertificateFileUrl is not null
                && horse.PassportExpiryDate > row.ExpectedDate && horse.DeclaredValueVnd > 0,
                "REQUIRED_DOCUMENT_MISSING", "Complete horse profile and ownership documents before submission.", 400);
            var otherLinks = await data.ListAsync<RequestHorse>(x => x.HorseID == horse.HorseID && x.RequestID != id, token);
            var otherIds = otherLinks.Select(x => x.RequestID).ToArray();
            Require(!(await data.ListAsync<TransportRequest>(x => otherIds.Contains(x.RequestID)
                && x.Status != "DRAFT" && x.Status != "CHANGES_REQUESTED" && x.Status != "REJECTED" && x.Status != "CANCELLED" && x.Status != "CLOSED"
                && x.ExpectedDate <= (row.CommittedDeadline ?? row.ExpectedDate) && (x.CommittedDeadline ?? x.ExpectedDate) >= row.ExpectedDate, token)).Any(),
                "HORSE_SCHEDULE_CONFLICT", "Horse already belongs to an overlapping request.");
        }
        row.Status = "PENDING_REVIEW";
        foreach (var manager in (await data.ListAsync<Account>(a => a.IsActive, token)).Where(a => UserRoles.NormalizeRole(a.Role) == UserRoles.LogisticsManager))
            data.Add(new Notification { UserID = manager.UserID, ReferenceID = id, Type = "REQUEST_SUBMITTED", Channel = "IN_APP",
                Title = "Request pending review", Message = $"Request {id} is ready for review.", SentAt = clock.GetUtcNow().UtcDateTime });
        return RequestMapper.View(row, links);
    }, ct);
    private async Task ApplyAsync(TransportRequest row, RequestDraftInput input, CancellationToken ct)
    {
        await catalogs.ValidateAsync(input.OriginCountry, input.DestinationCountry, input.Mode, ct);
        Require(DateTime.TryParseExact(input.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date), "VALIDATION_ERROR", "Invalid date.", 400);
        row.Departure = Required(input.Origin, 255); row.Destination = Required(input.Destination, 255);
        row.OriginCountry = input.OriginCountry; row.DestinationCountry = input.DestinationCountry;
        row.TransportType = input.Mode; row.ExpectedDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);
        row.CareInstructions = input.CareNotes;
        row.PreparationDays = (int)await policies.NumberAsync("MIN_PREPARATION_DAYS", "DAY", input.DestinationCountry, input.Mode, 0, null, true, ct);
    }
    private static void ApplyContacts(TransportRequest row, ContactInput pickup, ContactInput delivery)
    {
        foreach (var contact in new[] { pickup, delivery }) Require(contact.Latitude.HasValue == contact.Longitude.HasValue
            && (contact.Latitude is null || contact.Latitude is >= -90 and <= 90 && contact.Longitude is >= -180 and <= 180),
            "VALIDATION_ERROR", "Invalid location coordinates.", 400);
        Required(pickup.Address, 255); Required(delivery.Address, 255);
        row.Departure = pickup.Address; row.PickupStableName = pickup.Name; row.PickupContactName = pickup.Contact;
        row.PickupContactPhone = pickup.Phone; row.PickupPostalCode = pickup.Postal; row.PickupInstructions = pickup.Notes;
        row.PickupLatitude = pickup.Latitude; row.PickupLongitude = pickup.Longitude;
        row.Destination = delivery.Address; row.DeliveryStableName = delivery.Name; row.DesignatedReceiverName = delivery.Contact;
        row.DesignatedReceiverPhone = delivery.Phone; row.DeliveryPostalCode = delivery.Postal; row.DeliveryInstructions = delivery.Notes;
        row.DeliveryLatitude = delivery.Latitude; row.DeliveryLongitude = delivery.Longitude;
    }
}
