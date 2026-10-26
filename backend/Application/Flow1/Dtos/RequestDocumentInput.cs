using System.Text.Json.Serialization;
namespace Application.Flow1.Dtos;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RequestDocumentInput(string FileName, string DocumentType, string? ExpiryDate = null);
