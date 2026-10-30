using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface ILocationVerifier
{
    string? Attribution => null;
    Task VerifyAsync(MapPoint point, CancellationToken ct);
}
