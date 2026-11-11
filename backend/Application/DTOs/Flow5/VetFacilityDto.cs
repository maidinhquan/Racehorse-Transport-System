namespace Application.DTOs.Flow5;

public class VetFacilityDto
{
    public string FacilityId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string FacilityType { get; set; } = "VET_CLINIC";
    public string CountryCode { get; set; } = "VN";
    public string? StateProvince { get; set; }
    public string? City { get; set; }
    public string? Address { get; set; }
    public string? Coordinates { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? OperatingHours { get; set; } = "24/7";
    public string Region { get; set; } = "OTHER"; // NORTH, CENTRAL, SOUTH, INTERNATIONAL
    public bool IsSuggested { get; set; }
    public double? DistanceKm { get; set; }
}

