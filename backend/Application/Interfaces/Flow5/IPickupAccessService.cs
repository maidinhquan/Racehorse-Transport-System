using Application.DTOs.Flow5;

namespace Application.Interfaces.Flow5;

public interface IPickupAccessService
{
    /// <summary>
    /// Tài xế báo cáo không thể tiếp cận điểm lấy ngựa
    /// </summary>
    Task<PickupAccessStatusResponseDto> ReportAccessBlockedAsync(string tripId, PickupAccessBlockedRequestDto dto, string currentUserId);

    /// <summary>
    /// Điều phối viên đề xuất phương án (Điểm hẹn dắt bộ <500m hoặc Xe trung chuyển >=500m)
    /// </summary>
    Task<PickupAccessStatusResponseDto> ResolveAccessAsync(string tripId, PickupAccessResolutionRequestDto dto, string currentUserId);

    /// <summary>
    /// Khách hàng xác nhận hoặc từ chối phương án
    /// </summary>
    Task<PickupAccessStatusResponseDto> DecideAccessAsync(string tripId, PickupAccessDecisionRequestDto dto, string currentUserId);

    /// <summary>
    /// Tra cứu trạng thái tiếp cận điểm đón của chuyến đi
    /// </summary>
    Task<PickupAccessStatusResponseDto> GetAccessStatusAsync(string tripId, string currentUserId);
}

