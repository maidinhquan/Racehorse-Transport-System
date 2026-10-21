using Application.DTOs;

namespace Application.Interfaces
{
    public interface ICoordinatorService
    {
        // 1. Dashboard & Planning
        Task<CoordinatorDashboardDto> GetDashboardAsync();
        Task<List<PlanningTripDto>> GetPlanningTripsAsync();
        Task<TripDetailDto?> GetTripDetailAsync(string tripId);
        Task<List<UnplannedRequestDto>> GetUnplannedRequestsAsync();
        Task<PlanningTripDto> StartPlanningTripAsync(StartPlanningRequestDto dto);
        
        // 2. Checkpoints & Geocoding
        Task<List<CheckpointDto>> GetCheckpointsAsync(string? country, string? type, string? q);
        Task<List<CheckpointDto>> GeocodeAddressAsync(string address, string? country = "VN");

        // 3. Fleet & Vehicles
        Task<List<VehicleDto>> GetVehiclesAsync(string? status = null, string? country = null, int? minStalls = null);
        Task<VehicleDto?> GetVehicleDetailAsync(string vehicleId);
        Task<VehicleDto> CreateVehicleAsync(CreateVehicleDto dto);
        Task<VehicleDto?> UpdateVehicleAsync(string vehicleId, CreateVehicleDto dto);
        Task<bool> UpdateVehicleStatusAsync(string vehicleId, UpdateVehicleStatusDto dto);
        Task<List<ResourceScheduleItemDto>> GetVehicleScheduleAsync(string vehicleId);
        Task<List<VehicleDto>> GetAvailableVehiclesAsync(string? tripId = null, int? legId = null);

        // 4. Staff & Schedules
        Task<List<StaffDto>> GetStaffListAsync(string? role = null, string? country = null);
        Task<List<ResourceScheduleItemDto>> GetStaffScheduleAsync(string userId);

        // 5. Route Calculation & Versions
        Task<RouteCalculateResponseDto> CalculateRouteAsync(RouteCalculateRequestDto dto);
        Task<List<RouteVersionSummaryDto>> GetRouteVersionsAsync(string tripId);
        Task<RouteCalculateResponseDto?> GetRouteVersionDetailAsync(int routeVersionId);
        Task<RouteVersionSummaryDto> CreateRouteDraftAsync(string tripId, RouteDraftPayloadDto dto);
        Task<RouteVersionSummaryDto> UpdateRouteDraftAsync(int routeVersionId, RouteDraftPayloadDto dto);
        Task<SubmitRouteResponseDto> SubmitRouteVersionAsync(int routeVersionId, SubmitRouteDto dto);
        Task<bool> SubmitRouteForApprovalAsync(string tripId);
        Task<List<RouteSegmentItemDto>> GetRouteSegmentsAsync(string tripId);
        Task<bool> SaveRouteSegmentsAsync(string tripId, SaveRouteSegmentsDto dto);

        // 6. Manager Route Approval & Planning Queue
        Task<List<ManagerPlanningItemDto>> GetManagerPlanningTripsAsync();
        Task<RouteCalculateResponseDto?> GetManagerTripRouteAsync(string tripId);
        Task<bool> ApproveRouteVersionAsync(string tripId, int routeVersionId, ManagerApproveRouteDto dto);
        Task<bool> ReturnRouteVersionAsync(string tripId, int routeVersionId, ManagerReturnRouteDto dto);
        Task<bool> ApproveDepartureAsync(string tripId, ManagerApproveDepartureDto? dto = null);

        // 7. Leg Assignments
        Task<TripAssignmentsDetailDto> GetTripAssignmentsAsync(string tripId);
        Task<ValidateAssignmentsResponseDto> ValidateAssignmentsAsync(string tripId, TripAssignmentsDetailDto dto);
        Task<bool> SaveTripAssignmentsAsync(string tripId, TripAssignmentsDetailDto dto);
        Task<bool> AssignCrewAndVehicleAsync(string tripId, AssignCrewVehicleDto dto);

        // 8. Flight Booking (Air Leg)
        Task<FlightBookingDto?> GetFlightBookingAsync(string tripId);
        Task<FlightBookingDto> SaveFlightBookingAsync(string tripId, UpdateFlightBookingDto dto);

        // 9. Readiness & Departure Conditions
        Task<OperationsReadinessDto> GetOperationsReadinessAsync(string tripId);
        Task<bool> ConfirmOperationsReadinessAsync(string tripId, ConfirmOperationsReadinessRequestDto? dto = null);
        Task<DepartureConditionsDto> GetDepartureConditionsAsync(string tripId, bool isManager = false);

        // 10. Map Monitoring
        Task<TripMonitoringDto?> GetTripMonitoringAsync(string tripId);
    }
}
