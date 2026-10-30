using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4ManagerService
{
    /// <summary>
    /// F4-J21: Quản lý logistics đưa ra quyết định đối với các đề xuất điều chỉnh ETA vượt hạn giao hàng (PENDING_MANAGER).
    /// </summary>
    Task<Flow4MutationResultDto> DecideManagerEtaProposalAsync(string tripId, string proposalId, EtaDecisionInputDto dto, string managerId);

    /// <summary>
    /// F4-J35: Màn hình chỉ huy giám sát tổng thể toàn diện tiến độ vận hành của Quản lý logistics.
    /// </summary>
    Task<Flow4TrackingDto> GetManagerExecutionAsync(string tripId);
}

