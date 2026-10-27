using Application.Flow1.Interfaces;
using Application.DTOs.Flow1;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class HorseFilesService(IDataSession data, AccessService access, HorseService horses, IPrivateFiles files)
{
    public async Task<object> UploadAsync(string actor, string id, string kind, UploadedFile upload, CancellationToken ct)
    {
        await access.HorseAsync(id, actor, ct); await horses.EditableAsync(id, ct);
        ValidateKind(kind);
        var key = await files.PutAsync(upload, kind == "photo", ct);
        return await data.WriteAsync<object>(async token =>
        {
            var horse = await access.HorseAsync(id, actor, token); await horses.EditableAsync(id, token);
            switch (kind)
            {
                case "photo": horse.PhotoUrl = key; break;
                case "passport": horse.PassportScanUrl = key; break;
                case "ownership": horse.OwnershipCertificateFileUrl = key; break;
                case "value-proof": horse.ValuationDocumentFileUrl = key; break;
            }
            return new { name = Path.GetFileName(upload.FileName), url = $"/api/customer/horses/{id}/files/{kind}" };
        }, ct);
    }
    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(string actor, string id, string kind, CancellationToken ct)
    {
        var horse = await access.HorseAsync(id, actor, ct); return await ReadHorseAsync(horse, kind, ct);
    }
    public async Task<(byte[] Bytes, string ContentType)> ManagerAsync(string actor, string request, string id, string kind, CancellationToken ct)
    {
        await access.RequestAsync(request, actor, true, ct);
        Require((await data.ListAsync<RequestHorse>(x => x.RequestID == request && x.HorseID == id, ct)).Any(), "NOT_FOUND", "Horse not in request.", 404);
        var horse = await data.FindAsync<Horse>(ct, id) ?? throw Failure("NOT_FOUND", "Horse not found.", 404);
        var fileKind = kind switch { "PHOTO" => "photo", "PASSPORT" => "passport", "OWNERSHIP_CERTIFICATE" => "ownership", "VALUATION_EVIDENCE" => "value-proof", _ => kind };
        if (fileKind is not ("photo" or "passport" or "ownership" or "value-proof"))
        {
            var records = await data.ListAsync<MedicalRecord>(x => x.RequestID == request && x.HorseID == id && x.DocumentType == kind, ct);
            Require(records.Count != 0, "NOT_FOUND", "Document not found.", 404);
            Require(records.Count == 1, "DOCUMENT_SELECTION_REQUIRED", "Select a unique medical document by its record ID.", 409);
            Require(records[0].UploadedFileUrl is not null, "NOT_FOUND", "File not found.", 404);
            return await files.ReadAsync(records[0].UploadedFileUrl!, ct);
        }
        return await ReadHorseAsync(horse, fileKind, ct);
    }
    private async Task<(byte[] Bytes, string ContentType)> ReadHorseAsync(Horse horse, string kind, CancellationToken ct)
    {
        ValidateKind(kind);
        var key = kind switch { "photo" => horse.PhotoUrl, "passport" => horse.PassportScanUrl, "ownership" => horse.OwnershipCertificateFileUrl, _ => horse.ValuationDocumentFileUrl };
        Require(key is not null, "NOT_FOUND", "File not found.", 404);
        return await files.ReadAsync(key!, ct);
    }
    private static void ValidateKind(string kind) => Require(kind is "photo" or "passport" or "ownership" or "value-proof", "VALIDATION_ERROR", "Unknown fileType.", 400);
}
