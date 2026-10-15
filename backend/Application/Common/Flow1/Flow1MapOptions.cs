namespace Application.Common.Flow1;

public sealed class Flow1MapOptions
{
    // No public demo servers are silently enabled. Operator supplies contracted/self-hosted endpoints.
    public string? RoutingBaseUrl { get; set; }
    public string? GeocodingBaseUrl { get; set; }
    public string UserAgent { get; set; } = "";
    public bool MayPersistResults { get; set; }
    public string Attribution { get; set; } = "© OpenStreetMap contributors";
}
