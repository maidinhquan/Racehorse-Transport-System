using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Route("api")]
public class IncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public IncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J03: Báo cáo sự cố khẩn cấp (Hỏng xe, Kẹt xe kéo dài, Sự cố y tế của ngựa, Khác) và tự động thông báo tới Điều phối viên
    /// </summary>
    [HttpPost("incidents")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.FleetRouteCoordinator},{UserRoles.LogisticsManager},{UserRoles.TransportSpecialist},{UserRoles.Admin}")]
    public async Task<IActionResult> ReportIncident([FromBody] ReportIncidentInputDto dto)
    {
        var result = await _incidentService.ReportIncidentAsync(dto, CurrentUserId);
        return Success(result, "Báo cáo sự cố thành công và đã thông báo tới Điều phối viên");
    }

    /// <summary>
    /// Tuyến đường thay thế cho Tài xế theo Trip: POST /api/driver/trips/{tripId}/incidents
    /// </summary>
    [HttpPost("driver/trips/{tripId}/incidents")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
    public async Task<IActionResult> ReportTripIncident([FromRoute] string tripId, [FromBody] ReportIncidentInputDto dto)
    {
        dto.TripId = tripId;
        var result = await _incidentService.ReportIncidentAsync(dto, CurrentUserId);
        return Success(result, "Báo cáo sự cố thành công và đã thông báo tới Điều phối viên");
    }

    /// <summary>
    /// F5-J02: Lấy danh sách sự cố theo điều kiện lọc
    /// </summary>
    [HttpGet("incidents")]
    [Authorize]
    public async Task<IActionResult> GetIncidents([FromQuery] string? tripId, [FromQuery] string? status)
    {
        var result = await _incidentService.GetIncidentsAsync(tripId, status);
        return Success(result);
    }

    /// <summary>
    /// F5-J05: Lấy danh sách sự cố của một chuyến đi cụ thể
    /// </summary>
    [HttpGet("trips/{tripId}/incidents")]
    [Authorize]
    public async Task<IActionResult> GetTripIncidents([FromRoute] string tripId)
    {
        var result = await _incidentService.GetIncidentsAsync(tripId, null);
        return Success(result);
    }

    /// <summary>
    /// F5-J04: Lấy chi tiết một sự cố
    /// </summary>
    [HttpGet("incidents/{incidentId}")]
    [Authorize]
    public async Task<IActionResult> GetIncidentDetail([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetIncidentByIdAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J06: Điều phối viên (Coordinator) tiếp nhận sự cố
    /// </summary>
    [HttpPost("coordinator/incidents/{incidentId}/accept")]
    [Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
    public async Task<IActionResult> AcceptIncident([FromRoute] string incidentId)
    {
        var result = await _incidentService.AcceptIncidentAsync(incidentId, CurrentUserId);
        return Success(result, "Điều phối viên đã tiếp nhận sự cố thành công");
    }
}
