namespace Domain.Flow1.Entities;

public sealed class RequestHorse
{
    public string? CareInstructions { get; set; }
    public string RequestID { get; set; } = null!;
    public string HorseID { get; set; } = null!;
}
