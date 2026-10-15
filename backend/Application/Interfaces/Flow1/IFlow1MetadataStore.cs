using System.Text.Json;

namespace Application.Interfaces.Flow1;

public sealed record Flow1MetadataRevision(int Version, string OperationId, string RequestHash,
    string ActorUserId, string Action, DateTime CreatedAtUtc, JsonElement Payload);

public sealed record Flow1MetadataDocument(int SchemaVersion, string AggregateType, string AggregateId,
    IReadOnlyList<Flow1MetadataRevision> Revisions);

/// <summary>Private, versioned sidecar storage. Not a substitute for the SQL money ledger.</summary>
public interface IFlow1MetadataStore
{
    Task<Flow1MetadataDocument?> ReadAsync(string type, string id, CancellationToken ct = default);
    Task<Flow1MetadataRevision> AppendAsync(string type, string id, int expectedVersion,
        string operationId, string actorUserId, string action, JsonElement payload, CancellationToken ct = default);
}
