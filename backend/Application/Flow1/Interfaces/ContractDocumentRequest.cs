using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record ContractDocumentRequest(string ContractId, int Version, string TemplateVersion,
    JsonElement FrozenSnapshot);
