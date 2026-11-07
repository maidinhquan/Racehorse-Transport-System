namespace Domain.Flow1.Entities;

public sealed class Horse
{
    public string? PassportIssuedBy { get; set; }
    public DateTime? PassportIssuedDate { get; set; }
    public DateTime? PassportExpiryDate { get; set; }
    public string? OwnershipCertificateFileUrl { get; set; }
    public string? ValuationDocumentFileUrl { get; set; }
    public decimal? DeclaredValueVnd { get; set; }
    public string? SpecialHealthNotes { get; set; }
    public string HorseID { get; set; } = null!;
    public string OwnerID { get; set; } = null!;
    public string Microchip_ISO { get; set; } = null!;
    public string? FEI_Passport_No { get; set; }
    public string Name { get; set; } = null!;
    public string? Breed { get; set; }
    public string? Sex { get; set; }
    public string? ReproductiveStatus { get; set; }
    public decimal? Weight { get; set; }
    public DateTime? DOB { get; set; }
    public string? PhotoUrl { get; set; }
    public string? PassportScanUrl { get; set; }
}
