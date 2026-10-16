namespace Application.DTOs
{
    public class AssignCrewVehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string DriverId { get; set; } = string.Empty;
        public string EscortId { get; set; } = string.Empty;
    }

    public class TripAssignmentsDetailDto
    {
        public string TripId { get; set; } = string.Empty;
        public int? RouteVersionId { get; set; }
        public int RouteVersion { get; set; } = 1;
        public bool Editable { get; set; } = true;
        public List<HorseItemDto> Horses { get; set; } = new();
        public List<LegAssignmentDto> Legs { get; set; } = new();
        public bool IsComplete { get; set; }
        public List<string> Missing { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class LegAssignmentDto
    {
        public int LegId { get; set; }
        public int Sequence { get; set; }
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR
        public string? Country { get; set; } = "VN";
        public List<VehicleLegAssignmentDto> Vehicles { get; set; } = new();
        public int? FlightBookingId { get; set; }
        public List<string> VeterinarianIds { get; set; } = new();
        public List<string> HorseIds { get; set; } = new();
    }

    public class VehicleLegAssignmentDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string? PlateNumber { get; set; }
        public string? MainDriverId { get; set; }
        public string? CoDriverId { get; set; }
        public string? VeterinarianId { get; set; }
        public List<string> EscortIds { get; set; } = new();
        public List<HorseStallAllocationDto> Horses { get; set; } = new();
        public List<StaffRoleItemDto> Staff { get; set; } = new();
    }

    public class HorseStallAllocationDto
    {
        public string HorseId { get; set; } = string.Empty;
        public int StallNumber { get; set; }
    }

    public class ValidateAssignmentsResponseDto
    {
        public bool Valid { get; set; }
        public List<AssignmentErrorDto> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public bool IsComplete { get; set; }
    }

    public class AssignmentErrorDto
    {
        public string Code { get; set; } = string.Empty;
        public int? LegId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}

