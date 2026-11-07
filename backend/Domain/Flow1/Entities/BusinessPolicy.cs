namespace Domain.Flow1.Entities;

public sealed class BusinessPolicy
{
    public string PolicyID { get; set; } = null!;
    public string Code { get; set; } = null!;
    public string ValueType { get; set; } = null!;
    public decimal? NumberValue { get; set; }
    public string? TextValue { get; set; }
    public bool? BoolValue { get; set; }
    public string? Unit { get; set; }
    public string ScopeType { get; set; } = null!;
    public string? ScopeID { get; set; }
    public string Description { get; set; } = null!;
    public string? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
}
