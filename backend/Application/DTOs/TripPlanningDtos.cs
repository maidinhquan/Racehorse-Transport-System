namespace Application.DTOs
{
    public class PlanningTripDto
    {
        public string TripId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public int HorseCount { get; set; }
        public string TransportType { get; set; } = "ROAD";
        public DateTime? PlannedDepartureAt { get; set; }
        public DateTime? DeliveryDeadline { get; set; }
        public string TripStatus { get; set; } = "PLANNING";
        public string Stage { get; set; } = "NEED_ROUTE"; // NEED_ROUTE, NEED_ASSIGNMENT, READY, IN_TRANSIT
        public bool VehicleAssigned { get; set; }
        public bool DriverAssigned { get; set; }
        public bool EscortAssigned { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? EarliestDepartureDate { get; set; }
        public DateTime? DocumentExpiryDate { get; set; }
        public string? SpecialistLegalNote { get; set; }
        public DateTime? ResourcesConfirmedAt { get; set; }
        public string? ResourcesConfirmedBy { get; set; }
        public DateTime? DepartureApprovedAt { get; set; }
        public string? DepartureApprovedBy { get; set; }
        public List<string> AllowedActions { get; set; } = new();
    }

    public class TripDetailDto
    {
        public string TripId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal? TotalDistanceKm { get; set; }
        public decimal? TotalHours { get; set; }
        public decimal? TTotalHours { get => TotalHours; set => TotalHours = value; }
        public decimal? TotalCost { get; set; }
        public CustomerSummaryDto? Customer { get; set; }
        public LocationDto Origin { get; set; } = new();
        public LocationDto Destination { get; set; } = new();
        public DateTime? PlannedDepartureAt { get; set; }
        public DateTime? DeliveryDeadline { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? EarliestDepartureDate { get; set; }
        public DateTime? DocumentExpiryDate { get; set; }
        public string? SpecialistLegalNote { get; set; }
        public DateTime? ResourcesConfirmedAt { get; set; }
        public string? ResourcesConfirmedBy { get; set; }
        public DateTime? DepartureApprovedAt { get; set; }
        public string? DepartureApprovedBy { get; set; }
        public List<HorseItemDto> Horses { get; set; } = new();
        public VehicleAssignmentDetailDto? Assignment { get; set; }
        public List<VehicleAssignmentDetailDto> Assignments { get; set; } = new();
        public List<RouteSegmentItemDto> Segments { get; set; } = new();
        public OperationsReadinessDto Readiness { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class CustomerSummaryDto
    {
        public string CustomerId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class LocationDto
    {
        public string Country { get; set; } = "VN";
        public string City { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
    }

    public class HorseItemDto
    {
        public string HorseId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string MicrochipIso { get; set; } = string.Empty;
        public string Breed { get; set; } = string.Empty;
        public string Sex { get; set; } = string.Empty;
        public decimal? Weight { get; set; }
    }

    public class VehicleAssignmentDetailDto
    {
        public string AssignmentId { get; set; } = string.Empty;
        public int LegNumber { get; set; } = 1;
        public string? LegType { get; set; } // "OUTBOUND" (VN) hoặc "INBOUND" (JP)
        public string? Country { get; set; } = "VN";
        public string? VehicleId { get; set; }
        public string? VehiclePlateOrType { get; set; }
        public int? CapacityStalls { get; set; }
        public string? DriverId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? CoDriverId { get; set; }
        public string? CoDriverName { get; set; }
        public string? CoDriverPhone { get; set; }
        public string? VeterinarianId { get; set; }
        public string? VeterinarianName { get; set; }
        public string? VeterinarianPhone { get; set; }
        public string? EscortId { get; set; }
        public string? EscortName { get; set; }
        public string? EscortPhone { get; set; }
    }

    public class UnplannedRequestDto
    {
        public string RequestId { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string Departure { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string? Purpose { get; set; }
        public string? TransportType { get; set; }
        public DateTime? ExpectedDate { get; set; }
        public DateTime? CommittedDeadline { get; set; }
        public int HorseCount { get; set; }
        public decimal? BaseCost { get; set; }
        public string Status { get; set; } = "ACTIVATED";
    }

    public class StartPlanningRequestDto
    {
        public string RequestId { get; set; } = string.Empty;
        public decimal? TotalDistanceKm { get; set; }
        public decimal? TotalCost { get; set; }
    }
}