using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed class HorseFilesService(
    IDataSession data,
    AccessService access,
    HorseService horses,
    IPrivateFiles files
)
{
    public async Task<object> UploadAsync(
        string actor,
        string id,
        string kind,
        UploadedFile upload,
        CancellationToken ct
    )
    {
        await access.HorseAsync(id, actor, ct);
        await horses.EditableAsync(id, ct);
        ValidateKind(kind);
        var key = await files.PutAsync(upload, kind == "photo", ct);
        return await data.WriteAsync<object>(
            async token =>
            {
                var horse = await access.HorseAsync(id, actor, token);
                await horses.EditableAsync(id, token);
                switch (kind)
                {
                    case "photo":
                        horse.PhotoUrl = key;
                        break;
                    case "passport":
                        horse.PassportScanUrl = key;
                        break;
                    case "ownership":
                        horse.OwnershipCertificateFileUrl = key;
                        break;
                    case "value-proof":
                        horse.ValuationDocumentFileUrl = key;
                        break;
                    case "flu":
                        horse.VaccinationFileUrl = key;
                        break;
                    case "health":
                        horse.HealthCertificateFileUrl = key;
                        break;
                }
                await MarkSupplementSubmittedAsync(id, kind, key, token);
                return new
                {
                    name = Path.GetFileName(upload.FileName),
                    url = $"/api/customer/horses/{id}/files/{kind}",
                };
            },
            ct
        );
    }

    /// <summary>Nộp lại hộ chiếu / giấy sở hữu / chứng nhận giá trị: đóng yêu cầu bổ sung đang mở và báo chuyên viên có bản mới.</summary>
    private async Task MarkSupplementSubmittedAsync(string horseId, string kind, string fileKey, CancellationToken ct)
    {
        var supplementKey = kind switch
        {
            "passport" => "passport",
            "ownership" => "ownership",
            "value-proof" => "valueProof",
            "flu" => "flu",
            "health" => "health",
            _ => null
        };
        if (supplementKey is null) return;
        var opened = await data.ListAsync<DocumentSupplement>(
            x => x.Scope == horseId && x.KeyName == supplementKey && x.Status == "OPEN", ct);
        foreach (var open in opened) open.Status = "SUBMITTED";
        if (kind is not ("passport" or "flu" or "health")) return;
        var (dtCode, legacyCode) = kind switch
        {
            "passport" => ("DT-1", "PASSPORT"),
            "health" => ("DT-2", "HEALTH_CERTIFICATE"),
            "flu" => ("DT-3", "VACCINATION"),
            _ => ("", "")
        };
        foreach (var requestId in opened.Select(x => x.RequestID).Distinct())
        {
            var records = await data.ListAsync<MedicalRecord>(
                x => x.RequestID == requestId && x.HorseID == horseId && (x.DocumentType == dtCode || x.DocumentType == legacyCode), ct);
            if (records.Count == 0)
            {
                var created = new MedicalRecord
                {
                    RecordID = "LMR_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                    RequestID = requestId,
                    HorseID = horseId,
                    DocumentType = dtCode,
                    RequirementStatus = "MANDATORY",
                };
                data.Add(created);
                records.Add(created);
            }
            foreach (var record in records)
            {
                record.UploadedFileUrl = fileKey;
                record.DocumentStatus = "SUBMITTED";
            }
        }
    }

    /// <summary>Khách nộp giấy chứng nhận sức khỏe / sổ tiêm của một ngựa trong đơn (nộp mới hoặc nộp lại sau yêu cầu bổ sung).</summary>
    public async Task<object> UploadMedicalAsync(
        string actor,
        string requestId,
        string horseId,
        string documentType,
        string? expiryDate,
        UploadedFile upload,
        CancellationToken ct
    )
    {
        var (recordType, key) = documentType switch
        {
            "HEALTH_CERTIFICATE" => ("DT-2", "health"),
            "VACCINATION" => ("DT-3", "flu"),
            _ => throw Failure("VALIDATION_ERROR", "Unknown documentType.", 400),
        };
        DateTime? expiry = null;
        if (!string.IsNullOrWhiteSpace(expiryDate))
        {
            Require(
                DateTime.TryParseExact(expiryDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var parsed),
                "VALIDATION_ERROR", "expiryDate must be yyyy-MM-dd.", 400);
            expiry = DateTime.ParseExact(expiryDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }
        await RequireOpenRequestAsync(actor, requestId, horseId, ct);
        var fileKey = await files.PutAsync(upload, false, ct);
        return await data.WriteAsync<object>(
            async token =>
            {
                await RequireOpenRequestAsync(actor, requestId, horseId, token);
                var records = await data.ListAsync<MedicalRecord>(
                    x => x.RequestID == requestId && x.HorseID == horseId && (x.DocumentType == recordType || x.DocumentType == documentType),
                    token);
                if (records.Count == 0)
                {
                    var created = new MedicalRecord
                    {
                        RecordID = "LMR_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                        RequestID = requestId,
                        HorseID = horseId,
                        RequirementStatus = "MANDATORY",
                    };
                    data.Add(created);
                    records.Add(created);
                }
                // Mọi bản ghi cùng loại đều chuyển sang bản mới, tránh bản cũ "cần nộp lại" còn sót lại.
                foreach (var item in records)
                {
                    item.DocumentType = recordType;
                    item.UploadedFileUrl = fileKey;
                    item.DocumentStatus = "SUBMITTED";
                    item.ExpiryDate = expiry;
                }
                var record = records[0];
                var horse = (await data.ListAsync<Horse>(h => h.HorseID == horseId, token)).FirstOrDefault();
                if (horse is not null)
                {
                    if (key == "flu") horse.VaccinationFileUrl = fileKey;
                    else if (key == "health") horse.HealthCertificateFileUrl = fileKey;
                }
                foreach (var open in await data.ListAsync<DocumentSupplement>(
                    x => x.RequestID == requestId && x.Scope == horseId && x.KeyName == key && x.Status == "OPEN", token))
                    open.Status = "SUBMITTED";
                return new
                {
                    recordId = record.RecordID,
                    key,
                    scope = horseId,
                    status = record.DocumentStatus,
                    file = new
                    {
                        name = Path.GetFileName(upload.FileName),
                        url = $"/api/customer/requests/{requestId}/documents/{record.RecordID}",
                    },
                };
            },
            ct
        );
    }

    private async Task RequireOpenRequestAsync(string actor, string requestId, string horseId, CancellationToken ct)
    {
        var request = await access.RequestAsync(requestId, actor, false, ct);
        Require(
            request.Status is not ("CLOSED" or "CANCELLED" or "REJECTED"),
            "REQUEST_CLOSED", "Request is closed.", 409);
        Require(
            (await data.ListAsync<RequestHorse>(x => x.RequestID == requestId && x.HorseID == horseId, ct)).Any(),
            "NOT_FOUND", "Horse not in request.", 404);
    }

    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(
        string actor,
        string id,
        string kind,
        CancellationToken ct
    )
    {
        var horse = await access.HorseAsync(id, actor, ct);
        return await ReadHorseAsync(horse, kind, ct);
    }

    public async Task<(byte[] Bytes, string ContentType)> ManagerAsync(
        string actor,
        string request,
        string id,
        string kind,
        CancellationToken ct
    )
    {
        await access.RequestAsync(request, actor, true, ct);
        Require(
            (
                await data.ListAsync<RequestHorse>(
                    x => x.RequestID == request && x.HorseID == id,
                    ct
                )
            ).Any(),
            "NOT_FOUND",
            "Horse not in request.",
            404
        );
        var horse =
            await data.FindAsync<Horse>(ct, id)
            ?? throw Failure("NOT_FOUND", "Horse not found.", 404);
        var fileKind = kind switch
        {
            "PHOTO" => "photo",
            "PASSPORT" => "passport",
            "OWNERSHIP_CERTIFICATE" => "ownership",
            "VALUATION_EVIDENCE" => "value-proof",
            "EQUINE_FLU_VAX" => "flu",
            "HEALTH_CERTIFICATE" => "health",
            _ => kind,
        };
        if (fileKind is ("photo" or "passport" or "ownership" or "value-proof" or "flu" or "health"))
        {
            return await ReadHorseAsync(horse, fileKind, ct);
        }
        var records = await data.ListAsync<MedicalRecord>(
            x => x.RequestID == request && x.HorseID == id && x.DocumentType == kind,
            ct
        );
        Require(records.Count != 0, "NOT_FOUND", "Document not found.", 404);
        Require(
            records.Count == 1,
            "DOCUMENT_SELECTION_REQUIRED",
            "Select a unique medical document by its record ID.",
            409
        );
        Require(records[0].UploadedFileUrl is not null, "NOT_FOUND", "File not found.", 404);
        return await files.ReadAsync(records[0].UploadedFileUrl!, ct);
    }

    private async Task<(byte[] Bytes, string ContentType)> ReadHorseAsync(
        Horse horse,
        string kind,
        CancellationToken ct
    )
    {
        ValidateKind(kind);
        var key = kind switch
        {
            "photo" => horse.PhotoUrl,
            "passport" => horse.PassportScanUrl,
            "ownership" => horse.OwnershipCertificateFileUrl,
            "value-proof" => horse.ValuationDocumentFileUrl,
            "flu" => horse.VaccinationFileUrl,
            "health" => horse.HealthCertificateFileUrl,
            _ => null,
        };
        Require(key is not null, "NOT_FOUND", "File not found.", 404);
        return await files.ReadAsync(key!, ct);
    }

    private static void ValidateKind(string kind) =>
        Require(
            kind is "photo" or "passport" or "ownership" or "value-proof" or "flu" or "health",
            "VALIDATION_ERROR",
            "Unknown fileType.",
            400
        );
}
