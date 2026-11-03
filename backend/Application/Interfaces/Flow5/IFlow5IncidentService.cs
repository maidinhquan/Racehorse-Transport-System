using Application.DTOs.Flow5;

namespace Application.Interfaces.Flow5;

public interface IFlow5IncidentService
{
    Task<IncidentResponseDto> ReportIncidentAsync(ReportIncidentInputDto dto, string reporterUserId);
    Task<List<IncidentResponseDto>> GetIncidentsAsync(string? tripId, string? status);
    Task<IncidentResponseDto> GetIncidentByIdAsync(string incidentId);
    Task<IncidentResponseDto> AcceptIncidentAsync(string incidentId, string coordinatorUserId);
}
