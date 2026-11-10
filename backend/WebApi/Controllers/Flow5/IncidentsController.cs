using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Route("api")]
[Tags("Flow 5 — Quản lý sự cố & Khôi phục (Incidents & Recovery)")]
public class IncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public IncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J03: Báo cáo sự cố khẩn cấp và tự động thông báo tới Điều phối viên
    /// </summary>
    [HttpPost("incidents")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.FleetRouteCoordinator},{UserRoles.LogisticsManager},{UserRoles.TransportSpecialist},{UserRoles.Admin}")]
    public async Task<IActionResult> ReportIncident([FromBody] ReportIncidentInputDto dto)
    {
        var result = await _incidentService.ReportIncidentAsync(dto, CurrentUserId);
        return Success(result, "Báo cáo sự cố thành công và đã thông báo tới Điều phối viên");
    }

    /// <summary>
    /// Báo cáo sự cố theo chuyến cho tài xế
    /// </summary>
    [HttpPost("driver/trips/{tripId}/incidents")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
    public async Task<IActionResult> ReportTripIncident([FromRoute] string tripId, [FromBody] ReportIncidentInputDto dto)
    {
        dto.TripId = tripId;
        var result = await _incidentService.ReportIncidentAsync(dto, CurrentUserId);
        return Success(result, "Báo cáo sự cố theo chuyến thành công");
    }

    /// <summary>
    /// F5-J02: Lấy danh sách sự cố theo điều kiện lọc
    /// </summary>
    /// <summary>
    /// Lấy danh sách sự cố cho tài xế
    /// </summary>
    
    [HttpGet("driver/incidents")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
    public async Task<IActionResult> GetDriverIncidents([FromQuery] string? tripId, [FromQuery] string? status)
    {
        var result = await _incidentService.GetIncidentsAsync(tripId, status);
        return Success(result);
    }

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
    /// Áp dụng phương án khôi phục sự cố
    /// </summary>
    [HttpPost("incidents/{incidentId}/recovery/apply")]
    [Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
    public async Task<IActionResult> ApplyRecoveryPlan([FromRoute] string incidentId, [FromBody] ApplyRecoveryPlanInputDto? dto)
    {
        var result = await _incidentService.ApplyRecoveryPlanAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã áp dụng phương án khôi phục vào hành trình thực tế");
    }

    /// <summary>
    /// Điều phối viên từ chối hỗ trợ tại chỗ và chuyển lên Quản lý xử lý
    /// </summary>
    [HttpPost("incidents/{incidentId}/escalate")]
    [Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
    public async Task<IActionResult> EscalateIncident([FromRoute] string incidentId, [FromBody] EscalateIncidentInputDto dto)
    {
        var result = await _incidentService.EscalateIncidentAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã từ chối hỗ trợ tại chỗ và chuyển sự cố lên Quản lý thành công");
    }

    /// <summary>
    /// F5-J08: Ghi hiện trường, tiến độ khắc phục hoặc sơ cứu khẩn cấp
    /// </summary>
    [HttpPost("incidents/{incidentId}/updates")]
    [Authorize]
    public async Task<IActionResult> AddIncidentUpdate([FromRoute] string incidentId, [FromBody] UpdateInputDto dto)
    {
        var result = await _incidentService.AddUpdateAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã ghi nhận diễn biến sự cố mới");
    }

    /// <summary>
    /// F5-J09: Đọc toàn bộ nhật ký diễn biến xử lý sự cố
    /// </summary>
    [HttpGet("incidents/{incidentId}/updates")]
    [Authorize]
    public async Task<IActionResult> GetIncidentUpdates([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetUpdatesAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J11: Danh sách công việc khắc phục và người phụ trách
    /// </summary>
    [HttpGet("incidents/{incidentId}/tasks")]
    [Authorize]
    public async Task<IActionResult> GetIncidentTasks([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetTasksAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J12: Người được giao việc cập nhật kết quả công việc
    /// </summary>
    [HttpPost("incidents/{incidentId}/tasks/{taskId}/progress")]
    [Authorize]
    public async Task<IActionResult> UpdateTaskProgress([FromRoute] string incidentId, [FromRoute] string taskId, [FromBody] TaskProgressInputDto dto)
    {
        var result = await _incidentService.UpdateTaskProgressAsync(incidentId, taskId, dto, CurrentUserId);
        return Success(result, "Cập nhật tiến độ nhiệm vụ thành công");
    }

    /// <summary>
    /// F5-J19: Lịch sử quyết định, phiên bản và áp dụng phương án
    /// </summary>
    [HttpGet("incidents/{incidentId}/history")]
    [Authorize]
    public async Task<IActionResult> GetIncidentHistory([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetHistoryAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J25: Kiểm tra điều kiện tiếp tục và điều kiện dỡ bỏ SafetyBlocker
    /// </summary>
    [HttpGet("incidents/{incidentId}/continuation-readiness")]
    [Authorize]
    public async Task<IActionResult> GetContinuationReadiness([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetContinuationReadinessAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J34: Tải lên bằng chứng / file liên quan đến sự cố của chuyến
    /// </summary>
    [HttpPost("trips/{tripId}/incident-files")]
    [Authorize]
    public async Task<IActionResult> UploadTripIncidentFile([FromRoute] string tripId, [FromBody] IncidentFileUploadInputDto dto, [FromQuery] string? incidentId)
    {
        var result = await _incidentService.UploadIncidentFileAsync(tripId, incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Tải lên tài liệu bằng chứng thành công");
    }

    /// <summary>
    /// F5-J35: Tải hoặc xem bằng chứng sự cố (Nội bộ)
    /// </summary>
    [HttpGet("incidents/{incidentId}/files/{fileId}")]
    [Authorize]
    public async Task<IActionResult> GetIncidentFile([FromRoute] string incidentId, [FromRoute] string fileId)
    {
        var result = await _incidentService.GetIncidentFileAsync(incidentId, fileId, isCustomerView: false);
        return Success(result);
    }

    /// <summary>
    /// F5-J40: Đọc lịch sử đề xuất kết thúc sớm của sự cố
    /// </summary>
    [HttpGet("incidents/{incidentId}/termination-proposals")]
    [Authorize]
    public async Task<IActionResult> GetTerminationProposals([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetTerminationProposalsAsync(incidentId);
        return Success(result);
    }
}
