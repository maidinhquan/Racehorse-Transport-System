using Application.DTOs.Flow1;
using Domain.Flow1;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private static string? OptionalText(string? value, int max)
    {
        Require(value is null || value.Length <= max, "VALIDATION_ERROR", $"Text must not exceed {max} characters.");
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
    private static ContactInput Contact(string name, string phone, string? stable, string? postal, string? instructions) =>
        new(name, phone, stable, postal, instructions);
    private static string? HorseFileKey(FlowHorse h, string kind) => kind switch
    {
        "photo" => h.PhotoUrl, "passport" => h.PassportScanUrl,
        "ownership" => h.OwnershipCertificateFileUrl, "valuation" => h.ValuationDocumentFileUrl, _ => null
    };
    private static IReadOnlyList<HorseDocumentState> HorseDocuments(FlowHorse h) =>
    [
        new("PHOTO", h.PhotoUrl is null ? "MISSING" : "UPLOADED", "photo"),
        new("PASSPORT", h.PassportScanUrl is null ? "MISSING" : "UPLOADED", "passport"),
        new("OWNERSHIP_CERTIFICATE", h.OwnershipCertificateFileUrl is null ? "MISSING" : "UPLOADED", "ownership"),
        new("VALUATION_EVIDENCE", h.ValuationDocumentFileUrl is null ? "NOT_PROVIDED" : "UPLOADED", "valuation")
    ];
    private void ValidateHorseProfile(HorseInput i)
    {
        Text(i.PassportIssuedBy, 200);
        Require(i.PassportIssuedDate is not null && i.PassportExpiryDate is not null &&
            i.PassportIssuedDate <= Application.Common.Flow1.Flow1PricingPolicy.Today(clock) &&
            i.PassportIssuedDate >= i.Dob && i.PassportExpiryDate > Application.Common.Flow1.Flow1PricingPolicy.Today(clock) &&
            i.PassportExpiryDate > i.PassportIssuedDate, "VALIDATION_ERROR", "Provide valid passport issue and expiry dates.");
        Require(i.DeclaredValueVnd is > 0 and <= 9999999999m && decimal.Truncate(i.DeclaredValueVnd.Value) == i.DeclaredValueVnd,
            "VALIDATION_ERROR", "Declared value is required in whole VND, between 1 and 9,999,999,999.");
        OptionalText(i.SpecialHealthNotes, 2000);
    }
    private static bool SameProfile(FlowHorse h, HorseInput i, string ownership, string? valuation) =>
        h.PassportIssuedBy == i.PassportIssuedBy!.Trim() && h.PassportIssuedDate == i.PassportIssuedDate!.Value.ToDateTime(TimeOnly.MinValue) &&
        h.PassportExpiryDate == i.PassportExpiryDate!.Value.ToDateTime(TimeOnly.MinValue) && h.DeclaredValueVnd == i.DeclaredValueVnd &&
        h.SpecialHealthNotes == OptionalText(i.SpecialHealthNotes, 2000) && h.OwnershipCertificateFileUrl == ownership && h.ValuationDocumentFileUrl == valuation;
    private static void ApplyProfile(FlowHorse h, HorseInput i, string ownership, string? valuation)
    {
        h.PassportIssuedBy = i.PassportIssuedBy!.Trim(); h.PassportIssuedDate = i.PassportIssuedDate!.Value.ToDateTime(TimeOnly.MinValue);
        h.PassportExpiryDate = i.PassportExpiryDate!.Value.ToDateTime(TimeOnly.MinValue); h.DeclaredValueVnd = i.DeclaredValueVnd;
        h.SpecialHealthNotes = OptionalText(i.SpecialHealthNotes, 2000); h.OwnershipCertificateFileUrl = ownership; h.ValuationDocumentFileUrl = valuation;
    }
    private static void ApplyWizard(FlowRequest r, FlowRequestInput i)
    {
        r.PickupStableName = OptionalText(i.PickupContact.StableName, 200); r.PickupPostalCode = OptionalText(i.PickupContact.PostalCode, 20);
        r.PickupInstructions = OptionalText(i.PickupContact.Instructions, 1000);
        r.DeliveryStableName = OptionalText(i.Receiver.StableName, 200); r.DeliveryPostalCode = OptionalText(i.Receiver.PostalCode, 20);
        r.DeliveryInstructions = OptionalText(i.Receiver.Instructions, 1000); r.CareInstructions = OptionalText(i.CareInstructions, 2000);
    }
    private static bool SameWizard(FlowRequest r, FlowRequestInput i) =>
        r.PickupStableName == OptionalText(i.PickupContact.StableName, 200) && r.PickupPostalCode == OptionalText(i.PickupContact.PostalCode, 20) &&
        r.PickupInstructions == OptionalText(i.PickupContact.Instructions, 1000) && r.DeliveryStableName == OptionalText(i.Receiver.StableName, 200) &&
        r.DeliveryPostalCode == OptionalText(i.Receiver.PostalCode, 20) && r.DeliveryInstructions == OptionalText(i.Receiver.Instructions, 1000) &&
        r.CareInstructions == OptionalText(i.CareInstructions, 2000);
    private async Task<bool> SameHorseCare(string id, FlowRequestInput i, CancellationToken ct) =>
        (await db.QueryAsync<FlowRequestHorse>(x => x.RequestID == id, ct)).All(x =>
            i.Horses.Any(h => h.HorseId == x.HorseID && OptionalText(h.CareInstructions, 2000) == x.CareInstructions));
    private async Task<decimal?> HorseValue(FlowRequestInput i, string actor, CancellationToken ct)
    {
        decimal total = 0; var complete = true;
        foreach (var selected in i.Horses)
        {
            var h = await db.FindAsync<FlowHorse>(selected.HorseId, ct);
            Require(h is not null && h.OwnerID == actor, "FORBIDDEN", "Horse does not belong to this account.");
            Check(h.RowVersion, selected.Version);
            if (h.DeclaredValueVnd is > 0) total += h.DeclaredValueVnd.Value; else complete = false;
        }
        Require(total <= 9999999999m, "VALIDATION_ERROR", "Total declared value exceeds the supported VND limit.");
        return complete ? total : null; // Existing legacy profiles may not have VND values yet.
    }
    private async Task<RequestSharedKeys> PrepareShared(RequestSharedUploads? uploads, CancellationToken ct) => new(
        uploads?.InvitationLetter is null ? null : await files.PutAsync(uploads.InvitationLetter, false, ct),
        uploads?.CompetitionRegistration is null ? null : await files.PutAsync(uploads.CompetitionRegistration, false, ct),
        uploads?.AtaCarnet is null ? null : await files.PutAsync(uploads.AtaCarnet, false, ct));
    private sealed record RequestSharedKeys(string? Invitation, string? Competition, string? Ata);
    private static void ApplyShared(FlowRequest r, RequestSharedKeys keys)
    {
        r.InvitationLetterFileUrl = keys.Invitation ?? r.InvitationLetterFileUrl;
        r.CompetitionRegistrationFileUrl = keys.Competition ?? r.CompetitionRegistrationFileUrl;
        r.AtaCarnetFileUrl = keys.Ata ?? r.AtaCarnetFileUrl;
    }
    private static bool SameShared(FlowRequest r, RequestSharedKeys? k) => r.InvitationLetterFileUrl == k?.Invitation &&
        r.CompetitionRegistrationFileUrl == k?.Competition && r.AtaCarnetFileUrl == k?.Ata;
    private static string? SharedFile(FlowRequest r, string type) => type switch
    {
        "INVITATION_LETTER" => r.InvitationLetterFileUrl, "COMPETITION_REGISTRATION" => r.CompetitionRegistrationFileUrl,
        "ATA_CARNET" => r.AtaCarnetFileUrl, _ => null
    };
    private static IReadOnlyList<FlowRequestDocument> SharedDocuments(FlowRequest r) => SharedTypes.Select(type => new FlowRequestDocument(type,null,type,SharedFile(r,type) is null?"NOT_PROVIDED":"UPLOADED")).ToArray();
    private static readonly string[] SharedTypes = ["INVITATION_LETTER", "COMPETITION_REGISTRATION", "ATA_CARNET"];
}
