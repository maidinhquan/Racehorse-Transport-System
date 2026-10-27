using Application.DTOs;

namespace Application.Interfaces;

public interface IFlow1ManagerService
{
    Task<List<ManagerTransportRequestDto>> GetRequestsAsync();
    Task<ManagerTransportRequestDto?> GetRequestByIdAsync(string requestId);
    Task<ManagerTransportRequestDto?> AcceptRequestAsync(string requestId);
    Task<ManagerTransportRequestDto?> RequestChangesAsync(string requestId, ManagerRequestChangesDto dto);
    Task<ManagerTransportRequestDto?> RejectRequestAsync(string requestId, ManagerRejectRequestDto dto);
    Task<CostPlanDto> GetCostEstimateAsync(string requestId, CostEstimateRequestDto dto);
    Task<ContractEditorDataDto?> GetContractEditorAsync(string requestId, string? mode);
    Task<bool> SaveContractDraftAsync(string requestId, ManagerContractDraftDto draft);
    Task<ContractVersionDto> PublishContractAsync(string requestId, int versionNo);
    Task<bool> RespondFeedbackAsync(string contractId, ManagerRespondFeedbackDto dto);
    Task<bool> ExtendDeadlineAsync(string contractId, ManagerExtendDeadlineDto dto);
}
