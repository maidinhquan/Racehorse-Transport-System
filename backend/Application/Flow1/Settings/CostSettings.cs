namespace Application.Flow1.Settings;

// Explicit operator assumptions. Missing values must not become hidden business defaults.
public sealed class CostSettings
{
    public int? StandardVehicleCapacityStalls { get; set; }
    public int? DefaultCrewCount { get; set; }
    public int? DefaultDoctorCount { get; set; }
}
