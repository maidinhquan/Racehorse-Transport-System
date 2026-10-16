using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Exceptions;
using Application.Interfaces.Flow1;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Data.SqlClient;

namespace Infrastructure.Storage;

/// <summary>SQL-only state; retained legacy hashes require committed SQL import receipts, never a business-state fallback.</summary>
public sealed class SqlFlow1StateStore(HorseTransportDbContext context, TimeProvider clock, string? legacyRoot = null) : IFlow1StateStore
{
    private const int MaxDocumentBytes = 2 * 1024 * 1024;
    private const int MaxOwnerBytes = 8 * 1024 * 1024;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private bool legacyChecked;
    private async Task CheckLegacyCutover(CancellationToken ct)
    {
        if (legacyChecked || legacyRoot is null) return;
        Dictionary<string, byte[]> sources;
        try { sources = LegacyFlow1Sources.Read(legacyRoot); }
        catch (Exception e) when (e is InvalidDataException or IOException or UnauthorizedAccessException)
        { throw new BusinessRuleException("Legacy sources need operator review; no fallback was attempted.", 503, "FLOW1_STATE_IMPORT_REQUIRED"); }
        if (sources.Count == 0) { legacyChecked = true; return; }
        // Only committed SQL receipts authorize retained source hashes. No legacy payload is parsed here.
        // A separate read connection avoids taking global shared locks in the business transaction.
        await using var connection = new SqlConnection(context.Database.GetConnectionString()); await connection.OpenAsync(ct);
        var receipts = new HashSet<(string, string)>();
        try
        {
            foreach (var table in new[] { "HORSE", "TRANSPORT_REQUEST", "CONTRACT", "USER" })
            {
                await using var command = new SqlCommand($"SELECT JSON_QUERY(Flow1StateJson,'$.legacySources') FROM dbo.[{table}] WHERE Flow1StateJson IS NOT NULL;", connection);
                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct)) if (!reader.IsDBNull(0))
                    foreach (var r in JsonSerializer.Deserialize<Flow1LegacySourceReceipt[]>(reader.GetString(0), Json) ?? []) receipts.Add((r.Path, r.Sha256));
            }
        }
        catch (SqlException e) when (e.Number is 207 or 208)
        { throw new BusinessRuleException("Flow 1 SQL state schema is not ready.", 503, "FLOW1_SQL_SCHEMA_REQUIRED"); }
        if (sources.Any(s => !receipts.Contains((s.Key, LegacyFlow1Sources.Hash(s.Value)))))
            throw new BusinessRuleException("Legacy source has no matching committed SQL import receipt; files were preserved.", 503, "FLOW1_STATE_IMPORT_REQUIRED");
        legacyChecked = true;
    }
    internal sealed record Envelope(int SchemaVersion, Dictionary<string, Flow1StateDocument> Documents, Flow1LegacySourceReceipt[]? LegacySources = null);
    private sealed record OwnerState(long Revision, Envelope Value);
    internal static (string Table, string Key) Owner(string type) => type switch
    {
        "horse" => ("HORSE", "HorseID"),
        "request" or "review" or "plan" => ("TRANSPORT_REQUEST", "RequestID"),
        "contract" or "publication" or "contract-otp" or "acceptance" or "lifecycle" or "extensions" or "payment-ledger" or "deployment" => ("CONTRACT", "ContractID"),
        "otp-account" => ("USER", "UserID"),
        _ => throw new ArgumentException("Unsupported Flow 1 state type.")
    };
    private static string Key(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !Regex.IsMatch(value, @"\A[A-Za-z0-9_-]{1,50}\z", RegexOptions.CultureInvariant))
            throw new ArgumentException("Flow 1 state keys must be 1-50 ASCII identifier characters.");
        return value.ToLowerInvariant();
    }
    private DbCommand Command(string sql)
    {
        var command = context.Database.GetDbConnection().CreateCommand(); command.CommandText = sql;
        command.CommandTimeout = 30;
        command.Transaction = context.Database.CurrentTransaction?.GetDbTransaction();
        return command;
    }
    private static void Parameter(DbCommand command, string name, object value, DbType type, int size = 0)
    {
        var p = command.CreateParameter(); p.ParameterName = name; p.Value = value; p.DbType = type;
        if (size != 0) p.Size = size;
        command.Parameters.Add(p);
    }
    private async Task<OwnerState?> Load(string type, string id, bool write, CancellationToken ct)
    {
        var owner = Owner(type);
        // ADO commands use the EF-owned connection and transaction; EF does not map or overwrite these columns.
        await using var command = Command($"SELECT [Flow1StateJson], [Flow1StateVersion] FROM [dbo].[{owner.Table}] {(write ? "WITH (UPDLOCK, ROWLOCK)" : "")} WHERE [{owner.Key}]=@id;");
        Parameter(command, "@id", id, DbType.AnsiString, 50);
        DbDataReader opened;
        try { opened = await command.ExecuteReaderAsync(ct); }
        catch (SqlException e) when (e.Number is 207 or 208)
        { throw new BusinessRuleException("Flow 1 SQL state schema is not ready. Apply/verify migration 004 on the explicitly authorized database.", 503, "FLOW1_SQL_SCHEMA_REQUIRED"); }
        await using var reader = opened;
        if (!await reader.ReadAsync(ct)) return null;
        var revision = reader.GetInt64(1);
        if (revision < 0) throw new InvalidDataException("Invalid Flow 1 SQL row version.");
        if (reader.IsDBNull(0))
        {
            if (revision != 0) throw new InvalidDataException("Flow 1 SQL state is missing for a previously written owner.");
            return new(0, new(1, new()));
        }
        var raw = reader.GetString(0);
        if (revision == 0 || System.Text.Encoding.UTF8.GetByteCount(raw) > MaxOwnerBytes)
            throw new InvalidDataException("Invalid or oversized Flow 1 SQL state.");
        var envelope = JsonSerializer.Deserialize<Envelope>(raw, Json);
        if (envelope is null || envelope.SchemaVersion != 1 || envelope.Documents is null || envelope.Documents.Count == 0)
            throw new InvalidDataException("Unsupported Flow 1 SQL state envelope.");
        foreach (var (name, document) in envelope.Documents)
        {
            if (Key(name) != name || Owner(name) != owner || document is null || document.SchemaVersion != 1 || document.AggregateType != name ||
                document.AggregateId != id || document.Revisions is null || document.Revisions.Count == 0 ||
                document.Revisions.Where((r, i) => r is null || r.Version != i + 1 || r.Payload.ValueKind == JsonValueKind.Undefined ||
                    string.IsNullOrWhiteSpace(r.OperationId) || string.IsNullOrWhiteSpace(r.ActorUserId) || string.IsNullOrWhiteSpace(r.Action)).Any() ||
                document.Revisions.Select(r => r.OperationId).Distinct(StringComparer.Ordinal).Count() != document.Revisions.Count ||
                JsonSerializer.SerializeToUtf8Bytes(document, Json).Length > MaxDocumentBytes)
                throw new InvalidDataException("Invalid Flow 1 SQL state history/owner binding.");
            var latest = document.Revisions[^1].Payload;
            if (name == "review" && latest.TryGetProperty("pending", out var pending) && pending.ValueKind != JsonValueKind.Null ||
                name == "publication" && latest.TryGetProperty("outcome", out var outcome) && outcome.GetString() == "PREPARED" ||
                name == "acceptance" && latest.TryGetProperty("operation", out var operation) && operation.TryGetProperty("outcome", out var result) && result.GetString() == "PREPARED")
                throw new BusinessRuleException("Legacy pending state must be reconciled during import before use.", 409, "FLOW1_STATE_RECONCILIATION_REQUIRED");
        }
        return new(revision, envelope);
    }
    public async Task<Flow1StateDocument?> ReadAsync(string type, string id, CancellationToken ct = default)
    {
        type = Key(type); id = Key(id); Owner(type);
        await CheckLegacyCutover(ct);
        var opened = context.Database.GetDbConnection().State != ConnectionState.Open;
        if (opened) await context.Database.OpenConnectionAsync(ct);
        try { return (await Load(type, id, false, ct))?.Value.Documents.GetValueOrDefault(type); }
        finally { if (opened) await context.Database.CloseConnectionAsync(); }
    }
    public async Task<Flow1StateRevision> AppendAsync(string type, string id, int expectedVersion,
        string operationId, string actorUserId, string action, JsonElement payload, CancellationToken ct = default)
    {
        type = Key(type); id = Key(id); var owner = Owner(type);
        await CheckLegacyCutover(ct);
        if (context.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Append Flow 1 state inside the same SQL transaction as its business changes.");
        if (expectedVersion < 0 || string.IsNullOrWhiteSpace(operationId) || operationId.Length > 128 ||
            string.IsNullOrWhiteSpace(actorUserId) || actorUserId.Length > 50 || string.IsNullOrWhiteSpace(action) || action.Length > 100 ||
            payload.ValueKind == JsonValueKind.Undefined)
            throw new ArgumentException("State version, operation, actor, action and payload are required.");
        if (System.Text.Encoding.UTF8.GetByteCount(payload.GetRawText()) > MaxDocumentBytes)
            throw new InvalidDataException("Flow 1 state payload exceeds the configured limit.");
        var state = await Load(type, id, true, ct) ?? throw new InvalidOperationException("Create/persist the SQL owner row in this transaction before appending its state.");
        var previous = state.Value.Documents.GetValueOrDefault(type);
        var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(payload, Json)));
        var repeat = previous?.Revisions.SingleOrDefault(r => r.OperationId == operationId);
        if (repeat is not null)
        {
            if (repeat.RequestHash != hash || repeat.ActorUserId != actorUserId || repeat.Action != action)
                throw new BusinessRuleException("Idempotency key was used with another state input.", 409, "IDEMPOTENCY_KEY_REUSED");
            return repeat;
        }
        var current = previous?.Revisions.Count ?? 0;
        if (current != expectedVersion) throw new BusinessRuleException("State changed; reload before saving.", 409, "STALE_VERSION");
        var revision = new Flow1StateRevision(current + 1, operationId, hash, actorUserId, action, clock.GetUtcNow().UtcDateTime, payload.Clone());
        var document = new Flow1StateDocument(1, type, id, [.. previous?.Revisions ?? [], revision]);
        if (JsonSerializer.SerializeToUtf8Bytes(document, Json).Length > MaxDocumentBytes)
            throw new InvalidDataException("Flow 1 state history exceeds the configured limit.");
        state.Value.Documents[type] = document;
        var bytes = JsonSerializer.SerializeToUtf8Bytes(state.Value, Json);
        if (bytes.Length > MaxOwnerBytes) throw new InvalidDataException("Flow 1 owner state exceeds the configured limit.");
        await using var command = Command($"UPDATE [dbo].[{owner.Table}] SET [Flow1StateJson]=@json, [Flow1StateVersion]=[Flow1StateVersion]+1 WHERE [{owner.Key}]=@id AND [Flow1StateVersion]=@version;");
        Parameter(command, "@json", System.Text.Encoding.UTF8.GetString(bytes), DbType.String, -1);
        Parameter(command, "@id", id, DbType.AnsiString, 50); Parameter(command, "@version", state.Revision, DbType.Int64);
        if (await command.ExecuteNonQueryAsync(ct) != 1) throw new BusinessRuleException("SQL owner state changed; retry the transaction.", 409, "STALE_VERSION");
        return revision;
    }
}
