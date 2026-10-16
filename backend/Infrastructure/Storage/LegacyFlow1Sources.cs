using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Interfaces.Flow1;

namespace Infrastructure.Storage;

// Offline reader only. No lock files, append API, temporary JSON writes, rename or fallback provider.
internal static class LegacyFlow1Sources
{
    internal static readonly string[] Kinds = ["horse", "request", "review", "plan", "contract", "publication", "contract-otp", "acceptance", "otp-account"];
    internal const int MaxDocumentBytes = 2 * 1024 * 1024;
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    internal static string Key(string id) => Regex.IsMatch(id ?? "", @"\A[A-Za-z0-9_-]{1,50}\z") ? id!.ToLowerInvariant() : throw new InvalidDataException("INVALID_KEY");
    internal static void NoLinks(string path)
    {
        for (var p = Path.GetFullPath(path); p is not null; p = Path.GetDirectoryName(p))
            if ((File.Exists(p) || Directory.Exists(p)) && (File.GetAttributes(p) & FileAttributes.ReparsePoint) != 0)
                throw new InvalidDataException("REPARSE_SOURCE");
    }
    internal static Dictionary<string, byte[]> Read(string root)
    {
        root = Path.GetFullPath(root); NoLinks(root);
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        if (!Directory.Exists(root)) return files;
        long total = 0;
        foreach (var directory in Directory.EnumerateDirectories(root).Order(StringComparer.Ordinal))
        {
            NoLinks(directory);
            if (Path.GetFileName(directory) == "private-bytes") continue;
            var kind = Path.GetFileName(directory);
            if (Directory.EnumerateDirectories(directory).Any()) throw new InvalidDataException("NESTED_SOURCE");
            if (Directory.EnumerateFiles(directory, "*.tmp").Any()) throw new InvalidDataException("INCOMPLETE_SOURCE_WRITE");
            foreach (var path in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
            {
                NoLinks(path);
                if (!Kinds.Contains(kind) || Key(Path.GetFileNameWithoutExtension(path)) != Path.GetFileNameWithoutExtension(path))
                    throw new InvalidDataException("UNKNOWN_SOURCE");
                var length = new FileInfo(path).Length;
                total += length;
                if (length > MaxDocumentBytes || total > 128L * 1024 * 1024 || files.Count >= 10000) throw new InvalidDataException("SOURCE_LIMIT");
                var bytes = File.ReadAllBytes(path);
                if (bytes.Length != length) throw new InvalidDataException("SOURCE_CHANGED");
                files.Add(kind + "/" + Path.GetFileName(path), bytes);
            }
        }
        if (Directory.EnumerateFiles(root, "*.json").Any() || Directory.EnumerateFiles(root, "*.tmp").Any())
            throw new InvalidDataException("UNKNOWN_SOURCE");
        return files;
    }
    internal static void NoDuplicatePropertiesOrSecrets(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in value.EnumerateObject())
            {
                if (!names.Add(p.Name)) throw new InvalidDataException("DUPLICATE_PROPERTY");
                if (new[] { "otp", "code", "password", "secret", "accessToken", "otpHmacKey", "connectionString" }.Contains(p.Name, StringComparer.OrdinalIgnoreCase))
                    throw new InvalidDataException("PLAINTEXT_SECRET_FIELD");
                NoDuplicatePropertiesOrSecrets(p.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array) foreach (var item in value.EnumerateArray()) NoDuplicatePropertiesOrSecrets(item);
    }
    internal static Flow1StateDocument Parse(string relativePath, byte[] bytes)
    {
        using var raw = JsonDocument.Parse(bytes); NoDuplicatePropertiesOrSecrets(raw.RootElement);
        if (raw.RootElement.EnumerateObject().Any(p => !new[] { "schemaVersion", "aggregateType", "aggregateId", "revisions" }.Contains(p.Name)) ||
            raw.RootElement.GetProperty("revisions").EnumerateArray().Any(r => r.EnumerateObject().Any(p =>
                !new[] { "version", "operationId", "requestHash", "actorUserId", "action", "createdAtUtc", "payload" }.Contains(p.Name))))
            throw new InvalidDataException("UNSUPPORTED_SOURCE_FIELD");
        var doc = raw.RootElement.Deserialize<Flow1StateDocument>(Json) ?? throw new InvalidDataException("INVALID_DOCUMENT");
        var kind = relativePath.Split('/')[0]; var id = Path.GetFileNameWithoutExtension(relativePath);
        if (doc.SchemaVersion != 1 || doc.AggregateType != kind || doc.AggregateId != id || doc.Revisions is not { Count: > 0 })
            throw new InvalidDataException("OWNER_OR_SCHEMA");
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var r in doc.Revisions)
        {
            if (r is null || r.Version != keys.Count + 1 || string.IsNullOrWhiteSpace(r.OperationId) || !keys.Add(r.OperationId) || r.OperationId.Length > 128 ||
                string.IsNullOrWhiteSpace(r.ActorUserId) || r.ActorUserId.Length > 50 || string.IsNullOrWhiteSpace(r.Action) || r.Action.Length > 100 ||
                r.CreatedAtUtc.Kind != DateTimeKind.Utc || r.Payload.ValueKind != JsonValueKind.Object ||
                !string.Equals(r.RequestHash, Hash(System.Text.Encoding.UTF8.GetBytes(r.Payload.GetRawText())), StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("REVISION_OR_HASH");
        }
        var latest = doc.Revisions[^1].Payload;
        if (kind == "review" && latest.TryGetProperty("pending", out var pending) && pending.ValueKind != JsonValueKind.Null ||
            kind == "publication" && latest.TryGetProperty("outcome", out var outcome) && outcome.GetString() == "PREPARED" ||
            kind == "acceptance" && latest.GetProperty("operation").GetProperty("outcome").GetString() == "PREPARED")
            throw new InvalidDataException("PREPARED_REQUIRES_RECONCILIATION");
        return doc;
    }
}
internal sealed record Flow1LegacySourceReceipt(string Path, string Sha256);
