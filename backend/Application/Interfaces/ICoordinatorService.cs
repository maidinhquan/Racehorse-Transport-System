using Application.DTOs;

namespace Application.Interfaces
{
    public interface ICoordinatorService
    {
        Task<CoordinatorDashboardDto> GetDashboardAsync();
        Task<List<PlanningTripDto>> GetPlanningTripsAsync();
        Task<TripDetailDto?> GetTripDetailAsync(string tripId);
        
        Task<List<VehicleDto>> GetVehiclesAsync(bool onlyAvailable = false);
        Task<VehicleDto> CreateVehicleAsync(CreateVehicleDto dto);
        Task<bool> UpdateVehicleStatusAsync(string vehicleId, UpdateVehicleStatusDto dto);
        
        Task<List<StaffDto>> GetStaffListAsync();
        
        Task<RouteCalculateResponseDto> CalculateRouteAsync(RouteCalculateRequestDto dto);
        Task<List<RouteSegmentItemDto>> GetRouteSegmentsAsync(string tripId);
        Task<bool> SaveRouteSegmentsAsync(string tripId, SaveRouteSegmentsDto dto);
        Task<bool> SubmitRouteForApprovalAsync(string tripId);
        
        Task<bool> AssignCrewAndVehicleAsync(string tripId, AssignCrewVehicleDto dto);
        
        Task<TripMonitoringDto?> GetTripMonitoringAsync(string tripId);
        
        Task<OperationsReadinessDto> GetOperationsReadinessAsync(string tripId);
        Task<bool> ConfirmOperationsReadinessAsync(string tripId);
        Task<bool> ApproveRouteAsync(string tripId);
    }
}

