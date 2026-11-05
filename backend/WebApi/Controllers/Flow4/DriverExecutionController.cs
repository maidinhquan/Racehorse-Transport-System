using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/driver/trips")]
[Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
public class DriverExecutionController : BaseApiController
{
    private readonly IFlow4DriverService _driverService;
    private readonly IFlow4HealthService _healthService;

    public DriverExecutionController(
        IFlow4DriverService driverService,
        IFlow4HealthService healthService)
    {
        _driverService = driverService;
        _healthService = healthService;
    }

    /// <summary>
    /// F4-J02: Lấy danh sách nhiệm vụ vận chuyển được phân công
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAssignedTrips([FromQuery] string? status)
    {
        var result = await _driverService.GetAssignedTripsAsync(CurrentUserId, status);
        return Success(result);
    }

    /// <summary>
    /// F4-J04: Kiểm tra xe và ngựa trước khi xuất phát thực tế
    /// </summary>
    [HttpGet("{tripId}/departure-check")]
    public async Task<IActionResult> GetDepartureCheck([FromRoute] string tripId, [FromQuery] string leg = "road")
    {
        var result = await _driverService.GetDepartureCheckAsync(tripId, leg, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J05: Xác nhận xuất phát thực tế
    /// </summary>
    [HttpPost("{tripId}/departure")]
    public async Task<IActionResult> ConfirmDeparture([FromRoute] string tripId, [FromBody] DriverDepartureInputDto dto)
    {
        var result = await _driverService.ConfirmDepartureAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J06: Hoàn tất mốc kế tiếp theo tuần tự sequence
    /// </summary>
    [HttpPost("{tripId}/milestones/{milestoneId}/complete")]
    public async Task<IActionResult> CompleteMilestone(
        [FromRoute] string tripId,
        [FromRoute] string milestoneId,
        [FromBody] MilestoneCompleteInputDto dto)
    {
        var result = await _driverService.CompleteMilestoneAsync(tripId, milestoneId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J08: Yêu cầu đính chính mốc đã hoàn tất
    /// </summary>
    [HttpPost("{tripId}/milestones/{milestoneId}/correction-requests")]
    public async Task<IActionResult> RequestCorrection(
        [FromRoute] string tripId,
        [FromRoute] string milestoneId,
        [FromBody] MilestoneCorrectionInputDto dto)
    {
        var result = await _driverService.RequestCorrectionAsync(tripId, milestoneId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }

    /// <summary>
    /// F4-J13: Bàn giao ngựa cho đối tác tại kho Cargo sân bay đi
    /// </summary>
    [HttpPost("{tripId}/air/handover")]
    public async Task<IActionResult> HandoverAir([FromRoute] string tripId, [FromBody] AirHandoverInputDto dto)
    {
        var result = await _driverService.HandoverAirAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J15: Kiểm tra và tiếp nhận ngựa tại kho Cargo sân bay đến
    /// </summary>
    [HttpPost("{tripId}/air/receive")]
    public async Task<IActionResult> ReceiveAir([FromRoute] string tripId, [FromBody] AirReceiveInputDto dto)
    {
        var result = await _driverService.ReceiveAirAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J17: Tài xế lập đề xuất điều chỉnh ETA khi có chậm trễ
    /// </summary>
    [HttpPost("{tripId}/eta-proposals")]
    public async Task<IActionResult> ProposeEta([FromRoute] string tripId, [FromBody] EtaProposalInputDto dto)
    {
        var result = await _driverService.ProposeDriverEtaAsync(tripId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }

    /// <summary>
    /// F4-J23: Ghi nhận quan sát và chỉ số sinh hiệu ngựa
    /// </summary>
    [HttpPost("{tripId}/health-logs")]
    public async Task<IActionResult> RecordHealthLog([FromRoute] string tripId, [FromBody] HealthLogInputDto dto)
    {
        var result = await _healthService.RecordHealthLogAsync(tripId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }

    /// <summary>
    /// F4-J24: Bổ sung bản đính chính nhật ký sức khỏe (append-only)
    /// </summary>
    [HttpPost("{tripId}/health-logs/{healthLogId}/amendments")]
    public async Task<IActionResult> AmendHealthLog(
        [FromRoute] string tripId,
        [FromRoute] string healthLogId,
        [FromBody] HealthLogAmendmentInputDto dto)
    {
        var result = await _healthService.AmendHealthLogAsync(tripId, healthLogId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }

    /// <summary>
    /// F4-J25: Bác sĩ thú y ghi nhận kết luận thể trạng
    /// </summary>
    [HttpPost("{tripId}/vet-assessments")]
    public async Task<IActionResult> RecordVetAssessment([FromRoute] string tripId, [FromBody] VetAssessmentInputDto dto)
    {
        var result = await _healthService.RecordVetAssessmentAsync(tripId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }

    /// <summary>
    /// F4-J36: Ghi nhận chi phí phát sinh trên đường
    /// </summary>
    [HttpPost("{tripId}/expenses")]
    public async Task<IActionResult> RecordExpense([FromRoute] string tripId, [FromBody] TripExpenseInputDto dto)
    {
        var result = await _driverService.RecordExpenseAsync(tripId, dto, CurrentUserId);
        return CreatedSuccess(result);
    }
}

