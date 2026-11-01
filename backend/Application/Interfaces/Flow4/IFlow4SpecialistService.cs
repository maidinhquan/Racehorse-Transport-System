using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4SpecialistService
{
    /// <summary>
    /// F4-J11: Tra cứu danh sách các trạm kiểm soát pháp lý và quyết định kiểm tra trên chuyến đi.
    /// </summary>
    Task<List<CheckpointRecordDto>> GetCheckpointsAsync(string tripId);

    /// <summary>
    /// F4-J12: Chuyên viên pháp lý vận chuyển ghi nhận kết quả kiểm tra thực tế tại trạm (CLEARED / HELD / SUPPLEMENT_REQUIRED).
    /// </summary>
    Task<Flow4MutationResultDto> RecordCheckpointDecisionAsync(string tripId, string checkpointId, CheckpointDecisionInputDto dto, string specialistId);
}

