using System.Text.Json.Serialization;

namespace Application.DTOs
{
    // =========================================================================
    // 1. DASHBOARD OVERVIEW DTOs
    // =========================================================================
    public class CoordinatorDashboardDto
    {
        public int NeedRoute { get; set; }
        public int NeedAssignment { get; set; }
        public int AvailableVehicles { get; set; }
        public int TotalVehicles { get; set; }
        public int ActiveTrips { get; set; }
        public int IncidentsCount { get; set; }
        public FleetSummaryDto Fleet { get; set; } = new();
        public List<PlanningTripSummaryDto> RecentTrips { get; set; } = new();
    }

    public class FleetSummaryDto
    {
        public int Ready { get; set; }
        public int Maintenance { get; set; }
        public int Inactive { get; set; }
        public int Total { get; set; }
    }

    public class PlanningTripSummaryDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string RouteName { get; set; } = string.Empty;
        public int HorseCount { get; set; }
        public string PlannedDeparture { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    // =========================================================================
    // 2. PLANNING TRIPS DTOs
    // =========================================================================
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
        public List<string> AllowedActions { get; set; } = new();
    }

    // =========================================================================
    // 3. TRIP DETAIL DTOs
    // =========================================================================
    public class TripDetailDto
    {
        public string TripId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal? TotalDistanceKm { get; set; }
        public decimal? TTotalHours { get; set; }
        public decimal? TotalCost { get; set; }
        public CustomerSummaryDto? Customer { get; set; }
        public LocationDto Origin { get; set; } = new();
        public LocationDto Destination { get; set; } = new();
        public DateTime? PlannedDepartureAt { get; set; }
        public DateTime? DeliveryDeadline { get; set; }
        public List<HorseItemDto> Horses { get; set; } = new();
        public VehicleAssignmentDetailDto? Assignment { get; set; }
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
        public string? VehicleId { get; set; }
        public string? VehiclePlateOrType { get; set; }
        public int? CapacityStalls { get; set; }
        public string? DriverId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? EscortId { get; set; }
        public string? EscortName { get; set; }
        public string? EscortPhone { get; set; }
    }

    // =========================================================================
    // 4. FLEET (VEHICLE) DTOs
    // =========================================================================
    public class VehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int CapacityStalls { get; set; }
        public decimal? MaxRangeKm { get; set; }
        public decimal? FuelCostPerKm { get; set; }
        public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, ON_TRIP, MAINTENANCE, INACTIVE
        public bool IsAvailable { get; set; }
    }

    public class CreateVehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string Type { get; set; } = "HORSEBOX_3_STALLS";
        public int CapacityStalls { get; set; } = 3;
        public decimal? MaxRangeKm { get; set; } = 900;
        public decimal? FuelCostPerKm { get; set; } = 1.2m;
        public string Status { get; set; } = "AVAILABLE";
    }

    public class UpdateVehicleStatusDto
    {
        public string Status { get; set; } = "AVAILABLE";
    }

    // =========================================================================
    // 5. STAFF DTOs
    // =========================================================================
    public class StaffDto
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Driver, Escort
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string Specialization { get; set; } = string.Empty; // "Tài xế quốc tế", "Bác sĩ thú y áp tải"
    }

    // =========================================================================
    // 6. ROUTE CALCULATION & SEGMENTS DTOs
    // =========================================================================
    public class RouteCalculateRequestDto
    {
        public string? TripId { get; set; }
        public DateTime PlannedDepartureAt { get; set; }
        public List<RoutePointInputDto> Points { get; set; } = new();
    }

    public class RoutePointInputDto
    {
        public int Sequence { get; set; }
        public string Type { get; set; } = "ORIGIN"; // ORIGIN, REST_STOP, CHECKPOINT, AIRPORT, DESTINATION
        public string Name { get; set; } = string.Empty;
        public decimal Lat { get; set; }
        public decimal Lng { get; set; }
        public int PlannedStopMinutes { get; set; }
    }

    public class RouteCalculateResponseDto
    {
        public decimal TotalDistanceKm { get; set; }
        public decimal TotalElapsedHours { get; set; }
        public DateTime EtaDestination { get; set; }
        public bool MeetsEquineWelfare { get; set; } // true if continuous drive <= 6h
        public List<string> Warnings { get; set; } = new();
        public List<RouteLegResultDto> Legs { get; set; } = new();
        public List<double[]> PolylineCoordinates { get; set; } = new();
    }

    public class RouteLegResultDto
    {
        public int FromSequence { get; set; }
        public int ToSequence { get; set; }
        public string Mode { get; set; } = "ROAD";
        public decimal DistanceKm { get; set; }
        public int DurationMinutes { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public List<double[]> Path { get; set; } = new();
    }

    public class SaveRouteSegmentsDto
    {
        public List<RouteSegmentItemDto> Segments { get; set; } = new();
    }

    public class RouteSegmentItemDto
    {
        public string? SegmentId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string SegmentType { get; set; } = "ORIGIN"; // ORIGIN, REST_STOP, CHECKPOINT, DESTINATION
        public string TransportMode { get; set; } = "ROAD";
        public string? FacilityId { get; set; }
        public string? CarrierName { get; set; }
        public string? FlightVoyageNo { get; set; }
        public DateTime? ExpectedEta { get; set; }
        public string? Status { get; set; } = "PLANNED";
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
    }

    // =========================================================================
    // 7. ASSIGNMENT DTOs
    // =========================================================================
    public class AssignCrewVehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string DriverId { get; set; } = string.Empty;
        public string EscortId { get; set; } = string.Empty;
    }

    // =========================================================================
    // 8. TRIP MONITORING (MAP & DATA STREAM) DTOs
    // =========================================================================
    public class TripMonitoringDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public VehiclePositionDto VehiclePosition { get; set; } = new();
        public List<FixedMarkerDto> FixedMarkers { get; set; } = new();
        public List<double[]> RoutePolyline { get; set; } = new();
        public string CurrentLocationName { get; set; } = string.Empty;
        public DateTime? EtaDestination { get; set; }
    }

    public class VehiclePositionDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string LastUpdated { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = "Moving";
    }

    public class FixedMarkerDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // ORIGIN, REST_STOP, CUSTOMS, DESTINATION
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string Color { get; set; } = "#3B82F6";
        public string Icon { get; set; } = "📍";
        public string Status { get; set; } = "PLANNED"; // PLANNED, PASSED, CURRENT
    }

    // =========================================================================
    // 9. OPERATIONS READINESS DTOs
    // =========================================================================
    public class OperationsReadinessDto
    {
        public string TripId { get; set; } = string.Empty;
        public bool RouteCreated { get; set; }
        public bool RouteApproved { get; set; }
        public bool VehicleAssigned { get; set; }
        public bool DriverAssigned { get; set; }
        public bool EscortAssigned { get; set; }
        public bool StallsSufficient { get; set; }
        public bool IsReady { get; set; }
        public bool ConfirmedByCoordinator { get; set; }
        public List<string> MissingConditions { get; set; } = new();
    }
}

