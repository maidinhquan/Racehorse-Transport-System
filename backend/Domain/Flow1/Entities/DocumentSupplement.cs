namespace Domain.Flow1.Entities;

/// <summary>Yêu cầu bổ sung giấy tờ do Specialist gửi khách (bảng DOCUMENT_REQUEST).</summary>
public sealed class DocumentSupplement
{
    public string RequestDocID { get; set; } = null!;
    public string RequestID { get; set; } = null!;
    public string KeyName { get; set; } = null!;
    public string Scope { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string Status { get; set; } = "OPEN";
    public string CreatedBy { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? FulfilledAtUtc { get; set; }
}
