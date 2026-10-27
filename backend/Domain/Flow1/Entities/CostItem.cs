namespace Domain.Flow1.Entities;

public sealed class CostItem
{
    public string CostItemID { get; set; } = null!;
    public string ContractID { get; set; } = null!;
    public string? CategoryName { get; set; }
    public string? SubcodeName { get; set; }
    public string? Bearer { get; set; }
    public string CurrencyCode { get; set; } = null!;
    public decimal? TotalMoney { get; set; }
    public string? EvidenceUrl { get; set; }
}
