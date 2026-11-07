using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Route("api/customer/requests/{requestId}/incidents")]
[Tags("Flow 5 — Quản lý sự cố & Khôi phục (Incidents & Recovery)")]
[Authorize(Roles = $"{UserRoles.Customer},{UserRoles.Admin}")]
public class CustomerIncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public CustomerIncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J29: Khách hàng xem danh sách sự cố và ảnh hưởng được thông báo trên đơn hàng
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCustomerIncidents([FromRoute] string requestId)
    {
        var result = await _incidentService.GetCustomerIncidentsAsync(requestId);
        return Success(result);
    }

    /// <summary>
    /// F5-J30: Khách hàng đọc chi tiết sự cố được chia sẻ
    /// </summary>
    [HttpGet("{incidentId}")]
    public async Task<IActionResult> GetCustomerIncidentDetail([FromRoute] string requestId, [FromRoute] string incidentId)
    {
        var result = await _incidentService.GetCustomerIncidentDetailAsync(requestId, incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J32: Khách hàng đồng ý hoặc từ chối thông báo / đề nghị thỏa thuận cụ thể
    /// </summary>
    [HttpPost("{incidentId}/communications/{messageId}/reply")]
    public async Task<IActionResult> ReplyCustomerCommunication(
        [FromRoute] string requestId,
        [FromRoute] string incidentId,
        [FromRoute] string messageId,
        [FromBody] CustomerReplyDto dto)
    {
        var result = await _incidentService.ReplyCustomerCommunicationAsync(requestId, incidentId, messageId, dto, CurrentUserId);
        return Success(result, "Đã gửi phản hồi của khách hàng thành công");
    }

    /// <summary>
    /// F5-J36: Khách hàng tải tài liệu / bằng chứng được chia sẻ
    /// </summary>
    [HttpGet("{incidentId}/files/{fileId}")]
    public async Task<IActionResult> GetSharedIncidentFile(
        [FromRoute] string requestId,
        [FromRoute] string incidentId,
        [FromRoute] string fileId)
    {
        var result = await _incidentService.GetIncidentFileAsync(incidentId, fileId, isCustomerView: true);
        return Success(result);
    }

    /// <summary>
    /// F5-J41: Khách hàng đọc các phương án đề xuất kết thúc sớm cần phản hồi
    /// </summary>
    [HttpGet("{incidentId}/termination-proposals")]
    public async Task<IActionResult> GetCustomerTerminationProposals(
        [FromRoute] string requestId,
        [FromRoute] string incidentId)
    {
        var result = await _incidentService.GetCustomerTerminationProposalsAsync(requestId, incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J38: Khách hàng phản hồi phương án đề xuất kết thúc sớm
    /// </summary>
    [HttpPost("{incidentId}/termination-proposals/{proposalId}/reply")]
    public async Task<IActionResult> ReplyTerminationProposal(
        [FromRoute] string requestId,
        [FromRoute] string incidentId,
        [FromRoute] string proposalId,
        [FromBody] TerminationReplyInputDto dto)
    {
        var result = await _incidentService.ReplyTerminationProposalAsync(requestId, incidentId, proposalId, dto, CurrentUserId);
        return Success(result, "Đã gửi phản hồi phương án kết thúc sớm thành công");
    }
}

