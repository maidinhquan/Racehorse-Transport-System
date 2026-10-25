namespace Domain.Flow1.Entities;

public sealed class MedicalRecord
{
    public string RecordID { get; set; } = null!;
    public string HorseID { get; set; } = null!;
    public string RequestID { get; set; } = null!;
    public string? VerifiedBy { get; set; }
    public string? DocumentType { get; set; }
    public string? RequirementStatus { get; set; }
    public string? DocumentStatus { get; set; }
    public string? UploadedFileUrl { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
