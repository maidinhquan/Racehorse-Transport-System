using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Infrastructure.Storage;

public sealed record Flow1ImportIssue(string Code, string Source);
public sealed record Flow1ImportReport(string Database, string SourceFingerprint, int Documents, int Owners, int Revisions,
    int PrivateFiles, bool Applied, bool ParityVerified, Flow1ImportIssue[] Issues, Flow1ImportIssue[] Warnings);

// Offline maintenance API, deliberately not registered with WebApi DI. Never changes business fields or source files.
public sealed class Flow1LegacyStateImporter(HorseTransportDbContext db, string sourceRoot, string privateFilesRoot)
{
    private static readonly JsonSerializerOptions Json = LegacyFlow1Sources.Json;
    private sealed record Entry(string Path, string Sha, Flow1StateDocument Document);
    private sealed record OwnerWrite(string Table, string Key, string Id, string Json, long OldVersion, long NewVersion, bool Changed);
    private sealed record Plan(Flow1ImportReport Report, OwnerWrite[] Writes, Dictionary<string, byte[]> Sources);
    internal sealed record Business(List<Horse> Horses, List<TransportRequest> Requests, List<RequestHorseMapping> Mappings,
        List<Contract> Contracts, List<Invoice> Invoices, List<string> Users);
    private async Task<Business> BusinessRows(CancellationToken ct) => new(
        await db.Horses.AsNoTracking().OrderBy(x => x.HorseId).ToListAsync(ct),
        await db.TransportRequests.AsNoTracking().OrderBy(x => x.RequestId).ToListAsync(ct),
        await db.RequestHorseMappings.AsNoTracking().OrderBy(x => x.RequestHorseId).ToListAsync(ct),
        await db.Contracts.AsNoTracking().OrderBy(x => x.ContractId).ToListAsync(ct),
        await db.Invoices.AsNoTracking().OrderBy(x => x.InvoiceId).ToListAsync(ct),
        await db.Users.AsNoTracking().OrderBy(x => x.UserId).Select(x => x.UserId).ToListAsync(ct));
    private SqlCommand Command(string sql)
    {
        var command = new SqlCommand(sql, (SqlConnection)db.Database.GetDbConnection(),
            (SqlTransaction?)db.Database.CurrentTransaction?.GetDbTransaction()) { CommandTimeout = 60 };
        return command;
    }
    private static string Hash<T>(T value) => LegacyFlow1Sources.Hash(JsonSerializer.SerializeToUtf8Bytes(value, Json));
    private static string Definition(string value) => string.Concat(value.Where(c => !char.IsWhiteSpace(c) && c is not ('[' or ']' or '(' or ')'))).ToLowerInvariant();
    private async Task<bool> StateSchema(string table, CancellationToken ct)
    {
        await using var columns = Command("SELECT c.name,TYPE_NAME(c.user_type_id),c.max_length,c.is_nullable,c.is_computed,d.definition FROM sys.columns c LEFT JOIN sys.default_constraints d ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE c.object_id=OBJECT_ID(@table) AND c.name IN ('Flow1StateJson','Flow1StateVersion');");
        columns.Parameters.Add("@table", SqlDbType.NVarChar, 128).Value = "dbo." + table;
        var count = 0;
        await using (var reader = await columns.ExecuteReaderAsync(ct)) while (await reader.ReadAsync(ct))
        {
            count++;
            if (reader.GetBoolean(4)) return false;
            if (reader.GetString(0) == "Flow1StateJson")
            { if (reader.GetString(1) != "nvarchar" || reader.GetInt16(2) != -1 || !reader.GetBoolean(3)) return false; }
            else if (reader.GetString(1) != "bigint" || reader.GetBoolean(3) || reader.IsDBNull(5) || Definition(reader.GetString(5)) != "0") return false;
        }
        if (count != 2) return false;
        await using var checks = Command("SELECT name,definition,is_disabled,is_not_trusted FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(@table) AND name IN (@json,@version);");
        checks.Parameters.Add("@table", SqlDbType.NVarChar, 128).Value = "dbo." + table;
        checks.Parameters.Add("@json", SqlDbType.NVarChar, 128).Value = "CK_" + table + "_Flow1StateJson";
        checks.Parameters.Add("@version", SqlDbType.NVarChar, 128).Value = "CK_" + table + "_Flow1StateVersion";
        count = 0; await using (var reader = await checks.ExecuteReaderAsync(ct)) while (await reader.ReadAsync(ct))
        {
            count++;
            var expected = reader.GetString(0).EndsWith("Json", StringComparison.Ordinal) ? "flow1statejsonisnullorisjsonflow1statejson=1" : "flow1stateversion>=0";
            if (reader.GetBoolean(2) || reader.GetBoolean(3) || Definition(reader.GetString(1)) != expected) return false;
        }
        return count == 2;
    }
    internal static T Payload<T>(Flow1StateDocument d, int? version = null) =>
        d.Revisions[(version ?? d.Revisions.Count) - 1].Payload.Deserialize<T>(Json) ?? throw new InvalidDataException("INVALID_PAYLOAD");
    public Task<Flow1ImportReport> InventoryAsync(CancellationToken ct = default) => Run(false, null, null, ct);
    public Task<Flow1ImportReport> ImportAsync(string reviewedFingerprint, CancellationToken ct = default,
        Func<int, CancellationToken, Task>? checkpoint = null) => Run(true, reviewedFingerprint, checkpoint, ct);
    private async Task<Flow1ImportReport> Run(bool apply, string? fingerprint, Func<int, CancellationToken, Task>? checkpoint, CancellationToken ct)
    {
        if (db.Database.CurrentTransaction is not null || db.ChangeTracker.HasChanges()) throw new InvalidOperationException("Use a fresh maintenance context.");
        await using var transaction = await db.Database.BeginTransactionAsync(apply ? IsolationLevel.Serializable : IsolationLevel.ReadCommitted, ct);
        try
        {
            if (apply)
            {
                await using var lease = Command("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource='RaceHorse.Flow1.LegacyImport',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51060,'Import lock unavailable.',1;");
                await lease.ExecuteNonQueryAsync(ct);
            }
            var plan = await Build(ct);
            if (plan.Report.Issues.Length > 0 || !apply) { await transaction.RollbackAsync(ct); return plan.Report; }
            if (fingerprint != plan.Report.SourceFingerprint) throw new InvalidDataException("REVIEWED_INVENTORY_CHANGED");
            var written = 0;
            foreach (var owner in plan.Writes.Where(x => x.Changed))
            {
                await using var update = Command($"UPDATE dbo.[{owner.Table}] SET Flow1StateJson=@json,Flow1StateVersion=@next WHERE [{owner.Key}]=@id AND Flow1StateVersion=@old;");
                update.Parameters.Add("@json", SqlDbType.NVarChar, -1).Value = owner.Json;
                update.Parameters.Add("@id", SqlDbType.VarChar, 50).Value = owner.Id;
                update.Parameters.Add("@old", SqlDbType.BigInt).Value = owner.OldVersion;
                update.Parameters.Add("@next", SqlDbType.BigInt).Value = owner.NewVersion;
                if (await update.ExecuteNonQueryAsync(ct) != 1) throw new InvalidDataException("SQL_OWNER_CHANGED");
                if (checkpoint is not null) await checkpoint(++written, ct);
            }
            // Entire batch, receipts included, rolls back if any parity check fails.
            foreach (var owner in plan.Writes)
            {
                await using var check = Command($"SELECT Flow1StateJson FROM dbo.[{owner.Table}] WHERE [{owner.Key}]=@id;");
                check.Parameters.Add("@id", SqlDbType.VarChar, 50).Value = owner.Id;
                if ((string?)await check.ExecuteScalarAsync(ct) != owner.Json) throw new InvalidDataException("SQL_PARITY_FAILED");
                var envelope = JsonSerializer.Deserialize<SqlFlow1StateStore.Envelope>(owner.Json, Json)!;
                foreach (var kind in envelope.Documents.Keys) await new SqlFlow1StateStore(db, TimeProvider.System).ReadAsync(kind, owner.Id, ct);
            }
            var final = await Build(ct);
            if (final.Report.Issues.Length > 0 || final.Report.SourceFingerprint != plan.Report.SourceFingerprint ||
                final.Writes.Any(w => w.Changed)) throw new InvalidDataException("IMPORT_PARITY_OR_SOURCE_CHANGED");
            await transaction.CommitAsync(ct);
            return final.Report with { Applied = true, ParityVerified = true };
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }
    private async Task<Plan> Build(CancellationToken ct)
    {
        var issues = new List<Flow1ImportIssue>(); var warnings = new List<Flow1ImportIssue>();
        Dictionary<string, byte[]> sources;
        try { sources = LegacyFlow1Sources.Read(sourceRoot); }
        catch (InvalidDataException e) { return new(new(db.Database.GetDbConnection().Database, "", 0, 0, 0, 0, false, false, [new(e.Message, "source")], []), [], []); }
        var business = await BusinessRows(ct);
        var entries = new List<Entry>();
        foreach (var (path, bytes) in sources)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var doc = LegacyFlow1Sources.Parse(path, bytes);
                if (doc.AggregateType == "otp-account")
                {
                    var actors = doc.Revisions.Select(r => r.ActorUserId).Distinct(StringComparer.Ordinal).ToArray();
                    if (actors.Length != 1 || !business.Users.Contains(actors[0], StringComparer.OrdinalIgnoreCase) ||
                        doc.AggregateId != LegacyFlow1Sources.Key(actors[0]) &&
                        doc.AggregateId != ("oa-" + CustomerTransportService.Hash(actors[0])[..32]).ToLowerInvariant())
                        throw new InvalidDataException("OTP_ACCOUNT_OWNER_CONFLICT");
                    doc = doc with { AggregateId = LegacyFlow1Sources.Key(actors[0]) };
                }
                entries.Add(new(path, LegacyFlow1Sources.Hash(bytes), doc));
            }
            catch (Exception e) when (e is InvalidDataException or JsonException or InvalidOperationException or KeyNotFoundException or ArgumentException)
            { issues.Add(new(e is InvalidDataException ? e.Message : "INVALID_DOCUMENT", path)); }
        }
        var duplicates = entries.GroupBy(e => (e.Document.AggregateType, e.Document.AggregateId)).Where(g => g.Count() > 1);
        foreach (var duplicate in duplicates) issues.Add(new("DUPLICATE_OWNER_DOCUMENT", duplicate.First().Path));
        var schema = true;
        var stored = new Dictionary<(string Table, string Id), (long Version, SqlFlow1StateStore.Envelope Envelope)>();
        foreach (var (table, key) in new[] { ("HORSE", "HorseID"), ("TRANSPORT_REQUEST", "RequestID"), ("CONTRACT", "ContractID"), ("USER", "UserID") })
        {
            try
            {
                if (!await StateSchema(table, ct)) { schema = false; issues.Add(new("SQL_SCHEMA_REQUIRED", table)); continue; }
                await using var command = Command($"SELECT [{key}],Flow1StateJson,Flow1StateVersion FROM dbo.[{table}];");
                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    var id = LegacyFlow1Sources.Key(reader.GetString(0)); var version = reader.GetInt64(2);
                    if (!reader.IsDBNull(1))
                    {
                        using var raw = JsonDocument.Parse(reader.GetString(1)); LegacyFlow1Sources.NoDuplicatePropertiesOrSecrets(raw.RootElement);
                        if (raw.RootElement.EnumerateObject().Any(p => p.Name is not ("schemaVersion" or "documents" or "legacySources")))
                            throw new InvalidDataException("SQL_STATE_INVALID");
                    }
                    var envelope = reader.IsDBNull(1) ? new SqlFlow1StateStore.Envelope(1, new()) :
                        JsonSerializer.Deserialize<SqlFlow1StateStore.Envelope>(reader.GetString(1), Json) ?? throw new InvalidDataException("SQL_STATE_INVALID");
                    if (envelope.SchemaVersion != 1 || envelope.Documents is null || version < 0 ||
                        (version == 0) != (envelope.Documents.Count == 0)) throw new InvalidDataException("SQL_STATE_INVALID");
                    stored.Add((table, id), (version, envelope));
                }
            }
            catch (SqlException e) when (e.Number is 207 or 208) { schema = false; issues.Add(new("SQL_SCHEMA_REQUIRED", table)); }
            catch (Exception e) when (e is JsonException or InvalidDataException or ArgumentException)
            { issues.Add(new("SQL_STATE_INVALID", table)); }
        }
        foreach (var (owner, value) in stored.Where(s => s.Value.Envelope.Documents.Count > 0))
        {
            try { await new SqlFlow1StateStore(db, TimeProvider.System).ReadAsync(value.Envelope.Documents.Keys.First(), owner.Id, ct); }
            catch (Exception e) when (e is JsonException or InvalidDataException or ArgumentException or Application.Common.Exceptions.BusinessRuleException)
            { issues.Add(new("SQL_STATE_INVALID", owner.Table + "/" + owner.Id)); }
        }
        var writes = new List<OwnerWrite>();
        var all = new Dictionary<(string Kind, string Id), Flow1StateDocument>();
        foreach (var (_, s) in stored) foreach (var (kind, d) in s.Envelope.Documents)
            if (!all.TryAdd((kind, d.AggregateId), d)) issues.Add(new("SQL_DOCUMENT_CONFLICT", kind));
        foreach (var entry in entries) all[(entry.Document.AggregateType, entry.Document.AggregateId)] = entry.Document;
        var privateFiles = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var entry in entries)
        {
            try
            {
                await LegacyFlow1Parity.Validate(entry.Document, all, business, privateFilesRoot, privateFiles, ct);
            }
            catch (Exception e) when (e is InvalidDataException or JsonException or KeyNotFoundException or InvalidOperationException or ArgumentException or IndexOutOfRangeException or NullReferenceException or IOException or Application.Common.Exceptions.BusinessRuleException)
            { issues.Add(new(e is InvalidDataException ? e.Message : "PAYLOAD_OR_PRIVATE_FILE_INVALID", entry.Path)); }
        }
        foreach (var group in entries.GroupBy(e => (SqlFlow1StateStore.Owner(e.Document.AggregateType).Table, e.Document.AggregateId)))
        {
            var first = group.First(); var mapping = SqlFlow1StateStore.Owner(first.Document.AggregateType);
            if (!schema || !stored.TryGetValue(group.Key, out var old)) { issues.Add(new("SQL_OWNER_MISSING", first.Path)); continue; }
            var documents = new Dictionary<string, Flow1StateDocument>(old.Envelope.Documents);
            var receipts = (old.Envelope.LegacySources ?? []).ToDictionary(r => r.Path, StringComparer.Ordinal);
            var changed = false; long added = 0;
            foreach (var e in group)
            {
                if (documents.TryGetValue(e.Document.AggregateType, out var previous))
                {
                    // Source must be an exact audit prefix. Do not overwrite or truncate newer SQL history.
                    if (previous.Revisions.Count < e.Document.Revisions.Count ||
                        !previous.Revisions.Take(e.Document.Revisions.Count).Select(Hash).SequenceEqual(e.Document.Revisions.Select(Hash)))
                        issues.Add(new("SQL_HISTORY_CONFLICT", e.Path));
                }
                else { documents.Add(e.Document.AggregateType, e.Document); changed = true; added += e.Document.Revisions.Count; }
                if (receipts.TryGetValue(e.Path, out var receipt))
                { if (receipt.Sha256 != e.Sha) issues.Add(new("SOURCE_RECEIPT_CONFLICT", e.Path)); }
                else { receipts.Add(e.Path, new(e.Path, e.Sha)); changed = true; }
            }
            var target = JsonSerializer.Serialize(new SqlFlow1StateStore.Envelope(1, documents, receipts.Values.OrderBy(r => r.Path, StringComparer.Ordinal).ToArray()), Json);
            if (Encoding.UTF8.GetByteCount(target) > 8 * 1024 * 1024) issues.Add(new("SQL_OWNER_LIMIT", first.Path));
            writes.Add(new(mapping.Table, mapping.Key, group.Key.AggregateId, target, old.Version, changed ? old.Version + Math.Max(1, added) : old.Version, changed));
        }
        foreach (var h in business.Horses.Where(h => !all.ContainsKey(("horse", LegacyFlow1Sources.Key(h.HorseId))))) warnings.Add(new("LEGACY_HORSE_WITHOUT_STATE", h.HorseId));
        foreach (var r in business.Requests.Where(r => !all.ContainsKey(("request", LegacyFlow1Sources.Key(r.RequestId))))) warnings.Add(new("LEGACY_REQUEST_WITHOUT_STATE", r.RequestId));
        foreach (var c in business.Contracts.Where(c => !all.ContainsKey(("contract", LegacyFlow1Sources.Key(c.ContractId))))) warnings.Add(new("LEGACY_CONTRACT_WITHOUT_STATE", c.ContractId));
        var identity = new SqlConnectionStringBuilder(db.Database.GetConnectionString());
        var fingerprint = Hash(new { server = identity.DataSource.ToUpperInvariant(), database = identity.InitialCatalog.ToUpperInvariant(),
            source = sources.OrderBy(s => s.Key, StringComparer.Ordinal).Select(s => new { path = s.Key, hash = LegacyFlow1Sources.Hash(s.Value) }),
            business, privateFiles = privateFiles.OrderBy(x => x.Key, StringComparer.Ordinal) });
        return new(new(identity.InitialCatalog, fingerprint, entries.Count, writes.Count, entries.Sum(e => e.Document.Revisions.Count),
            privateFiles.Count, false, schema && issues.Count == 0 && writes.All(w => !w.Changed), issues.ToArray(), warnings.ToArray()), writes.ToArray(), sources);
    }
}
