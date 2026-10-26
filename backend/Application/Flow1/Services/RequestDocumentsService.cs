using Application.Flow1.Interfaces;
using Application.DTOs.Flow1;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class RequestDocumentsService(IDataSession data, AccessService access, IPrivateFiles files)
{
    public async Task<(byte[] Bytes, string ContentType)> SharedAsync(string actor, string id, string type, bool manager, CancellationToken ct)
    {
        var row = await access.RequestAsync(id, actor, manager, ct);
        var key = type switch { "INVITATION_LETTER" => row.InvitationLetterFileUrl,
            "COMPETITION_REGISTRATION" => row.CompetitionRegistrationFileUrl, "ATA_CARNET" => row.AtaCarnetFileUrl, _ => null };
        Require(key is not null, "NOT_FOUND", "Shared document not found.", 404);
        return await files.ReadAsync(key!, ct);
    }
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
}
