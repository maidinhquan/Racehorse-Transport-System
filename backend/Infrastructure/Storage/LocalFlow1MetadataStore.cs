using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.Interfaces.Flow1;

namespace Infrastructure.Storage;

public sealed class LocalFlow1MetadataStore : IFlow1MetadataStore
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly string root;
    private readonly Flow1StorageOptions options;
    private readonly TimeProvider clock;

    public LocalFlow1MetadataStore(string root, Flow1StorageOptions options, TimeProvider clock)
    {
        this.root = Path.GetFullPath(root);
        this.options = options;
        this.clock = clock;
        if (options.MaxDocumentBytes <= 0 || options.LockTimeoutMilliseconds <= 0)
            throw new ArgumentOutOfRangeException(nameof(options));
    }

    public async Task<Flow1MetadataDocument?> ReadAsync(string type, string id, CancellationToken ct = default)
    {
        type = NormalizeKey(type);
        id = NormalizeKey(id);
        var path = DocumentPath(type, id);
        if (!File.Exists(path)) return null;
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete, 4096, FileOptions.Asynchronous);
        if (stream.Length > options.MaxDocumentBytes) throw new InvalidDataException("Metadata exceeds configured limit.");
        var document = await JsonSerializer.DeserializeAsync<Flow1MetadataDocument>(stream, Json, ct);
        if (document is null || document.SchemaVersion != 1 || document.AggregateType != type ||
            document.AggregateId != id || document.Revisions is null || document.Revisions.Count == 0 ||
            document.Revisions.Where((r, i) => r.Version != i + 1).Any())
            throw new InvalidDataException("Invalid or unsupported Flow 1 metadata.");
        return document;
    }

    public async Task<Flow1MetadataRevision> AppendAsync(string type, string id, int expectedVersion,
        string operationId, string actorUserId, string action, JsonElement payload, CancellationToken ct = default)
    {
        type = NormalizeKey(type);
        id = NormalizeKey(id);
        var path = DocumentPath(type, id);
        if (expectedVersion < 0 || string.IsNullOrWhiteSpace(operationId) || operationId.Length > 128 ||
            string.IsNullOrWhiteSpace(actorUserId) || actorUserId.Length > 50 ||
            string.IsNullOrWhiteSpace(action) || action.Length > 100 || payload.ValueKind == JsonValueKind.Undefined)
            throw new ArgumentException("Metadata version, operation, actor, action and payload are required.");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var lease = await AcquireAsync(path + ".lock", ct);
        var previous = await ReadAsync(type, id, ct);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload.GetRawText())));
        var repeat = previous?.Revisions.SingleOrDefault(r => r.OperationId == operationId);
        if (repeat is not null)
        {
            if (repeat.RequestHash != hash || repeat.ActorUserId != actorUserId || repeat.Action != action)
                throw new BusinessRuleException("Idempotency key was used with another payload.", 409, "IDEMPOTENCY_KEY_REUSED");
            return repeat;
        }
        var currentVersion = previous?.Revisions.Count ?? 0;
        if (currentVersion != expectedVersion)
            throw new BusinessRuleException("Metadata was updated. Reload before saving.", 409, "STALE_VERSION");
        var revision = new Flow1MetadataRevision(currentVersion + 1, operationId, hash, actorUserId,
            action, clock.GetUtcNow().UtcDateTime, payload.Clone());
        var revisions = (previous?.Revisions ?? []).Append(revision).ToArray();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(new Flow1MetadataDocument(1, type, id, revisions), Json);
        if (bytes.Length > options.MaxDocumentBytes) throw new InvalidDataException("Metadata exceeds configured limit.");
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                4096, FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                await stream.WriteAsync(bytes, ct);
                stream.Flush(flushToDisk: true);
            }
            ct.ThrowIfCancellationRequested();
            File.Move(temp, path, overwrite: true);
            return revision;
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    private string DocumentPath(string type, string id)
    {
        return Path.Combine(root, type, id + ".json");
    }

    private static string NormalizeKey(string key)
    {
        // Same lock/file for case-insensitive SQL IDs, including after moving to Linux.
        if (string.IsNullOrWhiteSpace(key) || !Regex.IsMatch(key, "\\A[A-Za-z0-9_-]{1,50}\\z", RegexOptions.CultureInvariant))
            throw new ArgumentException("Metadata keys must be ASCII IDs without paths.");
        return key.ToLowerInvariant();
    }

    private async Task<FileStream> AcquireAsync(string path, CancellationToken ct)
    {
        var started = System.Diagnostics.Stopwatch.StartNew();
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            try { return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None); }
            catch (IOException) when (started.ElapsedMilliseconds < options.LockTimeoutMilliseconds)
            { await Task.Delay(25, ct); }
        }
    }
}
