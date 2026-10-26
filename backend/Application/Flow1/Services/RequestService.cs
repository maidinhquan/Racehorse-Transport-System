using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.Flow1.Dtos;
using UploadedFile = Application.DTOs.Flow1.UploadedFile;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestService(IDataSession data, AccessService access, CatalogService catalogs, PolicyService policies,
    TimeProvider clock, IPrivateFiles files, ILocationVerifier? locations = null)
{
    public async Task<object> DetailAsync(string actor, string id, bool manager, CancellationToken ct)
    {
        var row = await access.RequestAsync(id, actor, manager, ct);
        return RequestMapper.View(row, await data.ListAsync<RequestHorse>(x => x.RequestID == id, ct));
    }
    public async Task<IReadOnlyList<object>> ListAsync(string actor, bool manager, CancellationToken ct)
    {
        await access.AccountAsync(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, ct);
        var requests = await data.ListAsync<TransportRequest>(x => (manager && x.Status != "DRAFT") || (!manager && x.CustomerID == actor), ct);
        var ids = requests.Select(x => x.RequestID).ToArray();
        var links = await data.ListAsync<RequestHorse>(x => ids.Contains(x.RequestID), ct);
        return requests.OrderByDescending(x => x.ExpectedDate).Select(x => RequestMapper.View(x, links.Where(l => l.RequestID == x.RequestID).ToArray())).ToArray();
    }
    public async Task<object> CreateAsync(string actor, string key, RequestUpdateInput input, IReadOnlyList<UploadedFile> uploads, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.Customer, ct);
        Require(Guid.TryParse(key, out _), "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be a UUID.", 400);
        var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Guid.Parse(key).ToString("N")))).ToLowerInvariant();
        var prepared = await PrepareAsync(input, uploads, ct);
        return await data.WriteAsync<object>(async token =>
        {
            await access.AccountAsync(actor, UserRoles.Customer, token);
            var prior = (await data.ListAsync<TransportRequest>(x => x.CustomerID == actor && x.SubmissionKeyHash == keyHash, token)).SingleOrDefault();
            if (prior is not null)
            {
                Require(prior.SubmissionContentHash == prepared.Hash, "IDEMPOTENCY_KEY_REUSED", "The same key was used with different request content or files.");
                return RequestMapper.View(prior, await data.ListAsync<RequestHorse>(x => x.RequestID == prior.RequestID, token));
            }
            var row = new TransportRequest { CustomerID = actor, Status = "PENDING_REVIEW", SubmissionKeyHash = keyHash,
                SubmissionContentHash = prepared.Hash, CreatedAtUtc = clock.GetUtcNow().UtcDateTime };
            await ApplySubmissionAsync(row, input, prepared, token);
            await ValidateReadyAsync(actor, row, input.Horses, token);
            data.Add(row); await data.SaveAsync(token);
            var links = AddLinks(row.RequestID, input);
            await ApplyDocumentsAsync(row, prepared.Documents, input.Horses, token);
            await NotifyAsync(row, token);
            return RequestMapper.View(row, links);
        }, ct);
    }
    public async Task<object> UpdateAsync(string actor, string id, RequestUpdateInput input, IReadOnlyList<UploadedFile> uploads, CancellationToken ct)
    {
        var current = await access.RequestAsync(id, actor, false, ct);
        Require(current.Status == "CHANGES_REQUESTED", "INVALID_STATE", "Only requests returned for changes can be resubmitted.");
        var prepared = await PrepareAsync(input, uploads, ct);
        return await data.WriteAsync<object>(async token =>
        {
            var row = await access.RequestAsync(id, actor, false, token);
            Require(row.Status == "CHANGES_REQUESTED", "INVALID_STATE", "Only requests returned for changes can be resubmitted.");
            await ApplySubmissionAsync(row, input, prepared, token);
            await ValidateReadyAsync(actor, row, input.Horses, token);
            foreach (var link in await data.ListAsync<RequestHorse>(x => x.RequestID == id, token)) data.Remove(link);
            await data.SaveAsync(token);
            var links = AddLinks(id, input);
            await ApplyDocumentsAsync(row, prepared.Documents, input.Horses, token);
            row.Status = "PENDING_REVIEW";
            await NotifyAsync(row, token);
            return RequestMapper.View(row, links);
        }, ct);
    }
    private sealed record StoredDocument(RequestDocumentInput Input, string Key, DateTime? Expiry);
    private sealed record Prepared(CitySelection Pickup, CitySelection Delivery, IReadOnlyList<StoredDocument> Documents, string Hash);
    private async Task<Prepared> PrepareAsync(RequestUpdateInput input, IReadOnlyList<UploadedFile> uploads, CancellationToken ct)
    {
        Require(input.Pickup is not null && input.Delivery is not null && input.Horses is { Count: > 0 and <= 6 }
            && input.Horses.All(h => !string.IsNullOrWhiteSpace(h)) && input.Horses.Distinct().Count() == input.Horses.Count
            && input.HorseNotes is not null && input.HorseNotes.All(n => input.Horses.Contains(n.Key) && n.Value is not null && n.Value.Length <= 2000),
            "VALIDATION_ERROR", "Provide both contacts, one to six distinct horses and notes only for selected horses.", 400);
        Require(input.CareInstructions is not null && input.CareInstructions.Length <= 2000 && (input.Purpose?.Length ?? 0) <= 100,
            "VALIDATION_ERROR", "Invalid care instructions or purpose.", 400);
        Require(input.OriginCountry is { Length: 2 } && input.DestinationCountry is { Length: 2 } && input.Mode is "AIR" or "ROAD",
            "VALIDATION_ERROR", "Provide supported country codes and transport mode.", 400);
        foreach (var contact in new[] { input.Pickup, input.Delivery })
        {
            Required(contact!.Name, 100); Required(contact.Address, 255); Required(contact.Contact, 100); Required(contact.Phone, 20);
            Require((contact.Postal?.Length ?? 0) <= 20 && (contact.Notes?.Length ?? 0) <= 1000
                && contact.Latitude is >= -90 and <= 90 && contact.Longitude is >= -180 and <= 180 && !string.IsNullOrWhiteSpace(contact.CityId),
                "VALIDATION_ERROR", "Provide valid coordinates and city selection for both contacts.", 400);
        }
        Require(locations is ICityLocations, "CITY_PROVIDER_UNSUPPORTED", "City-scoped verification currently requires Geoapify.", 503);
        var pickup = await ((ICityLocations)locations!).VerifyCityAsync(new((double)input.Pickup!.Longitude!.Value, (double)input.Pickup.Latitude!.Value, input.OriginCountry), input.Pickup.CityId!, ct);
        var delivery = await ((ICityLocations)locations!).VerifyCityAsync(new((double)input.Delivery!.Longitude!.Value, (double)input.Delivery.Latitude!.Value, input.DestinationCountry), input.Delivery.CityId!, ct);
        var docs = input.Documents ?? [];
        Require(docs.All(d => d is not null && !string.IsNullOrWhiteSpace(d.FileName)) && docs.Count <= 3 && docs.Count == uploads.Count && uploads.Sum(f => (long)f.Bytes.Length) <= 30L * 1024 * 1024
            && uploads.Select(f => f.FileName).Distinct(StringComparer.Ordinal).Count() == uploads.Count
            && docs.Select(d => d.FileName).Distinct(StringComparer.Ordinal).Count() == docs.Count
            && docs.Select(d => d.DocumentType).Distinct().Count() == docs.Count,
            "VALIDATION_ERROR", "Each document must match exactly one uniquely named file and scope/type; at most three shared files and 30 MiB total.", 400);
        var validated = new List<(RequestDocumentInput Input, UploadedFile Upload, DateTime? Expiry)>();
        foreach (var doc in docs)
        {
            var shared = doc.DocumentType is "INVITATION_LETTER" or "COMPETITION_REGISTRATION" or "ATA_CARNET";
            Require(shared, "VALIDATION_ERROR", "Request attachments only allow INVITATION_LETTER, COMPETITION_REGISTRATION and ATA_CARNET; horse documents belong to their own workflow.", 400);
            var upload = uploads.SingleOrDefault(f => f.FileName == doc.FileName);
            Require(upload is not null && !doc.FileName.Contains('/') && !doc.FileName.Contains('\\'), "VALIDATION_ERROR", "Document fileName must match an attached filename.", 400);
            DateTime? expiry = null;
            if (doc.ExpiryDate is not null)
            {
                Require(DateTime.TryParseExact(doc.ExpiryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed), "VALIDATION_ERROR", "Document expiryDate must be yyyy-MM-dd.", 400);
                expiry = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }
            validated.Add((doc, upload!, expiry));
        }
        // Canonical order makes retries insensitive to multipart ordering and dictionary order.
        var canonical = new { Input = input with { Horses = input.Horses.OrderBy(x => x, StringComparer.Ordinal).ToArray(),
            HorseNotes = input.HorseNotes!.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => x.Key, x => x.Value),
            Documents = docs.OrderBy(d => d.FileName, StringComparer.Ordinal).ToArray() },
            Files = uploads.OrderBy(f => f.FileName, StringComparer.Ordinal).Select(f => new { f.FileName, Hash = Convert.ToHexString(SHA256.HashData(f.Bytes)) }) };
        var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(canonical))).ToLowerInvariant();
        var stored = new List<StoredDocument>();
        foreach (var doc in validated) stored.Add(new(doc.Input, await files.PutAsync(doc.Upload, false, ct), doc.Expiry));
        return new(pickup, delivery, stored, hash);
    }
    private async Task ApplySubmissionAsync(TransportRequest row, RequestUpdateInput input, Prepared prepared, CancellationToken ct)
    {
        await ApplyAsync(row, new(input.Origin, input.Destination, input.OriginCountry, input.DestinationCountry, input.Mode, input.ExpectedTransportDate, input.ExpectedDeliveryDate, input.CareInstructions), ct);
        ApplyContacts(row, input.Pickup, input.Delivery);
        row.Purpose = input.Purpose;
        row.PickupCityId = prepared.Pickup.CityId; row.PickupCityName = prepared.Pickup.Label;
        row.DeliveryCityId = prepared.Delivery.CityId; row.DeliveryCityName = prepared.Delivery.Label;
        Require(prepared.Documents.All(d => d.Expiry is null || d.Expiry > row.CommittedDeadline), "REQUIRED_DOCUMENT_MISSING", "Attached documents must remain valid beyond delivery.", 400);
    }
    private IReadOnlyList<RequestHorse> AddLinks(string id, RequestUpdateInput input)
    {
        var links = input.Horses.Select(h => new RequestHorse { RequestID = id, HorseID = h, CareInstructions = input.HorseNotes.GetValueOrDefault(h) }).ToArray();
        foreach (var link in links) data.Add(link);
        return links;
    }
    private async Task ApplyDocumentsAsync(TransportRequest row, IReadOnlyList<StoredDocument> documents, IReadOnlyList<string> selected, CancellationToken ct)
    {
        foreach (var old in await data.ListAsync<MedicalRecord>(m => m.RequestID == row.RequestID, ct))
            if (!selected.Contains(old.HorseID)) data.Remove(old);
        foreach (var doc in documents)
        {
            switch (doc.Input.DocumentType)
            {
                case "INVITATION_LETTER": row.InvitationLetterFileUrl = doc.Key; break;
                case "COMPETITION_REGISTRATION": row.CompetitionRegistrationFileUrl = doc.Key; break;
                case "ATA_CARNET": row.AtaCarnetFileUrl = doc.Key; break;

            }
        }
    }
    private async Task NotifyAsync(TransportRequest row, CancellationToken ct)
    {
        foreach (var manager in (await data.ListAsync<Account>(a => a.IsActive, ct)).Where(a => UserRoles.NormalizeRole(a.Role) == UserRoles.LogisticsManager))
            data.Add(new Notification { UserID = manager.UserID, ReferenceID = row.RequestID, Type = "REQUEST_SUBMITTED", Channel = "IN_APP",
                Title = "Request pending review", Message = $"Request {row.RequestID} is ready for review.", SentAt = clock.GetUtcNow().UtcDateTime });
    }
    private async Task ValidateReadyAsync(string actor, TransportRequest row, IReadOnlyList<string> selected, CancellationToken token)
    {
        Require(row.ExpectedDate is not null && row.CommittedDeadline >= row.ExpectedDate && row.PreparationDays is not null && row.ExpectedDate.Value.AddDays(-row.PreparationDays.Value) > clock.GetUtcNow().UtcDateTime,
            "VALIDATION_ERROR", "Departure is inside the preparation window.", 400);
        foreach (var horseId in selected)
        {
            var horse = await access.HorseAsync(horseId, actor, token);
            Require(horse.PhotoUrl is not null && horse.PassportScanUrl is not null && horse.OwnershipCertificateFileUrl is not null
                && horse.PassportExpiryDate > row.CommittedDeadline && horse.DeclaredValueVnd > 0,
                "REQUIRED_DOCUMENT_MISSING", "Complete horse profile and ownership documents before submission.", 400);
            var links = await data.ListAsync<RequestHorse>(x => x.HorseID == horseId && x.RequestID != row.RequestID, token);
            var otherIds = links.Select(x => x.RequestID).ToArray();
            Require(!(await data.ListAsync<TransportRequest>(x => otherIds.Contains(x.RequestID)
                && x.Status != "DRAFT" && x.Status != "CHANGES_REQUESTED" && x.Status != "REJECTED" && x.Status != "CANCELLED" && x.Status != "CLOSED"
                && x.ExpectedDate != null && x.ExpectedDate.Value.Date <= row.CommittedDeadline!.Value.Date && (x.CommittedDeadline ?? x.ExpectedDate)!.Value.Date >= row.ExpectedDate!.Value.Date, token)).Any(),
                "HORSE_SCHEDULE_CONFLICT", "Horse already belongs to an overlapping request.");
        }
    }
    private async Task ApplyAsync(TransportRequest row, RequestDraftInput input, CancellationToken ct)
    {
        await catalogs.ValidateAsync(input.OriginCountry, input.DestinationCountry, input.Mode, ct);
        Require(DateTime.TryParseExact(input.ExpectedTransportDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date), "VALIDATION_ERROR", "expectedTransportDate must be yyyy-MM-dd.", 400);
        row.Departure = Required(input.Origin, 255); row.Destination = Required(input.Destination, 255);
        row.OriginCountry = input.OriginCountry; row.DestinationCountry = input.DestinationCountry;
        Require(DateTime.TryParseExact(input.ExpectedDeliveryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var endDate)
            && endDate >= date, "VALIDATION_ERROR", "expectedDeliveryDate must be yyyy-MM-dd and on or after expectedTransportDate.", 400);
        row.TransportType = input.Mode; row.ExpectedDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);
        row.CommittedDeadline = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
        row.CareInstructions = input.CareInstructions;
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
