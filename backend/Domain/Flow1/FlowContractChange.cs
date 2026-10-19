using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Flow1;

[Table("FLOW1_CONTRACT_CHANGE")]
public sealed class FlowContractChange
{
    [Key, Column(TypeName = "varchar(50)")] public string ChangeID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string ContractID { get; set; } = null!;
    [Column(TypeName = "varchar(20)")] public string Status { get; set; } = "PENDING";
    [Column(TypeName = "nvarchar(1000)")] public string Reason { get; set; } = null!;
    [Column(TypeName = "nvarchar(1000)")] public string? Decision { get; set; }
    [Column(TypeName = "varchar(50)")] public string? DecidedBy { get; set; }
    public DateTime RequestedAtUtc { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
}

[Table("FLOW1_CONTRACT_CHANGE_FIELD")]
public sealed class FlowContractChangeField
{
    [Key, Column(TypeName = "varchar(50)")] public string FieldID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string ChangeID { get; set; } = null!;
    [Column(TypeName = "varchar(20)")] public string FieldName { get; set; } = null!;
}

[Table("FLOW1_CONTRACT_EVENT")]
public sealed class FlowContractEvent
{
    [Key, Column(TypeName = "varchar(50)")] public string EventID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string ContractID { get; set; } = null!;
    [Column(TypeName = "varchar(50)")] public string ActorID { get; set; } = null!;
    [Column(TypeName = "varchar(40)")] public string Action { get; set; } = null!;
    [Column(TypeName = "nvarchar(1000)")] public string Reason { get; set; } = null!;
    public DateTime AtUtc { get; set; }
    public DateTime? PreviousDeadline { get; set; }
    public DateTime? NewDeadline { get; set; }
}
