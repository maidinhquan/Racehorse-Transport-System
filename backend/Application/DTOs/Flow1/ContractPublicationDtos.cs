using Application.Interfaces.Flow1;

namespace Application.DTOs.Flow1;

public sealed record PublishContractInput(int ExpectedReviewVersion, DateTimeOffset CompletionDeadline);
public sealed record ContractPdfModel(Dictionary<string, string> Values, Dictionary<string, string>[] Horses);
public sealed record ContractPublication(string ContractId, string RequestId, string CustomerId,
    int ContractVersion, int RequestVersion, int PlanVersion, int ReviewVersion, string TemplateVersion,
    DateTimeOffset CompletionDeadline, ContractDocumentResult Document, ContractPdfModel FrozenModel, string DraftHash,
    string OperationKey, string InputHash, string Actor, DateTime IssuedAtUtc,
    string Outcome = "COMMITTED", string? Reason = null);
public sealed record PublishedContractView(string ContractId, int Version, string Status, string Currency,
    decimal Total, decimal Deposit, DateTimeOffset OriginalCompletionDeadline,
    string DocumentHash, long DocumentSizeBytes, string TemplateVersion, bool Overdue, bool RecoveryRequired,
    DateTimeOffset? EffectiveCompletionDeadline = null, int DeadlineVersion = 0);
