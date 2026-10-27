using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record ContractDocumentResult(string PrivateStorageKey, string Sha256, long SizeBytes,
    string? TemplatePatchSha256 = null);
