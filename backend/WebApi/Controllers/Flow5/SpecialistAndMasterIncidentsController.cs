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
public class SpecialistAndMasterIncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public SpecialistAndMasterIncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J01: Năng lực xử lý sự cố của hệ thống (Capabilities)
    /// </summary>
    [HttpGet("master/flow5-capabilities")]
    [Authorize]
    public async Task<IActionResult> GetFlow5Capabilities()
    {
        var result = await _incidentService.GetCapabilitiesAsync();
        return Success(result);
    }

    /// <summary>
    /// F5-J21: Chuyên viên pháp lý xác nhận hồ sơ hoặc bảo hiểm bị ảnh hưởng
    /// </summary>
    [HttpPost("specialist/incidents/{incidentId}/compliance-reviews")]
    [Authorize(Roles = $"{UserRoles.TransportSpecialist},{UserRoles.Admin}")]
    public async Task<IActionResult> SaveComplianceReview([FromRoute] string incidentId, [FromBody] ComplianceInputDto dto)
    {
        var result = await _incidentService.SaveComplianceReviewAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã lưu kết quả rà soát pháp lý thành công");
    }

    /// <summary>
    /// F5-J22: Bác sĩ thú y / Nhân viên hộ tống xác nhận sức khỏe và khả năng tiếp tục của ngựa
    /// </summary>
    [HttpPost("driver/incidents/{incidentId}/vet-assessments")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
    public async Task<IActionResult> SaveVetAssessment([FromRoute] string incidentId, [FromBody] VetInputDto dto)
    {
        var result = await _incidentService.SaveVetAssessmentAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã lưu kết quả khám sức khỏe ngựa đua thành công");
    }
}

