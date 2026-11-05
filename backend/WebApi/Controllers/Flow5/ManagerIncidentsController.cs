using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Route("api/manager/incidents")]
[Tags("Flow 5 — Quản lý sự cố & Khôi phục (Incidents & Recovery)")]
[Authorize(Roles = $"{UserRoles.LogisticsManager},{UserRoles.Admin}")]
public class ManagerIncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public ManagerIncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J17: Manager phê duyệt hoặc trả lại phương án khôi phục
    /// </summary>
    [HttpPost("{incidentId}/recovery/decision")]
    public async Task<IActionResult> DecideRecoveryPlan([FromRoute] string incidentId, [FromBody] RecoveryDecisionInputDto dto)
    {
        var result = await _incidentService.DecideRecoveryPlanAsync(incidentId, dto, CurrentUserId);
        return Success(result, $"Quản lý đã ra quyết định: {dto.Decision}");
    }

    /// <summary>
    /// F5-J31: Manager thông báo hoặc đề nghị thống nhất thỏa thuận với khách hàng
    /// </summary>
    [HttpPost("{incidentId}/communications")]
    public async Task<IActionResult> SendCustomerCommunication([FromRoute] string incidentId, [FromBody] CommunicationInputDto dto)
    {
        var result = await _incidentService.CreateCustomerCommunicationAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã gửi thông báo tới khách hàng thành công");
    }

    /// <summary>
    /// F5-J33: Ghi nhận thỏa thuận ngoài hệ thống với khách hàng có bằng chứng
    /// </summary>
    [HttpPost("{incidentId}/customer-agreements/external")]
    public async Task<IActionResult> LogExternalCustomerAgreement([FromRoute] string incidentId, [FromBody] ExternalAgreementInputDto dto)
    {
        var result = await _incidentService.LogExternalAgreementAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã ghi nhận thỏa thuận ngoài hệ thống thành công");
    }

    /// <summary>
    /// F5-J42: Cho phép chia sẻ file tài liệu bằng chứng cho khách hàng xem
    /// </summary>
    [HttpPost("{incidentId}/files/{fileId}/share")]
    public async Task<IActionResult> ShareFileWithCustomer([FromRoute] string incidentId, [FromRoute] string fileId, [FromBody] ShareFileInputDto dto)
    {
        var result = await _incidentService.ShareFileWithCustomerAsync(incidentId, fileId, dto, CurrentUserId);
        return Success(result, "Cập nhật quyền chia sẻ tài liệu thành công");
    }

    /// <summary>
    /// F5-J37: Đề xuất phương án kết thúc chuyến đi sớm khi bất khả kháng
    /// </summary>
    [HttpPost("{incidentId}/termination-proposals")]
    public async Task<IActionResult> CreateTerminationProposal([FromRoute] string incidentId, [FromBody] TerminationInputDto dto)
    {
        var result = await _incidentService.CreateTerminationProposalAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã gửi đề xuất kết thúc sớm cho khách hàng xem xét");
    }

    /// <summary>
    /// F5-J39: Chuyển hồ sơ kết thúc sớm sang bộ phận pháp lý/bảo hiểm để xử lý nghĩa vụ
    /// </summary>
    [HttpPost("{incidentId}/termination-proposals/{proposalId}/refer")]
    public async Task<IActionResult> ReferTerminationProposal([FromRoute] string incidentId, [FromRoute] string proposalId, [FromBody] TerminationReferInputDto dto)
    {
        var result = await _incidentService.ReferTerminationProposalAsync(incidentId, proposalId, dto, CurrentUserId);
        return Success(result, "Đã chuyển giao hồ sơ sang bộ phận phụ trách thành công");
    }
}

