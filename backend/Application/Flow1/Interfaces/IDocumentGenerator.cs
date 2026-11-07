using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface IDocumentGenerator
{
    Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest request, CancellationToken ct = default);
}
