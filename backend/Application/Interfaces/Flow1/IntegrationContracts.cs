using System.Text.Json;

namespace Application.Interfaces.Flow1;

// Contracts only. Provider implementations and their live checks belong to later phases.
public sealed record MapPoint(double Longitude, double Latitude, string CountryCode);
public sealed record GeocodeCandidate(string Label, MapPoint Point, bool MayPersist, string Attribution,
    string? Provider = null, string? PreviewProvider = null);
public sealed record RoadRouteQuery(IReadOnlyList<MapPoint> Points, string Profile = "driving");
public sealed record RoadRouteResult(string Provider, decimal DistanceMeters, decimal DurationSeconds,
    DateTimeOffset CalculatedAtUtc, string InputFingerprint, bool MayPersist, string Attribution);

public interface IFlow1GeocodingProvider
{
    Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address, string countryCode, CancellationToken ct = default);
}

public interface IFlow1RoadRoutingProvider
{
    Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query, CancellationToken ct = default);
}

public sealed record ContractDocumentRequest(string ContractId, int Version, string TemplateVersion,
    JsonElement FrozenSnapshot);
public sealed record ContractDocumentResult(string PrivateStorageKey, string Sha256, long SizeBytes,
    string? TemplatePatchSha256 = null);

public interface IFlow1ContractDocumentGenerator
{
    Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest request, CancellationToken ct = default);
}

public sealed record GatewaySessionRequest(string PaymentId, string InvoiceId, decimal Amount, string Currency,
    DateTimeOffset ExpiresAtUtc);
public sealed record GatewaySessionResult(string ProviderReference, Uri PaymentUrl, DateTimeOffset ExpiresAtUtc);
public sealed record VerifiedGatewayResult(bool Verified, string ProviderReference, string? ProviderTransactionId,
    decimal Amount, string Currency, string Status, DateTimeOffset? PaidAtUtc, JsonElement SafeEvidence);

public interface IFlow1PaymentGateway
{
    Task<GatewaySessionResult> CreateSessionAsync(GatewaySessionRequest request, CancellationToken ct = default);
    Task<VerifiedGatewayResult> VerifyAsync(IReadOnlyDictionary<string, string> payload, CancellationToken ct = default);
}
