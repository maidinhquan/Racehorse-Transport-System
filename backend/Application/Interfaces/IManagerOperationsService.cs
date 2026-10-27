using Application.DTOs;

namespace Application.Interfaces
{
    public interface IManagerOperationsService
    {
        Task<bool> AssignTripAsync(string tripId, ManagerTripAssignmentDto dto, CancellationToken cancellationToken = default);
        Task<(bool Success, string Message)> ApproveDepartureAsync(string tripId, string managerName, CancellationToken cancellationToken = default);
        Task<List<IncidentDto>> GetIncidentsAsync(CancellationToken cancellationToken = default);
        Task<bool> UpdateIncidentStatusAsync(string incidentId, string status, string managerName, CancellationToken cancellationToken = default);
        Task<bool> DecideIncidentPlanAsync(string incidentId, string planId, IncidentPlanDecisionDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<List<ActualCostDto>> GetActualCostsAsync(CancellationToken cancellationToken = default);
        Task<bool> SaveActualCostsAsync(string tripId, SaveActualCostDto dto, CancellationToken cancellationToken = default);
        Task<List<ComplaintDto>> GetComplaintsAsync(CancellationToken cancellationToken = default);
        Task<bool> ReplyComplaintAsync(string complaintId, ComplaintReplyDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<bool> ResolveComplaintAsync(string complaintId, ComplaintResolveDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<bool> EscalateComplaintAsync(string complaintId, string managerName, CancellationToken cancellationToken = default);
        Task<bool> DecideRouteAsync(string tripId, ManagerRouteDecisionDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<bool> DecideFlightAsync(string tripId, ManagerFlightDecisionDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<bool> ResolveHandoverRefusalAsync(string tripId, HandoverResolutionDto dto, string managerName, CancellationToken cancellationToken = default);
        Task<bool> CloseRequestAsync(string requestId, string managerName, CancellationToken cancellationToken = default);
        Task<bool> AddCollectionNoteAsync(string requestId, string note, string managerName, CancellationToken cancellationToken = default);
        Task<ManagerReportsOverviewDto> GetReportsOverviewAsync(CancellationToken cancellationToken = default);
    }
}
