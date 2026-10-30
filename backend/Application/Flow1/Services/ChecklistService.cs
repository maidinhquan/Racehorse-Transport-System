using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class ChecklistService(IDataSession data, AccessService access)
{
    public async Task<object> GetAsync(string actor, string id, CancellationToken ct)
    {
        await access.RequestAsync(id, actor, false, ct);
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == id, ct);
        var ids = links.Select(x => x.HorseID).ToArray();
        var horses = await data.ListAsync<Horse>(h => ids.Contains(h.HorseID), ct);
        var medical = await data.ListAsync<MedicalRecord>(m => m.RequestID == id, ct);
        return new { requestId = id, horses = horses.Select(h => new { horseId = h.HorseID,
            documents = new[] { Item(h.HorseID,"photo",h.PhotoUrl), Item(h.HorseID,"passport",h.PassportScanUrl), Item(h.HorseID,"ownership",h.OwnershipCertificateFileUrl), Item(h.HorseID,"value-proof",h.ValuationDocumentFileUrl) },
            medical = medical.Where(m => m.HorseID == h.HorseID).Select(m => new { id = m.RecordID, type = m.DocumentType, status = m.DocumentStatus, expiryDate = m.ExpiryDate }).ToArray() }).ToArray() };
    }
    private static object Item(string horse, string kind, string? key) => new { key = kind, scope = horse,
        required = kind != "value-proof", status = key is null ? "MISSING" : "SUBMITTED",
        file = key is null ? null : new { url = $"/api/customer/horses/{horse}/files/{kind}" } };
}
