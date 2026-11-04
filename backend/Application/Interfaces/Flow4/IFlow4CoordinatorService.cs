using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4CoordinatorService
{
    /// <summary>
    /// F4-J01: Đọc chính sách hệ thống và capability giám sát thực thi hành trình.
    /// </summary>
    Task<Flow4CapabilitiesDto> GetFlow4CapabilitiesAsync();

    /// <summary>
    /// F4-J03: Đọc ngữ cảnh hành trình, danh sách mốc, xe, ngựa và chốt chặn an toàn (Blockers).
    /// </summary>
    Task<Flow4TrackingDto> GetTripExecutionAsync(string tripId, string userId, string role);

    /// <summary>
    /// F4-J07: Lấy lịch sử sự kiện timeline mốc, đính chính và quyết định (Append-Only).
    /// </summary>
    Task<List<Flow4HistoryEventDto>> GetTripExecutionHistoryAsync(string tripId);

    /// <summary>
    /// F4-J09: Danh sách các yêu cầu đính chính mốc đang chờ Điều phối viên xử lý.
    /// </summary>
    Task<List<MilestoneCorrectionDto>> GetMilestoneCorrectionsAsync(string tripId);

    /// <summary>
    /// F4-J10: Điều phối viên ra quyết định duyệt hoặc từ chối yêu cầu đính chính mốc.
    /// </summary>
    Task<Flow4MutationResultDto> DecideMilestoneCorrectionAsync(string tripId, string correctionId, MilestoneCorrectionDecisionInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J14: Ghi nhận thông tin lịch bay hoặc sự kiện hàng không từ đối tác AIR.
    /// </summary>
    Task<AirNoticeDto> RecordAirNoticeAsync(string tripId, AirNoticeInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J16: Tra cứu lịch sử các thông báo lịch bay của chặng hàng không.
    /// </summary>
    Task<List<AirNoticeDto>> GetAirNoticesAsync(string tripId);

    /// <summary>
    /// F4-J18: Điều phối viên lập đề xuất điều chỉnh ETA khi phát sinh thay đổi lịch trình.
    /// </summary>
    Task<EtaProposalDto> ProposeCoordinatorEtaAsync(string tripId, EtaProposalInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J19: Tra cứu ETA hiện hành và danh sách các đề xuất điều chỉnh ETA.
    /// </summary>
    Task<List<EtaProposalDto>> GetEtaProposalsAsync(string tripId);

    /// <summary>
    /// F4-J20: Điều phối viên phê duyệt ETA (nếu trong hạn giao hàng) hoặc chuyển cấp Quản lý.
    /// </summary>
    Task<Flow4MutationResultDto> DecideEtaProposalAsync(string tripId, string proposalId, EtaDecisionInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J27: Danh sách cảnh báo trễ mốc và đến hạn kiểm tra y tế của chuyến đi.
    /// </summary>
    Task<List<Flow4AlertDto>> GetAlertsAsync(string tripId);

    /// <summary>
    /// F4-J28: Điều phối viên xác nhận đã tiếp nhận và đang xử lý cảnh báo.
    /// </summary>
    Task<Flow4MutationResultDto> AcknowledgeAlertAsync(string tripId, string alertId, Flow4AcknowledgeAlertInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J29: Ghi nhật ký liên hệ khẩn cấp ngoài luồng khi kíp xe không phản hồi.
    /// </summary>
    Task<Flow4MutationResultDto> RecordContactLogAsync(string tripId, Flow4ContactLogInputDto dto, string coordinatorId);

    /// <summary>
    /// F4-J30: Tải lên file ảnh/chứng từ hiện trường thực tế (giới hạn dung lượng <= 10MB).
    /// </summary>
    Task<Flow4FileUploadResultDto> UploadExecutionFileAsync(string tripId, string fileName, string contentType, byte[] fileBytes, string purpose, string? horseId, string userId);

    /// <summary>
    /// F4-J31: Tải xuống file chứng từ thực thi theo fileId có kiểm soát phân quyền.
    /// </summary>
    Task<(string fileName, string contentType, byte[] fileBytes)?> GetExecutionFileAsync(string tripId, string fileId);

    /// <summary>
    /// F4-J37: Tra cứu danh sách các khoản chi phí phát sinh thực tế trên đường (Petty Cash).
    /// </summary>
    Task<List<TripExpenseRecordDto>> GetExpensesAsync(string tripId);
}

