using System.Text.Json;

namespace Application.Interfaces.Flow1;

public sealed record Flow1StateRevision(int Version, string OperationId, string RequestHash,
    string ActorUserId, string Action, DateTime CreatedAtUtc, JsonElement Payload);
public sealed record Flow1StateDocument(int SchemaVersion, string AggregateType, string AggregateId,
    IReadOnlyList<Flow1StateRevision> Revisions);

/// <summary>
/// Structured, versioned SQL state on existing owner rows. Append participates in the caller's
/// SQL transaction and never commits. The owner row must already exist in that transaction.
/// This port is introduced before the separately tested application cutover.
/// </summary>
public interface IFlow1StateStore
{
    Task<Flow1StateDocument?> ReadAsync(string type, string id, CancellationToken ct = default);
    Task<Flow1StateRevision> AppendAsync(string type, string id, int expectedVersion,
        string operationId, string actorUserId, string action, JsonElement payload, CancellationToken ct = default);
}
