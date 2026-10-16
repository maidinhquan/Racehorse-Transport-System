using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed class CustomerTransportService(ICustomerTransportRepository repo, IFlow1UnitOfWork work,
    IFlow1StateStore stateStore, IFlow1PrivateFileStore files, TransportEstimateService estimates, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static string Hash<T>(T input) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(input, Json)));
    private static string Id(string kind, string owner, string key) => kind + "-" + Hash(new { owner, key })[..32].ToLowerInvariant();
    private static void Validate(object? value)
    {
        if (value is null) throw Error("Required input is missing.", "VALIDATION_ERROR");
        var errors = new List<ValidationResult>();
        // ASP.NET validates positional-record constructor parameters. Multipart horse
        // JSON is deserialized manually, so apply those same annotations here too.
        foreach (var parameter in value.GetType().GetConstructors().OrderByDescending(x => x.GetParameters().Length).First().GetParameters())
        {
            var property = value.GetType().GetProperty(parameter.Name!);
            foreach (var rule in parameter.GetCustomAttributes<ValidationAttribute>())
            {
                var result = rule.GetValidationResult(property?.GetValue(value), new ValidationContext(value) { MemberName = parameter.Name });
                if (result is not null) errors.Add(result);
            }
        }
        if (!Validator.TryValidateObject(value, new ValidationContext(value), errors, true) || errors.Count > 0)
            throw Error(string.Join(" ", errors.Select(x => x.ErrorMessage)), "VALIDATION_ERROR");
    }
    public static void ValidateKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || !Regex.IsMatch(key, @"\A[A-Za-z0-9_-]{8,100}\z"))
            throw Error("Idempotency-Key must be 8–100 ASCII letters, digits, underscores or hyphens.", "INVALID_IDEMPOTENCY_KEY");
    }
    private static void SameInput(string saved, string hash)
    {
        if (saved != hash) throw Error("Idempotency key was used with different input.", "IDEMPOTENCY_KEY_REUSED", 409);
    }
    private async Task<(int Version, T Value)?> Latest<T>(string type, string id, CancellationToken ct)
    {
        var document = await stateStore.ReadAsync(type, id, ct);
        if (document is null) return null;
        var revision = document.Revisions[^1];
        return (revision.Version, revision.Payload.Deserialize<T>(Json) ?? throw new InvalidDataException("Invalid state payload."));
    }
    private static HorseView View(Horse h, (int Version, HorseSnapshot Value)? snapshot, bool free) =>
        new(h.HorseId, h.Name, h.MicrochipIso, h.FeiPassportNo, snapshot?.Value.Status ?? "NEEDS_DOCUMENTS",
            snapshot?.Version ?? 0, snapshot?.Value.Status == "ACTIVE" && free,
            !free ? "SCHEDULE_CONFLICT" : snapshot?.Value.Status == "ACTIVE" ? null : "HORSE_DOCUMENTS_REQUIRED");

    public async Task<IReadOnlyList<HorseView>> HorsesAsync(string owner, DateOnly? from, DateOnly? to, CancellationToken ct, string? requestId = null)
    {
        if (requestId is not null && await repo.RequestAsync(requestId, owner, ct) is null)
            throw Error("Request not found.", "NOT_FOUND", 404);
        if (from.HasValue != to.HasValue || from > to || (from.HasValue && from < Today(clock)))
            throw Error("Select a valid departure and delivery date range.", "INVALID_DATE_RANGE");
        var result = new List<HorseView>();
        foreach (var h in await repo.HorsesAsync(owner, ct))
        {
            var snapshot = await Latest<HorseSnapshot>("horse", h.HorseId, ct);
            var free = !from.HasValue || !await repo.OverlapsAsync(h.HorseId, from.Value.ToDateTime(TimeOnly.MinValue),
                to!.Value.ToDateTime(TimeOnly.MinValue), ct, requestId);
            result.Add(View(h, snapshot, free));
        }
        return result;
    }

    public async Task<HorseView> CreateHorseAsync(string owner, string key, HorseInput input,
        UploadedFile photo, UploadedFile passport, CancellationToken ct)
    {
        ValidateKey(key);
        Validate(input);
        if (input.Dob == default || input.Dob > Today(clock) || input.Dob < Today(clock).AddYears(-60))
            throw Error("Horse DOB is invalid.", "VALIDATION_ERROR");
        var id = Id("h", owner, key);
        // File hashes make retry semantics cover both the form fields and the actual uploads.
        var hash = Hash(new { input, photo = Hash(photo.Bytes), passport = Hash(passport.Bytes) });
        return await work.ExecuteAsync(id, async token =>
        {
            await work.LockHorsesAsync(["chip-" + Hash(input.MicrochipIso)[..32]], token);
            var previous = await Latest<HorseSnapshot>("horse", id, token);
            if (previous.HasValue) SameInput(previous.Value.Value.InputHash, hash);
            var existing = await repo.HorseAsync(id, owner, token);
            if (existing is not null) return View(existing, previous, true);
            if (await repo.MicrochipExistsAsync(input.MicrochipIso, token))
                throw Error("This microchip is already registered.", "MICROCHIP_EXISTS", 409);
            var snapshot = new HorseSnapshot("ACTIVE", input,
                await files.PutAsync(photo, true, token), await files.PutAsync(passport, false, token), hash);
            var horse = new Horse { HorseId = id, OwnerId = owner, Name = input.Name.Trim(), MicrochipIso = input.MicrochipIso,
                FeiPassportNo = input.FeiPassportNo.Trim(), Breed = input.Breed.Trim(), Sex = input.Sex,
                Weight = input.Weight, Dob = input.Dob.ToDateTime(TimeOnly.MinValue) };
            repo.AddHorse(horse);
            await work.FlushAsync(token);
            await stateStore.AppendAsync("horse", id, 0, key, owner, "HORSE_CREATED", JsonSerializer.SerializeToElement(snapshot, Json), token);
            return View(horse, (1, snapshot), true);
        }, ct);
    }

    public async Task<(int Version, HorseSnapshot Value)> DocumentsAsync(string owner, string id, CancellationToken ct)
    {
        if (await repo.HorseAsync(id, owner, ct) is null) throw Error("Horse not found.", "NOT_FOUND", 404);
        return await Latest<HorseSnapshot>("horse", id, ct) ?? throw Error("Horse documents are missing.", "HORSE_DOCUMENTS_REQUIRED", 409);
    }

    public async Task<int> UpdateDocumentsAsync(string owner, string id, int version, string key,
        UploadedFile photo, UploadedFile passport, CancellationToken ct, HorseInput? legacyIdentity = null)
    {
        ValidateKey(key);
        return await work.ExecuteAsync(id, async token =>
        {
            await work.LockHorsesAsync([id], token);
            var horse = await repo.HorseAsync(id, owner, token) ?? throw Error("Horse not found.", "NOT_FOUND", 404);
            var current = await Latest<HorseSnapshot>("horse", id, token);
            HorseSnapshot next;
            if (version == 0)
            {
                // Explicit onboarding of a legacy horse, never assuming its missing files/status.
                Validate(legacyIdentity);
                var identity = legacyIdentity!;
                if (identity.MicrochipIso != horse.MicrochipIso || identity.Dob == default || identity.Dob > Today(clock) || identity.Dob < Today(clock).AddYears(-60))
                    throw Error("Keep the existing microchip and enter valid identity information.", "VALIDATION_ERROR");
                if (await repo.OverlapsAsync(id, new DateTime(1900, 1, 1), new DateTime(9998, 1, 1), token))
                    throw Error("Legacy identity cannot change while a request is active.", "SCHEDULE_CONFLICT", 409);
                var hash = Hash(new { identity, photo = Hash(photo.Bytes), passport = Hash(passport.Bytes) });
                if (current.HasValue) SameInput(current.Value.Value.InputHash, hash);
                next = current?.Value ?? new HorseSnapshot("ACTIVE", identity, await files.PutAsync(photo, true, token),
                    await files.PutAsync(passport, false, token), hash);
                horse.Name = identity.Name.Trim(); horse.FeiPassportNo = identity.FeiPassportNo.Trim();
                horse.Breed = identity.Breed.Trim(); horse.Sex = identity.Sex; horse.Weight = identity.Weight;
                horse.Dob = identity.Dob.ToDateTime(TimeOnly.MinValue);
                repo.UpdateHorse(horse);
            }
            else
            {
                if (!current.HasValue) throw Error("Horse documents are missing.", "HORSE_DOCUMENTS_REQUIRED", 409);
                next = current.Value.Value with { Photo = await files.PutAsync(photo, true, token),
                    PassportScan = await files.PutAsync(passport, false, token) };
            }
            // AppendAsync validates expectedVersion and operation key, including matching retry.
            var saved = await stateStore.AppendAsync("horse", id, version, key, owner, "DOCUMENTS_UPDATED",
                JsonSerializer.SerializeToElement(next, Json), token);
            return saved.Version;
        }, ct);
    }

    public async Task<(byte[] Bytes, string ContentType)> DocumentFileAsync(string owner, string id, int version,
        string kind, CancellationToken ct)
    {
        if (await repo.HorseAsync(id, owner, ct) is null) throw Error("Horse not found.", "NOT_FOUND", 404);
        var doc = await stateStore.ReadAsync("horse", id, ct);
        var revision = doc?.Revisions.SingleOrDefault(x => x.Version == version);
        if (revision is null) throw Error("Document version not found.", "NOT_FOUND", 404);
        var snapshot = revision.Payload.Deserialize<HorseSnapshot>(Json)!;
        var file = kind switch { "photo" => snapshot.Photo, "passport" => snapshot.PassportScan,
            _ => throw Error("Document not found.", "NOT_FOUND", 404) };
        return (await files.ReadAsync(file, ct), file.ContentType);
    }

    public async Task<RequestView> SubmitAsync(string owner, string key, SubmitRequestInput input, CancellationToken ct)
    {
        ValidateKey(key);
        ValidateSubmission(input);
        var id = Id("r", owner, key);
        var hash = Hash(input);
        // Replay must not depend on today's date, provider availability or subsequent horse edits.
        return await work.ExecuteAsync(id, async token =>
        {
            // Acquire shared horse resources before any serializable SQL reads to avoid
            // holding a missing-request key range while waiting for a horse lock.
            await work.LockHorsesAsync(input.Horses.Select(x => x.HorseId), token);
            var saved = await Latest<RequestSnapshot>("request", id, token);
            if (saved.HasValue) SameInput(saved.Value.Value.InputHash, hash);
            var existing = await repo.RequestAsync(id, owner, token);
            if (existing is not null)
            {
                if (!saved.HasValue) throw Error("Request state is unavailable.", "METADATA_UNAVAILABLE", 409);
                return RequestView(existing, saved);
            }
            var horses = await ValidateHorsesAsync(owner, input, null, token);
            var calculation = await estimates.CalculateAsync(input.Trip, token);
            if (calculation.Route is { MayPersist: false })
                throw Error("Routing results cannot be stored under the provider's configured permission.", "MAP_STORAGE_NOT_PERMITTED", 503);
            var snapshot = new RequestSnapshot(input, calculation.Customer, hash, horses,
                input.Receiver.IsProxy ? "REQUIRED_NOT_VERIFIED" : "NOT_REQUIRED");
            var request = new TransportRequest { RequestId = id, CustomerId = owner,
                Departure = input.Trip.Pickup.Address.Trim(), Destination = input.Trip.Delivery.Address.Trim(),
                Purpose = input.Purpose.Trim(), TransportType = input.Trip.PreferredTransportMode,
                ExpectedDate = input.Trip.DesiredDepartureDate.ToDateTime(TimeOnly.MinValue),
                CommittedDeadline = input.DeliveryDeadline.ToDateTime(TimeOnly.MinValue),
                DesignatedReceiverName = input.Receiver.Name.Trim(), DesignatedReceiverPhone = input.Receiver.Phone.Trim(),
                Status = "PENDING", RequestHorseMappings = input.Horses.Select(x => new RequestHorseMapping {
                    RequestHorseId = Guid.NewGuid().ToString("N"), RequestId = id, HorseId = x.HorseId }).ToList() };
            repo.AddRequest(request);
            await work.FlushAsync(token);
            await stateStore.AppendAsync("request", id, 0, key, owner, "REQUEST_SUBMITTED", JsonSerializer.SerializeToElement(snapshot, Json), token);
            return RequestView(request, (1, snapshot));
        }, ct);
    }

    public static void ValidateSubmission(SubmitRequestInput input)
    {
        Validate(input); Validate(input.Trip); Validate(input.PickupContact); Validate(input.Receiver);
        if (input.Horses.Any(x => x is null || !Regex.IsMatch(x.HorseId ?? "", @"\A[A-Za-z0-9_-]{1,50}\z") || x.DocumentVersion < 1) ||
            input.Horses.Select(x => x.HorseId.ToUpperInvariant()).Distinct().Count() != input.Horses.Count ||
            input.Horses.Count != input.Trip.HorseCount)
            throw Error("Select unique horses and their current document versions.", "INVALID_HORSES");
        if (input.DeliveryDeadline < input.Trip.DesiredDepartureDate || input.DeliveryDeadline > input.Trip.DesiredDepartureDate.AddDays(90))
            throw Error("Delivery deadline must be within 90 days after departure.", "INVALID_DATE_RANGE");
    }
    public async Task<IReadOnlyList<HorseSnapshot>> ValidateHorsesAsync(string owner, SubmitRequestInput input, string? excludeRequestId, CancellationToken token)
    {
        var horses = new List<HorseSnapshot>();
        foreach (var reference in input.Horses)
        {
            var current = await DocumentsAsync(owner, reference.HorseId, token);
            if (current.Version != reference.DocumentVersion) throw Error("Reload the latest horse documents.", "STALE_VERSION", 409);
            if (current.Value.Status != "ACTIVE") throw Error("Horse is not active.", "HORSE_NOT_ACTIVE", 409);
            if (await repo.OverlapsAsync(reference.HorseId, input.Trip.DesiredDepartureDate.ToDateTime(TimeOnly.MinValue),
                input.DeliveryDeadline.ToDateTime(TimeOnly.MinValue), token, excludeRequestId))
                throw Error("A selected horse has an overlapping request.", "SCHEDULE_CONFLICT", 409);
            // Fail closed if immutable private bytes were lost or corrupted.
            await files.ReadAsync(current.Value.Photo, token);
            await files.ReadAsync(current.Value.PassportScan, token);
            horses.Add(current.Value);
        }
        return horses;
    }

    private static RequestView RequestView(TransportRequest r, (int Version, RequestSnapshot Value)? snapshot) =>
        new(r.RequestId, r.Status, r.Departure, r.Destination, r.ExpectedDate, r.CommittedDeadline,
            snapshot?.Version ?? 0, snapshot?.Value, []);
    public async Task<RequestView> DetailAsync(string owner, string id, CancellationToken ct)
    {
        var r = await repo.RequestAsync(id, owner, ct) ?? throw Error("Request not found.", "NOT_FOUND", 404);
        return RequestView(r, await Latest<RequestSnapshot>("request", id, ct));
    }
    public async Task<PageView<RequestView>> ListAsync(string owner, int page, int size, CancellationToken ct)
    {
        if (page is < 1 or > 100_000 || size is < 1 or > 100) throw Error("Invalid pagination.", "VALIDATION_ERROR");
        var (items, count) = await repo.RequestsAsync(owner, page, size, ct);
        // List deliberately excludes private snapshots and document evidence.
        return new(items.Select(x => RequestView(x, null)).ToArray(), page, size, count);
    }
}
