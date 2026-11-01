using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/manager/trips")]
[Authorize(Roles = $"{UserRoles.LogisticsManager},{UserRoles.Admin}")]
public class ManagerExecutionController : BaseApiController
{
    private readonly IFlow4ManagerService _managerService;

    public ManagerExecutionController(IFlow4ManagerService managerService)
    {
        _managerService = managerService;
    }

    /// <summary>
    /// F4-J21: Manager quyết định đề xuất ETA vượt hạn giao hàng (leo thang)
    /// </summary>
    [HttpPost("{tripId}/eta-proposals/{proposalId}/decision")]
    public async Task<IActionResult> DecideEtaProposal(
        [FromRoute] string tripId,
        [FromRoute] string proposalId,
        [FromBody] EtaDecisionInputDto dto)
    {
        var result = await _managerService.DecideManagerEtaProposalAsync(tripId, proposalId, dto, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J35: Màn hình chỉ huy giám sát tổng thể vận hành của Quản lý
    /// </summary>
    [HttpGet("{tripId}/execution")]
    public async Task<IActionResult> GetExecutionOverview([FromRoute] string tripId)
    {
        var result = await _managerService.GetManagerExecutionAsync(tripId);
        return Success(result);
    }
}

