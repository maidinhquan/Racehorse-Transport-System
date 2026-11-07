using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4DriverService
{
    /// <summary>
    /// F4-J02: Lấy danh sách nhiệm vụ vận chuyển được phân công cho tài xế/áp tải.
    /// </summary>
    Task<List<Flow4TripSummaryDto>> GetAssignedTripsAsync(string driverId, string? status = null);

    Task<object> GetAssignedHorseAsync(string tripId, string horseId, string driverId);
    Task<(byte[] Bytes, string ContentType)> ReadAssignedHorseFileAsync(string tripId, string horseId, string kind, string driverId);

    /// <summary>
    /// F4-J04: Kiểm tra điều kiện xe, ngựa và chốt chặn trước khi xuất phát thực tế.
    /// </summary>
    Task<DepartureCheckResultDto> GetDepartureCheckAsync(string tripId, string? leg, string driverId);

    /// <summary>
    /// F4-J05: Xác nhận xuất phát thực tế (Trip -> IN_TRANSIT, Request -> IN_PROGRESS).
    /// </summary>
    Task<Flow4MutationResultDto> ConfirmDepartureAsync(string tripId, DriverDepartureInputDto dto, string driverId);

    /// <summary>
    /// F4-J06: Hoàn tất mốc kế tiếp tuần tự theo SequenceOrder.
    /// </summary>
    Task<Flow4MutationResultDto> CompleteMilestoneAsync(string tripId, string milestoneId, MilestoneCompleteInputDto dto, string driverId);

    /// <summary>
    /// F4-J08: Yêu cầu đính chính mốc đã COMPLETED.
    /// </summary>
    Task<MilestoneCorrectionDto> RequestCorrectionAsync(string tripId, string milestoneId, MilestoneCorrectionInputDto dto, string driverId);

    /// <summary>
    /// F4-J13: Bàn giao ngựa cho đối tác tại kho Cargo Terminal sân bay đi (AIR_HANDOVER).
    /// </summary>
    Task<Flow4MutationResultDto> HandoverAirAsync(string tripId, AirHandoverInputDto dto, string driverId);

    /// <summary>
    /// F4-J15: Tiếp nhận ngựa tại kho Cargo Terminal sân bay đến (AIR_RECEIVED).
    /// </summary>
    Task<Flow4MutationResultDto> ReceiveAirAsync(string tripId, AirReceiveInputDto dto, string driverId);

    /// <summary>
    /// F4-J17: Tài xế đề xuất điều chỉnh ETA khi phát sinh chậm trễ trên đường.
    /// </summary>
    Task<EtaProposalDto> ProposeDriverEtaAsync(string tripId, EtaProposalInputDto dto, string driverId);

    /// <summary>
    /// F4-J36: Ghi nhận chi phí phát sinh thực tế trên đường (status: RECORDED).
    /// </summary>
    Task<TripExpenseRecordDto> RecordExpenseAsync(string tripId, TripExpenseInputDto dto, string driverId);
}

