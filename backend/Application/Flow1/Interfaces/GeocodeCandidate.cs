using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record GeocodeCandidate(string Label, MapPoint Point, bool MayPersist, string Attribution,
    string? Provider = null, string? PreviewProvider = null);
