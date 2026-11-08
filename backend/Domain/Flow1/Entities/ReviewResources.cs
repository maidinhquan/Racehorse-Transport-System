namespace Domain.Flow1.Entities;

public sealed class ReviewVehicle
{
    public string VehicleID { get; set; } = null!;
    public string? Type { get; set; }
    public string? PlateNumber { get; set; }
    public string? OperatingCountry { get; set; }
    public string? Status { get; set; }
    public int? CapacityStalls { get; set; }
}

public sealed class ReviewFlight
{
    public string ServiceID { get; set; } = null!;
    public string ProviderFlightCode { get; set; } = null!;
    public string Airline { get; set; } = null!;
    public string OriginAirportPlaceId { get; set; } = null!;
    public string DestAirportPlaceId { get; set; } = null!;
    public string DepartureTime { get; set; } = null!;
    public string ArrivalTime { get; set; } = null!;
    public DateTime? DepartureDate { get; set; }
    public DateTime? ArrivalDate { get; set; }
    public string DepartureTimeZone { get; set; } = null!;
    public string ArrivalTimeZone { get; set; } = null!;
    public int CapacityHorses { get; set; }
    public bool IsActive { get; set; }
}
