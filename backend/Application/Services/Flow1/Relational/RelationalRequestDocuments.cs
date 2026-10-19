using Application.DTOs.Flow1;
using Domain.Enums;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private const string BaselineDocumentType = "BASELINE_MEDICAL";
    private sealed record PreparedDocument(string HorseId, string FileKey);

    private static void ValidateDeclaredValue(decimal? value) => Require(value is null ||
        value is > 0 and <= 9999999999999999.99m && decimal.Round(value.Value, 2) == value,
        "INVALID_DECLARED_VALUE", "Declared total must be positive USD with at most two decimal places, or omitted.");

    public async Task<FlowRequestCard> SubmitWithDocumentsAsync(string actor, string key, FlowRequestInput input,
        IReadOnlyList<RequestDocumentUpload> uploads, string? id, string? version, CancellationToken ct)
    {
        Require(input is not null && input.Trip is not null && input.Trip.Pickup is not null && input.Trip.Delivery is not null
            && input.Horses is not null && input.PickupContact is not null && input.Receiver is not null,
            "VALIDATION_ERROR", "Complete all required request fields.");
        Key(key); ValidateDeclaredValue(input.DeclaredValueUsd);
        Require(uploads is not null && uploads.Count <= 10, "INVALID_DOCUMENTS", "Attach at most ten files.");
        // Check ownership before writing private bytes; recheck everything in the final SQL transaction.
        await db.RunAsync(async t => {
            await Actor(actor, UserRoles.Customer, t);
            Require(input.Horses is { Count: > 0 }, "INVALID_DOCUMENTS", "Select the horses first.");
            foreach (var selection in input.Horses) {
                var horse = await db.FindAsync<FlowHorse>(selection.HorseId, t);
                Require(horse is not null && horse.OwnerID == actor, "FORBIDDEN", "Horse does not belong to this account.");
            }
            foreach (var upload in uploads)
                Require(input.Horses.Any(h => h.HorseId == upload.HorseId), "INVALID_DOCUMENT_HORSE", "Each file must belong to a selected horse.");
            if (id is not null) {
                var request = await Request(id, actor, false, t);
                Check(request.RowVersion, version ?? "");
                Require(request.Status == "CHANGES_REQUESTED", "REVISION_CLOSED", "Only returned requests can be revised.");
            }
            return 0;
        }, ct);
        var documents = new List<PreparedDocument>();
        foreach (var upload in uploads)
            documents.Add(new(upload.HorseId, await files.PutAsync(upload.File, false, ct)));
        Require(documents.Distinct().Count() == documents.Count, "DUPLICATE_DOCUMENT", "The same file is attached twice to one horse.");
        return await SubmitCore(actor, key, input, id, version, documents, ct);
    }

    private static string DocumentId(string request, PreparedDocument file) => Id("doc", request, file.HorseId, file.FileKey);
    private async Task<bool> SameDocuments(string request, IReadOnlyList<PreparedDocument> files, CancellationToken ct) =>
        (await db.QueryAsync<FlowMedicalRecord>(x => x.RequestID == request, ct))
        .Select(x => x.RecordID).Order().SequenceEqual(files.Select(x => DocumentId(request, x)).Order());

    private async Task SaveDocuments(FlowRequest request, IReadOnlyList<PreparedDocument> files,
        IReadOnlyList<HorseSelection> horses, CancellationToken ct)
    {
        var existing = await db.QueryAsync<FlowMedicalRecord>(x => x.RequestID == request.RequestID && x.DocumentType == BaselineDocumentType, ct);
        Require(existing.Where(x => horses.Any(h => h.HorseId == x.HorseID)).Select(x => x.RecordID)
            .Concat(files.Select(x => DocumentId(request.RequestID, x))).Distinct().Count() <= 10,
            "INVALID_DOCUMENTS", "A request can retain at most ten supplementary files.");
        foreach (var old in existing)
            if (!horses.Any(h => h.HorseId == old.HorseID)) db.Remove(old);
        foreach (var file in files) {
            var id = DocumentId(request.RequestID, file);
            if (await db.FindAsync<FlowMedicalRecord>(id, ct) is null)
                db.Add(new FlowMedicalRecord { RecordID = id, HorseID = file.HorseId, RequestID = request.RequestID,
                    DocumentType = BaselineDocumentType, DocumentStatus = "UPLOADED", RequirementStatus = "OPTIONAL",
                    UploadedFileUrl = file.FileKey });
        }
    }

    private async Task<IReadOnlyList<FlowRequestDocument>> RequestDocuments(string request, CancellationToken ct) =>
        (await db.QueryAsync<FlowMedicalRecord>(x => x.RequestID == request && x.DocumentType == BaselineDocumentType, ct))
        .OrderBy(x => x.RecordID).Select(x => new FlowRequestDocument(x.RecordID, x.HorseID, x.DocumentType!, x.DocumentStatus ?? "UPLOADED")).ToArray();

    private async Task<(byte[] Bytes, string ContentType)> ReadDocument(string request, string document, CancellationToken ct)
    {
        var row = await db.FindAsync<FlowMedicalRecord>(document, ct);
        if (row is null || row.RequestID != request || row.UploadedFileUrl is null)
            throw Error("Document not found.", "NOT_FOUND", 404);
        Require((await db.QueryAsync<FlowRequestHorse>(x => x.RequestID == request && x.HorseID == row.HorseID, ct)).Count == 1,
            "FILE_UNAVAILABLE", "Document is not attached to a current selected horse.");
        return await files.ReadAsync(row.UploadedFileUrl, ct);
    }
    public Task<(byte[] Bytes, string ContentType)> RequestDocumentAsync(string request, string document, string actor, bool manager, CancellationToken ct) =>
        db.RunAsync(async t => { await Request(request, actor, manager, t); return await ReadDocument(request, document, t); }, ct);

    public Task<(byte[] Bytes, string ContentType)> OperationsDocumentAsync(string tripId, string document, string actor, string eventId, CancellationToken ct) =>
        db.RunAsync(async t => {
            await Actor(actor, UserRoles.TransportSpecialist, t);
            var trip = await db.FindAsync<FlowTrip>(tripId, t) ?? throw Error("Trip not found.", "NOT_FOUND", 404);
            Require(!string.IsNullOrWhiteSpace(eventId), "HANDOFF_CHANGED", "Current event is required.");
            await Released(trip.RequestID, actor, eventId, t);
            return await ReadDocument(trip.RequestID, document, t);
        }, ct);
}
