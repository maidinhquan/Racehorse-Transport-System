using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record ContractLifecycleCommand([Range(1, int.MaxValue)] int ContractVersion,
    [Required, RegularExpression("^[a-f0-9]{64}$")] string DocumentHash,
    [Range(0, int.MaxValue)] int ExpectedLifecycleVersion, [Required, StringLength(2000)] string Reason);
// Immutable event, committed with the SQL transition; contains no OTP, pricing internals or file bytes.
public sealed record ContractLifecycleEvent(string Key, string InputHash, string Actor, string Action, string Reason,
    string ContractId, string RequestId, int ContractVersion, string DocumentHash, DateTime AtUtc, string? ReplacementContractId = null);
public sealed record ContractLifecycleHistoryItem(string Action, string? Reason, DateTime AtUtc, string? ReplacementContractId, string? Actor);
public sealed record ContractLifecycleView(string ContractId, string Status, int Version, bool CanDecline, bool CanExpire,
    bool CanReissue, ContractLifecycleHistoryItem[] History);
public sealed record ContractVersionView(string ContractId, string Status, int Version, decimal Total, decimal Deposit, bool HasPublishedPdf);
