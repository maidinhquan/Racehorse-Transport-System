using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/coordinator/trips")]
[Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
public class CoordinatorExecutionController : BaseApiController
{
    private readonly IFlow4CoordinatorService _coordinatorService;

    public CoordinatorExecutionController(IFlow4CoordinatorService coordinatorService)
    {
        _coordinatorService = coordinatorService;
    }

    /// <summary>
    /// F4-J09: Danh sách yêu cầu đính chính mốc cần duyệt
    /// </summary>
    [HttpGet("{tripId}/milestone-corrections")]
    public async Task<IActionResult> GetMilestoneCorrections([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetMilestoneCorrectionsAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J10: Điều phối viên duyệt hoặc từ chối đính chính mốc
    /// </summary>
    [HttpPost("{tripId}/milestone-corrections/{correctionId}/decision")]
    public async Task<IActionResult> DecideMilestoneCorrection(
        [FromRoute] string tripId,
        [FromRoute] string correctionId,
        [FromBody] MilestoneCorrectionDecisionInputDto dto)
    {
        var result = await _coordinatorService.DecideMilestoneCorrectionAsync(tripId, correctionId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J14: Ghi nhận thông tin lịch bay/sự kiện từ hãng hàng không
    /// </summary>
    [HttpPost("{tripId}/air/notices")]
    public async Task<IActionResult> RecordAirNotice(
        [FromRoute] string tripId,
        [FromBody] AirNoticeInputDto dto)
    {
        var result = await _coordinatorService.RecordAirNoticeAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J18: Điều phối viên lập đề xuất điều chỉnh ETA
    /// </summary>
    [HttpPost("{tripId}/eta-proposals")]
    public async Task<IActionResult> ProposeEta(
        [FromRoute] string tripId,
        [FromBody] EtaProposalInputDto dto)
    {
        var result = await _coordinatorService.ProposeCoordinatorEtaAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J20: Duyệt ETA trong hạn giao hoặc chuyển cấp Manager
    /// </summary>
    [HttpPost("{tripId}/eta-proposals/{proposalId}/decision")]
    public async Task<IActionResult> DecideEtaProposal(
        [FromRoute] string tripId,
        [FromRoute] string proposalId,
        [FromBody] EtaDecisionInputDto dto)
    {
        var result = await _coordinatorService.DecideEtaProposalAsync(tripId, proposalId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J28: Ghi nhận đã tiếp nhận và xử lý cảnh báo
    /// </summary>
    [HttpPost("{tripId}/alerts/{alertId}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(
        [FromRoute] string tripId,
        [FromRoute] string alertId,
        [FromBody] Flow4AcknowledgeAlertInputDto dto)
    {
        var result = await _coordinatorService.AcknowledgeAlertAsync(tripId, alertId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J29: Ghi nhật ký liên hệ khẩn cấp khi kíp xe không phản hồi
    /// </summary>
    [HttpPost("{tripId}/contact-logs")]
    public async Task<IActionResult> RecordContactLog(
        [FromRoute] string tripId,
        [FromBody] Flow4ContactLogInputDto dto)
    {
        var result = await _coordinatorService.RecordContactLogAsync(tripId, dto, CurrentUserId);
        return Success(result);
    }
}

