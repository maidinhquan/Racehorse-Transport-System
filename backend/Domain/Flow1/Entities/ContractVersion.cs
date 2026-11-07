namespace Domain.Flow1.Entities;

public sealed class ContractVersion
{
    public string ContractID { get; set; } = null!;
    public int VersionNo { get; set; }
    public string VersionStatus { get; set; } = null!;
    public string ContentSnapshot { get; set; } = null!;
    public string? PdfUrl { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? PublishedBy { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public DateTime? TermsAcceptedAtUtc { get; set; }
    public DateTime? SignedAtUtc { get; set; }
    public string? SignerEmail { get; set; }
}
