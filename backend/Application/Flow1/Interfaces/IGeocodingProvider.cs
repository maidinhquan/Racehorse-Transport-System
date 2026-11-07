using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface IGeocodingProvider
{
    Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address, string countryCode, CancellationToken ct = default);
}
