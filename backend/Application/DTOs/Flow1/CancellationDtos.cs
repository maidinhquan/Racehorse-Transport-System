namespace Application.DTOs.Flow1;

public sealed record RequestCancellationInput(int ExpectedVersion, string Reason);
public sealed record DecideCancellationInput(int ExpectedVersion, int ExpectedLedgerVersion, int ExpectedDeadlineVersion,
    string Reason, bool ReconciliationConfirmed = false);
public sealed record CancellationEvent(string Key, string Hash, string Actor, string Action, string Id, string Status,
    string CustomerReason, DateTimeOffset RequestedAtUtc, string? DecisionReason, DateTimeOffset AtUtc);
public sealed record CancellationItem(string Id, string Status, string CustomerReason, DateTimeOffset RequestedAtUtc, string? DecisionReason, DateTimeOffset AtUtc);
public sealed record CancellationsView(string ContractId, int Version, bool CanRequest, bool CanReview, CancellationItem[] Items);
