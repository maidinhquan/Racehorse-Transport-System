namespace Domain.Flow1.Entities;

public sealed class CostRate
{
    public string CostRateID { get; set; } = null!;
    public string Code { get; set; } = null!;
    public string CostGroup { get; set; } = null!;
    public string CalculationUnit { get; set; } = null!;
    public decimal Rate { get; set; }
    public string CurrencyCode { get; set; } = null!;
    public bool IsActive { get; set; }
}
