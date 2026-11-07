namespace Domain.Flow1.Entities;

public sealed class SupportedRoute
{
    public string RouteID { get; set; } = null!;
    public string OriginCountry { get; set; } = null!;
    public string DestinationCountry { get; set; } = null!;
    public string TransportMode { get; set; } = null!;
    public bool IsActive { get; set; }
}
