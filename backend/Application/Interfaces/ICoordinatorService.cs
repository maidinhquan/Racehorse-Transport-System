using Application.DTOs;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface ICoordinatorService
    {
        // =========================================================================
        // FLOW 3 V2 METHODS (CONTRACT 2.0.0)
        // =========================================================================

        // 1. Capabilities & System Policies (F3-J01)
        Task<CapabilitiesDto> GetFlow3CapabilitiesAsync();

        // 2. Context & Queue V2 (F3-J02, J04, J10, J23, J24)
        Task<TripContextDto> GetTripContextAsync(string tripId, string role);
        Task<List<TripListItemDto>> GetCoordinatorTripsV2Async(string? mode, string? status, string? planningState);

        // 3. Plan Draft Workflow (F3-J06, J07, J08, J09, J11, J12)
        Task<PlanDto> SavePlanDraftAsync(string tripId, PlanDraftInputDto dto, string userId);
        Task<ValidationDto> ValidatePlanDraftAsync(string tripId, PlanCommandDto dto);
        Task<PlanDto> SubmitPlanAsync(string tripId, PlanCommandDto dto, string userId);
        Task<PlanDto> WithdrawPlanAsync(string tripId, ReasonCommandDto dto, string userId);
        Task<PlanDto> PlanDecisionAsync(string tripId, PlanDecisionInputDto dto, string managerId, string managerName);
        Task<PlanDto> CreatePlanChangesAsync(string tripId, ReasonCommandDto dto, string userId);

        // 4. Readiness & Departure Gate V2 (F3-J14, J15, J16, J17, J18)
        Task<ReadyStampDto> ConfirmResourcesV2Async(string tripId, PlanCommandDto dto, string userId);
        Task<ReadyStampDto> ReevaluateOpsReadyAsync(string tripId, ExpectedDto dto);
        Task<ReadyStampDto> ConfirmDocsReadyAsync(string tripId, ExpectedDto dto, string specialistId, string specialistName);
        Task<ReadinessDto> GetReadinessV2Async(string tripId);
        Task<DepartureResultDto> ApproveDepartureV2Async(string tripId, DepartureInputDto dto, string managerId, string managerName);

        // 5. Flight Catalog, Booking & Budget (F3-J05, J13, J20, J39..J42, J50, J54)
        Task<List<FlightServiceDto>> GetFlightCatalogAsync(string? partnerId, string? originAirport, string? destAirport);
        Task<FlightServiceDto?> LookupFlightAsync(string partnerId, string providerFlightCode);
        Task<PlanDto> SelectFlightAsync(string tripId, FlightSelectInputDto dto, string userId);
        Task<PlanDto> SubmitFlightBudgetProposalAsync(string tripId, BudgetCommandDto dto, string userId);
        Task<PlanDto> ManagerFlightBudgetDecisionAsync(string tripId, BudgetDecisionInputDto dto, string managerId);
        Task<BookingDto> SaveFlightBookingV2Async(string tripId, BookingInputDto dto, string userId);
        Task<BookingDto> CancelFlightBookingV2Async(string tripId, CancelBookingInputDto dto, string userId);
        Task<PlanningFileDto> UploadPlanningFileAsync(string tripId, string fileName, string contentType, long size, string storagePath, string userId);
        Task<PlanningAttachment?> GetPlanningFileAsync(string tripId, string fileId);

        // 6. Pickup Relocation (F3-J28..J33)
        Task<PickupAccessDto> EvaluatePickupAccessAsync(string tripId, AccessInputDto dto, string userId);
        Task<List<PickupCandidateDto>> GetRelocationCandidatesAsync(string tripId);
        Task<PickupRelocationDto> ProposePickupRelocationAsync(string tripId, PickupProposalInputDto dto, string userId);
        Task<PickupRelocationDto> ManagerRelocationDecisionAsync(string tripId, PickupDecisionInputDto dto, string managerId);
        Task<PickupRelocationDto> RecordCustomerConsentAsync(string tripId, ConsentInputDto dto, string managerId);
        Task<PickupRelocationDto> ReopenRelocationProposalAsync(string tripId, ExpectedDto dto, string userId);

        // 7. Places Catalog (F3-J43..J47)
        Task<List<PlaceDto>> GetPlacesAsync(string? country, string? function, string? status, string? q);
        Task<PlaceDto?> GetPlaceDetailAsync(string placeId);
        Task<PlaceDto> CreatePlaceAsync(PlaceInputDto dto, string userId);
        Task<PlaceDto> UpdatePlaceAsync(string placeId, PlaceUpdateDto dto, string userId);
        Task<PlaceDto> UpdatePlaceStatusAsync(string placeId, PlaceStatusDto dto, string userId);
        Task<DeletedDto> DeletePlaceAsync(string placeId);

        // 8. Air Partners CRUD (F3-J34..J38)
        Task<List<AirPartnerDto>> GetAirPartnersAsync(string? status);
        Task<AirPartnerDto?> GetAirPartnerDetailAsync(string partnerId);
        Task<AirPartnerDto> CreateAirPartnerAsync(AirPartnerInputDto dto, string userId);
        Task<AirPartnerDto> UpdateAirPartnerAsync(string partnerId, AirPartnerUpdateDto dto, string userId);
        Task<AirPartnerDto> UpdateAirPartnerStatusAsync(string partnerId, AirPartnerStatusDto dto, string userId);
        Task<DeletedDto> DeleteAirPartnerAsync(string partnerId);

        // 9. Staff V2 (F3-J48, J49)
        Task<List<StaffV2Dto>> GetStaffListV2Async(string? tripId, string? leg, string? status);
        Task<StaffV2Dto> UpdateStaffStatusV2Async(string staffId, StaffStatusDto dto, string userId);

        // 10. Truck Feasibility, Vehicle Options & Reports (F3-J19, J25, J26, J27, J53, J55)
        Task<RoutingDto> CalculateRouteV2Async(string tripId, RoutingInputDto dto);
        Task<ValidationDto> CheckTruckFeasibilityAsync(string tripId, PlanCommandDto dto);
        Task<List<VehicleOptionDto>> GetVehicleOptionsV2Async(string tripId, string? leg);
        Task<List<TripHistoryItemDto>> GetPlanningHistoryAsync(string tripId);
        Task<List<DriverReportItemDto>> GetDriverReportsAsync(string tripId);


        // =========================================================================
        // LEGACY COMPATIBILITY METHODS
        // =========================================================================

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
        Task<bool> DeleteVehicleAsync(string vehicleId);
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
