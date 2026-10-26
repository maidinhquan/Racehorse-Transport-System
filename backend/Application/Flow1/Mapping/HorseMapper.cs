using Domain.Flow1.Entities;
namespace Application.Flow1.Mapping;
public static class HorseMapper
{
    public static object View(Horse horse) => new
    {
        id = horse.HorseID, name = horse.Name, breed = horse.Breed, sex = horse.Sex,
        dob = horse.DOB?.ToString("yyyy-MM-dd"), microchip = horse.Microchip_ISO,
        value = horse.DeclaredValueVnd?.ToString("0"), currency = "VND",
        passport = new { number = horse.FEI_Passport_No, authority = horse.PassportIssuedBy,
            issueDate = horse.PassportIssuedDate?.ToString("yyyy-MM-dd"), expiryDate = horse.PassportExpiryDate?.ToString("yyyy-MM-dd"),
            scan = File(horse, "passport", horse.PassportScanUrl) },
        healthNotes = horse.SpecialHealthNotes,
        photo = File(horse, "photo", horse.PhotoUrl), ownership = File(horse, "ownership", horse.OwnershipCertificateFileUrl),
        valueProof = File(horse, "value-proof", horse.ValuationDocumentFileUrl),
        color = (string?)null, fluDate = (string?)null, vetName = (string?)null, vetPhone = (string?)null,
        unsupportedFields = new[] { "color", "fluDate", "vetName", "vetPhone" }
    };
    private static object? File(Horse horse, string kind, string? key) => key is null ? null :
        new { name = kind + Path.GetExtension(key), url = $"/api/customer/horses/{horse.HorseID}/files/{kind}" };
}
