namespace Domain.Flow1.Entities;

public sealed class RequestAssessment
{
    public string ReviewID { get; set; } = null!;
    public string RequestID { get; set; } = null!;
    public int RequestRevision { get; set; }
    public string CoordinatorID { get; set; } = null!;
    public string SpecialistID { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? SelectedOptionID { get; set; }
    public DateTime? CustomerDeadlineUtc { get; set; }
}

public sealed class RequestScheduleOption
{
    public string OptionID { get; set; } = null!;
    public string ReviewID { get; set; } = null!;
    public bool IsOriginal { get; set; }
    public string Mode { get; set; } = null!;
    public DateTime PickupDate { get; set; }
    public DateTime DeliveryDate { get; set; }
    public string CoordinatorResult { get; set; } = null!;
    public string CoordinatorReason { get; set; } = null!;
    public string? ChecklistVersion { get; set; }
    public string? SpecialistResult { get; set; }
    public string? SpecialistNote { get; set; }
    public string? ChecklistAssessmentJson { get; set; }
}
