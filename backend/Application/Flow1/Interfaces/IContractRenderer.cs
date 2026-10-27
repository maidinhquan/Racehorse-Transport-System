using System.Text.Json;
namespace Application.Flow1.Interfaces;
public interface IContractRenderer
{
    Task<string> RenderAsync(JsonElement snapshot, CancellationToken ct);
}
