using Application.Flow1.Interfaces;
using Application.DTOs.Flow1;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestDocumentsService(IDataSession data, AccessService access, IPrivateFiles files)
{
    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(string actor, string id, string recordId, bool manager, CancellationToken ct)
    {
        await access.RequestAsync(id, actor, manager, ct);
        var record = await data.FindAsync<MedicalRecord>(ct, recordId);
        Require(record is not null && record.RequestID == id && record.UploadedFileUrl is not null,
            "NOT_FOUND", "Document not found.", 404);
        Require((await data.ListAsync<RequestHorse>(x => x.RequestID == id && x.HorseID == record!.HorseID, ct)).Any(),
            "NOT_FOUND", "Horse not in request.", 404);
        return await files.ReadAsync(record!.UploadedFileUrl!, ct);
    }
    public async Task<object> UploadAsync(string actor, string id, string horse, string documentType, DateTime? expiry, UploadedFile upload, CancellationToken ct)
    {
        var row = await access.RequestAsync(id, actor, false, ct);
        Require(row.Status is "DRAFT" or "CHANGES_REQUESTED", "INVALID_STATE", "Request documents cannot be changed now.");
        Require((await data.ListAsync<RequestHorse>(x => x.RequestID == id && x.HorseID == horse, ct)).Any(), "NOT_FOUND", "Horse not in request.", 404);
        var type = Required(documentType, 50);
        Require(System.Text.RegularExpressions.Regex.IsMatch(type, @"\A[A-Z][A-Z0-9_]*\z"), "VALIDATION_ERROR", "Invalid document type.", 400);
        var key = await files.PutAsync(upload, false, ct);
        return await data.WriteAsync<object>(async token =>
        {
            row = await access.RequestAsync(id, actor, false, token);
            Require(row.Status is "DRAFT" or "CHANGES_REQUESTED", "INVALID_STATE", "Request changed during upload.");
            Require((await data.ListAsync<RequestHorse>(x => x.RequestID == id && x.HorseID == horse, token)).Any(), "NOT_FOUND", "Horse not in request.", 404);
            var record = new MedicalRecord { RequestID = id, HorseID = horse, DocumentType = type,
                RequirementStatus = "MANDATORY", DocumentStatus = "PENDING_REVIEW", UploadedFileUrl = key, ExpiryDate = expiry };
            data.Add(record); await data.SaveAsync(token);
            return new { recordId = record.RecordID, requestId = id, horseId = horse, documentType = type,
                documentStatus = record.DocumentStatus, uploadedFileUrl = $"/api/customer/requests/{id}/documents/{record.RecordID}", expiryDate = expiry };
        }, ct);
    }
}
