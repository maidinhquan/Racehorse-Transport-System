using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Flow1;

[Table("COST_RATE")]
public sealed class FlowCostRate
{
    [Key, Column(TypeName = "varchar(50)")] public string CostRateID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string Code { get; set; } = null!;
    [Column(TypeName = "varchar(20)")] public string CostGroup { get; set; } = null!;
    [Column(TypeName = "varchar(40)")] public string CalculationUnit { get; set; } = null!;
    [Column(TypeName = "decimal(18,6)")] public decimal Rate { get; set; }
    [Column(TypeName = "varchar(3)")] public string CurrencyCode { get; set; } = "VND";
    public bool IsActive { get; set; }
    [Timestamp, Column(TypeName = "rowversion")] public byte[] RowVersion { get; set; } = null!;
}

[Table("COST_ITEM")]
public sealed class FlowCostItem
{
    [Key, Column(TypeName = "varchar(50)")] public string CostItemID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string ContractID { get; set; } = null!;
    [Column(TypeName = "nvarchar(100)")] public string? CategoryName { get; set; }
    [Column(TypeName = "nvarchar(100)")] public string? SubcodeName { get; set; }
    [Column(TypeName = "varchar(50)")] public string? Bearer { get; set; }
    [Column(TypeName = "varchar(3)")] public string CurrencyCode { get; set; } = "VND";
    [Column(TypeName = "decimal(12,2)")] public decimal? TotalMoney { get; set; }
    [Column(TypeName = "varchar(500)")] public string? EvidenceUrl { get; set; }
}
