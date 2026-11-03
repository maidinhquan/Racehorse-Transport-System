namespace Application.DTOs
{
    public class VehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string RegistrationCountry { get; set; } = "VN";
        public string OperatingCountry { get; set; } = "VN";
        public int TotalStalls { get; set; }
        public int AvailableStalls { get; set; }
        public decimal? PayloadKg { get; set; }
        public DateTime? RegistrationExpiry { get; set; }
        public decimal? MaxRangeKm { get; set; }
        public decimal? FuelCostPerKm { get; set; }
        public string Status { get; set; } = "READY"; // READY, MAINTENANCE, INACTIVE
        public bool IsAvailable { get; set; }
        public List<string> AllowedActions { get; set; } = new() { "EDIT", "CHANGE_STATUS", "VIEW_SCHEDULE" };
    }

    public class CreateVehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string Type { get; set; } = "HORSEBOX_3_STALLS";
        public string RegistrationCountry { get; set; } = "VN";
        public string OperatingCountry { get; set; } = "VN";
        public int CapacityStalls { get; set; } = 3;
        public decimal? PayloadKg { get; set; } = 8000;
        public DateTime? RegistrationExpiry { get; set; }
        public decimal? MaxRangeKm { get; set; } = 900;
        public decimal? FuelCostPerKm { get; set; } = 1.2m;
        public string Status { get; set; } = "AVAILABLE";
    }

    public class UpdateVehicleStatusDto
    {
        public string Status { get; set; } = "MAINTENANCE";
        public DateTime? MaintenanceFrom { get; set; }
        public DateTime? MaintenanceUntil { get; set; }
        public string? Note { get; set; }
    }

    public class ResourceScheduleItemDto
    {
        public string Kind { get; set; } = "TRIP"; // TRIP, MAINTENANCE
        public string? TripId { get; set; }
        public string? TripCode { get; set; }
        public List<int> LegIds { get; set; } = new();
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public string? AssignmentRole { get; set; }
        public string? Note { get; set; }
    }
}

