using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record ExtendContractDeadlineInput([Range(1, int.MaxValue)] int ContractVersion,
    [Required, RegularExpression("^[a-f0-9]{64}$")] string DocumentHash,
    [Range(0, int.MaxValue)] int ExpectedExtensionVersion, DateTimeOffset NewDeadline,
    [Required, StringLength(2000)] string Reason);
public sealed record ContractDeadlineExtension(string Key, string InputHash, string Actor, string Reason,
    string ContractId, string RequestId, int ContractVersion, string DocumentHash, int ExtensionVersion,
    DateTimeOffset OriginalDeadline, DateTimeOffset PreviousDeadline, DateTimeOffset NewDeadline, DateTimeOffset AtUtc);
public sealed record ContractDeadlineHistoryItem(int Version, DateTimeOffset PreviousDeadline, DateTimeOffset NewDeadline,
    DateTimeOffset AtUtc, string? Reason, string? Actor);
public sealed record ContractDeadlineView(string ContractId, int Version, DateTimeOffset OriginalCompletionDeadline,
    DateTimeOffset EffectiveCompletionDeadline, bool Overdue, bool CanExtend, ContractDeadlineHistoryItem[] History);
