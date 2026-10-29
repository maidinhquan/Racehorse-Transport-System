using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestService(IDataSession data, AccessService access, CatalogService catalogs, PolicyService policies,
    TimeProvider clock, ILocationVerifier? locations = null)
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
    public async Task<object> CreateAsync(string actor, string key, RequestUpdateInput input, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.Customer, ct);
        Require(Guid.TryParse(key, out _), "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be a UUID.", 400);
        var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Guid.Parse(key).ToString("N")))).ToLowerInvariant();
        var prepared = await PrepareAsync(input, ct);
        return await data.WriteAsync<object>(async token =>
        {
            await access.AccountAsync(actor, UserRoles.Customer, token);
            var prior = (await data.ListAsync<TransportRequest>(x => x.CustomerID == actor && x.SubmissionKeyHash == keyHash, token)).SingleOrDefault();
            if (prior is not null)
            {
                Require(prior.SubmissionContentHash == prepared.Hash, "IDEMPOTENCY_KEY_REUSED", "The same key was used with different request content.");
                return RequestMapper.View(prior, await data.ListAsync<RequestHorse>(x => x.RequestID == prior.RequestID, token));
            }
            var row = new TransportRequest { CustomerID = actor, Status = "PENDING_REVIEW", SubmissionKeyHash = keyHash,
                SubmissionContentHash = prepared.Hash, CreatedAtUtc = clock.GetUtcNow().UtcDateTime };
            await ApplySubmissionAsync(row, input, prepared, token);
            await ValidateReadyAsync(actor, row, input.Horses, token);
            data.Add(row); await data.SaveAsync(token);
            var links = AddLinks(row.RequestID, input);
            await RemoveUnselectedDocumentsAsync(row.RequestID, input.Horses, token);
            await NotifyAsync(row, token);
            return RequestMapper.View(row, links);
        }, ct);
    }
    public async Task<object> UpdateAsync(string actor, string id, RequestUpdateInput input, CancellationToken ct)
    {
        var current = await access.RequestAsync(id, actor, false, ct);
        Require(current.Status == "CHANGES_REQUESTED", "INVALID_STATE", "Only requests returned for changes can be resubmitted.");
        var prepared = await PrepareAsync(input, ct);
        return await data.WriteAsync<object>(async token =>
        {
            var row = await access.RequestAsync(id, actor, false, token);
            Require(row.Status == "CHANGES_REQUESTED", "INVALID_STATE", "Only requests returned for changes can be resubmitted.");
            await ApplySubmissionAsync(row, input, prepared, token);
            await ValidateReadyAsync(actor, row, input.Horses, token);
            foreach (var link in await data.ListAsync<RequestHorse>(x => x.RequestID == id, token)) data.Remove(link);
            await data.SaveAsync(token);
            var links = AddLinks(id, input);
            await RemoveUnselectedDocumentsAsync(row.RequestID, input.Horses, token);
            row.Status = "PENDING_REVIEW";
            await NotifyAsync(row, token);
            return RequestMapper.View(row, links);
        }, ct);
    }
    private sealed record Prepared(CitySelection Pickup, CitySelection Delivery, string Hash);
    private async Task<Prepared> PrepareAsync(RequestUpdateInput input, CancellationToken ct)
    {
        Require(input.Pickup is not null, "VALIDATION_ERROR", "Thiếu thông tin bên giao ngựa. Vui lòng điền pickup.", 400);
        Require(input.Delivery is not null, "VALIDATION_ERROR", "Thiếu thông tin bên nhận ngựa. Vui lòng điền delivery.", 400);
        Require(input.Horses is { Count: > 0 }, "VALIDATION_ERROR", "Chưa chọn ngựa. Vui lòng chọn ít nhất 1 ngựa trong horses.", 400);
        Require(input.Horses!.Count <= 6, "VALIDATION_ERROR", "Mỗi yêu cầu chỉ được chọn tối đa 6 ngựa trong horses.", 400);
        Require(input.Horses.All(h => !string.IsNullOrWhiteSpace(h)), "VALIDATION_ERROR", "Danh sách horses có mã ngựa để trống. Vui lòng điền mã ngựa hợp lệ.", 400);
        var duplicates = input.Horses.GroupBy(h => h).Where(g => g.Count() > 1).Select(g => g.Key).ToArray();
        Require(duplicates.Length == 0, "VALIDATION_ERROR", $"Danh sách horses bị trùng ngựa: {string.Join(", ", duplicates)}. Mỗi ngựa chỉ được chọn một lần.", 400);
        Require(input.HorseNotes is not null, "VALIDATION_ERROR", "Thiếu horseNotes. Nếu không có ghi chú riêng cho ngựa, hãy gửi horseNotes: {}.", 400);
        var unselected = input.HorseNotes!.Keys.Where(id => !input.Horses.Contains(id)).ToArray();
        Require(unselected.Length == 0, "VALIDATION_ERROR",
            $"Ghi chú đang gắn với ngựa {string.Join(", ", unselected)}, nhưng yêu cầu chỉ chọn {string.Join(", ", input.Horses)}. Vui lòng sửa mã ngựa trong horseNotes cho khớp với horses.", 400);
        foreach (var note in input.HorseNotes)
        {
            Require(note.Value is not null, "VALIDATION_ERROR", $"Ghi chú của ngựa {note.Key} không được null. Dùng chuỗi rỗng nếu không có ghi chú.", 400);
            Require(note.Value!.Length <= 2000, "VALIDATION_ERROR", $"Ghi chú của ngựa {note.Key} vượt quá 2.000 ký tự. Vui lòng rút ngắn ghi chú trong horseNotes.", 400);
        }
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
        // Canonical order makes retries insensitive to horse and dictionary ordering.
        var canonical = input with { Horses = input.Horses.OrderBy(x => x, StringComparer.Ordinal).ToArray(),
            HorseNotes = input.HorseNotes!.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => x.Key, x => x.Value) };
        var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(canonical))).ToLowerInvariant();
        return new(pickup, delivery, hash);
    }
    private async Task ApplySubmissionAsync(TransportRequest row, RequestUpdateInput input, Prepared prepared, CancellationToken ct)
    {
        await ApplyAsync(row, new(input.Origin, input.Destination, input.OriginCountry, input.DestinationCountry, input.Mode, input.ExpectedTransportDate, input.ExpectedDeliveryDate, input.CareInstructions), ct);
        ApplyContacts(row, input.Pickup, input.Delivery);
        row.Purpose = input.Purpose;
        row.PickupCityId = prepared.Pickup.CityId; row.PickupCityName = prepared.Pickup.Label;
        row.DeliveryCityId = prepared.Delivery.CityId; row.DeliveryCityName = prepared.Delivery.Label;
    }
    private IReadOnlyList<RequestHorse> AddLinks(string id, RequestUpdateInput input)
    {
        var links = input.Horses.Select(h => new RequestHorse { RequestID = id, HorseID = h, CareInstructions = input.HorseNotes.GetValueOrDefault(h) }).ToArray();
        foreach (var link in links) data.Add(link);
        return links;
    }
    private async Task RemoveUnselectedDocumentsAsync(string requestId, IReadOnlyList<string> selected, CancellationToken ct)
    {
        foreach (var old in await data.ListAsync<MedicalRecord>(m => m.RequestID == requestId, ct))
            if (!selected.Contains(old.HorseID)) data.Remove(old);
    }
    private async Task NotifyAsync(TransportRequest row, CancellationToken ct)
    {
        foreach (var manager in (await data.ListAsync<Account>(a => a.IsActive, ct)).Where(a => UserRoles.NormalizeRole(a.Role) == UserRoles.LogisticsManager))
            data.Add(new Notification { UserID = manager.UserID, ReferenceID = row.RequestID, Type = "REQUEST_SUBMITTED", Channel = "IN_APP",
                Title = "Request pending review", Message = $"Request {row.RequestID} is ready for review.", SentAt = clock.GetUtcNow().UtcDateTime });
    }
    private async Task ValidateReadyAsync(string actor, TransportRequest row, IReadOnlyList<string> selected, CancellationToken token)
    {
        Require(row.ExpectedDate is not null && row.CommittedDeadline >= row.ExpectedDate && row.PreparationDays is not null
            // Compare calendar dates, like the form: the earliest pickup date is today + PreparationDays.
            && row.ExpectedDate.Value.Date.AddDays(-row.PreparationDays.Value) >= clock.GetUtcNow().UtcDateTime.Date,
            "VALIDATION_ERROR", $"Departure is inside the preparation window: choose a pickup date on or after {clock.GetUtcNow().UtcDateTime.Date.AddDays(row.PreparationDays ?? 0):yyyy-MM-dd}.", 400);
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
