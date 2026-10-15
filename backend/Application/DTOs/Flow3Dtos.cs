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
    // 4. CHECKPOINT DTOs (F03-C04)
    // =========================================================================
    public class CheckpointDto
    {
        public int CheckpointId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Country { get; set; } = "VN";
        public string Type { get; set; } = "AIRPORT"; // AIRPORT, QUARANTINE_STATION, LAND_BORDER
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public bool Active { get; set; } = true;
    }

    // =========================================================================
    // 5. FLEET (VEHICLE) DTOs (F03-C11 to F03-C17)
    // =========================================================================
    public class VehicleDto
    {
        public string VehicleId { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string RegistrationCountry { get; set; } = "VN";
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

    // =========================================================================
    // 6. STAFF DTOs (F03-C18, F03-C19)
    // =========================================================================
    public class StaffDto
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Driver, Escort
        public string LicenseClass { get; set; } = "FC";
        public DateTime? LicenseExpiry { get; set; }
        public List<string> CanDriveCountries { get; set; } = new() { "VN" };
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; } = true;
        public string Specialization { get; set; } = string.Empty; // "Tài xế quốc tế", "Bác sĩ thú y áp tải"
    }

    // =========================================================================
    // 7. ROUTE VERSIONING & CALCULATION DTOs (F03-C05 to F03-C10)
    // =========================================================================
    public class RouteCalculateRequestDto
    {
        public string? TripId { get; set; }
        public DateTime PlannedDepartureAt { get; set; }
        public List<RoutePointInputDto> Points { get; set; } = new();
        public List<RouteLegInputDto> Legs { get; set; } = new();
        public string? DeadlineJustification { get; set; }
    }

    public class RoutePointInputDto
    {
        public int Sequence { get; set; }
        public string Type { get; set; } = "ORIGIN"; // ORIGIN, REST_STOP, CHECKPOINT, AIRPORT, DESTINATION
        public string Name { get; set; } = string.Empty;
        public int? CheckpointId { get; set; }
        public decimal Lat { get; set; }
        public decimal Lng { get; set; }
        public int PlannedStopMinutes { get; set; }
    }

    public class RouteLegInputDto
    {
        public int FromSequence { get; set; }
        public int ToSequence { get; set; }
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR
        public decimal? ManualDistanceKm { get; set; }
        public int? ManualDurationMinutes { get; set; }
        public FlightInputDto? Flight { get; set; }
    }

    public class FlightInputDto
    {
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
    }

    public class RouteCalculateResponseDto
    {
        public decimal TotalDistanceKm { get; set; }
        public decimal TotalElapsedHours { get; set; }
        public DateTime EtaDestination { get; set; }
        public DateTime? DeliveryDeadline { get; set; }
        public bool MeetsEquineWelfare { get; set; } // true if continuous drive <= 6h
        public RouteValidationResultDto Validation { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public List<RouteLegResultDto> Legs { get; set; } = new();
        public List<double[]> PolylineCoordinates { get; set; } = new();
    }

    public class RouteValidationResultDto
    {
        public bool CanSubmit { get; set; } = true;
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class RouteLegResultDto
    {
        public int FromSequence { get; set; }
        public int ToSequence { get; set; }
        public string Mode { get; set; } = "ROAD";
        public decimal DistanceKm { get; set; }
        public int DurationMinutes { get; set; }
        public string DistanceSource { get; set; } = "MAP_SERVICE";
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public List<double[]> Path { get; set; } = new();
    }

    public class RouteVersionSummaryDto
    {
        public int RouteVersionId { get; set; }
        public string TripId { get; set; } = string.Empty;
        public int Version { get; set; } = 1;
        public string Status { get; set; } = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, RETURNED
        public string Source { get; set; } = "PLANNING";
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ReturnReason { get; set; }
        public DateTime? EtaDestination { get; set; }
        public List<string> AllowedActions { get; set; } = new();
    }

    public class RouteDraftPayloadDto
    {
        public int? ExpectedVersion { get; set; }
        public DateTime PlannedDepartureAt { get; set; }
        public List<RoutePointInputDto> Points { get; set; } = new();
        public List<RouteLegInputDto> Legs { get; set; } = new();
        public string? DeadlineJustification { get; set; }
    }

    public class SubmitRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string? DeadlineJustification { get; set; }
    }

    public class SubmitRouteResponseDto
    {
        public int RouteVersionId { get; set; }
        public int Version { get; set; }
        public string Status { get; set; } = "PENDING_APPROVAL";
        public DateTime SubmittedAt { get; set; }
        public bool ManagerNotified { get; set; } = true;
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
    // 8. MANAGER APPROVAL / RETURN DTOs (F03-M01 to F03-M04)
    // =========================================================================
    public class ManagerApproveRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string? Note { get; set; }
    }

    public class ManagerReturnRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string Reason { get; set; } = string.Empty;
    }

    public class ManagerPlanningItemDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = "PLANNING";
        public string RouteStatus { get; set; } = "PENDING_APPROVAL";
        public int? CurrentRouteVersionId { get; set; }
        public string DeploymentStatus { get; set; } = "CONFIRMED";
        public DateTime? PlannedDepartureAt { get; set; }
        public DepartureConditionsDto Conditions { get; set; } = new();
    }

    // =========================================================================
    // 9. ASSIGNMENTS PER LEG DTOs (F03-C20 to F03-C22)
    // =========================================================================
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

    public class StaffRoleItemDto
    {
        public string UserId { get; set; } = string.Empty;
        public string AssignmentRole { get; set; } = "MAIN_DRIVER";
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

    // =========================================================================
    // 10. FLIGHT BOOKING DTOs (F03-C23, F03-C24)
    // =========================================================================
    public class FlightBookingDto
    {
        public int FlightBookingId { get; set; }
        public int BookingVersion { get; set; } = 1;
        public string TripId { get; set; } = string.Empty;
        public int? RouteVersionId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public int? DepartureAirportCheckpointId { get; set; }
        public int? ArrivalAirportCheckpointId { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public bool DirectFlight { get; set; } = true;
        public string BookingReference { get; set; } = string.Empty;
        public bool BookingConfirmed { get; set; } = true;
        public List<string> HorseIds { get; set; } = new();
        public string? Note { get; set; }
    }

    public class UpdateFlightBookingDto
    {
        public int? ExpectedBookingVersion { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public int? DepartureAirportCheckpointId { get; set; }
        public int? ArrivalAirportCheckpointId { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public List<string> HorseIds { get; set; } = new();
        public string? Note { get; set; }
    }

    // =========================================================================
    // 11. TRIP MONITORING (MAP & DATA STREAM) DTOs
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
    // 12. OPERATIONS READINESS & DEPARTURE CONDITIONS (F03-C25 to F03-C27, F03-M06)
    // =========================================================================
    public class OperationsReadinessDto
    {
        public string TripId { get; set; } = string.Empty;
        public int RouteVersionId { get; set; } = 1;
        public int AssignmentVersion { get; set; } = 1;
        public bool RouteCreated { get; set; }
        public bool RouteApproved { get; set; }
        public bool VehicleAssigned { get; set; }
        public bool DriverAssigned { get; set; }
        public bool EscortAssigned { get; set; }
        public bool StallsSufficient { get; set; }
        public bool IsReady { get; set; }
        public bool ConfirmedByCoordinator { get; set; }
        public List<ConditionItemDto> Conditions { get; set; } = new();
        public List<string> MissingConditions { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class ConfirmOperationsReadinessRequestDto
    {
        public int? RouteVersionId { get; set; }
        public int? ExpectedAssignmentVersion { get; set; }
        public int? ExpectedFlightBookingId { get; set; }
        public int? ExpectedFlightBookingVersion { get; set; }
        public string? Note { get; set; }
    }

    public class DepartureConditionsDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripStatus { get; set; } = "PLANNING";
        public string DeploymentStatus { get; set; } = "CONFIRMED";
        public int? RouteVersionId { get; set; }
        public bool AllMet { get; set; }
        public OperationsReadinessSummaryDto OperationsReadiness { get; set; } = new();
        public DocumentsReadinessSummaryDto DocumentsReadiness { get; set; } = new();
        public List<ConditionItemDto> Conditions { get; set; } = new();
        public List<string> MissingConditions { get; set; } = new();
        public List<string> AllowedActions { get; set; } = new();
    }

    public class ConditionItemDto
    {
        public string Code { get; set; } = string.Empty;
        public bool Met { get; set; }
        public bool Applicable { get; set; } = true;
    }

    public class OperationsReadinessSummaryDto
    {
        public bool Ready { get; set; }
        public bool Confirmed { get; set; }
        public int? RouteVersionId { get; set; }
        public int? AssignmentVersion { get; set; }
        public string? ConfirmedBy { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }

    public class DocumentsReadinessSummaryDto
    {
        public bool Ready { get; set; }
        public bool Confirmed { get; set; }
        public int? RouteVersionId { get; set; }
        public List<string> MissingConditions { get; set; } = new();
    }
}
