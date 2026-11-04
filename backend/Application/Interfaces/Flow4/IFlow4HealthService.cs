using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4HealthService
{
    /// <summary>
    /// F4-J22: Tra cứu nhật ký sức khỏe, sinh hiệu của các cá thể ngựa trên chuyến đi.
    /// </summary>
    Task<List<HealthLogDto>> GetHealthLogsAsync(string tripId, string? horseId = null);

    /// <summary>
    /// F4-J23: Ghi nhận nhật ký sức khỏe, quan sát lâm sàng và sinh hiệu cá thể ngựa.
    /// </summary>
    Task<HealthLogDto> RecordHealthLogAsync(string tripId, HealthLogInputDto dto, string userId);

    /// <summary>
    /// F4-J24: Đính chính nhật ký sức khỏe theo mô hình Append-Only (không sửa đè dữ liệu cũ).
    /// </summary>
    Task<HealthLogDto> AmendHealthLogAsync(string tripId, string healthLogId, HealthLogAmendmentInputDto dto, string userId);

    /// <summary>
    /// F4-J25: Bác sĩ thú y ghi nhận kết luận thể trạng chuyên môn (FIT / NOT_FIT / NEEDS_REVIEW).
    /// </summary>
    Task<VetAssessmentDto> RecordVetAssessmentAsync(string tripId, VetAssessmentInputDto dto, string vetId);

    /// <summary>
    /// F4-J26: Tra cứu các kết luận và chỉ dẫn chăm sóc y tế của Bác sĩ thú y trên chuyến đi.
    /// </summary>
    Task<List<VetAssessmentDto>> GetVetAssessmentsAsync(string tripId, string? horseId = null);
}

