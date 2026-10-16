namespace Application.Common.Flow1;

public sealed class Flow1MapOptions
{
    public string Provider { get; set; } = "MAPBOX";
    public Flow1MapboxOptions Mapbox { get; set; } = new();
    // No public demo servers are silently enabled. Operator supplies contracted/self-hosted endpoints.
    public string? RoutingBaseUrl { get; set; }
    public string? GeocodingBaseUrl { get; set; }
    public string UserAgent { get; set; } = "";
    public bool MayPersistResults { get; set; }
    public string Attribution { get; set; } = "© OpenStreetMap contributors";
}

public sealed class Flow1MapboxOptions
{
    public string AccessToken { get; set; } = "";
    // Operator confirms account entitlement before enabling permanent requests.
    public bool PermanentGeocodingEnabled { get; set; }
    public string ApiBaseUrl { get; set; } = "https://api.mapbox.com/";
    public string Attribution { get; set; } = "© Mapbox © OpenStreetMap";
}
