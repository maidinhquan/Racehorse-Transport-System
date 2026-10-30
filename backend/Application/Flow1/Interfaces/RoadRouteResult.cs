using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record RoadRouteResult(string Provider, decimal DistanceMeters, decimal DurationSeconds,
    DateTimeOffset CalculatedAtUtc, string InputFingerprint, bool MayPersist, string Attribution);
